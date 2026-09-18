// ============================================================
// SOCLE PARTAGÉ — hors du morceau d'entrée
// ------------------------------------------------------------
// Soixante-sept déclarations que SEULS les morceaux paresseux
// utilisent : barèmes, jeux de données de démonstration,
// helpers PDF, la génération du contrat signé, le pavé de
// signature, la suppression de compte.
//
// Elles vivaient dans App.jsx, qui est le point d'entrée : 58 Ko
// de source que chaque visiteuse de la landing téléchargeait,
// analysait et compilait sans jamais s'en servir. Sous le
// bridage de Lighthouse, c'est du temps de fil principal bloqué,
// donc du TBT.
//
// Le retour vers App.jsx reste : ce bloc s'appuie sur des
// constantes et des composants que la landing utilise aussi, et
// qui doivent donc rester dans le morceau principal.
// ============================================================
import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase.js";
import {
  ALLOC_FORMATION_H, ALLOC_FORMATION_PLAFOND_H, ANCIENNETE_MIN_RUPTURE_MOIS, BORNE_CLE_ACTIVE, BORNE_CLE_EMPREINTES, BORNE_CLE_SORTIE, CLE_HL, COEF_MINIMUM_LEGAL, CP_MAX_AN, CP_PAR_MOIS, D, DIVISEUR_INDEMNITE_RUPTURE, DOCUMENTS_REFONTE, Documents, G, IE_PLANCHER_JOUR, IE_TAUX_HORAIRE, IconeOuEmoji, InstallGuide, JETON_BORNE_ALPHABET, MAJORATION_TITRE_AMGE, MINIMUM_CONV_HISTO, Parametres, Parrainage, Pointage, QUOTAS, Sommeil, TAUX_COTISATIONS, TAUX_DIXIEME, TAUX_SALARIAL_TOTAL, TODAY_STR, VACANCES_2024, _ecrireJSON, _lireJSON, enMo, estPro, fmt, isoJour, isoMois, lireQuota, logAction, minutesDepuisHeure, nbf, quotaDe, salaireMensualise, smicHoraireAu, unionMinutes, useInstallPWA, viderStockageDuCompte
} from "./App.jsx";

export const fmtDateHeureCourte=(iso)=>{
  const d=new Date(iso);
  if(isNaN(d))return String(iso||"");
  return d.toLocaleDateString("fr-FR",{day:"numeric",month:"long"})+" à "+d.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"});
};

// Regle unique du mot de passe. Elle doit rester alignee sur le reglage
// Supabase (8 caracteres minimum, lettres et chiffres requis) : sans ce point
// de passage unique, l'application acceptait 6 caracteres puis le serveur
// refusait avec un message en anglais.


export const QUALITE_SIESTE={
  bien:{l:"Bonne sieste",court:"Bonne",teinte:"var(--S)",fond:"var(--Sp)"},
  agite:{l:"Agitée",court:"Agitée",teinte:"var(--P)",fond:"var(--Pp)"},
  court:{l:"Courte",court:"Courte",teinte:"var(--R)",fond:"var(--Rp)"},
};

export const RETENUE_TYPES={mal:true,fer:true,form:false,formh:false,cng:false,rdv:false,sor:false,abs:false};

// Allocation de formation de l'assistante maternelle.
// Elle ne concerne QUE les heures de formation suivies hors du temps d'accueil :
// sur le temps d'accueil, c'est le salaire qui est maintenu. Ce n'est pas une
// ligne de bulletin — elle est versee par IPERIA a l'issue du parcours, pas par
// le particulier employeur. L'application ne fait donc que l'estimer.
// Montant : 5,57 EUR nets par heure depuis le 1er avril 2025 (forfait, et non
// un pourcentage du salaire : ce pourcentage vaut pour la branche des salaries
// du particulier employeur, pas pour les assistants maternels).
// Types qui demandent un nombre d'heures a la saisie. Ce n'est pas la meme
// liste que RETENUE_TYPES : une formation se compte en heures sans donner lieu
// a retenue.

export const HEURES_TYPES={mal:true,fer:true,form:true,formh:true};

export const allocationFormation = (heures) => {
  const h = Math.max(0, Number(heures) || 0);
  return Math.round(Math.min(h, ALLOC_FORMATION_PLAFOND_H) * ALLOC_FORMATION_H * 100) / 100;
};

export const retenueAbsence=({salaireMensualise=0,anneeComplete=true,heuresAbsence=0,heuresMois=0,joursAbsence=0,joursMois=0})=>{
  const base=Number(salaireMensualise)||0;
  if(base<=0)return 0;
  const ratio=anneeComplete
    ? (heuresMois>0?heuresAbsence/heuresMois:0)
    : (joursMois>0?joursAbsence/joursMois:0);
  if(!(ratio>0))return 0;
  return Math.round(base*Math.min(ratio,1)*100)/100;
};

// Ce que chaque role peut ajouter au calendrier. Cote parent, les themes qui
// portent un « motif » ouvrent le formulaire d'absence : lui seul compte les
// heures et previent l'assistante maternelle.

export const THEMES_CAL={
  asmat:[
    {t:"mal",l:"Maladie",aide:"Vous êtes malade et n'accueillez pas",paie:"retenue"},
    {t:"fer",aide:"Journée sans accueil de votre fait",paie:"retenue"},
    {t:"form",aide:"Sur vos heures d'accueil — salaire maintenu",paie:"maintien"},
    {t:"formh",aide:"En dehors de vos heures — allocation de formation",paie:"allocation"},
    {t:"cng",aide:"Vos congés"},
    {t:"rdv",aide:"Réunion, visite PMI, rendez-vous"},
    {t:"sor",aide:"Sortie avec les enfants"},
  ],
  parent:[
    {t:"mal",motif:"Maladie",aide:"Votre enfant est malade"},
    {t:"cng",motif:"Congés parents",aide:"Vous gardez votre enfant"},
    {t:"abs",motif:"Rendez-vous médical",l:"Rendez-vous médical",ic:"🏥",aide:"Absence pour un rendez-vous"},
    {t:"abs",motif:"Autre",l:"Autre absence",aide:"Une autre raison"},
    {t:"rdv",aide:"Un rendez-vous à noter, sans absence"},
  ],
};

export const brutDepuisNet = (net) => {
  const n = Number(net) || 0;
  return n > 0 ? Math.round((n / (1 - TAUX_SALARIAL_TOTAL)) * 100) / 100 : 0;
};

// DUREE DU TRAVAIL, TOUS EMPLOYEURS CONFONDUS.
//
// Une assistante maternelle accueille les enfants de plusieurs familles a la
// fois. Chaque parent ne voit que SON contrat, et ne peut donc pas savoir si la
// professionnelle depasse les plafonds legaux — c'est pourtant a elle que la
// loi impose de les respecter, et a elle d'informer chaque employeur de ses
// autres emplois.
//
// Le piege est dans le comptage. Additionner les heures de chaque contrat donne
// un total faux : le temps de travail se compte du point de vue du SALARIE.
// Deux enfants presents de 8 h a 17 h, cela fait neuf heures de travail, pas
// dix-huit. Il faut donc reunir les intervalles de presence, pas les empiler.
//
// Sources : 2 250 h/an tous employeurs confondus (art. L. 423-22 du code de
// l'action sociale et des familles) ; 48 h par semaine en moyenne sur quatre
// mois ; amplitude journaliere de 13 h au plus (art. 110 de la CCN 3239).

export const PLAFOND_ANNUEL_HEURES = 2250;

export const PLAFOND_HEBDO_HEURES = 48;

export const PLAFOND_AMPLITUDE_JOUR = 13;
// Les écrans que le routeur ouvre vivent dans src/ecrans-app.jsx :
// la landing n'a aucune raison de les télécharger.

export const journeesTravaillees = (pointages) => {
  const parJour = {};
  for (const p of pointages || []) {
    const jour = String(p?.date || "").slice(0, 10);
    const a = minutesDepuisHeure(p?.arrivee), b = minutesDepuisHeure(p?.depart);
    if (!jour || a === null || b === null || b <= a) continue;
    (parJour[jour] = parJour[jour] || { intervalles: [], enfants: new Set() });
    parJour[jour].intervalles.push([a, b]);
    if (p.enfant_id) parJour[jour].enfants.add(p.enfant_id);
  }
  const out = {};
  for (const [jour, d] of Object.entries(parJour)) {
    const minutes = unionMinutes(d.intervalles);
    const amplitude = Math.max(...d.intervalles.map((i) => i[1])) - Math.min(...d.intervalles.map((i) => i[0]));
    out[jour] = { minutes, amplitude, enfants: d.enfants.size };
  }
  return out;
};

export const heuresDepuisMinutes = (m) => Math.round(((Number(m) || 0) / 60) * 10) / 10;

// Cinq journees d'accueil par semaine : l'hypothese par defaut des
// simulateurs, faute d'un calendrier reel.

export const JOURS_SEMAINE_TYPE = 5;

export const indemniteEntretienMin = (heures) =>
  Math.max(IE_PLANCHER_JOUR, Math.round(IE_TAUX_HORAIRE * (Number(heures) || 0) * 100) / 100);

