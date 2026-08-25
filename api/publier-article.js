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

    const brouillons = new Map();
    const publies = new Set();
    for (const a of articles) {
      if (!a.slug) continue;
      if (a._id.startsWith("drafts.")) brouillons.set(a.slug, a);
      else if (a.statut === "publie") publies.add(a.slug);
    }

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
      return res.status(200).json({ simulation: true, publierait: cible.slug, sautes });
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

    const { _id, _rev, _createdAt, _updatedAt, ...contenu } = doc;
    await sanity(`mutate/${DATASET}`, {
      method: "POST",
      body: JSON.stringify({
        mutations: [
          { createOrReplace: { ...contenu, _id: idPublie } },
          { delete: { id: cible._id } },
        ],
      }),
    });

    console.log(`[publier-article] publié : ${cible.slug}`);
    return res.status(200).json({
      publie: cible.slug,
      url: `https://www.timat.app/blog/${cible.slug}`,
      date: aujourdhui,
      sautes,
      restants: ordre.filter((s) => !publies.has(s) && s !== cible.slug).length,
    });
  } catch (e) {
    console.error("[publier-article]", e);
    return res.status(500).json({ error: e.message });
  }
}
