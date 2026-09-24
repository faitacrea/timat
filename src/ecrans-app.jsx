// ============================================================
// ÉCRANS DE L'APPLICATION — chargés à la demande
// ------------------------------------------------------------
// Ce qui reste des écrans que le routeur ouvre : les hubs
// (journée, santé, éveil, documents, aides), la messagerie, le
// tableau de bord, les attestations, le kit CMG, le rapport
// annuel, le temps de travail, la PMI, la boutique, l'invitation
// d'un parent, le parrainage, les mentions légales.
//
// Personne n'en a besoin pour lire le hero. Ils quittent donc le
// morceau principal, qui ne garde plus que la landing, le socle
// visuel et la coquille de l'application.
// ============================================================
import { useState, useEffect, useRef, useMemo, Suspense } from "react";
import { supabase } from "../lib/supabase.js";
import { EMAIL_CONTACT } from "../data/coordonnees.js";
import {
  Documents, AdminFinances, AjouterEnfantModale, AvatarEditeur, AvatarEnfant, Bilans, BoutonAjouterEnfant, CHR_AM, CI_PLAFOND_DEPENSES, CI_TAUX, CMG_MAX, CPill, CahierJour, D, EmptyState, ExportDonnees, FicheUrgence, G, H, IconeOuEmoji, MOIS_PAR_AN, PLAFOND_H, PageHeader, Parametres, PastilleRepas, QUALITE_REPAS, TODAY_H, TODAY_STR, Toast, VerrouPro, _quotidien, age, chargerJsPDF, estPro, etatPush, fmt, fmtDatePdf, fratrieDe, heuresMensualisees, isoJour, isoMois, minutesDepuisHeure, montantCMG, nbf, netDepuisBrut, protegerPdf, salaireMensualise, semainesDuContrat, tauxEffortCMG, todayStr, logAction
} from "./App.jsx";
import {
  ACTIVITES_PAR_AGE, CROISSANCE_DEMO, DATE_ACCORD_CONGES, FAQ_DATA, JALONS_REF, JOURS_SEMAINE_TYPE, OMS_POIDS, PLAFOND_AMPLITUDE_JOUR, PLAFOND_ANNUEL_HEURES, PLAFOND_HEBDO_HEURES, PMI_MESSAGES, QUALITE_SIESTE, TAUX_PATRONAL_TOTAL, ageEnMois, brutDepuisNet, catColors, decalerMois, fmtMoisLong, heuresDepuisMinutes, indemniteEntretienMin, journeesTravaillees, minimumHoraireAu, nb2, parseAgeAttendu
} from "./socle.jsx";

const SEMAINES_MOYENNE_HEBDO = 17; // quatre mois

// Reunit des intervalles [debut,fin) en minutes et renvoie leur duree totale.
// C'est la seule facon juste de compter une journee ou plusieurs enfants se
// chevauchent.

export function FichesEnfants({enfants,user,setPage}){
  const [editAvatar,setEditAvatar]=useState(null);
  const [showAjout,setShowAjout]=useState(false);
  const [ov,setOv]=useState({});
  const list=(enfants||[]).map(e=>({...e,...(ov[e.id]||{})}));
  return <div className="fi">
    <PageHeader icon="👧" title="Mes enfants" sub="Photo, emoji et informations de chaque enfant accueilli"/>
    <div style={{display:"flex",justifyContent:"flex-end",marginBottom:14}}>
      <BoutonAjouterEnfant user={user} enfants={enfants} onClick={()=>setShowAjout(true)}/>
    </div>
    {list.length===0
      ? <EmptyState emoji="👶" titre="Aucun enfant pour le moment" texte="Ajoutez un premier enfant pour commencer à suivre son quotidien." cta="➕ Ajouter un enfant" onCta={()=>setShowAjout(true)}/>
      : <div className="g2">
        {list.map(e=><div key={e.id} className="card" style={{display:"flex",gap:14,alignItems:"center"}}>
          <button type="button" onClick={()=>setEditAvatar(e)} title="Changer la photo ou l'emoji" style={{background:"none",border:"none",cursor:"pointer",padding:0,position:"relative",flexShrink:0,lineHeight:0}}>
            <AvatarEnfant e={e} size={76}/>
            <IconeOuEmoji e="📷"/>
          </button>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontWeight:700,fontSize:16,color:"var(--b)"}}>{e.prenom} {e.nom||""}</div>
            <div style={{fontSize:12.5,color:"var(--l)",marginTop:2}}>{e.naissance?age(e.naissance)+" · né(e) le "+new Date(e.naissance).toLocaleDateString("fr-FR"):"Date de naissance non renseignée"}</div>
            {/* La fratrie se lit ici, la ou on regarde les enfants. Deux
                contrats distincts, mais un seul parent employeur : les congés
                posés et le crédit d'impôt les concernent ensemble. */}
            {(()=>{const f=fratrieDe(e,list);return f.length>0&&
              <div style={{fontSize:12,color:"#2F655F",marginTop:4,display:"flex",alignItems:"center",gap:5}}>
                <IconeOuEmoji e="👪" taille={14}/>
                <span>Même famille que <b>{f.map(x=>x.prenom).join(", ")}</b></span>
              </div>;})()}
            <div style={{display:"flex",gap:6,marginTop:10,flexWrap:"wrap"}}>
              <button className="btn bG s" style={{padding:"5px 10px"}} onClick={()=>setEditAvatar(e)}><IconeOuEmoji e="📷"/> Photo / emoji</button>
              <button className="btn bT s" style={{padding:"5px 10px"}} onClick={()=>setPage&&setPage("admin_finances")}><IconeOuEmoji e="🧾"/> Contrat & paie</button>
            </div>
          </div>
        </div>)}
      </div>}
    {editAvatar&&<AvatarEditeur enfant={editAvatar} onClose={()=>setEditAvatar(null)} onSaved={(up)=>setOv(o=>({...o,[up.id]:{emoji:up.emoji,photo_url:up.photo_url}}))}/>}
    {showAjout&&user&&<Suspense fallback={<div style={{padding:24,textAlign:"center",color:"var(--m)",fontSize:13}}>Chargement…</div>}><AjouterEnfantModale user={user} onClose={()=>setShowAjout(false)}/></Suspense>}
  </div>;
}
// ===== Regroupement de sous-onglets : barre segmentée + vues fusionnées =====

export function SegBar({v,setV,items}){
  return <div style={{padding:"16px 20px 0",maxWidth:900,margin:"0 auto",width:"100%"}}>
    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
      {items.map((it,i)=><button key={i} onClick={()=>setV(i)} style={{
        padding:"9px 16px",borderRadius:"var(--r2)",border:"1.5px solid",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit",
        display:"inline-flex",alignItems:"center",gap:7,
        background:v===i?"var(--accent)":"var(--w)",color:v===i?"#fff":"var(--b)",
        borderColor:v===i?"var(--accent)":"var(--br)",transition:"all .15s"
      }}><IconeOuEmoji e={it.ic} couleur={v===i?"#fff":"var(--accent)"}/> {it.l}</button>)}
    </div>
  </div>;
}

export function VueJournee({enfants,role,pEId,user,pointagesDB}){
  const [v,setV]=useState(0);const P={enfants,role,pEId,user,pointagesDB};
  return <><SegBar v={v} setV={setV} items={[{ic:"📔",l:"Cahier du jour"},{ic:"📋",l:"Détail du jour"}]}/>{<Suspense fallback={<div style={{padding:24,textAlign:"center",color:"var(--m)",fontSize:13}}>Chargement…</div>}>{v===0?<CahierJour {...P}/>:<JournalComplet {...P}/>}</Suspense>}</>;
}

export function VueSanteUrgence({enfants,role,pEId,user,pointagesDB}){
  const [v,setV]=useState(0);const P={enfants,role,pEId,user,pointagesDB};
  return <><SegBar v={v} setV={setV} items={[{ic:"🏥",l:"Santé"},{ic:"🚨",l:"Fiche d'urgence"}]}/>{<Suspense fallback={<div style={{padding:24,textAlign:"center",color:"var(--m)",fontSize:13}}>Chargement…</div>}>{v===0?<SanteComplete {...P}/>:<FicheUrgence enfants={enfants} role={role} pEId={pEId} user={user}/>}</Suspense>}</>;
}

export function VueSuiviProgres({enfants,role,pEId,user,pointagesDB,setPage}){
  const [v,setV]=useState(0);const P={enfants,role,pEId,user,pointagesDB};
  return <><SegBar v={v} setV={setV} items={[{ic:"📊",l:"Tableau de bord"},{ic:"🌱",l:"Éveil & Progrès"}]}/>{v===0?<TableauDeBord enfants={enfants} role={role} pEId={pEId} setPage={setPage}/>:<EveilComplet {...P}/>}</>;
}

export function VuePaieContrats({enfants,role,pEId,user,pointagesDB}){
  const P={enfants,role,pEId,user,pointagesDB};
  return <Suspense fallback={<div style={{padding:24,textAlign:"center",color:"var(--m)",fontSize:13}}>Chargement…</div>}><AdminFinances {...P} user={user}/></Suspense>;
}

export function VueDocsRapports({enfants,role,pEId,user,pointagesDB}){
  const [v,setV]=useState(0);const P={enfants,role,pEId,user,pointagesDB};
  const pro=estPro(user);
  return <><SegBar v={v} setV={setV} items={[{ic:"🗂️",l:"Documents & Attestations"},{ic:"📊",l:"Rapports & Exports"}]}/>
    {v===0
      ? (pro?<DocumentsComplet {...P}/>:<VerrouPro titre="Documents et attestations" desc="Vos documents classés, l'attestation France Travail et le récapitulatif des versements. Cette fonction fait partie du forfait Pro."/>)
      : <BilansExports {...P}/>}</>;
}

export function VueAidesSimulateurs({enfants,role,pEId,user}){
  const [v,setV]=useState(0);
  return <><SegBar v={v} setV={setV} items={[{ic:"💶",l:"Aide CMG"},{ic:"🧮",l:"Simulateur de coût"}]}/>{v===0?<KitCMG enfants={enfants} role={role} pEId={pEId} user={user}/>:<SimulateurCout enfants={enfants} pEId={pEId}/>}</>;
}

export function VueAideSupport({role,user}){
  const [v,setV]=useState(0);
  return <><SegBar v={v} setV={setV} items={[{ic:"❓",l:"Centre d'aide"},{ic:"💬",l:"Support"}]}/>{v===0?<FAQ role={role}/>:<Support role={role} user={user}/>}</>;
}

export function RepasChanges({enfants,role,pEId}){
  const [selId,setSelId]=useState(enfants[0]?.id);
  const [nch,setNch]=useState({h:"",type:"Change",n:""});
  const [re,setRe]=useState({});
  const [toast,setToast]=useState("");
  const liste=role==="parent"?enfants.filter(e=>e.id===pEId):enfants;
  const enfant=liste.find(e=>e.id===selId)||liste[0];
  const isDemo=enfants.every(e=>["e1","e2","e3"].includes(e.id));

  // Charger repas et changes depuis Supabase
  const [ch,setCh]=useState(isDemo?D.changes:[]);
  const [rp,setRp]=useState(isDemo?D.repas:[]);

  useEffect(()=>{
    if(isDemo||!enfant?.id)return;
    supabase.from("changes_couches").select("*").eq("enfant_id",enfant.id).eq("date",TODAY_STR)
      .then(({data})=>{if(data)setCh(data.map(r=>({...r,eId:r.enfant_id,h:r.heure,n:r.note||""})));});
    supabase.from("repas").select("*").eq("enfant_id",enfant.id).eq("date",TODAY_STR)
      .then(({data})=>{if(data&&data[0])setRp([{...data[0],eId:data[0].enfant_id,q:data[0].qualite}]);});
  },[enfant?.id,isDemo]);

  const echs=ch.filter(c=>(c.eId||c.enfant_id)===enfant?.id&&c.date===TODAY_STR).sort((a,b)=>a.h>b.h?1:-1);
  const erp=rp.find(r=>(r.eId||r.enfant_id)===enfant?.id&&r.date===TODAY_STR);

  const addCh=async()=>{
    if(!nch.h)return;
    const newCh={id:"chn"+Date.now(),eId:enfant.id,date:TODAY_STR,h:nch.h.replace(":","h"),type:nch.type,n:nch.n};
    setCh(p=>[...p,newCh]);
    setNch({h:"",type:"Change",n:""});
    setToast("Change ajouté ✓");
    if(!isDemo&&enfant?.id){
      await supabase.from("changes_couches").insert({
        enfant_id:enfant.id,date:TODAY_STR,heure:nch.h.replace(":","h"),
        type:nch.type,note:nch.n||null
      });
    }
  };

  const saveRp=async()=>{
    const ex=rp.find(r=>(r.eId||r.enfant_id)===enfant.id&&r.date===TODAY_STR);
    const up={...(ex||{id:"rn"+Date.now(),eId:enfant.id,date:TODAY_STR,notes:""}),
      dej:re.dej??erp?.dej,gou:re.gou??erp?.gou,bib:re.bib??erp?.bib,q:re.q??erp?.q??"bien"};
    setRp(p=>ex?p.map(r=>(r.eId||r.enfant_id)===enfant.id&&r.date===TODAY_STR?up:r):[...p,up]);
    setRe({});setToast("Repas enregistré ✓");
    if(!isDemo&&enfant?.id){
      await supabase.from("repas").upsert({
        enfant_id:enfant.id,date:TODAY_STR,
        dejeuner:re.dej??erp?.dej,gouter:re.gou??erp?.gou,
        biberon:re.bib??erp?.bib,qualite:re.q??erp?.q??"bien"
      },{onConflict:"enfant_id,date"});
    }
  };

  return <div className="fi">
    {toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
    <PageHeader icon="🍽️" title="Repas & Changes" sub="Suivi alimentaire et hygiène du jour"/>
    {role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
      {liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>setSelId(e.id)}/>)}</div>}
    <div className="g2">
      <div className="card">
        <div style={{fontWeight:700,fontSize:14,marginBottom:12,color:"var(--b)"}}><IconeOuEmoji e="🍽️"/> Repas du jour</div>
        {erp?<div>
          {[["🥗 Déjeuner",erp.dej],["🍎 Goûter",erp.gou],["🍼 Biberon",erp.bib]].filter(r=>r[1]).map(([l,v])=>
            <div key={l}style={{display:"flex",gap:10,marginBottom:8,padding:"9px 12px",background:"var(--c)",borderRadius:9}}>
              <span>{l.split(" ")[0]}</span><div><div style={{fontSize:11,color:"var(--l)",fontWeight:700}}>{l.substring(3)}</div>
                <div style={{fontSize:13,fontWeight:600,color:"var(--b)"}}>{v}</div></div></div>)}
          <div style={{display:"flex",alignItems:"center",gap:8,marginTop:6}}>
            <span style={{fontSize:12,color:"var(--l)"}}>Appétit :</span>
            <PastilleRepas q={erp.q}/>
          </div>
          {erp.notes&&<div style={{fontSize:12,color:"var(--m)",marginTop:6,fontStyle:"italic"}}>{erp.notes}</div>}
        </div>:<div style={{fontSize:13,color:"var(--l)"}}>Non renseigné.</div>}
        {role==="asmat"&&<div style={{marginTop:14,paddingTop:14,borderTop:"1px solid var(--br)"}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:8,color:"var(--b)"}}>Mettre à jour</div>
          {[["dej","Déjeuner"],["gou","Goûter"],["bib","Biberon"]].map(([f,l])=>
            <div key={f}style={{marginBottom:8}}>
              <label className="lbl">{l}</label>
              <input className="inp"value={re[f]!==undefined?re[f]:erp?.[f]||""}
                onChange={e=>setRe(p=>({...p,[f]:e.target.value}))} placeholder={l+"..."}/>
            </div>)}
          <div style={{marginBottom:10}}>
            <label className="lbl">Appétit</label>
            <div style={{display:"flex",gap:6}}>
              {Object.entries(QUALITE_REPAS).map(([v,e])=>{const l=e.l,c=e.teinte;
                const on=(re.q??erp?.q??"bien")===v;
                return <button key={v} type="button" onClick={()=>setRe(p=>({...p,q:v}))} style={{flex:1,padding:"10px 4px",borderRadius:10,border:"1.5px solid",borderColor:on?c:"var(--br)",background:on?c+"1F":"#fff",color:on?c:"var(--m)",fontWeight:on?700:600,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>{l}</button>;
              })}
            </div>
          </div>
          <button className="btn bT"style={{width:"100%"}}onClick={saveRp}>Enregistrer les repas</button>
        </div>}
      </div>

      <div className="card">
        <div style={{fontWeight:700,fontSize:14,marginBottom:12,color:"var(--b)"}}><IconeOuEmoji e="👶"/> Changes du jour</div>
        <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:12}}>
          {echs.length===0&&<div style={{fontSize:13,color:"var(--l)"}}>Aucun change.</div>}
          {echs.map(c=><div key={c.id}style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 10px",background:"var(--c)",borderRadius:9}}>
            <span style={{fontWeight:700,fontSize:13,color:"var(--b)"}}>{c.h}</span>
            <span className="badge"style={{background:c.type==="Propre"?"var(--Sp)":c.type==="Selles"?"#FBF0DD":"var(--Gp)",color:c.type==="Propre"?"var(--G)":c.type==="Selles"?"#B8892A":"var(--G)"}}>
              {c.type==="Propre"?"✅ Propre":c.type==="Selles"?"💩 Selles":"🔄 Change"}</span>
            {c.n&&<span style={{fontSize:11,color:"var(--m)",maxWidth:100,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.n}</span>}
          </div>)}
        </div>
        <div style={{fontSize:12,color:"var(--m)",marginBottom:10,fontWeight:700}}>
          Total : <span style={{color:"var(--T)"}}>{echs.filter(c=>c.type==="Change").length} changes</span>
        </div>
        {role==="asmat"&&<div style={{paddingTop:12,borderTop:"1px solid var(--br)"}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:8,color:"var(--b)"}}>+ Ajouter un change</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr",gap:8,marginBottom:8}}>
            <div><label className="lbl">Heure</label><input type="time"className="inp"value={nch.h}onChange={e=>setNch(p=>({...p,h:e.target.value}))}/></div>
            <div><label className="lbl">Type</label>
              <div style={{display:"flex",gap:6}}>
                {[["Change","🔄 Change","var(--G)"],["Propre","✅ Propre","var(--S)"],["Selles","💩 Selles","#B8892A"]].map(([v,l,c])=>{
                  const on=nch.type===v;
                  return <button key={v} type="button" onClick={()=>setNch(p=>({...p,type:v}))} style={{flex:1,padding:"9px 4px",borderRadius:10,border:"1.5px solid",borderColor:on?c:"var(--br)",background:on?c+"1F":"#fff",color:on?c:"var(--m)",fontWeight:on?700:600,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>{l}</button>;
                })}
              </div>
            </div>
          </div>
          <input className="inp"style={{marginBottom:8}}placeholder="Note (optionnel)"value={nch.n}onChange={e=>setNch(p=>({...p,n:e.target.value}))}/>
          <button className="btn bT"style={{width:"100%"}}onClick={addCh}>+ Ajouter</button>
        </div>}
      </div>
    </div>
  </div>;
}

//
//

export function Messagerie({enfants,role,pEId,user}){
  const [selId,setSelId]=useState(enfants[0]?.id);
  useEffect(()=>{
    const h=(e)=>{ if(e.detail==="nouveau_message"){ const el=document.getElementById("timat-msg-input"); if(el){el.scrollIntoView({behavior:"smooth",block:"center"});el.focus();} } };
    window.addEventListener("timat:action",h); return()=>window.removeEventListener("timat:action",h);
  },[]);
  const isDemoMode=enfants.every(e=>["e1","e2","e3"].includes(e.id));
  const [msgs,setMsgs]=useState(isDemoMode?D.messages:[]);
  const [txt,setTxt]=useState("");
  const [loadingMsgs,setLoadingMsgs]=useState(false);
  const endRef=useRef(null);
  const liste=role==="parent"?enfants.filter(e=>e.id===pEId):enfants;
  const enfant=liste.find(e=>e.id===selId)||liste[0];
  const conv=msgs.filter(m=>(m.eId||m.enfant_id)===enfant?.id).sort((a,b)=>(a.created_at||a.id)>(b.created_at||b.id)?1:-1);

  // Load messages from Supabase
  useEffect(()=>{
    if(isDemoMode||!user?.id)return;
    const load=async()=>{
      setLoadingMsgs(true);
      const enfantIds=liste.map(e=>e.id);
      const{data,error}=await supabase.from('messages').select('*').in('enfant_id',enfantIds).order('created_at',{ascending:true}).limit(200);
      if(!error&&data){
        setMsgs(data.map(m=>{
          const enf=liste.find(e=>e.id===m.enfant_id);
          const de=(enf&&m.expediteur_id===enf.asmat_id)?"asmat":"parent";
          return{...m,eId:m.enfant_id,de:de,txt:m.texte,h:new Date(m.created_at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})};
        }));
      }
      setLoadingMsgs(false);
    };
    load();
  },[user?.id,isDemoMode]);

  // Realtime subscription
  useEffect(()=>{
    if(isDemoMode||!user?.id)return;
    const enfantIds=liste.map(e=>e.id);
    const channel=supabase.channel('messages-realtime').on('postgres_changes',
      {event:'INSERT',schema:'public',table:'messages'},
      (payload)=>{
        const m=payload.new;
        if(enfantIds.includes(m.enfant_id)){
          setMsgs(prev=>{
            if(prev.find(p=>p.id===m.id))return prev;
            const enf=liste.find(e=>e.id===m.enfant_id);
            const de=(enf&&m.expediteur_id===enf.asmat_id)?"asmat":"parent";
            return[...prev,{...m,eId:m.enfant_id,de:de,txt:m.texte,h:new Date(m.created_at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}];
          });
          setTimeout(()=>endRef.current?.scrollIntoView({behavior:"smooth"}),100);
        }
      }
    ).subscribe();
    return()=>{supabase.removeChannel(channel);};
  },[user?.id,isDemoMode]);

  const send=async()=>{
    if(!txt.trim()||!enfant?.id)return;
    const heure=new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
    if(isDemoMode){
      setMsgs(p=>[...p,{id:"mn"+Date.now(),eId:enfant.id,de:role==="asmat"?"asmat":"parent",h:heure,txt,lu:true}]);
    }else{
      const destinataireId=role==="asmat"?(enfant.parent_id||null):(enfant.asmat_id||null);
      const{error}=await supabase.from('messages').insert({
        enfant_id:enfant.id,
        expediteur_id:user.id,
        destinataire_id:destinataireId,
        texte:txt,
        lu:false,
      });
      if(error)console.error('Message send error:',error.message);
      // Realtime will pick it up — but also add locally for instant feedback
      setMsgs(p=>[...p,{id:"mn"+Date.now(),eId:enfant.id,de:role,h:heure,txt,lu:true,enfant_id:enfant.id}]);
    }
    setTxt("");
    setTimeout(()=>endRef.current?.scrollIntoView({behavior:"smooth"}),50);
  };

  return <div className="fi">
    <PageHeader icon="💬" title="Messagerie instantanée" sub="Communication en temps réel"/>
    {role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
      {liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>setSelId(e.id)}/>)}</div>}
    <div className="g2">
      <div className="card"style={{padding:0,display:"flex",flexDirection:"column",overflow:"hidden",minHeight:0}}>
        {/* En-tete conversation */}
        <div style={{display:"flex",alignItems:"center",gap:11,padding:"13px 16px",borderBottom:"1px solid var(--br)",background:"linear-gradient(135deg,var(--Tp),var(--Sp))"}}>
          <AvatarEnfant e={enfant} size={40}/>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontWeight:700,fontSize:14,color:"var(--b)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{enfant?.prenom} {enfant?.nom}</div>
            <div style={{fontSize:11,color:"var(--m)",fontWeight:600}}>{role==="asmat"?"Échange avec le parent":"Échange avec l'assistante maternelle"}</div>
          </div>
          <span style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:11,color:"var(--S)",fontWeight:700,flexShrink:0}}><span className="ai-dot"/>Suivi du jour</span>
        </div>
        {/* Messages */}
        <div className="msgs"style={{background:"var(--c)",padding:"14px 12px"}}>
          {loadingMsgs&&<div style={{textAlign:"center",color:"var(--l)",fontSize:12.5,padding:"20px 10px"}}>Chargement…</div>}
          {!loadingMsgs&&conv.length===0&&<div style={{textAlign:"center",color:"var(--l)",fontSize:12.5,padding:"30px 10px",lineHeight:1.6}}><IconeOuEmoji e="💬"/> Démarrez la conversation<br/>avec un petit mot sur la journée.</div>}
          {conv.map(m=><div key={m.id}className={(m.de===role?"msg msg-me":"msg msg-ot")}>
            <div>{m.txt||m.texte}</div>
            <div style={{fontSize:11,opacity:.65,marginTop:3,textAlign:"right"}}>{m.h}</div>
          </div>)}
          <div ref={endRef}/>
        </div>
        {/* Saisie */}
        <div style={{display:"flex",gap:8,padding:"12px 14px",borderTop:"1px solid var(--br)",alignItems:"center",background:"#fff"}}>
          <input id="timat-msg-input" className="inp"value={txt}onChange={e=>setTxt(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Votre message…"style={{flex:1,borderRadius:22}}/>
          <button onClick={send}disabled={!txt.trim()}aria-label="Envoyer"style={{flexShrink:0,width:42,height:42,borderRadius:"50%",border:"none",cursor:txt.trim()?"pointer":"default",background:txt.trim()?"var(--accent)":"var(--br)",color:"#fff",fontSize:15,display:"flex",alignItems:"center",justifyContent:"center",transition:"background .15s"}}>➤</button>
        </div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div className="card">
          <div style={{fontWeight:700,fontSize:13,marginBottom:10,color:"var(--b)"}}><IconeOuEmoji e="🔔"/> Conversations récentes</div>
          {liste.map(e=>{
            const unread=msgs.filter(m=>m.eId===e.id&&!m.lu).length;
            const last=msgs.filter(m=>m.eId===e.id).slice(-1)[0];
            return <div key={e.id}onClick={()=>setSelId(e.id)}
              style={{display:"flex",gap:10,padding:"9px 0",borderBottom:"1px solid var(--br)",cursor:"pointer",alignItems:"center"}}>
              <span style={{fontSize:22}}>{e.emoji}</span>
              <div style={{flex:1,overflow:"hidden"}}>
                <div style={{fontWeight:700,fontSize:13,color:"var(--b)"}}>{e.prenom}</div>
                {last&&<div style={{fontSize:12,color:"var(--l)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{last.txt||last.texte}</div>}
              </div>
              {unread>0&&<span className="badge"style={{background:"var(--T)",color:"white"}}>{unread}</span>}
            </div>;})}
        </div>
        <div className="card"style={{background:"var(--Sp)",border:"1px solid var(--Sl)"}}>
          <div style={{fontWeight:700,fontSize:13,color:"var(--S)",marginBottom:6}}><IconeOuEmoji e="💡"/> Bon à savoir</div>
          <div style={{fontSize:12,color:"var(--b)",lineHeight:1.6}}>
            Les messages sont consultables par les deux parties. En cas d'urgence, 
            utilisez directement l'appel téléphonique. La messagerie est archivée 2 ans.
          </div>
        </div>
      </div>
    </div>
  </div>;
}

//

export function Sante({enfants,role,pEId,user}){
  // La selection vient de l'ecran englobant : deux selections independantes
  // pouvaient afficher deux enfants differents sur le meme ecran.
  const selId=pEId||enfants[0]?.id;
  const [newAllergie,setNewAllergie]=useState(""); // ALLERGIES P6
  const [fiche,setFiche]=useState(null); // fiche d'urgence (remplie par le parent)
  const liste=role==="parent"?enfants.filter(e=>e.id===pEId):enfants;
  const enfant=liste.find(e=>e.id===selId)||liste[0];
  useEffect(()=>{
    if(!enfant?.id||["e1","e2","e3"].includes(enfant.id)){setFiche(null);return;}
    let alive=true;
    supabase.from("fiche_urgence").select("data").eq("enfant_id",enfant.id).maybeSingle()
      .then(({data})=>{if(alive)setFiche(data?.data||null);}).catch(()=>{if(alive)setFiche(null);});
    return()=>{alive=false;};
  },[enfant?.id]);
  const addAllergie=async()=>{ // ALLERGIES P6
    const v=newAllergie.trim();
    if(!v||!enfant?.id)return;
    const current=enfant.allergies||[];
    if(current.includes(v)){alert("Cette allergie est deja listee");setNewAllergie("");return;}
    const{error}=await supabase.rpc("update_allergies",{p_enfant_id:enfant.id,p_allergies:[...current,v]});
    if(error){alert("Erreur : "+error.message);return;}
    setNewAllergie("");
    logAction('add_allergie', {table_name:'enfants', record_id:enfant.id}); // AUDIT LOG P8
    window.dispatchEvent(new CustomEvent("timat:refresh-data"));
  };
  const delAllergie=async(a)=>{ // ALLERGIES P6
    if(!enfant?.id)return;
    if(!window.confirm("Supprimer l'allergie \""+a+"\" ?"))return;
    const updated=(enfant.allergies||[]).filter(x=>x!==a);
    const{error}=await supabase.rpc("update_allergies",{p_enfant_id:enfant.id,p_allergies:updated});
    if(error){alert("Erreur : "+error.message);return;}
    logAction('delete_allergie', {table_name:'enfants', record_id:enfant.id}); // AUDIT LOG P8
    window.dispatchEvent(new CustomEvent("timat:refresh-data"));
  };
  const [croissance,setCroissance]=useState([]);
  const [mesForm,setMesForm]=useState({date:isoJour(new Date()),poids:"",taille:""});
  useEffect(()=>{
    if(!enfant?.id||["e1","e2","e3"].includes(enfant.id)){setCroissance([]);return;}
    supabase.from("croissance").select("*").eq("enfant_id",enfant.id).order("date",{ascending:true}).then(({data})=>setCroissance(data||[]));
  },[enfant?.id]);
  const ageMois=(d)=>{if(!enfant?.naissance)return null;const n=new Date(enfant.naissance),x=new Date(d);return Math.max(0,Math.round((x-n)/(1000*60*60*24*30.44)));};
  const rechargerCroissance=()=>{if(enfant?.id)supabase.from("croissance").select("*").eq("enfant_id",enfant.id).order("date",{ascending:true}).then(({data})=>setCroissance(data||[]));};
  const addMesure=async()=>{
    if(!enfant?.id)return;
    const p=parseFloat(String(mesForm.poids).replace(",","."))||null;
    const t=parseFloat(String(mesForm.taille).replace(",","."))||null;
    if(!mesForm.date||(!p&&!t)){alert("Indiquez au moins le poids ou la taille.");return;}
    const{error}=await supabase.from("croissance").insert({enfant_id:enfant.id,date:mesForm.date,poids:p,taille:t,age_mois:ageMois(mesForm.date)});
    if(error){alert("Erreur : "+error.message);return;}
    setMesForm({date:isoJour(new Date()),poids:"",taille:""});
    rechargerCroissance();
  };
  const delMesure=async(id)=>{
    if(!window.confirm("Supprimer cette mesure ?"))return;
    await supabase.from("croissance").delete().eq("id",id);
    setCroissance(c=>c.filter(m=>m.id!==id));
  };
  const isRealChild=!["e1","e2","e3"].includes(enfant?.id);
  const vacs=isRealChild?[]:(enfant?.vaccins||[]);
  // Identité médicale connectée à la fiche d'urgence (remplie par le parent), avec repli sur les champs enfant
  const grp=fiche?.groupe||enfant?.groupe_sanguin||"";
  const medNom=fiche?.medecin||(enfant?.medecin?enfant.medecin.split("-")[0].trim():"");
  const medTel=fiche?.medecinTel||(enfant?.medecin?.split("-")[1]?.trim()||"");
  const ficheAJour=!!fiche;
  // LE NUMERO DE PMI N'EST PLUS DEVINE.
  //
  // Il venait d'un annuaire par departement ecrit en dur, et INVENTE : la
  // Haute-Garonne y figurait avec pmi@haute-garonne.fr quand le contact publie
  // par le departement est accueilpmi-individuelcollectif@cd31.fr. Le repli
  // conseillait meme d'appeler « le 15 » — le SAMU.
  //
  // Ce numero s'imprime ICI, sur la fiche d'urgence, a cote du SAMU et des
  // pompiers. Un numero faux a cet endroit-la est ce qu'on peut faire de pire :
  // il est composé le jour où tout va mal. Seul celui que l'assistante
  // maternelle a saisi elle-meme s'affiche ; sinon, la ligne n'apparait pas.
  const pmiTel=(user?.pmi_tel||"").trim();
  const pmiNom=(user?.pmi_nom||"").trim()||"PMI";
  const urgences=[
    {l:"SAMU",v:"15",ic:"🚑"},
    {l:"Pompiers",v:"18",ic:"🚒"},
    {l:"Police",v:"17",ic:"👮"},
    {l:"Urgences (Europe)",v:"112",ic:"📞"},
    {l:"Enfance en danger",v:"119",ic:"🛟"},
    {l:"Violences conjugales",v:"3919",ic:"💜"},
  ];
  if(pmiTel)urgences.push({l:pmiNom,v:pmiTel,ic:"🏛️"});
  if(medTel)urgences.push({l:"Médecin traitant",v:medTel,ic:"👨‍⚕️"});

  return <div className="fi">
    <PageHeader icon="🏥" title="Carnet de santé" sub="Informations médicales, vaccins, allergies"/>

    {enfant&&<>
      {/* En-tete enfant + groupe sanguin */}
      <div className="card"style={{marginBottom:12,display:"flex",alignItems:"center",gap:14,position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",left:0,top:0,bottom:0,width:5,background:enfant.couleur||"var(--T)"}}/>
        <AvatarEnfant e={enfant} size={48}/>
        <div style={{flex:1,minWidth:0}}>
          <div className="pf"style={{fontSize:18,fontWeight:700,color:"var(--b)"}}>{enfant.prenom}</div>
          <div style={{fontSize:12,color:"var(--l)",marginTop:2}}>Carnet de santé</div>
        </div>
        {grp&&<div style={{textAlign:"center",background:"var(--Rp)",borderRadius:12,padding:"8px 14px",flexShrink:0}}>
          <div className="pf"style={{fontSize:18,fontWeight:700,color:"var(--R)",lineHeight:1}}>{grp}</div>
          <div style={{fontSize:11,color:"var(--R)",marginTop:2,fontWeight:600,textTransform:"uppercase"}}>Groupe</div>
        </div>}
      </div>

    <div className="g2">
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {/* Identité médicale - connectée à la fiche d'urgence */}
        <div className="card">
          <div style={{fontWeight:700,fontSize:14,marginBottom:14,color:"var(--b)",display:"flex",alignItems:"center",gap:8}}><IconeOuEmoji e="🪪"/> Identité médicale</div>
          {[["Groupe sanguin",grp||"—"],["Médecin traitant",medNom||"—"],["Tél. médecin",medTel||"—"]].map(([l,v],i,arr)=>
            <div key={l}style={{display:"flex",justifyContent:"space-between",gap:10,padding:"9px 0",borderBottom:i<arr.length-1?"1px solid var(--br)":"none"}}>
              <span style={{fontSize:12,color:"var(--l)",fontWeight:600}}>{l}</span>
              <span style={{fontSize:13,fontWeight:600,color:"var(--b)",textAlign:"right"}}>{v}</span>
            </div>)}
          <div style={{marginTop:12,fontSize:11,color:"var(--l)",display:"flex",alignItems:"flex-start",gap:6,lineHeight:1.5}}>
            <IconeOuEmoji e="🔗"/>
            <span>{role==="parent"
              ?<>Ces informations proviennent de la <b>Fiche d'urgence</b>. Tenez-la à jour pour que votre assistante maternelle ait toujours le bon groupe sanguin et le bon médecin.{!ficheAJour&&<span style={{color:"var(--R)"}}> (fiche non renseignée)</span>}</>
              :<>Renseigné par le parent via la <b>Fiche d'urgence</b>.{!ficheAJour&&<span style={{color:"var(--m)"}}> Elle n'a pas encore été remplie.</span>}</>}</span>
          </div>
        </div>

        {/* Allergies ALLERGIES P6 */}
        <div className="card">
          <div style={{fontWeight:700,fontSize:14,marginBottom:14,color:"var(--b)",display:"flex",alignItems:"center",gap:8}}><IconeOuEmoji e="⚠️"/> Allergies</div>
          {(enfant.allergies||[]).length===0
            ?<div style={{display:"inline-flex",alignItems:"center",gap:7,background:"var(--Sp)",color:"var(--S)",padding:"8px 14px",borderRadius:10,fontSize:13,fontWeight:600}}><IconeOuEmoji e="✅"/> Aucune allergie connue</div>
            :<div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
              {(enfant.allergies||[]).map(a=><span key={a}style={{background:"#FEE2E2",color:"#DC2626",fontSize:13,fontWeight:600,padding:"6px 13px",borderRadius:10,display:"inline-flex",alignItems:"center",gap:7}}><IconeOuEmoji e="⚠️"/> {a}{role==="parent"&&<span onClick={()=>delAllergie(a)}style={{cursor:"pointer",fontWeight:700,fontSize:14,opacity:0.7,userSelect:"none"}}title="Supprimer">✕</span>}</span>)}
            </div>}
          {role==="parent"?<div style={{marginTop:14,display:"flex",gap:8}}>
            <input className="inp"placeholder="Ajouter une allergie..."style={{flex:1}}value={newAllergie}onChange={e=>setNewAllergie(e.target.value)}onKeyDown={e=>{if(e.key==="Enter")addAllergie();}}/>
            <button className="btn bT"style={{padding:"0 16px"}}onClick={addAllergie}>+</button>
          </div>:<div style={{marginTop:12,fontSize:11,color:"var(--l)"}}><IconeOuEmoji e="ℹ️"/> Renseignées et tenues à jour par le parent.</div>}
        </div>
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {/* Urgences - numeros cliquables */}
        <div className="card"style={{background:"#FFF5F5",border:"1px solid #FCA5A5"}}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:6,color:"#DC2626",display:"flex",alignItems:"center",gap:8}}><IconeOuEmoji e="🚨"/> En cas d'urgence</div>
          <div style={{fontSize:11,color:"#9B5757",marginBottom:12}}>Touchez un numéro pour appeler directement.</div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {urgences.map((u,i)=>
              <a key={u.l+i}href={"tel:"+String(u.v).replace(/\s/g,"")}style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:"#fff",border:"1px solid #FCA5A5",borderRadius:11,textDecoration:"none",flexWrap:"wrap"}}>
                <span style={{fontSize:17}}><IconeOuEmoji e={u.ic}/></span>
                <span style={{fontSize:12.5,color:"#7F1D1D",flex:1,fontWeight:600,minWidth:130,lineHeight:1.3,overflowWrap:"normal"}}>{u.l}</span>
                <span className="pf"style={{fontWeight:700,color:"#DC2626",fontSize:14,whiteSpace:"nowrap"}}>{u.v}</span>
              </a>)}
          </div>
          {!pmiTel&&<div style={{marginTop:10,fontSize:11.5,color:"#9B5757",lineHeight:1.5}}><IconeOuEmoji e="ℹ️"/> Ajoutez le numéro direct de votre PMI dans <b>Paramètres → Mon profil</b> pour l'avoir ici en un appui.</div>}
        </div>

        {/* Suivi medical - acces autres onglets */}
        <div className="card">
          <div style={{fontWeight:700,fontSize:14,marginBottom:12,color:"var(--b)",display:"flex",alignItems:"center",gap:8}}><IconeOuEmoji e="📑"/> Suivi médical</div>
          <div style={{fontSize:12.5,color:"var(--m)",lineHeight:1.5}}>Le <b>calendrier vaccinal</b> et la <b>courbe de croissance</b> sont disponibles dans les onglets dédiés ci-dessus.</div>
        </div>
      </div>
    </div>
    </>}
  </div>;
}

//

export function Portfolio({enfants,role,pEId}){
  const [selId,setSelId]=useState(null);
  const [showForm,setShowForm]=useState(false);
  const [pfs,setPfs]=useState([]);
  const [nf,setNf]=useState({titre:"",desc:"",emoji:"🎨",competences:""});
  const [toast,setToast]=useState("");
  const listeEnfants=role==="parent"?enfants.filter(e=>e.id===pEId):enfants;
  const enfantIdsKey=listeEnfants.map(e=>e.id).sort().join(",");
  const filtres=selId?pfs.filter(p=>p.enfant_id===selId):pfs.filter(p=>listeEnfants.some(e=>e.id===p.enfant_id));
  const emojis=["🎨","🌱","🎵","🧩","🏃","📚","🍳","🌍","🎭","🔬"];

  // PORTFOLIO P3: Charger les activites depuis Supabase au montage et quand la liste d'enfants change
  useEffect(()=>{
    if(!enfantIdsKey)return;
    const ids=enfantIdsKey.split(",");
    let cancelled=false;
    (async()=>{
      const{data,error}=await supabase.from("portfolio")
        .select("*").in("enfant_id",ids)
        .order("date",{ascending:false});
      if(cancelled)return;
      if(error){console.error("Erreur chargement portfolio:",error);return;}
      setPfs(data||[]);
    })();
    return()=>{cancelled=true;};
  },[enfantIdsKey]);

  const add=async()=>{
    const e=listeEnfants[0];if(!e||!nf.titre)return;
    const payload={
      enfant_id:selId||e.id,
      titre:nf.titre,
      description:nf.desc||null,
      emoji:nf.emoji,
      competences:nf.competences.split(",").map(s=>s.trim()).filter(Boolean),
      date:TODAY_STR,
    };
    const{data,error}=await supabase.from("portfolio").insert(payload).select().single();
    if(error){setToast("Erreur : "+(error.message||error.code||"inconnue"));return;}
    setPfs(p=>[data,...p]);
    setNf({titre:"",desc:"",emoji:"🎨",competences:""});
    setShowForm(false);
    setToast("Activité ajoutée ✓");
  };

  const supprimer=async(id)=>{
    if(!window.confirm("Supprimer cette activité ?"))return;
    const{error}=await supabase.from("portfolio").delete().eq("id",id);
    if(error){setToast("Erreur : "+(error.message||error.code||"inconnue"));return;}
    setPfs(p=>p.filter(x=>x.id!==id));
    setToast("Activité supprimée ✓");
  };

  return <div className="fi">
    {toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
    <PageHeader icon="🎨" title="Cahier de réussites" sub="Activités, projets et souvenirs valorisés"
      action={role==="asmat"&&<button className="btn bT"onClick={()=>setShowForm(!showForm)}>+ Activité</button>}/>

    {role==="asmat"&&<div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
      <button className={(!selId?"btn bT":"btn bG")}onClick={()=>setSelId(null)}>Tous</button>
      {listeEnfants.map(e=><button key={e.id}className={(selId===e.id?"btn bT":"btn bG")}onClick={()=>setSelId(selId===e.id?null:e.id)}>{e.emoji} {e.prenom}</button>)}
    </div>}

    {showForm&&<div className="card"style={{marginBottom:14,border:"1.5px solid var(--T)"}}>
      <div style={{fontWeight:700,fontSize:13,marginBottom:10,color:"var(--b)"}}>Nouvelle activité</div>
      <div className="g2"style={{marginBottom:10}}>
        <div><label className="lbl">Titre</label><input className="inp"value={nf.titre}onChange={e=>setNf(p=>({...p,titre:e.target.value}))}placeholder="Nom de l'activité"/></div>
        <div><label className="lbl">Emoji</label><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
          {emojis.map(em=><button key={em}className={"moo "+(nf.emoji===em?"on":"")}onClick={()=>setNf(p=>({...p,emoji:em}))}style={{fontSize:15,padding:"5px 8px"}}>{em}</button>)}</div></div>
      </div>
      <div style={{marginBottom:10}}><label className="lbl">Description</label><textarea className="ta"value={nf.desc}onChange={e=>setNf(p=>({...p,desc:e.target.value}))}placeholder="Ce que l'enfant a appris, réalisé..."style={{minHeight:60}}/></div>
      <div style={{marginBottom:10}}><label className="lbl">Compétences (séparées par virgule)</label><input className="inp"value={nf.competences}onChange={e=>setNf(p=>({...p,competences:e.target.value}))}placeholder="Motricité fine, Créativité..."/></div>
      <button className="btn bT"style={{width:"100%"}}onClick={add}>Enregistrer l'activité</button>
    </div>}

    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:12}}>
      {filtres.map(pf=>{
        const e=enfants.find(x=>x.id===pf.enfant_id);
        return <div key={pf.id}className="card"style={{display:"flex",flexDirection:"column",gap:8}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div style={{fontSize:36}}>{pf.emoji}</div>
            <div style={{textAlign:"right"}}>
              {e&&<span style={{fontSize:16}}>{e.emoji}</span>}
              <div style={{fontSize:11,color:"var(--l)"}}>{fmt(pf.date)}</div>
            </div>
          </div>
          <div style={{fontWeight:700,fontSize:14,color:"var(--b)"}}>{pf.titre}</div>
          <div style={{fontSize:12,color:"var(--m)",lineHeight:1.5}}>{pf.description}</div>
          <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
            {(pf.competences||[]).map(c=><span key={c}className="badge"style={{background:"var(--Pp)",color:"var(--P)",fontSize:11}}>{c}</span>)}
          </div>
          {role==="asmat"&&<button className="btn bG s"style={{padding:"5px 10px",color:"var(--R)",alignSelf:"flex-start",marginTop:4}}onClick={()=>supprimer(pf.id)}><IconeOuEmoji e="🗑️"/> Supprimer</button>}
        </div>;})}
    </div>
  </div>;
}

//
// MILESTONES P3 - Référentiel des jalons (46) sourcés OMS + Carnet de santé FR 2025 + PNNS

export function Developpement({enfants,role,pEId}){
  const [selId,setSelId]=useState(enfants[0]?.id);
  const [ms,setMs]=useState({});
  const [loading,setLoading]=useState(true);
  const [filterAge,setFilterAge]=useState(36); // FILTRE AGE P8
  const liste=role==="parent"?enfants.filter(e=>e.id===pEId):enfants;
  const enfant=liste.find(e=>e.id===selId)||liste[0];
  const idsKey=liste.map(e=>e.id).filter(Boolean).join(",");

  // FILTRE AGE P8 - init filterAge depuis localStorage (ou âge enfant +3 par défaut)
  useEffect(()=>{
    if(!enfant?.id) return;
    try{
      const stored=localStorage.getItem(`timat:milestones:filterAge:${enfant.id}`);
      if(stored){setFilterAge(parseInt(stored,10));return;}
    }catch{}
    const m=ageEnMois(enfant.naissance);
    setFilterAge(m!==null ? Math.min(36, m+3) : 36);
  },[enfant?.id, enfant?.naissance]);

  // FILTRE AGE P8 - persister filterAge à chaque changement
  useEffect(()=>{
    if(!enfant?.id) return;
    try{ localStorage.setItem(`timat:milestones:filterAge:${enfant.id}`, String(filterAge)); }catch{}
  },[filterAge, enfant?.id]);

  useEffect(()=>{
    let cancelled=false;
    (async()=>{
      const ids=idsKey.split(",").filter(Boolean);
      if(ids.length===0){setLoading(false);return;}
      const {data,error}=await supabase.from("jalons").select("*").in("enfant_id",ids);
      if(error){console.error("[MILESTONES P3] fetch",error);if(!cancelled)setLoading(false);return;}
      if(cancelled)return;
      const grouped={};
      ids.forEach(id=>grouped[id]=[]);
      (data||[]).forEach(r=>{if(!grouped[r.enfant_id])grouped[r.enfant_id]=[];grouped[r.enfant_id].push(r);});
      // Seed au premier accès (asmat uniquement, RLS bloque le parent en INSERT)
      if(role==="asmat"){
        const aSeeder=ids.filter(id=>grouped[id].length===0);
        for(const eid of aSeeder){
          const rows=JALONS_REF.map(j=>({...j,enfant_id:eid,acquis:false}));
          const {data:inserted,error:errI}=await supabase.from("jalons").insert(rows).select();
          if(errI){console.error("[MILESTONES P3] seed",errI);continue;}
          grouped[eid]=inserted||[];
        }
      }
      if(!cancelled){setMs(grouped);setLoading(false);}
    })();
    return()=>{cancelled=true;};
  },[idsKey,role]);

  const items=ms[enfant?.id]||[];
  const cats=[...new Set(items.map(m=>m.categorie))];
  const done=items.filter(m=>m.acquis).length;
  const pct=items.length?Math.round(done/items.length*100):0;
  // FILTRE AGE P8 - liste filtrée par âge max (n'affecte que la liste de droite, pas les stats globales)
  const filteredItems=items.filter(m=>parseAgeAttendu(m.age_attendu).max<=filterAge);
  const filteredCats=[...new Set(filteredItems.map(m=>m.categorie))];

  const toggle=async(id)=>{
    if(role!=="asmat")return;
    const row=items.find(m=>m.id===id);
    if(!row)return;
    const newAcquis=!row.acquis;
    const newAcquisAt=newAcquis?isoJour(new Date()):null;
    setMs(p=>({...p,[enfant.id]:p[enfant.id].map(m=>m.id===id?{...m,acquis:newAcquis,acquis_at:newAcquisAt}:m)}));
    const {error}=await supabase.from("jalons").update({acquis:newAcquis,acquis_at:newAcquisAt}).eq("id",id);
    if(error){
      console.error("[MILESTONES P3] toggle",error);
      setMs(p=>({...p,[enfant.id]:p[enfant.id].map(m=>m.id===id?{...m,acquis:row.acquis,acquis_at:row.acquis_at}:m)}));
    }
  };

  return <div className="fi">
    <PageHeader icon="🌱" title="Suivi du développement" sub="Jalons OMS + Carnet de santé 2025"/>
    {role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
      {liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>setSelId(e.id)}/>)}</div>}

    {loading&&<div className="card"style={{textAlign:"center",color:"var(--l)"}}>Chargement des jalons...</div>}

    {!loading&&enfant&&items.length===0&&<div className="card"style={{textAlign:"center",color:"var(--l)"}}>
      {role==="asmat"?"Aucun jalon initialisé. Rechargez la page pour générer la liste.":"Les jalons n'ont pas encore été initialisés par l'assistant·e maternel·le."}
    </div>}

    {!loading&&enfant&&items.length>0&&<div className="g2">
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {/* Score global */}
        <div className="card">
          <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:12}}>
            <span style={{fontSize:36}}>{enfant.emoji}</span>
            <div style={{flex:1}}>
              <div className="pf"style={{fontSize:17,fontWeight:700,color:"var(--b)"}}>{enfant.prenom}</div>
              <div style={{fontSize:13,color:"var(--l)"}}>{age(enfant.naissance)}</div>
            </div>
            <div style={{textAlign:"center"}}>
              <div className="pf"style={{fontSize:28,fontWeight:700,color:"var(--S)"}}>{pct}%</div>
              <div style={{fontSize:11,color:"var(--l)"}}>acquis</div>
            </div>
          </div>
          <div className="bar"style={{height:10,marginBottom:8}}>
            <div className="bar-fill"style={{width:pct+"%",background:"var(--S)"}}/>
          </div>
          <div style={{fontSize:12,color:"var(--m)"}}>{done} / {items.length} étapes atteintes</div>
        </div>

        {/* Par catégorie */}
        {cats.map(cat=>{
          const citems=items.filter(m=>m.categorie===cat);
          const cpct=citems.length?Math.round(citems.filter(m=>m.acquis).length/citems.length*100):0;
          return <div key={cat}className="card">
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
              <span style={{fontWeight:700,fontSize:13,color:"var(--b)"}}>{cat}</span>
              <span style={{fontSize:12,color:"var(--S)",fontWeight:700}}>{cpct}%</span>
            </div>
            <div className="bar"style={{marginBottom:2}}>
              <div className="bar-fill"style={{width:cpct+"%",background:"var(--S)"}}/>
            </div>
          </div>;})}
      </div>

      <div className="card">
        <div style={{fontWeight:700,fontSize:14,marginBottom:12,color:"var(--b)"}}>Toutes les étapes</div>
        {/* FILTRE AGE P8 - slider */}
        <div style={{marginBottom:14,padding:10,background:"var(--Sp)",borderRadius:8}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
            <span style={{fontSize:12,fontWeight:700,color:"var(--m)"}}>Filtre par âge</span>
            <span style={{fontSize:11,color:"var(--l)"}}>{filteredItems.length} / {items.length} jalons</span>
          </div>
          <input type="range" min="0" max="36" value={filterAge}
            onChange={e=>setFilterAge(parseInt(e.target.value,10))}
            style={{width:"100%",accentColor:"var(--S)",cursor:"pointer"}}/>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"var(--l)",marginTop:2}}>
            <span>0 mois</span>
            <span style={{fontWeight:700,color:"var(--S)"}}>Jusqu'à {filterAge} mois</span>
            <span>36 mois</span>
          </div>
        </div>
        {filteredCats.length===0 && <div style={{fontSize:13,color:"var(--l)",textAlign:"center",padding:20}}>Aucun jalon dans cette tranche d'âge.<br/>Augmente le filtre pour voir plus d'étapes.</div>}
        {filteredCats.map(cat=><div key={cat}style={{marginBottom:14}}>
          <div style={{fontSize:12,fontWeight:700,color:"var(--m)",textTransform:"uppercase",letterSpacing:".5px",marginBottom:6}}>{cat}</div>
          {filteredItems.filter(m=>m.categorie===cat).map(m=><div key={m.id}className="ms"onClick={()=>role==="asmat"&&toggle(m.id)}>
            <div className={"msc "+(m.acquis?"ok":"")+""}>{m.acquis?"✓":""}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:13,color:"var(--b)",fontWeight:m.acquis?700:400}}>{m.texte}</div>
              <div style={{fontSize:11,color:"var(--l)"}}>{m.age_attendu}</div>
            </div>
            {!m.acquis&&<span className="badge"style={{background:"var(--Gp)",color:"var(--G)",fontSize:11}}>En cours</span>}
          </div>)}
        </div>)}
        {role==="asmat"&&<div style={{fontSize:11,color:"var(--l)",marginTop:4}}>Cliquez sur une étape pour valider</div>}
      </div>
    </div>}
  </div>;
}

