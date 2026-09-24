// La page vitrine publique d'une assistante maternelle : /a/<adresse>.
//
// A QUOI ELLE SERT. Un parent qui cherche un mode de garde tombe sur un
// telephone et une commune, rien d'autre. Cette page lui donne de quoi
// decider s'il appelle : les horaires, les places, la facon de travailler.
// Et elle se termine par le formulaire de demande d'accueil, qui remplit la
// liste d'attente de l'assistante maternelle au lieu d'un appel manque.
//
// CE QU'ELLE NE FAIT JAMAIS, ET POURQUOI :
//
//   1. elle n'affiche AUCUNE donnee du profil prive. Ni nom, ni prenom, ni
//      adresse, ni numero d'agrement. Seules les colonnes « vitrine_ »
//      sortent, et l'assistante maternelle les ecrit une par une. Son adresse
//      est son domicile, et des enfants y vivent : elle n'a rien a faire sur
//      une page publique, meme « approximative » ;
//
//   2. elle ne dit rien d'un enfant accueilli. Pas un prenom, pas un age,
//      pas une photo. Ces familles n'ont pas donne leur accord et n'ont pas
//      a en donner un : la question ne se pose pas ;
//
//   3. elle n'existe pas tant que vitrine_active est faux. Creer la page ne
//      la publie pas ; la publier est un geste separe, revocable d'un clic.
//      Desactivee, l'adresse rend la meme page « introuvable » qu'une adresse
//      qui n'a jamais existe ;
//
//   4. elle n'est pas indexee par defaut. Etre trouvable sur Google est un
//      choix — celui d'associer publiquement un nom, une commune et un metier
//      a un domicile. Elle le fait exprès ou elle ne le fait pas.
//
// Elle tourne en Edge : le plan Hobby n'accepte que douze fonctions
// serverless, et elles sont toutes prises. Une treizieme ferait ECHOUER le
// deploiement de production alors que la construction reussirait.
export const config = { runtime: 'edge' };

const URL_SUPABASE = process.env.VITE_SUPABASE_URL;
const CLE_SERVICE = process.env.SUPABASE_SERVICE_KEY;