// Credit d'impot pour frais de garde hors domicile (CGI art. 200 quater B) :
// 50 % des depenses, dans la limite de 3 500 EUR de DEPENSES par enfant de
// moins de six ans. Le plafond porte donc sur les depenses, pas sur le credit :
// le credit lui-meme ne peut pas depasser 1 750 EUR par an et par enfant.

export const nb2=(n)=>nbf(n,2);

export const nb3=(n)=>nbf(n,3);

export const fmtMoisLong=(mois)=>{
  const[a,m]=String(mois||"").split("-").map(Number);
  if(!a||!m)return String(mois||"");
  const noms=["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
  return (noms[m-1]||"")+" "+a;
};

export const decalerMois=(mois,pas)=>{
  const[a,m]=String(mois||"").split("-").map(Number);
  if(!a||!m)return isoMois(new Date());
  const t=(a*12+(m-1))+pas;
  return String(Math.floor(t/12))+"-"+String((t%12)+1).padStart(2,"0");
};

// Dates du jeu de demonstration. Elles etaient figees en 2024 : en 2026, la
// demonstration publique de la page d'accueil montrait donc des contrats
// expires depuis deux ans et des « prochains evenements » deja passes. Elles
// sont desormais calculees a partir du jour ou la page est ouverte.

export function GestionStockage({ user }) {
  const [q, setQ] = useState(null);
  const [anciens, setAnciens] = useState(null);
  const [bucket, setBucket] = useState("photos");
  const [occupe, setOccupe] = useState(false);
  const lim = quotaDe(user);
  const pro = estPro(user);

  const rafraichir = async () => { setQ(await lireQuota()); };
  useEffect(() => { rafraichir(); }, []);

  const listerAnciens = async (b) => {
    setBucket(b); setAnciens(null);
    const { data, error } = await supabase.rpc("fichiers_anciens", { p_bucket: b, p_limite: 10 });
    setAnciens(error ? [] : (data || []));
  };

  const supprimer = async (chemin) => {
    if (!window.confirm("Supprimer définitivement ce fichier ?")) return;
    setOccupe(true);
    const { error } = await supabase.storage.from(bucket).remove([chemin]);
    setOccupe(false);
    if (error) { alert("Suppression impossible : " + error.message); return; }
    setAnciens((a) => (a || []).filter((f) => f.chemin !== chemin));
    rafraichir();
  };

  const barre = (part, plafond) => {
    const pct = plafond === Infinity ? 0 : Math.min(100, Math.round((part / plafond) * 100));
    const chaud = pct >= 90;
    return <div style={{ height: 7, background: "var(--br)", borderRadius: 99, overflow: "hidden", margin: "6px 0 2px" }}>
      <div style={{ width: pct + "%", height: "100%", borderRadius: 99, background: chaud ? "var(--R)" : "var(--G)", transition: "width .3s" }}/>
    </div>;
  };

  return <div className="card">
    <div style={{ fontWeight: 700, fontSize: 14, color: "var(--b)", marginBottom: 14 }}><IconeOuEmoji e="💾"/> Espace de stockage</div>
    {!q ? <div style={{ fontSize: 12.5, color: "var(--l)" }}>Mesure en cours…</div> : <>
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: "var(--b)" }}>
          <span><IconeOuEmoji e="📷"/> Photos</span>
          <span style={{ fontWeight: 700 }}>{q.photosNb}{lim.photos === Infinity ? " — sans limite" : " / " + lim.photos}</span>
        </div>
        {barre(q.photosNb, lim.photos)}
        {lim.photos !== Infinity && q.photosNb >= lim.photos &&
          <div style={{ fontSize: 11.5, color: "var(--R)", marginTop: 4 }}>Limite atteinte : supprimez des photos ou passez au Pro.</div>}
      </div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: "var(--b)" }}>
          <span><IconeOuEmoji e="🗂️"/> Documents</span>
          <span style={{ fontWeight: 700 }}>{enMo(q.docsOctets)} / {enMo(lim.documentsOctets)}</span>
        </div>
        {barre(q.docsOctets, lim.documentsOctets)}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <button className="btn s" onClick={() => listerAnciens("photos")}>Voir les photos les plus anciennes</button>
        <button className="btn s" onClick={() => listerAnciens("documents")}>Voir les documents les plus anciens</button>
      </div>
      {anciens && (anciens.length === 0
        ? <div style={{ fontSize: 12, color: "var(--l)" }}>Aucun fichier à afficher.</div>
        : <div>
          <div style={{ fontSize: 11.5, color: "var(--m)", marginBottom: 8 }}>
            Les plus anciens d'abord. La suppression est définitive : enregistrez ce que vous voulez garder avant.
          </div>
          {anciens.map((f) => <div key={f.chemin} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: "1px solid var(--br)" }}>
            <span style={{ flex: 1, minWidth: 0, fontSize: 12, color: "var(--b)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {String(f.chemin).split("/").pop()}
            </span>
            <span style={{ fontSize: 11, color: "var(--l)", whiteSpace: "nowrap" }}>{fmt(f.cree_le)}</span>
            <button className="btn s" disabled={occupe} onClick={() => supprimer(f.chemin)} style={{ padding: "4px 10px", color: "var(--R)", borderColor: "var(--R)" }}>Supprimer</button>
          </div>)}
        </div>)}
      {!pro && <div style={{ fontSize: 11.5, color: "var(--m)", marginTop: 14, lineHeight: 1.6 }}>
        Le forfait Pro porte les documents à {enMo(QUOTAS.pro.documentsOctets)} et lève la limite du nombre de photos.
      </div>}
    </>}
  </div>;
}

// L'ecran qui remplace une fonction reservee. Il dit ce que la fonction fait,
// pourquoi elle est reservee, et ouvre la page d'abonnement — jamais une
// impasse.

export const empreinteCode=async(enfantId,code)=>{
  const octets=new TextEncoder().encode("timat:borne:"+enfantId+":"+code);
  const h=await crypto.subtle.digest("SHA-256",octets);
  return Array.from(new Uint8Array(h)).map(b=>b.toString(16).padStart(2,"0")).join("");
};

export const borneEmpreintes=()=>_lireJSON(BORNE_CLE_EMPREINTES)||{};

export const borneMemoriserEmpreintes=(m)=>_ecrireJSON(BORNE_CLE_EMPREINTES,m);

export const BORNE_ESSAIS_MAX=3;

export const BORNE_BLOCAGE_MS=60000;

export const borneCodeSortie=()=>{try{return localStorage.getItem(BORNE_CLE_SORTIE)||"";}catch(e){return"";}};

export const borneOuvrir=(codeSortie)=>{try{localStorage.setItem(BORNE_CLE_SORTIE,String(codeSortie||""));localStorage.setItem(BORNE_CLE_ACTIVE,"1");}catch(e){}};

export const borneFermer=()=>{try{localStorage.removeItem(BORNE_CLE_ACTIVE);}catch(e){}};

// Pointage, calendrier, cahier, documents, fiche d'urgence, export, ajout
// d'enfant, premier jour et mode borne vivent dans src/ecrans-quotidien.jsx.

export const tirerJetonBorne=()=>{
  const o=new Uint8Array(32);
  (window.crypto||window.msCrypto).getRandomValues(o);
  return Array.from(o,(n)=>JETON_BORNE_ALPHABET[n&63]).join("");
};

// Reglages de la borne, cote assistante maternelle : le code de sortie de
// l'appareil, le code de chaque famille, et le QR a afficher a l'entree.

export const FERIES_2024={
  "2024-01-01":"🎆 Jour de l'An",
  "2024-04-01":"🐣 Lundi de Pâques",
  "2024-05-01":"🌹 Fête du Travail",
  "2024-05-08":"🕊️ Victoire 1945",
  "2024-05-09":"✝️ Ascension",
  "2024-05-20":"🕊️ Lundi de Pentecôte",
  "2024-07-14":"🇫🇷 Fête Nationale",
  "2024-08-15":"✨ Assomption",
  "2024-11-01":"🕯️ Toussaint",
  "2024-11-11":"🎖️ Armistice",
  "2024-12-25":"🎄 Noël",
};
// Vacances scolaires Zone C (Paris) 2024

export const isVacances=(ds)=>VACANCES_2024.some(v=>ds>=v.debut&&ds<=v.fin);

export const nomVacances=(ds)=>VACANCES_2024.find(v=>ds>=v.debut&&ds<=v.fin)?.nom||"";

