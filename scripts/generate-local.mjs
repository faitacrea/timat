/**
 * Pages départementales : deux séries, un hub.
 *
 *   /assistante-maternelle/<slug>/tarif    — ce que gagne une assmat ici
 *   /assistante-maternelle/<slug>/devenir  — le parcours et l'offre ici
 *   /assistante-maternelle/                — le hub qui les relie
 *
 * RÈGLE CENTRALE : une page n'est écrite que si les chiffres du département
 * existent réellement. Un département sans données est ignoré, jamais rempli
 * avec une moyenne nationale déguisée. Sans cela ces pages ne différeraient
 * que par un nom propre — c'est la définition d'une page satellite, et Google
 * les déclasse.
 */
import { readFileSync, existsSync } from "node:fs";
import { mkdir, writeFile, rm } from "node:fs/promises";
import path from "node:path";

const SITE = "https://www.timat.app";
const RACINE = process.cwd();
const PUBLIC_DIR = path.join(RACINE, "public");
const LOCAL_DIR = path.join(PUBLIC_DIR, "assistante-maternelle");
const DATA_DIR = path.join(RACINE, "data");

// Deux planchers coexistent et le plus élevé s'applique. Le minimum légal
// (0,281 × SMIC, article D423-9) est aujourd'hui largement dépassé par le
// minimum conventionnel de la CCN IDCC 3239 — avenant n° 10 du 5 février 2026,
// étendu, applicable au 1er juin 2026. C'est donc le conventionnel qu'il faut
// citer : afficher le légal seul laisserait croire qu'un tarif à 3,80 € est
// régulier.
const SMIC_HORAIRE = 12.31;
const MINIMUM_LEGAL = +(SMIC_HORAIRE * 0.281).toFixed(2);
const MINIMUM_CONV = 4.2;
const MINIMUM_CONV_NET = 3.28;
const MINIMUM_BRUT = Math.max(MINIMUM_LEGAL, MINIMUM_CONV);
const PLAFOND_CMG_JOUR = +(SMIC_HORAIRE * 5).toFixed(2);
const MAJ = new Date().toISOString().slice(0, 10);

const esc = (s) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const eur = (v) => v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
const nb = (v) => v.toLocaleString("fr-FR");

