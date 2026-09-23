// ============================================================
// ÉCRANS SECONDAIRES — chargés à la demande
// ------------------------------------------------------------
// Six écrans que seul le routeur appelle, et qu'aucune
// utilisatrice ne voit à l'ouverture : les bilans, les
// paramètres, la liste d'attente, le planning périscolaire, le
// forum et le projet d'accueil. Ils pesaient 1 600 lignes dans
// le morceau que toute visiteuse de la landing télécharge avant
// de pouvoir lire le hero.
//
// App.jsx les appelle par import(), derrière le Suspense du
// routeur. Les briques partagées restent dans App.jsx et sont
// importées d'ici : elles ne sont pas dupliquées.
// ============================================================
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase.js";
import {
  CPill, D, EmptyState, H, IconeOuEmoji, MDP_AIDE, PageHeader, Pastille, Toast, chargerJsPDF, fmt, isoJour, messageMotDePasseFuite, motDePasseCompromis, nbf, protegerPdf, verifierMotDePasse, G, logAction
} from "./App.jsx";
import {
  DEMANDES_DEMO, FORUM_POSTS, GestionStockage, InstallButton, JOURS_SEM, PERIODES, SignaturePad, SupprimerCompte, ageEnMois, minimumHoraireAu
} from "./socle.jsx";

export function Bilans({enfants,role,pEId,user}){ // PDF BILAN P9 - ajout user pour PDF
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
      return{date_debut:isoJour(s),date_fin:isoJour(e)};
    }
    if(type==="trimestriel"){
      const tStart=Math.floor(today.getMonth()/3)*3;
      const s=new Date(today.getFullYear(),tStart,1);
      const e=new Date(today.getFullYear(),tStart+3,0);
      return{date_debut:isoJour(s),date_fin:isoJour(e)};
    }
    const s=new Date(today);s.setMonth(today.getMonth()-3);
    return{date_debut:isoJour(s),date_fin:isoJour(today)};
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
      const jsPDF=await chargerJsPDF();
      const doc=protegerPdf(new jsPDF({unit:"mm",format:"a4",orientation:"portrait"}));
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
      // jsPDF ecrit avec une police standard encodee sur un seul octet
      // (WinAnsi). Un caractere hors de ce jeu — « ▸ » (U+25B8), « ✓ » (U+2713)
      // — fait basculer TOUTE la ligne en UTF-16 : ni le symbole ni le texte
      // qui suit ne s'impriment. On dessine donc ces deux marques au trait.
      const puceTriangle=(x,yy,c)=>{doc.setFillColor(c[0],c[1],c[2]);doc.triangle(x,yy-2.3,x,yy+0.5,x+2.5,yy-0.9,"F");};
      const marqueCoche=(x,yy,c)=>{const l=doc.getLineWidth();setDraw(c);doc.setLineWidth(0.5);
        doc.line(x,yy-1.3,x+1.2,yy-0.1);doc.line(x+1.2,yy-0.1,x+3.4,yy-3.2);doc.setLineWidth(l);};
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
          doc.text(m.poids?nbf(m.poids,1)+" kg":"—",colX[1]+2,y+4);
          doc.text(m.taille?nbf(m.taille,1)+" cm":"—",colX[2]+2,y+4);
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
          puceTriangle(MX,y,C.terra);
          doc.text(cat+" ("+items.length+")",MX+4.5,y);
          y+=5;
          doc.setFontSize(9);doc.setFont("helvetica","normal");
          items.forEach(j=>{
            ensureSpace(5);
            setText(C.txt);
            marqueCoche(MX+6,y,C.vert);
            doc.text(j.texte||"",MX+11,y);
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
      const filename="bilan-"+slug(titre)+"-"+slug(enfant.prenom||"enfant")+"-"+(bilan.date||isoJour(new Date()))+".pdf";
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
      <div className="card"style={{marginBottom:14}}>
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
      <div className="card"style={{marginBottom:14}}>
        <div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:8}}><IconeOuEmoji e="📝"/> Observations & axes à travailler</div>
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
      <div className="card"style={{marginBottom:14}}>
        <div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:8}}><IconeOuEmoji e="🍽️"/> Alimentation & sommeil</div>
        {s.alimentation_sommeil.stats?<div style={{padding:10,background:"var(--Sp)",borderRadius:8,marginBottom:10,fontSize:12}}>
          <div><b>{s.alimentation_sommeil.stats.repasCount}</b> jours de repas suivis{s.alimentation_sommeil.stats.repasQualitePct!==null?` · qualité bonne ${s.alimentation_sommeil.stats.repasQualitePct}%`:""}</div>
          <div><b>{s.alimentation_sommeil.stats.sommeilCount}</b> siestes enregistrées{s.alimentation_sommeil.stats.sommeilQualitePct!==null?` · qualité bonne ${s.alimentation_sommeil.stats.sommeilQualitePct}%`:""}</div>
        </div>:<div style={{fontSize:11,color:"var(--l)",marginBottom:8,fontStyle:"italic"}}>Cliquez sur "Auto-remplir" pour récupérer les statistiques</div>}
        <textarea className="inp"rows={3}placeholder="Commentaire sur l'alimentation et le sommeil..."
          value={s.alimentation_sommeil.commentaire}onChange={e=>updS("alimentation_sommeil",{commentaire:e.target.value})}
          style={{resize:"vertical"}}/>
      </div>

      {/* Section 3 : Croissance */}
      <div className="card"style={{marginBottom:14}}>
        <div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:8}}><IconeOuEmoji e="📏"/> Croissance</div>
        {s.croissance.mesures.length>0?<div style={{padding:10,background:"var(--Sp)",borderRadius:8,marginBottom:10,fontSize:12}}>
          {s.croissance.mesures.map((m,i)=><div key={i}>{m.date} : {m.poids?`${m.poids} kg`:""}{m.poids&&m.taille?" · ":""}{m.taille?`${m.taille} cm`:""}{m.age_mois?` (${m.age_mois} mois)`:""}</div>)}
        </div>:<div style={{fontSize:11,color:"var(--l)",marginBottom:8,fontStyle:"italic"}}>Aucune mesure sur la période. Cliquez sur "Auto-remplir" si des mesures existent.</div>}
        <textarea className="inp"rows={2}placeholder="Commentaire sur la croissance..."
          value={s.croissance.commentaire}onChange={e=>updS("croissance",{commentaire:e.target.value})}
          style={{resize:"vertical"}}/>
      </div>

      {/* Section 4 : Jalons */}
      <div className="card"style={{marginBottom:14}}>
        <div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:8}}><IconeOuEmoji e="🌱"/> Jalons acquis sur la période</div>
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
          {saving?"Envoi…":<><IconeOuEmoji e="📤"/> Enregistrer & envoyer au parent</>}
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
          <button className="btn" style={{background:"var(--accent)",color:"#fff",border:"none"}} onClick={()=>exporterBilanPDF(viewing)}><IconeOuEmoji e="📥"/> PDF</button>
          <button className="btn" onClick={()=>setViewing(null)}>← Retour</button>
        </div>}/>
      {!p&&<div className="card">{viewing.contenu}</div>}
      {sec&&<>
        <div className="card"style={{marginBottom:14}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:8,color:"var(--b)"}}><IconeOuEmoji e="📝"/> Observations</div>
          <div style={{fontSize:13,whiteSpace:"pre-wrap",color:"var(--m)"}}>{sec.notes?.observations||<i>(vide)</i>}</div>
          {sec.notes?.axes&&<><div style={{fontWeight:700,fontSize:12,marginTop:12,color:"var(--b)"}}>Axes à travailler</div>
            <div style={{fontSize:13,whiteSpace:"pre-wrap",color:"var(--m)"}}>{sec.notes.axes}</div></>}
        </div>
        <div className="card"style={{marginBottom:14}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:8,color:"var(--b)"}}><IconeOuEmoji e="🍽️"/> Alimentation & sommeil</div>
          {sec.alimentation_sommeil?.stats&&<div style={{padding:10,background:"var(--Sp)",borderRadius:8,marginBottom:10,fontSize:12}}>
            <div><b>{sec.alimentation_sommeil.stats.repasCount}</b> jours suivis · qualité bonne {sec.alimentation_sommeil.stats.repasQualitePct||0}%</div>
            <div><b>{sec.alimentation_sommeil.stats.sommeilCount}</b> siestes · qualité bonne {sec.alimentation_sommeil.stats.sommeilQualitePct||0}%</div>
          </div>}
          {sec.alimentation_sommeil?.commentaire&&<div style={{fontSize:13,whiteSpace:"pre-wrap",color:"var(--m)"}}>{sec.alimentation_sommeil.commentaire}</div>}
        </div>
        <div className="card"style={{marginBottom:14}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:8,color:"var(--b)"}}><IconeOuEmoji e="📏"/> Croissance</div>
          {sec.croissance?.mesures?.length>0&&<div style={{padding:10,background:"var(--Sp)",borderRadius:8,marginBottom:10,fontSize:12}}>
            {sec.croissance.mesures.map((m,i)=><div key={i}>{m.date} : {m.poids?`${m.poids} kg`:""}{m.poids&&m.taille?" · ":""}{m.taille?`${m.taille} cm`:""}</div>)}
          </div>}
          {sec.croissance?.commentaire&&<div style={{fontSize:13,whiteSpace:"pre-wrap",color:"var(--m)"}}>{sec.croissance.commentaire}</div>}
        </div>
        <div className="card"style={{marginBottom:30}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:8,color:"var(--b)"}}><IconeOuEmoji e="🌱"/> Jalons acquis ({sec.jalons?.acquis?.length||0})</div>
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

    {!isRealChild&&<div className="card"style={{textAlign:"center",color:"var(--l)"}}>
      Les bilans sont disponibles pour les enfants réels. Sélectionne un enfant que tu accueilles.
    </div>}
    {isRealChild&&loading&&<div className="card"style={{textAlign:"center",color:"var(--l)"}}>Chargement…</div>}
    {isRealChild&&!loading&&bilans.length===0&&<div className="card"style={{padding:"var(--pad-carte-l)",textAlign:"center"}}>
      <div style={{fontSize:42,marginBottom:8}}>✨</div>
      <div style={{fontWeight:700,color:"var(--b)",marginBottom:6}}>Aucun bilan pour {enfant?.prenom}</div>
      <div style={{fontSize:13,color:"var(--l)",marginBottom:14}}>Crée un premier bilan pour synthétiser le développement de l'enfant et le partager aux parents.</div>
      {role==="asmat"&&<button className="btn bT"onClick={newBilan}>+ Créer un bilan</button>}
    </div>}
    {isRealChild&&!loading&&bilans.map(b=>{
      const p=parseContenu(b.contenu);
      const periode=p?(p.date_debut+" → "+p.date_fin):b.date;
      const titre=b.trimestre||(b.type==="mensuel"?"Bilan mensuel":b.type==="libre"?"Bilan libre":"Bilan");
      return <div key={b.id}className="card"style={{marginBottom:10,display:"flex",gap:12,alignItems:"center"}}>
        <div style={{fontSize:28}}><IconeOuEmoji e={b.envoye?"✅":"✏️"} taille={28}/></div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontWeight:700,fontSize:14,color:"var(--b)"}}>{titre}</div>
          <div style={{fontSize:12,color:"var(--l)"}}>{periode}</div>
          <div style={{fontSize:11,color:b.envoye?"var(--G)":"var(--T)",marginTop:2,fontWeight:600}}>
            {b.envoye?"Envoyé au parent":"Brouillon"}
          </div>
        </div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          <button className="btn s"style={{padding:"6px 10px"}}onClick={()=>setViewing(b)}><IconeOuEmoji e="👁️"/> Voir</button>
          {/* PDF BILAN P9 - export PDF rapide depuis la liste, sur bilans envoyés uniquement */}
          {b.envoye&&<button onClick={()=>exporterBilanPDF(b)}style={{padding:"6px 10px",fontSize:12,borderRadius:10,border:"none",cursor:"pointer",fontWeight:700,background:"var(--accent)",color:"#fff"}}><IconeOuEmoji e="📥"/> PDF</button>}
          {role==="asmat"&&!b.envoye&&<button className="btn s"style={{padding:"6px 10px"}}onClick={()=>editBilan(b)}><IconeOuEmoji e="✏️"/> Modifier</button>}
          {/* SEND BILAN P9 - envoi direct depuis la liste pour les brouillons */}
          {role==="asmat"&&!b.envoye&&<button onClick={()=>sendBilan(b)}style={{
            padding:"6px 10px",fontSize:12,borderRadius:8,border:"none",cursor:"pointer",
            fontWeight:700,background:"var(--G)",color:"#fff",
          }}><IconeOuEmoji e="📤"/> Envoyer</button>}
          {role==="asmat"&&!b.envoye&&<button className="btn s"style={{padding:"6px 10px",color:"#c00"}}onClick={()=>deleteBilan(b.id)}>🗑️</button>}
        </div>
      </div>;
    })}
  </div>;
}

