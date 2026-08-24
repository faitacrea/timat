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

// Minimum légal : 0,281 × SMIC horaire brut, par enfant et par heure.
const SMIC_HORAIRE = 12.31;
const MINIMUM_BRUT = +(SMIC_HORAIRE * 0.281).toFixed(2);
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

const fil = (d, feuille) =>
  `<div class="crumb"><a href="/">Accueil</a> › <a href="/assistante-maternelle/">Par département</a> › <a href="/assistante-maternelle/${slugify(d.nom)}/tarif">${esc(d.nom)}</a> › ${esc(feuille)}</div>`;

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
function pageTarif(d, st, stats) {
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
    ["Minimum légal", MINIMUM_BRUT, "brut", "Plancher opposable : 0,281 × SMIC horaire, par enfant et par heure."],
    ...(reg ? [[`Moyenne en ${d.region}`, reg, "net", "Salaire horaire net moyen observé dans la région."]] : []),
    ...(nat ? [["Moyenne nationale", nat, "net", "Toutes régions confondues."]] : []),
  ];

  const corps = `
<div class="hero"><div class="hero-in">
  ${fil(d, "Tarif")}
  <span class="tag">Chiffres ${esc(stats.sources?.salaire?.millesime || "récents")}</span>
  <h1>Tarif d'une assistante maternelle ${esc(ou)}</h1>
  <p class="lead">Ce que gagnent réellement les assistantes maternelles du département, ce que dit le minimum légal, et les trois lignes que le taux horaire ne couvre pas.</p>
</div></div>
<main>
  <section class="reponse">
    <h2>Réponse courte</h2>
    <p>${esc(ou.charAt(0).toUpperCase() + ou.slice(1))}, le salaire horaire net moyen est de <strong>${eur(ici)}</strong> par enfant et par heure${comparaison ? ", " + comparaison : ""}. Le minimum légal, lui, est de ${eur(MINIMUM_BRUT)} brut partout en France.</p>
  </section>

  <h2>Le tarif ${esc(ou)}, en contexte</h2>
  <table>
    <thead><tr><th>Référence</th><th>Montant</th><th>Ce que c'est</th></tr></thead>
    <tbody>
      <tr class="fort"><td>${esc(d.nom)}</td><td class="n">${eur(ici)} net</td><td>Moyenne observée dans le département.</td></tr>
      ${lignes.map(([l, v, t, quoi]) => `<tr><td>${esc(l)}</td><td class="n">${eur(v)} ${t}</td><td>${esc(quoi)}</td></tr>`).join("\n      ")}
    </tbody>
  </table>
  <div class="warn">⚠️ Une moyenne n'est pas un tarif à appliquer. Elle situe, elle ne fixe rien : le tarif se négocie librement avant la signature, dans le respect du minimum légal, et ne se modifie ensuite que par avenant.</div>

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
    <a class="chip" href="/assistante-maternelle/${slugify(d.nom)}/devenir">📋 Devenir assmat ${esc(ou)}</a>
    <a class="chip" href="/blog/salaire-assistante-maternelle-net-brut">💶 Net, brut et coût employeur</a>
    <a class="chip" href="/blog/indemnite-entretien-assistante-maternelle-2026">🏠 L'indemnité d'entretien</a>
    <a class="chip" href="/assistante-maternelle/">🗺️ Tous les départements</a>
  </div></div>

  <div class="sources"><strong>Sources</strong><ul>
    <li>${esc(stats.sources?.salaire?.libelle || "Observatoire de l'emploi à domicile")}${stats.sources?.salaire?.millesime ? ` — ${esc(stats.sources.salaire.millesime)}` : ""}</li>
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
function pageDevenir(d, st, stats) {
  const url = `${SITE}/assistante-maternelle/${slugify(d.nom)}/devenir`;
  const ou = d.prep + d.nom;
  const partNat =
    st.assmats && stats.national?.assmats
      ? +((st.assmats / stats.national.assmats) * 100).toFixed(2)
      : null;

  const corps = `
<div class="hero"><div class="hero-in">
  ${fil(d, "Devenir assistante maternelle")}
  <span class="tag">Chiffres ${esc(stats.sources?.offre?.millesime || "récents")}</span>
  <h1>Devenir assistante maternelle ${esc(ou)}</h1>
  <p class="lead">Le parcours d'agrément est national, mais il se fait auprès de votre conseil départemental. Voici les chiffres de l'accueil ${esc(ou)}, et l'interlocuteur à contacter.</p>
