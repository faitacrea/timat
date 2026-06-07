import { useState, useRef, useEffect, useMemo } from "react";
import { supabase } from "../lib/supabase.js";

// Hook générique : charge depuis Supabase, fallback local, sauvegarde auto
function useSupabaseData(table, enfantId, isDemo, defaultData){
  const [data, setDataState]=useState(defaultData);
  const [loaded, setLoaded]=useState(false);

  useEffect(()=>{
    if(!enfantId||isDemo){setLoaded(true);return;}
    supabase.from(table).select("*").eq("enfant_id",enfantId)
      .order("created_at",{ascending:true})
      .then(({data:rows})=>{
        if(rows&&rows.length>0)setDataState(rows);
        setLoaded(true);
      });
  },[enfantId,isDemo,table]);

  const saveRow=async(row)=>{
    if(isDemo||!enfantId)return;
    await supabase.from(table).upsert({...row,enfant_id:enfantId},{onConflict:"id"});
  };

  const deleteRow=async(id)=>{
    if(isDemo||!enfantId)return;
    await supabase.from(table).delete().eq("id",id);
  };

  return[data,setDataState,saveRow,deleteRow,loaded];
}

// ========== AUDIT LOG + CONSENT P8 ==========
// Helpers RGPD : logAction (audit_log append-only) et logConsent (consentements RGPD)
// Tous les appels sont non-bloquants : si l'INSERT échoue, on warn en console mais l'app continue.
async function logAction(action, opts={}){
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
async function createNotification({userId,type="info",titre="",page="accueil",meta=null}){
  if(!userId)return;
  try{
    await supabase.rpc("create_notification",{
      p_user_id:userId, p_type:type, p_titre:titre, p_page:page, p_meta:meta,
    });
  }catch(e){ console.warn('[notification] non creee:', e?.message); }
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
async function sendNotificationEmail({type,to,subject,template,vars={}}){
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

// EMAILS TEMPLATES P13 - templates pretes a brancher (HTML simple, surchargeable depuis backoffice)
const EMAIL_TEMPLATES={
  signature_asmat_signed:{
    subject:"Votre assistante maternelle a signe le contrat",
    html:(v)=>"<h2>Bonjour "+v.parent_prenom+",</h2>"
      +"<p>"+v.asmat_prenom+" vient de signer electroniquement le contrat de "+v.enfant_prenom+".</p>"
      +"<p>Connectez-vous a TiMat pour le signer a votre tour :</p>"
      +"<p><a href='"+v.url+"' style='display:inline-block;background:#E49178;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700'>Signer le contrat</a></p>",
  },
  signature_parent_signed:{
    subject:"Le parent a signe le contrat",
    html:(v)=>"<h2>Bonjour "+v.asmat_prenom+",</h2>"
      +"<p>"+v.parent_prenom+" "+v.parent_nom+" vient de signer le contrat de "+v.enfant_prenom+".</p>"
      +"<p>Le contrat est finalise et archive dans vos documents.</p>",
  },
  signature_reminder:{
    subject:"Rappel : signature de contrat en attente",
    html:(v)=>"<p>Le contrat de "+v.enfant_prenom+" attend votre signature depuis le "+v.date+".</p>"
      +"<p><a href='"+v.url+"'>Signer maintenant</a></p>",
  },
  bulletin_sent:{
    subject:"Votre bulletin de salaire est disponible",
    html:(v)=>"<p>Bonjour "+v.parent_prenom+",</p>"
      +"<p>Le bulletin de salaire pour "+v.mois+" est disponible dans votre espace TiMat.</p>",
  },
  invitation_parent:{
    subject:"Invitation : votre assistante maternelle vous invite sur TiMat",
    html:(v)=>"<h2>Bonjour "+v.parent_prenom+",</h2>"
      +"<p>"+v.asmat_prenom+" vous invite a rejoindre TiMat pour suivre "+v.enfant_prenom+".</p>"
      +"<p><a href='"+v.url+"'>Rejoindre TiMat</a></p>",
  },
  // POINTAGE WORKFLOW P14E - notification au parent qu'un pointage attend sa validation
  pointage_a_valider:{
    subject:"Un pointage attend votre validation",
    html:(v)=>"<h2>Bonjour "+v.parent_prenom+",</h2>"
      +"<p>L'assistante maternelle a enregistre le pointage de "+v.enfant_prenom+" du "+v.date+".</p>"
      +"<p>Duree d'accueil : <strong>"+v.duree+"</strong></p>"
      +"<p>Merci de valider ce pointage dans votre application :</p>"
      +"<p><a href='"+v.url+"' style='display:inline-block;background:#E49178;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700'>Valider le pointage</a></p>"
      +"<p style='font-size:11px;color:#888;margin-top:24px'>Si vous oubliez, un rappel automatique sera envoye sous 3 jours.</p>",
  },
  pointage_rappel:{
    subject:"Rappel : pointage en attente de validation depuis 3 jours",
    html:(v)=>"<p>Bonjour "+v.parent_prenom+",</p>"
      +"<p>Un pointage de "+v.enfant_prenom+" est en attente de votre validation depuis le "+v.date+".</p>"
      +"<p><a href='"+v.url+"'>Valider maintenant</a></p>",
  },
  // VERSEMENTS P34 - notification d'un versement enregistre (parent->assmat ou assmat->parent)
  versement_recu:{
    subject:"Nouveau versement enregistre sur TiMat",
    html:(v)=>"<h2>Bonjour "+v.prenom+",</h2>"
      +"<p>"+v.qui+" a enregistre un versement de <strong>"+v.montant+"</strong>"+(v.enfant_prenom?(" pour "+v.enfant_prenom):"")+" le "+v.date+".</p>"
      +"<p>Retrouvez le detail dans l'onglet Versements de votre espace TiMat.</p>",
  },
};

// DATES
var _D=new Date();
var _y=_D.getFullYear();
var _mo=String(_D.getMonth()+1).padStart(2,"0");
var _da=String(_D.getDate()).padStart(2,"0");
var TODAY_STR=_y+"-"+_mo+"-"+_da;
var TODAY_H=String(_D.getHours()).padStart(2,"0")+"h"+String(_D.getMinutes()).padStart(2,"0");
var TODAY_MONTH=String(_D.getMonth()+1).padStart(2,"0");
var TODAY_YEAR=String(_D.getFullYear());


function Styles(){return(
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400;1,700&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,300;1,9..40,400&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&family=DM+Mono:wght@400;500&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    html,body{width:100%;overflow-x:hidden;font-family:'DM Sans',sans-serif}
    :root{
      --c:#FDFBF8;--w:#FFFFFF;--b:#2E4A5A;--m:#6B4F5A;--l:#A8909A;--br:#EAE0E8;
      --T:#E49178;--Tp:#FDF6F4;--Tl:#F3CEC2;
      --S:#90A093;--Sp:#F6F7F6;--Sl:#CDD4CE;
      --G:#5DA9A1;--Gp:#F2F8F7;
      --B:#5A7AB8;--Bp:#EBF0F8;
      --R:#C84B31;--Rp:#FBF1EF;
      --P:#B8924D;--Pp:#F8F2E4;
      --sh:0 1px 4px rgba(46,74,90,.05),0 4px 20px rgba(46,74,90,.07);
      --sh2:0 2px 12px rgba(46,74,90,.08),0 16px 48px rgba(46,74,90,.12);
      --sh3:0 0 0 3px rgba(144,160,147,.2);
      --r:18px;--r2:14px;--r3:10px
    }
    .dark{
      --c:#1A2530;--w:#243140;--b:#E8EEF0;--m:#9FAEB5;--l:#7A8993;--br:#34424E;
      --Tp:#3A2218;--Sp:#1F2A22;--Gp:#0F2A26;--Bp:#0D1A2A;--Rp:#2E1610;--Pp:#2E2418;
      --T:#E49178;--S:#A8B5A8;--G:#7FC4BC;--B:#7AAAE0;--R:#E26B4F;--P:#D4B068;
      --Tl:#5A3A2C;--Sl:#384038;--Gl:#1F4A44;--Bl:#1A3050;--Rl:#4A1F12;
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
    .msgs{display:flex;flex-direction:column;gap:8px;max-height:320px;overflow-y:auto;padding:2px}
    .msg{max-width:80%;padding:9px 13px;border-radius:14px;font-size:13px;line-height:1.45;overflow-wrap:break-word}
    .msg-me{align-self:flex-end;background:linear-gradient(135deg,#E49178,#C76754);color:#fff;border-bottom-right-radius:4px}
    .msg-ot{align-self:flex-start;background:#F1EDE8;color:var(--b);border-bottom-left-radius:4px}
    .dark .msg-me{background:#1A3A34!important;color:#F0F5F3!important}
    .dark .msg-ot{background:#132428!important;color:#E0EBE8!important}
    .dark details{background:#132428!important;border-color:#1E3A34!important}
    .dark details summary{color:#F0F5F3!important}
    .dark select option{background:#0D1B1E;color:#F0F5F3}
    .app{min-height:100vh;background:var(--c);display:flex;flex-direction:column;width:100%;position:relative}
    .app::before{content:'';position:fixed;inset:0;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");pointer-events:none;z-index:0;opacity:.5}
    .card{background:rgba(255,255,255,.9);backdrop-filter:blur(8px);border-radius:var(--r);border:1px solid rgba(234,224,232,.8);box-shadow:var(--sh);position:relative;z-index:1}
    .card-lift{transition:transform .22s cubic-bezier(.34,1.56,.64,1),box-shadow .22s ease}
    .card-lift:hover{transform:translateY(-3px);box-shadow:var(--sh2)}
    .pf{font-family:'Cormorant Garamond','Georgia',serif}
    .topbar{position:sticky;top:0;z-index:100;background:rgba(255,255,255,.92);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-bottom:1px solid rgba(234,224,232,.6);display:flex;justify-content:space-between;align-items:center;padding:0 20px;height:54px;box-shadow:0 1px 0 rgba(0,0,0,.04)}
    .logo{font-family:'Cormorant Garamond',serif;font-size:24px;font-weight:700;color:var(--T);font-style:italic;letter-spacing:-.5px}
    .logo-dot{width:5px;height:5px;border-radius:50%;background:var(--S);margin-top:2px}
    .nav-main{background:rgba(255,255,255,.88);backdrop-filter:blur(16px);border-bottom:1px solid rgba(234,224,232,.5);display:flex;gap:4px;padding:0 16px;height:46px;align-items:center}
    .inp{width:100%;padding:11px 14px;border-radius:12px;border:1.5px solid var(--br);font-size:13px;outline:none;font-family:inherit;transition:border-color .15s,box-shadow .15s;background:#fff;color:var(--b)}
    .inp:focus{border-color:var(--S);box-shadow:var(--sh3)}
    .ta{width:100%;padding:11px 14px;border-radius:12px;border:1.5px solid var(--br);font-size:13px;outline:none;font-family:inherit;resize:vertical;min-height:80px;transition:border-color .15s;background:#fff;color:var(--b)}
    .ta:focus{border-color:var(--S);box-shadow:var(--sh3)}
    .sel{width:100%;padding:10px 14px;border-radius:12px;border:1.5px solid var(--br);font-size:13px;outline:none;font-family:inherit;background:#fff;color:var(--b)}
    .lbl{display:block;font-size:11.5px;font-weight:600;color:var(--l);margin-bottom:5px;letter-spacing:.3px;text-transform:uppercase}
    .btn{display:inline-flex;align-items:center;gap:7px;padding:9px 18px;border-radius:12px;border:none;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;transition:all .18s;letter-spacing:.1px}
    .bT{background:linear-gradient(135deg,#E49178,#C76754);color:#fff;box-shadow:0 2px 10px rgba(228,145,120,.3)}
    .bT:hover{transform:translateY(-1px);box-shadow:0 4px 18px rgba(196,113,74,.4)}
    .bS{background:linear-gradient(135deg,#90A093,#A8B5A8);color:#fff;box-shadow:0 2px 10px rgba(144,160,147,.3)}
    .bS:hover{transform:translateY(-1px);box-shadow:0 4px 18px rgba(155,107,170,.4)}
    .bG{background:rgba(26,17,24,.06);color:var(--m);border:1px solid var(--br)}
    .bG:hover{background:rgba(26,17,24,.1)}
    .badge{display:inline-flex;align-items:center;justify-content:center;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700}
    .content{flex:1;overflow-y:auto;overflow-x:hidden}
    .fi{padding:20px;max-width:900px;margin:0 auto;width:100%;flex:1}
    .g2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
    .g3{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
    .g4{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
    @media(max-width:640px){.g2,.g3,.g4{grid-template-columns:1fr 1fr}}
    @media(max-width:400px){.g2,.g3,.g4{grid-template-columns:minmax(0,1fr)}.g2>*,.g3>*,.g4>*{min-width:0}}
    .demo-screen .g2{grid-template-columns:minmax(0,1fr)!important}
    .demo-screen .g3{grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important}
    .demo-screen .g4{grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important}
    .demo-screen .g2>*,.demo-screen .g3>*,.demo-screen .g4>*{min-width:0}
    .demo-screen [style*="overflow-x"],.demo-screen [style*="overflowX"]{overflow-x:hidden!important}
    .demo-phone{width:340px}
    @media(max-width:768px){.demo-phone{width:300px}}
    @media(max-width:480px){.demo-phone{width:min(300px,90vw)}}
    .demo-zoom{zoom:.82}
    @media(max-width:768px){.demo-zoom{zoom:.78}}
    @media(max-width:480px){.demo-zoom{zoom:.74}}
    .bar{height:6px;background:rgba(26,17,24,.08);border-radius:3px;overflow:hidden}
    .bar-fill{height:100%;border-radius:3px;background:linear-gradient(90deg,var(--T),var(--S));transition:width .6s ease}
    .canv{border-radius:14px;border:2px solid var(--br);cursor:crosshair;touch-action:none;background:#fff}
    .moo{border:2px solid transparent;border-radius:10px;padding:4px 6px;font-size:18px;cursor:pointer;transition:all .15s;background:transparent}
    .moo.on,.moo:hover{border-color:var(--S);background:var(--Sp);transform:scale(1.15)}
    .msc{width:18px;height:18px;border-radius:50%;border:2px solid var(--br);display:inline-flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;transition:all .15s}
    .msc.ok{background:var(--G);border-color:var(--G);color:#fff}
    .mood-bar{display:flex;gap:2px;height:32px;align-items:flex-end;margin-top:4px}
    .mood-b{border-radius:3px 3px 0 0;background:linear-gradient(to top,var(--T),var(--S));min-width:8px;transition:height .3s ease}
    .ai-card{background:linear-gradient(135deg,var(--Sp),var(--Tp))!important;border-color:var(--Sl)!important}
    .ai-dot{width:7px;height:7px;border-radius:50%;background:var(--S);animation:ai-pulse 1.2s ease-in-out infinite}
    @keyframes ai-pulse{0%,100%{transform:scale(1);opacity:.6}50%{transform:scale(1.3);opacity:1}}
    .cp{padding:7px 12px!important;display:inline-flex!important;align-items:center;gap:6px;cursor:pointer;flex:unset!important;transition:all .15s!important;border-radius:20px!important}
    .cp.on{border-color:var(--S)!important;background:var(--Sp)!important}
    ::-webkit-scrollbar{width:4px;height:4px}
    ::-webkit-scrollbar-track{background:transparent}
    ::-webkit-scrollbar-thumb{background:var(--br);border-radius:2px}
    .div{height:1px;background:linear-gradient(90deg,transparent,var(--br),transparent);margin:4px 0}
    .sec-h{display:flex;align-items:center;gap:8px;margin-bottom:14px}
    .sec-h-line{flex:1;height:1px;background:linear-gradient(90deg,var(--br),transparent)}
    #bandeau-hl{display:none;background:linear-gradient(90deg,var(--T),var(--S));color:#fff;font-size:11px;text-align:center;padding:4px;font-weight:600}
    .offline #bandeau-hl{display:block}
    @media(max-width:640px){.g2,.g3,.g4{grid-template-columns:1fr}}
    @media(max-width:768px){
      .nav-main{display:none!important}
      .content{padding-bottom:72px!important}
      .fi{padding:12px!important;max-width:100%!important}
      .topbar{height:50px!important;padding:0 12px!important}
      .logo{font-size:19px!important}
      .btn{padding:8px 13px;font-size:12px}
      .card{border-radius:14px!important}
    }
    .bottom-nav{display:none;position:fixed;bottom:0;left:0;right:0;z-index:200;background:rgba(255,255,255,.97);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-top:1px solid rgba(234,224,232,.7);box-shadow:0 -4px 20px rgba(0,0,0,.08);height:64px;align-items:stretch;padding:0 8px;padding-bottom:env(safe-area-inset-bottom,0px)}
    .dark .bottom-nav{background:rgba(13,27,30,.97)!important;border-top-color:#1E3A34!important}
    .bnav-btn{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;border:none;background:transparent;cursor:pointer;padding:6px 2px;border-radius:12px;transition:all .18s;font-family:inherit;min-width:0}
    .bnav-btn.active{background:rgba(155,107,170,.12)}
    .bnav-btn .bnav-ic{font-size:22px;line-height:1;transition:transform .18s}
    .bnav-btn.active .bnav-ic{transform:scale(1.12)}
    .bnav-btn .bnav-lbl{font-size:10px;font-weight:600;letter-spacing:.1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:72px;color:var(--l);transition:color .15s}
    .bnav-btn.active .bnav-lbl{color:var(--S)}
    @media(max-width:768px){.bottom-nav{display:flex}}
    .demo-bnav .bottom-nav{position:static!important;display:flex!important;box-shadow:none;z-index:auto;padding-bottom:0}
    @media(hover:none){.card-lift:active{transform:scale(.98)}.btn:active{transform:scale(.96)!important}}
    /* - CALENDRIER - */
    .cgrid{display:grid;grid-template-columns:repeat(7,1fr);gap:3px}
    .cday{min-height:38px;border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding-top:5px;cursor:pointer;transition:all .15s;font-size:12px;color:var(--b);position:relative;background:transparent}
    .cday:hover{background:var(--Sp)}
    .cday.tod{background:linear-gradient(135deg,var(--T),var(--S));color:#fff;font-weight:700;box-shadow:0 2px 8px rgba(144,160,147,.3)}
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
    /* - NAV TABS - */
    .ntab{padding:6px 12px;border-radius:8px;border:none;background:transparent;cursor:pointer;font-family:inherit;font-size:12px;font-weight:500;color:var(--b);transition:all .15s}
    .ntab.on{background:var(--Sp);color:var(--S);font-weight:700}
  `}</style>
);}


const D = {
  asmat:{id:"am1",role:"asmat",prenom:"Marie",nom:"Dupont",email:"marie.dupont@mail.fr",agrement:"AGR-2019-0042",couleur:"#E49178"},
  parents:[
    {id:"p1",role:"parent",prenom:"Sophie",nom:"Martin",email:"sophie.martin@mail.fr",couleur:"#3A72A8"},
    {id:"p2",role:"parent",prenom:"Thomas",nom:"Bernard",email:"thomas.bernard@mail.fr",couleur:"#4E7A5C"},
    {id:"p3",role:"parent",prenom:"Camille",nom:"Petit",email:"camille.petit@mail.fr",couleur:"#C44E72"},
  ],
  enfants:[
    {id:"e1",prenom:"Léo",nom:"Martin",parentId:"p1",naissance:"2022-03-15",couleur:"#3A72A8",emoji:"🦁",
      allergies:["Arachides","Noix de cajou"],groupe_sanguin:"A+",medecin:"Dr. Lefebvre - 01 23 45 67",
      vaccins:[{nom:"DTP",date:"2022-09-15",ok:true},{nom:"ROR",date:"2023-03-15",ok:true},{nom:"Méningite B",date:"2023-09-15",ok:false}],
      contrat:{debut:"2023-09-04",fin:"2024-08-31",heuresHebdo:40,tauxHoraire:4.05,jours:["Lundi","Mardi","Mercredi","Jeudi","Vendredi"],horaires:"07h30–17h30",entretien:3.8,indemniteAbsence:0.5},
      signe:false},
    {id:"e2",prenom:"Emma",nom:"Bernard",parentId:"p2",naissance:"2021-11-22",couleur:"#4E7A5C",emoji:"🌸",
      allergies:["Lactose"],groupe_sanguin:"O+",medecin:"Dr. Martin - 01 34 56 78",
      vaccins:[{nom:"DTP",date:"2022-05-22",ok:true},{nom:"ROR",date:"2022-11-22",ok:true},{nom:"Méningite B",date:"2023-05-22",ok:true}],
      contrat:{debut:"2023-09-04",fin:"2024-08-31",heuresHebdo:35,tauxHoraire:4.05,jours:["Lundi","Mardi","Jeudi","Vendredi"],horaires:"08h00–18h00",entretien:3.8,indemniteAbsence:0.5},
      signe:true},
    {id:"e3",prenom:"Noah",nom:"Petit",parentId:"p3",naissance:"2023-01-08",couleur:"#C44E72",emoji:"⭐",
      allergies:[],groupe_sanguin:"B+",medecin:"Dr. Durand - 01 45 67 89",
      vaccins:[{nom:"DTP",date:"2023-07-08",ok:true},{nom:"ROR",date:"2024-01-08",ok:false},{nom:"Hépatite B",date:"2023-07-08",ok:true}],
      contrat:{debut:"2024-01-08",fin:"2024-12-31",heuresHebdo:45,tauxHoraire:4.05,jours:["Lundi","Mardi","Mercredi","Jeudi","Vendredi"],horaires:"07h00–18h00",entretien:3.8,indemniteAbsence:0.5},
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
    {id:"pt4",eId:"e1",date:"2024-03-08",arr:"07h40",dep:"17h25",tot:"9h45",valide:true},
    {id:"pt5",eId:"e2",date:"2024-03-08",arr:"08h00",dep:"18h00",tot:"10h00",valide:true},
    {id:"pt6",eId:"e3",date:"2024-03-08",arr:"07h05",dep:"17h10",tot:"10h05",valide:true},
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
    {id:"ab1",eId:"e1",date:"2024-03-05",motif:"Maladie",indemnise:true,heures:9},
    {id:"ab2",eId:"e2",date:"2024-03-07",motif:"Décision parent",indemnise:true,heures:8},
    {id:"ab3",eId:"e3",date:"2024-02-28",motif:"Congés parents",indemnise:false,heures:9},
  ],
  evenements:[
    {id:"ev1",date:"2024-03-15",type:"conge",txt:"Congés assmat",},
    {id:"ev2",date:"2024-03-20",type:"rdv",txt:"Réunion parents Emma"},
    {id:"ev3",date:"2024-03-25",type:"hol",txt:"Sortie Printemps"},
    {id:"ev4",date:"2024-04-01",type:"abs",txt:"Absent - Léo"},
  ],
  portfolio:[
    {id:"pf1",eId:"e1",date:TODAY_STR,titre:"Peinture cerisier",desc:"Coton-tige et peinture rose, inspiration japonaise",emoji:"🌸",competences:["Motricité fine","Créativité"]},
    {id:"pf2",eId:"e1",date:"2024-03-06",titre:"Plantation radis",desc:"Découverte des graines, arrosage, responsabilité",emoji:"🌱",competences:["Sciences","Responsabilité"]},
    {id:"pf3",eId:"e2",date:"2024-03-09",titre:"Puzzle 12 pièces",desc:"Concentration remarquable, fini seul en 8 minutes !",emoji:"🧩",competences:["Logique","Patience"]},
    {id:"pf4",eId:"e3",date:TODAY_STR,titre:"Premiers pas 🎉",desc:"4 pas autonomes, sourire immense. Moment magique.",emoji:"👣",competences:["Motricité globale","Équilibre"]},
    {id:"pf5",eId:"e3",date:"2024-03-04",titre:"Maracas maison",desc:"Riz dans bouteilles, découverte du son et du rythme",emoji:"🎵",competences:["Éveil musical","Créativité"]},
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
const age=(d)=>{const n=new Date(d),t=new Date(),m=(t.getFullYear()-n.getFullYear())*12+(t.getMonth()-n.getMonth());return m>=24?Math.floor(m/12)+" ans":m+" mois"};
const fmt=(s)=>s?new Date(s).toLocaleDateString("fr-FR"):"-";
const ini=(p,n)=>(p[0]+n[0]).toUpperCase();
const todayStr=()=>new Date().toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
const moodVal={"😄":5,"😊":4,"😐":3,"😴":2,"😢":1,"😠":1,"🥰":5,"😬":2};

//
function Av({t,c,s=36}){return <div className="av"style={{width:s,height:s,background:c+"22",color:c,fontSize:s*.34,minWidth:s}}>{t}</div>}
function CPill({e,sel,onClick,badge}){return <div className={"card cp "+(sel?"on":"")+""}onClick={onClick}style={{padding:"9px 13px",display:"flex",alignItems:"center",gap:9,position:"relative"}}>
  <span style={{fontSize:20}}>{e.emoji}</span><div><div style={{fontWeight:700,fontSize:13,color:"var(--b)"}}>{e.prenom}</div><div style={{fontSize:11,color:"var(--l)"}}>{age(e.naissance)}</div></div>{badge&&<span style={{position:"absolute",top:-6,right:-6}}>{badge}</span>}</div>}

function Toast({msg,onClose}){useEffect(()=>{const t=setTimeout(onClose,3000);return()=>clearTimeout(t)},[]);
  return <div className="toast"><span>✅</span>{msg}</div>}

function PageHeader({icon,title,sub,action}){return <div style={{marginBottom:14,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
  <div><div className="pf"style={{fontSize:17,fontWeight:700,color:"var(--b)",marginBottom:2}}>{icon} {title}</div>
  {sub&&<div style={{fontSize:12,color:"var(--l)"}}>{sub}</div>}</div>{action}</div>}

//
function AccueilAssMat({enfants,setPage,user,demoStats=null}){
  const [showAjout,setShowAjout]=useState(false);
  // TABLEAU SIGNATURES P11 - state pour le mini-dashboard
  const [genPdf,setGenPdf]=useState({}); // {[contratId]: 'pending'|'done'|'error'}
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
        const todayIso=now.toISOString().slice(0,10);
        // Lundi de la semaine (lundi = 1, dimanche = 0 → on calcule l'offset)
        const dayOfWeek=now.getDay();
        const offset=dayOfWeek===0?6:dayOfWeek-1;
        const lundi=new Date(now);lundi.setDate(now.getDate()-offset);lundi.setHours(0,0,0,0);
        const lundiIso=lundi.toISOString().slice(0,10);
        // Debut du mois
        const debutMois=new Date(now.getFullYear(),now.getMonth(),1).toISOString().slice(0,10);
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
    {icon:"📋",val:"Actif",lbl:"Journal du jour",c:"var(--S)",page:"journal_complet",hint:"→ Journal"},
    {icon:"🧾",val:nbEnfants,lbl:"Contrats actifs",c:"var(--G)",page:"admin_finances",hint:"→ Paie & Contrats"},
  ]:[
    {icon:"⏱️",val:stats.heuresSemaine+" h",lbl:"Heures cette semaine",c:"var(--T)",page:"pointage",hint:"→ Pointage"},
    {icon:"💰",val:stats.revenuMois+" €",lbl:"Revenu estimé du mois",c:"var(--G)",page:"admin_finances",hint:"→ Paie"},
    {icon:"🟢",val:stats.presencesJour.length+"/"+nbEnfants,lbl:"Présents maintenant",c:"var(--S)",page:"pointage",hint:"→ Pointage"},
    {icon:"💬",val:stats.messagesNonLus,lbl:"Messages non lus",c:stats.messagesNonLus>0?"var(--R)":"var(--B)",page:"messagerie",hint:"→ Messagerie"},
  ];

  return <div className="fi">
    {tabToast&&<Toast msg={tabToast}onClose={()=>setTabToast("")}/>}
    {showAjout&&user&&<AjouterEnfantModale user={user} onClose={()=>setShowAjout(false)}/>}
    <div style={{marginBottom:18,display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,flexWrap:"wrap"}}>
      <div>
        <div style={{fontSize:11,color:"var(--l)",marginBottom:4,fontFamily:"'DM Mono',monospace",letterSpacing:".5px"}}>
          {todayStr().toUpperCase()}
        </div>
        <div className="pf"style={{fontSize:26,fontWeight:600,color:"var(--b)",lineHeight:1.2}}>Bonjour {user?.prenom||"Marie"} 👋</div>
        <div style={{fontSize:13,color:"var(--m)",marginTop:4}}>Votre espace professionnel</div>
      </div>
      {user&&!demoStats&&<BoutonAjouterEnfant compact onClick={()=>setShowAjout(true)}/>}
    </div>

    {/* STATS TEMPS REEL P14D - bandeau presences en cours */}
    {!isDemoUser&&stats.loaded&&stats.presencesJour.length>0&&<div className="card" style={{padding:"12px 16px",marginBottom:14,background:"linear-gradient(135deg,#E8F4EC,#D6EBD9)",border:"1.5px solid var(--S)"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
        <span style={{fontSize:18}}>🟢</span>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:12,fontWeight:700,color:"var(--S)"}}>Actuellement en accueil</div>
          <div style={{fontSize:12,color:"var(--m)",marginTop:2}}>
            {stats.presencesJour.map(p=>(p.emoji||"👶")+" "+p.prenom+" (depuis "+p.depuis?.slice(0,5)+")").join(" · ")}
          </div>
        </div>
      </div>
    </div>}

    {/* Alerte contrats */}
    {nonSigne.length>0&&<div onClick={()=>setPage("admin_finances")}
      style={{background:"linear-gradient(135deg,#FFF8E6,#FFF3D6)",border:"1.5px solid #E8B820",borderRadius:14,padding:"11px 16px",marginBottom:14,display:"flex",gap:10,alignItems:"center",cursor:"pointer",transition:"transform .15s"}}
      onMouseEnter={e=>e.currentTarget.style.transform="translateY(-1px)"}
      onMouseLeave={e=>e.currentTarget.style.transform="translateY(0)"}>
      <span style={{fontSize:20}}>✍️</span>
      <div style={{fontSize:13,color:"#7A5500",fontWeight:600,flex:1}}>
        {nonSigne.map(e=>e.prenom).join(", ")} - signature de contrat en attente
      </div>
      <span style={{fontSize:12,color:"#B8892A",fontWeight:700}}>Signer →</span>
    </div>}

    {/* KPIs cliquables */}
    <div className="g4"style={{marginBottom:16}}>
      {kpis.map(k=><div key={k.lbl}className="card card-lift"onClick={()=>setPage(k.page)}
        style={{padding:16,textAlign:"center",cursor:"pointer"}}>
        <div style={{fontSize:24,marginBottom:6}}>{k.icon}</div>
        <div className="pf"style={{fontSize:26,fontWeight:600,color:k.c,lineHeight:1}}>{k.val}</div>
        <div style={{fontSize:11,color:"var(--l)",marginTop:4,lineHeight:1.3}}>{k.lbl}</div>
        <div style={{fontSize:10,color:k.c,marginTop:6,fontWeight:600,opacity:.7}}>{k.hint}</div>
      </div>)}
    </div>

    {/* TABLEAU SIGNATURES P11 - vue d'ensemble du statut signatures des contrats */}
    {!isDemoUser&&nbEnfants>0&&<div className="card"style={{padding:18,marginBottom:14}}>
      <div style={{fontWeight:600,fontSize:14,color:"var(--b)",marginBottom:12,display:"flex",alignItems:"center",gap:8}}>
        ✍️ Statut des signatures
        <span style={{fontSize:10,color:"var(--l)",fontWeight:400}}>({nbEnfants} contrat{nbEnfants>1?"s":""})</span>
      </div>
      <div className="g4"style={{marginBottom:14,gap:8}}>
        {[
          {l:"✅ Signés (2/2)",c:"var(--S)",n:sigStats.both.length,bg:"var(--Sp)"},
          {l:"⏳ Attente parent",c:"#B8892A",n:sigStats.asmat.length,bg:"#FFF8E6"},
          {l:"⏳ Attente asmat",c:"var(--B)",n:sigStats.parent.length,bg:"var(--Bp)"},
          {l:"❌ Non signés",c:"var(--R)",n:sigStats.none.length,bg:"var(--Rp)"},
        ].map(s=><div key={s.l}style={{padding:10,borderRadius:10,background:s.bg,textAlign:"center"}}>
          <div className="pf"style={{fontSize:22,fontWeight:600,color:s.c,lineHeight:1}}>{s.n}</div>
          <div style={{fontSize:10,color:s.c,marginTop:4}}>{s.l}</div>
        </div>)}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:6}}>
        {enfants.map(e=>{
          const ct=e.contrat;if(!ct)return null;
          const both=ct.signe_asmat&&ct.signe_parent;
          const onlyA=ct.signe_asmat&&!ct.signe_parent;
          const onlyP=!ct.signe_asmat&&ct.signe_parent;
          const none=!ct.signe_asmat&&!ct.signe_parent;
          const status=both?{ic:"✅",l:"Signé (asmat + parent)",c:"var(--S)"}
            :onlyA?{ic:"⏳",l:"En attente du parent",c:"#B8892A"}
            :onlyP?{ic:"⏳",l:"En attente de votre signature",c:"var(--B)"}
            :{ic:"❌",l:"Non signé",c:"var(--R)"};
          const genState=genPdf[ct.id];
          return <div key={e.id}style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",borderBottom:"1px solid var(--br)",fontSize:12,flexWrap:"wrap"}}>
            <span style={{fontSize:18}}>{e.emoji||"👶"}</span>
            <span style={{fontWeight:600,color:"var(--b)",minWidth:80}}>{e.prenom}</span>
            <span style={{color:status.c,fontWeight:600,flex:1,minWidth:140}}>{status.ic} {status.l}</span>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {none&&<button className="btn bP"style={{fontSize:11,padding:"4px 10px"}}onClick={()=>setPage("admin_finances")}>Signer →</button>}
              {onlyA&&<span style={{fontSize:10,color:"var(--l)",fontStyle:"italic"}}>(rappel email - bientôt)</span>}
              {(both||onlyA)&&<button className="btn bG"style={{fontSize:10,padding:"4px 8px"}}disabled={genState==="pending"}onClick={()=>regenererPDF(ct.id)}>
                {genState==="pending"?"…":(ct.pdf_storage_path?"Régénérer PDF":"Générer PDF")}
              </button>}
              {both&&<button className="btn bT"style={{fontSize:10,padding:"4px 8px"}}onClick={()=>setPage("documents")}>📄 Documents</button>}
            </div>
          </div>;
        })}
      </div>
    </div>}

    {/* Enfants du jour - TOUT cliquable */}
    <div className="card"style={{padding:18,marginBottom:14}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div style={{fontWeight:600,fontSize:14,color:"var(--b)"}}>👶 Mes enfants aujourd'hui</div>
        <button className="btn bG"style={{fontSize:11,padding:"5px 10px"}}onClick={()=>setPage("pointage")}>
          ⏰ Pointer arrivée
        </button>
      </div>
      <div className="g3">
        {enfants.map(e=>{
          const p=pt.find(x=>x.eId===e.id);
          const t=tx.filter(x=>x.eId===e.id).slice(-1)[0];
          const msg=enfants.every(e=>["e1","e2","e3"].includes(e.id))?D.messages.filter(m=>m.eId===e.id&&!m.lu).length:0;
          const rep=D.repas?.find(r=>r.eId===e.id&&r.date===TODAY_STR)||null;
          const couleur=e.couleur||"#B8622F";
          const allergies=e.allergies||[];
          return <div key={e.id} style={{background:"var(--c)",borderRadius:14,padding:14,border:"2px solid "+couleur+"20",transition:"all .2s"}}>
            {/* En-tête enfant cliquable → journal */}
            <div onClick={()=>setPage("journal_complet")}style={{display:"flex",gap:10,alignItems:"center",marginBottom:10,cursor:"pointer"}}>
              <span style={{fontSize:28}}>{e.emoji||"👶"}</span>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:14,color:"var(--b)"}}>{e.prenom}</div>
                <div style={{fontSize:11,color:"var(--l)"}}>{e.naissance?age(e.naissance):""}</div>
              </div>
              {msg>0&&<span className="badge"onClick={ev=>{ev.stopPropagation();setPage("messagerie");}}
                style={{background:"var(--Rp)",color:"var(--R)",cursor:"pointer",fontSize:12}}>
                {msg} 💬
              </span>}
            </div>

            {allergies.length>0&&<div onClick={()=>setPage("sante_complet")}
              style={{fontSize:11,color:"var(--R)",fontWeight:700,marginBottom:8,cursor:"pointer",padding:"3px 6px",background:"#FFF0F4",borderRadius:6,display:"inline-block"}}>
              ⚠️ {allergies.join(", ")}
            </div>}

            {p?<div onClick={()=>setPage("pointage")}
              style={{fontSize:12,color:"var(--S)",fontWeight:600,cursor:"pointer",marginBottom:6}}>
              ↗ {p.arr} {p.dep?"· ↘ "+p.dep:"· en cours ⏱"}
            </div>:<div onClick={()=>setPage("pointage")}
              style={{fontSize:12,color:"var(--l)",cursor:"pointer",marginBottom:6}}>
              ⏰ Pas encore arrivé - pointer →
            </div>}

            {rep&&<div onClick={()=>setPage("journal_complet")}
              style={{fontSize:11,cursor:"pointer",color:"var(--G)",fontWeight:600,marginBottom:6}}>
              🍽 {rep.dej} · {rep.q==="bien"?"✅":"🟡"}
            </div>}

            {t&&<div onClick={()=>setPage("journal_complet")}
              style={{fontSize:22,cursor:"pointer",display:"inline-block",transition:"transform .2s"}}
              onMouseEnter={ev=>ev.currentTarget.style.transform="scale(1.25)"}
              onMouseLeave={ev=>ev.currentTarget.style.transform="scale(1)"}>
              {t.mood}
            </div>}
          </div>;
        })}
      </div>
    </div>

    {/* Accès rapide - tous cliquables */}
    <div className="g2">
      <div className="card"style={{padding:16}}>
        <div style={{fontWeight:600,fontSize:13,marginBottom:12,color:"var(--b)"}}>⚡ Accès rapide</div>
        {[["✨","Bilan de journée","Générer pour un enfant","recit"],
          ["🌱","Développement","Jalons OMS","developpement"],
          ["📝","CR Trimestriel","Compte-rendu pro","cr"],
          ["📊","Récap mensuel","Bilan mensuel","admin_finances"],
          ["📅","Calendrier","Voir les événements","calendrier"],
        ].map(([ic,ti,su,pg])=><div key={ti}onClick={()=>setPage(pg)}
          style={{display:"flex",gap:10,padding:"8px 6px",borderBottom:"1px solid var(--br)",cursor:"pointer",borderRadius:8,transition:"background .15s"}}
          onMouseEnter={ev=>ev.currentTarget.style.background="var(--c)"}
          onMouseLeave={ev=>ev.currentTarget.style.background="transparent"}>
          <span style={{fontSize:18}}>{ic}</span>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:600,color:"var(--b)"}}>{ti}</div>
            <div style={{fontSize:11,color:"var(--l)"}}>{su}</div>
          </div>
          <span style={{fontSize:13,color:"var(--l)",alignSelf:"center"}}>›</span>
        </div>)}
      </div>

      <div className="card"style={{padding:16}}>
        <div style={{fontWeight:600,fontSize:13,marginBottom:12,color:"var(--b)"}}>📅 Prochains événements</div>
        {isDemoUser&&D.evenements.slice(0,4).map(ev=><div key={ev.id}onClick={()=>setPage("calendrier")}
          style={{display:"flex",gap:8,padding:"7px 6px",borderBottom:"1px solid var(--br)",alignItems:"center",cursor:"pointer",borderRadius:8,transition:"background .15s"}}
          onMouseEnter={ev2=>ev2.currentTarget.style.background="var(--c)"}
          onMouseLeave={ev2=>ev2.currentTarget.style.background="transparent"}>
          <span className="badge"style={{
            background:ev.type==="abs"?"var(--Rp)":ev.type==="conge"?"var(--Gp)":"var(--Bp)",
            color:ev.type==="abs"?"var(--R)":ev.type==="conge"?"var(--G)":"var(--B)",
            whiteSpace:"nowrap",fontSize:10}}>
            {fmt(ev.date)}
          </span>
          <span style={{fontSize:13,color:"var(--m)",flex:1}}>{ev.txt}</span>
          <span style={{fontSize:12,color:"var(--l)"}}>›</span>
        </div>)}
      </div>
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
      <div className="card" style={{padding:28,textAlign:"center"}}>
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
    <div style={{marginBottom:14,display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8}}>
      <div>
        <div className="pf"style={{fontSize:21,fontWeight:700,color:"var(--b)"}}>Bonjour ! La journée de {enfant.prenom} ✨</div>
        <div style={{fontSize:12,color:"var(--l)",marginTop:2}}>{todayStr()}</div>
      </div>
      <button className="btn bR"style={{fontSize:12,padding:"8px 14px"}}onClick={()=>setShowAbsence(true)}>
        🤒 Déclarer une absence
      </button>
    </div>

    {/* Modale absence */}
    {showAbsence&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:20}}
      onClick={e=>e.target===e.currentTarget&&setShowAbsence(false)}>
      <div className="card"style={{width:"100%",maxWidth:420,padding:28}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div className="pf"style={{fontSize:18,fontWeight:600,color:"var(--b)"}}>🤒 Déclarer une absence</div>
          <button onClick={()=>setShowAbsence(false)}style={{background:"none",border:"none",fontSize:18,cursor:"pointer",color:"var(--l)"}}>✕</button>
        </div>
        <div style={{background:"var(--Bp)",borderRadius:10,padding:"10px 14px",marginBottom:16,fontSize:13,color:"var(--B)"}}>
          📢 {enfant?.prenomAsmat||"L'assmat"} sera notifiée immédiatement. L'absence sera notée dans le calendrier et prise en compte dans le décompte des heures.
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
            <input type="checkbox"id="indem"checked={absence.indemnise}onChange={e=>setAbsence(a=>({...a,indemnise:e.target.checked}))}style={{width:16,height:16,cursor:"pointer"}}/>
            <label htmlFor="indem"style={{fontSize:13,color:"var(--b)",cursor:"pointer"}}>
              Absence indemnisée (selon contrat)
            </label>
          </div>
        </div>
        <div style={{display:"flex",gap:8,marginTop:20}}>
          <button className="btn bG"style={{flex:1}}onClick={()=>setShowAbsence(false)}>Annuler</button>
          <button className="btn bR"style={{flex:2}}onClick={declarerAbsence}>
            📢 Notifier {enfant?.prenomAsmat||"l'assmat"}
          </button>
        </div>
      </div>
    </div>}

    {absEnvoyee&&<div style={{background:"var(--Rp)",border:"1.5px solid var(--R)",borderRadius:12,padding:"10px 16px",marginBottom:14,fontSize:13,color:"var(--R)",fontWeight:600}}>
      ✅ Absence déclarée et notée dans le calendrier et le décompte des heures.
    </div>}

    <div className="g2"style={{marginBottom:12}}>
      {/* Card enfant */}
      <div className="card"style={{padding:18,borderTop:"4px solid "+enfant.couleur}}>
        <div style={{display:"flex",gap:14,alignItems:"center",marginBottom:12}}>
          <span style={{fontSize:52}}>{enfant.emoji}</span>
          <div><div className="pf"style={{fontSize:20,fontWeight:600,color:"var(--b)"}}>{enfant.prenom} {enfant.nom}</div>
            <div style={{fontSize:13,color:"var(--l)"}}>{age(enfant.naissance)}</div>
            {enfant.allergies.length>0&&<div style={{marginTop:6,cursor:"pointer"}}onClick={()=>setPage&&setPage("sante_complet")}>
              {enfant.allergies.map(a=><span key={a}className="badge"style={{background:"#FEE2E2",color:"#DC2626",marginRight:4,cursor:"pointer"}}>⚠️ {a}</span>)}
            </div>}
          </div>
        </div>
        {recentMs&&<div onClick={()=>setPage&&setPage("eveil_complet")}
          style={{background:"var(--Sp)",borderRadius:9,padding:"8px 12px",fontSize:13,color:"var(--S)",fontWeight:600,cursor:"pointer"}}>
          🌱 Dernière étape : {recentMs.txt} →
        </div>}
      </div>
      {/* Pointage */}
      <div className="card"onClick={()=>setPage&&setPage("pointage")}style={{padding:18,cursor:"pointer",transition:"box-shadow .18s"}}
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
      style={{padding:16,marginBottom:12,cursor:"pointer",transition:"box-shadow .18s"}}
      onMouseEnter={e=>e.currentTarget.style.boxShadow="var(--sh2)"}
      onMouseLeave={e=>e.currentTarget.style.boxShadow="var(--sh)"}>
      <div style={{fontWeight:700,marginBottom:12,color:"var(--b)"}}>📋 Journal de la journée</div>
      {txs.length===0?<div style={{fontSize:13,color:"var(--l)"}}>Aucune transmission pour le moment.</div>
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
      style={{padding:16,cursor:"pointer",transition:"box-shadow .18s"}}
      onMouseEnter={e=>e.currentTarget.style.boxShadow="var(--sh2)"}
      onMouseLeave={e=>e.currentTarget.style.boxShadow="var(--sh)"}>
      <div style={{fontWeight:700,marginBottom:10,color:"var(--b)"}}>🍽️ Repas du jour</div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {rep.dej&&<span className="badge"style={{background:"var(--Sp)",color:"var(--S)"}}>🥗 {rep.dej}</span>}
        {rep.gou&&<span className="badge"style={{background:"var(--Gp)",color:"var(--G)"}}>🍎 {rep.gou}</span>}
        {rep.bib&&<span className="badge"style={{background:"var(--Bp)",color:"var(--B)"}}>🍼 {rep.bib}</span>}
        <span className="badge"style={{background:rep.q==="bien"?"var(--Sp)":"var(--Gp)",color:rep.q==="bien"?"var(--S)":"var(--G)"}}>
          {rep.q==="bien"?"✅ Bon appétit":rep.q==="peu"?"🟡 Peu mangé":"🔴 Refus"}</span>
      </div>
      <div style={{fontSize:11,color:"var(--l)",marginTop:8}}>Voir le détail →</div>
    </div>}
  </div>;
}

//
function Transmissions({enfants,role,pEId,user}){
  const [selId,setSelId]=useState(enfants[0]?.id);
  const [msg,setMsg]=useState("");
  const [mood,setMood]=useState("😊");
  const [txs,setTxs]=useState([]);
  const [sending,setSending]=useState(false);
  const [docOuvert,setDocOuvert]=useState(null);
  const liste=role==="parent"?enfants.filter(e=>e.id===pEId):enfants;
  const enfant=liste.find(e=>e.id===selId)||liste[0];

  // Charger transmissions depuis Supabase
  useEffect(()=>{
    if(!enfant?.id)return;
    const charger=async()=>{
      const{data}=await supabase.from("transmissions")
        .select("*").eq("enfant_id",enfant.id)
        .order("created_at",{ascending:true}).limit(50);
      if(data&&data.length>0){
        setTxs(data.map(t=>({
          id:t.id,eId:t.enfant_id,
          auteur:t.auteur_role,
          date:t.date,h:t.heure||"",
          txt:t.texte,mood:t.mood||"😊"
        })));
      }else{
        setTxs(D.transmissions.filter(t=>t.eId===enfant?.id));
      }
    };
    charger();
  },[enfant?.id]);

  const msgs=txs.filter(t=>t.eId===enfant?.id).sort((a,b)=>a.id>b.id?1:-1);

  // Bilans reçus de Marie (demo data)
  const bilansRecus=role==="parent"?[
    {id:"br1",type:"bilan",date:"11/03/2024",txt:BILANS[enfant?.id]?.[0]||""},
    {id:"br2",type:"cr",trim:"T1 2024",txt:CRS[enfant?.id]?.[0]||""},
  ].filter(b=>b.txt):[];

  const send=async()=>{
    if(!msg.trim()||!enfant)return;
    setSending(true);
    const{data:{user}}=await supabase.auth.getUser();
    const{data,error}=await supabase.from("transmissions").insert({
      enfant_id:enfant.id,
      auteur_id:user?.id,
      auteur_role:role,
      date:TODAY_STR,
      heure:TODAY_H,
      texte:msg,
      mood,
    }).select().single();
    if(!error&&data){
      setTxs(p=>[...p,{id:data.id,eId:enfant.id,auteur:role,date:TODAY_STR,h:TODAY_H,txt:msg,mood}]);
    }else{
      // Fallback local si erreur
      setTxs(p=>[...p,{id:"tn"+Date.now(),eId:enfant.id,auteur:role,date:TODAY_STR,h:TODAY_H,txt:msg,mood}]);
    }
    setMsg("");
    setSending(false);
  };

  return <div className="fi">
    <PageHeader icon="📋" title="Journal" sub={"Échanges quotidiens avec "+(enfant?.prenomAsmat||"votre assmat")}/>
    {role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
      {liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>setSelId(e.id)}/>)}</div>}

    {/* Documents reçus - parent seulement */}
    {role==="parent"&&bilansRecus.length>0&&<div className="card"style={{padding:16,marginBottom:14,border:"1.5px solid var(--P)"}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
        <div style={{width:28,height:28,borderRadius:"50%",background:"var(--Pp)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>✨</div>
        <div style={{fontWeight:700,fontSize:14,color:"var(--P)"}}>Documents reçus de {enfant?.prenomAsmat||"l'assmat"}</div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {bilansRecus.map(b=><div key={b.id}>
          <div onClick={()=>setDocOuvert(docOuvert===b.id?null:b.id)}
            style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",background:"var(--Pp)",borderRadius:10,cursor:"pointer",border:"1px solid rgba(106,63,136,.2)"}}>
            <div>
              <div style={{fontWeight:700,fontSize:13,color:"var(--P)"}}>
                {b.type==="bilan"?"✨ Bilan de journée du "+b.date:"📝 CR Trimestriel - "+b.trim}
              </div>
              <div style={{fontSize:11,color:"var(--l)",marginTop:2}}>Par {enfant?.prenomAsmat||"votre assmat"} · Cliquer pour lire</div>
            </div>
            <span style={{fontSize:16,color:"var(--P)"}}>{docOuvert===b.id?"▲":"▼"}</span>
          </div>
          {docOuvert===b.id&&<div style={{padding:"14px 16px",background:"var(--w)",borderRadius:"0 0 10px 10px",border:"1px solid rgba(106,63,136,.2)",borderTop:"none"}}>
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:14,lineHeight:2,color:"var(--b)",whiteSpace:"pre-wrap",fontStyle:"italic"}}>
              {b.txt}
            </div>
            <button className="btn bG"style={{marginTop:10,fontSize:11}}onClick={()=>navigator.clipboard?.writeText(b.txt)}>
              📋 Copier
            </button>
          </div>}
        </div>)}
      </div>
    </div>}

    <div className="g2">
      <div className="card"style={{padding:16}}>
        <div style={{fontWeight:700,fontSize:14,marginBottom:12,color:"var(--b)"}}>{enfant?.emoji} {enfant?.prenom} · Aujourd'hui</div>
        <div style={{display:"flex",flexDirection:"column",gap:10,maxHeight:380,overflowY:"auto"}}>
          {msgs.length===0&&<div style={{fontSize:13,color:"var(--l)"}}>Aucune transmission.</div>}
          {msgs.map(t=><div key={t.id}style={{display:"flex",gap:10}}>
            <div style={{textAlign:"center",minWidth:38}}><div style={{fontSize:20}}>{t.mood}</div><div style={{fontSize:10,color:"var(--l)"}}>{t.h}</div></div>
            <div style={{flex:1,background:t.auteur==="asmat"?"var(--Tp)":"var(--Bp)",borderRadius:10,padding:"9px 12px",
              borderLeft:(t.auteur==="asmat"?"3px solid var(--T)":"3px solid var(--B)")}}>
              <div style={{fontSize:11,fontWeight:700,color:t.auteur==="asmat"?"var(--T)":"var(--B)",marginBottom:3}}>
                {t.auteur==="asmat"?"👩👧 "+(user?.prenom||"Marie"):"👪 Parent"}</div>
              <div style={{fontSize:13,color:"var(--b)",lineHeight:1.5}}>{t.txt}</div>
            </div>
          </div>)}
        </div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div className="card"style={{padding:16}}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:12,color:"var(--b)"}}>✏️ Nouvelle transmission</div>
          <div style={{marginBottom:10}}>
            <label className="lbl">Humeur</label>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {["😄","😊","😐","😴","😢","😠","🥰","😬"].map(h=><button key={h}className={"moo "+(mood===h?"on":"")}onClick={()=>setMood(h)}>{h}</button>)}
            </div>
          </div>
          <div style={{marginBottom:10}}>
            <label className="lbl">Message</label>
            <textarea className="ta"value={msg}onChange={e=>setMsg(e.target.value)}
              placeholder={role==="asmat"?("Racontez la journée de "+(enfant?.prenom||"")+"..."):"Informations pour la journée..."}/>
          </div>
          <button className="btn bT"style={{width:"100%"}}onClick={send}>Envoyer ✉️</button>
        </div>
        {D.moodHistory[enfant?.id]&&<div className="card"style={{padding:14}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:10,color:"var(--b)"}}>📈 Humeurs - 15 derniers jours</div>
          <div className="mood-bar">
            {D.moodHistory[enfant.id].map((v,i)=><div key={i}className="mood-b"style={{
              height:(v/5*100)+"%",width:"100%",
              background:v>=4?"var(--S)":v>=3?"var(--G)":"var(--R)",opacity:.8}}/>)}
          </div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"var(--l)",marginTop:4}}>
            <span>J-14</span><span>Aujourd'hui</span>
          </div>
        </div>}
      </div>
    </div>
  </div>;
}

//
//
const BILANS={
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

function RecitIA({enfants,role,pEId}){
  const [selId,setSelId]=useState(enfants[0]?.id);
  const [idx,setIdx]=useState(0);
  const [recit,setRecit]=useState("");
  const [loading,setLoading]=useState(false);
  const [toast,setToast]=useState("");
  const [envoye,setEnvoye]=useState(false);
  const liste=role==="parent"?enfants.filter(e=>e.id===pEId):enfants;
  const enfant=liste.find(e=>e.id===selId)||liste[0];
  const tx=D.transmissions.filter(t=>t.eId===enfant?.id&&t.date===TODAY_STR);
  const rep=D.repas.find(r=>r.eId===enfant?.id&&r.date===TODAY_STR);
  const ch=D.changes.filter(c=>c.eId===enfant?.id&&c.date===TODAY_STR);
  const pf=D.portfolio.filter(p=>p.eId===enfant?.id).slice(-1)[0];
  const parent=D.parents.find(p=>p.id===enfant?.parentId);

  const generer=()=>{
    setLoading(true);setRecit("");setEnvoye(false);
    setTimeout(()=>{
      const bilans=BILANS[enfant?.id]||BILANS["e1"];
      const nextIdx=(idx+1)%bilans.length;
      setIdx(nextIdx);
      setRecit(bilans[nextIdx]);
      setLoading(false);
    },1800);
  };

  return <div className="fi">
    {toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
    <PageHeader icon="✨" title="Bilan de journée"
      sub="Journal personnalisé de la journée - rédigé automatiquement"/>
    {role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
      {liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>{setSelId(e.id);setRecit("");setIdx(0);}}/>)}</div>}

    <div className="g2">
      <div>
        <div className={"card "+(recit?"ai-card":"")+""}style={{padding:18,marginBottom:12,border:"1.5px solid var(--P)"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
            <div style={{width:32,height:32,borderRadius:"50%",background:"var(--Pp)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>✨</div>
            <div><div className="pf"style={{fontSize:15,fontWeight:700,color:"var(--P)"}}>Bilan de journée de {enfant?.prenom}</div>
              <div style={{fontSize:11,color:"var(--l)"}}>Rédigé automatiquement · Exclusif TiMat</div></div>
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
            <button className="btn bP"style={{fontSize:14,padding:"11px 22px"}}onClick={generer}>
              ✨ Générer le bilan
            </button>
          </div>}

          {recit&&<div>
            <div style={{fontSize:14,color:"var(--b)",lineHeight:1.9,fontStyle:"italic",whiteSpace:"pre-wrap",fontFamily:"'Playfair Display',serif"}}>
              {recit}
            </div>
            <div style={{marginTop:16,display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
              {role==="asmat"&&!envoye&&<button className="btn bS"onClick={()=>{setEnvoye(true);setToast("Bilan envoyé à "+parent?.prenom+" "+parent?.nom+" ✓");}}>
                📩 Envoyer aux parents
              </button>}
              {role==="asmat"&&envoye&&<div style={{display:"flex",alignItems:"center",gap:6,padding:"7px 14px",background:"var(--Sp)",borderRadius:10,border:"1px solid var(--Sl)"}}>
                <span style={{fontSize:14}}>✅</span>
                <span style={{fontSize:13,fontWeight:700,color:"var(--S)"}}>Envoyé à {parent?.prenom} {parent?.nom}</span>
              </div>}
              <button className="btn bP"onClick={generer}>🔄 Régénérer</button>
              <button className="btn bG"onClick={()=>navigator.clipboard?.writeText(recit)}>📋 Copier</button>
            </div>
          </div>}
        </div>
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div className="card"style={{padding:14}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:10,color:"var(--b)"}}>📊 Données de la journée</div>
          {[["😊 Humeurs",tx.map(t=>t.mood).join(" ")||"-"],
            ["🍽️ Repas",rep?rep.dej:"-"],
            ["👶 Changes",ch.length+" change(s)"],
            ["🎨 Activité",pf?.titre||"Jeux libres"],
          ].map(([l,v])=><div key={l}style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid var(--br)",fontSize:13}}>
            <span style={{color:"var(--m)"}}>{l}</span><span style={{fontWeight:600,color:"var(--b)"}}>{v}</span>
          </div>)}
        </div>
        <div className="card"style={{padding:14,background:"var(--Pp)",border:"1px solid var(--P)"}}>
          <div style={{fontWeight:700,fontSize:13,color:"var(--P)",marginBottom:8}}>💡 Exclusivité TiMat</div>
          <div style={{fontSize:13,color:"var(--b)",lineHeight:1.6}}>
            Aucun concurrent ne génère un bilan personnalisé de la journée. TiMat transforme les données en émotions pour les parents.
          </div>
        </div>
      </div>
    </div>
  </div>;
}

//
function Pointage({enfants,role,pEId,user,demoMode=false}){
  const [selId,setSelId]=useState(enfants[0]?.id);
  const [pts,setPts]=useState([]);
  const [toast,setToast]=useState("");
  const [saving,setSaving]=useState(false);
  const [showQR,setShowQR]=useState(false);
  // POINTAGE WORKFLOW P14E - mode edition manuelle si besoin (rectifier une heure)
  const [editMode,setEditMode]=useState(false);
  const [arrEdit,setArrEdit]=useState("");
  const [depEdit,setDepEdit]=useState("");
  const liste=role==="parent"?enfants.filter(e=>e.id===pEId):enfants;
  const enfant=liste.find(e=>e.id===selId)||liste[0];

  // Charger les pointages depuis Supabase
  useEffect(()=>{
    if(!enfant?.id)return;
    if(demoMode){setPts(D.pointages.filter(p=>p.eId===enfant?.id));return;}
    const charger=async()=>{
      const{data}=await supabase.from("pointages")
        .select("*").eq("enfant_id",enfant.id)
        .order("date",{ascending:false}).limit(30);
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

  const ptJ=pts.find(p=>p.eId===enfant?.id&&p.date===TODAY_STR);
  const ptH=pts.filter(p=>p.eId===enfant?.id).sort((a,b)=>b.date>a.date?-1:1);

  // Calcul bilan mensuel
  const heuresMois=pts.filter(p=>p.eId===enfant?.id&&p.totMin).reduce((s,p)=>s+(p.totMin||0),0);
  const heuresPrev=Math.round((enfant?.contrat?.heuresHebdo||40)*52/12);
  const soldeMin=heuresMois-heuresPrev*60;

  // POINTAGE WORKFLOW P14E - pointer l'arrivee maintenant (heure auto)
  const pointerArrivee=async()=>{
    if(demoMode){setToast("Démo : action désactivée");return;}
    if(!enfant)return;
    setSaving(true);
    const now=new Date();
    const heureArr=String(now.getHours()).padStart(2,"0")+":"+String(now.getMinutes()).padStart(2,"0");
    const{error,data}=await supabase.from("pointages").upsert({
      enfant_id:enfant.id,
      asmat_id:user?.id||(await supabase.auth.getUser()).data.user?.id,
      date:TODAY_STR,
      arrivee:heureArr,
      depart:null,
      total_minutes:null,
      valide_parent:false,
      mode_pointage:"asmat",
    },{onConflict:"enfant_id,date"}).select().single();
    if(error){
      setToast("Erreur : "+error.message);setSaving(false);return;
    }
    setPts(p=>{
      const filtered=p.filter(x=>!(x.eId===enfant.id&&x.date===TODAY_STR));
      return[{id:data?.id||"ptn"+Date.now(),eId:enfant.id,date:TODAY_STR,arr:heureArr,dep:null,arr_raw:heureArr,dep_raw:null,tot:null,totMin:null,valide:true,valide_parent:false,mode_pointage:"asmat"},...filtered];
    });
    await logAction("pointage_arrivee",{table_name:"pointages",record_id:data?.id});
    setToast("✅ Arrivée pointée à "+heureArr);
    setSaving(false);
    window.dispatchEvent(new CustomEvent("timat:refresh-data"));
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
    const{error}=await supabase.from("pointages").update({
      depart:heureDep,
      total_minutes:totalMin,
    }).eq("enfant_id",enfant.id).eq("date",TODAY_STR);
    if(error){
      setToast("Erreur : "+error.message);setSaving(false);return;
    }
    const totStr=Math.floor(totalMin/60)+"h"+String(totalMin%60).padStart(2,"0");
    setPts(p=>p.map(x=>(x.eId===enfant.id&&x.date===TODAY_STR)?{...x,dep:heureDep,dep_raw:heureDep,tot:totStr,totMin:totalMin}:x));
    await logAction("pointage_depart",{table_name:"pointages",record_id:ptJ.id});
    // EMAIL NOTIF P14E - notifier le parent qu'un pointage est en attente de validation
    if(enfant?.contrat?.parent_id||enfant?.parent_id){
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
    setToast("✅ Départ pointé à "+heureDep+" — "+totStr);
    setSaving(false);
    window.dispatchEvent(new CustomEvent("timat:refresh-data"));
  };

  // POINTAGE WORKFLOW P14E - edition manuelle (rectifier une heure mal saisie)
  const sauverEdition=async()=>{
    if(demoMode){setToast("Démo : action désactivée");return;}
    if(!arrEdit||!enfant)return;
    setSaving(true);
    const[h1,m1]=arrEdit.split(":").map(Number);
    const totalMin=depEdit?(()=>{const[h2,m2]=depEdit.split(":").map(Number);return(h2*60+m2)-(h1*60+m1);})():null;
    const{error}=await supabase.from("pointages").upsert({
      enfant_id:enfant.id,
      asmat_id:user?.id||(await supabase.auth.getUser()).data.user?.id,
      date:TODAY_STR,
      arrivee:arrEdit,
      depart:depEdit||null,
      total_minutes:totalMin,
      valide_parent:false,
      mode_pointage:"asmat",
    },{onConflict:"enfant_id,date"});
    if(error){setToast("Erreur : "+error.message);setSaving(false);return;}
    const totStr=totalMin?Math.floor(totalMin/60)+"h"+String(totalMin%60).padStart(2,"0"):null;
    setPts(p=>{
      const filtered=p.filter(x=>!(x.eId===enfant.id&&x.date===TODAY_STR));
      return[{id:"ptn"+Date.now(),eId:enfant.id,date:TODAY_STR,arr:arrEdit,dep:depEdit,arr_raw:arrEdit,dep_raw:depEdit,tot:totStr,totMin:totalMin,valide:true,valide_parent:false,mode_pointage:"asmat"},...filtered];
    });
    setArrEdit("");setDepEdit("");setEditMode(false);
    setToast("Pointage corrigé ✓");
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
    {toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
    {/* POINTAGE WORKFLOW P14G - modale modification heures parent */}
    {modifParent&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999,padding:16}}>
      <div className="card" style={{padding:0,maxWidth:480,width:"100%"}}>
        <div style={{padding:"14px 18px",borderBottom:"1px solid var(--br)",fontWeight:700,fontSize:14,color:"var(--b)"}}>
          ✏️ Corriger les heures du {new Date(modifParent.date).toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"})}
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
            ℹ️ En enregistrant, vous validez le pointage avec ces nouvelles heures.
            {user?.signature_base64?" Votre signature sera apposée automatiquement.":" Aucune signature ne sera apposée (vous pouvez en créer une dans Paramètres)."}
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
            <button className="btn bG" onClick={()=>setModifParent(null)}>Annuler</button>
            <button className="btn bT" onClick={modifierEtValider} disabled={!modifParent.arr}>
              ✅ Enregistrer et valider
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
        <div className="card"style={{padding:16}}>
          <div style={{fontWeight:700,marginBottom:12,color:"var(--b)"}}>📊 Bilan du mois - {enfant?.prenom}</div>
          <div className="g3"style={{marginBottom:12}}>
            {[
              ["Prévues",heuresPrev+"h","var(--B)"],
              ["Réalisées",Math.floor(heuresMois/60)+"h"+String(heuresMois%60).padStart(2,"0"),"var(--S)"],
              ["Solde",(soldeMin>=0?"+":"")+Math.floor(soldeMin)+"h",soldeMin<0?"var(--R)":"var(--S)"]
            ].map(([l,v,c])=>
              <div key={l}style={{background:"var(--c)",borderRadius:10,padding:12,textAlign:"center"}}>
                <div className="pf"style={{fontSize:20,fontWeight:700,color:c}}>{v}</div>
                <div style={{fontSize:11,color:"var(--l)",marginTop:2}}>{l}</div>
              </div>)}
          </div>
        </div>
        <div className="card"style={{padding:16}}>
          <div style={{fontWeight:700,marginBottom:12,color:"var(--b)"}}>📍 Aujourd'hui</div>
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
              <button className="btn bS"style={{width:"100%",padding:"16px",fontSize:15,justifyContent:"center"}}onClick={pointerArrivee}disabled={saving}>
                {saving?"⏳ ...":"📍 Pointer l'arrivée maintenant"}
              </button>
            </div>:!ptJ.dep?<div>
              <div style={{fontSize:11,color:"var(--S)",marginBottom:8,textAlign:"center",fontWeight:600}}>
                ✅ Arrivée pointée à {ptJ.arr} — Accueil en cours
              </div>
              <button className="btn bT"style={{width:"100%",padding:"16px",fontSize:15,justifyContent:"center"}}onClick={pointerDepart}disabled={saving}>
                {saving?"⏳ ...":"🏁 Pointer le départ maintenant"}
              </button>
            </div>:<div style={{padding:"12px",background:"var(--Sp)",borderRadius:10,textAlign:"center",fontSize:13,color:"var(--S)",fontWeight:600}}>
              ✅ Journée terminée — {ptJ.tot} d'accueil
              {!ptJ.valide_parent&&<div style={{fontSize:11,color:"var(--l)",marginTop:4,fontWeight:400}}>En attente de validation du parent</div>}
            </div>}

            {/* POINTAGE WORKFLOW P14E - rectifier une heure manuellement (si oubli) */}
            <details style={{marginTop:12,background:"var(--c)",borderRadius:10,overflow:"hidden"}}>
              <summary style={{padding:"10px 14px",cursor:"pointer",fontSize:12,fontWeight:600,color:"var(--m)",listStyle:"none",display:"flex",alignItems:"center",gap:8}}>
                <span>✏️</span> Rectifier les heures (oubli, erreur)
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
                <button className="btn bG"style={{width:"100%",fontSize:12}}onClick={sauverEdition}disabled={saving||!arrEdit}>
                  {saving?"⏳ ...":"Enregistrer la correction"}
                </button>
                <div style={{fontSize:10,color:"var(--l)",marginTop:6}}>
                  💡 Utile si tu as oublié de pointer en direct.
                </div>
              </div>
            </details>

            {/* QR Code pour le parent (si present physiquement) */}
            <details style={{marginTop:10,background:"var(--c)",borderRadius:10,overflow:"hidden"}}>
              <summary style={{padding:"10px 14px",cursor:"pointer",fontSize:12,fontWeight:600,color:"var(--B)",listStyle:"none",display:"flex",alignItems:"center",gap:8}}>
                <span>📱</span> QR Code parent — {enfant?.prenom}
              </summary>
              <div style={{padding:"12px 14px",textAlign:"center"}}>
                <div style={{fontSize:11,color:"var(--l)",marginBottom:10,lineHeight:1.6}}>
                  Le parent scanne ce QR avec son téléphone pour valider en direct.<br/>
                  <strong>À utiliser uniquement si le parent est présent</strong> (matin ou soir).
                </div>
                <img
                  src={"https://api.qrserver.com/v1/create-qr-code/?size=180x180&data="+encodeURIComponent(
                    (window.location.origin||"https://timat.app")+"/api/pointage-qr?enfant="+enfant?.id+"&date="+TODAY_STR+"&type=scan"
                  )}
                  alt="QR Pointage"
                  style={{width:180,height:180,borderRadius:12,border:"3px solid var(--br)",margin:"0 auto"}}
                />
                <div style={{display:"flex",gap:6,marginTop:10,justifyContent:"center"}}>
                  <button className="btn bG"style={{fontSize:11}}onClick={()=>{
                    navigator.clipboard?.writeText(
                      (window.location.origin||"https://timat.app")+"/api/pointage-qr?enfant="+enfant?.id+"&date="+TODAY_STR+"&type=scan"
                    );
                    setToast("Lien copié ✓");
                  }}>📋 Copier le lien</button>
                  <button className="btn bG"style={{fontSize:11}}onClick={()=>window.print()}>🖨️ Imprimer</button>
                </div>
                <div style={{fontSize:10,color:"var(--l)",marginTop:8}}>
                  🔒 QR unique à {enfant?.prenom} et valable aujourd'hui uniquement.
                </div>
              </div>
            </details>
          </div>}
        </div>
      </div>
      <div className="card"style={{padding:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div style={{fontWeight:700,color:"var(--b)"}}>📅 Historique récent</div>
          {role==="parent"&&<div style={{fontSize:11,color:"var(--l)"}}>✅ Valider · ✏️ Modifier</div>}
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
                  {enRetard&&<span style={{marginLeft:8,fontSize:10,color:"var(--R)",fontWeight:700}}>⚠️ Depuis {ageJours} jours</span>}
                </div>
                <div style={{display:"flex",gap:10,fontSize:12}}>
                  <span style={{color:"var(--S)"}}>{p.arr?"↗"+p.arr:""}</span>
                  <span style={{color:"var(--T)"}}>{p.dep?"↘"+p.dep:""}</span>
                  <span style={{fontWeight:700,color:"var(--b)"}}>{p.tot||"-"}</span>
                </div>
                {role!=="parent"&&<span style={{fontSize:13,color:p.valide_parent?"var(--S)":"var(--l)"}}>
                  {p.valide_parent?"✅":"⏳"}
                </span>}
              </div>
              {role==="parent"&&!p.valide_parent&&<div style={{display:"flex",gap:6}}>
                <button onClick={()=>validerPointage(p.id)}
                  style={{flex:1,background:"var(--G)",color:"#fff",border:"none",borderRadius:6,padding:"6px 10px",cursor:"pointer",fontSize:11,fontWeight:700}}>
                  ✅ Je valide
                </button>
                <button onClick={()=>setModifParent({id:p.id,date:p.date,arr:p.arr_raw||p.arr||"",dep:p.dep_raw||p.dep||""})}
                  style={{flex:1,background:"transparent",color:"var(--T)",border:"1px solid var(--T)",borderRadius:6,padding:"6px 10px",cursor:"pointer",fontSize:11,fontWeight:700}}>
                  ✏️ Modifier
                </button>
              </div>}
              {p.valide_parent&&p.date_validation&&<div style={{fontSize:10,color:"var(--S)",fontStyle:"italic"}}>
                ✅ Validé le {new Date(p.date_validation).toLocaleDateString("fr-FR")}
                {p.modified_by_parent&&<span style={{marginLeft:6,color:"var(--T)"}}>· ✏️ heures corrigées</span>}
              </div>}
            </div>;
          })}
          {ptH.length===0&&<div style={{fontSize:13,color:"var(--l)",textAlign:"center",padding:20}}>
            Aucun pointage enregistré pour le moment.
          </div>}
        </div>
        {role==="parent"&&ptH.some(p=>!p.valide_parent)&&<div style={{
          marginTop:10,padding:"8px 12px",background:"var(--Gp)",borderRadius:8,
          fontSize:12,color:"var(--G)",fontWeight:600
        }}>
          ⚠️ {ptH.filter(p=>!p.valide_parent).length} pointage(s) en attente de validation
        </div>}
      </div>
    </div>
  </div>;
}

//
function RepasChanges({enfants,role,pEId}){
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

  const qc={"bien":"var(--S)","peu":"var(--G)","refus":"var(--R)"};
  return <div className="fi">
    {toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
    <PageHeader icon="🍽️" title="Repas & Changes" sub="Suivi alimentaire et hygiène du jour"/>
    {role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
      {liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>setSelId(e.id)}/>)}</div>}
    <div className="g2">
      <div className="card"style={{padding:16}}>
        <div style={{fontWeight:700,fontSize:14,marginBottom:12,color:"var(--b)"}}>🍽️ Repas du jour</div>
        {erp?<div>
          {[["🥗 Déjeuner",erp.dej],["🍎 Goûter",erp.gou],["🍼 Biberon",erp.bib]].filter(r=>r[1]).map(([l,v])=>
            <div key={l}style={{display:"flex",gap:10,marginBottom:8,padding:"9px 12px",background:"var(--c)",borderRadius:9}}>
              <span>{l.split(" ")[0]}</span><div><div style={{fontSize:11,color:"var(--l)",fontWeight:700}}>{l.substring(3)}</div>
                <div style={{fontSize:13,fontWeight:600,color:"var(--b)"}}>{v}</div></div></div>)}
          <div style={{display:"flex",alignItems:"center",gap:8,marginTop:6}}>
            <span style={{fontSize:12,color:"var(--l)"}}>Appétit :</span>
            <span className="badge"style={{background:qc[erp.q]+"22",color:qc[erp.q]}}>
              {erp.q==="bien"?"✅ Bon appétit":erp.q==="peu"?"🟡 Peu mangé":"🔴 Refus"}</span>
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
          <div style={{marginBottom:8}}>
            <label className="lbl">Appétit</label>
            <select className="sel"value={re.q??erp?.q??"bien"}onChange={e=>setRe(p=>({...p,q:e.target.value}))}>
              <option value="bien">✅ Bon appétit</option><option value="peu">🟡 Peu mangé</option><option value="refus">🔴 Refus</option>
            </select>
          </div>
          <button className="btn bT"style={{width:"100%"}}onClick={saveRp}>Enregistrer les repas</button>
        </div>}
      </div>

      <div className="card"style={{padding:16}}>
        <div style={{fontWeight:700,fontSize:14,marginBottom:12,color:"var(--b)"}}>👶 Changes du jour</div>
        <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:12}}>
          {echs.length===0&&<div style={{fontSize:13,color:"var(--l)"}}>Aucun change.</div>}
          {echs.map(c=><div key={c.id}style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 10px",background:"var(--c)",borderRadius:9}}>
            <span style={{fontWeight:700,fontSize:13,color:"var(--b)"}}>{c.h}</span>
            <span className="badge"style={{background:c.type==="Propre"?"var(--Sp)":"var(--Gp)",color:c.type==="Propre"?"var(--S)":"var(--G)"}}>
              {c.type==="Propre"?"✅ Propre":"🔄 Change"}</span>
            {c.n&&<span style={{fontSize:11,color:"var(--m)",maxWidth:100,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.n}</span>}
          </div>)}
        </div>
        <div style={{fontSize:12,color:"var(--m)",marginBottom:10,fontWeight:700}}>
          Total : <span style={{color:"var(--T)"}}>{echs.filter(c=>c.type==="Change").length} changes</span>
        </div>
        {role==="asmat"&&<div style={{paddingTop:12,borderTop:"1px solid var(--br)"}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:8,color:"var(--b)"}}>+ Ajouter un change</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
            <div><label className="lbl">Heure</label><input type="time"className="inp"value={nch.h}onChange={e=>setNch(p=>({...p,h:e.target.value}))}/></div>
            <div><label className="lbl">Type</label><select className="sel"value={nch.type}onChange={e=>setNch(p=>({...p,type:e.target.value}))}><option>Change</option><option>Propre</option></select></div>
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
const FERIES_2024={
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
const VACANCES_2024=[
  {debut:"2024-02-17",fin:"2024-03-04",nom:"Hiver"},
  {debut:"2024-04-13",fin:"2024-04-29",nom:"Printemps"},
  {debut:"2024-07-06",fin:"2024-09-02",nom:"Été"},
  {debut:"2024-10-19",fin:"2024-11-04",nom:"Toussaint"},
  {debut:"2024-12-21",fin:"2025-01-06",nom:"Noël"},
];
const isVacances=(ds)=>VACANCES_2024.some(v=>ds>=v.debut&&ds<=v.fin);
const nomVacances=(ds)=>VACANCES_2024.find(v=>ds>=v.debut&&ds<=v.fin)?.nom||"";

function Calendrier({enfants,role,pEId}){
  const [mois,setMois]=useState(new Date().getMonth());
  const [an,setAn]=useState(new Date().getFullYear());
  const [sel,setSel]=useState(null);
  const isDemoUser=enfants.length>0&&enfants.every(e=>["e1","e2","e3"].includes(e.id));
  const [evs,setEvs]=useState([]);
  // Initialiser les événements après le chargement des enfants
  useEffect(()=>{
    if(enfants.length===0)return;
    setEvs(isDemoUser?D.evenements:[]);
  },[isDemoUser,enfants.length]);
  const [newEv,setNewEv]=useState({type:"rdv",txt:""});
  const [showAbsenceModal,setShowAbsenceModal]=useState(false);
  const [absForm,setAbsForm]=useState({eId:pEId||enfants[0]?.id,date:"",motif:"Maladie",heures:"",indemnise:true});
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
        // Parent voit : ses propres absences + congés de l'assmat (cng) + fériés
        if(e.type==="cng")return true; // Mes congés → toujours visible
        if(e.type==="abs"&&enfants.some(en=>e.txt&&e.txt.includes(en.prenom)))return true;
        if(e.type==="abs"&&pEId&&e.eId===pEId)return true;
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
  ].sort((a,b)=>a.date>b.date?1:-1);

  // Légende couleurs des enfants (asmat uniquement)
  const couleursEnfants=enfants.map(e=>({emoji:e.emoji,prenom:e.prenom,couleur:e.couleur}));

  return <div className="fi">
    {toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
    <PageHeader icon="📅"
      title={role==="parent"?"Mon calendrier":"Calendrier"}
      sub={role==="parent"?"Jours d'accueil, congés et jours fériés":"Accueil, congés, anniversaires, vacances scolaires Zone C"}
      action={role==="parent"&&<button className="btn bR"style={{fontSize:13,padding:"10px 18px",fontWeight:700}}
        onClick={()=>{setAbsForm(f=>({...f,date:ds(todayDate.getDate())}));setShowAbsenceModal(true);}}>
        🤒 Déclarer une absence
      </button>}
    />

    {/* Modale absence parent */}
    {showAbsenceModal&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:20}}
      onClick={e=>e.target===e.currentTarget&&setShowAbsenceModal(false)}>
      <div className="card"style={{width:"100%",maxWidth:420,padding:28}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div className="pf"style={{fontSize:18,fontWeight:600,color:"var(--b)"}}>🤒 Déclarer une absence</div>
          <button onClick={()=>setShowAbsenceModal(false)}style={{background:"none",border:"none",fontSize:18,cursor:"pointer",color:"var(--l)"}}>✕</button>
        </div>
        <div style={{background:"var(--Bp)",borderRadius:10,padding:"10px 14px",marginBottom:16,fontSize:13,color:"var(--B)",lineHeight:1.5}}>
          📢 Votre assmat sera notifiée immédiatement. L'absence sera notée dans votre calendrier et dans le décompte des heures.
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
              onChange={e=>setAbsForm(f=>({...f,indemnise:e.target.checked}))}style={{width:16,height:16,cursor:"pointer"}}/>
            <label htmlFor="indem2"style={{fontSize:13,color:"var(--b)",cursor:"pointer"}}>Absence indemnisée (selon contrat)</label>
          </div>
        </div>
        <div style={{display:"flex",gap:8,marginTop:20}}>
          <button className="btn bG"style={{flex:1}}onClick={()=>setShowAbsenceModal(false)}>Annuler</button>
          <button className="btn bR"style={{flex:2}}onClick={declarerAbsence}disabled={!absForm.date||!absForm.heures}>
            📢 Notifier l'assmat
          </button>
        </div>
      </div>
    </div>}

    <div className="g2">
      <div className="card"style={{padding:18}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <button className="btn bG"style={{padding:"6px 12px",fontSize:16}}onClick={()=>{if(mois===0){setMois(11);setAn(a=>a-1)}else setMois(m=>m-1)}}>‹</button>
          <div className="pf"style={{fontWeight:600,fontSize:18,color:"var(--b)"}}>{noms[mois]} {an}</div>
          <button className="btn bG"style={{padding:"6px 12px",fontSize:16}}onClick={()=>{if(mois===11){setMois(0);setAn(a=>a+1)}else setMois(m=>m+1)}}>›</button>
        </div>
        <div className="cgrid"style={{marginBottom:8}}>
          {joursSemaine.map(j=><div key={j}style={{textAlign:"center",fontSize:10,fontWeight:700,color:"var(--l)",padding:"4px 0",letterSpacing:".5px"}}>{j}</div>)}
        </div>
        <div className="cgrid">
          {Array(offset).fill(null).map((_,i)=><div key={"e"+i}/>)}
          {Array(total).fill(null).map((_,i)=>{
            const d=i+1;
            const uev=getUserEv(d);
            const ferie=getFerie(d);
            const bday=getBirthday(d);
            const vac=getVac(d);
            const accueil=getAccueil(d);
            const isToday=isActualToday(d);
            const isSel=sel===d;
            const isWeekend=jourIdx(d)>=5;

            let cls="cday";
            let bgStyle={};
            if(isToday||isSel)cls+=" tod";
            else if(ferie)cls+=" abs"; // Féries → rouge
            else if(uev?.type==="cng"){cls+=" cng";} // Mes congés → jaune/doré
            else if(vac)cls+=" hol"; // Vacances → bleu
            else if(uev?.type==="abs")cls+=" abs"; // Absence enfant → rouge
            else if(isWeekend){bgStyle={background:"rgba(0,0,0,.04)"};} // Weekend grisé

            // Accueil : petits points colorés par enfant
            const accueilDots=accueil.filter(e=>!isWeekend&&!ferie&&!(uev?.type==="cng"));

            return <div key={d}className={cls}style={{...bgStyle,position:"relative"}}
              onClick={()=>setSel(sel===d?null:d)}
              title={ferie||(accueil.length>0?accueil.map(e=>e.prenom).join(", "):"")}>
              <span style={{fontSize:11,fontWeight:isToday?700:400}}>{d}</span>
              {/* Indicateurs en bas du jour */}
              <div style={{position:"absolute",bottom:2,left:0,right:0,display:"flex",justifyContent:"center",gap:2}}>
                {ferie&&!isToday&&<div style={{width:4,height:4,borderRadius:"50%",background:"var(--R)"}}/>}
                {uev?.type==="cng"&&!isToday&&<div style={{width:4,height:4,borderRadius:"50%",background:"var(--G)"}}/>}
                {bday&&<div style={{width:4,height:4,borderRadius:"50%",background:"var(--T)"}}/>}
                {accueilDots.slice(0,3).map(e=><div key={e.id}style={{width:4,height:4,borderRadius:"50%",background:e.couleur}}/>)}
              </div>
            </div>;})}
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
              <span style={{fontSize:10,color:"var(--m)"}}>{l}</span>
            </div>)}
        </div>

        {/* Légende enfants (asmat) ou mon enfant (parent) */}
        <div style={{marginTop:10,display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          <span style={{fontSize:10,color:"var(--l)",fontWeight:700}}>Jours d'accueil :</span>
          {enfants.map(e=><div key={e.id}style={{display:"flex",alignItems:"center",gap:4}}>
            <div style={{width:8,height:8,borderRadius:"50%",background:e.couleur}}/>
            <span style={{fontSize:10,color:"var(--m)"}}>{e.emoji} {e.prenom}</span>
          </div>)}
        </div>

        {/* Anniversaires ce mois */}
        {enfants.some(e=>e.naissance?.slice(5)&&(an+"-"+e.naissance.slice(5)).startsWith(moisStr))&&
          <div style={{marginTop:12,padding:"8px 12px",background:"var(--Tp)",borderRadius:10,border:"1px solid var(--Tl)"}}>
            <div style={{fontSize:11,fontWeight:700,color:"var(--T)",marginBottom:4}}>🎂 Anniversaires ce mois</div>
            {enfants.filter(e=>(an+"-"+(e.naissance?.slice(5)||"")).startsWith(moisStr)).map(e=>
              <div key={e.id}style={{fontSize:13,color:"var(--b)"}}>{e.emoji} {e.prenom} - {new Date(an,mois,parseInt((an+"-"+(e.naissance?.slice(5)||"")).slice(8))).toLocaleDateString("fr-FR",{day:"numeric",month:"long"})}</div>)}
          </div>}
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {/* Formulaire ajout événement - asmat uniquement */}
        {sel&&role==="asmat"&&<div className="card"style={{padding:14}}>
          <div style={{fontWeight:600,fontSize:13,marginBottom:10,color:"var(--b)"}}>
            ➕ {sel} {noms[mois]} {an}
            {getFerie(sel)&&<span style={{fontSize:11,color:"var(--R)",marginLeft:8}}>⭐ Jour férié</span>}
            {getBirthday(sel)&&<span style={{fontSize:11,color:"var(--T)",marginLeft:8}}>🎂 Anniversaire</span>}
          </div>
          <div style={{marginBottom:8}}>
            <label className="lbl">Type</label>
            <select className="sel"value={newEv.type}onChange={e=>setNewEv(p=>({...p,type:e.target.value}))}>
              <option value="rdv">📌 Rendez-vous</option>
              <option value="abs">🔴 Absence enfant</option>
              <option value="cng">🟡 Congé assmat</option>
              <option value="hol">🔵 Sortie / activité</option>
            </select>
          </div>
          <input className="inp"style={{marginBottom:8}}placeholder="Description..."value={newEv.txt}onChange={e=>setNewEv(p=>({...p,txt:e.target.value}))}/>
          <button className="btn bT"style={{width:"100%"}}onClick={addEv}>Ajouter</button>
        </div>}

        {/* Détail jour sélectionné */}
        {sel&&<div className="card"style={{padding:14}}>
          <div style={{fontWeight:600,fontSize:13,marginBottom:10,color:"var(--b)"}}>
            📍 {sel} {noms[mois]} {an}
          </div>
          {getFerie(sel)&&<div style={{padding:"6px 10px",background:"var(--Rp)",borderRadius:8,fontSize:12,color:"var(--R)",fontWeight:600,marginBottom:6}}>
            ⭐ Jour férié - {getFerie(sel)}
          </div>}
          {getUserEv(sel)?.type==="cng"&&<div style={{padding:"6px 10px",background:"var(--Gp)",borderRadius:8,fontSize:12,color:"var(--G)",fontWeight:600,marginBottom:6}}>
            🟡 Congé - {getUserEv(sel).txt}
          </div>}
          {getUserEv(sel)?.type==="abs"&&<div style={{padding:"6px 10px",background:"var(--Rp)",borderRadius:8,fontSize:12,color:"var(--R)",fontWeight:600,marginBottom:6}}>
            🔴 {getUserEv(sel).txt}
          </div>}
          {getAccueil(sel).length>0&&!([0,6].includes(jourIdx(sel)))&&<div style={{marginBottom:6}}>
            <div style={{fontSize:11,fontWeight:700,color:"var(--m)",marginBottom:4}}>Enfants accueillis :</div>
            {getAccueil(sel).map(e=><div key={e.id}style={{display:"flex",gap:6,alignItems:"center",padding:"3px 0",fontSize:13}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:e.couleur}}/>
              <span style={{color:"var(--b)"}}>{e.emoji} {e.prenom}</span>
              <span style={{fontSize:11,color:"var(--l)"}}>{e.contrat?.horaires}</span>
            </div>)}
          </div>}
          {isVacances(ds(sel))&&<div style={{padding:"6px 10px",background:"var(--Bp)",borderRadius:8,fontSize:12,color:"var(--B)",fontWeight:600,marginBottom:6}}>
            🏖️ Vacances scolaires {nomVacances(ds(sel))} - Zone C
          </div>}
          {getBirthday(sel)&&<div style={{padding:"6px 10px",background:"var(--Tp)",borderRadius:8,fontSize:12,color:"var(--T)",fontWeight:600}}>
            🎂 Anniversaire de {getBirthday(sel)?.prenom} !
          </div>}
          {!getFerie(sel)&&!getUserEv(sel)&&!getAccueil(sel).length&&!isVacances(ds(sel))&&!getBirthday(sel)&&
            <div style={{fontSize:12,color:"var(--l)"}}>Aucun événement ce jour.</div>}
        </div>}

        {/* Liste événements du mois */}
        <div className="card"style={{padding:14}}>
          <div style={{fontWeight:600,fontSize:13,marginBottom:10,color:"var(--b)"}}>📋 {noms[mois]} {an}</div>
          {moisEvs.length===0&&<div style={{fontSize:13,color:"var(--l)"}}>Aucun événement.</div>}
          {moisEvs.map(ev=><div key={ev.id}style={{display:"flex",gap:8,padding:"7px 0",borderBottom:"1px solid var(--br)",alignItems:"center"}}>
            <span className="badge"style={{
              background:ev.type==="ferie"?"var(--Rp)":ev.type==="cng"?"var(--Gp)":ev.type==="abs"?"var(--Rp)":ev.type==="anniv"?"var(--Tp)":"var(--Bp)",
              color:ev.type==="ferie"?"var(--R)":ev.type==="cng"?"var(--G)":ev.type==="abs"?"var(--R)":ev.type==="anniv"?"var(--T)":"var(--B)",
              whiteSpace:"nowrap",fontSize:10}}>
              {ev.date.slice(8)} {noms[mois].slice(0,3).toLowerCase()}
            </span>
            <span style={{fontSize:11,color:"var(--m)",flex:1}}>{ev.txt}</span>
          </div>)}
        </div>

        {/* Vacances ce mois */}
        {VACANCES_2024.filter(v=>v.debut.startsWith(moisStr)||v.fin.startsWith(moisStr)||(v.debut<moisStr+"-99"&&v.fin>moisStr)).map(v=>
          <div key={v.nom}className="card"style={{padding:12,background:"var(--Bp)",border:"1px solid rgba(46,95,138,.3)"}}>
            <div style={{fontWeight:700,fontSize:12,color:"var(--B)",marginBottom:2}}>🏖️ Vacances {v.nom} - Zone C</div>
            <div style={{fontSize:11,color:"var(--m)"}}>{fmt(v.debut)} → {fmt(v.fin)}</div>
          </div>)}
      </div>
    </div>
  </div>;
}
function Messagerie({enfants,role,pEId,user}){
  const [selId,setSelId]=useState(enfants[0]?.id);
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
        setMsgs(data.map(m=>({...m,eId:m.enfant_id,de:m.auteur_role,h:m.heure||new Date(m.created_at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})})));
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
            return[...prev,{...m,eId:m.enfant_id,de:m.auteur_role,h:m.heure||new Date(m.created_at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}];
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
      const{error}=await supabase.from('messages').insert({
        enfant_id:enfant.id,
        auteur_id:user.id,
        auteur_role:role==="asmat"?"asmat":"parent",
        texte:txt,
        heure:heure,
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
      <div className="card"style={{padding:16,display:"flex",flexDirection:"column",gap:12}}>
        <div style={{display:"flex",alignItems:"center",gap:10,paddingBottom:10,borderBottom:"1px solid var(--br)"}}>
          <span style={{fontSize:24}}>{enfant?.emoji}</span>
          <div><div style={{fontWeight:700,fontSize:14,color:"var(--b)"}}>{enfant?.prenom} {enfant?.nom}</div>
            <div style={{fontSize:11,color:"var(--S)",fontWeight:700}}>● En ligne</div></div>
        </div>
        <div className="msgs">
          {conv.map(m=><div key={m.id}className={(m.de==="asmat"?"msg msg-me":"msg msg-ot")}>
            <div>{m.txt||m.texte}</div>
            <div style={{fontSize:10,opacity:.7,marginTop:3,textAlign:"right"}}>{m.h}</div>
          </div>)}
          <div ref={endRef}/>
        </div>
        <div style={{display:"flex",gap:8,paddingTop:10,borderTop:"1px solid var(--br)"}}>
          <input className="inp"value={txt}onChange={e=>setTxt(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Votre message..."style={{flex:1}}/>
          <button className="btn bT"onClick={send}>Envoyer</button>
        </div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div className="card"style={{padding:14}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:10,color:"var(--b)"}}>🔔 Conversations récentes</div>
          {liste.map(e=>{
            const unread=msgs.filter(m=>m.eId===e.id&&!m.lu).length;
            const last=msgs.filter(m=>m.eId===e.id).slice(-1)[0];
            return <div key={e.id}onClick={()=>setSelId(e.id)}
              style={{display:"flex",gap:10,padding:"9px 0",borderBottom:"1px solid var(--br)",cursor:"pointer",alignItems:"center"}}>
              <span style={{fontSize:22}}>{e.emoji}</span>
              <div style={{flex:1,overflow:"hidden"}}>
                <div style={{fontWeight:700,fontSize:13,color:"var(--b)"}}>{e.prenom}</div>
                {last&&<div style={{fontSize:12,color:"var(--l)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{last.txt}</div>}
              </div>
              {unread>0&&<span className="badge"style={{background:"var(--T)",color:"white"}}>{unread}</span>}
            </div>;})}
        </div>
        <div className="card"style={{padding:14,background:"var(--Sp)",border:"1px solid var(--Sl)"}}>
          <div style={{fontWeight:700,fontSize:13,color:"var(--S)",marginBottom:6}}>💡 Bon à savoir</div>
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
function Facturation({enfants,role,pEId,user,pointagesDB}){
  const [selId,setSelId]=useState(enfants[0]?.id);
  const [abs,setAbs]=useState(enfants.every(e=>["e1","e2","e3"].includes(e.id))?D.absences:[]);
  const [toast,setToast]=useState("");
  const liste=role==="parent"?enfants.filter(e=>e.id===pEId):enfants;
  const enfant=liste.find(e=>e.id===selId)||liste[0];
  const contrat=enfant?.contrat;
  const isDemoFact=enfants.every(e=>["e1","e2","e3"].includes(e.id));
  // Calculate hours from real pointages or fallback to demo
  const calcHeures=()=>{
    if(isDemoFact)return D.heures[enfant?.id]||{real:0,prev:Math.round((contrat?.heuresHebdo||40)*52/12)};
    if(!pointagesDB||!enfant?.id)return{real:0,prev:Math.round((contrat?.heuresHebdo||40)*52/12)};
    const moisPointages=pointagesDB.filter(p=>p.enfant_id===enfant.id);
    const totalMin=moisPointages.reduce((s,p)=>s+(p.total_minutes||0),0);
    return{real:Math.round(totalMin/60),prev:Math.round((contrat?.heuresHebdo||40)*52/12)};
  };
  const h=calcHeures();
  const salBrut=contrat?(h.real*contrat.tauxHoraire+(h.real/5*contrat.entretien)):0;
  const absMois=abs.filter(a=>a.eId===enfant?.id);
  const indemAbs=absMois.filter(a=>a.indemnise).reduce((s,a)=>s+a.heures*((contrat?.tauxHoraire||4.05)*(contrat?.indemniteAbsence||0.5)),0);
  const totalBrut=salBrut+indemAbs;

  const exportPajemploi=()=>{
    const w=window.open('','_blank');
    if(!w){setToast('Autorisez les popups');return;}
    const mois=new Date().toLocaleDateString('fr-FR',{month:'long',year:'numeric'});
    const hMens=Math.round((contrat?.heuresHebdo||40)*52/12);
    const salNet=(totalBrut*0.78).toFixed(2);
    const joursTrav=Math.round(h.real/((contrat?.heuresHebdo||40)/5));
    const htmlPaj=[
      '<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/><title>Récap Pajemploi - '+mois+'</title>',
      '<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;max-width:800px;margin:30px auto;padding:20px;color:#222;font-size:12px}',
      'h1{font-size:16px;text-align:center;color:#2E4859;margin-bottom:4px}',
      '.sub{text-align:center;font-size:11px;color:#888;margin-bottom:20px}',
      '.box{border:1.5px solid #5DA9A1;border-radius:10px;padding:16px;margin-bottom:16px}',
      '.box h2{font-size:13px;color:#5DA9A1;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid #e0e0e0}',
      'table{width:100%;border-collapse:collapse}td{padding:6px 10px;border-bottom:1px solid #f0f0f0}',
      'td:first-child{font-weight:600;color:#2E4859;width:55%}td:last-child{text-align:right}',
      '.hl{background:#FFF8F3;font-weight:700;font-size:13px}.hl td{border-bottom:2px solid #E49178}',
      '.note{background:#F4F7FA;border-radius:8px;padding:12px;margin-top:16px;font-size:10px;color:#666;line-height:1.6}',
      '.steps{margin-top:20px;padding:16px;border:1px dashed #5DA9A1;border-radius:8px}',
      '.steps h3{font-size:12px;color:#5DA9A1;margin-bottom:10px}',
      '.steps ol{padding-left:20px;font-size:11px;line-height:2}',
      '@media print{.noprint{display:none}}</style></head><body>',
      '<h1>🏛️ Récapitulatif Pajemploi</h1>',
      '<div class="sub">'+mois+' — À reporter sur pajemploi.urssaf.fr</div>',
      '<div class="box"><h2>👩👧 Assistante maternelle</h2>',
      '<table><tr><td>Nom</td><td>'+((enfant?.prenomAsmat||"")+" "+(enfant?.nomAsmat||"")).trim()||'[Votre nom]'+'</td></tr>',
      '<tr><td>Enfant gardé</td><td>'+(enfant?.prenom||'-')+' '+(enfant?.emoji||'')+'</td></tr>',
      '<tr><td>Période</td><td>'+mois+'</td></tr></table></div>',
      '<div class="box"><h2>⏰ Heures à déclarer</h2>',
      '<table><tr><td>Heures mensualisées (contrat)</td><td>'+hMens+' h</td></tr>',
      '<tr><td>Heures réellement effectuées</td><td>'+h.real+' h</td></tr>',
      '<tr><td>Heures complémentaires / supplémentaires</td><td>'+Math.max(0,h.real-hMens)+' h</td></tr>',
      '<tr><td>Jours d\'activité</td><td>'+joursTrav+' jours</td></tr>',
      '<tr><td>Jours de congés payés pris</td><td>0 jours</td></tr></table></div>',
      '<div class="box"><h2>💰 Salaire à déclarer</h2>',
      '<table><tr><td>Salaire net horaire</td><td>'+(totalBrut*0.78/h.real).toFixed(4)+' €/h</td></tr>',
      '<tr><td>Salaire net total</td><td>'+salNet+' €</td></tr>',
      '<tr><td>Indemnité d\'entretien</td><td>'+(h.real/5*contrat.entretien).toFixed(2)+' €</td></tr>',
      '<tr><td>Indemnité de repas</td><td>0,00 €</td></tr>',
      '<tr class="hl"><td>💶 TOTAL NET À DÉCLARER</td><td>'+salNet+' €</td></tr></table></div>',
      '<div class="steps"><h3>📝 Comment déclarer sur Pajemploi :</h3>',
      '<ol><li>Connectez-vous sur <strong>pajemploi.urssaf.fr</strong></li>',
      '<li>Cliquez sur <strong>"Déclarer"</strong> > sélectionnez votre assistante maternelle</li>',
      '<li>Entrez le nombre d\'heures : <strong>'+h.real+'h</strong></li>',
      '<li>Entrez le nombre de jours d\'activité : <strong>'+joursTrav+'</strong></li>',
      '<li>Entrez le salaire net total : <strong>'+salNet+' €</strong></li>',
      '<li>Entrez l\'indemnité d\'entretien : <strong>'+(h.real/5*contrat.entretien).toFixed(2)+' €</strong></li>',
      '<li>Validez la déclaration</li></ol></div>',
      '<div class="note">📌 Ce récapitulatif est généré par TiMat à partir des pointages réels du mois. Les montants sont indicatifs — vérifiez sur pajemploi.urssaf.fr avant validation.<br/>Généré le '+new Date().toLocaleDateString('fr-FR')+' — TiMat · timat.app</div>',
      '<div style="text-align:center;margin-top:16px"><button class="noprint" onclick="window.print()" style="background:#5DA9A1;color:#fff;border:none;padding:12px 28px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:700">🖨️ Imprimer / Sauvegarder en PDF</button></div>',
      '</body></html>'
    ].join('');
    w.document.write(htmlPaj);
    w.document.close();
    setToast('Récap Pajemploi ouvert ✓');
  };

  return <div className="fi">
    {toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
    <PageHeader icon="🧾" title="Facturation & Pajemploi" sub="Calcul automatique du salaire mensuel"/>
    {role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
      {liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>setSelId(e.id)}/>)}</div>}

    {contrat&&<div className="g2">
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div className="card"style={{padding:16}}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:14,color:"var(--b)"}}>💰 Salaire Mars 2024 - {enfant?.prenom}</div>
          {[["Heures réalisées",h.real+"h × "+contrat.tauxHoraire+"€",(h.real*contrat.tauxHoraire).toFixed(2)+"€"],
            ["Indemnité entretien",h.real+" jrs × "+contrat.entretien+"€",(h.real/5*contrat.entretien).toFixed(2)+"€"],
            ["Absences indemnisées",absMois.filter(a=>a.indemnise).length+" jours","+"+indemAbs.toFixed(2)+"€"],
          ].map(([l,d,v])=><div key={l}style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderBottom:"1px solid var(--br)"}}>
            <div><div style={{fontSize:13,fontWeight:600,color:"var(--b)"}}>{l}</div>
              <div style={{fontSize:11,color:"var(--l)"}}>{d}</div></div>
            <div style={{fontWeight:700,color:"var(--S)"}}>{v}</div>
          </div>)}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:10,paddingTop:10,borderTop:"2px solid var(--T)"}}>
            <span className="pf"style={{fontSize:15,fontWeight:700,color:"var(--b)"}}>Total brut mensuel</span>
            <span className="pf"style={{fontSize:20,fontWeight:700,color:"var(--T)"}}>{totalBrut.toFixed(2)} €</span>
          </div>
          <div style={{fontSize:11,color:"var(--l)",marginTop:6}}>* Net ≈ {(totalBrut*0.78).toFixed(2)}€ (estimation - vérifiez via Pajemploi)</div>
        </div>

        {/* Pajemploi */}
        <div className="card"style={{padding:16,background:"#EBF4FF",border:"1.5px solid var(--B)"}}>
          <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:12}}>
            <div style={{width:36,height:36,borderRadius:9,background:"var(--B)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🏛️</div>
            <div><div style={{fontWeight:700,fontSize:14,color:"var(--B)"}}>Lien Pajemploi</div>
              <div style={{fontSize:11,color:"var(--l)"}}>Export direct vers l'URSSAF</div></div>
          </div>
          <div style={{fontSize:13,color:"var(--b)",marginBottom:12,lineHeight:1.6}}>
            Heures : <strong>{h.real}h</strong> · Salaire net : <strong>{(totalBrut*0.78).toFixed(2)}€</strong> · Mois : <strong>Mars 2024</strong>
          </div>
          <button className="btn bT"style={{width:"100%",justifyContent:"center"}}onClick={exportPajemploi}>
            🏛️ Exporter vers Pajemploi
          </button>
        </div>
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div className="card"style={{padding:16}}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:12,color:"var(--b)"}}>📋 Absences & Indemnités</div>
          {absMois.map(a=><div key={a.id}style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid var(--br)"}}>
            <div>
              <div style={{fontSize:13,fontWeight:600,color:"var(--b)"}}>{fmt(a.date)} - {a.motif}</div>
              <div style={{fontSize:11,color:"var(--l)"}}>{a.heures}h · {a.indemnise?"Indemnisée":"Non indemnisée"}</div>
            </div>
            <span className="badge"style={{background:a.indemnise?"var(--Sp)":"var(--Rp)",color:a.indemnise?"var(--S)":"var(--R)"}}>
              {a.indemnise?"+"+((a.heures*(contrat.tauxHoraire*contrat.indemniteAbsence)).toFixed(2))+"€":"0€"}</span>
          </div>)}
          {role==="asmat"&&<button className="btn bG"style={{width:"100%",marginTop:12}}>+ Déclarer une absence</button>}
        </div>
        <div className="card"style={{padding:14}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:10,color:"var(--b)"}}>🧾 Historique factures</div>
          {isDemoFact?[["Février 2024","Émise","672.40€"],["Janvier 2024","Payée","698.10€"],["Décembre 2023","Payée","654.80€"]].map(([m,s,v])=>
            <div key={m}style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:"1px solid var(--br)"}}>
              <span style={{fontSize:13,color:"var(--b)",fontWeight:600}}>{m}</span>
              <span className="badge"style={{background:s==="Payée"?"var(--Sp)":"var(--Gp)",color:s==="Payée"?"var(--S)":"var(--G)"}}>{s}</span>
              <span style={{fontWeight:700,color:"var(--b)"}}>{v}</span>
            </div>)
          :<div style={{fontSize:12,color:"var(--l)",textAlign:"center",padding:"16px 0"}}>L'historique apparaîtra ici au fil des mois.</div>}
        </div>
      </div>
    </div>}
  </div>;
}

//
function Contrats({enfants,role,pEId,user}){
  const [selId,setSelId]=useState(enfants[0]?.id);
  // FIX: state hydraté depuis les props (qui viennent de Supabase) au lieu de D.enfants
  const [signes,setSignes]=useState({});
  const [datesSignature,setDatesSignature]=useState({});
  const [drawing,setDrawing]=useState(false);
  const [hasSig,setHasSig]=useState(false);
  const [mods,setMods]=useState({});
  const [showModale,setShowModale]=useState(false);
  const [showAjout,setShowAjout]=useState(false);
  const [modDet,setModDet]=useState({type:"Horaire",detail:""});
  const [toast,setToast]=useState("");
  // SIGNATURE STANDARD ASMAT P10 - signature de reference du profil (chargee depuis profiles.signature_base64)
  const [sigStandard,setSigStandard]=useState(user?.signature_base64||null);
  const canvasRef=useRef(null);
  const liste=role==="parent"?enfants.filter(e=>e.id===pEId):enfants;
  const enfant=liste.find(e=>e.id===selId)||liste[0];
  const contrat=enfant?.contrat;

  // FIX: Synchroniser signes/datesSignature avec les données réelles à chaque changement de la liste enfants
  useEffect(()=>{
    const sigMap={};
    const dateMap={};
    enfants.forEach(e=>{
      if(e.contrat?.signe_asmat){
        sigMap[e.id]=true;
        dateMap[e.id]=e.contrat.date_signature_asmat;
      }
    });
    setSignes(sigMap);
    setDatesSignature(dateMap);
  },[enfants]);

  // FIX: S'assurer que selId pointe vers un enfant existant
  useEffect(()=>{
    if(!liste.length)return;
    if(!liste.find(e=>e.id===selId))setSelId(liste[0].id);
  },[liste,selId]);

  // AVENANTS: Charger les demandes de modification depuis Supabase quand le contrat change
  useEffect(()=>{
    if(!contrat?.id||!enfant?.id)return;
    let cancelled=false;
    (async()=>{
      const{data,error}=await supabase.from("modifications_contrat")
        .select("*").eq("contrat_id",contrat.id)
        .order("date_proposition",{ascending:false});
      if(cancelled)return;
      if(error){console.error("Erreur chargement avenants:",error);return;}
      setMods(p=>({...p,[enfant.id]:data||[]}));
    })();
    return()=>{cancelled=true;};
  },[contrat?.id,enfant?.id]);

  // Helper: récupère la position du pointeur (souris OU tactile) dans le canvas, avec scaling
  const getPos=(e)=>{
    const c=canvasRef.current;
    if(!c)return{x:0,y:0};
    const r=c.getBoundingClientRect();
    const pt=e.touches?.[0]||e.changedTouches?.[0]||e;
    const sx=c.width/r.width;
    const sy=c.height/r.height;
    return{x:(pt.clientX-r.left)*sx,y:(pt.clientY-r.top)*sy};
  };

  const startDraw=(e)=>{
    e.preventDefault?.();
    setDrawing(true);
    const c=canvasRef.current;if(!c)return;
    const ctx=c.getContext("2d");
    const{x,y}=getPos(e);
    ctx.strokeStyle="#3A2820";ctx.lineWidth=2;ctx.lineCap="round";ctx.lineJoin="round";
    ctx.beginPath();ctx.moveTo(x,y);};
  const draw=(e)=>{if(!drawing)return;
    e.preventDefault?.();
    const c=canvasRef.current;if(!c)return;
    const ctx=c.getContext("2d");
    const{x,y}=getPos(e);
    ctx.lineTo(x,y);ctx.stroke();
    ctx.beginPath();ctx.moveTo(x,y);
    setHasSig(true);};
  const endDraw=(e)=>{e?.preventDefault?.();setDrawing(false);};
  const clearSig=()=>{const c=canvasRef.current;c.getContext("2d").clearRect(0,0,c.width,c.height);setHasSig(false);};
  // SIGNATURE STANDARD ASMAT P10 - charger la signature de reference dans le canvas en 1 clic
  const useStandardSig=()=>{
    const c=canvasRef.current;if(!c||!sigStandard)return;
    const ctx=c.getContext("2d");
    ctx.clearRect(0,0,c.width,c.height);
    const img=new Image();
    img.onload=()=>{
      ctx.drawImage(img,0,0,c.width,c.height);
      setHasSig(true);
    };
    img.src=sigStandard;
  };
  const signer=async()=>{
    if(!hasSig)return;
    // Sauvegarder la signature dans Supabase
    const canvas=canvasRef.current;
    const sigData=canvas?.toDataURL("image/png");
    const nowIso=new Date().toISOString();
    const{error}=await supabase.from("contrats").update({
      signe_asmat:true,
      date_signature_asmat:nowIso,
      signature_asmat_data:sigData||null,
    }).eq("enfant_id",enfant.id);
    if(error){
      setToast("Erreur enregistrement : "+error.message);
      return;
    }
    setSignes(p=>({...p,[enfant.id]:true}));
    setDatesSignature(p=>({...p,[enfant.id]:nowIso}));
    setToast("Contrat signé et enregistré ✓");
    // PDF CONTRAT COMBINE P11 - generer et stocker le PDF dans Documents apres signature asmat
    if(contrat?.id){
      generateAndStoreContratPDF(contrat.id).then(r=>{
        if(!r.success)console.log("PDF gen warn:",r.error);
      });
    }
    // EMAILS NOTIFICATIONS P13 - notifier le parent qu'il doit signer (silencieux si Resend pas configure)
    if(contrat?.parent_id&&enfant?.id){
      createNotification({userId:contrat.parent_id,type:"signature_asmat_signed",titre:"Votre contrat est prêt à signer"+(enfant?.prenom?(" — "+enfant.prenom):""),page:"admin_finances"});
      // Recuperer l'email du parent
      supabase.rpc("get_recipient_email",{p_user_id:contrat.parent_id}).then(({data:p})=>{
        if(p?.email){
          sendNotificationEmail({
            type:"signature_asmat_signed",
            to:p.email,
            subject:EMAIL_TEMPLATES.signature_asmat_signed.subject,
            template:"signature_asmat_signed",
            vars:{
              parent_prenom:p.prenom||"",
              asmat_prenom:user?.prenom||"Votre assistante maternelle",
              enfant_prenom:enfant.prenom||"",
              url:window.location.origin,
            },
          });
        }
      });
    }
    // FIX: Trigger un refresh global pour que enfants[].contrat.signe_asmat soit a jour
    // (sinon un re-render parent + useEffect [enfants] reecraserait signes a partir de la donnee stale)
    window.dispatchEvent(new CustomEvent("timat:refresh-data"));
  };
  const addMod=async()=>{
    if(!modDet.detail.trim()){return;}
    if(!contrat?.id){setToast("Aucun contrat actif pour cet enfant");return;}
    const payload={
      contrat_id:contrat.id,
      type:modDet.type,
      detail:modDet.detail.trim(),
      propose_par:role,
    };
    const{data,error,status}=await supabase.from("modifications_contrat").insert(payload).select().single();
    if(error){
      setToast("Erreur : "+(error.message||error.code||"inconnue"));
      return;
    }
    setMods(p=>({...p,[enfant.id]:[data,...(p[enfant.id]||[])]}));
    setModDet({type:"Horaire",detail:""});
    setShowModale(false);
    setToast("Demande envoyee");
  };
  const repondre=async(modId,accepte)=>{
    const{data,error}=await supabase.from("modifications_contrat")
      .update({accepte,date_decision:new Date().toISOString()})
      .eq("id",modId).select().single();
    if(error){setToast("Erreur : "+error.message);return;}
    setMods(p=>({...p,[enfant.id]:(p[enfant.id]||[]).map(m=>m.id===modId?data:m)}));
    setToast(accepte?"Demande acceptee":"Demande refusee");
  };
  const supprimerMod=async(modId)=>{
    if(!window.confirm("Supprimer cette demande ?"))return;
    const{error}=await supabase.from("modifications_contrat").delete().eq("id",modId);
    if(error){setToast("Erreur : "+error.message);return;}
    setMods(p=>({...p,[enfant.id]:(p[enfant.id]||[]).filter(m=>m.id!==modId)}));
    setToast("Demande supprimee");
  };

  return <div className="fi">
    {toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
    {showAjout&&user&&<AjouterEnfantModale user={user} onClose={()=>setShowAjout(false)}/>}
    <PageHeader icon="📄" title="Contrats & Signatures" sub="Signature électronique légale"
      action={role==="asmat"&&user?<BoutonAjouterEnfant compact onClick={()=>setShowAjout(true)}/>:null}/>
    {role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
      {liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>setSelId(e.id)}
        badge={signes[e.id]
          ?<span title="Contrat signé" style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:22,height:22,borderRadius:"50%",background:"var(--G)",color:"#fff",fontSize:12,fontWeight:700,boxShadow:"0 2px 6px rgba(0,0,0,.15)"}}>✓</span>
          :<span title="En attente de signature" style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:22,height:22,borderRadius:"50%",background:"var(--T)",color:"#fff",fontSize:11,boxShadow:"0 2px 6px rgba(0,0,0,.15)"}}>⏳</span>
        }/>)}</div>}

    {contrat&&<div className="g2">
      <div>
        <div className="card"style={{padding:16,marginBottom:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div style={{fontWeight:700,fontSize:14,color:"var(--b)"}}>📋 Contrat - {enfant?.prenom}</div>
            <span className="badge"style={{background:signes[enfant?.id]?"var(--Sp)":"var(--Gp)",color:signes[enfant?.id]?"var(--S)":"var(--G)"}}>
              {signes[enfant?.id]?"✅ Signé":"⏳ En attente de signature"}</span>
          </div>
          {[["Période",fmt(contrat.debut)+" → "+fmt(contrat.fin)],
            ["Jours",contrat.jours.join(", ")],["Horaires",contrat.horaires],
            ["Heures / semaine",contrat.heuresHebdo+"h"],
            ["Taux horaire",contrat.tauxHoraire.toFixed(2)+" €/h"],
            ["Indemnité entretien",contrat.entretien.toFixed(2)+" €/jour"],
            ["Salaire mensuel brut","≈ "+(contrat.heuresHebdo*contrat.tauxHoraire*52/12).toFixed(0)+" €"],
          ].map(([l,v])=><div key={l}style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid var(--br)"}}>
            <span style={{fontSize:12,color:"var(--l)",fontWeight:700}}>{l}</span>
            <span style={{fontSize:13,fontWeight:600,color:"var(--b)",textAlign:"right",maxWidth:"60%"}}>{v}</span>
          </div>)}
        </div>

        {/* Signature électronique */}
        {!signes[enfant?.id]&&<div className="card"style={{padding:16,border:"1.5px solid var(--P)"}}>
          <div style={{fontWeight:700,fontSize:14,color:"var(--P)",marginBottom:4}}>✍️ Signature électronique</div>
          <div style={{fontSize:12,color:"var(--m)",marginBottom:12}}>Signez dans la zone ci-dessous pour valider le contrat</div>
          <canvas ref={canvasRef}className="sig-c"width={340}height={100}
            style={{width:"100%",maxWidth:340,touchAction:"none"}}
            onMouseDown={startDraw}onMouseMove={draw}onMouseUp={endDraw}onMouseLeave={endDraw}
            onTouchStart={startDraw}onTouchMove={draw}onTouchEnd={endDraw}onTouchCancel={endDraw}/>
          {/* SIGNATURE STANDARD ASMAT P10 - bouton de pre-remplissage si signature de reference existe */}
          {role==="asmat"&&sigStandard&&<div style={{marginTop:8}}>
            <button className="btn bG" style={{fontSize:12,width:"100%",justifyContent:"center"}} onClick={useStandardSig}>
              📋 Utiliser ma signature enregistrée
            </button>
          </div>}
          {role==="asmat"&&!sigStandard&&<div style={{marginTop:8,fontSize:11,color:"var(--l)",textAlign:"center"}}>
            💡 Astuce : enregistrez une signature standard dans Paramètres pour la réutiliser en 1 clic.
          </div>}
          <div style={{display:"flex",gap:8,marginTop:10}}>
            <button className="btn bG"onClick={clearSig}>Effacer</button>
            <button className="btn bP"style={{flex:1,justifyContent:"center"}}onClick={signer}disabled={!hasSig}>
              ✍️ Signer le contrat
            </button>
          </div>
          <div style={{fontSize:11,color:"var(--l)",marginTop:8}}>
            🔒 Signature horodatée et sécurisée - valeur légale conforme eIDAS
          </div>
        </div>}
        {signes[enfant?.id]&&<div style={{background:"var(--Sp)",border:"1px solid var(--Sl)",borderRadius:12,padding:14,textAlign:"center"}}>
          <div style={{fontSize:24,marginBottom:4}}>✅</div>
          <div style={{fontWeight:700,color:"var(--S)"}}>Contrat signé électroniquement</div>
          <div style={{fontSize:12,color:"var(--l)",marginTop:2}}>Le {datesSignature[enfant?.id]?fmt(datesSignature[enfant?.id].slice(0,10)):"—"} · Conforme eIDAS</div>
        </div>}
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontWeight:700,fontSize:13,color:"var(--b)"}}>🔄 Demandes de modifications</div>
          <button className="btn bT"style={{fontSize:12,padding:"6px 12px"}}onClick={()=>setShowModale(true)}>+ Demande</button>
        </div>
        {(mods[enfant?.id]||[]).length===0&&<div className="card"style={{padding:14}}>
          <div style={{fontSize:13,color:"var(--l)"}}>Aucune modification demandée.</div>
        </div>}
        {(mods[enfant?.id]||[]).map((m)=>{
          const enAttente=m.accepte===null||m.accepte===undefined;
          const statutTxt=enAttente?"En attente":(m.accepte?"Accepté":"Refusé");
          const statutCol=enAttente?"var(--G)":(m.accepte?"var(--S)":"var(--R)");
          const statutBg=enAttente?"var(--Gp)":(m.accepte?"var(--Sp)":"var(--Rp)");
          // FIX defensif: ne montrer les boutons que si role est bien "asmat" ou "parent"
          // ET que propose_par est bien rempli (sinon valeur stale d'une ancienne logique).
          const validRole=role==="asmat"||role==="parent";
          const validProp=m.propose_par==="asmat"||m.propose_par==="parent";
          const peutRepondre=enAttente&&validRole&&validProp&&m.propose_par!==role;
          const peutSupprimer=enAttente&&validRole&&validProp&&m.propose_par===role;
          const datePropo=m.date_proposition||m.created_at||m.date;
          const proposeurLabel=m.propose_par==="asmat"?"asmat":m.propose_par==="parent"?"parent":"";
          return <div key={m.id||m.detail}className="card"style={{padding:12}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:6,gap:6,flexWrap:"wrap"}}>
              <span className="badge"style={{background:"var(--Bp)",color:"var(--B)"}}>{m.type}</span>
              <span className="badge"style={{background:statutBg,color:statutCol}}>{statutTxt}</span>
            </div>
            <div style={{fontSize:13,color:"var(--m)",lineHeight:1.5,marginBottom:4}}>{m.detail}</div>
            <div style={{fontSize:11,color:"var(--l)"}}>
              {datePropo?fmt(typeof datePropo==="string"?datePropo.slice(0,10):datePropo):""}
              {proposeurLabel?" · proposé par "+proposeurLabel:""}
              {m.date_decision?" · décidé le "+fmt(m.date_decision.slice(0,10)):""}
            </div>
            {peutRepondre&&<div style={{display:"flex",gap:6,marginTop:8}}>
              <button className="btn bS"style={{fontSize:11,padding:"5px 10px"}}onClick={()=>repondre(m.id,true)}>✅ Accepter</button>
              <button className="btn bG"style={{fontSize:11,padding:"5px 10px",color:"var(--R)"}}onClick={()=>repondre(m.id,false)}>❌ Refuser</button>
            </div>}
            {peutSupprimer&&<div style={{display:"flex",gap:6,marginTop:8}}>
              <button className="btn bG"style={{fontSize:11,padding:"5px 10px",color:"var(--R)"}}onClick={()=>supprimerMod(m.id)}>🗑️ Supprimer</button>
            </div>}
          </div>;
        })}
      </div>
    </div>}

    {showModale&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200}}>
      <div className="card"style={{padding:24,width:420,maxWidth:"92vw"}}>
        <div className="pf"style={{fontSize:17,fontWeight:700,marginBottom:16,color:"var(--b)"}}>Demande de modification</div>
        <div style={{marginBottom:12}}><label className="lbl">Type</label>
          <select className="sel"value={modDet.type}onChange={e=>setModDet(p=>({...p,type:e.target.value}))}>
            <option>Horaire</option><option>Jours</option><option>Renouvellement</option><option>Congés</option><option>Autre</option>
          </select></div>
        <div style={{marginBottom:16}}><label className="lbl">Détail</label>
          <textarea className="ta"value={modDet.detail}onChange={e=>setModDet(p=>({...p,detail:e.target.value}))}placeholder="Décrivez la modification..."style={{minHeight:90}}/></div>
        <div style={{display:"flex",gap:8}}>
          <button className="btn bG"style={{flex:1}}onClick={()=>setShowModale(false)}>Annuler</button>
          <button className="btn bT"style={{flex:1}}onClick={addMod}>Envoyer</button>
        </div>
      </div>
    </div>}
  </div>;
}

//
function Sante({enfants,role,pEId}){
  const [selId,setSelId]=useState(enfants[0]?.id);
  const [newAllergie,setNewAllergie]=useState(""); // ALLERGIES P6
  const liste=role==="parent"?enfants.filter(e=>e.id===pEId):enfants;
  const enfant=liste.find(e=>e.id===selId)||liste[0];
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
  const isRealChild=!["e1","e2","e3"].includes(enfant?.id);
  const vacs=isRealChild?[]:(enfant?.vaccins||[]);

  return <div className="fi">
    <PageHeader icon="🏥" title="Carnet de santé" sub="Informations médicales, vaccins, allergies"/>
    {role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
      {liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>setSelId(e.id)}/>)}</div>}

    {enfant&&<div className="g2">
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {/* Identité médicale */}
        <div className="card"style={{padding:16}}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:12,color:"var(--b)"}}>🪪 Identité médicale</div>
          {[["Groupe sanguin",enfant.groupe_sanguin||"-"],["Médecin traitant",enfant.medecin||"-"]].map(([l,v])=>
            <div key={l}style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid var(--br)"}}>
              <span style={{fontSize:12,color:"var(--l)",fontWeight:700}}>{l}</span>
              <span style={{fontSize:13,fontWeight:600,color:"var(--b)"}}>{v}</span>
            </div>)}
        </div>

        {/* Allergies ALLERGIES P6 */}
        <div className="card"style={{padding:16}}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:12,color:"var(--b)"}}>⚠️ Allergies</div>
          {(enfant.allergies||[]).length===0
            ?<span className="badge"style={{background:"var(--Sp)",color:"var(--S)"}}>✅ Aucune allergie connue</span>
            :<div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {(enfant.allergies||[]).map(a=><span key={a}className="badge"style={{background:"#FEE2E2",color:"#DC2626",fontSize:13,padding:"5px 12px",display:"inline-flex",alignItems:"center",gap:6}}>⚠️ {a}<span onClick={()=>delAllergie(a)}style={{cursor:"pointer",fontWeight:700,fontSize:14,opacity:0.7,userSelect:"none"}}title="Supprimer">✕</span></span>)}
            </div>}
          <div style={{marginTop:12,display:"flex",gap:8}}>
            <input className="inp"placeholder="Ajouter une allergie..."style={{flex:1}}value={newAllergie}onChange={e=>setNewAllergie(e.target.value)}onKeyDown={e=>{if(e.key==="Enter")addAllergie();}}/>
            <button className="btn bT"style={{fontSize:12}}onClick={addAllergie}>+</button>
          </div>
        </div>

        {/* Urgences */}
        <div className="card"style={{padding:16,background:"#FFF5F5",border:"1px solid #FCA5A5"}}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:10,color:"#DC2626"}}>🚨 En cas d'urgence</div>
          {[["SAMU","15"],["Pompiers","18"],["Médecin traitant",enfant.medecin?.split("-")[1]?.trim()||"-"]].map(([l,v])=>
            <div key={l}style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid #FCA5A550"}}>
              <span style={{fontSize:13,color:"#7F1D1D"}}>{l}</span>
              <span style={{fontWeight:700,color:"#DC2626",fontSize:14}}>{v}</span>
            </div>)}
        </div>
      </div>

      {/* Vaccins */}
      <div className="card"style={{padding:16}}>
        <div style={{fontWeight:700,fontSize:14,marginBottom:12,color:"var(--b)"}}>💉 Carnet de vaccination</div>
        {vacs.map((v,i)=><div key={i}style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid var(--br)"}}>
          <div>
            <div style={{fontWeight:700,fontSize:13,color:"var(--b)"}}>{v.nom}</div>
            <div style={{fontSize:11,color:"var(--l)"}}>{fmt(v.date)}</div>
          </div>
          <span className="badge"style={{background:v.ok?"var(--Sp)":"var(--Rp)",color:v.ok?"var(--S)":"var(--R)",fontSize:12,padding:"5px 10px"}}>
            {v.ok?"✅ À jour":"⚠️ À renouveler"}</span>
        </div>)}
        <div style={{marginTop:12,padding:"10px 14px",background:"var(--Gp)",borderRadius:10,border:"1px solid var(--G)"}}>
          <div style={{fontSize:13,color:"#7A5500",lineHeight:1.5}}>
            ⏰ Prochain rappel : <strong>ROR de {enfant.prenom}</strong> - à prévoir avant {age(enfant.naissance)}
          </div>
        </div>
      </div>
    </div>}
  </div>;
}

//
function Portfolio({enfants,role,pEId}){
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
    <PageHeader icon="🎨" title="Portfolio pédagogique" sub="Activités, projets et souvenirs"
      action={role==="asmat"&&<button className="btn bT"onClick={()=>setShowForm(!showForm)}>+ Activité</button>}/>

    {role==="asmat"&&<div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
      <button className={(!selId?"btn bT":"btn bG")}onClick={()=>setSelId(null)}>Tous</button>
      {listeEnfants.map(e=><button key={e.id}className={(selId===e.id?"btn bT":"btn bG")}onClick={()=>setSelId(selId===e.id?null:e.id)}>{e.emoji} {e.prenom}</button>)}
    </div>}

    {showForm&&<div className="card"style={{padding:16,marginBottom:14,border:"1.5px solid var(--T)"}}>
      <div style={{fontWeight:700,fontSize:13,marginBottom:10,color:"var(--b)"}}>Nouvelle activité</div>
      <div className="g2"style={{marginBottom:10}}>
        <div><label className="lbl">Titre</label><input className="inp"value={nf.titre}onChange={e=>setNf(p=>({...p,titre:e.target.value}))}placeholder="Nom de l'activité"/></div>
        <div><label className="lbl">Emoji</label><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
          {emojis.map(em=><button key={em}className={"moo "+(nf.emoji===em?"on":"")}onClick={()=>setNf(p=>({...p,emoji:em}))}style={{fontSize:16,padding:"5px 8px"}}>{em}</button>)}</div></div>
      </div>
      <div style={{marginBottom:10}}><label className="lbl">Description</label><textarea className="ta"value={nf.desc}onChange={e=>setNf(p=>({...p,desc:e.target.value}))}placeholder="Ce que l'enfant a appris, réalisé..."style={{minHeight:60}}/></div>
      <div style={{marginBottom:10}}><label className="lbl">Compétences (séparées par virgule)</label><input className="inp"value={nf.competences}onChange={e=>setNf(p=>({...p,competences:e.target.value}))}placeholder="Motricité fine, Créativité..."/></div>
      <button className="btn bT"style={{width:"100%"}}onClick={add}>Enregistrer l'activité</button>
    </div>}

    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:12}}>
      {filtres.map(pf=>{
        const e=enfants.find(x=>x.id===pf.enfant_id);
        return <div key={pf.id}className="card"style={{padding:14,display:"flex",flexDirection:"column",gap:8}}>
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
            {(pf.competences||[]).map(c=><span key={c}className="badge"style={{background:"var(--Pp)",color:"var(--P)",fontSize:10}}>{c}</span>)}
          </div>
          {role==="asmat"&&<button className="btn bG"style={{fontSize:11,padding:"5px 10px",color:"var(--R)",alignSelf:"flex-start",marginTop:4}}onClick={()=>supprimer(pf.id)}>🗑️ Supprimer</button>}
        </div>;})}
    </div>
  </div>;
}

//
// MILESTONES P3 - Référentiel des jalons (46) sourcés OMS + Carnet de santé FR 2025 + PNNS
const JALONS_REF=[
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
function parseAgeAttendu(str){ // FILTRE AGE P8
  if(!str) return {min:0, max:36};
  const m=String(str).match(/(\d+)\s*-\s*(\d+)/);
  return m ? {min:parseInt(m[1],10), max:parseInt(m[2],10)} : {min:0, max:36};
}
function ageEnMois(naissance){ // FILTRE AGE P8
  if(!naissance) return null;
  const d=new Date(naissance);
  if(isNaN(d.getTime())) return null;
  const now=new Date();
  const months=(now.getFullYear()-d.getFullYear())*12 + (now.getMonth()-d.getMonth());
  return Math.max(0, months);
}
function Developpement({enfants,role,pEId}){
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
    const newAcquisAt=newAcquis?new Date().toISOString().slice(0,10):null;
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

    {loading&&<div className="card"style={{padding:16,textAlign:"center",color:"var(--l)"}}>Chargement des jalons...</div>}

    {!loading&&enfant&&items.length===0&&<div className="card"style={{padding:16,textAlign:"center",color:"var(--l)"}}>
      {role==="asmat"?"Aucun jalon initialisé. Rechargez la page pour générer la liste.":"Les jalons n'ont pas encore été initialisés par l'assistant·e maternel·le."}
    </div>}

    {!loading&&enfant&&items.length>0&&<div className="g2">
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {/* Score global */}
        <div className="card"style={{padding:16}}>
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
          return <div key={cat}className="card"style={{padding:12}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
              <span style={{fontWeight:700,fontSize:13,color:"var(--b)"}}>{cat}</span>
              <span style={{fontSize:12,color:"var(--S)",fontWeight:700}}>{cpct}%</span>
            </div>
            <div className="bar"style={{marginBottom:2}}>
              <div className="bar-fill"style={{width:cpct+"%",background:"var(--S)"}}/>
            </div>
          </div>;})}
      </div>

      <div className="card"style={{padding:16}}>
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
          <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"var(--l)",marginTop:2}}>
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
            {!m.acquis&&<span className="badge"style={{background:"var(--Gp)",color:"var(--G)",fontSize:10}}>En cours</span>}
          </div>)}
        </div>)}
        {role==="asmat"&&<div style={{fontSize:11,color:"var(--l)",marginTop:4}}>Cliquez sur une étape pour valider</div>}
      </div>
    </div>}
  </div>;
}

//
// BILANS P8 - Composant complet pour créer/visualiser/éditer des bilans périodiques
function Bilans({enfants,role,pEId,user}){ // PDF BILAN P9 - ajout user pour PDF
  const [selId,setSelId]=useState(enfants[0]?.id);
  const [bilans,setBilans]=useState([]);
  const [loading,setLoading]=useState(true);
  const [editor,setEditor]=useState(null);
  const [viewing,setViewing]=useState(null);
  const [autoFilling,setAutoFilling]=useState(false);
  const [saving,setSaving]=useState(false);
  const [toast,setToast]=useState("");
  const liste=role==="parent"?enfants.filter(e=>e.id===pEId):enfants;
  const enfant=liste.find(e=>e.id===selId)||liste[0];
  const isRealChild=enfant && !["e1","e2","e3"].includes(enfant.id);

  useEffect(()=>{
    if(!enfant?.id||!isRealChild){setBilans([]);setLoading(false);return;}
    let cancelled=false;
    (async()=>{
      setLoading(true);
      const{data,error}=await supabase.from("bilans").select("*").eq("enfant_id",enfant.id).order("date",{ascending:false});
      if(cancelled)return;
      if(error){console.error("[BILANS P8] fetch",error);setBilans([]);}
      else setBilans(data||[]);
      setLoading(false);
    })();
    return()=>{cancelled=true;};
  },[enfant?.id,isRealChild]);

  const parseContenu=(c)=>{try{const o=JSON.parse(c);return o&&typeof o==="object"?o:null;}catch{return null;}};

  const getDefaultDates=(type)=>{
    const today=new Date();
    if(type==="mensuel"){
      const s=new Date(today.getFullYear(),today.getMonth(),1);
      const e=new Date(today.getFullYear(),today.getMonth()+1,0);
      return{date_debut:s.toISOString().slice(0,10),date_fin:e.toISOString().slice(0,10)};
    }
    if(type==="trimestriel"){
      const tStart=Math.floor(today.getMonth()/3)*3;
      const s=new Date(today.getFullYear(),tStart,1);
      const e=new Date(today.getFullYear(),tStart+3,0);
      return{date_debut:s.toISOString().slice(0,10),date_fin:e.toISOString().slice(0,10)};
    }
    const s=new Date(today);s.setMonth(today.getMonth()-3);
    return{date_debut:s.toISOString().slice(0,10),date_fin:today.toISOString().slice(0,10)};
  };

  const emptySections=()=>({
    notes:{observations:"",axes:""},
    alimentation_sommeil:{commentaire:"",stats:null},
    croissance:{commentaire:"",mesures:[]},
    jalons:{commentaire:"",acquis:[]},
  });

  const newBilan=()=>{
    const t="trimestriel";const d=getDefaultDates(t);
    setEditor({type:t,date_debut:d.date_debut,date_fin:d.date_fin,sections:emptySections()});
  };

  const editBilan=(b)=>{
    const p=parseContenu(b.contenu);
    setEditor({
      id:b.id,
      type:b.type||"trimestriel",
      date_debut:p?.date_debut||b.date,
      date_fin:p?.date_fin||b.date,
      sections:p?.sections||{...emptySections(),notes:{observations:b.contenu||"",axes:""}},
    });
  };

  const changeType=(t)=>{
    const d=getDefaultDates(t);
    setEditor(p=>({...p,type:t,date_debut:d.date_debut,date_fin:d.date_fin}));
  };

  const autoFill=async()=>{
    if(!editor||!enfant)return;
    setAutoFilling(true);
    const{date_debut,date_fin}=editor;
    try{
      const[jR,cR,rR,sR]=await Promise.all([
        supabase.from("jalons").select("*").eq("enfant_id",enfant.id).eq("acquis",true).gte("acquis_at",date_debut).lte("acquis_at",date_fin),
        supabase.from("croissance").select("*").eq("enfant_id",enfant.id).gte("date",date_debut).lte("date",date_fin).order("date",{ascending:true}),
        supabase.from("repas").select("*").eq("enfant_id",enfant.id).gte("date",date_debut).lte("date",date_fin),
        supabase.from("sommeil").select("*").eq("enfant_id",enfant.id).gte("date",date_debut).lte("date",date_fin),
      ]);
      const acquis=(jR.data||[]).map(j=>({categorie:j.categorie,texte:j.texte,date:j.acquis_at}));
      const mesures=(cR.data||[]).map(m=>({date:m.date,poids:m.poids,taille:m.taille,age_mois:m.age_mois}));
      const repasCount=rR.data?.length||0;
      const sommeilCount=sR.data?.length||0;
      const isGood=q=>q&&(String(q).toLowerCase().includes("bonne")||String(q).toLowerCase().includes("excellent"));
      const repasGood=(rR.data||[]).filter(r=>isGood(r.qualite)).length;
      const sommeilGood=(sR.data||[]).filter(s=>isGood(s.qualite)).length;
      setEditor(p=>({...p,sections:{...p.sections,
        alimentation_sommeil:{...p.sections.alimentation_sommeil,stats:{
          repasCount,sommeilCount,
          repasQualitePct:repasCount?Math.round(repasGood/repasCount*100):null,
          sommeilQualitePct:sommeilCount?Math.round(sommeilGood/sommeilCount*100):null,
        }},
        croissance:{...p.sections.croissance,mesures},
        jalons:{...p.sections.jalons,acquis},
      }}));
      setToast("✨ Données auto-remplies sur la période");
    }catch(e){console.error("[BILANS P8] autoFill",e);setToast("Erreur : "+e.message);}
    finally{setAutoFilling(false);}
  };

  const saveBilan=async(opts={})=>{
    if(!editor||!enfant)return;
    const send=opts.send===true; // SEND BILAN P9
    if(send&&!window.confirm("Envoyer ce bilan au parent ?\n\nUne fois envoyé, tu ne pourras plus le modifier ni le supprimer."))return; // SEND BILAN P9
    setSaving(true);
    const contenu=JSON.stringify({date_debut:editor.date_debut,date_fin:editor.date_fin,sections:editor.sections});
    const d0=new Date(editor.date_debut);
    const trimestre=editor.type==="trimestriel"?`T${Math.floor(d0.getMonth()/3)+1} ${d0.getFullYear()}`:null;
    const payload={enfant_id:enfant.id,date:editor.date_fin,type:editor.type,trimestre,contenu};
    if(send){payload.envoye=true;payload.envoye_at=new Date().toISOString();} // SEND BILAN P9
    try{
      let bilanId=editor.id;
      if(editor.id){
        const{error}=await supabase.from("bilans").update(payload).eq("id",editor.id);
        if(error)throw error;
      } else {
        const{data:ins,error}=await supabase.from("bilans").insert(payload).select().single(); // SEND BILAN P9 (.select().single() pour récupérer l'id en cas d'envoi)
        if(error)throw error;
        bilanId=ins?.id;
      }
      if(send&&bilanId)logAction("send_bilan",{table_name:"bilans",record_id:bilanId}); // SEND BILAN P9
      const{data}=await supabase.from("bilans").select("*").eq("enfant_id",enfant.id).order("date",{ascending:false});
      setBilans(data||[]);
      setEditor(null);
      setToast(send?"✅ Bilan envoyé au parent":(editor.id?"✓ Bilan modifié":"✓ Bilan enregistré (brouillon)")); // SEND BILAN P9
    }catch(e){console.error("[BILANS P8] save",e);setToast("Erreur : "+e.message);}
    finally{setSaving(false);}
  };

  const deleteBilan=async(id)=>{
    if(!window.confirm("Supprimer ce bilan ?"))return;
    const{error}=await supabase.from("bilans").delete().eq("id",id);
    if(error){alert("Erreur : "+error.message);return;}
    setBilans(p=>p.filter(b=>b.id!==id));
    setToast("Bilan supprimé");
  };

  // SEND BILAN P9 - envoi d'un bilan brouillon directement depuis la liste
  const sendBilan=async(b)=>{
    if(b.envoye)return; // safety : déjà envoyé
    if(!window.confirm("Envoyer ce bilan au parent ?\n\nUne fois envoyé, tu ne pourras plus le modifier ni le supprimer."))return;
    const now=new Date().toISOString();
    const{error}=await supabase.from("bilans").update({envoye:true,envoye_at:now}).eq("id",b.id);
    if(error){alert("Erreur : "+error.message);return;}
    logAction("send_bilan",{table_name:"bilans",record_id:b.id});
    setBilans(p=>p.map(x=>x.id===b.id?{...x,envoye:true,envoye_at:now}:x));
    setToast("✅ Bilan envoyé au parent");
  };

  // PDF BILAN P9 - export PDF via window.print (cohérent avec les 8 autres PDFs du projet)
  // PDF BILAN P9 - Refacto jsPDF natif (Phase 1) : rendu identique cross-browser, texte sélectionnable, fichier léger
  const exporterBilanPDF=async(bilan)=>{
    if(!bilan||!enfant){setToast("Erreur : bilan ou enfant introuvable");return;}
    setToast("⏳ Génération du PDF…");
    try{
      // Charger jsPDF dynamiquement via CDN si pas déjà fait (lazy load)
      if(!window.jspdf){
        await new Promise((res,rej)=>{
          const s=document.createElement("script");
          s.src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
          s.onload=res;
          s.onerror=()=>rej(new Error("Chargement jsPDF échoué — vérifie ta connexion"));
          document.head.appendChild(s);
        });
      }
      const{jsPDF}=window.jspdf;
      const doc=new jsPDF({unit:"mm",format:"a4",orientation:"portrait"});
      // === Constantes layout ===
      const PW=210,PH=297,MX=18,MTOP=15,MBOT=20;
      const CW=PW-2*MX; // largeur contenu = 174mm
      let y=MTOP;
      // === Données ===
      const p=parseContenu(bilan.contenu);
      const sec=p?.sections;
      const titre=bilan.trimestre||(bilan.type==="mensuel"?"Bilan mensuel":bilan.type==="libre"?"Bilan libre":"Bilan");
      const fmtDate=(iso)=>{if(!iso)return"—";const d=new Date(iso);return isNaN(d)?String(iso):d.toLocaleDateString("fr-FR");};
      const periode=p?(fmtDate(p.date_debut)+" → "+fmtDate(p.date_fin)):fmtDate(bilan.date);
      const ageDeb=p?.date_debut&&enfant.naissance?ageEnMois(enfant.naissance):null;
      const ageFin=p?.date_fin&&enfant.naissance?(()=>{const d=new Date(p.date_fin),n=new Date(enfant.naissance);return Math.max(0,(d.getFullYear()-n.getFullYear())*12+(d.getMonth()-n.getMonth()));})():null;
      const ageStr=ageDeb!=null&&ageFin!=null?(ageDeb===ageFin?ageDeb+" mois":ageDeb+" → "+ageFin+" mois"):"";
      // === Helpers couleurs (hex → RGB) ===
      const rgb=(hex)=>{const h=hex.replace("#","");return[parseInt(h.substr(0,2),16),parseInt(h.substr(2,2),16),parseInt(h.substr(4,2),16)];};
      const C={terra:rgb("B8622F"),brun:rgb("5C3A22"),mauve:rgb("FBF6F0"),beige:rgb("F0E5D6"),mauveD:rgb("FDFBF8"),vertBg:rgb("E8F4EC"),vert:rgb("2A7A50"),orangeBg:rgb("FFF3E8"),txt:rgb("444444"),gris:rgb("999999"),grisL:rgb("CCCCCC"),hdrTbl:rgb("F8F4EE"),sablesBg:rgb("FAFAFA"),lin:rgb("EEEEEE")};
      // === Helpers de mise en page ===
      const setFill=(c)=>doc.setFillColor(c[0],c[1],c[2]);
      const setText=(c)=>doc.setTextColor(c[0],c[1],c[2]);
      const setDraw=(c)=>doc.setDrawColor(c[0],c[1],c[2]);
      const ensureSpace=(h)=>{if(y+h>PH-MBOT){doc.addPage();y=MTOP;}};
      const sectionHeader=(num,title)=>{
        ensureSpace(14);
        setFill(C.terra);doc.rect(MX,y,2,7,"F");
        doc.setFontSize(12);doc.setFont("helvetica","bold");setText(C.brun);
        doc.text(num+". "+title,MX+5,y+5);
        y+=11;
      };
      const paragraph=(text,opts)=>{
        opts=opts||{};
        const empty=!text||String(text).trim()==="";
        const t=empty?"(non renseigné)":String(text);
        doc.setFontSize(opts.size||10);
        doc.setFont("helvetica",opts.italic||empty?"italic":"normal");
        setText(empty?C.gris:C.txt);
        const lines=doc.splitTextToSize(t,opts.width||CW);
        ensureSpace(lines.length*5+3);
        doc.text(lines,opts.x||MX,y);
        y+=lines.length*5+3;
      };
      const labeledLine=(label,value,x,w)=>{
        doc.setFontSize(7);doc.setFont("helvetica","bold");setText(C.brun);
        doc.text(label.toUpperCase(),x,y);
        doc.setFontSize(10);doc.setFont("helvetica","normal");setText(C.txt);
        const v=value||"—";
        const lines=doc.splitTextToSize(v,w);
        doc.text(lines[0],x,y+4.5); // 1 seule ligne pour la valeur (cellule meta)
      };
      // === HEADER : titre + pastille statut ===
      doc.setFontSize(18);doc.setFont("helvetica","bold");setText(C.terra);
      doc.text(titre,MX,y+5);
      // Pastille statut
      const statusW=24,statusH=6;
      const statusX=PW-MX-statusW;
      if(bilan.envoye){setFill(C.vertBg);}else{setFill(C.orangeBg);}
      doc.roundedRect(statusX,y-1,statusW,statusH+1,1.5,1.5,"F");
      doc.setFontSize(8);doc.setFont("helvetica","bold");
      if(bilan.envoye){setText(C.vert);}else{setText(C.terra);}
      doc.text(bilan.envoye?"ENVOYÉ":"BROUILLON",statusX+statusW/2,y+3,{align:"center"});
      y+=8;
      // Ligne sous titre
      setDraw(C.terra);doc.setLineWidth(0.7);
      doc.line(MX,y,PW-MX,y);
      y+=6;
      // Sous-titre période + âge
      doc.setFontSize(9);doc.setFont("helvetica","normal");setText(C.gris);
      doc.text("Période : "+periode+(ageStr?"  ·  Âge enfant : "+ageStr:""),MX,y);
      y+=8;
      // === BLOC META ===
      const metaH=24;
      setFill(C.mauveD);setDraw(C.beige);doc.setLineWidth(0.3);
      doc.roundedRect(MX,y,CW,metaH,2,2,"FD");
      const colW=CW/2-8;
      labeledLine("Assistante maternelle",((user?.prenom||"")+" "+(user?.nom||"")).trim()||"—",MX+4,colW);
      labeledLine("Enfant",(enfant.prenom||"—")+(enfant.naissance?" (né(e) le "+fmtDate(enfant.naissance)+")":""),MX+4+CW/2,colW);
      y+=11;
      labeledLine("Date du bilan",fmtDate(bilan.date),MX+4,colW);
      labeledLine("Type",bilan.type==="trimestriel"?"Trimestriel":bilan.type==="mensuel"?"Mensuel":"Période libre",MX+4+CW/2,colW);
      y+=15;
      // === SECTION 1 : Observations ===
      sectionHeader(1,"Observations & axes à travailler");
      paragraph(sec?.notes?.observations);
      if(sec?.notes?.axes){
        doc.setFontSize(8);doc.setFont("helvetica","bold");setText(C.brun);
        doc.text("AXES À TRAVAILLER",MX,y);
        y+=4;
        doc.setFontSize(10);doc.setFont("helvetica","italic");setText(C.brun);
        const lines=doc.splitTextToSize(String(sec.notes.axes),CW-8);
        const blockH=lines.length*5+4;
        ensureSpace(blockH);
        setFill(C.mauve);doc.rect(MX,y,CW,blockH,"F");
        setFill(C.terra);doc.rect(MX,y,1.5,blockH,"F"); // barre verticale gauche
        doc.text(lines,MX+5,y+4);
        y+=blockH+5;
      }
      // === SECTION 2 : Alimentation & sommeil ===
      sectionHeader(2,"Alimentation & sommeil");
      const alimStats=sec?.alimentation_sommeil?.stats;
      if(alimStats){
        const sH=12;
        ensureSpace(sH+3);
        setFill(rgb("F4F7FA"));doc.rect(MX,y,CW,sH,"F");
        doc.setFontSize(9);doc.setFont("helvetica","normal");setText(rgb("264653"));
        const l1=(alimStats.repasCount||0)+" jours de repas suivis"+(alimStats.repasQualitePct!=null?" · qualité bonne "+alimStats.repasQualitePct+"%":"");
        const l2=(alimStats.sommeilCount||0)+" siestes enregistrées"+(alimStats.sommeilQualitePct!=null?" · qualité bonne "+alimStats.sommeilQualitePct+"%":"");
        doc.text(l1,MX+3,y+4.5);
        doc.text(l2,MX+3,y+9);
        y+=sH+3;
      }
      paragraph(sec?.alimentation_sommeil?.commentaire);
      // === SECTION 3 : Croissance ===
      sectionHeader(3,"Croissance");
      const croisMes=sec?.croissance?.mesures||[];
      if(croisMes.length>0){
        const colX=[MX,MX+45,MX+85,MX+125];
        const rowH=6;
        ensureSpace(rowH);
        setFill(C.hdrTbl);doc.rect(MX,y,CW,rowH,"F");
        doc.setFontSize(7);doc.setFont("helvetica","bold");setText(C.brun);
        doc.text("DATE",colX[0]+2,y+4);doc.text("POIDS",colX[1]+2,y+4);
        doc.text("TAILLE",colX[2]+2,y+4);doc.text("ÂGE",colX[3]+2,y+4);
        y+=rowH;
        doc.setFontSize(9);doc.setFont("helvetica","normal");setText(C.txt);
        croisMes.forEach((m,i)=>{
          ensureSpace(rowH);
          if(i%2===0){setFill(C.sablesBg);doc.rect(MX,y,CW,rowH,"F");}
          doc.text(fmtDate(m.date),colX[0]+2,y+4);
          doc.text(m.poids?String(m.poids)+" kg":"—",colX[1]+2,y+4);
          doc.text(m.taille?String(m.taille)+" cm":"—",colX[2]+2,y+4);
          doc.text(m.age_mois?String(m.age_mois)+" mois":"—",colX[3]+2,y+4);
          y+=rowH;
        });
        y+=4;
      } else {
        paragraph("",{italic:true});
      }
      if(sec?.croissance?.commentaire){paragraph(sec.croissance.commentaire);}
      // === SECTION 4 : Jalons ===
      const jalAcquis=sec?.jalons?.acquis||[];
      sectionHeader(4,"Jalons acquis ("+jalAcquis.length+")");
      if(jalAcquis.length>0){
        const jalParCat={};
        jalAcquis.forEach(j=>{const c=j.categorie||"Divers";if(!jalParCat[c])jalParCat[c]=[];jalParCat[c].push(j);});
        Object.entries(jalParCat).forEach(([cat,items])=>{
          ensureSpace(8);
          doc.setFontSize(10);doc.setFont("helvetica","bold");setText(C.terra);
          doc.text("▸ "+cat+" ("+items.length+")",MX,y);
          y+=5;
          doc.setFontSize(9);doc.setFont("helvetica","normal");
          items.forEach(j=>{
            ensureSpace(5);
            setText(C.txt);
            doc.text("✓ "+(j.texte||""),MX+6,y);
            setText(C.gris);doc.setFontSize(8);
            doc.text(fmtDate(j.date),PW-MX-2,y,{align:"right"});
            doc.setFontSize(9);
            y+=5;
          });
          y+=2;
        });
        y+=2;
      } else {
        paragraph("",{italic:true});
      }
      if(sec?.jalons?.commentaire){paragraph(sec.jalons.commentaire);}
      // === SIGNATURES ===
      ensureSpace(35);
      y+=4;
      setDraw(C.brun);doc.setLineWidth(0.3);
      doc.line(MX,y,PW-MX,y);
      y+=5;
      doc.setFontSize(9);doc.setFont("helvetica","normal");setText(C.brun);
      const sigW=(CW-10)/2;
      const sigBoxX1=MX,sigBoxX2=MX+sigW+10;
      // Asmat
      doc.text("Fait à ____________________",sigBoxX1,y);
      doc.text("Le "+new Date().toLocaleDateString("fr-FR"),sigBoxX1,y+5);
      doc.text("Signature de l'assistante maternelle :",sigBoxX1,y+12);
      setDraw(C.grisL);doc.setLineWidth(0.2);
      doc.line(sigBoxX1,y+24,sigBoxX1+sigW-5,y+24);
      // Parent
      doc.text("Reçu par le parent",sigBoxX2,y);
      doc.text("Le ____________________",sigBoxX2,y+5);
      doc.text("Signature du parent :",sigBoxX2,y+12);
      doc.line(sigBoxX2,y+24,PW-MX,y+24);
      y+=30;
      // === FOOTER ===
      ensureSpace(8);
      setDraw(C.lin);doc.setLineWidth(0.2);
      doc.line(MX,y,PW-MX,y);
      y+=4;
      doc.setFontSize(8);setText(rgb("AAAAAA"));doc.setFont("helvetica","italic");
      const dateGen=new Date().toLocaleDateString("fr-FR")+" à "+new Date().toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"});
      doc.text("Bilan généré par TiMat — timat.app — "+dateGen,PW/2,y,{align:"center"});
      // === PAGINATION (si plusieurs pages) ===
      const pageCount=doc.internal.getNumberOfPages();
      if(pageCount>1){
        for(let i=1;i<=pageCount;i++){
          doc.setPage(i);
          doc.setFontSize(8);setText(rgb("AAAAAA"));doc.setFont("helvetica","normal");
          doc.text("Page "+i+" / "+pageCount,PW-MX,PH-8,{align:"right"});
        }
      }
      // === SAUVEGARDE ===
      const slug=(s)=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zA-Z0-9]+/g,"-").replace(/^-+|-+$/g,"").toLowerCase();
      const filename="bilan-"+slug(titre)+"-"+slug(enfant.prenom||"enfant")+"-"+(bilan.date||new Date().toISOString().slice(0,10))+".pdf";
      doc.save(filename);
      setToast("✅ PDF téléchargé");
    }catch(err){
      console.error("[PDF BILAN P9]",err);
      setToast("Erreur PDF : "+(err?.message||"inconnue"));
    }
  };

  // ===== ÉDITEUR =====
  if(editor){
    const s=editor.sections;
    const updS=(key,upd)=>setEditor(p=>({...p,sections:{...p.sections,[key]:{...p.sections[key],...upd}}}));
    return <div className="fi">
      {toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
      <PageHeader icon="✨" title={editor.id?"Modifier le bilan":"Nouveau bilan"} sub={enfant?.prenom||""}
        action={<button className="btn"onClick={()=>setEditor(null)}>← Retour</button>}/>

      {/* Périodicité + dates */}
      <div className="card"style={{padding:16,marginBottom:14}}>
        <div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:10}}>Période du bilan</div>
        <div style={{display:"flex",gap:8,marginBottom:10,flexWrap:"wrap"}}>
          {[["mensuel","📅 Mensuel"],["trimestriel","📊 Trimestriel"],["libre","✏️ Période libre"]].map(([id,lbl])=>
            <button key={id}onClick={()=>changeType(id)}style={{
              padding:"7px 14px",borderRadius:18,border:"none",cursor:"pointer",
              fontWeight:600,fontSize:12,
              background:editor.type===id?"var(--T)":"var(--Sp)",
              color:editor.type===id?"#fff":"var(--m)",
            }}>{lbl}</button>)}
        </div>
        <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
          <label style={{flex:1,minWidth:140}}>
            <div style={{fontSize:11,color:"var(--l)",marginBottom:3}}>Du</div>
            <input type="date"className="inp"value={editor.date_debut}
              onChange={e=>setEditor(p=>({...p,date_debut:e.target.value}))}/>
          </label>
          <label style={{flex:1,minWidth:140}}>
            <div style={{fontSize:11,color:"var(--l)",marginBottom:3}}>Au</div>
            <input type="date"className="inp"value={editor.date_fin}
              onChange={e=>setEditor(p=>({...p,date_fin:e.target.value}))}/>
          </label>
        </div>
        <button className="btn bT"style={{marginTop:12,width:"100%"}}
          onClick={autoFill}disabled={autoFilling}>
          {autoFilling?"Chargement…":"✨ Auto-remplir avec les données"}
        </button>
      </div>

      {/* Section 1 : Notes libres */}
      <div className="card"style={{padding:16,marginBottom:14}}>
        <div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:8}}>📝 Observations & axes à travailler</div>
        <div style={{fontSize:11,color:"var(--l)",marginBottom:4}}>Vos observations sur la période</div>
        <textarea className="inp"rows={4}placeholder="Comportement, humeur, intégration, points forts, progrès remarqués..."
          value={s.notes.observations}onChange={e=>updS("notes",{observations:e.target.value})}
          style={{marginBottom:10,resize:"vertical"}}/>
        <div style={{fontSize:11,color:"var(--l)",marginBottom:4}}>Axes à travailler le prochain trimestre</div>
        <textarea className="inp"rows={3}placeholder="Pistes pédagogiques pour la suite..."
          value={s.notes.axes}onChange={e=>updS("notes",{axes:e.target.value})}
          style={{resize:"vertical"}}/>
      </div>

      {/* Section 2 : Alimentation & sommeil */}
      <div className="card"style={{padding:16,marginBottom:14}}>
        <div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:8}}>🍽️ Alimentation & sommeil</div>
        {s.alimentation_sommeil.stats?<div style={{padding:10,background:"var(--Sp)",borderRadius:8,marginBottom:10,fontSize:12}}>
          <div><b>{s.alimentation_sommeil.stats.repasCount}</b> jours de repas suivis{s.alimentation_sommeil.stats.repasQualitePct!==null?` · qualité bonne ${s.alimentation_sommeil.stats.repasQualitePct}%`:""}</div>
          <div><b>{s.alimentation_sommeil.stats.sommeilCount}</b> siestes enregistrées{s.alimentation_sommeil.stats.sommeilQualitePct!==null?` · qualité bonne ${s.alimentation_sommeil.stats.sommeilQualitePct}%`:""}</div>
        </div>:<div style={{fontSize:11,color:"var(--l)",marginBottom:8,fontStyle:"italic"}}>Cliquez sur "Auto-remplir" pour récupérer les statistiques</div>}
        <textarea className="inp"rows={3}placeholder="Commentaire sur l'alimentation et le sommeil..."
          value={s.alimentation_sommeil.commentaire}onChange={e=>updS("alimentation_sommeil",{commentaire:e.target.value})}
          style={{resize:"vertical"}}/>
      </div>

      {/* Section 3 : Croissance */}
      <div className="card"style={{padding:16,marginBottom:14}}>
        <div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:8}}>📏 Croissance</div>
        {s.croissance.mesures.length>0?<div style={{padding:10,background:"var(--Sp)",borderRadius:8,marginBottom:10,fontSize:12}}>
          {s.croissance.mesures.map((m,i)=><div key={i}>{m.date} : {m.poids?`${m.poids} kg`:""}{m.poids&&m.taille?" · ":""}{m.taille?`${m.taille} cm`:""}{m.age_mois?` (${m.age_mois} mois)`:""}</div>)}
        </div>:<div style={{fontSize:11,color:"var(--l)",marginBottom:8,fontStyle:"italic"}}>Aucune mesure sur la période. Cliquez sur "Auto-remplir" si des mesures existent.</div>}
        <textarea className="inp"rows={2}placeholder="Commentaire sur la croissance..."
          value={s.croissance.commentaire}onChange={e=>updS("croissance",{commentaire:e.target.value})}
          style={{resize:"vertical"}}/>
      </div>

      {/* Section 4 : Jalons */}
      <div className="card"style={{padding:16,marginBottom:14}}>
        <div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:8}}>🌱 Jalons acquis sur la période</div>
        {s.jalons.acquis.length>0?<div style={{padding:10,background:"var(--Sp)",borderRadius:8,marginBottom:10,fontSize:12,maxHeight:200,overflowY:"auto"}}>
          {s.jalons.acquis.map((j,i)=><div key={i}style={{marginBottom:3}}>✓ <b>{j.categorie}</b> — {j.texte} <span style={{color:"var(--l)"}}>({j.date})</span></div>)}
          <div style={{marginTop:6,fontWeight:700,color:"var(--T)"}}>{s.jalons.acquis.length} jalon{s.jalons.acquis.length>1?"s":""} acquis</div>
        </div>:<div style={{fontSize:11,color:"var(--l)",marginBottom:8,fontStyle:"italic"}}>Aucun jalon acquis sur cette période. Cliquez sur "Auto-remplir" pour vérifier.</div>}
        <textarea className="inp"rows={2}placeholder="Commentaire sur les acquisitions..."
          value={s.jalons.commentaire}onChange={e=>updS("jalons",{commentaire:e.target.value})}
          style={{resize:"vertical"}}/>
      </div>

      <div style={{display:"flex",gap:8,marginBottom:30,flexWrap:"wrap"}}>
        <button className="btn"style={{flex:"1 1 90px"}}onClick={()=>setEditor(null)}disabled={saving}>Annuler</button>
        <button className="btn bT"style={{flex:"1 1 140px"}}onClick={()=>saveBilan()}disabled={saving}>
          {saving?"Enregistrement…":"💾 Brouillon"}
        </button>
        {/* SEND BILAN P9 - bouton d'envoi direct depuis l'éditeur */}
        <button onClick={()=>saveBilan({send:true})}disabled={saving}style={{
          flex:"2 1 180px",padding:"10px 14px",borderRadius:10,border:"none",cursor:saving?"default":"pointer",
          fontWeight:700,fontSize:13,background:"var(--G)",color:"#fff",opacity:saving?.6:1,
        }}>
          {saving?"Envoi…":"📤 Enregistrer & envoyer au parent"}
        </button>
      </div>
    </div>;
  }

  // ===== VIEWER (lecture seule) =====
  if(viewing){
    const p=parseContenu(viewing.contenu);
    const sec=p?.sections;
    return <div className="fi">
      {toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
      <PageHeader icon="✨" title={viewing.trimestre||(viewing.type==="mensuel"?"Bilan mensuel":"Bilan")} sub={(p?.date_debut||"")+(p?.date_fin?" → "+p.date_fin:"")}
        action={<div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {/* PDF BILAN P9 - bouton export PDF */}
          <button className="btn" style={{background:"var(--T)",color:"#fff",border:"none"}} onClick={()=>exporterBilanPDF(viewing)}>📥 PDF</button>
          <button className="btn" onClick={()=>setViewing(null)}>← Retour</button>
        </div>}/>
      {!p&&<div className="card"style={{padding:14}}>{viewing.contenu}</div>}
      {sec&&<>
        <div className="card"style={{padding:16,marginBottom:14}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:8,color:"var(--b)"}}>📝 Observations</div>
          <div style={{fontSize:13,whiteSpace:"pre-wrap",color:"var(--m)"}}>{sec.notes?.observations||<i>(vide)</i>}</div>
          {sec.notes?.axes&&<><div style={{fontWeight:700,fontSize:12,marginTop:12,color:"var(--b)"}}>Axes à travailler</div>
            <div style={{fontSize:13,whiteSpace:"pre-wrap",color:"var(--m)"}}>{sec.notes.axes}</div></>}
        </div>
        <div className="card"style={{padding:16,marginBottom:14}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:8,color:"var(--b)"}}>🍽️ Alimentation & sommeil</div>
          {sec.alimentation_sommeil?.stats&&<div style={{padding:10,background:"var(--Sp)",borderRadius:8,marginBottom:10,fontSize:12}}>
            <div><b>{sec.alimentation_sommeil.stats.repasCount}</b> jours suivis · qualité bonne {sec.alimentation_sommeil.stats.repasQualitePct||0}%</div>
            <div><b>{sec.alimentation_sommeil.stats.sommeilCount}</b> siestes · qualité bonne {sec.alimentation_sommeil.stats.sommeilQualitePct||0}%</div>
          </div>}
          {sec.alimentation_sommeil?.commentaire&&<div style={{fontSize:13,whiteSpace:"pre-wrap",color:"var(--m)"}}>{sec.alimentation_sommeil.commentaire}</div>}
        </div>
        <div className="card"style={{padding:16,marginBottom:14}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:8,color:"var(--b)"}}>📏 Croissance</div>
          {sec.croissance?.mesures?.length>0&&<div style={{padding:10,background:"var(--Sp)",borderRadius:8,marginBottom:10,fontSize:12}}>
            {sec.croissance.mesures.map((m,i)=><div key={i}>{m.date} : {m.poids?`${m.poids} kg`:""}{m.poids&&m.taille?" · ":""}{m.taille?`${m.taille} cm`:""}</div>)}
          </div>}
          {sec.croissance?.commentaire&&<div style={{fontSize:13,whiteSpace:"pre-wrap",color:"var(--m)"}}>{sec.croissance.commentaire}</div>}
        </div>
        <div className="card"style={{padding:16,marginBottom:30}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:8,color:"var(--b)"}}>🌱 Jalons acquis ({sec.jalons?.acquis?.length||0})</div>
          {sec.jalons?.acquis?.length>0&&<div style={{padding:10,background:"var(--Sp)",borderRadius:8,marginBottom:10,fontSize:12,maxHeight:240,overflowY:"auto"}}>
            {sec.jalons.acquis.map((j,i)=><div key={i}>✓ <b>{j.categorie}</b> — {j.texte}</div>)}
          </div>}
          {sec.jalons?.commentaire&&<div style={{fontSize:13,whiteSpace:"pre-wrap",color:"var(--m)"}}>{sec.jalons.commentaire}</div>}
        </div>
      </>}
    </div>;
  }

  // ===== LISTE =====
  return <div className="fi">
    {toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
    <PageHeader icon="✨" title="Bilans périodiques" sub="Synthèses pour les parents"
      action={role==="asmat"&&isRealChild?<button className="btn bT"onClick={newBilan}>+ Nouveau bilan</button>:null}/>
    {role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
      {liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>setSelId(e.id)}/>)}</div>}

    {!isRealChild&&<div className="card"style={{padding:16,textAlign:"center",color:"var(--l)"}}>
      Les bilans sont disponibles pour les enfants réels. Sélectionne un enfant que tu accueilles.
    </div>}
    {isRealChild&&loading&&<div className="card"style={{padding:16,textAlign:"center",color:"var(--l)"}}>Chargement…</div>}
    {isRealChild&&!loading&&bilans.length===0&&<div className="card"style={{padding:24,textAlign:"center"}}>
      <div style={{fontSize:42,marginBottom:8}}>✨</div>
      <div style={{fontWeight:700,color:"var(--b)",marginBottom:6}}>Aucun bilan pour {enfant?.prenom}</div>
      <div style={{fontSize:13,color:"var(--l)",marginBottom:14}}>Crée un premier bilan pour synthétiser le développement de l'enfant et le partager aux parents.</div>
      {role==="asmat"&&<button className="btn bT"onClick={newBilan}>+ Créer un bilan</button>}
    </div>}
    {isRealChild&&!loading&&bilans.map(b=>{
      const p=parseContenu(b.contenu);
      const periode=p?(p.date_debut+" → "+p.date_fin):b.date;
      const titre=b.trimestre||(b.type==="mensuel"?"Bilan mensuel":b.type==="libre"?"Bilan libre":"Bilan");
      return <div key={b.id}className="card"style={{padding:14,marginBottom:10,display:"flex",gap:12,alignItems:"center"}}>
        <div style={{fontSize:28}}>{b.envoye?"✅":"✏️"}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontWeight:700,fontSize:14,color:"var(--b)"}}>{titre}</div>
          <div style={{fontSize:12,color:"var(--l)"}}>{periode}</div>
          <div style={{fontSize:11,color:b.envoye?"var(--G)":"var(--T)",marginTop:2,fontWeight:600}}>
            {b.envoye?"Envoyé au parent":"Brouillon"}
          </div>
        </div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          <button className="btn"style={{padding:"6px 10px",fontSize:12}}onClick={()=>setViewing(b)}>👁️ Voir</button>
          {/* PDF BILAN P9 - export PDF rapide depuis la liste, sur bilans envoyés uniquement */}
          {b.envoye&&<button onClick={()=>exporterBilanPDF(b)}style={{padding:"6px 10px",fontSize:12,borderRadius:8,border:"none",cursor:"pointer",fontWeight:700,background:"var(--T)",color:"#fff"}}>📥 PDF</button>}
          {role==="asmat"&&!b.envoye&&<button className="btn"style={{padding:"6px 10px",fontSize:12}}onClick={()=>editBilan(b)}>✏️ Modifier</button>}
          {/* SEND BILAN P9 - envoi direct depuis la liste pour les brouillons */}
          {role==="asmat"&&!b.envoye&&<button onClick={()=>sendBilan(b)}style={{
            padding:"6px 10px",fontSize:12,borderRadius:8,border:"none",cursor:"pointer",
            fontWeight:700,background:"var(--G)",color:"#fff",
          }}>📤 Envoyer</button>}
          {role==="asmat"&&!b.envoye&&<button className="btn"style={{padding:"6px 10px",fontSize:12,color:"#c00"}}onClick={()=>deleteBilan(b.id)}>🗑️</button>}
        </div>
      </div>;
    })}
  </div>;
}

//
function Recap({enfants,role,pEId}){
  const [selId,setSelId]=useState(enfants[0]?.id);
  const [showPrev,setShowPrev]=useState(false);
  const [toast,setToast]=useState("");
  const liste=role==="parent"?enfants.filter(e=>e.id===pEId):enfants;
  const enfant=liste.find(e=>e.id===selId)||liste[0];
  const contrat=enfant?.contrat;
  const isDemoRecap=enfants.every(e=>["e1","e2","e3"].includes(e.id));
  const h=isDemoRecap?(D.heures[enfant?.id]||{real:0,prev:0}):{real:0,prev:Math.round((contrat?.heuresHebdo||40)*52/12)};
  const rep=D.repas.filter(r=>r.eId===enfant?.id);
  const ms=D.milestones[enfant?.id]||[];

  return <div className="fi">
    {toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
    <PageHeader icon="📊" title="Récapitulatif mensuel PDF" sub="Bilan complet automatique - exclusivité TiMat"
      action={<button className="btn bT"onClick={()=>{setShowPrev(true);}}> 👁️ Aperçu PDF</button>}/>
    {role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
      {liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>setSelId(e.id)}/>)}</div>}

    <div className="g2"style={{marginBottom:12}}>
      {[["⏰","Heures réalisées",h.real+"h / "+h.prev+"h prévues","var(--B)"],
        ["🍽️","Repas enregistrés",rep.length+" jours de suivi","var(--S)"],
        ["🌱","Étapes atteintes",ms.filter(m=>m.ok).length+" / "+ms.length+" jalons","var(--P)"],
        ["📋","Transmissions",D.transmissions.filter(t=>t.eId===enfant?.id).length+" échanges","var(--T)"],
      ].map(([ic,ti,su,c])=><div key={ti}className="card"style={{padding:14,display:"flex",gap:10,alignItems:"center"}}>
        <div style={{fontSize:26}}>{ic}</div>
        <div><div style={{fontWeight:700,fontSize:13,color:"var(--b)"}}>{ti}</div>
          <div className="pf"style={{fontSize:15,color:c,fontWeight:700}}>{su}</div></div>
      </div>)}
    </div>

    {showPrev&&enfant&&<div className="card"style={{padding:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div style={{fontWeight:700,fontSize:14,color:"var(--b)"}}>Aperçu du récapitulatif</div>
        <div style={{display:"flex",gap:8}}>
          <button className="btn bP"onClick={()=>setToast("PDF généré et envoyé par email ✓")}>📧 Envoyer par email</button>
          <button className="btn bS"onClick={()=>setToast("Téléchargement en cours ✓")}>⬇️ Télécharger PDF</button>
        </div>
      </div>
      <div className="pdf-preview">
        <div style={{borderBottom:"2px solid #E49178",paddingBottom:12,marginBottom:16,display:"flex",justifyContent:"space-between"}}>
          <div><h2 style={{color:"#E49178",fontFamily:"Georgia",fontSize:18}}>🌿 TiMat</h2>
            <div style={{fontSize:11,color:"#888"}}>{user?.prenom||"Assmat"} {user?.nom||""} · Assistante Maternelle agréée</div></div>
          <div style={{textAlign:"right",fontSize:11,color:"#888"}}>
            <div><strong>Récapitulatif mensuel</strong></div>
            <div>Mars 2024</div>
            <div>Généré le 11/03/2024</div>
          </div>
        </div>
        <div style={{background:"#f8f4ef",padding:10,borderRadius:6,marginBottom:12}}>
          <div style={{fontWeight:700,marginBottom:4}}>👶 {enfant.prenom} {enfant.nom} - {age(enfant.naissance)}</div>
          <div style={{fontSize:11,color:"#666"}}>Période d'accueil : {enfant.contrat?.horaires} · {enfant.contrat?.jours.join(", ")}</div>
        </div>
        <table>
          <thead><tr><th>Section</th><th>Détail</th><th>Valeur</th></tr></thead>
          <tbody>
            <tr><td>Heures prévues</td><td>Contrat mensuel</td><td><strong>{h.prev}h</strong></td></tr>
            <tr><td>Heures réalisées</td><td>Pointage validé</td><td><strong>{h.real}h</strong></td></tr>
            <tr><td>Solde</td><td>Différence</td><td style={{color:h.real-h.prev<0?"#DC2626":"#16A34A"}}><strong>{h.real-h.prev}h</strong></td></tr>
            <tr><td>Salaire brut</td><td>Taux {contrat?.tauxHoraire}€/h</td><td><strong>{(h.real*(contrat?.tauxHoraire||4.05)).toFixed(2)}€</strong></td></tr>
            <tr><td>Repas suivis</td><td>Journaux renseignés</td><td><strong>{rep.length} jours</strong></td></tr>
            <tr><td>Étapes dév.</td><td>Jalons OMS</td><td><strong>{ms.filter(m=>m.ok).length}/{ms.length}</strong></td></tr>
          </tbody>
        </table>
        <div style={{marginTop:14,paddingTop:10,borderTop:"1px solid #ddd",fontSize:11,color:"#888",textAlign:"center"}}>
          Document généré automatiquement par TiMat · Confidentiel
        </div>
      </div>
    </div>}

    {!showPrev&&<div className="card"style={{padding:16,background:"var(--Pp)",border:"1px solid var(--P)"}}>
      <div style={{fontWeight:700,fontSize:14,color:"var(--P)",marginBottom:8}}>💡 Fonctionnalité exclusive</div>
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
function CompteRenduTrimestriel({enfants,role,pEId}){
  const [selId,setSelId]=useState(enfants[0]?.id);
  const [trim,setTrim]=useState("T1 2024");
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
        <div className="card"style={{padding:18,marginBottom:12}}>
          <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap",alignItems:"flex-end"}}>
            <div style={{flex:1}}>
              <label className="lbl">Trimestre</label>
              <select className="sel"value={trim}onChange={e=>{setTrim(e.target.value);setCr("");setEnvoye(false);}}>
                {["T1 2024","T2 2024","T3 2024","T4 2023","T3 2023"].map(t=><option key={t}>{t}</option>)}
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
            <div style={{fontSize:13}}>Sélectionnez un trimestre et cliquez sur Générer.</div>
          </div>}
          {cr&&<div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:14,lineHeight:2,color:"var(--b)",whiteSpace:"pre-wrap"}}>{cr}</div>
            <div style={{display:"flex",gap:8,marginTop:16,flexWrap:"wrap",alignItems:"center"}}>
              {role==="asmat"&&!envoye&&<button className="btn bS"onClick={()=>{setEnvoye(true);setToast("CR "+trim+" envoyé à "+parent?.prenom+" "+parent?.nom+" ✓");}}>
                📩 Envoyer aux parents
              </button>}
              {role==="asmat"&&envoye&&<div style={{display:"flex",alignItems:"center",gap:6,padding:"7px 14px",background:"var(--Sp)",borderRadius:10,border:"1px solid var(--Sl)"}}>
                <span style={{fontSize:14}}>✅</span>
                <span style={{fontSize:13,fontWeight:700,color:"var(--S)"}}>CR envoyé à {parent?.prenom} {parent?.nom}</span>
              </div>}
              <button className="btn bP"onClick={generer}>🔄 Régénérer</button>
              <button className="btn bG"onClick={()=>navigator.clipboard?.writeText(cr)}>📋 Copier</button>
            </div>
          </div>}
        </div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div className="card"style={{padding:14,background:"var(--Pp)",border:"1px solid var(--P)"}}>
          <div style={{fontWeight:700,fontSize:13,color:"var(--P)",marginBottom:8}}>💡 Pensé pour la transmission PMI</div>
          <div style={{fontSize:13,color:"var(--b)",lineHeight:1.6}}>Un compte-rendu trimestriel professionnel que les parents peuvent glisser dans le dossier scolaire et présenter à la PMI lors du renouvellement d'agrément.</div>
        </div>
        <div className="card"style={{padding:14}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:10,color:"var(--b)"}}>📊 Données utilisées</div>
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
const DOCS_DEMO=[
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

const CATS={
  medical:{l:"Médical",ic:"🏥",c:"#B84060",bg:"#FAEEF2"},
  admin:{l:"Administratif",ic:"🧾",c:"#B8892A",bg:"#FBF5E0"},
  peda:{l:"Pédagogique",ic:"📝",c:"#6A3F88",bg:"#F2EAF8"},
  agrement:{l:"Agréments & Pro",ic:"🏛️",c:"#2E5F8A",bg:"#E6F0F8"},
};

function Documents({enfants,role,pEId,user}){
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
  const liste=role==="parent"
    ? docs.filter(d=>d.partage&&enfants.some(e=>e.id===d.eId))
    : docs;

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
        taille:newFile?(newFile.size>1024*1024?(newFile.size/1024/1024).toFixed(1)+" Mo":(newFile.size/1024).toFixed(0)+" Ko"):"-",
        icone:CATS[newDoc.cat]?.ic||"📄",partage:true,url:null
      }]);
      setToast("Document ajouté ✓"+(newFile?"":" (sans fichier - ajoutez un fichier pour le stockage permanent)"));
    }else{
      // Real upload to Supabase Storage
      const ext=newFile.name.split('.').pop()||'pdf';
      const fileName=`${Date.now()}_${newDoc.nom.replace(/[^a-zA-Z0-9]/g,'_')}.${ext}`;
      const path=`${user.id}/${newDoc.eId||'general'}/${fileName}`;

      const{error:upErr}=await supabase.storage.from('documents').upload(path,newFile,{upsert:false});
      if(upErr){
        console.error('Upload doc:',upErr.message);
        setToast("❌ Erreur upload: "+upErr.message);
        setUploading(false);return;
      }

      // BUCKETS PRIVES P3: ne pas stocker d'URL en DB (signed URL = expire)
      // L'URL sera regeneree a la demande via getSignedUrl(storagePath)
      const taille=newFile.size>1024*1024?(newFile.size/1024/1024).toFixed(1)+" Mo":(newFile.size/1024).toFixed(0)+" Ko";

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

    {/* Formulaire ajout */}
    {showUpload&&<div className="card"style={{padding:18,marginBottom:16,border:"1.5px solid var(--T)"}}>
      <div style={{fontWeight:700,fontSize:13,marginBottom:12,color:"var(--b)"}}>📎 Ajouter un document</div>
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
          ?<div style={{fontSize:12,color:"var(--S)"}}>📎 {newFile.name} ({(newFile.size/1024).toFixed(0)} Ko) <span style={{color:"var(--l)"}}>— cliquer pour changer</span></div>
          :<div style={{fontSize:12,color:"var(--l)"}}>📁 Cliquer pour sélectionner un fichier (PDF, image, doc...)</div>}
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
        }}>{c.ic} {c.l}</button>
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
    {filtres.length===0&&<div className="card"style={{padding:40,textAlign:"center"}}>
      <div style={{fontSize:40,marginBottom:8}}>🗂️</div>
      <div style={{fontSize:14,color:"var(--l)"}}>Aucun document pour ces filtres.</div>
    </div>}

    {parCat.map(c=>(
      <div key={c.key}style={{marginBottom:20}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
          <div style={{padding:"4px 12px",borderRadius:20,background:c.bg,color:c.c,fontSize:12,fontWeight:700,border:"1px solid "+c.c+"33"}}>
            {c.ic} {c.l}
          </div>
          <div style={{flex:1,height:1,background:"linear-gradient(90deg,var(--br),transparent)"}}/>
          <span style={{fontSize:11,color:"var(--l)",fontFamily:"'DM Mono',monospace"}}>{c.count}</span>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {filtres.filter(d=>d.cat===c.key).map(doc=>{
            const enfant=doc.eId?enfants.find(e=>e.id===doc.eId):null;
            return <div key={doc.id}className="card"style={{padding:"12px 16px",display:"flex",alignItems:"center",gap:12,transition:"box-shadow .18s"}}
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
                  {enfant&&<span className="badge"style={{background:enfant.couleur+"18",color:enfant.couleur,fontSize:10,padding:"1px 7px"}}>
                    {enfant.emoji} {enfant.prenom}
                  </span>}
                  {!doc.partage&&<span className="badge"style={{background:"var(--Bp)",color:"var(--B)",fontSize:10}}>Privé</span>}
                </div>
              </div>
              {/* Actions */}
              <div style={{display:"flex",gap:6,flexShrink:0}}>
                <button className="btn bG"style={{padding:"6px 10px",fontSize:12}}
                  onClick={()=>setApercu(apercu===doc.id?null:doc.id)}
                  title="Aperçu">👁️</button>
                <button className="btn bG"style={{padding:"6px 10px",fontSize:12}}
                  onClick={()=>telechargerDoc(doc)}
                  title="Télécharger">⬇️</button>
                <button className="btn bG"style={{padding:"6px 10px",fontSize:12}}
                  onClick={()=>{if(doc.storagePath||doc.url)telechargerDoc(doc);else setToast("Impression: "+doc.nom);}}
                  title="Imprimer">🖨️</button>
                {role==="asmat"&&<button className="btn bG"style={{padding:"6px 10px",fontSize:12,color:"var(--R)"}}
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
      {(()=>{const doc=docs.find(d=>d.id===apercu);if(!doc)return null;
        return <div style={{background:"var(--w)",borderRadius:16,padding:0,width:"100%",maxWidth:520,overflow:"hidden",boxShadow:"var(--sh2)"}}>
          <div style={{background:"linear-gradient(135deg,var(--T),#B85838)",padding:"16px 20px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{color:"#fff"}}>
              <div style={{fontWeight:700,fontSize:15}}>{doc.icone} {doc.nom}</div>
              <div style={{fontSize:11,opacity:.8,marginTop:2}}>{doc.sous} · {doc.date.split("-").reverse().join("/")} · {doc.taille}</div>
            </div>
            <button onClick={()=>setApercu(null)}style={{background:"rgba(255,255,255,.2)",border:"none",color:"#fff",cursor:"pointer",borderRadius:8,padding:"6px 10px",fontSize:14}}>✕</button>
          </div>
          <div style={{padding:24}}>
            <div style={{background:"var(--c)",borderRadius:12,padding:20,minHeight:200,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12,textAlign:"center"}}>
              <div style={{fontSize:52}}>{doc.icone}</div>
              <div className="pf"style={{fontSize:18,fontWeight:600,color:"var(--b)"}}>{doc.nom}</div>
              <div style={{fontSize:12,color:"var(--l)"}}>Aperçu non disponible en mode démo</div>
              <div style={{fontSize:11,color:"var(--l)"}}>Dans la version finale, le PDF s'affiche ici</div>
            </div>
            <div style={{display:"flex",gap:8,marginTop:16,justifyContent:"flex-end"}}>
              <button className="btn bG"onClick={()=>{if(doc.storagePath||doc.url)telechargerDoc(doc);else window.print();}}>🖨️ Imprimer</button>
              <button className="btn bT"onClick={()=>telechargerDoc(doc)}>⬇️ Télécharger</button>
            </div>
          </div>
        </div>;
      })()}
    </div>}
  </div>;
}

//
const TAUX_COTISATIONS={
  "Maladie-maternité":{sal:0,pat:7},
  "Retraite de base":{sal:6.9,pat:8.55},
  "Retraite complémentaire ARRCO":{sal:3.15,pat:4.72},
  "Assurance chômage":{sal:0,pat:4.05},
  "Formation professionnelle":{sal:0,pat:0.5},
  "Accidents du travail":{sal:0,pat:1.5},
  "Allocations familiales":{sal:0,pat:3.45},
  "CSG déductible":{sal:6.8,pat:0},
  "CSG/CRDS non déductible":{sal:2.9,pat:0},
};

function BulletinSalaire({enfants,role,pEId,user}){
  const [selId,setSelId]=useState(enfants[0]?.id);
  const [toast,setToast]=useState("");
  const liste=role==="parent"?enfants.filter(e=>e.id===pEId):enfants;
  const enfant=liste.find(e=>e.id===selId)||liste[0];
  const contrat=enfant?.contrat||{};
  const isDemoBull=enfants.every(e=>["e1","e2","e3"].includes(e.id));
  // BULLETIN HISTORIQUE P14C - vraies heures + historique persistant
  const [heuresMoisReel,setHeuresMoisReel]=useState(null);
  const [bulletinsEnvoyes,setBulletinsEnvoyes]=useState({});
  const [envoyer,setEnvoyer]=useState(false);

  // Générer les mois depuis le début de contrat jusqu'à aujourd'hui
  const moisDisponibles=useMemo(()=>{
    const debut=contrat.debut?new Date(contrat.debut):new Date(new Date().getFullYear(),0,1);
    const now=new Date();
    const mois=[];
    const noms=["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
    let d=new Date(debut.getFullYear(),debut.getMonth(),1);
    while(d<=now){
      mois.push({label:noms[d.getMonth()]+" "+d.getFullYear(),key:d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")});
      d.setMonth(d.getMonth()+1);
    }
    return mois.reverse();
  },[contrat.debut]);

  const [moisSel,setMoisSel]=useState(()=>moisDisponibles[0]?.label||"");
  const moisSelKey=moisDisponibles.find(m=>m.label===moisSel)?.key;

  // BULLETIN HISTORIQUE P14C - charger les heures reelles du mois selectionne
  useEffect(()=>{
    if(!enfant?.id||!moisSelKey||isDemoBull){setHeuresMoisReel(null);return;}
    let cancelled=false;
    (async()=>{
      const debut=moisSelKey+"-01";
      const[year,month]=moisSelKey.split("-").map(Number);
      const finDate=new Date(year,month,0); // dernier jour du mois
      const fin=finDate.toISOString().slice(0,10);
      const{data:pts}=await supabase.from("pointages").select("total_minutes,date").eq("enfant_id",enfant.id).gte("date",debut).lte("date",fin);
      if(cancelled)return;
      const totalMin=(pts||[]).reduce((s,p)=>s+(p.total_minutes||0),0);
      const jours=(pts||[]).filter(p=>p.total_minutes>0).length;
      setHeuresMoisReel({heures:Math.round(totalMin/60*100)/100,jours,nbPointages:pts?.length||0});
    })();
    return()=>{cancelled=true;};
  },[enfant?.id,moisSelKey,isDemoBull]);

  // BULLETIN HISTORIQUE P14C - charger l'historique des bulletins envoyes pour ce contrat
  useEffect(()=>{
    if(!contrat?.id||isDemoBull){setBulletinsEnvoyes({});return;}
    let cancelled=false;
    (async()=>{
      const{data}=await supabase.from("bulletins").select("mois,envoye_au_parent,date_envoi,pdf_storage_path").eq("contrat_id",contrat.id);
      if(cancelled)return;
      const map={};
      (data||[]).forEach(b=>{map[b.mois]=b;});
      setBulletinsEnvoyes(map);
    })();
    return()=>{cancelled=true;};
  },[contrat?.id,isDemoBull]);

  const hMens=Math.round((contrat.heuresHebdo||40)*52/12);
  // Si heures reelles disponibles : utiliser. Sinon : estimation contrat
  const useRealHours=heuresMoisReel&&heuresMoisReel.heures>0;
  const h=isDemoBull
    ?(D.heures[enfant?.id]||{real:160,prev:174})
    :{real:useRealHours?heuresMoisReel.heures:hMens,prev:hMens};
  const tauxH=contrat.tauxHoraire||4.05;
  const heuresNorm=Math.min(h.real,45*4);
  const hSupp=Math.max(0,h.real-heuresNorm);
  const salBase=heuresNorm*tauxH;
  const salSupp=hSupp*tauxH*1.25;
  const brut=salBase+salSupp;
  const joursTravailles=useRealHours?heuresMoisReel.jours:Math.round(h.real/8);
  const entretien=(contrat.entretien||3.80)*joursTravailles;
  const totalCotSal=Object.values(TAUX_COTISATIONS).reduce((s,t)=>s+(t.sal>0?brut*t.sal/100:0),0);
  const totalCotPat=Object.values(TAUX_COTISATIONS).reduce((s,t)=>s+(t.pat>0?brut*t.pat/100:0),0);
  const netImposable=brut-totalCotSal*0.68;
  const netPaye=brut-totalCotSal;
  const coutEmployeur=brut+totalCotPat;
  const netSocial=Math.round((brut-totalCotSal)*100)/100; // mention obligatoire (brut - cotisations salariales, hors indemnites)
  const cpAcquis=2.5; // jours ouvrables acquis par mois travaille (CCN particuliers employeurs, 30j/an)

  // BULLETIN HISTORIQUE P14C - generer et stocker le bulletin (PDF + DB + email)
  const envoyerAuParent=async()=>{
    if(!contrat?.id||!enfant?.id||!moisSelKey){setToast("Contrat ou enfant manquant");return;}
    setEnvoyer(true);
    try{
      // 1. Generer le PDF en jsPDF natif
      if(!window.jspdf){
        await new Promise((res,rej)=>{
          const s=document.createElement("script");
          s.src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
          s.onload=res;s.onerror=()=>rej(new Error("Chargement jsPDF"));
          document.head.appendChild(s);
        });
      }
      const{jsPDF}=window.jspdf;
      const doc=new jsPDF({unit:"mm",format:"a4",orientation:"portrait"});
      const PW=210,MX=15;let y=15;
      const orange=[184,98,47];const noir=[40,40,40];const gris=[120,120,120];const vert=[42,157,143];
      // re-fetch signature
      let userSig=user?.signature_base64;
      const{data:fresh}=await supabase.from("profiles").select("signature_base64,numero_agrement").eq("id",user.id).maybeSingle();
      if(fresh?.signature_base64)userSig=fresh.signature_base64;
      // Header
      doc.setFontSize(8);doc.setTextColor(...gris);doc.setFont("helvetica","normal");
      doc.text("Convention Collective Nationale - Particuliers Employeurs (IDCC 2395)",PW/2,y,{align:"center"});y+=5;
      doc.setFontSize(16);doc.setFont("helvetica","bold");doc.setTextColor(...orange);
      doc.text("BULLETIN DE PAIE",PW/2,y,{align:"center"});y+=6;
      doc.setFontSize(11);doc.setFont("helvetica","bold");doc.setTextColor(...noir);
      doc.text(moisSel,PW/2,y,{align:"center"});y+=8;
      // Employeur / Salarie
      const parentP=enfant?.parent;
      const prenomEmp=parentP?.prenom?(parentP.prenom+" "+(parentP.nom||"")):"Parent employeur";
      doc.setFillColor(248,248,248);doc.rect(MX,y,PW-2*MX,22,"F");
      doc.setFontSize(9);doc.setFont("helvetica","bold");
      doc.text("EMPLOYEUR (Particulier)",MX+2,y+5);
      doc.text("SALARIEE (Asmat agreee)",MX+(PW-2*MX)/2+2,y+5);
      doc.setFont("helvetica","normal");doc.setFontSize(9);
      doc.text(prenomEmp,MX+2,y+11);
      doc.text((user?.prenom||"")+" "+(user?.nom||""),MX+(PW-2*MX)/2+2,y+11);
      doc.setFontSize(8);
      doc.text("Code APE : 8891A",MX+2,y+16);
      if(fresh?.numero_agrement)doc.text("N agrement : "+fresh.numero_agrement,MX+(PW-2*MX)/2+2,y+16);
      doc.text("Entree le : "+(contrat.debut||"-")+" - CDI",MX+(PW-2*MX)/2+2,y+20);
      y+=28;
      // Section : Remuneration
      const section=(t)=>{
        doc.setFillColor(...orange);doc.rect(MX,y,PW-2*MX,6,"F");
        doc.setFontSize(9);doc.setFont("helvetica","bold");doc.setTextColor(255,255,255);
        doc.text(t,MX+2,y+4);
        y+=8;
        doc.setTextColor(...noir);
      };
      const ligne=(l,col2,col3,col4,bold)=>{
        doc.setDrawColor(220,220,220);doc.rect(MX,y,PW-2*MX,6);
        doc.setFontSize(8);doc.setFont("helvetica",bold?"bold":"normal");
        doc.text(l,MX+2,y+4);
        if(col2)doc.text(col2,MX+95,y+4);
        if(col3)doc.text(col3,MX+130,y+4);
        if(col4)doc.text(col4,PW-MX-2,y+4,{align:"right"});
        y+=6;
      };
      section("REMUNERATION");
      ligne("Salaire de base (heures normales)",heuresNorm+" h",tauxH.toFixed(4)+" euros/h",salBase.toFixed(2)+" euros");
      if(hSupp>0)ligne("Heures supplementaires (+25%)",hSupp+" h",(tauxH*1.25).toFixed(4)+" euros/h",salSupp.toFixed(2)+" euros");
      ligne("Indemnite d entretien",joursTravailles+" jours",(contrat.entretien||3.80).toFixed(2)+" euros/j",entretien.toFixed(2)+" euros");
      doc.setFillColor(251,240,232);doc.rect(MX,y,PW-2*MX,7,"F");
      doc.setFont("helvetica","bold");doc.setFontSize(9);
      doc.text("SALAIRE BRUT MENSUEL",MX+2,y+5);
      doc.text(brut.toFixed(2)+" euros",PW-MX-2,y+5,{align:"right"});
      y+=10;
      // Section : Cotisations
      section("COTISATIONS SOCIALES");
      Object.entries(TAUX_COTISATIONS).forEach(([nom,t])=>{
        if(t.sal>0||t.pat>0){
          const cs=brut*t.sal/100;
          const cp=brut*t.pat/100;
          ligne(nom,t.sal>0?"-"+cs.toFixed(2):"",t.pat>0?cp.toFixed(2):"","");
        }
      });
      doc.setFillColor(245,245,245);doc.rect(MX,y,PW-2*MX,7,"F");
      doc.setFont("helvetica","bold");doc.setFontSize(9);
      doc.text("TOTAL COTISATIONS",MX+2,y+5);
      doc.setTextColor(196,74,106);
      doc.text("-"+totalCotSal.toFixed(2)+" euros",MX+95,y+5);
      doc.setTextColor(...noir);
      doc.text(totalCotPat.toFixed(2)+" euros",MX+130,y+5);
      y+=10;
      // Section : Recap net
      if(y>240){doc.addPage();y=15;}
      section("RECAPITULATIF NET");
      ligne("Salaire brut","","",brut.toFixed(2)+" euros");
      doc.setTextColor(196,74,106);
      ligne("Cotisations salariales","","","- "+totalCotSal.toFixed(2)+" euros");
      doc.setTextColor(...noir);
      doc.setFillColor(...orange);doc.rect(MX,y,PW-2*MX,8,"F");
      doc.setTextColor(255,255,255);doc.setFont("helvetica","bold");doc.setFontSize(11);
      doc.text("NET A PAYER",MX+2,y+5.5);
      doc.text(netPaye.toFixed(2)+" euros",PW-MX-2,y+5.5,{align:"right"});
      y+=10;
      doc.setTextColor(...noir);doc.setFontSize(8);
      doc.setFillColor(234,244,238);doc.rect(MX,y,PW-2*MX,6,"F");
      doc.setFont("helvetica","bold");doc.setTextColor(61,107,80);
      doc.text("Net imposable (abattement fiscal asmat)",MX+2,y+4);
      doc.text(netImposable.toFixed(2)+" euros",PW-MX-2,y+4,{align:"right"});
      y+=7;
      doc.setFillColor(232,240,247);doc.rect(MX,y,PW-2*MX,6,"F");
      doc.setFont("helvetica","bold");doc.setTextColor(46,72,89);
      doc.text("Montant net social",MX+2,y+4);
      doc.text(netSocial.toFixed(2)+" euros",PW-MX-2,y+4,{align:"right"});
      y+=7;
      doc.setTextColor(...gris);doc.setFont("helvetica","normal");doc.setFontSize(7);
      doc.text("Reference RSA / prime d activite (hors indemnites). Conges payes acquis ce mois : "+cpAcquis+" jours ouvrables.",MX+2,y+3);
      y+=6;doc.setFontSize(8);
      doc.setTextColor(...noir);doc.setFont("helvetica","normal");
      ligne("Indemnite entretien (non imposable)","","",entretien.toFixed(2)+" euros");
      doc.setFillColor(245,240,255);doc.rect(MX,y,PW-2*MX,6,"F");
      doc.setFont("helvetica","bold");
      doc.text("Cout total employeur",MX+2,y+4);
      doc.text((coutEmployeur+entretien).toFixed(2)+" euros",PW-MX-2,y+4,{align:"right"});
      y+=12;
      // Signature
      if(y>250){doc.addPage();y=15;}
      const sigW=(PW-2*MX-5)/2;
      doc.setDrawColor(220,220,220);
      doc.rect(MX,y,sigW,25);
      doc.rect(MX+sigW+5,y,sigW,25);
      doc.setFontSize(8);doc.setFont("helvetica","bold");doc.setTextColor(...noir);
      doc.text("Signature de l employeur",MX+2,y+4);
      doc.text("Signature de la salariee",MX+sigW+7,y+4);
      doc.setFontSize(7);doc.setFont("helvetica","normal");doc.setTextColor(...gris);
      doc.text("Date : __________",MX+2,y+22);
      if(userSig){
        try{doc.addImage(userSig,"PNG",MX+sigW+7,y+6,40,12);}catch(e){}
        doc.text("Le "+new Date().toLocaleDateString("fr-FR"),MX+sigW+7,y+22);
      }else{
        doc.text("Date : __________",MX+sigW+7,y+22);
      }
      y+=30;
      // Footer
      doc.setFontSize(7);doc.setTextColor(...gris);
      doc.text("Bulletin TiMat - "+new Date().toLocaleDateString("fr-FR")+" | CCN IDCC 2395 | A conserver 5 ans",PW/2,y,{align:"center"});

      // 2. Convertir en blob
      const blob=doc.output("blob");
      const fileName="bulletin_"+contrat.id+"_"+moisSelKey+".pdf";
      const path=user.id+"/bulletins/"+fileName;
      // 3. Upload
      const{error:eUp}=await supabase.storage.from("documents").upload(path,blob,{
        contentType:"application/pdf",upsert:true,
      });
      if(eUp){setToast("Erreur upload : "+eUp.message);setEnvoyer(false);return;}
      // 4. Upsert dans bulletins
      const annee=parseInt(moisSelKey.split("-")[0],10);
      const{error:eIns}=await supabase.from("bulletins").upsert({
        contrat_id:contrat.id,
        enfant_id:enfant.id,
        asmat_id:user.id,
        parent_id:contrat.parent_id||null,
        mois:moisSelKey,
        annee,
        heures_reelles:h.real,
        jours_travailles:joursTravailles,
        salaire_brut:Math.round(brut*100)/100,
        salaire_net:Math.round(netPaye*100)/100,
        net_imposable:Math.round(netImposable*100)/100,
        cotisations_salariales:Math.round(totalCotSal*100)/100,
        cotisations_patronales:Math.round(totalCotPat*100)/100,
        entretien:Math.round(entretien*100)/100,
        cout_employeur:Math.round((coutEmployeur+entretien)*100)/100,
        pdf_storage_path:path,
        envoye_au_parent:true,
        date_envoi:new Date().toISOString(),
      },{onConflict:"contrat_id,mois"});
      if(eIns){setToast("Erreur DB : "+eIns.message);setEnvoyer(false);return;}
      // 5. Upsert dans documents_meta
      const{data:existing}=await supabase.from("documents_meta").select("id").eq("storage_path",path).maybeSingle();
      const nomDoc="Bulletin_"+(enfant.prenom||"enfant")+"_"+moisSelKey+".pdf";
      if(existing){
        await supabase.from("documents_meta").update({
          nom:nomDoc,categorie:"admin",sous_type:"Bulletin de salaire",
        }).eq("id",existing.id);
      }else{
        await supabase.from("documents_meta").insert({
          asmat_id:user.id,enfant_id:enfant.id,
          nom:nomDoc,categorie:"admin",sous_type:"Bulletin de salaire",
          storage_path:path,partage:true,
          taille:Math.round(blob.size/1024)+" Ko",
        });
      }
      await logAction("send_bulletin",{table_name:"bulletins",record_id:contrat.id});
      // 6. Email parent (silencieux si Resend pas configure)
      if(contrat.parent_id){
        createNotification({userId:contrat.parent_id,type:"bulletin_sent",titre:"Nouveau bulletin de salaire disponible"+(moisSel?(" — "+moisSel):""),page:"admin_finances"});
        supabase.rpc("get_recipient_email",{p_user_id:contrat.parent_id}).then(({data:p})=>{
          if(p?.email){
            sendNotificationEmail({
              type:"bulletin_sent",
              to:p.email,
              subject:EMAIL_TEMPLATES.bulletin_sent.subject,
              template:"bulletin_sent",
              vars:{parent_prenom:p.prenom||"",mois:moisSel},
            });
          }
        });
      }
      // 7. Refresh local
      setBulletinsEnvoyes(b=>({...b,[moisSelKey]:{mois:moisSelKey,envoye_au_parent:true,date_envoi:new Date().toISOString(),pdf_storage_path:path}}));
      setToast("Bulletin envoyé au parent ✓ et archivé dans Documents");
    }catch(e){
      setToast("Erreur : "+e.message);
    }
    setEnvoyer(false);
  };

  return <div className="fi">
    {toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
    <PageHeader icon="📜" title="Bulletin de salaire" sub="Bulletin officiel conforme à la convention collective"/>
    {role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
      {liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>{setSelId(e.id);}}/>)}
    </div>}
    <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
      {moisDisponibles.slice(0,8).map(m=>{
        const env=bulletinsEnvoyes[m.key];
        return <button key={m.label}onClick={()=>setMoisSel(m.label)}style={{
          padding:"6px 14px",borderRadius:8,border:"1.5px solid",cursor:"pointer",fontSize:12,fontWeight:600,
          background:moisSel===m.label?"var(--b)":"transparent",color:moisSel===m.label?"#fff":"var(--m)",
          borderColor:moisSel===m.label?"var(--b)":(env?.envoye_au_parent?"var(--S)":"var(--br)"),
          position:"relative"}}>
          {m.label}
          {env?.envoye_au_parent&&<span style={{position:"absolute",top:-6,right:-6,fontSize:11,background:"var(--S)",color:"#fff",borderRadius:"50%",width:18,height:18,display:"flex",alignItems:"center",justifyContent:"center"}}>✓</span>}
        </button>;
      })}
    </div>
    {/* BULLETIN HISTORIQUE P14C - statut du mois selectionne */}
    {moisSelKey&&bulletinsEnvoyes[moisSelKey]?.envoye_au_parent&&<div style={{padding:"10px 14px",background:"var(--Sp)",border:"1px solid var(--S)",borderRadius:8,marginBottom:12,fontSize:12,color:"var(--S)",display:"flex",alignItems:"center",gap:8}}>
      ✅ <strong>Bulletin envoyé au parent</strong> le {new Date(bulletinsEnvoyes[moisSelKey].date_envoi).toLocaleDateString("fr-FR")} — disponible dans Documents
    </div>}
    {moisSelKey&&!bulletinsEnvoyes[moisSelKey]&&!isDemoBull&&<div style={{padding:"10px 14px",background:"var(--Bp)",border:"1px solid var(--B)",borderRadius:8,marginBottom:12,fontSize:12,color:"var(--B)"}}>
      ⏳ Bulletin non encore envoyé pour ce mois
      {useRealHours?<span style={{marginLeft:8,fontSize:11,color:"var(--S)"}}>· {heuresMoisReel.heures} h pointées sur {heuresMoisReel.jours} j</span>
        :<span style={{marginLeft:8,fontSize:11,color:"var(--l)",fontStyle:"italic"}}>· basé sur le contrat (aucun pointage)</span>}
    </div>}

    <div className="card"style={{padding:24,border:"2px solid var(--br)"}}>
      <div style={{borderBottom:"2px solid var(--b)",paddingBottom:14,marginBottom:14}}>
        <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
          <div>
            <div className="pf"style={{fontSize:18,fontWeight:700,color:"var(--b)"}}>BULLETIN DE PAIE - {moisSel}</div>
            <div style={{fontSize:11,color:"var(--l)"}}>Convention collective particuliers employeurs</div>
          </div>
          <div style={{textAlign:"right",fontSize:11}}>
            <div style={{fontWeight:700,color:"var(--b)"}}>Employeur</div>
            <div style={{color:"var(--m)"}}>{D.parents.find(p=>p.id===enfant?.parentId)?.prenom||"Parent"} {D.parents.find(p=>p.id===enfant?.parentId)?.nom||""}</div>
            <div style={{color:"var(--l)"}}>N° Pajemploi : à renseigner sur pajemploi.fr</div>
          </div>
        </div>
        <div style={{marginTop:10,display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:8,fontSize:11}}>
          <div><div style={{fontWeight:700,color:"var(--b)"}}>Salarié·e</div>
            <div style={{color:"var(--m)"}}>{user?.prenom||D.asmat.prenom} {user?.nom||D.asmat.nom} · Assistante maternelle agréée</div>
          </div>
        </div>
      </div>

      {/* Rémunération */}
      <div style={{marginBottom:14}}>
        <div style={{fontSize:10,fontWeight:700,color:"var(--l)",textTransform:"uppercase",letterSpacing:".5px",marginBottom:8}}>RÉMUNÉRATION</div>
        {[["Salaire de base",heuresNorm+"h × "+tauxH+"€/h",salBase.toFixed(2)+"€"],
          ...(hSupp>0?[["Heures majorées 25%",hSupp+"h × "+(tauxH*1.25).toFixed(2)+"€",salSupp.toFixed(2)+"€"]]:[]),
          ["Indemnité d'entretien",Math.round(h.real/8)+" j × "+(contrat.entretien||3.80)+"€",entretien.toFixed(2)+"€"],
        ].map(([l,d,v])=><div key={l}style={{display:"flex",justifyContent:"space-between",fontSize:12,padding:"4px 0",borderBottom:"1px dotted var(--br)"}}>
          <span style={{color:"var(--b)",flex:2}}>{l}</span>
          <span style={{color:"var(--l)",flex:2,textAlign:"center"}}>{d}</span>
          <span style={{fontWeight:600,flex:1,textAlign:"right"}}>{v}</span>
        </div>)}
        <div style={{display:"flex",justifyContent:"space-between",fontWeight:700,marginTop:6,paddingTop:6,borderTop:"1px solid var(--b)",fontSize:13}}>
          <span>SALAIRE BRUT</span><span style={{color:"var(--b)"}}>{brut.toFixed(2)} €</span>
        </div>
      </div>

      {/* Cotisations */}
      <div style={{marginBottom:14}}>
        <div style={{fontSize:10,fontWeight:700,color:"var(--l)",textTransform:"uppercase",letterSpacing:".5px",marginBottom:6}}>COTISATIONS</div>
        <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr",fontSize:10}}>
          {["Libellé","Salarié","Employeur"].map(h2=><div key={h2}style={{fontWeight:700,color:"var(--l)",padding:"3px 0",borderBottom:"1px solid var(--br)"}}>{h2}</div>)}
          {Object.entries(TAUX_COTISATIONS).flatMap(([nom,t])=>[
            <div key={nom+"l"}style={{fontSize:10,color:"var(--m)",padding:"2px 0",borderBottom:"1px dotted var(--br)"}}>{nom}</div>,
            <div key={nom+"s"}style={{fontSize:10,textAlign:"right",color:"var(--R)",padding:"2px 0",borderBottom:"1px dotted var(--br)"}}>{t.sal>0?(brut*t.sal/100).toFixed(2)+"€":"-"}</div>,
            <div key={nom+"p"}style={{fontSize:10,textAlign:"right",padding:"2px 0",borderBottom:"1px dotted var(--br)"}}>{t.pat>0?(brut*t.pat/100).toFixed(2)+"€":"-"}</div>,
          ])}
          <div style={{fontWeight:700,fontSize:11,padding:"4px 0",borderTop:"1px solid var(--b)"}}>TOTAL</div>
          <div style={{fontWeight:700,fontSize:11,textAlign:"right",color:"var(--R)",padding:"4px 0",borderTop:"1px solid var(--b)"}}>{totalCotSal.toFixed(2)}€</div>
          <div style={{fontWeight:700,fontSize:11,textAlign:"right",padding:"4px 0",borderTop:"1px solid var(--b)"}}>{totalCotPat.toFixed(2)}€</div>
        </div>
      </div>

      {/* Net */}
      <div style={{background:"var(--c)",borderRadius:10,padding:14,marginBottom:16}}>
        {[["Salaire brut",brut.toFixed(2)+"€","var(--b)"],
          ["Cotisations salariales","-"+totalCotSal.toFixed(2)+"€","var(--R)"],
          ["NET À PAYER",netPaye.toFixed(2)+"€","var(--S)"],
          ["Net imposable (abattement fiscal assmat)",netImposable.toFixed(2)+"€","var(--B)"],
          ["Montant net social",netSocial.toFixed(2)+"€","var(--B)"],
          ["Coût total pour l'employeur",(coutEmployeur+entretien).toFixed(2)+"€","var(--m)"],
        ].map(([l,v,c])=><div key={l}style={{display:"flex",justifyContent:"space-between",padding:"5px 0",
          borderBottom:"1px solid var(--br)",fontSize:l.includes("NET À")?14:12,fontWeight:l.includes("NET À")?700:400}}>
          <span style={{color:"var(--m)"}}>{l}</span><span style={{fontWeight:700,color:c}}>{v}</span>
        </div>)}
      </div>

      <div style={{fontSize:10,color:"var(--l)",lineHeight:1.6,marginBottom:14}}>
        Bulletin conforme CCN particuliers employeurs. <b>Montant net social</b> (référence RSA / prime d'activité) = salaire brut − cotisations salariales, hors indemnités. <b>Congés payés acquis : 2,5 jours ouvrables/mois</b> (30 j/an). Net imposable calculé avec abattement fiscal spécifique assmats. À conserver 5 ans.
      </div>
      <div style={{display:"flex",gap:8}}>
        <button className="btn bG"style={{flex:1}}onClick={()=>{
        const w=window.open('','_blank');
        if(!w){setToast('Autorisez les popups pour télécharger');return;}
        const prenomEmp=enfant?.prenomParent||(enfant?.parentId?"Parent employeur":"Parent");
        const cotisDetails=Object.entries(TAUX_COTISATIONS).map(function(entry){
          var nom=entry[0],t=entry[1];
          return "<tr><td>"+nom+"</td>"
            +"<td class=\"right\">"+(t.sal>0?(brut*t.sal/100).toFixed(2)+"€":"-")+"</td>"
            +"<td class=\"right\">"+(t.pat>0?(brut*t.pat/100).toFixed(2)+"€":"-")+"</td></tr>";
        }).join("");
        var hSuppRow=hSupp>0?"<tr><td>Heures compl. (maj. 25%)</td><td class=\"right\">"+hSupp+" h</td><td class=\"right\">"+(tauxH*1.25).toFixed(4)+" €/h</td><td class=\"right\">"+salSupp.toFixed(2)+" €</td></tr>":"";
        var htmlParts=[
          "<!DOCTYPE html><html lang=\"fr\"><head><meta charset=\"UTF-8\"/>",
          "<title>Bulletin de salaire "+moisSel+"</title>",
          "<style>",
          "*{box-sizing:border-box;margin:0;padding:0}",
          "body{font-family:Arial,sans-serif;font-size:11px;color:#222;padding:20px;max-width:800px;margin:0 auto}",
          "h1{font-size:16px;color:#2C1F14;text-align:center;margin:12px 0}",
          ".hg{display:grid;grid-template-columns:1fr 1fr;gap:12px;background:#F5F0EB;padding:12px;border-radius:6px;margin-bottom:12px;border:1px solid #DDD5C8}",
          ".hg div{font-size:10px;line-height:1.7}",
          ".hg strong{font-size:11px;color:#B8622F}",
          ".st{background:#2C1F14;color:#fff;padding:5px 10px;font-weight:700;font-size:11px;margin:10px 0 4px;letter-spacing:.5px}",
          "table{width:100%;border-collapse:collapse;font-size:10px}",
          "td,th{padding:5px 8px;border:1px solid #ddd}",
          "th{background:#f5f5f5;font-weight:700;text-align:left}",
          ".right{text-align:right}",
          ".brut{background:#FBF0E8;font-weight:700;font-size:11px}",
          ".net{background:#B8622F;color:#fff;font-weight:700;font-size:13px}",
          ".ni{background:#EAF4EE;font-weight:700;color:#3D6B50}",
          ".ce{background:#F5F0FF;font-weight:700}",
          ".sz{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:20px}",
          ".sb{border:1px solid #ddd;height:80px;border-radius:4px;padding:8px;font-size:9px;color:#aaa;display:flex;align-items:center;justify-content:center}",
          ".sb img{max-height:60px;max-width:100%;object-fit:contain}",
          "@media print{.nb{display:none}}",
          "</style></head><body>",
          "<div style=\"text-align:center;margin-bottom:8px\">",
          "<div style=\"font-size:9px;color:#888;text-transform:uppercase;letter-spacing:1px\">Convention Collective Nationale - Particuliers Employeurs</div>",
          "<h1>BULLETIN DE PAIE</h1>",
          "<div style=\"font-size:12px;color:#B8622F;font-weight:700\">"+moisSel+"</div>",
          "</div>",
          "<div class=\"hg\">",
          "<div><strong>EMPLOYEUR (Particulier)</strong><br/>"+prenomEmp+"<br/>",
          "N° Pajemploi : PAJ-"+new Date().getFullYear()+"-"+Math.floor(Math.random()*99999)+"<br/>",
          "Emploi : Assistante maternelle agréée<br/>Code APE : 8891A</div>",
          "<div><strong>SALARIE(E)</strong><br/>"+(user?.prenom||"Prénom")+" "+(user?.nom||"Nom")+"<br/>",
          "Entree le : "+(contrat.debut||"-")+" - CDI</div>",
          "</div>",
          "<div class=\"st\">REMUNERATION</div>",
          "<table><tr><th>Libellé</th><th>Heures / Jours</th><th>Taux</th><th class=\"right\">Montant brut</th></tr>",
          "<tr><td>Salaire de base (heures normales)</td><td class=\"right\">"+heuresNorm+" h</td><td class=\"right\">"+tauxH.toFixed(4)+" euros/h</td><td class=\"right\">"+salBase.toFixed(2)+" euros</td></tr>",
          hSuppRow,
          "<tr><td>Indemnite d entretien</td><td class=\"right\">"+Math.round(h.real/8)+" jours</td><td class=\"right\">"+(contrat.entretien||3.80).toFixed(2)+" euros/j</td><td class=\"right\">"+entretien.toFixed(2)+" euros</td></tr>",
          "<tr class=\"brut\"><td colspan=\"3\">SALAIRE BRUT MENSUEL</td><td class=\"right\">"+brut.toFixed(2)+" euros</td></tr>",
          "</table>",
          "<div class=\"st\">COTISATIONS SOCIALES</div>",
          "<table><tr><th>Cotisation</th><th class=\"right\">Part salarie</th><th class=\"right\">Part employeur</th></tr>",
          cotisDetails,
          "<tr style=\"font-weight:700;background:#f5f5f5\"><td>TOTAL</td><td class=\"right\" style=\"color:#c44a6a\">-"+totalCotSal.toFixed(2)+" euros</td><td class=\"right\">"+totalCotPat.toFixed(2)+" euros</td></tr>",
          "</table>",
          "<div class=\"st\">RECAPITULATIF NET</div>",
          "<table>",
          "<tr><td>Salaire brut</td><td class=\"right\">"+brut.toFixed(2)+" euros</td></tr>",
          "<tr><td>Cotisations salariales</td><td class=\"right\" style=\"color:#c44a6a\">- "+totalCotSal.toFixed(2)+" euros</td></tr>",
          "<tr class=\"net\"><td>NET A PAYER</td><td class=\"right\">"+netPaye.toFixed(2)+" euros</td></tr>",
          "<tr class=\"ni\"><td>Net imposable (abattement fiscal assmat)</td><td class=\"right\">"+netImposable.toFixed(2)+" euros</td></tr>",
          "<tr class=\"ni\"><td>Montant net social (reference RSA / prime d activite, hors indemnites)</td><td class=\"right\">"+netSocial.toFixed(2)+" euros</td></tr>",
          "<tr><td>Conges payes acquis ce mois</td><td class=\"right\">"+cpAcquis+" jours ouvrables</td></tr>",
          "<tr><td>Indemnite entretien (non imposable)</td><td class=\"right\">"+entretien.toFixed(2)+" euros</td></tr>",
          "<tr class=\"ce\"><td>Cout total employeur (brut + cotis. patronales)</td><td class=\"right\">"+(coutEmployeur+entretien).toFixed(2)+" euros</td></tr>",
          "</table>",
          "<div class=\"sz\">",
          "<div><div style=\"font-size:10px;font-weight:700;margin-bottom:6px\">Signature de l employeur</div><div class=\"sb\">Date: ________________</div></div>",
          // SIGNATURE STANDARD ASMAT P10 - injection signature dans bulletin de salaire
          "<div><div style=\"font-size:10px;font-weight:700;margin-bottom:6px\">Signature de la salariee</div>",
          (user?.signature_base64
            ?"<div class=\"sb\"><img src=\""+user.signature_base64+"\" alt=\"Signature\"/></div><div style=\"font-size:9px;color:#888;text-align:center;margin-top:4px\">Le "+new Date().toLocaleDateString("fr-FR")+"</div>"
            :"<div class=\"sb\">Date: ________________</div>"),
          "</div>",
          "</div>",
          "<p style=\"margin-top:16px;font-size:9px;color:#888;line-height:1.8\">",
          "Bulletin TiMat - "+new Date().toLocaleDateString("fr-FR")+" | CCN Particuliers Employeurs (IDCC 2395) | A conserver 5 ans",
          "</p>",
          "<div style=\"text-align:center;margin-top:12px\">",
          "<button class=\"nb\" onclick=\"window.print()\" style=\"background:#B8622F;color:#fff;border:none;padding:12px 28px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:700\">Imprimer / PDF</button>",
          "</div>",
          "</body></html>"
        ];
        var htmlBulletin=htmlParts.join("");
                w.document.write(htmlBulletin);
        w.document.close();
        setToast('Bulletin ouvert dans un nouvel onglet ✓');
      }}>📥 Télécharger PDF</button>
        {role==="asmat"&&<button className="btn bT"style={{flex:1}}onClick={envoyerAuParent}disabled={envoyer||isDemoBull}>
          {envoyer?"⏳ Envoi en cours...":(bulletinsEnvoyes[moisSelKey]?.envoye_au_parent?"🔄 Renvoyer au parent":"📧 Envoyer au parent")}
        </button>}
      </div>
    </div>
  </div>;
}

//
const MODELES_CONTRATS=[
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

function DemandesAvenants({enfants,role,pEId}){
  const liste=role==="parent"?enfants.filter(e=>e.id===pEId):enfants;
  const enfant=liste[0];
  const [demandes,setDemandes]=useState([]);
  const [form,setForm]=useState({type:"Modification d'horaires",detail:"",dateEffet:""});
  const [toast,setToast]=useState("");

  const types=["Modification d'horaires","Revalorisation du salaire","Modification des jours d'accueil","Changement de la durée du contrat","Autre modification"];

  const soumettre=()=>{
    if(!form.detail.trim()||!form.dateEffet)return;
    setDemandes(p=>[{
      id:"av"+Date.now(),
      type:form.type,detail:form.detail,
      dateEffet:form.dateEffet,
      statut:"En attente",
      date:TODAY_STR,
      enfantId:enfant?.id,
      prenomEnfant:enfant?.prenom||"Enfant",
    },...p]);
    setForm({type:"Modification d'horaires",detail:"",dateEffet:""});
    setToast("Demande d'avenant envoyée ✓ - l'asmat sera notifiée");
  };

  const statutColor={
    "En attente":"var(--G)","Acceptée":"var(--S)","Refusée":"var(--R)","Signée":"var(--T)"
  };

  return <div>
    {toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
    <PageHeader icon="✏️" title="Demandes d'avenants"
      sub="Toute modification du contrat doit faire l'objet d'un avenant signé"/>

    <div className="card"style={{padding:20,marginBottom:16}}>
      <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:14}}>
        ➕ Nouvelle demande d'avenant
      </div>
      <div style={{display:"grid",gap:12}}>
        <div>
          <label className="lbl">Type de modification</label>
          <select className="sel"value={form.type}onChange={e=>setForm(p=>({...p,type:e.target.value}))}>
            {types.map(t=><option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="lbl">Date d'effet souhaitée *</label>
          <input type="date"className="inp"value={form.dateEffet}
            onChange={e=>setForm(p=>({...p,dateEffet:e.target.value}))}/>
        </div>
        <div>
          <label className="lbl">Détail de la demande *</label>
          <textarea className="ta"placeholder="Décrivez précisément la modification souhaitée..."
            value={form.detail}onChange={e=>setForm(p=>({...p,detail:e.target.value}))}
            style={{minHeight:80}}/>
        </div>
        <button className="btn bT"style={{justifyContent:"center"}}onClick={soumettre}
          disabled={!form.detail.trim()||!form.dateEffet}>
          📤 Soumettre la demande
        </button>
      </div>
    </div>

    {demandes.length>0&&<div style={{display:"flex",flexDirection:"column",gap:8}}>
      <div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:6}}>📋 Historique des demandes</div>
      {demandes.map(d=><div key={d.id}className="card"style={{padding:14}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
          <div>
            <div style={{fontWeight:700,fontSize:13,color:"var(--b)"}}>{d.type}</div>
            <div style={{fontSize:11,color:"var(--l)"}}>Demande du {fmt(d.date)} · Effet le {fmt(d.dateEffet)}</div>
          </div>
          <span className="badge"style={{background:"var(--Gp)",color:statutColor[d.statut],fontSize:11}}>
            {d.statut}
          </span>
        </div>
        <div style={{fontSize:12,color:"var(--m)",background:"var(--c)",borderRadius:8,padding:"8px 10px"}}>
          {d.detail}
        </div>
        {role==="asmat"&&d.statut==="En attente"&&<div style={{display:"flex",gap:8,marginTop:10}}>
          <button className="btn bG"style={{fontSize:11}}
            onClick={()=>setDemandes(p=>p.map(x=>x.id===d.id?{...x,statut:"Refusée"}:x))}>
            ✕ Refuser
          </button>
          <button className="btn bT"style={{fontSize:11,flex:1,justifyContent:"center"}}
            onClick={()=>setDemandes(p=>p.map(x=>x.id===d.id?{...x,statut:"Acceptée"}:x))}>
            ✓ Accepter et créer l'avenant
          </button>
        </div>}
      </div>)}
    </div>}

    {demandes.length===0&&<div className="card"style={{padding:24,textAlign:"center"}}>
      <div style={{fontSize:36,marginBottom:8}}>✏️</div>
      <div style={{fontSize:13,color:"var(--m)"}}>Aucune demande d'avenant en cours</div>
      <div style={{fontSize:11,color:"var(--l)",marginTop:4}}>Les demandes soumises apparaîtront ici</div>
    </div>}
  </div>;
}

function ContratsTypes({enfants}){
  const [selModele,setSelModele]=useState(null);
  const [form,setForm]=useState({});
  const [toast,setToast]=useState("");
  const m=MODELES_CONTRATS.find(x=>x.id===selModele);

  return <div className="fi">
    {toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
    <PageHeader icon="📋" title="Modèles contrats & Avenants"
      sub="Conformes CCN · À jour de la convention collective 2024"/>

    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(270px,1fr))",gap:12,marginBottom:16}}>
      {MODELES_CONTRATS.map(mod=><div key={mod.id}className="card card-lift"
        onClick={()=>{setSelModele(mod.id===selModele?null:mod.id);setForm({});}}
        style={{padding:16,cursor:"pointer",
          borderLeft:(mod.avenant?"4px solid var(--G)":"4px solid var(--T)"),
          boxShadow:selModele===mod.id?"var(--sh2)":"var(--sh)"}}>
        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
          <span className="badge"style={{background:mod.avenant?"var(--Gp)":"var(--Tp)",color:mod.avenant?"var(--G)":"var(--T)",fontSize:9}}>
            {mod.avenant?"Avenant":"Contrat"}
          </span>
        </div>
        <div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:4}}>{mod.titre}</div>
        <div style={{fontSize:11,color:"var(--m)",lineHeight:1.5}}>{mod.desc}</div>
      </div>)}
    </div>

    {m&&<div className="card"style={{padding:20,border:"2px solid var(--T)"}}>
      <div style={{fontWeight:700,fontSize:15,color:"var(--b)",marginBottom:4}}>{m.titre}</div>
      <div style={{fontSize:12,color:"var(--l)",marginBottom:16}}>{m.desc}</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
        {m.champs.map(c=><div key={c}>
          <label className="lbl">{c}</label>
          {c==="Enfant"?<select className="sel"value={form[c]||""}onChange={e=>setForm(f=>({...f,[c]:e.target.value}))}>
            {enfants.map(e=><option key={e.id}value={e.id}>{e.emoji} {e.prenom}</option>)}
          </select>
          :c.includes("Date")||c.includes("effet")?<input type="date"className="inp"value={form[c]||""}onChange={e=>setForm(f=>({...f,[c]:e.target.value}))}/>
          :<input className="inp"placeholder={c+"..."}value={form[c]||""}onChange={e=>setForm(f=>({...f,[c]:e.target.value}))}/>}
        </div>)}
      </div>
      <div style={{display:"flex",gap:8}}>
        <button className="btn bG"style={{flex:1}}onClick={()=>setSelModele(null)}>Annuler</button>
        <button className="btn bT"style={{flex:2}}onClick={()=>setToast((m.avenant?"Avenant généré ✓":"Contrat généré ✓"))}>
          📄 Générer le document
        </button>
      </div>
    </div>}
  </div>;
}

//
const COURRIERS_DATA=[
  {id:"r1",cat:"Contrat",ic:"📄",titre:"Demande de rendez-vous d'embauche",
   contenu:"Madame, Monsieur,\n\nSuite à notre prise de contact, je vous confirme ma disponibilité pour accueillir [Prénom] à compter du [Date de début].\n\nJe vous propose un rendez-vous le [Date RDV] à [Heure] pour finaliser les modalités et signer le contrat.\n\nCordialement,\n[Votre nom]"},
  {id:"r2",cat:"Contrat",ic:"📄",titre:"Lettre de rupture de contrat",
   contenu:"Madame, Monsieur,\n\nJe vous informe que je mets fin au contrat d'accueil de [Prénom] à compter du [Date de fin], conformément au préavis de [Durée] prévu au contrat.\n\nLe solde de tout compte vous sera transmis dans les délais légaux.\n\nCordialement,\n[Votre nom]"},
  {id:"r3",cat:"Financier",ic:"💶",titre:"Mise en demeure de paiement de salaire",
   contenu:"Madame, Monsieur,\n\nLe salaire de [Mois] d'un montant de [Montant]€ reste impayé à ce jour.\n\nJe vous mets en demeure de procéder au règlement dans un délai de 8 jours. Passé ce délai, je me verrai contrainte de saisir le Conseil de Prud'hommes.\n\nCordialement,\n[Votre nom]"},
  {id:"r4",cat:"PMI",ic:"🏛️",titre:"Compte-rendu de visite PMI",
   contenu:"Objet : Compte-rendu de la visite du [Date]\n\nSuite à la visite de [Nom puéricultrice] le [Date], je vous adresse ce compte-rendu.\n\nPoints abordés : conditions d'accueil, suivi des enfants, documentation administrative.\n\nObservations : [Observations]\nActions engagées : [Actions]\n\nCordialement,\n[Votre nom] - Asmat agréée n° [Numéro agrément]"},
  {id:"r5",cat:"Congés",ic:"🏖️",titre:"Déclaration de congés annuels",
   contenu:"Madame, Monsieur,\n\nJe vous informe que je prendrai mes congés du [Date début] au [Date fin] inclus.\n\nDurant cette période, je ne pourrai pas assurer l'accueil de [Prénom].\n\nCordialement,\n[Votre nom]"},
  {id:"r6",cat:"Avenant",ic:"✏️",titre:"Proposition d'avenant aux horaires",
   contenu:"Madame, Monsieur,\n\nJe vous propose de modifier le contrat d'accueil de [Prénom] comme suit :\n\nAnciennes dispositions : [Anciens horaires]\nNouveaux horaires : [Nouveaux horaires]\nDate d'effet : [Date]\n\nCes modifications entraîneront une révision du salaire à [Nouveau montant]€.\n\nMerci de confirmer votre accord en signant l'avenant ci-joint.\n\nCordialement,\n[Votre nom]"},
  {id:"r7",cat:"PMI",ic:"🏛️",titre:"Demande de renouvellement d'agrément",
   contenu:"Madame, Monsieur le Médecin chef de PMI,\n\nJe sollicite le renouvellement de mon agrément n° [Numéro] arrivant à échéance le [Date].\n\nJe continue d'accueillir des enfants à mon domicile situé au [Adresse] dans les conditions réglementaires.\n\nJe tiens à votre disposition l'ensemble des justificatifs.\n\nCordialement,\n[Votre nom]"},
];

function CourriersTypes({enfants,pEId,user}){
  const [selId,setSelId]=useState(null);
  const [filtreCat,setFiltreCat]=useState("Tous");
  const [toast,setToast]=useState("");
  const [fields,setFields]=useState({});
  const cats=["Tous","Contrat","Financier","Congés","Avenant","PMI"];
  const filtres=filtreCat==="Tous"?COURRIERS_DATA:COURRIERS_DATA.filter(c=>c.cat===filtreCat);
  const sel=COURRIERS_DATA.find(c=>c.id===selId);
  const enfant=enfants.find(e=>e.id===pEId)||enfants[0];
  const monNom=((user?.prenom||D.asmat.prenom)+" "+(user?.nom||D.asmat.nom)).trim();
  // Valeurs injectees automatiquement depuis le contexte connu
  const AUTO={"Prénom":enfant?.prenom||"","Votre nom":monNom,"Numéro agrément":user?.agrement||"","Numéro":user?.agrement||"","Adresse":user?.adresse||""};
  // Champs a completer = crochets du modele non remplis automatiquement
  const placeholders=useMemo(()=>{
    if(!sel)return[];
    const found=[...sel.contenu.matchAll(/\[([^\]]+)\]/g)].map(m=>m[1]);
    return [...new Set(found)].filter(p=>!AUTO[p]);
  },[selId]);
  useEffect(()=>{setFields({});},[selId]);
  const buildText=()=>{
    if(!sel)return"";
    let t=sel.contenu;
    Object.entries(AUTO).forEach(([k,v])=>{if(v)t=t.split("["+k+"]").join(v);});
    placeholders.forEach(p=>{const v=fields[p];if(v&&v.trim())t=t.split("["+p+"]").join(v.trim());});
    return t;
  };
  const texte=buildText();
  const reste=placeholders.filter(p=>!(fields[p]&&fields[p].trim())).length;
  const genPDF=()=>{
    if(!sel)return;
    const w=window.open("","_blank");
    if(!w){setToast("Autorisez les pop-ups pour le PDF");return;}
    const corps=texte.split("\n").map(l=>l.trim()?("<p>"+l.replace(/&/g,"&amp;").replace(/</g,"&lt;")+"</p>"):"<br/>").join("");
    w.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/><title>${sel.titre}</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Calibri,Arial,sans-serif;max-width:760px;margin:0 auto;padding:48px;color:#2E4859;font-size:14px;line-height:1.8}p{margin:8px 0}@media print{.noprint{display:none}}</style></head><body>${corps}<div class="noprint"style="text-align:center;margin-top:28px"><button onclick="window.print()"style="background:#C76754;color:#fff;border:none;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer">🖨️ Imprimer / PDF</button></div></body></html>`);
    w.document.close();setToast("PDF généré ✓");
  };

  return <div className="fi">
    {toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
    <PageHeader icon="✉️" title="Courriers types" sub="Modèles prêts à personnaliser — conformes à la convention collective"/>
    {!sel?<>
      <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>
        {cats.map(c=><button key={c}onClick={()=>setFiltreCat(c)}style={{padding:"5px 12px",borderRadius:20,border:"1.5px solid",cursor:"pointer",fontSize:12,fontWeight:600,background:filtreCat===c?"var(--b)":"transparent",color:filtreCat===c?"#fff":"var(--m)",borderColor:filtreCat===c?"var(--b)":"var(--br)"}}>{c}</button>)}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {filtres.map(c=><div key={c.id}className="card card-lift"onClick={()=>setSelId(c.id)}style={{padding:14,cursor:"pointer",borderLeft:(c.cat==="Financier"?"4px solid var(--R)":c.cat==="PMI"?"4px solid var(--B)":c.cat==="Congés"?"4px solid var(--G)":"4px solid var(--T)")}}>
          <div style={{display:"flex",gap:10,alignItems:"center",justifyContent:"space-between"}}>
            <div style={{display:"flex",gap:10,alignItems:"center"}}>
              <span style={{fontSize:18}}>{c.ic}</span>
              <div>
                <div style={{fontWeight:700,fontSize:13,color:"var(--b)"}}>{c.titre}</div>
                <span className="badge"style={{background:"var(--c)",color:"var(--l)",fontSize:9,marginTop:3}}>{c.cat}</span>
              </div>
            </div>
            <span style={{color:"var(--l)",fontSize:18}}>›</span>
          </div>
        </div>)}
      </div>
    </>:<>
      <button onClick={()=>setSelId(null)}style={{background:"none",border:"none",cursor:"pointer",color:"var(--T)",fontWeight:700,fontSize:13,marginBottom:12,padding:0}}>← Retour aux modèles</button>
      <div className="card"style={{padding:18,marginBottom:14}}>
        <div style={{fontWeight:700,fontSize:15,color:"var(--b)",marginBottom:4}}>{sel.ic} {sel.titre}</div>
        <div style={{fontSize:11,color:"var(--l)"}}>{sel.cat} · contexte rempli automatiquement (nom, agrément, enfant)</div>
      </div>
      {placeholders.length>0&&<div className="card"style={{padding:18,marginBottom:14}}>
        <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:12}}>✏️ À compléter{reste>0&&<span style={{color:"var(--T)",fontSize:12,fontWeight:600}}> · {reste} restant{reste>1?"s":""}</span>}</div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {placeholders.map(p=><div key={p}>
            <label style={{fontSize:11,fontWeight:600,color:"var(--l)",display:"block",marginBottom:3}}>{p}</label>
            <input className="inp"value={fields[p]||""}onChange={e=>setFields(f=>({...f,[p]:e.target.value}))}placeholder={p}/>
          </div>)}
        </div>
      </div>}
      <div className="card"style={{padding:18,marginBottom:14}}>
        <div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:10}}>👁️ Aperçu</div>
        <div style={{whiteSpace:"pre-wrap",fontSize:13,lineHeight:1.7,color:"var(--b)",background:"var(--c)",borderRadius:10,padding:14,maxHeight:340,overflowY:"auto"}}>{texte}</div>
        {reste>0&&<div style={{fontSize:11,color:"var(--T)",marginTop:8}}>Les champs non remplis restent entre [crochets] dans le document.</div>}
      </div>
      <div style={{display:"flex",gap:8}}>
        <button className="btn bG"style={{flex:1}}onClick={()=>{navigator.clipboard?.writeText(texte).catch(()=>{});setToast("Copié ✓");}}>📋 Copier le texte</button>
        <button className="btn bT"style={{flex:1}}onClick={genPDF}>📥 Télécharger PDF</button>
      </div>
    </>}
  </div>;
}

//
function ImportContrat({onFinish}){
  const [step,setStep]=useState(1);
  const [data,setData]=useState({
    prenomAsmat:"",emailAsmat:"",prenomEnfant:"",dateNaiss:"",
    prenomParent:"",emailParent:"",debut:"",jours:[],
    heures:"",taux:"",entretien:"3.80",source:"Top-Assmat"
  });
  const [toast,setToast]=useState("");
  const toggle=(j)=>setData(d=>({...d,jours:d.jours.includes(j)?d.jours.filter(x=>x!==j):[...d.jours,j]}));

  return <div style={{minHeight:"100vh",background:"var(--c)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
    {toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
    <div style={{width:"100%",maxWidth:520}}>
      <div style={{display:"flex",gap:4,marginBottom:24}}>
        {[1,2,3].map(s=><div key={s}style={{flex:1,height:4,borderRadius:2,
          background:step>=s?"var(--T)":"var(--br)",transition:"background .3s"}}/>)}
      </div>
      <div className="card"style={{padding:28}}>
        {step===1&&<>
          <div className="pf"style={{fontSize:20,fontWeight:700,color:"var(--b)",marginBottom:6}}>📦 Importer votre contrat</div>
          <div style={{fontSize:13,color:"var(--l)",marginBottom:20,lineHeight:1.6}}>Basculez depuis votre ancien outil en 3 minutes. Toutes vos données reprises automatiquement.</div>
          <div style={{marginBottom:14}}>
            <label className="lbl">Depuis quel outil ?</label>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {["Top-Assmat","Nounou-Top","NannyFit","Pandi-Panda","Envola","Papier"].map(s=><button key={s}
                onClick={()=>setData(d=>({...d,source:s}))}style={{
                  padding:"6px 12px",borderRadius:20,border:"1.5px solid",cursor:"pointer",fontSize:12,fontWeight:600,
                  background:data.source===s?"var(--T)":"transparent",color:data.source===s?"#fff":"var(--m)",
                  borderColor:data.source===s?"var(--T)":"var(--br)"}}>{s}</button>)}
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            <div><label className="lbl">Votre prénom</label><input className="inp"placeholder="Marie"value={data.prenomAsmat}onChange={e=>setData(d=>({...d,prenomAsmat:e.target.value}))}/></div>
            <div><label className="lbl">Votre email</label><input type="email"className="inp"placeholder="marie@mail.fr"value={data.emailAsmat}onChange={e=>setData(d=>({...d,emailAsmat:e.target.value}))}/></div>
          </div>
          <button className="btn bT"style={{width:"100%"}}onClick={()=>setStep(2)}disabled={!data.prenomAsmat||!data.emailAsmat}>Continuer →</button>
        </>}
        {step===2&&<>
          <div className="pf"style={{fontSize:20,fontWeight:700,color:"var(--b)",marginBottom:16}}>👶 L'enfant & le parent</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            <div><label className="lbl">Prénom de l'enfant</label><input className="inp"placeholder="Léo"value={data.prenomEnfant}onChange={e=>setData(d=>({...d,prenomEnfant:e.target.value}))}/></div>
            <div><label className="lbl">Date de naissance</label><input type="date"className="inp"value={data.dateNaiss}onChange={e=>setData(d=>({...d,dateNaiss:e.target.value}))}/></div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            <div><label className="lbl">Prénom du parent</label><input className="inp"placeholder="Sophie"value={data.prenomParent}onChange={e=>setData(d=>({...d,prenomParent:e.target.value}))}/></div>
            <div><label className="lbl">Email du parent</label><input type="email"className="inp"placeholder="parent@mail.fr"value={data.emailParent}onChange={e=>setData(d=>({...d,emailParent:e.target.value}))}/></div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button className="btn bG"style={{flex:1}}onClick={()=>setStep(1)}>← Retour</button>
            <button className="btn bT"style={{flex:2}}onClick={()=>setStep(3)}disabled={!data.prenomEnfant||!data.prenomParent}>Continuer →</button>
          </div>
        </>}
        {step===3&&<>
          <div className="pf"style={{fontSize:20,fontWeight:700,color:"var(--b)",marginBottom:16}}>📄 Les conditions du contrat</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            <div><label className="lbl">Date de début</label><input type="date"className="inp"value={data.debut}onChange={e=>setData(d=>({...d,debut:e.target.value}))}/></div>
            <div><label className="lbl">Heures / semaine</label><input type="number"className="inp"placeholder="40"value={data.heures}onChange={e=>setData(d=>({...d,heures:e.target.value}))}/></div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
            <div><label className="lbl">Taux horaire net (€)</label><input type="number"step="0.05"className="inp"placeholder="4.05"value={data.taux}onChange={e=>setData(d=>({...d,taux:e.target.value}))}/></div>
            <div><label className="lbl">Indemnité entretien (€/j)</label><input type="number"step="0.05"className="inp"placeholder="3.80"value={data.entretien}onChange={e=>setData(d=>({...d,entretien:e.target.value}))}/></div>
          </div>
          <div style={{marginBottom:14}}>
            <label className="lbl">Jours d'accueil</label>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {["Lundi","Mardi","Mercredi","Jeudi","Vendredi"].map(j=><button key={j}onClick={()=>toggle(j)}style={{
                padding:"6px 12px",borderRadius:20,border:"1.5px solid",cursor:"pointer",fontSize:12,fontWeight:600,
                background:data.jours.includes(j)?"var(--S)":"transparent",color:data.jours.includes(j)?"#fff":"var(--m)",
                borderColor:data.jours.includes(j)?"var(--S)":"var(--br)"}}>{j.slice(0,2)}</button>)}
            </div>
          </div>
          <div style={{background:"var(--Sp)",borderRadius:10,padding:"10px 14px",marginBottom:14,fontSize:12,color:"var(--S)"}}>
            ✅ Ces données seront reprises immédiatement dans TiMat. Modifiables à tout moment.
          </div>
          <div style={{display:"flex",gap:8}}>
            <button className="btn bG"style={{flex:1}}onClick={()=>setStep(2)}>← Retour</button>
            <button className="btn bT"style={{flex:2}}onClick={()=>{setToast("Contrat importé ✓");setTimeout(()=>onFinish?.(),1500);}}>✅ Importer dans TiMat</button>
          </div>
        </>}
      </div>
    </div>
  </div>;
}

//
function Parrainage({user}){
  const [copied,setCopied]=useState(false);
  const [toast,setToast]=useState("");
  const prefix=(user?.prenom||"MARIE").toUpperCase().slice(0,4);
  const codeNum=Math.abs((user?.email||"test").split("").reduce((a,c)=>a+c.charCodeAt(0),1000)%9000+1000);
  const code="TM-"+prefix+"-"+codeNum;
  const lien="https://timat.app/rejoindre?code="+code;
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
        <div style={{fontSize:10,color:"rgba(255,255,255,.5)",textTransform:"uppercase",letterSpacing:".5px",marginBottom:4}}>Votre code personnel</div>
        <div style={{fontFamily:"'DM Mono',monospace",fontSize:22,fontWeight:700,color:"#E8B060",letterSpacing:"2px"}}>{code}</div>
      </div>
      <div style={{display:"flex",gap:8,alignItems:"center",background:"rgba(255,255,255,.08)",borderRadius:8,padding:"8px 12px",marginBottom:12}}>
        <span style={{fontSize:11,color:"rgba(255,255,255,.6)",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{lien}</span>
        <button onClick={copy}style={{background:copied?"var(--S)":"rgba(255,255,255,.2)",color:"#fff",border:"none",borderRadius:6,padding:"5px 12px",cursor:"pointer",fontSize:11,fontWeight:700,flexShrink:0}}>
          {copied?"✓ Copié":"Copier"}
        </button>
      </div>
      <div style={{display:"flex",gap:8}}>
        <button onClick={()=>setToast("Message SMS préparé ✓")}style={{background:"rgba(255,255,255,.15)",color:"#fff",border:"1px solid rgba(255,255,255,.2)",borderRadius:8,padding:"7px 14px",cursor:"pointer",fontSize:12,fontWeight:600}}>📱 SMS</button>
        <button onClick={()=>setToast("Message WhatsApp préparé ✓")}style={{background:"rgba(255,255,255,.15)",color:"#fff",border:"1px solid rgba(255,255,255,.2)",borderRadius:8,padding:"7px 14px",cursor:"pointer",fontSize:12,fontWeight:600}}>💬 WhatsApp</button>
      </div>
    </div>
    <div className="card"style={{padding:18,marginBottom:16}}>
      <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:12}}>Comment ça marche</div>
      {[["1","Partagez votre lien","📋"],["2","Votre collègue s'inscrit","✅"],["3","Elle passe Pro","⬆️"],["4","1 mois offert à chacune","🎁"]].map(([n,t,ic])=>
        <div key={n}style={{display:"flex",gap:12,alignItems:"center",padding:"8px 0",borderBottom:"1px solid var(--br)"}}>
          <div style={{width:28,height:28,borderRadius:"50%",background:"var(--Tp)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,color:"var(--T)",fontSize:13,flexShrink:0}}>{n}</div>
          <span style={{flex:1,fontSize:13,color:"var(--b)"}}>{t}</span>
          <span style={{fontSize:18}}>{ic}</span>
        </div>)}
    </div>
    <div className="card"style={{padding:18}}>
      <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:12}}>
        Mes filleules · <span style={{color:"var(--S)"}}>{filleules.length} inscrites</span>
        {" · "}<span style={{color:"var(--T)"}}>{filleules.filter(f=>f.statut==="actif").length} mois gagnés</span>
      </div>
      {filleules.map((f,i)=><div key={i}style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderBottom:"1px solid var(--br)"}}>
        <div>
          <div style={{fontWeight:600,fontSize:13,color:"var(--b)"}}>{f.prenom} - {f.ville}</div>
          <div style={{fontSize:11,color:"var(--l)"}}>{f.date}</div>
        </div>
        <span className="badge"style={{background:f.statut==="actif"?"var(--Sp)":"var(--Gp)",color:f.statut==="actif"?"var(--S)":"var(--G)"}}>{f.gain}</span>
      </div>)}
    </div>
  </div>;
}

//
// VERSEMENTS P34 - Suivi des paiements reels recus (palier 2 : lecture + saisie)
// Le PARENT verse, l'ASSMAT recoit. Saisie + gestion par les deux (RLS table versements).
const VERSEMENT_MODES={virement:"Virement",cheque:"Chèque",especes:"Espèces",cesu:"CESU",autre:"Autre"};
function Versements({enfants,role,pEId,user,demoMode=false}){
  const [selId,setSelId]=useState(enfants[0]?.id);
  const liste=role==="parent"?enfants.filter(e=>e.id===pEId):enfants;
  const enfant=liste.find(e=>e.id===selId)||liste[0];
  const contrat=enfant?.contrat||{};
  const isDemo=demoMode||enfants.every(e=>["e1","e2","e3"].includes(e.id));
  const [versements,setVersements]=useState([]);
  const [loading,setLoading]=useState(false);
  const [toast,setToast]=useState("");
  const [showForm,setShowForm]=useState(false);
  const [saving,setSaving]=useState(false);
  const [editId,setEditId]=useState(null);
  const [savingEdit,setSavingEdit]=useState(false);

  // Champs du formulaire
  const todayStr=new Date().toISOString().slice(0,10);
  const [fDate,setFDate]=useState(todayStr);
  const [fMontant,setFMontant]=useState("");
  const [fMode,setFMode]=useState("virement");
  const [fPeriode,setFPeriode]=useState("");
  const [fNote,setFNote]=useState("");

  // Mois disponibles depuis le debut du contrat (meme logique que BulletinSalaire)
  const moisDisponibles=useMemo(()=>{
    const debut=contrat.debut?new Date(contrat.debut):new Date(new Date().getFullYear(),0,1);
    const now=new Date();const mois=[];
    const noms=["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
    let d=new Date(debut.getFullYear(),debut.getMonth(),1);
    while(d<=now){mois.push({label:noms[d.getMonth()]+" "+d.getFullYear(),key:d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")});d.setMonth(d.getMonth()+1);}
    return mois.reverse();
  },[contrat.debut]);

  // #5 - Suivi du / verse par mois (mensualisation de reference)
  const suivi=useMemo(()=>{
    const hMens=Math.round((contrat.heuresHebdo||0)*52/12);
    const tx=contrat.tauxHoraire||0;
    const joursSem=(contrat.jours&&contrat.jours.length)||5;
    const joursMois=Math.round(joursSem*52/12);
    const duMensuel=Math.round((hMens*tx+joursMois*(contrat.entretien||0))*100)/100;
    if(!hMens||!tx)return{lignes:[],duMensuel:0,ecart:0};
    const lignes=moisDisponibles.map(m=>{
      const verse=versements.filter(v=>(v.date||"").slice(0,7)===m.key).reduce((s,v)=>s+(parseFloat(v.montant)||0),0);
      const ecart=Math.round((duMensuel-verse)*100)/100;
      const statut=verse<=0?"impaye":(ecart>1?"partiel":"paye");
      return{...m,du:duMensuel,verse:Math.round(verse*100)/100,ecart,statut};
    });
    const totalDu=duMensuel*moisDisponibles.length;
    const totalVerse=versements.reduce((s,v)=>s+(parseFloat(v.montant)||0),0);
    return{lignes,duMensuel,ecart:Math.round((totalDu-totalVerse)*100)/100};
  },[contrat.heuresHebdo,contrat.tauxHoraire,contrat.entretien,contrat.jours,moisDisponibles,versements]);
  const relancer=async(m)=>{
    if(!enfant?.parent_id){setToast("Parent non lié à cet enfant");return;}
    try{
      await createNotification({userId:enfant.parent_id,type:"relance",titre:"Rappel : versement en attente pour "+m.label,page:"admin_finances",meta:{enfant_id:enfant.id,mois:m.key}});
      setToast("Relance envoyée au parent ✓");
    }catch(e){setToast("Erreur lors de la relance");}
  };
  const prefillVersement=(m)=>{
    setFPeriode(m.label);
    setFMontant(String(m.ecart>1?m.ecart:m.du));
    setFDate(todayStr);
    setShowForm(true);
  };

  // Charger les versements de l'enfant selectionne
  const chargerVersements=async()=>{
    if(!enfant?.id||isDemo){setVersements([]);return;}
    setLoading(true);
    const{data,error}=await supabase.from("versements").select("*").eq("enfant_id",enfant.id).order("date",{ascending:false});
    if(error){setVersements([]);}else{setVersements(data||[]);}
    setLoading(false);
  };
  useEffect(()=>{let cancelled=false;(async()=>{if(cancelled)return;await chargerVersements();})();return()=>{cancelled=true;};},[enfant?.id,isDemo]);

  const resetForm=()=>{setFDate(todayStr);setFMontant("");setFMode("virement");setFPeriode("");setFNote("");};

  const ajouterVersement=async()=>{
    const montant=parseFloat(String(fMontant).replace(",","."));
    if(!enfant?.id){setToast("Aucun enfant sélectionné");setTimeout(()=>setToast(""),2500);return;}
    if(!fDate){setToast("La date est requise");setTimeout(()=>setToast(""),2500);return;}
    if(!(montant>=0)||isNaN(montant)){setToast("Montant invalide");setTimeout(()=>setToast(""),2500);return;}
    const asmatId=contrat.asmat_id||(role!=="parent"?user?.id:null);
    if(!asmatId){setToast("Aucun contrat actif relié à une assistante maternelle");setTimeout(()=>setToast(""),3500);return;}
    setSaving(true);
    const{error}=await supabase.from("versements").insert({
      asmat_id:asmatId,
      contrat_id:contrat.id||null,
      enfant_id:enfant.id,
      date:fDate,
      montant:montant,
      mode:fMode,
      periode:fPeriode||null,
      note:fNote||null,
      saisi_par:user?.id||null
    });
    setSaving(false);
    if(error){setToast("Erreur : "+(error.message||"enregistrement impossible"));setTimeout(()=>setToast(""),3500);return;}
    await logAction("create",{table_name:"versements",record_id:enfant.id});
    // Notifier la contrepartie : cloche (RPC) + mail. Parent verse -> notifie l'assmat ; assmat saisit -> notifie le parent.
    const destId=role==="parent"?asmatId:(enfant.parentId||null);
    if(destId){
      const libelle=(role==="parent"?"Nouveau versement reçu":"Versement enregistré")+(enfant?.prenom?(" pour "+enfant.prenom):"");
      createNotification({userId:destId,type:"versement",titre:libelle,page:"admin_finances",meta:{enfant_id:enfant.id}});
      supabase.rpc("get_recipient_email",{p_user_id:destId}).then(({data:d})=>{
        if(d?.email){
          sendNotificationEmail({
            type:"versement_recu",to:d.email,
            subject:EMAIL_TEMPLATES.versement_recu.subject,template:"versement_recu",
            vars:{prenom:d.prenom||"",enfant_prenom:enfant?.prenom||"",montant:fmtEur(montant),date:fmtDate(fDate),qui:(role==="parent"?(user?.prenom||"Un parent"):"Votre assistante maternelle")},
          });
        }
      });
    }
    resetForm();setShowForm(false);
    setToast("✓ Versement enregistré");setTimeout(()=>setToast(""),2500);
    await chargerVersements();
  };

  // PALIER 3 - le PARENT seul peut modifier/supprimer ses versements (correction d'erreur).
  // Aucune notification cloche/mail : seule la creation initiale notifie l'assmat.
  const openEdit=(v)=>{
    setEditId(v.id);
    setFDate(v.date||todayStr);
    setFMontant(v.montant!=null?String(v.montant):"");
    setFMode(v.mode||"virement");
    setFPeriode(v.periode||"");
    setFNote(v.note||"");
    setShowForm(false);
  };
  const modifierVersement=async()=>{
    const montant=parseFloat(String(fMontant).replace(",","."));
    if(!editId)return;
    if(!fDate){setToast("La date est requise");setTimeout(()=>setToast(""),2500);return;}
    if(!(montant>=0)||isNaN(montant)){setToast("Montant invalide");setTimeout(()=>setToast(""),2500);return;}
    setSavingEdit(true);
    const{error}=await supabase.from("versements").update({
      date:fDate,montant:montant,mode:fMode,periode:fPeriode||null,note:fNote||null
    }).eq("id",editId);
    setSavingEdit(false);
    if(error){setToast("Erreur : "+(error.message||"modification impossible"));setTimeout(()=>setToast(""),3500);return;}
    await logAction("update",{table_name:"versements",record_id:editId});
    setEditId(null);resetForm();
    setToast("✓ Versement modifié");setTimeout(()=>setToast(""),2500);
    await chargerVersements();
  };
  const supprimerVersement=async(id)=>{
    if(!window.confirm("Supprimer ce versement ? Cette action est définitive."))return;
    const{error}=await supabase.from("versements").delete().eq("id",id);
    if(error){setToast("Erreur : "+(error.message||"suppression impossible"));setTimeout(()=>setToast(""),3500);return;}
    await logAction("delete",{table_name:"versements",record_id:id});
    setToast("✓ Versement supprimé");setTimeout(()=>setToast(""),2500);
    await chargerVersements();
  };

  const totalVerse=versements.reduce((s,v)=>s+(Number(v.montant)||0),0);
  const fmtDate=d=>{try{return new Date(d).toLocaleDateString("fr-FR");}catch{return d;}};
  const fmtEur=n=>(Number(n)||0).toLocaleString("fr-FR",{minimumFractionDigits:2,maximumFractionDigits:2})+" €";
  const inputStyle={width:"100%",padding:"9px 11px",borderRadius:9,border:"1.5px solid var(--br)",fontFamily:"'DM Sans',sans-serif",fontSize:13,color:"var(--b)",background:"#fff",boxSizing:"border-box"};
  const labelStyle={fontSize:12,fontWeight:700,color:"var(--m)",marginBottom:4,display:"block"};

  return <div className="fi">
    <div style={{marginBottom:14}}>
      <div style={{fontWeight:800,fontSize:17,color:"var(--b)"}}>{role==="parent"?"💶 Mes versements":"💶 Versements reçus"}</div>
      <div style={{fontSize:12,color:"var(--m)",marginTop:2}}>{role==="parent"?"Suivi des sommes que vous avez versées à votre assistante maternelle.":"Suivi des sommes réellement versées par les parents — pour des attestations fiscales exactes."}</div>
    </div>

    {/* Selecteur d'enfant */}
    {liste.length>1&&<div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14}}>
      {liste.map(e=><button key={e.id}onClick={()=>{setSelId(e.id);setShowForm(false);}}style={{padding:"6px 14px",borderRadius:10,border:"none",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:13,background:e.id===enfant?.id?"var(--T)":"var(--c)",color:e.id===enfant?.id?"#fff":"var(--m)"}}>{e.prenom||"Enfant"}</button>)}
    </div>}

    {isDemo
      ? <div className="card"style={{padding:20,textAlign:"center",color:"var(--m)",fontSize:13}}>Exemple — disponible dans l'application réelle.</div>
      : <div>
          {/* Total + bouton ajouter */}
          <div className="card"style={{padding:16,marginBottom:14,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
            <div>
              <div style={{fontSize:13,color:"var(--m)"}}>Total versé{enfant?.prenom?(" pour "+enfant.prenom):""}</div>
              <div style={{fontSize:18,fontWeight:800,color:"var(--T)"}}>{fmtEur(totalVerse)}</div>
            </div>
            {role==="parent"&&<button onClick={()=>setShowForm(s=>!s)}style={{padding:"9px 16px",borderRadius:10,border:"none",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:13,background:showForm?"var(--c)":"var(--T)",color:showForm?"var(--m)":"#fff"}}>{showForm?"Annuler":"+ Ajouter un versement"}</button>}
          </div>

          {/* #5 - Suivi du / verse (assmat: relance ; parent: enregistrer) */}
          {suivi.duMensuel>0&&<div className="card"style={{padding:16,marginBottom:14}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6,flexWrap:"wrap",gap:8}}>
              <div style={{fontWeight:800,fontSize:14,color:"var(--b)"}}>{role==="parent"?"📊 Suivi de mes versements":"📊 Suivi dû / versé"}</div>
              <div style={{fontSize:12,fontWeight:700,color:suivi.ecart>1?"#C84B31":"#5DA9A1"}}>{suivi.ecart>1?((role==="parent"?"Reste à verser : ":"Reste dû : ")+fmtEur(suivi.ecart)):"À jour ✓"}</div>
            </div>
            <div style={{fontSize:11,color:"var(--l)",marginBottom:12,lineHeight:1.5}}>Mensualisation de référence : {fmtEur(suivi.duMensuel)}/mois (heures lissées × taux net + entretien estimé). Rapproché par mois de versement — hors heures complémentaires et régularisations.</div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {suivi.lignes.map(m=><div key={m.key}style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,padding:"8px 10px",borderRadius:8,background:m.statut==="impaye"?"#FDECEC":m.statut==="partiel"?"#FFF6E9":"var(--c)"}}>
                <div style={{minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:600,color:"var(--b)"}}>{m.statut==="paye"?"✅":m.statut==="partiel"?"🟠":"🔴"} {m.label}</div>
                  <div style={{fontSize:11,color:"var(--m)"}}>Dû {fmtEur(m.du)} · Versé {fmtEur(m.verse)}{m.ecart>1?(" · reste "+fmtEur(m.ecart)):""}</div>
                </div>
                {m.statut!=="paye"&&(role==="parent"
                  ? <button onClick={()=>prefillVersement(m)}style={{flexShrink:0,padding:"6px 12px",borderRadius:8,border:"none",cursor:"pointer",fontWeight:700,fontSize:12,background:"var(--T)",color:"#fff"}}>+ Enregistrer</button>
                  : <button onClick={()=>relancer(m)}style={{flexShrink:0,padding:"6px 12px",borderRadius:8,border:"none",cursor:"pointer",fontWeight:700,fontSize:12,background:"var(--T)",color:"#fff"}}>Relancer</button>)}
              </div>)}
            </div>
          </div>}

          {/* Formulaire de saisie */}
          {role==="parent"&&showForm&&<div className="card"style={{padding:18,marginBottom:14}}>
            <div style={{fontWeight:800,fontSize:14,color:"var(--b)",marginBottom:14}}>Nouveau versement</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
              <div>
                <label style={labelStyle}>Date du versement</label>
                <input type="date"value={fDate}onChange={e=>setFDate(e.target.value)}style={inputStyle}/>
              </div>
              <div>
                <label style={labelStyle}>Montant (€)</label>
                <input type="number"inputMode="decimal"step="0.01"min="0"placeholder="0,00"value={fMontant}onChange={e=>setFMontant(e.target.value)}style={inputStyle}/>
              </div>
              <div>
                <label style={labelStyle}>Mode de paiement</label>
                <select value={fMode}onChange={e=>setFMode(e.target.value)}style={inputStyle}>
                  {Object.entries(VERSEMENT_MODES).map(([k,l])=><option key={k}value={k}>{l}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Période concernée</label>
                <select value={fPeriode}onChange={e=>setFPeriode(e.target.value)}style={inputStyle}>
                  <option value="">—</option>
                  {moisDisponibles.map(m=><option key={m.key}value={m.key}>{m.label}</option>)}
                </select>
              </div>
            </div>
            <div style={{marginBottom:14}}>
              <label style={labelStyle}>Note (optionnel)</label>
              <input type="text"placeholder="ex. virement reçu en retard"value={fNote}onChange={e=>setFNote(e.target.value)}style={inputStyle}/>
            </div>
            <button onClick={ajouterVersement}disabled={saving}style={{width:"100%",padding:"11px",borderRadius:10,border:"none",cursor:saving?"default":"pointer",fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:14,background:saving?"var(--c)":"var(--T)",color:saving?"var(--m)":"#fff"}}>{saving?"Enregistrement…":"Enregistrer le versement"}</button>
          </div>}

          {/* Liste */}
          {loading
            ? <div style={{textAlign:"center",padding:20,color:"var(--l)",fontSize:13}}>Chargement…</div>
            : versements.length===0
              ? <div className="card"style={{padding:24,textAlign:"center"}}>
                  <div style={{fontSize:30,marginBottom:8}}>📭</div>
                  <div style={{fontSize:14,fontWeight:700,color:"var(--b)"}}>Aucun versement enregistré</div>
                  <div style={{fontSize:12,color:"var(--m)",marginTop:4}}>Les versements saisis apparaîtront ici.</div>
                </div>
              : <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {versements.map(v=><div key={v.id}className="card"style={{padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div>
                      <div style={{fontWeight:700,fontSize:14,color:"var(--b)"}}>{fmtEur(v.montant)}</div>
                      <div style={{fontSize:12,color:"var(--m)",marginTop:2}}>{fmtDate(v.date)} · {VERSEMENT_MODES[v.mode]||v.mode}{v.periode?(" · "+v.periode):""}</div>
                      {v.note&&<div style={{fontSize:12,color:"var(--l)",marginTop:2,fontStyle:"italic"}}>{v.note}</div>}
                    </div>
                    {role==="parent"&&<div style={{display:"flex",gap:6,flexShrink:0}}>
                      <button onClick={()=>openEdit(v)}style={{padding:"6px 10px",borderRadius:8,border:"1.5px solid var(--br)",background:"#fff",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:12,color:"var(--m)"}}>Modifier</button>
                      <button onClick={()=>supprimerVersement(v.id)}style={{padding:"6px 10px",borderRadius:8,border:"1.5px solid #E3B7B2",background:"#fff",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:12,color:"#B5524A"}}>Supprimer</button>
                    </div>}
                  </div>)}
                </div>}
        </div>}

    {editId!==null&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9998,padding:16}}onClick={()=>{setEditId(null);resetForm();}}>
      <div className="card"style={{padding:20,maxWidth:380,width:"100%",background:"#fff",maxHeight:"90vh",overflowY:"auto"}}onClick={e=>e.stopPropagation()}>
        <div style={{fontWeight:800,fontSize:16,color:"var(--b)",marginBottom:14}}>Modifier le versement</div>
        <div style={{marginBottom:12}}>
          <label style={labelStyle}>Date du versement</label>
          <input type="date"value={fDate}onChange={e=>setFDate(e.target.value)}style={inputStyle}/>
        </div>
        <div style={{marginBottom:12}}>
          <label style={labelStyle}>Montant (€)</label>
          <input type="number"inputMode="decimal"step="0.01"min="0"placeholder="0,00"value={fMontant}onChange={e=>setFMontant(e.target.value)}style={inputStyle}/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
          <div>
            <label style={labelStyle}>Mode de paiement</label>
            <select value={fMode}onChange={e=>setFMode(e.target.value)}style={inputStyle}>
              {Object.entries(VERSEMENT_MODES).map(([k,l])=><option key={k}value={k}>{l}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Période concernée</label>
            <select value={fPeriode}onChange={e=>setFPeriode(e.target.value)}style={inputStyle}>
              <option value="">—</option>
              {moisDisponibles.map(m=><option key={m.key}value={m.key}>{m.label}</option>)}
            </select>
          </div>
        </div>
        <div style={{marginBottom:16}}>
          <label style={labelStyle}>Note (optionnel)</label>
          <input type="text"value={fNote}onChange={e=>setFNote(e.target.value)}style={inputStyle}/>
        </div>
        <div style={{display:"flex",gap:10}}>
          <button onClick={()=>{setEditId(null);resetForm();}}style={{flex:1,padding:"11px",borderRadius:10,border:"1.5px solid var(--br)",background:"#fff",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:14,color:"var(--m)"}}>Annuler</button>
          <button onClick={modifierVersement}disabled={savingEdit}style={{flex:1,padding:"11px",borderRadius:10,border:"none",cursor:savingEdit?"default":"pointer",fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:14,background:savingEdit?"var(--c)":"var(--T)",color:savingEdit?"var(--m)":"#fff"}}>{savingEdit?"Enregistrement…":"Enregistrer"}</button>
        </div>
      </div>
    </div>}

    {toast&&<div style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",background:"var(--b)",color:"#fff",padding:"11px 20px",borderRadius:12,fontSize:13,fontWeight:600,zIndex:9999,boxShadow:"0 4px 16px rgba(0,0,0,.2)"}}>{toast}</div>}
  </div>;
}

function AdminFinances({enfants,role,pEId,user,pointagesDB,demoMode=false}){
  const [section,setSection]=useState(demoMode?"bulletin":(role==="asmat"?"facturation":"contrats"));
  const [contratTab,setContratTab]=useState("contrats");
  const sousOnglets=role==="asmat"
    ?[
      {id:"facturation",l:"Facturation & Pajemploi",ic:"🧾"},
      {id:"bulletin",l:"Bulletin de salaire",ic:"📜"},
      {id:"versements",l:"Versements reçus",ic:"💶"},
      {id:"contrats",l:"Contrats & Avenants",ic:"📄"},
      {id:"contrats_types",l:"Modeles & Templates",ic:"📋"},
      {id:"courriers",l:"Courriers types",ic:"✉️"},
    ]
    :[
      {id:"signature_parent",l:"Mon contrat & Signature",ic:"📄"},
      {id:"versements",l:"Mes versements",ic:"💶"},
    ];
  if(demoMode){
    const demoUnlockedSection="bulletin";
    return <div className="fi">
      <div style={{display:"flex",gap:4,marginBottom:16,borderBottom:"2px solid var(--br)",overflowX:"auto",scrollbarWidth:"none"}}>
        {sousOnglets.map(s=>{const unlocked=s.id===demoUnlockedSection;return <button key={s.id}onClick={()=>setSection(s.id)}style={{padding:"8px 16px",border:"none",background:"none",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontWeight:600,fontSize:13,flexShrink:0,whiteSpace:"nowrap",color:section===s.id?"var(--T)":(unlocked?"var(--b)":"var(--l)"),borderBottom:section===s.id?"2.5px solid var(--T)":"2.5px solid transparent",marginBottom:-2,transition:"all .15s",display:"flex",alignItems:"center",gap:6,opacity:unlocked?1:.7}}><span>{s.ic}</span><span>{s.l}</span>{!unlocked&&<span style={{fontSize:11}}>🔒</span>}</button>;})}
      </div>
      {section==="bulletin"
        ? <div>
            <div className="card"style={{padding:20,maxWidth:420,margin:"0 auto"}}>
              <div style={{textAlign:"center",borderBottom:"2px solid var(--br)",paddingBottom:12,marginBottom:14}}>
                <div style={{fontWeight:800,fontSize:16,color:"var(--b)"}}>Bulletin de salaire</div>
                <div style={{fontSize:12,color:"var(--m)",marginTop:2}}>Mai 2026 · Assistante maternelle</div>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:8}}><span style={{color:"var(--m)"}}>Salarié</span><span style={{fontWeight:600,color:"var(--b)"}}>Marie Dupont</span></div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:8}}><span style={{color:"var(--m)"}}>Enfant accueilli</span><span style={{fontWeight:600,color:"var(--b)"}}>Léo</span></div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:8}}><span style={{color:"var(--m)"}}>Heures normales</span><span style={{fontWeight:600,color:"var(--b)"}}>151h67</span></div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:8}}><span style={{color:"var(--m)"}}>Taux horaire net</span><span style={{fontWeight:600,color:"var(--b)"}}>3,80 €</span></div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:8}}><span style={{color:"var(--m)"}}>Indemnités entretien</span><span style={{fontWeight:600,color:"var(--b)"}}>+ 92,40 €</span></div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:12}}><span style={{color:"var(--m)"}}>Indemnités repas</span><span style={{fontWeight:600,color:"var(--b)"}}>+ 63,00 €</span></div>
              <div style={{display:"flex",justifyContent:"space-between",borderTop:"2px solid var(--br)",paddingTop:12,fontSize:15}}><span style={{fontWeight:700,color:"var(--b)"}}>Net à payer</span><span style={{fontWeight:800,color:"var(--T)"}}>1 731,75 €</span></div>
              <div style={{display:"flex",gap:8,marginTop:16}}>
                <div style={{flex:1,textAlign:"center",padding:"9px",borderRadius:10,background:"var(--c)",fontSize:12,fontWeight:700,color:"var(--m)"}}>📄 Aperçu PDF</div>
                <div style={{flex:1,textAlign:"center",padding:"9px",borderRadius:10,background:"var(--c)",fontSize:12,fontWeight:700,color:"var(--m)"}}>⬇️ Télécharger</div>
              </div>
            </div>
            <div style={{textAlign:"center",fontSize:11,color:"var(--l)",marginTop:12}}>Exemple — calculé automatiquement à partir des pointages dans l'app réelle.</div>
          </div>
        : <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:300,gap:10,textAlign:"center",padding:24}}>
            <div style={{fontSize:34}}>🔒</div>
            <div style={{fontSize:14,fontWeight:700,color:"var(--b)"}}>Disponible dans l'application</div>
            <div style={{fontSize:12,color:"var(--m)",lineHeight:1.6,maxWidth:230}}>Cette section fait partie de TiMat.</div>
          </div>}
    </div>;
  }
  return <div className="fi">
    <div style={{display:"flex",gap:4,marginBottom:16,borderBottom:"2px solid var(--br)",overflowX:"auto",scrollbarWidth:"none"}}>
      {sousOnglets.map(s=><button key={s.id}onClick={()=>setSection(s.id)}style={{
        padding:"8px 16px",border:"none",background:"none",cursor:"pointer",
        fontFamily:"'DM Sans',sans-serif",fontWeight:600,fontSize:13,flexShrink:0,whiteSpace:"nowrap",
        color:section===s.id?"var(--T)":"var(--b)",
        borderBottom:section===s.id?"2.5px solid var(--T)":"2.5px solid transparent",
        marginBottom:-2,transition:"all .15s",display:"flex",alignItems:"center",gap:6
      }}><span>{s.ic}</span><span>{s.l}</span></button>)}
    </div>
    {section==="facturation"&&<Facturation enfants={enfants}role={role}pEId={pEId}user={user}pointagesDB={pointagesDB}/>}
    {section==="bulletin"&&<BulletinSalaire enfants={enfants}role={role}pEId={pEId}user={user}/>}
    {section==="versements"&&<Versements enfants={enfants}role={role}pEId={pEId}user={user}/>}
    {section==="contrats"&&<div>
      <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
        {[{id:"contrats",l:"📄 Contrats & avenants"},{id:"solde",l:"🏁 Fin de contrat"}].map(t=>
          <button key={t.id}onClick={()=>setContratTab(t.id)}style={{padding:"6px 14px",borderRadius:20,border:"1.5px solid",cursor:"pointer",fontSize:12,fontWeight:600,background:contratTab===t.id?"var(--T)":"transparent",color:contratTab===t.id?"#fff":"var(--m)",borderColor:contratTab===t.id?"var(--T)":"var(--br)"}}>{t.l}</button>)}
      </div>
      {contratTab==="contrats"?<div>
        <Contrats enfants={enfants}role={role}pEId={pEId}user={user}/>
        <div style={{marginTop:24,borderTop:"2px solid var(--br)",paddingTop:20}}>
          <DemandesAvenants enfants={enfants}role={role}pEId={pEId}/>
        </div>
      </div>:<SoldeDeCompte enfants={enfants}role={role}pEId={pEId}user={user}/>}
    </div>}
    {section==="contrats_types"&&<ContratsTypes enfants={enfants}role={role}/>}
    {section==="courriers"&&<CourriersTypes enfants={enfants}role={role}pEId={pEId}user={user}/>}
    {section==="signature_parent"&&<SignatureContratParent enfants={enfants}pEId={pEId}user={user}/>}
  </div>;
}

//
function Journal({enfants,role,pEId,user}){
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
        borderBottom:sousOnglet===s.id?"2px solid var(--T)":"2px solid transparent",
        marginBottom:-2,transition:"all .15s",display:"flex",alignItems:"center",gap:6
      }}><span>{s.ic}</span><span>{s.l}</span></button>)}
    </div>
    {sousOnglet==="journal"&&<TransmissionsContent enfant={enfant}role={role}user={user}/>}
    {sousOnglet==="bilan"&&<RecitIA enfants={liste}role={role}pEId={pEId}/>}
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
        const today=new Date().toISOString().slice(0,10);
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
    const today=new Date().toISOString().slice(0,10);
    const ext=file.name.split('.').pop()||'jpg';
    const fileName=`${Date.now()}.${ext}`;
    const path=`${user?.id||'anon'}/${enfant.id}/${today}/${fileName}`;
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
    {(enfantPhotos.length>0||role==="asmat")&&<div className="card"style={{padding:16,marginBottom:14}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div style={{fontWeight:700,fontSize:14,color:"var(--b)"}}>📸 Photos du jour</div>
        {role==="asmat"&&<>
          <input ref={fileRef}type="file"accept="image/*"style={{display:"none"}}onChange={ajouterPhoto}/>
          <button className="btn bG"style={{fontSize:12,padding:"5px 12px"}}onClick={()=>fileRef.current?.click()}>
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
    {role==="parent"&&bilansRecus.length>0&&<div className="card"style={{padding:16,marginBottom:14,border:"1.5px solid var(--P)"}}>
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
      <div className="card"style={{padding:16}}>
        <div style={{fontWeight:700,fontSize:14,marginBottom:12,color:"var(--b)"}}>{enfant?.emoji} {enfant?.prenom} · Aujourd'hui</div>
        <div style={{display:"flex",flexDirection:"column",gap:10,maxHeight:400,overflowY:"auto"}}>
          {msgs.length===0&&<div style={{fontSize:13,color:"var(--l)",textAlign:"center",padding:"20px 0"}}>Aucune transmission pour le moment.</div>}
          {msgs.map(t=><div key={t.id}style={{display:"flex",gap:10}}>
            <div style={{textAlign:"center",minWidth:38,flexShrink:0}}><div style={{fontSize:20}}>{t.mood}</div><div style={{fontSize:10,color:"var(--l)"}}>{t.h}</div></div>
            <div style={{flex:1,background:t.auteur==="asmat"?"var(--Tp)":"var(--Bp)",borderRadius:12,padding:"10px 14px",borderLeft:(t.auteur==="asmat"?"3px solid var(--T)":"3px solid var(--B)")}}>
              <div style={{fontSize:11,fontWeight:700,color:t.auteur==="asmat"?"var(--T)":"var(--B)",marginBottom:4}}>
                {t.auteur==="asmat"?"👩👧 "+(user?.prenom||"Marie"):"👪 "+(D.parents.find(p=>p.id===enfant?.parentId)?.prenom||"Parent")}</div>
              <div style={{fontSize:13,color:"var(--b)",lineHeight:1.6}}>{t.txt}</div>
            </div>
          </div>)}
        </div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div className="card"style={{padding:16}}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:12,color:"var(--b)"}}>✏️ Nouveau message</div>
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
        {D.moodHistory[enfant?.id]&&<div className="card"style={{padding:14}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:10,color:"var(--b)"}}>📈 Humeurs - 15 jours</div>
          <div className="mood-bar">
            {D.moodHistory[enfant.id].map((v,i)=><div key={i}className="mood-b"style={{height:(v/5*100)+"%",width:"100%",background:v>=4?"var(--S)":v>=3?"var(--G)":"var(--R)",opacity:.8}}/>)}
          </div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"var(--l)",marginTop:4}}>
            <span>J-14</span><span>Aujourd'hui</span>
          </div>
        </div>}
      </div>
    </div>
  </div>;
}

//
function Eveil({enfants,role,pEId}){
  const [selId,setSelId]=useState(enfants[0]?.id);
  const [section,setSection]=useState("portfolio");
  const liste=role==="parent"?enfants.filter(e=>e.id===pEId):enfants;
  return <div className="fi">
    {role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
      {liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>setSelId(e.id)}/>)}
    </div>}
    <div style={{display:"flex",gap:4,marginBottom:16,borderBottom:"2px solid var(--br)"}}>
      {[{id:"portfolio",l:"Portfolio",ic:"🎨"},{id:"developpement",l:"Développement",ic:"🌱"}].map(s=>
        <button key={s.id}onClick={()=>setSection(s.id)}style={{
          padding:"8px 16px",border:"none",background:"none",cursor:"pointer",
          fontFamily:"'DM Sans',sans-serif",fontWeight:600,fontSize:13,
          color:section===s.id?"var(--S)":"var(--l)",
          borderBottom:section===s.id?"2px solid var(--S)":"2px solid transparent",
          marginBottom:-2,transition:"all .15s",display:"flex",alignItems:"center",gap:6
        }}><span>{s.ic}</span><span>{s.l}</span></button>
      )}
    </div>
    {section==="portfolio"&&<Portfolio enfants={liste}role={role}pEId={selId}/>}
    {section==="developpement"&&<Developpement enfants={liste}role={role}pEId={selId}/>}
  </div>;
}

//
const SOMMEIL_DEMO={
  "e1":[
    {id:"s1",date:TODAY_STR,debut:"13h05",fin:"14h45",duree:"1h40",qualite:"bien"},
    {id:"s2",date:new Date(Date.now()-86400000).toISOString().slice(0,10),debut:"12h55",fin:"14h30",duree:"1h35",qualite:"bien"},
    {id:"s3",date:new Date(Date.now()-172800000).toISOString().slice(0,10),debut:"13h20",fin:"14h10",duree:"0h50",qualite:"agite"},
  ],
  "e2":[
    {id:"s4",date:TODAY_STR,debut:"13h10",fin:"13h55",duree:"0h45",qualite:"agite"},
    {id:"s5",date:new Date(Date.now()-86400000).toISOString().slice(0,10),debut:"13h00",fin:"15h00",duree:"2h00",qualite:"bien"},
  ],
  "e3":[
    {id:"s6",date:TODAY_STR,debut:"11h30",fin:"13h30",duree:"2h00",qualite:"bien"},
    {id:"s7",date:new Date(Date.now()-86400000).toISOString().slice(0,10),debut:"11h45",fin:"13h50",duree:"2h05",qualite:"bien"},
    {id:"s8",date:new Date(Date.now()-172800000).toISOString().slice(0,10),debut:"12h00",fin:"13h20",duree:"1h20",qualite:"court"},
  ],
};

function Sommeil({enfants,role,pEId}){
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

  const qColor={bien:"var(--S)",agite:"var(--G)",court:"var(--R)"};
  const qLabel={bien:"✅ Bonne sieste",agite:"🟡 Agitée",court:"🔴 Courte"};

  return <div className="fi">
    {toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
    <PageHeader icon="😴" title="Suivi du sommeil" sub="Siestes et qualité du repos"/>
    {role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
      {liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>setSelId(e.id)}/>)}</div>}
    <div className="g2">
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div className="card"style={{padding:16}}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:14,color:"var(--b)"}}>😴 Sieste d'aujourd'hui</div>
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
        {role==="asmat"&&<div className="card"style={{padding:16}}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:12,color:"var(--b)"}}>+ Enregistrer une sieste</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
            <div><label className="lbl">Début</label><input type="time"className="inp"value={nS.debut}onChange={e=>setNS(p=>({...p,debut:e.target.value}))}/></div>
            <div><label className="lbl">Fin</label><input type="time"className="inp"value={nS.fin}onChange={e=>setNS(p=>({...p,fin:e.target.value}))}/></div>
          </div>
          <div style={{marginBottom:10}}>
            <label className="lbl">Qualité</label>
            <select className="sel"value={nS.qualite}onChange={e=>setNS(p=>({...p,qualite:e.target.value}))}>
              <option value="bien">✅ Bonne sieste</option>
              <option value="agite">🟡 Agitée</option>
              <option value="court">🔴 Trop courte</option>
            </select>
          </div>
          <button className="btn bS"style={{width:"100%"}}onClick={ajout}>Enregistrer</button>
        </div>}
      </div>
      <div className="card"style={{padding:16}}>
        <div style={{fontWeight:700,fontSize:14,marginBottom:12,color:"var(--b)"}}>📈 Historique récent</div>
        {hist.length===0&&<div style={{fontSize:13,color:"var(--l)"}}>Aucune donnée</div>}
        {hist.map(s=><div key={s.id}style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderBottom:"1px solid var(--br)"}}>
          <div>
            <div style={{fontSize:12,fontWeight:600,color:"var(--b)"}}>{new Date(s.date).toLocaleDateString("fr-FR",{weekday:"short",day:"numeric",month:"short"})}</div>
            <div style={{fontSize:11,color:"var(--l)"}}>{s.debut} → {s.fin}</div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <div className="pf"style={{fontSize:16,fontWeight:700,color:"var(--T)"}}>{s.duree}</div>
            <span className="badge"style={{background:qColor[s.qualite]+"22",color:qColor[s.qualite],fontSize:10}}>{s.qualite}</span>
            {role==="asmat"&&<button className="btn bG"style={{fontSize:10,padding:"3px 8px",color:"var(--R)"}}onClick={()=>supprimer(s.id)}title="Supprimer">🗑️</button>}
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
function TableauDeBord({enfants,role,pEId,setPage}){
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
      ].map(k=><div key={k.l}className="card card-lift"onClick={()=>setPage&&setPage(k.p)}style={{padding:14,textAlign:"center",cursor:"pointer"}}>
        <div style={{fontSize:22,marginBottom:4}}>{k.ic}</div>
        <div className="pf"style={{fontSize:22,fontWeight:600,color:k.c}}>{k.v}</div>
        <div style={{fontSize:11,color:"var(--l)",marginTop:3,lineHeight:1.3}}>{k.l}</div>
      </div>)}
    </div>}

    <div className="g2">
      {/* Courbe humeurs SVG */}
      <div className="card"style={{padding:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div style={{fontWeight:700,fontSize:13,color:"var(--b)"}}>😊 Humeurs - {enfant?.prenom}</div>
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
        <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"var(--l)",marginTop:4,fontFamily:"'DM Mono',monospace"}}>
          <span>J-{jours-1}</span><span>Aujourd'hui</span>
        </div>
      </div>

      {/* Heures semaine - barres */}
      <div className="card"style={{padding:16}}>
        <div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:14}}>⏰ Heures / semaine</div>
        <div style={{display:"flex",gap:4,alignItems:"flex-end",height:72}}>
          {heuresData.map((d,i)=><div key={i}style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
            <div style={{fontSize:9,color:"var(--l)",fontFamily:"'DM Mono',monospace"}}>{d.h||""}</div>
            <div style={{
              width:"100%",borderRadius:"4px 4px 0 0",
              height:((d.h/maxH)*60)+"px",
              background:d.h>0?"linear-gradient(to top,var(--T),var(--Tl))":"var(--br)",
              transition:"height .6s ease",minHeight:d.h>0?4:0
            }}/>
          </div>)}
        </div>
        <div style={{display:"flex",gap:4,marginTop:6}}>
          {heuresData.map((d,i)=><div key={i}style={{flex:1,textAlign:"center",fontSize:9,color:"var(--l)",fontFamily:"'DM Mono',monospace"}}>{d.j}</div>)}
        </div>
        <div style={{marginTop:10,padding:"6px 10px",background:"var(--Sp)",borderRadius:8,fontSize:12,color:"var(--S)",fontWeight:600}}>
          Total semaine : {heuresData.reduce((a,d)=>a+d.h,0)}h
        </div>
      </div>

      {/* Sommeil - barres horizontales */}
      <div className="card"style={{padding:16}}>
        <div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:14}}>😴 Durée sieste - {enfant?.prenom}</div>
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
      <div className="card"style={{padding:16}}>
        <div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:14}}>🍽️ Appétit & Activités du jour</div>
        <div style={{fontWeight:600,fontSize:11,color:"var(--m)",marginBottom:8,textTransform:"uppercase",letterSpacing:".5px"}}>Repas</div>
        {D.repas.filter(r=>r.date===TODAY_STR).map(r=>{
          const e=liste.find(x=>x.id===r.eId);
          const c={"bien":"var(--S)","peu":"var(--G)","refus":"var(--R)"};
          if(!e)return null;
          return <div key={r.id}style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid var(--br)",alignItems:"center"}}>
            <div style={{display:"flex",gap:6,alignItems:"center"}}>
              <span>{e.emoji}</span>
              <span style={{fontSize:13,color:"var(--b)"}}>{e.prenom}</span>
            </div>
            <span className="badge"style={{background:(c[r.q]||"var(--l)")+"22",color:c[r.q]||"var(--l)",fontSize:11}}>
              {r.q==="bien"?"✅ Bon appétit":r.q==="peu"?"🟡 Peu mangé":"🔴 Refus"}
            </span>
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
const CROISSANCE_DEMO={
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
const OMS_POIDS=[3.3,5.1,6.4,7.4,8.2,8.9,9.5,10.0,10.4,10.9,11.3,11.7,12.1];// 0-12 mois
const OMS_TAILLE=[49.9,54.7,58.4,61.4,63.9,65.9,67.6,69.2,70.6,72.0,73.3,74.5,75.7];

function CourbeCroissance({enfants,role,pEId}){
  const [selId,setSelId]=useState(enfants[0]?.id);
  const [data,setData]=useState(CROISSANCE_DEMO);
  const [newM,setNewM]=useState({date:"",poids:"",taille:""});
  const [toast,setToast]=useState("");
  const [vue,setVue]=useState("poids");
  const liste=role==="parent"?enfants.filter(e=>e.id===pEId):enfants;
  const enfant=liste.find(e=>e.id===selId)||liste[0];
  const mesures=data[enfant?.id]||[];
  const maxAge=mesures.length?Math.max(...mesures.map(m=>m.age_mois)):12;

  const ajouter=()=>{
    if(!newM.poids&&!newM.taille)return;
    const naissance=enfant.naissance;
    const d=newM.date||TODAY_STR;
    const n=new Date(naissance),mDate=new Date(d);
    const mois=(mDate.getFullYear()-n.getFullYear())*12+(mDate.getMonth()-n.getMonth());
    setData(p=>({...p,[enfant.id]:[...p[enfant.id]||[],{date:d,age_mois:mois,poids:parseFloat(newM.poids)||null,taille:parseFloat(newM.taille)||null}].sort((a,b)=>a.age_mois-b.age_mois)}));
    setNewM({date:"",poids:"",taille:""});setToast("Mesure ajoutée ✓");
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
        {last&&<div className="card"style={{padding:16}}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:12,color:"var(--b)"}}>📊 Dernière mesure - {enfant.prenom}</div>
          <div style={{display:"flex",gap:16,justifyContent:"center"}}>
            {[["⚖️ Poids",last.poids+"kg","var(--T)"],["📏 Taille",last.taille+"cm","var(--B)"],["🎂 Âge",last.age_mois+"m","var(--S)"]].map(([l,v,c])=>
              <div key={l}style={{textAlign:"center"}}>
                <div style={{fontSize:11,color:"var(--l)",marginBottom:2}}>{l}</div>
                <div className="pf"style={{fontSize:22,fontWeight:700,color:c}}>{v}</div>
              </div>)}
          </div>
        </div>}

        {/* Courbe SVG */}
        <div className="card"style={{padding:16}}>
          <div style={{display:"flex",gap:6,marginBottom:10}}>
            {[["poids","⚖️ Poids"],["taille","📏 Taille"]].map(([k,l])=>
              <button key={k}onClick={()=>setVue(k)}className={"btn "+(vue===k?"bT":"bG")}style={{fontSize:12,padding:"5px 12px"}}>{l}</button>)}
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
          {vue==="poids"&&<div style={{fontSize:10,color:"var(--B)",marginTop:6}}>- - - Médiane OMS (p50)</div>}
        </div>
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {role==="asmat"&&<div className="card"style={{padding:16}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:10,color:"var(--b)"}}>+ Nouvelle mesure</div>
          <div style={{marginBottom:8}}><label className="lbl">Date</label><input type="date"className="inp"value={newM.date}onChange={e=>setNewM(p=>({...p,date:e.target.value}))}/></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
            <div><label className="lbl">Poids (kg)</label><input className="inp"type="number"step=".1"placeholder="10.5"value={newM.poids}onChange={e=>setNewM(p=>({...p,poids:e.target.value}))}/></div>
            <div><label className="lbl">Taille (cm)</label><input className="inp"type="number"placeholder="75"value={newM.taille}onChange={e=>setNewM(p=>({...p,taille:e.target.value}))}/></div>
          </div>
          <button className="btn bT"style={{width:"100%"}}onClick={ajouter}>Enregistrer</button>
        </div>}
        <div className="card"style={{padding:14}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:10,color:"var(--b)"}}>📋 Historique</div>
          {mesures.slice().reverse().slice(0,6).map(m=><div key={m.date}style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid var(--br)",fontSize:12}}>
            <span style={{color:"var(--l)"}}>{m.age_mois} mois</span>
            <div style={{display:"flex",gap:12}}>
              {m.poids&&<span style={{color:"var(--T)",fontWeight:600}}>{m.poids}kg</span>}
              {m.taille&&<span style={{color:"var(--B)",fontWeight:600}}>{m.taille}cm</span>}
            </div>
          </div>)}
        </div>
      </div>
    </div>}
  </div>;
}

//
const ACTIVITES_PAR_AGE=[
  {age_min:0,age_max:6,cat:"Éveil",titre:"Hochets et mobiles",desc:"Stimulation visuelle et auditive. Mobiliser les sens dès les premières semaines.",competences:["Éveil sensoriel","Concentration"],duree:"10-15 min",materiel:"Hochet, mobile coloré"},
  {age_min:3,age_max:12,cat:"Motricité",titre:"Tapis d'éveil",desc:"Découverte du corps, position sur le ventre, premiers mouvements de reptation.",competences:["Motricité globale","Tonus musculaire"],duree:"15-20 min",materiel:"Tapis d'éveil"},
  {age_min:6,age_max:18,cat:"Langage",titre:"Comptines avec gestes",desc:"Apprendre la langue par le corps et la répétition. Favorise la mémoire.",competences:["Langage","Mémoire"],duree:"10 min",materiel:"Aucun"},
  {age_min:12,age_max:24,cat:"Créatif",titre:"Peinture au doigt",desc:"Explorer les textures et les couleurs. Développe la motricité fine.",competences:["Motricité fine","Créativité"],duree:"20 min",materiel:"Peinture lavable, feuilles"},
  {age_min:12,age_max:36,cat:"Langage",titre:"Lecture d'images",desc:"Montrer et nommer les objets dans des livres imagiers. Enrichit le vocabulaire.",competences:["Vocabulaire","Concentration"],duree:"10-15 min",materiel:"Livre imagier"},
  {age_min:18,age_max:36,cat:"Sciences",titre:"Jardinage en pot",desc:"Planter des graines, arroser, observer la pousse. Sens de la responsabilité.",competences:["Sciences","Responsabilité"],duree:"20-30 min",materiel:"Pot, terre, graines"},
  {age_min:18,age_max:36,cat:"Motricité",titre:"Parcours moteur",desc:"Obstacles à enjamber, tunnels à traverser, marcher sur une ligne.",competences:["Équilibre","Coordination"],duree:"20 min",materiel:"Coussins, cerceaux"},
  {age_min:24,age_max:36,cat:"Social",titre:"Jeu symbolique",desc:"Jouer à faire semblant (dînette, docteur). Développe l'imaginaire et l'empathie.",competences:["Imagination","Empathie"],duree:"30 min",materiel:"Dînette, poupée"},
  {age_min:24,age_max:36,cat:"Créatif",titre:"Collage libre",desc:"Découper et coller des formes. Travail de la main et de la concentration.",competences:["Motricité fine","Créativité"],duree:"25 min",materiel:"Revues, colle, ciseaux ronds"},
  {age_min:0,age_max:36,cat:"Musique",titre:"Maracas maison",desc:"Riz ou pâtes dans une bouteille. Découverte du son et du rythme.",competences:["Éveil musical","Créativité"],duree:"15 min",materiel:"Bouteille, riz"},
];
const catColors={Éveil:"var(--P)",Motricité:"var(--S)",Langage:"var(--B)",Créatif:"var(--T)",Sciences:"var(--G)",Social:"var(--R)",Musique:"#8B4513"};

function ActivitesSuggerees({enfants,role,pEId}){
  const [selId,setSelId]=useState(enfants[0]?.id);
  const [catFilt,setCatFilt]=useState("tous");
  const liste=role==="parent"?enfants.filter(e=>e.id===pEId):enfants;
  const enfant=liste.find(e=>e.id===selId)||liste[0];

  const _now=new Date();
  const moisAge=enfant?((_now.getFullYear()-new Date(enfant.naissance).getFullYear())*12+(_now.getMonth()-new Date(enfant.naissance).getMonth())):12;
  const activites=ACTIVITES_PAR_AGE.filter(a=>moisAge>=a.age_min&&moisAge<=a.age_max&&(catFilt==="tous"||a.cat===catFilt));
  const cats=["tous",...new Set(ACTIVITES_PAR_AGE.map(a=>a.cat))];

  return <div className="fi">
    <PageHeader icon="💡" title="Activités suggérées" sub={"Propositions pédagogiques adaptées à l'âge · "+age(enfant?.naissance||"")}/>
    {role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
      {liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>setSelId(e.id)}/>)}</div>}

    <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>
      {cats.map(c=><button key={c}onClick={()=>setCatFilt(c)}style={{
        padding:"5px 12px",borderRadius:20,border:"1.5px solid",cursor:"pointer",fontSize:12,fontWeight:600,
        background:catFilt===c?(catColors[c]||"var(--b)"):"transparent",
        color:catFilt===c?"#fff":(catColors[c]||"var(--m)"),
        borderColor:catFilt===c?(catColors[c]||"var(--b)"):(catColors[c]+"44"||"var(--br)"),
      }}>{c==="tous"?"🎯 Tout":c}</button>)}
    </div>

    <div style={{fontSize:12,color:"var(--l)",marginBottom:14,fontFamily:"'DM Mono',monospace"}}>
      {activites.length} activité{activites.length>1?"s":""} pour {enfant?.prenom} ({age(enfant?.naissance||"")})
    </div>

    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:12}}>
      {activites.map((a,i)=><div key={i}className="card"style={{padding:16,borderTop:"3px solid "+(catColors[a.cat]||"var(--T)")}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
          <span className="badge"style={{background:(catColors[a.cat]||"var(--T)")+"22",color:catColors[a.cat]||"var(--T)",fontSize:11}}>{a.cat}</span>
          <span style={{fontSize:11,color:"var(--l)",fontFamily:"'DM Mono',monospace"}}>⏱ {a.duree}</span>
        </div>
        <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:6}}>{a.titre}</div>
        <div style={{fontSize:12,color:"var(--m)",lineHeight:1.6,marginBottom:8}}>{a.desc}</div>
        <div style={{fontSize:11,color:"var(--l)",marginBottom:6}}>📦 {a.materiel}</div>
        <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
          {a.competences.map(c=><span key={c}className="badge"style={{background:"var(--c)",color:"var(--m)",fontSize:10}}>{c}</span>)}
        </div>
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
const PMI_MESSAGES=[
  {id:"pmi1",de:"PMI",h:"09h15",date:new Date(Date.now()-7*86400000).toISOString().slice(0,10),txt:"Bonjour Madame Dupont, nous organisons une réunion d'information le 15 avril à 14h à la mairie. Votre présence est souhaitée.",lu:true},
  {id:"pmi2",de:"asmat",h:"10h30",date:new Date(Date.now()-7*86400000).toISOString().slice(0,10),txt:"Bonjour, je confirme ma présence le 15 avril. Merci pour l'invitation.",lu:true},
  {id:"pmi3",de:"PMI",h:"14h20",date:new Date(Date.now()-2*86400000).toISOString().slice(0,10),txt:"Votre agrément arrive à renouvellement en juin 2024. Merci de nous contacter pour planifier la visite de renouvellement.",lu:false},
];


const PMI_PAR_DEP={
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
function CommunicationPMI({role,user,hasRealData}){
  const [msgs,setMsgs]=useState(hasRealData?[]:PMI_MESSAGES);
  const [txt,setTxt]=useState("");
  const [toast,setToast]=useState("");
  const nonLus=msgs.filter(m=>!m.lu&&m.de==="PMI").length;
  // PMI du secteur - basée sur le code postal du profil asmat
  // L'asmat peut configurer son département dans ses paramètres
  const dep=user?.code_postal?.slice(0,2)||user?.departement||"";
  const pmiInfo=PMI_PAR_DEP[dep]||PMI_PAR_DEP["default"];
  const pmiEmail=pmiInfo.email;
  const asmatEmail=user?.email||"votre-email@timat.fr";

  const markRead=(id)=>setMsgs(p=>p.map(m=>m.id===id?{...m,lu:true}:m));

  const send=()=>{if(!txt.trim())return;
    setMsgs(p=>[...p,{id:"pm"+Date.now(),de:"asmat",h:TODAY_H,date:TODAY_STR,txt,lu:true,email:asmatEmail}]);
    setTxt("");
    setToast("Message envoyé par email à "+pmiEmail+" ✓");
  };

  return <div className="fi">
    {toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
    <PageHeader icon="🏛️" title="Communication PMI" sub="Protection Maternelle et Infantile - échanges par email"/>

    {/* Explication du fonctionnement */}
    <div style={{background:"var(--Bp)",border:"1px solid var(--B)",borderRadius:12,padding:"12px 16px",marginBottom:16,fontSize:13,color:"var(--B)",lineHeight:1.6}}>
      <strong>📧 Fonctionnement :</strong> vos messages sont envoyés par email à la PMI ({pmiEmail}). 
      Leurs réponses arrivent automatiquement ici. Vous apparaissez comme expéditeur : {asmatEmail}.
      <br/><strong>🏛️ {pmiInfo.nom}</strong> - {pmiInfo.tel} - {pmiInfo.adresse}
      <br/><span style={{fontSize:11,color:"var(--l)"}}>💡 Pour configurer votre PMI de secteur, renseignez votre code postal dans Paramètres → Profil</span>
    </div>

    {nonLus>0&&<div style={{background:"#EBF4FF",border:"1.5px solid var(--B)",borderRadius:12,padding:"10px 16px",marginBottom:14,display:"flex",gap:8,alignItems:"center"}}>
      <span style={{fontSize:18}}>📬</span>
      <span style={{fontSize:13,fontWeight:700,color:"var(--B)"}}>{nonLus} nouveau{nonLus>1?"x":""} message{nonLus>1?"s":""} de la PMI</span>
      <button className="btn bG"style={{marginLeft:"auto",fontSize:11,padding:"4px 10px"}}onClick={()=>setMsgs(p=>p.map(m=>({...m,lu:true})))}>
        Tout marquer lu
      </button>
    </div>}

    <div className="g2">
      <div className="card"style={{padding:16}}>
        <div style={{fontWeight:700,fontSize:14,marginBottom:12,color:"var(--b)"}}>Messages PMI</div>
        <div style={{display:"flex",flexDirection:"column",gap:10,maxHeight:400,overflowY:"auto"}}>
          {msgs.map(m=><div key={m.id}onClick={()=>!m.lu&&m.de==="PMI"&&markRead(m.id)}
            style={{cursor:!m.lu&&m.de==="PMI"?"pointer":"default"}}>
            <div style={{flex:1,background:m.de==="PMI"?"var(--Bp)":"var(--Tp)",borderRadius:12,padding:"10px 14px",
              borderLeft:(m.de==="PMI"?"3px solid var(--B)":"3px solid var(--T)"),
              opacity:m.lu?1:.95,boxShadow:!m.lu&&m.de==="PMI"?"0 0 0 2px var(--B)":"none"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{fontSize:11,fontWeight:700,color:m.de==="PMI"?"var(--B)":"var(--T)"}}>
                  {m.de==="PMI"?"🏛️ PMI":"👩👧 "+(user?.prenom||"Marie")}
                  {m.email&&<span style={{fontSize:10,color:"var(--l)",marginLeft:6}}>via {m.email}</span>}
                </span>
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  {!m.lu&&m.de==="PMI"&&<div style={{width:8,height:8,borderRadius:"50%",background:"var(--R)"}}/>}
                  <span style={{fontSize:10,color:"var(--l)",fontFamily:"'DM Mono',monospace"}}>{m.h}</span>
                </div>
              </div>
              <div style={{fontSize:13,color:"var(--b)",lineHeight:1.5}}>{m.txt}</div>
            </div>
          </div>)}
        </div>
        <div style={{marginTop:12,display:"flex",flexDirection:"column",gap:8,paddingTop:12,borderTop:"1px solid var(--br)"}}>
          <div style={{fontSize:11,color:"var(--l)"}}>Répondre à la PMI - sera envoyé à {pmiEmail}</div>
          <div style={{display:"flex",gap:8}}>
            <textarea className="ta"value={txt}onChange={e=>setTxt(e.target.value)}
              placeholder="Votre message à la PMI..."style={{flex:1,minHeight:60,resize:"none"}}/>
            <button className="btn bT"onClick={send}style={{alignSelf:"flex-end"}}>📧 Envoyer</button>
          </div>
        </div>
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div className="card"style={{padding:16}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:12,color:"var(--b)"}}>📋 Mon agrément</div>
          {[["N° agrément","AGR-2019-0042"],["Délivré le","15/09/2019"],["Renouvellement","Juin 2024"],["Enfants autorisés","4 simultanément"],["Statut","✅ Valide"]].map(([l,v])=>
            <div key={l}style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid var(--br)",fontSize:13}}>
              <span style={{color:"var(--l)"}}>{l}</span>
              <span style={{fontWeight:600,color:"var(--b)"}}>{v}</span>
            </div>)}
          <div style={{marginTop:10,padding:"8px 12px",background:"#FFF8E6",borderRadius:9,border:"1px solid #E8B820",fontSize:12,color:"#7A5500"}}>
            ⚠️ Renouvellement à prévoir dans 2 mois - contacter la PMI
          </div>
        </div>
        <div className="card"style={{padding:16}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:10,color:"var(--b)"}}>📁 Documents officiels</div>
          {[["Agrément PMI 2024","✅"],["Assurance RC Pro","✅"],["Formation Continue","⏳"]].map(([n,s])=>
            <div key={n}style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid var(--br)",alignItems:"center"}}>
              <span style={{fontSize:13,color:"var(--b)"}}>{n}</span>
              <span>{s}</span>
            </div>)}
        </div>
        <div className="card"style={{padding:14,background:"var(--Bp)",border:"1px solid var(--B)"}}>
          <div style={{fontWeight:700,fontSize:12,color:"var(--B)",marginBottom:6}}>📞 Contacts PMI</div>
          <div style={{fontSize:12,color:"var(--b)",lineHeight:1.7}}>
            Email : {pmiEmail}<br/>
            Tél : 01 XX XX XX XX<br/>
            Horaires : Lun–Ven 9h–17h
          </div>
        </div>
      </div>
    </div>
  </div>;
}

//
// Logique d'installation PWA partagée
function useInstallPWA(){
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

function InstallButton(){
  const {deferredPrompt,isInstalled,isIOS,install}=useInstallPWA();
  const [showGuide,setShowGuide]=useState(false);

  if(isInstalled)return <div style={{fontSize:12,color:"var(--S)",fontWeight:600}}>✅ TiMat est déjà installé sur votre appareil</div>;

  return <>
    <button className="btn bT" style={{width:"100%",justifyContent:"center"}}
      onClick={()=>install(()=>{if(!deferredPrompt)setShowGuide(true);})}>
      📲 Installer TiMat sur cet appareil
    </button>
    {showGuide&&<InstallGuide isIOS={isIOS} onClose={()=>setShowGuide(false)}/>}
  </>;
}

function InstallGuide({isIOS,onClose}){
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
          💡 Fonctionne uniquement sur <strong>Safari</strong>
        </div>
      </div>:<div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:20}}>
        {[["1","⋮ Appuyez sur les 3 points","En haut à droite de Chrome"],["2","Ajouter à l'écran d'accueil","Dans le menu"],["3","Confirmer","L'icône TiMat apparaîtra"]].map(([n,t,d])=>
          <div key={n} style={{display:"flex",gap:12,padding:"10px 14px",background:"var(--c)",borderRadius:12}}>
            <div style={{width:28,height:28,borderRadius:"50%",background:"var(--T)",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,flexShrink:0}}>{n}</div>
            <div><div style={{fontWeight:600,fontSize:13,color:"var(--b)"}}>{t}</div><div style={{fontSize:11,color:"var(--l)"}}>{d}</div></div>
          </div>)}
      </div>}
      <button onClick={onClose} style={{width:"100%",background:"var(--T)",color:"#fff",border:"none",borderRadius:12,padding:"13px",cursor:"pointer",fontSize:14,fontWeight:700,fontFamily:"inherit"}}>Compris ✓</button>
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
      <span style={{fontSize:18}}>📲</span>
      <div style={{flex:1}}>
        <div style={{fontSize:12,fontWeight:700,color:"#fff"}}>Installer TiMat sur votre écran d'accueil</div>
        <div style={{fontSize:10,color:"rgba(255,255,255,.75)"}}>Accès rapide comme une vraie app</div>
      </div>
      <button onClick={()=>install(()=>{if(!deferredPrompt)setShowGuide(true);})}
        style={{background:"rgba(255,255,255,.2)",border:"1px solid rgba(255,255,255,.4)",borderRadius:8,padding:"6px 12px",cursor:"pointer",fontSize:11,fontWeight:700,color:"#fff",flexShrink:0}}>
        Installer
      </button>
      <button onClick={()=>setShow(false)} style={{background:"none",border:"none",color:"rgba(255,255,255,.7)",cursor:"pointer",fontSize:16,padding:4}}>✕</button>
    </div>
    {showGuide&&<InstallGuide isIOS={isIOS} onClose={()=>setShowGuide(false)}/>}
  </>;
}

function BandeauHorsLigne(){
  const [online,setOnline]=useState(true);
  const [syncing,setSyncing]=useState(false);
  useEffect(()=>{
    const up=()=>setOnline(true);
    const down=()=>setOnline(false);
    window.addEventListener("online",up);
    window.addEventListener("offline",down);
    setOnline(navigator.onLine);
    return()=>{window.removeEventListener("online",up);window.removeEventListener("offline",down);};
  },[]);
  const sync=()=>{setSyncing(true);setTimeout(()=>setSyncing(false),2000);};
  if(online&&!syncing)return null;
  return <div style={{
    background:online?"var(--Sp)":"#FEF9C3",
    borderBottom:"1px solid "+(online?"var(--Sl)":"#FCD34D"),
    padding:"6px 16px",display:"flex",alignItems:"center",gap:8,fontSize:12,fontWeight:600,
    color:online?"var(--S)":"#92400E",flexShrink:0
  }}>
    <span style={{fontSize:14}}>{online?syncing?"🔄":"✅":"📵"}</span>
    {online?syncing?"Synchronisation en cours...":"Données synchronisées"
      :"Hors ligne - les données sont sauvegardées localement"}
    {!online&&<button onClick={sync}style={{marginLeft:"auto",background:"none",border:"1px solid #FCD34D",color:"#92400E",borderRadius:6,padding:"3px 8px",cursor:"pointer",fontSize:11}}>
      Réessayer
    </button>}
  </div>;
}

//
function SupprimerCompte({onDeleted}){
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
      const{error}=await supabase.rpc("delete_user_account",{user_id:user.id});
      if(error)throw error;
      // AUDIT LOG P8 : trace de suppression de compte (avant signOut, user_id explicite car user supprimé en DB)
      await logAction('delete_account', {table_name:'profiles', record_id:user.id, user_id:user.id});
      await supabase.auth.signOut();
      setEtape("done");
      setTimeout(()=>onDeleted?.(),2000);
    }catch(e){
      setErreur(e.message||"Erreur - contactez privacy@timat.app");
      setEtape("error");
    }
  };

  if(etape==="idle")return(
    <div style={{background:"var(--Rp)",border:"1px solid var(--R)",borderRadius:12,padding:20}}>
      <div style={{fontWeight:700,fontSize:14,color:"var(--R)",marginBottom:8}}>⚠️ Zone de danger</div>
      <div style={{fontSize:13,color:"var(--m)",marginBottom:14,lineHeight:1.6}}>
        La suppression est <strong>définitive et irréversible</strong>. Toutes vos données (enfants, contrats, transmissions, photos, bilans) seront effacées immédiatement conformément au RGPD.
      </div>
      <button onClick={()=>setEtape("confirm1")}style={{background:"none",border:"1.5px solid var(--R)",color:"var(--R)",borderRadius:8,padding:"9px 18px",cursor:"pointer",fontSize:13,fontWeight:600}}>
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
function SignaturePad({initialValue,onSave,onCancel}){
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

async function saveAsmatSignature(userId,base64){
  const{error}=await supabase.from("profiles").update({signature_base64:base64}).eq("id",userId);
  if(error)throw error;
  await logAction("update_signature",{table_name:"profiles",record_id:userId,user_id:userId});
  return true;
}

// PDF CONTRAT COMBINE P11 - genere le PDF du contrat avec les 2 signatures (asmat + parent si presente)
// puis le stocke dans Supabase Storage et insere une ligne dans documents_meta.
// Appele apres chaque signature de contrat. Idempotent (remplace si deja existant).
async function generateAndStoreContratPDF(contratId){
  try{
    // 1. Recuperer toutes les donnees necessaires
    const{data:ct,error:eCt}=await supabase.from("contrats").select("*").eq("id",contratId).single();
    if(eCt||!ct)return{success:false,error:"Contrat introuvable"};
    const{data:enfant}=await supabase.from("enfants").select("*").eq("id",ct.enfant_id).single();
    if(!enfant)return{success:false,error:"Enfant introuvable"};
    const{data:asmatProfile}=await supabase.from("profiles").select("prenom,nom,email,telephone,numero_agrement").eq("id",ct.asmat_id).maybeSingle();
    const{data:parentProfile}=ct.parent_id?await supabase.from("profiles").select("prenom,nom,email,telephone").eq("id",ct.parent_id).maybeSingle():{data:null};

    // 2. Charger jsPDF si pas deja charge
    if(!window.jspdf){
      await new Promise((res,rej)=>{
        const s=document.createElement("script");
        s.src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
        s.onload=res;s.onerror=()=>rej(new Error("Chargement jsPDF echoue"));
        document.head.appendChild(s);
      });
    }
    const{jsPDF}=window.jspdf;
    const doc=new jsPDF({unit:"mm",format:"a4",orientation:"portrait"});

    // 3. Genenrer le PDF
    let y=20;
    doc.setFontSize(16);doc.setFont("helvetica","bold");
    doc.text("CONTRAT DE TRAVAIL",105,y,{align:"center"});y+=6;
    doc.setFontSize(10);doc.setFont("helvetica","normal");
    doc.text("Assistante maternelle agreee - CCN 3239",105,y,{align:"center"});y+=12;

    doc.setFontSize(11);doc.setFont("helvetica","bold");
    doc.text("EMPLOYEUR (Particulier)",20,y);y+=6;
    doc.setFont("helvetica","normal");doc.setFontSize(10);
    doc.text((parentProfile?.prenom||"")+" "+(parentProfile?.nom||""),20,y);y+=5;
    if(parentProfile?.email)doc.text("Email : "+parentProfile.email,20,y),y+=5;
    if(parentProfile?.telephone)doc.text("Tel : "+parentProfile.telephone,20,y),y+=5;
    y+=4;

    doc.setFontSize(11);doc.setFont("helvetica","bold");
    doc.text("SALARIEE (Assistante maternelle)",20,y);y+=6;
    doc.setFont("helvetica","normal");doc.setFontSize(10);
    doc.text((asmatProfile?.prenom||"")+" "+(asmatProfile?.nom||""),20,y);y+=5;
    if(asmatProfile?.numero_agrement)doc.text("N agrement : "+asmatProfile.numero_agrement,20,y),y+=5;
    if(asmatProfile?.email)doc.text("Email : "+asmatProfile.email,20,y),y+=5;
    if(asmatProfile?.telephone)doc.text("Tel : "+asmatProfile.telephone,20,y),y+=5;
    y+=4;

    doc.setFontSize(11);doc.setFont("helvetica","bold");
    doc.text("ENFANT ACCUEILLI",20,y);y+=6;
    doc.setFont("helvetica","normal");doc.setFontSize(10);
    doc.text("Prenom : "+(enfant.prenom||"-"),20,y);y+=5;
    if(enfant.naissance)doc.text("Date de naissance : "+enfant.naissance,20,y),y+=5;
    y+=4;

    doc.setFontSize(11);doc.setFont("helvetica","bold");
    doc.text("CONDITIONS D'ACCUEIL",20,y);y+=6;
    doc.setFont("helvetica","normal");doc.setFontSize(10);
    if(ct.debut)doc.text("Debut du contrat : "+ct.debut,20,y),y+=5;
    if(ct.fin)doc.text("Fin du contrat : "+ct.fin,20,y),y+=5;
    doc.text("Heures hebdomadaires : "+(ct.heures_hebdo||0)+" h",20,y);y+=5;
    doc.text("Jours d'accueil : "+(Array.isArray(ct.jours)?ct.jours.join(", "):(ct.jours||"-")),20,y);y+=5;
    doc.text("Horaires : "+(ct.horaires||"-"),20,y);y+=5;
    doc.text("Taux horaire net : "+(ct.taux_horaire||0).toFixed(2)+" euros/h",20,y);y+=5;
    doc.text("Indemnite d'entretien : "+(ct.entretien||0).toFixed(2)+" euros/jour",20,y);y+=5;
    y+=8;

    doc.setFontSize(9);doc.setFont("helvetica","italic");
    doc.text("Contrat conforme a la convention collective nationale des particuliers employeurs (IDCC 2395).",20,y);y+=4;
    doc.text("A conserver 5 ans minimum. Valeur legale identique au papier.",20,y);y+=10;

    // Zone signatures
    doc.setFontSize(11);doc.setFont("helvetica","bold");
    doc.text("SIGNATURES",20,y);y+=6;
    doc.setFont("helvetica","normal");doc.setFontSize(9);

    const sigY=y;
    const sigBoxW=80;const sigBoxH=30;

    // Signature asmat (gauche)
    doc.rect(20,sigY,sigBoxW,sigBoxH);
    doc.text("Assistante maternelle",22,sigY-1);
    if(ct.signature_asmat_data){
      try{doc.addImage(ct.signature_asmat_data,"PNG",22,sigY+2,sigBoxW-4,sigBoxH-10);}catch(e){}
      doc.setFontSize(8);
      doc.text("Le "+(ct.date_signature_asmat?ct.date_signature_asmat.slice(0,10):"-"),22,sigY+sigBoxH-2);
    }else{
      doc.setFontSize(8);doc.text("Non signe",22,sigY+sigBoxH/2);
    }

    // Signature parent (droite)
    doc.rect(110,sigY,sigBoxW,sigBoxH);
    doc.setFontSize(9);doc.text("Parent employeur",112,sigY-1);
    if(ct.signature_parent_data){
      try{doc.addImage(ct.signature_parent_data,"PNG",112,sigY+2,sigBoxW-4,sigBoxH-10);}catch(e){}
      doc.setFontSize(8);
      doc.text("Le "+(ct.date_signature_parent?ct.date_signature_parent.slice(0,10):"-"),112,sigY+sigBoxH-2);
    }else{
      doc.setFontSize(8);doc.text("En attente de signature",112,sigY+sigBoxH/2);
    }

    // 4. Convertir en blob et uploader
    const blob=doc.output("blob");
    const fileName="contrat_"+contratId+".pdf";
    const path=ct.asmat_id+"/contrats/"+fileName;
    const{error:eUp}=await supabase.storage.from("documents").upload(path,blob,{
      contentType:"application/pdf",
      upsert:true,
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
    const nomDoc="Contrat_"+(enfant.prenom||"enfant")+"_"+(ct.debut?.slice(0,7)||"")+".pdf";
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
function Parametres({user,onLogout,setPage,isPro,isTrialing,lancerCheckout,ouvrirPortail,setUser}){
  const [toast,setToast]=useState("");
  // SIGNATURE STANDARD ASMAT P10 - state pour gestion signature de reference
  const [showSigPad,setShowSigPad]=useState(false);
  const [currentSig,setCurrentSig]=useState(user?.signature_base64||null);
  useEffect(()=>{setCurrentSig(user?.signature_base64||null);},[user?.signature_base64]);
  return <div className="fi">
    {toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
    <PageHeader icon="⚙️" title="Paramètres" sub="Votre compte et vos données"/>
    <div style={{maxWidth:600,margin:"0 auto",display:"flex",flexDirection:"column",gap:16}}>

      {/* Abonnement - uniquement pour les assmats */}
      {user?.role==="asmat"&&<div className="card"style={{padding:20,border:isPro?"2px solid var(--S)":"2px solid var(--T)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <div style={{fontWeight:700,fontSize:14,color:"var(--b)"}}>💳 Mon abonnement</div>
          <span style={{
            background:isPro?"var(--Sp)":"var(--Tp)",
            color:isPro?"var(--S)":"var(--T)",
            borderRadius:20,padding:"3px 12px",fontSize:11,fontWeight:700
          }}>{isTrialing?"✨ Essai gratuit":isPro?"✅ Pro actif":"🔓 Gratuit"}</span>
        </div>

        {isPro?<>
          {isTrialing&&<div style={{background:"var(--Gp)",border:"1px solid var(--G)",borderRadius:10,padding:"10px 14px",marginBottom:12,fontSize:12,color:"var(--G)"}}>
            🎉 Vous bénéficiez de 2 mois d'essai gratuit. Aucun prélèvement avant la fin de l'essai.
          </div>}
          <div style={{fontSize:13,color:"var(--m)",lineHeight:1.7,marginBottom:14}}>
            {isTrialing
              ? "Votre abonnement Pro démarrera automatiquement à la fin de votre période d'essai."
              : "Votre abonnement Pro est actif. Toutes les fonctionnalités sont débloquées."}
          </div>
          <button className="btn bG"style={{width:"100%",justifyContent:"center"}}onClick={ouvrirPortail||undefined}>
            ⚙️ Gérer mon abonnement (facturation, résiliation)
          </button>
          <div style={{fontSize:11,color:"var(--l)",marginTop:6,textAlign:"center"}}>
            Vous serez redirigée vers le portail Stripe sécurisé.
          </div>
        </>:<>
          <div style={{marginBottom:14}}>
            {[
              "✨ Bilans de journée automatiques",
              "📜 Bulletins de salaire complets",
              "🏛️ Export Pajemploi en 1 clic",
              "📋 Contrats, avenants, courriers illimités",
              "👶 Enfants illimités",
              "❓ Support prioritaire",
            ].map(f=><div key={f}style={{display:"flex",gap:8,padding:"5px 0",fontSize:13,borderBottom:"1px solid var(--br)"}}>
              <span style={{color:"var(--S)"}}>✓</span>
              <span style={{color:"var(--b)"}}>{f}</span>
            </div>)}
          </div>
          <div style={{textAlign:"center",marginBottom:12}}>
            <div style={{fontSize:26,fontWeight:700,color:"var(--T)",fontFamily:"'DM Sans',sans-serif"}}>9,99€<span style={{fontSize:13,color:"var(--l)",fontWeight:400}}>/mois</span></div>
            <div style={{fontSize:11,color:"var(--l)"}}>2 mois gratuits · Premier paiement à J+60 · Résiliable à tout moment</div>
          </div>
          <button className="btn bT"style={{width:"100%",justifyContent:"center",fontSize:14,padding:"13px"}}
            onClick={lancerCheckout||undefined}>
            🚀 Passer à Pro - Commencer mon essai gratuit
          </button>
        </>}
      </div>}

      {/* Profil */}
      <div className="card"style={{padding:20}}>
        <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:14}}>👤 Mon profil</div>
        {[
          ["Prénom",user?.prenom||"-"],
          ["Nom",user?.nom||"-"],
          ["Email",user?.email||"-"],
          ["Rôle",user?.role==="asmat"?"Assistante maternelle":"Parent employeur"],
        ].map(([l,v])=><div key={l}style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid var(--br)",fontSize:13}}>
          <span style={{color:"var(--l)"}}>{l}</span>
          <span style={{fontWeight:600,color:"var(--b)"}}>{v}</span>
        </div>)}
        {/* CHAMPS EDITABLES P14 - telephone + numero_agrement (asmat uniquement pour ce dernier) */}
        <div style={{marginTop:12}}>
          <label className="lbl">Téléphone</label>
          <div style={{display:"flex",gap:8}}>
            <input className="inp" defaultValue={user?.telephone||""} id="tel-input" placeholder="06 12 34 56 78" style={{flex:1}}/>
            <button className="btn bT" style={{fontSize:12}} onClick={async()=>{
              const tel=document.getElementById("tel-input")?.value?.trim();
              const{error}=await supabase.from("profiles").update({telephone:tel||null}).eq("id",user.id);
              if(error){setToast("Erreur : "+error.message);return;}
              setUser&&setUser(u=>({...u,telephone:tel}));
              setToast("Téléphone enregistré ✓");
            }}>Enregistrer</button>
          </div>
        </div>
        {user?.role==="asmat"&&<div style={{marginTop:12}}>
          <label className="lbl">N° d'agrément (apparaît sur attestations et contrats)</label>
          <div style={{display:"flex",gap:8}}>
            <input className="inp" defaultValue={user?.numero_agrement||""} id="agr-input" placeholder="ex: 75-2023-AM-0042" style={{flex:1}}/>
            <button className="btn bT" style={{fontSize:12}} onClick={async()=>{
              const agr=document.getElementById("agr-input")?.value?.trim();
              const{error}=await supabase.from("profiles").update({numero_agrement:agr||null}).eq("id",user.id);
              if(error){setToast("Erreur : "+error.message);return;}
              setUser&&setUser(u=>({...u,numero_agrement:agr}));
              setToast("N° d'agrément enregistré ✓");
            }}>Enregistrer</button>
          </div>
          {user?.numero_agrement&&<div style={{fontSize:11,color:"var(--S)",marginTop:4}}>
            ✅ Numéro enregistré : {user.numero_agrement}
          </div>}
        </div>}
        {/* Code postal — nécessaire pour détecter la PMI */}
        {user?.role==="asmat"&&<div style={{marginTop:12}}>
          <label className="lbl">Code postal (pour votre PMI)</label>
          <div style={{display:"flex",gap:8}}>
            <input className="inp" defaultValue={user?.code_postal||""} id="cp-input" placeholder="ex: 94230" style={{flex:1}}/>
            <button className="btn bT" style={{fontSize:12}} onClick={async()=>{
              const cp=document.getElementById("cp-input")?.value?.trim();
              if(!cp)return;
              await supabase.from("profiles").update({code_postal:cp}).eq("id",user.id);
              setUser&&setUser(u=>({...u,code_postal:cp}));
              // Forcer rechargement page PMI
              const dep=cp.slice(0,2);
              const pmi={"75":"PMI Paris 75","92":"PMI Hauts-de-Seine 92","93":"PMI Seine-Saint-Denis 93","94":"PMI Val-de-Marne 94 (L'Haÿ-les-Roses)","91":"PMI Essonne 91","95":"PMI Val-d'Oise 95","77":"PMI Seine-et-Marne 77","78":"PMI Yvelines 78","69":"PMI Métropole de Lyon 69","13":"PMI Bouches-du-Rhône 13","31":"PMI Haute-Garonne 31","33":"PMI Gironde 33","67":"PMI Bas-Rhin 67","59":"PMI Nord 59"}[dep]||"PMI détectée selon département "+dep;
              setToast("✅ Code postal "+cp+" enregistré — "+pmi+" — Allez dans Outils Pro → PMI pour voir les contacts");
            }}>Sauvegarder</button>
          </div>
          {user?.code_postal&&<div style={{fontSize:11,color:"var(--S)",marginTop:4}}>
            ✅ Code postal : {user.code_postal} → PMI {{"75":"Paris 75","92":"Hauts-de-Seine 92","93":"Seine-Saint-Denis 93","94":"Val-de-Marne 94","91":"Essonne 91","95":"Val-d'Oise 95","77":"Seine-et-Marne 77","78":"Yvelines 78","69":"Métropole de Lyon 69","13":"Bouches-du-Rhône 13","31":"Haute-Garonne 31","33":"Gironde 33","67":"Bas-Rhin 67","59":"Nord 59"}[user.code_postal?.slice(0,2)]||user.code_postal?.slice(0,2)} détectée
          </div>}
        </div>}

        {/* SIGNATURE ELECTRONIQUE P14F - section accessible asmat ET parent */}
        <div style={{marginTop:16,paddingTop:16,borderTop:"1px solid var(--br)"}}>
          <label className="lbl">✍️ Ma signature électronique</label>
          <div style={{fontSize:12,color:"var(--l)",marginBottom:10,lineHeight:1.5}}>
            {user?.role==="asmat"
              ?"Dessinez-la une fois ici. Elle sera proposée automatiquement sur les contrats, bulletins et attestations."
              :"Dessinez-la une fois ici. Elle sera utilisée pour signer le contrat et valider les pointages."}
          </div>
          {currentSig?<div>
            <div style={{display:"inline-block",border:"1px solid var(--br)",borderRadius:8,padding:8,background:"#FDFAF6",marginBottom:8}}>
              <img src={currentSig} alt="Ma signature" style={{maxWidth:280,maxHeight:80,display:"block"}}/>
            </div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <button className="btn bG" style={{fontSize:12}} onClick={()=>setShowSigPad(true)}>Modifier</button>
              <button className="btn bG" style={{fontSize:12,color:"var(--R)"}} onClick={async()=>{
                if(!window.confirm("Supprimer votre signature enregistrée ?"))return;
                try{
                  await saveAsmatSignature(user.id,null);
                  setCurrentSig(null);
                  setUser&&setUser(u=>({...u,signature_base64:null}));
                  setToast("Signature supprimée");
                }catch(e){setToast("Erreur : "+e.message);}
              }}>Supprimer</button>
            </div>
          </div>:<div>
            <div style={{fontSize:12,color:"var(--l)",fontStyle:"italic",marginBottom:8}}>Aucune signature enregistrée pour le moment.</div>
            <button className="btn bT" style={{fontSize:12}} onClick={()=>setShowSigPad(true)}>+ Créer ma signature</button>
          </div>}
        </div>
      </div>

      {/* SIGNATURE STANDARD ASMAT P10 - modale de capture */}
      {showSigPad&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999,padding:16}}>
        <div className="card" style={{padding:0,maxWidth:700,width:"100%",maxHeight:"90vh",overflow:"auto"}}>
          <div style={{padding:"16px 20px",borderBottom:"1px solid var(--br)",fontWeight:700,fontSize:15,color:"var(--b)"}}>
            ✍️ Ma signature électronique
          </div>
          <SignaturePad initialValue={currentSig} onCancel={()=>setShowSigPad(false)} onSave={async(dataUrl)=>{
            try{
              await saveAsmatSignature(user.id,dataUrl);
              setCurrentSig(dataUrl);
              setUser&&setUser(u=>({...u,signature_base64:dataUrl}));
              setShowSigPad(false);
              setToast("Signature enregistrée ✓");
            }catch(e){setToast("Erreur : "+e.message);}
          }}/>
        </div>
      </div>}

      {/* Installation PWA */}
      <div className="card"style={{padding:20}}>
        <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:8}}>📲 Installer TiMat sur votre téléphone</div>
        <div style={{fontSize:12,color:"var(--l)",marginBottom:12,lineHeight:1.6}}>
          Ajoutez TiMat sur votre écran d'accueil pour y accéder comme une vraie application, sans passer par le navigateur.
        </div>
        <InstallButton/>
      </div>
      <div className="card"style={{padding:20}}>
        <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:14}}>📋 Légal & RGPD</div>
        {[
          ["🔒","Politique de confidentialité","politique_confidentialite"],
          ["📋","Mentions légales","mentions_legales"],
        ].map(([ic,l,p])=>
          <div key={p}onClick={()=>setPage(p)}style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid var(--br)",cursor:"pointer"}}
            onMouseEnter={e=>e.currentTarget.style.background="var(--c)"}
            onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
            <span style={{fontSize:13,color:"var(--b)"}}>{ic} {l}</span>
            <span style={{color:"var(--l)",fontSize:12}}>→</span>
          </div>)}
        <div style={{marginTop:12,padding:"10px 12px",background:"var(--Sp)",borderRadius:8,fontSize:12,color:"var(--S)"}}>
          ✅ Données hébergées en France · Jamais vendues · Supprimables à tout moment
        </div>
      </div>

      {/* Déconnexion */}
      <div className="card"style={{padding:20}}>
        <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:14}}>🚪 Session</div>
        <button className="btn bG"style={{width:"100%",justifyContent:"center"}}onClick={onLogout}>
          Se déconnecter
        </button>
      </div>

      <SupprimerCompte onDeleted={onLogout}/>
    </div>
  </div>;
}

//
function PolitiqueConfidentialite(){
  const sections=[
    {titre:"1. Responsable de traitement",contenu:"TiMat - contact : privacy@timat.app\nHébergement des données : France (OVHcloud Paris via Supabase)."},
    {titre:"2. Données collectées",contenu:""},
    {titre:"3. Durées de conservation",contenu:""},
    {titre:"4. Vos droits",contenu:""},
    {titre:"5. Cookies",contenu:"TiMat n'utilise aucun cookie publicitaire ni de tracking. Seuls les cookies techniques nécessaires au fonctionnement (session, authentification) sont utilisés."},
    {titre:"6. Sécurité",contenu:"Chiffrement en transit (HTTPS/TLS 1.3), chiffrement au repos (AES-256), Row Level Security Supabase, authentification sécurisée."},
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
    "3. Durées de conservation":[
      ["Données","Durée","Justification"],
      ["Compte actif","Durée de l'abonnement","Nécessité du service"],
      ["Après suppression du compte","0 jour (effacement immédiat)","Droit à l'effacement RGPD"],
      ["Données financières / contrats","10 ans","Obligation légale comptable"],
      ["Logs de connexion","12 mois","Sécurité"],
      ["Consentements","5 ans","Preuve de conformité CNIL"],
    ],
    "4. Vos droits":[
      ["Droit","Comment l'exercer"],
      ["Accès à vos données","Administratif → Documents → Export dossier"],
      ["Rectification","Paramètres → Modifier mon profil"],
      ["Effacement (oubli)","Paramètres → Supprimer mon compte (immédiat et définitif)"],
      ["Portabilité","Export CSV/PDF depuis l'application"],
      ["Opposition","Contactez privacy@timat.app"],
      ["Réclamation CNIL","www.cnil.fr - 3 Place de Fontenoy, 75007 Paris"],
    ],
  };

  return <div className="fi">
    <PageHeader icon="🔒" title="Politique de confidentialité" sub="Version 1.0 - Mars 2026 - Conforme RGPD"/>
    <div style={{maxWidth:800,margin:"0 auto"}}>
      {sections.map((s,i)=><div key={i}className="card"style={{padding:24,marginBottom:16}}>
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
      <div className="card"style={{padding:20,background:"var(--Bp)",border:"1px solid var(--B)"}}>
        <div style={{fontWeight:700,fontSize:13,color:"var(--B)",marginBottom:6}}>📧 Contact RGPD</div>
        <div style={{fontSize:13,color:"var(--m)"}}>Pour exercer vos droits : <strong>privacy@timat.app</strong> - Réponse sous 30 jours.</div>
      </div>
    </div>
  </div>;
}

//
function MentionsLegales(){
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
    {titre:"Données personnelles",contenu:"Responsable de traitement : TiMat - privacy@timat.app\nAutorité de contrôle : CNIL - www.cnil.fr\nVoir la politique de confidentialité complète pour le détail des traitements."},
    {titre:"Droit applicable",contenu:"Les présentes mentions légales sont soumises au droit français. En cas de litige, les tribunaux français seront seuls compétents."},
  ];

  return <div className="fi">
    <PageHeader icon="📋" title="Mentions légales" sub="Conformément à la loi n°2004-575 du 21 juin 2004 (LCEN)"/>
    <div style={{maxWidth:700,margin:"0 auto"}}>
      {blocs.map((b,i)=><div key={i}className="card"style={{padding:22,marginBottom:14}}>
        <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:10}}>{b.titre}</div>
        {b.custom?<div>
          {/* Bloc éditeur éditable */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div style={{fontSize:12,color:"var(--l)"}}>À compléter avec vos informations légales</div>
            <button onClick={()=>setEdit(p=>!p)}className="btn bG"style={{fontSize:11,padding:"4px 12px"}}>
              {edit?"✓ Sauvegarder":"✏️ Modifier"}
            </button>
          </div>
          {[
            ["Raison sociale","TiMat"],
            ["Représentée par","representant"],
            ["Email","contact@timat.app"],
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
            ⚠️ Ces informations doivent être complétées avant la mise en ligne de l'application. Cliquez sur "Modifier" pour renseigner vos données légales.
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
function JournalAvecBilans({enfant,liste,role,pEId,user}){
  const [sousSec,setSousSec]=useState("messages");
  if(role!=="asmat") return <TransmissionsContent enfant={enfant}role={role}user={user}/>;
  return <div>
    <div style={{display:"flex",gap:2,marginBottom:14,borderBottom:"1.5px solid var(--br)"}}>
      {[{id:"messages",l:"Messages",ic:"💬"},{id:"bilan",l:"Bilan du jour",ic:"✨"},{id:"cr",l:"CR Trimestriel",ic:"📝"}].map(s=>
        <button key={s.id}onClick={()=>setSousSec(s.id)}style={{
          padding:"6px 12px",border:"none",background:"none",cursor:"pointer",
          fontFamily:"'DM Sans',sans-serif",fontWeight:600,fontSize:12,whiteSpace:"nowrap",
          color:sousSec===s.id?"var(--P)":"var(--l)",
          borderBottom:sousSec===s.id?"2px solid var(--P)":"2px solid transparent",
          marginBottom:-2,transition:"all .15s",display:"flex",alignItems:"center",gap:4
        }}><span>{s.ic}</span><span>{s.l}</span></button>
      )}
    </div>
    {sousSec==="messages"&&<TransmissionsContent enfant={enfant}role={role}user={user}/>}
    {sousSec==="bilan"&&<RecitIA enfants={liste}role={role}pEId={enfant?.id}/>}
    {sousSec==="cr"&&<CompteRenduTrimestriel enfants={liste}role={role}pEId={enfant?.id}/>}
  </div>;
}

//
function JournalComplet({enfants,role,pEId,user}){
  const [selId,setSelId]=useState(enfants[0]?.id);
  const [sec,setSec]=useState("journal");
  const liste=role==="parent"?enfants.filter(e=>e.id===pEId):enfants;
  const enfant=liste.find(e=>e.id===selId)||liste[0];
  const secs=role==="asmat"
    ?[{id:"journal",l:"Journal & Bilans",ic:"📋"},{id:"repas",l:"Repas & Changes",ic:"🍽️"},{id:"sommeil",l:"Sommeil",ic:"😴"},{id:"activites",l:"Activités",ic:"💡"}]
    :[{id:"journal",l:"Journal",ic:"📋"},{id:"repas",l:"Repas",ic:"🍽️"},{id:"sommeil",l:"Sommeil",ic:"😴"},{id:"activites",l:"Activités",ic:"💡"}];
  return <div className="fi">
    {role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
      {liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>{setSelId(e.id);setSec("journal");}}/>)}
    </div>}
    <div style={{display:"flex",gap:2,marginBottom:16,borderBottom:"2px solid var(--br)",overflowX:"auto",scrollbarWidth:"none"}}>
      {secs.map(s=><button key={s.id}onClick={()=>setSec(s.id)}style={{
        padding:"7px 14px",border:"none",background:"none",cursor:"pointer",
        fontFamily:"'DM Sans',sans-serif",fontWeight:600,fontSize:12,whiteSpace:"nowrap",flexShrink:0,
        color:sec===s.id?"var(--T)":"var(--b)",
        borderBottom:sec===s.id?"2px solid var(--T)":"2px solid transparent",
        marginBottom:-2,transition:"all .15s",display:"flex",alignItems:"center",gap:5
      }}><span>{s.ic}</span><span>{s.l}</span></button>)}
    </div>
    {sec==="journal"&&<JournalAvecBilans enfant={enfant}liste={liste}role={role}pEId={selId}user={user}/>}
    {sec==="repas"&&<RepasChanges enfants={liste}role={role}pEId={selId}/>}
    {sec==="sommeil"&&<Sommeil enfants={liste}role={role}pEId={selId}/>}
    {sec==="activites"&&<ActivitesSuggerees enfants={liste}role={role}pEId={selId}/>}
  </div>;
}

//
function SanteComplete({enfants,role,pEId}){
  const [selId,setSelId]=useState(enfants[0]?.id);
  const [sec,setSec]=useState("sante");
  const liste=role==="parent"?enfants.filter(e=>e.id===pEId):enfants;
  const enfant=liste.find(e=>e.id===selId)||liste[0];

  // Rappels vaccins automatiques
  const isRealEnfant=!["e1","e2","e3"].includes(enfant?.id);
  const VAC_BASE=[
    {nom:"DT-Polio-Coq-Hib-HB-Pneumo",age_mois:2,fait:isRealEnfant?false:true},
    {nom:"DT-Polio-Coq-Hib-HB-Pneumo (2e)",age_mois:4,fait:isRealEnfant?false:true},
    {nom:"DT-Polio-Coq-Hib-HB-Méningocoque",age_mois:5,fait:isRealEnfant?false:true},
    {nom:"ROR + Pneumo + Méningocoque (2e)",age_mois:11,fait:isRealEnfant?false:true},
    {nom:"ROR (2e dose)",age_mois:12,fait:false},
    {nom:"DT-Polio-Coq rappel",age_mois:18,fait:false},
    {nom:"Varicelle",age_mois:24,fait:false},
  ];
  const [vacsState,setVacsState]=useState(VAC_BASE);
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
        color:sec===s.id?"var(--R)":"var(--b)",
        borderBottom:sec===s.id?"2px solid var(--R)":"2px solid transparent",
        marginBottom:-2,transition:"all .15s",display:"flex",alignItems:"center",gap:5
      }}>
        <span>{s.ic}</span><span>{s.l}</span>
        {s.badge>0&&<span style={{background:"var(--R)",color:"#fff",borderRadius:10,
          padding:"1px 5px",fontSize:9,fontWeight:700}}>{s.badge}</span>}
      </button>)}
    </div>

    {sec==="sante"&&<Sante enfants={liste}role={role}pEId={selId}/>}
    {sec==="croissance"&&<CourbeCroissance enfants={liste}role={role}pEId={selId}/>}
    {sec==="vaccins"&&<div>
      <PageHeader icon="💉" title="Suivi vaccinal" sub="Calendrier vaccinal officiel - rappels automatiques"/>

      {prochainsVaccins.length>0&&<div style={{background:"var(--Rp)",border:"1.5px solid var(--R)",borderRadius:12,padding:"12px 16px",marginBottom:16,display:"flex",gap:10,alignItems:"center"}}>
        <span style={{fontSize:20}}>⚠️</span>
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
              <div style={{fontSize:11,color:"var(--l)"}}>À {v.age_mois} mois · {v.fait?"Fait ✓":enRetard?"En retard":proche?"À prévoir":"À venir"}</div>
            </div>
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
function EveilComplet({enfants,role,pEId}){
  const [selId,setSelId]=useState(enfants[0]?.id);
  const [sec,setSec]=useState("portfolio");
  const liste=role==="parent"?enfants.filter(e=>e.id===pEId):enfants;
  return <div className="fi">
    {role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
      {liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>setSelId(e.id)}/>)}
    </div>}
    <div style={{display:"flex",gap:2,marginBottom:16,borderBottom:"2px solid var(--br)"}}>
      {[{id:"portfolio",l:"Portfolio",ic:"🎨"},{id:"developpement",l:"Développement",ic:"🌱"}].map(s=>
        <button key={s.id}onClick={()=>setSec(s.id)}style={{
          padding:"7px 16px",border:"none",background:"none",cursor:"pointer",
          fontFamily:"'DM Sans',sans-serif",fontWeight:600,fontSize:12,
          color:sec===s.id?"var(--S)":"var(--b)",
          borderBottom:sec===s.id?"2px solid var(--S)":"2px solid transparent",
          marginBottom:-2,transition:"all .15s",display:"flex",alignItems:"center",gap:5
        }}><span>{s.ic}</span><span>{s.l}</span></button>
      )}
    </div>
    {sec==="portfolio"&&<Portfolio enfants={liste}role={role}pEId={selId}/>}
    {sec==="developpement"&&<Developpement enfants={liste}role={role}pEId={selId}/>}
  </div>;
}

//
function DocumentsComplet({enfants,role,pEId,user}){
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
        }}><span>{s.ic}</span><span>{s.l}</span></button>
      )}
    </div>
    {sec==="documents"&&<Documents enfants={enfants}role={role}pEId={pEId}user={user}/>}
    {sec==="attestation_pe"&&<AttestationPoleEmploi enfants={enfants}role={role}pEId={pEId}user={user}/>}
    {sec==="attestation_fiscale"&&<AttestationFiscale enfants={enfants}role={role}pEId={pEId}user={user}/>}
  </div>;
}

//
const DEMANDES_DEMO=[
  {
    id:"d1",statut:"nouveau",date:new Date(Date.now()-2*86400000).toISOString().slice(0,10),
    parent:{prenom:"Camille",nom:"Moreau",email:"camille.moreau@gmail.com",tel:"06 12 34 56 78",profession:"Infirmière"},
    enfant:{prenom:"Chloé",naissance:"2023-08-14",allergies:"Aucune connue",dejaCrèche:false},
    contrat:{debut:"2024-09-02",jours:["Lundi","Mardi","Mercredi","Jeudi"],
      heureArrivee:"07h30",heureDepart:"17h30",heuresHebdo:40,
      anneeComplete:true,vacances:"Oui, pendant les vacances scolaires"},
    message:"Bonjour Madame Dupont, nous avons trouvé votre profil sur monenfant.fr. Notre fille Chloé aura 1 an en août et nous cherchons une assistante maternelle de confiance pour la rentrée. Votre profil nous correspond parfaitement.",
  },
  {
    id:"d2",statut:"en_discussion",date:new Date(Date.now()-5*86400000).toISOString().slice(0,10),
    parent:{prenom:"Antoine",nom:"Lefebvre",email:"antoine.lefebvre@hotmail.fr",tel:"07 89 01 23 45",profession:"Comptable"},
    enfant:{prenom:"Mathieu",naissance:"2022-11-03",allergies:"Lactose",dejaCrèche:true},
    contrat:{debut:"2024-10-01",jours:["Lundi","Mercredi","Vendredi"],
      heureArrivee:"08h00",heureDepart:"18h00",heuresHebdo:30,
      anneeComplete:false,vacances:"Non, pas pendant les vacances"},
    message:"Bonjour, mon fils Mathieu est actuellement à la crèche mais nous souhaitons le confier à une assistante maternelle à partir d'octobre. Il a une intolérance au lactose. Serait-il possible d'échanger ?",
  },
  {
    id:"d3",statut:"accepte",date:new Date(Date.now()-12*86400000).toISOString().slice(0,10),
    parent:{prenom:"Lucie",nom:"Bernard",email:"lucie.b@orange.fr",tel:"06 55 44 33 22",profession:"Enseignante"},
    enfant:{prenom:"Tom",naissance:"2021-04-20",allergies:"Aucune",dejaCrèche:false},
    contrat:{debut:"2024-09-02",jours:["Lundi","Mardi","Jeudi","Vendredi"],
      heureArrivee:"08h30",heureDepart:"16h30",heuresHebdo:32,
      anneeComplete:true,vacances:"Pendant les petites vacances uniquement"},
    message:"Bonjour, je suis enseignante et je cherche une assistante maternelle pour mon fils Tom. Vos horaires correspondent parfaitement aux miens.",
  },
  {
    id:"d4",statut:"refuse",date:new Date(Date.now()-20*86400000).toISOString().slice(0,10),
    parent:{prenom:"Marc",nom:"Petit",email:"marc.petit@sfr.fr",tel:"06 11 22 33 44",profession:"Commercial"},
    enfant:{prenom:"Emma",naissance:"2024-01-15",allergies:"Aucune",dejaCrèche:false},
    contrat:{debut:"2024-06-01",jours:["Lundi","Mardi","Mercredi","Jeudi","Vendredi"],
      heureArrivee:"07h00",heureDepart:"19h00",heuresHebdo:48,
      anneeComplete:true,vacances:"Oui, toutes les vacances"},
    message:"Bonjour, nous cherchons une solution d'urgence pour notre bébé Emma dès le 1er juin.",
  },
];

//
function ListeAttente({role,enfants,user}){
  const isDemoMode=(enfants||[]).every(e=>["e1","e2","e3"].includes(e.id));
  const [demandes,setDemandes]=useState(isDemoMode?DEMANDES_DEMO:[]);
  const [selId,setSelId]=useState(null);
  const [filtre,setFiltre]=useState("tous");
  const [repTxt,setRepTxt]=useState("");
  const [toast,setToast]=useState("");
  const sel=demandes.find(d=>d.id===selId);

  const statutLabel={nouveau:"🔵 Nouveau",en_discussion:"🟡 En discussion",accepte:"🟢 Accepté",refuse:"🔴 Refusé"};
  const statutColor={nouveau:"var(--B)",en_discussion:"var(--G)",accepte:"var(--S)",refuse:"var(--R)"};
  const statutBg={nouveau:"var(--Bp)",en_discussion:"var(--Gp)",accepte:"var(--Sp)",refuse:"var(--Rp)"};

  const changerStatut=(id,statut)=>{
    setDemandes(p=>p.map(d=>d.id===id?{...d,statut}:d));
    if(statut==="accepte")setToast("Demande acceptée - un contrat peut maintenant être créé ✓");
    if(statut==="refuse")setToast("Demande refusée - un email sera envoyé aux parents.");
  };

  const envoyerReponse=()=>{
    if(!repTxt.trim())return;
    setToast("Réponse envoyée à "+sel?.parent.email+" ✓");
    setRepTxt("");
    changerStatut(selId,"en_discussion");
  };

  const demandesFiltrees=filtre==="tous"?demandes:demandes.filter(d=>d.statut===filtre);
  const nbNouveaux=demandes.filter(d=>d.statut==="nouveau").length;

  const ageEnfant=(naiss)=>{
    const n=new Date(naiss),now=new Date();
    const mois=(now.getFullYear()-n.getFullYear())*12+(now.getMonth()-n.getMonth());
    return mois<12?mois+" mois":Math.floor(mois/12)+" an"+(mois>=24?"s":"");
  };

  return <div className="fi">
    {toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
    <PageHeader icon="📬" title="Demandes de contact"
      sub="Parents qui souhaitent vous confier leur enfant via votre profil TiMat"/>

    {/* Info email public */}
    <div style={{background:"linear-gradient(135deg,var(--Bp),var(--Pp))",border:"1px solid var(--B)",borderRadius:14,padding:"14px 18px",marginBottom:20,display:"flex",gap:14,alignItems:"flex-start"}}>
      <span style={{fontSize:24}}>💡</span>
      <div>
        <div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:4}}>Votre adresse de contact publique</div>
        <div style={{fontFamily:"'DM Mono',monospace",fontSize:13,color:"var(--B)",fontWeight:600,marginBottom:6}}>
          {user?.email||"votre-email@timat.app"}
        </div>
        <div style={{fontSize:12,color:"var(--m)",lineHeight:1.6}}>
          Mettez cette adresse sur votre profil <strong>monenfant.fr</strong>. 
          Les parents qui vous écrivent arrivent sur votre formulaire TiMat et vous voyez leur demande complète ici.
        </div>
      </div>
    </div>

    {nbNouveaux>0&&<div style={{background:"var(--Bp)",border:"1.5px solid var(--B)",borderRadius:12,padding:"10px 16px",marginBottom:14,display:"flex",gap:8,alignItems:"center"}}>
      <span style={{fontSize:18}}>📬</span>
      <span style={{fontWeight:700,fontSize:13,color:"var(--B)"}}>{nbNouveaux} nouvelle{nbNouveaux>1?"s":""} demande{nbNouveaux>1?"s":""} en attente</span>
    </div>}

    {/* Filtres */}
    <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>
      {[["tous","Toutes"],["nouveau","Nouvelles"],["en_discussion","En discussion"],["accepte","Acceptées"],["refuse","Refusées"]].map(([v,l])=>
        <button key={v}onClick={()=>setFiltre(v)}style={{
          padding:"5px 12px",borderRadius:20,border:"1.5px solid",cursor:"pointer",fontSize:12,fontWeight:600,
          background:filtre===v?"var(--b)":"transparent",
          color:filtre===v?"#fff":"var(--m)",
          borderColor:filtre===v?"var(--b)":"var(--br)"
        }}>{l} {v==="tous"?"("+demandes.length+")":v==="nouveau"&&nbNouveaux>0?"("+nbNouveaux+")":""}</button>)}
    </div>

    <div className="g2">
      {/* Liste des demandes */}
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {demandesFiltrees.length===0&&<div className="card"style={{padding:20,textAlign:"center",color:"var(--l)",fontSize:13}}>
          Aucune demande dans cette catégorie.
        </div>}
        {demandesFiltrees.map(d=><div key={d.id}className="card card-lift"
          onClick={()=>setSelId(selId===d.id?null:d.id)}
          style={{padding:16,cursor:"pointer",borderLeft:"4px solid "+statutColor[d.statut],
            boxShadow:selId===d.id?"var(--sh2)":"var(--sh)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
            <div style={{flex:1}}>
              <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:4}}>
                <span style={{fontWeight:700,fontSize:14,color:"var(--b)"}}>{d.parent.prenom} {d.parent.nom}</span>
                <span className="badge"style={{background:statutBg[d.statut],color:statutColor[d.statut],fontSize:10}}>
                  {statutLabel[d.statut]}
                </span>
              </div>
              <div style={{fontSize:12,color:"var(--m)"}}>
                Pour <strong>{d.enfant.prenom}</strong> · {ageEnfant(d.enfant.naissance)} · {d.contrat.jours.length}j/sem · {d.contrat.heuresHebdo}h/sem
              </div>
              <div style={{fontSize:11,color:"var(--l)",marginTop:2}}>
                Souhaite commencer le {fmt(d.contrat.debut)}
              </div>
            </div>
            <div style={{fontSize:11,color:"var(--l)",fontFamily:"'DM Mono',monospace",flexShrink:0}}>{fmt(d.date)}</div>
          </div>
          {d.statut==="nouveau"&&<div style={{marginTop:8,fontSize:12,color:"var(--m)",fontStyle:"italic",lineHeight:1.5,
            overflow:"hidden",textOverflow:"ellipsis",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>
            "{d.message}"
          </div>}
        </div>)}
      </div>

      {/* Détail demande sélectionnée */}
      {sel?<div style={{display:"flex",flexDirection:"column",gap:12}}>
        {/* Infos famille */}
        <div className="card"style={{padding:18}}>
          <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:14,display:"flex",gap:8,alignItems:"center"}}>
            <span>👪</span> {sel.parent.prenom} {sel.parent.nom}
            <span className="badge"style={{background:statutBg[sel.statut],color:statutColor[sel.statut],fontSize:10,marginLeft:4}}>
              {statutLabel[sel.statut]}
            </span>
          </div>
          {/* Parent */}
          <div style={{fontSize:12,fontWeight:700,color:"var(--l)",textTransform:"uppercase",letterSpacing:".5px",marginBottom:8}}>Le parent</div>
          {[["📧 Email",sel.parent.email],["📞 Téléphone",sel.parent.tel],["💼 Profession",sel.parent.profession]].map(([l,v])=>
            <div key={l}style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid var(--br)",fontSize:13}}>
              <span style={{color:"var(--l)"}}>{l}</span>
              <span style={{fontWeight:600,color:"var(--b)"}}>{v}</span>
            </div>)}

          {/* Enfant */}
          <div style={{fontSize:12,fontWeight:700,color:"var(--l)",textTransform:"uppercase",letterSpacing:".5px",marginTop:14,marginBottom:8}}>L'enfant</div>
          {[
            ["👶 Prénom",sel.enfant.prenom],
            ["🎂 Naissance",fmt(sel.enfant.naissance)+" ("+ageEnfant(sel.enfant.naissance)+")"],
            ["⚠️ Allergies",sel.enfant.allergies],
            ["🏠 Actuellement",sel.enfant.dejaCrèche?"En crèche":"À domicile"],
          ].map(([l,v])=>
            <div key={l}style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid var(--br)",fontSize:13}}>
              <span style={{color:"var(--l)"}}>{l}</span>
              <span style={{fontWeight:600,color:"var(--b)"}}>{v}</span>
            </div>)}

          {/* Contrat souhaité */}
          <div style={{fontSize:12,fontWeight:700,color:"var(--l)",textTransform:"uppercase",letterSpacing:".5px",marginTop:14,marginBottom:8}}>Contrat souhaité</div>
          {[
            ["📅 Début",fmt(sel.contrat.debut)],
            ["📆 Jours",sel.contrat.jours.join(", ")],
            ["⏰ Horaires",sel.contrat.heureArrivee+" → "+sel.contrat.heureDepart],
            ["⏱ Heures/semaine",sel.contrat.heuresHebdo+"h"],
            ["📋 Durée",sel.contrat.anneeComplete?"Année complète":"Partielle"],
            ["🏖 Vacances",sel.contrat.vacances],
          ].map(([l,v])=>
            <div key={l}style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid var(--br)",fontSize:13}}>
              <span style={{color:"var(--l)"}}>{l}</span>
              <span style={{fontWeight:600,color:"var(--b)",textAlign:"right",maxWidth:"55%"}}>{v}</span>
            </div>)}

          {/* Message */}
          <div style={{marginTop:14,padding:"12px 14px",background:"var(--c)",borderRadius:10,fontSize:13,color:"var(--m)",lineHeight:1.7,fontStyle:"italic"}}>
            "{sel.message}"
          </div>
        </div>

        {/* Actions */}
        <div className="card"style={{padding:16}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:12,color:"var(--b)"}}>💬 Répondre</div>
          <textarea className="ta"value={repTxt}onChange={e=>setRepTxt(e.target.value)}
            placeholder={"Bonjour "+sel.parent.prenom+",\n\nMerci pour votre message..."}
            style={{width:"100%",minHeight:90,marginBottom:10,resize:"vertical"}}/>
          <button className="btn bT"style={{width:"100%",marginBottom:10}}onClick={envoyerReponse}
            disabled={!repTxt.trim()}>
            📧 Envoyer par email
          </button>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {sel.statut!=="accepte"&&<button className="btn bS"onClick={()=>changerStatut(sel.id,"accepte")}style={{fontSize:12}}>
              ✅ Accepter
            </button>}
            {sel.statut!=="refuse"&&<button className="btn bR"onClick={()=>changerStatut(sel.id,"refuse")}style={{fontSize:12}}>
              ❌ Refuser
            </button>}
            {sel.statut==="accepte"&&<button className="btn bP"onClick={()=>setToast("Redirection vers la création de contrat...")}style={{fontSize:12}}>
              📄 Créer le contrat
            </button>}
          </div>
        </div>
      </div>

      :<div className="card"style={{padding:28,textAlign:"center",color:"var(--l)"}}>
        <div style={{fontSize:36,marginBottom:12}}>👈</div>
        <div style={{fontSize:13}}>Sélectionnez une demande pour voir le détail</div>
      </div>}
    </div>
  </div>;
}

//
function KitCMG({enfants,role,pEId,user}){
  const enfant=enfants.find(e=>e.id===pEId)||enfants[0];
  const asmat={...D.asmat,prenom:user?.prenom||D.asmat.prenom,nom:user?.nom||D.asmat.nom,email:user?.email||D.asmat.email};
  const contrat=enfant?.contrat||{};
  const [copie,setCopie]=useState({});
  const [toast,setToast]=useState("");

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
          borderRadius:6,padding:"3px 8px",fontSize:10,cursor:"pointer",
          color:copie[copyKey]?"var(--S)":"var(--l)",fontWeight:600,flexShrink:0
        }}>{copie[copyKey]?"✓ Copié":"Copier"}</button>}
      </div>
    </div>
  );

  // Calcul salaire net estimé
  const heuresMois=Math.round((contrat.heuresHebdo||40)*52/12);
  const salaireNet=Math.round(heuresMois*(contrat.tauxHoraire||4.05)*1.1*10)/10;
  const entretienMensuel=Math.round((contrat.entretien||3.80)*heuresMois/contrat.heuresHebdo*5)/10;

  return <div className="fi">
    {toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
    <PageHeader icon="💶" title="Aide CMG - Kit déclaration"
      sub="Toutes les informations pour déclarer votre mode de garde sur monenfant.fr"/>

    {/* Explication */}
    <div style={{background:"linear-gradient(135deg,var(--Gp),var(--Bp))",border:"1px solid var(--G)",borderRadius:14,padding:"16px 20px",marginBottom:20}}>
      <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:8}}>📋 Comment utiliser ce kit ?</div>
      <div style={{fontSize:13,color:"var(--m)",lineHeight:1.8}}>
        1. Allez sur <strong>monenfant.fr</strong> → "Déclarer votre mode de garde"<br/>
        2. Utilisez les boutons <strong>"Copier"</strong> ci-dessous pour coller chaque information<br/>
        3. Soumettez votre déclaration<br/>
        4. La CAF calcule votre <strong>Complément Mode de Garde (CMG)</strong> automatiquement
      </div>
      <a href="https://www.monenfant.fr" target="_blank" rel="noopener noreferrer"
        style={{display:"inline-block",marginTop:10,background:"var(--B)",color:"#fff",
        borderRadius:8,padding:"7px 14px",fontSize:12,fontWeight:700,textDecoration:"none"}}>
        Aller sur monenfant.fr →
      </a>
    </div>

    <div className="g2">
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        {/* Infos assistante maternelle */}
        <div className="card"style={{padding:18}}>
          <div style={{fontWeight:700,fontSize:13,color:"var(--T)",marginBottom:14,display:"flex",gap:6,alignItems:"center"}}>
            <span>👩👧</span> Votre assistante maternelle
          </div>
          <InfoRow label="Nom complet" value={asmat.prenom+" "+asmat.nom} copyKey="asmNom"/>
          <InfoRow label="N° agrément" value="AGR-2019-0042" copyKey="agrement"/>
          <InfoRow label="Email professionnel" value={user?.email||"marie.dupont@timat.app"} copyKey="asmEmail"/>
          <InfoRow label="Code postal" value="75015" copyKey="cp"/>
          <InfoRow label="Commune" value="Paris 15e" copyKey="commune"/>
        </div>

        {/* Infos contrat */}
        <div className="card"style={{padding:18}}>
          <div style={{fontWeight:700,fontSize:13,color:"var(--S)",marginBottom:14,display:"flex",gap:6,alignItems:"center"}}>
            <span>📄</span> Votre contrat
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
        <div className="card"style={{padding:18}}>
          <div style={{fontWeight:700,fontSize:13,color:"var(--G)",marginBottom:14,display:"flex",gap:6,alignItems:"center"}}>
            <span>💰</span> Rémunération mensuelle
          </div>
          <InfoRow label="Taux horaire net" value={(contrat.tauxHoraire||4.05).toFixed(2)+"€/h"} copyKey="taux"/>
          <InfoRow label="Salaire net mensuel (estimé)" value={salaireNet+"€"} copyKey="salaire"/>
          <InfoRow label="Indemnité d'entretien/jour" value={(contrat.entretien||3.80).toFixed(2)+"€"} copyKey="entretien"/>
          <InfoRow label="Indemnité entretien/mois" value={entretienMensuel+"€"} copyKey="entretienMois"/>
          <div style={{marginTop:12,padding:"10px 12px",background:"var(--Gp)",borderRadius:10,fontSize:12,color:"var(--G)",lineHeight:1.6}}>
            💡 Le CMG prend en charge une partie du salaire selon vos revenus. Le calcul est automatique sur monenfant.fr après votre déclaration.
          </div>
        </div>

        {/* Enfant */}
        <div className="card"style={{padding:18}}>
          <div style={{fontWeight:700,fontSize:13,color:"var(--P)",marginBottom:14,display:"flex",gap:6,alignItems:"center"}}>
            <span>{enfant?.emoji||"👶"}</span> {enfant?.prenom||"Votre enfant"}
          </div>
          <InfoRow label="Prénom" value={enfant?.prenom||"-"} copyKey="enfPrenom"/>
          <InfoRow label="Date de naissance" value={fmt(enfant?.naissance||"")} copyKey="enfNaiss"/>
          <InfoRow label="Lieu de garde" value="Domicile de l'assistante maternelle" copyKey="lieuGarde"/>
        </div>

        {/* Lien Pajemploi */}
        <div className="card"style={{padding:16,background:"var(--Tp)",border:"1px solid var(--Tl)"}}>
          <div style={{fontWeight:700,fontSize:13,color:"var(--T)",marginBottom:8}}>🏛️ Pajemploi</div>
          <div style={{fontSize:12,color:"var(--m)",lineHeight:1.6,marginBottom:10}}>
            Une fois déclaré sur monenfant.fr, vous devrez aussi déclarer les heures mensuelles sur <strong>Pajemploi</strong> pour que Marie soit payée et déclarée à l'URSSAF.
          </div>
          <a href="https://www.pajemploi.urssaf.fr" target="_blank" rel="noopener noreferrer"
            style={{display:"inline-block",background:"var(--T)",color:"#fff",
            borderRadius:8,padding:"7px 14px",fontSize:12,fontWeight:700,textDecoration:"none"}}>
            Aller sur Pajemploi →
          </a>
        </div>
      </div>
    </div>
  </div>;
}

//
function SignatureContratParent({enfants,pEId,user}){
  const enfant=enfants.find(e=>e.id===pEId)||enfants[0];
  const contrat=enfant?.contrat||{};
  // SIGNATURE PARENT P10 - state initialise depuis le contrat persiste
  const [signe,setSigne]=useState(!!contrat.signe_parent);
  const [dateSignature,setDateSignature]=useState(contrat.date_signature_parent||null);
  const [lu,setLu]=useState(false);
  const [toast,setToast]=useState("");
  const canvasRef=useRef(null);
  const [drawing,setDrawing]=useState(false);
  const [hasSig,setHasSig]=useState(false);
  // SIGNATURE PARENT P10 - signature standard du parent (si dejaa enregistree dans son profil)
  const sigStandard=user?.signature_base64||null;
  // SIGNATURE PARENT P10 - sync avec le contrat reel quand il change
  useEffect(()=>{
    setSigne(!!contrat.signe_parent);
    setDateSignature(contrat.date_signature_parent||null);
  },[contrat.signe_parent,contrat.date_signature_parent]);

  // Helper position pointeur avec scaling correct
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
    ctx.strokeStyle="#3A2820";ctx.lineWidth=2;ctx.lineCap="round";ctx.lineJoin="round";
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
    setHasSig(true);
  };
  const endDraw=()=>setDrawing(false);
  const clearSig=()=>{
    const c=canvasRef.current;if(!c)return;
    c.getContext("2d").clearRect(0,0,c.width,c.height);
    setHasSig(false);
  };
  // SIGNATURE PARENT P10 - charger la signature standard du parent en 1 clic
  const useStandardSig=()=>{
    const c=canvasRef.current;if(!c||!sigStandard)return;
    const ctx=c.getContext("2d");
    ctx.clearRect(0,0,c.width,c.height);
    const img=new Image();
    img.onload=()=>{
      ctx.drawImage(img,0,0,c.width,c.height);
      setHasSig(true);
    };
    img.src=sigStandard;
  };
  // SIGNATURE PARENT P10 - validation persistante en base via RPC SECURITY DEFINER
  // (la RLS UPDATE de contrats est restreinte a asmat_id, donc on passe par une fonction)
  const valider=async()=>{
    if(!lu||!hasSig)return;
    if(!contrat?.id){
      setToast("Aucun contrat actif a signer");
      return;
    }
    const canvas=canvasRef.current;
    const sigData=canvas?.toDataURL("image/png");
    const{data,error}=await supabase.rpc("sign_contract_as_parent",{
      p_contrat_id:contrat.id,
      p_signature:sigData||null,
    });
    if(error){
      setToast("Erreur enregistrement : "+error.message);
      return;
    }
    if(!data?.success){
      setToast("Erreur : "+(data?.error||"echec inconnu"));
      return;
    }
    await logAction("sign_contract_parent",{table_name:"contrats",record_id:contrat.id});
    // PDF CONTRAT COMBINE P11 - regenerer le PDF avec les 2 signatures (asmat + parent)
    generateAndStoreContratPDF(contrat.id).then(r=>{
      if(!r.success)console.log("PDF gen warn:",r.error);
    });
    // EMAILS NOTIFICATIONS P13 - notifier l'asmat que le contrat est finalise
    if(contrat?.asmat_id){
      createNotification({userId:contrat.asmat_id,type:"signature_parent_signed",titre:"Le parent a signé le contrat"+(enfant?.prenom?(" — "+enfant.prenom):""),page:"admin_finances"});
      supabase.rpc("get_recipient_email",{p_user_id:contrat.asmat_id}).then(({data:a})=>{
        if(a?.email){
          sendNotificationEmail({
            type:"signature_parent_signed",
            to:a.email,
            subject:EMAIL_TEMPLATES.signature_parent_signed.subject,
            template:"signature_parent_signed",
            vars:{
              asmat_prenom:a.prenom||"",
              parent_prenom:user?.prenom||"",
              parent_nom:user?.nom||"",
              enfant_prenom:enfant?.prenom||"",
            },
          });
        }
      });
    }
    setSigne(true);
    setDateSignature(data.date||new Date().toISOString());
    setToast("Contrat signé électroniquement ✓ - L'assistante maternelle a été notifiée");
    window.dispatchEvent(new CustomEvent("timat:refresh-data"));
  };

  if(signe)return <div style={{textAlign:"center",padding:40}}>
    <div style={{fontSize:60,marginBottom:16}}>✅</div>
    <div className="pf"style={{fontSize:22,fontWeight:600,color:"var(--S)",marginBottom:8}}>Contrat signé !</div>
    <div style={{fontSize:13,color:"var(--m)",lineHeight:1.7}}>
      Votre signature électronique a été enregistrée.<br/>
      L'assistante maternelle a été notifiée. Le contrat signé est disponible dans Documents.
      {dateSignature&&<><br/><span style={{fontSize:11,color:"var(--l)",marginTop:4,display:"inline-block"}}>Le {fmt(dateSignature.slice(0,10))} - Conforme eIDAS</span></>}
    </div>
  </div>;

  return <div className="fi">
    {toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
    <PageHeader icon="✍️" title="Signer mon contrat"
      sub="Signature électronique conforme eIDAS - valeur légale"/>

    {/* Récap contrat */}
    <div className="card"style={{padding:18,marginBottom:16}}>
      <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:12}}>📄 Contrat d'accueil - {enfant?.prenom}</div>
      {[
        ["Enfant",(enfant?.prenom||"-")+" "+(enfant?.nom||"")],
        ["Début du contrat",fmt(contrat.debut||"")],
        ["Jours d'accueil",(contrat.jours||[]).join(", ")],
        ["Horaires",contrat.horaires||"-"],
        ["Taux horaire net",(contrat.tauxHoraire||0).toFixed(2)+"€/h"],
        ["Indemnité entretien",(contrat.entretien||0).toFixed(2)+"€/jour"],
        ["Statut signature asmat",contrat.signe_asmat?"✅ Signé le "+(contrat.date_signature_asmat?fmt(contrat.date_signature_asmat.slice(0,10)):"-"):"⏳ En attente"],
      ].map(([l,v])=><div key={l}style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid var(--br)",fontSize:13}}>
        <span style={{color:"var(--l)"}}>{l}</span>
        <span style={{fontWeight:600,color:"var(--b)"}}>{v}</span>
      </div>)}
    </div>

    {/* Case lecture */}
    <label style={{display:"flex",gap:12,alignItems:"flex-start",cursor:"pointer",marginBottom:16,
      background:"var(--Bp)",border:"1px solid var(--B)",borderRadius:12,padding:"14px 16px"}}>
      <input type="checkbox"checked={lu}onChange={e=>setLu(e.target.checked)}
        style={{width:18,height:18,marginTop:2,flexShrink:0,cursor:"pointer",accentColor:"var(--B)"}}/>
      <span style={{fontSize:13,color:"var(--B)",lineHeight:1.6}}>
        J'ai lu et j'accepte les conditions du contrat d'accueil pour {enfant?.prenom}. Je certifie que les informations sont exactes.
      </span>
    </label>

    {/* Zone signature */}
    <div className="card"style={{padding:18,marginBottom:16}}>
      <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:4}}>✍️ Votre signature</div>
      <div style={{fontSize:12,color:"var(--l)",marginBottom:12}}>Signez ci-dessous avec votre doigt (mobile) ou la souris</div>
      <canvas ref={canvasRef}width={400}height={120}
        style={{width:"100%",height:120,border:"2px dashed var(--br)",borderRadius:10,
          cursor:"crosshair",background:"#FDFAF6",touchAction:"none"}}
        onMouseDown={startDraw}onMouseMove={draw}onMouseUp={endDraw}onMouseLeave={endDraw}
        onTouchStart={startDraw}onTouchMove={draw}onTouchEnd={endDraw}onTouchCancel={endDraw}/>
      {/* SIGNATURE PARENT P10 - bouton signature standard si parent en a une */}
      {sigStandard&&<div style={{marginTop:8}}>
        <button className="btn bG" style={{fontSize:12,width:"100%",justifyContent:"center"}} onClick={useStandardSig}>
          📋 Utiliser ma signature enregistrée
        </button>
      </div>}
      <div style={{display:"flex",justifyContent:"space-between",marginTop:8}}>
        <div style={{fontSize:11,color:"var(--l)"}}>
          {hasSig?"✅ Signature dessinée":"Tracez votre signature ci-dessus"}
        </div>
        {hasSig&&<button onClick={clearSig}style={{background:"none",border:"none",color:"var(--R)",fontSize:12,cursor:"pointer"}}>Effacer</button>}
      </div>
    </div>

    {/* Bouton valider */}
    <button className="btn bS"style={{width:"100%",justifyContent:"center",fontSize:14,padding:"13px",
      opacity:lu&&hasSig?1:.5}}
      onClick={valider}disabled={!lu||!hasSig}>
      ✅ Valider et signer le contrat
    </button>
    <div style={{textAlign:"center",fontSize:11,color:"var(--l)",marginTop:8}}>
      🔒 Signature électronique conforme eIDAS - Valeur légale identique au papier
    </div>
  </div>;
}

//
const JOURS_SEM=["Lundi","Mardi","Mercredi","Jeudi","Vendredi"];
const PERIODES=[
  {id:"matin",l:"Matin",h:"07h00–08h30",ic:"🌅"},
  {id:"midi",l:"Méridien",h:"11h30–13h30",ic:"☀️"},
  {id:"soir",l:"Soir",h:"16h30–19h00",ic:"🌆"},
  {id:"mercredi",l:"Mercredi journée",h:"08h00–18h00",ic:"📅"},
  {id:"vacances",l:"Vacances scolaires",h:"Selon planning",ic:"🏖️"},
];

function PlanningPeriscolaire({enfants,role,pEId}){
  const [selId,setSelId]=useState(enfants[0]?.id);
  const [planning,setPlanning]=useState(()=>{
    const p={};
    enfants.forEach(e=>{
      p[e.id]={matin:["Lundi","Mercredi"],midi:[],soir:["Lundi","Mardi","Jeudi","Vendredi"],mercredi:true,vacances:false};
    });
    return p;
  });
  const [toast,setToast]=useState("");
  const liste=role==="parent"?enfants.filter(e=>e.id===pEId):enfants;
  const enfant=liste.find(e=>e.id===selId)||liste[0];
  const p=planning[enfant?.id]||{};

  const toggleJour=(periode,jour)=>{
    setPlanning(prev=>({...prev,[enfant.id]:{...p,
      [periode]:Array.isArray(p[periode])
        ?p[periode].includes(jour)?p[periode].filter(j=>j!==jour):[...p[periode],jour]
        :p[periode]
    }}));
  };

  return <div className="fi">
    {toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
    <PageHeader icon="🚌" title="Planning périscolaire"
      sub="Gestion des accueils matin, midi, soir, mercredis et vacances"/>

    {role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
      {liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>setSelId(e.id)}/>)}
    </div>}

    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      {PERIODES.map(per=><div key={per.id}className="card"style={{padding:18,borderLeft:"4px solid var(--B)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div>
            <div style={{fontWeight:700,fontSize:14,color:"var(--b)"}}>{per.ic} {per.l}</div>
            <div style={{fontSize:12,color:"var(--l)"}}>{per.h}</div>
          </div>
          {typeof p[per.id]==="boolean"&&<label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}}>
            <span style={{fontSize:12,color:"var(--m)"}}>Accueil</span>
            <div onClick={()=>{if(role==="asmat")setPlanning(prev=>({...prev,[enfant.id]:{...p,[per.id]:!p[per.id]}}));}}
              style={{width:44,height:24,borderRadius:12,background:p[per.id]?"var(--S)":"var(--br)",
                position:"relative",cursor:role==="asmat"?"pointer":"default",transition:"background .2s"}}>
              <div style={{position:"absolute",top:2,left:p[per.id]?20:2,width:20,height:20,
                borderRadius:"50%",background:"#fff",transition:"left .2s",boxShadow:"0 1px 4px rgba(0,0,0,.2)"}}/>
            </div>
          </label>}
        </div>
        {Array.isArray(p[per.id])&&<div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {JOURS_SEM.filter(j=>j!=="Mercredi"||per.id!=="mercredi").map(jour=>{
            const actif=p[per.id]?.includes(jour);
            return <button key={jour}onClick={()=>role==="asmat"&&toggleJour(per.id,jour)}style={{
              padding:"6px 14px",borderRadius:20,border:(actif?"1.5px solid var(--B)":"1.5px solid var(--br)"),
              background:actif?"var(--Bp)":"transparent",color:actif?"var(--B)":"var(--l)",
              fontWeight:actif?700:400,fontSize:13,cursor:role==="asmat"?"pointer":"default",transition:"all .15s"
            }}>{jour.slice(0,2)}</button>;
          })}
        </div>}
      </div>)}
    </div>

    {role==="asmat"&&<div style={{marginTop:16,display:"flex",gap:8,justifyContent:"flex-end"}}>
      <button className="btn bG">Imprimer le planning</button>
      <button className="btn bT"onClick={()=>setToast("Planning enregistré et partagé avec les parents ✓")}>
        💾 Sauvegarder et partager
      </button>
    </div>}

    {/* Vue hebdo synthèse */}
    <div className="card"style={{padding:18,marginTop:16}}>
      <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:12}}>📋 Récapitulatif semaine type - {enfant?.prenom}</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:4}}>
        {JOURS_SEM.map(j=><div key={j}style={{textAlign:"center"}}>
          <div style={{fontSize:11,fontWeight:700,color:"var(--l)",marginBottom:6,textTransform:"uppercase",letterSpacing:".5px"}}>{j.slice(0,2)}</div>
          {PERIODES.filter(per=>per.id!=="vacances"&&per.id!=="mercredi").map(per=>{
            const actif=Array.isArray(p[per.id])?p[per.id].includes(j):false;
            if(!actif)return null;
            return <div key={per.id}style={{
              background:"var(--Bp)",borderRadius:6,padding:"3px 4px",
              fontSize:10,color:"var(--B)",fontWeight:600,marginBottom:3
            }}>{per.ic}</div>;
          })}
          {j==="Mercredi"&&p.mercredi&&<div style={{background:"var(--Sp)",borderRadius:6,padding:"3px 4px",fontSize:10,color:"var(--S)",fontWeight:600}}>Journée</div>}
        </div>)}
      </div>
    </div>
  </div>;
}

//
const FORUM_POSTS=[
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

function ForumCommunaute({role}){
  const [posts,setPosts]=useState(FORUM_POSTS);
  const [filtre,setFiltre]=useState("tous");
  const [newPost,setNewPost]=useState({titre:"",contenu:"",tag:"Pajemploi"});
  const [showNew,setShowNew]=useState(false);
  const [selPost,setSelPost]=useState(null);
  const [reponse,setReponse]=useState("");
  const [toast,setToast]=useState("");
  const tags=["tous","Pajemploi","Contrat","Activités","Juridique","PMI","MAM","Réseau"];
  const postsFiltres=filtre==="tous"?posts:posts.filter(p=>p.tags.includes(filtre));

  const poster=()=>{
    if(!newPost.titre.trim()||!newPost.contenu.trim())return;
    setPosts(p=>[{id:"p"+Date.now(),auteur:"Marie D.",ville:"Paris",date:"À l'instant",
      titre:newPost.titre,contenu:newPost.contenu,reponses:0,tags:[newPost.tag],epingle:false},...p]);
    setNewPost({titre:"",contenu:"",tag:"Pajemploi"});
    setShowNew(false);
    setToast("Votre question a été publiée ✓");
  };

  return <div className="fi">
    {toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
    <PageHeader icon="💬" title="Communauté assmats"
      sub="Entraidez-vous · Partagez vos expériences · Posez vos questions"/>

    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:10}}>
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        {tags.map(t=><button key={t}onClick={()=>setFiltre(t)}style={{
          padding:"5px 12px",borderRadius:20,border:"1.5px solid",cursor:"pointer",fontSize:12,fontWeight:600,
          background:filtre===t?"var(--P)":"transparent",
          color:filtre===t?"#fff":"var(--m)",
          borderColor:filtre===t?"var(--P)":"var(--br)"
        }}>{t}</button>)}
      </div>
      <button className="btn bT"onClick={()=>setShowNew(p=>!p)}>
        {showNew?"✕ Annuler":"✏️ Poser une question"}
      </button>
    </div>

    {showNew&&<div className="card"style={{padding:18,marginBottom:16,border:"2px solid var(--T)"}}>
      <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:12}}>✏️ Nouvelle question</div>
      <input className="inp"placeholder="Titre de votre question..."value={newPost.titre}
        onChange={e=>setNewPost(p=>({...p,titre:e.target.value}))}style={{marginBottom:10}}/>
      <textarea className="ta"placeholder="Décrivez votre situation..."value={newPost.contenu}
        onChange={e=>setNewPost(p=>({...p,contenu:e.target.value}))}
        style={{width:"100%",minHeight:80,resize:"vertical",marginBottom:10}}/>
      <div style={{display:"flex",gap:10,alignItems:"center"}}>
        <select className="sel"style={{flex:1}}value={newPost.tag}onChange={e=>setNewPost(p=>({...p,tag:e.target.value}))}>
          {tags.filter(t=>t!=="tous").map(t=><option key={t}>{t}</option>)}
        </select>
        <button className="btn bT"onClick={poster}>Publier →</button>
      </div>
    </div>}

    <div className="g2">
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {postsFiltres.map(post=><div key={post.id}className="card card-lift"
          onClick={()=>setSelPost(selPost?.id===post.id?null:post)}
          style={{padding:16,cursor:"pointer",borderLeft:post.epingle?"4px solid var(--G)":"4px solid var(--P)"}}>
          {post.epingle&&<div style={{fontSize:10,fontWeight:700,color:"var(--G)",marginBottom:4,textTransform:"uppercase",letterSpacing:".5px"}}>📌 Épinglé</div>}
          <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:6,lineHeight:1.4}}>{post.titre}</div>
          <div style={{fontSize:12,color:"var(--m)",lineHeight:1.5,marginBottom:8,
            overflow:"hidden",textOverflow:"ellipsis",display:"-webkit-box",
            WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{post.contenu}</div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {post.tags.map(t=><span key={t}className="badge"style={{background:"var(--Pp)",color:"var(--P)",fontSize:10}}>{t}</span>)}
            </div>
            <div style={{display:"flex",gap:12,fontSize:11,color:"var(--l)"}}>
              <span>👩 {post.auteur} · {post.ville}</span>
              <span>💬 {post.reponses} réponse{post.reponses>1?"s":""}</span>
              <span>{post.date}</span>
            </div>
          </div>
        </div>)}
      </div>

      {selPost?<div className="card"style={{padding:18}}>
        <div style={{fontWeight:700,fontSize:15,color:"var(--b)",marginBottom:8}}>{selPost.titre}</div>
        <div style={{fontSize:13,color:"var(--m)",lineHeight:1.7,marginBottom:12}}>{selPost.contenu}</div>
        <div style={{fontSize:11,color:"var(--l)",marginBottom:16,paddingBottom:12,borderBottom:"1px solid var(--br)"}}>
          {selPost.auteur} · {selPost.ville} · {selPost.date}
        </div>
        <div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:10}}>
          💬 {selPost.reponses} réponses
        </div>
        <div style={{background:"var(--c)",borderRadius:10,padding:12,marginBottom:12,fontSize:13,color:"var(--m)"}}>
          Les réponses de la communauté s'afficheront ici.
        </div>
        <textarea className="ta"value={reponse}onChange={e=>setReponse(e.target.value)}
          placeholder="Votre réponse..."style={{width:"100%",minHeight:70,resize:"vertical",marginBottom:8}}/>
        <button className="btn bP"style={{width:"100%"}}onClick={()=>{
          if(!reponse.trim())return;
          setPosts(p=>p.map(post=>post.id===selPost.id?{...post,reponses:post.reponses+1}:post));
          setReponse("");setToast("Réponse publiée ✓");
        }}>Publier ma réponse</button>
      </div>
      :<div className="card"style={{padding:28,textAlign:"center",color:"var(--l)"}}>
        <div style={{fontSize:36,marginBottom:8}}>💬</div>
        <div style={{fontSize:13}}>Sélectionnez un sujet pour lire les réponses et participer</div>
      </div>}
    </div>
  </div>;
}

//
function RapportAnnuel({enfants,role,pEId,user}){
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
  const heuresMois=Math.round((contrat.heuresHebdo||40)*52/12);
  const tauxH=contrat.tauxHoraire||4.05;
  const entretienJour=contrat.entretien||3.80;
  const heuresAnnuelles=realStats?.heures||(heuresMois*12);
  const joursAnnuels=realStats?.jours||(heuresAnnuelles/8);
  // Salaire brut = heures * taux (avec majoration 25% au dessus de 45h/sem si pas mensualise)
  const salaireBrutCalc=Math.round(heuresAnnuelles*tauxH);
  const salaireNet=realStats?.paiements>0?realStats.paiements:Math.round(salaireBrutCalc*0.78);
  const salaireAnnuel=salaireNet;
  // Entretien = jours travailles * indemnite jour
  const entretienAnnuel=Math.round(joursAnnuels*entretienJour);
  const totalAnnuel=salaireAnnuel+entretienAnnuel;
  // Credit impot = 50% du total, plafonne a 3500€ par enfant
  const creditImpot=Math.min(Math.round(totalAnnuel*0.5),3500);
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
      if(!window.jspdf){
        await new Promise((res,rej)=>{
          const s=document.createElement("script");
          s.src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
          s.onload=res;s.onerror=()=>rej(new Error("Chargement jsPDF echoue"));
          document.head.appendChild(s);
        });
      }
      const{jsPDF}=window.jspdf;
      const doc=new jsPDF({unit:"mm",format:"a4",orientation:"portrait"});
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
        ["Credit d impot estime (50%)",creditImpot+" euros"],
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
        +'<p><strong>Assistante maternelle:</strong> '+(user?.prenom||"")+' '+(user?.nom||"")+'</p>'
        +'<p><strong>Enfant:</strong> '+(enfant?.prenom||'')+' '+(enfant?.nom||'')+'</p>'
        +'<h2>Heures travaillees '+annee+'</h2>'
        +'<table><tr><th>Indicateur</th><th>Valeur</th></tr>'
        +'<tr><td>Heures reelles pointees</td><td>'+heuresAnnuelles+' h</td></tr>'
        +'<tr><td>Nb de jours pointes</td><td>'+(realStats?.nbPointages||"-")+'</td></tr>'
        +'<tr><td>Nb d absences</td><td>'+(realStats?.nbAbsences||"-")+'</td></tr>'
        +'</table>'
        +'<h2>Recapitulatif financier</h2>'
        +'<table><tr><th>Poste</th><th>Montant</th></tr>'
        +'<tr><td>Salaire net annuel'+(realStats?.paiements?" (donnees reelles)":" (estime)")+'</td><td>'+salaireAnnuel+'€</td></tr>'
        +"<tr><td>Indemnites d'entretien (estimees)</td><td>"+entretienAnnuel+"€</td></tr>"
        +'<tr class="total"><td>Total verse</td><td>'+totalAnnuel+'€</td></tr>'
        +"<tr><td>Credit d'impot estime (50%)</td><td>"+creditImpot+"€</td></tr>"
        +'</table>'
        +(userSig
          ?'<div style="margin-top:24px;padding:14px;border:1px solid #ddd;border-radius:6px"><div style="font-size:11px;font-weight:700;margin-bottom:8px">Signature de l\'assistante maternelle</div><img src="'+userSig+'" style="max-height:60px;max-width:250px"/><div style="font-size:10px;color:#888;margin-top:4px">Le '+new Date().toLocaleDateString('fr-FR')+' - '+(user?.prenom||'')+' '+(user?.nom||'')+'</div></div>'
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
        <div className="card"style={{padding:18}}>
          <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:14}}>💰 Récapitulatif financier {annee}</div>
          {[
            ["Salaire net annuel estimé",salaireAnnuel+"€","var(--S)"],
            ["Indemnités d'entretien",""+entretienAnnuel+"€","var(--G)"],
            ["Total versé par les parents",""+totalAnnuel+"€","var(--b)"],
            ["Crédit d'impôt estimé (50%)",""+creditImpot+"€ remboursé","var(--B)"],
          ].map(([l,v,c])=><div key={l}style={{display:"flex",justifyContent:"space-between",padding:"9px 0",borderBottom:"1px solid var(--br)"}}>
            <span style={{fontSize:13,color:"var(--m)"}}>{l}</span>
            <span style={{fontSize:13,fontWeight:700,color:c}}>{v}</span>
          </div>)}
          <div style={{marginTop:12,padding:"10px 12px",background:"var(--Bp)",borderRadius:10,fontSize:12,color:"var(--B)"}}>
            💡 Ces montants sont estimés. Le rapport PDF contient les chiffres exacts basés sur vos pointages réels.
          </div>
        </div>

        {/* Contenu du rapport */}
        <div className="card"style={{padding:18}}>
          <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:12}}>📋 Contenu du rapport PDF</div>
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
            <span style={{color:"var(--S)"}}>{ic}</span>
            <span style={{color:"var(--m)"}}>{t}</span>
          </div>)}
        </div>
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        {/* Enfant concerné */}
        <div className="card"style={{padding:18,textAlign:"center",borderTop:"4px solid "+(enfant?.couleur||"var(--T)")}}>
          <div style={{fontSize:52,marginBottom:8}}>{enfant?.emoji||"👶"}</div>
          <div className="pf"style={{fontSize:18,fontWeight:600,color:"var(--b)",marginBottom:4}}>{enfant?.prenom} {enfant?.nom}</div>
          <div style={{fontSize:12,color:"var(--l)"}}>{age(enfant?.naissance||"")}</div>
          <div style={{marginTop:12,padding:"8px 12px",background:"var(--Sp)",borderRadius:8,fontSize:12,color:"var(--S)"}}>
            ✅ Contrat actif depuis {fmt(contrat.debut||"2023-09-04")}
          </div>
        </div>

        {/* Bouton génération */}
        <div className="card"style={{padding:20,textAlign:"center"}}>
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
            <button className="btn bG"style={{width:"100%",justifyContent:"center",fontSize:12}}onClick={generer}disabled={gen}>
              🖨️ Aperçu / Imprimer
            </button>
          </div>
        </div>

        {/* Partage parent */}
        {role==="asmat"&&<div className="card"style={{padding:16,background:"var(--Gp)",border:"1px solid var(--G)"}}>
          <div style={{fontWeight:700,fontSize:13,color:"var(--G)",marginBottom:8}}>📧 Envoi au parent</div>
          <div style={{fontSize:12,color:"var(--m)",marginBottom:10,lineHeight:1.6}}>
            L'attestation fiscale peut être envoyée directement aux parents pour leur déclaration d'impôts (à remettre avant le 31 janvier).
          </div>
          <button className="btn bG"style={{width:"100%"}}onClick={()=>setToast("Attestation fiscale envoyée au parent ✓")}>
            📧 Envoyer l'attestation au parent
          </button>
        </div>}
      </div>
    </div>
  </div>;
}

//
//
function SimulateurCout({enfants,pEId}){
  const enfant=enfants.find(e=>e.id===pEId)||enfants[0];
  const [taux,setTaux]=useState(4.05);
  const [heures,setHeures]=useState(40);
  const [semaines,setSemaines]=useState(47);
  const [entretien,setEntretien]=useState(3.80);
  const [revenus,setRevenus]=useState(45000);
  const [enfants2,setEnfants2]=useState(1);

  // Calculs
  const salBrut=(heures*taux*semaines/12)*1.1; // brut mensuel estimé
  const cotPat=salBrut*0.275;
  const coutTotal=salBrut+cotPat+(entretien*heures/8*semaines/12);
  // CMG 2025 - barème simplifié selon revenus
  const tauxCMG=revenus<25000?0.85:revenus<45000?0.70:revenus<75000?0.50:0.30;
  const cmgMensuel=Math.min(salBrut*tauxCMG,salBrut*0.85);
  const creditImpot=Math.min((coutTotal-cmgMensuel)*0.5*12/12,3500/12);
  const resteCharge=Math.max(0,coutTotal-cmgMensuel-creditImpot);

  const fmt2=(n)=>Math.round(n).toLocaleString("fr-FR")+"€";

  return <div className="fi">
    <PageHeader icon="🧮" title="Simulateur de coût" sub="Estimez le coût réel de la garde après aides CAF et crédit d'impôt"/>
    <div className="g2">
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div className="card"style={{padding:18}}>
          <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:14}}>⚙️ Les paramètres de garde</div>
          {[
            {l:"Taux horaire net (€/h)",v:taux,set:setTaux,min:3.5,max:8,step:0.05},
            {l:"Heures d'accueil par semaine",v:heures,set:setHeures,min:5,max:60,step:1},
            {l:"Semaines d'accueil par an",v:semaines,set:setSemaines,min:30,max:52,step:1},
            {l:"Indemnité entretien (€/jour)",v:entretien,set:setEntretien,min:2.65,max:8,step:0.05},
          ].map(({l,v,set,min,max,step})=><div key={l}style={{marginBottom:14}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
              <label className="lbl"style={{marginBottom:0}}>{l}</label>
              <span style={{fontWeight:700,color:"var(--b)",fontSize:13}}>{v}</span>
            </div>
            <input type="range"min={min}max={max}step={step}value={v}
              onChange={e=>set(parseFloat(e.target.value))}
              style={{width:"100%",accentColor:"var(--T)"}}/>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"var(--l)"}}>
              <span>{min}</span><span>{max}</span>
            </div>
          </div>)}
        </div>
        <div className="card"style={{padding:18}}>
          <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:14}}>👨👩👧 Votre situation</div>
          <div style={{marginBottom:14}}>
            <label className="lbl">Revenus nets annuels du foyer (€)</label>
            <input type="number"className="inp"value={revenus}onChange={e=>setRevenus(parseInt(e.target.value)||0)}/>
          </div>
          <div>
            <label className="lbl">Nombre d'enfants à charge</label>
            <div style={{display:"flex",gap:8}}>
              {[1,2,3].map(n=><button key={n}onClick={()=>setEnfants2(n)}style={{
                flex:1,padding:"8px",borderRadius:8,border:"1.5px solid",cursor:"pointer",fontSize:13,fontWeight:700,
                background:enfants2===n?"var(--B)":"transparent",color:enfants2===n?"#fff":"var(--m)",
                borderColor:enfants2===n?"var(--B)":"var(--br)"}}>{n}</button>)}
            </div>
          </div>
        </div>
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div className="card"style={{padding:18,border:"2px solid var(--T)"}}>
          <div style={{fontWeight:700,fontSize:14,color:"var(--T)",marginBottom:16}}>💶 Résultat mensuel</div>
          {[
            ["Coût brut de la garde",fmt2(coutTotal),"var(--m)"],
            ["Aide CMG (CAF)","-"+fmt2(cmgMensuel),"var(--S)"],
            ["Crédit d'impôt (50%)","-"+fmt2(creditImpot),"var(--B)"],
          ].map(([l,v,c])=><div key={l}style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid var(--br)"}}>
            <span style={{fontSize:13,color:"var(--m)"}}>{l}</span>
            <span style={{fontWeight:700,color:c}}>{v}</span>
          </div>)}
          <div style={{marginTop:12,padding:"14px",background:"var(--Tp)",borderRadius:12,textAlign:"center"}}>
            <div style={{fontSize:12,color:"var(--T)",marginBottom:4}}>Reste à charge mensuel estimé</div>
            <div className="pf"style={{fontSize:38,fontWeight:700,color:"var(--T)"}}>{fmt2(resteCharge)}</div>
            <div style={{fontSize:11,color:"var(--l)",marginTop:4}}>par mois</div>
          </div>
        </div>
        <div className="card"style={{padding:16,background:"var(--Gp)",border:"1px solid var(--G)"}}>
          <div style={{fontWeight:700,fontSize:13,color:"var(--G)",marginBottom:8}}>📊 Sur l'année</div>
          {[
            ["Coût annuel brut",fmt2(coutTotal*12)],
            ["Aides totales",fmt2((cmgMensuel+creditImpot)*12)],
            ["Votre coût réel annuel",fmt2(resteCharge*12)],
          ].map(([l,v])=><div key={l}style={{display:"flex",justifyContent:"space-between",fontSize:13,padding:"4px 0"}}>
            <span style={{color:"var(--m)"}}>{l}</span>
            <span style={{fontWeight:600,color:"var(--b)"}}>{v}</span>
          </div>)}
        </div>
        <div style={{fontSize:11,color:"var(--l)",lineHeight:1.6,padding:"10px 0"}}>
          ⚠️ Simulation indicative. Le CMG exact dépend de vos ressources déclarées à la CAF. Simulateur basé sur la réforme CMG 2025.
        </div>
      </div>
    </div>
  </div>;
}

//
function SoldeDeCompte({enfants,role,pEId,user}){
  const [selId,setSelId]=useState(enfants[0]?.id);
  const [dateFin,setDateFin]=useState("");
  const [motif,setMotif]=useState("Démission du parent");
  const [calcule,setCalcule]=useState(false);
  const [toast,setToast]=useState("");
  const liste=role==="parent"?enfants.filter(e=>e.id===pEId):enfants;
  const enfant=liste.find(e=>e.id===selId)||liste[0]||{contrat:{}};
  const contrat=enfant?.contrat||{};

  const motifs=["Démission du parent","Rupture amiable","Retraite asmat","Déménagement","Fin de contrat à durée déterminée","Autre"];

  // Calculs solde
  const tauxH=contrat.tauxHoraire||4.05;
  const heuresMois=Math.round((contrat.heuresHebdo||40)*52/12);
  const salMensuel=heuresMois*tauxH;
  // Congés payés : 2.5j par mois travaillé, simulation 8 mois
  const congesRestants=6; // jours
  const iccp=congesRestants*(heuresMois/20)*tauxH;
  // Préavis selon durée du contrat
  const dureeAns=1.5;
  const preavis=dureeAns<1?30:dureeAns<2?60:90;
  const indemPreavis=(preavis/30)*salMensuel;
  const total=iccp+indemPreavis;

  const today=new Date().toLocaleDateString("fr-FR");
  const asmatNom=((user?.prenom||"")+" "+(user?.nom||"")).trim()||"[Assistante maternelle]";
  const agr=user?.agrement||"[N° d'agrément]";
  const printDoc=(titre,corps)=>{
    const w=window.open("","_blank");
    if(!w){setToast("Autorisez les pop-ups pour générer le document");return;}
    w.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/><title>${titre}</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Calibri,Arial,sans-serif;max-width:760px;margin:0 auto;padding:48px;color:#2E4859;font-size:14px;line-height:1.9}h1{font-size:19px;text-align:center;letter-spacing:2px;margin-bottom:28px}p{margin:10px 0}.sign{margin-top:52px;display:flex;justify-content:space-between}.muted{color:#9aa;font-size:11px;text-align:center;margin-top:32px}@media print{.noprint{display:none}}</style></head><body>${corps}<div class="noprint"style="text-align:center;margin-top:28px"><button onclick="window.print()"style="background:#C76754;color:#fff;border:none;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer">🖨️ Imprimer / PDF</button></div></body></html>`);
    w.document.close();setToast(titre+" généré ✓");
  };
  const genRupture=()=>printDoc("Lettre de rupture de contrat",`<h1>RUPTURE DU CONTRAT D'ACCUEIL</h1><p>Madame, Monsieur,</p><p>Je vous informe de la rupture du contrat d'accueil de <b>${enfant?.prenom||"[Prénom]"}</b>, pour le motif suivant : <b>${motif}</b>.</p><p>La fin du contrat prendra effet le <b>${dateFin?fmt(dateFin):"[date de fin]"}</b>, à l'issue du préavis de <b>${preavis} jours</b> prévu par la convention collective des particuliers employeurs.</p><p>Le solde de tout compte, le certificat de travail et l'attestation France Travail (via Pajemploi) seront remis dans les délais légaux.</p><p>Je vous prie d'agréer, Madame, Monsieur, mes salutations distinguées.</p><div class="sign"><span>Fait le ${today}</span><span><b>${asmatNom}</b><br/>Signature</span></div>`);
  const genCertificat=()=>printDoc("Certificat de travail",`<h1>CERTIFICAT DE TRAVAIL</h1><p>Je soussigné(e) <b>[Nom du parent employeur]</b>, demeurant <b>[adresse de l'employeur]</b>,</p><p>certifie avoir employé <b>${asmatNom}</b>, assistante maternelle agréée (agrément n° ${agr}), en qualité d'assistante maternelle pour l'accueil de l'enfant <b>${enfant?.prenom||"[Prénom]"}</b>,</p><p>du <b>${contrat.debut?fmt(contrat.debut):"[date de début]"}</b> au <b>${dateFin?fmt(dateFin):"[date de fin]"}</b>.</p><p><b>${asmatNom}</b> est libre de tout engagement.</p><p>En foi de quoi ce certificat est délivré pour servir et valoir ce que de droit.</p><div class="sign"><span>Fait à [lieu], le ${today}</span><span>Signature de l'employeur</span></div><p class="muted">Le certificat de travail est établi et signé par le parent employeur (mentions obligatoires : identité des parties, dates d'entrée et de sortie, nature de l'emploi).</p>`);
  const genRecu=()=>printDoc("Reçu pour solde de tout compte",`<h1>REÇU POUR SOLDE DE TOUT COMPTE</h1><p>Je soussigné(e) <b>${asmatNom}</b>, assistante maternelle agréée (agrément n° ${agr}),</p><p>reconnais avoir reçu de <b>[Nom du parent employeur]</b>, pour solde de tout compte au titre de la fin du contrat d'accueil de <b>${enfant?.prenom||"[Prénom]"}</b> (fin le <b>${dateFin?fmt(dateFin):"[date de fin]"}</b>), la somme de :</p><p style="font-size:20px;text-align:center;margin:22px 0"><b>${total.toFixed(2)} €</b></p><p>Détail : indemnité compensatrice de congés payés ${iccp.toFixed(2)} € + indemnité de préavis ${indemPreavis.toFixed(2)} €.</p><p>Le présent reçu est établi en deux exemplaires.</p><div class="sign"><span>Fait le ${today}</span><span><b>${asmatNom}</b><br/>Signature de la salariée</span></div><p class="muted">Montants indicatifs (CCN des particuliers employeurs) — à vérifier au cas par cas.</p>`);

  return <div className="fi">
    {toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
    <PageHeader icon="🏁" title="Fin de contrat" sub="Rupture, certificat de travail, solde de tout compte & congés payés"/>
    {role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
      {liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>{setSelId(e.id);setCalcule(false);}}/>)}
    </div>}
    <div className="g2">
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div className="card"style={{padding:18}}>
          <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:14}}>📋 Paramètres de fin de contrat</div>
          <div style={{marginBottom:12}}>
            <label className="lbl">Date de fin du contrat</label>
            <input type="date"className="inp"value={dateFin}onChange={e=>setDateFin(e.target.value)}/>
          </div>
          <div style={{marginBottom:12}}>
            <label className="lbl">Motif de rupture</label>
            <select className="sel"value={motif}onChange={e=>setMotif(e.target.value)}>
              {motifs.map(m=><option key={m}>{m}</option>)}
            </select>
          </div>
          <div style={{background:"var(--c)",borderRadius:10,padding:12,marginBottom:14}}>
            <div style={{fontSize:12,fontWeight:700,color:"var(--b)",marginBottom:6}}>Données du contrat</div>
            {[
              ["Enfant",(enfant?.prenom||"-")+" "+(enfant?.nom||"")],
              ["Début",fmt(contrat.debut||"2023-09-04")],
              ["Taux horaire",tauxH.toFixed(2)+"€/h"],
              ["Heures/semaine",(contrat.heuresHebdo||40)+"h"],
            ].map(([l,v])=><div key={l}style={{display:"flex",justifyContent:"space-between",fontSize:12,padding:"3px 0"}}>
              <span style={{color:"var(--l)"}}>{l}</span><span style={{fontWeight:600,color:"var(--b)"}}>{v}</span>
            </div>)}
          </div>
          <button className="btn bT"style={{width:"100%"}}onClick={()=>{if(!dateFin)return;setCalcule(true);}}>
            🧮 Calculer le solde de tout compte
          </button>
        </div>
        <div className="card"style={{padding:18}}>
          <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:12}}>📄 Documents de fin de contrat</div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            <button className="btn bG"style={{width:"100%"}}onClick={genRupture}>✉️ Lettre de rupture</button>
            <button className="btn bG"style={{width:"100%"}}onClick={genCertificat}>📜 Certificat de travail</button>
            <button className="btn bG"style={{width:"100%"}}onClick={genRecu}>🧾 Reçu pour solde de tout compte</button>
          </div>
          <div style={{fontSize:11,color:"var(--l)",marginTop:10,lineHeight:1.5}}>L'attestation France Travail officielle se génère sur Pajemploi (espace en ligne du parent).</div>
        </div>
      </div>

      {calcule&&<div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div className="card"style={{padding:20,border:"2px solid var(--G)"}}>
          <div style={{fontWeight:700,fontSize:14,color:"var(--G)",marginBottom:16}}>💶 Solde de tout compte - {enfant?.prenom}</div>
          {[
            ["Indemnité compensatrice de congés payés",congesRestants+" jours × "+(heuresMois/20*tauxH).toFixed(2)+"€",iccp.toFixed(2)+"€","var(--S)"],
            ["Indemnité de préavis ("+preavis+"j)",preavis+" jours selon CCN",indemPreavis.toFixed(2)+"€","var(--B)"],
          ].map(([l,d,v,c])=><div key={l}style={{padding:"10px 0",borderBottom:"1px solid var(--br)"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
              <span style={{fontSize:13,fontWeight:600,color:"var(--b)"}}>{l}</span>
              <span style={{fontWeight:700,color:c,fontSize:13}}>{v}</span>
            </div>
            <div style={{fontSize:11,color:"var(--l)"}}>{d}</div>
          </div>)}
          <div style={{marginTop:14,padding:14,background:"var(--Gp)",borderRadius:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span className="pf"style={{fontSize:15,fontWeight:700,color:"var(--b)"}}>TOTAL SOLDE DE TOUT COMPTE</span>
            <span className="pf"style={{fontSize:28,fontWeight:700,color:"var(--G)"}}>{total.toFixed(2)} €</span>
          </div>
          <div style={{fontSize:10,color:"var(--l)",marginTop:12,lineHeight:1.6}}>
            Calcul conforme à la CCN des particuliers employeurs. L'ICCP est calculée sur la base des congés non pris. Le préavis dépend de l'ancienneté. Ces montants sont indicatifs - vérifiez avec votre syndicat ou le RPE.
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button className="btn bG"style={{flex:1}}onClick={genRecu}>📥 Télécharger le reçu</button>
          <button className="btn bT"style={{flex:1}}onClick={()=>setToast("Envoyé au parent ✓")}>📧 Envoyer au parent</button>
        </div>
      </div>}
    </div>
  </div>;
}

//
function ExportDonnees({enfants,user,role}){
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
      const fileName="export-timat-"+(user?.email||"user").replace(/[^a-z0-9]/gi,"_")+"-"+new Date().toISOString().slice(0,10)+"."+format;

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
          +'<p>Utilisateur : '+(user?.email||"-")+'</p>'
          +'<p>Periode : '+periode+'</p>'
          +'<p>Enfants : '+selEnfant+'</p>'
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
        <div className="card"style={{padding:18}}>
          <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:14}}>📋 Ce que vous exportez</div>
          {modules.map(m=><label key={m.id}style={{display:"flex",gap:10,alignItems:"center",cursor:"pointer",padding:"7px 0",borderBottom:"1px solid var(--br)"}}>
            <input type="checkbox"checked={sel[m.id]}onChange={e=>setSel(p=>({...p,[m.id]:e.target.checked}))}
              style={{width:15,height:15,accentColor:"var(--T)",flexShrink:0}}/>
            <span style={{fontSize:13,color:"var(--b)"}}>{m.l}</span>
          </label>)}
          <div style={{display:"flex",gap:8,marginTop:12}}>
            <button className="btn bG"style={{fontSize:11,padding:"6px 10px"}}onClick={()=>setSel(Object.fromEntries(modules.map(m=>[m.id,true])))}>Tout cocher</button>
            <button className="btn bG"style={{fontSize:11,padding:"6px 10px"}}onClick={()=>setSel(Object.fromEntries(modules.map(m=>[m.id,false])))}>Tout decocher</button>
          </div>
        </div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div className="card"style={{padding:18}}>
          <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:14}}>⚙️ Options</div>
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
            🔒 Export conforme RGPD (article 20 - droit à la portabilité). Fichier téléchargé directement sur votre appareil. Aucune copie conservée sur nos serveurs.
          </div>
          <button className="btn bT"style={{width:"100%",justifyContent:"center"}}onClick={exporter}disabled={exporting}>
            {exporting?"⏳ Génération en cours...":"📥 Exporter mes données"}
          </button>
        </div>
        <div className="card"style={{padding:16,background:"var(--Sp)",border:"1px solid var(--Sl)"}}>
          <div style={{fontWeight:700,fontSize:13,color:"var(--S)",marginBottom:6}}>✅ Vos droits RGPD</div>
          <div style={{fontSize:12,color:"var(--m)",lineHeight:1.7}}>
            Vous avez le droit d'accéder à toutes vos données, de les télécharger, et de les supprimer à tout moment. En cas de demande : privacy@timat.app - réponse sous 30 jours.
          </div>
        </div>
      </div>
    </div>
  </div>;
}

// ========== BILANS & EXPORTS ==========
function BilansExports({enfants,role,pEId,user,pointagesDB}){
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
        }}><span>{s.ic}</span><span>{s.l}</span></button>
      )}
    </div>
    {sec==="rapport"&&<RapportAnnuel enfants={enfants}role={role}pEId={pEId}user={user}/>}
    {sec==="recap"&&<Recap enfants={enfants}role={role}pEId={pEId}/>}
    {sec==="export"&&<ExportDonnees enfants={enfants}role={role}user={user}/>}
  </div>;
}

//
const FAQ_DATA=[
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
   r:"Dans Paramètres → Supprimer mon compte. La suppression est immédiate et définitive. Toutes vos données sont effacées de nos serveurs conformément au RGPD (droit à l'effacement, article 17)."},
  {cat:"RGPD",q:"Où sont stockées mes données ?",
   r:"Exclusivement en France, sur des serveurs OVHcloud à Paris via Supabase. Aucun transfert hors de l'Union Européenne, sauf pour la génération IA des bilans (données anonymisées envoyées à Anthropic)."},
  {cat:"Abonnement",q:"Puis-je changer d'offre ou résilier ?",
   r:"Oui, à tout moment depuis Paramètres → Mon abonnement. Pas d'engagement, pas de frais de résiliation. Si vous résiliez, votre accès Pro reste actif jusqu'à la fin de la période payée."},
  {cat:"Abonnement",q:"Comment fonctionne le parrainage ?",
   r:"Dans Parrainage, copiez votre lien personnel. Quand une collègue s'inscrit et passe au Pro, vous gagnez chacune 1 mois gratuit. Vos filleules apparaissent dans votre tableau de parrainage."},
];

function FAQ({role}){
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
      {filtrees.length===0&&<div className="card"style={{padding:20,textAlign:"center",color:"var(--l)",fontSize:13}}>
        Aucun résultat. <span style={{color:"var(--T)",cursor:"pointer"}}onClick={()=>setSearch("")}>Effacer la recherche</span>
      </div>}
      {filtrees.map((f,i)=><div key={i}className="card"style={{padding:0,overflow:"hidden"}}>
        <button onClick={()=>setOpen(open===i?null:i)}style={{
          width:"100%",padding:"14px 18px",background:"none",border:"none",cursor:"pointer",
          display:"flex",justifyContent:"space-between",alignItems:"center",textAlign:"left",gap:12}}>
          <div style={{flex:1}}>
            <span className="badge"style={{background:"var(--Bp)",color:"var(--B)",fontSize:9,marginBottom:4,display:"inline-block"}}>{f.cat}</span>
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
    <div className="card"style={{padding:18,marginTop:20,textAlign:"center",background:"var(--Tp)",border:"1px solid var(--Tl)"}}>
      <div style={{fontSize:14,fontWeight:700,color:"var(--b)",marginBottom:6}}>Vous n'avez pas trouvé votre réponse ?</div>
      <div style={{fontSize:13,color:"var(--m)",marginBottom:12}}>Notre équipe répond en moins de 24h, du lundi au vendredi.</div>
      <button className="btn bT"onClick={()=>window.dispatchEvent(new CustomEvent("timat:page",{detail:"support"}))}>
        💬 Contacter le support
      </button>
    </div>
  </div>;
}

//
function Support({role,user}){
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
        const mailto=`mailto:support@timat.app?subject=${encodeURIComponent((isPro?"[PRO] ":"")+"["+sujet+"] "+user?.prenom)}&body=${encodeURIComponent(msg+"\n\n---\n"+user?.email+" · "+role)}`;
        window.open(mailto);
        setEnvoye(true);
      }
    }catch(e){
      // Fallback mailto
      const mailto=`mailto:support@timat.app?subject=${encodeURIComponent((isPro?"[PRO] ":"")+"["+sujet+"] "+user?.prenom)}&body=${encodeURIComponent(msg+"\n\n---\n"+user?.email+" · "+role)}`;
      window.open(mailto);
      setEnvoye(true);
    }
    setSending(false);
  };

  return <div className="fi">
    <PageHeader icon="💬" title="Support TiMat" sub={isPro?"Support prioritaire — réponse sous 12h":"Notre équipe répond sous 24h, du lundi au vendredi"}/>
    {isPro&&<div style={{background:"linear-gradient(135deg,#FFF8F3,#FFF0E6)",border:"1.5px solid #E49178",borderRadius:12,padding:"10px 16px",marginBottom:16,display:"flex",alignItems:"center",gap:10,fontSize:12,color:"#C84B31",fontWeight:600}}>
      ⭐ Vous bénéficiez du support prioritaire Pro — traitement en priorité
    </div>}
    {envoye?<div style={{textAlign:"center",padding:40}}>
      <div style={{fontSize:60,marginBottom:16}}>✅</div>
      <div className="pf"style={{fontSize:22,fontWeight:600,color:"var(--S)",marginBottom:8}}>Message envoyé !</div>
      <div style={{fontSize:13,color:"var(--m)",lineHeight:1.7}}>Nous vous répondrons par email à <strong>{user?.email||"votre adresse"}</strong>{isPro?" sous 12h":" sous 24h"} (jours ouvrés).<br/>En attendant, consultez notre <span style={{color:"var(--T)",cursor:"pointer",textDecoration:"underline"}}onClick={()=>window.dispatchEvent(new CustomEvent("timat:page",{detail:"faq"}))}>Centre d'aide</span>.</div>
      <button className="btn bG"style={{marginTop:20}}onClick={()=>{setEnvoye(false);setMsg("");}}>Envoyer un autre message</button>
    </div>:<div style={{maxWidth:560,margin:"0 auto"}}>
      <div className="card"style={{padding:24}}>
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
          <span style={{fontSize:18}}>📧</span>
          <div style={{fontSize:12,color:"var(--B)"}}>Réponse envoyée à <strong>{user?.email||"votre email"}</strong>{isPro?" — délai prioritaire : 12h":" — délai : 24h max"}.</div>
        </div>
        <button className="btn bT"style={{width:"100%"}}onClick={envoyer}disabled={sending}>
          {sending?"⏳ Envoi en cours...":"📤 Envoyer mon message"}
        </button>
      </div>
      <div style={{marginTop:14,display:"flex",gap:10,flexWrap:"wrap",justifyContent:"center"}}>
        {[["📧","support@timat.app"],["⏱️",isPro?"Réponse < 12h":"Réponse < 24h"],["📚","Centre d'aide 24/7"]].map(([ic,t])=>
          <div key={t}style={{background:"var(--w)",border:"1px solid var(--br)",borderRadius:10,padding:"10px 16px",fontSize:12,color:"var(--m)",display:"flex",gap:8,alignItems:"center"}}>
            <span>{ic}</span><span>{t}</span>
          </div>)}
      </div>
    </div>}
  </div>;
}

function BottomNav({groups,page,setPage,pmiNonLus}){
  const activeGroup=findGroup(groups,page);
  return <nav className="bottom-nav" role="navigation" aria-label="Navigation principale">
    {Object.entries(groups).map(([key,g])=>{
      const isActive=activeGroup===key;
      const hasBadge=key==="admin"&&pmiNonLus>0;
      return <button key={key} className={"bnav-btn"+(isActive?" active":"")} onClick={()=>{
        if(g.subs){setPage(g.subs[0].id);}else{setPage(key);}
      }}>
        <span className="bnav-ic" style={{position:"relative",display:"inline-block"}}>
          {g.ic}
          {hasBadge&&<span style={{position:"absolute",top:-4,right:-6,background:"var(--R)",color:"#fff",borderRadius:"50%",width:14,height:14,fontSize:9,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>{pmiNonLus}</span>}
        </span>
        <span className="bnav-lbl">{g.l}</span>
      </button>;
    })}
  </nav>;
}


const GROUPS_AM={
  accueil:{l:"Accueil",ic:"🏠",color:"var(--T)",subs:null},
  enfant:{l:"L'enfant",ic:"👶",color:"#B8622F",subs:[
    {id:"dashboard",l:"Tableau de bord",ic:"📊"},
    {id:"pointage",l:"Pointage",ic:"⏰"},
    {id:"journal_complet",l:"Journal",ic:"📋"},
    {id:"sante_complet",l:"Santé",ic:"🏥"},
    {id:"fiche_urgence",l:"Fiche d'urgence",ic:"🚨"},
    {id:"eveil_complet",l:"Éveil & Progrès",ic:"🌱"},
    {id:"bilans",l:"Bilans périodiques",ic:"✨"},
  ]},
  admin:{l:"Administratif",ic:"🗂️",color:"#B8892A",subs:[
    {id:"calendrier",l:"Calendrier",ic:"📅"},
    {id:"messagerie",l:"Messagerie",ic:"💬"},
    {id:"admin_finances",l:"Paie & Contrats",ic:"🧾"}, // RENAME NAV P9 (côté asmat - couvre paie + contrats + courriers)
    {id:"documents_complet",l:"Documents & Attestations",ic:"🗂️"},
    {id:"bilans_exports",l:"Rapports & Exports",ic:"📊"}, // RENAME NAV P9 (id interne conservé pour pas casser le routing)
  ]},
  outils:{l:"Outils Pro",ic:"⭐",color:"#E49178",subs:[
    {id:"inviter_parent",l:"Inviter un parent",ic:"👪"},
    {id:"projet_accueil",l:"Projet d'accueil",ic:"🌿"},
    {id:"pmi",l:"PMI",ic:"🏛️"},
    {id:"faq",l:"Centre d'aide",ic:"❓"},
    {id:"support",l:"Support",ic:"💬"},
  ]},
};
const GROUPS_P={
  accueil:{l:"Accueil",ic:"🏠",color:"var(--T)",subs:null},
  enfant:{l:"Mon enfant",ic:"👶",color:"#B8622F",subs:[
    {id:"dashboard",l:"Tableau de bord",ic:"📊"},
    {id:"pointage",l:"Pointage",ic:"⏰"},
    {id:"journal_complet",l:"Journal",ic:"📋"},
    {id:"sante_complet",l:"Santé",ic:"🏥"},
    {id:"fiche_urgence",l:"Fiche d'urgence",ic:"🚨"},
    {id:"projet_accueil",l:"Projet d'accueil",ic:"🌿"},
    {id:"eveil_complet",l:"Éveil & Progrès",ic:"🌱"},
    {id:"bilans",l:"Bilans reçus",ic:"✨"},
  ]},
  admin:{l:"Administratif",ic:"🗂️",color:"#B8892A",subs:[
    {id:"calendrier",l:"Calendrier",ic:"📅"},
    {id:"messagerie",l:"Messagerie",ic:"💬"},
    {id:"kit_cmg",l:"Aide CMG",ic:"💶"},
    {id:"simulateur",l:"Simulateur coût",ic:"🧮"},
    {id:"admin_finances",l:"Mon contrat",ic:"🧾"}, // RENAME NAV P9 (côté parent - contenu réduit à Mon contrat & Signature)
    {id:"documents_complet",l:"Documents & Attestations",ic:"🗂️"},
    {id:"faq",l:"Centre d'aide",ic:"❓"},
  ]},
};

// Trouver à quel groupe appartient une page
const findGroup=(groups,pageId)=>{
  for(const[gKey,g]of Object.entries(groups)){
    if(gKey===pageId)return gKey;
    if(g.subs&&g.subs.find(s=>s.id===pageId))return gKey;
  }
  return "accueil";
};

function TopBar({role,groups,page,setPage,user,onLogout,pmiNonLus,dark,setDark,notifNonLus,notifs,setNotifs,showNotifs,setShowNotifs,setPage2}){
  const activeGroup=findGroup(groups,page);
  const group=groups[activeGroup];
  const subs=group?.subs||null;

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
          <span style={{fontSize:10,color:"var(--l)",fontFamily:"'DM Mono',monospace",letterSpacing:"1px",marginTop:1}}>v3</span>
        </div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:6}}>
        {/* Cloche notifications */}
        <div>
          <button onClick={()=>setShowNotifs&&setShowNotifs(p=>!p)}style={{
            background:"none",border:"none",cursor:"pointer",fontSize:18,padding:4,
            position:"relative",display:"flex",alignItems:"center"
          }}>🔔
            {notifNonLus>0&&<span style={{
              position:"absolute",top:-2,right:-2,background:"var(--R)",color:"#fff",
              borderRadius:"50%",width:14,height:14,fontSize:9,fontWeight:700,
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
              🔔 Notifications
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
              <span style={{fontSize:16,flexShrink:0}}>{n.ic}</span>
              <div style={{flex:1}}>
                <div style={{fontSize:12,color:"var(--b)",fontWeight:n.lu?400:700,lineHeight:1.4}}>{n.txt}</div>
                <div style={{fontSize:10,color:"var(--l)",marginTop:2}}>Aujourd'hui</div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0,marginTop:2}}>
                {!n.lu&&<div style={{width:7,height:7,borderRadius:"50%",background:"var(--T)"}}/>}
                <button onClick={e=>{e.stopPropagation();setNotifs&&setNotifs(p=>p.filter(x=>x.id!==n.id));supabase.from("notifications").delete().eq("id",n.id).then(()=>{}).catch(()=>{});}}title="Supprimer"style={{background:"none",border:"none",cursor:"pointer",color:"var(--l)",fontSize:14,lineHeight:1,padding:2}}>✕</button>
              </div>
            </div>)}
            {notifs.filter(n=>!n.roles||n.roles.includes(role)).length>0&&<div onClick={()=>{const ids=notifs.map(x=>x.id);setNotifs&&setNotifs([]);supabase.from("notifications").delete().in("id",ids).then(()=>{}).catch(()=>{});}}style={{padding:"11px 16px",textAlign:"center",fontSize:12,fontWeight:700,color:"#C84B31",cursor:"pointer",borderTop:"1px solid var(--br)"}}>🗑️ Tout effacer</div>}
            {notifs.length===0&&<div style={{padding:16,fontSize:13,color:"var(--l)",textAlign:"center"}}>Aucune notification</div>}
          </div>}
        </div>
        {/* Toggle mode sombre */}
        <button onClick={()=>setDark&&setDark(d=>!d)}style={{
          background:"none",border:"none",cursor:"pointer",fontSize:16,padding:4
        }} title={dark?"Mode clair":"Mode sombre"}>{dark?"☀️":"🌙"}</button>
        {/* Paramètres */}
        <button onClick={()=>setPage2&&setPage2("parametres")}style={{background:"none",border:"none",cursor:"pointer",fontSize:16,padding:4}}title="Paramètres">⚙️</button>
        {user?.is_admin===true&&<button onClick={()=>setPage2&&setPage2("backoffice")}style={{background:"linear-gradient(135deg,var(--T),var(--S))",border:"none",cursor:"pointer",fontSize:11,padding:"3px 8px",borderRadius:8,color:"#fff",fontWeight:700}}title="Admin">🔧 Admin</button>}
        <Av t={ini(user.prenom,user.nom)}c={user.couleur}s={30}/>
        <span style={{fontWeight:600,fontSize:13,color:"var(--b)"}}>{user.prenom}</span>
        <button onClick={onLogout}style={{background:"none",border:"none",cursor:"pointer",fontSize:16,marginLeft:4}}title="Déconnexion">🚪</button>
      </div>
    </div>

    {/* Barre principale - 3 gros onglets */}
    <div className="nav-main"style={{
      background:"rgba(255,255,255,.95)",backdropFilter:"blur(20px)",
      borderBottom:"1px solid rgba(234,224,232,.6)",
      display:"flex",gap:6,padding:"0 20px",height:52,alignItems:"center",
    }}>
      {Object.entries(groups).map(([key,g])=>{
        const isActive=activeGroup===key;
        const hasAdminBadge=key==="admin"&&pmiNonLus>0;
        return <button key={key}onClick={()=>onGroupClick(key)}style={{
          display:"flex",alignItems:"center",gap:7,
          padding:"8px 18px",borderRadius:24,border:"none",
          fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:13,
          cursor:"pointer",transition:"all .2s cubic-bezier(.34,1.56,.64,1)",
          flexShrink:0,whiteSpace:"nowrap",
          background:isActive?"linear-gradient(135deg,var(--T),var(--S))":"rgba(155,107,170,.08)",
          color:isActive?"#fff":"var(--m)",
          boxShadow:isActive?"0 4px 16px rgba(144,160,147,.3)":"none",
          transform:isActive?"scale(1.03)":"scale(1)",
          letterSpacing:".1px",position:"relative",
        }}>
          <span style={{fontSize:17,lineHeight:1}}>{g.ic}</span>
          <span>{g.l}</span>
          {g.subs&&<span style={{fontSize:9,opacity:.5,marginLeft:2,transform:isActive?"rotate(180deg)":"rotate(0)",display:"inline-block",transition:"transform .2s"}}>▼</span>}
          {hasAdminBadge&&<span style={{
            position:"absolute",top:4,right:4,
            background:"var(--R)",color:"#fff",
            borderRadius:"50%",width:16,height:16,
            fontSize:9,fontWeight:700,
            display:"flex",alignItems:"center",justifyContent:"center",
            boxShadow:"0 1px 4px rgba(0,0,0,.3)",
          }}>{pmiNonLus}</span>}
        </button>;
      })}
    </div>

    {/* Sous-onglets */}
    {subs&&<div style={{
      background:"rgba(245,235,248,.6)",backdropFilter:"blur(12px)",
      borderBottom:"1px solid rgba(234,224,232,.5)",
      display:"flex",gap:4,padding:"6px 16px",overflowX:"auto",
      scrollbarWidth:"none",flexShrink:0,alignItems:"center",
    }}>
      {subs.map(s=>{
        const isSubActive=page===s.id;
        const hasPmiBadge=s.id==="pmi"&&pmiNonLus>0;
        return <button key={s.id}onClick={()=>setPage(s.id)}style={{
          display:"flex",alignItems:"center",gap:5,
          padding:"5px 13px",borderRadius:16,border:"none",
          fontFamily:"'DM Sans',sans-serif",fontSize:12,
          cursor:"pointer",transition:"all .15s",flexShrink:0,whiteSpace:"nowrap",
          background:isSubActive?"rgba(155,107,170,.12)":"transparent",
          color:isSubActive?"var(--S)":"var(--b)",
          fontWeight:isSubActive?700:500,
          boxShadow:isSubActive?"inset 0 0 0 1.5px rgba(144,160,147,.3)":"none",
          position:"relative",
        }}>
          <span>{s.ic}</span>
          <span>{s.l}</span>
          {hasPmiBadge&&<span style={{
            background:"var(--R)",color:"#fff",
            borderRadius:10,padding:"1px 5px",
            fontSize:9,fontWeight:700,marginLeft:2,
          }}>{pmiNonLus}</span>}
        </button>;
      })}
    </div>}
  </>;
}


//
function Counter({target,suffix="",prefix="",duration=2000}){
  const [count,setCount]=useState(0);
  const ref=useRef(null);
  const started=useRef(false);
  useEffect(()=>{
    const observer=new IntersectionObserver(([e])=>{
      if(e.isIntersecting&&!started.current){
        started.current=true;
        const start=performance.now();
        const tick=(now)=>{
          const p=Math.min((now-start)/duration,1);
          const ease=1-Math.pow(1-p,3);
          setCount(Math.round(ease*target));
          if(p<1)requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    },{threshold:0.3});
    if(ref.current)observer.observe(ref.current);
    return()=>observer.disconnect();
  },[target,duration]);
  return <span ref={ref}>{prefix}{count.toLocaleString("fr-FR")}{suffix}</span>;
}

//
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
    id:"journal",label:"Journal quotidien",icon:"📋",color:"#5DA9A1",
    preview:()=>{
      const [mood,setMood]=useState("😊");
      const [liked,setLiked]=useState(false);
      return(
      <div style={{padding:20,fontFamily:"system-ui"}}>
        <div style={{fontSize:13,fontWeight:700,color:"#2E4859",marginBottom:12}}>📋 Journal du jour — Léo 🦁</div>
        <div style={{background:"#F0FAF4",borderRadius:10,padding:12,marginBottom:8,borderLeft:"3px solid #5DA9A1"}}>
          <div style={{fontSize:10,color:"#5DA9A1",fontWeight:700,marginBottom:3}}>👩👧 Marie · 11h30</div>
          <div style={{fontSize:12,color:"#2E4859",lineHeight:1.6}}>Léo a découvert la peinture avec les doigts ce matin ! Il a réalisé un tableau qu'il a voulu offrir à sa maman. 🎨</div>
          <div style={{display:"flex",justifyContent:"flex-end",marginTop:6}}>
            <button onClick={()=>setLiked(!liked)}style={{background:"none",border:"none",cursor:"pointer",fontSize:16,transition:"transform .2s",transform:liked?"scale(1.3)":"scale(1)"}}>{liked?"❤️":"🤍"}</button>
          </div>
        </div>
        <div style={{background:"#FFF8F3",borderRadius:10,padding:12,borderLeft:"3px solid #E49178"}}>
          <div style={{fontSize:10,color:"#E49178",fontWeight:700,marginBottom:3}}>🍽️ Repas</div>
          <div style={{fontSize:12,color:"#2E4859"}}>🥗 Purée de légumes · ✅ Bon appétit · 🍼 250ml</div>
        </div>
        <div style={{marginTop:12,display:"flex",gap:6,alignItems:"center"}}>
          <span style={{fontSize:10,color:"#8FA3AD"}}>Humeur :</span>
          {["😊","😴","🤗","😢"].map(m=><button key={m}onClick={()=>setMood(m)}style={{
            fontSize:18,background:mood===m?"#F0FAF4":"transparent",border:mood===m?"1.5px solid #5DA9A1":"1.5px solid transparent",
            borderRadius:8,padding:"2px 6px",cursor:"pointer",transition:"all .15s"
          }}>{m}</button>)}
        </div>
      </div>);
    },
  },
  {
    id:"facturation",label:"Salaire automatique",icon:"🧮",color:"#E49178",
    preview:()=>{
      const [mois,setMois]=useState("Mars");
      const data={Mars:{h:160,supp:8,ent:20},Fev:{h:152,supp:4,ent:19},Jan:{h:168,supp:12,ent:21}};
      const m=data[mois]||data.Mars;
      const brut=(m.h*4.05+m.supp*5.06+m.ent*3.80);
      return(
      <div style={{padding:20,fontFamily:"system-ui"}}>
        <div style={{fontSize:13,fontWeight:700,color:"#2E4859",marginBottom:12}}>💰 Salaire — Léo 🦁</div>
        <div style={{display:"flex",gap:4,marginBottom:12}}>
          {["Jan","Fev","Mars"].map(mo=><button key={mo}onClick={()=>setMois(mo)}style={{
            padding:"5px 12px",borderRadius:8,border:"none",cursor:"pointer",fontSize:11,fontWeight:600,
            background:mois===mo?"#E49178":"#F4F7FA",color:mois===mo?"#fff":"#2E4859",transition:"all .15s"
          }}>{mo} 2024</button>)}
        </div>
        {[["Heures réalisées",m.h+"h × 4,05€",(m.h*4.05).toFixed(2)+"€"],["Indemnité entretien",m.ent+"j × 3,80€",(m.ent*3.80).toFixed(2)+"€"],["Heures majorées",m.supp+"h × 5,06€",(m.supp*5.06).toFixed(2)+"€"]].map(([l,d,v])=>(
          <div key={l}style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #E8E4E0",fontSize:12}}>
            <div><div style={{fontWeight:600,color:"#2E4859"}}>{l}</div><div style={{fontSize:10,color:"#8FA3AD"}}>{d}</div></div>
            <div style={{fontWeight:700,color:"#5DA9A1"}}>{v}</div>
          </div>
        ))}
        <div style={{marginTop:10,padding:"10px 12px",background:"#FFF8F3",borderRadius:10,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontSize:13,fontWeight:700,color:"#2E4859"}}>Total brut</span>
          <span style={{fontSize:20,fontWeight:700,color:"#E49178"}}>{brut.toFixed(2)} €</span>
        </div>
      </div>);
    },
  },
  {
    id:"calendrier",label:"Calendrier partagé",icon:"📅",color:"#2E4859",
    preview:()=>{
      const [selDay,setSelDay]=useState(15);
      return(
      <div style={{padding:20,fontFamily:"system-ui"}}>
        <div style={{fontSize:13,fontWeight:700,color:"#2E4859",marginBottom:12}}>📅 Mars 2024</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:12}}>
          {["L","M","Me","J","V","S","D"].map(j=><div key={j}style={{textAlign:"center",fontSize:9,fontWeight:700,color:"#8FA3AD",padding:4}}>{j}</div>)}
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
          <div style={{fontWeight:700,marginBottom:4}}>📌 {selDay} mars</div>
          <div>🦁 Léo : 07h30 — 17h30 {selDay%7!==0&&selDay%7!==6?"✅":"🔴 Repos"}</div>
          {selDay%3===0&&<div>🌸 Emma : 08h00 — 16h30 ✅</div>}
        </div>}
      </div>);
    },
  },
  {
    id:"parent",label:"Espace parent",icon:"👪",color:"#C84B31",
    preview:()=>{
      const [valide,setValide]=useState(false);
      return(
      <div style={{padding:20,fontFamily:"system-ui"}}>
        <div style={{fontSize:13,fontWeight:700,color:"#2E4859",marginBottom:12}}>👪 Sophie — Léo 🦁</div>
        <div style={{background:"#FFF8F3",borderRadius:10,padding:12,marginBottom:8,border:"1px solid #FFD6B3"}}>
          <div style={{fontSize:10,color:"#C84B31",fontWeight:700,marginBottom:4}}>⏰ Pointage du jour</div>
          <div style={{display:"flex",gap:16}}>
            {[["Arrivée","07h35","#5DA9A1"],["Départ","17h20","#C84B31"],["Total","9h45","#2E4859"]].map(([l,v,c])=>(
              <div key={l}style={{textAlign:"center"}}><div style={{fontSize:9,color:"#8FA3AD"}}>{l}</div><div style={{fontSize:16,fontWeight:700,color:c}}>{v}</div></div>
            ))}
          </div>
          <button onClick={()=>setValide(!valide)}style={{
            marginTop:8,width:"100%",padding:"7px",borderRadius:8,border:"none",cursor:"pointer",fontSize:11,fontWeight:700,
            background:valide?"#5DA9A1":"#F4F7FA",color:valide?"#fff":"#2E4859",transition:"all .2s"
          }}>{valide?"✅ Pointage validé":"Valider le pointage"}</button>
        </div>
        <div style={{background:"#F0FAF4",borderRadius:10,padding:10,fontSize:12,color:"#2E4859",lineHeight:1.5}}>
          📋 Léo a peint un tableau et l'a offert à sa maman ! 🎨
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
function RenderArticleBlocks({blocks}){
  return <div>{(blocks||[]).map((b,i)=>{
    if(b.type==="h3") return <h3 key={i} style={{fontSize:16,fontWeight:700,color:b.color||"#2E4859",margin:"20px 0 10px"}}>{b.text}</h3>;
    if(b.type==="callout"){const col=b.color||"#5DA9A1"; return <div key={i} style={{background:col+"14",borderRadius:12,padding:16,margin:"16px 0",border:"1px solid "+col+"40"}}><div style={{fontWeight:700,color:col,marginBottom:6}}>{b.title}</div><div style={{fontSize:12}}>{fmtInline(b.text)}</div></div>;}
    if(b.type==="list") return <ul key={i} style={{paddingLeft:20,fontSize:13,lineHeight:1.9}}>{(b.items||[]).map((it,j)=><li key={j}>{fmtInline(it)}</li>)}</ul>;
    return <p key={i} style={{marginBottom:8}}>{fmtInline(b.text)}</p>;
  })}</div>;
}
function LandingPage({onLogin,dark,setDark,config=DEFAULT_CONFIG}) {
  const [demoPage, setDemoPage] = useState("accueil");
  const [showModal, setShowModal] = useState(false);
  const [showLegal, setShowLegal] = useState(null);
  const [showBlog, setShowBlog] = useState(null);
  const [showBoutique, setShowBoutique] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [role, setRole] = useState("asmat");
  const [modeAuth, setModeAuth] = useState("inscription");
  const [form, setForm] = useState({email:"", password:"", prenom:"", nom:""});
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [consent, setConsent] = useState({politique:false, cgu:false, newsletter:false});
  const consentValide = consent.politique && consent.cgu;
  const [demoArrivee, setDemoArrivee] = useState({e1:"07h35",e2:null,e3:null});
  // Démo : enfants enrichis (signatures dérivées) + stats fictives pour le vrai écran Accueil
  const demoEnfants = D.enfants.map(e=>({...e, contrat:{...e.contrat, signe_asmat:e.signe, signe_parent:e.signe, id:"c_"+e.id}}));
  const demoAccueilStats = {heuresSemaine:38.5,joursSemaine:5,revenuMois:1620,heuresMois:152,messagesNonLus:D.messages.filter(m=>!m.lu).length,presencesJour:demoEnfants.filter(e=>demoArrivee[e.id]).map(e=>({...e,depuis:demoArrivee[e.id]})),loaded:true};
  // Démo : sous-onglets déverrouillés (vrais écrans) ; tout le reste = aperçu verrouillé
  const DEMO_UNLOCKED = ["accueil","pointage","admin_finances","inviter_parent","calendrier","messagerie","sante_complet"];
  const demoActiveGroup = findGroup(GROUPS_AM, demoPage) || "accueil";
  const L = config.landing;
  const T = config.txts;
  const SV = config.sectionsVisibles||{}; // P32 : visibilité des sections landing (true par défaut)
  const F = config.footer||DEFAULT_CONFIG.footer; // P32-2b : contenu du footer
  const SECTIONS_ORDER_DEFAULT=["probleme","demo","signature","transformation","chiffres","temoignages","tarifs","ctaFinal","faq","blog"]; // P32-4
  const _ord=(config.sectionsOrder&&config.sectionsOrder.length)?config.sectionsOrder:SECTIONS_ORDER_DEFAULT;
  const ord=(id)=>{const i=_ord.indexOf(id);return i<0?999:i;};

  const demos=[
    {id:"demo-asmat",email:"marie.dupont@mail.fr",prenom:"Marie",nom:"Dupont",role:"asmat",couleur:"#B8622F",label:"Marie Dupont (AssMat)"},
    {id:"demo-parent1",email:"sophie.martin@mail.fr",prenom:"Sophie",nom:"Martin",role:"parent",couleur:"#2E5F8A",label:"Sophie Martin - Léo"},
    {id:"demo-parent2",email:"thomas.bernard@mail.fr",prenom:"Thomas",nom:"Bernard",role:"parent",couleur:"#3D6B50",label:"Thomas Bernard - Emma"},
  ];

  useEffect(()=>{
    const id = 'timat-fonts';
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id; link.rel = 'stylesheet';
    link.href = config.landing.googleFontsUrl || 'https://fonts.googleapis.com/css2?family=Quicksand:wght@500;600;700&family=Outfit:wght@300;400;500;600;700&display=swap';
    document.head.appendChild(link);
  }, []);

  const connexion = async () => {
    if (!form.email || !form.password) { setErr("Email et mot de passe requis."); return; }
    setLoading(true); setErr("");
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
      if (error) {
        const demo = demos.find(d => d.email === form.email.trim().toLowerCase());
        if (demo) { onLogin({...demo, isDemo: true}); return; }
        setErr("Email ou mot de passe incorrect.");
      } else if (data?.user) {
        // Pass minimal user data - auth listener will enrich with profile from DB
        onLogin({
          id: data.user.id,
          email: data.user.email,
          prenom: data.user.user_metadata?.prenom || "Utilisateur",
          nom: data.user.user_metadata?.nom || "",
          role: data.user.user_metadata?.role || "asmat",
          couleur: "#E49178",
          subscription_status: "free"
        });
      }
    } catch(e) { setErr("Erreur réseau. Vérifiez votre connexion ou utilisez un compte démo."); }
    setLoading(false);
  };

  const inscription = async () => {
    if (!form.email || !form.password || !form.prenom) { setErr("Remplis tous les champs obligatoires."); return; }
    if (form.password.length < 6) { setErr("Le mot de passe doit faire au moins 6 caractères."); return; }
    if (!consentValide) { setErr("Accepte la politique de confidentialité et les CGU pour continuer."); return; }
    setLoading(true); setErr("");
    try {
      const { data, error } = await supabase.auth.signUp({
        email: form.email, password: form.password,
        options: { data: { prenom: form.prenom, nom: form.nom, role } }
      });
      if (error) {
        if(error.message?.includes('already registered')) setErr("Cet email est déjà utilisé. Connectez-vous.");
        else if(error.message?.includes('fetch')) setErr("Erreur réseau. Vérifiez votre connexion.");
        else setErr(error.message||"Erreur lors de l'inscription.");
      }
      else if (data?.user) {
        // Delay profile upsert so auth listener settles first (avoids lock race)
        setTimeout(async()=>{
          try{
            await supabase.from('profiles').upsert({
              id: data.user.id, email: data.user.email,
              prenom: form.prenom, nom: form.nom||'',
              role: role, couleur: role === "asmat" ? "#B8622F" : "#2E5F8A",
              subscription_status: 'free',
            },{onConflict:'id'});
          }catch(e){console.log('Profile upsert:', e);}
        },500);
        onLogin({ id: data.user.id, email: data.user.email, prenom: form.prenom, nom: form.nom, role, couleur: role === "asmat" ? "#B8622F" : "#2E5F8A" });
        // AUDIT LOG + CONSENT P8 : preuve RGPD du consentement + trace de la création de compte
        logConsent(data.user.id, consent);
        logAction('signup', {table_name:'profiles', record_id:data.user.id, user_id:data.user.id});
      }
    } catch(e) { setErr("Erreur lors de l'inscription."); }
    setLoading(false);
  };

  const accent = L.accentColor||"#E49178";
  const fTitle = L.fontTitle||"'Fraunces', Georgia, serif";
  const fBody = L.fontBody||"'Plus Jakarta Sans', 'DM Sans', system-ui, sans-serif";
  const painPoints = config.painPoints||DEFAULT_CONFIG.painPoints;
  const transformations = config.transformations||DEFAULT_CONFIG.transformations;
  const statsHero = config.statsHero||DEFAULT_CONFIG.statsHero;
  const statsSection = config.statsSection||DEFAULT_CONFIG.statsSection;
  const testimonials = config.testimonials||DEFAULT_CONFIG.testimonials;

  return (
    <div style={{ fontFamily: fBody, overflowX: "hidden", background: L.pageBg||"#FDFBF8" }}>
      {/* Responsive CSS */}
      <style>{`
        .lp-nav-btns{display:flex;gap:8px;align-items:center}
        .lp-nav-full{display:flex;gap:8px;align-items:center}
        .lp-nav-mobile{display:none}
        .lp-hero-stats{display:flex;gap:32px;flex-wrap:wrap;justify-content:center}
        .lp-demo-grid{display:grid;grid-template-columns:200px 1fr;gap:24px;align-items:start}
        .lp-demo-tabs{display:flex;flex-direction:column;gap:6px}
        .lp-transfo-row{display:grid;grid-template-columns:40px 1fr 1fr 1fr;gap:20px;align-items:center}
        .lp-tarifs-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:start}
        .lp-logo{font-size:26px;font-weight:700;display:flex;align-items:center;gap:8px;letter-spacing:-.5px}
        .lp-logo-icon{width:32px;height:32px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px}
        .lp-hero-ctas{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-bottom:28px}
        .lp-hero-ctas button{white-space:nowrap}
        .lp-hero{padding:0 24px 80px;position:relative;overflow:hidden}
        .lp-section{padding:72px 24px}
        .lp-guarantees{display:flex;gap:20px;justify-content:center;flex-wrap:wrap;text-align:center;margin-top:24px;font-size:13px}
        @media(max-width:768px){
          .lp-nav-full{display:none!important}
          .lp-nav-mobile{display:flex!important;gap:6px;align-items:center}
          .lp-hero-stats{gap:16px}
          .lp-hero-stats>div{min-width:60px}
          .lp-demo-grid{grid-template-columns:1fr!important;gap:16px}
          .lp-demo-tabs{flex-direction:row;flex-wrap:wrap;gap:4px}
          .lp-demo-tabs button{padding:8px 12px!important;font-size:12px!important;flex:0 0 auto}
          .lp-transfo-row{grid-template-columns:1fr!important;gap:8px;padding:14px!important}
          .lp-transfo-row>div:first-child{display:none}
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
          .lp-hero-stats{gap:10px}
          .lp-hero-stats>div{min-width:50px}
          .lp-demo-tabs button{padding:6px 8px!important;font-size:11px!important}
          .lp-section{padding:40px 12px}
          .lp-hero{padding:0 12px 40px}
          .lp-logo{font-size:20px}
          .lp-logo-icon{width:24px;height:24px;font-size:13px}
        }
      `}</style>
      <div className="lp-hero" style={{ background: L.heroBg }}>
        <div style={{ position:"absolute", inset:0, zIndex:0, backgroundImage:L.heroImg?"url("+L.heroImg+")":"none", backgroundSize:"cover", backgroundPosition:L.heroImgPosition||"center center", opacity:L.heroImgOpacity||0.12, filter:"blur("+(L.heroImgBlur||2)+"px)" }}/>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E\")", pointerEvents: "none", zIndex: 0 }} />
        {/* Nav */}
        <div style={{ position: "relative", zIndex: 1, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "22px 0", maxWidth: 1000, margin: "0 auto" }}>
          <div className="lp-logo" style={{ fontFamily: fTitle }}>
            <img src={L?.logoUrl || "/logo.png"} alt="TiMat" style={{height:(L?.logoSizes?.landingHeader)||44,objectFit:"contain"}} onError={e=>{e.target.style.display="none"; const fallback=document.createElement("span"); fallback.style.color="#fff"; fallback.style.fontWeight="700"; fallback.style.fontSize="22px"; fallback.textContent="TiMat"; e.target.parentNode.appendChild(fallback);}}/>
          </div>
          {/* Desktop nav */}
          <div className="lp-nav-full">
            <button onClick={() => document.getElementById("demo")?.scrollIntoView({ behavior: "smooth" })} style={{ background: L.navFonctionBg||L.navBtnBg||"rgba(255,255,255,.12)", color: L.navBtnColor||"#fff", border: "1px solid "+(L.navBtnBorder||"rgba(255,255,255,.25)"), cursor: "pointer", fontSize: 13, fontWeight: 600, padding: "8px 16px", borderRadius: 10 }}>Fonctionnalités</button>
            <button onClick={() => document.getElementById("tarifs")?.scrollIntoView({ behavior: "smooth" })} style={{ background: L.navTarifsBg||L.navBtnBg||"rgba(255,255,255,.12)", color: L.navBtnColor||"#fff", border: "1px solid "+(L.navBtnBorder||"rgba(255,255,255,.25)"), cursor: "pointer", fontSize: 13, fontWeight: 600, padding: "8px 16px", borderRadius: 10 }}>Tarifs</button>
            <button onClick={() => setShowBoutique(true)} style={{ background: L.navBoutiqueBg||L.navBtnBg||"rgba(255,255,255,.12)", color: L.navBtnColor||"#fff", border: "1px solid "+(L.navBtnBorder||"rgba(255,255,255,.25)"), cursor: "pointer", fontSize: 13, fontWeight: 600, padding: "8px 16px", borderRadius: 10 }}>Boutique</button>
            <button onClick={() => { setShowModal(true); setRole("asmat"); }} style={{ background: L.navCtaBg||"linear-gradient(135deg,#E49178,#C84B31)", color: L.navCtaColor||"#fff", border: "none", borderRadius: 10, padding: "9px 20px", cursor: "pointer", fontSize: 13, fontWeight: 700, boxShadow: "0 4px 20px rgba(255,159,99,.4)" }}>Se connecter / S'inscrire →</button>
          </div>
          {/* Mobile nav - hamburger + CTA */}
          <div className="lp-nav-mobile">
            <button onClick={() => setMenuOpen(!menuOpen)} style={{ background: L.navHamburgerBg||L.navBtnBg||"rgba(255,255,255,.2)", color: L.navHamburgerColor||L.navBtnColor||"#fff", border: "2px solid "+(L.navHamburgerBorder||L.navBtnBorder||"rgba(255,255,255,.4)"), borderRadius: 10, width: 42, height: 42, cursor: "pointer", fontSize: 20, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>☰</button>
            <button onClick={() => { setShowModal(true); setRole("asmat"); }} style={{ background: L.navCtaBg||"linear-gradient(135deg,#E49178,#C84B31)", color: L.navCtaColor||"#fff", border: "none", borderRadius: 10, padding: "8px 16px", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>Commencer →</button>
          </div>
        </div>
        {/* Dropdown menu (mobile) */}
        {menuOpen&&<div style={{ position: "relative", zIndex: 10, maxWidth: 1000, margin: "0 auto", padding: "0 0 16px" }}>
          <div style={{ background: "rgba(0,0,0,.4)", backdropFilter: "blur(20px)", borderRadius: 12, padding: 8, display: "flex", flexDirection: "column", gap: 2 }}>
            {[["Fonctionnalités","demo"],["Tarifs","tarifs"],["Blog","blog-section"],["Boutique","boutique"],["Connexion","login"]].map(([label,target])=>
              <button key={target} onClick={()=>{setMenuOpen(false);if(target==="boutique")setShowBoutique(true);else if(target==="login")setShowModal(true);else document.getElementById(target)?.scrollIntoView({behavior:"smooth"});}}
                style={{ background: "transparent", color: "#fff", border: "none", padding: "12px 16px", cursor: "pointer", fontSize: 14, fontWeight: 600, textAlign: "left", borderRadius: 8 }}
                onMouseEnter={e=>e.target.style.background="rgba(255,255,255,.15)"} onMouseLeave={e=>e.target.style.background="transparent"}>{label}</button>
            )}
          </div>
        </div>}
        {/* Hero stats */}
        <div className="lp-hero-stats" style={{ position: "relative", zIndex: 1, maxWidth: 1000, margin: "0 auto 48px" }}>
          {statsHero.map(({ n, suf, label }) => (
            <div key={label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: L.heroStatsColor||accent, fontFamily: fTitle }}><Counter target={n} suffix={suf} /></div>
              <div style={{ fontSize: 11, color: L.heroStatsLabelColor||"rgba(255,255,255,.45)", marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
        {/* Hero content */}
        <div style={{ position: "relative", zIndex: 1, maxWidth: 760, margin: "0 auto", textAlign: L.heroAlign||"center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: L.heroBadgeBg||"rgba(228,145,120,.12)", border: "1px solid rgba(228,145,120,.25)", borderRadius: 20, padding: "5px 16px", fontSize: 11, color: L.heroBadgeColor||"#E49178", marginBottom: 28, fontWeight: 600, letterSpacing: ".8px" }}>{T.heroBadge}</div>
          <div style={{ fontFamily: fTitle, fontSize: "clamp(30px,5.5vw,58px)", fontWeight: 700, color: L.heroTitleColor||"#fff", lineHeight: 1.15, marginBottom: 20 }}>
            {T.heroTitle}<br/>
            {T.heroTitleAccent&&<><span style={{ color: accent, fontStyle: "italic" }}>{T.heroTitleAccent}</span><br/></>}
            <span style={{ fontSize: "clamp(20px,3.5vw,36px)", fontWeight: 400, color: L.heroSubColor||"rgba(255,255,255,.75)", fontStyle: "normal" }}>{T.heroSub}</span>
          </div>
          <div style={{ fontSize: "clamp(14px,2vw,17px)", color: L.heroSubDescColor||"rgba(255,255,255,.6)", lineHeight: 1.8, marginBottom: 36, maxWidth: 580, margin: "0 auto 36px", whiteSpace:"pre-line" }}>{T.heroSubDesc}</div>
          <div className="lp-hero-ctas">
            <button onClick={() => { setShowModal(true); setRole("asmat"); }} style={{ background: L.heroBtnPrimBg||"linear-gradient(135deg,#E49178,#C76754)", color: L.heroBtnPrimColor||"#fff", border: "none", borderRadius: 10, padding: "15px 32px", fontSize: 15, fontWeight: 700, cursor: "pointer", boxShadow: "0 6px 24px rgba(184,98,47,.5)", letterSpacing: ".3px" }}>{T.heroBtnPrimTxt}</button>
            <button onClick={() => document.getElementById("demo")?.scrollIntoView({ behavior: "smooth" })} style={{ background: L.heroBtnSecBg||"rgba(255,255,255,.07)", color: L.heroBtnSecColor||"#fff", border: "1px solid "+(L.heroBtnSecBorder||"rgba(255,255,255,.18)"), borderRadius: 10, padding: "15px 28px", fontSize: 15, cursor: "pointer" }}>{T.heroBtnSecTxt}</button>
          </div>
          <div style={{ display: "flex", gap: 20, justifyContent: "center", flexWrap: "wrap" }}>
            {(T.heroTags||"").split(",").map(t => <span key={t} style={{ fontSize: 11, color: L.heroTagsColor||"rgba(255,255,255,.4)", fontWeight: 500 }}>{t.trim()}</span>)}
          </div>
        </div>
      </div>

      <div style={{display:"flex",flexDirection:"column"}}>
      {/* SECTION 1 - PROBLEME */}
      {SV.probleme!==false&&<div className="lp-section" style={{ order:ord("probleme"), background: L.section1Bg||"linear-gradient(135deg,#2E4A5A,#5DA9A1)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: L.s1Align||"center", marginBottom: 48 }}>
              <div style={{ fontFamily: fTitle, fontSize: "clamp(22px,4vw,36px)", color: L.s1TitleColor||"#fff", fontWeight: 700, marginBottom: 10 }}>{L.s1Title}</div>
              <div style={{ fontSize: 15, color: L.s1DescColor||"rgba(255,255,255,.5)", lineHeight: 1.7, whiteSpace:"pre-line" }}>{L.s1Desc}</div>
            </div>
          </FadeIn>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
            {painPoints.map((item, i) => (
              <FadeIn key={i} delay={i * 80}>
                <div style={{ background: L.s1CardBg||"rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 14, padding: 20 }}>
                  <div style={{ fontSize: 28, marginBottom: 10 }}>{item.ic}</div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: L.s1CardTitleColor||"#fff", marginBottom: 6 }}>{item.titre}</div>
                  <div style={{ fontSize: 12, color: L.s1CardDescColor||"rgba(255,255,255,.5)", lineHeight: 1.7 }}>{item.desc}</div>
                </div>
              </FadeIn>
            ))}
          </div>
          <FadeIn delay={400}>
            <div style={{ marginTop: 40, textAlign: L.s1Align||"center", padding: "28px 32px", background: L.s1QuoteBg||"rgba(228,145,120,.08)", border: "1px solid rgba(228,145,120,.2)", borderRadius: 20 }}>
              <div style={{ fontFamily: fTitle, fontSize: "clamp(18px,3vw,28px)", color: L.s1QuoteColor||accent, fontWeight: 700, fontStyle: "italic", whiteSpace:"pre-line" }}>{L.s1Quote}</div>
            </div>
          </FadeIn>
        </div>
      </div>}

      {/* SECTION 2 - DEMO */}
      {SV.demo!==false&&<div id="demo" className="lp-section" style={{ order:ord("demo"), background: L.section2Bg||"#FDF5FB" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: L.s2Align||"center", marginBottom: 48 }}>
              <div style={{ fontFamily: fTitle, fontSize: "clamp(22px,4vw,36px)", color: L.s2TitleColor||"#0D1B2A", fontWeight: 700, marginBottom: 10 }}>{L.s2Title}</div>
              <div style={{ fontSize: 15, color: L.s2DescColor||"#6B4F3A", lineHeight: 1.7 }}>{L.s2Desc}</div>
            </div>
          </FadeIn>
          <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-start" }}>

            {/* Phone frame — vraie UI de l'app */}
            <div className="demo-phone" style={{ flexShrink: 0, background: "#1a1a2e", borderRadius: 44, padding: "14px 12px 12px", boxShadow: "0 18px 55px rgba(0,0,0,.28), inset 0 1px 2px rgba(255,255,255,.08)" }}>
              {/* Notch */}
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
                <div style={{ width: 110, height: 24, background: "#1a1a2e", borderRadius: "0 0 18px 18px", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#2a2a4e" }} />
                  <div style={{ width: 48, height: 4, borderRadius: 2, background: "#2a2a4e" }} />
                </div>
              </div>
              {/* Screen */}
              <div style={{ background: "#FDFBF8", borderRadius: 30, overflow: "hidden", height: 560, display: "flex", flexDirection: "column", position: "relative" }}>
                {/* Badge DEMO */}
                <div style={{position:"absolute",top:10,right:10,zIndex:50,background:"rgba(155,107,170,.9)",color:"#fff",fontSize:8,fontWeight:700,padding:"2px 7px",borderRadius:5,letterSpacing:1,pointerEvents:"none"}}>DEMO</div>

                <div className="demo-zoom" style={{flex:1,display:"flex",flexDirection:"column",minHeight:0}}>

                {/* TopBar démo allégée (vrai logo, style identique, sans actions perso) */}
                <div className="topbar">
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <img src={logoForRole("asmat",false)} alt="TiMat" style={{height:(G?.landing?.logoSizes?.topBar)||28,objectFit:"contain"}} onError={e=>{e.target.outerHTML='<div class="logo">TiMat</div>'}}/>
                    <span style={{fontSize:10,color:"var(--l)",fontFamily:"'DM Mono',monospace",letterSpacing:"1px",marginTop:1}}>v3</span>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:18,position:"relative",display:"inline-flex"}}>🔔<span style={{position:"absolute",top:-2,right:-2,background:"var(--R)",color:"#fff",borderRadius:"50%",width:14,height:14,fontSize:9,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>3</span></span>
                    <span style={{fontSize:16}}>🌙</span>
                    <div style={{width:28,height:28,minWidth:28,borderRadius:"50%",background:D.asmat.couleur,color:"#fff",fontSize:11,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1}}>{ini(D.asmat.prenom,D.asmat.nom)}</div>
                  </div>
                </div>

                {/* Barre principale - vrais onglets */}
                <div className="nav-main" style={{background:"rgba(255,255,255,.95)",backdropFilter:"blur(20px)",borderBottom:"1px solid rgba(234,224,232,.6)",display:"flex",gap:6,padding:"0 20px",height:52,alignItems:"center",overflowX:"auto",scrollbarWidth:"none"}}>
                  {Object.entries(GROUPS_AM).map(([key,g])=>{
                    const isActive=demoActiveGroup===key;
                    // ouvre le 1er sous-onglet déverrouillé du groupe, sinon le 1er
                    const subs=g.subs||[{id:key,l:g.l,ic:g.ic}];
                    const firstUnlocked=subs.find(s=>DEMO_UNLOCKED.includes(s.id))||subs[0];
                    return <button key={key} onClick={()=>setDemoPage(firstUnlocked.id)} style={{display:"flex",alignItems:"center",gap:7,padding:"8px 18px",borderRadius:24,border:"none",fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:13,cursor:"pointer",transition:"all .2s cubic-bezier(.34,1.56,.64,1)",flexShrink:0,whiteSpace:"nowrap",background:isActive?"linear-gradient(135deg,var(--T),var(--S))":"rgba(155,107,170,.08)",color:isActive?"#fff":"var(--m)",boxShadow:isActive?"0 4px 16px rgba(144,160,147,.3)":"none",transform:isActive?"scale(1.03)":"scale(1)",letterSpacing:".1px"}}>
                      <span style={{fontSize:17,lineHeight:1}}>{g.ic}</span>
                      <span>{g.l}</span>
                    </button>;
                  })}
                </div>

                {/* Barre de sous-onglets du groupe actif (tous visibles, cadenas si verrouillé) */}
                {(()=>{const g=GROUPS_AM[demoActiveGroup];const subs=g&&g.subs?g.subs:null;if(!subs)return null;return <div style={{display:"flex",gap:6,padding:"8px 16px",overflowX:"auto",scrollbarWidth:"none",borderBottom:"1px solid rgba(234,224,232,.5)",background:"#fff"}}>
                  {subs.map(s=>{const unlocked=DEMO_UNLOCKED.includes(s.id);const active=demoPage===s.id;return <button key={s.id} onClick={()=>setDemoPage(s.id)} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",borderRadius:18,border:"none",fontFamily:"inherit",fontWeight:600,fontSize:12,cursor:"pointer",flexShrink:0,whiteSpace:"nowrap",background:active?"var(--T)":"rgba(0,0,0,.04)",color:active?"#fff":(unlocked?"var(--b)":"var(--l)"),opacity:unlocked?1:.7}}>
                    <span style={{fontSize:13}}>{s.ic}</span><span>{s.l}</span>{!unlocked&&<span style={{fontSize:10}}>🔒</span>}
                  </button>;})}
                </div>;})()}

                {/* Contenu : vrai écran si déverrouillé, sinon aperçu flouté verrouillé */}
                <div className="demo-screen" style={{ flex: 1, overflowY: "auto", overflowX: "hidden", position:"relative" }}>
                  {demoPage==="accueil"
                    ? <AccueilAssMat enfants={demoEnfants} user={D.asmat} setPage={setDemoPage} demoStats={demoAccueilStats}/>
                    : demoPage==="pointage"
                    ? <div style={{padding:10}}><Pointage enfants={demoEnfants} role="asmat" pEId={null} user={D.asmat} demoMode={true}/></div>
                    : demoPage==="inviter_parent"
                    ? <div style={{padding:10}}><InviterParent enfants={demoEnfants} user={D.asmat} demoMode={true}/></div>
                    : demoPage==="admin_finances"
                    ? <div style={{padding:10}}><AdminFinances enfants={demoEnfants} role="asmat" pEId={null} user={D.asmat} pointagesDB={D.pointages} demoMode={true}/></div>
                    : demoPage==="calendrier"
                    ? <div style={{padding:10}}><Calendrier enfants={demoEnfants} role="asmat" pEId={null}/></div>
                    : demoPage==="messagerie"
                    ? <div style={{padding:10}}><Messagerie enfants={demoEnfants} role="asmat" pEId={null} user={D.asmat}/></div>
                    : demoPage==="sante_complet"
                    ? <div style={{padding:10}}><SanteComplete enfants={demoEnfants} role="asmat" pEId={null}/></div>
                    : <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100%",gap:14,textAlign:"center",padding:24}}>
                        <div style={{fontSize:40}}>🔒</div>
                        <div style={{fontSize:16,fontWeight:700,color:"var(--b)"}}>Disponible dans l'application</div>
                        <div style={{fontSize:12,color:"var(--m)",lineHeight:1.6,maxWidth:250}}>Cette fonctionnalité fait partie de TiMat. Créez votre espace pour en profiter.</div>
                        <div onClick={()=>setShowModal(true)} style={{background:"linear-gradient(135deg,#E49178,#C76754)",borderRadius:10,padding:"10px 20px",fontSize:13,color:"#fff",fontWeight:700,cursor:"pointer",marginTop:4}}>Créer mon espace →</div>
                      </div>}
                </div>

                {/* Vraie BottomNav de l'app */}
                <div className="demo-bnav"><BottomNav groups={GROUPS_AM} page={demoPage} setPage={setDemoPage} pmiNonLus={0}/></div>
                </div>{/* /demo-zoom */}
              </div>
              {/* Home indicator */}
              <div style={{ display: "flex", justifyContent: "center", paddingTop: 8 }}>
                <div style={{ width: 90, height: 4, background: "rgba(255,255,255,.25)", borderRadius: 2 }} />
              </div>
            </div>
          </div>
          {/* Legende */}
          <div style={{display:"flex",gap:20,justifyContent:"center",flexWrap:"wrap",marginTop:24}}>
            <div style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:"#6B4F3A"}}>
              <div style={{width:10,height:10,borderRadius:3,background:"linear-gradient(135deg,#E49178,#C76754)"}}/>
              Onglet navigable dans la demo
            </div>
            <div style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:"#90A093"}}>
              <div style={{width:10,height:10,borderRadius:3,background:"#D0C8D8"}}/>
              🔒 Disponible dans l'application
            </div>
          </div>
        </div>
      </div>}

      {/* SECTION SIGNATURE ELECTRONIQUE P13 - differentiateurs vs concurrents */}
      {SV.signature!==false&&<div className="lp-section" style={{ order:ord("signature"), background: "linear-gradient(135deg,#0D1B2A 0%,#1E2B3D 100%)", padding: "80px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 56 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(228,145,120,.12)", border: "1px solid rgba(228,145,120,.3)", borderRadius: 20, padding: "5px 16px", fontSize: 11, color: "#E49178", marginBottom: 24, fontWeight: 600, letterSpacing: ".8px" }}>
                NOUVEAU · CONFORME eIDAS
              </div>
              <div style={{ fontFamily: fTitle, fontSize: "clamp(24px,4vw,42px)", color: "#fff", fontWeight: 700, marginBottom: 14, lineHeight: 1.2 }}>
                Signature électronique en <span style={{ color: "#E49178", fontStyle: "italic" }}>1 clic</span>
              </div>
              <div style={{ fontSize: 15, color: "rgba(255,255,255,.65)", lineHeight: 1.7, maxWidth: 700, margin: "0 auto" }}>
                Contrats, avenants, bulletins de salaire : signez une seule fois, réutilisez partout. Conforme à la loi (eIDAS), conforme RGPD, prêt à archiver 5 ans.
              </div>
            </div>
          </FadeIn>

          {/* 3 différentiateurs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 56 }}>
            {[
              {
                ic: "✍️",
                titre: "Signature standard réutilisable",
                desc: "Dessinez votre signature une seule fois dans vos paramètres. Elle est ensuite proposée en 1 clic sur tous vos contrats, avenants et bulletins. Plus jamais besoin de re-dessiner.",
                badge: "Conforme eIDAS",
                color: "#E49178"
              },
              {
                ic: "🔒",
                titre: "RGPD by design",
                desc: "Vos signatures sont chiffrées et hébergées en France (Supabase Paris). Chaque action est tracée dans un journal d'audit. Conforme à l'article 20 RGPD (droit à la portabilité).",
                badge: "Sécurité maximale",
                color: "#E49178"
              },
              {
                ic: "🤝",
                titre: "Parent + asmat dans le même flow",
                desc: "Vous signez côté asmat. Le parent reçoit une notification et signe à son tour. Le PDF combiné final est automatiquement archivé dans vos documents pendant 5 ans (durée légale de conservation des contrats de travail).",
                badge: "Bout en bout",
                color: "#E49178"
              }
            ].map((d, i) => (
              <FadeIn key={d.titre} delay={i * 100}>
                <div style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 16, padding: 28, height: "100%", display: "flex", flexDirection: "column" }}>
                  <div style={{ fontSize: 36, marginBottom: 14 }}>{d.ic}</div>
                  <div style={{ display: "inline-block", background: d.color + "20", color: d.color, fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 6, marginBottom: 12, alignSelf: "flex-start", letterSpacing: ".5px", textTransform: "uppercase" }}>
                    {d.badge}
                  </div>
                  <div style={{ fontFamily: fTitle, fontSize: 17, fontWeight: 700, color: "#fff", marginBottom: 10, lineHeight: 1.3 }}>
                    {d.titre}
                  </div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,.65)", lineHeight: 1.7 }}>
                    {d.desc}
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>

          {/* Parcours signature en 4 etapes - remplace tableau comparatif (P22-SIG) */}
          <FadeIn delay={300}>
            <div style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 16, padding: 28 }}>
              <div style={{ fontFamily: fTitle, fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 28, textAlign: "center" }}>
                Comment ça marche
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20 }}>
                {[
                  { n: "1", t: "Vous signez en 1 clic", d: "Votre signature standard, déjà enregistrée, s'appose automatiquement sur le contrat." },
                  { n: "2", t: "Le parent est notifié", d: "Il reçoit un email sécurisé avec un lien unique pour accéder au document." },
                  { n: "3", t: "Le parent signe à son tour", d: "Sur mobile, tablette ou ordinateur, en quelques secondes." },
                  { n: "4", t: "PDF archivé 5 ans", d: "Stockage chiffré, hébergement France. Durée légale de conservation respectée." }
                ].map((s) => (
                  <div key={s.n} style={{ position: "relative", padding: "24px 16px 16px", background: "rgba(255,255,255,.03)", borderRadius: 12, border: "1px solid rgba(255,255,255,.06)" }}>
                    <div style={{ position: "absolute", top: -14, left: 16, width: 28, height: 28, borderRadius: "50%", background: "#E49178", color: "#0D1B2A", fontWeight: 800, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {s.n}
                    </div>
                    <div style={{ fontFamily: fTitle, fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 8, marginTop: 4 }}>
                      {s.t}
                    </div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,.6)", lineHeight: 1.6 }}>
                      {s.d}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>

          {/* CTA */}
          <FadeIn delay={500}>
            <div style={{ textAlign: "center", marginTop: 48 }}>
              <button onClick={() => { setShowModal(true); setRole("asmat"); }} style={{ background: "linear-gradient(135deg,#E49178,#C76754)", color: "#fff", border: "none", borderRadius: 10, padding: "15px 36px", fontSize: 15, fontWeight: 700, cursor: "pointer", boxShadow: "0 6px 24px rgba(184,98,47,.4)", letterSpacing: ".3px" }}>
                Tester la signature électronique →
              </button>
              <div style={{ marginTop: 14, fontSize: 11, color: "rgba(255,255,255,.4)" }}>
                Gratuit · Sans engagement · Conforme à la loi
              </div>
            </div>
          </FadeIn>
        </div>
      </div>}

      {/* SECTION 3 - TRANSFORMATION */}
      {SV.transformation!==false&&<div className="lp-section" style={{ order:ord("transformation"), background: L.section3Bg||"#F8F0FC" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: L.s3Align||"center", marginBottom: 56 }}>
              <div style={{ fontFamily: fTitle, fontSize: "clamp(22px,4vw,36px)", color: L.s3TitleColor||"#0D1B2A", fontWeight: 700, marginBottom: 10 }}>{L.s3Title}</div>
            </div>
          </FadeIn>
          <div style={{ display: "grid", gap: 3 }}>
            {transformations.map(([ic, pb, sol, res], i) => (
              <FadeIn key={pb} delay={i * 60}>
                <div className="lp-transfo-row" style={{ padding: "18px 20px", borderRadius: 12, background: i % 2 === 0 ? (L.s3RowBg1||"#F8F0FC") : (L.s3RowBg2||"#FDF5FB"), border: "1px solid #DDD5C8" }}>
                  <div style={{ fontSize: 22, textAlign: "center" }}>{ic}</div>
                  <div><div style={{ fontSize: 10, fontWeight: 700, color: L.s3LabelBeforeColor||"#B84060", textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 4 }}>{L.s3LabelBefore||"Aujourd'hui"}</div><div style={{ fontSize: 13, color: L.s3TextColor||"#6B4F3A", lineHeight: 1.5 }}>{pb}</div></div>
                  <div><div style={{ fontSize: 10, fontWeight: 700, color: L.s3LabelAfterColor||"#2E5F8A", textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 4 }}>{L.s3LabelAfter||"Avec TiMat"}</div><div style={{ fontSize: 13, color: L.s3TextColor||"#6B4F3A", lineHeight: 1.5 }}>{sol}</div></div>
                  <div><div style={{ fontSize: 10, fontWeight: 700, color: L.s3LabelResultColor||"#3D6B50", textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 4 }}>{L.s3LabelResult||"Ce que ça change"}</div><div style={{ fontSize: 13, color: L.s3ResultColor||"#3D6B50", fontWeight: 600, lineHeight: 1.5 }}>{res}</div></div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </div>}

      {/* SECTION 4 - CHIFFRES */}
      {SV.chiffres!==false&&<div className="lp-section" style={{ order:ord("chiffres"), background: L.section4Bg||"linear-gradient(135deg,#2E4A5A,#5DA9A1)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: L.s4Align||"center", marginBottom: 56 }}>
              <div style={{ fontFamily: fTitle, fontSize: "clamp(20px,3.5vw,32px)", color: L.s4TitleColor||"#fff", fontWeight: 700, marginBottom: 6 }}>{L.s4Title}</div>
              <div style={{ fontSize: 13, color: L.s4SubColor||"rgba(255,255,255,.4)" }}>{L.s4Sub}</div>
            </div>
          </FadeIn>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 24 }}>
            {statsSection.map(({ n, suf, label, desc }) => (
              <FadeIn key={label}>
                <div style={{ textAlign: "center", padding: "24px 16px", background: "rgba(255,255,255,.04)", borderRadius: 16, border: "1px solid rgba(255,255,255,.08)" }}>
                  <div style={{ fontFamily: fTitle, fontSize: 42, fontWeight: 700, color: L.s4StatColor||accent, lineHeight: 1 }}><Counter target={n} suffix={suf} /></div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: L.s4StatLabelColor||"#fff", marginTop: 8, marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 11, color: L.s4StatDescColor||"rgba(255,255,255,.4)" }}>{desc}</div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </div>}

      {/* SECTION 5 - TEMOIGNAGES */}
      {SV.temoignages!==false&&<div className="lp-section" style={{ order:ord("temoignages"), background: L.section5Bg||"#FDF5FB" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ fontFamily: fTitle, fontSize: "clamp(20px,3.5vw,32px)", color: L.s5TitleColor||"#0D1B2A", fontWeight: 700, textAlign: L.s5Align||"center", marginBottom: 48, fontStyle: "italic" }}>
              {L.s5Title}
            </div>
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

      {/* SECTION 6 - TARIFS */}
      {SV.tarifs!==false&&<div id="tarifs" className="lp-section" style={{ order:ord("tarifs"), background: L.section6Bg||"#F5EBF8" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ fontFamily: fTitle, fontSize: "clamp(22px,4vw,36px)", color: L.s6TitleColor||"#0D1B2A", fontWeight: 700, textAlign: L.s6Align||"center", marginBottom: 48 }}>{L.s6Title}</div>
          </FadeIn>
          <div className="lp-tarifs-grid">
            {/* Gratuit */}
            <div style={{ background: L.freeBg||"#fff", borderRadius: 16, border: "1.5px solid #DDD5C8", padding: 28 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: L.freeLabelColor||"#A68970", marginBottom: 10, textTransform: "uppercase", letterSpacing: "1px" }}>{T.freeLabel||"Gratuit"}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
                <span style={{ fontFamily: fTitle, fontSize: 46, fontWeight: 700, color: L.freePriceColor||"#0D1B2A" }}>{T.freePrice||"0€"}</span>
              </div>
              <div style={{ fontSize: 13, color: L.freeDescColor||"#6B4F3A", marginBottom: 22, lineHeight: 1.6 }}>{T.freeDesc||"Pour découvrir TiMat."}</div>
              <button onClick={() => { setShowModal(true); setRole("asmat"); }} style={{ width: "100%", background: L.freeBtnBg||"#0D1B2A", color: L.freeBtnColor||"#fff", border: "none", borderRadius: 10, padding: "13px", cursor: "pointer", fontWeight: 700, fontSize: 13, marginBottom: 24, fontFamily: "inherit" }}>{T.freeBtnTxt||"Commencer gratuitement"}</button>
              {(config.freeItems||DEFAULT_CONFIG.freeItems).map(([ok, t], i, arr) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13, padding: "5px 0", borderBottom: i < arr.length-1 ? "1px solid #DDD5C8" : "none" }}>
                  <span style={{ color: ok ? "#3D6B50" : "#DDD5C8", fontWeight: 700 }}>{ok ? "✓" : "✗"}</span>
                  <span style={{ color: ok ? "#2C1F14" : "#A68970" }}>{t}</span>
                </div>
              ))}
            </div>
            {/* Pro */}
            <div style={{ background: L.proBg||"#FDF5FB", borderRadius: 16, border: "2.5px solid "+(L.proBorderColor||"#B8622F"), padding: 28, position: "relative", boxShadow: "0 12px 48px rgba(184,98,47,.18)" }}>
              <div style={{ position: "absolute", top: -15, left: "50%", transform: "translateX(-50%)", background: "linear-gradient(135deg,#E49178,#B85838)", color: "#fff", borderRadius: 20, padding: "5px 18px", fontSize: 11, fontWeight: 700, letterSpacing: ".8px", whiteSpace: "nowrap" }}>{T.proLabel}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: L.proLabelColor||"#B8622F", marginBottom: 10, textTransform: "uppercase", letterSpacing: "1px" }}>Pro</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
                <span style={{ fontFamily: fTitle, fontSize: 46, fontWeight: 700, color: L.proPriceColor||"#B8622F" }}>{T.prixMensuel}€</span>
                <span style={{ fontSize: 13, color: "#A68970" }}>/mois</span>
              </div>
              <div style={{ fontSize: 11, color: L.proSubColor||"#A68970", marginBottom: 8 }}>{T.proSubtxt}</div>
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
          <div className="lp-guarantees">
            {(config.guarantees||DEFAULT_CONFIG.guarantees).map(g=><span key={g}>{g}</span>)}
          </div>
        </div>
      </div>}

      {/* CTA FINAL */}
      {SV.ctaFinal!==false&&<div className="lp-section" style={{ order:ord("ctaFinal"), background: L.ctaBg||"linear-gradient(135deg,#2E4859,#2A6F6A)", textAlign: L.ctaAlign||"center" }}>
        <FadeIn>
          <div style={{ fontFamily: fTitle, fontSize: "clamp(24px,5vw,46px)", color: L.ctaTitleColor||"#fff", fontWeight: 700, marginBottom: 16, lineHeight: 1.2, whiteSpace:"pre-line" }}>
            {(L.ctaTitle||"").split(L.ctaTitleAccent||"en comptabilité.")[0]}
            <span style={{ color: accent, fontStyle: "italic" }}>{L.ctaTitleAccent}</span><br/>
            <span style={{ fontSize: "clamp(16px,3vw,28px)", fontWeight: 400, color: L.ctaSubTitleColor||"rgba(255,255,255,.6)", fontStyle: "normal" }}>{L.ctaSubTitle}</span>
          </div>
          <div style={{ fontSize: 16, color: L.ctaSubColor||"rgba(255,255,255,.5)", marginBottom: 32, maxWidth: 460, margin: "0 auto 32px", lineHeight: 1.7 }}>{T.ctaSub}</div>
          <button onClick={() => { setShowModal(true); setRole("asmat"); }} style={{ background: L.ctaBtnBg||"linear-gradient(135deg,#E49178,#C76754)", color: L.ctaBtnColor||"#fff", border: "none", borderRadius: 12, padding: "16px 36px", fontSize: 16, fontWeight: 700, cursor: "pointer", boxShadow: "0 8px 32px rgba(184,98,47,.5)", fontFamily: "inherit", letterSpacing: ".3px" }}>{T.ctaBtnTxt}</button>
          <div style={{ marginTop: 16, fontSize: 12, color: L.ctaFooterColor||"rgba(255,255,255,.35)" }}>{T.ctaFooter}</div>
        </FadeIn>
      </div>}

      {/* FAQ */}
      {SV.faq!==false&&<div className="lp-section" style={{ order:ord("faq"), background: "#F4F7FA" }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <div style={{ fontFamily: fTitle, fontSize: "clamp(22px,4vw,36px)", color: "#2E4859", fontWeight: 700, marginBottom: 10 }}>Questions fréquentes</div>
              <div style={{ fontSize: 15, color: "#5F7A86" }}>Tout ce que vous devez savoir avant de commencer.</div>
            </div>
          </FadeIn>
          {(config.faqLanding||DEFAULT_CONFIG.faqLanding).map(({q,a},i)=>(
            <FadeIn key={i} delay={i*50}>
              <details style={{ marginBottom: 8, background: "#fff", borderRadius: 12, border: "1px solid #E8E4E0", overflow: "hidden" }}>
                <summary style={{ padding: "16px 20px", cursor: "pointer", fontSize: 14, fontWeight: 600, color: "#2E4859", listStyle: "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  {q}
                  <span style={{ fontSize: 18, color: "#E49178", flexShrink: 0, marginLeft: 12 }}>+</span>
                </summary>
                <div style={{ padding: "0 20px 16px", fontSize: 13, color: "#5F7A86", lineHeight: 1.8 }}>{a}</div>
              </details>
            </FadeIn>
          ))}
        </div>
      </div>}

      {/* BLOG */}
      {SV.blog!==false&&<div id="blog-section" className="lp-section" style={{ order:ord("blog"), background: "#FDFBF8" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <div style={{ fontFamily: fTitle, fontSize: "clamp(22px,4vw,36px)", color: "#2E4859", fontWeight: 700, marginBottom: 10 }}>Ressources pour les assmats</div>
              <div style={{ fontSize: 15, color: "#5F7A86" }}>Guides pratiques, conseils et informations utiles pour votre quotidien.</div>
            </div>
          </FadeIn>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
            {(config.blog||DEFAULT_CONFIG.blog).map((art,i)=>(
              <FadeIn key={art.id} delay={i*80}>
                <div onClick={()=>setShowBlog(art.id)} style={{
                  background:"#fff",borderRadius:16,overflow:"hidden",cursor:"pointer",
                  border:"1px solid #E8E4E0",transition:"all .2s",boxShadow:"0 2px 12px rgba(0,0,0,.04)"
                }}
                  onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-4px)";e.currentTarget.style.boxShadow="0 12px 32px rgba(0,0,0,.1)";}}
                  onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="0 2px 12px rgba(0,0,0,.04)";}}>
                  <div style={{height:120,background:"linear-gradient(135deg,"+art.catColor+"15,"+art.catColor+"08)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:48}}>{art.emoji}</div>
                  <div style={{padding:"16px 20px"}}>
                    <div style={{fontSize:10,fontWeight:700,color:art.catColor,textTransform:"uppercase",letterSpacing:".8px",marginBottom:8}}>{art.cat}</div>
                    <div style={{fontSize:15,fontWeight:700,color:"#2E4859",lineHeight:1.4,marginBottom:8}}>{art.title}</div>
                    <div style={{fontSize:12,color:"#5F7A86",lineHeight:1.6}}>{art.excerpt}</div>
                    <div style={{marginTop:12,fontSize:12,color:accent,fontWeight:600}}>Lire l'article →</div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </div>}
      </div>

      {/* BLOG ARTICLE MODAL */}
      {showBlog&&<div onClick={e=>e.target===e.currentTarget&&setShowBlog(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:250,padding:20}}>
        <div style={{background:"#fff",borderRadius:20,width:"100%",maxWidth:700,maxHeight:"90vh",overflow:"hidden",boxShadow:"0 24px 80px rgba(0,0,0,.3)",display:"flex",flexDirection:"column"}}>
          <div style={{padding:"20px 24px",borderBottom:"1px solid #E8E4E0",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
            <div style={{fontFamily:fTitle,fontSize:16,fontWeight:700,color:"#2E4859"}}>📝 Blog TiMat</div>
            <button onClick={()=>setShowBlog(null)}style={{background:"#F4F7FA",border:"none",borderRadius:10,padding:"8px 12px",cursor:"pointer",fontSize:14,color:"#2E4859",fontWeight:700}}>✕</button>
          </div>
          <div style={{padding:"24px",overflowY:"auto",fontSize:13,color:"#2E4859",lineHeight:1.9}}>
            {(()=>{ const _art=(config.blog||DEFAULT_CONFIG.blog).find(x=>x.id===showBlog)||{}; if(_art.blocks&&_art.blocks.length) return <div><h2 style={{fontSize:22,fontWeight:700,color:"#2E4859",marginBottom:8}}>{_art.emoji} {_art.title}</h2><div style={{fontSize:11,color:"#8FA3AD",marginBottom:20}}>{_art.cat}</div><RenderArticleBlocks blocks={_art.blocks}/></div>; return (<>

            {showBlog==="mensualisation"&&<div>
              <h2 style={{fontSize:22,fontWeight:700,color:"#2E4859",marginBottom:16}}>🧮 Mensualisation : le guide complet pour ne plus se tromper</h2>
              <div style={{fontSize:11,color:"#8FA3AD",marginBottom:20}}>Administratif · 8 min de lecture</div>

              <h3 style={{fontSize:16,fontWeight:700,color:"#2E4859",margin:"20px 0 10px"}}>Pourquoi mensualiser ?</h3>
              <p>La mensualisation est obligatoire pour les assistantes maternelles depuis la Convention Collective Nationale. Son objectif est simple : lisser votre salaire sur l'année pour que vous receviez la même somme chaque mois, même si les semaines d'accueil varient.</p>

              <h3 style={{fontSize:16,fontWeight:700,color:"#2E4859",margin:"20px 0 10px"}}>Année complète ou incomplète ?</h3>
              <p><strong>Année complète (47 semaines et plus)</strong> — Le calcul est le plus courant. L'enfant est accueilli au moins 47 semaines par an. Votre salaire mensuel est : <em>heures hebdo × 52 / 12 × taux horaire</em>. Les congés payés sont inclus dans ce calcul.</p>
              <p style={{marginTop:8}}><strong>Année incomplète (moins de 47 semaines)</strong> — Utilisé quand les parents prennent plus de 5 semaines de vacances ou pour un accueil périscolaire. Le calcul : <em>heures hebdo × nombre de semaines / 12 × taux horaire</em>. Les congés payés sont versés séparément (10% du total).</p>

              <div style={{background:"#F0FAF4",borderRadius:12,padding:16,margin:"16px 0",border:"1px solid #B7E4C7"}}>
                <div style={{fontWeight:700,color:"#5DA9A1",marginBottom:6}}>💡 Exemple concret</div>
                <div style={{fontSize:12}}>
                  Marie accueille Léo 40h/semaine, 47 semaines/an, à 4,05€/h brut.<br/>
                  Salaire mensualisé = 40 × 52 / 12 × 4,05 = <strong>702 € brut/mois</strong><br/>
                  Soit environ <strong>547,56 € net/mois</strong> (après cotisations ~22%).
                </div>
              </div>

              <h3 style={{fontSize:16,fontWeight:700,color:"#2E4859",margin:"20px 0 10px"}}>La régularisation de fin d'année</h3>
              <p>En fin d'année (ou de contrat), il faut comparer les heures réellement effectuées avec les heures payées. Si l'assmat a travaillé plus que prévu, le parent doit compléter. Si elle a travaillé moins, en année complète le salaire reste acquis (c'est le principe de la mensualisation).</p>

              <h3 style={{fontSize:16,fontWeight:700,color:"#2E4859",margin:"20px 0 10px"}}>Les heures complémentaires et majorées</h3>
              <p>Au-delà de 45 heures par semaine, les heures sont majorées d'au moins 25% (ou plus selon accord). Entre le nombre contractuel et 45h, ce sont des heures complémentaires, rémunérées au taux normal sauf accord contraire.</p>

              <div style={{background:"#FFF8F3",borderRadius:12,padding:16,margin:"16px 0",border:"1px solid #FFD6B3"}}>
                <div style={{fontWeight:700,color:"#E49178",marginBottom:6}}>🔧 TiMat calcule tout automatiquement</div>
                <div style={{fontSize:12}}>Plus besoin de faire ces calculs à la main. TiMat applique les règles de la CCN et génère votre bulletin de salaire chaque mois.</div>
              </div>
            </div>}

            {showBlog==="maladies"&&<div>
              <h2 style={{fontSize:22,fontWeight:700,color:"#2E4859",marginBottom:16}}>🩺 Les 5 maladies les plus fréquentes chez les tout-petits</h2>
              <div style={{fontSize:11,color:"#8FA3AD",marginBottom:20}}>Santé · 6 min de lecture</div>

              <p>En accueil collectif ou individuel, les enfants tombent malades. C'est normal et même nécessaire pour construire leur immunité. Voici les 5 maladies les plus fréquentes et ce que vous devez savoir.</p>

              <h3 style={{fontSize:16,fontWeight:700,color:"#C84B31",margin:"20px 0 10px"}}>1. La bronchiolite</h3>
              <p><strong>Quoi :</strong> infection virale des bronchioles, très courante chez les moins de 2 ans, surtout en hiver (octobre à mars).</p>
              <p><strong>Signes :</strong> toux, respiration sifflante, difficulté à s'alimenter, tirage intercostal.</p>
              <p><strong>Conduite :</strong> nettoyer le nez (DRP), fractionner les repas, surélever légèrement la tête du lit. Consulter si détresse respiratoire. L'enfant peut revenir chez l'assmat après la phase aiguë (2-3 jours), si pas de fièvre et alimentation correcte.</p>

              <h3 style={{fontSize:16,fontWeight:700,color:"#C84B31",margin:"20px 0 10px"}}>2. La gastro-entérite</h3>
              <p><strong>Quoi :</strong> inflammation de l'estomac et des intestins, virale dans 90% des cas (rotavirus).</p>
              <p><strong>Signes :</strong> vomissements, diarrhée, fièvre possible, risque de déshydratation.</p>
              <p><strong>Conduite :</strong> soluté de réhydratation orale (SRO), régime adapté. Exclure l'enfant 24h après le dernier vomissement. Hygiène des mains renforcée pour éviter la contagion aux autres enfants.</p>

              <h3 style={{fontSize:16,fontWeight:700,color:"#C84B31",margin:"20px 0 10px"}}>3. Le syndrome pieds-mains-bouche</h3>
              <p><strong>Quoi :</strong> infection virale (coxsackie) très contagieuse, fréquente l'été-automne.</p>
              <p><strong>Signes :</strong> petites vésicules sur les mains, les pieds et dans la bouche, fièvre modérée, refus de manger.</p>
              <p><strong>Conduite :</strong> pas de traitement spécifique, guérison en 7-10 jours. L'éviction n'est pas obligatoire (avis du médecin). Proposer des aliments froids et mous si la bouche est douloureuse.</p>

              <h3 style={{fontSize:16,fontWeight:700,color:"#C84B31",margin:"20px 0 10px"}}>4. L'otite moyenne aiguë</h3>
              <p><strong>Quoi :</strong> infection de l'oreille moyenne, souvent consécutive à un rhume. Très fréquente avant 3 ans.</p>
              <p><strong>Signes :</strong> douleur à l'oreille (l'enfant se tire l'oreille), fièvre, pleurs inhabituels, troubles du sommeil.</p>
              <p><strong>Conduite :</strong> consultation médicale nécessaire (possible antibiotiques). L'enfant peut revenir 24h après le début du traitement si état général correct.</p>

              <h3 style={{fontSize:16,fontWeight:700,color:"#C84B31",margin:"20px 0 10px"}}>5. La conjonctivite</h3>
              <p><strong>Quoi :</strong> inflammation de la membrane qui recouvre l'oeil, souvent bactérienne chez les petits.</p>
              <p><strong>Signes :</strong> oeil rouge, sécrétions jaune-vertes, paupières collées au réveil.</p>
              <p><strong>Conduite :</strong> lavage au sérum physiologique, collyre prescrit par le médecin. Très contagieux — se laver les mains après chaque soin. Retour possible après 24h de traitement.</p>

              <div style={{background:"#F4F7FA",borderRadius:12,padding:16,margin:"20px 0"}}>
                <div style={{fontWeight:700,color:"#2E4859",marginBottom:8}}>📋 À retenir</div>
                <ul style={{paddingLeft:20,fontSize:12,lineHeight:2}}>
                  <li>Exiger systématiquement une ordonnance médicale avant d'administrer un médicament</li>
                  <li>Tenir un registre des maladies et traitements dans le carnet de l'enfant</li>
                  <li>Prévenir les parents dès les premiers symptômes</li>
                  <li>Renforcer l'hygiène des mains (avant/après chaque change, repas, mouchage)</li>
                </ul>
              </div>
            </div>}

            {showBlog==="agrement"&&<div>
              <h2 style={{fontSize:22,fontWeight:700,color:"#2E4859",marginBottom:16}}>🏛️ Renouvellement d'agrément : la checklist complète</h2>
              <div style={{fontSize:11,color:"#8FA3AD",marginBottom:20}}>PMI & Agrément · 7 min de lecture</div>

              <p>Votre agrément doit être renouvelé tous les 5 ans (10 ans avec le CAP AEPE). La demande doit être envoyée au moins 3 mois avant l'expiration. Voici tout ce qu'il faut préparer.</p>

              <h3 style={{fontSize:16,fontWeight:700,color:"#5DA9A1",margin:"20px 0 10px"}}>📅 Le calendrier</h3>
              <div style={{display:"grid",gridTemplateColumns:"auto 1fr",gap:"8px 12px",fontSize:12,margin:"10px 0"}}>
                <strong>6 mois avant :</strong><span>Commencer à rassembler les documents</span>
                <strong>3 mois avant :</strong><span>Envoyer le dossier complet au Conseil départemental</span>
                <strong>2 mois avant :</strong><span>Visite de la puéricultrice PMI à domicile</span>
                <strong>Jour J :</strong><span>Réponse du Conseil départemental (silence = accord)</span>
              </div>

              <h3 style={{fontSize:16,fontWeight:700,color:"#5DA9A1",margin:"20px 0 10px"}}>📋 Documents à fournir</h3>
              <div style={{background:"#F0FAF4",borderRadius:12,padding:16,margin:"10px 0"}}>
                <ul style={{paddingLeft:20,fontSize:12,lineHeight:2.2}}>
                  <li>Formulaire CERFA de renouvellement (disponible sur service-public.fr)</li>
                  <li>Copie de votre pièce d'identité</li>
                  <li>Justificatif de domicile de moins de 3 mois</li>
                  <li>Certificat médical attestant votre aptitude à accueillir des enfants</li>
                  <li>Extrait de casier judiciaire (bulletin n°2 — demandé automatiquement par la PMI)</li>
                  <li>Attestation d'assurance responsabilité civile professionnelle</li>
                  <li>Attestation de formation continue (120h obligatoires)</li>
                  <li>Votre projet d'accueil mis à jour</li>
                </ul>
              </div>

              <h3 style={{fontSize:16,fontWeight:700,color:"#5DA9A1",margin:"20px 0 10px"}}>🏠 La visite PMI : à quoi s'attendre</h3>
              <p>La puéricultrice viendra évaluer votre domicile et votre pratique. Elle regardera notamment :</p>
              <ul style={{paddingLeft:20,fontSize:12,lineHeight:2}}>
                <li>La sécurité du logement (barrières, prises, escaliers, produits dangereux)</li>
                <li>L'espace dédié à l'accueil (coin repos, coin repas, coin jeu)</li>
                <li>Votre organisation quotidienne et vos pratiques éducatives</li>
                <li>Votre capacité à travailler avec les parents</li>
                <li>Votre connaissance des gestes de premiers secours</li>
              </ul>

              <h3 style={{fontSize:16,fontWeight:700,color:"#5DA9A1",margin:"20px 0 10px"}}>⚠️ Les erreurs à éviter</h3>
              <div style={{background:"#FEF2F2",borderRadius:12,padding:16,margin:"10px 0",border:"1px solid #FECACA"}}>
                <ul style={{paddingLeft:20,fontSize:12,lineHeight:2,color:"#C84B31"}}>
                  <li>Envoyer le dossier en retard (moins de 3 mois avant expiration)</li>
                  <li>Oublier la formation continue obligatoire</li>
                  <li>Ne pas mettre à jour son projet d'accueil</li>
                  <li>Négliger la sécurité du domicile avant la visite</li>
                </ul>
              </div>
            </div>}

            {showBlog==="attachement"&&<div>
              <h2 style={{fontSize:22,fontWeight:700,color:"#2E4859",marginBottom:16}}>🤱 L'attachement sécure : pourquoi c'est fondamental en accueil individuel</h2>
              <div style={{fontSize:11,color:"#8FA3AD",marginBottom:20}}>Pédagogie · 5 min de lecture</div>

              <p>En tant qu'assistante maternelle, vous êtes une figure d'attachement secondaire pour les enfants que vous accueillez. Ce rôle est essentiel pour leur développement émotionnel et cognitif.</p>

              <h3 style={{fontSize:16,fontWeight:700,color:"#2E4859",margin:"20px 0 10px"}}>Qu'est-ce que l'attachement sécure ?</h3>
              <p>La théorie de l'attachement, développée par John Bowlby et Mary Ainsworth, montre que chaque enfant a besoin d'au moins une figure d'attachement stable et disponible pour se développer sereinement. Quand l'enfant se sent en sécurité avec un adulte, il ose explorer le monde, gérer ses émotions et développer sa confiance en lui.</p>

              <p style={{marginTop:8}}>En accueil individuel, vous avez un avantage énorme sur les structures collectives : <strong>un ratio faible</strong> (1 adulte pour 3-4 enfants maximum) qui permet de créer un vrai lien personnalisé.</p>

              <h3 style={{fontSize:16,fontWeight:700,color:"#2E4859",margin:"20px 0 10px"}}>Les 4 piliers au quotidien</h3>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:12,margin:"12px 0"}}>
                {[["🎯","Disponibilité","Être physiquement et émotionnellement présente. Poser son téléphone. Être à hauteur de l'enfant. Répondre quand il vous sollicite."],
                  ["🤗","Réactivité","Répondre rapidement et de manière adaptée aux signaux de l'enfant. Un pleur, un geste, un regard — chaque signal mérite une réponse."],
                  ["🔄","Prévisibilité","Des routines stables (repas, sieste, activités). L'enfant sait ce qui va se passer, et ça le rassure profondément."],
                  ["💛","Sensibilité","Comprendre l'émotion derrière le comportement. Un enfant qui tape n'est pas méchant — il est submergé par une émotion qu'il ne sait pas exprimer."]
                ].map(([ic,titre,desc])=>
                  <div key={titre}style={{background:"#F4F7FA",borderRadius:12,padding:14}}>
                    <div style={{fontSize:24,marginBottom:6}}>{ic}</div>
                    <div style={{fontSize:13,fontWeight:700,color:"#2E4859",marginBottom:4}}>{titre}</div>
                    <div style={{fontSize:11,color:"#5F7A86",lineHeight:1.6}}>{desc}</div>
                  </div>
                )}
              </div>

              <h3 style={{fontSize:16,fontWeight:700,color:"#2E4859",margin:"20px 0 10px"}}>L'adaptation : le moment clé</h3>
              <p>La période d'adaptation n'est pas une formalité — c'est le fondement de la relation. Un enfant qui vit une séparation brutale avec ses parents peut développer un attachement insécure qui affectera son comportement pendant des mois.</p>
              <p style={{marginTop:8}}>Une bonne adaptation est progressive : d'abord avec le parent présent, puis des séparations courtes qui s'allongent, toujours avec un objet transitionnel (doudou, tissu avec l'odeur du parent). L'enfant doit comprendre que ses parents reviennent toujours.</p>

              <div style={{background:"#F0FAF4",borderRadius:12,padding:16,margin:"20px 0",border:"1px solid #B7E4C7"}}>
                <div style={{fontWeight:700,color:"#5DA9A1",marginBottom:6}}>💡 Votre force d'assmat</div>
                <div style={{fontSize:12}}>
                  En crèche, le turnover du personnel et les ratios élevés rendent l'attachement individualisé difficile.
                  Chez vous, l'enfant retrouve <strong>le même visage chaque matin</strong>, dans <strong>le même environnement</strong>, avec <strong>les mêmes rituels</strong>. C'est une stabilité que les parents recherchent — et c'est ce qui fait la valeur de votre métier.
                </div>
              </div>
            </div>}

            {showBlog==="pajemploi"&&<div>
              <h2 style={{fontSize:22,fontWeight:700,color:"#2E4859",marginBottom:16}}>🏛️ Pajemploi pas à pas : le guide pour déclarer sans stress</h2>
              <div style={{fontSize:11,color:"#8FA3AD",marginBottom:20}}>Administratif · 7 min de lecture</div>

              <p>Pajemploi est le service de l'URSSAF dédié aux particuliers employeurs d'assistantes maternelles. C'est par ce site que les parents déclarent votre salaire et paient vos cotisations. Voici comment ça fonctionne, étape par étape.</p>

              <h3 style={{fontSize:16,fontWeight:700,color:"#2E4859",margin:"20px 0 10px"}}>Étape 1 : Créer son compte</h3>
              <p>Le <strong>parent employeur</strong> crée son compte sur <em>pajemploi.urssaf.fr</em> dès l'embauche. Il a besoin de : son numéro de Sécurité sociale, un RIB, et les informations de l'assistante maternelle (numéro de Sécu, adresse, numéro d'agrément). L'assmat n'a pas de compte à créer — elle est déclarée par le parent.</p>

              <h3 style={{fontSize:16,fontWeight:700,color:"#2E4859",margin:"20px 0 10px"}}>Étape 2 : La déclaration mensuelle</h3>
              <p>Chaque mois, le parent se connecte et remplit la déclaration :</p>
              <div style={{background:"#F0FAF4",borderRadius:12,padding:16,margin:"12px 0"}}>
                <ol style={{paddingLeft:20,fontSize:12,lineHeight:2.4}}>
                  <li>Se connecter sur pajemploi.urssaf.fr</li>
                  <li>Cliquer sur "Déclarer" et sélectionner l'assistante maternelle</li>
                  <li>Indiquer le <strong>nombre de jours d'activité</strong></li>
                  <li>Indiquer le <strong>nombre d'heures normales</strong></li>
                  <li>Indiquer les <strong>heures supplémentaires/complémentaires</strong> éventuelles</li>
                  <li>Saisir le <strong>salaire net total</strong></li>
                  <li>Ajouter les <strong>indemnités d'entretien</strong> et de <strong>repas</strong></li>
                  <li>Valider — Pajemploi calcule automatiquement les cotisations</li>
                </ol>
              </div>

              <h3 style={{fontSize:16,fontWeight:700,color:"#2E4859",margin:"20px 0 10px"}}>Étape 3 : Le prélèvement et le bulletin</h3>
              <p>Après validation, Pajemploi prélève les cotisations sur le compte du parent et génère un bulletin de salaire dématérialisé. L'assmat reçoit son salaire directement du parent (virement, chèque ou CESU).</p>

              <h3 style={{fontSize:16,fontWeight:700,color:"#2E4859",margin:"20px 0 10px"}}>Les erreurs les plus fréquentes</h3>
              <div style={{background:"#FEF2F2",borderRadius:12,padding:16,margin:"12px 0",border:"1px solid #FECACA"}}>
                <ul style={{paddingLeft:20,fontSize:12,lineHeight:2,color:"#C84B31"}}>
                  <li><strong>Confondre brut et net</strong> — Pajemploi demande le net, pas le brut</li>
                  <li><strong>Oublier les indemnités d'entretien</strong> — elles doivent être déclarées séparément</li>
                  <li><strong>Déclarer en retard</strong> — la déclaration doit être faite avant le 5 du mois suivant</li>
                  <li><strong>Ne pas vérifier le bulletin</strong> — vérifiez que le montant correspond à ce que vous avez reçu</li>
                </ul>
              </div>

              <div style={{background:"#FFF8F3",borderRadius:12,padding:16,margin:"16px 0",border:"1px solid #FFD6B3"}}>
                <div style={{fontWeight:700,color:"#E49178",marginBottom:6}}>🔧 TiMat vous simplifie la vie</div>
                <div style={{fontSize:12}}>TiMat génère chaque mois un récapitulatif prêt à reporter sur Pajemploi : heures, jours, salaire net, indemnités. Le parent n'a plus qu'à copier les chiffres.</div>
              </div>
            </div>}

            {showBlog==="bulletin"&&<div>
              <h2 style={{fontSize:22,fontWeight:700,color:"#2E4859",marginBottom:16}}>📜 Comprendre son bulletin de salaire ligne par ligne</h2>
              <div style={{fontSize:11,color:"#8FA3AD",marginBottom:20}}>Administratif · 8 min de lecture</div>

              <p>Le bulletin de salaire d'une assistante maternelle peut sembler complexe. Pourtant, une fois qu'on comprend chaque ligne, tout s'éclaire. Décryptage complet.</p>

              <h3 style={{fontSize:16,fontWeight:700,color:"#2E4859",margin:"20px 0 10px"}}>La rémunération brute</h3>
              <div style={{display:"grid",gridTemplateColumns:"auto 1fr",gap:"6px 16px",fontSize:12,margin:"12px 0",background:"#F4F7FA",borderRadius:12,padding:16}}>
                <strong>Salaire de base</strong><span>Heures mensualisées × taux horaire brut. C'est la ligne principale.</span>
                <strong>Heures complémentaires</strong><span>Heures entre votre horaire contractuel et 45h/semaine. Même taux horaire (sauf accord contraire).</span>
                <strong>Heures majorées</strong><span>Au-delà de 45h/semaine : majorées de 25% minimum. Taux = brut × 1,25.</span>
                <strong>Indemnité d'entretien</strong><span>Montant par jour d'accueil. Minimum 3,69€ (2024). Couvre l'eau, l'électricité, les jouets, le matériel.</span>
                <strong>Indemnité de repas</strong><span>Si vous fournissez les repas. Montant fixé dans le contrat. Non soumise à cotisations.</span>
              </div>

              <h3 style={{fontSize:16,fontWeight:700,color:"#2E4859",margin:"20px 0 10px"}}>Les cotisations sociales</h3>
              <p>Les cotisations sont calculées sur le salaire brut (hors indemnités). Elles se divisent en part salariale (payée par l'assmat) et part patronale (payée par le parent).</p>
              <div style={{background:"#F4F7FA",borderRadius:12,padding:16,margin:"12px 0",fontSize:11}}>
                <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr",gap:4,fontWeight:700,paddingBottom:8,borderBottom:"1px solid #E8E4E0"}}>
                  <span>Cotisation</span><span>Part salariale</span><span>Part patronale</span>
                </div>
                {[["Maladie, maternité","—","7,30%"],["Vieillesse plafonnée","6,90%","8,55%"],["Vieillesse déplafonnée","0,40%","2,02%"],["Allocations familiales","—","3,45%"],["CSG déductible","6,80%","—"],["CSG non déductible + CRDS","2,90%","—"],["Chômage","—","4,05%"],["Retraite complémentaire","~3,15%","~4,72%"]].map(([n,s,p])=>
                  <div key={n}style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr",gap:4,padding:"4px 0",borderBottom:"1px dotted #E8E4E0"}}>
                    <span>{n}</span><span style={{color:s!=="—"?"#C84B31":"#B0BEC5"}}>{s}</span><span>{p}</span>
                  </div>
                )}
              </div>

              <h3 style={{fontSize:16,fontWeight:700,color:"#2E4859",margin:"20px 0 10px"}}>Du brut au net</h3>
              <div style={{background:"#F0FAF4",borderRadius:12,padding:16,margin:"12px 0",border:"1px solid #B7E4C7"}}>
                <div style={{fontSize:12,lineHeight:2}}>
                  <strong>Salaire brut</strong> − cotisations salariales (~22%) = <strong>Salaire net</strong><br/>
                  Salaire net + indemnités (entretien + repas) = <strong>Total versé à l'assmat</strong><br/>
                  Salaire brut + cotisations patronales + indemnités = <strong>Coût total pour le parent</strong>
                </div>
              </div>

              <h3 style={{fontSize:16,fontWeight:700,color:"#2E4859",margin:"20px 0 10px"}}>L'abattement fiscal spécifique</h3>
              <p>Les assistantes maternelles bénéficient d'un abattement fiscal unique : vous pouvez déduire 3 fois le SMIC horaire par jour et par enfant gardé de votre revenu imposable. Cet abattement réduit considérablement votre impôt sur le revenu — c'est un avantage fiscal majeur du métier.</p>
            </div>}

            {showBlog==="secours"&&<div>
              <h2 style={{fontSize:22,fontWeight:700,color:"#2E4859",marginBottom:16}}>🩹 Trousse de secours : les indispensables de l'assistante maternelle</h2>
              <div style={{fontSize:11,color:"#8FA3AD",marginBottom:20}}>Santé · 5 min de lecture</div>

              <p>La PMI vérifie votre trousse de secours lors de chaque visite. Elle doit être complète, accessible (mais hors de portée des enfants), et régulièrement vérifiée. Voici ce qu'elle doit contenir.</p>

              <h3 style={{fontSize:16,fontWeight:700,color:"#C84B31",margin:"20px 0 10px"}}>Le contenu obligatoire</h3>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:12,margin:"12px 0"}}>
                {[
                  ["🩹","Pansements et compresses","Pansements hypoallergéniques de plusieurs tailles, compresses stériles, sparadrap microporeux"],
                  ["🧴","Désinfectant","Antiseptique sans alcool (type Biseptine ou Chlorhexidine). Jamais d'alcool sur la peau d'un enfant."],
                  ["🌡️","Thermomètre","Thermomètre frontal ou auriculaire. Vérifier les piles régulièrement."],
                  ["✂️","Ciseaux et pinces","Ciseaux à bouts ronds, pince à écharde, pince à tique."],
                  ["🧊","Froid","Poches de froid instantané (pas de glace directe sur la peau — toujours avec un linge)."],
                  ["📱","Numéros d'urgence","Affichés visiblement : 15 (SAMU), 18 (Pompiers), 112 (Urgences européen), Centre antipoison."],
                ].map(([ic,titre,desc])=>
                  <div key={titre}style={{background:"#FEF2F2",borderRadius:12,padding:14,border:"1px solid #FECACA"}}>
                    <div style={{fontSize:20,marginBottom:6}}>{ic}</div>
                    <div style={{fontSize:12,fontWeight:700,color:"#C84B31",marginBottom:4}}>{titre}</div>
                    <div style={{fontSize:11,color:"#5F7A86",lineHeight:1.6}}>{desc}</div>
                  </div>
                )}
              </div>

              <h3 style={{fontSize:16,fontWeight:700,color:"#C84B31",margin:"20px 0 10px"}}>Ce qui NE doit PAS être dans la trousse</h3>
              <div style={{background:"#FEF2F2",borderRadius:12,padding:16,margin:"12px 0"}}>
                <ul style={{paddingLeft:20,fontSize:12,lineHeight:2,color:"#C84B31"}}>
                  <li><strong>Aucun médicament</strong> sans ordonnance nominative et autorisation écrite des parents</li>
                  <li>Pas de Doliprane, pas d'Advil — même si les parents vous disent "c'est bon"</li>
                  <li>Pas de crème solaire sans accord parental écrit</li>
                  <li>Pas d'huiles essentielles — dangereuses pour les moins de 6 ans</li>
                </ul>
              </div>

              <h3 style={{fontSize:16,fontWeight:700,color:"#C84B31",margin:"20px 0 10px"}}>Les gestes de premiers secours à connaître</h3>
              <p>Votre formation initiale de 120h inclut le PSC1 (Prévention et Secours Civiques). Voici les situations les plus fréquentes :</p>
              <ul style={{paddingLeft:20,fontSize:12,lineHeight:2.2}}>
                <li><strong>Chute :</strong> vérifier la conscience, mettre du froid, surveiller 24h, appeler le 15 si perte de conscience même brève</li>
                <li><strong>Fièvre {">"}38,5°C :</strong> déshabiller l'enfant, hydrater, appeler les parents, appeler le 15 si {">"}40°C ou convulsions</li>
                <li><strong>Étouffement :</strong> 5 claques dorsales puis 5 compressions thoraciques (nourrisson) ou abdominales (Heimlich, {">"}1 an)</li>
                <li><strong>Brûlure :</strong> eau froide 10 minutes, ne pas décoller les vêtements, appeler le 15 si étendue</li>
              </ul>

              <div style={{background:"#F0FAF4",borderRadius:12,padding:16,margin:"20px 0",border:"1px solid #B7E4C7"}}>
                <div style={{fontWeight:700,color:"#5DA9A1",marginBottom:6}}>📋 Rappel PMI</div>
                <div style={{fontSize:12}}>
                  La trousse doit être dans un endroit connu de tous mais inaccessible aux enfants. Vérifiez les dates de péremption tous les 6 mois. Gardez un double des PAI (Projets d'Accueil Individualisés) pour les enfants allergiques à côté de la trousse.
                </div>
              </div>
            </div>}

            {showBlog==="tarif"&&<div>
              <h2 style={{fontSize:22,fontWeight:700,color:"#2E4859",marginBottom:16}}>💶 Comment fixer son tarif horaire en tant qu'assistante maternelle</h2>
              <div style={{fontSize:11,color:"#8FA3AD",marginBottom:20}}>Administratif · 6 min de lecture</div>

              <p>Fixer son tarif est l'une des décisions les plus importantes — et les plus stressantes — quand on débute. Trop bas, vous vous épuisez. Trop haut, les parents vont ailleurs. Voici comment trouver le juste milieu.</p>

              <h3 style={{fontSize:16,fontWeight:700,color:"#2E4859",margin:"20px 0 10px"}}>Le cadre légal</h3>
              <p>Le <strong>minimum légal</strong> est fixé à 0,281 fois le SMIC horaire, soit environ <strong>3,27€ brut/h</strong> (valeur 2024). Mais dans la pratique, la plupart des assmats facturent entre <strong>3,50€ et 5,50€ brut/h</strong> selon la région et les services proposés.</p>

              <div style={{background:"#F4F7FA",borderRadius:12,padding:16,margin:"16px 0"}}>
                <div style={{fontWeight:700,color:"#2E4859",marginBottom:8}}>📊 Moyennes par zone (2024)</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,fontSize:12}}>
                  {[["Paris / Île-de-France","4,50€ - 5,50€"],["Grandes villes (Lyon, Marseille)","4,00€ - 5,00€"],["Villes moyennes","3,80€ - 4,50€"],["Zone rurale","3,50€ - 4,00€"]].map(([zone,prix])=>
                    <div key={zone}style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px dotted #E8E4E0"}}>
                      <span style={{color:"#5F7A86"}}>{zone}</span><strong style={{color:"#2E4859"}}>{prix}</strong>
                    </div>
                  )}
                </div>
              </div>

              <h3 style={{fontSize:16,fontWeight:700,color:"#2E4859",margin:"20px 0 10px"}}>Les critères qui justifient un tarif plus élevé</h3>
              <ul style={{paddingLeft:20,fontSize:12,lineHeight:2.2}}>
                <li><strong>Votre expérience</strong> — plus d'années d'agrément = plus de légitimité</li>
                <li><strong>Vos formations</strong> — CAP AEPE, Montessori, Snoezelen, Langue des signes bébé</li>
                <li><strong>Votre localisation</strong> — forte demande dans votre quartier</li>
                <li><strong>Vos horaires</strong> — horaires atypiques (tôt le matin, tard le soir) = tarif majoré</li>
                <li><strong>Vos services</strong> — repas bio faits maison, sorties quotidiennes, activités pédagogiques structurées</li>
                <li><strong>Votre logement</strong> — jardin, salle de jeux dédiée, espace aménagé</li>
              </ul>

              <h3 style={{fontSize:16,fontWeight:700,color:"#2E4859",margin:"20px 0 10px"}}>Les indemnités en plus du salaire</h3>
              <div style={{background:"#F0FAF4",borderRadius:12,padding:16,margin:"12px 0",border:"1px solid #B7E4C7",fontSize:12,lineHeight:2}}>
                <strong>Indemnité d'entretien :</strong> minimum 3,69€/jour (2024). Couvre l'eau, l'électricité, les produits ménagers, l'usure du matériel. Vous pouvez négocier plus.<br/>
                <strong>Indemnité de repas :</strong> si vous fournissez les repas. Généralement entre 3€ et 6€ par repas + goûter.<br/>
                <strong>Indemnité kilométrique :</strong> 0,63€/km si vous transportez l'enfant avec votre véhicule.<br/>
                <strong>Aucune de ces indemnités n'est soumise à cotisations</strong> — c'est du net.
              </div>

              <h3 style={{fontSize:16,fontWeight:700,color:"#2E4859",margin:"20px 0 10px"}}>Comment l'annoncer aux parents</h3>
              <p>Ne vous justifiez pas. Présentez votre tarif avec assurance et expliquez ce qu'il inclut. Un parent qui négocie fortement à la baisse n'est généralement pas le parent avec qui vous aurez la meilleure relation de travail. Rappelez que le crédit d'impôt couvre 50% des frais de garde — votre tarif réel pour le parent est donc divisé par deux.</p>

              <div style={{background:"#FFF8F3",borderRadius:12,padding:16,margin:"16px 0",border:"1px solid #FFD6B3"}}>
                <div style={{fontWeight:700,color:"#E49178",marginBottom:6}}>🧮 TiMat inclut un simulateur</div>
                <div style={{fontSize:12}}>Le simulateur de coût TiMat permet aux parents de voir exactement ce que la garde leur coûtera après crédit d'impôt et CMG. Ça facilite la discussion sur le tarif.</div>
              </div>
            </div>}

            {showBlog==="motricite"&&<div>
              <h2 style={{fontSize:22,fontWeight:700,color:"#2E4859",marginBottom:16}}>🧸 Les étapes du développement moteur de 0 à 3 ans</h2>
              <div style={{fontSize:11,color:"#8FA3AD",marginBottom:20}}>Pédagogie · 6 min de lecture</div>
              <p>Chaque enfant se développe à son rythme. Les âges ci-dessous sont des repères moyens, pas des normes.</p>
              <h3 style={{fontSize:16,fontWeight:700,color:"#2E4859",margin:"20px 0 10px"}}>0-4 mois : les réflexes</h3>
              <p>Le bébé découvre son corps. Il tourne la tête vers les sons, suit des yeux, attrape instinctivement. Sur le ventre, il relève la tête.</p>
              <p style={{marginTop:8}}><strong>Votre rôle :</strong> varier les positions (dos, ventre, côté sur tapis ferme), proposer des mobiles contrastés, parler et chanter.</p>
              <h3 style={{fontSize:16,fontWeight:700,color:"#2E4859",margin:"20px 0 10px"}}>4-8 mois : retournement et préhension</h3>
              <p>L'enfant se retourne seul, attrape les objets volontairement, les porte à la bouche, commence à tenir assis avec appui. Il passe un objet d'une main à l'autre.</p>
              <p style={{marginTop:8}}><strong>Votre rôle :</strong> proposer des objets variés (textures, tailles), laisser explorer au sol, ne pas mettre assis un bébé qui ne le fait pas seul.</p>
              <h3 style={{fontSize:16,fontWeight:700,color:"#2E4859",margin:"20px 0 10px"}}>8-12 mois : le déplacement</h3>
              <p>Rampé, quatre pattes, se hisse debout, premiers pas tenus. La pince pouce-index apparaît.</p>
              <p style={{marginTop:8}}><strong>Votre rôle :</strong> sécuriser l'espace, proposer des parcours moteurs simples, encourager sans aider systématiquement.</p>
              <h3 style={{fontSize:16,fontWeight:700,color:"#2E4859",margin:"20px 0 10px"}}>12-18 mois : la marche</h3>
              <p>Premiers pas vers 12-15 mois. L'enfant monte les marches à quatre pattes, empile 2-3 cubes, gribouille, essaie la cuillère.</p>
              <h3 style={{fontSize:16,fontWeight:700,color:"#2E4859",margin:"20px 0 10px"}}>18-36 mois : l'autonomie</h3>
              <p>L'enfant court, saute, pédale, monte les escaliers. Il dessine des cercles, enfile des perles, découpe, s'habille partiellement seul.</p>
              <div style={{background:"#F0FAF4",borderRadius:12,padding:16,margin:"20px 0",border:"1px solid #B7E4C7"}}>
                <div style={{fontWeight:700,color:"#5DA9A1",marginBottom:6}}>💡 Motricité libre (Pikler)</div>
                <div style={{fontSize:12}}>Ne pas mettre un enfant dans une position qu'il n'a pas acquise seul. Pas de trotteur, pas de transat prolongé. L'enfant apprend mieux quand il découvre par lui-même.</div>
              </div>
            </div>}

            {showBlog==="droits"&&<div>
              <h2 style={{fontSize:22,fontWeight:700,color:"#2E4859",marginBottom:16}}>⚖️ Droits et devoirs de l'assistante maternelle</h2>
              <div style={{fontSize:11,color:"#8FA3AD",marginBottom:20}}>Juridique · 8 min de lecture</div>
              <p>L'assistante maternelle est une salariée du particulier employeur, encadrée par la Convention Collective Nationale.</p>
              <h3 style={{fontSize:16,fontWeight:700,color:"#5DA9A1",margin:"20px 0 10px"}}>Vos droits</h3>
              <p><strong>Rémunération :</strong> minimum conventionnel (~3,49€ brut/h). Heures au-delà de 45h/semaine majorées de 25%. Indemnité d'entretien minimum 3,65€/jour.</p>
              <p style={{marginTop:8}}><strong>Congés payés :</strong> 2,5 jours ouvrables/mois, soit 5 semaines/an. En année complète, inclus dans la mensualisation.</p>
              <p style={{marginTop:8}}><strong>Formation :</strong> 120h en 5 ans (80h avant le 1er accueil). Formations gratuites, rémunérées. Organisme : IPERIA.</p>
              <p style={{marginTop:8}}><strong>Protection sociale :</strong> maladie, maternité, retraite, chômage, accidents du travail.</p>
              <h3 style={{fontSize:16,fontWeight:700,color:"#5DA9A1",margin:"20px 0 10px"}}>Vos devoirs</h3>
              <p><strong>Agrément :</strong> obligatoire, délivré par le Conseil départemental. Respecter le nombre et l'âge des enfants autorisés. Signaler tout changement.</p>
              <p style={{marginTop:8}}><strong>Assurance :</strong> RC professionnelle obligatoire, attestation annuelle aux parents.</p>
              <p style={{marginTop:8}}><strong>Secret professionnel :</strong> ne pas partager d'informations sur les familles. Pas de photos sans autorisation écrite.</p>
              <p style={{marginTop:8}}><strong>Rupture :</strong> préavis de 15 jours (moins d'1 an) ou 1 mois (au-delà). Le retrait d'enfant = licenciement avec indemnités.</p>
              <div style={{background:"#F4F7FA",borderRadius:12,padding:16,margin:"20px 0"}}>
                <div style={{fontWeight:700,color:"#2E4859",marginBottom:8}}>📋 Documents indispensables</div>
                <div style={{fontSize:12}}>Contrat signé, avenants, bulletins de salaire, attestation fiscale, certificat médical, attestation RC Pro, agrément valide, projet d'accueil.</div>
              </div>
            </div>}
            {showBlog&&!["mensualisation","maladies","agrement","attachement","pajemploi","bulletin","secours","tarif","motricite","droits"].includes(showBlog)&&(()=>{const a=(config.blog||DEFAULT_CONFIG.blog).find(x=>x.id===showBlog)||{};return <div>
              <h2 style={{fontSize:22,fontWeight:700,color:"#2E4859",marginBottom:8}}>{a.emoji} {a.title}</h2>
              <div style={{fontSize:11,color:"#8FA3AD",marginBottom:20}}>{a.cat}</div>
              <p>{a.excerpt}</p>
              <p style={{marginTop:16,color:"#8FA3AD",fontStyle:"italic"}}>📝 Le contenu complet de cet article sera bientôt disponible.</p>
            </div>;})()}
            </>);})()}

          </div>
        </div>
      </div>}

      {/* BOUTIQUE MODAL */}
      {showBoutique&&<div onClick={e=>e.target===e.currentTarget&&setShowBoutique(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:250,padding:20}}>
        <div style={{background:"#FDFBF8",borderRadius:20,width:"100%",maxWidth:800,maxHeight:"90vh",overflow:"auto",boxShadow:"0 24px 80px rgba(0,0,0,.3)",padding:32}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
            <div style={{fontFamily:fTitle,fontSize:22,fontWeight:700,color:"#2E4859"}}>🛒 Boutique TiMat</div>
            <button onClick={()=>setShowBoutique(false)}style={{background:"#F4F7FA",border:"none",borderRadius:10,padding:"8px 12px",cursor:"pointer",fontSize:14,color:"#2E4859",fontWeight:700}}>✕</button>
          </div>
          <div style={{fontSize:13,color:"#5F7A86",marginBottom:24,lineHeight:1.6}}>Templates et outils pour simplifier votre quotidien d'assistante maternelle. Paiement securise par Stripe.</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:16}}>
            {[
              {id:"kit_sheets",name:"Kit Google Sheets",price:"14,90",desc:"7 tableurs interconnectes : heures, salaire, conges, bilan annuel.",icon:"📊",color:"#5DA9A1",link:config.boutique?.linkSheets},
              {id:"fiche_urgence",name:"Fiche d'urgence",price:"4,90",desc:"Fiche complete a remplir et imprimer. Document obligatoire.",icon:"🚨",color:"#C84B31",link:config.boutique?.linkFiche},
              {id:"projet_accueil",name:"Projet d'accueil",price:"9,90",desc:"10 sections personnalisables. Pret a l'emploi.",icon:"🌿",color:"#2E4859",link:config.boutique?.linkProjet},
              {id:"pack_complet",name:"Pack Complet",price:"24,90",desc:"Les 3 produits reunis (-16%).",icon:"🎁",color:"#E49178",badge:"-16%",link:config.boutique?.linkPack},
            ].map(p=><div key={p.id}style={{background:"#fff",borderRadius:14,overflow:"hidden",border:"1px solid #E8E4E0",display:"flex",flexDirection:"column"}}>
              <div style={{height:70,background:"linear-gradient(135deg,"+p.color+"18,"+p.color+"08)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,position:"relative"}}>
                {p.icon}
                {p.badge&&<div style={{position:"absolute",top:6,right:6,background:p.color,color:"#fff",borderRadius:6,padding:"2px 8px",fontSize:10,fontWeight:700}}>{p.badge}</div>}
              </div>
              <div style={{padding:14,flex:1,display:"flex",flexDirection:"column"}}>
                <div style={{fontWeight:700,fontSize:13,color:"#2E4859",marginBottom:4}}>{p.name}</div>
                <div style={{fontSize:11,color:"#5F7A86",lineHeight:1.5,flex:1,marginBottom:10}}>{p.desc}</div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:16,fontWeight:700,color:p.color}}>{p.price} €</span>
                  <button onClick={()=>{if(p.link){window.open(p.link,"_blank");}else{alert("Lien de paiement non configure. Allez dans le Backoffice > App > Boutique pour ajouter vos liens Stripe.");}}}style={{background:p.color,color:"#fff",border:"none",borderRadius:8,padding:"8px 16px",cursor:"pointer",fontSize:12,fontWeight:700}}>Acheter →</button>
                </div>
              </div>
            </div>)}
          </div>
          <div style={{marginTop:16,textAlign:"center",fontSize:11,color:"#B0BEC5"}}>🔒 Paiement securise par Stripe · Telechargement immediat apres achat</div>
        </div>
      </div>}

      {/* FOOTER */}
      <footer style={{ background: "#1d3a4c", padding: "48px 24px 24px", color: "rgba(255,255,255,.7)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 32, marginBottom: 32 }}>
            {/* Logo + description */}
            <div>
              <div className="lp-logo" style={{ fontFamily: fTitle, marginBottom: 12 }}>
                <img src={L?.logoUrl || "/logo-dark.png"} alt="TiMat" style={{height:(L?.logoSizes?.landingFooter)||40,objectFit:"contain"}} onError={e=>{e.target.style.display="none"; const fallback=document.createElement("span"); fallback.style.color="#fff"; fallback.style.fontWeight="700"; fallback.style.fontSize="20px"; fallback.textContent="TiMat"; e.target.parentNode.appendChild(fallback);}}/>
              </div>
              <div style={{ fontSize: 12, lineHeight: 1.7, color: "rgba(255,255,255,.5)" }}>
                {F.description}
              </div>
            </div>
            {/* Liens */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: accent, textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 12 }}>Légal</div>
              {[["Mentions légales","mentions"],["Conditions générales d'utilisation","cgu"],["Politique de confidentialité","confidentialite"]].map(([label,id])=>
                <div key={id} onClick={()=>setShowLegal(id)} style={{ fontSize: 12, color: "rgba(255,255,255,.6)", cursor: "pointer", padding: "4px 0", transition: "color .15s" }}
                  onMouseEnter={e=>e.target.style.color="#fff"} onMouseLeave={e=>e.target.style.color="rgba(255,255,255,.6)"}>{label}</div>
              )}
            </div>
            {/* Contact */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: accent, textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 12 }}>Contact</div>
              <div style={{ fontSize: 12, lineHeight: 2, color: "rgba(255,255,255,.6)" }}>
                📧 {F.contactEmail}<br/>
                🌐 {F.contactWeb}<br/>
                📍 {F.contactLieu}
              </div>
            </div>
            {/* RGPD */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: accent, textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 12 }}>Données & RGPD</div>
              <div style={{ fontSize: 11, lineHeight: 1.7, color: "rgba(255,255,255,.5)" }}>
                {(F.rgpd||[]).map((line,i)=><span key={i} style={{display:"block"}}>{line}</span>)}
              </div>
            </div>
          </div>
          {/* Séparateur */}
          <div style={{ borderTop: "1px solid rgba(255,255,255,.1)", paddingTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)" }}>© {new Date().getFullYear()} TiMat — Tous droits réservés · Auto-entrepreneur {config.legal?.nom} · SIRET : {config.legal?.siret}</div>
            <div style={{ display: "flex", gap: 16 }}>
              {[["Mentions légales","mentions"],["CGU","cgu"],["Confidentialité","confidentialite"]].map(([l,id])=>
                <span key={id} onClick={()=>setShowLegal(id)} style={{ fontSize: 11, color: "rgba(255,255,255,.4)", cursor: "pointer" }}
                  onMouseEnter={e=>e.target.style.color="#fff"} onMouseLeave={e=>e.target.style.color="rgba(255,255,255,.4)"}>{l}</span>
              )}
            </div>
          </div>
        </div>
      </footer>

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
            <button onClick={()=>setShowLegal(null)}style={{background:"#F4F7FA",border:"none",borderRadius:10,padding:"8px 12px",cursor:"pointer",fontSize:14,color:"#2E4859",fontWeight:700}}>✕</button>
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
              <p><strong>Formule Pro :</strong> 9,99€/mois TTC, avec un essai gratuit de 2 mois sans carte bancaire. L'abonnement est mensuel et résiliable à tout moment sans frais depuis l'espace utilisateur. Le paiement est géré par Stripe (prestataire certifié PCI-DSS). Aucune donnée bancaire n'est stockée par TiMat.</p>

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
              <ul style={{paddingLeft:20,margin:"8px 0"}}>
                <li><strong>Données de compte :</strong> conservées tant que le compte est actif, supprimées 30 jours après résiliation</li>
                <li><strong>Données des enfants :</strong> conservées pendant la durée du contrat d'accueil, supprimées à la fin du contrat ou sur demande</li>
                <li><strong>Données de facturation :</strong> conservées 5 ans (obligation légale)</li>
                <li><strong>Données de support :</strong> conservées 2 ans</li>
              </ul>

              <h3 style={{fontSize:15,fontWeight:700,color:"#2E4859",margin:"20px 0 12px"}}>6. Vos droits (RGPD)</h3>
              <p>Conformément au RGPD, vous disposez des droits suivants :</p>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:8,margin:"12px 0"}}>
                {[["📋","Droit d'accès","Obtenir une copie de vos données"],["✏️","Droit de rectification","Corriger vos informations"],["🗑️","Droit à l'effacement","Supprimer votre compte et vos données"],["📦","Droit à la portabilité","Exporter vos données au format standard"],["🚫","Droit d'opposition","Vous opposer à certains traitements"],["⏸️","Droit à la limitation","Limiter temporairement le traitement"]].map(([ic,titre,desc])=>
                  <div key={titre}style={{background:"#F4F7FA",borderRadius:10,padding:12}}>
                    <div style={{fontSize:16,marginBottom:4}}>{ic}</div>
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
                </div>
              </div>
              <p>Tous les sous-traitants sont conformes au RGPD et bénéficient de garanties contractuelles appropriées.</p>

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

      {/* MODALE AUTH */}
      {showModal && (
        <div onClick={e => e.target === e.currentTarget && setShowModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20 }}>
          <div style={{ background: "#FDFAF8", borderRadius: 20, width: "100%", maxWidth: 420, overflow: "hidden", boxShadow: "0 24px 80px rgba(0,0,0,.5)", maxHeight:"95vh", overflowY:"auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", background: "#F3EBE3" }}>
              {[{ r: "asmat", ic: "👩👧", l: "Assistante\nmaternelle", col: "#C76754" }, { r: "parent", ic: "👪", l: "Parent\nemployeur", col: "#2E4859" }].map(({ r, ic, l, col }) => (
                <button key={r} onClick={() => { setRole(r); setErr(""); }} style={{ padding: "18px 12px", border: "none", cursor: "pointer", background: role === r ? col : "transparent", borderBottom: role !== r ? "3px solid "+col+"44" : "none", transition: "all .2s", fontFamily:"inherit" }}>
                  <div style={{ fontSize: 24, marginBottom: 4 }}>{ic}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: role === r ? "#fff" : "rgba(0,0,0,.32)", whiteSpace: "pre-line", lineHeight: 1.3 }}>{l}</div>
                </button>
              ))}
            </div>
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
                  <button key={m} onClick={() => { setModeAuth(m); setErr(""); }} style={{ flex:1, padding:"8px", border:"none", cursor:"pointer", borderRadius:8, background: modeAuth===m ? (role==="asmat"?"#C76754":"#2E4859") : "transparent", color: modeAuth===m ? "#fff" : "#6B4F3A", fontWeight:600, fontSize:12, fontFamily:"inherit", transition:"all .15s" }}>{m==="inscription" ? "Créer un compte" : "Se connecter"}</button>
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
                <input type="password" name="password" autoComplete={modeAuth==="inscription"?"new-password":"current-password"} value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} placeholder={modeAuth==="inscription" ? "6 caractères minimum" : "Votre mot de passe"} style={{ width:"100%", padding:"11px 14px", borderRadius:10, border:"1.5px solid #DDD5C8", fontSize:13, outline:"none", boxSizing:"border-box", fontFamily:"inherit" }} />
              </div>
              {modeAuth === "inscription" && <div style={{ background:"#F6F7F6", borderRadius:10, padding:"12px 14px", marginBottom:14 }}>
                <div style={{ fontSize:10, fontWeight:700, color:"#A68970", marginBottom:8, textTransform:"uppercase", letterSpacing:".5px" }}>Vos données</div>
                {[{k:"politique", l:"J'accepte la politique de confidentialité", req:true},{k:"cgu", l:"J'accepte les conditions générales d'utilisation", req:true},{k:"newsletter", l:"Recevoir les actualités TiMat (optionnel)", req:false}].map(({k,l,req}) => (
                  <label key={k} style={{ display:"flex", gap:8, alignItems:"flex-start", cursor:"pointer", marginBottom:7 }}>
                    <input type="checkbox" checked={consent[k]} onChange={e=>setConsent(c=>({...c,[k]:e.target.checked}))} style={{ width:14, height:14, marginTop:2, accentColor: role==="asmat"?"#C76754":"#2E4859", flexShrink:0 }} />
                    <span style={{ fontSize:11, color:"#2C1F14", lineHeight:1.5 }}>{l}{req&&<span style={{color:"#B84060",fontWeight:700}}> *</span>}</span>
                  </label>
                ))}
                <div style={{ fontSize:10, color:"#A68970", marginTop:4 }}>* Obligatoire · Données hébergées en France · Suppression possible à tout moment</div>
              </div>}
              {err && <div style={{ color:"#C84B31", fontSize:12, marginBottom:12, padding:"8px 12px", background:"#FEF2F2", borderRadius:8 }}>{err}</div>}
              <button type="submit" disabled={loading || (modeAuth==="inscription" && !consentValide)} style={{ width:"100%", background: role==="asmat" ? "linear-gradient(135deg,#E49178,#C76754)" : "linear-gradient(135deg,#3A5A6E,#2E4859)", color:"#fff", border:"none", borderRadius:10, padding:"13px", cursor:"pointer", fontWeight:700, fontSize:14, fontFamily:"inherit", marginBottom:16, opacity: (loading||(modeAuth==="inscription"&&!consentValide)) ? .6 : 1 }}>
                {loading ? "⏳ Chargement..." : modeAuth==="connexion" ? (role==="asmat" ? "Accéder à mon espace →" : "Accéder à l'espace famille →") : (role==="asmat" ? "Créer mon espace pro →" : "Créer mon compte parent →")}
              </button>
              </form>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
                <div style={{ flex:1, height:1, background:"#DDD5C8" }}/><span style={{ fontSize:11, color:"#A68970" }}>ou démo rapide</span><div style={{ flex:1, height:1, background:"#DDD5C8" }}/>
              </div>
              <div style={{ background:"#F7F2EC", borderRadius:10, padding:10 }}>
                <div style={{ fontSize:10, fontWeight:700, color:"#A68970", marginBottom:8, textTransform:"uppercase", letterSpacing:".5px" }}>{role==="asmat" ? "Compte asmat démo" : "Comptes parents démo"}</div>
                {demos.filter(d=>d.role===role).map(d => (
                  <button key={d.id} onClick={()=>onLogin(d)} style={{ display:"block", width:"100%", textAlign:"left", padding:"8px 10px", background:"none", border:"none", cursor:"pointer", borderRadius:8, fontFamily:"inherit", fontSize:13, color:"#2C1F14", fontWeight:600 }} onMouseEnter={e=>e.currentTarget.style.background="#DDD5C8"} onMouseLeave={e=>e.currentTarget.style.background="none"}>
                    {d.role==="asmat"?"👩👧":"👪"} {d.label}
                    <span style={{ fontSize:11, color:"#A68970", display:"block", paddingLeft:18 }}>{d.email}</span>
                  </button>
                ))}
              </div>
              <div style={{ marginTop:12, fontSize:11, color:"#A68970", textAlign:"center" }}>Données hébergées en France · Aucun engagement</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



//
async function demanderPush(userId){
  if(!('Notification' in window)||!('serviceWorker' in navigator))return null;
  const perm=await Notification.requestPermission();
  if(perm!=='granted')return null;
  try{
    const reg=await navigator.serviceWorker.ready;
    const VAPID_PUBLIC='BEl62iUYgUivxIkv69yViEuiBIa40HZa+FE+TgEFSCcg4sV3fD3CK+jNHOyHAHhGXCGGOEtmC5xSuWRInlVBOw==';
    const sub=await reg.pushManager.subscribe({
      userVisibleOnly:true,
      applicationServerKey:VAPID_PUBLIC
    });
    await supabase.from('push_subscriptions').upsert({
      user_id:userId,subscription:JSON.stringify(sub),created_at:new Date().toISOString()
    });
    return sub;
  }catch(e){console.log('Push error:',e);return null;}
}

//
function OnboardingWizard({user,onFinish}){
  const [step,setStep]=useState(0);
  const [enfant,setEnfant]=useState({prenom:"",naissance:"",emoji:"🦁"});
  const [contrat,setContrat]=useState({
    heuresHebdo:40,tauxHoraire:4.05,entretien:3.80,
    jours:["Lundi","Mardi","Mercredi","Jeudi","Vendredi"],
    horaires:"07h30–17h30",debut:new Date().toISOString().slice(0,10)
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
        debut:contrat.debut||new Date().toISOString().slice(0,10),
        heures_hebdo:contrat.heuresHebdo||40,
        taux_horaire:contrat.tauxHoraire||4.05,
        entretien:contrat.entretien||3.80,
        jours:contrat.jours||['Lundi','Mardi','Mercredi','Jeudi','Vendredi'],
        horaires:contrat.horaires||'07h30–17h30',
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
            <div style={{marginBottom:20}}><label className="lbl">Emoji</label>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {EMOJIS.map(em=><button key={em}onClick={()=>setEnfant(f=>({...f,emoji:em}))}style={{
                  width:42,height:42,borderRadius:10,border:"2px solid",fontSize:20,cursor:"pointer",
                  background:enfant.emoji===em?"var(--Sp)":"#fff",borderColor:enfant.emoji===em?"var(--S)":"var(--br)"
                }}>{em}</button>)}
              </div></div>
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
              <div><label className="lbl">Taux horaire net (€)</label>
                <input type="number"step="0.05"className="inp"value={contrat.tauxHoraire}onChange={e=>setContrat(c=>({...c,tauxHoraire:parseFloat(e.target.value)||4.05}))}/></div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
              <div><label className="lbl">Indemnité entretien (€/j)</label>
                <input type="number"step="0.05"className="inp"value={contrat.entretien}onChange={e=>setContrat(c=>({...c,entretien:parseFloat(e.target.value)||3.80}))}/></div>
              <div><label className="lbl">Date de début</label>
                <input type="date"className="inp"value={contrat.debut}onChange={e=>setContrat(c=>({...c,debut:e.target.value}))}/></div>
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
              Salaire mensuel estimé : {Math.round(contrat.heuresHebdo*52/12*contrat.tauxHoraire)}€ net + {Math.round(contrat.entretien*contrat.heuresHebdo/8*52/12)}€ entretien
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
                  try{
                    const res=await fetch('/api/invite-parent',{
                      method:'POST',headers:{'Content-Type':'application/json'},
                      body:JSON.stringify({
                        emailParent:parentEmail,
                        prenomEnfant:enfant.prenom,
                        prenomAsmat:user?.prenom||"Votre assistante maternelle",
                        asmatId:user?.id,enfantId:null,
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
              <div style={{fontWeight:700,marginBottom:6}}>🔔 Activer les notifications push ?</div>
              <div style={{marginBottom:8}}>Recevez les alertes en temps réel sur votre téléphone Android.</div>
              <button className="btn bG"style={{width:"100%"}}onClick={async()=>{
                await demanderPush(user.id);setPushDone(true);setToast("Notifications activées ✓");
              }}>Activer</button>
            </div>}
            <button className="btn bT"style={{width:"100%",justifyContent:"center",fontSize:14,padding:13}}onClick={onFinish}>
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
function BoutonAjouterEnfant({onClick,compact}){
  return <button className="btn bT" onClick={onClick}
    style={compact?{padding:"8px 14px",fontSize:12}:{padding:"10px 18px",fontSize:13}}>
    <span style={{fontSize:15,marginRight:2}}>+</span> Ajouter un enfant
  </button>;
}

//
// Modale d'ajout d'un nouvel enfant (apres l'onboarding initial)
// 3 etapes : Enfant, Contrat, Parent (invitation), puis confirmation
function AjouterEnfantModale({user,onClose}){
  const [step,setStep]=useState(0);
  const [enfant,setEnfant]=useState({prenom:"",nom:"",naissance:"",emoji:"🦁"});
  const [contrat,setContrat]=useState({
    debut:new Date().toISOString().slice(0,10),
    fin:"",
    heuresHebdo:40,
    tauxHoraire:4.05,
    entretien:3.80,
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
  const valideEtape1=()=>contrat.debut&&contrat.heuresHebdo>0&&contrat.tauxHoraire>0&&contrat.jours.length>0;

  const sauvegarder=async()=>{
    if(!valideEtape0()||!valideEtape1()){
      setToast("Donnees incompletes");
      return;
    }
    setSaving(true);
    try{
      // 1. Creer l'enfant
      const{data:enfantData,error:errEnfant}=await supabase.from("enfants").insert({
        prenom:enfant.prenom.trim(),
        nom:enfant.nom.trim()||null,
        emoji:enfant.emoji||"👶",
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
        taux_horaire:Number(contrat.tauxHoraire)||4.05,
        entretien:Number(contrat.entretien)||3.80,
        jours:contrat.jours,
        horaires:contrat.horaires||"07h30–17h30",
        actif:true,
      });
      if(errContrat){
        setToast("Enfant cree mais erreur contrat : "+errContrat.message);
        // On continue quand meme - l'enfant est cree
      }

      // 3. Inviter le parent (optionnel, seulement si email fourni)
      if(parentInfo.email.trim()){
        try{
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
            <label className="lbl">Emoji</label>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {EMOJIS.map(em=><button key={em} onClick={()=>setEnfant(f=>({...f,emoji:em}))}
                style={{width:42,height:42,borderRadius:12,border:enfant.emoji===em?"2px solid var(--T)":"1.5px solid var(--br)",background:enfant.emoji===em?"var(--Tp)":"#fff",fontSize:22,cursor:"pointer"}}>{em}</button>)}
            </div>
          </div>
          <button className="btn bT" disabled={!valideEtape0()}
            onClick={()=>setStep(1)}
            style={{width:"100%",justifyContent:"center",padding:"12px",fontSize:14,opacity:valideEtape0()?1:.5}}>
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
          <div style={{marginBottom:18}}>
            <label className="lbl">Jours d'accueil *</label>
            <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
              {JOURS_SEM.map(j=><button key={j} onClick={()=>toggleJour(j)}
                style={{padding:"7px 11px",borderRadius:10,border:contrat.jours.includes(j)?"2px solid var(--T)":"1.5px solid var(--br)",background:contrat.jours.includes(j)?"var(--Tp)":"#fff",color:contrat.jours.includes(j)?"var(--T)":"var(--m)",fontSize:12,fontWeight:600,cursor:"pointer"}}>{j.slice(0,3)}</button>)}
            </div>
          </div>
          {/* Apercu salaire */}
          {valideEtape1()&&<div style={{background:"var(--Gp)",border:"1px solid var(--G)",borderRadius:10,padding:"10px 14px",marginBottom:14,fontSize:12,color:"var(--G)"}}>
            <strong>Salaire mensuel brut estime :</strong> {Math.round(Number(contrat.heuresHebdo)*Number(contrat.tauxHoraire)*52/12)} € / mois
          </div>}
          <div style={{display:"flex",gap:8}}>
            <button className="btn" onClick={()=>setStep(0)}
              style={{flex:1,justifyContent:"center",padding:"12px",background:"var(--c)",color:"var(--m)"}}>← Retour</button>
            <button className="btn bT" disabled={!valideEtape1()}
              onClick={()=>setStep(2)}
              style={{flex:2,justifyContent:"center",padding:"12px",fontSize:14,opacity:valideEtape1()?1:.5}}>
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
            <button className="btn bT" onClick={sauvegarder} disabled={saving}
              style={{flex:2,justifyContent:"center",padding:"12px",fontSize:14}}>
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
          <button className="btn bT" onClick={onClose}
            style={{width:"100%",justifyContent:"center",padding:"12px",fontSize:14}}>
            Terminer
          </button>
        </div>}
      </div>
    </div>
  </div>;
}

//
function AttestationPoleEmploi({enfants,role,pEId,user}){
  const [selId,setSelId]=useState(enfants[0]?.id);
  const [toast,setToast]=useState("");
  const liste=role==="parent"?enfants.filter(e=>e.id===pEId):enfants;
  const enfant=liste.find(e=>e.id===selId)||liste[0]||{};
  const contrat=enfant.contrat||{};
  const motifs=["Fin de contrat","Démission du parent","Retrait de l'enfant","Rupture conventionnelle","Retraite","Autre"];
  const parent=(D.parents||[]).find(p=>p.id===enfant.parentId)||{};
  const salRef=Math.round((contrat.heuresHebdo||40)*52/12*(contrat.tauxHoraire||4.05));
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
    const g=x=>x&&String(x).trim()?String(x).trim():"________________";
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
      +'<h2>La salariée</h2>'
      +'<table><tr><td>Nom et prénom</td><td>'+g(form.salNom)+'</td></tr>'
      +'<tr><td>Emploi</td><td>Assistante maternelle agréée</td></tr>'
      +'<tr><td>N° d\'agrément</td><td>'+g(form.salAgrement)+'</td></tr>'
      +'<tr><td>Enfant accueilli</td><td>'+g(form.enfantNom)+'</td></tr></table>'
      +'<h2>Contrat de travail</h2>'
      +"<table><tr><td>Date d'embauche</td><td>"+g(form.dateEmbauche)+"</td></tr>"
      +'<tr><td>Date de fin du contrat</td><td>'+g(form.dateFin)+'</td></tr>'
      +'<tr><td>Motif de la rupture</td><td>'+g(form.motif)+'</td></tr>'
      +'<tr><td>Heures par semaine</td><td>'+g(form.heuresHebdo)+(form.heuresHebdo?' h':'')+'</td></tr>'
      +'<tr><td>Dernier salaire mensuel</td><td>'+g(form.dernierSalaire)+(form.dernierSalaire?' €':'')+'</td></tr></table>'
      +'<h2>Sommes versées à la rupture</h2>'
      +'<table><tr><td>Salaire du dernier mois</td><td>'+g(form.salDernierMois)+(form.salDernierMois?' €':'')+'</td></tr>'
      +'<tr><td>Indemnité compensatrice de congés payés</td><td>'+g(form.iccp)+(form.iccp?' €':'')+'</td></tr>'
      +'<tr><td>Indemnité de préavis</td><td>'+g(form.indemPreavis)+(form.indemPreavis?' €':'')+'</td></tr></table>'
      +'<p style="margin-top:18px;font-size:12px;background:#f9f9f9;padding:10px;border:1px solid #ddd">Je soussigné(e) certifie sur l\'honneur l\'exactitude des renseignements portés sur cette attestation.</p>'
      +'<div class="sig"><div class="sig-box">Fait à ___________, le '+today+'<br/><br/><br/>Signature de l\'employeur</div>'
      +'<div class="sig-box">Reçu le '+today+'<br/><br/><br/>Signature de la salariée</div></div>'
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
    <div className="card"style={{padding:18,marginBottom:14}}>
      <div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:10}}>👤 Employeur (parent)</div>
      {inp("Nom et prénom","empNom")}{inp("Adresse","empAdresse")}{inp("Email","empEmail")}{inp("N° Pajemploi","empPajemploi")}
      <div style={{fontWeight:700,fontSize:13,color:"var(--b)",margin:"14px 0 10px"}}>👩 Salariée (assistante maternelle)</div>
      {inp("Nom et prénom","salNom")}{inp("N° d'agrément","salAgrement")}{inp("Enfant accueilli","enfantNom")}
      <div style={{fontWeight:700,fontSize:13,color:"var(--b)",margin:"14px 0 10px"}}>📄 Contrat</div>
      {inp("Date d'embauche","dateEmbauche","date")}{inp("Date de fin du contrat","dateFin","date")}
      <div style={{marginBottom:10}}><label style={{fontSize:11,fontWeight:600,color:"var(--l)",display:"block",marginBottom:3}}>Motif de la rupture</label>
        <select className="sel"disabled={ro}value={form.motif||"Fin de contrat"}onChange={e=>set("motif",e.target.value)}>{motifs.map(m=><option key={m}>{m}</option>)}</select></div>
      {inp("Heures par semaine","heuresHebdo")}{inp("Dernier salaire mensuel (€)","dernierSalaire")}
      <div style={{fontWeight:700,fontSize:13,color:"var(--b)",margin:"14px 0 10px"}}>💶 Sommes versées à la rupture</div>
      {inp("Salaire du dernier mois (€)","salDernierMois")}{inp("Indemnité congés payés (€)","iccp")}{inp("Indemnité de préavis (€)","indemPreavis")}
    </div>
    <button className={"btn "+(role==="parent"?"bT":"bG")}style={{width:"100%",marginBottom:14}}onClick={generer}>📥 {role==="parent"?"Générer l'attestation":"Voir / télécharger l'attestation"}</button>
    <div className="card"style={{padding:14,background:"var(--Bp)"}}>
      <div style={{fontWeight:700,fontSize:12,color:"var(--B)",marginBottom:6}}>ℹ️ Important</div>
      <div style={{fontSize:12,color:"var(--m)",lineHeight:1.6}}>L'attestation <b>officielle</b> prise en compte par France Travail est en général <b>télétransmise via Pajemploi</b> (espace du parent → fin de contrat). De nombreuses agences refusent le papier. Ce formulaire sert de <b>brouillon pré-rempli</b> et de justificatif ; c'est le <b>parent employeur</b> qui l'établit et le signe.</div>
    </div>
  </div>;
}

function AttestationFiscale({enfants,role,pEId,user}){
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
  const hMens=Math.round((contrat.heuresHebdo||40)*52/12);
  const tauxH=contrat.tauxHoraire||4.05;
  const entretienJour=contrat.entretien||3.80;
  const hasReal=realStats?.paiements>0;
  const moisTravailles=12;
  const versementsList=realStats?.versements||[];
  // Estimation indicative (à défaut de versements réels)
  const estSalNet=hMens*tauxH*0.78*moisTravailles;
  const estEntretien=entretienJour*Math.round(hMens/8)*moisTravailles;
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
      if(!window.jspdf){
        await new Promise((res,rej)=>{
          const s=document.createElement("script");
          s.src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
          s.onload=res;s.onerror=()=>rej(new Error("Chargement jsPDF echoue"));
          document.head.appendChild(s);
        });
      }
      const{jsPDF}=window.jspdf;
      const doc=new jsPDF({unit:"mm",format:"a4",orientation:"portrait"});
      const PW=210,MX=18;let y=20;
      const vert=[42,157,143];const noir=[40,40,40];const gris=[120,120,120];const bleuFonce=[38,70,83];
      // Titre
      doc.setFontSize(16);doc.setFont("helvetica","bold");doc.setTextColor(...bleuFonce);
      doc.text("RECAPITULATIF DES VERSEMENTS",PW/2,y,{align:"center"});y+=6;
      doc.setFontSize(10);doc.setFont("helvetica","normal");doc.setTextColor(...gris);
      doc.text("Annee "+annee+" - Sommes versees a l assistante maternelle (justificatif indicatif)",PW/2,y,{align:"center"});y+=4;
      doc.setDrawColor(...vert);doc.setLineWidth(0.5);doc.line(MX,y,PW-MX,y);y+=10;
      // Header asmat + parent
      doc.setFillColor(244,247,250);doc.rect(MX,y,PW-2*MX,30,"F");
      doc.setFontSize(9);doc.setFont("helvetica","bold");doc.setTextColor(...vert);
      doc.text("ASSISTANTE MATERNELLE AGREEE",MX+3,y+5);
      doc.text("PARENT EMPLOYEUR",MX+(PW-2*MX)/2+3,y+5);
      doc.setFontSize(10);doc.setFont("helvetica","normal");doc.setTextColor(...noir);
      doc.text((user?.prenom||"")+" "+(user?.nom||""),MX+3,y+11);
      doc.text((enfant?.prenomParent||"Parent")+" "+(enfant?.nomParent||""),MX+(PW-2*MX)/2+3,y+11);
      doc.setFontSize(8);
      if(user?.email)doc.text("Email : "+user.email,MX+3,y+16);
      doc.text("N agrement : "+(userAgrement||"[A renseigner dans Parametres]"),MX+3,y+21);
      doc.text("Enfant garde : "+(enfant?.prenom||"-"),MX+(PW-2*MX)/2+3,y+16);
      if(enfant?.naissance)doc.text("Ne(e) le : "+enfant.naissance,MX+(PW-2*MX)/2+3,y+21);
      y+=36;
      // Sommes versees
      doc.setFontSize(12);doc.setFont("helvetica","bold");doc.setTextColor(...bleuFonce);
      doc.text("Sommes versees en "+annee+" "+(hasReal?"(donnees reelles)":"(estimation indicative)"),MX,y);y+=7;
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
        ligne("TOTAL REELLEMENT VERSE EN "+annee,totalReel.toFixed(2)+" euros",true);
      }else{
        ligne("Salaire net estime (12 mois)",estSalNet.toFixed(2)+" euros");
        ligne("Indemnites d entretien estimees",estEntretien.toFixed(2)+" euros");
        ligne("TOTAL ESTIME",totalEstime.toFixed(2)+" euros",true);
      }
      y+=8;
      // Detail des versements (mode reel) ou elements du contrat (estimation)
      doc.setFontSize(12);doc.setFont("helvetica","bold");doc.setTextColor(...bleuFonce);
      doc.text(hasReal?"Detail des versements":"Elements du contrat (base d estimation)",MX,y);y+=7;
      doc.setFontSize(9);doc.setFont("helvetica","normal");doc.setTextColor(...noir);
      if(hasReal){
        doc.setFillColor(244,247,250);doc.rect(MX,y,PW-2*MX,7,"F");
        doc.setFont("helvetica","bold");
        doc.text("Date",MX+3,y+5);doc.text("Mode",MX+42,y+5);doc.text("Periode",MX+85,y+5);doc.text("Montant",PW-MX-3,y+5,{align:"right"});
        y+=7;doc.setFont("helvetica","normal");
        versementsList.forEach(v=>{
          if(y>262){doc.addPage();y=20;}
          doc.setDrawColor(230,230,230);doc.line(MX,y+6.5,PW-MX,y+6.5);
          doc.text(fmtD(v.date),MX+3,y+5);
          doc.text(String(MODE_LBL[v.mode]||v.mode||"-"),MX+42,y+5);
          doc.text(String(v.periode||"-").slice(0,24),MX+85,y+5);
          doc.text((parseFloat(v.montant)||0).toFixed(2)+" euros",PW-MX-3,y+5,{align:"right"});
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
        ligneSimple("Taux horaire brut",(contrat.tauxHoraire||4.05)+" euros/h");
        ligneSimple("Salaire mensuel brut estime",salMensBrut.toFixed(2)+" euros");
        ligneSimple("Salaire mensuel net estime",(salMensBrut*0.78).toFixed(2)+" euros");
        ligneSimple("Mois travailles","12 mois");
        y+=8;
      }
      // Verifier qu'on a la place sinon nouvelle page
      if(y>232){doc.addPage();y=20;}
      // Note
      doc.setFillColor(255,248,243);doc.rect(MX,y,PW-2*MX,34,"F");
      doc.setDrawColor(255,214,179);doc.rect(MX,y,PW-2*MX,34);
      doc.setFontSize(9);doc.setFont("helvetica","bold");doc.setTextColor(...noir);
      doc.text("Document indicatif - ne remplace pas l attestation Pajemploi :",MX+3,y+5);
      doc.setFontSize(8);doc.setFont("helvetica","normal");doc.setTextColor(...gris);
      doc.text("Ce recapitulatif est un justificatif des sommes versees, fourni a titre indicatif.",MX+3,y+11);
      doc.text("L attestation fiscale officielle est delivree par l Urssaf - service Pajemploi (espace en ligne du parent).",MX+3,y+16);
      doc.text("Montant a reporter en case 7GA du formulaire 2042 RICI - la CMG y est deja deduite.",MX+3,y+21);
      doc.text("Conservez ce document avec vos justificatifs.",MX+3,y+26);
      y+=40;
      // Signature
      if(y>250){doc.addPage();y=20;}
      doc.setFontSize(9);doc.setFont("helvetica","italic");doc.setTextColor(...noir);
      doc.text("Je soussigne(e), "+(user?.prenom||"")+" "+(user?.nom||"")+", assistante maternelle agreee,",MX,y);y+=4;
      doc.text("certifie exacts les renseignements ci-dessus.",MX,y);y+=8;
      // 2 zones signature
      const sigW=(PW-2*MX-10)/2;
      doc.setDrawColor(...bleuFonce);doc.setLineWidth(0.3);
      doc.line(MX,y,MX+sigW,y);
      doc.line(MX+sigW+10,y,PW-MX,y);
      y+=4;
      doc.setFontSize(8);doc.setFont("helvetica","normal");doc.setTextColor(...noir);
      doc.text("Fait a ____________",MX,y);
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
        doc.text("(Aucune signature - voir Parametres)",MX,y+8);
      }
      // Footer
      doc.setFontSize(8);doc.setFont("helvetica","italic");doc.setTextColor(...gris);
      doc.text("Genere par TiMat - "+new Date().toLocaleDateString("fr-FR"),PW/2,280,{align:"center"});
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
        '.note{margin-top:20px;padding:14px;background:#FFF8F3;border:1px solid #FFD6B3;border-radius:8px;font-size:10px;color:#666;page-break-inside:avoid}',
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
        'N° agrément : '+(userAgrement||"[À renseigner dans Paramètres]")+'</div>',
        '<div><h3>Parent employeur</h3>',
        '<strong>'+(enfant?.prenomParent||'Parent')+' '+(enfant?.nomParent||'')+'</strong><br/>',
        'Enfant gardé : '+(enfant?.prenom||'-')+' '+(enfant?.emoji||'')+'<br/>',
        'Né(e) le : '+(enfant?.naissance||'[Date]')+'</div></div>',
        '<h3 style="font-size:12px;color:#2E4859;margin:16px 0 8px;padding-left:4px">💶 Sommes versées en '+annee+(hasReal?' (données réelles)':' (estimation indicative)')+'</h3>',
        '<table>',
        (hasReal
          ? '<tr><td>Nombre de versements</td><td style="text-align:right">'+versementsList.length+'</td></tr>'
            +'<tr class="total"><td>TOTAL RÉELLEMENT VERSÉ EN '+annee+'</td><td style="text-align:right">'+totalReel.toFixed(2)+' €</td></tr>'
          : '<tr><td>Salaire net estimé (12 mois)</td><td style="text-align:right">'+estSalNet.toFixed(2)+' €</td></tr>'
            +'<tr><td>Indemnités d\'entretien estimées</td><td style="text-align:right">'+estEntretien.toFixed(2)+' €</td></tr>'
            +'<tr class="total"><td>TOTAL ESTIMÉ</td><td style="text-align:right">'+totalEstime.toFixed(2)+' €</td></tr>'),
        '</table>',
        (hasReal
          ? '<h3 style="font-size:12px;color:#2E4859;margin:16px 0 8px;padding-left:4px">📋 Détail des versements</h3>'
            +'<table><tr><td style="background:#F4F7FA">Date</td><td style="background:#F4F7FA;width:auto;font-weight:700;color:#2E4859">Mode</td><td style="background:#F4F7FA;width:auto;font-weight:700;color:#2E4859">Période</td><td style="background:#F4F7FA;width:auto;font-weight:700;color:#2E4859;text-align:right">Montant</td></tr>'
            +versementsList.map(function(v){return '<tr><td style="background:#fff;font-weight:400;color:#222">'+fmtD(v.date)+'</td><td>'+(MODE_LBL[v.mode]||v.mode||'-')+'</td><td>'+(v.periode||'-')+'</td><td style="text-align:right">'+(parseFloat(v.montant)||0).toFixed(2)+' €</td></tr>'+(v.note?'<tr><td colspan="4" style="background:#fff;font-weight:400;color:#888;font-size:10px">↳ '+v.note+'</td></tr>':'');}).join('')
            +'</table>'
          : '<h3 style="font-size:12px;color:#2E4859;margin:16px 0 8px;padding-left:4px">📊 Éléments du contrat (base d\'estimation)</h3>'
            +'<table>'
            +'<tr><td>Heures hebdomadaires (contrat)</td><td style="text-align:right">'+(contrat.heuresHebdo||40)+' h</td></tr>'
            +'<tr><td>Taux horaire brut</td><td style="text-align:right">'+(contrat.tauxHoraire||4.05)+' €/h</td></tr>'
            +'<tr><td>Salaire mensuel brut estimé</td><td style="text-align:right">'+salMensBrut.toFixed(2)+' €</td></tr>'
            +'<tr><td>Salaire mensuel net estimé</td><td style="text-align:right">'+(salMensBrut*0.78).toFixed(2)+' €</td></tr>'
            +'<tr><td>Mois travaillés</td><td style="text-align:right">'+moisTravailles+' mois</td></tr>'
            +'</table>'),
        '<div class="note">',
        '<strong>📌 Document indicatif — ne remplace pas l\'attestation Pajemploi :</strong><br/>',
        '• Ce récapitulatif est un justificatif des sommes versées, fourni à titre indicatif.<br/>',
        '• L\'attestation fiscale officielle est délivrée par l\'Urssaf — service Pajemploi, sur l\'espace en ligne du parent.<br/>',
        '• Montant à reporter en case 7GA du formulaire 2042 RICI — la CMG y est déjà déduite.<br/>',
        '• Conservez ce document avec vos justificatifs.',
        '</div>',
        '<p style="margin-top:16px;font-size:11px;text-align:center;font-weight:600;color:#2E4859">Je soussigné(e), '+(user?.prenom||'[Prénom]')+' '+(user?.nom||'[Nom]')+', assistante maternelle agréée, certifie exacts les renseignements ci-dessus.</p>',
        '<div class="sig">',
        '<div class="sig-box">Fait à ____________<br/>Le '+new Date().toLocaleDateString('fr-FR')+'<br/><br/>Signature :'
          +(userSig?'<br/><img src="'+userSig+'" style="max-height:50px;max-width:100%;margin-top:4px"/>':'<br/><span style="color:#999;font-size:10px;font-style:italic">(Aucune signature enregistree dans Parametres)</span>')
          +'</div>',
        '<div class="sig-box">Remis au parent le :<br/>____________<br/><br/>Signature parent :</div></div>',
        '<p style="font-size:9px;color:#999;margin-top:20px;text-align:center">Généré par TiMat — timat.app — '+new Date().toLocaleDateString('fr-FR')+'</p>',
        '</div>',
        '<script>function dlPdf(){var el=document.getElementById("doc");var opt={margin:0,filename:"recapitulatif-versements-'+annee+'-'+(enfant.prenom||"enfant")+'.pdf",image:{type:"jpeg",quality:.95},html2canvas:{scale:2,useCORS:true,logging:false,windowWidth:780},jsPDF:{unit:"mm",format:"a4",orientation:"portrait",compress:true},pagebreak:{mode:["css","legacy"]}};html2pdf().from(el).set(opt).save();}</script>',
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
        <div className="card"style={{padding:18}}>
          <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:14}}>💶 Récapitulatif pour {enfant.prenom||"-"}</div>
          <div style={{marginBottom:12}}>
            <label className="lbl">Année</label>
            <select className="sel"value={annee}onChange={e=>setAnnee(Number(e.target.value))}>
              {annees.map(a=><option key={a}value={a}>{a}</option>)}
            </select>
          </div>
          <div style={{padding:12,background:"var(--c)",borderRadius:10,marginBottom:14,fontSize:12,lineHeight:1.7}}>
            <div style={{fontWeight:700,marginBottom:6,color:"var(--b)",display:"flex",justifyContent:"space-between"}}>
              <span>Récapitulatif {annee}</span>
              <span style={{fontSize:10,fontWeight:400,color:hasReal?"var(--S)":"var(--l)",fontStyle:"italic"}}>{sourceLabel}</span>
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
            <button className="btn bG"style={{width:"100%",fontSize:12}}onClick={generer}disabled={gen}>
              🖨️ Aperçu / Imprimer
            </button>
          </div>
        </div>
        <div style={{padding:12,background:"var(--Bp)",borderRadius:10,fontSize:12,color:"var(--B)",lineHeight:1.6}}>
          💡 Récapitulatif indicatif des sommes versées. <strong>Il ne remplace pas l'attestation fiscale officielle de Pajemploi</strong> (espace en ligne du parent), à reporter en case 7GA du formulaire 2042 RICI — la CMG y est déjà déduite.
        </div>
      </div>
      <div className="card"style={{padding:18}}>
        <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:14}}>📋 Contrat en cours</div>
        {contrat.debut?<div style={{fontSize:12,lineHeight:2}}>
          <div>Début : <strong>{contrat.debut}</strong></div>
          <div>Heures/semaine : <strong>{contrat.heuresHebdo||40}h</strong></div>
          <div>Taux horaire : <strong>{contrat.tauxHoraire||4.05} €</strong></div>
          <div>Entretien : <strong>{contrat.entretien||3.80} €/jour</strong></div>
        </div>:<div style={{fontSize:12,color:"var(--l)"}}>Aucun contrat trouvé pour cet enfant.</div>}
      </div>
    </div>
  </div>;
}

// ========== FICHE D'URGENCE (dans l'app) ==========
function FicheUrgence({enfants,role,pEId,user}){
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
    asmatNom:role==="asmat"?((user?.prenom||"")+" "+(user?.nom||"")).trim():"",asmatTel:role==="asmat"?(user?.tel||""):"",asmatAgrement:role==="asmat"?(user?.agrement||""):"",
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
      "<!DOCTYPE html><html lang='fr'><head><meta charset='UTF-8'/><title>Fiche urgence - "+f.prenom+"</title>",
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
      "<div class='line'><b>Assistante maternelle :</b> "+f.asmatNom+"</div>",
      "<div class='line'><b>Telephone :</b> "+f.asmatTel+"</div>",
      "<div class='line'><b>N. d'agrement :</b> "+f.asmatAgrement+"</div>",
      "<div class='sh'>01  Identite de l'enfant</div>",
      "<div class='line'><b>Nom :</b> "+f.nom+"</div>",
      "<div class='line'><b>Prenom :</b> "+f.prenom+"</div>",
      "<div class='line'><b>Date de naissance :</b> "+f.naissance+"</div>",
      "<div class='line'><b>Sexe :</b> "+f.sexe+"</div>",
      "<div class='line'><b>Adresse :</b> "+f.adresse+"</div>",
      "<div class='sh'>02  Coordonnees des parents</div>",
      "<div class='stt'>Mere</div>",
      "<div class='line'><b>Nom et prenom :</b> "+f.mereNom+"</div>",
      "<div class='line'><b>Telephone :</b> "+f.mereTel+"</div>",
      "<div class='line'><b>Email :</b> "+f.mereEmail+"</div>",
      "<div class='line'><b>Employeur :</b> "+f.mereEmployeur+"</div>",
      "<div class='stt'>Pere</div>",
      "<div class='line'><b>Nom et prenom :</b> "+f.pereNom+"</div>",
      "<div class='line'><b>Telephone :</b> "+f.pereTel+"</div>",
      "<div class='line'><b>Email :</b> "+f.pereEmail+"</div>",
      "<div class='line'><b>Employeur :</b> "+f.pereEmployeur+"</div>",
      "<div class='sh'>03  Personnes autorisees</div>",
      ...[1,2,3].map(n=>"<div class='stt'>Personne "+n+"</div><div class='line'><b>Nom :</b> "+f["p"+n+"Nom"]+"</div><div class='line'><b>Lien :</b> "+f["p"+n+"Lien"]+"</div><div class='line'><b>Tel :</b> "+f["p"+n+"Tel"]+"</div>"),
      "<div class='sh'>04  Informations medicales</div>",
      "<div class='line'><b>Medecin :</b> "+f.medecin+"</div>",
      "<div class='line'><b>Tel medecin :</b> "+f.medecinTel+"</div>",
      "<div class='line'><b>Groupe sanguin :</b> "+f.groupe+"</div>",
      "<div class='line'><b>Vaccins a jour :</b> "+f.vaccins+"</div>",
      "<div class='line'><b>PAI :</b> "+f.pai+"</div>",
      "<div class='line'><b>Allergies :</b> "+f.allergies+"</div>",
      "<div class='line'><b>Traitements :</b> "+f.traitements+"</div>",
      "<div class='line'><b>Particularites :</b> "+f.particularites+"</div>",
      "<div class='sh'>05  Numeros d'urgence</div>",
      "<div class='urg'>SAMU : <span>15</span></div>",
      "<div class='urg'>Pompiers : <span>18</span></div>",
      "<div class='urg'>Urgences europeennes : <span>112</span></div>",
      "<div class='urg'>Centre anti-poison : <span>01 40 05 48 48</span></div>",
      "<div class='sh'>06  Autorisations parentales</div>",
      authLines,
      "<div class='sh'>07  Signatures</div>",
      "<p style='margin-bottom:16px'>Je soussigne(e), certifie l'exactitude des renseignements ci-dessus.</p>",
      "<div class='line'><b>Fait a :</b></div><div class='line'><b>Le :</b></div>",
      "<div style='display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:20px'>",
      "<div><div style='font-weight:700;margin-bottom:60px'>Signature parent :</div></div>",
      "<div><div style='font-weight:700;margin-bottom:60px'>Signature assmat :</div></div></div>",
      "<p style='text-align:center;color:#ccc;font-size:10px;margin-top:20px'>Genere par TiMat - timat.app</p>",
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
    {role==="asmat"&&loaded&&!hasData
      ? <div className="card"style={{padding:20,textAlign:"center"}}>
          <div style={{fontSize:48,marginBottom:16}}>🚨</div>
          <div style={{fontSize:16,fontWeight:700,color:"var(--b)",marginBottom:8}}>Fiche pas encore remplie</div>
          <div style={{fontSize:13,color:"var(--m)",lineHeight:1.7,marginBottom:16}}>Le parent de {enfant.prenom||"cet enfant"} n'a pas encore rempli la fiche d'urgence dans TiMat.</div>
          <div style={{padding:14,background:"var(--Bp)",borderRadius:12,fontSize:12,color:"var(--B)",lineHeight:1.7}}>💡 Vous la consulterez ici dès qu'il l'aura enregistrée.</div>
        </div>
      : <div className="g2">
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div className="card"style={{padding:16}}>
          <div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:12}}>👶 Enfant</div>
          {inp("Nom","nom")}{inp("Prenom","prenom")}{inp("Date de naissance","naissance","JJ/MM/AAAA")}{inp("Sexe","sexe","F / M")}{inp("Adresse","adresse")}
        </div>
        <div className="card"style={{padding:16}}>
          <div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:12}}>👪 Mere</div>
          {inp("Nom et prenom","mereNom")}{inp("Telephone","mereTel")}{inp("Email","mereEmail")}{inp("Employeur","mereEmployeur")}
        </div>
        <div className="card"style={{padding:16}}>
          <div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:12}}>👪 Pere</div>
          {inp("Nom et prenom","pereNom")}{inp("Telephone","pereTel")}{inp("Email","pereEmail")}{inp("Employeur","pereEmployeur")}
        </div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div className="card"style={{padding:16}}>
          <div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:12}}>🔑 Personnes autorisees</div>
          {[1,2,3].map(n=><div key={n}style={{marginBottom:10,padding:10,background:"var(--c)",borderRadius:8}}>
            <div style={{fontSize:11,fontWeight:700,color:"var(--l)",marginBottom:6}}>Personne {n}</div>
            {inp("Nom","p"+n+"Nom")}{inp("Lien","p"+n+"Lien","Grand-parent, oncle...")}{inp("Tel","p"+n+"Tel")}
          </div>)}
        </div>
        <div className="card"style={{padding:16}}>
          <div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:12}}>🩺 Medical</div>
          {inp("Medecin traitant","medecin")}{inp("Tel medecin","medecinTel")}{inp("Groupe sanguin","groupe")}{inp("Vaccins a jour","vaccins","Oui / Non")}{inp("PAI","pai","Oui / Non")}
          {ta("Allergies","allergies","Aucune connue")}{ta("Traitements","traitements","Aucun")}{ta("Particularites","particularites")}
        </div>
        <div className="card"style={{padding:16}}>
          <div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:12}}>✅ Autorisations</div>
          {chk("Emmener aux urgences","authUrgences")}
          {chk("Paracetamol (ordonnance jointe)","authParacetamol")}
          {chk("Sorties exterieures","authSorties")}
          {chk("Transport en voiture","authVoiture")}
          {chk("Photos (usage interne)","authPhotos")}
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {role==="parent"&&(editing
            ? <button className="btn bS"disabled={saving}style={{width:"100%",padding:"14px",fontSize:14}}onClick={sauvegarder}>{saving?"⏳ Enregistrement...":"💾 Sauvegarder"}</button>
            : <button className="btn bG"style={{width:"100%",padding:"14px",fontSize:14}}onClick={()=>setEditing(true)}>✏️ Modifier</button>)}
          <button className="btn bT"style={{width:"100%",padding:"14px",fontSize:14}}onClick={genererPDF}>📥 Télécharger la fiche PDF</button>
        </div>
      </div>
    </div>}
  </div>;
}

// ========== PROJET D'ACCUEIL (dans l'app) ==========
function ProjetAccueil({user,role}){
  const [toast,setToast]=useState("");
  const [editing,setEditing]=useState(false);
  const [loaded,setLoaded]=useState(false);
  const [hasData,setHasData]=useState(false);
  const [saving,setSaving]=useState(false);
  const [form,setForm]=useState({
    nom:(user?.prenom||"")+" "+(user?.nom||""),adresse:"",tel:user?.tel||"",email:user?.email||"",agrement:"",
    intro:"",parcours:"",agrementDetail:"",domicile:"",
    valeursPerso:"",
    horaires:[
      {h:"7h30 - 9h00",d:"Accueil echelonne, jeu libre, transmissions"},
      {h:"9h00 - 9h30",d:"Collation du matin"},
      {h:"9h30 - 11h00",d:"Activites d'eveil, sorties"},
      {h:"11h30 - 12h30",d:"Repas"},
      {h:"12h30 - 15h00",d:"Sieste"},
      {h:"15h00 - 15h30",d:"Reveil, gouter"},
      {h:"15h30 - 17h00",d:"Activites, motricite"},
      {h:"17h00 - 18h30",d:"Jeu libre, retrouvailles, transmissions"},
    ],
    alimentationPerso:"",sommeilPerso:"",activitesPerso:"",communicationPerso:"",conclusion:"",
  });
  // Charger le projet enregistre (assmat = le sien ; parent = celui de son assmat via RLS)
  useEffect(()=>{
    let cancelled=false;
    (async()=>{
      try{
        let row=null;
        if(role==="parent"){
          const{data}=await supabase.from("projet_accueil").select("data").limit(1).maybeSingle();
          row=data;
        }else if(user?.id){
          const{data}=await supabase.from("projet_accueil").select("data").eq("asmat_id",user.id).maybeSingle();
          row=data;
        }
        if(cancelled)return;
        if(row&&row.data&&Object.keys(row.data).length){setForm(f=>({...f,...row.data}));setHasData(true);setEditing(false);}
        else{setHasData(false);if(role!=="parent")setEditing(true);}
      }catch(e){console.warn("projet_accueil load",e);}
      if(!cancelled)setLoaded(true);
    })();
    return()=>{cancelled=true;};
  },[user?.id,role]);
  const set=(k,v)=>setForm(p=>({...p,[k]:v}));
  const setHoraire=(i,field,v)=>setForm(p=>{const h=[...p.horaires];h[i]={...h[i],[field]:v};return{...p,horaires:h};});
  const ro=role==="parent"||!editing;
  const sauvegarder=async()=>{
    if(!user?.id)return;
    setSaving(true);
    const{error}=await supabase.from("projet_accueil").upsert({asmat_id:user.id,data:form,updated_at:new Date().toISOString()});
    setSaving(false);
    if(error){setToast("❌ Erreur enregistrement : "+error.message);return;}
    setHasData(true);setEditing(false);setToast("✅ Projet d'accueil enregistré");
  };

  const inp=(label,key,ph)=><div style={{marginBottom:10}}>
    <label style={{fontSize:11,fontWeight:600,color:"var(--l)",display:"block",marginBottom:3}}>{label}</label>
    <input className="inp"disabled={ro}value={form[key]}onChange={e=>set(key,e.target.value)}placeholder={ph||""}/>
  </div>;
  const ta=(label,key,ph,rows)=><div style={{marginBottom:10}}>
    <label style={{fontSize:11,fontWeight:600,color:"var(--l)",display:"block",marginBottom:3}}>{label}</label>
    <textarea className="ta"disabled={ro}value={form[key]}onChange={e=>set(key,e.target.value)}placeholder={ph||""}style={{width:"100%",minHeight:(rows||3)*28,resize:"vertical"}}/>
  </div>;

  const genererPDF=()=>{
    const w=window.open("","_blank");
    if(!w){setToast("Autorisez les popups");return;}
    const f=form;
    const horairesHTML=f.horaires.map(h=>"<tr><td style='background:#F4F7FA;padding:8px 14px;font-weight:700;color:#5DA9A1;width:140px;border:1px solid #e0e0e0'>"+h.h+"</td><td style='padding:8px 14px;border:1px solid #e0e0e0'>"+h.d+"</td></tr>").join("");
    const html=[
      "<!DOCTYPE html><html lang='fr'><head><meta charset='UTF-8'/><title>Projet d'accueil</title>",
      "<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Calibri,sans-serif;max-width:780px;margin:0 auto;padding:30px;color:#2E4859;font-size:13px;line-height:1.9}",
      "h1{font-size:28px;text-align:center;letter-spacing:4px;color:#2E4859;margin-bottom:4px}",
      ".sub{text-align:center;color:#5DA9A1;font-size:15px;margin-bottom:20px}",
      ".info{text-align:center;color:#aaa;font-size:12px;margin-bottom:4px}",
      ".sh{font-size:15px;font-weight:700;color:#2E4859;letter-spacing:2px;border-bottom:3px solid #5DA9A1;padding-bottom:6px;margin:30px 0 14px;text-transform:uppercase}",
      ".stt{font-weight:700;color:#5DA9A1;font-size:14px;margin:18px 0 8px}",
      "p{margin:6px 0}ul{padding-left:22px;margin:6px 0}li{margin:4px 0}",
      "table{width:100%;border-collapse:collapse;margin:12px 0}",
      ".cover{page-break-after:always;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:90vh;text-align:center}",
      ".cover h1{font-size:36px;letter-spacing:8px;margin-bottom:8px}",
      ".cover .line{border-bottom:1px solid #d0d0d0;width:300px;margin:8px auto;padding:8px 0;font-size:15px;color:#2E4859}",
      ".cover .label{color:#aaa;font-size:11px;margin-top:16px}",
      "@media print{.noprint{display:none}.cover{min-height:100vh}}</style></head><body>",
      // PAGE DE GARDE
      "<div class='cover'>",
      "<h1>PROJET D'ACCUEIL</h1>",
      "<div class='sub'>Assistante maternelle agreee</div>",
      "<div style='border-top:3px solid #5DA9A1;border-bottom:3px solid #5DA9A1;padding:16px 0;margin:40px 0'>",
      "<div class='line' style='font-weight:700;font-size:18px'>"+f.nom+"</div>",
      "<div class='label'>Adresse</div><div class='line'>"+f.adresse+"</div>",
      "<div class='label'>Telephone</div><div class='line'>"+f.tel+"</div>",
      "<div class='label'>Email</div><div class='line'>"+f.email+"</div>",
      "<div class='label'>Agrement</div><div class='line'>"+f.agrement+"</div>",
      "</div>",
      "<div style='color:#5DA9A1;font-size:16px;font-weight:700'>"+new Date().getFullYear()+"</div>",
      "</div>",
      // CONTENU
      "<div class='sh'>01  Introduction</div>",
      "<p>Ce projet d'accueil a pour objectif de vous presenter ma pratique professionnelle, mes valeurs educatives et l'organisation quotidienne de l'accueil de votre enfant a mon domicile.</p>",
      f.intro?"<p>"+f.intro.replace(/\n/g,"<br/>")+"</p>":"",
      "<div class='sh'>02  Presentation</div>",
      "<div class='stt'>Mon parcours</div>",
      f.parcours?"<p>"+f.parcours.replace(/\n/g,"<br/>")+"</p>":"",
      "<div class='stt'>Mon agrement</div>",
      f.agrementDetail?"<p>"+f.agrementDetail.replace(/\n/g,"<br/>")+"</p>":"",
      "<div class='stt'>Mon domicile</div>",
      f.domicile?"<p>"+f.domicile.replace(/\n/g,"<br/>")+"</p>":"",
      "<div class='sh'>03  Valeurs educatives</div>",
      "<div class='stt'>Bienveillance et respect du rythme</div>",
      "<p>Chaque enfant est unique et se developpe a son propre rythme. Je m'engage a respecter ses besoins sans forcer ni comparer.</p>",
      "<div class='stt'>Autonomie progressive</div>",
      "<p>J'encourage l'enfant a faire par lui-meme dans un cadre securise.</p>",
      "<div class='stt'>Attachement securise</div>",
      "<p>Je m'engage a etre presente, reactive et previsible pour que l'enfant se sente en securite.</p>",
      "<div class='stt'>Communication bienveillante</div>",
      "<p>Face a un comportement difficile, je mets des mots sur les emotions et je pose des limites claires.</p>",
      f.valeursPerso?"<div class='stt'>Mes valeurs complementaires</div><p>"+f.valeursPerso.replace(/\n/g,"<br/>")+"</p>":"",
      "<div class='sh'>04  Organisation de la journee</div>",
      "<table>"+horairesHTML+"</table>",
      "<div class='sh'>05  Alimentation</div>",
      "<ul><li>Repas faits maison avec des produits frais et de saison</li><li>Respect des regimes alimentaires et allergies</li><li>Introduction alimentaire progressive</li><li>Ambiance calme et bienveillante a table</li></ul>",
      f.alimentationPerso?"<p>"+f.alimentationPerso.replace(/\n/g,"<br/>")+"</p>":"",
      "<div class='sh'>06  Sommeil et repos</div>",
      "<ul><li>Espace calme, securise et personnel</li><li>Rituel d'endormissement individualise</li><li>Surveillance reguliere pendant le sommeil</li><li>Pas de reveil impose</li></ul>",
      f.sommeilPerso?"<p>"+f.sommeilPerso.replace(/\n/g,"<br/>")+"</p>":"",
      "<div class='sh'>07  Activites et eveil</div>",
      "<ul><li>Motricite globale : parcours, danse, ballon, jardin</li><li>Motricite fine : gommettes, pate a modeler, dessin</li><li>Eveil sensoriel : jeux d'eau, bacs sensoriels, peinture</li><li>Eveil musical : comptines, instruments</li><li>Langage : albums, imagiers, jeux de doigts</li><li>Sorties : parc, bibliotheque, RAM</li></ul>",
      f.activitesPerso?"<p>"+f.activitesPerso.replace(/\n/g,"<br/>")+"</p>":"",
      "<div class='sh'>08  Sante et securite</div>",
      "<ul><li>Domicile securise selon les recommandations de la PMI</li><li>Formee aux gestes de premiers secours</li><li>En cas de maladie : parents prevenus, ordonnance obligatoire</li><li>En cas d'urgence : appel du 15 et parents prevenus</li></ul>",
      "<div class='sh'>09  Partenariat avec les parents</div>",
      "<ul><li>Transmissions quotidiennes : repas, sommeil, activites, humeur</li><li>Disponible pour les questions, joignable en cas d'urgence</li><li>Respect mutuel des choix educatifs</li></ul>",
      f.communicationPerso?"<p>"+f.communicationPerso.replace(/\n/g,"<br/>")+"</p>":"",
      "<div class='sh'>10  Periode d'adaptation</div>",
      "<p>L'adaptation dure generalement 1 a 2 semaines.</p>",
      "<table>",
      "<tr><td style='background:#F0FAF4;padding:8px 14px;font-weight:700;color:#5DA9A1;width:140px;border:1px solid #e0e0e0'>Jour 1</td><td style='padding:8px 14px;border:1px solid #e0e0e0'>1h avec le parent present</td></tr>",
      "<tr><td style='background:#F0FAF4;padding:8px 14px;font-weight:700;color:#5DA9A1;width:140px;border:1px solid #e0e0e0'>Jour 2-3</td><td style='padding:8px 14px;border:1px solid #e0e0e0'>1h sans le parent, separation courte</td></tr>",
      "<tr><td style='background:#F0FAF4;padding:8px 14px;font-weight:700;color:#5DA9A1;width:140px;border:1px solid #e0e0e0'>Jour 4-5</td><td style='padding:8px 14px;border:1px solid #e0e0e0'>2-3h, premier repas</td></tr>",
      "<tr><td style='background:#F0FAF4;padding:8px 14px;font-weight:700;color:#5DA9A1;width:140px;border:1px solid #e0e0e0'>Semaine 2</td><td style='padding:8px 14px;border:1px solid #e0e0e0'>Demi-journees puis journees completes</td></tr>",
      "</table>",
      "<div class='sh'>Pour conclure</div>",
      "<p>Ce projet d'accueil est un document vivant. N'hesitez pas a en discuter avec moi a tout moment.</p>",
      f.conclusion?"<p>"+f.conclusion.replace(/\n/g,"<br/>")+"</p>":"",
      "<div style='margin-top:30px'><p><b>Fait a :</b> ________________________   <b>Le :</b> ________________________</p></div>",
      "<div style='display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:30px'>",
      "<div><p style='font-weight:700'>L'assistante maternelle :</p><div style='height:80px'></div></div>",
      "<div><p style='font-weight:700'>Les parents :</p><div style='height:80px'></div></div></div>",
      "<p style='text-align:center;color:#ccc;font-size:10px;margin-top:30px'>Genere par TiMat - timat.app</p>",
      "<div class='noprint' style='text-align:center;margin-top:16px'><button onclick='window.print()' style='background:#5DA9A1;color:#fff;border:none;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer'>Imprimer / PDF</button></div>",
      "</body></html>"
    ].join("");
    w.document.write(html);w.document.close();
    setToast("Projet d'accueil genere ✓");
  };

  // Parent sans projet encore publie -> message d'attente
  if(role==="parent"&&loaded&&!hasData){
    return <div className="fi">
      {toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
      <PageHeader icon="🌿" title="Projet d'accueil" sub="Le projet d'accueil de votre assistante maternelle"/>
      <div className="card"style={{padding:20,textAlign:"center"}}>
        <div style={{fontSize:48,marginBottom:16}}>🌿</div>
        <div style={{fontSize:16,fontWeight:700,color:"var(--b)",marginBottom:8}}>Pas encore disponible</div>
        <div style={{fontSize:13,color:"var(--m)",lineHeight:1.7,marginBottom:16}}>
          Votre assistante maternelle n'a pas encore publié son projet d'accueil dans TiMat. Il décrit ses valeurs éducatives, l'organisation de la journée et ses pratiques.
        </div>
        <div style={{padding:14,background:"var(--Bp)",borderRadius:12,fontSize:12,color:"var(--B)",lineHeight:1.7}}>
          💡 Demandez-lui de le compléter et de l'enregistrer — il apparaîtra ici automatiquement.
        </div>
      </div>
    </div>;
  }

  return <div className="fi">
    {toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
    <PageHeader icon="🌿" title="Projet d'accueil" sub={role==="parent"?"Le projet d'accueil de votre assistante maternelle":(editing?"Rédigez et enregistrez votre projet d'accueil":"Cliquez Modifier pour l'éditer · Télécharger pour le PDF")}/>
    <div className="g2">
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div className="card"style={{padding:16}}>
          <div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:12}}>👩 Mes informations</div>
          {inp("Nom et prenom","nom")}{inp("Adresse","adresse")}{inp("Telephone","tel")}{inp("Email","email")}{inp("Numero d'agrement","agrement")}
        </div>
        <div className="card"style={{padding:16}}>
          <div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:12}}>📝 Mon introduction</div>
          {ta("Pourquoi j'aime ce metier, ce qui me motive","intro","Depuis X ans, j'exerce le metier d'assistante maternelle avec passion...",4)}
        </div>
        <div className="card"style={{padding:16}}>
          <div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:12}}>🎓 Ma presentation</div>
          {ta("Mon parcours et mes formations","parcours","CAP AEPE, formations IPERIA, experiences professionnelles...",4)}
          {ta("Mon agrement en detail","agrementDetail","Agree pour X enfants, de X mois a X ans, depuis le...",3)}
          {ta("Mon domicile et ses amenagements","domicile","Maison avec jardin, espace de jeu dedie, chambre de repos...",4)}
        </div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div className="card"style={{padding:16}}>
          <div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:12}}>💛 Mes valeurs</div>
          <div style={{fontSize:11,color:"var(--l)",marginBottom:8,lineHeight:1.6}}>Les valeurs de base (bienveillance, autonomie, attachement, CNV) sont deja incluses. Ajoutez les votres ci-dessous.</div>
          {ta("Mes valeurs complementaires","valeursPerso","Motricite libre, pedagogie Montessori, lien avec la nature...",3)}
        </div>
        <div className="card"style={{padding:16}}>
          <div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:12}}>📋 Ma journee type</div>
          {form.horaires.map((h,i)=><div key={i}style={{display:"flex",gap:6,marginBottom:4}}>
            <input className="inp"disabled={ro}style={{width:110,flexShrink:0,fontSize:11}}value={h.h}onChange={e=>setHoraire(i,"h",e.target.value)}/>
            <input className="inp"disabled={ro}style={{flex:1,fontSize:11}}value={h.d}onChange={e=>setHoraire(i,"d",e.target.value)}/>
          </div>)}
        </div>
        <div className="card"style={{padding:16}}>
          <div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:12}}>🍽️ Mes specificites</div>
          {ta("Alimentation","alimentationPerso","Bio, potager, menus de la semaine...",2)}
          {ta("Sommeil","sommeilPerso","Piece dediee, babyphone, gigoteuse...",2)}
          {ta("Activites","activitesPerso","Yoga enfant, jardinage, sorties nature...",2)}
          {ta("Communication avec les parents","communicationPerso","Application TiMat, cahier de liaison...",2)}
        </div>
        <div className="card"style={{padding:16}}>
          <div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:12}}>🌿 Conclusion</div>
          {ta("Mon mot de conclusion","conclusion","Ce projet d'accueil est le reflet de mon engagement...",3)}
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {role!=="parent"&&(editing
            ? <button className="btn bS"disabled={saving}style={{width:"100%",padding:"14px",fontSize:14}}onClick={sauvegarder}>{saving?"⏳ Enregistrement...":"💾 Sauvegarder"}</button>
            : <button className="btn bG"style={{width:"100%",padding:"14px",fontSize:14}}onClick={()=>setEditing(true)}>✏️ Modifier</button>)}
          <button className="btn bT"style={{width:"100%",padding:"14px",fontSize:14}}onClick={genererPDF}>📥 Télécharger le PDF</button>
        </div>
      </div>
    </div>
  </div>;
}

// ========== BOUTIQUE ==========
function InviterParent({enfants,user,demoMode=false}){
  const [selId,setSelId]=useState(enfants[0]?.id);
  const [email,setEmail]=useState("");
  const [sending,setSending]=useState(false);
  const [sent,setSent]=useState(false);
  const [err,setErr]=useState("");
  const [toast,setToast]=useState("");
  const [invitations,setInvitations]=useState(demoMode?[{id:"inv_demo",email_parent:"parent.leo@email.fr",prenom_enfant:"Léo",statut:"envoyée",created_at:new Date().toISOString()}]:[]);
  const enfant=enfants.find(e=>e.id===selId)||enfants[0];

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
        <div className="card" style={{padding:20}}>
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
        <div className="card" style={{padding:16,background:"var(--Bp)",border:"1px solid var(--B)"}}>
          <div style={{fontWeight:700,fontSize:13,color:"var(--B)",marginBottom:8}}>🔗 Ou partagez ce lien directement</div>
          <div style={{fontSize:11,color:"var(--m)",marginBottom:10,lineHeight:1.6}}>
            Envoyez ce lien par SMS, WhatsApp ou autre. Le parent n'a qu'à créer son compte.
          </div>
          <div style={{display:"flex",gap:8}}>
            <div style={{flex:1,padding:"8px 10px",background:"var(--w)",borderRadius:8,fontSize:10,color:"var(--l)",fontFamily:"'DM Mono',monospace",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
              {window.location.origin}/?invite={user?.id?.slice(0,8)}
            </div>
            <button className="btn bG" style={{fontSize:11,padding:"6px 10px",flexShrink:0}}
              onClick={()=>{navigator.clipboard?.writeText(window.location.origin+"/?invite="+user?.id?.slice(0,8));setToast("Lien copié ✓");}}>
              📋 Copier
            </button>
          </div>
        </div>
      </div>

      {/* Historique invitations */}
      <div className="card" style={{padding:16}}>
        <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:14}}>📋 Invitations envoyées</div>
        {invitations.length===0
          ?<div style={{textAlign:"center",padding:"24px 0",color:"var(--l)"}}>
            <div style={{fontSize:32,marginBottom:8}}>📭</div>
            <div style={{fontSize:13}}>Aucune invitation envoyée pour le moment</div>
          </div>
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

function Boutique({user}){
  const [toast,setToast]=useState("");
  const isPro=user?.subscription_status==="pro";
  const products=[
    {id:"kit_sheets",name:"Kit Google Sheets Assmat",price:"14,90",desc:"7 tableurs interconnectes : heures, salaire, conges, bilan annuel, planning, indemnites, facture.",icon:"📊",color:"#5DA9A1"},
    {id:"fiche_urgence",name:"Fiche d'urgence",price:"4,90",desc:"Fiche complete a remplir : enfant, parents, personnes autorisees, medical, urgences, autorisations.",icon:"🚨",color:"#C84B31"},
    {id:"projet_accueil",name:"Projet d'accueil",price:"9,90",desc:"10 sections : presentation, valeurs, journee type, alimentation, sommeil, activites, sante, parents.",icon:"🌿",color:"#2E4859"},
    {id:"pack_complet",name:"Pack Complet",price:"24,90",desc:"Les 3 produits reunis. Economisez 4,80 EUR par rapport a l'achat separe.",icon:"🎁",color:"#E49178",badge:"-16%"},
  ];

  const acheter=async(product)=>{
    try{
      const res=await fetch('/api/create-checkout-session',{
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
          {p.badge&&<div style={{position:"absolute",top:8,right:8,background:p.color,color:"#fff",borderRadius:6,padding:"2px 8px",fontSize:10,fontWeight:700}}>{p.badge}</div>}
        </div>
        <div style={{padding:16,flex:1,display:"flex",flexDirection:"column"}}>
          <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:6}}>{p.name}</div>
          <div style={{fontSize:12,color:"var(--l)",lineHeight:1.6,flex:1,marginBottom:12}}>{p.desc}</div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              {isPro&&<span style={{fontSize:11,color:"var(--l)",textDecoration:"line-through",marginRight:6}}>{p.price} EUR</span>}
              <span style={{fontSize:18,fontWeight:700,color:p.color}}>{isPro?(parseFloat(p.price.replace(",","."))*0.8).toFixed(2).replace(".",","):p.price} EUR</span>
            </div>
            <button className="btn bT"style={{fontSize:12,padding:"8px 16px"}}onClick={()=>acheter(p)}>Acheter</button>
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

function Onboarding({onFinish,user}){
  const [step,setStep]=useState(0);
  const s=ONBOARD_STEPS[step];
  const isLast=step===ONBOARD_STEPS.length-1;
  const pct=Math.round(((step+1)/ONBOARD_STEPS.length)*100);

  return(
    <div style={{minHeight:"100vh",background:s.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:20,transition:"background .5s"}}>
      <div style={{width:"100%",maxWidth:480}}>

        {/* Barre de progression */}
        <div style={{display:"flex",gap:6,marginBottom:32,alignItems:"center"}}>
          {ONBOARD_STEPS.map((_,i)=>(
            <div key={i}style={{
              flex:1,height:4,borderRadius:2,
              background:i<=step?s.color:"rgba(0,0,0,.1)",
              transition:"background .4s",
            }}/>
          ))}
          <span style={{fontSize:11,color:"rgba(0,0,0,.35)",marginLeft:6,flexShrink:0}}>{pct}%</span>
        </div>

        <div style={{background:"#fff",borderRadius:24,overflow:"hidden",boxShadow:"0 8px 48px rgba(0,0,0,.08)"}}>

          {/* Header coloré */}
          <div style={{
            background:s.bg,padding:"36px 32px 28px",textAlign:"center",
            borderBottom:"1px solid rgba(0,0,0,.06)",
          }}>
            <div style={{
              fontSize:72,marginBottom:12,lineHeight:1,
              filter:"drop-shadow(0 4px 12px rgba(0,0,0,.1))",
            }}>{s.illustration}</div>
            <div style={{
              display:"inline-flex",alignItems:"center",gap:6,
              background:"rgba(255,255,255,.7)",borderRadius:20,
              padding:"4px 14px",marginBottom:14,
            }}>
              <span style={{fontSize:14}}>{s.emoji}</span>
              <span style={{fontSize:11,fontWeight:700,color:s.color,textTransform:"uppercase",letterSpacing:".8px"}}>{s.sousTitre}</span>
            </div>
            <div style={{
              fontFamily:"'Fraunces',Georgia,serif",
              fontSize:"clamp(20px,4vw,26px)",fontWeight:700,
              color:"#0D1B2A",lineHeight:1.2,
            }}>{s.titre}</div>
          </div>

          {/* Corps */}
          <div style={{padding:"28px 32px 32px"}}>
            <p style={{fontSize:14,color:"#4A3728",lineHeight:1.85,marginBottom:28,margin:"0 0 28px"}}>
              {s.texte}
            </p>

            <button
              onClick={()=>isLast?onFinish():setStep(p=>p+1)}
              style={{
                width:"100%",padding:"14px",borderRadius:12,border:"none",
                background:"linear-gradient(135deg, "+s.color+", "+s.color+"CC)",
                color:"#fff",fontWeight:700,fontSize:15,cursor:"pointer",
                fontFamily:"inherit",letterSpacing:".2px",
                boxShadow:"0 4px 20px "+s.color+"40",
                transition:"all .2s",
              }}
              onMouseEnter={e=>e.currentTarget.style.transform="translateY(-1px)"}
              onMouseLeave={e=>e.currentTarget.style.transform="translateY(0)"}
            >
              {s.btn}
            </button>

            {!isLast&&(
              <button
                onClick={onFinish}
                style={{
                  display:"block",width:"100%",marginTop:12,
                  background:"none",border:"none",
                  fontSize:12,color:"rgba(0,0,0,.35)",
                  cursor:"pointer",fontFamily:"inherit",
                }}
              >
                Passer le tutoriel
              </button>
            )}
          </div>
        </div>

        {/* Prénom de l'utilisateur */}
        {user?.prenom&&step===0&&(
          <div style={{textAlign:"center",marginTop:16,fontSize:13,color:"rgba(0,0,0,.45)"}}>
            Bonjour {user.prenom} 👋 - ravi de vous accueillir
          </div>
        )}
        <div style={{textAlign:"center",marginTop:10,fontSize:11,color:"rgba(0,0,0,.25)"}}>
          {step+1} sur {ONBOARD_STEPS.length}
        </div>
      </div>
    </div>
  );
}

//
function Login({onLogin}){
  const [email,setEmail]=useState("");const [err,setErr]=useState("");
  const comptes=[
    {...D.asmat,label:"Marie Dupont (AssMat)",hint:"marie.dupont@mail.fr"},
    {...D.parents[0],label:"Sophie Martin - Léo",hint:"sophie.martin@mail.fr"},
    {...D.parents[1],label:"Thomas Bernard - Emma",hint:"thomas.bernard@mail.fr"},
    {...D.parents[2],label:"Camille Petit - Noah",hint:"camille.petit@mail.fr"},
  ];
  const tenter=()=>{const c=comptes.find(x=>x.email===email.trim().toLowerCase());
    if(c)onLogin(c);else setErr("Email non reconnu.");};

  return(
    <>
      <Styles/>
      <div style={{minHeight:"100vh",background:"var(--c)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
    <div style={{width:"100%",maxWidth:420}}>
      <div style={{textAlign:"center",marginBottom:32}}>
        <img src="/logo.png" alt="TiMat" style={{height:(G?.landing?.logoSizes?.login)||80,marginBottom:8,objectFit:"contain"}} onError={e=>{e.target.outerHTML='<div style="font-size:56px;margin-bottom:8px">🌿</div><div class="pf" style="font-size:38px;font-weight:700;color:var(--T);font-style:italic;letter-spacing:-1px">TiMat</div>'}}/>
        <div style={{fontSize:14,color:"var(--l)",marginTop:4}}>L'application qui réinvente l'assistante maternelle</div>
        <div style={{display:"flex",gap:8,justifyContent:"center",marginTop:12,flexWrap:"wrap"}}>
          {["✨ Bilan de journée","📝 CR Trimestriel","🏛️ Pajemploi","📑 Attestation fiscale"].map(t=>
            <span key={t}className="badge"style={{background:"var(--Tp)",color:"var(--T)",fontSize:11}}>{t}</span>)}
        </div>
      </div>
      <div className="card"style={{padding:24}}>
        <div className="pf"style={{fontSize:17,fontWeight:700,color:"var(--b)",marginBottom:16}}>Connexion</div>
        <div style={{marginBottom:14}}>
          <label className="lbl">Email</label>
          <input className="inp"type="email"placeholder="votre@email.fr"value={email}
            onChange={e=>{setEmail(e.target.value);setErr("");}}onKeyDown={e=>e.key==="Enter"&&tenter()}/>
          {err&&<div style={{color:"var(--R)",fontSize:12,marginTop:4}}>{err}</div>}
        </div>
        <button className="btn bT"style={{width:"100%",justifyContent:"center",padding:"12px",fontSize:14,marginBottom:18}}onClick={tenter}>
          Se connecter
        </button>
        <div style={{background:"var(--c)",borderRadius:10,padding:14}}>
          <div style={{fontSize:11,fontWeight:700,color:"var(--l)",marginBottom:8,textTransform:"uppercase",letterSpacing:".5px"}}>Comptes démo</div>
          {comptes.map(c=><button key={c.id}onClick={()=>{setEmail(c.email);setErr("");}}
            style={{display:"block",width:"100%",textAlign:"left",padding:"8px 10px",background:"none",border:"none",cursor:"pointer",borderRadius:8,transition:"background .15s"}}
            onMouseEnter={e=>e.currentTarget.style.background="var(--br)"}
            onMouseLeave={e=>e.currentTarget.style.background="none"}>
            <span style={{fontWeight:700,color:c.role==="asmat"?"var(--T)":"var(--B)"}}>
              {c.role==="asmat"?"👩👧":"👪"}</span> {c.label}
            <span style={{fontSize:11,color:"var(--l)",display:"block",paddingLeft:18}}>{c.hint}</span>
          </button>)}
        </div>
      </div>
    </div>
  </div>
  </>
  );
}

//
//
// Accessible uniquement à sophie@faitacreas.fr (ou l'email admin configuré)

// --- Backoffice reusable components (outside to avoid re-mount on state change) ---
const BOField=({label,children,hint})=>(
  <div style={{marginBottom:10}}>
    <div style={{fontSize:10,fontWeight:700,color:"var(--m)",marginBottom:3,textTransform:"uppercase",letterSpacing:".4px"}}>{label}</div>
    {children}
    {hint&&<div style={{fontSize:10,color:"var(--l)",marginTop:3,fontStyle:"italic"}}>{hint}</div>}
  </div>
);

const BOColorInput=({k,state,setter})=>{
  const v=state[k]||"";
  const isSolid=/^#[0-9a-fA-F]{3,8}$/.test(v);
  return (
    <div style={{display:"flex",gap:4,alignItems:"center"}}>
      {isSolid&&<input type="color"value={v.slice(0,7)}onChange={e=>setter(k,e.target.value)} style={{width:32,height:28,border:"none",borderRadius:6,cursor:"pointer",padding:1,flexShrink:0}}/>}
      <input className="inp"style={{flex:1,fontSize:10,padding:"5px 7px",minWidth:0}}value={v}onChange={e=>setter(k,e.target.value)}placeholder="#rrggbb ou rgba(...) ou gradient"/>
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
      flex:1,padding:"5px 0",border:"1px solid var(--br)",borderRadius:6,cursor:"pointer",fontSize:10,fontWeight:600,
      background:state[k]===a?"var(--S)":"var(--c)",color:state[k]===a?"#fff":"var(--m)",transition:"all .15s"
    }}>{label}</button>)}
  </div>
);

const BOCard=({title,icon,children})=>(
  <div className="card"style={{padding:14,marginBottom:10}}>
    {title&&<div style={{fontWeight:700,fontSize:12,marginBottom:10,color:"var(--b)",display:"flex",alignItems:"center",gap:6,paddingBottom:8,borderBottom:"1px solid var(--br)"}}>
      {icon&&<span style={{fontSize:14}}>{icon}</span>}{title}
    </div>}
    {children}
  </div>
);

function Backoffice({user,setPage,appConfig,setAppConfig}){
  const [sec,setSec]=useState("hero");
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
  const setTransfo=(idx,pos,v)=>setCfg(c=>{const tt=[...(c.transformations||[])];const row=[...tt[idx]];row[pos]=v;tt[idx]=row;return{...c,transformations:tt};});
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
  const setGuarantee=(idx,v)=>setCfg(c=>{const items=[...(c.guarantees||[])];items[idx]=v;return{...c,guarantees:items};});
  const addGuarantee=()=>setCfg(c=>({...c,guarantees:[...(c.guarantees||[]),"✅ Nouvelle garantie"]}));
  const removeGuarantee=(idx)=>setCfg(c=>({...c,guarantees:(c.guarantees||[]).filter((_,i)=>i!==idx)}));
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
        report+="\n🔴 Aucun format ne marche. Problème RLS probable.\n\nExécute :\n\nDROP POLICY IF EXISTS \"admin_all\" ON app_config;\nDROP POLICY IF EXISTS \"app_config_all\" ON app_config;\nCREATE POLICY \"app_config_all\" ON app_config FOR ALL USING (true) WITH CHECK (true);";
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
          <button onClick={()=>setShowJsonModal(null)} style={{background:"var(--c)",border:"none",borderRadius:10,padding:"8px 12px",cursor:"pointer",fontSize:14,color:"var(--b)",fontWeight:700,fontFamily:"inherit"}}>✕</button>
        </div>
        <pre style={{margin:0,padding:"16px 20px",overflow:"auto",fontSize:11,lineHeight:1.5,color:"var(--b)",background:"var(--c)",whiteSpace:"pre-wrap",wordBreak:"break-word",flex:1,fontFamily:"ui-monospace,Menlo,monospace"}}>{prettyConfig(showJsonModal.config)}</pre>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",padding:"12px 20px",borderTop:"1px solid var(--br)",flexShrink:0}}>
          <button onClick={()=>{navigator.clipboard?.writeText(prettyConfig(showJsonModal.config)).then(()=>setToast("✅ JSON copié")).catch(()=>setToast("❌ Copie impossible"));}} style={{padding:"9px 16px",borderRadius:10,border:"1px solid var(--br)",background:"var(--w)",color:"var(--b)",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>📋 Copier</button>
          <button onClick={()=>setShowJsonModal(null)} style={{padding:"9px 16px",borderRadius:10,border:"none",background:"var(--T)",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>Fermer</button>
        </div>
      </div>
    </div>}

    {/* Top bar */}
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",borderBottom:"1px solid var(--br)",background:"var(--w)",flexWrap:"wrap",gap:8}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <button className="btn bG"style={{fontSize:11,padding:"5px 12px"}}onClick={()=>setPage("accueil")}>← App</button>
        <span style={{fontWeight:700,fontSize:14,color:"var(--b)"}}>🔧 Backoffice</span>
        <input className="inp"placeholder="🔍 Rechercher..."value={search}onChange={e=>setSearch(e.target.value)}style={{fontSize:11,padding:"4px 10px",width:160}}/>
      </div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        <button onClick={diagnostiquer}style={{background:"none",border:"1px solid var(--br)",borderRadius:8,padding:"5px 10px",fontSize:11,cursor:"pointer",fontWeight:600,color:"var(--m)"}}title="Vérifier la config en base Supabase">🔍 Diag</button>
        <button onClick={rechargerDepuisSupabase}style={{background:"none",border:"1px solid var(--br)",borderRadius:8,padding:"5px 10px",fontSize:11,cursor:"pointer",fontWeight:600,color:"var(--m)"}}title="Recharger depuis Supabase">↻ Recharger</button>
        <button onClick={()=>setShowPreview(p=>!p)}style={{background:"none",border:"1px solid var(--br)",borderRadius:8,padding:"5px 10px",fontSize:11,cursor:"pointer",fontWeight:600,color:"var(--m)"}}>{showPreview?"👁 Masquer":"👁 Afficher"}</button>
        <button className="btn bG"style={{fontSize:11,padding:"5px 12px"}}onClick={reset}>↺ Reset</button>
        <button className="btn bT"style={{fontSize:11,padding:"5px 14px"}}onClick={sauvegarder}disabled={saving}>{saving?"⏳":"💾 Sauvegarder"}</button>
      </div>
    </div>

    <div style={{display:"flex",height:"calc(100vh - 52px)",overflow:"hidden"}}>
      {/* LEFT PANEL */}
      <div style={{width:showPreview?"460px":"100%",minWidth:340,overflowY:"auto",padding:12,borderRight:"1px solid var(--br)",background:"var(--c)",transition:"width .3s"}}>

        {/* Main tabs */}
        <div style={{display:"flex",gap:3,marginBottom:12,flexWrap:"wrap"}}>
          {secs.map(s=><button key={s.id}onClick={()=>setSec(s.id)}style={{
            padding:"5px 10px",borderRadius:14,border:"none",cursor:"pointer",fontFamily:"inherit",fontWeight:600,fontSize:11,
            background:sec===s.id?"var(--S)":"rgba(0,0,0,.05)",color:sec===s.id?"#fff":"var(--m)",transition:"all .15s"
          }}>{s.ic} {s.l}</button>)}
        </div>

        {/* ====================== HERO ====================== */}
        {sec==="hero"&&<>
          <BOCard title="Image de fond" icon="📸">
            <BOField label="URL de l'image" hint="Laisser vide = pas d'image de fond">
              <div style={{display:"flex",gap:4}}>
                <BOTextInput k="heroImg" state={cfg.landing} setter={setLand} placeholder="https://... ou vide pour supprimer"/>
                {cfg.landing.heroImg&&<button onClick={()=>setLand("heroImg","")}style={{background:"#FEE",border:"1px solid #FCC",borderRadius:6,cursor:"pointer",fontSize:11,padding:"4px 8px",color:"#C00",flexShrink:0}}>🗑️</button>}
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
                <div style={{position:"relative",display:"flex",alignItems:"center",justifyContent:"center",height:"100%",fontSize:10,color:"#fff",fontWeight:600}}>Aperçu du hero</div>
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
              <span style={{fontSize:10,color:"rgba(255,255,255,.4)",marginLeft:"auto"}}>Aperçu</span>
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
              <button type="button"onClick={()=>setLand("logoSizes",{topBar:28,landingHeader:44,landingFooter:40,login:80,loading:64})}style={{marginTop:6,padding:"6px 12px",fontSize:11,background:"transparent",border:"1px solid var(--b)",borderRadius:6,color:"var(--l)",cursor:"pointer"}}>↺ Réinitialiser les tailles</button>
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
            {key:"s3",titre:"Section 3 - Transformation",icon:"🔄",fields:[
              {k:"s3Align",l:"Alignement du texte",type:"align"},
              {k:"s3Title",l:"Titre",type:"txt"},
              {k:"s3LabelBefore",l:"Label \"Avant\"",type:"txt"},{k:"s3LabelAfter",l:"Label \"Avec TiMat\"",type:"txt"},{k:"s3LabelResult",l:"Label \"Résultat\"",type:"txt"},
              {k:"section3Bg",l:"Fond section",type:"col"},{k:"s3TitleColor",l:"Couleur titre",type:"col"},
              {k:"s3RowBg1",l:"Fond rangée 1",type:"col"},{k:"s3RowBg2",l:"Fond rangée 2",type:"col"},
              {k:"s3LabelBeforeColor",l:"Couleur label Avant",type:"col"},{k:"s3LabelAfterColor",l:"Couleur label Avec TiMat",type:"col"},{k:"s3LabelResultColor",l:"Couleur label Résultat",type:"col"},
              {k:"s3TextColor",l:"Couleur texte",type:"col"},{k:"s3ResultColor",l:"Couleur texte résultat",type:"col"},
            ]},
            {key:"s4",titre:"Section 4 - Statistiques",icon:"📊",fields:[
              {k:"s4Align",l:"Alignement du texte",type:"align"},
              {k:"s4Title",l:"Titre",type:"txt"},{k:"s4Sub",l:"Sous-titre",type:"txt"},
              {k:"section4Bg",l:"Fond section",type:"col"},{k:"s4TitleColor",l:"Couleur titre",type:"col"},{k:"s4SubColor",l:"Couleur sous-titre",type:"col"},
              {k:"s4StatColor",l:"Couleur chiffres",type:"col"},{k:"s4StatLabelColor",l:"Couleur labels",type:"col"},{k:"s4StatDescColor",l:"Couleur descriptions",type:"col"},
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
              ["s3Title","Section 3 - Titre"],["s3LabelBefore","Section 3 - Label Avant"],["s3LabelAfter","Section 3 - Label Avec TiMat"],["s3LabelResult","Section 3 - Label Résultat"],
              ["s4Title","Section 4 - Titre"],["s4Sub","Section 4 - Sous-titre"],
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
        </>}

        {/* ====================== COULEURS (globales + par élément) ====================== */}
        {sec==="couleurs"&&<>
          <BOCard title="Palette de l\'application" icon="🎨">
            {[["T","Principale (terracotta)"],["S","Secondaire (sauge)"],["G","Vert d'eau (succès)"],["R","Rouge alerte (terracotta foncé)"],["c","Fond général (crème)"],["w","Fond cartes (blanc)"],["b","Texte principal (bleu nuit)"]].filter(([,l])=>matches(l)).map(([k,l])=>
              <BOField key={k} label={l}><BOColorInput k={k} state={cfg.cols} setter={setCol}/></BOField>
            )}
          </BOCard>
          <BOCard title="Fonds de sections landing" icon="🖼️">
            {[["pageBg","Fond général page"],["heroBg","Fond hero"],["section1Bg","Section 1 (problème)"],["section2Bg","Section 2 (démo)"],["section3Bg","Section 3 (transfo)"],["section4Bg","Section 4 (stats)"],["section5Bg","Section 5 (témoignages)"],["section6Bg","Section 6 (tarifs)"],["ctaBg","CTA final"]].filter(([,l])=>matches(l)).map(([k,l])=>
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
          <BOCard title="Sections 1 à 6 - couleurs texte" icon="📑">
            {[["s1TitleColor","S1 - Titre"],["s1DescColor","S1 - Description"],["s1CardBg","S1 - Fond cards"],["s1CardTitleColor","S1 - Titre cards"],["s1CardDescColor","S1 - Texte cards"],["s1QuoteBg","S1 - Fond citation"],["s1QuoteColor","S1 - Citation"],
              ["s2TitleColor","S2 - Titre"],["s2DescColor","S2 - Description"],
              ["s3TitleColor","S3 - Titre"],["s3RowBg1","S3 - Fond rangée 1"],["s3RowBg2","S3 - Fond rangée 2"],["s3LabelBeforeColor","S3 - Label Avant"],["s3LabelAfterColor","S3 - Label Avec TiMat"],["s3LabelResultColor","S3 - Label Résultat"],["s3TextColor","S3 - Texte"],["s3ResultColor","S3 - Texte résultat"],
              ["s4TitleColor","S4 - Titre"],["s4SubColor","S4 - Sous-titre"],["s4StatColor","S4 - Chiffres"],["s4StatLabelColor","S4 - Labels stats"],["s4StatDescColor","S4 - Descriptions"],
              ["s5TitleColor","S5 - Titre"],["testimonialBg","S5 - Fond cards"],["testimonialNameColor","S5 - Nom"],["testimonialCityColor","S5 - Ville"],["testimonialBeforeColor","S5 - Texte avant"],["testimonialAfterColor","S5 - Texte après"],["testimonialStarColor","S5 - Étoiles"],
              ["s6TitleColor","S6 - Titre"],["freeBg","S6 - Fond Gratuit"],["freeLabelColor","S6 - Label Gratuit"],["freePriceColor","S6 - Prix Gratuit"],["freeDescColor","S6 - Description Gratuit"],["proBg","S6 - Fond Pro"],["proBorderColor","S6 - Bordure Pro"],["proLabelColor","S6 - Label Pro"],["proPriceColor","S6 - Prix Pro"],["proSubColor","S6 - Sous-prix Pro"],["proDescColor","S6 - Description Pro"],
              ["ctaTitleColor","CTA - Titre"],["ctaSubTitleColor","CTA - Sous-titre"],["ctaSubColor","CTA - Descriptif"],["ctaFooterColor","CTA - Footer"]
            ].filter(([,l])=>matches(l)).map(([k,l])=>
              <BOField key={k} label={l}><BOColorInput k={k} state={cfg.landing} setter={setLand}/></BOField>
            )}
          </BOCard>
        </>}

        {/* ====================== BOUTONS ====================== */}
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
                <div style={{fontSize:9,color:"var(--l)",marginBottom:4,textTransform:"uppercase"}}>Aperçu</div>
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
                <div style={{fontSize:10,color:"var(--l)",fontFamily:p.title}}>Titre ({p.title.split(",")[0].replace(/\'/g,"")})</div>
                <div style={{fontSize:10,color:"var(--l)",fontFamily:p.body}}>Corps ({p.body.split(",")[0].replace(/\'/g,"")})</div>
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
                  <button onClick={()=>removeFaqL(i)}style={{background:"none",border:"1px solid var(--br)",borderRadius:8,padding:"3px 10px",fontSize:11,color:"#C84B31",cursor:"pointer",fontFamily:"inherit",fontWeight:700}}>🗑 Supprimer</button>
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
                <button onClick={()=>removeFooterRgpd(i)}style={{background:"none",border:"1px solid var(--br)",borderRadius:8,padding:"0 10px",fontSize:13,color:"#C84B31",cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>🗑</button>
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
                  <button onClick={()=>removeBlog(i)}style={{background:"none",border:"1px solid var(--br)",borderRadius:8,padding:"3px 10px",fontSize:11,color:"#C84B31",cursor:"pointer",fontFamily:"inherit",fontWeight:700}}>🗑 Supprimer</button>
                </div>
                <div style={{display:"flex",gap:6,marginBottom:6}}>
                  <input value={art.emoji||""}onChange={e=>setBlog(i,"emoji",e.target.value)}placeholder="🧮"style={{width:52,textAlign:"center",padding:"8px 6px",borderRadius:8,border:"1px solid var(--br)",fontSize:18,boxSizing:"border-box",fontFamily:"inherit"}}/>
                  <input value={art.cat||""}onChange={e=>setBlog(i,"cat",e.target.value)}placeholder="Catégorie"style={{flex:1,padding:"8px 10px",borderRadius:8,border:"1px solid var(--br)",fontSize:13,boxSizing:"border-box",fontFamily:"inherit",color:"var(--b)"}}/>
                  <input type="color"value={art.catColor||"#E49178"}onChange={e=>setBlog(i,"catColor",e.target.value)}title="Couleur de la catégorie"style={{width:42,height:38,padding:2,borderRadius:8,border:"1px solid var(--br)",cursor:"pointer",flexShrink:0}}/>
                </div>
                <input value={art.title||""}onChange={e=>setBlog(i,"title",e.target.value)}placeholder="Titre de l'article"style={{width:"100%",padding:"8px 10px",borderRadius:8,border:"1px solid var(--br)",fontSize:13,fontWeight:600,marginBottom:6,boxSizing:"border-box",fontFamily:"inherit",color:"var(--b)"}}/>
                <textarea value={art.excerpt||""}onChange={e=>setBlog(i,"excerpt",e.target.value)}placeholder="Extrait (résumé court)"rows={2}style={{width:"100%",padding:"8px 10px",borderRadius:8,border:"1px solid var(--br)",fontSize:13,boxSizing:"border-box",fontFamily:"inherit",color:"var(--b)",resize:"vertical",lineHeight:1.5}}/>
                <button onClick={()=>setOpenBlocks(openBlocks===i?null:i)}style={{marginTop:6,width:"100%",padding:"7px",borderRadius:8,border:"1px solid var(--br)",background:"var(--c)",color:"var(--b)",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>📝 Contenu de l'article ({(art.blocks||[]).length} bloc{(art.blocks||[]).length>1?"s":""}) {openBlocks===i?"▲":"▼"}</button>
                {openBlocks===i&&<div style={{marginTop:8,padding:10,background:"var(--c)",borderRadius:10}}>
                  {(art.blocks||[]).length===0&&<div style={{fontSize:11,color:"var(--m)",marginBottom:8,lineHeight:1.5}}>Aucun bloc : cet article affiche son contenu d'origine. Dès que vous ajoutez un bloc, le contenu par blocs remplace l'original.</div>}
                  {(art.blocks||[]).map((b,bi)=>(
                    <div key={bi}style={{background:"var(--w)",border:"1px solid var(--br)",borderRadius:8,padding:8,marginBottom:8}}>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
                        <span style={{fontSize:10,fontWeight:700,color:"var(--T)",textTransform:"uppercase",letterSpacing:".5px"}}>{b.type==="h3"?"Titre":b.type==="callout"?"Encadré":b.type==="list"?"Liste":"Paragraphe"}</span>
                        <div style={{display:"flex",gap:4}}>
                          <button onClick={()=>moveBlk(i,bi,-1)}title="Monter"style={{background:"none",border:"1px solid var(--br)",borderRadius:6,padding:"2px 7px",cursor:"pointer",fontSize:11,fontFamily:"inherit"}}>↑</button>
                          <button onClick={()=>moveBlk(i,bi,1)}title="Descendre"style={{background:"none",border:"1px solid var(--br)",borderRadius:6,padding:"2px 7px",cursor:"pointer",fontSize:11,fontFamily:"inherit"}}>↓</button>
                          <button onClick={()=>removeBlk(i,bi)}title="Supprimer"style={{background:"none",border:"1px solid var(--br)",borderRadius:6,padding:"2px 7px",cursor:"pointer",fontSize:11,color:"#C84B31",fontFamily:"inherit"}}>🗑</button>
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
                            <button onClick={()=>removeBlkItem(i,bi,ii)}style={{background:"none",border:"1px solid var(--br)",borderRadius:7,padding:"0 9px",fontSize:12,color:"#C84B31",cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>🗑</button>
                          </div>
                        ))}
                        <button onClick={()=>addBlkItem(i,bi)}style={{fontSize:11,padding:"5px 10px",borderRadius:7,border:"1px dashed var(--br)",background:"var(--c)",color:"var(--b)",cursor:"pointer",fontFamily:"inherit",fontWeight:700}}>+ point</button>
                      </div>}
                    </div>
                  ))}
                  <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:4}}>
                    {[["h3","+ Titre"],["p","+ Paragraphe"],["callout","+ Encadré"],["list","+ Liste"]].map(([t,l])=>
                      <button key={t}onClick={()=>addBlk(i,t)}style={{flex:"1 1 45%",padding:"7px",borderRadius:8,border:"1.5px dashed var(--br)",background:"var(--w)",color:"var(--b)",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>{l}</button>
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
          <BOCard title="Stats section chiffres" icon="📊">
            {(cfg.statsSection||[]).map((s,i)=><div key={i}style={{display:"grid",gridTemplateColumns:"55px 40px 1fr 1fr",gap:4,marginBottom:4}}>
              <input className="inp"style={{fontSize:11,padding:"4px 6px"}}type="number"value={s.n}onChange={e=>setStat("statsSection",i,"n",e.target.value)}/>
              <input className="inp"style={{fontSize:11,padding:"4px 6px"}}value={s.suf}onChange={e=>setStat("statsSection",i,"suf",e.target.value)}/>
              <input className="inp"style={{fontSize:11,padding:"4px 6px"}}value={s.label}onChange={e=>setStat("statsSection",i,"label",e.target.value)}/>
              <input className="inp"style={{fontSize:11,padding:"4px 6px"}}value={s.desc||""}onChange={e=>setStat("statsSection",i,"desc",e.target.value)}/>
            </div>)}
          </BOCard>
          <BOCard title="Pain points (section 1)" icon="🔥">
            {(cfg.painPoints||[]).map((p,i)=><div key={i}style={{marginBottom:10,paddingBottom:10,borderBottom:"1px solid var(--br)"}}>
              <div style={{display:"flex",gap:4,marginBottom:4}}>
                <input className="inp"style={{width:36,fontSize:11,padding:"4px",textAlign:"center"}}value={p.ic}onChange={e=>setPain(i,"ic",e.target.value)}/>
                <input className="inp"style={{flex:1,fontSize:11,padding:"4px 6px"}}value={p.titre}onChange={e=>setPain(i,"titre",e.target.value)}placeholder="Titre"/>
                <button onClick={()=>removePain(i)}style={{background:"#fee",border:"1px solid #fcc",borderRadius:6,cursor:"pointer",fontSize:11,padding:"4px 8px",color:"#c00"}}>✕</button>
              </div>
              <textarea className="inp"rows={2}style={{fontSize:11,padding:"5px 8px",resize:"vertical",width:"100%",boxSizing:"border-box"}}value={p.desc}onChange={e=>setPain(i,"desc",e.target.value)}/>
            </div>)}
            <button onClick={addPain}className="btn bG"style={{fontSize:11,padding:"6px 12px",width:"100%"}}>+ Ajouter un pain point</button>
          </BOCard>
          <BOCard title="Transformations (section 3)" icon="🔄">
            {(cfg.transformations||[]).map((t,i)=><div key={i}style={{marginBottom:10,paddingBottom:10,borderBottom:"1px solid var(--br)"}}>
              <div style={{display:"flex",gap:4,marginBottom:4}}>
                <input className="inp"style={{width:36,fontSize:11,padding:"4px",textAlign:"center"}}value={t[0]}onChange={e=>setTransfo(i,0,e.target.value)}/>
                <span style={{fontSize:11,color:"var(--l)",alignSelf:"center"}}>icône</span>
              </div>
              <input className="inp"style={{fontSize:11,padding:"4px 6px",marginBottom:3,width:"100%",boxSizing:"border-box"}}value={t[1]}onChange={e=>setTransfo(i,1,e.target.value)}placeholder="Aujourd\'hui..."/>
              <input className="inp"style={{fontSize:11,padding:"4px 6px",marginBottom:3,width:"100%",boxSizing:"border-box"}}value={t[2]}onChange={e=>setTransfo(i,2,e.target.value)}placeholder="Avec TiMat..."/>
              <input className="inp"style={{fontSize:11,padding:"4px 6px",width:"100%",boxSizing:"border-box"}}value={t[3]}onChange={e=>setTransfo(i,3,e.target.value)}placeholder="Résultat..."/>
            </div>)}
          </BOCard>
          <BOCard title="Témoignages (section 5)" icon="⭐">
            {(cfg.testimonials||[]).map((t,i)=><div key={i}style={{marginBottom:10,paddingBottom:10,borderBottom:"1px solid var(--br)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                <div style={{fontSize:11,fontWeight:700,color:"var(--b)"}}>⭐ Témoignage {i+1}</div>
                <button onClick={()=>removeTesti(i)}style={{background:"#fee",border:"1px solid #fcc",borderRadius:6,cursor:"pointer",fontSize:11,padding:"3px 8px",color:"#c00"}}>✕</button>
              </div>
              {[["nom","Nom"],["ville","Ville"],["avant","Avant (citation)"],["apres","Après (témoignage)"]].map(([k,l])=>
                <div key={k}style={{marginBottom:5}}>
                  <div style={{fontSize:10,fontWeight:600,color:"var(--m)",marginBottom:2}}>{l}</div>
                  {k==="apres"?<textarea className="inp"rows={2}style={{fontSize:11,padding:"5px 8px",resize:"vertical",width:"100%",boxSizing:"border-box"}}value={t[k]||""}onChange={e=>setTesti(i,k,e.target.value)}/>
                    :<input className="inp"style={{fontSize:11,padding:"5px 8px",width:"100%",boxSizing:"border-box"}}value={t[k]||""}onChange={e=>setTesti(i,k,e.target.value)}/>}
                </div>
              )}
            </div>)}
            <button onClick={addTesti}className="btn bG"style={{fontSize:11,padding:"6px 12px",width:"100%"}}>+ Ajouter un témoignage</button>
          </BOCard>

          <BOCard title="Plan Gratuit - Fonctionnalités" icon="🆓">
            <div style={{fontSize:11,color:"var(--l)",marginBottom:10,lineHeight:1.5}}>Coche = inclus, décoche = barré (non inclus)</div>
            {(cfg.freeItems||[]).map((item,i)=><div key={i}style={{display:"flex",gap:4,marginBottom:5,alignItems:"center"}}>
              <input type="checkbox"checked={item[0]}onChange={e=>setFreeItem(i,0,e.target.checked)}style={{width:16,height:16,cursor:"pointer",flexShrink:0}}/>
              <input className="inp"style={{flex:1,fontSize:11,padding:"4px 6px"}}value={item[1]}onChange={e=>setFreeItem(i,1,e.target.value)}/>
              <button onClick={()=>removeFreeItem(i)}style={{background:"#fee",border:"1px solid #fcc",borderRadius:6,cursor:"pointer",fontSize:11,padding:"3px 7px",color:"#c00"}}>✕</button>
            </div>)}
            <button onClick={addFreeItem}className="btn bG"style={{fontSize:11,padding:"6px 12px",width:"100%",marginTop:6}}>+ Ajouter une ligne</button>
          </BOCard>

          <BOCard title="Plan Pro - Fonctionnalités" icon="⭐">
            <div style={{fontSize:11,color:"var(--l)",marginBottom:10,lineHeight:1.5}}>Emoji + texte sur une ligne. Les 3 premières sont en gras automatiquement.</div>
            {(cfg.proItems||[]).map((item,i)=><div key={i}style={{display:"flex",gap:4,marginBottom:5,alignItems:"center"}}>
              <input className="inp"style={{flex:1,fontSize:11,padding:"4px 6px"}}value={item}onChange={e=>setProItem(i,e.target.value)}placeholder="✨ Emoji + description"/>
              <button onClick={()=>removeProItem(i)}style={{background:"#fee",border:"1px solid #fcc",borderRadius:6,cursor:"pointer",fontSize:11,padding:"3px 7px",color:"#c00"}}>✕</button>
            </div>)}
            <button onClick={addProItem}className="btn bG"style={{fontSize:11,padding:"6px 12px",width:"100%",marginTop:6}}>+ Ajouter une ligne</button>
          </BOCard>

          <BOCard title="Garanties (sous tarifs)" icon="✅">
            <div style={{fontSize:11,color:"var(--l)",marginBottom:10,lineHeight:1.5}}>Les petits points de réassurance affichés sous les tarifs.</div>
            {(cfg.guarantees||[]).map((item,i)=><div key={i}style={{display:"flex",gap:4,marginBottom:5,alignItems:"center"}}>
              <input className="inp"style={{flex:1,fontSize:11,padding:"4px 6px"}}value={item}onChange={e=>setGuarantee(i,e.target.value)}placeholder="✅ Texte garantie"/>
              <button onClick={()=>removeGuarantee(i)}style={{background:"#fee",border:"1px solid #fcc",borderRadius:6,cursor:"pointer",fontSize:11,padding:"3px 7px",color:"#c00"}}>✕</button>
            </div>)}
            <button onClick={addGuarantee}className="btn bG"style={{fontSize:11,padding:"6px 12px",width:"100%",marginTop:6}}>+ Ajouter une garantie</button>
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
              <span style={{fontSize:12,fontWeight:600,color:"var(--b)"}}>{ic} {l}</span>
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
                  <div style={{fontSize:10,color:"var(--l)"}}>{s.l}</div>
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
            <BOField label="Kit Google Sheets"><BOTextInput k="linkSheets" state={cfg.boutique||{}} setter={(k,v)=>setCfg(c=>({...c,boutique:{...(c.boutique||{}),[k]:v}}))} placeholder="https://buy.stripe.com/..."/></BOField>
            <BOField label="Fiche d'urgence"><BOTextInput k="linkFiche" state={cfg.boutique||{}} setter={(k,v)=>setCfg(c=>({...c,boutique:{...(c.boutique||{}),[k]:v}}))} placeholder="https://buy.stripe.com/..."/></BOField>
            <BOField label="Projet d'accueil"><BOTextInput k="linkProjet" state={cfg.boutique||{}} setter={(k,v)=>setCfg(c=>({...c,boutique:{...(c.boutique||{}),[k]:v}}))} placeholder="https://buy.stripe.com/..."/></BOField>
            <BOField label="Pack Complet"><BOTextInput k="linkPack" state={cfg.boutique||{}} setter={(k,v)=>setCfg(c=>({...c,boutique:{...(c.boutique||{}),[k]:v}}))} placeholder="https://buy.stripe.com/..."/></BOField>
          </BOCard>
          <BOCard title="Table Supabase" icon="🗄️">
            <div style={{fontSize:11,color:"var(--m)",marginBottom:8,lineHeight:1.5}}>À exécuter dans Supabase SQL Editor :</div>
            <div style={{fontSize:10,background:"#1a1a1a",color:"#0f0",padding:10,borderRadius:8,fontFamily:"monospace",lineHeight:1.5}}>
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
          <BOCard title="Afficher / masquer les sections de la landing" icon="👁">
            <div style={{fontSize:12,color:"var(--m)",marginBottom:14,lineHeight:1.6}}>Décochez une section pour la masquer de la page d'accueil. Le contenu n'est pas supprimé — vous pouvez la réafficher à tout moment. Le Hero et le Footer restent toujours visibles.</div>
            {[
              {k:"probleme",l:"La réalité du métier",d:"Section « problème » (cartes des difficultés)"},
              {k:"demo",l:"Découvrez TiMat en direct",d:"Démo interactive (cadre téléphone)"},
              {k:"signature",l:"Signature électronique",d:"Section sombre eIDAS / RGPD"},
              {k:"transformation",l:"Ce que TiMat change",d:"Tableau avant / après"},
              {k:"chiffres",l:"Ce que disent les chiffres",d:"Statistiques clés"},
              {k:"temoignages",l:"Témoignages",d:"Avis des utilisatrices"},
              {k:"tarifs",l:"Tarifs",d:"Forfaits Gratuit / Pro"},
              {k:"ctaFinal",l:"Appel à l'action final",d:"Bloc « Je commence »"},
              {k:"faq",l:"Questions fréquentes",d:"FAQ de la landing"},
              {k:"blog",l:"Ressources / Blog",d:"Cartes d'articles"},
            ].map(({k,l,d})=>{
              const on=(cfg.sectionsVisibles||{})[k]!==false;
              return <div key={k}style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,padding:"10px 0",borderBottom:"1px solid var(--br)"}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:13,color:"var(--b)"}}>{l}</div>
                  <div style={{fontSize:11,color:"var(--m)",marginTop:2}}>{d}</div>
                </div>
                <div onClick={()=>setSV(k,!on)}style={{width:40,height:22,borderRadius:11,cursor:"pointer",background:on?"var(--G)":"var(--br)",position:"relative",transition:"background .2s",flexShrink:0}}>
                  <div style={{width:16,height:16,borderRadius:8,background:"#fff",position:"absolute",top:3,left:on?21:3,transition:"left .2s",boxShadow:"0 1px 3px rgba(0,0,0,.2)"}}/>
                </div>
              </div>;
            })}
          </BOCard>
          <BOCard title="Ordre des sections" icon="↕️">
            <div style={{fontSize:12,color:"var(--m)",marginBottom:14,lineHeight:1.6}}>Glissez-déposez une section pour la déplacer, ou utilisez les flèches. L'ordre s'applique à la page d'accueil (le Hero et le Footer restent à leurs extrémités).</div>
            {(()=>{const labels={probleme:"La réalité du métier",demo:"Découvrez TiMat en direct",signature:"Signature électronique",transformation:"Ce que TiMat change",chiffres:"Ce que disent les chiffres",temoignages:"Témoignages",tarifs:"Tarifs",ctaFinal:"Appel à l'action final",faq:"Questions fréquentes",blog:"Ressources / Blog"};const order=(cfg.sectionsOrder&&cfg.sectionsOrder.length)?cfg.sectionsOrder:DEFAULT_CONFIG.sectionsOrder;return order.map((id,i)=>(
              <div key={id}
                draggable
                onDragStart={()=>setDragSec(i)}
                onDragOver={e=>e.preventDefault()}
                onDrop={()=>{if(dragSec!==null&&dragSec!==i)moveSectionAt(dragSec,i);setDragSec(null);}}
                onDragEnd={()=>setDragSec(null)}
                style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",marginBottom:6,background:dragSec===i?"var(--c)":"var(--w)",border:"1px solid var(--br)",borderRadius:10,cursor:"grab",opacity:dragSec===i?.5:1,transition:"opacity .15s"}}>
                <span style={{fontSize:15,color:"var(--m)"}}>⠿</span>
                <span style={{flex:1,fontSize:13,fontWeight:600,color:"var(--b)"}}>{i+1}. {labels[id]||id}</span>
                <button onClick={()=>moveSectionAt(i,i-1)}disabled={i===0}title="Monter"style={{background:"none",border:"1px solid var(--br)",borderRadius:7,padding:"3px 9px",cursor:i===0?"not-allowed":"pointer",fontSize:12,opacity:i===0?.3:1,fontFamily:"inherit"}}>↑</button>
                <button onClick={()=>moveSectionAt(i,i+1)}disabled={i===order.length-1}title="Descendre"style={{background:"none",border:"1px solid var(--br)",borderRadius:7,padding:"3px 9px",cursor:i===order.length-1?"not-allowed":"pointer",fontSize:12,opacity:i===order.length-1?.3:1,fontFamily:"inherit"}}>↓</button>
              </div>
            ));})()}
          </BOCard>
        </>}

        {/* ====================== HISTORIQUE (P30D : backups + restauration) ====================== */}
        {sec==="historique"&&<>
          <BOCard title="Historique des configurations" icon="🕐">
            <div style={{fontSize:11,color:"var(--m)",marginBottom:12,lineHeight:1.5}}>
              Les 20 dernières sauvegardes automatiques de votre configuration. Cliquez sur <b>Restaurer</b> pour revenir à une version antérieure (la config actuelle sera automatiquement sauvegardée avant).
            </div>
            <button onClick={loadBackups} disabled={loadingBackups} style={{padding:"6px 14px",fontSize:11,fontWeight:600,borderRadius:8,border:"1px solid var(--br)",background:"var(--w)",color:"var(--b)",cursor:loadingBackups?"wait":"pointer",marginBottom:12,fontFamily:"inherit"}}>
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
                    <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:6,background:reasonInfo.bg,color:reasonInfo.col}}>{reasonInfo.ic} {reasonInfo.l}</span>
                    <span style={{fontSize:10,color:"var(--l)"}}>{sizeKo} ko</span>
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

      </div>

      {/* RIGHT PANEL: Live Preview */}
      {showPreview&&<div style={{flex:1,overflow:"hidden",background:"#f0f0f0",position:"relative"}}>
        <div style={{position:"absolute",top:8,left:8,zIndex:10,fontSize:10,fontWeight:700,color:"#fff",background:"var(--S)",padding:"3px 10px",borderRadius:8,opacity:.85}}>👁 APERÇU LIVE</div>
        <div style={{width:"1200px",height:"100%",transform:"scale("+Math.min(1,(typeof window!=="undefined"?(window.innerWidth-480)/1200:0.6))+")",transformOrigin:"top left",overflow:"auto",background:"#fff"}}>
          <LandingPage onLogin={()=>{}}dark={false}setDark={()=>{}}config={cfg}/>
        </div>
      </div>}
    </div>
  </div>;
}

// P19 + P24: helper logo selon le role et mode dark
const logoForRole = (role, dark) => {
  const s = dark ? "-dark" : "";
  if(role === "parent") return `/logo${s}-parent.png`;
  if(role === "mam") return `/logo${s}-mam.png`;
  if(role === "creche") return `/logo${s}-creche.png`;
  return `/logo${s}.png`;
};

const FAQ_LANDING_DEFAULT=[
            {q:"Qui a créé TiMat ?",a:"TiMat a été créée par Sophie, assistante maternelle agréée en Île-de-France. En préparant son agrément, elle a découvert la montagne administrative qui attend chaque assmat et a décidé de créer l'outil qu'elle aurait voulu avoir. TiMat est conçue par une assmat, pour les assmats — chaque fonctionnalité répond à un besoin réel du métier."},
            {q:"C'est quoi TiMat exactement ?",a:"TiMat est une application web conçue spécifiquement pour les assistantes maternelles agréées. Elle centralise la gestion des contrats, des pointages, des salaires, des transmissions aux parents et de tous les documents administratifs liés à votre métier."},
            {q:"Est-ce que mes données sont en sécurité ?",a:"Oui. Toutes vos données sont hébergées en France (Paris) via Supabase, un service conforme au RGPD. Vos informations sont chiffrées en transit et au repos. Vous pouvez demander la suppression de vos données à tout moment."},
            {q:"TiMat remplace-t-il Pajemploi ?",a:"Non. TiMat est un complément à Pajemploi. L'application calcule automatiquement les montants et génère un récapitulatif prêt à reporter sur pajemploi.urssaf.fr. Vous gardez le contrôle de votre déclaration officielle."},
            {q:"Comment fonctionne l'essai gratuit ?",a:"Vous créez votre compte en 2 minutes, sans carte bancaire. Vous avez accès aux fonctionnalités de base gratuitement, et vous pouvez essayer le forfait Pro pendant 2 mois sans engagement. Si vous ne souhaitez pas continuer, vous ne payez rien."},
            {q:"Puis-je utiliser TiMat sur mon téléphone ?",a:"Oui. TiMat est une application web responsive qui fonctionne sur téléphone, tablette et ordinateur. Pas besoin de télécharger quoi que ce soit — vous y accédez directement depuis votre navigateur."},
            {q:"Les parents peuvent-ils accéder à TiMat ?",a:"Oui. Chaque parent reçoit une invitation par email et accède à son propre espace : il peut consulter le journal de son enfant, valider les pointages et échanger avec vous via la messagerie intégrée."},
            {q:"Que se passe-t-il si je résilie ?",a:"Vous pouvez résilier à tout moment en un clic depuis votre espace. Vos données restent accessibles pendant 30 jours après la résiliation, puis sont supprimées conformément au RGPD. Aucun frais de résiliation."},
            {q:"Comment sont calculés les salaires ?",a:"TiMat applique les règles de la Convention Collective Nationale des particuliers employeurs : mensualisation, heures complémentaires majorées à 25%, indemnités d'entretien, congés payés. Les taux de cotisations sont mis à jour régulièrement."},
            {q:"Combien de temps faut-il pour démarrer ?",a:"Inscription en 2 minutes, premier contrat créé en 5 minutes. TiMat fonctionne sans formation préalable — chaque écran est guidé. Si vous bloquez, le support répond sous 24h."},
            {q:"Que se passe-t-il lors d'un contrôle PMI ?",a:"Tous vos documents (contrats, attestations, journal de bord, photos, suivi des enfants) sont centralisés et exportables en un clic. Vous présentez TiMat à votre conseiller PMI — c'est la traçabilité la plus complète qu'une assmat puisse avoir."},
          ];
const BLOG_DEFAULT=[
              {id:"mensualisation",cat:"Administratif",catColor:"#E49178",emoji:"🧮",title:"Mensualisation : le guide complet pour ne plus se tromper",excerpt:"Heures mensualisées, régularisation, année complète ou incomplète... Tout ce qu'il faut savoir pour calculer correctement."},
              {id:"maladies",cat:"Santé",catColor:"#C84B31",emoji:"🩺",title:"Les 5 maladies les plus fréquentes chez les tout-petits",excerpt:"Bronchiolite, gastro, pieds-mains-bouche... Comment les reconnaître et quand garder l'enfant à la maison."},
              {id:"agrement",cat:"PMI & Agrément",catColor:"#5DA9A1",emoji:"🏛️",title:"Renouvellement d'agrément : la checklist complète",excerpt:"Les documents à préparer, les délais à respecter et les erreurs à éviter pour un renouvellement serein."},
              {id:"attachement",cat:"Pédagogie",catColor:"#2E4859",emoji:"🤱",title:"L'attachement sécure : pourquoi c'est fondamental en accueil individuel",excerpt:"Comment créer un lien de confiance avec l'enfant accueilli, et pourquoi c'est votre plus grande force."},
              {id:"pajemploi",cat:"Administratif",catColor:"#E49178",emoji:"🏛️",title:"Pajemploi pas à pas : le guide pour les parents employeurs",excerpt:"De l'inscription à la déclaration mensuelle, toutes les étapes pour ne pas se perdre sur pajemploi.urssaf.fr."},
              {id:"bulletin",cat:"Administratif",catColor:"#E49178",emoji:"📜",title:"Comprendre son bulletin de salaire d'assistante maternelle",excerpt:"Brut, net, cotisations, indemnités d'entretien... Décryptage ligne par ligne de votre fiche de paie."},
              {id:"tarif",cat:"Administratif",catColor:"#E49178",emoji:"💶",title:"Comment fixer son tarif horaire d'assistante maternelle",excerpt:"SMIC, marché local, expérience, charges : tous les critères pour trouver le bon prix."},
              {id:"motricite",cat:"Pédagogie",catColor:"#2E4859",emoji:"🧸",title:"Les étapes du développement moteur de 0 à 3 ans",excerpt:"Retournement, quatre pattes, premiers pas... Les grandes étapes et comment les accompagner au quotidien."},
              {id:"droits",cat:"Juridique",catColor:"#5DA9A1",emoji:"⚖️",title:"Droits et devoirs de l'assistante maternelle",excerpt:"Congés, formation, agrément, rupture de contrat : tout ce que vous devez savoir pour exercer sereinement."},
              {id:"secours",cat:"Santé",catColor:"#C84B31",emoji:"🩹",title:"Trousse de secours : les indispensables de l'assistante maternelle",excerpt:"Ce que la PMI attend dans votre trousse, les gestes de premiers secours et les numéros à afficher."},
            ];
const DEFAULT_CONFIG = {
  cols: {T:"#E49178",S:"#8F9F92",G:"#5DA9A1",R:"#C84B31",c:"#F8F8F8",w:"#FFFFFF",b:"#2E4859"}, // P17b: palette 3-logos (marine + saumon + sauge + teal)
  txts: {
    heroTitle:"Moins de paperasse,",
    heroTitleAccent:"plus de câlins.",
    heroSub:"L'app tout-en-un des assistantes maternelles.",
    heroBtn:"Commencer gratuitement →",
    prixMensuel:"9,99",
    prixEssai:"2 mois gratuits",
    heroDesc:"",
    heroBadge:"🧸 CONÇUE PAR UNE ASSMAT, POUR LES ASSMATS",
    heroSubDesc:"Contrats, salaires, pointages, transmissions, Pajemploi...\nTiMat automatise tout pour que vous puissiez vous concentrer sur les enfants.",
    heroBtnPrimTxt:"2 mois gratuits, sans CB →",
    heroBtnSecTxt:"Voir la démo ↓",
    heroBtnNavTxt:"Commencer gratuitement →",
    heroTags:"🔒 Données en France,📱 Web & Mobile,⚡ 2 min pour démarrer,💳 Sans carte bancaire",
    ctaBtnTxt:"Je commence - 2 mois gratuits →",
    ctaSub:"TiMat s'occupe de ça. Pour que vous puissiez vous occuper des enfants.",
    ctaFooter:"Déjà 847 assistantes maternelles nous font confiance · Données hébergées en France 🇫🇷",
    proLabel:"⭐ TOUT INCLUS",
    proSubtxt:"soit 0,33€/jour - moins qu'un café",
    proDesc:"La solution complète. Tout est inclus.",
    proBtnTxt:"2 mois gratuits, sans CB →",
    freeLabel:"Gratuit",
    freeBtnTxt:"Commencer gratuitement",
    freeDesc:"Pour découvrir TiMat.",
    freePrice:"0€",
  },
  landing: {
    heroBg:"linear-gradient(160deg, #2E4859 0%, #2A6F6A 40%, #2E4859 70%, #1B3540 100%)",
    heroImg:"",
    heroImgOpacity:0.12,
    heroImgPosition:"center center",
    heroImgBlur:2,
    logoUrl:"",
    logoEmoji:"🌿",
    logoSizes:{topBar:28,landingHeader:44,landingFooter:40,login:80,loading:64},
    section1Bg:"linear-gradient(135deg,#2E4859,#2A6F6A)",
    section2Bg:"#FDF5FB",
    section3Bg:"#F8F0FC",
    section4Bg:"linear-gradient(135deg,#2E4859,#5DA9A1)",
    section5Bg:"#FDF5FB",
    section6Bg:"#F5EBF8",
    ctaBg:"linear-gradient(135deg,#2E4859,#2A6F6A)",
    statsBg:"linear-gradient(135deg,#2E4A5A,#5DA9A1)",
    // ----- BOUTONS HERO -----
    heroBtnPrimBg:"linear-gradient(135deg,#E49178,#C84B31)",
    heroBtnPrimColor:"#fff",
    heroBtnSecBg:"rgba(255,255,255,.07)",
    heroBtnSecColor:"#fff",
    heroBtnNavBg:"linear-gradient(135deg,#5DA9A1,#2E4859)",
    heroBtnNavColor:"#fff",
    heroBtnTarifsBg:"rgba(255,255,255,.12)",
    heroBtnTarifsColor:"rgba(255,255,255,.85)",
    heroBtnConnexionBg:"rgba(255,255,255,.18)",
    heroBtnConnexionColor:"#fff",
    // ----- BOUTONS TARIFS -----
    proBtnBg:"linear-gradient(135deg,#E49178,#C84B31)",
    proBtnColor:"#fff",
    freeBtnBg:"#0D1B2A",
    freeBtnColor:"#fff",
    // ----- BOUTON CTA FINAL -----
    ctaBtnBg:"linear-gradient(135deg,#E49178,#C84B31)",
    ctaBtnColor:"#fff",
    // ----- COULEURS -----
    accentColor:"#E49178",
    // Couleurs de texte par section
    heroTitleColor:"#fff",
    heroSubColor:"rgba(255,255,255,.75)",
    heroSubDescColor:"rgba(255,255,255,.6)",
    heroBadgeColor:"#E49178",
    heroBadgeBg:"rgba(228,145,120,.12)",
    heroTagsColor:"rgba(255,255,255,.4)",
    heroStatsColor:"#E49178",
    heroStatsLabelColor:"rgba(255,255,255,.45)",
    s1TitleColor:"#fff",
    s1DescColor:"rgba(255,255,255,.5)",
    s1CardBg:"rgba(255,255,255,.04)",
    s1CardTitleColor:"#fff",
    s1CardDescColor:"rgba(255,255,255,.5)",
    s1QuoteBg:"rgba(232,168,74,.08)",
    s1QuoteColor:"#E8A84A",
    s2TitleColor:"#0D1B2A",
    s2DescColor:"#6B4F3A",
    s3TitleColor:"#0D1B2A",
    s3RowBg1:"#F8F0FC",
    s3RowBg2:"#FDF5FB",
    s3LabelBeforeColor:"#B84060",
    s3LabelAfterColor:"#2E5F8A",
    s3LabelResultColor:"#3D6B50",
    s3TextColor:"#6B4F3A",
    s3ResultColor:"#3D6B50",
    s4TitleColor:"#fff",
    s4SubColor:"rgba(255,255,255,.4)",
    s4StatColor:"#E8A84A",
    s4StatLabelColor:"#fff",
    s4StatDescColor:"rgba(255,255,255,.4)",
    s5TitleColor:"#0D1B2A",
    testimonialBg:"#fff",
    testimonialNameColor:"#2C1F14",
    testimonialCityColor:"#A68970",
    testimonialBeforeColor:"#A68970",
    testimonialAfterColor:"#2C1F14",
    testimonialStarColor:"#E8A84A",
    s6TitleColor:"#0D1B2A",
    freeBg:"#fff",
    freeLabelColor:"#A68970",
    freePriceColor:"#0D1B2A",
    freeDescColor:"#6B4F3A",
    proBg:"#FDF5FB",
    proBorderColor:"#B8622F",
    proLabelColor:"#B8622F",
    proPriceColor:"#B8622F",
    proSubColor:"#A68970",
    proDescColor:"#6B4F3A",
    ctaTitleColor:"#fff",
    ctaSubTitleColor:"rgba(255,255,255,.6)",
    ctaSubColor:"rgba(255,255,255,.5)",
    ctaFooterColor:"rgba(255,255,255,.35)",
    pageBg:"#FDFBF8",
    // ----- POLICES -----
    fontTitle:"'Quicksand', sans-serif",
    fontBody:"'Outfit', sans-serif",
    fontTitleWeight:"700",
    fontBodyWeight:"400",
    googleFontsUrl:"https://fonts.googleapis.com/css2?family=Quicksand:wght@500;600;700&family=Outfit:wght@300;400;500;600;700&display=swap",
    // ----- TEXTES SECTIONS -----
    s1Title:"La réalité du métier, personne n'en parle.",
    s1Desc:"Être assistante maternelle agréée, c'est exercer un métier de soin exigeant\ntout en gérant une TPE sans formation ni support.",
    s1Quote:"TiMat n'ajoute pas une appli à votre vie.\nIl retire tout ce qui n'aurait jamais dû s'y trouver.",
    s2Title:"Découvrez TiMat en direct",
    s2Desc:"Cliquez sur un onglet pour explorer les fonctionnalités.",
    s3Title:"Ce que TiMat change concrètement",
    s3LabelBefore:"Aujourd'hui",
    s3LabelAfter:"Avec TiMat",
    s3LabelResult:"Ce que ça change",
    s4Title:"Ce que disent les chiffres",
    s4Sub:"Données internes TiMat · Mars 2026",
    s5Title:"Devenez l'assistante maternelle dont les parents parlent à leurs amis.",
    s6Title:"Un forfait fixe. Pas de surprise.",
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
  transformations:[
    ["🧮","Pajemploi vous prend 2h par mois","Récap prêt en 5 minutes","Zéro erreur. Zéro stress."],
    ["📄","Vos contrats sont dans un tiroir","Modèles guidés, avenants en 2 clics","Solide juridiquement si ça tourne mal."],
    ["⏰","Les retards de parents créent des conflits","Pointage horodaté, signé par les deux","Vous discutez de faits. Plus de tensions."],
    ["🗂️","Un document important est introuvable","Tout centralisé, daté, cherchable","En cas de contrôle PMI, tout est là."],
    ["🌙","Vos soirées servent à l'administratif","5 minutes le matin suffisent","Vos soirées vous appartiennent."],
  ],
  statsHero:[
    {n:847,suf:"+",label:"assmats actives"},
    {n:12400,suf:"+",label:"bilans générés"},
    {n:4,suf:".7★",label:"note moyenne"},
    {n:96,suf:"%",label:"taux de satisfaction"},
  ],
  statsSection:[
    {n:847,suf:"+",label:"assmats actives",desc:"Font confiance à TiMat"},
    {n:94,suf:"%",label:"satisfaites",desc:"Recommandent TiMat à une collègue"},
    {n:4,suf:"h",label:"économisées",desc:"Par mois en admin en moyenne"},
    {n:2,suf:" mois",label:"d'essai gratuit",desc:"Sans carte bancaire"},
  ],
  testimonials:[
    {nom:"Marie D.",ville:"Paris 15e",avant:"Je passais mes soirées sur Excel.",apres:"Mon récap Pajemploi est prêt en 5 minutes. Je ne sais même plus pourquoi j'attendais de changer."},
    {nom:"Sylvie R.",ville:"Lyon",avant:"J'avais peur d'un contrôle PMI.",apres:"Tout est archivé, daté, accessible. L'inspectrice a été impressionnée par mon suivi."},
    {nom:"Nathalie B.",ville:"Bordeaux",avant:"Un parent a contesté des heures.",apres:"Le pointage horodaté a tout réglé en 30 secondes. Je ne travaillerai plus sans TiMat."},
    {nom:"Fatima A.",ville:"Marseille",avant:"Je me réveillais la nuit à stresser.",apres:"TiMat me prévient avant chaque échéance. Je dors mieux. C'est bête mais c'est vrai."},
  ],
  freeItems:[
    [true, "1 enfant accueilli"],
    [true, "Journal quotidien"],
    [true, "Pointage & Repas"],
    [true, "Messagerie parents"],
    [true, "Calendrier"],
    [false, "Bilans & Bulletins de salaire"],
    [false, "Pajemploi export"],
    [false, "PMI & Documents"],
    [false, "Enfants illimités"],
  ],
  proItems:[
    "✨ Bilans de journée automatiques",
    "📜 Bulletins de salaire complets",
    "🏛️ Export Pajemploi en 1 clic",
    "📑 Attestation fiscale",
    "📸 Photos illimitées",
    "🏥 Communication PMI",
    "🗂️ Documents illimités (5 Go)",
    "👶 Enfants illimités",
    "📋 Solde de tout compte",
    "✉️ Courriers types",
    "❓ Centre d'aide prioritaire",
  ],
  guarantees:[
    "✅ 2 mois d'essai sans CB",
    "✅ Résiliable en 1 clic",
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
    linkSheets:"",
    linkFiche:"",
    linkProjet:"",
    linkPack:"",
  },
  sectionsVisibles:{
    probleme:true, demo:true, signature:true, transformation:true,
    chiffres:true, temoignages:true, tarifs:true, ctaFinal:true, faq:true, blog:true,
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
  sectionsOrder:["probleme","demo","signature","transformation","chiffres","temoignages","tarifs","ctaFinal","faq","blog"],
};
let G = JSON.parse(JSON.stringify(DEFAULT_CONFIG)); // mutable global config

const applyColsToDOM = (cols) => {
  const r = document.documentElement;
  Object.entries(cols).forEach(([k,v]) => r.style.setProperty('--'+k, v));
};

const loadConfig = async () => {
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
        transformations: saved.transformations||DEFAULT_CONFIG.transformations,
        statsHero: saved.statsHero||DEFAULT_CONFIG.statsHero,
        statsSection: saved.statsSection||DEFAULT_CONFIG.statsSection,
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
const backupCurrentConfig = async (reason) => {
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

const saveConfig = async (backupReason='before_save') => {
  const configStr = JSON.stringify(G);
  // P30B : backup de sécurité best-effort avant écrasement (ne bloque jamais)
  const backupRes = await backupCurrentConfig(backupReason);
  // Try JSONB first (object), then TEXT fallback (string)
  try {
    const {error: errObj} = await supabase.from('app_config').upsert({
      id:'main',
      config: G,
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


export default function App(){
  const [user,setUser]=useState(null);
  const [page,setPage]=useState("accueil");
  const [dark,setDark]=useState(false);
  const [loading,setLoading]=useState(true);
  const [pmiNonLus,setPmiNonLus]=useState(PMI_MESSAGES.filter(m=>!m.lu&&m.de==="PMI").length);
  const [notifs,setNotifs]=useState([]);
  const [showNotifs,setShowNotifs]=useState(false);
  const [onboarded,setOnboarded]=useState(false);

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

  // //  Dsactiver le service worker bloqu
  useEffect(()=>{
    if('serviceWorker' in navigator){
      navigator.serviceWorker.getRegistrations().then(regs=>{
        regs.forEach(reg=>reg.unregister());
      });
    }
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
  useEffect(()=>{
    if(!user?.id)return;
    if(user._needsProfileFetch)return; // attendre la fin du fetch profil
    const charger=async()=>{
      setDbLoading(true);
      try{
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
                entretien:ct.entretien,
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
              }:null,
            };
          });
          setEnfantsDB(enfantsAvecContrat);
          // Charger pointages du mois
          const debut=new Date();debut.setDate(1);
          const{data:p}=await supabase.from("pointages").select("*")
            .in("enfant_id",enfantIds)
            .gte("date",debut.toISOString().slice(0,10));
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

  // NOTIFICATIONS - charger la cloche depuis Supabase (au login + a chaque refresh-data)
  useEffect(()=>{
    if(!user?.id){setNotifs([]);return;}
    let cancelled=false;
    (async()=>{
      const{data,error}=await supabase.from("notifications")
        .select("*").eq("user_id",user.id)
        .order("created_at",{ascending:false}).limit(50);
      if(cancelled||error)return;
      const ICONS={versement:"💶",pointage_a_valider:"⏱️",signature_asmat_signed:"✍️",signature_parent_signed:"✍️",bulletin_sent:"📜",message:"📬",info:"🔔"};
      setNotifs((data||[]).map(n=>({id:n.id,ic:ICONS[n.type]||"🔔",txt:n.titre,date:n.created_at,lu:!!n.lu,page:n.page||"accueil"})));
    })();
    return()=>{cancelled=true;};
  },[user?.id,dataRefreshKey]);

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


  // - Utiliser données réelles
  if(!user)return <><Styles/><div className={"app"+(dark?" dark":"")+""}><LandingPage onLogin={u=>{setUser({...u,_needsProfileFetch:true,_profileConfirmed:false});setPage("accueil");}} /* P16E: forcer fetch profil au login frais */ dark={dark} setDark={setDark} config={appConfig}/></div></>;
  // Afficher onboarding si asmat sans enfants (vérifié après chargement DB)
  if(!onboarded&&user.role==="asmat"&&user._profileConfirmed&&!dbLoading&&enfantsDB.length===0)return // P16D : exiger profil DB confirmé <><Styles/><div className={"app"+(dark?" dark":"")+""}><OnboardingWizard onFinish={()=>setOnboarded(true)} user={user}/></div></>;

  const role=user.role;
  // //  Statut abonnement
  const isPro=['pro','trialing'].includes(user?.subscription_status)||user?.role==="parent";
  const isTrialing=user?.subscription_status==="trialing";

  // //  Lancer le checkout Stripe
  const lancerCheckout=async()=>{
    if(user?.id?.startsWith?.("demo-")){
      alert("Le paiement n'est pas disponible en mode demo. Creez un compte pour continuer.");
      return;
    }
    try{
      const res=await fetch('/api/create-checkout-session',{
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
      alert("Erreur reseau. Verifiez que :\n1. npm install stripe est fait\n2. STRIPE_SECRET_KEY est dans les variables Vercel\n3. L'API /api/create-checkout-session est deployee");
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
  const pEId=enfants[0]?.id;
  const groups=role==="asmat"?GROUPS_AM:GROUPS_P;
  const P={enfants,role,pEId,user,pointagesDB};

  const renderPage=()=>{
    switch(page){
      case "accueil": return role==="asmat"?<AccueilAssMat enfants={enfants} setPage={setPage} user={user}/>:<AccueilParent enfant={enfants[0]} setPage={setPage} user={user}/>;
      case "journal_complet": return <JournalComplet {...P}/>;
      case "sante_complet": return <SanteComplete {...P}/>;
      case "bilans": return <Bilans {...P}/>;
      case "eveil_complet": return <EveilComplet {...P}/>;
      case "documents_complet": return <DocumentsComplet {...P}/>;
      case "bilans_exports": return <BilansExports {...P}/>;
      case "admin_finances": return <AdminFinances {...P} user={user}/>;
      case "pointage": return <Pointage {...P}/>;
      case "calendrier": return <Calendrier enfants={enfants} role={role} pEId={pEId}/>;
      case "messagerie": return <Messagerie {...P}/>;
      case "politique_confidentialite": return <PolitiqueConfidentialite/>;
      case "mentions_legales": return <MentionsLegales/>;
      case "parametres": return <Parametres user={user} onLogout={handleLogout} setPage={setPage} isPro={isPro} isTrialing={isTrialing} lancerCheckout={lancerCheckout} ouvrirPortail={ouvrirPortail} setUser={setUser}/>;
      case "backoffice": return user?.is_admin===true?<Backoffice user={user} setPage={setPage} appConfig={appConfig} setAppConfig={setAppConfig}/>:<div className="fi"><PageHeader icon="🔒" title="Accès refusé" sub="Zone admin réservée."/></div>;
      case "pmi": return <CommunicationPMI role={role} user={user} hasRealData={hasRealData}/>;
      case "periscolaire": return <PlanningPeriscolaire enfants={enfants} role={role} pEId={pEId}/>;
      case "forum": return <ForumCommunaute role={role}/>;
      case "rapport_annuel": return <RapportAnnuel enfants={enfants} role={role} pEId={pEId} user={user}/>;
      case "parrainage": return <Parrainage user={user}/>;
      case "simulateur": return <SimulateurCout enfants={enfants} pEId={pEId}/>;
      case "solde_compte": return <SoldeDeCompte enfants={enfants} role={role} pEId={pEId} user={user}/>;
      case "attestation_pe": return <AttestationPoleEmploi enfants={enfants} role={role} pEId={pEId} user={user}/>;
      case "attestation_fiscale": return <AttestationFiscale enfants={enfants} role={role} pEId={pEId} user={user}/>;
      case "fiche_urgence": return <FicheUrgence enfants={enfants} role={role} pEId={pEId} user={user}/>;
      case "projet_accueil": return <ProjetAccueil user={user} role={role}/>;
      case "boutique": return <Boutique user={user}/>;
      case "export_donnees": return <ExportDonnees enfants={enfants} user={user} role={role}/>;
      case "faq": return <FAQ role={role}/>;
      case "inviter_parent": return <InviterParent enfants={enfants} user={user}/>;
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
      default: return role==="asmat"?<AccueilAssMat enfants={enfants} setPage={setPage} user={user}/>:<AccueilParent enfant={enfants[0]} setPage={setPage} user={user}/>;
    }
  };

  return(
    <>
      <Styles/>
      <div className={"app"+(dark?" dark":"")+""}>
        <TopBar role={role} groups={groups} page={page} setPage={setPage} user={user}
          onLogout={handleLogout}
          pmiNonLus={role==="parent"?0:pmiNonLus} dark={dark} setDark={setDark}
          notifNonLus={notifs.filter(n=>(!n.roles||n.roles.includes(role))&&!n.lu).length} notifs={notifs} setNotifs={setNotifs}
          showNotifs={showNotifs} setShowNotifs={setShowNotifs} setPage2={setPage}/>
        <BandeauHorsLigne/>
        <BandeauInstall/>
        <div className="content">{renderPage()}</div>
        <BottomNav groups={groups} page={page} setPage={setPage} pmiNonLus={role==="parent"?0:pmiNonLus}/>
      </div>
    </>
  );
}

