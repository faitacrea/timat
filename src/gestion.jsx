// ============================================================
// GESTION — paie, contrats, versements : chargés à la demande
// ------------------------------------------------------------
// Le plus gros bloc de l'application : AdminFinances et les
// dix-sept écrans qu'il ouvre — bulletins de salaire, contrats,
// avenants, versements, indemnités kilométriques, solde de tout
// compte, récapitulatif fiscal, courriers types.
//
// 2 900 lignes qu'aucune visiteuse de la landing n'a besoin de
// télécharger avant de lire le hero, et qu'une assistante
// maternelle elle-même ne voit qu'en ouvrant l'onglet.
//
// Quatre d'entre eux sont appelés depuis App.jsx (le routeur, le
// hub Paie & contrats, la démo de la landing) : ceux-là sont
// déclarés en lazy() là-bas. Les quatorze autres ne sont appelés
// que d'ici.
// ============================================================
import { useState, useEffect, useRef, useMemo, Suspense } from "react";
import { supabase } from "../lib/supabase.js";
import {
  ALLOC_FORMATION_H, AjouterEnfantModale, BAREME_KM_2026, BoutonAjouterEnfant, COURRIERS_DATA, CPill, D, EMAIL_TEMPLATES, EmptyState, H, HEURES_TYPES, IconeOuEmoji, MODELES_CONTRATS, MOIS_PAR_AN, PLANCHER_KM_CONV, PageHeader, Pastille, REPAS_CHOIX, RETENUE_TYPES, SEMAINES_MAX_ANNEE_INCOMPLETE, TAUX_COTISATIONS, Toast, VERSEMENT_MODES, VerrouPro, allocationFormation, chargerJsPDF, congesAcquis, decalerMois, estAnneeComplete, estPro, fmt, fmtDatePdf, heuresMensualisees, iccpCalcul, indemniteEntretienMin, indemniteRupture, isoJour, isoMois, minimumHoraireAu, nb2, nb3, nbf, netDepuisBrut, pdfPerime, preavisJours, protegerPdf, retenueAbsence, salaireMensualise, semainesDuContrat, smicHoraireAu, todayStr, G, TODAY_STR
} from "./App.jsx";

export function AlerteTauxMinimum({taux,date,titreAmge}){
  const mini=minimumHoraireAu(date||new Date(),titreAmge);
  const t=Number(taux)||0;
  if(t<=0||t>=mini)return null;
  return <div style={{display:"flex",gap:9,alignItems:"flex-start",background:"var(--Rp)",
    border:"1px solid var(--R)",borderRadius:10,padding:"10px 12px",margin:"10px 0",
    fontSize:12.5,color:"var(--R)",lineHeight:1.55}}>
    <IconeOuEmoji e="⚠️" taille={16}/>
    <span><b>Taux horaire sous le minimum légal.</b> {nbf(t,2)} € par heure et par enfant,
    alors que le minimum est de {nbf(mini,2)} € à cette date{titreAmge?" avec le titre AM-GE (+ 4 %)":""} (convention collective IDCC 3239).
    Un avenant est nécessaire pour régulariser.</span>
  </div>;
}

export function Facturation({enfants,role,pEId,user,pointagesDB}){
  const [selId,setSelId]=useState(enfants[0]?.id);
  const [abs,setAbs]=useState(enfants.every(e=>["e1","e2","e3"].includes(e.id))?D.absences:[]);
  const [toast,setToast]=useState("");
  const liste=role==="parent"?enfants.filter(e=>e.id===pEId):enfants;
  const enfant=liste.find(e=>e.id===selId)||liste[0];
  const contrat=enfant?.contrat;
  const isDemoFact=enfants.every(e=>["e1","e2","e3"].includes(e.id));
  // Calculate hours from real pointages or fallback to demo
  const calcHeures=()=>{
    if(isDemoFact)return D.heures[enfant?.id]||{real:0,prev:heuresMensualisees(contrat)};
    if(!pointagesDB||!enfant?.id)return{real:0,prev:heuresMensualisees(contrat)};
    const moisPointages=pointagesDB.filter(p=>p.enfant_id===enfant.id);
    const totalMin=moisPointages.reduce((s,p)=>s+(p.total_minutes||0),0);
    return{real:Math.round(totalMin/60),prev:heuresMensualisees(contrat)};
  };
  const h=calcHeures();
  // L'indemnite d'entretien n'est PAS du salaire : elle ne se cotise pas, ne
  // s'impose pas, et se declare sur une ligne distincte. Elle etait pourtant
  // additionnee au brut, puis le tout etait multiplie par 0,78 comme s'il
  // s'agissait de salaire — l'indemnite ressortait donc amputee de 22 % sur le
  // recapitulatif Pajemploi.
  // Le nombre de jours d'accueil se comptait aussi de DEUX facons sur le meme
  // document : heures/5 pour l'entretien, heures/(hebdo/5) pour les « jours
  // d'activite ». Un seul compte desormais.
  const joursAccueil=contrat?Math.max(0,Math.round(h.real/(((contrat.heuresHebdo||40)/((contrat.jours?.length)||5))||8))):0;
  const salBrut=contrat?h.real*contrat.tauxHoraire:0;
  const entretienMois=contrat?Math.round((contrat.entretien||0)*joursAccueil*100)/100:0;
  const repasMoisPaj=contrat&&contrat.repasFourniPar!=="employeur"?Math.round((Number(contrat.repas)||0)*joursAccueil*100)/100:0;
  const absMois=abs.filter(a=>a.eId===enfant?.id);
  const indemAbs=absMois.filter(a=>a.indemnise).reduce((s,a)=>s+a.heures*((contrat?.tauxHoraire||minimumHoraireAu(new Date()))*(contrat?.indemniteAbsence||0.5)),0);
  const totalBrut=salBrut+indemAbs;
  const moisCourant=new Date().toLocaleDateString('fr-FR',{month:'long',year:'numeric'}).replace(/^./,c=>c.toUpperCase());
  const netEstime=netDepuisBrut(totalBrut);
  const histFactDemo=(()=>{const noms=["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];const now=new Date();const vals=["672.40€","698.10€","654.80€"];const stat=["Émise","Payée","Payée"];return [1,2,3].map(k=>{const d=new Date(now.getFullYear(),now.getMonth()-k,1);return [noms[d.getMonth()]+" "+d.getFullYear(),stat[k-1],vals[k-1]];});})();

  const exportPajemploi=()=>{
    const w=window.open('','_blank');
    if(!w){setToast('Autorisez les popups');return;}
    const mois=new Date().toLocaleDateString('fr-FR',{month:'long',year:'numeric'});
    const hMens=heuresMensualisees(contrat);
    const netMois=netDepuisBrut(totalBrut);
    const salNet=nbf(netMois,2);
    const totalVerse=Math.round((netMois+entretienMois+repasMoisPaj)*100)/100;
    const nomAsmat=((user?.prenom||"")+" "+(user?.nom||"")).trim();
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
      '.note{background:#F4F7FA;border-radius:8px;padding:12px;margin-top:16px;font-size:11px;color:#666;line-height:1.6}',
      '.steps{margin-top:20px;padding:16px;border:1px dashed #5DA9A1;border-radius:8px}',
      '.steps h3{font-size:12px;color:#5DA9A1;margin-bottom:10px}',
      '.steps ol{padding-left:20px;font-size:11px;line-height:2}',
      '@media print{.noprint{display:none}}</style></head><body>',
      '<h1>🏛️ Récapitulatif Pajemploi</h1>',
      '<div class="sub">'+mois+' — À reporter sur pajemploi.urssaf.fr</div>',
      '<div class="box"><h2>👩👧 Assistante maternelle</h2>',
      // Le nom se lisait sur des champs qui n'existent pas (enfant.prenomAsmat),
      // et la parenthese manquante faisait gagner le « || » sur le « + » : la
      // balise </td></tr> disparaissait avec le nom.
      '<table><tr><td>Nom</td><td>'+H(nomAsmat||'[Votre nom]')+'</td></tr>',
      '<tr><td>Enfant gardé</td><td>'+(enfant?.prenom||'-')+' '+(enfant?.emoji||'')+'</td></tr>',
      '<tr><td>Période</td><td>'+mois+'</td></tr></table></div>',
      '<div class="box"><h2>⏰ Heures à déclarer</h2>',
      '<table><tr><td>Heures mensualisées (contrat)</td><td>'+hMens+' h</td></tr>',
      '<tr><td>Heures réellement effectuées</td><td>'+h.real+' h</td></tr>',
      '<tr><td>Heures complémentaires / supplémentaires</td><td>'+Math.max(0,h.real-hMens)+' h</td></tr>',
      '<tr><td>Jours d\'activité</td><td>'+joursAccueil+' jours</td></tr>',
      '<tr><td>Jours de congés payés pris</td><td>0 jours</td></tr></table>',
      // Le recapitulatif calcule sur les heures POINTEES. Un contrat mensualise
      // se declare sur les heures mensualisees, meme si le pointage est
      // incomplet. Quand les deux divergent, le document le dit au lieu de
      // laisser croire que le chiffre est celui a declarer.
      (h.real!==hMens
        ? '<p style="font-size:10.5px;color:#B8452F;margin-top:8px;line-height:1.5">Attention : ce calcul part des heures <strong>pointées</strong> ('+h.real+' h), qui diffèrent des heures <strong>mensualisées</strong> du contrat ('+hMens+' h). Un contrat mensualisé se déclare normalement sur les heures mensualisées, quel que soit le pointage. Vérifiez laquelle des deux correspond à ce mois avant de déclarer.</p>'
        : ''),
      '</div>',
      '<div class="box"><h2>💰 Salaire à déclarer</h2>',
      '<table><tr><td>Taux horaire brut (contrat)</td><td>'+nbf((contrat?.tauxHoraire||0),2)+' €/h</td></tr>',
      '<tr><td>Salaire brut du mois</td><td>'+nbf(totalBrut,2)+' €</td></tr>',
      '<tr class="hl"><td>Salaire NET à déclarer</td><td>'+salNet+' €</td></tr>',
      '<tr><td>Indemnité d\'entretien (ligne distincte)</td><td>'+nbf(entretienMois,2)+' €</td></tr>',
      '<tr><td>Indemnité de repas (ligne distincte)</td><td>'+nbf(repasMoisPaj,2)+' €</td></tr>',
      '<tr class="hl"><td>💶 TOTAL VERSÉ À L\'ASSISTANTE MATERNELLE</td><td>'+nbf(totalVerse,2)+' €</td></tr></table>',
      '<p style="font-size:10.5px;color:#777;margin-top:8px;line-height:1.5">Les indemnités d\'entretien et de repas ne sont pas du salaire : elles ne supportent pas de cotisations et se saisissent sur leur propre ligne dans Pajemploi, jamais dans le salaire.</p></div>',
      '<div class="steps"><h3>📝 Comment déclarer sur Pajemploi :</h3>',
      '<ol><li>Connectez-vous sur <strong>pajemploi.urssaf.fr</strong></li>',
      '<li>Cliquez sur <strong>"Déclarer"</strong> > sélectionnez votre assistante maternelle</li>',
      '<li>Entrez le nombre d\'heures : <strong>'+h.real+'h</strong></li>',
      '<li>Entrez le nombre de jours d\'activité : <strong>'+joursAccueil+'</strong></li>',
      '<li>Entrez le salaire net : <strong>'+salNet+' €</strong> (sans les indemnités)</li>',
      '<li>Entrez l\'indemnité d\'entretien : <strong>'+nbf(entretienMois,2)+' €</strong></li>',
      (repasMoisPaj>0?'<li>Entrez l\'indemnité de repas : <strong>'+nbf(repasMoisPaj,2)+' €</strong></li>':''),
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

    {/* Coup d'oeil — total du mois en un regard (repere Pandi-Panda) */}
    {contrat&&<div className="card"style={{padding:0,marginBottom:14,overflow:"hidden"}}>
      <div style={{background:"linear-gradient(135deg,var(--Tp),var(--Sp))",padding:"16px 18px"}}>
        <div style={{fontSize:11,fontWeight:700,color:"var(--T)",textTransform:"uppercase",letterSpacing:".5px",marginBottom:3}}>Total brut · {moisCourant}</div>
        <div className="pf"style={{fontSize:30,fontWeight:800,color:"var(--b)",lineHeight:1.1}}>{nbf(totalBrut,2)} €</div>
        <div style={{fontSize:11,color:"var(--m)",marginTop:3}}>{h.real} h{enfant?.prenom?(" · "+enfant.prenom):""} · net estimé ≈ {nbf(netEstime,2)} €</div>
        {indemAbs>0&&<div style={{fontSize:11,color:"var(--m)",marginTop:2}}>dont absences indemnisées : +{nbf(indemAbs,2)} € ({absMois.filter(a=>a.indemnise).length} j)</div>}
      </div>
      <div className="g3"style={{padding:14,gap:10}}>
        {[["Heures × taux",nbf((h.real*contrat.tauxHoraire),2)+" €","var(--B)","var(--Bp)"],
          ["Entretien",nbf(entretienMois,2)+" €","var(--S)","var(--Sp)"],
          ["Net estimé",nbf(netEstime,2)+" €","var(--T)","var(--Tp)"],
        ].map(([l,v,c,bg])=><div key={l}style={{background:bg,borderRadius:12,padding:"11px 10px",textAlign:"center",minWidth:0}}>
          <div className="pf"style={{fontSize:15,fontWeight:800,color:c,lineHeight:1.15,overflow:"hidden",textOverflow:"ellipsis"}}>{v}</div>
          <div style={{fontSize:11,color:"var(--m)",marginTop:3,fontWeight:600}}>{l}</div>
        </div>)}
      </div>
    </div>}

    {contrat&&<div className="g2">
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {/* Pajemploi */}
        <div className="card"style={{background:"#EBF4FF",border:"1.5px solid var(--B)"}}>
          <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:12}}>
            <div style={{width:36,height:36,borderRadius:9,background:"var(--B)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🏛️</div>
            <div><div style={{fontWeight:700,fontSize:14,color:"var(--B)"}}>Lien Pajemploi</div>
              <div style={{fontSize:11,color:"var(--l)"}}>Export direct vers l'URSSAF</div></div>
          </div>
          <div style={{fontSize:13,color:"var(--b)",marginBottom:12,lineHeight:1.6}}>
            Heures : <strong>{h.real}h</strong> · Salaire net : <strong>{nbf(netEstime,2)}€</strong> · Mois : <strong>{moisCourant}</strong>
          </div>
          <button className="btn bT"style={{width:"100%",justifyContent:"center"}}onClick={exportPajemploi}>
            <IconeOuEmoji e="🏛️"/> Exporter vers Pajemploi
          </button>
        </div>
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div className="card">
          <div style={{fontWeight:700,fontSize:14,marginBottom:12,color:"var(--b)"}}><IconeOuEmoji e="📋"/> Absences & Indemnités</div>
          {absMois.map(a=><div key={a.id}style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid var(--br)"}}>
            <div>
              <div style={{fontSize:13,fontWeight:600,color:"var(--b)"}}>{fmt(a.date)} - {a.motif}</div>
              <div style={{fontSize:11,color:"var(--l)"}}>{a.heures}h · {a.indemnise?"Indemnisée":"Non indemnisée"}</div>
            </div>
            <span className="badge"style={{background:a.indemnise?"var(--Gp)":"var(--Rp)",color:a.indemnise?"var(--G)":"var(--R)"}}>
              {a.indemnise?"+"+(nbf((a.heures*(contrat.tauxHoraire*contrat.indemniteAbsence)),2))+"€":"0€"}</span>
          </div>)}
          {role==="asmat"&&<button className="btn bG"style={{width:"100%",marginTop:12}}>+ Déclarer une absence</button>}
        </div>
        <div className="card">
          <div style={{fontWeight:700,fontSize:13,marginBottom:10,color:"var(--b)"}}><IconeOuEmoji e="🧾"/> Historique factures</div>
          {isDemoFact?histFactDemo.map(([m,s,v])=>
            <div key={m}style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:"1px solid var(--br)"}}>
              <span style={{fontSize:13,color:"var(--b)",fontWeight:600}}>{m}</span>
              <span className="badge"style={{background:s==="Payée"?"var(--Gp)":"var(--c)",color:s==="Payée"?"var(--G)":"var(--m)"}}>{s}</span>
              <span style={{fontWeight:700,color:"var(--b)"}}>{v}</span>
            </div>)
          :<div style={{fontSize:12,color:"var(--l)",textAlign:"center",padding:"16px 0"}}>L'historique apparaîtra ici au fil des mois.</div>}
        </div>
      </div>
    </div>}
  </div>;
}

//

export function Contrats({enfants,role,pEId,user}){
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
  // PARTAGE CONTRAT - suivi du partage et du panneau deroulant, par enfant
  const [partages,setPartages]=useState({});
  const [partageOuvert,setPartageOuvert]=useState({});
  const [majPdf,setMajPdf]=useState("");
  // SIGNATURE STANDARD ASMAT P10 - signature de reference du profil (chargee depuis profiles.signature_base64)
  const [sigStandard,setSigStandard]=useState(user?.signature_base64||null);
  const canvasRef=useRef(null);
  const liste=role==="parent"?enfants.filter(e=>e.id===pEId):enfants;
  const enfant=liste.find(e=>e.id===selId)||liste[0];
  const contrat=enfant?.contrat;
  // Le PDF est en retard des que le contrat a change depuis son ecriture.
  const contratPerime=pdfPerime(contrat?.pdf_generated_at,contrat?.updated_at);

  // FIX: Synchroniser signes/datesSignature avec les données réelles à chaque changement de la liste enfants
  useEffect(()=>{
    const sigMap={};
    const dateMap={};
    const partMap={};
    enfants.forEach(e=>{
      if(e.contrat?.signe_asmat){
        sigMap[e.id]=true;
        dateMap[e.id]=e.contrat.date_signature_asmat;
      }
      if(e.contrat?.partage_parent)partMap[e.id]=true;
    });
    setSignes(sigMap);
    setDatesSignature(dateMap);
    setPartages(partMap);
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
    // IDENTITE FIGEE P15 - un contrat signe ne doit plus suivre les modifications de profil
    const snapSalarie={
      prenom:user?.prenom||null,nom:user?.nom||null,email:user?.email||null,
      telephone:user?.telephone||null,adresse:user?.adresse||null,
      numero_agrement:user?.numero_agrement||null,fige_le:nowIso,
    };
    const{error}=await supabase.from("contrats").update({
      signe_asmat:true,
      date_signature_asmat:nowIso,
      signature_asmat_data:sigData||null,
      salarie_snapshot:snapSalarie,
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
        if(!r.success){console.log("PDF gen warn:",r.error);return;}
        // Le rafraichissement ci-dessous part avant que le PDF soit ecrit :
        // sans ce second appel, le bouton « Ouvrir le contrat signe » n'apparait
        // qu'apres un rechargement de la page.
        window.dispatchEvent(new CustomEvent("timat:refresh-data"));
      });
    }
    // NOTE: la notification "contrat pret a signer" au parent est desormais
    // envoyee au moment du PARTAGE (fonction partagerContrat), pas ici.
    // FIX: Trigger un refresh global pour que enfants[].contrat.signe_asmat soit a jour
    // (sinon un re-render parent + useEffect [enfants] reecraserait signes a partir de la donnee stale)
    window.dispatchEvent(new CustomEvent("timat:refresh-data"));
  };
  // PARTAGE CONTRAT - rendre le contrat visible (ou non) au parent.
  // Au partage : notification + email au parent. Retrait possible tant qu'il n'a pas signe.
  // MISE A JOUR DU PDF - reecrit le fichier a partir des donnees en base et des
  // signatures deja enregistrees. Rien d'autre ne change : ni le contenu du
  // contrat, ni les signatures, ni les dates.
  const majContratPdf=async()=>{
    if(!contrat?.id)return;
    setMajPdf("pending");
    const r=await generateAndStoreContratPDF(contrat.id);
    setMajPdf(r.success?"done":"error");
    setToast(r.success?"Contrat mis à jour ✓":"Erreur : "+(r.error||"mise à jour impossible"));
    if(r.success)window.dispatchEvent(new CustomEvent("timat:refresh-data"));
  };

  const partagerContrat=async(enf,nouvelEtat)=>{
    const ct=enf?.contrat;
    if(!ct?.id){setToast("Aucun contrat a partager");return;}
    if(!ct.signe_asmat){setToast("Signez d'abord le contrat avant de le partager");return;}
    if(!nouvelEtat && ct.signe_parent){setToast("Le parent a déjà signé : le partage ne peut plus être retiré");return;}
    const{error}=await supabase.from("contrats").update({partage_parent:nouvelEtat}).eq("id",ct.id);
    if(error){setToast("Erreur : "+error.message);return;}
    setPartages(p=>({...p,[enf.id]:nouvelEtat}));
    if(nouvelEtat){
      setToast("Contrat partagé avec le parent ✓");
      if(ct.parent_id){
        createNotification({userId:ct.parent_id,type:"signature_asmat_signed",titre:"Votre contrat est prêt à signer"+(enf?.prenom?(" — "+enf.prenom):""),page:"admin_finances"});
        supabase.rpc("get_recipient_email",{p_user_id:ct.parent_id}).then(({data:p})=>{
          if(p?.email){
            sendNotificationEmail({
              type:"signature_asmat_signed",
              to:p.email,
              subject:EMAIL_TEMPLATES.signature_asmat_signed.subject,
              template:"signature_asmat_signed",
              vars:{
                parent_prenom:p.prenom||"",
                asmat_prenom:user?.prenom||"Votre assistante maternelle",
                enfant_prenom:enf.prenom||"",
                url:window.location.origin+"/?goto=signature",
              },
            });
          }
        });
      }
    }else{
      setToast("Partage retiré — le parent ne voit plus le contrat");
    }
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
    {showAjout&&user&&<Suspense fallback={<div style={{padding:24,textAlign:"center",color:"var(--m)",fontSize:13}}>Chargement…</div>}><AjouterEnfantModale user={user} onClose={()=>setShowAjout(false)}/></Suspense>}
    <PageHeader icon="📄" title="Contrats & Signatures" sub="Signature électronique légale"
      action={role==="asmat"&&user?<BoutonAjouterEnfant compact user={user} enfants={enfants} onClick={()=>setShowAjout(true)}/>:null}/>
    {role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
      {liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>setSelId(e.id)}
        badge={signes[e.id]
          ?<span title="Contrat signé" style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:22,height:22,borderRadius:"50%",background:"var(--G)",color:"#fff",fontSize:12,fontWeight:700,boxShadow:"0 2px 6px rgba(0,0,0,.15)"}}>✓</span>
          :<span title="En attente de signature" style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:22,height:22,borderRadius:"50%",background:"var(--T)",color:"#fff",fontSize:11,boxShadow:"0 2px 6px rgba(0,0,0,.15)"}}><IconeOuEmoji e="⏳" taille={13} couleur="#fff"/></span>
        }/>)}</div>}

    {contrat&&<div className="g2">
      <div>
        {/* Coup d'oeil contrat — statut signature + essentiel en un regard (repere Pandi-Panda) */}
        <div className="card"style={{padding:0,marginBottom:12,overflow:"hidden"}}>
          <div style={{background:signes[enfant?.id]?"linear-gradient(135deg,var(--Sp),var(--Gp))":"linear-gradient(135deg,var(--Tp),var(--Sp))",padding:"16px 18px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10,flexWrap:"wrap"}}>
              <div style={{minWidth:0}}>
                <div style={{fontSize:11,fontWeight:700,color:signes[enfant?.id]?"var(--G)":"var(--T)",textTransform:"uppercase",letterSpacing:".5px",marginBottom:3}}>Contrat · {enfant?.prenom}</div>
                <div className="pf"style={{fontSize:21,fontWeight:800,color:"var(--b)",lineHeight:1.15}}>{signes[enfant?.id]?<><IconeOuEmoji e="✅"/> Signé</>:<><IconeOuEmoji e="⏳"/> En attente de signature</>}</div>
                <div style={{fontSize:11,color:"var(--m)",marginTop:3}}>{fmt(contrat.debut)} → {fmt(contrat.fin)} · {contrat.heuresHebdo}h/sem</div>
                {/* Le statut, la date de signature et le contrat lui-meme etaient
                    annonces deux fois sur le meme ecran : ici, et dans un encart
                    vert plus bas. Tout est reuni dans ce seul bandeau. */}
                {signes[enfant?.id]&&<>
                  <div style={{fontSize:11,color:"var(--m)",marginTop:3}}>
                    Signé le {datesSignature[enfant?.id]?fmt(datesSignature[enfant?.id].slice(0,10)):"—"} · <IconeOuEmoji e="🔒" taille={12}/> conforme eIDAS
                  </div>
                  {/* Le bouton de mise a jour reste toujours accessible : le PDF
                      doit pouvoir etre refait apres chaque modification du
                      contrat, pas une seule fois. L'avertissement rouge, lui,
                      ne sort que lorsque le fichier est reellement en retard. */}
                  <div style={{marginTop:10,display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                    {contrat?.pdf_storage_path
                      ?<><BoutonContratPdf contrat={contrat} onErr={(m)=>setToast(m)} compact label="Ouvrir le contrat signé (PDF)"/>
                        {/* Le fichier vit dans l'espace de l'assistante maternelle :
                            elle seule peut le reecrire. Proposer le bouton au parent
                            revenait a lui offrir une action qui echouait a coup sur. */}
                        {role!=="parent"&&
                          <button className={"btn s "+(contratPerime?"bS":"")} disabled={majPdf==="pending"} onClick={majContratPdf}>
                            {majPdf==="pending"?"Mise à jour…":"↻ Mettre à jour le PDF"}
                          </button>}</>
                      :<span style={{fontSize:11.5,color:"var(--m)"}}>Le PDF est en cours de préparation — il apparaîtra ici et dans Documents.</span>}
                  </div>
                  {contrat?.pdf_storage_path&&contratPerime&&
                    <div style={{marginTop:8,fontSize:11.5,color:"var(--R)",lineHeight:1.5,maxWidth:420}}>
                      <IconeOuEmoji e="⚠️" taille={13}/> Le contrat a été modifié depuis que ce PDF a été
                      produit : le fichier ne reflète plus les valeurs actuelles.{role==="parent"
                        ?" Demandez à votre assistante maternelle de le mettre à jour — le document est produit depuis son espace."
                        :" Le mettre à jour le réécrit avec les mêmes signatures."}
                    </div>}
                </>}
              </div>
              <div style={{textAlign:"right",flexShrink:0}}>
                <div className="pf"style={{fontSize:20,fontWeight:800,color:"var(--b)",lineHeight:1.1}}>≈ {nbf(salaireMensualise(contrat),0)} €</div>
                <div style={{fontSize:11,color:"var(--m)",fontWeight:600,marginTop:2}}>brut / mois</div>
              </div>
            </div>
          </div>
        </div>

        <div className="card"style={{marginBottom:12}}>
          <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:14}}><IconeOuEmoji e="📋"/> Détail du contrat</div>
          <AlerteTauxMinimum taux={contrat.tauxHoraire} date={contrat.debut} titreAmge={user?.titre_amge}/>
          {[["Période",fmt(contrat.debut)+" → "+fmt(contrat.fin)],
            ["Jours",(contrat.jours||[]).join(", ")],["Horaires",contrat.horaires],
            ["Heures / semaine",contrat.heuresHebdo+"h"],
            ["Rythme d'accueil",estAnneeComplete(contrat)?"Année complète (52 semaines)":"Année incomplète ("+semainesDuContrat(contrat)+" semaines)"],
            ["Taux horaire",nbf(contrat.tauxHoraire,2)+" €/h"],
            ["Indemnité entretien",nbf(contrat.entretien,2)+" €/jour"],
            ["Salaire mensuel brut","≈ "+nbf(salaireMensualise(contrat),0)+" €"],
          ].map(([l,v])=><div key={l}style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid var(--br)"}}>
            <span style={{fontSize:12,color:"var(--l)",fontWeight:700}}>{l}</span>
            <span style={{fontSize:13,fontWeight:600,color:"var(--b)",textAlign:"right",maxWidth:"60%"}}>{v}</span>
          </div>)}
        </div>

        <RythmeAccueil contrat={contrat} role={role}
          onSaved={()=>{setToast("Rythme d'accueil enregistré ✓");window.dispatchEvent(new CustomEvent("timat:refresh-data"));}}
          onErr={(m)=>setToast(m)}/>

        <IndemnitesJournalieres contrat={contrat} role={role}
          onSaved={()=>{setToast("Indemnités enregistrées ✓");window.dispatchEvent(new CustomEvent("timat:refresh-data"));}}
          onErr={(m)=>setToast(m)}/>

        {/* Signature électronique */}
        {!signes[enfant?.id]&&<div className="card"style={{border:"1.5px solid var(--P)"}}>
          <div style={{fontWeight:700,fontSize:14,color:"var(--P)",marginBottom:4}}><IconeOuEmoji e="✍️"/> Signature électronique</div>
          <div style={{fontSize:12,color:"var(--m)",marginBottom:12}}>Signez dans la zone ci-dessous pour valider le contrat</div>
          <canvas ref={canvasRef}className="sig-c"width={340}height={100}
            style={{width:"100%",maxWidth:340,touchAction:"none"}}
            onMouseDown={startDraw}onMouseMove={draw}onMouseUp={endDraw}onMouseLeave={endDraw}
            onTouchStart={startDraw}onTouchMove={draw}onTouchEnd={endDraw}onTouchCancel={endDraw}/>
          {/* SIGNATURE STANDARD ASMAT P10 - bouton de pre-remplissage si signature de reference existe */}
          {role==="asmat"&&sigStandard&&<div style={{marginTop:8}}>
            <button className="btn bG s" style={{width:"100%",justifyContent:"center"}} onClick={useStandardSig}>
              <IconeOuEmoji e="📋"/> Utiliser ma signature enregistrée
            </button>
          </div>}
          {role==="asmat"&&!sigStandard&&<div style={{marginTop:8,fontSize:11,color:"var(--l)",textAlign:"center"}}>
            <IconeOuEmoji e="💡"/> Astuce : enregistrez une signature standard dans Paramètres pour la réutiliser en 1 clic.
          </div>}
          <div style={{display:"flex",gap:8,marginTop:10}}>
            <button className="btn bG"onClick={clearSig}>Effacer</button>
            <button className="btn bP"style={{flex:1,justifyContent:"center"}}onClick={signer}disabled={!hasSig}>
              <IconeOuEmoji e="✍️"/> Signer le contrat
            </button>
          </div>
          <div style={{fontSize:11,color:"var(--l)",marginTop:8}}>
            <IconeOuEmoji e="🔒" taille={13}/> Signature horodatée et sécurisée - valeur légale conforme eIDAS
          </div>
        </div>}
        {role==="asmat"&&signes[enfant?.id]&&<div className="card" style={{padding:0,marginTop:12,overflow:"hidden"}}>
          <div onClick={()=>setPartageOuvert(p=>({...p,[enfant?.id]:!p[enfant?.id]}))} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"13px 15px",cursor:"pointer",userSelect:"none"}}>
            <span style={{fontSize:13.5,fontWeight:700,color:"var(--b)",display:"flex",alignItems:"center",gap:7}}><IconeOuEmoji e="🔗"/> Partage avec le parent
              {partages[enfant?.id]
                ?<span style={{fontSize:11,fontWeight:800,color:"var(--S)",background:"var(--Sp)",borderRadius:20,padding:"2px 8px"}}>PARTAGÉ</span>
                :<span style={{fontSize:11,fontWeight:800,color:"#9A7000",background:"#FDF6E8",borderRadius:20,padding:"2px 8px"}}>NON PARTAGÉ</span>}
            </span>
            <span style={{color:"var(--l)",transition:"transform .2s",transform:partageOuvert[enfant?.id]?"rotate(180deg)":"none"}}>▾</span>
          </div>
          {partageOuvert[enfant?.id]&&<div style={{padding:"0 15px 15px"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:"var(--c)",borderRadius:10,padding:"11px 13px"}}>
              <div style={{minWidth:0,paddingRight:10}}>
                <div style={{fontSize:13,fontWeight:600}}>Rendre visible au parent</div>
                <div style={{fontSize:11,color:"var(--l)"}}>Le parent pourra le lire et le signer</div>
              </div>
              <div onClick={()=>partagerContrat(enfant,!partages[enfant?.id])} style={{width:44,height:26,borderRadius:20,background:partages[enfant?.id]?"var(--S)":"#CBD5DC",position:"relative",flexShrink:0,cursor:contrat?.signe_parent&&partages[enfant?.id]?"not-allowed":"pointer",transition:"background .2s",opacity:contrat?.signe_parent&&partages[enfant?.id]?.6:1}}>
                <div style={{width:20,height:20,borderRadius:"50%",background:"#fff",position:"absolute",top:3,left:partages[enfant?.id]?21:3,boxShadow:"0 1px 3px rgba(0,0,0,.2)",transition:"left .2s"}}/>
              </div>
            </div>
            <div style={{fontSize:11.5,color:"var(--l)",marginTop:9,lineHeight:1.45}}>
              {contrat?.signe_parent
                ?"Le parent a signé : le partage est définitif et ne peut plus être retiré."
                :"Une fois partagé, le parent reçoit un e-mail l'invitant à consulter et signer. Vous pouvez retirer le partage tant qu'il n'a pas signé."}
            </div>
          </div>}
        </div>}
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontWeight:700,fontSize:13,color:"var(--b)"}}><IconeOuEmoji e="🔄"/> Demandes de modifications</div>
          <button className="btn bT s"style={{padding:"6px 12px"}}onClick={()=>setShowModale(true)}>+ Demande</button>
        </div>
        {(mods[enfant?.id]||[]).length===0&&<div className="card">
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
          return <div key={m.id||m.detail}className="card">
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
              <button className="btn bS s"style={{padding:"5px 10px"}}onClick={()=>repondre(m.id,true)}><IconeOuEmoji e="✅"/> Accepter</button>
              <button className="btn bG s"style={{padding:"5px 10px",color:"var(--R)"}}onClick={()=>repondre(m.id,false)}><IconeOuEmoji e="❌"/> Refuser</button>
            </div>}
            {peutSupprimer&&<div style={{display:"flex",gap:6,marginTop:8}}>
              <button className="btn bG s"style={{padding:"5px 10px",color:"var(--R)"}}onClick={()=>supprimerMod(m.id)}><IconeOuEmoji e="🗑️"/> Supprimer</button>
            </div>}
          </div>;
        })}
      </div>
    </div>}

    {showModale&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200}}>
      <div className="card"style={{padding:"var(--pad-carte-l)",width:420,maxWidth:"92vw"}}>
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

