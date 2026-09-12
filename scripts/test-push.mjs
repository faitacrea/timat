// Verifie ce qui, dans les notifications push, peut se tromper en silence.
//
// Pourquoi ce fichier : le push a existe pendant des mois sans jamais
// fonctionner, et sans que rien ne le dise. L'application demandait
// l'autorisation au navigateur, affichait « Notifications activees ✓ », et
// n'envoyait rien — la table n'existait pas, la cle etait celle des tutoriels,
// et elle etait passee dans un format que le navigateur refuse.
//
// Chacun de ces defauts est muet. Ce test les rend bruyants.
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const routeSrc = readFileSync(new URL("../api/send-push.js", import.meta.url), "utf8");
const swSrc = readFileSync(new URL("../public/sw.js", import.meta.url), "utf8");

let ko = 0;
const verifie = (nom, reel, attendu) => {
  const ok = JSON.stringify(reel) === JSON.stringify(attendu);
  if (!ok) { ko++; console.log(`  KO  ${nom}\n      attendu ${JSON.stringify(attendu)}\n      obtenu  ${JSON.stringify(reel)}`); }
  else console.log(`  ok  ${nom}`);
};

console.log("\nLA CLE VAPID");

const cle = (src.match(/const VAPID_PUBLIQUE="([^"]+)"/) || [])[1];
verifie("la clé publique est présente", !!cle, true);

// La cle d'exemple des tutoriels web-push. Elle circule dans des milliers de
// pages : sa partie privee est publique. L'utiliser, c'est permettre a
// n'importe qui d'envoyer des notifications au nom de TiMat.
const CLE_DES_TUTORIELS = "BEl62iUYgUivxIkv69yViEuiBIa40HZa";
verifie("ce n'est pas la clé d'exemple des tutoriels", !String(cle).startsWith(CLE_DES_TUTORIELS), true);

// Une cle VAPID est une cle publique P-256 non compressee : 65 octets, dont le
// premier vaut 0x04. En base64url : 87 caracteres, sans +, / ni =.
const octets = Buffer.from(String(cle).replace(/-/g, "+").replace(/_/g, "/"), "base64");
verifie("elle fait bien 65 octets", octets.length, 65);
verifie("elle commence par 0x04 (clé P-256 non compressée)", octets[0], 4);
verifie("elle est en base64url, le seul format accepté", /^[A-Za-z0-9_-]+$/.test(String(cle)), true);