export const JALONS_REF=[
  // Motricité globale (OMS - WHO Multicentre Growth Reference Study 2006)
  {categorie:"Motricité globale",texte:"S'assoit sans support",age_attendu:"4-9 mois",source:"OMS"},
  {categorie:"Motricité globale",texte:"Se tient debout avec aide",age_attendu:"5-11 mois",source:"OMS"},
  {categorie:"Motricité globale",texte:"Se déplace au sol (4 pattes ou autre)",age_attendu:"5-13 mois",source:"OMS"},
  {categorie:"Motricité globale",texte:"Marche avec aide",age_attendu:"6-14 mois",source:"OMS"},
  {categorie:"Motricité globale",texte:"Se tient debout seul",age_attendu:"7-17 mois",source:"OMS"},
  {categorie:"Motricité globale",texte:"Marche seul",age_attendu:"8-18 mois",source:"OMS"},
  // Motricité fine (Carnet de santé FR 2025 / Mpedia)
  {categorie:"Motricité fine",texte:"Tient sa tête droite",age_attendu:"2-4 mois",source:"Carnet santé FR"},
  {categorie:"Motricité fine",texte:"Attrape un objet volontairement",age_attendu:"3-5 mois",source:"Carnet santé FR"},
  {categorie:"Motricité fine",texte:"Passe un objet d'une main à l'autre",age_attendu:"5-7 mois",source:"Carnet santé FR"},
  {categorie:"Motricité fine",texte:"Pince pouce-index (préhension fine)",age_attendu:"8-12 mois",source:"Carnet santé FR"},
  {categorie:"Motricité fine",texte:"Tourne les pages d'un livre",age_attendu:"12-18 mois",source:"Carnet santé FR"},
  // Langage (Carnet santé / 1000 premiers jours)
  {categorie:"Langage",texte:"Gazouille (vocalises de plaisir)",age_attendu:"2-3 mois",source:"Carnet santé FR"},
  {categorie:"Langage",texte:"Babille en syllabes répétées (« bababa »)",age_attendu:"6-9 mois",source:"Carnet santé FR"},
  {categorie:"Langage",texte:"Dit ses premiers mots (« maman », « papa »)",age_attendu:"10-14 mois",source:"Carnet santé FR"},
  {categorie:"Langage",texte:"Comprend des consignes simples",age_attendu:"12-18 mois",source:"Carnet santé FR"},
  {categorie:"Langage",texte:"Phrases de 2 mots",age_attendu:"18-24 mois",source:"Carnet santé FR"},
  {categorie:"Langage",texte:"Phrases de 3 mots ou plus",age_attendu:"24-36 mois",source:"Carnet santé FR"},
  // Social / Émotionnel (Carnet santé / 1000 premiers jours)
  {categorie:"Social / Émotionnel",texte:"Sourit en réponse (sourire social)",age_attendu:"1-3 mois",source:"Carnet santé FR"},
  {categorie:"Social / Émotionnel",texte:"Reconnaît les visages familiers",age_attendu:"3-6 mois",source:"Carnet santé FR"},
  {categorie:"Social / Émotionnel",texte:"Joue à « coucou-caché »",age_attendu:"8-12 mois",source:"Carnet santé FR"},
  {categorie:"Social / Émotionnel",texte:"Pointe du doigt pour montrer",age_attendu:"12-18 mois",source:"Carnet santé FR"},
  {categorie:"Social / Émotionnel",texte:"Imite les gestes du quotidien",age_attendu:"15-24 mois",source:"Carnet santé FR"},
  {categorie:"Social / Émotionnel",texte:"Joue à côté d'autres enfants",age_attendu:"24-36 mois",source:"Carnet santé FR"},
  // Alimentation (PNNS / Santé publique France 2021 / HCSP 2020)
  {categorie:"Alimentation",texte:"Lait exclusif (maternel ou infantile)",age_attendu:"0-4 mois",source:"PNNS"},
  {categorie:"Alimentation",texte:"Début de la diversification alimentaire",age_attendu:"4-6 mois",source:"PNNS"},
  {categorie:"Alimentation",texte:"Découvre les morceaux fondants",age_attendu:"6-10 mois",source:"PNNS"},
  {categorie:"Alimentation",texte:"Mange seul à la cuillère",age_attendu:"12-24 mois",source:"Carnet santé FR"},
  {categorie:"Alimentation",texte:"Boit au verre sans aide",age_attendu:"15-24 mois",source:"Carnet santé FR"},
  {categorie:"Alimentation",texte:"Mange comme les grands à table",age_attendu:"24-36 mois",source:"PNNS"},
  // Sommeil (Carnet santé / Mpedia / 1000 premiers jours - variable selon enfants)
  {categorie:"Sommeil",texte:"Acquiert un rythme jour/nuit",age_attendu:"2-4 mois",source:"Carnet santé FR"},
  {categorie:"Sommeil",texte:"Fait ses nuits (6h+ consécutives)",age_attendu:"3-9 mois",source:"Carnet santé FR"},
  {categorie:"Sommeil",texte:"Réduit à 1 sieste par jour",age_attendu:"15-20 mois",source:"Carnet santé FR"},
  {categorie:"Sommeil",texte:"Supprime la sieste de l'après-midi",age_attendu:"30-48 mois",source:"Carnet santé FR"},
  // Autonomie (Carnet santé)
  {categorie:"Autonomie",texte:"Enlève des vêtements simples",age_attendu:"18-30 mois",source:"Carnet santé FR"},
  {categorie:"Autonomie",texte:"S'habille partiellement seul",age_attendu:"30-42 mois",source:"Carnet santé FR"},
  // Jeu (Carnet santé / 1000 premiers jours)
  {categorie:"Jeu",texte:"Manipule les objets, les met en bouche",age_attendu:"3-9 mois",source:"Carnet santé FR"},
  {categorie:"Jeu",texte:"Joue à faire tomber, taper (cause à effet)",age_attendu:"9-15 mois",source:"Carnet santé FR"},
  {categorie:"Jeu",texte:"Empile 2-3 cubes / encastrements simples",age_attendu:"15-24 mois",source:"Carnet santé FR"},
  {categorie:"Jeu",texte:"Jeu symbolique (« fait semblant »)",age_attendu:"18-30 mois",source:"Carnet santé FR"},
  {categorie:"Jeu",texte:"Joue à des jeux de règles simples",age_attendu:"30-42 mois",source:"Carnet santé FR"},
  // Propreté (HAS / Carnet santé - respect du rythme de l'enfant, énurésie nocturne avant 5 ans non pathologique)
  {categorie:"Propreté",texte:"Demande pour aller aux toilettes",age_attendu:"24-36 mois",source:"Carnet santé FR"},
  {categorie:"Propreté",texte:"Continence diurne acquise",age_attendu:"30-42 mois",source:"Carnet santé FR"},
  {categorie:"Propreté",texte:"Continence nocturne acquise",age_attendu:"36-60 mois",source:"Carnet santé FR"},
  // Santé / Dentition (MSD / Carnet santé / INSPQ)
  {categorie:"Santé / Dentition",texte:"Sortie de la première dent",age_attendu:"4-12 mois",source:"Carnet santé FR"},
  {categorie:"Santé / Dentition",texte:"Première visite chez le dentiste",age_attendu:"12-24 mois",source:"HAS / UFSBD"},
  {categorie:"Santé / Dentition",texte:"Dentition de lait complète (20 dents)",age_attendu:"24-36 mois",source:"MSD"},
];

// MILESTONES P3 - persistance Supabase + seed automatique au premier accès asmat
// FILTRE AGE P8 - helpers pour parser "X-Y mois" et calculer l'âge en mois

export function parseAgeAttendu(str){ // FILTRE AGE P8
  if(!str) return {min:0, max:36};
  const m=String(str).match(/(\d+)\s*-\s*(\d+)/);
  return m ? {min:parseInt(m[1],10), max:parseInt(m[2],10)} : {min:0, max:36};
}

export function ageEnMois(naissance){ // FILTRE AGE P8
  if(!naissance) return null;
  const d=new Date(naissance);
  if(isNaN(d.getTime())) return null;
  const now=new Date();
  const months=(now.getFullYear()-d.getFullYear())*12 + (now.getMonth()-d.getMonth());
  return Math.max(0, months);
}

