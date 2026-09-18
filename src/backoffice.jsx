// ============================================================
// BACK-OFFICE — chargé à la demande, jamais sur la landing
// ------------------------------------------------------------
// Ce code ne sert qu'à l'administratrice, sur la route
// /backoffice. Tant qu'il vivait dans App.jsx, chaque visiteuse
// de timat.app téléchargeait ces 1 700 lignes avant de pouvoir
// lire le hero. App.jsx l'importe maintenant en import(), donc
// Rollup le sort dans son propre morceau.
//
// Le retour vers App.jsx est volontaire : les écrans partagés
// (LandingPage, Messagerie, FAQ, Boutique...) et la config
// restent définis là-bas, dans le morceau principal, et ne sont
// donc pas dupliqués ici.
// ============================================================
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../lib/supabase.js";
import {
  Boutique, Messagerie, Styles, Toast, IconeOuEmoji, LandingPage, DEFAULT_CONFIG, G, applyColsToDOM, loadConfig, MAINTENANCE
} from "./App.jsx";
import {
  backupCurrentConfig
} from "./socle.jsx";

const BOField=({label,children,hint})=>(
  <div style={{marginBottom:10}}>
    <div style={{fontSize:11,fontWeight:700,color:"var(--m)",marginBottom:3,textTransform:"uppercase",letterSpacing:".4px"}}>{label}</div>
    {children}
    {hint&&<div style={{fontSize:11,color:"var(--l)",marginTop:3,fontStyle:"italic"}}>{hint}</div>}
  </div>
);

const BOColorInput=({k,state,setter})=>{
  const v=state[k]||"";
  const isSolid=/^#[0-9a-fA-F]{3,8}$/.test(v);
  return (
    <div style={{display:"flex",gap:4,alignItems:"center"}}>
      {isSolid&&<input type="color"value={v.slice(0,7)}onChange={e=>setter(k,e.target.value)} style={{width:32,height:28,border:"none",borderRadius:6,cursor:"pointer",padding:1,flexShrink:0}}/>}
      <input className="inp"style={{flex:1,fontSize:11,padding:"5px 7px",minWidth:0}}value={v}onChange={e=>setter(k,e.target.value)}placeholder="#rrggbb ou rgba(...) ou gradient"/>
      <div style={{width:20,height:20,borderRadius:4,background:v||"transparent",border:"1px solid var(--br)",flexShrink:0}}/>
    </div>
  );
};

const BOTextInput=({k,state,setter,multi,placeholder})=>(
  multi
    ?<textarea className="inp"rows={3}style={{fontSize:11,padding:"6px 8px",resize:"vertical",width:"100%",boxSizing:"border-box",fontFamily:"inherit"}}value={state[k]||""}onChange={e=>setter(k,e.target.value)}placeholder={placeholder}/>
    :<input className="inp"style={{fontSize:11,padding:"6px 8px",width:"100%",boxSizing:"border-box"}}value={state[k]||""}onChange={e=>setter(k,e.target.value)}placeholder={placeholder}/>
);

const BOAlignInput=({k,state,setter})=>(
  <div style={{display:"flex",gap:2}}>
    {[["left","☰ Gauche"],["center","☰ Centre"],["right","☰ Droite"],["justify","☰ Justifié"]].map(([a,label])=><button key={a}onClick={()=>setter(k,a)}style={{
      flex:1,padding:"5px 0",border:"1px solid var(--br)",borderRadius:6,cursor:"pointer",fontSize:11,fontWeight:600,
      background:state[k]===a?"var(--S)":"var(--c)",color:state[k]===a?"#fff":"var(--m)",transition:"all .15s"
    }}>{label}</button>)}
  </div>
);

const BOCard=({title,icon,children})=>(
  <div className="card"style={{marginBottom:10}}>
    {title&&<div style={{fontWeight:700,fontSize:12,marginBottom:10,color:"var(--b)",display:"flex",alignItems:"center",gap:6,paddingBottom:8,borderBottom:"1px solid var(--br)"}}>
      {icon&&<span style={{fontSize:14}}>{icon}</span>}{title}
    </div>}
    {children}
  </div>
);

function IframePreview({cfg,noBezel}){
  const [device,setDevice]=useState("mobile");
  const [body,setBody]=useState(null);
  const initDoc=(ifr)=>{
    if(!ifr)return;
    const d=ifr.contentDocument||ifr.contentWindow?.document;
    if(!d||!d.body)return;
    try{ d.head.innerHTML=document.head.innerHTML; }catch(e){}
    d.body.style.margin="0";
    d.body.style.background="#fff";
    setBody(d.body);
  };
  return <div style={{height:"100%",display:"flex",flexDirection:"column",background:"#d8d8d8"}}>
    <div style={{display:"flex",gap:8,padding:"10px",justifyContent:"center",background:"#e8e8e8",flexShrink:0,alignItems:"center"}}>
      <span style={{fontSize:11,fontWeight:700,color:"var(--S)",marginRight:4}}>👁 APERÇU LIVE</span>
      {[["mobile","📱 Mobile"],["web","🖥 Web"]].map(([k,l])=>
        <button key={k}onClick={()=>{setBody(null);setDevice(k);}}style={{padding:"6px 16px",borderRadius:20,border:"none",cursor:"pointer",fontWeight:700,fontSize:12,fontFamily:"inherit",background:device===k?"var(--accent)":"#fff",color:device===k?"#fff":"var(--m)"}}>{l}</button>)}
    </div>
    <div style={{flex:1,overflow:"auto",display:"flex",justifyContent:"center",padding:(device==="mobile"&&!noBezel)?"20px":"0"}}>
      <iframe key={device} ref={initDoc} onLoad={e=>initDoc(e.target)} title="Aperçu landing"
        style={{width:(device==="mobile"&&!noBezel)?"390px":"100%",height:(device==="mobile"&&!noBezel)?"812px":"100%",maxWidth:"100%",flexShrink:0,border:(device==="mobile"&&!noBezel)?"10px solid #1a1a2e":"none",borderRadius:(device==="mobile"&&!noBezel)?32:0,background:"#fff"}}/>
    </div>
    {body&&createPortal(<div className="app"><Styles/><LandingPage onLogin={()=>{}}dark={false}setDark={()=>{}}config={cfg} preview/></div>, body)}
  </div>;
}