export function BulletinSalaire({enfants,role,pEId,user}){
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
  // BULLETIN #9b - affinages : AEEH (abattement 4xSMIC) + indemnite repas optionnelle
  const [aeeh,setAeeh]=useState(false);
  const [repasJour,setRepasJour]=useState(0);

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

  // Absences de l'assistante maternelle elle-meme, prises dans le calendrier.
  // Elles ne se confondent pas avec celles de l'enfant : ce sont les journees
  // ou c'est elle qui n'accueille pas.
  const [absAsmat,setAbsAsmat]=useState([]);
  useEffect(()=>{
    if(!moisSelKey){setAbsAsmat([]);return;}
    if(isDemoBull){
      setAbsAsmat(D.evenements.filter(e=>HEURES_TYPES[e.type]&&String(e.date).startsWith(moisSelKey)));
      return;
    }
    let vivant=true;
    (async()=>{
      const{data}=await supabase.from("evenements").select("*")
        .gte("date",moisSelKey+"-01").lte("date",moisSelKey+"-31");
      if(!vivant)return;
      setAbsAsmat((data||[]).filter(e=>HEURES_TYPES[e.type]).map(e=>({...e,heures:Number(e.heures)||0})));
    })();
    return()=>{vivant=false;};
  },[moisSelKey,isDemoBull]);

  // BULLETIN HISTORIQUE P14C - charger les heures reelles du mois selectionne
  useEffect(()=>{
    if(!enfant?.id||!moisSelKey||isDemoBull){setHeuresMoisReel(null);return;}
    let cancelled=false;
    (async()=>{
      const debut=moisSelKey+"-01";
      const[year,month]=moisSelKey.split("-").map(Number);
      const finDate=new Date(year,month,0); // dernier jour du mois
      const fin=isoJour(finDate);
      const{data:pts}=await supabase.from("pointages").select("total_minutes,date").eq("enfant_id",enfant.id).gte("date",debut).lte("date",fin);
      if(cancelled)return;
      // Regrouper par date : une "journee d'accueil" = somme des pointages du meme jour (matin+apres-midi)
      const byDate={};
      (pts||[]).forEach(p=>{if((p.total_minutes||0)>0){byDate[p.date]=(byDate[p.date]||0)+p.total_minutes;}});
      const parJour=Object.values(byDate); // minutes par journee d'accueil reelle
      const totalMin=parJour.reduce((s,m)=>s+m,0);
      const jours=parJour.length;
      setHeuresMoisReel({heures:Math.round(totalMin/60*100)/100,jours,parJour,nbPointages:pts?.length||0});
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

  // BULLETIN #9b - pre-remplir AEEH / indemnite repas depuis le contrat au changement d'enfant
  useEffect(()=>{
    const c=enfant?.contrat||{};
    setAeeh(!!c.aeeh);
    setRepasJour(Number(c.repas||c.indemniteRepas||0)||0);
  },[selId]);

  const hMens=heuresMensualisees(contrat);
  // Si heures reelles disponibles : utiliser. Sinon : estimation contrat
  const useRealHours=heuresMoisReel&&heuresMoisReel.heures>0;
  const h=isDemoBull
    ?(D.heures[enfant?.id]||{real:160,prev:174})
    :{real:useRealHours?heuresMoisReel.heures:hMens,prev:hMens};
  const tauxH=contrat.tauxHoraire||minimumHoraireAu(new Date());
  const heuresJourRef=Math.round(((contrat.heuresHebdo||40)/((contrat.jours?.length)||5))*10)/10;
  const heuresNorm=Math.min(h.real,45*4);
  const hSupp=Math.max(0,h.real-heuresNorm);
  const salBase=heuresNorm*tauxH;
  const salSupp=hSupp*tauxH*1.25;
  const brut=salBase+salSupp;
  // Le nombre de jours d'accueil se deduisait des heures divisees par 8, et
  // les trois rendus du bulletin — ecran, page imprimable, PDF — n'affichaient
  // pas le meme. Une seule origine : les jours reellement pointes, sinon ceux
  // prevus au contrat.
  const joursTravailles=useRealHours?heuresMoisReel.jours
    :Math.round(((contrat.jours?.length)||5)*semainesDuContrat(contrat)/MOIS_PAR_AN);
  const entretien=(contrat.entretien||3.92)*joursTravailles;
  // --- Retenue pour absence de l'assistante maternelle (CCN 3239, art. 111) ---
  // Elle ne s'applique QUE sur un salaire mensualise. Des que le bulletin est
  // bati sur les pointages reels, la journee non travaillee ne figure deja plus
  // dans les heures : la deduire une seconde fois retirerait deux fois la meme
  // journee. C'est le piege principal de ce calcul.
  const absRetenue=absAsmat.filter(a=>RETENUE_TYPES[a.type]);
  const heuresAbsAsmat=absRetenue.reduce((t,a)=>t+(Number(a.heures)||0),0);
  const joursAbsAsmat=absRetenue.length;
  // Formation hors temps d'accueil : pas de salaire, mais une allocation.
  // Elle n'est pas versee par le parent employeur : elle ne peut donc pas etre
  // une ligne du bulletin, seulement une estimation affichee a cote.
  const heuresFormationHors=absAsmat.filter(a=>a.type==="formh").reduce((t,a)=>t+(Number(a.heures)||0),0);
  const allocFormation=allocationFormation(heuresFormationHors);
  const anneeComplete=contrat.anneeComplete!==false;
  const retenue=useRealHours?0:retenueAbsence({
    salaireMensualise:brut,
    anneeComplete,
    heuresAbsence:heuresAbsAsmat,
    // Denominateur : les heures qui auraient ete travaillees dans le mois si
    // elle n'avait pas ete absente — les heures d'absence en font partie.
    heuresMois:hMens,
    joursAbsence:joursAbsAsmat,
    joursMois:Math.round(hMens/Math.max(1,heuresJourRef)),
  });
  const brutApresRetenue=Math.round((brut-retenue)*100)/100;
  // Les cotisations sont dues sur le brut apres retenue : une journee non
  // travaillee ne genere ni salaire ni cotisation.
  const cotisation=(t,part)=>brutApresRetenue*(t.base||1)*(t[part]||0)/100;
  const totalCotSal=Object.values(TAUX_COTISATIONS).reduce((s,t)=>s+(t.sal>0?cotisation(t,"sal"):0),0);
  const totalCotPat=Object.values(TAUX_COTISATIONS).reduce((s,t)=>s+(t.pat>0?cotisation(t,"pat"):0),0);
  const netPaye=brutApresRetenue-totalCotSal;
  const netImposable=Math.round((netPaye+brutApresRetenue*0.9825*0.029)*100)/100; // net fiscal = brut - cotisations deductibles (CSG ND + CRDS non deductibles, reintegrees)
  const coutEmployeur=brutApresRetenue+totalCotPat;
  const netSocial=Math.round((brutApresRetenue-totalCotSal)*100)/100; // mention obligatoire (brut - cotisations salariales, hors indemnites)
  // Indemnite de repas optionnelle (non soumise a cotisations, hors brut/net social/net imposable)
  const repasMois=Math.round((Number(repasJour)||0)*joursTravailles*100)/100;
  const cpAcquis=2.5; // jours ouvrables acquis par mois travaille (CCN particuliers employeurs, 30j/an)
  // Regime fiscal special assmat (CGI art. 80 sexies / BOI-RSA-CHAMP-10-20-10) : abattement par jour et par enfant.
  // Journee >=8h : 3 x SMIC horaire. Journee <8h : proratise = (3 x SMIC / 8) x heures reelles.
  // Enfant handicape (AEEH) : base 3->4 sur toutes les journees. Journee de 24h consecutives : +1 SMIC (4x, ou 5x si AEEH).
  // Calcul JOUR PAR JOUR a partir des pointages reels (gere les mois mixtes : journees pleines + journees courtes).
  const SMIC_H=smicHoraireAu(moisSelKey?moisSelKey+"-15":new Date());
  const baseMult=aeeh?4:3; // AEEH = +1 SMIC sur chaque journee
  // Liste des heures par journee d'accueil : pointages reels si dispo, sinon estimation uniforme depuis le contrat
  const heuresJourEst=(contrat.heuresHebdo||0)/(((contrat.jours&&contrat.jours.length))||5);
  const joursHeures=(useRealHours&&Array.isArray(heuresMoisReel.parJour)&&heuresMoisReel.parJour.length)
    ?heuresMoisReel.parJour.map(min=>min/60)
    :Array(Math.max(0,joursTravailles)).fill(heuresJourEst);
  let abMois=0,jPlein=0,jPart=0,jNuit=0;
  joursHeures.forEach(hJ=>{
    if(hJ>=23.5){jNuit++;abMois+=(baseMult+1)*SMIC_H;}          // 24h consecutives : forfait plein, +1 SMIC, pas de prorata
    else if(hJ>=8){jPlein++;abMois+=baseMult*SMIC_H;}            // journee pleine
    else{jPart++;abMois+=(baseMult*SMIC_H/8)*hJ;}               // journee courte : prorata
  });
  // Plafond legal : l'abattement ne peut exceder le total des sommes versees
  // (CGI art. 80 sexies). Sans ce plafond, le bulletin affichait un abattement
  // superieur a la base, meme si le net imposable restait juste.
  const baseAbattable=netImposable+entretien+repasMois;
  const abattementMois=Math.min(Math.round(abMois*100)/100,Math.round(baseAbattable*100)/100);
  // Libelle dynamique honnete selon la composition du mois
  let abLabel;
  if(jPart===0&&jNuit===0){abLabel=baseMult+"×SMIC × "+jPlein+" j";}
  else{
    const parts=[];
    if(jPlein)parts.push(jPlein+" j ≥8h ("+baseMult+"×SMIC)");
    if(jPart)parts.push(jPart+" j <8h proratisés");
    if(jNuit)parts.push(jNuit+" j 24h ("+(baseMult+1)+"×SMIC)");
    abLabel=parts.join(" + ");
  }
  const netImpApresAbattement=Math.max(0,Math.round((netImposable+entretien+repasMois-abattementMois)*100)/100);

  // BULLETIN HISTORIQUE P14C - generer et stocker le bulletin (PDF + DB + email)
  // « notifier » distingue les deux usages : l'envoi au parent (courriel +
  // notification) et la simple reecriture du PDF quand le modele a change. Sans
  // cette distinction, mettre a jour un bulletin aurait renvoye un courriel au
  // parent pour un document qu'il a deja recu.
  const envoyerAuParent=async(notifier=true)=>{
    if(!contrat?.id||!enfant?.id||!moisSelKey){setToast("Contrat ou enfant manquant");return;}
    setEnvoyer(true);
    try{
      // 1. Generer le PDF en jsPDF natif
      const jsPDF=await chargerJsPDF();
      const doc=protegerPdf(new jsPDF({unit:"mm",format:"a4",orientation:"portrait"}));
      const PW=210,MX=15;let y=15;
      const orange=[184,98,47];const noir=[40,40,40];const gris=[120,120,120];const vert=[42,157,143];
      // re-fetch signature
      let userSig=user?.signature_base64;
      const{data:fresh}=await supabase.from("profiles").select("signature_base64,numero_agrement").eq("id",user.id).maybeSingle();
      if(fresh?.signature_base64)userSig=fresh.signature_base64;
      // Header
      doc.setFontSize(8);doc.setTextColor(...gris);doc.setFont("helvetica","normal");
      doc.text("Convention collective des particuliers employeurs et de l'emploi à domicile (IDCC 3239)",PW/2,y,{align:"center"});y+=5;
      doc.setFontSize(16);doc.setFont("helvetica","bold");doc.setTextColor(...orange);
      doc.text("BULLETIN DE PAIE",PW/2,y,{align:"center"});y+=6;
      doc.setFontSize(11);doc.setFont("helvetica","bold");doc.setTextColor(...noir);
      doc.text(moisSel,PW/2,y,{align:"center"});y+=8;
      // Employeur / Salarie
      const parentP=enfant?.parent;
      const prenomEmp=parentP?.prenom?(parentP.prenom+" "+(parentP.nom||"")):"Parent employeur";
      doc.setFillColor(248,248,248);doc.rect(MX,y,PW-2*MX,22,"F");
      doc.setFontSize(9);doc.setFont("helvetica","bold");
      doc.text("EMPLOYEUR (particulier)",MX+2,y+5);
      doc.text("SALARIÉ (assistant maternel agréé)",MX+(PW-2*MX)/2+2,y+5);
      doc.setFont("helvetica","normal");doc.setFontSize(9);
      doc.text(prenomEmp,MX+2,y+11);
      doc.text((user?.prenom||"")+" "+(user?.nom||""),MX+(PW-2*MX)/2+2,y+11);
      doc.setFontSize(8);
      doc.text("Code APE : 8891A",MX+2,y+16);
      if(fresh?.numero_agrement)doc.text("N° agrément : "+fresh.numero_agrement,MX+(PW-2*MX)/2+2,y+16);
      doc.text("Entré le : "+(contrat.debut?fmtDatePdf(contrat.debut):"-")+" — CDI",MX+(PW-2*MX)/2+2,y+20);
      y+=26;
      // Le bulletin ne disait pas sur quelle base il etait calcule : c'est
      // pourtant ce qui explique pourquoi le montant est le meme chaque mois,
      // et la question que pose tout parent employeur.
      doc.setFontSize(7.5);doc.setTextColor(...gris);doc.setFont("helvetica","normal");
      doc.text("Emploi : assistant maternel agréé — accueil de "+(enfant?.prenom||"l'enfant")
        +". Mensualisation en "+(anneeComplete?"année complète":"année incomplète")+" : "
        +semainesDuContrat(contrat)+" semaines × "+(contrat.heuresHebdo||0)+" h ÷ 12 = "
        +heuresMensualisees(contrat)+" h par mois.",MX+2,y);
      doc.setTextColor(...noir);doc.setFontSize(8);
      y+=6;
      // GARDE DE PAGE - jsPDF n'avertit pas : ce qui depasse le bas de la page
      // est ecrit dans le vide et disparait, en silence. La ligne « Cout total
      // employeur » manquait ainsi sur un bulletin charge, sans que rien ne le
      // signale. Toute la mise en page passe par section() et ligne() : c'est
      // le seul endroit ou poser le controle.
      const BAS_BULLETIN=258;
      const placer=(h)=>{ if(y+h>BAS_BULLETIN){doc.addPage();y=15;} };

      // Section : Remuneration
      const section=(t)=>{
        placer(14);
        doc.setFillColor(...orange);doc.rect(MX,y,PW-2*MX,6,"F");
        doc.setFontSize(9);doc.setFont("helvetica","bold");doc.setTextColor(255,255,255);
        doc.text(t,MX+2,y+4);
        y+=8;
        doc.setTextColor(...noir);
      };
      const ligne=(l,col2,col3,col4,bold)=>{
        placer(6);
        doc.setDrawColor(220,220,220);doc.rect(MX,y,PW-2*MX,6);
        doc.setFontSize(8);doc.setFont("helvetica",bold?"bold":"normal");
        doc.text(l,MX+2,y+4);
        if(col2)doc.text(col2,MX+95,y+4);
        if(col3)doc.text(col3,MX+130,y+4);
        if(col4)doc.text(col4,PW-MX-2,y+4,{align:"right"});
        y+=6;
      };
      section("RÉMUNÉRATION");
      ligne("Salaire de base (heures normales)",heuresNorm+" h",nbf(tauxH,4)+" €/h",nbf(salBase,2)+" €");
      if(hSupp>0)ligne("Heures supplémentaires (+ 25 %)",hSupp+" h",nbf((tauxH*1.25),4)+" €/h",nbf(salSupp,2)+" €");
      ligne("Indemnité d'entretien",joursTravailles+" jours",nbf((contrat.entretien||3.92),2)+" €/j",nbf(entretien,2)+" €");
      if(repasMois>0)ligne("Indemnité de repas",joursTravailles+" jours",nbf((Number(repasJour)||0),2)+" €/j",nbf(repasMois,2)+" €");
      if(retenue>0)ligne("Retenue pour absence (art. 111 CCN)",(anneeComplete?heuresAbsAsmat+" h":joursAbsAsmat+" jours"),anneeComplete?"année complète":"année incomplète","- "+nbf(retenue,2)+" €");
      placer(9);doc.setFillColor(251,240,232);doc.rect(MX,y,PW-2*MX,7,"F");
      doc.setFont("helvetica","bold");doc.setFontSize(9);
      doc.text("SALAIRE BRUT MENSUEL",MX+2,y+5);
      doc.text(nbf(brutApresRetenue,2)+" €",PW-MX-2,y+5,{align:"right"});
      y+=10;
      // Section : Cotisations
      section("COTISATIONS SOCIALES");
      Object.entries(TAUX_COTISATIONS).forEach(([nom,t])=>{
        if(t.sal>0||t.pat>0){
          const cs=cotisation(t,"sal");
          const cp=cotisation(t,"pat");
          ligne(nom,t.sal>0?"- "+nbf(cs,2):"—",t.pat>0?nbf(cp,2):"—","");
        }
      });
      placer(9);doc.setFillColor(245,245,245);doc.rect(MX,y,PW-2*MX,7,"F");
      doc.setFont("helvetica","bold");doc.setFontSize(9);
      doc.text("TOTAL COTISATIONS",MX+2,y+5);
      doc.setTextColor(196,74,106);
      doc.text("- "+nbf(totalCotSal,2)+" €",MX+95,y+5);
      doc.setTextColor(...noir);
      doc.text(nbf(totalCotPat,2)+" €",MX+130,y+5);
      y+=10;
      doc.setFont("helvetica","italic");doc.setFontSize(7);doc.setTextColor(...gris);
      doc.text("« — » : pas de cotisation sur cette part. CSG/CRDS calculées sur 98,25 % du brut.",MX+2,y);
      y+=5;doc.setFont("helvetica","normal");doc.setFontSize(8);doc.setTextColor(...noir);
      // Section : Recap net
      if(y>240){doc.addPage();y=15;}
      placer(62);
      section("RÉCAPITULATIF NET");
      ligne("Salaire brut","","",nbf(brutApresRetenue,2)+" €");
      doc.setTextColor(196,74,106);
      ligne("Cotisations salariales","","","- "+nbf(totalCotSal,2)+" €");
      doc.setTextColor(...noir);
      placer(9);doc.setFillColor(...orange);doc.rect(MX,y,PW-2*MX,8,"F");
      doc.setTextColor(255,255,255);doc.setFont("helvetica","bold");doc.setFontSize(11);
      doc.text("NET À PAYER",MX+2,y+5.5);
      doc.text(nbf(netPaye,2)+" €",PW-MX-2,y+5.5,{align:"right"});
      y+=10;
      doc.setTextColor(...noir);doc.setFontSize(8);
      placer(7);doc.setFillColor(234,244,238);doc.rect(MX,y,PW-2*MX,6,"F");
      doc.setFont("helvetica","bold");doc.setTextColor(61,107,80);
      doc.text("Net imposable",MX+2,y+4);
      doc.text(nbf(netImposable,2)+" €",PW-MX-2,y+4,{align:"right"});
      y+=7;
      doc.setTextColor(...noir);doc.setFont("helvetica","normal");doc.setFontSize(8);
      ligne("Abattement régime spécial assistant maternel ("+abLabel+")","","","- "+nbf(abattementMois,2)+" €");
      placer(7);doc.setFillColor(234,244,238);doc.rect(MX,y,PW-2*MX,6,"F");
      doc.setFont("helvetica","bold");doc.setTextColor(61,107,80);
      doc.text("Net imposable après abattement",MX+2,y+4);
      doc.text(nbf(netImpApresAbattement,2)+" €",PW-MX-2,y+4,{align:"right"});
      y+=7;
      placer(7);doc.setFillColor(232,240,247);doc.rect(MX,y,PW-2*MX,6,"F");
      doc.setFont("helvetica","bold");doc.setTextColor(46,72,89);
      doc.text("Montant net social",MX+2,y+4);
      doc.text(nbf(netSocial,2)+" €",PW-MX-2,y+4,{align:"right"});
      y+=7;
      doc.setTextColor(...gris);doc.setFont("helvetica","normal");doc.setFontSize(7);
      doc.text("Référence RSA / prime d'activité, hors indemnités d'entretien et de repas.",MX+2,y+3);
      y+=6;doc.setFontSize(8);
      doc.setTextColor(...noir);doc.setFont("helvetica","normal");
      ligne("Indemnité d'entretien (non imposable)","","",nbf(entretien,2)+" €");
      if(repasMois>0)ligne("Indemnité de repas (non imposable)","","",nbf(repasMois,2)+" €");
      // Le solde de conges payes ne figurait nulle part : c'est pourtant la
      // rubrique que l'on cherche sur un bulletin quand on pose ses dates.
      ligne("Congés payés acquis ce mois","","",nbf(cpAcquis,1)+" jours ouvrables");
      placer(7);doc.setFillColor(245,240,255);doc.rect(MX,y,PW-2*MX,6,"F");
      doc.setFont("helvetica","bold");
      doc.text("Coût total employeur",MX+2,y+4);
      doc.text(nbf((coutEmployeur+entretien+repasMois),2)+" €",PW-MX-2,y+4,{align:"right"});
      y+=12;
      // Signature
      placer(34);
      const sigW=(PW-2*MX-5)/2;
      doc.setDrawColor(220,220,220);
      doc.rect(MX,y,sigW,25);
      doc.rect(MX+sigW+5,y,sigW,25);
      doc.setFontSize(8);doc.setFont("helvetica","bold");doc.setTextColor(...noir);
      doc.text("Signature de l'employeur",MX+2,y+4);
      doc.text("Signature du salarié",MX+sigW+7,y+4);
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
      doc.setFont("helvetica","bold");
      doc.text("Dans votre intérêt et pour vous aider à faire valoir vos droits, conservez ce bulletin de paie sans limitation de durée.",PW/2,y,{align:"center"});
      doc.setFont("helvetica","normal");y+=3.5;
      doc.text("Article R. 3243-5 du code du travail. L'employeur en conserve un double pendant cinq ans (article L. 3243-4).",PW/2,y,{align:"center"});y+=3.5;
      doc.text("Établi le "+new Date().toLocaleDateString("fr-FR")+" — Convention collective IDCC 3239 — Déclaration Pajemploi (Urssaf).",PW/2,y,{align:"center"});
      const totalPages=doc.getNumberOfPages();
      for(let pg=1;pg<=totalPages;pg++){
        doc.setPage(pg);
        doc.setFont("helvetica","normal");doc.setFontSize(7);doc.setTextColor(...gris);
        doc.text("Page "+pg+" sur "+totalPages,PW-MX,292,{align:"right"});
        if(pg>1){
          doc.text("Bulletin de paie — "+moisSel+" — "+((user?.prenom||"")+" "+(user?.nom||"")).trim(),MX,292);
        }
        doc.setTextColor(...noir);
      }

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
        cout_employeur:Math.round((coutEmployeur+entretien+repasMois)*100)/100,
        pdf_storage_path:path,
        envoye_au_parent:true,
        date_envoi:new Date().toISOString(),
      },{onConflict:"contrat_id,mois"});
      if(eIns){setToast("Erreur DB : "+eIns.message);setEnvoyer(false);return;}
      // 5. Upsert dans documents_meta
      const{data:existing}=await supabase.from("documents_meta").select("id").eq("storage_path",path).maybeSingle();
      const nomDoc="Bulletin_"+H(enfant.prenom||"enfant")+"_"+moisSelKey+".pdf";
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
      await logAction(notifier?"send_bulletin":"regen_bulletin",{table_name:"bulletins",record_id:contrat.id});
      // 6. Email parent (silencieux si Resend pas configure)
      if(notifier&&contrat.parent_id){
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
      setToast(notifier?"Bulletin envoyé au parent ✓ et archivé dans Documents":"Bulletin mis à jour ✓ — le parent n'a pas été renotifié");
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
    <div style={{fontSize:11,fontWeight:700,color:"var(--l)",textTransform:"uppercase",letterSpacing:".5px",marginBottom:8}}>Choisir le mois</div>
    <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
      {moisDisponibles.slice(0,8).map(m=>{
        const env=bulletinsEnvoyes[m.key];
        return <button key={m.label}onClick={()=>setMoisSel(m.label)}style={{
          padding:"7px 15px",borderRadius:10,border:"1.5px solid",cursor:"pointer",fontSize:12,fontWeight:600,
          background:moisSel===m.label?"var(--b)":"#fff",color:moisSel===m.label?"#fff":"var(--m)",
          borderColor:moisSel===m.label?"var(--b)":(env?.envoye_au_parent?"var(--S)":"var(--br)"),
          position:"relative"}}>
          {m.label}
          {env?.envoye_au_parent&&<span style={{position:"absolute",top:-6,right:-6,fontSize:11,background:"var(--S)",color:"#fff",borderRadius:"50%",width:18,height:18,display:"flex",alignItems:"center",justifyContent:"center"}}>✓</span>}
        </button>;
      })}
    </div>
    {/* BULLETIN HISTORIQUE P14C - statut du mois selectionne */}
    {/* Le bandeau annoncait « disponible dans Documents » et s'arretait la :
        il fallait quitter l'ecran pour relire le bulletin qu'on venait
        d'envoyer. Le PDF s'ouvre maintenant d'ici, comme le contrat. */}
    {moisSelKey&&bulletinsEnvoyes[moisSelKey]?.envoye_au_parent&&<div style={{padding:"10px 14px",background:"var(--Sp)",border:"1px solid var(--S)",borderRadius:8,marginBottom:12,fontSize:12,color:"var(--S)",display:"flex",alignItems:"center",gap:9,flexWrap:"wrap"}}>
      <span style={{display:"inline-flex",alignItems:"center",gap:8}}>
        <IconeOuEmoji e="✅"/> <strong>Bulletin envoyé au parent</strong> le {new Date(bulletinsEnvoyes[moisSelKey].date_envoi).toLocaleDateString("fr-FR")}
      </span>
      {bulletinsEnvoyes[moisSelKey].pdf_storage_path
        ?<BoutonPdfStocke path={bulletinsEnvoyes[moisSelKey].pdf_storage_path} onErr={(m)=>setToast(m)} compact icone="📜"
          label="Ouvrir le bulletin (PDF)" erreur="❌ Bulletin indisponible (droits d'accès) — réessayez dans un instant."/>
        :<span style={{color:"var(--m)"}}>— disponible dans Documents</span>}
      {/* Toujours accessible : le contrat peut avoir change depuis l'envoi. */}
      <button className={"btn s "+(pdfPerime(bulletinsEnvoyes[moisSelKey].date_envoi)?"bS":"")} disabled={envoyer} onClick={()=>envoyerAuParent(false)}>
        {envoyer?"Mise à jour…":"↻ Mettre à jour le PDF"}
      </button>
    </div>}
    {moisSelKey&&bulletinsEnvoyes[moisSelKey]?.envoye_au_parent&&pdfPerime(bulletinsEnvoyes[moisSelKey].date_envoi)&&
      <div style={{fontSize:11.5,color:"var(--R)",lineHeight:1.5,marginBottom:12,marginTop:-6}}>
        Ce PDF a été produit par une version précédente du bulletin : il lui manque la base de
        mensualisation, le solde de congés payés et la mention légale de conservation. Le mettre
        à jour le réécrit avec les mêmes chiffres — le parent n'est pas renotifié.
      </div>}
    {moisSelKey&&!bulletinsEnvoyes[moisSelKey]&&!isDemoBull&&<div style={{padding:"10px 14px",background:"var(--Bp)",border:"1px solid var(--B)",borderRadius:8,marginBottom:12,fontSize:12,color:"var(--B)"}}>
      ⏳ Bulletin non encore envoyé pour ce mois
      {useRealHours?<span style={{marginLeft:8,fontSize:11,color:"var(--S)"}}>· {heuresMoisReel.heures} h pointées sur {heuresMoisReel.jours} j</span>
        :<span style={{marginLeft:8,fontSize:11,color:"var(--l)",fontStyle:"italic"}}>· basé sur le contrat (aucun pointage)</span>}
    </div>}

    {/* L'allocation de formation n'est pas une ligne de salaire : elle est
        versée par IPERIA, pas par le parent employeur. Elle s'affiche donc à
        côté du bulletin, jamais dedans. */}
    {allocFormation>0&&<div style={{background:"var(--Pp)",border:"1px solid var(--P)",borderRadius:12,padding:"12px 14px",marginBottom:12}}>
      <div style={{fontWeight:700,fontSize:13,color:"var(--P)",marginBottom:4,display:"flex",alignItems:"center",gap:7}}>
        <IconeOuEmoji e="📔"/> Allocation de formation — {nbf(allocFormation,2)} €
      </div>
      <div style={{fontSize:12,color:"var(--m)",lineHeight:1.55}}>
        {heuresFormationHors} h de formation hors temps d'accueil × {nbf(ALLOC_FORMATION_H,2)} € nets.
        Versée par IPERIA à l'issue de votre parcours — elle ne figure pas sur le bulletin et n'est pas payée par le parent employeur.
        {heuresFormationHors>ALLOC_FORMATION_PLAFOND_H&&" Plafonnée à "+ALLOC_FORMATION_PLAFOND_H+" h par an."}
      </div>
    </div>}

    {/* BULLETIN #9b - reglages abattement : AEEH + indemnite repas */}
    <div style={{display:"flex",gap:16,flexWrap:"wrap",alignItems:"center",marginBottom:12,fontSize:12,padding:"10px 14px",background:"var(--c)",borderRadius:8,border:"1px solid var(--br)"}}>
      <label style={{display:"flex",alignItems:"center",gap:7,cursor:"pointer",color:"var(--m)"}}>
        <input type="checkbox" checked={aeeh} onChange={e=>setAeeh(e.target.checked)} style={{cursor:"pointer"}}/>
        Enfant handicapé (AEEH) — abattement 4×SMIC
      </label>
      <label style={{display:"flex",alignItems:"center",gap:7,color:"var(--m)"}}>
        Indemnité repas (€/jour)
        <input type="number" step="0.01" min="0" value={repasJour} onChange={e=>setRepasJour(e.target.value)} style={{width:74,padding:"4px 7px",borderRadius:6,border:"1px solid var(--br)",fontSize:12}}/>
      </label>
      {!isDemoBull&&contrat?.id&&<button className="btn bG s" style={{padding:"6px 12px"}} onClick={async()=>{
        const{error}=await supabase.from("contrats").update({aeeh:!!aeeh,repas:Number(repasJour)||0}).eq("id",contrat.id);
        setToast(error?("Erreur : "+error.message):"Réglages enregistrés dans le contrat ✓");
      }}><IconeOuEmoji e="💾"/> Enregistrer dans le contrat</button>}
    </div>

    {/* Coup d'oeil — le resultat du bulletin en un regard (repere Pandi-Panda : lisibilite immediate) */}
    <div className="card"style={{padding:0,marginBottom:14,overflow:"hidden"}}>
      <div style={{background:"linear-gradient(135deg,var(--Sp),var(--Bp))",padding:"16px 18px"}}>
        <div style={{fontSize:11,fontWeight:700,color:"var(--B)",textTransform:"uppercase",letterSpacing:".5px",marginBottom:3}}>Net à payer · {moisSel}</div>
        <div className="pf"style={{fontSize:30,fontWeight:800,color:"var(--b)",lineHeight:1.1}}>{nbf(netPaye,2)} €</div>
        <div style={{fontSize:11,color:"var(--m)",marginTop:3}}>{joursTravailles} jour{joursTravailles>1?"s":""} d'accueil · {Math.round(h.real)} h ce mois{useRealHours?" (pointages réels)":""}</div>
      </div>
      <div className="g3"style={{padding:14,gap:10}}>
        {[["Salaire brut",nbf(brutApresRetenue,2)+" €","var(--B)","var(--Bp)"],
          ["Indemnités",nbf((entretien+repasMois),2)+" €","var(--T)","var(--Tp)"],
          ["Coût employeur",nbf((coutEmployeur+entretien+repasMois),2)+" €","var(--m)","var(--c)"],
        ].map(([l,v,c,bg])=><div key={l}style={{background:bg,borderRadius:12,padding:"11px 10px",textAlign:"center",minWidth:0}}>
          <div className="pf"style={{fontSize:15,fontWeight:800,color:c,lineHeight:1.15,overflow:"hidden",textOverflow:"ellipsis"}}>{v}</div>
          <div style={{fontSize:11,color:"var(--m)",marginTop:3,fontWeight:600}}>{l}</div>
        </div>)}
      </div>
    </div>

    <div className="card"style={{padding:"var(--pad-carte-l)",border:"2px solid var(--br)"}}>
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
        <AlerteTauxMinimum taux={tauxH} date={moisSelKey?moisSelKey+"-15":new Date()} titreAmge={user?.titre_amge}/>
        {/* Le mode de mensualisation change le montant de plus de 10 % : il doit
            etre lisible sur le bulletin, pas seulement dans le contrat. */}
        <div style={{fontSize:11.5,color:"var(--m)",marginBottom:10,lineHeight:1.5}}>
          Mensualisation {estAnneeComplete(contrat)?"en année complète":"en année incomplète"} :
          {" "}{semainesDuContrat(contrat)} semaines × {contrat.heuresHebdo||0} h ÷ 12 = <b>{heuresMensualisees(contrat)} h/mois</b>.
          {estAnneeComplete(contrat)?" Les congés payés sont inclus dans ce lissage."
            :" Les congés payés sont versés séparément."}
        </div>
        <div style={{fontSize:11,fontWeight:700,color:"var(--l)",textTransform:"uppercase",letterSpacing:".5px",marginBottom:8}}>RÉMUNÉRATION</div>
        {[["Salaire de base",heuresNorm+"h × "+tauxH+"€/h",nbf(salBase,2)+"€"],
          ...(hSupp>0?[["Heures majorées 25%",hSupp+"h × "+nbf((tauxH*1.25),2)+"€",nbf(salSupp,2)+"€"]]:[]),
          ["Indemnité d'entretien",joursTravailles+" j × "+nb2(contrat.entretien||3.92)+"€",nbf(entretien,2)+"€"],
          ...(repasMois>0?[["Indemnité de repas",joursTravailles+" j × "+nbf((Number(repasJour)||0),2)+"€",nbf(repasMois,2)+"€"]]:[]),
          ...(retenue>0?[["Retenue absence"+(anneeComplete?"":" (année incomplète)"),(anneeComplete?heuresAbsAsmat+"h":joursAbsAsmat+"j")+" · art. 111 CCN","− "+nbf(retenue,2)+"€"]]:[]),
        ].map(([l,d,v])=><div key={l}style={{display:"flex",justifyContent:"space-between",fontSize:12,padding:"4px 0",borderBottom:"1px dotted var(--br)"}}>
          <span style={{color:"var(--b)",flex:2}}>{l}</span>
          <span style={{color:"var(--l)",flex:2,textAlign:"center"}}>{d}</span>
          <span style={{fontWeight:600,flex:1,textAlign:"right"}}>{v}</span>
        </div>)}
        <div style={{display:"flex",justifyContent:"space-between",fontWeight:700,marginTop:6,paddingTop:6,borderTop:"1px solid var(--b)",fontSize:13}}>
          <span>SALAIRE BRUT</span><span style={{color:"var(--b)"}}>{nbf(brutApresRetenue,2)} €</span>
        </div>
      </div>

      {/* Cotisations */}
      <div style={{marginBottom:14}}>
        <div style={{fontSize:11,fontWeight:700,color:"var(--l)",textTransform:"uppercase",letterSpacing:".5px",marginBottom:6}}>COTISATIONS</div>
        <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr",fontSize:11}}>
          {["Libellé","Salarié","Employeur"].map(h2=><div key={h2}style={{fontWeight:700,color:"var(--l)",padding:"3px 0",borderBottom:"1px solid var(--br)"}}>{h2}</div>)}
          {Object.entries(TAUX_COTISATIONS).flatMap(([nom,t])=>[
            <div key={nom+"l"}style={{fontSize:11,color:"var(--m)",padding:"2px 0",borderBottom:"1px dotted var(--br)"}}>{nom}</div>,
            <div key={nom+"s"}style={{fontSize:11,textAlign:"right",color:"var(--R)",padding:"2px 0",borderBottom:"1px dotted var(--br)"}}>{t.sal>0?nbf(cotisation(t,"sal"),2)+"€":"-"}</div>,
            <div key={nom+"p"}style={{fontSize:11,textAlign:"right",padding:"2px 0",borderBottom:"1px dotted var(--br)"}}>{t.pat>0?nbf(cotisation(t,"pat"),2)+"€":"-"}</div>,
          ])}
          <div style={{fontWeight:700,fontSize:11,padding:"4px 0",borderTop:"1px solid var(--b)"}}>TOTAL</div>
          <div style={{fontWeight:700,fontSize:11,textAlign:"right",color:"var(--R)",padding:"4px 0",borderTop:"1px solid var(--b)"}}>{nbf(totalCotSal,2)}€</div>
          <div style={{fontWeight:700,fontSize:11,textAlign:"right",padding:"4px 0",borderTop:"1px solid var(--b)"}}>{nbf(totalCotPat,2)}€</div>
        </div>
        <div style={{fontSize:11,color:"var(--l)",marginTop:4,fontStyle:"italic"}}>« - » = pas de cotisation sur cette part. CSG/CRDS calculées sur 98,25 % du brut.</div>
      </div>

      {/* Net */}
      <div style={{background:"var(--c)",borderRadius:10,padding:14,marginBottom:16}}>
        {[["Salaire brut",nbf(brutApresRetenue,2)+"€","var(--b)"],
          ["Cotisations salariales","-"+nbf(totalCotSal,2)+"€","var(--R)"],
        ].map(([l,v,c])=><div key={l}style={{display:"flex",justifyContent:"space-between",padding:"5px 0",
          borderBottom:"1px solid var(--br)",fontSize:12}}>
          <span style={{color:"var(--m)"}}>{l}</span><span style={{fontWeight:700,color:c}}>{v}</span>
        </div>)}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"var(--Sp)",borderRadius:10,padding:"12px 14px",margin:"10px 0"}}>
          <span style={{fontSize:13,fontWeight:800,color:"var(--S)",textTransform:"uppercase",letterSpacing:".3px"}}>Net à payer</span>
          <span className="pf"style={{fontSize:20,fontWeight:800,color:"var(--S)"}}>{nbf(netPaye,2)} €</span>
        </div>
        {[["Net imposable",nbf(netImposable,2)+"€","var(--B)"],
          ["Abattement régime spécifique ("+abLabel+")","- "+nbf(abattementMois,2)+"€","var(--m)"],
          ["Net imposable après abattement",nbf(netImpApresAbattement,2)+"€","var(--B)"],
          ["Montant net social",nbf(netSocial,2)+"€","var(--B)"],
          ["Coût total pour l'employeur",nbf((coutEmployeur+entretien+repasMois),2)+"€","var(--m)"],
        ].map(([l,v,c])=><div key={l}style={{display:"flex",justifyContent:"space-between",padding:"5px 0",
          borderBottom:"1px solid var(--br)",fontSize:12}}>
          <span style={{color:"var(--m)"}}>{l}</span><span style={{fontWeight:700,color:c}}>{v}</span>
        </div>)}
      </div>

      <div style={{fontSize:11,color:"var(--l)",lineHeight:1.6,marginBottom:14}}>
        Bulletin conforme CCN particuliers employeurs. <b>Montant net social</b> (référence RSA / prime d'activité) = salaire brut − cotisations salariales, hors indemnités. <b>Congés payés acquis : 2,5 jours ouvrables/mois</b> (30 j/an). <b>Abattement régime spécifique</b> (CGI art. 80 sexies) = {baseMult} × SMIC horaire ({nbf(SMIC_H,2)} €) par journée d'accueil ≥ 8 h, soit {nbf((baseMult*SMIC_H),2)} €/j{aeeh?" (4×SMIC car enfant handicapé / AEEH)":""} ; les journées de moins de 8 h sont proratisées (× heures ÷ 8) et celles de 24 h consécutives ouvrent +1 SMIC ({(baseMult+1)}×SMIC). Calculé journée par journée d'après les pointages réels. Il couvre les frais et absorbe les indemnités d'entretien{repasMois>0?" et de repas":""} (option à la déclaration). À conserver 5 ans.
      </div>
      <div style={{display:"flex",gap:8}}>
        <button className="btn bG"style={{flex:1}}onClick={()=>{
        const w=window.open('','_blank');
        if(!w){setToast('Autorisez les popups pour télécharger');return;}
        const prenomEmp=enfant?.prenomParent||(enfant?.parentId?"Parent employeur":"Parent");
        const cotisDetails=Object.entries(TAUX_COTISATIONS).map(function(entry){
          var nom=entry[0],t=entry[1];
          return "<tr><td>"+H(nom)+"</td>"
            +"<td class=\"right\">"+(t.sal>0?nbf(cotisation(t,"sal"),2)+"€":"-")+"</td>"
            +"<td class=\"right\">"+(t.pat>0?nbf(cotisation(t,"pat"),2)+"€":"-")+"</td></tr>";
        }).join("");
        var hSuppRow=hSupp>0?"<tr><td>Heures compl. (maj. 25%)</td><td class=\"right\">"+hSupp+" h</td><td class=\"right\">"+nbf((tauxH*1.25),4)+" €/h</td><td class=\"right\">"+nbf(salSupp,2)+" €</td></tr>":"";
        var htmlParts=[
          "<!DOCTYPE html><html lang=\"fr\"><head><meta charset=\"UTF-8\"/>",
          "<title>Bulletin de salaire "+moisSel+"</title>",
          "<style>",
          "*{box-sizing:border-box;margin:0;padding:0}",
          "body{font-family:Arial,sans-serif;font-size:11px;color:#222;padding:20px;max-width:800px;margin:0 auto}",
          "h1{font-size:16px;color:#2C1F14;text-align:center;margin:12px 0}",
          ".hg{display:grid;grid-template-columns:1fr 1fr;gap:12px;background:#F5F0EB;padding:12px;border-radius:6px;margin-bottom:12px;border:1px solid #DDD5C8}",
          ".hg div{font-size:11px;line-height:1.7}",
          ".hg strong{font-size:11px;color:#B8622F}",
          ".st{background:#2C1F14;color:#fff;padding:5px 10px;font-weight:700;font-size:11px;margin:10px 0 4px;letter-spacing:.5px}",
          "table{width:100%;border-collapse:collapse;font-size:11px}",
          "td,th{padding:5px 8px;border:1px solid #ddd}",
          "th{background:#f5f5f5;font-weight:700;text-align:left}",
          ".right{text-align:right}",
          ".brut{background:#FBF0E8;font-weight:700;font-size:11px}",
          ".net{background:#B8622F;color:#fff;font-weight:700;font-size:13px}",
          ".ni{background:#EAF4EE;font-weight:700;color:#3D6B50}",
          ".ce{background:#F5F0FF;font-weight:700}",
          ".sz{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:20px}",
          ".sb{border:1px solid #ddd;height:80px;border-radius:4px;padding:8px;font-size:11px;color:#aaa;display:flex;align-items:center;justify-content:center}",
          ".sb img{max-height:60px;max-width:100%;object-fit:contain}",
          "@media print{.nb{display:none}}",
          "</style></head><body>",
          "<div style=\"text-align:center;margin-bottom:8px\">",
          "<div style=\"font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px\">Convention Collective Nationale - Particuliers Employeurs</div>",
          "<h1>BULLETIN DE PAIE</h1>",
          "<div style=\"font-size:12px;color:#B8622F;font-weight:700\">"+moisSel+"</div>",
          "</div>",
          "<div class=\"hg\">",
          "<div><strong>EMPLOYEUR (Particulier)</strong><br/>"+H(prenomEmp)+"<br/>",
          // Le numero Pajemploi etait FABRIQUE : « PAJ- » suivi de l'annee et
          // d'un tirage au hasard, different a chaque impression. Sur un
          // bulletin de paie, cela ressemble a un identifiant officiel et n'en
          // est pas un. On imprime le vrai quand on le connait, une ligne a
          // remplir sinon.
          "N° Pajemploi : "+H(enfant?.parent?.numero_pajemploi||"________________")+"<br/>",
          "Emploi : Assistante maternelle agréée<br/>Code APE : 8891A</div>",
          "<div><strong>SALARIE(E)</strong><br/>"+(user?.prenom||"Prénom")+" "+(user?.nom||"Nom")+"<br/>",
          "Entree le : "+(contrat.debut||"-")+" - CDI</div>",
          "</div>",
          "<div class=\"st\">REMUNERATION</div>",
          "<table><tr><th>Libellé</th><th>Heures / Jours</th><th>Taux</th><th class=\"right\">Montant brut</th></tr>",
          "<tr><td>Salaire de base (heures normales)</td><td class=\"right\">"+heuresNorm+" h</td><td class=\"right\">"+nbf(tauxH,4)+" euros/h</td><td class=\"right\">"+nbf(salBase,2)+" euros</td></tr>",
          hSuppRow,
          "<tr><td>Indemnité d'entretien</td><td class=\"right\">"+joursTravailles+" jours</td><td class=\"right\">"+nbf((contrat.entretien||3.92),2)+" €/j</td><td class=\"right\">"+nbf(entretien,2)+" euros</td></tr>",
          (retenue>0?"<tr><td>Retenue pour absence (art. 111 CCN)</td><td class=\"right\">"+(anneeComplete?heuresAbsAsmat+" h":joursAbsAsmat+" jours")+"</td><td class=\"right\">"+(anneeComplete?"annee complete":"annee incomplete")+"</td><td class=\"right\">- "+nbf(retenue,2)+" euros</td></tr>":"")+
          (repasMois>0?"<tr><td>Indemnite de repas</td><td class=\"right\">"+joursTravailles+" jours</td><td class=\"right\">"+nbf((Number(repasJour)||0),2)+" euros/j</td><td class=\"right\">"+nbf(repasMois,2)+" euros</td></tr>":""),
          "<tr class=\"brut\"><td colspan=\"3\">SALAIRE BRUT MENSUEL</td><td class=\"right\">"+nbf(brutApresRetenue,2)+" euros</td></tr>",
          "</table>",
          "<div class=\"st\">COTISATIONS SOCIALES</div>",
          "<table><tr><th>Cotisation</th><th class=\"right\">Part salarie</th><th class=\"right\">Part employeur</th></tr>",
          cotisDetails,
          "<tr style=\"font-weight:700;background:#f5f5f5\"><td>TOTAL</td><td class=\"right\" style=\"color:#c44a6a\">-"+nbf(totalCotSal,2)+" euros</td><td class=\"right\">"+nbf(totalCotPat,2)+" euros</td></tr>",
          "</table>",
          "<div style=\"font-size:11px;color:#888;font-style:italic;margin:4px 0 8px\">« - » = pas de cotisation sur cette part. CSG/CRDS calculees sur 98,25 % du brut.</div>",
          "<div class=\"st\">RECAPITULATIF NET</div>",
          "<table>",
          "<tr><td>Salaire brut</td><td class=\"right\">"+nbf(brutApresRetenue,2)+" euros</td></tr>",
          "<tr><td>Cotisations salariales</td><td class=\"right\" style=\"color:#c44a6a\">- "+nbf(totalCotSal,2)+" euros</td></tr>",
          "<tr class=\"net\"><td>NET A PAYER</td><td class=\"right\">"+nbf(netPaye,2)+" euros</td></tr>",
          "<tr class=\"ni\"><td>Net imposable</td><td class=\"right\">"+nbf(netImposable,2)+" euros</td></tr>",
          "<tr><td>Abattement regime special assmat ("+abLabel.replace(/×/g," x ").replace(/≥/g,">=")+")</td><td class=\"right\">- "+nbf(abattementMois,2)+" euros</td></tr>",
          "<tr class=\"ni\"><td>Net imposable apres abattement</td><td class=\"right\">"+nbf(netImpApresAbattement,2)+" euros</td></tr>",
          "<tr class=\"ni\"><td>Montant net social (reference RSA / prime d activite, hors indemnites)</td><td class=\"right\">"+nbf(netSocial,2)+" euros</td></tr>",
          "<tr><td>Conges payes acquis ce mois</td><td class=\"right\">"+cpAcquis+" jours ouvrables</td></tr>",
          "<tr><td>Indemnite entretien (non imposable)</td><td class=\"right\">"+nbf(entretien,2)+" euros</td></tr>",
          (repasMois>0?"<tr><td>Indemnite repas (non imposable)</td><td class=\"right\">"+nbf(repasMois,2)+" euros</td></tr>":""),
          "<tr class=\"ce\"><td>Cout total employeur (brut + cotis. patronales)</td><td class=\"right\">"+nbf((coutEmployeur+entretien+repasMois),2)+" euros</td></tr>",
          "</table>",
          "<div class=\"sz\">",
          "<div><div style=\"font-size:11px;font-weight:700;margin-bottom:6px\">Signature de l employeur</div><div class=\"sb\">Date: ________________</div></div>",
          // SIGNATURE STANDARD ASMAT P10 - injection signature dans bulletin de salaire
          "<div><div style=\"font-size:11px;font-weight:700;margin-bottom:6px\">Signature de la salariee</div>",
          (user?.signature_base64
            ?"<div class=\"sb\"><img src=\""+user.signature_base64+"\" alt=\"Signature\"/></div><div style=\"font-size:11px;color:#888;text-align:center;margin-top:4px\">Le "+new Date().toLocaleDateString("fr-FR")+"</div>"
            :"<div class=\"sb\">Date: ________________</div>"),
          "</div>",
          "</div>",
          "<p style=\"margin-top:16px;font-size:11px;color:#888;line-height:1.8\">",
          "Bulletin TiMat - "+new Date().toLocaleDateString("fr-FR")+" | CCN particuliers employeurs et emploi a domicile (IDCC 3239) | A conserver 5 ans",
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
      }}><IconeOuEmoji e="📥"/> Télécharger PDF</button>
        {role==="asmat"&&<button className="btn bT"style={{flex:1}}onClick={()=>envoyerAuParent(true)}disabled={envoyer||isDemoBull}>
          {envoyer?"⏳ Envoi en cours...":(bulletinsEnvoyes[moisSelKey]?.envoye_au_parent?"🔄 Renvoyer au parent":"📧 Envoyer au parent")}
        </button>}
      </div>
    </div>
  </div>;
}

//

export function DemandesAvenants({enfants,role,pEId}){
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

    <div className="card"style={{marginBottom:16}}>
      <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:14}}>
        <IconeOuEmoji e="➕"/> Nouvelle demande d'avenant
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
          <IconeOuEmoji e="📤"/> Soumettre la demande
        </button>
      </div>
    </div>

    {demandes.length>0&&<div style={{display:"flex",flexDirection:"column",gap:8}}>
      <div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:6}}><IconeOuEmoji e="📋"/> Historique des demandes</div>
      {demandes.map(d=><div key={d.id}className="card">
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
          <button className="btn bG s"onClick={()=>setDemandes(p=>p.map(x=>x.id===d.id?{...x,statut:"Refusée"}:x))}>
            ✕ Refuser
          </button>
          <button className="btn bT s"style={{flex:1,justifyContent:"center"}}
            onClick={()=>setDemandes(p=>p.map(x=>x.id===d.id?{...x,statut:"Acceptée"}:x))}>
            ✓ Accepter et créer l'avenant
          </button>
        </div>}
      </div>)}
    </div>}

    {demandes.length===0&&<div className="card"style={{padding:"var(--pad-carte-l)",textAlign:"center"}}>
      <div style={{marginBottom:8}}><IconeOuEmoji e="✏️" taille={36} couleur="var(--l)"/></div>
      <div style={{fontSize:13,color:"var(--m)"}}>Aucune demande d'avenant en cours</div>
      <div style={{fontSize:11,color:"var(--l)",marginTop:4}}>Les demandes soumises apparaîtront ici</div>
    </div>}
  </div>;
}