export const DOCS_DEMO=[
  // Médicaux
  {id:"d1",eId:"e1",cat:"medical",sous:"Carnet de santé",nom:"Carnet_santé_Léo_2024.pdf",date:"2024-01-08",annee:"2024",taille:"1.2 Mo",icone:"🏥",partage:true},
  {id:"d2",eId:"e1",cat:"medical",sous:"Ordonnance",nom:"Ordonnance_Léo_Mars2024.pdf",date:"2024-03-02",annee:"2024",taille:"180 Ko",icone:"💊",partage:true},
  {id:"d3",eId:"e2",cat:"medical",sous:"Vaccins",nom:"Carnet_vaccins_Emma.pdf",date:"2023-11-22",annee:"2023",taille:"540 Ko",icone:"💉",partage:true},
  {id:"d4",eId:"e3",cat:"medical",sous:"Allergie",nom:"Certificat_allergie_Noah.pdf",date:"2024-01-15",annee:"2024",taille:"220 Ko",icone:"⚠️",partage:true},
  // Administratifs
  {id:"d5",eId:"e1",cat:"admin",sous:"Contrat",nom:"Contrat_Léo_Sept2023.pdf",date:"2023-09-04",annee:"2023",taille:"320 Ko",icone:"📄",partage:true},
  {id:"d6",eId:"e1",cat:"admin",sous:"Attestation fiscale",nom:"Attestation_fiscale_2023_Léo.pdf",date:"2024-01-15",annee:"2024",taille:"180 Ko",icone:"📑",partage:true},
  {id:"d7",eId:"e2",cat:"admin",sous:"Contrat",nom:"Contrat_Emma_Sept2023.pdf",date:"2023-09-04",annee:"2023",taille:"315 Ko",icone:"📄",partage:true},
  {id:"d8",eId:"e2",cat:"admin",sous:"Facture",nom:"Facture_Fevrier2024_Emma.pdf",date:"2024-02-01",annee:"2024",taille:"95 Ko",icone:"🧾",partage:true},
  {id:"d9",eId:"e3",cat:"admin",sous:"Contrat",nom:"Contrat_Noah_Janv2024.pdf",date:"2024-01-08",annee:"2024",taille:"310 Ko",icone:"📄",partage:true},
  // Pédagogiques
  {id:"d10",eId:"e1",cat:"peda",sous:"CR Trimestriel",nom:"CR_T1_2024_Léo.pdf",date:TODAY_STR,annee:"2024",taille:"280 Ko",icone:"📝",partage:true},
  {id:"d11",eId:"e2",cat:"peda",sous:"CR Trimestriel",nom:"CR_T4_2023_Emma.pdf",date:"2023-12-20",annee:"2023",taille:"265 Ko",icone:"📝",partage:true},
  {id:"d12",eId:"e1",cat:"peda",sous:"Bilan de journée",nom:"Bilan_11Mars2024_Léo.pdf",date:TODAY_STR,annee:"2024",taille:"120 Ko",icone:"✨",partage:true},
  // Agréments assmat
  {id:"d13",eId:null,cat:"agrement",sous:"Agrément PMI",nom:"Agrement_PMI_2024.pdf",date:"2024-01-01",annee:"2024",taille:"450 Ko",icone:"🏛️",partage:false},
  {id:"d14",eId:null,cat:"agrement",sous:"Assurance",nom:"Assurance_RC_Pro_2024.pdf",date:"2024-01-01",annee:"2024",taille:"380 Ko",icone:"🛡️",partage:false},
];

// SMIC horaire brut, par date d'entree en vigueur, du plus recent au plus ancien.
// Une valeur en dur ne suffit pas : le recap fiscal porte sur l'annee N-1 et doit
// donc continuer d'utiliser le SMIC de cette annee-la, pas celui d'aujourd'hui.
// Sources : info.gouv.fr et Insee. A completer a chaque revalorisation.

export const preavisJours=(moisAnciennete)=>{
  const m=Number(moisAnciennete)||0;
  if(m<3)return 8;
  if(m<12)return 15;
  return 30;
};

// Conges payes acquis : 2,5 jours ouvrables par mois de travail effectif,
// plafonnes a 30 jours ouvrables par periode de reference (art. L. 3141-3 du
// code du travail).

export const congesAcquis=(moisTravailles)=>
  Math.min(CP_MAX_AN,Math.round((Math.max(0,Number(moisTravailles)||0)*CP_PAR_MOIS)*100)/100);

// Indemnite compensatrice de conges payes : la methode la plus favorable a la
// salariee entre la regle du dixieme (10 % du brut total de la periode) et le
// maintien de salaire. Ce principe est d'ordre public : il ne peut pas etre
// ecarte par le contrat.

export const iccpCalcul=({brutPeriode=0,joursAcquis=0,joursPris=0,salaireJournalier=0})=>{
  const restants=Math.max(0,(Number(joursAcquis)||0)-(Number(joursPris)||0));
  const dixieme=Math.round((Number(brutPeriode)||0)*TAUX_DIXIEME*100)/100;
  const maintien=Math.round(restants*(Number(salaireJournalier)||0)*100)/100;
  return{restants,dixieme,maintien,
    montant:Math.max(dixieme,maintien),
    methode:dixieme>=maintien?"dixième":"maintien de salaire"};
};

// Indemnite de rupture : 1/80 du total des salaires bruts percus depuis le
// debut du contrat, due a partir de 9 mois d'anciennete quand la rupture vient
// du particulier employeur (retrait de l'enfant), sauf faute grave. Elle
// n'entre pas dans l'assiette des cotisations et n'est pas imposable, et elle
// exclut les indemnites d'entretien, de repas et kilometriques.

export const indemniteRupture=({brutTotal=0,moisAnciennete=0,parEmployeur=true,fauteGrave=false})=>{
  if(!parEmployeur||fauteGrave)return 0;
  if((Number(moisAnciennete)||0)<ANCIENNETE_MIN_RUPTURE_MOIS)return 0;
  return Math.round(((Number(brutTotal)||0)/DIVISEUR_INDEMNITE_RUPTURE)*100)/100;
};

export const minimumHoraireAu=(d,titreAmge=false)=>{
  const j=isoJour(d);
  let conv=MINIMUM_CONV_HISTO[MINIMUM_CONV_HISTO.length-1][1];
  for(const[debut,valeur]of MINIMUM_CONV_HISTO)if(j>=debut){conv=valeur;break;}
  if(titreAmge)conv=Math.round(conv*(1+MAJORATION_TITRE_AMGE)*100)/100;
  const legal=Math.round(smicHoraireAu(d)*COEF_MINIMUM_LEGAL*100)/100;
  return Math.max(conv,legal);
};

// jsPDF est charge a la demande, mais depuis le paquet installe et non plus
// depuis un CDN : le PDF continue de ne peser sur aucun chargement de page
// (Vite en fait un morceau separe), tout en restant generable hors ligne et
// sans dependre d'un tiers dont on ne maitrise ni la version ni la duree de vie.
// Tout texte qui part dans un PDF passe par ce filtre.
//
// jsPDF ecrit avec une police standard codee sur un seul octet (WinAnsi). Des
// qu'une chaine contient un caractere hors de ce jeu, il bascule la LIGNE
// ENTIERE en UTF-16, que la police ne connait pas : ni le symbole ni le texte
// autour ne s'impriment. Un parent qui ecrit « Super journee 🎉 » dans une
// transmission faisait donc disparaitre toute la ligne du bilan envoye.
//
// On retire le caractere fautif et on garde le reste : mieux vaut un emoji en
// moins qu'une phrase entiere perdue.

export const CATS={
  medical:{l:"Médical",ic:"🏥",c:"#B84060",bg:"#FAEEF2"},
  admin:{l:"Administratif",ic:"🧾",c:"#B8892A",bg:"#FBF5E0"},
  peda:{l:"Pédagogique",ic:"📝",c:"#6A3F88",bg:"#F2EAF8"},
  agrement:{l:"Agréments & Pro",ic:"🏛️",c:"#2E5F8A",bg:"#E6F0F8"},
};

export const TAUX_PATRONAL_TOTAL = Object.values(TAUX_COTISATIONS)
  .reduce((s, t) => s + (t.pat > 0 ? t.pat * (t.base || 1) : 0), 0) / 100;

export const MODELES_CONTRATS=[
  {id:"ct1",titre:"Contrat standard - Temps plein",desc:"Accueil 5j/semaine, mensualisation 47 semaines, conforme CCN.",
   champs:["Enfant","Date de début","Jours","Horaires","Taux horaire (€/h)","Indemnité entretien (€/j)"],avenant:false},
  {id:"ct2",titre:"Contrat - Temps partiel",desc:"Accueil moins de 5 jours ou moins de 30h/semaine.",
   champs:["Enfant","Jours","Horaires","Taux horaire (€/h)","Indemnité entretien (€/j)"],avenant:false},
  {id:"ct3",titre:"Contrat périscolaire",desc:"Accueil matin, soir, mercredis et vacances scolaires.",
   champs:["Enfant","Créneaux matin/soir","Planning vacances","Taux horaire (€/h)"],avenant:false},
  {id:"ct4",titre:"Avenant - Modification d'horaires",desc:"Modifier les jours ou horaires d'un contrat existant.",
   champs:["Contrat concerné","Nouveaux horaires","Date d'effet","Motif"],avenant:true},
  {id:"ct5",titre:"Avenant - Revalorisation salaire",desc:"Augmenter le taux horaire suite SMIC ou accord.",
   champs:["Contrat concerné","Nouveau taux horaire","Date d'effet","Motif"],avenant:true},
  {id:"ct6",titre:"Rupture amiable",desc:"Fin de contrat d'un commun accord avec solde tout compte.",
   champs:["Contrat concerné","Date de fin","Motif","Congés payés restants"],avenant:true},
];