function Backoffice({user,setPage,appConfig,setAppConfig,secProp,setSecProp,hideTabBar}){
  const [secI,setSecI]=useState("hero");
  const sec=(secProp!==undefined&&secProp!==null)?secProp:secI;
  const setSec=setSecProp||setSecI;
  const [isWide,setIsWide]=useState(typeof window!=="undefined"&&window.innerWidth>=900);
  useEffect(()=>{const f=()=>setIsWide(window.innerWidth>=900);window.addEventListener("resize",f);return()=>window.removeEventListener("resize",f);},[]);
  const [mView,setMView]=useState("champs");
  const [subSec,setSubSec]=useState("textes");
  const [openBlocks,setOpenBlocks]=useState(null); // P32-3b : index de l'article dont l'éditeur de blocs est ouvert
  const [dragSec,setDragSec]=useState(null); // P32-4 : index de section en cours de drag
  const [saving,setSaving]=useState(false);
  const [toast,setToast]=useState("");
  const [stats,setStats]=useState({users:0,pro:0,enfants:0});
  const [showPreview,setShowPreview]=useState(true);
  const [search,setSearch]=useState("");
  // P30C : modale de confirmation Reset (saisie "RESET" obligatoire)
  const [showResetModal,setShowResetModal]=useState(false);
  const [resetInput,setResetInput]=useState("");
  const [resetting,setResetting]=useState(false);
  // P30D : historique des backups + restauration 1-clic
  const [backupList,setBackupList]=useState([]);
  const [loadingBackups,setLoadingBackups]=useState(false);
  const [restoringId,setRestoringId]=useState(null);
  const [showRestoreModal,setShowRestoreModal]=useState(null);
  const [showJsonModal,setShowJsonModal]=useState(null); // P31D : aperçu JSON d'une sauvegarde
  const prettyConfig=(c)=>{ try{ return JSON.stringify(typeof c==="string"?JSON.parse(c):c,null,2); }catch(e){ return String(c); } };

  const [cfg,setCfg]=useState(JSON.parse(JSON.stringify(appConfig||DEFAULT_CONFIG)));
  // P30C : AUTOSAVE DÉSACTIVÉ (cause de l'incident Reset→écrasement prod).
  // L'indicateur signale désormais "modifications non sauvegardées" et invite
  // à cliquer Sauvegarder manuellement, mais N'ÉCRIT PLUS automatiquement en prod.
  const [saveStatus, setSaveStatus] = useState("idle");
  const _p21FirstRender = useRef(true);
  useEffect(() => {
    if (_p21FirstRender.current) { _p21FirstRender.current = false; return; }
    setSaveStatus("dirty");
  }, [cfg]);
  useEffect(() => {
    let el = document.getElementById("p21-save-indicator");
    if (!el) {
      el = document.createElement("div");
      el.id = "p21-save-indicator";
      el.style.cssText = "position:fixed;top:20px;right:20px;padding:10px 18px;border-radius:8px;font-size:13px;font-weight:600;z-index:9999;transition:all .3s;font-family:system-ui;box-shadow:0 4px 12px rgba(0,0,0,0.15);opacity:0";
      document.body.appendChild(el);
    }
    const map = {
      idle:    { txt:"", show:false, bg:"transparent", col:"transparent" },
      dirty:   { txt:"⚠️ Modifications non sauvegardées — clique 💾", bg:"#FEF3C7", col:"#92400E", show:true },
      saving:  { txt:"Sauvegarde...",              bg:"#DBEAFE", col:"#1E40AF", show:true },
      saved:   { txt:"✅ Sauvegardé",              bg:"#D1FAE5", col:"#065F46", show:true },
      error:   { txt:"Erreur de sauvegarde",       bg:"#FEE2E2", col:"#991B1B", show:true },
    };
    const s = map[saveStatus] || map.idle;
    el.textContent = s.txt;
    el.style.background = s.bg;
    el.style.color = s.col;
    el.style.opacity = s.show ? "1" : "0";
    el.style.pointerEvents = s.show ? "auto" : "none";
  }, [saveStatus]);

  useEffect(()=>{
    const load=async()=>{
      const {count:u}=await supabase.from('profiles').select('*',{count:'exact',head:true});
      const {count:p}=await supabase.from('profiles').select('*',{count:'exact',head:true}).eq('subscription_status','pro');
      const {count:e}=await supabase.from('enfants').select('*',{count:'exact',head:true});
      setStats({users:u||0,pro:p||0,enfants:e||0});
    };
    load();
  },[]);

  // Live preview: apply colors to DOM as cfg changes
  useEffect(()=>{
    applyColsToDOM(cfg.cols);
  },[cfg.cols]);

  // Helpers
  const setCol=(k,v)=>setCfg(c=>({...c,cols:{...c.cols,[k]:v}}));
  const setTxt=(k,v)=>setCfg(c=>({...c,txts:{...c.txts,[k]:v}}));
  const setLand=(k,v)=>setCfg(c=>({...c,landing:{...c.landing,[k]:v}}));
  const setFeat=(k,v)=>setCfg(c=>({...c,feats:{...c.feats,[k]:v}}));
  const setSV=(k,v)=>setCfg(c=>({...c,sectionsVisibles:{...(c.sectionsVisibles||{}),[k]:v}}));
  const moveSectionAt=(from,to)=>setCfg(c=>{const base=(c.sectionsOrder&&c.sectionsOrder.length)?c.sectionsOrder:DEFAULT_CONFIG.sectionsOrder;const arr=[...base];if(from<0||from>=arr.length||to<0||to>=arr.length)return c;const[x]=arr.splice(from,1);arr.splice(to,0,x);return{...c,sectionsOrder:arr};});
  const setPain=(idx,field,v)=>setCfg(c=>{const pp=[...(c.painPoints||[])];pp[idx]={...pp[idx],[field]:v};return{...c,painPoints:pp};});
  const setTesti=(idx,field,v)=>setCfg(c=>{const tt=[...(c.testimonials||[])];tt[idx]={...tt[idx],[field]:v};return{...c,testimonials:tt};});
  const setStat=(which,idx,field,v)=>setCfg(c=>{const ss=[...(c[which]||[])];ss[idx]={...ss[idx],[field]:field==="n"?Number(v):v};return{...c,[which]:ss};});
  const addPain=()=>setCfg(c=>({...c,painPoints:[...(c.painPoints||[]),{ic:"✨",titre:"Nouveau",desc:"Description"}]}));
  const removePain=(idx)=>setCfg(c=>({...c,painPoints:(c.painPoints||[]).filter((_,i)=>i!==idx)}));
  const addTesti=()=>setCfg(c=>({...c,testimonials:[...(c.testimonials||[]),{nom:"Nouveau",ville:"Ville",avant:"Avant...",apres:"Après..."}]}));
  const removeTesti=(idx)=>setCfg(c=>({...c,testimonials:(c.testimonials||[]).filter((_,i)=>i!==idx)}));
  // Free/Pro/Guarantees
  const setFreeItem=(idx,pos,v)=>setCfg(c=>{const items=[...(c.freeItems||[])];const row=[...items[idx]];row[pos]=v;items[idx]=row;return{...c,freeItems:items};});
  const addFreeItem=()=>setCfg(c=>({...c,freeItems:[...(c.freeItems||[]),[true,"Nouvelle fonctionnalité"]]}));
  const removeFreeItem=(idx)=>setCfg(c=>({...c,freeItems:(c.freeItems||[]).filter((_,i)=>i!==idx)}));
  const setProItem=(idx,v)=>setCfg(c=>{const items=[...(c.proItems||[])];items[idx]=v;return{...c,proItems:items};});
  const addProItem=()=>setCfg(c=>({...c,proItems:[...(c.proItems||[]),"✨ Nouvelle fonctionnalité"]}));
  const removeProItem=(idx)=>setCfg(c=>({...c,proItems:(c.proItems||[]).filter((_,i)=>i!==idx)}));
  const setGuarantee=(idx,v)=>setCfg(c=>{const items=[...(c.guarantees||DEFAULT_CONFIG.guarantees)];items[idx]=v;return{...c,guarantees:items};});
  const addGuarantee=()=>setCfg(c=>({...c,guarantees:[...(c.guarantees||DEFAULT_CONFIG.guarantees),"✅ Nouvelle garantie"]}));
  const removeGuarantee=(idx)=>setCfg(c=>({...c,guarantees:(c.guarantees||DEFAULT_CONFIG.guarantees).filter((_,i)=>i!==idx)}));
  const setFaqL=(idx,field,v)=>setCfg(c=>{const ff=[...(c.faqLanding||[])];ff[idx]={...ff[idx],[field]:v};return{...c,faqLanding:ff};});
  const addFaqL=()=>setCfg(c=>({...c,faqLanding:[...(c.faqLanding||[]),{q:"Nouvelle question ?",a:"Réponse à compléter."}]}));
  const removeFaqL=(idx)=>setCfg(c=>({...c,faqLanding:(c.faqLanding||[]).filter((_,i)=>i!==idx)}));
  const setFooter=(k,v)=>setCfg(c=>({...c,footer:{...(c.footer||{}),[k]:v}}));
  const setFooterRgpd=(idx,v)=>setCfg(c=>{const r=[...((c.footer||{}).rgpd||[])];r[idx]=v;return{...c,footer:{...(c.footer||{}),rgpd:r}};});
  const addFooterRgpd=()=>setCfg(c=>({...c,footer:{...(c.footer||{}),rgpd:[...((c.footer||{}).rgpd||[]),"✅ Nouvelle ligne"]}}));
  const removeFooterRgpd=(idx)=>setCfg(c=>({...c,footer:{...(c.footer||{}),rgpd:((c.footer||{}).rgpd||[]).filter((_,i)=>i!==idx)}}));
  const setBlog=(idx,field,v)=>setCfg(c=>{const b=[...(c.blog||[])];b[idx]={...b[idx],[field]:v};return{...c,blog:b};});
  const addBlog=()=>setCfg(c=>({...c,blog:[...(c.blog||[]),{id:"article-"+Date.now(),cat:"Administratif",catColor:"#E49178",emoji:"📝",title:"Nouvel article",excerpt:"Court résumé de l'article."}]}));
  const removeBlog=(idx)=>setCfg(c=>({...c,blog:(c.blog||[]).filter((_,i)=>i!==idx)}));
  const _newBlk=(type)=>type==="h3"?{type:"h3",text:"Titre de section",color:"#2E4859"}:type==="callout"?{type:"callout",title:"💡 À savoir",text:"Texte de l'encadré.",color:"#5DA9A1"}:type==="list"?{type:"list",items:["Premier point"]}:{type:"p",text:"Votre paragraphe. Utilisez **gras** ou *italique*."};
  const setBlk=(ai,bi,field,v)=>setCfg(c=>{const bl=[...(c.blog||[])];const arr=[...(bl[ai].blocks||[])];arr[bi]={...arr[bi],[field]:v};bl[ai]={...bl[ai],blocks:arr};return{...c,blog:bl};});
  const addBlk=(ai,type)=>setCfg(c=>{const bl=[...(c.blog||[])];bl[ai]={...bl[ai],blocks:[...(bl[ai].blocks||[]),_newBlk(type)]};return{...c,blog:bl};});
  const removeBlk=(ai,bi)=>setCfg(c=>{const bl=[...(c.blog||[])];bl[ai]={...bl[ai],blocks:(bl[ai].blocks||[]).filter((_,i)=>i!==bi)};return{...c,blog:bl};});
  const moveBlk=(ai,bi,dir)=>setCfg(c=>{const bl=[...(c.blog||[])];const arr=[...(bl[ai].blocks||[])];const ni=bi+dir;if(ni<0||ni>=arr.length)return c;[arr[bi],arr[ni]]=[arr[ni],arr[bi]];bl[ai]={...bl[ai],blocks:arr};return{...c,blog:bl};});
  const setBlkItem=(ai,bi,ii,v)=>setCfg(c=>{const bl=[...(c.blog||[])];const arr=[...(bl[ai].blocks||[])];const items=[...(arr[bi].items||[])];items[ii]=v;arr[bi]={...arr[bi],items};bl[ai]={...bl[ai],blocks:arr};return{...c,blog:bl};});
  const addBlkItem=(ai,bi)=>setCfg(c=>{const bl=[...(c.blog||[])];const arr=[...(bl[ai].blocks||[])];arr[bi]={...arr[bi],items:[...(arr[bi].items||[]),"Nouveau point"]};bl[ai]={...bl[ai],blocks:arr};return{...c,blog:bl};});
  const removeBlkItem=(ai,bi,ii)=>setCfg(c=>{const bl=[...(c.blog||[])];const arr=[...(bl[ai].blocks||[])];arr[bi]={...arr[bi],items:(arr[bi].items||[]).filter((_,i)=>i!==ii)};bl[ai]={...bl[ai],blocks:arr};return{...c,blog:bl};});

  const sauvegarder=async()=>{
    setSaving(true);
    setSaveStatus("saving");
    Object.assign(G, JSON.parse(JSON.stringify(cfg)));
    applyColsToDOM(cfg.cols);
    setAppConfig(JSON.parse(JSON.stringify(cfg)));
    const result=await saveConfig();
    if(result.ok){
      if(result.backupOk===false){
        setToast("✅ Sauvegardé — ⚠️ backup de sécurité échoué (voir console)");
        console.warn("Backup échoué:", result.backupError);
      }else{
        setToast("✅ Sauvegardé ! Changements en ligne.");
      }
      setSaveStatus("saved");
      setTimeout(()=>setSaveStatus("idle"),2500);
    }else{
      setToast("❌ Échec : "+result.error);
      console.error("Échec sauvegarde:", result.error);
      setSaveStatus("error");
      setTimeout(()=>setSaveStatus("idle"),4000);
    }
    setSaving(false);
  };

  const reset=()=>{
    setResetInput("");
    setShowResetModal(true);
  };

  // P30C : exécuté quand l'utilisateur a tapé "RESET" et confirmé
  const confirmReset=async()=>{
    setResetting(true);
    // 1. Backup explicite de la config actuelle AVANT réinitialisation
    const backupRes=await backupCurrentConfig('before_reset');
    if(backupRes.ok===false){
      // Backup échoué : on alerte mais on NE réinitialise PAS (sécurité)
      setToast("⚠️ Backup avant reset échoué — réinitialisation annulée (voir console)");
      console.warn("Backup before_reset échoué:", backupRes.error);
      setResetting(false);
      setShowResetModal(false);
      return;
    }
    // 2. Réinitialisation locale (n'écrit PAS en prod ; il faudra cliquer Sauvegarder)
    setCfg(JSON.parse(JSON.stringify(DEFAULT_CONFIG)));
    setToast("🔄 Config réinitialisée localement — clique 💾 Sauvegarder pour publier");
    setResetting(false);
    setShowResetModal(false);
  };

  // P30D : charger les 20 derniers backups depuis Supabase
  const loadBackups=async()=>{
    setLoadingBackups(true);
    const {data,error}=await supabase
      .from('app_config_backup')
      .select('id,reason,created_at,created_by,config')
      .order('created_at',{ascending:false})
      .limit(20);
    if(error){
      setToast("❌ Erreur chargement historique : "+error.message);
      console.error("[TiMat historique]",error);
      setBackupList([]);
    }else{
      setBackupList(data||[]);
    }
    setLoadingBackups(false);
  };

  // P30D : restaurer un backup (crée un filet de sécurité 'manual' avant)
  const restoreBackup=async(backup)=>{
    setRestoringId(backup.id);
    // 1. Filet : backup de la config ACTUELLE avant restauration
    const safetyRes=await backupCurrentConfig('manual');
    if(safetyRes.ok===false){
      setToast("⚠️ Backup de sécurité échoué — restauration annulée (voir console)");
      console.warn("[TiMat restauration] Safety backup échoué:",safetyRes.error);
      setRestoringId(null);
      setShowRestoreModal(null);
      return;
    }
    // 2. UPDATE app_config avec le contenu du backup
    const {error}=await supabase.from('app_config').upsert({
      id:'main',
      config:backup.config,
      updated_at:new Date().toISOString()
    });
    if(error){
      setToast("❌ Erreur restauration : "+error.message);
      console.error("[TiMat restauration]",error);
      setRestoringId(null);
      setShowRestoreModal(null);
      return;
    }
    // 3. Sync des states locaux pour refléter la restauration
    const restored=JSON.parse(JSON.stringify(backup.config));
    Object.assign(G,restored);
    setCfg(restored);
    setAppConfig(JSON.parse(JSON.stringify(restored)));
    try{ applyColsToDOM(restored.cols); }catch(e){ console.warn(e); }
    setSaveStatus("idle");
    setToast("✅ Configuration restaurée depuis le "+new Date(backup.created_at).toLocaleString('fr-FR'));
    console.log("[TiMat restauration] ✅ Config restaurée depuis backup",backup.id);
    // 4. Recharger la liste (le filet 'manual' apparaîtra)
    await loadBackups();
    setRestoringId(null);
    setShowRestoreModal(null);
  };

  // P30D : auto-charger l'historique quand on active l'onglet
  useEffect(()=>{ if(sec==="historique") loadBackups(); },[sec]);

  const rechargerDepuisSupabase=async()=>{
    setSaving(true);
    await loadConfig();
    const fromDb=JSON.parse(JSON.stringify(G));
    setCfg(fromDb);
    setAppConfig(fromDb);
    setToast("🔄 Config rechargée depuis Supabase");
    setSaving(false);
  };

  const diagnostiquer=async()=>{
    try{
      let report="🔍 DIAGNOSTIC SUPABASE\n\n";

      // 1. Test lecture
      const {data:readData,error:readErr}=await supabase.from('app_config').select('*').eq('id','main').maybeSingle();
      if(readErr){
        report+="❌ LECTURE : "+readErr.message+"\n";
        if(readErr.message.includes('relation')||readErr.message.includes('does not exist')){
          report+="\n⚠️ La table n\'existe pas. Exécute dans Supabase SQL Editor :\n\nCREATE TABLE app_config (id TEXT PRIMARY KEY, config JSONB, updated_at TIMESTAMPTZ);\nALTER TABLE app_config ENABLE ROW LEVEL SECURITY;\nCREATE POLICY \"app_config_all\" ON app_config FOR ALL USING (true) WITH CHECK (true);";
        }else if(readErr.message.includes('policy')||readErr.message.includes('permission')){
          report+="\n⚠️ Problème RLS. Exécute :\n\nDROP POLICY IF EXISTS \"admin_all\" ON app_config;\nCREATE POLICY \"app_config_all\" ON app_config FOR ALL USING (true) WITH CHECK (true);";
        }
        alert(report);return;
      }
      if(!readData){
        report+="⚠️ LECTURE : Table vide (aucune ligne avec id='main')\n\n";
      }else{
        let parsed;
        try{
          parsed=typeof readData.config==='string'?JSON.parse(readData.config):readData.config;
        }catch(e){
          parsed={_raw:readData.config,_parseError:e.message};
        }
        report+="✅ LECTURE OK\n";
        report+="  Type colonne config : "+(typeof readData.config)+"\n";
        report+="  Dernière maj : "+readData.updated_at+"\n";
        if(parsed&&typeof parsed==='object'){
          report+="  Clés : "+Object.keys(parsed).join(", ")+"\n";
          report+="  landing : "+(parsed.landing?Object.keys(parsed.landing).length:0)+" champs\n";
          report+="  txts : "+(parsed.txts?Object.keys(parsed.txts).length:0)+" champs\n\n";
        }
      }

      // 2. Test écriture JSONB (objet)
      const tsJsonb=Date.now();
      const {error:errJsonb}=await supabase.from('app_config').upsert({id:'_diag_test_jsonb',config:{test:true,ts:tsJsonb},updated_at:new Date().toISOString()});
      if(errJsonb){
        report+="❌ ÉCRITURE JSONB (objet) : "+errJsonb.message+"\n";
      }else{
        report+="✅ ÉCRITURE JSONB OK\n";
      }

      // 3. Test écriture TEXT (string)
      const {error:errText}=await supabase.from('app_config').upsert({id:'_diag_test_text',config:JSON.stringify({test:true}),updated_at:new Date().toISOString()});
      if(errText){
        report+="❌ ÉCRITURE TEXT (string) : "+errText.message+"\n";
      }else{
        report+="✅ ÉCRITURE TEXT OK\n";
      }

      // Cleanup test rows
      try{
        await supabase.from('app_config').delete().in('id',['_diag_test_jsonb','_diag_test_text']);
      }catch(e){}

      // Suggestions
      if(errJsonb&&!errText){
        report+="\n💡 Ta colonne config est de type TEXT, pas JSONB.\nL\'app gère ça automatiquement maintenant. Réessaie de sauvegarder.";
      }else if(!errJsonb&&errText){
        report+="\n💡 Ta colonne config est de type JSONB. OK.";
      }else if(errJsonb&&errText){
        report+="\nÉCHEC — aucun format ne marche. Problème RLS probable.\n\nExécute :\n\nDROP POLICY IF EXISTS \"admin_all\" ON app_config;\nDROP POLICY IF EXISTS \"app_config_all\" ON app_config;\nCREATE POLICY \"app_config_all\" ON app_config FOR ALL USING (true) WITH CHECK (true);";
      }

      alert(report);
    }catch(e){
      alert("❌ Exception dans le diagnostic : "+e.message+"\n\n"+e.stack);
      console.error(e);
    }
  };

  // Google Fonts presets
  const FONT_PRESETS=[
    {name:"Fraunces + Jakarta (défaut)",title:"\'Fraunces\', Georgia, serif",body:"\'Plus Jakarta Sans\', sans-serif",url:"https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Fraunces:ital,wght@0,700;1,700&display=swap"},
    {name:"Playfair + Inter",title:"\'Playfair Display\', serif",body:"\'Inter\', sans-serif",url:"https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@700;800&display=swap"},
    {name:"Cormorant + Lato",title:"\'Cormorant Garamond\', serif",body:"\'Lato\', sans-serif",url:"https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Lato:wght@400;700&display=swap"},
    {name:"DM Serif + DM Sans",title:"\'DM Serif Display\', serif",body:"\'DM Sans\', sans-serif",url:"https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=DM+Serif+Display&display=swap"},
    {name:"Poppins partout",title:"\'Poppins\', sans-serif",body:"\'Poppins\', sans-serif",url:"https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap"},
    {name:"Montserrat + Open Sans",title:"\'Montserrat\', sans-serif",body:"\'Open Sans\', sans-serif",url:"https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700;800&family=Open+Sans:wght@400;500;600&display=swap"},
    {name:"Raleway + Roboto",title:"\'Raleway\', sans-serif",body:"\'Roboto\', sans-serif",url:"https://fonts.googleapis.com/css2?family=Raleway:wght@600;700;800&family=Roboto:wght@400;500;700&display=swap"},
    {name:"Merriweather + Source Sans",title:"\'Merriweather\', serif",body:"\'Source Sans Pro\', sans-serif",url:"https://fonts.googleapis.com/css2?family=Merriweather:wght@700;900&family=Source+Sans+Pro:wght@400;600;700&display=swap"},
  ];

  const applyFontPreset=(p)=>{
    setLand("fontTitle",p.title);
    setLand("fontBody",p.body);
    setLand("googleFontsUrl",p.url);
    setToast("🎨 Police \""+p.name+"\" appliquée");
  };

  // --- Reusable components ---


  // Helper to filter by search
  const matches=(txt)=>!search||txt.toLowerCase().includes(search.toLowerCase());

  // Main nav sections
  const secs=[
    {id:"hero",l:"Hero",ic:"🏠"},
    {id:"sections",l:"Sections",ic:"📝"},
    {id:"textes",l:"Textes",ic:"✏️"},
    {id:"couleurs",l:"Couleurs",ic:"🎨"},
    {id:"boutons",l:"Boutons",ic:"🔘"},
    {id:"polices",l:"Polices",ic:"𝐓"},
    {id:"contenu",l:"Contenu",ic:"📋"},
    {id:"app",l:"App",ic:"⚙️"},
    {id:"sectionsvis",l:"Sections visibles",ic:"👁"},
    {id:"historique",l:"Historique",ic:"🕐"},
  ];

  return <div className="fi" style={{maxWidth:"100%",padding:0}}>
    {toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}

    {/* P30C : Modale de confirmation Reset (saisie "RESET" obligatoire) */}
    {showResetModal&&<div onClick={()=>!resetting&&setShowResetModal(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div onClick={e=>e.stopPropagation()} style={{background:"var(--w)",borderRadius:18,padding:24,maxWidth:420,width:"100%",boxShadow:"0 12px 40px rgba(0,0,0,.25)",fontFamily:"inherit"}}>
        <div style={{fontSize:34,textAlign:"center",marginBottom:8}}>⚠️</div>
        <h3 style={{margin:"0 0 10px",fontSize:18,fontWeight:800,color:"var(--b)",textAlign:"center"}}>Réinitialiser toute la configuration ?</h3>
        <p style={{fontSize:13,lineHeight:1.5,color:"var(--m)",margin:"0 0 16px",textAlign:"center"}}>
          Cette action remet <b>tous les réglages du backoffice</b> à leurs valeurs par défaut (couleurs, textes, landing, tarifs…). Une sauvegarde de sécurité sera créée automatiquement avant.
        </p>
        <p style={{fontSize:12,color:"var(--m)",margin:"0 0 6px",fontWeight:600}}>Pour confirmer, tape <span style={{color:"var(--T)",fontWeight:800}}>RESET</span> ci-dessous :</p>
        <input
          autoFocus
          className="inp"
          value={resetInput}
          onChange={e=>setResetInput(e.target.value)}
          onKeyDown={e=>{if(e.key==="Enter"&&resetInput.trim().toUpperCase()==="RESET"&&!resetting)confirmReset();}}
          placeholder="Tape RESET"
          style={{width:"100%",fontSize:14,padding:"8px 12px",marginBottom:16,boxSizing:"border-box",textAlign:"center",letterSpacing:1}}
        />
        <div style={{display:"flex",gap:8,justifyContent:"center"}}>
          <button
            onClick={()=>!resetting&&setShowResetModal(false)}
            disabled={resetting}
            style={{flex:1,padding:"10px 16px",borderRadius:10,border:"1px solid var(--br)",background:"var(--w)",color:"var(--b)",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"inherit"}}
          >Annuler</button>
          <button
            onClick={confirmReset}
            disabled={resetInput.trim().toUpperCase()!=="RESET"||resetting}
            style={{flex:1,padding:"10px 16px",borderRadius:10,border:"none",
              background:(resetInput.trim().toUpperCase()==="RESET"&&!resetting)?"#DC2626":"#FCA5A5",
              color:"#fff",fontWeight:700,fontSize:14,
              cursor:(resetInput.trim().toUpperCase()==="RESET"&&!resetting)?"pointer":"not-allowed",fontFamily:"inherit"}}
          >{resetting?"⏳ …":"Réinitialiser"}</button>
        </div>
      </div>
    </div>}

    {/* P30D : Modale de confirmation Restauration */}
    {showRestoreModal&&<div onClick={()=>!restoringId&&setShowRestoreModal(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div onClick={e=>e.stopPropagation()} style={{background:"var(--w)",borderRadius:18,padding:24,maxWidth:440,width:"100%",boxShadow:"0 12px 40px rgba(0,0,0,.25)",fontFamily:"inherit"}}>
        <div style={{fontSize:34,textAlign:"center",marginBottom:8}}>🕐</div>
        <h3 style={{margin:"0 0 10px",fontSize:18,fontWeight:800,color:"var(--b)",textAlign:"center"}}>Restaurer cette version ?</h3>
        <p style={{fontSize:13,lineHeight:1.5,color:"var(--m)",margin:"0 0 8px",textAlign:"center"}}>
          La configuration du<br/>
          <b style={{color:"var(--b)"}}>{new Date(showRestoreModal.created_at).toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}</b><br/>
          remplacera la configuration actuelle.
        </p>
        <p style={{fontSize:11,lineHeight:1.5,color:"var(--m)",margin:"0 0 16px",textAlign:"center",fontStyle:"italic"}}>
          🛡️ Un filet de sécurité de la configuration actuelle sera créé automatiquement — vous pourrez donc revenir en arrière si besoin.
        </p>
        <div style={{display:"flex",gap:8,justifyContent:"center"}}>
          <button
            onClick={()=>!restoringId&&setShowRestoreModal(null)}
            disabled={restoringId!==null}
            style={{flex:1,padding:"10px 16px",borderRadius:10,border:"1px solid var(--br)",background:"var(--w)",color:"var(--b)",fontWeight:700,fontSize:14,cursor:restoringId?"not-allowed":"pointer",fontFamily:"inherit"}}
          >Annuler</button>
          <button
            onClick={()=>restoreBackup(showRestoreModal)}
            disabled={restoringId!==null}
            style={{flex:1,padding:"10px 16px",borderRadius:10,border:"none",background:restoringId?"var(--br)":"var(--T)",color:"#fff",fontWeight:700,fontSize:14,cursor:restoringId?"not-allowed":"pointer",fontFamily:"inherit"}}
          >{restoringId?"⏳ Restauration…":"↺ Restaurer"}</button>
        </div>
      </div>
    </div>}

    {/* P31D : Modale aperçu JSON d'une sauvegarde */}
    {showJsonModal&&<div onClick={()=>setShowJsonModal(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div onClick={e=>e.stopPropagation()} style={{background:"var(--w)",borderRadius:18,maxWidth:640,width:"100%",maxHeight:"85vh",display:"flex",flexDirection:"column",boxShadow:"0 12px 40px rgba(0,0,0,.25)",fontFamily:"inherit",overflow:"hidden"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 20px",borderBottom:"1px solid var(--br)",flexShrink:0}}>
          <div>
            <div style={{fontSize:15,fontWeight:800,color:"var(--b)"}}>👁 Contenu de la sauvegarde</div>
            <div style={{fontSize:11,color:"var(--m)",marginTop:2}}>{new Date(showJsonModal.created_at).toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}</div>
          </div>
          <button onClick={()=>setShowJsonModal(null)} style={{background:"var(--c)",border:"none",borderRadius:10,padding:"8px 12px",cursor:"pointer",fontSize:13,color:"var(--b)",fontWeight:700,fontFamily:"inherit"}}>✕</button>
        </div>
        <pre style={{margin:0,padding:"16px 20px",overflow:"auto",fontSize:11,lineHeight:1.5,color:"var(--b)",background:"var(--c)",whiteSpace:"pre-wrap",wordBreak:"break-word",flex:1,fontFamily:"ui-monospace,Menlo,monospace"}}>{prettyConfig(showJsonModal.config)}</pre>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",padding:"12px 20px",borderTop:"1px solid var(--br)",flexShrink:0}}>
          <button onClick={()=>{navigator.clipboard?.writeText(prettyConfig(showJsonModal.config)).then(()=>setToast("✅ JSON copié")).catch(()=>setToast("❌ Copie impossible"));}} style={{padding:"9px 16px",borderRadius:10,border:"1px solid var(--br)",background:"var(--w)",color:"var(--b)",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}><IconeOuEmoji e="📋"/> Copier</button>
          <button onClick={()=>setShowJsonModal(null)} style={{padding:"9px 16px",borderRadius:10,border:"none",background:"var(--accent)",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>Fermer</button>
        </div>
      </div>
    </div>}

    {/* Top bar */}
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",borderBottom:"1px solid var(--br)",background:"var(--w)",flexWrap:"wrap",gap:8}}>
      {(isWide||!hideTabBar)&&<div style={{display:"flex",alignItems:"center",gap:10}}>
        <button className="btn bG s"style={{padding:"5px 12px"}}onClick={()=>setPage("accueil")}>← App</button>
        <span style={{fontWeight:700,fontSize:14,color:"var(--b)"}}>🔧 Backoffice</span>
        <input className="inp"placeholder="🔍 Rechercher..."value={search}onChange={e=>setSearch(e.target.value)}style={{fontSize:11,padding:"4px 10px",width:160}}/>
      </div>}
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        <button onClick={diagnostiquer}style={{background:"none",border:"1px solid var(--br)",borderRadius:10,padding:"5px 10px",fontSize:11,cursor:"pointer",fontWeight:600,color:"var(--m)"}}title="Vérifier la config en base Supabase">🔍 Diag</button>
        <button onClick={rechargerDepuisSupabase}style={{background:"none",border:"1px solid var(--br)",borderRadius:10,padding:"5px 10px",fontSize:11,cursor:"pointer",fontWeight:600,color:"var(--m)"}}title="Recharger depuis Supabase">↻ Recharger</button>
        <button onClick={()=>setShowPreview(p=>!p)}style={{background:"none",border:"1px solid var(--br)",borderRadius:10,padding:"5px 10px",fontSize:11,cursor:"pointer",fontWeight:600,color:"var(--m)"}}>{showPreview?"👁 Masquer":"👁 Afficher"}</button>
        <button className="btn bG s"style={{padding:"5px 12px"}}onClick={reset}>↺ Reset</button>
        <button className="btn bT s"style={{padding:"5px 14px"}}onClick={sauvegarder}disabled={saving}>{saving?"⏳":"💾 Sauvegarder"}</button>
      </div>
    </div>

    {/* Bascule mobile Champs / Apercu (ecrans etroits uniquement) */}
    {!isWide&&<div style={{display:"flex",gap:6,padding:"10px 12px 0",background:"var(--c)"}}>
      {[["champs","📝 Champs"],["apercu","👁 Aperçu"]].map(([k,l])=><button key={k}onClick={()=>setMView(k)}style={{flex:1,padding:"10px",borderRadius:10,border:"none",cursor:"pointer",fontFamily:"inherit",fontWeight:700,fontSize:13,background:mView===k?"var(--accent)":"rgba(0,0,0,.05)",color:mView===k?"#fff":"var(--m)"}}>{l}</button>)}
    </div>}

    <div style={{display:isWide?"flex":"block",height:isWide?"calc(100vh - 52px)":"auto",overflow:isWide?"hidden":"visible"}}>
      {/* LEFT PANEL (champs) */}
      {(isWide||mView==="champs")&&<div style={{width:(isWide&&showPreview)?"460px":"100%",minWidth:isWide?340:0,overflowY:isWide?"auto":"visible",padding:12,borderRight:isWide?"1px solid var(--br)":"none",background:"var(--c)",transition:"width .3s"}}>

        {/* Main tabs */}
        {!hideTabBar&&<div style={{display:"flex",gap:3,marginBottom:12,flexWrap:"wrap"}}>
          {secs.map(s=><button key={s.id}onClick={()=>setSec(s.id)}style={{
            padding:"5px 10px",borderRadius:14,border:"none",cursor:"pointer",fontFamily:"inherit",fontWeight:600,fontSize:11,
            background:sec===s.id?"var(--S)":"rgba(0,0,0,.05)",color:sec===s.id?"#fff":"var(--m)",transition:"all .15s"
          }}><IconeOuEmoji e={s.ic}/> {s.l}</button>)}
        </div>}

        {/* ====================== HERO ====================== */}
        {sec==="hero"&&<>
          <BOCard title="Image de fond" icon="📸">
            <BOField label="URL de l'image" hint="Laisser vide = pas d'image de fond">
              <div style={{display:"flex",gap:4}}>
                <BOTextInput k="heroImg" state={cfg.landing} setter={setLand} placeholder="https://... ou vide pour supprimer"/>
                {cfg.landing.heroImg&&<button onClick={()=>setLand("heroImg","")}style={{background:"#FEE",border:"1px solid #FCC",borderRadius:10,cursor:"pointer",fontSize:11,padding:"4px 8px",color:"#C00",flexShrink:0}}>🗑️</button>}
              </div>
            </BOField>
            {cfg.landing.heroImg&&<>
              <BOField label={`Opacité (${Math.round((cfg.landing.heroImgOpacity||0.12)*100)}%)`}>
                <input type="range"min="0"max="1"step="0.05"value={cfg.landing.heroImgOpacity||0.12} onChange={e=>setLand("heroImgOpacity",parseFloat(e.target.value))} style={{width:"100%"}}/>
              </BOField>
              <BOField label={`Flou (${cfg.landing.heroImgBlur||2}px)`}>
                <input type="range"min="0"max="10"step="1"value={cfg.landing.heroImgBlur||2} onChange={e=>setLand("heroImgBlur",parseInt(e.target.value))} style={{width:"100%"}}/>
              </BOField>
              <BOField label="Position de l'image">
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:3}}>
                  {[["top left","↖"],["top center","↑"],["top right","↗"],["center left","←"],["center center","⊡"],["center right","→"],["bottom left","↙"],["bottom center","↓"],["bottom right","↘"]].map(([pos,icon])=>
                    <button key={pos}onClick={()=>setLand("heroImgPosition",pos)}style={{
                      padding:"8px 0",border:"1px solid var(--br)",borderRadius:6,cursor:"pointer",fontSize:12,
                      background:(cfg.landing.heroImgPosition||"center center")===pos?"var(--S)":"var(--c)",
                      color:(cfg.landing.heroImgPosition||"center center")===pos?"#fff":"var(--m)",transition:"all .15s"
                    }}>{icon}</button>
                  )}
                </div>
              </BOField>
              {/* Aperçu miniature */}
              <div style={{height:80,borderRadius:8,overflow:"hidden",border:"1px solid var(--br)",marginTop:6,position:"relative"}}>
                <div style={{position:"absolute",inset:0,backgroundImage:"url("+cfg.landing.heroImg+")",backgroundSize:"cover",backgroundPosition:cfg.landing.heroImgPosition||"center center",opacity:cfg.landing.heroImgOpacity||0.12,filter:"blur("+(cfg.landing.heroImgBlur||2)+"px)"}}/>
                <div style={{position:"absolute",inset:0,background:cfg.landing.heroBg||"#2E4859",opacity:.7}}/>
                <div style={{position:"relative",display:"flex",alignItems:"center",justifyContent:"center",height:"100%",fontSize:11,color:"#fff",fontWeight:600}}>Aperçu du hero</div>
              </div>
            </>}
            <BOField label="Fond hero (gradient / couleur)">
              <BOColorInput k="heroBg" state={cfg.landing} setter={setLand}/>
            </BOField>
          </BOCard>

          <BOCard title="Logo" icon="🌿">
            <BOField label="Image du logo (URL)" hint="Laisse vide pour utiliser l'emoji">
              <BOTextInput k="logoUrl" state={cfg.landing} setter={setLand} placeholder="https://... logo.png ou .svg"/>
            </BOField>
            <BOField label="Emoji du logo (si pas d'image)">
              <BOTextInput k="logoEmoji" state={cfg.landing} setter={setLand} placeholder="🌿"/>
            </BOField>
            <div style={{marginTop:8,padding:10,background:"#2E4859",borderRadius:10,display:"flex",alignItems:"center",gap:8}}>
              {cfg.landing.logoUrl
                ?<img src={cfg.landing.logoUrl}alt="logo"style={{height:28,borderRadius:6,objectFit:"contain"}}onError={e=>{e.target.style.display="none"}}/>
                :<div style={{width:28,height:28,borderRadius:8,background:"rgba(255,255,255,.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>{cfg.landing.logoEmoji||"🌿"}</div>}
              <span style={{color:"#fff",fontSize:16,fontWeight:700,fontFamily:cfg.landing.fontTitle}}>TiMat</span>
              <span style={{fontSize:11,color:"rgba(255,255,255,.4)",marginLeft:"auto"}}>Aperçu</span>
            </div>
            <div style={{marginTop:14,paddingTop:12,borderTop:"1px solid var(--b)"}}>
              <div style={{fontSize:11,color:"var(--l)",marginBottom:10,fontWeight:600,textTransform:"uppercase",letterSpacing:".5px"}}>Tailles du logo (px)</div>
              {[
                {k:"topBar",label:"Barre du haut (app)",min:20,max:80,def:28},
                {k:"landingHeader",label:"Landing — en-tête",min:20,max:120,def:44},
                {k:"landingFooter",label:"Landing — pied de page",min:20,max:120,def:40},
                {k:"login",label:"Page de connexion",min:40,max:200,def:80},
                {k:"loading",label:"Écran de chargement",min:40,max:200,def:64},
              ].map(({k,label,min,max,def})=>{
                const sizes=cfg.landing.logoSizes||{};
                const val=sizes[k]||def;
                return(
                  <div key={k}style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                    <span style={{fontSize:12,color:"var(--T)",minWidth:150,flexShrink:0}}>{label}</span>
                    <input type="range"min={min}max={max}value={val}step="1"style={{flex:1}}onChange={e=>{const v=parseInt(e.target.value,10);const newSizes={...(cfg.landing.logoSizes||{}),[k]:v};setLand("logoSizes",newSizes);}}/>
                    <span style={{fontSize:12,fontWeight:600,minWidth:44,textAlign:"right",color:"var(--T)"}}>{val}px</span>
                  </div>
                );
              })}
              <button type="button"onClick={()=>setLand("logoSizes",{topBar:28,landingHeader:44,landingFooter:40,login:80,loading:64})}style={{marginTop:6,padding:"6px 12px",fontSize:11,background:"transparent",border:"1px solid var(--b)",borderRadius:10,color:"var(--l)",cursor:"pointer"}}>↺ Réinitialiser les tailles</button>
            </div>
          </BOCard>

          <BOCard title="Navigation" icon="🧭">
            <div style={{fontSize:11,color:"var(--l)",marginBottom:10,fontWeight:600,textTransform:"uppercase",letterSpacing:".5px"}}>Boutons desktop (défauts partagés)</div>
            <BOField label="Fond par défaut (tous boutons)"><BOColorInput k="navBtnBg" state={cfg.landing} setter={setLand}/></BOField>
            <BOField label="Couleur texte (tous boutons)"><BOColorInput k="navBtnColor" state={cfg.landing} setter={setLand}/></BOField>
            <BOField label="Bordure (tous boutons)"><BOColorInput k="navBtnBorder" state={cfg.landing} setter={setLand}/></BOField>
            <div style={{fontSize:11,color:"var(--l)",margin:"12px 0 8px",fontWeight:600,textTransform:"uppercase",letterSpacing:".5px"}}>Boutons individuels (écrase le défaut)</div>
            <BOField label="Fond — Fonctionnalités"><BOColorInput k="navFonctionBg" state={cfg.landing} setter={setLand}/></BOField>
            <BOField label="Fond — Tarifs"><BOColorInput k="navTarifsBg" state={cfg.landing} setter={setLand}/></BOField>
            <BOField label="Fond — Boutique"><BOColorInput k="navBoutiqueBg" state={cfg.landing} setter={setLand}/></BOField>
            <BOField label="Fond — Connexion"><BOColorInput k="navConnexionBg" state={cfg.landing} setter={setLand}/></BOField>
            <div style={{fontSize:11,color:"var(--l)",margin:"12px 0 8px",fontWeight:600,textTransform:"uppercase",letterSpacing:".5px"}}>Bouton CTA (Commencer)</div>
            <BOField label="Fond CTA"><BOColorInput k="navCtaBg" state={cfg.landing} setter={setLand}/></BOField>
            <BOField label="Couleur texte CTA"><BOColorInput k="navCtaColor" state={cfg.landing} setter={setLand}/></BOField>
            <div style={{fontSize:11,color:"var(--l)",margin:"12px 0 8px",fontWeight:600,textTransform:"uppercase",letterSpacing:".5px"}}>Hamburger mobile</div>
            <BOField label="Fond hamburger"><BOColorInput k="navHamburgerBg" state={cfg.landing} setter={setLand}/></BOField>
            <BOField label="Couleur icone hamburger"><BOColorInput k="navHamburgerColor" state={cfg.landing} setter={setLand}/></BOField>
            <BOField label="Bordure hamburger"><BOColorInput k="navHamburgerBorder" state={cfg.landing} setter={setLand}/></BOField>
          </BOCard>

          <BOCard title="Textes du hero" icon="📝">
            <BOField label="Badge (bandeau jaune)"><BOTextInput k="heroBadge" state={cfg.txts} setter={setTxt}/></BOField>
            <BOField label="Titre principal"><BOTextInput k="heroTitle" state={cfg.txts} setter={setTxt}/></BOField>
            <BOField label="Accent du titre (en italique doré)" hint="Laisser vide pour masquer"><BOTextInput k="heroTitleAccent" state={cfg.txts} setter={setTxt}/></BOField>
            <BOField label="Alignement du hero"><BOAlignInput k="heroAlign" state={cfg.landing} setter={setLand}/></BOField>
            <BOField label="Sous-titre (grand)"><BOTextInput k="heroSub" state={cfg.txts} setter={setTxt}/></BOField>
            <BOField label="Description sous titre" hint="Utilise \\n pour un retour à la ligne"><BOTextInput k="heroSubDesc" state={cfg.txts} setter={setTxt} multi/></BOField>
            <BOField label="Tags (séparés par virgule)"><BOTextInput k="heroTags" state={cfg.txts} setter={setTxt}/></BOField>
          </BOCard>

          <BOCard title="Couleurs du hero" icon="🎨">
            <BOField label="Couleur titre"><BOColorInput k="heroTitleColor" state={cfg.landing} setter={setLand}/></BOField>
            <BOField label="Couleur sous-titre"><BOColorInput k="heroSubColor" state={cfg.landing} setter={setLand}/></BOField>
            <BOField label="Couleur description"><BOColorInput k="heroSubDescColor" state={cfg.landing} setter={setLand}/></BOField>
            <BOField label="Couleur badge (texte)"><BOColorInput k="heroBadgeColor" state={cfg.landing} setter={setLand}/></BOField>
            <BOField label="Fond badge"><BOColorInput k="heroBadgeBg" state={cfg.landing} setter={setLand}/></BOField>
            <BOField label="Couleur tags"><BOColorInput k="heroTagsColor" state={cfg.landing} setter={setLand}/></BOField>
            <BOField label="Couleur stats (chiffres)"><BOColorInput k="heroStatsColor" state={cfg.landing} setter={setLand}/></BOField>
            <BOField label="Hero — largeur max du titre en web (px, force 2 lignes)"><BOTextInput k="heroTitleMaxW" state={cfg.landing} setter={setLand}/></BOField>
            <BOField label="Hero stats — fond des cartes"><BOColorInput k="heroStatsCardBg" state={cfg.landing} setter={setLand}/></BOField>
            <BOField label="Hero stats — bordure des cartes"><BOColorInput k="heroStatsCardBorder" state={cfg.landing} setter={setLand}/></BOField>
            <BOField label="Couleur labels stats"><BOColorInput k="heroStatsLabelColor" state={cfg.landing} setter={setLand}/></BOField>
            <BOField label="Couleur d\'accent (italique)"><BOColorInput k="accentColor" state={cfg.landing} setter={setLand}/></BOField>
          </BOCard>
        </>}

        {/* ====================== SECTIONS ====================== */}
        {sec==="sections"&&<>
          {[
            {key:"s1",titre:"Section 1 - Problématique",icon:"🔥",fields:[
              {k:"s1Align",l:"Alignement du texte",type:"align"},
              {k:"s1Title",l:"Titre",type:"txt"},{k:"s1Desc",l:"Description",type:"txt",multi:true},{k:"s1Quote",l:"Citation finale",type:"txt",multi:true},
              {k:"section1Bg",l:"Fond section",type:"col"},{k:"s1TitleColor",l:"Couleur titre",type:"col"},{k:"s1DescColor",l:"Couleur description",type:"col"},
              {k:"s1CardBg",l:"Fond des cards",type:"col"},{k:"s1CardTitleColor",l:"Couleur titre cards",type:"col"},{k:"s1CardDescColor",l:"Couleur texte cards",type:"col"},
              {k:"s1QuoteBg",l:"Fond citation",type:"col"},{k:"s1QuoteColor",l:"Couleur citation",type:"col"},
            ]},
            {key:"s2",titre:"Section 2 - Démo interactive",icon:"🎬",fields:[
              {k:"s2Align",l:"Alignement du texte",type:"align"},
              {k:"s2Title",l:"Titre",type:"txt"},{k:"s2Desc",l:"Description",type:"txt"},
              {k:"section2Bg",l:"Fond section",type:"col"},{k:"s2TitleColor",l:"Couleur titre",type:"col"},{k:"s2DescColor",l:"Couleur description",type:"col"},
            ]},
            {key:"s5",titre:"Section 5 - Témoignages",icon:"⭐",fields:[
              {k:"s5Align",l:"Alignement du texte",type:"align"},
              {k:"s5Title",l:"Titre",type:"txt"},
              {k:"section5Bg",l:"Fond section",type:"col"},{k:"s5TitleColor",l:"Couleur titre",type:"col"},
              {k:"testimonialBg",l:"Fond cards témoignages",type:"col"},{k:"testimonialNameColor",l:"Couleur nom",type:"col"},
              {k:"testimonialCityColor",l:"Couleur ville",type:"col"},{k:"testimonialBeforeColor",l:"Couleur citation \"avant\"",type:"col"},
              {k:"testimonialAfterColor",l:"Couleur citation \"après\"",type:"col"},{k:"testimonialStarColor",l:"Couleur étoiles",type:"col"},
            ]},
            {key:"s6",titre:"Section 6 - Tarifs",icon:"💰",fields:[
              {k:"s6Align",l:"Alignement du texte",type:"align"},
              {k:"s6Title",l:"Titre",type:"txt"},
              {k:"prixMensuel",l:"Prix mensuel (€)",type:"txt",inTxts:true},{k:"prixEssai",l:"Durée essai",type:"txt",inTxts:true},
              {k:"compBasePro",l:"Comparateur — forfait pro concurrent (€)",type:"txt",inTxts:true},{k:"compParContrat",l:"Comparateur — coût par contrat (€)",type:"txt",inTxts:true},
              {k:"proLabel",l:"Badge Pro",type:"txt",inTxts:true},{k:"proSubtxt",l:"Texte sous prix",type:"txt",inTxts:true},{k:"proDesc",l:"Description Pro",type:"txt",inTxts:true},
              {k:"freeLabel",l:"Label Gratuit",type:"txt",inTxts:true},
              {k:"section6Bg",l:"Fond section",type:"col"},{k:"s6TitleColor",l:"Couleur titre",type:"col"},
              {k:"freeBg",l:"Fond card Gratuit",type:"col"},{k:"freeLabelColor",l:"Couleur label Gratuit",type:"col"},
              {k:"freePriceColor",l:"Couleur prix Gratuit",type:"col"},{k:"freeDescColor",l:"Couleur description Gratuit",type:"col"},
              {k:"proBg",l:"Fond card Pro",type:"col"},{k:"proBorderColor",l:"Bordure Pro",type:"col"},
              {k:"proLabelColor",l:"Couleur label Pro",type:"col"},{k:"proPriceColor",l:"Couleur prix Pro",type:"col"},
              {k:"proSubColor",l:"Couleur texte sous prix",type:"col"},{k:"proDescColor",l:"Couleur description Pro",type:"col"},
            ]},
            {key:"cta",titre:"CTA Final",icon:"🎯",fields:[
              {k:"ctaAlign",l:"Alignement du texte",type:"align"},
              {k:"ctaTitle",l:"Titre (avec \\n)",type:"txt",multi:true},{k:"ctaTitleAccent",l:"Accent (italique)",type:"txt"},{k:"ctaSubTitle",l:"Sous-titre",type:"txt"},
              {k:"ctaSub",l:"Texte descriptif",type:"txt",inTxts:true},{k:"ctaBtnTxt",l:"Texte bouton",type:"txt",inTxts:true},{k:"ctaFooter",l:"Footer",type:"txt",inTxts:true},
              {k:"ctaBg",l:"Fond section",type:"col"},{k:"ctaTitleColor",l:"Couleur titre",type:"col"},
              {k:"ctaSubTitleColor",l:"Couleur sous-titre",type:"col"},{k:"ctaSubColor",l:"Couleur descriptif",type:"col"},{k:"ctaFooterColor",l:"Couleur footer",type:"col"},
            ]},
          ].filter(s=>matches(s.titre)||s.fields.some(f=>matches(f.l))).map(s=>
            <BOCard key={s.key} title={s.titre} icon={s.icon}>
              {s.fields.filter(f=>!search||matches(f.l)).map(f=>
                <BOField key={f.k} label={f.l}>
                  {f.type==="align"?<BOAlignInput k={f.k} state={cfg.landing} setter={setLand}/>
                  :f.type==="col"?<BOColorInput k={f.k} state={cfg.landing} setter={setLand}/>
                  :<BOTextInput k={f.k} state={f.inTxts?cfg.txts:cfg.landing} setter={f.inTxts?setTxt:setLand} multi={f.multi}/>}
                </BOField>
              )}
            </BOCard>
          )}
        </>}

        {/* ====================== TEXTES (tous) ====================== */}
        {sec==="textes"&&<>
          <BOCard title="Hero" icon="🏠">
            {[["heroBadge","Badge"],["heroTitle","Titre"],["heroTitleAccent","Titre - accent italique"],["heroSub","Sous-titre"],["heroSubDesc","Description",true],["heroTags","Tags (séparés par ,)"],["heroBtnPrimTxt","Texte bouton principal"],["heroBtnSecTxt","Texte bouton secondaire"],["heroBtnNavTxt","Texte bouton nav"]].filter(([,l])=>matches(l)).map(([k,l,m])=>
              <BOField key={k} label={l}><BOTextInput k={k} state={cfg.txts} setter={setTxt} multi={m}/></BOField>
            )}
          </BOCard>
          <BOCard title="Sections" icon="📝">
            {[["s1Title","Section 1 - Titre"],["s1Desc","Section 1 - Description",true],["s1Quote","Section 1 - Citation",true],
              ["s2Title","Section 2 - Titre"],["s2Desc","Section 2 - Description"],
              ["s5Title","Section 5 - Titre"],["s6Title","Section 6 - Titre"],
              ["ctaTitle","CTA - Titre (\\n pour saut)",true],["ctaTitleAccent","CTA - Texte accent"],["ctaSubTitle","CTA - Sous-titre"]
            ].filter(([,l])=>matches(l)).map(([k,l,m])=>
              <BOField key={k} label={l}><BOTextInput k={k} state={cfg.landing} setter={setLand} multi={m}/></BOField>
            )}
          </BOCard>
          <BOCard title="Tarifs et CTA" icon="💰">
            {[["prixMensuel","Prix mensuel"],["prixEssai","Durée essai"],["proLabel","Badge Pro"],["proSubtxt","Pro - sous-prix"],["proDesc","Pro - description"],["proBtnTxt","Pro - bouton"],["freeLabel","Gratuit - label"],["freePrice","Gratuit - prix (ex: 0€)"],["freeDesc","Gratuit - description"],["freeBtnTxt","Gratuit - bouton"],["ctaBtnTxt","CTA - bouton"],["ctaSub","CTA - descriptif"],["ctaFooter","CTA - footer"]].filter(([,l])=>matches(l)).map(([k,l])=>
              <BOField key={k} label={l}><BOTextInput k={k} state={cfg.txts} setter={setTxt}/></BOField>
            )}
          </BOCard>
          <BOCard title="Différenciateurs (Pourquoi TiMat)" icon="⭐">
            {[
              ["diff1Ic","Diff 1 - Emoji"],["diff1Badge","Diff 1 - Badge"],["diff1Titre","Diff 1 - Titre"],["diff1Puces","Diff 1 - Puces (1/ligne)",true],
              ["diff2Ic","Diff 2 - Emoji"],["diff2Badge","Diff 2 - Badge"],["diff2Titre","Diff 2 - Titre"],["diff2Puces","Diff 2 - Puces (1/ligne)",true],
              ["diff3Ic","Diff 3 - Emoji"],["diff3Badge","Diff 3 - Badge"],["diff3Titre","Diff 3 - Titre"],["diff3Puces","Diff 3 - Puces (1/ligne)",true],
              ["diff4Ic","Diff 4 - Emoji"],["diff4Badge","Diff 4 - Badge"],["diff4Titre","Diff 4 - Titre"],["diff4Puces","Diff 4 - Puces (1/ligne)",true]
            ].filter(([,l])=>matches(l)).map(([k,l,m])=>
              <BOField key={k} label={l}><BOTextInput k={k} state={cfg.landing} setter={setLand} multi={m}/></BOField>
            )}
          </BOCard>
          <BOCard title="Démo — phrases & puces" icon="📱">
            {[
              ["demoPhrase1","Le quotidien — phrase",false],["demoPuces1","Le quotidien — puces (1/ligne)",true],
              ["demoPhrase2","Planning & présences — phrase",false],["demoPuces2","Planning & présences — puces",true],
              ["demoPhrase3","Calculs & paie — phrase",false],["demoPuces3","Calculs & paie — puces",true],
              ["demoPhrase4","Messagerie parents — phrase",false],["demoPuces4","Messagerie parents — puces",true]
            ].filter(([,l])=>matches(l)).map(([k,l,multi])=>
              <BOField key={k} label={l}><BOTextInput k={k} state={cfg.landing} setter={setLand} multi={multi}/></BOField>
            )}
          </BOCard>
          <BOCard title="Problème → Solution (lignes)" icon="⚖️">
            {[["comboLabelBefore","En-tête colonne gauche"],["comboLabelAfter","En-tête colonne droite"]].filter(([,l])=>matches(l)).map(([k,l])=>
              <BOField key={k} label={l}><BOTextInput k={k} state={cfg.landing} setter={setLand}/></BOField>
            )}
            {matches("Lignes galère solution")&&<BOField label="Lignes (1 par ligne, format : emoji | galère | solution)"><BOTextInput k="comboRows" state={cfg.landing} setter={setLand} multi={true}/></BOField>}
            {matches("Tableau comparatif lignes")&&<BOField label="Tableau comparatif — 1 ligne par item (format : emoji | titre | sous-titre | sans TiMat | avec TiMat)"><BOTextInput k="tableRows" state={cfg.landing} setter={setLand} multi={true}/></BOField>}
            {matches("Tableau comparatif colonne gauche")&&<BOField label="Tableau — titre colonne gauche (ex : Sans TiMat)"><BOTextInput k="comboLabelBefore" state={cfg.landing} setter={setLand}/></BOField>}
            {matches("Tableau comparatif colonne droite")&&<BOField label="Tableau — titre colonne droite (ex : Avec TiMat)"><BOTextInput k="comboLabelAfter" state={cfg.landing} setter={setLand}/></BOField>}
            {matches("Tableau comparatif couleur colonne gauche")&&<BOField label="Tableau — couleur du titre colonne gauche"><BOColorInput k="comboPbColor" state={cfg.landing} setter={setLand}/></BOField>}
            {matches("Tableau comparatif couleur colonne droite")&&<BOField label="Tableau — couleur du titre colonne droite"><BOColorInput k="comboSolColor" state={cfg.landing} setter={setLand}/></BOField>}
            {matches("Tableau cellules couleur titres lignes")&&<BOField label="Tableau — couleur des titres de lignes (ex : Mensualisation)"><BOColorInput k="tableTitleColor" state={cfg.landing} setter={setLand}/></BOField>}
            {matches("Tableau cellules couleur sous-titres")&&<BOField label="Tableau — couleur des sous-titres de lignes"><BOColorInput k="tableSubColor" state={cfg.landing} setter={setLand}/></BOField>}
            {matches("Tableau cellules couleur texte colonne gauche")&&<BOField label="Tableau — couleur du TEXTE des cases colonne gauche"><BOColorInput k="tableSansColor" state={cfg.landing} setter={setLand}/></BOField>}
            {matches("Tableau cellules couleur texte colonne droite")&&<BOField label="Tableau — couleur du TEXTE des cases colonne droite"><BOColorInput k="tableAvecColor" state={cfg.landing} setter={setLand}/></BOField>}
            {matches("Tableau comparatif phrase")&&<BOField label="Tableau comparatif — phrase de conclusion"><BOTextInput k="tableFooter" state={cfg.landing} setter={setLand} multi={true}/></BOField>}
          </BOCard>
        </>}
        {sec==="couleurs"&&<>
          <BOCard title="Palette de l\'application" icon="🎨">
            {[["T","Principale (terracotta)"],["S","Secondaire (sauge)"],["G","Vert d'eau (succès)"],["R","Rouge alerte (terracotta foncé)"],["c","Fond général (crème)"],["w","Fond cartes (blanc)"],["b","Texte principal (bleu nuit)"]].filter(([,l])=>matches(l)).map(([k,l])=>
              <BOField key={k} label={l}><BOColorInput k={k} state={cfg.cols} setter={setCol}/></BOField>
            )}
          </BOCard>
          <BOCard title="Fonds de sections landing" icon="🖼️">
            {[["pageBg","Fond général page"],["heroBg","Fond hero"],["section1Bg","La réalité du métier"],["section2Bg","Section 2 (démo)"],["section4Bg","Pourquoi TiMat"],["section5Bg","Section 5 (témoignages)"],["section6Bg","Section Tarifs"],["faqBg","Section FAQ"],["blogBg","Section Blog"],["footerBg","Footer"],["ctaBg","CTA final"]].filter(([,l])=>matches(l)).map(([k,l])=>
              <BOField key={k} label={l}><BOColorInput k={k} state={cfg.landing} setter={setLand}/></BOField>
            )}
          </BOCard>
          <BOCard title="Couleur d\'accent globale" icon="✨">
            <BOField label="Couleur accent (stats, italique, étoiles par défaut)"><BOColorInput k="accentColor" state={cfg.landing} setter={setLand}/></BOField>
          </BOCard>
          <BOCard title="Hero - couleurs de texte" icon="🏠">
            {[["heroTitleColor","Titre hero"],["heroSubColor","Sous-titre"],["heroSubDescColor","Description"],["heroBadgeColor","Badge - texte"],["heroBadgeBg","Badge - fond"],["heroTagsColor","Tags"],["heroStatsColor","Stats (chiffres)"],["heroStatsLabelColor","Stats (labels)"]].filter(([,l])=>matches(l)).map(([k,l])=>
              <BOField key={k} label={l}><BOColorInput k={k} state={cfg.landing} setter={setLand}/></BOField>
            )}
          </BOCard>
          <BOCard title="Section Problème → Solution - couleurs" icon="⚖️">
            {[["section1Bg","Fond de la section"],["comboCardBg","Fond des cartes"],["comboPbColor","Texte galère"],["comboSolColor","Texte solution + ✓"],["comboArrowColor","Flèche →"],["comboLabelAfterColor","En-tête colonne droite"],["s1TitleColor","Titre"],["s1DescColor","Sous-titre"]].filter(([,l])=>matches(l)).map(([k,l])=>
              <BOField key={k} label={l}><BOColorInput k={k} state={cfg.landing} setter={setLand}/></BOField>
            )}
          </BOCard>
          <BOCard title="Sections 1 à 6 - couleurs texte" icon="📑">
            {[["s1TitleColor","S1 - Titre"],["s1DescColor","S1 - Description"],["s1CardBg","S1 - Fond cards"],["s1CardTitleColor","S1 - Titre cards"],["s1CardDescColor","S1 - Texte cards"],["s1QuoteBg","S1 - Fond citation"],["s1QuoteColor","S1 - Citation"],
              ["s2TitleColor","S2 - Titre"],["s2DescColor","S2 - Description"],
              ["s4TitleColor","Pourquoi TiMat - Titre"],["s4SubColor","Pourquoi TiMat - Sous-titre"],
              ["s5TitleColor","S5 - Titre"],["testimonialBg","S5 - Fond cards"],["testimonialNameColor","S5 - Nom"],["testimonialCityColor","S5 - Ville"],["testimonialBeforeColor","S5 - Texte avant"],["testimonialAfterColor","S5 - Texte après"],["testimonialStarColor","S5 - Étoiles"],
              ["s6TitleColor","S6 - Titre"],["freeBg","S6 - Fond Gratuit"],["freeLabelColor","S6 - Label Gratuit"],["freePriceColor","S6 - Prix Gratuit"],["freeDescColor","S6 - Description Gratuit"],["proBg","S6 - Fond Pro"],["proBorderColor","S6 - Bordure Pro"],["proLabelColor","S6 - Label Pro"],["proPriceColor","S6 - Prix Pro"],["proSubColor","S6 - Sous-prix Pro"],["proDescColor","S6 - Description Pro"],
              ["ctaTitleColor","CTA - Titre"],["ctaSubTitleColor","CTA - Sous-titre"],["ctaSubColor","CTA - Descriptif"],["ctaFooterColor","CTA - Footer"]
            ].filter(([,l])=>matches(l)).map(([k,l])=>
              <BOField key={k} label={l}><BOColorInput k={k} state={cfg.landing} setter={setLand}/></BOField>
            )}
          </BOCard>
          <BOCard title="FAQ · Blog · Footer - couleurs" icon="🧩">
            {[["faqTitleColor","FAQ - Titre"],["faqDescColor","FAQ - Sous-titre"],["blogTitleColor","Blog - Titre"],["blogDescColor","Blog - Sous-titre"],["footerTextColor","Footer - Texte"]].filter(([,l])=>matches(l)).map(([k,l])=>
              <BOField key={k} label={l}><BOColorInput k={k} state={cfg.landing} setter={setLand}/></BOField>
            )}
          </BOCard>
        </>}

        {sec==="boutons"&&<>
          {[
            {titre:"Bouton NAV \"Commencer\"",icon:"🔸",fields:[["heroBtnNavTxt","Texte",true],["heroBtnNavBg","Fond",false],["heroBtnNavColor","Couleur texte",false]]},
            {titre:"Bouton NAV \"Tarifs\"",icon:"🔸",fields:[["heroBtnTarifsBg","Fond",false],["heroBtnTarifsColor","Couleur texte",false]]},
            {titre:"Bouton NAV \"Connexion\"",icon:"🔸",fields:[["heroBtnConnexionBg","Fond",false],["heroBtnConnexionColor","Couleur texte",false]]},
            {titre:"Bouton HERO principal",icon:"🔸",fields:[["heroBtnPrimTxt","Texte",true],["heroBtnPrimBg","Fond",false],["heroBtnPrimColor","Couleur texte",false]]},
            {titre:"Bouton HERO secondaire",icon:"🔸",fields:[["heroBtnSecTxt","Texte",true],["heroBtnSecBg","Fond",false],["heroBtnSecColor","Couleur texte",false]]},
            {titre:"Bouton TARIFS Gratuit",icon:"🔸",fields:[["freeBtnTxt","Texte",true],["freeBtnBg","Fond",false],["freeBtnColor","Couleur texte",false]]},
            {titre:"Bouton TARIFS Pro",icon:"🔸",fields:[["proBtnTxt","Texte",true],["proBtnBg","Fond",false],["proBtnColor","Couleur texte",false]]},
            {titre:"Bouton CTA final",icon:"🎯",fields:[["ctaBtnTxt","Texte",true],["ctaBtnBg","Fond",false],["ctaBtnColor","Couleur texte",false]]},
          ].filter(b=>matches(b.titre)).map(btn=>
            <BOCard key={btn.titre} title={btn.titre} icon={btn.icon}>
              {btn.fields.map(([k,l,isTxt])=>
                <BOField key={k} label={l}>
                  {isTxt
                    ?<BOTextInput k={k} state={cfg.txts} setter={setTxt}/>
                    :<BOColorInput k={k} state={cfg.landing} setter={setLand}/>}
                </BOField>
              )}
              {/* Preview */}
              <div style={{marginTop:8,padding:8,background:"#f0f0f0",borderRadius:8}}>
                <div style={{fontSize:11,color:"var(--l)",marginBottom:4,textTransform:"uppercase"}}>Aperçu</div>
                <button style={{
                  background:cfg.landing[btn.fields.find(f=>f[0].endsWith("Bg"))?.[0]]||"#ccc",
                  color:cfg.landing[btn.fields.find(f=>f[0].endsWith("Color"))?.[0]]||"#000",
                  border:"none",borderRadius:8,padding:"8px 14px",fontSize:12,fontWeight:700,cursor:"default",width:"100%"
                }}>{cfg.txts[btn.fields.find(f=>f[2])?.[0]]||"Exemple"}</button>
              </div>
            </BOCard>
          )}
        </>}

        {/* ====================== POLICES ====================== */}
        {sec==="polices"&&<>
          <BOCard title="Presets de polices" icon="🎨">
            <div style={{fontSize:11,color:"var(--m)",marginBottom:10}}>Clique pour appliquer un preset complet</div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {FONT_PRESETS.map(p=><button key={p.name} onClick={()=>applyFontPreset(p)}
                style={{padding:"10px 12px",background:"var(--c)",border:"1px solid var(--br)",borderRadius:10,cursor:"pointer",textAlign:"left",fontFamily:"inherit",transition:"all .15s"}}
                onMouseEnter={e=>e.currentTarget.style.background="var(--Sp)"}
                onMouseLeave={e=>e.currentTarget.style.background="var(--c)"}>
                <div style={{fontSize:11,fontWeight:700,color:"var(--b)",marginBottom:2}}>{p.name}</div>
                <div style={{fontSize:11,color:"var(--l)",fontFamily:p.title}}>Titre ({p.title.split(",")[0].replace(/\'/g,"")})</div>
                <div style={{fontSize:11,color:"var(--l)",fontFamily:p.body}}>Corps ({p.body.split(",")[0].replace(/\'/g,"")})</div>
              </button>)}
            </div>
          </BOCard>
          <BOCard title="Polices personnalisées" icon="𝐓">
            <BOField label="Police des titres" hint="Ex: \'Playfair Display\', serif">
              <BOTextInput k="fontTitle" state={cfg.landing} setter={setLand}/>
            </BOField>
            <BOField label="Police du corps" hint="Ex: \'Inter\', sans-serif">
              <BOTextInput k="fontBody" state={cfg.landing} setter={setLand}/>
            </BOField>
            <BOField label="URL Google Fonts" hint="Colle ici l\'URL complète de Google Fonts">
              <BOTextInput k="googleFontsUrl" state={cfg.landing} setter={setLand} multi/>
            </BOField>
            <div style={{padding:10,background:"var(--c)",borderRadius:8,marginTop:6,fontSize:11,color:"var(--m)",lineHeight:1.5}}>
              💡 Pour ajouter une police :<br/>
              1. Va sur <strong>fonts.google.com</strong><br/>
              2. Choisis tes polices<br/>
              3. Copie l\'URL de &lt;link href=\"...\"&gt;<br/>
              4. Colle-la ci-dessus + édite fontTitle / fontBody
            </div>
          </BOCard>
          <BOCard title="Aperçu des polices" icon="👁">
            <div style={{padding:12,background:"#fff",borderRadius:8,border:"1px solid var(--br)"}}>
              <div style={{fontFamily:cfg.landing.fontTitle,fontSize:24,fontWeight:700,marginBottom:8}}>Titre exemple</div>
              <div style={{fontFamily:cfg.landing.fontBody,fontSize:14,lineHeight:1.6}}>Corps de texte en police normale. Le lorem ipsum est un faux texte qui permet de visualiser la mise en page.</div>
            </div>
          </BOCard>
        </>}

        {/* ====================== CONTENU (items) ====================== */}
        {sec==="contenu"&&<>
          <BOCard title="FAQ de la landing" icon="❓">
            <div style={{fontSize:12,color:"var(--m)",marginBottom:12,lineHeight:1.6}}>Questions/réponses affichées dans la section « Questions fréquentes » de la page d'accueil.</div>
            {(cfg.faqLanding||[]).map((item,i)=>(
              <div key={i}style={{marginBottom:12,paddingBottom:12,borderBottom:"1px solid var(--br)"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
                  <span style={{fontSize:11,fontWeight:700,color:"var(--m)"}}>Question {i+1}</span>
                  <button onClick={()=>removeFaqL(i)}style={{background:"none",border:"1px solid var(--br)",borderRadius:10,padding:"3px 10px",fontSize:11,color:"#C84B31",cursor:"pointer",fontFamily:"inherit",fontWeight:700}}>🗑 Supprimer</button>
                </div>
                <input value={item.q}onChange={e=>setFaqL(i,"q",e.target.value)}placeholder="Question"style={{width:"100%",padding:"8px 10px",borderRadius:8,border:"1px solid var(--br)",fontSize:13,fontWeight:600,marginBottom:6,boxSizing:"border-box",fontFamily:"inherit",color:"var(--b)"}}/>
                <textarea value={item.a}onChange={e=>setFaqL(i,"a",e.target.value)}placeholder="Réponse"rows={3}style={{width:"100%",padding:"8px 10px",borderRadius:8,border:"1px solid var(--br)",fontSize:13,boxSizing:"border-box",fontFamily:"inherit",color:"var(--b)",resize:"vertical",lineHeight:1.5}}/>
              </div>
            ))}
            <button onClick={addFaqL}style={{width:"100%",padding:"10px",borderRadius:10,border:"1.5px dashed var(--br)",background:"var(--c)",color:"var(--b)",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>+ Ajouter une question</button>
          </BOCard>
          <BOCard title="Footer (pied de page)" icon="🦶">
            <div style={{fontSize:11,fontWeight:700,color:"var(--m)",marginBottom:4}}>Description (sous le logo)</div>
            <textarea value={(cfg.footer||{}).description||""}onChange={e=>setFooter("description",e.target.value)}rows={2}style={{width:"100%",padding:"8px 10px",borderRadius:8,border:"1px solid var(--br)",fontSize:13,boxSizing:"border-box",fontFamily:"inherit",color:"var(--b)",resize:"vertical",lineHeight:1.5,marginBottom:14}}/>
            <div style={{fontSize:11,fontWeight:700,color:"var(--m)",marginBottom:4}}>Contact</div>
            <input value={(cfg.footer||{}).contactEmail||""}onChange={e=>setFooter("contactEmail",e.target.value)}placeholder="Email (ex: support@timat.app)"style={{width:"100%",padding:"8px 10px",borderRadius:8,border:"1px solid var(--br)",fontSize:13,boxSizing:"border-box",fontFamily:"inherit",color:"var(--b)",marginBottom:6}}/>
            <input value={(cfg.footer||{}).contactWeb||""}onChange={e=>setFooter("contactWeb",e.target.value)}placeholder="Site (ex: timat.app)"style={{width:"100%",padding:"8px 10px",borderRadius:8,border:"1px solid var(--br)",fontSize:13,boxSizing:"border-box",fontFamily:"inherit",color:"var(--b)",marginBottom:6}}/>
            <input value={(cfg.footer||{}).contactLieu||""}onChange={e=>setFooter("contactLieu",e.target.value)}placeholder="Lieu (ex: Île-de-France, France)"style={{width:"100%",padding:"8px 10px",borderRadius:8,border:"1px solid var(--br)",fontSize:13,boxSizing:"border-box",fontFamily:"inherit",color:"var(--b)",marginBottom:14}}/>
            <div style={{fontSize:11,fontWeight:700,color:"var(--m)",marginBottom:4}}>Données & RGPD (une ligne par puce)</div>
            {((cfg.footer||{}).rgpd||[]).map((line,i)=>(
              <div key={i}style={{display:"flex",gap:6,marginBottom:6}}>
                <input value={line}onChange={e=>setFooterRgpd(i,e.target.value)}style={{flex:1,padding:"8px 10px",borderRadius:8,border:"1px solid var(--br)",fontSize:13,boxSizing:"border-box",fontFamily:"inherit",color:"var(--b)"}}/>
                <button onClick={()=>removeFooterRgpd(i)}style={{background:"none",border:"1px solid var(--br)",borderRadius:10,padding:"0 10px",fontSize:13,color:"#C84B31",cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>🗑</button>
              </div>
            ))}
            <button onClick={addFooterRgpd}style={{width:"100%",padding:"8px",borderRadius:10,border:"1.5px dashed var(--br)",background:"var(--c)",color:"var(--b)",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit",marginTop:2}}>+ Ajouter une ligne RGPD</button>
            <div style={{fontSize:11,color:"var(--m)",marginTop:10,lineHeight:1.5}}>Le copyright (nom auto-entrepreneur · SIRET) se modifie dans l'onglet dédié aux infos légales. Les liens Mentions/CGU/Confidentialité ouvrent les pages juridiques.</div>
          </BOCard>
          <BOCard title="Articles du blog (cartes)" icon="📰">
            <div style={{fontSize:12,color:"var(--m)",marginBottom:12,lineHeight:1.6}}>Cartes affichées dans la section « Ressources ». Vous pouvez éditer, ajouter ou supprimer un article. Le contenu détaillé des articles existants reste affiché ; pour un nouvel article, le contenu complet sera éditable dans une prochaine étape.</div>
            {(cfg.blog||[]).map((art,i)=>(
              <div key={i}style={{marginBottom:14,paddingBottom:14,borderBottom:"1px solid var(--br)"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
                  <span style={{fontSize:11,fontWeight:700,color:"var(--m)"}}>Article {i+1}</span>
                  <button onClick={()=>removeBlog(i)}style={{background:"none",border:"1px solid var(--br)",borderRadius:10,padding:"3px 10px",fontSize:11,color:"#C84B31",cursor:"pointer",fontFamily:"inherit",fontWeight:700}}>🗑 Supprimer</button>
                </div>
                <div style={{display:"flex",gap:6,marginBottom:6}}>
                  <input value={art.emoji||""}onChange={e=>setBlog(i,"emoji",e.target.value)}placeholder="🧮"style={{width:52,textAlign:"center",padding:"8px 6px",borderRadius:8,border:"1px solid var(--br)",fontSize:18,boxSizing:"border-box",fontFamily:"inherit"}}/>
                  <input value={art.cat||""}onChange={e=>setBlog(i,"cat",e.target.value)}placeholder="Catégorie"style={{flex:1,padding:"8px 10px",borderRadius:8,border:"1px solid var(--br)",fontSize:13,boxSizing:"border-box",fontFamily:"inherit",color:"var(--b)"}}/>
                  <input type="color"value={art.catColor||"#E49178"}onChange={e=>setBlog(i,"catColor",e.target.value)}title="Couleur de la catégorie"style={{width:42,height:38,padding:2,borderRadius:8,border:"1px solid var(--br)",cursor:"pointer",flexShrink:0}}/>
                </div>
                <input value={art.title||""}onChange={e=>setBlog(i,"title",e.target.value)}placeholder="Titre de l'article"style={{width:"100%",padding:"8px 10px",borderRadius:8,border:"1px solid var(--br)",fontSize:13,fontWeight:600,marginBottom:6,boxSizing:"border-box",fontFamily:"inherit",color:"var(--b)"}}/>
                <textarea value={art.excerpt||""}onChange={e=>setBlog(i,"excerpt",e.target.value)}placeholder="Extrait (résumé court)"rows={2}style={{width:"100%",padding:"8px 10px",borderRadius:8,border:"1px solid var(--br)",fontSize:13,boxSizing:"border-box",fontFamily:"inherit",color:"var(--b)",resize:"vertical",lineHeight:1.5}}/>
                <button onClick={()=>setOpenBlocks(openBlocks===i?null:i)}style={{marginTop:6,width:"100%",padding:"7px",borderRadius:10,border:"1px solid var(--br)",background:"var(--c)",color:"var(--b)",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}><IconeOuEmoji e="📝"/> Contenu de l'article ({(art.blocks||[]).length} bloc{(art.blocks||[]).length>1?"s":""}) {openBlocks===i?"▲":"▼"}</button>
                {openBlocks===i&&<div style={{marginTop:8,padding:10,background:"var(--c)",borderRadius:10}}>
                  {(art.blocks||[]).length===0&&<div style={{fontSize:11,color:"var(--m)",marginBottom:8,lineHeight:1.5}}>Aucun bloc : cet article affiche son contenu d'origine. Dès que vous ajoutez un bloc, le contenu par blocs remplace l'original.</div>}
                  {(art.blocks||[]).map((b,bi)=>(
                    <div key={bi}style={{background:"var(--w)",border:"1px solid var(--br)",borderRadius:8,padding:8,marginBottom:8}}>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
                        <span style={{fontSize:11,fontWeight:700,color:"var(--T)",textTransform:"uppercase",letterSpacing:".5px"}}>{b.type==="h3"?"Titre":b.type==="callout"?"Encadré":b.type==="list"?"Liste":"Paragraphe"}</span>
                        <div style={{display:"flex",gap:4}}>
                          <button onClick={()=>moveBlk(i,bi,-1)}title="Monter"style={{background:"none",border:"1px solid var(--br)",borderRadius:10,padding:"2px 7px",minWidth:36,cursor:"pointer",fontSize:11,fontFamily:"inherit"}}>↑</button>
                          <button onClick={()=>moveBlk(i,bi,1)}title="Descendre"style={{background:"none",border:"1px solid var(--br)",borderRadius:10,padding:"2px 7px",minWidth:36,cursor:"pointer",fontSize:11,fontFamily:"inherit"}}>↓</button>
                          <button onClick={()=>removeBlk(i,bi)}title="Supprimer"style={{background:"none",border:"1px solid var(--br)",borderRadius:10,padding:"2px 7px",cursor:"pointer",fontSize:11,color:"#C84B31",fontFamily:"inherit"}}>🗑</button>
                        </div>
                      </div>
                      {b.type==="h3"&&<div style={{display:"flex",gap:6}}>
                        <input value={b.text||""}onChange={e=>setBlk(i,bi,"text",e.target.value)}placeholder="Titre de section"style={{flex:1,padding:"7px 9px",borderRadius:7,border:"1px solid var(--br)",fontSize:13,fontWeight:600,boxSizing:"border-box",fontFamily:"inherit",color:"var(--b)"}}/>
                        <input type="color"value={b.color||"#2E4859"}onChange={e=>setBlk(i,bi,"color",e.target.value)}title="Couleur du titre"style={{width:38,height:34,padding:2,borderRadius:7,border:"1px solid var(--br)",cursor:"pointer",flexShrink:0}}/>
                      </div>}
                      {b.type==="p"&&<textarea value={b.text||""}onChange={e=>setBlk(i,bi,"text",e.target.value)}placeholder="Paragraphe — **gras**, *italique*"rows={3}style={{width:"100%",padding:"7px 9px",borderRadius:7,border:"1px solid var(--br)",fontSize:13,boxSizing:"border-box",fontFamily:"inherit",color:"var(--b)",resize:"vertical",lineHeight:1.5}}/>}
                      {b.type==="callout"&&<div>
                        <div style={{display:"flex",gap:6,marginBottom:6}}>
                          <input value={b.title||""}onChange={e=>setBlk(i,bi,"title",e.target.value)}placeholder="Titre de l'encadré"style={{flex:1,padding:"7px 9px",borderRadius:7,border:"1px solid var(--br)",fontSize:13,fontWeight:600,boxSizing:"border-box",fontFamily:"inherit",color:"var(--b)"}}/>
                          <input type="color"value={b.color||"#5DA9A1"}onChange={e=>setBlk(i,bi,"color",e.target.value)}title="Couleur de l'encadré"style={{width:38,height:34,padding:2,borderRadius:7,border:"1px solid var(--br)",cursor:"pointer",flexShrink:0}}/>
                        </div>
                        <textarea value={b.text||""}onChange={e=>setBlk(i,bi,"text",e.target.value)}placeholder="Texte de l'encadré"rows={2}style={{width:"100%",padding:"7px 9px",borderRadius:7,border:"1px solid var(--br)",fontSize:13,boxSizing:"border-box",fontFamily:"inherit",color:"var(--b)",resize:"vertical",lineHeight:1.5}}/>
                      </div>}
                      {b.type==="list"&&<div>
                        {(b.items||[]).map((it,ii)=>(
                          <div key={ii}style={{display:"flex",gap:6,marginBottom:5}}>
                            <input value={it}onChange={e=>setBlkItem(i,bi,ii,e.target.value)}placeholder="Point de liste"style={{flex:1,padding:"6px 9px",borderRadius:7,border:"1px solid var(--br)",fontSize:13,boxSizing:"border-box",fontFamily:"inherit",color:"var(--b)"}}/>
                            <button onClick={()=>removeBlkItem(i,bi,ii)}style={{background:"none",border:"1px solid var(--br)",borderRadius:10,padding:"0 9px",fontSize:12,color:"#C84B31",cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>🗑</button>
                          </div>
                        ))}
                        <button onClick={()=>addBlkItem(i,bi)}style={{fontSize:11,padding:"5px 10px",borderRadius:10,border:"1px dashed var(--br)",background:"var(--c)",color:"var(--b)",cursor:"pointer",fontFamily:"inherit",fontWeight:700}}>+ point</button>
                      </div>}
                    </div>
                  ))}
                  <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:4}}>
                    {[["h3","+ Titre"],["p","+ Paragraphe"],["callout","+ Encadré"],["list","+ Liste"]].map(([t,l])=>
                      <button key={t}onClick={()=>addBlk(i,t)}style={{flex:"1 1 45%",padding:"7px",borderRadius:10,border:"1.5px dashed var(--br)",background:"var(--w)",color:"var(--b)",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>{l}</button>
                    )}
                  </div>
                </div>}
              </div>
            ))}
            <button onClick={addBlog}style={{width:"100%",padding:"10px",borderRadius:10,border:"1.5px dashed var(--br)",background:"var(--c)",color:"var(--b)",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>+ Ajouter un article</button>
          </BOCard>
          <BOCard title="Stats du hero (bandeau)" icon="📊">
            {(cfg.statsHero||[]).map((s,i)=><div key={i}style={{display:"grid",gridTemplateColumns:"55px 40px 1fr",gap:4,marginBottom:4}}>
              <input className="inp"style={{fontSize:11,padding:"4px 6px"}}type="number"value={s.n}onChange={e=>setStat("statsHero",i,"n",e.target.value)}/>
              <input className="inp"style={{fontSize:11,padding:"4px 6px"}}value={s.suf}onChange={e=>setStat("statsHero",i,"suf",e.target.value)}/>
              <input className="inp"style={{fontSize:11,padding:"4px 6px"}}value={s.label}onChange={e=>setStat("statsHero",i,"label",e.target.value)}/>
            </div>)}
          </BOCard>
          <BOCard title="Pain points (section 1)" icon="🔥">
            {(cfg.painPoints||[]).map((p,i)=><div key={i}style={{marginBottom:10,paddingBottom:10,borderBottom:"1px solid var(--br)"}}>
              <div style={{display:"flex",gap:4,marginBottom:4}}>
                <input className="inp"style={{width:36,fontSize:11,padding:"4px",textAlign:"center"}}value={p.ic}onChange={e=>setPain(i,"ic",e.target.value)}/>
                <input className="inp"style={{flex:1,fontSize:11,padding:"4px 6px"}}value={p.titre}onChange={e=>setPain(i,"titre",e.target.value)}placeholder="Titre"/>
                <button onClick={()=>removePain(i)}style={{background:"#fee",border:"1px solid #fcc",borderRadius:10,cursor:"pointer",fontSize:11,padding:"4px 8px",color:"#c00"}}>✕</button>
              </div>
              <textarea className="inp"rows={2}style={{fontSize:11,padding:"5px 8px",resize:"vertical",width:"100%",boxSizing:"border-box"}}value={p.desc}onChange={e=>setPain(i,"desc",e.target.value)}/>
            </div>)}
            <button onClick={addPain}className="btn bG s"style={{padding:"6px 12px",width:"100%"}}>+ Ajouter un pain point</button>
          </BOCard>
          <BOCard title="Témoignages (section 5)" icon="⭐">
            {(cfg.testimonials||[]).map((t,i)=><div key={i}style={{marginBottom:10,paddingBottom:10,borderBottom:"1px solid var(--br)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                <div style={{fontSize:11,fontWeight:700,color:"var(--b)"}}>⭐ Témoignage {i+1}</div>
                <button onClick={()=>removeTesti(i)}style={{background:"#fee",border:"1px solid #fcc",borderRadius:10,cursor:"pointer",fontSize:11,padding:"3px 8px",color:"#c00"}}>✕</button>
              </div>
              {[["nom","Nom"],["ville","Ville"],["avant","Avant (citation)"],["apres","Après (témoignage)"]].map(([k,l])=>
                <div key={k}style={{marginBottom:5}}>
                  <div style={{fontSize:11,fontWeight:600,color:"var(--m)",marginBottom:2}}>{l}</div>
                  {k==="apres"?<textarea className="inp"rows={2}style={{fontSize:11,padding:"5px 8px",resize:"vertical",width:"100%",boxSizing:"border-box"}}value={t[k]||""}onChange={e=>setTesti(i,k,e.target.value)}/>
                    :<input className="inp"style={{fontSize:11,padding:"5px 8px",width:"100%",boxSizing:"border-box"}}value={t[k]||""}onChange={e=>setTesti(i,k,e.target.value)}/>}
                </div>
              )}
            </div>)}
            <button onClick={addTesti}className="btn bG s"style={{padding:"6px 12px",width:"100%"}}>+ Ajouter un témoignage</button>
          </BOCard>

          <BOCard title="Plan Gratuit - Fonctionnalités" icon="🆓">
            <div style={{fontSize:11,color:"var(--l)",marginBottom:10,lineHeight:1.5}}>Coche = inclus, décoche = barré (non inclus)</div>
            {(cfg.freeItems||[]).map((item,i)=><div key={i}style={{display:"flex",gap:4,marginBottom:5,alignItems:"center"}}>
              <input type="checkbox"checked={item[0]}onChange={e=>setFreeItem(i,0,e.target.checked)}style={{width:16,height:16,cursor:"pointer",flexShrink:0}}/>
              <input className="inp"style={{flex:1,fontSize:11,padding:"4px 6px"}}value={item[1]}onChange={e=>setFreeItem(i,1,e.target.value)}/>
              <button onClick={()=>removeFreeItem(i)}style={{background:"#fee",border:"1px solid #fcc",borderRadius:10,cursor:"pointer",fontSize:11,padding:"3px 7px",color:"#c00"}}>✕</button>
            </div>)}
            <button onClick={addFreeItem}className="btn bG s"style={{padding:"6px 12px",width:"100%",marginTop:6}}>+ Ajouter une ligne</button>
          </BOCard>

          <BOCard title="Plan Pro - Fonctionnalités" icon="⭐">
            <div style={{fontSize:11,color:"var(--l)",marginBottom:10,lineHeight:1.5}}>Emoji + texte sur une ligne. Les 3 premières sont en gras automatiquement.</div>
            {(cfg.proItems||[]).map((item,i)=><div key={i}style={{display:"flex",gap:4,marginBottom:5,alignItems:"center"}}>
              <input className="inp"style={{flex:1,fontSize:11,padding:"4px 6px"}}value={item}onChange={e=>setProItem(i,e.target.value)}placeholder="✨ Emoji + description"/>
              <button onClick={()=>removeProItem(i)}style={{background:"#fee",border:"1px solid #fcc",borderRadius:10,cursor:"pointer",fontSize:11,padding:"3px 7px",color:"#c00"}}>✕</button>
            </div>)}
            <button onClick={addProItem}className="btn bG s"style={{padding:"6px 12px",width:"100%",marginTop:6}}>+ Ajouter une ligne</button>
          </BOCard>

          <BOCard title="Garanties (sous tarifs)" icon="✅">
            <div style={{fontSize:11,color:"var(--l)",marginBottom:10,lineHeight:1.5}}>Les petits points de réassurance affichés sous les tarifs.</div>
            {(cfg.guarantees||DEFAULT_CONFIG.guarantees).map((item,i)=><div key={i}style={{display:"flex",gap:4,marginBottom:5,alignItems:"center"}}>
              <input className="inp"style={{flex:1,fontSize:11,padding:"4px 6px"}}value={item}onChange={e=>setGuarantee(i,e.target.value)}placeholder="✅ Texte garantie"/>
              <button onClick={()=>removeGuarantee(i)}style={{background:"#fee",border:"1px solid #fcc",borderRadius:10,cursor:"pointer",fontSize:11,padding:"3px 7px",color:"#c00"}}>✕</button>
            </div>)}
            <button onClick={addGuarantee}className="btn bG s"style={{padding:"6px 12px",width:"100%",marginTop:6}}>+ Ajouter une garantie</button>
          </BOCard>
        </>}

        {/* ====================== APP (modules + stats) ====================== */}
        {sec==="app"&&<>
          <BOCard title="Modules activables" icon="⚙️">
            {[
              {k:"parrainage",l:"Parrainage",ic:"🎁"},
              {k:"forum",l:"Forum communauté",ic:"💬"},
              {k:"pmi",l:"Communication PMI",ic:"🏛️"},
              {k:"periscolaire",l:"Planning périscolaire",ic:"🚌"},
              {k:"rappelsVaccins",l:"Rappels vaccins",ic:"💉"},
            ].map(({k,l,ic})=><div key={k}style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid var(--br)"}}>
              <span style={{fontSize:12,fontWeight:600,color:"var(--b)"}}><IconeOuEmoji e={ic}/> {l}</span>
              <div onClick={()=>setFeat(k,!cfg.feats[k])}style={{width:40,height:22,borderRadius:11,cursor:"pointer",background:cfg.feats[k]?"var(--G)":"var(--br)",position:"relative",transition:"background .2s"}}>
                <div style={{width:16,height:16,borderRadius:8,background:"#fff",position:"absolute",top:3,left:cfg.feats[k]?21:3,transition:"left .2s",boxShadow:"0 1px 3px rgba(0,0,0,.2)"}}/>
              </div>
            </div>)}
          </BOCard>
          <BOCard title="Statistiques" icon="📊">
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,textAlign:"center"}}>
              {[{v:stats.users,l:"Inscrits",c:"var(--T)"},{v:stats.pro,l:"Pro",c:"var(--S)"},{v:stats.enfants,l:"Enfants",c:"var(--G)"}].map(s=>
                <div key={s.l}style={{padding:10,background:"var(--c)",borderRadius:8}}>
                  <div style={{fontSize:22,fontWeight:700,color:s.c}}>{s.v}</div>
                  <div style={{fontSize:11,color:"var(--l)"}}>{s.l}</div>
                </div>
              )}
            </div>
          </BOCard>
          <BOCard title="Informations légales" icon="📋">
            <div style={{fontSize:11,color:"var(--l)",marginBottom:10}}>Ces informations apparaissent dans les mentions légales, CGU et politique de confidentialité.</div>
            <BOField label="Nom complet"><BOTextInput k="nom" state={cfg.legal||{}} setter={(k,v)=>setCfg(c=>({...c,legal:{...(c.legal||{}),[k]:v}}))}/></BOField>
            <BOField label="SIRET"><BOTextInput k="siret" state={cfg.legal||{}} setter={(k,v)=>setCfg(c=>({...c,legal:{...(c.legal||{}),[k]:v}}))}/></BOField>
            <BOField label="Adresse"><BOTextInput k="adresse" state={cfg.legal||{}} setter={(k,v)=>setCfg(c=>({...c,legal:{...(c.legal||{}),[k]:v}}))}/></BOField>
            <BOField label="Email de contact"><BOTextInput k="email" state={cfg.legal||{}} setter={(k,v)=>setCfg(c=>({...c,legal:{...(c.legal||{}),[k]:v}}))}/></BOField>
          </BOCard>
          <BOCard title="Boutique — Liens de paiement Stripe" icon="🛒">
            <div style={{fontSize:11,color:"var(--l)",marginBottom:10}}>Collez ici vos liens Stripe. Dashboard Stripe → Produits → Liens de paiement.</div>
            <BOField label="Kit de gestion"><BOTextInput k="linkSheets" state={cfg.boutique||{}} setter={(k,v)=>setCfg(c=>({...c,boutique:{...(c.boutique||{}),[k]:v}}))} placeholder="https://buy.stripe.com/..."/></BOField>
            <BOField label="Fiche d'urgence"><BOTextInput k="linkFiche" state={cfg.boutique||{}} setter={(k,v)=>setCfg(c=>({...c,boutique:{...(c.boutique||{}),[k]:v}}))} placeholder="https://buy.stripe.com/..."/></BOField>
            <BOField label="Projet d'accueil"><BOTextInput k="linkProjet" state={cfg.boutique||{}} setter={(k,v)=>setCfg(c=>({...c,boutique:{...(c.boutique||{}),[k]:v}}))} placeholder="https://buy.stripe.com/..."/></BOField>
            <BOField label="Registre des medicaments"><BOTextInput k="linkRegistre" state={cfg.boutique||{}} setter={(k,v)=>setCfg(c=>({...c,boutique:{...(c.boutique||{}),[k]:v}}))} placeholder="https://buy.stripe.com/..."/></BOField>
            <BOField label="Pack Complet"><BOTextInput k="linkPack" state={cfg.boutique||{}} setter={(k,v)=>setCfg(c=>({...c,boutique:{...(c.boutique||{}),[k]:v}}))} placeholder="https://buy.stripe.com/..."/></BOField>
          </BOCard>
          <BOCard title="Table Supabase" icon="🗄️">
            <div style={{fontSize:11,color:"var(--m)",marginBottom:8,lineHeight:1.5}}>À exécuter dans Supabase SQL Editor :</div>
            <div style={{fontSize:11,background:"#1a1a1a",color:"#0f0",padding:10,borderRadius:8,fontFamily:"monospace",lineHeight:1.5}}>
              CREATE TABLE app_config (<br/>
              &nbsp;&nbsp;id TEXT PRIMARY KEY,<br/>
              &nbsp;&nbsp;config JSONB,<br/>
              &nbsp;&nbsp;updated_at TIMESTAMPTZ<br/>
              );<br/>
              ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;<br/>
              CREATE POLICY \"admin_all\" ON app_config USING (true);
            </div>
          </BOCard>
        </>}

        {/* ====================== SECTIONS VISIBLES (P32 Palier 1 : afficher/masquer) ====================== */}
        {sec==="sectionsvis"&&<>
          <BOCard title="Gestionnaire de sections" icon="🧩">
            <div style={{fontSize:12,color:"var(--m)",marginBottom:14,lineHeight:1.6}}>Réorganise ta page d'accueil avec les flèches, et affiche ou masque chaque section. Le contenu n'est jamais supprimé — tu peux réafficher à tout moment. Le Hero et le Footer restent toujours aux extrémités.</div>
            {(()=>{
              const META={probleme:{l:"La réalité du métier"},signature:{l:"Pourquoi TiMat"},demo:{l:"L'application en images"},temoignages:{l:"Témoignages",strict:true},confidentialite:{l:"Confidentialité & photos"},tarifs:{l:"Tarifs"},ctaFinal:{l:"Appel à l'action final"},faq:{l:"Questions fréquentes"},blog:{l:"Ressources / Blog",strict:true}};
              const order=(cfg.sectionsOrder&&cfg.sectionsOrder.length)?cfg.sectionsOrder:DEFAULT_CONFIG.sectionsOrder;
              const SVm=cfg.sectionsVisibles||{};
              return order.map((id,i)=>{
                const meta=META[id]||{l:id};
                const on=meta.strict?(SVm[id]===true):(SVm[id]!==false);
                return <div key={id} style={{display:"flex",alignItems:"center",gap:8,padding:"9px 10px",marginBottom:7,background:on?"var(--w)":"var(--c)",border:"1px solid var(--br)",borderRadius:10}}>
                  <span style={{fontSize:11,fontWeight:700,color:"var(--l)",width:14,textAlign:"center",flexShrink:0}}>{i+1}</span>
                  <div style={{display:"flex",flexDirection:"column",gap:3,flexShrink:0}}>
                    <button onClick={()=>moveSectionAt(i,i-1)}disabled={i===0}title="Monter"style={{width:38,height:38,border:"1px solid var(--br)",background:"var(--w)",borderRadius:10,fontSize:11,fontWeight:800,color:"var(--m)",cursor:i===0?"not-allowed":"pointer",opacity:i===0?.3:1,fontFamily:"inherit",padding:0,lineHeight:1}}>↑</button>
                    <button onClick={()=>moveSectionAt(i,i+1)}disabled={i===order.length-1}title="Descendre"style={{width:38,height:38,border:"1px solid var(--br)",background:"var(--w)",borderRadius:10,fontSize:11,fontWeight:800,color:"var(--m)",cursor:i===order.length-1?"not-allowed":"pointer",opacity:i===order.length-1?.3:1,fontFamily:"inherit",padding:0,lineHeight:1}}>↓</button>
                  </div>
                  <span style={{flex:1,minWidth:0,fontSize:13,fontWeight:600,color:on?"var(--b)":"var(--l)"}}>{meta.l}{!on&&<span style={{fontSize:11,fontWeight:700,color:"var(--l)",marginLeft:7}}>· masquée</span>}</span>
                  <div onClick={()=>setSV(id,!on)}title={on?"Masquer":"Afficher"}style={{width:40,height:22,borderRadius:11,cursor:"pointer",background:on?"var(--G)":"var(--br)",position:"relative",transition:"background .2s",flexShrink:0}}>
                    <div style={{width:16,height:16,borderRadius:8,background:"#fff",position:"absolute",top:3,left:on?21:3,transition:"left .2s",boxShadow:"0 1px 3px rgba(0,0,0,.2)"}}/>
                  </div>
                </div>;
              });
            })()}
            <button onClick={()=>setSec("sections")}style={{width:"100%",marginTop:6,padding:"11px",borderRadius:10,border:"1px dashed var(--Tl)",background:"var(--accent-pale)",color:"#B85C38",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}><IconeOuEmoji e="✏️"/> Renommer / modifier le contenu d'une section</button>
          </BOCard>
          <BOCard title="Vagues entre sections" icon="🌊">
            <div style={{fontSize:12,color:"var(--m)",marginBottom:12,lineHeight:1.6}}>Ajoute une transition en vague en haut de chaque section. Désactive si tu préfères des séparations nettes.</div>
            {(()=>{const on=(cfg.landing||{}).wavesOn!==false;return <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,padding:"6px 0 14px"}}>
              <div style={{fontWeight:700,fontSize:13,color:"var(--b)"}}>Activer les vagues</div>
              <div onClick={()=>setLand("wavesOn",!on)}style={{width:40,height:22,borderRadius:11,cursor:"pointer",background:on?"var(--G)":"var(--br)",position:"relative",transition:"background .2s",flexShrink:0}}>
                <div style={{width:16,height:16,borderRadius:8,background:"#fff",position:"absolute",top:3,left:on?21:3,transition:"left .2s",boxShadow:"0 1px 3px rgba(0,0,0,.2)"}}/>
              </div>
            </div>;})()}
            {[["waveOn1","Problème / tableau"],["waveOn2","Démo"],["waveOn4","Pourquoi TiMat"],["waveOn3","Transformation"],["waveOnConf","Confidentialité"],["waveOn6","Tarifs"],["waveOnFaq","FAQ"],["waveOnFooter","Footer"]].map(([k,lbl])=>{
              const v=(cfg.landing||{})[k]!==false;
              return <div key={k} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,padding:"7px 0"}}>
                <div style={{fontSize:12.5,color:"var(--m)"}}>{lbl}</div>
                <div onClick={()=>setLand(k,!v)} style={{width:36,height:20,borderRadius:10,cursor:"pointer",background:v?"var(--G)":"var(--br)",position:"relative",transition:"background .2s",flexShrink:0}}>
                  <div style={{width:14,height:14,borderRadius:7,background:"#fff",position:"absolute",top:3,left:v?19:3,transition:"left .2s",boxShadow:"0 1px 3px rgba(0,0,0,.2)"}}/>
                </div>
              </div>;
            })}
            <div style={{fontSize:11,color:"var(--m)",margin:"10px 0 6px",fontWeight:700}}>Couleur des vagues</div>
            {[["wave1","Vague — La réalité du métier"],["wave2","Vague — L'application en images"],["wave4","Vague — Pourquoi TiMat"],["wave3","Vague — Ce que ça change"],["wave6","Vague — Tarifs"]].filter(([,l])=>matches(l)).map(([k,l])=>
              <BOField key={k} label={l}><BOColorInput k={k} state={cfg.landing} setter={setLand}/></BOField>
            )}
          </BOCard>
          {/* Carte "Ordre des sections" retiree : ordre + visibilite fusionnes dans le Gestionnaire de sections ci-dessus */}
        </>}

        {/* ====================== HISTORIQUE (P30D : backups + restauration) ====================== */}
        {sec==="historique"&&<>
          <BOCard title="Historique des configurations" icon="🕐">
            <div style={{fontSize:11,color:"var(--m)",marginBottom:12,lineHeight:1.5}}>
              Les 20 dernières sauvegardes automatiques de votre configuration. Cliquez sur <b>Restaurer</b> pour revenir à une version antérieure (la config actuelle sera automatiquement sauvegardée avant).
            </div>
            <button onClick={loadBackups} disabled={loadingBackups} style={{padding:"6px 14px",fontSize:11,fontWeight:600,borderRadius:10,border:"1px solid var(--br)",background:"var(--w)",color:"var(--b)",cursor:loadingBackups?"wait":"pointer",marginBottom:12,fontFamily:"inherit"}}>
              {loadingBackups?"⏳ Chargement…":"↻ Rafraîchir"}
            </button>
            {!loadingBackups&&backupList.length===0&&
              <div style={{textAlign:"center",padding:30,color:"var(--m)",fontSize:12,background:"var(--c)",borderRadius:8}}>Aucune sauvegarde pour l'instant.</div>
            }
            {backupList.map(b=>{
              const reasonInfo={
                before_save:  {ic:"💾",l:"Avant sauvegarde",col:"#1E40AF",bg:"#DBEAFE"},
                before_reset: {ic:"⚠️",l:"Avant réinitialisation",col:"#92400E",bg:"#FEF3C7"},
                manual:       {ic:"🛡️",l:"Filet de sécurité (avant restauration)",col:"#065F46",bg:"#D1FAE5"},
              }[b.reason]||{ic:"📦",l:b.reason,col:"var(--m)",bg:"var(--c)"};
              const dt=new Date(b.created_at);
              const dateStr=dt.toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
              const sizeKo=b.config?Math.round(JSON.stringify(b.config).length/1024):"?";
              return <div key={b.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,padding:"12px 14px",border:"1px solid var(--br)",borderRadius:10,marginBottom:8,background:"var(--w)"}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4,flexWrap:"wrap"}}>
                    <span style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:6,background:reasonInfo.bg,color:reasonInfo.col}}><IconeOuEmoji e={reasonInfo.ic}/> {reasonInfo.l}</span>
                    <span style={{fontSize:11,color:"var(--l)"}}>{sizeKo} ko</span>
                  </div>
                  <div style={{fontSize:13,fontWeight:600,color:"var(--b)"}}>{dateStr}</div>
                </div>
                <div style={{display:"flex",gap:6,flexShrink:0}}>
                  <button
                    onClick={()=>setShowJsonModal(b)}
                    title="Voir le contenu JSON de cette sauvegarde"
                    style={{padding:"7px 12px",fontSize:11,fontWeight:700,borderRadius:8,border:"1px solid var(--br)",background:"var(--w)",color:"var(--b)",cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"}}
                  >👁 Voir</button>
                  <button
                    onClick={()=>setShowRestoreModal(b)}
                    disabled={restoringId!==null}
                    style={{padding:"7px 14px",fontSize:11,fontWeight:700,borderRadius:8,border:"none",background:restoringId===b.id?"var(--br)":"var(--T)",color:"#fff",cursor:restoringId!==null?"not-allowed":"pointer",fontFamily:"inherit",whiteSpace:"nowrap"}}
                  >{restoringId===b.id?"⏳ …":"↺ Restaurer"}</button>
                </div>
              </div>;
            })}
          </BOCard>
        </>}

      </div>}

      {/* RIGHT PANEL: Live Preview (web / mobile) */}
      {((isWide&&showPreview)||(!isWide&&mView==="apercu"))&&<div style={{flex:isWide?1:"none",width:isWide?"auto":"100%",height:isWide?"auto":"calc(100vh - 200px)",minHeight:isWide?0:420,overflow:"hidden",background:"#f0f0f0",position:"relative"}}>
        <IframePreview cfg={cfg} noBezel={!isWide}/>
      </div>}
    </div>
  </div>;
}

// P19 + P24: helper logo selon le role et mode dark

function diffConfig(cur, def){
  const out = {};
  if(!cur) return out;
  for (const k of Object.keys(cur)) {
    const cv = cur[k], dv = def ? def[k] : undefined;
    if (dv === undefined) { out[k] = cv; continue; }
    if (cv && dv && typeof cv==='object' && !Array.isArray(cv) && typeof dv==='object' && !Array.isArray(dv)) {
      const sub = diffConfig(cv, dv);
      if (Object.keys(sub).length) out[k] = sub;
    } else if (JSON.stringify(cv) !== JSON.stringify(dv)) {
      out[k] = cv;
    }
  }
  return out;
}

const saveConfig = async (backupReason='before_save') => {
  const G_save = diffConfig(G, DEFAULT_CONFIG);
  const configStr = JSON.stringify(G_save);
  // P30B : backup de sécurité best-effort avant écrasement (ne bloque jamais)
  const backupRes = await backupCurrentConfig(backupReason);
  // Try JSONB first (object), then TEXT fallback (string)
  try {
    const {error: errObj} = await supabase.from('app_config').upsert({
      id:'main',
      config: G_save,
      updated_at: new Date().toISOString()
    });
    if (!errObj) {
      console.log('[TiMat config] Sauvegardé en JSONB ('+configStr.length+' octets)');
      return {ok:true, backupOk:backupRes.ok, backupError:backupRes.error};
    }
    console.warn('[TiMat config] JSONB a échoué, tentative TEXT:', errObj.message);
    // Fallback: string
    const {error: errStr} = await supabase.from('app_config').upsert({
      id:'main',
      config: configStr,
      updated_at: new Date().toISOString()
    });
    if (!errStr) {
      console.log('[TiMat config] Sauvegardé en TEXT ('+configStr.length+' octets)');
      return {ok:true, backupOk:backupRes.ok, backupError:backupRes.error};
    }
    console.error('[TiMat config] Les deux formats ont échoué. JSONB:', errObj.message, 'TEXT:', errStr.message);
    return {ok:false, error: errObj.message + ' | ' + errStr.message};
  } catch(e) {
    console.error('[TiMat config] Exception sauvegarde:', e);
    return {ok:false, error: e.message || 'Exception inconnue'};
  }
};

function SearchConsoleSetup(){
  const step={display:"flex",gap:10,marginBottom:12};
  const numc={width:22,height:22,borderRadius:11,background:"#E49178",color:"#fff",fontSize:12,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0};
  const txt={fontSize:12.5,color:"#2E4A5A",lineHeight:1.55};
  return <div>
    <div style={{background:"#FDF6F4",border:"1px solid #F3CEC2",borderRadius:12,padding:"16px 16px 5px",marginBottom:14}}>
      <div style={{fontWeight:800,fontSize:14,color:"#B85C38",marginBottom:12}}><IconeOuEmoji e="⚙️"/> Configuration en une fois (~10 min)</div>
      <div style={step}><span style={numc}>1</span><span style={txt}>Sur <b>console.cloud.google.com</b>, crée un projet, puis active l'<b>API Google Search Console</b>.</span></div>
      <div style={step}><span style={numc}>2</span><span style={txt}>Crée un <b>compte de service</b>, puis génère et télécharge sa <b>clé JSON</b>.</span></div>
      <div style={step}><span style={numc}>3</span><span style={txt}>Dans <b>Search Console → Paramètres → Utilisateurs et autorisations</b>, ajoute l'<b>e-mail du compte de service</b> (il finit par <code>.iam.gserviceaccount.com</code>) en lecture.</span></div>
      <div style={step}><span style={numc}>4</span><span style={txt}>Dans <b>Vercel → Settings → Environment Variables</b>, ajoute :<br/>• <code>GSC_SERVICE_ACCOUNT</code> = tout le contenu du fichier JSON<br/>• <code>GSC_SITE_URL</code> = <code>sc-domain:timat.app</code></span></div>
      <div style={step}><span style={numc}>5</span><span style={txt}>Redéploie (un simple push, ou « Redeploy » dans Vercel), puis recharge cette page.</span></div>
    </div>
    <div style={{fontSize:12,color:"#6B4F5A",lineHeight:1.5}}>Une fois fait, tes mots-clés, positions et clics s'afficheront ici automatiquement. Ces données sont <b>gratuites et officielles</b> (fournies par Google).</div>
  </div>;
}

function SearchConsole(){
  const [loading,setLoading]=useState(true);
  const [data,setData]=useState(null);
  const [err,setErr]=useState("");
  const [tab,setTab]=useState("queries");
  const load=async()=>{
    setLoading(true); setErr("");
    try{
      const r=await boFetch("/api/backoffice?action=search-console");
      const j=await r.json().catch(()=>null);
      if(!j) throw new Error("Réponse invalide (HTTP "+r.status+")");
      if(j.error) throw new Error(j.error);
      setData(j);
    }catch(e){ setErr(e.message||"Erreur"); setData(null); }
    setLoading(false);
  };
  useEffect(()=>{ load(); },[]);
  const cardS={background:"#fff",border:"1px solid #EAE0E8",borderRadius:12,padding:"14px 12px",textAlign:"center"};
  const numS={fontSize:22,fontWeight:900,color:"#2E4A5A"};
  const lblS={fontSize:11.5,color:"#6B4F5A",fontWeight:600,marginTop:4};
  const pct=(v)=>Math.round((v||0)*1000)/10+" %";
  const pos=(v)=>Math.round((v||0)*10)/10;
  const num=(v)=>Math.round(v||0).toLocaleString("fr-FR");
  const short=(u)=>{try{const x=new URL(u);return x.pathname==="/"?"/ (accueil)":x.pathname;}catch(e){return u;}};
  return <div>
    <div style={{fontSize:22,fontWeight:800,color:"#2E4A5A",marginBottom:4}}>Search Console</div>
    <div style={{fontSize:13.5,color:"#6B4F5A",marginBottom:16,lineHeight:1.5}}>Tes vraies données Google : les mots-clés qui t'amènent du trafic, tes positions moyennes, clics et impressions (28 derniers jours).</div>
    {loading&&<div style={{color:"#6B4F5A",fontSize:13,padding:"20px 0"}}>⏳ Chargement des données Search Console…</div>}
    {!loading&&err&&<div style={{background:"#FBF1EF",border:"1px solid #F3D3CC",color:"#C84B31",borderRadius:10,padding:"12px 14px",fontSize:13,marginBottom:14,lineHeight:1.5}}>{err}<br/><span style={{fontSize:12,color:"#6B4F5A"}}>Vérifie que le compte de service est bien ajouté dans Search Console et que les variables Vercel sont correctes.</span></div>}
    {!loading&&data&&data.configured===false&&<SearchConsoleSetup/>}
    {!loading&&data&&data.configured&&<>
      <button onClick={load} style={{background:"none",border:"1px solid #EAE0E8",borderRadius:10,padding:"7px 14px",fontSize:12,fontWeight:700,color:"#6B4F5A",cursor:"pointer",fontFamily:"inherit",marginBottom:14}}>↻ Rafraîchir</button>
      <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:10,marginBottom:16}}>
        <div style={cardS}><div style={numS}>{num(data.totals.clicks)}</div><div style={lblS}>Clics</div></div>
        <div style={cardS}><div style={numS}>{num(data.totals.impressions)}</div><div style={lblS}>Impressions</div></div>
        <div style={cardS}><div style={numS}>{pct(data.totals.ctr)}</div><div style={lblS}>CTR moyen</div></div>
        <div style={cardS}><div style={numS}>{pos(data.totals.position)}</div><div style={lblS}>Position moyenne</div></div>
      </div>
      <div style={{display:"flex",gap:6,marginBottom:12}}>
        {[["queries","🔑 Mots-clés"],["pages","📄 Pages"]].map(([k,l])=><button key={k} onClick={()=>setTab(k)} style={{flex:1,padding:"9px",borderRadius:10,border:"none",cursor:"pointer",fontFamily:"inherit",fontWeight:700,fontSize:13,background:tab===k?"#E49178":"rgba(0,0,0,.05)",color:tab===k?"#fff":"#6B4F5A"}}>{l}</button>)}
      </div>
      {(tab==="queries"?data.queries:data.pages).length===0&&<div style={{textAlign:"center",padding:24,color:"#6B4F5A",fontSize:13,background:"#fff",border:"1px solid #EAE0E8",borderRadius:12}}>Pas encore de données sur cette période. Reviens dans quelques jours, le temps que Google indexe plus de pages.</div>}
      {(tab==="queries"?data.queries:data.pages).map((row,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:10,background:"#fff",border:"1px solid #EAE0E8",borderRadius:11,padding:"11px 13px",marginBottom:7}}>
        <span style={{width:18,fontSize:11,fontWeight:700,color:"#A8909A",flexShrink:0}}>{i+1}</span>
        <span style={{flex:1,minWidth:0,fontSize:13,fontWeight:600,color:"#2E4A5A",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{tab==="queries"?row.q:short(row.p)}</span>
        <span style={{textAlign:"right",flexShrink:0}}>
          <span style={{display:"block",fontSize:13,fontWeight:800,color:"#B85C38"}}>#{pos(row.position)}</span>
          <span style={{display:"block",fontSize:11.5,color:"#6B4F5A"}}>{num(row.clicks)} clics · {num(row.impressions)} vues</span>
        </span>
      </div>)}
      <div style={{fontSize:11.5,color:"#A8909A",marginTop:10,lineHeight:1.5}}>Période : {data.start} au {data.end}. Source : Google Search Console ({data.siteUrl}).</div>
    </>}
  </div>;
}

// Appels aux endpoints du backoffice : on joint le jeton de session Supabase
// pour que le serveur puisse verifier que l appelant est bien l administrateur.
async function boFetch(url){
  let t="";
  try{ const{data}=await supabase.auth.getSession(); t=data?.session?.access_token||""; }catch(e){}
  return fetch(url,{headers:t?{Authorization:"Bearer "+t}:{}});
}

function SeoAudit(){
  const [loading,setLoading]=useState(false);
  const [data,setData]=useState(null);
  const [err,setErr]=useState("");
  const [open,setOpen]=useState({});
  const [history,setHistory]=useState(null);
  useEffect(()=>{
    let alive=true;
    (async()=>{
      try{
        const r=await boFetch("/api/backoffice?action=seo-audit-history");
        const j=await r.json();
        if(alive)setHistory(j);
      }catch(e){ if(alive)setHistory({ok:false,error:"Impossible de charger l'historique."}); }
    })();
    return ()=>{alive=false;};
  },[data]);
  const run=async()=>{
    setLoading(true); setErr(""); setData(null);
    try{
      const r=await boFetch("/api/backoffice?action=seo-audit");
      const j=await r.json().catch(()=>null);
      if(!r.ok||!j||j.error) throw new Error((j&&j.error)||("HTTP "+r.status));
      setData(j);
    }catch(e){ setErr("L'audit a echoue : "+(e.message||"")+". Verifie que api/backoffice.js est bien deploye."); }
    setLoading(false);
  };
  const mk={ok:"✅",warn:"⚠️",fail:"❌"};
  const short=(u)=>{try{const x=new URL(u);return x.pathname==="/"?"/ (accueil)":x.pathname;}catch(e){return u;}};
  const pageState=(p)=>{ if(p.status>=400||p.error)return"fail"; if(p.checks.some(c=>c.state==="fail"))return"fail"; if(p.checks.some(c=>c.state==="warn"))return"warn"; return"ok"; };
  return <div>
    <div style={{fontSize:22,fontWeight:800,color:"#2E4A5A",marginBottom:4}}>Santé SEO</div>
    <div style={{fontSize:13.5,color:"#6B4F5A",marginBottom:16,lineHeight:1.5}}>Audit de tes propres pages : titres, meta description, H1/H2, Open Graph, liens morts et contenu lisible par les robots. Relançable à tout moment.</div>
    <button onClick={run} disabled={loading} style={{background:"#E49178",color:"#fff",border:"none",borderRadius:10,padding:"12px 20px",fontSize:13,fontWeight:700,cursor:loading?"wait":"pointer",fontFamily:"inherit",marginBottom:16}}>{loading?"⏳ Analyse en cours…":(data?"↻ Relancer l'audit":"🔍 Lancer l'audit")}</button>
    {err&&<div style={{background:"#FBF1EF",border:"1px solid #F3D3CC",color:"#C84B31",borderRadius:10,padding:"12px 14px",fontSize:13,marginBottom:14,lineHeight:1.5}}>{err}</div>}
    {history&&history.ok&&history.history.length>0&&<div className="bo-card" style={{marginBottom:16}}>
      <h3>Historique des audits</h3>
      <div style={{display:"flex",flexDirection:"column",gap:2,marginTop:8}}>
        {history.history.map((h,i)=>{
          const prev=history.history[i+1];
          const dDead=prev?h.dead-prev.dead:null;
          const dWarn=prev?h.with_warn-prev.with_warn:null;
          return <div key={h.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",fontSize:12.5,padding:"7px 0",borderBottom:i<history.history.length-1?"1px solid #F2ECF0":"none"}}>
            <span style={{color:"#6B4F5A"}}>{new Date(h.created_at).toLocaleDateString("fr-FR",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})}</span>
            <span style={{display:"flex",gap:12}}>
              <span style={{color:h.dead>0?"#C84B31":"#1F8A5B",fontWeight:700}}>{h.dead} mort{h.dead>1?"s":""}{dDead?(dDead>0?" ▲":" ▼"):""}</span>
              <span style={{color:h.with_warn>0?"#92600E":"#1F8A5B",fontWeight:700}}>{h.with_warn} alerte{h.with_warn>1?"s":""}{dWarn?(dWarn>0?" ▲":" ▼"):""}</span>
            </span>
          </div>;
        })}
      </div>
    </div>}
    {history&&!history.ok&&<div style={{fontSize:12,color:"#A8909A",marginBottom:14}}>Historique indisponible : {history.error}</div>}
    {data&&<>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:16}}>
        <div style={{background:"#fff",border:"1px solid #EAE0E8",borderRadius:12,padding:"14px 8px",textAlign:"center"}}><div style={{fontSize:24,fontWeight:900,color:"#2E4A5A"}}>{data.total}</div><div style={{fontSize:11,color:"#6B4F5A",fontWeight:600,marginTop:4}}>Pages analysées</div></div>
        <div style={{background:"#fff",border:"1px solid #EAE0E8",borderRadius:12,padding:"14px 8px",textAlign:"center"}}><div style={{fontSize:24,fontWeight:900,color:data.withWarn>0?"#92600E":"#1F8A5B"}}>{data.withWarn}</div><div style={{fontSize:11,color:"#6B4F5A",fontWeight:600,marginTop:4}}>Avec alertes</div></div>
        <div style={{background:"#fff",border:"1px solid #EAE0E8",borderRadius:12,padding:"14px 8px",textAlign:"center"}}><div style={{fontSize:24,fontWeight:900,color:data.dead>0?"#C84B31":"#1F8A5B"}}>{data.dead}</div><div style={{fontSize:11,color:"#6B4F5A",fontWeight:600,marginTop:4}}>Liens morts</div></div>
      </div>
      {data.results.map((p,i)=>{const st=pageState(p);const isOpen=open[i];return <div key={i} style={{background:"#fff",border:"1px solid #EAE0E8",borderRadius:12,marginBottom:8,overflow:"hidden"}}>
        <div onClick={()=>setOpen(o=>({...o,[i]:!o[i]}))} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",cursor:"pointer"}}>
          <span style={{fontSize:16}}>{mk[st]}</span>
          <span style={{flex:1,minWidth:0,fontSize:13,fontWeight:700,color:"#2E4A5A",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{short(p.url)}</span>
          {p.status>0&&<span style={{fontSize:11,fontWeight:700,padding:"2px 7px",borderRadius:20,background:p.status>=400?"#FBF1EF":"#EAF7F1",color:p.status>=400?"#C84B31":"#1F8A5B"}}>{p.status}</span>}
          <span style={{fontSize:12,color:"#A8909A"}}>{isOpen?"▲":"▼"}</span>
        </div>
        {isOpen&&<div style={{padding:"0 14px 12px"}}>
          {p.error&&<div style={{fontSize:12.5,color:"#C84B31",padding:"8px 0",fontWeight:600}}>{p.error}</div>}
          {p.checks.map((c,j)=><div key={j} style={{display:"flex",gap:9,padding:"8px 0",borderTop:"1px solid #F2ECF0"}}>
            <span style={{fontSize:14,flexShrink:0}}>{mk[c.state]}</span>
            <div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:600,color:"#2E4A5A"}}>{c.label}</div><div style={{fontSize:12,color:"#6B4F5A",marginTop:1,lineHeight:1.4}}>{c.detail}</div></div>
          </div>)}
        </div>}
      </div>;})}
      <div style={{fontSize:11.5,color:"#A8909A",marginTop:10,lineHeight:1.5}}>Analyse du {new Date(data.generatedAt).toLocaleString("fr-FR")}. L'audit vérifie tes propres pages (celles du sitemap). Pour les positions Google et mots-clés, on branchera Search Console ensuite.</div>
    </>}
  </div>;
}

function SitePages(){
  const [urls,setUrls]=useState(null);
  const [err,setErr]=useState("");
  const [status,setStatus]=useState({});
  const [checking,setChecking]=useState(false);
  const [orphans,setOrphans]=useState(null);
  useEffect(()=>{
    let alive=true;
    (async()=>{
      try{
        const r=await fetch("/sitemap.xml");
        const xml=await r.text();
        const list=(xml.match(/<loc>([^<]+)<\/loc>/g)||[]).map(m=>m.replace(/<\/?loc>/g,"").trim());
        if(alive)setUrls(list);
      }catch(e){ if(alive){setErr("Impossible de lire le sitemap.xml.");setUrls([]);} }
    })();
    return ()=>{alive=false;};
  },[]);
  useEffect(()=>{
    let alive=true;
    (async()=>{
      try{
        const r=await boFetch("/api/backoffice?action=orphan-pages");
        const j=await r.json();
        if(alive)setOrphans(j);
      }catch(e){ if(alive)setOrphans({ok:false,error:"Impossible de contacter /api/orphan-pages."}); }
    })();
    return ()=>{alive=false;};
  },[]);
  const check=async()=>{
    if(!urls||!urls.length) return;
    setChecking(true);
    const res={};
    await Promise.all(urls.map(async(u)=>{ try{const r=await fetch(u,{method:"HEAD"});res[u]=r.status;}catch(e){res[u]=0;} }));
    setStatus(res); setChecking(false);
  };
  const short=(u)=>{try{const x=new URL(u);return x.pathname==="/"?"/ (accueil)":x.pathname;}catch(e){return u;}};
  return <div>
    <div style={{fontSize:22,fontWeight:800,color:"#2E4A5A",marginBottom:4}}>Pages &amp; articles</div>
    <div style={{fontSize:13.5,color:"#6B4F5A",marginBottom:16,lineHeight:1.5}}>Toutes les pages référencées dans ton sitemap. Ouvre-les, ou vérifie qu'elles répondent bien (pas de 404).</div>
    {orphans&&orphans.ok&&orphans.orphans&&orphans.orphans.length>0&&<div className="bo-card">
      <h3>Pages orphelines<span style={{marginLeft:8,fontSize:11,fontWeight:800,color:"#B85C38",background:"#FDF6F4",border:"1px solid #F3CEC2",borderRadius:20,padding:"2px 8px",verticalAlign:"middle"}}>{orphans.orphans.length} trouvée{orphans.orphans.length>1?"s":""}</span></h3>
      <p>Fichiers présents dans public/ mais absents du sitemap.xml — invisibles pour Google.</p>
      <div style={{marginTop:10}}>
        {orphans.orphans.map((o,i)=><div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,background:"#FDFBF8",borderRadius:8,padding:"10px 12px",marginBottom:8}}>
          <div style={{minWidth:0}}>
            <div style={{fontSize:13.5,fontWeight:600,color:"#2E4A5A",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{o.name}</div>
            <div style={{fontSize:12,color:"#8FA6B4"}}>{o.path}</div>
          </div>
          <a href={"/"+o.name} target="_blank" rel="noreferrer" style={{fontSize:12.5,color:"#B85C38",fontWeight:700,textDecoration:"none",flexShrink:0}}>Voir →</a>
        </div>)}
      </div>
      <div style={{marginTop:6,fontSize:12,color:"#8FA6B4",lineHeight:1.5}}>Pour chaque page : ajoute-la au sitemap si elle doit être indexée, ou supprime-la si elle est obsolète.</div>
    </div>}
    {orphans&&orphans.ok&&orphans.orphans&&orphans.orphans.length===0&&<div className="bo-card"><h3>Pages orphelines</h3><p>✅ Aucune page orpheline détectée : tous les fichiers de public/ sont dans le sitemap.</p></div>}
    {orphans&&!orphans.ok&&<div className="bo-card"><h3>Pages orphelines</h3><p>⚠️ {orphans.error||"GITHUB_TOKEN non configuré dans Vercel."}</p></div>}
    <button onClick={check} disabled={checking||!urls||!urls.length} style={{background:"#E49178",color:"#fff",border:"none",borderRadius:10,padding:"11px 18px",fontSize:13,fontWeight:700,cursor:checking?"wait":"pointer",fontFamily:"inherit",marginBottom:14}}>{checking?"⏳ Vérification…":"🔎 Vérifier le statut des pages"}</button>
    {err&&<div style={{color:"#C84B31",fontSize:13,marginBottom:12}}>{err}</div>}
    {!urls&&!err&&<div style={{color:"#6B4F5A",fontSize:13}}>Chargement du sitemap…</div>}
    {urls&&urls.map((u,i)=>{const s=status[u];return <div key={i} style={{display:"flex",alignItems:"center",gap:10,background:"#fff",border:"1px solid #EAE0E8",borderRadius:11,padding:"11px 14px",marginBottom:8}}>
      <span style={{flex:1,minWidth:0,fontSize:13,fontWeight:600,color:"#2E4A5A",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{short(u)}</span>
      {s!==undefined&&<span style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:20,background:(s>=400||s===0)?"#FBF1EF":"#EAF7F1",color:(s>=400||s===0)?"#C84B31":"#1F8A5B"}}>{s===0?"erreur":s}</span>}
      <a href={u} target="_blank" rel="noreferrer" style={{fontSize:12.5,color:"var(--T)",fontWeight:700,textDecoration:"none",flexShrink:0,padding:"11px 10px",display:"inline-flex",alignItems:"center"}}>Ouvrir ↗</a>
    </div>;})}
    {urls&&urls.length===0&&!err&&<div style={{color:"#6B4F5A",fontSize:13}}>Aucune URL trouvée dans le sitemap.</div>}
  </div>;
}

function BackofficeLogin({onLogin}){
  const [email,setEmail]=useState("");
  const [pwd,setPwd]=useState("");
  const [err,setErr]=useState("");
  const [busy,setBusy]=useState(false);
  const submit=async()=>{
    setErr(""); setBusy(true);
    try{
      const {data,error}=await supabase.auth.signInWithPassword({email:email.trim(),password:pwd});
      if(error||!data?.user){ setErr("Identifiants incorrects."); setBusy(false); return; }
      onLogin(data.user);
    }catch(e){ setErr("Erreur reseau, reessaie."); setBusy(false); }
  };
  return <div style={{minHeight:"100vh",background:"var(--c)",display:"flex",alignItems:"center",justifyContent:"center",padding:20,fontFamily:"'DM Sans',sans-serif"}}>
    <div style={{background:"var(--w)",border:"1px solid var(--br)",borderRadius:18,padding:28,maxWidth:380,width:"100%",boxShadow:"0 12px 40px rgba(0,0,0,.12)"}}>
      <div style={{textAlign:"center",marginBottom:18}}>
        <div style={{width:44,height:44,borderRadius:12,background:"linear-gradient(135deg,var(--T),var(--S))",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,margin:"0 auto 10px"}}>🔧</div>
        <div style={{fontWeight:800,fontSize:18,color:"var(--b)"}}>Backoffice TiMat</div>
        <div style={{fontSize:12.5,color:"var(--m)",marginTop:4}}>Accès réservé à l'administrateur.</div>
      </div>
      <input className="inp" type="email" placeholder="E-mail" value={email} onChange={e=>setEmail(e.target.value)} style={{width:"100%",marginBottom:10,fontSize:14,padding:"11px 13px",boxSizing:"border-box"}}/>
      <input className="inp" type="password" placeholder="Mot de passe" value={pwd} onChange={e=>setPwd(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")submit();}} style={{width:"100%",marginBottom:12,fontSize:14,padding:"11px 13px",boxSizing:"border-box"}}/>
      {err&&<div style={{color:"var(--R)",fontSize:12.5,marginBottom:10,textAlign:"center"}}>{err}</div>}
      <button onClick={submit} disabled={busy} className="btn bT" style={{width:"100%",justifyContent:"center",padding:"12px"}}>{busy?"⏳":"Se connecter"}</button>
      <div style={{textAlign:"center",marginTop:14}}><a href="/" style={{fontSize:12.5,color:"var(--m)",textDecoration:"none"}}>← Retour au site</a></div>
    </div>
  </div>;
}

function BackofficeShell({user,appConfig,setAppConfig}){
  const [top,setTop]=useState("dashboard");
  const [sec,setSec]=useState("hero");
  const [drawer,setDrawer]=useState(false);
  const [stats,setStats]=useState(null);
  useEffect(()=>{
    let cancel=false;
    (async()=>{
      try{
        const {count:u}=await supabase.from("profiles").select("*",{count:"exact",head:true});
        const {count:p}=await supabase.from("profiles").select("*",{count:"exact",head:true}).eq("subscription_status","pro");
        const {count:e}=await supabase.from("enfants").select("*",{count:"exact",head:true});
        if(!cancel)setStats({users:u||0,pro:p||0,enfants:e||0});
      }catch(e){ if(!cancel)setStats({users:0,pro:0,enfants:0}); }
    })();
    return ()=>{cancel=true;};
  },[]);
  const [stripeMrr,setStripeMrr]=useState(null);
  useEffect(()=>{
    let cancel=false;
    (async()=>{
      try{
        const r=await boFetch("/api/backoffice?action=stripe-mrr");
        const j=await r.json();
        if(!cancel)setStripeMrr(j);
      }catch(e){ if(!cancel)setStripeMrr({ok:false,error:"Impossible de contacter /api/stripe-mrr."}); }
    })();
    return ()=>{cancel=true;};
  },[]);
  const goSite=()=>{ try{window.location.href="/";}catch(e){} };
  const pickTop=(id)=>{
    setTop(id); setDrawer(false);
    if(id==="contenu")setSec("hero");
    else if(id==="sections")setSec("sectionsvis");
    else if(id==="backups")setSec("historique");
  };
  const GROUPS=[
    {grp:"Vue d'ensemble",items:[{id:"dashboard",l:"Tableau de bord",ic:"📊"}]},
    {grp:"Site & app",items:[{id:"contenu",l:"Contenu (landing)",ic:"✏️"},{id:"sections",l:"Sections",ic:"🧩"},{id:"pages",l:"Pages & articles",ic:"📄"}]},
    {grp:"Référencement",items:[{id:"seo",l:"SEO",ic:"🔍"},{id:"gsc",l:"Search Console",ic:"📈"}]},
    {grp:"Système",items:[{id:"backups",l:"Sauvegardes",ic:"💾"}]},
  ];
  const CONTENU_SUBS=[{id:"hero",l:"Hero",ic:"🏠"},{id:"textes",l:"Textes",ic:"✏️"},{id:"couleurs",l:"Couleurs",ic:"🎨"},{id:"boutons",l:"Boutons",ic:"🔘"},{id:"polices",l:"Polices",ic:"🔤"},{id:"contenu",l:"Blog & listes",ic:"📋"},{id:"app",l:"App",ic:"⚙️"}];
  const SECTIONS_SUBS=[{id:"sectionsvis",l:"Gérer les sections",ic:"🧩"},{id:"sections",l:"Éditer le contenu",ic:"✏️"}];
  const isBO=(top==="contenu"||top==="sections"||top==="backups");
  return <div className={"bo-root"+(drawer?" open":"")}>
    <style>{`
      .bo-root{min-height:100vh;background:#FDFBF8;font-family:'DM Sans',sans-serif;}
      .bo-wrap{display:flex;min-height:100vh;}
      .bo-side{width:230px;background:#2E4A5A;color:#EDE4DE;flex-shrink:0;display:flex;flex-direction:column;padding:14px 10px;position:sticky;top:0;height:100vh;overflow-y:auto;}
      .bo-grp{font-size:11px;text-transform:uppercase;letter-spacing:.7px;color:#8FA6B4;font-weight:700;padding:11px 10px 5px;}
      .bo-tab{display:flex;align-items:center;gap:10px;padding:11px 12px;border-radius:10px;cursor:pointer;font-size:14px;font-weight:600;color:#DCE6EC;border:none;background:none;width:100%;text-align:left;font-family:inherit;margin-bottom:2px;}
      .bo-tab .ic{font-size:16px;width:22px;text-align:center;}
      .bo-tab:hover{background:rgba(255,255,255,.07);}
      .bo-tab.on{background:#E49178;color:#fff;font-weight:800;}
      .bo-tab .soon{margin-left:auto;font-size:11px;background:rgba(255,255,255,.16);padding:2px 6px;border-radius:20px;font-weight:700;}
      .bo-foot{margin-top:auto;padding-top:12px;border-top:1px solid rgba(255,255,255,.12);font-size:12px;}
      .bo-foot .mail{color:#EDE4DE;font-weight:600;display:block;margin-bottom:7px;word-break:break-all;}
      .bo-main{flex:1;min-width:0;display:flex;flex-direction:column;}
      .bo-mbar{display:none;align-items:center;gap:12px;padding:11px 14px;background:#fff;border-bottom:1px solid #EAE0E8;position:sticky;top:0;z-index:15;}
      .bo-burger{background:none;border:none;font-size:23px;cursor:pointer;color:#2E4A5A;line-height:1;min-width:40px;min-height:40px;display:inline-flex;align-items:center;justify-content:center;padding:0;}
      .bo-scrim{display:none;}
      .bo-subnav{display:flex;gap:6px;flex-wrap:wrap;padding:12px 14px 0;background:#FDFBF8;}
      .bo-subbtn{padding:7px 12px;border-radius:20px;border:1px solid #EAE0E8;background:#fff;color:#6B4F5A;font-size:12.5px;font-weight:700;cursor:pointer;font-family:inherit;}
      .bo-subbtn.on{background:#FDF6F4;color:#B85C38;border-color:#F3CEC2;}
      .bo-pad{padding:22px;max-width:820px;}
      .bo-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px;}
      .bo-stat{background:#fff;border:1px solid #EAE0E8;border-radius:12px;padding:16px;}
      .bo-stat .n{font-size:27px;font-weight:900;color:#B85C38;line-height:1;}
      .bo-stat .l{font-size:12.5px;color:#6B4F5A;font-weight:600;margin-top:6px;}
      .bo-card{background:#fff;border:1px solid #EAE0E8;border-radius:12px;padding:18px;margin-bottom:14px;color:#2E4A5A;}
      .bo-card h3{font-size:15px;font-weight:800;margin:0 0 8px;}
      .bo-card p{font-size:13px;color:#6B4F5A;line-height:1.6;margin:0;}
      .bo-soon{border:1.5px dashed #F3CEC2;background:#FDF6F4;border-radius:12px;padding:30px 20px;text-align:center;color:#B85C38;font-weight:700;font-size:14px;line-height:1.6;}
      .bo-soon .big{font-size:34px;display:block;margin-bottom:10px;}
      @media(max-width:760px){
        .bo-side{position:fixed;left:0;top:0;bottom:0;z-index:30;transform:translateX(-100%);transition:transform .22s;box-shadow:4px 0 24px rgba(0,0,0,.25);}
        .bo-root.open .bo-side{transform:translateX(0);}
        .bo-mbar{display:flex;}
        .bo-scrim{position:fixed;inset:0;background:rgba(46,74,90,.45);z-index:25;}
        .bo-root.open .bo-scrim{display:block;}
        .bo-stats{grid-template-columns:1fr;}
        .bo-pad{padding:16px;}
      }
    `}</style>
    <div className="bo-scrim" onClick={()=>setDrawer(false)}/>
    <div className="bo-wrap">
      <nav className="bo-side">
        {GROUPS.map(g=><div key={g.grp}>
          <div className="bo-grp">{g.grp}</div>
          {g.items.map(it=><button key={it.id} className={"bo-tab"+(top===it.id?" on":"")} onClick={()=>pickTop(it.id)}>
            <span className="ic"><IconeOuEmoji e={it.ic}/></span>{it.l}{it.soon&&<span className="soon">à venir</span>}
          </button>)}
        </div>)}
        <div className="bo-foot">
          <span className="mail">{user?.email||""}</span>
          <span style={{color:"#E8A594",fontWeight:700,cursor:"pointer"}} onClick={async()=>{try{await supabase.auth.signOut();}catch(e){} goSite();}}>🚪 Se déconnecter</span>
        </div>
      </nav>
      <div className="bo-main">
        <div className="bo-mbar">
          <button className="bo-burger" onClick={()=>setDrawer(true)}>☰</button>
          <span style={{fontWeight:800,fontSize:15,color:"#2E4A5A"}}>TiMat · Admin</span>
          <a href="/" style={{marginLeft:"auto",fontSize:12.5,color:"#6B4F5A",textDecoration:"none",fontWeight:600,padding:"11px 8px",display:"inline-flex",alignItems:"center"}}>← Site</a>
        </div>
        {top==="contenu"&&<div className="bo-subnav">{CONTENU_SUBS.map(s=><button key={s.id} className={"bo-subbtn"+(sec===s.id?" on":"")} onClick={()=>setSec(s.id)}><IconeOuEmoji e={s.ic}/> {s.l}</button>)}</div>}
        {top==="sections"&&<div className="bo-subnav">{SECTIONS_SUBS.map(s=><button key={s.id} className={"bo-subbtn"+(sec===s.id?" on":"")} onClick={()=>setSec(s.id)}><IconeOuEmoji e={s.ic}/> {s.l}</button>)}</div>}
        <div style={{display:isBO?"block":"none",flex:1,minWidth:0}}>
          <Backoffice user={user} appConfig={appConfig} setAppConfig={setAppConfig} secProp={sec} setSecProp={setSec} hideTabBar setPage={goSite}/>
        </div>
        {top==="dashboard"&&<div className="bo-pad">
          <div style={{fontSize:22,fontWeight:800,color:"#2E4A5A",marginBottom:4}}>Tableau de bord</div>
          <div style={{fontSize:13.5,color:"#6B4F5A",marginBottom:18}}>Tes chiffres en direct.</div>
          <div className="bo-stats">
            <div className="bo-stat"><div className="n">{stats?stats.users:"…"}</div><div className="l">Comptes inscrits</div></div>
            <div className="bo-stat"><div className="n">{stats?stats.pro:"…"}</div><div className="l">Abonnés Pro</div></div>
            <div className="bo-stat"><div className="n">{stats?stats.enfants:"…"}</div><div className="l">Enfants suivis</div></div>
          </div>
          <div className="bo-card">
            <h3>💳 Revenu (Stripe){stripeMrr&&stripeMrr.ok&&stripeMrr.mode==="test"&&<span style={{marginLeft:8,fontSize:11,fontWeight:800,color:"#B85C38",background:"#FDF6F4",border:"1px solid #F3CEC2",borderRadius:20,padding:"2px 8px",verticalAlign:"middle"}}>MODE TEST</span>}</h3>
            {stripeMrr===null&&<p>Chargement…</p>}
            {stripeMrr&&!stripeMrr.ok&&<p>⚠️ {stripeMrr.error||"Stripe non configuré."}</p>}
            {stripeMrr&&stripeMrr.ok&&<>
              <div className="bo-stats" style={{marginTop:4,marginBottom:0}}>
                <div className="bo-stat"><div className="n">{stripeMrr.mrrFormatted}</div><div className="l">MRR estimé</div></div>
                <div className="bo-stat"><div className="n">{stripeMrr.activeCount}</div><div className="l">Abonnés actifs</div></div>
                <div className="bo-stat"><div className="n">{stripeMrr.trialingCount}</div><div className="l">En essai gratuit</div></div>
              </div>
              {stripeMrr.mode==="test"&&<p style={{marginTop:10}}>Ces chiffres viennent de comptes de <strong>test</strong> Stripe (aucun paiement réel). Ils deviendront réels dès le passage de Stripe en mode Live.</p>}
            </>}
          </div>
          <div className="bo-card"><h3>Bienvenue 👋</h3><p>Utilise le menu pour modifier le contenu de ta landing, organiser tes sections, gérer tes pages ou lancer un audit SEO de ton site.</p></div>
        </div>}
        {top==="pages"&&<div className="bo-pad"><SitePages/></div>}
        {top==="seo"&&<div className="bo-pad"><SeoAudit/></div>}
        {top==="gsc"&&<div className="bo-pad"><SearchConsole/></div>}
      </div>
    </div>
  </div>;
}

export function BackofficePage({user,appConfig,setAppConfig,onLogin}){
  if(!user)return <BackofficeLogin onLogin={onLogin}/>;
  if(user.is_admin!==true)return <div style={{minHeight:"100vh",background:"var(--c)",display:"flex",alignItems:"center",justifyContent:"center",padding:20,fontFamily:"'DM Sans',sans-serif"}}>
    <div style={{background:"var(--w)",border:"1px solid var(--br)",borderRadius:18,padding:28,maxWidth:360,width:"100%",textAlign:"center",boxShadow:"0 12px 40px rgba(0,0,0,.12)"}}>
      <div style={{fontSize:34,marginBottom:10}}>🔒</div>
      <div style={{fontWeight:800,fontSize:18,color:"var(--b)",marginBottom:6}}>Accès refusé</div>
      <div style={{fontSize:13,color:"var(--m)",lineHeight:1.6,marginBottom:16}}>Cette zone est réservée à l'administrateur. Le compte {user.email} n'y a pas accès.</div>
      <a href="/" style={{display:"inline-block",padding:"11px 18px",borderRadius:12,background:"linear-gradient(135deg,var(--T),var(--S))",color:"#fff",fontWeight:700,fontSize:14,textDecoration:"none"}}>← Retour au site</a>
    </div>
  </div>;
  return <BackofficeShell user={user} appConfig={appConfig} setAppConfig={setAppConfig}/>;
}

// ===== MODE VITRINE (avant ouverture) =====
// MAINTENANCE=true : la landing marketing reste visible et indexable, mais aucune
// inscription ni connexion n'est possible. Passer a false le jour de l'ouverture.
// Acces de service : https://www.timat.app/?acces=D1Jrp_UaM29A  (memorise 24 h)