export function ContratsTypes({enfants}){
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
        style={{cursor:"pointer",
          borderLeft:(mod.avenant?"4px solid var(--G)":"4px solid var(--T)"),
          boxShadow:selModele===mod.id?"var(--sh2)":"var(--sh)"}}>
        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
          <span className="badge"style={{background:mod.avenant?"var(--Gp)":"var(--Tp)",color:mod.avenant?"var(--G)":"var(--T)",fontSize:11}}>
            {mod.avenant?"Avenant":"Contrat"}
          </span>
        </div>
        <div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:4}}>{mod.titre}</div>
        <div style={{fontSize:11,color:"var(--m)",lineHeight:1.5}}>{mod.desc}</div>
      </div>)}
    </div>

    {m&&<div className="card"style={{border:"2px solid var(--T)"}}>
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
          <IconeOuEmoji e="📄"/> Générer le document
        </button>
      </div>
    </div>}
  </div>;
}

//

export function CourriersTypes({enfants,pEId,user}){
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
    // L'echappement ne couvrait que & et < : le meme travail se fait deja une
    // seule fois, dans H().
    const corps=texte.split("\n").map(l=>l.trim()?("<p>"+H(l)+"</p>"):"<br/>").join("");
    w.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/><title>${H(sel.titre)}</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Calibri,Arial,sans-serif;max-width:760px;margin:0 auto;padding:48px;color:#2E4859;font-size:14px;line-height:1.8}p{margin:8px 0}@media print{.noprint{display:none}}</style></head><body>${corps}<div class="noprint"style="text-align:center;margin-top:28px"><button onclick="window.print()"style="background:#C76754;color:#fff;border:none;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer">🖨️ Imprimer / PDF</button></div></body></html>`);
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
        {filtres.map(c=><div key={c.id}className="card card-lift"onClick={()=>setSelId(c.id)}style={{cursor:"pointer",borderLeft:(c.cat==="Financier"?"4px solid var(--R)":c.cat==="PMI"?"4px solid var(--B)":c.cat==="Congés"?"4px solid var(--G)":"4px solid var(--T)")}}>
          <div style={{display:"flex",gap:10,alignItems:"center",justifyContent:"space-between"}}>
            <div style={{display:"flex",gap:10,alignItems:"center"}}>
              <span style={{fontSize:18}}><IconeOuEmoji e={c.ic}/></span>
              <div>
                <div style={{fontWeight:700,fontSize:13,color:"var(--b)"}}>{c.titre}</div>
                <span className="badge"style={{background:"var(--c)",color:"var(--l)",fontSize:11,marginTop:3}}>{c.cat}</span>
              </div>
            </div>
            <span style={{color:"var(--l)",fontSize:18}}>›</span>
          </div>
        </div>)}
      </div>
    </>:<>
      <button onClick={()=>setSelId(null)}style={{background:"none",border:"none",cursor:"pointer",color:"var(--accent)",fontWeight:700,fontSize:13,marginBottom:12,padding:0}}>← Retour aux modèles</button>
      <div className="card"style={{marginBottom:14}}>
        <div style={{fontWeight:700,fontSize:15,color:"var(--b)",marginBottom:4}}><IconeOuEmoji e={sel.ic}/> {sel.titre}</div>
        <div style={{fontSize:11,color:"var(--l)"}}>{sel.cat} · contexte rempli automatiquement (nom, agrément, enfant)</div>
      </div>
      {placeholders.length>0&&<div className="card"style={{marginBottom:14}}>
        <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:12}}><IconeOuEmoji e="✏️"/> À compléter{reste>0&&<span style={{color:"var(--T)",fontSize:12,fontWeight:600}}> · {reste} restant{reste>1?"s":""}</span>}</div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {placeholders.map(p=><div key={p}>
            <label style={{fontSize:11,fontWeight:600,color:"var(--l)",display:"block",marginBottom:3}}>{p}</label>
            <input className="inp"value={fields[p]||""}onChange={e=>setFields(f=>({...f,[p]:e.target.value}))}placeholder={p}/>
          </div>)}
        </div>
      </div>}
      <div className="card"style={{marginBottom:14}}>
        <div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:10}}><IconeOuEmoji e="👁️"/> Aperçu</div>
        <div style={{whiteSpace:"pre-wrap",fontSize:13,lineHeight:1.7,color:"var(--b)",background:"var(--c)",borderRadius:10,padding:14,maxHeight:340,overflowY:"auto"}}>{texte}</div>
        {reste>0&&<div style={{fontSize:11,color:"var(--T)",marginTop:8}}>Les champs non remplis restent entre [crochets] dans le document.</div>}
      </div>
      <div style={{display:"flex",gap:8}}>
        <button className="btn bG"style={{flex:1}}onClick={()=>{navigator.clipboard?.writeText(texte).catch(()=>{});setToast("Copié ✓");}}><IconeOuEmoji e="📋"/> Copier le texte</button>
        <button className="btn bT"style={{flex:1}}onClick={genPDF}><IconeOuEmoji e="📥"/> Télécharger PDF</button>
      </div>
    </>}
  </div>;
}


