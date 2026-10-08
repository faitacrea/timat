// SIGNER, POUR DE VRAI.
//
// Les autorisations et la signature du contrat passent par un pavé de
// signature. Son bouton « Enregistrer » est disabled={!hasDrawn} : aucune
// frappe au clavier ne le réveille, et le parcours des formulaires signalait
// donc toute cette famille comme « boutons restés éteints ». C'est la seule
// famille de formulaires que rien ne traversait — et ce sont ceux qui ont une
// valeur juridique : une autorisation de sortie, un contrat de travail.
//
// Ce contrôle trace un vrai trait à la souris sur le canvas DU PAVÉ — pas sur
// le premier canvas venu, qui est l'erreur qui m'a fait croire pendant deux
// essais que la signature ne prenait pas — puis exige que « Enregistrer »
// s'allume et que la réponse s'enregistre.
//
// Hors chaîne de build : Vercel n'a pas de navigateur.
//   node scripts/verif-signature.mjs
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { CHROMIUM, REPONSE_URL, PID, BUNDLE_TESTABLE, ATTENDRE_PRET} from "./jeu-de-donnees.mjs";

const CLE = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8").match(/MAINTENANCE_CLE\s*=\s*"([^"]+)"/)[1];
const utilisateur = {
  id: PID, aud: "authenticated", role: "authenticated", email: "sophie@test.fr",
  app_metadata: {}, user_metadata: { prenom: "Sophie", nom: "Test", role: "parent" },
  created_at: new Date().toISOString(),
};
const session = { access_token: "faux", token_type: "bearer", expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: "faux", user: utilisateur };

const N = await chromium.launch({ executablePath: CHROMIUM() });
const ctx = await N.newContext({ viewport: { width: 390, height: 844 }, locale: "fr-FR", timezoneId: "Europe/Paris", serviceWorkers: "block" });
const p = await ctx.newPage();
const erreurs = [];
const envois = [];
p.on("pageerror", (e) => erreurs.push(e.message));
p.on("dialog", (d) => d.dismiss().catch(() => {}));
await p.addInitScript(([s, cle]) => {
  try {
    localStorage.setItem("timat_acces", cle);
    localStorage.setItem("sb-akicyckmbsjnewnvvcil-auth-token", JSON.stringify(s));
  } catch (e) { /* stockage indisponible : la page reste testable */ }
}, [session, CLE]);

const json = (b) => ({ status: 200, contentType: "application/json", body: JSON.stringify(b) });
await p.route("**/storage/v1/**", (r) => r.fulfill(json([])));
await p.route("**/rest/v1/**", (r) => {
  const req = r.request();
  const t = (req.url().match(/rest\/v1\/(?:rpc\/)?([a-z_]+)/) || [])[1];
  if (req.method() !== "GET") envois.push({ table: t, corps: req.postData() || "" });
  // On garde les autorisations du jeu de données : sans aucune ligne, l'écran
  // n'affiche rien du tout et il n'y a pas de bouton à ouvrir. Avec une ligne
  // déjà répondue, il propose « Modifier ma réponse » — le même pavé.
  return r.fulfill(json(REPONSE_URL(r.request().url(), r.request().headers(), "parent")));
});
await p.route("**/auth/v1/**", (r) => r.fulfill(json({ ...session, ...utilisateur })));

await p.goto(`http://127.0.0.1:4173/?acces=${CLE}`, { waitUntil: "domcontentloaded" });
await ATTENDRE_PRET(p);
if (!(await BUNDLE_TESTABLE(p))) { await N.close(); process.exit(2); }
for (let i = 0; i < 5; i++) {
  const passer = p.getByRole("button", { name: /^Passer$/ });
  if (await passer.isVisible().catch(() => false)) { await passer.click(); await p.waitForTimeout(400); } else break;
}

const ko = [];
await p.evaluate(() => window.dispatchEvent(new CustomEvent("timat:page", { detail: "autorisations" })));
await p.waitForTimeout(2000);

const ouvert = await p.evaluate(() => {
  const b = [...document.querySelectorAll("button")].find((x) => /Répondre et signer|Modifier ma réponse/i.test(x.innerText || ""));
  if (!b) return false; b.click(); return true;
});
if (!ouvert) { console.error("\n  KO  aucune autorisation à signer : le contrôle ne vérifierait rien\n"); await N.close(); process.exit(1); }
await p.waitForTimeout(1200);

// LE CANVAS DU PAVÉ, PAS LE PREMIER VENU. Celui de la signature est le seul
// que l'on peut dessiner : il porte un curseur en croix et une bordure
// pointillée. On le reconnaît à sa taille interne, 600×200, fixée dans le code.
const marque = await p.evaluate(() => {
  const liste = [...document.querySelectorAll("canvas")];
  const pad = liste.find((c) => c.width === 600 && c.height === 200) || liste.find((c) => c.offsetParent);
  if (!pad) return null;
  pad.setAttribute("data-pad", "1");
  pad.scrollIntoView({ block: "center" });
  return { total: liste.length, bon: pad.width + "×" + pad.height };
});
if (!marque) { ko.push("le pavé de signature ne s'affiche pas"); }
else {
  await p.waitForTimeout(400);
  const c = p.locator('canvas[data-pad="1"]');
  const b = await c.boundingBox();
  if (!b) ko.push("le pavé de signature n'a pas de place à l'écran");
  else {
    // Un trait continu, à l'intérieur du pavé : on ne sort jamais de ses bords,
    // car onMouseLeave interrompt le tracé.
    await p.mouse.move(b.x + b.width * 0.2, b.y + b.height * 0.6);
    await p.mouse.down();
    for (const [fx, fy] of [[0.35, 0.3], [0.5, 0.65], [0.65, 0.3], [0.8, 0.6]]) {
      await p.mouse.move(b.x + b.width * fx, b.y + b.height * fy, { steps: 10 });
      await p.waitForTimeout(60);
    }
    await p.mouse.up();
    await p.waitForTimeout(600);

    // 1. Le trait doit être VISIBLE sur le pavé, pas seulement reçu.
    const encre = await p.evaluate(() => {
      const pad = document.querySelector('canvas[data-pad="1"]');
      const d = pad.getContext("2d").getImageData(0, 0, pad.width, pad.height).data;
      let sombres = 0;
      for (let i = 0; i < d.length; i += 4) if (d[i] < 120 && d[i + 1] < 120) sombres++;
      return sombres;
    });
    if (encre < 50) ko.push(`le trait ne s'inscrit pas sur le pavé (${encre} pixels d'encre) : la signature est impossible à la souris`);

    // 2. « Enregistrer » doit s'allumer : c'est lui qui garde la signature.
    const etat = await p.evaluate(() => {
      const b = [...document.querySelectorAll("button")].find((x) => (x.innerText || "").trim() === "Enregistrer");
      return b ? { existe: true, actif: !b.disabled } : { existe: false };
    });
    if (!etat.existe) ko.push("le pavé n'a pas de bouton « Enregistrer »");
    else if (!etat.actif) ko.push("« Enregistrer » reste éteint après un trait tracé : on ne peut pas signer à la souris");
    else {
      await p.evaluate(() => [...document.querySelectorAll("button")].find((x) => (x.innerText || "").trim() === "Enregistrer").click());
      await p.waitForTimeout(900);
      // 3. Une fois signé, l'écran doit proposer de répondre.
      const repondre = await p.evaluate(() => [...document.querySelectorAll("button")]
        .some((x) => /J'autorise|Je refuse/i.test(x.innerText || "")));
      if (!repondre) ko.push("après la signature, ni « J'autorise » ni « Je refuse » n'apparaissent : la réponse ne peut pas être donnée");
      else {
        await p.evaluate(() => [...document.querySelectorAll("button")].find((x) => /J'autorise/i.test(x.innerText || "")).click());
        await p.waitForTimeout(1200);
        // 4. La réponse part vers la base, avec la signature.
        const envoi = envois.find((e) => e.table === "autorisations");
        if (!envoi) ko.push("« J'autorise » n'enregistre rien : rien ne part vers la base");
        else if (!/data:image\/png/.test(envoi.corps)) ko.push("la réponse part SANS la signature : l'autorisation n'est pas signée");
      }
    }
  }
}

const dur = erreurs.find((e) => /is not defined|is not a function|cannot read propert/i.test(e));
if (dur) ko.push(`le code casse pendant la signature : ${dur.slice(0, 120)}`);

await N.close();
console.log("\n=== SIGNATURE — on trace un vrai trait, et on répond ===\n");
if (ko.length) { ko.forEach((x) => console.log(`  KO  ${x}`)); console.log(`\n${ko.length} problème(s).\n`); }
else console.log("  ok  le trait s'inscrit, « Enregistrer » s'allume, et la réponse part signée\n");
process.exit(ko.length ? 1 : 0);
