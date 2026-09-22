import { useState, useRef, useEffect, useMemo, lazy, Suspense } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../lib/supabase.js";
import qrcode from "qrcode-generator";

/* ========== MODE HORS LIGNE ==========

   Deux besoins distincts, donc deux mecanismes separes.

   A. CONSULTER hors ligne — les donnees deja lues sont recopiees dans le
      navigateur avec la DATE de la copie. Quand le reseau ne repond pas, on
      les ressort en disant toujours de quand elles datent. Une donnee ancienne
      affichee sans sa date est une donnee qu'on croit fraiche a tort : c'est
      le seul vrai danger de la consultation hors ligne.

   B. POINTER hors ligne — l'action part dans une file d'attente locale, puis
      est rejouee des le retour du reseau. Une action en file n'est PAS
      enregistree : l'application doit le dire, pas le laisser croire.

   Le conflit est traite au moment du rejeu, jamais avant : si le parent a
   touche au meme pointage pendant la coupure, la file ne l'ecrase pas. */

// Barèmes, jeux de démonstration et helpers que seuls les morceaux paresseux
// utilisent : ils vivent dans src/socle.jsx, hors du morceau d'entrée.
const MDP_MIN = 8;
export const MDP_AIDE = "8 caractères minimum, lettres et chiffres";
// LES MOTS DE PASSE DEJA FUITES.
//
// Supabase sait refuser un mot de passe qui figure dans les fuites connues,
// mais reserve la fonction a son plan Pro. La meme technique est realisable
// ici, et gratuitement.
//
// CE QUI PART, EXACTEMENT : les CINQ PREMIERS caracteres de l'empreinte SHA-1
// du mot de passe. Jamais le mot de passe, jamais l'empreinte entiere. Ces cinq
// caracteres correspondent a des centaines de milliers de mots de passe
// differents ; le service renvoie toute la liste des empreintes qui commencent
// ainsi, et c'est NOTRE page qui cherche dedans. Le service ne peut pas savoir
// laquelle nous interessait. L'en-tete Add-Padding fait en sorte que la taille
// de la reponse ne le trahisse pas non plus.
//
// ON LAISSE PASSER EN CAS DE PANNE. Un controle qui empeche de creer un compte
// parce qu'un service tiers est lent, c'est pire que pas de controle du tout :
// il faut que l'inscription marche toujours. D'ou le delai court et le
// « verifie:false » qui ne bloque rien.
const MDP_FUITE_DELAI_MS = 3000;
const MDP_FUITE_URL = "https://api.pwnedpasswords.com/range/";
export const motDePasseCompromis = async (mdp) => {
  const raté = { verifie: false, occurrences: 0 };
  try {
    if (!mdp || typeof crypto === "undefined" || !crypto.subtle) return raté;
    const brut = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(mdp));
    const sha = Array.from(new Uint8Array(brut)).map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
    const prefixe = sha.slice(0, 5), suffixe = sha.slice(5);
    const minuteur = new AbortController();
    const t = setTimeout(() => minuteur.abort(), MDP_FUITE_DELAI_MS);
    let reponse;
    try {
      reponse = await fetch(MDP_FUITE_URL + prefixe, {
        headers: { "Add-Padding": "true" },
        signal: minuteur.signal,
      });
    } finally { clearTimeout(t); }
    if (!reponse || !reponse.ok) return raté;
    const corps = await reponse.text();
    for (const ligne of corps.split("\n")) {
      const [s, n] = ligne.trim().split(":");
      if (s === suffixe) return { verifie: true, occurrences: Number(n) || 0 };
    }
    return { verifie: true, occurrences: 0 };
  } catch (e) { return raté; }
};

// Le message. Separe de la verification pour qu'il n'existe qu'une fois.
export const messageMotDePasseFuite = (occurrences) =>
  "Ce mot de passe figure dans " + (occurrences > 1000 ? "plus de mille" : occurrences)
  + " fuite" + (occurrences > 1 ? "s" : "") + " de données connues. Il est essayé en premier par ceux qui forcent les comptes : choisissez-en un autre.";

export const verifierMotDePasse = (mdp) => {
  const m = mdp || "";
  if (m.length < MDP_MIN) return `Le mot de passe doit faire au moins ${MDP_MIN} caractères.`;
  if (!/[a-zA-Z]/.test(m) || !/[0-9]/.test(m)) return "Le mot de passe doit contenir au moins une lettre et un chiffre.";
  return null;
};

export const CLE_HL="timat:hl:";
const CLE_FILE=CLE_HL+"file";
const MAX_FILE=200;

export const _lireJSON=(cle)=>{try{const t=localStorage.getItem(cle);return t?JSON.parse(t):null;}catch{return null;}};
export const _ecrireJSON=(cle,v)=>{try{localStorage.setItem(cle,JSON.stringify(v));return true;}catch{return false;}};

// A. Copie locale des donnees consultables, horodatee.
const oublierHorsLigne=(cle)=>{try{localStorage.removeItem(CLE_HL+cle);}catch{}};

// B. File d'attente des actions faites sans reseau.
// Ces deux-la etaient parties dans le socle : le decoupage regarde qui utilise
// quoi, pas ce qui forme un tout. Le module hors ligne s'est retrouve a cheval
// sur deux fichiers, et son test — qui le decoupe et l'execute — est tombe. Il
// reste donc entier ici.
export const memoriserHorsLigne=(cle,valeur)=>_ecrireJSON(CLE_HL+cle,{le:new Date().toISOString(),valeur});
// Rend {le,valeur} ou null. L'appelant DOIT afficher `le` : c'est la regle.

export const lireHorsLigne=(cle)=>{
  const o=_lireJSON(CLE_HL+cle);
  return o&&o.le&&"valeur" in o?o:null;
};

export const fileHorsLigne=()=>{const f=_lireJSON(CLE_FILE);return Array.isArray(f)?f:[];};
const _ecrireFile=(f)=>{
  _ecrireJSON(CLE_FILE,f.slice(-MAX_FILE));
  try{window.dispatchEvent(new CustomEvent("timat:file-hors-ligne"));}catch{}
};
export const filerOperation=(op)=>{
  const f=fileHorsLigne();
  // Une seule entree par cle : re-pointer le meme jour remplace, n'empile pas.
  const sansDoublon=op.cle?f.filter(x=>x.cle!==op.cle):f;
  const entree={id:"hl"+Date.now()+"-"+Math.random().toString(36).slice(2,7),faitLe:new Date().toISOString(),conflit:null,...op};
  sansDoublon.push(entree);
  _ecrireFile(sansDoublon);
  return entree;
};
const retirerDeLaFile=(id)=>_ecrireFile(fileHorsLigne().filter(x=>x.id!==id));
const marquerConflit=(id,raison)=>_ecrireFile(fileHorsLigne().map(x=>x.id===id?{...x,conflit:raison}:x));

// Le reseau a-t-il fait defaut ? Une erreur metier (droits, contrainte) n'est
// PAS une coupure : la mettre en file la ferait echouer indefiniment.
const panneReseau=(e)=>{
  if(typeof navigator!=="undefined"&&navigator.onLine===false)return true;
  const m=String(e&&(e.message||e)||"");
  return /failed to fetch|networkerror|network request failed|load failed|fetch error|timeout/i.test(m);
};

// Le point de passage unique de l'enregistrement d'un pointage.
// Rend {etat:"envoye"} ou {etat:"en-file"} ou {etat:"erreur",message}.
async function enregistrerPointage(ligne){
  const cle="pointage:"+ligne.enfant_id+":"+ligne.date;
  if(typeof navigator!=="undefined"&&navigator.onLine===false){
    filerOperation({table:"pointages",cle,charge:ligne});
    return{etat:"en-file"};
  }
  try{
    const{error}=await supabase.from("pointages").upsert(ligne,{onConflict:"enfant_id,date"});
    if(error){
      if(panneReseau(error)){filerOperation({table:"pointages",cle,charge:ligne});return{etat:"en-file"};}
      return{etat:"erreur",message:error.message};
    }
    return{etat:"envoye"};
  }catch(e){
    if(panneReseau(e)){filerOperation({table:"pointages",cle,charge:ligne});return{etat:"en-file"};}
    return{etat:"erreur",message:String(e&&e.message||e)};
  }
}

// Rejeu de la file. Rend {envoyees,conflits,restantes}.
// Un seul rejeu a la fois.
//
// Deux rejeux simultanes renvoient la MEME entree deux fois, et pointage_borne()
// bascule arrivee -> depart : le second appel refermerait la journee a l'heure
// de l'arrivee, soit zero minute travaillee. Deux evenements « online » de suite
// suffisent a le declencher, et un reseau qui vacille en envoie plus que ca.
let _rejeuEnCours=null;
async function rejouerFile(){
  if(_rejeuEnCours)return _rejeuEnCours;
  const course=(async()=>{
  let envoyees=0,conflits=0;
  for(const e of fileHorsLigne()){
    // Pointage fait a la borne pendant une coupure. Il part par la meme
    // fonction serveur qu'en ligne — donc le code est verifie pour de bon — et
    // il porte L'HEURE OU LE PARENT A TOUCHE L'ECRAN, pas celle du rejeu.
    if(e.rpc==="pointage_borne"){
      try{
        const{data,error}=await supabase.rpc("pointage_borne",{
          p_enfant_id:e.charge.enfant_id,p_code:e.charge.code,
          p_heure:e.charge.heure,p_date:e.charge.date});
        if(error){
          if(panneReseau(error))break;
          marquerConflit(e.id,error.message);conflits++;continue;
        }
        if(!data?.success){marquerConflit(e.id,data?.error||"refusé au rejeu");conflits++;continue;}
        retirerDeLaFile(e.id);envoyees++;
      }catch(err){
        if(panneReseau(err))break;
        marquerConflit(e.id,String(err&&err.message||err));conflits++;
      }
      continue;
    }
    if(e.table!=="pointages"){retirerDeLaFile(e.id);continue;}
    try{
      // Le parent a-t-il touche a ce pointage pendant la coupure ?
      const{data:existant}=await supabase.from("pointages")
        .select("modified_by_parent_at,valide_parent")
        .eq("enfant_id",e.charge.enfant_id).eq("date",e.charge.date).maybeSingle();
      const touchePar=existant&&existant.modified_by_parent_at;
      if(touchePar&&String(touchePar)>String(e.faitLe)){
        marquerConflit(e.id,"Le parent a corrige ce pointage pendant la coupure.");
        conflits++;continue;
      }
      const{error}=await supabase.from("pointages").upsert(e.charge,{onConflict:"enfant_id,date"});
      if(error){
        if(panneReseau(error))break; // toujours coupe : on s'arrete, la file reste
        marquerConflit(e.id,error.message);conflits++;continue;
      }
      retirerDeLaFile(e.id);envoyees++;
    }catch(err){
      if(panneReseau(err))break;
      marquerConflit(e.id,String(err&&err.message||err));conflits++;
    }
  }
  return{envoyees,conflits,restantes:fileHorsLigne().length};
  })();
  _rejeuEnCours=course;
  try{return await course;}finally{_rejeuEnCours=null;}
}


// ========== AUDIT LOG + CONSENT P8 ==========
// Helpers RGPD : logAction (audit_log append-only) et logConsent (consentements RGPD)
// Tous les appels sont non-bloquants : si l'INSERT échoue, on warn en console mais l'app continue.
export async function logAction(action, opts={}){
  try{
    const { table_name=null, record_id=null, user_id=null } = opts;
    let uid = user_id;
    if(!uid){
      try{
        const { data:{user} } = await supabase.auth.getUser();
        uid = user?.id || null;
      } catch{}
    }
    await supabase.from('audit_log').insert({
      user_id: uid,
      action,
      table_name,
      record_id: record_id ? String(record_id) : null,
    });
  } catch(e){ console.warn('[audit_log] insert failed:', e?.message); }
}

// NOTIFICATIONS - helper generique reutilisable pour TOUT evenement (versement, signature, bulletin, pointage...).
// Insert inter-comptes (un parent notifie son assmat et inversement) via la RPC SECURITY DEFINER
// public.create_notification, qui verifie le lien parent<->assmat avant d'inserer. Echoue en silence.
// LE point unique d'une notification. La notification dans l'application ET le
// push partent d'ici, ensemble.
//
// Le push aurait pu etre ajoute aux huit endroits qui notifient. Ils auraient
// diverge : c'est exactement ce qui s'est produit avec le decompte des jours,
// recopie dans trois bulletins qui ne donnaient pas le meme resultat. En le
// mettant ici, ajouter un neuvieme evenement demain ne peut plus revenir a
// oublier le push.
//
// Le courriel reste a l'appelant : son contenu depend de l'evenement.
export async function createNotification({userId,type="info",titre="",page="accueil",meta=null,corps=""}){
  if(!userId)return;
  try{
    await supabase.rpc("create_notification",{
      p_user_id:userId, p_type:type, p_titre:titre, p_page:page, p_meta:meta,
    });
  }catch(e){ console.warn('[notification] non creee:', e?.message); }
  // Sans attente : un push qui echoue ne doit jamais retenir l'action en cours.
  envoyerPush({userId,titre,corps,url:"/?page="+encodeURIComponent(page),tag:type})
    .catch(e=>console.warn('[push] non envoye:',e?.message));
}

async function logConsent(user_id, consents={}){
  try{
    await supabase.from('consentements').insert({
      user_id,
      version_politique: '1.0',
      consent_politique_confidentialite: !!consents.politique,
      consent_mentions_legales: !!consents.cgu,
      consent_newsletter: !!consents.newsletter,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    });
  } catch(e){ console.warn('[consentements] insert failed:', e?.message); }
}

// EMAILS NOTIFICATIONS P13 - helper centralise pour envoi emails (signature, rappels, invitations)
// Mode actuel : POST vers /api/send-email (a creer sur Vercel comme Edge Function avec Resend).
// Tant que Resend n'est pas configure, l'appel echoue silencieusement et on logge dans audit_log
// pour pouvoir relancer ces emails plus tard (rappel : ajouter `email_log` table optionnelle).
export async function sendNotificationEmail({type,to,subject,template,vars={}}){
  try{
    const payload={type,to,subject,template,vars,from:"TiMat <noreply@timat.app>"};
    const res=await fetch("/api/send-email",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify(payload),
    });
    if(!res.ok){
      const txt=await res.text().catch(()=>"-");
      console.warn("[email] echec envoi :",res.status,txt);
      await logAction("email_send_failed",{table_name:"emails",record_id:type});
      return{success:false,error:"HTTP "+res.status,details:txt};
    }
    const data=await res.json().catch(()=>({}));
    await logAction("email_sent",{table_name:"emails",record_id:type});
    return{success:true,data};
  }catch(e){
    // Mode dev / API non deployee : on logge et on continue
    console.warn("[email] non envoye (API absente ?) :",e.message);
    await logAction("email_send_unavailable",{table_name:"emails",record_id:type});
    return{success:false,error:e.message};
  }
}

/* ========== NOTIFICATIONS ==========

   Le push ne s'envoie pas depuis les ecrans : il part de createNotification(),
   qui est deja le point de passage de toute notification. Ajouter un evenement
   demain ne peut donc pas revenir a oublier le push.

   Ce qui atteint qui :
     — dans l'application : toujours ;
     — par courriel        : toujours, si le destinataire a une adresse ;
     — par push            : seulement sur les appareils abonnes.

   Le push ne remplace jamais le courriel. Sur iPhone il n'existe que si TiMat
   a ete ajoute a l'ecran d'accueil : s'en remettre a lui seul reviendrait a ne
   prevenir qu'une partie des gens, sans savoir laquelle. */

const VAPID_PUBLIQUE="BGrkaQL78BMZ8LClsnl_t05IYDklLYrUN7I-GvXatBHomnvJ0dkB84xQaTP7RVdWtTmE6i5AVdz7cJ_QweB1U7g";

// Le navigateur exige des octets, pas une chaine. L'ancienne version passait la
// cle telle quelle, au format base64 ordinaire (avec + et /) : l'abonnement
// echouait avant meme de commencer.
const cleEnOctets=(base64url)=>{
  const bourrage="=".repeat((4-base64url.length%4)%4);
  const base64=(base64url+bourrage).replace(/-/g,"+").replace(/_/g,"/");
  const brut=atob(base64);
  const octets=new Uint8Array(brut.length);
  for(let i=0;i<brut.length;i++)octets[i]=brut.charCodeAt(i);
  return octets;
};

const estIOS=()=>/iphone|ipad|ipod/i.test(navigator.userAgent||"");
// Sur iPhone, Apple ne donne le push QU'AUX applications ajoutees a l'ecran
// d'accueil. Ce n'est pas un choix de TiMat, et c'est la premiere chose a dire
// a quelqu'un dont le bouton ne fait rien.
const installeeEcranAccueil=()=>window.matchMedia("(display-mode: standalone)").matches
  ||window.navigator.standalone===true;

// Rend un etat precis, jamais un simple vrai/faux : chaque cas demande une
// phrase differente a l'ecran.
//   "pret" | "impossible-ios" | "non-supporte" | "refuse" | "erreur"
export const etatPush=()=>{
  if(!("Notification" in window)||!("serviceWorker" in navigator)||!("PushManager" in window)){
    return estIOS()&&!installeeEcranAccueil()?"impossible-ios":"non-supporte";
  }
  if(estIOS()&&!installeeEcranAccueil())return "impossible-ios";
  if(Notification.permission==="denied")return "refuse";
  return "pret";
};

const nomAppareil=()=>{
  const ua=navigator.userAgent||"";
  const systeme=/android/i.test(ua)?"Android":/iphone|ipad|ipod/i.test(ua)?"iPhone ou iPad"
    :/mac os/i.test(ua)?"Mac":/windows/i.test(ua)?"Windows":"Ordinateur";
  const navigateur=/edg\//i.test(ua)?"Edge":/chrome|crios/i.test(ua)?"Chrome"
    :/firefox|fxios/i.test(ua)?"Firefox":/safari/i.test(ua)?"Safari":"navigateur";
  return systeme+" · "+navigateur;
};

// Rend {etat, message}. L'appelant AFFICHE le message tel quel : c'est ce qui
// empeche d'annoncer « Notifications activees » quand elles ne le sont pas.
async function activerPush(userId){
  const etat=etatPush();
  if(etat==="impossible-ios")return{etat,message:"Sur iPhone, les notifications ne fonctionnent que si TiMat a été ajouté à votre écran d'accueil. Ajoutez-le, puis revenez ici."};
  if(etat==="non-supporte")return{etat,message:"Ce navigateur ne gère pas les notifications. Vous continuerez à les recevoir par e-mail."};
  if(etat==="refuse")return{etat,message:"Les notifications sont bloquées pour TiMat dans les réglages de votre navigateur. Il faut les y réautoriser."};
  if(!userId)return{etat:"erreur",message:"Vous devez être connectée pour activer les notifications."};
  try{
    const permission=await Notification.requestPermission();
    if(permission!=="granted")return{etat:"refuse",message:"Notifications refusées. Vous continuerez à les recevoir par e-mail."};
    const reg=await navigator.serviceWorker.ready;
    const abo=await reg.pushManager.getSubscription()
      ||await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:cleEnOctets(VAPID_PUBLIQUE)});
    const json=abo.toJSON();
    const{error}=await supabase.from("push_subscriptions").upsert({
      user_id:userId,endpoint:abo.endpoint,subscription:json,appareil:nomAppareil(),
    },{onConflict:"endpoint"});
    // L'enregistrement qui echoue est exactement ce qui se passait avant, en
    // silence. Il doit se voir.
    if(error)return{etat:"erreur",message:"L'abonnement n'a pas pu être enregistré : "+error.message};
    return{etat:"actif",message:"Notifications activées sur cet appareil ("+nomAppareil()+")."};
  }catch(e){
    return{etat:"erreur",message:"Les notifications n'ont pas pu être activées : "+(e&&e.message||e)};
  }
}

async function desactiverPush(userId){
  try{
    const reg=await navigator.serviceWorker.ready;
    const abo=await reg.pushManager.getSubscription();
    if(abo){
      await supabase.from("push_subscriptions").delete().eq("endpoint",abo.endpoint);
      await abo.unsubscribe();
    }
    return{etat:"inactif",message:"Notifications désactivées sur cet appareil."};
  }catch(e){return{etat:"erreur",message:String(e&&e.message||e)};}
}

// Envoi d'un push. Le serveur verifie le droit de notifier : on lui passe le
// jeton de session, jamais une simple confiance dans le destinataire annonce.
async function envoyerPush({userId,titre,corps,url,tag}){
  if(!userId||!titre)return{envoyes:0};
  try{
    const{data:{session}}=await supabase.auth.getSession();
    if(!session?.access_token)return{envoyes:0};
    const rep=await fetch("/api/send-push",{
      method:"POST",
      headers:{"Content-Type":"application/json","Authorization":"Bearer "+session.access_token},
      body:JSON.stringify({userId,titre,corps,url,tag}),
    });
    if(!rep.ok)return{envoyes:0,erreur:"HTTP "+rep.status};
    return await rep.json();
  }catch(e){return{envoyes:0,erreur:String(e&&e.message||e)};}
}


// EMAILS TEMPLATES P13 - templates pretes a brancher (HTML simple, surchargeable depuis backoffice)
export const EMAIL_TEMPLATES={
  signature_asmat_signed:{
    subject:"Votre assistante maternelle a signe le contrat",
    html:(v)=>"<h2>Bonjour "+H(v.parent_prenom)+",</h2>"
      +"<p>"+H(v.asmat_prenom)+" vient de signer electroniquement le contrat de "+H(v.enfant_prenom)+".</p>"
      +"<p>Connectez-vous a TiMat pour le signer a votre tour :</p>"
      +"<p><a href='"+H(v.url)+"' style='display:inline-block;background:#E49178;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700'>Signer le contrat</a></p>",
  },
  signature_parent_signed:{
    subject:"Le parent a signe le contrat",
    html:(v)=>"<h2>Bonjour "+H(v.asmat_prenom)+",</h2>"
      +"<p>"+H(v.parent_prenom)+" "+H(v.parent_nom)+" vient de signer le contrat de "+H(v.enfant_prenom)+".</p>"
      +"<p>Le contrat est finalise et archive dans vos documents.</p>",
  },
  signature_reminder:{
    subject:"Rappel : signature de contrat en attente",
    html:(v)=>"<p>Le contrat de "+H(v.enfant_prenom)+" attend votre signature depuis le "+v.date+".</p>"
      +"<p><a href='"+H(v.url)+"'>Signer maintenant</a></p>",
  },
  bulletin_sent:{
    subject:"Votre bulletin de salaire est disponible",
    html:(v)=>"<p>Bonjour "+H(v.parent_prenom)+",</p>"
      +"<p>Le bulletin de salaire pour "+v.mois+" est disponible dans votre espace TiMat.</p>",
  },
  invitation_parent:{
    subject:"Invitation : votre assistante maternelle vous invite sur TiMat",
    html:(v)=>"<h2>Bonjour "+H(v.parent_prenom)+",</h2>"
      +"<p>"+H(v.asmat_prenom)+" vous invite a rejoindre TiMat pour suivre "+H(v.enfant_prenom)+" : sa journee en direct, vos montants Pajemploi prets a declarer, et tous vos documents au meme endroit.</p>"
      +"<p>C'est 100% gratuit pour vous, sans carte bancaire.</p>"
      +"<p><a href='"+H(v.url)+"' style='display:inline-block;background:#E49178;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700'>Rejoindre TiMat</a></p>"
      +"<p style='font-size:12px;color:#888;margin-top:18px'>Envie d'en savoir plus avant de creer votre compte ? <a href='https://www.timat.app/brochure-parents.html' style='color:#C84B31'>Decouvrez ce que TiMat va changer pour vous</a>.</p>",
  },
  // POINTAGE WORKFLOW P14E - notification au parent qu'un pointage attend sa validation
  pointage_a_valider:{
    subject:"Un pointage attend votre validation",
    html:(v)=>"<h2>Bonjour "+H(v.parent_prenom)+",</h2>"
      +"<p>L'assistante maternelle a enregistre le pointage de "+H(v.enfant_prenom)+" du "+v.date+".</p>"
      +"<p>Duree d'accueil : <strong>"+v.duree+"</strong></p>"
      +"<p>Merci de valider ce pointage dans votre application :</p>"
      +"<p><a href='"+H(v.url)+"' style='display:inline-block;background:#E49178;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700'>Valider le pointage</a></p>"
      +"<p style='font-size:11px;color:#888;margin-top:24px'>Si vous oubliez, un rappel automatique sera envoye sous 3 jours.</p>",
  },
  pointage_rappel:{
    subject:"Rappel : pointage en attente de validation depuis 3 jours",
    html:(v)=>"<p>Bonjour "+H(v.parent_prenom)+",</p>"
      +"<p>Un pointage de "+H(v.enfant_prenom)+" est en attente de votre validation depuis le "+v.date+".</p>"
      +"<p><a href='"+H(v.url)+"'>Valider maintenant</a></p>",
  },
  // VERSEMENTS P34 - notification d'un versement enregistre (parent->assmat ou assmat->parent)
  versement_recu:{
    subject:"Nouveau versement enregistre sur TiMat",
    html:(v)=>"<h2>Bonjour "+H(v.prenom)+",</h2>"
      +"<p>"+H(v.qui)+" a enregistre un versement de <strong>"+v.montant+"</strong>"+(v.enfant_prenom?(" pour "+v.enfant_prenom):"")+" le "+v.date+".</p>"
      +"<p>Retrouvez le detail dans l'onglet Versements de votre espace TiMat.</p>",
  },
};

// Couleur de chaque role, d'apres les logos : bleu pour l'assistante
// maternelle (c'est aussi celui de la landing), corail / terracotta pour le
// parent employeur, sauge pour la MAM et la creche a venir. Ces valeurs sont
// posees sur la pastille d'avatar sous du texte blanc : elles doivent tenir
// 4,5:1, ce que ne faisaient ni #E49178 (2,44) ni #B8622F (4,35).
// Les themes d'evenement du calendrier. Une seule table : la couleur, l'icone
// et le libelle etaient recopies dans quatre rendus differents, et l'un d'eux
// testait « conge » quand le code ecrit « cng » — les conges y sortaient donc
// en bleu neutre au lieu du vert, sans que rien ne le signale.
export const TYPES_EV={
  rdv:{l:"Rendez-vous",ic:"📌",fond:"var(--Bp)",texte:"var(--B)"},
  cng:{l:"Congé",ic:"🌴",fond:"var(--Gp)",texte:"var(--G)",sansAccueil:true},
  abs:{l:"Absence",ic:"🤒",fond:"var(--Rp)",texte:"var(--R)"},
  mal:{l:"Maladie",ic:"🤒",fond:"var(--Rp)",texte:"var(--R)",sansAccueil:true},
  fer:{l:"Fermeture",ic:"🏠",fond:"var(--Rp)",texte:"var(--R)",sansAccueil:true},
  form:{l:"Formation (temps d'accueil)",ic:"📔",fond:"var(--Pp)",texte:"var(--P)",sansAccueil:true},
  formh:{l:"Formation (hors accueil)",ic:"📔",fond:"var(--Pp)",texte:"var(--P)"},
  sor:{l:"Sortie",ic:"🚌",fond:"var(--Sp)",texte:"var(--S)"},
  ferie:{l:"Jour férié",ic:"🏛️",fond:"var(--Rp)",texte:"var(--R)"},
  anniv:{l:"Anniversaire",ic:"🎁",fond:"var(--Tp)",texte:"var(--T)"},
};
export const typeEv=(t)=>TYPES_EV[t]||TYPES_EV.rdv;

// Qualite du repas. Le libelle, la couleur et la pastille etaient recopies
// dans cinq rendus, chacun avec sa propre logique — et deux d'entre eux se
// trompaient de couleur : l'un ecrivait la meme dans les deux branches de son
// ternaire, l'autre affichait « Peu mange » en vert. La pastille remplace
// l'emoji 🟡, jaune vif sur tous les telephones et etranger a la palette : une
// pastille CSS prend la couleur du theme et suit le mode sombre.
export const QUALITE_REPAS={
  bien:{l:"Bon appétit",teinte:"var(--S)",fond:"var(--Sp)"},
  peu:{l:"Peu mangé",teinte:"var(--P)",fond:"var(--Pp)"},
  refus:{l:"Refus",teinte:"var(--R)",fond:"var(--Rp)"},
};
// Une pastille de couleur, lisible en mode sombre et alignee sur la palette.
// Elle remplace les emoji 🟠 / 🔴 / 🟡, dont la teinte est fixee par le
// telephone et jure avec le reste de l'interface.
// Qualite de la sieste. Meme histoire que les repas : le vocabulaire etait
// recopie a deux endroits, avec un ambre ecrit en dur et « Agitee » affichee
// en vert dans l'un des deux.
export function Pastille({couleur,taille=9}){
  return <span style={{width:taille,height:taille,borderRadius:"50%",background:couleur,
    display:"inline-block",flex:"0 0 auto",verticalAlign:"middle"}}/>;
}

// Avertit quand le taux horaire du contrat passe sous le plancher legal.
// C'est le genre d'erreur qu'une assistante maternelle ne peut pas rattraper
// seule : elle produit des bulletins entiers sur une remuneration illegale.
// Paie, contrats, versements : tout ce bloc vit dans src/gestion.jsx et
// n'est téléchargé qu'à l'ouverture de l'onglet.
export function PastilleRepas({q,taille=12}){
  const etat=QUALITE_REPAS[q];
  if(!etat)return null;
  return <span className="badge"style={{background:etat.fond,color:etat.teinte,fontSize:taille,
    display:"inline-flex",alignItems:"center",gap:7,fontWeight:600}}>
    <Pastille couleur={etat.teinte}/>
    {etat.l}
  </span>;
}

// Retenue pour absence de l'assistante maternelle.
// Convention collective de la branche du secteur des particuliers employeurs
// et de l'emploi a domicile (IDCC 3239), article 111 « Deduction des periodes
// d'absence » : deux formules, selon que l'accueil porte sur une annee
// complete (52 semaines) ou incomplete (46 semaines ou moins).
//
//   annee complete   : salaire mensualise x heures non travaillees / heures
//                      qui auraient ete reellement travaillees dans le mois
//   annee incomplete : salaire mensualise x jours non travailles / jours qui
//                      auraient du etre reellement travailles
//
// Les periodes d'absence, les semaines de non-accueil et les jours feries
// chomes correspondant a un jour habituellement travaille sont comptes dans le
// denominateur : c'est ce qui rend la retenue plus faible qu'une simple regle
// de trois sur les heures effectivement faites.
//
// La formation n'entre PAS dans ce calcul. Suivie sur le temps d'accueil, la
// remuneration de l'assistante maternelle est maintenue, et l'employeur
// facilitateur est rembourse ; la deduire couterait a l'assistante maternelle
// un salaire auquel elle a droit.
export const ALLOC_FORMATION_H = 5.57;
// Plan de developpement des competences : jusqu'a 58 heures par an.
export const ALLOC_FORMATION_PLAFOND_H = 58;
const COULEUR_ROLE={asmat:"#2E5F8A",parent:"#B85536",mam:"#4E6B57"};

// Icones dessinees, en remplacement des emoji. Un emoji change d'aspect selon
// le telephone, ne se recolore pas et grossit mal ; un trace reste net partout
// et prend la teinte de son contexte.
const TRACES = {
  pointer:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  cahier:'<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H19v16H5.5A1.5 1.5 0 0 1 4 18.5Z"/><path d="M8 9h7M8 13h5"/>',
  messages:'<path d="M20 12a8 8 0 0 1-11.6 7.1L4 20l.9-4.4A8 8 0 1 1 20 12Z"/>',
  paie:'<circle cx="12" cy="12" r="9"/><path d="M14.5 9.5a2.5 2.5 0 0 0-4.5 1.5c0 2.5 4.5 1.5 4.5 4a2.5 2.5 0 0 1-4.5 1.5M12 7v10"/>',
  planning:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 11h18"/>',
  documents:'<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"/><path d="M14 3v5h5"/>',
  accueil:'<path d="m3 10 9-7 9 7v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
  enfant:'<circle cx="12" cy="9" r="4"/><path d="M5 21a7 7 0 0 1 14 0"/>',
  admin:'<path d="M3 7h6l2 2h10v10a2 2 0 0 1-2 2H3Z"/>',
  outils:'<path d="m12 3 2.6 5.6 6.1.8-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6L3.3 9.4l6.1-.8Z"/>',
  reglages:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 9 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z"/>',
  courrier:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  signature:'<path d="M3 19c3 0 3-9 6-9s3 6 6 6 3-4 6-4"/><path d="M3 21h18"/>',
  crayon:'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  etoiles:'<path d="M12 3.5 13.7 8l4.5 1.7-4.5 1.7L12 16l-1.7-4.6L5.8 9.7 10.3 8Z"/><path d="M18.5 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7Z"/>',
  aide:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.6 2.6 0 0 1 5 .9c0 1.7-2.5 2.1-2.5 3.6M12 17.5h.01"/>',
  pousse:'<path d="M12 21v-8"/><path d="M12 13c0-3.3 2.7-6 6-6 0 3.3-2.7 6-6 6Z"/><path d="M12 15c0-2.8-2.2-5-5-5 0 2.8 2.2 5 5 5Z"/>',
  feuille:'<path d="M4 20c8 0 16-4 16-15C10 5 4 10 4 20Z"/><path d="M4 20c3-5 7-8 11-9.5"/>',
  repas:'<path d="M6 3v8a2 2 0 0 0 4 0V3M8 11v10"/><path d="M17 3c-1.5 1.5-2 3.5-2 5.5 0 1.4.6 2.5 2 2.5v10"/>',
  cadeau:'<rect x="3" y="9" width="18" height="12" rx="1.5"/><path d="M3 13h18M12 9v12"/><path d="M12 9c-1.5-3-3-4-4.5-3S6 9 12 9Zm0 0c1.5-3 3-4 4.5-3S18 9 12 9Z"/>',
  activite:'<circle cx="12" cy="12" r="9"/><circle cx="9" cy="10" r="1.1"/><circle cx="15" cy="10" r="1.1"/><circle cx="10" cy="15" r="1.1"/><circle cx="14.5" cy="14" r="1.1"/>',
  fin:'<path d="M5 21V4"/><path d="M5 5h11l-2 3 2 3H5"/>',
  institution:'<path d="M3 10h18"/><path d="m12 3 9 5H3Z"/><path d="M6 10v8M10 10v8M14 10v8M18 10v8"/><path d="M3 21h18"/>',
  sante:'<path d="M4.5 6.5A4 4 0 0 1 12 8a4 4 0 0 1 7.5-1.5c1.4 2.8-.5 5.9-7.5 11.5-7-5.6-8.9-8.7-7.5-11.5Z"/>',
  fille:'<circle cx="12" cy="8" r="4"/><path d="M6 21c0-3.3 2.7-6 6-6s6 2.7 6 6"/>',
  famille:'<circle cx="8" cy="8" r="3"/><circle cx="16.5" cy="9.5" r="2.5"/><path d="M3 20c0-2.8 2.2-5 5-5s5 2.2 5 5"/><path d="M14 20c0-2.2 1.5-4 3.5-4S21 17.8 21 20"/>',
  vaccin:'<path d="m18 2 4 4"/><path d="m17 7 3-3-4-4-3 3"/><path d="M10.5 6.5 17 13l-6.5 6.5-3-3L3 21l-1-1 4.5-4.5-3-3Z"/>',
  idee:'<path d="M9 18h6"/><path d="M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.5.4.8 1 .8 1.6V16h5.4v-.5c0-.6.3-1.2.8-1.6A6 6 0 0 0 12 3Z"/>',
  document:'<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/>',
  graphique:'<path d="M3 21h18"/><rect x="5" y="12" width="3.5" height="6" rx="1"/><rect x="10.5" y="8" width="3.5" height="10" rx="1"/><rect x="16" y="4" width="3.5" height="14" rx="1"/>',
  liste:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h3"/>',
  regle:'<path d="m3 15 6-6 6 6-6 6Z"/><path d="M15 9 21 3"/><path d="M7 11l1.5 1.5M9.5 8.5 11 10M12 6l1.5 1.5"/>',
  parchemin:'<path d="M6 3h11a2 2 0 0 1 2 2v13a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V6"/><path d="M4 6h4"/><path d="M9 8h7M9 12h7M9 16h4"/>',
  colis:'<path d="M3 8.5 12 3.5l9 5v7l-9 5-9-5Z"/><path d="M3 8.5 12 13.5l9-5M12 13.5V21"/>',
  boite:'<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M3 12h5l1.5 2.5h5L16 12h5"/><path d="m6 7 2-3h8l2 3"/>',
  cadenas:'<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  dossier:'<path d="M3 7h6l2 2h10v10a2 2 0 0 1-2 2H3Z"/>',
  sommeil:'<path d="M20.5 14A8.5 8.5 0 1 1 10 3.5 7 7 0 0 0 20.5 14Z"/>',
  bus:'<rect x="4" y="4" width="16" height="13" rx="2"/><path d="M4 10h16"/><circle cx="8" cy="19" r="1.6"/><circle cx="16" cy="19" r="1.6"/><path d="M8 4v6M16 4v6"/>',
  voiture:'<path d="M5 17h14"/><path d="M6 17V11l2-4h8l2 4v6"/><path d="M4 11h16"/><circle cx="8" cy="17.5" r="1.6"/><circle cx="16" cy="17.5" r="1.6"/>',
  urgence:'<path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/><circle cx="12" cy="12" r="4"/>',
  panier:'<path d="M3 5h2l2.6 10.4a2 2 0 0 0 2 1.6h7.2a2 2 0 0 0 2-1.5L21 8H6"/><circle cx="10" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/>',
  calcul:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8"/><path d="M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01"/>',
  facture:'<path d="M5 3h14v18l-2.3-1.5L14.4 21l-2.4-1.5L9.6 21l-2.3-1.5L5 21Z"/><path d="M9 8h6M9 12h6"/>',
  valide:'<circle cx="12" cy="12" r="9"/><path d="m8.5 12.5 2.5 2.5 4.5-5"/>',
  alerte:'<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/>',
  courbe:'<path d="M3 3v18h18"/><path d="m7 14 3.5-4 3 2.5L20 6"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  sauver:'<path d="M5 3h11l3 3v15H5Z"/><path d="M8 3v6h7V3M8 21v-6h8v6"/>',
  mobile:'<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
  hors_ligne:'<path d="M7.5 18.5h9.2a3.8 3.8 0 0 0 .5-7.6 5.6 5.6 0 0 0-8.4-3.6"/><path d="M6.8 11.1a3.8 3.8 0 0 0 .7 7.4"/><path d="M4 3.5 20 20"/>',
  fievre:'<path d="M10 13V5a2 2 0 1 1 4 0v8a4.5 4.5 0 1 1-4 0Z"/><path d="M12 16.5v.01"/>',
  cloche:'<path d="M18 9a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6Z"/><path d="M10.5 20a2 2 0 0 0 3 0"/>',
  lien:'<path d="M10 13a4 4 0 0 0 5.7.3l3-3A4 4 0 0 0 13 4.7l-1.7 1.7"/><path d="M14 11a4 4 0 0 0-5.7-.3l-3 3A4 4 0 0 0 11 19.3l1.7-1.7"/>',
  rafraichir:'<path d="M21 12a9 9 0 1 1-2.6-6.4"/><path d="M21 4v5h-5"/>',
  telecharger:'<path d="M12 3v12"/><path d="m7.5 11 4.5 4.5 4.5-4.5"/><path d="M4 20h16"/>',
  envoyer:'<path d="M12 21V9"/><path d="m7.5 13.5 4.5-4.5 4.5 4.5"/><path d="M4 4h16"/>',
  lune:'<path d="M20.5 14.6A8.6 8.6 0 0 1 9.4 3.5a8.6 8.6 0 1 0 11.1 11.1Z"/>',
  soleil:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  sortie:'<path d="M14 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="m9.5 16.5 4.5-4.5-4.5-4.5"/><path d="M14 12H3"/>',
  poubelle:'<path d="M4 7h16"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/><path d="M6 7h12l-1 13a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1Z"/><path d="M10.5 11v6M13.5 11v6"/>',
  sablier:'<path d="M7 3h10M7 21h10"/><path d="M8 3v3.5c0 2 4 3.7 4 5.5s-4 3.5-4 5.5V21"/><path d="M16 3v3.5c0 2-4 3.7-4 5.5s4 3.5 4 5.5V21"/>',
  annonce:'<path d="M4 10v4a1 1 0 0 0 1 1h3l6 4V5L8 9H5a1 1 0 0 0-1 1Z"/><path d="M18 9.5a4 4 0 0 1 0 5"/>',
  fusee:'<path d="M12 3c3.5 2.5 5 6 5 9l-2.5 2.5h-5L7 12c0-3 1.5-6.5 5-9Z"/><circle cx="12" cy="10" r="1.6"/><path d="M9.5 17 8 21l3-1.5M14.5 17l1.5 4-3-1.5"/>',
  punaise:'<path d="M9 3h6"/><path d="M10 3v6L7.5 13h9L14 9V3"/><path d="M12 13v8"/>',
  valise:'<rect x="3" y="7.5" width="18" height="12.5" rx="2"/><path d="M9 7.5V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v2.5"/><path d="M3 13h18"/>',
  croix:'<path d="m6 6 12 12M18 6 6 18"/>',
  ambulance:'<path d="M3 16V8a1 1 0 0 1 1-1h10v9"/><path d="M14 10h3.5l2.5 3v3h-2"/><circle cx="7.5" cy="17.5" r="1.8"/><circle cx="16.5" cy="17.5" r="1.8"/><path d="M8 9v3M6.5 10.5h3"/>',
  pompier:'<path d="M12 3c2.5 3 3.5 5 3.5 7a3.5 3.5 0 0 1-7 0c0-1 .3-1.9.8-2.8"/><path d="M6 13c-.6 1.2-1 2.4-1 3.6A7 7 0 0 0 19 16.6c0-1.2-.4-2.4-1-3.6"/>',
  police:'<path d="M12 3l7 3v5c0 4.2-2.9 7.9-7 9-4.1-1.1-7-4.8-7-9V6Z"/><path d="M9.5 12.5 11 14l3.5-3.5"/>',
  telephone:'<path d="M6 3h3l1.5 4.5-2 1.5a12 12 0 0 0 6.5 6.5l1.5-2L21 15v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4 5.2 2 2 0 0 1 6 3Z"/>',
  bouee:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="M5.6 5.6 9 9M15 15l3.4 3.4M18.4 5.6 15 9M9 15l-3.4 3.4"/>',
  coeur:'<path d="M12 20s-7-4.4-7-9.2A4 4 0 0 1 12 8a4 4 0 0 1 7-.8c0 4.8-7 12.8-7 12.8Z"/>',
  medecin:'<circle cx="12" cy="7.5" r="3.5"/><path d="M5 21a7 7 0 0 1 14 0"/><path d="M12 14.5v4M10 16.5h4"/>',
  dossier:'<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
  plage:'<path d="M12 21V11"/><path d="M4 11a8 8 0 0 1 16 0Z"/><path d="M12 21c1.5-1.5 4-1.5 5.5 0"/>',
  sourire:'<circle cx="12" cy="12" r="9"/><path d="M8.5 14.5a4.5 4.5 0 0 0 7 0"/><path d="M9 9.5h.01M15 9.5h.01"/>',
  pomme:'<path d="M12 8c-1.5-1.5-4-1.6-5.5 0S5 13 6.5 16.5 10 21 12 20c2 1 4-.5 5.5-3.5S19 9.5 17.5 8 13.5 6.5 12 8Z"/><path d="M12 8V5.5M12 5.5c1.5 0 2.5-1 2.5-2.5-1.5 0-2.5 1-2.5 2.5Z"/>',
  biberon:'<path d="M10 3h4l-.5 2.5h-3Z"/><path d="M9.5 5.5h5L15 9v9a3 3 0 0 1-3 3 3 3 0 0 1-3-3V9Z"/><path d="M9.5 12h5M9.5 15h5"/>',
  aube:'<circle cx="12" cy="14" r="3.5"/><path d="M3 19h18"/><path d="M12 7v2M5.5 11 7 12.2M18.5 11 17 12.2"/>',
  crepuscule:'<circle cx="12" cy="14" r="3.5"/><path d="M3 19h18"/><path d="M12 21v-2"/><path d="M5 15H3M21 15h-2"/>',
  enveloppe_recue:'<rect x="3" y="6" width="18" height="12" rx="2"/><path d="m3.5 7 8.5 6 8.5-6"/><path d="M12 13v5"/>',
  bouton:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>',
  typo:'<path d="M5 6h14"/><path d="M12 6v12"/><path d="M9 18h6"/>',
  oeil:'<path d="M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.8"/>',
  horloge:'<circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 1.8"/>',
  bouclier:'<path d="M12 3l7 3v5.5c0 4.2-2.9 7.9-7 9.5-4.1-1.6-7-5.3-7-9.5V6Z"/>',
  balance:'<path d="M12 4v16M7 20h10"/><path d="M4 8h16M12 4 6 8l-2.5 4a3.5 3.5 0 0 0 5 0Z"/><path d="m12 4 6 4 2.5 4a3.5 3.5 0 0 1-5 0Z"/>',
  silence:'<path d="M11 5 6.5 9H3v6h3.5L11 19Z"/><path d="m16 9.5 4 5M20 9.5l-4 5"/>',
  piece:'<path d="M9 4h6v3.5a1.5 1.5 0 0 0 3 0V4"/><path d="M4 9v6h3.5a1.5 1.5 0 0 1 0 3H4v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9h-2.5a1.5 1.5 0 0 1 0-3H20V5a1 1 0 0 0-1-1"/>',
  loupe:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 4.5 4.5"/>',
  billets:'<rect x="2.5" y="6.5" width="19" height="11" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6 10v4M18 10v4"/>',
  fleche_bas:'<path d="M12 4v14"/><path d="m6.5 12.5 5.5 5.5 5.5-5.5"/>',
  appareil_photo:'<path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z"/><circle cx="12" cy="13" r="3.6"/>',
  gateau:'<path d="M4 20h16v-6a3 3 0 0 0-3-3H7a3 3 0 0 0-3 3Z"/><path d="M4 16h16"/><path d="M9 8V5.5M12 8V5M15 8V5.5"/>',
  point:'<circle cx="12" cy="12" r="5"/>',
  trombone:'<path d="M17 8.5v6.8a5 5 0 0 1-10 0V7a3.2 3.2 0 0 1 6.4 0v8a1.6 1.6 0 0 1-3.2 0V8.5"/>',
  etoile_pleine:'<path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1.1 5.9-5.3-2.9-5.3 2.9 1.1-5.9L3.5 9.7l5.9-.8Z"/>',
  carte_bancaire:'<rect x="2.5" y="5.5" width="19" height="13" rx="2"/><path d="M2.5 10h19"/><path d="M6 14.5h4"/>',
  fete:'<path d="M4 20.5 8.5 8l7.5 7.5Z"/><path d="M14 4.5c1.5 0 2 1 2 2M17.5 7c1.2-.5 2.2 0 2.7 1M13 9.5c.8-1.2 2.2-1.6 3.4-1"/>',
  personne:'<circle cx="12" cy="8" r="3.8"/><path d="M5 21a7 7 0 0 1 14 0"/>',
  personnes:'<circle cx="9" cy="8" r="3.4"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16.5 5.2a3.4 3.4 0 0 1 0 5.6M17.5 14.5a6 6 0 0 1 4 5.5"/>',
  cadenas_ferme:'<rect x="4.5" y="10" width="15" height="10.5" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/><circle cx="12" cy="15" r="1.4"/>',
  ballon:'<path d="M12 3a4.5 5.5 0 0 1 0 11 4.5 5.5 0 0 1 0-11Z"/><path d="M12 14v2.5"/><path d="M12 16.5c-1 .8-1 2 0 2.8s1 2 0 2.7"/>',
  voiture_ecole:'<path d="M4 16v-3.5L6 8h12l2 4.5V16"/><path d="M3 16h18v2.5h-3V16H6v2.5H3Z"/><circle cx="7.5" cy="16" r="1.4"/><circle cx="16.5" cy="16" r="1.4"/>',
  medicament:'<rect x="3" y="8.5" width="18" height="7" rx="3.5" transform="rotate(-35 12 12)"/><path d="m9 9 6 6"/>',
  salade:'<path d="M3.5 12h17a8.5 8.5 0 0 1-17 0Z"/><path d="M7 8.5c1-2 3-3 5-3s4 1 5 3"/><path d="M12 20.5v-2"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5"/><path d="M12 7.8h.01"/>',
  carte_identite:'<rect x="3" y="5.5" width="18" height="13" rx="2"/><circle cx="8.5" cy="11" r="2.2"/><path d="M5.5 16.2a3.4 3.4 0 0 1 6 0"/><path d="M14 10h4M14 13.5h4"/>',
  fleche_droite:'<path d="M4 12h14"/><path d="m12.5 6.5 5.5 5.5-5.5 5.5"/>',
  imprimante:'<path d="M7 9V4h10v5"/><rect x="4" y="9" width="16" height="7" rx="2"/><path d="M7 14h10v6H7Z"/>',
  main:'<path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V11"/><path d="M12 11V4.5a1.5 1.5 0 0 1 3 0V11"/><path d="M15 11V6.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-1a6 6 0 0 1-6-6v-3a1.5 1.5 0 0 1 3 0"/>',
};

// Correspondance entre les emoji encore presents dans le code et les traces.
// Un emoji sans equivalent reste affiche tel quel : la table peut se completer
// sans jamais casser un ecran.
const EMOJI_TRACE = {
  "⏰":"pointer","⚙️":"reglages","✉️":"courrier","✍️":"signature","✏️":"crayon",
  "✨":"etoiles","❓":"aide","⭐":"outils","🌱":"pousse","🌿":"feuille",
  "🍽️":"repas","🎁":"cadeau","🎨":"activite","🏁":"fin","🏛️":"institution",
  "🏥":"sante","👧":"fille","👪":"famille","👶":"enfant","💉":"vaccin",
  "💡":"idee","💬":"messages","💶":"paie","📄":"document","📅":"planning","🗓️":"planning","🗓":"planning",
  "📊":"graphique","📋":"liste","📏":"regle","📔":"cahier","📜":"parchemin",
  "📝":"crayon","📦":"colis","📬":"boite","🔒":"cadenas","🗂️":"dossier",
  "😴":"sommeil","🚌":"bus","🚗":"voiture","🚨":"urgence","🛒":"panier",
  "🧮":"calcul","🧾":"facture","🏠":"accueil",
  "✅":"valide","⚠️":"alerte","⚠":"alerte","📈":"courbe","➕":"plus","📧":"mail",
  "💾":"sauver","📱":"mobile","🤒":"fievre","🔔":"cloche","🔗":"lien",
  "🔄":"rafraichir","📥":"telecharger","📤":"envoyer","🌙":"lune","☀️":"soleil","🚪":"sortie","🗑️":"poubelle","🗑":"poubelle","⏳":"sablier","❌":"croix","🚑":"ambulance","🚒":"pompier","👮":"police","📞":"telephone","🛟":"bouee","💜":"coeur","❤️":"coeur","👨‍⚕️":"medecin","📁":"dossier","🏖️":"plage","😊":"sourire","🍎":"pomme","🍼":"biberon","🌅":"aube","🌆":"crepuscule","📩":"enveloppe_recue","🔘":"bouton","🔤":"typo","👁":"oeil","👁️":"oeil","🕐":"horloge","🛡️":"bouclier","⚖️":"balance","🔇":"silence","🧩":"piece","🔍":"loupe","💰":"billets","⬇️":"fleche_bas","📷":"appareil_photo","📸":"appareil_photo","🎂":"gateau","📎":"trombone","✦":"etoiles","💳":"carte_bancaire","🎉":"fete","👤":"personne","👥":"personnes","🔐":"cadenas_ferme","🎈":"ballon","🚙":"voiture_ecole","💊":"medicament","🥗":"salade","📲":"mobile","📍":"punaise","🤍":"coeur","ℹ️":"info","ℹ":"info","🪪":"carte_identite","➤":"fleche_droite","👉":"main","📑":"liste","🚨":"urgence","📢":"annonce","🚀":"fusee","📌":"punaise","🌴":"valise","🖨️":"imprimante","🖨":"imprimante","📵":"hors_ligne","👆":"main","👉":"main",
};
export function Icone({ nom, taille = 22, couleur = "currentColor", epaisseur = 1.85 }) {
  const d = TRACES[nom];
  if (!d) return null;
  return <svg width={taille} height={taille} viewBox="0 0 24 24" fill="none"
    stroke={couleur} strokeWidth={epaisseur} strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true" dangerouslySetInnerHTML={{ __html: d }} />;
}

// Bareme de l'indemnite d'entretien, indexe sur le minimum garanti (MG).
// CCN 3239 : l'indemnite ne peut etre inferieure a 90 % du MG par journee de
// neuf heures d'accueil, avec un plancher absolu de 2,65 EUR par journee.
// MG a 4,35 EUR depuis le 1er juin 2026, donc 90 % x 4,35 = 3,92 EUR pour 9 h,
// soit 0,435 EUR par heure. Le plancher joue en dessous de 6 h 05.
const MINIMUM_GARANTI = 4.35;
export const IE_TAUX_HORAIRE = Math.round((MINIMUM_GARANTI * 0.9 / 9) * 1000) / 1000; // 0,435
// la recopier : deux endroits ne peuvent pas diverger s'il n'y en a qu'un.
export const TAUX_COTISATIONS={
  "Maladie-maternité":{sal:0,pat:13},
  "Vieillesse plafonnée":{sal:6.9,pat:8.55},
  "Vieillesse déplafonnée":{sal:0.4,pat:2.11},
  "Retraite complémentaire ARRCO":{sal:3.15,pat:4.72},
  "Contribution équilibre général (CEG)":{sal:0.86,pat:1.29},
  "Prévoyance Ircem":{sal:1.04,pat:2.15},
  "Assurance chômage":{sal:0,pat:4.05},
  "Allocations familiales":{sal:0,pat:5.25},
  "Accidents du travail":{sal:0,pat:1.5},
  "Formation professionnelle":{sal:0,pat:0.5},
  "Fonds emploi à domicile (Fived, paritarisme)":{sal:0,pat:1.25},
  "CSG déductible":{sal:6.8,pat:0,base:0.9825},
  "CSG non déductible":{sal:2.4,pat:0,base:0.9825},
  "CRDS":{sal:0.5,pat:0,base:0.9825},
};

// BRUT ET NET.
// Le taux horaire enregistre au contrat est un taux BRUT : c'est sur lui que le
// bulletin assied les cotisations, et c'est a lui que se compare le minimum
// conventionnel (4,20 EUR brut). Pourtant la moitie de l'application l'affichait
// sous le libelle « taux horaire NET » — sur le contrat, sur l'ecran du parent,
// dans les formulaires de saisie. La meme valeur etait donc annoncee comme du
// net ici et declaree comme du brut sur l'attestation France Travail. Un ecart
// de pres de 22 % sur le chiffre le plus important de l'application.
//
// netDepuisBrut() est la seule conversion : elle applique les vraies
// cotisations salariales, celles du bulletin, au lieu du coefficient 0,78
// invente qui trainait dans le recapitulatif Pajemploi.
export const netDepuisBrut=(brut)=>{
  const b=Number(brut)||0;
  if(b<=0)return 0;
  const cotSal=Object.values(TAUX_COTISATIONS).reduce((s,t)=>s+(t.sal>0?b*(t.base||1)*t.sal/100:0),0);
  return Math.round((b-cotSal)*100)/100;
};

// La conversion inverse, net -> brut. Le simulateur de cout parent divisait par
// un coefficient invente ecrit en dur — le meme genre de nombre que
// netDepuisBrut() avait deja chasse du recapitulatif Pajemploi. Il derivera a la
// premiere revalorisation des cotisations ; celle-ci, non, elle sort de la table.
export const TAUX_SALARIAL_TOTAL = Object.values(TAUX_COTISATIONS)
  .reduce((s, t) => s + (t.sal > 0 ? (t.base || 1) * t.sal / 100 : 0), 0);
export const unionMinutes = (intervalles) => {
  const v = (intervalles || [])
    .map((i) => [Number(i[0]), Number(i[1])])
    .filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b) && b > a)
    .sort((x, y) => x[0] - y[0]);
  let total = 0, debut = null, fin = null;
  for (const [a, b] of v) {
    if (debut === null) { debut = a; fin = b; continue; }
    if (a <= fin) { if (b > fin) fin = b; continue; }
    total += fin - debut; debut = a; fin = b;
  }
  if (debut !== null) total += fin - debut;
  return total;
};

// "07:30" -> 450. Renvoie null sur une saisie qui n'est pas une heure.
export const minutesDepuisHeure = (h) => {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(h || "").trim());
  if (!m) return null;
  const hh = Number(m[1]), mm = Number(m[2]);
  if (hh > 23 || mm > 59) return null;
  return hh * 60 + mm;
};

// Duree reellement travaillee, par journee, tous enfants confondus.
// Renvoie { "2026-09-01": { minutes, amplitude, enfants } }
export const IE_PLANCHER_JOUR = 2.65;
// Indemnite d'entretien minimale pour une journee d'accueil de n heures.
export const CI_PLAFOND_DEPENSES = 3500;
export const CI_TAUX = 0.5;
const CI_PLAFOND_CREDIT = CI_PLAFOND_DEPENSES * CI_TAUX; // 1 750

// --- Bareme du CMG (Urssaf / CNAF, revalorisation du 1er avril 2026) ---
//
// Ce bareme existait en DEUX exemplaires : celui du simulateur parent et celui
// de l'outil pro « CMG (reforme 2025) ». Les copies avaient diverge en silence
// sur deux chiffres, et l'outil pro annoncait donc un reste a charge faux :
//   - un plancher de ressources plus eleve que celui retenu ci-dessous ;
//   - cotisations patronales a 27,5 % au lieu des 44,37 % du bulletin.
// Il n'y a plus qu'un exemplaire. Toute revalorisation se fait ici, une fois.
//
// Plancher de ressources : deux valeurs ont circule. Trois sources
// independantes donnent 814,02 EUR, une seule donnait un montant superieur ;
// c'est donc 814,02 qui est retenu, et l'autre valeur est desormais interdite
// dans tout le depot par scripts/audit.mjs. Reserve : urssaf.fr, caf.fr et
// service-public.gouv.fr
// ne sont pas joignables depuis l'environnement de developpement. Un appel a la
// CAF trancherait definitivement.
const PLANCHER_RESSOURCES=814.02, PLAFOND_RESSOURCES=8500;
export const CHR_AM=4.91;        // cout horaire de reference assmat 2026
export const PLAFOND_H=8.09;     // plafond tarifaire horaire pris en compte 2026
export const CMG_MAX=825.16;     // plafond mensuel CMG assmat 2026 (reval. avril 2026)
// Taux d'effort horaire = bareme PSU accueil collectif (CNAF 2026) :
// 1 enfant -> 0,0619 ; 2 -> 0,0516 ; 3 -> 0,0413 ; 4 a 7 -> 0,0310 ; 8+ -> 0,0206.
const TE_BAREME={1:0.000619,2:0.000516,3:0.000413,4:0.000310,5:0.000310,6:0.000310,7:0.000310,8:0.000206};
// AEEH : la tranche immediatement inferieure s'applique, autant de fois qu'il y
// a d'enfants concernes — d'ou un enfant fictif ajoute par AEEH.
export const tauxEffortCMG=(nbEnfants,aeeh=0)=>TE_BAREME[Math.min(8,Math.max(1,(Number(nbEnfants)||1)+(Number(aeeh)||0)))];
// Montant mensuel du CMG. Retourne aussi le cout de garde retenu, qui sert de
// plafond au CMG : le CMG ne rembourse jamais plus que la garde elle-meme.
export const montantCMG=({tauxHoraire,heuresMois,revenusAnnuels,nbEnfants=1,aeeh=0})=>{
  const tarifRetenu=Math.min(Number(tauxHoraire)||0,PLAFOND_H);
  const coutGarde=tarifRetenu*(Number(heuresMois)||0);
  const ressources=Math.max(PLANCHER_RESSOURCES,Math.min((Number(revenusAnnuels)||0)/12,PLAFOND_RESSOURCES));
  const brut=coutGarde*(1-(ressources*tauxEffortCMG(nbEnfants,aeeh)/CHR_AM));
  const montant=Math.round(Math.max(0,Math.min(brut,coutGarde,CMG_MAX))*100)/100;
  return {montant,tarifRetenu,coutGarde,plafonne:montant>=CMG_MAX-0.01,tarifDepasse:tarifRetenu<(Number(tauxHoraire)||0)};
};

export const isoJour=(d)=>{
  if(d instanceof Date)return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10);
  const t=String(d||"").slice(0,10);
  return /^\d{4}-\d{2}-\d{2}$/.test(t)?t:isoJour(new Date());
};

// Le mois courant, au format AAAA-MM. Meme piege que ci-dessus : passer par
// toISOString() sur une date locale renvoyait le mois precedent entre minuit
// et 2 h du matin le 1er du mois — le selecteur des frais kilometriques
// s'ouvrait alors sur le mois d'avant, sans rien afficher.
// En francais, la virgule separe les decimales. L'application ecrivait
// « 4.20 € » partout, avec un point : c'est une notation anglaise, et une
// assistante maternelle qui recopie un montant dans Pajemploi le recopie avec.
//
// nbf() remplace toFixed() partout. Deux precautions :
//  - useGrouping desactive. Le separateur de milliers francais est une espace
//    fine insecable (U+202F), absente du jeu WinAnsi : elle ferait disparaitre
//    la ligne entiere des PDF, exactement le bug deja corrige sur les emoji.
//  - une valeur illisible donne 0 plutot qu'un « NaN » affiche a l'ecran.
export const nbf=(n,d=2)=>(Number(n)||0).toLocaleString("fr-FR",{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false});
export const isoMois=(d)=>isoJour(d).slice(0,7);

// Reculer ou avancer d'un mois, sur la chaine elle-meme. Passer par un objet
// Date pour cela remelangeait UTC et heure locale a chaque clic sur les
// fleches du selecteur de mois.
// « 2026-09 » -> « Septembre 2026 ».
const jourDecale=(n)=>{const d=new Date();d.setDate(d.getDate()+n);return isoJour(d);};
const apresNaissance=(iso,mois)=>{const d=new Date(iso+"T12:00:00");d.setMonth(d.getMonth()+mois);return isoJour(d);};
const neIlYa=(mois)=>{const d=new Date();d.setMonth(d.getMonth()-mois);return isoJour(d);};
// Annee scolaire en cours : du 4 septembre au 31 aout suivant.
const ANNEE_SCOLAIRE=(()=>{const d=new Date();const y=d.getFullYear()-(d.getMonth()<8?1:0);return{debut:y+"-09-04",fin:(y+1)+"-08-31"};})();

// DATES
var _D=new Date();
var _y=_D.getFullYear();
var _mo=String(_D.getMonth()+1).padStart(2,"0");
var _da=String(_D.getDate()).padStart(2,"0");
export var TODAY_STR=_y+"-"+_mo+"-"+_da;
export var TODAY_H=String(_D.getHours()).padStart(2,"0")+"h"+String(_D.getMinutes()).padStart(2,"0");
var TODAY_MONTH=String(_D.getMonth()+1).padStart(2,"0");
var TODAY_YEAR=String(_D.getFullYear());


export function Styles(){return(
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,300;1,9..40,400&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&family=DM+Mono:wght@400;500&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    /* Certaines personnes desactivent les animations pour raison medicale
       (vertiges, migraines). On respecte le reglage du systeme. */
    @media(prefers-reduced-motion:reduce){
      *,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important;scroll-behavior:auto!important}
    }
    html,body{width:100%;overflow-x:hidden;font-family:'DM Sans',sans-serif}
    /* ================= JETONS TIMAT =================
       Une couleur qui porte du texte ou un bouton doit atteindre 4,5:1 sur le
       fond creme (RGAA / WCAG AA). Six des neuf teintes precedentes echouaient :
       corail 2,36 - sauge 2,66 - turquoise 2,66 - bleu 4,14 - or 2,80 -
       tertiaire 2,86. Elles sont approfondies ici, en gardant leurs noms : les
       2294 usages de var(--...) deja en place heritent de la correction.
       Chaque teinte garde aussi une variante claire (--Tb, --Sb...) pour les
       aplats decoratifs, ou le contraste n'a pas lieu d'etre. Ne jamais poser
       de texte sur une variante claire. */
    :root{
      /* --- surfaces et texte --- */
      --c:#FDFBF8;--w:#FFFFFF;
      --b:#2E4A5A;   /* encre, 9,06:1 */
      --m:#61565C;   /* secondaire, 6,79:1 */
      --l:#7A6C73;   /* tertiaire, 4,82:1 (etait #A8909A a 2,86) */
      --br:#EAE0E8;

      /* --- corail / terracotta : le parent employeur --- */
      --T:#B85536;--Tb:#E49178;--Tp:#FDF6F4;--Tl:#F3CEC2;
      /* --- sauge : la MAM et la creche --- */
      --S:#4E6B57;--Sb:#8FAE99;--Sp:#F3F8F5;--Sl:#CDD4CE;
      /* --- vert : etat positif (present, valide, a jour) --- */
      --G:#2F6B64;--Gb:#7FC4BC;--Gp:#F2F8F7;
      /* --- bleu : l'assistante maternelle, et la landing --- */
      --B:#2E5F8A;--Bb:#6E9FC4;--Bp:#E4EFF7;
      /* --- rouge : alerte. Reste rouge, il doit alerter --- */
      --R:#B3261E;--Rb:#E26B4F;--Rp:#FCEBEA;
      /* --- or : mise en avant --- */
      --P:#8A6A16;--Pb:#D4B068;--Pp:#F8F2E4;

      /* --- couleurs de role, d'apres les logos. --accent est la teinte de
             l'espace ouvert : la navigation, les raccourcis et les etats
             actifs la suivent, pour qu'un parent ne voie pas une barre bleue
             sous un avatar corail. --- */
      --role-am:var(--B);--role-parent:var(--T);--role-mam:var(--S);
      --accent:var(--B);--accent-pale:var(--Bp);--accent-voile:var(--Tl);

      /* --- echelle typographique : six tailles, plus 39 valeurs eparpillees --- */
      --pad-carte:16px;--pad-carte-l:24px;--pad-carte-conteneur:4px;--sh-accent:0 8px 22px rgba(46,95,138,.35);
    --t1:24px;  /* titre d'ecran */
      --t2:18px;  /* titre de section */
      --t3:15px;  /* corps accentue */
      --t4:13px;  /* corps */
      --t5:12px;  /* secondaire */
      --t6:11px;  /* legende, etiquette */

      /* --- rayons : deux valeurs, plus une pastille --- */
      --r:18px;--r2:12px;--r3:10px;--rpill:999px;

      /* --- ombres --- */
      --sh:0 1px 4px rgba(46,74,90,.05),0 4px 20px rgba(46,74,90,.07);
      --sh2:0 2px 12px rgba(46,74,90,.08),0 16px 48px rgba(46,74,90,.12);
      --sh3:0 0 0 3px rgba(46,95,138,.28);

      /* --- etats d'interaction, partages par les onglets et les boutons --- */
      --tap:150ms;                        /* duree du retour a l'appui */
      --ease:cubic-bezier(.34,1.56,.64,1);
      --hover-veil:rgba(46,95,138,.06);   /* survol, ordinateur uniquement */
      --tap-veil:rgba(46,95,138,.13);     /* appui */
    }
    .dark{
      --c:#1A2530;--w:#243140;--b:#E8EEF0;--m:#9FAEB5;--l:#7A8993;--br:#34424E;
      --Tp:#3A2218;--Sp:#1F2A22;--Gp:#0F2A26;--Bp:#0D1A2A;--Rp:#2E1610;--Pp:#2E2418;
      /* Sur fond sombre le rapport s'inverse : ce sont les teintes claires qui
         portent le texte. Les memes noms, les valeurs opposees. */
      --T:#E49178;--S:#A8B5A8;--G:#7FC4BC;--B:#7AAAE0;--R:#E26B4F;--P:#D4B068;
      --Tb:#B85536;--Sb:#4E6B57;--Gb:#2F6B64;--Bb:#2E5F8A;--Rb:#B3261E;--Pb:#8A6A16;
      --Tl:#5A3A2C;--Sl:#384038;--Gl:#1F4A44;--Bl:#1A3050;--Rl:#4A1F12;
      --hover-veil:rgba(255,255,255,.07);--tap-veil:rgba(255,255,255,.14);
      --sh:0 1px 4px rgba(0,0,0,.5),0 4px 20px rgba(0,0,0,.6);
      --sh2:0 2px 12px rgba(0,0,0,.6),0 16px 48px rgba(0,0,0,.7);
    }
    .dark .topbar,.dark .nav-main{background:rgba(13,27,30,.97)!important;border-color:#1E3A34!important}
    .dark .card{border-color:#1E3A34;background:rgba(19,36,40,.9)}
    .dark .inp,.dark .ta,.dark .sel{background:#0D1B1E;border-color:#2A4A44;color:#F0F5F3}
    .dark .lbl{color:#7FA8A0}
    .dark .btn{border-color:#2A4A44}
    .dark .pf{color:#F0F5F3}
    .dark h1,.dark h2,.dark h3,.dark h4{color:#F0F5F3}
    .msgs{display:flex;flex-direction:column;gap:10px;max-height:min(56vh,440px);overflow-y:auto;padding:8px 4px;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}
    .msg{max-width:78%;padding:10px 14px;border-radius:18px;font-size:13.5px;line-height:1.5;overflow-wrap:break-word;box-shadow:0 1px 3px rgba(0,0,0,.07);animation:msg-in .22s ease}
    @keyframes msg-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
    @keyframes menuDrop{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
    @keyframes recblink{0%,100%{opacity:1}50%{opacity:.25}}
    @keyframes tapripple{from{transform:scale(.4);opacity:.85}to{transform:scale(1.7);opacity:0}}
    @keyframes nudge{0%,100%{transform:translateX(0)}50%{transform:translateX(5px)}}
    @keyframes demoScreenIn{from{opacity:0;transform:translateX(14px) scale(.98)}to{opacity:1;transform:translateX(0) scale(1)}}
    @keyframes demoPuceIn{from{opacity:0;transform:translateY(9px)}to{opacity:1;transform:translateY(0)}}
    @keyframes demoTabGlow{0%,100%{box-shadow:0 4px 18px rgba(46,72,89,.25)}50%{box-shadow:0 6px 30px rgba(93,169,161,.55)}}
    @keyframes demoBeam{0%{left:2%;opacity:0}18%{opacity:1}82%{opacity:1}100%{left:98%;opacity:0}}
    @keyframes badgePulse{0%,100%{transform:translateX(-50%) scale(1)}50%{transform:translateX(-50%) scale(1.07)}}
    .tarif-pro{transition:transform .28s cubic-bezier(.34,1.56,.64,1),box-shadow .28s}
    .tarif-pro:hover{transform:translateY(-8px);box-shadow:0 22px 60px rgba(184,98,47,.3)}
    .tarif-free{transition:transform .28s cubic-bezier(.34,1.56,.64,1),box-shadow .28s}
    .tarif-free:hover{transform:translateY(-8px);box-shadow:0 20px 54px rgba(46,72,89,.18)}
    .faq-item{transition:box-shadow .2s,border-color .2s}
    .faq-item:hover{border-color:#E49178!important;box-shadow:0 6px 22px rgba(228,145,120,.16)}
    .faq-item summary{transition:background .18s}
    .faq-item summary:hover{background:rgba(228,145,120,.06)}
    .faq-item summary span{transition:transform .28s cubic-bezier(.34,1.56,.64,1)}
    .faq-item[open] summary span{transform:rotate(135deg)}
    .faq-item[open] .faq-ans{animation:faqOpen .32s ease}
    @keyframes faqOpen{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
    .blog-card{transition:transform .25s cubic-bezier(.34,1.56,.64,1),box-shadow .25s}
    .blog-card:hover{transform:translateY(-6px);box-shadow:0 18px 44px rgba(46,72,89,.16)}
    .blog-card:hover .blog-arrow{transform:translateX(5px)}
    .blog-arrow{transition:transform .25s}
    .msg-me{align-self:flex-end;background:var(--T);color:#fff;border-bottom-right-radius:5px}
    .msg-ot{align-self:flex-start;background:#fff;color:var(--b);border:1px solid var(--br);border-bottom-left-radius:5px}
    .dark .msg-me{background:#1A3A34!important;color:#F0F5F3!important}
    .dark .msg-ot{background:#132428!important;color:#E0EBE8!important;border-color:#1E3A34!important}
    .dark details{background:#132428!important;border-color:#1E3A34!important}
    .dark details summary{color:#F0F5F3!important}
    .dark select option{background:#0D1B1E;color:#F0F5F3}
    .app{font-variant-numeric:tabular-nums;min-height:100vh;min-height:100dvh;background:var(--c);display:flex;flex-direction:column;width:100%;max-width:100vw;overflow-x:hidden;position:relative}
    .app::before{content:'';position:fixed;inset:0;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");pointer-events:none;z-index:0;opacity:.5}
    .card{padding:var(--pad-carte);background:rgba(255,255,255,.9);backdrop-filter:blur(8px);border-radius:var(--r);border:1px solid rgba(234,224,232,.8);box-shadow:var(--sh);position:relative;z-index:1}
    .card-lift{transition:transform .22s cubic-bezier(.34,1.56,.64,1),box-shadow .22s ease}
    .card-lift:hover{transform:translateY(-3px);box-shadow:var(--sh2)}
    .pf{font-family:'Cormorant Garamond','Georgia',serif}
    /* Aucun element cliquable ne doit descendre sous 24 px : c'est le minimum
       fixe par le WCAG 2.5.8. Le bouton Deconnexion mesurait 19 x 20 px. */
    /* Les cibles restantes etaient des onglets et des puces de filtre poses en
       style en ligne, entre 26 et 35 px de haut : trop nombreux et trop
       disperses pour etre repris un par un, mais tous justiciables du meme
       plancher. 40 px est la hauteur d'un doigt sans etre celle d'un bouton
       plein, et le WCAG 2.5.8 n'exige que 24 px. */
    button,a[role="button"]{min-height:40px}
    /* Les fleches de navigation mesuraient 24 a 35 px de large. */
    .btn{min-width:40px}
    /* Les icones de la barre du haut sont les cibles les plus utilisees et les
       plus proches du bord de l'ecran : elles montent a 40 px. */
    .ico-btn{min-width:40px;min-height:40px;display:inline-flex;align-items:center;justify-content:center;border-radius:var(--r3);background:none;border:none;cursor:pointer;padding:0;transition:background var(--tap) ease}
    .ico-btn:active{background:var(--tap-veil)}
    @media(hover:hover){.ico-btn:hover{background:var(--hover-veil)}}
    .topbar{position:sticky;top:0;z-index:100;background:rgba(255,255,255,.92);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-bottom:1px solid rgba(234,224,232,.6);display:flex;justify-content:space-between;align-items:center;padding:0 20px;height:54px;box-shadow:0 1px 0 rgba(0,0,0,.04)}
    .logo{font-family:'Cormorant Garamond',serif;font-size:24px;font-weight:700;color:var(--T);font-style:italic;letter-spacing:-.5px}
    .logo-dot{width:5px;height:5px;border-radius:50%;background:var(--S);margin-top:2px}
    .nav-main{background:rgba(255,255,255,.88);backdrop-filter:blur(16px);border-bottom:1px solid rgba(234,224,232,.5);display:flex;gap:4px;padding:0 16px;height:46px;align-items:center}
    .inp{width:100%;padding:11px 14px;border-radius:12px;border:1.5px solid var(--br);font-size:16px;outline:none;font-family:inherit;transition:border-color .15s,box-shadow .15s;background:#fff;color:var(--b)}
    input,select,textarea,.inp,.sel,.ta{font-size:16px!important}
    .inp:focus{border-color:var(--accent);box-shadow:var(--sh3)}
    .ta{width:100%;padding:11px 14px;border-radius:12px;border:1.5px solid var(--br);font-size:13px;outline:none;font-family:inherit;resize:vertical;min-height:80px;transition:border-color .15s;background:#fff;color:var(--b)}
    .ta:focus{border-color:var(--accent);box-shadow:var(--sh3)}
    .sel{width:100%;padding:10px 14px;border-radius:12px;border:1.5px solid var(--br);font-size:13px;outline:none;font-family:inherit;background:#fff;color:var(--b)}
    .lbl{display:block;font-size:11.5px;font-weight:600;color:var(--l);margin-bottom:5px;letter-spacing:.3px;text-transform:uppercase}
    .btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:40px;padding:9px 18px;border-radius:12px;border:none;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;transition:transform .12s ease, box-shadow .18s ease, filter .18s ease, background .18s ease;letter-spacing:.1px}
    .btn.s{font-size:12px;min-height:36px;padding:7px 14px}
    .btn.l{font-size:15px;min-height:46px;padding:12px 22px}
    .btn:hover{transform:translateY(-1px);filter:brightness(1.04);box-shadow:0 6px 16px rgba(0,0,0,.1)}
    .btn:active{transform:translateY(1px) scale(.985);box-shadow:0 2px 6px rgba(0,0,0,.12)}
    .btn:disabled{opacity:.55;cursor:default;transform:none!important;box-shadow:none!important;filter:none!important}
    /* Trois variantes, et trois seulement : pleine (l'action principale de
       l'ecran, une seule), contour (les actions secondaires), discrete (tout le
       reste). Les degrades sont retires : ils eclaircissaient le bas du bouton
       sous le texte blanc, ou le contraste tombait le plus bas. */
    .bT{background:var(--accent);color:#fff}
    .bT:hover{transform:translateY(-1px);filter:brightness(1.06)}
    .bS{background:var(--S);color:#fff;box-shadow:0 2px 10px rgba(78,107,87,.28)}
    .bS:hover{transform:translateY(-1px);box-shadow:0 4px 18px rgba(78,107,87,.36)}
    .bA{background:var(--accent);color:#fff}
    .bA:hover{transform:translateY(-1px);filter:brightness(1.06)}
    .bO{background:transparent;color:var(--accent);border:1.5px solid var(--accent)}
    .bO:hover{background:var(--hover-veil)}
    .bG{background:var(--hover-veil);color:var(--m);border:1px solid var(--br)}
    .bG:hover{background:var(--tap-veil)}
    .bR{background:var(--R);color:#fff;box-shadow:0 2px 10px rgba(179,38,30,.25)}
    .bR:hover{transform:translateY(-1px);box-shadow:0 4px 18px rgba(179,38,30,.36)}
    .bG2{background:var(--G);color:#fff;box-shadow:0 2px 10px rgba(47,107,100,.28)}
    .bG2:hover{transform:translateY(-1px)}
    .bP{background:linear-gradient(135deg,#E49178,#C76754);color:#fff;box-shadow:0 2px 10px rgba(228,145,120,.3)}
    .bP:hover{transform:translateY(-1px);box-shadow:0 4px 18px rgba(196,113,74,.4)}
    .badge{display:inline-flex;align-items:center;justify-content:center;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:700}
    .content{flex:1;overflow-x:hidden;max-width:100vw}
    @media(max-width:600px){.content table{display:block;overflow-x:auto;-webkit-overflow-scrolling:touch;max-width:100%}.fi{padding:14px;overflow-wrap:anywhere}.inp,input,select,textarea{font-size:16px!important}}
    .fi{padding:20px;max-width:900px;margin:0 auto;width:100%;flex:1}
    .g2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
    .g3{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
    .g4{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
    @media(max-width:640px){.g2,.g3,.g4{grid-template-columns:minmax(0,1fr)}.g2>*,.g3>*,.g4>*{min-width:0}}
    @media(max-width:400px){.g2,.g3,.g4{grid-template-columns:minmax(0,1fr)}.g2>*,.g3>*,.g4>*{min-width:0}}
    .demo-screen .g2{grid-template-columns:minmax(0,1fr)!important}
    .demo-screen .g3{grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important}
    .demo-screen .g4{grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important}
    .demo-screen .g2>*,.demo-screen .g3>*,.demo-screen .g4>*{min-width:0}
    .demo-screen [style*="overflow-x"],.demo-screen [style*="overflowX"]{overflow-x:hidden!important}
    .demo-phone{width:270px}
    .demo-layout{display:grid;gap:26px 28px;justify-content:center;max-width:940px;margin:0 auto;
      grid-template-columns:178px minmax(0,340px) auto;
      grid-template-areas:"tabs explain phone" "cta cta phone";align-items:start}
    .demo-layout>.demo-tabs{grid-area:tabs}
    .demo-layout>.demo-explain{grid-area:explain}
    .demo-layout>.demo-col-phone{grid-area:phone}
    .demo-cta{grid-area:cta;text-align:left;align-self:start}
    .demo-tabs{display:flex;flex-direction:column;width:178px;flex-shrink:0;border-radius:16px;overflow:hidden;box-shadow:0 6px 24px rgba(0,0,0,.07)}
    .demo-explain{flex:0 1 360px;min-width:0;padding-top:10px}
    .demo-col-phone{flex-shrink:0}
    .demo-frame{height:487px}
    .demo-scrollhint{display:none}
    .demo-zoom{zoom:.6}
    @media(max-width:860px){
      .demo-layout{display:flex;flex-direction:column;gap:6px;align-items:stretch;max-width:520px;grid-template-columns:none;grid-template-areas:none}
      .demo-tabs{flex-direction:row;flex-wrap:nowrap;gap:5px;width:100%;overflow:visible;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);box-shadow:none;border-radius:12px;padding:5px;order:1}
      .demo-tabs button{flex:1 1 0;min-width:0;width:auto;flex-direction:column;gap:3px;text-align:center;justify-content:center;padding:8px 2px;border:none!important;border-radius:13px!important}
      .demo-tabs button span:first-child{font-size:16px!important}
      .demo-tabs button span:last-child{font-size:11px!important;line-height:1.2!important;white-space:normal;max-width:100%;hyphens:auto}
      .demo-explain{max-width:none;order:2;padding-top:2px;flex:0 0 auto}
      .demo-scrollhint{display:none!important}
      .demo-scrollarrow{display:none!important}
      .demo-col-phone{order:3;align-self:center;margin-top:6px}
      /* En mobile, on agit APRÈS avoir vu l'écran, pas avant. */
      .demo-cta{order:4;text-align:center;margin-top:20px}
      .demo-phone{width:min(224px,62vw)}
      .demo-frame{height:424px}
      .demo-zoom{zoom:.64}
      .demo-beam{display:none}
    }
    .bar{height:6px;background:rgba(26,17,24,.08);border-radius:3px;overflow:hidden}
    .bar-fill{height:100%;border-radius:3px;background:linear-gradient(90deg,var(--T),var(--S));transition:width .6s ease}
    @media(max-width:700px){.combo-arrow{display:none!important}.combo-head{display:none!important}}
    .canv{border-radius:14px;border:2px solid var(--br);cursor:crosshair;touch-action:none;background:#fff}
    .moo{border:2px solid transparent;border-radius:var(--r3);min-width:44px;min-height:44px;display:inline-flex;align-items:center;justify-content:center;padding:4px 6px;font-size:20px;cursor:pointer;transition:all .15s;background:transparent}
    .moo.on,.moo:hover{border-color:var(--accent);background:var(--accent-pale);transform:scale(1.12)}
    .msc{width:18px;height:18px;border-radius:50%;border:2px solid var(--br);display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;transition:all .15s}
    .msc.ok{background:var(--G);border-color:var(--G);color:#fff}
    .mood-bar{display:flex;gap:2px;height:32px;align-items:flex-end;margin-top:4px}
    .mood-b{border-radius:3px 3px 0 0;background:linear-gradient(to top,var(--T),var(--S));min-width:8px;transition:height .3s ease}
    .ai-card{background:linear-gradient(135deg,var(--Sp),var(--Tp))!important;border-color:var(--Sl)!important}
    .ai-dot{width:7px;height:7px;border-radius:50%;background:var(--S);animation:ai-pulse 1.2s ease-in-out infinite}
    @keyframes ai-pulse{0%,100%{transform:scale(1);opacity:.6}50%{transform:scale(1.3);opacity:1}}
    .cp{padding:7px 12px!important;display:inline-flex!important;align-items:center;gap:6px;cursor:pointer;flex:unset!important;transition:all .15s!important;border-radius:20px!important}
    .cp.on{border-color:var(--accent)!important;background:var(--accent-pale)!important}
    ::-webkit-scrollbar{width:4px;height:4px}
    ::-webkit-scrollbar-track{background:transparent}
    ::-webkit-scrollbar-thumb{background:var(--br);border-radius:2px}
    .div{height:1px;background:linear-gradient(90deg,transparent,var(--br),transparent);margin:4px 0}
    .sec-h{display:flex;align-items:center;gap:8px;margin-bottom:14px}
    .sec-h-line{flex:1;height:1px;background:linear-gradient(90deg,var(--br),transparent)}
    #bandeau-hl{display:none;background:linear-gradient(90deg,var(--T),var(--S));color:#fff;font-size:11px;text-align:center;padding:4px;font-weight:600}
    .offline #bandeau-hl{display:block}
    @media(max-width:640px){.g2,.g3,.g4{grid-template-columns:minmax(0,1fr)!important}.g2>*,.g3>*,.g4>*{min-width:0!important}}
    @media(max-width:768px){
      .nav-main{display:none!important}
      .content{padding-bottom:calc(76px + env(safe-area-inset-bottom,0px))!important}
      .fi{padding:12px!important;max-width:100%!important}
      .topbar{height:50px!important;padding:0 12px!important}
      .logo{font-size:19px!important}
      .btn{padding:8px 14px}
      .card{border-radius:14px!important}
    }
    .bottom-nav{display:none;position:fixed;bottom:0;left:0;right:0;z-index:200;background:rgba(255,255,255,.97);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-top:1px solid rgba(234,224,232,.7);box-shadow:0 -4px 20px rgba(0,0,0,.08);height:calc(64px + env(safe-area-inset-bottom,0px));align-items:stretch;padding:0 8px;padding-bottom:env(safe-area-inset-bottom,0px)}
    .dark .bottom-nav{background:rgba(13,27,30,.97)!important;border-top-color:#1E3A34!important}
    /* Quatre etats d'onglet. L'appui est le seul retour possible sur telephone,
       ou le survol n'existe pas : sans lui on ne sait pas si le doigt a ete pris.
       L'etat actif porte trois signaux -- pastille, gras, teinte -- pour rester
       lisible en noir et blanc et en cas de daltonisme. */
    .bnav-btn{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;border:none;background:transparent;cursor:pointer;padding:6px 2px;border-radius:var(--r2);transition:background var(--tap) ease,transform var(--tap) ease;font-family:inherit;min-width:0;position:relative;-webkit-tap-highlight-color:transparent}
    .bnav-btn::before{content:"";position:absolute;top:5px;left:50%;transform:translateX(-50%) scaleX(0);width:24px;height:3px;border-radius:3px;background:var(--accent);transition:transform .3s var(--ease)}
    .bnav-btn.active::before{transform:translateX(-50%) scaleX(1)}
    .bnav-btn.active{background:var(--accent-pale)}
    .bnav-btn:active{background:var(--tap-veil);transform:scale(.94)}
    @media(hover:hover){.bnav-btn:hover:not(.active){background:var(--hover-veil)}}
    .dark .bnav-btn.active{background:rgba(122,170,224,.18)!important}
    /* L'espace parent et l'espace MAM prennent la teinte de leur logo. */
    .espace-parent{--sh-accent:0 8px 22px rgba(184,85,54,.35);--accent:var(--T);--accent-pale:var(--Tp)}
    .espace-mam{--sh-accent:0 8px 22px rgba(78,107,87,.35);--accent:var(--S);--accent-pale:var(--Sp)}
    .bnav-btn .bnav-ic{font-size:22px;line-height:1;color:var(--l);transition:transform .3s var(--ease),color .15s}
    .bnav-btn.active .bnav-ic{transform:translateY(-1px) scale(1.08);color:var(--accent)}
    .bnav-btn:active .bnav-ic{transform:scale(.82)}
    .bnav-btn .bnav-lbl{font-size:11px;font-weight:600;letter-spacing:.1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:72px;color:var(--l);transition:color .15s,font-weight .15s}
    .bnav-btn.active .bnav-lbl{color:var(--accent);font-weight:700}
    @media(max-width:768px){.bottom-nav{display:flex}}
    .demo-bnav .bottom-nav{position:static!important;display:flex!important;box-shadow:none;z-index:auto;padding-bottom:0}
    @media(hover:none){.card-lift:active{transform:scale(.98)}.btn:active{transform:scale(.96)!important}}
    /* - CALENDRIER - */
    .cgrid{display:grid;grid-template-columns:repeat(7,1fr);gap:2px}
    .cday{min-height:48px;border-radius:10px;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding-top:6px;cursor:pointer;transition:background .15s;font-size:13px;color:var(--b);position:relative;background:transparent}
    .cday:hover{background:rgba(0,0,0,.04)}
    .cday.tod{background:transparent;color:var(--b);font-weight:400;box-shadow:none}
    .cday.sel{background:var(--Tp);font-weight:700}
    .cday.abs{background:var(--Rp);color:var(--R)}
    .cday.cng{background:var(--Gp);color:var(--G)}
    .cday.hol{background:var(--Bp);color:var(--B)}
    /* - TOAST - */
    .toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:var(--b);color:#fff;padding:12px 20px;border-radius:14px;font-size:13px;font-weight:600;z-index:9999;box-shadow:0 8px 32px rgba(0,0,0,.25);display:flex;align-items:center;gap:10px;max-width:min(360px,calc(100vw - 32px));animation:toast-in .3s ease;white-space:normal;word-break:break-word}
    @media(max-width:768px){.toast{bottom:calc(80px + env(safe-area-inset-bottom, 0px));font-size:12px;padding:10px 16px;border-radius:12px}}
    @keyframes toast-in{from{opacity:0;transform:translateX(-50%) translateY(10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
    /* - PHOTO GRID - */
    .photo-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
    @media(max-width:640px){.photo-grid{grid-template-columns:repeat(3,1fr)}}
    /* La pastille d'initiales : la classe etait posee sur l'element mais n'avait
       jamais ete definie, si bien que les initiales s'affichaient en haut a
       gauche d'un carre pale au lieu d'etre centrees dans un rond. */
    .av{border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-weight:700;line-height:1;flex:none;letter-spacing:.02em}

    /* Raccourcis de l'accueil. La forme est commune, seule l'action principale
       porte la couleur : c'est elle qui doit se voir en premier. */
    .qa{border-radius:var(--r2);padding:14px 4px;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;min-height:84px;font-family:inherit;transition:transform .12s var(--ease),background var(--tap) ease}
    .qa:active{transform:scale(.96)}
    @media(hover:hover){.qa:hover{transform:translateY(-2px)}}

    /* L'alerte reste rouge -- elle doit alerter -- mais tient sur une ligne
       plutot que dans un pave, et n'ajoute pas de bouton plein a l'ecran. */
    .ligne-alerte{width:100%;background:var(--Rp);border:1px solid var(--R);border-radius:var(--r2);padding:13px 15px;margin-bottom:14px;display:flex;gap:12px;align-items:center;cursor:pointer;font-family:inherit;transition:background var(--tap) ease}
    .ligne-alerte:active{background:#F8DAD7}
    @media(hover:hover){.ligne-alerte:hover{background:#F8DAD7}}

    /* - NAV TABS - */
    .ntab{padding:6px 12px;border-radius:8px;border:none;background:transparent;cursor:pointer;font-family:inherit;font-size:12px;font-weight:500;color:var(--b);transition:all .15s}
    .ntab.on{background:var(--accent-pale);color:var(--accent);font-weight:700}
  `}</style>
);}


const NAISSANCES={e1:neIlYa(30),e2:neIlYa(34),e3:neIlYa(14)};

export const D = {
  asmat:{id:"am1",role:"asmat",prenom:"Marie",nom:"Dupont",email:"marie.dupont@mail.fr",agrement:"AGR-"+(new Date().getFullYear()-3)+"-0042",couleur:COULEUR_ROLE.asmat},
  parents:[
    {id:"p1",role:"parent",prenom:"Sophie",nom:"Martin",email:"sophie.martin@mail.fr",couleur:"#3A72A8"},
    {id:"p2",role:"parent",prenom:"Thomas",nom:"Bernard",email:"thomas.bernard@mail.fr",couleur:"#4E7A5C"},
    {id:"p3",role:"parent",prenom:"Camille",nom:"Petit",email:"camille.petit@mail.fr",couleur:"#BC4869"},
  ],
  enfants:[
    {id:"e1",prenom:"Léo",nom:"Martin",parentId:"p1",naissance:NAISSANCES.e1,couleur:"#3A72A8",emoji:"🦁",
      allergies:["Arachides","Noix de cajou"],groupe_sanguin:"A+",medecin:"Dr. Lefebvre - 01 23 45 67",
      vaccins:[{nom:"DTP",date:apresNaissance(NAISSANCES.e1,6),ok:true},{nom:"ROR",date:apresNaissance(NAISSANCES.e1,12),ok:true},{nom:"Méningite B",date:apresNaissance(NAISSANCES.e1,18),ok:false}],
      contrat:{debut:ANNEE_SCOLAIRE.debut,fin:ANNEE_SCOLAIRE.fin,heuresHebdo:40,tauxHoraire:4.20,jours:["Lundi","Mardi","Mercredi","Jeudi","Vendredi"],horaires:"07h30–17h30",entretien:3.8,indemniteAbsence:0.5},
      signe:false},
    {id:"e2",prenom:"Emma",nom:"Bernard",parentId:"p2",naissance:NAISSANCES.e2,couleur:"#4E7A5C",emoji:"🌸",
      allergies:["Lactose"],groupe_sanguin:"O+",medecin:"Dr. Martin - 01 34 56 78",
      vaccins:[{nom:"DTP",date:apresNaissance(NAISSANCES.e2,6),ok:true},{nom:"ROR",date:apresNaissance(NAISSANCES.e2,12),ok:true},{nom:"Méningite B",date:apresNaissance(NAISSANCES.e2,18),ok:true}],
      contrat:{debut:ANNEE_SCOLAIRE.debut,fin:ANNEE_SCOLAIRE.fin,heuresHebdo:35,tauxHoraire:4.20,jours:["Lundi","Mardi","Jeudi","Vendredi"],horaires:"08h00–18h00",entretien:3.8,indemniteAbsence:0.5},
      signe:true},
    {id:"e3",prenom:"Noah",nom:"Petit",parentId:"p3",naissance:NAISSANCES.e3,couleur:"#BC4869",emoji:"⭐",
      allergies:[],groupe_sanguin:"B+",medecin:"Dr. Durand - 01 45 67 89",
      vaccins:[{nom:"DTP",date:apresNaissance(NAISSANCES.e3,6),ok:true},{nom:"ROR",date:apresNaissance(NAISSANCES.e3,12),ok:false},{nom:"Hépatite B",date:apresNaissance(NAISSANCES.e3,6),ok:true}],
      contrat:{debut:jourDecale(-240),fin:jourDecale(125),heuresHebdo:45,tauxHoraire:4.20,jours:["Lundi","Mardi","Mercredi","Jeudi","Vendredi"],horaires:"07h00–18h00",entretien:3.8,indemniteAbsence:0.5},
      signe:false},
  ],
  transmissions:[
    {id:"t1",eId:"e1",auteur:"asmat",date:TODAY_STR,h:"17h15",txt:"Super journée pour Léo ! Il a adoré l'activité peinture et a mangé tout son repas. Sieste de 1h30. Très bonne humeur.",mood:"😄"},
    {id:"t2",eId:"e1",auteur:"parent",date:TODAY_STR,h:"07h28",txt:"Léo a peu dormi, petite fièvre hier soir (37.8°). A pris du Doliprane à 6h. À surveiller.",mood:"😴"},
    {id:"t3",eId:"e2",auteur:"asmat",date:TODAY_STR,h:"17h45",txt:"Emma a refusé la sieste mais est restée calme. Beaucoup joué aux puzzles. Repas complet.",mood:"😊"},
    {id:"t4",eId:"e3",auteur:"asmat",date:TODAY_STR,h:"17h00",txt:"Noah commence à marcher ! Il a fait 4 pas aujourd'hui 🥹 Sieste 2h. Très bon appétit.",mood:"🥰"},
    {id:"t5",eId:"e3",auteur:"parent",date:TODAY_STR,h:"07h05",txt:"Nuit agitée, pousse une dent. Gel de dentition dans le sac si besoin.",mood:"😬"},
  ],
  messages:[
    {id:"m1",eId:"e1",de:"parent",h:"08h02",txt:"Bonjour Marie ! Léo a bien dormi finalement 😊",lu:true},
    {id:"m2",eId:"e1",de:"asmat",h:"08h15",txt:"Bonjour Sophie ! Super, il arrive tout souriant alors 🌟",lu:true},
    {id:"m3",eId:"e1",de:"parent",h:"16h30",txt:"Il peut rester un peu plus tard ce soir ? Mon train est retardé...",lu:false},
    {id:"m4",eId:"e3",de:"asmat",h:"10h22",txt:"Noah a fait ses 4 premiers pas ! J'ai filmé, je vous envoie ça ce soir !",lu:false},
    {id:"m5",eId:"e3",de:"parent",h:"10h35",txt:"QUOIIIII 😱😭❤️ Merci Marie vous êtes la meilleure !!",lu:true},
  ],
  pointages:[
    {id:"pt1",eId:"e1",date:TODAY_STR,arr:"07h35",dep:"17h20",tot:"9h45",valide:true},
    {id:"pt2",eId:"e2",date:TODAY_STR,arr:"08h05",dep:null,tot:null,valide:false},
    {id:"pt3",eId:"e3",date:TODAY_STR,arr:"07h10",dep:"17h05",tot:"9h55",valide:true},
    {id:"pt4",eId:"e1",date:jourDecale(-7),arr:"07h40",dep:"17h25",tot:"9h45",valide:true},
    {id:"pt5",eId:"e2",date:jourDecale(-7),arr:"08h00",dep:"18h00",tot:"10h00",valide:true},
    {id:"pt6",eId:"e3",date:jourDecale(-7),arr:"07h05",dep:"17h10",tot:"10h05",valide:true},
    {id:"pt7",eId:"e1",date:jourDecale(-1),arr:"08h30",dep:"17h00",tot:"8h30",valide:true,
     valide_parent:true,mode_pointage:"borne",date_validation:jourDecale(-1)+"T08:30:00Z"},
  ],
  repas:[
    {id:"r1",eId:"e1",date:TODAY_STR,dej:"Tout mangé",gou:"Yaourt + compote",bib:null,notes:"",q:"bien"},
    {id:"r2",eId:"e2",date:TODAY_STR,dej:"½ portion",gou:"Pain + lait végétal",bib:null,notes:"Pas très faim",q:"peu"},
    {id:"r3",eId:"e3",date:TODAY_STR,dej:"Tout mangé",gou:"Compote",bib:"2×180ml",notes:"",q:"bien"},
  ],
  changes:[
    {id:"ch1",eId:"e1",date:TODAY_STR,h:"09h15",type:"Propre",n:""},
    {id:"ch2",eId:"e1",date:TODAY_STR,h:"12h30",type:"Change",n:""},
    {id:"ch3",eId:"e3",date:TODAY_STR,h:"09h00",type:"Change",n:""},
    {id:"ch4",eId:"e3",date:TODAY_STR,h:"14h30",type:"Change",n:"Siège irrité, crème"},
  ],
  heures:{"e1":{prev:160,real:152},"e2":{prev:140,real:138},"e3":{prev:180,real:178}},
  absences:[
    {id:"ab1",eId:"e1",date:jourDecale(-10),motif:"Maladie",indemnise:true,heures:9},
    {id:"ab2",eId:"e2",date:jourDecale(-8),motif:"Décision parent",indemnise:true,heures:8},
    {id:"ab3",eId:"e3",date:jourDecale(-15),motif:"Congés parents",indemnise:false,heures:9},
  ],
  evenements:[
    // Les types doivent appartenir a TYPES_EV. « conge » et « hol » y etaient
    // inconnus : ils tombaient dans la couleur par defaut, et c'est ce qui
    // rendait le defaut de la carte « Prochains evenements » invisible.
    {id:"ev1",date:jourDecale(8),type:"cng",txt:"Congés assmat"},
    {id:"ev2",date:jourDecale(13),type:"rdv",txt:"Réunion parents Emma"},
    {id:"ev3",date:jourDecale(18),type:"sor",txt:"Sortie au parc"},
    {id:"ev4",date:jourDecale(25),type:"abs",txt:"Absent - Léo"},
    {id:"ev5",date:jourDecale(-2),type:"mal",txt:"Maladie - journée non assurée",heures:8},
  ],
  portfolio:[
    {id:"pf1",eId:"e1",date:TODAY_STR,titre:"Peinture cerisier",desc:"Coton-tige et peinture rose, inspiration japonaise",emoji:"🌸",competences:["Motricité fine","Créativité"]},
    {id:"pf2",eId:"e1",date:jourDecale(-9),titre:"Plantation radis",desc:"Découverte des graines, arrosage, responsabilité",emoji:"🌱",competences:["Sciences","Responsabilité"]},
    {id:"pf3",eId:"e2",date:jourDecale(-6),titre:"Puzzle 12 pièces",desc:"Concentration remarquable, fini seul en 8 minutes !",emoji:"🧩",competences:["Logique","Patience"]},
    {id:"pf4",eId:"e3",date:TODAY_STR,titre:"Premiers pas 🎉",desc:"4 pas autonomes, sourire immense. Moment magique.",emoji:"👣",competences:["Motricité globale","Équilibre"]},
    {id:"pf5",eId:"e3",date:jourDecale(-11),titre:"Maracas maison",desc:"Riz dans bouteilles, découverte du son et du rythme",emoji:"🎵",competences:["Éveil musical","Créativité"]},
  ],
  milestones:{
    "e1":[
      {id:"ms1",cat:"Langage",txt:"Dit des phrases de 3 mots",ok:true,age_attendu:"24-30 mois"},
      {id:"ms2",cat:"Langage",txt:"Nomme des couleurs",ok:true,age_attendu:"24-36 mois"},
      {id:"ms3",cat:"Social",txt:"Joue avec d'autres enfants",ok:true,age_attendu:"24-36 mois"},
      {id:"ms4",cat:"Motricité",txt:"Monte les escaliers seul",ok:true,age_attendu:"24 mois"},
      {id:"ms5",cat:"Motricité",txt:"Saute à pieds joints",ok:false,age_attendu:"24-30 mois"},
      {id:"ms6",cat:"Autonomie",txt:"Mange seul à la cuillère",ok:true,age_attendu:"18-24 mois"},
    ],
    "e2":[
      {id:"ms7",cat:"Langage",txt:"Vocabulaire 200+ mots",ok:true,age_attendu:"24-30 mois"},
      {id:"ms8",cat:"Langage",txt:"Pose des questions «pourquoi»",ok:true,age_attendu:"30-36 mois"},
      {id:"ms9",cat:"Motricité",txt:"Court, saute, grimpe",ok:true,age_attendu:"24-36 mois"},
      {id:"ms10",cat:"Autonomie",txt:"S'habille partiellement seul",ok:true,age_attendu:"30-36 mois"},
      {id:"ms11",cat:"Social",txt:"Partage ses jouets",ok:false,age_attendu:"30-42 mois"},
    ],
    "e3":[
      {id:"ms12",cat:"Motricité",txt:"Marche seul",ok:true,age_attendu:"9-15 mois"},
      {id:"ms13",cat:"Langage",txt:"Dit «mama» «papa»",ok:true,age_attendu:"10-14 mois"},
      {id:"ms14",cat:"Langage",txt:"Dit 5-10 mots",ok:false,age_attendu:"12-18 mois"},
      {id:"ms15",cat:"Social",txt:"Joue à «coucou»",ok:true,age_attendu:"9-12 mois"},
      {id:"ms16",cat:"Motricité",txt:"Tient un crayon",ok:false,age_attendu:"12-18 mois"},
    ],
  },
  moodHistory:{"e1":[4,3,4,5,4,4,3,5,4,4,5,4,3,4,5],"e2":[3,4,4,3,5,4,4,4,3,4,4,5,3,4,4],"e3":[5,4,5,4,4,5,4,5,5,4,5,4,5,5,5]},
};

//
//
// FORFAIT — le gratuit donne acces a un enfant et au quotidien : journee,
// pointage, sante, messagerie, calendrier. Bulletins de salaire, declaration
// Pajemploi et enfants supplementaires relevent du Pro.
//
// Ces limites etaient annoncees sur la page tarifs sans exister nulle part
// dans le code : une utilisatrice gratuite avait exactement la meme
// application qu'une abonnee, et donc aucune raison de payer.
//
// Un parent n'est jamais bride : son espace est gratuit par construction.
export const LIMITE_ENFANTS_GRATUIT = 1;
// ---------------------------------------------------------------------------
// L'ESSAI DE DEUX MOIS, SANS CARTE BANCAIRE
//
// Avant, l'essai n'existait QUE chez Stripe : la session de paiement était
// créée avec trial_period_days=60. Pour en profiter il fallait donc ouvrir
// Stripe et saisir une carte — alors que la page promettait « 2 mois offerts,
// sans carte bancaire ». La promesse était fausse, et c'est la carte demandée
// à l'inscription qui coûtait le plus d'inscriptions.
//
// L'essai vit désormais chez nous : le compte naît en « trialing » avec une
// date de fin, et Stripe n'intervient qu'au moment de continuer. C'est là,
// et seulement là, qu'une carte est demandée.
export const DUREE_ESSAI_JOURS = 60;
export const finEssaiDepuis = (depuis = new Date()) =>
  new Date(depuis.getTime() + DUREE_ESSAI_JOURS * 86400000).toISOString();

// LE point de passage unique : tout compte qui naît passe par ici. Un
// `subscription_status:'free'` écrit à la main dans un chemin d'inscription
// rendrait l'essai muet pour les comptes créés par ce chemin-là, sans que rien
// ne plante — une barrière d'audit l'interdit donc.
export const abonnementInitial = (role) => (role === "parent"
  // L'espace parent est gratuit par construction : il n'a pas d'essai à user.
  ? { subscription_status: "free", subscription_end_date: null }
  : { subscription_status: "trialing", subscription_end_date: finEssaiDepuis() });

// Un essai sans date de fin ne finissait JAMAIS : estPro() acceptait
// « trialing » sans rien regarder d'autre. Le compte restait Pro à vie.
//
// Une date absente ne fait pas expirer : les comptes « trialing » venus de
// Stripe avant ce changement n'en ont pas, et couper l'accès à quelqu'un par
// défaut de donnée serait la pire des deux erreurs.
export const joursRestantsEssai = (u) => {
  if (u?.subscription_status !== "trialing" || !u?.subscription_end_date) return null;
  const fin = new Date(u.subscription_end_date).getTime();
  if (Number.isNaN(fin)) return null;
  return Math.ceil((fin - Date.now()) / 86400000);
};
export const essaiExpire = (u) => {
  const j = joursRestantsEssai(u);
  return j !== null && j <= 0;
};
export const estPro = (u) =>
  u?.role === "parent" ||
  u?.subscription_status === "pro" ||
  (u?.subscription_status === "trialing" && !essaiExpire(u));
const peutAjouterEnfant = (u, enfants) =>
  estPro(u) || (enfants || []).length < LIMITE_ENFANTS_GRATUIT;

// STOCKAGE — le gratuit accepte 20 photos et 50 Mo de documents, le Pro
// 5 Go de documents et des photos sans limite de nombre.
//
// La mesure passe par la fonction quota_stockage() : storage.objects n'est pas
// interrogeable depuis le client, et lister les fichiers un par un couterait
// une requete par dossier. La fonction ne lit que le prefixe de l'appelante.
export const QUOTAS = {
  gratuit: { photos: 20, documentsOctets: 50 * 1024 * 1024 },
  pro: { photos: Infinity, documentsOctets: 5 * 1024 * 1024 * 1024 },
};
export const quotaDe = (u) => (estPro(u) ? QUOTAS.pro : QUOTAS.gratuit);
export const enMo = (o) => (o >= 1024 * 1024 * 1024
  ? nbf((o / 1024 / 1024 / 1024),1) + " Go"
  : nbf((o / 1024 / 1024),1) + " Mo");

export async function lireQuota() {
  try {
    const { data, error } = await supabase.rpc("quota_stockage");
    if (error || !data || !data[0]) return null;
    const q = data[0];
    return {
      photosNb: Number(q.photos_nb) || 0,
      photosOctets: Number(q.photos_octets) || 0,
      docsNb: Number(q.documents_nb) || 0,
      docsOctets: Number(q.documents_octets) || 0,
    };
  } catch (e) { console.warn("quota", e); return null; }
}

// Verifie qu'il reste de la place avant d'envoyer.
//
// En cas d'echec de la mesure, on laisse passer : une coupure reseau ne doit
// pas empecher quelqu'un de travailler, et le risque d'un fichier de trop est
// sans commune mesure avec celui d'une journee bloquee.
async function placeDisponible(user, type, octets = 0) {
  const lim = quotaDe(user);
  const q = await lireQuota();
  if (!q) return { ok: true };
  if (type === "photos") {
    if (q.photosNb >= lim.photos) return {
      ok: false, quota: q,
      message: `Vous avez atteint la limite de ${lim.photos} photos du forfait gratuit. Supprimez-en quelques-unes dans Paramètres, ou passez au Pro pour des photos sans limite.`,
    };
  } else if (q.docsOctets + octets > lim.documentsOctets) {
    return {
      ok: false, quota: q,
      message: `Ce fichier dépasse l'espace disponible (${enMo(lim.documentsOctets)}). Faites de la place dans Paramètres, ou passez au Pro.`,
    };
  }
  return { ok: true, quota: q };
}

// L'espace occupe, et de quoi faire de la place sans chercher soi-meme quels
// fichiers supprimer. Sans cet ecran, une limite atteinte serait une impasse.
export function VerrouPro({ titre, desc, cta = "Voir le forfait Pro" }) {
  return <div className="card" style={{ padding: "var(--pad-carte-l)", textAlign: "center", border: "1.5px dashed var(--accent)" }}>
    <div style={{ marginBottom: 10 }}><IconeOuEmoji e="🔒" taille={34} couleur="var(--accent)"/></div>
    <div className="pf" style={{ fontSize: 17, fontWeight: 700, color: "var(--b)", marginBottom: 8 }}>{titre}</div>
    <div style={{ fontSize: 13, color: "var(--m)", lineHeight: 1.7, maxWidth: 420, margin: "0 auto 18px" }}>{desc}</div>
    <button className="btn bT" onClick={() => window.dispatchEvent(new CustomEvent("timat:page", { detail: "parametres" }))}>
      {cta}
    </button>
    <div style={{ fontSize: 11, color: "var(--l)", marginTop: 10 }}>2 mois offerts, sans carte bancaire</div>
  </div>;
}

export const age=(d)=>{const n=new Date(d),t=new Date(),m=(t.getFullYear()-n.getFullYear())*12+(t.getMonth()-n.getMonth());return m>=24?Math.floor(m/12)+" ans":m+" mois"};
export const fmt=(s)=>s?new Date(s).toLocaleDateString("fr-FR"):"-";
const ini=(p,n)=>(p[0]+n[0]).toUpperCase();
// ===== LOT C — Avatar enfant : emoji OU photo (miniature base64 stockée dans enfants.photo_url, protégée par RLS) =====
export function AvatarEnfant({e,size=24,style={}}){
  if(e&&e.photo_url)return <img src={e.photo_url} alt={e?.prenom||""} style={{width:size,height:size,borderRadius:"50%",objectFit:"cover",flexShrink:0,verticalAlign:"middle",...style}}/>;
  return <span style={{fontSize:Math.round(size*0.86),lineHeight:1,...style}}>{(e&&e.emoji)||"👶"}</span>;
}
async function resizePhotoEnfant(file){
  return new Promise((resolve,reject)=>{
    const img=new Image();
    img.onload=()=>{
      const side=Math.min(img.width,img.height);
      const s=Math.min(side,200);
      const c=document.createElement("canvas");c.width=s;c.height=s;
      const ctx=c.getContext("2d");
      ctx.drawImage(img,(img.width-side)/2,(img.height-side)/2,side,side,0,0,s,s);
      resolve(c.toDataURL("image/jpeg",0.82));
    };
    img.onerror=reject;
    const fr=new FileReader();fr.onload=()=>{img.src=fr.result;};fr.onerror=reject;fr.readAsDataURL(file);
  });
}
export function AvatarPicker({emoji,photo,onEmoji,onPhoto}){
  const EMOJIS=["🦁","🌸","⭐","🐻","🦋","🌈","🐸","🦊","🐼","🌻","🦄","🐝","🐰","🐧","🦉","🐳"];
  const [busy,setBusy]=useState(false);
  const fileRef=useRef(null);
  const choisir=async(f)=>{
    if(!f)return;
    if(f.size>8*1024*1024){alert("Photo trop lourde (8 Mo max).");return;}
    setBusy(true);
    try{const b64=await resizePhotoEnfant(f);onPhoto(b64);}catch(e){alert("Impossible de lire cette image.");}
    setBusy(false);
  };
  return <div>
    <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:photo?0:10}}>
      <div style={{width:64,height:64,borderRadius:"50%",background:"var(--c)",border:"2px solid var(--br)",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",flexShrink:0}}>
        {photo?<img src={photo} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span style={{fontSize:34}}>{emoji||"👶"}</span>}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:6,alignItems:"flex-start"}}>
        <button type="button" onClick={()=>fileRef.current&&fileRef.current.click()} disabled={busy} style={{padding:"7px 12px",borderRadius:10,border:"1.5px solid var(--accent)",background:"var(--accent-pale)",color:"var(--accent)",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>{busy?"…":(photo?"📷 Changer la photo":"📷 Ajouter une photo")}</button>
        {photo&&<button type="button" onClick={()=>onPhoto(null)} style={{padding:"2px 4px",borderRadius:10,border:"none",background:"none",color:"var(--R)",fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>Retirer la photo</button>}
      </div>
      <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>choisir(e.target.files&&e.target.files[0])}/>
    </div>
    {!photo&&<div>
      <div style={{fontSize:11,color:"var(--l)",margin:"2px 0 5px"}}>…ou choisissez un emoji :</div>
      <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
        {EMOJIS.map(em=><button key={em} type="button" onClick={()=>onEmoji(em)} className={"moo "+(emoji===em?"on":"")} style={{fontSize:18,padding:"4px 7px"}}>{em}</button>)}
      </div>
    </div>}
  </div>;
}
export function AvatarEditeur({enfant,onClose,onSaved}){
  const [emoji,setEmoji]=useState((enfant&&enfant.emoji)||"🦁");
  const [photo,setPhoto]=useState((enfant&&enfant.photo_url)||null);
  const [saving,setSaving]=useState(false);
  const sauver=async()=>{
    setSaving(true);
    try{
      const{error}=await supabase.from("enfants").update({emoji:emoji,photo_url:photo||null}).eq("id",enfant.id);
      if(error){alert("Erreur : "+error.message);setSaving(false);return;}
      onSaved&&onSaved({...enfant,emoji:emoji,photo_url:photo||null});
      onClose&&onClose();
    }catch(e){alert("Erreur réseau.");}
    setSaving(false);
  };
  return <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300,padding:18}}>
    <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:18,padding:22,maxWidth:380,width:"100%",boxShadow:"0 20px 60px rgba(0,0,0,.3)"}}>
      <div style={{fontWeight:700,fontSize:16,color:"var(--b)",marginBottom:4}}>Photo de {enfant&&enfant.prenom}</div>
      <div style={{fontSize:12,color:"var(--l)",marginBottom:16,lineHeight:1.5}}>Ajoutez une photo de l'enfant ou gardez un emoji. Le parent la verra aussi.</div>
      <AvatarPicker emoji={emoji} photo={photo} onEmoji={setEmoji} onPhoto={setPhoto}/>
      <div style={{display:"flex",gap:8,marginTop:18}}>
        <button onClick={onClose} style={{flex:1,padding:"11px",borderRadius:10,border:"1.5px solid var(--br)",background:"#fff",color:"var(--m)",fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Annuler</button>
        <button onClick={sauver} disabled={saving} style={{flex:1,padding:"11px",borderRadius:10,border:"none",background:"var(--accent)",color:"#fff",fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{saving?"…":"Enregistrer"}</button>
      </div>
    </div>
  </div>;
}
export const todayStr=()=>new Date().toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
const moodVal={"😄":5,"😊":4,"😐":3,"😴":2,"😢":1,"😠":1,"🥰":5,"😬":2};

//
function Av({t,c,s=36}){return <div className="av"style={{width:s,height:s,background:c+"22",color:c,fontSize:Math.max(11,s*.34),minWidth:s}}>{t}</div>}
export function CPill({e,sel,onClick,badge}){return <div className={"card cp "+(sel?"on":"")+""}onClick={onClick}style={{padding:"9px 13px",display:"flex",alignItems:"center",gap:9,position:"relative"}}>
  <span style={{fontSize:20}}>{e.emoji}</span><div><div style={{fontWeight:700,fontSize:13,color:"var(--b)"}}>{e.prenom}</div><div style={{fontSize:11,color:"var(--l)"}}>{age(e.naissance)}</div></div>{badge&&<span style={{position:"absolute",top:-6,right:-6}}>{badge}</span>}</div>}

// L'icone du toast etait figee sur ✅. Un message annoncant un pointage EN
// ATTENTE sortait donc avec une coche verte : l'icone disait « enregistre »
// pendant que le texte disait le contraire.
// L'icone etait figee sur ✅. Un message d'erreur sortait donc avec une coche
// verte : l'icone disait « c'est fait » pendant que le texte disait l'inverse.
// La reconnaissance se fait ici, une fois, plutot que dans les ~150 appels.
const ICONE_MESSAGE=(msg)=>/^(erreur|échec|impossible)|erreur\s*:/i.test(String(msg||""))?"⚠️"
  :/en attente de réseau|hors ligne/i.test(String(msg||""))?"📵":"✅";
export function Toast({msg,onClose,icone}){useEffect(()=>{const t=setTimeout(onClose,3000);return()=>clearTimeout(t)},[]);
  return <div className="toast"><IconeOuEmoji e={icone||ICONE_MESSAGE(msg)}/>{msg}</div>}

// Affiche le trace correspondant a un emoji, ou l'emoji lui-meme s'il n'est
// pas encore dans la table. Permet de convertir les icones de menu par
// remplacement mecanique, sans risque pour celles qui ne sont pas couvertes.
export function IconeOuEmoji({e,taille=17,couleur="currentColor"}){
  const trace=EMOJI_TRACE[e];
  return trace
    ?<span style={{display:"inline-block",verticalAlign:"-0.16em",lineHeight:0}}>
       <Icone nom={trace} taille={taille} couleur={couleur} epaisseur={1.9}/>
     </span>
    :<span style={{fontSize:taille-1,lineHeight:1}}>{e}</span>;
}

export function PageHeader({icon,title,sub,action}){
  const trace=EMOJI_TRACE[icon];
  return <div style={{marginBottom:14,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
    <div>
      <div className="pf"style={{fontSize:17,fontWeight:700,color:"var(--b)",marginBottom:2,display:"flex",alignItems:"center",gap:8}}>
        {trace?<Icone nom={trace} taille={19} couleur="var(--B)" epaisseur={1.9}/>:<span>{icon}</span>}
        <span>{title}</span>
      </div>
      {sub&&<div style={{fontSize:12,color:"var(--l)"}}>{sub}</div>}
    </div>
    {action}
  </div>;
}

// ECHEANCIER DECLARATION PAJEMPLOI - rappel mensuel par enfant (depuis janvier 2026 : declaration mensuelle obligatoire, une par enfant, avant le 5 du mois suivant)
// Fenetres : parent visible du 25 au 5 (preparation + fenetre) ; assmat visible du 1er au 5 seulement.
// Statut "declare ce mois" persiste dans declarations_pajemploi (unique enfant_id+mois). Le parent coche, l'assmat voit la pastille verte (lecture seule).
function EcheancierDeclaration({enfants,role,user,demo}){
  const [declared,setDeclared]=useState({}); // {enfantId:true}
  const [busy,setBusy]=useState(null);
  const noms=["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];
  // MODE APERCU : ?apercu=echeancier dans l'URL -> force l'affichage du bandeau hors fenetre (test visuel, sans ecriture Supabase)
  const isPreview=(typeof window!=="undefined")&&new URLSearchParams(window.location.search).get("apercu")==="echeancier";
  const now=new Date();
  const j=now.getDate();
  const fenetreNaturelle=j<=5;      // 1er au 5 : declaration du mois precedent
  const enPreparation=j>=25;        // 25 a fin de mois : preparation (declarable le mois prochain)
  const fenetreOuverte=isPreview?true:fenetreNaturelle; // en apercu on simule la fenetre ouverte
  const visibleNaturel=role==="parent"?(fenetreNaturelle||enPreparation):fenetreNaturelle;
  const visible=isPreview?true:visibleNaturel;
  const list=(enfants||[]).filter(Boolean);
  // Mois de salaire concerne (cle YYYY-MM) : mois precedent si fenetre ouverte, mois courant si preparation
  const salaryDate=fenetreOuverte?new Date(now.getFullYear(),now.getMonth()-1,1):new Date(now.getFullYear(),now.getMonth(),1);
  const moisKey=salaryDate.getFullYear()+"-"+String(salaryDate.getMonth()+1).padStart(2,"0");
  const moisLabel=noms[salaryDate.getMonth()]+" "+salaryDate.getFullYear();
  const idsKey=list.map(e=>e.id).join(",");

  useEffect(()=>{
    if(!visible||demo||isPreview||!list.length)return;
    let cancelled=false;
    (async()=>{
      const{data,error}=await supabase.from("declarations_pajemploi").select("enfant_id").eq("mois",moisKey).in("enfant_id",list.map(e=>e.id));
      if(cancelled||error)return;
      const map={};(data||[]).forEach(r=>{map[r.enfant_id]=true;});
      setDeclared(map);
    })();
    return()=>{cancelled=true;};
  },[visible,demo,moisKey,idsKey]);

  if(!visible||!list.length)return null;

  const allDeclared=list.every(e=>declared[e.id]);
  if(role==="parent"&&allDeclared)return null; // tout declare -> on masque cote parent

  let echeanceLabel,joursRestants,ouvreLabel;
  if(fenetreOuverte){
    echeanceLabel="avant le 5 "+noms[now.getMonth()]+" "+now.getFullYear();
    joursRestants=fenetreNaturelle?(5-j):3; // en apercu hors fenetre : valeur representative
  }else{
    const nm=new Date(now.getFullYear(),now.getMonth()+1,1);
    ouvreLabel="ouvre le 1er "+noms[nm.getMonth()]+" "+nm.getFullYear();
    echeanceLabel="avant le 5 "+noms[nm.getMonth()]+" "+nm.getFullYear();
  }
  const urgent=fenetreOuverte&&joursRestants<=2;
  const accent=urgent?"var(--R)":"var(--b)";
  const bg=urgent?"#FBEAE6":"var(--c)";

  const toggleDeclare=async(enfantId)=>{
    if(role!=="parent")return;
    if(isPreview){ // apercu : toggle purement local, aucune ecriture Supabase
      setDeclared(d=>{const n={...d};if(n[enfantId])delete n[enfantId];else n[enfantId]=true;return n;});
      return;
    }
    if(demo||!user?.id)return;
    setBusy(enfantId);
    try{
      if(declared[enfantId]){
        await supabase.from("declarations_pajemploi").delete().eq("enfant_id",enfantId).eq("mois",moisKey);
        setDeclared(d=>{const n={...d};delete n[enfantId];return n;});
      }else{
        await supabase.from("declarations_pajemploi").upsert({parent_id:user.id,enfant_id:enfantId,mois:moisKey},{onConflict:"enfant_id,mois"});
        setDeclared(d=>({...d,[enfantId]:true}));
      }
    }catch(e){/* silencieux */}
    setBusy(null);
  };

  return <div className="card" style={{marginBottom:14,border:"1.5px solid "+accent,background:bg}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8,marginBottom:6}}>
      <div style={{fontWeight:700,color:accent,fontSize:14}}><IconeOuEmoji e="📅"/> Déclaration Pajemploi — salaire de {moisLabel}{isPreview&&<span style={{marginLeft:8,fontSize:11,fontWeight:700,color:"#fff",background:"var(--T)",borderRadius:6,padding:"2px 7px",verticalAlign:"middle"}}>APERÇU</span>}</div>
      {fenetreOuverte
        ?<span style={{fontSize:12,fontWeight:700,color:accent,background:"#fff",border:"1px solid "+accent,borderRadius:20,padding:"3px 10px"}}>{joursRestants===0?"dernier jour !":joursRestants+" jour"+(joursRestants>1?"s":"")+" restant"+(joursRestants>1?"s":"")}</span>
        :<span style={{fontSize:11,color:"var(--l)",fontStyle:"italic"}}>{ouvreLabel}</span>}
    </div>
    <div style={{fontSize:12.5,color:"var(--m)",lineHeight:1.6,marginBottom:8}}>
      {role==="parent"
        ?<>En tant qu'employeur, déclarez le salaire net versé <b>{echeanceLabel}</b> sur Pajemploi, puis cochez chaque enfant ci-dessous.</>
        :<>Le parent employeur doit déclarer le salaire net <b>{echeanceLabel}</b> sur Pajemploi.</>}
      {" "}Depuis janvier 2026, la déclaration est mensuelle et obligatoire, <b>une par enfant</b>.
    </div>
    <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
      {list.map(e=>{
        const ok=!!declared[e.id];
        const label=ok?("✓ "+(e.prenom||"Enfant")+" · déclaré"):((e.prenom||"Enfant")+" · à déclarer");
        const base={fontSize:11,borderRadius:14,padding:"4px 10px",display:"inline-flex",alignItems:"center",gap:4,opacity:busy===e.id?0.5:1};
        const okStyle={...base,background:"var(--Sp)",border:"1px solid var(--S)",color:"var(--S)",fontWeight:700};
        const todoStyle={...base,background:"#fff",border:"1px solid var(--br)",color:"var(--m)"};
        if(role==="parent")
          return <button key={e.id} onClick={()=>toggleDeclare(e.id)} disabled={busy===e.id} style={{...(ok?okStyle:todoStyle),cursor:"pointer"}} title={ok?"Annuler":"Marquer comme déclaré"}><IconeOuEmoji e="👶"/> {label}</button>;
        return <span key={e.id} style={ok?okStyle:todoStyle}><IconeOuEmoji e="👶"/> {label}</span>;
      })}
    </div>
    <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
      <a href="https://www.pajemploi.urssaf.fr" target="_blank" rel="noopener noreferrer" className="btn bT s" style={{padding:"7px 14px",textDecoration:"none",display:"inline-block"}}>Ouvrir Pajemploi ↗</a>
      <span style={{fontSize:11.5,color:"var(--l)",fontStyle:"italic"}}>TiMat ne déclare pas à votre place (pas encore tiers-déclarant) : la déclaration officielle se fait sur Pajemploi.</span>
    </div>
  </div>;
}

// LE QR DE POINTAGE, FABRIQUE DANS LA PAGE.
//
// L'image etait demandee a api.qrserver.com, un service exterieur, en lui
// passant dans l'adresse l'identifiant de l'enfant concerne. Ce service
// recevait donc, a chaque affichage et a chaque impression, un identifiant qui
// designe un enfant precis — sur une application qui promet des donnees
// hebergees en France. L'identifiant seul ne donne acces a rien, mais c'est un
// transfert vers un tiers non declare, et il etait evitable.
//
// Consequence utile au passage : le QR s'affiche et s'imprime sans reseau, et
// en vectoriel — donc net a n'importe quelle taille de papier.
const qrChemin=(valeur,module=4,marge=4)=>{
  const q=qrcode(0,"M");
  q.addData(String(valeur||""));
  q.make();
  const n=q.getModuleCount();
  let d="";
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){
    if(q.isDark(y,x))d+="M"+((x+marge)*module)+" "+((y+marge)*module)+"h"+module+"v"+module+"h-"+module+"z";
  }
  return{d,cote:(n+marge*2)*module};
};

export function QRPointage({valeur,taille=180,style}){
  const{d,cote}=useMemo(()=>qrChemin(valeur),[valeur]);
  return <svg role="img" aria-label="QR code de pointage"
    viewBox={"0 0 "+cote+" "+cote} width={taille} height={taille}
    style={{background:"#fff",display:"block",...style}}>
    <rect width={cote} height={cote} fill="#fff"/>
    <path d={d} fill="#000"/>
  </svg>;
}

// Le meme QR, en balisage brut, pour la fenetre d'impression — qui est un document a
// part et ne partage pas le rendu React.
export const qrSvgBalise=(valeur,cote=300)=>{
  const{d,cote:c}=qrChemin(valeur);
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+c+' '+c+'" width="'+cote+'" height="'+cote+'">'
    +'<rect width="'+c+'" height="'+c+'" fill="#fff"/><path d="'+d+'" fill="#000"/></svg>';
};

//
// POINTAGE RAPIDE - pointer arrivee/depart en 1 tap directement depuis l'espace (parent OU assmat),
// via la meme RPC pointage_qr que le scan. Statut du jour en direct, sans chercher ni scanner.
function PointageRapide({enfants,role,user,demo}){
  const list=(enfants||[]).filter(Boolean);
  const [status,setStatus]=useState({}); // {enfantId:{arrivee,depart}}
  const [busy,setBusy]=useState(null);
  const [toast,setToast]=useState("");
  const [qrFor,setQrFor]=useState(null);
  const [editAvatar,setEditAvatar]=useState(null);
  const [avatarOv,setAvatarOv]=useState({});
  const ids=list.map(e=>e.id).join(",");
  const hhmm=(t)=>{if(!t)return"";const s=String(t);return s.includes("T")?s.split("T")[1].slice(0,5):s.slice(0,5);};
  const fetchStatus=async()=>{
    if(demo||!user?.id||!list.length)return;
    const{data,error}=await supabase.from("pointages").select("enfant_id,arrivee,depart,date").in("enfant_id",list.map(e=>e.id)).eq("date",TODAY_STR);
    if(error)return;
    const map={};(data||[]).forEach(p=>{map[p.enfant_id]={arrivee:p.arrivee,depart:p.depart};});
    setStatus(map);
  };
  useEffect(()=>{fetchStatus();/* eslint-disable-next-line */},[ids,demo,user?.id]);
  const pointer=async(e)=>{
    const st=status[e.id]||{};
    if(st.arrivee&&st.depart)return; // journee terminee
    if(demo){
      setStatus(s=>{const n={...s};const cur=n[e.id]||{};const now=new Date().toTimeString().slice(0,5);if(!cur.arrivee)n[e.id]={arrivee:now};else n[e.id]={...cur,depart:now};return n;});
      setToast("Démo : pointage simulé ✓");return;
    }
    setBusy(e.id);
    try{
      const{data,error}=await supabase.rpc("pointage_qr",{p_enfant_id:e.id});
      if(error||data?.success===false)setToast("❌ "+(error?.message||data?.error||"Échec du pointage"));
      else{setToast((data?.action==="depart"||status[e.id]?.arrivee)?"🏁 Départ enregistré ✓":"✅ Arrivée enregistrée ✓");window.dispatchEvent(new CustomEvent("timat:refresh-data"));}
      await fetchStatus();
    }catch(err){setToast("❌ Erreur pointage");}
    setBusy(null);
  };
  if(!list.length)return null;
  const origin=(typeof window!=="undefined"&&window.location.origin)||"https://www.timat.app";
  const showQR=role==="asmat"&&!demo;
  const qrCible=(e)=>origin+"/?pointage=qr&enfant="+e.id;
  const imprimerQR=(e)=>{
    const w=window.open("","_blank","width=420,height=580");if(!w)return;
    w.document.write("<html><head><title>QR "+(e.prenom||"Enfant")+"</title></head><body style='font-family:sans-serif;text-align:center;padding:30px'><h2>"+(e.emoji||"👶")+" "+(e.prenom||"Enfant")+"</h2>"+qrSvgBalise(qrCible(e),300)+"<p style='color:#555;font-size:14px;max-width:300px;margin:16px auto'>1er scan = arrivée · 2e scan = départ. À afficher à l'entrée du lieu d'accueil.</p></body></html>");
    w.document.close();setTimeout(()=>{try{w.print();}catch(x){}},400);
  };
  return <div className="card" style={{marginBottom:16,border:"1.5px solid var(--Sp)",background:"var(--c)"}}>
    {toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
    <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:2}}>⏱️ Pointage du jour</div>
    <div style={{fontSize:11.5,color:"var(--m)",marginBottom:12,lineHeight:1.5}}>
      Un tap pour enregistrer {role==="parent"?"l'arrivée puis le départ de votre enfant":"l'arrivée puis le départ"} — synchronisé sur les deux espaces.{role==="parent"?" (Vous pouvez aussi flasher le QR affiché par l'assistante maternelle.)":""}
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:12}}>
      {list.map(e0=>{
        const e={...e0,...(avatarOv[e0.id]||{})};
        const st=status[e.id]||{};
        const fini=st.arrivee&&st.depart;
        const enCours=st.arrivee&&!st.depart;
        const label=fini?"Journée terminée":enCours?"Noter le départ":"Noter l'arrivée";
        const dotC=fini?"var(--l)":enCours?"var(--S)":"var(--br)";
        const dotT=fini?"Terminée":enCours?"Présent":"Absent";
        return <div key={e.id} style={{background:"#fff",border:"1px solid var(--br)",borderRadius:16,padding:"14px",display:"flex",gap:12,alignItems:"center"}}>
          {showQR?<button type="button" onClick={()=>setEditAvatar(e)} title="Changer la photo ou l'emoji" style={{background:"none",border:"none",cursor:"pointer",padding:0,position:"relative",flexShrink:0,lineHeight:0}}>
            <AvatarEnfant e={e} size={60}/>
            <IconeOuEmoji e="📷"/>
          </button>:<div style={{flexShrink:0,lineHeight:0}}><AvatarEnfant e={e} size={60}/></div>}
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontWeight:700,fontSize:15,color:"var(--b)"}}>{e.prenom||"Enfant"}</div>
            <div style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:"var(--m)",margin:"2px 0 4px"}}>
              <span style={{width:7,height:7,borderRadius:7,background:dotC}}/>{dotT}
              {(st.arrivee||st.depart)&&<span style={{color:"var(--l)"}}>· {st.arrivee?("→ "+hhmm(st.arrivee)):""}{st.depart?(" ← "+hhmm(st.depart)):""}</span>}
            </div>
            <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
              <button className={fini?"btn bG s":"btn bA"} disabled={fini||busy===e.id}
                style={{padding:"7px 12px",opacity:(fini||busy===e.id)?0.55:1,whiteSpace:"nowrap"}}
                onClick={()=>pointer(e)}>{busy===e.id?"…":label}</button>
              {showQR&&<button onClick={()=>setQrFor(e)} style={{background:"none",border:"none",cursor:"pointer",color:"var(--accent)",fontSize:11,fontWeight:600,fontFamily:"inherit",padding:2}}><IconeOuEmoji e="📱"/> QR</button>}
            </div>
          </div>
        </div>;
      })}
    </div>
    {qrFor&&<div onClick={ev=>{if(ev.target===ev.currentTarget)setQrFor(null);}} style={{position:"fixed",inset:0,zIndex:9999,background:"rgba(20,30,40,.55)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div className="card" style={{maxWidth:320,width:"100%",textAlign:"center"}}>
        <div style={{fontWeight:700,fontSize:15,color:"var(--b)",marginBottom:4}}>{qrFor.emoji||"👶"} QR de {qrFor.prenom||"l'enfant"}</div>
        <div style={{fontSize:11.5,color:"var(--m)",marginBottom:12,lineHeight:1.5}}>Le parent le flashe avec l'appareil photo : <b>1er scan = arrivée</b>, <b>2e scan = départ</b>. Réutilisable chaque jour.</div>
        <QRPointage valeur={qrCible(qrFor)} taille={200} style={{borderRadius:12,border:"3px solid var(--br)"}}/>
        <div style={{display:"flex",gap:8,marginTop:14}}>
          <button className="btn bG" style={{flex:1,justifyContent:"center"}} onClick={()=>imprimerQR(qrFor)}><IconeOuEmoji e="🖨️"/> Imprimer</button>
          <button className="btn bT" style={{flex:1,justifyContent:"center"}} onClick={()=>setQrFor(null)}>Fermer</button>
        </div>
      </div>
    </div>}
    {editAvatar&&<AvatarEditeur enfant={editAvatar} onClose={()=>setEditAvatar(null)} onSaved={(up)=>setAvatarOv(o=>({...o,[up.id]:{emoji:up.emoji,photo_url:up.photo_url}}))}/>}
  </div>;
}

//
//
// MODE BORNE — l'ecran de pointage pose dans l'entree.
//
// Trois facons de s'en servir, un seul ecran : un appareil dedie, le telephone
// de l'assistante maternelle tendu au parent, ou plus tard un QR au mur. Le
// materiel n'est pas le sujet.
//
// L'IDENTITE, c'est le point delicat. Une borne dans une entree ne peut pas
// demander a chaque parent de se connecter, et une adresse ouverte qui accepte
// n'importe quel pointage, on en a deja supprime une. La solution evite les
// deux : la borne tourne sous la session de l'assistante maternelle, qui l'a
// ouverte depuis son compte, et le code a quatre chiffres dit QUI a touche
// l'ecran. Aucune nouvelle adresse publique, aucune cle de service.
//
// Le code est verifie PAR LE SERVEUR (RPC pointage_borne) et ne descend jamais
// dans le navigateur : la borne peut donc etre tendue a un parent sans lui
// livrer les codes des autres familles.
//
// Ce que le code ne fait pas : il ne protege pas de l'assistante maternelle
// elle-meme, qui peut deja pointer depuis son application. Il protege de
// l'erreur. La valeur de preuve vient de l'etape suivante — le parent voit le
// pointage aussitot et peut le contester, trace a l'appui.
// Les empreintes des codes de famille, gardees sur l'appareil de la borne.
//
// Sans reseau, le serveur ne peut pas verifier le code — et un pointage envoye
// a l'aveugle, refuse une heure plus tard au rejeu, c'est promettre un
// enregistrement qui n'aura pas lieu. La borne verifie donc elle-meme, contre
// une EMPREINTE : les codes en clair ne sont jamais ecrits sur l'appareil.
// En ligne, c'est le serveur qui tranche, comme avant.
export const BORNE_CLE_EMPREINTES="timat:borne:empreintes";
export const BORNE_CLE_ACTIVE="timat:borne:active";
export const BORNE_CLE_SORTIE="timat:borne:sortie";
const borneActive=()=>{try{return localStorage.getItem(BORNE_CLE_ACTIVE)==="1";}catch(e){return false;}};
export const JETON_BORNE_ALPHABET="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-";
function AccueilAssMat({enfants,setPage,user,demoStats=null}){
  const [showAjout,setShowAjout]=useState(false);
  const [editAvatar,setEditAvatar]=useState(null);
  const [avatarOv,setAvatarOv]=useState({});
  // TABLEAU SIGNATURES P11 - state pour le mini-dashboard
  const [genPdf,setGenPdf]=useState({}); // {[contratId]: 'pending'|'done'|'error'}
  const [rappelState,setRappelState]=useState({}); // {[contratId]: 'sending'|'sent'|'noemail'|'error'}
  const rappelSignature=async(e)=>{
    const ct=e.contrat; if(!ct)return;
    setRappelState(p=>({...p,[ct.id]:"sending"}));
    try{
      let email=e.parent_email||null;
      if(!email&&e.parent_id){
        const{data}=await supabase.from("profiles").select("email").eq("id",e.parent_id).maybeSingle();
        email=data?.email||null;
      }
      if(!email){setRappelState(p=>({...p,[ct.id]:"noemail"}));return;}
      const url=(typeof window!=="undefined"?window.location.origin:"https://www.timat.app")+"/?role=parent";
      await sendNotificationEmail({
        type:"signature_reminder",
        to:email,
        subject:EMAIL_TEMPLATES.signature_reminder.subject,
        template:"signature_reminder",
        vars:{enfant_prenom:e.prenom,date:ct.created_at?String(ct.created_at).slice(0,10):"—",url},
      });
      setRappelState(p=>({...p,[ct.id]:"sent"}));
    }catch(err){ setRappelState(p=>({...p,[ct.id]:"error"})); }
  };
  const [tabToast,setTabToast]=useState("");
  // STATS TEMPS REEL P14D - vraies stats Supabase (ou stats de démo injectées)
  const [stats,setStats]=useState(demoStats||{heuresSemaine:0,joursSemaine:0,revenuMois:0,heuresMois:0,messagesNonLus:0,presencesJour:[],loaded:false});
  const isDemoUser=enfants.every(e=>["e1","e2","e3"].includes(e.id));
  const nbEnfants=enfants.length;
  const nonSigne=enfants.filter(e=>!e.contrat?.signe_asmat);
  // FIX P14D - garder pt et tx pour la liste des enfants plus bas (mock D pour l'instant)
  const pt=D.pointages.filter(p=>p.date===TODAY_STR);
  const tx=D.transmissions.filter(t=>t.date===TODAY_STR);

  // STATS TEMPS REEL P14D - charger les stats reelles
  useEffect(()=>{
    if(demoStats){return;}
    if(!user?.id||isDemoUser||nbEnfants===0){
      setStats(s=>({...s,loaded:true}));
      return;
    }
    let cancelled=false;
    (async()=>{
      try{
        // Bornes temporelles
        const now=new Date();
        const todayIso=isoJour(now);
        // Lundi de la semaine (lundi = 1, dimanche = 0 → on calcule l'offset)
        const dayOfWeek=now.getDay();
        const offset=dayOfWeek===0?6:dayOfWeek-1;
        const lundi=new Date(now);lundi.setDate(now.getDate()-offset);lundi.setHours(0,0,0,0);
        const lundiIso=isoJour(lundi);
        // Debut du mois
        const debutMois=isoJour(new Date(now.getFullYear(),now.getMonth(),1));
        const enfantIds=enfants.map(e=>e.id);

        // 1. Pointages de la semaine
        const{data:ptsSemaine}=await supabase.from("pointages").select("total_minutes,date,enfant_id")
          .in("enfant_id",enfantIds).gte("date",lundiIso).lte("date",todayIso);
        const minSemaine=(ptsSemaine||[]).reduce((s,p)=>s+(p.total_minutes||0),0);
        const heuresSemaine=Math.round(minSemaine/60*10)/10;
        const joursSemaineSet=new Set((ptsSemaine||[]).filter(p=>p.total_minutes>0).map(p=>p.date));
        const joursSemaine=joursSemaineSet.size;

        // 2. Pointages du mois pour revenu estime
        const{data:ptsMois}=await supabase.from("pointages").select("total_minutes,enfant_id")
          .in("enfant_id",enfantIds).gte("date",debutMois).lte("date",todayIso);
        const minMois=(ptsMois||[]).reduce((s,p)=>s+(p.total_minutes||0),0);
        const heuresMois=Math.round(minMois/60*10)/10;
        // Revenu estime : sommer (heures × taux) par enfant
        let revenuMois=0;
        enfants.forEach(e=>{
          const taux=e.contrat?.tauxHoraire||0;
          const minEnfant=(ptsMois||[]).filter(p=>p.enfant_id===e.id).reduce((s,p)=>s+(p.total_minutes||0),0);
          revenuMois+=(minEnfant/60)*taux;
        });
        revenuMois=Math.round(revenuMois);

        // 3. Presences en cours aujourd'hui (arrivee mais pas de depart)
        const{data:ptsJour}=await supabase.from("pointages").select("enfant_id,arrivee,depart")
          .in("enfant_id",enfantIds).eq("date",todayIso);
        const presencesJour=(ptsJour||[]).filter(p=>p.arrivee&&!p.depart).map(p=>{
          const e=enfants.find(en=>en.id===p.enfant_id);
          return e?{...e,depuis:p.arrivee}:null;
        }).filter(Boolean);

        // 4. Messages non lus
        const{data:msgs}=await supabase.from("messages").select("id,lu").eq("destinataire_id",user.id).eq("lu",false);
        const messagesNonLus=msgs?.length||0;

        if(cancelled)return;
        setStats({heuresSemaine,joursSemaine,revenuMois,heuresMois,messagesNonLus,presencesJour,loaded:true});
      }catch(e){
        console.warn("[stats accueil]",e.message);
        if(!cancelled)setStats(s=>({...s,loaded:true}));
      }
    })();
    return()=>{cancelled=true;};
  },[user?.id,nbEnfants,isDemoUser,demoStats,enfants.map(e=>e.id).join(",")]);

  // TABLEAU SIGNATURES P11 - regrouper les contrats par statut
  const sigStats=useMemo(()=>{
    const result={asmat:[],parent:[],both:[],none:[]};
    enfants?.forEach(e=>{
      const ct=e.contrat;
      if(!ct)return;
      if(ct.signe_asmat&&ct.signe_parent)result.both.push({enfant:e,contrat:ct});
      else if(ct.signe_asmat)result.asmat.push({enfant:e,contrat:ct});
      else if(ct.signe_parent)result.parent.push({enfant:e,contrat:ct});
      else result.none.push({enfant:e,contrat:ct});
    });
    return result;
  },[enfants]);

  const regenererPDF=async(contratId)=>{
    if(demoStats){setTabToast("Démo : action désactivée");setTimeout(()=>setTabToast(""),1500);return;}
    setGenPdf(p=>({...p,[contratId]:"pending"}));
    const r=await generateAndStoreContratPDF(contratId);
    setGenPdf(p=>({...p,[contratId]:r.success?"done":"error"}));
    setTabToast(r.success?"PDF du contrat regenere ✓":"Erreur : "+r.error);
  };

  // STATS TEMPS REEL P14D - KPIs reels (heures semaine, revenu mois, presences jour, messages)
  const kpis=isDemoUser?[
    {icon:"👶",val:nbEnfants+" enfant"+(nbEnfants>1?"s":""),lbl:"Enfants accueillis",c:"var(--T)",page:"pointage",hint:"→ Pointage"},
    {icon:"💬",val:"0",lbl:"Messages non lus",c:"var(--B)",page:"messagerie",hint:"→ Messagerie"},
    {icon:"📋",val:"Actif",lbl:"Détail du jour",c:"var(--S)",page:"journal_complet",hint:"→ Saisie"},
    {icon:"🧾",val:nbEnfants,lbl:"Contrats actifs",c:"var(--G)",page:"admin_finances",hint:"→ Paie & Contrats"},
  ]:[
    {icon:"⏱️",val:stats.heuresSemaine+" h",lbl:"Heures cette semaine",c:"var(--T)",page:"pointage",hint:"→ Pointage"},
    {icon:"💰",val:stats.revenuMois+" €",lbl:"Revenu estimé du mois",c:"var(--G)",page:"admin_finances",hint:"→ Paie"},
    {icon:"👶",val:stats.presencesJour.length+"/"+nbEnfants,lbl:"Présents maintenant",c:"var(--S)",page:"pointage",hint:"→ Pointage"},
    {icon:"💬",val:stats.messagesNonLus,lbl:"Messages non lus",c:stats.messagesNonLus>0?"var(--R)":"var(--B)",page:"messagerie",hint:"→ Messagerie"},
  ];

  return <div className="fi">
    {tabToast&&<Toast msg={tabToast}onClose={()=>setTabToast("")}/>}
    {showAjout&&user&&<Suspense fallback={<div style={{padding:24,textAlign:"center",color:"var(--m)",fontSize:13}}>Chargement…</div>}><AjouterEnfantModale user={user} onClose={()=>setShowAjout(false)}/></Suspense>}
    {editAvatar&&<AvatarEditeur enfant={editAvatar} onClose={()=>setEditAvatar(null)} onSaved={(up)=>setAvatarOv(o=>({...o,[up.id]:{emoji:up.emoji,photo_url:up.photo_url}}))}/>}
    <div style={{borderRadius:"var(--r)",padding:"22px 22px",marginBottom:18,background:"var(--Bp)",border:"1px solid var(--br)",position:"relative",overflow:"hidden"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,flexWrap:"wrap"}}>
        <div style={{minWidth:0}}>
          <div style={{display:"inline-block",fontSize:11.5,color:"var(--B)",fontWeight:700,letterSpacing:".5px",background:"rgba(255,255,255,.6)",padding:"3px 11px",borderRadius:20,marginBottom:10,fontFamily:"'DM Mono',monospace"}}>
            {todayStr().toUpperCase()}
          </div>
          <div className="pf"style={{fontSize:27,fontWeight:700,color:"var(--b)",lineHeight:1.15}}>Bonjour {user?.prenom||"Marie"} 👋</div>
          <div style={{fontSize:13.5,color:"var(--m)",marginTop:5}}>Voici votre journée en un coup d'œil.</div>
        </div>
        {user&&!demoStats&&<BoutonAjouterEnfant compact user={user} enfants={enfants} onClick={()=>setShowAjout(true)}/>}
      </div>
    </div>

    {/* Guide de demarrage — prise en main des nouveaux comptes (0 enfant) */}
    {nbEnfants===0&&!demoStats&&<div className="card"style={{padding:0,marginBottom:18,overflow:"hidden",border:"1.5px solid var(--T)"}}>
      <div style={{background:"linear-gradient(135deg,var(--Tp),var(--Sp))",padding:"16px 18px"}}>
        <div className="pf"style={{fontSize:18,fontWeight:800,color:"var(--b)"}}><IconeOuEmoji e="🚀"/> Bienvenue sur TiMat !</div>
        <div style={{fontSize:12.5,color:"var(--m)",marginTop:3}}>3 étapes pour démarrer sereinement.</div>
      </div>
      <div style={{padding:14,display:"flex",flexDirection:"column",gap:10}}>
        {[
          {n:"1",t:"Ajoutez votre premier enfant",d:"Créez sa fiche et son contrat.",act:true,btn:"➕ Ajouter",fn:()=>setShowAjout(true)},
          {n:"2",t:"Invitez le parent",d:"Il suit la journée en direct et signe le contrat.",act:false},
          {n:"3",t:"Pointez les présences",d:"Arrivées, départs et absences en un tap.",act:false},
        ].map(s=><div key={s.n}style={{display:"flex",alignItems:"center",gap:13,padding:"11px 13px",background:s.act?"var(--c)":"transparent",borderRadius:14,border:"1px solid "+(s.act?"var(--br)":"transparent"),opacity:s.act?1:.6}}>
          <div style={{flexShrink:0,width:32,height:32,borderRadius:"50%",background:s.act?"var(--T)":"var(--br)",color:s.act?"#fff":"var(--m)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:14}}>{s.n}</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13.5,fontWeight:700,color:"var(--b)"}}>{s.t}</div>
            <div style={{fontSize:11.5,color:"var(--m)",marginTop:1}}>{s.d}</div>
          </div>
          {s.act&&<button className="btn bT s"style={{flexShrink:0}}onClick={s.fn}>{s.btn}</button>}
        </div>)}
      </div>
    </div>}

    <QuickActions role="asmat" setPage={setPage}/>

    {/* ECHEANCIER DECLARATION PAJEMPLOI */}
    <EcheancierDeclaration enfants={enfants} role="asmat" user={user} demo={isDemoUser}/>
    <PointageRapide enfants={enfants} role="asmat" user={user} demo={isDemoUser}/>

    {/* STATS TEMPS REEL P14D - bandeau presences en cours */}
    {!isDemoUser&&stats.loaded&&stats.presencesJour.length>0&&<div className="card" style={{marginBottom:14,background:"linear-gradient(135deg,#E8F4EC,#D9EDE0)",border:"1px solid var(--S)"}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
        <span style={{width:9,height:9,borderRadius:"50%",background:"#3FA868",boxShadow:"0 0 0 4px rgba(63,168,104,.18)",flexShrink:0}}/>
        <span style={{fontSize:12.5,fontWeight:700,color:"#2E7D4F"}}>Actuellement en accueil · {stats.presencesJour.length}</span>
      </div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {stats.presencesJour.map(p=><div key={p.id} style={{display:"flex",alignItems:"center",gap:7,background:"rgba(255,255,255,.7)",borderRadius:30,padding:"4px 12px 4px 5px"}}>
          <AvatarEnfant e={p} size={24}/>
          <span style={{fontSize:12.5,fontWeight:600,color:"var(--b)"}}>{p.prenom}</span>
          <span style={{fontSize:11,color:"var(--m)",fontFamily:"'DM Mono',monospace"}}>{p.depuis?.slice(0,5)}</span>
        </div>)}
      </div>
    </div>}

    {/* Alerte contrats */}
    {nonSigne.length>0&&<button className="ligne-alerte" onClick={()=>setPage("admin_finances")}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--R)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}} aria-hidden="true">
        <path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/>
      </svg>
      <span style={{flex:1,minWidth:0,textAlign:"left"}}>
        <span style={{display:"block",fontSize:13.5,fontWeight:700,color:"var(--R)"}}>
          {nonSigne.length>1?"Contrats à signer":"Contrat à signer"}
        </span>
        <span style={{display:"block",fontSize:12.5,color:"var(--R)",opacity:.85,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{nonSigne.map(e=>e.prenom).join(", ")}</span>
      </span>
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--R)" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}} aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
    </button>}


    {/* TABLEAU SIGNATURES P11 - vue d'ensemble du statut signatures des contrats */}
    {!isDemoUser&&nbEnfants>0&&<div className="card"style={{marginBottom:16}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,gap:8,flexWrap:"wrap"}}>
        <div style={{fontWeight:700,fontSize:15,color:"var(--b)",display:"flex",alignItems:"center",gap:8}}>
          <IconeOuEmoji e="✍️" taille={18}/> Statut des signatures
        </div>
        <span style={{fontSize:11,color:"var(--m)",fontWeight:600,background:"var(--c)",padding:"4px 11px",borderRadius:20}}>{nbEnfants} contrat{nbEnfants>1?"s":""}</span>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:10,marginBottom:18}}>
        {[
          {l:"Signés (2/2)",c:"var(--S)",n:sigStats.both.length,bg:"var(--Sp)"},
          {l:"Attente parent",c:"#B8892A",n:sigStats.asmat.length,bg:"#FFF8E6"},
          {l:"Attente assmat",c:"var(--B)",n:sigStats.parent.length,bg:"var(--Bp)"},
          {l:"Non signés",c:"var(--R)",n:sigStats.none.length,bg:"var(--Rp)"},
        ].map(s=><div key={s.l}style={{padding:"14px 14px",borderRadius:14,background:s.bg,display:"flex",alignItems:"center",gap:12}}>
          <div className="pf"style={{fontSize:26,fontWeight:700,color:s.c,lineHeight:1,minWidth:22,textAlign:"center"}}>{s.n}</div>
          <div style={{fontSize:11.5,color:s.c,fontWeight:600,lineHeight:1.3}}>{s.l}</div>
        </div>)}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {enfants.map(e=>{
          const ct=e.contrat;if(!ct)return null;
          const both=ct.signe_asmat&&ct.signe_parent;
          const onlyA=ct.signe_asmat&&!ct.signe_parent;
          const onlyP=!ct.signe_asmat&&ct.signe_parent;
          const none=!ct.signe_asmat&&!ct.signe_parent;
          const status=both?{ic:"✅",l:"Signé (assmat + parent)",c:"var(--S)"}
            :onlyA?{ic:"⏳",l:"En attente du parent",c:"#B8892A"}
            :onlyP?{ic:"⏳",l:"En attente de votre signature",c:"var(--B)"}
            :{ic:"❌",l:"Non signé",c:"var(--R)"};
          const genState=genPdf[ct.id];
          return <div key={e.id}style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:"var(--c)",borderRadius:14,flexWrap:"wrap"}}>
            <button type="button" onClick={()=>setEditAvatar({...e,...(avatarOv[e.id]||{})})} title="Changer la photo ou l'emoji" style={{background:"none",border:"none",cursor:"pointer",padding:0,position:"relative",lineHeight:0,flexShrink:0}}>
              <AvatarEnfant e={{...e,...(avatarOv[e.id]||{})}} size={38}/>
              <IconeOuEmoji e="📷"/>
            </button>
            <div style={{flex:1,minWidth:120}}>
              <div style={{fontWeight:700,color:"var(--b)",fontSize:13.5}}>{e.prenom}</div>
              <div style={{color:status.c,fontWeight:600,fontSize:11.5,marginTop:2}}><IconeOuEmoji e={status.ic}/> {status.l}</div>
            </div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
              {none&&<button className="btn bP s"style={{padding:"6px 12px"}}onClick={()=>setPage("admin_finances")}>Signer →</button>}
              {onlyA&&<button className="btn bT s"style={{padding:"6px 11px"}}disabled={["sending","sent"].includes(rappelState[ct.id])}onClick={()=>rappelSignature(e)}>
                {rappelState[ct.id]==="sent"?"✅ Rappel envoyé":rappelState[ct.id]==="sending"?"Envoi…":rappelState[ct.id]==="noemail"?"⚠️ Email parent manquant":"📧 Relancer le parent"}
              </button>}
              {(both||onlyA)&&<button className="btn bG s"style={{padding:"6px 11px"}}disabled={genState==="pending"}onClick={()=>regenererPDF(ct.id)}>
                {genState==="pending"?"…":(ct.pdf_storage_path?"Régénérer PDF":"Générer PDF")}
              </button>}
              {both&&<button className="btn bT s"style={{padding:"6px 11px"}}onClick={()=>setPage("documents")}><IconeOuEmoji e="📄"/> Documents</button>}
            </div>
          </div>;
        })}
      </div>
    </div>}


    {/* Prochains événements */}
    <div className="card">
      <div style={{fontWeight:700,fontSize:15,marginBottom:14,color:"var(--b)",display:"flex",alignItems:"center",gap:8}}>
        <IconeOuEmoji e="📅"/> Prochains événements
      </div>
      {isDemoUser
        ? D.evenements.slice(0,4).map(ev=><div key={ev.id}onClick={()=>setPage("calendrier")}
            style={{display:"flex",gap:10,padding:"10px 10px",alignItems:"center",cursor:"pointer",borderRadius:12,transition:"background .15s"}}
            onMouseEnter={ev2=>ev2.currentTarget.style.background="var(--c)"}
            onMouseLeave={ev2=>ev2.currentTarget.style.background="transparent"}>
            <span className="badge"style={{
              background:typeEv(ev.type).fond,
              color:typeEv(ev.type).texte,
              whiteSpace:"nowrap",fontSize:11,fontWeight:700,padding:"4px 9px",borderRadius:8}}>
              {fmt(ev.date)}
            </span>
            <span style={{fontSize:13,color:"var(--b)",flex:1,fontWeight:500}}>{ev.txt}</span>
            <span style={{fontSize:14,color:"var(--l)"}}>›</span>
          </div>)
        : <div style={{textAlign:"center",padding:"14px 0 6px"}}>
            <div style={{fontSize:28,marginBottom:8,opacity:.6}}>🗓️</div>
            <div style={{fontSize:13,color:"var(--l)",marginBottom:12}}>Aucun événement à venir pour le moment.</div>
            <button className="btn bG s"style={{padding:"8px 16px"}}onClick={()=>setPage("calendrier")}>Ouvrir le calendrier →</button>
          </div>}
    </div>
  </div>;
}

//
function AccueilParent({enfant,setPage,user}){
  // ⚠️ Tous les hooks AVANT le return conditionnel (règle React)
  const [showAbsence,setShowAbsence]=useState(false);
  const [absence,setAbsence]=useState({date:TODAY_STR,motif:"Maladie",heures:"",indemnise:true});
  const [absEnvoyee,setAbsEnvoyee]=useState(false);
  const [toast,setToast]=useState("");

  if(!enfant)return(
    <div className="fi">
      <PageHeader icon="👶" title="Espace famille" sub="Bienvenue sur TiMat"/>
      <div className="card" style={{padding:"var(--pad-carte-l)",textAlign:"center"}}>
        <div style={{fontSize:48,marginBottom:12}}>👶</div>
        <div style={{fontWeight:700,fontSize:16,color:"var(--b)",marginBottom:8}}>Aucun enfant lié à votre compte</div>
        <div style={{fontSize:13,color:"var(--m)",lineHeight:1.7}}>
          Votre assistante maternelle doit vous inviter depuis son espace TiMat.<br/>
          Ou connectez-vous avec un compte démo pour tester l'application.
        </div>
      </div>
    </div>
  );
  const pt=D.pointages.find(p=>p.eId===enfant.id&&p.date===TODAY_STR);
  const txs=D.transmissions.filter(t=>t.eId===enfant.id&&t.date===TODAY_STR);
  const rep=D.repas.find(r=>r.eId===enfant.id&&r.date===TODAY_STR);
  const mms=(D.milestones&&D.milestones[enfant.id])||[];
  const recentMs=mms.filter(m=>m.ok).slice(-1)[0];

  const declarerAbsence=()=>{
    if(!absence.heures)return;
    D.absences.push({id:"ab"+Date.now(),eId:enfant.id,date:absence.date,motif:absence.motif,indemnise:absence.indemnise,heures:parseFloat(absence.heures)});
    // Ne pas modifier D.evenements (données démo globales)
    setAbsEnvoyee(true);
    setShowAbsence(false);
    setToast("Absence déclarée - "+(enfant?.prenomAsmat||"l'assmat")+" a été notifiée ✓");
  };

  return <div className="fi">
    {toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
    <div style={{borderRadius:20,padding:"22px",marginBottom:16,background:"linear-gradient(135deg,var(--Tp) 0%,var(--Sp) 58%,var(--Gp) 100%)",border:"1px solid var(--br)"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12}}>
        <div style={{minWidth:0}}>
          <div style={{display:"inline-block",fontSize:11.5,color:"var(--B)",fontWeight:700,letterSpacing:".5px",background:"rgba(255,255,255,.6)",padding:"3px 11px",borderRadius:20,marginBottom:10,fontFamily:"'DM Mono',monospace"}}>
            {todayStr().toUpperCase()}
          </div>
          <div className="pf"style={{fontSize:23,fontWeight:700,color:"var(--b)",lineHeight:1.15}}>La journée de {enfant.prenom} ✨</div>
          <div style={{fontSize:13,color:"var(--m)",marginTop:5}}>Suivez son quotidien en temps réel.</div>
        </div>
        <button className="btn bT s"style={{padding:"9px 15px",flexShrink:0}}onClick={()=>setShowAbsence(true)}>
          <IconeOuEmoji e="🤒"/> Déclarer une absence
        </button>
      </div>
    </div>

    <QuickActions role="parent" setPage={setPage}/>

    {/* ECHEANCIER DECLARATION PAJEMPLOI */}
    <EcheancierDeclaration enfants={[enfant]} role="parent" user={user} demo={user?.id?.startsWith?.("demo-")||user?.isDemo||["e1","e2","e3"].includes(enfant?.id)}/>

    {/* POINTAGE RAPIDE - 1 tap arrivee/depart */}
    <PointageRapide enfants={[enfant]} role="parent" user={user} demo={user?.id?.startsWith?.("demo-")||user?.isDemo||["e1","e2","e3"].includes(enfant?.id)}/>

    {/* CAHIER DU JOUR - apercu */}
    <div className="card"onClick={()=>setPage&&setPage("cahier_jour")}
      style={{marginBottom:12,cursor:"pointer",transition:"box-shadow .18s",borderLeft:"4px solid var(--P)"}}
      onMouseEnter={e=>e.currentTarget.style.boxShadow="var(--sh2)"}
      onMouseLeave={e=>e.currentTarget.style.boxShadow="var(--sh)"}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <IconeOuEmoji e="📔"/>
          <div>
            <div style={{fontWeight:700,fontSize:14,color:"var(--b)"}}>Cahier du jour de {enfant.prenom}</div>
            <div style={{fontSize:12,color:"var(--l)",marginTop:2}}>Repas, siestes, activités, photos et le mot du jour →</div>
          </div>
        </div>
        <span style={{fontSize:18,color:"var(--P)"}}>→</span>
      </div>
    </div>

    {/* Modale absence */}
    {showAbsence&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:20}}
      onClick={e=>e.target===e.currentTarget&&setShowAbsence(false)}>
      <div className="card"style={{width:"100%",maxWidth:420,padding:"var(--pad-carte-l)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div className="pf"style={{fontSize:18,fontWeight:600,color:"var(--b)"}}><IconeOuEmoji e="🤒"/> Déclarer une absence</div>
          <button onClick={()=>setShowAbsence(false)}style={{background:"none",border:"none",fontSize:18,cursor:"pointer",color:"var(--l)"}}>✕</button>
        </div>
        <div style={{background:"var(--Bp)",borderRadius:10,padding:"10px 14px",marginBottom:16,fontSize:13,color:"var(--B)"}}>
          <IconeOuEmoji e="📢"/> {enfant?.prenomAsmat||"L'assmat"} sera notifiée immédiatement. L'absence sera notée dans le calendrier et prise en compte dans le décompte des heures.
        </div>
        <div style={{display:"grid",gap:12}}>
          <div>
            <label className="lbl">Date d'absence</label>
            <input type="date"className="inp"value={absence.date}onChange={e=>setAbsence(a=>({...a,date:e.target.value}))}/>
          </div>
          <div>
            <label className="lbl">Motif</label>
            <select className="sel"value={absence.motif}onChange={e=>setAbsence(a=>({...a,motif:e.target.value}))}>
              <option>Maladie</option>
              <option>Congés parents</option>
              <option>Décision parent</option>
              <option>Rendez-vous médical</option>
              <option>Autre</option>
            </select>
          </div>
          <div>
            <label className="lbl">Heures prévues ce jour</label>
            <input type="number"className="inp"placeholder="ex: 9"value={absence.heures}onChange={e=>setAbsence(a=>({...a,heures:e.target.value}))} min="0"max="12"step="0.5"/>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <input type="checkbox"id="indem"checked={absence.indemnise}onChange={e=>setAbsence(a=>({...a,indemnise:e.target.checked}))}style={{width:16,height:16,cursor:"pointer",accentColor:"var(--accent)"}}/>
            <label htmlFor="indem"style={{fontSize:13,color:"var(--b)",cursor:"pointer"}}>
              Absence indemnisée (selon contrat)
            </label>
          </div>
        </div>
        <div style={{display:"flex",gap:8,marginTop:20}}>
          <button className="btn bG"style={{flex:1}}onClick={()=>setShowAbsence(false)}>Annuler</button>
          <button className="btn bT"style={{flex:2}}onClick={declarerAbsence}>
            <IconeOuEmoji e="📢"/> Notifier {enfant?.prenomAsmat||"l'assmat"}
          </button>
        </div>
      </div>
    </div>}

    {absEnvoyee&&<div style={{background:"var(--Rp)",border:"1.5px solid var(--R)",borderRadius:12,padding:"10px 16px",marginBottom:14,fontSize:13,color:"var(--R)",fontWeight:600}}>
      <IconeOuEmoji e="✅"/> Absence déclarée et notée dans le calendrier et le décompte des heures.
    </div>}

    <div className="g2"style={{marginBottom:12}}>
      {/* Card enfant */}
      <div className="card"style={{borderTop:"4px solid "+enfant.couleur}}>
        <div style={{display:"flex",gap:14,alignItems:"center",marginBottom:12}}>
          <AvatarEnfant e={enfant} size={84}/>
          <div><div className="pf"style={{fontSize:20,fontWeight:600,color:"var(--b)"}}>{enfant.prenom} {enfant.nom}</div>
            <div style={{fontSize:13,color:"var(--l)"}}>{age(enfant.naissance)}</div>
            {/* « allergies » est nul tant que la fiche n'est pas remplie : sans
                garde, l'accueil du parent ne s'affichait pas du tout. Les
                données de démonstration en ont toujours, d'où l'angle mort. */}
            {(enfant.allergies||[]).length>0&&<div style={{marginTop:6,cursor:"pointer"}}onClick={()=>setPage&&setPage("sante_complet")}>
              {(enfant.allergies||[]).map(a=><span key={a}className="badge"style={{background:"#FEE2E2",color:"#DC2626",marginRight:4,cursor:"pointer"}}><IconeOuEmoji e="⚠️"/> {a}</span>)}
            </div>}
          </div>
        </div>
        {recentMs&&<div onClick={()=>setPage&&setPage("eveil_complet")}
          style={{background:"var(--Sp)",borderRadius:9,padding:"8px 12px",fontSize:13,color:"var(--S)",fontWeight:600,cursor:"pointer"}}>
          <IconeOuEmoji e="🌱"/> Dernière étape : {recentMs.txt} →
        </div>}
      </div>
      {/* Pointage */}
      <div className="card"onClick={()=>setPage&&setPage("pointage")}style={{cursor:"pointer",transition:"box-shadow .18s"}}
        onMouseEnter={e=>e.currentTarget.style.boxShadow="var(--sh2)"}
        onMouseLeave={e=>e.currentTarget.style.boxShadow="var(--sh)"}>
        <div style={{fontWeight:700,marginBottom:12,color:"var(--b)"}}>⏰ Pointage du jour</div>
        {pt?<div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
          {[["Arrivée",pt.arr,"var(--S)"],["Départ",pt.dep||"En cours","var(--T)"],["Total",pt.tot||"-","var(--b)"]].map(([l,v,c])=>
            <div key={l}style={{textAlign:"center"}}><div style={{fontSize:11,color:"var(--l)"}}>{l}</div>
              <div className="pf"style={{fontSize:20,fontWeight:700,color:c}}>{v}</div></div>)}
        </div>:<div style={{fontSize:13,color:"var(--l)"}}>Pas encore arrivé.</div>}
        <div style={{fontSize:11,color:"var(--l)",marginTop:8}}>Voir le détail →</div>
      </div>
    </div>

    {/* Transmissions */}
    <div className="card"onClick={()=>setPage&&setPage("journal_complet")}
      style={{marginBottom:12,cursor:"pointer",transition:"box-shadow .18s"}}
      onMouseEnter={e=>e.currentTarget.style.boxShadow="var(--sh2)"}
      onMouseLeave={e=>e.currentTarget.style.boxShadow="var(--sh)"}>
      <div style={{fontWeight:700,marginBottom:12,color:"var(--b)"}}><IconeOuEmoji e="📋"/> Journal de la journée</div>
      {txs.length===0?<EmptyState compact emoji="💬" titre="Pas encore de transmission" texte="Le journal du jour de votre enfant s'affichera ici dès que votre assistante maternelle écrira un mot." cta="Voir le cahier du jour" onCta={()=>setPage&&setPage("cahier_jour")}/>
        :txs.map(t=><div key={t.id}style={{display:"flex",gap:10,marginBottom:10}}>
          <div style={{fontSize:22}}>{t.mood}</div>
          <div style={{flex:1,background:t.auteur==="asmat"?"var(--Tp)":"var(--Bp)",borderRadius:10,padding:"9px 12px",
            borderLeft:(t.auteur==="asmat"?"3px solid var(--T)":"3px solid var(--B)")}}>
            <div style={{fontSize:11,fontWeight:700,color:t.auteur==="asmat"?"var(--T)":"var(--B)",marginBottom:3}}>
              {t.auteur==="asmat"?"👩👧 "+(user?.prenom||"Marie"):"👪 Vous"} · {t.h}</div>
            <div style={{fontSize:13,color:"var(--b)",lineHeight:1.5}}>{t.txt}</div>
          </div>
        </div>)}
    </div>

    {rep&&<div className="card"onClick={()=>setPage&&setPage("journal_complet")}
      style={{cursor:"pointer",transition:"box-shadow .18s"}}
      onMouseEnter={e=>e.currentTarget.style.boxShadow="var(--sh2)"}
      onMouseLeave={e=>e.currentTarget.style.boxShadow="var(--sh)"}>
      <div style={{fontWeight:700,marginBottom:10,color:"var(--b)"}}><IconeOuEmoji e="🍽️"/> Repas du jour</div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {rep.dej&&<span className="badge"style={{background:"var(--Sp)",color:"var(--S)"}}><IconeOuEmoji e="🥗"/> {rep.dej}</span>}
        {rep.gou&&<span className="badge"style={{background:"var(--Gp)",color:"var(--G)"}}><IconeOuEmoji e="🍎"/> {rep.gou}</span>}
        {rep.bib&&<span className="badge"style={{background:"var(--Bp)",color:"var(--B)"}}><IconeOuEmoji e="🍼"/> {rep.bib}</span>}
        <PastilleRepas q={rep.q}/>
      </div>
      <div style={{fontSize:11,color:"var(--l)",marginTop:8}}>Voir le détail →</div>
    </div>}
  </div>;
}


//
//
export const BILANS={
  "e1":[
    "Ce matin, Léo est arrivé les yeux encore un peu lourds de sommeil, mais le sourire n'a pas tardé à illuminer son visage. Nous avons commencé la journée en douceur avec quelques livres imagiers, et très vite son entrain habituel est revenu. L'activité peinture de l'après-midi a été un vrai moment de magie - il a trempé ses petits doigts dans le rouge et le jaune avec une concentration et une fierté visibles.\n\nLe repas de midi s'est très bien passé : Léo a tout mangé sans hésitation, ce qui est toujours un plaisir à observer. Sa sieste a duré 1h30, un sommeil profond et réparateur. Au réveil, il était de nouveau rayonnant, prêt à profiter du goûter et des jeux du soir.\n\nEn fin de journée, j'ai remarqué comme Léo cherche de plus en plus à communiquer avec les mots - il pointe, nomme, demande. C'est un plaisir de l'accompagner dans cet éveil du langage. Bonne soirée à vous !",
    "La journée de Léo a débuté sur une note douce et apaisée. Il est entré dans la maison en tenant fermement son doudou, signe qu'une petite période d'adaptation était nécessaire ce matin. Mais en quelques minutes, il s'est élancé vers les jouets avec son enthousiasme caractéristique.\n\nNous avons beaucoup joué dehors avant le déjeuner - Léo adore observer les fourmis et les feuilles qui tombent. Son repas a été excellent, et sa sieste longue et paisible. L'après-midi, nous avons planté des radis ensemble : il a tenu la petite graine avec soin et l'a déposée dans la terre avec une attention touchante.\n\nLéo est un enfant curieux et plein de vie. Chaque journée avec lui est une nouvelle aventure. Je suis fière des progrès qu'il fait semaine après semaine. À demain !",
  ],
  "e2":[
    "Emma a débarqué ce matin avec une énergie débordante et un grand sourire - elle avait visiblement hâte de retrouver ses jouets préférés. Après un câlin rapide, elle s'est installée au coin puzzle avec une belle concentration, finissant un modèle de 12 pièces en moins de dix minutes. Impressionnant !\n\nLe repas a été un peu plus délicat aujourd'hui - Emma avait moins d'appétit que d'habitude, ce qui arrive à tous les enfants. Elle a refusé la sieste mais est restée calme, jouant tranquillement et feuilletant des livres dans son coin doux. Ce moment de repos calme lui a été bénéfique.\n\nEn fin d'après-midi, nous avons fait de la musique avec des instruments de percussion maison. Emma chante de plus en plus juste et son sens du rythme est remarquable pour son âge. C'est un vrai plaisir de l'observer s'épanouir. Belle soirée à vous !",
    "Quelle belle journée avec Emma ! Elle est arrivée guillerette, avec un nouveau mot à la bouche qu'elle a répété toute la matinée avec fierté. Nous avons travaillé sur les couleurs avec de la pâte à modeler - Emma distingue maintenant parfaitement le rouge, le bleu et le jaune.\n\nLe repas du midi était un peu timide côté appétit, mais Emma a bien compensé au goûter. Pas de sieste aujourd'hui, mais un temps calme sur son tapis de jeu qui lui a permis de se ressourcer. Elle est restée de bonne humeur tout l'après-midi.\n\nJe tenais à vous signaler qu'Emma commence à partager spontanément ses jouets avec les autres enfants - un grand pas dans son développement social dont vous pouvez être fiers. À très bientôt !",
  ],
  "e3":[
    "Aujourd'hui a été une journée historique pour Noah - et pour moi ! Il a fait ses quatre premiers pas tout seul, au milieu du salon, avec un sourire immense et des yeux brillants de fierté. J'ai failli pleurer de joie. Ces instants-là sont la raison pour laquelle j'aime ce métier.\n\nNoah a très bien mangé - il découvre de nouvelles saveurs avec curiosité et accepte presque tout ce qu'on lui propose. Sa sieste a duré deux bonnes heures, et il s'est réveillé reposé et de très bonne humeur. Nous avons ensuite joué avec les maracas maison qu'il secoue en rythme avec une concentration attendrissante.\n\nJe suis tellement heureuse d'avoir vécu ce premier pas à ses côtés. Noah est un enfant lumineux, plein de vie et de curiosité. Chaque journée avec lui est un cadeau. Profitez bien de ce soir - il mérite tous vos câlins ! 🥰",
    "Noah a passé une journée douce et studieuse. Malgré sa petite dent qui pousse et une nuit un peu agitée, il a montré une belle résilience ce matin - quelques minutes de câlin et il était déjà reparti à explorer son univers.\n\nLes repas se passent très bien, et Noah commence à tenir sa cuillère de façon de plus en plus assurée. C'est un grand signe d'autonomie ! Sa sieste a été longue et profonde - il en avait besoin. L'après-midi, nous avons fait des jeux d'éveil sensoriels avec différentes textures qu'il a explorées avec ses petits doigts curieux.\n\nNoah est un enfant éveillé et attachant. Son développement moteur progresse à grands pas - littéralement ! Je suis impatiente de voir ce qu'il nous réserve demain. Bonne soirée à vous !",
  ],
};
const CRS={
  "e1":[
    "1. Bilan global du trimestre\n\nLéo a traversé ce trimestre avec une belle sérénité et un épanouissement visible semaine après semaine. Son intégration dans le groupe est complète - il se sent en confiance, sécurisé, et commence chaque journée avec entrain. Ses humeurs sont stables et positives, ce qui témoigne d'un attachement solide et d'un environnement familial épanouissant.\n\n2. Développement et acquisitions\n\nSur le plan du langage, Léo a fait des progrès remarquables : il construit maintenant des phrases de deux à trois mots et nomme un grand nombre d'objets du quotidien. Sa motricité fine s'affine - il tient bien les crayons et les ustensiles. Nous avons travaillé sur les couleurs primaires qu'il reconnaît et nomme avec plaisir.\n\n3. Vie quotidienne\n\nLes repas se déroulent très bien dans l'ensemble - Léo mange seul à la cuillère avec une belle autonomie. Sa sieste est régulière (1h30 à 2h) et réparatrice. Il s'intègre bien aux activités collectives et commence à jouer avec les autres enfants de façon coopérative.\n\n4. Objectifs du prochain trimestre\n\nNous allons continuer à enrichir son vocabulaire à travers des activités de lecture et d'éveil sensoriel. Je souhaite également travailler sur l'autonomie à l'habillage et approfondir les activités créatives qui le passionnent.",
  ],
  "e2":[
    "1. Bilan global du trimestre\n\nEmma aborde ce trimestre avec une maturité impressionnante pour son âge. Elle est autonome, curieuse, et fait preuve d'une belle concentration lors des activités dirigées. Son caractère bien trempé est une vraie force - elle sait ce qu'elle veut et l'exprime clairement, ce qui facilite beaucoup nos échanges au quotidien.\n\n2. Développement et acquisitions\n\nEmma possède un vocabulaire très riche et pose constamment des questions sur le monde qui l'entoure - son « pourquoi ? » est inépuisable et témoigne d'un intellect en plein éveil. Sa motricité globale est excellente : elle court, saute et grimpe avec agilité. Elle s'habille partiellement seule et nous travaillons sur les boutons et les fermetures.\n\n3. Vie quotidienne\n\nLes repas sont parfois sélectifs mais Emma accepte progressivement de nouvelles saveurs. Elle refuse souvent la sieste mais le temps calme qui la remplace lui convient bien. Elle a développé des amitiés fortes dans le groupe et joue de façon imaginative et créative.\n\n4. Objectifs du prochain trimestre\n\nNous allons travailler sur le partage et la gestion des émotions en groupe, ainsi que sur les premières notions de chiffres et de lettres à travers des jeux. Je propose aussi d'enrichir les activités artistiques qui la passionnent.",
  ],
  "e3":[
    "1. Bilan global du trimestre\n\nNoah a vécu un trimestre extraordinaire, marqué par des acquisitions motrices spectaculaires dont ses premiers pas autonomes. Il rayonne de bonheur chaque matin et s'est parfaitement adapté à son environnement d'accueil. Son tempérament solaire et sa curiosité naturelle font de lui un enfant attachant qui illumine les journées.\n\n2. Développement et acquisitions\n\nLa grande acquisition de ce trimestre est bien sûr la marche autonome - Noah fait maintenant plusieurs pas seuls et progresse chaque jour. Sur le plan du langage, il dit clairement « mama » et « papa » et quelques syllabes significatives. Sa compréhension est excellente : il répond aux consignes simples et comprend parfaitement ce qu'on lui dit.\n\n3. Vie quotidienne\n\nNoah mange avec appétit et diversifié - il accepte bien les nouvelles textures. Ses siestes sont longues et réparatrices (2h en moyenne). Il adore les jeux d'éveil musical et sensoriel, et réagit avec joie à la musique et aux comptines.\n\n4. Objectifs du prochain trimestre\n\nNous allons encourager et sécuriser la marche autonome, travailler sur l'enrichissement du vocabulaire avec des imagiers et des comptines, et introduire des activités de motricité fine adaptées à son âge.",
  ],
};

// Compose le resume d'une journee a partir de ce qui a reellement ete saisi.
// La version precedente tirait un texte dans une liste figee, sans regarder la
// journee : le meme paragraphe revenait, quel que soit l'enfant et quoi qu'il
// se soit passe. Ici tout ce qui est ecrit vient des donnees, et rien n'est
// affirme sans une saisie derriere.
const MOTS_HUMEUR={
  "😄":"rayonnant","😊":"de bonne humeur","🥰":"très câlin","😐":"plutôt calme",
  "😴":"fatigué","😢":"chagriné","😠":"contrarié","😬":"un peu tendu","🤒":"patraque",
};
const accorde=(mot,f)=>{
  if(!f)return mot;
  const feminin={rayonnant:"rayonnante",fatigué:"fatiguée",chagriné:"chagrinée",
    contrarié:"contrariée",patraque:"patraque","très câlin":"très câline",
    "un peu tendu":"un peu tendue","plutôt calme":"plutôt calme","de bonne humeur":"de bonne humeur"};
  return feminin[mot]||mot;
};
const heureCourte=(h)=>String(h||"").slice(0,5).replace(":"," h ").trim();
const dureeEnMots=(minutes)=>{
  const m=Math.max(0,Math.round(Number(minutes)||0));
  const h=Math.floor(m/60), r=m%60;
  if(!m)return null;
  if(!h)return r+" min";
  return r?h+" h "+String(r).padStart(2,"0"):h+" h";
};
const listeFr=(items)=>{
  const l=items.filter(Boolean);
  if(l.length<=1)return l[0]||"";
  return l.slice(0,-1).join(", ")+" et "+l[l.length-1];
};

// j : { prenom, feminin, arrivee, depart, minutes, humeur, motDuJour,
//       repas:{dejeuner,gouter,biberon,qualite,notes}, siestes:[{debut,fin,duree}],
//       changes:[{heure,type,note}], activites:[{titre,description}], transmissions:[...] }
function composerResume(j){
  if(!j||!j.prenom)return "";
  const p=j.prenom, f=!!j.feminin, phrases=[];

  // Ouverture : les horaires, s'ils ont ete pointes.
  if(j.arrivee){
    const d=dureeEnMots(j.minutes);
    if(j.depart&&d)phrases.push(p+" est arrivé"+(f?"e":"")+" à "+heureCourte(j.arrivee)+" et reparti"+(f?"e":"")+" à "+heureCourte(j.depart)+", soit "+d+" d'accueil.");
    else phrases.push(p+" est arrivé"+(f?"e":"")+" à "+heureCourte(j.arrivee)+".");
  }

  // Humeur : seulement si elle a ete saisie, et accordee au prenom.
  const mot=MOTS_HUMEUR[j.humeur];
  if(mot)phrases.push(p+" était "+accorde(mot,f)+".");

  // Repas.
  if(j.repas){
    const r=j.repas, bouts=[];
    if(r.dejeuner)bouts.push("au déjeuner, "+String(r.dejeuner).toLowerCase());
    if(r.gouter)bouts.push("au goûter, "+String(r.gouter).toLowerCase());
    if(r.biberon)bouts.push("biberon "+String(r.biberon).toLowerCase());
    if(bouts.length){
      let ph="Côté repas : "+listeFr(bouts)+".";
      if(r.qualite==="peu")ph+=" L'appétit était plus discret que d'habitude.";
      else if(r.qualite==="bien")ph+=" Bel appétit.";
      phrases.push(ph);
      if(r.notes)phrases.push(String(r.notes).trim().replace(/\.?$/,"."));
    }
  }

  // Siestes.
  const siestes=(j.siestes||[]).filter(s=>s&&(s.duree||s.debut));
  if(siestes.length){
    const total=siestes.reduce((t,s)=>t+(Number(s.duree)||0),0);
    const d=dureeEnMots(total);
    if(siestes.length===1&&siestes[0].debut&&siestes[0].fin)
      phrases.push("Sieste de "+heureCourte(siestes[0].debut)+" à "+heureCourte(siestes[0].fin)+(d?" ("+d+")":"")+".");
    else phrases.push(siestes.length+" siestes"+(d?", "+d+" au total":"")+".");
  }

  // Changes : un compte, pas un journal.
  const changes=(j.changes||[]).filter(Boolean);
  if(changes.length){
    const notes=changes.map(c=>c.note).filter(Boolean);
    let ph=changes.length+" change"+(changes.length>1?"s":"")+" dans la journée.";
    if(notes.length)ph+=" "+notes.join(" ").trim().replace(/\.?$/,".");
    phrases.push(ph);
  }

  // Activites du jour.
  const act=(j.activites||[]).filter(a=>a&&a.titre);
  if(act.length){
    phrases.push("Au programme : "+listeFr(act.map(a=>String(a.titre).toLowerCase()))+".");
    const desc=act.map(a=>a.description).filter(Boolean)[0];
    if(desc)phrases.push(String(desc).trim().replace(/\.?$/,"."));
  }

  // Le mot du jour de l'assistante maternelle passe en dernier : c'est le sien.
  if(j.motDuJour)phrases.push(String(j.motDuJour).trim().replace(/\.?$/,"."));

  if(!phrases.length)
    return "Rien n'a encore été noté pour "+p+" aujourd'hui. Renseignez le pointage, les repas ou les siestes, et le résumé se composera tout seul.";
  return phrases.join(" ");
}

function ResumeJournee({enfants,role,pEId}){
  const [selId,setSelId]=useState(enfants[0]?.id);
  const [idx,setIdx]=useState(0);
  const [recit,setRecit]=useState("");
  const [loading,setLoading]=useState(false);
  const [toast,setToast]=useState("");
  const [envoye,setEnvoye]=useState(false);
  const liste=role==="parent"?enfants.filter(e=>e.id===pEId):enfants;
  const enfant=liste.find(e=>e.id===selId)||liste[0];
  const estDemo=["e1","e2","e3"].includes(enfant?.id);
  const tx=D.transmissions.filter(t=>t.eId===enfant?.id&&t.date===TODAY_STR);
  const rep=D.repas.find(r=>r.eId===enfant?.id&&r.date===TODAY_STR);
  const ch=D.changes.filter(c=>c.eId===enfant?.id&&c.date===TODAY_STR);
  const pf=D.portfolio.filter(p=>p.eId===enfant?.id).slice(-1)[0];
  const parent=D.parents.find(p=>p.id===enfant?.parentId);

  // Les donnees reelles de la journee, chargees pour l'enfant selectionne.
  // La version precedente lisait le jeu de demonstration meme pour un vrai
  // compte : le contexte affiche ne correspondait a aucun enfant reel.
  const [jour,setJour]=useState(null);
  useEffect(()=>{
    if(!enfant?.id||estDemo){setJour(null);return;}
    let annule=false;
    (async()=>{
      try{
        const eid=enfant.id;
        const [pointage,repas,siestes,changes,cahier,activites]=await Promise.all([
          supabase.from("pointages").select("arrivee,depart,total_minutes").eq("enfant_id",eid).eq("date",TODAY_STR).maybeSingle(),
          supabase.from("repas").select("dejeuner,gouter,biberon,notes,qualite").eq("enfant_id",eid).eq("date",TODAY_STR).maybeSingle(),
          supabase.from("sommeil").select("debut,fin,duree").eq("enfant_id",eid).eq("date",TODAY_STR),
          supabase.from("changes_couches").select("heure,type,note").eq("enfant_id",eid).eq("date",TODAY_STR),
          supabase.from("cahier_jour").select("mot_du_jour,humeur").eq("enfant_id",eid).eq("date",TODAY_STR).maybeSingle(),
          supabase.from("portfolio").select("titre,description").eq("enfant_id",eid).eq("date",TODAY_STR),
        ]);
        if(annule)return;
        setJour({
          arrivee:pointage.data?.arrivee||null,
          depart:pointage.data?.depart||null,
          minutes:pointage.data?.total_minutes||0,
          repas:repas.data||null,
          siestes:siestes.data||[],
          changes:changes.data||[],
          motDuJour:cahier.data?.mot_du_jour||"",
          humeur:cahier.data?.humeur||"",
          activites:activites.data||[],
        });
      }catch(e){ if(!annule)setJour(null); }
    })();
    return()=>{annule=true;};
  },[enfant?.id,estDemo,recit===""]);

  // Rassemble ce qui a ete saisi aujourd'hui, en base ou en demonstration.
  const donneesDuJour=()=>{
    const base={prenom:enfant?.prenom||"L'enfant",feminin:/[ae]$/i.test(enfant?.prenom||"")};
    if(estDemo){
      const p=D.pointages.find(x=>x.eId===enfant?.id&&x.date===TODAY_STR);
      const min=p&&p.tot?(Number(String(p.tot).split("h")[0])*60+Number(String(p.tot).split("h")[1]||0)):0;
      return {...base,
        arrivee:p?.arr?.replace("h",":"),depart:p?.dep?.replace("h",":"),minutes:min,
        repas:rep?{dejeuner:rep.dej,gouter:rep.gou,biberon:rep.bib,notes:rep.notes,qualite:rep.q}:null,
        siestes:[],changes:ch.map(c=>({heure:c.h,type:c.type,note:c.n})),
        motDuJour:tx.filter(t=>t.auteur==="asmat").slice(-1)[0]?.txt||"",
        humeur:tx.filter(t=>t.auteur==="asmat").slice(-1)[0]?.mood||"",
        activites:pf?[{titre:pf.titre,description:pf.desc}]:[]};
    }
    return {...base,...(jour||{})};
  };

  const generer=()=>{
    setLoading(true);setRecit("");setEnvoye(false);
    // Le delai n'imite plus une reflexion : il laisse simplement voir que le
    // texte vient d'etre recompose.
    setTimeout(()=>{
      setRecit(composerResume(donneesDuJour()));
      setLoading(false);
    },350);
  };

  return <div className="fi">
    {toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
    <PageHeader icon="✨" title="Résumé de la journée"
      sub="Le résumé de la journée, à relire avant de l'envoyer au parent"/>
    {role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
      {liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>{setSelId(e.id);setRecit("");setIdx(0);}}/>)}</div>}

    <div className="g2">
      <div>
        <div className={"card "+(recit?"ai-card":"")+""}style={{padding:18,marginBottom:12,border:"1.5px solid var(--P)"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
            <div style={{width:32,height:32,borderRadius:"50%",background:"var(--Pp)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>✨</div>
            <div><div className="pf"style={{fontSize:15,fontWeight:700,color:"var(--P)"}}>Résumé de la journée de {enfant?.prenom}</div>
              <div style={{fontSize:11,color:"var(--l)"}}>Une base à personnaliser · Exclusif TiMat</div></div>
          </div>

          {loading&&<div style={{display:"flex",alignItems:"center",gap:10,padding:"20px 0"}}>
            <div className="ai-dot"/><div className="ai-dot"style={{animationDelay:".3s"}}/><div className="ai-dot"style={{animationDelay:".6s"}}/>
            <span style={{fontSize:13,color:"var(--m)",fontStyle:"italic"}}>Rédaction du bilan en cours...</span>
          </div>}

          {!loading&&!recit&&<div style={{textAlign:"center",padding:"20px 0"}}>
            <div style={{fontSize:40,marginBottom:8}}>📖</div>
            <div style={{fontSize:14,color:"var(--m)",lineHeight:1.6,marginBottom:16}}>
              Générez un bilan chaleureux et personnalisé<br/>de la journée de <strong>{enfant?.prenom}</strong>.
            </div>
            <button className="btn bP"style={{padding:"11px 22px"}}onClick={generer}>
              <IconeOuEmoji e="✨"/> Générer le bilan
            </button>
          </div>}

          {recit&&<div>
            {role==="asmat"
              ?<textarea className="ta" value={recit} onChange={e=>setRecit(e.target.value)}
                 aria-label="Résumé de la journée, modifiable avant envoi"
                 style={{fontSize:14,color:"var(--b)",lineHeight:1.8,minHeight:150,fontFamily:"'Playfair Display',serif",fontStyle:"italic"}}/>
              :<div style={{fontSize:14,color:"var(--b)",lineHeight:1.9,fontStyle:"italic",whiteSpace:"pre-wrap",fontFamily:"'Playfair Display',serif"}}>
                 {recit}
               </div>}
            {role==="asmat"&&<div style={{fontSize:11.5,color:"var(--l)",marginTop:6}}>
              Composé à partir de vos saisies du jour. Corrigez librement avant d'envoyer.
            </div>}
            <div style={{marginTop:16,display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
              {role==="asmat"&&!envoye&&<button className="btn bS"onClick={()=>{setEnvoye(true);setToast("Résumé envoyé à "+(parent?.prenom||"la famille")+" ✓");}}>
                <IconeOuEmoji e="📩"/> Envoyer aux parents
              </button>}
              {role==="asmat"&&envoye&&<div style={{display:"flex",alignItems:"center",gap:6,padding:"7px 14px",background:"var(--Sp)",borderRadius:10,border:"1px solid var(--Sl)"}}>
                <IconeOuEmoji e="✅"/>
                <span style={{fontSize:13,fontWeight:700,color:"var(--S)"}}>Envoyé à {parent?.prenom} {parent?.nom}</span>
              </div>}
              <button className="btn bP"onClick={generer}><IconeOuEmoji e="🔄"/> Recomposer</button>
              <button className="btn bG"onClick={()=>navigator.clipboard?.writeText(recit)}><IconeOuEmoji e="📋"/> Copier</button>
            </div>
          </div>}
        </div>
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div className="card">
          <div style={{fontWeight:700,fontSize:13,marginBottom:10,color:"var(--b)"}}><IconeOuEmoji e="📊"/> Données de la journée</div>
          {[["😊 Humeurs",tx.map(t=>t.mood).join(" ")||"-"],
            ["🍽️ Repas",rep?rep.dej:"-"],
            ["👶 Changes",ch.length+" change(s)"],
            ["🎨 Activité",pf?.titre||"Jeux libres"],
          ].map(([l,v])=><div key={l}style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid var(--br)",fontSize:13}}>
            <span style={{color:"var(--m)"}}>{l}</span><span style={{fontWeight:600,color:"var(--b)"}}>{v}</span>
          </div>)}
        </div>
        <div className="card"style={{background:"var(--Pp)",border:"1px solid var(--P)"}}>
          <div style={{fontWeight:700,fontSize:13,color:"var(--P)",marginBottom:8}}><IconeOuEmoji e="💡"/> Exclusivité TiMat</div>
          <div style={{fontSize:13,color:"var(--b)",lineHeight:1.6}}>
            Aucun concurrent ne génère un bilan personnalisé de la journée. TiMat transforme les données en émotions pour les parents.
          </div>
        </div>
      </div>
    </div>
  </div>;
}

//
export const VACANCES_2024=[
  {debut:"2024-02-17",fin:"2024-03-04",nom:"Hiver"},
  {debut:"2024-04-13",fin:"2024-04-29",nom:"Printemps"},
  {debut:"2024-07-06",fin:"2024-09-02",nom:"Été"},
  {debut:"2024-10-19",fin:"2024-11-04",nom:"Toussaint"},
  {debut:"2024-12-21",fin:"2025-01-06",nom:"Noël"},
];
function CompteRenduTrimestriel({enfants,role,pEId}){
  const [selId,setSelId]=useState(enfants[0]?.id);
  const [trim,setTrim]=useState("T"+(Math.floor(new Date().getMonth()/3)+1)+" "+new Date().getFullYear());
  const [idx,setIdx]=useState(0);
  const [cr,setCr]=useState("");
  const [loading,setLoading]=useState(false);
  const [toast,setToast]=useState("");
  const [envoye,setEnvoye]=useState(false);
  const liste=role==="parent"?enfants.filter(e=>e.id===pEId):enfants;
  const enfant=liste.find(e=>e.id===selId)||liste[0];
  const ms=D.milestones[enfant?.id]||[];
  const pfs=D.portfolio.filter(p=>p.eId===enfant?.id);
  const parent=D.parents.find(p=>p.id===enfant?.parentId);

  const generer=()=>{
    setLoading(true);setCr("");setEnvoye(false);
    setTimeout(()=>{
      const crs=CRS[enfant?.id]||CRS["e1"];
      const nextIdx=(idx+1)%crs.length;
      setIdx(nextIdx);
      setCr(crs[nextIdx]);
      setLoading(false);
    },2200);
  };

  return <div className="fi">
    {toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
    <PageHeader icon="📝" title="Compte-rendu trimestriel"
      sub="Document professionnel généré automatiquement - exclusivité TiMat"/>
    {role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
      {liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>{setSelId(e.id);setCr("");setIdx(0);setEnvoye(false);}}/>)}</div>}
    <div className="g2">
      <div>
        <div className="card"style={{marginBottom:12}}>
          <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap",alignItems:"flex-end"}}>
            <div style={{flex:1}}>
              <label className="lbl">Trimestre</label>
              <select className="sel"value={trim}onChange={e=>{setTrim(e.target.value);setCr("");setEnvoye(false);}}>
                {(()=>{const now=new Date();let q=Math.floor(now.getMonth()/3)+1,y=now.getFullYear();const out=[];for(let i=0;i<5;i++){let qq=q-i,yy=y;while(qq<=0){qq+=4;yy--;}out.push("T"+qq+" "+yy);}return out;})().map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
            <button className="btn bP"onClick={generer}disabled={loading}>
              {loading?"⏳ Rédaction...":"📝 Générer le CR"}
            </button>
          </div>
          {loading&&<div style={{display:"flex",alignItems:"center",gap:10,padding:"16px 0"}}>
            <div className="ai-dot"/><div className="ai-dot"style={{animationDelay:".3s"}}/><div className="ai-dot"style={{animationDelay:".6s"}}/>
            <span style={{fontSize:13,color:"var(--m)",fontStyle:"italic"}}>Rédaction du compte-rendu en cours...</span>
          </div>}
          {!loading&&!cr&&<div style={{textAlign:"center",padding:"20px 0",color:"var(--l)"}}>
            <div style={{fontSize:36,marginBottom:8}}>📝</div>
            <div >Sélectionnez un trimestre et cliquez sur Générer.</div>
          </div>}
          {cr&&<div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:14,lineHeight:2,color:"var(--b)",whiteSpace:"pre-wrap"}}>{cr}</div>
            <div style={{display:"flex",gap:8,marginTop:16,flexWrap:"wrap",alignItems:"center"}}>
              {role==="asmat"&&!envoye&&<button className="btn bS"onClick={()=>{setEnvoye(true);setToast("CR "+trim+" envoyé à "+H(parent?.prenom)+" "+H(parent?.nom)+" ✓");}}>
                <IconeOuEmoji e="📩"/> Envoyer aux parents
              </button>}
              {role==="asmat"&&envoye&&<div style={{display:"flex",alignItems:"center",gap:6,padding:"7px 14px",background:"var(--Sp)",borderRadius:10,border:"1px solid var(--Sl)"}}>
                <IconeOuEmoji e="✅"/>
                <span style={{fontSize:13,fontWeight:700,color:"var(--S)"}}>CR envoyé à {parent?.prenom} {parent?.nom}</span>
              </div>}
              <button className="btn bP"onClick={generer}><IconeOuEmoji e="🔄"/> Régénérer</button>
              <button className="btn bG"onClick={()=>navigator.clipboard?.writeText(cr)}><IconeOuEmoji e="📋"/> Copier</button>
            </div>
          </div>}
        </div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div className="card"style={{background:"var(--Pp)",border:"1px solid var(--P)"}}>
          <div style={{fontWeight:700,fontSize:13,color:"var(--P)",marginBottom:8}}><IconeOuEmoji e="💡"/> Pensé pour la transmission PMI</div>
          <div style={{fontSize:13,color:"var(--b)",lineHeight:1.6}}>Un compte-rendu trimestriel professionnel que les parents peuvent glisser dans le dossier scolaire et présenter à la PMI lors du renouvellement d'agrément.</div>
        </div>
        <div className="card">
          <div style={{fontWeight:700,fontSize:13,marginBottom:10,color:"var(--b)"}}><IconeOuEmoji e="📊"/> Données utilisées</div>
          {[["🌱 Jalons acquis",ms.filter(m=>m.ok).length+"/"+ms.length],
            ["🎨 Activités",pfs.length+" dans le portfolio"],
            ["📋 Transmissions",D.transmissions.filter(t=>t.eId===enfant?.id).length+" échanges"],
          ].map(([l,v])=><div key={l}style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid var(--br)",fontSize:13}}>
            <span style={{color:"var(--m)"}}>{l}</span><span style={{fontWeight:600,color:"var(--b)"}}>{v}</span>
          </div>)}
        </div>
      </div>
    </div>
  </div>;
}

//
const SMIC_HORAIRE_HISTO=[
  ["2026-06-01",12.31],
  ["2026-01-01",12.02],
  ["2024-11-01",11.88],
  ["2024-01-01",11.65],
];
// SMIC horaire brut applicable a une date donnee (defaut : aujourd'hui).
export const smicHoraireAu=(d)=>{
  const j=isoJour(d);
  for(const[debut,valeur]of SMIC_HORAIRE_HISTO)if(j>=debut)return valeur;
  return SMIC_HORAIRE_HISTO[SMIC_HORAIRE_HISTO.length-1][1];
};

// Salaire horaire minimum d'une assistante maternelle, par enfant et par heure.
//
// Deux planchers coexistent, et c'est le plus favorable qui s'applique :
//   - le minimum LEGAL, indexe sur le SMIC : 0,281 x SMIC horaire brut
//     (article D. 423-9 du code de l'action sociale et des familles) ;
//   - le minimum CONVENTIONNEL, fixe par avenant a la CCN 3239 : 4,20 EUR
//     brut depuis le 1er juin 2026 (avenant n° 10), contre 3,64 EUR avant.
//
// Aujourd'hui c'est le conventionnel qui l'emporte (4,20 contre 3,46).
// L'application ne verifiait ce plancher nulle part : un taux saisi en dessous
// produisait des bulletins entiers sur une remuneration illegale, sans un mot.
export const MINIMUM_CONV_HISTO=[
  ["2026-06-01",4.20],
  ["2024-01-01",3.64],
];
export const COEF_MINIMUM_LEGAL=0.281;
// Titre professionnel « Assistant maternel - Garde d'enfants » : le minimum
// conventionnel est majore de 4 % (CCN 3239, article 113 et annexe 5), soit
// 4,37 EUR brut au lieu de 4,20 EUR. Sans ce cas, l'application aurait declare
// conforme un taux de 4,25 EUR pourtant sous le plancher d'une titulaire.
export const MAJORATION_TITRE_AMGE=0.04;

// --- Mensualisation ---
//
// La convention collective (IDCC 3239) prevoit DEUX calculs, et l'application
// n'en appliquait qu'un : celui des 52 semaines, a tous les contrats.
//
//   annee complete (52 semaines) : taux x heures/semaine x 52 / 12.
//     Les conges payes sont inclus dans le lissage.
//   annee incomplete (46 semaines ou moins) : taux x heures/semaine x semaines
//     programmees / 12. Les conges payes sont payes separement.
//
// Pour un accueil sur l'annee scolaire — 36 a 46 semaines, le cas le plus
// frequent — l'application annoncait jusqu'a 13 % de trop, et les conges payes
// se retrouvaient comptes deux fois : une fois dans le lissage, une fois verses
// a part.
export const SEMAINES_ANNEE_COMPLETE=52;
export const SEMAINES_MAX_ANNEE_INCOMPLETE=46;
export const MOIS_PAR_AN=12;

// Un contrat est en annee complete tant qu'on n'a pas dit le contraire : c'est
// le comportement d'avant, et il ne faut pas requalifier en silence un contrat
// deja saisi.
export const estAnneeComplete=(contrat)=>(contrat?.anneeComplete??contrat?.annee_complete)!==false;

export const semainesDuContrat=(contrat)=>{
  if(estAnneeComplete(contrat))return SEMAINES_ANNEE_COMPLETE;
  const s=Number(contrat?.semainesAccueil??contrat?.semaines_accueil);
  if(!(s>0))return SEMAINES_MAX_ANNEE_INCOMPLETE;
  return Math.min(s,SEMAINES_ANNEE_COMPLETE);
};

export const heuresMensualisees=(contrat)=>{
  const h=Number(contrat?.heuresHebdo??contrat?.heures_hebdo)||0;
  return Math.round((h*semainesDuContrat(contrat))/MOIS_PAR_AN);
};

export const salaireMensualise=(contrat,taux)=>{
  const t=Number(taux??contrat?.tauxHoraire??contrat?.taux_horaire)||0;
  const h=Number(contrat?.heuresHebdo??contrat?.heures_hebdo)||0;
  return Math.round(((t*h*semainesDuContrat(contrat))/MOIS_PAR_AN)*100)/100;
};

// --- Fin de contrat : preavis, conges payes, indemnite de rupture ---
//
// L'ecran de solde de tout compte etait entierement fictif : six jours de
// conges et un an et demi d'anciennete ecrits en dur, quels que soient le
// contrat et la personne. Le preavis valait 30, 60 ou 90 jours ; la convention
// en prevoit 8, 15 ou 30. Et l'indemnite de rupture, due des neuf mois
// d'anciennete, n'etait pas calculee du tout — de l'argent que l'assistante
// maternelle ne reclamait pas.
//
// Preavis en jours calendaires, identique quel que soit le motif
// (CCN 3239) : moins de 3 mois d'anciennete -> 8 jours ; de 3 mois a 1 an ->
// 15 jours ; a partir d'un an -> 1 mois.
export const CP_PAR_MOIS=2.5;
export const CP_MAX_AN=30;
export const TAUX_DIXIEME=0.10;
export const DIVISEUR_INDEMNITE_RUPTURE=80;
export const ANCIENNETE_MIN_RUPTURE_MOIS=9;
const CAR_PDF_INTERDITS = /[^\x09\x0A\x0D\x20-\x7E\u00A0-\u00FF\u20AC\u2018\u2019\u201C\u201D\u2013\u2014\u2026\u2022]/g;
const nettoyerPdf = (t) => (t === null || t === undefined ? t : String(t).replace(CAR_PDF_INTERDITS, ""));
export const protegerPdf = (doc) => {
  const ecrire = doc.text.bind(doc);
  doc.text = (t, ...reste) => ecrire(Array.isArray(t) ? t.map(nettoyerPdf) : nettoyerPdf(t), ...reste);
  const decouper = doc.splitTextToSize.bind(doc);
  doc.splitTextToSize = (t, ...reste) => decouper(nettoyerPdf(t), ...reste);
  return doc;
};

// Echappement HTML pour les documents que l'application ouvre dans une
// nouvelle fenetre (attestation, fiche d'urgence, recap Pajemploi, e-mails).
//
// Ces documents sont assembles a la main, chaine par chaine, et y injectaient
// telles quelles des valeurs tapees par les familles : un prenom, une adresse,
// le nom d'un medecin. Deux consequences : une apostrophe ou un « < » dans un
// nom cassait la mise en page du document, et un texte saisi par un parent
// pouvait faire executer du code dans la fenetre que l'assistante maternelle
// ouvre pour imprimer.
export const H = (v) => String(v === null || v === undefined ? "" : v)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

let jsPDFPromesse=null;
export const chargerJsPDF=()=>(jsPDFPromesse||(jsPDFPromesse=import("jspdf").then(m=>m.jsPDF)));

export function Journal({enfants,role,pEId,user}){
  const [selId,setSelId]=useState(enfants[0]?.id);
  const [sousOnglet,setSousOnglet]=useState("journal");
  const liste=role==="parent"?enfants.filter(e=>e.id===pEId):enfants;
  const enfant=liste.find(e=>e.id===selId)||liste[0];
  const sousOnglets=role==="asmat"
    ?[{id:"journal",l:"Journal",ic:"📋"},{id:"bilan",l:"Bilan du jour",ic:"✨"},{id:"cr",l:"CR Trimestriel",ic:"📝"}]
    :[{id:"journal",l:"Journal",ic:"📋"}];
  return <div className="fi">
    {role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
      {liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>{setSelId(e.id);setSousOnglet("journal");}}/>)}
    </div>}
    <div style={{display:"flex",gap:4,marginBottom:16,borderBottom:"2px solid var(--br)"}}>
      {sousOnglets.map(s=><button key={s.id}onClick={()=>setSousOnglet(s.id)}style={{
        padding:"8px 16px",border:"none",background:"none",cursor:"pointer",
        fontFamily:"'DM Sans',sans-serif",fontWeight:600,fontSize:13,
        color:sousOnglet===s.id?"var(--T)":"var(--b)",
        borderBottom:sousOnglet===s.id?"2px solid var(--accent)":"2px solid transparent",
        marginBottom:-2,transition:"all .15s",display:"flex",alignItems:"center",gap:6
      }}><IconeOuEmoji e={s.ic}/><span>{s.l}</span></button>)}
    </div>
    {sousOnglet==="journal"&&<TransmissionsContent enfant={enfant}role={role}user={user}/>}
    {sousOnglet==="bilan"&&<ResumeJournee enfants={liste}role={role}pEId={pEId}/>}
    {sousOnglet==="cr"&&<CompteRenduTrimestriel enfants={liste}role={role}pEId={pEId}/>}
  </div>;
}

function TransmissionsContent({enfant,role,user}){
  const [msg,setMsg]=useState("");
  const [mood,setMood]=useState("😊");
  const [txs,setTxs]=useState(D.transmissions);
  const [photos,setPhotos]=useState({});
  const [photosLoading,setPhotosLoading]=useState(false);
  const [photoGrande,setPhotoGrande]=useState(null);
  const fileRef=useRef(null);

  // Load photos from Supabase Storage on mount
  useEffect(()=>{
    if(!enfant?.id||["e1","e2","e3"].includes(enfant.id))return;
    const loadPhotos=async()=>{
      setPhotosLoading(true);
      try{
        const today=isoJour(new Date());
        const path=`${user?.id||'anon'}/${enfant.id}/${today}`;
        const{data:files,error}=await supabase.storage.from('photos').list(path,{limit:50});
        if(!error&&files?.length>0){
          // BUCKETS PRIVES P3: signed URLs (expirent 1h) au lieu de getPublicUrl
          const validFiles=files.filter(f=>f.name!=='.emptyFolderPlaceholder');
          const filePaths=validFiles.map(f=>`${path}/${f.name}`);
          const{data:signed,error:signErr}=await supabase.storage.from('photos').createSignedUrls(filePaths,3600);
          if(signErr){console.error('Signed URLs photos:',signErr.message);setPhotosLoading(false);return;}
          const urls=(signed||[]).map(s=>s.signedUrl).filter(Boolean);
          setPhotos(p=>({...p,[enfant.id]:urls}));
        }
      }catch(e){console.log('Photos load:',e.message);}
      setPhotosLoading(false);
    };
    loadPhotos();
  },[enfant?.id]);

  const ajouterPhoto=async(e)=>{
    const file=e.target.files?.[0];
    if(!file)return;
    // For demo users, use local URL
    if(["e1","e2","e3"].includes(enfant?.id)){
      const url=URL.createObjectURL(file);
      setPhotos(p=>({...p,[enfant.id]:[...(p[enfant.id]||[]),url]}));
      return;
    }
    // Upload to Supabase Storage
    const today=isoJour(new Date());
    const ext=file.name.split('.').pop()||'jpg';
    const fileName=`${Date.now()}.${ext}`;
    const path=`${user?.id||'anon'}/${enfant.id}/${today}/${fileName}`;
    // Le quota se verifie juste avant l'envoi : le mesurer plus tot laisserait
    // passer une photo ajoutee entre-temps depuis un autre appareil.
    const place=await placeDisponible(user,"photos");
    if(!place.ok){ alert(place.message); return; }
    const{error}=await supabase.storage.from('photos').upload(path,file,{upsert:false});
    if(error){
      console.error('Upload photo:',error.message);
      // Fallback local
      const url=URL.createObjectURL(file);
      setPhotos(p=>({...p,[enfant.id]:[...(p[enfant.id]||[]),url]}));
      return;
    }
    const{data:urlData,error:signErr}=await supabase.storage.from('photos').createSignedUrl(path,3600);
    if(signErr||!urlData?.signedUrl){
      console.error('Signed URL photo:',signErr?.message);
      const url=URL.createObjectURL(file);
      setPhotos(p=>({...p,[enfant.id]:[...(p[enfant.id]||[]),url]}));
      return;
    }
    setPhotos(p=>({...p,[enfant.id]:[...(p[enfant.id]||[]),urlData.signedUrl]}));
  };

  const bilansRecus=role==="parent"?[
    {id:"br1",type:"bilan",date:fmt(TODAY_STR),txt:BILANS[enfant?.id]?.[0]||""},
    {id:"br2",type:"cr",trim:"T1 "+new Date().getFullYear(),txt:CRS[enfant?.id]?.[0]||""},
  ].filter(b=>b.txt):[];
  const [docOuvert,setDocOuvert]=useState(null);
  const msgs=txs.filter(t=>t.eId===enfant?.id).sort((a,b)=>a.id>b.id?1:-1);
  const enfantPhotos=photos[enfant?.id]||[];

  const send=()=>{if(!msg.trim())return;
    setTxs(p=>[...p,{id:"tn"+Date.now(),eId:enfant.id,auteur:role,date:TODAY_STR,h:TODAY_H,txt:msg,mood}]);
    setMsg("");};

  return <div>
    {/* Photos - galerie cliquable */}
    {(enfantPhotos.length>0||role==="asmat")&&<div className="card"style={{marginBottom:14}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div style={{fontWeight:700,fontSize:14,color:"var(--b)"}}><IconeOuEmoji e="📸"/> Photos du jour</div>
        {role==="asmat"&&<>
          <input ref={fileRef}type="file"accept="image/*"style={{display:"none"}}onChange={ajouterPhoto}/>
          <button className="btn bG s"style={{padding:"5px 12px"}}onClick={()=>fileRef.current?.click()}>
            + Ajouter une photo
          </button>
        </>}
      </div>
      {enfantPhotos.length===0
        ?<div style={{textAlign:"center",padding:"20px 0",color:"var(--l)",fontSize:13}}>Aucune photo pour aujourd'hui</div>
        :<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(90px,1fr))",gap:8}}>
          {enfantPhotos.map((src,i)=><div key={i}onClick={()=>setPhotoGrande(src)}style={{
            aspectRatio:"1",borderRadius:10,overflow:"hidden",cursor:"pointer",
            background:"var(--c)",transition:"transform .18s,box-shadow .18s"
          }}
            onMouseEnter={e=>{e.currentTarget.style.transform="scale(1.04)";e.currentTarget.style.boxShadow="var(--sh2)"}}
            onMouseLeave={e=>{e.currentTarget.style.transform="scale(1)";e.currentTarget.style.boxShadow="none"}}>
            <img src={src}alt=""style={{width:"100%",height:"100%",objectFit:"cover"}}/>
          </div>)}
        </div>}
    </div>}

    {/* Modale photo grande */}
    {photoGrande&&<div onClick={()=>setPhotoGrande(null)}style={{
      position:"fixed",inset:0,background:"rgba(0,0,0,.85)",display:"flex",
      alignItems:"center",justifyContent:"center",zIndex:300,cursor:"zoom-out",padding:20
    }}>
      <img src={photoGrande}alt=""style={{maxWidth:"100%",maxHeight:"90vh",borderRadius:12,boxShadow:"0 20px 60px rgba(0,0,0,.5)"}}/>
      <button onClick={()=>setPhotoGrande(null)}style={{
        position:"absolute",top:16,right:16,background:"rgba(255,255,255,.15)",
        border:"none",color:"#fff",borderRadius:"50%",width:36,height:36,
        cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center"
      }}>✕</button>
    </div>}

    {/* Documents reçus - parent seulement */}
    {role==="parent"&&bilansRecus.length>0&&<div className="card"style={{marginBottom:14,border:"1.5px solid var(--P)"}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
        <div style={{width:28,height:28,borderRadius:"50%",background:"var(--Pp)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>✨</div>
        <div style={{fontWeight:700,fontSize:13,color:"var(--P)"}}>Documents reçus de votre assmat</div>
      </div>
      {bilansRecus.map(b=><div key={b.id}style={{marginBottom:8}}>
        <div onClick={()=>setDocOuvert(docOuvert===b.id?null:b.id)}
          style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",background:"var(--Pp)",borderRadius:10,cursor:"pointer",border:"1px solid rgba(106,63,136,.2)"}}>
          <div style={{fontWeight:700,fontSize:13,color:"var(--P)"}}>
            {b.type==="bilan"?"✨ Bilan du "+b.date:"📝 CR - "+b.trim}
          </div>
          <span style={{color:"var(--P)"}}>{docOuvert===b.id?"▲":"▼"}</span>
        </div>
        {docOuvert===b.id&&<div style={{padding:16,background:"var(--w)",borderRadius:"0 0 10px 10px",border:"1px solid rgba(106,63,136,.2)",borderTop:"none",fontFamily:"'Cormorant Garamond',serif",fontSize:14,lineHeight:2,color:"var(--b)",whiteSpace:"pre-wrap",fontStyle:"italic"}}>
          {b.txt}
        </div>}
      </div>)}
    </div>}

    {/* Messages */}
    <div className="g2">
      <div className="card">
        <div style={{fontWeight:700,fontSize:14,marginBottom:12,color:"var(--b)"}}>{enfant?.emoji} {enfant?.prenom} · Aujourd'hui</div>
        <div style={{display:"flex",flexDirection:"column",gap:10,maxHeight:400,overflowY:"auto"}}>
          {msgs.length===0&&<EmptyState compact emoji="💬" titre="Aucune transmission aujourd'hui" texte="Les petits mots échangés sur la journée de l'enfant apparaîtront ici."/>}
          {msgs.map(t=><div key={t.id}style={{display:"flex",gap:10}}>
            <div style={{textAlign:"center",minWidth:38,flexShrink:0}}><div style={{fontSize:20}}>{t.mood}</div><div style={{fontSize:11,color:"var(--l)"}}>{t.h}</div></div>
            <div style={{flex:1,background:t.auteur==="asmat"?"var(--Tp)":"var(--Bp)",borderRadius:12,padding:"10px 14px",borderLeft:(t.auteur==="asmat"?"3px solid var(--T)":"3px solid var(--B)")}}>
              <div style={{fontSize:11,fontWeight:700,color:t.auteur==="asmat"?"var(--T)":"var(--B)",marginBottom:4}}>
                {t.auteur==="asmat"?"👩👧 "+(user?.prenom||"Marie"):"👪 "+(D.parents.find(p=>p.id===enfant?.parentId)?.prenom||"Parent")}</div>
              <div style={{fontSize:13,color:"var(--b)",lineHeight:1.6}}>{t.txt}</div>
            </div>
          </div>)}
        </div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div className="card">
          <div style={{fontWeight:700,fontSize:14,marginBottom:12,color:"var(--b)"}}><IconeOuEmoji e="✏️"/> Nouveau message</div>
          <div style={{marginBottom:10}}>
            <label className="lbl">Humeur</label>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {["😄","😊","😐","😴","😢","😠","🥰","😬"].map(h=><button key={h}className={"moo "+(mood===h?"on":"")}onClick={()=>setMood(h)}>{h}</button>)}
            </div>
          </div>
          <textarea className="ta"style={{marginBottom:10}}value={msg}onChange={e=>setMsg(e.target.value)}
            placeholder={role==="asmat"?("Racontez la journée de "+(enfant?.prenom||"")+"..."):"Informations pour la journée..."}/>
          <button className="btn bT"style={{width:"100%"}}onClick={send}>Envoyer ✉️</button>
        </div>
        {D.moodHistory[enfant?.id]&&<div className="card">
          <div style={{fontWeight:700,fontSize:13,marginBottom:10,color:"var(--b)"}}><IconeOuEmoji e="📈"/> Humeurs - 15 jours</div>
          <div className="mood-bar">
            {D.moodHistory[enfant.id].map((v,i)=><div key={i}className="mood-b"style={{height:(v/5*100)+"%",width:"100%",background:v>=4?"var(--S)":v>=3?"var(--G)":"var(--R)",opacity:.8}}/>)}
          </div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"var(--l)",marginTop:4}}>
            <span>J-14</span><span>Aujourd'hui</span>
          </div>
        </div>}
      </div>
    </div>
  </div>;
}


//
const SOMMEIL_DEMO={
  "e1":[
    {id:"s1",date:TODAY_STR,debut:"13h05",fin:"14h45",duree:"1h40",qualite:"bien"},
    {id:"s2",date:isoJour(new Date(Date.now()-86400000)),debut:"12h55",fin:"14h30",duree:"1h35",qualite:"bien"},
    {id:"s3",date:isoJour(new Date(Date.now()-172800000)),debut:"13h20",fin:"14h10",duree:"0h50",qualite:"agite"},
  ],
  "e2":[
    {id:"s4",date:TODAY_STR,debut:"13h10",fin:"13h55",duree:"0h45",qualite:"agite"},
    {id:"s5",date:isoJour(new Date(Date.now()-86400000)),debut:"13h00",fin:"15h00",duree:"2h00",qualite:"bien"},
  ],
  "e3":[
    {id:"s6",date:TODAY_STR,debut:"11h30",fin:"13h30",duree:"2h00",qualite:"bien"},
    {id:"s7",date:isoJour(new Date(Date.now()-86400000)),debut:"11h45",fin:"13h50",duree:"2h05",qualite:"bien"},
    {id:"s8",date:isoJour(new Date(Date.now()-172800000)),debut:"12h00",fin:"13h20",duree:"1h20",qualite:"court"},
  ],
};

const OMS_TAILLE=[49.9,54.7,58.4,61.4,63.9,65.9,67.6,69.2,70.6,72.0,73.3,74.5,75.7];

export const PMI_PAR_DEP={
  "75":  {nom:"PMI Paris 75",email:"pmi75-paris@sante.gouv.fr",tel:"01 42 76 40 40",adresse:"4 rue Lobau, 75196 Paris"},
  "92":  {nom:"PMI Hauts-de-Seine 92",email:"pmi@hauts-de-seine.fr",tel:"01 47 29 30 00",adresse:"2-4 bd Soufflot, 92015 Nanterre"},
  "93":  {nom:"PMI Seine-Saint-Denis 93",email:"pmi@seine-saint-denis.fr",tel:"01 43 93 85 00",adresse:"12 pl de l'Hôtel de Ville, 93000 Bobigny"},
  "94":  {nom:"PMI Val-de-Marne 94",email:"pmi@valdemarne.fr",tel:"01 43 99 80 00",adresse:"Hôtel du Dép., 94011 Créteil - RAM L'Haÿ-les-Roses"},
  "91":  {nom:"PMI Essonne 91",email:"pmi@essonne.fr",tel:"01 69 25 62 62",adresse:"Boulevard de France, 91012 Évry"},
  "95":  {nom:"PMI Val-d'Oise 95",email:"pmi@valdoise.fr",tel:"01 34 25 30 00",adresse:"2 av du Parc, 95032 Cergy-Pontoise"},
  "77":  {nom:"PMI Seine-et-Marne 77",email:"pmi@seine-et-marne.fr",tel:"01 64 14 77 00",adresse:"Hôtel du Dép., 77010 Melun"},
  "78":  {nom:"PMI Yvelines 78",email:"pmi@yvelines.fr",tel:"01 39 07 78 00",adresse:"2 pl André Mignot, 78012 Versailles"},
  "69":  {nom:"PMI Métropole de Lyon 69",email:"pmi@grandlyon.com",tel:"04 78 63 40 40",adresse:"20 rue du Lac, 69399 Lyon"},
  "13":  {nom:"PMI Bouches-du-Rhône 13",email:"pmi@departement13.fr",tel:"04 13 31 13 13",adresse:"52 av de Saint-Just, 13004 Marseille"},
  "31":  {nom:"PMI Haute-Garonne 31",email:"pmi@haute-garonne.fr",tel:"05 34 33 30 00",adresse:"1 bd de la Marquette, 31090 Toulouse"},
  "33":  {nom:"PMI Gironde 33",email:"pmi@gironde.fr",tel:"05 56 99 33 33",adresse:"Hôtel du Dép., 33074 Bordeaux"},
  "67":  {nom:"PMI Bas-Rhin 67",email:"pmi@bas-rhin.fr",tel:"03 88 76 67 67",adresse:"Hôtel du Dép., 67945 Strasbourg"},
  "59":  {nom:"PMI Nord 59",email:"pmi@lenord.fr",tel:"03 59 73 59 00",adresse:"51 rue Gustave Delory, 59047 Lille"},
  "default":{nom:"PMI de votre département",email:"pmi@votre-departement.fr",tel:"Contactez le 15 ou la mairie",adresse:"Renseignez-vous auprès de votre mairie ou du conseil départemental"},
};
const getPMI=(email)=>{
  if(!email)return PMI_PAR_DEP["default"];
  // Essayer de détecter le département depuis l'email ou le profil
  // Pour l'instant, on utilise le code postal du profil si disponible
  return PMI_PAR_DEP["default"];
};
//
// MON TEMPS DE TRAVAIL - la vue qui manque quand on a plusieurs employeurs.
// Chaque parent ne voit que son contrat ; personne ne voit le total. C'est
// pourtant la professionnelle qui repond des plafonds legaux, et elle seule qui
// peut les constater.
//
// MES EMPLOYEURS - la seconde vue qui manque quand on travaille pour plusieurs
// familles : ce que chacune doit ce mois-ci, et les conges a poser avec toutes.
//
// La convention demande aux parties de fixer les dates d'un commun accord AU
// PLUS TARD LE 1er MARS. Passe cette date sans accord, c'est l'assistante
// maternelle qui fixe ses dates — mais elle doit toujours prevenir. L'ecran
// rappelle l'echeance et dit ou en est chaque famille.
export function useInstallPWA(){
  const [deferredPrompt,setDeferredPrompt]=useState(null);
  const [isInstalled,setIsInstalled]=useState(false);
  const [isIOS]=useState(()=>/iphone|ipad|ipod/i.test(navigator.userAgent));

  useEffect(()=>{
    if(window.matchMedia('(display-mode: standalone)').matches){setIsInstalled(true);return;}
    const handler=(e)=>{e.preventDefault();setDeferredPrompt(e);};
    window.addEventListener('beforeinstallprompt',handler);
    return()=>window.removeEventListener('beforeinstallprompt',handler);
  },[]);

  const install=async(cb)=>{
    if(deferredPrompt){
      deferredPrompt.prompt();
      const{outcome}=await deferredPrompt.userChoice;
      if(outcome==='accepted'){setIsInstalled(true);setDeferredPrompt(null);}
    }
    cb&&cb();
  };

  return{deferredPrompt,isInstalled,isIOS,install};
}

export function InstallGuide({isIOS,onClose}){
  return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.7)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:300,padding:16}}
    onClick={e=>e.target===e.currentTarget&&onClose()}>
    <div style={{background:"var(--w)",borderRadius:"20px 20px 0 0",padding:"24px 20px 32px",width:"100%",maxWidth:480}}>
      <div style={{textAlign:"center",marginBottom:20}}>
        <div style={{fontSize:36,marginBottom:8}}>📲</div>
        <div style={{fontWeight:700,fontSize:17,color:"var(--b)",marginBottom:4}}>Installer TiMat</div>
        <div style={{fontSize:13,color:"var(--l)"}}>Ajoutez l'icône sur votre écran d'accueil</div>
      </div>
      {isIOS?<div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:20}}>
        {[["1","📤 Appuyez sur Partager","En bas de Safari"],["2","👆 Faites défiler","Dans le menu"],["3","➕ Sur l'écran d'accueil","L'icône TiMat apparaîtra"]].map(([n,t,d])=>
          <div key={n} style={{display:"flex",gap:12,padding:"10px 14px",background:"var(--c)",borderRadius:12}}>
            <div style={{width:28,height:28,borderRadius:"50%",background:"var(--T)",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,flexShrink:0}}>{n}</div>
            <div><div style={{fontWeight:600,fontSize:13,color:"var(--b)"}}>{t}</div><div style={{fontSize:11,color:"var(--l)"}}>{d}</div></div>
          </div>)}
        <div style={{padding:"10px 14px",background:"var(--Bp)",borderRadius:10,fontSize:12,color:"var(--B)"}}>
          <IconeOuEmoji e="💡"/> Fonctionne uniquement sur <strong>Safari</strong>
        </div>
      </div>:<div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:20}}>
        {[["1","⋮ Appuyez sur les 3 points","En haut à droite de Chrome"],["2","Ajouter à l'écran d'accueil","Dans le menu"],["3","Confirmer","L'icône TiMat apparaîtra"]].map(([n,t,d])=>
          <div key={n} style={{display:"flex",gap:12,padding:"10px 14px",background:"var(--c)",borderRadius:12}}>
            <div style={{width:28,height:28,borderRadius:"50%",background:"var(--T)",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,flexShrink:0}}>{n}</div>
            <div><div style={{fontWeight:600,fontSize:13,color:"var(--b)"}}>{t}</div><div style={{fontSize:11,color:"var(--l)"}}>{d}</div></div>
          </div>)}
      </div>}
      <button onClick={onClose} style={{width:"100%",background:"var(--accent)",color:"#fff",border:"none",borderRadius:12,padding:"13px",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit"}}>Compris ✓</button>
    </div>
  </div>;
}

function BandeauInstall(){
  const {deferredPrompt,isInstalled,isIOS,install}=useInstallPWA();
  const [show,setShow]=useState(false);
  const [showGuide,setShowGuide]=useState(false);

  useEffect(()=>{
    if(isInstalled)return;
    // Afficher sur iOS après 5s, sur Android quand le prompt est disponible
    if(isIOS){const t=setTimeout(()=>setShow(true),5000);return()=>clearTimeout(t);}
  },[isInstalled,isIOS]);

  useEffect(()=>{
    if(deferredPrompt)setShow(true);
  },[deferredPrompt]);

  if(!show||isInstalled)return null;

  return <>
    <div style={{background:"linear-gradient(135deg,var(--T),var(--S))",padding:"8px 14px",display:"flex",alignItems:"center",gap:10,flexShrink:0,zIndex:50}}>
      <IconeOuEmoji e="📲"/>
      <div style={{flex:1}}>
        <div style={{fontSize:12,fontWeight:700,color:"#fff"}}>Installer TiMat sur votre écran d'accueil</div>
        <div style={{fontSize:11,color:"rgba(255,255,255,.75)"}}>Accès rapide comme une vraie app</div>
      </div>
      <button onClick={()=>install(()=>{if(!deferredPrompt)setShowGuide(true);})}
        style={{background:"rgba(255,255,255,.2)",border:"1px solid rgba(255,255,255,.4)",borderRadius:8,padding:"6px 12px",cursor:"pointer",fontSize:11,fontWeight:700,color:"#fff",flexShrink:0}}>
        Installer
      </button>
      <button onClick={()=>setShow(false)} style={{background:"none",border:"none",color:"rgba(255,255,255,.7)",cursor:"pointer",fontSize:15,padding:4}}>✕</button>
    </div>
    {showGuide&&<InstallGuide isIOS={isIOS} onClose={()=>setShowGuide(false)}/>}
  </>;
}

function BandeauHorsLigne(){
  const [online,setOnline]=useState(true);
  const [file,setFile]=useState([]);
  const [envoi,setEnvoi]=useState(false);
  const [bilan,setBilan]=useState("");
  const relire=()=>setFile(fileHorsLigne());
  useEffect(()=>{
    const up=()=>setOnline(true);
    const down=()=>setOnline(false);
    window.addEventListener("online",up);
    window.addEventListener("offline",down);
    window.addEventListener("timat:file-hors-ligne",relire);
    setOnline(navigator.onLine);
    relire();
    return()=>{
      window.removeEventListener("online",up);
      window.removeEventListener("offline",down);
      window.removeEventListener("timat:file-hors-ligne",relire);
    };
  },[]);
  const envoyer=async()=>{
    if(envoi)return;
    setEnvoi(true);setBilan("");
    const r=await rejouerFile();
    relire();
    setBilan(r.envoyees?r.envoyees+(r.envoyees>1?" pointages envoyés":" pointage envoyé"):
      r.restantes?"Toujours pas de réseau":"Rien à envoyer");
    setEnvoi(false);
    if(r.envoyees)window.dispatchEvent(new CustomEvent("timat:refresh-data"));
  };
  // Des le retour du reseau, la file part toute seule : personne ne doit avoir
  // a penser a appuyer sur un bouton pour que son travail soit enregistre.
  useEffect(()=>{if(online&&file.length&&!envoi)envoyer();},[online]);

  const conflits=file.filter(x=>x.conflit);
  if(online&&!file.length&&!envoi&&!bilan)return null;

  const rouge=conflits.length>0;
  const jaune=!online||file.length>0;
  const fond=rouge?"#FEE2E2":jaune?"#FEF9C3":"var(--Sp)";
  const bord=rouge?"#FCA5A5":jaune?"#FCD34D":"var(--Sl)";
  const encre=rouge?"#991B1B":jaune?"#92400E":"var(--S)";
  const enAttente=file.length-conflits.length;

  let texte;
  if(conflits.length) texte=conflits.length+(conflits.length>1?" pointages n'ont pas pu être envoyés":" pointage n'a pas pu être envoyé")+" — "+conflits[0].conflit;
  else if(!online&&enAttente) texte="Hors ligne — "+(enAttente>1
    ?enAttente+" pointages notés sur cet appareil, pas encore enregistrés"
    :"1 pointage noté sur cet appareil, pas encore enregistré");
  else if(!online) texte="Hors ligne — vous pouvez consulter et pointer, l'envoi se fera au retour du réseau";
  else if(envoi) texte="Envoi de "+enAttente+(enAttente>1?" pointages...":" pointage...");
  else if(enAttente) texte=enAttente+(enAttente>1?" pointages en attente d'envoi":" pointage en attente d'envoi");
  else texte=bilan||"";

  return <div style={{
    background:fond,borderBottom:"1px solid "+bord,
    padding:"6px 16px",display:"flex",alignItems:"center",gap:8,fontSize:12,fontWeight:600,
    color:encre,flexShrink:0
  }}>
    <IconeOuEmoji e={rouge?"⚠️":!online?"📵":envoi?"🔄":enAttente?"⏳":"✅"} taille={15}/>
    <span>{texte}</span>
    {(enAttente>0||conflits.length>0)&&online&&!envoi&&<button onClick={envoyer}
      style={{marginLeft:"auto",background:"none",border:"1px solid "+bord,color:encre,borderRadius:10,padding:"3px 8px",cursor:"pointer",fontSize:11}}>
      Réessayer
    </button>}
  </div>;
}

//

// Efface les fichiers d'un compte dans les compartiments photos et documents.
// Ils sont ranges sous l'identifiant du compte : « photos/<id>/... ». Le
// declencheur storage.protect_delete de Supabase interdit de les supprimer en
// SQL, cet effacement ne peut donc pas vivre dans delete_user_account.
export async function viderStockageDuCompte(userId){
  for(const bucket of ["photos","documents"]){
    try{
      const aEffacer=[];
      const parcourir=async(prefixe)=>{
        const{data,error}=await supabase.storage.from(bucket).list(prefixe,{limit:1000});
        if(error||!data)return;
        for(const entree of data){
          const chemin=prefixe?prefixe+"/"+entree.name:entree.name;
          // Une entree sans metadonnees est un dossier, pas un fichier.
          if(entree.id===null||entree.metadata===null)await parcourir(chemin);
          else aEffacer.push(chemin);
        }
      };
      await parcourir(String(userId));
      // La suppression accepte un lot ; on decoupe pour ne pas depasser la limite.
      for(let i=0;i<aEffacer.length;i+=100){
        await supabase.storage.from(bucket).remove(aEffacer.slice(i,i+100));
      }
    }catch(e){
      // Un echec de nettoyage ne doit pas empecher l'effacement des donnees
      // elles-memes : le droit a l'effacement prime sur le menage des fichiers.
      console.warn("[suppression] nettoyage du compartiment "+bucket+" incomplet :",e?.message);
    }
  }
}

async function saveAsmatSignature(userId,base64){
  const{error}=await supabase.from("profiles").update({signature_base64:base64}).eq("id",userId);
  if(error)throw error;
  await logAction("update_signature",{table_name:"profiles",record_id:userId,user_id:userId});
  return true;
}

// PDF CONTRAT COMBINE P11 - genere le PDF du contrat avec les 2 signatures (asmat + parent si presente)
// puis le stocke dans Supabase Storage et insere une ligne dans documents_meta.
// Appele apres chaque signature de contrat. Idempotent (remplace si deja existant).
//
// MISE EN PAGE DU CONTRAT - un vrai contrat de travail, pas une fiche resume.
//
// Ce que l'application produisait tenait sur une page : les deux parties,
// l'enfant, cinq lignes de conditions, deux cadres de signature. Un contrat de
// travail d'assistante maternelle en compte bien davantage — la periode d'essai
// et la periode d'adaptation, la mensualisation et sa formule, les conges
// payes, les jours feries, les absences, le preavis, les autorisations de
// deplacement. Sans ces clauses ecrites, c'est la convention qui s'applique par
// defaut, et les deux parties decouvrent la regle le jour du desaccord.
//
// Les seuls chiffres ecrits en dur ici sont ceux verifies a la source et
// verrouilles par l'audit. Tout le reste renvoie a la convention plutot que
// d'inventer une valeur.
const MARGE=20, LARGEUR=210, HAUTEUR=297, BAS=272;

function redacteurPdf(doc,{titre,sousTitre}){
  let y=0, page=0;
  const pages=[];
  const nouvellePage=(premiere)=>{
    if(!premiere)doc.addPage();
    page++;pages.push(page);
    y=MARGE;
    if(premiere){
      doc.setFont("helvetica","bold");doc.setFontSize(15);
      doc.text(titre,LARGEUR/2,y,{align:"center"});y+=6;
      doc.setFont("helvetica","normal");doc.setFontSize(9.5);
      doc.text(sousTitre,LARGEUR/2,y,{align:"center"});y+=4;
      doc.setDrawColor(180);doc.line(MARGE,y,LARGEUR-MARGE,y);y+=8;
    }
  };
  const place=(h)=>{ if(y+h>BAS)nouvellePage(false); };
  const api={
    get y(){return y;}, set y(v){y=v;},
    get page(){return page;},
    nouvellePage,
    place,
    // Titre d'article, jamais seul en bas de page.
    article(n,t){
      place(16);
      doc.setFillColor(240,236,228);doc.rect(MARGE,y-4.2,LARGEUR-2*MARGE,7,"F");
      doc.setFont("helvetica","bold");doc.setFontSize(10.5);doc.setTextColor(40,60,80);
      doc.text("ARTICLE "+n+" — "+t,MARGE+2,y+1);
      doc.setTextColor(0);y+=11;
    },
    // Ligne « libelle : valeur », la valeur alignee a droite.
    champ(l,v){
      place(6);
      doc.setFont("helvetica","normal");doc.setFontSize(9.5);
      doc.text(String(l),MARGE+2,y);
      doc.setFont("helvetica","bold");
      doc.text(String(v==null||v===""?"-":v),LARGEUR-MARGE-2,y,{align:"right"});
      doc.setFont("helvetica","normal");y+=5.6;
    },
    // Paragraphe de clause, coupe a la largeur utile.
    texte(t,{italique=false,taille=9}={}){
      doc.setFont("helvetica",italique?"italic":"normal");doc.setFontSize(taille);
      for(const l of doc.splitTextToSize(String(t),LARGEUR-2*MARGE-4)){
        place(5.4);doc.text(l,MARGE+2,y);y+=4.4;
      }
      doc.setFont("helvetica","normal");y+=2;
    },
    espace(h=4){y+=h;},
    // Numerotation et paraphes, poses a la fin quand le total est connu.
    finaliser(){
      const total=doc.getNumberOfPages();
      for(let p=1;p<=total;p++){
        doc.setPage(p);
        doc.setFont("helvetica","normal");doc.setFontSize(7.5);doc.setTextColor(120);
        doc.text("Page "+p+" sur "+total,LARGEUR/2,HAUTEUR-10,{align:"center"});
        doc.text("Paraphes : ......... / .........",LARGEUR-MARGE,HAUTEUR-10,{align:"right"});
        doc.setTextColor(0);
      }
    },
  };
  nouvellePage(true);
  return api;
}

// Les dates au format francais dans les PDF : « 2026-09-01 » ne se lit pas.
// Le texte officiel de la convention, gratuit et toujours a jour. On renvoie
// vers lui plutot que d'embarquer une copie PDF : une copie se perime, et
// c'est justement le texte qui tranche tout ce que le contrat ne dit pas.
export const URL_CONVENTION="https://www.legifrance.gouv.fr/conv_coll/id/KALICONT000044594539";

// DOCUMENTS PERIMES.
// Le PDF n'est pas recalcule a l'ouverture : il est ecrit une fois, a la
// signature pour le contrat, a l'envoi pour le bulletin, puis relu tel quel.
// Refondre le generateur ne touche donc PAS les fichiers deja produits :
// l'application affichait le nouveau contrat pour les nouvelles signatures, et
// l'ancien pour toutes les autres, sans que rien ne le signale.
// Cette date est celle de la refonte des deux documents. Un fichier ecrit avant
// est perime : l'application le dit et propose de le refaire.
export const DOCUMENTS_REFONTE="2026-09-10T00:00:00Z";
// Le PDF est perime s'il a ete ecrit AVANT la derniere modification du contrat,
// ou avant la refonte des documents. La premiere comparaison est la vraie :
// sans elle, une fois le fichier refait le bouton disparaissait pour de bon, et
// toute modification ulterieure du contrat — les indemnites, le rythme
// d'accueil, qui fournit les repas — restait absente du PDF sans recours.
export const fmtDatePdf=(d)=>{
  const t=String(d||"").slice(0,10);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(t))return t||"-";
  const[a,m,j]=t.split("-");
  return j+"/"+m+"/"+a;
};

export async function generateAndStoreContratPDF(contratId){
  try{
    // 1. Recuperer toutes les donnees necessaires
    const{data:ct,error:eCt}=await supabase.from("contrats").select("*").eq("id",contratId).single();
    if(eCt||!ct)return{success:false,error:"Contrat introuvable"};

    // Le PDF s'ecrit dans l'espace de stockage de l'assistante maternelle, et
    // la regle de securite exige que le premier dossier du chemin soit celui
    // de la personne qui ecrit. Un parent employeur ne peut donc PAS produire
    // ce fichier : la tentative remontait jusqu'ici sous la forme
    // « new row violates row-level security policy », un message de base de
    // donnees qui ne veut rien dire pour qui le lit.
    //
    // On refuse ici, une seule fois, plutot que dans chaque ecran qui appelle.
    const{data:{user:moi}}=await supabase.auth.getUser();
    if(moi?.id&&ct.asmat_id&&moi.id!==ct.asmat_id){
      return{success:false,error:"Seule l'assistante maternelle peut mettre ce PDF à jour : le document est produit depuis son espace."};
    }
    const{data:enfant}=await supabase.from("enfants").select("*").eq("id",ct.enfant_id).single();
    if(!enfant)return{success:false,error:"Enfant introuvable"};
    const{data:asmatProfile}=await supabase.from("profiles").select("prenom,nom,email,telephone,adresse,numero_agrement").eq("id",ct.asmat_id).maybeSingle();
    let{data:parentProfile}=ct.parent_id?await supabase.from("profiles").select("prenom,nom,email,telephone,adresse,numero_pajemploi,parent2_prenom,parent2_nom,parent2_email").eq("id",ct.parent_id).maybeSingle():{data:null};
    // RLS profiles_own : quand c'est l'ASMAT qui genere le PDF, la lecture ci-dessus renvoie null.
    // On retombe sur la RPC SECURITY DEFINER pour ne pas produire un bloc EMPLOYEUR vide.
    if(!parentProfile&&ct.enfant_id){
      try{const{data:pc}=await supabase.rpc("get_parent_contact",{p_enfant_id:ct.enfant_id});if(pc)parentProfile=pc;}catch(e){console.warn("get_parent_contact",e);}
    }

    // 2. Charger jsPDF si pas deja charge
const jsPDF=await chargerJsPDF();
    const doc=protegerPdf(new jsPDF({unit:"mm",format:"a4",orientation:"portrait"}));

    // 3. Le contrat
    const emp=ct.employeur_snapshot||parentProfile||{};
    const sal=ct.salarie_snapshot||asmatProfile||{};
    const A=(v)=>String(v||"").split(/\n+/).map(x=>x.trim()).filter(Boolean).join(", ");
    const nom=(p,a,b)=>((p?.[a]||"")+" "+(p?.[b]||"")).trim();
    const jours=Array.isArray(ct.jours)?ct.jours:(ct.jours?[ct.jours]:[]);
    const nbJours=jours.length;
    const cadre={...ct,anneeComplete:ct.annee_complete,semainesAccueil:ct.semaines_accueil,
      heuresHebdo:ct.heures_hebdo,tauxHoraire:ct.taux_horaire};
    const complete=estAnneeComplete(cadre);
    const semaines=semainesDuContrat(cadre);
    const hMois=heuresMensualisees(cadre);
    const salMois=salaireMensualise(cadre);
    // Deux mois si l'enfant est confie quatre jours ou plus par semaine, trois
    // sinon (CCN 3239). La duree doit figurer au contrat : sans elle, il n'y a
    // pas de periode d'essai du tout.
    // La periode d'essai depend du nombre de jours d'accueil. Sans jours saisis,
    // on ne peut pas la deduire : on laisse la ligne a remplir a la main plutot
    // que d'imprimer une duree inventee.
    const essaiMois=nbJours>=4?2:3;
    const A_COMPLETER="..............................  (à compléter et parapher)";

    // QUI FOURNIT LES REPAS. La convention laisse les deux parties en decider,
    // se mettre d'accord sur la nature des repas, et impose que ce choix soit
    // precise au contrat. L'application ne connaissait que le MONTANT : un
    // montant a zero pouvait vouloir dire « l'employeur fournit » comme
    // « l'assistante maternelle fournit sans rien demander ». Le contrat
    // tranchait donc a la place des parties.
    const REPAS_TEXTE={
      employeur:"Fournis par le particulier employeur",
      assmat:"Fournis par l'assistant maternel",
      mixte:"Partages entre les parties (voir detail ci-dessous)",
    };
    const repasPar=REPAS_TEXTE[ct.repas_fourni_par]||null;

    const R=redacteurPdf(doc,{
      titre:"CONTRAT DE TRAVAIL À DURÉE INDÉTERMINÉE",
      sousTitre:"Assistant maternel agréé employé par un particulier — Convention collective IDCC 3239",
    });

    R.article(1,"LES PARTIES");
    R.texte("Le présent contrat est conclu entre :");
    R.champ("Le particulier employeur",nom(emp,"prenom","nom"));
    if(emp?.parent2_prenom||emp?.parent2_nom)R.champ("Et",nom(emp,"parent2_prenom","parent2_nom"));
    R.champ("Domicile",A(emp?.adresse));
    R.champ("Téléphone",emp?.telephone);
    R.champ("Courriel",emp?.email);
    R.champ("Numéro Pajemploi",emp?.numero_pajemploi||"communiqué dès réception");
    R.espace(3);
    R.champ("Le salarié, assistant maternel agréé",nom(sal,"prenom","nom"));
    R.champ("Domicile, lieu d'accueil",A(sal?.adresse));
    R.champ("Téléphone",sal?.telephone);
    R.champ("Courriel",sal?.email);
    R.champ("Numéro d'agrément",sal?.numero_agrement);
    R.espace(2);
    R.texte("Le salarié déclare être titulaire d'un agrément en cours de validité délivré par le président du conseil départemental, et avoir souscrit une assurance responsabilité civile professionnelle. S'il transporte l'enfant, il déclare disposer d'une assurance automobile couvrant ce transport. Les copies de ces documents sont annexées au présent contrat selon la liste de l'article 12.",{taille:8.5});

    R.article(2,"L'ENFANT ACCUEILLI");
    R.champ("Prénom et nom",((enfant.prenom||"")+" "+(enfant.nom||"")).trim());
    R.champ("Date de naissance",enfant.naissance?fmtDatePdf(enfant.naissance):"-");

    R.article(3,"DATE D'EMBAUCHE, PÉRIODE D'ESSAI ET PÉRIODE D'ADAPTATION");
    R.champ("Premier jour d'accueil",ct.debut?fmtDatePdf(ct.debut):"-");
    R.champ("Durée de la période d'essai",nbJours>0?essaiMois+" mois":A_COMPLETER);
    R.texte("La période d'essai est de deux mois lorsque l'enfant est confié quatre jours calendaires ou plus par semaine, et de trois mois en deçà (convention collective IDCC 3239). Elle court à compter du premier jour d'accueil. Pendant cette période, chacune des parties peut rompre le contrat sans motif ni indemnité, en respectant le délai de prévenance prévu par la convention.",{taille:8.5});
    R.texte("Une période d'adaptation de 30 jours calendaires au maximum, destinée à familiariser progressivement l'enfant à son nouveau mode d'accueil, s'ouvre au premier jour de travail effectif. Elle est comprise dans la période d'essai. Ses modalités (jours et horaires progressifs) sont convenues entre les parties ; le salaire y est calculé sur les heures réellement effectuées.",{taille:8.5});

    R.article(4,"DURÉE ET HORAIRES DE L'ACCUEIL");
    R.champ("Jours d'accueil",jours.length?jours.join(", "):"-");
    R.champ("Nombre de jours par semaine",nbJours||"-");
    R.champ("Horaires habituels",ct.horaires);
    R.champ("Durée hebdomadaire d'accueil",(ct.heures_hebdo||0)+" heures");
    R.champ("Rythme d'accueil",complete?"Année complète (52 semaines)":"Année incomplète ("+semaines+" semaines par an)");
    if(ct.fin)R.champ("Fin prévue de l'accueil",fmtDatePdf(ct.fin));
    R.texte("Toute heure effectuée au-delà de la durée hebdomadaire convenue est une heure complémentaire, rémunérée en sus du salaire mensualisé. Au-delà de 45 heures par semaine, les heures sont majorées selon le taux fixé par la convention collective. Toute modification durable des jours ou des horaires fait l'objet d'un avenant écrit signé des deux parties.",{taille:8.5});

    R.article(5,"RÉMUNÉRATION");
    R.champ("Salaire horaire brut",nbf(ct.taux_horaire||0,2)+" € par heure et par enfant");
    R.champ("Soit, net, environ",nbf(netDepuisBrut(ct.taux_horaire||0),2)+" € par heure");
    R.champ("Mode de mensualisation",complete?"Année complète":"Année incomplète");
    R.champ("Calcul",(ct.heures_hebdo||0)+" h x "+semaines+" semaines ÷ 12 mois = "+hMois+" h par mois");
    R.champ("Salaire mensuel brut de base",nbf(salMois,2)+" €");
    R.champ("Soit, net, environ",nbf(netDepuisBrut(salMois),2)+" €");
    R.texte(complete
      ? "Le salaire est mensualisé sur 52 semaines : le même montant est versé chaque mois, quel que soit le nombre de jours d'accueil du mois, et la rémunération des congés payés est incluse dans ce montant."
      : "Le salaire est mensualisé sur les "+semaines+" semaines d'accueil programmées : le même montant est versé chaque mois d'accueil. La rémunération des congés payés n'est PAS comprise dans ce montant ; elle est versée à part, selon les modalités de l'article 7.",{taille:8.5});
    R.texte("Le salaire est versé au plus tard à la fin du mois. Le particulier employeur déclare la rémunération chaque mois au service Pajemploi, qui édite le bulletin de paie. Le salaire horaire ne peut être inférieur au minimum conventionnel en vigueur.",{taille:8.5});

    R.article(6,"INDEMNITÉS ET FRAIS");
    R.champ("Indemnité d'entretien",nbf(ct.entretien||0,2)+" € par journée d'accueil");
    R.texte("L'indemnité d'entretien couvre les matériels et produits de couchage, de puériculture, de jeu et d'hygiène, ainsi que la part afférente aux frais généraux du logement. Elle est due pour chaque journée d'accueil, n'est pas un salaire, et ne peut être inférieure au minimum fixé par la convention collective.",{taille:8.5});
    R.champ("Fourniture des repas",repasPar||A_COMPLETER);
    if(ct.repas_fourni_par==="employeur"){
      R.texte("Le particulier employeur fournit les repas de l'enfant. Aucune indemnité de repas n'est due au salarié.",{taille:8.5});
    }else if(Number(ct.repas)>0){
      R.champ("Indemnité de repas",nbf(ct.repas,2)+" € par journée d'accueil");
    }else{
      R.champ("Indemnité de repas",A_COMPLETER);
    }
    if(ct.repas_fourni_par!=="employeur"){
      R.texte("Lorsque le salarié fournit tout ou partie des repas, les parties conviennent ensemble de leur nature (repas principaux, goûter, lait, régime particulier) et l'indemnité est fixée en conséquence. Elle ne peut être inférieure au minimum prévu par la convention collective. Nature des repas convenue : "+A_COMPLETER,{taille:8.5});
    }
    R.texte("Les déplacements effectués avec l'enfant pour le compte du particulier employeur donnent lieu à une indemnité kilométrique, convenue entre les parties. Elle ne peut être inférieure au barème de l'administration ni supérieure au barème fiscal. Une feuille de route mensuelle mentionnant la date, le motif et le kilométrage est tenue par le salarié.",{taille:8.5});

    R.article(7,"CONGÉS PAYÉS");
    R.texte("Le salarié acquiert 2,5 jours ouvrables de congés payés par mois de travail effectif, dans la limite de 30 jours ouvrables par an. La période de référence court du 1er juin au 31 mai.",{taille:8.5});
    R.texte(complete
      ? "L'accueil étant organisé sur l'année complète, la rémunération des congés payés est incluse dans le salaire mensualisé."
      : "L'accueil étant organisé sur une année incomplète, la rémunération des congés payés est versée à part : soit en une fois au mois de juin, soit lors de la prise principale des congés, soit par fractionnement lors de chaque prise. Son montant est le plus favorable entre le dixième de la rémunération brute perçue sur la période de référence et le maintien du salaire.",{taille:8.5});
    R.texte("Lorsque le salarié accueille les enfants de plusieurs particuliers employeurs, les parties s'efforcent de fixer d'un commun accord les dates de congés au plus tard le 1er mars de chaque année.",{taille:8.5});

    R.article(8,"JOURS FÉRIÉS");
    R.texte("Le 1er mai est chômé et payé lorsqu'il tombe un jour habituellement travaillé. Les autres jours fériés sont chômés et payés ou travaillés selon ce que les parties conviennent ; les jours fériés travaillés sont majorés conformément à la convention collective.",{taille:8.5});

    R.article(9,"ABSENCES");
    R.texte("Les absences du salarié qui ne sont pas rémunérées donnent lieu à une retenue sur le salaire mensualisé, proportionnelle à la durée de l'absence (article 111 de la convention collective).",{taille:8.5});
    R.texte("En cas d'absence de l'enfant pour une raison autre que la maladie, le salaire est dû. En cas de maladie de l'enfant, l'absence n'est déduite que sur présentation d'un certificat médical et dans les conditions prévues par la convention collective. Les absences prévues sont annoncées dès que possible à l'autre partie.",{taille:8.5});
    R.texte("Le salarié bénéficie chaque année d'un droit à la formation professionnelle. Lorsque la formation se déroule sur le temps d'accueil, le salaire est maintenu ; lorsqu'elle se déroule en dehors, elle ouvre droit à une allocation de formation versée par l'organisme collecteur, et non par le particulier employeur.",{taille:8.5});

    R.article(10,"RUPTURE DU CONTRAT");
    R.texte("Hors période d'essai, la partie qui souhaite rompre le contrat notifie sa décision à l'autre par lettre recommandée avec avis de réception, ou par lettre remise en main propre contre décharge. La date de première présentation fixe le point de départ du préavis.",{taille:8.5});
    R.texte("Le préavis est de 8 jours calendaires pour une ancienneté inférieure à 3 mois, de 15 jours pour une ancienneté de 3 mois à moins d'un an, et d'un mois au-delà. Le retrait de l'enfant à l'initiative du particulier employeur ouvre droit, après 9 mois d'ancienneté et hors faute grave, à une indemnité de rupture égale au minimum à 1/80e du total des salaires nets perçus.",{taille:8.5});
    R.texte("Au terme du contrat, le particulier employeur remet au salarié un certificat de travail, un solde de tout compte et une attestation destinée à France Travail. Le retrait de l'agrément du salarié entraîne la rupture de plein droit du contrat.",{taille:8.5});

    R.article(11,"AUTORISATIONS DU PARTICULIER EMPLOYEUR");
    R.texte("Le particulier employeur autorise le salarié à (cocher ou rayer les mentions inutiles) :",{taille:8.5});
    for(const l of [
      "transporter l'enfant en véhicule personnel, l'assurance automobile du salarié couvrant ce transport ;",
      "sortir avec l'enfant hors du domicile (promenade, parc, relais petite enfance, bibliothèque) ;",
      "confier ponctuellement l'enfant à une tierce personne désignée par écrit par le particulier employeur ;",
      "administrer un traitement médical sur présentation d'une ordonnance nominative en cours de validité ;",
      "appeler les secours et faire hospitaliser l'enfant en cas d'urgence, le particulier employeur étant prévenu sans délai ;",
      "photographier l'enfant dans le cadre de l'accueil, sans diffusion en dehors du particulier employeur.",
    ]){ R.place(6); doc.setFontSize(8.5); doc.text("[ ]",MARGE+2,R.y); for(const seg of doc.splitTextToSize(l,LARGEUR-2*MARGE-12)){ doc.text(seg,MARGE+9,R.y); R.y+=4.2; } R.y+=1.4; }

    R.article(12,"DOCUMENTS ANNEXÉS ET DISPOSITIONS FINALES");
    R.texte("Les documents suivants sont annexés au présent contrat (cocher ceux qui sont joints) :",{taille:8.5});
    for(const l of [
      "copie de l'agrément du salarié ;",
      "attestation d'assurance responsabilité civile professionnelle du salarié ;",
      "attestation d'assurance automobile, si le salarié transporte l'enfant ;",
      "fiche de renseignements et d'urgence concernant l'enfant ;",
      "autorisations parentales de l'article 11 ;",
      "attestation d'assurance responsabilité civile du particulier employeur.",
    ]){ R.place(6); doc.setFontSize(8.5); doc.text("[ ]",MARGE+2,R.y); for(const seg of doc.splitTextToSize(l,LARGEUR-2*MARGE-12)){ doc.text(seg,MARGE+9,R.y); R.y+=4.2; } R.y+=1.4; }
    R.texte("Tout ce qui n'est PAS écrit dans le présent contrat est régi par la convention collective nationale des particuliers employeurs et de l'emploi à domicile (IDCC 3239) et par le code du travail. C'est elle qui tranche, et les deux parties sont réputées en avoir pris connaissance. Toute clause du contrat moins favorable au salarié que la convention collective est réputée non écrite.",{taille:8.5});
    R.texte("Le texte intégral et à jour de la convention est consultable gratuitement sur Légifrance :",{taille:8.5});
    R.texte(URL_CONVENTION,{taille:8.5});
    R.texte("Le présent contrat est établi en deux exemplaires originaux, un pour chaque partie. Il est daté, signé, et paraphé au bas de chaque page. Il est à conserver au moins cinq ans.",{taille:8.5});

    // Signatures, jamais separees du dernier article par une page vide.
    R.place(54);
    R.espace(4);
    doc.setFont("helvetica","bold");doc.setFontSize(10.5);
    doc.text("SIGNATURES",MARGE,R.y);R.y+=3;
    doc.setFont("helvetica","normal");doc.setFontSize(8);
    doc.text("Précédées de la mention manuscrite « lu et approuve »",MARGE,R.y+3);R.y+=8;

    const sigY=R.y, sigW=80, sigH=32;
    const cadreSig=(x,titreSig,image,date,attente)=>{
      doc.setDrawColor(120);doc.rect(x,sigY,sigW,sigH);
      doc.setFontSize(8.5);doc.setFont("helvetica","bold");
      doc.text(titreSig,x,sigY-2);doc.setFont("helvetica","normal");
      if(image){
        try{doc.addImage(image,"PNG",x+2,sigY+2,sigW-4,sigH-11);}catch(e){}
        doc.setFontSize(7.5);
        doc.text("Signé électroniquement le "+(date?fmtDatePdf(date.slice(0,10)):"-"),x+2,sigY+sigH-2.5);
      }else{
        doc.setFontSize(8);doc.setTextColor(140);
        doc.text(attente,x+2,sigY+sigH/2);doc.setTextColor(0);
      }
    };
    cadreSig(MARGE,"L'assistant maternel",ct.signature_asmat_data,ct.date_signature_asmat,"Non signé");
    cadreSig(LARGEUR-MARGE-sigW,"Le particulier employeur",ct.signature_parent_data,ct.date_signature_parent,"En attente de signature");
    R.y=sigY+sigH+7;
    R.texte("Signature électronique horodatée, de valeur légale identique à une signature manuscrite (règlement eIDAS n° 910/2014).",{italique:true,taille:7.5});

    R.finaliser();

    // 4. Convertir en blob et uploader
    const blob=doc.output("blob");
    const fileName="contrat_"+contratId+".pdf";
    const path=ct.asmat_id+"/contrats/"+fileName;
    const{error:eUp}=await supabase.storage.from("documents").upload(path,blob,{
      contentType:"application/pdf",
      upsert:true,
      cacheControl:"0",
    });
    if(eUp)return{success:false,error:"Upload : "+eUp.message};

    // 5. Update contrat avec le path
    const nowIso=new Date().toISOString();
    await supabase.from("contrats").update({
      pdf_storage_path:path,
      pdf_generated_at:nowIso,
    }).eq("id",contratId);

    // 6. Inserer/update dans documents_meta (idempotent via upsert sur cle storage_path)
    const metaId="contrat_"+contratId; // id stable pour upsert
    const nomDoc="Contrat_"+H(enfant.prenom||"enfant")+"_"+(ct.debut?.slice(0,7)||"")+".pdf";
    const{data:existing}=await supabase.from("documents_meta").select("id").eq("storage_path",path).maybeSingle();
    if(existing){
      await supabase.from("documents_meta").update({
        nom:nomDoc,
        categorie:"admin",
        sous_type:"Contrat signe",
      }).eq("id",existing.id);
    }else{
      await supabase.from("documents_meta").insert({
        asmat_id:ct.asmat_id,
        enfant_id:ct.enfant_id,
        nom:nomDoc,
        categorie:"admin",
        sous_type:"Contrat signe",
        storage_path:path,
        partage:true,
        taille:Math.round(blob.size/1024)+" Ko",
      });
    }

    await logAction("generate_contract_pdf",{table_name:"contrats",record_id:contratId});
    return{success:true,path};
  }catch(e){
    return{success:false,error:e.message};
  }
}

//
const PLANCHER_KM_FIN="2026-12-31";

function BottomNav({groups,page,setPage,pmiNonLus,flat,role="asmat"}){
  const activeGroup=findGroup(groups,page);
  const [open,setOpen]=useState(null);
  useEffect(()=>{setOpen(null);},[page]);
  const openGroup=open?groups[open]:null;
  return <>
    {!flat&&open&&openGroup?.subs&&<>
      <div onClick={()=>setOpen(null)} style={{position:"fixed",inset:0,zIndex:98}}/>
      <div style={{
        position:"fixed",left:10,right:10,bottom:"calc(70px + env(safe-area-inset-bottom,0px))",zIndex:99,
        background:"var(--w)",borderRadius:18,boxShadow:"0 -8px 40px rgba(0,0,0,.22)",border:"1px solid var(--br)",
        padding:8,animation:"menuDrop .18s ease",maxHeight:"60vh",overflowY:"auto",
      }}>
        <div style={{fontSize:11,fontWeight:700,color:"var(--l)",textTransform:"uppercase",letterSpacing:".5px",padding:"6px 12px 8px"}}>{openGroup.l}</div>
        {openGroup.subs.map(s=>{
          const on=(PAGE_ALIAS[page]||page)===s.id;
          const hasPmiBadge=s.id==="pmi"&&pmiNonLus>0;
          return <button key={s.id}onClick={()=>{setPage(s.id);setOpen(null);}}style={{
            width:"100%",display:"flex",alignItems:"center",gap:12,padding:"12px 12px",
            borderRadius:12,border:"none",cursor:"pointer",textAlign:"left",
            background:on?"var(--accent-pale)":"transparent",color:on?"var(--accent)":"var(--b)",
            fontWeight:on?700:500,fontSize:14,
          }}>
            <span style={{width:28,display:"flex",justifyContent:"center",flexShrink:0}}><IconeOuEmoji e={s.ic} taille={19}/></span>
            <span style={{flex:1,minWidth:0}}>
              <span style={{display:"block"}}>{s.l}</span>
              {s.d&&<span style={{display:"block",fontSize:11.5,color:"var(--l)",fontWeight:400,marginTop:1,lineHeight:1.4}}>{s.d}</span>}
            </span>
            {hasPmiBadge&&<span style={{background:"var(--R)",color:"#fff",borderRadius:10,padding:"1px 6px",fontSize:11,fontWeight:700}}>{pmiNonLus}</span>}
            {on&&<span style={{color:"var(--S)",fontWeight:700}}>✓</span>}
          </button>;
        })}
      </div>
    </>}
    <nav className="bottom-nav" role="navigation" aria-label="Navigation principale">
      {Object.entries(groups).map(([key,g])=>{
        const isActive=activeGroup===key;
        const isOpen=!flat&&open===key;
        const hasBadge=key==="admin"&&pmiNonLus>0;
        return <button key={key} className={"bnav-btn"+((isActive||isOpen)?" active":"")} onClick={()=>{
          if(g.subs){ if(flat){setPage(g.subs[0].id);} else {setOpen(o=>o===key?null:key);} }
          else{setPage(key);setOpen(null);}
        }}>
          <span className="bnav-ic" style={{position:"relative",display:"inline-flex"}}>
            {g.trace?<Icone nom={g.trace} taille={23}/>:g.ic}
            {hasBadge&&<span style={{position:"absolute",top:-4,right:-6,background:"var(--R)",color:"#fff",borderRadius:"50%",minWidth:17,height:17,padding:"0 4px",fontSize:11,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>{pmiNonLus}</span>}
          </span>
          <span className="bnav-lbl">{g.l}</span>
        </button>;
      })}
    </nav>
  </>;
}


const GROUPS_AM={
  accueil:{l:"Accueil",ic:"🏠",trace:"accueil",color:"var(--B)",subs:null},
  enfant:{l:"L'enfant",ic:"👶",trace:"enfant",color:"var(--T)",subs:[
    {id:"journee",l:"Journée",ic:"📔",d:"Cahier de liaison : repas, sieste, activités"},
    {id:"pointage",l:"Pointage",ic:"⏰",d:"Arrivées, départs et heures effectuées"},
    {id:"suivi_progres",l:"Suivi & Progrès",ic:"📊",d:"Développement et acquisitions de l'enfant"},
    {id:"sante_urgence",l:"Santé & Urgence",ic:"🏥",d:"Fiche d'urgence, allergies, soins"},
    {id:"bilans",l:"Bilans",ic:"✨",d:"Bilans périodiques à partager"},
  ]},
  admin:{l:"Administratif",ic:"🗂️",trace:"admin",color:"var(--P)",subs:[
    {id:"calendrier",l:"Calendrier",ic:"📅",d:"Planning, absences et événements"},
    {id:"messagerie",l:"Messagerie",ic:"💬",d:"Échanges avec les parents"},
    {id:"paie_contrats",l:"Paie & Contrats",ic:"🧾",d:"Bulletins, contrats et déclarations"},
    {id:"documents_rapports",l:"Documents & Rapports",ic:"🗂️",d:"Attestations et exports"},
  ]},
  outils:{l:"Outils Pro",ic:"⭐",trace:"outils",color:"var(--S)",subs:[
    {id:"mode_borne",l:"Borne & QR de pointage",ic:"🚪",d:"Les parents pointent eux-mêmes : écran d'entrée, ou QR affiché au mur"},
    {id:"inviter_parent",l:"Inviter un parent",ic:"👪",d:"Lien de suivi et signature du contrat"},
    {id:"projet_accueil",l:"Projet d'accueil",ic:"🌿",d:"Votre projet pédagogique"},
    {id:"mes_employeurs",l:"Mes employeurs",ic:"👪",d:"Revenus du mois et congés, famille par famille"},
    {id:"temps_travail",l:"Mon temps de travail",ic:"⏰",d:"Tous employeurs confondus, face aux plafonds légaux"},
    {id:"pmi",l:"PMI",ic:"🏛️",d:"Contacts PMI de votre secteur"},
    {id:"mes_alertes",l:"Mes alertes",ic:"🔔",d:"Ce que vous recevez, et sur quels appareils"},
    {id:"faq",l:"Aide & Support",ic:"❓",d:"Guides, questions fréquentes, contact"},
  ]},
};
const GROUPS_P={
  accueil:{l:"Accueil",ic:"🏠",trace:"accueil",color:"var(--T)",subs:null},
  enfant:{l:"Mon enfant",ic:"👶",trace:"enfant",color:"var(--T)",subs:[
    {id:"journee",l:"Journée",ic:"📔",d:"Sa journée : repas, sieste, activités"},
    {id:"pointage",l:"Pointage",ic:"⏰",d:"Heures de présence et absences"},
    {id:"suivi_progres",l:"Suivi & Progrès",ic:"📊",d:"Son développement au quotidien"},
    {id:"sante_urgence",l:"Santé & Urgence",ic:"🏥",d:"Fiche d'urgence et informations santé"},
    {id:"projet_accueil",l:"Projet d'accueil",ic:"🌿",d:"Le projet pédagogique"},
    {id:"bilans",l:"Bilans",ic:"✨",d:"Bilans partagés par l'assistante maternelle"},
  ]},
  admin:{l:"Administratif",ic:"🗂️",trace:"admin",color:"var(--P)",subs:[
    {id:"calendrier",l:"Calendrier",ic:"📅",d:"Planning, absences et événements"},
    {id:"messagerie",l:"Messagerie",ic:"💬",d:"Échanges avec l'assistante maternelle"},
    {id:"aides_simulateurs",l:"Aides & Simulateurs",ic:"💶",d:"CMG et estimation du coût de garde"},
    {id:"admin_finances",l:"Mon contrat",ic:"🧾",d:"Contrat, bulletins et paiements"},
    {id:"documents_complet",l:"Documents & Attestations",ic:"🗂️",d:"Vos documents et attestations"},
    {id:"mes_alertes",l:"Mes alertes",ic:"🔔",d:"Ce que vous recevez, et sur quels appareils"},
    {id:"faq",l:"Centre d'aide",ic:"❓",d:"Guides et contact"},
  ]},
};

// Alias : anciens ids de pages -> nouvel onglet regroupé (pour le surlignage du menu)
const PAGE_ALIAS={cahier_jour:"journee",journal_complet:"journee",dashboard:"suivi_progres",eveil_complet:"suivi_progres",sante_complet:"sante_urgence",fiche_urgence:"sante_urgence",admin_finances:"paie_contrats",ik:"paie_contrats",recap_fiscal:"paie_contrats",documents_complet:"documents_rapports",bilans_exports:"documents_rapports",kit_cmg:"aides_simulateurs",simulateur:"aides_simulateurs",support:"faq"};
// Trouver à quel groupe appartient une page
const findGroup=(groups,pageId)=>{
  const pid=PAGE_ALIAS[pageId]||pageId;
  for(const[gKey,g]of Object.entries(groups)){
    if(gKey===pid)return gKey;
    if(g.subs&&g.subs.find(s=>s.id===pid))return gKey;
  }
  return "accueil";
};

// Une seule action coloree par ecran, et elle n'a pas le meme sens des deux
// cotes : cote parent, une absence est celle de l'enfant ; cote assistante
// maternelle, c'est elle qui pose un conge. La barre proposait « Ajouter une
// absence » a l'assistante maternelle et ouvrait un formulaire qui lui
// annoncait que « votre assmat sera notifiee » ; le parent, lui, n'y avait
// aucun acces. Le calendrier a deja son bouton dans l'ecran des deux cotes :
// « Evenement » a cote du selecteur de vue pour l'assistante maternelle,
// « Declarer une absence » dans l'en-tete pour le parent.
const ACTIONS_ROLE={
  asmat:{
    journee:{ic:"⏰",l:"Pointer maintenant",fn:(setPage)=>setPage("pointage")},
    paie_contrats:{ic:"➕",l:"Nouveau bulletin",fn:()=>window.dispatchEvent(new CustomEvent("timat:action",{detail:"nouveau_bulletin"}))},
    messagerie:{ic:"✉️",l:"Nouveau message",fn:()=>window.dispatchEvent(new CustomEvent("timat:action",{detail:"nouveau_message"}))},
  },
  parent:{},
};
function ActionBar({page,setPage,role}){
  const p=PAGE_ALIAS[page]||page;
  const A=(ACTIONS_ROLE[role]||{})[p];
  if(!A)return null;
  return <div style={{maxWidth:1100,margin:"0 auto",padding:"0 4px 14px",display:"flex",justifyContent:"flex-end"}}>
    <button onClick={()=>A.fn(setPage)} style={{display:"inline-flex",alignItems:"center",gap:8,background:"var(--accent)",color:"#fff",border:"none",borderRadius:12,padding:"12px 22px",fontSize:13,fontWeight:700,cursor:"pointer",boxShadow:"var(--sh-accent)",transition:"transform .12s"}}
      onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"} onMouseLeave={e=>e.currentTarget.style.transform="none"}>
      <IconeOuEmoji e={A.ic} taille={16} couleur="#fff"/>{A.l}
    </button>
  </div>;
}

function TopBar({role,groups,page,setPage,user,onLogout,pmiNonLus,dark,setDark,notifNonLus,notifs,setNotifs,showNotifs,setShowNotifs,setPage2}){
  const activeGroup=findGroup(groups,page);
  const group=groups[activeGroup];
  const subs=group?.subs||null;
  const [subOpen,setSubOpen]=useState(null);
  useEffect(()=>{setSubOpen(null);},[page]);

  const onGroupClick=(key)=>{
    const g=groups[key];
    if(!g.subs){setPage(key);return;}
    if(activeGroup===key)return;
    setPage(g.subs[0].id);
  };

  return <>
    <div className="topbar">
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <img src={logoForRole(user?.role, dark)} alt="TiMat" style={{height:(G?.landing?.logoSizes?.topBar)||28,objectFit:"contain"}} onError={e=>{e.target.outerHTML='<div class="logo">TiMat</div>'}}/>
          <span style={{fontSize:11,color:"var(--l)",fontFamily:"'DM Mono',monospace",letterSpacing:"1px",marginTop:1}}>v3</span>
        </div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:6}}>
        {/* Cloche notifications */}
        <div>
          <button className="ico-btn" aria-label="Notifications" onClick={()=>setShowNotifs&&setShowNotifs(p=>!p)}style={{
            background:"none",border:"none",cursor:"pointer",fontSize:18,padding:4,
            position:"relative",display:"flex",alignItems:"center"
          }}><IconeOuEmoji e="🔔" taille={19}/>
            {notifNonLus>0&&<span style={{
              position:"absolute",top:-2,right:-2,background:"var(--R)",color:"#fff",
              borderRadius:"50%",minWidth:17,height:17,padding:"0 4px",fontSize:11,fontWeight:700,
              display:"flex",alignItems:"center",justifyContent:"center"
            }}>{notifNonLus}</span>}
          </button>
          {showNotifs&&<div style={{
            position:"absolute",right:12,top:"100%",marginTop:8,
            background:"var(--w)",borderRadius:14,boxShadow:"var(--sh2)",
            border:"1px solid var(--br)",width:"min(280px,calc(100vw - 24px))",maxWidth:280,zIndex:200,
            overflow:"hidden",maxHeight:"min(70vh,420px)",overflowY:"auto"
          }}>
            <div style={{padding:"12px 16px",borderBottom:"1px solid var(--br)",fontWeight:700,fontSize:13,color:"var(--b)"}}>
              <IconeOuEmoji e="🔔"/> Notifications
            </div>
            {notifs.filter(n=>!n.roles||n.roles.includes(role)).map(n=><div key={n.id}onClick={()=>{
              setNotifs&&setNotifs(p=>p.map(x=>x.id===n.id?{...x,lu:true}:x));
              if(!n.lu)supabase.from("notifications").update({lu:true}).eq("id",n.id).then(()=>{}).catch(()=>{});
              setPage2&&setPage2(n.page);
              setShowNotifs&&setShowNotifs(false);
            }}style={{
              padding:"10px 16px",borderBottom:"1px solid var(--br)",cursor:"pointer",
              background:n.lu?"transparent":"var(--Tp)",
              transition:"background .15s",display:"flex",gap:10,alignItems:"flex-start"
            }}
              onMouseEnter={e=>e.currentTarget.style.background="var(--c)"}
              onMouseLeave={e=>e.currentTarget.style.background=n.lu?"transparent":"var(--Tp)"}>
              <span style={{fontSize:16,flexShrink:0}}><IconeOuEmoji e={n.ic}/></span>
              <div style={{flex:1}}>
                <div style={{fontSize:12,color:"var(--b)",fontWeight:n.lu?400:700,lineHeight:1.4}}>{n.txt}</div>
                <div style={{fontSize:11,color:"var(--l)",marginTop:2}}>Aujourd'hui</div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0,marginTop:2}}>
                {!n.lu&&<div style={{width:7,height:7,borderRadius:"50%",background:"var(--T)"}}/>}
                <button onClick={e=>{e.stopPropagation();setNotifs&&setNotifs(p=>p.filter(x=>x.id!==n.id));supabase.from("notifications").delete().eq("id",n.id).then(()=>{}).catch(()=>{});}}title="Supprimer"style={{background:"none",border:"none",cursor:"pointer",color:"var(--l)",fontSize:13,lineHeight:1,padding:2}}>✕</button>
              </div>
            </div>)}
            {notifs.filter(n=>!n.roles||n.roles.includes(role)).length>0&&<div onClick={()=>{const ids=notifs.map(x=>x.id);setNotifs&&setNotifs([]);supabase.from("notifications").delete().in("id",ids).then(()=>{}).catch(()=>{});}}style={{padding:"11px 16px",textAlign:"center",fontSize:12,fontWeight:700,color:"#C84B31",cursor:"pointer",borderTop:"1px solid var(--br)"}}><IconeOuEmoji e="🗑️"/> Tout effacer</div>}
            {notifs.length===0&&<div style={{padding:16,fontSize:13,color:"var(--l)",textAlign:"center"}}>Aucune notification</div>}
          </div>}
        </div>
        {/* Toggle mode sombre */}
        <button className="ico-btn" style={{display:"inline-flex",alignItems:"center"}} title={dark?"Mode clair":"Mode sombre"} aria-label={dark?"Mode clair":"Mode sombre"} onClick={()=>setDark&&setDark(d=>!d)}><IconeOuEmoji e={dark?"☀️":"🌙"} taille={19}/></button>
        {/* Paramètres */}
        <button className="ico-btn" onClick={()=>setPage2&&setPage2("parametres")}style={{display:"inline-flex",alignItems:"center"}}title="Paramètres" aria-label="Paramètres"><IconeOuEmoji e="⚙️" taille={19}/></button>
        {/* Bouton admin retire : le backoffice est desormais sur la route dediee /backoffice */}
        <Av t={ini(user.prenom,user.nom)}c={user.couleur}s={30}/>
        <span style={{fontWeight:600,fontSize:13,color:"var(--b)"}}>{user.prenom}</span>
        <button className="ico-btn" onClick={onLogout}style={{display:"inline-flex",alignItems:"center"}}title="Déconnexion" aria-label="Déconnexion"><IconeOuEmoji e="🚪" taille={19}/></button>
      </div>
    </div>

    {/* Barre principale - onglets avec menu déroulant intégré */}
    <div className="nav-main"style={{
      background:"rgba(255,255,255,.95)",backdropFilter:"blur(20px)",
      borderBottom:"1px solid rgba(234,224,232,.6)",
      display:"flex",gap:6,padding:"0 20px",height:52,alignItems:"center",position:"relative",zIndex:120,
    }}>
      {subOpen&&<div onClick={()=>setSubOpen(null)} style={{position:"fixed",inset:0,zIndex:1}}/>}
      {Object.entries(groups).map(([key,g])=>{
        const isActive=activeGroup===key;
        const isOpen=subOpen===key;
        const hasAdminBadge=key==="admin"&&pmiNonLus>0;
        return <div key={key} style={{position:"relative",zIndex:2,flexShrink:0}}>
          <button onClick={()=>{ if(g.subs){setSubOpen(o=>o===key?null:key);} else {setPage(key);setSubOpen(null);} }}style={{
            display:"flex",alignItems:"center",gap:7,
            padding:"8px 18px",borderRadius:24,border:"none",
            fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:13,
            cursor:"pointer",transition:"all .2s cubic-bezier(.34,1.56,.64,1)",
            whiteSpace:"nowrap",
            background:(isActive||isOpen)?"linear-gradient(135deg,var(--T),var(--S))":"rgba(155,107,170,.08)",
            color:(isActive||isOpen)?"#fff":"var(--m)",
            boxShadow:(isActive||isOpen)?"0 4px 16px rgba(144,160,147,.3)":"none",
            transform:(isActive||isOpen)?"scale(1.03)":"scale(1)",
            letterSpacing:".1px",position:"relative",
          }}>
            <IconeOuEmoji e={g.ic}/>
            <span>{g.l}</span>
            {g.subs&&<span style={{fontSize:11,opacity:.6,marginLeft:2,transform:isOpen?"rotate(180deg)":"rotate(0)",display:"inline-block",transition:"transform .2s"}}>▼</span>}
            {hasAdminBadge&&<span style={{
              position:"absolute",top:4,right:4,background:"var(--R)",color:"#fff",
              borderRadius:"50%",minWidth:18,height:18,padding:"0 4px",fontSize:11,fontWeight:700,
              display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 1px 4px rgba(0,0,0,.3)",
            }}>{pmiNonLus}</span>}
          </button>
          {isOpen&&g.subs&&<div style={{
            position:"absolute",top:"100%",left:0,marginTop:8,background:"var(--w)",
            borderRadius:14,boxShadow:"0 18px 48px rgba(0,0,0,.22)",border:"1px solid var(--br)",
            zIndex:130,minWidth:250,overflow:"hidden",padding:6,animation:"menuDrop .18s ease",
          }}>
            {g.subs.map(s=>{
              const on=(PAGE_ALIAS[page]||page)===s.id;
              const hasPmiBadge=s.id==="pmi"&&pmiNonLus>0;
              return <button key={s.id}onClick={()=>{setPage(s.id);setSubOpen(null);}}style={{
                width:"100%",display:"flex",alignItems:"center",gap:12,padding:"11px 12px",
                borderRadius:11,border:"none",cursor:"pointer",textAlign:"left",
                background:on?"var(--accent-pale)":"transparent",color:on?"var(--accent)":"var(--b)",
                fontWeight:on?700:500,fontSize:13.5,transition:"background .15s",
              }}
                onMouseEnter={e=>{if(!on)e.currentTarget.style.background="var(--c)";}}
                onMouseLeave={e=>{if(!on)e.currentTarget.style.background="transparent";}}>
                <span style={{width:26,display:"flex",justifyContent:"center",flexShrink:0}}><IconeOuEmoji e={s.ic} taille={18}/></span>
                <span style={{flex:1,minWidth:0}}>
                  <span style={{display:"block"}}>{s.l}</span>
                  {s.d&&<span style={{display:"block",fontSize:11,color:"var(--l)",fontWeight:400,marginTop:1,lineHeight:1.4}}>{s.d}</span>}
                </span>
                {hasPmiBadge&&<span style={{background:"var(--R)",color:"#fff",borderRadius:10,padding:"1px 6px",fontSize:11,fontWeight:700}}>{pmiNonLus}</span>}
                {on&&<span style={{color:"var(--S)",fontWeight:700}}>✓</span>}
              </button>;
            })}
          </div>}
        </div>;
      })}
    </div>

  </>;
}



function HeroPhone({screen}){
  const pool=[
    {ic:"✅",t:"Bulletin de salaire généré"},
    {ic:"💶",t:"Salaire calculé automatiquement"},
    {ic:"📩",t:"Parent notifié"},
    {ic:"⏰",t:"Pointage enregistré"},
    {ic:"📄",t:"Déclaration Pajemploi prête"},
    {ic:"💬",t:"Nouveau message du parent"},
    {ic:"🗓️",t:"Absence ajoutée au planning"},
    {ic:"🧾",t:"Indemnités calculées"},
    {ic:"✍️",t:"Contrat signé en 1 clic"},
  ];
  const slots=[{top:"6%",left:"-6%",d:"0s"},{top:"44%",left:"52%",d:"1.4s"},{top:"80%",left:"-4%",d:"2.8s"}];
  return <div className="hero-phone-wrap" style={{position:"relative",width:230,height:466}}>
    {/* halo */}
    <div style={{position:"absolute",inset:"6% 4%",borderRadius:"50%",background:"radial-gradient(closest-side,rgba(228,145,120,.55),transparent)",filter:"blur(26px)",animation:"glowpulse 4s ease-in-out infinite"}}/>
    {/* telephone flottant */}
    <div style={{position:"relative",width:230,height:466,animation:"floaty 5s ease-in-out infinite"}}>
      <div style={{position:"absolute",inset:0,background:"#0D1B2A",borderRadius:38,padding:"12px 11px",boxShadow:"0 40px 90px rgba(0,0,0,.45)"}}>
        <div style={{position:"absolute",top:20,left:"50%",transform:"translateX(-50%)",width:70,height:5,borderRadius:3,background:"rgba(255,255,255,.25)",zIndex:2}}/>
        <div style={{width:"100%",height:"100%",background:"#FDFBF8",borderRadius:28,overflow:"hidden",display:"flex",flexDirection:"column"}}>
          {screen
          ? <div style={{zoom:.6,width:"100%",height:"100%",overflow:"hidden"}}>{screen}</div>
          : <>
          {/* header */}
          <div style={{padding:"18px 16px 12px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <span style={{fontFamily:"'Fraunces',serif",fontWeight:700,fontSize:20,color:"#E49178"}}>timat</span>
            <span style={{width:26,height:26,borderRadius:"50%",background:"#E49178",color:"#fff",fontSize:11,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>MD</span>
          </div>
          {/* carte du jour */}
          <div style={{margin:"4px 12px",background:"linear-gradient(135deg,#2E4859,#3E6B63)",borderRadius:16,padding:14,color:"#fff"}}>
            <div style={{fontSize:11,opacity:.7,fontWeight:600}}>AUJOURD'HUI</div>
            <div style={{fontSize:16,fontWeight:700,fontFamily:"'Fraunces',serif",marginTop:2}}>3 enfants présents</div>
            <div style={{display:"flex",gap:6,marginTop:10}}>
              {["👶","🧒","👧"].map((e,i)=><span key={i}style={{width:30,height:30,borderRadius:"50%",background:"rgba(255,255,255,.18)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>{e}</span>)}
            </div>
          </div>
          {/* mini lignes */}
          {[["⏰","Pointage","à jour"],["💶","Salaire du mois","calculé"],["📄","Déclaration Pajemploi","prête"]].map(([ic,a,b],i)=>
            <div key={i}style={{margin:"8px 12px 0",background:"#fff",border:"1px solid #EFE7DF",borderRadius:12,padding:"10px 12px",display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:17}}><IconeOuEmoji e={ic}/></span>
              <span style={{flex:1,fontSize:12,color:"#2E4859",fontWeight:600}}>{a}</span>
              <span style={{fontSize:11,color:"#5DA9A1",fontWeight:700,background:"#5DA9A118",padding:"2px 8px",borderRadius:8}}>{b}</span>
            </div>
          )}
          </>}
        </div>
      </div>
    </div>
    {/* notifications qui sortent et changent a chaque cycle */}
    {slots.map((s,i)=>{return (
      <NotifBulle key={i} slot={s} pool={pool} i={i}/>);})}
  </div>;
}

function NotifBulle({slot,pool,i}){
  const [idx,setIdx]=useState(i);
  useEffect(()=>{
    const delayMs=(parseFloat(slot.d)||0)*1000;
    let iv;const t0=setTimeout(()=>{setIdx(x=>x+3);iv=setInterval(()=>setIdx(x=>x+3),4200);},delayMs+4200);
    return()=>{clearTimeout(t0);if(iv)clearInterval(iv);};
  },[]);
  const n=pool[idx%pool.length];
  return (
      <div className={"lp-bulle-"+i} style={{position:"absolute",top:slot.top,left:slot.left,width:158,background:"#fff",borderRadius:12,padding:"8px 12px",boxShadow:"0 12px 32px rgba(13,27,42,.22)",display:"flex",alignItems:"center",gap:8,zIndex:4,opacity:0,animation:"notifpop 4.2s ease-in-out infinite",animationDelay:slot.d,animationFillMode:"backwards"}}>
        <span style={{fontSize:15,flexShrink:0}}><IconeOuEmoji e={n.ic}/></span>
        {/* Une largeur fixe et un retour à la ligne autorisé : « Salaire calculé
            automatiquement » débordait de sa carte, la phrase sortait du blanc. */}
        <span style={{fontSize:11.5,fontWeight:700,color:"#2E4859",lineHeight:1.25,minWidth:0}}>{n.t}</span>
      </div>
  );
}

// Une bande de photo entre deux sections. Elle respire, elle ne raconte rien :
// c'est une respiration entre deux blocs de texte, pas une illustration.
//
// Le cadrage n'est pas décoratif, c'est la contrainte : aucune photo ne doit
// montrer un visage net d'enfant. Chaque image a donc son propre point de
// coupe, choisi là où il n'y a ni visage ni regard — le bas du tapis pour
// l'une, sous les épaules pour l'autre. Changer ce point, c'est refaire ce
// choix, pas ajuster une esthétique.
function BandeauPhoto({src, alt, position, order}){
  return (
    <div className="lp-bandeau" style={{ order, display:"block", lineHeight:0, background:"#2E4859" }}>
      <img src={src} alt={alt} width="1600" height="1067" loading="lazy" decoding="async"
        style={{ width:"100%", objectFit:"cover", objectPosition:position, display:"block" }}/>
    </div>
  );
}

function WaveDivider({color="#fff",height=52,on=true}){
  if(!on)return null;
  return <div aria-hidden="true" style={{position:"absolute",top:0,left:0,right:0,lineHeight:0,transform:"translateY(-99%)",pointerEvents:"none",zIndex:1}}>
    <svg viewBox="0 0 1200 100" preserveAspectRatio="none" style={{display:"block",width:"100%",height:height}}>
      <path d="M0,100 C220,25 430,92 620,55 C820,16 1010,82 1200,42 L1200,100 L0,100 Z" fill={color}/>
    </svg>
  </div>;
}

function FadeIn({children,delay=0,className=""}){
  const ref=useRef(null);
  const [visible,setVisible]=useState(false);
  useEffect(()=>{
    const obs=new IntersectionObserver(([e])=>{if(e.isIntersecting)setVisible(true);},{threshold:0.1});
    if(ref.current)obs.observe(ref.current);
    return()=>obs.disconnect();
  },[]);
  return(
    <div ref={ref}className={className}style={{
      opacity:visible?1:0,
      transform:visible?"translateY(0)":"translateY(32px)",
      transition:"opacity 0.7s ease "+delay+"ms, transform 0.7s ease "+delay+"ms",
    }}>{children}</div>
  );
}

//
const DEMO_SCREENS=[
  {
    id:"journal",label:"Journal",icon:"📋",color:"#5DA9A1",
    preview:()=>{
      const [mood,setMood]=useState("😊");
      const [liked,setLiked]=useState(false);
      return(
      <div style={{padding:20,fontFamily:"system-ui"}}>
        <div style={{fontSize:13,fontWeight:700,color:"#2E4859",marginBottom:12}}><IconeOuEmoji e="📋"/> Journal du jour — Léo 🦁</div>
        <div style={{background:"#F0FAF4",borderRadius:10,padding:12,marginBottom:8,borderLeft:"3px solid #5DA9A1"}}>
          <div style={{fontSize:11,color:"#5DA9A1",fontWeight:700,marginBottom:3}}>👩👧 Marie · 11h30</div>
          <div style={{fontSize:12,color:"#2E4859",lineHeight:1.6}}>Léo a découvert la peinture avec les doigts ce matin ! Il a réalisé un tableau qu'il a voulu offrir à sa maman. 🎨</div>
          <div style={{display:"flex",justifyContent:"flex-end",marginTop:6}}>
            <button onClick={()=>setLiked(!liked)}style={{background:"none",border:"none",cursor:"pointer",fontSize:15,transition:"transform .2s",transform:liked?"scale(1.3)":"scale(1)"}}><IconeOuEmoji e={liked?"❤️":"🤍"}/></button>
          </div>
        </div>
        <div style={{background:"#FFF8F3",borderRadius:10,padding:12,borderLeft:"3px solid #E49178"}}>
          <div style={{fontSize:11,color:"#E49178",fontWeight:700,marginBottom:3}}><IconeOuEmoji e="🍽️"/> Repas</div>
          <div style={{fontSize:12,color:"#2E4859"}}><IconeOuEmoji e="🥗"/> Purée de légumes · <PastilleRepas q="bien" taille={11}/> · <IconeOuEmoji e="🍼"/> 250ml</div>
        </div>
        <div style={{marginTop:12,display:"flex",gap:6,alignItems:"center"}}>
          <span style={{fontSize:11,color:"#8FA3AD"}}>Humeur :</span>
          {["😊","😴","🤗","😢"].map(m=><button key={m}onClick={()=>setMood(m)}style={{
            fontSize:18,background:mood===m?"#F0FAF4":"transparent",border:mood===m?"1.5px solid #5DA9A1":"1.5px solid transparent",
            borderRadius:8,padding:"2px 6px",cursor:"pointer",transition:"all .15s"
          }}>{m}</button>)}
        </div>
      </div>);
    },
  },
  {
    id:"facturation",label:"Salaire",icon:"🧮",color:"#E49178",
    preview:()=>{
      const [mois,setMois]=useState("Mars");
      const data={Mars:{h:160,supp:8,ent:20},Fev:{h:152,supp:4,ent:19},Jan:{h:168,supp:12,ent:21}};
      const m=data[mois]||data.Mars;
      const brut=(m.h*4.20+m.supp*5.25+m.ent*3.80);
      return(
      <div style={{padding:20,fontFamily:"system-ui"}}>
        <div style={{fontSize:13,fontWeight:700,color:"#2E4859",marginBottom:12}}><IconeOuEmoji e="💰"/> Salaire — Léo 🦁</div>
        <div style={{display:"flex",gap:4,marginBottom:12}}>
          {["Jan","Fev","Mars"].map(mo=><button key={mo}onClick={()=>setMois(mo)}style={{
            padding:"5px 12px",borderRadius:8,border:"none",cursor:"pointer",fontSize:11,fontWeight:600,
            background:mois===mo?"#E49178":"#F4F7FA",color:mois===mo?"#fff":"#2E4859",transition:"all .15s"
          }}>{mo} 2024</button>)}
        </div>
        {[["Heures réalisées",m.h+"h × 4,20€",nbf((m.h*4.20),2)+"€"],["Indemnité entretien",m.ent+"j × 3,80€",nbf((m.ent*3.80),2)+"€"],["Heures majorées",m.supp+"h × 5,06€",nbf((m.supp*5.06),2)+"€"]].map(([l,d,v])=>(
          <div key={l}style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #E8E4E0",fontSize:12}}>
            <div><div style={{fontWeight:600,color:"#2E4859"}}>{l}</div><div style={{fontSize:11,color:"#8FA3AD"}}>{d}</div></div>
            <div style={{fontWeight:700,color:"#5DA9A1"}}>{v}</div>
          </div>
        ))}
        <div style={{marginTop:10,padding:"10px 12px",background:"#FFF8F3",borderRadius:10,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontSize:13,fontWeight:700,color:"#2E4859"}}>Total brut</span>
          <span style={{fontSize:20,fontWeight:700,color:"#E49178"}}>{nbf(brut,2)} €</span>
        </div>
      </div>);
    },
  },
  {
    id:"calendrier",label:"Calendrier",icon:"📅",color:"#2E4859",
    preview:()=>{
      const [selDay,setSelDay]=useState(15);
      return(
      <div style={{padding:20,fontFamily:"system-ui"}}>
        <div style={{fontSize:13,fontWeight:700,color:"#2E4859",marginBottom:12}}><IconeOuEmoji e="📅"/> {new Date().toLocaleDateString('fr-FR',{month:'long',year:'numeric'}).replace(/^./,c=>c.toUpperCase())}</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:12}}>
          {["L","M","Me","J","V","S","D"].map(j=><div key={j}style={{textAlign:"center",fontSize:11,fontWeight:700,color:"#8FA3AD",padding:4}}>{j}</div>)}
          {Array.from({length:31},(_,i)=>i+1).map(d=>{
            const isWork=d%7!==0&&d%7!==6;
            return <div key={d}onClick={()=>setSelDay(d)}style={{
              textAlign:"center",fontSize:11,padding:"6px 0",borderRadius:8,cursor:"pointer",fontWeight:selDay===d?700:400,
              background:selDay===d?"#2E4859":isWork?"#F0FAF4":"transparent",
              color:selDay===d?"#fff":isWork?"#2E4859":"#B0BEC5",
              border:d===15?"2px solid #E49178":"2px solid transparent",transition:"all .15s"
            }}>{d}</div>;
          })}
        </div>
        {selDay&&<div style={{background:"#F4F7FA",borderRadius:10,padding:10,fontSize:11,color:"#2E4859"}}>
          <div style={{fontWeight:700,marginBottom:4}}><IconeOuEmoji e="📌"/> {selDay} mars</div>
          <div style={{display:"flex",alignItems:"center",gap:6}}>🦁 Léo : 07h30 — 17h30
            {selDay%7!==0&&selDay%7!==6?<IconeOuEmoji e="✅" taille={14}/>:<><Pastille couleur="var(--R)"/> Repos</>}</div>
          {selDay%3===0&&<div>🌸 Emma : 08h00 — 16h30 ✅</div>}
        </div>}
      </div>);
    },
  },
  {
    id:"parent",label:"Parents",icon:"👪",color:"#C84B31",
    preview:()=>{
      const [valide,setValide]=useState(false);
      return(
      <div style={{padding:20,fontFamily:"system-ui"}}>
        <div style={{fontSize:13,fontWeight:700,color:"#2E4859",marginBottom:12}}><IconeOuEmoji e="👪"/> Sophie — Léo 🦁</div>
        <div style={{background:"#FFF8F3",borderRadius:10,padding:12,marginBottom:8,border:"1px solid #FFD6B3"}}>
          <div style={{fontSize:11,color:"#C84B31",fontWeight:700,marginBottom:4}}>⏰ Pointage du jour</div>
          <div style={{display:"flex",gap:16}}>
            {[["Arrivée","07h35","#5DA9A1"],["Départ","17h20","#C84B31"],["Total","9h45","#2E4859"]].map(([l,v,c])=>(
              <div key={l}style={{textAlign:"center"}}><div style={{fontSize:11,color:"#8FA3AD"}}>{l}</div><div style={{fontSize:16,fontWeight:700,color:c}}>{v}</div></div>
            ))}
          </div>
          <button onClick={()=>setValide(!valide)}style={{
            marginTop:8,width:"100%",padding:"7px",borderRadius:8,border:"none",cursor:"pointer",fontSize:11,fontWeight:700,
            background:valide?"#5DA9A1":"#F4F7FA",color:valide?"#fff":"#2E4859",transition:"all .2s"
          }}>{valide?"✅ Pointage validé":"Valider le pointage"}</button>
        </div>
        <div style={{background:"#F0FAF4",borderRadius:10,padding:10,fontSize:12,color:"#2E4859",lineHeight:1.5}}>
          <IconeOuEmoji e="📋"/> Léo a peint un tableau et l'a offert à sa maman ! 🎨
        </div>
      </div>);
    },
  },
];

//

// P32-3b : rendu du corps d'article par blocs structurés
function fmtInline(text){
  if(text==null) return null;
  const parts=[]; let rest=String(text); let key=0; const re=/(\*\*([^*]+)\*\*|\*([^*]+)\*)/;
  let m;
  while((m=re.exec(rest))){
    if(m.index>0) parts.push(rest.slice(0,m.index));
    if(m[2]!==undefined) parts.push(<strong key={key++}>{m[2]}</strong>);
    else parts.push(<em key={key++}>{m[3]}</em>);
    rest=rest.slice(m.index+m[0].length);
  }
  if(rest) parts.push(rest);
  return parts;
}
function ParentInvitationScreen({onLogin,initialMode="inscription"}){
  const [mode,setMode]=useState(initialMode);
  const [form,setForm]=useState({email:"",password:"",prenom:"",nom:""});
  const [err,setErr]=useState("");
  // AUTH UX P16 - meme traitement que la landing : compte existant actionnable + reinitialisation
  const [errAction,setErrAction]=useState(null);
  const [resetInfo,setResetInfo]=useState("");
  const envoyerReset=async()=>{
    const mail=(form.email||"").trim();
    if(!mail){setErr("Saisis d'abord ton email.");return;}
    setLoading(true);
    try{
      await supabase.auth.resetPasswordForEmail(mail,{redirectTo:window.location.origin});
      setErr("");setErrAction(null);
      setResetInfo("Si un compte existe pour "+mail+", un lien de connexion vient d'être envoyé. Pense à vérifier tes spams.");
    }catch(e){setErr("Envoi impossible pour le moment.");}
    setLoading(false);
  };
  const [loading,setLoading]=useState(false);
  const [consent,setConsent]=useState(false);

  useEffect(()=>{ try{const tk=new URLSearchParams(window.location.search).get("invite"); if(tk)localStorage.setItem("timat:invite",tk);}catch(e){} },[]);

  const claim=async()=>{
    try{
      const tk=new URLSearchParams(window.location.search).get("invite")||(()=>{try{return localStorage.getItem("timat:invite");}catch(e){return null;}})();
      if(tk&&tk.length>20){ await supabase.rpc("claim_invite_token",{p_token:tk}); try{localStorage.removeItem("timat:invite");}catch(e){} }
      await supabase.rpc("claim_invitations");
    }catch(e){}
  };

  const connexion=async()=>{
    if(!form.email||!form.password){setErr("Email et mot de passe requis.");return;}
    setLoading(true);setErr("");
    try{
      const{data,error}=await supabase.auth.signInWithPassword({email:form.email,password:form.password});
      if(error){setErr("Email ou mot de passe incorrect.");setErrAction("reset");}
      else if(data?.user){ await claim(); onLogin({id:data.user.id,email:data.user.email,prenom:data.user.user_metadata?.prenom||"Parent",nom:data.user.user_metadata?.nom||"",role:data.user.user_metadata?.role||"parent",couleur:COULEUR_ROLE.parent,subscription_status:"free"}); }
    }catch(e){setErr("Erreur réseau. Vérifiez votre connexion.");}
    setLoading(false);
  };

  const inscription=async()=>{
    if(!form.email||!form.password||!form.prenom){setErr("Remplis tous les champs obligatoires.");return;}
    const pbMdp=verifierMotDePasse(form.password); if(pbMdp){setErr(pbMdp);return;}
    const fuite=await motDePasseCompromis(form.password);
    if(fuite.verifie&&fuite.occurrences>0){setErr(messageMotDePasseFuite(fuite.occurrences));return;}
    if(!consent){setErr("Accepte la politique de confidentialité et les CGU pour continuer.");return;}
    setLoading(true);setErr("");
    try{
      const{data,error}=await supabase.auth.signUp({email:form.email,password:form.password,options:{data:{prenom:form.prenom,nom:form.nom,role:"parent"}}});
      if(error){
        const _m=(error.message||"").toLowerCase();
        if(_m.includes('already registered')||_m.includes('already been registered')||_m.includes('already exists')||error.code==='user_already_exists'){
          setErr("Un compte existe déjà avec cet email.");setErrAction("connexion");
        }
        else setErr(error.message||"Erreur lors de l'inscription.");
      }else if(data?.user){
        setTimeout(async()=>{try{await supabase.from('profiles').upsert({id:data.user.id,email:data.user.email,prenom:form.prenom,nom:form.nom||'',role:"parent",couleur:COULEUR_ROLE.parent,...abonnementInitial("parent")},{onConflict:'id'});}catch(e){}},500);
        await claim();
        try{if(typeof logConsent==="function")logConsent(data.user.id,{politique:true,cgu:true,newsletter:false});}catch(e){}
        onLogin({id:data.user.id,email:data.user.email,prenom:form.prenom,nom:form.nom,role:"parent",couleur:COULEUR_ROLE.parent});
      }
    }catch(e){setErr("Erreur lors de l'inscription.");}
    setLoading(false);
  };

  const inp={width:"100%",padding:"12px 14px",borderRadius:10,border:"1.5px solid rgba(255,255,255,.5)",fontSize:14,marginBottom:10,fontFamily:"inherit",boxSizing:"border-box",background:"rgba(255,255,255,.95)",color:"#2E4A5A"};

  return <div style={{position:"fixed",inset:0,overflow:"auto",display:"flex",alignItems:"center",justifyContent:"center",padding:20,background:"linear-gradient(160deg,#2E4A5A 0%,#3E6F74 36%,#5DA9A1 60%,#90A093 82%,#E0A081 100%)"}}>
    <div style={{position:"absolute",inset:0,backdropFilter:"blur(2px)",background:"radial-gradient(circle at 30% 20%,rgba(255,255,255,.25),transparent 42%),radial-gradient(circle at 80% 80%,rgba(255,255,255,.14),transparent 42%)"}}/>
    <div style={{position:"relative",width:"100%",maxWidth:420,background:"rgba(255,255,255,.2)",backdropFilter:"blur(18px)",WebkitBackdropFilter:"blur(18px)",border:"1px solid rgba(255,255,255,.4)",borderRadius:24,padding:"30px 26px",boxShadow:"0 20px 60px rgba(0,0,0,.28)"}}>
      <div style={{textAlign:"center",marginBottom:18}}>
        <img src="/logo.webp" alt="TiMat" style={{height:46,marginBottom:10}}/>
        <div style={{fontSize:21,fontWeight:700,color:"#fff",fontFamily:"'Fraunces',Georgia,serif"}}>Bienvenue sur TiMat</div>
        <div style={{fontSize:13,color:"rgba(255,255,255,.92)",marginTop:6,lineHeight:1.5}}>{mode==="inscription"?"Votre assistante maternelle vous a invité·e. Créez votre espace parent pour suivre le quotidien de votre enfant.":"Connectez-vous à votre espace parent."}</div>
      </div>

      {mode==="inscription"&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <input placeholder="Prénom *" value={form.prenom} onChange={e=>setForm({...form,prenom:e.target.value})} style={inp}/>
        <input placeholder="Nom" value={form.nom} onChange={e=>setForm({...form,nom:e.target.value})} style={inp}/>
      </div>}
      <input type="email" placeholder="Email *" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} style={inp}/>
      <input type="password" placeholder="Mot de passe *" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} onKeyDown={e=>{if(e.key==="Enter")(mode==="inscription"?inscription:connexion)();}} style={inp}/>

      {mode==="inscription"&&<label style={{display:"flex",gap:8,alignItems:"flex-start",fontSize:11.5,color:"rgba(255,255,255,.92)",margin:"4px 0 12px",cursor:"pointer",lineHeight:1.5}}>
        <input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} style={{marginTop:2}}/>
        <span>J'accepte la politique de confidentialité et les conditions générales d'utilisation.</span>
      </label>}

      {resetInfo&&<div style={{background:"rgba(93,169,161,.95)",color:"#fff",fontSize:12.5,padding:"9px 12px",borderRadius:10,marginBottom:12,lineHeight:1.5}}><IconeOuEmoji e="✉️"/> {resetInfo}</div>}
      {err&&<div style={{background:"rgba(200,75,49,.92)",color:"#fff",fontSize:12.5,padding:"9px 12px",borderRadius:10,marginBottom:12,lineHeight:1.5}}>
        {err}
        {errAction==="connexion"&&<>
          <button type="button" onClick={()=>{setMode("connexion");setErr("");setErrAction(null);}} style={{display:"block",width:"100%",marginTop:9,background:"#fff",color:"#C84B31",border:"none",borderRadius:10,padding:"9px 12px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Se connecter avec cet email →</button>
          {/@(gmail|googlemail)\.com\s*$/i.test(form.email||"")&&<div style={{marginTop:9,fontSize:11,lineHeight:1.5,opacity:.95}}><IconeOuEmoji e="💡"/> Avec Gmail, les points sont ignorés : <b>prenom.nom@gmail.com</b> et <b>prenomnom@gmail.com</b> reçoivent les mêmes emails, mais forment deux comptes différents ici.</div>}
        </>}
        {errAction==="reset"&&<button type="button" onClick={envoyerReset} style={{display:"block",width:"100%",marginTop:9,background:"transparent",color:"#fff",border:"1.5px solid #fff",borderRadius:10,padding:"9px 12px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Mot de passe oublié ? Recevoir un lien</button>}
      </div>}
      {mode==="connexion"&&errAction!=="reset"&&<div style={{textAlign:"right",marginTop:-4,marginBottom:12}}><button type="button" onClick={envoyerReset} style={{background:"none",border:"none",color:"#fff",fontSize:12,fontWeight:600,textDecoration:"underline",cursor:"pointer",fontFamily:"inherit",padding:0,opacity:.9}}>Mot de passe oublié ?</button></div>}

      <button onClick={mode==="inscription"?inscription:connexion} disabled={loading} style={{width:"100%",padding:"13px",borderRadius:12,border:"none",cursor:"pointer",background:"#fff",color:"#2E4A5A",fontSize:15,fontWeight:700,fontFamily:"inherit",boxShadow:"0 6px 18px rgba(0,0,0,.18)"}}>
        {loading?"…":(mode==="inscription"?"Créer mon espace parent":"Se connecter")}
      </button>

      <div style={{textAlign:"center",marginTop:16,fontSize:13,color:"rgba(255,255,255,.92)"}}>
        {mode==="inscription"?<>Déjà un compte ? <button onClick={()=>{setMode("connexion");setErr("");setErrAction(null);setResetInfo("");}} style={{background:"none",border:"none",color:"#fff",fontWeight:700,textDecoration:"underline",cursor:"pointer",fontFamily:"inherit",fontSize:13}}>Se connecter</button></>
          :<>Pas encore de compte ? <button onClick={()=>{setMode("inscription");setErr("");setErrAction(null);setResetInfo("");}} style={{background:"none",border:"none",color:"#fff",fontWeight:700,textDecoration:"underline",cursor:"pointer",fontFamily:"inherit",fontSize:13}}>S'inscrire</button></>}
      </div>
      <div style={{textAlign:"center",marginTop:14}}>
        <a href="/?site=1" style={{fontSize:12.5,color:"rgba(255,255,255,.8)",textDecoration:"none"}}>← Découvrir TiMat</a>
      </div>
    </div>
  </div>;
}

function ScrollTopBtn(){
  const [show,setShow]=useState(false);
  useEffect(()=>{
    const onScroll=()=>{
      const st=window.scrollY||document.documentElement.scrollTop||0;
      const max=(document.documentElement.scrollHeight-window.innerHeight)||1;
      setShow(st>max*0.28);
    };
    window.addEventListener("scroll",onScroll,{passive:true});
    onScroll();
    return()=>window.removeEventListener("scroll",onScroll);
  },[]);
  return <button aria-label="Remonter en haut" onClick={()=>window.scrollTo({top:0,behavior:"smooth"})}
    style={{position:"fixed",right:18,bottom:"calc(90px + env(safe-area-inset-bottom,0px))",zIndex:300,width:48,height:48,borderRadius:"50%",border:"none",cursor:"pointer",background:"linear-gradient(135deg,#90A093,#5F7360)",color:"#fff",fontSize:21,fontWeight:700,boxShadow:"0 8px 26px rgba(95,115,96,.42)",display:"flex",alignItems:"center",justifyContent:"center",opacity:show?1:0,transform:show?"translateY(0) scale(1)":"translateY(18px) scale(.8)",pointerEvents:show?"auto":"none",transition:"opacity .25s ease, transform .25s ease"}}>↑</button>;
}

// Le composant OutilsGratuits (mensualisation, salaire net/brut, indemnites
// d'entretien, CMG) vivait ici sur 263 lignes, sans qu'aucun chemin ne puisse
// l'afficher : son etat showOutils n'etait jamais mis a true, et l'entree
// « Outils gratuits » de la navigation ouvre /outils.html, la page statique.
// Il portait encore le plancher CMG perime et 27,5 % de cotisations patronales
// la ou le bulletin en calcule 44,37 % : du faux que personne ne pouvait voir,
// mais que la prochaine reprise aurait pu remettre a l'ecran. Le calcul du CMG
// vit desormais au point unique montantCMG(), en haut du fichier.

function BlocErreurAuth({err,errAction,email,resetInfo,onSwitch,onReset}){
  const gmail=/@(gmail|googlemail)\.com\s*$/i.test(email||"");
  if(resetInfo)return <div style={{color:"#2C6F68",fontSize:12,marginBottom:12,padding:"10px 12px",background:"#EFF7F6",borderRadius:8,lineHeight:1.55}}><IconeOuEmoji e="✉️"/> {resetInfo}</div>;
  if(!err)return null;
  return <div style={{color:"#C84B31",fontSize:12,marginBottom:12,padding:"10px 12px",background:"#FEF2F2",borderRadius:8,lineHeight:1.55}}>
    {err}
    {errAction==="connexion"&&<>
      <button type="button" onClick={onSwitch} style={{display:"block",width:"100%",marginTop:9,background:"#C84B31",color:"#fff",border:"none",borderRadius:10,padding:"9px 12px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
        Se connecter avec cet email →
      </button>
      {gmail&&<div style={{marginTop:9,color:"#6B4F5A",fontSize:11,lineHeight:1.5}}>
        <IconeOuEmoji e="💡"/> Avec Gmail, les points sont ignorés : <b>prenom.nom@gmail.com</b> et <b>prenomnom@gmail.com</b> reçoivent les mêmes emails, mais forment deux comptes différents ici. Vérifiez l'adresse exacte utilisée à la création.
      </div>}
    </>}
    {errAction==="reset"&&<button type="button" onClick={onReset} style={{display:"block",width:"100%",marginTop:9,background:"transparent",color:"#C84B31",border:"1.5px solid #C84B31",borderRadius:10,padding:"9px 12px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
      Mot de passe oublié ? Recevoir un lien
    </button>}
  </div>;
}

// ══════════════════════════════════════════════════════════════════════════
// LA LISTE D'ATTENTE
// ──────────────────────────────────────────────────────────────────────────
// Tant que MAINTENANCE vaut true, la landing est une vitrine : on peut tout
// lire, rien créer. Une personne qui cliquait « Se connecter » voyait une
// modale « Ouverture très bientôt » qui ne recueillait RIEN. Elle repartait,
// et nous n'avions aucun moyen de la prévenir le jour de l'ouverture — alors
// que c'est exactement la personne qu'on cherche : elle est venue, elle a lu,
// elle a cliqué pour s'inscrire.
//
// Trois portes, un seul formulaire :
//   — la minuterie, quelques secondes après l'arrivée, une fois ;
//   — le bouton de la barre de navigation, qui en vitrine ne peut pas
//     honnêtement dire « Se connecter » et dit « Être prévenue » ;
//   — un clic sur n'importe quel bouton d'inscription de la page.
//
// Deux traces dans le navigateur, et rien d'autre :
//   timat:attente:vue      la fenêtre s'est déjà ouverte toute seule
//   timat:attente:inscrit  l'adresse est enregistrée
// La seconde empêche aussi la minuterie : réclamer une adresse déjà donnée
// est la meilleure façon de la faire retirer.
//
// L'enregistrement passe par /api/inscription-releve avec source=liste-attente.
// Pas de treizième fonction serverless : le plan Hobby s'arrête à douze, et
// le projet y est déjà.

export const CLE_ATTENTE_VUE = "timat:attente:vue";
export const CLE_ATTENTE_INSCRIT = "timat:attente:inscrit";
// Le consentement se prouve par le texte affiché au moment du clic. Cette
// constante DOIT rester identique à TEXTE_CONSENTEMENT_ATTENTE dans
// api/inscription-releve.js — une barrière d'audit compare les deux.
export const CONSENTEMENT_ATTENTE =
  "J'accepte d'être prévenue par e-mail de l'ouverture des inscriptions à TiMat. " +
  "Mon adresse ne sert qu'à cela, et je peux me désinscrire à tout moment via le " +
  "lien présent dans chaque e-mail.";

export const dejaInscriteAttente = () => {
  try { return localStorage.getItem(CLE_ATTENTE_INSCRIT) === "1"; } catch(e) { return false; }
};

export function ModaleListeAttente({ ouverte, fermer }){
  const [email,setEmail] = useState("");
  const [piege,setPiege] = useState("");   // leurre à robots, invisible à l'œil
  const [etat,setEtat] = useState("saisie"); // saisie | envoi | fait
  const [err,setErr] = useState("");
  const champRef = useRef(null);

  useEffect(()=>{
    if(!ouverte) return;
    setErr("");
    // Le focus va au champ : la fenêtre s'ouvre pour ça, et une personne au
    // clavier ne doit pas avoir à la traverser pour le trouver.
    const t = setTimeout(()=>champRef.current?.focus(), 120);
    const echap = (e)=>{ if(e.key === "Escape") fermer(); };
    window.addEventListener("keydown", echap);
    return ()=>{ clearTimeout(t); window.removeEventListener("keydown", echap); };
  },[ouverte,fermer]);

  if(!ouverte) return null;

  const envoyer = async (e)=>{
    e.preventDefault();
    const propre = email.trim().toLowerCase();
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(propre)){
      setErr("Cette adresse ne semble pas valide."); champRef.current?.focus(); return;
    }
    setEtat("envoi"); setErr("");
    try{
      const r = await fetch("/api/inscription-releve", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ email:propre, consentement:true, piege, source:"liste-attente" }),
      });
      const j = await r.json().catch(()=>({}));
      if(!r.ok) throw new Error(j.error || "L'enregistrement a échoué.");
      try{ localStorage.setItem(CLE_ATTENTE_INSCRIT,"1"); }catch(e2){}
      setEtat("fait");
    }catch(e2){
      setEtat("saisie");
      setErr(e2.message || "Réessayez dans un instant.");
    }
  };

  const champ = {
    width:"100%", padding:"13px 14px", borderRadius:12, border:"1.5px solid #EDE6DE",
    fontSize:15, fontFamily:"inherit", color:"#2E4859", background:"#fff", outline:"none",
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="attente-titre"
      onClick={e=>e.target===e.currentTarget&&fermer()}
      style={{position:"fixed",inset:0,background:"rgba(13,27,42,.72)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:400,padding:20,animation:"demoScreenIn .25s ease"}}>
      <div style={{background:"#FDFBF8",borderRadius:22,width:"100%",maxWidth:460,overflow:"hidden",boxShadow:"0 24px 80px rgba(13,27,42,.45)",maxHeight:"92vh",overflowY:"auto"}}>
        <div style={{background:"linear-gradient(165deg,#24404F 0%,#2E4859 62%,#2A4D53 100%)",padding:"22px 26px 20px",position:"relative"}}>
          <button onClick={fermer} aria-label="Fermer"
            style={{position:"absolute",top:12,right:12,width:34,height:34,borderRadius:"50%",border:"none",cursor:"pointer",background:"rgba(255,255,255,.12)",color:"#fff",fontSize:16,fontFamily:"inherit",lineHeight:1}}>✕</button>
          <span style={{display:"inline-flex",alignItems:"center",gap:8,background:"rgba(93,169,161,.16)",border:"1px solid rgba(93,169,161,.42)",color:"#BFE3DE",fontSize:11.5,fontWeight:700,letterSpacing:".9px",textTransform:"uppercase",padding:"6px 14px",borderRadius:99,marginBottom:12}}>
            <span style={{width:7,height:7,borderRadius:"50%",background:"#5DA9A1"}}/>Ouverture prochaine
          </span>
          <div id="attente-titre" style={{fontFamily:"'Quicksand','Outfit',system-ui,sans-serif",fontSize:22,fontWeight:700,color:"#fff",lineHeight:1.25}}>
            {etat==="fait" ? "C'est noté." : "Soyez prévenue à l'ouverture"}
          </div>
        </div>

        <div style={{padding:"22px 26px 26px"}}>
          {etat==="fait" ? (
            <>
              <p style={{fontSize:14.5,lineHeight:1.7,color:"#55707C",margin:"0 0 18px"}}>
                Vous recevrez un e-mail le jour où les inscriptions ouvrent. Un seul.
                Vous pourrez créer votre compte dans la foulée : <b style={{color:"#2E4859"}}>deux mois offerts, sans carte bancaire</b>.
              </p>
              <p style={{fontSize:14.5,lineHeight:1.7,color:"#55707C",margin:"0 0 14px"}}>
                D'ici là, tout ceci est déjà en ligne, gratuitement et sans compte :
              </p>
              <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:20}}>
                {[["Les simulateurs gratuits","/outils.html"],["Les guides du blog","/blog"],["L'espace parent employeur","/parents"]].map(([t,u])=>(
                  <a key={u} href={u} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,textDecoration:"none",color:"#2E4859",fontSize:14.5,fontWeight:600,padding:"11px 13px",background:"#fff",border:"1px solid #EDE6DE",borderRadius:12}}>
                    <span>{t}</span><span style={{color:"#9E5341"}}>→</span>
                  </a>
                ))}
              </div>
              <button onClick={fermer} style={{width:"100%",padding:"13px 18px",borderRadius:12,border:"none",cursor:"pointer",background:"#B4543F",color:"#fff",fontSize:15,fontWeight:700,fontFamily:"inherit"}}>Fermer</button>
            </>
          ) : (
            <form onSubmit={envoyer} noValidate>
              <p style={{fontSize:14.5,lineHeight:1.7,color:"#55707C",margin:"0 0 18px"}}>
                L'application est prête ; nous finissons les derniers réglages avant
                d'ouvrir les inscriptions. Laissez votre adresse et vous serez
                prévenue le jour même — <b style={{color:"#2E4859"}}>un seul e-mail</b>, rien d'autre.
              </p>
              {/* Leurre : hors de l'écran et hors du parcours clavier, un robot
                  le remplit quand même. La route renvoie alors un succès muet. */}
              <input type="text" name="site" tabIndex={-1} autoComplete="off" aria-hidden="true"
                value={piege} onChange={e=>setPiege(e.target.value)}
                style={{position:"absolute",left:"-9999px",width:1,height:1,opacity:0}}/>
              <label htmlFor="attente-email" style={{display:"block",fontSize:12.5,fontWeight:700,color:"#2E4859",marginBottom:7}}>Votre adresse e-mail</label>
              <input id="attente-email" ref={champRef} type="email" inputMode="email" autoComplete="email"
                placeholder="vous@exemple.fr" value={email} onChange={e=>{setEmail(e.target.value);setErr("");}}
                aria-invalid={err?"true":"false"} aria-describedby={err?"attente-err":undefined}
                style={{...champ, borderColor: err ? "#B3261E" : "#EDE6DE"}}/>
              {err && <div id="attente-err" role="alert" style={{fontSize:13,color:"#B3261E",fontWeight:600,marginTop:8}}>{err}</div>}
              <button type="submit" disabled={etat==="envoi"}
                style={{width:"100%",marginTop:14,padding:"14px 18px",borderRadius:12,border:"none",cursor:etat==="envoi"?"wait":"pointer",background:"#B4543F",color:"#fff",fontSize:15,fontWeight:700,fontFamily:"inherit",opacity:etat==="envoi"?.7:1}}>
                {etat==="envoi" ? "Enregistrement…" : "Prévenez-moi à l'ouverture →"}
              </button>
              <p style={{fontSize:11.5,lineHeight:1.6,color:"#7C8A90",margin:"12px 0 0"}}>{CONSENTEMENT_ATTENTE}</p>
              <button type="button" onClick={fermer}
                style={{display:"block",width:"100%",marginTop:10,background:"none",border:"none",cursor:"pointer",color:"#55707C",fontSize:13,fontWeight:600,fontFamily:"inherit",textDecoration:"underline"}}>Non merci, je regarde d'abord</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export function LandingPage({onLogin,dark,setDark,config=DEFAULT_CONFIG,preview=false,authOnly=false,forceRole=null,vitrine=false}) {
  const [demoPage, setDemoPage] = useState("accueil");
  const [showModalBrut, setShowModalBrut] = useState(false);
  const [showBientot, setShowBientot] = useState(false);
  // Mode vitrine : la landing reste visible et indexable, mais aucune inscription
  // ni connexion n'est possible. Toutes les ouvertures de la modale d'authentification
  // passent par ce garde-fou, ce qui evite d'avoir a neutraliser chaque bouton.
  const showModal = vitrine ? false : showModalBrut;
  const setShowModal = (v) => { if(vitrine){ if(v) setShowBientot(true); return; } setShowModalBrut(v); };

  // LA MINUTERIE. Sept secondes : le temps de lire le hero et de comprendre de
  // quoi il s'agit. Ouvrir plus tôt, c'est demander une adresse à quelqu'un qui
  // ne sait pas encore à qui il la donne — et c'est le meilleur moyen de la voir
  // fermer sans lire. Une seule fois par navigateur, jamais si l'adresse est
  // déjà donnée, jamais dans l'aperçu du back-office.
  useEffect(()=>{
    if(!vitrine || preview) return;
    try{
      if(localStorage.getItem(CLE_ATTENTE_VUE)==="1") return;
      if(dejaInscriteAttente()) return;
    }catch(e){ return; }
    const t = setTimeout(()=>{
      setShowBientot(true);
      try{ localStorage.setItem(CLE_ATTENTE_VUE,"1"); }catch(e){}
    }, 7000);
    return ()=>clearTimeout(t);
  },[vitrine,preview]);
  const [showLegal, setShowLegal] = useState(null);
  const [showBlog, setShowBlog] = useState(null);
  const [showBoutique, setShowBoutique] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(()=>{
    if(preview)return;
    const onScroll=()=>setScrolled(window.scrollY>150);
    window.addEventListener("scroll",onScroll,{passive:true});
    return()=>window.removeEventListener("scroll",onScroll);
  },[preview]);
  // La barre d'action du bas reste cachée pendant TOUT le hero : les deux
  // boutons de rôle y sont la vraie porte d'entrée, et une barre par-dessus
  // leur ferait concurrence au moment précis où la visiteuse choisit qui elle
  // est. Un seuil en pixels ne suffisait pas — la hauteur du hero change avec
  // la largeur de l'écran et avec la longueur du titre.
  const [heroPasse, setHeroPasse] = useState(false);
  useEffect(()=>{
    if(preview) return;
    const hero=document.getElementById("lp-hero");
    if(!hero||typeof IntersectionObserver==="undefined"){ setHeroPasse(true); return; }
    const o=new IntersectionObserver(([e])=>setHeroPasse(!e.isIntersecting),{threshold:0});
    o.observe(hero);
    return()=>o.disconnect();
  },[preview]);
  const _qParent=(()=>{try{return new URLSearchParams(window.location.search).get("connexion")==="parent";}catch(e){return false;}})();
  const [role, setRole] = useState(forceRole||(_qParent?"parent":"asmat"));
  const [modeAuth, setModeAuth] = useState((forceRole||_qParent)?"connexion":"inscription");
  // AUTH UX P16 - action contextuelle sous le message d'erreur + reinitialisation mot de passe
  const [errAction, setErrAction] = useState(null);
  const [resetInfo, setResetInfo] = useState("");
  const [isWeb,setIsWeb]=useState(typeof window!=="undefined"&&window.innerWidth>=900);
  useEffect(()=>{const f=()=>setIsWeb(window.innerWidth>=900);window.addEventListener("resize",f);return()=>window.removeEventListener("resize",f);},[]);
  const [showAllFaq, setShowAllFaq] = useState(false);
  const [form, setForm] = useState({email:"", password:"", prenom:"", nom:""});
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [consent, setConsent] = useState({politique:false, cgu:false, newsletter:false});
  const consentValide = consent.politique && consent.cgu;
  const [demoArrivee, setDemoArrivee] = useState({e1:"07h35",e2:null,e3:null});
  // Auto-demo facon "screencast" : defile automatiquement les sections cles
  // ── LA DÉMO A DEUX CÔTÉS ───────────────────────────────────────────────
  //
  // La page parents employeurs recopiait l'application à la main, en HTML
  // statique : cinq écrans dessinés, qui dérivaient dès que l'application
  // bougeait (elle avait déjà perdu « Mes alertes »). La démo de l'accueil,
  // elle, monte les VRAIS composants — AccueilAssMat, Pointage, Messagerie —
  // avec des données d'exemple. Il n'y avait aucune raison que le parent ait
  // droit à un dessin quand l'assistante maternelle a droit à l'application.
  //
  // Les mêmes composants savent déjà servir les deux rôles : c'est ce que fait
  // l'application une fois connectée, par la prop `role`. On la passe ici.
  // `?demo=parent` bascule tout le bloc ; `?nu=1` ne rend que lui, pour que la
  // page statique l'embarque dans un cadre sans rejouer le reste de la landing.
  const [demoRole] = useState(()=>{
    try{ return new URLSearchParams(window.location.search).get("demo")==="parent" ? "parent" : "asmat"; }
    catch(e){ return "asmat"; }
  });
  const [demoNu] = useState(()=>{
    try{ return new URLSearchParams(window.location.search).get("nu")==="1"; }
    catch(e){ return false; }
  });
  const demoParent = demoRole==="parent";

  // En vitrine, « Se connecter » est faux : personne ne peut se connecter. Le
  // bouton ouvre déjà la liste d'attente ; il le dit maintenant. Et quand
  // l'adresse est déjà donnée, il cesse de la redemander.
  const [inscriteAttente,setInscriteAttente] = useState(()=>dejaInscriteAttente());
  useEffect(()=>{ if(!showBientot) setInscriteAttente(dejaInscriteAttente()); },[showBientot]);
  const libelleCtaNav = !vitrine ? "Se connecter →"
    : inscriteAttente ? "Vous êtes sur la liste ✓" : "Être prévenue à l'ouverture →";
  const libelleCtaNavCourt = !vitrine ? "Commencer →"
    : inscriteAttente ? "Sur la liste ✓" : "Être prévenue →";
  // L'utilisatrice de la démo : Marie côté assistante maternelle, Sophie côté
  // parent — la mère de Léo, dont on regarde la journée.
  const demoUser = demoParent ? D.parents[0] : D.asmat;
  const demoEnfantParent = D.enfants[0];

  // Le parcours du parent suit ses questions, pas les fonctions de l'app :
  // que fait mon enfant, combien d'heures, combien ça me coûte, comment je
  // lui parle. Les pages visées sont celles de GROUPS_P.
  const demoTourParent = [
    {page:"accueil",label:"Le quotidien",ic:"🏠",
      desc:"La journée de votre enfant, en direct.",
      resume:["Arrivée, repas, sieste : vous voyez sans demander","Déclarez une absence en deux taps","Les photos et les moments partagés dans la journée"]},
    {page:"pointage",label:"Ses heures",ic:"⏰",
      desc:"Les heures pointées, pas les heures estimées.",
      resume:["Présences et absences, jour par jour","Le total du mois se met à jour tout seul","Un désaccord sur les heures se tranche avec une date"]},
    {page:"admin_finances",label:"Coût & aides",ic:"💶",
      desc:"Ce que la garde vous coûte vraiment.",
      resume:["Salaire, indemnités et déclaration Pajemploi","Votre reste à charge, une fois le CMG déduit","Bulletins et paiements suivis des deux côtés"]},
    {page:"messagerie",label:"Messagerie",ic:"💬",
      desc:"Le lien avec votre assistante maternelle.",
      resume:["Messages et moments de la journée","Daté, non modifiable : ce qui a été dit reste","Les deux parents lisent la même chose"]},
  ];

  const demoTourAsmat = [
    {page:"accueil",label:"Le quotidien",ic:"🏠",
      desc:((config.landing||{}).demoPhrase1||"Toute la journée d'accueil, en un coup d'œil."),
      resume:((config.landing||{}).demoPuces1||"Enfants présents, pointage, événements\nFiche d'urgence & santé de chaque enfant\nLe parent voit la journée sans avoir à demander").split("\n").filter(Boolean)},
    {page:"calendrier",label:"Planning & présences",ic:"📅",
      desc:((config.landing||{}).demoPhrase2||"Le planning partagé, pointé en un tap."),
      resume:((config.landing||{}).demoPuces2||"Présences, absences et heures sup.\nFeuille de présence mensuelle prête\nUn désaccord sur les heures se tranche avec une date").split("\n").filter(Boolean)},
    {page:"admin_finances",label:"Calculs & paie",ic:"💶",
      desc:((config.landing||{}).demoPhrase3||"Salaire et déclaration, calculés tout seuls."),
      resume:((config.landing||{}).demoPuces3||"Mensualisation, congés et indemnités\nBulletin & Pajemploi prêts\nPlus de fin de mois passée sur un tableur").split("\n").filter(Boolean)},
    {page:"messagerie",label:"Messagerie parents",ic:"💬",
      desc:((config.landing||{}).demoPhrase4||"Le lien avec les parents, au quotidien."),
      resume:((config.landing||{}).demoPuces4||"Messages & moments de la journée partagés\nNotifications en temps réel\nDaté, non modifiable : ce qui a été dit reste").split("\n").filter(Boolean)},
  ];
  const demoTour = demoParent ? demoTourParent : demoTourAsmat;
  // Demo "video" : le contenu scrolle naturellement, l'ecran change, on voit l'onde de clic (sans doigt visible)
  const demoScript = [
    {page:"accueil",       x:13, y:91},
    {page:"calendrier",    x:62, y:91},
    {page:"admin_finances",x:55, y:23},
    {page:"messagerie",    x:30, y:23},
    {page:"sante_complet", x:38, y:91},
  ];
  const [vStep, setVStep] = useState(0);
  const demoScreenRef = useRef(null);
  // 1) l'ecran suit vStep
  useEffect(()=>{
    setDemoPage(demoScript[vStep%demoScript.length].page);
    const el=demoScreenRef.current; if(el)el.scrollTop=0;
  },[vStep]);
  const goDemo=(p)=>{
    const i=demoScript.findIndex(s=>s.page===p);
    if(i>=0)setVStep(i);
    setDemoPage(p);
    const el=demoScreenRef.current; if(el)el.scrollTop=0;
  };

  // SEO : titre, meta, Open Graph, canonical + donnees structurees JSON-LD
  useEffect(()=>{
    if(preview)return;
    const SITE="https://www.timat.app";
    const IMG=SITE+"/logo.png"; const OGIMG=SITE+"/og-image.png";
    const DESC="TiMat gère salaire, congés et déclaration Pajemploi de votre assistante maternelle. Contrats conformes IDCC 3239. 2 mois d'essai gratuit, sans CB.";
    const prevTitle=document.title;
    document.title="TiMat — Salaire, contrat et Pajemploi assistante maternelle";
    const setMeta=(name,content)=>{
      let m=document.querySelector('meta[name="'+name+'"]');
      if(!m){m=document.createElement("meta");m.setAttribute("name",name);document.head.appendChild(m);}
      const prev=m.getAttribute("content"); m.setAttribute("content",content); return[m,prev];
    };
    const setProp=(prop,content)=>{
      let m=document.querySelector('meta[property="'+prop+'"]');
      if(!m){m=document.createElement("meta");m.setAttribute("property",prop);document.head.appendChild(m);}
      m.setAttribute("content",content); return m;
    };
    const [md,prevDesc]=setMeta("description",DESC);
    const [mk]=setMeta("keywords","application assistante maternelle, logiciel assistante maternelle, cahier de liaison numérique, calcul mensualisation, bulletin de salaire, déclaration Pajemploi, CMG, contrat assistante maternelle, planning nounou, MAM, parents employeurs");
    // Open Graph + Twitter
    setProp("og:title",document.title); setProp("og:description",DESC); setProp("og:type","website");
    setProp("og:url",SITE); setProp("og:image",OGIMG); setProp("og:site_name","TiMat"); setProp("og:locale","fr_FR");
    setMeta("twitter:card","summary_large_image"); setMeta("twitter:title",document.title);
    setMeta("twitter:description",DESC); setMeta("twitter:image",OGIMG);
    // canonical
    let canon=document.querySelector('link[rel="canonical"]'); const createdCanon=!canon;
    if(!canon){canon=document.createElement("link");canon.setAttribute("rel","canonical");document.head.appendChild(canon);}
    const prevCanon=canon.getAttribute("href"); canon.setAttribute("href",SITE);
    // Donnees structurees JSON-LD
    const faqs=(config.faqLanding||[]).filter(f=>f&&f.q&&f.a);
    const schemas=[
      {"@context":"https://schema.org","@type":"Organization","name":"TiMat","url":SITE,"logo":IMG,"description":"L'application de gestion pour les assistantes maternelles et les parents employeurs."},
      {"@context":"https://schema.org","@type":"WebSite","name":"TiMat","url":SITE},
      {"@context":"https://schema.org","@type":"SoftwareApplication","name":"TiMat","applicationCategory":"BusinessApplication","operatingSystem":"Web, iOS, Android","description":"Gestion complète pour assistantes maternelles : salaire, mensualisation, congés, indemnités, déclaration Pajemploi, contrats et planning.","offers":[{"@type":"Offer","price":"0","priceCurrency":"EUR","name":"Gratuit"},{"@type":"Offer","price":"9.99","priceCurrency":"EUR","name":"Pro"}]}
    ];
    if(faqs.length){schemas.push({"@context":"https://schema.org","@type":"FAQPage","mainEntity":faqs.map(f=>({"@type":"Question","name":f.q,"acceptedAnswer":{"@type":"Answer","text":f.a}}))});}
    const scripts=schemas.map(s=>{const el=document.createElement("script");el.type="application/ld+json";el.setAttribute("data-timat-seo","1");el.textContent=JSON.stringify(s);document.head.appendChild(el);return el;});
    return()=>{ document.title=prevTitle; if(prevDesc!=null)md.setAttribute("content",prevDesc); if(prevCanon!=null)canon.setAttribute("href",prevCanon); else if(createdCanon)canon.remove(); scripts.forEach(el=>el.remove()); };
  },[config.faqLanding]);

  // LIEN INVITATION : ?role=parent ou ?invite=... ouvre directement l'inscription famille
  useEffect(()=>{
    if(preview)return;
    try{
      const p=new URLSearchParams(window.location.search);
      if(p.get("role")==="parent"||p.has("invite")){ const tk=p.get("invite"); if(tk){try{localStorage.setItem("timat:invite",tk);}catch(e){}} setRole("parent"); setModeAuth("inscription"); setShowModal(true); }
      else if(p.get("role")==="asmat"){ setRole("asmat"); setShowModal(true); }
    }catch(e){}
  },[]);
  // Démo : enfants enrichis (signatures dérivées) + stats fictives pour le vrai écran Accueil
  const demoEnfants = D.enfants.map(e=>({...e, contrat:{...e.contrat, signe_asmat:e.signe, signe_parent:e.signe, id:"c_"+e.id}}));
  const demoAccueilStats = {heuresSemaine:38.5,joursSemaine:5,revenuMois:1620,heuresMois:152,messagesNonLus:D.messages.filter(m=>!m.lu).length,presencesJour:demoEnfants.filter(e=>demoArrivee[e.id]).map(e=>({...e,depuis:demoArrivee[e.id]})),loaded:true};
  // Démo : sous-onglets déverrouillés (vrais écrans) ; tout le reste = aperçu verrouillé
  const DEMO_UNLOCKED = ["accueil","pointage","admin_finances","inviter_parent","calendrier","messagerie","sante_complet"];
  const demoActiveGroup = findGroup(demoParent?GROUPS_P:GROUPS_AM, demoPage) || "accueil";
  // Deux sources de vérité se contredisaient. DEFAULT_CONFIG décrit le design
  // voulu ; chaque endroit du rendu portait en plus son propre repli littéral
  // (`L.faqBg||"#FDFBF8"`), écrit à une autre époque. Tant que la configuration
  // enregistrée renseigne la clé, personne ne le voit — mais le back-office
  // enregistre des chaînes vides pour les cases qu'on n'a pas remplies, et une
  // chaîne vide est fausse en JavaScript : le repli littéral l'emportait alors
  // sur le défaut. D'où des sections sombres là où le design les voulait
  // claires, et des titres blancs sur fond crème.
  //
  // On fusionne donc ici, en ignorant les valeurs vides : la configuration
  // enregistrée gagne quand elle dit quelque chose, DEFAULT_CONFIG sinon. Les
  // replis littéraux du rendu deviennent inatteignables, ce qui est le but.
  const _sansVide = (o) => Object.fromEntries(
    Object.entries(o || {}).filter(([, v]) => v !== "" && v !== null && v !== undefined)
  );
  const L = { ...(DEFAULT_CONFIG.landing || {}), ..._sansVide(config.landing) };
  const T = { ...(DEFAULT_CONFIG.txts || {}), ..._sansVide(config.txts) };
  const SV = config.sectionsVisibles||{}; // P32 : visibilité des sections landing (true par défaut)
  const F = config.footer||DEFAULT_CONFIG.footer; // P32-2b : contenu du footer
  const TABLE_ROWS_DEFAULT=`🧮|Mensualisation & salaire|Année complète ou incomplète, heures majorées|Des heures de calculs, chaque fin de mois|Calculés depuis vos présences réelles\n🌴|Congés payés|10 % ou maintien de salaire, solde suivi|Deux méthodes à comparer à la main|La plus favorable, calculée pour vous\n🏦|Déclaration Pajemploi|Chaque mois, enfant par enfant|Reporter à la main, avec le risque d'erreur|Récapitulatif prêt à reporter\n📐|Régularisation & fin de contrat|Solde de tout compte, absences|Le calcul qu'on redoute le plus|Calculé et justifié au parent\n🗂️|Contrat & documents|Bulletins, attestations, signature en ligne|Éparpillés entre classeurs et mails|Un dossier par enfant, en 2 clics`;
  const SECTIONS_ORDER_DEFAULT=["probleme","photo1","demo","sources","signature","confidentialite","photo2","tarifs","ctaFinal","temoignages","faq","blog"]; // P32-4
  const _ord=(config.sectionsOrder&&config.sectionsOrder.length)?config.sectionsOrder:SECTIONS_ORDER_DEFAULT;
  const ord=(id)=>{const i=_ord.indexOf(id);return i<0?999:i;};

  const demos=[
    {id:"demo-asmat",email:"marie.dupont@mail.fr",prenom:"Marie",nom:"Dupont",role:"asmat",couleur:COULEUR_ROLE.asmat,label:"Marie Dupont (AssMat)"},
    {id:"demo-parent1",email:"sophie.martin@mail.fr",prenom:"Sophie",nom:"Martin",role:"parent",couleur:COULEUR_ROLE.parent,label:"Sophie Martin - Léo"},
    {id:"demo-parent2",email:"thomas.bernard@mail.fr",prenom:"Thomas",nom:"Bernard",role:"parent",couleur:"#3D6B50",label:"Thomas Bernard - Emma"},
  ];

  // Les polices par defaut sont deja demandees par index.html, des l'analyse du
  // HTML. Cet effet ne sert plus qu'a la police CHOISIE au back-office, quand
  // elle differe : la redemander ici couterait un second telechargement inutile
  // et un reflow de plus, exactement ce qu'on vient de supprimer.
  useEffect(()=>{
    const voulue = config.landing.googleFontsUrl;
    if (!voulue) return;
    const deja = [...document.querySelectorAll('link[rel="stylesheet"]')].some(l => l.href === voulue);
    if (deja || document.getElementById('timat-fonts')) return;
    const link = document.createElement('link');
    link.id = 'timat-fonts'; link.rel = 'stylesheet';
    link.href = voulue;
    document.head.appendChild(link);
  }, []);

  const connexion = async () => {
    if (!form.email || !form.password) { setErr("Email et mot de passe requis."); return; }
    setLoading(true); setErr(""); setErrAction(null); setResetInfo("");
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
      if (error) {
        const demo = demos.find(d => d.email === form.email.trim().toLowerCase());
        if (demo) { onLogin({...demo, isDemo: true}); return; }
        setErr("Email ou mot de passe incorrect.");
        setErrAction("reset");
      } else if (data?.user) {
        // GATING ROLE : un compte parent ne peut pas se connecter via la landing (espace assmat)
        let _r=data.user.user_metadata?.role;
        try{const{data:prof}=await supabase.from("profiles").select("role").eq("id",data.user.id).single(); if(prof?.role)_r=prof.role;}catch(e){}
        if(_r==="parent"){ await supabase.auth.signOut(); setErr("Cet espace est réservé aux assistantes maternelles. Pour votre espace parent, connectez-vous via le lien d'invitation envoyé par votre assistante maternelle."); setLoading(false); return; }
        // Pass minimal user data - auth listener will enrich with profile from DB
        onLogin({
          id: data.user.id,
          email: data.user.email,
          prenom: data.user.user_metadata?.prenom || "Utilisateur",
          nom: data.user.user_metadata?.nom || "",
          role: _r || "asmat",
          couleur: COULEUR_ROLE.asmat,
          subscription_status: "free"
        });
      }
    } catch(e) {
      // Le message conseillait d'« utiliser un compte demo » alors que c'est
      // precisement ce qui echouait ici : un compte de demonstration n'etait
      // reconnu que si Supabase repondait par un refus, jamais si Supabase ne
      // repondait pas du tout. Le chemin de secours devenait donc inutilisable
      // au moment ou l'on en a le plus besoin.
      const demo = demos.find(d => d.email === (form.email||"").trim().toLowerCase());
      if (demo) { onLogin({...demo, isDemo: true}); return; }
      setErr("Connexion impossible. Vérifiez votre connexion internet, puis réessayez.");
    }
    setLoading(false);
  };

  const envoyerReset = async () => {
    const mail=(form.email||"").trim();
    if(!mail){ setErr("Saisissez d'abord votre email."); return; }
    setLoading(true);
    try{
      await supabase.auth.resetPasswordForEmail(mail,{redirectTo:window.location.origin});
      // Reponse volontairement identique que le compte existe ou non (pas d'enumeration d'emails)
      setErr(""); setErrAction(null);
      setResetInfo("Si un compte existe pour "+mail+", un lien de connexion vient d'être envoyé. Pensez à vérifier vos spams.");
    }catch(e){ setErr("Envoi impossible pour le moment."); }
    setLoading(false);
  };

  const inscription = async () => {
    if (!form.email || !form.password || !form.prenom) { setErr("Remplis tous les champs obligatoires."); return; }
    const pbMdp = verifierMotDePasse(form.password); if (pbMdp) { setErr(pbMdp); return; }
    const fuite = await motDePasseCompromis(form.password);
    if (fuite.verifie && fuite.occurrences > 0) { setErr(messageMotDePasseFuite(fuite.occurrences)); return; }
    if (!consentValide) { setErr("Accepte la politique de confidentialité et les CGU pour continuer."); return; }
    setLoading(true); setErr(""); setErrAction(null); setResetInfo("");
    try {
      const { data, error } = await supabase.auth.signUp({
        email: form.email, password: form.password,
        options: { data: { prenom: form.prenom, nom: form.nom, role } }
      });
      if (error) {
        const _m=(error.message||"").toLowerCase();
        if(_m.includes('already registered')||_m.includes('already been registered')||_m.includes('already exists')||error.code==='user_already_exists'){
          setErr("Un compte existe déjà avec cet email.");
          setErrAction("connexion");
        }
        else if(_m.includes('fetch')) setErr("Erreur réseau. Vérifiez votre connexion.");
        else setErr(error.message||"Erreur lors de l'inscription.");
      }
      else if (data?.user) {
        // Delay profile upsert so auth listener settles first (avoids lock race)
        setTimeout(async()=>{
          try{
            await supabase.from('profiles').upsert({
              id: data.user.id, email: data.user.email,
              prenom: form.prenom, nom: form.nom||'',
              role: role, couleur: role === "asmat" ? COULEUR_ROLE.asmat : COULEUR_ROLE.parent,
              ...abonnementInitial(role),
            },{onConflict:'id'});
          }catch(e){console.log('Profile upsert:', e);}
        },500);
        // RATTACHEMENT IMMEDIAT (session fraiche apres signUp) : lien token + invitations par email
        try{
          const tk=new URLSearchParams(window.location.search).get("invite")||(()=>{try{return localStorage.getItem("timat:invite");}catch(e){return null;}})();
          if(tk&&tk.length>20){ await supabase.rpc("claim_invite_token",{p_token:tk}); try{localStorage.removeItem("timat:invite");}catch(e){} }
          if(role==="parent"){ await supabase.rpc("claim_invitations"); }
        }catch(e){console.log("claim:",e?.message);}
        onLogin({ id: data.user.id, email: data.user.email, prenom: form.prenom, nom: form.nom, role, couleur: COULEUR_ROLE[role] || COULEUR_ROLE.parent });
        // AUDIT LOG + CONSENT P8 : preuve RGPD du consentement + trace de la création de compte
        logConsent(data.user.id, consent);
        logAction('signup', {table_name:'profiles', record_id:data.user.id, user_id:data.user.id});
      }
    } catch(e) { setErr("Erreur lors de l'inscription."); }
    setLoading(false);
  };

  const accent = L.accentColor||"#E49178";
  const fTitle = L.fontTitle||"'Fraunces', Georgia, serif";
  // Plus Jakarta Sans n'est plus telechargee : personne ne s'en servait, et
  // elle partait a chaque chargement. Le repli commence donc a DM Sans, qui
  // l'est bel et bien.
  const fBody = L.fontBody||"'DM Sans', system-ui, sans-serif";
  const painPoints = config.painPoints||DEFAULT_CONFIG.painPoints;
  const testimonials = config.testimonials||DEFAULT_CONFIG.testimonials;

  // PAGE DÉDIÉE CONNEXION/INSCRIPTION ASSMAT (ouverte depuis blog/outils via ?connexion)
  if(authOnly){
    return (
      <div style={{minHeight:"100dvh",background:"linear-gradient(160deg,#FDFBF8 0%,#F6E7DC 55%,#EAD8CC 100%)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20,gap:14,fontFamily:fBody}}>
        <a href={(_qParent||forceRole==="parent")?"/parents":"/?site=1"} style={{display:"inline-flex",alignItems:"center",gap:6,padding:"8px 14px",borderRadius:12,background:"rgba(255,255,255,.85)",color:"#2E4859",fontSize:13,fontWeight:700,textDecoration:"none",boxShadow:"0 3px 12px rgba(0,0,0,.10)"}}>← {(_qParent||forceRole==="parent")?"Retour à l'espace parent":"Découvrir TiMat"}</a>
          <div style={{ background: "#FDFAF8", borderRadius: 20, width: "100%", maxWidth: 420, overflow: "hidden", boxShadow: "0 24px 80px rgba(0,0,0,.5)", maxHeight:"95vh", overflowY:"auto" }}>
            <div style={{ padding: 24, borderTop: role === "asmat" ? "4px solid #C76754" : "4px solid #2E4859" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <div style={{ fontFamily: fTitle, fontSize: 18, fontWeight: 700, color: "#0D1B2A" }}>{role === "asmat" ? "Espace pro" : "Espace famille"}</div>
                  <div style={{ fontSize: 11, color: "#A68970", marginTop: 2 }}>{modeAuth === "inscription" ? (role === "asmat" ? "2 mois gratuits · sans carte" : "Inscription gratuite") : "Content de vous revoir !"}</div>
                </div>
                <button onClick={() => { try{window.location.href="/";}catch(e){} }} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#A68970" }}>✕</button>
              </div>
              <div style={{ display:"flex", marginBottom:16, background:"#F6F7F6", borderRadius:10, padding:3 }}>
                {["inscription","connexion"].map(m => (
                  <button key={m} onClick={() => { setModeAuth(m); setErr(""); setErrAction(null); setResetInfo(""); }} style={{ flex:1, padding:"8px", border:"none", cursor:"pointer", borderRadius:10, background: modeAuth===m ? (role==="asmat"?"#C76754":"#2E4859") : "transparent", color: modeAuth===m ? "#fff" : "#6B4F3A", fontWeight:600, fontSize:12, fontFamily:"inherit", transition:"all .15s" }}>{m==="inscription" ? "Créer un compte" : "Se connecter"}</button>
                ))}
              </div>
              <form onSubmit={e=>{e.preventDefault(); if(loading||(modeAuth==="inscription"&&!consentValide))return; modeAuth==="connexion"?connexion():inscription();}}>
              {modeAuth === "inscription" && <>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
                  <div>
                    <div style={{ fontSize:11, fontWeight:700, color:"#A68970", marginBottom:4, textTransform:"uppercase", letterSpacing:".5px" }}>Prénom *</div>
                    <input name="prenom" autoComplete="given-name" value={form.prenom} onChange={e=>setForm(f=>({...f,prenom:e.target.value}))} placeholder={role==="asmat"?"Marie":"Sophie"} style={{ width:"100%", padding:"10px 12px", borderRadius:10, border:"1.5px solid #DDD5C8", fontSize:13, outline:"none", boxSizing:"border-box", fontFamily:"inherit" }} />
                  </div>
                  <div>
                    <div style={{ fontSize:11, fontWeight:700, color:"#A68970", marginBottom:4, textTransform:"uppercase", letterSpacing:".5px" }}>Nom</div>
                    <input name="nom" autoComplete="family-name" value={form.nom} onChange={e=>setForm(f=>({...f,nom:e.target.value}))} placeholder="Dupont" style={{ width:"100%", padding:"10px 12px", borderRadius:10, border:"1.5px solid #DDD5C8", fontSize:13, outline:"none", boxSizing:"border-box", fontFamily:"inherit" }} />
                  </div>
                </div>
              </>}
              <div style={{ marginBottom:10 }}>
                <div style={{ fontSize:11, fontWeight:700, color:"#A68970", marginBottom:4, textTransform:"uppercase", letterSpacing:".5px" }}>Email *</div>
                <input type="email" name="email" autoComplete="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder={role === "asmat" ? "marie@email.fr" : "parent@email.fr"} style={{ width:"100%", padding:"11px 14px", borderRadius:10, border:"1.5px solid #DDD5C8", fontSize:13, outline:"none", boxSizing:"border-box", fontFamily:"inherit" }} />
              </div>
              <div style={{ marginBottom: modeAuth==="inscription" ? 14 : 20 }}>
                <div style={{ fontSize:11, fontWeight:700, color:"#A68970", marginBottom:4, textTransform:"uppercase", letterSpacing:".5px" }}>Mot de passe *</div>
                <input type="password" name="password" autoComplete={modeAuth==="inscription"?"new-password":"current-password"} value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} placeholder={modeAuth==="inscription" ? MDP_AIDE : "Votre mot de passe"} style={{ width:"100%", padding:"11px 14px", borderRadius:10, border:"1.5px solid #DDD5C8", fontSize:13, outline:"none", boxSizing:"border-box", fontFamily:"inherit" }} />
              </div>
              {modeAuth === "inscription" && <div style={{ background:"#F6F7F6", borderRadius:10, padding:"12px 14px", marginBottom:14 }}>
                <div style={{ fontSize:11, fontWeight:700, color:"#A68970", marginBottom:8, textTransform:"uppercase", letterSpacing:".5px" }}>Vos données</div>
                {[{k:"politique", l:"J'accepte la politique de confidentialité", req:true},{k:"cgu", l:"J'accepte les conditions générales d'utilisation", req:true},{k:"newsletter", l:"Recevoir les actualités TiMat (optionnel)", req:false}].map(({k,l,req}) => (
                  <label key={k} style={{ display:"flex", gap:8, alignItems:"flex-start", cursor:"pointer", marginBottom:7 }}>
                    <input type="checkbox" checked={consent[k]} onChange={e=>setConsent(c=>({...c,[k]:e.target.checked}))} style={{ width:14, height:14, marginTop:2, accentColor: role==="asmat"?"#C76754":"#2E4859", flexShrink:0 }} />
                    <span style={{ fontSize:11, color:"#2C1F14", lineHeight:1.5 }}>{l}{req&&<span style={{color:"#B84060",fontWeight:700}}> *</span>}</span>
                  </label>
                ))}
                <div style={{ fontSize:11, color:"#A68970", marginTop:4 }}>* Obligatoire · Données hébergées en France · Suppression possible à tout moment</div>
              </div>}
              <BlocErreurAuth err={err} errAction={errAction} email={form.email} resetInfo={resetInfo} onSwitch={()=>{setModeAuth("connexion");setErr("");setErrAction(null);}} onReset={envoyerReset}/>
              {modeAuth==="connexion"&&errAction!=="reset"&&<div style={{textAlign:"right",marginTop:-4,marginBottom:12}}><button type="button" onClick={envoyerReset} style={{background:"none",border:"none",color:"#A68970",fontSize:12,fontWeight:600,textDecoration:"underline",cursor:"pointer",fontFamily:"inherit",padding:0}}>Mot de passe oublié ?</button></div>}
              <button type="submit" disabled={loading || (modeAuth==="inscription" && !consentValide)} style={{ width:"100%", background: role==="asmat" ? "linear-gradient(135deg,#E49178,#C76754)" : "linear-gradient(135deg,#3A5A6E,#2E4859)", color:"#fff", border:"none", borderRadius:10, padding:"13px", cursor:"pointer", fontWeight:700, fontSize:13, fontFamily:"inherit", marginBottom:16, opacity: (loading||(modeAuth==="inscription"&&!consentValide)) ? .6 : 1 }}>
                {loading ? "⏳ Chargement..." : modeAuth==="connexion" ? (role==="asmat" ? "Accéder à mon espace →" : "Accéder à l'espace famille →") : (role==="asmat" ? "Créer mon espace pro →" : "Créer mon compte parent →")}
              </button>
              </form>
              {false && (<><div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
                <div style={{ flex:1, height:1, background:"#DDD5C8" }}/><span style={{ fontSize:11, color:"#A68970" }}>ou sans inscription</span><div style={{ flex:1, height:1, background:"#DDD5C8" }}/>
              </div>
              <div style={{ background:"#F7F2EC", borderRadius:12, padding:12, border:"1.5px solid "+(role==="asmat"?"#C76754":"#2E4859") }}>
                <div style={{ fontSize:13, fontWeight:700, color:role==="asmat"?"#C76754":"#2E4859", marginBottom:2 }}>🎭 Explorer la démo</div>
                <div style={{ fontSize:11, color:"#6B4F3A", marginBottom:10, lineHeight:1.5 }}>Toute l'application avec des données d'exemple. Aucune inscription, aucune carte bancaire.</div>
                <div style={{ fontSize:11, fontWeight:700, color:"#A68970", marginBottom:8, textTransform:"uppercase", letterSpacing:".5px" }}>{role==="asmat" ? "Compte assistante maternelle" : "Comptes parents"}</div>
                {demos.filter(d=>d.role===role).map(d => (
                  <button key={d.id} onClick={()=>onLogin({...d,isDemo:true})} style={{ display:"block", width:"100%", textAlign:"left", padding:"8px 10px", background:"none", border:"none", cursor:"pointer", borderRadius:10, fontFamily:"inherit", fontSize:13, color:"#2C1F14", fontWeight:600 }} onMouseEnter={e=>e.currentTarget.style.background="#DDD5C8"} onMouseLeave={e=>e.currentTarget.style.background="none"}>
                    {d.role==="asmat"?"👩👧":"👪"} {d.label}
                    <span style={{ fontSize:11, color:"#A68970", display:"block", paddingLeft:18 }}>{d.email}</span>
                  </button>
                ))}
              </div></>)}
              <div style={{ marginTop:12, fontSize:11, color:"#A68970", textAlign:"center" }}>Données hébergées en France · Aucun engagement</div>
            </div>
          </div>
      </div>
    );
  }

  // ── LE BLOC DÉMO, SORTI DU RENDU ──────────────────────────────────────
  // Il est déclaré ici pour pouvoir être rendu SEUL : la page parents
  // employeurs l'embarque dans un cadre (?demo=parent&nu=1) et n'a donc plus
  // à redessiner l'application en HTML. Une seule démo, celle qui monte les
  // vrais écrans, pour les deux publics.
        const blocDemo = SV.demo!==false && (<div id="demo" className="lp-section" style={{ order:ord("demo"), background: L.section2Bg||"linear-gradient(160deg,#0D1B2A,#22384A)" }}>
        <WaveDivider color={L.wave2||L.section2Bg||"#0D1B2A"} on={L.wavesOn!==false&&L.waveOn2!==false}/>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          {/* Pas de titre dans le cadre embarqué : la page qui l'accueille a
              déjà le sien, et celui-ci s'adresse à l'assistante maternelle. */}
          {!demoNu && <FadeIn>
            <div style={{ textAlign: L.s2Align||"center", marginBottom: 48 }}>
              <h2 style={{ margin:0, fontFamily: fTitle, fontSize: "clamp(22px,4vw,36px)", color: L.s2TitleColor||"#fff", fontWeight: 700, marginBottom: 10 }}>{L.s2Title}</h2>
              <div style={{ fontSize: 15, color: L.s2DescColor||"rgba(255,255,255,.6)", lineHeight: 1.7 }}>{L.s2Desc}</div>
            </div>
          </FadeIn>}
          <div className="demo-layout">

            {/* Onglets (gauche desktop / haut mobile) facon Pandi-Panda */}
            <div style={{order:1,position:"relative"}}>
              <div className="demo-tabs">
                {demoTour.map(s=>{const on=demoPage===s.page;return <button key={s.page}onClick={()=>goDemo(s.page)}
                  style={{display:"flex",alignItems:"center",gap:9,padding:"12px 13px",border:"none",cursor:"pointer",textAlign:"left",width:"100%",background:on?"#B4543F":"#FFFFFF",color:on?"#fff":"#55707C",transition:"all .25s cubic-bezier(.34,1.56,.64,1)",borderBottom:"1px solid #EDE6DE",transform:on?"scale(1.03)":"scale(1)",position:"relative",zIndex:on?2:1,animation:on?"demoTabGlow 2.4s ease-in-out infinite":"none"}}>
                  <span style={{fontSize:on?20:18,flexShrink:0,transition:"font-size .2s"}}><IconeOuEmoji e={s.ic}/></span>
                  <span style={{fontSize:13,fontWeight:700,lineHeight:1.2}}>{s.label}</span>
                </button>;})}
              </div>
              {/* Fleche transparente (mobile) indiquant qu'on peut faire defiler les onglets */}
              <div className="demo-scrollarrow" style={{position:"absolute",top:0,right:0,bottom:0,width:44,pointerEvents:"none",display:"none",alignItems:"center",justifyContent:"flex-end",paddingRight:6,background:"linear-gradient(90deg,rgba(253,251,248,0),rgba(253,251,248,.9))",borderRadius:"0 14px 14px 0"}}>
                <span style={{fontSize:22,color:"rgba(46,72,89,.4)",animation:"nudge 1.2s ease-in-out infinite"}}>›</span>
              </div>
              <div className="demo-scrollhint" style={{alignItems:"center",justifyContent:"center",gap:6,marginTop:8,fontSize:11.5,color:"#90A093",fontWeight:600}}>
                <span style={{animation:"nudge 1.2s ease-in-out infinite"}}>👉</span> Faites défiler pour voir les autres sections
              </div>
            </div>

            {/* Explication resumee (centre desktop / sous onglets mobile) */}
            {(()=>{const s=demoTour.find(t=>t.page===demoPage)||demoTour[0];return <div className="demo-explain" style={{order:2}}>
              <div key={demoPage} style={{display:"flex",flexDirection:"column",gap:12,marginBottom:4}}>
                <div style={{fontFamily:fTitle,fontSize:18,fontWeight:700,color:"#2E4859",lineHeight:1.3,marginBottom:2,animation:"demoPuceIn .45s ease backwards"}}>{s.desc}</div>
                {s.resume.map((r,j)=><div key={r}style={{display:"flex",gap:11,alignItems:"center",fontSize:14.5,color:"#55707C",lineHeight:1.4,animation:"demoPuceIn .45s ease backwards",animationDelay:((j+1)*0.1)+"s"}}><span style={{flexShrink:0,width:24,height:24,borderRadius:"50%",background:"rgba(93,169,161,.18)",color:"#2F655F",fontWeight:800,fontSize:13,display:"flex",alignItems:"center",justifyContent:"center"}}>✓</span><span style={{fontWeight:600}}>{r}</span></div>)}
              </div>
              {/* faisceau lumineux qui file vers le telephone (desktop) a chaque changement */}
              <div className="demo-beam" style={{position:"relative",height:2,marginTop:22,background:"linear-gradient(90deg,rgba(93,169,161,0),rgba(93,169,161,.25),rgba(93,169,161,0))",borderRadius:2}}>
                <span key={demoPage} style={{position:"absolute",top:-3,width:8,height:8,borderRadius:"50%",background:"#5DA9A1",boxShadow:"0 0 12px 3px rgba(93,169,161,.8)",animation:"demoBeam 1.1s ease-out"}}/>
              </div>
            </div>;})()}

            {/* Phone (droite desktop / bas mobile) */}
            <div className="demo-col-phone" style={{order:3,display:"flex",flexDirection:"column",alignItems:"center",gap:14}}>
            {/* Phone frame — style hero, ecrans propres, sans scroll */}
            <div className="demo-phone" style={{ flexShrink: 0, background: "#0D1B2A", borderRadius: 42, padding: "12px 11px", boxShadow: "0 30px 70px rgba(13,27,42,.4)" }}>
              <div style={{ display:"flex", justifyContent:"center", marginBottom:6 }}>
                <div style={{ width:70, height:5, borderRadius:3, background:"rgba(255,255,255,.22)" }}/>
              </div>
              <div className="demo-frame" style={{ background:"#FDFBF8", borderRadius:30, overflow:"hidden", display:"flex", flexDirection:"column", position:"relative" }}>
                <div className="demo-zoom" style={{flex:1,display:"flex",flexDirection:"column",minHeight:0}}>
                <div className="topbar">
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <img src={logoForRole(demoRole,false)} alt="TiMat" style={{height:(G?.landing?.logoSizes?.topBar)||28,objectFit:"contain"}} onError={e=>{e.target.outerHTML='<div class="logo">TiMat</div>'}}/>
                    <span style={{fontSize:11,color:"var(--l)",fontFamily:"'DM Mono',monospace",letterSpacing:"1px",marginTop:1}}>v3</span>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{position:"relative",display:"inline-flex"}}><IconeOuEmoji e="🔔" taille={19}/><span style={{position:"absolute",top:-2,right:-2,background:"var(--R)",color:"#fff",borderRadius:"50%",minWidth:17,height:17,padding:"0 4px",fontSize:11,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>3</span></span>
                    <IconeOuEmoji e="🌙" taille={17}/>
                    <div style={{width:28,height:28,minWidth:28,borderRadius:"50%",background:demoUser.couleur,color:"#fff",fontSize:11,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1}}>{ini(demoUser.prenom,demoUser.nom)}</div>
                  </div>
                </div>
                <div key={demoPage} ref={demoScreenRef} className="demo-screen" style={{ flex: 1, overflowY: "auto", overflowX: "hidden", position:"relative", animation:"demoScreenIn .4s ease" }}>
                  {/* Les écrans de la démo arrivent à la demande : sans ce
                      Suspense, cliquer un onglet ferait disparaître la landing
                      le temps du téléchargement. */}
                  <Suspense fallback={<div style={{padding:"40px 16px",textAlign:"center",color:"var(--m)",fontSize:13}}>Chargement de l'aperçu…</div>}>
                  {/* Les mêmes composants, la prop `role` en moins ou en plus.
                      Côté parent, `pEId` désigne SON enfant : les écrans se
                      limitent d'eux-mêmes à celui-là, exactement comme dans
                      l'application une fois connectée. */}
                  {demoPage==="accueil"
                    ? (demoParent
                        ? <AccueilParent enfant={demoEnfants[0]} user={demoUser} setPage={setDemoPage}/>
                        : <AccueilAssMat enfants={demoEnfants} user={D.asmat} setPage={setDemoPage} demoStats={demoAccueilStats}/>)
                    : demoPage==="pointage"
                    ? <div style={{padding:10}}><Pointage enfants={demoEnfants} role={demoRole} pEId={demoParent?demoEnfantParent.id:null} user={demoUser} demoMode={true}/></div>
                    : demoPage==="admin_finances"
                    ? <div style={{padding:10}}><AdminFinances enfants={demoEnfants} role={demoRole} pEId={demoParent?demoEnfantParent.id:null} user={demoUser} pointagesDB={D.pointages} demoMode={true}/></div>
                    : demoPage==="calendrier"
                    ? <div style={{padding:10}}><Calendrier enfants={demoEnfants} role={demoRole} pEId={demoParent?demoEnfantParent.id:null}/></div>
                    : demoPage==="messagerie"
                    ? <div style={{padding:10}}><Messagerie enfants={demoEnfants} role={demoRole} pEId={demoParent?demoEnfantParent.id:null} user={demoUser}/></div>
                    : demoPage==="sante_complet"
                    ? <div style={{padding:10}}><SanteComplete enfants={demoEnfants} role={demoRole} pEId={demoParent?demoEnfantParent.id:null}/></div>
                    : <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100%",gap:14,textAlign:"center",padding:24}}>
                        <div style={{fontSize:40}}>🔒</div>
                        <div style={{fontSize:16,fontWeight:700,color:"var(--b)"}}>Disponible dans l'application</div>
                      </div>}
                  </Suspense>
                </div>
                <div className="demo-bnav"><BottomNav groups={demoParent?GROUPS_P:GROUPS_AM} page={demoPage} setPage={goDemo} role={demoRole} pmiNonLus={0} flat/></div>
                </div>{/* /demo-zoom */}
              </div>
              <div style={{ display:"flex", justifyContent:"center", paddingTop:8 }}>
                <div style={{ width:90, height:4, background:"rgba(255,255,255,.25)", borderRadius:2 }}/>
              </div>
            </div>
            </div>{/* /colonne phone */}
            {/* La démo est le meilleur argument de la page : l'action se
                propose juste après l'avoir vue, et le prix est dit là, en
                clair, plutôt que découvert trois écrans plus bas. */}
            <div className="demo-cta">
              <div style={{ fontSize:11.5, color:"#7C8A90", marginBottom:14, lineHeight:1.5 }}>Écrans réels · données d'exemple{demoParent?"":" · certains écrans s'ouvrent avec l'abonnement"}</div>
              {demoParent
                ? <>
                    <a href="/?connexion=parent" target="_top" style={{ display:"inline-block", background:"#B4543F", color:"#fff", borderRadius:12, padding:"14px 30px", fontSize:15, fontWeight:700, textDecoration:"none", boxShadow:"0 6px 18px rgba(180,84,63,.26)" }}>Me connecter à mon espace →</a>
                    <div style={{ fontSize:12.5, color:"#55707C", marginTop:14, lineHeight:1.6 }}>
                      <b style={{ color:"#2F655F", fontWeight:700 }}>Gratuit pour les parents</b>, sans limite de durée.<br/>C'est votre assistante maternelle qui vous invite.
                    </div>
                  </>
                : <>
                    <button onClick={() => { setShowModal(true); setRole("asmat"); }} style={{ background:"#B4543F", color:"#fff", border:"none", borderRadius:12, padding:"14px 30px", fontSize:15, fontWeight:700, cursor:"pointer", fontFamily:"inherit", boxShadow:"0 6px 18px rgba(180,84,63,.26)" }}>Créer mon compte gratuitement →</button>
                    <div style={{ fontSize:12.5, color:"#55707C", marginTop:14, lineHeight:1.6 }}>
                      <b style={{ color:"#9E5341", fontWeight:700 }}>{T.prixMensuel} € par mois</b>, contrats illimités.<br/>{T.prixEssai}, sans engagement.
                    </div>
                  </>}
            </div>
          </div>
        </div>
      </div>);

  // Le cadre ne montre que la démo : ni en-tête, ni hero, ni pied de page —
  // la page qui l'embarque les a déjà, et les afficher deux fois serait une
  // page dans une page. Le fond reprend celui de la section pour que la
  // jointure avec la page hôte ne se voie pas.
  if(demoNu) return (
    <div style={{ fontFamily: fBody, background: L.section2Bg||"#FDFBF8" }}>
      {/* Le titre de section reste à la page qui embarque le cadre : elle a
          déjà le sien, et celui d'ici parle à l'assistante maternelle. Deux
          titres l'un sous l'autre, dont un hors sujet, c'est une page dans
          une page. Les vagues décoratives tomberaient au milieu de la page
          hôte : elles disparaissent aussi. */}
      <style>{`html,body{margin:0}#demo{padding:8px 16px 4px!important}#demo>svg,#demo>div>svg{display:none}`}</style>
      {blocDemo}
    </div>
  );

  return (
    <div style={{ fontFamily: fBody, overflowX: "hidden", background: L.pageBg||"#FDFBF8" }}>
      {/* Responsive CSS */}
      <style>{`
        .lp-section details summary::-webkit-details-marker{display:none}
        .lp-section details summary::marker{content:""}
        .lp-section details[open] summary .acc-plus{transform:rotate(45deg)}
        .lp-section details[open] summary>span.cmt-plus{transform:rotate(45deg)}
        .lp-section details summary>span:last-child{transition:transform .2s;display:inline-block}
        .lp-nav-btns{display:flex;gap:8px;align-items:center}
        .lp-nav-full{display:flex;gap:8px;align-items:center}
        .lp-nav-mobile{display:none}
        .lp-hero-stats{align-items:stretch}
        .lp-demo-grid{display:grid;grid-template-columns:200px 1fr;gap:24px;align-items:start}
        .lp-demo-tabs{display:flex;flex-direction:column;gap:6px}
        .lp-transfo-row{display:grid;grid-template-columns:40px 1fr 1fr 1fr;gap:20px;align-items:center}
        .lp-transfo-head{display:grid;grid-template-columns:40px 1fr 1fr 1fr;gap:20px;padding:0 20px 10px}
        .transfo-celllabel{display:none}
        .lp-tarifs-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:start}
        .lp-logo{font-size:26px;font-weight:700;display:flex;align-items:center;gap:8px;letter-spacing:-.5px}
        .lp-logo-icon{width:32px;height:32px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px}
        .lp-hero-ctas{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-bottom:28px}
        .lp-hero-roles{display:flex;flex-direction:column;gap:9px;max-width:380px;margin:0 auto}
        .lp-hero-roles button{transition:transform .12s}
        .lp-hero-roles button:hover{transform:translateY(-2px)}
        @media (prefers-reduced-motion:reduce){.lp-hero-roles button{transition:none}.lp-hero-roles button:hover{transform:none}}
        .lp-hero-grid{display:flex;gap:52px;align-items:center;justify-content:center;max-width:1200px;margin:0 auto}
        .lp-hero-text{flex:1 1 460px;min-width:0;text-align:center}
        .lp-hero-visual{flex:0 0 auto;position:relative;display:flex;flex-direction:column;align-items:center}
        .lp-hero-tags{display:flex;gap:7px;flex-wrap:wrap;justify-content:center;margin-top:16px}
        @keyframes floaty{0%,100%{transform:translateY(0) rotate(-1.2deg)}50%{transform:translateY(-16px) rotate(1.2deg)}}
        @keyframes notifpop{0%{opacity:0;transform:translateY(12px) scale(.92)}14%,82%{opacity:1;transform:translateY(0) scale(1)}100%{opacity:0;transform:translateY(-10px) scale(.95)}}
        @keyframes glowpulse{0%,100%{opacity:.35}50%{opacity:.6}}
        @media(max-width:820px){
          .lp-hero-grid{flex-direction:column;gap:34px}
          .lp-hero-text{text-align:center;flex-basis:auto}
          .lp-hero-ctas{justify-content:center}
          .lp-hero-tags{justify-content:center}
          .hero-phone-wrap{transform:scale(.88);margin:-24px 0}
        }
        .lp-hero-ctas button{white-space:nowrap}
        .lp-hero{padding:0 24px 80px;position:relative;overflow:hidden}
        .sticky-burger{display:none!important}
        @media(max-width:760px){.sticky-links{display:none!important}.sticky-burger{display:flex!important}}
        .lp-section{padding:72px 24px;position:relative}
        /* Le bandeau photo : sa hauteur suit la largeur de l'écran. Figé à
           150 px, il ne montrait plus rien au-delà du mobile. */
        .lp-bandeau img{height:150px}
        @media(min-width:700px){.lp-bandeau img{height:240px}}
        @media(min-width:1100px){.lp-bandeau img{height:320px}}

        /* La barre d'action. Pleine largeur et collée au bas, elle ressemblait
           à un bandeau de consentement : le prix d'un côté, le bouton à
           l'autre bout de 1 440 px, et rien entre les deux. Elle devient une
           carte flottante, centrée, qui ne prend que la place qu'il lui faut. */
        .lp-barre{transition:transform .28s ease,opacity .28s ease;
          left:50%;right:auto;transform-origin:bottom center;
          width:max-content;max-width:calc(100% - 32px)}
        @media (prefers-reduced-motion:reduce){.lp-barre{transition:none}}
        @media(max-width:899px){
          .lp-barre{max-width:calc(100% - 20px)}
        }

        /* Les bulles de notification du hero. Elles se posaient SUR l'écran du
           téléphone : sur un grand écran, où le téléphone est bien visible,
           elles cachaient précisément ce qu'elles sont censées commenter. */
        @media(min-width:900px){
          .hero-phone-wrap .lp-bulle-0{left:-34% !important}
          .hero-phone-wrap .lp-bulle-1{left:78% !important}
          .hero-phone-wrap .lp-bulle-2{left:-30% !important}
        }
        .lp-guarantees{display:flex;gap:20px;justify-content:center;flex-wrap:wrap;text-align:center;margin-top:24px;font-size:13px}
        @media(max-width:768px){
          .lp-nav-full{display:none!important}
          .lp-nav-mobile{display:flex!important;gap:6px;align-items:center}
          .lp-hero-stats>div{min-width:0}
          .lp-demo-grid{grid-template-columns:1fr!important;gap:16px}
          .lp-demo-tabs{flex-direction:row;flex-wrap:wrap;gap:4px}
          .lp-demo-tabs button{padding:8px 12px!important;font-size:12px!important;flex:0 0 auto}
          .lp-transfo-row{grid-template-columns:1fr!important;gap:8px;padding:14px!important}
          .lp-transfo-row>div:first-child{display:none}
          .lp-transfo-head{display:none!important}
          .transfo-celllabel{display:block!important}
          .lp-tarifs-grid{grid-template-columns:1fr!important;gap:16px}
          .lp-logo{font-size:22px}
          .lp-logo-icon{width:28px;height:28px;font-size:15px}
          .lp-section{padding:48px 16px}
          .lp-hero{padding:0 16px 50px}
          .lp-hero-ctas{flex-direction:column;align-items:center;gap:10px}
          .lp-hero-ctas button{width:100%;max-width:320px;text-align:center}
          .lp-guarantees{flex-direction:column;gap:8px;font-size:12px}
        }
        @media(max-width:480px){
          .lp-hero-stats>div{min-width:0}
          .lp-demo-tabs button{padding:6px 8px!important;font-size:11px!important}
          .lp-section{padding:40px 12px}
          .lp-hero{padding:0 12px 40px}
          .lp-logo{font-size:20px}
          .lp-logo-icon{width:24px;height:24px;font-size:13px}
        }
      `}</style>
      {/* Sticky nav — apparait quand on descend */}
      <div style={{ position:"fixed", top:0, left:0, right:0, zIndex:200, transform:scrolled?"translateY(0)":"translateY(-110%)", transition:"transform .35s cubic-bezier(.22,1,.36,1)", background:"rgba(253,251,248,.9)", backdropFilter:"blur(14px)", borderBottom:"1px solid rgba(46,72,89,.08)", boxShadow:scrolled?"0 4px 24px rgba(46,72,89,.08)":"none" }}>
        <div style={{ maxWidth:1120, margin:"0 auto", padding:"9px 20px", display:"flex", alignItems:"center", gap:18 }}>
          <img src={L?.logoUrl || "/logo.webp"} alt="TiMat" onClick={()=>window.scrollTo({top:0,behavior:"smooth"})} style={{height:32,objectFit:"contain",flexShrink:0,cursor:"pointer"}} onError={e=>{e.target.style.display="none"; const f=document.createElement("span"); f.style.color="#2E4859"; f.style.fontWeight="700"; f.style.fontSize="20px"; f.style.fontFamily=fTitle; f.textContent="TiMat"; e.target.parentNode.appendChild(f);}}/>
          <div style={{ display:"flex", alignItems:"center", gap:6, marginLeft:"auto" }}>
            <nav className="sticky-links" style={{ display:"flex", alignItems:"center", gap:2 }}>
              {[["Parents","parents-page"],["Fonctionnalités","demo"],["Tarifs","tarifs"],["Boutique","boutique"],["Outils gratuits","outils"],["Blog","blog-section"]].map(([label,target])=>
                <button key={target} onClick={()=>{ if(target==="parents-page")window.location.href="/parents"; else if(target==="outils")window.location.href="/outils.html"; else if(target==="boutique")window.location.href="/boutique.html"; else if(target==="blog-section")window.location.href="/blog"; else document.getElementById(target)?.scrollIntoView({behavior:"smooth"}); }}
                  style={{ background:"transparent", border:"none", cursor:"pointer", fontSize:13.5, fontWeight:600, color:"#2E4859", padding:"7px 12px", borderRadius:8, fontFamily:"inherit", transition:"background .15s, color .15s", whiteSpace:"nowrap" }}
                  onMouseEnter={e=>{e.currentTarget.style.background="rgba(228,145,120,.12)";e.currentTarget.style.color="#C84B31";}} onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color="#2E4859";}}>{label}</button>
              )}
            </nav>
            <button className="sticky-burger" onClick={()=>{ window.scrollTo({top:0,behavior:"smooth"}); setTimeout(()=>setMenuOpen(true),450); }} style={{ background:"transparent",color:"#2E4859",border:"1px solid rgba(46,72,89,.2)",cursor:"pointer",fontSize:18,fontWeight:700,width:40,height:40,borderRadius:10,fontFamily:"inherit",alignItems:"center",justifyContent:"center" }}>☰</button>
            <button onClick={()=>{ setShowModal(true); setRole("asmat"); }} style={{ background:"linear-gradient(135deg,#E49178,#C84B31)", color:"#fff", border:"none", borderRadius:10, padding:"9px 18px", cursor:"pointer", fontSize:13, fontWeight:700, fontFamily:"inherit", boxShadow:"0 4px 14px rgba(228,145,120,.35)", transition:"transform .12s", whiteSpace:"nowrap" }} onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"} onMouseLeave={e=>e.currentTarget.style.transform="none"}>{libelleCtaNav}</button>
          </div>
        </div>
      </div>
      <div id="lp-hero" className="lp-hero" style={{ background: L.heroBg }}>
        <div style={{ position:"absolute", inset:0, zIndex:0, backgroundImage:L.heroImg?"url("+L.heroImg+")":"none", backgroundSize:"cover", backgroundPosition:L.heroImgPosition||"center center", opacity:L.heroImgOpacity||0.12, filter:"blur("+(L.heroImgBlur||2)+"px)" }}/>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E\")", pointerEvents: "none", zIndex: 0 }} />
        {/* Nav */}
        <div style={{ position: "relative", zIndex: 1, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "22px 0", maxWidth: 1200, margin: "0 auto" }}>
          <div className="lp-logo" style={{ fontFamily: fTitle }}>
            <img src={L?.logoUrlSurFonce || L?.logoUrl || "/logo-dark.webp"} alt="TiMat" onClick={()=>window.scrollTo({top:0,behavior:"smooth"})} style={{height:(L?.logoSizes?.landingHeader)||44,objectFit:"contain",cursor:"pointer"}} onError={e=>{e.target.style.display="none"; const fallback=document.createElement("span"); fallback.style.color="#fff"; fallback.style.fontWeight="700"; fallback.style.fontSize="22px"; fallback.textContent="TiMat"; e.target.parentNode.appendChild(fallback);}}/>
          </div>
          {/* Desktop nav : onglets visibles + Se connecter */}
          <div className="lp-nav-full" style={{ alignItems:"center", gap:6 }}>
            <nav style={{ display:"flex", alignItems:"center", gap:2 }}>
              {[["Parents","parents-page"],["Fonctionnalités","demo"],["Tarifs","tarifs"],["Boutique","boutique"],["Outils gratuits","outils"],["Blog","blog-section"]].map(([label,target])=>
                <button key={target} onClick={()=>{ if(target==="parents-page")window.location.href="/parents"; else if(target==="outils")window.location.href="/outils.html"; else if(target==="boutique")window.location.href="/boutique.html"; else if(target==="blog-section")window.location.href="/blog"; else document.getElementById(target)?.scrollIntoView({behavior:"smooth"}); }}
                  style={{ background:"transparent", border:"none", cursor:"pointer", fontSize:13.5, fontWeight:600, color:L.navBtnColor||"#2E4859", padding:"7px 12px", borderRadius:8, fontFamily:"inherit", transition:"background .15s,color .15s", whiteSpace:"nowrap" }}
                  onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,.10)";e.currentTarget.style.color="#F0A98F";}} onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color=L.navBtnColor||"#2E4859";}}>{label}</button>
              )}
            </nav>
            <button onClick={() => { setShowModal(true); setRole("asmat"); }} style={{ background: L.navCtaBg||"linear-gradient(135deg,#E49178,#C84B31)", color: L.navCtaColor||"#fff", border: "none", borderRadius: 10, padding: "9px 20px", cursor: "pointer", fontSize: 13, fontWeight: 700, boxShadow: "0 4px 20px rgba(255,159,99,.4)", transition:"transform .12s", whiteSpace:"nowrap" }} onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"} onMouseLeave={e=>e.currentTarget.style.transform="none"}>{libelleCtaNav}</button>
          </div>
          {/* Mobile nav - hamburger + CTA */}
          <div className="lp-nav-mobile">
            <button onClick={() => setMenuOpen(!menuOpen)} style={{ background: L.navHamburgerBg||L.navBtnBg||"rgba(46,72,89,.06)", color: L.navHamburgerColor||L.navBtnColor||"#2E4859", border: "2px solid "+(L.navHamburgerBorder||L.navBtnBorder||"rgba(46,72,89,.25)"), borderRadius: 10, width: 42, height: 42, cursor: "pointer", fontSize: 20, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>{menuOpen?"✕":"☰"}</button>
            <button onClick={() => { setShowModal(true); setRole("asmat"); }} style={{ background: L.navCtaBg||"linear-gradient(135deg,#E49178,#C84B31)", color: L.navCtaColor||"#fff", border: "none", borderRadius: 10, padding: "8px 16px", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>{libelleCtaNavCourt}</button>
          </div>
        </div>
        {/* Dropdown menu (desktop + mobile) */}
        {menuOpen&&<div style={{ position: "relative", zIndex: 10, maxWidth: 1200, margin: "0 auto", padding: "0 0 16px" }}>
          <div style={{ background: "#FDFBF8", borderRadius: 16, padding: 12, boxShadow:"0 24px 70px rgba(0,0,0,.28)", border:"1px solid rgba(0,0,0,.06)", animation:"menuDrop .2s ease" }}>
            {[
              {sec:"Outils & ressources",items:[
                ["🧮","Outils & simulateurs gratuits","Mensualisation, salaire, CMG, indemnités","outils","#5DA9A1"],
                ["📚","Blog & ressources","Guides pratiques pour le métier","blog-section","#C09553"],
                ["🛒","Boutique","Kits, fiches et templates prêts à l'emploi","boutique","#E49178"],
              ]},
              {sec:"Découvrir TiMat",items:[
                ["👨‍👩‍👧","Pour les parents","Ce que votre espace parent propose","parents-page","#5DA9A1"],
                ["✨","Fonctionnalités","Cahier de liaison, paie, contrats, déclarations","demo","#5DA9A1"],
                ["💶","Tarifs","Forfaits Gratuit et Pro","tarifs","#C09553"],
                ["🔑","Connexion / Inscription","Accéder à votre espace","login","#2E4859"],
              ]},
            ].map(g=><div key={g.sec} style={{marginBottom:6}}>
              <div style={{fontSize:11.5,fontWeight:700,color:"#9AAAB2",textTransform:"uppercase",letterSpacing:".6px",padding:"8px 12px 4px"}}>{g.sec}</div>
              {g.items.map(([ic,label,desc,target,c])=>
                <button key={target} onClick={()=>{setMenuOpen(false);if(target==="parents-page")window.location.href="/parents";else if(target==="outils")window.location.href="/outils.html";else if(target==="boutique")window.location.href="/boutique.html";else if(target==="login")setShowModal(true);else if(target==="blog-section")window.location.href="/blog";else document.getElementById(target)?.scrollIntoView({behavior:"smooth"});}}
                  style={{ width:"100%",background: "transparent", color: "#2E4859", border: "none", padding: "11px 12px", cursor: "pointer", textAlign: "left", borderRadius: 12, display:"flex", alignItems:"center", gap:13, transition:"background .15s, transform .12s, box-shadow .15s" }}
                  onMouseEnter={e=>{e.currentTarget.style.background=c+"14";e.currentTarget.style.transform="translateX(4px)";e.currentTarget.style.boxShadow="0 4px 14px "+c+"22";}} onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="none";}}>
                  <span style={{fontSize:22,width:42,height:42,borderRadius:12,background:c+"1A",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><IconeOuEmoji e={ic}/></span>
                  <span style={{minWidth:0}}>
                    <span style={{display:"block",fontSize:14.5,fontWeight:700}}>{label}</span>
                    <span style={{display:"block",fontSize:12,color:"#5F7A86",marginTop:1}}>{desc}</span>
                  </span>
                </button>
              )}
            </div>)}
          </div>
        </div>}
        {/* Hero content : texte a gauche, telephone anime a droite */}
        {/* Le badge : ce qui rassure en premier n'est pas qui a fait
            l'application, c'est qu'elle suive la convention. */}
        <div style={{ position:"relative", zIndex:1, textAlign:"center", marginBottom:22 }}>
          <span style={{ display:"inline-flex", alignItems:"center", gap:8, background:L.heroBadgeBg||"rgba(93,169,161,.15)", border:"1px solid "+(L.heroBadgeBorder||"rgba(93,169,161,.38)"), borderRadius:22, padding:"7px 16px", fontSize:11.5, color:L.heroBadgeColor||"#BFE3DE", fontWeight:700, letterSpacing:".9px", textTransform:"uppercase" }}>
            <span aria-hidden="true" style={{ width:7, height:7, borderRadius:"50%", background:"#5DA9A1", flexShrink:0 }}/>
            {T.heroBadge}
          </span>
        </div>
        <div className="lp-hero-grid" style={{ position: "relative", zIndex: 1 }}>
          <div className="lp-hero-text" style={{ textAlign: L.heroAlign||"center" }}>
            {/* Un h1, pas un div. index.html en pose un, puis React remplaçait
                tout le corps par des div : la page servie n'avait plus aucun
                titre de niveau 1, et c'est le DOM rendu que Google lit. */}
            <h1 style={{ maxWidth: isWeb?(L.heroTitleMaxW||620):"none", margin:"0 auto 16px", fontFamily: fTitle, fontSize: "clamp(24px,4.4vw,50px)", fontWeight: 700, color: L.heroTitleColor||"#FFFFFF", lineHeight: 1.14 }}>
              {T.heroTitle}<br/>
              {T.heroTitleAccent&&<span style={{ color: L.heroAccentColor||"#F0A98F", fontStyle: "italic" }}>{T.heroTitleAccent}</span>}
            </h1>
            <div style={{ fontSize: "clamp(15px,2vw,19px)", color: L.heroSubColor||"rgba(255,255,255,.88)", lineHeight: 1.5, marginBottom: 24, fontWeight: 500, whiteSpace: "pre-line", maxWidth: 480, marginLeft:"auto", marginRight:"auto" }}>{T.heroSub}</div>

            {/* LES DEUX PORTES D'ENTRÉE.
                Le hero posait un seul bouton — « 2 mois offerts » — et quatre
                encadrés de chiffres. Une visiteuse devait deviner si la page
                s'adressait à elle : une assistante maternelle et un parent
                employeur n'ont ni le même compte, ni le même prix, ni le même
                parcours. On le lui demande, c'est tout. */}
            <div className="lp-hero-roles">
              <button onClick={() => { setShowModal(true); setRole("asmat"); }}
                style={{ background: L.heroBtnPrimBg||"#B4543F", color: L.heroBtnPrimColor||"#fff", border:"none", borderRadius:13, padding:"14px 44px", fontSize:15, fontWeight:700, fontFamily:"inherit", cursor:"pointer", textAlign:"center", position:"relative", width:"100%", boxShadow:"0 8px 22px rgba(180,84,63,.3)" }}>
                {T.heroRoleAsmat}
                <small style={{ display:"block", fontSize:11.5, fontWeight:400, marginTop:2, opacity:.88 }}>{T.heroRoleAsmatSub}</small>
                <span aria-hidden="true" style={{ position:"absolute", right:16, top:"50%", transform:"translateY(-50%)", fontSize:15 }}>→</span>
              </button>
              <button onClick={() => { window.location.href="/parents"; }}
                style={{ background: L.heroBtnSecBg||"rgba(255,255,255,.07)", color: L.heroBtnSecColor||"#fff", border:"1.5px solid "+(L.heroBtnSecBorder||"rgba(255,255,255,.28)"), borderRadius:13, padding:"14px 44px", fontSize:15, fontWeight:600, fontFamily:"inherit", cursor:"pointer", textAlign:"center", position:"relative", width:"100%" }}>
                {T.heroRoleParent}
                <small style={{ display:"block", fontSize:11.5, fontWeight:400, marginTop:2, opacity:.86 }}>{T.heroRoleParentSub}</small>
                <span aria-hidden="true" style={{ position:"absolute", right:16, top:"50%", transform:"translateY(-50%)", fontSize:15 }}>→</span>
              </button>
            </div>
            {/* Une troisième voie, pour qui ne veut encore s'engager à rien :
                un calcul tout de suite, sans compte. */}
            <button onClick={() => { window.location.href="/outils.html"; }}
              style={{ display:"block", width:"100%", margin:"12px auto 0", background:"none", border:"none", fontFamily:"inherit", fontSize:13, fontWeight:600, color:L.heroLienColor||"#BFE3DE", textDecoration:"underline", textUnderlineOffset:3, cursor:"pointer" }}>{T.heroOutilTxt}</button>
          </div>
          <div className="lp-hero-visual">
            <HeroPhone screen={<AccueilAssMat enfants={demoEnfants} user={D.asmat} setPage={setDemoPage} demoStats={demoAccueilStats}/>}/>
            <button onClick={() => document.getElementById("demo")?.scrollIntoView({ behavior: "smooth" })}
              style={{ display:"block", margin:"18px auto 0", background:"none", border:"none", fontFamily:"inherit", fontSize:12.5, fontWeight:600, color:L.heroLienColor||"#BFE3DE", textDecoration:"underline", textUnderlineOffset:3, cursor:"pointer" }}>{T.heroBtnSecTxt}</button>
            <div className="lp-hero-tags">
              {(T.heroTags||"").split(",").map(t=>t.trim()).filter(Boolean).map(t => <span key={t} style={{ fontSize: 11, color: L.heroTagsColor||"rgba(255,255,255,.82)", fontWeight: 500, background:"rgba(255,255,255,.08)", border:"1px solid rgba(255,255,255,.18)", borderRadius:99, padding:"6px 11px" }}>{t}</span>)}
            </div>
          </div>
        </div>
      </div>

      <div style={{display:"flex",flexDirection:"column"}}>
      {/* SECTION 1 - PROBLEME + SOLUTION combinés */}
      {SV.probleme!==false&&<div className="lp-section" style={{ order:ord("probleme"), background: L.section1Bg||"linear-gradient(160deg,#20303C,#2E4859)" }}>
        <WaveDivider color={L.wave1||L.section1Bg||"#20303C"} on={L.wavesOn!==false&&L.waveOn1!==false}/>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 14 }}>
              <div style={{ display:"inline-block", background:"rgba(158,83,65,.10)", border:"1px solid rgba(158,83,65,.28)", borderRadius:20, padding:"5px 16px", fontSize:11, color:"#9E5341", fontWeight:700, letterSpacing:".8px", marginBottom:18 }}>LA RÉALITÉ DU MÉTIER</div>
              <h2 style={{ margin:0, fontFamily: fTitle, fontSize: "clamp(23px,4vw,38px)", color: L.s1TitleColor||"#fff", fontWeight: 700, marginBottom: 12, lineHeight:1.2 }}>{L.s1Title||"Votre métier, c'est l'enfant. Pas la paperasse."}</h2>
              <div style={{ fontSize: 15, color: L.s1DescColor||"rgba(255,255,255,.65)", lineHeight: 1.6, maxWidth:620, margin:"0 auto" }}>{L.s1Desc||"Les calculs, les déclarations, les papiers… TiMat s'en occupe."}</div>
            </div>
          </FadeIn>
          {/* TABLEAU COMPARATIF Sans/Avec (editable back-office : L.tableRows) */}
          <div style={{ marginTop:30, maxWidth:760, marginLeft:"auto", marginRight:"auto", background:"#FFFFFF", border:"1px solid #EDE6DE", borderRadius:16, overflow:"hidden" }}>
            <div style={{ display:"grid", gridTemplateColumns:"1.35fr 1fr 1fr" }}>
              <div style={{ padding:"11px 12px" }}></div>
              <div style={{ padding:"11px 8px", textAlign:"center", fontSize:11.5, fontWeight:800, letterSpacing:".5px", textTransform:"uppercase", color:L.comboPbColor||"#FF8C82", background:"rgba(255,140,130,.09)" }}>{L.comboLabelBefore||"Sans TiMat"}</div>
              <div style={{ padding:"11px 8px", textAlign:"center", fontSize:11.5, fontWeight:800, letterSpacing:".5px", textTransform:"uppercase", color:L.comboSolColor||"#83C0B8", background:"rgba(131,192,184,.11)" }}>{L.comboLabelAfter||"Avec TiMat"}</div>
            </div>
            {((L.tableRows&&L.tableRows.trim())?L.tableRows:TABLE_ROWS_DEFAULT).split("\n").filter(Boolean).map((line,i)=>{
              const p=line.split("|");
              const ic=(p[0]||"").trim(), t=(p[1]||"").trim(), st=(p[2]||"").trim(), sans=(p[3]||"").trim(), avec=(p[4]||"").trim();
              return <FadeIn key={i} delay={i*60}>
                <div style={{ display:"grid", gridTemplateColumns:"1.35fr 1fr 1fr", borderTop:"1px solid #EDE6DE" }}>
                  <div style={{ padding:"12px 12px", minWidth:0 }}>
                    <span style={{ display:"block", fontSize:12.5, fontWeight:700, color:L.tableTitleColor||"#fff", lineHeight:1.3 }}><IconeOuEmoji e={ic}/> {t}</span>
                    {st&&<span style={{ display:"block", fontSize:11, color:L.tableSubColor||"rgba(255,255,255,.5)", marginTop:2, lineHeight:1.35 }}>{st}</span>}
                  </div>
                  <div style={{ padding:"12px 8px", textAlign:"center", background:"rgba(255,140,130,.05)", minWidth:0 }}>
                    <span style={{ display:"block", fontSize:11, color:L.tableSansColor||"rgba(255,255,255,.62)", marginTop:3, lineHeight:1.4 }}>{sans}</span>
                  </div>
                  <div style={{ padding:"12px 8px", textAlign:"center", background:"rgba(131,192,184,.07)", minWidth:0 }}>
                    <span style={{ display:"block", fontSize:11, color:L.tableAvecColor||"#A8D5CE", marginTop:3, lineHeight:1.4, fontWeight:600 }}>{avec}</span>
                  </div>
                </div>
              </FadeIn>;
            })}
          </div>
          <FadeIn delay={350}>
            <div style={{ maxWidth:600, margin:"18px auto 0", textAlign:"center", fontSize:13, color:"#55707C", lineHeight:1.6 }}>
              {L.tableFooter||"Vous n'avez pas choisi ce métier pour faire de la comptabilité. TiMat s'occupe du reste."}
            </div>
          </FadeIn>
          <FadeIn delay={400}>
            <div style={{ marginTop:36, textAlign:"center" }}>
              <button onClick={() => { setShowModal(true); setRole("asmat"); }} style={{ background:"#B4543F", color:"#fff", border:"none", borderRadius:12, padding:"14px 32px", fontSize:15, fontWeight:700, cursor:"pointer", boxShadow:"0 8px 24px rgba(180,84,63,.28)" }}>Alléger mon quotidien →</button>
            </div>
          </FadeIn>
        </div>
      </div>}

      <BandeauPhoto order={ord("photo1")} src="/hero-enfants.webp" position="50% 74%"
        alt="Des petites voitures posées sur un tapis de jeu." />

      {/* SECTION 2 - DEMO */}
      {blocDemo}

      {/* SECTION SIGNATURE ELECTRONIQUE P13 - differentiateurs vs concurrents */}
      {SV.signature!==false&&<div className="lp-section" style={{ order:ord("signature"), background: L.section4Bg||"linear-gradient(160deg,#FDFBF8,#F4F1EA)" }}>
        <WaveDivider color={L.wave4||L.section4Bg||"#FDFBF8"} on={L.wavesOn!==false&&L.waveOn4!==false}/>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(158,83,65,.10)", border: "1px solid rgba(158,83,65,.28)", borderRadius: 20, padding: "5px 16px", fontSize: 11, color: "#9E5341", marginBottom: 16, fontWeight: 700, letterSpacing: ".8px" }}>
                POURQUOI TIMAT
              </div>
              <h2 style={{ margin:0, fontFamily: fTitle, fontSize: "clamp(24px,4vw,42px)", color: L.s4TitleColor||"#2E4859", fontWeight: 700, marginBottom: 14, lineHeight: 1.2 }}>
                La gestion assistante maternelle <span style={{ color: "#9E5341", fontStyle: "italic" }}>sans mauvaise surprise</span>
              </h2>
              <div style={{ fontSize: 15, color: L.s4SubColor||"#6B7A82", lineHeight: 1.7, maxWidth: 720, margin: "0 auto" }}>
                Salaire, mensualisation, indemnités, congés payés et déclaration Pajemploi : tout est calculé à partir de vos présences réelles, conforme à la convention collective. Et côté tarif, aucune surprise.
              </div>
            </div>
          </FadeIn>

          {/* Differenciateurs (editables via back-office : L.diffN* + diffNPuces) */}
          <div style={{ display:"grid", gridTemplateColumns:isWeb?"repeat(3,1fr)":"1fr", gap:10, maxWidth:isWeb?980:720, margin:"0 auto", marginBottom: 24 }}>
            {[
              { ic: L.diff1Ic||"🏛️", badge: L.diff1Badge||"Unique", titre: L.diff1Titre||"Le métier, pas seulement les calculs", puces: L.diff1Puces||"Les exigences de la PMI, département par département\n28 guides pratiques, gratuits et sourcés\nChaque règle citée, pour que vous puissiez vérifier" },
              { ic: L.diff2Ic||"✅", badge: L.diff2Badge||"Exclusif", titre: L.diff2Titre||"Le suivi des versements", puces: L.diff2Puces||"Voyez qui a vraiment payé\nRelances des retards en 1 clic\nUn suivi rare sur le marché" },
              { ic: L.diff3Ic||"✍️", badge: L.diff3Badge||"Zéro impression", titre: L.diff3Titre||"Signez en ligne, sans imprimer", puces: L.diff3Puces||"Contrats & avenants signés en 1 clic\nAucune impression, aucun scan\nArchivés en sécurité (conforme eIDAS)" }
            ].map((d, i) => (
              <FadeIn key={d.titre} delay={i * 60}>
                <details open={isWeb} style={{ background:"#FFFFFF", border:"1px solid #EDE6DE", borderRadius:14, overflow:"hidden", height:isWeb?"100%":"auto" }}>
                  <summary onClick={e=>{if(isWeb)e.preventDefault();}} style={{ display:"flex", alignItems:"center", gap:12, padding:"16px 18px", cursor:isWeb?"default":"pointer", listStyle:"none" }}>
                    <span style={{ fontSize:26, lineHeight:1, flexShrink:0 }}><IconeOuEmoji e={d.ic} taille={26}/></span>
                    <span style={{ flex:1, minWidth:0 }}>
                      <span style={{ display:"block", fontFamily:fTitle, fontSize:15.5, fontWeight:700, color:"#2E4859", lineHeight:1.25 }}>{d.titre}</span>
                      <span style={{ display:"inline-block", marginTop:4, background:"rgba(93,169,161,.15)", color:"#3E8079", fontSize:11, fontWeight:700, padding:"3px 8px", borderRadius:20, letterSpacing:".3px", textTransform:"uppercase" }}>{d.badge}</span>
                    </span>
                    {!isWeb&&<span className="acc-plus" style={{ color:"#C84B31", fontSize:20, fontWeight:700, flexShrink:0 }}>+</span>}
                  </summary>
                  <div style={{ padding:"0 18px 16px", display:"flex", flexDirection:"column", gap:8 }}>
                    {d.puces.split("\n").filter(Boolean).map((p,j)=>(
                      <div key={j} style={{ display:"flex", gap:8, alignItems:"flex-start", fontSize:13, color:"#68767E", lineHeight:1.5 }}>
                        <span style={{ color:"#47807A", fontWeight:800, flexShrink:0 }}>✓</span><span>{p}</span>
                      </div>
                    ))}
                  </div>
                </details>
              </FadeIn>
            ))}
          </div>

          {/* Comment ca marche - accordeon compact */}
          <FadeIn delay={300}>
            <details open={isWeb} style={{ background:"#FFFFFF", border:"1px solid #EDE6DE", borderRadius:16, boxShadow:"0 4px 18px rgba(46,72,89,.05)", maxWidth:isWeb?900:720, margin:"0 auto", overflow:"hidden" }}>
              <summary style={{ display:"flex", alignItems:"center", gap:12, padding:"18px 20px", cursor:"pointer", listStyle:"none" }}>
                <span style={{ fontSize:24, lineHeight:1, flexShrink:0 }}>🚀</span>
                <span style={{ flex:1, minWidth:0 }}>
                  <span style={{ display:"block", fontFamily:fTitle, fontSize:17, fontWeight:700, color:"#2E4859" }}>Comment ça marche ?</span>
                  <span style={{ display:"block", fontSize:12.5, color:"#827369", marginTop:2 }}>Prête à l'emploi en quelques minutes.</span>
                </span>
                <span className="cmt-plus" style={{ color:"#C84B31", fontSize:20, fontWeight:700, flexShrink:0 }}>+</span>
              </summary>
              <div style={{ padding:"0 20px 20px", display:"flex", flexDirection:"column", gap:10 }}>
                {[
                  { n: "1", ic:"👶", t: "Ajoutez vos enfants", d: "Créez chaque fiche et invitez le parent en un lien." },
                  { n: "2", ic:"⏰", t: "Pointez les présences", d: "Arrivées, départs et absences en un tap, au quotidien." },
                  { n: "3", ic:"🧮", t: "TiMat calcule tout", d: "Salaire, mensualisation, indemnités et congés, automatiquement." },
                  { n: "4", ic:"📄", t: "Signez & déclarez", d: "Contrats signés en 1 clic et déclaration Pajemploi prête." }
                ].map((st) => (
                  <div key={st.n} style={{ display:"flex", gap:12, alignItems:"flex-start", background:"#FAF6F1", borderRadius:12, border:"1px solid #F0E7DC", padding:"12px 14px" }}>
                    <span style={{ width:24, height:24, borderRadius:"50%", background:"#B4543F", color:"#fff", fontSize:12, fontWeight:800, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:1 }}>{st.n}</span>
                    <span style={{ flex:1, minWidth:0 }}>
                      <span style={{ display:"block", fontFamily:fTitle, fontSize:14.5, fontWeight:700, color:"#2E4859", marginBottom:2 }}><IconeOuEmoji e={st.ic}/> {st.t}</span>
                      <span style={{ display:"block", fontSize:12.5, color:"#7A6A60", lineHeight:1.55 }}>{st.d}</span>
                    </span>
                  </div>
                ))}
              </div>
            </details>
          </FadeIn>

          {/* Le mot de la fondatrice. Il dit d'ou vient TiMat, et il ne
              revendique aucun statut que Sophie ne puisse prouver : CAP petite
              enfance, plusieurs annees en creche, un agrement en cours. Une
              visiteuse qui verifierait ne trouverait rien a redire, et c'est
              tout l'interet d'une preuve sociale honnete quand on n'a pas
              encore d'avis a montrer. */}
          {L.signatureTexte !== "" && <FadeIn delay={400}>
            <div style={{ maxWidth: isWeb?760:560, margin:"24px auto 0", background:"#FFFFFF", border:"1px solid #EDE6DE", borderLeft:"3px solid "+accent, borderRadius:14, padding:isWeb?"24px 28px":"20px 20px", boxShadow:"0 4px 18px rgba(46,72,89,.05)" }}>
              <div style={{ fontSize:14.5, color:"#42555E", lineHeight:1.75, fontStyle:"italic", whiteSpace:"pre-line" }}>
                {L.signatureTexte || "J'ai un CAP petite enfance et j'ai travaillé plusieurs années en crèche. J'ai créé TiMat en préparant mon propre agrément, quand j'ai découvert la montagne administrative que le métier impose et que personne n'explique nulle part. Chaque calcul de l'application s'appuie sur un texte que je cite, pour que vous puissiez le vérifier vous-même."}
              </div>
              <div style={{ marginTop:14, fontSize:12.5, fontWeight:700, color:"#2E4859" }}>
                {L.signatureAuteur || "Sophie, fondatrice de TiMat"}
              </div>
            </div>
          </FadeIn>}

        </div>
      </div>}

      {/* SECTION CONFIDENTIALITE P4 - photos privees / hebergement France (differentiateur vs concurrents) */}
      {SV.confidentialite!==false&&<div className="lp-section" style={{ order:ord("confidentialite"), background: L.sectionConfBg||"linear-gradient(160deg,#FDFBF8,#F4F1EA)" }}>
        <WaveDivider color={L.waveConf||"#FDFBF8"} on={L.wavesOn!==false&&L.waveOnConf!==false}/>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign:"center", marginBottom: 36 }}>
              <div style={{ fontFamily:fTitle, fontSize:"clamp(22px,4vw,34px)", color:"#2E4859", fontWeight:700, marginBottom:10 }}>Vos photos et vos données restent chez vous</div>
              <div style={{ fontSize:15, color:"#626F77", maxWidth:560, margin:"0 auto", lineHeight:1.6 }}>La confiance avant tout : rien n'est jamais public, rien ne part sur les réseaux sociaux.</div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:isWeb?"repeat(3,1fr)":"1fr", gap:10, maxWidth:isWeb?900:640, margin:"0 auto" }}>
              {[
                ["📸","Photos privées","Partagées uniquement entre vous et le parent, dans l'espace sécurisé. Jamais publiques, jamais sur les réseaux sociaux."],
                ["🇫🇷","Hébergées en France","Vos données et celles des enfants ne quittent pas le territoire. Conformes RGPD, chiffrées en transit et au repos."],
                ["🗑️","Vous gardez le contrôle","Documents archivés en sécurité, consultables à tout moment, et supprimables sur simple demande."]
              ].map(([emo,t,d])=>(
                <details key={t} open={isWeb} style={{ background:"#fff", border:"1px solid #EDE6DE", borderRadius:14, overflow:"hidden", height:isWeb?"100%":"auto" }}>
                  <summary onClick={e=>{if(isWeb)e.preventDefault();}} style={{ display:"flex", alignItems:"center", gap:12, padding:"15px 18px", cursor:isWeb?"default":"pointer", listStyle:"none" }}>
                    <span style={{ fontSize:22, lineHeight:1, flexShrink:0 }}>{emo}</span>
                    <span style={{ flex:1, fontFamily:fTitle, fontSize:15.5, fontWeight:700, color:"#2E4859" }}>{t}</span>
                    {!isWeb&&<span className="acc-plus" style={{ color:"#C84B31", fontSize:20, fontWeight:700, flexShrink:0 }}>+</span>}
                  </summary>
                  <div style={{ padding:"0 18px 15px", fontSize:13.5, color:"#697880", lineHeight:1.6 }}>{d}</div>
                </details>
              ))}
            </div>
          </FadeIn>
        </div>
      </div>}

      {/* SECTION SOURCES — ce sur quoi les calculs s'appuient */}
      {SV.sources!==false&&<div className="lp-section" style={{ order:ord("sources"), background: L.sectionSourcesBg||"#F7F2EC" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign:"center", marginBottom: 32 }}>
              <div style={{ display:"inline-block", background:"rgba(158,83,65,.10)", border:"1px solid rgba(158,83,65,.28)", borderRadius:20, padding:"5px 16px", fontSize:11, color:"#9E5341", fontWeight:700, letterSpacing:".8px", marginBottom:16 }}>SUR QUOI ÇA S'APPUIE</div>
              <h2 style={{ margin:0, fontFamily: fTitle, fontSize:"clamp(22px,4vw,36px)", color: L.sourcesTitleColor||"#2E4859", fontWeight:700, marginBottom:10, lineHeight:1.25 }}>{L.sourcesTitle}</h2>
              <div style={{ fontSize:15, color: L.sourcesDescColor||"#55707C", lineHeight:1.6, maxWidth:560, margin:"0 auto" }}>{L.sourcesDesc}</div>
            </div>
          </FadeIn>
          <div style={{ display:"grid", gridTemplateColumns:isWeb?"repeat(2,1fr)":"1fr", gap:10, maxWidth:isWeb?720:640, margin:"0 auto" }}>
            {[
              ["Convention collective","IDCC 3239","Salaire, mensualisation, congés, indemnités et préavis suivent la convention des particuliers employeurs et de l'emploi à domicile.","Mise à jour au 1ᵉʳ juin 2026"],
              ["Déclaration","Barèmes Pajemploi et CAF","Plafonds horaires, complément de libre choix du mode de garde, crédit d'impôt : les montants en vigueur, pas ceux de l'an dernier.","Vérifiés à chaque évolution"],
            ].map(([ref,titre,texte,maj],i)=>(
              <FadeIn key={titre} delay={i*70}>
                <div style={{ background:"#FFFFFF", border:"1px solid #EDE6DE", borderRadius:14, padding:"18px 18px", height:isWeb?"100%":"auto" }}>
                  <div style={{ fontSize:10.5, letterSpacing:"1.1px", textTransform:"uppercase", color:"#2F655F", fontWeight:700, marginBottom:6 }}>{ref}</div>
                  <div style={{ fontFamily:fTitle, fontSize:15.5, color:"#2E4859", fontWeight:700, marginBottom:6 }}>{titre}</div>
                  <div style={{ fontSize:13, lineHeight:1.6, color:"#55707C" }}>{texte}</div>
                  {maj&&<div style={{ display:"inline-block", marginTop:10, fontSize:11, color:"#55707C", background:"#F7F2EC", borderRadius:20, padding:"4px 11px" }}>{maj}</div>}
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </div>}

      {/* SECTION 5 - TEMOIGNAGES */}
      {SV.temoignages===true&&<div className="lp-section" style={{ order:ord("temoignages"), background: L.section5Bg||"#FDFBF8" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <FadeIn>
            <h2 style={{ margin:0, fontFamily: fTitle, fontSize: "clamp(20px,3.5vw,32px)", color: L.s5TitleColor||"#0D1B2A", fontWeight: 700, textAlign: L.s5Align||"center", marginBottom: 48, fontStyle: "italic" }}>
              {L.s5Title}
            </h2>
          </FadeIn>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 20 }}>
            {testimonials.map((t, i) => (
              <FadeIn key={i} delay={i * 80}>
                <div style={{ background: L.testimonialBg||"#fff", borderRadius: 16, padding: 22, border: "1px solid #DDD5C8", boxShadow: "0 2px 16px rgba(44,31,20,.06)" }}>
                  <div style={{ color: L.testimonialStarColor||accent, fontSize: 13, marginBottom: 10 }}>⭐⭐⭐⭐⭐</div>
                  <div style={{ fontSize: 12, color: L.testimonialBeforeColor||"#A68970", fontStyle: "italic", marginBottom: 8 }}>"{t.avant}"</div>
                  <div style={{ fontSize: 13, color: L.testimonialAfterColor||"#2C1F14", lineHeight: 1.7, marginBottom: 14 }}>"{t.apres}"</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: L.testimonialNameColor||"#2C1F14" }}>{t.nom}</div>
                    <div style={{ fontSize: 11, color: L.testimonialCityColor||"#A68970" }}>{t.ville}</div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </div>}

      <BandeauPhoto order={ord("photo2")} src="/hero-toboggan.webp" position="50% 97%"
        alt="Un enfant sur un toboggan, cadré sur les jambes." />

      {/* SECTION 6 - TARIFS */}
      {SV.tarifs!==false&&<div id="tarifs" className="lp-section" style={{ order:ord("tarifs"), background: L.section6Bg||"#2E4859" }}>
        <WaveDivider color={L.wave6||L.section6Bg||"#2E4859"} on={L.wavesOn!==false&&L.waveOn6!==false}/>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <FadeIn>
            <h2 style={{ margin:0, fontFamily: fTitle, fontSize: "clamp(22px,4vw,36px)", color: L.s6TitleColor||"#fff", fontWeight: 700, textAlign: L.s6Align||"center", marginBottom: 10 }}>{L.s6Title}</h2>
            <div style={{ fontSize: 14, color: L.s6SubColor||"#55707C", textAlign:"center", marginBottom: 42, maxWidth:560, marginLeft:"auto", marginRight:"auto", lineHeight:1.5 }}>{L.s6Sub||"Contrats illimités, sans engagement, 2 mois offerts sans carte bancaire."}</div>
          </FadeIn>
          {/* LE COMPARATEUR EST RETIRÉ DE LA LANDING.
              Trois raisons, dans l'ordre de gravité :

              1. il affichait « 119,88 € par an » — le plus gros nombre de la
                 page — AVANT que la visiteuse n'ait vu « 9,99 € par mois ».
                 On lui présentait le total annuel, le cadrage le plus cher qui
                 soit, juste avant d'annoncer le prix ;
              2. il argumentait contre un concurrent (« une offre facturée par
                 contrat, 16,96 € ») à un moment où elle ne connaissait pas
                 encore notre propre prix. On se compare avant d'exister ;
              3. il répétait ce que la carte Pro dit déjà en une ligne : « soit
                 3,33 € par contrat à trois familles ».

              Le composant est retiré avec lui : le garder sans emploi serait
              exactement le défaut que l'audit signale ailleurs. Il est dans
              l'historique git, et sa place est de toute façon sur une page
              dédiée à la comparaison, pas dans le parcours d'achat. */}
          <div className="lp-tarifs-grid" style={{ marginTop: 26 }}>
            {/* Gratuit */}
            <div className="tarif-free" style={{ background: L.freeBg||"#fff", borderRadius: 16, border: "1.5px solid #DDD5C8", padding: 28 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: L.freeLabelColor||"#A68970", marginBottom: 10, textTransform: "uppercase", letterSpacing: "1px" }}>{T.freeLabel||"Gratuit"}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
                <span style={{ fontFamily: fTitle, fontSize: 46, fontWeight: 700, color: L.freePriceColor||"#0D1B2A" }}>{T.freePrice||"0€"}</span>
              </div>
              <div style={{ fontSize: 13, color: L.freeDescColor||"#6B4F3A", marginBottom: 22, lineHeight: 1.6 }}>{T.freeDesc||"Pour découvrir TiMat."}</div>
              <button onClick={() => { setShowModal(true); setRole("asmat"); }} style={{ width: "100%", background: L.freeBtnBg||"#0D1B2A", color: L.freeBtnColor||"#fff", border: "none", borderRadius: 10, padding: "13px", cursor: "pointer", fontWeight: 700, fontSize: 13, marginBottom: 24, fontFamily: "inherit" }}>{T.freeBtnTxt||"Commencer gratuitement"}</button>
              {(config.freeItems||DEFAULT_CONFIG.freeItems).map(([ok, t], i, arr) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13, padding: "5px 0", borderBottom: i < arr.length-1 ? "1px solid #DDD5C8" : "none" }}>
                  <span style={{ color: ok ? "#3D6B50" : "#78746D", fontWeight: 700 }}>{ok ? "✓" : "✗"}</span>
                  <span style={{ color: ok ? "#2C1F14" : "#8A725D" }}>{t}</span>
                </div>
              ))}
            </div>
            {/* Pro */}
            <div className="tarif-pro" style={{ background: L.proBg||"#FDFBF8", borderRadius: 16, border: "2.5px solid "+(L.proBorderColor||"#B8622F"), padding: 28, position: "relative", boxShadow: "0 12px 48px rgba(184,98,47,.18)" }}>
              <div style={{ position: "absolute", top: -15, left: "50%", transform: "translateX(-50%)", background: "#B4543F", color: "#fff", borderRadius: 20, padding: "5px 18px", fontSize: 11, fontWeight: 700, letterSpacing: ".8px", whiteSpace: "nowrap", animation:"badgePulse 2.2s ease-in-out infinite", boxShadow:"0 6px 18px rgba(184,98,47,.4)" }}>{T.proLabel}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: L.proLabelColor||"#B8622F", marginBottom: 10, textTransform: "uppercase", letterSpacing: "1px" }}>Pro</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
                <span style={{ fontFamily: fTitle, fontSize: 46, fontWeight: 700, color: L.proPriceColor||"#B8622F" }}>{T.prixMensuel}€</span>
                <span style={{ fontSize: 13, color: "#866F5A" }}>/mois</span>
              </div>
              <div style={{ fontSize: 11, color: L.proSubColor||"#A68970", marginBottom: 8 }}>
                {T.proSubtxt}
                {(() => {
                  // Le prix par contrat est ce qu'une assistante maternelle compare a ce
                  // qu'elle facture a une famille. Il se derive du forfait : l'ecrire en
                  // dur le ferait diverger au premier changement de tarif.
                  const f = parseFloat(String(T.prixMensuel||"").replace(",", "."));
                  if (!(f > 0)) return null;
                  return <span style={{ display: "block", marginTop: 3 }}>
                    soit <b>{nbf(f/3, 2)} € par contrat</b> à trois familles
                  </span>;
                })()}
              </div>
              <div style={{ fontSize: 13, color: L.proDescColor||"#6B4F3A", marginBottom: 22, lineHeight: 1.6 }}>{T.proDesc}</div>
              <button onClick={() => { setShowModal(true); setRole("asmat"); }} style={{ width: "100%", background: L.proBtnBg||"linear-gradient(135deg,#E49178,#C76754)", color: L.proBtnColor||"#fff", border: "none", borderRadius: 10, padding: "13px", cursor: "pointer", fontWeight: 700, fontSize: 13, marginBottom: 24, fontFamily: "inherit", boxShadow: "0 4px 16px rgba(184,98,47,.35)" }}>{T.proBtnTxt}</button>
              {(config.proItems||DEFAULT_CONFIG.proItems).map((t, i, arr) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13, padding: "5px 0", borderBottom: i < arr.length-1 ? "1px solid rgba(184,98,47,.15)" : "none" }}>
                  <span style={{ color: "#3D6B50", fontWeight: 700 }}>✓</span>
                  <span style={{ color: "#2C1F14", fontWeight: i < 3 ? 700 : 400 }}>{t}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Ces trois lignes etaient en blanc EN DUR. Le fond de la section
              tarifs est passe au creme #FDFBF8 sans que les textes suivent :
              « Resiliable en 1 clic », « Pointages et messages opposables » et
              « Donnees en France » etaient invisibles en ligne, ratio 1,03. */}
          <div className="lp-guarantees" style={{color:L.guaranteesColor||"#55707C"}}>
            {(config.guarantees||DEFAULT_CONFIG.guarantees).map(g=><span key={g}>{g}</span>)}
          </div>
        </div>
      </div>}

      {/* CTA FINAL */}
      {SV.ctaFinal!==false&&<div className="lp-section" style={{ order:ord("ctaFinal"), background: L.ctaBg||"linear-gradient(135deg,#2E4859,#2A6F6A)", textAlign: L.ctaAlign||"center" }}>
        <FadeIn>
          <h2 style={{ margin:0, fontFamily: fTitle, fontSize: "clamp(24px,5vw,46px)", color: L.ctaTitleColor||"#fff", fontWeight: 700, marginBottom: 16, lineHeight: 1.2, whiteSpace:"pre-line" }}>
            {(L.ctaTitle||"").split(L.ctaTitleAccent||"en comptabilité.")[0]}
            <span style={{ color: accent, fontStyle: "italic" }}>{L.ctaTitleAccent}</span><br/>
            <span style={{ fontSize: "clamp(16px,3vw,28px)", fontWeight: 400, color: L.ctaSubTitleColor||"rgba(255,255,255,.6)", fontStyle: "normal" }}>{L.ctaSubTitle}</span>
          </h2>
          <div style={{ fontSize: 16, color: L.ctaSubColor||"rgba(255,255,255,.5)", marginBottom: 32, maxWidth: 460, margin: "0 auto 32px", lineHeight: 1.7 }}>{T.ctaSub}</div>
          <button onClick={() => { setShowModal(true); setRole("asmat"); }} style={{ background: L.ctaBtnBg||"linear-gradient(135deg,#E49178,#C76754)", color: L.ctaBtnColor||"#fff", border: "none", borderRadius: 12, padding: "16px 36px", fontSize: 16, fontWeight: 700, cursor: "pointer", boxShadow: "0 8px 32px rgba(184,98,47,.5)", fontFamily: "inherit", letterSpacing: ".3px" }}>{T.ctaBtnTxt}</button>
          <div style={{ marginTop: 16, fontSize: 12, color: L.ctaFooterColor||"rgba(255,255,255,.35)" }}>{T.ctaFooter}</div>
        </FadeIn>
      </div>}

      {/* FAQ */}
      {SV.faq!==false&&<div className="lp-section" style={{ order:ord("faq"), background: L.faqBg||"#FDFBF8" }}>
        <WaveDivider color={L.waveFaq||L.faqBg||"#FDFBF8"} on={L.wavesOn!==false&&L.waveOnFaq!==false}/>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <h2 style={{ margin:0, fontFamily: fTitle, fontSize: "clamp(22px,4vw,36px)", color: L.faqTitleColor||"#2E4859", fontWeight: 700, marginBottom: 10 }}>Questions fréquentes</h2>
              <div style={{ fontSize: 15, color: L.faqDescColor||"#6B7A82" }}>Tout ce que vous devez savoir avant de commencer.</div>
            </div>
          </FadeIn>
          {(config.faqLanding||DEFAULT_CONFIG.faqLanding).slice(0,showAllFaq?undefined:5).map(({q,a},i)=>(
            <FadeIn key={i} delay={i*50}>
              <details className="faq-item" style={{ marginBottom: 8, background: "#fff", borderRadius: 12, border: "1px solid #E8E4E0", overflow: "hidden" }}>
                <summary style={{ padding: "16px 20px", cursor: "pointer", fontSize: 14, fontWeight: 600, color: "#2E4859", listStyle: "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  {q}
                  <span style={{ fontSize: 18, color: "#9E6553", flexShrink: 0, marginLeft: 12, display:"inline-block" }}>+</span>
                </summary>
                <div className="faq-ans" style={{ padding: "0 20px 16px", fontSize: 13, color: "#5F7A86", lineHeight: 1.8 }}>{a}</div>
              </details>
            </FadeIn>
          ))}
          {(config.faqLanding||DEFAULT_CONFIG.faqLanding).length>5&&(
            <div style={{ textAlign:"center", marginTop:18 }}>
              <button onClick={()=>setShowAllFaq(v=>!v)} style={{ background:"transparent", border:"1.5px solid rgba(228,145,120,.5)", color:"#BC472E", fontWeight:700, fontSize:13, padding:"11px 22px", borderRadius:24, cursor:"pointer", fontFamily:"inherit" }}>
                {showAllFaq?"Réduire les questions ↑":"Voir les "+((config.faqLanding||DEFAULT_CONFIG.faqLanding).length-5)+" autres questions ↓"}
              </button>
            </div>
          )}
        </div>
      </div>}

      {/* BLOG */}
      {SV.blog===true&&<div id="blog-section" className="lp-section" style={{ order:ord("blog"), background: L.blogBg||"#2E4859" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <h2 style={{ margin:0, fontFamily: fTitle, fontSize: "clamp(22px,4vw,36px)", color: L.blogTitleColor||"#fff", fontWeight: 700, marginBottom: 10 }}>Ressources pour les assmats</h2>
              <div style={{ fontSize: 15, color: L.blogDescColor||"rgba(255,255,255,.7)" }}>Guides pratiques, conseils et informations utiles pour votre quotidien.</div>
            </div>
          </FadeIn>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
            {(config.blog||DEFAULT_CONFIG.blog).map((art,i)=>(
              <FadeIn key={art.id} delay={i*80}>
                <div className="blog-card" onClick={()=>{window.location.href=(art.slug?"/blog/"+art.slug:"/blog");}} style={{
                  background:"#fff",borderRadius:16,overflow:"hidden",cursor:"pointer",
                  border:"1px solid #E8E4E0",boxShadow:"0 2px 12px rgba(0,0,0,.04)"
                }}>
                  <div style={{height:120,background:"linear-gradient(135deg,"+art.catColor+"15,"+art.catColor+"08)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:48}}>{art.emoji}</div>
                  <div style={{padding:"16px 20px"}}>
                    <div style={{fontSize:11,fontWeight:700,color:art.catColor,textTransform:"uppercase",letterSpacing:".8px",marginBottom:8}}>{art.cat}</div>
                    <div style={{fontSize:15,fontWeight:700,color:"#2E4859",lineHeight:1.4,marginBottom:8}}>{art.title}</div>
                    <div style={{fontSize:12,color:"#5F7A86",lineHeight:1.6}}>{art.excerpt}</div>
                    <div style={{marginTop:12,fontSize:12,color:L.lienBlogColor||"#9E6553",fontWeight:600}}>Lire l'article <span className="blog-arrow" style={{display:"inline-block"}}>→</span></div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </div>}
      </div>


      {/* BOUTIQUE MODAL */}
      <ScrollTopBtn/>
      {showBoutique&&<div onClick={e=>e.target===e.currentTarget&&setShowBoutique(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:250,padding:20}}>
        <div style={{background:"#FDFBF8",borderRadius:20,width:"100%",maxWidth:800,maxHeight:"90vh",overflow:"auto",boxShadow:"0 24px 80px rgba(0,0,0,.3)",padding:32}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
            <div style={{fontFamily:fTitle,fontSize:22,fontWeight:700,color:"#2E4859"}}><IconeOuEmoji e="🛒" taille={22}/> Boutique TiMat</div>
            <button onClick={()=>setShowBoutique(false)}style={{background:"#F4F7FA",border:"none",borderRadius:10,padding:"8px 12px",cursor:"pointer",fontSize:13,color:"#2E4859",fontWeight:700}}>✕</button>
          </div>
          <div style={{fontSize:13,color:"#5F7A86",marginBottom:24,lineHeight:1.6}}>Templates et outils pour simplifier votre quotidien d'assistante maternelle. Paiement securise par Stripe.</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:16}}>
            {[
              {id:"kit_sheets",name:"Kit de gestion",price:"14,90",desc:"Jusqu'a 4 contrats : heures jour par jour, mensualisation, conges payes, recap annuel.",icon:"📊",color:"#5DA9A1",link:config.boutique?.linkSheets},
              {id:"fiche_urgence",name:"Fiche d'urgence",price:"6,90",desc:"Le document a afficher, que la PMI regarde. A remplir et imprimer.",icon:"🚨",color:"#C84B31",link:config.boutique?.linkFiche},
              {id:"projet_accueil",name:"Projet d'accueil",price:"12,90",desc:"13 sections guidees, adossees au referentiel national qualite 2025.",icon:"🌿",color:"#2E4859",link:config.boutique?.linkProjet},
              {id:"registre_medicaments",name:"Registre des medicaments",price:"6,90",desc:"Document obligatoire : consignation, autorisation parentale type.",icon:"💊",color:"#5DA9A1",link:config.boutique?.linkRegistre},
              {id:"pack_complet",name:"Pack Complet",price:"34,90",desc:"Les 4 produits reunis (-16%).",icon:"🎁",color:"#E49178",badge:"-16%",link:config.boutique?.linkPack},
            ].map(p=><div key={p.id}style={{background:"#fff",borderRadius:14,overflow:"hidden",border:"1px solid #E8E4E0",display:"flex",flexDirection:"column"}}>
              <div style={{height:70,background:"linear-gradient(135deg,"+p.color+"18,"+p.color+"08)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,position:"relative"}}>
                {p.icon}
                {p.badge&&<div style={{position:"absolute",top:6,right:6,background:p.color,color:"#fff",borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:700}}>{p.badge}</div>}
              </div>
              <div style={{padding:14,flex:1,display:"flex",flexDirection:"column"}}>
                <div style={{fontWeight:700,fontSize:13,color:"#2E4859",marginBottom:4}}>{p.name}</div>
                <div style={{fontSize:11,color:"#5F7A86",lineHeight:1.5,flex:1,marginBottom:10}}>{p.desc}</div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:16,fontWeight:700,color:p.color}}>{p.price} €</span>
                  <button onClick={()=>{if(p.link){window.open(p.link,"_blank");}else{alert("Lien de paiement non configure. Allez dans le Backoffice > App > Boutique pour ajouter vos liens Stripe.");}}}style={{background:p.color,color:"#fff",border:"none",borderRadius:10,padding:"8px 16px",cursor:"pointer",fontSize:12,fontWeight:700}}>Acheter →</button>
                </div>
              </div>
            </div>)}
          </div>
          <div style={{marginTop:16,textAlign:"center",fontSize:11,color:"#B0BEC5"}}><IconeOuEmoji e="🔒"/> Paiement securise par Stripe · Telechargement immediat apres achat</div>
        </div>
      </div>}

      {/* FOOTER */}
      <footer style={{ background: L.footerBg||"#C46A5C", padding: "48px 24px 24px", color: L.footerTextColor||"rgba(255,255,255,.85)", position:"relative" }}>
        <WaveDivider color={L.waveFooter||L.footerBg||"#C46A5C"} on={L.wavesOn!==false&&L.waveOnFooter!==false}/>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 32, marginBottom: 32 }}>
            {/* Logo + description */}
            <div>
              <div className="lp-logo" style={{ fontFamily: fTitle, marginBottom: 12 }}>
                <img src={L?.logoUrl || "/logo.webp"} alt="TiMat" style={{height:(L?.logoSizes?.landingFooter)||40,objectFit:"contain",filter:"brightness(0) invert(1)"}} onError={e=>{e.target.style.display="none"; const fallback=document.createElement("span"); fallback.style.color="#fff"; fallback.style.fontWeight="700"; fallback.style.fontSize="20px"; fallback.textContent="TiMat"; e.target.parentNode.appendChild(fallback);}}/>
              </div>
              <div style={{ fontSize: 12, lineHeight: 1.7, color: "rgba(255,255,255,.59)" }}>
                {F.description}
              </div>
            </div>
            {/* Ressources — guides et outils réunis (maillage interne SEO) */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.9)", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 12 }}>Ressources</div>
              {[["Espace parent employeur","/parents"],["Calcul de mensualisation","/blog/calcul-mensualisation-assistante-maternelle"],["Congés payés","/blog/conges-payes-assistante-maternelle"],["Salaire net, brut & coût","/blog/salaire-assistante-maternelle-net-brut"],["Déclaration Pajemploi","/blog/pajemploi-declaration-assistante-maternelle"],["Tous les guides","/blog"],["Simulateur de salaire","/simulateur-salaire-assistante-maternelle.html"],["Simulateur congés payés","/simulateur-conges-payes-assistante-maternelle.html"],["Indemnités d'entretien","/simulateur-indemnite-entretien-assistante-maternelle.html"],["Coût & CMG (parents)","/simulateur-cmg-reste-a-charge.html"],["Tous les outils","/outils.html"]].map(([label,href])=>
                <a key={href} href={href} style={{ display:"block", fontSize: 12.5, color: "rgba(255,255,255,.72)", textDecoration:"none", padding: "10px 0", transition:"color .15s" }} onMouseEnter={e=>e.target.style.color="#fff"} onMouseLeave={e=>e.target.style.color="rgba(255,255,255,.6)"}>{label}</a>
              )}
            </div>
            {/* Légal */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.9)", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 12 }}>Légal</div>
              {[["Mentions légales","mentions"],["Conditions générales d'utilisation","cgu"],["Politique de confidentialité","confidentialite"]].map(([label,id])=>
                <div key={id} onClick={()=>setShowLegal(id)} style={{ fontSize: 12, color: "rgba(255,255,255,.6)", cursor: "pointer", padding: "4px 0", transition: "color .15s" }}
                  onMouseEnter={e=>e.target.style.color="#fff"} onMouseLeave={e=>e.target.style.color="rgba(255,255,255,.6)"}>{label}</div>
              )}
            </div>
            {/* Contact */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.9)", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 12 }}>Contact</div>
              <div style={{ fontSize: 12, lineHeight: 2, color: "rgba(255,255,255,.6)" }}>
                📧 {F.contactEmail}<br/>
                🌐 {F.contactWeb}<br/>
                📍 {F.contactLieu}
              </div>
            </div>
          </div>
          {/* Séparateur */}
          <div style={{ borderTop: "1px solid rgba(255,255,255,.1)", paddingTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.59)", lineHeight: 1.9 }}>
              {(F.rgpd||[]).length ? <span style={{display:"block", color:"rgba(255,255,255,.59)"}}>{(F.rgpd||[]).join(" · ")}</span> : null}
              © {new Date().getFullYear()} TiMat — Tous droits réservés · Auto-entrepreneur {config.legal?.nom} · SIRET : {config.legal?.siret}
            </div>
            <div style={{ display: "flex", gap: 16 }}>
              {[["Mentions légales","mentions"],["CGU","cgu"],["Confidentialité","confidentialite"]].map(([l,id])=>
                <span key={id} onClick={()=>setShowLegal(id)} style={{ fontSize: 11, color: "rgba(255,255,255,.59)", cursor: "pointer" }}
                  onMouseEnter={e=>e.target.style.color="#fff"} onMouseLeave={e=>e.target.style.color="rgba(255,255,255,.4)"}>{l}</span>
              )}
            </div>
          </div>
        </div>
      </footer>

      {/* BARRE D'ACTION — le prix et une seule action, une fois le hero passé.
          Elle n'existe que pour la visiteuse qui a lu et qui redescend : tant
          qu'elle est dans le hero, les deux boutons de rôle suffisent. */}
      {!preview&&<div className="lp-barre" style={{
        position:"fixed", bottom:"calc(16px + env(safe-area-inset-bottom,0px))", zIndex:190,
        display:"flex", alignItems:"center", gap:isWeb?22:14,
        background:"rgba(46,72,89,.97)", backdropFilter:"blur(10px)", color:"#fff",
        border:"1px solid rgba(255,255,255,.14)",
        borderRadius:18,
        padding:isWeb?"13px 14px 13px 24px":"12px 12px 12px 18px",
        boxShadow:"0 14px 40px rgba(13,27,42,.4)",
        transform: "translateX(-50%) " + (heroPasse?"translateY(0)":"translateY(180%)"),
        pointerEvents: heroPasse?"auto":"none",
      }}>
        {/* La bulle : elle dit l'offre au-dessus du prix, là où l'œil arrive
            en premier, plutôt que de la reléguer en petit sous le montant. */}
        <span className="lp-barre-bulle" aria-hidden="true" style={{
          position:"absolute", top:-11, left:24, background:"#B4543F", color:"#fff",
          borderRadius:99, padding:"3px 11px", fontSize:10.5, fontWeight:700,
          letterSpacing:".5px", textTransform:"uppercase", whiteSpace:"nowrap",
          boxShadow:"0 4px 12px rgba(13,27,42,.3)" }}>{T.prixEssai}</span>
        <div style={{ fontFamily:fTitle, fontWeight:700, fontSize:isWeb?22:19, lineHeight:1.1, whiteSpace:"nowrap" }}>
          {T.prixMensuel} €
          <span style={{ display:"block", fontFamily:fBody, fontSize:isWeb?12.5:11, fontWeight:400, color:"rgba(255,255,255,.72)" }}>
            par mois{isWeb?", contrats illimités":""}
          </span>
        </div>
        <button onClick={() => { setShowModal(true); setRole("asmat"); }} style={{
          marginLeft:"auto", background:"#B4543F", color:"#fff", border:"none", borderRadius:12,
          padding:isWeb?"13px 22px":"12px 16px", fontSize:isWeb?15:13.5, fontWeight:700, fontFamily:"inherit",
          cursor:"pointer", whiteSpace:"nowrap" }}>{isWeb?T.barreBtnTxt:"Je démarre"}</button>
      </div>}

      {/* PAGES JURIDIQUES */}
      {showLegal&&<div onClick={e=>e.target===e.currentTarget&&setShowLegal(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:250,padding:20}}>
        <div style={{background:"#fff",borderRadius:20,width:"100%",maxWidth:700,maxHeight:"90vh",overflow:"hidden",boxShadow:"0 24px 80px rgba(0,0,0,.3)",display:"flex",flexDirection:"column"}}>
          {/* Header */}
          <div style={{padding:"20px 24px",borderBottom:"1px solid #E8E4E0",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
            <div style={{fontFamily:fTitle,fontSize:18,fontWeight:700,color:"#2E4859"}}>
              {showLegal==="mentions"&&"📋 Mentions légales"}
              {showLegal==="cgu"&&"📜 Conditions générales d'utilisation"}
              {showLegal==="confidentialite"&&"🔒 Politique de confidentialité"}
            </div>
            <button onClick={()=>setShowLegal(null)}style={{background:"#F4F7FA",border:"none",borderRadius:10,padding:"8px 12px",cursor:"pointer",fontSize:13,color:"#2E4859",fontWeight:700}}>✕</button>
          </div>
          {/* Contenu scrollable */}
          <div style={{padding:"24px",overflowY:"auto",fontSize:13,color:"#2E4859",lineHeight:1.8}}>

            {/* =================== MENTIONS LÉGALES =================== */}
            {showLegal==="mentions"&&<div>
              <h3 style={{fontSize:15,fontWeight:700,color:"#2E4859",marginBottom:12}}>1. Éditeur du site</h3>
              <p>Le site <strong>timat.app</strong> (ci-après "TiMat") est édité par :</p>
              <div style={{background:"#F4F7FA",borderRadius:10,padding:14,margin:"12px 0",fontSize:12,lineHeight:2}}>
                <strong>{config.legal?.nom}</strong><br/>
                Auto-entrepreneur<br/>
                SIRET : {config.legal?.siret}<br/>
                Adresse : {config.legal?.adresse}<br/>
                Email : {config.legal?.email}<br/>
                Directrice de la publication : {config.legal?.nom}
              </div>

              <h3 style={{fontSize:15,fontWeight:700,color:"#2E4859",margin:"20px 0 12px"}}>2. Hébergement</h3>
              <div style={{background:"#F4F7FA",borderRadius:10,padding:14,margin:"12px 0",fontSize:12,lineHeight:2}}>
                <strong>Site web :</strong> Vercel Inc. — 340 S Lemon Ave #4133, Walnut, CA 91789, USA<br/>
                <strong>Base de données :</strong> Supabase — Région Europe (Paris, France)<br/>
                <strong>Paiement :</strong> Stripe — Certifié PCI-DSS Level 1
              </div>

              <h3 style={{fontSize:15,fontWeight:700,color:"#2E4859",margin:"20px 0 12px"}}>3. Propriété intellectuelle</h3>
              <p>L'ensemble du contenu du site TiMat (textes, graphismes, logos, icônes, images, logiciels) est la propriété exclusive de l'éditeur, sauf mentions contraires. Toute reproduction, représentation, modification ou distribution, même partielle, est interdite sans autorisation écrite préalable.</p>

              <h3 style={{fontSize:15,fontWeight:700,color:"#2E4859",margin:"20px 0 12px"}}>4. Données personnelles</h3>
              <p>TiMat collecte et traite des données personnelles dans le respect du Règlement Général sur la Protection des Données (RGPD — Règlement UE 2016/679). Pour plus de détails, consultez notre <span style={{color:"#E49178",cursor:"pointer",textDecoration:"underline"}}onClick={()=>setShowLegal("confidentialite")}>Politique de confidentialité</span>.</p>

              <h3 style={{fontSize:15,fontWeight:700,color:"#2E4859",margin:"20px 0 12px"}}>5. Cookies</h3>
              <p>TiMat utilise uniquement des cookies techniques nécessaires au fonctionnement de l'application (authentification, session). Aucun cookie publicitaire ou de traçage n'est utilisé. Aucun cookie tiers n'est déposé à des fins commerciales.</p>

              <h3 style={{fontSize:15,fontWeight:700,color:"#2E4859",margin:"20px 0 12px"}}>6. Limitation de responsabilité</h3>
              <p>Les calculs de salaire, récapitulatifs Pajemploi, attestations fiscales et bulletins de paie générés par TiMat sont fournis <strong>à titre indicatif</strong>. L'utilisateur reste seul responsable de la vérification des montants auprès des organismes compétents (URSSAF, Pajemploi, Administration fiscale). TiMat ne saurait être tenu responsable d'erreurs dans les déclarations effectuées par l'utilisateur.</p>

              <h3 style={{fontSize:15,fontWeight:700,color:"#2E4859",margin:"20px 0 12px"}}>7. Contact</h3>
              <p>Pour toute question : <strong>support@timat.app</strong></p>

              <div style={{marginTop:20,padding:12,background:"#F0FAF4",borderRadius:10,fontSize:11,color:"#5F7A86"}}>
                Dernière mise à jour : {new Date().toLocaleDateString("fr-FR",{month:"long",year:"numeric"})}
              </div>
            </div>}

            {/* =================== CGU =================== */}
            {showLegal==="cgu"&&<div>
              <h3 style={{fontSize:15,fontWeight:700,color:"#2E4859",marginBottom:12}}>1. Objet</h3>
              <p>Les présentes Conditions Générales d'Utilisation (CGU) régissent l'accès et l'utilisation de l'application TiMat. En créant un compte, l'utilisateur accepte sans réserve les présentes CGU.</p>

              <h3 style={{fontSize:15,fontWeight:700,color:"#2E4859",margin:"20px 0 12px"}}>2. Description du service</h3>
              <p>TiMat est une application de gestion administrative destinée aux assistantes maternelles agréées et aux parents employeurs. Elle propose notamment : la gestion des contrats d'accueil, le calcul automatique des salaires, le pointage des heures, les transmissions quotidiennes, la génération de documents (bulletins de salaire, attestations), et la communication avec les parents.</p>

              <h3 style={{fontSize:15,fontWeight:700,color:"#2E4859",margin:"20px 0 12px"}}>3. Inscription et comptes</h3>
              <p>L'utilisateur doit fournir des informations exactes lors de son inscription. Chaque compte est personnel et ne peut être partagé. L'utilisateur est responsable de la confidentialité de ses identifiants. En cas d'utilisation frauduleuse, l'éditeur se réserve le droit de suspendre le compte.</p>

              <h3 style={{fontSize:15,fontWeight:700,color:"#2E4859",margin:"20px 0 12px"}}>4. Formules et tarification</h3>
              <p><strong>Formule Gratuite :</strong> accès limité (1 enfant, fonctionnalités de base).</p>
              <p><strong>Formule Pro :</strong> 9,99€/mois TTC. Tout compte d'assistante maternelle s'ouvre sur un essai de 2 mois offerts, à compter de la création du compte. <strong>Aucune carte bancaire n'est demandée pour cet essai</strong>, et aucun abonnement n'est créé pendant sa durée : il ne peut donc pas se transformer en prélèvement. Un rappel est envoyé 7 jours puis 3 jours avant la fin.</p>
              <p>À l'issue des 2 mois, le compte repasse automatiquement en formule gratuite. <strong>Aucune donnée n'est supprimée</strong> : enfants, pointages, contrats et documents sont conservés, seules les fonctions de la formule Pro cessent d'être accessibles. Reprendre l'abonnement les rouvre en l'état.</p>
              <p>La carte bancaire n'est demandée qu'au moment de souscrire l'abonnement, si vous choisissez de continuer. L'abonnement est alors mensuel et résiliable à tout moment sans frais depuis l'espace utilisateur. Le paiement est géré par Stripe (prestataire certifié PCI-DSS). Aucune donnée bancaire n'est stockée par TiMat.</p>

              <h3 style={{fontSize:15,fontWeight:700,color:"#2E4859",margin:"20px 0 12px"}}>5. Données et contenu utilisateur</h3>
              <p>L'utilisateur reste propriétaire de toutes les données qu'il saisit dans TiMat (informations sur les enfants, contrats, pointages, transmissions, documents). TiMat ne revendique aucun droit de propriété sur ces données. L'utilisateur peut exporter ou supprimer ses données à tout moment.</p>

              <h3 style={{fontSize:15,fontWeight:700,color:"#2E4859",margin:"20px 0 12px"}}>6. Protection des données des mineurs</h3>
              <p>TiMat traite des données relatives à des enfants (prénoms, dates de naissance, informations de santé). Ces données sont traitées conformément au RGPD avec une attention particulière :</p>
              <ul style={{paddingLeft:20,margin:"8px 0"}}>
                <li>Collecte limitée au strict nécessaire pour le service</li>
                <li>Accès restreint aux seuls parents et assistantes maternelles concernés</li>
                <li>Aucune utilisation commerciale ou publicitaire</li>
                <li>Suppression à la fin du contrat d'accueil ou sur demande</li>
              </ul>

              <h3 style={{fontSize:15,fontWeight:700,color:"#2E4859",margin:"20px 0 12px"}}>7. Limitation de responsabilité</h3>
              <p>TiMat est un outil d'aide à la gestion. Les calculs, documents et informations fournis le sont <strong>à titre indicatif</strong> et ne constituent pas un conseil juridique, fiscal ou comptable. L'utilisateur reste seul responsable de ses déclarations auprès des organismes officiels.</p>

              <h3 style={{fontSize:15,fontWeight:700,color:"#2E4859",margin:"20px 0 12px"}}>8. Résiliation</h3>
              <p>L'utilisateur peut résilier son abonnement Pro à tout moment depuis son espace, sans frais. Les données restent accessibles pendant 30 jours après résiliation. Passé ce délai, elles sont supprimées définitivement. L'éditeur se réserve le droit de suspendre un compte en cas de non-respect des CGU.</p>

              <h3 style={{fontSize:15,fontWeight:700,color:"#2E4859",margin:"20px 0 12px"}}>9. Disponibilité du service</h3>
              <p>TiMat s'engage à fournir un service disponible 24h/24, 7j/7. Toutefois, des interruptions pour maintenance ou mise à jour peuvent survenir. L'éditeur ne saurait être tenu responsable des conséquences d'une interruption temporaire du service.</p>

              <h3 style={{fontSize:15,fontWeight:700,color:"#2E4859",margin:"20px 0 12px"}}>10. Droit applicable et litiges</h3>
              <p>Les présentes CGU sont soumises au droit français. En cas de litige, une solution amiable sera privilégiée. À défaut, les tribunaux compétents du ressort du siège de l'éditeur seront saisis.</p>

              <div style={{marginTop:20,padding:12,background:"#F0FAF4",borderRadius:10,fontSize:11,color:"#5F7A86"}}>
                Dernière mise à jour : {new Date().toLocaleDateString("fr-FR",{month:"long",year:"numeric"})}
              </div>
            </div>}

            {/* =================== POLITIQUE DE CONFIDENTIALITÉ =================== */}
            {showLegal==="confidentialite"&&<div>
              <h3 style={{fontSize:15,fontWeight:700,color:"#2E4859",marginBottom:12}}>1. Responsable du traitement</h3>
              <div style={{background:"#F4F7FA",borderRadius:10,padding:14,margin:"12px 0",fontSize:12,lineHeight:2}}>
                {config.legal?.nom} — Auto-entrepreneur<br/>
                Email : {config.legal?.email}<br/>
                SIRET : {config.legal?.siret}
              </div>

              <h3 style={{fontSize:15,fontWeight:700,color:"#2E4859",margin:"20px 0 12px"}}>2. Données collectées</h3>
              <p>TiMat collecte les données suivantes :</p>
              <div style={{background:"#F4F7FA",borderRadius:10,padding:14,margin:"12px 0",fontSize:12}}>
                <p><strong>Données d'identification :</strong> prénom, nom, adresse email, mot de passe (chiffré)</p>
                <p style={{marginTop:8}}><strong>Données professionnelles :</strong> numéro d'agrément, adresse, informations contractuelles</p>
                <p style={{marginTop:8}}><strong>Données relatives aux enfants :</strong> prénom, date de naissance, informations de santé (allergies, vaccins), suivi quotidien (repas, sommeil, activités)</p>
                <p style={{marginTop:8}}><strong>Données de facturation :</strong> heures d'accueil, salaires calculés (les données bancaires sont gérées exclusivement par Stripe)</p>
                <p style={{marginTop:8}}><strong>Données techniques :</strong> adresse IP, type de navigateur, pages visitées (à des fins de maintenance uniquement)</p>
              </div>

              <h3 style={{fontSize:15,fontWeight:700,color:"#2E4859",margin:"20px 0 12px"}}>3. Finalités du traitement</h3>
              <ul style={{paddingLeft:20,margin:"8px 0"}}>
                <li>Fourniture du service de gestion administrative pour assistantes maternelles</li>
                <li>Calcul automatique des salaires et génération de documents</li>
                <li>Communication entre assistantes maternelles et parents</li>
                <li>Support utilisateur</li>
                <li>Amélioration du service</li>
              </ul>
              <p style={{marginTop:8}}><strong>Base légale :</strong> exécution du contrat (Art. 6.1.b RGPD) et consentement explicite pour les données des mineurs.</p>

              <h3 style={{fontSize:15,fontWeight:700,color:"#2E4859",margin:"20px 0 12px"}}>4. Hébergement et sécurité</h3>
              <div style={{background:"#F0FAF4",borderRadius:10,padding:14,margin:"12px 0",fontSize:12,lineHeight:2}}>
                🔒 Base de données : <strong>Supabase</strong> — Région Europe, Paris (France)<br/>
                🌐 Site web : <strong>Vercel</strong> — CDN mondial, données en Europe<br/>
                💳 Paiement : <strong>Stripe</strong> — Certifié PCI-DSS Level 1<br/>
                🛡️ Chiffrement : TLS 1.3 en transit, AES-256 au repos<br/>
                🔑 Mots de passe : hachés avec bcrypt (irréversible)<br/>
                📋 Row Level Security (RLS) : chaque utilisateur n'accède qu'à ses propres données
              </div>

              <h3 style={{fontSize:15,fontWeight:700,color:"#2E4859",margin:"20px 0 12px"}}>5. Durée de conservation</h3>
              <p><strong>Les durées dépendent de qui décide de la donnée.</strong> TiMat ne fixe librement que celles dont elle est responsable ; pour les données professionnelles de l'assistante maternelle, elle n'est qu'hébergeur et ne supprime rien de sa propre initiative.</p>
              <p style={{marginTop:10}}><strong>Données dont TiMat est responsable</strong></p>
              <ul style={{paddingLeft:20,margin:"8px 0"}}>
                <li><strong>Compte :</strong> conservé tant qu'il est actif. La suppression demandée depuis Paramètres est <strong>immédiate</strong>, sans délai de grâce.</li>
                <li><strong>Compte inactif :</strong> signalé après 2 ans sans connexion, supprimé après vous avoir averti (recommandation CNIL).</li>
                <li><strong>Facturation et comptabilité de TiMat :</strong> 10 ans (article L123-22 du code de commerce).</li>
                <li><strong>Prospection :</strong> 3 ans après le dernier contact.</li>
                <li><strong>Messages de support :</strong> 2 ans.</li>
                <li><strong>Journaux de connexion :</strong> 12 mois.</li>
                <li><strong>Preuves de consentement :</strong> 5 ans.</li>
              </ul>
              <p style={{marginTop:10}}><strong>Données dont l'assistante maternelle est responsable</strong></p>
              <p>Le dossier de l'enfant, les pointages, les contrats et les bulletins sont conservés aussi longtemps qu'elle en a l'usage, et effacés à sa demande ou avec son compte. TiMat ne les supprime pas d'office à la fin d'un accueil : ces pièces justifient les bulletins de salaire, et un salarié dispose de trois ans pour réclamer un rappel de salaire. Les effacer automatiquement priverait l'assistante maternelle de ses propres preuves.</p>
              <p style={{marginTop:8}}>Un parent qui supprime son compte est détaché du dossier sans que celui-ci soit détruit, pour la même raison.</p>
              <p style={{marginTop:10}}><strong>À la fin de votre abonnement</strong></p>
              <p>Le RGPD (article 28.3.g) impose à TiMat, en tant que sous-traitante, de vous <strong>restituer ou supprimer</strong> vos données professionnelles à la fin de la prestation, <strong>à votre choix</strong>, et de détruire les copies existantes.</p>
              <p style={{marginTop:8}}>Concrètement : votre espace reste consultable et exportable pendant <strong>30 jours</strong> après la fin de l'abonnement, pour vous laisser récupérer vos dossiers. Passé ce délai, sans choix exprimé de votre part, les données sont supprimées. Vous pouvez à tout moment demander leur suppression immédiate, ou une attestation écrite de suppression, à support@timat.app.</p>
              <p style={{marginTop:8,fontSize:12,color:"#5F7A86"}}>Les pièces relevant d'une obligation légale de conservation — la facturation de TiMat notamment — échappent à cette suppression, comme le prévoit ce même article.</p>
              <p style={{marginTop:10,fontSize:12,color:"#5F7A86"}}>Ces durées sont appliquées automatiquement, chaque mois, et non seulement annoncées.</p>

              <h3 style={{fontSize:15,fontWeight:700,color:"#2E4859",margin:"20px 0 12px"}}>6. Vos droits (RGPD)</h3>
              <p>Conformément au RGPD, vous disposez des droits suivants :</p>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:8,margin:"12px 0"}}>
                {[["📋","Droit d'accès","Obtenir une copie de vos données"],["✏️","Droit de rectification","Corriger vos informations"],["🗑️","Droit à l'effacement","Supprimer votre compte et vos données"],["📦","Droit à la portabilité","Exporter vos données au format standard"],["🚫","Droit d'opposition","Vous opposer à certains traitements"],["⏸️","Droit à la limitation","Limiter temporairement le traitement"]].map(([ic,titre,desc])=>
                  <div key={titre}style={{background:"#F4F7FA",borderRadius:10,padding:12}}>
                    <div style={{fontSize:16,marginBottom:4}}><IconeOuEmoji e={ic}/></div>
                    <div style={{fontSize:12,fontWeight:700,color:"#2E4859"}}>{titre}</div>
                    <div style={{fontSize:11,color:"#5F7A86"}}>{desc}</div>
                  </div>
                )}
              </div>
              <p style={{marginTop:8}}>Pour exercer vos droits : <strong>support@timat.app</strong>. Réponse sous 30 jours maximum.</p>

              <h3 style={{fontSize:15,fontWeight:700,color:"#2E4859",margin:"20px 0 12px"}}>7. Sous-traitants</h3>
              <div style={{background:"#F4F7FA",borderRadius:10,padding:14,margin:"12px 0",fontSize:12}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,fontSize:11}}>
                  <div><strong>Sous-traitant</strong></div><div><strong>Finalité</strong></div><div><strong>Localisation</strong></div>
                  <div>Supabase</div><div>Base de données</div><div>🇫🇷 Paris, France</div>
                  <div>Vercel</div><div>Hébergement web</div><div>🇪🇺 Europe (CDN)</div>
                  <div>Stripe</div><div>Paiement</div><div>🇪🇺 Europe (Dublin)</div>
                  <div>Have I Been Pwned</div><div>Contrôle des mots de passe fuités</div><div>🌍 Cloudflare (mondial)</div>
                </div>
              </div>
              <p>Tous les sous-traitants sont conformes au RGPD et bénéficient de garanties contractuelles appropriées.</p>
              <div style={{background:"#F0FAF4",border:"1px solid #B7E4C7",borderRadius:10,padding:14,margin:"12px 0",fontSize:12,lineHeight:1.7}}>
                <strong>Le contrôle des mots de passe fuités, en détail.</strong> À l'inscription et au changement de mot
                de passe, votre navigateur interroge le service <em>Have I Been Pwned</em> pour vérifier que le mot de
                passe choisi ne figure pas dans une fuite de données connue. <strong>Votre mot de passe ne quitte jamais
                votre appareil</strong> : seuls les <strong>cinq premiers caractères</strong> de son empreinte SHA-1 sont
                transmis. Ces cinq caractères correspondent à des centaines de milliers de mots de passe différents ;
                le service renvoie la liste complète des empreintes commençant ainsi, et c'est votre navigateur qui
                cherche dedans. Le service ne peut donc pas savoir laquelle vous concernait, ni même si vous en avez
                trouvé une. Si le service est injoignable, l'inscription se poursuit normalement.
              </div>

              <h3 style={{fontSize:15,fontWeight:700,color:"#2E4859",margin:"20px 0 12px"}}>8. Transferts hors UE</h3>
              <p>Les données sont hébergées en France et en Europe. En cas de transfert vers les États-Unis (CDN Vercel), celui-ci est encadré par les clauses contractuelles types de la Commission européenne.</p>

              <h3 style={{fontSize:15,fontWeight:700,color:"#2E4859",margin:"20px 0 12px"}}>9. Cookies</h3>
              <p>TiMat utilise uniquement des cookies techniques strictement nécessaires (authentification, session). Aucun cookie publicitaire, analytique ou de traçage n'est utilisé. Aucun consentement spécifique n'est requis pour ces cookies (Art. 82 de la loi Informatique et Libertés).</p>

              <h3 style={{fontSize:15,fontWeight:700,color:"#2E4859",margin:"20px 0 12px"}}>10. Réclamation</h3>
              <p>Si vous estimez que vos droits ne sont pas respectés, vous pouvez adresser une réclamation à la CNIL (Commission Nationale de l'Informatique et des Libertés) : <strong>www.cnil.fr</strong></p>

              <div style={{marginTop:20,padding:12,background:"#F0FAF4",borderRadius:10,fontSize:11,color:"#5F7A86"}}>
                Dernière mise à jour : {new Date().toLocaleDateString("fr-FR",{month:"long",year:"numeric"})}
              </div>
            </div>}

          </div>
        </div>
      </div>}

      {/* MODALE VITRINE : remplace l'authentification avant l'ouverture */}
      {/* La liste d'attente. Elle remplace la modale « Ouverture très bientôt »
          qui disait la même chose et ne recueillait rien : la personne repartait
          sans qu'on puisse la prévenir le jour de l'ouverture. */}
      <ModaleListeAttente ouverte={showBientot} fermer={()=>setShowBientot(false)}/>

      {/* MODALE AUTH */}
      {showModal && (
        <div onClick={e => e.target === e.currentTarget && setShowModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20 }}>
          <div style={{ background: "#FDFAF8", borderRadius: 20, width: "100%", maxWidth: 420, overflow: "hidden", boxShadow: "0 24px 80px rgba(0,0,0,.5)", maxHeight:"95vh", overflowY:"auto" }}>
            <div style={{ padding: 24, borderTop: role === "asmat" ? "4px solid #C76754" : "4px solid #2E4859" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <div style={{ fontFamily: fTitle, fontSize: 18, fontWeight: 700, color: "#0D1B2A" }}>{role === "asmat" ? "Espace pro" : "Espace famille"}</div>
                  <div style={{ fontSize: 11, color: "#A68970", marginTop: 2 }}>{modeAuth === "inscription" ? (role === "asmat" ? "2 mois gratuits · sans carte" : "Inscription gratuite") : "Content de vous revoir !"}</div>
                </div>
                <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#A68970" }}>✕</button>
              </div>
              <div style={{ display:"flex", marginBottom:16, background:"#F6F7F6", borderRadius:10, padding:3 }}>
                {["inscription","connexion"].map(m => (
                  <button key={m} onClick={() => { setModeAuth(m); setErr(""); setErrAction(null); setResetInfo(""); }} style={{ flex:1, padding:"8px", border:"none", cursor:"pointer", borderRadius:10, background: modeAuth===m ? (role==="asmat"?"#C76754":"#2E4859") : "transparent", color: modeAuth===m ? "#fff" : "#6B4F3A", fontWeight:600, fontSize:12, fontFamily:"inherit", transition:"all .15s" }}>{m==="inscription" ? "Créer un compte" : "Se connecter"}</button>
                ))}
              </div>
              <form onSubmit={e=>{e.preventDefault(); if(loading||(modeAuth==="inscription"&&!consentValide))return; modeAuth==="connexion"?connexion():inscription();}}>
              {modeAuth === "inscription" && <>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
                  <div>
                    <div style={{ fontSize:11, fontWeight:700, color:"#A68970", marginBottom:4, textTransform:"uppercase", letterSpacing:".5px" }}>Prénom *</div>
                    <input name="prenom" autoComplete="given-name" value={form.prenom} onChange={e=>setForm(f=>({...f,prenom:e.target.value}))} placeholder={role==="asmat"?"Marie":"Sophie"} style={{ width:"100%", padding:"10px 12px", borderRadius:10, border:"1.5px solid #DDD5C8", fontSize:13, outline:"none", boxSizing:"border-box", fontFamily:"inherit" }} />
                  </div>
                  <div>
                    <div style={{ fontSize:11, fontWeight:700, color:"#A68970", marginBottom:4, textTransform:"uppercase", letterSpacing:".5px" }}>Nom</div>
                    <input name="nom" autoComplete="family-name" value={form.nom} onChange={e=>setForm(f=>({...f,nom:e.target.value}))} placeholder="Dupont" style={{ width:"100%", padding:"10px 12px", borderRadius:10, border:"1.5px solid #DDD5C8", fontSize:13, outline:"none", boxSizing:"border-box", fontFamily:"inherit" }} />
                  </div>
                </div>
              </>}
              <div style={{ marginBottom:10 }}>
                <div style={{ fontSize:11, fontWeight:700, color:"#A68970", marginBottom:4, textTransform:"uppercase", letterSpacing:".5px" }}>Email *</div>
                <input type="email" name="email" autoComplete="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder={role === "asmat" ? "marie@email.fr" : "parent@email.fr"} style={{ width:"100%", padding:"11px 14px", borderRadius:10, border:"1.5px solid #DDD5C8", fontSize:13, outline:"none", boxSizing:"border-box", fontFamily:"inherit" }} />
              </div>
              <div style={{ marginBottom: modeAuth==="inscription" ? 14 : 20 }}>
                <div style={{ fontSize:11, fontWeight:700, color:"#A68970", marginBottom:4, textTransform:"uppercase", letterSpacing:".5px" }}>Mot de passe *</div>
                <input type="password" name="password" autoComplete={modeAuth==="inscription"?"new-password":"current-password"} value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} placeholder={modeAuth==="inscription" ? MDP_AIDE : "Votre mot de passe"} style={{ width:"100%", padding:"11px 14px", borderRadius:10, border:"1.5px solid #DDD5C8", fontSize:13, outline:"none", boxSizing:"border-box", fontFamily:"inherit" }} />
              </div>
              {modeAuth === "inscription" && <div style={{ background:"#F6F7F6", borderRadius:10, padding:"12px 14px", marginBottom:14 }}>
                <div style={{ fontSize:11, fontWeight:700, color:"#A68970", marginBottom:8, textTransform:"uppercase", letterSpacing:".5px" }}>Vos données</div>
                {[{k:"politique", l:"J'accepte la politique de confidentialité", req:true},{k:"cgu", l:"J'accepte les conditions générales d'utilisation", req:true},{k:"newsletter", l:"Recevoir les actualités TiMat (optionnel)", req:false}].map(({k,l,req}) => (
                  <label key={k} style={{ display:"flex", gap:8, alignItems:"flex-start", cursor:"pointer", marginBottom:7 }}>
                    <input type="checkbox" checked={consent[k]} onChange={e=>setConsent(c=>({...c,[k]:e.target.checked}))} style={{ width:14, height:14, marginTop:2, accentColor: role==="asmat"?"#C76754":"#2E4859", flexShrink:0 }} />
                    <span style={{ fontSize:11, color:"#2C1F14", lineHeight:1.5 }}>{l}{req&&<span style={{color:"#B84060",fontWeight:700}}> *</span>}</span>
                  </label>
                ))}
                <div style={{ fontSize:11, color:"#A68970", marginTop:4 }}>* Obligatoire · Données hébergées en France · Suppression possible à tout moment</div>
              </div>}
              <BlocErreurAuth err={err} errAction={errAction} email={form.email} resetInfo={resetInfo} onSwitch={()=>{setModeAuth("connexion");setErr("");setErrAction(null);}} onReset={envoyerReset}/>
              {modeAuth==="connexion"&&errAction!=="reset"&&<div style={{textAlign:"right",marginTop:-4,marginBottom:12}}><button type="button" onClick={envoyerReset} style={{background:"none",border:"none",color:"#A68970",fontSize:12,fontWeight:600,textDecoration:"underline",cursor:"pointer",fontFamily:"inherit",padding:0}}>Mot de passe oublié ?</button></div>}
              <button type="submit" disabled={loading || (modeAuth==="inscription" && !consentValide)} style={{ width:"100%", background: role==="asmat" ? "linear-gradient(135deg,#E49178,#C76754)" : "linear-gradient(135deg,#3A5A6E,#2E4859)", color:"#fff", border:"none", borderRadius:10, padding:"13px", cursor:"pointer", fontWeight:700, fontSize:13, fontFamily:"inherit", marginBottom:16, opacity: (loading||(modeAuth==="inscription"&&!consentValide)) ? .6 : 1 }}>
                {loading ? "⏳ Chargement..." : modeAuth==="connexion" ? (role==="asmat" ? "Accéder à mon espace →" : "Accéder à l'espace famille →") : (role==="asmat" ? "Créer mon espace pro →" : "Créer mon compte parent →")}
              </button>
              </form>
              {false && (<><div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
                <div style={{ flex:1, height:1, background:"#DDD5C8" }}/><span style={{ fontSize:11, color:"#A68970" }}>ou sans inscription</span><div style={{ flex:1, height:1, background:"#DDD5C8" }}/>
              </div>
              <div style={{ background:"#F7F2EC", borderRadius:12, padding:12, border:"1.5px solid "+(role==="asmat"?"#C76754":"#2E4859") }}>
                <div style={{ fontSize:13, fontWeight:700, color:role==="asmat"?"#C76754":"#2E4859", marginBottom:2 }}>🎭 Explorer la démo</div>
                <div style={{ fontSize:11, color:"#6B4F3A", marginBottom:10, lineHeight:1.5 }}>Toute l'application avec des données d'exemple. Aucune inscription, aucune carte bancaire.</div>
                <div style={{ fontSize:11, fontWeight:700, color:"#A68970", marginBottom:8, textTransform:"uppercase", letterSpacing:".5px" }}>{role==="asmat" ? "Compte assistante maternelle" : "Comptes parents"}</div>
                {demos.filter(d=>d.role===role).map(d => (
                  <button key={d.id} onClick={()=>onLogin({...d,isDemo:true})} style={{ display:"block", width:"100%", textAlign:"left", padding:"8px 10px", background:"none", border:"none", cursor:"pointer", borderRadius:10, fontFamily:"inherit", fontSize:13, color:"#2C1F14", fontWeight:600 }} onMouseEnter={e=>e.currentTarget.style.background="#DDD5C8"} onMouseLeave={e=>e.currentTarget.style.background="none"}>
                    {d.role==="asmat"?"👩👧":"👪"} {d.label}
                    <span style={{ fontSize:11, color:"#A68970", display:"block", paddingLeft:18 }}>{d.email}</span>
                  </button>
                ))}
              </div></>)}
              <div style={{ marginTop:12, fontSize:11, color:"#A68970", textAlign:"center" }}>Données hébergées en France · Aucun engagement</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



//

//
export function BoutonAjouterEnfant({onClick,compact,user,enfants}){
  // Mieux vaut un bouton qui explique qu'un bouton qui ouvre une modale pour
  // refuser trois ecrans plus loin.
  const verrouille = user !== undefined && !peutAjouterEnfant(user, enfants);
  const style = compact?{padding:"8px 14px",fontSize:12}:{padding:"10px 18px",fontSize:13};
  if(verrouille) return <button className="btn" onClick={()=>window.dispatchEvent(new CustomEvent("timat:page",{detail:"parametres"}))}
    title="Le forfait gratuit couvre un enfant. Passez au Pro pour en accueillir davantage."
    style={{...style,background:"transparent",color:"var(--m)",border:"1.5px dashed var(--br)"}}>
    <span style={{fontSize:14,marginRight:4}}>🔒</span> Ajouter un enfant — Pro
  </button>;
  return <button className="btn bT" onClick={onClick} style={style}>
    <span style={{fontSize:15,marginRight:2}}>+</span> Ajouter un enfant
  </button>;
}

//
// Modale d'ajout d'un nouvel enfant (apres l'onboarding initial)
// 3 etapes : Enfant, Contrat, Parent (invitation), puis confirmation
const ONBOARD_STEPS=[
  {
    emoji:"🌿",
    color:"#4A7C5F",
    bg:"linear-gradient(135deg,#F0FAF4,#E8F5EE)",
    titre:"Bienvenue sur TiMat",
    sousTitre:"Fait pour vous. Par quelqu'un qui vous comprend.",
    texte:"TiMat a été créé par une développeuse passionnée de petite enfance, pour les assistantes maternelles comme vous. Ici, pas de jargon compliqué - juste les outils dont vous avez vraiment besoin, au quotidien.",
    illustration:"👩👧👦",
    btn:"Je commence →",
  },
  {
    emoji:"📋",
    color:"#E49178",
    bg:"linear-gradient(135deg,#FEF6F0,#FFF8F4)",
    titre:"Le journal du quotidien",
    sousTitre:"Ce que vous faites chaque jour, simplifié.",
    texte:"Pointages, repas, siestes, activités, transmissions aux parents... Tout se note en quelques secondes. Et si vous voulez, TiMat rédige le bilan de journée à votre place - chaleureux, précis, sans effort.",
    illustration:"✏️",
    btn:"Suivant →",
  },
  {
    emoji:"🧾",
    color:"#C49A3A",
    bg:"linear-gradient(135deg,#FFFBF0,#FEF9E8)",
    titre:"L'administratif, enfin simple",
    sousTitre:"Vous n'êtes pas comptable. On s'en occupe.",
    texte:"Salaires, bulletins, Pajemploi, contrats, avenants, courriers types... TiMat calcule, génère et archive tout. Vous n'avez plus qu'à vérifier et envoyer. Le soir, vous pouvez souffler.",
    illustration:"📊",
    btn:"Suivant →",
  },
  {
    emoji:"👪",
    color:"#3D70A0",
    bg:"linear-gradient(135deg,#F0F8FF,#EAF4FF)",
    titre:"Le lien avec les parents",
    sousTitre:"Une relation transparente, apaisée.",
    texte:"Les parents accèdent à leur propre espace : journal, pointages, contrat, messagerie. Fini les malentendus. Fini les tensions sur les heures. Tout est tracé, signé, partagé. Vous travaillez en confiance.",
    illustration:"💬",
    btn:"Suivant →",
  },
  {
    emoji:"🌸",
    color:"#6B8F71",
    bg:"linear-gradient(135deg,#F0FAF4,#EEF8F2)",
    titre:"Vous êtes prête !",
    sousTitre:"TiMat est à vous. Prenez votre temps.",
    texte:"Commencez par ajouter votre premier enfant, ou explorez librement. Si vous avez la moindre question, le centre d'aide est là. Et notre équipe vous répond en moins de 24h.",
    illustration:"🎉",
    btn:"Découvrir TiMat 🌿",
  },
];



//
//
// Accessible uniquement à sophie@faitacreas.fr (ou l'email admin configuré)

// --- Backoffice reusable components (outside to avoid re-mount on state change) ---
// Le back-office vit dans src/backoffice.jsx : il n'est chargé que sur
// la route /backoffice, pas par les visiteuses de la landing.
// WebP, pas PNG. Les huit logos par role pesaient 85 a 143 Ko chacun, en
// 1 732 px de large, pour un rendu de 56 px : PageSpeed chiffrait a lui seul le
// logo de la barre du haut a 110 Ko d'economies. Redimensionnes a 435 px — le
// plus grand usage est le logo de chargement a 64 px de haut sur un ecran x3 —
// et encodes en WebP, les huit pesent 61 Ko au total au lieu de 922.
//
// Les .png restent dans public/ : les donnees structurees et og:image les
// citent par leur nom, et ces balises-la sont lues par des robots qui ne
// negocient pas le format.
const logoForRole = (role, dark) => {
  const s = dark ? "-dark" : "";
  if(role === "parent") return `/logo${s}-parent.webp`;
  if(role === "mam") return `/logo${s}-mam.webp`;
  if(role === "creche") return `/logo${s}-creche.webp`;
  return `/logo${s}.webp`;
};

const FAQ_LANDING_DEFAULT=[
            {q:"TiMat est-il vraiment gratuit ?",a:"Oui : vous commencez gratuitement, sans carte bancaire. Votre compte s'ouvre sur 2 mois de formule Pro offerts — contrats illimités, bulletins de salaire, récapitulatif Pajemploi — sans qu'aucun moyen de paiement ne vous soit demandé. Au bout des 2 mois, le compte repasse simplement en formule gratuite si vous n'avez rien fait."},
            {q:"Les calculs sont-ils conformes à la convention collective ?",a:"Oui. Salaire, mensualisation, congés payés et indemnités sont calculés selon la convention collective des assistantes maternelles (IDCC 3239) et les règles Pajemploi à jour. Toujours le même résultat, sans erreur."},
            {q:"Mes données sont-elles en sécurité ?",a:"Oui. Vos données sont hébergées en France et conformes au RGPD, chiffrées en transit et au repos. Vos documents sont archivés en sécurité et vous pouvez demander leur suppression à tout moment."},
            {q:"Les photos et informations de mon enfant sont-elles protégées ?",a:"Oui. Les photos et le quotidien sont partagés uniquement dans l'espace privé entre le parent et l'assistante maternelle — jamais en public ni sur les réseaux sociaux. Vos données sont hébergées en France, conformes RGPD et supprimables à tout moment."},
            {q:"Puis-je gérer plusieurs enfants et contrats ?",a:"Oui. Avec la formule Pro, le nombre d'enfants et de contrats est illimité, pour un seul prix fixe — contrairement aux outils facturés par contrat, dont la note grimpe vite."},
            {q:"Y a-t-il un engagement ?",a:"Non, aucun engagement. L'essai de 2 mois ne demande aucune carte bancaire et ne crée aucun abonnement : il ne peut donc pas se transformer en prélèvement. Nous vous prévenons 7 jours puis 3 jours avant la fin. Si vous continuez, l'abonnement est mensuel et s'arrête en un clic — ni reconduction forcée ni prélèvement surprise."},
            {q:"Les parents employeurs ont-ils aussi accès ?",a:"Oui. Chaque parent est invité par un lien et dispose de son espace : présences, paie, documents et messagerie. Tout est partagé, en toute transparence."},
            {q:"Je suis parent employeur, qu'est-ce que TiMat m'apporte ?",a:"Votre espace parent regroupe présences, paie, documents et messagerie. Vous suivez le coût réel et le CMG, sans mauvaise surprise de plafond, et tout est partagé en toute transparence avec votre assistante maternelle."},
            {q:"Comment fonctionne le cahier de liaison numérique ?",a:"Repas, sieste, activités et humeur se remplissent une seule fois, même pour plusieurs enfants, et le parent les consulte en temps réel. Tout est daté et gardé en historique : un compte-rendu factuel qui évite les oublis et les malentendus."},
            {q:"TiMat fonctionne-t-il sur mon téléphone ?",a:"Oui. TiMat fonctionne dans votre navigateur, sur téléphone, tablette et ordinateur, sans rien installer. Vous êtes opérationnelle en quelques minutes, sans formation."},
            {q:"Qui a créé TiMat ?",a:"Sophie, titulaire d'un CAP petite enfance et passée par plusieurs années en crèche, qui prépare aujourd'hui son propre agrément d'assistante maternelle. TiMat est né de ce parcours : le métier impose une gestion administrative que personne n'apprend nulle part — mensualisation, congés payés, indemnités, déclaration Pajemploi. Chaque calcul de l'application s'appuie sur un texte précis, convention collective IDCC 3239 ou code de l'action sociale et des familles, et ces textes sont cités pour que vous puissiez les vérifier vous-même."},
          ];
const BLOG_DEFAULT=[
              {id:"salaire",slug:"salaire-assistante-maternelle-net-brut",cat:"Salaire et mensualisation",catColor:"#C84B31",emoji:"\uD83D\uDCB6",title:"Salaire net, brut et co\u00fbt employeur",excerpt:"4,20 \u20ac brut depuis juin 2026. Les quatre montants qu'on confond tout le temps."},
              {id:"mensualisation",slug:"calcul-mensualisation-assistante-maternelle",cat:"Salaire et mensualisation",catColor:"#9E6553",emoji:"\uD83E\uDDEE",title:"La mensualisation, sans se tromper",excerpt:"Ann\u00e9e compl\u00e8te ou incompl\u00e8te : la formule, les pi\u00e8ges et les r\u00e9gularisations."},
              {id:"heures",slug:"heures-complementaires-majorees-assistante-maternelle",cat:"Contrat et rupture",catColor:"#47807A",emoji:"\u23F1\uFE0F",title:"Heures compl\u00e9mentaires et major\u00e9es",excerpt:"Le seuil de 45 h, le taux minimum de 10 % et le plafond de 2 250 heures par an."},
              {id:"conges",slug:"conges-payes-assistante-maternelle",cat:"Cong\u00e9s pay\u00e9s",catColor:"#47807A",emoji:"\uD83C\uDF34",title:"Cong\u00e9s pay\u00e9s : 10 % ou maintien ?",excerpt:"Deux m\u00e9thodes, une seule \u00e0 retenir \u2014 la plus favorable. Et le versement mensuel interdit."},
              {id:"pajemploi",slug:"pajemploi-declaration-assistante-maternelle",cat:"Pajemploi et d\u00e9clarations",catColor:"#2E4859",emoji:"\uD83C\uDFE6",title:"D\u00e9clarer sur Pajemploi",excerpt:"Chaque rubrique expliqu\u00e9e, et la fen\u00eatre du 25 au 5 \u00e0 ne pas manquer."},
              {id:"indemnite2026",slug:"indemnite-entretien-assistante-maternelle-2026",cat:"Indemnit\u00e9 d'entretien",catColor:"#C84B31",emoji:"\uD83E\uDDF4",title:"Indemnit\u00e9 d'entretien 2026",excerpt:"3,92 \u20ac pour 9 h, 0,435 \u20ac de l'heure au-del\u00e0, plancher \u00e0 2,65 \u20ac par journ\u00e9e."}
            ];
export const DEFAULT_CONFIG = {
  cols: {T:"#E49178",S:"#8F9F92",G:"#5DA9A1",R:"#B85C38",c:"#FDFBF8",w:"#FFFFFF",b:"#2E4859"}, // P17b: palette 3-logos (marine + saumon + sauge + teal)
  txts: {
    // Le titre disait CE QUE C'EST (« une application »). Il dit maintenant
    // ce qu'elle fait disparaître. Le mot-clé « assistante maternelle » reste
    // porté par le sous-titre, le bouton de rôle, la balise <title> et le
    // contenu destiné aux robots — il n'est plus dans le h1.
    heroTitle:"Application pour assistantes maternelles",
    heroTitleAccent:"et parents employeurs.",
    heroSub:"Vous saisissez vos heures. TiMat calcule le salaire, les congés et les indemnités, et prépare votre déclaration Pajemploi.",
    heroBtn:"Commencer gratuitement →",
    prixMensuel:"9,99",
    prixEssai:"2 mois offerts",
    heroDesc:"",
    heroBadge:"Conforme à la convention IDCC 3239",
    heroSubDesc:"",
    heroBtnPrimTxt:"2 mois offerts, sans carte bancaire →",
    // La barre du bas a son propre libellé : elle porte déjà le prix et la
    // durée à gauche, reprendre le bouton du hero disait tout deux fois.
    barreBtnTxt:"Je démarre mes 2 mois offerts",
    heroBtnSecTxt:"Voir l'app en démo ↓",
    // Les deux portes d'entrée du hero, et la troisième voie sans compte.
    heroRoleAsmat:"Je suis assistante maternelle",
    heroRoleAsmatSub:"2 mois offerts, sans carte bancaire",
    heroRoleParent:"Je suis parent employeur",
    heroRoleParentSub:"Gratuit, invité par votre assistante maternelle",
    heroOutilTxt:"Calculer un salaire mensualisé — sans compte",
    heroBtnNavTxt:"Commencer gratuitement →",
    heroTags:"2 mois offerts,Sans carte bancaire,Une saisie — le reste se calcule,Données en France",
    ctaBtnTxt:"Je commence - 2 mois gratuits →",
    ctaSub:"TiMat s'occupe de ça. Pour que vous puissiez vous occuper des enfants.",
    ctaFooter:"Créé par une professionnelle de la petite enfance · Données hébergées en France 🇫🇷",
    proLabel:"⭐ TOUT INCLUS",
    proSubtxt:"quel que soit le nombre d'enfants",
    proDesc:"La solution complète. Tout est inclus.",
    proBtnTxt:"Je démarre mes 2 mois offerts →",
    freeLabel:"Gratuit",
    freeBtnTxt:"Commencer gratuitement",
    freeDesc:"1 seul enfant accueilli. Pour essayer TiMat, pas pour travailler avec plusieurs familles.",
    freePrice:"0€",
  },
  landing: {
    heroBg:"linear-gradient(165deg,#24404F 0%,#2E4859 62%,#2A4D53 100%)",
    heroImg:"",
    heroImgOpacity:0.12,
    heroImgPosition:"center center",
    heroImgBlur:2,
    logoUrl:"",
    // Le hero est marine : le logo marine y serait invisible. La variante
    // claire existe déjà dans public/. Le pied de page, lui, blanchit le logo
    // par un filtre CSS et n'a donc pas besoin de cette clé.
    logoUrlSurFonce:"/logo-dark.webp",
    logoEmoji:"🌿",
    logoSizes:{topBar:28,landingHeader:44,landingFooter:40,login:80,loading:64},
    section1Bg:"#FDFBF8",
    section2Bg:"#FDFBF8",
    section4Bg:"#FDFBF8",
    section5Bg:"#FDFBF8",
    section6Bg:"#F7F2EC",
    sectionConfBg:"#F7F2EC", faqBg:"#FDFBF8", blogBg:"#F7F2EC", footerBg:"#2E4859",
    // Meme faute en sens inverse : du blanc sur le creme #F4F1EA de la section
    // des questions. « Questions frequentes » ne se lisait pas.
    faqTitleColor:"#2E4859", faqDescColor:"#55707C",
    blogTitleColor:"#2E4859", blogDescColor:"#55707C",
    footerTextColor:"rgba(255,255,255,.7)",
    ctaBg:"linear-gradient(135deg,#24404F,#2E4859)",
    statsBg:"linear-gradient(135deg,#24404F,#2E4859)",
    // ----- BOUTONS HERO -----
    heroBtnPrimBg:"#B4543F",
    heroBtnPrimColor:"#FFFFFF",
    heroBtnSecBg:"rgba(255,255,255,.07)",
    heroBtnSecColor:"#FFFFFF",
    heroBtnNavBg:"linear-gradient(135deg,#5DA9A1,#2E4859)",
    heroBtnNavColor:"#FFFFFF",
    heroBtnTarifsBg:"rgba(255,255,255,.08)",
    heroBtnTarifsColor:"#FFFFFF",
    heroBtnConnexionBg:"rgba(255,255,255,.10)",
    heroBtnConnexionColor:"#FFFFFF",
    // ----- BOUTONS TARIFS -----
    proBtnBg:"#B4543F",
    proBtnColor:"#FFFFFF",
    freeBtnBg:"#2E4859",
    freeBtnColor:"#FFFFFF",
    // ----- BOUTON CTA FINAL -----
    ctaBtnBg:"#B4543F",
    ctaBtnColor:"#FFFFFF",
    // ----- COULEURS -----
    accentColor:"#B4543F",
    // Couleurs de texte par section
    heroTitleColor:"#FFFFFF",
    heroSubColor:"rgba(255,255,255,.88)",
    heroSubDescColor:"rgba(255,255,255,.72)",
    heroBadgeColor:"#BFE3DE",
    heroBadgeBg:"rgba(93,169,161,.15)",
    heroTagsColor:"rgba(255,255,255,.82)",
    heroLienColor:"#BFE3DE",
    s1TitleColor:"#2E4859",
    // .5 donnait 3,76:1 sur le fond ardoise de la section, sous le seuil de
    // 4,5. .65 donne 5,14 sans changer le rendu a l'oeil.
    s1DescColor:"#55707C",
    s1CardBg:"#FFFFFF",
    s1CardTitleColor:"#2E4859",
    s1CardDescColor:"#55707C",
    s1QuoteBg:"rgba(232,168,74,.08)",
    s1QuoteColor:"#E8A84A",
    // Le titre de cette section etait ecrit en #0D1B2A — exactement la couleur
    // de depart du degrade qui lui sert de fond. Il etait donc invisible, et le
    // sous-titre en brun sombre juste en dessous l'etait presque autant. Le code
    // prevoyait bien du blanc en repli ; c'est la configuration qui l'ecrasait.
    s2TitleColor:"#2E4859",
    s2DescColor:"#55707C",
    s4TitleColor:"#2E4859",
    s4SubColor:"#55707C",
    s5TitleColor:"#2E4859",
    testimonialBg:"#FFFFFF",
    testimonialNameColor:"#2C1F14",
    testimonialCityColor:"#8A725D",
    testimonialBeforeColor:"#8A725D",
    testimonialAfterColor:"#2C1F14",
    testimonialStarColor:"#976E30",
    // La section tarifs a un fond creme : ses textes doivent etre sombres.
    // Le code avait garde des replis blancs, herites du temps ou le fond
    // etait ardoise — d'ou trois lignes invisibles en ligne.
    s6TitleColor:"#2E4859",
    s6SubColor:"#55707C",
    guaranteesColor:"#55707C",
    freeBg:"#FFFFFF",
    freeLabelColor:"#55707C",
    freePriceColor:"#2E4859",
    freeDescColor:"#55707C",
    proBg:"#FFFFFF",
    proBorderColor:"#B4543F",
    proLabelColor:"#9E5341",
    // Le saumon de la marque descend a #9E6553 quand il porte du texte sur
    // fond blanc : 4,73:1 au lieu de 2,44. La teinte reste la meme.
    lienBlogColor:"#9E5341",
    heroAccentColor:"#F0A98F",
    proPriceColor:"#9E5341",
    proSubColor:"#55707C",
    proDescColor:"#55707C",
    ctaTitleColor:"#FFFFFF",
    ctaSubTitleColor:"rgba(255,255,255,.6)",
    ctaSubColor:"rgba(255,255,255,.5)",
    ctaFooterColor:"rgba(255,255,255,.35)",
    pageBg:"#FDFBF8",
    // Ces quatre clés n'existaient que comme repli littéral dans le rendu.
    // Elles étaient donc invisibles du back-office ET de l'audit des
    // contrastes, qui ne lit que DEFAULT_CONFIG : le tableau Sans/Avec
    // pouvait devenir illisible sans qu'aucune barrière ne le voie.
    // La barre de navigation est posée SUR le hero : ses couleurs suivent
    // donc le hero, pas les sections. Elles n'existaient qu'en repli littéral.
    navBtnColor:"rgba(255,255,255,.88)",
    navCtaBg:"#B4543F",
    navCtaColor:"#FFFFFF",
    navHamburgerBg:"rgba(255,255,255,.10)",
    navHamburgerColor:"#FFFFFF",
    navHamburgerBorder:"rgba(255,255,255,.30)",
    // Les quatre couleurs du tableau Sans/Avec n'existaient elles non plus
    // QUE comme repli littéral, hérité du temps où la section était sombre :
    // du blanc. La section passée au crème, la colonne de gauche est devenue
    // blanc sur blanc — et la barrière des contrastes ne voyait rien, puisque
    // ces clés n'apparaissaient nulle part dans DEFAULT_CONFIG.
    tableTitleColor:"#2E4859",
    tableSubColor:"#55707C",
    tableSansColor:"#96594A",
    tableAvecColor:"#2F655F",
    comboPbColor:"#9E5341",
    comboSolColor:"#2F655F",
    // Le thème marine ne porte pas de vagues : le contraste entre le hero
    // sombre et les deux crèmes suffit à séparer les sections.
    wavesOn:false,
    // ----- POLICES -----
    // Les MEMES piles que index.html, repli compris. Elles divergeaient :
    // « 'Quicksand', sans-serif » ici contre « 'Quicksand','Outfit',system-ui,
    // sans-serif » la-bas. Tant que Quicksand n'est pas arrivee — et sur un
    // mobile bride elle arrive apres le premier rendu — les deux hero sont donc
    // peints dans des polices differentes, avec des largeurs de ligne
    // differentes : 380 px contre 328 px pour la meme phrase. Le titre de React
    // devient alors un candidat LCP distinct, peint deux secondes plus tard.
    // C'est ce qui maintenait le LCP mobile a 3,3 s malgre tout le reste.
    fontTitle:"'Quicksand','Outfit',system-ui,sans-serif",
    fontBody:"'Outfit',system-ui,-apple-system,sans-serif",
    fontTitleWeight:"700",
    fontBodyWeight:"400",
    googleFontsUrl:"https://fonts.googleapis.com/css2?family=Quicksand:wght@500;600;700&family=Outfit:wght@300;400;500;600;700&display=swap",
    // ----- TEXTES SECTIONS -----
    s1Title:"La réalité du métier, personne n'en parle.",
    s1Desc:"Être assistante maternelle agréée, c'est exercer un métier de soin exigeant\ntout en gérant une TPE sans formation ni support.",
    s1Quote:"TiMat n'ajoute pas une appli à votre vie.\nIl retire tout ce qui n'aurait jamais dû s'y trouver.",
    // Lister les quatre domaines, puis montrer quatre onglets qui sont ces
    // mêmes quatre domaines, disait deux fois la même chose. Le titre porte
    // donc ce que couvre l'application, et la démo le prouve juste dessous.
    s2Title:"Le planning, la paie et Pajemploi, au même endroit",
    s2Desc:"Choisissez un domaine : vous voyez l'écran réel, avec des données d'exemple. Aucune inscription.",
    sectionSourcesBg:"#F7F2EC",
    sourcesTitle:"Chaque calcul s'appuie sur un texte",
    sourcesDesc:"Et vous pouvez le vérifier vous-même : voici lesquels.",
    sourcesTitleColor:"#2E4859",
    sourcesDescColor:"#55707C",
    s5Title:"Devenez l'assistante maternelle dont les parents parlent à leurs amis.",
    s6Title:"Le tarif de votre application assistante maternelle",
    ctaTitle:"Vous n'avez pas eu de formation\nen comptabilité.",
    ctaTitleAccent:"en comptabilité.",
    ctaSubTitle:"Pourtant vous en faites tous les mois.",
    // Alignements (left, center, right)
    heroAlign:"center",
    s1Align:"center",
    s2Align:"center",
    s3Align:"center",
    s4Align:"center",
    s5Align:"center",
    s6Align:"center",
    ctaAlign:"center",
  },
  painPoints:[
    {ic:"🧮",titre:"Comptable sans diplôme",desc:"Mensualisation, heures majorées, cotisations, régularisations... Des calculs que même les comptables trouvent complexes. Vous les faites seule, chaque mois."},
    {ic:"⚖️",titre:"Juriste sans formation",desc:"Contrats CCN, avenants, courriers de rupture, litiges prud'homaux... Vous portez seule la responsabilité juridique d'un employeur."},
    {ic:"🏛️",titre:"Secrétaire de la PMI",desc:"Dossiers de renouvellement, comptes-rendus de visite, suivi de l'agrément... Des démarches chronophages qui ne sont jamais finies."},
    {ic:"📱",titre:"Community manager des parents",desc:"Répondre aux messages à toute heure, documenter la journée, rassurer les parents... Une relation qui déborde souvent sur votre vie privée."},
    {ic:"🌙",titre:"Administratrice le soir",desc:"Après 10h avec les enfants, vous ouvrez l'ordinateur. Pajemploi, les factures, les tableaux Excel. Votre soirée n'existe plus."},
    {ic:"🔇",titre:"Seule face aux problèmes",desc:"Pas de collègue à qui demander. Pas de RH. Pas de syndicat facilement accessible. Juste les forums et l'espoir que quelqu'un ait eu le même problème."},
  ],

  testimonials:[
    {nom:"Marie D.",ville:"Paris 15e",avant:"Je passais mes soirées sur Excel.",apres:"Mon récap Pajemploi est prêt en 5 minutes. Je ne sais même plus pourquoi j'attendais de changer."},
    {nom:"Sylvie R.",ville:"Lyon",avant:"J'avais peur d'un contrôle PMI.",apres:"Tout est archivé, daté, accessible. L'inspectrice a été impressionnée par mon suivi."},
    {nom:"Nathalie B.",ville:"Bordeaux",avant:"Un parent a contesté des heures.",apres:"Le pointage horodaté a tout réglé en 30 secondes. Je ne travaillerai plus sans TiMat."},
    {nom:"Fatima A.",ville:"Marseille",avant:"Je me réveillais la nuit à stresser.",apres:"TiMat me prévient avant chaque échéance. Je dors mieux. C'est bête mais c'est vrai."},
  ],
  // Cette liste doit correspondre exactement aux verrous du code. Une ligne qui
  // promet plus que l'application n'accorde se decouvre au pire moment, et une
  // ligne qui promet moins fait perdre une inscription pour rien.
  freeItems:[
    [true, "1 enfant accueilli"],
    [true, "Journal quotidien"],
    [true, "Pointage & Repas"],
    [true, "Messagerie parents"],
    [true, "Calendrier"],
    [true, "Fiche d'urgence & santé"],
    [true, "Suivi des versements reçus"],
    [true, "Frais kilométriques"],
    [true, "20 photos et 50 Mo de documents"],
    [true, "Export de vos données (RGPD)"],
    [false, "Bulletins de salaire & Pajemploi"],
    [false, "Bilans, rapports et récap fiscal"],
    [false, "PMI, documents et attestations"],
    [false, "Courriers types & fin de contrat"],
    [false, "Enfants illimités"],
  ],
  proItems:[
    "✨ Bilans de journée automatiques",
    "📜 Bulletins de salaire complets",
    "🏛️ Export Pajemploi en 1 clic",
    "📑 Attestation fiscale",
    "📸 Photos sans limite de nombre",
    "🏥 Communication PMI",
    "🗂️ 5 Go de documents",
    "👶 Enfants illimités",
    "🏛️ Compatible Pajemploi+",
    "📋 Solde de tout compte",
    "✉️ Courriers types",
    "❓ Centre d'aide prioritaire",
  ],
  guarantees:[
    "✅ Résiliable en 1 clic, sans reconduction",
    "✅ Pointages et messages opposables",
    "✅ Données en France 🇫🇷",
  ],
  feats:{parrainage:true,forum:true,pmi:true,periscolaire:true,rappelsVaccins:true},
  legal:{
    nom:"Sophie [Votre nom]",
    siret:"[Votre SIRET]",
    adresse:"Île-de-France, France",
    email:"support@timat.app",
  },
  boutique:{
    linkSheets:"https://buy.stripe.com/9B64gr4cGfDP0Qq7j3dwc07",
    linkFiche:"https://buy.stripe.com/00wcMX38C0IV1UucDndwc0c",
    linkProjet:"https://buy.stripe.com/4gM5kvaB4ezL2Yy46Rdwc0b",
    linkRegistre:"https://buy.stripe.com/6oU5kvfVofDPeHg1YJdwc09",
    linkPack:"https://buy.stripe.com/aFa7sD6kO4Zb8iS7j3dwc0a",
  },
  sectionsVisibles:{
    probleme:true, demo:true, signature:true, sources:true,
    temoignages:true, tarifs:true, ctaFinal:true, faq:true, blog:true,
  },
  faqLanding: FAQ_LANDING_DEFAULT,
  footer:{
    description:"L'application tout-en-un des assistantes maternelles. Conçue en France, pour simplifier votre quotidien.",
    contactEmail:"support@timat.app",
    contactWeb:"timat.app",
    contactLieu:"Île-de-France, France",
    rgpd:[
      "🔒 Données hébergées en France (Paris)",
      "🛡️ Chiffrement en transit et au repos",
      "📋 Conforme RGPD",
      "🗑️ Droit à l'effacement garanti",
    ],
  },
  blog: BLOG_DEFAULT,
  // Les bandeaux photo font partie de l'ordre : ce sont des respirations
  // placées, pas des décorations collées à une section.
  sectionsOrder:["probleme","photo1","demo","sources","signature","confidentialite","photo2","tarifs","ctaFinal","temoignages","faq","blog"],
};
export let G = JSON.parse(JSON.stringify(DEFAULT_CONFIG)); // mutable global config

export const applyColsToDOM = (cols) => {
  const r = document.documentElement;
  Object.entries(cols).forEach(([k,v]) => r.style.setProperty('--'+k, v));
};

export const loadConfig = async () => {
  try {
    const {data,error} = await supabase.from('app_config').select('config').eq('id','main').maybeSingle();
    if (error) {
      console.log('[TiMat config] Erreur Supabase:', error.message);
      return;
    }
    if (!data) {
      console.log('[TiMat config] Aucune config en base (table vide) - utilisation des défauts');
      return;
    }
    if (data?.config) {
      const saved = typeof data.config === 'string' ? JSON.parse(data.config) : data.config;
      console.log('[TiMat config] Config chargée depuis Supabase:', Object.keys(saved));
      G = {
        ...DEFAULT_CONFIG,
        ...saved,
        cols:{...DEFAULT_CONFIG.cols,...(saved.cols||{})},
        txts:{...DEFAULT_CONFIG.txts,...(saved.txts||{})},
        landing:{...DEFAULT_CONFIG.landing,...(saved.landing||{})},
        feats:{...DEFAULT_CONFIG.feats,...(saved.feats||{})},
        painPoints: saved.painPoints||DEFAULT_CONFIG.painPoints,
        testimonials: saved.testimonials||DEFAULT_CONFIG.testimonials,
        freeItems: saved.freeItems||DEFAULT_CONFIG.freeItems,
        proItems: saved.proItems||DEFAULT_CONFIG.proItems,
        guarantees: saved.guarantees||DEFAULT_CONFIG.guarantees,
        legal:{...DEFAULT_CONFIG.legal,...(saved.legal||{})},
        boutique:{...DEFAULT_CONFIG.boutique,...(saved.boutique||{})},
        sectionsVisibles:{...DEFAULT_CONFIG.sectionsVisibles,...(saved.sectionsVisibles||{})},
        faqLanding: saved.faqLanding||DEFAULT_CONFIG.faqLanding,
        footer:{...DEFAULT_CONFIG.footer,...(saved.footer||{})},
        blog: saved.blog||DEFAULT_CONFIG.blog,
        sectionsOrder:(saved.sectionsOrder&&saved.sectionsOrder.length)?saved.sectionsOrder:DEFAULT_CONFIG.sectionsOrder,
      };
      applyColsToDOM(G.cols);
      if (G.landing.googleFontsUrl && typeof document !== 'undefined') {
        const existing = document.getElementById('timat-fonts');
        if (existing) existing.href = G.landing.googleFontsUrl;
      }
    }
  } catch(e) {
    console.log('[TiMat config] Exception chargement:', e.message);
  }
};

// P30B : sauvegarde de sécurité de la config en base AVANT tout écrasement.
// Best-effort : ne bloque jamais le Save. Retourne {ok, error?, skipped?}.
function QuickActions({role,setPage}){
  // Les cinq raccourcis etaient colores a parts egales, chacun dans une teinte
  // differente : aucun ne ressortait, et l'ecran comptait cinq couleurs pleines
  // avant meme le contenu. Un seul porte desormais la couleur -- Pointer, le
  // geste fait plusieurs fois par jour -- les autres restent neutres.
  const teinte=role==="asmat"?"var(--B)":"var(--T)";
  const A=role==="asmat"?[
    {i:"pointer",l:"Pointer",p:"pointage",principal:true},
    {i:"cahier",l:"Cahier du jour",p:"cahier_jour"},
    {i:"messages",l:"Messages",p:"messagerie"},
    {i:"paie",l:"Paie",p:"admin_finances"},
    {i:"planning",l:"Planning",p:"calendrier"},
  ]:[
    {i:"pointer",l:"Pointer",p:"pointage",principal:true},
    {i:"cahier",l:"La journée",p:"cahier_jour"},
    {i:"messages",l:"Messages",p:"messagerie"},
    {i:"documents",l:"Documents",p:"documents_complet"},
  ];
  return <div style={{marginBottom:16}}>
    <div style={{fontSize:13,fontWeight:700,color:"var(--l)",marginBottom:9,paddingLeft:2}}>Que voulez-vous faire ?</div>
    <div style={{display:"grid",gridTemplateColumns:"repeat("+A.length+",1fr)",gap:8}}>
      {A.map(a=><button key={a.p}className="qa"onClick={()=>setPage&&setPage(a.p)}
        style={a.principal
          ?{background:teinte,border:"1px solid transparent"}
          :{background:"var(--w)",border:"1px solid var(--br)"}}>
        <Icone nom={a.i} taille={23} couleur={a.principal?"#fff":teinte}/>
        <span style={{fontSize:11,fontWeight:700,textAlign:"center",lineHeight:1.25,color:a.principal?"#fff":"var(--b)"}}>{a.l}</span>
      </button>)}
    </div>
  </div>;
}

export function EmptyState({emoji="✨",titre,texte,cta,onCta,compact=false}){
  return <div style={{textAlign:"center",padding:compact?"18px 14px":"28px 18px"}}>
    <div style={{fontSize:compact?30:42,marginBottom:8,lineHeight:1}}>{emoji}</div>
    <div style={{fontSize:14,fontWeight:700,color:"var(--b)",marginBottom:5}}>{titre}</div>
    {texte&&<div style={{fontSize:12.5,color:"var(--m)",lineHeight:1.6,maxWidth:320,margin:"0 auto"}}>{texte}</div>}
    {cta&&onCta&&<button className="btn bT"style={{marginTop:14,padding:"9px 18px"}}onClick={onCta}>{cta}</button>}
  </div>;
}

function BienvenueOnboarding({role,user,setPage,onClose}){
  const [step,setStep]=useState(0);
  const steps=role==="asmat"?[
    {e:"👋",t:"Bienvenue sur TiMat !",d:"Votre quotidien d'assistante maternelle, simplifié. Voici l'essentiel en quelques secondes.",c:"var(--T)"},
    {e:"⏰",t:"Pointez en 1 tap",d:"Notez l'arrivée et le départ de chaque enfant d'un seul geste, directement depuis votre accueil.",c:"var(--G)"},
    {e:"📔",t:"Le cahier du jour",d:"Repas, sieste, activités, photos et un petit mot : tout se partage en direct avec les parents.",c:"var(--P)"},
    {e:"💶",t:"La paie, sans prise de tête",d:"Bulletins conformes, indemnités, suivi des versements et des impayés : l'application calcule pour vous.",c:"var(--B)"},
  ]:[
    {e:"👋",t:"Bienvenue sur TiMat !",d:"Suivez le quotidien de votre enfant et gérez l'administratif, en toute simplicité.",c:"var(--T)"},
    {e:"📔",t:"La journée de votre enfant",d:"Repas, siestes, activités, photos et le mot du jour : tout en un coup d'œil, en temps réel.",c:"var(--P)"},
    {e:"⏰",t:"Pointez & retrouvez tout",d:"Arrivée, départ, présences… et vos bulletins, contrats et documents réunis au même endroit.",c:"var(--G)"},
    {e:"🤝",t:"Toujours en lien",d:"Échangez avec votre assistante maternelle et restez informé, sans rien oublier.",c:"var(--B)"},
  ];
  const last=step===steps.length-1;
  const s=steps[step];
  const finir=(dest)=>{ onClose&&onClose(); if(dest)setPage&&setPage(dest); };
  return <div style={{position:"fixed",inset:0,zIndex:9999,background:"rgba(20,30,40,.55)",backdropFilter:"blur(3px)",display:"flex",alignItems:"flex-end",justifyContent:"center"}}onClick={e=>{if(e.target===e.currentTarget)finir();}}>
    <div style={{background:"var(--w)",width:"100%",maxWidth:440,borderRadius:"22px 22px 0 0",paddingBottom:24,boxShadow:"0 -8px 40px rgba(0,0,0,.25)",maxHeight:"92vh",overflowY:"auto"}}>
      <div style={{background:s.c,borderRadius:"22px 22px 0 0",padding:"30px 24px 26px",textAlign:"center",position:"relative",transition:"background .4s"}}>
        <button onClick={()=>finir()}style={{position:"absolute",top:14,right:16,background:"rgba(255,255,255,.25)",border:"none",color:"#fff",fontSize:12,fontWeight:600,padding:"5px 12px",borderRadius:20,cursor:"pointer"}}>Passer</button>
        <div className="fi"key={step}style={{fontSize:60,lineHeight:1}}>{s.e}</div>
      </div>
      <div style={{padding:"22px 24px 0",textAlign:"center"}}>
        <div className="pf"style={{fontSize:22,fontWeight:700,color:"var(--b)",marginBottom:10}}>{s.t}</div>
        <div style={{fontSize:14,color:"var(--m)",lineHeight:1.65,minHeight:64}}>{s.d}</div>
        <div style={{display:"flex",justifyContent:"center",gap:7,margin:"20px 0 22px"}}>
          {steps.map((_,i)=><span key={i}onClick={()=>setStep(i)}style={{width:i===step?22:8,height:8,borderRadius:8,background:i===step?s.c:"var(--br)",cursor:"pointer",transition:"all .25s"}}/>)}
        </div>
        <div style={{display:"flex",gap:10,alignItems:"center"}}>
          {step>0&&<button className="btn bG"style={{flex:"0 0 auto",padding:"12px 16px"}}onClick={()=>setStep(step-1)}>←</button>}
          {!last?<button className="btn bT"style={{flex:1,justifyContent:"center",padding:"12px"}}onClick={()=>setStep(step+1)}>Suivant →</button>
            :<button className="btn bT"style={{flex:1,justifyContent:"center",padding:"12px"}}onClick={()=>finir("cahier_jour")}>C'est parti ! 🎉</button>}
        </div>
        {last&&<div onClick={()=>finir()}style={{marginTop:12,fontSize:12,color:"var(--l)",cursor:"pointer"}}>Explorer par moi-même</div>}
      </div>
    </div>
  </div>;
}

// ============================================================
// BACKOFFICE STANDALONE (route /backoffice) - etape 1 : structure
// Coquille sidebar (web) / hamburger (mobile) + onglets, reservee admin.
// Reutilise le composant Backoffice existant (contenu, sections, sauvegardes).
// ============================================================
export const MAINTENANCE = true;
const MAINTENANCE_CLE = "D1Jrp_UaM29A";
function maintenanceBypass(){
  try{
    const q = new URLSearchParams(window.location.search);
    if(q.get("acces") === "stop"){ localStorage.removeItem("timat:acces"); return false; }
    if(q.get("acces") === MAINTENANCE_CLE){
      localStorage.setItem("timat:acces", String(Date.now()));
      return true;
    }
    const t = parseInt(localStorage.getItem("timat:acces") || "0", 10);
    return t > 0 && (Date.now() - t) < 86400000;
  }catch(e){ return false; }
}

// Le back-office n'est téléchargé qu'en arrivant sur /backoffice. Une visiteuse
// de la landing ne paie plus ses 1 700 lignes.
export const BackofficePage = lazy(() => import("./backoffice.jsx").then(m => ({ default: m.BackofficePage })));

// Six écrans que le routeur est seul à appeler, et qu'on ne voit jamais à
// l'ouverture : ils quittent le morceau principal et arrivent au clic.
const _ecrans = () => import("./ecrans-secondaires.jsx");

// Le bloc paie / contrats / versements : 2 900 lignes, le plus lourd de
// l'application, et personne ne le voit avant d'ouvrir l'onglet.
const _gestion = () => import("./gestion.jsx");

// Les écrans du quotidien : 3 500 lignes que la landing n'a aucune raison de
// télécharger avant son hero.
export const _quotidien = () => import("./ecrans-quotidien.jsx");
export const Documents = lazy(() => _quotidien().then(m => ({ default: m.Documents })));

// Le reste des écrans du routeur.
const _app = () => import("./ecrans-app.jsx");
export const Portfolio = lazy(() => _app().then(m => ({ default: m.Portfolio })));
export const Sommeil = lazy(() => _app().then(m => ({ default: m.Sommeil })));
export const AttestationFiscale = lazy(() => _app().then(m => ({ default: m.AttestationFiscale })));
export const AttestationPoleEmploi = lazy(() => _app().then(m => ({ default: m.AttestationPoleEmploi })));
export const BilansExports = lazy(() => _app().then(m => ({ default: m.BilansExports })));
export const Boutique = lazy(() => _app().then(m => ({ default: m.Boutique })));
export const CommunicationPMI = lazy(() => _app().then(m => ({ default: m.CommunicationPMI })));
export const DocumentsComplet = lazy(() => _app().then(m => ({ default: m.DocumentsComplet })));
export const EveilComplet = lazy(() => _app().then(m => ({ default: m.EveilComplet })));
export const FichesEnfants = lazy(() => _app().then(m => ({ default: m.FichesEnfants })));
export const InviterParent = lazy(() => _app().then(m => ({ default: m.InviterParent })));
export const JournalComplet = lazy(() => _app().then(m => ({ default: m.JournalComplet })));
export const KitCMG = lazy(() => _app().then(m => ({ default: m.KitCMG })));
export const MentionsLegales = lazy(() => _app().then(m => ({ default: m.MentionsLegales })));
export const MesAlertes = lazy(() => _app().then(m => ({ default: m.MesAlertes })));
export const MesEmployeurs = lazy(() => _app().then(m => ({ default: m.MesEmployeurs })));
export const Messagerie = lazy(() => _app().then(m => ({ default: m.Messagerie })));
export const OutilsHub = lazy(() => _app().then(m => ({ default: m.OutilsHub })));
export const Parrainage = lazy(() => _app().then(m => ({ default: m.Parrainage })));
export const PolitiqueConfidentialite = lazy(() => _app().then(m => ({ default: m.PolitiqueConfidentialite })));
export const RapportAnnuel = lazy(() => _app().then(m => ({ default: m.RapportAnnuel })));
export const SanteComplete = lazy(() => _app().then(m => ({ default: m.SanteComplete })));
export const SimulateurCout = lazy(() => _app().then(m => ({ default: m.SimulateurCout })));
export const Support = lazy(() => _app().then(m => ({ default: m.Support })));
export const TableauDeBord = lazy(() => _app().then(m => ({ default: m.TableauDeBord })));
export const TempsDeTravail = lazy(() => _app().then(m => ({ default: m.TempsDeTravail })));
export const VueAideSupport = lazy(() => _app().then(m => ({ default: m.VueAideSupport })));
export const VueAidesSimulateurs = lazy(() => _app().then(m => ({ default: m.VueAidesSimulateurs })));
export const VueDocsRapports = lazy(() => _app().then(m => ({ default: m.VueDocsRapports })));
export const VueJournee = lazy(() => _app().then(m => ({ default: m.VueJournee })));
export const VuePaieContrats = lazy(() => _app().then(m => ({ default: m.VuePaieContrats })));
export const VueSanteUrgence = lazy(() => _app().then(m => ({ default: m.VueSanteUrgence })));
export const VueSuiviProgres = lazy(() => _app().then(m => ({ default: m.VueSuiviProgres })));
export const AjouterEnfantModale = lazy(() => _quotidien().then(m => ({ default: m.AjouterEnfantModale })));
export const CahierJour = lazy(() => _quotidien().then(m => ({ default: m.CahierJour })));
export const Calendrier = lazy(() => _quotidien().then(m => ({ default: m.Calendrier })));
export const ExportDonnees = lazy(() => _quotidien().then(m => ({ default: m.ExportDonnees })));
export const FicheUrgence = lazy(() => _quotidien().then(m => ({ default: m.FicheUrgence })));
export const ModeBorne = lazy(() => _quotidien().then(m => ({ default: m.ModeBorne })));
export const OnboardingWizard = lazy(() => _quotidien().then(m => ({ default: m.OnboardingWizard })));
export const Pointage = lazy(() => _quotidien().then(m => ({ default: m.Pointage })));
export const ReglagesBorne = lazy(() => _quotidien().then(m => ({ default: m.ReglagesBorne })));
export const AdminFinances = lazy(() => _gestion().then(m => ({ default: m.AdminFinances })));
export const IndemnitesKilometriques = lazy(() => _gestion().then(m => ({ default: m.IndemnitesKilometriques })));
export const RecapFiscalAssmat = lazy(() => _gestion().then(m => ({ default: m.RecapFiscalAssmat })));
export const SoldeDeCompte = lazy(() => _gestion().then(m => ({ default: m.SoldeDeCompte })));
export const Bilans = lazy(() => _ecrans().then(m => ({ default: m.Bilans })));
export const Parametres = lazy(() => _ecrans().then(m => ({ default: m.Parametres })));
export const ListeAttente = lazy(() => _ecrans().then(m => ({ default: m.ListeAttente })));
export const PlanningPeriscolaire = lazy(() => _ecrans().then(m => ({ default: m.PlanningPeriscolaire })));
export const ForumCommunaute = lazy(() => _ecrans().then(m => ({ default: m.ForumCommunaute })));
export const ProjetAccueil = lazy(() => _ecrans().then(m => ({ default: m.ProjetAccueil })));

export default function App(){
  const [maintOk] = useState(()=>maintenanceBypass());
  // ?site=1 force la landing marketing. Lu une seule fois, puis efface de la barre d adresse.
  const [forceSite] = useState(()=>{
    try{
      const p = new URLSearchParams(window.location.search);
      if(p.has("site")){
        p.delete("site");
        const reste = p.toString();
        window.history.replaceState(null, "", window.location.pathname + (reste ? "?"+reste : ""));
        return true;
      }
    }catch(e){}
    return false;
  });
  const [user,setUser]=useState(null);
  const [page,setPage]=useState("accueil");
  const [pEIdSel,setPEIdSel]=useState(null);  const [showWelcome,setShowWelcome]=useState(false);
  const [recovery,setRecovery]=useState(false); // MDP P16 - arrivee par lien de reinitialisation
  useEffect(()=>{
    if(user?.id){ try{ if(!localStorage.getItem("timat:onboarding:seen:"+user.id)) setShowWelcome(true); }catch(e){} }
  },[user?.id]);
  const closeWelcome=()=>{ try{ if(user?.id)localStorage.setItem("timat:onboarding:seen:"+user.id,"1"); }catch(e){} setShowWelcome(false); };
  const [dark,setDark]=useState(false);
  const [loading,setLoading]=useState(true);
  const [pmiNonLus,setPmiNonLus]=useState(0);
  const [notifs,setNotifs]=useState([]);
  const [showNotifs,setShowNotifs]=useState(false);
  const [onboarded,setOnboarded]=useState(false);
  const [gToast,setGToast]=useState("");
  // Mode borne : verrouille l'appareil sur l'ecran de pointage. Lu au demarrage
  // pour qu'un rechargement — ou une extinction d'ecran — ne rouvre pas
  // l'application entiere devant un parent.
  const [borne,setBorne]=useState(()=>borneActive());
  // LIEN INVITATION quand une session existe deja : parent connecte -> rattachement auto ; assmat -> message
  useEffect(()=>{
    if(!user?.id||!user?.role)return;
    let tk=null,hasInvite=false;
    try{const p=new URLSearchParams(window.location.search); tk=p.get("invite"); hasInvite=p.has("invite")||p.get("role")==="parent";}catch(e){}
    if(!hasInvite)return;
    (async()=>{
      if(user.role==="parent"){
        try{
          if(tk&&tk.length>20)await supabase.rpc("claim_invite_token",{p_token:tk});
          await supabase.rpc("claim_invitations");
          setGToast("Enfant rattaché à votre espace ✓");
          setDataRefreshKey(k=>k+1);
        }catch(e){}
      }else{
        setGToast("Ce lien d'invitation est destiné aux parents. Ouvrez-le en navigation privée (ou déconnectez-vous) pour le tester.");
      }
      try{const u=new URL(window.location.href); u.searchParams.delete("invite"); u.searchParams.delete("role"); window.history.replaceState({},"",u.pathname+u.search);}catch(e){}
      try{localStorage.removeItem("timat:invite");}catch(e){}
    })();
  },[user?.id,user?.role]);

  // //  tats donnes Supabase  AVANT tout return conditionnel
  const [enfantsDB,setEnfantsDB]=useState([]);
  const [contratsDB,setContratsDB]=useState([]);
  const [pointagesDB,setPointagesDB]=useState([]);
  const [transmissionsDB,setTransmissionsDB]=useState([]);
  const [dbLoading,setDbLoading]=useState(false);
  const [dataFetched,setDataFetched]=useState(false); // ANTI-FLASH P16C
  // Cle pour forcer le refresh complet des donnees Supabase (incrementee sur l'event timat:refresh-data)
  const [dataRefreshKey,setDataRefreshKey]=useState(0);
  const [appConfig,setAppConfig]=useState(JSON.parse(JSON.stringify(DEFAULT_CONFIG)));
  const [configLoaded,setConfigLoaded]=useState(false); // ANTI-FLASH P16A
  // POINTAGE QR - resultat du scan (banniere de confirmation)
  const [qrScan,setQrScan]=useState(null);
  const qrScanHandled=useRef(false);

  // Le service worker porte le mode hors ligne (public/sw.js) et, demain, les
  // notifications push : sans lui enregistre, ni l'un ni l'autre n'existe.
  // Il a longtemps ete desinscrit ici a chaque demarrage — c'est pour cela que
  // le bandeau « donnees sauvegardees localement » ne sauvegardait rien.
  useEffect(()=>{
    if(!('serviceWorker' in navigator))return;
    navigator.serviceWorker.register('/sw.js').catch(e=>console.warn('[sw]',e?.message));
  },[]);

  // Favicon dynamique selon role connecte (asmat=bleu marine, parent=terracotta)
  useEffect(()=>{
    const role=user?.role;
    const iconHref=role==="parent"?"/parent.svg":"/assmat.svg";
    let link=document.querySelector("link[rel~='icon']");
    if(!link){
      link=document.createElement("link");
      link.rel="icon";
      document.head.appendChild(link);
    }
    link.type="image/svg+xml";
    link.href=iconHref;
  },[user?.role]);

  // Charger config backoffice au démarrage + ANTI-FLASH P16A
  useEffect(()=>{
    let done=false;
    loadConfig().then(()=>{
      setAppConfig(JSON.parse(JSON.stringify(G)));
      setConfigLoaded(true);
      done=true;
      console.log('[TiMat config] appConfig synchronisé');
    }).catch(e=>{
      console.warn('[TiMat config] Echec chargement, on libère le loading screen:',e?.message);
      setConfigLoaded(true);
      done=true;
    });
    // Sécurité : ne jamais bloquer plus de 3s si Supabase est down
    const fb=setTimeout(()=>{if(!done)setConfigLoaded(true);},3000);
    return()=>clearTimeout(fb);
  },[]);

  // Vérifier session Supabase au démarrage -
  useEffect(()=>{
    const handleAuthUser=(session)=>{
      if(!session?.user)return;
      const u=session.user;
      // Vérifier expiration session (24h)
      const lastLogin=localStorage.getItem('timat_last_login');
      const now=Date.now();
      if(lastLogin&&(now-parseInt(lastLogin))>24*60*60*1000){
        // Plus de 24h → forcer reconnexion
        supabase.auth.signOut();
        localStorage.removeItem('timat_last_login');
        return;
      }
      localStorage.setItem('timat_last_login',String(now));
      // FIX retour-onglet: ne forcer la navigation accueil QUE si user etait null avant.
      // Sinon (INITIAL_SESSION rejoue au retour d'onglet, refresh token...), garder la page courante.
      let isFirstLogin=false;
      setUser(prev=>{
        if(!prev)isFirstLogin=true;
        if(prev?.id===u.id && prev.prenom && prev.prenom!=="Utilisateur")return prev;
        return {
          id:u.id,
          email:u.email,
          prenom:u.user_metadata?.prenom||"Utilisateur",
          nom:u.user_metadata?.nom||"",
          role:u.user_metadata?.role||"asmat",
          couleur:u.user_metadata?.role==="parent"?"#2E5F8A":"#E49178",
          subscription_status:"free",
          _needsProfileFetch:true,
          _profileConfirmed:false // P16D anti-flash parent
        };
      });
      if(isFirstLogin)setPage("accueil");
    };

    const{data:{subscription}}=supabase.auth.onAuthStateChange((event,session)=>{
      if(event==="INITIAL_SESSION"){
        handleAuthUser(session);
        setLoading(false);
      }
      if(event==="SIGNED_IN"&&session?.user){
        handleAuthUser(session);
      }
      if(event==="PASSWORD_RECOVERY"&&session?.user){
        // Arrivee par un lien de reinitialisation : on connecte puis on emmene
        // directement l'utilisateur vers le formulaire de nouveau mot de passe.
        handleAuthUser(session);
        setRecovery(true);
        setPage("parametres");
      }
      if(event==="SIGNED_OUT"){
        setUser(null);
        setPage("accueil");
        localStorage.removeItem('timat_last_login');
      }
    });
    const fallback=setTimeout(()=>setLoading(false),3000);
    return()=>{subscription.unsubscribe();clearTimeout(fallback);};
  },[]);

  // Enrich user with profile from DB (separate effect to avoid auth lock race)
  useEffect(()=>{
    if(!user?.id||!user._needsProfileFetch)return;
    let cancelled=false;
    (async()=>{
      try{
        const{data:profil}=await supabase.from("profiles").select("*").eq("id",user.id).maybeSingle();
        if(cancelled)return;
        if(profil){
          // ROLE MEMORISE P16 - sert a reouvrir le bon ecran de connexion (deconnexion, raccourci PWA)
          try{if(profil.role)localStorage.setItem("timat:lastRole",profil.role);}catch(e){}
          setUser(u=>({...u,...profil,id:user.id,email:user.email,_needsProfileFetch:false,_profileConfirmed:true})); // P16D
        }else{
          setUser(u=>({...u,_needsProfileFetch:false}));
        }
      }catch(e){
        console.log("Profile fetch error:",e.message);
        if(!cancelled)setUser(u=>({...u,_needsProfileFetch:false}));
      }
    })();
    return()=>{cancelled=true;};
  },[user?.id,user?._needsProfileFetch]);

  // Écouter navigation depuis modale
  useEffect(()=>{
    const handler=(e)=>{setPage(e.detail);};
    window.addEventListener("timat:page",handler);
    return()=>window.removeEventListener("timat:page",handler);
  },[]);

  // //  Dtecter retour depuis Stripe Checkout
  useEffect(()=>{
    if(!user)return;
    const params=new URLSearchParams(window.location.search);
    const payment=params.get('payment');
    if(payment==='success'){
      supabase.from('profiles').select('*').eq('id',user.id).maybeSingle()
        .then(({data})=>{if(data)setUser(u=>({...u,...data}));});
      setPage('parametres');
      window.history.replaceState({},'','/');
    }
    if(payment==='cancelled'){
      window.history.replaceState({},'','/');
    }
  },[user?.id]);

  const handleLogout=async()=>{
    try{await supabase.auth.signOut();}catch(e){}
    setUser(null);setPage("accueil");setOnboarded(false);
  };

  // //  Charger les donnes relles depuis Supabase
  // FIX P10: attendre que le profil soit charge depuis profiles (_needsProfileFetch=false)
  // sinon user.role peut valoir "asmat" par defaut alors que c'est un parent → filtre asmat_id qui retourne []
  // La balise viewport : viewport-fit=cover pour les telephones a encoche, et le
  // zoom LAISSE POSSIBLE.
  //
  // Cette ligne portait maximum-scale=1, ce qui interdit d'agrandir la page.
  // L'intention etait d'empecher iOS de zoomer tout seul quand on touche un
  // champ — mais iOS ne fait cela que si la police du champ descend sous 16 px,
  // et tous les champs sont deja en font-size:16px!important. La protection
  // etait donc inutile, et elle privait de zoom des utilisatrices qui lisent
  // des montants sur un bulletin de salaire. Lighthouse le signalait en
  // accessibilite ; c'est surtout une gene reelle.
  //
  // maximum-scale=5 est le minimum exige pour que le controle passe.
  useEffect(()=>{
    try{
      let m=document.querySelector('meta[name="viewport"]');
      if(!m){m=document.createElement("meta");m.setAttribute("name","viewport");document.head.appendChild(m);}
      m.setAttribute("content","width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover");
    }catch(e){}
  },[]);
  useEffect(()=>{
    if(!user?.id)return;
    if(user._needsProfileFetch)return; // attendre la fin du fetch profil
    const charger=async()=>{
      setDbLoading(true);
      try{
        // RATTACHEMENT INVITATION : relie le parent a son/ses enfant(s) par email avant le chargement
        if(user.role==="parent"){
          try{ await supabase.rpc("claim_invitations"); }catch(_e){}
          try{
            const tk=new URLSearchParams(window.location.search).get("invite")||(()=>{try{return localStorage.getItem("timat:invite");}catch(e){return null;}})();
            if(tk&&tk.length>20){ const{data}=await supabase.rpc("claim_invite_token",{p_token:tk}); if(data){try{localStorage.removeItem("timat:invite");}catch(e){}} }
          }catch(_e){}
        }
        // Enfants
        let q=supabase.from("enfants").select("*");
        if(user.role==="asmat") q=q.eq("asmat_id",user.id);
        else q=q.eq("parent_id",user.id);
        const{data:e}=await q.order("created_at");
        if(e&&e.length>0){
          // Charger les contrats pour chaque enfant
          const enfantIds=e.map(x=>x.id);
          const{data:c}=await supabase.from("contrats").select("*")
            .in("enfant_id",enfantIds).eq("actif",true);
          setContratsDB(c||[]);
          // Mapper les contrats sur les enfants
          const enfantsAvecContrat=e.map(enf=>{
            const ct=c?.find(x=>x.enfant_id===enf.id);
            return {
              ...enf,
              parentId:enf.parent_id,
              naissance:enf.naissance,
              contrat:ct?{
                id:ct.id,
                asmat_id:ct.asmat_id,
                debut:ct.debut,
                fin:ct.fin,
                heuresHebdo:ct.heures_hebdo,
                tauxHoraire:ct.taux_horaire,
                anneeComplete:ct.annee_complete,
                repasFourniPar:ct.repas_fourni_par,
                semainesAccueil:ct.semaines_accueil,
                entretien:ct.entretien,
                aeeh:!!ct.aeeh,
                repas:Number(ct.repas)||0,
                jours:ct.jours||["Lundi","Mardi","Mercredi","Jeudi","Vendredi"],
                horaires:ct.horaires||"07h30–17h30",
                indemniteAbsence:0.5,
                signe_asmat:!!ct.signe_asmat,
                date_signature_asmat:ct.date_signature_asmat||null,
                signature_asmat_data:ct.signature_asmat_data||null,
                // SIGNATURE PARENT P10 - exposer les colonnes parent au front
                signe_parent:!!ct.signe_parent,
                date_signature_parent:ct.date_signature_parent||null,
                signature_parent_data:ct.signature_parent_data||null,
                partage_parent:!!ct.partage_parent,
                parent_id:ct.parent_id||null,
                pdf_storage_path:ct.pdf_storage_path||null,
                pdf_generated_at:ct.pdf_generated_at||null,
                updated_at:ct.updated_at||null,
              }:null,
            };
          });
          setEnfantsDB(enfantsAvecContrat);
          // Charger pointages du mois
          const debut=new Date();debut.setDate(1);
          const{data:p}=await supabase.from("pointages").select("*")
            .in("enfant_id",enfantIds)
            .gte("date",isoJour(debut));
          setPointagesDB(p||[]);
          // Charger transmissions du jour
          const{data:t}=await supabase.from("transmissions").select("*")
            .in("enfant_id",enfantIds)
            .eq("date",TODAY_STR);
          setTransmissionsDB(t||[]);
        }else{
          setEnfantsDB([]);
        }
      }catch(err){console.error("Erreur chargement données:",err);}
      finally{setDbLoading(false);setDataFetched(true);} // P16C: signaler fin du fetch initial
    };
    charger();
  },[user?.id,user?.role,user?._needsProfileFetch,dataRefreshKey]);

  // Ecouter l'event timat:refresh-data pour rafraichir les donnees Supabase (declenche apres ajout d'un enfant par exemple)
  useEffect(()=>{
    const handler=()=>setDataRefreshKey(k=>k+1);
    window.addEventListener("timat:refresh-data",handler);
    return()=>window.removeEventListener("timat:refresh-data",handler);
  },[]);

  // LIEN EMAIL SIGNATURE - si l'app est ouverte via ?goto=signature (bouton de l'email
  // "contrat pret a signer"), amener le parent directement sur la page Finances/contrat.
  const gotoHandled=useRef(false);
  useEffect(()=>{
    if(gotoHandled.current)return;
    const params=new URLSearchParams(window.location.search);
    if(params.get("goto")!=="signature")return;
    if(!user?.id)return; // attendre la connexion
    gotoHandled.current=true;
    setPage("admin_finances");
    try{const u=new URL(window.location.href);u.searchParams.delete("goto");window.history.replaceState({},"",u.pathname+(u.search||""));}catch(e){}
  },[user?.id]);

  // POINTAGE QR - si l'app est ouverte via un QR (?pointage=qr&enfant=ID), enregistrer le pointage via la RPC pointage_qr.
  // L'utilisateur connecte (parent OU assmat lie a l'enfant) declenche l'ecriture ; la RPC attribue le bon asmat_id et bascule arrivee->depart.
  useEffect(()=>{
    if(qrScanHandled.current)return;
    const params=new URLSearchParams(window.location.search);
    if(params.get("pointage")!=="qr")return;
    const enfantId=params.get("enfant");
    if(!enfantId)return;
    if(!user?.id)return; // attendre la connexion (le param reste dans l'URL jusqu'au login)
    qrScanHandled.current=true;
    (async()=>{
      try{
        const{data,error}=await supabase.rpc("pointage_qr",{p_enfant_id:enfantId});
        if(error)setQrScan({success:false,error:error.message});
        else setQrScan(data||{success:false,error:"reponse vide"});
        setDataRefreshKey(k=>k+1);
      }catch(e){setQrScan({success:false,error:e.message});}
      // nettoyer l'URL pour eviter un re-declenchement au refresh
      try{const u=new URL(window.location.href);u.searchParams.delete("pointage");u.searchParams.delete("enfant");window.history.replaceState({},"",u.pathname+(u.search||""));}catch(e){}
    })();
  },[user?.id]);

  // NOTIFICATIONS - charger la cloche depuis Supabase (au login + a chaque refresh-data)
  useEffect(()=>{
    if(!user?.id){setNotifs([]);return;}
    let cancelled=false;
    (async()=>{
      const{data,error}=await supabase.from("notifications")
        .select("*").eq("user_id",user.id)
        .order("created_at",{ascending:false}).limit(50);
      if(cancelled||error)return;
      const ICONS={versement:"💶",pointage_a_valider:"⏱️",signature_asmat_signed:"✍️",signature_parent_signed:"✍️",bulletin_sent:"📜",message:"📬",declaration_rappel:"📅",info:"🔔"};
      setNotifs((data||[]).map(n=>({id:n.id,ic:ICONS[n.type]||"🔔",txt:n.titre,date:n.created_at,lu:!!n.lu,page:n.page||"accueil"})));
    })();
    return()=>{cancelled=true;};
  },[user?.id,dataRefreshKey]);

  // RAPPEL DECLARATION PAJEMPLOI - notification in-app a l'ouverture de la fenetre (1er-5 du mois), 1 fois/mois, cote parent employeur
  useEffect(()=>{
    if(!user?.id||user.role!=="parent")return;
    if(user?.id?.startsWith?.("demo-")||user?.isDemo)return;
    if(!enfantsDB||enfantsDB.length===0)return;
    const now=new Date();
    if(now.getDate()>5)return; // fenetre de declaration fermee (1er au 5 du mois)
    let cancelled=false;
    (async()=>{
      const debutMois=isoJour(new Date(now.getFullYear(),now.getMonth(),1));
      const{data:exist,error}=await supabase.from("notifications").select("id")
        .eq("user_id",user.id).eq("type","declaration_rappel").gte("created_at",debutMois).limit(1);
      if(cancelled||error||(exist&&exist.length))return; // deja cree ce mois-ci
      const noms=["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];
      const d=new Date(now.getFullYear(),now.getMonth()-1,1);
      await createNotification({userId:user.id,type:"declaration_rappel",titre:"Déclaration Pajemploi de "+noms[d.getMonth()]+" "+d.getFullYear()+" à faire avant le 5 sur pajemploi.urssaf.fr",page:"accueil",meta:{kind:"declaration_rappel"}});
      if(!cancelled)setDataRefreshKey(k=>k+1); // recharger la cloche
    })();
    return()=>{cancelled=true;};
  },[user?.id,user?.role,enfantsDB.length]);

  // MODE VITRINE : premiere chose evaluee, avant meme l ecran de chargement.
  // La landing s'affiche normalement, sans inscription ni connexion possible.
  // Le backoffice reste ouvert, ainsi que le blog et les simulateurs (fichiers statiques).
  {
    let _boRoute=false; try{ _boRoute=window.location.pathname.replace(/\/+$/,"")==="/backoffice"; }catch(e){}
    // On n'attend PLUS configLoaded ici, et c'est un arbitrage assume.
    //
    // Ce verrou avait ete pose pour eviter un clignotement : la vitrine
    // s'affichait avec DEFAULT_CONFIG — les textes figes dans le bundle — puis
    // se redessinait quand la config Supabase arrivait. Le remede coutait plus
    // cher que le mal : chaque visiteuse attendait un aller-retour reseau, ou
    // le repli de 3 s quand Supabase ne repondait pas, devant un ecran
    // « Chargement… ». Lighthouse mesurait exactement cela, et le disait dans
    // la repartition du LCP : « delai d'affichage de l'element, 1520 ms », sans
    // aucune phase de chargement de ressource — donc une attente pure.
    //
    // Deux raisons de renverser l'arbitrage :
    //   1. app_config ne contient AUCUNE surcharge de texte de landing. Le
    //      rendu immediat affiche donc exactement ce que la config aurait
    //      donne : il n'y a pas de clignotement a eviter aujourd'hui ;
    //   2. si une surcharge est ajoutee un jour au back-office, le pire devient
    //      un remplacement de texte de quelques centaines de millisecondes —
    //      a comparer aux trois secondes d'ecran vide qu'on payait pour lui.
    //
    // Le jour ou l'on voudra les deux, la solution est d'injecter la config
    // dans index.html au moment de la construction, comme le blog le fait deja
    // avec Sanity. Pas d'attendre le reseau devant une page blanche.
    if(MAINTENANCE && !maintOk && !_boRoute)
      return <><Styles/><div className={"app"+(dark?" dark":"")}><LandingPage vitrine onLogin={()=>{}} dark={dark} setDark={setDark} config={appConfig}/></div></>;
  }

  if(loading||!configLoaded||(user&&user._needsProfileFetch)||(user&&!dataFetched))return(
    <><Styles/>
    <div style={{minHeight:"100vh",background:"var(--c)",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16}}>
      <img src={logoForRole(user?.role, dark)} alt="TiMat" style={{height:(G?.landing?.logoSizes?.loading)||64,objectFit:"contain"}} onError={e=>{e.target.outerHTML='<div class="pf" style="font-size:36px;color:var(--T);font-style:italic">TiMat</div>'}}/>
      <div style={{display:"flex",gap:6}}>
        <div className="ai-dot"/><div className="ai-dot"style={{animationDelay:".3s"}}/><div className="ai-dot"style={{animationDelay:".6s"}}/>
      </div>
      <div style={{fontSize:12,color:"var(--l)"}}>Chargement...</div>
    </div></>
  );


  // ROUTE DEDIEE /backoffice : rendu autonome hors de l app, reserve a l admin
  let _isBO=false; try{ _isBO=window.location.pathname.replace(/\/+$/,"")==="/backoffice"; }catch(e){}

  if(_isBO){
    const _onLoginBO=u=>{ setUser({...u,_needsProfileFetch:true,_profileConfirmed:false}); };
    return <><Styles/><Suspense fallback={<div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--m)",fontFamily:"'DM Sans',sans-serif",fontSize:14}}>Chargement du back-office…</div>}>
      <BackofficePage user={user} appConfig={appConfig} setAppConfig={setAppConfig} onLogin={_onLoginBO}/>
    </Suspense></>;
  }

  // - Utiliser données réelles
  if(!user){
    const _onLogin=u=>{setUser({...u,_needsProfileFetch:true,_profileConfirmed:false});setPage("accueil");};
    let _isInvite=false; try{const _p=new URLSearchParams(window.location.search); _isInvite=_p.has("invite")||_p.get("role")==="parent";}catch(e){}
    if(_isInvite)return <><Styles/><div className={"app"+(dark?" dark":"")}><ParentInvitationScreen onLogin={_onLogin}/></div></>;
    let _isConnexion=false,_connexionParent=false;
    try{const _p=new URLSearchParams(window.location.search);_isConnexion=_p.has("connexion");_connexionParent=_p.get("connexion")==="parent";}catch(e){}
    if(_connexionParent)return <><Styles/><div className={"app"+(dark?" dark":"")}><ParentInvitationScreen onLogin={_onLogin} initialMode="connexion"/></div></>;
    if(_isConnexion)return <><Styles/><div className={"app"+(dark?" dark":"")}><LandingPage authOnly onLogin={_onLogin} dark={dark} setDark={setDark} config={appConfig}/></div></>;
    // RETOUR SUR L ECRAN DE SON ROLE P16
    // Sans session : si la personne s'est deja connectee sur cet appareil, on rouvre directement
    // son ecran de connexion (deconnexion, raccourci PWA start_url="/") au lieu de la landing.
    // ?site=1 force l'affichage de la landing marketing.
    let _forceSite=false,_lastRole=null;
    try{
      _forceSite=forceSite;
      _lastRole=localStorage.getItem("timat:lastRole");
    }catch(e){}
    if(!_forceSite&&_lastRole==="parent")
      return <><Styles/><div className={"app"+(dark?" dark":"")}><ParentInvitationScreen onLogin={_onLogin} initialMode="connexion"/></div></>;
    if(!_forceSite&&_lastRole==="asmat")
      return <><Styles/><div className={"app"+(dark?" dark":"")}><LandingPage authOnly forceRole="asmat" onLogin={_onLogin} dark={dark} setDark={setDark} config={appConfig}/></div></>;
    return <><Styles/><div className={"app"+(dark?" dark":"")+""}><LandingPage onLogin={_onLogin} /* P16E: forcer fetch profil au login frais */ dark={dark} setDark={setDark} config={appConfig}/></div></>;
  }
  // INVITATION PARENT ouverte alors qu'un compte est déjà connecté : proposer de basculer
  let _invOpen=false; try{const _p=new URLSearchParams(window.location.search); _invOpen=_p.has("invite")||_p.get("role")==="parent";}catch(e){}
  if(_invOpen){
    return <><Styles/><div className={"app"+(dark?" dark":"")}>
      <div style={{position:"fixed",inset:0,background:"linear-gradient(135deg,#E49178 0%,#90A093 50%,#2E4A5A 100%)",display:"flex",alignItems:"center",justifyContent:"center",padding:20,zIndex:9999}}>
        <div style={{background:"#fff",borderRadius:20,maxWidth:400,width:"100%",padding:"28px 24px",textAlign:"center",boxShadow:"0 20px 60px rgba(0,0,0,.3)"}}>
          <div style={{fontSize:34,marginBottom:10}}>👋</div>
          <div style={{fontSize:18,fontWeight:700,color:"#2E4A5A",marginBottom:8,fontFamily:"'Fraunces',Georgia,serif"}}>Invitation parent</div>
          <div style={{fontSize:13.5,color:"#555",lineHeight:1.6,marginBottom:20}}>Vous avez ouvert un lien d'invitation parent, mais vous êtes déjà connecté{user.role==="asmat"?" en tant qu'assistante maternelle":""} ({user.email}). Pour rejoindre l'espace parent, déconnectez-vous puis continuez.</div>
          <button onClick={async()=>{try{await supabase.auth.signOut();}catch(e){} setUser(null);}} style={{width:"100%",padding:"13px",borderRadius:12,border:"none",background:"linear-gradient(135deg,#E49178,#C76754)",color:"#fff",fontSize:15,fontWeight:700,cursor:"pointer",marginBottom:10,fontFamily:"inherit"}}>Se déconnecter et continuer</button>
          <button onClick={()=>{try{window.location.href=window.location.pathname;}catch(e){}}} style={{width:"100%",padding:"11px",borderRadius:12,border:"1.5px solid #DDD5C8",background:"transparent",color:"#777",fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>Ignorer et rester sur mon espace</button>
        </div>
      </div>
    </div></>;
  }

  // P16D : on exige le profil confirmé en base avant de proposer l'accompagnement.
  //
  // Ce commentaire était écrit « return // P16D ... <OnboardingWizard/> » sur une
  // seule ligne : tout ce qui suivait les deux barres était commenté, donc la
  // fonction retournait undefined et une assistante maternelle qui venait de
  // s'inscrire tombait sur une page blanche au lieu de son premier pas.
  if(!onboarded&&user.role==="asmat"&&user._profileConfirmed&&!dbLoading&&enfantsDB.length===0)
    return <><Styles/><div className={"app"+(dark?" dark":"")+""}>
      {/* L'accompagnement arrive à la demande : hors du routeur, il lui faut
          son propre Suspense, sinon la page resterait blanche pendant le
          téléchargement — exactement ce qu'on vient de réparer. */}
      <Suspense fallback={<div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--m)",fontSize:15}}>Préparation de votre espace…</div>}>
        <OnboardingWizard onFinish={()=>setOnboarded(true)} user={user}/>
      </Suspense>
    </div></>;

  const role=user.role;
  // //  Statut abonnement
  // Une seule definition du statut, partagee avec les verrous du forfait :
  // deux regles qui divergent, c'est une fonction bridee d'un cote et ouverte
  // de l'autre.
  const isPro=estPro(user);
  const isTrialing=user?.subscription_status==="trialing";
  // Le même calcul que la tâche quotidienne : une assistante maternelle ne doit
  // pas lire « il vous reste 3 jours » ici et recevoir le courriel de fin le
  // même matin.
  const joursEssai=joursRestantsEssai(user);
  const essaiFini=essaiExpire(user);

  // //  Lancer le checkout Stripe
  const lancerCheckout=async()=>{
    if(user?.id?.startsWith?.("demo-")){
      alert("Le paiement n'est pas disponible en mode demo. Creez un compte pour continuer.");
      return;
    }
    try{
      const res=await fetch('/api/checkout-session',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({userId:user.id,email:user.email,prenom:user.prenom}),
      });
      if(!res.ok){
        const txt=await res.text();
        console.error('Stripe error:', res.status, txt);
        alert("Erreur serveur ("+res.status+"). Verifiez que Stripe est configure dans Vercel.");
        return;
      }
      const data=await res.json();
      if(data.url)window.location.href=data.url;
      else alert("Erreur: "+JSON.stringify(data));
    }catch(e){
      console.error('Stripe fetch error:', e);
      alert("Erreur reseau. Verifiez que :\n1. npm install stripe est fait\n2. STRIPE_SECRET_KEY est dans les variables Vercel\n3. L'API /api/checkout-session est deployee");
    }
  };


  // //  Portail client Stripe grer abonnement
  const ouvrirPortail=async()=>{
    if(!user?.stripe_customer_id){alert("Aucun abonnement actif trouvé.");return;}
    try{
      const res=await fetch('/api/customer-portal',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({stripeCustomerId:user.stripe_customer_id}),
      });
      const data=await res.json();
      if(data.url)window.location.href=data.url;
    }catch(e){alert("Erreur lors de l'ouverture du portail.");}
  };

 // Utiliser données réelles si disponibles, sinon démo
  // Ne pas afficher les données démo pendant le chargement (évite le flash)
  const isDemo=user?.id?.startsWith?.("demo-")||user?.isDemo;
  const hasRealData=enfantsDB.length>0;
  const enfants=dbLoading&&!isDemo?[]:(hasRealData?enfantsDB:(isDemo?D.enfants:(()=>{
    const byId=D.enfants.filter(e=>e.parentId===user.id);
    if(byId.length>0)return byId;
    const parentDemo=D.parents.find(p=>p.email===user.email);
    if(parentDemo)return D.enfants.filter(e=>e.parentId===parentDemo.id);
    return [];
  })()));
  const pEId=(pEIdSel&&enfants.some(e=>e.id===pEIdSel))?pEIdSel:enfants[0]?.id;
  const groups=role==="asmat"?GROUPS_AM:GROUPS_P;
  const P={enfants,role,pEId,user,pointagesDB};

  // Les écrans chargés à la demande arrivent après un aller-retour réseau : sans
  // ce Suspense, React jetterait la promesse jusqu'à la racine et l'application
  // entière disparaîtrait le temps du téléchargement.
  // Le Suspense ouvre AVANT le switch et se ferme après : les écrans chargés à
  // la demande sont tous dedans, et l'audit peut le vérifier en lisant le code
  // plutôt qu'en croyant sur parole que l'appelant s'en charge.
  const renderPage=()=>
    <Suspense fallback={<div style={{padding:"48px 20px",textAlign:"center",color:"var(--m)",fontSize:14}}>Chargement…</div>}>
      {(()=>{
    switch(page){
      case "accueil": return role==="asmat"?<AccueilAssMat enfants={enfants} setPage={setPage} user={user}/>:<AccueilParent enfant={enfants.find(e=>e.id===pEId)||enfants[0]} setPage={setPage} user={user}/>;
      case "cahier_jour": return <CahierJour {...P}/>;
      case "fiches_enfants": return <FichesEnfants enfants={enfants} user={user} setPage={setPage}/>;
      case "journee": return <VueJournee {...P}/>;
      case "suivi_progres": return <VueSuiviProgres {...P} setPage={setPage}/>;
      case "sante_urgence": return <VueSanteUrgence {...P}/>;
      case "paie_contrats": return <VuePaieContrats {...P} user={user}/>;
      case "documents_rapports": return <VueDocsRapports {...P}/>;
      case "journal_complet": return <JournalComplet {...P}/>;
      case "sante_complet": return <SanteComplete {...P}/>;
      case "bilans": return isPro?<Bilans {...P}/>:<VerrouPro titre="Les bilans de journée" desc="Des bilans périodiques prêts à partager avec les parents, composés à partir de ce que vous notez chaque jour. Cette fonction fait partie du forfait Pro."/>;
      case "eveil_complet": return <EveilComplet {...P}/>;
      case "documents_complet": return isPro?<DocumentsComplet {...P}/>:<VerrouPro titre="Documents et attestations" desc="Vos documents classés, l'attestation France Travail et le récapitulatif des versements. Cette fonction fait partie du forfait Pro."/>;
      case "bilans_exports": return <BilansExports {...P}/>;
      case "recap_fiscal": return isPro?<RecapFiscalAssmat enfants={enfants} user={user}/>:<VerrouPro titre="Le récapitulatif fiscal" desc="Le montant à reporter sur votre déclaration, après abattement, calculé à partir de vos salaires de l'année. Cette fonction fait partie du forfait Pro."/>;
      case "admin_finances": return <AdminFinances {...P} user={user}/>;
      case "pointage": return <Pointage {...P}/>;
      case "calendrier": return <Calendrier enfants={enfants} role={role} pEId={pEId} user={user}/>;
      case "messagerie": return <Messagerie {...P}/>;
      case "politique_confidentialite": return <PolitiqueConfidentialite/>;
      case "mentions_legales": return <MentionsLegales/>;
      case "parametres": return <Parametres user={user} onLogout={handleLogout} setPage={setPage} isPro={isPro} isTrialing={isTrialing} lancerCheckout={lancerCheckout} ouvrirPortail={ouvrirPortail} setUser={setUser} openWelcome={()=>setShowWelcome(true)} recovery={recovery} clearRecovery={()=>setRecovery(false)}/>;
      case "backoffice": return null; // Backoffice deplace vers la route dediee /backoffice (hors de l app)
      case "mes_employeurs": return isPro?<MesEmployeurs enfants={enfants} role={role} user={user}/>:<VerrouPro titre="Vos employeurs" desc="Vos revenus du mois famille par famille, et vos congés à poser avec toutes. Cette fonction fait partie du forfait Pro."/>;
      case "mes_alertes": return <MesAlertes user={user}/>;
      case "temps_travail": return isPro?<TempsDeTravail enfants={enfants} role={role} user={user}/>:<VerrouPro titre="Votre temps de travail" desc="Vos heures réunies, tous employeurs confondus, face aux plafonds légaux. Cette fonction fait partie du forfait Pro."/>;
      case "pmi": return isPro?<CommunicationPMI role={role} user={user} hasRealData={hasRealData}/>:<VerrouPro titre="La communication avec la PMI" desc="Vos échanges et vos justificatifs pour le service de PMI, réunis et datés. Cette fonction fait partie du forfait Pro."/>;
      case "periscolaire": return <PlanningPeriscolaire enfants={enfants} role={role} pEId={pEId}/>;
      case "forum": return <ForumCommunaute role={role}/>;
      case "rapport_annuel": return <RapportAnnuel enfants={enfants} role={role} pEId={pEId} user={user}/>;
      case "parrainage": return <Parrainage user={user}/>;
      case "simulateur": return <SimulateurCout enfants={enfants} pEId={pEId}/>;
      case "ik": return <IndemnitesKilometriques enfants={enfants} role={role} user={user}/>;
      case "solde_compte": return isPro?<SoldeDeCompte enfants={enfants} role={role} pEId={pEId} user={user}/>:<VerrouPro titre="Le solde de tout compte" desc="Indemnité compensatrice de congés payés, préavis et reçu pour solde de tout compte, calculés à la fin d'un contrat. Cette fonction fait partie du forfait Pro."/>;
      case "attestation_pe": return <AttestationPoleEmploi enfants={enfants} role={role} pEId={pEId} user={user}/>;
      case "attestation_fiscale": return isPro?<AttestationFiscale enfants={enfants} role={role} pEId={pEId} user={user}/>:<VerrouPro titre="L'attestation fiscale" desc="L'attestation annuelle à remettre aux parents employeurs pour leur crédit d'impôt. Cette fonction fait partie du forfait Pro."/>;
      case "fiche_urgence": return <FicheUrgence enfants={enfants} role={role} pEId={pEId} user={user}/>;
      case "projet_accueil": return <ProjetAccueil user={user} role={role}/>;
      case "boutique": return <Boutique user={user}/>;
      case "export_donnees": return <ExportDonnees enfants={enfants} user={user} role={role}/>;
      case "faq": return <VueAideSupport role={role} user={user}/>;
      case "aides_simulateurs": return <VueAidesSimulateurs enfants={enfants} role={role} pEId={pEId} user={user}/>;
      case "inviter_parent": return <InviterParent enfants={enfants} user={user}/>;
      case "mode_borne": return <ReglagesBorne enfants={enfants} user={user} onDemarrer={()=>setBorne(true)}/>;
      case "outils_hub": return <OutilsHub setPage={setPage}/>;
      case "support": return <Support role={role} user={user}/>;
      case "liste_attente": return <ListeAttente enfants={enfants} role={role} user={user}/>;
      case "kit_cmg": return <KitCMG enfants={enfants} role={role} pEId={pEId} user={user}/>;
      case "journal": return <JournalComplet {...P}/>;
      case "transmissions": return <JournalComplet {...P}/>;
      case "repas": return <JournalComplet {...P}/>;
      case "sommeil": return <JournalComplet {...P}/>;
      case "activites": return <JournalComplet {...P}/>;
      case "recit": return <JournalComplet {...P}/>;
      case "cr": return <JournalComplet {...P}/>;
      case "sante": return <SanteComplete {...P}/>;
      case "croissance": return <SanteComplete {...P}/>;
      case "eveil": return <EveilComplet {...P}/>;
      case "portfolio": return <EveilComplet {...P}/>;
      case "developpement": return <EveilComplet {...P}/>;
      case "documents": return <DocumentsComplet {...P}/>;
      case "export": return <DocumentsComplet {...P}/>;
      case "facturation": return <AdminFinances {...P} user={user}/>;
      case "contrats": return <AdminFinances {...P} user={user}/>;
      case "recap": return <AdminFinances {...P} user={user}/>;
      case "dashboard": return <TableauDeBord enfants={enfants} role={role} pEId={pEId} setPage={setPage}/>;
      default: return role==="asmat"?<AccueilAssMat enfants={enfants} setPage={setPage} user={user}/>:<AccueilParent enfant={enfants.find(e=>e.id===pEId)||enfants[0]} setPage={setPage} user={user}/>;
    }
      })()}
    </Suspense>;

  // MODE BORNE : l'appareil est pose dans l'entree, ou tendu a un parent. On
  // remplace TOUTE l'application — pas de barre du haut, pas de menu, pas de
  // notifications a l'ecran. Reserve a l'assistante maternelle : c'est sa
  // session qui ecrit, et le code de la famille dit qui a touche l'ecran.
  //
  // Reserve honnete : les notifications DANS l'application disparaissent, mais
  // une page web ne peut pas empecher le systeme d'afficher une banniere push
  // sur l'ecran. Le reglage le dit et conseille « Ne pas deranger ».
  if(borne&&role==="asmat"){
    return <><Styles/><div className={"app"+(dark?" dark":"")}>
      {/* Le mode borne se rend hors du routeur, donc hors de son Suspense :
          il lui faut le sien, sinon l'écran tendu au parent resterait blanc. */}
      <Suspense fallback={<div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--m)",fontSize:15}}>Ouverture de la borne…</div>}>
        <ModeBorne enfants={enfants} user={user} onQuitter={()=>setBorne(false)}/>
      </Suspense>
    </div></>;
  }

  return(
    <>
      <Styles/>
      <div className={"app"+(dark?" dark":"")+(role==="parent"?" espace-parent":role==="mam"?" espace-mam":"")}>
        {qrScan&&<div style={{position:"fixed",inset:0,zIndex:300,background:"rgba(0,0,0,.45)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={()=>setQrScan(null)}>
          <div className="card" style={{maxWidth:360,width:"100%",padding:"var(--pad-carte-l)",textAlign:"center"}} onClick={e=>e.stopPropagation()}>
            {qrScan.success?<>
              <div style={{fontSize:48,marginBottom:10}}>{qrScan.action==="depart"?"👋":"✅"}</div>
              <div className="pf" style={{fontSize:18,fontWeight:600,color:"var(--S)",marginBottom:6}}>
                {qrScan.action==="arrivee"?"Arrivée pointée":qrScan.action==="depart"?"Départ pointé":"Déjà pointé"}
              </div>
              <div style={{fontSize:13,color:"var(--m)",lineHeight:1.6}}>
                {qrScan.action==="arrivee"&&("Arrivée enregistrée à "+(qrScan.heure||"")+".")}
                {qrScan.action==="depart"&&("Départ enregistré à "+(qrScan.heure||"")+(qrScan.total!=null?(" — "+Math.floor(qrScan.total/60)+"h"+String(qrScan.total%60).padStart(2,"0")):"")+".")}
                {qrScan.action==="complete"&&"Le pointage du jour est déjà complet (arrivée et départ enregistrés)."}
              </div>
            </>:<>
              <div style={{fontSize:48,marginBottom:10}}>⚠️</div>
              <div className="pf" style={{fontSize:18,fontWeight:600,color:"var(--R)",marginBottom:6}}>Pointage non enregistré</div>
              <div style={{fontSize:13,color:"var(--m)",lineHeight:1.6}}>{qrScan.error==="non autorise"?"Ce QR ne correspond pas à un enfant de votre espace.":(qrScan.error||"Une erreur est survenue.")}</div>
            </>}
            <button className="btn bT" style={{marginTop:18,width:"100%",justifyContent:"center"}} onClick={()=>setQrScan(null)}>Fermer</button>
          </div>
        </div>}
        <TopBar role={role} groups={groups} page={page} setPage={setPage} user={user}
          onLogout={handleLogout}
          pmiNonLus={role==="parent"?0:pmiNonLus} dark={dark} setDark={setDark}
          notifNonLus={notifs.filter(n=>(!n.roles||n.roles.includes(role))&&!n.lu).length} notifs={notifs} setNotifs={setNotifs}
          showNotifs={showNotifs} setShowNotifs={setShowNotifs} setPage2={setPage}/>
        <BandeauHorsLigne/>
        <BandeauInstall/>
        {role==="parent"&&enfants.length>1&&<div style={{display:"flex",gap:8,alignItems:"center",padding:"10px 16px",overflowX:"auto",background:"var(--c)",borderBottom:"1px solid var(--br)"}}>
          <span style={{fontSize:12,fontWeight:700,color:"var(--m)",flexShrink:0}}>Mon enfant :</span>
          {enfants.map(e=><button key={e.id} onClick={()=>setPEIdSel(e.id)}
            style={{border:pEId===e.id?"2px solid var(--P)":"1px solid var(--br)",background:pEId===e.id?"var(--Pp)":"#fff",borderRadius:20,padding:"6px 13px",fontSize:13,fontWeight:pEId===e.id?700:600,color:pEId===e.id?"var(--P)":"var(--m)",cursor:"pointer",display:"inline-flex",alignItems:"center",gap:6,flexShrink:0}}>
            <span>{e.emoji||"👶"}</span>{e.prenom||"Enfant"}
          </button>)}
        </div>}
        <div className="content">
          <ActionBar page={page} setPage={setPage} role={role}/>
          {/* FIN D'ESSAI — le même message que le courriel, pour celle qui
              ouvre l'application sans avoir lu ses messages. Il ne s'affiche
              qu'aux seuils des rappels : un décompte permanent pendant deux
              mois serait un reproche quotidien. */}
          {role!=="parent"&&isTrialing&&joursEssai!==null&&joursEssai>0&&joursEssai<=7&&(
            <div style={{margin:"10px 12px 0",background:"#FFF4EF",border:"1px solid #F0D6CB",borderLeft:"3px solid #B4543F",borderRadius:12,padding:"12px 14px",display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}>
              <div style={{flex:"1 1 200px",minWidth:0}}>
                <div style={{fontWeight:700,color:"#2E4859",fontSize:14}}>
                  {joursEssai===1?"Vos deux mois offerts se terminent demain.":"Vos deux mois offerts se terminent dans "+joursEssai+" jours."}
                </div>
                <div style={{fontSize:12.5,color:"#55707C",marginTop:2,lineHeight:1.5}}>
                  Sans rien faire, votre compte repasse en formule gratuite. Rien n'est supprimé.
                </div>
              </div>
              <button onClick={lancerCheckout} style={{background:"#B4543F",color:"#fff",border:"none",borderRadius:10,padding:"10px 16px",fontSize:13,fontWeight:700,fontFamily:"inherit",cursor:"pointer",whiteSpace:"nowrap"}}>Continuer avec TiMat</button>
            </div>
          )}
          {/* ESSAI FINI — le compte est repassé en gratuit. On dit d'abord ce
              qui est CONSERVÉ : c'est la seule question que se pose quelqu'un
              qui voit une fonction se refermer. */}
          {role!=="parent"&&essaiFini&&(
            <div style={{margin:"10px 12px 0",background:"#F4F7F6",border:"1px solid #D8E4E1",borderLeft:"3px solid #2F655F",borderRadius:12,padding:"12px 14px",display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}>
              <div style={{flex:"1 1 200px",minWidth:0}}>
                <div style={{fontWeight:700,color:"#2E4859",fontSize:14}}>Vos deux mois offerts sont terminés.</div>
                <div style={{fontSize:12.5,color:"#55707C",marginTop:2,lineHeight:1.5}}>
                  Vos enfants, vos pointages et vos documents sont intacts. Reprendre l'abonnement rouvre le dossier exactement où vous l'aviez laissé.
                </div>
              </div>
              <button onClick={lancerCheckout} style={{background:"#B4543F",color:"#fff",border:"none",borderRadius:10,padding:"10px 16px",fontSize:13,fontWeight:700,fontFamily:"inherit",cursor:"pointer",whiteSpace:"nowrap"}}>Continuer avec TiMat</button>
            </div>
          )}
          {renderPage()}
        </div>
        <BottomNav groups={groups} page={page} setPage={setPage} role={role} pmiNonLus={role==="parent"?0:pmiNonLus}/>
        {showWelcome&&<BienvenueOnboarding role={role} user={user} setPage={setPage} onClose={closeWelcome}/>}
        {gToast&&<Toast msg={gToast} onClose={()=>setGToast("")}/>}
      </div>
    </>
  );
}