export const COURRIERS_DATA=[
  {id:"r1",cat:"Contrat",ic:"📄",titre:"Demande de rendez-vous d'embauche",
   contenu:"Madame, Monsieur,\n\nSuite à notre prise de contact, je vous confirme ma disponibilité pour accueillir [Prénom] à compter du [Date de début].\n\nJe vous propose un rendez-vous le [Date RDV] à [Heure] pour finaliser les modalités et signer le contrat.\n\nCordialement,\n[Votre nom]"},
  {id:"r2",cat:"Contrat",ic:"📄",titre:"Lettre de rupture de contrat",
   contenu:"Envoi recommandé avec avis de réception\n\nMadame, Monsieur,\n\nJe vous informe que je mets fin au contrat d'accueil de [Prénom], pour le motif suivant : [Motif].\n\nLe préavis de [Durée] court à compter de la première présentation de ce courrier ; le contrat prendra donc fin le [Date de fin].\n\nÀ cette date, je vous remercie de me remettre le solde de tout compte, le certificat de travail et l'attestation destinée à France Travail, que vous générez depuis votre espace Pajemploi.\n\nCordialement,\n[Votre nom]"},
  {id:"r3",cat:"Financier",ic:"💶",titre:"Mise en demeure de paiement de salaire",
   contenu:"Envoi recommandé avec avis de réception\n\nMadame, Monsieur,\n\nLe salaire de [Mois], d'un montant de [Montant] €, reste impayé à ce jour.\n\nJe vous mets en demeure de procéder au règlement dans un délai de 8 jours à compter de la première présentation de ce courrier. Passé ce délai, je me verrai contraint(e) de saisir le conseil de prud'hommes.\n\nCordialement,\n[Votre nom]"},
  {id:"r4",cat:"PMI",ic:"🏛️",titre:"Compte-rendu de visite PMI",
   contenu:"Objet : Compte-rendu de la visite du [Date]\n\nSuite à la visite de [Nom puéricultrice] le [Date], je vous adresse ce compte-rendu.\n\nPoints abordés : conditions d'accueil, suivi des enfants, documentation administrative.\n\nObservations : [Observations]\nActions engagées : [Actions]\n\nCordialement,\n[Votre nom] - Asmat agréée n° [Numéro agrément]"},
  {id:"r5",cat:"Congés",ic:"🏖️",titre:"Déclaration de congés annuels",
   contenu:"Madame, Monsieur,\n\nConformément à la convention collective, qui invite les parties à fixer les dates d'un commun accord au plus tard le 1er mars, je vous confirme que je prendrai mes congés du [Date début] au [Date fin] inclus.\n\nDurant cette période, je ne pourrai pas assurer l'accueil de [Prénom].\n\nCordialement,\n[Votre nom]"},
  {id:"r6",cat:"Avenant",ic:"✏️",titre:"Proposition d'avenant aux horaires",
   contenu:"Madame, Monsieur,\n\nJe vous propose de modifier le contrat d'accueil de [Prénom] comme suit :\n\nAnciennes dispositions : [Anciens horaires]\nNouveaux horaires : [Nouveaux horaires]\nDate d'effet : [Date]\n\nCes modifications entraîneront une révision du salaire à [Nouveau montant]€.\n\nMerci de confirmer votre accord en signant l'avenant ci-joint.\n\nCordialement,\n[Votre nom]"},
  {id:"r7",cat:"PMI",ic:"🏛️",titre:"Demande de renouvellement d'agrément",
   contenu:"Madame, Monsieur le Médecin chef de PMI,\n\nJe sollicite le renouvellement de mon agrément n° [Numéro] arrivant à échéance le [Date].\n\nJe continue d'accueillir des enfants à mon domicile situé au [Adresse] dans les conditions réglementaires.\n\nJe tiens à votre disposition l'ensemble des justificatifs.\n\nCordialement,\n[Votre nom]"},
];

export const VERSEMENT_MODES={virement:"Virement",cheque:"Chèque",especes:"Espèces",cesu:"CESU",autre:"Autre"};

export const CROISSANCE_DEMO={
  "e1":[
    {date:"2022-03-15",age_mois:0,poids:3.4,taille:50},
    {date:"2022-06-15",age_mois:3,poids:5.8,taille:60},
    {date:"2022-09-15",age_mois:6,poids:7.6,taille:67},
    {date:"2022-12-15",age_mois:9,poids:9.0,taille:72},
    {date:"2023-03-15",age_mois:12,poids:10.1,taille:76},
    {date:"2023-09-15",age_mois:18,poids:11.5,taille:82},
    {date:"2024-03-15",age_mois:24,poids:12.8,taille:87},
  ],
  "e2":[
    {date:"2021-11-22",age_mois:0,poids:3.5,taille:50},
    {date:"2022-02-22",age_mois:3,poids:6.0,taille:61},
    {date:"2022-05-22",age_mois:6,poids:7.8,taille:68},
    {date:"2022-08-22",age_mois:9,poids:9.2,taille:73},
    {date:"2022-11-22",age_mois:12,poids:10.4,taille:77},
    {date:"2023-05-22",age_mois:18,poids:11.8,taille:83},
    {date:"2023-11-22",age_mois:24,poids:13.1,taille:88},
  ],
  "e3":[
    {date:"2023-01-08",age_mois:0,poids:3.2,taille:49},
    {date:"2023-04-08",age_mois:3,poids:5.5,taille:59},
    {date:"2023-07-08",age_mois:6,poids:7.2,taille:66},
    {date:"2023-10-08",age_mois:9,poids:8.5,taille:71},
    {date:"2024-01-08",age_mois:12,poids:9.8,taille:75},
  ],
};
// Percentiles OMS simplifié (médiane p50 garçon)

export const OMS_POIDS=[3.3,5.1,6.4,7.4,8.2,8.9,9.5,10.0,10.4,10.9,11.3,11.7,12.1];// 0-12 mois

export const ACTIVITES_PAR_AGE=[
  // 0-1 an (0-12 mois)
  {age_min:0,age_max:6,cat:"Éveil",titre:"Hochets et mobiles",desc:"Stimulation visuelle et auditive dès les premières semaines.",competences:["Éveil sensoriel","Concentration"],duree:"10-15 min",materiel:"Hochet, mobile coloré"},
  {age_min:0,age_max:12,cat:"Éveil",titre:"Massage bébé",desc:"Contact tactile structurant : sécurité affective et tonus musculaire.",competences:["Sécurité affective","Détente"],duree:"10 min",materiel:"Huile végétale, tapis"},
  {age_min:2,age_max:8,cat:"Éveil",titre:"Miroir incassable",desc:"Découverte de son reflet : premiers pas vers la conscience de soi.",competences:["Conscience de soi","Éveil sensoriel"],duree:"10 min",materiel:"Miroir bébé incassable"},
  {age_min:3,age_max:12,cat:"Motricité",titre:"Tapis d'éveil",desc:"Position sur le ventre, premiers mouvements de reptation.",competences:["Motricité globale","Tonus musculaire"],duree:"15-20 min",materiel:"Tapis d'éveil"},
  {age_min:6,age_max:14,cat:"Éveil",titre:"Bac sensoriel doux",desc:"Toucher différentes textures (tissus, mousse) en sécurité.",competences:["Éveil sensoriel","Découverte"],duree:"15 min",materiel:"Bac, tissus variés"},
  {age_min:6,age_max:16,cat:"Éveil",titre:"Jeux d'eau",desc:"Patouiller, transvaser, sentir l'eau. Idéal l'été.",competences:["Éveil sensoriel","Motricité fine"],duree:"15-20 min",materiel:"Bassine, gobelets"},
  {age_min:9,age_max:18,cat:"Créatif",titre:"Peinture aux empreintes",desc:"Tremper mains et pieds dans la peinture lavable. Traces et couleurs.",competences:["Motricité fine","Créativité"],duree:"15 min",materiel:"Peinture lavable, grande feuille"},
  // 1-2 ans (12-24 mois)
  {age_min:6,age_max:18,cat:"Langage",titre:"Comptines avec gestes",desc:"Apprendre la langue par le corps et la répétition.",competences:["Langage","Mémoire"],duree:"10 min",materiel:"Aucun"},
  {age_min:12,age_max:24,cat:"Créatif",titre:"Peinture au doigt",desc:"Explorer textures et couleurs, développer la motricité fine.",competences:["Motricité fine","Créativité"],duree:"20 min",materiel:"Peinture lavable, feuilles"},
  {age_min:12,age_max:36,cat:"Langage",titre:"Lecture d'imagier",desc:"Montrer et nommer les objets. Enrichit le vocabulaire.",competences:["Vocabulaire","Concentration"],duree:"10-15 min",materiel:"Livre imagier"},
  {age_min:12,age_max:30,cat:"Éveil",titre:"Transvasement",desc:"Verser graines ou eau d'un contenant à l'autre. Précision et patience.",competences:["Motricité fine","Concentration"],duree:"15 min",materiel:"Contenants, graines/eau"},
  {age_min:12,age_max:28,cat:"Logique",titre:"Empiler et encastrer",desc:"Tours de cubes, boîtes à formes. Coordination et cause-effet.",competences:["Coordination","Logique"],duree:"15 min",materiel:"Cubes, encastrements"},
  {age_min:15,age_max:36,cat:"Créatif",titre:"Gommettes",desc:"Décoller et coller des gommettes. Pince pouce-index.",competences:["Motricité fine","Concentration"],duree:"15 min",materiel:"Gommettes, feuille"},
  // 2-3 ans (24-36 mois)
  {age_min:18,age_max:36,cat:"Sciences",titre:"Jardinage en pot",desc:"Planter, arroser, observer la pousse. Sens des responsabilités.",competences:["Découverte du monde","Patience"],duree:"20-30 min",materiel:"Pot, terre, graines"},
  {age_min:18,age_max:42,cat:"Motricité",titre:"Parcours moteur",desc:"Enjamber, traverser un tunnel, marcher sur une ligne.",competences:["Équilibre","Coordination"],duree:"20 min",materiel:"Coussins, cerceaux"},
  {age_min:24,age_max:48,cat:"Créatif",titre:"Pâte à modeler",desc:"Malaxer, rouler, façonner. Renforce les muscles des mains.",competences:["Motricité fine","Créativité"],duree:"25 min",materiel:"Pâte à modeler"},
  {age_min:24,age_max:36,cat:"Social",titre:"Jeu symbolique",desc:"Faire semblant (dînette, docteur). Imaginaire et empathie.",competences:["Imagination","Empathie"],duree:"30 min",materiel:"Dînette, poupée"},
  {age_min:24,age_max:42,cat:"Logique",titre:"Tri par couleurs et formes",desc:"Classer des objets selon un critère. Premières notions logiques.",competences:["Logique","Observation"],duree:"15 min",materiel:"Objets colorés, bols"},
  {age_min:0,age_max:36,cat:"Musique",titre:"Maracas maison",desc:"Riz ou pâtes dans une bouteille. Découverte du son et du rythme.",competences:["Éveil musical","Créativité"],duree:"15 min",materiel:"Bouteille, riz"},
  // 3-6 ans (36-72 mois)
  {age_min:36,age_max:72,cat:"Créatif",titre:"Découpage aux ciseaux",desc:"Manier des ciseaux à bouts ronds en sécurité. Motricité fine.",competences:["Motricité fine","Concentration"],duree:"20 min",materiel:"Ciseaux ronds, papier"},
  {age_min:36,age_max:72,cat:"Logique",titre:"Jeux de société simples",desc:"Loto, memory, premiers jeux de règles : attendre son tour.",competences:["Règles","Attention","Patience"],duree:"25 min",materiel:"Loto, memory"},
  {age_min:36,age_max:72,cat:"Logique",titre:"Puzzles",desc:"Assembler des pièces. Logique, observation et persévérance.",competences:["Logique","Observation"],duree:"20 min",materiel:"Puzzles évolutifs"},
  {age_min:36,age_max:72,cat:"Sciences",titre:"Atelier cuisine",desc:"Préparer une recette simple (verser, mélanger). Autonomie et langage.",competences:["Autonomie","Découverte du monde"],duree:"30-40 min",materiel:"Ingrédients, ustensiles"},
  {age_min:36,age_max:72,cat:"Langage",titre:"Histoire et questions",desc:"Raconter une histoire puis échanger dessus. Compréhension et langage.",competences:["Langage","Imagination"],duree:"15-20 min",materiel:"Album jeunesse"},
  {age_min:36,age_max:72,cat:"Motricité",titre:"Jeux moteurs collectifs",desc:"Course, ballon, danse, rondes. Coordination et vie en groupe.",competences:["Coordination","Socialisation"],duree:"20-30 min",materiel:"Ballon, espace dégagé"},
  {age_min:36,age_max:72,cat:"Créatif",titre:"Dessin et coloriage",desc:"Tenir le crayon, respecter un contour, exprimer une idée.",competences:["Motricité fine","Expression"],duree:"20 min",materiel:"Crayons, feutres"},
  {age_min:30,age_max:72,cat:"Sciences",titre:"Observation de la nature",desc:"Ramasser feuilles et cailloux, observer les insectes. Éveille la curiosité.",competences:["Découverte du monde","Observation"],duree:"20-30 min",materiel:"Loupe, sac de récolte"},
];