//

export function Versements({enfants,role,pEId,user,demoMode=false}){
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
  const todayStr=isoJour(new Date());
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
    const hMens=heuresMensualisees(contrat);
    const tx=contrat.tauxHoraire||0;
    const joursSem=(contrat.jours&&contrat.jours.length)||5;
    const joursMois=Math.round(joursSem*semainesDuContrat(contrat)/12);
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
      {liste.map(e=><button key={e.id}onClick={()=>{setSelId(e.id);setShowForm(false);}}style={{padding:"6px 14px",borderRadius:10,border:"none",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:13,background:e.id===enfant?.id?"var(--accent)":"var(--c)",color:e.id===enfant?.id?"#fff":"var(--m)"}}>{e.prenom||"Enfant"}</button>)}
    </div>}

    {isDemo
      ? <div className="card"style={{textAlign:"center",color:"var(--m)",fontSize:13}}>Exemple — disponible dans l'application réelle.</div>
      : <div>
          {/* Coup d'oeil — total verse + statut en un regard (repere Pandi-Panda) */}
          <div className="card"style={{padding:0,marginBottom:14,overflow:"hidden"}}>
            <div style={{background:"linear-gradient(135deg,var(--Tp),var(--Gp))",padding:"16px 18px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
              <div style={{minWidth:0}}>
                <div style={{fontSize:11,fontWeight:700,color:"var(--T)",textTransform:"uppercase",letterSpacing:".5px",marginBottom:3}}>Total versé{enfant?.prenom?(" · "+enfant.prenom):""}</div>
                <div className="pf"style={{fontSize:28,fontWeight:800,color:"var(--b)",lineHeight:1.1}}>{fmtEur(totalVerse)}</div>
                {suivi.duMensuel>0&&<div style={{fontSize:11.5,fontWeight:700,marginTop:3,color:suivi.ecart>1?"var(--R)":"var(--S)"}}>{suivi.ecart>1?((role==="parent"?"Reste à verser : ":"Reste dû : ")+fmtEur(suivi.ecart)):"À jour ✓"}</div>}
              </div>
              {role==="parent"&&<button onClick={()=>setShowForm(s=>!s)}style={{flexShrink:0,padding:"10px 16px",borderRadius:10,border:"none",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:13,background:showForm?"#fff":"var(--accent)",color:showForm?"var(--m)":"#fff"}}>{showForm?"Annuler":"+ Ajouter un versement"}</button>}
            </div>
          </div>

          {/* #5 - Suivi du / verse (assmat: relance ; parent: enregistrer) */}
          {suivi.duMensuel>0&&<div className="card"style={{marginBottom:14}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6,flexWrap:"wrap",gap:8}}>
              <div style={{fontWeight:800,fontSize:14,color:"var(--b)"}}>{role==="parent"?"📊 Suivi de mes versements":"📊 Suivi dû / versé"}</div>
              <div style={{fontSize:12,fontWeight:700,color:suivi.ecart>1?"#C84B31":"#5DA9A1"}}>{suivi.ecart>1?((role==="parent"?"Reste à verser : ":"Reste dû : ")+fmtEur(suivi.ecart)):"À jour ✓"}</div>
            </div>
            <div style={{fontSize:11,color:"var(--l)",marginBottom:12,lineHeight:1.5}}>Mensualisation de référence : {fmtEur(suivi.duMensuel)}/mois (heures lissées × taux net + entretien estimé). Rapproché par mois de versement — hors heures complémentaires et régularisations.</div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {suivi.lignes.map(m=><div key={m.key}style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,padding:"8px 10px",borderRadius:8,background:m.statut==="impaye"?"#FDECEC":m.statut==="partiel"?"#FFF6E9":"var(--c)"}}>
                <div style={{minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:600,color:"var(--b)",display:"flex",alignItems:"center",gap:7}}>
                    <Pastille couleur={m.statut==="paye"?"var(--S)":m.statut==="partiel"?"var(--P)":"var(--R)"}/>{m.label}</div>
                  <div style={{fontSize:11,color:"var(--m)"}}>Dû {fmtEur(m.du)} · Versé {fmtEur(m.verse)}{m.ecart>1?(" · reste "+fmtEur(m.ecart)):""}</div>
                </div>
                {m.statut!=="paye"&&(role==="parent"
                  ? <button onClick={()=>prefillVersement(m)}style={{flexShrink:0,padding:"6px 12px",borderRadius:10,border:"none",cursor:"pointer",fontWeight:700,fontSize:12,background:"var(--accent)",color:"#fff"}}>+ Enregistrer</button>
                  : <button onClick={()=>relancer(m)}style={{flexShrink:0,padding:"6px 12px",borderRadius:10,border:"none",cursor:"pointer",fontWeight:700,fontSize:12,background:"var(--accent)",color:"#fff"}}>Relancer</button>)}
              </div>)}
            </div>
          </div>}

          {/* Formulaire de saisie */}
          {role==="parent"&&showForm&&<div className="card"style={{marginBottom:14}}>
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
            <button onClick={ajouterVersement}disabled={saving}style={{width:"100%",padding:"11px",borderRadius:10,border:"none",cursor:saving?"default":"pointer",fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:13,background:saving?"var(--c)":"var(--accent)",color:saving?"var(--m)":"#fff"}}>{saving?"Enregistrement…":"Enregistrer le versement"}</button>
          </div>}

          {/* Liste */}
          {loading
            ? <div style={{textAlign:"center",padding:20,color:"var(--l)",fontSize:13}}>Chargement…</div>
            : versements.length===0
              ? <div className="card"><EmptyState emoji="📭" titre="Aucun versement enregistré" texte="Les versements que vous saisissez apparaîtront ici, avec leur statut (à jour, en attente, impayé)."/></div>
              : <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {versements.map(v=><div key={v.id}className="card"style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div>
                      <div style={{fontWeight:700,fontSize:14,color:"var(--b)"}}>{fmtEur(v.montant)}</div>
                      <div style={{fontSize:12,color:"var(--m)",marginTop:2}}>{fmtDate(v.date)} · {VERSEMENT_MODES[v.mode]||v.mode}{v.periode?(" · "+v.periode):""}</div>
                      {v.note&&<div style={{fontSize:12,color:"var(--l)",marginTop:2,fontStyle:"italic"}}>{v.note}</div>}
                    </div>
                    {role==="parent"&&<div style={{display:"flex",gap:6,flexShrink:0}}>
                      <button onClick={()=>openEdit(v)}style={{padding:"6px 10px",borderRadius:10,border:"1.5px solid var(--br)",background:"#fff",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:12,color:"var(--m)"}}>Modifier</button>
                      <button onClick={()=>supprimerVersement(v.id)}style={{padding:"6px 10px",borderRadius:10,border:"1.5px solid #E3B7B2",background:"#fff",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:12,color:"#B5524A"}}>Supprimer</button>
                    </div>}
                  </div>)}
                </div>}
        </div>}

    {editId!==null&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9998,padding:16}}onClick={()=>{setEditId(null);resetForm();}}>
      <div className="card"style={{maxWidth:380,width:"100%",background:"#fff",maxHeight:"90vh",overflowY:"auto"}}onClick={e=>e.stopPropagation()}>
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
          <button onClick={()=>{setEditId(null);resetForm();}}style={{flex:1,padding:"11px",borderRadius:10,border:"1.5px solid var(--br)",background:"#fff",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:13,color:"var(--m)"}}>Annuler</button>
          <button onClick={modifierVersement}disabled={savingEdit}style={{flex:1,padding:"11px",borderRadius:10,border:"none",cursor:savingEdit?"default":"pointer",fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:13,background:savingEdit?"var(--c)":"var(--accent)",color:savingEdit?"var(--m)":"#fff"}}>{savingEdit?"Enregistrement…":"Enregistrer"}</button>
        </div>
      </div>
    </div>}

    {toast&&<div style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",background:"var(--b)",color:"#fff",padding:"11px 20px",borderRadius:12,fontSize:13,fontWeight:600,zIndex:9999,boxShadow:"0 4px 16px rgba(0,0,0,.2)"}}>{toast}</div>}
  </div>;
}