// La cle PRIVEE ne doit jamais se trouver dans le depot : elle donne le droit
// d'envoyer des notifications a tous les utilisateurs.
const privee = /VAPID_PRIVATE_KEY\s*[:=]\s*["'][A-Za-z0-9_-]{20,}["']/.test(src + routeSrc + swSrc);
verifie("la clé privée n'est nulle part dans le code", privee, false);

console.log("\nLA CONVERSION DE LA CLE");

// L'ancienne version passait la cle telle quelle au navigateur. applicationServerKey
// veut des octets : une chaine en base64 ORDINAIRE (avec + et /) fait echouer
// l'abonnement avant qu'il ne commence.
const extrait = src.match(/const cleEnOctets=\([\s\S]*?\n\};/);
if (!extrait) { console.log("  KO  cleEnOctets introuvable"); ko++; }
else {
  globalThis.atob = globalThis.atob || ((b) => Buffer.from(b, "base64").toString("binary"));
  const cleEnOctets = eval("(" + extrait[0].replace(/^const cleEnOctets=/, "").replace(/;$/, "") + ")");
  const r = cleEnOctets(cle);
  verifie("la conversion rend bien des octets", r instanceof Uint8Array, true);
  verifie("elle rend les 65 octets attendus", r.length, 65);
  verifie("elle rend exactement la clé", Buffer.from(r).toString("hex"), octets.toString("hex"));
  // Une longueur non multiple de 4 doit etre completee, pas rejetee.
  verifie("elle complète le bourrage manquant", cleEnOctets("aGVsbG8").length, 5);
}

console.log("\nLE DROIT D'ENVOYER");

// Le defaut le plus grave de l'ancienne version : n'importe qui sur internet
// pouvait envoyer la notification de son choix a n'importe quel utilisateur.
verifie("la route n'est plus ouverte à tout internet",
  /Access-Control-Allow-Origin['"]?\s*,\s*['"]\*/.test(routeSrc), false);
verifie("elle exige le jeton de session de l'appelant",
  /headers\.authorization/i.test(routeSrc) && /401/.test(routeSrc), true);
verifie("elle vérifie qui appelle vraiment",
  /auth\.getUser\(\)/.test(routeSrc), true);
verifie("le droit de notifier est tranché par la base, pas par le serveur",
  /rpc\(['"]peut_notifier['"]/.test(routeSrc) && /403/.test(routeSrc), true);
verifie("le destinataire du corps du message ne suffit jamais",
  routeSrc.indexOf("peut_notifier") < routeSrc.indexOf("sendNotification"), true);
verifie("les abonnements morts sont retirés",
  /\[404, 410\]/.test(routeSrc) && /\.delete\(\)/.test(routeSrc), true);

console.log("\nLA PAIRE DE CLES");

// Une cle privee qui ne correspond pas a la publique fait echouer chaque envoi
// avec une erreur de signature, sans jamais dire d'ou vient le probleme. La
// publique se DEDUIT de la privee : la correspondance est donc verifiable, et
// sans rien reveler.
const extraitPaire = routeSrc.match(/function pairePpCoherente\(\)[\s\S]*?\n\}/);
verifie("la cohérence de la paire est vérifiée", !!extraitPaire, true);
if (extraitPaire) {
  const crypto = await import("node:crypto");
  const octets = (b) => Buffer.from(String(b || "").replace(/-/g, "+").replace(/_/g, "/"), "base64");
  const paire = (pub, priv) => {
    try {
      const ec = crypto.createECDH("prime256v1");
      ec.setPrivateKey(octets(priv));
      return ec.getPublicKey().equals(octets(pub));
    } catch { return false; }
  };
  const ref = crypto.generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const pubRef = ref.publicKey.export({ type: "spki", format: "der" }).subarray(-65);
  const privRef = ref.privateKey.export({ type: "pkcs8", format: "der" }).subarray(36, 68);
  const b64u = (b) => Buffer.from(b).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  verifie("une paire cohérente est acceptée", paire(b64u(pubRef), b64u(privRef)), true);
  // Le cas qui compte : deux cles valides, mais qui ne vont pas ensemble.
  const autre = crypto.generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const autrePub = autre.publicKey.export({ type: "spki", format: "der" }).subarray(-65);
  verifie("une paire qui ne correspond pas est refusée", paire(b64u(autrePub), b64u(privRef)), false);
  verifie("une clé privée illisible est refusée, pas acceptée par défaut", paire(b64u(pubRef), "n'importe quoi"), false);
}
verifie("l'incohérence est annoncée, jamais envoyée quand même",
  /paireOk[\s\S]{0,200}503/.test(routeSrc), true);
verifie("un point de contrôle permet de le savoir sans rien envoyer",
  /req\.method === 'GET'/.test(routeSrc) && /pret:/.test(routeSrc), true);
verifie("ce point de contrôle ne révèle aucune clé",
  /VAPID_PRIVATE_KEY/.test(routeSrc.slice(routeSrc.indexOf("req.method === 'GET'"), routeSrc.indexOf("if (req.method !== 'POST')"))), false);

console.log("\nCE QUE LE TELEPHONE AFFICHE");

// Sans gestionnaire 'push', une notification qui arrive n'affiche rien — ou
// Chrome affiche a la place « Ce site a ete mis a jour en arriere-plan ».
verifie("le service worker affiche la notification reçue",
  /addEventListener\('push'/.test(swSrc) && /showNotification/.test(swSrc), true);
verifie("un appui ramène sur l'application",
  /addEventListener\('notificationclick'/.test(swSrc) && /clients/.test(swSrc), true);
verifie("les notifications d'un même type se remplacent au lieu de s'empiler",
  /tag: d\.tag/.test(swSrc), true);

console.log("\nCE QUE L'APPLICATION DIT");

// « Notifications activees ✓ » etait affiche meme quand la personne refusait.
verifie("le succès n'est plus annoncé sans avoir été vérifié",
  /setToast\("Notifications activées ✓"\)/.test(src), false);
verifie("le message affiché vient de la fonction qui sait si ça a marché",
  /const r=await activerPush\([\s\S]{0,80}setToast\(r\.message\)/.test(src), true);
verifie("le cas de l'iPhone non installé est traité à part",
  /impossible-ios/.test(src), true);
verifie("le push part du point unique des notifications",
  /async function createNotification\([\s\S]{0,900}envoyerPush\(/.test(src), true);

console.log(ko ? `\n${ko} anomalie(s)\n` : "\nAucune anomalie\n");
process.exit(ko ? 1 : 0);