/** Slug d'URL : accents retirés, apostrophes et espaces en tirets. */
function slugify(nom) {
  return nom.normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/['’]/g, "-").replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const lire = (f) => JSON.parse(readFileSync(path.join(DATA_DIR, f), "utf8"));

/**
 * Contexte départemental dérivé.
 *
 * Sans lui, deux pages ne diffèrent que par un nom propre et trois nombres
 * dans un tableau : mesuré, le texte utile était identique à 98 % d'un
 * département à l'autre. Google traite alors la série comme un gabarit
 * dupliqué et n'en indexe qu'une poignée.
 *
 * Tout ce qui suit se calcule à partir des chiffres déjà présents — rien
 * n'est inventé, rien n'est emprunté à un autre département.
 */
function contexte(departements, stats) {
  const dep = stats.departements || {};
  const region = new Map(departements.map((d) => [String(d.code), d.region]));
  const nom = new Map(departements.map((d) => [String(d.code), d.nom]));

  const avecSalaire = Object.entries(dep).filter(([, v]) => Number(v.salaireHoraireNet) > 0);
  const parSalaire = [...avecSalaire].sort((a, b) => b[1].salaireHoraireNet - a[1].salaireHoraireNet);
  const rangSalaire = new Map(parSalaire.map(([c], i) => [c, i + 1]));

  const avecEffectif = Object.entries(dep).filter(([, v]) => Number(v.assmats) > 0);
  const parEffectif = [...avecEffectif].sort((a, b) => b[1].assmats - a[1].assmats);
  const rangEffectif = new Map(parEffectif.map(([c], i) => [c, i + 1]));

  // Moyenne régionale pondérée par les effectifs : c'est une statistique que
  // nous calculons, jamais un chiffre publié — les pages le disent.
  const regions = new Map();
  for (const [c, v] of avecSalaire) {
    const r = region.get(c);
    if (!r) continue;
    if (!regions.has(r)) regions.set(r, []);
    regions.get(r).push({ code: c, val: v.salaireHoraireNet, poids: Number(v.assmats) || 0 });
  }

  const out = new Map();
  for (const [c, v] of Object.entries(dep)) {
    const r = region.get(c);
    const membres = (regions.get(r) || []).slice().sort((a, b) => b.val - a.val);
    const poids = membres.reduce((t, m) => t + m.poids, 0);
    const moyRegion = poids
      ? +(membres.reduce((t, m) => t + m.val * m.poids, 0) / poids).toFixed(2)
      : membres.length
        ? +(membres.reduce((t, m) => t + m.val, 0) / membres.length).toFixed(2)
        : null;

    const evo = typeof v.evolution10ans === "number" ? v.evolution10ans : null;
    const avant = evo !== null && v.assmats && evo > -100
      ? Math.round(v.assmats / (1 + evo / 100))
      : null;

    out.set(c, {
      rangSalaire: rangSalaire.get(c) || null,
      nbClasses: parSalaire.length,
      rangEffectif: rangEffectif.get(c) || null,
      nbEffectifs: parEffectif.length,
      moyRegion,
      regionNb: membres.length,
      hautRegion: membres[0] ? { nom: nom.get(membres[0].code), val: membres[0].val } : null,
      basRegion: membres.at(-1) ? { nom: nom.get(membres.at(-1).code), val: membres.at(-1).val } : null,
      assmatsAvant: avant,
      perdus: avant && v.assmats ? avant - v.assmats : null,
      mamPour1000: v.mam && v.assmats ? +((v.mam / v.assmats) * 1000).toFixed(1) : null,
    });
  }
  return out;
}

/**
 * Formes grammaticales. « Aisne se classe » et « la moyenne de Hauts-de-France »
 * se liraient sur cent pages : l'article se déduit de la préposition déjà
 * portée par la donnée, et « de » se contracte avec lui.
 */
const VOYELLE = /^[aeiouyàâäéèêëîïôöûü]/i;
function avecArticle(d) {
  switch (d.prep) {
    case "à ": return d.nom;                     // Paris, La Réunion, Mayotte
    case "dans le ": return `le ${d.nom}`;
    case "dans la ": return `la ${d.nom}`;
    case "dans l'": return `l'${d.nom}`;
    case "dans les ": return `les ${d.nom}`;
    case "en ": return VOYELLE.test(d.nom) ? `l'${d.nom}` : `la ${d.nom}`;
    default: return d.nom;
  }
}
function deArticle(d) {
  const a = avecArticle(d);
  if (a.startsWith("les ")) return `des ${a.slice(4)}`;
  if (a.startsWith("le ")) return `du ${a.slice(3)}`;
  if (a.startsWith("la ")) return `de ${a}`;
  if (a.startsWith("l'")) return `de ${a}`;
  return `de ${a}`;
}
const estPluriel = (d) => d.prep === "dans les ";
/** 1 se dit « première », pas « unième » : le rang 1 prend re, les autres e. */
const rangOrdinal = (n) => `${n}<sup>${n === 1 ? "re" : "e"}</sup>`;

/** « la moyenne <de la région> » : dix-huit cas, tous écrits, aucun deviné. */
const DE_REGION = {
  "Auvergne-Rhône-Alpes": "d'Auvergne-Rhône-Alpes",
  "Bourgogne-Franche-Comté": "de Bourgogne-Franche-Comté",
  "Bretagne": "de Bretagne",
  "Centre-Val de Loire": "du Centre-Val de Loire",
  "Corse": "de Corse",
  "Grand Est": "du Grand Est",
  "Guadeloupe": "de Guadeloupe",
  "Guyane": "de Guyane",
  "Hauts-de-France": "des Hauts-de-France",
  "La Réunion": "de La Réunion",
  "Martinique": "de Martinique",
  "Mayotte": "de Mayotte",
  "Normandie": "de Normandie",
  "Nouvelle-Aquitaine": "de Nouvelle-Aquitaine",
  "Occitanie": "d'Occitanie",
  "Pays de la Loire": "des Pays de la Loire",
  "Provence-Alpes-Côte d'Azur": "de Provence-Alpes-Côte d'Azur",
  "Île-de-France": "d'Île-de-France",
};
const deRegion = (r) => DE_REGION[r] || `de ${r}`;

/** Heures mensualisées d'un contrat courant : 40 h par semaine, 47 semaines. */
const HEURES_MOIS = +((40 * 47) / 12).toFixed(1);
const parMois = (ecart) => Math.round(Math.abs(ecart) * HEURES_MOIS);

const CSS = `
:root{--marine:#2E4859;--terra:#E49178;--terraD:#C84B31;--cream:#FDFBF8;--cream2:#FAF6F1;--ink:#2E4859;--muted:#6B7A82;--line:#E4DCD0}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Inter',sans-serif;background:var(--cream);color:var(--ink);line-height:1.7}
a{color:var(--terraD)}
.top{background:linear-gradient(165deg,#FDF6EE,#F7ECE0);border-bottom:1px solid #EEE4D8;position:sticky;top:0;z-index:10}
.bar{max-width:820px;margin:0 auto;padding:12px 22px;display:flex;align-items:center;justify-content:space-between}
.brand img{height:30px;display:block}
.wm{font-family:'Fraunces',serif;font-weight:700;font-size:22px;color:var(--marine)}.wm span{color:var(--terra)}
.cta-top{background:linear-gradient(135deg,var(--terra),var(--terraD));color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:9px 18px;border-radius:10px}
.hero{background:linear-gradient(165deg,#FDF6EE,#F7ECE0,#FBF1E7);border-bottom:1px solid #EEE4D8}
.hero-in{max-width:820px;margin:0 auto;padding:30px 22px 24px}
.crumb{font-size:13px;color:var(--muted);margin-bottom:13px}.crumb a{color:var(--muted)}
.tag{display:inline-block;font-size:11px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:var(--terraD);background:rgba(228,145,120,.14);border-radius:20px;padding:4px 12px;margin-bottom:13px}
h1{font-family:'Fraunces',serif;font-size:clamp(25px,4.6vw,36px);line-height:1.15;color:var(--marine);margin-bottom:12px}
.lead{font-size:17px;color:#42555E}
main{max-width:820px;margin:0 auto;padding:26px 22px 20px}
.reponse{background:#fff;border:1px solid var(--line);border-left:5px solid var(--terra);border-radius:4px 14px 14px 4px;padding:18px 22px;margin:0 0 26px;box-shadow:0 6px 20px rgba(46,72,89,.07)}
.reponse h2{font-family:'Inter',sans-serif;font-size:11px;letter-spacing:1.2px;text-transform:uppercase;color:var(--terraD);margin:0 0 8px;font-weight:800}
.reponse p{margin:0;font-size:17.5px;font-weight:600;line-height:1.6}
h2{font-family:'Fraunces',serif;font-size:22px;color:var(--marine);margin:30px 0 10px}
p{margin-bottom:13px}
table{width:100%;border-collapse:collapse;margin:16px 0;font-size:14.5px}
th,td{border:1px solid #EDE6DE;padding:10px 12px;text-align:left}
th{background:var(--cream2);color:var(--marine);font-weight:700}
td.n{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
tr.fort td{background:#FDF6F4;font-weight:700}
.box{background:var(--cream2);border:1px solid #EDE6DE;border-left:4px solid var(--terra);border-radius:10px;padding:15px 17px;margin:18px 0}
.warn{font-size:14px;color:#8A6D4A;background:#FBF3E6;border:1px solid #EFE0C4;border-radius:10px;padding:14px 16px;margin:18px 0}
.ctabox{background:linear-gradient(135deg,var(--marine),#3E6B63);color:#fff;border-radius:16px;padding:28px 24px;text-align:center;margin:34px 0 10px}
.ctabox h2{color:#fff;margin-top:0}.ctabox p{color:rgba(255,255,255,.85)}
.ctabtn{display:inline-block;background:linear-gradient(135deg,var(--terra),var(--terraD));color:#fff;text-decoration:none;font-weight:700;font-size:16px;padding:14px 26px;border-radius:12px;margin-top:6px}
.related{border-top:1px solid #EDE6DE;margin-top:24px;padding-top:18px}.related h2{font-size:18px;margin-top:0}
.chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
.chip{font-size:13px;font-weight:600;background:#fff;border:1px solid var(--line);border-radius:20px;padding:7px 14px;color:var(--marine);text-decoration:none}
.sources{font-size:13px;color:var(--muted);margin-top:22px;border-top:1px solid #EDE6DE;padding-top:14px}
.sources li{margin:5px 0}
.mini{font-size:13px;color:var(--muted);margin-top:8px}
.grille{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px;margin:20px 0 40px}
.grille a{background:#fff;border:1px solid var(--line);border-radius:12px;padding:12px 14px;text-decoration:none;color:var(--marine);font-weight:600;font-size:14.5px}
.grille a:hover{border-color:var(--terra)}
.grille .c{color:var(--muted);font-weight:400;font-size:12.5px}
.reg{font-family:'Fraunces',serif;font-size:19px;color:var(--marine);margin:26px 0 4px}
footer{background:var(--marine);color:rgba(255,255,255,.75);text-align:center;padding:26px 22px;font-size:13px;margin-top:24px}
footer a{color:#fff}
`;

function page({ titre, description, canonical, jsonLd, corps }) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titre)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical)}">
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(titre)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${SITE}/og-image.png">
<meta property="og:locale" content="fr_FR">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/assmat.svg">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,700&family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>${CSS}</style>
${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>` : ""}
</head>
<body>
<div class="top"><div class="bar">
  <a href="/" class="brand"><img src="/logo.png" alt="TiMat" onerror="this.outerHTML='<span class=&quot;wm&quot;>tim<span>at</span></span>'"></a>
  <a href="/?connexion" class="cta-top">Essayer TiMat →</a>
</div></div>
${corps}
<footer>
  <a href="/">TiMat</a> — l'application des assistantes maternelles et parents employeurs.<br>
  <a href="/">Accueil</a> · <a href="/outils.html">Outils</a> · <a href="/blog">Blog</a> · <a href="/assistante-maternelle/">Par département</a> · <a href="/confidentialite.html">Confidentialité</a>
</footer>
</body>
</html>`;
}