//

export function Parametres({user,onLogout,setPage,isPro,isTrialing,lancerCheckout,ouvrirPortail,setUser,openWelcome,recovery=false,clearRecovery}){
  const [toast,setToast]=useState("");
  // MOT DE PASSE P16 - changement depuis l'app (usage courant + retour de lien de reinitialisation)
  const [mdp,setMdp]=useState({a:"",b:""});
  const [savingMdp,setSavingMdp]=useState(false);
  const [mdpOk,setMdpOk]=useState(false);
  const changerMotDePasse=async()=>{
    if(savingMdp)return;
    const pbMdp=verifierMotDePasse(mdp.a); if(pbMdp){setToast("❌ "+pbMdp);return;}
    const fuite=await motDePasseCompromis(mdp.a);
    if(fuite.verifie&&fuite.occurrences>0){setToast("❌ "+messageMotDePasseFuite(fuite.occurrences));return;}
    if(mdp.a!==mdp.b){setToast("❌ Les deux mots de passe ne correspondent pas");return;}
    setSavingMdp(true);
    const{error}=await supabase.auth.updateUser({password:mdp.a});
    setSavingMdp(false);
    if(error){setToast("❌ "+(error.message||"Modification impossible"));return;}
    setMdp({a:"",b:""});setMdpOk(true);
    clearRecovery&&clearRecovery();
    setToast("✅ Mot de passe modifié");
  };
  // SIGNATURE STANDARD ASMAT P10 - state pour gestion signature de reference
  const [showSigPad,setShowSigPad]=useState(false);
  const [currentSig,setCurrentSig]=useState(user?.signature_base64||null);
  // PROFIL EDITABLE P15 - formulaire identite (prenom/nom/tel/adresse + specifique parent employeur)
  // IMPORTANT : tous les hooks restent en haut du composant, avant tout return conditionnel.
  const [pf,setPf]=useState({prenom:"",nom:"",telephone:"",adresse:"",numero_pajemploi:"",parent2_prenom:"",parent2_nom:"",parent2_email:""});
  const [showP2,setShowP2]=useState(false);
  const [savingPf,setSavingPf]=useState(false);
  useEffect(()=>{setCurrentSig(user?.signature_base64||null);},[user?.signature_base64]);
  useEffect(()=>{
    setPf({
      prenom:user?.prenom||"",nom:user?.nom||"",telephone:user?.telephone||"",adresse:user?.adresse||"",
      numero_pajemploi:user?.numero_pajemploi||"",
      parent2_prenom:user?.parent2_prenom||"",parent2_nom:user?.parent2_nom||"",parent2_email:user?.parent2_email||"",
    });
    setShowP2(!!(user?.parent2_prenom||user?.parent2_nom||user?.parent2_email));
  },[user?.id,user?.prenom,user?.nom,user?.telephone,user?.adresse,user?.numero_pajemploi,user?.parent2_prenom,user?.parent2_nom,user?.parent2_email]);
  const estParent=user?.role!=="asmat";
  const champsRequis=estParent?["prenom","nom","telephone","adresse","numero_pajemploi"]:["prenom","nom","telephone","adresse"];
  const nbRemplis=champsRequis.filter(k=>(pf[k]||"").trim()).length;
  const enregistrerProfil=async()=>{
    if(savingPf)return;
    setSavingPf(true);
    const nettoie=v=>{const s=(v||"").trim();return s||null;};
    const patch={
      prenom:nettoie(pf.prenom),nom:nettoie(pf.nom),
      telephone:nettoie(pf.telephone),adresse:nettoie(pf.adresse),
    };
    if(estParent){
      patch.numero_pajemploi=nettoie(pf.numero_pajemploi);
      patch.parent2_prenom=showP2?nettoie(pf.parent2_prenom):null;
      patch.parent2_nom=showP2?nettoie(pf.parent2_nom):null;
      patch.parent2_email=showP2?nettoie(pf.parent2_email):null;
    }
    const{error}=await supabase.from("profiles").update(patch).eq("id",user.id);
    setSavingPf(false);
    if(error){setToast("❌ Erreur : "+error.message);return;}
    setUser&&setUser(u=>({...u,...patch}));
    setToast("✅ Profil enregistré");
  };
  return <div className="fi">
    {toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
    <PageHeader icon="⚙️" title="Paramètres" sub="Votre compte et vos données"/>
    <div style={{maxWidth:600,margin:"0 auto",display:"flex",flexDirection:"column",gap:16}}>

      {/* Abonnement - uniquement pour les assmats */}
      {user?.role==="asmat"&&<div className="card"style={{border:isPro?"2px solid var(--S)":"2px solid var(--T)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <div style={{fontWeight:700,fontSize:14,color:"var(--b)"}}><IconeOuEmoji e="💳"/> Mon abonnement</div>
          <span style={{
            background:isPro?"var(--Sp)":"var(--Tp)",
            color:isPro?"var(--S)":"var(--T)",
            borderRadius:20,padding:"3px 12px",fontSize:11,fontWeight:700
          }}>{isTrialing?"✨ Essai gratuit":isPro?"✅ Pro actif":"🔓 Gratuit"}</span>
        </div>

        {isPro?<>
          {isTrialing&&<div style={{background:"var(--Gp)",border:"1px solid var(--G)",borderRadius:10,padding:"10px 14px",marginBottom:12,fontSize:12,color:"var(--G)"}}>
            <IconeOuEmoji e="🎉"/> Vous bénéficiez de 2 mois d'essai gratuit. Aucun prélèvement avant la fin de l'essai.
          </div>}
          <div style={{fontSize:13,color:"var(--m)",lineHeight:1.7,marginBottom:14}}>
            {isTrialing
              ? "Votre abonnement Pro démarrera automatiquement à la fin de votre période d'essai."
              : "Votre abonnement Pro est actif. Toutes les fonctionnalités sont débloquées."}
          </div>
          <button className="btn bG"style={{width:"100%",justifyContent:"center"}}onClick={ouvrirPortail||undefined}>
            <IconeOuEmoji e="⚙️"/> Gérer mon abonnement (facturation, résiliation)
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
          <button className="btn bT"style={{width:"100%",justifyContent:"center",padding:"13px"}}
            onClick={lancerCheckout||undefined}>
            <IconeOuEmoji e="🚀"/> Passer à Pro - Commencer mon essai gratuit
          </button>
        </>}
      </div>}

      {/* Profil - PROFIL EDITABLE P15 */}
      <div className="card">
        <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:6}}><IconeOuEmoji e="👤"/> Mon profil</div>
        <div style={{fontSize:11.5,color:"var(--l)",marginBottom:14,lineHeight:1.5}}>
          {estParent
            ?<>Ces informations apparaîtront comme <b>employeur</b> sur votre contrat de travail.</>
            :<>Ces informations apparaissent sur vos contrats, attestations et bulletins.</>}
        </div>

        {/* Jauge de completion */}
        <div style={{marginBottom:14}}>
          <div style={{height:6,background:"var(--br)",borderRadius:4,overflow:"hidden"}}>
            <div style={{height:"100%",width:Math.round((nbRemplis/champsRequis.length)*100)+"%",background:nbRemplis===champsRequis.length?"var(--S)":"var(--T)",borderRadius:4,transition:"width .3s"}}/>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"var(--l)",marginTop:5}}>
            <span>{nbRemplis} / {champsRequis.length} champs complétés</span>
            <span>{estParent?"Pour un contrat conforme":"Pour vos documents"}</span>
          </div>
        </div>

        <div style={{display:"flex",gap:10}}>
          <div style={{flex:1,marginBottom:12}}>
            <label className="lbl">Prénom</label>
            <input className="inp" value={pf.prenom} placeholder="Votre prénom"
              onChange={e=>setPf(p=>({...p,prenom:e.target.value}))}/>
          </div>
          <div style={{flex:1,marginBottom:12}}>
            <label className="lbl">Nom</label>
            <input className="inp" value={pf.nom} placeholder="Votre nom"
              onChange={e=>setPf(p=>({...p,nom:e.target.value}))}/>
          </div>
        </div>

        <div style={{marginBottom:12}}>
          <label className="lbl">Email</label>
          <input className="inp" value={user?.email||""} disabled style={{color:"var(--l)",background:"#F3F1EE",cursor:"not-allowed"}}/>
          <div style={{fontSize:11.5,color:"var(--l)",marginTop:5,lineHeight:1.4}}><IconeOuEmoji e="🔒"/> L'email de connexion ne se modifie pas ici — écrivez au support si nécessaire.</div>
        </div>

        <div style={{marginBottom:12}}>
          <label className="lbl">Téléphone</label>
          <input className="inp" value={pf.telephone} placeholder="06 12 34 56 78"
            onChange={e=>setPf(p=>({...p,telephone:e.target.value}))}/>
        </div>

        <div style={{marginBottom:12}}>
          <label className="lbl">Adresse postale</label>
          <textarea className="inp" value={pf.adresse} placeholder="Numéro et rue, code postal, ville"
            style={{minHeight:56,resize:"vertical",fontFamily:"inherit"}}
            onChange={e=>setPf(p=>({...p,adresse:e.target.value}))}/>
          {!(pf.adresse||"").trim()&&<div style={{fontSize:11,color:"var(--R)",marginTop:5}}><IconeOuEmoji e="⚠️"/> Obligatoire sur le contrat de travail</div>}
        </div>

        {estParent&&<div style={{marginBottom:12}}>
          <label className="lbl">N° d'identification Pajemploi <span style={{fontWeight:400,color:"var(--l)"}}>(si déjà attribué)</span></label>
          <input className="inp" value={pf.numero_pajemploi} placeholder="ex: 123456789012"
            onChange={e=>setPf(p=>({...p,numero_pajemploi:e.target.value}))}/>
          <div style={{fontSize:11.5,color:"var(--l)",marginTop:5,lineHeight:1.4}}>
            Attribué par l'URSSAF à l'ouverture de votre compte Pajemploi. S'il n'est pas encore connu, le contrat mentionnera qu'il sera communiqué dès réception.
          </div>
        </div>}

        {estParent&&<div style={{marginTop:16,paddingTop:16,borderTop:"1px solid var(--br)"}}>
          <div onClick={()=>setShowP2(v=>!v)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",gap:12}}>
            <div>
              <div style={{fontWeight:600,fontSize:12.5,color:"var(--b)"}}><IconeOuEmoji e="👥"/> Ajouter un 2e parent employeur</div>
              <div style={{fontSize:11,color:"var(--l)",marginTop:2,lineHeight:1.4}}>Si le contrat est cosigné par les deux parents</div>
            </div>
            <div style={{width:36,height:20,borderRadius:20,background:showP2?"var(--S)":"var(--br)",position:"relative",flexShrink:0,transition:"background .2s"}}>
              <div style={{position:"absolute",top:2,left:showP2?18:2,width:16,height:16,borderRadius:"50%",background:"#fff",transition:"left .2s"}}/>
            </div>
          </div>
          {showP2&&<div style={{marginTop:12,paddingTop:12,borderTop:"1px dashed var(--br)"}}>
            <div style={{display:"flex",gap:10}}>
              <div style={{flex:1,marginBottom:12}}>
                <label className="lbl">Prénom</label>
                <input className="inp" value={pf.parent2_prenom} placeholder="Prénom du 2e parent"
                  onChange={e=>setPf(p=>({...p,parent2_prenom:e.target.value}))}/>
              </div>
              <div style={{flex:1,marginBottom:12}}>
                <label className="lbl">Nom</label>
                <input className="inp" value={pf.parent2_nom} placeholder="Nom du 2e parent"
                  onChange={e=>setPf(p=>({...p,parent2_nom:e.target.value}))}/>
              </div>
            </div>
            <div>
              <label className="lbl">Email <span style={{fontWeight:400,color:"var(--l)"}}>(facultatif)</span></label>
              <input type="email" className="inp" value={pf.parent2_email} placeholder="parent2@email.fr"
                onChange={e=>setPf(p=>({...p,parent2_email:e.target.value}))}/>
            </div>
          </div>}
        </div>}

        <button className="btn bT" style={{width:"100%",justifyContent:"center",padding:12,marginTop:14}}
          disabled={savingPf} onClick={enregistrerProfil}>
          {savingPf?"⏳ Enregistrement…":"Enregistrer mon profil"}
        </button>

        <div style={{fontSize:11,color:"var(--l)",marginTop:10,lineHeight:1.5,textAlign:"center"}}>
          Rôle : <b style={{color:"var(--b)"}}>{user?.role==="asmat"?"Assistante maternelle":"Parent employeur"}</b>
        </div>
        {user?.role==="asmat"&&<div style={{marginTop:12}}>
          <label className="lbl">N° d'agrément (apparaît sur attestations et contrats)</label>
          <div style={{display:"flex",gap:8}}>
            <input className="inp" defaultValue={user?.numero_agrement||""} id="agr-input" placeholder="ex: 75-2023-AM-0042" style={{flex:1}}/>
            <button className="btn bT s" onClick={async()=>{
              const agr=document.getElementById("agr-input")?.value?.trim();
              const{error}=await supabase.from("profiles").update({numero_agrement:agr||null}).eq("id",user.id);
              if(error){setToast("Erreur : "+error.message);return;}
              setUser&&setUser(u=>({...u,numero_agrement:agr}));
              setToast("N° d'agrément enregistré ✓");
            }}>Enregistrer</button>
          </div>
          {user?.numero_agrement&&<div style={{fontSize:11,color:"var(--S)",marginTop:4}}>
            <IconeOuEmoji e="✅"/> Numéro enregistré : {user.numero_agrement}
          </div>}
          {/* Le titre AM-GE majore de 4 % le salaire horaire minimum (CCN 3239,
              article 113 et annexe 5). Sans cette information, l'application
              declarerait conforme un taux pourtant sous le plancher. */}
          <label style={{display:"flex",alignItems:"flex-start",gap:9,marginTop:14,cursor:"pointer"}}>
            <input type="checkbox" checked={!!user?.titre_amge} style={{marginTop:2,width:16,height:16,cursor:"pointer",accentColor:"var(--accent)"}}
              onChange={async(e)=>{
                const v=e.target.checked;
                const{error}=await supabase.from("profiles").update({titre_amge:v}).eq("id",user.id);
                if(error){setToast("Erreur : "+error.message);return;}
                setUser&&setUser(u=>({...u,titre_amge:v}));
                setToast(v?"Titre AM-GE enregistré — minimum majoré de 4 % ✓":"Titre AM-GE retiré ✓");
              }}/>
            <span style={{fontSize:13,color:"var(--b)",lineHeight:1.5}}>
              Je suis titulaire du titre professionnel <b>Assistant maternel – Garde d'enfants</b>
              <span style={{display:"block",fontSize:11.5,color:"var(--m)",marginTop:2}}>
                Votre salaire horaire minimum est alors majoré de 4 % : {nbf(minimumHoraireAu(new Date(),true),2)} € au lieu de {nbf(minimumHoraireAu(new Date(),false),2)} €.
              </span>
            </span>
          </label>
        </div>}
        {/* Code postal — nécessaire pour détecter la PMI */}
        {user?.role==="asmat"&&<div style={{marginTop:12}}>
          <label className="lbl">Code postal (pour votre PMI)</label>
          <div style={{display:"flex",gap:8}}>
            <input className="inp" defaultValue={user?.code_postal||""} id="cp-input" placeholder="ex: 94230" style={{flex:1}}/>
            <button className="btn bT s" onClick={async()=>{
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
            <IconeOuEmoji e="✅"/> Code postal : {user.code_postal} → PMI {{"75":"Paris 75","92":"Hauts-de-Seine 92","93":"Seine-Saint-Denis 93","94":"Val-de-Marne 94","91":"Essonne 91","95":"Val-d'Oise 95","77":"Seine-et-Marne 77","78":"Yvelines 78","69":"Métropole de Lyon 69","13":"Bouches-du-Rhône 13","31":"Haute-Garonne 31","33":"Gironde 33","67":"Bas-Rhin 67","59":"Nord 59"}[user.code_postal?.slice(0,2)]||user.code_postal?.slice(0,2)} détectée
          </div>}
        </div>}
        {/* Numéro PMI direct — saisi manuellement (ex. donné en formation), prioritaire sur l'annuaire */}
        {user?.role==="asmat"&&<div style={{marginTop:12}}>
          <label className="lbl">Numéro direct de votre PMI (facultatif)</label>
          <div style={{fontSize:11,color:"var(--l)",marginBottom:6,lineHeight:1.5}}>Le numéro de contact réel de votre PMI (souvent communiqué en formation). S'il est renseigné, c'est lui qui apparaîtra dans les numéros d'urgence du carnet de santé, à la place du numéro générique.</div>
          <div style={{display:"flex",gap:8}}>
            <input className="inp" defaultValue={user?.pmi_tel||""} id="pmitel-input" placeholder="ex: 01 43 99 12 34" style={{flex:1}}/>
            <button className="btn bT s" onClick={async()=>{
              const t=document.getElementById("pmitel-input")?.value?.trim()||"";
              const{error}=await supabase.from("profiles").update({pmi_tel:t||null}).eq("id",user.id);
              if(error){setToast("❌ Erreur : "+error.message);return;}
              setUser&&setUser(u=>({...u,pmi_tel:t||null}));
              setToast(t?"✅ Numéro PMI enregistré — visible dans le carnet de santé":"✅ Numéro PMI effacé — retour au numéro générique");
            }}>Sauvegarder</button>
          </div>
          {user?.pmi_tel&&<div style={{fontSize:11,color:"var(--S)",marginTop:4}}>
            <IconeOuEmoji e="✅"/> Numéro PMI direct : {user.pmi_tel}
          </div>}
        </div>}

        {/* SIGNATURE ELECTRONIQUE P14F - section accessible asmat ET parent */}
        <div style={{marginTop:16,paddingTop:16,borderTop:"1px solid var(--br)"}}>
          <label className="lbl"><IconeOuEmoji e="✍️" taille={15}/> Ma signature électronique</label>
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
              <button className="btn bG s" onClick={()=>setShowSigPad(true)}>Modifier</button>
              <button className="btn bG s" style={{color:"var(--R)"}} onClick={async()=>{
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
            <button className="btn bT s" onClick={()=>setShowSigPad(true)}>+ Créer ma signature</button>
          </div>}
        </div>
      </div>

      {/* SECURITE / MOT DE PASSE P16 */}
      <div className="card"style={{border:recovery?"1.5px solid var(--T)":undefined}}>
        <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:6}}><IconeOuEmoji e="🔐"/> Mot de passe</div>
        {recovery
          ?<div style={{background:"var(--Tp)",border:"1px solid var(--Tl)",borderRadius:10,padding:"11px 12px",marginBottom:14,fontSize:11.5,color:"var(--m)",lineHeight:1.55}}>
            Vous êtes arrivé ici par un lien de récupération. Choisissez un nouveau mot de passe pour sécuriser votre compte.
          </div>
          :<div style={{fontSize:11.5,color:"var(--l)",marginBottom:14,lineHeight:1.5}}>
            Choisissez un mot de passe que vous n'utilisez nulle part ailleurs.
          </div>}

        {mdpOk&&<div style={{background:"var(--Sp)",border:"1px solid var(--Sl)",borderRadius:10,padding:"10px 12px",marginBottom:12,fontSize:11.5,color:"var(--S)"}}>
          <IconeOuEmoji e="✅"/> Mot de passe modifié. Il vous sera demandé à la prochaine connexion.
        </div>}

        <div style={{marginBottom:12}}>
          <label className="lbl">Nouveau mot de passe</label>
          <input type="password" autoComplete="new-password" className="inp" value={mdp.a} placeholder={MDP_AIDE}
            onChange={e=>{setMdp(m=>({...m,a:e.target.value}));setMdpOk(false);}}/>
        </div>
        <div style={{marginBottom:4}}>
          <label className="lbl">Confirmer le mot de passe</label>
          <input type="password" autoComplete="new-password" className="inp" value={mdp.b} placeholder="Retapez le mot de passe"
            onChange={e=>{setMdp(m=>({...m,b:e.target.value}));setMdpOk(false);}}/>
          {mdp.b&&mdp.a!==mdp.b&&<div style={{fontSize:11,color:"var(--R)",marginTop:5}}>Les deux mots de passe ne correspondent pas</div>}
        </div>

        <button className="btn bT" style={{width:"100%",justifyContent:"center",padding:12,marginTop:12}}
          disabled={savingMdp||!mdp.a||mdp.a!==mdp.b} onClick={changerMotDePasse}>
          {savingMdp?"⏳ Modification…":"Modifier mon mot de passe"}
        </button>
      </div>

      {/* SIGNATURE STANDARD ASMAT P10 - modale de capture */}
      {showSigPad&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999,padding:16}}>
        <div className="card" style={{padding:0,maxWidth:700,width:"100%",maxHeight:"90vh",overflow:"auto"}}>
          <div style={{padding:"16px 20px",borderBottom:"1px solid var(--br)",fontWeight:700,fontSize:15,color:"var(--b)"}}>
            <IconeOuEmoji e="✍️"/> Ma signature électronique
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

      {/* Aide & prise en main */}
      <div className="card">
        <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:6}}><IconeOuEmoji e="🎈"/> Aide & prise en main</div>
        <div style={{fontSize:12,color:"var(--l)",marginBottom:12,lineHeight:1.6}}>
          Un petit guide pour (re)découvrir l'essentiel de TiMat en quelques secondes.
        </div>
        <button className="btn bT"style={{width:"100%",justifyContent:"center"}}onClick={()=>openWelcome&&openWelcome()}>Revoir le guide de bienvenue</button>
      </div>

      {/* Installation PWA */}
      <div className="card">
        <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:8}}><IconeOuEmoji e="📲"/> Installer TiMat sur votre téléphone</div>
        <div style={{fontSize:12,color:"var(--l)",marginBottom:12,lineHeight:1.6}}>
          Ajoutez TiMat sur votre écran d'accueil pour y accéder comme une vraie application, sans passer par le navigateur.
        </div>
        <InstallButton/>
      </div>
      <GestionStockage user={user}/>

      <div className="card">
        <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:14}}><IconeOuEmoji e="📋"/> Légal & RGPD</div>
        {[
          ["🔒","Politique de confidentialité","politique_confidentialite"],
          ["📋","Mentions légales","mentions_legales"],
        ].map(([ic,l,p])=>
          <div key={p}onClick={()=>setPage(p)}style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid var(--br)",cursor:"pointer"}}
            onMouseEnter={e=>e.currentTarget.style.background="var(--c)"}
            onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
            <span style={{fontSize:13,color:"var(--b)"}}><IconeOuEmoji e={ic}/> {l}</span>
            <span style={{color:"var(--l)",fontSize:12}}>→</span>
          </div>)}
        <div style={{marginTop:12,padding:"10px 12px",background:"var(--Sp)",borderRadius:8,fontSize:12,color:"var(--S)"}}>
          <IconeOuEmoji e="✅"/> Données hébergées en France · Jamais vendues · Supprimables à tout moment
        </div>
      </div>

      {/* Déconnexion */}
      <div className="card">
        <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:14}}><IconeOuEmoji e="🚪"/> Session</div>
        <button className="btn bG"style={{width:"100%",justifyContent:"center"}}onClick={onLogout}>
          Se déconnecter
        </button>
      </div>

      <SupprimerCompte onDeleted={onLogout}/>
    </div>
  </div>;
}