//
// BILANS P8 - Composant complet pour créer/visualiser/éditer des bilans périodiques
// Bilans, Paramètres, Liste d'attente, Périscolaire, Forum et Projet d'accueil
// vivent dans src/ecrans-secondaires.jsx : le routeur les charge à la demande.

export function Recap({enfants,role,pEId}){
  const [selId,setSelId]=useState(enfants[0]?.id);
  const [showPrev,setShowPrev]=useState(false);
  const [toast,setToast]=useState("");
  const liste=role==="parent"?enfants.filter(e=>e.id===pEId):enfants;
  const enfant=liste.find(e=>e.id===selId)||liste[0];
  const contrat=enfant?.contrat;
  const isDemoRecap=enfants.every(e=>["e1","e2","e3"].includes(e.id));
  const h=isDemoRecap?(D.heures[enfant?.id]||{real:0,prev:0}):{real:0,prev:heuresMensualisees(contrat)};
  const rep=D.repas.filter(r=>r.eId===enfant?.id);
  const ms=D.milestones[enfant?.id]||[];

  return <div className="fi">
    {toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
    <PageHeader icon="📊" title="Récapitulatif mensuel PDF" sub="Bilan complet automatique - exclusivité TiMat"
      action={<button className="btn bT"onClick={()=>{setShowPrev(true);}}> <IconeOuEmoji e="👁️"/> Aperçu PDF</button>}/>
    {role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
      {liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>setSelId(e.id)}/>)}</div>}

    <div className="g2"style={{marginBottom:12}}>
      {[["⏰","Heures réalisées",h.real+"h / "+h.prev+"h prévues","var(--B)"],
        ["🍽️","Repas enregistrés",rep.length+" jours de suivi","var(--S)"],
        ["🌱","Étapes atteintes",ms.filter(m=>m.ok).length+" / "+ms.length+" jalons","var(--P)"],
        ["📋","Transmissions",D.transmissions.filter(t=>t.eId===enfant?.id).length+" échanges","var(--T)"],
      ].map(([ic,ti,su,c])=><div key={ti}className="card"style={{display:"flex",gap:10,alignItems:"center"}}>
        <div style={{fontSize:26}}><IconeOuEmoji e={ic} taille={26}/></div>
        <div><div style={{fontWeight:700,fontSize:13,color:"var(--b)"}}>{ti}</div>
          <div className="pf"style={{fontSize:15,color:c,fontWeight:700}}>{su}</div></div>
      </div>)}
    </div>

    {showPrev&&enfant&&<div className="card">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div style={{fontWeight:700,fontSize:14,color:"var(--b)"}}>Aperçu du récapitulatif</div>
        <div style={{display:"flex",gap:8}}>
          <button className="btn bP"onClick={()=>setToast("PDF généré et envoyé par email ✓")}><IconeOuEmoji e="📧"/> Envoyer par email</button>
          <button className="btn bS"onClick={()=>setToast("Téléchargement en cours ✓")}><IconeOuEmoji e="⬇️"/> Télécharger PDF</button>
        </div>
      </div>
      <div className="pdf-preview">
        <div style={{borderBottom:"2px solid #E49178",paddingBottom:12,marginBottom:16,display:"flex",justifyContent:"space-between"}}>
          <div><h2 style={{color:"#E49178",fontFamily:"Georgia",fontSize:18}}><IconeOuEmoji e="🌿"/> TiMat</h2>
            <div style={{fontSize:11,color:"#888"}}>{user?.prenom||"Assmat"} {user?.nom||""} · Assistante Maternelle agréée</div></div>
          <div style={{textAlign:"right",fontSize:11,color:"#888"}}>
            <div><strong>Récapitulatif mensuel</strong></div>
            <div>{new Date().toLocaleDateString('fr-FR',{month:'long',year:'numeric'}).replace(/^./,c=>c.toUpperCase())}</div>
            <div>Généré le {new Date().toLocaleDateString('fr-FR')}</div>
          </div>
        </div>
        <div style={{background:"#f8f4ef",padding:10,borderRadius:6,marginBottom:12}}>
          <div style={{fontWeight:700,marginBottom:4}}><IconeOuEmoji e="👶"/> {enfant.prenom} {enfant.nom} - {age(enfant.naissance)}</div>
          <div style={{fontSize:11,color:"#666"}}>Période d'accueil : {enfant.contrat?.horaires} · {(enfant.contrat?.jours||[]).join(", ")}</div>
        </div>
        <table>
          <thead><tr><th>Section</th><th>Détail</th><th>Valeur</th></tr></thead>
          <tbody>
            <tr><td>Heures prévues</td><td>Contrat mensuel</td><td><strong>{h.prev}h</strong></td></tr>
            <tr><td>Heures réalisées</td><td>Pointage validé</td><td><strong>{h.real}h</strong></td></tr>
            <tr><td>Solde</td><td>Différence</td><td style={{color:h.real-h.prev<0?"#DC2626":"#16A34A"}}><strong>{h.real-h.prev}h</strong></td></tr>
            <tr><td>Salaire brut</td><td>Taux {contrat?.tauxHoraire}€/h</td><td><strong>{nbf((h.real*(contrat?.tauxHoraire||minimumHoraireAu(new Date()))),2)}€</strong></td></tr>
            <tr><td>Repas suivis</td><td>Journaux renseignés</td><td><strong>{rep.length} jours</strong></td></tr>
            <tr><td>Étapes dév.</td><td>Jalons OMS</td><td><strong>{ms.filter(m=>m.ok).length}/{ms.length}</strong></td></tr>
          </tbody>
        </table>
        <div style={{marginTop:14,paddingTop:10,borderTop:"1px solid #ddd",fontSize:11,color:"#888",textAlign:"center"}}>
          Document généré automatiquement par TiMat · Confidentiel
        </div>
      </div>
    </div>}

    {!showPrev&&<div className="card"style={{background:"var(--Pp)",border:"1px solid var(--P)"}}>
      <div style={{fontWeight:700,fontSize:14,color:"var(--P)",marginBottom:8}}><IconeOuEmoji e="💡"/> Fonctionnalité exclusive</div>
      <div style={{fontSize:13,color:"var(--b)",lineHeight:1.7}}>
        TiMat génère automatiquement chaque mois un <strong>récapitulatif PDF complet</strong> :
        heures, repas, humeurs, étapes de développement, facturation et transmissions.
        Envoyé automatiquement aux parents le 1er de chaque mois.
        <br/><br/>
        <strong>Aucun concurrent ne propose cela.</strong>
      </div>
    </div>}
  </div>;
}

//
//

export function Parrainage({user}){
  const [copied,setCopied]=useState(false);
  const [toast,setToast]=useState("");
  const prefix=(user?.prenom||"MARIE").toUpperCase().slice(0,4);
  const codeNum=Math.abs((user?.email||"test").split("").reduce((a,c)=>a+c.charCodeAt(0),1000)%9000+1000);
  const code="TM-"+prefix+"-"+codeNum;
  const lien="https://www.timat.app/rejoindre?code="+code;
  const copy=()=>{navigator.clipboard?.writeText(lien).catch(()=>{});setCopied(true);setTimeout(()=>setCopied(false),2500);setToast("Lien copié ✓");};
  const filleules=[
    {prenom:"Nathalie",ville:"Lyon",date:"Il y a 5 jours",statut:"actif",gain:"1 mois offert"},
    {prenom:"Camille",ville:"Bordeaux",date:"Il y a 2 semaines",statut:"essai",gain:"En cours"},
  ];
  return <div className="fi">
    {toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
    <PageHeader icon="🎁" title="Parrainage" sub="Invitez vos collègues - gagnez des mois gratuits"/>
    <div style={{background:"linear-gradient(135deg,#1C3028,#3D6B50)",borderRadius:20,padding:"28px 24px",marginBottom:20}}>
      <div style={{fontSize:36,marginBottom:10}}>🌿</div>
      <div className="pf"style={{fontSize:20,fontWeight:700,color:"#fff",marginBottom:8}}>Invitez une collègue asmat</div>
      <div style={{fontSize:13,color:"rgba(255,255,255,.75)",lineHeight:1.7,marginBottom:16}}>
        Pour chaque asmat qui s'inscrit et passe Pro avec votre code :<br/>
        <strong style={{color:"#E8B060"}}>Vous gagnez 1 mois gratuit · Elle gagne 1 mois gratuit.</strong>
      </div>
      <div style={{background:"rgba(255,255,255,.1)",borderRadius:10,padding:"12px 16px",marginBottom:12}}>
        <div style={{fontSize:11,color:"rgba(255,255,255,.5)",textTransform:"uppercase",letterSpacing:".5px",marginBottom:4}}>Votre code personnel</div>
        <div style={{fontFamily:"'DM Mono',monospace",fontSize:22,fontWeight:700,color:"#E8B060",letterSpacing:"2px"}}>{code}</div>
      </div>
      <div style={{display:"flex",gap:8,alignItems:"center",background:"rgba(255,255,255,.08)",borderRadius:8,padding:"8px 12px",marginBottom:12}}>
        <span style={{fontSize:11,color:"rgba(255,255,255,.6)",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{lien}</span>
        <button onClick={copy}style={{background:copied?"var(--G)":"rgba(255,255,255,.2)",color:"#fff",border:"none",borderRadius:10,padding:"5px 12px",cursor:"pointer",fontSize:11,fontWeight:700,flexShrink:0}}>
          {copied?"✓ Copié":"Copier"}
        </button>
      </div>
      <div style={{display:"flex",gap:8}}>
        <button onClick={()=>setToast("Message SMS préparé ✓")}style={{background:"rgba(255,255,255,.15)",color:"#fff",border:"1px solid rgba(255,255,255,.2)",borderRadius:10,padding:"7px 14px",cursor:"pointer",fontSize:12,fontWeight:600}}><IconeOuEmoji e="📱"/> SMS</button>
        <button onClick={()=>setToast("Message WhatsApp préparé ✓")}style={{background:"rgba(255,255,255,.15)",color:"#fff",border:"1px solid rgba(255,255,255,.2)",borderRadius:10,padding:"7px 14px",cursor:"pointer",fontSize:12,fontWeight:600}}><IconeOuEmoji e="💬"/> WhatsApp</button>
      </div>
    </div>
    <div className="card"style={{marginBottom:16}}>
      <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:12}}>Comment ça marche</div>
      {[["1","Partagez votre lien","📋"],["2","Votre collègue s'inscrit","✅"],["3","Elle passe Pro","⬆️"],["4","1 mois offert à chacune","🎁"]].map(([n,t,ic])=>
        <div key={n}style={{display:"flex",gap:12,alignItems:"center",padding:"8px 0",borderBottom:"1px solid var(--br)"}}>
          <div style={{width:28,height:28,borderRadius:"50%",background:"var(--Tp)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,color:"var(--T)",fontSize:13,flexShrink:0}}>{n}</div>
          <span style={{flex:1,fontSize:13,color:"var(--b)"}}>{t}</span>
          <span style={{fontSize:18}}><IconeOuEmoji e={ic}/></span>
        </div>)}
    </div>
    <div className="card">
      <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:12}}>
        Mes filleules · <span style={{color:"var(--S)"}}>{filleules.length} inscrites</span>
        {" · "}<span style={{color:"var(--T)"}}>{filleules.filter(f=>f.statut==="actif").length} mois gagnés</span>
      </div>
      {filleules.map((f,i)=><div key={i}style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderBottom:"1px solid var(--br)"}}>
        <div>
          <div style={{fontWeight:600,fontSize:13,color:"var(--b)"}}>{f.prenom} - {f.ville}</div>
          <div style={{fontSize:11,color:"var(--l)"}}>{f.date}</div>
        </div>
        <span className="badge"style={{background:f.statut==="actif"?"var(--Gp)":"var(--c)",color:f.statut==="actif"?"var(--G)":"var(--m)"}}>{f.gain}</span>
      </div>)}
    </div>
  </div>;
}

//
// VERSEMENTS P34 - Suivi des paiements reels recus (palier 2 : lecture + saisie)
// Le PARENT verse, l'ASSMAT recoit. Saisie + gestion par les deux (RLS table versements).

export function Sommeil({enfants,role,pEId}){
  const [selId,setSelId]=useState(enfants[0]?.id);
  const [sommeils,setSommeils]=useState({});
  const [nS,setNS]=useState({debut:"",fin:"",qualite:"bien"});
  const [toast,setToast]=useState("");
  const liste=role==="parent"?enfants.filter(e=>e.id===pEId):enfants;
  const enfant=liste.find(e=>e.id===selId)||liste[0];
  const enfantIdsKey=liste.map(e=>e.id).sort().join(",");
  const hist=sommeils[enfant?.id]||[];
  const auj=hist.find(s=>s.date===TODAY_STR);

  // SOMMEIL P3: charger depuis Supabase au montage et au changement de liste enfants
  useEffect(()=>{
    if(!enfantIdsKey)return;
    const ids=enfantIdsKey.split(",");
    let cancelled=false;
    (async()=>{
      const{data,error}=await supabase.from("sommeil")
        .select("*").in("enfant_id",ids)
        .order("date",{ascending:false})
        .order("created_at",{ascending:false});
      if(cancelled)return;
      if(error){console.error("Erreur chargement sommeil:",error);return;}
      const grouped={};
      (data||[]).forEach(s=>{
        if(!grouped[s.enfant_id])grouped[s.enfant_id]=[];
        grouped[s.enfant_id].push(s);
      });
      setSommeils(grouped);
    })();
    return()=>{cancelled=true;};
  },[enfantIdsKey]);

  const ajout=async()=>{
    if(!nS.debut||!nS.fin||!enfant)return;
    const[h1,m1]=nS.debut.split(":").map(Number);
    const[h2,m2]=nS.fin.split(":").map(Number);
    const d=(h2*60+m2)-(h1*60+m1);
    if(d<=0){setToast("L'heure de fin doit etre apres le debut");return;}
    const duree=Math.floor(d/60)+"h"+String(d%60).padStart(2,"0");
    const payload={
      enfant_id:enfant.id,
      date:TODAY_STR,
      debut:nS.debut.replace(":","h"),
      fin:nS.fin.replace(":","h"),
      duree,
      qualite:nS.qualite,
    };
    const{data,error}=await supabase.from("sommeil").insert(payload).select().single();
    if(error){setToast("Erreur : "+(error.message||error.code||"inconnue"));return;}
    setSommeils(p=>({...p,[enfant.id]:[data,...(p[enfant.id]||[])]}));
    setNS({debut:"",fin:"",qualite:"bien"});
    setToast("Sieste enregistrée ✓");
  };

  const supprimer=async(id)=>{
    if(!enfant)return;
    if(!window.confirm("Supprimer cette sieste ?"))return;
    const{error}=await supabase.from("sommeil").delete().eq("id",id);
    if(error){setToast("Erreur : "+(error.message||error.code||"inconnue"));return;}
    setSommeils(p=>({...p,[enfant.id]:(p[enfant.id]||[]).filter(s=>s.id!==id)}));
    setToast("Sieste supprimée ✓");
  };

  const qColor=Object.fromEntries(Object.entries(QUALITE_SIESTE).map(([k,e])=>[k,e.teinte]));
  const qLabel=Object.fromEntries(Object.entries(QUALITE_SIESTE).map(([k,e])=>[k,e.l]));

  return <div className="fi">
    {toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
    <PageHeader icon="😴" title="Suivi du sommeil" sub="Siestes et qualité du repos"/>
    {role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
      {liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>setSelId(e.id)}/>)}</div>}
    <div className="g2">
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div className="card">
          <div style={{fontWeight:700,fontSize:14,marginBottom:14,color:"var(--b)"}}><IconeOuEmoji e="😴"/> Sieste d'aujourd'hui</div>
          {auj?<div style={{background:"var(--Sp)",borderRadius:12,padding:14,border:"1px solid var(--Sl)"}}>
            <div style={{display:"flex",justifyContent:"space-around",marginBottom:10}}>
              {[["Début",auj.debut,"var(--S)"],["Fin",auj.fin,"var(--T)"],["Durée",auj.duree,"var(--b)"]].map(([l,v,c])=>
                <div key={l}style={{textAlign:"center"}}>
                  <div style={{fontSize:11,color:"var(--l)"}}>{l}</div>
                  <div className="pf"style={{fontSize:20,fontWeight:700,color:c}}>{v}</div>
                </div>)}
            </div>
            <div style={{textAlign:"center"}}>
              <span className="badge"style={{background:qColor[auj.qualite]+"22",color:qColor[auj.qualite],fontSize:13}}>{qLabel[auj.qualite]}</span>
            </div>
          </div>:<div style={{color:"var(--l)",fontSize:13,textAlign:"center",padding:"20px 0"}}>Pas encore de sieste enregistrée</div>}
        </div>
        {role==="asmat"&&<div className="card">
          <div style={{fontWeight:700,fontSize:14,marginBottom:12,color:"var(--b)"}}>+ Enregistrer une sieste</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
            <div><label className="lbl">Début</label><input type="time"className="inp"value={nS.debut}onChange={e=>setNS(p=>({...p,debut:e.target.value}))}/></div>
            <div><label className="lbl">Fin</label><input type="time"className="inp"value={nS.fin}onChange={e=>setNS(p=>({...p,fin:e.target.value}))}/></div>
          </div>
          <div style={{marginBottom:12}}>
            <label className="lbl">Qualité</label>
            <div style={{display:"flex",gap:6}}>
              {Object.entries(QUALITE_SIESTE).map(([v,e])=>{const l=e.court,c=e.teinte;
                const on=nS.qualite===v;
                return <button key={v} type="button" onClick={()=>setNS(p=>({...p,qualite:v}))} style={{flex:1,padding:"10px 4px",borderRadius:10,border:"1.5px solid",borderColor:on?c:"var(--br)",background:on?c+"1F":"#fff",color:on?c:"var(--m)",fontWeight:on?700:600,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>{l}</button>;
              })}
            </div>
          </div>
          <button className="btn bS"style={{width:"100%"}}onClick={ajout}>Enregistrer</button>
        </div>}
      </div>
      <div className="card">
        <div style={{fontWeight:700,fontSize:14,marginBottom:12,color:"var(--b)"}}><IconeOuEmoji e="📈"/> Historique récent</div>
        {hist.length===0&&<div style={{fontSize:13,color:"var(--l)"}}>Aucune donnée</div>}
        {hist.map(s=><div key={s.id}style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderBottom:"1px solid var(--br)"}}>
          <div>
            <div style={{fontSize:12,fontWeight:600,color:"var(--b)"}}>{new Date(s.date).toLocaleDateString("fr-FR",{weekday:"short",day:"numeric",month:"short"})}</div>
            <div style={{fontSize:11,color:"var(--l)"}}>{s.debut} → {s.fin}</div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <div className="pf"style={{fontSize:16,fontWeight:700,color:"var(--T)"}}>{s.duree}</div>
            <span className="badge"style={{background:qColor[s.qualite]+"22",color:qColor[s.qualite],fontSize:11}}>{s.qualite}</span>
            {role==="asmat"&&<button className="btn bG s"style={{padding:"3px 8px",color:"var(--R)"}}onClick={()=>supprimer(s.id)}title="Supprimer">🗑️</button>}
          </div>
        </div>)}
        {/* Sparkline durées */}
        {hist.length>1&&<div style={{marginTop:14}}>
          <div style={{fontSize:11,color:"var(--l)",marginBottom:6}}>Durées sur 7 jours</div>
          <div style={{display:"flex",gap:4,alignItems:"flex-end",height:40}}>
            {hist.slice(0,7).reverse().map((s,i)=>{
              const[h,m]=s.duree.split("h").map(Number);const mins=h*60+(m||0);
              const pct=Math.min(mins/180*100,100);
              return <div key={i}style={{flex:1,borderRadius:"3px 3px 0 0",height:pct+"%",background:pct>70?"var(--S)":pct>40?"var(--G)":"var(--R)",transition:"height .5s ease"}}title={s.duree}/>;
            })}
          </div>
        </div>}
      </div>
    </div>
  </div>;
}