export function AdminFinances({enfants,role,pEId,user,pointagesDB,demoMode=false}){
  const proActif=estPro(user)||demoMode;
  const [section,setSection]=useState(demoMode?"bulletin":(role==="asmat"?(proActif?"facturation":"contrats"):((enfants.some(e=>e?.contrat?.partage_parent&&!e?.contrat?.signe_parent))?"signature_parent":"contrats")));
  useEffect(()=>{
    const h=(e)=>{ if(e.detail==="nouveau_bulletin"){ setSection("bulletin"); window.scrollTo({top:0,behavior:"smooth"}); } };
    window.addEventListener("timat:action",h); return()=>window.removeEventListener("timat:action",h);
  },[]);
  const [contratTab,setContratTab]=useState("contrats");
  const sousOnglets=role==="asmat"
    ?[
      // Facturation et bulletins sont le coeur du forfait Pro : les onglets
      // disparaissent pour une gratuite plutot que de s'ouvrir sur un refus.
      ...(proActif?[
        {id:"facturation",l:"Facturation & Pajemploi",ic:"🧾"},
        {id:"bulletin",l:"Bulletin de salaire",ic:"📜"},
      ]:[]),
      {id:"versements",l:"Versements reçus",ic:"💶"},
      {id:"frais_km",l:"Frais kilométriques",ic:"🚗"},
      ...(proActif?[{id:"recap_fiscal",l:"Récap fiscal",ic:"📋"}]:[]),
      {id:"contrats",l:"Contrats & Avenants",ic:"📄"},
      {id:"contrats_types",l:"Modeles & Templates",ic:"📋"},
      ...(proActif?[{id:"courriers",l:"Courriers types",ic:"✉️"}]:[]),
    ]
    :[
      ...((enfants.some(e=>e?.contrat?.partage_parent)) ? [{id:"signature_parent",l:"Mon contrat & Signature",ic:"📄"}] : [] ),
      {id:"versements",l:"Mes versements",ic:"💶"},
    ];
  const GROUPES_FIN=[
    {id:"paie",l:"Paie",ic:"💶",tabs:["facturation","bulletin","versements","frais_km","recap_fiscal"]},
    {id:"contrats",l:"Contrats",ic:"📄",tabs:["contrats","contrats_types","courriers"]},
  ];
  const groupeActif=GROUPES_FIN.find(g=>g.tabs.includes(section))||GROUPES_FIN[0];
  const choisirGroupe=(gid)=>{const grp=GROUPES_FIN.find(x=>x.id===gid);if(grp&&!grp.tabs.includes(section))setSection(grp.tabs[0]);};
  if(demoMode){
    const demoUnlockedSection="bulletin";
    return <div className="fi">
      <div style={{display:"flex",gap:4,marginBottom:16,borderBottom:"2px solid var(--br)",overflowX:"auto",scrollbarWidth:"none"}}>
        {sousOnglets.map(s=>{const unlocked=s.id===demoUnlockedSection;return <button key={s.id}onClick={()=>setSection(s.id)}style={{padding:"8px 16px",border:"none",background:"none",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontWeight:600,fontSize:13,flexShrink:0,whiteSpace:"nowrap",color:section===s.id?"var(--accent)":(unlocked?"var(--b)":"var(--l)"),borderBottom:section===s.id?"2.5px solid var(--accent)":"2.5px solid transparent",marginBottom:-2,transition:"all .15s",display:"flex",alignItems:"center",gap:6,opacity:unlocked?1:.7}}><IconeOuEmoji e={s.ic}/><span>{s.l}</span>{!unlocked&&<span >🔒</span>}</button>;})}
      </div>
      {section==="bulletin"
        ? <div>
            <div className="card"style={{maxWidth:420,margin:"0 auto"}}>
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
              <div style={{display:"flex",justifyContent:"space-between",borderTop:"2px solid var(--br)",paddingTop:12,fontSize:15}}><span style={{fontWeight:700,color:"var(--b)"}}>Net à payer</span><span style={{fontWeight:800,color:"var(--T)"}}>731,75 €</span></div>
              <div style={{display:"flex",gap:8,marginTop:16}}>
                <div style={{flex:1,textAlign:"center",padding:"9px",borderRadius:10,background:"var(--c)",fontSize:12,fontWeight:700,color:"var(--m)"}}><IconeOuEmoji e="📄"/> Aperçu PDF</div>
                <div style={{flex:1,textAlign:"center",padding:"9px",borderRadius:10,background:"var(--c)",fontSize:12,fontWeight:700,color:"var(--m)"}}><IconeOuEmoji e="⬇️"/> Télécharger</div>
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
    {role==="asmat"?<>
      <div style={{display:"flex",gap:6,marginBottom:12}}>
        {GROUPES_FIN.map(g=><button key={g.id} onClick={()=>choisirGroupe(g.id)} style={{padding:"9px 22px",borderRadius:12,border:"1.5px solid",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"'DM Sans',sans-serif",background:groupeActif.id===g.id?"var(--accent)":"#fff",color:groupeActif.id===g.id?"#fff":"var(--accent)",borderColor:groupeActif.id===g.id?"var(--accent)":"var(--accent-pale)"}}><IconeOuEmoji e={g.ic}/> {g.l}</button>)}
      </div>
      <div style={{display:"flex",gap:4,marginBottom:16,borderBottom:"2px solid var(--br)",overflowX:"auto",scrollbarWidth:"none"}}>
        {sousOnglets.filter(s=>groupeActif.tabs.includes(s.id)).map(s=><button key={s.id}onClick={()=>setSection(s.id)}style={{
          padding:"8px 16px",border:"none",background:"none",cursor:"pointer",
          fontFamily:"'DM Sans',sans-serif",fontWeight:600,fontSize:13,flexShrink:0,whiteSpace:"nowrap",
          color:section===s.id?"var(--accent)":"var(--b)",
          borderBottom:section===s.id?"2.5px solid var(--accent)":"2.5px solid transparent",
          marginBottom:-2,transition:"all .15s",display:"flex",alignItems:"center",gap:6
        }}><IconeOuEmoji e={s.ic}/><span>{s.l}</span></button>)}
      </div>
    </>:<div style={{display:"flex",gap:4,marginBottom:16,borderBottom:"2px solid var(--br)",overflowX:"auto",scrollbarWidth:"none"}}>
      {sousOnglets.map(s=><button key={s.id}onClick={()=>setSection(s.id)}style={{
        padding:"8px 16px",border:"none",background:"none",cursor:"pointer",
        fontFamily:"'DM Sans',sans-serif",fontWeight:600,fontSize:13,flexShrink:0,whiteSpace:"nowrap",
        color:section===s.id?"var(--accent)":"var(--b)",
        borderBottom:section===s.id?"2.5px solid var(--accent)":"2.5px solid transparent",
        marginBottom:-2,transition:"all .15s",display:"flex",alignItems:"center",gap:6
      }}><IconeOuEmoji e={s.ic}/><span>{s.l}</span></button>)}
    </div>}
    {section==="facturation"&&(proActif
      ?<Facturation enfants={enfants}role={role}pEId={pEId}user={user}pointagesDB={pointagesDB}/>
      :<VerrouPro titre="La facturation et la déclaration Pajemploi" desc="Le récapitulatif mensuel et l'export Pajemploi préparent votre déclaration à partir de vos présences réelles. Ils font partie du forfait Pro."/>)}
    {section==="bulletin"&&(proActif
      ?<BulletinSalaire enfants={enfants}role={role}pEId={pEId}user={user}/>
      :<VerrouPro titre="Les bulletins de salaire" desc="Salaire mensualisé, heures complémentaires, congés payés et indemnités, réunis sur un bulletin conforme à la convention collective. Cette fonction fait partie du forfait Pro."/>)}
    {section==="versements"&&<Versements enfants={enfants}role={role}pEId={pEId}user={user}/>}
    {section==="frais_km"&&<IndemnitesKilometriques enfants={enfants} role={role} user={user}/>}
    {section==="recap_fiscal"&&(proActif
      ?<RecapFiscalAssmat enfants={enfants} user={user}/>
      :<VerrouPro titre="Le récapitulatif fiscal" desc="Le montant à reporter sur votre déclaration, après abattement. Cette fonction fait partie du forfait Pro."/>)}
    {section==="contrats"&&<div>
      <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
        {[{id:"contrats",l:"📄 Contrats & avenants"},{id:"solde",l:"🏁 Fin de contrat"}].map(t=>
          <button key={t.id}onClick={()=>setContratTab(t.id)}style={{padding:"6px 14px",borderRadius:20,border:"1.5px solid",cursor:"pointer",fontSize:12,fontWeight:600,background:contratTab===t.id?"var(--accent)":"transparent",color:contratTab===t.id?"#fff":"var(--m)",borderColor:contratTab===t.id?"var(--accent)":"var(--br)"}}>{t.l}</button>)}
      </div>
      {contratTab==="contrats"?<div>
        <Contrats enfants={enfants}role={role}pEId={pEId}user={user}/>
        <div style={{marginTop:24,borderTop:"2px solid var(--br)",paddingTop:20}}>
          <DemandesAvenants enfants={enfants}role={role}pEId={pEId}/>
        </div>
      </div>:(proActif
        ?<SoldeDeCompte enfants={enfants}role={role}pEId={pEId}user={user}/>
        :<VerrouPro titre="La fin de contrat" desc="Indemnité compensatrice de congés payés, préavis et reçu pour solde de tout compte. Cette fonction fait partie du forfait Pro."/>)}
    </div>}
    {section==="contrats_types"&&<ContratsTypes enfants={enfants}role={role}/>}
    {section==="courriers"&&(proActif
      ?<CourriersTypes enfants={enfants}role={role}pEId={pEId}user={user}/>
      :<VerrouPro titre="Les courriers types" desc="Modèles de courriers conformes à la convention collective, prêts à personnaliser. Cette fonction fait partie du forfait Pro."/>)}
    {section==="signature_parent"&&(enfants.some(e=>e?.contrat?.partage_parent)?<SignatureContratParent enfants={enfants}pEId={pEId}user={user}/>:<div className="card" style={{textAlign:"center"}}><div style={{fontSize:28,marginBottom:8}}>⏳</div><div style={{fontWeight:700,color:"var(--b)"}}>Contrat pas encore disponible</div><div style={{fontSize:12.5,color:"var(--m)",marginTop:4}}>Votre assistante maternelle ne l'a pas encore partagé. Vous serez prévenu(e) par e-mail dès qu'il sera prêt à signer.</div></div>)}
  </div>;
}

//

export function IndemnitesJournalieres({contrat,role,onSaved,onErr}){
  const repasEnregistre=contrat?.repasFourniPar??contrat?.repas_fourni_par??null;
  const repasMontantEnr=Number(contrat?.repas)||0;
  const entretienEnr=Number(contrat?.entretien)||0;
  const heuresJour=Math.round(((Number(contrat?.heuresHebdo)||0)/((contrat?.jours?.length)||5))*10)/10;

  const [qui,setQui]=useState(repasEnregistre);
  const [repas,setRepas]=useState(repasMontantEnr);
  const [entretien,setEntretien]=useState(entretienEnr);
  const [busy,setBusy]=useState(false);
  const lecture=role!=="asmat";
  const signe=!!(contrat?.signe_asmat||contrat?.signe_parent);
  useEffect(()=>{setQui(repasEnregistre);setRepas(repasMontantEnr);setEntretien(entretienEnr);},
    [contrat?.id,repasEnregistre,repasMontantEnr,entretienEnr]);

  // Le minimum d'entretien depend de la duree de la journee d'accueil : 0,435 EUR
  // par heure, jamais moins de 2,65 EUR par journee.
  const miniEntretien=indemniteEntretienMin(heuresJour||9);
  const sousMini=entretien>0&&entretien<miniEntretien;

  const modifie=qui!==repasEnregistre
    ||(qui!=="employeur"&&Number(repas)!==repasMontantEnr)
    ||Number(entretien)!==entretienEnr;
  // Aligner une indemnite sur le minimum legal est automatique : la convention
  // le prevoit, aucun avenant n'est necessaire. Toute AUTRE modification touche
  // a la remuneration convenue et demande un avenant signe des deux cotes.
  const simpleAlignement=qui===repasEnregistre
    &&(qui==="employeur"||Number(repas)===repasMontantEnr)
    &&Number(entretien)>entretienEnr&&Number(entretien)<=miniEntretien;

  const enregistrer=async()=>{
    if(!contrat?.id)return;
    setBusy(true);
    const m=qui==="employeur"?0:Math.max(0,Number(repas)||0);
    const maj={entretien:Math.max(0,Number(entretien)||0),repas:m};
    if(qui)maj.repas_fourni_par=qui;
    const{error}=await supabase.from("contrats").update(maj).eq("id",contrat.id);
    setBusy(false);
    if(error){onErr?.("Erreur : "+error.message);return;}
    onSaved?.();
  };
  const annuler=()=>{setQui(repasEnregistre);setRepas(repasMontantEnr);setEntretien(entretienEnr);};

  return <div className="card" style={{marginBottom:12}}>
    <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:4}}><IconeOuEmoji e="🧺"/> Indemnités journalières</div>
    <div style={{fontSize:12,color:"var(--m)",lineHeight:1.55,marginBottom:12}}>
      Elles ne sont pas du salaire : elles remboursent des frais, ne supportent pas de cotisations,
      et se déclarent sur leur propre ligne dans Pajemploi.
    </div>

    {lecture
      ?<div style={{fontSize:13,color:"var(--b)",lineHeight:1.8}}>
        <div><b>Entretien</b> : {nb2(entretienEnr)} € par journée d'accueil</div>
        <div><b>Repas</b> : {repasEnregistre?(REPAS_CHOIX.find(c=>c[0]===repasEnregistre)||[])[1]:"non encore convenu"}
          {repasEnregistre!=="employeur"&&repasMontantEnr>0?" — "+nb2(repasMontantEnr)+" € par journée":""}</div>
      </div>
      :<>
      <label className="lbl">Indemnité d'entretien (€ par journée d'accueil)</label>
      <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
        <input type="number" min="0" step="0.05" className="inp" style={{maxWidth:130}}
          value={entretien} onChange={e=>setEntretien(Math.max(0,parseFloat(e.target.value)||0))}/>
        <span style={{fontSize:12,color:"var(--m)"}}>
          minimum {nb2(miniEntretien)} € pour une journée de {heuresJour||9} h
        </span>
      </div>
      {sousMini&&<div style={{fontSize:11.5,color:"var(--R)",marginTop:8,lineHeight:1.5}}>
        <IconeOuEmoji e="⚠️" taille={13}/> Sous le minimum conventionnel : {nb2(miniEntretien)} € pour
        une journée de {heuresJour||9} h (0,435 € l'heure, jamais moins de 2,65 € par journée).
      </div>}

      <div style={{fontWeight:700,fontSize:13,color:"var(--b)",margin:"16px 0 6px"}}>Qui fournit les repas</div>
      <div style={{fontSize:11.5,color:"var(--m)",marginBottom:9,lineHeight:1.5}}>
        La convention laisse les deux parties en décider ensemble, et demande que le choix figure au contrat.
      </div>
      {!repasEnregistre&&<div style={{fontSize:11.5,color:"var(--R)",marginBottom:10,lineHeight:1.5}}>
        <IconeOuEmoji e="⚠️" taille={13}/> Ce n'est pas encore convenu : le contrat imprime une ligne à compléter à la main.
      </div>}
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {REPAS_CHOIX.map(([v,l,d])=>{
          const on=qui===v;
          return <button key={v} type="button" disabled={busy} onClick={()=>setQui(v)}
            style={{flex:"1 1 130px",textAlign:"left",padding:"9px 11px",borderRadius:10,cursor:busy?"wait":"pointer",fontFamily:"inherit",
              border:"1.5px solid "+(on?"var(--accent)":"var(--br)"),background:on?"var(--accent-pale)":"var(--w)"}}>
            <span style={{display:"block",fontSize:12.5,fontWeight:700,color:on?"var(--accent)":"var(--b)"}}>{l}</span>
            <span style={{display:"block",fontSize:11,color:"var(--m)",marginTop:2,lineHeight:1.4}}>{d}</span>
          </button>;
        })}
      </div>
      {qui&&qui!=="employeur"&&<div style={{marginTop:12}}>
        <label className="lbl">Indemnité de repas (€ par journée d'accueil)</label>
        <input type="number" min="0" step="0.05" className="inp" style={{maxWidth:130}}
          value={repas} onChange={e=>setRepas(Math.max(0,parseFloat(e.target.value)||0))}/>
        <div style={{fontSize:11,color:"var(--l)",marginTop:6,lineHeight:1.5}}>
          Elle ne peut pas descendre sous le minimum conventionnel. La nature des repas convenue se précise sur le contrat imprimé.
        </div>
      </div>}

      {modifie&&<div style={{marginTop:14,padding:"11px 13px",background:signe&&!simpleAlignement?"var(--Rp)":"var(--Gp)",
        border:"1px solid "+(signe&&!simpleAlignement?"var(--R)":"var(--G)"),borderRadius:10}}>
        <div style={{fontSize:12.5,color:signe&&!simpleAlignement?"var(--R)":"var(--b)",lineHeight:1.55,marginBottom:9}}>
          {!signe
            ? "Le contrat n'est pas encore signé : la modification s'applique directement."
            : simpleAlignement
              ? <>Il s'agit d'un alignement sur le minimum conventionnel : la revalorisation est <b>automatique</b>, aucun avenant n'est nécessaire.</>
              : <><IconeOuEmoji e="⚠️" taille={13}/> Ce contrat est signé. Modifier une indemnité convenue touche à la rémunération : cela demande un <b>avenant signé des deux côtés</b>. Enregistrer ici met à jour l'application, mais ne remplace pas l'accord du parent employeur.</>}
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <button className="btn bS s" disabled={busy} onClick={enregistrer}>{busy?"…":"Enregistrer"}</button>
          <button className="btn s" disabled={busy} onClick={annuler}>Annuler</button>
        </div>
      </div>}
    </>}
  </div>;
}

export function RythmeAccueil({contrat,role,onSaved,onErr}){
  const enregistre=estAnneeComplete(contrat);
  const semainesEnregistrees=Number(contrat?.semainesAccueil??contrat?.semaines_accueil)||SEMAINES_MAX_ANNEE_INCOMPLETE;
  // Le bouton suivait la valeur ENREGISTREE, pas le clic : appuyer sur
  // « annee incomplete » ouvrait le champ des semaines mais laissait la
  // selection sur « annee complete ». On tient donc un choix local, qui suit le
  // clic tout de suite, et un bouton d'enregistrement quand il differe.
  const [choix,setChoix]=useState(enregistre);
  const [semaines,setSemaines]=useState(semainesEnregistrees);
  const [busy,setBusy]=useState(false);
  const signe=!!(contrat?.signe_asmat||contrat?.signe_parent);
  const lecture=role!=="asmat";
  useEffect(()=>{setChoix(enregistre);setSemaines(semainesEnregistrees);},[contrat?.id,enregistre,semainesEnregistrees]);

  const modifie=choix!==enregistre||(!choix&&semaines!==semainesEnregistrees);
  const apercu={...contrat,anneeComplete:choix,semainesAccueil:choix?undefined:semaines};

  const enregistrer=async()=>{
    if(!contrat?.id)return;
    setBusy(true);
    const nb=choix?null:Math.min(SEMAINES_MAX_ANNEE_INCOMPLETE,Math.max(1,Number(semaines)||SEMAINES_MAX_ANNEE_INCOMPLETE));
    const{error}=await supabase.from("contrats").update({annee_complete:choix,semaines_accueil:nb}).eq("id",contrat.id);
    setBusy(false);
    if(error){onErr?.("Erreur : "+error.message);return;}
    onSaved?.();
  };

  return <div className="card" style={{marginBottom:12}}>
    <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:4}}><IconeOuEmoji e="🗓️"/> Rythme d'accueil</div>
    <div style={{fontSize:12,color:"var(--m)",lineHeight:1.55,marginBottom:12}}>
      C'est lui qui fixe le salaire mensualisé : <b style={{color:"var(--b)"}}>{nb2(salaireMensualise(contrat))} €</b>
      {" "}({heuresMensualisees(contrat)} h/mois sur {semainesDuContrat(contrat)} semaines).
    </div>
    {lecture
      ?<div style={{fontSize:13,fontWeight:600,color:"var(--b)"}}>{enregistre?"Année complète — 52 semaines, congés inclus dans le salaire":"Année incomplète — "+semainesDuContrat(contrat)+" semaines, congés payés versés à part"}</div>
      :<>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {[[true,"Année complète","52 semaines, congés inclus dans le salaire"],
          [false,"Année incomplète","semaines programmées, congés payés à part"]].map(([v,l,d])=>{
          const on=choix===v;
          return <button key={String(v)} type="button" disabled={busy} onClick={()=>setChoix(v)}
            style={{flex:"1 1 150px",textAlign:"left",padding:"9px 11px",borderRadius:10,cursor:busy?"wait":"pointer",fontFamily:"inherit",
              border:"1.5px solid "+(on?"var(--accent)":"var(--br)"),background:on?"var(--accent-pale)":"var(--w)"}}>
            <span style={{display:"block",fontSize:12.5,fontWeight:700,color:on?"var(--accent)":"var(--b)"}}>{l}</span>
            <span style={{display:"block",fontSize:11,color:"var(--m)",marginTop:2,lineHeight:1.4}}>{d}</span>
          </button>;
        })}
      </div>
      {!choix&&<div style={{marginTop:12}}>
        <label className="lbl">Semaines d'accueil dans l'année</label>
        <input type="number" min="1" max={SEMAINES_MAX_ANNEE_INCOMPLETE} step="1" className="inp" style={{maxWidth:120}}
          value={semaines} onChange={e=>setSemaines(Math.min(SEMAINES_MAX_ANNEE_INCOMPLETE,Math.max(1,parseFloat(e.target.value)||SEMAINES_MAX_ANNEE_INCOMPLETE)))}/>
        <div style={{fontSize:11,color:"var(--l)",marginTop:6,lineHeight:1.5}}>
          Ce nombre découle du calendrier convenu, pas d'un montant souhaité : comptez les semaines où l'enfant vous sera confié.
        </div>
      </div>}
      {modifie&&<div style={{marginTop:12,padding:"11px 13px",background:"var(--Gp)",border:"1px solid var(--G)",borderRadius:10}}>
        <div style={{fontSize:12.5,color:"var(--b)",lineHeight:1.55,marginBottom:9}}>
          Nouveau salaire mensualisé : <b>{nb2(salaireMensualise(apercu))} €</b>
          {" "}({heuresMensualisees(apercu)} h/mois sur {semainesDuContrat(apercu)} semaines),
          {" "}au lieu de {nb2(salaireMensualise(contrat))} €.
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <button className="btn bS s" disabled={busy} onClick={enregistrer}>{busy?"…":"Enregistrer ce rythme"}</button>
          <button className="btn s" disabled={busy} onClick={()=>{setChoix(enregistre);setSemaines(semainesEnregistrees);}}>Annuler</button>
        </div>
      </div>}
      {signe&&<div style={{fontSize:11.5,color:"var(--R)",marginTop:10,lineHeight:1.5}}>
        <IconeOuEmoji e="⚠️" taille={13}/> Ce contrat est déjà signé : modifier le rythme change le salaire, cela demande un <b>avenant</b> signé des deux côtés.
      </div>}
    </>}
  </div>;
}

