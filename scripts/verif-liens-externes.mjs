// LES LIENS VERS LES SOURCES OFFICIELLES, VÉRIFIÉS DEPUIS DEHORS.
//
// Les articles citent environ cent quarante-cinq adresses : Légifrance,
// l'Urssaf, Pajemploi, la CAF, service-public. C'est ce qui rend le blog
// vérifiable — et un lien mort sur une source, c'est la crédibilité qui tombe
// chez le seul lecteur qui prend la peine de cliquer.
//
// Ce contrôle ne tourne PAS dans l'environnement de développement : Légifrance
// y répond 403 (protection anti-robot) et le proxy refuse le reste. Un contrôle
// qui ne distingue pas « mort » de « bloqué » ment. Il tourne donc chez GitHub,
// une fois par semaine, depuis une machine qui n'est pas bloquée
// (.github/workflows/liens-externes.yml), et ouvre une issue quand il trouve.
//
// IL NE SIGNALE QUE CE QUI EST SÛR. Un 404 ou un 410 est un lien mort : la page
// a été retirée. Un 403, un 429, un délai dépassé ou une erreur serveur ne
// prouvent rien — c'est peut-être une protection anti-robot, et le lien marche
// très bien dans un vrai navigateur. Ceux-là sont comptés à part et nommés,
// jamais présentés comme des défauts.
//
//   node scripts/verif-liens-externes.mjs [https://www.timat.app]
const SITE = (process.argv[2] || "https://www.timat.app").replace(/\/$/, "");
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const IGNORE = /^(mailto:|tel:|javascript:|#)/i;
// Les domaines qui ne sont pas des sources : polices, données structurées.
const HORS_SUJET = /^https?:\/\/(fonts\.(googleapis|gstatic)\.com|schema\.org|www\.w3\.org|cdn\.sanity\.io)/i;

const dort = (ms) => new Promise((r) => setTimeout(r, ms));

async function recupere(url, methode = "GET") {
  try {
    const r = await fetch(url, {
      method: methode,
      redirect: "follow",
      headers: { "User-Agent": UA, "Accept-Language": "fr-FR,fr;q=0.9", Accept: "text/html,*/*" },
      signal: AbortSignal.timeout(25000),
    });
    return { statut: r.status, texte: methode === "GET" ? await r.text().catch(() => "") : "" };
  } catch (e) {
    return { statut: 0, erreur: e.message || String(e), texte: "" };
  }
}

// --- 1. Les pages du site, depuis ses propres sitemaps -----------------------
const pages = new Set();
for (const nom of ["sitemap.xml", "sitemap-blog.xml"]) {
  const { texte } = await recupere(`${SITE}/${nom}`);
  for (const m of texte.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)) pages.add(m[1]);
}
if (!pages.size) {
  console.error(`\n  KO  aucun sitemap lisible sur ${SITE} : le contrôle ne vérifierait rien\n`);
  process.exit(1);
}

// --- 2. Les liens externes de chaque page ------------------------------------
const liens = new Map(); // url -> pages qui y renvoient
for (const page of pages) {
  const { texte } = await recupere(page);
  for (const m of texte.matchAll(/href=["']([^"']+)["']/g)) {
    // L'ADRESSE DU HTML N'EST PAS L'ADRESSE RÉELLE. Dans une page, « & » s'écrit
    // « &amp; » : interroger l'adresse telle quelle, c'est interroger une autre
    // adresse que celle du navigateur. La première version de ce contrôle a
    // ainsi annoncé un lien mort qui ne l'était peut-être pas.
    const u = m[1]
      .replace(/&(amp|#0*38);/gi, "&")
      .replace(/&(quot|#0*34);/gi, '"')
      .replace(/&(apos|#0*39);/gi, "'")
      .replace(/&(lt|#0*60);/gi, "<")
      .replace(/&(gt|#0*62);/gi, ">");
    if (IGNORE.test(u) || HORS_SUJET.test(u)) continue;
    if (!/^https?:\/\//i.test(u)) continue;
    if (u.startsWith(SITE)) continue;
    const propre = u.split("#")[0];
    if (!liens.has(propre)) liens.set(propre, new Set());
    liens.get(propre).add(page.replace(SITE, "") || "/");
  }
  await dort(120);
}

// --- 3. Chacun, une fois ------------------------------------------------------
const morts = [], incertains = [];
let vivants = 0;
for (const [url, depuis] of liens) {
  // On tente HEAD d'abord : beaucoup de sites publics le servent sans difficulté
  // et cela leur épargne la page entière. On repasse en GET sinon, car certains
  // répondent 405 à HEAD.
  let r = await recupere(url, "HEAD");
  if (r.statut === 0 || r.statut === 405 || r.statut === 501) r = await recupere(url, "GET");

  // UN SEUL ESSAI NE PROUVE RIEN.
  //
  // Le formulaire de contrat CDI de Pajemploi a répondu 200 au premier essai et
  // 404 au second, à la même adresse et avec la même redirection : il existe,
  // mais son hébergeur limite le débit. Signalé sur un seul essai, il aurait
  // fait ouvrir une issue pour un lien parfaitement vivant.
  //
  // Un lien n'est déclaré mort que si TROIS essais espacés disent la même
  // chose. C'est lent, et ce contrôle tourne une fois par semaine : il a le
  // temps.
  if (r.statut === 404 || r.statut === 410) {
    for (let essai = 0; essai < 2 && (r.statut === 404 || r.statut === 410); essai++) {
      await dort(3000);
      r = await recupere(url, "GET");
    }
  }
  const ou = [...depuis].slice(0, 2).join(", ") + (depuis.size > 2 ? ` et ${depuis.size - 2} autre(s)` : "");
  if (r.statut === 404 || r.statut === 410) morts.push(`${url}\n          cité par ${ou} — réponse ${r.statut} sur trois essais espacés`);
  else if (r.statut >= 200 && r.statut < 400) vivants++;
  else incertains.push(`${url} → ${r.statut || r.erreur}`);
  await dort(250);
}

// --- 4. Le verdict ------------------------------------------------------------
console.log(`\n=== LIENS EXTERNES — ${liens.size} adresses citées par ${pages.size} pages ===\n`);
console.log(`  ${vivants} répondent, ${morts.length} mortes, ${incertains.length} non concluantes.\n`);
if (incertains.length) {
  console.log(`  Non concluantes (protection anti-robot, lenteur, erreur serveur) — à ouvrir à la main si besoin :`);
  incertains.slice(0, 25).forEach((x) => console.log(`        ${x}`));
  if (incertains.length > 25) console.log(`        … et ${incertains.length - 25} autre(s)`);
  console.log("");
}
if (morts.length) {
  console.log(`  LIENS MORTS — la page citée a été retirée :`);
  morts.forEach((x) => console.log(`        ${x}`));
  console.log("");
}
process.exit(morts.length ? 1 : 0);