export const catColors={Éveil:"var(--P)",Motricité:"var(--S)",Langage:"var(--B)",Créatif:"var(--T)",Sciences:"var(--G)",Social:"var(--R)",Musique:"#8B4513",Logique:"#C77DAE"};

export const PMI_MESSAGES=[
  {id:"pmi1",de:"PMI",h:"09h15",date:isoJour(new Date(Date.now()-7*86400000)),txt:"Bonjour Madame Dupont, nous organisons une réunion d'information le 15 avril à 14h à la mairie. Votre présence est souhaitée.",lu:true},
  {id:"pmi2",de:"asmat",h:"10h30",date:isoJour(new Date(Date.now()-7*86400000)),txt:"Bonjour, je confirme ma présence le 15 avril. Merci pour l'invitation.",lu:true},
  {id:"pmi3",de:"PMI",h:"14h20",date:isoJour(new Date(Date.now()-2*86400000)),txt:"Votre agrément arrive à renouvellement en juin 2024. Merci de nous contacter pour planifier la visite de renouvellement.",lu:false},
];

export const DATE_ACCORD_CONGES = "03-01"; // 1er mars

// Qui recoit quoi, et sur quels appareils.
//
// Les notifications etaient jusqu'ici invisibles : impossible de savoir si on
// etait abonne, sur quel appareil, ni pourquoi le bouton d'activation ne
// faisait rien sur iPhone. Un reglage qu'on ne peut pas verifier est un
// reglage auquel on ne peut pas se fier.

export function InstallButton(){
  const {deferredPrompt,isInstalled,isIOS,install}=useInstallPWA();
  const [showGuide,setShowGuide]=useState(false);

  if(isInstalled)return <div style={{fontSize:12,color:"var(--S)",fontWeight:600}}><IconeOuEmoji e="✅"/> TiMat est déjà installé sur votre appareil</div>;

  return <>
    <button className="btn bT" style={{width:"100%",justifyContent:"center"}}
      onClick={()=>install(()=>{if(!deferredPrompt)setShowGuide(true);})}>
      <IconeOuEmoji e="📲"/> Installer TiMat sur cet appareil
    </button>
    {showGuide&&<InstallGuide isIOS={isIOS} onClose={()=>setShowGuide(false)}/>}
  </>;
}

export function SupprimerCompte({onDeleted}){
  const [etape,setEtape]=useState("idle");
  const [confirmation,setConfirmation]=useState("");
  const [erreur,setErreur]=useState("");
  const MOT="SUPPRIMER";

  const handleSupprimer=async()=>{
    if(confirmation!==MOT)return;
    setEtape("deleting");
    try{
      const{data:{user}}=await supabase.auth.getUser();
      if(!user)throw new Error("Non connecté");
      // Les photos et documents doivent partir AVANT les lignes de base : une
      // fois le compte supprime, plus aucune session ne peut y acceder et ils
      // resteraient indefiniment sur le stockage. Supabase interdit de les
      // effacer depuis SQL, cela ne peut donc pas se faire cote serveur.
      await viderStockageDuCompte(user.id);
      const{error}=await supabase.rpc("delete_user_account",{p_user_id:user.id});
      if(error)throw error;
      // AUDIT LOG P8 : trace de suppression de compte (avant signOut, user_id explicite car user supprimé en DB)
      await logAction('delete_account', {table_name:'profiles', record_id:user.id, user_id:user.id});
      await supabase.auth.signOut();
      setEtape("done");
      setTimeout(()=>onDeleted?.(),2000);
    }catch(e){
      setErreur(e.message||"Erreur - contactez support@timat.app");
      setEtape("error");
    }
  };

  if(etape==="idle")return(
    <div style={{background:"var(--Rp)",border:"1px solid var(--R)",borderRadius:12,padding:20}}>
      <div style={{fontWeight:700,fontSize:14,color:"var(--R)",marginBottom:8}}><IconeOuEmoji e="⚠️"/> Zone de danger</div>
      <div style={{fontSize:13,color:"var(--m)",marginBottom:14,lineHeight:1.6}}>
        La suppression est <strong>définitive et irréversible</strong>. Toutes vos données (enfants, contrats, transmissions, photos, bilans) seront effacées immédiatement conformément au RGPD.
      </div>
      <button onClick={()=>setEtape("confirm1")}style={{background:"none",border:"1.5px solid var(--R)",color:"var(--R)",borderRadius:10,padding:"9px 18px",cursor:"pointer",fontSize:13,fontWeight:600}}>
        Supprimer mon compte et toutes mes données
      </button>
    </div>
  );

  if(etape==="confirm1")return(
    <div style={{background:"var(--Rp)",border:"2px solid var(--R)",borderRadius:12,padding:20}}>
      <div style={{fontWeight:700,fontSize:15,color:"var(--R)",marginBottom:12}}>Êtes-vous absolument sûre ?</div>
      <div style={{fontSize:13,color:"var(--m)",marginBottom:14,lineHeight:1.7}}>
        Seront supprimés : votre profil, toutes les fiches enfants, tous les contrats, pointages, transmissions, bilans et photos.
      </div>
      <div style={{display:"flex",gap:10}}>
        <button onClick={()=>setEtape("idle")}className="btn bG"style={{flex:1}}>Annuler</button>
        <button onClick={()=>setEtape("confirm2")}className="btn bR"style={{flex:1}}>Oui, continuer</button>
      </div>
    </div>
  );

  if(etape==="confirm2")return(
    <div style={{background:"var(--Rp)",border:"2px solid var(--R)",borderRadius:12,padding:20}}>
      <div style={{fontWeight:700,fontSize:14,color:"var(--R)",marginBottom:8}}>Confirmation finale</div>
      <div style={{fontSize:13,color:"var(--m)",marginBottom:12}}>
        Tapez <strong style={{fontFamily:"'DM Mono',monospace",color:"var(--R)"}}>SUPPRIMER</strong> pour confirmer.
      </div>
      <input className="inp"value={confirmation}onChange={e=>setConfirmation(e.target.value.toUpperCase())}
        placeholder="SUPPRIMER"style={{textAlign:"center",fontFamily:"'DM Mono',monospace",marginBottom:12,
          borderColor:confirmation===MOT?"var(--R)":"var(--br)"}}/>
      <div style={{display:"flex",gap:10}}>
        <button onClick={()=>{setEtape("idle");setConfirmation("");}}className="btn bG"style={{flex:1}}>Annuler</button>
        <button onClick={handleSupprimer}disabled={confirmation!==MOT}
          className="btn bR"style={{flex:1,opacity:confirmation===MOT?1:.5}}>
          Supprimer définitivement
        </button>
      </div>
    </div>
  );

  if(etape==="deleting")return(
    <div style={{textAlign:"center",padding:24,background:"var(--Rp)",borderRadius:12,border:"1px solid var(--R)"}}>
      <div style={{fontSize:32,marginBottom:8}}>⏳</div>
      <div style={{fontSize:14,color:"var(--R)",fontWeight:600}}>Suppression en cours...</div>
    </div>
  );

  if(etape==="done")return(
    <div style={{textAlign:"center",padding:24,background:"var(--Sp)",borderRadius:12,border:"1px solid var(--S)"}}>
      <div style={{fontSize:32,marginBottom:8}}>✅</div>
      <div style={{fontSize:14,color:"var(--S)",fontWeight:700}}>Compte supprimé. Au revoir !</div>
    </div>
  );

  return(
    <div style={{padding:20,background:"var(--Rp)",borderRadius:12,border:"1px solid var(--R)"}}>
      <div style={{fontWeight:700,color:"var(--R)",marginBottom:8}}>Erreur</div>
      <div style={{fontSize:13,color:"var(--m)",marginBottom:12}}>{erreur}</div>
      <button onClick={()=>setEtape("idle")}className="btn bG">Réessayer</button>
    </div>
  );
}