//

export function ListeAttente({role,enfants,user}){
  const isDemoMode=(enfants||[]).every(e=>["e1","e2","e3"].includes(e.id));
  const [demandes,setDemandes]=useState(isDemoMode?DEMANDES_DEMO:[]);
  const [selId,setSelId]=useState(null);
  const [filtre,setFiltre]=useState("tous");
  const [repTxt,setRepTxt]=useState("");
  const [toast,setToast]=useState("");
  const sel=demandes.find(d=>d.id===selId);

  // Le libelle porte la pastille, pour que la couleur suive le theme.
  const STATUT_DEMANDE={nouveau:{l:"Nouveau",c:"var(--B)"},en_discussion:{l:"En discussion",c:"var(--P)"},
    accepte:{l:"Accepté",c:"var(--S)"},refuse:{l:"Refusé",c:"var(--R)"}};
  const statutLabel=Object.fromEntries(Object.entries(STATUT_DEMANDE).map(([k,e])=>[k,<><Pastille couleur={e.c}/> {e.l}</>]));
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
      <IconeOuEmoji e="💡"/>
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
      <IconeOuEmoji e="📬"/>
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
        {demandesFiltrees.length===0&&<div className="card"style={{textAlign:"center",color:"var(--l)",fontSize:13}}>
          Aucune demande dans cette catégorie.
        </div>}
        {demandesFiltrees.map(d=><div key={d.id}className="card card-lift"
          onClick={()=>setSelId(selId===d.id?null:d.id)}
          style={{cursor:"pointer",borderLeft:"4px solid "+statutColor[d.statut],
            boxShadow:selId===d.id?"var(--sh2)":"var(--sh)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
            <div style={{flex:1}}>
              <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:4}}>
                <span style={{fontWeight:700,fontSize:14,color:"var(--b)"}}>{d.parent.prenom} {d.parent.nom}</span>
                <span className="badge"style={{background:statutBg[d.statut],color:statutColor[d.statut],fontSize:11}}>
                  {statutLabel[d.statut]}
                </span>
              </div>
              <div style={{fontSize:12,color:"var(--m)"}}>
                Pour <strong>{d.enfant.prenom}</strong> · {ageEnfant(d.enfant.naissance)} · {(d.contrat.jours||[]).length}j/sem · {d.contrat.heuresHebdo}h/sem
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
        <div className="card">
          <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:14,display:"flex",gap:8,alignItems:"center"}}>
            <IconeOuEmoji e="👪"/> {sel.parent.prenom} {sel.parent.nom}
            <span className="badge"style={{background:statutBg[sel.statut],color:statutColor[sel.statut],fontSize:11,marginLeft:4}}>
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
            ["📆 Jours",(sel.contrat.jours||[]).join(", ")],
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
        <div className="card">
          <div style={{fontWeight:700,fontSize:13,marginBottom:12,color:"var(--b)"}}><IconeOuEmoji e="💬"/> Répondre</div>
          <textarea className="ta"value={repTxt}onChange={e=>setRepTxt(e.target.value)}
            placeholder={"Bonjour "+H(sel.parent.prenom)+",\n\nMerci pour votre message..."}
            style={{width:"100%",minHeight:90,marginBottom:10,resize:"vertical"}}/>
          <button className="btn bT"style={{width:"100%",marginBottom:10}}onClick={envoyerReponse}
            disabled={!repTxt.trim()}>
            <IconeOuEmoji e="📧"/> Envoyer par email
          </button>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {sel.statut!=="accepte"&&<button className="btn bS s"onClick={()=>changerStatut(sel.id,"accepte")}>
              <IconeOuEmoji e="✅"/> Accepter
            </button>}
            {sel.statut!=="refuse"&&<button className="btn bR s"onClick={()=>changerStatut(sel.id,"refuse")}>
              <IconeOuEmoji e="❌"/> Refuser
            </button>}
            {sel.statut==="accepte"&&<button className="btn bP s"onClick={()=>setToast("Redirection vers la création de contrat...")}>
              <IconeOuEmoji e="📄"/> Créer le contrat
            </button>}
          </div>
        </div>
      </div>

      :<div className="card"style={{padding:"var(--pad-carte-l)",textAlign:"center",color:"var(--l)"}}>
        <div style={{fontSize:36,marginBottom:12}}>👈</div>
        <div >Sélectionnez une demande pour voir le détail</div>
      </div>}
    </div>
  </div>;
}

