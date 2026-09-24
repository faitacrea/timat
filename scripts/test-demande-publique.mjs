// On execute la route hors de Vercel, avec un faux fetch : on verifie le
// COMPORTEMENT, pas seulement que le fichier compile.
process.env.VITE_SUPABASE_URL = "https://exemple.supabase.co";
process.env.SUPABASE_SERVICE_KEY = "cle-de-test";
// Le chemin se calcule DEPUIS CE FICHIER, jamais depuis la racine de la
// machine. La premiere version importait « /home/user/timat/api/… » : le
// chemin absolu du bac a sable ou le test a ete ecrit. Il passait la, et
// nulle part ailleurs — Vercel deploie dans /vercel/path0, et la construction
// de production est tombee deux fois de suite.
const mod = await import(new URL("../api/demande-publique.js", import.meta.url).href);
const handler = mod.default;

let dernierInsert = null;
globalThis.fetch = async (url, opts = {}) => {
  if (String(url).includes("/profiles")) {
    const connu = String(url).includes("jeton-valide");
    return { ok: true, json: async () => (connu ? [{ id: "asmat-1" }] : []) };
  }
  if (String(url).includes("/demandes")) { dernierInsert = JSON.parse(opts.body); return { ok: true }; }
  return { ok: false };
};

const post = async (champs, jeton = "jeton-valide") => {
  const fd = new URLSearchParams({ j: jeton, ...champs });
  const r = await handler(new Request("https://www.timat.app/api/demande-publique", {
    method: "POST", body: fd,
    headers: { "content-type": "application/x-www-form-urlencoded" },
  }));
  return await r.text();
};

let ko = 0;
const ok = (quoi, cond) => { if (!cond) ko++; console.log(`  ${cond ? "ok " : "KO "} ${quoi}`); };

console.log("\n=== LE FORMULAIRE S'AFFICHE ===");
{
  const r = await handler(new Request("https://www.timat.app/api/demande-publique?j=peu-importe"));
  const h = await r.text();
  ok("la page rend un formulaire", h.includes("<form method=\"POST\">"));
  ok("elle ne dit RIEN sur l'assistante maternelle", !/Marie|Dupont|agr[ée]ment/i.test(h));
  ok("elle n'est pas indexable", h.includes('name="robots" content="noindex'));
}

console.log("\n=== CE QUI EST REFUSÉ ===");
{
  dernierInsert = null;
  ok("sans nom : refusé", (await post({ parent_email: "a@b.fr" })).includes("Votre nom est nécessaire"));
  ok("et rien n'est enregistré", dernierInsert === null);
  ok("sans e-mail NI téléphone : refusé", (await post({ parent_nom: "Camille" })).includes("au moins un e-mail ou un téléphone"));
  ok("et rien n'est enregistré", dernierInsert === null);
}

console.log("\n=== CE QUI EST ACCEPTÉ ===");
{
  dernierInsert = null;
  const h = await post({ parent_nom: "Camille Moreau", parent_tel: "0612345678", enfant_prenom: "Chloé", message: "Bonjour" });
  ok("le téléphone seul suffit", h.includes("Votre demande est partie"));
  ok("la demande est enregistrée", dernierInsert && dernierInsert.parent_nom === "Camille Moreau");
  ok("elle est rattachée à la bonne assmat", dernierInsert.asmat_id === "asmat-1");
  ok("le statut part à « nouveau »", dernierInsert.statut === "nouveau");
}

console.log("\n=== UN JETON INCONNU NE SE TRAHIT PAS ===");
{
  dernierInsert = null;
  const h = await post({ parent_nom: "Sonde", parent_tel: "06" }, "jeton-inconnu");
  ok("la même page de confirmation qu'un succès", h.includes("Votre demande est partie"));
  ok("mais rien n'est enregistré", dernierInsert === null);
}

console.log("\n=== LES DATES ABSURDES DEVIENNENT NULL ===");
{
  await post({ parent_nom: "A", parent_tel: "06", enfant_naissance: "0000-00-00", debut_souhaite: "pas-une-date" });
  ok("une date illisible ne part pas en base", dernierInsert.enfant_naissance === null);
  ok("une date non ISO non plus", dernierInsert.debut_souhaite === null);
  await post({ parent_nom: "A", parent_tel: "06", enfant_naissance: "2024-03-15" });
  ok("une date valide passe", dernierInsert.enfant_naissance === "2024-03-15");
}

console.log("\n=== LES CHAMPS SONT BORNÉS ===");
{
  await post({ parent_nom: "N".repeat(500), parent_tel: "06", message: "M".repeat(9000) });
  ok("le nom est coupé à 80", dernierInsert.parent_nom.length === 80);
  ok("le message est coupé à 2000", dernierInsert.message.length === 2000);
}

console.log("\n=== L'ÉCHAPPEMENT ===");
{
  const h = await post({ parent_nom: "", parent_email: "\"><script>alert(1)</script>" });
  ok("le HTML injecté ne ressort pas tel quel", !h.includes("<script>alert(1)"));
}

console.log(ko ? `\n${ko} échec(s).` : "\nTout est conforme.");
process.exit(ko ? 1 : 0);