// SIGNATURE STANDARD ASMAT P10 - composant reutilisable de capture de signature
// Utilise dans Parametres (signature de reference du profil) et dans Contrats (pre-remplissage)

export function SignaturePad({initialValue,onSave,onCancel}){
  const canvasRef=useRef(null);
  const [drawing,setDrawing]=useState(false);
  const [hasDrawn,setHasDrawn]=useState(false);

  useEffect(()=>{
    const c=canvasRef.current;if(!c)return;
    const ctx=c.getContext("2d");
    ctx.fillStyle="#FDFAF6";
    ctx.fillRect(0,0,c.width,c.height);
    ctx.strokeStyle="#3A2820";ctx.lineWidth=2;ctx.lineCap="round";ctx.lineJoin="round";
    if(initialValue){
      const img=new Image();
      img.onload=()=>{ctx.drawImage(img,0,0,c.width,c.height);setHasDrawn(true);};
      img.src=initialValue;
    }
  },[initialValue]);

  const getPos=(e)=>{
    const c=canvasRef.current;if(!c)return{x:0,y:0};
    const r=c.getBoundingClientRect();
    const pt=e.touches?.[0]||e.changedTouches?.[0]||e;
    const sx=c.width/r.width;const sy=c.height/r.height;
    return{x:(pt.clientX-r.left)*sx,y:(pt.clientY-r.top)*sy};
  };
  const startDraw=(e)=>{
    e.preventDefault?.();
    setDrawing(true);
    const c=canvasRef.current;if(!c)return;
    const ctx=c.getContext("2d");
    const{x,y}=getPos(e);
    ctx.beginPath();ctx.moveTo(x,y);
  };
  const draw=(e)=>{
    if(!drawing)return;
    e.preventDefault?.();
    const c=canvasRef.current;if(!c)return;
    const ctx=c.getContext("2d");
    const{x,y}=getPos(e);
    ctx.lineTo(x,y);ctx.stroke();
    ctx.beginPath();ctx.moveTo(x,y);
    setHasDrawn(true);
  };
  const endDraw=(e)=>{e?.preventDefault?.();setDrawing(false);};
  const clear=()=>{
    const c=canvasRef.current;if(!c)return;
    const ctx=c.getContext("2d");
    ctx.fillStyle="#FDFAF6";
    ctx.fillRect(0,0,c.width,c.height);
    setHasDrawn(false);
  };
  const save=()=>{
    if(!hasDrawn)return;
    const dataUrl=canvasRef.current.toDataURL("image/png");
    onSave(dataUrl);
  };

  return <div style={{padding:16}}>
    <div style={{fontSize:12,color:"var(--m)",marginBottom:10}}>
      Signez avec votre souris ou votre doigt sur tablette.
    </div>
    <canvas ref={canvasRef} width={600} height={200}
      style={{width:"100%",height:200,display:"block",border:"2px dashed var(--br)",borderRadius:10,background:"#FDFAF6",touchAction:"none",cursor:"crosshair"}}
      onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
      onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw} onTouchCancel={endDraw}/>
    <div style={{display:"flex",gap:8,marginTop:12,justifyContent:"flex-end",flexWrap:"wrap"}}>
      <button className="btn bG" onClick={clear}>Effacer</button>
      <button className="btn bG" onClick={onCancel}>Annuler</button>
      <button className="btn bT" onClick={save} disabled={!hasDrawn}
        style={{opacity:hasDrawn?1:.5}}>
        Enregistrer
      </button>
    </div>
  </div>;
}

export const pdfPerime=(dateGeneration,dateModification)=>{
  const gen=String(dateGeneration||"");
  if(!gen)return false;
  const seuils=[DOCUMENTS_REFONTE,String(dateModification||"")].filter(Boolean);
  return seuils.some((s)=>gen<s);
};

export const DEMANDES_DEMO=[
  {
    id:"d1",statut:"nouveau",date:isoJour(new Date(Date.now()-2*86400000)),
    parent:{prenom:"Camille",nom:"Moreau",email:"camille.moreau@gmail.com",tel:"06 12 34 56 78",profession:"Infirmière"},
    enfant:{prenom:"Chloé",naissance:"2023-08-14",allergies:"Aucune connue",dejaCrèche:false},
    contrat:{debut:"2024-09-02",jours:["Lundi","Mardi","Mercredi","Jeudi"],
      heureArrivee:"07h30",heureDepart:"17h30",heuresHebdo:40,
      anneeComplete:true,vacances:"Oui, pendant les vacances scolaires"},
    message:"Bonjour Madame Dupont, nous avons trouvé votre profil sur monenfant.fr. Notre fille Chloé aura 1 an en août et nous cherchons une assistante maternelle de confiance pour la rentrée. Votre profil nous correspond parfaitement.",
  },
  {
    id:"d2",statut:"en_discussion",date:isoJour(new Date(Date.now()-5*86400000)),
    parent:{prenom:"Antoine",nom:"Lefebvre",email:"antoine.lefebvre@hotmail.fr",tel:"07 89 01 23 45",profession:"Comptable"},
    enfant:{prenom:"Mathieu",naissance:"2022-11-03",allergies:"Lactose",dejaCrèche:true},
    contrat:{debut:"2024-10-01",jours:["Lundi","Mercredi","Vendredi"],
      heureArrivee:"08h00",heureDepart:"18h00",heuresHebdo:30,
      anneeComplete:false,vacances:"Non, pas pendant les vacances"},
    message:"Bonjour, mon fils Mathieu est actuellement à la crèche mais nous souhaitons le confier à une assistante maternelle à partir d'octobre. Il a une intolérance au lactose. Serait-il possible d'échanger ?",
  },
  {
    id:"d3",statut:"accepte",date:isoJour(new Date(Date.now()-12*86400000)),
    parent:{prenom:"Lucie",nom:"Bernard",email:"lucie.b@orange.fr",tel:"06 55 44 33 22",profession:"Enseignante"},
    enfant:{prenom:"Tom",naissance:"2021-04-20",allergies:"Aucune",dejaCrèche:false},
    contrat:{debut:"2024-09-02",jours:["Lundi","Mardi","Jeudi","Vendredi"],
      heureArrivee:"08h30",heureDepart:"16h30",heuresHebdo:32,
      anneeComplete:true,vacances:"Pendant les petites vacances uniquement"},
    message:"Bonjour, je suis enseignante et je cherche une assistante maternelle pour mon fils Tom. Vos horaires correspondent parfaitement aux miens.",
  },
  {
    id:"d4",statut:"refuse",date:isoJour(new Date(Date.now()-20*86400000)),
    parent:{prenom:"Marc",nom:"Petit",email:"marc.petit@sfr.fr",tel:"06 11 22 33 44",profession:"Commercial"},
    enfant:{prenom:"Emma",naissance:"2024-01-15",allergies:"Aucune",dejaCrèche:false},
    contrat:{debut:"2024-06-01",jours:["Lundi","Mardi","Mercredi","Jeudi","Vendredi"],
      heureArrivee:"07h00",heureDepart:"19h00",heuresHebdo:48,
      anneeComplete:true,vacances:"Oui, toutes les vacances"},
    message:"Bonjour, nous cherchons une solution d'urgence pour notre bébé Emma dès le 1er juin.",
  },
];