//
// OUVRIR UN DOCUMENT RANGE DANS LE STOCKAGE (URL signee 1 h).
// Le contrat avait son bouton, le bulletin non : une fois envoye, l'application
// annoncait « disponible dans Documents » et laissait l'utilisatrice aller le
// chercher ailleurs. Un seul composant sert les deux, pour qu'ils ne divergent
// pas comme les vocabulaires de couleur l'ont fait.

export function BoutonPdfStocke({path,onErr,compact=false,label="Ouvrir le document (PDF)",icone="📄",erreur="❌ Document indisponible (droits d'accès) — réessayez plus tard."}){
  const [busy,setBusy]=useState(false);
  if(!path)return null;
  const ouvrir=async()=>{
    setBusy(true);
    try{
      const{data,error}=await supabase.storage.from("documents").createSignedUrl(path,3600);
      if(error||!data?.signedUrl)onErr?.(erreur);
      else window.open(data.signedUrl+(data.signedUrl.includes("?")?"&":"?")+"t="+Date.now(),"_blank","noopener");
    }catch(e){onErr?.(erreur);}
    setBusy(false);
  };
  return <button className="btn bT" onClick={ouvrir} disabled={busy}
    style={{fontSize:compact?12:13,padding:compact?"7px 14px":"9px 18px",display:"inline-flex",alignItems:"center",gap:6,opacity:busy?0.6:1}}>
    <IconeOuEmoji e={icone}/> {busy?"Ouverture…":label}
  </button>;
}

export function BoutonContratPdf({contrat,onErr,compact=false,label="Ouvrir mon contrat (PDF)"}){
  return <BoutonPdfStocke path={contrat?.pdf_storage_path} onErr={onErr} compact={compact} label={label}
    erreur="❌ Contrat indisponible (droits d'accès) — réessayez après signature ou contactez votre assistante maternelle."/>;
}