//

export function PlanningPeriscolaire({enfants,role,pEId}){
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
      {PERIODES.map(per=><div key={per.id}className="card"style={{borderLeft:"4px solid var(--B)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div>
            <div style={{fontWeight:700,fontSize:14,color:"var(--b)"}}><IconeOuEmoji e={per.ic}/> {per.l}</div>
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
        <IconeOuEmoji e="💾"/> Sauvegarder et partager
      </button>
    </div>}

    {/* Vue hebdo synthèse */}
    <div className="card"style={{marginTop:16}}>
      <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:12}}><IconeOuEmoji e="📋"/> Récapitulatif semaine type - {enfant?.prenom}</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:4}}>
        {JOURS_SEM.map(j=><div key={j}style={{textAlign:"center"}}>
          <div style={{fontSize:11,fontWeight:700,color:"var(--l)",marginBottom:6,textTransform:"uppercase",letterSpacing:".5px"}}>{j.slice(0,2)}</div>
          {PERIODES.filter(per=>per.id!=="vacances"&&per.id!=="mercredi").map(per=>{
            const actif=Array.isArray(p[per.id])?p[per.id].includes(j):false;
            if(!actif)return null;
            return <div key={per.id}style={{
              background:"var(--Bp)",borderRadius:6,padding:"3px 4px",
              fontSize:11,color:"var(--B)",fontWeight:600,marginBottom:3
            }}><IconeOuEmoji e={per.ic}/></div>;
          })}
          {j==="Mercredi"&&p.mercredi&&<div style={{background:"var(--Sp)",borderRadius:6,padding:"3px 4px",fontSize:11,color:"var(--S)",fontWeight:600}}>Journée</div>}
        </div>)}
      </div>
    </div>
  </div>;
}

//

export function ForumCommunaute({role}){
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

    {showNew&&<div className="card"style={{marginBottom:16,border:"2px solid var(--T)"}}>
      <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:12}}><IconeOuEmoji e="✏️"/> Nouvelle question</div>
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
          style={{cursor:"pointer",borderLeft:post.epingle?"4px solid var(--G)":"4px solid var(--P)"}}>
          {post.epingle&&<div style={{fontSize:11,fontWeight:700,color:"var(--G)",marginBottom:4,textTransform:"uppercase",letterSpacing:".5px"}}><IconeOuEmoji e="📌"/> Épinglé</div>}
          <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:6,lineHeight:1.4}}>{post.titre}</div>
          <div style={{fontSize:12,color:"var(--m)",lineHeight:1.5,marginBottom:8,
            overflow:"hidden",textOverflow:"ellipsis",display:"-webkit-box",
            WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{post.contenu}</div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {post.tags.map(t=><span key={t}className="badge"style={{background:"var(--Pp)",color:"var(--P)",fontSize:11}}>{t}</span>)}
            </div>
            <div style={{display:"flex",gap:12,fontSize:11,color:"var(--l)"}}>
              <span>👩 {post.auteur} · {post.ville}</span>
              <span><IconeOuEmoji e="💬"/> {post.reponses} réponse{post.reponses>1?"s":""}</span>
              <span>{post.date}</span>
            </div>
          </div>
        </div>)}
      </div>

      {selPost?<div className="card">
        <div style={{fontWeight:700,fontSize:15,color:"var(--b)",marginBottom:8}}>{selPost.titre}</div>
        <div style={{fontSize:13,color:"var(--m)",lineHeight:1.7,marginBottom:12}}>{selPost.contenu}</div>
        <div style={{fontSize:11,color:"var(--l)",marginBottom:16,paddingBottom:12,borderBottom:"1px solid var(--br)"}}>
          {selPost.auteur} · {selPost.ville} · {selPost.date}
        </div>
        <div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:10}}>
          <IconeOuEmoji e="💬"/> {selPost.reponses} réponses
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
      :<div className="card"style={{padding:"var(--pad-carte-l)",textAlign:"center",color:"var(--l)"}}>
        <div style={{fontSize:36,marginBottom:8}}>💬</div>
        <div >Sélectionnez un sujet pour lire les réponses et participer</div>
      </div>}
    </div>
  </div>;
}

//

export function ProjetAccueil({user,role}){
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
      "<div class='line' style='font-weight:700;font-size:18px'>"+H(f.nom)+"</div>",
      "<div class='label'>Adresse</div><div class='line'>"+H(f.adresse)+"</div>",
      "<div class='label'>Telephone</div><div class='line'>"+H(f.tel)+"</div>",
      "<div class='label'>Email</div><div class='line'>"+H(f.email)+"</div>",
      "<div class='label'>Agrement</div><div class='line'>"+H(f.agrement)+"</div>",
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
      "<p style='text-align:center;color:#ccc;font-size:11px;margin-top:30px'>Genere par TiMat - timat.app</p>",
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
      <div className="card"style={{textAlign:"center"}}>
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
        <div className="card">
          <div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:12}}>👩 Mes informations</div>
          {inp("Nom et prenom","nom")}{inp("Adresse","adresse")}{inp("Telephone","tel")}{inp("Email","email")}{inp("Numero d'agrement","agrement")}
        </div>
        <div className="card">
          <div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:12}}><IconeOuEmoji e="📝"/> Mon introduction</div>
          {ta("Pourquoi j'aime ce metier, ce qui me motive","intro","Depuis X ans, j'exerce le metier d'assistante maternelle avec passion...",4)}
        </div>
        <div className="card">
          <div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:12}}>🎓 Ma presentation</div>
          {ta("Mon parcours et mes formations","parcours","CAP AEPE, formations IPERIA, experiences professionnelles...",4)}
          {ta("Mon agrement en detail","agrementDetail","Agree pour X enfants, de X mois a X ans, depuis le...",3)}
          {ta("Mon domicile et ses amenagements","domicile","Maison avec jardin, espace de jeu dedie, chambre de repos...",4)}
        </div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div className="card">
          <div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:12}}>💛 Mes valeurs</div>
          <div style={{fontSize:11,color:"var(--l)",marginBottom:8,lineHeight:1.6}}>Les valeurs de base (bienveillance, autonomie, attachement, CNV) sont deja incluses. Ajoutez les votres ci-dessous.</div>
          {ta("Mes valeurs complementaires","valeursPerso","Motricite libre, pedagogie Montessori, lien avec la nature...",3)}
        </div>
        <div className="card">
          <div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:12}}><IconeOuEmoji e="📋"/> Ma journee type</div>
          {form.horaires.map((h,i)=><div key={i}style={{display:"flex",gap:6,marginBottom:4}}>
            <input className="inp"disabled={ro}style={{width:110,flexShrink:0,fontSize:11}}value={h.h}onChange={e=>setHoraire(i,"h",e.target.value)}/>
            <input className="inp"disabled={ro}style={{flex:1,fontSize:11}}value={h.d}onChange={e=>setHoraire(i,"d",e.target.value)}/>
          </div>)}
        </div>
        <div className="card">
          <div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:12}}><IconeOuEmoji e="🍽️"/> Mes specificites</div>
          {ta("Alimentation","alimentationPerso","Bio, potager, menus de la semaine...",2)}
          {ta("Sommeil","sommeilPerso","Piece dediee, babyphone, gigoteuse...",2)}
          {ta("Activites","activitesPerso","Yoga enfant, jardinage, sorties nature...",2)}
          {ta("Communication avec les parents","communicationPerso","Application TiMat, cahier de liaison...",2)}
        </div>
        <div className="card">
          <div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:12}}><IconeOuEmoji e="🌿"/> Conclusion</div>
          {ta("Mon mot de conclusion","conclusion","Ce projet d'accueil est le reflet de mon engagement...",3)}
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {role!=="parent"&&(editing
            ? <button className="btn bS"disabled={saving}style={{width:"100%",padding:"14px"}}onClick={sauvegarder}>{saving?"⏳ Enregistrement...":"💾 Sauvegarder"}</button>
            : <button className="btn bG"style={{width:"100%",padding:"14px"}}onClick={()=>setEditing(true)}>✏️ Modifier</button>)}
          <button className="btn bT"style={{width:"100%",padding:"14px"}}onClick={genererPDF}><IconeOuEmoji e="📥"/> Télécharger le PDF</button>
        </div>
      </div>
    </div>
  </div>;
}