// Le fil ne lie vers /tarif que si cette page est écrite : la Corse a un
// salaire mais pas d'effectif DREES, l'inverse peut arriver ailleurs.
const fil = (d, feuille, aTarif = true) =>
  `<div class="crumb"><a href="/">Accueil</a> › <a href="/assistante-maternelle/">Par département</a> › ${
    aTarif
      ? `<a href="/assistante-maternelle/${slugify(d.nom)}/tarif">${esc(d.nom)}</a>`
      : `${esc(d.nom)}`
  } › ${esc(feuille)}</div>`;

const filAriane = (d, feuille, url) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Accueil", item: SITE },
    { "@type": "ListItem", position: 2, name: "Par département", item: `${SITE}/assistante-maternelle/` },
    { "@type": "ListItem", position: 3, name: feuille, item: url },
  ],
});

/* ---------------------------------------------------------------- TARIF */
function pageTarif(d, st, stats, ctx) {
  const ici = st.salaireHoraireNet;
  const nat = stats.national?.salaireHoraireNet;
  const reg = stats.regions?.[d.region]?.salaireHoraireNet;
  const url = `${SITE}/assistante-maternelle/${slugify(d.nom)}/tarif`;
  const ou = d.prep + d.nom;
  const ecart = nat ? +(ici - nat).toFixed(2) : null;

  const comparaison =
    ecart === null ? "" :
    ecart > 0.04 ? `soit ${eur(Math.abs(ecart))} de plus que la moyenne nationale`
    : ecart < -0.04 ? `soit ${eur(Math.abs(ecart))} de moins que la moyenne nationale`
    : "soit le niveau de la moyenne nationale";

  const lignes = [
    ["Minimum conventionnel", MINIMUM_CONV, "brut", `Plancher applicable partout en France, soit ${eur(MINIMUM_CONV_NET)} net. Convention collective IDCC 3239.`],
    ["Minimum légal", MINIMUM_LEGAL, "brut", "0,281 × SMIC horaire. Plus bas que le conventionnel : c'est le conventionnel qui s'applique."],
    ...(reg ? [[`Moyenne en ${d.region}`, reg, "net", "Salaire horaire net moyen observé dans la région."]] : []),
    ...(nat ? [["Moyenne nationale", nat, "net", "Toutes régions confondues."]] : []),
  ];

  const corps = `
<div class="hero"><div class="hero-in">
  ${fil(d, "Tarif", false)}
  <span class="tag">Chiffres ${esc(stats.sources?.salaire?.millesime || "récents")}</span>
  <h1>Tarif d'une assistante maternelle ${esc(ou)}</h1>
  <p class="lead">Ce que gagnent réellement les assistantes maternelles du département, ce que dit le minimum légal, et les trois lignes que le taux horaire ne couvre pas.</p>
</div></div>
<main>
  <section class="reponse">
    <h2>Réponse courte</h2>
    <p>${esc(ou.charAt(0).toUpperCase() + ou.slice(1))}, le salaire horaire net moyen est de <strong>${eur(ici)}</strong> par enfant et par heure${comparaison ? ", " + comparaison : ""}. Le minimum applicable, lui, est de ${eur(MINIMUM_CONV)} brut partout en France — ${eur(MINIMUM_CONV_NET)} net.</p>
  </section>

  <h2>Le tarif ${esc(ou)}, en contexte</h2>
  <table>
    <thead><tr><th>Référence</th><th>Montant</th><th>Ce que c'est</th></tr></thead>
    <tbody>
      <tr class="fort"><td>${esc(d.nom)}</td><td class="n">${eur(ici)} net</td><td>Moyenne observée dans le département.</td></tr>
      ${lignes.map(([l, v, t, quoi]) => `<tr><td>${esc(l)}</td><td class="n">${eur(v)} ${t}</td><td>${esc(quoi)}</td></tr>`).join("\n      ")}
    </tbody>
  </table>
  <div class="warn">⚠️ Une moyenne n'est pas un tarif à appliquer. Elle situe, elle ne fixe rien : le tarif se négocie librement avant la signature, dans le respect du minimum conventionnel, et ne se modifie ensuite que par avenant.</div>

  <h2>Où se situe${estPluriel(d) ? "nt" : ""} ${esc(avecArticle(d))}</h2>
  ${(() => {
    const p = [];
    if (ctx.rangSalaire && ctx.nbClasses) {
      const r = ctx.rangSalaire, n = ctx.nbClasses;
      const situe =
        r <= 10 ? `parmi les dix départements les mieux rémunérés de France`
        : r > n - 10 ? `parmi les dix départements les moins rémunérés de France`
        : r <= n / 2 ? `dans la moitié haute du classement national`
        : `dans la moitié basse du classement national`;
      p.push(`<p>Avec ${eur(ici)} nets de l'heure et par enfant, ${esc(avecArticle(d))} se classe${estPluriel(d) ? "nt" : ""} <strong>${rangOrdinal(r)} sur ${n}</strong> départements, ${situe}.</p>`);
    }
    if (nat && ici !== nat) {
      const sens = ici > nat ? "de plus" : "de moins";
      p.push(`<p>L'écart avec la moyenne nationale de ${eur(nat)} est de ${eur(Math.abs(ici - nat))} de l'heure. Sur un contrat de 40 heures par semaine mensualisé sur 47 semaines, soit ${HEURES_MOIS.toLocaleString("fr-FR")} heures par mois, cela représente <strong>${nb(parMois(ici - nat))} € ${sens}</strong> par mois et par enfant.</p>`);
    }
    if (ctx.moyRegion && ctx.regionNb > 1 && ctx.hautRegion && ctx.basRegion) {
      const pos = ici > ctx.moyRegion ? "au-dessus" : ici < ctx.moyRegion ? "en dessous" : "au niveau";
      const estHaut = ctx.hautRegion.nom === d.nom;
      const estBas = ctx.basRegion.nom === d.nom;
      const voisins = estHaut
        ? `C'est le département le mieux rémunéré de sa région, devant ${esc(ctx.basRegion.nom)} qui ferme la marche à ${eur(ctx.basRegion.val)}.`
        : estBas
          ? `C'est le département le moins bien rémunéré de sa région, loin de ${esc(ctx.hautRegion.nom)} qui atteint ${eur(ctx.hautRegion.val)}.`
          : `Dans cette région, le mieux rémunéré est ${esc(ctx.hautRegion.nom)} à ${eur(ctx.hautRegion.val)}, le moins bien ${esc(ctx.basRegion.nom)} à ${eur(ctx.basRegion.val)}.`;
      p.push(`<p>À l'échelle régionale, ${esc(avecArticle(d))} se situe${estPluriel(d) ? "nt" : ""} ${pos} de la moyenne ${esc(deRegion(d.region))}, que nous calculons à ${eur(ctx.moyRegion)} en pondérant chaque département par son nombre d'assistantes maternelles. ${voisins}</p>`);
    }
    const marge = +(ici - MINIMUM_CONV_NET).toFixed(2);
    if (marge <= 0.5) {
      p.push(`<div class="warn">⚠️ La moyenne ${esc(ou)} n'est qu'à ${eur(marge)} au-dessus du minimum conventionnel de ${eur(MINIMUM_CONV_NET)} net. Or une moyenne signifie qu'une moitié des situations se trouve en dessous : dans ce département, une part des contrats signés avant le 1<sup>er</sup> juin 2026 est probablement passée sous le plancher sans que personne ne s'en aperçoive. Le <a href="/verificateur-bulletin-assistante-maternelle.html">vérificateur de bulletin</a> tranche en une saisie.</div>`);
    } else {
      p.push(`<p>La moyenne ${esc(ou)} dépasse le minimum conventionnel de ${eur(marge)} nets de l'heure. Ce plancher de ${eur(MINIMUM_CONV_NET)} net reste néanmoins le seul chiffre opposable : aucun contrat ne peut descendre en dessous, quelle que soit la moyenne locale.</p>`);
    }
    return p.join("\n  ");
  })()}

  <h2>Ce que le taux horaire ne dit pas</h2>
  <p>Trois lignes s'ajoutent au salaire et changent le montant réellement versé chaque mois :</p>
  <table>
    <thead><tr><th>Ligne</th><th>Minimum</th><th>Due quand ?</th></tr></thead>
    <tbody>
      <tr><td>Indemnité d'entretien</td><td class="n">0,435 €/h, plancher 2,65 €/jour</td><td>Par journée d'accueil et par enfant.</td></tr>
      <tr><td>Indemnité de repas</td><td class="n">Libre</td><td>Par repas réellement fourni. Aucun barème légal.</td></tr>
      <tr><td>Indemnités kilométriques</td><td class="n">Selon barème</td><td>Si des trajets sont prévus au contrat.</td></tr>
    </tbody>
  </table>
  <div class="box">Le calcul complet du mois — mensualisation, heures majorées, indemnités — se fait en une saisie avec le <a href="/simulateur-salaire-assistante-maternelle.html">simulateur de salaire</a>, et se contrôle ligne à ligne avec le <a href="/verificateur-bulletin-assistante-maternelle.html">vérificateur de bulletin</a>.</div>

  <h2>Le plafond qui coûte le CMG</h2>
  <p>Au-delà de <strong>${eur(PLAFOND_CMG_JOUR)} brut par jour d'accueil et par enfant</strong> — cinq fois le SMIC horaire — les parents ne perdent pas une partie du complément de libre choix du mode de garde : ils le perdent en entier. Sur une journée de neuf heures, ce plafond correspond à environ ${eur(PLAFOND_CMG_JOUR / 9)} brut de l'heure. Une marge confortable au regard des moyennes observées, mais un seuil à vérifier sur les contrats à forte amplitude.</p>

  <div class="ctabox">
    <h2>Calculez, ne devinez pas</h2>
    <p>TiMat pose la mensualisation, suit les présences, calcule les indemnités et prépare la déclaration Pajemploi. Gratuit pendant deux mois.</p>
    <a href="/?connexion" class="ctabtn">Essayer TiMat gratuitement →</a>
  </div>

  <div class="related"><h2>À voir aussi</h2><div class="chips">
    ${Number(st.assmats) > 0 ? `<a class="chip" href="/assistante-maternelle/${slugify(d.nom)}/devenir">📋 Devenir assmat ${esc(ou)}</a>` : ""}
    <a class="chip" href="/blog/salaire-assistante-maternelle-net-brut">💶 Net, brut et coût employeur</a>
    <a class="chip" href="/blog/indemnite-entretien-assistante-maternelle-2026">🏠 L'indemnité d'entretien</a>
    <a class="chip" href="/assistante-maternelle/">🗺️ Tous les départements</a>
  </div></div>

  <div class="sources"><strong>Sources</strong><ul>
    <li>${esc(stats.sources?.salaire?.libelle || "Observatoire de l'emploi à domicile")}${stats.sources?.salaire?.millesime ? ` — ${esc(stats.sources.salaire.millesime)}` : ""}</li>
    <li>Convention collective nationale des particuliers employeurs et de l'emploi à domicile (IDCC 3239) — avenant n° 10 du 5 février 2026, applicable au 1<sup>er</sup> juin 2026</li>
    <li>Code de l'action sociale et des familles — rémunération minimale de l'assistant maternel (article D423-9)</li>
  </ul><p style="margin-top:10px">Page mise à jour le ${esc(MAJ)}.</p></div>
