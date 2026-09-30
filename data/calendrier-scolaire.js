// LE CALENDRIER SCOLAIRE, PAR ZONE, ET LES JOURS FERIES.
//
// Ce que remplace ce fichier : deux listes figees en 2024 (FERIES_2024 et
// VACANCES_2024). En septembre 2026, le calendrier de l'application
// n'affichait donc PLUS AUCUN jour ferie ni AUCUNE vacance — silencieusement,
// sans rien casser, sans rien dire. Et la ligne « Vacances scolaires … -
// Zone C » etait ecrite en dur : une assistante maternelle lyonnaise lisait
// les dates de Paris.
//
// Deux natures differentes, donc deux traitements :
//
// - Les JOURS FERIES se CALCULENT. Huit sont a date fixe, trois dependent de
//   Paques. Une fonction ne se perime pas : elle est juste pour toujours.
//
// - Les VACANCES SCOLAIRES ne se calculent pas : elles sont fixees par arrete
//   ministeriel, zone par zone, quelques annees a l'avance. Elles sont donc
//   recopiees ici depuis Legifrance, et une barriere d'audit previent avant
//   qu'elles ne s'epuisent — c'est ce qui manquait la derniere fois.
//
// Sources, verifiees le 30 septembre 2026 :
// - 2025-2026 : arrete du 7 decembre 2022 (JORFTEXT000046704476)
// - 2026-2027 : arrete du 22 octobre 2025 (JORFTEXT000052416058)
//
// Attention en recopiant : plusieurs sites de resume donnaient la zone C en
// vacances d'hiver 2026 au 14 fevrier. L'arrete dit le 21. C'est l'arrete qui
// fait foi.

// Les academies, pour que personne n'ait a savoir dans quelle « zone » elle est.
export const ACADEMIES_PAR_ZONE = {
  A: ["Besançon", "Bordeaux", "Clermont-Ferrand", "Dijon", "Grenoble", "Limoges", "Lyon", "Poitiers"],
  B: ["Aix-Marseille", "Amiens", "Lille", "Nancy-Metz", "Nantes", "Nice", "Normandie", "Orléans-Tours", "Reims", "Rennes", "Strasbourg"],
  C: ["Créteil", "Montpellier", "Paris", "Toulouse", "Versailles"],
};
export const ZONES = ["A", "B", "C"];

// « debut » est le depart en vacances (apres la classe), « reprise » le matin
// de la rentree. Le dernier jour de vacances est donc la veille de la reprise :
// on garde les deux dates de l'arrete telles quelles plutot que de recopier un
// calcul deja fait, pour pouvoir les comparer au texte sans reflechir.
export const VACANCES = {
  "2025-2026": {
    A: [
      { nom: "Toussaint",  debut: "2025-10-18", reprise: "2025-11-03" },
      { nom: "Noël",       debut: "2025-12-20", reprise: "2026-01-05" },
      { nom: "Hiver",      debut: "2026-02-07", reprise: "2026-02-23" },
      { nom: "Printemps",  debut: "2026-04-04", reprise: "2026-04-20" },
      { nom: "Été",        debut: "2026-07-04", reprise: "2026-09-01" },
    ],
    B: [
      { nom: "Toussaint",  debut: "2025-10-18", reprise: "2025-11-03" },
      { nom: "Noël",       debut: "2025-12-20", reprise: "2026-01-05" },
      { nom: "Hiver",      debut: "2026-02-14", reprise: "2026-03-02" },
      { nom: "Printemps",  debut: "2026-04-11", reprise: "2026-04-27" },
      { nom: "Été",        debut: "2026-07-04", reprise: "2026-09-01" },
    ],
    C: [
      { nom: "Toussaint",  debut: "2025-10-18", reprise: "2025-11-03" },
      { nom: "Noël",       debut: "2025-12-20", reprise: "2026-01-05" },
      { nom: "Hiver",      debut: "2026-02-21", reprise: "2026-03-09" },
      { nom: "Printemps",  debut: "2026-04-18", reprise: "2026-05-04" },
      { nom: "Été",        debut: "2026-07-04", reprise: "2026-09-01" },
    ],
  },
  "2026-2027": {
    A: [
      { nom: "Toussaint",  debut: "2026-10-17", reprise: "2026-11-02" },
      { nom: "Noël",       debut: "2026-12-19", reprise: "2027-01-04" },
      { nom: "Hiver",      debut: "2027-02-13", reprise: "2027-03-01" },
      { nom: "Printemps",  debut: "2027-04-10", reprise: "2027-04-26" },
      { nom: "Été",        debut: "2027-07-03", reprise: "2027-09-01" },
    ],
    B: [
      { nom: "Toussaint",  debut: "2026-10-17", reprise: "2026-11-02" },
      { nom: "Noël",       debut: "2026-12-19", reprise: "2027-01-04" },
      { nom: "Hiver",      debut: "2027-02-20", reprise: "2027-03-08" },
      { nom: "Printemps",  debut: "2027-04-17", reprise: "2027-05-03" },
      { nom: "Été",        debut: "2027-07-03", reprise: "2027-09-01" },
    ],
    C: [
      { nom: "Toussaint",  debut: "2026-10-17", reprise: "2026-11-02" },
      { nom: "Noël",       debut: "2026-12-19", reprise: "2027-01-04" },
      { nom: "Hiver",      debut: "2027-02-06", reprise: "2027-02-22" },
      { nom: "Printemps",  debut: "2027-04-03", reprise: "2027-04-19" },
      { nom: "Été",        debut: "2027-07-03", reprise: "2027-09-01" },
    ],
  },
};

