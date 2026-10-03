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
  profiles: [{
    id: role === "parent" ? PID : UID, email: role === "parent" ? "sophie@test.fr" : "marie@test.fr",
    prenom: role === "parent" ? "Sophie" : "Marie", nom: "Test", role,
    code_postal: "94230", ville: "Cachan", telephone: "0620873380",
    subscription_status: "pro", subscription_end_date: null, is_admin: false,
  }],
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
export default REPONSE;