const H = (s) => String(s == null ? "" : s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

// Les retours a la ligne qu'elle a tapes comptent : une presentation ecrite en
// paragraphes ne doit pas ressortir en un bloc. On echappe D'ABORD, on ajoute
// les <br> ENSUITE — l'inverse laisserait passer du HTML injecte.
const paragraphes = (s) => H(s).split(/\n{2,}/).filter(Boolean)
  .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`).join("");

const enveloppe = ({ titre, description, indexable, corps }) => new Response(
  `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="${indexable ? "index,follow" : "noindex,nofollow"}">
<title>${H(titre)}</title>
<meta name="description" content="${H(description)}">
<link rel="stylesheet" href="/timat-design.css">
<style>
 *{box-sizing:border-box;margin:0;padding:0}
 body{font-family:'Outfit',system-ui,sans-serif;background:#FDFBF8;color:#2E4859;line-height:1.65;padding:26px 18px}
 .w{max-width:620px;margin:0 auto}
 .c{background:#fff;border:1px solid #EDE6DE;border-radius:16px;padding:26px 24px;box-shadow:0 8px 28px rgba(46,72,89,.07);margin-bottom:16px}
 h1{font-family:'Quicksand','Outfit',sans-serif;font-size:26px;line-height:1.3;margin-bottom:6px}
 .lieu{font-size:15px;color:#55707C;margin-bottom:18px}
 h2{font-family:'Quicksand','Outfit',sans-serif;font-size:17px;margin:22px 0 10px}
 p{font-size:15.5px;margin-bottom:12px}
 p:last-child{margin-bottom:0}
 .faits{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:18px 0 4px}
 .f{background:#FDFBF8;border:1px solid #EDE6DE;border-radius:12px;padding:13px 14px}
 .f .k{font-size:11.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#8A9AA3;margin-bottom:3px}
 .f .v{font-size:15px;font-weight:600}
 ul{list-style:none;margin:4px 0 0}
 li{font-size:15px;padding-left:22px;position:relative;margin-bottom:7px}
 li:before{content:"✓";position:absolute;left:0;color:#C76754;font-weight:700}
 .cta{display:block;text-align:center;background:linear-gradient(135deg,#E49178,#C76754);color:#fff;text-decoration:none;border-radius:12px;padding:15px;font-size:16px;font-weight:700;margin-top:6px}
 .tel{display:block;text-align:center;border:1.5px solid #DDD5C8;color:#2E4859;text-decoration:none;border-radius:12px;padding:14px;font-size:16px;font-weight:600;margin-top:10px}
 .n{font-size:12px;color:#6B7A82;text-align:center;margin-top:4px}
 .maj{font-size:12px;color:#8A9AA3;margin-top:16px}
 @media(max-width:480px){.faits{grid-template-columns:1fr}h1{font-size:22px}}
</style></head><body><div class="w">${corps}
<p class="n">Page propulsée par <a href="/" style="color:#C76754">TiMat</a></p></div></body></html>`,
  { status: 200, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });

// Adresse inconnue et vitrine desactivee rendent EXACTEMENT la meme page. Les
// distinguer dirait a qui sonde quelles assistantes maternelles ont un compte
// TiMat — y compris celles qui ont justement choisi de ne pas etre visibles.
const introuvable = () => enveloppe({
  titre: "Page introuvable — TiMat",
  description: "Cette page n'existe pas ou n'est plus publiée.",
  indexable: false,
  corps: `<div class="c" style="text-align:center">
   <h1>Cette page n'existe pas</h1>
   <p class="lieu">Le lien est peut-être incomplet, ou la page n'est plus publiée.</p>
   <a class="cta" href="/">Découvrir TiMat</a></div>`,
});

// Une adresse ne contient que des minuscules, des chiffres et des tirets. On
// la valide AVANT d'interroger la base : cela borne ce qui part dans l'URL de
// requete, et ecarte d'emblee tout ce qui n'a pas la forme d'une adresse.
const SLUG = /^[a-z0-9-]{3,60}$/;

export default async function handler(req) {
  if (req.method !== "GET") return new Response("Méthode non autorisée", { status: 405 });

  const slug = (new URL(req.url).searchParams.get("a") || "").trim().toLowerCase();
  if (!SLUG.test(slug)) return introuvable();
  if (!URL_SUPABASE || !CLE_SERVICE) return introuvable();

  // On ne demande QUE les colonnes publiques, et jeton_demandes pour le bouton.
  // Enumerer les colonnes plutot que « * » n'est pas un detail de style : c'est
  // ce qui garantit qu'une colonne privee ajoutee demain ne sortira pas ici
  // toute seule.
  const champs = [
    "vitrine_active", "vitrine_indexable", "vitrine_titre", "vitrine_commune",
    "vitrine_presentation", "vitrine_places", "vitrine_disponibilite",
    "vitrine_horaires", "vitrine_atouts", "vitrine_tel", "vitrine_email",
    "vitrine_maj", "jeton_demandes",
  ].join(",");

  let p;
  try {
    const r = await fetch(
      `${URL_SUPABASE}/rest/v1/profiles?select=${champs}&vitrine_slug=eq.${encodeURIComponent(slug)}&limit=1`,
      { headers: { apikey: CLE_SERVICE, Authorization: "Bearer " + CLE_SERVICE } });
    if (!r.ok) return introuvable();
    const l = await r.json();
    p = l && l[0];
  } catch { return introuvable(); }

  if (!p || !p.vitrine_active) return introuvable();

  const titre = (p.vitrine_titre || "").trim() || "Assistante maternelle";
  const commune = (p.vitrine_commune || "").trim();
  const faits = [
    ["Places", p.vitrine_places],
    ["Disponibilité", p.vitrine_disponibilite],
    ["Horaires", p.vitrine_horaires],
  ].filter(([, v]) => (v || "").trim());

  const atouts = (p.vitrine_atouts || "").split("\n").map((s) => s.trim()).filter(Boolean);

  const tel = (p.vitrine_tel || "").trim();
  const email = (p.vitrine_email || "").trim();
  const jeton = (p.jeton_demandes || "").trim();

  const maj = p.vitrine_maj ? new Date(p.vitrine_maj) : null;
  const majTexte = maj && !Number.isNaN(maj.getTime())
    ? maj.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "";

  const corps = `<div class="c">
 <h1>${H(titre)}</h1>
 ${commune ? `<p class="lieu">📍 ${H(commune)}</p>` : ""}
 ${faits.length ? `<div class="faits">${faits.map(([k, v]) =>
    `<div class="f"><div class="k">${H(k)}</div><div class="v">${H(String(v).trim())}</div></div>`).join("")}</div>` : ""}
 ${(p.vitrine_presentation || "").trim() ? `<h2>Ma façon de travailler</h2>${paragraphes(p.vitrine_presentation)}` : ""}
 ${atouts.length ? `<h2>Ce que je propose</h2><ul>${atouts.map((a) => `<li>${H(a)}</li>`).join("")}</ul>` : ""}
 ${majTexte ? `<p class="maj">Informations mises à jour le ${H(majTexte)}.</p>` : ""}
</div>
<div class="c">
 <h2 style="margin-top:0">Me contacter</h2>
 ${jeton ? `<a class="cta" href="/d/${encodeURIComponent(jeton)}">Faire une demande d'accueil</a>` : ""}
 ${tel ? `<a class="tel" href="tel:${H(tel.replace(/[^\d+]/g, ""))}">📞 ${H(tel)}</a>` : ""}
 ${email ? `<a class="tel" href="mailto:${H(email)}">✉️ ${H(email)}</a>` : ""}
 ${!jeton && !tel && !email ? `<p>Aucun moyen de contact n'est renseigné pour le moment.</p>` : ""}
 <p class="n" style="margin-top:14px">Une demande envoyée par le formulaire arrive directement dans son application : elle ne se perd pas.</p>
</div>`;

  return enveloppe({
    titre: `${titre}${commune ? " — " + commune : ""}`,
    description: `${titre}${commune ? " à " + commune : ""}. ${(p.vitrine_disponibilite || "").trim() || "Prenez contact pour une demande d'accueil."}`.slice(0, 160),
    indexable: !!p.vitrine_indexable,
    corps,
  });
}