</div></div>
<main>
  <section class="reponse">
    <h2>Réponse courte</h2>
    <p>${esc(ou.charAt(0).toUpperCase() + ou.slice(1))}, on compte <strong>${nb(st.assmats)} assistantes maternelles agréées</strong>${partNat ? `, soit ${partNat.toLocaleString("fr-FR")} % du total national` : ""}. L'agrément se demande auprès du service de PMI du conseil départemental — c'est lui qui instruit, évalue et délivre.</p>
  </section>

  <h2>L'accueil du jeune enfant ${esc(ou)}</h2>
  <table>
    <thead><tr><th>Indicateur</th><th>Valeur</th></tr></thead>
    <tbody>
      <tr><td>Assistantes maternelles agréées</td><td class="n">${nb(st.assmats)}</td></tr>
      ${st.places ? `<tr><td>Places théoriques d'accueil</td><td class="n">${nb(st.places)}</td></tr>` : ""}
      ${st.tauxCouverture ? `<tr><td>Taux de couverture, tous modes d'accueil</td><td class="n">${st.tauxCouverture.toLocaleString("fr-FR")} places pour 100 enfants</td></tr>` : ""}
      ${st.salaireHoraireNet ? `<tr><td>Salaire horaire net moyen</td><td class="n">${eur(st.salaireHoraireNet)} par enfant</td></tr>` : ""}
    </tbody>
  </table>
  <p>Le nombre d'assistantes maternelles agréées recule partout en France depuis une dizaine d'années. Un département qui en compte peu au regard de sa population d'enfants est un département où les places manquent — donc où une nouvelle professionnelle trouve preneur vite.</p>

  <h2>Le parcours, étape par étape</h2>
  <p>Les règles sont les mêmes dans toute la France ; seuls les délais et l'organisation des sessions varient d'un département à l'autre.</p>
  <table>
    <thead><tr><th>Étape</th><th>Ce qui se passe</th></tr></thead>
    <tbody>
      <tr><td>1. Réunion d'information</td><td>Organisée par le conseil départemental. Souvent obligatoire avant le dépôt du dossier.</td></tr>
      <tr><td>2. Dossier de demande</td><td>Formulaire Cerfa, certificat médical, extrait de casier judiciaire, justificatif de domicile.</td></tr>
      <tr><td>3. Instruction et visite</td><td>Une puéricultrice de la PMI se déplace chez vous : sécurité du logement, espace, projet d'accueil.</td></tr>
      <tr><td>4. Décision</td><td>Le conseil départemental dispose de trois mois pour répondre. Le silence vaut acceptation.</td></tr>
      <tr><td>5. Formation obligatoire</td><td>120 heures, dont 80 avant le premier accueil. Prise en charge par le département.</td></tr>
    </tbody>
  </table>
  <div class="box">L'agrément vaut cinq ans et se renouvelle. Le détail complet du parcours figure dans notre guide <a href="/blog/devenir-assistante-maternelle-agrement">Devenir assistante maternelle : le parcours vers l'agrément</a>.</div>

  <h2>Qui contacter ${esc(ou)}</h2>
  <p>Votre interlocuteur est le <strong>service de protection maternelle et infantile (PMI)</strong> du conseil départemental. Cherchez « PMI ${esc(d.nom)} agrément assistante maternelle » ou passez par le standard du conseil départemental : c'est le service qui organise les réunions d'information et fixe le calendrier des sessions.</p>
  <p>Le relais petite enfance de votre commune est le second interlocuteur utile : il connaît les besoins du secteur, et il accompagne ensuite sur les contrats.</p>

  <div class="ctabox">
    <h2>Une fois agréée, tout commence</h2>
    <p>Contrats conformes à la convention collective, mensualisation, congés, déclarations Pajemploi : TiMat s'occupe du calcul et de la paperasse.</p>
    <a href="/?connexion" class="ctabtn">Essayer TiMat gratuitement →</a>
  </div>

  <div class="related"><h2>À voir aussi</h2><div class="chips">
    <a class="chip" href="/assistante-maternelle/${slugify(d.nom)}/tarif">💶 Les tarifs ${esc(ou)}</a>
    <a class="chip" href="/blog/devenir-assistante-maternelle-agrement">📋 Le parcours d'agrément</a>
    <a class="chip" href="/blog/renouvellement-agrement-assistante-maternelle">🔄 Le renouvellement</a>
    <a class="chip" href="/assistante-maternelle/">🗺️ Tous les départements</a>
  </div></div>

  <div class="sources"><strong>Sources</strong><ul>
    <li>${esc(stats.sources?.offre?.libelle || "DREES")}${stats.sources?.offre?.millesime ? ` — millésime ${esc(stats.sources.offre.millesime)}` : ""}</li>
    <li>Code de l'action sociale et des familles — agrément de l'assistant maternel (articles L421-3 et suivants)</li>
  </ul><p style="margin-top:10px">Page mise à jour le ${esc(MAJ)}.</p></div>
</main>`;

  return page({
    titre: `Devenir assistante maternelle ${ou} | TiMat`,
    description: `${nb(st.assmats)} assistantes maternelles agréées ${ou}. Le parcours d'agrément, les délais, la formation obligatoire et le service de PMI à contacter.`,
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
      await writeFile(path.join(base, "tarif", "index.html"), pageTarif(d, st, stats), "utf8");
      urls.push(`${SITE}/assistante-maternelle/${slugify(d.nom)}/tarif`);
      nbTarif++;
    }
    if (aDevenir) {
      await mkdir(path.join(base, "devenir"), { recursive: true });
      await writeFile(path.join(base, "devenir", "index.html"), pageDevenir(d, st, stats), "utf8");
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