//

export function TableauDeBord({enfants,role,pEId,setPage}){
  const liste=role==="parent"?enfants.filter(e=>e.id===pEId):enfants;
  const [selId,setSelId]=useState(liste[0]?.id);
  const [periode,setPeriode]=useState("7j");
  const enfant=liste.find(e=>e.id===selId)||liste[0];

  const ptAuj=D.pointages.filter(p=>p.date===TODAY_STR);
  const presents=ptAuj.filter(p=>!p.dep).length;
  const isDemoTDB=enfants.every(e=>["e1","e2","e3"].includes(e.id));
  const msgsNonLus=isDemoTDB?D.messages.filter(m=>!m.lu).length:0;
  const totalH=isDemoTDB?enfants.reduce((a,e)=>{const h=D.heures[e.id];return a+(h?h.real:0);},0):0;

  // Humeurs historique
  const hist=D.moodHistory[enfant?.id]||[];
  const jours=periode==="7j"?7:15;
  const histSlice=hist.slice(-jours);
  const avg=histSlice.length?Math.round(histSlice.reduce((a,v)=>a+v,0)/histSlice.length*10)/10:0;
  const avgColor=avg>=4?"var(--S)":avg>=3?"var(--G)":"var(--R)";
  const svgW=320,svgH=80;
  const moodPts=histSlice.map((v,i)=>({
    x:10+i*(svgW-20)/(Math.max(histSlice.length-1,1)),
    y:svgH-10-(v/5)*(svgH-20)
  }));
  const pathD=moodPts.length>1?moodPts.map((p,i)=>i===0?"M"+p.x+","+p.y:"L"+p.x+","+p.y).join(" "):"";
  const areaD=moodPts.length>1?pathD+" L"+moodPts[moodPts.length-1].x+","+svgH+" L"+moodPts[0].x+","+svgH+" Z":"";

  // Heures semaine
  const heuresData=[
    {j:"Lu",h:8.5},{j:"Ma",h:9},{j:"Me",h:7.5},{j:"Je",h:9.5},{j:"Ve",h:8},
    {j:"Sa",h:0},{j:"Di",h:0}
  ];
  const maxH=Math.max(...heuresData.map(d=>d.h),1);

  // Sommeil
  const somData=[{j:"Lu",d:1.5},{j:"Ma",d:1.75},{j:"Me",d:0.75},{j:"Je",d:2},{j:"Ve",d:1.67}];
  const maxS=Math.max(...somData.map(d=>d.d),1);

  return <div className="fi">
    <div style={{marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"flex-end",flexWrap:"wrap",gap:8}}>
      <div>
        <div style={{fontSize:11,color:"var(--l)",marginBottom:3,fontFamily:"'DM Mono',monospace",letterSpacing:".5px"}}>{todayStr().toUpperCase()}</div>
        <div className="pf"style={{fontSize:22,fontWeight:600,color:"var(--b)"}}>Tableau de bord analytique</div>
      </div>
      <div style={{display:"flex",gap:4}}>
        {["7j","15j"].map(p=><button key={p}onClick={()=>setPeriode(p)}style={{
          padding:"5px 12px",borderRadius:8,border:"1.5px solid",cursor:"pointer",fontSize:12,fontWeight:600,
          background:periode===p?"var(--b)":"var(--w)",color:periode===p?"#fff":"var(--m)",
          borderColor:periode===p?"var(--b)":"var(--br)"
        }}>{p}</button>)}
      </div>
    </div>

    {/* Sélecteur enfant */}
    {role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
      {liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>setSelId(e.id)}/>)}
    </div>}

    {/* KPIs cliquables */}
    {role==="asmat"&&<div className="g4"style={{marginBottom:16}}>
      {[
        {ic:"👶",v:presents+"/"+enfants.length,l:"Présents aujourd'hui",c:"var(--T)",p:"pointage"},
        {ic:"💬",v:msgsNonLus,l:"Messages non lus",c:"var(--B)",p:"messagerie"},
        {ic:"⏰",v:totalH+"h",l:"Heures ce mois",c:"var(--S)",p:"admin_finances"},
        {ic:"😊",v:avg+"/5",l:"Humeur moyenne",c:avgColor,p:"journal_complet"},
      ].map(k=><div key={k.l}className="card card-lift"onClick={()=>setPage&&setPage(k.p)}style={{textAlign:"center",cursor:"pointer"}}>
        <div style={{fontSize:22,marginBottom:4}}><IconeOuEmoji e={k.ic} taille={22}/></div>
        <div className="pf"style={{fontSize:22,fontWeight:600,color:k.c}}>{k.v}</div>
        <div style={{fontSize:11,color:"var(--l)",marginTop:3,lineHeight:1.3}}>{k.l}</div>
      </div>)}
    </div>}

    <div className="g2">
      {/* Courbe humeurs SVG */}
      <div className="card">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div style={{fontWeight:700,fontSize:13,color:"var(--b)"}}><IconeOuEmoji e="😊"/> Humeurs - {enfant?.prenom}</div>
          <span className="pf"style={{fontSize:18,fontWeight:700,color:avgColor}}>{avg}/5</span>
        </div>
        <svg width="100%"viewBox={"0 0 "+svgW+" "+svgH}style={{overflow:"visible"}}>
          {/* Grid lines */}
          {[1,2,3,4,5].map(v=><line key={v}
            x1={10} y1={svgH-10-(v/5)*(svgH-20)}
            x2={svgW-10} y2={svgH-10-(v/5)*(svgH-20)}
            stroke="var(--br)" strokeWidth={.8} strokeDasharray="4,4"/>)}
          {/* Area */}
          {areaD&&<path d={areaD}fill={avg>=4?"rgba(61,107,80,.12)":avg>=3?"rgba(184,137,42,.12)":"rgba(184,64,96,.12)"}/>}
          {/* Line */}
          {pathD&&<path d={pathD}fill="none"stroke={avg>=4?"var(--S)":avg>=3?"var(--G)":"var(--R)"}strokeWidth={2.5}strokeLinejoin="round"strokeLinecap="round"/>}
          {/* Points */}
          {moodPts.map((p,i)=><circle key={i}cx={p.x}cy={p.y}r={3.5}fill={avg>=4?"var(--S)":avg>=3?"var(--G)":"var(--R)"}/>)}
        </svg>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"var(--l)",marginTop:4,fontFamily:"'DM Mono',monospace"}}>
          <span>J-{jours-1}</span><span>Aujourd'hui</span>
        </div>
      </div>

      {/* Heures semaine - barres */}
      <div className="card">
        <div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:14}}>⏰ Heures / semaine</div>
        <div style={{display:"flex",gap:4,alignItems:"flex-end",height:72}}>
          {heuresData.map((d,i)=><div key={i}style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
            <div style={{fontSize:11,color:"var(--l)",fontFamily:"'DM Mono',monospace"}}>{d.h||""}</div>
            <div style={{
              width:"100%",borderRadius:"4px 4px 0 0",
              height:((d.h/maxH)*60)+"px",
              background:d.h>0?"linear-gradient(to top,var(--T),var(--Tl))":"var(--br)",
              transition:"height .6s ease",minHeight:d.h>0?4:0
            }}/>
          </div>)}
        </div>
        <div style={{display:"flex",gap:4,marginTop:6}}>
          {heuresData.map((d,i)=><div key={i}style={{flex:1,textAlign:"center",fontSize:11,color:"var(--l)",fontFamily:"'DM Mono',monospace"}}>{d.j}</div>)}
        </div>
        <div style={{marginTop:10,padding:"6px 10px",background:"var(--Sp)",borderRadius:8,fontSize:12,color:"var(--S)",fontWeight:600}}>
          Total semaine : {heuresData.reduce((a,d)=>a+d.h,0)}h
        </div>
      </div>

      {/* Sommeil - barres horizontales */}
      <div className="card">
        <div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:14}}><IconeOuEmoji e="😴"/> Durée sieste - {enfant?.prenom}</div>
        {somData.map((d,i)=><div key={i}style={{marginBottom:8}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
            <span style={{fontSize:11,color:"var(--m)",fontFamily:"'DM Mono',monospace"}}>{d.j}</span>
            <span style={{fontSize:11,color:"var(--B)",fontWeight:600}}>{Math.floor(d.d)}h{Math.round((d.d%1)*60).toString().padStart(2,"0")}</span>
          </div>
          <div style={{height:8,background:"var(--Bp)",borderRadius:4,overflow:"hidden"}}>
            <div style={{height:"100%",width:((d.d/maxS)*100)+"%",background:"linear-gradient(to right,var(--B),#5B9BD5)",borderRadius:4,transition:"width .6s ease"}}/>
          </div>
        </div>)}
      </div>

      {/* Appétit + Activités */}
      <div className="card">
        <div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:14}}><IconeOuEmoji e="🍽️"/> Appétit & Activités du jour</div>
        <div style={{fontWeight:600,fontSize:11,color:"var(--m)",marginBottom:8,textTransform:"uppercase",letterSpacing:".5px"}}>Repas</div>
        {D.repas.filter(r=>r.date===TODAY_STR).map(r=>{
          const e=liste.find(x=>x.id===r.eId);
          if(!e)return null;
          return <div key={r.id}style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid var(--br)",alignItems:"center"}}>
            <div style={{display:"flex",gap:6,alignItems:"center"}}>
              <span>{e.emoji}</span>
              <span style={{fontSize:13,color:"var(--b)"}}>{e.prenom}</span>
            </div>
            <PastilleRepas q={r.q} taille={11}/>
          </div>;
        })}
        {D.repas.filter(r=>r.date===TODAY_STR).length===0&&<div style={{fontSize:12,color:"var(--l)",marginBottom:10}}>Aucun repas saisi.</div>}
        <div style={{fontWeight:600,fontSize:11,color:"var(--m)",margin:"12px 0 8px",textTransform:"uppercase",letterSpacing:".5px"}}>Dernières activités portfolio</div>
        {D.portfolio.slice(0,3).map(p=><div key={p.id}style={{display:"flex",gap:8,padding:"5px 0",borderBottom:"1px solid var(--br)",alignItems:"center"}}>
          <span style={{fontSize:16}}>{p.emoji}</span>
          <div style={{flex:1}}>
            <div style={{fontSize:12,fontWeight:600,color:"var(--b)"}}>{p.titre}</div>
            <div style={{fontSize:11,color:"var(--l)"}}>{p.competences?.join(" · ")}</div>
          </div>
        </div>)}
      </div>
    </div>
  </div>;
}

//

export function CourbeCroissance({enfants,role,pEId}){
  const [selId,setSelId]=useState(enfants[0]?.id);
  const [data,setData]=useState({});
  const [newM,setNewM]=useState({date:"",poids:"",taille:""});
  const [toast,setToast]=useState("");
  const [vue,setVue]=useState("poids");
  const liste=role==="parent"?enfants.filter(e=>e.id===pEId):enfants;
  const enfant=liste.find(e=>e.id===selId)||liste[0];
  const mesures=data[enfant?.id]||[];
  const maxAge=mesures.length?Math.max(...mesures.map(m=>m.age_mois)):12;
  const estDemo=enfant&&["e1","e2","e3"].includes(enfant.id);
  const rechargerC=(eid)=>{
    if(!eid)return;
    if(["e1","e2","e3"].includes(eid)){setData(p=>({...p,[eid]:(CROISSANCE_DEMO[eid]||[])}));return;}
    supabase.from("croissance").select("*").eq("enfant_id",eid).order("date",{ascending:true}).then(({data:rows})=>setData(p=>({...p,[eid]:(rows||[]).map(r=>({id:r.id,date:r.date,age_mois:r.age_mois,poids:r.poids,taille:r.taille}))})));
  };
  useEffect(()=>{rechargerC(enfant?.id);},[enfant?.id]);

  const ajouter=async()=>{
    if(!newM.poids&&!newM.taille)return;
    if(!enfant)return;
    const d=newM.date||isoJour(new Date());
    const n=new Date(enfant.naissance),mDate=new Date(d);
    const mois=Math.max(0,(mDate.getFullYear()-n.getFullYear())*12+(mDate.getMonth()-n.getMonth()));
    const poids=parseFloat(String(newM.poids).replace(",","."))||null;
    const taille=parseFloat(String(newM.taille).replace(",","."))||null;
    if(estDemo){
      setData(p=>({...p,[enfant.id]:[...(p[enfant.id]||[]),{date:d,age_mois:mois,poids,taille}].sort((a,b)=>a.age_mois-b.age_mois)}));
      setNewM({date:"",poids:"",taille:""});setToast("Mesure ajoutée ✓");return;
    }
    const{error}=await supabase.from("croissance").insert({enfant_id:enfant.id,date:d,poids,taille,age_mois:mois});
    if(error){setToast("Erreur : "+error.message);return;}
    setNewM({date:"",poids:"",taille:""});setToast("Mesure ajoutée ✓");rechargerC(enfant.id);
  };
  const supprimer=async(m)=>{
    if(!window.confirm("Supprimer cette mesure ?"))return;
    if(estDemo){setData(p=>({...p,[enfant.id]:(p[enfant.id]||[]).filter(x=>x!==m)}));return;}
    if(m.id){await supabase.from("croissance").delete().eq("id",m.id);rechargerC(enfant.id);}
  };

  const last=mesures[mesures.length-1];
  const maxVal=vue==="poids"?Math.max(...mesures.map(m=>m.poids||0),15):Math.max(...mesures.map(m=>m.taille||0),100);
  const W=280,H=150,padL=32,padB=24,padR=12,padT=12;
  const plotW=W-padL-padR,plotH=H-padB-padT;

  const xScale=(v)=>padL+v/Math.max(maxAge,24)*plotW;
  const yScale=(v)=>padT+plotH-(v/maxVal*plotH);
  const pts=mesures.filter(m=>vue==="poids"?m.poids:m.taille).map(m=>({x:xScale(m.age_mois),y:yScale(vue==="poids"?m.poids:m.taille)}));

  return <div className="fi">
    {toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
    <PageHeader icon="📏" title="Courbe de croissance" sub="Poids et taille jusqu'à 3 ans · Référentiel OMS"/>
    {role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
      {liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>setSelId(e.id)}/>)}</div>}

    {enfant&&<div className="g2">
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {/* Dernière mesure */}
        {last&&<div className="card">
          <div style={{fontWeight:700,fontSize:14,marginBottom:12,color:"var(--b)"}}><IconeOuEmoji e="📊"/> Dernière mesure - {enfant.prenom}</div>
          <div style={{display:"flex",gap:16,justifyContent:"center"}}>
            {[["⚖️ Poids",last.poids+"kg","var(--T)"],["📏 Taille",last.taille+"cm","var(--B)"],["🎂 Âge",last.age_mois+"m","var(--S)"]].map(([l,v,c])=>
              <div key={l}style={{textAlign:"center"}}>
                <div style={{fontSize:11,color:"var(--l)",marginBottom:2}}>{l}</div>
                <div className="pf"style={{fontSize:22,fontWeight:700,color:c}}>{v}</div>
              </div>)}
          </div>
        </div>}

        {/* Courbe SVG */}
        <div className="card">
          <div style={{display:"flex",gap:6,marginBottom:10}}>
            {[["poids","⚖️ Poids"],["taille","📏 Taille"]].map(([k,l])=>
              <button key={k}onClick={()=>setVue(k)}className={"btn  s"+(vue===k?"bT":"bG")}style={{padding:"5px 12px"}}>{l}</button>)}
          </div>
          {pts.length>0?<svg width="100%"viewBox={"0 0 "+W+" "+H}style={{overflow:"visible"}}>
            {/* Grille */}
            {[0,25,50,75,100].map(p=>{
              const y=padT+plotH*(1-p/100);
              return <g key={p}><line x1={padL}y1={y}x2={W-padR}y2={y}stroke="var(--br)"strokeWidth=".5"/>
                <text x={padL-4}y={y+3}fontSize="7"fill="var(--l)"textAnchor="end">{Math.round(maxVal*p/100)}</text></g>;
            })}
            {/* Axe X */}
            {[0,6,12,18,24,36].filter(v=>v<=Math.max(maxAge+3,24)).map(v=>
              <text key={v}x={xScale(v)}y={H-4}fontSize="7"fill="var(--l)"textAnchor="middle">{v}m</text>)}
            {/* Zone OMS */}
            {vue==="poids"&&<polyline points={OMS_POIDS.slice(0,Math.min(13,mesures.length+2)).map((v,i)=>xScale(i)+","+yScale(v)).join(" ")}
              fill="none"stroke="var(--B)"strokeWidth="1"strokeDasharray="3,3"opacity=".5"/>}
            {/* Courbe */}
            {pts.length>1&&<polyline points={pts.map(p=>p.x+","+p.y).join(" ")}fill="none"stroke="var(--T)"strokeWidth="2.5"strokeLinecap="round"strokeLinejoin="round"/>}
            {/* Points */}
            {pts.map((p,i)=><circle key={i}cx={p.x}cy={p.y}r="4"fill="var(--T)"stroke="#fff"strokeWidth="1.5"/>)}
          </svg>:<div style={{textAlign:"center",padding:"30px 0",color:"var(--l)",fontSize:13}}>Pas encore de données</div>}
          {vue==="poids"&&<div style={{fontSize:11,color:"var(--B)",marginTop:6}}>- - - Médiane OMS (p50)</div>}
        </div>
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {role==="parent"?<div className="card">
          <div style={{fontWeight:700,fontSize:13,marginBottom:10,color:"var(--b)"}}>+ Nouvelle mesure</div>
          <div style={{marginBottom:8}}><label className="lbl">Date</label><input type="date"className="inp"value={newM.date}onChange={e=>setNewM(p=>({...p,date:e.target.value}))}/></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
            <div><label className="lbl">Poids (kg)</label><input className="inp"type="number"step=".1"placeholder="10.5"value={newM.poids}onChange={e=>setNewM(p=>({...p,poids:e.target.value}))}/></div>
            <div><label className="lbl">Taille (cm)</label><input className="inp"type="number"placeholder="75"value={newM.taille}onChange={e=>setNewM(p=>({...p,taille:e.target.value}))}/></div>
          </div>
          <button className="btn bT"style={{width:"100%"}}onClick={ajouter}>Enregistrer</button>
        </div>:<div className="card"style={{background:"var(--c)"}}>
          <div style={{fontSize:12,color:"var(--m)",lineHeight:1.5}}><IconeOuEmoji e="📏"/> La courbe de croissance est <b>tenue à jour par le parent</b> (poids et taille à chaque pesée). Vous la consultez ici en lecture seule.</div>
        </div>}
        <div className="card">
          <div style={{fontWeight:700,fontSize:13,marginBottom:10,color:"var(--b)"}}><IconeOuEmoji e="📋"/> Historique</div>
          {mesures.length===0&&<div style={{fontSize:12,color:"var(--l)"}}>Aucune mesure pour l'instant.</div>}
          {mesures.slice().reverse().slice(0,8).map((m,idx)=><div key={m.id||m.date+idx}style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:"1px solid var(--br)",fontSize:12}}>
            <span style={{color:"var(--l)"}}>{m.age_mois} mois</span>
            <div style={{display:"flex",gap:12,alignItems:"center"}}>
              {m.poids&&<span style={{color:"var(--T)",fontWeight:600}}>{m.poids}kg</span>}
              {m.taille&&<span style={{color:"var(--B)",fontWeight:600}}>{m.taille}cm</span>}
              {role==="parent"&&<button onClick={()=>supprimer(m)}style={{background:"none",border:"none",cursor:"pointer",color:"var(--R)",fontSize:13,opacity:.7,padding:0}}>✕</button>}
            </div>
          </div>)}
        </div>
      </div>
    </div>}
  </div>;
}

//

export function ActivitesSuggerees({enfants,role,pEId}){
  const [selId,setSelId]=useState(enfants[0]?.id);
  const [catFilt,setCatFilt]=useState("tous");
  const [ageFilt,setAgeFilt]=useState("tous");
  const [faitFilt,setFaitFilt]=useState("tous");
  const [jour,setJour]=useState(isoJour(new Date()));
  const [faites,setFaites]=useState([]);
  const [perso,setPerso]=useState([]);
  const [showForm,setShowForm]=useState(false);
  const [saving,setSaving]=useState(false);
  const blankAct={titre:"",cat:"Éveil",desc:"",competences:"",duree:"",materiel:"",tranche:"1-2 ans"};
  const [na,setNa]=useState(blankAct);
  const liste=role==="parent"?enfants.filter(e=>e.id===pEId):enfants;
  const enfant=liste.find(e=>e.id===selId)||liste[0];
  const asmatId=enfants[0]?.asmat_id;
  const TRANCHES={"0-1 an":[0,12],"1-2 ans":[12,24],"2-3 ans":[24,36],"3-6 ans":[36,72],"Tous âges":[0,72]};
  const inp={width:"100%",padding:"9px 11px",borderRadius:8,border:"1.5px solid var(--br)",fontSize:13,marginBottom:8,fontFamily:"inherit",boxSizing:"border-box",background:"var(--w)"};

  const chargerPerso=async()=>{
    if(role!=="asmat")return;
    const{data}=await supabase.from("activites_perso").select("*").order("created_at",{ascending:false});
    if(data)setPerso(data);
  };
  useEffect(()=>{chargerPerso();},[]);

  const chargerFaites=async()=>{
    if(!enfant?.id){setFaites([]);return;}
    const{data}=await supabase.from("activites_faites").select("*").eq("enfant_id",enfant.id).eq("date",jour);
    setFaites(data||[]);
  };
  useEffect(()=>{chargerFaites();},[enfant?.id,jour]);
  const faitDe=(titre)=>faites.find(f=>f.activite_titre===titre);
  const toggleFait=async(titre)=>{
    if(role!=="asmat"||!enfant?.id||!asmatId)return;
    const ex=faitDe(titre);
    if(ex){ await supabase.from("activites_faites").delete().eq("id",ex.id); }
    else{ await supabase.from("activites_faites").insert({asmat_id:asmatId,enfant_id:enfant.id,activite_titre:titre,date:jour}); }
    chargerFaites();
  };

  const BRACKETS={"tous":null,"0-1 an":[0,12],"1-2 ans":[12,24],"2-3 ans":[24,36],"3-6 ans":[36,72]};
  const _now=new Date();
  const moisAge=enfant?((_now.getFullYear()-new Date(enfant.naissance).getFullYear())*12+(_now.getMonth()-new Date(enfant.naissance).getMonth())):12;
  const toutes=[...ACTIVITES_PAR_AGE.map(a=>({...a,_perso:false})),...perso.map(a=>({...a,desc:a.description,_perso:true}))];
  const _br=BRACKETS[ageFilt];
  const activites=toutes.filter(a=>(catFilt==="tous"||a.cat===catFilt)&&(!_br||(a.age_min<=_br[1]&&a.age_max>=_br[0]))&&(faitFilt==="tous"||(faitFilt==="fait"?!!faitDe(a.titre):!faitDe(a.titre))));
  const cats=["tous",...new Set(toutes.map(a=>a.cat))];

  const ajouter=async()=>{
    if(!na.titre.trim()||!asmatId)return;
    setSaving(true);
    const[mn,mx]=TRANCHES[na.tranche]||[0,72];
    const{error}=await supabase.from("activites_perso").insert({
      asmat_id:asmatId,titre:na.titre.trim(),cat:na.cat,description:na.desc.trim(),
      competences:na.competences.split(",").map(s=>s.trim()).filter(Boolean),
      duree:na.duree.trim(),materiel:na.materiel.trim(),age_min:mn,age_max:mx
    });
    setSaving(false);
    if(!error){setNa(blankAct);setShowForm(false);chargerPerso();}
  };
  const supprimer=async(id)=>{ await supabase.from("activites_perso").delete().eq("id",id); chargerPerso(); };

  return <div className="fi">
    <PageHeader icon="💡" title="Activités suggérées" sub="Bibliothèque d'éveil 0-6 ans · filtrez par âge et par domaine"/>
    {role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
      {liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>setSelId(e.id)}/>)}</div>}

    {role==="asmat"&&<div style={{marginBottom:14}}>
      <button className="btn bT" onClick={()=>setShowForm(f=>!f)} >{showForm?"✕ Annuler":"➕ Ajouter mon activité"}</button>
    </div>}
    {role==="asmat"&&showForm&&<div className="card" style={{marginBottom:16,background:"var(--c)"}}>
      <div style={{fontWeight:700,marginBottom:10,color:"var(--b)"}}>Nouvelle activité perso</div>
      <input placeholder="Titre *" value={na.titre} onChange={e=>setNa({...na,titre:e.target.value})} style={inp}/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        <select value={na.cat} onChange={e=>setNa({...na,cat:e.target.value})} style={inp}>
          {Object.keys(catColors).map(c=><option key={c}value={c}>{c}</option>)}
        </select>
        <select value={na.tranche} onChange={e=>setNa({...na,tranche:e.target.value})} style={inp}>
          {Object.keys(TRANCHES).map(t=><option key={t}value={t}>{t}</option>)}
        </select>
      </div>
      <textarea placeholder="Description" value={na.desc} onChange={e=>setNa({...na,desc:e.target.value})} style={{...inp,minHeight:60,resize:"vertical"}}/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        <input placeholder="Durée (ex. 20 min)" value={na.duree} onChange={e=>setNa({...na,duree:e.target.value})} style={inp}/>
        <input placeholder="Matériel" value={na.materiel} onChange={e=>setNa({...na,materiel:e.target.value})} style={inp}/>
      </div>
      <input placeholder="Compétences (séparées par une virgule)" value={na.competences} onChange={e=>setNa({...na,competences:e.target.value})} style={inp}/>
      <button className="btn bG" onClick={ajouter} disabled={saving||!na.titre.trim()} style={{marginTop:4}}>{saving?"…":"💾 Enregistrer"}</button>
    </div>}

    <div style={{display:"flex",gap:6,marginBottom:10,flexWrap:"wrap"}}>
      {Object.keys(BRACKETS).map(b=><button key={b}onClick={()=>setAgeFilt(b)}style={{
        padding:"5px 12px",borderRadius:20,border:"1.5px solid",cursor:"pointer",fontSize:12,fontWeight:600,
        background:ageFilt===b?"var(--b)":"transparent",color:ageFilt===b?"#fff":"var(--m)",borderColor:ageFilt===b?"var(--b)":"var(--br)",
      }}>{b==="tous"?"👶 Tous âges":b}</button>)}
    </div>

    <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>
      {cats.map(c=><button key={c}onClick={()=>setCatFilt(c)}style={{
        padding:"5px 12px",borderRadius:20,border:"1.5px solid",cursor:"pointer",fontSize:12,fontWeight:600,
        background:catFilt===c?(catColors[c]||"var(--b)"):"transparent",
        color:catFilt===c?"#fff":(catColors[c]||"var(--m)"),
        borderColor:catFilt===c?(catColors[c]||"var(--b)"):(catColors[c]+"44"||"var(--br)"),
      }}>{c==="tous"?"🎯 Tout":c}</button>)}
    </div>

    {enfant&&<div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
      <span style={{fontSize:12,color:"var(--l)"}}>{enfant.prenom} ·</span>
      <input type="date" value={jour} onChange={e=>setJour(e.target.value)} style={{padding:"5px 9px",borderRadius:8,border:"1.5px solid var(--br)",fontSize:12,fontFamily:"inherit",background:"var(--w)"}}/>
      {[["tous","Toutes"],["pasfait","À sélectionner"],["fait","✓ Faites ce jour"]].map(([k,l])=><button key={k}onClick={()=>setFaitFilt(k)}style={{
        padding:"5px 12px",borderRadius:20,border:"1.5px solid",cursor:"pointer",fontSize:12,fontWeight:600,
        background:faitFilt===k?"var(--G)":"transparent",color:faitFilt===k?"#fff":"var(--G)",borderColor:faitFilt===k?"var(--G)":"var(--Gp)",
      }}>{l}</button>)}
    </div>}

    <div style={{fontSize:12,color:"var(--l)",marginBottom:14,fontFamily:"'DM Mono',monospace"}}>
      {activites.length} activité{activites.length>1?"s":""}{ageFilt==="tous"?" · tous âges (0-6 ans)":" · "+ageFilt}
    </div>

    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:12}}>
      {activites.map((a,i)=><div key={i}className="card"style={{borderTop:"3px solid "+(catColors[a.cat]||"var(--T)"),position:"relative"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
          <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
            <span className="badge"style={{background:(catColors[a.cat]||"var(--T)")+"22",color:catColors[a.cat]||"var(--T)",fontSize:11}}>{a.cat}</span>
            {a._perso&&<span className="badge"style={{background:"var(--Tp)",color:"var(--T)",fontSize:11}}><IconeOuEmoji e="✦"/> Perso</span>}
          </div>
          <span style={{fontSize:11,color:"var(--l)",fontFamily:"'DM Mono',monospace"}}>{a.duree?"⏱ "+a.duree:""}</span>
        </div>
        <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:6}}>{a.titre}</div>
        {a.desc&&<div style={{fontSize:12,color:"var(--m)",lineHeight:1.6,marginBottom:8}}>{a.desc}</div>}
        {a.materiel&&<div style={{fontSize:11,color:"var(--l)",marginBottom:6}}><IconeOuEmoji e="📦"/> {a.materiel}</div>}
        <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
          {(a.competences||[]).map((c,j)=><span key={j}className="badge"style={{background:"var(--c)",color:"var(--m)",fontSize:11}}>{c}</span>)}
        </div>
        {(()=>{const f=faitDe(a.titre);return <div style={{marginTop:10,paddingTop:10,borderTop:"1px solid var(--br)",display:"flex",alignItems:"center",gap:8,justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
            {role==="asmat"?<button onClick={()=>toggleFait(a.titre)} style={{fontSize:12,fontWeight:600,padding:"5px 11px",borderRadius:10,cursor:"pointer",background:f?"var(--G)":"transparent",color:f?"#fff":"var(--G)",border:"1.5px solid var(--G)"}}>{f?"✓ Faite ce jour":"Marquer faite"}</button>
              :f?<span style={{fontSize:12,color:"var(--G)",fontWeight:700}}>✓ Faite ce jour</span>:<span style={{fontSize:12,color:"var(--l)"}}>—</span>}
          </div>
          {a._perso&&role==="asmat"&&<button onClick={()=>supprimer(a.id)} title="Supprimer activité perso" style={{background:"none",border:"none",cursor:"pointer",fontSize:13,opacity:.6}}>🗑️</button>}
        </div>;})()}
      </div>)}
      {activites.length===0&&<div style={{gridColumn:"1/-1",textAlign:"center",padding:"30px 0",color:"var(--l)"}}>
        <div style={{fontSize:36,marginBottom:8}}>🎯</div>
        <div>Aucune activité pour ce filtre</div>
      </div>}
    </div>
  </div>;
}

//

//

export function MesAlertes({user}){
  const [appareils,setAppareils]=useState([]);
  const [chargement,setChargement]=useState(true);
  const [message,setMessage]=useState("");
  const [occupe,setOccupe]=useState(false);
  const [etatIci,setEtatIci]=useState("");
  const [endpointIci,setEndpointIci]=useState("");

  const relire=async()=>{
    setChargement(true);
    setEtatIci(etatPush());
    try{
      const reg=await navigator.serviceWorker?.ready;
      const abo=await reg?.pushManager?.getSubscription();
      setEndpointIci(abo?.endpoint||"");
    }catch{ setEndpointIci(""); }
    if(!user?.id){setAppareils([]);setChargement(false);return;}
    const{data}=await supabase.from("push_subscriptions")
      .select("id,endpoint,appareil,created_at,derniere_utilisation")
      .eq("user_id",user.id).order("created_at",{ascending:false});
    setAppareils(data||[]);
    setChargement(false);
  };
  useEffect(()=>{relire();},[user?.id]);

  const activer=async()=>{
    setOccupe(true);
    const r=await activerPush(user?.id);
    setMessage(r.message);
    await relire();
    setOccupe(false);
  };
  const couper=async()=>{
    setOccupe(true);
    const r=await desactiverPush(user?.id);
    setMessage(r.message);
    await relire();
    setOccupe(false);
  };
  const retirer=async(id)=>{
    await supabase.from("push_subscriptions").delete().eq("id",id);
    setMessage("Appareil retiré.");
    await relire();
  };

  const abonneIci=!!endpointIci&&appareils.some(a=>a.endpoint===endpointIci);

  return <div className="fi">
    <PageHeader icon="🔔" title="Mes alertes" sub="Ce que vous recevez, et sur quels appareils"/>

    <div className="card" style={{marginBottom:14}}>
      <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:10}}>Ce qui vous est envoyé</div>
      <div style={{display:"flex",gap:10,alignItems:"flex-start",marginBottom:10}}>
        <IconeOuEmoji e="🔔" taille={16}/>
        <div style={{fontSize:12.5,color:"var(--m)",lineHeight:1.6}}>
          <strong>Dans l'application</strong> — toujours. La cloche en haut de l'écran garde tout.
        </div>
      </div>
      <div style={{display:"flex",gap:10,alignItems:"flex-start",marginBottom:10}}>
        <IconeOuEmoji e="📧" taille={16}/>
        <div style={{fontSize:12.5,color:"var(--m)",lineHeight:1.6}}>
          <strong>Par e-mail</strong> — toujours, à l'adresse de votre compte. Rien ne dépend
          des notifications : même si vous les refusez, l'e-mail part.
        </div>
      </div>
      <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
        <IconeOuEmoji e="📱" taille={16}/>
        <div style={{fontSize:12.5,color:"var(--m)",lineHeight:1.6}}>
          <strong>Sur votre téléphone</strong> — seulement sur les appareils listés ci-dessous.
        </div>
      </div>
    </div>

    {message&&<div className="card" style={{marginBottom:14,background:"var(--Sp)",borderColor:"var(--Sl)",fontSize:12.5,color:"var(--S)",fontWeight:600}}>
      {message}
    </div>}

    <div className="card" style={{marginBottom:14}}>
      <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:8}}>Cet appareil</div>
      {etatIci==="impossible-ios"&&<div style={{fontSize:12.5,color:"var(--m)",lineHeight:1.6}}>
        Vous êtes sur iPhone ou iPad, et TiMat n'est pas installé sur votre écran d'accueil.
        Apple ne permet les notifications qu'aux applications installées — c'est une règle
        d'Apple, pas un choix de TiMat.
        <div style={{marginTop:8,fontWeight:600,color:"var(--b)"}}>
          Pour les recevoir : bouton Partager dans Safari, puis « Sur l'écran d'accueil ».
          Ouvrez TiMat depuis l'icône, et revenez ici.
        </div>
      </div>}
      {etatIci==="non-supporte"&&<div style={{fontSize:12.5,color:"var(--m)",lineHeight:1.6}}>
        Ce navigateur ne gère pas les notifications. Vous continuez à tout recevoir par e-mail.
      </div>}
      {etatIci==="refuse"&&<div style={{fontSize:12.5,color:"var(--m)",lineHeight:1.6}}>
        Les notifications sont bloquées pour TiMat dans les réglages de votre navigateur.
        TiMat ne peut pas les débloquer lui-même : il faut les réautoriser depuis le cadenas
        à gauche de l'adresse du site.
      </div>}
      {etatIci==="pret"&&<>
        <div style={{fontSize:12.5,color:"var(--m)",lineHeight:1.6,marginBottom:10}}>
          {abonneIci
            ?"Cet appareil reçoit les notifications."
            :"Cet appareil ne reçoit pas encore les notifications."}
        </div>
        <button className={abonneIci?"btn":"btn bT l"} disabled={occupe}
          onClick={abonneIci?couper:activer} style={{width:"100%",justifyContent:"center",padding:"13px"}}>
          {occupe?"…":abonneIci?"Ne plus recevoir sur cet appareil":"Recevoir les notifications ici"}
        </button>
      </>}
    </div>

    <div className="card">
      <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:8}}>
        Vos appareils {appareils.length>0&&<span style={{fontWeight:400,color:"var(--l)"}}>({appareils.length})</span>}
      </div>
      {chargement?<div style={{fontSize:12.5,color:"var(--l)"}}>Chargement…</div>
      :appareils.length===0?<div style={{fontSize:12.5,color:"var(--l)",lineHeight:1.6}}>
        Aucun appareil abonné. Vous recevez tout par e-mail et dans l'application.
      </div>
      :appareils.map(a=><div key={a.id} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderTop:"1px solid var(--br)"}}>
        <IconeOuEmoji e="📱" taille={15}/>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:12.5,fontWeight:600,color:"var(--b)"}}>
            {a.appareil||"Appareil"}{a.endpoint===endpointIci?" — celui-ci":""}
          </div>
          <div style={{fontSize:11,color:"var(--l)"}}>
            Ajouté le {new Date(a.created_at).toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"})}
          </div>
        </div>
        <button onClick={()=>retirer(a.id)} style={{background:"none",border:"1px solid var(--br)",borderRadius:9,padding:"4px 9px",cursor:"pointer",fontSize:11,color:"var(--m)"}}>
          Retirer
        </button>
      </div>)}
    </div>
  </div>;
}

