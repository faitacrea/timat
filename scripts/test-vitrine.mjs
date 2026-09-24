// La page vitrine publique : on execute la route avec un faux fetch, et on
// verifie le COMPORTEMENT — pas seulement que le fichier compile.
//
// Ce qui est teste ici a ete choisi pour ce qui COUTE si ca casse : une donnee
// privee qui sort, une page qui reste en ligne apres avoir ete depubliee, une
// presentation qui laisse passer du HTML.
process.env.VITE_SUPABASE_URL = "https://exemple.supabase.co";
process.env.SUPABASE_SERVICE_KEY = "cle-de-test";

// Le chemin se calcule DEPUIS CE FICHIER, jamais depuis la racine de la
// machine : un chemin absolu ne vaut que sur l'ordinateur qui l'a ecrit, et la
// construction de production tombe dessus.
const mod = await import(new URL("../api/vitrine.js", import.meta.url).href);
const handler = mod.default;

let derniereRequete = null;
const profilDeBase = {
  vitrine_active: true, vitrine_indexable: false,
  vitrine_titre: "Sophie M., assistante maternelle",
  vitrine_commune: "Toulouse (31)",
  vitrine_presentation: "J'accueille chez moi.\n\nDeux paragraphes.",
  vitrine_places: "1 place", vitrine_disponibilite: "Dès janvier",
  vitrine_horaires: "7h30 – 18h30",
  vitrine_atouts: "Jardin clos\nRepas maison",
  vitrine_tel: "06 12 34 56 78", vitrine_email: "sophie@exemple.fr",
  vitrine_maj: "2026-09-01T10:00:00Z", jeton_demandes: "jeton-abc",
};
let profil = { ...profilDeBase };

globalThis.fetch = async (url) => {
  derniereRequete = String(url);
  return { ok: true, json: async () => (profil ? [profil] : []) };
};

const appeler = (slug) => handler(new Request("https://www.timat.app/api/vitrine?a=" + slug));

let echecs = 0;
const verifie = (nom, condition) => {
  console.log(`  ${condition ? "ok " : "ÉCHEC"}  ${nom}`);
  if (!condition) echecs++;
};

console.log("\n=== CE QUI DOIT S'AFFICHER ===");
let html = await (await appeler("sophie-m")).text();
verifie("le titre qu'elle a ecrit", html.includes("Sophie M., assistante maternelle"));
verifie("la commune", html.includes("Toulouse (31)"));
verifie("les deux paragraphes restent deux paragraphes", (html.match(/<p>J&#39;accueille|<p>Deux paragraphes/g) || []).length === 2);
verifie("les atouts deviennent une liste", html.includes("<li>Jardin clos</li>"));
verifie("le bouton mene au formulaire de demande", html.includes('href="/d/jeton-abc"'));

console.log("\n=== CE QUI NE DOIT JAMAIS SORTIR ===");
verifie("la requete ne demande pas l'adresse du domicile", !/[?&]select=[^&]*\badresse\b/.test(derniereRequete));
verifie("la requete ne demande ni nom ni prenom du profil", !/[?&]select=[^&]*(^|,)(nom|prenom)(,|$)/.test(derniereRequete));
verifie("la requete ne demande pas le numero d'agrement", !derniereRequete.includes("numero_agrement"));
verifie("la requete n'utilise pas le joker *", !/select=\*/.test(derniereRequete));

console.log("\n=== DÉPUBLIER DOIT VRAIMENT DÉPUBLIER ===");
profil = { ...profilDeBase, vitrine_active: false };
html = await (await appeler("sophie-m")).text();
verifie("la page depubliee ne montre plus le titre", !html.includes("Sophie M."));
verifie("elle ne montre plus le telephone", !html.includes("06 12 34 56 78"));
verifie("elle rend la page « introuvable »", html.includes("Cette page n&#39;existe pas"));

profil = null;
const inconnue = await (await appeler("nexiste-pas")).text();
verifie("adresse inconnue et vitrine depubliee rendent la MEME page", inconnue === html);

console.log("\n=== L'INDEXATION EST UN CHOIX ===");
profil = { ...profilDeBase };
html = await (await appeler("sophie-m")).text();
verifie("par defaut, la page n'est pas indexee", html.includes('content="noindex,nofollow"'));
profil = { ...profilDeBase, vitrine_indexable: true };
html = await (await appeler("sophie-m")).text();
verifie("indexable quand elle l'a demande", html.includes('content="index,follow"'));

console.log("\n=== L'ÉCHAPPEMENT ===");
profil = {
  ...profilDeBase,
  vitrine_titre: '"><script>alert(1)</script>',
  vitrine_presentation: "<img src=x onerror=alert(1)>",
  vitrine_atouts: "<b>gras</b>",
};
html = await (await appeler("sophie-m")).text();
verifie("aucune balise script n'est rendue", !html.includes("<script>"));
verifie("le HTML de la presentation ne ressort pas tel quel", !html.includes("<img src=x"));
verifie("le HTML d'un atout ne ressort pas tel quel", !html.includes("<b>gras</b>"));

console.log("\n=== LA FORME DE L'ADRESSE ===");
derniereRequete = null;
profil = { ...profilDeBase };
await appeler("Sophie_M!");
verifie("une adresse mal formee n'interroge meme pas la base", derniereRequete === null);
await appeler("ab");
verifie("une adresse trop courte non plus", derniereRequete === null);
await appeler("sophie-m");
verifie("une adresse valide, elle, interroge la base", derniereRequete !== null);

console.log(echecs ? `\n${echecs} vérification(s) en échec.\n` : "\nTout est conforme.\n");
process.exit(echecs ? 1 : 0);