//

export const REPAS_CHOIX=[
  ["employeur","Le parent employeur","Il apporte les repas. Aucune indemnité n'est due."],
  ["assmat","Moi","Je fournis les repas. Une indemnité est due."],
  ["mixte","Les deux","À détailler dans le contrat (goûter, lait…)."],
];

export const JOURS_SEM=["Lundi","Mardi","Mercredi","Jeudi","Vendredi"];

export const PERIODES=[
  {id:"matin",l:"Matin",h:"07h00–08h30",ic:"🌅"},
  {id:"midi",l:"Méridien",h:"11h30–13h30",ic:"☀️"},
  {id:"soir",l:"Soir",h:"16h30–19h00",ic:"🌆"},
  {id:"mercredi",l:"Mercredi journée",h:"08h00–18h00",ic:"📅"},
  {id:"vacances",l:"Vacances scolaires",h:"Selon planning",ic:"🏖️"},
];

export const FORUM_POSTS=[
  {id:"p1",auteur:"Sylvie M.",ville:"Lyon",date:"Il y a 2h",titre:"Pajemploi - Régularisation fin d'année : comment vous faites ?",
    contenu:"Bonjour à toutes, je me retrouve avec une régularisation positive de 180€ pour une famille. Est-ce que vous la prélevez en une fois ou étalez sur 2-3 mois ?",
    reponses:8,tags:["Pajemploi","Salaire"],epingle:true},
  {id:"p2",auteur:"Nathalie B.",ville:"Bordeaux",date:"Il y a 4h",titre:"Activités pour 18 mois - vos idées ?",
    contenu:"Ma petite Inès a 18 mois et commence à s'ennuyer des mêmes activités. Est-ce que vous avez des idées créatives pour cet âge ?",
    reponses:14,tags:["Activités","Éveil"],epingle:false},
  {id:"p3",auteur:"Farida K.",ville:"Paris",date:"Il y a 1j",titre:"Contrat - Clause de rupture : est-ce obligatoire ?",
    contenu:"J'ai une famille qui veut enlever la clause de rupture du contrat. Est-ce légal ? Et que conseillez-vous ?",
    reponses:5,tags:["Contrat","Juridique"],epingle:false},
  {id:"p4",auteur:"Caroline D.",ville:"Nantes",date:"Il y a 2j",titre:"PMI - Renouvellement agrément : témoignages",
    contenu:"Mon renouvellement c'est dans 3 mois. Qu'est-ce que vous avez préparé comme dossier ? J'ai peur de manquer quelque chose.",
    reponses:22,tags:["PMI","Agrément"],epingle:false},
  {id:"p5",auteur:"Isabelle R.",ville:"Toulouse",date:"Il y a 3j",titre:"MAM - Qui est intéressée dans la région toulousaine ?",
    contenu:"Je cherche 1 ou 2 collègues pour monter une MAM. J'ai déjà un local en vue. Si vous êtes dans le secteur n'hésitez pas !",
    reponses:3,tags:["MAM","Réseau"],epingle:false},
];

export const BAREME_KM_2026={3:0.529,4:0.606,5:0.636,6:0.665,7:0.697}; // voiture, <=5000 km/an, baremes 2026 (geles)

// La convention encadre l'indemnite kilometrique par DEUX bornes, pas une :
// elle ne peut pas depasser le bareme fiscal (ci-dessus), et elle ne peut pas
// etre inferieure au bareme de l'administration. L'application ne connaissait
// que le plafond : un taux saisi sous le plancher passait sans un mot.
// Arrete du 29 mai 2026 (majoration temporaire des taux de l'article 10 du
// decret n° 2006-781), tranche jusqu'a 2 000 km, du 1er juin au 31 decembre
// 2026. Sans texte nouveau, les taux anterieurs redeviennent applicables au
// 1er janvier 2027.

export const PLANCHER_KM_CONV={3:0.33,4:0.33,5:0.33,6:0.42,7:0.42};

export const FAQ_DATA=[
  {cat:"Pajemploi",q:"Comment exporter mes données vers Pajemploi ?",
   r:"Dans Paie & Contrats > Facturation & Pajemploi, cliquez sur 'Exporter vers Pajemploi'. TiMat génère un récapitulatif avec toutes les données nécessaires (heures, salaire net, indemnités) prêtes à saisir sur pajemploi.urssaf.fr entre le 25 et le 5 du mois suivant."}, // RENAME NAV P9
  {cat:"Pajemploi",q:"Mon calcul de salaire est-il conforme à la convention collective ?",
   r:"Oui. TiMat applique automatiquement les règles de la CCN des particuliers employeurs : mensualisation, heures complémentaires, majorées au-delà de 45h/semaine, indemnités d'entretien selon le barème URSSAF 2025."},
  {cat:"Contrats",q:"Puis-je modifier un contrat en cours ?",
   r:"Oui, via un avenant. Dans Paie & Contrats > Contrats & Avenants, choisissez 'Avenant - Modification d'horaires' ou 'Avenant - Revalorisation salaire'. L'avenant est daté et tracé automatiquement."}, // RENAME NAV P9
  {cat:"Contrats",q:"Que se passe-t-il si un parent ne signe pas le contrat ?",
   r:"Relancez via la messagerie TiMat. Sans signature, le contrat n'a pas de valeur légale. TiMat vous alerte si un contrat reste non signé plus de 7 jours."},
  {cat:"PMI",q:"Comment préparer ma visite de renouvellement d'agrément ?",
   r:"Dans Documents, exportez votre 'Dossier PMI complet' : il contient l'historique des enfants accueillis, les bilans trimestriels, le planning périscolaire et vos échanges avec la PMI. Tout est daté et structuré."},
  {cat:"Finances",q:"Comment calculer le solde de tout compte ?",
   r:"Dans Paie & Contrats > Solde de tout compte. Saisissez la date de fin et le motif. TiMat calcule automatiquement l'ICCP (indemnité compensatrice de congés payés) et l'indemnité de préavis selon la CCN."}, // RENAME NAV P9
  {cat:"RGPD",q:"Comment supprimer mon compte et toutes mes données ?",
   r:"Dans Paramètres → Supprimer mon compte. La suppression est immédiate et définitive (RGPD, droit à l'effacement, article 17). Assistante maternelle : tout votre dossier part avec le compte, y compris les données des enfants accueillis et vos fichiers. Parent : vos données personnelles sont effacées et vous êtes détaché du dossier, mais le registre de présence et les bulletins restent chez l'assistante maternelle — ce sont ses pièces justificatives, elle en a besoin pour se défendre en cas de litige."},
  {cat:"RGPD",q:"Où sont stockées mes données ?",
   r:"Exclusivement en France, sur des serveurs OVHcloud à Paris via Supabase. Aucun transfert hors de l'Union Européenne."},
  {cat:"Abonnement",q:"Puis-je changer d'offre ou résilier ?",
   r:"Oui, à tout moment depuis Paramètres → Mon abonnement. Pas d'engagement, pas de frais de résiliation. Si vous résiliez, votre accès Pro reste actif jusqu'à la fin de la période payée."},
  {cat:"Abonnement",q:"Comment fonctionne le parrainage ?",
   r:"Dans Parrainage, copiez votre lien personnel. Quand une collègue s'inscrit et passe au Pro, vous gagnez chacune 1 mois gratuit. Vos filleules apparaissent dans votre tableau de parrainage."},
];

export const backupCurrentConfig = async (reason) => {
  try {
    const {data, error} = await supabase
      .from('app_config').select('config').eq('id','main').maybeSingle();
    if (error) {
      console.warn('[TiMat backup] Lecture config échouée, backup ignoré:', error.message);
      return {ok:false, error:error.message};
    }
    if (!data || data.config == null) {
      console.log('[TiMat backup] Aucune config existante à sauvegarder (1ère fois ?)');
      return {ok:true, skipped:true};
    }
    // config peut être un objet (JSONB) ou une string (fallback TEXT historique)
    let cfgObj = data.config;
    if (typeof cfgObj === 'string') {
      try { cfgObj = JSON.parse(cfgObj); }
      catch(e) {
        console.warn('[TiMat backup] config en string non parsable, backup ignoré');
        return {ok:false, error:'config string non parsable'};
      }
    }
    const {data:{user}={}} = await supabase.auth.getUser();
    const {error: insErr} = await supabase
      .from('app_config_backup').insert({config: cfgObj, reason, created_by: user?.id ?? null});
    if (insErr) {
      console.warn('[TiMat backup] Insertion backup échouée (Save continue):', insErr.message);
      return {ok:false, error:insErr.message};
    }
    console.log('[TiMat backup] ✅ Backup créé (reason='+reason+')');
    return {ok:true};
  } catch(e) {
    console.warn('[TiMat backup] Exception backup (Save continue):', e.message);
    return {ok:false, error:e.message||'exception inconnue'};
  }
};

// Ne garde que ce qui DIFFERE des defauts du code -> les defauts non modifies
// restent pilotes par le code (une modif de code s'affiche toujours), et le
// back-office continue de fonctionner (il enregistre uniquement tes surcharges).