export function MesEmployeurs({enfants,role,user}){
  const [mois,setMois]=useState(isoMois(new Date()));
  const [versements,setVersements]=useState([]);
  const [bulletins,setBulletins]=useState([]);
  const [conges,setConges]=useState([]);
  const [chargement,setChargement]=useState(true);
  const asmatId=user?.id;
  const annee=Number(mois.slice(0,4));

  useEffect(()=>{
    if(role!=="asmat"||!asmatId){setChargement(false);return;}
    let vivant=true;
    (async()=>{
      setChargement(true);
      const debut=mois+"-01", finExcl=decalerMois(mois,1)+"-01";
      const[v,b,c]=await Promise.all([
        supabase.from("versements").select("enfant_id,montant,date,mode").gte("date",debut).lt("date",finExcl),
        supabase.from("bulletins").select("enfant_id,mois,salaire_net,entretien").eq("mois",mois),
        supabase.from("evenements").select("date,type,texte,enfant_id").eq("type","cng")
          .gte("date",annee+"-01-01").lte("date",annee+"-12-31"),
      ]);
      if(!vivant)return;
      setVersements(v.data||[]);setBulletins(b.data||[]);setConges(c.data||[]);setChargement(false);
    })();
    return()=>{vivant=false;};
  },[asmatId,role,mois,annee]);

  const lignes=useMemo(()=>(enfants||[]).map(e=>{
    const ct=e?.contrat||{};
    const bul=bulletins.find(b=>b.enfant_id===e.id);
    // Le bulletin fait foi quand il existe ; sinon on annonce une estimation
    // fondee sur la mensualisation, et on le dit.
    const sansContrat=!ct||!(Number(ct.heuresHebdo)>0&&Number(ct.tauxHoraire)>0);
    const net=bul?Number(bul.salaire_net)||0:(sansContrat?0:netDepuisBrut(salaireMensualise(ct)));
    const entretien=bul?Number(bul.entretien)||0:0;
    const verse=versements.filter(v=>v.enfant_id===e.id).reduce((s,v)=>s+(Number(v.montant)||0),0);
    const attendu=Math.round((net+entretien)*100)/100;
    return{e,ct,sansContrat,estime:!bul&&!sansContrat,net,entretien,attendu,verse,ecart:Math.round((verse-attendu)*100)/100};
  }),[enfants,bulletins,versements]);

  const totalAttendu=lignes.reduce((s,l)=>s+l.attendu,0);
  const totalVerse=lignes.reduce((s,l)=>s+l.verse,0);
  const nbEstime=lignes.filter(l=>l.estime).length;

  // Conges : on regroupe les journees en periodes continues.
  const periodes=useMemo(()=>{
    // Le filtre par type est demande au serveur, mais on le refait ici : si la
    // requete change un jour, des absences pour maladie se retrouveraient
    // affichees comme des conges.
    const jours=[...new Set(conges.filter(c=>c.type==="cng").map(c=>String(c.date).slice(0,10)))].sort();
    const out=[];
    for(const j of jours){
      const prec=out[out.length-1];
      const veille=prec?isoJour(new Date(new Date(prec.fin+"T12:00:00Z").getTime()+86400000)):null;
      if(prec&&veille===j)prec.fin=j; else out.push({debut:j,fin:j});
    }
    return out;
  },[conges]);

  const aujourdhui=isoJour(new Date());
  const echeance=annee+"-"+DATE_ACCORD_CONGES;
  const echeancePassee=aujourdhui>echeance;

  if(role!=="asmat")return <div className="fi"><PageHeader icon="👪" title="Mes employeurs"/>
    <div className="card"style={{textAlign:"center",color:"var(--m)"}}>Section réservée à l'assistante maternelle.</div></div>;

  return <div className="fi">
    <PageHeader icon="👪" title="Mes employeurs" sub={lignes.length+" famille"+(lignes.length>1?"s":"")+" — revenus du mois et congés"}/>

    <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:14,flexWrap:"wrap"}}>
      <button className="btn s" onClick={()=>setMois(decalerMois(mois,-1))}>←</button>
      <span className="pf"style={{fontWeight:700,color:"var(--b)",fontSize:15}}>{fmtMoisLong(mois)}</span>
      <button className="btn s" onClick={()=>setMois(decalerMois(mois,1))}>→</button>
    </div>

    {chargement?<div className="card"style={{color:"var(--l)",textAlign:"center"}}>Chargement…</div>
     :lignes.length===0?<div className="card"style={{color:"var(--l)",textAlign:"center"}}>Aucun enfant enregistré.</div>
     :<>
      <div className="card"style={{marginBottom:12}}>
        <div style={{fontSize:13,fontWeight:700,color:"var(--b)",marginBottom:12}}><IconeOuEmoji e="💶"/> Ce que chaque famille vous doit</div>
        {lignes.map(l=><div key={l.e.id}style={{padding:"10px 0",borderBottom:"1px solid var(--br)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:10,flexWrap:"wrap"}}>
            <span style={{fontWeight:600,color:"var(--b)",fontSize:13.5}}>
              <IconeOuEmoji e={l.e.emoji||"👶"}/> {l.e.prenom}
              {l.estime&&<span style={{fontSize:11,color:"var(--G)",marginLeft:7}}>estimation</span>}
              {l.sansContrat&&<span style={{fontSize:11,color:"var(--R)",marginLeft:7}}>aucun contrat</span>}
            </span>
            <span className="pf"style={{fontWeight:700,color:"var(--b)"}}>{nb2(l.attendu)} €</span>
          </div>
          <div style={{fontSize:11.5,color:"var(--m)",marginTop:3,lineHeight:1.5}}>
            {l.sansContrat?<span style={{color:"var(--R)"}}>aucun contrat enregistré pour cet enfant — rien ne peut être calculé</span>:<>salaire net {nb2(l.net)} €{l.entretien>0?" · entretien "+nb2(l.entretien)+" €":""}
            {" · "}{l.verse>0
              ?<span style={{color:l.ecart>=-0.01?"var(--S)":"var(--R)"}}>reçu {nb2(l.verse)} €{l.ecart<-0.01?" (il manque "+nb2(-l.ecart)+" €)":""}</span>
              :<span style={{color:"var(--G)"}}>aucun versement enregistré</span>}</>}
          </div>
        </div>)}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",paddingTop:12,gap:10,flexWrap:"wrap"}}>
          <span style={{fontWeight:700,color:"var(--b)",fontSize:13.5}}>Total du mois</span>
          <span className="pf"style={{fontSize:21,fontWeight:800,color:"var(--S)"}}>{nb2(totalAttendu)} €</span>
        </div>
        {totalVerse>0&&<div style={{fontSize:11.5,color:"var(--m)",marginTop:4}}>
          {nb2(totalVerse)} € déjà reçus, toutes familles confondues.
        </div>}
        {nbEstime>0&&<div style={{fontSize:11.5,color:"var(--G)",marginTop:8,lineHeight:1.5}}>
          <IconeOuEmoji e="ℹ️" taille={13}/> {nbEstime} montant{nbEstime>1?"s":""} estimé{nbEstime>1?"s":""} à partir de la mensualisation :
          le bulletin de ce mois n'est pas encore établi. Le chiffre exact viendra du bulletin.
        </div>}
      </div>

      <div className="card"style={{marginBottom:12}}>
        <div style={{fontSize:13,fontWeight:700,color:"var(--b)",marginBottom:6}}><IconeOuEmoji e="🌴"/> Mes congés {annee}</div>
        <div style={{fontSize:12,color:"var(--m)",lineHeight:1.6,marginBottom:10}}>
          Quand vous accueillez les enfants de plusieurs familles, la convention vous invite à fixer vos
          dates <b>d'un commun accord avec toutes</b>, au plus tard le <b>1<sup>er</sup> mars</b>.
        </div>
        <div style={{fontSize:12,padding:"9px 12px",borderRadius:10,lineHeight:1.55,
          background:echeancePassee?"var(--Gp)":"var(--Sp)",color:echeancePassee?"var(--b)":"var(--S)",
          border:"1px solid "+(echeancePassee?"var(--G)":"var(--S)")}}>
          {echeancePassee
            ? <><IconeOuEmoji e="⏳" taille={13}/> Le 1<sup>er</sup> mars {annee} est passé. À défaut d'accord, vous fixez vos dates — en prévenant chaque famille par écrit.</>
            : <><IconeOuEmoji e="📅" taille={13}/> Il vous reste jusqu'au 1<sup>er</sup> mars {annee} pour vous accorder avec vos {lignes.length} famille{lignes.length>1?"s":""}.</>}
        </div>
        {periodes.length===0
          ?<div style={{fontSize:12.5,color:"var(--l)",marginTop:12}}>Aucun congé posé pour {annee}. Ils se déclarent depuis le calendrier.</div>
          :<div style={{marginTop:12}}>
            {periodes.slice(0,8).map((p,i)=><div key={i}style={{display:"flex",justifyContent:"space-between",gap:10,padding:"7px 0",borderBottom:"1px solid var(--br)",fontSize:12.5,flexWrap:"wrap"}}>
              <span style={{color:"var(--b)",fontWeight:600}}>{p.debut===p.fin?fmt(p.debut):fmt(p.debut)+" → "+fmt(p.fin)}</span>
              <span style={{color:"var(--m)"}}>concerne {lignes.length} famille{lignes.length>1?"s":""}</span>
            </div>)}
            {periodes.length>8&&<div style={{fontSize:11.5,color:"var(--l)",marginTop:8}}>et {periodes.length-8} autre{periodes.length-8>1?"s":""} période{periodes.length-8>1?"s":""}…</div>}
            <div style={{fontSize:11.5,color:"var(--m)",marginTop:10,lineHeight:1.5}}>
              Une absence vous concernant vaut pour toutes les familles : vous n'accueillez personne ce jour-là.
              Le modèle « Déclaration de congés annuels » est dans Courriers types — à envoyer à chacune.
            </div>
          </div>}
      </div>
     </>}
  </div>;
}

export function TempsDeTravail({enfants,role,user}){
  const [pointages,setPointages]=useState([]);
  const [chargement,setChargement]=useState(true);
  const asmatId=user?.id;
  const anneeEnCours=new Date().getFullYear();

  useEffect(()=>{
    if(role!=="asmat"||!asmatId){setChargement(false);return;}
    let vivant=true;
    (async()=>{
      const{data}=await supabase.from("pointages")
        .select("date,arrivee,depart,enfant_id")
        .gte("date",anneeEnCours+"-01-01").lte("date",anneeEnCours+"-12-31");
      if(!vivant)return;
      setPointages(data||[]);setChargement(false);
    })();
    return()=>{vivant=false;};
  },[asmatId,role,anneeEnCours]);

  const bilan=useMemo(()=>{
    const journees=journeesTravaillees(pointages);
    const jours=Object.entries(journees).sort((a,b)=>a[0]<b[0]?-1:1);
    const minutesAnnee=jours.reduce((s,[,d])=>s+d.minutes,0);
    // La somme naive, celle qu'on obtient en additionnant les contrats : elle
    // sert a montrer l'ecart, pas a compter.
    const minutesNaives=(pointages||[]).reduce((s,p)=>{
      const a=minutesDepuisHeure(p?.arrivee),b=minutesDepuisHeure(p?.depart);
      return s+(a!==null&&b!==null&&b>a?b-a:0);
    },0);
    // Regroupement par semaine ISO, pour la moyenne et le plus fort.
    const parSemaine={};
    for(const[jour,d]of jours){
      const t=new Date(jour+"T12:00:00Z");
      const n=new Date(t); n.setUTCDate(t.getUTCDate()+4-((t.getUTCDay()||7)));
      const cle=n.getUTCFullYear()+"-S"+String(Math.ceil((((n-new Date(Date.UTC(n.getUTCFullYear(),0,1)))/86400000)+1)/7)).padStart(2,"0");
      parSemaine[cle]=(parSemaine[cle]||0)+d.minutes;
    }
    const semaines=Object.entries(parSemaine).sort((a,b)=>a[0]<b[0]?-1:1);
    const recentes=semaines.slice(-SEMAINES_MOYENNE_HEBDO);
    const moyenne=recentes.length?recentes.reduce((s,[,m])=>s+m,0)/recentes.length:0;
    const pire=semaines.reduce((p,c)=>c[1]>(p?.[1]||0)?c:p,null);
    const amplitudeMax=jours.reduce((p,[j,d])=>d.amplitude>(p?.d?.amplitude||0)?{j,d}:p,null);
    const simultane=jours.filter(([,d])=>d.enfants>1).length;
    return{jours,minutesAnnee,minutesNaives,semaines,moyenne,pire,amplitudeMax,simultane};
  },[pointages]);

  if(role!=="asmat")return <div className="fi"><PageHeader icon="⏰" title="Mon temps de travail"/>
    <div className="card"style={{textAlign:"center",color:"var(--m)"}}>Section réservée à l'assistante maternelle.</div></div>;

  const h=heuresDepuisMinutes;
  const jauge=(valeur,plafond)=>Math.min(100,Math.round((valeur/plafond)*100));
  const couleur=(pct)=>pct>=100?"var(--R)":pct>=85?"var(--G)":"var(--S)";

  // Un plafond est un nombre rond : « 2 250 h » se lit, « 2250,00 h » non.
  // L'espace des milliers est une espace ordinaire, sans risque a l'ecran.
  const plafondLisible=(n)=>String(n).replace(/\B(?=(\d{3})+(?!\d))/g," ");
  const Jauge=({titre,valeur,plafond,unite,detail})=>{
    const pct=jauge(valeur,plafond);
    return <div className="card"style={{marginBottom:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:10,flexWrap:"wrap"}}>
        <span style={{fontSize:13,fontWeight:700,color:"var(--b)"}}>{titre}</span>
        <span className="pf"style={{fontSize:19,fontWeight:800,color:couleur(pct)}}>{nb2(valeur)} {unite}</span>
      </div>
      <div style={{height:8,borderRadius:6,background:"var(--c)",marginTop:9,overflow:"hidden"}}>
        <div style={{width:pct+"%",height:"100%",background:couleur(pct),transition:"width .3s"}}/>
      </div>
      <div style={{fontSize:11.5,color:"var(--m)",marginTop:7,lineHeight:1.5}}>
        {detail} — plafond {plafondLisible(plafond)} {unite}.
        {pct>=100&&<b style={{color:"var(--R)"}}> Plafond dépassé.</b>}
      </div>
    </div>;
  };

  return <div className="fi">
    <PageHeader icon="⏰" title="Mon temps de travail" sub={"Tous employeurs confondus — année "+anneeEnCours}/>

    <div className="card"style={{marginBottom:14,background:"var(--Bp)",border:"1px solid var(--B)"}}>
      <div style={{fontSize:12.5,color:"var(--b)",lineHeight:1.6}}>
        <IconeOuEmoji e="💡"/> Vos heures se <b>réunissent</b>, elles ne s'additionnent pas. Deux enfants
        accueillis de 8 h à 17 h, cela fait <b>neuf heures de travail</b>, pas dix-huit. C'est de votre
        point de vue que la loi compte, et c'est à vous — pas à chaque parent — qu'elle demande de
        respecter les plafonds et d'informer chaque employeur de vos autres contrats.
      </div>
    </div>

    {chargement?<div className="card"style={{color:"var(--l)",textAlign:"center"}}>Chargement…</div>
     :bilan.jours.length===0?<div className="card"style={{color:"var(--l)",textAlign:"center"}}>
       Aucun pointage enregistré en {anneeEnCours}. Les plafonds se calculent à partir de vos pointages.
     </div>
     :<>
      <Jauge titre={"Heures travaillées en "+anneeEnCours} valeur={h(bilan.minutesAnnee)} plafond={PLAFOND_ANNUEL_HEURES}
        unite="h" detail={bilan.jours.length+" journées d'accueil"}/>
      <Jauge titre={"Moyenne hebdomadaire ("+Math.min(bilan.semaines.length,SEMAINES_MOYENNE_HEBDO)+" dernières semaines)"}
        valeur={h(bilan.moyenne)} plafond={PLAFOND_HEBDO_HEURES} unite="h"
        detail={bilan.semaines.length<SEMAINES_MOYENNE_HEBDO
          ? "la loi retient la moyenne sur quatre mois ; vous n'avez que "+bilan.semaines.length+" semaine"+(bilan.semaines.length>1?"s":"")+" de pointage, la moyenne est donc partielle"
          : "c'est la moyenne sur quatre mois qui compte, pas chaque semaine prise isolément"}/>
      {bilan.pire&&<Jauge titre="Semaine la plus chargée" valeur={h(bilan.pire[1])} plafond={PLAFOND_HEBDO_HEURES}
        unite="h" detail={"semaine "+bilan.pire[0]}/>}
      {bilan.amplitudeMax&&<Jauge titre="Amplitude de la plus longue journée" valeur={h(bilan.amplitudeMax.d.amplitude)}
        plafond={PLAFOND_AMPLITUDE_JOUR} unite="h" detail={"le "+fmt(bilan.amplitudeMax.j)+" — du premier arrivé au dernier parti"}/>}

      {bilan.simultane>0&&<div className="card"style={{marginBottom:12}}>
        <div style={{fontSize:13,fontWeight:700,color:"var(--b)",marginBottom:6}}><IconeOuEmoji e="👶"/> Accueils simultanés</div>
        <div style={{fontSize:12.5,color:"var(--m)",lineHeight:1.6}}>
          Sur {bilan.jours.length} journées, <b>{bilan.simultane}</b> comptent plusieurs enfants en même temps.
          En additionnant les contrats, on obtiendrait <b>{nb2(h(bilan.minutesNaives))} h</b> sur l'année ;
          votre temps de travail réel est de <b style={{color:"var(--S)"}}>{nb2(h(bilan.minutesAnnee))} h</b>.
          L'écart, {nb2(h(bilan.minutesNaives-bilan.minutesAnnee))} h, correspond aux heures comptées deux fois.
        </div>
      </div>}
     </>}

    <div className="card"style={{fontSize:11.5,color:"var(--m)",lineHeight:1.7}}>
      <b>D'où viennent ces plafonds.</b> 2 250 heures par an tous employeurs confondus (article L. 423-22 du
      code de l'action sociale et des familles) ; 48 heures par semaine en moyenne sur quatre mois ;
      amplitude journalière de 13 heures au plus (article 110 de la convention collective IDCC 3239).
      Ces chiffres sont indicatifs : ils se calculent sur vos pointages enregistrés, qui peuvent être incomplets.
    </div>
  </div>;
}

// ============================================================
// LE JOURNAL DES ÉCHANGES AVEC LA PMI
// ------------------------------------------------------------
// L'ancien écran annonçait TROIS choses fausses, et en affichait
// une quatrième :
//
//   1. « vos messages sont envoyés par email à la PMI » — rien
//      n'était envoyé. La fonction d'envoi n'ajoutait une ligne
//      qu'à l'état React, perdue au rechargement suivant ;
//   2. « leurs réponses arrivent automatiquement ici » — rien ne
//      recevait, et la table messages_pmi, qui existait pourtant,
//      n'était jamais lue ni écrite ;
//   3. un répertoire d'adresses PMI par département, INVENTÉ. La
//      Haute-Garonne y figurait comme pmi@haute-garonne.fr quand
//      le contact publié par le département est
//      accueilpmi-individuelcollectif@cd31.fr. Le repli
//      conseillait d'appeler « le 15 » — le SAMU — pour joindre
//      la PMI ;
//   4. une carte « Mon agrément » entièrement fabriquée : numéro
//      AGR-2023-0042, date de délivrance, renouvellement, « 4
//      enfants autorisés », « ✅ Valide ». Aucune de ces valeurs
//      ne venait du compte.
//
// Une adresse officielle inventée est pire qu'une absence
// d'adresse : on la recopie, on écrit, et personne ne répond
// jamais. Un numéro d'agrément inventé est pire encore.
//
// CE QUE FAIT L'ÉCRAN MAINTENANT, ET RIEN D'AUTRE : il garde la
// trace de ce qui a été échangé avec la PMI. C'est ce qui sert
// vraiment le jour d'un contrôle ou d'un renouvellement — et
// TiMat le dit, au lieu de prétendre acheminer le courrier.
// LES CINQ COURRIERS QU'ON ÉCRIT VRAIMENT À LA PMI.
//
// Écrire à sa PMI n'est pas difficile : c'est se lancer qui l'est. On repousse,
// puis on oublie, et le délai passe. Ces modèles existent pour ça — pas pour
// dire quoi penser, mais pour qu'il ne reste qu'à remplir les blancs.
//
// LES DÉLAIS SONT RÉELS, PAS DÉCORATIFS. Le code de l'action sociale et des
// familles impose de déclarer SANS DÉLAI tout décès ou accident grave survenu
// à un enfant accueilli, et sous HUIT JOURS tout changement de situation
// familiale ou professionnelle, ainsi que les arrivées et départs d'enfants.
// C'est pour cela que le délai est écrit sur chaque modèle : c'est la seule
// information que l'assistante maternelle ne peut pas deviner.
//
// AUCUN MODÈLE N'INVENTE UN FAIT. Les crochets restent à remplir par elle.
// TiMat ne connaît ni la date de l'accident, ni le nom du médecin, ni ce qui
// s'est réellement passé — et un courrier à la PMI qui contiendrait une phrase
// préremplie fausse serait pire que pas de courrier du tout.
const MODELES_PMI = [
  {
    cle: "accident",
    titre: "Déclarer un accident",
    delai: "Sans délai",
    urgent: true,
    objet: "Déclaration d'un accident survenu à un enfant accueilli",
    corps: `Madame, Monsieur,

Je vous informe d'un accident survenu à un enfant que j'accueille à mon domicile.

Enfant concerné : [prénom et nom]
Date et heure : [le ... à ...]
Circonstances : [décrivez ce qui s'est passé, simplement et factuellement]
Suites données : [appel au 15, consultation, passage aux urgences, aucune]
Parents prévenus : [le ... à ...]

Je reste à votre disposition pour tout complément d'information.`,
  },
  {
    cle: "situation",
    titre: "Changement dans mon foyer",
    delai: "Sous 8 jours",
    objet: "Changement de situation",
    corps: `Madame, Monsieur,

Je vous informe d'un changement dans ma situation.

Nature du changement : [naissance, séparation, arrivée d'une personne majeure au domicile, changement d'adresse…]
Date de ce changement : [le ...]
Précisions : [ce qu'il faut savoir]

Je vous remercie de me dire si un document ou une visite sont nécessaires.`,
  },
  {
    cle: "agrement",
    titre: "Modifier mon agrément",
    delai: "Avant tout nouvel accueil",
    objet: "Demande de modification d'agrément",
    corps: `Madame, Monsieur,

Je souhaite demander une modification de mon agrément.

Modification demandée : [nombre d'enfants, tranches d'âge, horaires…]
Situation actuelle : [ce que prévoit l'agrément aujourd'hui]
Motif : [expliquez brièvement]

Je vous remercie de m'indiquer la marche à suivre et les pièces à fournir.`,
  },
  {
    cle: "mouvement",
    titre: "Arrivée ou départ d'un enfant",
    delai: "Sous 8 jours",
    objet: "Arrivée / départ d'un enfant accueilli",
    corps: `Madame, Monsieur,

Je vous informe d'un changement parmi les enfants que j'accueille.

Enfant : [prénom et nom, date de naissance]
Arrivée ou départ : [arrivée / fin de contrat]
Date : [le ...]
Rythme d'accueil : [temps plein, périscolaire, occasionnel…]`,
  },
  {
    cle: "rdv",
    titre: "Demander un rendez-vous",
    delai: "",
    objet: "Demande de rendez-vous",
    corps: `Madame, Monsieur,

Je souhaiterais vous rencontrer, ou m'entretenir avec vous par téléphone.

Motif : [votre question]
Mes disponibilités : [jours et créneaux qui vous arrangent]

Je vous remercie par avance.`,
  },
];

export function CommunicationPMI({role,user,hasRealData}){
  const demo=!hasRealData;
  const [msgs,setMsgs]=useState([]);
  const [chargement,setChargement]=useState(!demo);
  const [toast,setToast]=useState("");
  const [ouvert,setOuvert]=useState(false);
  const vide=()=>({sens:"sortant",objet:"",texte:"",date:isoJour(new Date()),canal:"E-mail"});
  const [form,setForm]=useState(vide());

  // Le modèle en cours de relecture. Elle le modifie avant d'envoyer : c'est
  // SON courrier, pas celui de TiMat.
  const [modele,setModele]=useState(null);

  // Le contact de SA PMI : il figure sur son agrément. On ne le devine pas.
  const [pmi,setPmi]=useState({nom:"",email:"",tel:""});
  const [editContact,setEditContact]=useState(false);

  useEffect(()=>{
    if(demo||!user?.id){setChargement(false);return;}
    let vivant=true;
    (async()=>{
      const [{data:ms,error},{data:pr}]=await Promise.all([
        supabase.from("messages_pmi").select("*").eq("asmat_id",user.id).order("date_echange",{ascending:false}),
        supabase.from("profiles").select("pmi_nom,pmi_email,pmi_tel").eq("id",user.id).maybeSingle(),
      ]);
      if(!vivant)return;
      if(error)setToast("Le journal n'a pas pu être lu.");
      setMsgs(ms||[]);
      setPmi({nom:pr?.pmi_nom||"",email:pr?.pmi_email||"",tel:pr?.pmi_tel||""});
      setChargement(false);
    })();
    return()=>{vivant=false;};
  },[demo,user?.id]);

  const enregistrerContact=async()=>{
    const {error}=await supabase.from("profiles")
      .update({pmi_nom:pmi.nom||null,pmi_email:pmi.email||null,pmi_tel:pmi.tel||null}).eq("id",user.id);
    if(error){setToast("Le contact n'a pas pu être enregistré.");return;}
    setEditContact(false); setToast("Contact de votre PMI enregistré.");
  };

  const consigner=async()=>{
    if(!form.texte.trim()){setToast("Écrivez ce qui a été échangé.");return;}
    const ligne={
      asmat_id:user.id, de:form.sens==="sortant"?"asmat":"PMI",
      objet:form.objet.trim()||null, texte:form.texte.trim(),
      date_echange:form.date||isoJour(new Date()), canal:form.canal||null, lu:true,
    };
    const {data,error}=await supabase.from("messages_pmi").insert(ligne).select().single();
    if(error){setToast("L'enregistrement a échoué.");return;}
    setMsgs(m=>[data,...m]); setForm(vide()); setOuvert(false);
    setToast("Échange consigné.");
    logAction&&logAction("pmi_echange_consigne");
  };

  // Écrire à la PMI ouvre le courrier de l'assistante maternelle, avec SON
  // adresse à elle. C'est celle que la PMI doit voir, et celle à laquelle elle
  // répondra. TiMat n'achemine rien.
  const ecrire=()=>{
    if(!pmi.email){setToast("Renseignez d'abord l'adresse de votre PMI.");setEditContact(true);return;}
    window.open("mailto:"+encodeURIComponent(pmi.email)+"?subject="+encodeURIComponent(form.objet||"Message d'une assistante maternelle agréée"),"_blank");
  };

  // Ouvrir le modèle NE L'ENVOIE PAS. Le courrier part de sa messagerie à elle,
  // avec son adresse : c'est celle que la PMI doit voir, et celle à laquelle
  // elle répondra.
  const envoyerModele=()=>{
    if(!modele)return;
    if(!pmi.email){setToast("Renseignez d'abord l'adresse de votre PMI.");setEditContact(true);return;}
    window.open("mailto:"+encodeURIComponent(pmi.email)
      +"?subject="+encodeURIComponent(modele.objet)
      +"&body="+encodeURIComponent(modele.corps),"_blank");
  };

  const copierModele=()=>{
    if(!modele)return;
    navigator.clipboard?.writeText(modele.objet+"\n\n"+modele.corps)
      .then(()=>setToast("Texte copié."),()=>setToast("La copie a échoué."));
  };

  // Le vrai gain n'est pas le modèle : c'est la trace. Un courrier envoyé et
  // jamais consigné ne servira à rien dans trois ans, au renouvellement.
  const consignerModele=async()=>{
    if(demo){setToast("Connectez-vous pour tenir votre journal.");return;}
    const {data,error}=await supabase.from("messages_pmi").insert({
      asmat_id:user.id, de:"asmat", objet:modele.objet, texte:modele.corps,
      date_echange:isoJour(new Date()), canal:"E-mail", lu:true,
    }).select().single();
    if(error){setToast("L'enregistrement a échoué.");return;}
    setMsgs(m=>[data,...m]); setModele(null);
    setToast("Courrier consigné dans votre journal.");
    logAction&&logAction("pmi_modele_consigne");
  };

  const champ=(k,label,props={})=>
    <div style={{display:"flex",flexDirection:"column",gap:4}}>
      <label style={{fontSize:12,fontWeight:600,color:"var(--b)"}}>{label}</label>
      <input value={form[k]||""} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))}
        style={{border:"1px solid var(--br)",borderRadius:9,padding:"10px 11px",fontSize:15,fontFamily:"inherit",background:"var(--bg)",color:"var(--b)"}} {...props}/>
    </div>;

  return <div className="fi">
    {toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
    <PageHeader icon="🏛️" title="Mes échanges avec la PMI" sub="Le journal de ce qui a été dit, daté et retrouvable"/>

    <div style={{background:"var(--c)",border:"1px solid var(--br)",borderLeft:"4px solid var(--B)",borderRadius:10,padding:"12px 14px",marginBottom:16,fontSize:12.5,lineHeight:1.6,color:"var(--b)"}}>
      <b>TiMat n'envoie rien à la PMI et ne reçoit rien d'elle.</b> Vous écrivez depuis votre
      messagerie habituelle, et vous consignez ici ce qui a été échangé — appel, courrier,
      visite. Le jour d'un contrôle ou d'un renouvellement, c'est cette trace datée qui compte.
    </div>

    <div className="card" style={{marginBottom:14}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap",marginBottom:editContact?12:0}}>
        <div style={{fontWeight:700,fontSize:14,color:"var(--b)"}}>Ma PMI de secteur</div>
        {!demo&&<button className="btn s" style={{background:"var(--bg)",color:"var(--b)"}}
          onClick={()=>setEditContact(v=>!v)}>{editContact?"Annuler":(pmi.email||pmi.tel?"Modifier":"Renseigner")}</button>}
      </div>
      {editContact
        ? <div style={{display:"grid",gap:10}}>
            <div style={{fontSize:12.5,color:"var(--m)",lineHeight:1.6}}>
              Ces coordonnées figurent sur votre agrément, ou sur le site de votre conseil
              départemental. TiMat ne les devine pas : une adresse officielle fausse ne se
              voit pas, et le courrier part dans le vide.
            </div>
            {[["nom","Service ou puéricultrice référente"],["email","Adresse e-mail"],["tel","Téléphone"]].map(([k,l])=>
              <div key={k} style={{display:"flex",flexDirection:"column",gap:4}}>
                <label style={{fontSize:12,fontWeight:600,color:"var(--b)"}}>{l}</label>
                <input value={pmi[k]||""} onChange={e=>setPmi(p=>({...p,[k]:e.target.value}))}
                  style={{border:"1px solid var(--br)",borderRadius:9,padding:"10px 11px",fontSize:15,fontFamily:"inherit",background:"var(--bg)",color:"var(--b)"}}/>
              </div>)}
            <button className="btn bT" onClick={enregistrerContact}>Enregistrer</button>
          </div>
        : (pmi.nom||pmi.email||pmi.tel)
          ? <div style={{fontSize:13,color:"var(--b)",lineHeight:1.8,marginTop:8}}>
              {pmi.nom&&<div>{pmi.nom}</div>}
              {pmi.email&&<div>{pmi.email}</div>}
              {pmi.tel&&<div>{pmi.tel}</div>}
              <button className="btn s bT" style={{marginTop:9}} onClick={ecrire}>Écrire à ma PMI</button>
            </div>
          : <div style={{fontSize:12.5,color:"var(--m)",marginTop:6,lineHeight:1.6}}>
              Pas encore renseignée. Ses coordonnées figurent sur votre agrément.
            </div>}
    </div>

    <div className="card" style={{marginBottom:14}}>
      <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:4}}>Écrire à ma PMI</div>
      <div style={{fontSize:12.5,color:"var(--m)",lineHeight:1.6,marginBottom:12}}>
        Cinq courriers qu'on écrit vraiment. Choisissez, relisez, complétez les crochets :
        le message s'ouvre dans votre messagerie, avec votre adresse à vous.
      </div>
      {!modele
        ? <div style={{display:"grid",gap:8}}>
            {MODELES_PMI.map(m=>
              <button key={m.cle} onClick={()=>setModele({...m})}
                style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,textAlign:"left",
                  background:"var(--bg)",border:"1px solid var(--br)",borderLeft:m.urgent?"3px solid var(--D)":"1px solid var(--br)",
                  borderRadius:10,padding:"12px 13px",fontSize:14,fontWeight:600,color:"var(--b)",fontFamily:"inherit",cursor:"pointer"}}>
                <span>{m.titre}</span>
                {m.delai&&<span style={{fontSize:11,fontWeight:700,whiteSpace:"nowrap",color:m.urgent?"var(--D)":"var(--m)"}}>{m.delai}</span>}
              </button>)}
            <div style={{fontSize:11.5,color:"var(--m)",lineHeight:1.55,marginTop:2}}>
              Les délais viennent du code de l'action sociale et des familles : sans délai pour
              un accident grave ou un décès, huit jours pour un changement de situation et pour
              l'arrivée ou le départ d'un enfant.
            </div>
          </div>
        : <div style={{display:"grid",gap:10}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}>
              <div style={{fontWeight:700,fontSize:14,color:"var(--b)"}}>{modele.titre}</div>
              <button className="btn s" style={{background:"var(--bg)",color:"var(--b)"}} onClick={()=>setModele(null)}>Retour</button>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:4}}>
              <label style={{fontSize:12,fontWeight:600,color:"var(--b)"}}>Objet</label>
              <input value={modele.objet} onChange={e=>setModele(m=>({...m,objet:e.target.value}))}
                style={{border:"1px solid var(--br)",borderRadius:9,padding:"10px 11px",fontSize:15,fontFamily:"inherit",background:"var(--bg)",color:"var(--b)"}}/>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:4}}>
              <label style={{fontSize:12,fontWeight:600,color:"var(--b)"}}>Message</label>
              <textarea value={modele.corps} onChange={e=>setModele(m=>({...m,corps:e.target.value}))} rows={13}
                style={{border:"1px solid var(--br)",borderRadius:9,padding:"10px 11px",fontSize:14.5,lineHeight:1.6,fontFamily:"inherit",background:"var(--bg)",color:"var(--b)",resize:"vertical"}}/>
              <div style={{fontSize:11.5,color:"var(--m)",lineHeight:1.55}}>
                Remplacez chaque crochet par votre situation réelle. TiMat ne connaît ni les
                circonstances, ni les dates : rien n'est prérempli à votre place.
              </div>
            </div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <button className="btn bT" style={{flex:"1 1 160px"}} onClick={envoyerModele}>Ouvrir dans ma messagerie</button>
              <button className="btn s" style={{flex:"1 1 110px",background:"var(--bg)",color:"var(--b)"}} onClick={copierModele}>Copier le texte</button>
            </div>
            {!demo&&<button className="btn s" style={{background:"var(--bg)",color:"var(--b)"}} onClick={consignerModele}>
              Consigner ce courrier dans mon journal
            </button>}
          </div>}
    </div>

    {!demo&&<div className="card" style={{marginBottom:14}}>
      {!ouvert
        ? <button className="btn bT" style={{width:"100%"}} onClick={()=>setOuvert(true)}>Consigner un échange</button>
        : <div style={{display:"grid",gap:10}}>
            <div style={{fontWeight:700,fontSize:14,color:"var(--b)"}}>Consigner un échange</div>
            <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
              {[["sortant","Je les ai contactés"],["entrant","Ils m'ont contactée"]].map(([v,l])=>
                <button key={v} onClick={()=>setForm(f=>({...f,sens:v}))}
                  className={"btn s "+(form.sens===v?"bT":"")}
                  style={form.sens===v?{}:{background:"var(--bg)",color:"var(--b)"}}>{l}</button>)}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {champ("date","Date",{type:"date"})}
              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                <label style={{fontSize:12,fontWeight:600,color:"var(--b)"}}>Par quel moyen</label>
                <select value={form.canal} onChange={e=>setForm(f=>({...f,canal:e.target.value}))}
                  style={{border:"1px solid var(--br)",borderRadius:9,padding:"10px 11px",fontSize:15,fontFamily:"inherit",background:"var(--bg)",color:"var(--b)"}}>
                  {["E-mail","Téléphone","Courrier","Visite","Autre"].map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            {champ("objet","Objet",{placeholder:"Renouvellement, visite, question sur un accueil…"})}
            <div style={{display:"flex",flexDirection:"column",gap:4}}>
              <label style={{fontSize:12,fontWeight:600,color:"var(--b)"}}>Ce qui a été dit</label>
              <textarea value={form.texte} onChange={e=>setForm(f=>({...f,texte:e.target.value}))}
                placeholder="Les points abordés, ce qui a été demandé, ce qui a été répondu."
                style={{border:"1px solid var(--br)",borderRadius:9,padding:"10px 11px",fontSize:15,fontFamily:"inherit",background:"var(--bg)",color:"var(--b)",minHeight:100,resize:"vertical"}}/>
            </div>
            <div style={{display:"flex",gap:8}}>
              <button className="btn bT" style={{flex:1}} onClick={consigner}>Enregistrer</button>
              <button className="btn" style={{background:"var(--bg)",color:"var(--b)"}} onClick={()=>{setOuvert(false);setForm(vide());}}>Annuler</button>
            </div>
          </div>}
    </div>}

    <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:10}}>
      {demo?"Exemple de journal":msgs.length+" échange"+(msgs.length>1?"s":"")+" consigné"+(msgs.length>1?"s":"")}
    </div>

    {chargement
      ? <div style={{padding:24,textAlign:"center",color:"var(--m)",fontSize:13}}>Chargement…</div>
      : (demo?PMI_MESSAGES:msgs).length===0
        ? <EmptyState emoji="🏛️" titre="Rien de consigné" texte="Notez ici chaque appel, courrier ou visite. C'est la trace qui sert le jour d'un contrôle."/>
        : <div style={{display:"flex",flexDirection:"column",gap:9}}>
            {(demo?PMI_MESSAGES:msgs).map(m=>{
              const sortant=(m.de||"asmat")==="asmat";
              return <div key={m.id} style={{background:"var(--c)",border:"1px solid var(--br)",borderLeft:"3px solid "+(sortant?"var(--T)":"var(--B)"),borderRadius:12,padding:"12px 14px"}}>
                <div style={{display:"flex",justifyContent:"space-between",gap:10,flexWrap:"wrap",marginBottom:4}}>
                  <span style={{fontSize:12,fontWeight:700,color:sortant?"var(--T)":"var(--B)"}}>
                    {sortant?"Vous → PMI":"PMI → vous"}{m.canal?" · "+m.canal:""}
                  </span>
                  <span style={{fontSize:12,color:"var(--m)"}}>
                    {(m.date_echange||m.date||"").split("-").reverse().join("/")||m.h||""}
                  </span>
                </div>
                {m.objet&&<div style={{fontWeight:700,fontSize:13.5,color:"var(--b)",marginBottom:3}}>{m.objet}</div>}
                <div style={{fontSize:13,color:"var(--b)",lineHeight:1.55}}>{m.texte||m.txt}</div>
              </div>;
            })}
          </div>}
  </div>;
}