export function SignatureContratParent({enfants,pEId,user}){
  // MULTI-ENFANTS - ne montrer que les enfants dont le contrat est partage par l'assmat.
  // Le parent bascule entre eux via un selecteur (affiche seulement s'il y en a plusieurs).
  const enfantsPartages=enfants.filter(e=>e?.contrat?.partage_parent);
  // enfant initial : celui selectionne dans l'app s'il a un contrat partage, sinon le premier partage
  const initId=enfantsPartages.find(e=>e.id===pEId)?.id||enfantsPartages[0]?.id;
  const [selEnfId,setSelEnfId]=useState(initId);
  useEffect(()=>{ if(!enfantsPartages.find(e=>e.id===selEnfId)&&enfantsPartages[0])setSelEnfId(enfantsPartages[0].id); },[enfants]);
  const enfant=enfantsPartages.find(e=>e.id===selEnfId)||enfantsPartages[0];
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
  // SIGNATURE PARENT P10 - sync avec le contrat reel quand il change (ou changement d'enfant)
  useEffect(()=>{
    setSigne(!!contrat.signe_parent);
    setDateSignature(contrat.date_signature_parent||null);
    setLu(false);
    setHasSig(false);
  },[contrat.signe_parent,contrat.date_signature_parent,selEnfId]);

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
    // PDF CONTRAT COMBINE P11 - regenerer le PDF avec les 2 signatures (asmat + parent).
    // On ATTEND la fin pour que le telechargement immediat contienne bien la signature.
    setToast("Enregistrement de votre signature…");
    try{
      const r=await generateAndStoreContratPDF(contrat.id);
      if(!r.success)console.log("PDF gen warn:",r.error);
    }catch(e){console.log("PDF gen err:",e?.message);}
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
    {toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
    <div style={{fontSize:60,marginBottom:16}}>✅</div>
    <div className="pf"style={{fontSize:22,fontWeight:600,color:"var(--S)",marginBottom:8}}>Contrat signé !</div>
    <div style={{fontSize:13,color:"var(--m)",lineHeight:1.7}}>
      Votre signature électronique a été enregistrée.<br/>
      L'assistante maternelle a été notifiée. Le contrat signé est disponible dans Documents.
      {dateSignature&&<><br/><span style={{fontSize:11,color:"var(--l)",marginTop:4,display:"inline-block"}}>Le {fmt(dateSignature.slice(0,10))} - Conforme eIDAS</span></>}
    </div>
    <div style={{marginTop:20}}>
      <BoutonContratPdf contrat={contrat} onErr={(m)=>setToast(m)}/>
    </div>
  </div>;

  return <div className="fi">
    {toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
    <PageHeader icon="✍️" title="Signer mon contrat"
      sub="Signature électronique conforme eIDAS - valeur légale"/>
    {enfantsPartages.length>1&&<div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
      {enfantsPartages.map(e=><button key={e.id} onClick={()=>setSelEnfId(e.id)}
        style={{border:selEnfId===e.id?"2px solid var(--P)":"1px solid var(--br)",background:selEnfId===e.id?"var(--Pp)":"#fff",borderRadius:20,padding:"7px 14px",fontSize:13,fontWeight:selEnfId===e.id?700:600,color:selEnfId===e.id?"var(--P)":"var(--m)",cursor:"pointer",display:"inline-flex",alignItems:"center",gap:6}}>
        <span>{e.emoji||"👶"}</span>{e.prenom||"Enfant"}
        {e.contrat?.signe_parent&&<span >✓</span>}
      </button>)}
    </div>}
    <div style={{display:"flex",gap:10,alignItems:"flex-start",padding:"11px 14px",background:"var(--Bp)",border:"1px solid rgba(46,74,90,.25)",borderRadius:12,marginBottom:14,fontSize:12.5,color:"var(--B)",lineHeight:1.5}}>
      <IconeOuEmoji e="📄"/>
      <span>Votre contrat (et ses bulletins de salaire) est toujours accessible dans <b>Administratif → Documents & Attestations</b>. Une fois signé, le PDF y apparaît automatiquement.</span>
    </div>

    {/* Coup d'oeil contrat — a signer, essentiel en un regard (repere Pandi-Panda) */}
    <div className="card"style={{padding:0,marginBottom:16,overflow:"hidden"}}>
      <div style={{background:"linear-gradient(135deg,var(--Tp),var(--Sp))",padding:"16px 18px"}}>
        <div style={{fontSize:11,fontWeight:700,color:"var(--T)",textTransform:"uppercase",letterSpacing:".5px",marginBottom:3}}>Contrat d'accueil · {enfant?.prenom}</div>
        <div className="pf"style={{fontSize:21,fontWeight:800,color:"var(--b)",lineHeight:1.15}}><IconeOuEmoji e="✍️" taille={21}/> À signer</div>
        <div style={{fontSize:11,color:"var(--m)",marginTop:3}}>Début {fmt(contrat.debut||"")} · {nbf((contrat.tauxHoraire||0),2)} €/h · {contrat.signe_asmat?"l'assistante maternelle a signé ✓":"en attente de la signature de l'assmat"}</div>
      </div>
    </div>

    {/* Récap contrat */}
    <div className="card"style={{marginBottom:16}}>
      <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:12}}><IconeOuEmoji e="📄"/> Détail du contrat</div>
      {[
        ["Enfant",(enfant?.prenom||"-")+" "+(enfant?.nom||"")],
        ["Début du contrat",fmt(contrat.debut||"")],
        ["Jours d'accueil",(contrat.jours||[]).join(", ")],
        ["Horaires",contrat.horaires||"-"],
        ["Taux horaire brut",nbf((contrat.tauxHoraire||0),2)+"€/h"],
        ["Indemnité entretien",nbf((contrat.entretien||0),2)+"€/jour"],
        ["Statut signature asmat",contrat.signe_asmat?"✅ Signé le "+(contrat.date_signature_asmat?fmt(contrat.date_signature_asmat.slice(0,10)):"-"):"⏳ En attente"],
      ].map(([l,v])=><div key={l}style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid var(--br)",fontSize:13}}>
        <span style={{color:"var(--l)"}}>{l}</span>
        <span style={{fontWeight:600,color:"var(--b)"}}>{v}</span>
      </div>)}
      {contrat.pdf_storage_path&&<div style={{marginTop:12,textAlign:"center"}}>
        <BoutonContratPdf contrat={contrat} onErr={(m)=>setToast(m)} compact label="Voir le contrat (PDF)"/>
      </div>}
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
    <div className="card"style={{marginBottom:16}}>
      <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:4}}><IconeOuEmoji e="✍️"/> Votre signature</div>
      <div style={{fontSize:12,color:"var(--l)",marginBottom:12}}>Signez ci-dessous avec votre doigt (mobile) ou la souris</div>
      <canvas ref={canvasRef}width={400}height={120}
        style={{width:"100%",height:120,border:"2px dashed var(--br)",borderRadius:10,
          cursor:"crosshair",background:"#FDFAF6",touchAction:"none"}}
        onMouseDown={startDraw}onMouseMove={draw}onMouseUp={endDraw}onMouseLeave={endDraw}
        onTouchStart={startDraw}onTouchMove={draw}onTouchEnd={endDraw}onTouchCancel={endDraw}/>
      {/* SIGNATURE PARENT P10 - bouton signature standard si parent en a une */}
      {sigStandard&&<div style={{marginTop:8}}>
        <button className="btn bG s" style={{width:"100%",justifyContent:"center"}} onClick={useStandardSig}>
          <IconeOuEmoji e="📋"/> Utiliser ma signature enregistrée
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
    <button className="btn bS"style={{width:"100%",justifyContent:"center",padding:"13px",
      opacity:lu&&hasSig?1:.5}}
      onClick={valider}disabled={!lu||!hasSig}>
      <IconeOuEmoji e="✅"/> Valider et signer le contrat
    </button>
    <div style={{textAlign:"center",fontSize:11,color:"var(--l)",marginTop:8}}>
      <IconeOuEmoji e="🔒"/> Signature électronique conforme eIDAS - Valeur légale identique au papier
    </div>
  </div>;
}

//