// ========== BOUTIQUE ==========

// ========== LE REGISTRE DES MEDICAMENTS ==========
//
// Le decret n 2021-1131 impose depuis le 1er septembre 2021 qu'un geste
// d'administration soit inscrit IMMEDIATEMENT dans un registre dedie, avec le
// nom de l'enfant, la date et l'heure de l'acte, le nom de la personne qui l'a
// realise, le nom du medicament et la posologie.
//
// Ces cinq mentions sont les cinq champs obligatoires du formulaire, et aucune
// ne peut etre laissee vide : un registre incomplet ne prouve rien le jour ou
// on le demande.
//
// Une ligne inscrite ne se supprime pas. La base ne porte volontairement aucune
// politique DELETE sur cette table : une erreur se corrige, elle ne s'efface
// pas.
export function RegistreMedicaments({enfants,role,pEId,user}){
  const estParent = role==="parent";
  const listeEnfants = estParent ? enfants.filter(e=>e.id===pEId||!pEId) : enfants;
  const [selId,setSelId]=useState(listeEnfants[0]?.id);
  const [lignes,setLignes]=useState([]);
  const [chargement,setChargement]=useState(true);
  const [toast,setToast]=useState("");
  const [saving,setSaving]=useState(false);
  const enfant = enfants.find(e=>e.id===selId);

  const vide=()=>({
    date_acte:isoJour(new Date()),
    heure_acte:new Date().toTimeString().slice(0,5),
    medicament:"",
    posologie:"",
    administre_par:[user?.prenom,user?.nom].filter(Boolean).join(" ")||"",
    autorisation:"",
    observations:"",
  });
  const [form,setForm]=useState(vide());
  const [edite,setEdite]=useState(null);

  // L'autorisation d'administrer un medicament vit sur l'ecran Autorisations,
  // signee par le parent. Le registre la LIT : inscrire un medicament que le
  // parent a refuse, ou n'a jamais autorise, est precisement l'erreur que ce
  // registre existe pour empecher. On ne bloque pas — il y a des urgences, et
  // un geste fait doit etre inscrit meme s'il n'aurait pas du avoir lieu —
  // mais on le dit, avant et apres.
  const [autoMedic,setAutoMedic]=useState(undefined);
  useEffect(()=>{
    if(!selId){setAutoMedic(undefined);return;}
    let vivant=true;
    supabase.from("autorisations").select("accordee").eq("enfant_id",selId).eq("type","medicaments").maybeSingle()
      .then(({data})=>{ if(vivant) setAutoMedic(data?.accordee); });
    return()=>{vivant=false;};
  },[selId]);

  useEffect(()=>{
    if(!selId){setChargement(false);return;}
    let vivant=true;
    setChargement(true);
    supabase.from("medicaments").select("*").eq("enfant_id",selId)
      .order("date_acte",{ascending:false}).order("heure_acte",{ascending:false})
      .then(({data,error})=>{
        if(!vivant)return;
        if(error)setToast("Le registre n'a pas pu être lu.");
        setLignes(data||[]);
        setChargement(false);
      });
    return()=>{vivant=false;};
  },[selId]);

  // Les cinq mentions legales, verifiees ici et pas seulement par le navigateur :
  // un champ « required » se contourne, la loi non.
  const MANQUE=(f)=>{
    if(!f.date_acte) return "la date de l'acte";
    if(!f.heure_acte) return "l'heure de l'acte";
    if(!f.medicament.trim()) return "le nom du médicament";
    if(!f.posologie.trim()) return "la posologie";
    if(!f.administre_par.trim()) return "le nom de la personne qui a administré";
    return null;
  };

  const enregistrer=async()=>{
    const m=MANQUE(form);
    if(m){setToast("Le registre exige "+m+".");return;}
    setSaving(true);
    const charge={...form, enfant_id:selId,
      medicament:form.medicament.trim(), posologie:form.posologie.trim(),
      administre_par:form.administre_par.trim()};
    let res;
    if(edite){
      res=await supabase.from("medicaments").update({...charge,updated_at:new Date().toISOString()}).eq("id",edite).select().single();
    }else{
      res=await supabase.from("medicaments").insert(charge).select().single();
    }
    setSaving(false);
    if(res.error){setToast("L'enregistrement a échoué. Rien n'a été inscrit.");return;}
    setLignes(l=>edite?l.map(x=>x.id===edite?res.data:x):[res.data,...l]);
    setForm(vide()); setEdite(null);
    setToast(edite?"Ligne corrigée.":"Inscrit au registre.");
    logAction&&logAction(edite?"registre_medicament_corrige":"registre_medicament_inscrit");
  };

  // Le registre papier ne se fabrique PAS ici. C'est exactement le meme
  // fichier que celui offert sur la boutique : un second exemplaire genere
  // dans l'application aurait fini par differer du premier, et c'est celui
  // qu'on imprime et qu'on garde des annees qui serait devenu le faux.
  const REGISTRE_PAPIER = "/documents/registre-medicaments-administres.pdf";

  const imprimer=async()=>{
    if(!lignes.length){setToast("Le registre est vide : rien à imprimer.");return;}
    try{
      const jsPDF=await chargerJsPDF();
      const doc=protegerPdf(new jsPDF({unit:"mm",format:"a4",orientation:"landscape"}));
      const PW=297,MX=12;let y=18;
      const orange=[184,98,47],noir=[40,40,40],gris=[120,120,120];
      doc.setFontSize(17);doc.setFont("helvetica","bold");doc.setTextColor(...orange);
      doc.text("Registre d'administration des medicaments",MX,y);y+=8;
      doc.setFontSize(9);doc.setFont("helvetica","normal");doc.setTextColor(...gris);
      doc.text("Decret n 2021-1131 - article R.2111-1 du code de la sante publique",MX,y);y+=7;
      doc.setFontSize(10);doc.setTextColor(...noir);
      doc.text("Enfant : "+[enfant?.prenom,enfant?.nom].filter(Boolean).join(" "),MX,y);y+=5;
      doc.text("Assistante maternelle : "+[user?.prenom,user?.nom].filter(Boolean).join(" "),MX,y);y+=5;
      if(user?.numero_agrement){doc.text("N agrement : "+user.numero_agrement,MX,y);y+=5;}
      y+=3;
      const COLS=[["Date",22],["Heure",16],["Medicament",62],["Posologie",62],["Administre par",50],["Observations",0]];
      const entete=()=>{
        doc.setFillColor(245,245,245);doc.rect(MX,y,PW-2*MX,7,"F");
        doc.setFont("helvetica","bold");doc.setFontSize(9);doc.setTextColor(...noir);
        let x=MX+2;COLS.forEach(([l,w])=>{doc.text(l,x,y+4.8);x+=w||45;});
        y+=7;doc.setFont("helvetica","normal");
      };
      entete();
      for(const l of [...lignes].reverse()){
        if(y>190){doc.addPage();y=18;entete();}
        let x=MX+2;
        const cellules=[
          l.date_acte?l.date_acte.split("-").reverse().join("/"):"",
          l.heure_acte||"",
          l.medicament||"",
          l.posologie||"",
          l.administre_par||"",
          l.observations||"",
        ];
        cellules.forEach((c,i)=>{
          const larg=COLS[i][1]||45;
          doc.text(String(doc.splitTextToSize(String(c),larg-3)[0]||""),x,y+4.5);
          x+=larg;
        });
        doc.setDrawColor(228,220,208);doc.line(MX,y+6.5,PW-MX,y+6.5);
        y+=7;
      }
      y+=6;
      doc.setFontSize(8);doc.setTextColor(...gris);
      doc.text("Document genere par TiMat le "+new Date().toLocaleDateString("fr-FR")+" - "+lignes.length+" inscription(s).",MX,y);
      doc.save("registre-medicaments-"+(enfant?.prenom||"enfant")+".pdf");
      logAction&&logAction("registre_medicament_imprime");
    }catch(e){ setToast("Le PDF n'a pas pu être créé."); }
  };

  if(!listeEnfants.length) return <div className="fi">
    <PageHeader icon="💊" title="Registre des médicaments" sub="Consignation obligatoire des médicaments administrés"/>
    <EmptyState emoji="👶" titre="Aucun enfant" texte="Le registre s'ouvre dès qu'un enfant est enregistré."/>
  </div>;

  const champ=(k,label,props={})=>
    <div style={{display:"flex",flexDirection:"column",gap:4}}>
      <label style={{fontSize:12,fontWeight:600,color:"var(--b)"}}>{label}</label>
      <input value={form[k]||""} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))}
        style={{border:"1px solid var(--br)",borderRadius:9,padding:"10px 11px",fontSize:15,fontFamily:"inherit",background:"var(--bg)",color:"var(--b)"}} {...props}/>
    </div>;

  return <div className="fi">
    <PageHeader icon="💊" title="Registre des médicaments" sub="Consignation obligatoire des médicaments administrés"/>

    {enfants.length>1&&<div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
      {listeEnfants.map(e=>
        <button key={e.id} onClick={()=>setSelId(e.id)} className={"btn s "+(selId===e.id?"bT":"")}
          style={selId===e.id?{}:{background:"var(--c)",color:"var(--b)"}}>{e.prenom}</button>)}
    </div>}

    <div style={{background:"#FFF6F2",border:"1px solid #F3DDD4",borderLeft:"4px solid #C84B31",borderRadius:10,padding:"12px 14px",marginBottom:16,fontSize:12.5,lineHeight:1.6,color:"var(--b)"}}>
      Chaque geste doit être inscrit <b>immédiatement</b>, avec cinq mentions : la date,
      l'heure, le médicament, la posologie et le nom de la personne qui l'a administré.
      Une ligne inscrite ne peut plus être supprimée — elle se corrige.
    </div>

    {!estParent&&autoMedic!==true&&<div style={{background:autoMedic===false?"#FFF6F2":"#FFFBF0",border:"1px solid "+(autoMedic===false?"#F3DDD4":"#EFE4C8"),borderLeft:"4px solid "+(autoMedic===false?"#C84B31":"#B8862F"),borderRadius:10,padding:"12px 14px",marginBottom:16,fontSize:12.5,lineHeight:1.6,color:"var(--b)"}}>
      {autoMedic===false
        ? <><b>Le parent a refusé l'administration de médicaments.</b> Si un geste a tout de même été nécessaire, inscrivez-le — un geste fait doit figurer au registre — et prévenez le parent sans attendre.</>
        : <><b>Aucune autorisation signée pour les médicaments.</b> Demandez-la au parent sur l'écran Autorisations avant d'administrer quoi que ce soit, même du paracétamol.</>}
      <button className="btn s" style={{marginTop:9,background:"var(--bg)",color:"var(--b)"}}
        onClick={()=>window.dispatchEvent(new CustomEvent("timat:page",{detail:"autorisations"}))}>
        Ouvrir les autorisations
      </button>
    </div>}

    {!estParent&&<div style={{background:"var(--c)",border:"1px solid var(--br)",borderRadius:14,padding:16,marginBottom:18}}>
      <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:12}}>
        {edite?"Corriger une inscription":"Nouvelle inscription"}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
        {champ("date_acte","Date de l'acte",{type:"date"})}
        {champ("heure_acte","Heure de l'acte",{type:"time"})}
      </div>
      <div style={{display:"grid",gap:10,marginBottom:10}}>
        {champ("medicament","Médicament",{placeholder:"Nom exact, tel qu'il figure sur la boîte"})}
        {champ("posologie","Posologie",{placeholder:"Dose et modalité — ex. 1 dose de 5 kg, par voie orale"})}
        {champ("administre_par","Administré par",{placeholder:"Prénom et nom"})}
        {champ("autorisation","Autorisation / ordonnance",{placeholder:"Ordonnance du Dr X du 12/09, ou autorisation parentale écrite"})}
        {champ("observations","Observations",{placeholder:"Facultatif"})}
      </div>
      <div style={{display:"flex",gap:8}}>
        <button className="btn bT" disabled={saving} onClick={enregistrer} style={{flex:1}}>
          {saving?"…":(edite?"Enregistrer la correction":"Inscrire au registre")}
        </button>
        {edite&&<button className="btn" style={{background:"var(--bg)",color:"var(--b)"}}
          onClick={()=>{setEdite(null);setForm(vide());}}>Annuler</button>}
      </div>
    </div>}

    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
      <div style={{fontWeight:700,fontSize:14,color:"var(--b)"}}>
        {lignes.length} inscription{lignes.length>1?"s":""}
      </div>
      <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
        {!!lignes.length&&<button className="btn s" onClick={imprimer}
          style={{background:"var(--c)",color:"var(--b)",display:"inline-flex",alignItems:"center",gap:6}}><IconeOuEmoji e="🖨️"/> Imprimer le registre</button>}
        {!estParent&&<a className="btn s" href={REGISTRE_PAPIER} download
          style={{background:"var(--bg)",color:"var(--b)",display:"inline-flex",alignItems:"center",gap:6,textDecoration:"none"}}><IconeOuEmoji e="📥"/> Le registre papier</a>}
      </div>
    </div>

    {chargement
      ? <div style={{padding:24,textAlign:"center",color:"var(--m)",fontSize:13}}>Chargement…</div>
      : !lignes.length
        ? <EmptyState emoji="💊" titre="Aucun médicament inscrit" texte={estParent?"Vous verrez ici chaque médicament donné à votre enfant, avec sa date et sa posologie.":"La première inscription ouvrira le registre. Il s'imprime ensuite en un document."}/>
        : <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {lignes.map(l=>
              <div key={l.id} style={{background:"var(--c)",border:"1px solid var(--br)",borderRadius:12,padding:"12px 14px"}}>
                <div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"flex-start"}}>
                  <div style={{minWidth:0}}>
                    <div style={{fontWeight:700,fontSize:14,color:"var(--b)"}}>{l.medicament}</div>
                    <div style={{fontSize:12.5,color:"var(--m)",marginTop:2}}>{l.posologie}</div>
                  </div>
                  <div style={{fontSize:12,color:"var(--m)",whiteSpace:"nowrap",textAlign:"right"}}>
                    {(l.date_acte||"").split("-").reverse().join("/")}<br/>{l.heure_acte}
                  </div>
                </div>
                <div style={{fontSize:12,color:"var(--m)",marginTop:8,borderTop:"1px solid var(--br)",paddingTop:7}}>
                  Administré par <b style={{color:"var(--b)"}}>{l.administre_par}</b>
                  {l.autorisation?<> · {l.autorisation}</>:null}
                  {l.observations?<><br/>{l.observations}</>:null}
                  {l.updated_at?<><br/><i>Corrigé le {new Date(l.updated_at).toLocaleDateString("fr-FR")}</i></>:null}
                </div>
                {!estParent&&<button className="btn s" style={{marginTop:9,background:"var(--bg)",color:"var(--b)"}}
                  onClick={()=>{setEdite(l.id);setForm({
                    date_acte:l.date_acte||"",heure_acte:l.heure_acte||"",medicament:l.medicament||"",
                    posologie:l.posologie||"",administre_par:l.administre_par||"",
                    autorisation:l.autorisation||"",observations:l.observations||"",
                  });window.scrollTo({top:0,behavior:"smooth"});}}>Corriger</button>}
              </div>)}
          </div>}

    {toast&&<Toast msg={toast} onClose={()=>setToast("")}/>}
  </div>;
}

