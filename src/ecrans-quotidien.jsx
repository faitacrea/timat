// ============================================================
// ÉCRANS DU QUOTIDIEN — chargés à la demande
// ------------------------------------------------------------
// Le pointage, le calendrier, le cahier de la journée, les
// documents, la fiche d'urgence, l'export des données, l'ajout
// d'un enfant, l'accompagnement du premier jour, et le mode
// borne avec son pavé numérique.
//
// 3 500 lignes que la visiteuse de la landing téléchargeait
// avant de pouvoir lire le hero. Trois d'entre eux (pointage,
// calendrier, cahier) apparaissent dans la démo de la landing,
// mais seulement après un clic : ils arrivent donc à ce
// moment-là, derrière le Suspense de la démo.
// ============================================================
import { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "../lib/supabase.js";
import {
  ALLOC_FORMATION_H, AvatarEnfant, AvatarPicker, CPill, D, EmptyState, H, IconeOuEmoji, LIMITE_ENFANTS_GRATUIT, PageHeader, Pastille, PastilleRepas, QRPointage, QUALITE_REPAS, SEMAINES_MAX_ANNEE_INCOMPLETE, Toast, URL_CONVENTION, VACANCES_2024, estPro, fileHorsLigne, filerOperation, fmt, heuresMensualisees, isoJour, nbf, netDepuisBrut, qrSvgBalise, salaireMensualise, semainesDuContrat, typeEv, G, TODAY_STR, memoriserHorsLigne, lireHorsLigne, createNotification, sendNotificationEmail
} from "./App.jsx";
import {
  BORNE_BLOCAGE_MS, BORNE_ESSAIS_MAX, CATS, DOCS_DEMO, FERIES_2024, HEURES_TYPES, JOURS_SEM, RETENUE_TYPES, THEMES_CAL, borneCodeSortie, borneEmpreintes, borneFermer, borneMemoriserEmpreintes, borneOuvrir, empreinteCode, fmtDateHeureCourte, isVacances, minimumHoraireAu, nb2, nomVacances, tirerJetonBorne
} from "./socle.jsx";

export function PaveNumerique({longueur=4,valeur,setValeur,onAnnuler,libelleAnnuler="Annuler"}){
  const tape=(c)=>{if(valeur.length<longueur)setValeur(valeur+c);};
  const touche=(contenu,action,util)=>(
    <button type="button" key={String(contenu)} onClick={action}
      style={{background:"#fff",border:"1.5px solid var(--br)",borderRadius:12,padding:"16px 0",
        fontFamily:"inherit",fontSize:util?15:22,fontWeight:util?500:600,
        color:util?"var(--m)":"var(--b)",cursor:"pointer",minHeight:56}}>{contenu}</button>
  );
  return <>
    <div style={{display:"flex",justifyContent:"center",gap:14,padding:"14px 0 6px"}}>
      {Array.from({length:longueur},(_,i)=>
        <span key={i} style={{width:15,height:15,borderRadius:15,display:"block",
          border:"2px solid var(--br)",background:i<valeur.length?"var(--b)":"transparent",
          borderColor:i<valeur.length?"var(--b)":"var(--br)"}}/>)}
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:9}}>
      {["1","2","3","4","5","6","7","8","9"].map(c=>touche(c,()=>tape(c)))}
      {touche(libelleAnnuler,onAnnuler,true)}
      {touche("0",()=>tape("0"))}
      {touche("⌫",()=>setValeur(valeur.slice(0,-1)),true)}
    </div>
  </>;
}

// Le jeton du QR affiche a l'entree.
//
// Il ne porte PAS l'identifiant de l'enfant : un identifiant ne se revoque pas,
// un QR imprime reste au mur des annees. Le jeton, lui, se regenere — et le QR
// de la veille ne vaut plus rien. 32 caracteres tires du generateur
// cryptographique du navigateur, soit 192 bits : on ne le devine pas.