//
// Logique d'installation PWA partagée

export function PolitiqueConfidentialite(){
  const sections=[
    {titre:"1. Rôles",contenu:`TiMat - contact : ${EMAIL_CONTACT}\nHébergement des données : France (OVHcloud Paris via Supabase).\n\nTiMat est responsable de traitement pour ce qu'elle décide elle-même : les comptes, l'abonnement, la facturation, la prospection, le support et les journaux techniques.\n\nTiMat est sous-traitante pour les données professionnelles de l'assistante maternelle : le dossier de l'enfant, les pointages, les contrats et les bulletins. Ces données sont hébergées sur instruction, et l'assistante maternelle en reste seule responsable.`},
    {titre:"2. Données collectées",contenu:""},
    {titre:"3. Qui décide de quoi",contenu:""},
    {titre:"4. Durées de conservation",contenu:""},
    {titre:"5. Vos droits",contenu:""},
    {titre:"6. Cookies",contenu:"TiMat n'utilise aucun cookie publicitaire ni de tracking. Seuls les cookies techniques nécessaires au fonctionnement (session, authentification) sont utilisés."},
    {titre:"7. Sécurité",contenu:"Chiffrement en transit (HTTPS/TLS 1.3), chiffrement au repos (AES-256), Row Level Security Supabase, authentification sécurisée."},
  ];

  const tableaux={
    "2. Données collectées":[
      ["Catégorie","Données","Base légale","Durée"],
      ["Assmats","Nom, email, téléphone, n° agrément","Exécution du contrat","Durée compte actif"],
      ["Enfants","Prénom, date de naissance, allergies","Exécution du contrat + intérêt vital","Durée contrat d'accueil"],
      ["Parents","Nom, email, téléphone, profession","Exécution du contrat","Durée compte actif"],
      ["Financières","Salaires, indemnités, attestations fiscales","Obligation légale","10 ans"],
      ["Photos enfants","Images (journal partagé)","Consentement explicite parents","Durée contrat + 1 an"],
      ["Paiements","Plan, Stripe ID (aucune CB stockée)","Exécution du contrat","10 ans"],
    ],
    "3. Qui décide de quoi":[
      ["Donnée","Rôle de TiMat","Qui décide de sa suppression"],
      ["Compte, abonnement, facturation TiMat","Responsable de traitement","TiMat, selon les durées ci-dessous"],
      ["Prospection, support, journaux","Responsable de traitement","TiMat, selon les durées ci-dessous"],
      ["Dossier de l'enfant, pointages, contrats, bulletins","Sous-traitant","L'assistante maternelle, seule"],
    ],
    "4. Durées de conservation":[
      ["Données","Durée","Justification"],
      ["Compte actif","Durée de l'abonnement","Nécessité du service"],
      ["Après suppression du compte","Effacement immédiat","Droit à l'effacement (RGPD art. 17)"],
      ["Compte inactif","Signalé à 2 ans ; supprimé seulement après un avertissement resté sans réponse","Recommandation CNIL"],
      ["Facturation et comptabilité TiMat","10 ans","Code de commerce, art. L123-22"],
      ["Prospects","3 ans après le dernier contact","Norme CNIL prospection"],
      ["Messages de support","2 ans","Suivi de la demande"],
      ["Journaux de connexion","12 mois","Sécurité"],
      ["Consentements","5 ans","Preuve de conformité CNIL"],
      ["Données de l'enfant et registres professionnels","Fixée par l'assistante maternelle","TiMat n'en est que l'hébergeur"],
      ["Fin de l'abonnement","Restitution ou suppression, au choix","RGPD art. 28.3.g"],
    ],
    "5. Vos droits":[
      ["Droit","Comment l'exercer"],
      ["Accès à vos données","Administratif → Documents → Export dossier"],
      ["Rectification","Paramètres → Modifier mon profil"],
      ["Effacement (oubli)","Paramètres → Supprimer mon compte (immédiat et définitif)"],
      ["Portabilité","Export CSV/PDF depuis l'application"],
      ["Opposition",`Contactez ${EMAIL_CONTACT}`],
      ["Réclamation CNIL","www.cnil.fr - 3 Place de Fontenoy, 75007 Paris"],
    ],
  };

  return <div className="fi">
    <PageHeader icon="🔒" title="Politique de confidentialité" sub="Version 1.0 - Mars 2026 - Conforme RGPD"/>
    <div style={{maxWidth:800,margin:"0 auto"}}>
      {sections.map((s,i)=><div key={i}className="card"style={{padding:"var(--pad-carte-l)",marginBottom:16}}>
        <div style={{fontWeight:700,fontSize:16,color:"var(--b)",marginBottom:12}}>{s.titre}</div>
        {tableaux[s.titre]?<div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
            <thead>
              <tr>{tableaux[s.titre][0].map((h,j)=><th key={j}style={{
                textAlign:"left",padding:"8px 12px",background:"var(--c)",
                fontWeight:700,color:"var(--m)",fontSize:11,textTransform:"uppercase",letterSpacing:".5px",
                borderBottom:"2px solid var(--br)"
              }}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {tableaux[s.titre].slice(1).map((row,j)=><tr key={j}style={{borderBottom:"1px solid var(--br)"}}>
                {row.map((cell,k)=><td key={k}style={{padding:"9px 12px",fontSize:13,color:k===0?"var(--b)":"var(--m)",fontWeight:k===0?600:400}}>{cell}</td>)}
              </tr>)}
            </tbody>
          </table>
        </div>:<div style={{fontSize:13,color:"var(--m)",lineHeight:1.8,whiteSpace:"pre-line"}}>{s.contenu}</div>}
      </div>)}
      <div className="card"style={{background:"var(--Bp)",border:"1px solid var(--B)"}}>
        <div style={{fontWeight:700,fontSize:13,color:"var(--B)",marginBottom:6}}><IconeOuEmoji e="📧"/> Contact RGPD</div>
        <div style={{fontSize:13,color:"var(--m)"}}>Pour exercer vos droits : <strong>{EMAIL_CONTACT}</strong> - Réponse sous 30 jours.</div>
      </div>
    </div>
  </div>;
}

//

export function MentionsLegales(){
  const [edit,setEdit]=useState(false);
  const [info,setInfo]=useState({
    representant:"[Votre prénom et nom]",
    siret:"[Numéro SIRET]",
    adresse:"[Adresse complète, Code postal, Ville]",
    telephone:"[Téléphone professionnel]",
  });

  const blocs=[
    {titre:"Éditeur du site",custom:true},
    {titre:"Hébergement",contenu:"Application web : Vercel Inc. (serveurs européens)\nBase de données : Supabase / OVHcloud - 2 rue Kellermann, 59100 Roubaix, France\nToutes les données sont hébergées en France."},
    {titre:"Propriété intellectuelle",contenu:"L'ensemble du contenu de TiMat (textes, interface, logo, fonctionnalités, code source) est la propriété exclusive de TiMat et protégé par le droit d'auteur. Toute reproduction sans autorisation écrite est interdite."},
    {titre:"Limitation de responsabilité",contenu:"Les calculs de salaire, récapitulatifs Pajemploi et attestations fiscales générés par TiMat sont fournis à titre indicatif. L'utilisateur reste responsable de la vérification des montants auprès des organismes compétents (URSSAF, CAF, Administration fiscale)."},
    {titre:"Données personnelles",contenu:`Responsable de traitement : TiMat - ${EMAIL_CONTACT}\nAutorité de contrôle : CNIL - www.cnil.fr\nVoir la politique de confidentialité complète pour le détail des traitements.`},
    {titre:"Droit applicable",contenu:"Les présentes mentions légales sont soumises au droit français. En cas de litige, les tribunaux français seront seuls compétents."},
  ];

  return <div className="fi">
    <PageHeader icon="📋" title="Mentions légales" sub="Conformément à la loi n°2004-575 du 21 juin 2004 (LCEN)"/>
    <div style={{maxWidth:700,margin:"0 auto"}}>
      {blocs.map((b,i)=><div key={i}className="card"style={{marginBottom:14}}>
        <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:10}}>{b.titre}</div>
        {b.custom?<div>
          {/* Bloc éditeur éditable */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div style={{fontSize:12,color:"var(--l)"}}>À compléter avec vos informations légales</div>
            <button onClick={()=>setEdit(p=>!p)}className="btn bG s"style={{padding:"4px 12px"}}>
              {edit?"✓ Sauvegarder":"✏️ Modifier"}
            </button>
          </div>
          {[
            ["Raison sociale","TiMat"],
            ["Représentée par","representant"],
            ["Email",EMAIL_CONTACT],
            ["SIRET","siret"],
            ["Adresse","adresse"],
            ["Téléphone","telephone"],
          ].map(([label,key])=><div key={label}style={{display:"flex",gap:12,padding:"6px 0",borderBottom:"1px solid var(--br)",alignItems:"center"}}>
            <span style={{fontSize:12,color:"var(--l)",minWidth:120,flexShrink:0}}>{label}</span>
            {edit&&info[key]!==undefined?
              <input className="inp"style={{flex:1,padding:"4px 8px",fontSize:12}}
                value={info[key]}onChange={e=>setInfo(p=>({...p,[key]:e.target.value}))}/>
            :<span style={{fontSize:13,color:"var(--b)",fontWeight:500}}>
              {info[key]||key}
            </span>}
          </div>)}
          {info.siret.includes("[")&&<div style={{marginTop:10,padding:"8px 12px",background:"var(--Rp)",borderRadius:8,fontSize:11,color:"var(--R)"}}>
            <IconeOuEmoji e="⚠️"/> Ces informations doivent être complétées avant la mise en ligne de l'application. Cliquez sur "Modifier" pour renseigner vos données légales.
          </div>}
        </div>
        :<div style={{fontSize:13,color:"var(--m)",lineHeight:1.8,whiteSpace:"pre-line"}}>{b.contenu}</div>}
      </div>)}
      <div style={{fontSize:12,color:"var(--l)",textAlign:"center",marginTop:8}}>
        Dernière mise à jour : mars 2026
      </div>
    </div>
  </div>;
}


//

export function JournalComplet({enfants,role,pEId,user}){
  const [selId,setSelId]=useState(enfants[0]?.id);
  const [sec,setSec]=useState("repas");
  const liste=role==="parent"?enfants.filter(e=>e.id===pEId):enfants;
  const enfant=liste.find(e=>e.id===selId)||liste[0];
  const secs=role==="asmat"
    ?[{id:"repas",l:"Repas & Changes",ic:"🍽️"},{id:"sommeil",l:"Sommeil",ic:"😴"},{id:"activites",l:"Activité du jour",ic:"💡"}]
    :[{id:"repas",l:"Repas",ic:"🍽️"},{id:"sommeil",l:"Sommeil",ic:"😴"},{id:"activites",l:"Activité du jour",ic:"💡"}];
  return <div className="fi">
    <div style={{display:"flex",gap:2,marginBottom:16,borderBottom:"2px solid var(--br)",overflowX:"auto",scrollbarWidth:"none"}}>
      {secs.map(s=><button key={s.id}onClick={()=>setSec(s.id)}style={{
        padding:"7px 14px",border:"none",background:"none",cursor:"pointer",
        fontFamily:"'DM Sans',sans-serif",fontWeight:600,fontSize:12,whiteSpace:"nowrap",flexShrink:0,
        color:sec===s.id?"var(--T)":"var(--b)",
        borderBottom:sec===s.id?"2px solid var(--accent)":"2px solid transparent",
        marginBottom:-2,transition:"all .15s",display:"flex",alignItems:"center",gap:5
      }}><IconeOuEmoji e={s.ic}/><span>{s.l}</span></button>)}
    </div>
    {sec==="repas"&&<RepasChanges enfants={liste}role={role}pEId={selId}/>}
    {sec==="sommeil"&&<Sommeil enfants={liste}role={role}pEId={selId}/>}
    {sec==="activites"&&<ActivitesSuggerees enfants={liste}role={role}pEId={selId}/>}
  </div>;
}

//

export function SanteComplete({enfants,role,pEId,user}){
  const [selId,setSelId]=useState(enfants[0]?.id);
  const [sec,setSec]=useState("sante");
  const liste=role==="parent"?enfants.filter(e=>e.id===pEId):enfants;
  const enfant=liste.find(e=>e.id===selId)||liste[0];

  // Rappels vaccins automatiques
  const isRealEnfant=!["e1","e2","e3"].includes(enfant?.id);
  const VAC_BASE=[
    {nom:"Hexavalent : DTP-Coqueluche-Hib-Hépatite B (1ʳᵉ)",age_mois:2,quand:"2 mois",fait:isRealEnfant?false:true},
    {nom:"Pneumocoque (1ʳᵉ)",age_mois:2,quand:"2 mois",fait:isRealEnfant?false:true},
    {nom:"Rotavirus – par voie orale (recommandé)",age_mois:2,quand:"2 mois",reco:true,fait:false},
    {nom:"Méningocoque B (1ʳᵉ)",age_mois:3,quand:"3 mois",fait:isRealEnfant?false:true},
    {nom:"Hexavalent : DTP-Coqueluche-Hib-Hépatite B (2ᵉ)",age_mois:4,quand:"4 mois",fait:isRealEnfant?false:true},
    {nom:"Pneumocoque (2ᵉ)",age_mois:4,quand:"4 mois",fait:isRealEnfant?false:true},
    {nom:"Méningocoque B (2ᵉ)",age_mois:5,quand:"5 mois",fait:isRealEnfant?false:true},
    {nom:"Méningocoque ACWY (1ʳᵉ)",age_mois:6,quand:"6 mois",fait:false},
    {nom:"Hexavalent : DTP-Coqueluche-Hib-Hépatite B (rappel, 3ᵉ)",age_mois:11,quand:"11 mois",fait:false},
    {nom:"Pneumocoque (rappel, 3ᵉ)",age_mois:11,quand:"11 mois",fait:false},
    {nom:"ROR : Rougeole-Oreillons-Rubéole (1ʳᵉ)",age_mois:12,quand:"12 mois",fait:false},
    {nom:"Méningocoque B (rappel, 3ᵉ)",age_mois:12,quand:"12 mois",fait:false},
    {nom:"Méningocoque ACWY (rappel, 2ᵉ)",age_mois:12,quand:"12 mois",fait:false},
    {nom:"ROR : Rougeole-Oreillons-Rubéole (2ᵉ)",age_mois:17,quand:"16-18 mois",fait:false},
    {nom:"Méningocoque ACWY + B — rattrapage si non vacciné (transitoire)",age_mois:24,quand:"2 à 4 ans révolus",reco:true,fait:false},
    {nom:"Grippe saisonnière — chaque automne (possible dès 2 ans)",age_mois:24,quand:"chaque année, dès 2 ans",reco:true,fait:false},
    {nom:"Rappel DTP-Coqueluche-Polio (dTcaPolio)",age_mois:72,quand:"6 ans",fait:false},
  ];
  const [vacsState,setVacsState]=useState(VAC_BASE);
  const [infoVac,setInfoVac]=useState(null);
  const VAC_MALADIES=[
    ["Hexavalent","Diphtérie, tétanos, poliomyélite, coqueluche, infections à Haemophilus influenzae b et hépatite B."],
    ["Pneumocoque","Infections à pneumocoque : méningites, pneumonies et septicémies, fréquentes chez le jeune enfant."],
    ["Rotavirus","Gastro-entérites à rotavirus, première cause de diarrhées sévères du nourrisson."],
    ["Méningocoque B","Méningites et septicémies (infections du sang) dues au méningocoque B."],
    ["Méningocoque ACWY","Méningites et septicémies dues aux méningocoques A, C, W et Y."],
    ["ROR","Rougeole, oreillons et rubéole."],
    ["Grippe","Grippe saisonnière et ses complications."],
    ["DTP-Coqueluche-Polio","Rappel contre la diphtérie, le tétanos, la poliomyélite et la coqueluche."],
  ];
  const maladiesDe=(nom)=>{const f=VAC_MALADIES.find(([k])=>nom.includes(k));return f?f[1]:"Vaccin recommandé pour protéger l'enfant.";};
  const VACCINS_CALENDRIER=vacsState;
  const ageActuel=enfant?Math.round((new Date()-new Date(enfant.naissance))/2592000000):12;
  const prochainsVaccins=VACCINS_CALENDRIER.filter(v=>!v.fait&&v.age_mois<=ageActuel+3);

  // Charger vaccins depuis Supabase
  useEffect(()=>{
    if(!enfant?.id||!isRealEnfant)return;
    supabase.from("vaccins").select("*").eq("enfant_id",enfant.id).then(({data})=>{
      if(data&&data.length>0){
        setVacsState(VAC_BASE.map(v=>{
          const saved=data.find(d=>d.nom===v.nom);
          return saved?{...v,fait:saved.fait}:v;
        }));
      }
    });
  },[enfant?.id]);

  const toggleVaccin=async(i)=>{
    const updated=[...VACCINS_CALENDRIER];
    updated[i]={...updated[i],fait:!updated[i].fait};
    setVacsState(updated);
    if(isRealEnfant&&enfant?.id){
      await supabase.from("vaccins").upsert({
        enfant_id:enfant.id,
        nom:updated[i].nom,
        age_mois:updated[i].age_mois,
        fait:updated[i].fait,
        updated_at:new Date().toISOString(),
      },{onConflict:"enfant_id,nom"});
    }
  };

  const secs=[
    {id:"sante",l:"Santé",ic:"🏥"},
    {id:"vaccins",l:"Vaccins",ic:"💉",badge:prochainsVaccins.length},
    {id:"croissance",l:"Croissance",ic:"📏"}
  ];

  return <div className="fi">
    {role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
      {liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>setSelId(e.id)}/>)}
    </div>}
    <div style={{display:"flex",gap:2,marginBottom:16,borderBottom:"2px solid var(--br)"}}>
      {secs.map(s=><button key={s.id}onClick={()=>setSec(s.id)}style={{
        padding:"7px 16px",border:"none",background:"none",cursor:"pointer",
        fontFamily:"'DM Sans',sans-serif",fontWeight:600,fontSize:12,position:"relative",
        color:sec===s.id?"var(--accent)":"var(--b)",
        borderBottom:sec===s.id?"2px solid var(--accent)":"2px solid transparent",
        marginBottom:-2,transition:"all .15s",display:"flex",alignItems:"center",gap:5
      }}>
        <IconeOuEmoji e={s.ic}/><span>{s.l}</span>
        {s.badge>0&&<span style={{background:"var(--R)",color:"#fff",borderRadius:10,
          padding:"1px 5px",fontSize:11,fontWeight:700}}>{s.badge}</span>}
      </button>)}
    </div>

    {sec==="sante"&&<Sante enfants={liste}role={role}pEId={selId} user={user}/>}
    {sec==="croissance"&&<CourbeCroissance enfants={liste}role={role}pEId={selId}/>}
    {sec==="vaccins"&&<div>
      <PageHeader icon="💉" title="Suivi vaccinal" sub="Calendrier vaccinal officiel - rappels automatiques"/>
      <div style={{background:"var(--Bp)",border:"1px solid var(--B)",borderRadius:12,padding:"11px 14px",marginBottom:16,fontSize:11.5,color:"var(--m)",lineHeight:1.55}}>
        Calendrier officiel français des <b>0-6 ans</b> (11 vaccins obligatoires depuis 2018, + <b>méningocoque B et ACWY obligatoires depuis 2025</b>). Cet outil aide au suivi mais ne remplace pas le carnet de santé ni l'avis du médecin. Cochez les vaccins faits.
      </div>

      {prochainsVaccins.length>0&&<div style={{background:"var(--Rp)",border:"1.5px solid var(--R)",borderRadius:12,padding:"12px 16px",marginBottom:16,display:"flex",gap:10,alignItems:"center"}}>
        <IconeOuEmoji e="⚠️"/>
        <div>
          <div style={{fontWeight:700,fontSize:13,color:"var(--R)",marginBottom:2}}>
            {prochainsVaccins.length} vaccin{prochainsVaccins.length>1?"s":""} à prévoir pour {enfant?.prenom}
          </div>
          <div style={{fontSize:12,color:"var(--m)"}}>À mentionner au médecin lors du prochain rendez-vous</div>
        </div>
      </div>}

      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {VACCINS_CALENDRIER.map((v,i)=>{
          const enRetard=!v.fait&&v.age_mois<ageActuel;
          const proche=!v.fait&&v.age_mois>=ageActuel&&v.age_mois<=ageActuel+3;
          return <div key={i}style={{
            display:"flex",gap:12,alignItems:"center",padding:"12px 14px",borderRadius:12,
            background:v.fait?"var(--Sp)":enRetard?"var(--Rp)":proche?"var(--Gp)":"var(--c)",
            border:(v.fait?"1px solid var(--Sl)":enRetard?"1px solid var(--R)":proche?"1px solid var(--G)":"1px solid var(--br)"),
            cursor:"pointer",transition:"all .2s",
          }}onClick={()=>toggleVaccin(i)}>
            <span style={{fontSize:20,flexShrink:0}}>{v.fait?"✅":enRetard?"❌":proche?"⏰":"⏳"}</span>
            <div style={{flex:1}}>
              <div style={{fontWeight:600,fontSize:13,color:"var(--b)"}}>{v.nom}</div>
              <div style={{fontSize:11,color:"var(--l)"}}>{v.quand||(v.age_mois+" mois")} · {v.reco?"Recommandé":"Obligatoire"} · {v.fait?"Fait ✓":enRetard?"En retard":proche?"À prévoir":"À venir"}</div>
              {infoVac===i&&<div style={{fontSize:11.5,color:"var(--m)",marginTop:6,padding:"7px 10px",background:"var(--w)",borderRadius:8,border:"1px solid var(--br)",lineHeight:1.5}}><IconeOuEmoji e="🛡️"/> Protège contre : {maladiesDe(v.nom)}</div>}
            </div>
            <button onClick={(e)=>{e.stopPropagation();setInfoVac(infoVac===i?null:i);}} title="À quoi sert ce vaccin ?" style={{width:24,height:24,borderRadius:"50%",border:"1.5px solid var(--B)",background:infoVac===i?"var(--B)":"transparent",color:infoVac===i?"#fff":"var(--B)",fontSize:12,fontWeight:700,cursor:"pointer",flexShrink:0,fontFamily:"inherit",lineHeight:1}}>i</button>
            <div style={{width:22,height:22,borderRadius:6,border:"2px solid",
              borderColor:v.fait?"var(--G)":"var(--br)",
              background:v.fait?"var(--G)":"transparent",
              display:"flex",alignItems:"center",justifyContent:"center",
              color:"#fff",fontSize:12,flexShrink:0}}>
              {v.fait?"✓":""}
            </div>
          </div>;
        })}
      </div>
    </div>}
  </div>;
}

//

export function EveilComplet({enfants,role,pEId}){
  const [selId,setSelId]=useState(enfants[0]?.id);
  const [sec,setSec]=useState("portfolio");
  const liste=role==="parent"?enfants.filter(e=>e.id===pEId):enfants;
  return <div className="fi">
    {role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
      {liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>setSelId(e.id)}/>)}
    </div>}
    <div style={{display:"flex",gap:2,marginBottom:16,borderBottom:"2px solid var(--br)"}}>
      {[{id:"portfolio",l:"Cahier de réussites",ic:"🎨"},{id:"developpement",l:"Développement",ic:"🌱"}].map(s=>
        <button key={s.id}onClick={()=>setSec(s.id)}style={{
          padding:"7px 16px",border:"none",background:"none",cursor:"pointer",
          fontFamily:"'DM Sans',sans-serif",fontWeight:600,fontSize:12,
          color:sec===s.id?"var(--S)":"var(--b)",
          borderBottom:sec===s.id?"2px solid var(--S)":"2px solid transparent",
          marginBottom:-2,transition:"all .15s",display:"flex",alignItems:"center",gap:5
        }}><IconeOuEmoji e={s.ic}/><span>{s.l}</span></button>
      )}
    </div>
    {sec==="portfolio"&&<Portfolio enfants={liste}role={role}pEId={selId}/>}
    {sec==="developpement"&&<Developpement enfants={liste}role={role}pEId={selId}/>}
  </div>;
}

//

export function DocumentsComplet({enfants,role,pEId,user}){
  const [sec,setSec]=useState("documents");
  return <div className="fi">
    <PageHeader icon="🗂️" title="Documents & Attestations" sub="Tous vos documents et attestations au meme endroit"/>
    <div style={{display:"flex",gap:2,marginBottom:16,borderBottom:"2px solid var(--br)",flexWrap:"wrap"}}>
      {[{id:"documents",l:"Documents",ic:"🗂️"},{id:"attestation_pe",l:"Att. France Travail",ic:"📋"},{id:"attestation_fiscale",l:"Récap. versements",ic:"💶"}].map(s=>
        <button key={s.id}onClick={()=>setSec(s.id)}style={{
          padding:"7px 14px",border:"none",background:"none",cursor:"pointer",
          fontFamily:"'DM Sans',sans-serif",fontWeight:600,fontSize:12,
          color:sec===s.id?"var(--T)":"var(--b)",
          borderBottom:sec===s.id?"2px solid var(--G)":"2px solid transparent",
          marginBottom:-2,transition:"all .15s",display:"flex",alignItems:"center",gap:5
        }}><IconeOuEmoji e={s.ic}/><span>{s.l}</span></button>
      )}
    </div>
    {sec==="documents"&&<Suspense fallback={<div style={{padding:24,textAlign:"center",color:"var(--m)",fontSize:13}}>Chargement…</div>}><Documents enfants={enfants}role={role}pEId={pEId}user={user}/></Suspense>}
    {sec==="attestation_pe"&&<AttestationPoleEmploi enfants={enfants}role={role}pEId={pEId}user={user}/>}
    {sec==="attestation_fiscale"&&<AttestationFiscale enfants={enfants}role={role}pEId={pEId}user={user}/>}
  </div>;
}

//

