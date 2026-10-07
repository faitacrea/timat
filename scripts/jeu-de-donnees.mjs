// LE JEU DE DONNEES DU HARNAIS DE VERIFICATION.
//
// Les parcours en navigateur interceptent Supabase. Jusqu'ici ils renvoyaient un
// tableau vide pour presque toutes les tables — et c'est ce qui les rendait
// aveugles : une messagerie sans aucun echange n'affiche pas sa zone de saisie,
// une paie sans bulletin n'affiche pas son formulaire, et la section
// « Versements recus » ne rend rien du tout. Le parcours des formulaires a
// ainsi annonce deux fois « aucun formulaire ne casse » sur un defaut que l'on
// y avait place expres.
//
// Les colonnes ci-dessous sont celles de la vraie base, relevees dans
// information_schema, pas devinees depuis le code : une ligne au mauvais format
// ne s'affiche pas, et on retombe dans l'angle mort qu'on essaie de fermer.
//
// Un seul enfant, un seul contrat, une seule famille : le but n'est pas de
// simuler une annee d'activite mais de faire exister chaque ecran.

export const UID = "11111111-1111-4111-8111-111111111111"; // l'assistante maternelle
export const EID = "22222222-2222-4222-8222-222222222222"; // l'enfant
export const PID = "33333333-3333-4333-8333-333333333333"; // le parent employeur
export const CID = "44444444-4444-4444-8444-444444444444"; // le contrat

const jour = (recul = 0) => new Date(Date.now() - recul * 86400000).toISOString().slice(0, 10);
const MOIS = jour().slice(0, 7);
const ANNEE = Number(jour().slice(0, 4));

// Les lignes, table par table. Une fonction plutot qu'un objet figé : les dates
// doivent etre relatives au jour du controle, sinon les ecrans qui filtrent sur
// « ce mois-ci » se retrouvent vides en debut de mois suivant.
export const LIGNES = (role = "asmat") => ({
  // LES DEUX PARTIES, PAS UNE SEULE.
  //
  // Il n'y avait qu'un profil, rendu quel que soit l'identifiant demandé : le
  // contrat sortait donc avec la MÊME personne comme employeur et comme
  // salariée — « Le particulier employeur Marie Test » face à « Le salarié
  // Marie Test ». Tant que le harnais répond de travers, les contrôles
  // regardent un document qui n'existe pas.
  profiles: [
    {
      id: UID, email: "marie@test.fr", prenom: "Marie", nom: "Dupont", role: "asmat",
      code_postal: "94230", ville: "Cachan", adresse: "8 rue des Lilas",
      telephone: "0620000001", numero_agrement: "94-2026-001",
      subscription_status: "pro", subscription_end_date: null, is_admin: false,
    },
    {
      id: PID, email: "sophie@test.fr", prenom: "Sophie", nom: "Martin", role: "parent",
      code_postal: "94230", ville: "Cachan", adresse: "12 rue Étienne Dolet",
      telephone: "0620000002",
      subscription_status: "free", subscription_end_date: null, is_admin: false,
    },
  ],
  enfants: [{
    id: EID, asmat_id: UID, parent_id: PID, prenom: "Léo", nom: "Durand",
    naissance: "2023-03-01", emoji: "🦁", couleur: "#E4915F", actif: true, allergies: [],
  }],
  contrats: [{
    id: CID, enfant_id: EID, asmat_id: UID, parent_id: PID,
    debut: jour(300), fin: null, heures_hebdo: 40, semaines: 47, taux_horaire: 4.20,
    annee_complete: true, entretien: 3.92, repas: 5.00,
    jours: ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"], horaires: "07h30–17h30",
    signe_asmat: true, signe_parent: true,
    // SANS CE CHEMIN, LE BOUTON N'EXISTE PAS. L'ecran n'affiche « Mettre a jour
    // le PDF » que si un PDF a deja ete depose ; sinon il ecrit « le PDF est en
    // cours de preparation ». Le controle des documents ne pouvait donc jamais
    // atteindre le contrat.
    pdf_storage_path: UID + "/contrats/" + CID + ".pdf",
    signe_asmat_at: jour(10), signe_parent_at: jour(9),
  }],
  pointages: [
    { id: "p1", enfant_id: EID, asmat_id: UID, date: jour(1), arrivee: "07:35", depart: "17:40", total_minutes: 605, valide_parent: true, mode_pointage: "manuel" },
    { id: "p2", enfant_id: EID, asmat_id: UID, date: jour(2), arrivee: "07:30", depart: "17:30", total_minutes: 600, valide_parent: false, mode_pointage: "manuel" },
  ],
  transmissions: [
    { id: "t1", enfant_id: EID, auteur_id: UID, auteur_role: "asmat", date: jour(1), heure: "17:30", texte: "Bonne journée, bon appétit au déjeuner.", mood: "😊" },
    { id: "t2", enfant_id: EID, auteur_id: PID, auteur_role: "parent", date: jour(1), heure: "08:00", texte: "Nuit un peu courte.", mood: "😴" },
  ],
  repas: [{ id: "r1", enfant_id: EID, date: jour(1), dejeuner: "Purée de carottes", gouter: "Compote", biberon: "180 ml", notes: "", qualite: "bien" }],
  sommeil: [{ id: "s1", enfant_id: EID, date: jour(1), debut: "12:45", fin: "14:30", duree: "1h45", qualite: "bien" }],
  changes_couches: [{ id: "c1", enfant_id: EID, date: jour(1), heure: "10:15", type: "urines", note: "" }],
  croissance: [{ id: "g1", enfant_id: EID, date: jour(30), age_mois: 30, poids: 13.4, taille: 91 }],
  jalons: [{ id: "j1", enfant_id: EID, categorie: "motricité", texte: "Monte un escalier en alternant les pieds", age_attendu: "30 mois", acquis: false, acquis_at: null, source: "repères" }],
  versements: [{ id: "v1", asmat_id: UID, contrat_id: CID, enfant_id: EID, date: jour(5), montant: 742.56, mode: "virement", periode: MOIS, note: "", saisi_par: UID }],
  bulletins: [{
    id: "b1", contrat_id: CID, enfant_id: EID, asmat_id: UID, parent_id: PID,
    mois: MOIS, annee: ANNEE, heures_reelles: 172, jours_travailles: 21,
    salaire_brut: 962.5, salaire_net: 742.56, net_imposable: 760.1,
    cotisations_salariales: 219.94, cotisations_patronales: 0, entretien: 82.32,
    cout_employeur: 1044.82, envoye_au_parent: false,
  }],
  historique_mois: [{ id: "h1", enfant_id: EID, mois: MOIS, heures: 172, salaire_net: 742.56, indemnites_entretien: 82.32, indemnites_repas: 105, conges_acquis: 2.5, conges_pris: 0, source: "pointages", net_imposable: 760.1, jours_travailles: 21, abattement: 0 }],
  documents_meta: [{ id: "d1", asmat_id: UID, enfant_id: EID, categorie: "contrat", sous_type: "contrat_signe", nom: "Contrat Léo.pdf", taille: "182 ko", storage_path: "x/contrat.pdf", storage_url: "", partage: true }],
  autorisations: [{ id: "a1", enfant_id: EID, type: "photos", accordee: true, precisions: "", signature: "", signe_par: "parent", signe_le: new Date().toISOString() }],
  evenements: [{ id: "e1", asmat_id: UID, date: jour(3), type: "absence", texte: "Enfant malade", heures: 0, auteur_id: UID, enfant_id: EID }],
  messages_pmi: [{ id: "m1", asmat_id: UID, de: "PMI du Val-de-Marne", texte: "Visite de suivi à programmer.", email_from: "pmi@exemple.fr", lu: false, objet: "Visite de suivi", date_echange: jour(10), canal: "email" }],
  planning_periscolaire: [{ enfant_id: EID, semaine: { lundi: "periscolaire" }, vacances: {}, zone: "C", modifie_par: UID, demande: null }],
  notifications: [{ id: "n1", user_id: role === "parent" ? PID : UID, titre: "Pointage à valider", texte: "Une journée attend votre validation.", lu: false, created_at: new Date().toISOString() }],
});