export function ReglagesBorne({enfants,user,onDemarrer}){
  const [contrats,setContrats]=useState([]);
  const [chargement,setChargement]=useState(true);
  const [toast,setToast]=useState("");
  const [sortie,setSortie]=useState(()=>borneCodeSortie());
  const [qr,setQr]=useState(null);   // enfant dont le QR est affiche en grand
  const list=(enfants||[]).filter(Boolean);

  const relire=async()=>{
    if(!user?.id){setChargement(false);return;}
    const{data,error}=await supabase.from("contrats")
      .select("id,enfant_id,code_borne,jeton_borne,actif").eq("asmat_id",user.id);
    setChargement(false);
    if(error){setToast("❌ "+error.message);return;}
    setContrats(data||[]);
  };
  useEffect(()=>{relire();/* eslint-disable-next-line */},[user?.id]);

  const codeDe=(enfantId)=>(contrats.find(c=>c.enfant_id===enfantId&&c.actif!==false)||{}).code_borne||"";
  const jetonDe=(enfantId)=>(contrats.find(c=>c.enfant_id===enfantId&&c.actif!==false)||{}).jeton_borne||"";

  // Quatre chiffres tires au hasard, sans suite evidente : 0000, 1234 et 1111
  // sont les premiers qu'on essaie.
  const tirerCode=()=>{
    const interdits=new Set(["0000","1111","2222","3333","4444","5555","6666","7777","8888","9999","1234","0123","4321","2580"]);
    for(let i=0;i<50;i++){
      const c=String(Math.floor(Math.random()*10000)).padStart(4,"0");
      if(!interdits.has(c))return c;
    }
    return "7391";
  };

  const attribuer=async(enfantId)=>{
    const c=contrats.find(x=>x.enfant_id===enfantId&&x.actif!==false);
    if(!c){setToast("❌ Aucun contrat actif pour cet enfant");return;}
    const code=tirerCode();
    const{error}=await supabase.from("contrats").update({code_borne:code}).eq("id",c.id);
    if(error){setToast("❌ "+error.message);return;}
    setToast("✅ Nouveau code : "+code);
    relire();
  };

  // Regenerer remplace le jeton : le QR imprime la veille cesse de fonctionner
  // le temps que la base ecrive. C'est exactement ce qu'on veut d'une affiche
  // qu'on a perdue, ou d'un parent parti.
  const donnerJeton=async(enfantId)=>{
    const c=contrats.find(x=>x.enfant_id===enfantId&&x.actif!==false);
    if(!c){setToast("❌ Aucun contrat actif pour cet enfant");return;}
    if(!c.code_borne){setToast("❌ Donnez d'abord un code à cette famille");return;}
    const j=tirerJetonBorne();
    const{error}=await supabase.from("contrats").update({jeton_borne:j}).eq("id",c.id);
    if(error){setToast("❌ "+error.message);return;}
    setToast(c.jeton_borne?"✅ Nouveau QR — l'ancien ne marche plus":"✅ QR créé");
    relire();
  };

  const retirerJeton=async(enfantId)=>{
    const c=contrats.find(x=>x.enfant_id===enfantId&&x.actif!==false);
    if(!c)return;
    const{error}=await supabase.from("contrats").update({jeton_borne:null}).eq("id",c.id);
    if(error){setToast("❌ "+error.message);return;}
    setToast("✅ QR désactivé");setQr(null);relire();
  };

  const cibleQr=(j)=>((typeof window!=="undefined"&&window.location.origin)||"https://www.timat.app")+"/p/"+j;

  const imprimerQr=(e,j)=>{
    const w=window.open("","_blank","width=440,height=620");if(!w)return;
    w.document.write("<html><head><meta charset='utf-8'><title>Pointage "+H(e.prenom||"Enfant")
      +"</title></head><body style='font-family:sans-serif;text-align:center;padding:30px'>"
      +"<h2>"+H(e.emoji||"👶")+" "+H(e.prenom||"Enfant")+"</h2>"+qrSvgBalise(cibleQr(j),300)
      +"<p style='color:#555;font-size:14px;max-width:320px;margin:16px auto;line-height:1.6'>"
      +"Scannez, puis tapez le code à 4 chiffres de votre famille.<br>"
      +"1er passage = arrivée · 2e passage = départ.</p></body></html>");
    w.document.close();setTimeout(()=>{try{w.print();}catch(x){}},400);
  };

  const demarrer=async()=>{
    if(!/^[0-9]{4}$/.test(sortie)){setToast("❌ Le code de sortie doit faire 4 chiffres");return;}
    const sansCode=list.filter(e=>!codeDe(e.id));
    if(sansCode.length){setToast("❌ Donnez d'abord un code à : "+sansCode.map(e=>e.prenom||"Enfant").join(", "));return;}
    // Les empreintes, jamais les codes en clair : c'est ce qui permet a la borne
    // de verifier un code sans reseau sans rien garder de lisible sur l'appareil.
    try{
      const m={};
      for(const e of list)m[e.id]=await empreinteCode(e.id,codeDe(e.id));
      borneMemoriserEmpreintes(m);
    }catch(err){setToast("❌ Empreintes des codes impossibles à calculer : "+String(err&&err.message||err));return;}
    borneOuvrir(sortie);
    onDemarrer();
  };

  const carte={background:"#fff",border:"1px solid var(--br)",borderRadius:14,padding:16,
    display:"flex",flexDirection:"column",gap:10,marginBottom:12};

  return <div className="fi">
    {toast&&<Toast msg={toast} onClose={()=>setToast("")}/>}

    <div style={carte}>
      <div style={{fontWeight:700,fontSize:15,color:"var(--b)"}}><IconeOuEmoji e="🚪"/> La borne d'entrée</div>
      <p style={{margin:0,fontSize:13,color:"var(--m)",lineHeight:1.6}}>
        L'appareil se verrouille sur l'écran de pointage : plus de menu, plus rien d'autre.
        Chaque parent touche le prénom de son enfant et tape le code de sa famille.
        Le pointage part sous votre compte, et compte comme validé par le parent.
      </p>
      <p style={{margin:0,fontSize:13,color:"var(--m)",lineHeight:1.6}}>
        Ça marche sur un appareil posé dans l'entrée, ou sur <b>votre propre téléphone</b>,
        que vous tendez au parent à l'arrivée. Rien à acheter.
      </p>
      <p style={{margin:0,fontSize:13,color:"var(--m)",lineHeight:1.6}}>
        Sans réseau, le pointage est gardé sur l'appareil et part au retour de la connexion,
        avec l'heure où le parent a touché l'écran. L'écran dit « en attente d'envoi »
        plutôt que « enregistré ».
      </p>
    </div>

    <div style={carte}>
      <div style={{fontWeight:700,fontSize:14,color:"var(--b)"}}>Votre code de sortie</div>
      <p style={{margin:0,fontSize:12.5,color:"var(--m)",lineHeight:1.55}}>
        Quatre chiffres, à vous, demandés pour quitter le mode borne. Ne le donnez à personne.
      </p>
      <input inputMode="numeric" maxLength={4} value={sortie} className="inp"
        onChange={e=>setSortie(e.target.value.replace(/[^0-9]/g,"").slice(0,4))}
        placeholder="4 chiffres" style={{maxWidth:150,fontSize:18,letterSpacing:"0.3em",fontVariantNumeric:"tabular-nums"}}/>
      <p style={{margin:0,fontSize:11.5,color:"var(--l)",lineHeight:1.5}}>
        Il est gardé sur cet appareil, pas dans votre compte : il empêche un parent de sortir
        de la borne et de se promener dans votre espace. Il ne remplace pas le verrouillage
        de l'appareil lui-même.
      </p>
    </div>

    <div style={carte}>
      <div style={{fontWeight:700,fontSize:14,color:"var(--b)"}}>Le code de chaque famille</div>
      <p style={{margin:0,fontSize:12.5,color:"var(--m)",lineHeight:1.55}}>
        À communiquer aux parents. Il dit qui a touché l'écran — il ne protège pas contre vous,
        qui pouvez déjà pointer depuis votre espace, mais contre l'erreur : la mauvaise vignette,
        l'enfant d'à côté.
      </p>
      {chargement?<p style={{fontSize:13,color:"var(--l)",margin:0}}>Chargement…</p>
      :!list.length?<p style={{fontSize:13,color:"var(--l)",margin:0}}>Aucun enfant accueilli.</p>
      :list.map(e=>{
        const c=codeDe(e.id);
        return <div key={e.id} style={{display:"flex",alignItems:"center",gap:11,padding:"9px 0",
          borderBottom:"1px solid var(--br)"}}>
          <span style={{fontSize:22,flexShrink:0}}>{e.emoji||"👶"}</span>
          <span style={{flex:1,minWidth:0,fontSize:14,fontWeight:600,color:"var(--b)"}}>{e.prenom||"Enfant"}</span>
          <span style={{fontFamily:"ui-monospace,monospace",fontSize:17,fontWeight:700,
            letterSpacing:"0.18em",color:c?"var(--b)":"var(--l)",fontVariantNumeric:"tabular-nums"}}>
            {c||"—"}
          </span>
          <button type="button" onClick={()=>attribuer(e.id)} className="btn bG s">
            {c?"Changer":"Donner un code"}
          </button>
        </div>;
      })}
    </div>

    <div style={carte}>
      <div style={{fontWeight:700,fontSize:14,color:"var(--b)"}}>Le QR à afficher à l'entrée</div>
      <p style={{margin:0,fontSize:12.5,color:"var(--m)",lineHeight:1.55}}>
        L'autre façon de faire, sans appareil à poser : une feuille au mur. Le parent la scanne
        avec son propre téléphone, tape le code de sa famille, c'est enregistré. Rien à installer,
        aucun compte à créer.
      </p>
      <p style={{margin:0,fontSize:12.5,color:"var(--m)",lineHeight:1.55}}>
        La page ne dit rien tant que le code n'est pas bon : ni le prénom, ni les heures.
        Au bout de cinq codes faux, elle se ferme un quart d'heure.
      </p>
      {chargement?<p style={{fontSize:13,color:"var(--l)",margin:0}}>Chargement…</p>
      :!list.length?<p style={{fontSize:13,color:"var(--l)",margin:0}}>Aucun enfant accueilli.</p>
      :list.map(e=>{
        const j=jetonDe(e.id);
        return <div key={e.id} style={{display:"flex",alignItems:"center",gap:11,padding:"9px 0",
          borderBottom:"1px solid var(--br)",flexWrap:"wrap"}}>
          <span style={{fontSize:22,flexShrink:0}}>{e.emoji||"👶"}</span>
          <span style={{flex:1,minWidth:90,fontSize:14,fontWeight:600,color:"var(--b)"}}>{e.prenom||"Enfant"}</span>
          {j
            ?<button type="button" onClick={()=>setQr(e)} className="btn bG s">Voir le QR</button>
            :<button type="button" onClick={()=>donnerJeton(e.id)} className="btn bG s">Créer le QR</button>}
        </div>;
      })}
      <p style={{margin:0,fontSize:11.5,color:"var(--l)",lineHeight:1.5}}>
        Le QR ne contient pas le nom de l'enfant, seulement une suite de caractères tirée au hasard.
        Si l'affiche est perdue, regénérez-la : celle qui traîne cesse aussitôt de fonctionner.
      </p>
    </div>

    <button type="button" onClick={demarrer} className="btn bT l"
      style={{width:"100%",justifyContent:"center"}}>
      Démarrer le mode borne →
    </button>
    <p style={{fontSize:11.5,color:"var(--l)",lineHeight:1.55,margin:"10px 2px 0",textAlign:"center"}}>
      Les notifications de l'application disparaissent pendant que la borne est ouverte.
      En revanche, une page web ne peut pas empêcher votre téléphone d'afficher une bannière :
      si vous tendez le vôtre, activez « Ne pas déranger ».
    </p>

    {qr&&jetonDe(qr.id)&&<div onClick={ev=>{if(ev.target===ev.currentTarget)setQr(null);}}
      style={{position:"fixed",inset:0,zIndex:9999,background:"rgba(20,30,40,.55)",
      display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div className="card" style={{maxWidth:330,width:"100%",textAlign:"center"}}>
        <div style={{fontWeight:700,fontSize:15,color:"var(--b)",marginBottom:4}}>
          {qr.emoji||"👶"} QR de {qr.prenom||"l'enfant"}
        </div>
        <div style={{fontSize:11.5,color:"var(--m)",marginBottom:12,lineHeight:1.5}}>
          À imprimer et afficher à l'entrée. Le parent scanne, tape <b>{codeDe(qr.id)||"son code"}</b>,
          et son arrivée puis son départ sont enregistrés.
        </div>
        <QRPointage valeur={cibleQr(jetonDe(qr.id))} taille={200}
          style={{borderRadius:12,border:"3px solid var(--br)"}}/>
        <div style={{display:"flex",gap:8,marginTop:14}}>
          <button type="button" className="btn bG" style={{flex:1,justifyContent:"center"}}
            onClick={()=>imprimerQr(qr,jetonDe(qr.id))}><IconeOuEmoji e="🖨️"/> Imprimer</button>
          <button type="button" className="btn bT" style={{flex:1,justifyContent:"center"}}
            onClick={()=>setQr(null)}>Fermer</button>
        </div>
        <div style={{display:"flex",gap:8,marginTop:8}}>
          <button type="button" className="btn bG s" style={{flex:1,justifyContent:"center"}}
            onClick={()=>donnerJeton(qr.id)}>Regénérer</button>
          <button type="button" className="btn bG s" style={{flex:1,justifyContent:"center"}}
            onClick={()=>retirerJeton(qr.id)}>Désactiver</button>
        </div>
      </div>
    </div>}
  </div>;
}

export function ModeBorne({enfants,user,onQuitter}){
  const list=(enfants||[]).filter(Boolean);
  const [statut,setStatut]=useState({});
  const [choisi,setChoisi]=useState(null);   // enfant en cours de pointage
  const [code,setCode]=useState("");
  const [erreur,setErreur]=useState("");
  const [fait,setFait]=useState(null);       // {prenom,emoji,action,heure}
  const [sortie,setSortie]=useState(false);  // pave de sortie ouvert
  const [codeSortie,setCodeSortie]=useState("");
  const [enLigne,setEnLigne]=useState(()=>typeof navigator==="undefined"||navigator.onLine!==false);
  const [heure,setHeure]=useState(()=>new Date().toTimeString().slice(0,5));
  const essais=useRef({});                   // {enfantId:{n,bloqueJusqu}}
  const ids=list.map(e=>e.id).join(",");

  const [enFile,setEnFile]=useState(()=>fileHorsLigne().length);
  useEffect(()=>{
    const t=setInterval(()=>setHeure(new Date().toTimeString().slice(0,5)),20000);
    // La borne remplace TOUTE l'application : le bandeau hors ligne, qui rejoue
    // la file au retour du reseau, n'est pas rendu. Sans le rejeu ci-dessous, un
    // pointage mis en file dormirait tant que la borne reste ouverte, donc toute
    // la journee.
    const vider=async()=>{
      if(!fileHorsLigne().length)return;
      const r=await rejouerFile();
      setEnFile(r.restantes);
      if(r.envoyees)relireStatut();
    };
    const on=()=>{setEnLigne(true);vider();};
    const off=()=>setEnLigne(false);
    const maj=()=>setEnFile(fileHorsLigne().length);
    window.addEventListener("online",on); window.addEventListener("offline",off);
    window.addEventListener("timat:file-hors-ligne",maj);
    const rappel=setInterval(()=>{if(navigator.onLine!==false)vider();},120000);
    if(navigator.onLine!==false)vider();
    return()=>{clearInterval(t);clearInterval(rappel);
      window.removeEventListener("online",on);window.removeEventListener("offline",off);
      window.removeEventListener("timat:file-hors-ligne",maj);};
    /* eslint-disable-next-line */
  },[]);

  const relireStatut=async()=>{
    if(!user?.id||!list.length)return;
    const{data,error}=await supabase.from("pointages")
      .select("enfant_id,arrivee,depart").in("enfant_id",list.map(e=>e.id)).eq("date",TODAY_STR);
    if(error)return;
    const m={};(data||[]).forEach(p=>{m[p.enfant_id]={arrivee:p.arrivee,depart:p.depart};});
    setStatut(m);
  };
  useEffect(()=>{relireStatut();/* eslint-disable-next-line */},[ids,user?.id]);
  // Un autre appareil peut pointer pendant que la borne est ouverte.
  useEffect(()=>{const t=setInterval(relireStatut,60000);return()=>clearInterval(t);/* eslint-disable-next-line */},[ids,user?.id]);

  const hhmm=(t)=>{if(!t)return"";const s=String(t);return s.includes("T")?s.split("T")[1].slice(0,5):s.slice(0,5);};

  const valider=async()=>{
    if(!choisi||code.length!==4)return;
    const e=choisi;
    const suivi=essais.current[e.id]||{n:0,bloqueJusqu:0};
    if(Date.now()<suivi.bloqueJusqu){
      setErreur("Trop d'essais. Réessayez dans un instant.");setCode("");return;
    }
    // Pas de reseau : le code est verifie ICI, contre l'empreinte gardee sur
    // l'appareil, puis le pointage part en file d'attente avec L'HEURE DE
    // MAINTENANT. L'ecran dit « en attente d'envoi », jamais « enregistré ».
    if(typeof navigator!=="undefined"&&navigator.onLine===false){
      const attendue=borneEmpreintes()[e.id];
      if(!attendue){
        setErreur("Pas de réseau, et cet enfant n'a pas de code sur cet appareil. Prévenez l'assistante maternelle.");
        setCode("");return;
      }
      const donnee=await empreinteCode(e.id,code);
      if(donnee!==attendue){
        const n=suivi.n+1;
        essais.current[e.id]={n,bloqueJusqu:n>=BORNE_ESSAIS_MAX?Date.now()+BORNE_BLOCAGE_MS:0};
        setErreur(n>=BORNE_ESSAIS_MAX?"Code incorrect. Bloqué une minute.":"Code incorrect.");
        setCode("");return;
      }
      const maintenant=new Date().toTimeString().slice(0,5);
      const st=statut[e.id]||{};
      filerOperation({rpc:"pointage_borne",cle:"borne:"+e.id+":"+TODAY_STR,
        charge:{enfant_id:e.id,code,heure:maintenant,date:TODAY_STR}});
      essais.current[e.id]={n:0,bloqueJusqu:0};
      setFait({prenom:e.prenom||"Enfant",emoji:e.emoji||"👶",
        action:st.arrivee?"depart":"arrivee",heure:maintenant,enFile:true});
      setStatut(m=>({...m,[e.id]:st.arrivee?{...st,depart:maintenant}:{arrivee:maintenant}}));
      setChoisi(null);setCode("");setErreur("");
      return;
    }
    const{data,error}=await supabase.rpc("pointage_borne",{p_enfant_id:e.id,p_code:code});
    if(error||!data?.success){
      const msg=error?.message||data?.error||"Enregistrement impossible";
      if(/code incorrect/i.test(msg)){
        const n=suivi.n+1;
        essais.current[e.id]={n,bloqueJusqu:n>=BORNE_ESSAIS_MAX?Date.now()+BORNE_BLOCAGE_MS:0};
        setErreur(n>=BORNE_ESSAIS_MAX
          ?"Code incorrect. Bloqué une minute."
          :"Code incorrect. Il reste "+(BORNE_ESSAIS_MAX-n)+" essai"+(BORNE_ESSAIS_MAX-n>1?"s":"")+".");
      }else setErreur(msg);
      setCode("");return;
    }
    essais.current[e.id]={n:0,bloqueJusqu:0};
    setFait({prenom:e.prenom||"Enfant",emoji:e.emoji||"👶",action:data.action,heure:data.heure});
    setChoisi(null);setCode("");setErreur("");
    await relireStatut();
  };
  useEffect(()=>{if(code.length===4)valider();/* eslint-disable-next-line */},[code]);
  useEffect(()=>{if(!fait)return;const t=setTimeout(()=>setFait(null),4000);return()=>clearTimeout(t);},[fait]);

  const tenterSortie=()=>{
    if(codeSortie!==borneCodeSortie()){setErreur("Code de sortie incorrect.");setCodeSortie("");return;}
    borneFermer();onQuitter();
  };
  useEffect(()=>{if(sortie&&codeSortie.length===4)tenterSortie();/* eslint-disable-next-line */},[codeSortie]);

  const cadre={minHeight:"100dvh",background:"var(--c)",display:"flex",flexDirection:"column"};
  const barre={background:"#2E4859",color:"#fff",padding:"12px 16px",display:"flex",
    justifyContent:"space-between",alignItems:"center",flexShrink:0};
  const corps={padding:16,display:"flex",flexDirection:"column",gap:11,flex:1,maxWidth:520,
    width:"100%",margin:"0 auto"};

  return <div style={cadre}>
    <div style={barre}>
      <span style={{fontWeight:700,fontSize:15}}>
        {choisi?((choisi.emoji||"👶")+" "+(choisi.prenom||"Enfant")):"Pointage"}
      </span>
      <span style={{fontSize:13,fontVariantNumeric:"tabular-nums",opacity:.75}}>{heure}</span>
    </div>

    {enLigne&&enFile>0&&<div style={{background:"#FBF1DC",borderBottom:"1px solid #E5D3A8",color:"#8A6420",
      fontSize:12.5,padding:"9px 16px",lineHeight:1.45,textAlign:"center"}}>
      <IconeOuEmoji e="⏳"/> {enFile} pointage{enFile>1?"s":""} en attente d'envoi.
    </div>}
    {!enLigne&&<div style={{background:"#FBF1DC",borderBottom:"1px solid #E5D3A8",color:"#8A6420",
      fontSize:12.5,padding:"9px 16px",lineHeight:1.45,textAlign:"center"}}>
      <IconeOuEmoji e="📵"/> Pas de réseau. Les pointages sont gardés sur l'appareil et partiront au retour de la connexion.
    </div>}

    <div style={corps}>
      {fait?<div style={{background:"var(--Sp)",border:"1px solid var(--Sl)",borderRadius:14,
          padding:"26px 18px",textAlign:"center",display:"flex",flexDirection:"column",gap:7}}>
          <span style={{fontSize:40,fontWeight:800,color:"var(--S)",lineHeight:1,fontVariantNumeric:"tabular-nums"}}>{fait.heure}</span>
          <span style={{fontSize:15,fontWeight:700,color:"var(--b)"}}>
            {fait.emoji} {fait.prenom} {fait.action==="depart"?"est reparti":"est arrivé"}
          </span>
          <span style={{fontSize:12.5,color:"var(--m)"}}>
            {fait.enFile
              ?"Gardé sur l'appareil : pas de réseau. Il partira dès que la connexion revient."
              :"Enregistré. Ses parents le voient déjà dans l'application."}
          </span>
        </div>

      :choisi?<>
        <p style={{textAlign:"center",fontSize:13.5,color:"var(--m)",margin:0}}>Code de la famille</p>
        <PaveNumerique valeur={code} setValeur={v=>{setErreur("");setCode(v);}}
          onAnnuler={()=>{setChoisi(null);setCode("");setErreur("");}}/>
        {erreur&&<p style={{textAlign:"center",fontSize:12.5,color:"var(--R)",margin:0,lineHeight:1.45}}>{erreur}</p>}
      </>

      :sortie?<>
        <p style={{textAlign:"center",fontSize:13.5,color:"var(--m)",margin:0}}>Code de sortie du mode borne</p>
        <PaveNumerique valeur={codeSortie} setValeur={v=>{setErreur("");setCodeSortie(v);}}
          onAnnuler={()=>{setSortie(false);setCodeSortie("");setErreur("");}} libelleAnnuler="Retour"/>
        {erreur&&<p style={{textAlign:"center",fontSize:12.5,color:"var(--R)",margin:0}}>{erreur}</p>}
      </>

      :<>
        <p style={{textAlign:"center",fontSize:13.5,color:"var(--m)",margin:"2px 0 4px"}}>
          Touchez le prénom de votre enfant
        </p>
        {!list.length&&<p style={{textAlign:"center",fontSize:13,color:"var(--l)"}}>Aucun enfant accueilli.</p>}
        {list.map(e=>{
          const st=statut[e.id]||{};
          const fini=st.arrivee&&st.depart, enCours=st.arrivee&&!st.depart;
          const etat=fini?(hhmm(st.arrivee)+" → "+hhmm(st.depart))
                    :enCours?("arrivé à "+hhmm(st.arrivee))
                    :"pas encore arrivé";
          const pastille=fini?"var(--l)":enCours?"var(--S)":"var(--br)";
          return <button key={e.id} type="button" disabled={!!fini}
            onClick={()=>{setChoisi(e);setCode("");setErreur("");}}
            style={{background:"#fff",border:"1.5px solid var(--br)",borderRadius:14,padding:"13px 14px",
              display:"flex",alignItems:"center",gap:13,cursor:fini?"default":"pointer",
              opacity:fini?.65:1,textAlign:"left",fontFamily:"inherit",width:"100%"}}>
            <span style={{width:46,height:46,borderRadius:14,background:"var(--c)",display:"flex",
              alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>{e.emoji||"👶"}</span>
            <span style={{flex:1,minWidth:0,display:"flex",flexDirection:"column",gap:2}}>
              <b style={{fontSize:16,fontWeight:700,color:"var(--b)"}}>{e.prenom||"Enfant"}</b>
              <span style={{fontSize:12,color:"var(--m)",display:"flex",alignItems:"center",gap:6}}>
                <i style={{width:7,height:7,borderRadius:7,background:pastille,flexShrink:0,display:"block"}}/>{etat}
              </span>
            </span>
            <span style={{fontSize:12.5,fontWeight:700,padding:"8px 12px",borderRadius:9,whiteSpace:"nowrap",
              background:fini?"var(--c)":enCours?"#B8622F":"#2E4859",color:fini?"var(--m)":"#fff"}}>
              {fini?"Terminé":enCours?"Départ":"Arrivée"}
            </span>
          </button>;
        })}
      </>}
    </div>

    {!sortie&&!choisi&&<div style={{padding:"10px 16px 18px",textAlign:"center",flexShrink:0}}>
      <button type="button" onClick={()=>{setSortie(true);setCodeSortie("");setErreur("");}}
        style={{background:"none",border:"none",color:"var(--l)",fontSize:12,cursor:"pointer",
          fontFamily:"inherit",padding:"10px 14px",minHeight:40}}>
        Quitter le mode borne
      </button>
    </div>}
  </div>;
}

export function Pointage({enfants,role,pEId,user,demoMode=false}){
  const [selId,setSelId]=useState(enfants[0]?.id);
  const [pts,setPts]=useState([]);
  const [toast,setToast]=useState("");
  const [saving,setSaving]=useState(false);
  const [showQR,setShowQR]=useState(false);
  // POINTAGE WORKFLOW P14E - mode edition manuelle si besoin (rectifier une heure)
  const [editMode,setEditMode]=useState(false);
  const [copieLe,setCopieLe]=useState("");
  const [arrEdit,setArrEdit]=useState("");
  const [depEdit,setDepEdit]=useState("");
  const liste=role==="parent"?enfants.filter(e=>e.id===pEId):enfants;
  const enfant=liste.find(e=>e.id===selId)||liste[0];

  // Charger les pointages depuis Supabase
  useEffect(()=>{
    if(!enfant?.id)return;
    if(demoMode){setPts(D.pointages.filter(p=>p.eId===enfant?.id));return;}
    const charger=async()=>{
      const cleHL="pointages:"+enfant.id;
      let data=null;
      try{
        const r=await supabase.from("pointages")
          .select("*").eq("enfant_id",enfant.id)
          .order("date",{ascending:false}).limit(30);
        if(r.error)throw r.error;
        data=r.data;
        // Copie locale : c'est elle qu'on relira si le reseau manque demain.
        if(data)memoriserHorsLigne(cleHL,data);
        setCopieLe("");
      }catch(e){
        const copie=lireHorsLigne(cleHL);
        if(!copie)return;               // rien en reserve : on n'invente pas
        data=copie.valeur;
        setCopieLe(copie.le);           // et on dit de quand elle date
      }
      if(data&&data.length>0){
        setPts(data.map(p=>({
          id:p.id,eId:p.enfant_id,date:p.date,
          arr:p.arrivee,dep:p.depart,
          arr_raw:p.arrivee,dep_raw:p.depart,
          tot:p.total_minutes?Math.floor(p.total_minutes/60)+"h"+String(p.total_minutes%60).padStart(2,"0"):null,
          totMin:p.total_minutes,
          valide:true,valide_parent:p.valide_parent,
          mode_pointage:p.mode_pointage||"asmat",
          date_validation:p.date_validation_parent,
          modified_by_parent:!!p.modified_by_parent_at,
        })));
      }else{
        setPts(D.pointages.filter(p=>p.eId===enfant?.id));
      }
    };
    charger();
  },[enfant?.id,demoMode]);

  // Les pointages encore en file font partie de ce qui est affiche. Sans cela,
  // l'ecran repasse a « pas encore pointe » des qu'il se recharge : la personne
  // croit avoir rate son geste et pointe une seconde fois.
  const [fileLocale,setFileLocale]=useState([]);
  useEffect(()=>{
    const relire=()=>setFileLocale(fileHorsLigne());
    relire();
    window.addEventListener("timat:file-hors-ligne",relire);
    return()=>window.removeEventListener("timat:file-hors-ligne",relire);
  },[]);
  const ptsAffiches=useMemo(()=>{
    const attente=fileLocale
      .filter(f=>f.table==="pointages"&&f.charge&&f.charge.enfant_id===enfant?.id)
      .map(f=>{
        const t=f.charge.total_minutes;
        return{id:f.id,eId:f.charge.enfant_id,date:f.charge.date,
          arr:f.charge.arrivee,dep:f.charge.depart,arr_raw:f.charge.arrivee,dep_raw:f.charge.depart,
          tot:t?Math.floor(t/60)+"h"+String(t%60).padStart(2,"0"):null,totMin:t,
          valide:true,valide_parent:false,mode_pointage:"asmat",enAttente:true};
      });
    const dates=new Set(attente.map(p=>p.date));
    return[...attente,...pts.filter(p=>!dates.has(p.date))];
  },[pts,fileLocale,enfant?.id]);
  const ptJ=ptsAffiches.find(p=>p.eId===enfant?.id&&p.date===TODAY_STR);
  const ptH=ptsAffiches.filter(p=>p.eId===enfant?.id).sort((a,b)=>b.date>a.date?-1:1);

  // Calcul bilan mensuel
  const heuresMois=ptsAffiches.filter(p=>p.eId===enfant?.id&&p.totMin).reduce((s,p)=>s+(p.totMin||0),0);
  const heuresPrev=heuresMensualisees(enfant?.contrat);
  const soldeMin=heuresMois-heuresPrev*60;

  // POINTAGE WORKFLOW P14E - pointer l'arrivee maintenant (heure auto)
  const pointerArrivee=async()=>{
    if(demoMode){setToast("Démo : action désactivée");return;}
    if(!enfant)return;
    setSaving(true);
    const now=new Date();
    const heureArr=String(now.getHours()).padStart(2,"0")+":"+String(now.getMinutes()).padStart(2,"0");
    const r=await enregistrerPointage({
      enfant_id:enfant.id,
      asmat_id:user?.id||(await supabase.auth.getUser()).data.user?.id,
      date:TODAY_STR,
      arrivee:heureArr,
      depart:null,
      total_minutes:null,
      valide_parent:false,
      mode_pointage:"asmat",
    });
    if(r.etat==="erreur"){
      setToast("Erreur : "+r.message);setSaving(false);return;
    }
    const data=null;
    setPts(p=>{
      const filtered=p.filter(x=>!(x.eId===enfant.id&&x.date===TODAY_STR));
      return[{id:data?.id||"ptn"+Date.now(),eId:enfant.id,date:TODAY_STR,arr:heureArr,dep:null,arr_raw:heureArr,dep_raw:null,tot:null,totMin:null,valide:true,valide_parent:false,mode_pointage:"asmat"},...filtered];
    });
    if(r.etat==="envoye")await logAction("pointage_arrivee",{table_name:"pointages",record_id:data?.id});
    setToast(r.etat==="en-file"?"Arrivée notée à "+heureArr+" — en attente de réseau":"✅ Arrivée pointée à "+heureArr);
    setSaving(false);
    if(r.etat==="envoye")window.dispatchEvent(new CustomEvent("timat:refresh-data"));
  };

  // POINTAGE WORKFLOW P14E - pointer le depart maintenant (heure auto, calcul total)
  const pointerDepart=async()=>{
    if(demoMode){setToast("Démo : action désactivée");return;}
    if(!enfant||!ptJ?.arr)return;
    setSaving(true);
    const now=new Date();
    const heureDep=String(now.getHours()).padStart(2,"0")+":"+String(now.getMinutes()).padStart(2,"0");
    // Calcul total minutes
    const[h1,m1]=ptJ.arr.split(":").map(Number);
    const[h2,m2]=heureDep.split(":").map(Number);
    const totalMin=(h2*60+m2)-(h1*60+m1);
    const r=await enregistrerPointage({
      enfant_id:enfant.id,
      asmat_id:user?.id||(await supabase.auth.getUser()).data.user?.id,
      date:TODAY_STR,
      arrivee:ptJ.arr,
      depart:heureDep,
      total_minutes:totalMin,
      valide_parent:false,
      mode_pointage:"asmat",
    });
    if(r.etat==="erreur"){
      setToast("Erreur : "+r.message);setSaving(false);return;
    }
    const totStr=Math.floor(totalMin/60)+"h"+String(totalMin%60).padStart(2,"0");
    setPts(p=>p.map(x=>(x.eId===enfant.id&&x.date===TODAY_STR)?{...x,dep:heureDep,dep_raw:heureDep,tot:totStr,totMin:totalMin}:x));
    if(r.etat==="envoye")await logAction("pointage_depart",{table_name:"pointages",record_id:ptJ.id});
    // EMAIL NOTIF P14E - notifier le parent qu'un pointage est en attente de validation.
    // Jamais quand le pointage est encore en file : on annoncerait au parent
    // un pointage que le serveur n'a pas.
    if(r.etat==="envoye"&&(enfant?.contrat?.parent_id||enfant?.parent_id)){
      const parentId=enfant.contrat?.parent_id||enfant.parent_id;
      createNotification({userId:parentId,type:"pointage_a_valider",titre:"Un pointage attend votre validation"+(enfant?.prenom?(" — "+enfant.prenom):""),page:"pointage"});
      supabase.rpc("get_recipient_email",{p_user_id:parentId}).then(({data:p})=>{
        if(p?.email){
          sendNotificationEmail({
            type:"pointage_a_valider",
            to:p.email,
            subject:"Un pointage attend votre validation",
            template:"pointage_a_valider",
            vars:{parent_prenom:p.prenom||"",enfant_prenom:enfant.prenom||"",date:new Date().toLocaleDateString("fr-FR"),duree:totStr,url:window.location.origin},
          });
        }
      });
    }
    setToast(r.etat==="en-file"?"Départ noté à "+heureDep+" ("+totStr+") — en attente de réseau":"✅ Départ pointé à "+heureDep+" — "+totStr);
    setSaving(false);
    if(r.etat==="envoye")window.dispatchEvent(new CustomEvent("timat:refresh-data"));
  };

  // POINTAGE WORKFLOW P14E - edition manuelle (rectifier une heure mal saisie)
  const sauverEdition=async()=>{
    if(demoMode){setToast("Démo : action désactivée");return;}
    if(!arrEdit||!enfant)return;
    setSaving(true);
    const[h1,m1]=arrEdit.split(":").map(Number);
    const totalMin=depEdit?(()=>{const[h2,m2]=depEdit.split(":").map(Number);return(h2*60+m2)-(h1*60+m1);})():null;
    const r=await enregistrerPointage({
      enfant_id:enfant.id,
      asmat_id:user?.id||(await supabase.auth.getUser()).data.user?.id,
      date:TODAY_STR,
      arrivee:arrEdit,
      depart:depEdit||null,
      total_minutes:totalMin,
      valide_parent:false,
      mode_pointage:"asmat",
    });
    if(r.etat==="erreur"){setToast("Erreur : "+r.message);setSaving(false);return;}
    const totStr=totalMin?Math.floor(totalMin/60)+"h"+String(totalMin%60).padStart(2,"0"):null;
    setPts(p=>{
      const filtered=p.filter(x=>!(x.eId===enfant.id&&x.date===TODAY_STR));
      return[{id:"ptn"+Date.now(),eId:enfant.id,date:TODAY_STR,arr:arrEdit,dep:depEdit,arr_raw:arrEdit,dep_raw:depEdit,tot:totStr,totMin:totalMin,valide:true,valide_parent:false,mode_pointage:"asmat"},...filtered];
    });
    setArrEdit("");setDepEdit("");setEditMode(false);
    setToast(r.etat==="en-file"?"Correction notée — en attente de réseau":"Pointage corrigé ✓");
    setSaving(false);
  };

  // POINTAGE WORKFLOW P14G - validation avec auto-signature si dispo
  const validerPointage=async(ptId,signature)=>{
    if(demoMode){setToast("Démo : action désactivée");return;}
    // Si pas de signature passee, utiliser la signature standard du parent (si elle existe)
    const sigFinale=signature||user?.signature_base64||null;
    const{data,error}=await supabase.rpc("validate_pointage_as_parent",{
      p_pointage_id:ptId,
      p_signature:sigFinale,
    });
    if(error){
      setToast("Erreur : "+error.message);
      return;
    }
    if(!data?.success){
      setToast("Erreur : "+(data?.error||"echec validation"));
      return;
    }
    setPts(p=>p.map(x=>x.id===ptId?{...x,valide_parent:true,date_validation:data.date||new Date().toISOString()}:x));
    setToast(sigFinale?"Pointage validé avec signature ✓":"Pointage validé ✓");
    await logAction("valide_pointage",{table_name:"pointages",record_id:ptId});
  };

  // POINTAGE WORKFLOW P14G - state pour modale modification + validation parent
  const [modifParent,setModifParent]=useState(null); // {ptId, arr, dep}
  // CONTESTATION D'UN POINTAGE.
  //
  // Un releve de presence fait foi devant la PMI et aux prud'hommes. Un releve
  // qu'une seule partie fabrique, non. Le pointage de la borne arrive DEJA
  // valide — c'est le parent qui a tape le code — donc les boutons
  // « Je valide / Modifier » ne s'affichent pas : sans ce qui suit, le parent
  // n'avait plus aucun moyen de dire qu'une heure est fausse.
  //
  // La trace reste apres reglement : la table n'a aucune regle DELETE, et on ne
  // change que l'etat. C'est elle qui transforme un releve unilateral en releve
  // contradictoire.
  const [conts,setConts]=useState([]);          // contestations des pointages affiches
  const [contester,setContester]=useState(null); // {pointage, champ, heure}
  const [contMotif,setContMotif]=useState("");
  const [contHeure,setContHeure]=useState("");
  const [repondre,setRepondre]=useState(null);   // cote assmat
  const [contReponse,setContReponse]=useState("");

  const chargerContestations=async(ids)=>{
    if(demoMode||!ids?.length){setConts([]);return;}
    const{data,error}=await supabase.from("contestations_pointage")
      .select("*").in("pointage_id",ids).order("created_at",{ascending:false});
    if(!error)setConts(data||[]);
  };
  const contsDe=(ptId)=>conts.filter(c=>c.pointage_id===ptId);
  const idsPts=pts.map(x=>x.id).filter(Boolean).join(",");
  useEffect(()=>{chargerContestations(idsPts?idsPts.split(","):[]);/* eslint-disable-next-line */},[idsPts,demoMode]);

  const versHHMM=(h)=>String(h||"").replace("h",":").slice(0,5);

  const envoyerContestation=async()=>{
    if(demoMode){setToast("Démo : action désactivée");return;}
    const c=contester; if(!c)return;
    if(contHeure&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(contHeure)){setToast("❌ Heure attendue au format 08:30");return;}
    const{error}=await supabase.from("contestations_pointage").insert({
      pointage_id:c.pointage.id,
      asmat_id:c.pointage.asmat_id,
      parent_id:user?.id,
      champ:c.champ,
      heure_enregistree:c.heure||null,
      heure_proposee:contHeure||null,
      motif:contMotif||null,
    });
    if(error){setToast("Erreur : "+error.message);return;}
    setToast("Signalement envoyé ✓");
    setContester(null);setContMotif("");setContHeure("");
    await chargerContestations(pts.map(x=>x.id));
  };

  // Cote assistante maternelle : accepter corrige l'heure ET regle la
  // contestation ; refuser la regle en laissant l'heure. Dans les deux cas la
  // ligne reste, avec sa reponse.
  const reglerContestation=async(accepte)=>{
    if(demoMode){setToast("Démo : action désactivée");return;}
    const c=repondre; if(!c)return;
    if(accepte&&c.heure_proposee){
      const pt=pts.find(x=>x.id===c.pointage_id);
      const maj=c.champ==="arrivee"?{arrivee:c.heure_proposee}:{depart:c.heure_proposee};
      const arr=c.champ==="arrivee"?c.heure_proposee:(pt?.arr_raw||pt?.arr||null);
      const dep=c.champ==="depart"?c.heure_proposee:(pt?.dep_raw||pt?.dep||null);
      if(arr&&dep){
        const m=(h)=>Number(String(h).split(":")[0])*60+Number(String(h).split(":")[1]);
        maj.total_minutes=Math.max(0,m(dep)-m(arr));
      }
      const r=await enregistrerPointage({enfant_id:pt?.eId||pt?.enfant_id,date:pt?.date,asmat_id:user?.id,...maj});
      if(r.etat==="erreur"){setToast("Erreur : "+r.message);return;}
      if(r.etat==="en-file"){setToast("📵 Correction en attente de réseau");}
    }
    const{error:e2}=await supabase.from("contestations_pointage").update({
      etat:accepte?"acceptee":"refusee",
      reponse_asmat:contReponse||null,
      resolue_at:new Date().toISOString(),
    }).eq("id",c.id);
    if(e2){setToast("Erreur : "+e2.message);return;}
    setToast(accepte?"Heure corrigée ✓":"Signalement clos ✓");
    setRepondre(null);setContReponse("");
    await chargerContestations(pts.map(x=>x.id));
  };


  // POINTAGE WORKFLOW P14G - modifier ET valider en une fois (parent)
  const modifierEtValider=async()=>{
    if(demoMode){setToast("Démo : action désactivée");return;}
    if(!modifParent?.id||!modifParent.arr)return;
    const sigFinale=user?.signature_base64||null;
    const{data,error}=await supabase.rpc("modify_and_validate_pointage_as_parent",{
      p_pointage_id:modifParent.id,
      p_arrivee:modifParent.arr,
      p_depart:modifParent.dep||null,
      p_signature:sigFinale,
    });
    if(error){setToast("Erreur : "+error.message);return;}
    if(!data?.success){setToast("Erreur : "+(data?.error||"echec"));return;}
    const totMin=data.total_minutes;
    const totStr=totMin?Math.floor(totMin/60)+"h"+String(totMin%60).padStart(2,"0"):null;
    setPts(p=>p.map(x=>x.id===modifParent.id?{
      ...x,arr:modifParent.arr,dep:modifParent.dep,arr_raw:modifParent.arr,dep_raw:modifParent.dep,
      tot:totStr,totMin:totMin,valide_parent:true,date_validation:data.date,
      modified_by_parent:true,
    }:x));
    setToast("Heures corrigées et pointage validé ✓");
    setModifParent(null);
    await logAction("modify_validate_pointage",{table_name:"pointages",record_id:modifParent.id});
  };

  return <div className="fi">
    {toast&&<Toast msg={toast}onClose={()=>setToast("")}icone={/en attente de réseau/.test(toast)?"📵":"✅"}/>}
    {/* Donnees hors ligne : on ne les affiche jamais sans dire de quand elles datent. */}
    {copieLe&&<div style={{background:"#FEF9C3",border:"1px solid #FCD34D",color:"#92400E",borderRadius:12,padding:"8px 12px",fontSize:12,fontWeight:600,marginBottom:10}}>
      <IconeOuEmoji e="📵"/> Affichage hors ligne — copie du {fmtDateHeureCourte(copieLe)}. Les pointages faits ailleurs depuis ne sont pas visibles.
    </div>}
    {/* Signaler une heure fausse — cote parent. */}
    {contester&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999,padding:16}}>
      <div className="card" style={{maxWidth:440,width:"100%",display:"flex",flexDirection:"column",gap:12}}>
        <div style={{fontWeight:700,fontSize:15,color:"var(--b)"}}>
          <IconeOuEmoji e="🔎"/> Signaler {contester.champ==="arrivee"?"l'arrivée":"le départ"} du{" "}
          {new Date(contester.pointage.date).toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"})}
        </div>
        <p style={{margin:0,fontSize:12.5,color:"var(--m)",lineHeight:1.55}}>
          Heure enregistrée : <b>{contester.heure||"—"}</b>. Indiquez l'heure que vous pensez juste ;
          l'assistante maternelle la corrige ou vous répond. <b>Le signalement reste inscrit dans l'historique
          une fois réglé</b> — c'est ce qui donne sa valeur au relevé.
        </p>
        <div>
          <label className="lbl" htmlFor="cont-heure">Heure que vous proposez</label>
          <input id="cont-heure" className="inp" value={contHeure} placeholder="08:30" inputMode="numeric"
            onChange={e=>setContHeure(e.target.value)} style={{maxWidth:130}}/>
        </div>
        <div>
          <label className="lbl" htmlFor="cont-motif">Ce que vous voulez expliquer (facultatif)</label>
          <textarea id="cont-motif" className="inp" rows={3} value={contMotif}
            onChange={e=>setContMotif(e.target.value)} style={{resize:"vertical",lineHeight:1.5}}
            placeholder="Je suis arrivé vers 8 h 15, pas 8 h 30."/>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button type="button" className="btn bG" style={{flex:1,justifyContent:"center"}}
            onClick={()=>{setContester(null);setContMotif("");setContHeure("");}}>Annuler</button>
          <button type="button" className="btn bT" style={{flex:1,justifyContent:"center"}}
            onClick={envoyerContestation}>Envoyer</button>
        </div>
      </div>
    </div>}

    {/* Repondre a un signalement — cote assistante maternelle. */}
    {repondre&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999,padding:16}}>
      <div className="card" style={{maxWidth:440,width:"100%",display:"flex",flexDirection:"column",gap:12}}>
        <div style={{fontWeight:700,fontSize:15,color:"var(--b)"}}>
          <IconeOuEmoji e="🔎"/> Signalement sur {repondre.champ==="arrivee"?"l'arrivée":"le départ"}
        </div>
        <p style={{margin:0,fontSize:12.5,color:"var(--m)",lineHeight:1.55}}>
          Enregistré à <b>{repondre.heure_enregistree||"—"}</b>
          {repondre.heure_proposee?<> — le parent propose <b>{repondre.heure_proposee}</b></>:null}.
          {repondre.motif?<span style={{display:"block",marginTop:4}}>« {repondre.motif} »</span>:null}
        </p>
        <div>
          <label className="lbl" htmlFor="cont-reponse">Votre réponse (facultative)</label>
          <textarea id="cont-reponse" className="inp" rows={3} value={contReponse}
            onChange={e=>setContReponse(e.target.value)} style={{resize:"vertical",lineHeight:1.5}}/>
        </div>
        <p style={{margin:0,fontSize:11.5,color:"var(--l)",lineHeight:1.5}}>
          Accepter corrige l'heure du pointage. Dans les deux cas, le signalement et votre réponse
          restent inscrits dans l'historique.
        </p>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <button type="button" className="btn bG" style={{flex:1,justifyContent:"center"}}
            onClick={()=>{setRepondre(null);setContReponse("");}}>Fermer</button>
          <button type="button" className="btn bG" style={{flex:1,justifyContent:"center"}}
            onClick={()=>reglerContestation(false)}>Maintenir l'heure</button>
          <button type="button" className="btn bT" style={{flex:1,justifyContent:"center"}}
            onClick={()=>reglerContestation(true)} disabled={!repondre.heure_proposee}>
            Corriger
          </button>
        </div>
      </div>
    </div>}

    {/* POINTAGE WORKFLOW P14G - modale modification heures parent */}
    {modifParent&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999,padding:16}}>
      <div className="card" style={{padding:0,maxWidth:480,width:"100%"}}>
        <div style={{padding:"14px 18px",borderBottom:"1px solid var(--br)",fontWeight:700,fontSize:14,color:"var(--b)"}}>
          <IconeOuEmoji e="✏️"/> Corriger les heures du {new Date(modifParent.date).toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"})}
          <div style={{fontSize:11,color:"var(--l)",fontWeight:400,marginTop:4}}>
            Vous pouvez ajuster les heures saisies par l'assistante maternelle si elles sont incorrectes.
          </div>
        </div>
        <div style={{padding:18}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
            <div>
              <label className="lbl">Arrivée</label>
              <input type="time" className="inp" value={modifParent.arr}
                onChange={e=>setModifParent(m=>({...m,arr:e.target.value}))}/>
            </div>
            <div>
              <label className="lbl">Départ</label>
              <input type="time" className="inp" value={modifParent.dep}
                onChange={e=>setModifParent(m=>({...m,dep:e.target.value}))}/>
            </div>
          </div>
          <div style={{padding:"10px 12px",background:"var(--Bp)",borderRadius:8,fontSize:11,color:"var(--B)",lineHeight:1.5,marginBottom:14}}>
            <IconeOuEmoji e="ℹ️"/> En enregistrant, vous validez le pointage avec ces nouvelles heures.
            {user?.signature_base64?" Votre signature sera apposée automatiquement.":" Aucune signature ne sera apposée (vous pouvez en créer une dans Paramètres)."}
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
            <button className="btn bG" onClick={()=>setModifParent(null)}>Annuler</button>
            <button className="btn bT" onClick={modifierEtValider} disabled={!modifParent.arr}>
              <IconeOuEmoji e="✅"/> Enregistrer et valider
            </button>
          </div>
        </div>
      </div>
    </div>}
    <PageHeader icon="⏰" title="Pointage des heures" sub="Suivi quotidien et bilan mensuel"/>
    {role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
      {liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>setSelId(e.id)}/>)}</div>}
    <div className="g2">
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div className="card">
          <div style={{fontWeight:700,marginBottom:12,color:"var(--b)"}}><IconeOuEmoji e="📊"/> Bilan du mois - {enfant?.prenom}</div>
          <div className="g3"style={{marginBottom:12}}>
            {[
              ["Prévues",heuresPrev+"h","var(--B)"],
              ["Réalisées",Math.floor(heuresMois/60)+"h"+String(heuresMois%60).padStart(2,"0"),"var(--S)"],
              ["Solde",(soldeMin>=0?"+":"-")+Math.floor(Math.abs(soldeMin)/60)+"h"+String(Math.abs(soldeMin)%60).padStart(2,"0"),soldeMin<0?"var(--R)":"var(--S)"]
            ].map(([l,v,c])=>
              <div key={l}style={{background:"var(--c)",borderRadius:10,padding:12,textAlign:"center"}}>
                <div className="pf"style={{fontSize:20,fontWeight:700,color:c}}>{v}</div>
                <div style={{fontSize:11,color:"var(--l)",marginTop:2}}>{l}</div>
              </div>)}
          </div>
        </div>
        <div className="card">
          <div style={{fontWeight:700,marginBottom:12,color:"var(--b)"}}><IconeOuEmoji e="📍"/> Aujourd'hui</div>
          {ptJ?<div style={{background:"var(--Sp)",borderRadius:10,padding:12,border:"1px solid var(--Sl)",marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              {[["Arrivée",ptJ.arr,"var(--S)"],["→","","var(--l)"],["Départ",ptJ.dep||"En cours","var(--T)"],["Total",ptJ.tot||"-","var(--b)"]].map(([l,v,c])=>
                <div key={l}style={{textAlign:"center"}}><div style={{fontSize:11,color:"var(--l)"}}>{l}</div>
                  <div className="pf"style={{fontSize:18,fontWeight:700,color:c}}>{v}</div></div>)}
            </div>
          </div>:<div style={{fontSize:13,color:"var(--l)",marginBottom:12}}>Pas encore pointé.</div>}
          {role==="asmat"&&<div>
            {/* POINTAGE WORKFLOW P14E - boutons d'action selon l'etat */}
            {!ptJ?<div>
              <div style={{fontSize:11,color:"var(--l)",marginBottom:8,textAlign:"center"}}>L'enfant arrive ?</div>
              <button className="btn bT l"style={{width:"100%",padding:"16px",justifyContent:"center"}}onClick={pointerArrivee}disabled={saving}>
                {saving?"⏳ ...":"📍 Pointer l'arrivée maintenant"}
              </button>
            </div>:!ptJ.dep?<div>
              <div style={{fontSize:11,color:"var(--S)",marginBottom:8,textAlign:"center",fontWeight:600}}>
                {ptJ.enAttente
                  ?<><IconeOuEmoji e="📵"/> Arrivée notée à {ptJ.arr} — pas encore enregistrée</>
                  :<><IconeOuEmoji e="✅"/> Arrivée pointée à {ptJ.arr} — Accueil en cours</>}
              </div>
              <button className="btn bT l"style={{width:"100%",padding:"16px",justifyContent:"center"}}onClick={pointerDepart}disabled={saving}>
                {saving?"⏳ ...":"🏁 Pointer le départ maintenant"}
              </button>
            </div>:<div style={{padding:"12px",background:"var(--Sp)",borderRadius:10,textAlign:"center",fontSize:13,color:"var(--S)",fontWeight:600}}>
              <IconeOuEmoji e="✅"/> Journée terminée — {ptJ.tot} d'accueil
              {!ptJ.valide_parent&&<div style={{fontSize:11,color:"var(--l)",marginTop:4,fontWeight:400}}>En attente de validation du parent</div>}
            </div>}

            {/* POINTAGE WORKFLOW P14E - rectifier une heure manuellement (si oubli) */}
            <details style={{marginTop:12,background:"var(--c)",borderRadius:10,overflow:"hidden"}}>
              <summary style={{padding:"10px 14px",cursor:"pointer",fontSize:12,fontWeight:600,color:"var(--m)",listStyle:"none",display:"flex",alignItems:"center",gap:8}}>
                <IconeOuEmoji e="✏️"/> Rectifier les heures (oubli, erreur)
              </summary>
              <div style={{padding:"12px 14px"}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                  <div><label className="lbl">Arrivée</label>
                    <input type="time"className="inp"value={arrEdit||ptJ?.arr_raw||""}onChange={e=>setArrEdit(e.target.value)}/>
                  </div>
                  <div><label className="lbl">Départ</label>
                    <input type="time"className="inp"value={depEdit||ptJ?.dep_raw||""}onChange={e=>setDepEdit(e.target.value)}/>
                  </div>
                </div>
                <button className="btn bG s"style={{width:"100%"}}onClick={sauverEdition}disabled={saving||!arrEdit}>
                  {saving?"⏳ ...":"Enregistrer la correction"}
                </button>
                <div style={{fontSize:11,color:"var(--l)",marginTop:6}}>
                  <IconeOuEmoji e="💡"/> Utile si tu as oublié de pointer en direct.
                </div>
              </div>
            </details>

            {/* QR Code pour le parent (si present physiquement) */}
            <details style={{marginTop:10,background:"var(--c)",borderRadius:10,overflow:"hidden"}}>
              <summary style={{padding:"10px 14px",cursor:"pointer",fontSize:12,fontWeight:600,color:"var(--B)",listStyle:"none",display:"flex",alignItems:"center",gap:8}}>
                <IconeOuEmoji e="📱"/> QR Code parent — {enfant?.prenom}
              </summary>
              <div style={{padding:"12px 14px",textAlign:"center"}}>
                <div style={{fontSize:11,color:"var(--l)",marginBottom:10,lineHeight:1.6}}>
                  Le parent flashe ce QR avec l'appareil photo de son téléphone : ça enregistre l'<strong>arrivée</strong>, puis le <strong>départ</strong> au second scan.<br/>
                  Vous pouvez aussi le scanner vous-même.
                </div>
                <QRPointage
                  valeur={(window.location.origin||"https://www.timat.app")+"/?pointage=qr&enfant="+enfant?.id}
                  taille={180}
                  style={{borderRadius:12,border:"3px solid var(--br)",margin:"0 auto"}}
                />
                <div style={{display:"flex",gap:6,marginTop:10,justifyContent:"center"}}>
                  <button className="btn bG s"onClick={()=>{
                    navigator.clipboard?.writeText(
                      (window.location.origin||"https://www.timat.app")+"/?pointage=qr&enfant="+enfant?.id
                    );
                    setToast("Lien copié ✓");
                  }}><IconeOuEmoji e="📋"/> Copier le lien</button>
                  <button className="btn bG s"onClick={()=>window.print()}><IconeOuEmoji e="🖨️"/> Imprimer</button>
                </div>
                <div style={{fontSize:11,color:"var(--l)",marginTop:8}}>
                  <IconeOuEmoji e="🔒"/> QR propre à {enfant?.prenom}. Imprimable une fois : il enregistre toujours le pointage du jour.
                </div>
              </div>
            </details>
          </div>}
        </div>
      </div>
      <div className="card">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div style={{fontWeight:700,color:"var(--b)"}}><IconeOuEmoji e="📅"/> Historique récent</div>
          {role==="parent"&&<div style={{fontSize:11,color:"var(--l)"}}><IconeOuEmoji e="✅"/> Valider · ✏️ Modifier</div>}
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {ptH.slice(0,10).map(p=>{
            // POINTAGE WORKFLOW P14E - calcul anciennete pour indicateur visuel
            const ageJours=Math.floor((new Date()-new Date(p.date))/(1000*60*60*24));
            const enRetard=role==="parent"&&!p.valide_parent&&ageJours>=3;
            return <div key={p.id}style={{
              display:"flex",flexDirection:"column",gap:6,
              padding:"10px 12px",borderRadius:9,
              background:p.valide_parent?"var(--Sp)":(enRetard?"#FFE8E8":(role==="parent"?"var(--Gp)":"var(--c)")),
              border:enRetard?"1.5px solid var(--R)":(role==="parent"&&!p.valide_parent?"1px solid var(--G)":"1px solid transparent")
            }}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                <div style={{fontSize:12,fontWeight:600,color:"var(--b)"}}>
                  {new Date(p.date).toLocaleDateString("fr-FR",{weekday:"short",day:"numeric",month:"short"})}
                  {enRetard&&<span style={{marginLeft:8,fontSize:11,color:"var(--R)",fontWeight:700}}><IconeOuEmoji e="⚠️"/> Depuis {ageJours} jours</span>}
                </div>
                <div style={{display:"flex",gap:10,fontSize:12}}>
                  <span style={{color:"var(--S)"}}>{p.arr?"↗"+p.arr:""}</span>
                  <span style={{color:"var(--T)"}}>{p.dep?"↘"+p.dep:""}</span>
                  <span style={{fontWeight:700,color:"var(--b)"}}>{p.tot||"-"}</span>
                </div>
                {role!=="parent"&&<span style={{fontSize:13,color:p.valide_parent?"var(--G)":"var(--l)"}}>
                  <IconeOuEmoji e={p.valide_parent?"✅":"⏳"}/>
                </span>}
              </div>
              {p.mode_pointage==="borne"&&<div style={{fontSize:11,color:"var(--m)"}}>
                <IconeOuEmoji e="🚪"/> Saisi à la borne d'entrée, avec le code de la famille
              </div>}
              {contsDe(p.id).map(c=><div key={c.id} style={{
                fontSize:11.5,lineHeight:1.5,borderRadius:7,padding:"7px 9px",
                background:c.etat==="ouverte"?"#FBF1DC":c.etat==="acceptee"?"var(--Sp)":"var(--c)",
                border:"1px solid "+(c.etat==="ouverte"?"#E5D3A8":"var(--br)"),
                color:c.etat==="ouverte"?"#8A6420":"var(--m)"}}>
                <b style={{fontWeight:700}}>
                  {c.etat==="ouverte"?"Signalement en attente":c.etat==="acceptee"?"Signalement accepté":"Signalement refusé"}
                </b>
                {" — "}{c.champ==="arrivee"?"arrivée":"départ"}
                {c.heure_enregistree?" enregistré à "+c.heure_enregistree:""}
                {c.heure_proposee?", "+ (c.etat==="acceptee"?"corrigé":"proposé") +" à "+c.heure_proposee:""}.
                {c.motif?<div style={{marginTop:3}}>« {c.motif} »</div>:null}
                {c.reponse_asmat?<div style={{marginTop:3,fontStyle:"italic"}}>Réponse : {c.reponse_asmat}</div>:null}
                {role!=="parent"&&c.etat==="ouverte"&&<button type="button" onClick={()=>{setRepondre(c);setContReponse("");}}
                  className="btn bT s" style={{marginTop:7}}>Répondre</button>}
              </div>)}
              {/* Le pointage de la borne arrive deja valide : sans ce bouton, le
                  parent n'a aucun moyen de dire qu'une heure est fausse. */}
              {role==="parent"&&p.valide_parent&&!contsDe(p.id).some(c=>c.etat==="ouverte")&&<div style={{display:"flex",gap:6}}>
                {p.arr&&<button type="button" onClick={()=>{setContester({pointage:p,champ:"arrivee",heure:p.arr_raw||p.arr});setContHeure(versHHMM(p.arr_raw||p.arr));setContMotif("");}}
                  className="btn bG s" style={{flex:1,justifyContent:"center"}}>Signaler l'arrivée</button>}
                {p.dep&&<button type="button" onClick={()=>{setContester({pointage:p,champ:"depart",heure:p.dep_raw||p.dep});setContHeure(versHHMM(p.dep_raw||p.dep));setContMotif("");}}
                  className="btn bG s" style={{flex:1,justifyContent:"center"}}>Signaler le départ</button>}
              </div>}
              {role==="parent"&&!p.valide_parent&&<div style={{display:"flex",gap:6}}>
                <button onClick={()=>validerPointage(p.id)}
                  style={{flex:1,background:"var(--G)",color:"#fff",border:"none",borderRadius:6,padding:"6px 10px",cursor:"pointer",fontSize:11,fontWeight:700}}>
                  <IconeOuEmoji e="✅"/> Je valide
                </button>
                <button onClick={()=>setModifParent({id:p.id,date:p.date,arr:p.arr_raw||p.arr||"",dep:p.dep_raw||p.dep||""})}
                  style={{flex:1,background:"transparent",color:"var(--T)",border:"1px solid var(--T)",borderRadius:6,padding:"6px 10px",cursor:"pointer",fontSize:11,fontWeight:700}}>
                  <IconeOuEmoji e="✏️"/> Modifier
                </button>
              </div>}
              {p.valide_parent&&p.date_validation&&<div style={{fontSize:11,color:"var(--S)",fontStyle:"italic"}}>
                <IconeOuEmoji e="✅"/> Validé le {new Date(p.date_validation).toLocaleDateString("fr-FR")}
                {p.modified_by_parent&&<span style={{marginLeft:6,color:"var(--T)"}}>· ✏️ heures corrigées</span>}
              </div>}
            </div>;
          })}
          {ptH.length===0&&<EmptyState emoji="⏰" titre="Aucun pointage pour le moment" texte={role==="asmat"?"Enregistrez l'arrivée d'un enfant (en 1 tap depuis l'accueil, ou via le QR code) : les journées pointées apparaîtront ici.":"Les arrivées et départs pointés s'afficheront ici, jour après jour."}/>}
        </div>
        {role==="parent"&&ptH.some(p=>!p.valide_parent)&&<div style={{
          marginTop:10,padding:"8px 12px",background:"var(--Gp)",borderRadius:8,
          fontSize:12,color:"var(--G)",fontWeight:600
        }}>
          <IconeOuEmoji e="⚠️"/> {ptH.filter(p=>!p.valide_parent).length} pointage(s) en attente de validation
        </div>}
      </div>
    </div>
  </div>;
}

//

export function Calendrier({enfants,role,pEId,user}){
  const [mois,setMois]=useState(new Date().getMonth());
  const [an,setAn]=useState(new Date().getFullYear());
  const [sel,setSel]=useState(null);
  const [vue,setVue]=useState("semaine");
  const [semOffset,setSemOffset]=useState(0);
  const [showEvModal,setShowEvModal]=useState(false);
  const [showThemes,setShowThemes]=useState(false);
  const [evForm,setEvForm]=useState({date:"",type:"rdv",txt:""});
  const [isMobile,setIsMobile]=useState(typeof window!=="undefined"&&window.innerWidth<640);
  const [jourLarge,setJourLarge]=useState(null);
  useEffect(()=>{const f=()=>setIsMobile(window.innerWidth<640);window.addEventListener("resize",f);return()=>window.removeEventListener("resize",f);},[]);
  const isDemoUser=enfants.length>0&&enfants.every(e=>["e1","e2","e3"].includes(e.id));
  const [evs,setEvs]=useState([]);
  // Initialiser les événements après le chargement des enfants
  useEffect(()=>{
    if(enfants.length===0)return;
    if(isDemoUser){setEvs(D.evenements);return;}
    let vivant=true;
    (async()=>{
      const{data,error}=await supabase.from("evenements").select("*").order("date",{ascending:true});
      if(!vivant||error||!data)return;
      setEvs(data.map(e=>({id:e.id,date:e.date,type:e.type,txt:e.texte,auteurId:e.auteur_id,eId:e.enfant_id,...(e.heures!=null?{heures:Number(e.heures)}:{})})));
    })();
    return()=>{vivant=false;};
  },[isDemoUser,enfants.length]);
  const [newEv,setNewEv]=useState({type:"rdv",txt:""});
  const [showAbsenceModal,setShowAbsenceModal]=useState(false);
  const [absForm,setAbsForm]=useState({eId:pEId||enfants[0]?.id,date:"",motif:"Maladie",heures:"",indemnise:true});
  useEffect(()=>{
    const h=(e)=>{ if(e.detail==="ajouter_absence"){ const d=new Date(); const iso=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); setAbsForm(f=>({...f,date:iso})); setShowAbsenceModal(true); } };
    window.addEventListener("timat:action",h); return()=>window.removeEventListener("timat:action",h);
  },[]);
  const [toast,setToast]=useState("");
  const noms=["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
  const joursSemaine=["Lu","Ma","Me","Je","Ve","Sa","Di"];
  const jourMap={Lundi:0,Mardi:1,Mercredi:2,Jeudi:3,Vendredi:4,Samedi:5,Dimanche:6};
  const premier=new Date(an,mois,1).getDay();
  const offset=(premier+6)%7;
  const total=new Date(an,mois+1,0).getDate();
  const todayDate=new Date();
  const isActualToday=(d)=>d===todayDate.getDate()&&mois===todayDate.getMonth()&&an===todayDate.getFullYear();

  const ds=(d)=>an+"-"+String(mois+1).padStart(2,"0")+"-"+String(d).padStart(2,"0");
  const moisStr=an+"-"+String(mois+1).padStart(2,"0");

  // Jour de la semaine (0=Lundi...6=Dim) pour un jour du mois
  const jourIdx=(d)=>(new Date(an,mois,d).getDay()+6)%7;

  // Filtrage selon le rôle
  const evsFiltres=role==="parent"
    ? evs.filter(e=>{
        // Toute journée sans accueil concerne le parent au premier chef :
        // congé, fermeture, maladie ou formation de l'assistante maternelle,
        // ce sont les jours où il devra trouver une solution.
        if(typeEv(e.type).sansAccueil)return true;
        // Une sortie est une information utile, pas une contrainte.
        if(e.type==="sor")return true;
        // Ses propres notes, et les absences de son enfant.
        if(e.auteurId&&user?.id&&e.auteurId===user.id)return true;
        if(e.eId&&pEId&&e.eId===pEId)return true;
        if(e.type==="abs"&&enfants.some(en=>e.txt&&e.txt.includes(en.prenom)))return true;
        return false;
      })
    : evs;

  const getUserEv=(d)=>evsFiltres.find(e=>e.date===ds(d));
  const getFerie=(d)=>FERIES_2024[ds(d)];
  const getBirthday=(d)=>enfants.find(e=>e.naissance&&e.naissance.slice(5)===ds(d).slice(5));
  const getVac=(d)=>isVacances(ds(d));
  // Quels enfants sont accueillis ce jour ?
  const getAccueil=(d)=>enfants.filter(e=>{
    const ji=jourIdx(d);
    const jours=e.contrat?.jours||[];
    return jours.some(j=>jourMap[j]===ji);
  });

  const addEv=()=>{
    if(!sel||!newEv.txt.trim())return;
    setEvs(p=>[...p,{id:"ev"+Date.now(),date:ds(sel),...newEv}]);
    setNewEv({type:"rdv",txt:""});
  };

  const declarerAbsence=()=>{
    if(!absForm.heures||!absForm.date)return;
    const enfant=enfants.find(e=>e.id===absForm.eId)||enfants[0];
    setEvs(p=>[...p,{id:"abs"+Date.now(),date:absForm.date,type:"abs",eId:absForm.eId,txt:"Absent - "+(enfant?.prenom||"")+" ("+absForm.motif+")"}]);
    D.absences.push({id:"abn"+Date.now(),eId:absForm.eId,date:absForm.date,motif:absForm.motif,indemnise:absForm.indemnise,heures:parseFloat(absForm.heures)||8});
    setShowAbsenceModal(false);
    setToast("Absence déclarée - "+(enfant?.prenomAsmat||"l'assmat")+" a été notifiée ✓");
  };

  // Événements du mois filtrés pour le panneau latéral
  const moisEvs=[
    ...evsFiltres.filter(e=>e.date.startsWith(moisStr)).map(e=>({...e,src:"user"})),
    ...Object.entries(FERIES_2024).filter(([d])=>d.startsWith(moisStr)).map(([d,n])=>({id:d,date:d,txt:n,type:"ferie",src:"ferie"})),
    ...enfants.filter(e=>e.naissance&&(an+"-"+e.naissance.slice(5)).startsWith(moisStr))
      .map(e=>({id:"bd"+e.id,date:an+"-"+e.naissance.slice(5),txt:"🎂 Anniversaire de "+e.prenom,type:"anniv",src:"birthday"}))
  ].sort((a,b)=>a.date>b.date?1:-1).filter((ev,i,arr)=>arr.findIndex(x=>x.date===ev.date&&x.txt===ev.txt&&x.type===ev.type)===i);

  // Légende couleurs des enfants (asmat uniquement)
  const couleursEnfants=enfants.map(e=>({emoji:e.emoji,prenom:e.prenom,couleur:e.couleur}));

  // Couleur distincte par enfant (les couleurs en base sont souvent identiques)
  const PALETTE_ENF=["#E49178","#5DA9A1","#C77DAE","#E0A458","#7C9CBF","#90A093","#B06C6C","#6FA8DC"];
  const colorEnf=(id)=>{const i=enfants.findIndex(e=>e.id===id);return PALETTE_ENF[(i<0?0:i)%PALETTE_ENF.length];};
  // ===== Vue semaine =====
  const lundiSemaine=(()=>{const t=new Date();t.setDate(t.getDate()+semOffset*7);const dow=(t.getDay()+6)%7;t.setDate(t.getDate()-dow);t.setHours(0,0,0,0);return t;})();
  const joursDeLaSemaine=Array.from({length:7},(_,i)=>{const d=new Date(lundiSemaine);d.setDate(d.getDate()+i);return d;});
  const dsDate=(jd)=>jd.getFullYear()+"-"+String(jd.getMonth()+1).padStart(2,"0")+"-"+String(jd.getDate()).padStart(2,"0");
  const jourIdxDate=(jd)=>(jd.getDay()+6)%7;
  const accueilDuJour=(jd)=>enfants.filter(e=>(e.contrat?.jours||[]).some(j=>jourMap[j]===jourIdxDate(jd)));
  const evDuJour=(jd)=>evsFiltres.filter(e=>e.date===dsDate(jd)).filter((ev,i,arr)=>arr.findIndex(x=>x.txt===ev.txt&&x.type===ev.type)===i);
  const NOMS_JOURS=["Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi","Dimanche"];
  const labelSemaine=lundiSemaine.getDate()+" "+noms[lundiSemaine.getMonth()].slice(0,4)+". → "+joursDeLaSemaine[6].getDate()+" "+noms[joursDeLaSemaine[6].getMonth()].slice(0,4)+". "+joursDeLaSemaine[6].getFullYear();
  const estAujourdhui=(jd)=>{const t=new Date();return jd.getDate()===t.getDate()&&jd.getMonth()===t.getMonth()&&jd.getFullYear()===t.getFullYear();};
  const parseHoraire=(str)=>{
    if(!str)return null;
    const m=String(str).replace(/[H:]/g,"h").match(/(\d{1,2})h?(\d{2})?\s*[–\-àa]+\s*(\d{1,2})h?(\d{2})?/);
    if(!m)return null;
    const s=parseInt(m[1])+(m[2]?parseInt(m[2])/60:0);
    const e=parseInt(m[3])+(m[4]?parseInt(m[4])/60:0);
    if(isNaN(s)||isNaN(e)||e<=s)return null;
    return [s,e];
  };
  const horaireLignes=(str)=>{if(!str)return["",""];const parts=String(str).split(/\s*(?:–|—|-|à)\s*/);if(parts.length>=2)return[parts[0].trim(),parts.slice(1).join("-").trim()];return[String(str).trim(),""];};
  // Ce qu'une journee d'accueil represente d'apres le contrat : c'est la base
  // de la retenue, et la valeur proposee par defaut.
  const contratRef=enfants[0]?.contrat;
  const heuresJourContrat=Math.round(((contratRef?.heuresHebdo||40)/((contratRef?.jours?.length)||5))*10)/10;

  const addEvModal=()=>{
    if(!evForm.date||!evForm.txt.trim())return;
    const heures=HEURES_TYPES[evForm.type]?(parseFloat(evForm.heures)||heuresJourContrat):null;
    const nouveau={id:"ev"+Date.now(),date:evForm.date,type:evForm.type,txt:evForm.txt.trim(),...(heures!=null?{heures}:{})};
    setEvs(p=>[...p,nouveau]);
    // L'assistante maternelle ecrit dans son propre calendrier ; le parent
    // ecrit dans celui de l'assistante maternelle de son enfant, en son nom.
    const asmatDuCalendrier=role==="asmat"?user?.id:(enfants.find(e=>e.id===(pEId||enfants[0]?.id))?.asmat_id||enfants[0]?.asmat_id);
    if(!isDemoUser&&user?.id&&asmatDuCalendrier)supabase.from("evenements")
      .insert({asmat_id:asmatDuCalendrier,auteur_id:user.id,
        enfant_id:role==="parent"?(pEId||enfants[0]?.id||null):null,
        date:evForm.date,type:evForm.type,texte:evForm.txt.trim(),heures})
      .select().single()
      .then(({data})=>{ if(data)setEvs(p=>p.map(x=>x.id===nouveau.id?{...x,id:data.id}:x)); })
      .catch(()=>{});
    setShowEvModal(false);setEvForm({date:"",type:"rdv",txt:""});
    setToast("Événement ajouté ✓");
  };

  return <div className="fi">
    {toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
    <PageHeader icon="📅"
      title={role==="parent"?"Mon calendrier":"Calendrier"}
      sub={role==="parent"?"Jours d'accueil, congés et jours fériés":"Accueil, congés, anniversaires, vacances scolaires Zone C"}
    />

    {/* Modale absence parent */}
    {showAbsenceModal&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:20}}
      onClick={e=>e.target===e.currentTarget&&setShowAbsenceModal(false)}>
      <div className="card"style={{width:"100%",maxWidth:420,padding:"var(--pad-carte-l)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div className="pf"style={{fontSize:18,fontWeight:600,color:"var(--b)"}}><IconeOuEmoji e="🤒"/> Déclarer une absence</div>
          <button onClick={()=>setShowAbsenceModal(false)}style={{background:"none",border:"none",fontSize:18,cursor:"pointer",color:"var(--l)"}}>✕</button>
        </div>
        <div style={{background:"var(--Bp)",borderRadius:10,padding:"10px 14px",marginBottom:16,fontSize:13,color:"var(--B)",lineHeight:1.5}}>
          <IconeOuEmoji e="🔔"/> Votre assmat sera notifiée immédiatement. L'absence sera notée dans votre calendrier et dans le décompte des heures.
        </div>
        <div style={{display:"grid",gap:12}}>
          {enfants.length>1&&<div>
            <label className="lbl">Enfant concerné</label>
            <select className="sel"value={absForm.eId}onChange={e=>setAbsForm(f=>({...f,eId:e.target.value}))}>
              {enfants.map(e=><option key={e.id}value={e.id}>{e.emoji} {e.prenom}</option>)}
            </select>
          </div>}
          <div>
            <label className="lbl">Date d'absence *</label>
            <input type="date"className="inp"value={absForm.date}onChange={e=>setAbsForm(f=>({...f,date:e.target.value}))}/>
          </div>
          <div>
            <label className="lbl">Motif</label>
            <select className="sel"value={absForm.motif}onChange={e=>setAbsForm(f=>({...f,motif:e.target.value}))}>
              {["Maladie","Congés parents","Décision parent","Rendez-vous médical","Autre"].map(m=><option key={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="lbl">Heures prévues ce jour *</label>
            <input type="number"className="inp"placeholder="ex: 9"value={absForm.heures}
              onChange={e=>setAbsForm(f=>({...f,heures:e.target.value}))} min="0"max="12"step="0.5"/>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <input type="checkbox"id="indem2"checked={absForm.indemnise}
              onChange={e=>setAbsForm(f=>({...f,indemnise:e.target.checked}))}style={{width:16,height:16,cursor:"pointer",accentColor:"var(--accent)"}}/>
            <label htmlFor="indem2"style={{fontSize:13,color:"var(--b)",cursor:"pointer"}}>Absence indemnisée (selon contrat)</label>
          </div>
        </div>
        <div style={{display:"flex",gap:8,marginTop:20}}>
          <button className="btn bG"style={{flex:1}}onClick={()=>setShowAbsenceModal(false)}>Annuler</button>
          <button className="btn bT"style={{flex:2}}onClick={declarerAbsence}disabled={!absForm.date||!absForm.heures}>
            <IconeOuEmoji e="📢"/> Notifier l'assmat
          </button>
        </div>
      </div>
    </div>}

    {/* Le choix du theme vient avant le formulaire : « ajouter » ne veut pas
        dire la meme chose selon ce qu'on ajoute, et selon le role. Cote parent,
        un theme qui porte un motif ouvre le formulaire d'absence — lui seul
        compte les heures et previent l'assistante maternelle. */}
    {showThemes&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:20}} onClick={e=>e.target===e.currentTarget&&setShowThemes(false)}>
      <div className="card" style={{width:"100%",maxWidth:400,padding:"var(--pad-carte-l)",maxHeight:"85vh",overflowY:"auto"}}>
        <div style={{fontWeight:700,fontSize:17,color:"var(--b)",marginBottom:4}}><IconeOuEmoji e="➕"/> Qu'ajoutez-vous ?</div>
        <div style={{fontSize:12,color:"var(--l)",marginBottom:16}}>{role==="parent"?"Une absence est transmise à votre assistante maternelle et comptée dans les heures.":"Ce que vous ajoutez apparaît aussi dans le calendrier des parents."}</div>
        <div style={{display:"grid",gap:8}}>
          {(THEMES_CAL[role]||THEMES_CAL.asmat).map((th,i)=>{
            const T=typeEv(th.t);
            return <button key={i} onClick={()=>{
              setShowThemes(false);
              if(th.motif){
                setAbsForm(f=>({...f,date:dsDate(new Date()),motif:th.motif}));
                setShowAbsenceModal(true);
              }else{
                setEvForm({date:dsDate(new Date()),type:th.t,txt:"",heures:String(heuresJourContrat)});
                setShowEvModal(true);
              }
            }} style={{display:"flex",alignItems:"center",gap:12,textAlign:"left",width:"100%",padding:"12px 14px",borderRadius:12,border:"1px solid var(--br)",background:"var(--w)",cursor:"pointer",fontFamily:"inherit",transition:"background .15s,border-color .15s"}}
              onMouseEnter={e=>{e.currentTarget.style.background=T.fond;e.currentTarget.style.borderColor=T.texte;}}
              onMouseLeave={e=>{e.currentTarget.style.background="var(--w)";e.currentTarget.style.borderColor="var(--br)";}}>
              <span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:36,height:36,borderRadius:10,background:T.fond,color:T.texte,flexShrink:0}}><IconeOuEmoji e={th.ic||T.ic} taille={19}/></span>
              <span style={{flex:1}}>
                <span style={{display:"block",fontSize:13.5,fontWeight:700,color:"var(--b)"}}>{th.l||T.l}</span>
                <span style={{display:"block",fontSize:11.5,color:"var(--l)",marginTop:1}}>{th.aide}</span>
              </span>
            </button>;
          })}
        </div>
        <button className="btn bG" style={{width:"100%",marginTop:14}} onClick={()=>setShowThemes(false)}>Annuler</button>
      </div>
    </div>}

    {showEvModal&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:20}} onClick={e=>e.target===e.currentTarget&&setShowEvModal(false)}>
      <div className="card" style={{width:"100%",maxWidth:400,padding:"var(--pad-carte-l)"}}>
        <div style={{fontWeight:700,fontSize:17,color:"var(--b)",marginBottom:4,display:"flex",alignItems:"center",gap:8}}>
          <span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:30,height:30,borderRadius:9,background:typeEv(evForm.type).fond,color:typeEv(evForm.type).texte}}><IconeOuEmoji e={typeEv(evForm.type).ic} taille={17}/></span>
          {typeEv(evForm.type).l}
        </div>
        <button onClick={()=>{setShowEvModal(false);setShowThemes(true);}} style={{background:"none",border:"none",padding:0,marginBottom:14,fontSize:12,color:"var(--accent)",fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>‹ Changer de thème</button>
        <div style={{display:"grid",gap:12}}>
          <div><label className="lbl">Date</label><input type="date" className="inp" value={evForm.date} onChange={e=>setEvForm(f=>({...f,date:e.target.value}))}/></div>
          <div><label className="lbl">Description</label><input className="inp" placeholder="Ex : RDV médecin, sortie au parc…" value={evForm.txt} onChange={e=>setEvForm(f=>({...f,txt:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&addEvModal()}/></div>
          {HEURES_TYPES[evForm.type]&&<div>
            <label className="lbl">{evForm.type==="formh"?"Heures de formation ce jour":"Heures d'accueil perdues ce jour"}</label>
            <input type="number" className="inp" min="0" max="24" step="0.5" value={evForm.heures??heuresJourContrat}
              onChange={e=>setEvForm(f=>({...f,heures:e.target.value}))}/>
            <div style={{fontSize:11,color:"var(--l)",marginTop:5,lineHeight:1.5}}>
              {RETENUE_TYPES[evForm.type]
                ? "Servira à calculer la retenue sur le salaire mensualisé, selon l'article 111 de la convention collective."
                : "Servira à estimer votre allocation de formation."}
            </div>
          </div>}
          {evForm.type==="form"&&<div style={{background:"var(--Pp)",color:"var(--P)",borderRadius:10,padding:"10px 12px",fontSize:12,lineHeight:1.55}}>
            Suivie sur le temps d'accueil, une formation ne se déduit pas : votre rémunération est maintenue et l'employeur facilitateur est remboursé.
          </div>}
          {evForm.type==="formh"&&<div style={{background:"var(--Pp)",color:"var(--P)",borderRadius:10,padding:"10px 12px",fontSize:12,lineHeight:1.55}}>
            Hors temps d'accueil, il n'y a pas de salaire mais une allocation de formation de {nbf(ALLOC_FORMATION_H,2)} € nets par heure, versée par IPERIA à l'issue du parcours — pas par le parent employeur.
          </div>}
        </div>
        <div style={{display:"flex",gap:8,marginTop:18}}>
          <button className="btn bG" style={{flex:1}} onClick={()=>setShowEvModal(false)}>Annuler</button>
          <button className="btn bT" style={{flex:2}} onClick={addEvModal} disabled={!evForm.date||!evForm.txt.trim()}>Ajouter</button>
        </div>
      </div>
    </div>}

    {/* Bascule Semaine / Mois + ajout d'événement */}
    <div style={{display:"flex",gap:6,marginBottom:14,alignItems:"center",flexWrap:"wrap"}}>
      {[["semaine","Semaine"],["mois","Mois entier"]].map(([k,l])=><button key={k} onClick={()=>setVue(k)} style={{padding:"8px 18px",borderRadius:10,border:"1.5px solid",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit",background:vue===k?"var(--accent)":"#fff",color:vue===k?"#fff":"var(--accent)",borderColor:vue===k?"var(--accent)":"var(--accent-pale)"}}>{l}</button>)}
      <button className="btn bT" style={{marginLeft:"auto",padding:"8px 14px"}} onClick={()=>setShowThemes(true)}><IconeOuEmoji e="➕"/> Ajouter</button>
    </div>

    {/* ===== VUE SEMAINE — agenda pleine largeur (type Google Agenda) ===== */}
    {vue==="semaine"&&(()=>{
      const HSTART=7,HEND=20,PXH=isMobile?34:38,H=(HEND-HSTART)*PXH;
      const heures=Array.from({length:HEND-HSTART+1},(_,i)=>HSTART+i);

      // ----- PLAN LARGE : un seul jour, en grand et lisible -----
      if(jourLarge){
        const jd=jourLarge,idx=jourIdxDate(jd);
        const acc=accueilDuJour(jd),n=acc.length||1;
        const ev2=evDuJour(jd),ferie=FERIES_2024[dsDate(jd)];
        const decaler=(d)=>{const x=new Date(jd);x.setDate(x.getDate()+d);setJourLarge(x);};
        return <div className="card">
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,gap:8}}>
            <button className="btn bG" style={{padding:"6px 12px"}} onClick={()=>setJourLarge(null)}>← Semaine</button>
            <div style={{textAlign:"center"}}>
              <div className="pf" style={{fontWeight:800,fontSize:17,color:"var(--b)"}}>{NOMS_JOURS[idx]} {jd.getDate()}</div>
              <div style={{fontSize:12,color:"var(--l)"}}>{noms[jd.getMonth()]} {jd.getFullYear()}</div>
            </div>
            <div style={{display:"flex",gap:4}}>
              <button className="btn bG l" style={{padding:"6px 10px"}} onClick={()=>decaler(-1)}>‹</button>
              <button className="btn bG l" style={{padding:"6px 10px"}} onClick={()=>decaler(1)}>›</button>
            </div>
          </div>
          {ferie&&<div style={{fontSize:12,background:"var(--Rp)",color:"var(--R)",borderRadius:8,padding:"6px 10px",marginBottom:8,fontWeight:700}}><IconeOuEmoji e="🎉"/> {ferie}</div>}
          {ev2.map(ev=><div key={ev.id} style={{fontSize:12.5,background:typeEv(ev.type).fond,color:typeEv(ev.type).texte,borderRadius:8,padding:"6px 10px",marginBottom:6,fontWeight:600}}><IconeOuEmoji e={typeEv(ev.type).ic} taille={14}/> {ev.txt}</div>)}
          <div style={{display:"grid",gridTemplateColumns:"48px 1fr",marginTop:8}}>
            <div style={{position:"relative",height:H}}>
              {heures.map((h,i)=><div key={h} style={{position:"absolute",top:i*PXH-6,right:6,fontSize:11,color:"var(--l)"}}>{h}h</div>)}
            </div>
            <div style={{position:"relative",height:H,borderLeft:"1px solid var(--br)"}}>
              {heures.map((h,i)=><div key={h} style={{position:"absolute",top:i*PXH,left:0,right:0,borderTop:"1px solid rgba(0,0,0,.06)"}}/>)}
              {acc.map((e,ci)=>{
                const hr=parseHoraire(e.contrat&&e.contrat.horaires);if(!hr)return null;
                const top=Math.max(0,(hr[0]-HSTART)*PXH);
                const height=Math.max(28,(Math.min(hr[1],HEND)-Math.max(hr[0],HSTART))*PXH-2);
                const col=colorEnf(e.id);
                return <div key={e.id} style={{position:"absolute",top,height,left:(ci*(100/n))+"%",width:(100/n)+"%",padding:"2px 3px",boxSizing:"border-box"}}>
                  <div style={{height:"100%",background:col+"22",borderLeft:"3px solid "+col,borderRadius:8,padding:"5px 8px",overflow:"hidden"}}>
                    <div style={{fontSize:13,fontWeight:700,color:"var(--b)"}}>{e.prenom}</div>
                    <div style={{fontSize:11,color:"var(--m)",fontFamily:"'DM Mono',monospace"}}>{e.contrat&&e.contrat.horaires}</div>
                  </div>
                </div>;
              })}
            </div>
          </div>
          <div style={{marginTop:14,paddingTop:12,borderTop:"1px solid var(--br)"}}>
            <div style={{fontSize:12,fontWeight:700,color:"var(--b)",marginBottom:8}}>Enfants accueillis</div>
            {acc.length===0&&<div style={{fontSize:12.5,color:"var(--l)"}}>Aucun accueil ce jour.</div>}
            {acc.map(e=>{const col=colorEnf(e.id);return <div key={e.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0"}}>
              <span style={{width:12,height:12,borderRadius:4,background:col,flexShrink:0}}/>
              <span style={{fontWeight:600,fontSize:13.5,color:"var(--b)"}}>{e.prenom}</span>
              <span style={{marginLeft:"auto",fontSize:12.5,color:"var(--m)",fontFamily:"'DM Mono',monospace"}}>{(e.contrat&&e.contrat.horaires)||"horaires non renseignés"}</span>
            </div>;})}
          </div>
        </div>;
      }

      // ----- VUE SEMAINE (vue d'ensemble) -----
      return <div className="card">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,gap:8}}>
          <button className="btn bG l" style={{padding:"6px 12px"}} onClick={()=>setSemOffset(o=>o-1)}>‹</button>
          <div style={{textAlign:"center"}}>
            <div className="pf" style={{fontWeight:700,fontSize:15,color:"var(--b)"}}>{labelSemaine}</div>
            {semOffset!==0&&<button onClick={()=>setSemOffset(0)} style={{background:"none",border:"none",color:"var(--accent)",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",padding:2}}>↺ Cette semaine</button>}
          </div>
          <button className="btn bG l" style={{padding:"6px 12px"}} onClick={()=>setSemOffset(o=>o+1)}>›</button>
        </div>
        <div style={{fontSize:11,color:"var(--l)",textAlign:"center",marginBottom:8,fontWeight:600}}><IconeOuEmoji e="👆" taille={13}/> Touchez un jour pour l'ouvrir en grand</div>
        <div style={{overflowX:"hidden"}}>
          <div style={{width:"100%",display:"grid",gridTemplateColumns:isMobile?"22px repeat(7,1fr)":"46px repeat(7,1fr)"}}>
            <div/>
            {joursDeLaSemaine.map((jd,i)=>{const auj=estAujourdhui(jd);return <div key={i} onClick={()=>setJourLarge(jd)} style={{textAlign:"center",padding:"4px 1px",borderBottom:"2px solid "+(auj?"var(--accent)":"var(--br)"),cursor:"pointer"}}>
              <div style={{fontSize:11,color:auj?"var(--T)":"var(--l)",fontWeight:700,textTransform:"uppercase"}}>{NOMS_JOURS[i].slice(0,3)}</div>
              <div style={{fontSize:15,fontWeight:800,color:auj?"#fff":"var(--b)",background:auj?"var(--T)":"transparent",width:26,height:26,lineHeight:"26px",borderRadius:"50%",margin:"2px auto 0"}}>{jd.getDate()}</div>
            </div>;})}
            <div/>
            {joursDeLaSemaine.map((jd,i)=>{const ev2=evDuJour(jd);const ferie=FERIES_2024[dsDate(jd)];const sansH=accueilDuJour(jd).filter(e=>!parseHoraire(e.contrat&&e.contrat.horaires));return <div key={i} style={{padding:"3px",borderRight:i<6?"1px solid var(--br)":"none",minHeight:14}}>
              {ferie&&<div style={{fontSize:11,background:"var(--Rp)",color:"var(--R)",borderRadius:5,padding:"1px 4px",marginBottom:2,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}><IconeOuEmoji e="🎉"/> {ferie}</div>}
              {ev2.map(ev=><div key={ev.id} style={{fontSize:11,background:typeEv(ev.type).fond,color:typeEv(ev.type).texte,borderRadius:5,padding:"1px 4px",marginBottom:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={ev.txt}>{ev.txt}</div>)}
              {sansH.map(e=>{const col=colorEnf(e.id);return <div key={e.id} style={{fontSize:11,background:col+"22",color:"var(--b)",borderLeft:"2px solid "+col,borderRadius:4,padding:"1px 4px",marginBottom:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={e.prenom+" — horaires non renseignés"}>{e.prenom}</div>;})}
            </div>;})}
            <div style={{position:"relative",height:H}}>
              {heures.map((h,idx)=><div key={h} style={{position:"absolute",top:idx*PXH-6,right:4,fontSize:11,color:"var(--l)"}}>{h}h</div>)}
            </div>
            {joursDeLaSemaine.map((jd,i)=>{
              const acc=accueilDuJour(jd);const n=acc.length||1;
              return <div key={i} onClick={()=>setJourLarge(jd)} style={{position:"relative",height:H,borderRight:"1px solid var(--br)",borderLeft:i===0?"1px solid var(--br)":"none",background:estAujourdhui(jd)?"rgba(228,145,120,.06)":i>=5?"rgba(0,0,0,.025)":"transparent",cursor:"pointer"}}>
                {heures.map((h,idx)=><div key={h} style={{position:"absolute",top:idx*PXH,left:0,right:0,borderTop:"1px solid rgba(0,0,0,.05)"}}/>)}
                {acc.map((e,ci)=>{
                  const hr=parseHoraire(e.contrat&&e.contrat.horaires);
                  if(!hr)return null;
                  const top=Math.max(0,(hr[0]-HSTART)*PXH);
                  const height=Math.max(20,(Math.min(hr[1],HEND)-Math.max(hr[0],HSTART))*PXH-2);
                  const col=colorEnf(e.id);
                  return <div key={e.id} style={{position:"absolute",top,height,left:(ci*(100/n))+"%",width:(100/n)+"%",padding:"1px 2px",boxSizing:"border-box"}}>
                    <div style={{height:"100%",background:col+"22",borderLeft:"2.5px solid "+col,borderRadius:5,padding:isMobile?"2px 0":"2px 3px",overflow:"hidden",display:isMobile?"flex":"block",alignItems:"center",justifyContent:"center"}} title={e.prenom+" "+((e.contrat&&e.contrat.horaires)||"")}>
                      {isMobile
                        ? <div style={{writingMode:"vertical-rl",fontSize:11,fontWeight:700,color:"var(--b)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxHeight:"100%",letterSpacing:".5px"}}>{e.prenom}</div>
                        : <>
                            <div style={{fontSize:11.5,fontWeight:700,color:"var(--b)",lineHeight:1.1,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}}>{e.prenom}</div>
                            {(()=>{const hl=horaireLignes(e.contrat&&e.contrat.horaires);return hl[0]?<div style={{fontSize:11,color:"var(--m)",fontFamily:"'DM Mono',monospace",lineHeight:1.2}}>{hl[0]}{hl[1]?" –":""}{hl[1]?<br/>:null}{hl[1]}</div>:null;})()}
                          </>}
                    </div>
                  </div>;
                })}
              </div>;
            })}
          </div>
        </div>
        <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"center",marginTop:12,paddingTop:10,borderTop:"1px solid var(--br)"}}>
          <span style={{fontSize:11.5,color:"var(--l)",fontWeight:700}}>Enfants :</span>
          {enfants.map(e=>{const col=colorEnf(e.id);return <div key={e.id} style={{display:"flex",alignItems:"center",gap:5}}>
            <span style={{width:11,height:11,borderRadius:3,background:col,flexShrink:0}}/>
            <span style={{fontSize:11.5,color:"var(--b)",fontWeight:700}}>{e.prenom}</span>
            {e.contrat&&e.contrat.horaires&&<span style={{fontSize:11.5,color:"var(--m)",fontFamily:"'DM Mono',monospace"}}>{e.contrat.horaires}</span>}
          </div>;})}
        </div>
        <div style={{fontSize:11,color:"var(--l)",marginTop:8,textAlign:"center"}}>« ➕ Ajouter » pour signaler une absence, un congé ou un rendez-vous</div>
      </div>;
    })()}

    {/* ===== VUE MOIS ===== */}
    {vue==="mois"&&<div>
      <div className="card">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <button className="btn bG l"style={{padding:"6px 12px"}}onClick={()=>{if(mois===0){setMois(11);setAn(a=>a-1)}else setMois(m=>m-1)}}>‹</button>
          <div className="pf"style={{fontWeight:600,fontSize:18,color:"var(--b)"}}>{noms[mois]} {an}</div>
          <button className="btn bG l"style={{padding:"6px 12px"}}onClick={()=>{if(mois===11){setMois(0);setAn(a=>a+1)}else setMois(m=>m+1)}}>›</button>
        </div>
        {/* En-têtes jours façon Apple */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)"}}>
          {(isMobile?["L","M","M","J","V","S","D"]:["lun.","mar.","mer.","jeu.","ven.","sam.","dim."]).map((j,i)=><div key={i} style={{textAlign:isMobile?"center":"left",padding:isMobile?"2px 0 8px":"2px 8px 8px",fontSize:11,fontWeight:600,color:i>=5?"var(--l)":"var(--m)"}}>{j}</div>)}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",border:isMobile?"none":"1px solid var(--br)",borderTop:"1px solid var(--br)",borderRadius:isMobile?0:12,overflow:"hidden"}}>
          {(()=>{
            const startOffset=(new Date(an,mois,1).getDay()+6)%7;
            const debutGrille=new Date(an,mois,1-startOffset);
            return Array.from({length:42},(_,k)=>{
              const jd=new Date(debutGrille);jd.setDate(jd.getDate()+k);
              const dMois=jd.getMonth()===mois;
              const dNum=jd.getDate();
              const ds2=jd.getFullYear()+"-"+String(jd.getMonth()+1).padStart(2,"0")+"-"+String(dNum).padStart(2,"0");
              const auj=estAujourdhui(jd);
              const colWE=(k%7)>=5;
              const ferie=FERIES_2024[ds2];
              const evs2=dMois?evsFiltres.filter(e=>e.date===ds2).filter((ev,i,arr)=>arr.findIndex(x=>x.txt===ev.txt&&x.type===ev.type)===i):[];
              const bday=dMois?enfants.find(e=>e.naissance&&e.naissance.slice(5)===ds2.slice(5)):null;
              const isSel=dMois&&sel===dNum;
              const items=[];
              if(ferie&&dMois)items.push({key:"f",bg:"#FCE7F0",fg:"#B83280",txt:ferie});
              if(bday)items.push({key:"b",bg:colorEnf(bday.id)+"26",fg:"var(--b)",txt:"🎂 "+bday.prenom});
              evs2.forEach(ev=>items.push({key:ev.id,bg:typeEv(ev.type).fond,fg:typeEv(ev.type).texte,txt:ev.txt}));
              const maxShow=3;
              return <div key={k} onClick={()=>{if(dMois)setSel(sel===dNum?null:dNum);}}
                style={{minHeight:isMobile?86:76,borderRight:!isMobile&&(k%7)<6?"1px solid var(--br)":"none",borderTop:k>=7?"1px solid var(--br)":"none",padding:isMobile?"5px 3px":"4px 5px",background:isSel?"var(--Tp)":(!dMois?(isMobile?"#fff":"rgba(0,0,0,.02)"):colWE&&!isMobile?"rgba(0,0,0,.03)":"#fff"),cursor:dMois?"pointer":"default",position:"relative",overflow:"hidden"}}>
                <div style={{display:"flex",justifyContent:isMobile?"center":"flex-start",marginBottom:3}}>
                  <span style={auj?{fontSize:isMobile?17:13,fontWeight:700,background:"var(--R)",color:"#fff",minWidth:isMobile?32:24,height:isMobile?32:24,lineHeight:(isMobile?32:24)+"px",borderRadius:"50%",textAlign:"center",display:"inline-block",padding:"0 5px",boxSizing:"border-box"}:{fontSize:isMobile?17:13,fontWeight:dMois?500:400,color:dMois?(colWE?"var(--l)":"var(--b)"):"var(--l)",padding:isMobile?"2px 0":"2px 3px"}}>{dNum}{(dNum===1)?(isMobile?"":" "+noms[jd.getMonth()].slice(0,4).toLowerCase()+"."):""}</span>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:2}}>
                  {items.slice(0,maxShow).map(it=><div key={it.key} style={{fontSize:isMobile?10.5:9.5,background:it.bg,color:it.fg,borderRadius:5,padding:isMobile?"2px 6px":"1px 5px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontWeight:600}} title={it.txt}>{it.txt}</div>)}
                  {items.length>maxShow&&<div style={{fontSize:11,color:"var(--l)",fontWeight:600,textAlign:isMobile?"center":"left"}}>+{items.length-maxShow}</div>}
                </div>
              </div>;
            });
          })()}
        </div>

        {/* Légende */}
        <div style={{display:"flex",gap:8,marginTop:14,flexWrap:"wrap"}}>
          {[
            ["var(--Rp)","var(--R)","Absence / Jour férié"],
            ["var(--Gp)","var(--G)","Mes congés"],
            ["var(--Tp)","var(--T)","Aujourd'hui / Anniversaire"],
            ["var(--Bp)","var(--B)","Vacances scolaires"],
          ].map(([bg,c,l])=>
            <div key={l}style={{display:"flex",alignItems:"center",gap:4}}>
              <div style={{width:9,height:9,borderRadius:2,background:bg,border:"1px solid "+c}}/>
              <span style={{fontSize:11,color:"var(--m)"}}>{l}</span>
            </div>)}
        </div>

        {/* Légende enfants (asmat) ou mon enfant (parent) */}
        <div style={{marginTop:10,display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          <span style={{fontSize:11,color:"var(--l)",fontWeight:700}}>Jours d'accueil :</span>
          {enfants.map(e=><div key={e.id}style={{display:"flex",alignItems:"center",gap:4}}>
            <div style={{width:8,height:8,borderRadius:"50%",background:colorEnf(e.id)}}/>
            <span style={{fontSize:11,color:"var(--m)"}}>{e.emoji} {e.prenom}</span>
          </div>)}
        </div>

      </div>

      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {/* Formulaire ajout événement - asmat uniquement */}
        {sel&&role==="asmat"&&<div className="card">
          <div style={{fontWeight:600,fontSize:13,marginBottom:10,color:"var(--b)"}}>
            <IconeOuEmoji e="➕"/> {sel} {noms[mois]} {an}
            {getFerie(sel)&&<span style={{fontSize:11,color:"var(--R)",marginLeft:8}}><IconeOuEmoji e="⭐"/> Jour férié</span>}
            {getBirthday(sel)&&<span style={{fontSize:11,color:"var(--T)",marginLeft:8}}><IconeOuEmoji e="🎂"/> Anniversaire</span>}
          </div>
          <div style={{marginBottom:8}}>
            <label className="lbl">Type</label>
            <select className="sel"value={newEv.type}onChange={e=>setNewEv(p=>({...p,type:e.target.value}))}>
              {/* Une <option> ne rend que du texte : ni emoji ni icône dessinée.
                  Et « hol » n'existait pas dans TYPES_EV — un événement créé ici
                  ressortait dans la couleur par défaut. */}
              <option value="rdv">Rendez-vous</option>
              <option value="abs">Absence enfant</option>
              <option value="cng">Congé assmat</option>
              <option value="sor">Sortie / activité</option>
            </select>
          </div>
          <input className="inp"style={{marginBottom:8}}placeholder="Description..."value={newEv.txt}onChange={e=>setNewEv(p=>({...p,txt:e.target.value}))}/>
          <button className="btn bT"style={{width:"100%"}}onClick={addEv}>Ajouter</button>
        </div>}

        {/* Détail jour sélectionné */}
        {sel&&<div className="card">
          <div style={{fontWeight:600,fontSize:13,marginBottom:10,color:"var(--b)"}}>
            <IconeOuEmoji e="📍"/> {sel} {noms[mois]} {an}
          </div>
          {getFerie(sel)&&<div style={{padding:"6px 10px",background:"var(--Rp)",borderRadius:8,fontSize:12,color:"var(--R)",fontWeight:600,marginBottom:6}}>
            <IconeOuEmoji e="⭐"/> Jour férié - {getFerie(sel)}
          </div>}
          {getUserEv(sel)?.type==="cng"&&<div style={{padding:"6px 10px",background:"var(--Gp)",borderRadius:8,fontSize:12,color:"var(--G)",fontWeight:600,marginBottom:6}}>
            <Pastille couleur="var(--G)"/> Congé - {getUserEv(sel).txt}
          </div>}
          {getUserEv(sel)?.type==="abs"&&<div style={{padding:"6px 10px",background:"var(--Rp)",borderRadius:8,fontSize:12,color:"var(--R)",fontWeight:600,marginBottom:6}}>
            <Pastille couleur="var(--R)"/> {getUserEv(sel).txt}
          </div>}
          {getAccueil(sel).length>0&&!([0,6].includes(jourIdx(sel)))&&<div style={{marginBottom:6}}>
            <div style={{fontSize:11,fontWeight:700,color:"var(--m)",marginBottom:4}}>Enfants accueillis :</div>
            {getAccueil(sel).map(e=><div key={e.id}style={{display:"flex",gap:6,alignItems:"center",padding:"3px 0",fontSize:13}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:colorEnf(e.id)}}/>
              <span style={{color:"var(--b)"}}>{e.emoji} {e.prenom}</span>
              <span style={{fontSize:11,color:"var(--l)"}}>{e.contrat?.horaires}</span>
            </div>)}
          </div>}
          {isVacances(ds(sel))&&<div style={{padding:"6px 10px",background:"var(--Bp)",borderRadius:8,fontSize:12,color:"var(--B)",fontWeight:600,marginBottom:6}}>
            <IconeOuEmoji e="🏖️"/> Vacances scolaires {nomVacances(ds(sel))} - Zone C
          </div>}
          {getBirthday(sel)&&<div style={{padding:"6px 10px",background:"var(--Tp)",borderRadius:8,fontSize:12,color:"var(--T)",fontWeight:600}}>
            <IconeOuEmoji e="🎂"/> Anniversaire de {getBirthday(sel)?.prenom} !
          </div>}
          {!getFerie(sel)&&!getUserEv(sel)&&!getAccueil(sel).length&&!isVacances(ds(sel))&&!getBirthday(sel)&&
            <div style={{fontSize:12,color:"var(--l)"}}>Aucun événement ce jour.</div>}
        </div>}

      </div>
    </div>}
    {/* ===== Bloc événements du mois — sous le calendrier, pleine largeur (les deux vues) ===== */}
    <div className="card" style={{marginTop:14}}>
      <div style={{fontWeight:700,fontSize:14,marginBottom:12,color:"var(--b)",display:"flex",alignItems:"center",gap:8}}><IconeOuEmoji e="📋"/> Événements de {noms[mois]} {an}
        <div style={{marginLeft:"auto",display:"flex",gap:4}}>
          <button className="btn bG" style={{padding:"4px 9px"}} onClick={()=>{if(mois===0){setMois(11);setAn(a=>a-1)}else setMois(m=>m-1)}}>‹</button>
          <button className="btn bG" style={{padding:"4px 9px"}} onClick={()=>{if(mois===11){setMois(0);setAn(a=>a+1)}else setMois(m=>m+1)}}>›</button>
        </div>
      </div>
      {moisEvs.length===0&&<div style={{fontSize:13,color:"var(--l)"}}>Aucun événement ce mois-ci.</div>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:8}}>
        {moisEvs.map(ev=><div key={ev.id}style={{display:"flex",gap:8,padding:"8px 10px",borderRadius:10,background:"var(--c)",alignItems:"center"}}>
          <span className="badge"style={{
            background:typeEv(ev.type).fond,
            color:typeEv(ev.type).texte,
            whiteSpace:"nowrap",fontSize:11}}>
            {ev.date.slice(8)} {noms[mois].slice(0,3).toLowerCase()}
          </span>
          <span style={{fontSize:12,color:"var(--m)",flex:1}}>{ev.txt}</span>
        </div>)}
      </div>
      {VACANCES_2024.filter(v=>v.debut.startsWith(moisStr)||v.fin.startsWith(moisStr)||(v.debut<moisStr+"-99"&&v.fin>moisStr)).map(v=>
        <div key={v.nom} style={{marginTop:10,padding:12,background:"var(--Bp)",borderRadius:10,border:"1px solid rgba(46,95,138,.3)"}}>
          <div style={{fontWeight:700,fontSize:12,color:"var(--B)",marginBottom:2}}><IconeOuEmoji e="🏖️"/> Vacances {v.nom} - Zone C</div>
          <div style={{fontSize:11,color:"var(--m)"}}>{fmt(v.debut)} → {fmt(v.fin)}</div>
        </div>)}
    </div>
  </div>;
}

export function Documents({enfants,role,pEId,user}){
  // ANNEES DYNAMIQUES P11 - annee courante par defaut, liste calculee depuis les contrats
  const anneesDispo=useMemo(()=>{
    const max=new Date().getFullYear();
    let min=max;
    enfants?.forEach(e=>{
      const d=e?.contrat?.debut;
      if(d){
        const y=parseInt(d.slice(0,4),10);
        if(!isNaN(y)&&y<min)min=y;
      }
    });
    const list=[];
    for(let y=max;y>=min;y--)list.push(String(y));
    return list.length?list:[String(max)];
  },[enfants]);
  const [annee,setAnnee]=useState(String(new Date().getFullYear()));
  const [cat,setCat]=useState("tous");
  const [eId,setEId]=useState("tous");
  const isDemoMode=enfants.every(e=>["e1","e2","e3"].includes(e.id));
  const [docs,setDocs]=useState(isDemoMode?DOCS_DEMO:[]);
  const [toast,setToast]=useState("");
  const [apercu,setApercu]=useState(null);
  const [showUpload,setShowUpload]=useState(false);
  const [uploading,setUploading]=useState(false);
  const [newDoc,setNewDoc]=useState({nom:"",cat:"medical",sous:"",eId:enfants[0]?.id||""});
  const [newFile,setNewFile]=useState(null);
  const uploadRef=useRef(null);

  // Load documents from Supabase on mount
  useEffect(()=>{
    if(isDemoMode||!user?.id)return;
    (async()=>{
      const{data,error}=await supabase.from('documents_meta').select('*').eq('asmat_id',user.id).order('created_at',{ascending:false});
      if(!error&&data)setDocs(data.map(d=>({
        id:d.id,eId:d.enfant_id,cat:d.categorie||'admin',sous:d.sous_type||'',
        nom:d.nom,date:d.created_at?.slice(0,10)||TODAY_STR,annee:(d.created_at||'').slice(0,4),
        taille:d.taille||'-',icone:CATS[d.categorie]?.ic||'📄',partage:d.partage!==false,
        url:d.storage_url||null,storagePath:d.storage_path||null
      })));
    })();
  },[user?.id,isDemoMode]);

  const annees=anneesDispo;
  // CONTRAT DANS DOCUMENTS - surfacer les PDF de contrat (depuis enfant.contrat.pdf_storage_path),
  // independamment de documents_meta : garantit l'acces parent a son contrat dans la vue Documents.
  const contratDocs=useMemo(()=>{
    return (enfants||[]).filter(e=>e?.contrat?.pdf_storage_path).map(e=>{
      const c=e.contrat;
      const dateRef=String(c.pdf_generated_at||c.date_signature_parent||c.date_signature_asmat||c.debut||TODAY_STR);
      return {
        id:"ctrt_"+c.id, eId:e.id, cat:"admin",
        sous:(c.signe_asmat&&c.signe_parent)?"Contrat signé":"Contrat",
        nom:"Contrat_"+(e.prenom||"enfant")+(c.debut?("_"+c.debut.slice(0,7)):"")+".pdf",
        date:dateRef.slice(0,10), annee:dateRef.slice(0,4)||String(new Date().getFullYear()),
        taille:"PDF", icone:"📄", partage:true, url:null, storagePath:c.pdf_storage_path,
      };
    });
  },[enfants]);
  const baseList=role==="parent"
    ? docs.filter(d=>d.partage&&enfants.some(e=>e.id===d.eId))
    : docs;
  // BULLETINS DANS DOCUMENTS - surfacer les bulletins de salaire envoyés (PDF dans bucket documents)
  const [bulletinDocs,setBulletinDocs]=useState([]);
  useEffect(()=>{
    const contratIds=(enfants||[]).map(e=>e?.contrat?.id).filter(Boolean);
    if(!contratIds.length){setBulletinDocs([]);return;}
    let alive=true;
    supabase.from("bulletins").select("mois,annee,pdf_storage_path,envoye_au_parent,enfant_id,contrat_id").in("contrat_id",contratIds).eq("envoye_au_parent",true).then(({data})=>{
      if(!alive)return;
      setBulletinDocs((data||[]).filter(b=>b.pdf_storage_path).map(b=>{
        const e=(enfants||[]).find(x=>x.id===b.enfant_id);
        const moisStr=typeof b.mois==="string"?b.mois:String(b.mois||"");
        const dateRef=(moisStr.length>=7)?(moisStr.slice(0,7)+"-01"):((b.annee||new Date().getFullYear())+"-01-01");
        return {id:"bull_"+b.contrat_id+"_"+moisStr, eId:b.enfant_id, cat:"admin",
          sous:"Bulletin de salaire", nom:"Bulletin_"+(e?.prenom||"enfant")+"_"+moisStr+".pdf",
          date:dateRef, annee:String(b.annee||dateRef.slice(0,4)),
          taille:"PDF", icone:"📜", partage:true, url:null, storagePath:b.pdf_storage_path};
      }));
    });
    return()=>{alive=false;};
  },[(enfants||[]).map(e=>e?.contrat?.id).join(",")]);
  const seenPaths=new Set(baseList.map(d=>d.storagePath).filter(Boolean));
  // LA CONVENTION COLLECTIVE - c'est elle qui tranche tout ce que le contrat ne
  // dit pas, et le contrat y renvoie explicitement. Elle etait pourtant
  // introuvable depuis l'application. On pointe vers le texte officiel de
  // Legifrance, gratuit et toujours a jour, plutot que d'embarquer une copie
  // PDF qui se perimerait au premier avenant.
  const docConvention={
    id:"ccn3239", eId:null, cat:"agrement", sous:"Convention collective",
    nom:"Convention collective IDCC 3239 (texte officiel)",
    // La date affichee est celle de la convention elle-meme, pas celle du jour :
    // un document de reference qui se date d'aujourd'hui change tous les matins.
    // L'annee de classement suit le filtre courant pour qu'elle reste visible.
    date:"2021-03-15", annee:annee==="tous"?String(new Date().getFullYear()):annee,
    taille:"Légifrance", icone:"🏛️", partage:true, url:URL_CONVENTION,
    storagePath:null, permanent:true,
  };
  const liste=[...baseList,...contratDocs.filter(d=>!seenPaths.has(d.storagePath)),...bulletinDocs.filter(d=>!seenPaths.has(d.storagePath)),docConvention];

  const filtres=liste.filter(d=>{
    if(annee!=="tous"&&d.annee!==annee)return false;
    if(cat!=="tous"&&d.cat!==cat)return false;
    if(eId!=="tous"&&d.eId!==eId&&d.eId!==null)return false;
    return true;
  }).sort((a,b)=>b.date>a.date?1:-1);

  const parCat=Object.entries(CATS).map(([k,v])=>({
    ...v, key:k,
    count:filtres.filter(d=>d.cat===k).length
  })).filter(c=>c.count>0);

  // BUCKETS PRIVES P3: helper pour generer une signed URL valide 1h
  const getSignedUrl=async(storagePath)=>{
    if(!storagePath)return null;
    const{data,error}=await supabase.storage.from('documents').createSignedUrl(storagePath,3600);
    if(error){console.error('Signed URL doc:',error.message);return null;}
    return data?.signedUrl||null;
  };

  const telechargerDoc=async(doc)=>{
    if(doc.storagePath){
      const url=await getSignedUrl(doc.storagePath);
      if(url)window.open(url,'_blank');
      else setToast("❌ Erreur ouverture du document");
    }else if(doc.url){
      window.open(doc.url,'_blank');
    }else{
      setToast("Aperçu de "+doc.nom+" ✓");
    }
  };

  const supprimerDoc=async(doc)=>{
    if(!window.confirm("Supprimer "+doc.nom+" ?"))return;
    if(doc.storagePath&&!isDemoMode){
      await supabase.storage.from('documents').remove([doc.storagePath]);
      await supabase.from('documents_meta').delete().eq('id',doc.id);
    }
    setDocs(p=>p.filter(d=>d.id!==doc.id));
    setToast("Document supprimé ✓");
  };

  const ajouterDoc=async()=>{
    if(!newDoc.nom.trim()){setToast("Donne un nom au document");return;}
    setUploading(true);

    if(isDemoMode||!user?.id||!newFile){
      // Demo mode or no file: just add to local state
      setDocs(p=>[...p,{
        id:"dn"+Date.now(),eId:newDoc.eId||null,cat:newDoc.cat,
        sous:newDoc.sous||CATS[newDoc.cat]?.l,
        nom:newDoc.nom+(newDoc.nom.endsWith(".pdf")?"":".pdf"),
        date:TODAY_STR,annee:new Date().getFullYear().toString(),
        taille:newFile?(newFile.size>1024*1024?nbf((newFile.size/1024/1024),1)+" Mo":nbf((newFile.size/1024),0)+" Ko"):"-",
        icone:CATS[newDoc.cat]?.ic||"📄",partage:true,url:null
      }]);
      setToast("Document ajouté ✓"+(newFile?"":" (sans fichier - ajoutez un fichier pour le stockage permanent)"));
    }else{
      // Real upload to Supabase Storage
      const ext=newFile.name.split('.').pop()||'pdf';
      const fileName=`${Date.now()}_${newDoc.nom.replace(/[^a-zA-Z0-9]/g,'_')}.${ext}`;
      const path=`${user.id}/${newDoc.eId||'general'}/${fileName}`;

      // Seuls les envois manuels sont bloques. Un contrat ou un bulletin genere
      // par l'application passe toujours : refuser d'enregistrer un document que
      // l'utilisatrice vient de produire serait pire qu'un depassement.
      const place=await placeDisponible(user,"documents",newFile.size);
      if(!place.ok){ setToast("🔒 "+place.message); setUploading(false); return; }
      const{error:upErr}=await supabase.storage.from('documents').upload(path,newFile,{upsert:false});
      if(upErr){
        console.error('Upload doc:',upErr.message);
        setToast("❌ Erreur upload: "+upErr.message);
        setUploading(false);return;
      }

      // BUCKETS PRIVES P3: ne pas stocker d'URL en DB (signed URL = expire)
      // L'URL sera regeneree a la demande via getSignedUrl(storagePath)
      const taille=newFile.size>1024*1024?nbf((newFile.size/1024/1024),1)+" Mo":nbf((newFile.size/1024),0)+" Ko";

      // Save metadata
      const meta={
        asmat_id:user.id,
        enfant_id:newDoc.eId||null,
        categorie:newDoc.cat,
        sous_type:newDoc.sous||CATS[newDoc.cat]?.l,
        nom:newDoc.nom+(newDoc.nom.includes('.')?'':'.'+ext),
        taille:taille,
        storage_path:path,
        storage_url:null,
        partage:true,
      };
      const{data:inserted,error:metaErr}=await supabase.from('documents_meta').insert(meta).select().single();
      if(metaErr)console.error('Meta insert:',metaErr.message);

      // Genere une signed URL temporaire pour l'affichage immediat
      const signedUrl=await getSignedUrl(path);

      setDocs(p=>[{
        id:inserted?.id||"dn"+Date.now(),eId:newDoc.eId||null,cat:newDoc.cat,
        sous:newDoc.sous||CATS[newDoc.cat]?.l,
        nom:meta.nom,date:TODAY_STR,annee:new Date().getFullYear().toString(),
        taille,icone:CATS[newDoc.cat]?.ic||"📄",partage:true,
        url:signedUrl,storagePath:path
      },...p]);
      setToast("✅ Document uploadé et sauvegardé");
    }

    setNewDoc({nom:"",cat:"medical",sous:"",eId:enfants[0]?.id||""});
    setNewFile(null);
    setShowUpload(false);
    setUploading(false);
  };

  return <div className="fi">
    {toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
    <PageHeader icon="🗂️" title="Espace Documents"
      sub="Tous les documents classés par année - téléchargeables et imprimables"
      action={role==="asmat"&&<button className="btn bT"onClick={()=>setShowUpload(!showUpload)}>+ Ajouter</button>}/>

    {/* Coup d'oeil — ce qui est disponible en un regard (repere Pandi-Panda : tout au meme endroit, lisible) */}
    <div className="card"style={{padding:0,marginBottom:14,overflow:"hidden"}}>
      <div style={{background:"linear-gradient(135deg,var(--Bp),var(--Sp))",padding:"15px 18px"}}>
        <div style={{fontSize:11,fontWeight:700,color:"var(--B)",textTransform:"uppercase",letterSpacing:".5px",marginBottom:3}}>{role==="parent"?"Vos documents":"Documents"}</div>
        <div className="pf"style={{fontSize:26,fontWeight:800,color:"var(--b)",lineHeight:1.1}}>{liste.length} document{liste.length>1?"s":""}</div>
        <div style={{fontSize:11,color:"var(--m)",marginTop:3}}>classés par année, accessibles à tout moment et téléchargeables en PDF</div>
      </div>
      <div className="g3"style={{padding:14,gap:10}}>
        {[["Contrats",contratDocs.length,"var(--B)","var(--Bp)"],
          ["Bulletins de salaire",bulletinDocs.length,"var(--T)","var(--Tp)"],
          ["Autres documents",Math.max(0,liste.length-contratDocs.length-bulletinDocs.length),"var(--S)","var(--Sp)"],
        ].map(([l,v,c,bg])=><div key={l}style={{background:bg,borderRadius:12,padding:"11px 10px",textAlign:"center",minWidth:0}}>
          <div className="pf"style={{fontSize:20,fontWeight:800,color:c,lineHeight:1.1}}>{v}</div>
          <div style={{fontSize:11,color:"var(--m)",marginTop:3,fontWeight:600}}>{l}</div>
        </div>)}
      </div>
    </div>

    {/* Formulaire ajout */}
    {showUpload&&<div className="card"style={{marginBottom:16,border:"1.5px solid var(--T)"}}>
      <div style={{fontWeight:700,fontSize:13,marginBottom:12,color:"var(--b)"}}><IconeOuEmoji e="📎"/> Ajouter un document</div>
      <div className="g2"style={{marginBottom:10}}>
        <div>
          <label className="lbl">Nom du fichier</label>
          <input className="inp"value={newDoc.nom}onChange={e=>setNewDoc(p=>({...p,nom:e.target.value}))}placeholder="ex: Ordonnance_Mars2024.pdf"/>
        </div>
        <div>
          <label className="lbl">Catégorie</label>
          <select className="sel"value={newDoc.cat}onChange={e=>setNewDoc(p=>({...p,cat:e.target.value}))}>
            {Object.entries(CATS).map(([k,v])=><option key={k}value={k}>{v.ic} {v.l}</option>)}
          </select>
        </div>
        <div>
          <label className="lbl">Sous-type</label>
          <input className="inp"value={newDoc.sous}onChange={e=>setNewDoc(p=>({...p,sous:e.target.value}))}placeholder="ex: Ordonnance, Contrat..."/>
        </div>
        <div>
          <label className="lbl">Enfant concerné</label>
          <select className="sel"value={newDoc.eId}onChange={e=>setNewDoc(p=>({...p,eId:e.target.value}))}>
            <option value="">- Document général -</option>
            {enfants.map(e=><option key={e.id}value={e.id}>{e.emoji} {e.prenom}</option>)}
          </select>
        </div>
      </div>
      <div style={{display:"flex",gap:8}}>
        <button className="btn bG"onClick={()=>{setShowUpload(false);setNewFile(null);}}>Annuler</button>
        <button className="btn bT"onClick={ajouterDoc}disabled={uploading}>{uploading?"⏳ Upload...":"Enregistrer"}</button>
      </div>
      {/* File picker */}
      <div style={{marginTop:10,padding:12,border:"2px dashed var(--br)",borderRadius:10,textAlign:"center",cursor:"pointer",background:"var(--c)"}}
        onClick={()=>uploadRef.current?.click()}>
        <input ref={uploadRef}type="file"accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"style={{display:"none"}}
          onChange={e=>{const f=e.target.files?.[0];if(f){setNewFile(f);if(!newDoc.nom.trim())setNewDoc(p=>({...p,nom:f.name.replace(/\.[^.]+$/,'')}));}}}/>
        {newFile
          ?<div style={{fontSize:12,color:"var(--S)"}}><IconeOuEmoji e="📎"/> {newFile.name} ({nbf((newFile.size/1024),0)} Ko) <span style={{color:"var(--l)"}}>— cliquer pour changer</span></div>
          :<div style={{fontSize:12,color:"var(--l)"}}><IconeOuEmoji e="📁"/> Cliquer pour sélectionner un fichier (PDF, image, doc...)</div>}
      </div>
    </div>}

    {/* Filtres */}
    <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
      {/* Années */}
      <div style={{display:"flex",gap:4}}>
        {["tous",...annees].map(a=><button key={a}onClick={()=>setAnnee(a)}style={{
          padding:"5px 12px",borderRadius:20,border:"1.5px solid",cursor:"pointer",fontSize:12,fontWeight:600,
          fontFamily:"'DM Mono',monospace",
          background:annee===a?"var(--b)":"var(--w)",
          color:annee===a?"#fff":"var(--m)",
          borderColor:annee===a?"var(--b)":"var(--br)",
        }}>{a==="tous"?"Toutes":a}</button>)}
      </div>
      <div style={{width:1,height:20,background:"var(--br)"}}/>
      {/* Catégories */}
      {[{key:"tous",l:"Tous",ic:"📁",c:"var(--m)"},...Object.entries(CATS).map(([k,v])=>({key:k,...v}))].map(c=>(
        <button key={c.key}onClick={()=>setCat(c.key)}style={{
          padding:"5px 11px",borderRadius:20,border:"1.5px solid",cursor:"pointer",fontSize:12,fontWeight:600,
          background:cat===c.key?c.c||"var(--b)":"transparent",
          color:cat===c.key?"#fff":c.c||"var(--m)",
          borderColor:cat===c.key?c.c||"var(--b)":c.bg||"var(--br)",
        }}><IconeOuEmoji e={c.ic}/> {c.l}</button>
      ))}
      {/* Enfant filter pour asmat */}
      {role==="asmat"&&<select value={eId}onChange={e=>setEId(e.target.value)}className="sel"style={{width:"auto",padding:"5px 10px",fontSize:12}}>
        <option value="tous">Tous les enfants</option>
        {enfants.map(e=><option key={e.id}value={e.id}>{e.emoji} {e.prenom}</option>)}
        <option value="">Général</option>
      </select>}
    </div>

    {/* Compteur */}
    <div style={{fontSize:12,color:"var(--l)",marginBottom:14,fontFamily:"'DM Mono',monospace"}}>
      {filtres.length} document{filtres.length>1?"s":""} · {annee==="tous"?"toutes années":annee}
    </div>

    {/* Documents par catégorie */}
    {filtres.length===0&&<div className="card"style={{padding:"var(--pad-carte-l)",textAlign:"center"}}>
      <div style={{fontSize:40,marginBottom:10}}>🗂️</div>
      <div style={{fontSize:14,fontWeight:700,color:"var(--b)",marginBottom:4}}>Aucun document pour ces filtres</div>
      <div style={{fontSize:12.5,color:"var(--l)",lineHeight:1.6}}>{role==="parent"?"Votre contrat et vos bulletins de salaire apparaîtront ici dès qu'ils seront partagés par votre assistante maternelle.":"Ajoutez un document avec le bouton « + Ajouter », ou changez les filtres ci-dessus."}</div>
    </div>}

    {parCat.map(c=>(
      <div key={c.key}style={{marginBottom:20}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
          <div style={{padding:"4px 12px",borderRadius:20,background:c.bg,color:c.c,fontSize:12,fontWeight:700,border:"1px solid "+c.c+"33"}}>
            <IconeOuEmoji e={c.ic}/> {c.l}
          </div>
          <div style={{flex:1,height:1,background:"linear-gradient(90deg,var(--br),transparent)"}}/>
          <span style={{fontSize:11,color:"var(--l)",fontFamily:"'DM Mono',monospace"}}>{c.count}</span>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {filtres.filter(d=>d.cat===c.key).map(doc=>{
            const enfant=doc.eId?enfants.find(e=>e.id===doc.eId):null;
            return <div key={doc.id}className="card"style={{display:"flex",alignItems:"center",gap:12,transition:"box-shadow .18s"}}
              onMouseEnter={e=>e.currentTarget.style.boxShadow="var(--sh2)"}
              onMouseLeave={e=>e.currentTarget.style.boxShadow="var(--sh)"}>
              {/* Icone */}
              <div style={{width:40,height:40,borderRadius:10,background:CATS[doc.cat]?.bg||"var(--c)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>
                {doc.icone}
              </div>
              {/* Info */}
              <div style={{flex:1,overflow:"hidden"}}>
                <div style={{fontWeight:600,fontSize:13,color:"var(--b)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{doc.nom}</div>
                <div style={{display:"flex",gap:8,marginTop:3,flexWrap:"wrap"}}>
                  <span style={{fontSize:11,color:"var(--l)"}}>{doc.sous}</span>
                  <span style={{fontSize:11,color:"var(--l)"}}>·</span>
                  <span style={{fontSize:11,color:"var(--l)",fontFamily:"'DM Mono',monospace"}}>{doc.date.split("-").reverse().join("/")}</span>
                  {doc.taille!=="-"&&<><span style={{fontSize:11,color:"var(--l)"}}>·</span>
                  <span style={{fontSize:11,color:"var(--l)",fontFamily:"'DM Mono',monospace"}}>{doc.taille}</span></>}
                  {enfant&&<span className="badge"style={{background:enfant.couleur+"18",color:enfant.couleur,fontSize:11,padding:"1px 7px"}}>
                    {enfant.emoji} {enfant.prenom}
                  </span>}
                  {!doc.partage&&<span className="badge"style={{background:"var(--Bp)",color:"var(--B)",fontSize:11}}>Privé</span>}
                </div>
              </div>
              {/* Actions */}
              <div style={{display:"flex",gap:6,flexShrink:0}}>
                <button className="btn bG s"style={{padding:"6px 10px"}}
                  onClick={()=>setApercu(apercu===doc.id?null:doc.id)}
                  title="Aperçu">👁️</button>
                <button className="btn bG s"style={{padding:"6px 10px"}}
                  onClick={()=>telechargerDoc(doc)}
                  title="Télécharger">⬇️</button>
                <button className="btn bG s"style={{padding:"6px 10px"}}
                  onClick={()=>{if(doc.storagePath||doc.url)telechargerDoc(doc);else setToast("Impression: "+doc.nom);}}
                  title="Imprimer">🖨️</button>
                {role==="asmat"&&!doc.permanent&&<button className="btn bG s"style={{padding:"6px 10px",color:"var(--R)"}}
                  onClick={()=>supprimerDoc(doc)}
                  title="Supprimer">🗑️</button>}
              </div>
            </div>;
          })}
        </div>
      </div>
    ))}

    {/* Aperçu simulé */}
    {apercu&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:20}}>
      {(()=>{const doc=liste.find(d=>d.id===apercu);if(!doc)return null;
        return <div style={{background:"var(--w)",borderRadius:16,padding:0,width:"100%",maxWidth:520,overflow:"hidden",boxShadow:"var(--sh2)"}}>
          <div style={{background:"linear-gradient(135deg,var(--T),#B85838)",padding:"16px 20px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{color:"#fff"}}>
              <div style={{fontWeight:700,fontSize:15}}>{doc.icone} {doc.nom}</div>
              <div style={{fontSize:11,opacity:.8,marginTop:2}}>{doc.sous} · {doc.date.split("-").reverse().join("/")} · {doc.taille}</div>
            </div>
            <button onClick={()=>setApercu(null)}style={{background:"rgba(255,255,255,.2)",border:"none",color:"#fff",cursor:"pointer",borderRadius:10,padding:"6px 10px",fontSize:13}}>✕</button>
          </div>
          <div style={{padding:24}}>
            <div style={{background:"var(--c)",borderRadius:12,padding:20,minHeight:200,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12,textAlign:"center"}}>
              <div style={{fontSize:52}}>{doc.icone}</div>
              <div className="pf"style={{fontSize:18,fontWeight:600,color:"var(--b)"}}>{doc.nom}</div>
              <div style={{fontSize:12,color:"var(--l)"}}>{(doc.storagePath||doc.url)?"Cliquez sur Télécharger pour ouvrir le PDF":"Aperçu non disponible pour ce document"}</div>
              <div style={{fontSize:11,color:"var(--l)"}}>{(doc.storagePath||doc.url)?"Le fichier s'ouvre dans un nouvel onglet":""}</div>
            </div>
            <div style={{display:"flex",gap:8,marginTop:16,justifyContent:"flex-end"}}>
              <button className="btn bG"onClick={()=>{if(doc.storagePath||doc.url)telechargerDoc(doc);else window.print();}}><IconeOuEmoji e="🖨️"/> Imprimer</button>
              <button className="btn bT"onClick={()=>telechargerDoc(doc)}><IconeOuEmoji e="⬇️"/> Télécharger</button>
            </div>
          </div>
        </div>;
      })()}
    </div>}
  </div>;
}

//
// Somme des taux patronaux de la table ci-dessous. On la calcule plutot que de

export function CahierJour({enfants,role,pEId,user,pointagesDB}){
  const liste=role==="parent"?enfants.filter(e=>e.id===pEId):enfants;
  const isDemo=enfants.every(e=>["e1","e2","e3"].includes(e.id));
  const [selId,setSelId]=useState(liste[0]?.id);
  const [dateSel,setDateSel]=useState(TODAY_STR);
  const enfant=liste.find(e=>e.id===selId)||liste[0];

  const [repas,setRepas]=useState(null);
  const [changes,setChanges]=useState([]);
  const [siestes,setSiestes]=useState([]);
  const [activites,setActivites]=useState([]);
  const [cahier,setCahier]=useState(null);
  const [photos,setPhotos]=useState([]);
  const [toast,setToast]=useState("");
  const [mot,setMot]=useState("");
  const [humeur,setHumeur]=useState("");
  const [saving,setSaving]=useState(false);
  const [photoLoading,setPhotoLoading]=useState(false);
  const [echanges,setEchanges]=useState([]);
  const [msgTx,setMsgTx]=useState("");
  const [moodTx,setMoodTx]=useState("");
  const [sendingTx,setSendingTx]=useState(false);

  const isToday=dateSel===TODAY_STR;
  const DEMO_SOMMEIL={
    e1:[{id:"s1",debut:"13h00",fin:"14h30",duree:"1h30",qualite:"bien"}],
    e3:[{id:"s2",debut:"12h45",fin:"14h45",duree:"2h00",qualite:"bien"}],
  };

  const loadPhotos=async(eid)=>{
    if(isDemo)return;
    setPhotoLoading(true);
    try{
      const path=`${user?.id||'anon'}/${eid}/${dateSel}`;
      const{data:files,error}=await supabase.storage.from('photos').list(path,{limit:50});
      if(!error&&files?.length){
        const valid=files.filter(f=>f.name!=='.emptyFolderPlaceholder');
        const paths=valid.map(f=>`${path}/${f.name}`);
        const{data:signed}=await supabase.storage.from('photos').createSignedUrls(paths,3600);
        setPhotos((signed||[]).map(s=>s.signedUrl).filter(Boolean));
      }else setPhotos([]);
    }catch(e){setPhotos([]);}
    setPhotoLoading(false);
  };

  useEffect(()=>{
    if(!enfant?.id)return;
    let cancelled=false;
    (async()=>{
      if(isDemo){
        const r=D.repas.find(x=>x.eId===enfant.id&&x.date===dateSel)||null;
        setRepas(r?{dej:r.dej,gou:r.gou,bib:r.bib,q:r.q,notes:r.notes}:null);
        setChanges(D.changes.filter(x=>x.eId===enfant.id&&x.date===dateSel).map(x=>({id:x.id,heure:x.h,type:x.type,note:x.n})).sort((a,b)=>a.heure>b.heure?1:-1));
        setSiestes(DEMO_SOMMEIL[enfant.id]||[]);
        setActivites(D.portfolio.filter(x=>x.eId===enfant.id&&x.date===dateSel).map(x=>({id:x.id,titre:x.titre,description:x.desc,emoji:x.emoji,competences:x.competences})));
        const tx=D.transmissions.filter(x=>x.eId===enfant.id&&x.date===dateSel&&x.auteur==="asmat").slice(-1)[0];
        const c={mot_du_jour:tx?.txt||"",humeur:tx?.mood||""};
        setCahier(c);setMot(c.mot_du_jour);setHumeur(c.humeur);setPhotos([]);
        setEchanges(D.transmissions.filter(x=>x.eId===enfant.id&&x.date===dateSel).map((x,i)=>({id:x.id||("d"+i),auteur:x.auteur,heure:x.h,texte:x.txt,mood:x.mood})));
        return;
      }
      const eid=enfant.id;
      const[rRepas,rCh,rSo,rPf,rCa,rTx]=await Promise.all([
        supabase.from("repas").select("*").eq("enfant_id",eid).eq("date",dateSel).maybeSingle(),
        supabase.from("changes_couches").select("*").eq("enfant_id",eid).eq("date",dateSel),
        supabase.from("sommeil").select("*").eq("enfant_id",eid).eq("date",dateSel).order("created_at",{ascending:true}),
        supabase.from("portfolio").select("*").eq("enfant_id",eid).eq("date",dateSel).order("created_at",{ascending:true}),
        supabase.from("cahier_jour").select("*").eq("enfant_id",eid).eq("date",dateSel).maybeSingle(),
        supabase.from("transmissions").select("*").eq("enfant_id",eid).eq("date",dateSel).order("heure",{ascending:true}),
      ]);
      if(cancelled)return;
      const rp=rRepas.data;
      setRepas(rp?{dej:rp.dejeuner,gou:rp.gouter,bib:rp.biberon,q:rp.qualite,notes:rp.notes}:null);
      setChanges((rCh.data||[]).map(x=>({id:x.id,heure:x.heure,type:x.type,note:x.note})).sort((a,b)=>a.heure>b.heure?1:-1));
      setSiestes(rSo.data||[]);
      setActivites(rPf.data||[]);
      const c=rCa.data||{mot_du_jour:"",humeur:""};
      setCahier(c);setMot(c.mot_du_jour||"");setHumeur(c.humeur||"");
      loadPhotos(eid);
      setEchanges((rTx.data||[]).map(x=>({id:x.id,auteur:x.auteur_role,heure:x.heure,texte:x.texte,mood:x.mood})));
    })();
    return()=>{cancelled=true;};
  },[enfant?.id,dateSel,isDemo]);

  const sauverMot=async()=>{
    if(isDemo){setCahier({mot_du_jour:mot,humeur});setToast("Mot du jour enregistré ✓ (démo)");return;}
    if(!enfant?.id)return;
    setSaving(true);
    const{error}=await supabase.from("cahier_jour").upsert({
      enfant_id:enfant.id,asmat_id:user.id,date:dateSel,
      mot_du_jour:mot||null,humeur:humeur||null,updated_at:new Date().toISOString()
    },{onConflict:"enfant_id,date"});
    setSaving(false);
    if(error){setToast("Erreur : "+(error.message||"inconnue"));return;}
    setCahier({mot_du_jour:mot,humeur});setToast("Mot du jour enregistré ✓");
  };

  const envoyerMsg=async()=>{
    if(!msgTx.trim()||!enfant?.id)return;
    const h=new Date().toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"});
    if(isDemo){
      setEchanges(p=>[...p,{id:"tn"+Date.now(),auteur:role,heure:h,texte:msgTx,mood:moodTx||""}]);
      setMsgTx("");setMoodTx("");setToast("Message ajouté ✓ (démo)");return;
    }
    setSendingTx(true);
    const{data,error}=await supabase.from("transmissions").insert({
      enfant_id:enfant.id,auteur_id:user?.id,auteur_role:role,
      date:dateSel,heure:h,texte:msgTx,mood:moodTx||null,
    }).select().single();
    setSendingTx(false);
    if(error){setToast("Erreur : "+(error.message||"envoi impossible"));return;}
    setEchanges(p=>[...p,{id:data?.id||("tn"+Date.now()),auteur:role,heure:h,texte:msgTx,mood:moodTx||""}]);
    setMsgTx("");setMoodTx("");setToast("Message envoyé ✓");
  };

  const ajouterPhoto=async(ev)=>{
    const file=ev.target.files?.[0];if(!file)return;
    if(isDemo){setToast("Photo non enregistrée en démo");return;}
    if(!enfant?.id)return;
    setPhotoLoading(true);
    const ext=file.name.split('.').pop()||'jpg';
    const path=`${user?.id||'anon'}/${enfant.id}/${dateSel}/${Date.now()}.${ext}`;
    // Le quota se verifie juste avant l'envoi : le mesurer plus tot laisserait
    // passer une photo ajoutee entre-temps depuis un autre appareil.
    const place=await placeDisponible(user,"photos");
    if(!place.ok){ alert(place.message); return; }
    const{error}=await supabase.storage.from('photos').upload(path,file,{upsert:false});
    if(error){setToast("Erreur upload : "+error.message);setPhotoLoading(false);return;}
    await loadPhotos(enfant.id);setToast("Photo ajoutée ✓");
  };

  const changeJour=(delta)=>{
    const d=new Date(dateSel+"T12:00:00");d.setDate(d.getDate()+delta);
    const ns=isoJour(d);
    if(ns>TODAY_STR)return;
    setDateSel(ns);
  };

  const dateLabel=(()=>{try{return new Date(dateSel+"T12:00:00").toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"});}catch(e){return dateSel;}})();
  const HUMEURS=["😄","😊","😐","😴","😢","🥰"];
  const qLabel=(q)=>QUALITE_REPAS[q]?<PastilleRepas q={q} taille={11.5}/>:"";
  const qCol=(q)=>q==="bien"?"var(--S)":q==="peu"?"var(--G)":"var(--R)";
  const nbChanges=changes.filter(c=>c.type==="Change").length;
  const humeurAff=cahier?.humeur||(role==="asmat"?humeur:"");

  const hhm=(t)=>t?String(t).slice(0,5):"";
  const moments=[];
  if(repas){
    if(repas.dej)moments.push({time:"12:00",ic:"🍽️",l:"Déjeuner",sub:repas.q?qLabel(repas.q):"",bg:"var(--Tp)"});
    if(repas.gou)moments.push({time:"15:30",ic:"🍎",l:"Goûter",sub:"",bg:"var(--Tp)"});
    if(repas.bib)moments.push({time:"",ic:"🍼",l:"Biberon",sub:"",bg:"var(--Tp)"});
  }
  siestes.forEach(s=>moments.push({time:hhm(s.debut),ic:"😴",l:"Sieste"+(s.duree?" · "+s.duree:""),sub:(s.debut&&s.fin)?(s.debut+" → "+s.fin):"",bg:"var(--Pp)"}));
  changes.forEach(c=>moments.push({time:hhm(c.heure),ic:c.type==="Propre"?"✅":"👶",l:c.type==="Propre"?"Couche propre":"Change",sub:c.note||"",bg:"var(--Gp)"}));
  activites.forEach(a=>moments.push({time:"",ic:a.emoji||"🎨",l:a.titre||"Activité",sub:a.description||"",comps:a.competences||[],bg:"var(--Sp)"}));
  moments.sort((x,y)=>{if(x.time&&y.time)return x.time<y.time?-1:1;if(x.time&&!y.time)return -1;if(!x.time&&y.time)return 1;return 0;});
  const remplis=[!!(repas&&(repas.dej||repas.gou||repas.bib)),siestes.length>0,activites.length>0,changes.length>0,!!(cahier&&cahier.mot_du_jour),photos.length>0];
  const pctJour=Math.round(100*remplis.filter(Boolean).length/remplis.length);
  const sommeilMin=siestes.reduce((t,s)=>{const m=String(s.duree||"").match(/(\d+)\s*h\s*(\d+)?/);return t+(m?(parseInt(m[1])*60+(parseInt(m[2])||0)):0);},0);
  const sommeilTxt=sommeilMin>0?(Math.floor(sommeilMin/60)+"h"+String(sommeilMin%60).padStart(2,"0")):"—";
  const appEtat=repas&&QUALITE_REPAS[repas.q];
  const appLabel=appEtat?appEtat.l:"—";
  const appIc="🍽️";
  const appColor=appEtat?appEtat.teinte:"var(--l)";
  const coupOeil=[
    {ic:appIc,v:appLabel,l:"Appétit",c:appColor},
    {ic:"😴",v:sommeilTxt,l:"Sommeil",c:"var(--B)"},
    {ic:"👶",v:String(changes.length),l:changes.length>1?"Changes":"Change",c:"var(--G)"},
    {ic:humeurAff||"🙂",v:humeurAff?"":"—",l:"Humeur",c:"var(--T)"},
  ];

  if(!enfant)return <div className="fi"><PageHeader icon="📔" title="Cahier du jour" sub="Aucun enfant lié."/></div>;

  return <div className="fi">
    {toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
    <PageHeader icon="📔" title="Cahier du jour" sub={role==="asmat"?"La journée de l'enfant, en un coup d'œil":"La journée de "+(enfant.prenom||"votre enfant")}/>

    {role==="asmat"&&liste.length>1&&<div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
      {liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>setSelId(e.id)}/>)}
    </div>}

    {/* Navigation date */}
    <div className="card"style={{marginBottom:14,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
      <button className="btn bG"style={{padding:"6px 12px"}}onClick={()=>changeJour(-1)}>◀</button>
      <div style={{textAlign:"center"}}>
        <div style={{fontWeight:700,fontSize:14,color:"var(--b)",textTransform:"capitalize"}}>{dateLabel}</div>
        {isToday?<div style={{fontSize:11,color:"var(--l)",marginTop:2}}>Aujourd'hui</div>
          :<div onClick={()=>setDateSel(TODAY_STR)}style={{fontSize:11,color:"var(--T)",cursor:"pointer",marginTop:2}}>↩ Revenir à aujourd'hui</div>}
      </div>
      <button className="btn bG"style={{padding:"6px 12px",opacity:isToday?.4:1,cursor:isToday?"default":"pointer"}}disabled={isToday}onClick={()=>changeJour(1)}>▶</button>
    </div>

    {/* En-tete enfant + humeur */}
    <div className="card"style={{marginBottom:12,display:"flex",alignItems:"center",gap:14,position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",left:0,top:0,bottom:0,width:5,background:enfant.couleur||"var(--T)"}}/>
      <AvatarEnfant e={enfant} size={52}/>
      <div style={{flex:1,minWidth:0}}>
        <div className="pf"style={{fontSize:19,fontWeight:700,color:"var(--b)"}}>{enfant.prenom}</div>
        <div style={{fontSize:12,color:"var(--l)",marginTop:2}}>{humeurAff?"Humeur du jour":"Journée en cours"}</div>
      </div>
      {humeurAff&&<span style={{fontSize:38}}>{humeurAff}</span>}
    </div>

    {/* Coup d'oeil - rythme de la journee en un regard (facon Pandi-Panda) */}
    <div className="card"style={{padding:"var(--pad-carte-conteneur)",marginBottom:12,display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:0,overflow:"hidden"}}>
      {coupOeil.map((k,i)=><div key={k.l}style={{padding:"12px 6px",textAlign:"center",borderLeft:i>0?"1px solid var(--br)":"none"}}>
        <div style={{fontSize:20,lineHeight:1}}><IconeOuEmoji e={k.ic} taille={20}/></div>
        {k.v&&<div className="pf"style={{fontSize:14,fontWeight:700,color:k.c,marginTop:5,lineHeight:1.1,wordBreak:"break-word"}}>{k.v}</div>}
        <div style={{fontSize:11,color:"var(--l)",marginTop:3,fontWeight:600,textTransform:"uppercase",letterSpacing:".3px"}}>{k.l}</div>
      </div>)}
    </div>

    {/* Photos */}
    <div className="card"style={{marginBottom:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:photos.length?12:0}}>
        <div style={{fontWeight:700,fontSize:14,color:"var(--b)"}}><IconeOuEmoji e="📸"/> Photos du jour</div>
        {role==="asmat"&&<label className="btn bT s"style={{padding:"6px 12px",cursor:"pointer",margin:0}}>
          + Photo<input type="file"accept="image/*"style={{display:"none"}}onChange={ajouterPhoto}/></label>}
      </div>
      {photoLoading&&<div style={{fontSize:12,color:"var(--l)"}}>Chargement…</div>}
      {!photoLoading&&photos.length===0&&<div style={{fontSize:13,color:"var(--l)",marginTop:8}}>{role==="asmat"?"Ajoutez une photo de la journée.":"Aucune photo partagée pour ce jour."}</div>}
      {photos.length>0&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(90px,1fr))",gap:8}}>
        {photos.map((u,i)=><img key={i}src={u}alt=""style={{width:"100%",aspectRatio:"1",objectFit:"cover",borderRadius:10}}/>)}
      </div>}
    </div>

    {/* La journée — frise + complétude (modernisation) */}
    <div className="card"style={{marginBottom:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:9}}>
        <div style={{fontWeight:700,fontSize:14,color:"var(--b)"}}><IconeOuEmoji e="📔"/> La journée{role==="parent"?" de "+(enfant.prenom||""):""}</div>
        <span style={{fontSize:12,fontWeight:700,color:"var(--T)"}}>journée remplie · {pctJour}%</span>
      </div>
      <div style={{height:8,borderRadius:99,background:"var(--c)",overflow:"hidden",marginBottom:16}}>
        <div style={{width:pctJour+"%",height:"100%",background:"var(--T)",borderRadius:99,transition:"width .5s"}}/>
      </div>
      {moments.length===0
        ?<div style={{fontSize:13,color:"var(--l)"}}>Rien d'enregistré pour ce jour pour le moment.</div>
        :<div>
          {moments.map((m,i)=><div key={i}style={{display:"flex",gap:12}}>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
              <div style={{width:34,height:34,borderRadius:"50%",background:m.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,flexShrink:0}}><IconeOuEmoji e={m.ic}/></div>
              {i<moments.length-1&&<div style={{flex:1,width:2,background:"var(--br)",margin:"3px 0"}}/>}
            </div>
            <div style={{flex:1,paddingBottom:i<moments.length-1?14:2}}>
              {m.time&&<div style={{fontSize:11,color:"var(--l)"}}>{m.time}</div>}
              <div style={{fontSize:14,fontWeight:600,color:"var(--b)"}}>{m.l}</div>
              {m.sub&&<div style={{fontSize:12,color:"var(--m)",marginTop:1}}>{m.sub}</div>}
              {m.comps&&m.comps.length>0&&<div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:5}}>
                {m.comps.map((co,j)=><span key={j}className="badge"style={{background:"var(--Sp)",color:"var(--S)",fontSize:11}}>{co}</span>)}
              </div>}
            </div>
          </div>)}
        </div>}
    </div>

    {/* Mot du jour */}
    <div className="card"style={{marginBottom:12,border:"1.5px solid var(--P)"}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
        <IconeOuEmoji e="💬"/>
        <div style={{fontWeight:700,fontSize:14,color:"var(--P)"}}>Le mot du jour</div>
      </div>
      {role==="asmat"?<div>
        <div style={{marginBottom:10}}>
          <label className="lbl">Humeur de la journée</label>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {HUMEURS.map(h=><button key={h}className={"moo "+(humeur===h?"on":"")}onClick={()=>setHumeur(humeur===h?"":h)}>{h}</button>)}
          </div>
        </div>
        <textarea className="ta"value={mot}onChange={e=>setMot(e.target.value)}placeholder={"Un petit mot sur la journée de "+(enfant.prenom||"l'enfant")+"…"}style={{minHeight:70}}/>
        <button className="btn bT"style={{width:"100%",marginTop:10}}onClick={sauverMot}disabled={saving}>{saving?"Enregistrement…":"Enregistrer le mot du jour"}</button>
      </div>:(
        cahier?.mot_du_jour?<div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:15,lineHeight:1.7,color:"var(--b)",fontStyle:"italic",whiteSpace:"pre-wrap"}}>{cahier.mot_du_jour}</div>
        :<div style={{fontSize:13,color:"var(--l)"}}>Pas encore de mot du jour.</div>
      )}
    </div>

    {/* Échanges du jour (transmissions parent + assmat) */}
    <div className="card"style={{marginBottom:12}}>
      <div style={{fontWeight:700,fontSize:14,marginBottom:12,color:"var(--b)"}}><IconeOuEmoji e="💬"/> Échanges du jour</div>
      {echanges.length===0
        ?<div style={{fontSize:13,color:"var(--l)"}}>{role==="parent"?"Aucun message échangé aujourd'hui.":"Aucun message du parent aujourd'hui."}</div>
        :<div style={{display:"flex",flexDirection:"column",gap:10}}>
          {echanges.map(t=>{const am=t.auteur==="asmat";return <div key={t.id}style={{display:"flex",gap:10}}>
            <div style={{textAlign:"center",minWidth:34,flexShrink:0}}>{t.mood&&<div style={{fontSize:18}}>{t.mood}</div>}<div style={{fontSize:11,color:"var(--l)"}}>{t.heure?String(t.heure).slice(0,5):""}</div></div>
            <div style={{flex:1,background:am?"var(--Tp)":"var(--Bp)",borderRadius:12,padding:"9px 13px",borderLeft:"3px solid "+(am?"var(--T)":"var(--B)")}}>
              <div style={{fontSize:11,fontWeight:700,color:am?"var(--T)":"var(--B)",marginBottom:3}}>{am?(enfant?.prenomAsmat||"Assistante maternelle"):"Parent"}</div>
              <div style={{fontSize:13,color:"var(--b)",lineHeight:1.5,whiteSpace:"pre-wrap"}}>{t.texte}</div>
            </div>
          </div>;})}
        </div>}
      {/* Écrire dans le cahier (fusion Journal → Cahier) */}
      <div style={{marginTop:14,borderTop:"1px solid var(--br)",paddingTop:12}}>
        <div style={{display:"flex",gap:6,marginBottom:8,flexWrap:"wrap"}}>
          {["😊","😴","😋","😢","🤒","🎨"].map(m=><button key={m}onClick={()=>setMoodTx(moodTx===m?"":m)}className={"moo"+(moodTx===m?" on":"")}style={{fontSize:15}}>{m}</button>)}
        </div>
        <textarea className="ta" value={msgTx} onChange={e=>setMsgTx(e.target.value)} placeholder={role==="parent"?"Un mot pour l'assistante maternelle… (transmission du matin, info utile)":"Un mot pour les parents…"} rows={2} style={{width:"100%",boxSizing:"border-box",marginBottom:8}}/>
        <button className="btn bT" disabled={sendingTx||!msgTx.trim()} style={{width:"100%",justifyContent:"center",opacity:(sendingTx||!msgTx.trim())?0.55:1}} onClick={envoyerMsg}>{sendingTx?"…":"Envoyer"}</button>
      </div>
    </div>

    {role==="asmat"&&<div style={{fontSize:11,color:"var(--l)",textAlign:"center",padding:"4px 0 8px"}}>
      Repas, siestes, changes et activités se saisissent dans « Détail du jour » et « Éveil → Portfolio ». Ils s'affichent ici automatiquement, résumés dans la frise.
    </div>}
  </div>;
}

//

export function ExportDonnees({enfants,user,role}){
  const [selEnfant,setSelEnfant]=useState("tous");
  const [periode,setPeriode]=useState("annee");
  const [format,setFormat]=useState("json");
  const [exporting,setExporting]=useState(false);
  const [toast,setToast]=useState("");

  // EXPORT RGPD P12 - modules sont des couples table/cle pour generer le vrai export
  const modulesConfig=useMemo(()=>[
    {id:"profil",l:"Profil et informations personnelles",checked:true,table:"profiles",field:"id",scope:"user"},
    {id:"enfants",l:"Fiches des enfants accueillis",checked:true,table:"enfants",field:role==="asmat"?"asmat_id":"parent_id",scope:"user"},
    {id:"contrats",l:"Contrats et avenants",checked:true,table:"contrats",field:role==="asmat"?"asmat_id":"parent_id",scope:"user"},
    {id:"modifications_contrat",l:"Demandes d'avenants",checked:true,table:"modifications_contrat",field:"contrat_id",scope:"enfant_via_contrat"},
    {id:"pointages",l:"Historique des pointages",checked:true,table:"pointages",field:"enfant_id",scope:"enfant"},
    {id:"transmissions",l:"Journal et transmissions",checked:true,table:"transmissions",field:"enfant_id",scope:"enfant"},
    {id:"bilans",l:"Bilans periodiques",checked:true,table:"bilans",field:"enfant_id",scope:"enfant"},
    {id:"absences",l:"Historique des absences",checked:true,table:"absences",field:"enfant_id",scope:"enfant"},
    {id:"sante",l:"Vaccins",checked:true,table:"vaccins",field:"enfant_id",scope:"enfant"},
    {id:"croissance",l:"Donnees de croissance",checked:false,table:"croissance",field:"enfant_id",scope:"enfant"},
    {id:"sommeil",l:"Donnees de sommeil",checked:false,table:"sommeil",field:"enfant_id",scope:"enfant"},
    {id:"repas",l:"Historique des repas",checked:false,table:"repas",field:"enfant_id",scope:"enfant"},
    {id:"changes",l:"Historique des changes",checked:false,table:"changes_couches",field:"enfant_id",scope:"enfant"},
    {id:"portfolio",l:"Portfolio",checked:false,table:"portfolio",field:"enfant_id",scope:"enfant"},
    {id:"jalons",l:"Jalons de developpement",checked:false,table:"jalons",field:"enfant_id",scope:"enfant"},
    {id:"paiements",l:"Historique des paiements",checked:true,table:"paiements",field:"contrat_id",scope:"enfant_via_contrat"},
    {id:"messages",l:"Messages",checked:false,table:"messages",field:"enfant_id",scope:"enfant"},
    {id:"documents",l:"Metadonnees des documents",checked:false,table:"documents_meta",field:role==="asmat"?"asmat_id":"enfant_id",scope:role==="asmat"?"user":"enfant"},
    {id:"audit_log",l:"Journal des actions (audit)",checked:false,table:"audit_log",field:"user_id",scope:"user"},
  ],[role]);

  const [sel,setSel]=useState(()=>Object.fromEntries(modulesConfig.map(m=>[m.id,m.checked])));

  // Filtre temporel
  const dateBornes=useMemo(()=>{
    const now=new Date();
    const year=now.getFullYear();
    if(periode==="mois")return{debut:new Date(year,now.getMonth(),1),fin:now};
    if(periode==="trimestre")return{debut:new Date(year,now.getMonth()-2,1),fin:now};
    if(periode==="annee")return{debut:new Date(year,0,1),fin:now};
    return{debut:null,fin:null}; // tout
  },[periode]);

  const exporter=async()=>{
    setExporting(true);
    try{
      // 1. Determiner les enfants concernes
      const enfantIds=selEnfant==="tous"?enfants.map(e=>e.id):[selEnfant];
      // 2. Determiner les contrats concernes (pour les tables liees au contrat)
      const contratIds=enfants.filter(e=>selEnfant==="tous"||e.id===selEnfant).map(e=>e.contrat?.id).filter(Boolean);

      // 3. Pour chaque module selectionne, recuperer les donnees
      const exportData={
        _meta:{
          exporte_le:new Date().toISOString(),
          exporte_par:user?.email||"-",
          user_id:user?.id||"-",
          role:role,
          periode:periode,
          enfant_filtre:selEnfant,
          modules_selectionnes:Object.entries(sel).filter(([k,v])=>v).map(([k])=>k),
          rgpd:"Export realise dans le cadre du droit a la portabilite (article 20 RGPD)",
        },
      };

      const modulesActifs=modulesConfig.filter(m=>sel[m.id]);
      for(const m of modulesActifs){
        let q=supabase.from(m.table).select("*");
        if(m.scope==="user"){
          // ex: profiles WHERE id = user.id
          if(m.table==="profiles") q=q.eq("id",user.id);
          else q=q.eq(m.field,user.id);
        }else if(m.scope==="enfant"){
          if(!enfantIds.length){exportData[m.id]=[];continue;}
          q=q.in(m.field,enfantIds);
        }else if(m.scope==="enfant_via_contrat"){
          if(!contratIds.length){exportData[m.id]=[];continue;}
          q=q.in(m.field,contratIds);
        }
        // Filtre temporel quand pertinent (sur created_at ou date)
        if(dateBornes.debut){
          // tester si la table a une colonne date ou created_at
          const colsDate=["date","created_at"];
          for(const c of colsDate){
            // Try, mais ne pas casser si la colonne n existe pas — on laisse Supabase ignorer
          }
          if(["pointages","transmissions","bilans","absences","croissance","sommeil","repas","changes_couches","portfolio","jalons","paiements","messages","audit_log"].includes(m.table)){
            q=q.gte("created_at",dateBornes.debut.toISOString());
          }
        }
        const{data,error}=await q;
        if(error){
          exportData[m.id]={erreur:error.message};
        }else{
          exportData[m.id]=data||[];
        }
      }

      // 4. Generer le fichier
      const fileName="export-timat-"+(user?.email||"user").replace(/[^a-z0-9]/gi,"_")+"-"+isoJour(new Date())+"."+format;

      if(format==="json"){
        const blob=new Blob([JSON.stringify(exportData,null,2)],{type:"application/json"});
        const url=URL.createObjectURL(blob);
        const a=document.createElement("a");a.href=url;a.download=fileName;a.click();URL.revokeObjectURL(url);
      }else if(format==="csv"){
        // CSV : un fichier par table, concatenes avec separateurs
        let csv="";
        for(const[key,rows]of Object.entries(exportData)){
          if(key==="_meta"){
            csv+="=== METADONNEES ===\n";
            for(const[k,v]of Object.entries(rows))csv+=k+","+(Array.isArray(v)?v.join(";"):v)+"\n";
            csv+="\n";
            continue;
          }
          if(!Array.isArray(rows)||!rows.length){csv+="=== "+key.toUpperCase()+" (vide) ===\n\n";continue;}
          csv+="=== "+key.toUpperCase()+" ===\n";
          const headers=Object.keys(rows[0]);
          csv+=headers.join(",")+"\n";
          rows.forEach(r=>{
            csv+=headers.map(h=>{
              let v=r[h];
              if(v===null||v===undefined)return"";
              if(typeof v==="object")v=JSON.stringify(v);
              v=String(v).replace(/"/g,'""');
              return v.includes(",")||v.includes("\n")||v.includes('"')?'"'+v+'"':v;
            }).join(",")+"\n";
          });
          csv+="\n";
        }
        const blob=new Blob([csv],{type:"text/csv;charset=utf-8"});
        const url=URL.createObjectURL(blob);
        const a=document.createElement("a");a.href=url;a.download=fileName;a.click();URL.revokeObjectURL(url);
      }else{
        // PDF : version resume imprimable
        const w=window.open("","_blank");
        if(!w){setToast("Autorisez les popups pour le PDF");setExporting(false);return;}
        const summary=Object.entries(exportData).filter(([k])=>k!=="_meta").map(([k,v])=>{
          const n=Array.isArray(v)?v.length:(v?.erreur?"erreur":"-");
          return"<tr><td>"+k+"</td><td>"+n+"</td></tr>";
        }).join("");
        const html='<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Export RGPD</title><style>'
          +'body{font-family:Arial,sans-serif;max-width:800px;margin:30px auto;color:#222}'
          +'h1{color:#B8622F}table{width:100%;border-collapse:collapse;margin:14px 0}'
          +'td,th{padding:8px;border:1px solid #ddd;text-align:left;font-size:12px}'
          +'th{background:#f5f5f5}@media print{.nb{display:none}}</style></head><body>'
          +'<h1>Export RGPD - Synthese</h1>'
          +'<p>Exporte le : '+new Date().toLocaleString("fr-FR")+'</p>'
          +'<p>Utilisateur : '+H(user?.email||"-")+'</p>'
          +'<p>Période : '+H(periode)+'</p>'
          +'<p>Enfants : '+H(selEnfant)+'</p>'
          +'<h2>Donnees exportees</h2>'
          +'<table><tr><th>Module</th><th>Nombre d enregistrements</th></tr>'+summary+'</table>'
          +'<p style="font-size:11px;color:#888;margin-top:20px">Le PDF est un resume. Pour les donnees brutes, utilisez l export JSON ou CSV.</p>'
          +'<div style="text-align:center;margin-top:20px"><button class="nb" onclick="window.print()" style="background:#B8622F;color:#fff;border:none;padding:10px 24px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:700">Imprimer / PDF</button></div>'
          +'</body></html>';
        w.document.write(html);w.document.close();
      }

      await logAction("export_data_rgpd",{table_name:"profiles",record_id:user?.id,user_id:user?.id});
      setToast("Export "+format.toUpperCase()+" telecharge ✓");
    }catch(e){
      setToast("Erreur export : "+e.message);
    }
    setExporting(false);
  };

  const modules=modulesConfig;

  return <div className="fi">
    {toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
    <PageHeader icon="📦" title="Export de vos données"
      sub="Téléchargez l'intégralité de vos données - droit RGPD à la portabilité"/>
    <div className="g2">
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div className="card">
          <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:14}}><IconeOuEmoji e="📋"/> Ce que vous exportez</div>
          {modules.map(m=><label key={m.id}style={{display:"flex",gap:10,alignItems:"center",cursor:"pointer",padding:"7px 0",borderBottom:"1px solid var(--br)"}}>
            <input type="checkbox"checked={sel[m.id]}onChange={e=>setSel(p=>({...p,[m.id]:e.target.checked}))}
              style={{width:15,height:15,accentColor:"var(--T)",flexShrink:0}}/>
            <span style={{fontSize:13,color:"var(--b)"}}>{m.l}</span>
          </label>)}
          <div style={{display:"flex",gap:8,marginTop:12}}>
            <button className="btn bG s"style={{padding:"6px 10px"}}onClick={()=>setSel(Object.fromEntries(modules.map(m=>[m.id,true])))}>Tout cocher</button>
            <button className="btn bG s"style={{padding:"6px 10px"}}onClick={()=>setSel(Object.fromEntries(modules.map(m=>[m.id,false])))}>Tout decocher</button>
          </div>
        </div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div className="card">
          <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:14}}><IconeOuEmoji e="⚙️"/> Options</div>
          <div style={{marginBottom:12}}>
            <label className="lbl">Enfant concerné</label>
            <select className="sel"value={selEnfant}onChange={e=>setSelEnfant(e.target.value)}>
              <option value="tous">Tous les enfants</option>
              {enfants.map(e=><option key={e.id}value={e.id}>{e.emoji} {e.prenom}</option>)}
            </select>
          </div>
          <div style={{marginBottom:12}}>
            <label className="lbl">Période</label>
            <select className="sel"value={periode}onChange={e=>setPeriode(e.target.value)}>
              <option value="mois">Ce mois</option>
              <option value="trimestre">Ce trimestre</option>
              <option value="annee">Cette année</option>
              <option value="tout">Tout l'historique</option>
            </select>
          </div>
          <div style={{marginBottom:16}}>
            <label className="lbl">Format</label>
            <div style={{display:"flex",gap:8}}>
              {[["json","🔧 JSON"],["csv","📊 CSV"],["pdf","📄 PDF résumé"]].map(([v,l])=><button key={v}onClick={()=>setFormat(v)}style={{
                flex:1,padding:"8px",borderRadius:8,border:"1.5px solid",cursor:"pointer",fontSize:12,fontWeight:600,
                background:format===v?"var(--b)":"transparent",color:format===v?"#fff":"var(--m)",
                borderColor:format===v?"var(--b)":"var(--br)"}}>{l}</button>)}
            </div>
          </div>
          <div style={{background:"var(--Bp)",borderRadius:10,padding:"10px 12px",marginBottom:14,fontSize:12,color:"var(--B)"}}>
            <IconeOuEmoji e="🔒"/> Export conforme RGPD (article 20 - droit à la portabilité). Fichier téléchargé directement sur votre appareil. Aucune copie conservée sur nos serveurs.
          </div>
          <button className="btn bT"style={{width:"100%",justifyContent:"center"}}onClick={exporter}disabled={exporting}>
            {exporting?"⏳ Génération en cours...":"📥 Exporter mes données"}
          </button>
        </div>
        <div className="card"style={{background:"var(--Sp)",border:"1px solid var(--Sl)"}}>
          <div style={{fontWeight:700,fontSize:13,color:"var(--S)",marginBottom:6}}><IconeOuEmoji e="✅"/> Vos droits RGPD</div>
          <div style={{fontSize:12,color:"var(--m)",lineHeight:1.7}}>
            Vous avez le droit d'accéder à toutes vos données, de les télécharger, et de les supprimer à tout moment. En cas de demande : support@timat.app - réponse sous 30 jours.
          </div>
        </div>
      </div>
    </div>
  </div>;
}

// ========== BILANS & EXPORTS ==========

export function OnboardingWizard({user,onFinish}){
  const [step,setStep]=useState(0);
  const [enfant,setEnfant]=useState({prenom:"",naissance:"",emoji:"🦁",photo:null});
  const [contrat,setContrat]=useState({
    heuresHebdo:40,tauxHoraire:4.20,entretien:3.80,
    jours:["Lundi","Mardi","Mercredi","Jeudi","Vendredi"],
    horaires:"07h30–17h30",debut:isoJour(new Date())
  });
  const [parentEmail,setParentEmail]=useState("");
  const [saving,setSaving]=useState(false);
  const [pushDone,setPushDone]=useState(false);
  const [toast,setToast]=useState("");
  const EMOJIS=["🦁","🌸","⭐","🐻","🦋","🌈","🐸","🦊","🐼","🌻"];
  const toggleJour=(j)=>setContrat(c=>({...c,jours:c.jours.includes(j)?c.jours.filter(x=>x!==j):[...c.jours,j]}));

  const sauvegarder=async()=>{
    if(!enfant.prenom||!enfant.naissance)return;
    setSaving(true);
    // Helper: retry on Supabase lock errors
    const withRetry=async(fn,retries=3)=>{
      for(let i=0;i<retries;i++){
        try{
          const result=await fn();
          return result;
        }catch(e){
          if(e.message?.includes('lock')||e.message?.includes('Lock')){
            console.log(`[TiMat] Lock conflict, retry ${i+1}/${retries}...`);
            await new Promise(r=>setTimeout(r,300*(i+1)));
            continue;
          }
          throw e;
        }
      }
      throw new Error('Trop de conflits de lock - réessaie dans quelques secondes');
    };

    try{
      // Skip Supabase for demo users
      const isDemo=user?.id?.startsWith?.("demo-");
      if(isDemo){
        setToast("Mode demo - données non sauvegardées");
        setSaving(false);
        onFinish();
        return;
      }

      // 1. S'assurer que le profil existe dans Supabase
      const{data:profil}=await withRetry(()=>supabase.from('profiles').select('id').eq('id',user.id).maybeSingle());
      if(!profil){
        await withRetry(()=>supabase.from('profiles').insert({
          id:user.id,email:user.email,
          prenom:user.prenom||'',nom:user.nom||'',
          role:user.role||'asmat',couleur:'#B8622F',
          subscription_status:'free'
        }));
      }

      // 2. Créer l'enfant
      const{data:enfantData,error:errEnfant}=await withRetry(()=>supabase.from('enfants').insert({
        prenom:enfant.prenom,
        emoji:enfant.emoji||'👶',
        photo_url:enfant.photo||null,
        naissance:enfant.naissance,
        asmat_id:user.id,
        actif:true,
      }).select().single());

      if(errEnfant){
        console.error('Erreur enfant:', errEnfant);
        setToast('❌ Erreur: '+errEnfant.message);
        setSaving(false);return;
      }

      // 3. Créer le contrat lié à l'enfant
      const{error:errContrat}=await withRetry(()=>supabase.from('contrats').insert({
        enfant_id:enfantData.id,
        asmat_id:user.id,
        debut:contrat.debut||isoJour(new Date()),
        heures_hebdo:contrat.heuresHebdo||40,
        taux_horaire:contrat.tauxHoraire||minimumHoraireAu(new Date()),
        entretien:contrat.entretien||3.92,
        // L'assistant posait la question du rythme et jetait la reponse :
        // le contrat repartait en annee complete quoi qu'on ait choisi.
        annee_complete:contrat.anneeComplete!==false,
        semaines_accueil:contrat.anneeComplete===false?(Number(contrat.semainesAccueil)||SEMAINES_MAX_ANNEE_INCOMPLETE):null,
        // Non renseigne a la creation : le contrat imprime une ligne a
        // completer plutot que d'affirmer qui fournit les repas.
        repas_fourni_par:contrat.repasFourniPar||null,
        jours:contrat.jours||['Lundi','Mardi','Mercredi','Jeudi','Vendredi'],
        horaires:contrat.horaires||'07h30–17h30',
        aeeh:!!contrat.aeeh,
        repas:Number(contrat.repas)||0,
        actif:true,
      }));

      if(errContrat){console.error('Erreur contrat:', errContrat);}

      setToast('✅ '+enfant.prenom+' ajouté avec succès !');
      setStep(2);
    }catch(e){
      console.error('Erreur sauvegarde:', e);
      setToast('❌ Erreur: '+e.message);
    }
    setSaving(false);
  };

  const stepsTitres=[
    {titre:"Votre premier enfant 👶",sub:"En 2 minutes, TiMat est prêt pour vous."},
    {titre:"Le contrat d'accueil 📄",sub:"Pour calculer automatiquement votre salaire."},
    {titre:"Inviter le parent 👪",sub:"Optionnel - vous pouvez le faire plus tard."},
    {titre:"TiMat est prêt ! 🌿",sub:"Votre espace est configuré."},
  ];
  const s=stepsTitres[step];

  return <div style={{minHeight:"100vh",background:"linear-gradient(160deg,#F0FAF4 0%,#FBF0E8 50%,#EBF4FF 100%)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
    {toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
    <div style={{width:"100%",maxWidth:500}}>
      <div style={{display:"flex",gap:6,marginBottom:28}}>
        {stepsTitres.map((_,i)=><div key={i}style={{flex:1,height:5,borderRadius:3,background:i<=step?"var(--S)":"rgba(0,0,0,.08)",transition:"background .4s"}}/>)}
      </div>
      <div style={{background:"#fff",borderRadius:24,overflow:"hidden",boxShadow:"0 8px 48px rgba(61,107,80,.12)"}}>
        <div style={{background:"linear-gradient(135deg,#3D6B50,#4A7C5F)",padding:"28px 28px 24px"}}>
          <div className="pf"style={{fontSize:22,fontWeight:700,color:"#fff",marginBottom:4}}>{s.titre}</div>
          <div style={{fontSize:13,color:"rgba(255,255,255,.7)"}}>{s.sub}</div>
        </div>
        <div style={{padding:28}}>

          {step===0&&<>
            <div style={{marginBottom:14}}><label className="lbl">Prénom de l'enfant *</label>
              <input className="inp"placeholder="Léo, Emma, Noah..."value={enfant.prenom}onChange={e=>setEnfant(f=>({...f,prenom:e.target.value}))}/></div>
            <div style={{marginBottom:14}}><label className="lbl">Date de naissance *</label>
              <input type="date"className="inp"value={enfant.naissance}onChange={e=>setEnfant(f=>({...f,naissance:e.target.value}))}/></div>
            <div style={{marginBottom:20}}><label className="lbl">Photo ou emoji</label>
              <AvatarPicker emoji={enfant.emoji} photo={enfant.photo} onEmoji={em=>setEnfant(f=>({...f,emoji:em}))} onPhoto={ph=>setEnfant(f=>({...f,photo:ph}))}/>
            </div>
            <button className="btn bS"style={{width:"100%",justifyContent:"center",padding:13}}
              onClick={()=>enfant.prenom&&enfant.naissance&&setStep(1)}
              disabled={!enfant.prenom||!enfant.naissance}>
              Continuer → Le contrat
            </button>
          </>}

          {step===1&&<>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
              <div><label className="lbl">Heures / semaine</label>
                <input type="number"className="inp"value={contrat.heuresHebdo}onChange={e=>setContrat(c=>({...c,heuresHebdo:parseFloat(e.target.value)||40}))}/></div>
              <div><label className="lbl">Taux horaire brut (€)</label>
                <input type="number"step="0.05"className="inp"value={contrat.tauxHoraire}onChange={e=>setContrat(c=>({...c,tauxHoraire:parseFloat(e.target.value)||4.05}))}/></div>
            </div>
            {/* Le mode de mensualisation change le salaire de plus de 10 % :
                52 semaines conges inclus, ou les semaines reellement programmees
                avec des conges payes verses a part (CCN 3239). */}
            <div style={{marginBottom:12,padding:"11px 13px",background:"var(--c)",borderRadius:10,border:"1px solid var(--br)"}}>
              <label className="lbl" style={{marginBottom:7}}>Rythme d'accueil</label>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {[[true,"Année complète","52 semaines, congés inclus dans le salaire"],
                  [false,"Année incomplète","semaines programmées, congés payés à part"]].map(([v,l,d])=>{
                  const on=(contrat.anneeComplete!==false)===v;
                  return <button key={String(v)} type="button" onClick={()=>setContrat(c=>({...c,anneeComplete:v,semainesAccueil:v?null:(c.semainesAccueil||46)}))}
                    style={{flex:"1 1 150px",textAlign:"left",padding:"9px 11px",borderRadius:10,cursor:"pointer",fontFamily:"inherit",
                      border:"1.5px solid "+(on?"var(--accent)":"var(--br)"),background:on?"var(--accent-pale)":"var(--w)"}}>
                    <span style={{display:"block",fontSize:12.5,fontWeight:700,color:on?"var(--accent)":"var(--b)"}}>{l}</span>
                    <span style={{display:"block",fontSize:11,color:"var(--m)",marginTop:2,lineHeight:1.4}}>{d}</span>
                  </button>;
                })}
              </div>
              {contrat.anneeComplete===false&&<div style={{marginTop:10}}>
                <label className="lbl">Semaines d'accueil dans l'année</label>
                <input type="number" min="1" max="46" step="1" className="inp" style={{maxWidth:130}}
                  value={contrat.semainesAccueil??46}
                  onChange={e=>setContrat(c=>({...c,semainesAccueil:Math.min(46,Math.max(1,parseFloat(e.target.value)||46))}))}/>
                <div style={{fontSize:11,color:"var(--l)",marginTop:5,lineHeight:1.5}}>
                  Ce nombre découle du calendrier convenu, pas d'un montant souhaité : comptez les semaines où l'enfant sera confié.
                </div>
              </div>}
              <div style={{marginTop:10,fontSize:12,color:"var(--m)",lineHeight:1.5}}>
                Salaire mensualisé : <b style={{color:"var(--b)"}}>{nbf(salaireMensualise(contrat),2)} €</b>
                {" "}({heuresMensualisees(contrat)} h/mois sur {semainesDuContrat(contrat)} semaines)
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
              <div><label className="lbl">Indemnité entretien (€/j)</label>
                <input type="number"step="0.05"className="inp"value={contrat.entretien}onChange={e=>setContrat(c=>({...c,entretien:parseFloat(e.target.value)||3.80}))}/></div>
              <div><label className="lbl">Date de début</label>
                <input type="date"className="inp"value={contrat.debut}onChange={e=>setContrat(c=>({...c,debut:e.target.value}))}/></div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12,alignItems:"end"}}>
              <div><label className="lbl">Indemnité repas (€/j, optionnel)</label>
                <input type="number"step="0.05"min="0"className="inp"value={contrat.repas||0}onChange={e=>setContrat(c=>({...c,repas:parseFloat(e.target.value)||0}))}/></div>
              <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:"var(--m)",cursor:"pointer",paddingBottom:10}}>
                <input type="checkbox"checked={!!contrat.aeeh}onChange={e=>setContrat(c=>({...c,aeeh:e.target.checked}))}/>
                Enfant handicapé (AEEH) — abattement 4×SMIC
              </label>
            </div>
            <div style={{marginBottom:14}}><label className="lbl">Jours d'accueil</label>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {["Lundi","Mardi","Mercredi","Jeudi","Vendredi"].map(j=><button key={j}onClick={()=>toggleJour(j)}style={{
                  padding:"6px 12px",borderRadius:20,border:"1.5px solid",cursor:"pointer",fontSize:12,fontWeight:600,
                  background:contrat.jours.includes(j)?"var(--S)":"transparent",
                  color:contrat.jours.includes(j)?"#fff":"var(--m)",
                  borderColor:contrat.jours.includes(j)?"var(--S)":"var(--br)"
                }}>{j.slice(0,2)}</button>)}
              </div></div>
            <div style={{background:"var(--Sp)",borderRadius:10,padding:"10px 14px",marginBottom:16,fontSize:12,color:"var(--S)",fontWeight:600}}>
              Salaire mensuel estimé : {Math.round(salaireMensualise(contrat))}€ brut ({Math.round(netDepuisBrut(salaireMensualise(contrat)))}€ net) + {Math.round(contrat.entretien*contrat.heuresHebdo/8*52/12)}€ entretien
            </div>
            <div style={{display:"flex",gap:8}}>
              <button className="btn bG"style={{flex:1}}onClick={()=>setStep(0)}>← Retour</button>
              <button className="btn bS"style={{flex:2,justifyContent:"center"}}onClick={sauvegarder}disabled={saving}>
                {saving?"⏳ Sauvegarde...":"Sauvegarder →"}
              </button>
            </div>
          </>}

          {step===2&&<>
            <div style={{marginBottom:14,padding:"12px 14px",background:"var(--Bp)",borderRadius:10,fontSize:12,color:"var(--B)"}}>
              ℹ️ Le parent recevra un email pour créer son compte et accéder à l'espace famille de {enfant.prenom||"l'enfant"}.
            </div>
            <div style={{marginBottom:16}}><label className="lbl">Email du parent</label>
              <input type="email"className="inp"placeholder="parent@email.fr"value={parentEmail}onChange={e=>setParentEmail(e.target.value)}/></div>
            <div style={{display:"flex",gap:8}}>
              <button className="btn bG"style={{flex:1}}onClick={()=>setStep(3)}>Passer</button>
              <button className="btn bS"style={{flex:2,justifyContent:"center"}}disabled={saving}
                onClick={async()=>{
                  if(!parentEmail.trim()){setStep(3);return;}
                  setSaving(true);
                  let inviteUrl=null;
                  try{
                    const{data:tk}=await supabase.rpc("get_or_create_share_token",{p_enfant_id:enfant.id});
                    if(tk)inviteUrl=(typeof window!=="undefined"?window.location.origin:"https://www.timat.app")+"/?invite="+tk;
                  }catch(e){}
                  try{
                    const res=await fetch('/api/invite-parent',{
                      method:'POST',headers:{'Content-Type':'application/json'},
                      body:JSON.stringify({
                        emailParent:parentEmail,
                        prenomEnfant:enfant.prenom,
                        prenomAsmat:user?.prenom||"Votre assistante maternelle",
                        asmatId:user?.id,enfantId:enfant?.id||null,
                        inviteUrl,
                      })
                    });
                    const d=await res.json();
                    setToast(d.success?"✉️ Invitation envoyée - le parent recevra un email":"Erreur: "+d.error);
                    if(d.success) logAction('invitation_parent', {table_name:'invitations'}); // AUDIT LOG P8
                  }catch(e){setToast("Erreur réseau");}
                  setSaving(false);setStep(3);
                }}>
                {saving?"⏳ Envoi...":"📧 Envoyer l'invitation"}
              </button>
            </div>
          </>}

          {step===3&&<div style={{textAlign:"center",padding:"20px 0"}}>
            <div style={{fontSize:72,marginBottom:16}}>{enfant.emoji||"🌿"}</div>
            <div className="pf"style={{fontSize:20,fontWeight:700,color:"var(--b)",marginBottom:8}}>
              Bienvenue, {user?.prenom} !
            </div>
            <div style={{fontSize:13,color:"var(--m)",lineHeight:1.7,marginBottom:20}}>
              {enfant.prenom&&<><strong>{enfant.prenom}</strong> est ajouté·e à votre espace.<br/></>}
              Commencez par votre premier pointage.
            </div>
            {'Notification' in window&&!pushDone&&<div style={{background:"var(--Gp)",border:"1px solid var(--G)",borderRadius:12,padding:"12px 16px",marginBottom:16,fontSize:12,color:"var(--G)"}}>
              <div style={{fontWeight:700,marginBottom:6}}><IconeOuEmoji e="🔔"/> Activer les notifications ?</div>
              <div style={{marginBottom:8}}>Les alertes importantes arrivent sur cet appareil. Vous les recevrez de toute façon par e-mail.</div>
              <button className="btn bG"style={{width:"100%"}}onClick={async()=>{
                {/* On annonce ce qui s'est passe, pas ce qu'on esperait : le
                    message vient de la fonction, qui sait si ca a marche. */}
                const r=await activerPush(user.id);
                setPushDone(true);setToast(r.message);
              }}>Activer</button>
            </div>}
            <button className="btn bT"style={{width:"100%",justifyContent:"center",padding:13}}onClick={onFinish}>
              Découvrir TiMat 🌿
            </button>
          </div>}

        </div>
      </div>
    </div>
  </div>;
}

//
// Bouton reutilisable pour ouvrir la modale d'ajout d'enfant

export function AjouterEnfantModale({user,onClose}){
  const [step,setStep]=useState(0);
  const [enfant,setEnfant]=useState({prenom:"",nom:"",naissance:"",emoji:"🦁",photo:null});
  const [contrat,setContrat]=useState({
    debut:isoJour(new Date()),
    fin:"",
    heuresHebdo:40,
    tauxHoraire:4.20,
    entretien:3.80,
    anneeComplete:true,
    semainesAccueil:null,
    jours:["Lundi","Mardi","Mercredi","Jeudi","Vendredi"],
    horaires:"07h30–17h30",
  });
  const [parentInfo,setParentInfo]=useState({prenom:"",nom:"",email:""});
  const [saving,setSaving]=useState(false);
  const [toast,setToast]=useState("");
  const [enfantCreeId,setEnfantCreeId]=useState(null);
  const EMOJIS=["🦁","🌸","⭐","🐻","🦋","🌈","🐸","🦊","🐼","🌻","🦄","🐝"];
  const JOURS_SEM=["Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi","Dimanche"];
  const toggleJour=(j)=>setContrat(c=>({...c,jours:c.jours.includes(j)?c.jours.filter(x=>x!==j):[...c.jours,j]}));

  const valideEtape0=()=>enfant.prenom.trim()&&enfant.naissance;
  const valideEtape1=()=>contrat.debut&&contrat.heuresHebdo>0&&contrat.tauxHoraire>0&&(contrat.jours||[]).length>0;

  const sauvegarder=async()=>{
    if(!valideEtape0()||!valideEtape1()){
      setToast("Donnees incompletes");
      return;
    }
    setSaving(true);
    try{
      // 0. Le verrou du forfait, verifie ici et pas seulement sur le bouton :
      //    un lien direct ou un bouton oublie ne doit pas contourner la limite.
      //    Le comptage se fait en base, pas sur une liste deja chargee.
      if(!estPro(user)){
        const{count}=await supabase.from("enfants")
          .select("id",{count:"exact",head:true})
          .eq("asmat_id",user.id);
        if((count||0)>=LIMITE_ENFANTS_GRATUIT){
          setSaving(false);
          setToast("Le forfait gratuit couvre un enfant. Passez au Pro pour en accueillir davantage.");
          return;
        }
      }
      // 1. Creer l'enfant
      const{data:enfantData,error:errEnfant}=await supabase.from("enfants").insert({
        prenom:enfant.prenom.trim(),
        nom:enfant.nom.trim()||null,
        emoji:enfant.emoji||"👶",
        photo_url:enfant.photo||null,
        naissance:enfant.naissance,
        asmat_id:user.id,
        actif:true,
      }).select().single();
      if(errEnfant){
        setToast("Erreur creation enfant : "+errEnfant.message);
        setSaving(false);
        return;
      }
      setEnfantCreeId(enfantData.id);

      // 2. Creer le contrat lie
      const{error:errContrat}=await supabase.from("contrats").insert({
        enfant_id:enfantData.id,
        asmat_id:user.id,
        debut:contrat.debut,
        fin:contrat.fin||null,
        heures_hebdo:Number(contrat.heuresHebdo)||40,
        annee_complete:contrat.anneeComplete!==false,
        semaines_accueil:contrat.anneeComplete===false?(Number(contrat.semainesAccueil)||46):null,
        // Non renseigne a la creation : le contrat imprime une ligne a
        // completer plutot que d'affirmer qui fournit les repas.
        repas_fourni_par:contrat.repasFourniPar||null,
        taux_horaire:Number(contrat.tauxHoraire)||minimumHoraireAu(new Date()),
        entretien:Number(contrat.entretien)||3.80,
        jours:contrat.jours,
        horaires:contrat.horaires||"07h30–17h30",
        aeeh:!!contrat.aeeh,
        repas:Number(contrat.repas)||0,
        actif:true,
      });
      if(errContrat){
        setToast("Enfant cree mais erreur contrat : "+errContrat.message);
        // On continue quand meme - l'enfant est cree
      }

      // 3. Inviter le parent (optionnel, seulement si email fourni)
      if(parentInfo.email.trim()){
        try{
          // Lien de rattachement automatique au bon enfant (token de partage)
          let inviteUrl=null;
          try{
            const{data:tk}=await supabase.rpc("get_or_create_share_token",{p_enfant_id:enfantData.id});
            if(tk)inviteUrl=(typeof window!=="undefined"?window.location.origin:"https://www.timat.app")+"/?invite="+tk;
          }catch(e){}
          const res=await fetch("/api/invite-parent",{
            method:"POST",
            headers:{"Content-Type":"application/json"},
            body:JSON.stringify({
              emailParent:parentInfo.email.trim(),
              prenomParent:parentInfo.prenom.trim()||null,
              nomParent:parentInfo.nom.trim()||null,
              prenomEnfant:enfant.prenom.trim(),
              prenomAsmat:user?.prenom||"Votre assistante maternelle",
              asmatId:user.id,
              enfantId:enfantData.id,
              inviteUrl,
            }),
          });
          const d=await res.json().catch(()=>({}));
          if(d.success) logAction('invitation_parent', {table_name:'invitations', record_id:enfantData.id}); // AUDIT LOG P8
          if(!d.success){
            console.warn("Invitation parent : ",d.error||"erreur inconnue");
          }
        }catch(e){
          console.warn("Invitation parent (reseau) : ",e.message);
        }
      }

      // 4. Trigger le refresh global des donnees
      window.dispatchEvent(new CustomEvent("timat:refresh-data"));
      setStep(3);
    }catch(e){
      setToast("Erreur : "+e.message);
    }
    setSaving(false);
  };

  const titres=[
    {t:"L'enfant",s:"Informations de base"},
    {t:"Le contrat",s:"Conditions d'accueil"},
    {t:"Le parent",s:"Pour l'inviter (optionnel)"},
    {t:"Termine !",s:""},
  ];
  const cur=titres[step];

  return <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(20,15,18,.55)",backdropFilter:"blur(4px)",zIndex:9999,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"40px 16px",overflowY:"auto"}}>
    {toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
    <div onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:520,background:"#fff",borderRadius:20,boxShadow:"0 20px 80px rgba(0,0,0,.3)",overflow:"hidden",position:"relative"}}>
      {/* Bouton fermer */}
      <button onClick={onClose} aria-label="Fermer"
        style={{position:"absolute",top:14,right:14,zIndex:2,width:32,height:32,borderRadius:"50%",border:"none",background:"rgba(255,255,255,.9)",fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff"}}>×</button>

      {/* Header gradient */}
      <div style={{background:"linear-gradient(135deg,var(--T),#C76754)",padding:"22px 24px 18px"}}>
        <div className="pf" style={{fontSize:20,fontWeight:700,color:"#fff",marginBottom:4}}>
          {step===3?"🌿 ":"➕ "}Ajouter un enfant - {cur.t}
        </div>
        {cur.s&&<div style={{fontSize:12,color:"rgba(255,255,255,.85)"}}>{cur.s}</div>}
      </div>

      {/* Barre de progression */}
      <div style={{display:"flex",gap:4,padding:"0 24px",marginTop:14}}>
        {titres.map((_,i)=><div key={i} style={{flex:1,height:4,borderRadius:2,background:i<=step?"var(--T)":"rgba(0,0,0,.08)",transition:"background .3s"}}/>)}
      </div>

      <div style={{padding:"22px 24px 24px"}}>
        {/* ETAPE 0 - Enfant */}
        {step===0&&<>
          <div style={{marginBottom:14}}>
            <label className="lbl">Prenom *</label>
            <input className="inp" placeholder="Leo, Emma, Noah..." value={enfant.prenom}
              onChange={e=>setEnfant(f=>({...f,prenom:e.target.value}))}/>
          </div>
          <div style={{marginBottom:14}}>
            <label className="lbl">Nom (optionnel)</label>
            <input className="inp" placeholder="Nom de famille" value={enfant.nom}
              onChange={e=>setEnfant(f=>({...f,nom:e.target.value}))}/>
          </div>
          <div style={{marginBottom:14}}>
            <label className="lbl">Date de naissance *</label>
            <input type="date" className="inp" value={enfant.naissance}
              onChange={e=>setEnfant(f=>({...f,naissance:e.target.value}))}/>
          </div>
          <div style={{marginBottom:18}}>
            <label className="lbl">Photo ou emoji</label>
            <AvatarPicker emoji={enfant.emoji} photo={enfant.photo} onEmoji={em=>setEnfant(f=>({...f,emoji:em}))} onPhoto={ph=>setEnfant(f=>({...f,photo:ph}))}/>
          </div>
          <button className="btn bT l" disabled={!valideEtape0()}
            onClick={()=>setStep(1)}
            style={{width:"100%",justifyContent:"center",opacity:valideEtape0()?1:.5}}>
            Suivant - Contrat →
          </button>
        </>}

        {/* ETAPE 1 - Contrat */}
        {step===1&&<>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
            <div>
              <label className="lbl">Debut *</label>
              <input type="date" className="inp" value={contrat.debut}
                onChange={e=>setContrat(c=>({...c,debut:e.target.value}))}/>
            </div>
            <div>
              <label className="lbl">Fin (optionnel)</label>
              <input type="date" className="inp" value={contrat.fin}
                onChange={e=>setContrat(c=>({...c,fin:e.target.value}))}/>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
            <div>
              <label className="lbl">Heures / semaine *</label>
              <input type="number" className="inp" min="1" max="50" value={contrat.heuresHebdo}
                onChange={e=>setContrat(c=>({...c,heuresHebdo:e.target.value}))}/>
            </div>
            <div>
              <label className="lbl">Taux horaire (€) *</label>
              <input type="number" className="inp" step="0.01" min="0" value={contrat.tauxHoraire}
                onChange={e=>setContrat(c=>({...c,tauxHoraire:e.target.value}))}/>
            </div>
          </div>
          {/* Le rythme n'etait demande que dans l'assistant du premier enfant :
              tout enfant ajoute ensuite partait en annee complete en silence. */}
          <div style={{marginBottom:14,padding:"11px 13px",background:"var(--c)",borderRadius:10,border:"1px solid var(--br)"}}>
            <label className="lbl" style={{marginBottom:7}}>Rythme d'accueil</label>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {[[true,"Année complète","52 semaines, congés inclus"],
                [false,"Année incomplète","semaines programmées, congés à part"]].map(([v,l,d])=>{
                const on=(contrat.anneeComplete!==false)===v;
                return <button key={String(v)} type="button" onClick={()=>setContrat(c=>({...c,anneeComplete:v,semainesAccueil:v?null:(c.semainesAccueil||46)}))}
                  style={{flex:"1 1 150px",textAlign:"left",padding:"9px 11px",borderRadius:10,cursor:"pointer",fontFamily:"inherit",
                    border:"1.5px solid "+(on?"var(--accent)":"var(--br)"),background:on?"var(--accent-pale)":"var(--w)"}}>
                  <span style={{display:"block",fontSize:12.5,fontWeight:700,color:on?"var(--accent)":"var(--b)"}}>{l}</span>
                  <span style={{display:"block",fontSize:11,color:"var(--m)",marginTop:2,lineHeight:1.4}}>{d}</span>
                </button>;
              })}
            </div>
            {contrat.anneeComplete===false&&<div style={{marginTop:10}}>
              <label className="lbl">Semaines d'accueil dans l'année</label>
              <input type="number" min="1" max="46" step="1" className="inp" style={{maxWidth:130}}
                value={contrat.semainesAccueil??46}
                onChange={e=>setContrat(c=>({...c,semainesAccueil:Math.min(46,Math.max(1,parseFloat(e.target.value)||46))}))}/>
            </div>}
            <div style={{marginTop:10,fontSize:12,color:"var(--m)",lineHeight:1.5}}>
              Salaire mensualisé : <b style={{color:"var(--b)"}}>{nb2(salaireMensualise(contrat))} €</b>
              {" "}({heuresMensualisees(contrat)} h/mois sur {semainesDuContrat(contrat)} semaines)
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
            <div>
              <label className="lbl">Indemnite entretien (€/jour)</label>
              <input type="number" className="inp" step="0.01" min="0" value={contrat.entretien}
                onChange={e=>setContrat(c=>({...c,entretien:e.target.value}))}/>
            </div>
            <div>
              <label className="lbl">Horaires (texte)</label>
              <input className="inp" placeholder="07h30-17h30" value={contrat.horaires}
                onChange={e=>setContrat(c=>({...c,horaires:e.target.value}))}/>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14,alignItems:"end"}}>
            <div>
              <label className="lbl">Indemnite repas (€/jour, optionnel)</label>
              <input type="number" className="inp" step="0.01" min="0" value={contrat.repas||0}
                onChange={e=>setContrat(c=>({...c,repas:e.target.value}))}/>
            </div>
            <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:"var(--m)",cursor:"pointer",paddingBottom:10}}>
              <input type="checkbox" checked={!!contrat.aeeh} onChange={e=>setContrat(c=>({...c,aeeh:e.target.checked}))}/>
              Enfant handicapé (AEEH) — 4×SMIC
            </label>
          </div>
          <div style={{marginBottom:18}}>
            <label className="lbl">Jours d'accueil *</label>
            <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
              {JOURS_SEM.map(j=><button key={j} onClick={()=>toggleJour(j)}
                style={{padding:"7px 11px",borderRadius:10,border:contrat.jours.includes(j)?"2px solid var(--T)":"1.5px solid var(--br)",background:contrat.jours.includes(j)?"var(--Tp)":"#fff",color:contrat.jours.includes(j)?"var(--T)":"var(--m)",fontSize:12,fontWeight:600,cursor:"pointer"}}>{j.slice(0,3)}</button>)}
            </div>
          </div>
          {/* Apercu salaire */}
          {valideEtape1()&&<div style={{background:"var(--Gp)",border:"1px solid var(--G)",borderRadius:10,padding:"10px 14px",marginBottom:14,fontSize:12,color:"var(--G)"}}>
            <strong>Salaire mensuel brut estime :</strong> {Math.round(salaireMensualise(contrat))} € / mois
          </div>}
          <div style={{display:"flex",gap:8}}>
            <button className="btn" onClick={()=>setStep(0)}
              style={{flex:1,justifyContent:"center",padding:"12px",background:"var(--c)",color:"var(--m)"}}>← Retour</button>
            <button className="btn bT l" disabled={!valideEtape1()}
              onClick={()=>setStep(2)}
              style={{flex:2,justifyContent:"center",opacity:valideEtape1()?1:.5}}>
              Suivant - Parent →
            </button>
          </div>
        </>}

        {/* ETAPE 2 - Parent */}
        {step===2&&<>
          <div style={{background:"var(--Sp)",border:"1px solid var(--Sl)",borderRadius:10,padding:"10px 14px",marginBottom:16,fontSize:12,color:"var(--S)"}}>
            Le parent recevra un email d'invitation pour creer son compte et acceder a l'espace de son enfant. Vous pouvez aussi sauter cette etape et l'inviter plus tard.
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
            <div>
              <label className="lbl">Prenom du parent</label>
              <input className="inp" value={parentInfo.prenom}
                onChange={e=>setParentInfo(p=>({...p,prenom:e.target.value}))}/>
            </div>
            <div>
              <label className="lbl">Nom du parent</label>
              <input className="inp" value={parentInfo.nom}
                onChange={e=>setParentInfo(p=>({...p,nom:e.target.value}))}/>
            </div>
          </div>
          <div style={{marginBottom:18}}>
            <label className="lbl">Email du parent</label>
            <input type="email" className="inp" placeholder="parent@email.fr" value={parentInfo.email}
              onChange={e=>setParentInfo(p=>({...p,email:e.target.value}))}/>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button className="btn" onClick={()=>setStep(1)} disabled={saving}
              style={{flex:1,justifyContent:"center",padding:"12px",background:"var(--c)",color:"var(--m)"}}>← Retour</button>
            <button className="btn bT l" onClick={sauvegarder} disabled={saving}
              style={{flex:2,justifyContent:"center",padding:"12px"}}>
              {saving?"⏳ Enregistrement...":(parentInfo.email.trim()?"✓ Creer + Inviter parent":"✓ Creer (sans parent)")}
            </button>
          </div>
        </>}

        {/* ETAPE 3 - Confirmation */}
        {step===3&&<div style={{textAlign:"center",padding:"10px 0"}}>
          <div style={{fontSize:64,marginBottom:14}}>{enfant.emoji}</div>
          <div className="pf" style={{fontSize:20,fontWeight:700,color:"var(--b)",marginBottom:8}}>
            {enfant.prenom} a ete ajoute !
          </div>
          <div style={{fontSize:13,color:"var(--m)",lineHeight:1.6,marginBottom:18}}>
            Le contrat est cree et actif.<br/>
            {parentInfo.email.trim()
              ?<>Le parent va recevoir un email d'invitation a <strong>{parentInfo.email}</strong>.</>
              :<>Vous pourrez inviter le parent plus tard depuis la page parametres.</>}
          </div>
          <button className="btn bT l" onClick={onClose}
            style={{width:"100%",justifyContent:"center",padding:"12px"}}>
            Terminer
          </button>
        </div>}
      </div>
    </div>
  </div>;
}

//

export function AlerteEcart({ecarts,role,onMaj}){
  return <div style={{background:"var(--Rp)",border:"1px solid #EBB9AA",borderRadius:10,padding:"10px 12px",marginBottom:10,fontSize:11.5,color:"var(--R)",lineHeight:1.55}}>
    {role==="asmat"
      ? <>⚠️ Fiche non à jour : le parent a modifié son profil depuis. Fiez-vous au bloc <b>« Contact parent — temps réel »</b> en haut de page.</>
      : <>⚠️ Ces informations ne correspondent plus à votre profil TiMat.</>}
    <div style={{marginTop:6}}>
      {ecarts.map(e=><div key={e.cle}style={{marginTop:3}}>
        {e.champ} ici : <b>{e.fiche}</b><br/>{e.champ} du profil : <b>{e.profil}</b>
      </div>)}
    </div>
    {role==="parent"&&<button className="btn s"style={{marginTop:8,background:"var(--R)",color:"#fff",border:"none"}}onClick={onMaj}>
      Mettre à jour depuis mon profil
    </button>}
  </div>;
}

// ========== FICHE D'URGENCE (dans l'app) ==========

export function FicheUrgence({enfants,role,pEId,user}){
  const [selId,setSelId]=useState(enfants[0]?.id);
  const [toast,setToast]=useState("");
  const [editing,setEditing]=useState(false);
  const [loaded,setLoaded]=useState(false);
  const [hasData,setHasData]=useState(false);
  const [saving,setSaving]=useState(false);
  const liste=role==="parent"?enfants.filter(e=>e.id===pEId):enfants;
  const enfant=liste.find(e=>e.id===selId)||liste[0]||{};
  const contrat=enfant.contrat||{};
  const [form,setForm]=useState({
    asmatNomH:role==="asmat"?((user?.prenom||"")+" "+(user?.nom||"")).trim():"",asmatTel:role==="asmat"?(user?.tel||""):"",asmatAgrement:role==="asmat"?(user?.agrement||""):"",
    nom:enfant.nom||"",prenom:enfant.prenom||"",naissance:enfant.naissance||"",sexe:"",adresse:"",
    mereNom:"",mereTel:"",mereTravail:"",mereEmail:"",mereEmployeur:"",
    pereNom:"",pereTel:"",pereTravail:"",pereEmail:"",pereEmployeur:"",
    p1Nom:"",p1Lien:"",p1Tel:"",p2Nom:"",p2Lien:"",p2Tel:"",p3Nom:"",p3Lien:"",p3Tel:"",
    medecin:"",medecinTel:"",groupe:"",vaccins:"Oui",pai:"Non",
    allergies:enfant.allergies?.join(", ")||"",traitements:"",particularites:"",
    authUrgences:true,authParacetamol:false,authSorties:true,authVoiture:true,authPhotos:false,
  });
  const set=(k,v)=>setForm(p=>({...p,[k]:v}));
  const ro=role==="asmat"||!editing;

  // CONTACT PARENT TEMPS REEL P15 - lit profiles en direct, jamais fige, critique en cas d'urgence
  const [parentLive,setParentLive]=useState(null);
  useEffect(()=>{
    let cancelled=false;
    (async()=>{
      if(role==="parent"){if(!cancelled)setParentLive(user||null);return;}
      const pid=enfant?.parentId||enfant?.contrat?.parent_id||null;
      if(!pid){if(!cancelled)setParentLive(null);return;}
      try{
        // RLS : profiles est restreint au proprietaire (profiles_own), l'assmat ne peut pas
        // lire le profil du parent en direct. On passe par une RPC SECURITY DEFINER qui
        // n'autorise que l'assmat de CET enfant (ou le parent lui-meme).
        const{data}=await supabase.rpc("get_parent_contact",{p_enfant_id:enfant.id});
        if(!cancelled)setParentLive(data||null);
      }catch(e){console.warn("parent live",e);if(!cancelled)setParentLive(null);}
    })();
    return()=>{cancelled=true;};
  },[enfant?.id,enfant?.parentId,role,user?.id,user?.prenom,user?.nom,user?.telephone,user?.adresse,user?.email]);

  // Detection de divergence : on identifie le bloc du titulaire du compte par son EMAIL
  const normTel=s=>String(s||"").replace(/[\s.\-()]/g,"");
  const normTxt=s=>String(s||"").trim().toLowerCase().replace(/\s+/g," ");
  const nomLive=((parentLive?.prenom||"")+" "+(parentLive?.nom||"")).trim();
  const blocParent=(()=>{
    const em=normTxt(parentLive?.email);
    if(!em)return null;
    if(normTxt(form.mereEmail)===em)return "mere";
    if(normTxt(form.pereEmail)===em)return "pere";
    return null;
  })();
  const ecarts=(()=>{
    if(!blocParent||!parentLive)return [];
    const out=[];
    const fNom=form[blocParent+"Nom"],fTel=form[blocParent+"Tel"];
    if(nomLive&&normTxt(fNom)&&normTxt(fNom)!==normTxt(nomLive))out.push({champ:"Nom",cle:blocParent+"Nom",fiche:fNom,profil:nomLive});
    if(parentLive.telephone&&normTel(fTel)!==normTel(parentLive.telephone))out.push({champ:"Téléphone",cle:blocParent+"Tel",fiche:fTel||"(vide)",profil:parentLive.telephone});
    return out;
  })();
  const majDepuisProfil=()=>{
    if(!blocParent||!parentLive)return;
    setForm(f=>({...f,[blocParent+"Nom"]:nomLive||f[blocParent+"Nom"],[blocParent+"Tel"]:parentLive.telephone||f[blocParent+"Tel"]}));
    setEditing(true);
    setToast("Champs mis à jour — pensez à enregistrer");
  };
  const prefillDepuisProfil=qui=>{
    if(!parentLive)return;
    setForm(f=>({...f,[qui+"Nom"]:nomLive||"",[qui+"Tel"]:parentLive.telephone||"",[qui+"Email"]:parentLive.email||""}));
    setToast("Pré-rempli depuis votre profil");
  };

  // Charger la fiche enregistree (par enfant) + pre-remplir depuis l'enfant
  useEffect(()=>{
    if(!enfant?.id){setLoaded(true);return;}
    let cancelled=false;setLoaded(false);
    const base={nom:enfant.nom||"",prenom:enfant.prenom||"",naissance:enfant.naissance||"",allergies:enfant.allergies?.join(", ")||""};
    (async()=>{
      try{
        const{data}=await supabase.from("fiche_urgence").select("data").eq("enfant_id",enfant.id).maybeSingle();
        if(cancelled)return;
        if(data&&data.data&&Object.keys(data.data).length){setForm(f=>({...f,...base,...data.data}));setHasData(true);setEditing(false);}
        else{setForm(f=>({...f,...base}));setHasData(false);setEditing(role==="parent");}
      }catch(e){console.warn("fiche_urgence load",e);if(!cancelled){setForm(f=>({...f,...base}));setHasData(false);}}
      if(!cancelled)setLoaded(true);
    })();
    return()=>{cancelled=true;};
  },[enfant?.id,role]);
  const sauvegarder=async()=>{
    if(role!=="parent"||!enfant?.id)return;
    setSaving(true);
    const{error}=await supabase.from("fiche_urgence").upsert({enfant_id:enfant.id,data:form,updated_by:user?.id||null,updated_at:new Date().toISOString()});
    setSaving(false);
    if(error){setToast("❌ Erreur : "+error.message);return;}
    setHasData(true);setEditing(false);setToast("✅ Fiche d'urgence enregistrée");
  };

  const genererPDF=()=>{
    const w=window.open("","_blank");
    if(!w){setToast("Autorisez les popups");return;}
    const f=form;
    const authLines=[
      ["Emmener aux urgences",f.authUrgences],["Paracetamol (ordonnance jointe)",f.authParacetamol],
      ["Sorties exterieures",f.authSorties],["Transport en voiture",f.authVoiture],["Photos (usage interne)",f.authPhotos]
    ].map(([l,v])=>"<div style='margin:6px 0;font-size:13px'><span style='color:"+(v?"#5DA9A1":"#C84B31")+";font-weight:700'>"+(v?"[X] Oui  [ ] Non":"[ ] Oui  [X] Non")+"</span>  "+l+"</div>").join("");
    const html=[
      "<!DOCTYPE html><html lang='fr'><head><meta charset='UTF-8'/><title>Fiche urgence - "+H(f.prenom)+"</title>",
      "<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Calibri,sans-serif;max-width:800px;margin:0 auto;padding:30px;color:#2E4859;font-size:13px;line-height:1.8}",
      "h1{font-size:22px;text-align:center;letter-spacing:3px;color:#2E4859;margin-bottom:2px}",
      ".sub{text-align:center;color:#5DA9A1;font-size:14px;margin-bottom:4px}",
      ".note{text-align:center;color:#bbb;font-size:11px;margin-bottom:20px;font-style:italic}",
      ".sh{font-size:14px;font-weight:700;color:#2E4859;letter-spacing:2px;border-bottom:3px solid #5DA9A1;padding-bottom:6px;margin:24px 0 12px;text-transform:uppercase}",
      ".stt{font-weight:700;color:#5DA9A1;font-size:13px;margin:14px 0 6px}",
      ".line{border-bottom:1px solid #d0d0d0;padding:6px 0;margin:4px 0}",
      ".line b{color:#2E4859}",
      ".urg{background:#FEF2F2;padding:8px 14px;margin:4px 0;border-radius:6px}",
      ".urg span{color:#C84B31;font-weight:700;font-size:18px}",
      "@media print{.noprint{display:none}}</style></head><body>",
      "<h1>FICHE D'URGENCE</h1>",
      "<div class='sub'>Assistante maternelle agreee</div>",
      "<div class='note'>A remettre des le debut de l'accueil | A mettre a jour chaque annee</div>",
      "<div class='line'><b>Assistante maternelle :</b> "+H(f.asmatNomH)+"</div>",
      "<div class='line'><b>Telephone :</b> "+H(f.asmatTel)+"</div>",
      "<div class='line'><b>N. d'agrement :</b> "+H(f.asmatAgrement)+"</div>",
      "<div class='sh'>01  Identite de l'enfant</div>",
      "<div class='line'><b>Nom :</b> "+H(f.nom)+"</div>",
      "<div class='line'><b>Prenom :</b> "+H(f.prenom)+"</div>",
      "<div class='line'><b>Date de naissance :</b> "+f.naissance+"</div>",
      "<div class='line'><b>Sexe :</b> "+f.sexe+"</div>",
      "<div class='line'><b>Adresse :</b> "+H(f.adresse)+"</div>",
      "<div class='sh'>02  Coordonnees des parents</div>",
      (parentLive?("<div class='urg' style='background:#EFF7F6'><b>Contact parent (compte TiMat, a jour le "+new Date().toLocaleDateString("fr-FR")+")</b><br/>"
        +(nomLive||"-")+((parentLive.telephone)?" &mdash; <span style='color:#2C6F68'>"+H(parentLive.telephone)+"</span>":"")
        +(parentLive.email?"<br/>"+parentLive.email:"")
        +(parentLive.adresse?"<br/>"+String(parentLive.adresse).replace(/\n/g,", "):"")
        +"</div>"):""),
      "<div class='stt'>Mere</div>",
      "<div class='line'><b>Nom et prenom :</b> "+H(f.mereNom)+"</div>",
      "<div class='line'><b>Telephone :</b> "+H(f.mereTel)+"</div>",
      "<div class='line'><b>Email :</b> "+H(f.mereEmail)+"</div>",
      "<div class='line'><b>Employeur :</b> "+H(f.mereEmployeur)+"</div>",
      "<div class='stt'>Pere</div>",
      "<div class='line'><b>Nom et prenom :</b> "+H(f.pereNom)+"</div>",
      "<div class='line'><b>Telephone :</b> "+H(f.pereTel)+"</div>",
      "<div class='line'><b>Email :</b> "+H(f.pereEmail)+"</div>",
      "<div class='line'><b>Employeur :</b> "+H(f.pereEmployeur)+"</div>",
      "<div class='sh'>03  Personnes autorisees</div>",
      ...[1,2,3].map(n=>"<div class='stt'>Personne "+n+"</div><div class='line'><b>Nom :</b> "+f["p"+n+"Nom"]+"</div><div class='line'><b>Lien :</b> "+f["p"+n+"Lien"]+"</div><div class='line'><b>Tel :</b> "+f["p"+n+"Tel"]+"</div>"),
      "<div class='sh'>04  Informations medicales</div>",
      "<div class='line'><b>Medecin :</b> "+H(f.medecin)+"</div>",
      "<div class='line'><b>Tel medecin :</b> "+H(f.medecinTel)+"</div>",
      "<div class='line'><b>Groupe sanguin :</b> "+H(f.groupe)+"</div>",
      "<div class='line'><b>Vaccins a jour :</b> "+H(f.vaccins)+"</div>",
      "<div class='line'><b>PAI :</b> "+H(f.pai)+"</div>",
      "<div class='line'><b>Allergies :</b> "+H(f.allergies)+"</div>",
      "<div class='line'><b>Traitements :</b> "+H(f.traitements)+"</div>",
      "<div class='line'><b>Particularites :</b> "+H(f.particularites)+"</div>",
      "<div class='sh'>05  Numeros d'urgence</div>",
      "<div class='urg'>SAMU : <span>15</span></div>",
      "<div class='urg'>Police / Gendarmerie : <span>17</span></div>",
      "<div class='urg'>Pompiers : <span>18</span></div>",
      "<div class='urg'>Urgences europeennes : <span>112</span></div>",
      "<div class='urg'>Centre anti-poison : <span>01 40 05 48 48</span></div>",
      "<div class='urg'>Enfance en danger : <span>119</span></div>",
      "<div class='urg'>Violences femmes info : <span>3919</span></div>",
      // Le referentiel d'agrement impose d'afficher les coordonnees des secours,
      // des parents ET du service departemental de PMI. Les deux premiers sont
      // au-dessus ; la PMI manquait, et sans elle l'affichage reste incomplet.
      // Elle se remplit a la main : elle depend du secteur, pas de l'enfant.
      "<div class='stt'>Service de PMI du secteur</div>",
      "<div class='line'><b>Nom / antenne :</b> ______________________________</div>",
      "<div class='line'><b>Telephone :</b> ______________________________</div>",
      "<div class='sh'>06  Autorisations parentales</div>",
      authLines,
      "<div class='sh'>07  Signatures</div>",
      "<p style='margin-bottom:16px'>Je soussigne(e), certifie l'exactitude des renseignements ci-dessus.</p>",
      "<div class='line'><b>Fait a :</b></div><div class='line'><b>Le :</b></div>",
      "<div style='display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:20px'>",
      "<div><div style='font-weight:700;margin-bottom:60px'>Signature parent :</div></div>",
      "<div><div style='font-weight:700;margin-bottom:60px'>Signature assmat :</div></div></div>",
      "<p style='color:#6B7A82;font-size:11px;line-height:1.6;margin-top:18px;border-top:1px solid #E4DCD0;padding-top:10px'>Affichez cette fiche a un endroit permanent, visible et facilement accessible : le referentiel d'agrement l'exige pour les coordonnees des services de secours, des parents et du service departemental de protection maternelle et infantile (annexe 4-8 du code de l'action sociale et des familles, section 2, sous-section 2, 2°).</p>",
      "<p style='text-align:center;color:#ccc;font-size:11px;margin-top:14px'>Genere par TiMat - timat.app</p>",
      "<div class='noprint' style='text-align:center;margin-top:16px'><button onclick='window.print()' style='background:#5DA9A1;color:#fff;border:none;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer'>Imprimer / PDF</button></div>",
      "</body></html>"
    ].join("");
    w.document.write(html);w.document.close();
    setToast("Fiche generee ✓");
  };

  // (Parent edite la fiche ; assmat en lecture seule -> rendu unifie ci-dessous)

  const inp=(label,key,ph)=><div style={{marginBottom:10}}>
    <label style={{fontSize:11,fontWeight:600,color:"var(--l)",display:"block",marginBottom:3}}>{label}</label>
    <input className="inp"disabled={ro}value={form[key]}onChange={e=>set(key,e.target.value)}placeholder={ph||""}/>
  </div>;
  const ta=(label,key,ph)=><div style={{marginBottom:10}}>
    <label style={{fontSize:11,fontWeight:600,color:"var(--l)",display:"block",marginBottom:3}}>{label}</label>
    <textarea className="ta"disabled={ro}value={form[key]}onChange={e=>set(key,e.target.value)}placeholder={ph||""}style={{width:"100%",minHeight:60,resize:"vertical"}}/>
  </div>;
  const chk=(label,key)=><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,cursor:ro?"default":"pointer"}}onClick={()=>{if(!ro)set(key,!form[key]);}}>
    <div style={{width:20,height:20,borderRadius:6,border:"2px solid "+(form[key]?"var(--S)":"var(--br)"),background:form[key]?"var(--S)":"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:"#fff",transition:"all .15s"}}>{form[key]?"✓":""}</div>
    <span style={{fontSize:12,color:"var(--b)"}}>{label}</span>
  </div>;

  return <div className="fi">
    {toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
    <PageHeader icon="🚨" title="Fiche d'urgence" sub={role==="parent"?(editing?"Remplissez la fiche d'urgence de votre enfant":"Fiche enregistrée · Modifier pour mettre à jour"):"Remplie par le parent — vous êtes en lecture seule"}/>
    {role==="asmat"&&liste.length>1&&<div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
      {liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>setSelId(e.id)}/>)}</div>}

    {/* Beaucoup d'assmats ignorent que l'affichage est exige : la fiche parait
        un confort alors qu'elle repond a une obligation du referentiel. Le
        rappel est court, il cite le texte, et il ne dit jamais que la fiche
        elle-meme serait imposee — c'est l'affichage qui l'est. */}
    {role==="asmat"&&<div style={{background:"var(--Tp,#FDF1EC)",border:"1.5px solid var(--T)",borderRadius:14,padding:14,marginBottom:12}}>
      <div style={{fontWeight:700,fontSize:12.5,color:"var(--b)",marginBottom:6}}>📌 À afficher, pas seulement à ranger</div>
      <div style={{fontSize:11.5,color:"var(--m)",lineHeight:1.6}}>
        Le référentiel d'agrément impose « l'affichage permanent, visible et facilement accessible des coordonnées
        des services de secours, des parents et des services départementaux de protection maternelle et infantile »
        (annexe 4-8 du code de l'action sociale et des familles). Aucun format n'est imposé : imprimez cette fiche,
        complétez la ligne PMI, et affichez-la.
      </div>
    </div>}

    {/* CONTACT PARENT TEMPS REEL P15 */}
    {parentLive&&<div style={{background:"var(--Gp)",border:"1.5px solid var(--G)",borderRadius:14,padding:16,marginBottom:12}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,marginBottom:4}}>
        <div style={{fontWeight:700,fontSize:13,color:"var(--G)"}}>📞 Contact parent — compte TiMat</div>
        <div style={{background:"var(--G)",color:"#fff",fontSize:11,fontWeight:700,padding:"3px 8px",borderRadius:20,whiteSpace:"nowrap"}}><IconeOuEmoji e="🔄"/> TEMPS RÉEL</div>
      </div>
      <div style={{fontSize:11.5,color:"var(--G)",opacity:.85,marginBottom:12,lineHeight:1.5}}>
        Synchronisé automatiquement avec le profil du parent. Ne peut pas être obsolète.
      </div>
      {[
        ["Parent",nomLive||"—",false],
        ["Téléphone",parentLive.telephone||"Non renseigné",true],
        ["Email",parentLive.email||"—",false],
        ["Adresse",parentLive.adresse||"Non renseignée",false],
        ["2e parent",((parentLive.parent2_prenom||"")+" "+(parentLive.parent2_nom||"")).trim(),false],
      ].filter(([,v])=>v&&v!=="—").map(([k,v,big])=>
        <div key={k}style={{display:"flex",justifyContent:"space-between",gap:10,padding:"7px 0",borderBottom:"1px solid rgba(93,169,161,.25)",fontSize:12.5}}>
          <span style={{color:"var(--G)",flexShrink:0}}>{k}</span>
          <span style={{fontWeight:big?800:700,color:"var(--b)",textAlign:"right",fontSize:big?17:12.5,letterSpacing:big?".5px":0,whiteSpace:"pre-line"}}>{v}</span>
        </div>)}
    </div>}

    {/* ALERTE DIVERGENCE EN HAUT P15 - visible sans avoir a faire defiler */}
    {ecarts.length>0&&<AlerteEcart ecarts={ecarts}role={role}onMaj={majDepuisProfil}/>}

    {role==="asmat"&&loaded&&!hasData
      ? <div className="card"style={{textAlign:"center"}}>
          <div style={{fontSize:48,marginBottom:16}}>🚨</div>
          <div style={{fontSize:16,fontWeight:700,color:"var(--b)",marginBottom:8}}>Fiche pas encore remplie</div>
          <div style={{fontSize:13,color:"var(--m)",lineHeight:1.7,marginBottom:16}}>Le parent de {enfant.prenom||"cet enfant"} n'a pas encore rempli la fiche d'urgence dans TiMat.</div>
          <div style={{padding:14,background:"var(--Bp)",borderRadius:12,fontSize:12,color:"var(--B)",lineHeight:1.7}}><IconeOuEmoji e="💡"/> Vous la consulterez ici dès qu'il l'aura enregistrée.</div>
        </div>
      : <div className="g2">
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div className="card">
          <div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:12}}><IconeOuEmoji e="👶"/> Enfant</div>
          {inp("Nom","nom")}{inp("Prenom","prenom")}{inp("Date de naissance","naissance","JJ/MM/AAAA")}{inp("Sexe","sexe","F / M")}{inp("Adresse","adresse")}
        </div>
        <div className="card">
          <div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:12}}><IconeOuEmoji e="👪"/> Mere</div>
          {role==="parent"&&!hasData&&parentLive&&<div style={{background:"var(--Tp)",border:"1px dashed var(--Tl)",borderRadius:10,padding:"11px 12px",marginBottom:11,fontSize:11.5,color:"var(--m)",lineHeight:1.5}}>
            💡 Pré-remplir avec les infos de votre profil TiMat ? Indiquez simplement qui vous êtes.
            <div style={{display:"flex",gap:8,marginTop:9}}>
              <button className="btn s"style={{flex:1,background:"var(--w)",border:"1px solid var(--Tl)",color:"var(--m)",justifyContent:"center"}}onClick={()=>prefillDepuisProfil("mere")}>Je suis la mère</button>
              <button className="btn s"style={{flex:1,background:"var(--w)",border:"1px solid var(--Tl)",color:"var(--m)",justifyContent:"center"}}onClick={()=>prefillDepuisProfil("pere")}>Je suis le père</button>
            </div>
          </div>}
          {blocParent==="mere"&&ecarts.length>0&&<AlerteEcart ecarts={ecarts}role={role}onMaj={majDepuisProfil}/>}
          {inp("Nom et prenom","mereNom")}{inp("Telephone","mereTel")}{inp("Email","mereEmail")}{inp("Employeur","mereEmployeur")}
        </div>
        <div className="card">
          <div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:12}}><IconeOuEmoji e="👪"/> Pere</div>
          {blocParent==="pere"&&ecarts.length>0&&<AlerteEcart ecarts={ecarts}role={role}onMaj={majDepuisProfil}/>}
          {inp("Nom et prenom","pereNom")}{inp("Telephone","pereTel")}{inp("Email","pereEmail")}{inp("Employeur","pereEmployeur")}
        </div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div className="card">
          <div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:12}}>🔑 Personnes autorisees</div>
          {[1,2,3].map(n=><div key={n}style={{marginBottom:10,padding:10,background:"var(--c)",borderRadius:8}}>
            <div style={{fontSize:11,fontWeight:700,color:"var(--l)",marginBottom:6}}>Personne {n}</div>
            {inp("Nom","p"+n+"Nom")}{inp("Lien","p"+n+"Lien","Grand-parent, oncle...")}{inp("Tel","p"+n+"Tel")}
          </div>)}
        </div>
        <div className="card">
          <div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:12}}>🩺 Medical</div>
          {inp("Medecin traitant","medecin")}{inp("Tel medecin","medecinTel")}{inp("Groupe sanguin","groupe")}{inp("Vaccins a jour","vaccins","Oui / Non")}{inp("PAI","pai","Oui / Non")}
          {ta("Allergies","allergies","Aucune connue")}{ta("Traitements","traitements","Aucun")}{ta("Particularites","particularites")}
        </div>
        <div className="card">
          <div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:12}}><IconeOuEmoji e="✅"/> Autorisations</div>
          {chk("Emmener aux urgences","authUrgences")}
          {chk("Paracetamol (ordonnance jointe)","authParacetamol")}
          {chk("Sorties exterieures","authSorties")}
          {chk("Transport en voiture","authVoiture")}
          {chk("Photos (usage interne)","authPhotos")}
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {role==="parent"&&(editing
            ? <button className="btn bS"disabled={saving}style={{width:"100%",padding:"14px"}}onClick={sauvegarder}>{saving?"⏳ Enregistrement...":"💾 Sauvegarder"}</button>
            : <button className="btn bG"style={{width:"100%",padding:"14px"}}onClick={()=>setEditing(true)}>✏️ Modifier</button>)}
          <button className="btn bT"style={{width:"100%",padding:"14px"}}onClick={genererPDF}><IconeOuEmoji e="📥"/> Télécharger la fiche PDF</button>
        </div>
      </div>
    </div>}
  </div>;
}

// ========== PROJET D'ACCUEIL (dans l'app) ==========
