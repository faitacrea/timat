
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
