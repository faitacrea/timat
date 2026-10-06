// LE REGISTRE DES TABLES, ET CE QUE CHACUNE CONTIENT.
//
// Pourquoi ce fichier existe : l'export RGPD annonce « droit à la portabilité
// (article 20) » et ne couvrait que dix-neuf tables sur les cinquante que
// l'application écrit. Manquaient, entre autres, les bulletins de salaire, les
// versements reçus, les autorisations signées, le registre des médicaments et
// la fiche d'urgence — ces deux dernières portent des données de santé.
//
// Aucune n'était hors de portée : toutes ont un lien vers l'utilisateur,
// l'enfant ou le contrat. Elles avaient simplement été oubliées au fil des
// ajouts, et rien ne le signalait. C'est le défaut que ce registre ferme : une
// table nouvelle doit être rangée ici, et l'audit refuse qu'une table écrite
// par l'application n'y figure pas.
//
// « exportee » : ses lignes appartiennent à quelqu'un, et partent dans l'export
//                — et elles sont effacées avec le compte.
// « exportee+conservee : … » : exportée, mais gardée après la suppression du
//                compte, pour une raison que la politique annonce déjà.
// « exclue : … » : elle n'appartient à personne — et il faut dire pourquoi.
//
// Ce registre sert aussi à la suppression : l'audit exige que toute table
// « exportee » soit effacée par delete_user_account. Neuf y manquaient, dont
// les autorisations signées, le registre des médicaments et le mandat
// Pajemploi — voir sql/2026-10-05-suppression-compte-complete.sql.
export const TABLES = {
  // --- Ce qui appartient à l'utilisatrice, et part dans l'export -------------
  profiles: "exportee",
  enfants: "exportee",
  contrats: "exportee",
  modifications_contrat: "exportee",
  pointages: "exportee",
  transmissions: "exportee",
  bilans: "exportee",
  absences: "exportee",
  vaccins: "exportee",
  croissance: "exportee",
  sommeil: "exportee",
  repas: "exportee",
  changes_couches: "exportee",
  portfolio: "exportee",
  jalons: "exportee",
  paiements: "exportee",
  messages: "exportee",
  documents_meta: "exportee",
  audit_log: "exportee+conservee : journaux de connexion, 12 mois (sécurité). Annoncé au § 4 de la politique.",
  bulletins: "exportee",
  versements: "exportee",
  historique_mois: "exportee",
  autorisations: "exportee",
  medicaments: "exportee",
  fiche_urgence: "exportee",
  planning_periscolaire: "exportee",
  cahier_jour: "exportee",
  activites_faites: "exportee",
  trajets: "exportee",
  evenements: "exportee",
  projet_accueil: "exportee",
  activites_perso: "exportee",
  messages_pmi: "exportee",
  demandes: "exportee",
  invitations: "exportee",
  contestations_pointage: "exportee",
  declarations_pajemploi: "exportee",
  transmissions_pajemploi: "exportee",
  mandats_pajemploi: "exportee",
  consentements: "exportee",
  notifications: "exportee",
  support_messages: "exportee+conservee : 2 ans, le temps du suivi de la demande. Annoncé au § 4.",
  achats_boutique: "exportee+conservee : 10 ans, obligation comptable (code de commerce, art. L123-22). Annoncé au § 4.",

  // --- Ce qui n'appartient à personne, et pourquoi ---------------------------
  app_config: "exclue : les réglages du site, écrits au back-office. Ils ne décrivent aucune personne.",
  app_config_backup: "exclue : sauvegarde des mêmes réglages.",
  app_config_sauvegarde: "exclue : sauvegarde des mêmes réglages.",
  seo_audit_history: "exclue : relevé technique du référencement du site.",
  borne_tentatives: "exclue : compteur anti-abus d'une borne de pointage, rattaché à un appareil et non à un compte.",
  push_subscriptions: "exclue : jeton technique d'un navigateur pour les notifications. Il ne décrit pas la personne et se révoque en désactivant les notifications.",
  prospects: "exclue : adresses laissées sur la page publique par des personnes qui n'ont pas de compte. Une demande d'accès s'y traite à la main, par courriel.",
};

export default TABLES;