</main>`;

  return page({
    titre: `Tarif d'une assistante maternelle ${ou} | TiMat`,
    description: `Salaire horaire net moyen ${ou} : ${eur(ici)} par enfant. Minimum légal, indemnités d'entretien et de repas, plafond CMG.`,
    canonical: url,
    jsonLd: filAriane(d, `Tarif ${ou}`, url),
    corps,
  });
}

/* -------------------------------------------------------------- DEVENIR */
// Ce que la PMI du departement demande en propre, au-dela du parcours national.
// Chaque ligne vient du site du conseil departemental, relevee a la main : le
// bloc n'affiche que les champs presents, et disparait entierement s'il n'y en
// a aucun. Rien n'est deduit — un departement muet sur la formation reste muet
// sur la page, il ne recupere pas la regle nationale a son nom.
const DEPOTS = {
  enligne: "en ligne",
  courrier: "par courrier",
  recommande: "en recommandé avec accusé de réception",
  surplace: "sur place",
  reunion: "remis lors de la réunion d'information",
};

const REUNIONS = {
  obligatoire: "obligatoire avant de déposer votre dossier",
  conseillee: "facultative, mais vivement conseillée par le Département",
  proposee: "proposée par le Département",
};

function blocExigences(ex, ou) {
  if (!ex) return "";

  const lignes = [];

  if (ex.formation?.heures) {
    // L'ecart au national est le fait notable. Quand la note le formule deja,
    // elle se suffit : rappeler le minimum legal juste apres ferait doublon.
    lignes.push(
      `<li><strong>Formation</strong> — ${
        ex.formation.note
          ? esc(ex.formation.note)
          : `${esc(String(ex.formation.heures))} heures, là où le minimum légal est de 120 heures dont 80 avant tout accueil`
      }.</li>`
    );
  }

  if (ex.reunion && REUNIONS[ex.reunion]) {
    lignes.push(
      `<li><strong>Réunion d'information</strong> — ${esc(REUNIONS[ex.reunion])}${
        ex.reunionNote ? ` : ${esc(ex.reunionNote)}` : ""
      }.</li>`
    );
  }

  // La note precise l'adresse ou le portail : quand elle existe elle remplace la
  // liste des modes, qui redirait la meme chose en plus vague.
  if (ex.depotNote) {
    lignes.push(`<li><strong>Dépôt du dossier</strong> — ${esc(ex.depotNote)}.</li>`);
  } else if (Array.isArray(ex.depot) && ex.depot.length) {
    const modes = ex.depot.map((m) => DEPOTS[m]).filter(Boolean);
    if (modes.length) {
      const liste =
        modes.length > 1 ? `${modes.slice(0, -1).join(", ")} ou ${modes[modes.length - 1]}` : modes[0];
      lignes.push(`<li><strong>Dépôt du dossier</strong> — ${esc(liste)}.</li>`);
    }
  }

  if (ex.delaiAnnonce) {
    // Le delai legal prime toujours : il ne doit jamais etre efface par le
    // delai de traitement qu'affiche un departement.
    lignes.push(
      `<li><strong>Délai annoncé</strong> — le Département indique ${esc(
        ex.delaiAnnonce
      )}. La loi fixe trois mois à compter du dossier complet, au terme desquels le silence vaut agrément.</li>`
    );
  }

  const c = ex.contact || {};
  if (c.tel || c.email || ex.contactNote) {
    const coord = [
      c.tel ? `<strong>${esc(c.tel)}</strong>` : "",
      c.email ? `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : "",
    ]
      .filter(Boolean)
      .join(" — ");
    lignes.push(
      `<li><strong>Service agréments</strong> — ${coord}${
        coord && ex.contactNote ? ". " : ""
      }${ex.contactNote ? esc(ex.contactNote.charAt(0).toUpperCase() + ex.contactNote.slice(1)) : ""}.</li>`
    );
  }

  if (!lignes.length) return "";

  return `
  <h2>Ce que demande la PMI ${esc(ou)}</h2>
  <p>Le parcours d'agrément est le même partout, mais chaque conseil départemental en fixe les modalités. Voici ce que celui-ci annonce${
    ex.releve ? `, relevé sur son site le ${esc(dateFr(ex.releve))}` : ""
  }.</p>
  <ul>
    ${lignes.join("\n    ")}
  </ul>
  ${
    ex.source
      ? `<p class="mini">Source : <a href="${esc(ex.source)}" rel="nofollow">le site du conseil départemental</a>. Ces modalités changent sans préavis — vérifiez-les avant de vous déplacer.</p>`
      : ""
  }`;
}

function dateFr(iso) {
  const [a, m, j] = String(iso).split("-");
  const mois = [
    "janvier", "février", "mars", "avril", "mai", "juin",
    "juillet", "août", "septembre", "octobre", "novembre", "décembre",
  ];
  return `${Number(j)} ${mois[Number(m) - 1]} ${a}`;
}

function pageDevenir(d, st, stats, ctx, pmi, exigences) {
  const url = `${SITE}/assistante-maternelle/${slugify(d.nom)}/devenir`;
  const ou = d.prep + d.nom;
  const partNat =
    st.assmats && stats.national?.assmats
      ? +((st.assmats / stats.national.assmats) * 100).toFixed(2)
      : null;

  const corps = `
<div class="hero"><div class="hero-in">
  ${fil(d, "Devenir assistante maternelle", Number(st.salaireHoraireNet) > 0)}
  <span class="tag">Chiffres ${esc(stats.sources?.offre?.millesime || "récents")}</span>
  <h1>Devenir assistante maternelle ${esc(ou)}</h1>
  <p class="lead">Le parcours d'agrément est national, mais il se fait auprès de votre conseil départemental. Voici les chiffres de l'accueil ${esc(ou)}, et l'interlocuteur à contacter.</p>
</div></div>
<main>
  <section class="reponse">
    <h2>Réponse courte</h2>
    <p>${esc(ou.charAt(0).toUpperCase() + ou.slice(1))}, on compte <strong>${nb(st.assmats)} agréments d'assistants maternels en cours de validité</strong>${
      typeof st.evolution10ans === "number"
        ? `, ${st.evolution10ans < 0 ? "en recul de" : "en hausse de"} ${Math.abs(st.evolution10ans).toLocaleString("fr-FR")} % en dix ans`
        : partNat ? `, soit ${partNat.toLocaleString("fr-FR")} % du total national` : ""
    }. L'agrément se demande auprès du service de PMI du conseil départemental — c'est lui qui instruit, évalue et délivre.</p>
  </section>

  <h2>L'accueil du jeune enfant ${esc(ou)}</h2>
  <table>
    <thead><tr><th>Indicateur</th><th>Valeur</th></tr></thead>
    <tbody>
      <tr><td>Agréments en cours de validité</td><td class="n">${nb(st.assmats)}</td></tr>
      ${typeof st.evolution10ans === "number" ? `<tr><td>Évolution sur dix ans</td><td class="n">${st.evolution10ans > 0 ? "+" : ""}${st.evolution10ans.toLocaleString("fr-FR")} %</td></tr>` : ""}
      ${st.mam ? `<tr><td>Maisons d'assistants maternels (MAM)</td><td class="n">${nb(st.mam)}</td></tr>` : ""}
      ${st.places ? `<tr><td>Places théoriques d'accueil</td><td class="n">${nb(st.places)}</td></tr>` : ""}
      ${st.tauxCouverture ? `<tr><td>Taux de couverture, tous modes d'accueil</td><td class="n">${st.tauxCouverture.toLocaleString("fr-FR")} places pour 100 enfants</td></tr>` : ""}
      ${st.salaireHoraireNet ? `<tr><td>Salaire horaire net moyen</td><td class="n">${eur(st.salaireHoraireNet)} par enfant</td></tr>` : ""}
    </tbody>
  </table>
  ${
    typeof st.evolution10ans === "number" && st.evolution10ans < -5
      ? `<p>Le chiffre qui compte est celui du milieu. ${esc(ou.charAt(0).toUpperCase() + ou.slice(1))}, le nombre d'agréments a reculé de <strong>${Math.abs(st.evolution10ans).toLocaleString("fr-FR")} %</strong> en dix ans. Ce recul touche toute la France, mais son ampleur varie fortement d'un département à l'autre — et là où les professionnelles se raréfient, celles qui s'installent remplissent leurs places vite.</p>`
      : `<p>Le nombre d'assistantes maternelles agréées recule dans la plupart des départements depuis une dizaine d'années. Là où les professionnelles se raréfient, celles qui s'installent remplissent leurs places vite.</p>`
  }
  ${(() => {
    const p = [];
    if (ctx.assmatsAvant && ctx.perdus > 0) {
      p.push(`<p>Traduit en personnes : le département comptait environ <strong>${nb(ctx.assmatsAvant)} assistantes maternelles agréées</strong> il y a dix ans, contre ${nb(st.assmats)} aujourd'hui — près de <strong>${nb(ctx.perdus)} professionnelles de moins</strong>. Ce sont autant de places d'accueil qui ont disparu, et autant de familles qui cherchent.</p>`);
    } else if (ctx.assmatsAvant && ctx.perdus < 0) {
      p.push(`<p>Le département fait exception : il comptait environ ${nb(ctx.assmatsAvant)} assistantes maternelles agréées il y a dix ans, contre ${nb(st.assmats)} aujourd'hui, soit <strong>${nb(Math.abs(ctx.perdus))} de plus</strong>. La profession y progresse alors qu'elle recule presque partout ailleurs.</p>`);
    }
    if (ctx.rangEffectif && ctx.nbEffectifs) {
      const r = ctx.rangEffectif, n = ctx.nbEffectifs;
      const phrase = r <= 10
        ? `figure${estPluriel(d) ? "nt" : ""} parmi les dix départements les mieux pourvus de France`
        : r > n - 10
          ? `figure${estPluriel(d) ? "nt" : ""} parmi les dix départements les moins pourvus de France`
          : `arrive${estPluriel(d) ? "nt" : ""} au ${rangOrdinal(r)} rang sur les ${n} départements documentés`;
      p.push(`<p>Par le nombre d'agréments en cours, ${esc(avecArticle(d))} ${phrase}.</p>`);
    }
    if (st.mam) {
      const dense = ctx.mamPour1000;
      const commentaire = dense >= 30
        ? `C'est une densité élevée : la formule y est nettement plus installée que dans la moyenne des départements.`
        : dense <= 8
          ? `C'est une densité faible : la formule reste peu répandue ici, ce qui laisse de la place à qui veut s'y lancer.`
          : `La formule y est présente sans être dominante.`;
      p.push(`<p>Le département compte aussi <strong>${nb(st.mam)} maison${st.mam > 1 ? "s" : ""} d'assistants maternels</strong>, soit ${dense ? `${dense.toLocaleString("fr-FR")} pour 1 000 professionnelles agréées. ` : ""}${commentaire} Exercer en MAM permet d'accueillir hors de son domicile, à plusieurs : une option à connaître si votre logement ne se prête pas à l'agrément.</p>`);
    }
    return p.join("\n  ");
  })()}

  <h2>Le parcours, étape par étape</h2>
  <p>Les règles sont nationales et fixées par le Code de l'action sociale et des familles ; seuls les délais réels, le calendrier des réunions et l'organisation des sessions de formation varient d'un département à l'autre.</p>
  <table>
    <thead><tr><th>Étape</th><th>Ce qui se passe</th><th>Délai</th></tr></thead>
    <tbody>
      <tr><td>1. Réunion d'information</td><td>Organisée par le conseil départemental. Le plus souvent obligatoire avant le dépôt du dossier.</td><td class="n">variable</td></tr>
      <tr><td>2. Dépôt du dossier</td><td>Cerfa n° 13394*05, certificat médical, extrait de casier judiciaire, pièce d'identité, justificatif de domicile.</td><td class="n">—</td></tr>
      <tr><td>3. Entretiens et visite</td><td>Une puéricultrice ou une infirmière de la PMI vient chez vous : sécurité et dimensions du logement, espace de couchage, projet d'accueil.</td><td class="n">—</td></tr>
      <tr><td>4. Décision</td><td>Notifiée par le président du conseil départemental. Son silence vaut agrément.</td><td class="n">3 mois</td></tr>
      <tr><td>5. Formation, 1re partie</td><td>80 heures, gratuites, avant tout accueil d'enfant. Une évaluation les clôture et vaut autorisation d'accueillir.</td><td class="n">6 mois</td></tr>
      <tr><td>6. Formation, 2e partie</td><td>40 heures en cours d'emploi, qui complètent les 120 heures obligatoires.</td><td class="n">3 ans</td></tr>
    </tbody>
  </table>

  <div class="warn">⚠️ Le compte à rebours des 80 heures ne part pas de votre agrément, mais de la <strong>réception de votre dossier complet</strong> par la PMI : vous avez six mois à partir de cette date. C'est le point sur lequel la plupart des sites se trompent, en annonçant deux ans ou six mois « après l'agrément ». Attendre l'arrêté pour chercher une session, c'est consommer une partie du délai.</div>

  <h2>Ce qu'il faut, et ce qu'il ne faut pas</h2>
  <p><strong>Aucun diplôme n'est exigé.</strong> Ce qui est demandé tient en quelques points : présenter les garanties de santé, de moralité et d'aptitude éducative nécessaires à l'accueil d'enfants, disposer d'un logement dont l'état, les dimensions et l'environnement permettent d'accueillir en sécurité, résider en France et maîtriser le français oral.</p>
  <p>L'arrêté d'agrément précise le nombre d'enfants accueillis simultanément — <strong>quatre au maximum</strong>, une dérogation restant possible — leur âge, et une durée de validité de <strong>cinq ans</strong>. Il attribue un numéro à mentionner dans les contrats et à afficher au domicile.</p>

  <h2>Si l'agrément est refusé</h2>
  <p>Tout refus, même partiel, doit être motivé par écrit et mentionner les voies et délais de recours — une motivation insuffisante est en elle-même un motif d'annulation. Deux recours existent et se cumulent :</p>
  <ul>
    <li>Le <strong>recours gracieux</strong>, adressé au président du conseil départemental dans les deux mois suivant la notification, en recommandé avec accusé de réception.</li>
    <li>Le <strong>recours contentieux</strong>, devant le tribunal administratif, dans les deux mois suivant la notification — ou, après un recours gracieux, dans les deux mois suivant la réponse, l'absence de réponse au bout de deux mois valant confirmation du refus.</li>
  </ul>
  <div class="box">On lit souvent qu'il faudrait saisir la commission consultative paritaire départementale après un refus. C'est inexact pour une première demande : cette commission n'est consultée que lorsque le président du conseil départemental envisage de retirer un agrément, d'y apporter une restriction ou de ne pas le renouveler — et c'est lui qui la saisit, pas vous.</div>

  <h2>Le renouvellement</h2>
  <p>Le conseil départemental adresse le dossier quatre à six mois avant l'échéance ; il se retourne au plus tard trois mois avant. Pour tout agrément délivré depuis 2018, le premier renouvellement suppose de s'être présentée aux épreuves EP1 et EP3 du CAP Accompagnant éducatif petite enfance. L'obligation porte sur le fait de s'y présenter, pas de les réussir : c'est un relevé de notes qui est demandé. Les valider fait passer l'agrément à dix ans au lieu de cinq.</p>

  <div class="box">Le parcours complet est détaillé dans nos guides <a href="/blog/devenir-assistante-maternelle-agrement">Devenir assistante maternelle : le parcours vers l'agrément</a> et <a href="/blog/renouvellement-agrement-assistante-maternelle">Le renouvellement de l'agrément</a>.</div>

  ${blocExigences(exigences, ou)}

  <h2>Qui contacter ${esc(ou)}</h2>
  ${pmi && pmi.verifie && pmi.url
    ? `<p>Votre interlocuteur est le <strong>service de protection maternelle et infantile (PMI)</strong> du conseil départemental : <a href="${esc(pmi.url)}" rel="nofollow">${esc(pmi.libelle || `le service dédié ${ou}`)}</a>. C'est lui qui organise les réunions d'information et fixe le calendrier des sessions de formation.</p>`
    : `<p>Votre interlocuteur est le <strong>service de protection maternelle et infantile (PMI)</strong> du conseil départemental. Cherchez « PMI ${esc(d.nom)} agrément assistante maternelle » ou passez par le standard du conseil départemental : c'est le service qui organise les réunions d'information et fixe le calendrier des sessions.</p>`}
  <p>Le relais petite enfance de votre commune est le second interlocuteur utile : il connaît les besoins du secteur, et il accompagne ensuite sur les contrats.</p>

  <div class="ctabox">
    <h2>Une fois agréée, tout commence</h2>
    <p>Contrats conformes à la convention collective, mensualisation, congés, déclarations Pajemploi : TiMat s'occupe du calcul et de la paperasse.</p>
    <a href="/?connexion" class="ctabtn">Essayer TiMat gratuitement →</a>
  </div>

  <div class="related"><h2>À voir aussi</h2><div class="chips">
    ${Number(st.salaireHoraireNet) > 0 ? `<a class="chip" href="/assistante-maternelle/${slugify(d.nom)}/tarif">💶 Les tarifs ${esc(ou)}</a>` : ""}
    <a class="chip" href="/blog/devenir-assistante-maternelle-agrement">📋 Le parcours d'agrément</a>
    <a class="chip" href="/blog/renouvellement-agrement-assistante-maternelle">🔄 Le renouvellement</a>
    <a class="chip" href="/assistante-maternelle/">🗺️ Tous les départements</a>
  </div></div>

  <div class="sources"><strong>Sources</strong><ul>
    <li>${esc(stats.sources?.offre?.libelle || "DREES")}${stats.sources?.offre?.millesime ? ` — millésime ${esc(stats.sources.offre.millesime)}` : ""}</li>
    <li>Code de l'action sociale et des familles — agrément de l'assistant maternel, articles L421-3 et suivants</li>
    <li>Décret du 23 octobre 2018 relatif à la formation des assistants maternels</li>
    <li>Justice.fr — refus, retrait, restriction ou suspension de l'agrément d'assistant maternel</li>
  </ul><p style="margin-top:10px">Page mise à jour le ${esc(MAJ)}.</p></div>
</main>`;

  return page({
    titre: `Devenir assistante maternelle ${ou} | TiMat`,
    description: `${nb(st.assmats)} agréments d'assistants maternels ${ou}${typeof st.evolution10ans === "number" ? `, ${st.evolution10ans < 0 ? "-" : "+"}${Math.abs(st.evolution10ans).toLocaleString("fr-FR")} % en dix ans` : ""}. Le parcours d'agrément, les délais, la formation et la PMI à contacter.`,
    canonical: url,
    jsonLd: filAriane(d, `Devenir assistante maternelle ${ou}`, url),
    corps,
  });
}

/* ------------------------------------------------------------------ HUB */
function pageHub(entrees) {
  const url = `${SITE}/assistante-maternelle/`;
  const parRegion = new Map();
  for (const e of entrees) {
    if (!parRegion.has(e.d.region)) parRegion.set(e.d.region, []);
    parRegion.get(e.d.region).push(e);
  }
  const regions = [...parRegion.keys()].sort((a, b) => a.localeCompare(b, "fr"));

  const corps = `
<div class="hero"><div class="hero-in">
  <div class="crumb"><a href="/">Accueil</a> › Par département</div>
  <span class="tag">${entrees.length} département${entrees.length > 1 ? "s" : ""}</span>
  <h1>L'accueil chez une assistante maternelle, département par département</h1>
  <p class="lead">Les tarifs réellement pratiqués et le parcours d'agrément, avec les chiffres de chaque département plutôt qu'une moyenne nationale.</p>
</div></div>
<main>
  ${regions.map((r) => `
  <h3 class="reg">${esc(r)}</h3>
  <div class="grille">
    ${parRegion.get(r).sort((a, b) => a.d.nom.localeCompare(b.d.nom, "fr"))
      .map((e) => `<a href="/assistante-maternelle/${slugify(e.d.nom)}/${e.tarif ? "tarif" : "devenir"}">${esc(e.d.nom)}<br><span class="c">${e.tarif ? eur(e.st.salaireHoraireNet) + " net/h" : nb(e.st.assmats) + " assmats"}</span></a>`).join("\n    ")}
  </div>`).join("\n")}
  <div class="box">Un département manquant ? C'est que nous n'avons pas encore ses chiffres. Nous préférons ne rien publier plutôt que d'afficher une moyenne nationale déguisée en donnée locale.</div>
</main>`;

  return page({
    titre: "Assistante maternelle par département : tarifs et agrément | TiMat",
    description: "Tarif horaire moyen et parcours d'agrément, département par département, à partir des données officielles.",
    canonical: url,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Assistante maternelle par département",
      url,
      inLanguage: "fr-FR",
    },
    corps,
  });
}

/* -------------------------------------------------------------- SITEMAP */
function sitemap(urls) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u}</loc><lastmod>${MAJ}</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>`).join("\n")}
</urlset>`;
}

/* ---------------------------------------------------------------- MAIN */
async function main() {
  const fichierStats = path.join(DATA_DIR, "stats-departements.json");
  if (!existsSync(fichierStats)) {
    console.warn("[local] data/stats-departements.json absent : aucune page départementale générée.");
    console.warn("[local] Partir de data/stats-departements.example.json pour le format attendu.");
    return;
  }

  const departements = lire("departements.json");
  const stats = lire("stats-departements.json");
  const ctx = contexte(departements, stats);
  // Fichiers facultatifs : leur absence ne casse rien, les pages gardent leur repli.
  const pmi = existsSync(path.join(DATA_DIR, "pmi-departements.json"))
    ? lire("pmi-departements.json").departements || {}
    : {};
  const exigences = existsSync(path.join(DATA_DIR, "exigences-pmi.json"))
    ? lire("exigences-pmi.json").departements || {}
    : {};
  const parCode = new Map(departements.map((d) => [String(d.code), d]));

  if (existsSync(LOCAL_DIR)) await rm(LOCAL_DIR, { recursive: true, force: true });
  await mkdir(LOCAL_DIR, { recursive: true });

  const urls = [`${SITE}/assistante-maternelle/`];
  const entrees = [];
  let nbTarif = 0, nbDevenir = 0, ignores = [];

  for (const [code, st] of Object.entries(stats.departements || {})) {
    const d = parCode.get(String(code));
    if (!d) { ignores.push(`${code} (code inconnu)`); continue; }

    const aTarif = Number(st.salaireHoraireNet) > 0;
    const aDevenir = Number(st.assmats) > 0;
    if (!aTarif && !aDevenir) { ignores.push(`${code} ${d.nom} (aucun chiffre)`); continue; }

    const base = path.join(LOCAL_DIR, slugify(d.nom));
    if (aTarif) {
      await mkdir(path.join(base, "tarif"), { recursive: true });
      await writeFile(path.join(base, "tarif", "index.html"), pageTarif(d, st, stats, ctx.get(code) || {}), "utf8");
      urls.push(`${SITE}/assistante-maternelle/${slugify(d.nom)}/tarif`);
      nbTarif++;
    }
    if (aDevenir) {
      await mkdir(path.join(base, "devenir"), { recursive: true });
      await writeFile(path.join(base, "devenir", "index.html"), pageDevenir(d, st, stats, ctx.get(code) || {}, pmi[code] || null, exigences[code] || null), "utf8");
      urls.push(`${SITE}/assistante-maternelle/${slugify(d.nom)}/devenir`);
      nbDevenir++;
    }
    entrees.push({ d, st, tarif: aTarif });
  }

  if (!entrees.length) {
    console.warn("[local] Aucun département exploitable : rien n'a été généré.");
    return;
  }

  await writeFile(path.join(LOCAL_DIR, "index.html"), pageHub(entrees), "utf8");
  await writeFile(path.join(PUBLIC_DIR, "sitemap-local.xml"), sitemap(urls), "utf8");

  console.log(`[local] ${nbTarif} page(s) tarif + ${nbDevenir} page(s) devenir + hub + sitemap-local.xml`);
  if (ignores.length) console.warn(`[local] ${ignores.length} département(s) ignoré(s) faute de chiffres : ${ignores.join(", ")}`);
}

main().catch((e) => { console.error("[local] Échec :", e); process.exit(1); });