// La derniere date couverte : la barriere d'audit s'en sert pour prevenir
// AVANT que le calendrier ne redevienne muet.
export const COUVERT_JUSQUAU = "2027-07-03";

export const ZONE_DEFAUT = "C";

const jour = (iso) => new Date(iso + "T12:00:00Z");
const isoDe = (d) => d.toISOString().slice(0, 10);

// L'annee scolaire d'une date : elle bascule au 1er aout, entre deux annees
// scolaires, jamais au milieu de l'une d'elles.
export const anneeScolaireDe = (iso) => {
  const a = Number(iso.slice(0, 4)), m = Number(iso.slice(5, 7));
  return m >= 8 ? `${a}-${a + 1}` : `${a - 1}-${a}`;
};

// La periode de vacances qui contient cette date, ou null.
export const vacancesDe = (iso, zone = ZONE_DEFAUT) => {
  const annee = VACANCES[anneeScolaireDe(iso)];
  if (!annee) return null;
  const liste = annee[zone] || annee[ZONE_DEFAUT];
  return liste.find((v) => iso >= v.debut && iso < v.reprise) || null;
};

// Toutes les periodes d'une annee scolaire, pour la zone donnee.
export const vacancesAnnee = (iso, zone = ZONE_DEFAUT) => {
  const annee = VACANCES[anneeScolaireDe(iso)];
  if (!annee) return [];
  return annee[zone] || annee[ZONE_DEFAUT];
};

// PAQUES — algorithme de Meeus/Jones/Butcher, gregorien. Il donne le dimanche
// de Paques pour n'importe quelle annee : c'est lui qui evite de recopier a la
// main trois dates par an jusqu'a la fin des temps.
export const paques = (annee) => {
  const a = annee % 19, b = Math.floor(annee / 100), c = annee % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mois = Math.floor((h + l - 7 * m + 114) / 31);
  const jourDuMois = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(annee, mois - 1, jourDuMois, 12));
};

const plus = (d, n) => new Date(d.getTime() + n * 86400000);

// Les onze jours feries francais (metropole), calcules, donc jamais perimes.
export const feriesDe = (annee) => {
  const p = paques(annee);
  return {
    [`${annee}-01-01`]: "🎆 Jour de l'An",
    [isoDe(plus(p, 1))]: "🐣 Lundi de Pâques",
    [`${annee}-05-01`]: "🌹 Fête du Travail",
    [`${annee}-05-08`]: "🕊️ Victoire 1945",
    [isoDe(plus(p, 39))]: "✝️ Ascension",
    [isoDe(plus(p, 50))]: "🕊️ Lundi de Pentecôte",
    [`${annee}-07-14`]: "🇫🇷 Fête Nationale",
    [`${annee}-08-15`]: "✨ Assomption",
    [`${annee}-11-01`]: "🕯️ Toussaint",
    [`${annee}-11-11`]: "🎖️ Armistice",
    [`${annee}-12-25`]: "🎄 Noël",
  };
};

// Le dernier jour de vacances : la veille de la reprise. Le calcul vit ici
// plutot que dans un ecran, parce qu'il y a exactement une bonne facon de le
// faire et qu'elle doit etre testee une seule fois.
export const finVacances = (v) => isoDe(plus(jour(v.reprise), -1));

export const estFerie = (iso) => feriesDe(Number(iso.slice(0, 4)))[iso] || null;

export { jour, isoDe };