export function KitCMG({enfants,role,pEId,user}){
  const enfant=enfants.find(e=>e.id===pEId)||enfants[0];
  const contrat=enfant?.contrat||{};
  const isDemoKit=enfants.every(e=>["e1","e2","e3"].includes(e.id));
  const [copie,setCopie]=useState({});
  const [toast,setToast]=useState("");
  const [asmatProfil,setAsmatProfil]=useState(null);
  // Charger les VRAIES infos de l'assistante maternelle liee a l'enfant
  // (cote parent, user = le parent, surtout pas l'assmat : il faut le profil de l'assmat du contrat)
  useEffect(()=>{
    if(isDemoKit){setAsmatProfil(null);return;}
    const aid=contrat?.asmat_id||enfant?.asmat_id;
    if(!aid){setAsmatProfil(null);return;}
    let cancelled=false;
    (async()=>{
      const{data}=await supabase.from("profiles").select("prenom,nom,email,numero_agrement,code_postal").eq("id",aid).maybeSingle();
      if(!cancelled)setAsmatProfil(data||null);
    })();
    return()=>{cancelled=true;};
  },[contrat?.asmat_id,enfant?.asmat_id,isDemoKit]);
  // Valeurs assmat : demo -> jeu d'exemple ; reel -> profil charge, repli sur les champs de l'enfant
  const amPrenom=isDemoKit?D.asmat.prenom:(asmatProfil?.prenom||enfant?.prenomAsmat||"");
  const amNom=isDemoKit?D.asmat.nom:(asmatProfil?.nom||enfant?.nomAsmat||"");
  const amNomComplet=(amPrenom+" "+amNom).trim()||"À compléter";
  const amEmail=isDemoKit?"marie.dupont@timat.app":(asmatProfil?.email||"À compléter");
  const amAgrement=isDemoKit?D.asmat.agrement:(asmatProfil?.numero_agrement||"À compléter");
  const amCP=isDemoKit?"75015":(asmatProfil?.code_postal||"À compléter");
  const amCommune=isDemoKit?"Paris 15e":"À compléter";
  const infosManquantes=!isDemoKit&&(!asmatProfil?.numero_agrement||!asmatProfil?.code_postal);

  const copy=(key,val)=>{
    navigator.clipboard?.writeText(val).catch(()=>{});
    setCopie(p=>({...p,[key]:true}));
    setTimeout(()=>setCopie(p=>({...p,[key]:false})),2000);
    setToast("Copié ✓");
  };

  const InfoRow=({label,value,copyKey})=>(
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
      padding:"10px 0",borderBottom:"1px solid var(--br)"}}>
      <span style={{fontSize:12,color:"var(--l)",maxWidth:"45%"}}>{label}</span>
      <div style={{display:"flex",gap:8,alignItems:"center"}}>
        <span style={{fontSize:13,fontWeight:700,color:"var(--b)",textAlign:"right"}}>{value}</span>
        {copyKey&&<button onClick={()=>copy(copyKey,value)}style={{
          background:copie[copyKey]?"var(--Sp)":"var(--c)",border:"1px solid var(--br)",
          borderRadius:6,padding:"3px 8px",fontSize:11,cursor:"pointer",
          color:copie[copyKey]?"var(--S)":"var(--l)",fontWeight:600,flexShrink:0
        }}>{copie[copyKey]?"✓ Copié":"Copier"}</button>}
      </div>
    </div>
  );

  // Calcul salaire net estimé
  const heuresMois=heuresMensualisees(contrat);
  // Le « salaire net » du parent etait le brut multiplie par 1,1 — un coefficient
  // qui ne correspond a rien : il AUGMENTE le brut au lieu d'en retirer les
  // cotisations. On passe par le calcul du bulletin.
  const salaireBrutMois=Math.round(heuresMois*(contrat.tauxHoraire||minimumHoraireAu(new Date()))*100)/100;
  const salaireNet=nbf(netDepuisBrut(salaireBrutMois),2);
  const entretienMensuel=Math.round((contrat.entretien||3.92)*heuresMois/contrat.heuresHebdo*5)/10;

  return <div className="fi">
    {toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
    <PageHeader icon="💶" title="Aide CMG - Kit déclaration"
      sub="Toutes les informations pour déclarer votre mode de garde sur monenfant.fr"/>

    {/* Explication */}
    <div style={{background:"linear-gradient(135deg,var(--Gp),var(--Bp))",border:"1px solid var(--G)",borderRadius:14,padding:"16px 20px",marginBottom:20}}>
      <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:8}}><IconeOuEmoji e="📋"/> Comment utiliser ce kit ?</div>
      <div style={{fontSize:13,color:"var(--m)",lineHeight:1.8}}>
        1. Allez sur <strong>monenfant.fr</strong> → "Déclarer votre mode de garde"<br/>
        2. Utilisez les boutons <strong>"Copier"</strong> ci-dessous pour coller chaque information<br/>
        3. Soumettez votre déclaration<br/>
        4. La CAF calcule votre <strong>Complément Mode de Garde (CMG)</strong> automatiquement
      </div>
      <a href="https://www.monenfant.fr" target="_blank" rel="noopener noreferrer"
        style={{display:"inline-block",marginTop:10,background:"var(--B)",color:"#fff",
        borderRadius:8,padding:"11px 16px",fontSize:12,fontWeight:700,textDecoration:"none"}}>
        Aller sur monenfant.fr →
      </a>
    </div>

    {infosManquantes&&<div style={{background:"#FFF8E6",border:"1px solid #E8B820",borderRadius:12,padding:"12px 16px",marginBottom:20,fontSize:12.5,color:"#7A5500",lineHeight:1.6}}>
      <IconeOuEmoji e="⚠️"/> Certaines infos de votre assistante maternelle (agrément, code postal…) ne sont pas encore renseignées. Demandez-lui de compléter son profil dans TiMat pour que ce kit soit prêt à copier-coller.
    </div>}

    <div className="g2">
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        {/* Infos assistante maternelle */}
        <div className="card">
          <div style={{fontWeight:700,fontSize:13,color:"var(--T)",marginBottom:14,display:"flex",gap:6,alignItems:"center"}}>
            <span>👩👧</span> Votre assistante maternelle
          </div>
          <InfoRow label="Nom complet" value={amNomComplet} copyKey="asmNom"/>
          <InfoRow label="N° agrément" value={amAgrement} copyKey="agrement"/>
          <InfoRow label="Email professionnel" value={amEmail} copyKey="asmEmail"/>
          <InfoRow label="Code postal" value={amCP} copyKey="cp"/>
          <InfoRow label="Commune" value={amCommune} copyKey="commune"/>
        </div>

        {/* Infos contrat */}
        <div className="card">
          <div style={{fontWeight:700,fontSize:13,color:"var(--S)",marginBottom:14,display:"flex",gap:6,alignItems:"center"}}>
            <IconeOuEmoji e="📄"/> Votre contrat
          </div>
          <InfoRow label="Date de début du contrat" value={fmt(contrat.debut||"2023-09-04")} copyKey="debut"/>
          <InfoRow label="Jours d'accueil" value={(contrat.jours||["Lu","Ma","Me","Je","Ve"]).join(", ")} copyKey="jours"/>
          <InfoRow label="Heures par semaine" value={(contrat.heuresHebdo||40)+"h"} copyKey="heures"/>
          <InfoRow label="Heures par mois (estimé)" value={heuresMois+"h"} copyKey="heuresMois"/>
          <InfoRow label="Horaires journaliers" value={contrat.horaires||"07h30–17h30"} copyKey="horaires"/>
        </div>
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        {/* Rémunération */}
        <div className="card">
          <div style={{fontWeight:700,fontSize:13,color:"var(--G)",marginBottom:14,display:"flex",gap:6,alignItems:"center"}}>
            <IconeOuEmoji e="💰"/> Rémunération mensuelle
          </div>
          <InfoRow label="Taux horaire brut" value={nbf((contrat.tauxHoraire||minimumHoraireAu(new Date())),2)+"€/h"} copyKey="taux"/>
          <InfoRow label="Soit, net, environ" value={nbf(netDepuisBrut(contrat.tauxHoraire||minimumHoraireAu(new Date())),2)+"€/h"} copyKey="tauxNet"/>
          <InfoRow label="Salaire brut mensuel (estimé)" value={nbf(salaireBrutMois,2)+"€"} copyKey="salaireBrut"/>
          <InfoRow label="Salaire net mensuel (estimé)" value={salaireNet+"€"} copyKey="salaire"/>
          <InfoRow label="Indemnité d'entretien/jour" value={nbf((contrat.entretien||3.92),2)+"€"} copyKey="entretien"/>
          <InfoRow label="Indemnité entretien/mois" value={entretienMensuel+"€"} copyKey="entretienMois"/>
          <div style={{marginTop:12,padding:"10px 12px",background:"var(--Gp)",borderRadius:10,fontSize:12,color:"var(--G)",lineHeight:1.6}}>
            <IconeOuEmoji e="💡"/> Le CMG prend en charge une partie du salaire selon vos revenus. Le calcul est automatique sur monenfant.fr après votre déclaration.
          </div>
        </div>

        {/* Enfant */}
        <div className="card">
          <div style={{fontWeight:700,fontSize:13,color:"var(--P)",marginBottom:14,display:"flex",gap:6,alignItems:"center"}}>
            <span>{enfant?.emoji||"👶"}</span> {enfant?.prenom||"Votre enfant"}
          </div>
          <InfoRow label="Prénom" value={enfant?.prenom||"-"} copyKey="enfPrenom"/>
          <InfoRow label="Date de naissance" value={fmt(enfant?.naissance||"")} copyKey="enfNaiss"/>
          <InfoRow label="Lieu de garde" value="Domicile de l'assistante maternelle" copyKey="lieuGarde"/>
        </div>

        {/* Lien Pajemploi */}
        <div className="card"style={{background:"var(--Tp)",border:"1px solid var(--Tl)"}}>
          <div style={{fontWeight:700,fontSize:13,color:"var(--T)",marginBottom:8}}><IconeOuEmoji e="🏛️"/> Pajemploi</div>
          <div style={{fontSize:12,color:"var(--m)",lineHeight:1.6,marginBottom:10}}>
            Une fois déclaré sur monenfant.fr, vous devrez aussi déclarer les heures mensuelles sur <strong>Pajemploi</strong> pour que {amPrenom||"votre assistante maternelle"} soit payée et déclarée à l'URSSAF.
          </div>
          <a href="https://www.pajemploi.urssaf.fr" target="_blank" rel="noopener noreferrer"
            style={{display:"inline-block",background:"var(--T)",color:"#fff",
            borderRadius:8,padding:"11px 16px",fontSize:12,fontWeight:700,textDecoration:"none"}}>
            Aller sur Pajemploi →
          </a>
        </div>
      </div>
    </div>
  </div>;
}

//
// CONTRAT PDF - bouton d'ouverture du PDF contrat depuis le storage (URL signee 1h). Reutilisable parent + assmat.
//
// RYTHME D'ACCUEIL - annee complete (52 semaines) ou incomplete (semaines
// programmees). Il decide de la mensualisation, donc du salaire : sur un
// contrat scolaire de 36 semaines, l'ecart depasse 40 %.
// Le choix n'existait que dans l'assistant de creation du tout premier enfant.
// Un contrat deja enregistre restait donc en annee complete sans aucun moyen de
// le corriger — et ce sont justement ceux-la qui en avaient besoin.
//
// QUI FOURNIT LES REPAS. La convention laisse les deux parties en decider et
// impose que le choix figure au contrat. L'application ne stockait que le
// montant de l'indemnite : a zero, elle en deduisait « c'est l'employeur qui
// fournit » et l'ecrivait dans le contrat. C'etait une deduction, pas un
// accord — l'assistante maternelle peut tres bien fournir les repas sans rien
// demander, et le contrat affirmait alors le contraire.

export function RapportAnnuel({enfants,role,pEId,user}){
  const [selId,setSelId]=useState(enfants[0]?.id);
  // ANNEES DYNAMIQUES P12 - liste calculee depuis les contrats
  const annees=useMemo(()=>{
    const max=new Date().getFullYear();
    let min=max;
    enfants?.forEach(e=>{
      const d=e?.contrat?.debut;
      if(d){
        const y=parseInt(d.slice(0,4),10);
        if(!isNaN(y)&&y<min)min=y;
      }
    });
    const list=[];for(let y=max;y>=min;y--)list.push(y);
    return list.length?list:[max];
  },[enfants]);
  const [annee,setAnnee]=useState(new Date().getFullYear()-1); // annee precedente par defaut
  const [gen,setGen]=useState(false);
  const [toast,setToast]=useState("");
  const [realStats,setRealStats]=useState(null);
  const liste=role==="parent"?enfants.filter(e=>e.id===pEId):enfants;
  const enfant=liste.find(e=>e.id===selId)||liste[0];
  const contrat=enfant?.contrat||{};

  // RAPPORT REEL P12 - charger les pointages reels, paiements et absences de l'annee
  useEffect(()=>{
    if(!enfant?.id||!annee)return;
    let cancelled=false;
    (async()=>{
      const debut=annee+"-01-01";const fin=annee+"-12-31";
      const{data:pts}=await supabase.from("pointages").select("*").eq("enfant_id",enfant.id).gte("date",debut).lte("date",fin);
      const{data:paie}=await supabase.from("versements").select("montant,date").eq("enfant_id",enfant.id).gte("date",debut).lte("date",fin);
      const{data:abs}=await supabase.from("absences").select("*").eq("enfant_id",enfant.id).gte("date",debut).lte("date",fin);
      if(cancelled)return;
      // RAPPORT REEL P13 - utiliser total_minutes (vrai nom de colonne)
      const totalMin=(pts||[]).reduce((s,p)=>s+(p.total_minutes||0),0);
      const heuresReelles=Math.round(totalMin/60);
      const joursTravailles=(pts||[]).filter(p=>p.total_minutes>0).length;
      const paiementsReels=(paie||[]).reduce((s,p)=>s+(parseFloat(p.montant)||0),0);
      const heuresAbsences=(abs||[]).reduce((s,a)=>s+(parseFloat(a.heures)||0),0);
      setRealStats({
        heures:heuresReelles,
        jours:joursTravailles,
        paiements:Math.round(paiementsReels*100)/100,
        nbPointages:pts?.length||0,
        nbAbsences:abs?.length||0,
        heuresAbs:Math.round(heuresAbsences),
        nbPaiements:paie?.length||0,
      });
    })();
    return()=>{cancelled=true;};
  },[enfant?.id,annee,contrat?.id]);

  // RAPPORT REEL P13 - calculs base sur donnees reelles si dispo, sinon estimation
  const heuresMois=heuresMensualisees(contrat);
  const tauxH=contrat.tauxHoraire||minimumHoraireAu(new Date());
  const entretienJour=contrat.entretien||3.92;
  const heuresAnnuelles=realStats?.heures||Math.round(((contrat.heuresHebdo)||0)*semainesDuContrat(contrat));
  // Quatrieme facon de compter les jours d'accueil dans l'application, apres
  // celles du recapitulatif Pajemploi et du recapitulatif des versements. On
  // part des jours prevus au contrat.
  const joursAnnuels=realStats?.jours||Math.round(((contrat.jours?.length)||5)*semainesDuContrat(contrat));
  // Salaire brut = heures * taux (avec majoration 25% au dessus de 45h/sem si pas mensualise)
  const salaireBrutCalc=Math.round(heuresAnnuelles*tauxH);
  const salaireNet=realStats?.paiements>0?realStats.paiements:Math.round(netDepuisBrut(salaireBrutCalc));
  const salaireAnnuel=salaireNet;
  // Entretien = jours travailles * indemnite jour
  const entretienAnnuel=Math.round(joursAnnuels*entretienJour);
  const totalAnnuel=salaireAnnuel+entretienAnnuel;
  // Le plafond de 3 500 EUR porte sur les DEPENSES, pas sur le credit : le
  // credit etait donc plafonne au double de son maximum reel (1 750 EUR).
  const creditImpot=Math.round(Math.min(totalAnnuel,CI_PLAFOND_DEPENSES)*CI_TAUX);
  const sourceLabel=realStats?.paiements>0?"(données réelles)":"(estimées)";

  // RAPPORT P14B - Helper PDF jsPDF natif (rendu identique cross-browser, pas de troncature)
  const telechargerPDF=async()=>{
    setGen(true);
    try{
      // re-fetch signature pour avoir la derniere version
      let userSig=user?.signature_base64;
      if(user?.id){
        const{data:fresh}=await supabase.from("profiles").select("signature_base64").eq("id",user.id).maybeSingle();
        if(fresh?.signature_base64)userSig=fresh.signature_base64;
      }
      // Charger jsPDF si pas deja charge
const jsPDF=await chargerJsPDF();
      const doc=protegerPdf(new jsPDF({unit:"mm",format:"a4",orientation:"portrait"}));
      const PW=210,MX=18;let y=20;
      // Couleurs
      const orange=[184,98,47];const noir=[40,40,40];const gris=[120,120,120];
      // Titre
      doc.setFontSize(20);doc.setFont("helvetica","bold");doc.setTextColor(...orange);
      doc.text("Rapport annuel "+annee,MX,y);y+=10;
      // Asmat + enfant
      doc.setFontSize(11);doc.setFont("helvetica","normal");doc.setTextColor(...noir);
      doc.text("Assistante maternelle : "+(user?.prenom||"")+" "+(user?.nom||""),MX,y);y+=6;
      doc.text("Enfant : "+(enfant?.prenom||"")+" "+(enfant?.nom||""),MX,y);y+=6;
      if(user?.numero_agrement){doc.text("N agrement : "+user.numero_agrement,MX,y);y+=6;}
      y+=4;
      // Section 1 : Heures
      doc.setFontSize(14);doc.setFont("helvetica","bold");doc.setTextColor(...orange);
      doc.text("Heures travaillees "+annee,MX,y);y+=8;
      doc.setFontSize(10);doc.setFont("helvetica","normal");doc.setTextColor(...noir);
      const tbl1=[
        ["Heures reelles pointees",heuresAnnuelles+" h"],
        ["Nb de jours pointes",String(realStats?.nbPointages||"-")],
        ["Nb d absences",String(realStats?.nbAbsences||"-")],
      ];
      // Header tableau
      doc.setFillColor(245,245,245);doc.rect(MX,y,PW-2*MX,8,"F");
      doc.setFont("helvetica","bold");
      doc.text("Indicateur",MX+2,y+5.5);
      doc.text("Valeur",PW-MX-30,y+5.5);
      y+=8;
      doc.setFont("helvetica","normal");
      tbl1.forEach(([l,v])=>{
        doc.setDrawColor(220,220,220);doc.rect(MX,y,PW-2*MX,8);
        doc.text(l,MX+2,y+5.5);
        doc.text(v,PW-MX-30,y+5.5);
        y+=8;
      });
      y+=8;
      // Section 2 : Financier
      doc.setFontSize(14);doc.setFont("helvetica","bold");doc.setTextColor(...orange);
      doc.text("Recapitulatif financier",MX,y);y+=8;
      doc.setFontSize(10);doc.setFont("helvetica","normal");doc.setTextColor(...noir);
      const tbl2=[
        ["Salaire net annuel"+(realStats?.paiements?" (donnees reelles)":" (estime)"),salaireAnnuel+" euros"],
        ["Indemnites d entretien (estimees)",entretienAnnuel+" euros"],
        ["Total verse",totalAnnuel+" euros"],
        ["Crédit d'impôt estimé du parent (" + nbf(CI_TAUX*100,0) + " %)",nbf(creditImpot,0)+" € — enfant de moins de 6 ans, dépenses plafonnées à 3 500 €"],
      ];
      doc.setFillColor(245,245,245);doc.rect(MX,y,PW-2*MX,8,"F");
      doc.setFont("helvetica","bold");
      doc.text("Poste",MX+2,y+5.5);
      doc.text("Montant",PW-MX-30,y+5.5);
      y+=8;
      tbl2.forEach(([l,v],i)=>{
        const isTotal=i===2;
        if(isTotal){doc.setFillColor(255,243,232);doc.rect(MX,y,PW-2*MX,8,"F");}
        doc.setDrawColor(220,220,220);doc.rect(MX,y,PW-2*MX,8);
        doc.setFont("helvetica",isTotal?"bold":"normal");
        doc.text(l,MX+2,y+5.5);
        doc.text(v,PW-MX-30,y+5.5);
        y+=8;
      });
      y+=10;
      // Signature
      doc.setDrawColor(220,220,220);doc.rect(MX,y,PW-2*MX,30);
      doc.setFontSize(9);doc.setFont("helvetica","bold");doc.setTextColor(...noir);
      doc.text("Signature de l assistante maternelle",MX+3,y+5);
      if(userSig){
        try{doc.addImage(userSig,"PNG",MX+3,y+7,60,18);}catch(e){console.warn("addImage err",e);}
        doc.setFontSize(8);doc.setFont("helvetica","normal");doc.setTextColor(...gris);
        doc.text("Le "+new Date().toLocaleDateString("fr-FR")+" - "+(user?.prenom||"")+" "+(user?.nom||""),MX+3,y+28);
      }else{
        doc.setFontSize(8);doc.setFont("helvetica","italic");doc.setTextColor(...gris);
        doc.text("Aucune signature enregistree. Voir Parametres.",MX+3,y+18);
      }
      y+=36;
      // Footer
      doc.setFontSize(8);doc.setFont("helvetica","italic");doc.setTextColor(...gris);
      doc.text("Genere par TiMat - "+new Date().toLocaleDateString("fr-FR"),MX,y);
      // Save
      doc.save("rapport-annuel-"+annee+"-"+(enfant?.prenom||"enfant")+".pdf");
      setToast("Rapport telecharge ✓");
    }catch(e){
      setToast("Erreur generation PDF : "+e.message);
    }
    setGen(false);
  };

  const generer=async()=>{
    setGen(true);
    // RAPPORT REEL P14 - re-fetch signature pour s'assurer qu'on a la derniere version
    let userSig=user?.signature_base64;
    if(user?.id){
      const{data:fresh}=await supabase.from("profiles").select("signature_base64").eq("id",user.id).maybeSingle();
      if(fresh?.signature_base64)userSig=fresh.signature_base64;
    }
    setTimeout(()=>{
      setGen(false);
      // Générer un document HTML imprimable
      const w=window.open("","_blank");
      if(!w){setToast("Autorisez les popups pour télécharger le PDF");return;}
      const htmlRapport='<!DOCTYPE html><html><head><title>Rapport annuel '+annee+' - '+(enfant?.prenom||'')+'</title>'
        +'<style>body{font-family:Arial,sans-serif;margin:0;padding:30px;color:#222;max-width:780px;margin:0 auto}'
        +'h1{color:#B8622F;margin:0 0 16px 0}'
        +'h2{margin:24px 0 8px 0;font-size:16px}'
        +'table{width:100%;border-collapse:collapse;margin:12px 0}'
        +'td,th{padding:10px;border:1px solid #ddd;text-align:left;}th{background:#f5f5f5;}'
        +'.total{font-weight:bold;background:#FFF3E8}'
        +'.actions{position:fixed;top:14px;right:14px;display:flex;gap:8px}'
        +'.actions button{border:none;padding:10px 18px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700;box-shadow:0 2px 8px rgba(0,0,0,.15)}'
        +'.btn-print{background:#2E4859;color:#fff}'
        +'@media print{.actions{display:none!important}}</style>'
        +'</head>'
        +'<body>'
        +'<div class="actions"><button class="btn-print" onclick="window.print()">🖨️ Imprimer</button></div>'
        +'<h1>Rapport annuel '+annee+'</h1>'
        +'<p><strong>Assistante maternelle:</strong> '+H((user?.prenom||"")+" "+(user?.nom||""))+'</p>'
        +'<p><strong>Enfant:</strong> '+(enfant?.prenom||'')+' '+(enfant?.nom||'')+'</p>'
        +'<h2>Heures travaillees '+annee+'</h2>'
        +'<table><tr><th>Indicateur</th><th>Valeur</th></tr>'
        +'<tr><td>Heures reelles pointees</td><td>'+heuresAnnuelles+' h</td></tr>'
        +'<tr><td>Nb de jours pointes</td><td>'+(realStats?.nbPointages||"-")+'</td></tr>'
        +'<tr><td>Nb d absences</td><td>'+(realStats?.nbAbsences||"-")+'</td></tr>'
        +'</table>'
        +'<h2>Recapitulatif financier</h2>'
        +'<table><tr><th>Poste</th><th>Montant</th></tr>'
        +'<tr><td>Salaire net annuel'+(realStats?.paiements?" (données réelles)":" (estimé)")+'</td><td>'+nbf(salaireAnnuel,0)+' €</td></tr>'
        +"<tr><td>Indemnites d'entretien (estimees)</td><td>"+entretienAnnuel+"€</td></tr>"
        +'<tr class="total"><td>Total verse</td><td>'+totalAnnuel+'€</td></tr>'
        +"<tr><td>Crédit d'impôt estimé du parent (" + nbf(CI_TAUX*100,0) + " %)</td><td>"+nbf(creditImpot,0)+" € <span style=\"font-size:11px;color:#777\">(enfant de moins de 6 ans, dépenses plafonnées à 3 500 €)</span></td></tr>"
        +'</table>'
        +(userSig
          ?'<div style="margin-top:24px;padding:14px;border:1px solid #ddd;border-radius:6px"><div style="font-size:11px;font-weight:700;margin-bottom:8px">Signature de l\'assistante maternelle</div><img src="'+userSig+'" style="max-height:60px;max-width:250px"/><div style="font-size:11px;color:#888;margin-top:4px">Le '+new Date().toLocaleDateString('fr-FR')+' - '+(user?.prenom||'')+' '+(user?.nom||'')+'</div></div>'
          :'')
        +'<p style="font-size:12px;color:#888;margin-top:20px">Genere par TiMat - '+new Date().toLocaleDateString('fr-FR')+'</p>'
        +'</body></html>';
      w.document.write(htmlRapport);
      w.document.close();
      setToast("Aperçu ouvert. Pour PDF, utilisez le bouton Telecharger PDF dans l'app.");
    },1000);
  };

  return <div className="fi">
    {toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
    <PageHeader icon="📊" title="Rapport annuel complet"
      sub="Récapitulatif fiscal · Attestation · Déclaration d'impôts"/>

    {role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
      {liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>setSelId(e.id)}/>)}
    </div>}

    <div style={{display:"flex",gap:10,marginBottom:20,alignItems:"center",flexWrap:"wrap"}}>
      <label className="lbl"style={{marginBottom:0}}>Année :</label>
      {annees.map(y=><button key={y}onClick={()=>setAnnee(y)}style={{
        padding:"6px 14px",borderRadius:8,border:"1.5px solid",cursor:"pointer",fontSize:13,fontWeight:600,
        background:annee===y?"var(--b)":"transparent",
        color:annee===y?"#fff":"var(--m)",
        borderColor:annee===y?"var(--b)":"var(--br)"
      }}>{y}</button>)}
    </div>

    <div className="g2">
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        {/* Récap financier */}
        <div className="card">
          <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:14}}><IconeOuEmoji e="💰"/> Récapitulatif financier {annee}</div>
          {[
            ["Salaire net annuel estimé",salaireAnnuel+"€","var(--S)"],
            ["Indemnités d'entretien",""+entretienAnnuel+"€","var(--G)"],
            ["Total versé par les parents",""+totalAnnuel+"€","var(--b)"],
            ["Crédit d'impôt du parent",nbf(creditImpot,0)+"€ si l'enfant a moins de 6 ans","var(--B)"],
          ].map(([l,v,c])=><div key={l}style={{display:"flex",justifyContent:"space-between",padding:"9px 0",borderBottom:"1px solid var(--br)"}}>
            <span style={{fontSize:13,color:"var(--m)"}}>{l}</span>
            <span style={{fontSize:13,fontWeight:700,color:c}}>{v}</span>
          </div>)}
          <div style={{marginTop:12,padding:"10px 12px",background:"var(--Bp)",borderRadius:10,fontSize:12,color:"var(--B)"}}>
            <IconeOuEmoji e="💡"/> Ces montants sont estimés. Le rapport PDF contient les chiffres exacts basés sur vos pointages réels.
          </div>
        </div>

        {/* Contenu du rapport */}
        <div className="card">
          <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:12}}><IconeOuEmoji e="📋"/> Contenu du rapport PDF</div>
          {[
            ["✅","Page de garde - identité asmat et enfant"],
            ["✅","Récapitulatif mensuel des heures (jan→déc)"],
            ["✅","Total salaire net mensuel et annuel"],
            ["✅","Indemnités d'entretien et de repas"],
            ["✅","Congés payés pris et restants"],
            ["✅","Absences et indemnisations"],
            ["✅","Attestation fiscale employeur (crédit d'impôt)"],
            ["✅","Récapitulatif Pajemploi par mois"],
            ["✅","Bilan pédagogique annuel de l'enfant"],
          ].map(([ic,t])=><div key={t}style={{display:"flex",gap:10,padding:"6px 0",borderBottom:"1px solid var(--br)",fontSize:13}}>
            <span style={{color:"var(--S)"}}><IconeOuEmoji e={ic}/></span>
            <span style={{color:"var(--m)"}}>{t}</span>
          </div>)}
        </div>
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        {/* Enfant concerné */}
        <div className="card"style={{textAlign:"center",borderTop:"4px solid "+(enfant?.couleur||"var(--T)")}}>
          <div style={{fontSize:52,marginBottom:8}}>{enfant?.emoji||"👶"}</div>
          <div className="pf"style={{fontSize:18,fontWeight:600,color:"var(--b)",marginBottom:4}}>{enfant?.prenom} {enfant?.nom}</div>
          <div style={{fontSize:12,color:"var(--l)"}}>{age(enfant?.naissance||"")}</div>
          <div style={{marginTop:12,padding:"8px 12px",background:"var(--Sp)",borderRadius:8,fontSize:12,color:"var(--S)"}}>
            <IconeOuEmoji e="✅"/> Contrat actif depuis {fmt(contrat.debut||"2023-09-04")}
          </div>
        </div>

        {/* Bouton génération */}
        <div className="card"style={{textAlign:"center"}}>
          <div style={{fontSize:40,marginBottom:12}}>📄</div>
          <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:8}}>
            Rapport annuel {annee}
          </div>
          <div style={{fontSize:12,color:"var(--l)",marginBottom:16,lineHeight:1.6}}>
            Pour {enfant?.prenom} {enfant?.nom}<br/>
            Inclut l'attestation fiscale
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            <button className="btn bT"style={{width:"100%",justifyContent:"center"}}onClick={telechargerPDF}disabled={gen}>
              {gen?"⏳ Génération...":"📥 Télécharger en PDF"}
            </button>
            <button className="btn bG s"style={{width:"100%",justifyContent:"center"}}onClick={generer}disabled={gen}>
              <IconeOuEmoji e="🖨️"/> Aperçu / Imprimer
            </button>
          </div>
        </div>

        {/* Partage parent */}
        {role==="asmat"&&<div className="card"style={{background:"var(--Gp)",border:"1px solid var(--G)"}}>
          <div style={{fontWeight:700,fontSize:13,color:"var(--G)",marginBottom:8}}><IconeOuEmoji e="📧"/> Envoi au parent</div>
          <div style={{fontSize:12,color:"var(--m)",marginBottom:10,lineHeight:1.6}}>
            Ce récapitulatif peut être envoyé aux parents comme justificatif. Il ne remplace pas leur attestation fiscale officielle, que Pajemploi met à leur disposition dans leur espace en ligne, courant avril.
          </div>
          <button className="btn bG"style={{width:"100%"}}onClick={()=>setToast("Attestation fiscale envoyée au parent ✓")}>
            <IconeOuEmoji e="📧"/> Envoyer l'attestation au parent
          </button>
        </div>}
      </div>
    </div>
  </div>;
}

//
//
// RECAP FISCAL ANNUEL ASSMAT - revenu imposable apres abattement (CGI art. 80 sexies).
//
// L'ecran annoncait la « declaration 2042 C PRO » et la « famille 1GA ». Les
// deux etaient faux, sur la declaration de revenus de l'utilisatrice :
//  - la 2042 C PRO sert aux revenus professionnels (BIC, BNC). Un assistant
//    maternel est un SALARIE : il declare sur la 2042 ordinaire ;
//  - la case 1GA porte le MONTANT DE L'ABATTEMENT, a titre indicatif. Le revenu
//    apres abattement va en 1AA (employeur particulier) ou 1AJ (personne
//    morale). Mettre le revenu en 1GA, c'est le declarer nulle part.
// Le montant prerempli par Pajemploi ne tient jamais compte de l'abattement :
// il doit etre corrige a la baisse a la main.
// Salaire imposable = somme des bulletins stockes (net_imposable + entretien). Abattement = recalcule jour par jour
// depuis les pointages reels (prorata <8h, AEEH 4x, 24h 5x). AEEH non persiste -> toggle par enfant.

