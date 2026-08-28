/**
 * Publication quotidienne d'un article, déclenchée par le cron Vercel.
 *
 * Pourquoi ici et pas dans une routine Claude : une routine planifiée démarre
 * une session neuve, sans connecteur Sanity. Elle n'a donc aucun moyen de
 * publier quoi que ce soit. Ce cron parle directement à l'API Sanity.
 *
 * La règle de dépendance qui vivait en prose dans docs/ordre-publication-blog.md
 * est ici exécutable : un article qui pointe vers un confrère encore en
 * brouillon n'est pas publié, il est sauté. Publier dans le désordre créerait
 * des liens morts.
 *
 * Le blog est généré au build par scripts/generate-blog.mjs : publier dans
 * Sanity ne suffit pas à faire apparaître l'article sur le site. Une fois la
 * publication faite, ce cron déclenche donc un redéploiement Vercel.
 */
const PROJECT_ID = "740dzcep";
const DATASET = "production";
const API_VERSION = "2024-01-01";

import { ordre } from "../data/ordre-publication.js";

const API = `https://${PROJECT_ID}.api.sanity.io/v${API_VERSION}/data`;

async function sanity(chemin, options = {}) {
  const res = await fetch(`${API}/${chemin}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.SANITY_WRITE_TOKEN}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Sanity ${res.status} : ${json?.message || JSON.stringify(json).slice(0, 300)}`);
  }
  return json;
}

const GROQ = `*[_type == "article"]{
  _id,
  statut,
  dateMiseAJour,
  datePublication,
  "slug": slug.current,
  "liens": corps[].markDefs[].href
}`;

/**
 * Reconstruction du site après publication.
 *
 * Sans ce déclenchement, l'article est publié dans Sanity mais reste invisible
 * sur timat.app jusqu'au prochain push : les pages du blog sont écrites au
 * build, pas servies dynamiquement.
 *
 * L'échec est signalé, jamais fatal : l'article est déjà publié à ce stade, et
 * un redéploiement manuel rattrape la situation. Renvoyer une erreur ferait
 * croire au cron que la publication a échoué et la ferait rejouer demain sur
 * l'article suivant, en laissant celui-ci invisible pour toujours.
 */
async function redeployer() {
  const hook = process.env.VERCEL_DEPLOY_HOOK;
  if (!hook) {
    console.warn("[publier-article] VERCEL_DEPLOY_HOOK absente : article publié dans Sanity mais site non reconstruit.");
    return { declenche: false, raison: "VERCEL_DEPLOY_HOOK absente" };
  }
  try {
    const res = await fetch(hook, { method: "POST" });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("[publier-article] déploiement refusé :", res.status, detail.slice(0, 200));
      return { declenche: false, raison: `Vercel a répondu ${res.status}` };
    }
    return { declenche: true };
  } catch (e) {
    console.error("[publier-article] déploiement injoignable :", e.message);
    return { declenche: false, raison: e.message };
  }
}

/** Slugs cités par cet article et qui vivent encore sur /blog/. */
function dependances(article) {
  return (article.liens || [])
    .filter(Boolean)
    .map((h) => /^\/blog\/([a-z0-9-]+)\/?$/.exec(h))
    .filter(Boolean)
    .map((m) => m[1]);
}