// La reponse pour une table donnee. Les tables absentes rendent un tableau vide,
// comme avant : on n'invente pas de donnees qu'aucun ecran ne demande.
export const REPONSE = (table, role = "asmat") => LIGNES(role)[table] || [];

// La réponse pour une requête PostgREST réelle : on honore « id=eq.<x> » et
// « .single() ». Sans cela, toute vérification qui met deux personnes en
// présence lit deux fois la même.
export const REPONSE_URL = (url, entetes = {}, role = "asmat") => {
  const table = (String(url).match(/rest\/v1\/(?:rpc\/)?([a-z_]+)/) || [])[1];
  let lignes = REPONSE(table, role);
  for (const m of String(url).matchAll(/[?&]([a-z_]+)=eq\.([^&]+)/g)) {
    const [, champ, valeur] = m;
    const v = decodeURIComponent(valeur);
    const filtre = lignes.filter((l) => String(l[champ]) === v);
    // Un filtre qui ne garde rien vient souvent d'une colonne que le jeu de
    // données ne porte pas : on préfère ne pas vider la réponse à tort.
    if (filtre.length || lignes.some((l) => champ in l)) lignes = filtre;
  }
  const unSeul = /vnd\.pgrst\.object/.test(entetes["accept"] || entetes["Accept"] || "");
  return unSeul ? (lignes[0] ?? null) : lignes;
};
export default REPONSE;

// LE PIÈGE DU BUNDLE SANS CLÉ.
//
// « npm run build » construit sans VITE_SUPABASE_KEY. L'application est alors
// inbootable : chaque écran affiche « la session n'est pas ouverte ». Les
// contrôles navigateur, eux, continuent de chercher leurs boutons — et
// rapportent des KO qui n'existent pas. Ce piège a produit de faux résultats
// deux fois : la première en accusant du code sain, la seconde en lançant un
// build au milieu d'un parcours déjà commencé.
//
// Tout contrôle navigateur appelle ceci juste après avoir chargé la page. Il ne
// cherche pas un défaut de l'application : il refuse de rendre un verdict sur
// un bundle qu'on ne peut pas tester.
export const BUNDLE_TESTABLE = async (p) => {
  // On interroge le temoin pose par lib/supabase.js, et non le texte de la page :
  // sans cle, l'application retombe sur la page vitrine sans message d'erreur,
  // et c'est precisement ce qui rendait le piege invisible.
  const sansCle = await p.evaluate(() => !!window.__TIMAT_SANS_CLE).catch(() => false);
  if (sansCle) {
    console.error("\n  ARRÊT  le bundle servi sur le port 4173 a été construit SANS VITE_SUPABASE_KEY :");
    console.error("         l'application ne démarre pas, et tout KO rapporté ici serait faux.");
    console.error("         Reconstruis-le, puis relance ce contrôle :\n");
    console.error('           VITE_SUPABASE_KEY="verification-locale" npx vite build');
    console.error("           nohup npx vite preview --port 4173 --host 127.0.0.1 &\n");
    return false;
  }
  return true;
};