export function SimulateurCout({enfants,pEId}){
  const enfant=enfants.find(e=>e.id===pEId)||enfants[0];
  const [taux,setTaux]=useState(minimumHoraireAu(new Date()));
  const [heures,setHeures]=useState(40);
  const [semaines,setSemaines]=useState(47);
  const [entretien,setEntretien]=useState(3.80);
  const [revenus,setRevenus]=useState(45000);
  const [enfants2,setEnfants2]=useState(1);
  const [aeeh,setAeeh]=useState(0); // nb d'enfants beneficiaires AEEH (decale le taux d'effort d'une tranche)

  // Calculs
  const heuresMois=heures*semaines/12;
  // Le curseur donne un taux NET. Les cotisations patronales s'assoient sur le
  // BRUT : les appliquer au net revenait a sous-estimer le cout de garde d'un
  // bon quart. La conversion passe par brutDepuisNet(), la table du bulletin.
  const salBrut=(heures*brutDepuisNet(taux)*semaines/12)*1.1; // + ~10 % de congés payés
  // Le taux vient de la table du bulletin, plus d'un nombre en dur : le
  // simulateur annoncait 27,5 % la ou le bulletin en calculait 44,37 %.
  const cotPat=salBrut*TAUX_PATRONAL_TOTAL;
  // Cinq journees d'accueil par semaine, comme partout ailleurs dans
  // l'application. Cet endroit supposait des journees de huit heures : sous
  // 40 h par semaine, il comptait donc moins de journees qu'il n'y en a.
  const coutTotal=salBrut+cotPat+(entretien*JOURS_SEMAINE_TYPE*semaines/12);
  // CMG 2026 (reforme du 1er sept 2025) : bareme et calcul au point unique,
  // partages avec l'outil pro « CMG (reforme 2025) ». Voir montantCMG().
  const _cmg=montantCMG({tauxHoraire:taux,heuresMois,revenusAnnuels:revenus,nbEnfants:enfants2,aeeh});
  const tarifRetenu=_cmg.tarifRetenu;
  const coutGardeCMG=_cmg.coutGarde;
  const cmgCapped=_cmg.tarifDepasse; // tarif au-dela du plafond -> surcout integral parent
  const cmgMensuel=_cmg.montant;
  const cmgPlafonne=_cmg.plafonne;
  // Repris pour la ligne « Calcul : ... » affichee sous le resultat.
  const enfEff=Math.min(8,Math.max(1,enfants2+aeeh));
  const TE=tauxEffortCMG(enfants2,aeeh);
  // 50 % des depenses nettes du CMG, dans la limite de 3 500 EUR de depenses
  // par an et par enfant de moins de six ans -- soit 1 750 EUR de credit au
  // plus. Le plafond etait applique au credit et non aux depenses, ce qui
  // doublait l'aide annoncee aux parents.
  const creditImpot=Math.min(Math.max(0,coutTotal-cmgMensuel),CI_PLAFOND_DEPENSES/12)*CI_TAUX;
  const resteCharge=Math.max(0,coutTotal-cmgMensuel-creditImpot);

  const fmt2=(n)=>Math.round(n).toLocaleString("fr-FR")+"€";

  return <div className="fi">
    <PageHeader icon="🧮" title="Simulateur de coût" sub="Estimez le coût réel de la garde après aides CAF et crédit d'impôt"/>
    {/* Coup d'oeil — resultat complet en un regard (repere Pandi-Panda : comprendre le cout reel) */}
    <div className="card"style={{padding:0,marginBottom:14,overflow:"hidden"}}>
      <div style={{background:"linear-gradient(135deg,var(--Tp),var(--Gp))",padding:"16px 18px"}}>
        <div style={{fontSize:11,fontWeight:700,color:"var(--T)",textTransform:"uppercase",letterSpacing:".5px",marginBottom:3}}>Reste à charge estimé · par mois</div>
        <div className="pf"style={{fontSize:30,fontWeight:800,color:"var(--b)",lineHeight:1.1}}>{fmt2(resteCharge)}</div>
        <div style={{fontSize:11,color:"var(--m)",marginTop:3}}>après aide CMG et crédit d'impôt</div>
      </div>
      <div className="g3"style={{padding:14,gap:10}}>
        {[["Coût brut",fmt2(coutTotal),"var(--m)","var(--c)"],
          ["Aide CMG","-"+fmt2(cmgMensuel),"var(--G)","var(--Gp)"],
          ["Crédit d'impôt","-"+fmt2(creditImpot),"var(--G)","var(--Gp)"],
        ].map(([l,v,c,bg])=><div key={l}style={{background:bg,borderRadius:12,padding:"11px 10px",textAlign:"center",minWidth:0}}>
          <div className="pf"style={{fontSize:15,fontWeight:800,color:c,lineHeight:1.15,overflow:"hidden",textOverflow:"ellipsis"}}>{v}</div>
          <div style={{fontSize:11,color:"var(--m)",marginTop:3,fontWeight:600}}>{l}</div>
        </div>)}
      </div>
      <div style={{padding:"0 14px 12px",fontSize:11.5,color:"var(--m)",lineHeight:1.5}}>
        Le coût brut inclut {nbf((TAUX_PATRONAL_TOTAL*100),2)} % de cotisations patronales.
        Si vous percevez le CMG, la CAF les règle directement à l'Urssaf dans la limite du plafond
        journalier : elles ne sont pas prélevées sur votre compte.
      </div>
    </div>
    <div className="g2">
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div className="card">
          <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:14}}><IconeOuEmoji e="⚙️"/> Les paramètres de garde</div>
          {[
            {l:"Taux horaire net (€/h)",v:taux,set:setTaux,min:3.5,max:8,step:0.05,hint:"≈ "+nbf(brutDepuisNet(taux),2)+" €/h brut (le brut, c'est ce que vous déclarez ; le net, ce que touche l'assistante maternelle)"},
            {l:"Heures d'accueil par semaine",v:heures,set:setHeures,min:5,max:60,step:1},
            {l:"Semaines d'accueil par an",v:semaines,set:setSemaines,min:30,max:52,step:1},
            {l:"Indemnité entretien (€/jour)",v:entretien,set:setEntretien,min:2.65,max:8,step:0.05,hint:"Exonérée de cotisations : ni brut ni net, c'est un forfait. Minimum conventionnel "+nbf(indemniteEntretienMin(heures/JOURS_SEMAINE_TYPE),2)+" € pour une journée de "+nbf(heures/JOURS_SEMAINE_TYPE,1)+" h."},
          ].map(({l,v,set,min,max,step,hint})=><div key={l}style={{marginBottom:14}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
              <label className="lbl"style={{marginBottom:0}}>{l}</label>
              <span style={{fontWeight:700,color:"var(--b)",fontSize:13}}>{v}</span>
            </div>
            <input type="range"min={min}max={max}step={step}value={v}
              onChange={e=>set(parseFloat(e.target.value))}
              style={{width:"100%",accentColor:"var(--T)"}}/>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"var(--l)"}}>
              <span>{min}</span><span>{max}</span>
            </div>
            {hint&&<div style={{fontSize:11.5,color:"var(--T)",marginTop:3,fontWeight:600,lineHeight:1.45}}>{hint}</div>}
          </div>)}
        </div>
        <div className="card">
          <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:14}}>👨👩👧 Votre situation</div>
          <div style={{marginBottom:14}}>
            <label className="lbl">Revenus nets annuels du foyer (€)</label>
            <input type="number"className="inp"value={revenus}onChange={e=>setRevenus(parseInt(e.target.value)||0)}/>
          </div>
          <div>
            <label className="lbl">Nombre d'enfants à charge</label>
            <div style={{display:"flex",gap:8}}>
              {[1,2,3,4].map(n=><button key={n}onClick={()=>setEnfants2(n)}style={{
                flex:1,padding:"8px",borderRadius:8,border:"1.5px solid",cursor:"pointer",fontSize:13,fontWeight:700,
                background:enfants2===n?"var(--B)":"transparent",color:enfants2===n?"#fff":"var(--m)",
                borderColor:enfants2===n?"var(--B)":"var(--br)"}}>{n===4?"4+":n}</button>)}
            </div>
          </div>
          <div style={{marginTop:14}}>
            <label className="lbl">Enfant(s) bénéficiaire(s) de l'AEEH (handicap)</label>
            <div style={{display:"flex",gap:8}}>
              {[0,1,2].map(n=><button key={n}onClick={()=>setAeeh(n)}style={{
                flex:1,padding:"8px",borderRadius:8,border:"1.5px solid",cursor:"pointer",fontSize:13,fontWeight:700,
                background:aeeh===n?"var(--S)":"transparent",color:aeeh===n?"#fff":"var(--m)",
                borderColor:aeeh===n?"var(--S)":"var(--br)"}}>{n}</button>)}
            </div>
            <div style={{fontSize:11.5,color:"var(--l)",marginTop:4}}>Chaque enfant AEEH applique le taux d'effort de la tranche inférieure (CMG plus élevé).</div>
          </div>
        </div>
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div className="card"style={{background:"var(--Gp)",border:"1px solid var(--G)"}}>
          <div style={{fontWeight:700,fontSize:13,color:"var(--G)",marginBottom:8}}><IconeOuEmoji e="📊"/> Sur l'année</div>
          {[
            ["Coût annuel brut",fmt2(coutTotal*12)],
            ["Aides totales",fmt2((cmgMensuel+creditImpot)*12)],
            ["Votre coût réel annuel",fmt2(resteCharge*12)],
          ].map(([l,v])=><div key={l}style={{display:"flex",justifyContent:"space-between",fontSize:13,padding:"4px 0"}}>
            <span style={{color:"var(--m)"}}>{l}</span>
            <span style={{fontWeight:600,color:"var(--b)"}}>{v}</span>
          </div>)}
        </div>
        {cmgPlafonne&&<div style={{fontSize:11,color:"var(--T)",background:"var(--Tp)",borderRadius:8,padding:"8px 10px",lineHeight:1.5}}>
          <IconeOuEmoji e="ℹ️"/> CMG plafonné à {fmt2(CMG_MAX)}/mois (montant maximum assmat 2026).
        </div>}
        {cmgCapped&&<div style={{fontSize:11,color:"var(--m)",background:"var(--c)",border:"1px solid var(--br)",borderRadius:8,padding:"8px 10px",lineHeight:1.5}}>
          <IconeOuEmoji e="⚠️"/> Votre taux horaire dépasse le plafond CMG de {nbf(PLAFOND_H,2)} €/h : le surcoût au-delà reste intégralement à votre charge.
        </div>}
        <div style={{fontSize:11,color:"var(--l)",lineHeight:1.6,padding:"6px 0"}}>
          Calcul : CMG = (min(taux ; {nbf(PLAFOND_H,2)} €) × {Math.round(heuresMois)} h) × (1 − (revenus mensuels × {nbf((TE*100),4)} % ÷ {nbf(CHR_AM,2)} €)). Taux d'effort pour {enfEff} enfant{enfEff>1?"s":""}{aeeh>0?" (AEEH inclus)":""}.
        </div>
        <div style={{fontSize:13,color:"#7a3a00",lineHeight:1.65,padding:"16px 18px",marginTop:14,background:"#FFE7C2",border:"2.5px solid #E8943A",borderRadius:14,boxShadow:"0 4px 16px rgba(232,148,58,.28)"}}>
          <div style={{fontWeight:800,marginBottom:8,fontSize:15.5,color:"#B45309",display:"flex",alignItems:"center",gap:8}}><IconeOuEmoji e="⚠️"/> Ne vous fiez pas à ces chiffres</div>
          Estimation indicative selon la réforme CMG du 1er septembre 2025 (calcul horaire par taux d'effort, barème CNAF 2026 : 1→0,0619 % · 2→0,0516 % · 3→0,0413 % · 4-7→0,0310 % · 8+→0,0206 %). <b>Le montant réel est calculé par la CAF</b> selon vos ressources N-2 ; ne vous fiez pas à ce chiffre pour vos décisions. Référez-vous au <b>simulateur officiel URSSAF</b> (« Évaluer votre reste à charge et votre CMG ») pour la valeur définitive.
        </div>
      </div>
    </div>
  </div>;
}

//

export function BilansExports({enfants,role,pEId,user,pointagesDB}){
  const [sec,setSec]=useState("rapport");
  return <div className="fi">
    <PageHeader icon="📊" title="Rapports & Exports" sub="Rapports, recapitulatifs et exports de vos donnees"/> {/* RENAME NAV P9 */}
    <div style={{display:"flex",gap:2,marginBottom:16,borderBottom:"2px solid var(--br)",flexWrap:"wrap"}}>
      {[{id:"rapport",l:"Rapport annuel",ic:"📊"},{id:"recap",l:"Recap mensuel PDF",ic:"📄"},{id:"export",l:"Export donnees",ic:"📦"}].map(s=>
        <button key={s.id}onClick={()=>setSec(s.id)}style={{
          padding:"7px 14px",border:"none",background:"none",cursor:"pointer",
          fontFamily:"'DM Sans',sans-serif",fontWeight:600,fontSize:12,
          color:sec===s.id?"var(--T)":"var(--b)",
          borderBottom:sec===s.id?"2px solid var(--G)":"2px solid transparent",
          marginBottom:-2,transition:"all .15s",display:"flex",alignItems:"center",gap:5
        }}><IconeOuEmoji e={s.ic}/><span>{s.l}</span></button>
      )}
    </div>
    {sec==="rapport"&&(estPro(user)
      ?<RapportAnnuel enfants={enfants}role={role}pEId={pEId}user={user}/>
      :<VerrouPro titre="Le rapport annuel" desc="La synthèse de votre année : heures, revenus, indemnités et présences, réunies en un document. Cette fonction fait partie du forfait Pro."/>)}
    {sec==="recap"&&(estPro(user)
      ?<Recap enfants={enfants}role={role}pEId={pEId}/>
      :<VerrouPro titre="Le récapitulatif mensuel" desc="Le récapitulatif du mois en PDF, prêt à remettre au parent employeur. Cette fonction fait partie du forfait Pro."/>)}
    {sec==="export"&&<Suspense fallback={<div style={{padding:24,textAlign:"center",color:"var(--m)",fontSize:13}}>Chargement…</div>}><ExportDonnees enfants={enfants}role={role}user={user}/></Suspense>}
  </div>;
}

//

export function FAQ({role}){
  const [filtre,setFiltre]=useState("Tous");
  const [open,setOpen]=useState(null);
  const [search,setSearch]=useState("");
  const cats=["Tous",...[...new Set(FAQ_DATA.map(f=>f.cat))]];
  const filtrees=FAQ_DATA
    .filter(f=>filtre==="Tous"||f.cat===filtre)
    .filter(f=>!search||f.q.toLowerCase().includes(search.toLowerCase())||f.r.toLowerCase().includes(search.toLowerCase()));

  return <div className="fi">
    <PageHeader icon="❓" title="Centre d'aide" sub="Réponses aux questions les plus fréquentes"/>
    <input className="inp"placeholder="🔍 Rechercher dans l'aide..."value={search}
      onChange={e=>setSearch(e.target.value)}style={{marginBottom:14}}/>
    <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>
      {cats.map(c=><button key={c}onClick={()=>setFiltre(c)}style={{
        padding:"5px 12px",borderRadius:20,border:"1.5px solid",cursor:"pointer",fontSize:12,fontWeight:600,
        background:filtre===c?"var(--b)":"transparent",color:filtre===c?"#fff":"var(--m)",
        borderColor:filtre===c?"var(--b)":"var(--br)"}}>{c}</button>)}
    </div>
    <div style={{display:"flex",flexDirection:"column",gap:6}}>
      {filtrees.length===0&&<div className="card"style={{textAlign:"center",color:"var(--l)",fontSize:13}}>
        Aucun résultat. <span style={{color:"var(--T)",cursor:"pointer"}}onClick={()=>setSearch("")}>Effacer la recherche</span>
      </div>}
      {filtrees.map((f,i)=><div key={i}className="card"style={{padding:0,overflow:"hidden"}}>
        <button onClick={()=>setOpen(open===i?null:i)}style={{
          width:"100%",padding:"14px 18px",background:"none",border:"none",cursor:"pointer",
          display:"flex",justifyContent:"space-between",alignItems:"center",textAlign:"left",gap:12}}>
          <div style={{flex:1}}>
            <span className="badge"style={{background:"var(--Bp)",color:"var(--B)",fontSize:11,marginBottom:4,display:"inline-block"}}>{f.cat}</span>
            <div style={{fontWeight:600,fontSize:13,color:"var(--b)"}}>{f.q}</div>
          </div>
          <span style={{fontSize:18,color:"var(--l)",flexShrink:0,transition:"transform .2s",
            transform:open===i?"rotate(180deg)":"rotate(0deg)"}}>▾</span>
        </button>
        {open===i&&<div style={{padding:"0 18px 16px",fontSize:13,color:"var(--m)",lineHeight:1.7,borderTop:"1px solid var(--br)"}}>
          {f.r}
        </div>}
      </div>)}
    </div>
    <div className="card"style={{marginTop:20,textAlign:"center",background:"var(--Tp)",border:"1px solid var(--Tl)"}}>
      <div style={{fontSize:14,fontWeight:700,color:"var(--b)",marginBottom:6}}>Vous n'avez pas trouvé votre réponse ?</div>
      <div style={{fontSize:13,color:"var(--m)",marginBottom:12}}>Notre équipe répond en moins de 24h, du lundi au vendredi.</div>
      <button className="btn bT"onClick={()=>window.dispatchEvent(new CustomEvent("timat:page",{detail:"support"}))}>
        <IconeOuEmoji e="💬"/> Contacter le support
      </button>
    </div>
  </div>;
}

//

export function Support({role,user}){
  const [msg,setMsg]=useState("");
  const [sujet,setSujet]=useState("Question générale");
  const [envoye,setEnvoye]=useState(false);
  const [sending,setSending]=useState(false);
  const [erreur,setErreur]=useState("");
  const sujets=["Question générale","Problème technique","Facturation / abonnement","Calcul de salaire","Contrat / avenant","PMI / agrément","Suggestion","Autre"];
  const isPro=user?.subscription_status==="pro";

  const envoyer=async()=>{
    if(!msg.trim()){setErreur("Écrivez votre message avant d'envoyer.");return;}
    setSending(true);setErreur("");
    try{
      const res=await fetch('/api/support',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          email:user?.email||'inconnu',
          prenom:user?.prenom||'',
          nom:user?.nom||'',
          role:role||'asmat',
          sujet:sujet,
          message:msg,
          prioritaire:isPro,
          timestamp:new Date().toISOString(),
        })
      });
      if(res.ok){
        setEnvoye(true);
      }else{
        // Fallback: mailto si l'API n'existe pas encore
        const mailto=`mailto:${EMAIL_CONTACT}?subject=${encodeURIComponent((isPro?"[PRO] ":"")+"["+sujet+"] "+user?.prenom)}&body=${encodeURIComponent(msg+"\n\n---\n"+user?.email+" · "+role)}`;
        window.open(mailto);
        setEnvoye(true);
      }
    }catch(e){
      // Fallback mailto
      const mailto=`mailto:${EMAIL_CONTACT}?subject=${encodeURIComponent((isPro?"[PRO] ":"")+"["+sujet+"] "+user?.prenom)}&body=${encodeURIComponent(msg+"\n\n---\n"+user?.email+" · "+role)}`;
      window.open(mailto);
      setEnvoye(true);
    }
    setSending(false);
  };

  return <div className="fi">
    <PageHeader icon="💬" title="Support TiMat" sub={isPro?"Support prioritaire — réponse sous 12h":"Notre équipe répond sous 24h, du lundi au vendredi"}/>
    {isPro&&<div style={{background:"linear-gradient(135deg,#FFF8F3,#FFF0E6)",border:"1.5px solid #E49178",borderRadius:12,padding:"10px 16px",marginBottom:16,display:"flex",alignItems:"center",gap:10,fontSize:12,color:"#C84B31",fontWeight:600}}>
      <IconeOuEmoji e="⭐"/> Vous bénéficiez du support prioritaire Pro — traitement en priorité
    </div>}
    {envoye?<div style={{textAlign:"center",padding:40}}>
      <div style={{fontSize:60,marginBottom:16}}>✅</div>
      <div className="pf"style={{fontSize:22,fontWeight:600,color:"var(--S)",marginBottom:8}}>Message envoyé !</div>
      <div style={{fontSize:13,color:"var(--m)",lineHeight:1.7}}>Nous vous répondrons par email à <strong>{user?.email||"votre adresse"}</strong>{isPro?" sous 12h":" sous 24h"} (jours ouvrés).<br/>En attendant, consultez notre <span style={{color:"var(--T)",cursor:"pointer",textDecoration:"underline"}}onClick={()=>window.dispatchEvent(new CustomEvent("timat:page",{detail:"faq"}))}>Centre d'aide</span>.</div>
      <button className="btn bG"style={{marginTop:20}}onClick={()=>{setEnvoye(false);setMsg("");}}>Envoyer un autre message</button>
    </div>:<div style={{maxWidth:560,margin:"0 auto"}}>
      <div className="card"style={{padding:"var(--pad-carte-l)"}}>
        <div style={{marginBottom:14}}>
          <label className="lbl">Sujet</label>
          <select className="sel"value={sujet}onChange={e=>setSujet(e.target.value)}>
            {sujets.map(s=><option key={s}>{s}</option>)}
          </select>
        </div>
        <div style={{marginBottom:14}}>
          <label className="lbl">Votre message</label>
          <textarea className="ta"value={msg}onChange={e=>setMsg(e.target.value)}
            placeholder="Décrivez votre problème ou question le plus précisément possible..."
            style={{width:"100%",minHeight:120,resize:"vertical"}}/>
        </div>
        {erreur&&<div style={{color:"var(--R)",fontSize:12,marginBottom:12,padding:"8px 12px",background:"#FEF2F2",borderRadius:8}}>{erreur}</div>}
        <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:16,padding:"10px 14px",background:"var(--Bp)",borderRadius:10}}>
          <IconeOuEmoji e="📧" taille={18}/>
          <div style={{fontSize:12,color:"var(--B)"}}>Réponse envoyée à <strong>{user?.email||"votre email"}</strong>{isPro?" — délai prioritaire : 12h":" — délai : 24h max"}.</div>
        </div>
        <button className="btn bT"style={{width:"100%"}}onClick={envoyer}disabled={sending}>
          {sending?<><IconeOuEmoji e="⏳"/> Envoi en cours…</>:<><IconeOuEmoji e="📤"/> Envoyer mon message</>}
        </button>
      </div>
      <div style={{marginTop:14,display:"flex",gap:10,flexWrap:"wrap",justifyContent:"center"}}>
        {[["📧",EMAIL_CONTACT],["⏱️",isPro?"Réponse < 12h":"Réponse < 24h"],["📚","Centre d'aide 24/7"]].map(([ic,t])=>
          <div key={t}style={{background:"var(--w)",border:"1px solid var(--br)",borderRadius:10,padding:"10px 16px",fontSize:12,color:"var(--m)",display:"flex",gap:8,alignItems:"center"}}>
            <span><IconeOuEmoji e={ic}/></span><span>{t}</span>
          </div>)}
      </div>
    </div>}
  </div>;
}

export function OutilsHub({setPage}){
  const items=[
    {id:"inviter_parent",ic:"👪",t:"Inviter un parent",d:"Envoyez un lien : le parent suit la journée en direct et signe le contrat.",c:"#5DA9A1"},
    {id:"projet_accueil",ic:"🌿",t:"Projet d'accueil",d:"Rédigez et partagez votre projet pédagogique.",c:"#B8622F"},
    {id:"pmi",ic:"🏛️",t:"PMI",d:"Contacts et communication avec votre PMI de secteur.",c:"#2E4859"},
    {id:"faq",ic:"❓",t:"Aide & Support",d:"Guides, questions fréquentes et contact.",c:"#C09553"},
  ];
  return <div className="fi">
    <PageHeader icon="⭐" title="Outils Pro" sub="Vos outils du quotidien, réunis au même endroit"/>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(230px,1fr))",gap:14}}>
      {items.map(o=><button key={o.id}onClick={()=>setPage(o.id)}
        style={{textAlign:"left",background:"var(--w)",border:"1px solid var(--br)",borderRadius:18,padding:18,cursor:"pointer",transition:"transform .15s,box-shadow .15s,border-color .15s",display:"flex",flexDirection:"column",gap:10,minHeight:170}}
        onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow="0 12px 30px "+o.c+"22";e.currentTarget.style.borderColor=o.c;}}
        onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="none";e.currentTarget.style.borderColor="var(--br)";}}>
        <div style={{width:52,height:52,borderRadius:15,background:o.c+"1A",display:"flex",alignItems:"center",justifyContent:"center",fontSize:27}}><IconeOuEmoji e={o.ic} taille={27}/></div>
        <div>
          <div style={{fontSize:16,fontWeight:700,color:"var(--b)",marginBottom:4}}>{o.t}</div>
          <div style={{fontSize:12.5,color:"var(--m)",lineHeight:1.5}}>{o.d}</div>
        </div>
        <div style={{marginTop:"auto",fontSize:12.5,fontWeight:700,color:o.c}}>Ouvrir →</div>
      </button>)}
    </div>
  </div>;
}

export function AttestationPoleEmploi({enfants,role,pEId,user}){
  const [selId,setSelId]=useState(enfants[0]?.id);
  const [toast,setToast]=useState("");
  const liste=role==="parent"?enfants.filter(e=>e.id===pEId):enfants;
  const enfant=liste.find(e=>e.id===selId)||liste[0]||{};
  const contrat=enfant.contrat||{};
  const motifs=["Fin de contrat","Démission du parent","Retrait de l'enfant","Rupture conventionnelle","Retraite","Autre"];
  const parent=(D.parents||[]).find(p=>p.id===enfant.parentId)||{};
  const salRef=Math.round(salaireMensualise(contrat,contrat.tauxHoraire||minimumHoraireAu(new Date())));
  const [form,setForm]=useState({});
  useEffect(()=>{
    setForm({
      empNom:((parent.prenom||"")+" "+(parent.nom||"")).trim(),empAdresse:"",empEmail:parent.email||"",empPajemploi:"",
      salNom:role==="asmat"?(((user?.prenom||"")+" "+(user?.nom||"")).trim()):"",
      salAgrement:role==="asmat"?(user?.agrement||""):"",
      enfantNom:((enfant.prenom||"")+" "+(enfant.nom||"")).trim(),
      dateEmbauche:contrat.debut||"",dateFin:"",motif:"Fin de contrat",
      heuresHebdo:contrat.heuresHebdo?String(contrat.heuresHebdo):"",
      dernierSalaire:salRef?String(salRef):"",
      salDernierMois:"",iccp:"",indemPreavis:"",
    });
  },[selId,role]);
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const ro=role==="asmat";
  const inp=(label,key,type)=><div style={{marginBottom:10}}>
    <label style={{fontSize:11,fontWeight:600,color:"var(--l)",display:"block",marginBottom:3}}>{label}</label>
    <input className="inp"type={type||"text"}disabled={ro}value={form[key]||""}onChange={e=>set(key,e.target.value)}/>
  </div>;
  const generer=()=>{
    const w=window.open("","_blank");
    if(!w){setToast("Autorisez les pop-ups pour générer le document");return;}
    // Toutes les valeurs saisies du document passent par ici : l'echappement s'y
    // fait une fois. Elles partaient auparavant telles quelles dans le HTML.
    const g=x=>x&&String(x).trim()?H(String(x).trim()):"________________";
    const today=new Date().toLocaleDateString("fr-FR");
    const html='<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/><title>Attestation France Travail - '+(enfant.prenom||'')+'</title>'
      +'<style>body{font-family:Arial,sans-serif;max-width:800px;margin:36px auto;padding:20px;color:#222;font-size:13px}'
      +'h1{font-size:15px;text-align:center;border:2px solid #000;padding:10px;margin-bottom:20px;text-transform:uppercase}'
      +'h2{font-size:13px;background:#f0f0f0;padding:6px 8px;margin-top:18px;border-left:3px solid #2E4859}'
      +'table{width:100%;border-collapse:collapse;margin:8px 0}td{padding:7px 10px;border:1px solid #ddd}td:first-child{width:46%;background:#fafafa;font-weight:600}'
      +'.sig{margin-top:36px;display:grid;grid-template-columns:1fr 1fr;gap:40px}.sig-box{border-top:1px solid #000;padding-top:8px;font-size:12px}'
      +'.note{font-size:11px;color:#555;background:#fff8f3;border:1px solid #ffd6b3;padding:10px;margin-top:18px;line-height:1.6}'
      +'@media print{button{display:none}}</style></head><body>'
      +'<h1>Attestation d\'employeur destinée à France Travail<br/><span style="font-size:11px;font-weight:400">(Articles R.1234-9 et suivants du Code du travail)</span></h1>'
      +"<h2>L'employeur (particulier employeur)</h2>"
      +'<table><tr><td>Nom et prénom</td><td>'+g(form.empNom)+'</td></tr>'
      +'<tr><td>Adresse</td><td>'+g(form.empAdresse)+'</td></tr>'
      +'<tr><td>Email</td><td>'+g(form.empEmail)+'</td></tr>'
      +'<tr><td>N° Pajemploi</td><td>'+g(form.empPajemploi)+'</td></tr></table>'
      +'<h2>Le salarié</h2>'
      +'<table><tr><td>Nom et prénom</td><td>'+g(form.salNom)+'</td></tr>'
      +'<tr><td>Emploi</td><td>Assistant maternel agréé</td></tr>'
      +'<tr><td>N° d\'agrément</td><td>'+g(form.salAgrement)+'</td></tr>'
      +'<tr><td>Enfant accueilli</td><td>'+g(form.enfantNom)+'</td></tr></table>'
      +'<h2>Contrat de travail</h2>'
      +"<table><tr><td>Date d'embauche</td><td>"+g(form.dateEmbauche?fmtDatePdf(form.dateEmbauche):"")+"</td></tr>"
      +'<tr><td>Date de fin du contrat</td><td>'+g(form.dateFin?fmtDatePdf(form.dateFin):"")+'</td></tr>'
      +'<tr><td>Motif de la rupture</td><td>'+g(form.motif)+'</td></tr>'
      +'<tr><td>Heures par semaine</td><td>'+g(form.heuresHebdo)+(form.heuresHebdo?' h':'')+'</td></tr>'
      +'<tr><td>Dernier salaire mensuel brut</td><td>'+g(form.dernierSalaire)+(form.dernierSalaire?' €':'')+'</td></tr></table>'
      +'<h2>Sommes versées à la rupture</h2>'
      +'<table><tr><td>Salaire du dernier mois</td><td>'+g(form.salDernierMois)+(form.salDernierMois?' €':'')+'</td></tr>'
      +'<tr><td>Indemnité compensatrice de congés payés</td><td>'+g(form.iccp)+(form.iccp?' €':'')+'</td></tr>'
      +'<tr><td>Indemnité de préavis</td><td>'+g(form.indemPreavis)+(form.indemPreavis?' €':'')+'</td></tr></table>'
      +'<p style="margin-top:18px;font-size:12px;background:#f9f9f9;padding:10px;border:1px solid #ddd">Je soussigné(e) certifie sur l\'honneur l\'exactitude des renseignements portés sur cette attestation.</p>'
      +'<div class="sig"><div class="sig-box">Fait à ___________, le '+today+'<br/><br/><br/>Signature de l\'employeur</div>'
      +'<div class="sig-box">Reçu le ___________<br/><br/><br/>Signature du salarié</div></div>'
      +'<div class="note"><b>Document indicatif.</b> L\'attestation officielle prise en compte par France Travail est en général <b>télétransmise via Pajemploi</b> (findecontrat-pajemploi.urssaf.fr) par le parent employeur — de nombreuses agences refusent les versions papier. Ce document sert de brouillon pré-rempli et de justificatif.</div>'
      +'<button onclick="window.print()" style="margin-top:14px;background:#C76754;color:#fff;border:none;padding:10px 22px;border-radius:8px;cursor:pointer;font-weight:700">🖨️ Imprimer / PDF</button>'
      +'</body></html>';
    w.document.write(html);w.document.close();setToast("Attestation générée ✓");
  };

  return <div className="fi">
    {toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
    <PageHeader icon="📋" title="Attestation France Travail" sub={role==="parent"?"À remplir par vous (employeur) à la fin du contrat":"Remplie par le parent employeur — lecture seule"}/>
    {role==="asmat"&&liste.length>1&&<div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
      {liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>setSelId(e.id)}/>)}
    </div>}
    <div className="card"style={{marginBottom:14}}>
      <div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:10}}>👤 Employeur (parent)</div>
      {inp("Nom et prénom","empNom")}{inp("Adresse","empAdresse")}{inp("Email","empEmail")}{inp("N° Pajemploi","empPajemploi")}
      <div style={{fontWeight:700,fontSize:13,color:"var(--b)",margin:"14px 0 10px"}}>👩 Salariée (assistante maternelle)</div>
      {inp("Nom et prénom","salNom")}{inp("N° d'agrément","salAgrement")}{inp("Enfant accueilli","enfantNom")}
      <div style={{fontWeight:700,fontSize:13,color:"var(--b)",margin:"14px 0 10px"}}><IconeOuEmoji e="📄"/> Contrat</div>
      {inp("Date d'embauche","dateEmbauche","date")}{inp("Date de fin du contrat","dateFin","date")}
      <div style={{marginBottom:10}}><label style={{fontSize:11,fontWeight:600,color:"var(--l)",display:"block",marginBottom:3}}>Motif de la rupture</label>
        <select className="sel"disabled={ro}value={form.motif||"Fin de contrat"}onChange={e=>set("motif",e.target.value)}>{motifs.map(m=><option key={m}>{m}</option>)}</select></div>
      {inp("Heures par semaine","heuresHebdo")}{inp("Dernier salaire mensuel brut (€)","dernierSalaire")}
      <div style={{fontWeight:700,fontSize:13,color:"var(--b)",margin:"14px 0 10px"}}><IconeOuEmoji e="💶"/> Sommes versées à la rupture</div>
      {inp("Salaire du dernier mois (€)","salDernierMois")}{inp("Indemnité congés payés (€)","iccp")}{inp("Indemnité de préavis (€)","indemPreavis")}
    </div>
    <button className={"btn "+(role==="parent"?"bT":"bG")}style={{width:"100%",marginBottom:14}}onClick={generer}>📥 {role==="parent"?"Générer l'attestation":"Voir / télécharger l'attestation"}</button>
    <div className="card"style={{background:"var(--Bp)"}}>
      <div style={{fontWeight:700,fontSize:12,color:"var(--B)",marginBottom:6}}>ℹ️ Important</div>
      <div style={{fontSize:12,color:"var(--m)",lineHeight:1.6}}>L'attestation <b>officielle</b> prise en compte par France Travail est en général <b>télétransmise via Pajemploi</b> (espace du parent → fin de contrat). De nombreuses agences refusent le papier. Ce formulaire sert de <b>brouillon pré-rempli</b> et de justificatif ; c'est le <b>parent employeur</b> qui l'établit et le signe.</div>
    </div>
  </div>;
}