export default async function handler(req, res) {
  // Échec fermé : sans secret configuré, l'endpoint ne publie rien. Un endpoint
  // de publication ouvert au monde serait une porte grande ouverte.
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return res.status(500).json({ error: "CRON_SECRET absent : publication désactivée." });
  }
  if (req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: "Non autorisé." });
  }
  if (!process.env.SANITY_WRITE_TOKEN) {
    return res.status(500).json({ error: "SANITY_WRITE_TOKEN absent." });
  }

  const simulation = req.query?.simulation === "1";

  try {
    const { result } = await sanity(`query/${DATASET}?query=${encodeURIComponent(GROQ)}`);
    const articles = Array.isArray(result) ? result : [];

    // Trois états possibles, et non deux. Un article peut exister comme document
    // publié tout en portant statut "brouillon" : le site le masque, mais il n'a
    // plus de préfixe drafts. Sans ce troisième cas il n'était ni brouillon ni
    // publié, donc sauté à chaque passage — et il bloquait aussi tous les
    // articles qui le citent, pour toujours.
    const brouillons = new Map();
    const publies = new Set();
    const limbes = new Set();
    for (const a of articles) {
      if (!a.slug) continue;
      if (a._id.startsWith("drafts.")) {
        brouillons.set(a.slug, a);
      } else if (a.statut === "publie") {
        publies.add(a.slug);
      } else {
        limbes.add(a.slug);
        // Un vrai brouillon fait autorité sur la version publiée restée en
        // statut brouillon : ne pas l'écraser si les deux coexistent.
        if (!brouillons.has(a.slug)) brouillons.set(a.slug, a);
      }
    }
    for (const slug of publies) limbes.delete(slug);

    const sautes = [];
    let cible = null;

    for (const slug of ordre) {
      if (publies.has(slug)) continue;
      const brouillon = brouillons.get(slug);
      if (!brouillon) {
        sautes.push({ slug, raison: "aucun brouillon portant ce slug" });
        continue;
      }
      const manquantes = dependances(brouillon).filter((d) => !publies.has(d));
      if (manquantes.length) {
        sautes.push({ slug, raison: `cite des articles non publiés : ${manquantes.join(", ")}` });
        continue;
      }
      cible = brouillon;
      break;
    }

    if (!cible) {
      return res.status(200).json({
        publie: null,
        message: "Rien à publier aujourd'hui.",
        sautes,
        restants: ordre.filter((s) => !publies.has(s)).length,
      });
    }

    const aujourdhui = new Date().toISOString().slice(0, 10);
    if (simulation) {
      return res.status(200).json({
        simulation: true,
        publierait: cible.slug,
        // Vérifiable sans publier : le hook doit être là avant le premier
        // passage du cron, sinon l'article part dans Sanity sans rejoindre le site.
        deploiementConfigure: Boolean(process.env.VERCEL_DEPLOY_HOOK),
        limbes: [...limbes],
        sautes,
      });
    }

    const idPublie = cible._id.replace(/^drafts\./, "");

    // 1. Statut et date sur le brouillon. dateMiseAJour est vidée si elle est
    //    antérieure à la publication : sinon le dateModified du JSON-LD précède
    //    le datePublished, ce que Google relève.
    const patch = { id: cible._id, set: { statut: "publie", datePublication: aujourdhui } };
    if (cible.dateMiseAJour && String(cible.dateMiseAJour).slice(0, 10) < aujourdhui) {
      patch.unset = ["dateMiseAJour"];
    }
    await sanity(`mutate/${DATASET}`, {
      method: "POST",
      body: JSON.stringify({ mutations: [{ patch }] }),
    });

    // 2. Publication : le document complet est recopié sur l'identifiant public,
    //    puis le brouillon disparaît. Les deux opérations sont dans la même
    //    transaction — jamais l'une sans l'autre.
    const { documents } = await sanity(`doc/${DATASET}/${cible._id}`);
    const doc = Array.isArray(documents) ? documents[0] : documents;
    if (!doc) throw new Error(`brouillon introuvable : ${cible._id}`);

    // Pour un article des limbes, la source EST la cible : le brouillon n'existe
    // pas, l'identifiant n'a pas de préfixe. Supprimer cible._id effacerait alors
    // le document que createOrReplace vient d'écrire.
    const aSupprimer = cible._id !== idPublie ? [{ delete: { id: cible._id } }] : [];

    const { _id, _rev, _createdAt, _updatedAt, ...contenu } = doc;
    await sanity(`mutate/${DATASET}`, {
      method: "POST",
      body: JSON.stringify({
        mutations: [
          { createOrReplace: { ...contenu, _id: idPublie } },
          ...aSupprimer,
        ],
      }),
    });

    // 3. Reconstruction : le blog est statique, sans elle l'article reste
    //    invisible sur le site.
    const deploiement = await redeployer();

    console.log(`[publier-article] publié : ${cible.slug}`);
    return res.status(200).json({
      publie: cible.slug,
      url: `https://www.timat.app/blog/${cible.slug}`,
      date: aujourdhui,
      deploiement,
      limbes: [...limbes],
      sautes,
      restants: ordre.filter((s) => !publies.has(s) && s !== cible.slug).length,
    });
  } catch (e) {
    console.error("[publier-article]", e);
    return res.status(500).json({ error: e.message });
  }
}