// ========== REPRENDRE UN CONTRAT DEJA COMMENCE ==========
//
// Sans reprise d'historique, changer d'outil veut dire ressaisir des mois de
// paie a la main. Personne ne le fait : c'est le verrou qui garde les gens chez
// le concurrent, et les deux concurrents offrent la reprise.
//
// On ne recree PAS les bulletins anterieurs : ils ont ete emis ailleurs, ils
// font foi, et les refabriquer produirait deux documents differents pour le
// meme mois. On reprend leurs TOTAUX, et on garde d'ou ils viennent.
//
// Deux chemins, parce que les deux situations existent : un fichier exporte de
// l'ancien outil, ou une saisie mois par mois quand il n'y a qu'un tableau
// papier.
// L'ORDRE COMPTE : le net imposable vient juste apres le net verse, parce que
// c'est la ou on les confond. Ce ne sont PAS les memes montants, et c'est le
// second que la declaration d'impots attend.
const COLONNES_REPRISE=[
  ["mois","Mois","AAAA-MM"],
  ["heures","Heures","h réalisées"],
  ["salaire_net","Salaire net versé","€"],
  ["net_imposable","Net imposable","€ — sur le bulletin"],
  ["indemnites_entretien","Indemnités d'entretien","€"],
  ["indemnites_repas","Frais de repas","€"],
  ["jours_travailles","Jours d'accueil","nombre"],
  ["abattement","Abattement","€ — si connu"],
  ["conges_acquis","Congés acquis","jours"],
  ["conges_pris","Congés pris","jours"],
];

// Un point decimal, une virgule, un espace insecable, un symbole euro : les
// exports des autres outils melangent tout. Un nombre illisible devient null,
// jamais zero — zero serait un chiffre faux, et un chiffre faux dans un
// recapitulatif fiscal ne se voit pas.
export const nombreRepris=(v)=>{
  if(v===null||v===undefined)return null;
  const t=String(v).replace(/ |\s|€|h/g,"").replace(",",".").trim();
  if(!t)return null;
  const n=Number(t);
  return Number.isFinite(n)?n:null;
};

// « 2026-01 », « 01/2026 », « janvier 2026 » : on normalise vers AAAA-MM, et on
// refuse ce qu'on n'a pas compris plutot que de deviner.
const MOIS_FR=["janvier","fevrier","mars","avril","mai","juin","juillet","aout","septembre","octobre","novembre","decembre"];
export const moisRepris=(v)=>{
  const t=String(v||"").trim().toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g,"");
  let m=t.match(/^(\d{4})[-/](\d{1,2})$/);
  if(m)return m[1]+"-"+String(m[2]).padStart(2,"0");
  m=t.match(/^(\d{1,2})[-/](\d{4})$/);
  if(m)return m[2]+"-"+String(m[1]).padStart(2,"0");
  m=t.match(/^([a-z]+)\s+(\d{4})$/);
  if(m){const i=MOIS_FR.indexOf(m[1]);if(i>=0)return m[2]+"-"+String(i+1).padStart(2,"0");}
  return null;
};