export function RecapFiscalAssmat({enfants,user}){
  const yNow=new Date().getFullYear();
  const [annee,setAnnee]=useState(yNow-1); // on declare l'annee N-1
  const [bulletins,setBulletins]=useState([]);
  const [joursParEnfant,setJoursParEnfant]=useState({}); // {enfantId:[heures par journee]}
  const [aeeh,setAeeh]=useState({});
  const [loading,setLoading]=useState(true);
  const demo=user?.id?.startsWith?.("demo-")||user?.isDemo;
  const prenomMap={};(enfants||[]).forEach(e=>{prenomMap[e.id]=e.prenom||"Enfant";});

  useEffect(()=>{
    if(demo){
      setBulletins([{enfant_id:"e1",net_imposable:9800,entretien:760,jours_travailles:210}]);
      setJoursParEnfant({e1:Array(190).fill(9).concat(Array(20).fill(6))});
      setLoading(false);return;
    }
    if(!user?.id){setLoading(false);return;}
    let cancelled=false;setLoading(true);
    (async()=>{
      const{data:bs}=await supabase.from("bulletins")
        .select("enfant_id,mois,net_imposable,entretien,jours_travailles")
        .eq("asmat_id",user.id).eq("annee",annee);
      if(cancelled)return;
      setBulletins(bs||[]);
      const ids=Array.from(new Set([...(enfants||[]).map(e=>e.id),...(bs||[]).map(b=>b.enfant_id)]));
      const map={};
      if(ids.length){
        const{data:pts}=await supabase.from("pointages")
          .select("enfant_id,total_minutes,date")
          .in("enfant_id",ids).gte("date",annee+"-01-01").lte("date",annee+"-12-31");
        const byEnfDate={};
        (pts||[]).forEach(p=>{if((p.total_minutes||0)>0){const k=p.enfant_id+"|"+p.date;byEnfDate[k]=(byEnfDate[k]||0)+p.total_minutes;}});
        // On garde la date de chaque journee : le SMIC a change en cours d'annee 2026,
        // donc l'abattement ne peut pas etre calcule avec une valeur unique.
        Object.entries(byEnfDate).forEach(([k,min])=>{const[eid,date]=k.split("|");(map[eid]=map[eid]||[]).push({date,h:min/60});});
      }
      if(cancelled)return;
      setJoursParEnfant(map);setLoading(false);
    })();
    return()=>{cancelled=true;};
  },[annee,user?.id,demo,(enfants||[]).map(e=>e.id).join(",")]);

  // Agregation par enfant (recalcule a chaque toggle AEEH)
  const lignes=useMemo(()=>{
    const ids=Array.from(new Set([...bulletins.map(b=>b.enfant_id),...Object.keys(joursParEnfant)]));
    return ids.map(eid=>{
      const bs=bulletins.filter(b=>b.enfant_id===eid);
      const salaireImp=Math.round(bs.reduce((s,b)=>s+(Number(b.net_imposable)||0),0)*100)/100;
      const entretienTot=Math.round(bs.reduce((s,b)=>s+(Number(b.entretien)||0),0)*100)/100;
      const moisCouverts=new Set(bs.map(b=>b.mois)).size;
      const baseMult=aeeh[eid]?4:3;
      const jh=joursParEnfant[eid]||[];
      let abatt=0,jPlein=0,jPart=0,jNuit=0;
      jh.forEach(({date,h})=>{const smic=smicHoraireAu(date);if(h>=23.5){jNuit++;abatt+=(baseMult+1)*smic;}else if(h>=8){jPlein++;abatt+=baseMult*smic;}else{jPart++;abatt+=(baseMult*smic/8)*h;}});
      const baseImposable=salaireImp+entretienTot;
      // Même plafond légal que sur le bulletin.
      abatt=Math.min(Math.round(abatt*100)/100,Math.round(baseImposable*100)/100);
      const netApres=Math.max(0,Math.round((baseImposable-abatt)*100)/100);
      return{eid,prenom:prenomMap[eid]||"Enfant",salaireImp,entretienTot,baseImposable,abatt,netApres,moisCouverts,jours:jh.length,jPlein,jPart,jNuit};
    });
  },[bulletins,joursParEnfant,aeeh]);

  const totalNet=Math.round(lignes.reduce((s,l)=>s+l.netApres,0)*100)/100;
  const totalAbatt=Math.round(lignes.reduce((s,l)=>s+l.abatt,0)*100)/100;
  const totalBase=Math.round(lignes.reduce((s,l)=>s+l.baseImposable,0)*100)/100;
  const moisManquants=lignes.some(l=>l.moisCouverts>0&&l.moisCouverts<12);
  const eur=n=>n.toLocaleString("fr-FR",{minimumFractionDigits:2,maximumFractionDigits:2})+" €";

  const imprimer=()=>{
    const w=window.open("","_blank");if(!w)return;
    const rows=lignes.map(l=>"<tr><td>"+H(l.prenom)+"</td><td class=r>"+l.jours+"</td><td class=r>"+eur(l.baseImposable)+"</td><td class=r>- "+eur(l.abatt)+"</td><td class=r><b>"+eur(l.netApres)+"</b></td></tr>").join("");
    w.document.write("<html><head><meta charset='utf-8'><title>Récapitulatif fiscal "+annee+"</title><style>body{font-family:Arial,sans-serif;color:#2E4A5A;padding:28px;font-size:13px}h1{font-size:18px}table{width:100%;border-collapse:collapse;margin:14px 0}th,td{border:1px solid #ccc;padding:7px 9px;text-align:left}.r{text-align:right}thead{background:#f3efe9}.tot{background:#eef5f2;font-weight:700}.note{font-size:11px;color:#666;margin-top:16px;line-height:1.6}</style></head><body>"+
      "<h1>Récapitulatif fiscal annuel "+annee+" — assistant maternel</h1>"+
      "<p>Revenu imposable après abattement (régime spécial, CGI art. 80 sexies), à reporter sur la <b>déclaration 2042</b>, rubrique « traitements et salaires ».</p>"+
      "<table><thead><tr><th>Enfant</th><th class=r>Jours d'accueil</th><th class=r>Base imposable (salaires + entretien)</th><th class=r>Abattement</th><th class=r>Net imposable après abattement</th></tr></thead><tbody>"+rows+
      "<tr class=tot><td>TOTAL</td><td class=r></td><td class=r>"+eur(totalBase)+"</td><td class=r>- "+eur(totalAbatt)+"</td><td class=r>"+eur(totalNet)+"</td></tr></tbody></table>"+
      "<p class=note>Récapitulatif indicatif, calculé à partir des bulletins enregistrés et des pointages réels. Il ne remplace pas l'attestation fiscale officielle de Pajemploi. La déclaration préremplie ne tient jamais compte de l'abattement : corrigez le montant à la baisse dans la case blanche (1AA, ou 1AJ si l'employeur est une personne morale), et portez l'abattement en case 1GA, qui est seulement indicative. Indemnités de repas non incluses (à ajouter si vous en facturez). Conservez vos justificatifs (registre de présence) 5 ans.</p>"+
      "</body></html>");
    w.document.close();w.focus();setTimeout(()=>{try{w.print();}catch(e){}},300);
  };

  return <div className="fi">
    <PageHeader icon="📋" title="Récap fiscal annuel" sub="Revenu imposable après abattement, à reporter sur la déclaration 2042"/>
    <div className="card" style={{marginBottom:14,display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
      <label className="lbl" style={{margin:0}}>Année des revenus</label>
      <select className="sel" style={{maxWidth:140}} value={annee} onChange={e=>setAnnee(Number(e.target.value))}>
        {[yNow,yNow-1,yNow-2].map(y=><option key={y} value={y}>{y}</option>)}
      </select>
      <span style={{fontSize:11.5,color:"var(--l)"}}>Déclaration {annee+1} sur les revenus {annee}</span>
    </div>

    {loading?<div className="card" style={{padding:"var(--pad-carte-l)",textAlign:"center",color:"var(--l)"}}>Chargement…</div>:
     lignes.length===0?<div className="card" style={{padding:"var(--pad-carte-l)",textAlign:"center",color:"var(--m)",fontSize:13}}>Aucun bulletin enregistré pour {annee}. Émettez et envoyez vos bulletins de salaire pour alimenter ce récap.</div>:
    <>
      {lignes.map(l=><div key={l.eid} className="card" style={{marginBottom:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8,marginBottom:10}}>
          <div style={{fontWeight:700,fontSize:15,color:"var(--b)"}}><IconeOuEmoji e="👶"/> {l.prenom}</div>
          <label style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:"var(--b)",cursor:"pointer"}}>
            <input type="checkbox" checked={!!aeeh[l.eid]} onChange={e=>setAeeh(a=>({...a,[l.eid]:e.target.checked}))} style={{width:15,height:15,cursor:"pointer"}}/>
            Enfant handicapé (AEEH) — abattement 4×SMIC
          </label>
        </div>
        {[["Jours d'accueil ("+l.jPlein+" pleins"+(l.jPart?", "+l.jPart+" <8h":"")+(l.jNuit?", "+l.jNuit+" 24h":"")+")",l.jours,"var(--b)"],
          ["Base imposable (salaires + entretien)",eur(l.baseImposable),"var(--b)"],
          ["Abattement régime spécial","- "+eur(l.abatt),"var(--m)"],
          ["Net imposable après abattement",eur(l.netApres),"var(--B)"]].map(([lab,val,col])=>
          <div key={lab} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid var(--br)",fontSize:13}}>
            <span style={{color:"var(--l)"}}>{lab}</span><span style={{fontWeight:700,color:col}}>{val}</span>
          </div>)}
        {l.moisCouverts>0&&l.moisCouverts<12&&<div style={{marginTop:8,fontSize:11.5,color:"var(--R)"}}><IconeOuEmoji e="⚠️"/> {l.moisCouverts}/12 mois de bulletins enregistrés — total incomplet tant que tous les bulletins ne sont pas émis.</div>}
      </div>)}

      <div className="card" style={{padding:0,marginBottom:12,overflow:"hidden"}}>
        <div style={{background:"linear-gradient(135deg,var(--Bp),var(--Gp))",padding:"16px 18px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
          <div style={{minWidth:0}}>
            <div style={{fontSize:11,fontWeight:700,color:"var(--B)",textTransform:"uppercase",letterSpacing:".5px",marginBottom:3}}>Total net imposable {annee} à déclarer</div>
            <div className="pf" style={{fontWeight:800,fontSize:28,color:"var(--b)",lineHeight:1.1}}>{eur(totalNet)}</div>
          </div>
          <button className="btn bT" style={{flexShrink:0}} onClick={imprimer}><IconeOuEmoji e="🖨️"/> Version imprimable / PDF</button>
        </div>
        <div style={{padding:"12px 18px",fontSize:11.5,color:"var(--m)",lineHeight:1.6,borderTop:"1px solid var(--br)"}}>
          Sur la <b>déclaration 2042</b>, rubrique « traitements et salaires » : portez le <b>net imposable après
          abattement</b> en case <b>1AA</b> (employeur particulier) — 1AJ si votre employeur est une personne
          morale. Le montant de l'abattement se reporte en case <b>1GA</b>, qui n'est qu'indicative et n'enlève
          rien toute seule. Le montant prérempli par Pajemploi ne tient jamais compte de l'abattement :
          il faut le corriger à la baisse dans la case blanche.
        </div>
      </div>

      <div className="card" style={{fontSize:11.5,color:"var(--m)",lineHeight:1.7}}>
        <IconeOuEmoji e="ℹ️"/> Récap <b>indicatif</b> calculé depuis vos bulletins enregistrés (salaire imposable + entretien) et vos pointages réels (abattement jour par jour). <b>Il ne remplace pas l'attestation fiscale Pajemploi.</b> La déclaration pré-remplie affiche souvent le brut <b>sans</b> abattement : à corriger manuellement. Les indemnités de repas ne sont pas incluses (à ajouter si vous les facturez){moisManquants?". Certains enfants ont moins de 12 mois de bulletins.":""}.
      </div>
    </>}
  </div>;
}

export function AlerteTauxKm({taux,cv}){
  const plancher=PLANCHER_KM_CONV[cv];
  const t=Number(taux)||0;
  if(!plancher||t<=0||t>=plancher)return null;
  return <div style={{display:"flex",gap:9,alignItems:"flex-start",background:"var(--Rp)",
    border:"1px solid var(--R)",borderRadius:10,padding:"10px 12px",margin:"10px 0",
    fontSize:12.5,color:"var(--R)",lineHeight:1.55}}>
    <IconeOuEmoji e="⚠️" taille={16}/>
    <span><b>Taux kilométrique sous le minimum.</b> {nb3(t)} €/km, alors que la convention
    {" "}interdit de descendre sous {nb2(plancher)} €/km pour un véhicule de {cv>=6?"6 ou 7 CV":cv+" CV"}
    {" "}(arrêté du 29 mai 2026, applicable jusqu'au 31 décembre 2026).</span>
  </div>;
}

export function IndemnitesKilometriques({enfants,role,user}){
  const asmatId=user?.id||enfants[0]?.asmat_id;
  const [mois,setMois]=useState(isoMois(new Date()));
  const [cv,setCv]=useState(5);
  const [trajets,setTrajets]=useState([]);
  const [loading,setLoading]=useState(false);
  const [saving,setSaving]=useState(false);
  const blank={date:isoJour(new Date()),enfant_id:enfants[0]?.id||"",km:"",motif:"",taux:BAREME_KM_2026[5]};
  const [nt,setNt]=useState(blank);
  const inp={width:"100%",padding:"9px 11px",borderRadius:8,border:"1.5px solid var(--br)",fontSize:13,fontFamily:"inherit",boxSizing:"border-box",background:"var(--w)"};

  const charger=async()=>{
    if(role!=="asmat"||!asmatId)return;
    setLoading(true);
    const debut=mois+"-01";
    const d=new Date(mois+"-01"); d.setMonth(d.getMonth()+1);
    const finExcl=isoJour(d);
    const{data}=await supabase.from("trajets").select("*").gte("date",debut).lt("date",finExcl).order("date",{ascending:true});
    if(data)setTrajets(data);
    setLoading(false);
  };
  useEffect(()=>{charger();},[mois]);
  useEffect(()=>{setNt(n=>({...n,taux:BAREME_KM_2026[cv]}));},[cv]);

  const ajouter=async()=>{
    const kmN=parseFloat(String(nt.km).replace(",",".")); const tauxN=parseFloat(String(nt.taux).replace(",","."));
    if(!kmN||!nt.date||!asmatId)return;
    setSaving(true);
    const{error}=await supabase.from("trajets").insert({asmat_id:asmatId,enfant_id:nt.enfant_id||null,date:nt.date,km:kmN,motif:(nt.motif||"").trim(),taux:tauxN||BAREME_KM_2026[cv]});
    setSaving(false);
    if(!error){setNt({...blank,taux:BAREME_KM_2026[cv]});charger();}
  };
  const supprimer=async(id)=>{await supabase.from("trajets").delete().eq("id",id);charger();};

  const totalKm=trajets.reduce((s,t)=>s+(+t.km||0),0);
  const totalEur=trajets.reduce((s,t)=>s+(+t.km||0)*(+t.taux||0),0);
  const parEnfant={}; trajets.forEach(t=>{const k=t.enfant_id||"_";parEnfant[k]=(parEnfant[k]||0)+(+t.km||0)*(+t.taux||0);});
  const enfNom=(id)=>enfants.find(e=>e.id===id)?.prenom||"Non affecté";
  const moisLabel=new Date(mois+"-01").toLocaleDateString("fr-FR",{month:"long",year:"numeric"});

  const imprimer=()=>{
    const lignes=trajets.map(t=>"<tr><td>"+new Date(t.date).toLocaleDateString("fr-FR")+"</td><td>"+H(enfNom(t.enfant_id))+"</td><td>"+(t.motif||"")+"</td><td style='text-align:right'>"+nbf((+t.km),1)+"</td><td style='text-align:right'>"+nbf((+t.taux),3)+"</td><td style='text-align:right'>"+nbf(((+t.km)*(+t.taux)),2)+" &euro;</td></tr>").join("");
    const html="<html><head><meta charset='utf-8'><title>Feuille de route "+moisLabel+"</title><style>body{font-family:Arial,sans-serif;padding:30px;color:#2E4A5A}h1{font-size:18px}table{width:100%;border-collapse:collapse;margin-top:14px;font-size:13px}th,td{border:1px solid #ccc;padding:6px 8px}th{background:#f0ece4;text-align:left}tfoot td{font-weight:bold}</style></head><body><h1>Feuille de route kilom&eacute;trique &mdash; "+moisLabel+"</h1><p>Assistante maternelle : "+(user?.prenom||"")+" "+(user?.nom||"")+"</p><table><thead><tr><th>Date</th><th>Enfant</th><th>Motif</th><th>Km</th><th>Taux &euro;/km</th><th>Montant</th></tr></thead><tbody>"+lignes+"</tbody><tfoot><tr><td colspan='3'>Total</td><td style='text-align:right'>"+nbf(totalKm,1)+" km</td><td></td><td style='text-align:right'>"+nbf(totalEur,2)+" &euro;</td></tr></tfoot></table><p style='margin-top:16px;font-size:11px;color:#777'>Indemnit&eacute;s kilom&eacute;triques exon&eacute;r&eacute;es dans la limite du bar&egrave;me fiscal. &Agrave; reporter sur une ligne distincte de la d&eacute;claration Pajemploi. Bar&egrave;me 2026 (gel&eacute;) voiture, &le;5000 km/an.</p></body></html>";
    const w=window.open("","_blank"); if(w){w.document.write(html);w.document.close();w.focus();setTimeout(()=>w.print(),300);}
  };

  if(role!=="asmat")return <div className="fi"><PageHeader icon="🚗" title="Frais kilométriques"/><div className="card"style={{textAlign:"center",color:"var(--m)"}}>Section réservée à l'assistante maternelle.</div></div>;

  return <div className="fi">
    <PageHeader icon="🚗" title="Frais kilométriques (IK)" sub="Trajets, barème 2026 et feuille de route Pajemploi"/>

    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
      <button className="btn" onClick={()=>setMois(decalerMois(mois,-1))} style={{padding:"6px 12px"}}>←</button>
      <div style={{fontWeight:700,color:"var(--b)",textTransform:"capitalize",minWidth:150,textAlign:"center"}}>{moisLabel}</div>
      <button className="btn" onClick={()=>setMois(decalerMois(mois,1))} style={{padding:"6px 12px"}}>→</button>
    </div>

    <div className="g2" style={{marginBottom:14}}>
      <div className="card" style={{textAlign:"center"}}>
        <div className="pf" style={{fontSize:24,fontWeight:600,color:"var(--T)"}}>{nbf(totalKm,1)} km</div>
        <div style={{fontSize:11,color:"var(--l)",marginTop:4}}>Total du mois</div>
      </div>
      <div className="card" style={{textAlign:"center"}}>
        <div className="pf" style={{fontSize:24,fontWeight:600,color:"var(--G)"}}>{nbf(totalEur,2)} €</div>
        <div style={{fontSize:11,color:"var(--l)",marginTop:4}}>Indemnité totale</div>
      </div>
    </div>

    <div className="card" style={{marginBottom:14}}>
      <div style={{fontSize:13,fontWeight:700,color:"var(--b)",marginBottom:8}}><IconeOuEmoji e="🚙"/> Mon véhicule</div>
      <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
        <span style={{fontSize:13,color:"var(--m)"}}>Puissance fiscale :</span>
        <select value={cv} onChange={e=>setCv(+e.target.value)} style={{...inp,width:"auto"}}>
          {[3,4,5,6,7].map(c=><option key={c}value={c}>{c===7?"7 CV et +":c+" CV"}</option>)}
        </select>
        <span style={{fontSize:13,color:"var(--G)",fontWeight:700}}>→ {nbf(BAREME_KM_2026[cv],3)} €/km</span>
      </div>
      <div style={{fontSize:11,color:"var(--l)",marginTop:8,lineHeight:1.5}}>Barème kilométrique 2026 (gelé) — voiture, tranche jusqu'à 5 000 km/an. Le taux pré-remplit chaque trajet ; tu peux l'ajuster, sans descendre sous {nb2(PLANCHER_KM_CONV[cv])} €/km (barème de l'administration, minimum imposé par la convention).</div>
    </div>

    <div className="card" style={{marginBottom:14}}>
      <div style={{fontSize:13,fontWeight:700,color:"var(--b)",marginBottom:10}}><IconeOuEmoji e="➕"/> Ajouter un trajet</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
        <input type="date" value={nt.date} onChange={e=>setNt({...nt,date:e.target.value})} style={inp}/>
        <select value={nt.enfant_id} onChange={e=>setNt({...nt,enfant_id:e.target.value})} style={inp}>
          <option value="">— Enfant (famille) —</option>
          {enfants.map(e=><option key={e.id}value={e.id}>{e.prenom}</option>)}
        </select>
      </div>
      <input placeholder="Motif (sortie parc, RAM, médecin…)" value={nt.motif} onChange={e=>setNt({...nt,motif:e.target.value})} style={{...inp,marginBottom:8}}/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr auto",gap:8,alignItems:"center"}}>
        <input placeholder="Km" inputMode="decimal" value={nt.km} onChange={e=>setNt({...nt,km:e.target.value})} style={inp}/>
        <input placeholder="Taux €/km" inputMode="decimal" value={nt.taux} onChange={e=>setNt({...nt,taux:e.target.value})} style={inp}/>
        <button className="btn bG" onClick={ajouter} disabled={saving||!nt.km} style={{whiteSpace:"nowrap"}}>{saving?"…":"Ajouter"}</button>
      </div>
      <AlerteTauxKm taux={nt.taux} cv={cv}/>
    </div>

    <div className="card" style={{marginBottom:14}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <div style={{fontSize:13,fontWeight:700,color:"var(--b)"}}>Trajets du mois</div>
        {trajets.length>0&&<button className="btn bT s" onClick={imprimer} style={{padding:"5px 10px"}}><IconeOuEmoji e="🖨️"/> Feuille de route</button>}
      </div>
      {loading?<div style={{color:"var(--l)",fontSize:13,padding:"10px 0"}}>Chargement…</div>
       :trajets.length===0?<div style={{color:"var(--l)",fontSize:13,textAlign:"center",padding:"16px 0"}}>Aucun trajet ce mois-ci.</div>
       :<div style={{display:"flex",flexDirection:"column",gap:6}}>
        {trajets.map(t=><div key={t.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:"1px solid var(--br)",fontSize:13,flexWrap:"wrap"}}>
          <span style={{color:"var(--m)",minWidth:54,fontFamily:"'DM Mono',monospace",fontSize:12}}>{new Date(t.date).toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit"})}</span>
          <span style={{fontWeight:600,color:"var(--b)",minWidth:54}}>{enfNom(t.enfant_id)}</span>
          <span style={{color:"var(--m)",flex:1,minWidth:90}}>{t.motif||"—"}</span>
          <span style={{color:"var(--m)",fontFamily:"'DM Mono',monospace"}}>{nbf((+t.km),1)} km</span>
          <span style={{fontWeight:700,color:"var(--G)",minWidth:60,textAlign:"right"}}>{nbf(((+t.km)*(+t.taux)),2)} €</span>
          <button onClick={()=>supprimer(t.id)} style={{background:"none",border:"none",cursor:"pointer",opacity:.5}}>🗑️</button>
        </div>)}
      </div>}
    </div>

    {Object.keys(parEnfant).length>1&&<div className="card" style={{marginBottom:14}}>
      <div style={{fontSize:13,fontWeight:700,color:"var(--b)",marginBottom:10}}>Répartition par famille</div>
      {Object.entries(parEnfant).map(([k,v])=><div key={k} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid var(--br)",fontSize:13}}>
        <span style={{color:"var(--b)",fontWeight:600}}>{enfNom(k==="_"?null:k)}</span>
        <span style={{color:"var(--G)",fontWeight:700}}>{nbf(v,2)} €</span>
      </div>)}
    </div>}

    <div className="card" style={{background:"var(--Bp)",fontSize:12,color:"var(--b)",lineHeight:1.6}}>
      <IconeOuEmoji e="💡"/> Les indemnités kilométriques sont <b>exonérées</b> dans la limite du barème fiscal, à condition de tenir une <b>feuille de route</b> mensuelle (date, motif, km). Elles se déclarent sur une <b>ligne distincte</b> dans Pajemploi, en plus du salaire et de l'indemnité d'entretien, et se répartissent entre les familles concernées.
    </div>
  </div>;
}

export function SoldeDeCompte({enfants,role,pEId,user}){
  const [selId,setSelId]=useState(enfants[0]?.id);
  const [dateFin,setDateFin]=useState("");
  const [motif,setMotif]=useState("Démission du parent");
  const [calcule,setCalcule]=useState(false);
  const [toast,setToast]=useState("");
  const liste=role==="parent"?enfants.filter(e=>e.id===pEId):enfants;
  const enfant=liste.find(e=>e.id===selId)||liste[0]||{contrat:{}};
  const contrat=enfant?.contrat||{};

  const motifs=["Démission du parent","Rupture amiable","Retraite asmat","Déménagement","Fin de contrat à durée déterminée","Autre"];

  // --- Solde de tout compte, sur les données réelles du contrat ---
  // Tout ce bloc était écrit en dur : six jours de congés, un an et demi
  // d'ancienneté, un préavis de 30/60/90 jours. Il est maintenant calculé.
  const tauxH=contrat.tauxHoraire||minimumHoraireAu(new Date(),user?.titre_amge);
  const heuresMois=heuresMensualisees(contrat);
  const salMensuel=heuresMois*tauxH;
  // Ancienneté réelle, du début du contrat à la date de fin saisie.
  const finRetenue=dateFin||isoJour(new Date());
  const moisAnciennete=(()=>{
    if(!contrat.debut)return 0;
    const d=new Date(contrat.debut+"T12:00:00"), f=new Date(finRetenue+"T12:00:00");
    if(isNaN(d)||isNaN(f)||f<d)return 0;
    return Math.max(0,(f.getFullYear()-d.getFullYear())*12+(f.getMonth()-d.getMonth())+(f.getDate()>=d.getDate()?0:-1));
  })();
  const [cpPris,setCpPris]=useState(0);
  const [ruptureParEmployeur,setRuptureParEmployeur]=useState(true);
  // Un jour ouvrable de congé vaut une journée d'accueil habituelle. Le mois
  // conventionnel compte 26 jours ouvrables.
  const salaireJournalier=Math.round((salMensuel/26)*100)/100;
  const cpAcquisFin=congesAcquis(moisAnciennete);
  const brutTotal=Math.round(salMensuel*moisAnciennete*100)/100;
  const cp=iccpCalcul({brutPeriode:brutTotal,joursAcquis:cpAcquisFin,joursPris:cpPris,salaireJournalier});
  const iccp=cp.montant;
  const congesRestants=cp.restants;
  const preavis=preavisJours(moisAnciennete);
  const indemPreavis=Math.round((preavis/30)*salMensuel*100)/100;
  const indemRupture=indemniteRupture({brutTotal,moisAnciennete,parEmployeur:ruptureParEmployeur});
  const total=Math.round((iccp+indemPreavis+indemRupture)*100)/100;

  const today=new Date().toLocaleDateString("fr-FR");
  // Echappe des sa construction : il part dans trois lettres imprimees, et une
  // apostrophe ou un chevron dans un nom y cassait la mise en page.
  const asmatNomH=H(((user?.prenom||"")+" "+(user?.nom||"")).trim()||"[Assistant(e) maternel(le)]");
  const agr=user?.agrement||"[N° d'agrément]";
  const printDoc=(titre,corps)=>{
    const w=window.open("","_blank");
    if(!w){setToast("Autorisez les pop-ups pour générer le document");return;}
    w.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/><title>${H(titre)}</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Calibri,Arial,sans-serif;max-width:760px;margin:0 auto;padding:48px;color:#2E4859;font-size:14px;line-height:1.9}h1{font-size:19px;text-align:center;letter-spacing:2px;margin-bottom:28px}p{margin:10px 0}.sign{margin-top:52px;display:flex;justify-content:space-between}.muted{color:#9aa;font-size:11px;text-align:center;margin-top:32px}@media print{.noprint{display:none}}</style></head><body>${corps}<div class="noprint"style="text-align:center;margin-top:28px"><button onclick="window.print()"style="background:#C76754;color:#fff;border:none;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer">🖨️ Imprimer / PDF</button></div></body></html>`);
    w.document.close();setToast(titre+" généré ✓");
  };
  const genRupture=()=>printDoc("Lettre de rupture de contrat",`<h1>RUPTURE DU CONTRAT D'ACCUEIL</h1><p>Madame, Monsieur,</p><p>Je vous informe de la rupture du contrat d'accueil de <b>${H(enfant?.prenom||"[Prénom]")}</b>, pour le motif suivant : <b>${H(motif)}</b>.</p><p>La fin du contrat prendra effet le <b>${dateFin?fmt(dateFin):"[date de fin]"}</b>, à l'issue du préavis de <b>${preavis} jours</b> prévu par la convention collective des particuliers employeurs.</p><p>Le solde de tout compte, le certificat de travail et l'attestation France Travail (via Pajemploi) seront remis dans les délais légaux.</p><p>Je vous prie d'agréer, Madame, Monsieur, mes salutations distinguées.</p><div class="sign"><span>Fait le ${today}</span><span><b>${asmatNomH}</b><br/>Signature</span></div>`);
  const genCertificat=()=>printDoc("Certificat de travail",`<h1>CERTIFICAT DE TRAVAIL</h1><p>Je soussigné(e) <b>[Nom du parent employeur]</b>, demeurant <b>[adresse de l'employeur]</b>,</p><p>certifie avoir employé <b>${asmatNomH}</b>, assistant(e) maternel(le) agréé(e) (agrément n° ${agr}), en qualité d'assistante maternelle pour l'accueil de l'enfant <b>${H(enfant?.prenom||"[Prénom]")}</b>,</p><p>du <b>${contrat.debut?fmt(contrat.debut):"[date de début]"}</b> au <b>${dateFin?fmt(dateFin):"[date de fin]"}</b>.</p><p><b>${asmatNomH}</b> est libre de tout engagement.</p><p>En foi de quoi ce certificat est délivré pour servir et valoir ce que de droit.</p><div class="sign"><span>Fait à [lieu], le ${today}</span><span>Signature de l'employeur</span></div><p class="muted">Le certificat de travail est établi et signé par le parent employeur (mentions obligatoires : identité des parties, dates d'entrée et de sortie, nature de l'emploi).</p>`);
  const genRecu=()=>printDoc("Reçu pour solde de tout compte",`<h1>REÇU POUR SOLDE DE TOUT COMPTE</h1><p>Je soussigné(e) <b>${asmatNomH}</b>, assistant(e) maternel(le) agréé(e) (agrément n° ${agr}),</p><p>reconnais avoir reçu de <b>[Nom du parent employeur]</b>, pour solde de tout compte au titre de la fin du contrat d'accueil de <b>${H(enfant?.prenom||"[Prénom]")}</b> (fin le <b>${dateFin?fmt(dateFin):"[date de fin]"}</b>), la somme de :</p><p style="font-size:20px;text-align:center;margin:22px 0"><b>${nbf(total,2)} €</b></p><p>Détail : indemnité compensatrice de congés payés ${nbf(iccp,2)} € + indemnité de préavis ${nbf(indemPreavis,2)} €.</p><p>Le présent reçu est établi en deux exemplaires.</p><div class="sign"><span>Fait le ${today}</span><span><b>${asmatNomH}</b><br/>Signature du salarié</span></div><p class="muted">Montants indicatifs (CCN des particuliers employeurs) — à vérifier au cas par cas.</p>`);

  return <div className="fi">
    {toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
    <PageHeader icon="🏁" title="Fin de contrat" sub="Rupture, certificat de travail, solde de tout compte & congés payés"/>
    {role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
      {liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>{setSelId(e.id);setCalcule(false);}}/>)}
    </div>}
    <div className="g2">
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div className="card">
          <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:14}}><IconeOuEmoji e="📋"/> Paramètres de fin de contrat</div>
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
              ["Taux horaire",nbf(tauxH,2)+"€/h"],
              ["Heures/semaine",(contrat.heuresHebdo||40)+"h"],
            ].map(([l,v])=><div key={l}style={{display:"flex",justifyContent:"space-between",fontSize:12,padding:"3px 0"}}>
              <span style={{color:"var(--l)"}}>{l}</span><span style={{fontWeight:600,color:"var(--b)"}}>{v}</span>
            </div>)}
          </div>
          <button className="btn bT"style={{width:"100%"}}onClick={()=>{if(!dateFin)return;setCalcule(true);}}>
            <IconeOuEmoji e="🧮"/> Calculer le solde de tout compte
          </button>
        </div>
        <div className="card">
          <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:12}}><IconeOuEmoji e="📄"/> Documents de fin de contrat</div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            <button className="btn bG"style={{width:"100%"}}onClick={genRupture}><IconeOuEmoji e="✉️"/> Lettre de rupture</button>
            <button className="btn bG"style={{width:"100%"}}onClick={genCertificat}><IconeOuEmoji e="📜"/> Certificat de travail</button>
            <button className="btn bG"style={{width:"100%"}}onClick={genRecu}><IconeOuEmoji e="🧾"/> Reçu pour solde de tout compte</button>
          </div>
          <div style={{fontSize:11,color:"var(--l)",marginTop:10,lineHeight:1.5}}>L'attestation France Travail officielle se génère sur Pajemploi (espace en ligne du parent).</div>
        </div>
      </div>

      {calcule&&<div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div className="card"style={{border:"2px solid var(--G)"}}>
          <div style={{fontWeight:700,fontSize:14,color:"var(--G)",marginBottom:16}}><IconeOuEmoji e="💶"/> Solde de tout compte - {enfant?.prenom}</div>
          {/* Deux réglages qui changent le résultat et que seule l'utilisatrice
              connaît : les congés déjà pris, et qui rompt le contrat. */}
          <div style={{display:"flex",gap:14,flexWrap:"wrap",alignItems:"center",marginBottom:14,padding:"10px 12px",background:"var(--c)",borderRadius:10,border:"1px solid var(--br)"}}>
            <label style={{display:"flex",alignItems:"center",gap:8,fontSize:12.5,color:"var(--m)"}}>
              Jours de congés déjà pris
              <input type="number" min="0" max={cpAcquisFin} step="0.5" value={cpPris}
                onChange={e=>setCpPris(Math.max(0,Number(e.target.value)||0))}
                style={{width:72,padding:"5px 8px",borderRadius:7,border:"1px solid var(--br)",fontFamily:"inherit",fontSize:13}}/>
            </label>
            <label style={{display:"flex",alignItems:"center",gap:8,fontSize:12.5,color:"var(--m)",cursor:"pointer"}}>
              <input type="checkbox" checked={ruptureParEmployeur} onChange={e=>setRuptureParEmployeur(e.target.checked)}
                style={{width:16,height:16,cursor:"pointer",accentColor:"var(--accent)"}}/>
              Rupture à l'initiative du parent (retrait de l'enfant)
            </label>
          </div>
          <div style={{fontSize:12,color:"var(--m)",marginBottom:12,lineHeight:1.6,padding:"9px 12px",background:"var(--Bp)",borderRadius:9}}>
            Ancienneté retenue : <b>{moisAnciennete} mois</b> ({contrat.debut?fmt(contrat.debut):"début inconnu"} → {fmt(finRetenue)}).
            Congés acquis : <b>{cpAcquisFin} jours ouvrables</b> (2,5 par mois, plafonnés à 30).
          </div>
          {[
            ["Indemnité compensatrice de congés payés",
              congesRestants+" jours restants · méthode retenue : "+cp.methode+" (dixième "+nbf(cp.dixieme,2)+"€ / maintien "+nbf(cp.maintien,2)+"€)",
              nbf(iccp,2)+"€","var(--S)"],
            ["Indemnité de préavis ("+preavis+" jours)",
              preavis+" jours calendaires — "+(moisAnciennete<3?"moins de 3 mois d'ancienneté":moisAnciennete<12?"de 3 mois à 1 an":"1 an et plus")+" (CCN 3239)",
              nbf(indemPreavis,2)+"€","var(--B)"],
            ...(indemRupture>0?[["Indemnité de rupture",
              "1/80 du brut total perçu ("+nbf(brutTotal,2)+"€) — due à partir de 9 mois d'ancienneté, ni cotisée ni imposable",
              nbf(indemRupture,2)+"€","var(--T)"]]
              :[["Indemnité de rupture",
              ruptureParEmployeur?"Non due : "+moisAnciennete+" mois d'ancienneté, il en faut 9":"Non due : la rupture ne vient pas du parent employeur",
              "0.00€","var(--l)"]]),
          ].map(([l,d,v,c])=><div key={l}style={{padding:"10px 0",borderBottom:"1px solid var(--br)"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
              <span style={{fontSize:13,fontWeight:600,color:"var(--b)"}}>{l}</span>
              <span style={{fontWeight:700,color:c,fontSize:13}}>{v}</span>
            </div>
            <div style={{fontSize:11,color:"var(--l)"}}>{d}</div>
          </div>)}
          <div style={{marginTop:14,padding:14,background:"var(--Gp)",borderRadius:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span className="pf"style={{fontSize:15,fontWeight:700,color:"var(--b)"}}>TOTAL SOLDE DE TOUT COMPTE</span>
            <span className="pf"style={{fontSize:28,fontWeight:700,color:"var(--G)"}}>{nbf(total,2)} €</span>
          </div>
          <div style={{fontSize:11,color:"var(--l)",marginTop:12,lineHeight:1.6}}>
            Calcul conforme à la CCN des particuliers employeurs. L'ICCP est calculée sur la base des congés non pris. Le préavis dépend de l'ancienneté. Ces montants sont indicatifs - vérifiez avec votre syndicat ou le RPE.
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button className="btn bG"style={{flex:1}}onClick={genRecu}><IconeOuEmoji e="📥"/> Télécharger le reçu</button>
          <button className="btn bT"style={{flex:1}}onClick={()=>setToast("Envoyé au parent ✓")}><IconeOuEmoji e="📧"/> Envoyer au parent</button>
        </div>
      </div>}
    </div>
  </div>;
}

//
