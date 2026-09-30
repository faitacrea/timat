// TRANSMISSION D'UNE DECLARATION PAJEMPLOI A L'URSSAF.
//
// POURQUOI CE FICHIER EST DANS lib/ ET NON DANS api/.
//
// Le forfait Vercel Hobby n'autorise que DOUZE fonctions serverless par
// deploiement, et le projet en compte deja douze. En faire une treizieme
// casserait le deploiement — pour une fonction qui ne peut de toute facon rien
// transmettre tant que l'habilitation n'est pas obtenue.
//
// La logique vit donc ici, complete et testee. Le jour de l'habilitation, il
// suffira de creer api/pajemploi-transmettre.js qui appelle transmettre(), et
// de liberer une place parmi les douze — en fusionnant deux petites routes, en
// passant l'une d'elles en « edge » (elles ne comptent pas dans la limite,
// mais s'executent hors de France : a ne pas faire pour une route qui traite
// des donnees personnelles), ou en passant au forfait Pro.
//
// ETAT : incomplet, et volontairement. La specification de l'API Tierce
// declaration Pajemploi n'est remise qu'apres signature de la licence d'usage
// avec l'URSSAF. Tant qu'elle n'est pas en main, les adresses, les formats de
// charge utile et les codes de reponse ne sont pas connus.
//
// Ecrire un appel « probable » serait inventer une integration : elle
// compilerait, elle passerait les tests, et elle echouerait le jour ou elle
// servirait vraiment. Ce fichier construit donc tout ce qui ne depend PAS de
// la specification — verification du mandat, secret qui ne quitte pas le
// serveur, journal, gestion de l'echec — et refuse proprement a l'endroit
// exact ou la specification manque.
//
// CE QU'IL RESTE A FAIRE, quand la licence sera signee :
//   1. Remplacer obtenirJeton() par le vrai point d'acces OAuth2.
//   2. Remplacer envoyerDeclaration() par le vrai appel et son format.
//   3. Traduire les codes de reponse de l'URSSAF vers nos statuts
//      (transmise / refusee), en gardant le motif tel qu'il l'ecrit.
// Rien d'autre ne devrait bouger.

import { createClient } from "@supabase/supabase-js";

// Le secret client de l'URSSAF ne doit JAMAIS partir vers le navigateur. Ce
// fichier est une fonction serveur : il est le seul endroit ou il est lu, et
// aucune valeur qui en derive n'est renvoyee au client.
const CLIENT_ID = process.env.PAJEMPLOI_CLIENT_ID;
const CLIENT_SECRET = process.env.PAJEMPLOI_CLIENT_SECRET;

const json = (res, code, corps) => res.status(code).json(corps);

// --- la partie qui attend la specification ------------------------------
const SPEC_MANQUANTE = {
  erreur: "integration_incomplete",
  message: "La transmission directe à l'URSSAF n'est pas encore active.",
};

async function obtenirJeton() {
  // OAuth2 Client Credentials. Le point d'acces exact est fourni avec la
  // licence : tant qu'on ne l'a pas, on ne devine pas.
  throw new Error("spec_absente");
}

async function envoyerDeclaration(/* jeton, charge */) {
  throw new Error("spec_absente");
}
// ------------------------------------------------------------------------

export async function transmettre(req, res) {
  if (req.method !== "POST") return json(res, 405, { erreur: "methode" });

  // 1. L'habilitation est-elle seulement configuree ? Sans identifiant client,
  //    il n'y a rien a tenter, et le dire franchement vaut mieux qu'un echec
  //    reseau incomprehensible.
  if (!CLIENT_ID || !CLIENT_SECRET) return json(res, 503, SPEC_MANQUANTE);

  const { enfant_id, mois, jeton_utilisateur } = req.body || {};
  if (!enfant_id || !mois || !jeton_utilisateur) return json(res, 400, { erreur: "parametres" });

  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) return json(res, 500, { erreur: "configuration" });

  // 2. Qui demande ? On lit l'utilisateur depuis SON jeton, jamais depuis le
  //    corps de la requete : un identifiant envoye par le client se falsifie.
  const commeUtilisateur = createClient(url, process.env.VITE_SUPABASE_KEY, {
    global: { headers: { Authorization: `Bearer ${jeton_utilisateur}` } },
  });
  const { data: auth, error: eAuth } = await commeUtilisateur.auth.getUser();
  if (eAuth || !auth?.user) return json(res, 401, { erreur: "non_authentifie" });

  const admin = createClient(url, service);

  // 3. Le mandat existe-t-il, est-il actif, et couvre-t-il CET enfant ?
  //    La question se pose ici, cote serveur, meme si l'ecran l'a deja posee :
  //    un client peut appeler cette route directement.
  const { data: mandat, error: eMandat } = await admin
    .from("mandats_pajemploi")
    .select("id, parent_id, asmat_id, version_texte, revoque_le")
    .eq("enfant_id", enfant_id)
    .is("revoque_le", null)
    .maybeSingle();
  if (eMandat) return json(res, 500, { erreur: "lecture_mandat" });
  if (!mandat) return json(res, 403, { erreur: "pas_de_mandat",
    message: "Le parent employeur n'a pas donné son mandat, ou l'a retiré." });

  // 4. Le demandeur est-il partie au contrat ? Le mandat d'un enfant ne donne
  //    aucun droit sur celui d'un autre.
  if (auth.user.id !== mandat.parent_id && auth.user.id !== mandat.asmat_id)
    return json(res, 403, { erreur: "hors_contrat" });

  // 5. Ce mois est-il deja parti ? Declarer deux fois est une erreur couteuse,
  //    et c'est au serveur de l'empecher : deux onglets ouverts suffiraient.
  const { data: deja, error: eDeja } = await admin
    .from("transmissions_pajemploi")
    .select("id, statut, accuse")
    .eq("enfant_id", enfant_id).eq("mois", mois)
    .in("statut", ["en_attente", "transmise"])
    .maybeSingle();
  if (eDeja) return json(res, 500, { erreur: "lecture_journal" });
  if (deja) return json(res, 409, { erreur: "deja_transmis", accuse: deja.accuse });

  // 6. On ouvre la ligne du journal AVANT d'envoyer. Si le serveur tombe entre
  //    l'envoi et l'ecriture, il reste une trace « en_attente » — ce qui est la
  //    verite : on ne sait pas. L'inverse (ecrire apres) laisserait une
  //    declaration partie sans aucune trace.
  const { data: ligne, error: eLigne } = await admin
    .from("transmissions_pajemploi")
    .insert({ enfant_id, mois, mandat_id: mandat.id, statut: "en_attente" })
    .select("id").single();
  if (eLigne) return json(res, 500, { erreur: "journal" });

  try {
    const jeton = await obtenirJeton();
    const reponse = await envoyerDeclaration(jeton);
    await admin.from("transmissions_pajemploi")
      .update({ statut: "transmise", accuse: reponse.accuse, repondu_le: new Date().toISOString() })
      .eq("id", ligne.id);
    return json(res, 200, { statut: "transmise", accuse: reponse.accuse });
  } catch (e) {
    // « erreur » et non « refusee » : rien n'est parti. La distinction n'est
    // pas cosmetique — elle decide si l'utilisateur doit renvoyer ou corriger.
    await admin.from("transmissions_pajemploi")
      .update({ statut: "erreur", message: e?.message === "spec_absente"
        ? "Transmission directe pas encore active." : "L'envoi n'a pas abouti.",
        repondu_le: new Date().toISOString() })
      .eq("id", ligne.id);
    return json(res, 503, SPEC_MANQUANTE);
  }
}