export function RepriseContrat({enfants,role,user}){
  const [selId,setSelId]=useState(enfants[0]?.id);
  const [mois,setMois]=useState([]);
  const [chargement,setChargement]=useState(true);
  const [toast,setToast]=useState("");
  const [saving,setSaving]=useState(false);
  const [apercu,setApercu]=useState(null);
  const enfant=enfants.find(e=>e.id===selId);

  const videSaisie=()=>({mois:"",heures:"",salaire_net:"",indemnites_entretien:"",indemnites_repas:"",conges_acquis:"",conges_pris:""});
  const [saisie,setSaisie]=useState(videSaisie());

  const recharger=(id)=>{
    setChargement(true);
    supabase.from("historique_mois").select("*").eq("enfant_id",id).order("mois",{ascending:false})
      .then(({data,error})=>{
        if(error)setToast("L'historique n'a pas pu être lu.");
        setMois(data||[]); setChargement(false);
      });
  };
  useEffect(()=>{ if(!selId){setChargement(false);return;} recharger(selId); },[selId]);

  const totaux=mois.reduce((t,m)=>({
    heures:t.heures+(m.heures||0),
    net:t.net+(m.salaire_net||0),
    acquis:t.acquis+(m.conges_acquis||0),
    pris:t.pris+(m.conges_pris||0),
  }),{heures:0,net:0,acquis:0,pris:0});

  const ajouter=async()=>{
    const mm=moisRepris(saisie.mois);
    if(!mm){setToast("Le mois n'est pas lisible. Attendu : 2026-01, 01/2026 ou janvier 2026.");return;}
    setSaving(true);
    const ligne={enfant_id:selId,mois:mm,source:"saisie manuelle"};
    COLONNES_REPRISE.slice(1).forEach(([k])=>{ligne[k]=nombreRepris(saisie[k]);});
    const {error}=await supabase.from("historique_mois").upsert(ligne,{onConflict:"enfant_id,mois"});
    setSaving(false);
    if(error){setToast("Le mois n'a pas pu être enregistré.");return;}
    setSaisie(videSaisie()); recharger(selId);
    setToast("Mois "+mm+" repris.");
    logAction&&logAction("reprise_mois_saisi");
  };

  const supprimer=async(id)=>{
    const {error}=await supabase.from("historique_mois").delete().eq("id",id);
    if(error){setToast("La suppression a échoué.");return;}
    recharger(selId);
    setToast("Mois retiré de la reprise.");
  };

  // Le fichier n'est jamais ecrit directement : il passe par un apercu ou la
  // lecture de CHAQUE ligne est montree avant d'etre acceptee. Un import qui
  // s'ecrit tout seul est un import qu'on decouvre faux trois mois plus tard.
  const lireFichier=async(fichier)=>{
    if(!fichier)return;
    try{
      const texte=await fichier.text();
      const sep=(texte.split("\n")[0].match(/;/g)||[]).length >= (texte.split("\n")[0].match(/,/g)||[]).length ? ";" : ",";
      const lignes=texte.split(/\r?\n/).filter(l=>l.trim());
      if(lignes.length<2){setToast("Le fichier ne contient aucune ligne de données.");return;}
      const entete=lignes[0].split(sep).map(c=>c.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,""));
      const idx=(...noms)=>{for(const n of noms){const i=entete.findIndex(c=>c.includes(n));if(i>=0)return i;}return -1;};
      // « imposable » se cherche AVANT « net » : une colonne « net imposable »
      // contient les deux mots, et le premier test qui gagne decide. Chercher
      // « net » d'abord aurait range le net imposable dans le net verse — deux
      // montants differents dans la meme case, sans que rien ne le signale.
      const cols={
        mois:idx("mois","periode","date"),
        heures:idx("heure"),
        net_imposable:idx("imposable","fiscal"),
        indemnites_entretien:idx("entretien"),
        indemnites_repas:idx("repas"),
        jours_travailles:idx("jours","journees"),
        abattement:idx("abattement"),
        conges_acquis:idx("acquis"),
        conges_pris:idx("pris"),
      };
      cols.salaire_net=(()=>{
        const i=idx("net verse","net paye","net","salaire");
        return i===cols.net_imposable?-1:i;
      })();
      if(cols.mois<0){setToast("Aucune colonne de mois trouvée dans le fichier.");return;}
      const lues=lignes.slice(1).map(l=>{
        const c=l.split(sep);
        const brut=(c[cols.mois]||"").replace(/"/g,"");
        const o={brut, mois:moisRepris(brut)};
        COLONNES_REPRISE.slice(1).forEach(([k])=>{
          o[k]=cols[k]>=0?nombreRepris((c[cols[k]]||"").replace(/"/g,"")):null;
        });
        return o;
      });
      setApercu(lues);
    }catch(e){ setToast("Le fichier n'a pas pu être lu."); }
  };

  const validerApercu=async()=>{
    const bonnes=(apercu||[]).filter(l=>l.mois);
    if(!bonnes.length){setToast("Aucune ligne exploitable : le mois n'a été compris nulle part.");return;}
    setSaving(true);
    const charge=bonnes.map(l=>{
      const o={enfant_id:selId,mois:l.mois,source:"import fichier"};
      COLONNES_REPRISE.slice(1).forEach(([k])=>{o[k]=l[k];});
      return o;
    });
    const {error}=await supabase.from("historique_mois").upsert(charge,{onConflict:"enfant_id,mois"});
    setSaving(false);
    if(error){setToast("L'import a échoué. Rien n'a été enregistré.");return;}
    setApercu(null); recharger(selId);
    setToast(bonnes.length+" mois repris.");
    logAction&&logAction("reprise_import_valide");
  };

  if(role==="parent") return <div className="fi">
    <PageHeader icon="📥" title="Reprise de contrat" sub="Réservé à l'assistante maternelle"/>
    <EmptyState emoji="🔒" titre="Cet écran n'est pas le vôtre" texte="La reprise d'un contrat déjà commencé se fait depuis le compte de l'assistante maternelle."/>
  </div>;

  if(!enfants.length) return <div className="fi">
    <PageHeader icon="📥" title="Reprendre un contrat en cours" sub="Vos mois passés, sans tout ressaisir"/>
    <EmptyState emoji="👶" titre="Aucun enfant" texte="Enregistrez d'abord l'enfant et son contrat, puis revenez reprendre les mois déjà passés."/>
  </div>;

  const champ=(k,label,ph)=>
    <div style={{display:"flex",flexDirection:"column",gap:4}}>
      <label style={{fontSize:11.5,fontWeight:600,color:"var(--b)"}}>{label}</label>
      <input value={saisie[k]||""} onChange={e=>setSaisie(s=>({...s,[k]:e.target.value}))} placeholder={ph}
        inputMode={k==="mois"?"text":"decimal"}
        style={{border:"1px solid var(--br)",borderRadius:9,padding:"10px 11px",fontSize:15,fontFamily:"inherit",background:"var(--bg)",color:"var(--b)"}}/>
    </div>;

  return <div className="fi">
    <PageHeader icon="📥" title="Reprendre un contrat en cours" sub="Vos mois passés, sans tout ressaisir"/>

    {enfants.length>1&&<div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
      {enfants.map(e=>
        <button key={e.id} onClick={()=>{setSelId(e.id);setApercu(null);}} className={"btn s "+(selId===e.id?"bT":"")}
          style={selId===e.id?{}:{background:"var(--c)",color:"var(--b)"}}>{e.prenom}</button>)}
    </div>}

    <div style={{background:"#F3F7F6",border:"1px solid #DCE9E6",borderLeft:"4px solid #5DA9A1",borderRadius:10,padding:"12px 14px",marginBottom:16,fontSize:12.5,lineHeight:1.6,color:"var(--b)"}}>
      Vos bulletins déjà émis ailleurs font foi : on ne les refabrique pas. On reprend
      leurs <b>totaux</b>, pour que vos congés acquis, votre récapitulatif fiscal et
      votre solde de tout compte soient justes dès le premier mois sur TiMat.
      <br/><b>Gardez vos anciens documents</b> : changer d'outil ne remplace pas vos
      obligations d'archivage.
    </div>

    <div style={{background:"#FFFBF0",border:"1px solid #EFE4C8",borderLeft:"4px solid #B8862F",borderRadius:10,padding:"12px 14px",marginBottom:16,fontSize:12.5,lineHeight:1.6,color:"var(--b)"}}>
      <b>Où trouver les deux chiffres qui comptent</b>
      <br/>Le <b>net imposable</b> figure sur chaque bulletin de salaire de l'époque.
      Sans lui, le mois ne peut pas entrer dans votre récapitulatif fiscal — le net
      versé ne le remplace pas, ce ne sont pas les mêmes montants.
      <br/>L'<b>abattement</b>, vous n'avez pas à le calculer : Pajemploi le fait et le
      publie sur votre <b>attestation fiscale annuelle</b>. Sur{" "}
      <a href="https://www.pajemploi.urssaf.fr/" target="_blank" rel="noopener noreferrer" style={{color:"var(--T)"}}>pajemploi.urssaf.fr</a>,
      rubrique <i>Mon attestation fiscale</i> ou <i>Consulter mon cumul imposable</i>.
      <br/>Si vous le laissez vide, TiMat l'estime à partir de vos heures et de vos
      jours d'accueil — une estimation, jamais le chiffre officiel.
    </div>

    {apercu
      ? <div style={{background:"var(--c)",border:"1px solid var(--br)",borderRadius:14,padding:16,marginBottom:18}}>
          <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:4}}>Vérifiez avant d'enregistrer</div>
          <div style={{fontSize:12.5,color:"var(--m)",marginBottom:12}}>
            {apercu.filter(l=>l.mois).length} mois compris sur {apercu.length} lignes lues.
            Rien n'est encore enregistré.
          </div>
          <div style={{maxHeight:300,overflow:"auto",border:"1px solid var(--br)",borderRadius:10}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead><tr>{["Mois","Heures","Net versé","Net imposable","Jours"].map(h=>
                <th key={h} style={{textAlign:"left",padding:"7px 8px",background:"var(--bg)",position:"sticky",top:0,color:"var(--b)"}}>{h}</th>)}</tr></thead>
              <tbody>
                {apercu.map((l,i)=>
                  <tr key={i} style={{background:l.mois?"transparent":"#FFF6F2"}}>
                    <td style={{padding:"6px 8px",borderTop:"1px solid var(--br)",color:l.mois?"var(--b)":"#C84B31"}}>
                      {l.mois||("« "+l.brut+" » non compris")}
                    </td>
                    <td style={{padding:"6px 8px",borderTop:"1px solid var(--br)"}}>{l.heures??"—"}</td>
                    <td style={{padding:"6px 8px",borderTop:"1px solid var(--br)"}}>{l.salaire_net??"—"}</td>
                    <td style={{padding:"6px 8px",borderTop:"1px solid var(--br)",color:l.net_imposable==null?"#B8862F":"var(--b)",fontWeight:l.net_imposable==null?600:400}}>{l.net_imposable??"absent"}</td>
                    <td style={{padding:"6px 8px",borderTop:"1px solid var(--br)"}}>{l.jours_travailles??"—"}</td>
                  </tr>)}
              </tbody>
            </table>
          </div>
          <div style={{display:"flex",gap:8,marginTop:12}}>
            <button className="btn bT" disabled={saving} onClick={validerApercu} style={{flex:1}}>
              {saving?"…":"Enregistrer ces mois"}
            </button>
            <button className="btn" style={{background:"var(--bg)",color:"var(--b)"}} onClick={()=>setApercu(null)}>Annuler</button>
          </div>
        </div>
      : <div style={{background:"var(--c)",border:"1px solid var(--br)",borderRadius:14,padding:16,marginBottom:18}}>
          <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:10}}>Importer un fichier</div>
          <div style={{fontSize:12.5,color:"var(--m)",marginBottom:10,lineHeight:1.6}}>
            Un export CSV de votre ancien outil, ou un tableur enregistré en CSV.
            Les colonnes sont reconnues par leur nom : mois, heures, net versé,
            <b> net imposable</b>, entretien, repas, jours, abattement, acquis, pris.
            Rien n'est enregistré avant que vous ayez vérifié.
          </div>
          {/* Le champ « fichier » natif se dessine a la taille du systeme : 24 px
              de haut sur mobile, sous la cible tactile minimale de 36 px. On le
              rend invisible et on clique le label a sa place, qui est un vrai
              bouton de l'application. */}
          <label className="btn bT" style={{display:"inline-flex",alignItems:"center",gap:7,cursor:"pointer",padding:"11px 18px"}}>
            <IconeOuEmoji e="📥"/> Choisir un fichier
            <input type="file" accept=".csv,text/csv,text/plain"
              onChange={e=>{lireFichier(e.target.files?.[0]); e.target.value="";}}
              style={{position:"absolute",width:1,height:1,opacity:0,pointerEvents:"none"}}/>
          </label>
        </div>}

    <div style={{background:"var(--c)",border:"1px solid var(--br)",borderRadius:14,padding:16,marginBottom:18}}>
      <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:10}}>Ou saisir un mois</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10,marginBottom:12}}>
        {COLONNES_REPRISE.map(([k,l,ph])=>champ(k,l,ph))}
      </div>
      <button className="btn bT" disabled={saving} onClick={ajouter} style={{width:"100%"}}>
        {saving?"…":"Ajouter ce mois"}
      </button>
    </div>

    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
      <div style={{fontWeight:700,fontSize:14,color:"var(--b)"}}>
        {mois.length} mois repris{enfant?" pour "+enfant.prenom:""}
      </div>
    </div>

    {!!mois.length&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:8,marginBottom:14}}>
      {[["Heures",nbf(totaux.heures,1)+" h"],["Net versé",nbf(totaux.net,2)+" €"],
        ["Congés acquis",nbf(totaux.acquis,1)+" j"],["Congés pris",nbf(totaux.pris,1)+" j"]].map(([l,v])=>
        <div key={l} style={{background:"var(--bg)",border:"1px solid var(--br)",borderRadius:12,padding:"11px 12px",textAlign:"center"}}>
          <div style={{fontSize:11,color:"var(--m)"}}>{l}</div>
          <div style={{fontSize:17,fontWeight:700,color:"var(--b)",marginTop:2}}>{v}</div>
        </div>)}
    </div>}

    {chargement
      ? <div style={{padding:24,textAlign:"center",color:"var(--m)",fontSize:13}}>Chargement…</div>
      : !mois.length
        ? <EmptyState emoji="📥" titre="Aucun mois repris" texte="Importez un fichier ou saisissez le premier mois. Vous pourrez corriger et compléter à tout moment."/>
        : <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {mois.map(m=>
              <div key={m.id} style={{background:"var(--c)",border:"1px solid var(--br)",borderRadius:12,padding:"11px 14px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}>
                <div style={{minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:14,color:"var(--b)"}}>{m.mois}</div>
                  <div style={{fontSize:12,color:"var(--m)",marginTop:2}}>
                    {m.heures!=null?nbf(m.heures,1)+" h · ":""}
                    {m.salaire_net!=null?nbf(m.salaire_net,2)+" € net":"net non repris"}
                    {m.conges_acquis!=null?" · "+nbf(m.conges_acquis,1)+" j acquis":""}
                  </div>
                  <div style={{fontSize:11,color:"var(--m)",marginTop:3,fontStyle:"italic"}}>{m.source}</div>
                </div>
                <button className="btn s" style={{background:"var(--bg)",color:"#C84B31"}}
                  onClick={()=>supprimer(m.id)}>Retirer</button>
              </div>)}
          </div>}

    {toast&&<Toast msg={toast} onClose={()=>setToast("")}/>}
  </div>;
}

// ========== LES AUTORISATIONS PARENTALES ==========
//
// Elles circulaient sur papier, dans une annexe du contrat signee une fois et
// rangee quelque part. Le jour ou il faut prouver que le parent avait autorise
// l'appel au 15 ou le transport en voiture, la feuille est introuvable — et une
// autorisation qu'on ne retrouve pas n'existe pas.
//
// SEUL LE PARENT ACCORDE ET SIGNE. La politique UPDATE de la base le lui
// reserve : une assistante maternelle qui pourrait cocher « autorise » a la
// place du parent rendrait la trace sans valeur, et c'est tout l'interet de la
// separer du reste.
//
// Le refus est une reponse comme une autre. Un « non » date et signe vaut mieux
// qu'un silence : au moins on sait.
export const TYPES_AUTORISATION = [
  ["medicaments", "Administrer un médicament", "💊",
   "Donner un médicament prescrit par ordonnance, et l'inscrire au registre.",
   "Sans cette autorisation, aucun médicament ne peut être administré, même du paracétamol."],
  ["urgence", "Soins d'urgence et hospitalisation", "🚑",
   "Appeler le 15, faire transporter l'enfant et autoriser une intervention si les parents sont injoignables.",
   "C'est l'autorisation la plus importante, et la plus souvent oubliée."],
  ["transport", "Transporter en véhicule", "🚗",
   "Emmener l'enfant en voiture, en siège homologué et assuré.",
   "L'assurance du véhicule doit couvrir le transport d'enfants accueillis."],
  ["sorties", "Sorties hors du domicile", "🌳",
   "Parc, bibliothèque, relais petite enfance, promenades.",
   "Une sortie est un temps d'accueil comme un autre."],
  ["photos", "Photographier l'enfant", "📷",
   "Prendre des photos de l'enfant et les partager avec vous dans l'application.",
   "Le consentement se retire à tout moment : c'est le RGPD."],
  ["tiers", "Personnes autorisées à venir le chercher", "👪",
   "Les personnes, autres que vous, qui peuvent récupérer l'enfant.",
   "Précisez leurs noms. Une pièce d'identité sera demandée la première fois."],
];

export function Autorisations({enfants,role,pEId,user}){
  const estParent = role==="parent";
  const liste = estParent ? enfants.filter(e=>!pEId||e.id===pEId) : enfants;
  const [selId,setSelId]=useState(liste[0]?.id);
  const [lignes,setLignes]=useState([]);
  const [chargement,setChargement]=useState(true);
  const [toast,setToast]=useState("");
  // Deux etats distincts, et pas un seul qui porterait tantot un type tantot
  // un objet : « ouvert sur quelle carte » et « signature tracee » ne sont pas
  // la meme information, et les confondre faisait disparaitre le formulaire au
  // moment ou le parent venait de signer.
  const [ouvert,setOuvert]=useState(null);
  const [signature,setSignature]=useState(null);
  const [precisions,setPrecisions]=useState("");
  const enfant = enfants.find(e=>e.id===selId);

  const recharger=(id)=>{
    setChargement(true);
    supabase.from("autorisations").select("*").eq("enfant_id",id).then(({data,error})=>{
      if(error)setToast("Les autorisations n'ont pas pu être lues.");
      setLignes(data||[]); setChargement(false);
    });
  };
  useEffect(()=>{ if(!selId){setChargement(false);return;} recharger(selId); },[selId]);

  const par=(t)=>lignes.find(l=>l.type===t);

  // Le parent repond : oui ou non, avec sa signature et la date. Les deux
  // reponses s'enregistrent de la meme facon — un refus n'est pas une absence
  // de reponse, et il doit se voir.
  const repondre=async(type, accordee, sig)=>{
    const charge={
      enfant_id:selId, type, accordee, precisions:precisions||null,
      signature:sig||null,
      signe_par:[user?.prenom,user?.nom].filter(Boolean).join(" ")||null,
      signe_le:new Date().toISOString(), updated_at:new Date().toISOString(),
    };
    const {error}=await supabase.from("autorisations").upsert(charge,{onConflict:"enfant_id,type"});
    if(error){setToast("La réponse n'a pas pu être enregistrée.");return;}
    setOuvert(null); setSignature(null); setPrecisions(""); recharger(selId);
    setToast(accordee?"Autorisation accordée et signée.":"Refus enregistré et signé.");
    logAction&&logAction(accordee?"autorisation_accordee":"autorisation_refusee");
  };

  const imprimer=async()=>{
    try{
      const jsPDF=await chargerJsPDF();
      const doc=protegerPdf(new jsPDF({unit:"mm",format:"a4"}));
      const PW=210,MX=18;let y=20;
      const orange=[184,98,47],noir=[40,40,40],gris=[120,120,120];
      doc.setFontSize(18);doc.setFont("helvetica","bold");doc.setTextColor(...orange);
      doc.text("Autorisations parentales",MX,y);y+=9;
      doc.setFontSize(10);doc.setFont("helvetica","normal");doc.setTextColor(...noir);
      doc.text("Enfant : "+[enfant?.prenom,enfant?.nom].filter(Boolean).join(" "),MX,y);y+=5;
      doc.text("Assistante maternelle : "+[user?.prenom,user?.nom].filter(Boolean).join(" "),MX,y);y+=8;
      for(const [type,titre,,desc] of TYPES_AUTORISATION){
        const l=par(type);
        if(y>255){doc.addPage();y=20;}
        doc.setFont("helvetica","bold");doc.setFontSize(11);doc.setTextColor(...noir);
        doc.text(titre.normalize("NFD").replace(/[̀-ͯ]/g,""),MX,y);y+=5;
        doc.setFont("helvetica","normal");doc.setFontSize(9);doc.setTextColor(...gris);
        doc.splitTextToSize(desc.normalize("NFD").replace(/[̀-ͯ]/g,""),PW-2*MX).forEach(t=>{doc.text(t,MX,y);y+=4;});
        doc.setFontSize(10);doc.setTextColor(...noir);
        const etat = l?.accordee===true ? "ACCORDEE" : l?.accordee===false ? "REFUSEE" : "SANS REPONSE";
        const quand = l?.signe_le ? " le "+new Date(l.signe_le).toLocaleDateString("fr-FR")+" par "+(l.signe_par||"") : "";
        doc.text(etat+quand,MX,y);y+=5;
        if(l?.precisions){doc.setFontSize(9);doc.setTextColor(...gris);
          doc.splitTextToSize(l.precisions.normalize("NFD").replace(/[̀-ͯ]/g,""),PW-2*MX).forEach(t=>{doc.text(t,MX,y);y+=4;});}
        doc.setDrawColor(228,220,208);doc.line(MX,y,PW-MX,y);y+=6;
      }
      doc.setFontSize(8);doc.setTextColor(...gris);
      doc.text("Genere par TiMat le "+new Date().toLocaleDateString("fr-FR")+".",MX,y+2);
      doc.save("autorisations-"+(enfant?.prenom||"enfant")+".pdf");
    }catch(e){ setToast("Le PDF n'a pas pu être créé."); }
  };

  if(!liste.length) return <div className="fi">
    <PageHeader icon="🪪" title="Autorisations parentales" sub="Ce que le parent autorise, daté et signé"/>
    <EmptyState emoji="👶" titre="Aucun enfant" texte="Les autorisations s'ouvrent dès qu'un enfant est enregistré."/>
  </div>;

  const sansReponse=TYPES_AUTORISATION.filter(([t])=>par(t)?.accordee===undefined||par(t)?.accordee===null).length;

  return <div className="fi">
    <PageHeader icon="🪪" title="Autorisations parentales" sub="Ce que le parent autorise, daté et signé"/>

    {liste.length>1&&<div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
      {liste.map(e=>
        <button key={e.id} onClick={()=>{setSelId(e.id);setOuvert(null);setSignature(null);}} className={"btn s "+(selId===e.id?"bT":"")}
          style={selId===e.id?{}:{background:"var(--c)",color:"var(--b)"}}>{e.prenom}</button>)}
    </div>}

    <div style={{background:"#F3F7F6",border:"1px solid #DCE9E6",borderLeft:"4px solid #5DA9A1",borderRadius:10,padding:"12px 14px",marginBottom:16,fontSize:12.5,lineHeight:1.6,color:"var(--b)"}}>
      {estParent
        ? <>Vous seul pouvez accorder ou refuser. Un refus est une réponse : il se signe
            aussi, et l'assistante maternelle sait alors à quoi s'en tenir. Vous pouvez
            revenir sur une autorisation à tout moment — la nouvelle réponse remplace
            l'ancienne, datée.</>
        : <>Seul le parent peut répondre et signer : c'est ce qui donne sa valeur à la
            trace. Vous voyez ici ses réponses, et vous pouvez imprimer le récapitulatif
            pour votre dossier.{sansReponse>0?<> <b>{sansReponse} autorisation{sansReponse>1?"s":""} sans réponse.</b></>:null}</>}
    </div>

    <div style={{display:"flex",justifyContent:"flex-end",marginBottom:10}}>
      <button className="btn s" onClick={imprimer} style={{background:"var(--c)",color:"var(--b)",display:"inline-flex",alignItems:"center",gap:6}}>
        <IconeOuEmoji e="🖨️"/> Imprimer le récapitulatif
      </button>
    </div>

    {chargement
      ? <div style={{padding:24,textAlign:"center",color:"var(--m)",fontSize:13}}>Chargement…</div>
      : <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {TYPES_AUTORISATION.map(([type,titre,ic,desc,note])=>{
            const l=par(type);
            const etat=l?.accordee===true?"oui":l?.accordee===false?"non":null;
            const couleur=etat==="oui"?"#3D6B50":etat==="non"?"#C84B31":"#7C8A90";
            return <div key={type} style={{background:"var(--c)",border:"1px solid var(--br)",borderLeft:"4px solid "+couleur,borderRadius:12,padding:"13px 15px"}}>
              <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                <div style={{lineHeight:1}}><IconeOuEmoji e={ic} taille={20}/></div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:14,color:"var(--b)"}}>{titre}</div>
                  <div style={{fontSize:12.5,color:"var(--m)",marginTop:3,lineHeight:1.55}}>{desc}</div>
                  <div style={{fontSize:12,color:"var(--m)",marginTop:5,fontStyle:"italic"}}>{note}</div>
                  <div style={{marginTop:8,fontSize:12.5,fontWeight:700,color:couleur}}>
                    {etat==="oui"?"Accordée":etat==="non"?"Refusée":"Sans réponse"}
                    {l?.signe_le?<span style={{fontWeight:400,color:"var(--m)"}}>
                      {" · "}le {new Date(l.signe_le).toLocaleDateString("fr-FR")}
                      {l.signe_par?" par "+l.signe_par:""}
                    </span>:null}
                  </div>
                  {l?.precisions?<div style={{fontSize:12.5,color:"var(--b)",marginTop:5,background:"var(--bg)",borderRadius:8,padding:"7px 9px"}}>{l.precisions}</div>:null}

                  {estParent&&ouvert!==type&&<div style={{display:"flex",gap:7,marginTop:10,flexWrap:"wrap"}}>
                    <button className="btn s bT" onClick={()=>{setOuvert(type);setSignature(null);setPrecisions(l?.precisions||"");}}>
                      {etat?"Modifier ma réponse":"Répondre et signer"}
                    </button>
                  </div>}

                  {estParent&&ouvert===type&&<div style={{marginTop:12,borderTop:"1px solid var(--br)",paddingTop:11}}>
                    <label style={{fontSize:12,fontWeight:600,color:"var(--b)"}}>Précisions (facultatif)</label>
                    <input value={precisions} onChange={e=>setPrecisions(e.target.value)}
                      placeholder={type==="tiers"?"Prénoms et noms des personnes autorisées":"Ce que vous souhaitez ajouter"}
                      style={{width:"100%",border:"1px solid var(--br)",borderRadius:9,padding:"10px 11px",fontSize:15,fontFamily:"inherit",background:"var(--bg)",color:"var(--b)",marginTop:4,marginBottom:10}}/>
                    <div style={{fontSize:12,color:"var(--m)",marginBottom:7}}>
                      {signature?"Signature enregistrée. Choisissez votre réponse.":"Signez ci-dessous, puis choisissez votre réponse."}
                    </div>
                    {!signature&&<SignaturePad
                      onSave={(sig)=>setSignature(sig||"")}
                      onCancel={()=>{setOuvert(null);setSignature(null);setPrecisions("");}}/>}
                    {signature!==null&&<div style={{display:"flex",gap:7,marginTop:10}}>
                      <button className="btn s bT" style={{flex:1}} onClick={()=>repondre(type,true,signature)}>J'autorise</button>
                      <button className="btn s" style={{flex:1,background:"var(--bg)",color:"#C84B31"}} onClick={()=>repondre(type,false,signature)}>Je refuse</button>
                    </div>}
                  </div>}
                </div>
              </div>
            </div>;
          })}
        </div>}

    {toast&&<Toast msg={toast} onClose={()=>setToast("")}/>}
  </div>;
}