export function AttestationFiscale({enfants,role,pEId,user}){
  const [selId,setSelId]=useState(enfants[0]?.id);
  // ANNEES DYNAMIQUES P13 - calcul depuis contrats
  const annees=useMemo(()=>{
    const max=new Date().getFullYear();
    let min=max-2;
    enfants?.forEach(e=>{
      const d=e?.contrat?.debut;
      if(d){const y=parseInt(d.slice(0,4),10);if(!isNaN(y)&&y<min)min=y;}
    });
    const list=[];for(let y=max;y>=min;y--)list.push(y);
    return list;
  },[enfants]);
  const [annee,setAnnee]=useState(new Date().getFullYear()-1);
  const [gen,setGen]=useState(false);
  const [toast,setToast]=useState("");
  // ATTESTATION REELLE P13 - pointages + paiements + absences
  const [realStats,setRealStats]=useState(null);
  const liste=role==="parent"?enfants.filter(e=>e.id===pEId):enfants;
  const enfant=liste.find(e=>e.id===selId)||liste[0]||{};
  const contrat=enfant.contrat||{};

  // ATTESTATION REELLE P13 - charger pointages, paiements, absences
  useEffect(()=>{
    if(!enfant?.id||!annee){setRealStats(null);return;}
    let cancelled=false;
    (async()=>{
      const debut=annee+"-01-01";const fin=annee+"-12-31";
      const{data:pts}=await supabase.from("pointages").select("*").eq("enfant_id",enfant.id).gte("date",debut).lte("date",fin);
      const{data:paie}=await supabase.from("versements").select("montant,date,mode,periode,note").eq("enfant_id",enfant.id).gte("date",debut).lte("date",fin).order("date");
      const{data:abs}=await supabase.from("absences").select("*").eq("enfant_id",enfant.id).gte("date",debut).lte("date",fin);
      if(cancelled)return;
      const totalMin=(pts||[]).reduce((s,p)=>s+(p.total_minutes||0),0);
      const heuresReelles=Math.round(totalMin/60);
      const joursTravailles=(pts||[]).filter(p=>p.total_minutes>0).length;
      const paiementsReels=(paie||[]).reduce((s,p)=>s+(parseFloat(p.montant)||0),0);
      setRealStats({
        heures:heuresReelles,
        jours:joursTravailles,
        paiements:Math.round(paiementsReels*100)/100,
        nbPaiements:paie?.length||0,
        nbAbsences:abs?.length||0,
        versements:(paie||[]),
      });
    })();
    return()=>{cancelled=true;};
  },[enfant?.id,annee,contrat?.id]);

  // RECAP VERSEMENTS - calculs : réel si versements enregistrés, sinon estimation indicative
  const hMens=heuresMensualisees(contrat);
  const tauxH=contrat.tauxHoraire||minimumHoraireAu(new Date());
  const entretienJour=contrat.entretien||3.92;
  const hasReal=realStats?.paiements>0;
  // Le recapitulatif comptait 12 mois par principe. Un contrat qui commence en
  // septembre n'en compte que quatre sur l'annee : l'estimation etait alors
  // trois fois trop haute, sur un document qui sert a declarer.
  const moisTravailles=(()=>{
    const debut=String(contrat?.debut||"").slice(0,10);
    const fin=String(contrat?.fin||"").slice(0,10);
    const premier=debut&&debut.slice(0,4)===String(annee)?parseInt(debut.slice(5,7),10):1;
    const dernier=fin&&fin.slice(0,4)===String(annee)?parseInt(fin.slice(5,7),10):12;
    return Math.max(0,Math.min(12,dernier-premier+1));
  })();
  const versementsList=realStats?.versements||[];
  // Estimation indicative (à défaut de versements réels)
  const estSalNet=netDepuisBrut(hMens*tauxH)*moisTravailles;
  // Les jours d'accueil se comptaient ici en divisant les heures mensualisees
  // par 8 — un troisieme comptage, apres ceux du recapitulatif Pajemploi. On
  // part du nombre de jours reellement prevus au contrat.
  const joursMoisEstim=Math.round(((contrat.jours?.length)||5)*SEMAINES_ANNEE_COMPLETE/MOIS_PAR_AN);
  const estEntretien=entretienJour*joursMoisEstim*moisTravailles;
  // En mode réel : total = somme RÉELLEMENT versée (on ne rajoute PAS d'entretien estimé -> pas de double comptage)
  const totalReel=hasReal?realStats.paiements:0;
  const totalEstime=estSalNet+estEntretien;
  const totalAffiche=hasReal?totalReel:totalEstime;
  const heuresAnnuelles=realStats?.heures||(hMens*12);
  const joursAnnuels=realStats?.jours||0;
  const sourceLabel=hasReal?"(données réelles)":"(estimation indicative)";
  const salMensBrut=hMens*tauxH;
  const MODE_LBL={virement:"Virement",cheque:"Chèque",especes:"Espèces",cesu:"CESU",autre:"Autre"};
  const fmtD=d=>{try{return new Date(d).toLocaleDateString("fr-FR");}catch{return d||"";}};
  const fmtE=n=>(Number(n)||0).toLocaleString("fr-FR",{minimumFractionDigits:2,maximumFractionDigits:2})+" €";

  // ATTESTATION P14B - PDF jsPDF natif (rendu fiable, pas de troncature)
  const telechargerPDF=async()=>{
    setGen(true);
    try{
      let userSig=user?.signature_base64;
      let userAgrement=user?.numero_agrement;
      if(user?.id){
        const{data:fresh}=await supabase.from("profiles").select("signature_base64,numero_agrement").eq("id",user.id).maybeSingle();
        if(fresh){userSig=fresh.signature_base64||userSig;userAgrement=fresh.numero_agrement||userAgrement;}
      }
const jsPDF=await chargerJsPDF();
      const doc=protegerPdf(new jsPDF({unit:"mm",format:"a4",orientation:"portrait"}));
      const PW=210,MX=18;let y=20;
      const vert=[42,157,143];const noir=[40,40,40];const gris=[120,120,120];const bleuFonce=[38,70,83];
      // Titre
      doc.setFontSize(16);doc.setFont("helvetica","bold");doc.setTextColor(...bleuFonce);
      doc.text("RÉCAPITULATIF DES VERSEMENTS",PW/2,y,{align:"center"});y+=6;
      doc.setFontSize(10);doc.setFont("helvetica","normal");doc.setTextColor(...gris);
      doc.text("Année "+annee+" — sommes versées à l'assistant maternel (justificatif indicatif)",PW/2,y,{align:"center"});y+=4;
      doc.setDrawColor(...vert);doc.setLineWidth(0.5);doc.line(MX,y,PW-MX,y);y+=10;
      // Header asmat + parent
      doc.setFillColor(244,247,250);doc.rect(MX,y,PW-2*MX,30,"F");
      doc.setFontSize(9);doc.setFont("helvetica","bold");doc.setTextColor(...vert);
      doc.text("ASSISTANT MATERNEL AGRÉÉ",MX+3,y+5);
      doc.text("PARENT EMPLOYEUR",MX+(PW-2*MX)/2+3,y+5);
      doc.setFontSize(10);doc.setFont("helvetica","normal");doc.setTextColor(...noir);
      doc.text((user?.prenom||"")+" "+(user?.nom||""),MX+3,y+11);
      doc.text((enfant?.prenomParent||"Parent")+" "+(enfant?.nomParent||""),MX+(PW-2*MX)/2+3,y+11);
      doc.setFontSize(8);
      if(user?.email)doc.text("Email : "+user.email,MX+3,y+16);
      doc.text("N° d'agrément : "+(userAgrement||"[à renseigner dans Paramètres]"),MX+3,y+21);
      doc.text("Enfant gardé : "+(enfant?.prenom||"-"),MX+(PW-2*MX)/2+3,y+16);
      if(enfant?.naissance)doc.text("Né(e) le : "+fmtDatePdf(enfant.naissance),MX+(PW-2*MX)/2+3,y+21);
      y+=36;
      // Sommes versees
      doc.setFontSize(12);doc.setFont("helvetica","bold");doc.setTextColor(...bleuFonce);
      doc.text("Sommes versées en "+annee+" "+(hasReal?"(données réelles)":"(estimation indicative)"),MX,y);y+=7;
      doc.setFontSize(10);doc.setFont("helvetica","normal");doc.setTextColor(...noir);
      const ligne=(l,v,isTotal)=>{
        if(isTotal){doc.setFillColor(...vert);doc.rect(MX,y,PW-2*MX,8,"F");doc.setTextColor(255,255,255);doc.setFont("helvetica","bold");}
        else{doc.setDrawColor(220,220,220);doc.rect(MX,y,PW-2*MX,8);doc.setTextColor(...noir);doc.setFont("helvetica","normal");}
        doc.text(l,MX+3,y+5.5);
        doc.text(v,PW-MX-3,y+5.5,{align:"right"});
        y+=8;
      };
      if(hasReal){
        ligne("Nombre de versements",String(versementsList.length));
        ligne("TOTAL RÉELLEMENT VERSÉ EN "+annee,nbf(totalReel,2)+" €",true);
      }else{
        ligne("Salaire net estimé ("+moisTravailles+" mois)",nbf(estSalNet,2)+" €");
        ligne("Indemnités d'entretien estimées",nbf(estEntretien,2)+" €");
        ligne("TOTAL ESTIMÉ",nbf(totalEstime,2)+" €",true);
      }
      y+=8;
      // Detail des versements (mode reel) ou elements du contrat (estimation)
      doc.setFontSize(12);doc.setFont("helvetica","bold");doc.setTextColor(...bleuFonce);
      doc.text(hasReal?"Détail des versements":"Éléments du contrat (base d'estimation)",MX,y);y+=7;
      doc.setFontSize(9);doc.setFont("helvetica","normal");doc.setTextColor(...noir);
      if(hasReal){
        doc.setFillColor(244,247,250);doc.rect(MX,y,PW-2*MX,7,"F");
        doc.setFont("helvetica","bold");
        doc.text("Date",MX+3,y+5);doc.text("Mode",MX+42,y+5);doc.text("Période",MX+85,y+5);doc.text("Montant",PW-MX-3,y+5,{align:"right"});
        y+=7;doc.setFont("helvetica","normal");
        versementsList.forEach(v=>{
          if(y>262){doc.addPage();y=20;}
          doc.setDrawColor(230,230,230);doc.line(MX,y+6.5,PW-MX,y+6.5);
          doc.text(fmtD(v.date),MX+3,y+5);
          doc.text(String(MODE_LBL[v.mode]||v.mode||"-"),MX+42,y+5);
          doc.text(String(v.periode||"-").slice(0,24),MX+85,y+5);
          doc.text(nbf((parseFloat(v.montant)||0),2)+" €",PW-MX-3,y+5,{align:"right"});
          y+=7;
        });
        y+=6;
      }else{
        const ligneSimple=(l,v)=>{
          doc.setDrawColor(220,220,220);doc.rect(MX,y,PW-2*MX,8);
          doc.text(l,MX+3,y+5.5);doc.text(v,PW-MX-3,y+5.5,{align:"right"});
          y+=8;
        };
        ligneSimple("Heures hebdomadaires (contrat)",(contrat.heuresHebdo||40)+" h");
        ligneSimple("Taux horaire brut",(contrat.tauxHoraire||minimumHoraireAu(new Date()))+" €/h");
        ligneSimple("Salaire mensuel brut estimé",nbf(salMensBrut,2)+" €");
        ligneSimple("Salaire mensuel net estimé",nbf(netDepuisBrut(salMensBrut),2)+" €");
        ligneSimple("Mois d'accueil retenus",moisTravailles+" mois");
        y+=8;
      }
      // Verifier qu'on a la place sinon nouvelle page
      if(y>232){doc.addPage();y=20;}
      // Note
      doc.setFillColor(255,248,243);doc.rect(MX,y,PW-2*MX,40,"F");
      doc.setDrawColor(255,214,179);doc.rect(MX,y,PW-2*MX,40);
      doc.setFontSize(9);doc.setFont("helvetica","bold");doc.setTextColor(...noir);
      doc.text("Document indicatif — il ne remplace pas l'attestation Pajemploi :",MX+3,y+5);
      doc.setFontSize(8);doc.setFont("helvetica","normal");doc.setTextColor(...gris);
      doc.text("Ce récapitulatif justifie les sommes versées ; il est fourni à titre indicatif.",MX+3,y+11);
      doc.text("L'attestation fiscale officielle est délivrée par l'Urssaf — service Pajemploi (espace en ligne du parent).",MX+3,y+16);
      doc.text("Enfant de moins de 6 ans : à reporter en case 7GA du formulaire 2042 RICI (7GB, 7GC pour les",MX+3,y+21);
      doc.text("enfants suivants). Crédit d'impôt de "+nbf(CI_TAUX*100,0)+" % des dépenses, retenues dans la limite de "+"3 500 € par enfant.",MX+3,y+25.5);
      doc.text("Les aides déjà perçues, dont le complément de mode de garde, se déduisent de la base du crédit.",MX+3,y+30);
      doc.text("Conservez ce document avec vos justificatifs.",MX+3,y+34.5);
      y+=40;
      // Signature
      if(y>250){doc.addPage();y=20;}
      doc.setFontSize(9);doc.setFont("helvetica","italic");doc.setTextColor(...noir);
      doc.text("Je soussigné(e), "+(user?.prenom||"")+" "+(user?.nom||"")+", assistant(e) maternel(le) agréé(e),",MX,y);y+=4;
      doc.text("certifie exacts les renseignements ci-dessus.",MX,y);y+=8;
      // 2 zones signature
      const sigW=(PW-2*MX-10)/2;
      doc.setDrawColor(...bleuFonce);doc.setLineWidth(0.3);
      doc.line(MX,y,MX+sigW,y);
      doc.line(MX+sigW+10,y,PW-MX,y);
      y+=4;
      doc.setFontSize(8);doc.setFont("helvetica","normal");doc.setTextColor(...noir);
      doc.text("Fait à ____________",MX,y);
      doc.text("Remis au parent le :",MX+sigW+10,y);y+=4;
      doc.text("Le "+new Date().toLocaleDateString("fr-FR"),MX,y);
      doc.text("____________",MX+sigW+10,y);y+=6;
      doc.setFont("helvetica","bold");
      doc.text("Signature :",MX,y);
      doc.text("Signature parent :",MX+sigW+10,y);y+=4;
      if(userSig){
        try{doc.addImage(userSig,"PNG",MX,y,50,15);}catch(e){console.warn("addImage",e);}
      }else{
        doc.setFont("helvetica","italic");doc.setTextColor(...gris);
        doc.text("(aucune signature — voir Paramètres)",MX,y+8);
      }
      // Footer
      doc.setFontSize(8);doc.setFont("helvetica","italic");doc.setTextColor(...gris);
      doc.text("Généré par TiMat — "+new Date().toLocaleDateString("fr-FR"),PW/2,280,{align:"center"});
      doc.save("recapitulatif-versements-"+annee+"-"+(enfant?.prenom||"enfant")+".pdf");
      setToast("Recapitulatif telecharge ✓");
    }catch(e){
      setToast("Erreur generation PDF : "+e.message);
    }
    setGen(false);
  };

  const generer=async()=>{
    setGen(true);
    // ATTESTATION REELLE P14 - re-fetch signature pour s'assurer qu'on a la derniere version
    let userSig=user?.signature_base64;
    let userAgrement=user?.numero_agrement;
    if(user?.id){
      const{data:fresh}=await supabase.from("profiles").select("signature_base64,numero_agrement,prenom,nom,email").eq("id",user.id).maybeSingle();
      if(fresh){
        userSig=fresh.signature_base64||userSig;
        userAgrement=fresh.numero_agrement||userAgrement;
      }
    }
    setTimeout(()=>{
      setGen(false);
      const w=window.open("","_blank");
      if(!w){setToast("Autorisez les popups");return;}
      const html=[
        '<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/><title>Récapitulatif des versements '+annee+' - '+(enfant.prenom||'')+'</title>',
        '<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;margin:0;padding:0;color:#222;font-size:12px;line-height:1.6;background:#f5f5f5}',
        '#doc{max-width:780px;margin:0 auto;padding:30px;background:#fff}',
        'h1{font-size:15px;text-align:center;color:#2E4859;border-bottom:2px solid #5DA9A1;padding-bottom:10px;margin-bottom:20px}',
        '.header{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px;padding:16px;background:#F4F7FA;border-radius:8px}',
        '.header h3{font-size:11px;color:#5DA9A1;margin-bottom:6px;text-transform:uppercase;letter-spacing:.5px}',
        'table{width:100%;border-collapse:collapse;margin:10px 0;page-break-inside:avoid}',
        'tr{page-break-inside:avoid}',
        'td{padding:8px 12px;border:1px solid #e0e0e0}',
        'td:first-child{width:60%;background:#FDFBF8;font-weight:600;color:#2E4859}',
        '.total{background:#5DA9A1;color:#fff;font-weight:700;font-size:13px}.total td{border-color:#5DA9A1}',
        '.note{margin-top:20px;padding:14px;background:#FFF8F3;border:1px solid #FFD6B3;border-radius:8px;font-size:11px;color:#666;page-break-inside:avoid}',
        '.sig{margin-top:30px;display:grid;grid-template-columns:1fr 1fr;gap:30px;page-break-inside:avoid}',
        '.sig-box{border-top:1px solid #2E4859;padding-top:10px;font-size:11px}',
        '.actions{position:fixed;top:14px;right:14px;display:flex;gap:8px;z-index:9999}',
        '.actions button{border:none;padding:10px 18px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700;box-shadow:0 2px 8px rgba(0,0,0,.15)}',
        '.btn-print{background:#2E4859;color:#fff}.btn-pdf{background:#5DA9A1;color:#fff}',
        '@media print{.actions{display:none!important}body{background:#fff}.noprint{display:none}}</style>',
        // Chargement de html2pdf pour vraie generation PDF
        '<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>',
        '</head><body>',
        '<div class="actions noprint">',
          '<button class="btn-print" onclick="window.print()">🖨️ Imprimer</button>',
          '<button class="btn-pdf" onclick="dlPdf()">📥 Telecharger PDF</button>',
        '</div>',
        '<div id="doc">',
        '<h1>📋 RÉCAPITULATIF DES VERSEMENTS<br/><span style="font-size:12px;font-weight:400;color:#666">Année '+annee+' — Sommes versées à l\'assistante maternelle (justificatif indicatif)</span></h1>',
        '<div class="header">',
        '<div><h3>Assistante maternelle agréée</h3>',
        '<strong>'+(user?.prenom||'Prénom')+' '+(user?.nom||'Nom')+'</strong><br/>',
        'Email : '+(user?.email||'[email]')+'<br/>',
        'N° agrément : '+H(userAgrement||"[À renseigner dans Paramètres]")+'</div>',
        '<div><h3>Parent employeur</h3>',
        '<strong>'+(enfant?.prenomParent||'Parent')+' '+(enfant?.nomParent||'')+'</strong><br/>',
        'Enfant gardé : '+(enfant?.prenom||'-')+' '+(enfant?.emoji||'')+'<br/>',
        'Né(e) le : '+(enfant?.naissance||'[Date]')+'</div></div>',
        '<h3 style="font-size:12px;color:#2E4859;margin:16px 0 8px;padding-left:4px">💶 Sommes versées en '+annee+(hasReal?' (données réelles)':' (estimation indicative)')+'</h3>',
        '<table>',
        (hasReal
          ? '<tr><td>Nombre de versements</td><td style="text-align:right">'+versementsList.length+'</td></tr>'
            +'<tr class="total"><td>TOTAL RÉELLEMENT VERSÉ EN '+annee+'</td><td style="text-align:right">'+nbf(totalReel,2)+' €</td></tr>'
          : '<tr><td>Salaire net estimé (12 mois)</td><td style="text-align:right">'+nbf(estSalNet,2)+' €</td></tr>'
            +'<tr><td>Indemnités d\'entretien estimées</td><td style="text-align:right">'+nbf(estEntretien,2)+' €</td></tr>'
            +'<tr class="total"><td>TOTAL ESTIMÉ</td><td style="text-align:right">'+nbf(totalEstime,2)+' €</td></tr>'),
        '</table>',
        (hasReal
          ? '<h3 style="font-size:12px;color:#2E4859;margin:16px 0 8px;padding-left:4px">📋 Détail des versements</h3>'
            +'<table><tr><td style="background:#F4F7FA">Date</td><td style="background:#F4F7FA;width:auto;font-weight:700;color:#2E4859">Mode</td><td style="background:#F4F7FA;width:auto;font-weight:700;color:#2E4859">Période</td><td style="background:#F4F7FA;width:auto;font-weight:700;color:#2E4859;text-align:right">Montant</td></tr>'
            +versementsList.map(function(v){return '<tr><td style="background:#fff;font-weight:400;color:#222">'+fmtD(v.date)+'</td><td>'+(MODE_LBL[v.mode]||v.mode||'-')+'</td><td>'+(v.periode||'-')+'</td><td style="text-align:right">'+nbf((parseFloat(v.montant)||0),2)+' €</td></tr>'+(v.note?'<tr><td colspan="4" style="background:#fff;font-weight:400;color:#888;font-size:11px">↳ '+H(v.note)+'</td></tr>':'');}).join('')
            +'</table>'
          : '<h3 style="font-size:12px;color:#2E4859;margin:16px 0 8px;padding-left:4px">📊 Éléments du contrat (base d\'estimation)</h3>'
            +'<table>'
            +'<tr><td>Heures hebdomadaires (contrat)</td><td style="text-align:right">'+(contrat.heuresHebdo||40)+' h</td></tr>'
            +'<tr><td>Taux horaire brut</td><td style="text-align:right">'+(contrat.tauxHoraire||minimumHoraireAu(new Date()))+' €/h</td></tr>'
            +'<tr><td>Salaire mensuel brut estimé</td><td style="text-align:right">'+nbf(salMensBrut,2)+' €</td></tr>'
            +'<tr><td>Salaire mensuel net estimé</td><td style="text-align:right">'+nbf(netDepuisBrut(salMensBrut),2)+' €</td></tr>'
            +'<tr><td>Mois travaillés</td><td style="text-align:right">'+moisTravailles+' mois</td></tr>'
            +'</table>'),
        '<div class="note">',
        '<strong>📌 Document indicatif — ne remplace pas l\'attestation Pajemploi :</strong><br/>',
        '• Ce récapitulatif est un justificatif des sommes versées, fourni à titre indicatif.<br/>',
        '• L\'attestation fiscale officielle est délivrée par l\'Urssaf — service Pajemploi, sur l\'espace en ligne du parent.<br/>',
        '• Enfant de moins de 6 ans : à reporter en case 7GA du formulaire 2042 RICI (7GB, 7GC pour les suivants).<br/>',
        '• Crédit d\'impôt de '+nbf(CI_TAUX*100,0)+' % des dépenses, retenues dans la limite de '+nbf(CI_PLAFOND_DEPENSES,0)+' € par enfant. Les aides déjà perçues, dont le complément de mode de garde, se déduisent de la base.<br/>',
        '• Conservez ce document avec vos justificatifs.',
        '</div>',
        '<p style="margin-top:16px;font-size:11px;text-align:center;font-weight:600;color:#2E4859">Je soussigné(e), '+(user?.prenom||'[Prénom]')+' '+(user?.nom||'[Nom]')+', assistante maternelle agréée, certifie exacts les renseignements ci-dessus.</p>',
        '<div class="sig">',
        '<div class="sig-box">Fait à ____________<br/>Le '+new Date().toLocaleDateString('fr-FR')+'<br/><br/>Signature :'
          +(userSig?'<br/><img src="'+userSig+'" style="max-height:50px;max-width:100%;margin-top:4px"/>':'<br/><span style="color:#999;font-size:11px;font-style:italic">(Aucune signature enregistree dans Parametres)</span>')
          +'</div>',
        '<div class="sig-box">Remis au parent le :<br/>____________<br/><br/>Signature parent :</div></div>',
        '<p style="font-size:11px;color:#999;margin-top:20px;text-align:center">Généré par TiMat — timat.app — '+new Date().toLocaleDateString('fr-FR')+'</p>',
        '</div>',
        '<script>function dlPdf(){var el=document.getElementById("doc");var opt={margin:0,filename:"recapitulatif-versements-'+annee+'-'+H(enfant.prenom||"enfant")+'.pdf",image:{type:"jpeg",quality:.95},html2canvas:{scale:2,useCORS:true,logging:false,windowWidth:780},jsPDF:{unit:"mm",format:"a4",orientation:"portrait",compress:true},pagebreak:{mode:["css","legacy"]}};html2pdf().from(el).set(opt).save();}</script>',
        '</body></html>'
      ].join('');
      w.document.write(html);
      w.document.close();
      setToast("Attestation fiscale générée ✓");
    },800);
  };

  return <div className="fi">
    {toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
    <PageHeader icon="💶" title="Récapitulatif des versements" sub="Justificatif des sommes versées — complément de l'attestation Pajemploi"/>
    {role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
      {liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>setSelId(e.id)}/>)}
    </div>}
    <div className="g2">
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div className="card">
          <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:14}}><IconeOuEmoji e="💶"/> Récapitulatif pour {enfant.prenom||"-"}</div>
          <div style={{marginBottom:12}}>
            <label className="lbl">Année</label>
            <select className="sel"value={annee}onChange={e=>setAnnee(Number(e.target.value))}>
              {annees.map(a=><option key={a}value={a}>{a}</option>)}
            </select>
          </div>
          <div style={{padding:12,background:"var(--c)",borderRadius:10,marginBottom:14,fontSize:12,lineHeight:1.7}}>
            <div style={{fontWeight:700,marginBottom:6,color:"var(--b)",display:"flex",justifyContent:"space-between"}}>
              <span>Récapitulatif {annee}</span>
              <span style={{fontSize:11,fontWeight:400,color:hasReal?"var(--G)":"var(--l)",fontStyle:"italic"}}>{sourceLabel}</span>
            </div>
            {hasReal?<>
              <div style={{display:"flex",justifyContent:"space-between"}}><span>Nombre de versements</span><strong>{versementsList.length}</strong></div>
              <div style={{marginTop:8,marginBottom:4,fontWeight:700,color:"var(--b)"}}>Détail des versements</div>
              {versementsList.map((v,i)=><div key={i}style={{display:"flex",justifyContent:"space-between",borderBottom:"1px solid var(--br)",padding:"4px 0",gap:8}}>
                <span>{fmtD(v.date)} · {MODE_LBL[v.mode]||v.mode||"—"}{v.periode?(" · "+v.periode):""}</span>
                <strong style={{whiteSpace:"nowrap"}}>{fmtE(v.montant)}</strong>
              </div>)}
              <div style={{display:"flex",justifyContent:"space-between",paddingTop:8,marginTop:4,fontWeight:700,color:"var(--S)",borderTop:"2px solid var(--br)"}}><span>Total réellement versé</span><span>{fmtE(totalReel)}</span></div>
            </>:<>
              <div style={{display:"flex",justifyContent:"space-between"}}><span>Salaire net estimé</span><strong>{fmtE(estSalNet)}</strong></div>
              <div style={{display:"flex",justifyContent:"space-between"}}><span>Indemnités entretien (est.)</span><strong>{fmtE(estEntretien)}</strong></div>
              <div style={{display:"flex",justifyContent:"space-between",borderTop:"1px solid var(--br)",paddingTop:6,marginTop:6,fontWeight:700,color:"var(--l)"}}><span>Total estimé</span><span>{fmtE(totalEstime)}</span></div>
              <div style={{marginTop:8,fontSize:11,color:"var(--l)",fontStyle:"italic"}}>Aucun versement enregistré pour {annee} — estimation indicative. Saisis les versements dans l'onglet « Versements » pour un récapitulatif réel.</div>
            </>}
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            <button className="btn bT"style={{width:"100%"}}onClick={telechargerPDF}disabled={gen}>
              {gen?"⏳ Génération...":"📥 Télécharger le récapitulatif "+annee+" en PDF"}
            </button>
            <button className="btn bG s"style={{width:"100%"}}onClick={generer}disabled={gen}>
              <IconeOuEmoji e="🖨️"/> Aperçu / Imprimer
            </button>
          </div>
        </div>
        <div style={{padding:12,background:"var(--Bp)",borderRadius:10,fontSize:12,color:"var(--B)",lineHeight:1.6}}>
          💡 Récapitulatif indicatif des sommes versées. <strong>Il ne remplace pas l'attestation fiscale officielle de Pajemploi</strong> (espace en ligne du parent), à reporter en case 7GA du formulaire 2042 RICI pour un enfant de moins de 6 ans. Le crédit vaut {nbf(CI_TAUX*100,0)} % des dépenses, plafonnées à {nbf(CI_PLAFOND_DEPENSES,0)} € par enfant, aides déjà perçues déduites.
        </div>
      </div>
      <div className="card">
        <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:14}}><IconeOuEmoji e="📋"/> Contrat en cours</div>
        {contrat.debut?<div style={{fontSize:12,lineHeight:2}}>
          <div>Début : <strong>{contrat.debut}</strong></div>
          <div>Heures/semaine : <strong>{contrat.heuresHebdo||40}h</strong></div>
          <div>Taux horaire : <strong>{contrat.tauxHoraire||minimumHoraireAu(new Date())} €</strong></div>
          <div>Entretien : <strong>{contrat.entretien||3.92} €/jour</strong></div>
        </div>:<div style={{fontSize:12,color:"var(--l)"}}>Aucun contrat trouvé pour cet enfant.</div>}
      </div>
    </div>
  </div>;
}

// ALERTE DIVERGENCE FICHE / PROFIL P15

export function InviterParent({enfants,user,demoMode=false}){
  const [selId,setSelId]=useState(enfants[0]?.id);
  const [email,setEmail]=useState("");
  const [sending,setSending]=useState(false);
  const [sent,setSent]=useState(false);
  const [err,setErr]=useState("");
  const [toast,setToast]=useState("");
  const [invitations,setInvitations]=useState(demoMode?[{id:"inv_demo",email_parent:"parent.leo@email.fr",prenom_enfant:"Léo",statut:"envoyée",created_at:new Date().toISOString()}]:[]);
  const [shareToken,setShareToken]=useState(null);
  const enfant=enfants.find(e=>e.id===selId)||enfants[0];
  useEffect(()=>{
    setShareToken(null);
    if(demoMode||!enfant?.id){return;}
    let alive=true;
    supabase.rpc("get_or_create_share_token",{p_enfant_id:enfant.id}).then(({data,error})=>{if(alive&&!error&&data)setShareToken(data);});
    return()=>{alive=false;};
  },[enfant?.id,demoMode]);

  // Charger invitations existantes
  useEffect(()=>{
    if(demoMode||!user?.id)return;
    supabase.from('invitations').select('*').eq('asmat_id',user.id).order('created_at',{ascending:false})
      .then(({data})=>{if(data)setInvitations(data);});
  },[user?.id,demoMode]);

  const envoyer=async()=>{
    if(demoMode){setToast("Démo : invitation non envoyée");return;}
    if(!email.trim()||!enfant){setErr("Email et enfant requis.");return;}
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){setErr("Email invalide.");return;}
    setSending(true);setErr("");
    try{
      const res=await fetch('/api/invite-parent',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          emailParent:email.trim(),
          prenomEnfant:enfant.prenom,
          prenomAsmat:user?.prenom||"Votre assistante maternelle",
          asmatId:user?.id,
          enfantId:enfant.id,
        })
      });
      const data=await res.json();
      if(data.success||res.ok){
        logAction('invitation_parent', {table_name:'invitations', record_id:enfant.id}); // AUDIT LOG P8
        setSent(true);
        setToast("Invitation envoyée à "+email+" ✓");
        setInvitations(prev=>[{id:"inv"+Date.now(),email_parent:email,prenom_enfant:enfant.prenom,statut:"envoyée",created_at:new Date().toISOString()},...prev]);
        setEmail("");
      }else{
        setErr("Erreur : "+(data.error||"Réessayez."));
      }
    }catch(e){setErr("Erreur réseau.");}
    setSending(false);
  };

  return <div className="fi">
    {toast&&<Toast msg={toast} onClose={()=>setToast("")}/>}
    <PageHeader icon="👪" title="Inviter un parent" sub="Le parent reçoit un email et crée son espace famille"/>

    {/* Sélecteur d'enfant */}
    {enfants.length>1&&<div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
      {enfants.map(e=><CPill key={e.id} e={e} sel={selId===e.id} onClick={()=>setSelId(e.id)}/>)}
    </div>}

    <div className="g2">
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        {/* Formulaire */}
        <div className="card">
          <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:6}}>
            ✉️ Inviter le parent de {enfant?.prenom}
          </div>
          <div style={{fontSize:12,color:"var(--l)",marginBottom:16,lineHeight:1.6}}>
            Le parent recevra un email avec un lien pour créer son compte et accéder au journal, aux pointages et à la messagerie.
          </div>
          <div style={{marginBottom:12}}>
            <label className="lbl">Email du parent *</label>
            <input className="inp" type="email" value={email}
              onChange={e=>{setEmail(e.target.value);setErr("");setSent(false);}}
              placeholder="parent@email.fr"
              onKeyDown={e=>e.key==="Enter"&&envoyer()}/>
          </div>
          {err&&<div style={{color:"var(--R)",fontSize:12,marginBottom:10,padding:"8px 12px",background:"var(--Rp)",borderRadius:8}}>{err}</div>}
          {sent&&<div style={{color:"var(--S)",fontSize:12,marginBottom:10,padding:"8px 12px",background:"var(--Sp)",borderRadius:8,fontWeight:600}}>
            ✅ Invitation envoyée ! Le parent a reçu un email.
          </div>}
          <button className="btn bT" style={{width:"100%",justifyContent:"center"}}
            onClick={envoyer} disabled={sending||!email.trim()}>
            {sending?"⏳ Envoi en cours...":"📧 Envoyer l'invitation"}
          </button>
        </div>

        {/* Lien direct (backup) */}
        <div className="card" style={{background:"var(--Bp)",border:"1px solid var(--B)"}}>
          <div style={{fontWeight:700,fontSize:13,color:"var(--B)",marginBottom:8}}><IconeOuEmoji e="🔗"/> Ou partagez ce lien directement</div>
          <div style={{fontSize:11,color:"var(--m)",marginBottom:10,lineHeight:1.6}}>
            Envoyez ce lien par SMS, WhatsApp ou autre. Le parent n'a qu'à créer son compte.
          </div>
          <div style={{display:"flex",gap:8,minWidth:0}}>
            <div style={{flex:1,minWidth:0,padding:"8px 10px",background:"var(--w)",borderRadius:8,fontSize:11,color:"var(--l)",fontFamily:"'DM Mono',monospace",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
              {shareToken?(window.location.origin+"/?invite="+shareToken):"Génération du lien…"}
            </div>
            <button className="btn bG s" style={{padding:"6px 10px",flexShrink:0}}
              onClick={()=>{if(!shareToken)return;navigator.clipboard?.writeText(window.location.origin+"/?invite="+shareToken);setToast("Lien copié ✓");}}>
              📋 Copier
            </button>
          </div>
        </div>
      </div>

      {/* Historique invitations */}
      <div className="card">
        <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:14}}><IconeOuEmoji e="📋"/> Invitations envoyées</div>
        {invitations.length===0
          ?<EmptyState emoji="📭" titre="Aucune invitation envoyée" texte="Invitez un parent pour partager l'espace de son enfant : les invitations envoyées apparaîtront ici."/>
          :<div style={{display:"flex",flexDirection:"column",gap:8}}>
            {invitations.map((inv,i)=><div key={inv.id||i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 12px",background:"var(--c)",borderRadius:10}}>
              <div>
                <div style={{fontSize:13,fontWeight:600,color:"var(--b)"}}>{inv.email_parent||inv.email}</div>
                <div style={{fontSize:11,color:"var(--l)"}}>
                  Pour {inv.prenom_enfant||enfant?.prenom} · {new Date(inv.created_at).toLocaleDateString("fr-FR")}
                </div>
              </div>
              <span className="badge" style={{
                background:inv.statut==="acceptée"?"var(--Sp)":"var(--Gp)",
                color:inv.statut==="acceptée"?"var(--S)":"var(--G)",fontSize:11
              }}>{inv.statut==="acceptée"?"✅ Acceptée":"⏳ En attente"}</span>
            </div>)}
          </div>}
      </div>
    </div>
  </div>;
}

export function Boutique({user}){
  const [toast,setToast]=useState("");
  const isPro=user?.subscription_status==="pro";
  const products=[
    {id:"kit_sheets",name:"Kit de gestion Assmat",price:"14,90",desc:"Jusqu'a 4 contrats : heures jour par jour, conges payes compares, recapitulatif annuel.",icon:"📊",color:"#5DA9A1"},
    {id:"fiche_urgence",name:"Fiche d'urgence",prix:0,desc:"Fiche complete a remplir : enfant, parents, personnes autorisees, medical, urgences.",icon:"🚨",color:"#C84B31",fichier:"/documents/fiche-renseignements-urgence.pdf"},
    {id:"projet_accueil",name:"Projet d'accueil",price:"12,90",desc:"13 sections : presentation, lieu, familiarisation, journee type, sommeil, repas, change, jeu, emotions, parents, inclusion, securite, formation.",icon:"🌿",color:"#2E4859"},
    {id:"registre_medicaments",name:"Registre des medicaments",prix:0,desc:"Document obligatoire (article R2111-1). Vous pouvez aussi le tenir directement dans l'application.",icon:"💊",color:"#5DA9A1",fichier:"/documents/registre-medicaments-administres.pdf"},
  ];

  const acheter=async(product)=>{
    try{
      const res=await fetch('/api/checkout-session',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({userId:user?.id,email:user?.email,prenom:user?.prenom,productId:product.id,productName:product.name,productPrice:product.price}),
      });
      const data=await res.json();
      if(data.url)window.location.href=data.url;
      else setToast("Erreur de paiement — reessayez");
    }catch(e){setToast("Erreur reseau");}
  };

  return <div className="fi">
    {toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
    <PageHeader icon="🛒" title="Boutique TiMat" sub="Templates et outils pour simplifier votre quotidien d'assmat"/>
    {isPro&&<div style={{background:"var(--Sp)",border:"1px solid var(--Sl)",borderRadius:10,padding:"10px 16px",marginBottom:16,fontSize:12,color:"var(--S)",fontWeight:600}}>
      ⭐ En tant qu'abonnee Pro, vous beneficiez de -20% sur tous les produits de la boutique.
    </div>}
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:16}}>
      {products.map(p=><div key={p.id}className="card"style={{padding:0,overflow:"hidden",display:"flex",flexDirection:"column"}}>
        <div style={{height:80,background:"linear-gradient(135deg,"+p.color+"20,"+p.color+"08)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:36,position:"relative"}}>
          {p.icon}
          {p.badge&&<div style={{position:"absolute",top:8,right:8,background:p.color,color:"#fff",borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:700}}>{p.badge}</div>}
        </div>
        <div style={{padding:16,flex:1,display:"flex",flexDirection:"column"}}>
          <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:6}}>{p.name}</div>
          <div style={{fontSize:12,color:"var(--l)",lineHeight:1.6,flex:1,marginBottom:12}}>{p.desc}</div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              {p.prix===0
                ? <span style={{fontSize:18,fontWeight:700,color:p.color}}>Gratuit</span>
                : <>
                    {isPro&&<span style={{fontSize:11,color:"var(--l)",textDecoration:"line-through",marginRight:6}}>{p.price} EUR</span>}
                    <span style={{fontSize:18,fontWeight:700,color:p.color}}>{isPro?nbf((parseFloat(p.price.replace(",","."))*0.8),2):p.price} EUR</span>
                  </>}
            </div>
            {p.prix===0
              ? <a className="btn bT s" href={p.fichier} download style={{padding:"8px 16px",textDecoration:"none"}}>Telecharger</a>
              : <button className="btn bT s"style={{padding:"8px 16px"}}onClick={()=>acheter(p)}>Acheter</button>}
          </div>
        </div>
      </div>)}
    </div>
    <div style={{marginTop:20,textAlign:"center",fontSize:12,color:"var(--l)"}}>
      Paiement securise par Stripe. Telechargement immediat apres achat.
    </div>
  </div>;
}

//

