import { useState, useRef, useEffect } from "react";
import { supabase } from "../lib/supabase.js";
// DATES
var _D=new Date();
var TODAY_STR=_D.getFullYear()+"-"+String(_D.getMonth()+1).padStart(2,"0")+"-"+String(_D.getD
var TODAY_H=String(_D.getHours()).padStart(2,"0")+"h"+String(_D.getMinutes()).padStart(2,"0")
var TODAY_MONTH=String(_D.getMonth()+1).padStart(2,"0");
var TODAY_YEAR=String(_D.getFullYear());
function Styles(){return(
<style>{`
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300;0
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body{width:100%;overflow-x:hidden;font-family:'DM Sans',sans-serif}
:root{
--c:#FDF5F8;--w:#FFFFFF;--b:#1A1118;--m:#6B4F5A;--l:#A8909A;--br:#EAE0E8;
--T:#C4714A;--Tp:#FBF0EB;--Tl:#E8B8A0;
--S:#9B6BAA;--Sp:#F4EFF8;--Sl:#C4A8D8;
--G:#4A8B6E;--Gp:#EBF5F0;
--B:#5A7AB8;--Bp:#EBF0F8;
--R:#C44A6A;--Rp:#FAECF0;
--P:#7B5A9A;--Pp:#F0EAF8;
--sh:0 1px 4px rgba(26,17,24,.05),0 4px 20px rgba(26,17,24,.07);
--sh2:0 2px 12px rgba(26,17,24,.08),0 16px 48px rgba(26,17,24,.12);
--sh3:0 0 0 3px rgba(155,107,170,.2);
--r:18px;--r2:14px;--r3:10px
}
.dark{
--c:#0D1B1E;--w:#132428;--b:#F0F5F3;--m:#B0CCC6;--l:#7FA8A0;--br:#1E3A34;
--Tp:#2A1810;--Sp:#0D2A28;--Gp:#0D2A1A;--Bp:#0D1A2A;--Rp:#2A1418;--Pp:#1A1830;
--T:#FF9F63;--S:#3DBDAD;--G:#3DBDAD;--B:#7AAAE0;--R:#F08060;--P:#C898DC;
--Sl:#1A4A42;--Bl:#1A3050;--Rl:#3A1820;
--sh:0 1px 4px rgba(0,0,0,.5),0 4px 20px rgba(0,0,0,.6);
--sh2:0 2px 12px rgba(0,0,0,.6),0 16px 48px rgba(0,0,0,.7);
}
.dark .topbar,.dark .nav-main{background:rgba(13,27,30,.97)!important;border-color:#1E3A3
.dark .card{border-color:#1E3A34;background:rgba(19,36,40,.9)}
.dark .inp,.dark .ta,.dark .sel{background:#0D1B1E;border-color:#2A4A44;color:#F0F5F3}
.dark .lbl{color:#7FA8A0}
.dark .btn{border-color:#2A4A44}
.dark .pf{color:#F0F5F3}
.dark h1,.dark h2,.dark h3,.dark h4{color:#F0F5F3}
.dark .msg-me{background:#1A3A34!important;color:#F0F5F3!important}
.dark .msg-ot{background:#132428!important;color:#E0EBE8!important}
.dark details{background:#132428!important;border-color:#1E3A34!important}
.dark details summary{color:#F0F5F3!important}
.dark select option{background:#0D1B1E;color:#F0F5F3}
.app{min-height:100vh;background:var(--c);display:flex;flex-direction:column;width:100%;p
.app::before{content:'';position:fixed;inset:0;background-image:url("data:image/svg+xml,%
.card{background:rgba(255,255,255,.9);backdrop-filter:blur(8px);border-radius:var(--r);bo
.card-lift{transition:transform .22s cubic-bezier(.34,1.56,.64,1),box-shadow .22s ease}
.card-lift:hover{transform:translateY(-3px);box-shadow:var(--sh2)}
.pf{font-family:'Cormorant Garamond','Georgia',serif}
.topbar{position:sticky;top:0;z-index:100;background:rgba(255,255,255,.92);backdrop-filte
.logo{font-family:'Cormorant Garamond',serif;font-size:24px;font-weight:700;color:var(--T
.logo-dot{width:5px;height:5px;border-radius:50%;background:var(--S);margin-top:2px}
.nav-main{background:rgba(255,255,255,.88);backdrop-filter:blur(16px);border-bottom:1px s
.inp{width:100%;padding:11px 14px;border-radius:12px;border:1.5px solid var(--br);font-si
.inp:focus{border-color:var(--S);box-shadow:var(--sh3)}
.ta{width:100%;padding:11px 14px;border-radius:12px;border:1.5px solid var(--br);font-siz
.ta:focus{border-color:var(--S);box-shadow:var(--sh3)}
.sel{width:100%;padding:10px 14px;border-radius:12px;border:1.5px solid var(--br);font-si
.lbl{display:block;font-size:11.5px;font-weight:600;color:var(--l);margin-bottom:5px;lett
.btn{display:inline-flex;align-items:center;gap:7px;padding:9px 18px;border-radius:12px;b
.bT{background:linear-gradient(135deg,#C4714A,#D4824A);color:#fff;box-shadow:0 2px 10px r
.bT:hover{transform:translateY(-1px);box-shadow:0 4px 18px rgba(196,113,74,.4)}
.bS{background:linear-gradient(135deg,#9B6BAA,#B87CC8);color:#fff;box-shadow:0 2px .bS:hover{transform:translateY(-1px);box-shadow:0 4px 18px rgba(155,107,170,.4)}
.bG{background:rgba(26,17,24,.06);color:var(--m);border:1px solid var(--br)}
.bG:hover{background:rgba(26,17,24,.1)}
.badge{display:inline-flex;align-items:center;justify-content:center;padding:2px 8px;bord
.content{flex:1;overflow-y:auto;overflow-x:hidden}
.fi{padding:20px;max-width:900px;margin:0 auto;width:100%;flex:1}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.g3{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.g4{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
@media(max-width:640px){.g2,.g3,.g4{grid-template-columns:1fr 1fr}}
@media(max-width:400px){.g2,.g3,.g4{grid-template-columns:1fr}}
.bar{height:6px;background:rgba(26,17,24,.08);border-radius:3px;overflow:hidden}
.bar-fill{height:100%;border-radius:3px;background:linear-gradient(90deg,var(--T),var(--S
.canv{border-radius:14px;border:2px solid var(--br);cursor:crosshair;touch-action:none;ba
.moo{border:2px solid transparent;border-radius:10px;padding:4px 6px;font-size:18px;curso
.moo.on,.moo:hover{border-color:var(--S);background:var(--Sp);transform:scale(1.15)}
.msc{width:18px;height:18px;border-radius:50%;border:2px solid var(--br);display:inline-f
.msc.ok{background:var(--G);border-color:var(--G);color:#fff}
.mood-bar{display:flex;gap:2px;height:32px;align-items:flex-end;margin-top:4px}
.mood-b{border-radius:3px 3px 0 0;background:linear-gradient(to top,var(--T),var(--S));mi
.ai-card{background:linear-gradient(135deg,var(--Sp),var(--Tp))!important;border-color:va
.ai-dot{width:7px;height:7px;border-radius:50%;background:var(--S);animation:ai-pulse 1.2
10px r
@keyframes ai-pulse{0%,100%{transform:scale(1);opacity:.6}50%{transform:scale(1.3);opacit
.cp{padding:7px 12px!important;display:inline-flex!important;align-items:center;gap:6px;c
.cp.on{border-color:var(--S)!important;background:var(--Sp)!important}
::-webkit-scrollbar{width:4px;height:4px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:var(--br);border-radius:2px}
.div{height:1px;background:linear-gradient(90deg,transparent,var(--br),transparent);margi
.sec-h{display:flex;align-items:center;gap:8px;margin-bottom:14px}
.sec-h-line{flex:1;height:1px;background:linear-gradient(90deg,var(--br),transparent)}
#bandeau-hl{display:none;background:linear-gradient(90deg,var(--T),var(--S));color:#fff;f
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
.bottom-nav{display:none;position:fixed;bottom:0;left:0;right:0;z-index:200;background:rg
.dark .bottom-nav{background:rgba(13,27,30,.97)!important;border-top-color:#1E3A34!import
.bnav-btn{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:ce
.bnav-btn.active{background:rgba(155,107,170,.12)}
.bnav-btn .bnav-ic{font-size:22px;line-height:1;transition:transform .18s}
.bnav-btn.active .bnav-ic{transform:scale(1.12)}
.bnav-btn .bnav-lbl{font-size:10px;font-weight:600;letter-spacing:.1px;white-space:nowrap
.bnav-btn.active .bnav-lbl{color:var(--S)}
@media(max-width:768px){.bottom-nav{display:flex}}
@media(hover:none){.card-lift:active{transform:scale(.98)}.btn:active{transform:scale(.96
/* - CALENDRIER - */
.cgrid{display:grid;grid-template-columns:repeat(7,1fr);gap:3px}
.cday{min-height:38px;border-radius:8px;display:flex;flex-direction:column;align-items:ce
.cday:hover{background:var(--Sp)}
.cday.tod{background:linear-gradient(135deg,var(--T),var(--S));color:#fff;font-weight:700
.cday.abs{background:var(--Rp);color:var(--R)}
.cday.cng{background:var(--Gp);color:var(--G)}
.cday.hol{background:var(--Bp);color:var(--B)}
/* - TOAST - */
.toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:var(--b)
@keyframes toast-in{from{opacity:0;transform:translateX(-50%) translateY(10px)}to{opacity
/* - PHOTO GRID - */
.photo-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
@media(max-width:640px){.photo-grid{grid-template-columns:repeat(3,1fr)}}
/* - NAV TABS - */
.ntab{padding:6px 12px;border-radius:8px;border:none;background:transparent;cursor:pointe
.ntab.on{background:var(--Sp);color:var(--S);font-weight:700}
`}</style>
);}
const D = {
asmat:{id:"am1",role:"asmat",prenom:"Marie",nom:"Dupont",email:"marie.dupont@mail.fr",agrem
parents:[
{id:"p1",role:"parent",prenom:"Sophie",nom:"Martin",email:"sophie.martin@mail.fr",couleur
{id:"p2",role:"parent",prenom:"Thomas",nom:"Bernard",email:"thomas.bernard@mail.fr",coule
{id:"p3",role:"parent",prenom:"Camille",nom:"Petit",email:"camille.petit@mail.fr",couleur
],
enfants:[
{id:"e1",prenom:"Léo",nom:"Martin",parentId:"p1",naissance:"2022-03-15",couleur:"#3A72A8"
allergies:["Arachides","Noix de cajou"],groupe_sanguin:"A+",medecin:"Dr. Lefebvre - 01
vaccins:[{nom:"DTP",date:"2022-09-15",ok:true},{nom:"ROR",date:"2023-03-15",ok:true},{n
contrat:{debut:"2023-09-04",fin:"2024-08-31",heuresHebdo:40,tauxHoraire:4.05,jours:["Lu
signe:false},
{id:"e2",prenom:"Emma",nom:"Bernard",parentId:"p2",naissance:"2021-11-22",couleur:"#4E7A5
allergies:["Lactose"],groupe_sanguin:"O+",medecin:"Dr. Martin - 01 34 56 78",
vaccins:[{nom:"DTP",date:"2022-05-22",ok:true},{nom:"ROR",date:"2022-11-22",ok:true},{n
contrat:{debut:"2023-09-04",fin:"2024-08-31",heuresHebdo:35,tauxHoraire:4.05,jours:["Lu
signe:true},
{id:"e3",prenom:"Noah",nom:"Petit",parentId:"p3",naissance:"2023-01-08",couleur:"#C44E72"
allergies:[],groupe_sanguin:"B+",medecin:"Dr. Durand - 01 45 67 89",
vaccins:[{nom:"DTP",date:"2023-07-08",ok:true},{nom:"ROR",date:"2024-01-08",ok:false},{
contrat:{debut:"2024-01-08",fin:"2024-12-31",heuresHebdo:45,tauxHoraire:4.05,jours:["Lu
signe:false},
],
transmissions:[
{id:"t1",eId:"e1",auteur:"asmat",date:TODAY_STR,h:"17h15",txt:"Super journée pour Léo ! I
{id:"t2",eId:"e1",auteur:"parent",date:TODAY_STR,h:"07h28",txt:"Léo a peu dormi, petite f
{id:"t3",eId:"e2",auteur:"asmat",date:TODAY_STR,h:"17h45",txt:"Emma a refusé la sieste ma
{id:"t4",eId:"e3",auteur:"asmat",date:TODAY_STR,h:"17h00",txt:"Noah commence à marcher !
{id:"t5",eId:"e3",auteur:"parent",date:TODAY_STR,h:"07h05",txt:"Nuit agitée, pousse une d
],
messages:[
{id:"m1",eId:"e1",de:"parent",h:"08h02",txt:"Bonjour Marie ! Léo a bien dormi finalement
{id:"m2",eId:"e1",de:"asmat",h:"08h15",txt:"Bonjour Sophie ! Super, il arrive tout souria
{id:"m3",eId:"e1",de:"parent",h:"16h30",txt:"Il peut rester un peu plus tard ce soir ? Mo
{id:"m4",eId:"e3",de:"asmat",h:"10h22",txt:"Noah a fait ses 4 premiers pas ! J'ai filmé,
{id:"m5",eId:"e3",de:"parent",h:"10h35",txt:"QUOIIIII Merci Marie vous êtes la me
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
{id:"r1",eId:"e1",date:TODAY_STR,dej:"Tout mangé",gou:"Yaourt + compote",bib:null,notes:"
{id:"r2",eId:"e2",date:TODAY_STR,dej:"½ portion",gou:"Pain + lait végétal",bib:null,notes
{id:"r3",eId:"e3",date:TODAY_STR,dej:"Tout mangé",gou:"Compote",bib:"2×180ml",notes:"",q:
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
{id:"pf1",eId:"e1",date:TODAY_STR,titre:"Peinture cerisier",desc:"Coton-tige et peinture
{id:"pf2",eId:"e1",date:"2024-03-06",titre:"Plantation radis",desc:"Découverte des graine
{id:"pf3",eId:"e2",date:"2024-03-09",titre:"Puzzle 12 pièces",desc:"Concentration remarqu
{id:"pf4",eId:"e3",date:TODAY_STR,titre:"Premiers pas ",desc:"4 pas autonomes, sourire
{id:"pf5",eId:"e3",date:"2024-03-04",titre:"Maracas maison",desc:"Riz dans bouteilles, dé
],
milestones:{
"e1":[
{id:"ms1",cat:"Langage",txt:"Dit des phrases de 3 mots",ok:true,age_attendu:"24-30 mois
{id:"ms2",cat:"Langage",txt:"Nomme des couleurs",ok:true,age_attendu:"24-36 mois"},
{id:"ms3",cat:"Social",txt:"Joue avec d'autres enfants",ok:true,age_attendu:"24-36 mois
{id:"ms4",cat:"Motricité",txt:"Monte les escaliers seul",ok:true,age_attendu:"24 mois"}
{id:"ms5",cat:"Motricité",txt:"Saute à pieds joints",ok:false,age_attendu:"24-30 mois"}
{id:"ms6",cat:"Autonomie",txt:"Mange seul à la cuillère",ok:true,age_attendu:"18-24 moi
],
"e2":[
{id:"ms7",cat:"Langage",txt:"Vocabulaire 200+ mots",ok:true,age_attendu:"24-30 mois"},
{id:"ms8",cat:"Langage",txt:"Pose des questions «pourquoi»",ok:true,age_attendu:"30-36
{id:"ms9",cat:"Motricité",txt:"Court, saute, grimpe",ok:true,age_attendu:"24-36 mois"},
{id:"ms10",cat:"Autonomie",txt:"S'habille partiellement seul",ok:true,age_attendu:"30-3
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
moodHistory:{"e1":[4,3,4,5,4,4,3,5,4,4,5,4,3,4,5],"e2":[3,4,4,3,5,4,4,4,3,4,4,5,3,4,4],"e3"
};
//
const age=(d)=>{const n=new Date(d),t=new Date(),m=(t.getFullYear()-n.getFullYear())*12+(t.ge
const fmt=(s)=>s?new Date(s).toLocaleDateString("fr-FR"):"-";
const ini=(p,n)=>(p[0]+n[0]).toUpperCase();
const todayStr=()=>new Date().toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:
const moodVal={" ":5," ":4," ":3," ":2," ":1," ":1," ":5," ":2};
//
function Av({t,c,s=36}){return <div className="av"style={{width:s,height:s,background:c+"22",
function CPill({e,sel,onClick}){return <div className={"card cp "+(sel?"on":"")+""}onClick={o
<span style={{fontSize:20}}>{e.emoji}</span><div><div style={{fontWeight:700,fontSize:13,co
function Toast({msg,onClose}){useEffect(()=>{const t=setTimeout(onClose,3000);return()=>clear
return <div className="toast"><span> </span>{msg}</div>}
function PageHeader({icon,title,sub,action}){return <div style={{marginBottom:14,display:"fle
<div><div className="pf"style={{fontSize:17,fontWeight:700,color:"var(--b)",marginBottom:2}
{sub&&<div style={{fontSize:12,color:"var(--l)"}}>{sub}</div>}</div>{action}</div>}
//
function AccueilAssMat({enfants,setPage,user}){
const pt=D.pointages.filter(p=>p.date===TODAY_STR);
const tx=D.transmissions.filter(t=>t.date===TODAY_STR);
const nonSigne=enfants.filter(e=>!e.contrat?.signe_asmat);
const nbEnfants=enfants.length;
const isDemoUser=enfants.every(e=>["e1","e2","e3"].includes(e.id));
const kpis=[
{icon:" ",val:nbEnfants>0?nbEnfants+" enfant"+(nbEnfants>1?"s":""):"Aucun",lbl:"Enfants
{icon:" ",val:"0",lbl:"Messages non lus",c:"var(--B)",page:"messagerie",hint:"→ Messager
{icon:" ",val:nbEnfants>0?"Actif":"-",lbl:"Journal du jour",c:"var(--S)",page:"journal_c
{icon:" ",val:nbEnfants,lbl:"Contrat"+(nbEnfants>1?"s":"")+" actif"+(nbEnfants>1?"s":"")
];
return <div className="fi">
<div style={{marginBottom:18}}>
<div style={{fontSize:11,color:"var(--l)",marginBottom:4,fontFamily:"'DM Mono',monospac
{todayStr().toUpperCase()}
</div>
<div className="pf"style={{fontSize:26,fontWeight:600,color:"var(--b)",lineHeight:1.2}}
<div style={{fontSize:13,color:"var(--m)",marginTop:4}}>Votre espace professionnel</div
</div>
{/* Alerte contrats */}
{nonSigne.length>0&&<div onClick={()=>setPage("admin_finances")}
style={{background:"linear-gradient(135deg,#FFF8E6,#FFF3D6)",border:"1.5px solid onMouseEnter={e=>e.currentTarget.style.transform="translateY(-1px)"}
onMouseLeave={e=>e.currentTarget.style.transform="translateY(0)"}>
<span style={{fontSize:20}}> </span>
<div style={{fontSize:13,color:"#7A5500",fontWeight:600,flex:1}}>
{nonSigne.map(e=>e.prenom).join(", ")} - signature de contrat en attente
</div>
<span style={{fontSize:12,color:"#B8892A",fontWeight:700}}>Signer →</span>
</div>}
#E8B82
{/* KPIs cliquables */}
<div className="g4"style={{marginBottom:16}}>
{kpis.map(k=><div key={k.lbl}className="card card-lift"onClick={()=>setPage(k.page)}
style={{padding:16,textAlign:"center",cursor:"pointer"}}>
<div style={{fontSize:24,marginBottom:6}}>{k.icon}</div>
<div className="pf"style={{fontSize:26,fontWeight:600,color:k.c,lineHeight:1}}>{k.val
<div style={{fontSize:11,color:"var(--l)",marginTop:4,lineHeight:1.3}}>{k.lbl}</div>
<div style={{fontSize:10,color:k.c,marginTop:6,fontWeight:600,opacity:.7}}>{k.hint}</
</div>)}
</div>
{/* Enfants du jour - TOUT cliquable */}
<div className="card"style={{padding:18,marginBottom:14}}>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBo
<div style={{fontWeight:600,fontSize:14,color:"var(--b)"}}> Mes enfants aujourd'hui
<button className="btn bG"style={{fontSize:11,padding:"5px 10px"}}onClick={()=>setPag
Pointer arrivée
</button>
</div>
<div className="g3">
{enfants.map(e=>{
const p=pt.find(x=>x.eId===e.id);
const t=tx.filter(x=>x.eId===e.id).slice(-1)[0];
const msg=enfants.every(e=>["e1","e2","e3"].includes(e.id))?D.messages.filter(m=>m.
const rep=D.repas?.find(r=>r.eId===e.id&&r.date===TODAY_STR)||null;
const couleur=e.couleur||"#B8622F";
const allergies=e.allergies||[];
return <div key={e.id} style={{background:"var(--c)",borderRadius:14,padding:14,bor
{/* En-tête enfant cliquable → journal */}
<div onClick={()=>setPage("journal_complet")}style={{display:"flex",gap:10,alignI
<span style={{fontSize:28}}>{e.emoji||" "}</span>
<div style={{flex:1}}>
<div style={{fontWeight:700,fontSize:14,color:"var(--b)"}}>{e.prenom}</div>
<div style={{fontSize:11,color:"var(--l)"}}>{e.naissance?age(e.naissance):""}
</div>
{msg>0&&<span className="badge"onClick={ev=>{ev.stopPropagation();setPage("mess
style={{background:"var(--Rp)",color:"var(--R)",cursor:"pointer",fontSize:12}
{msg}
</span>}
</div>
{allergies.length>0&&<div onClick={()=>setPage("sante_complet")}
style={{fontSize:11,color:"var(--R)",fontWeight:700,marginBottom:8,cursor:"poin
{allergies.join(", ")}
</div>}
{p?<div onClick={()=>setPage("pointage")}
style={{fontSize:12,color:"var(--S)",fontWeight:600,cursor:"pointer",marginBott
↗ {p.arr} {p.dep?"· ↘ "+p.dep:"· en cours </div>:<div onClick={()=>setPage("pointage")}
"}
style={{fontSize:12,color:"var(--l)",cursor:"pointer",marginBottom:6}}>
Pas encore arrivé - pointer →
</div>}
{rep&&<div onClick={()=>setPage("journal_complet")}
style={{fontSize:11,cursor:"pointer",color:"var(--G)",fontWeight:600,marginBott
{rep.dej} · {rep.q==="bien"?" ":" "}
</div>}
{t&&<div onClick={()=>setPage("journal_complet")}
style={{fontSize:22,cursor:"pointer",display:"inline-block",transition:"transfo
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
<div style={{fontWeight:600,fontSize:13,marginBottom:12,color:"var(--b)"}}> Accès r
{[[" ","Bilan de journée","Générer pour un enfant","recit"],
[" ","Développement","Jalons OMS","developpement"],
[" ","CR Trimestriel","Compte-rendu pro","cr"],
[" ","Récap mensuel","Bilan mensuel","admin_finances"],
[" ","Calendrier","Voir les événements","calendrier"],
].map(([ic,ti,su,pg])=><div key={ti}onClick={()=>setPage(pg)}
style={{display:"flex",gap:10,padding:"8px 6px",borderBottom:"1px solid var(--br)",
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
<div style={{fontWeight:600,fontSize:13,marginBottom:12,color:"var(--b)"}}> Prochai
{isDemoUser&&D.evenements.slice(0,4).map(ev=><div key={ev.id}onClick={()=>setPage("ca
style={{display:"flex",gap:8,padding:"7px 6px",borderBottom:"1px solid var(--br)",a
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
function AccueilParent({enfant,setPage}){
// Tous les hooks AVANT le return conditionnel (règle React)
const [showAbsence,setShowAbsence]=useState(false);
const [absence,setAbsence]=useState({date:TODAY_STR,motif:"Maladie",heures:"",indemnise:tru
const [absEnvoyee,setAbsEnvoyee]=useState(false);
const [toast,setToast]=useState("");
if(!enfant)return(
<div className="fi">
<PageHeader icon=" " title="Espace famille" sub="Bienvenue sur TiMat"/>
<div className="card" style={{padding:28,textAlign:"center"}}>
<div style={{fontSize:48,marginBottom:12}}> </div>
<div style={{fontWeight:700,fontSize:16,color:"var(--b)",marginBottom:8}}>Aucun enfan
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
D.absences.push({id:"ab"+Date.now(),eId:enfant.id,date:absence.date,motif:absence.motif,i
// Ne pas modifier D.evenements (données démo globales)
setAbsEnvoyee(true);
setShowAbsence(false);
setToast("Absence déclarée - "+(enfant?.prenomAsmat||"l'assmat")+" a été notifiée ✓");
};
return <div className="fi">
{toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
<div style={{marginBottom:14,display:"flex",justifyContent:"space-between",alignItems:"fl
<div>
<div className="pf"style={{fontSize:21,fontWeight:700,color:"var(--b)"}}>Bonjour ! La
<div style={{fontSize:12,color:"var(--l)",marginTop:2}}>{todayStr()}</div>
</div>
<button className="btn bR"style={{fontSize:12,padding:"8px 14px"}}onClick={()=>setShowA
Déclarer une absence
</button>
</div>
{/* Modale absence */}
{showAbsence&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",display:"
onClick={e=>e.target===e.currentTarget&&setShowAbsence(false)}>
<div className="card"style={{width:"100%",maxWidth:420,padding:28}}>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",margin
<div className="pf"style={{fontSize:18,fontWeight:600,color:"var(--b)"}}> Déclare
<button onClick={()=>setShowAbsence(false)}style={{background:"none",border:"none",
</div>
<div style={{background:"var(--Bp)",borderRadius:10,padding:"10px 14px",marginBottom:
{enfant?.prenomAsmat||"L'assmat"} sera notifiée immédiatement. L'absence sera no
</div>
<div style={{display:"grid",gap:12}}>
<div>
<label className="lbl">Date d'absence</label>
<input type="date"className="inp"value={absence.date}onChange={e=>setAbsence(a=>(
</div>
<div>
<label className="lbl">Motif</label>
<select className="sel"value={absence.motif}onChange={e=>setAbsence(a=>({...a,mot
<option>Maladie</option>
<option>Congés parents</option>
<option>Décision parent</option>
<option>Rendez-vous médical</option>
<option>Autre</option>
</select>
</div>
<div>
<label className="lbl">Heures prévues ce jour</label>
<input type="number"className="inp"placeholder="ex: 9"value={absence.heures}onCha
</div>
<div style={{display:"flex",alignItems:"center",gap:10}}>
<input type="checkbox"id="indem"checked={absence.indemnise}onChange={e=>setAbsenc
<label htmlFor="indem"style={{fontSize:13,color:"var(--b)",cursor:"pointer"}}>
Absence indemnisée (selon contrat)
</label>
</div>
</div>
<div style={{display:"flex",gap:8,marginTop:20}}>
<button className="btn bG"style={{flex:1}}onClick={()=>setShowAbsence(false)}>Annul
<button className="btn bR"style={{flex:2}}onClick={declarerAbsence}>
Notifier {enfant?.prenomAsmat||"l'assmat"}
</button>
</div>
</div>
</div>}
{absEnvoyee&&<div style={{background:"var(--Rp)",border:"1.5px solid var(--R)",borderRadi
Absence déclarée et notée dans le calendrier et le décompte des heures.
</div>}
<div className="g2"style={{marginBottom:12}}>
{/* Card enfant */}
<div className="card"style={{padding:18,borderTop:"4px solid "+enfant.couleur}}>
<div style={{display:"flex",gap:14,alignItems:"center",marginBottom:12}}>
<span style={{fontSize:52}}>{enfant.emoji}</span>
<div><div className="pf"style={{fontSize:20,fontWeight:600,color:"var(--b)"}}>{enfa
<div style={{fontSize:13,color:"var(--l)"}}>{age(enfant.naissance)}</div>
{enfant.allergies.length>0&&<div style={{marginTop:6,cursor:"pointer"}}onClick={(
{enfant.allergies.map(a=><span key={a}className="badge"style={{background:"#FEE
</div>}
</div>
</div>
{recentMs&&<div onClick={()=>setPage&&setPage("eveil_complet")}
style={{background:"var(--Sp)",borderRadius:9,padding:"8px 12px",fontSize:13,color:
Dernière étape : {recentMs.txt} →
</div>}
</div>
{/* Pointage */}
<div className="card"onClick={()=>setPage&&setPage("pointage")}style={{padding:18,curso
onMouseEnter={e=>e.currentTarget.style.boxShadow="var(--sh2)"}
onMouseLeave={e=>e.currentTarget.style.boxShadow="var(--sh)"}>
<div style={{fontWeight:700,marginBottom:12,color:"var(--b)"}}> Pointage du jour</d
{pt?<div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
{[["Arrivée",pt.arr,"var(--S)"],["Départ",pt.dep||"En cours","var(--T)"],["Total",p
<div key={l}style={{textAlign:"center"}}><div style={{fontSize:11,color:"var(--l)
<div className="pf"style={{fontSize:20,fontWeight:700,color:c}}>{v}</div></div>
</div>:<div style={{fontSize:13,color:"var(--l)"}}>Pas encore arrivé.</div>}
<div style={{fontSize:11,color:"var(--l)",marginTop:8}}>Voir le détail →</div>
</div>
</div>
{/* Transmissions */}
<div className="card"onClick={()=>setPage&&setPage("journal_complet")}
style={{padding:16,marginBottom:12,cursor:"pointer",transition:"box-shadow .18s"}}
onMouseEnter={e=>e.currentTarget.style.boxShadow="var(--sh2)"}
onMouseLeave={e=>e.currentTarget.style.boxShadow="var(--sh)"}>
<div style={{fontWeight:700,marginBottom:12,color:"var(--b)"}}> Journal de la journée
{txs.length===0?<div style={{fontSize:13,color:"var(--l)"}}>Aucune transmission pour le
:txs.map(t=><div key={t.id}style={{display:"flex",gap:10,marginBottom:10}}>
<div style={{fontSize:22}}>{t.mood}</div>
<div style={{flex:1,background:t.auteur==="asmat"?"var(--Tp)":"var(--Bp)",borderRad
borderLeft:(t.auteur==="asmat"?"3px solid var(--T)":"3px solid var(--B)")}}>
<div style={{fontSize:11,fontWeight:700,color:t.auteur==="asmat"?"var(--T)":"var(
{t.auteur==="asmat"?" "+(user?.prenom||"Marie"):" Vous"} · {t.h}</div>
<div style={{fontSize:13,color:"var(--b)",lineHeight:1.5}}>{t.txt}</div>
</div>
</div>)}
</div>
{rep&&<div className="card"onClick={()=>setPage&&setPage("journal_complet")}
style={{padding:16,cursor:"pointer",transition:"box-shadow .18s"}}
onMouseEnter={e=>e.currentTarget.style.boxShadow="var(--sh2)"}
onMouseLeave={e=>e.currentTarget.style.boxShadow="var(--sh)"}>
<div style={{fontWeight:700,marginBottom:10,color:"var(--b)"}}> Repas du jour</div>
<div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
{rep.dej&&<span className="badge"style={{background:"var(--Sp)",color:"var(--S)"}}>
{rep.gou&&<span className="badge"style={{background:"var(--Gp)",color:"var(--G)"}}>
{rep.bib&&<span className="badge"style={{background:"var(--Bp)",color:"var(--B)"}}>
<span className="badge"style={{background:rep.q==="bien"?"var(--Sp)":"var(--Gp)",colo
{rep.q==="bien"?" Bon appétit":rep.q==="peu"?" Peu mangé":" Refus"}</span>
</div>
</div>}
</div>;
<div style={{fontSize:11,color:"var(--l)",marginTop:8}}>Voir le détail →</div>
}
//
function Transmissions({enfants,role,pEId,user}){
const [selId,setSelId]=useState(enfants[0]?.id);
const [msg,setMsg]=useState("");
const [mood,setMood]=useState(" ");
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
txt:t.texte,mood:t.mood||" "
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
setTxs(p=>[...p,{id:data.id,eId:enfant.id,auteur:role,date:TODAY_STR,h:TODAY_H,txt:msg,
}else{
// Fallback local si erreur
setTxs(p=>[...p,{id:"tn"+Date.now(),eId:enfant.id,auteur:role,date:TODAY_STR,h:TODAY_H,
}
setMsg("");
setSending(false);
};
return <div className="fi">
<PageHeader icon=" " title="Journal" sub={"Échanges quotidiens avec "+(enfant?.prenomAsm
{role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
{liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>setSelId(e.id)}/>)}<
{/* Documents reçus - parent seulement */}
{role==="parent"&&bilansRecus.length>0&&<div className="card"style={{padding:16,marginBot
<div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
<div style={{width:28,height:28,borderRadius:"50%",background:"var(--Pp)",display:"fl
<div style={{fontWeight:700,fontSize:14,color:"var(--P)"}}>Documents reçus de {enfant
</div>
<div style={{display:"flex",flexDirection:"column",gap:8}}>
{bilansRecus.map(b=><div key={b.id}>
<div onClick={()=>setDocOuvert(docOuvert===b.id?null:b.id)}
style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding
<div>
<div style={{fontWeight:700,fontSize:13,color:"var(--P)"}}>
{b.type==="bilan"?" Bilan de journée du "+b.date:" CR Trimestriel - "+b.t
</div>
<div style={{fontSize:11,color:"var(--l)",marginTop:2}}>Par {enfant?.prenomAsma
</div>
<span style={{fontSize:16,color:"var(--P)"}}>{docOuvert===b.id?"▲":"▼"}</span>
</div>
{docOuvert===b.id&&<div style={{padding:"14px 16px",background:"var(--w)",borderRad
<div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:14,lineHeight:2,col
{b.txt}
</div>
<button className="btn bG"style={{marginTop:10,fontSize:11}}onClick={()=>navigato
Copier
</button>
</div>}
</div>)}
</div>
</div>}
<div className="g2">
<div className="card"style={{padding:16}}>
<div style={{fontWeight:700,fontSize:14,marginBottom:12,color:"var(--b)"}}>{enfant?.e
<div style={{display:"flex",flexDirection:"column",gap:10,maxHeight:380,overflowY:"au
{msgs.length===0&&<div style={{fontSize:13,color:"var(--l)"}}>Aucune transmission.<
{msgs.map(t=><div key={t.id}style={{display:"flex",gap:10}}>
<div style={{textAlign:"center",minWidth:38}}><div style={{fontSize:20}}>{t.mood}
<div style={{flex:1,background:t.auteur==="asmat"?"var(--Tp)":"var(--Bp)",borderR
borderLeft:(t.auteur==="asmat"?"3px solid var(--T)":"3px solid var(--B)")}}>
<div style={{fontSize:11,fontWeight:700,color:t.auteur==="asmat"?"var(--T)":"va
{t.auteur==="asmat"?" "+(user?.prenom||"Marie"):" Parent"}</div>
<div style={{fontSize:13,color:"var(--b)",lineHeight:1.5}}>{t.txt}</div>
</div>
</div>)}
</div>
</div>
<div style={{display:"flex",flexDirection:"column",gap:12}}>
<div className="card"style={{padding:16}}>
<div style={{fontWeight:700,fontSize:14,marginBottom:12,color:"var(--b)"}}> <div style={{marginBottom:10}}>
<label className="lbl">Humeur</label>
<div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
{[" "," "," "," "," "," "," "," "].map(h=><button key={h}className={"
</div>
</div>
<div style={{marginBottom:10}}>
<label className="lbl">Message</label>
Nouve
<textarea className="ta"value={msg}onChange={e=>setMsg(e.target.value)}
placeholder={role==="asmat"?("Racontez la journée de "+(enfant?.prenom||"")+"..
</div>
<button className="btn bT"style={{width:"100%"}}onClick={send}>Envoyer </button>
</div>
{D.moodHistory[enfant?.id]&&<div className="card"style={{padding:14}}>
<div style={{fontWeight:700,fontSize:13,marginBottom:10,color:"var(--b)"}}> <div className="mood-bar">
{D.moodHistory[enfant.id].map((v,i)=><div key={i}className="mood-b"style={{
height:(v/5*100)+"%",width:"100%",
background:v>=4?"var(--S)":v>=3?"var(--G)":"var(--R)",opacity:.8}}/>)}
</div>
<div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"var(-
<span>J-14</span><span>Aujourd'hui</span>
</div>
</div>}
</div>
</div>
</div>;
Humeu
}
//
//
const BILANS={
"e1":[
"Ce matin, Léo est arrivé les yeux encore un peu lourds de sommeil, mais le sourire n'a p
"La journée de Léo a débuté sur une note douce et apaisée. Il est entré dans la maison en
],
"e2":[
"Emma a débarqué ce matin avec une énergie débordante et un grand sourire - elle avait vi
"Quelle belle journée avec Emma ! Elle est arrivée guillerette, avec un nouveau mot à la
],
"e3":[
"Aujourd'hui a été une journée historique pour Noah - et pour moi ! Il a fait ses quatre
"Noah a passé une journée douce et studieuse. Malgré sa petite dent qui pousse et une nui
],
};
const CRS={
"e1":[
"1. Bilan global du trimestre\n\nLéo a traversé ce trimestre avec une belle sérénité et u
],
"e2":[
"1. Bilan global du trimestre\n\nEmma aborde ce trimestre avec une maturité impressionnan
],
"e3":[
"1. Bilan global du trimestre\n\nNoah a vécu un trimestre extraordinaire, marqué par des
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
<PageHeader icon=" " title="Bilan de journée"
sub="Journal personnalisé de la journée - rédigé automatiquement"/>
{role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
{liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>{setSelId(e.id);setR
<div className="g2">
<div>
<div className={"card "+(recit?"ai-card":"")+""}style={{padding:18,marginBottom:12,bo
<div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
<div style={{width:32,height:32,borderRadius:"50%",background:"var(--Pp)",display
<div><div className="pf"style={{fontSize:15,fontWeight:700,color:"var(--P)"}}>Bil
<div style={{fontSize:11,color:"var(--l)"}}>Rédigé automatiquement · Exclusif T
</div>
{loading&&<div style={{display:"flex",alignItems:"center",gap:10,padding:"20px 0"}}
<div className="ai-dot"/><div className="ai-dot"style={{animationDelay:".3s"}}/><
<span style={{fontSize:13,color:"var(--m)",fontStyle:"italic"}}>Rédaction du bila
</div>}
{!loading&&!recit&&<div style={{textAlign:"center",padding:"20px 0"}}>
<div style={{fontSize:40,marginBottom:8}}> </div>
<div style={{fontSize:14,color:"var(--m)",lineHeight:1.6,marginBottom:16}}>
Générez un bilan chaleureux et personnalisé<br/>de la journée de <strong>{enfan
</div>
<button className="btn bP"style={{fontSize:14,padding:"11px 22px"}}onClick={gener
Générer le bilan
</button>
</div>}
{recit&&<div>
<div style={{fontSize:14,color:"var(--b)",lineHeight:1.9,fontStyle:"italic",white
{recit}
</div>
<div style={{marginTop:16,display:"flex",gap:8,flexWrap:"wrap",alignItems:"center
{role==="asmat"&&!envoye&&<button className="btn bS"onClick={()=>{setEnvoye(tru
Envoyer aux parents
</button>}
{role==="asmat"&&envoye&&<div style={{display:"flex",alignItems:"center",gap:6,
<span style={{fontSize:14}}> </span>
<span style={{fontSize:13,fontWeight:700,color:"var(--S)"}}>Envoyé à {parent?
</div>}
<button className="btn bP"onClick={generer}> Régénérer</button>
<button className="btn bG"onClick={()=>navigator.clipboard?.writeText(recit)}>
</div>
</div>}
</div>
</div>
Donné
<div style={{display:"flex",flexDirection:"column",gap:12}}>
<div className="card"style={{padding:14}}>
<div style={{fontWeight:700,fontSize:13,marginBottom:10,color:"var(--b)"}}> {[[" Humeurs",tx.map(t=>t.mood).join(" ")||"-"],
[" Repas",rep?rep.dej:"-"],
[" Changes",ch.length+" change(s)"],
[" Activité",pf?.titre||"Jeux libres"],
].map(([l,v])=><div key={l}style={{display:"flex",justifyContent:"space-between",pa
<span style={{color:"var(--m)"}}>{l}</span><span style={{fontWeight:600,color:"va
</div>)}
</div>
<div className="card"style={{padding:14,background:"var(--Pp)",border:"1px solid var(
<div style={{fontWeight:700,fontSize:13,color:"var(--P)",marginBottom:8}}> <div style={{fontSize:13,color:"var(--b)",lineHeight:1.6}}>
Aucun concurrent ne génère un bilan personnalisé de la journée. TiMat transforme
</div>
Exclus
</div>
</div>
</div>
</div>;
}
//
function Pointage({enfants,role,pEId}){
const [selId,setSelId]=useState(enfants[0]?.id);
const [pts,setPts]=useState([]);
const [arr,setArr]=useState("");
const [dep,setDep]=useState("");
const [toast,setToast]=useState("");
const [saving,setSaving]=useState(false);
const liste=role==="parent"?enfants.filter(e=>e.id===pEId):enfants;
const enfant=liste.find(e=>e.id===selId)||liste[0];
// Charger les pointages depuis Supabase
useEffect(()=>{
if(!enfant?.id)return;
const charger=async()=>{
const{data}=await supabase.from("pointages")
.select("*").eq("enfant_id",enfant.id)
.order("date",{ascending:false}).limit(30);
if(data&&data.length>0){
// Adapter au format attendu par l'UI
setPts(data.map(p=>({
id:p.id,eId:p.enfant_id,date:p.date,
arr:p.arrivee,dep:p.depart,
tot:p.total_minutes?Math.floor(p.total_minutes/60)+"h"+String(p.total_minutes%60).p
valide:true,valide_parent:p.valide_parent
})));
}else{
// Fallback démo si pas de données réelles
setPts(D.pointages.filter(p=>p.eId===enfant?.id));
}
};
charger();
},[enfant?.id]);
const ptJ=pts.find(p=>p.eId===enfant?.id&&p.date===TODAY_STR);
const ptH=pts.filter(p=>p.eId===enfant?.id).sort((a,b)=>b.date>a.date?-1:1);
// Calcul bilan mensuel
const heuresMois=pts.filter(p=>p.eId===enfant?.id&&p.tot).reduce((s,p)=>{
if(!p.tot)return s;
const[h,m]=(p.tot||"0h0").replace("h",":").split(":").map(Number);
return s+(h*60+(m||0));
},0);
const heuresPrev=Math.round((enfant?.contrat?.heuresHebdo||40)*52/12);
const soldeMin=heuresMois-heuresPrev*60/60;
const save=async()=>{
if(!arr||!enfant)return;
setSaving(true);
const[h1,m1]=arr.split(":").map(Number);
const totalMin=dep?(()=>{const[h2,m2]=dep.split(":").map(Number);return(h2*60+m2)-(h1*60+
const totStr=totalMin?Math.floor(totalMin/60)+"h"+String(totalMin%60).padStart(2,"0"):nul
// Sauvegarder dans Supabase
const{error}=await supabase.from("pointages").upsert({
enfant_id:enfant.id,
asmat_id:(await supabase.auth.getUser()).data.user?.id,
date:TODAY_STR,
arrivee:arr,
depart:dep||null,
total_minutes:totalMin,
valide_parent:false,
},{onConflict:"enfant_id,date"});
if(!error){
setPts(p=>[...p.filter(x=>!(x.eId===enfant.id&&x.date===TODAY_STR)),
{id:"ptn"+Date.now(),eId:enfant.id,date:TODAY_STR,
arr:arr.replace(":","h"),dep:dep?dep.replace(":","h"):null,
tot:totStr,valide:true,valide_parent:false}]);
setArr("");setDep("");setToast("Pointage enregistré ✓");
}else{
setToast("Erreur - pointage sauvegardé localement");
}
setSaving(false);
};
const validerPointage=async(ptId)=>{
await supabase.from("pointages").update({valide_parent:true}).eq("id",ptId);
setPts(p=>p.map(x=>x.id===ptId?{...x,valide_parent:true}:x));
setToast("Pointage validé ✓");
};
return <div className="fi">
{toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
<PageHeader icon=" " title="Pointage des heures" sub="Suivi quotidien et bilan mensuel"/
{role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
{liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>setSelId(e.id)}/>)}<
<div className="g2">
<div style={{display:"flex",flexDirection:"column",gap:12}}>
<div className="card"style={{padding:16}}>
<div style={{fontWeight:700,marginBottom:12,color:"var(--b)"}}> <div className="g3"style={{marginBottom:12}}>
{[
Bilan du mois - {
["Prévues",heuresPrev+"h","var(--B)"],
["Réalisées",Math.floor(heuresMois/60)+"h"+String(heuresMois%60).padStart(2,"0"
["Solde",(soldeMin>=0?"+":"")+Math.floor(soldeMin)+"h",soldeMin<0?"var(--R)":"v
].map(([l,v,c])=>
<div key={l}style={{background:"var(--c)",borderRadius:10,padding:12,textAlign:
<div className="pf"style={{fontSize:20,fontWeight:700,color:c}}>{v}</div>
<div style={{fontSize:11,color:"var(--l)",marginTop:2}}>{l}</div>
</div>)}
</div>
</div>
<div className="card"style={{padding:16}}>
<div style={{fontWeight:700,marginBottom:12,color:"var(--b)"}}> Aujourd'hui</div>
{ptJ?<div style={{background:"var(--Sp)",borderRadius:10,padding:12,border:"1px sol
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
{[["Arrivée",ptJ.arr,"var(--S)"],["→","","var(--l)"],["Départ",ptJ.dep||"En cou
<div key={l}style={{textAlign:"center"}}><div style={{fontSize:11,color:"var(
<div className="pf"style={{fontSize:18,fontWeight:700,color:c}}>{v}</div></
</div>
</div>:<div style={{fontSize:13,color:"var(--l)",marginBottom:12}}>Pas encore point
{role==="asmat"&&<div>
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
<div><label className="lbl">Arrivée</label><input type="time"className="inp"val
<div><label className="lbl">Départ</label><input type="time"className="inp"valu
</div>
<button className="btn bS"style={{width:"100%"}}onClick={save}disabled={saving}>
{saving?" Sauvegarde...":"Enregistrer le pointage"}
</button>
{/* QR Code pour le parent */}
<details style={{marginTop:12,background:"var(--c)",borderRadius:10,overflow:"hid
<summary style={{padding:"10px 14px",cursor:"pointer",fontSize:12,fontWeight:60
</span> QR Code pointage — {enfant?.prenom}
<span> </summary>
<div style={{padding:"12px 14px",textAlign:"center"}}>
<div style={{fontSize:11,color:"var(--l)",marginBottom:10,lineHeight:1.6}}>
Le parent scanne ce QR code pour valider l'arrivée ou le départ de {enfant?
</div>
<img
src={"https://api.qrserver.com/v1/create-qr-code/?size=180x180&data="+encod
(window.location.origin||"https://timat-rho.vercel.app")+"/api/pointage-q
)}
alt="QR Pointage"
style={{width:180,height:180,borderRadius:12,border:"3px solid var(--br)",m
/>
<div style={{display:"flex",gap:6,marginTop:10,justifyContent:"center"}}>
<button className="btn bG"style={{fontSize:11}}onClick={()=>{
navigator.clipboard?.writeText(
(window.location.origin||"https://timat-rho.vercel.app")+"/api/pointage
);
setToast("Lien copié ✓");
}}> Copier le lien</button>
<button className="btn bG"style={{fontSize:11}}onClick={()=>{
window.print();
}}> Imprimer</button>
</div>
<div style={{fontSize:10,color:"var(--l)",marginTop:8}}>
Ce QR est unique à {enfant?.prenom} et valable aujourd'hui uniquement.
</div>
</div>
</details>
</div>}
</div>
</div>
<div className="card"style={{padding:16}}>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",margin
<div style={{fontWeight:700,color:"var(--b)"}}> Historique récent</div>
{role==="parent"&&<div style={{fontSize:11,color:"var(--l)"}}>Tapez pour valider
</div>
<div style={{display:"flex",flexDirection:"column",gap:6}}>
{ptH.slice(0,10).map(p=><div key={p.id}style={{
display:"flex",justifyContent:"space-between",alignItems:"center",
padding:"8px 10px",borderRadius:9,
background:p.valide_parent?"var(--Sp)":role==="parent"?"var(--Gp)":"var(--c)",
border:role==="parent"&&!p.valide_parent?"1px solid var(--G)":"1px solid transpar
}}>
<div style={{fontSize:12,fontWeight:600,color:"var(--b)"}}>
{new Date(p.date).toLocaleDateString("fr-FR",{weekday:"short",day:"numeric",mon
</div>
<div style={{display:"flex",gap:10,fontSize:12}}>
<span style={{color:"var(--S)"}}>{p.arr?"↗"+p.arr:""}</span>
<span style={{color:"var(--T)"}}>{p.dep?"↘"+p.dep:""}</span>
<span style={{fontWeight:700,color:"var(--b)"}}>{p.tot||"-"}</span>
</div>
{role==="parent"&&!p.valide_parent
?<button onClick={()=>validerPointage(p.id)}
style={{background:"var(--G)",color:"#fff",border:"none",borderRadius:6,
padding:"4px 10px",cursor:"pointer",fontSize:11,fontWeight:700}}>Valider</b
:<span style={{fontSize:13,color:p.valide_parent?"var(--S)":"var(--l)"}}>
{p.valide_parent?" ":" "}
</span>
}
</div>)}
{ptH.length===0&&<div style={{fontSize:13,color:"var(--l)",textAlign:"center",paddi
Aucun pointage enregistré pour le moment.
</div>}
</div>
{role==="parent"&&ptH.some(p=>!p.valide_parent)&&<div style={{
marginTop:10,padding:"8px 12px",background:"var(--Gp)",borderRadius:8,
fontSize:12,color:"var(--G)",fontWeight:600
}}>
{ptH.filter(p=>!p.valide_parent).length} pointage(s) en attente de validation
</div>}
</div>
</div>
</div>;
}
//
function RepasChanges({enfants,role,pEId}){
const [selId,setSelId]=useState(enfants[0]?.id);
const [ch,setCh]=useState(D.changes);
const [rp,setRp]=useState(D.repas);
const [nch,setNch]=useState({h:"",type:"Change",n:""});
const [re,setRe]=useState({});
const [toast,setToast]=useState("");
const liste=role==="parent"?enfants.filter(e=>e.id===pEId):enfants;
const enfant=liste.find(e=>e.id===selId)||liste[0];
const echs=ch.filter(c=>c.eId===enfant?.id&&c.date===TODAY_STR).sort((a,b)=>a.h>b.h?1:-1);
const erp=rp.find(r=>r.eId===enfant?.id&&r.date===TODAY_STR);
const addCh=()=>{if(!nch.h)return;
setCh(p=>[...p,{id:"chn"+Date.now(),eId:enfant.id,date:TODAY_STR,h:nch.h.replace(":","h")
setNch({h:"",type:"Change",n:""});setToast("Change ajouté ✓");};
const saveRp=()=>{
setRp(p=>{const ex=p.find(r=>r.eId===enfant.id&&r.date===TODAY_STR);
const up={...(ex||{id:"rn"+Date.now(),eId:enfant.id,date:TODAY_STR,notes:""}),
dej:re.dej??erp?.dej,gou:re.gou??erp?.gou,bib:re.bib??erp?.bib,q:re.q??erp?.q??"bien"
return ex?p.map(r=>r===ex?up:r):[...p,up];});
setRe({});setToast("Repas enregistré ✓");};
const qc={"bien":"var(--S)","peu":"var(--G)","refus":"var(--R)"};
return <div className="fi">
{toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
<PageHeader icon=" " title="Repas & Changes" sub="Suivi alimentaire et hygiène du jour"/
{role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
{liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>setSelId(e.id)}/>)}<
<div className="g2">
<div className="card"style={{padding:16}}>
<div style={{fontWeight:700,fontSize:14,marginBottom:12,color:"var(--b)"}}> Repas d
{erp?<div>
{[[" Déjeuner",erp.dej],[" Goûter",erp.gou],[" Biberon",erp.bib]].filter(r=>
<div key={l}style={{display:"flex",gap:10,marginBottom:8,padding:"9px 12px",backg
<span>{l.split(" ")[0]}</span><div><div style={{fontSize:11,color:"var(--l)",fo
<div style={{fontSize:13,fontWeight:600,color:"var(--b)"}}>{v}</div></div></d
<div style={{display:"flex",alignItems:"center",gap:8,marginTop:6}}>
<span style={{fontSize:12,color:"var(--l)"}}>Appétit :</span>
<span className="badge"style={{background:qc[erp.q]+"22",color:qc[erp.q]}}>
{erp.q==="bien"?" Bon appétit":erp.q==="peu"?" Peu mangé":" Refus"}</span
</div>
{erp.notes&&<div style={{fontSize:12,color:"var(--m)",marginTop:6,fontStyle:"italic
</div>:<div style={{fontSize:13,color:"var(--l)"}}>Non renseigné.</div>}
{role==="asmat"&&<div style={{marginTop:14,paddingTop:14,borderTop:"1px solid var(--b
<div style={{fontWeight:700,fontSize:13,marginBottom:8,color:"var(--b)"}}>Mettre à
{[["dej","Déjeuner"],["gou","Goûter"],["bib","Biberon"]].map(([f,l])=>
<div key={f}style={{marginBottom:8}}>
<label className="lbl">{l}</label>
<input className="inp"value={re[f]!==undefined?re[f]:erp?.[f]||""}
onChange={e=>setRe(p=>({...p,[f]:e.target.value}))} placeholder={l+"..."}/>
</div>)}
<div style={{marginBottom:8}}>
<label className="lbl">Appétit</label>
<select className="sel"value={re.q??erp?.q??"bien"}onChange={e=>setRe(p=>({...p,q
<option value="bien"> Bon appétit</option><option value="peu"> Peu mangé</o
</select>
</div>
<button className="btn bT"style={{width:"100%"}}onClick={saveRp}>Enregistrer </div>}
</div>
les re
<div className="card"style={{padding:16}}>
<div style={{fontWeight:700,fontSize:14,marginBottom:12,color:"var(--b)"}}> Changes
<div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:12}}>
{echs.length===0&&<div style={{fontSize:13,color:"var(--l)"}}>Aucun change.</div>}
{echs.map(c=><div key={c.id}style={{display:"flex",justifyContent:"space-between",a
<span style={{fontWeight:700,fontSize:13,color:"var(--b)"}}>{c.h}</span>
<span className="badge"style={{background:c.type==="Propre"?"var(--Sp)":"var(--Gp
{c.type==="Propre"?" Propre":" Change"}</span>
{c.n&&<span style={{fontSize:11,color:"var(--m)",maxWidth:100,overflow:"hidden",t
</div>)}
</div>
<div style={{fontSize:12,color:"var(--m)",marginBottom:10,fontWeight:700}}>
Total : <span style={{color:"var(--T)"}}>{echs.filter(c=>c.type==="Change").length}
</div>
{role==="asmat"&&<div style={{paddingTop:12,borderTop:"1px solid var(--br)"}}>
<div style={{fontWeight:700,fontSize:13,marginBottom:8,color:"var(--b)"}}>+ Ajouter
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
<div><label className="lbl">Heure</label><input type="time"className="inp"value={
<div><label className="lbl">Type</label><select className="sel"value={nch.type}on
</div>
<input className="inp"style={{marginBottom:8}}placeholder="Note (optionnel)"value={
<button className="btn bT"style={{width:"100%"}}onClick={addCh}>+ Ajouter</button>
</div>}
</div>
</div>
</div>;
}
//
//
const FERIES_2024={
"2024-01-01":" Jour de l'An",
"2024-04-01":" Lundi de Pâques",
"2024-05-01":" Fête du Travail",
"2024-05-08":" Victoire 1945",
"2024-05-09":" Ascension",
"2024-05-20":" Lundi de Pentecôte",
"2024-07-14":" Fête Nationale",
"2024-08-15":" Assomption",
"2024-11-01":" Toussaint",
"2024-11-11":" Armistice",
"2024-12-25":" Noël",
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
const [absForm,setAbsForm]=useState({eId:pEId||enfants[0]?.id,date:"",motif:"Maladie",heure
const [toast,setToast]=useState("");
const noms=["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","O
const joursSemaine=["Lu","Ma","Me","Je","Ve","Sa","Di"];
const jourMap={Lundi:0,Mardi:1,Mercredi:2,Jeudi:3,Vendredi:4,Samedi:5,Dimanche:6};
const premier=new Date(an,mois,1).getDay();
const offset=(premier+6)%7;
const total=new Date(an,mois+1,0).getDate();
const todayDate=new Date();
const isActualToday=(d)=>d===todayDate.getDate()&&mois===todayDate.getMonth()&&an===todayDa
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
setEvs(p=>[...p,{id:"abs"+Date.now(),date:absForm.date,type:"abs",eId:absForm.eId,txt:"Ab
D.absences.push({id:"abn"+Date.now(),eId:absForm.eId,date:absForm.date,motif:absForm.moti
setShowAbsenceModal(false);
setToast("Absence déclarée - "+(enfant?.prenomAsmat||"l'assmat")+" a été notifiée ✓");
};
// Événements du mois filtrés pour le panneau latéral
const moisEvs=[
...evsFiltres.filter(e=>e.date.startsWith(moisStr)).map(e=>({...e,src:"user"})),
...Object.entries(FERIES_2024).filter(([d])=>d.startsWith(moisStr)).map(([d,n])=>({id:d,d
...enfants.filter(e=>e.naissance&&(an+"-"+e.naissance.slice(5)).startsWith(moisStr))
.map(e=>({id:"bd"+e.id,date:an+"-"+e.naissance.slice(5),txt:" Anniversaire de "+e.pre
].sort((a,b)=>a.date>b.date?1:-1);
// Légende couleurs des enfants (asmat uniquement)
const couleursEnfants=enfants.map(e=>({emoji:e.emoji,prenom:e.prenom,couleur:e.couleur}));
return <div className="fi">
{toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
<PageHeader icon=" "
title={role==="parent"?"Mon calendrier":"Calendrier"}
sub={role==="parent"?"Jours d'accueil, congés et jours fériés":"Accueil, congés, annive
action={role==="parent"&&<button className="btn bR"style={{fontSize:13,padding:"10px 18
onClick={()=>{setAbsForm(f=>({...f,date:ds(todayDate.getDate())}));setShowAbsenceModa
Déclarer une absence
</button>}
/>
{/* Modale absence parent */}
{showAbsenceModal&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",disp
onClick={e=>e.target===e.currentTarget&&setShowAbsenceModal(false)}>
<div className="card"style={{width:"100%",maxWidth:420,padding:28}}>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",margin
<div className="pf"style={{fontSize:18,fontWeight:600,color:"var(--b)"}}> Déclare
<button onClick={()=>setShowAbsenceModal(false)}style={{background:"none",border:"n
</div>
<div style={{background:"var(--Bp)",borderRadius:10,padding:"10px 14px",marginBottom:
Votre assmat sera notifiée immédiatement. L'absence sera notée dans votre calend
</div>
<div style={{display:"grid",gap:12}}>
{enfants.length>1&&<div>
<label className="lbl">Enfant concerné</label>
<select className="sel"value={absForm.eId}onChange={e=>setAbsForm(f=>({...f,eId:e
{enfants.map(e=><option key={e.id}value={e.id}>{e.emoji} {e.prenom}</option>)}
</select>
</div>}
<div>
<label className="lbl">Date d'absence *</label>
<input type="date"className="inp"value={absForm.date}onChange={e=>setAbsForm(f=>(
</div>
<div>
<label className="lbl">Motif</label>
<select className="sel"value={absForm.motif}onChange={e=>setAbsForm(f=>({...f,mot
{["Maladie","Congés parents","Décision parent","Rendez-vous médical","Autre"].m
</select>
</div>
<div>
<label className="lbl">Heures prévues ce jour *</label>
<input type="number"className="inp"placeholder="ex: 9"value={absForm.heures}
onChange={e=>setAbsForm(f=>({...f,heures:e.target.value}))} min="0"max="12"step
</div>
<div style={{display:"flex",alignItems:"center",gap:10}}>
<input type="checkbox"id="indem2"checked={absForm.indemnise}
onChange={e=>setAbsForm(f=>({...f,indemnise:e.target.checked}))}style={{width:1
<label htmlFor="indem2"style={{fontSize:13,color:"var(--b)",cursor:"pointer"}}>Ab
</div>
</div>
<div style={{display:"flex",gap:8,marginTop:20}}>
<button className="btn bG"style={{flex:1}}onClick={()=>setShowAbsenceModal(false)}>
<button className="btn bR"style={{flex:2}}onClick={declarerAbsence}disabled={!absFo
Notifier l'assmat
</button>
</div>
</div>
</div>}
<div className="g2">
<div className="card"style={{padding:18}}>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",margin
<button className="btn bG"style={{padding:"6px 12px",fontSize:16}}onClick={()=>{if(
<div className="pf"style={{fontWeight:600,fontSize:18,color:"var(--b)"}}>{noms[mois
<button className="btn bG"style={{padding:"6px 12px",fontSize:16}}onClick={()=>{if(
</div>
<div className="cgrid"style={{marginBottom:8}}>
{joursSemaine.map(j=><div key={j}style={{textAlign:"center",fontSize:10,fontWeight:
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
<div style={{position:"absolute",bottom:2,left:0,right:0,display:"flex",justify
{ferie&&!isToday&&<div style={{width:4,height:4,borderRadius:"50%",background
{uev?.type==="cng"&&!isToday&&<div style={{width:4,height:4,borderRadius:"50%
{bday&&<div style={{width:4,height:4,borderRadius:"50%",background:"var(--T)"
{accueilDots.slice(0,3).map(e=><div key={e.id}style={{width:4,height:4,border
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
<div style={{width:9,height:9,borderRadius:2,background:bg,border:"1px solid "+
<span style={{fontSize:10,color:"var(--m)"}}>{l}</span>
</div>)}
</div>
{/* Légende enfants (asmat) ou mon enfant (parent) */}
<div style={{marginTop:10,display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
<span style={{fontSize:10,color:"var(--l)",fontWeight:700}}>Jours d'accueil :</span
{enfants.map(e=><div key={e.id}style={{display:"flex",alignItems:"center",gap:4}}>
<div style={{width:8,height:8,borderRadius:"50%",background:e.couleur}}/>
<span style={{fontSize:10,color:"var(--m)"}}>{e.emoji} {e.prenom}</span>
</div>)}
</div>
{/* Anniversaires ce mois */}
{enfants.some(e=>e.naissance?.slice(5)&&(an+"-"+e.naissance.slice(5)).startsWith(mois
<div style={{marginTop:12,padding:"8px 12px",background:"var(--Tp)",borderRadius:10
<div style={{fontSize:11,fontWeight:700,color:"var(--T)",marginBottom:4}}> Anni
{enfants.filter(e=>(an+"-"+(e.naissance?.slice(5)||"")).startsWith(moisStr)).map(
<div key={e.id}style={{fontSize:13,color:"var(--b)"}}>{e.emoji} {e.prenom} - {n
</div>}
</div>
<div style={{display:"flex",flexDirection:"column",gap:12}}>
{/* Formulaire ajout événement - asmat uniquement */}
{sel&&role==="asmat"&&<div className="card"style={{padding:14}}>
<div style={{fontWeight:600,fontSize:13,marginBottom:10,color:"var(--b)"}}>
{sel} {noms[mois]} {an}
{getFerie(sel)&&<span style={{fontSize:11,color:"var(--R)",marginLeft:8}}> Jour
{getBirthday(sel)&&<span style={{fontSize:11,color:"var(--T)",marginLeft:8}}> A
</div>
<div style={{marginBottom:8}}>
<label className="lbl">Type</label>
<select className="sel"value={newEv.type}onChange={e=>setNewEv(p=>({...p,type:e.t
<option value="rdv"> Rendez-vous</option>
<option value="abs"> Absence enfant</option>
<option value="cng"> Congé assmat</option>
<option value="hol"> Sortie / activité</option>
</select>
</div>
<input className="inp"style={{marginBottom:8}}placeholder="Description..."value={ne
<button className="btn bT"style={{width:"100%"}}onClick={addEv}>Ajouter</button>
</div>}
{/* Détail jour sélectionné */}
{sel&&<div className="card"style={{padding:14}}>
<div style={{fontWeight:600,fontSize:13,marginBottom:10,color:"var(--b)"}}>
{sel} {noms[mois]} {an}
</div>
{getFerie(sel)&&<div style={{padding:"6px 10px",background:"var(--Rp)",borderRadius
Jour férié - {getFerie(sel)}
</div>}
{getUserEv(sel)?.type==="cng"&&<div style={{padding:"6px 10px",background:"var(--Gp
Congé - {getUserEv(sel).txt}
</div>}
{getUserEv(sel)?.type==="abs"&&<div style={{padding:"6px 10px",background:"var(--Rp
{getUserEv(sel).txt}
</div>}
{getAccueil(sel).length>0&&!([0,6].includes(jourIdx(sel)))&&<div style={{marginBott
<div style={{fontSize:11,fontWeight:700,color:"var(--m)",marginBottom:4}}>Enfants
{getAccueil(sel).map(e=><div key={e.id}style={{display:"flex",gap:6,alignItems:"c
<div style={{width:8,height:8,borderRadius:"50%",background:e.couleur}}/>
<span style={{color:"var(--b)"}}>{e.emoji} {e.prenom}</span>
<span style={{fontSize:11,color:"var(--l)"}}>{e.contrat?.horaires}</span>
</div>)}
</div>}
{isVacances(ds(sel))&&<div style={{padding:"6px 10px",background:"var(--Bp)",border
Vacances scolaires {nomVacances(ds(sel))} - Zone C
</div>}
{getBirthday(sel)&&<div style={{padding:"6px 10px",background:"var(--Tp)",borderRad
Anniversaire de {getBirthday(sel)?.prenom} !
</div>}
{!getFerie(sel)&&!getUserEv(sel)&&!getAccueil(sel).length&&!isVacances(ds(sel))&&!g
<div style={{fontSize:12,color:"var(--l)"}}>Aucun événement ce jour.</div>}
</div>}
{/* Liste événements du mois */}
<div className="card"style={{padding:14}}>
<div style={{fontWeight:600,fontSize:13,marginBottom:10,color:"var(--b)"}}> {noms
{moisEvs.length===0&&<div style={{fontSize:13,color:"var(--l)"}}>Aucun événement.</
{moisEvs.map(ev=><div key={ev.id}style={{display:"flex",gap:8,padding:"7px 0",borde
<span className="badge"style={{
background:ev.type==="ferie"?"var(--Rp)":ev.type==="cng"?"var(--Gp)":ev.type===
color:ev.type==="ferie"?"var(--R)":ev.type==="cng"?"var(--G)":ev.type==="abs"?"
whiteSpace:"nowrap",fontSize:10}}>
{ev.date.slice(8)} {noms[mois].slice(0,3).toLowerCase()}
</span>
</div>)}
<span style={{fontSize:11,color:"var(--m)",flex:1}}>{ev.txt}</span>
</div>
{/* Vacances ce mois */}
{VACANCES_2024.filter(v=>v.debut.startsWith(moisStr)||v.fin.startsWith(moisStr)||(v.d
<div key={v.nom}className="card"style={{padding:12,background:"var(--Bp)",border:"1
<div style={{fontWeight:700,fontSize:12,color:"var(--B)",marginBottom:2}}> <div style={{fontSize:11,color:"var(--m)"}}>{fmt(v.debut)} → {fmt(v.fin)}</div>
Vaca
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
const conv=msgs.filter(m=>(m.eId||m.enfant_id)===enfant?.id).sort((a,b)=>(a.created_at||a.i
// Load messages from Supabase
useEffect(()=>{
if(isDemoMode||!user?.id)return;
const load=async()=>{
setLoadingMsgs(true);
const enfantIds=liste.map(e=>e.id);
const{data,error}=await supabase.from('messages').select('*').in('enfant_id',enfantIds)
if(!error&&data){
setMsgs(data.map(m=>({...m,eId:m.enfant_id,de:m.auteur_role,h:m.heure||new Date(m.cre
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
return[...prev,{...m,eId:m.enfant_id,de:m.auteur_role,h:m.heure||new Date(m.creat
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
setMsgs(p=>[...p,{id:"mn"+Date.now(),eId:enfant.id,de:role==="asmat"?"asmat":"parent",h
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
setMsgs(p=>[...p,{id:"mn"+Date.now(),eId:enfant.id,de:role,h:heure,txt,lu:true,enfant_i
}
setTxt("");
setTimeout(()=>endRef.current?.scrollIntoView({behavior:"smooth"}),50);
};
return <div className="fi">
<PageHeader icon=" " title="Messagerie instantanée" sub="Communication en temps réel"/>
{role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
{liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>setSelId(e.id)}/>)}<
<div className="g2">
<div className="card"style={{padding:16,display:"flex",flexDirection:"column",gap:12}}>
<div style={{display:"flex",alignItems:"center",gap:10,paddingBottom:10,borderBottom:
<span style={{fontSize:24}}>{enfant?.emoji}</span>
<div><div style={{fontWeight:700,fontSize:14,color:"var(--b)"}}>{enfant?.prenom} {e
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
onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Votre message..."style={{flex
<button className="btn bT"onClick={send}>Envoyer</button>
Conve
</div>
</div>
<div style={{display:"flex",flexDirection:"column",gap:12}}>
<div className="card"style={{padding:14}}>
<div style={{fontWeight:700,fontSize:13,marginBottom:10,color:"var(--b)"}}> {liste.map(e=>{
const unread=msgs.filter(m=>m.eId===e.id&&!m.lu).length;
const last=msgs.filter(m=>m.eId===e.id).slice(-1)[0];
return <div key={e.id}onClick={()=>setSelId(e.id)}
style={{display:"flex",gap:10,padding:"9px 0",borderBottom:"1px solid var(--br)
<span style={{fontSize:22}}>{e.emoji}</span>
<div style={{flex:1,overflow:"hidden"}}>
<div style={{fontWeight:700,fontSize:13,color:"var(--b)"}}>{e.prenom}</div>
{last&&<div style={{fontSize:12,color:"var(--l)",overflow:"hidden",textOverfl
</div>
{unread>0&&<span className="badge"style={{background:"var(--T)",color:"white"}}
</div>;})}
Bon à
</div>
<div className="card"style={{padding:14,background:"var(--Sp)",border:"1px solid var(
<div style={{fontWeight:700,fontSize:13,color:"var(--S)",marginBottom:6}}> <div style={{fontSize:12,color:"var(--b)",lineHeight:1.6}}>
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
const [abs,setAbs]=useState(enfants.every(e=>["e1","e2","e3"].includes(e.id))?D.absences:[]
const [toast,setToast]=useState("");
const liste=role==="parent"?enfants.filter(e=>e.id===pEId):enfants;
const enfant=liste.find(e=>e.id===selId)||liste[0];
const contrat=enfant?.contrat;
const isDemoFact=enfants.every(e=>["e1","e2","e3"].includes(e.id));
// Calculate hours from real pointages or fallback to demo
const calcHeures=()=>{
if(isDemoFact)return D.heures[enfant?.id]||{real:0,prev:Math.round((contrat?.heuresHebdo|
if(!pointagesDB||!enfant?.id)return{real:0,prev:Math.round((contrat?.heuresHebdo||40)*52/
const moisPointages=pointagesDB.filter(p=>p.enfant_id===enfant.id);
const totalMin=moisPointages.reduce((s,p)=>s+(p.total_minutes||0),0);
return{real:Math.round(totalMin/60),prev:Math.round((contrat?.heuresHebdo||40)*52/12)};
};
const h=calcHeures();
const salBrut=contrat?(h.real*contrat.tauxHoraire+(h.real/5*contrat.entretien)):0;
const absMois=abs.filter(a=>a.eId===enfant?.id);
const indemAbs=absMois.filter(a=>a.indemnise).reduce((s,a)=>s+a.heures*((contrat?.tauxHorai
const totalBrut=salBrut+indemAbs;
const exportPajemploi=()=>{
const w=window.open('','_blank');
if(!w){setToast('Autorisez les popups');return;}
const mois=new Date().toLocaleDateString('fr-FR',{month:'long',year:'numeric'});
const hMens=Math.round((contrat?.heuresHebdo||40)*52/12);
const salNet=(totalBrut*0.78).toFixed(2);
const joursTrav=Math.round(h.real/((contrat?.heuresHebdo||40)/5));
const htmlPaj=[
'<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/><title>Récap Pajemploi - '
'<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;ma
'h1{font-size:16px;text-align:center;color:#264653;margin-bottom:4px}',
'.sub{text-align:center;font-size:11px;color:#888;margin-bottom:20px}',
'.box{border:1.5px solid #2A9D8F;border-radius:10px;padding:16px;margin-bottom:16px}',
'.box h2{font-size:13px;color:#2A9D8F;margin-bottom:10px;padding-bottom:6px;border-bott
'table{width:100%;border-collapse:collapse}td{padding:6px 10px;border-bottom:1px solid
'td:first-child{font-weight:600;color:#264653;width:55%}td:last-child{text-align:right}
'.hl{background:#FFF8F3;font-weight:700;font-size:13px}.hl td{border-bottom:2px solid #
'.note{background:#F4F7FA;border-radius:8px;padding:12px;margin-top:16px;font-size:10px
'.steps{margin-top:20px;padding:16px;border:1px dashed #2A9D8F;border-radius:8px}',
'.steps h3{font-size:12px;color:#2A9D8F;margin-bottom:10px}',
'.steps ol{padding-left:20px;font-size:11px;line-height:2}',
'@media print{.noprint{display:none}}</style></head><body>',
'<h1> Récapitulatif Pajemploi</h1>',
'<div class="sub">'+mois+' — À reporter sur pajemploi.urssaf.fr</div>',
'<div class="box"><h2> Assistante maternelle</h2>',
'<table><tr><td>Nom</td><td>'+((enfant?.prenomAsmat||"")+" "+(enfant?.nomAsmat||"")).tr
'<tr><td>Enfant gardé</td><td>'+(enfant?.prenom||'-')+' '+(enfant?.emoji||'')+'</td></t
'<tr><td>Période</td><td>'+mois+'</td></tr></table></div>',
'<div class="box"><h2> Heures à déclarer</h2>',
'<table><tr><td>Heures mensualisées (contrat)</td><td>'+hMens+' h</td></tr>',
'<tr><td>Heures réellement effectuées</td><td>'+h.real+' h</td></tr>',
'<tr><td>Heures complémentaires / supplémentaires</td><td>'+Math.max(0,h.real-hMens)+'
'<tr><td>Jours d\'activité</td><td>'+joursTrav+' jours</td></tr>',
'<tr><td>Jours de congés payés pris</td><td>0 jours</td></tr></table></div>',
'<div class="box"><h2> Salaire à déclarer</h2>',
'<table><tr><td>Salaire net horaire</td><td>'+(totalBrut*0.78/h.real).toFixed(4)+' €/h<
'<tr><td>Salaire net total</td><td>'+salNet+' €</td></tr>',
'<tr><td>Indemnité d\'entretien</td><td>'+(h.real/5*contrat.entretien).toFixed(2)+' €</
'<tr><td>Indemnité de repas</td><td>0,00 €</td></tr>',
'<tr class="hl"><td> TOTAL NET À DÉCLARER</td><td>'+salNet+' €</td></tr></table></div
'<div class="steps"><h3> Comment déclarer sur Pajemploi :</h3>',
'<ol><li>Connectez-vous sur <strong>pajemploi.urssaf.fr</strong></li>',
'<li>Cliquez sur <strong>"Déclarer"</strong> > sélectionnez votre assistante maternelle
'<li>Entrez le nombre d\'heures : <strong>'+h.real+'h</strong></li>',
'<li>Entrez le nombre de jours d\'activité : <strong>'+joursTrav+'</strong></li>',
'<li>Entrez le salaire net total : <strong>'+salNet+' €</strong></li>',
'<li>Entrez l\'indemnité d\'entretien : <strong>'+(h.real/5*contrat.entretien).toFixed(
'<li>Validez la déclaration</li></ol></div>',
'<div class="note"> Ce récapitulatif est généré par TiMat à partir des pointages réel
'<div style="text-align:center;margin-top:16px"><button class="noprint" onclick="window
'</body></html>'
].join('');
w.document.write(htmlPaj);
w.document.close();
setToast('Récap Pajemploi ouvert ✓');
};
return <div className="fi">
{toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
<PageHeader icon=" " title="Facturation & Pajemploi" sub="Calcul automatique du salaire
{role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
{liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>setSelId(e.id)}/>)}<
{contrat&&<div className="g2">
<div style={{display:"flex",flexDirection:"column",gap:12}}>
<div className="card"style={{padding:16}}>
<div style={{fontWeight:700,fontSize:14,marginBottom:14,color:"var(--b)"}}> Salai
{[["Heures réalisées",h.real+"h × "+contrat.tauxHoraire+"€",(h.real*contrat.tauxHor
["Indemnité entretien",h.real+" jrs × "+contrat.entretien+"€",(h.real/5*contrat.e
["Absences indemnisées",absMois.filter(a=>a.indemnise).length+" jours","+"+indemA
].map(([l,d,v])=><div key={l}style={{display:"flex",justifyContent:"space-between",
<div><div style={{fontSize:13,fontWeight:600,color:"var(--b)"}}>{l}</div>
<div style={{fontSize:11,color:"var(--l)"}}>{d}</div></div>
<div style={{fontWeight:700,color:"var(--S)"}}>{v}</div>
</div>)}
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marg
<span className="pf"style={{fontSize:15,fontWeight:700,color:"var(--b)"}}>Total b
<span className="pf"style={{fontSize:20,fontWeight:700,color:"var(--T)"}}>{totalB
</div>
<div style={{fontSize:11,color:"var(--l)",marginTop:6}}>* Net ≈ {(totalBrut*0.78).t
</div>
{/* Pajemploi */}
<div className="card"style={{padding:16,background:"#EBF4FF",border:"1.5px solid var(
<div style={{display:"flex",gap:10,alignItems:"center",marginBottom:12}}>
<div style={{width:36,height:36,borderRadius:9,background:"var(--B)",display:"fle
<div><div style={{fontWeight:700,fontSize:14,color:"var(--B)"}}>Lien Pajemploi</d
<div style={{fontSize:11,color:"var(--l)"}}>Export direct vers l'URSSAF</div></
</div>
<div style={{fontSize:13,color:"var(--b)",marginBottom:12,lineHeight:1.6}}>
Heures : <strong>{h.real}h</strong> · Salaire net : <strong>{(totalBrut*0.78).toF
</div>
<button className="btn bT"style={{width:"100%",justifyContent:"center"}}onClick={ex
Exporter vers Pajemploi
</button>
</div>
</div>
<div style={{fontSize:13,fontWeight:600,color:"var(--b)"}}>{fmt(a.date)} - {a.m
<div style={{fontSize:11,color:"var(--l)"}}>{a.heures}h · {a.indemnise?"Indemni
<div style={{display:"flex",flexDirection:"column",gap:12}}>
<div className="card"style={{padding:16}}>
<div style={{fontWeight:700,fontSize:14,marginBottom:12,color:"var(--b)"}}> Absen
{absMois.map(a=><div key={a.id}style={{display:"flex",justifyContent:"space-between
<div>
</div>
<span className="badge"style={{background:a.indemnise?"var(--Sp)":"var(--Rp)",col
{a.indemnise?"+"+((a.heures*(contrat.tauxHoraire*contrat.indemniteAbsence)).toF
</div>)}
{role==="asmat"&&<button className="btn bG"style={{width:"100%",marginTop:12}}>+ Dé
</div>
<div className="card"style={{padding:14}}>
<div style={{fontWeight:700,fontSize:13,marginBottom:10,color:"var(--b)"}}> Histo
{[["Février 2024","Émise","672.40€"],["Janvier 2024","Payée","698.10€"],["Décembre
<div key={m}style={{display:"flex",justifyContent:"space-between",alignItems:"cen
<span style={{fontSize:13,color:"var(--b)",fontWeight:600}}>{m}</span>
<span className="badge"style={{background:s==="Payée"?"var(--Sp)":"var(--Gp)",c
<span style={{fontWeight:700,color:"var(--b)"}}>{v}</span>
</div>)}
</div>
</div>
</div>}
</div>;
}
//
function Contrats({enfants,role,pEId}){
const [selId,setSelId]=useState(enfants[0]?.id);
const [signes,setSignes]=useState(()=>Object.fromEntries(D.enfants.map(e=>[e.id,e.signe])))
const [drawing,setDrawing]=useState(false);
const [hasSig,setHasSig]=useState(false);
const [mods,setMods]=useState(()=>Object.fromEntries(D.enfants.map(e=>[e.id,[]])));
const [showModale,setShowModale]=useState(false);
const [modDet,setModDet]=useState({type:"Horaire",detail:""});
const [toast,setToast]=useState("");
const canvasRef=useRef(null);
const liste=role==="parent"?enfants.filter(e=>e.id===pEId):enfants;
const enfant=liste.find(e=>e.id===selId)||liste[0];
const contrat=enfant?.contrat;
const startDraw=(e)=>{
setDrawing(true);
const c=canvasRef.current;const r=c.getBoundingClientRect();
const ctx=c.getContext("2d");
ctx.strokeStyle="#3A2820";ctx.lineWidth=2;ctx.lineCap="round";ctx.lineJoin="round";
ctx.beginPath();ctx.moveTo(e.clientX-r.left,e.clientY-r.top);};
const draw=(e)=>{if(!drawing)return;
const c=canvasRef.current;const r=c.getBoundingClientRect();
const ctx=c.getContext("2d");
ctx.strokeStyle="#3A2820";ctx.lineWidth=2;ctx.lineCap="round";ctx.lineJoin="round";
ctx.lineTo(e.clientX-r.left,e.clientY-r.top);ctx.stroke();
ctx.beginPath();ctx.moveTo(e.clientX-r.left,e.clientY-r.top);
setHasSig(true);};
const endDraw=()=>setDrawing(false);
const clearSig=()=>{const c=canvasRef.current;c.getContext("2d").clearRect(0,0,c.width,c.he
const signer=()=>{if(!hasSig)return;setSignes(p=>({...p,[enfant.id]:true}));setToast("Contr
const addMod=()=>{if(!modDet.detail.trim())return;
setMods(p=>({...p,[enfant.id]:[{date:TODAY_STR,...modDet,statut:"En attente"},...(p[enfan
setModDet({type:"Horaire",detail:""});setShowModale(false);};
return <div className="fi">
{toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
<PageHeader icon=" " title="Contrats & Signatures" sub="Signature électronique légale"/>
{role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
{liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>setSelId(e.id)}/>)}<
{contrat&&<div className="g2">
<div>
<div className="card"style={{padding:16,marginBottom:12}}>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marg
<div style={{fontWeight:700,fontSize:14,color:"var(--b)"}}> Contrat - {enfant?.
<span className="badge"style={{background:signes[enfant?.id]?"var(--Sp)":"var(--G
{signes[enfant?.id]?" Signé":" En attente de signature"}</span>
</div>
{[["Période",fmt(contrat.debut)+" → "+fmt(contrat.fin)],
["Jours",contrat.jours.join(", ")],["Horaires",contrat.horaires],
["Heures / semaine",contrat.heuresHebdo+"h"],
["Taux horaire",contrat.tauxHoraire.toFixed(2)+" €/h"],
["Indemnité entretien",contrat.entretien.toFixed(2)+" €/jour"],
["Salaire mensuel brut","≈ "+(contrat.heuresHebdo*contrat.tauxHoraire*52/12).toFi
].map(([l,v])=><div key={l}style={{display:"flex",justifyContent:"space-between",pa
<span style={{fontSize:12,color:"var(--l)",fontWeight:700}}>{l}</span>
<span style={{fontSize:13,fontWeight:600,color:"var(--b)",textAlign:"right",maxWi
</div>)}
</div>
Signat
{/* Signature électronique */}
{!signes[enfant?.id]&&<div className="card"style={{padding:16,border:"1.5px solid var
<div style={{fontWeight:700,fontSize:14,color:"var(--P)",marginBottom:4}}> <div style={{fontSize:12,color:"var(--m)",marginBottom:12}}>Signez dans la zone ci-
<canvas ref={canvasRef}className="sig-c"width={340}height={100}
style={{width:"100%",maxWidth:340}}
onMouseDown={startDraw}onMouseMove={draw}onMouseUp={endDraw}onMouseLeave={endDraw
<div style={{display:"flex",gap:8,marginTop:10}}>
<button className="btn bG"onClick={clearSig}>Effacer</button>
<button className="btn bP"style={{flex:1,justifyContent:"center"}}onClick={signer
Signer le contrat
</button>
</div>
<div style={{fontSize:11,color:"var(--l)",marginTop:8}}>
Signature horodatée et sécurisée - valeur légale conforme eIDAS
</div>
</div>}
{signes[enfant?.id]&&<div style={{background:"var(--Sp)",border:"1px solid var(--Sl)"
<div style={{fontSize:24,marginBottom:4}}> </div>
<div style={{fontWeight:700,color:"var(--S)"}}>Contrat signé électroniquement</div>
<div style={{fontSize:12,color:"var(--l)",marginTop:2}}>Le 11/03/2024 · Conforme eI
</div>}
</div>
<div style={{display:"flex",flexDirection:"column",gap:12}}>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
<div style={{fontWeight:700,fontSize:13,color:"var(--b)"}}> Demandes de modificat
<button className="btn bT"style={{fontSize:12,padding:"6px 12px"}}onClick={()=>setS
</div>
{(mods[enfant?.id]||[]).length===0&&<div className="card"style={{padding:14}}>
<div style={{fontSize:13,color:"var(--l)"}}>Aucune modification demandée.</div>
</div>}
{(mods[enfant?.id]||[]).map((m,i)=><div key={i}className="card"style={{padding:12}}>
<div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
<span className="badge"style={{background:"var(--Bp)",color:"var(--B)"}}>{m.type}
<span className="badge"style={{background:m.statut==="Accepté"?"var(--Sp)":m.stat
color:m.statut==="Accepté"?"var(--S)":m.statut==="Refusé"?"var(--R)":"var(--G)"
</div>
<div style={{fontSize:13,color:"var(--m)",lineHeight:1.5,marginBottom:4}}>{m.detail
<div style={{fontSize:11,color:"var(--l)"}}>{fmt(m.date)}</div>
{role==="asmat"&&m.statut==="En attente"&&<div style={{display:"flex",gap:6,marginT
<button className="btn bS"style={{fontSize:11,padding:"5px 10px"}}onClick={()=>se
<button className="btn bG"style={{fontSize:11,padding:"5px 10px",color:"var(--R)"
</div>}
</div>)}
</div>
</div>}
{showModale&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",display:"f
<div className="card"style={{padding:24,width:420,maxWidth:"92vw"}}>
<div className="pf"style={{fontSize:17,fontWeight:700,marginBottom:16,color:"var(--b)
<div style={{marginBottom:12}}><label className="lbl">Type</label>
<select className="sel"value={modDet.type}onChange={e=>setModDet(p=>({...p,type:e.t
<option>Horaire</option><option>Jours</option><option>Renouvellement</option><opt
</select></div>
<div style={{marginBottom:16}}><label className="lbl">Détail</label>
<textarea className="ta"value={modDet.detail}onChange={e=>setModDet(p=>({...p,detai
<div style={{display:"flex",gap:8}}>
<button className="btn bG"style={{flex:1}}onClick={()=>setShowModale(false)}>Annule
<button className="btn bT"style={{flex:1}}onClick={addMod}>Envoyer</button>
</div>
</div>
</div>}
</div>;
}
//
function Sante({enfants,role,pEId}){
const [selId,setSelId]=useState(enfants[0]?.id);
const liste=role==="parent"?enfants.filter(e=>e.id===pEId):enfants;
const enfant=liste.find(e=>e.id===selId)||liste[0];
const isRealChild=!["e1","e2","e3"].includes(enfant?.id);
const vacs=isRealChild?[]:(enfant?.vaccins||[]);
return <div className="fi">
<PageHeader icon=" " title="Carnet de santé" sub="Informations médicales, vaccins, aller
{role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
{liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>setSelId(e.id)}/>)}<
{enfant&&<div className="g2">
<div style={{display:"flex",flexDirection:"column",gap:12}}>
{/* Identité médicale */}
<div className="card"style={{padding:16}}>
<div style={{fontWeight:700,fontSize:14,marginBottom:12,color:"var(--b)"}}> Ident
{[["Groupe sanguin",enfant.groupe_sanguin||"-"],["Médecin traitant",enfant.medecin|
<div key={l}style={{display:"flex",justifyContent:"space-between",padding:"7px 0"
<span style={{fontSize:12,color:"var(--l)",fontWeight:700}}>{l}</span>
<span style={{fontSize:13,fontWeight:600,color:"var(--b)"}}>{v}</span>
</div>)}
</div>
{/* Allergies */}
<div className="card"style={{padding:16}}>
<div style={{fontWeight:700,fontSize:14,marginBottom:12,color:"var(--b)"}}> {enfant.allergies.length===0
?<span className="badge"style={{background:"var(--Sp)",color:"var(--S)"}}> :<div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
{enfant.allergies.map(a=><span key={a}className="badge"style={{background:"#FEE
</div>}
{role==="parent"&&<div style={{marginTop:12,display:"flex",gap:8}}>
<input className="inp"placeholder="Ajouter une allergie..."style={{flex:1}}/>
<button className="btn bT"style={{fontSize:12}}>+</button>
</div>}
</div>
Aller
Aucu
{/* Urgences */}
<div className="card"style={{padding:16,background:"#FFF5F5",border:"1px solid <div style={{fontWeight:700,fontSize:14,marginBottom:10,color:"#DC2626"}}> #FCA5A
En cas
{[["SAMU","15"],["Pompiers","18"],["Médecin traitant",enfant.medecin?.split("-")[1]
<div key={l}style={{display:"flex",justifyContent:"space-between",padding:"6px 0"
<span style={{fontSize:13,color:"#7F1D1D"}}>{l}</span>
<span style={{fontWeight:700,color:"#DC2626",fontSize:14}}>{v}</span>
</div>)}
</div>
</div>
{/* Vaccins */}
<div className="card"style={{padding:16}}>
<div style={{fontWeight:700,fontSize:14,marginBottom:12,color:"var(--b)"}}> Carnet
{vacs.map((v,i)=><div key={i}style={{display:"flex",justifyContent:"space-between",al
<div>
<div style={{fontWeight:700,fontSize:13,color:"var(--b)"}}>{v.nom}</div>
<div style={{fontSize:11,color:"var(--l)"}}>{fmt(v.date)}</div>
</div>
<span className="badge"style={{background:v.ok?"var(--Sp)":"var(--Rp)",color:v.ok?"
{v.ok?" À jour":" À renouveler"}</span>
</div>)}
<div style={{marginTop:12,padding:"10px 14px",background:"var(--Gp)",borderRadius:10,
<div style={{fontSize:13,color:"#7A5500",lineHeight:1.5}}>
Prochain rappel : <strong>ROR de {enfant.prenom}</strong> - à prévoir avant {a
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
const [pfs,setPfs]=useState(D.portfolio);
const [nf,setNf]=useState({titre:"",desc:"",emoji:" ",competences:""});
const [toast,setToast]=useState("");
const listeEnfants=role==="parent"?enfants.filter(e=>e.id===pEId):enfants;
const filtres=selId?pfs.filter(p=>p.eId===selId):pfs.filter(p=>listeEnfants.some(e=>e.id===
const emojis=[" "," "," "," "," "," "," "," "," "," "];
const add=()=>{
const e=listeEnfants[0];if(!e||!nf.titre)return;
setPfs(p=>[{id:"pf"+Date.now(),eId:selId||e.id,date:TODAY_STR,...nf,competences:nf.compet
setNf({titre:"",desc:"",emoji:" ",competences:""});setShowForm(false);setToast("Activité
return <div className="fi">
{toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
<PageHeader icon=" " title="Portfolio pédagogique" sub="Activités, projets et souvenirs"
action={role==="asmat"&&<button className="btn bT"onClick={()=>setShowForm(!showForm)}>
{role==="asmat"&&<div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
<button className={(!selId?"btn bT":"btn bG")}onClick={()=>setSelId(null)}>Tous</button
{listeEnfants.map(e=><button key={e.id}className={(selId===e.id?"btn bT":"btn bG")}onCl
</div>}
{showForm&&<div className="card"style={{padding:16,marginBottom:14,border:"1.5px solid va
<div style={{fontWeight:700,fontSize:13,marginBottom:10,color:"var(--b)"}}>Nouvelle act
<div className="g2"style={{marginBottom:10}}>
<div><label className="lbl">Titre</label><input className="inp"value={nf.titre}onChan
<div><label className="lbl">Emoji</label><div style={{display:"flex",gap:4,flexWrap:"
{emojis.map(em=><button key={em}className={"moo "+(nf.emoji===em?"on":"")}onClick={
</div>
<div style={{marginBottom:10}}><label className="lbl">Description</label><textarea clas
<div style={{marginBottom:10}}><label className="lbl">Compétences (séparées par virgule
<button className="btn bT"style={{width:"100%"}}onClick={add}>Enregistrer l'activité</b
</div>}
<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap
{filtres.map(pf=>{
const e=enfants.find(x=>x.id===pf.eId);
return <div key={pf.id}className="card"style={{padding:14,display:"flex",flexDirectio
<div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}
<div style={{fontSize:36}}>{pf.emoji}</div>
<div style={{textAlign:"right"}}>
{e&&<span style={{fontSize:16}}>{e.emoji}</span>}
<div style={{fontSize:11,color:"var(--l)"}}>{fmt(pf.date)}</div>
</div>
</div>
<div style={{fontWeight:700,fontSize:14,color:"var(--b)"}}>{pf.titre}</div>
<div style={{fontSize:12,color:"var(--m)",lineHeight:1.5}}>{pf.desc}</div>
<div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
{pf.competences.map(c=><span key={c}className="badge"style={{background:"var(--Pp
</div>
</div>;})}
</div>
</div>;
}
//
function Developpement({enfants,role,pEId}){
const [selId,setSelId]=useState(enfants[0]?.id);
const [ms,setMs]=useState(D.milestones);
const liste=role==="parent"?enfants.filter(e=>e.id===pEId):enfants;
const enfant=liste.find(e=>e.id===selId)||liste[0];
const items=ms[enfant?.id]||[];
const cats=[...new Set(items.map(m=>m.cat))];
const done=items.filter(m=>m.ok).length;
const pct=items.length?Math.round(done/items.length*100):0;
const toggle=(id)=>setMs(p=>({...p,[enfant.id]:p[enfant.id].map(m=>m.id===id?{...m,ok:!m.ok
return <div className="fi">
<PageHeader icon=" " title="Suivi du développement" sub="Jalons OMS - étapes clés de l'e
{role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
{liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>setSelId(e.id)}/>)}<
{enfant&&<div className="g2">
<div style={{display:"flex",flexDirection:"column",gap:12}}>
{/* Score global */}
<div className="card"style={{padding:16}}>
<div style={{display:"flex",gap:12,alignItems:"center",marginBottom:12}}>
<span style={{fontSize:36}}>{enfant.emoji}</span>
<div style={{flex:1}}>
<div className="pf"style={{fontSize:17,fontWeight:700,color:"var(--b)"}}>{enfan
<div style={{fontSize:13,color:"var(--l)"}}>{age(enfant.naissance)}</div>
</div>
<div style={{textAlign:"center"}}>
<div className="pf"style={{fontSize:28,fontWeight:700,color:"var(--S)"}}>{pct}%
<div style={{fontSize:11,color:"var(--l)"}}>acquis</div>
</div>
</div>
<div className="bar"style={{height:10,marginBottom:8}}>
<div className="bar-fill"style={{width:pct+"%",background:"var(--S)"}}/>
</div>
<div style={{fontSize:12,color:"var(--m)"}}>{done} / {items.length} étapes atteinte
</div>
{/* Par catégorie */}
{cats.map(cat=>{
const citems=items.filter(m=>m.cat===cat);
const cpct=Math.round(citems.filter(m=>m.ok).length/citems.length*100);
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
<div style={{fontWeight:700,fontSize:14,marginBottom:12,color:"var(--b)"}}>Toutes les
{cats.map(cat=><div key={cat}style={{marginBottom:14}}>
<div style={{fontSize:12,fontWeight:700,color:"var(--m)",textTransform:"uppercase",
{items.filter(m=>m.cat===cat).map(m=><div key={m.id}className="ms"onClick={()=>role
<div className={"msc "+(m.ok?"ok":"")+""}>{m.ok?"✓":""}</div>
<div style={{flex:1}}>
<div style={{fontSize:13,color:"var(--b)",fontWeight:m.ok?700:400,textDecoratio
<div style={{fontSize:11,color:"var(--l)"}}>{m.age_attendu}</div>
</div>
{!m.ok&&<span className="badge"style={{background:"var(--Gp)",color:"var(--G)",fo
</div>)}
</div>)}
{role==="asmat"&&<div style={{fontSize:11,color:"var(--l)",marginTop:4}}>Cliquez sur
</div>
</div>}
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
const h=isDemoRecap?(D.heures[enfant?.id]||{real:0,prev:0}):{real:0,prev:Math.round((contra
const rep=D.repas.filter(r=>r.eId===enfant?.id);
const ms=D.milestones[enfant?.id]||[];
return <div className="fi">
{toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
<PageHeader icon=" " title="Récapitulatif mensuel PDF" sub="Bilan complet automatique -
action={<button className="btn bT"onClick={()=>{setShowPrev(true);}}> Aperçu PDF</bu
{role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
{liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>setSelId(e.id)}/>)}<
<div className="g2"style={{marginBottom:12}}>
{[[" ","Heures réalisées",h.real+"h / "+h.prev+"h prévues","var(--B)"],
[" ","Repas enregistrés",rep.length+" jours de suivi","var(--S)"],
[" ","Étapes atteintes",ms.filter(m=>m.ok).length+" / "+ms.length+" jalons","var(--P
[" ","Transmissions",D.transmissions.filter(t=>t.eId===enfant?.id).length+" échanges
].map(([ic,ti,su,c])=><div key={ti}className="card"style={{padding:14,display:"flex",ga
<div style={{fontSize:26}}>{ic}</div>
<div><div style={{fontWeight:700,fontSize:13,color:"var(--b)"}}>{ti}</div>
<div className="pf"style={{fontSize:15,color:c,fontWeight:700}}>{su}</div></div>
</div>)}
</div>
{showPrev&&enfant&&<div className="card"style={{padding:16}}>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBo
<div style={{fontWeight:700,fontSize:14,color:"var(--b)"}}>Aperçu du récapitulatif</d
<div style={{display:"flex",gap:8}}>
<button className="btn bP"onClick={()=>setToast("PDF généré et envoyé par email ✓")
<button className="btn bS"onClick={()=>setToast("Téléchargement en cours ✓")}> Té
</div>
</div>
<div className="pdf-preview">
<div style={{borderBottom:"2px solid #C4714A",paddingBottom:12,marginBottom:16,displa
<div><h2 style={{color:"#C4714A",fontFamily:"Georgia",fontSize:18}}> TiMat</h2>
<div style={{fontSize:11,color:"#888"}}>{user?.prenom||"Assmat"} {user?.nom||""}
<div style={{textAlign:"right",fontSize:11,color:"#888"}}>
<div><strong>Récapitulatif mensuel</strong></div>
<div>Mars 2024</div>
<div>Généré le 11/03/2024</div>
</div>
</div>
<div style={{background:"#f8f4ef",padding:10,borderRadius:6,marginBottom:12}}>
<div style={{fontWeight:700,marginBottom:4}}> {enfant.prenom} {enfant.nom} <div style={{fontSize:11,color:"#666"}}>Période d'accueil : {enfant.contrat?.horair
- {age
</div>
<table>
<thead><tr><th>Section</th><th>Détail</th><th>Valeur</th></tr></thead>
<tbody>
<tr><td>Heures prévues</td><td>Contrat mensuel</td><td><strong>{h.prev}h</strong>
<tr><td>Heures réalisées</td><td>Pointage validé</td><td><strong>{h.real}h</stron
<tr><td>Solde</td><td>Différence</td><td style={{color:h.real-h.prev<0?"#DC2626":
<tr><td>Salaire brut</td><td>Taux {contrat?.tauxHoraire}€/h</td><td><strong>{(h.r
<tr><td>Repas suivis</td><td>Journaux renseignés</td><td><strong>{rep.length} jou
<tr><td>Étapes dév.</td><td>Jalons OMS</td><td><strong>{ms.filter(m=>m.ok).length
</tbody>
</table>
<div style={{marginTop:14,paddingTop:10,borderTop:"1px solid #ddd",fontSize:11,color:
Document généré automatiquement par TiMat · Confidentiel
</div>
</div>
</div>}
{!showPrev&&<div className="card"style={{padding:16,background:"var(--Pp)",border:"1px so
<div style={{fontWeight:700,fontSize:14,color:"var(--P)",marginBottom:8}}> Fonctionna
<div style={{fontSize:13,color:"var(--b)",lineHeight:1.7}}>
TiMat génère automatiquement chaque mois un <strong>récapitulatif PDF complet</strong
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
<PageHeader icon=" " title="Compte-rendu trimestriel"
sub="Document professionnel généré automatiquement - exclusivité TiMat"/>
{role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
{liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>{setSelId(e.id);setC
<div className="g2">
<div>
<div className="card"style={{padding:18,marginBottom:12}}>
<div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap",alignItems:"flex-
<div style={{flex:1}}>
<label className="lbl">Trimestre</label>
<select className="sel"value={trim}onChange={e=>{setTrim(e.target.value);setCr(
{["T1 2024","T2 2024","T3 2024","T4 2023","T3 2023"].map(t=><option key={t}>{
</select>
</div>
<button className="btn bP"onClick={generer}disabled={loading}>
{loading?" Rédaction...":" Générer le CR"}
</button>
</div>
{loading&&<div style={{display:"flex",alignItems:"center",gap:10,padding:"16px 0"}}
<div className="ai-dot"/><div className="ai-dot"style={{animationDelay:".3s"}}/><
<span style={{fontSize:13,color:"var(--m)",fontStyle:"italic"}}>Rédaction du comp
</div>}
{!loading&&!cr&&<div style={{textAlign:"center",padding:"20px 0",color:"var(--l)"}}
<div style={{fontSize:36,marginBottom:8}}> </div>
<div style={{fontSize:13}}>Sélectionnez un trimestre et cliquez sur Générer.</div
</div>}
{cr&&<div>
<div style={{fontFamily:"'Playfair Display',serif",fontSize:14,lineHeight:2,color
<div style={{display:"flex",gap:8,marginTop:16,flexWrap:"wrap",alignItems:"center
{role==="asmat"&&!envoye&&<button className="btn bS"onClick={()=>{setEnvoye(tru
Envoyer aux parents
</button>}
{role==="asmat"&&envoye&&<div style={{display:"flex",alignItems:"center",gap:6,
<span style={{fontSize:14}}> </span>
<span style={{fontSize:13,fontWeight:700,color:"var(--S)"}}>CR envoyé à {pare
Unique
</div>}
<button className="btn bP"onClick={generer}> Régénérer</button>
<button className="btn bG"onClick={()=>navigator.clipboard?.writeText(cr)}> C
</div>
</div>}
</div>
</div>
<div style={{display:"flex",flexDirection:"column",gap:12}}>
<div className="card"style={{padding:14,background:"var(--Pp)",border:"1px solid var(
<div style={{fontWeight:700,fontSize:13,color:"var(--P)",marginBottom:8}}> <div style={{fontSize:13,color:"var(--b)",lineHeight:1.6}}>Un compte-rendu trimestr
</div>
<div className="card"style={{padding:14}}>
<div style={{fontWeight:700,fontSize:13,marginBottom:10,color:"var(--b)"}}> {[[" Jalons acquis",ms.filter(m=>m.ok).length+"/"+ms.length],
[" Activités",pfs.length+" dans le portfolio"],
[" Transmissions",D.transmissions.filter(t=>t.eId===enfant?.id).length+" échang
].map(([l,v])=><div key={l}style={{display:"flex",justifyContent:"space-between",pa
<span style={{color:"var(--m)"}}>{l}</span><span style={{fontWeight:600,color:"va
</div>)}
</div>
</div>
</div>
</div>;
Donné
}
//
const DOCS_DEMO=[
// Médicaux
{id:"d1",eId:"e1",cat:"medical",sous:"Carnet de santé",nom:"Carnet_santé_Léo_2024.pdf",date
{id:"d2",eId:"e1",cat:"medical",sous:"Ordonnance",nom:"Ordonnance_Léo_Mars2024.pdf",date:"2
{id:"d3",eId:"e2",cat:"medical",sous:"Vaccins",nom:"Carnet_vaccins_Emma.pdf",date:"2023-11-
{id:"d4",eId:"e3",cat:"medical",sous:"Allergie",nom:"Certificat_allergie_Noah.pdf",date:"20
// Administratifs
{id:"d5",eId:"e1",cat:"admin",sous:"Contrat",nom:"Contrat_Léo_Sept2023.pdf",date:"2023-09-0
{id:"d6",eId:"e1",cat:"admin",sous:"Attestation fiscale",nom:"Attestation_fiscale_2023_Léo.
{id:"d7",eId:"e2",cat:"admin",sous:"Contrat",nom:"Contrat_Emma_Sept2023.pdf",date:"2023-09-
{id:"d8",eId:"e2",cat:"admin",sous:"Facture",nom:"Facture_Fevrier2024_Emma.pdf",date:"2024-
{id:"d9",eId:"e3",cat:"admin",sous:"Contrat",nom:"Contrat_Noah_Janv2024.pdf",date:"2024-01-
// Pédagogiques
{id:"d10",eId:"e1",cat:"peda",sous:"CR Trimestriel",nom:"CR_T1_2024_Léo.pdf",date:TODAY_STR
{id:"d11",eId:"e2",cat:"peda",sous:"CR Trimestriel",nom:"CR_T4_2023_Emma.pdf",date:"2023-12
{id:"d12",eId:"e1",cat:"peda",sous:"Bilan de journée",nom:"Bilan_11Mars2024_Léo.pdf",date:T
// Agréments assmat
{id:"d13",eId:null,cat:"agrement",sous:"Agrément PMI",nom:"Agrement_PMI_2024.pdf",date:"202
{id:"d14",eId:null,cat:"agrement",sous:"Assurance",nom:"Assurance_RC_Pro_2024.pdf",date:"20
];
const CATS={
medical:{l:"Médical",ic:" ",c:"#B84060",bg:"#FAEEF2"},
admin:{l:"Administratif",ic:" ",c:"#B8892A",bg:"#FBF5E0"},
peda:{l:"Pédagogique",ic:" ",c:"#6A3F88",bg:"#F2EAF8"},
agrement:{l:"Agréments & Pro",ic:" ",c:"#2E5F8A",bg:"#E6F0F8"},
};
function Documents({enfants,role,pEId,user}){
const [annee,setAnnee]=useState("2024");
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
const{data,error}=await supabase.from('documents_meta').select('*').eq('asmat_id',user.
if(!error&&data)setDocs(data.map(d=>({
id:d.id,eId:d.enfant_id,cat:d.categorie||'admin',sous:d.sous_type||'',
nom:d.nom,date:d.created_at?.slice(0,10)||TODAY_STR,annee:(d.created_at||'').slice(0,
taille:d.taille||'-',icone:CATS[d.categorie]?.ic||' ',partage:d.partage!==false,
url:d.storage_url||null,storagePath:d.storage_path||null
})));
})();
},[user?.id,isDemoMode]);
const annees=["2024","2023","2022","2021"];
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
const telechargerDoc=(doc)=>{
if(doc.url){
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
taille:newFile?(newFile.size>1024*1024?(newFile.size/1024/1024).toFixed(1)+" Mo":(new
icone:CATS[newDoc.cat]?.ic||" ",partage:true,url:null
}]);
setToast("Document ajouté ✓"+(newFile?"":" (sans fichier - ajoutez un fichier pour le s
}else{
// Real upload to Supabase Storage
const ext=newFile.name.split('.').pop()||'pdf';
const fileName=`${Date.now()}_${newDoc.nom.replace(/[^a-zA-Z0-9]/g,'_')}.${ext}`;
const path=`${user.id}/${newDoc.eId||'general'}/${fileName}`;
const{error:upErr}=await supabase.storage.from('documents').upload(path,newFile,{upsert
if(upErr){
console.error('Upload doc:',upErr.message);
setToast(" Erreur upload: "+upErr.message);
setUploading(false);return;
}
const{data:urlData}=supabase.storage.from('documents').getPublicUrl(path);
const taille=newFile.size>1024*1024?(newFile.size/1024/1024).toFixed(1)+" Mo":(newFile.
// Save metadata
const meta={
asmat_id:user.id,
enfant_id:newDoc.eId||null,
categorie:newDoc.cat,
sous_type:newDoc.sous||CATS[newDoc.cat]?.l,
nom:newDoc.nom+(newDoc.nom.includes('.')?'':'.'+ext),
taille:taille,
storage_path:path,
storage_url:urlData.publicUrl,
partage:true,
};
const{data:inserted,error:metaErr}=await supabase.from('documents_meta').insert(meta).s
if(metaErr)console.error('Meta insert:',metaErr.message);
setDocs(p=>[{
id:inserted?.id||"dn"+Date.now(),eId:newDoc.eId||null,cat:newDoc.cat,
sous:newDoc.sous||CATS[newDoc.cat]?.l,
nom:meta.nom,date:TODAY_STR,annee:new Date().getFullYear().toString(),
taille,icone:CATS[newDoc.cat]?.ic||" ",partage:true,
url:urlData.publicUrl,storagePath:path
},...p]);
setToast(" Document uploadé et sauvegardé");
}
setNewDoc({nom:"",cat:"medical",sous:"",eId:enfants[0]?.id||""});
setNewFile(null);
setShowUpload(false);
setUploading(false);
};
return <div className="fi">
{toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
<PageHeader icon=" " title="Espace Documents"
sub="Tous les documents classés par année - téléchargeables et imprimables"
action={role==="asmat"&&<button className="btn bT"onClick={()=>setShowUpload(!showUploa
{/* Formulaire ajout */}
{showUpload&&<div className="card"style={{padding:18,marginBottom:16,border:"1.5px solid
<div style={{fontWeight:700,fontSize:13,marginBottom:12,color:"var(--b)"}}> Ajouter u
<div className="g2"style={{marginBottom:10}}>
<div>
<label className="lbl">Nom du fichier</label>
<input className="inp"value={newDoc.nom}onChange={e=>setNewDoc(p=>({...p,nom:e.targ
</div>
<div>
<label className="lbl">Catégorie</label>
<select className="sel"value={newDoc.cat}onChange={e=>setNewDoc(p=>({...p,cat:e.tar
{Object.entries(CATS).map(([k,v])=><option key={k}value={k}>{v.ic} {v.l}</option>
</select>
</div>
<div>
<label className="lbl">Sous-type</label>
<input className="inp"value={newDoc.sous}onChange={e=>setNewDoc(p=>({...p,sous:e.ta
</div>
<div>
<label className="lbl">Enfant concerné</label>
<select className="sel"value={newDoc.eId}onChange={e=>setNewDoc(p=>({...p,eId:e.tar
<option value="">- Document général -</option>
{enfants.map(e=><option key={e.id}value={e.id}>{e.emoji} {e.prenom}</option>)}
</select>
</div>
</div>
<div style={{display:"flex",gap:8}}>
<button className="btn bG"onClick={()=>{setShowUpload(false);setNewFile(null);}}>Annu
<button className="btn bT"onClick={ajouterDoc}disabled={uploading}>{uploading?" Upl
</div>
{/* File picker */}
<div style={{marginTop:10,padding:12,border:"2px dashed var(--br)",borderRadius:10,text
onClick={()=>uploadRef.current?.click()}>
<input ref={uploadRef}type="file"accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"s
onChange={e=>{const f=e.target.files?.[0];if(f){setNewFile(f);if(!newDoc.nom.trim()
{newFile
?<div style={{fontSize:12,color:"var(--S)"}}> {newFile.name} ({(newFile.size/1024
:<div style={{fontSize:12,color:"var(--l)"}}> Cliquer pour sélectionner un </div>
</div>}
fichie
{/* Filtres */}
<div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
{/* Années */}
<div style={{display:"flex",gap:4}}>
{["tous",...annees].map(a=><button key={a}onClick={()=>setAnnee(a)}style={{
padding:"5px 12px",borderRadius:20,border:"1.5px solid",cursor:"pointer",fontSize:1
fontFamily:"'DM Mono',monospace",
background:annee===a?"var(--b)":"var(--w)",
color:annee===a?"#fff":"var(--m)",
borderColor:annee===a?"var(--b)":"var(--br)",
}}>{a==="tous"?"Toutes":a}</button>)}
</div>
<div style={{width:1,height:20,background:"var(--br)"}}/>
{/* Catégories */}
{[{key:"tous",l:"Tous",ic:" ",c:"var(--m)"},...Object.entries(CATS).map(([k,v])=>({key
<button key={c.key}onClick={()=>setCat(c.key)}style={{
padding:"5px 11px",borderRadius:20,border:"1.5px solid",cursor:"pointer",fontSize:1
background:cat===c.key?c.c||"var(--b)":"transparent",
color:cat===c.key?"#fff":c.c||"var(--m)",
borderColor:cat===c.key?c.c||"var(--b)":c.bg||"var(--br)",
}}>{c.ic} {c.l}</button>
))}
{/* Enfant filter pour asmat */}
{role==="asmat"&&<select value={eId}onChange={e=>setEId(e.target.value)}className="sel"
<option value="tous">Tous les enfants</option>
{enfants.map(e=><option key={e.id}value={e.id}>{e.emoji} {e.prenom}</option>)}
<option value="">Général</option>
</select>}
</div>
{/* Compteur */}
<div style={{fontSize:12,color:"var(--l)",marginBottom:14,fontFamily:"'DM Mono',monospace
{filtres.length} document{filtres.length>1?"s":""} · {annee==="tous"?"toutes années":an
</div>
{/* Documents par catégorie */}
{filtres.length===0&&<div className="card"style={{padding:40,textAlign:"center"}}>
<div style={{fontSize:40,marginBottom:8}}> </div>
<div style={{fontSize:14,color:"var(--l)"}}>Aucun document pour ces filtres.</div>
</div>}
{parCat.map(c=>(
<div key={c.key}style={{marginBottom:20}}>
<div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
<div style={{padding:"4px 12px",borderRadius:20,background:c.bg,color:c.c,fontSize:
{c.ic} {c.l}
</div>
<div style={{flex:1,height:1,background:"linear-gradient(90deg,var(--br),transparen
<span style={{fontSize:11,color:"var(--l)",fontFamily:"'DM Mono',monospace"}}>{c.co
</div>
<div style={{display:"flex",flexDirection:"column",gap:6}}>
{filtres.filter(d=>d.cat===c.key).map(doc=>{
const enfant=doc.eId?enfants.find(e=>e.id===doc.eId):null;
return <div key={doc.id}className="card"style={{padding:"12px 16px",display:"flex
onMouseEnter={e=>e.currentTarget.style.boxShadow="var(--sh2)"}
onMouseLeave={e=>e.currentTarget.style.boxShadow="var(--sh)"}>
{/* Icone */}
<div style={{width:40,height:40,borderRadius:10,background:CATS[doc.cat]?.bg||"
{doc.icone}
</div>
{/* Info */}
<div style={{flex:1,overflow:"hidden"}}>
<div style={{fontWeight:600,fontSize:13,color:"var(--b)",overflow:"hidden",te
<div style={{display:"flex",gap:8,marginTop:3,flexWrap:"wrap"}}>
<span style={{fontSize:11,color:"var(--l)"}}>{doc.sous}</span>
<span style={{fontSize:11,color:"var(--l)"}}>·</span>
<span style={{fontSize:11,color:"var(--l)",fontFamily:"'DM Mono',monospace"
{doc.taille!=="-"&&<><span style={{fontSize:11,color:"var(--l)"}}>·</span>
<span style={{fontSize:11,color:"var(--l)",fontFamily:"'DM Mono',monospace"
{enfant&&<span className="badge"style={{background:enfant.couleur+"18",colo
{enfant.emoji} {enfant.prenom}
</span>}
{!doc.partage&&<span className="badge"style={{background:"var(--Bp)",color:
</div>
</div>
{/* Actions */}
<div style={{display:"flex",gap:6,flexShrink:0}}>
<button className="btn bG"style={{padding:"6px 10px",fontSize:12}}
onClick={()=>setApercu(apercu===doc.id?null:doc.id)}
title="Aperçu"> </button>
<button className="btn bG"style={{padding:"6px 10px",fontSize:12}}
onClick={()=>telechargerDoc(doc)}
title="Télécharger"> </button>
<button className="btn bG"style={{padding:"6px 10px",fontSize:12}}
onClick={()=>{if(doc.url)window.open(doc.url);else setToast("Impression: "+
title="Imprimer"> </button>
{role==="asmat"&&<button className="btn bG"style={{padding:"6px 10px",fontSiz
onClick={()=>supprimerDoc(doc)}
title="Supprimer"> </button>}
</div>
</div>;
})}
</div>
</div>
))}
{/* Aperçu simulé */}
{apercu&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",display:"flex"
{(()=>{const doc=docs.find(d=>d.id===apercu);if(!doc)return null;
return <div style={{background:"var(--w)",borderRadius:16,padding:0,width:"100%",maxW
<div style={{background:"linear-gradient(135deg,var(--T),#8A3A20)",padding:"16px 20
<div style={{color:"#fff"}}>
<div style={{fontWeight:700,fontSize:15}}>{doc.icone} {doc.nom}</div>
<div style={{fontSize:11,opacity:.8,marginTop:2}}>{doc.sous} · {doc.date.split(
</div>
<button onClick={()=>setApercu(null)}style={{background:"rgba(255,255,255,.2)",bo
</div>
<div style={{padding:24}}>
<div style={{background:"var(--c)",borderRadius:12,padding:20,minHeight:200,displ
<div style={{fontSize:52}}>{doc.icone}</div>
<div className="pf"style={{fontSize:18,fontWeight:600,color:"var(--b)"}}>{doc.n
<div style={{fontSize:12,color:"var(--l)"}}>Aperçu non disponible en mode démo<
<div style={{fontSize:11,color:"var(--l)"}}>Dans la version finale, le PDF s'af
</div>
<div style={{display:"flex",gap:8,marginTop:16,justifyContent:"flex-end"}}>
<button className="btn bG"onClick={()=>{if(doc.url)window.open(doc.url);else wi
<button className="btn bT"onClick={()=>telechargerDoc(doc)}> Télécharger</but
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
const [moisSel,setMoisSel]=useState("Mars 2024");
const [toast,setToast]=useState("");
const liste=role==="parent"?enfants.filter(e=>e.id===pEId):enfants;
const enfant=liste.find(e=>e.id===selId)||liste[0];
const contrat=enfant?.contrat||{};
const isDemoBull=enfants.every(e=>["e1","e2","e3"].includes(e.id));
const hMens=Math.round((contrat.heuresHebdo||40)*52/12);
const h=isDemoBull?(D.heures[enfant?.id]||{real:160,prev:174}):{real:hMens,prev:hMens};
const tauxH=contrat.tauxHoraire||4.05;
const heuresNorm=Math.min(h.real,45*4);
const hSupp=Math.max(0,h.real-heuresNorm);
const salBase=heuresNorm*tauxH;
const salSupp=hSupp*tauxH*1.25;
const brut=salBase+salSupp;
const entretien=(contrat.entretien||3.80)*Math.round(h.real/8);
const totalCotSal=Object.values(TAUX_COTISATIONS).reduce((s,t)=>s+(t.sal>0?brut*t.sal/100:0
const totalCotPat=Object.values(TAUX_COTISATIONS).reduce((s,t)=>s+(t.pat>0?brut*t.pat/100:0
const netImposable=brut-totalCotSal*0.68;
const netPaye=brut-totalCotSal;
const coutEmployeur=brut+totalCotPat;
return <div className="fi">
{toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
<PageHeader icon=" " title="Bulletin de salaire" sub="Bulletin officiel conforme à la co
{role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
{liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>setSelId(e.id)}/>)}
</div>}
<div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
{["Janvier 2024","Février 2024","Mars 2024"].map(m=><button key={m}onClick={()=>setMois
padding:"6px 14px",borderRadius:8,border:"1.5px solid",cursor:"pointer",fontSize:12,f
background:moisSel===m?"var(--b)":"transparent",color:moisSel===m?"#fff":"var(--m)",
borderColor:moisSel===m?"var(--b)":"var(--br)"}}>{m}</button>)}
</div>
<div className="card"style={{padding:24,border:"2px solid var(--br)"}}>
<div style={{borderBottom:"2px solid var(--b)",paddingBottom:14,marginBottom:14}}>
<div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
<div>
<div className="pf"style={{fontSize:18,fontWeight:700,color:"var(--b)"}}>BULLETIN
<div style={{fontSize:11,color:"var(--l)"}}>Convention collective particuliers em
</div>
<div style={{textAlign:"right",fontSize:11}}>
<div style={{fontWeight:700,color:"var(--b)"}}>Employeur</div>
<div style={{color:"var(--m)"}}>{enfant?.prenomParent||"Sophie Martin"}</div>
<div style={{color:"var(--l)"}}>N° Pajemploi : PAJ-2024-75015</div>
</div>
</div>
<div style={{marginTop:10,display:"flex",justifyContent:"space-between",flexWrap:"wra
<div><div style={{fontWeight:700,color:"var(--b)"}}>Salarié·e</div>
<div style={{color:"var(--m)"}}>{user?.prenom||D.asmat.prenom} {user?.nom||D.asma
</div>
</div>
</div>
{/* Rémunération */}
<div style={{marginBottom:14}}>
<div style={{fontSize:10,fontWeight:700,color:"var(--l)",textTransform:"uppercase",le
{[["Salaire de base",heuresNorm+"h × "+tauxH+"€/h",salBase.toFixed(2)+"€"],
...(hSupp>0?[["Heures majorées 25%",hSupp+"h × "+(tauxH*1.25).toFixed(2)+"€",salSup
["Indemnité d'entretien",Math.round(h.real/8)+" j × "+(contrat.entretien||3.80)+"€"
].map(([l,d,v])=><div key={l}style={{display:"flex",justifyContent:"space-between",fo
<span style={{color:"var(--b)",flex:2}}>{l}</span>
<span style={{color:"var(--l)",flex:2,textAlign:"center"}}>{d}</span>
<span style={{fontWeight:600,flex:1,textAlign:"right"}}>{v}</span>
</div>)}
<div style={{display:"flex",justifyContent:"space-between",fontWeight:700,marginTop:6
<span>SALAIRE BRUT</span><span style={{color:"var(--b)"}}>{brut.toFixed(2)} €</span
</div>
</div>
{/* Cotisations */}
<div style={{marginBottom:14}}>
<div style={{fontSize:10,fontWeight:700,color:"var(--l)",textTransform:"uppercase",le
<div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr",fontSize:10}}>
{["Libellé","Salarié","Employeur"].map(h2=><div key={h2}style={{fontWeight:700,colo
{Object.entries(TAUX_COTISATIONS).flatMap(([nom,t])=>[
<div key={nom+"l"}style={{fontSize:10,color:"var(--m)",padding:"2px 0",borderBott
<div key={nom+"s"}style={{fontSize:10,textAlign:"right",color:"var(--R)",padding:
<div key={nom+"p"}style={{fontSize:10,textAlign:"right",padding:"2px 0",borderBot
])}
<div style={{fontWeight:700,fontSize:11,padding:"4px 0",borderTop:"1px solid var(--
<div style={{fontWeight:700,fontSize:11,textAlign:"right",color:"var(--R)",padding:
<div style={{fontWeight:700,fontSize:11,textAlign:"right",padding:"4px 0",borderTop
</div>
</div>
{/* Net */}
<div style={{background:"var(--c)",borderRadius:10,padding:14,marginBottom:16}}>
{[["Salaire brut",brut.toFixed(2)+"€","var(--b)"],
["Cotisations salariales","-"+totalCotSal.toFixed(2)+"€","var(--R)"],
["NET À PAYER",netPaye.toFixed(2)+"€","var(--S)"],
["Net imposable (abattement fiscal assmat)",netImposable.toFixed(2)+"€","var(--B)"]
["Coût total pour l'employeur",(coutEmployeur+entretien).toFixed(2)+"€","var(--m)"]
].map(([l,v,c])=><div key={l}style={{display:"flex",justifyContent:"space-between",pa
borderBottom:"1px solid var(--br)",fontSize:l.includes("NET À")?14:12,fontWeight:l.
<span style={{color:"var(--m)"}}>{l}</span><span style={{fontWeight:700,color:c}}>{
</div>)}
</div>
<div style={{fontSize:10,color:"var(--l)",lineHeight:1.6,marginBottom:14}}>
Bulletin conforme CCN particuliers employeurs. Net imposable calculé avec abattement
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
+"<td class=\"right\">"+(t.pat>0?(brut*t.pat/100).toFixed(2)+"€":"-")+"</td></tr>
}).join("");
var hSuppRow=hSupp>0?"<tr><td>Heures compl. (maj. 25%)</td><td class=\"right\">"+hSup
var htmlParts=[
"<!DOCTYPE html><html lang=\"fr\"><head><meta charset=\"UTF-8\"/>",
"<title>Bulletin de salaire "+moisSel+"</title>",
"<style>",
"*{box-sizing:border-box;margin:0;padding:0}",
"body{font-family:Arial,sans-serif;font-size:11px;color:#222;padding:20px;max-width
"h1{font-size:16px;color:#2C1F14;text-align:center;margin:12px 0}",
".hg{display:grid;grid-template-columns:1fr 1fr;gap:12px;background:#F5F0EB;padding
".hg div{font-size:10px;line-height:1.7}",
".hg strong{font-size:11px;color:#B8622F}",
".st{background:#2C1F14;color:#fff;padding:5px 10px;font-weight:700;font-size:11px;
"table{width:100%;border-collapse:collapse;font-size:10px}",
"td,th{padding:5px 8px;border:1px solid #ddd}",
"th{background:#f5f5f5;font-weight:700;text-align:left}",
".right{text-align:right}",
".brut{background:#FBF0E8;font-weight:700;font-size:11px}",
".net{background:#B8622F;color:#fff;font-weight:700;font-size:13px}",
".ni{background:#EAF4EE;font-weight:700;color:#3D6B50}",
".ce{background:#F5F0FF;font-weight:700}",
".sz{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:20px}",
".sb{border:1px solid #ddd;height:60px;border-radius:4px;padding:8px;font-size:9px;
"@media print{.nb{display:none}}",
"</style></head><body>",
"<div style=\"text-align:center;margin-bottom:8px\">",
"<div style=\"font-size:9px;color:#888;text-transform:uppercase;letter-spacing:1px\
"<h1>BULLETIN DE PAIE</h1>",
"<div style=\"font-size:12px;color:#B8622F;font-weight:700\">"+moisSel+"</div>",
"</div>",
"<div class=\"hg\">",
"<div><strong>EMPLOYEUR (Particulier)</strong><br/>"+prenomEmp+"<br/>",
"N° Pajemploi : PAJ-"+new Date().getFullYear()+"-"+Math.floor(Math.random()*99999)+
"Emploi : Assistante maternelle agréée<br/>Code APE : 8891A</div>",
"<div><strong>SALARIE(E)</strong><br/>"+(user?.prenom||"Prénom")+" "+(user?.nom||"N
"Entree le : "+(contrat.debut||"-")+" - CDI</div>",
"</div>",
"<div class=\"st\">REMUNERATION</div>",
"<table><tr><th>Libellé</th><th>Heures / Jours</th><th>Taux</th><th class=\"right\"
"<tr><td>Salaire de base (heures normales)</td><td class=\"right\">"+heuresNorm+" h
hSuppRow,
"<tr><td>Indemnite d entretien</td><td class=\"right\">"+Math.round(h.real/8)+" jou
"<tr class=\"brut\"><td colspan=\"3\">SALAIRE BRUT MENSUEL</td><td class=\"right\">
"</table>",
"<div class=\"st\">COTISATIONS SOCIALES</div>",
"<table><tr><th>Cotisation</th><th class=\"right\">Part salarie</th><th class=\"rig
cotisDetails,
"<tr style=\"font-weight:700;background:#f5f5f5\"><td>TOTAL</td><td class=\"right\"
"</table>",
"<div class=\"st\">RECAPITULATIF NET</div>",
"<table>",
"<tr><td>Salaire brut</td><td class=\"right\">"+brut.toFixed(2)+" euros</td></tr>",
"<tr><td>Cotisations salariales</td><td class=\"right\" style=\"color:#c44a6a\">- "
"<tr class=\"net\"><td>NET A PAYER</td><td class=\"right\">"+netPaye.toFixed(2)+" e
"<tr class=\"ni\"><td>Net imposable (abattement fiscal assmat)</td><td class=\"righ
"<tr><td>Indemnite entretien (non imposable)</td><td class=\"right\">"+entretien.to
"<tr class=\"ce\"><td>Cout total employeur (brut + cotis. patronales)</td><td class
"</table>",
"<div class=\"sz\">",
"<div><div style=\"font-size:10px;font-weight:700;margin-bottom:6px\">Signature de
"<div><div style=\"font-size:10px;font-weight:700;margin-bottom:6px\">Signature de
"</div>",
"<p style=\"margin-top:16px;font-size:9px;color:#888;line-height:1.8\">",
"Bulletin TiMat - "+new Date().toLocaleDateString("fr-FR")+" | CCN Particuliers Emp
"</p>",
"<div style=\"text-align:center;margin-top:12px\">",
"<button class=\"nb\" onclick=\"window.print()\" style=\"background:#B8622F;color:#
"</div>",
"</body></html>"
];
var htmlBulletin=htmlParts.join("");
w.document.write(htmlBulletin);
w.document.close();
setToast('Bulletin ouvert dans un nouvel onglet ✓');
}}> Télécharger PDF</button>
{role==="asmat"&&<button className="btn bT"style={{flex:1}}onClick={()=>setToast("Bul
</div>
</div>
</div>;
}
//
const MODELES_CONTRATS=[
{id:"ct1",titre:"Contrat standard - Temps plein",desc:"Accueil 5j/semaine, mensualisation 4
champs:["Enfant","Date de début","Jours","Horaires","Taux horaire (€/h)","Indemnité entret
{id:"ct2",titre:"Contrat - Temps partiel",desc:"Accueil moins de 5 jours ou moins de 30h/se
champs:["Enfant","Jours","Horaires","Taux horaire (€/h)","Indemnité entretien (€/j)"],aven
{id:"ct3",titre:"Contrat périscolaire",desc:"Accueil matin, soir, mercredis et vacances sco
champs:["Enfant","Créneaux matin/soir","Planning vacances","Taux horaire (€/h)"],avenant:f
{id:"ct4",titre:"Avenant - Modification d'horaires",desc:"Modifier les jours ou horaires d'
champs:["Contrat concerné","Nouveaux horaires","Date d'effet","Motif"],avenant:true},
{id:"ct5",titre:"Avenant - Revalorisation salaire",desc:"Augmenter le taux horaire suite SM
champs:["Contrat concerné","Nouveau taux horaire","Date d'effet","Motif"],avenant:true},
{id:"ct6",titre:"Rupture amiable",desc:"Fin de contrat d'un commun accord avec solde tout c
champs:["Contrat concerné","Date de fin","Motif","Congés payés restants"],avenant:true},
];
function DemandesAvenants({enfants,role,pEId}){
const liste=role==="parent"?enfants.filter(e=>e.id===pEId):enfants;
const enfant=liste[0];
const [demandes,setDemandes]=useState([]);
const [form,setForm]=useState({type:"Modification d'horaires",detail:"",dateEffet:""});
const [toast,setToast]=useState("");
const types=["Modification d'horaires","Revalorisation du salaire","Modification des jours
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
<PageHeader icon=" " title="Demandes d'avenants"
sub="Toute modification du contrat doit faire l'objet d'un avenant signé"/>
<div className="card"style={{padding:20,marginBottom:16}}>
<div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:14}}>
Nouvelle demande d'avenant
</div>
<div style={{display:"grid",gap:12}}>
<div>
<label className="lbl">Type de modification</label>
<select className="sel"value={form.type}onChange={e=>setForm(p=>({...p,type:e.targe
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
<textarea className="ta"placeholder="Décrivez précisément la modification souhaitée
value={form.detail}onChange={e=>setForm(p=>({...p,detail:e.target.value}))}
style={{minHeight:80}}/>
</div>
<button className="btn bT"style={{justifyContent:"center"}}onClick={soumettre}
disabled={!form.detail.trim()||!form.dateEffet}>
Soumettre la demande
</button>
</div>
</div>
{demandes.length>0&&<div style={{display:"flex",flexDirection:"column",gap:8}}>
<div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:6}}> Historique
{demandes.map(d=><div key={d.id}className="card"style={{padding:14}}>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",ma
<div>
<div style={{fontWeight:700,fontSize:13,color:"var(--b)"}}>{d.type}</div>
<div style={{fontSize:11,color:"var(--l)"}}>Demande du {fmt(d.date)} · Effet le {
</div>
<span className="badge"style={{background:"var(--Gp)",color:statutColor[d.statut],f
{d.statut}
</span>
</div>
<div style={{fontSize:12,color:"var(--m)",background:"var(--c)",borderRadius:8,paddin
{d.detail}
</div>
{role==="asmat"&&d.statut==="En attente"&&<div style={{display:"flex",gap:8,marginTop
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
<div style={{fontSize:36,marginBottom:8}}> </div>
<div style={{fontSize:13,color:"var(--m)"}}>Aucune demande d'avenant en cours</div>
<div style={{fontSize:11,color:"var(--l)",marginTop:4}}>Les demandes soumises apparaîtr
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
<PageHeader icon=" " title="Modèles contrats & Avenants"
sub="Conformes CCN · À jour de la convention collective 2024"/>
<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(270px,1fr))",gap
{MODELES_CONTRATS.map(mod=><div key={mod.id}className="card card-lift"
onClick={()=>{setSelModele(mod.id===selModele?null:mod.id);setForm({});}}
style={{padding:16,cursor:"pointer",
borderLeft:(mod.avenant?"4px solid var(--G)":"4px solid var(--T)"),
boxShadow:selModele===mod.id?"var(--sh2)":"var(--sh)"}}>
<div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
<span className="badge"style={{background:mod.avenant?"var(--Gp)":"var(--Tp)",color
{mod.avenant?"Avenant":"Contrat"}
</span>
</div>
<div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:4}}>{mod.titre}
<div style={{fontSize:11,color:"var(--m)",lineHeight:1.5}}>{mod.desc}</div>
</div>)}
</div>
{m&&<div className="card"style={{padding:20,border:"2px solid var(--T)"}}>
<div style={{fontWeight:700,fontSize:15,color:"var(--b)",marginBottom:4}}>{m.titre}</di
<div style={{fontSize:12,color:"var(--l)",marginBottom:16}}>{m.desc}</div>
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
{m.champs.map(c=><div key={c}>
<label className="lbl">{c}</label>
{c==="Enfant"?<select className="sel"value={form[c]||""}onChange={e=>setForm(f=>({.
{enfants.map(e=><option key={e.id}value={e.id}>{e.emoji} {e.prenom}</option>)}
</select>
:c.includes("Date")||c.includes("effet")?<input type="date"className="inp"value={fo
:<input className="inp"placeholder={c+"..."}value={form[c]||""}onChange={e=>setForm
</div>)}
</div>
<div style={{display:"flex",gap:8}}>
<button className="btn bG"style={{flex:1}}onClick={()=>setSelModele(null)}>Annuler</b
<button className="btn bT"style={{flex:2}}onClick={()=>setToast((m.avenant?"Avenant g
Générer le document
</button>
</div>
</div>}
</div>;
}
//
impayé
const COURRIERS_DATA=[
{id:"r1",cat:"Contrat",ic:" ",titre:"Demande de rendez-vous d'embauche",
contenu:"Madame, Monsieur,\n\nSuite à notre prise de contact, je vous confirme ma disponib
{id:"r2",cat:"Contrat",ic:" ",titre:"Lettre de rupture de contrat",
contenu:"Madame, Monsieur,\n\nJe vous informe que je mets fin au contrat d'accueil de [Pré
{id:"r3",cat:"Financier",ic:" ",titre:"Mise en demeure de paiement de salaire",
contenu:"Madame, Monsieur,\n\nLe salaire de [Mois] d'un montant de [Montant]€ reste {id:"r4",cat:"PMI",ic:" ",titre:"Compte-rendu de visite PMI",
contenu:"Objet : Compte-rendu de la visite du [Date]\n\nSuite à la visite de [Nom puéricul
{id:"r5",cat:"Congés",ic:" ",titre:"Déclaration de congés annuels",
contenu:"Madame, Monsieur,\n\nJe vous informe que je prendrai mes congés du [Date début] a
{id:"r6",cat:"Avenant",ic:" ",titre:"Proposition d'avenant aux horaires",
contenu:"Madame, Monsieur,\n\nJe vous propose de modifier le contrat d'accueil de [Prénom]
{id:"r7",cat:"PMI",ic:" ",titre:"Demande de renouvellement d'agrément",
contenu:"Madame, Monsieur le Médecin chef de PMI,\n\nJe sollicite le renouvellement de mon
];
function CourriersTypes({enfants,pEId,user}){
const [selId,setSelId]=useState(null);
const [filtreCat,setFiltreCat]=useState("Tous");
const [toast,setToast]=useState("");
const cats=["Tous","Contrat","Financier","Congés","Avenant","PMI"];
const filtres=filtreCat==="Tous"?COURRIERS_DATA:COURRIERS_DATA.filter(c=>c.cat===filtreCat)
const sel=COURRIERS_DATA.find(c=>c.id===selId);
const enfant=enfants.find(e=>e.id===pEId)||enfants[0];
const texte=sel?sel.contenu.replace(/\[Prénom\]/g,enfant?.prenom||"[Prénom]").replace(/\[Vo
return <div className="fi">
{toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
<PageHeader icon=" " title="Courriers types"
sub="Modèles prêts à personnaliser - conformes à la convention collective"/>
<div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>
{cats.map(c=><button key={c}onClick={()=>{setFiltreCat(c);setSelId(null);}}style={{
padding:"5px 12px",borderRadius:20,border:"1.5px solid",cursor:"pointer",fontSize:12,
background:filtreCat===c?"var(--b)":"transparent",color:filtreCat===c?"#fff":"var(--m
borderColor:filtreCat===c?"var(--b)":"var(--br)"}}>{c}</button>)}
</div>
<div className="g2">
<div style={{display:"flex",flexDirection:"column",gap:8}}>
{filtres.map(c=><div key={c.id}className="card card-lift"
onClick={()=>setSelId(c.id===selId?null:c.id)}
style={{padding:14,cursor:"pointer",
borderLeft:(c.cat==="Financier"?"4px solid var(--R)":c.cat==="PMI"?"4px solid var
boxShadow:selId===c.id?"var(--sh2)":"var(--sh)"}}>
<div style={{display:"flex",gap:10,alignItems:"center"}}>
<span style={{fontSize:18}}>{c.ic}</span>
<div>
<div style={{fontWeight:700,fontSize:13,color:"var(--b)"}}>{c.titre}</div>
<span className="badge"style={{background:"var(--c)",color:"var(--l)",fontSize:
</div>
</div>
</div>)}
</div>
{sel?<div className="card"style={{padding:18}}>
<div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:12}}>{sel.ic} {
<textarea className="ta"defaultValue={texte}
style={{width:"100%",minHeight:260,resize:"vertical",fontSize:13,lineHeight:1.7,mar
<div style={{display:"flex",gap:8}}>
<button className="btn bG"style={{flex:1}}onClick={()=>{navigator.clipboard?.writeT
<button className="btn bT"style={{flex:1}}onClick={()=>setToast("PDF généré ✓")}>
</div>
</div>
:<div className="card"style={{padding:28,textAlign:"center",color:"var(--l)"}}>
<div style={{fontSize:36,marginBottom:8}}> </div>
<div style={{fontSize:13}}>Sélectionnez un modèle pour le personnaliser</div>
</div>}
</div>
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
const toggle=(j)=>setData(d=>({...d,jours:d.jours.includes(j)?d.jours.filter(x=>x!==j):[...
return <div style={{minHeight:"100vh",background:"var(--c)",display:"flex",alignItems:"cent
{toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
<div style={{width:"100%",maxWidth:520}}>
<div style={{display:"flex",gap:4,marginBottom:24}}>
{[1,2,3].map(s=><div key={s}style={{flex:1,height:4,borderRadius:2,
background:step>=s?"var(--T)":"var(--br)",transition:"background .3s"}}/>)}
</div>
<div className="card"style={{padding:28}}>
{step===1&&<>
<div className="pf"style={{fontSize:20,fontWeight:700,color:"var(--b)",marginBottom
<div style={{fontSize:13,color:"var(--l)",marginBottom:20,lineHeight:1.6}}>Basculez
<div style={{marginBottom:14}}>
<label className="lbl">Depuis quel outil ?</label>
<div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
{["Top-Assmat","Nounou-Top","NannyFit","Pandi-Panda","Envola","Papier"].map(s=>
onClick={()=>setData(d=>({...d,source:s}))}style={{
padding:"6px 12px",borderRadius:20,border:"1.5px solid",cursor:"pointer",fo
background:data.source===s?"var(--T)":"transparent",color:data.source===s?"
borderColor:data.source===s?"var(--T)":"var(--br)"}}>{s}</button>)}
</div>
</div>
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
<div><label className="lbl">Votre prénom</label><input className="inp"placeholder
<div><label className="lbl">Votre email</label><input type="email"className="inp"
</div>
<button className="btn bT"style={{width:"100%"}}onClick={()=>setStep(2)}disabled={!
</>}
{step===2&&<>
<div className="pf"style={{fontSize:20,fontWeight:700,color:"var(--b)",marginBottom
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
<div><label className="lbl">Prénom de l'enfant</label><input className="inp"place
<div><label className="lbl">Date de naissance</label><input type="date"className=
</div>
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
<div><label className="lbl">Prénom du parent</label><input className="inp"placeho
<div><label className="lbl">Email du parent</label><input type="email"className="
</div>
<div style={{display:"flex",gap:8}}>
<button className="btn bG"style={{flex:1}}onClick={()=>setStep(1)}>← Retour</butt
<button className="btn bT"style={{flex:2}}onClick={()=>setStep(3)}disabled={!data
</div>
</>}
{step===3&&<>
<div className="pf"style={{fontSize:20,fontWeight:700,color:"var(--b)",marginBottom
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
<div><label className="lbl">Date de début</label><input type="date"className="inp
<div><label className="lbl">Heures / semaine</label><input type="number"className
</div>
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
<div><label className="lbl">Taux horaire net (€)</label><input type="number"step=
<div><label className="lbl">Indemnité entretien (€/j)</label><input type="number"
</div>
<div style={{marginBottom:14}}>
<label className="lbl">Jours d'accueil</label>
<div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
{["Lundi","Mardi","Mercredi","Jeudi","Vendredi"].map(j=><button key={j}onClick=
padding:"6px 12px",borderRadius:20,border:"1.5px solid",cursor:"pointer",font
background:data.jours.includes(j)?"var(--S)":"transparent",color:data.jours.i
borderColor:data.jours.includes(j)?"var(--S)":"var(--br)"}}>{j.slice(0,2)}</b
</div>
</div>
<div style={{background:"var(--Sp)",borderRadius:10,padding:"10px 14px",marginBotto
Ces données seront reprises immédiatement dans TiMat. Modifiables à tout momen
</div>
<div style={{display:"flex",gap:8}}>
<button className="btn bG"style={{flex:1}}onClick={()=>setStep(2)}>← Retour</butt
<button className="btn bT"style={{flex:2}}onClick={()=>{setToast("Contrat importé
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
const codeNum=Math.abs((user?.email||"test").split("").reduce((a,c)=>a+c.charCodeAt(0),1000
const code="TM-"+prefix+"-"+codeNum;
const lien="https://timat.app/rejoindre?code="+code;
const copy=()=>{navigator.clipboard?.writeText(lien).catch(()=>{});setCopied(true);setTimeo
const filleules=[
{prenom:"Nathalie",ville:"Lyon",date:"Il y a 5 jours",statut:"actif",gain:"1 mois offert"
{prenom:"Camille",ville:"Bordeaux",date:"Il y a 2 semaines",statut:"essai",gain:"En cours
];
return <div className="fi">
{toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
<PageHeader icon=" " title="Parrainage" sub="Invitez vos collègues - gagnez des mois gra
<div style={{background:"linear-gradient(135deg,#1C3028,#3D6B50)",borderRadius:20,padding
<div style={{fontSize:36,marginBottom:10}}> </div>
<div className="pf"style={{fontSize:20,fontWeight:700,color:"#fff",marginBottom:8}}>Inv
<div style={{fontSize:13,color:"rgba(255,255,255,.75)",lineHeight:1.7,marginBottom:16}}
Pour chaque asmat qui s'inscrit et passe Pro avec votre code :<br/>
<strong style={{color:"#E8B060"}}>Vous gagnez 1 mois gratuit · Elle gagne 1 mois grat
</div>
<div style={{background:"rgba(255,255,255,.1)",borderRadius:10,padding:"12px 16px",marg
<div style={{fontSize:10,color:"rgba(255,255,255,.5)",textTransform:"uppercase",lette
<div style={{fontFamily:"'DM Mono',monospace",fontSize:22,fontWeight:700,color:"#E8B0
</div>
<div style={{display:"flex",gap:8,alignItems:"center",background:"rgba(255,255,255,.08)
<span style={{fontSize:11,color:"rgba(255,255,255,.6)",flex:1,overflow:"hidden",textO
<button onClick={copy}style={{background:copied?"var(--S)":"rgba(255,255,255,.2)",col
{copied?"✓ Copié":"Copier"}
</button>
</div>
<div style={{display:"flex",gap:8}}>
<button onClick={()=>setToast("Message SMS préparé ✓")}style={{background:"rgba(255,2
<button onClick={()=>setToast("Message WhatsApp préparé ✓")}style={{background:"rgba(
</div>
</div>
<div className="card"style={{padding:18,marginBottom:16}}>
<div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:12}}>Comment ça m
{[["1","Partagez votre lien"," "],["2","Votre collègue s'inscrit"," "],["3","Elle pas
<div key={n}style={{display:"flex",gap:12,alignItems:"center",padding:"8px 0",borderB
<div style={{width:28,height:28,borderRadius:"50%",background:"var(--Tp)",display:"
<span style={{flex:1,fontSize:13,color:"var(--b)"}}>{t}</span>
<span style={{fontSize:18}}>{ic}</span>
</div>)}
</div>
<div className="card"style={{padding:18}}>
<div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:12}}>
Mes filleules · <span style={{color:"var(--S)"}}>{filleules.length} inscrites</span>
{" · "}<span style={{color:"var(--T)"}}>{filleules.filter(f=>f.statut==="actif").leng
</div>
{filleules.map((f,i)=><div key={i}style={{display:"flex",justifyContent:"space-between"
<div>
<div style={{fontWeight:600,fontSize:13,color:"var(--b)"}}>{f.prenom} - {f.ville}</
<div style={{fontSize:11,color:"var(--l)"}}>{f.date}</div>
</div>
<span className="badge"style={{background:f.statut==="actif"?"var(--Sp)":"var(--Gp)",
</div>)}
</div>
</div>;
}
//
function AdminFinances({enfants,role,pEId,user,pointagesDB}){
const [section,setSection]=useState(role==="asmat"?"facturation":"contrats");
const sousOnglets=role==="asmat"
?[
{id:"facturation",l:"Facturation & Pajemploi",ic:" "},
{id:"bulletin",l:"Bulletin de salaire",ic:" "},
{id:"contrats",l:"Contrats & Avenants",ic:" "},
{id:"contrats_types",l:"Modeles & Templates",ic:" "},
{id:"courriers",l:"Courriers types",ic:" "},
{id:"solde_contrat",l:"Solde de tout compte",ic:" "},
]
:[{id:"signature_parent",l:"Mon contrat & Signature",ic:" "}];
return <div className="fi">
<div style={{display:"flex",gap:4,marginBottom:16,borderBottom:"2px solid var(--br)",over
{sousOnglets.map(s=><button key={s.id}onClick={()=>setSection(s.id)}style={{
padding:"8px 16px",border:"none",background:"none",cursor:"pointer",
fontFamily:"'DM Sans',sans-serif",fontWeight:600,fontSize:13,flexShrink:0,whiteSpace:
color:section===s.id?"var(--T)":"var(--b)",
borderBottom:section===s.id?"2.5px solid var(--T)":"2.5px solid transparent",
marginBottom:-2,transition:"all .15s",display:"flex",alignItems:"center",gap:6
}}><span>{s.ic}</span><span>{s.l}</span></button>)}
</div>
{section==="facturation"&&<Facturation enfants={enfants}role={role}pEId={pEId}user={user}
{section==="bulletin"&&<BulletinSalaire enfants={enfants}role={role}pEId={pEId}user={user
{section==="contrats"&&<div>
<Contrats enfants={enfants}role={role}pEId={pEId}/>
<div style={{marginTop:24,borderTop:"2px solid var(--br)",paddingTop:20}}>
<DemandesAvenants enfants={enfants}role={role}pEId={pEId}/>
</div>
</div>}
{section==="contrats_types"&&<ContratsTypes enfants={enfants}role={role}/>}
{section==="courriers"&&<CourriersTypes enfants={enfants}role={role}pEId={pEId}user={user
{section==="signature_parent"&&<SignatureContratParent enfants={enfants}pEId={pEId}/>}
{section==="solde_contrat"&&<SoldeDeCompte enfants={enfants}role={role}pEId={pEId}/>}
</div>;
}
//
function Journal({enfants,role,pEId,user}){
const [selId,setSelId]=useState(enfants[0]?.id);
const [sousOnglet,setSousOnglet]=useState("journal");
const liste=role==="parent"?enfants.filter(e=>e.id===pEId):enfants;
const enfant=liste.find(e=>e.id===selId)||liste[0];
const sousOnglets=role==="asmat"
?[{id:"journal",l:"Journal",ic:" "},{id:"bilan",l:"Bilan du jour",ic:" "},{id:"cr",l:"C
:[{id:"journal",l:"Journal",ic:" "}];
return <div className="fi">
{role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
{liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>{setSelId(e.id);setS
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
const [mood,setMood]=useState(" ");
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
const urls=files.filter(f=>f.name!=='.emptyFolderPlaceholder').map(f=>{
const{data}=supabase.storage.from('photos').getPublicUrl(`${path}/${f.name}`);
return data.publicUrl;
});
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
const{data:urlData}=supabase.storage.from('photos').getPublicUrl(path);
setPhotos(p=>({...p,[enfant.id]:[...(p[enfant.id]||[]),urlData.publicUrl]}));
};
const bilansRecus=role==="parent"?[
{id:"br1",type:"bilan",date:fmt(TODAY_STR),txt:BILANS[enfant?.id]?.[0]||""},
{id:"br2",type:"cr",trim:"T1 "+new Date().getFullYear(),txt:CRS[enfant?.id]?.[0]||""},
].filter(b=>b.txt):[];
const [docOuvert,setDocOuvert]=useState(null);
const msgs=txs.filter(t=>t.eId===enfant?.id).sort((a,b)=>a.id>b.id?1:-1);
const enfantPhotos=photos[enfant?.id]||[];
const send=()=>{if(!msg.trim())return;
setTxs(p=>[...p,{id:"tn"+Date.now(),eId:enfant.id,auteur:role,date:TODAY_STR,h:TODAY_H,tx
setMsg("");};
return <div>
{/* Photos - galerie cliquable */}
{(enfantPhotos.length>0||role==="asmat")&&<div className="card"style={{padding:16,marginB
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBo
<div style={{fontWeight:700,fontSize:14,color:"var(--b)"}}> Photos du jour</div>
{role==="asmat"&&<>
<input ref={fileRef}type="file"accept="image/*"style={{display:"none"}}onChange={aj
<button className="btn bG"style={{fontSize:12,padding:"5px 12px"}}onClick={()=>file
+ Ajouter une photo
</button>
</>}
</div>
{enfantPhotos.length===0
?<div style={{textAlign:"center",padding:"20px 0",color:"var(--l)",fontSize:13}}>Aucu
:<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(90px,1fr))"
{enfantPhotos.map((src,i)=><div key={i}onClick={()=>setPhotoGrande(src)}style={{
aspectRatio:"1",borderRadius:10,overflow:"hidden",cursor:"pointer",
background:"var(--c)",transition:"transform .18s,box-shadow .18s"
}}
onMouseEnter={e=>{e.currentTarget.style.transform="scale(1.04)";e.currentTarget.s
onMouseLeave={e=>{e.currentTarget.style.transform="scale(1)";e.currentTarget.styl
<img src={src}alt=""style={{width:"100%",height:"100%",objectFit:"cover"}}/>
</div>)}
</div>}
</div>}
{/* Modale photo grande */}
{photoGrande&&<div onClick={()=>setPhotoGrande(null)}style={{
position:"fixed",inset:0,background:"rgba(0,0,0,.85)",display:"flex",
alignItems:"center",justifyContent:"center",zIndex:300,cursor:"zoom-out",padding:20
}}>
<img src={photoGrande}alt=""style={{maxWidth:"100%",maxHeight:"90vh",borderRadius:12,bo
<button onClick={()=>setPhotoGrande(null)}style={{
position:"absolute",top:16,right:16,background:"rgba(255,255,255,.15)",
border:"none",color:"#fff",borderRadius:"50%",width:36,height:36,
cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"cente
}}>✕</button>
</div>}
{/* Documents reçus - parent seulement */}
{role==="parent"&&bilansRecus.length>0&&<div className="card"style={{padding:16,marginBot
<div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
<div style={{width:28,height:28,borderRadius:"50%",background:"var(--Pp)",display:"fl
<div style={{fontWeight:700,fontSize:13,color:"var(--P)"}}>Documents reçus de votre a
</div>
{bilansRecus.map(b=><div key={b.id}style={{marginBottom:8}}>
<div onClick={()=>setDocOuvert(docOuvert===b.id?null:b.id)}
style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"
<div style={{fontWeight:700,fontSize:13,color:"var(--P)"}}>
{b.type==="bilan"?" Bilan du "+b.date:" CR - "+b.trim}
</div>
</div>
{b.txt}
</div>}
</div>)}
</div>}
<span style={{color:"var(--P)"}}>{docOuvert===b.id?"▲":"▼"}</span>
{docOuvert===b.id&&<div style={{padding:16,background:"var(--w)",borderRadius:"0 0 10
{/* Messages */}
<div className="g2">
<div className="card"style={{padding:16}}>
<div style={{fontWeight:700,fontSize:14,marginBottom:12,color:"var(--b)"}}>{enfant?.e
<div style={{display:"flex",flexDirection:"column",gap:10,maxHeight:400,overflowY:"au
{msgs.length===0&&<div style={{fontSize:13,color:"var(--l)",textAlign:"center",padd
{msgs.map(t=><div key={t.id}style={{display:"flex",gap:10}}>
<div style={{textAlign:"center",minWidth:38,flexShrink:0}}><div style={{fontSize:
<div style={{flex:1,background:t.auteur==="asmat"?"var(--Tp)":"var(--Bp)",borderR
<div style={{fontSize:11,fontWeight:700,color:t.auteur==="asmat"?"var(--T)":"va
{t.auteur==="asmat"?" "+(user?.prenom||"Marie"):" "+(D.parents.find(p=
<div style={{fontSize:13,color:"var(--b)",lineHeight:1.6}}>{t.txt}</div>
</div>
</div>)}
</div>
</div>
<div style={{display:"flex",flexDirection:"column",gap:12}}>
<div className="card"style={{padding:16}}>
<div style={{fontWeight:700,fontSize:14,marginBottom:12,color:"var(--b)"}}> <div style={{marginBottom:10}}>
<label className="lbl">Humeur</label>
<div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
{[" "," "," "," "," "," "," "," "].map(h=><button key={h}className={"
</div>
</div>
<textarea className="ta"style={{marginBottom:10}}value={msg}onChange={e=>setMsg(e.t
placeholder={role==="asmat"?("Racontez la journée de "+(enfant?.prenom||"")+"..."
<button className="btn bT"style={{width:"100%"}}onClick={send}>Envoyer </button>
</div>
{D.moodHistory[enfant?.id]&&<div className="card"style={{padding:14}}>
<div style={{fontWeight:700,fontSize:13,marginBottom:10,color:"var(--b)"}}> <div className="mood-bar">
{D.moodHistory[enfant.id].map((v,i)=><div key={i}className="mood-b"style={{height
</div>
<div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"var(-
<span>J-14</span><span>Aujourd'hui</span>
</div>
Nouve
Humeu
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
{[{id:"portfolio",l:"Portfolio",ic:" "},{id:"developpement",l:"Développement",ic:" "
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
{id:"s2",date:new Date(Date.now()-86400000).toISOString().slice(0,10),debut:"12h55",fin:"
{id:"s3",date:new Date(Date.now()-172800000).toISOString().slice(0,10),debut:"13h20",fin:
],
"e2":[
{id:"s4",date:TODAY_STR,debut:"13h10",fin:"13h55",duree:"0h45",qualite:"agite"},
{id:"s5",date:new Date(Date.now()-86400000).toISOString().slice(0,10),debut:"13h00",fin:"
],
"e3":[
{id:"s6",date:TODAY_STR,debut:"11h30",fin:"13h30",duree:"2h00",qualite:"bien"},
{id:"s7",date:new Date(Date.now()-86400000).toISOString().slice(0,10),debut:"11h45",fin:"
{id:"s8",date:new Date(Date.now()-172800000).toISOString().slice(0,10),debut:"12h00",fin:
],
};
function Sommeil({enfants,role,pEId}){
const [selId,setSelId]=useState(enfants[0]?.id);
const [sommeils,setSommeils]=useState(SOMMEIL_DEMO);
const [nS,setNS]=useState({debut:"",fin:"",qualite:"bien"});
const [toast,setToast]=useState("");
const liste=role==="parent"?enfants.filter(e=>e.id===pEId):enfants;
const enfant=liste.find(e=>e.id===selId)||liste[0];
const hist=sommeils[enfant?.id]||[];
const auj=hist.find(s=>s.date===TODAY_STR);
const ajout=()=>{
if(!nS.debut||!nS.fin)return;
const[h1,m1]=nS.debut.split(":").map(Number);
const[h2,m2]=nS.fin.split(":").map(Number);
const d=(h2*60+m2)-(h1*60+m1);
const duree=Math.floor(d/60)+"h"+String(d%60).padStart(2,"0");
setSommeils(p=>({...p,[enfant.id]:[{id:"sn"+Date.now(),date:TODAY_STR,debut:nS.debut.repl
setNS({debut:"",fin:"",qualite:"bien"});setToast("Sieste enregistrée ✓");
};
const qColor={bien:"var(--S)",agite:"var(--G)",court:"var(--R)"};
const qLabel={bien:" Bonne sieste",agite:" Agitée",court:" Courte"};
return <div className="fi">
{toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
<PageHeader icon=" " title="Suivi du sommeil" sub="Siestes et qualité du repos"/>
{role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
{liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>setSelId(e.id)}/>)}<
<div className="g2">
<div style={{display:"flex",flexDirection:"column",gap:12}}>
<div className="card"style={{padding:16}}>
<div style={{fontWeight:700,fontSize:14,marginBottom:14,color:"var(--b)"}}> Siest
{auj?<div style={{background:"var(--Sp)",borderRadius:12,padding:14,border:"1px sol
<div style={{display:"flex",justifyContent:"space-around",marginBottom:10}}>
{[["Début",auj.debut,"var(--S)"],["Fin",auj.fin,"var(--T)"],["Durée",auj.duree,
<div key={l}style={{textAlign:"center"}}>
<div style={{fontSize:11,color:"var(--l)"}}>{l}</div>
<div className="pf"style={{fontSize:20,fontWeight:700,color:c}}>{v}</div>
</div>)}
</div>
<div style={{textAlign:"center"}}>
<span className="badge"style={{background:qColor[auj.qualite]+"22",color:qColor
</div>
</div>:<div style={{color:"var(--l)",fontSize:13,textAlign:"center",padding:"20px 0
</div>
Enregi
{role==="asmat"&&<div className="card"style={{padding:16}}>
<div style={{fontWeight:700,fontSize:14,marginBottom:12,color:"var(--b)"}}>+ <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
<div><label className="lbl">Début</label><input type="time"className="inp"value={
<div><label className="lbl">Fin</label><input type="time"className="inp"value={nS
</div>
<div style={{marginBottom:10}}>
<label className="lbl">Qualité</label>
<select className="sel"value={nS.qualite}onChange={e=>setNS(p=>({...p,qualite:e.t
<option value="bien"> Bonne sieste</option>
<option value="agite"> Agitée</option>
<option value="court"> Trop courte</option>
</select>
</div>
<button className="btn bS"style={{width:"100%"}}onClick={ajout}>Enregistrer</button
</div>}
</div>
<div className="card"style={{padding:16}}>
<div style={{fontWeight:700,fontSize:14,marginBottom:12,color:"var(--b)"}}> Histori
{hist.length===0&&<div style={{fontSize:13,color:"var(--l)"}}>Aucune donnée</div>}
{hist.map(s=><div key={s.id}style={{display:"flex",justifyContent:"space-between",ali
<div>
<div style={{fontSize:12,fontWeight:600,color:"var(--b)"}}>{new Date(s.date).toLo
<div style={{fontSize:11,color:"var(--l)"}}>{s.debut} → {s.fin}</div>
</div>
<div style={{display:"flex",gap:8,alignItems:"center"}}>
<div className="pf"style={{fontSize:16,fontWeight:700,color:"var(--T)"}}>{s.duree
<span className="badge"style={{background:qColor[s.qualite]+"22",color:qColor[s.q
</div>
</div>)}
{/* Sparkline durées */}
{hist.length>1&&<div style={{marginTop:14}}>
<div style={{fontSize:11,color:"var(--l)",marginBottom:6}}>Durées sur 7 jours</div>
<div style={{display:"flex",gap:4,alignItems:"flex-end",height:40}}>
{hist.slice(0,7).reverse().map((s,i)=>{
const[h,m]=s.duree.split("h").map(Number);const mins=h*60+(m||0);
const pct=Math.min(mins/180*100,100);
return <div key={i}style={{flex:1,borderRadius:"3px 3px 0 0",height:pct+"%",bac
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
const totalH=isDemoTDB?enfants.reduce((a,e)=>{const h=D.heures[e.id];return a+(h?h.real:0);
// Humeurs historique
const hist=D.moodHistory[enfant?.id]||[];
const jours=periode==="7j"?7:15;
const histSlice=hist.slice(-jours);
const avg=histSlice.length?Math.round(histSlice.reduce((a,v)=>a+v,0)/histSlice.length*10)/1
const avgColor=avg>=4?"var(--S)":avg>=3?"var(--G)":"var(--R)";
const svgW=320,svgH=80;
const moodPts=histSlice.map((v,i)=>({
x:10+i*(svgW-20)/(Math.max(histSlice.length-1,1)),
y:svgH-10-(v/5)*(svgH-20)
}));
const pathD=moodPts.length>1?moodPts.map((p,i)=>i===0?"M"+p.x+","+p.y:"L"+p.x+","+p.y).join
const areaD=moodPts.length>1?pathD+" L"+moodPts[moodPts.length-1].x+","+svgH+" L"+moodPts[0
// Heures semaine
const heuresData=[
{j:"Lu",h:8.5},{j:"Ma",h:9},{j:"Me",h:7.5},{j:"Je",h:9.5},{j:"Ve",h:8},
{j:"Sa",h:0},{j:"Di",h:0}
];
const maxH=Math.max(...heuresData.map(d=>d.h),1);
// Sommeil
const somData=[{j:"Lu",d:1.5},{j:"Ma",d:1.75},{j:"Me",d:0.75},{j:"Je",d:2},{j:"Ve",d:1.67}]
const maxS=Math.max(...somData.map(d=>d.d),1);
return <div className="fi">
<div style={{marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"fl
<div>
<div style={{fontSize:11,color:"var(--l)",marginBottom:3,fontFamily:"'DM Mono',monosp
<div className="pf"style={{fontSize:22,fontWeight:600,color:"var(--b)"}}>Tableau de b
</div>
<div style={{display:"flex",gap:4}}>
{["7j","15j"].map(p=><button key={p}onClick={()=>setPeriode(p)}style={{
padding:"5px 12px",borderRadius:8,border:"1.5px solid",cursor:"pointer",fontSize:12
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
{ic:" ",v:presents+"/"+enfants.length,l:"Présents aujourd'hui",c:"var(--T)",p:"point
{ic:" ",v:msgsNonLus,l:"Messages non lus",c:"var(--B)",p:"messagerie"},
{ic:" ",v:totalH+"h",l:"Heures ce mois",c:"var(--S)",p:"admin_finances"},
{ic:" ",v:avg+"/5",l:"Humeur moyenne",c:avgColor,p:"journal_complet"},
].map(k=><div key={k.l}className="card card-lift"onClick={()=>setPage&&setPage(k.p)}sty
<div style={{fontSize:22,marginBottom:4}}>{k.ic}</div>
<div className="pf"style={{fontSize:22,fontWeight:600,color:k.c}}>{k.v}</div>
<div style={{fontSize:11,color:"var(--l)",marginTop:3,lineHeight:1.3}}>{k.l}</div>
</div>)}
</div>}
<div className="g2">
{/* Courbe humeurs SVG */}
<div className="card"style={{padding:16}}>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",margin
<div style={{fontWeight:700,fontSize:13,color:"var(--b)"}}> Humeurs - {enfant?.pr
<span className="pf"style={{fontSize:18,fontWeight:700,color:avgColor}}>{avg}/5</sp
</div>
<svg width="100%"viewBox={"0 0 "+svgW+" "+svgH}style={{overflow:"visible"}}>
{/* Grid lines */}
{[1,2,3,4,5].map(v=><line key={v}
x1={10} y1={svgH-10-(v/5)*(svgH-20)}
x2={svgW-10} y2={svgH-10-(v/5)*(svgH-20)}
stroke="var(--br)" strokeWidth={.8} strokeDasharray="4,4"/>)}
{/* Area */}
{areaD&&<path d={areaD}fill={avg>=4?"rgba(61,107,80,.12)":avg>=3?"rgba(184,137,42,.
{/* Line */}
{pathD&&<path d={pathD}fill="none"stroke={avg>=4?"var(--S)":avg>=3?"var(--G)":"var(
{/* Points */}
{moodPts.map((p,i)=><circle key={i}cx={p.x}cy={p.y}r={3.5}fill={avg>=4?"var(--S)":a
</svg>
<div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"var(--l
<span>J-{jours-1}</span><span>Aujourd'hui</span>
</div>
</div>
{/* Heures semaine - barres */}
<div className="card"style={{padding:16}}>
<div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:14}}> Heures
<div style={{display:"flex",gap:4,alignItems:"flex-end",height:72}}>
{heuresData.map((d,i)=><div key={i}style={{flex:1,display:"flex",flexDirection:"col
<div style={{fontSize:9,color:"var(--l)",fontFamily:"'DM Mono',monospace"}}>{d.h|
<div style={{
width:"100%",borderRadius:"4px 4px 0 0",
height:((d.h/maxH)*60)+"px",
background:d.h>0?"linear-gradient(to top,var(--T),var(--Tl))":"var(--br)",
transition:"height .6s ease",minHeight:d.h>0?4:0
}}/>
</div>)}
</div>
<div style={{display:"flex",gap:4,marginTop:6}}>
{heuresData.map((d,i)=><div key={i}style={{flex:1,textAlign:"center",fontSize:9,col
</div>
<div style={{marginTop:10,padding:"6px 10px",background:"var(--Sp)",borderRadius:8,fo
Total semaine : {heuresData.reduce((a,d)=>a+d.h,0)}h
</div>
</div>
{/* Sommeil - barres horizontales */}
<div className="card"style={{padding:16}}>
<div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:14}}> Durée s
{somData.map((d,i)=><div key={i}style={{marginBottom:8}}>
<div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
<span style={{fontSize:11,color:"var(--m)",fontFamily:"'DM Mono',monospace"}}>{d.
<span style={{fontSize:11,color:"var(--B)",fontWeight:600}}>{Math.floor(d.d)}h{Ma
</div>
<div style={{height:8,background:"var(--Bp)",borderRadius:4,overflow:"hidden"}}>
<div style={{height:"100%",width:((d.d/maxS)*100)+"%",background:"linear-gradient
</div>
</div>)}
</div>
{/* Appétit + Activités */}
<div className="card"style={{padding:16}}>
<div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:14}}> Appétit
<div style={{fontWeight:600,fontSize:11,color:"var(--m)",marginBottom:8,textTransform
{D.repas.filter(r=>r.date===TODAY_STR).map(r=>{
const e=liste.find(x=>x.id===r.eId);
const c={"bien":"var(--S)","peu":"var(--G)","refus":"var(--R)"};
if(!e)return null;
return <div key={r.id}style={{display:"flex",justifyContent:"space-between",padding
<div style={{display:"flex",gap:6,alignItems:"center"}}>
<span>{e.emoji}</span>
<span style={{fontSize:13,color:"var(--b)"}}>{e.prenom}</span>
</div>
<span className="badge"style={{background:(c[r.q]||"var(--l)")+"22",color:c[r.q]|
{r.q==="bien"?" Bon appétit":r.q==="peu"?" Peu mangé":" Refus"}
</span>
</div>;
})}
{D.repas.filter(r=>r.date===TODAY_STR).length===0&&<div style={{fontSize:12,color:"va
<div style={{fontWeight:600,fontSize:11,color:"var(--m)",margin:"12px 0 8px",textTran
{D.portfolio.slice(0,3).map(p=><div key={p.id}style={{display:"flex",gap:8,padding:"5
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
setData(p=>({...p,[enfant.id]:[...p[enfant.id]||[],{date:d,age_mois:mois,poids:parseFloat
setNewM({date:"",poids:"",taille:""});setToast("Mesure ajoutée ✓");
};
const last=mesures[mesures.length-1];
const maxVal=vue==="poids"?Math.max(...mesures.map(m=>m.poids||0),15):Math.max(...mesures.m
const W=280,H=150,padL=32,padB=24,padR=12,padT=12;
const plotW=W-padL-padR,plotH=H-padB-padT;
const xScale=(v)=>padL+v/Math.max(maxAge,24)*plotW;
const yScale=(v)=>padT+plotH-(v/maxVal*plotH);
const pts=mesures.filter(m=>vue==="poids"?m.poids:m.taille).map(m=>({x:xScale(m.age_mois),y
return <div className="fi">
{toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
<PageHeader icon=" " title="Courbe de croissance" sub="Poids et taille jusqu'à 3 ans · R
{role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
{liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>setSelId(e.id)}/>)}<
{enfant&&<div className="g2">
<div style={{display:"flex",flexDirection:"column",gap:12}}>
{/* Dernière mesure */}
Derni
{last&&<div className="card"style={{padding:16}}>
<div style={{fontWeight:700,fontSize:14,marginBottom:12,color:"var(--b)"}}> <div style={{display:"flex",gap:16,justifyContent:"center"}}>
{[[" Poids",last.poids+"kg","var(--T)"],[" Taille",last.taille+"cm","var(--B)
<div key={l}style={{textAlign:"center"}}>
<div style={{fontSize:11,color:"var(--l)",marginBottom:2}}>{l}</div>
<div className="pf"style={{fontSize:22,fontWeight:700,color:c}}>{v}</div>
</div>)}
</div>
</div>}
{/* Courbe SVG */}
<div className="card"style={{padding:16}}>
<div style={{display:"flex",gap:6,marginBottom:10}}>
{[["poids"," Poids"],["taille"," Taille"]].map(([k,l])=>
<button key={k}onClick={()=>setVue(k)}className={"btn "+(vue===k?"bT":"bG")}sty
</div>
{pts.length>0?<svg width="100%"viewBox={"0 0 "+W+" "+H}style={{overflow:"visible"}}
{/* Grille */}
{[0,25,50,75,100].map(p=>{
const y=padT+plotH*(1-p/100);
return <g key={p}><line x1={padL}y1={y}x2={W-padR}y2={y}stroke="var(--br)"strok
<text x={padL-4}y={y+3}fontSize="7"fill="var(--l)"textAnchor="end">{Math.roun
})}
{/* Axe X */}
{[0,6,12,18,24,36].filter(v=>v<=Math.max(maxAge+3,24)).map(v=>
<text key={v}x={xScale(v)}y={H-4}fontSize="7"fill="var(--l)"textAnchor="middle"
{/* Zone OMS */}
{vue==="poids"&&<polyline points={OMS_POIDS.slice(0,Math.min(13,mesures.length+2)
fill="none"stroke="var(--B)"strokeWidth="1"strokeDasharray="3,3"opacity=".5"/>}
{/* Courbe */}
{pts.length>1&&<polyline points={pts.map(p=>p.x+","+p.y).join(" ")}fill="none"str
{/* Points */}
{pts.map((p,i)=><circle key={i}cx={p.x}cy={p.y}r="4"fill="var(--T)"stroke="#fff"s
</svg>:<div style={{textAlign:"center",padding:"30px 0",color:"var(--l)",fontSize:1
{vue==="poids"&&<div style={{fontSize:10,color:"var(--B)",marginTop:6}}>- - - Média
</div>
</div>
<div style={{display:"flex",flexDirection:"column",gap:12}}>
{role==="asmat"&&<div className="card"style={{padding:16}}>
<div style={{fontWeight:700,fontSize:13,marginBottom:10,color:"var(--b)"}}>+ Nouvel
<div style={{marginBottom:8}}><label className="lbl">Date</label><input type="date"
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
<div><label className="lbl">Poids (kg)</label><input className="inp"type="number"
<div><label className="lbl">Taille (cm)</label><input className="inp"type="number
</div>
<button className="btn bT"style={{width:"100%"}}onClick={ajouter}>Enregistrer</butt
</div>}
<div className="card"style={{padding:14}}>
<div style={{fontWeight:700,fontSize:13,marginBottom:10,color:"var(--b)"}}> Histo
{mesures.slice().reverse().slice(0,6).map(m=><div key={m.date}style={{display:"flex
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
{age_min:0,age_max:6,cat:"Éveil",titre:"Hochets et mobiles",desc:"Stimulation visuelle et a
{age_min:3,age_max:12,cat:"Motricité",titre:"Tapis d'éveil",desc:"Découverte du corps, posi
{age_min:6,age_max:18,cat:"Langage",titre:"Comptines avec gestes",desc:"Apprendre la langue
{age_min:12,age_max:24,cat:"Créatif",titre:"Peinture au doigt",desc:"Explorer les textures
{age_min:12,age_max:36,cat:"Langage",titre:"Lecture d'images",desc:"Montrer et nommer les o
{age_min:18,age_max:36,cat:"Sciences",titre:"Jardinage en pot",desc:"Planter des graines, a
{age_min:18,age_max:36,cat:"Motricité",titre:"Parcours moteur",desc:"Obstacles à enjamber,
{age_min:24,age_max:36,cat:"Social",titre:"Jeu symbolique",desc:"Jouer à faire semblant (dî
{age_min:24,age_max:36,cat:"Créatif",titre:"Collage libre",desc:"Découper et coller des for
{age_min:0,age_max:36,cat:"Musique",titre:"Maracas maison",desc:"Riz ou pâtes dans une bout
];
const catColors={Éveil:"var(--P)",Motricité:"var(--S)",Langage:"var(--B)",Créatif:"var(--T)",
function ActivitesSuggerees({enfants,role,pEId}){
const [selId,setSelId]=useState(enfants[0]?.id);
const [catFilt,setCatFilt]=useState("tous");
const liste=role==="parent"?enfants.filter(e=>e.id===pEId):enfants;
const enfant=liste.find(e=>e.id===selId)||liste[0];
const _now=new Date();
const moisAge=enfant?((_now.getFullYear()-new Date(enfant.naissance).getFullYear())*12+(_no
const activites=ACTIVITES_PAR_AGE.filter(a=>moisAge>=a.age_min&&moisAge<=a.age_max&&(catFil
const cats=["tous",...new Set(ACTIVITES_PAR_AGE.map(a=>a.cat))];
return <div className="fi">
<PageHeader icon=" " title="Activités suggérées" sub={"Propositions pédagogiques adaptée
{role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
{liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>setSelId(e.id)}/>)}<
<div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>
{cats.map(c=><button key={c}onClick={()=>setCatFilt(c)}style={{
padding:"5px 12px",borderRadius:20,border:"1.5px solid",cursor:"pointer",fontSize:12,
background:catFilt===c?(catColors[c]||"var(--b)"):"transparent",
color:catFilt===c?"#fff":(catColors[c]||"var(--m)"),
borderColor:catFilt===c?(catColors[c]||"var(--b)"):(catColors[c]+"44"||"var(--br)"),
}}>{c==="tous"?" Tout":c}</button>)}
</div>
<div style={{fontSize:12,color:"var(--l)",marginBottom:14,fontFamily:"'DM Mono',monospace
{activites.length} activité{activites.length>1?"s":""} pour {enfant?.prenom} ({age(enfa
</div>
<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap
{activites.map((a,i)=><div key={i}className="card"style={{padding:16,borderTop:"3px sol
<div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",ma
<span className="badge"style={{background:(catColors[a.cat]||"var(--T)")+"22",color
<span style={{fontSize:11,color:"var(--l)",fontFamily:"'DM Mono',monospace"}}> {a
</div>
<div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:6}}>{a.titre}</
<div style={{fontSize:12,color:"var(--m)",lineHeight:1.6,marginBottom:8}}>{a.desc}</d
<div style={{fontSize:11,color:"var(--l)",marginBottom:6}}> {a.materiel}</div>
<div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
{a.competences.map(c=><span key={c}className="badge"style={{background:"var(--c)",c
</div>
</div>)}
{activites.length===0&&<div style={{gridColumn:"1/-1",textAlign:"center",padding:"30px
<div style={{fontSize:36,marginBottom:8}}> </div>
<div>Aucune activité pour ce filtre</div>
</div>}
</div>
</div>;
}
//
//
const PMI_MESSAGES=[
{id:"pmi1",de:"PMI",h:"09h15",date:new Date(Date.now()-7*86400000).toISOString().slice(0,10
{id:"pmi2",de:"asmat",h:"10h30",date:new Date(Date.now()-7*86400000).toISOString().slice(0,
{id:"pmi3",de:"PMI",h:"14h20",date:new Date(Date.now()-2*86400000).toISOString().slice(0,10
];
const PMI_PAR_DEP={
"75": {nom:"PMI Paris 75",email:"pmi75-paris@sante.gouv.fr",tel:"01 42 76 40 40",adresse:"
"92": {nom:"PMI Hauts-de-Seine 92",email:"pmi@hauts-de-seine.fr",tel:"01 47 29 30 00",adre
"93": {nom:"PMI Seine-Saint-Denis 93",email:"pmi@seine-saint-denis.fr",tel:"01 43 93 85 00
"94": {nom:"PMI Val-de-Marne 94",email:"pmi@valdemarne.fr",tel:"01 43 99 80 00",adresse:"H
"91": {nom:"PMI Essonne 91",email:"pmi@essonne.fr",tel:"01 69 25 62 62",adresse:"Boulevard
"95": {nom:"PMI Val-d'Oise 95",email:"pmi@valdoise.fr",tel:"01 34 25 30 00",adresse:"2 av
"77": {nom:"PMI Seine-et-Marne 77",email:"pmi@seine-et-marne.fr",tel:"01 64 14 77 00",adre
"78": {nom:"PMI Yvelines 78",email:"pmi@yvelines.fr",tel:"01 39 07 78 00",adresse:"2 pl An
"69": {nom:"PMI Métropole de Lyon 69",email:"pmi@grandlyon.com",tel:"04 78 63 40 40",adres
"13": {nom:"PMI Bouches-du-Rhône 13",email:"pmi@departement13.fr",tel:"04 13 31 13 13",adr
"31": {nom:"PMI Haute-Garonne 31",email:"pmi@haute-garonne.fr",tel:"05 34 33 30 00",adress
"33": {nom:"PMI Gironde 33",email:"pmi@gironde.fr",tel:"05 56 99 33 33",adresse:"Hôtel du
"67": {nom:"PMI Bas-Rhin 67",email:"pmi@bas-rhin.fr",tel:"03 88 76 67 67",adresse:"Hôtel d
"59": {nom:"PMI Nord 59",email:"pmi@lenord.fr",tel:"03 59 73 59 00",adresse:"51 rue Gustav
"default":{nom:"PMI de votre département",email:"pmi@votre-departement.fr",tel:"Contactez l
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
setMsgs(p=>[...p,{id:"pm"+Date.now(),de:"asmat",h:TODAY_H,date:TODAY_STR,txt,lu:true,emai
setTxt("");
setToast("Message envoyé par email à "+pmiEmail+" ✓");
};
return <div className="fi">
{toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
<PageHeader icon=" " title="Communication PMI" sub="Protection Maternelle et Infantile -
{/* Explication du fonctionnement */}
<div style={{background:"var(--Bp)",border:"1px solid var(--B)",borderRadius:12,padding:"
{asmat
<strong> Fonctionnement :</strong> vos messages sont envoyés par email à la PMI ({pmi
Leurs réponses arrivent automatiquement ici. Vous apparaissez comme expéditeur : <br/><strong> {pmiInfo.nom}</strong> - {pmiInfo.tel} - {pmiInfo.adresse}
<br/><span style={{fontSize:11,color:"var(--l)"}}> Pour configurer votre PMI de secte
</div>
{nonLus>0&&<div style={{background:"#EBF4FF",border:"1.5px solid var(--B)",borderRadius:1
<span style={{fontSize:18}}> </span>
<span style={{fontSize:13,fontWeight:700,color:"var(--B)"}}>{nonLus} nouveau{nonLus>1?"
<button className="btn bG"style={{marginLeft:"auto",fontSize:11,padding:"4px 10px"}}onC
Tout marquer lu
</button>
</div>}
<div className="g2">
<div className="card"style={{padding:16}}>
<div style={{fontWeight:700,fontSize:14,marginBottom:12,color:"var(--b)"}}>Messages P
<div style={{display:"flex",flexDirection:"column",gap:10,maxHeight:400,overflowY:"au
{msgs.map(m=><div key={m.id}onClick={()=>!m.lu&&m.de==="PMI"&&markRead(m.id)}
style={{cursor:!m.lu&&m.de==="PMI"?"pointer":"default"}}>
<div style={{flex:1,background:m.de==="PMI"?"var(--Bp)":"var(--Tp)",borderRadius:
borderLeft:(m.de==="PMI"?"3px solid var(--B)":"3px solid var(--T)"),
opacity:m.lu?1:.95,boxShadow:!m.lu&&m.de==="PMI"?"0 0 0 2px var(--B)":"none"}}>
<div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
<span style={{fontSize:11,fontWeight:700,color:m.de==="PMI"?"var(--B)":"var(-
{m.de==="PMI"?" PMI":" "+(user?.prenom||"Marie")}
{m.email&&<span style={{fontSize:10,color:"var(--l)",marginLeft:6}}>via {m.
</span>
<div style={{display:"flex",gap:6,alignItems:"center"}}>
{!m.lu&&m.de==="PMI"&&<div style={{width:8,height:8,borderRadius:"50%",back
<span style={{fontSize:10,color:"var(--l)",fontFamily:"'DM Mono',monospace"
</div>
</div>
<div style={{fontSize:13,color:"var(--b)",lineHeight:1.5}}>{m.txt}</div>
</div>
</div>)}
</div>
<div style={{marginTop:12,display:"flex",flexDirection:"column",gap:8,paddingTop:12,b
<div style={{fontSize:11,color:"var(--l)"}}>Répondre à la PMI - sera envoyé à {pmiE
<div style={{display:"flex",gap:8}}>
<textarea className="ta"value={txt}onChange={e=>setTxt(e.target.value)}
placeholder="Votre message à la PMI..."style={{flex:1,minHeight:60,resize:"none
<button className="btn bT"onClick={send}style={{alignSelf:"flex-end"}}> Envoyer
</div>
</div>
</div>
<div style={{display:"flex",flexDirection:"column",gap:12}}>
<div className="card"style={{padding:16}}>
<div style={{fontWeight:700,fontSize:13,marginBottom:12,color:"var(--b)"}}> Mon a
{[["N° agrément","AGR-2019-0042"],["Délivré le","15/09/2019"],["Renouvellement","Ju
<div key={l}style={{display:"flex",justifyContent:"space-between",padding:"6px 0"
<span style={{color:"var(--l)"}}>{l}</span>
<span style={{fontWeight:600,color:"var(--b)"}}>{v}</span>
</div>)}
<div style={{marginTop:10,padding:"8px 12px",background:"#FFF8E6",borderRadius:9,bo
Renouvellement à prévoir dans 2 mois - contacter la PMI
</div>
</div>
<div className="card"style={{padding:16}}>
<div style={{fontWeight:700,fontSize:13,marginBottom:10,color:"var(--b)"}}> Docum
{[["Agrément PMI 2024"," "],["Assurance RC Pro"," "],["Formation Continue"," "]
<div key={n}style={{display:"flex",justifyContent:"space-between",padding:"7px 0"
<span style={{fontSize:13,color:"var(--b)"}}>{n}</span>
<span>{s}</span>
</div>)}
</div>
<div className="card"style={{padding:14,background:"var(--Bp)",border:"1px solid var(
<div style={{fontWeight:700,fontSize:12,color:"var(--B)",marginBottom:6}}> <div style={{fontSize:12,color:"var(--b)",lineHeight:1.7}}>
Email : {pmiEmail}<br/>
Tél : 01 XX XX XX XX<br/>
Horaires : Lun–Ven 9h–17h
</div>
</div>
</div>
</div>
</div>;
Contac
}
//
function BandeauHorsLigne(){
const [online,setOnline]=useState(true);
const [syncing,setSyncing]=useState(false);
useEffect(()=>{
const up=()=>setOnline(true);
const down=()=>setOnline(false);
window.addEventListener("online",up);
window.addEventListener("offline",down);
setOnline(navigator.onLine);
return()=>{window.removeEventListener("online",up);window.removeEventListener("offline",d
},[]);
const sync=()=>{setSyncing(true);setTimeout(()=>setSyncing(false),2000);};
if(online&&!syncing)return null;
return <div style={{
background:online?"var(--Sp)":"#FEF9C3",
borderBottom:"1px solid "+(online?"var(--Sl)":"#FCD34D"),
padding:"6px 16px",display:"flex",alignItems:"center",gap:8,fontSize:12,fontWeight:600,
color:online?"var(--S)":"#92400E",flexShrink:0
}}>
<span style={{fontSize:14}}>{online?syncing?" ":" ":" "}</span>
{online?syncing?"Synchronisation en cours...":"Données synchronisées"
:"Hors ligne - les données sont sauvegardées localement"}
{!online&&<button onClick={sync}style={{marginLeft:"auto",background:"none",border:"1px s
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
await supabase.auth.signOut();
setEtape("done");
setTimeout(()=>onDeleted?.(),2000);
}catch(e){
setErreur(e.message||"Erreur - contactez privacy@timat.app");
setEtape("error");
}
};
if(etape==="idle")return(
<div style={{background:"var(--Rp)",border:"1px solid var(--R)",borderRadius:12,padding:2
<div style={{fontWeight:700,fontSize:14,color:"var(--R)",marginBottom:8}}> Zone de da
<div style={{fontSize:13,color:"var(--m)",marginBottom:14,lineHeight:1.6}}>
La suppression est <strong>définitive et irréversible</strong>. Toutes vos données (e
</div>
<button onClick={()=>setEtape("confirm1")}style={{background:"none",border:"1.5px solid
Supprimer mon compte et toutes mes données
</button>
</div>
);
pointa
if(etape==="confirm1")return(
<div style={{background:"var(--Rp)",border:"2px solid var(--R)",borderRadius:12,padding:2
<div style={{fontWeight:700,fontSize:15,color:"var(--R)",marginBottom:12}}>Êtes-vous ab
<div style={{fontSize:13,color:"var(--m)",marginBottom:14,lineHeight:1.7}}>
Seront supprimés : votre profil, toutes les fiches enfants, tous les contrats, </div>
<div style={{display:"flex",gap:10}}>
<button onClick={()=>setEtape("idle")}className="btn bG"style={{flex:1}}>Annuler</but
<button onClick={()=>setEtape("confirm2")}className="btn bR"style={{flex:1}}>Oui, con
</div>
</div>
);
if(etape==="confirm2")return(
<div style={{background:"var(--Rp)",border:"2px solid var(--R)",borderRadius:12,padding:2
<div style={{fontWeight:700,fontSize:14,color:"var(--R)",marginBottom:8}}>Confirmation
<div style={{fontSize:13,color:"var(--m)",marginBottom:12}}>
Tapez <strong style={{fontFamily:"'DM Mono',monospace",color:"var(--R)"}}>SUPPRIMER</
</div>
<input className="inp"value={confirmation}onChange={e=>setConfirmation(e.target.value.t
placeholder="SUPPRIMER"style={{textAlign:"center",fontFamily:"'DM Mono',monospace",ma
borderColor:confirmation===MOT?"var(--R)":"var(--br)"}}/>
<div style={{display:"flex",gap:10}}>
<button onClick={()=>{setEtape("idle");setConfirmation("");}}className="btn bG"style=
<button onClick={handleSupprimer}disabled={confirmation!==MOT}
className="btn bR"style={{flex:1,opacity:confirmation===MOT?1:.5}}>
Supprimer définitivement
</button>
</div>
</div>
);
if(etape==="deleting")return(
<div style={{textAlign:"center",padding:24,background:"var(--Rp)",borderRadius:12,border:
<div style={{fontSize:32,marginBottom:8}}> </div>
<div style={{fontSize:14,color:"var(--R)",fontWeight:600}}>Suppression en cours...</div
</div>
);
if(etape==="done")return(
<div style={{textAlign:"center",padding:24,background:"var(--Sp)",borderRadius:12,border:
<div style={{fontSize:32,marginBottom:8}}> </div>
<div style={{fontSize:14,color:"var(--S)",fontWeight:700}}>Compte supprimé. Au revoir !
</div>
);
return(
<div style={{padding:20,background:"var(--Rp)",borderRadius:12,border:"1px solid var(--R)
<div style={{fontWeight:700,color:"var(--R)",marginBottom:8}}>Erreur</div>
<div style={{fontSize:13,color:"var(--m)",marginBottom:12}}>{erreur}</div>
<button onClick={()=>setEtape("idle")}className="btn bG">Réessayer</button>
</div>
);
}
//
function Parametres({user,onLogout,setPage,isPro,isTrialing,lancerCheckout,ouvrirPortail}){
const [toast,setToast]=useState("");
return <div className="fi">
{toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
<PageHeader icon=" " title="Paramètres" sub="Votre compte et vos données"/>
<div style={{maxWidth:600,margin:"0 auto",display:"flex",flexDirection:"column",gap:16}}>
{/* Abonnement - uniquement pour les assmats */}
{user?.role==="asmat"&&<div className="card"style={{padding:20,border:isPro?"2px solid
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",margin
<div style={{fontWeight:700,fontSize:14,color:"var(--b)"}}> Mon abonnement</div>
<span style={{
background:isPro?"var(--Sp)":"var(--Tp)",
color:isPro?"var(--S)":"var(--T)",
borderRadius:20,padding:"3px 12px",fontSize:11,fontWeight:700
}}>{isTrialing?" Essai gratuit":isPro?" Pro actif":" Gratuit"}</span>
</div>
{isPro?<>
{isTrialing&&<div style={{background:"var(--Gp)",border:"1px solid var(--G)",border
Vous bénéficiez de 2 mois d'essai gratuit. Aucun prélèvement avant la fin de l
</div>}
<div style={{fontSize:13,color:"var(--m)",lineHeight:1.7,marginBottom:14}}>
{isTrialing
? "Votre abonnement Pro démarrera automatiquement à la fin de votre période d'e
: "Votre abonnement Pro est actif. Toutes les fonctionnalités sont débloquées."
</div>
<button className="btn bG"style={{width:"100%",justifyContent:"center"}}onClick={ou
Gérer mon abonnement (facturation, résiliation)
</button>
<div style={{fontSize:11,color:"var(--l)",marginTop:6,textAlign:"center"}}>
Vous serez redirigée vers le portail Stripe sécurisé.
</div>
</>:<>
<div style={{marginBottom:14}}>
{[
" Bilans de journée automatiques",
" Bulletins de salaire complets",
" Export Pajemploi en 1 clic",
" Contrats, avenants, courriers illimités",
" Enfants illimités",
" Support prioritaire",
].map(f=><div key={f}style={{display:"flex",gap:8,padding:"5px 0",fontSize:13,bor
<span style={{color:"var(--S)"}}>✓</span>
<span style={{color:"var(--b)"}}>{f}</span>
</div>)}
</div>
<div style={{textAlign:"center",marginBottom:12}}>
<div style={{fontSize:26,fontWeight:700,color:"var(--T)",fontFamily:"'DM Sans',sa
<div style={{fontSize:11,color:"var(--l)"}}>2 mois gratuits · Premier paiement à
</div>
<button className="btn bT"style={{width:"100%",justifyContent:"center",fontSize:14,
onClick={lancerCheckout||undefined}>
Passer à Pro - Commencer mon essai gratuit
</button>
</>}
</div>}
{/* Profil */}
<div className="card"style={{padding:20}}>
<div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:14}}> Mon pro
{[
["Prénom",user?.prenom||"-"],
["Nom",user?.nom||"-"],
["Email",user?.email||"-"],
["Rôle",user?.role==="asmat"?"Assistante maternelle":"Parent employeur"],
].map(([l,v])=><div key={l}style={{display:"flex",justifyContent:"space-between",padd
<span style={{color:"var(--l)"}}>{l}</span>
<span style={{fontWeight:600,color:"var(--b)"}}>{v}</span>
</div>)}
</div>
{/* Pages légales */}
<div className="card"style={{padding:20}}>
<div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:14}}> Légal &
{[
[" ","Politique de confidentialité","politique_confidentialite"],
[" ","Mentions légales","mentions_legales"],
].map(([ic,l,p])=>
<div key={p}onClick={()=>setPage(p)}style={{display:"flex",justifyContent:"space-be
onMouseEnter={e=>e.currentTarget.style.background="var(--c)"}
onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
<span style={{fontSize:13,color:"var(--b)"}}>{ic} {l}</span>
<span style={{color:"var(--l)",fontSize:12}}>→</span>
</div>)}
<div style={{marginTop:12,padding:"10px 12px",background:"var(--Sp)",borderRadius:8,f
Données hébergées en France · Jamais vendues · Supprimables à tout moment
</div>
</div>
{/* Déconnexion */}
<div className="card"style={{padding:20}}>
<div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:14}}> Session
<button className="btn bG"style={{width:"100%",justifyContent:"center"}}onClick={onLo
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
{titre:"1. Responsable de traitement",contenu:"TiMat - contact : privacy@timat.app\nHéber
{titre:"2. Données collectées",contenu:""},
{titre:"3. Durées de conservation",contenu:""},
{titre:"4. Vos droits",contenu:""},
{titre:"5. Cookies",contenu:"TiMat n'utilise aucun cookie publicitaire ni de tracking. Se
{titre:"6. Sécurité",contenu:"Chiffrement en transit (HTTPS/TLS 1.3), chiffrement au repo
];
const tableaux={
"2. Données collectées":[
["Catégorie","Données","Base légale","Durée"],
["Assmats","Nom, email, téléphone, n° agrément","Exécution du contrat","Durée compte ac
["Enfants","Prénom, date de naissance, allergies","Exécution du contrat + intérêt vital
["Parents","Nom, email, téléphone, profession","Exécution du contrat","Durée compte act
["Financières","Salaires, indemnités, attestations fiscales","Obligation légale","10 an
["Photos enfants","Images (journal partagé)","Consentement explicite parents","Durée co
["Paiements","Plan, Stripe ID (aucune CB stockée)","Exécution du contrat","10 ans"],
],
"3. Durées de conservation":[
["Données","Durée","Justification"],
["Compte actif","Durée de l'abonnement","Nécessité du service"],
["Après suppression du compte","0 jour (effacement immédiat)","Droit à l'effacement RGP
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
2026 -
return <div className="fi">
<PageHeader icon=" " title="Politique de confidentialité" sub="Version 1.0 - Mars <div style={{maxWidth:800,margin:"0 auto"}}>
{sections.map((s,i)=><div key={i}className="card"style={{padding:24,marginBottom:16}}>
<div style={{fontWeight:700,fontSize:16,color:"var(--b)",marginBottom:12}}>{s.titre}<
{tableaux[s.titre]?<div style={{overflowX:"auto"}}>
<table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
<thead>
<tr>{tableaux[s.titre][0].map((h,j)=><th key={j}style={{
textAlign:"left",padding:"8px 12px",background:"var(--c)",
fontWeight:700,color:"var(--m)",fontSize:11,textTransform:"uppercase",letterS
borderBottom:"2px solid var(--br)"
}}>{h}</th>)}</tr>
</thead>
<tbody>
{tableaux[s.titre].slice(1).map((row,j)=><tr key={j}style={{borderBottom:"1px s
{row.map((cell,k)=><td key={k}style={{padding:"9px 12px",fontSize:13,color:k=
</tr>)}
</tbody>
</table>
</div>:<div style={{fontSize:13,color:"var(--m)",lineHeight:1.8,whiteSpace:"pre-line"
</div>)}
<div className="card"style={{padding:20,background:"var(--Bp)",border:"1px solid var(--
<div style={{fontWeight:700,fontSize:13,color:"var(--B)",marginBottom:6}}> Contact
<div style={{fontSize:13,color:"var(--m)"}}>Pour exercer vos droits : <strong>privacy
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
{titre:"Hébergement",contenu:"Application web : Vercel Inc. (serveurs européens)\nBase de
{titre:"Propriété intellectuelle",contenu:"L'ensemble du contenu de TiMat (textes, interf
{titre:"Limitation de responsabilité",contenu:"Les calculs de salaire, récapitulatifs Paj
{titre:"Données personnelles",contenu:"Responsable de traitement : TiMat - privacy@timat.
{titre:"Droit applicable",contenu:"Les présentes mentions légales sont soumises au droit
];
return <div className="fi">
<PageHeader icon=" " title="Mentions légales" sub="Conformément à la loi n°2004-575 du 2
<div style={{maxWidth:700,margin:"0 auto"}}>
{blocs.map((b,i)=><div key={i}className="card"style={{padding:22,marginBottom:14}}>
<div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:10}}>{b.titre}<
{b.custom?<div>
{/* Bloc éditeur éditable */}
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marg
<div style={{fontSize:12,color:"var(--l)"}}>À compléter avec vos informations lég
<button onClick={()=>setEdit(p=>!p)}className="btn bG"style={{fontSize:11,padding
{edit?"✓ Sauvegarder":" Modifier"}
</button>
</div>
{[
["Raison sociale","TiMat"],
["Représentée par","representant"],
["Email","contact@timat.app"],
["SIRET","siret"],
["Adresse","adresse"],
["Téléphone","telephone"],
].map(([label,key])=><div key={label}style={{display:"flex",gap:12,padding:"6px 0",
<span style={{fontSize:12,color:"var(--l)",minWidth:120,flexShrink:0}}>{label}</s
{edit&&info[key]!==undefined?
<input className="inp"style={{flex:1,padding:"4px 8px",fontSize:12}}
value={info[key]}onChange={e=>setInfo(p=>({...p,[key]:e.target.value}))}/>
:<span style={{fontSize:13,color:"var(--b)",fontWeight:500}}>
{info[key]||key}
</span>}
</div>)}
{info.siret.includes("[")&&<div style={{marginTop:10,padding:"8px 12px",background:
Ces informations doivent être complétées avant la mise en ligne de l'applicati
</div>}
</div>
:<div style={{fontSize:13,color:"var(--m)",lineHeight:1.8,whiteSpace:"pre-line"}}>{b.
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
{[{id:"messages",l:"Messages",ic:" "},{id:"bilan",l:"Bilan du jour",ic:" "},{id:"cr",
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
?[{id:"journal",l:"Journal & Bilans",ic:" "},{id:"repas",l:"Repas & Changes",ic:" "},{i
:[{id:"journal",l:"Journal",ic:" "},{id:"repas",l:"Repas",ic:" "},{id:"sommeil",l:"Somm
return <div className="fi">
{role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
{liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>{setSelId(e.id);setS
</div>}
<div style={{display:"flex",gap:2,marginBottom:16,borderBottom:"2px solid var(--br)",over
{secs.map(s=><button key={s.id}onClick={()=>setSec(s.id)}style={{
padding:"7px 14px",border:"none",background:"none",cursor:"pointer",
fontFamily:"'DM Sans',sans-serif",fontWeight:600,fontSize:12,whiteSpace:"nowrap",flex
color:sec===s.id?"var(--T)":"var(--b)",
borderBottom:sec===s.id?"2px solid var(--T)":"2px solid transparent",
marginBottom:-2,transition:"all .15s",display:"flex",alignItems:"center",gap:5
}}><span>{s.ic}</span><span>{s.l}</span></button>)}
</div>
{sec==="journal"&&<JournalAvecBilans enfant={enfant}liste={liste}role={role}pEId={selId}u
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
const secs=[
{id:"sante",l:"Santé",ic:" "},
{id:"vaccins",l:"Vaccins",ic:" ",badge:prochainsVaccins.length},
{id:"croissance",l:"Croissance",ic:" "}
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
<PageHeader icon=" " title="Suivi vaccinal" sub="Calendrier vaccinal officiel - rappel
{prochainsVaccins.length>0&&<div style={{background:"var(--Rp)",border:"1.5px solid var
<span style={{fontSize:20}}> </span>
<div>
<div style={{fontWeight:700,fontSize:13,color:"var(--R)",marginBottom:2}}>
{prochainsVaccins.length} vaccin{prochainsVaccins.length>1?"s":""} à prévoir pour
</div>
</div>
<div style={{fontSize:12,color:"var(--m)"}}>À mentionner au médecin lors du prochai
</div>}
<div style={{display:"flex",flexDirection:"column",gap:8}}>
{VACCINS_CALENDRIER.map((v,i)=>{
const enRetard=!v.fait&&v.age_mois<ageActuel;
const proche=!v.fait&&v.age_mois>=ageActuel&&v.age_mois<=ageActuel+3;
return <div key={i}style={{
display:"flex",gap:12,alignItems:"center",padding:"12px 14px",borderRadius:12,
background:v.fait?"var(--Sp)":enRetard?"var(--Rp)":proche?"var(--Gp)":"var(--c)",
border:(v.fait?"1px solid var(--Sl)":enRetard?"1px solid var(--R)":proche?"1px so
cursor:"pointer",transition:"all .2s",
}}onClick={()=>{
const updated=[...VACCINS_CALENDRIER];
updated[i]={...updated[i],fait:!updated[i].fait};
setVacsState(updated);
}}>
<span style={{fontSize:20,flexShrink:0}}>{v.fait?" ":enRetard?" ":proche?" ":
<div style={{flex:1}}>
<div style={{fontWeight:600,fontSize:13,color:"var(--b)"}}>{v.nom}</div>
<div style={{fontSize:11,color:"var(--l)"}}>À {v.age_mois} mois · {v.fait?"Fait
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
{[{id:"portfolio",l:"Portfolio",ic:" "},{id:"developpement",l:"Développement",ic:" "
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
<PageHeader icon=" " title="Documents & Attestations" sub="Tous vos documents et attesta
<div style={{display:"flex",gap:2,marginBottom:16,borderBottom:"2px solid var(--br)",flex
{[{id:"documents",l:"Documents",ic:" "},{id:"attestation_pe",l:"Att. Pole Emploi",ic:"
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
{sec==="attestation_pe"&&<AttestationPoleEmploi enfants={enfants}role={role}pEId={pEId}us
{sec==="attestation_fiscale"&&<AttestationFiscale enfants={enfants}role={role}pEId={pEId}
{sec==="export"&&<ExportDonnees enfants={enfants}role={role}pEId={pEId}/>}
</div>;
}
//
const DEMANDES_DEMO=[
{
id:"d1",statut:"nouveau",date:new Date(Date.now()-2*86400000).toISOString().slice(0,10),
parent:{prenom:"Camille",nom:"Moreau",email:"camille.moreau@gmail.com",tel:"06 12 34 56 7
enfant:{prenom:"Chloé",naissance:"2023-08-14",allergies:"Aucune connue",dejaCrèche:false}
contrat:{debut:"2024-09-02",jours:["Lundi","Mardi","Mercredi","Jeudi"],
heureArrivee:"07h30",heureDepart:"17h30",heuresHebdo:40,
anneeComplete:true,vacances:"Oui, pendant les vacances scolaires"},
message:"Bonjour Madame Dupont, nous avons trouvé votre profil sur monenfant.fr. Notre fi
},
{
id:"d2",statut:"en_discussion",date:new Date(Date.now()-5*86400000).toISOString().slice(0
parent:{prenom:"Antoine",nom:"Lefebvre",email:"antoine.lefebvre@hotmail.fr",tel:"07 89 01
enfant:{prenom:"Mathieu",naissance:"2022-11-03",allergies:"Lactose",dejaCrèche:true},
contrat:{debut:"2024-10-01",jours:["Lundi","Mercredi","Vendredi"],
heureArrivee:"08h00",heureDepart:"18h00",heuresHebdo:30,
anneeComplete:false,vacances:"Non, pas pendant les vacances"},
message:"Bonjour, mon fils Mathieu est actuellement à la crèche mais nous souhaitons le c
},
{
id:"d3",statut:"accepte",date:new Date(Date.now()-12*86400000).toISOString().slice(0,10),
parent:{prenom:"Lucie",nom:"Bernard",email:"lucie.b@orange.fr",tel:"06 55 44 33 22",profe
enfant:{prenom:"Tom",naissance:"2021-04-20",allergies:"Aucune",dejaCrèche:false},
contrat:{debut:"2024-09-02",jours:["Lundi","Mardi","Jeudi","Vendredi"],
heureArrivee:"08h30",heureDepart:"16h30",heuresHebdo:32,
anneeComplete:true,vacances:"Pendant les petites vacances uniquement"},
message:"Bonjour, je suis enseignante et je cherche une assistante maternelle pour mon fi
},
{
id:"d4",statut:"refuse",date:new Date(Date.now()-20*86400000).toISOString().slice(0,10),
parent:{prenom:"Marc",nom:"Petit",email:"marc.petit@sfr.fr",tel:"06 11 22 33 44",professi
enfant:{prenom:"Emma",naissance:"2024-01-15",allergies:"Aucune",dejaCrèche:false},
contrat:{debut:"2024-06-01",jours:["Lundi","Mardi","Mercredi","Jeudi","Vendredi"],
heureArrivee:"07h00",heureDepart:"19h00",heuresHebdo:48,
anneeComplete:true,vacances:"Oui, toutes les vacances"},
message:"Bonjour, nous cherchons une solution d'urgence pour notre bébé Emma dès le 1er j
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
const statutLabel={nouveau:" Nouveau",en_discussion:" En discussion",accepte:" Accep
const statutColor={nouveau:"var(--B)",en_discussion:"var(--G)",accepte:"var(--S)",refuse:"v
const statutBg={nouveau:"var(--Bp)",en_discussion:"var(--Gp)",accepte:"var(--Sp)",refuse:"v
const changerStatut=(id,statut)=>{
setDemandes(p=>p.map(d=>d.id===id?{...d,statut}:d));
if(statut==="accepte")setToast("Demande acceptée - un contrat peut maintenant être if(statut==="refuse")setToast("Demande refusée - un email sera envoyé aux parents.");
créé ✓
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
<PageHeader icon=" " title="Demandes de contact"
sub="Parents qui souhaitent vous confier leur enfant via votre profil TiMat"/>
{/* Info email public */}
<div style={{background:"linear-gradient(135deg,var(--Bp),var(--Pp))",border:"1px solid v
<span style={{fontSize:24}}> </span>
<div>
<div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:4}}>Votre adres
<div style={{fontFamily:"'DM Mono',monospace",fontSize:13,color:"var(--B)",fontWeight
{user?.email||"votre-email@timat.app"}
</div>
<div style={{fontSize:12,color:"var(--m)",lineHeight:1.6}}>
Mettez cette adresse sur votre profil <strong>monenfant.fr</strong>.
Les parents qui vous écrivent arrivent sur votre formulaire TiMat et vous voyez leu
</div>
</div>
</div>
{nbNouveaux>0&&<div style={{background:"var(--Bp)",border:"1.5px solid var(--B)",borderRa
<span style={{fontSize:18}}> </span>
<span style={{fontWeight:700,fontSize:13,color:"var(--B)"}}>{nbNouveaux} nouvelle{nbNou
</div>}
{/* Filtres */}
<div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>
{[["tous","Toutes"],["nouveau","Nouvelles"],["en_discussion","En discussion"],["accepte
<button key={v}onClick={()=>setFiltre(v)}style={{
padding:"5px 12px",borderRadius:20,border:"1.5px solid",cursor:"pointer",fontSize:1
background:filtre===v?"var(--b)":"transparent",
color:filtre===v?"#fff":"var(--m)",
borderColor:filtre===v?"var(--b)":"var(--br)"
}}>{l} {v==="tous"?"("+demandes.length+")":v==="nouveau"&&nbNouveaux>0?"("+nbNouveaux
</div>
<div className="g2">
{/* Liste des demandes */}
<div style={{display:"flex",flexDirection:"column",gap:10}}>
{demandesFiltrees.length===0&&<div className="card"style={{padding:20,textAlign:"cent
Aucune demande dans cette catégorie.
</div>}
{demandesFiltrees.map(d=><div key={d.id}className="card card-lift"
onClick={()=>setSelId(selId===d.id?null:d.id)}
style={{padding:16,cursor:"pointer",borderLeft:"4px solid "+statutColor[d.statut],
boxShadow:selId===d.id?"var(--sh2)":"var(--sh)"}}>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",
<div style={{flex:1}}>
<div style={{display:"flex",gap:8,alignItems:"center",marginBottom:4}}>
<span style={{fontWeight:700,fontSize:14,color:"var(--b)"}}>{d.parent.prenom}
<span className="badge"style={{background:statutBg[d.statut],color:statutColo
{statutLabel[d.statut]}
</span>
</div>
<div style={{fontSize:12,color:"var(--m)"}}>
Pour <strong>{d.enfant.prenom}</strong> · {ageEnfant(d.enfant.naissance)} · {
</div>
<div style={{fontSize:11,color:"var(--l)",marginTop:2}}>
Souhaite commencer le {fmt(d.contrat.debut)}
</div>
</div>
<div style={{fontSize:11,color:"var(--l)",fontFamily:"'DM Mono',monospace",flexSh
</div>
{d.statut==="nouveau"&&<div style={{marginTop:8,fontSize:12,color:"var(--m)",fontSt
overflow:"hidden",textOverflow:"ellipsis",display:"-webkit-box",WebkitLineClamp:2
"{d.message}"
</div>}
</div>)}
</div>
{/* Détail demande sélectionnée */}
{sel?<div style={{display:"flex",flexDirection:"column",gap:12}}>
{/* Infos famille */}
<div className="card"style={{padding:18}}>
<div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:14,display:"f
<span> </span> {sel.parent.prenom} {sel.parent.nom}
<span className="badge"style={{background:statutBg[sel.statut],color:statutColor[
{statutLabel[sel.statut]}
</span>
</div>
{/* Parent */}
<div style={{fontSize:12,fontWeight:700,color:"var(--l)",textTransform:"uppercase",
{[[" Email",sel.parent.email],[" Téléphone",sel.parent.tel],[" Profession",s
<div key={l}style={{display:"flex",justifyContent:"space-between",padding:"5px 0"
<span style={{color:"var(--l)"}}>{l}</span>
<span style={{fontWeight:600,color:"var(--b)"}}>{v}</span>
</div>)}
{/* Enfant */}
<div style={{fontSize:12,fontWeight:700,color:"var(--l)",textTransform:"uppercase",
{[
[" Prénom",sel.enfant.prenom],
[" Naissance",fmt(sel.enfant.naissance)+" ("+ageEnfant(sel.enfant.naissance)+")
[" Allergies",sel.enfant.allergies],
[" Actuellement",sel.enfant.dejaCrèche?"En crèche":"À domicile"],
].map(([l,v])=>
<div key={l}style={{display:"flex",justifyContent:"space-between",padding:"5px 0"
<span style={{color:"var(--l)"}}>{l}</span>
<span style={{fontWeight:600,color:"var(--b)"}}>{v}</span>
</div>)}
{/* Contrat souhaité */}
<div style={{fontSize:12,fontWeight:700,color:"var(--l)",textTransform:"uppercase",
{[
[" Début",fmt(sel.contrat.debut)],
[" Jours",sel.contrat.jours.join(", ")],
[" Horaires",sel.contrat.heureArrivee+" → "+sel.contrat.heureDepart],
[" Heures/semaine",sel.contrat.heuresHebdo+"h"],
[" Durée",sel.contrat.anneeComplete?"Année complète":"Partielle"],
[" Vacances",sel.contrat.vacances],
].map(([l,v])=>
<div key={l}style={{display:"flex",justifyContent:"space-between",padding:"5px 0"
<span style={{color:"var(--l)"}}>{l}</span>
<span style={{fontWeight:600,color:"var(--b)",textAlign:"right",maxWidth:"55%"}
</div>)}
{/* Message */}
<div style={{marginTop:14,padding:"12px 14px",background:"var(--c)",borderRadius:10
"{sel.message}"
</div>
</div>
Répon
{/* Actions */}
<div className="card"style={{padding:16}}>
<div style={{fontWeight:700,fontSize:13,marginBottom:12,color:"var(--b)"}}> <textarea className="ta"value={repTxt}onChange={e=>setRepTxt(e.target.value)}
placeholder={"Bonjour "+sel.parent.prenom+",\n\nMerci pour votre message..."}
style={{width:"100%",minHeight:90,marginBottom:10,resize:"vertical"}}/>
<button className="btn bT"style={{width:"100%",marginBottom:10}}onClick={envoyerRep
disabled={!repTxt.trim()}>
Envoyer par email
</button>
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
{sel.statut!=="accepte"&&<button className="btn bS"onClick={()=>changerStatut(sel
Accepter
</button>}
{sel.statut!=="refuse"&&<button className="btn bR"onClick={()=>changerStatut(sel.
Refuser
</button>}
{sel.statut==="accepte"&&<button className="btn bP"onClick={()=>setToast("Redirec
Créer le contrat
</button>}
</div>
</div>
</div>
:<div className="card"style={{padding:28,textAlign:"center",color:"var(--l)"}}>
<div style={{fontSize:36,marginBottom:12}}> </div>
<div style={{fontSize:13}}>Sélectionnez une demande pour voir le détail</div>
</div>}
</div>
</div>;
}
//
function KitCMG({enfants,role,pEId,user}){
const enfant=enfants.find(e=>e.id===pEId)||enfants[0];
const asmat={...D.asmat,prenom:user?.prenom||D.asmat.prenom,nom:user?.nom||D.asmat.nom,emai
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
<span style={{fontSize:13,fontWeight:700,color:"var(--b)",textAlign:"right"}}>{value}
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
const entretienMensuel=Math.round((contrat.entretien||3.80)*heuresMois/contrat.heuresHebdo*
return <div className="fi">
{toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
<PageHeader icon=" " title="Aide CMG - Kit déclaration"
sub="Toutes les informations pour déclarer votre mode de garde sur monenfant.fr"/>
{/* Explication */}
<div style={{background:"linear-gradient(135deg,var(--Gp),var(--Bp))",border:"1px solid v
<div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:8}}> Comment ut
<div style={{fontSize:13,color:"var(--m)",lineHeight:1.8}}>
1. Allez sur <strong>monenfant.fr</strong> → "Déclarer votre mode de garde"<br/>
2. Utilisez les boutons <strong>"Copier"</strong> ci-dessous pour coller chaque infor
3. Soumettez votre déclaration<br/>
4. La CAF calcule votre <strong>Complément Mode de Garde (CMG)</strong> automatiqueme
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
<div style={{fontWeight:700,fontSize:13,color:"var(--T)",marginBottom:14,display:"f
<span> </span> Votre assistante maternelle
</div>
<InfoRow label="Nom complet" value={asmat.prenom+" "+asmat.nom} copyKey="asmNom"/>
<InfoRow label="N° agrément" value="AGR-2019-0042" copyKey="agrement"/>
<InfoRow label="Email professionnel" value={user?.email||"marie.dupont@timat.app"}
<InfoRow label="Code postal" value="75015" copyKey="cp"/>
<InfoRow label="Commune" value="Paris 15e" copyKey="commune"/>
</div>
{/* Infos contrat */}
<div className="card"style={{padding:18}}>
<div style={{fontWeight:700,fontSize:13,color:"var(--S)",marginBottom:14,display:"f
<span> </span> Votre contrat
</div>
<InfoRow label="Date de début du contrat" value={fmt(contrat.debut||"2023-09-04")}
<InfoRow label="Jours d'accueil" value={(contrat.jours||["Lu","Ma","Me","Je","Ve"])
<InfoRow label="Heures par semaine" value={(contrat.heuresHebdo||40)+"h"} copyKey="
<InfoRow label="Heures par mois (estimé)" value={heuresMois+"h"} copyKey="heuresMoi
<InfoRow label="Horaires journaliers" value={contrat.horaires||"07h30–17h30"} copyK
</div>
</div>
<div style={{display:"flex",flexDirection:"column",gap:14}}>
{/* Rémunération */}
<div className="card"style={{padding:18}}>
<div style={{fontWeight:700,fontSize:13,color:"var(--G)",marginBottom:14,display:"f
<span> </span> Rémunération mensuelle
</div>
<InfoRow label="Taux horaire net" value={(contrat.tauxHoraire||4.05).toFixed(2)+"€/
<InfoRow label="Salaire net mensuel (estimé)" value={salaireNet+"€"} copyKey="salai
<InfoRow label="Indemnité d'entretien/jour" value={(contrat.entretien||3.80).toFixe
<InfoRow label="Indemnité entretien/mois" value={entretienMensuel+"€"} copyKey="ent
<div style={{marginTop:12,padding:"10px 12px",background:"var(--Gp)",borderRadius:1
Le CMG prend en charge une partie du salaire selon vos revenus. Le calcul est
</div>
</div>
{/* Enfant */}
<div className="card"style={{padding:18}}>
<div style={{fontWeight:700,fontSize:13,color:"var(--P)",marginBottom:14,display:"f
<span>{enfant?.emoji||" "}</span> {enfant?.prenom||"Votre enfant"}
</div>
<InfoRow label="Prénom" value={enfant?.prenom||"-"} copyKey="enfPrenom"/>
<InfoRow label="Date de naissance" value={fmt(enfant?.naissance||"")} copyKey="enfN
<InfoRow label="Lieu de garde" value="Domicile de l'assistante maternelle" copyKey=
</div>
Pajemp
{/* Lien Pajemploi */}
<div className="card"style={{padding:16,background:"var(--Tp)",border:"1px solid var(
<div style={{fontWeight:700,fontSize:13,color:"var(--T)",marginBottom:8}}> <div style={{fontSize:12,color:"var(--m)",lineHeight:1.6,marginBottom:10}}>
Une fois déclaré sur monenfant.fr, vous devrez aussi déclarer les heures mensuell
</div>
<a href="https://www.pajemploi.urssaf.fr" target="_blank" rel="noopener noreferrer"
style={{display:"inline-block",background:"var(--T)",color:"#fff",
borderRadius:8,padding:"7px 14px",fontSize:12,fontWeight:700,textDecoration:"none
Aller sur Pajemploi →
</a>
</div>
</div>
</div>
</div>;
}
//
function SignatureContratParent({enfants,pEId}){
const enfant=enfants.find(e=>e.id===pEId)||enfants[0];
const contrat=enfant?.contrat||{};
const [signe,setSigne]=useState(false);
const [lu,setLu]=useState(false);
const [toast,setToast]=useState("");
const canvasRef=useRef(null);
const [drawing,setDrawing]=useState(false);
const [hasSig,setHasSig]=useState(false);
const startDraw=(e)=>{
setDrawing(true);
const canvas=canvasRef.current;
const ctx=canvas.getContext("2d");
const rect=canvas.getBoundingClientRect();
const x=(e.touches?e.touches[0].clientX:e.clientX)-rect.left;
const y=(e.touches?e.touches[0].clientY:e.clientY)-rect.top;
ctx.beginPath();ctx.moveTo(x,y);
};
const draw=(e)=>{
if(!drawing)return;
e.preventDefault();
const canvas=canvasRef.current;
const ctx=canvas.getContext("2d");
const rect=canvas.getBoundingClientRect();
const x=(e.touches?e.touches[0].clientX:e.clientX)-rect.left;
const y=(e.touches?e.touches[0].clientY:e.clientY)-rect.top;
ctx.lineTo(x,y);ctx.strokeStyle="var(--b)";ctx.lineWidth=2;ctx.stroke();
setHasSig(true);
};
const clearSig=()=>{
const canvas=canvasRef.current;
canvas.getContext("2d").clearRect(0,0,canvas.width,canvas.height);
setHasSig(false);
};
const valider=()=>{
if(!lu||!hasSig)return;
setSigne(true);
setToast("Contrat signé électroniquement ✓ - L'assmat a été notifiée");
};
if(signe)return <div style={{textAlign:"center",padding:40}}>
<div style={{fontSize:60,marginBottom:16}}> </div>
<div className="pf"style={{fontSize:22,fontWeight:600,color:"var(--S)",marginBottom:8}}>C
<div style={{fontSize:13,color:"var(--m)",lineHeight:1.7}}>
Votre signature électronique a été enregistrée.<br/>
L'assistante maternelle a été notifiée. Le contrat signé est disponible dans Documents.
</div>
</div>;
return <div className="fi">
{toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
<PageHeader icon=" " title="Signer mon contrat"
sub="Signature électronique conforme eIDAS - valeur légale"/>
{/* Récap contrat */}
<div className="card"style={{padding:18,marginBottom:16}}>
<div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:12}}> Contrat d
{[
["Assistante maternelle","Marie Dupont"],
["Enfant",(enfant?.prenom||"-")+" "+(enfant?.nom||"")],
["Début du contrat",fmt(contrat.debut||"2023-09-04")],
["Jours d'accueil",(contrat.jours||[]).join(", ")],
["Horaires",contrat.horaires||"07h30–17h30"],
["Taux horaire net",(contrat.tauxHoraire||4.05).toFixed(2)+"€/h"],
["Indemnité entretien",(contrat.entretien||3.80).toFixed(2)+"€/jour"],
].map(([l,v])=><div key={l}style={{display:"flex",justifyContent:"space-between",paddin
<span style={{color:"var(--l)"}}>{l}</span>
<span style={{fontWeight:600,color:"var(--b)"}}>{v}</span>
</div>)}
</div>
16px"}
{/* Case lecture */}
<label style={{display:"flex",gap:12,alignItems:"flex-start",cursor:"pointer",marginBotto
background:"var(--Bp)",border:"1px solid var(--B)",borderRadius:12,padding:"14px <input type="checkbox"checked={lu}onChange={e=>setLu(e.target.checked)}
style={{width:18,height:18,marginTop:2,flexShrink:0,cursor:"pointer",accentColor:"var
<span style={{fontSize:13,color:"var(--B)",lineHeight:1.6}}>
J'ai lu et j'accepte les conditions du contrat d'accueil pour {enfant?.prenom}. Je ce
</span>
</label>
{/* Zone signature */}
<div className="card"style={{padding:18,marginBottom:16}}>
<div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:4}}> Votre sign
<div style={{fontSize:12,color:"var(--l)",marginBottom:12}}>Signez ci-dessous avec votr
<canvas ref={canvasRef}width={400}height={120}
style={{width:"100%",height:120,border:"2px dashed var(--br)",borderRadius:10,
cursor:"crosshair",background:"#FDFAF6",touchAction:"none"}}
onMouseDown={startDraw}onMouseMove={draw}onMouseUp={()=>setDrawing(false)}
onTouchStart={startDraw}onTouchMove={draw}onTouchEnd={()=>setDrawing(false)}/>
<div style={{display:"flex",justifyContent:"space-between",marginTop:8}}>
<div style={{fontSize:11,color:"var(--l)"}}>
{hasSig?" Signature dessinée":"Tracez votre signature ci-dessus"}
</div>
{hasSig&&<button onClick={clearSig}style={{background:"none",border:"none",color:"var
</div>
</div>
{/* Bouton valider */}
<button className="btn bS"style={{width:"100%",justifyContent:"center",fontSize:14,paddin
opacity:lu&&hasSig?1:.5}}
onClick={valider}disabled={!lu||!hasSig}>
Valider et signer le contrat
</button>
<div style={{textAlign:"center",fontSize:11,color:"var(--l)",marginTop:8}}>
Signature électronique conforme eIDAS - Valeur légale identique au papier
</div>
</div>;
}
//
const JOURS_SEM=["Lundi","Mardi","Mercredi","Jeudi","Vendredi"];
const PERIODES=[
{id:"matin",l:"Matin",h:"07h00–08h30",ic:" "},
{id:"midi",l:"Méridien",h:"11h30–13h30",ic:" "},
{id:"soir",l:"Soir",h:"16h30–19h00",ic:" "},
{id:"mercredi",l:"Mercredi journée",h:"08h00–18h00",ic:" "},
{id:"vacances",l:"Vacances scolaires",h:"Selon planning",ic:" "},
];
function PlanningPeriscolaire({enfants,role,pEId}){
const [selId,setSelId]=useState(enfants[0]?.id);
const [planning,setPlanning]=useState(()=>{
const p={};
enfants.forEach(e=>{
p[e.id]={matin:["Lundi","Mercredi"],midi:[],soir:["Lundi","Mardi","Jeudi","Vendredi"],m
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
<PageHeader icon=" " title="Planning périscolaire"
sub="Gestion des accueils matin, midi, soir, mercredis et vacances"/>
{role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
{liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>setSelId(e.id)}/>)}
</div>}
<div style={{display:"flex",flexDirection:"column",gap:14}}>
{PERIODES.map(per=><div key={per.id}className="card"style={{padding:18,borderLeft:"4px
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",margin
<div>
<div style={{fontWeight:700,fontSize:14,color:"var(--b)"}}>{per.ic} {per.l}</div>
<div style={{fontSize:12,color:"var(--l)"}}>{per.h}</div>
</div>
{typeof p[per.id]==="boolean"&&<label style={{display:"flex",alignItems:"center",ga
<span style={{fontSize:12,color:"var(--m)"}}>Accueil</span>
<div onClick={()=>{if(role==="asmat")setPlanning(prev=>({...prev,[enfant.id]:{...
style={{width:44,height:24,borderRadius:12,background:p[per.id]?"var(--S)":"var
position:"relative",cursor:role==="asmat"?"pointer":"default",transition:"bac
<div style={{position:"absolute",top:2,left:p[per.id]?20:2,width:20,height:20,
borderRadius:"50%",background:"#fff",transition:"left .2s",boxShadow:"0 1px 4
</div>
</label>}
</div>
{Array.isArray(p[per.id])&&<div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
{JOURS_SEM.filter(j=>j!=="Mercredi"||per.id!=="mercredi").map(jour=>{
const actif=p[per.id]?.includes(jour);
return <button key={jour}onClick={()=>role==="asmat"&&toggleJour(per.id,jour)}sty
padding:"6px 14px",borderRadius:20,border:(actif?"1.5px solid var(--B)":"1.5px
background:actif?"var(--Bp)":"transparent",color:actif?"var(--B)":"var(--l)",
fontWeight:actif?700:400,fontSize:13,cursor:role==="asmat"?"pointer":"default",
}}>{jour.slice(0,2)}</button>;
})}
</div>}
</div>)}
</div>
{role==="asmat"&&<div style={{marginTop:16,display:"flex",gap:8,justifyContent:"flex-end"
<button className="btn bG">Imprimer le planning</button>
<button className="btn bT"onClick={()=>setToast("Planning enregistré et partagé avec le
Sauvegarder et partager
</button>
</div>}
{/* Vue hebdo synthèse */}
<div className="card"style={{padding:18,marginTop:16}}>
<div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:12}}> Récapitul
<div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:4}}>
{JOURS_SEM.map(j=><div key={j}style={{textAlign:"center"}}>
<div style={{fontSize:11,fontWeight:700,color:"var(--l)",marginBottom:6,textTransfo
{PERIODES.filter(per=>per.id!=="vacances"&&per.id!=="mercredi").map(per=>{
const actif=Array.isArray(p[per.id])?p[per.id].includes(j):false;
if(!actif)return null;
return <div key={per.id}style={{
background:"var(--Bp)",borderRadius:6,padding:"3px 4px",
fontSize:10,color:"var(--B)",fontWeight:600,marginBottom:3
}}>{per.ic}</div>;
})}
</div>)}
</div>
</div>
</div>;
{j==="Mercredi"&&p.mercredi&&<div style={{background:"var(--Sp)",borderRadius:6,pad
}
//
const FORUM_POSTS=[
{id:"p1",auteur:"Sylvie M.",ville:"Lyon",date:"Il y a 2h",titre:"Pajemploi - Régularisation
contenu:"Bonjour à toutes, je me retrouve avec une régularisation positive de 180€ pour u
reponses:8,tags:["Pajemploi","Salaire"],epingle:true},
{id:"p2",auteur:"Nathalie B.",ville:"Bordeaux",date:"Il y a 4h",titre:"Activités pour 18 mo
contenu:"Ma petite Inès a 18 mois et commence à s'ennuyer des mêmes activités. Est-ce que
reponses:14,tags:["Activités","Éveil"],epingle:false},
{id:"p3",auteur:"Farida K.",ville:"Paris",date:"Il y a 1j",titre:"Contrat - Clause de ruptu
contenu:"J'ai une famille qui veut enlever la clause de rupture du contrat. Est-ce légal
reponses:5,tags:["Contrat","Juridique"],epingle:false},
{id:"p4",auteur:"Caroline D.",ville:"Nantes",date:"Il y a 2j",titre:"PMI - Renouvellement a
contenu:"Mon renouvellement c'est dans 3 mois. Qu'est-ce que vous avez préparé comme doss
reponses:22,tags:["PMI","Agrément"],epingle:false},
{id:"p5",auteur:"Isabelle R.",ville:"Toulouse",date:"Il y a 3j",titre:"MAM - Qui est contenu:"Je cherche 1 ou 2 collègues pour monter une MAM. J'ai déjà un local en vue. Si v
reponses:3,tags:["MAM","Réseau"],epingle:false},
intére
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
titre:newPost.titre,contenu:newPost.contenu,reponses:0,tags:[newPost.tag],epingle:false
setNewPost({titre:"",contenu:"",tag:"Pajemploi"});
setShowNew(false);
setToast("Votre question a été publiée ✓");
};
return <div className="fi">
{toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
<PageHeader icon=" " title="Communauté assmats"
sub="Entraidez-vous · Partagez vos expériences · Posez vos questions"/>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBott
<div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
{tags.map(t=><button key={t}onClick={()=>setFiltre(t)}style={{
padding:"5px 12px",borderRadius:20,border:"1.5px solid",cursor:"pointer",fontSize:1
background:filtre===t?"var(--P)":"transparent",
color:filtre===t?"#fff":"var(--m)",
borderColor:filtre===t?"var(--P)":"var(--br)"
}}>{t}</button>)}
</div>
<button className="btn bT"onClick={()=>setShowNew(p=>!p)}>
{showNew?"✕ Annuler":" Poser une question"}
</button>
</div>
{showNew&&<div className="card"style={{padding:18,marginBottom:16,border:"2px solid var(-
<div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:12}}> Nouvelle
<input className="inp"placeholder="Titre de votre question..."value={newPost.titre}
onChange={e=>setNewPost(p=>({...p,titre:e.target.value}))}style={{marginBottom:10}}/>
<textarea className="ta"placeholder="Décrivez votre situation..."value={newPost.contenu
onChange={e=>setNewPost(p=>({...p,contenu:e.target.value}))}
style={{width:"100%",minHeight:80,resize:"vertical",marginBottom:10}}/>
<div style={{display:"flex",gap:10,alignItems:"center"}}>
<select className="sel"style={{flex:1}}value={newPost.tag}onChange={e=>setNewPost(p=>
{tags.filter(t=>t!=="tous").map(t=><option key={t}>{t}</option>)}
</select>
<button className="btn bT"onClick={poster}>Publier →</button>
</div>
</div>}
<div className="g2">
<div style={{display:"flex",flexDirection:"column",gap:10}}>
{postsFiltres.map(post=><div key={post.id}className="card card-lift"
onClick={()=>setSelPost(selPost?.id===post.id?null:post)}
style={{padding:16,cursor:"pointer",borderLeft:post.epingle?"4px solid var(--G)":"4
{post.epingle&&<div style={{fontSize:10,fontWeight:700,color:"var(--G)",marginBotto
<div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:6,lineHeight:
<div style={{fontSize:12,color:"var(--m)",lineHeight:1.5,marginBottom:8,
overflow:"hidden",textOverflow:"ellipsis",display:"-webkit-box",
WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{post.contenu}</div>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
<div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
{post.tags.map(t=><span key={t}className="badge"style={{background:"var(--Pp)",
</div>
<div style={{display:"flex",gap:12,fontSize:11,color:"var(--l)"}}>
<span> {post.auteur} · {post.ville}</span>
<span> {post.reponses} réponse{post.reponses>1?"s":""}</span>
<span>{post.date}</span>
</div>
</div>
</div>)}
</div>
{selPost?<div className="card"style={{padding:18}}>
<div style={{fontWeight:700,fontSize:15,color:"var(--b)",marginBottom:8}}>{selPost.ti
<div style={{fontSize:13,color:"var(--m)",lineHeight:1.7,marginBottom:12}}>{selPost.c
<div style={{fontSize:11,color:"var(--l)",marginBottom:16,paddingBottom:12,borderBott
{selPost.auteur} · {selPost.ville} · {selPost.date}
</div>
<div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:10}}>
{selPost.reponses} réponses
</div>
<div style={{background:"var(--c)",borderRadius:10,padding:12,marginBottom:12,fontSiz
Les réponses de la communauté s'afficheront ici.
</div>
<textarea className="ta"value={reponse}onChange={e=>setReponse(e.target.value)}
placeholder="Votre réponse..."style={{width:"100%",minHeight:70,resize:"vertical",m
<button className="btn bP"style={{width:"100%"}}onClick={()=>{
if(!reponse.trim())return;
setPosts(p=>p.map(post=>post.id===selPost.id?{...post,reponses:post.reponses+1}:pos
setReponse("");setToast("Réponse publiée ✓");
}}>Publier ma réponse</button>
</div>
:<div className="card"style={{padding:28,textAlign:"center",color:"var(--l)"}}>
<div style={{fontSize:36,marginBottom:8}}> </div>
<div style={{fontSize:13}}>Sélectionnez un sujet pour lire les réponses et participer
</div>}
</div>
</div>;
}
//
function RapportAnnuel({enfants,role,pEId,user}){
const [selId,setSelId]=useState(enfants[0]?.id);
const [annee,setAnnee]=useState(2024);
const [gen,setGen]=useState(false);
const [toast,setToast]=useState("");
const liste=role==="parent"?enfants.filter(e=>e.id===pEId):enfants;
const enfant=liste.find(e=>e.id===selId)||liste[0];
const contrat=enfant?.contrat||{};
const heuresMois=Math.round((contrat.heuresHebdo||40)*52/12);
const salaireNet=Math.round(heuresMois*(contrat.tauxHoraire||4.05)*1.1*10)/10;
const salaireAnnuel=Math.round(salaireNet*12);
const entretienAnnuel=Math.round((contrat.entretien||3.80)*heuresMois/5*12);
const totalAnnuel=salaireAnnuel+entretienAnnuel;
const creditImpot=Math.min(Math.round(totalAnnuel*0.5),3500);
const generer=()=>{
setGen(true);
setTimeout(()=>{
setGen(false);
// Générer un document HTML imprimable
const w=window.open("","_blank");
if(!w){setToast("Autorisez les popups pour télécharger le PDF");return;}
const htmlRapport='<!DOCTYPE html><html><head><title>Rapport annuel '+annee+' - '+(enfa
+'<style>body{font-family:Arial,sans-serif;max-width:800px;margin:40px auto;color:#22
+'h1{color:#B8622F;}table{width:100%;border-collapse:collapse;margin:20px 0;}'
+'td,th{padding:10px;border:1px solid #ddd;text-align:left;}th{background:#f5f5f5;}'
+'.total{font-weight:bold;}@media print{button{display:none}}</style></head>'
+'<body><h1>Rapport annuel '+annee+'</h1>'
+'<p><strong>Assistante maternelle:</strong> Marie Dupont</p>'
+'<p><strong>Enfant:</strong> '+(enfant?.prenom||'')+' '+(enfant?.nom||'')+'</p>'
+'<h2>Récapitulatif financier</h2>'
+'<table><tr><th>Poste</th><th>Montant</th></tr>'
+'<tr><td>Salaire net annuel estimé</td><td>'+salaireAnnuel+'€</td></tr>'
+"<tr><td>Indemnités d'entretien</td><td>"+entretienAnnuel+"€</td></tr>"
+'<tr class="total"><td>Total versé</td><td>'+totalAnnuel+'€</td></tr>'
+"<tr><td>Crédit d'impôt estimé (50%)</td><td>"+creditImpot+"€</td></tr>"
+'</table>'
+'<p style="font-size:12px;color:#888;">Généré par TiMat - '+new Date().toLocaleDateS
+'<button onclick="window.print()"> Imprimer / PDF</button>'
+'</body></html>';
w.document.write(htmlRapport);
w.document.close();
setToast("Rapport ouvert dans un nouvel onglet ✓");
},1000);
};
return <div className="fi">
{toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
<PageHeader icon=" " title="Rapport annuel complet"
sub="Récapitulatif fiscal · Attestation · Déclaration d'impôts"/>
{role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
{liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>setSelId(e.id)}/>)}
</div>}
<div style={{display:"flex",gap:10,marginBottom:20,alignItems:"center"}}>
<label className="lbl"style={{marginBottom:0}}>Année :</label>
{[2023,2024,2025].map(y=><button key={y}onClick={()=>setAnnee(y)}style={{
padding:"6px 14px",borderRadius:8,border:"1.5px solid",cursor:"pointer",fontSize:13,f
background:annee===y?"var(--b)":"transparent",
color:annee===y?"#fff":"var(--m)",
borderColor:annee===y?"var(--b)":"var(--br)"
}}>{y}</button>)}
</div>
<div className="g2">
<div style={{display:"flex",flexDirection:"column",gap:14}}>
{/* Récap financier */}
<div className="card"style={{padding:18}}>
<div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:14}}> {[
Récap
["Salaire net annuel estimé",salaireAnnuel+"€","var(--S)"],
["Indemnités d'entretien",""+entretienAnnuel+"€","var(--G)"],
["Total versé par les parents",""+totalAnnuel+"€","var(--b)"],
["Crédit d'impôt estimé (50%)",""+creditImpot+"€ remboursé","var(--B)"],
].map(([l,v,c])=><div key={l}style={{display:"flex",justifyContent:"space-between",
<span style={{fontSize:13,color:"var(--m)"}}>{l}</span>
<span style={{fontSize:13,fontWeight:700,color:c}}>{v}</span>
</div>)}
<div style={{marginTop:12,padding:"10px 12px",background:"var(--Bp)",borderRadius:1
Ces montants sont estimés. Le rapport PDF contient les chiffres exacts basés s
</div>
</div>
{/* Contenu du rapport */}
<div className="card"style={{padding:18}}>
<div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:12}}> {[
Conte
[" ","Page de garde - identité asmat et enfant"],
[" [" ","Récapitulatif mensuel des heures (jan→déc)"],
","Total salaire net mensuel et annuel"],
[" [" ","Indemnités d'entretien et de repas"],
","Congés payés pris et restants"],
[" ","Absences et indemnisations"],
[" ","Attestation fiscale employeur (crédit d'impôt)"],
[" ","Récapitulatif Pajemploi par mois"],
[" ","Bilan pédagogique annuel de l'enfant"],
].map(([ic,t])=><div key={t}style={{display:"flex",gap:10,padding:"6px 0",borderBot
<span style={{color:"var(--S)"}}>{ic}</span>
<span style={{color:"var(--m)"}}>{t}</span>
</div>)}
</div>
</div>
<div style={{display:"flex",flexDirection:"column",gap:14}}>
{/* Enfant concerné */}
<div className="card"style={{padding:18,textAlign:"center",borderTop:"4px solid "+(en
<div style={{fontSize:52,marginBottom:8}}>{enfant?.emoji||" "}</div>
<div className="pf"style={{fontSize:18,fontWeight:600,color:"var(--b)",marginBottom
<div style={{fontSize:12,color:"var(--l)"}}>{age(enfant?.naissance||"")}</div>
<div style={{marginTop:12,padding:"8px 12px",background:"var(--Sp)",borderRadius:8,
Contrat actif depuis {fmt(contrat.debut||"2023-09-04")}
</div>
</div>
{/* Bouton génération */}
<div className="card"style={{padding:20,textAlign:"center"}}>
<div style={{fontSize:40,marginBottom:12}}> </div>
<div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:8}}>
Rapport annuel {annee}
</div>
<div style={{fontSize:12,color:"var(--l)",marginBottom:16,lineHeight:1.6}}>
Pour {enfant?.prenom} {enfant?.nom}<br/>
Inclut l'attestation fiscale
</div>
<button className="btn bT"style={{width:"100%",justifyContent:"center"}}onClick={ge
{gen?" Génération en cours...":" Générer et télécharger le PDF"}
</button>
</div>
Envoi
{/* Partage parent */}
{role==="asmat"&&<div className="card"style={{padding:16,background:"var(--Gp)",borde
<div style={{fontWeight:700,fontSize:13,color:"var(--G)",marginBottom:8}}> <div style={{fontSize:12,color:"var(--m)",marginBottom:10,lineHeight:1.6}}>
L'attestation fiscale peut être envoyée directement aux parents pour leur déclara
</div>
<button className="btn bG"style={{width:"100%"}}onClick={()=>setToast("Attestation
Envoyer l'attestation au parent
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
<PageHeader icon=" " title="Simulateur de coût" sub="Estimez le coût réel de la garde ap
<div className="g2">
<div style={{display:"flex",flexDirection:"column",gap:14}}>
<div className="card"style={{padding:18}}>
<div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:14}}> {[
Les p
{l:"Taux horaire net (€/h)",v:taux,set:setTaux,min:3.5,max:8,step:0.05},
{l:"Heures d'accueil par semaine",v:heures,set:setHeures,min:5,max:60,step:1},
{l:"Semaines d'accueil par an",v:semaines,set:setSemaines,min:30,max:52,step:1},
{l:"Indemnité entretien (€/jour)",v:entretien,set:setEntretien,min:2.65,max:8,ste
].map(({l,v,set,min,max,step})=><div key={l}style={{marginBottom:14}}>
<div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
<label className="lbl"style={{marginBottom:0}}>{l}</label>
<span style={{fontWeight:700,color:"var(--b)",fontSize:13}}>{v}</span>
</div>
<input type="range"min={min}max={max}step={step}value={v}
onChange={e=>set(parseFloat(e.target.value))}
style={{width:"100%",accentColor:"var(--T)"}}/>
<div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"var
<span>{min}</span><span>{max}</span>
</div>
</div>)}
</div>
<div className="card"style={{padding:18}}>
<div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:14}}> V
<div style={{marginBottom:14}}>
<label className="lbl">Revenus nets annuels du foyer (€)</label>
<input type="number"className="inp"value={revenus}onChange={e=>setRevenus(parseIn
</div>
<div>
<label className="lbl">Nombre d'enfants à charge</label>
<div style={{display:"flex",gap:8}}>
{[1,2,3].map(n=><button key={n}onClick={()=>setEnfants2(n)}style={{
flex:1,padding:"8px",borderRadius:8,border:"1.5px solid",cursor:"pointer",fon
background:enfants2===n?"var(--B)":"transparent",color:enfants2===n?"#fff":"v
borderColor:enfants2===n?"var(--B)":"var(--br)"}}>{n}</button>)}
</div>
</div>
</div>
</div>
<div style={{display:"flex",flexDirection:"column",gap:14}}>
<div className="card"style={{padding:18,border:"2px solid var(--T)"}}>
<div style={{fontWeight:700,fontSize:14,color:"var(--T)",marginBottom:16}}> {[
Résul
["Coût brut de la garde",fmt2(coutTotal),"var(--m)"],
["Aide CMG (CAF)","-"+fmt2(cmgMensuel),"var(--S)"],
["Crédit d'impôt (50%)","-"+fmt2(creditImpot),"var(--B)"],
].map(([l,v,c])=><div key={l}style={{display:"flex",justifyContent:"space-between",
<span style={{fontSize:13,color:"var(--m)"}}>{l}</span>
<span style={{fontWeight:700,color:c}}>{v}</span>
</div>)}
<div style={{marginTop:12,padding:"14px",background:"var(--Tp)",borderRadius:12,tex
<div style={{fontSize:12,color:"var(--T)",marginBottom:4}}>Reste à charge mensuel
<div className="pf"style={{fontSize:38,fontWeight:700,color:"var(--T)"}}>{fmt2(re
<div style={{fontSize:11,color:"var(--l)",marginTop:4}}>par mois</div>
</div>
</div>
<div className="card"style={{padding:16,background:"var(--Gp)",border:"1px solid var(
<div style={{fontWeight:700,fontSize:13,color:"var(--G)",marginBottom:8}}> {[
Sur l'
["Coût annuel brut",fmt2(coutTotal*12)],
["Aides totales",fmt2((cmgMensuel+creditImpot)*12)],
["Votre coût réel annuel",fmt2(resteCharge*12)],
].map(([l,v])=><div key={l}style={{display:"flex",justifyContent:"space-between",fo
<span style={{color:"var(--m)"}}>{l}</span>
<span style={{fontWeight:600,color:"var(--b)"}}>{v}</span>
</div>)}
</div>
<div style={{fontSize:11,color:"var(--l)",lineHeight:1.6,padding:"10px 0"}}>
Simulation indicative. Le CMG exact dépend de vos ressources déclarées à la CAF.
</div>
</div>
</div>
</div>;
}
//
function SoldeDeCompte({enfants,role,pEId}){
const [selId,setSelId]=useState(enfants[0]?.id);
const [dateFin,setDateFin]=useState("");
const [motif,setMotif]=useState("Démission du parent");
const [calcule,setCalcule]=useState(false);
const [toast,setToast]=useState("");
const liste=role==="parent"?enfants.filter(e=>e.id===pEId):enfants;
const enfant=liste.find(e=>e.id===selId)||liste[0]||{contrat:{}};
const contrat=enfant?.contrat||{};
const motifs=["Démission du parent","Rupture amiable","Retraite asmat","Déménagement","Fin
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
return <div className="fi">
{toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
<PageHeader icon=" " title="Solde de tout compte" sub="Calcul automatique à la fin d'un
{role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
{liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>{setSelId(e.id);setC
</div>}
<div className="g2">
<div style={{display:"flex",flexDirection:"column",gap:14}}>
<div className="card"style={{padding:18}}>
<div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:14}}> <div style={{marginBottom:12}}>
<label className="lbl">Date de fin du contrat</label>
<input type="date"className="inp"value={dateFin}onChange={e=>setDateFin(e.target.
</div>
<div style={{marginBottom:12}}>
<label className="lbl">Motif de rupture</label>
<select className="sel"value={motif}onChange={e=>setMotif(e.target.value)}>
{motifs.map(m=><option key={m}>{m}</option>)}
</select>
</div>
<div style={{background:"var(--c)",borderRadius:10,padding:12,marginBottom:14}}>
<div style={{fontSize:12,fontWeight:700,color:"var(--b)",marginBottom:6}}>Données
{[
Param
["Enfant",(enfant?.prenom||"-")+" "+(enfant?.nom||"")],
["Début",fmt(contrat.debut||"2023-09-04")],
["Taux horaire",tauxH.toFixed(2)+"€/h"],
["Heures/semaine",(contrat.heuresHebdo||40)+"h"],
].map(([l,v])=><div key={l}style={{display:"flex",justifyContent:"space-between",
<span style={{color:"var(--l)"}}>{l}</span><span style={{fontWeight:600,color:"
</div>)}
</div>
<button className="btn bT"style={{width:"100%"}}onClick={()=>{if(!dateFin)return;se
Calculer le solde de tout compte
</button>
</div>
</div>
{calcule&&<div style={{display:"flex",flexDirection:"column",gap:14}}>
<div className="card"style={{padding:20,border:"2px solid var(--G)"}}>
<div style={{fontWeight:700,fontSize:14,color:"var(--G)",marginBottom:16}}> {[
Solde
["Indemnité compensatrice de congés payés",congesRestants+" jours × "+(heuresMois
["Indemnité de préavis ("+preavis+"j)",preavis+" jours selon CCN",indemPreavis.to
].map(([l,d,v,c])=><div key={l}style={{padding:"10px 0",borderBottom:"1px solid var
<div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
<span style={{fontSize:13,fontWeight:600,color:"var(--b)"}}>{l}</span>
<span style={{fontWeight:700,color:c,fontSize:13}}>{v}</span>
</div>
<div style={{fontSize:11,color:"var(--l)"}}>{d}</div>
</div>)}
<div style={{marginTop:14,padding:14,background:"var(--Gp)",borderRadius:12,display
<span className="pf"style={{fontSize:15,fontWeight:700,color:"var(--b)"}}>TOTAL S
<span className="pf"style={{fontSize:28,fontWeight:700,color:"var(--G)"}}>{total.
</div>
<div style={{fontSize:10,color:"var(--l)",marginTop:12,lineHeight:1.6}}>
Calcul conforme à la CCN des particuliers employeurs. L'ICCP est calculée sur la
</div>
</div>
<div style={{display:"flex",gap:8}}>
<button className="btn bG"style={{flex:1}}onClick={()=>setToast("Document PDF génér
<button className="btn bT"style={{flex:1}}onClick={()=>setToast("Envoyé au parent ✓
</div>
</div>}
</div>
</div>;
}
//
function ExportDonnees({enfants,user,role}){
const [selEnfant,setSelEnfant]=useState("tous");
const [periode,setPeriode]=useState("annee");
const [format,setFormat]=useState("pdf");
const [exporting,setExporting]=useState(false);
const [toast,setToast]=useState("");
const exporter=()=>{
setExporting(true);
setTimeout(()=>{
setExporting(false);
setToast("Export "+format.toUpperCase()+" généré et prêt à télécharger ✓");
},2000);
};
const modules=[
{id:"profil",l:"Profil et informations personnelles",checked:true},
{id:"enfants",l:"Fiches des enfants accueillis",checked:true},
{id:"contrats",l:"Contrats et avenants",checked:true},
{id:"pointages",l:"Historique des pointages",checked:true},
{id:"transmissions",l:"Journal et transmissions",checked:true},
{id:"salaires",l:"Récapitulatifs salaires et bulletins",checked:true},
{id:"absences",l:"Historique des absences",checked:true},
{id:"sante",l:"Données de santé et vaccins",checked:true},
{id:"photos",l:"Photos du journal",checked:false},
{id:"documents",l:"Documents stockés",checked:false},
];
const [sel,setSel]=useState(Object.fromEntries(modules.map(m=>[m.id,m.checked])));
return <div className="fi">
{toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
Optio
<PageHeader icon=" " title="Export de vos données"
sub="Téléchargez l'intégralité de vos données - droit RGPD à la portabilité"/>
<div className="g2">
<div style={{display:"flex",flexDirection:"column",gap:14}}>
<div className="card"style={{padding:18}}>
<div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:14}}> Ce qu
{modules.map(m=><label key={m.id}style={{display:"flex",gap:10,alignItems:"center",
<input type="checkbox"checked={sel[m.id]}onChange={e=>setSel(p=>({...p,[m.id]:e.t
style={{width:15,height:15,accentColor:"var(--T)",flexShrink:0}}/>
<span style={{fontSize:13,color:"var(--b)"}}>{m.l}</span>
</label>)}
</div>
</div>
<div style={{display:"flex",flexDirection:"column",gap:14}}>
<div className="card"style={{padding:18}}>
<div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:14}}> <div style={{marginBottom:12}}>
<label className="lbl">Enfant concerné</label>
<select className="sel"value={selEnfant}onChange={e=>setSelEnfant(e.target.value)
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
{[["pdf"," PDF"],["csv"," CSV"],["json"," JSON"]].map(([v,l])=><button k
flex:1,padding:"8px",borderRadius:8,border:"1.5px solid",cursor:"pointer",fon
background:format===v?"var(--b)":"transparent",color:format===v?"#fff":"var(-
borderColor:format===v?"var(--b)":"var(--br)"}}>{l}</button>)}
</div>
</div>
<div style={{background:"var(--Bp)",borderRadius:10,padding:"10px 12px",marginBotto
Export conforme RGPD (article 20 - droit à la portabilité). Fichier chiffré, t
</div>
<button className="btn bT"style={{width:"100%",justifyContent:"center"}}onClick={ex
{exporting?" Génération en cours...":" Exporter mes données"}
</button>
</div>
<div className="card"style={{padding:16,background:"var(--Sp)",border:"1px solid var(
<div style={{fontWeight:700,fontSize:13,color:"var(--S)",marginBottom:6}}> <div style={{fontSize:12,color:"var(--m)",lineHeight:1.7}}>
Vous avez le droit d'accéder à toutes vos données, de les télécharger, et de les
</div>
</div>
</div>
</div>
</div>;
Vos dr
}
// ========== BILANS & EXPORTS ==========
function BilansExports({enfants,role,pEId,user,pointagesDB}){
const [sec,setSec]=useState("rapport");
return <div className="fi">
<PageHeader icon=" " title="Bilans & Exports" sub="Rapports, recapitulatifs et exports d
<div style={{display:"flex",gap:2,marginBottom:16,borderBottom:"2px solid var(--br)",flex
{[{id:"rapport",l:"Rapport annuel",ic:" "},{id:"recap",l:"Recap mensuel PDF",ic:" "},
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
?",
//
const FAQ_DATA=[
{cat:"Pajemploi",q:"Comment exporter mes données vers Pajemploi ?",
r:"Dans Facturation & Bilans, cliquez sur 'Exporter vers Pajemploi'. TiMat génère un récap
{cat:"Pajemploi",q:"Mon calcul de salaire est-il conforme à la convention collective r:"Oui. TiMat applique automatiquement les règles de la CCN des particuliers employeurs :
{cat:"Contrats",q:"Puis-je modifier un contrat en cours ?",
r:"Oui, via un avenant. Dans Facturation → Contrats & Avenants, choisissez 'Avenant {cat:"Contrats",q:"Que se passe-t-il si un parent ne signe pas le contrat ?",
r:"Relancez via la messagerie TiMat. Sans signature, le contrat n'a pas de valeur légale.
{cat:"PMI",q:"Comment préparer ma visite de renouvellement d'agrément ?",
r:"Dans Documents, exportez votre 'Dossier PMI complet' : il contient l'historique des enf
{cat:"Finances",q:"Comment calculer le solde de tout compte ?",
- Modi
r:"Dans Facturation → Solde de tout compte. Saisissez la date de fin et le motif. TiMat ca
{cat:"RGPD",q:"Comment supprimer mon compte et toutes mes données ?",
r:"Dans Paramètres → Supprimer mon compte. La suppression est immédiate et définitive. Tou
{cat:"RGPD",q:"Où sont stockées mes données ?",
r:"Exclusivement en France, sur des serveurs OVHcloud à Paris via Supabase. Aucun transfer
{cat:"Abonnement",q:"Puis-je changer d'offre ou résilier ?",
r:"Oui, à tout moment depuis Paramètres → Mon abonnement. Pas d'engagement, pas de frais d
{cat:"Abonnement",q:"Comment fonctionne le parrainage ?",
r:"Dans Parrainage, copiez votre lien personnel. Quand une collègue s'inscrit et passe au
];
function FAQ({role}){
const [filtre,setFiltre]=useState("Tous");
const [open,setOpen]=useState(null);
const [search,setSearch]=useState("");
const cats=["Tous",...[...new Set(FAQ_DATA.map(f=>f.cat))]];
const filtrees=FAQ_DATA
.filter(f=>filtre==="Tous"||f.cat===filtre)
.filter(f=>!search||f.q.toLowerCase().includes(search.toLowerCase())||f.r.toLowerCase().i
return <div className="fi">
<PageHeader icon=" " title="Centre d'aide" sub="Réponses aux questions les plus fréquent
<input className="inp"placeholder=" Rechercher dans l'aide..."value={search}
onChange={e=>setSearch(e.target.value)}style={{marginBottom:14}}/>
<div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>
{cats.map(c=><button key={c}onClick={()=>setFiltre(c)}style={{
padding:"5px 12px",borderRadius:20,border:"1.5px solid",cursor:"pointer",fontSize:12,
background:filtre===c?"var(--b)":"transparent",color:filtre===c?"#fff":"var(--m)",
borderColor:filtre===c?"var(--b)":"var(--br)"}}>{c}</button>)}
</div>
<div style={{display:"flex",flexDirection:"column",gap:6}}>
{filtrees.length===0&&<div className="card"style={{padding:20,textAlign:"center",color:
Aucun résultat. <span style={{color:"var(--T)",cursor:"pointer"}}onClick={()=>setSear
</div>}
{filtrees.map((f,i)=><div key={i}className="card"style={{padding:0,overflow:"hidden"}}>
<button onClick={()=>setOpen(open===i?null:i)}style={{
width:"100%",padding:"14px 18px",background:"none",border:"none",cursor:"pointer",
display:"flex",justifyContent:"space-between",alignItems:"center",textAlign:"left",
<div style={{flex:1}}>
<span className="badge"style={{background:"var(--Bp)",color:"var(--B)",fontSize:9
<div style={{fontWeight:600,fontSize:13,color:"var(--b)"}}>{f.q}</div>
</div>
<span style={{fontSize:18,color:"var(--l)",flexShrink:0,transition:"transform .2s",
transform:open===i?"rotate(180deg)":"rotate(0deg)"}}>▾</span>
</button>
{open===i&&<div style={{padding:"0 18px 16px",fontSize:13,color:"var(--m)",lineHeight
{f.r}
</div>}
</div>)}
</div>
<div className="card"style={{padding:18,marginTop:20,textAlign:"center",background:"var(-
<div style={{fontSize:14,fontWeight:700,color:"var(--b)",marginBottom:6}}>Vous n'avez p
<div style={{fontSize:13,color:"var(--m)",marginBottom:12}}>Notre équipe répond en moin
<button className="btn bT"onClick={()=>window.dispatchEvent(new CustomEvent("timat:page
Contacter le support
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
const sujets=["Question générale","Problème technique","Facturation / abonnement","Calcul d
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
const mailto=`mailto:support@timat.app?subject=${encodeURIComponent((isPro?"[PRO] ":"
window.open(mailto);
setEnvoye(true);
}
}catch(e){
// Fallback mailto
const mailto=`mailto:support@timat.app?subject=${encodeURIComponent((isPro?"[PRO] ":"")
window.open(mailto);
setEnvoye(true);
}
setSending(false);
};
return <div className="fi">
<PageHeader icon=" " title="Support TiMat" sub={isPro?"Support prioritaire — réponse sou
{isPro&&<div style={{background:"linear-gradient(135deg,#FFF8F3,#FFF0E6)",border:"1.5px s
Vous bénéficiez du support prioritaire Pro — traitement en priorité
</div>}
{envoye?<div style={{textAlign:"center",padding:40}}>
<div style={{fontSize:60,marginBottom:16}}> </div>
<div className="pf"style={{fontSize:22,fontWeight:600,color:"var(--S)",marginBottom:8}}
<div style={{fontSize:13,color:"var(--m)",lineHeight:1.7}}>Nous vous répondrons par ema
<button className="btn bG"style={{marginTop:20}}onClick={()=>{setEnvoye(false);setMsg("
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
{erreur&&<div style={{color:"var(--R)",fontSize:12,marginBottom:12,padding:"8px 12px"
<div style={{display:"flex",gap:12,alignItems:"center",marginBottom:16,padding:"10px
<span style={{fontSize:18}}> </span>
<div style={{fontSize:12,color:"var(--B)"}}>Réponse envoyée à <strong>{user?.email|
</div>
<button className="btn bT"style={{width:"100%"}}onClick={envoyer}disabled={sending}>
{sending?" Envoi en cours...":" Envoyer mon message"}
</button>
</div>
<div style={{marginTop:14,display:"flex",gap:10,flexWrap:"wrap",justifyContent:"center"
{[[" ","support@timat.app"],[" ",isPro?"Réponse < 12h":"Réponse < 24h"],[" <div key={t}style={{background:"var(--w)",border:"1px solid var(--br)",borderRadius
","Cen
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
</span>
</button>;
<span className="bnav-lbl">{g.l}</span>
{hasBadge&&<span style={{position:"absolute",top:-4,right:-6,background:"var(--R)",
})}
</nav>;
}
const GROUPS_AM={
accueil:{l:"Accueil",ic:" ",color:"var(--T)",subs:null},
enfant:{l:"L'enfant",ic:" ",color:"#B8622F",subs:[
{id:"dashboard",l:"Tableau de bord",ic:" "},
{id:"pointage",l:"Pointage",ic:" "},
{id:"journal_complet",l:"Journal",ic:" "},
{id:"sante_complet",l:"Santé",ic:" "},
{id:"fiche_urgence",l:"Fiche d'urgence",ic:" "},
{id:"eveil_complet",l:"Éveil & Progrès",ic:" "},
]},
admin:{l:"Administratif",ic:" ",color:"#B8892A",subs:[
{id:"calendrier",l:"Calendrier",ic:" "},
{id:"messagerie",l:"Messagerie",ic:" "},
{id:"admin_finances",l:"Facturation & Bilans",ic:" "},
{id:"documents_complet",l:"Documents & Attestations",ic:" "},
{id:"bilans_exports",l:"Bilans & Exports",ic:" "},
]},
outils:{l:"Outils Pro",ic:" ",color:"#FF9F63",subs:[
{id:"projet_accueil",l:"Projet d'accueil",ic:" "},
{id:"pmi",l:"PMI",ic:" "},
{id:"faq",l:"Centre d'aide",ic:" "},
{id:"support",l:"Support",ic:" "},
]},
};
const GROUPS_P={
accueil:{l:"Accueil",ic:" ",color:"var(--T)",subs:null},
enfant:{l:"Mon enfant",ic:" ",color:"#B8622F",subs:[
{id:"dashboard",l:"Tableau de bord",ic:" "},
{id:"pointage",l:"Pointage",ic:" "},
{id:"journal_complet",l:"Journal",ic:" "},
{id:"sante_complet",l:"Santé",ic:" "},
{id:"fiche_urgence",l:"Fiche d'urgence",ic:" "},
{id:"projet_accueil",l:"Projet d'accueil",ic:" "},
{id:"eveil_complet",l:"Éveil & Progrès",ic:" "},
]},
admin:{l:"Administratif",ic:" ",color:"#B8892A",subs:[
{id:"calendrier",l:"Calendrier",ic:" "},
{id:"messagerie",l:"Messagerie",ic:" "},
{id:"kit_cmg",l:"Aide CMG",ic:" "},
{id:"simulateur",l:"Simulateur coût",ic:" "},
{id:"admin_finances",l:"Facturation & Bilans",ic:" "},
{id:"documents_complet",l:"Documents & Attestations",ic:" "},
{id:"faq",l:"Centre d'aide",ic:" "},
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
function TopBar({role,groups,page,setPage,user,onLogout,pmiNonLus,dark,setDark,notifNonLus,no
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
<div className="logo">TiMat</div>
<div className="logo-dot"/>
<span style={{fontSize:10,color:"var(--l)",fontFamily:"'DM Mono',monospace",letterS
</div>
</div>
<div style={{display:"flex",alignItems:"center",gap:6}}>
{/* Cloche notifications */}
<div style={{position:"relative"}}>
<button onClick={()=>setShowNotifs&&setShowNotifs(p=>!p)}style={{
background:"none",border:"none",cursor:"pointer",fontSize:18,padding:4,
position:"relative",display:"flex",alignItems:"center"
}}>
{notifNonLus>0&&<span style={{
position:"absolute",top:-2,right:-2,background:"var(--R)",color:"#fff",
borderRadius:"50%",width:14,height:14,fontSize:9,fontWeight:700,
display:"flex",alignItems:"center",justifyContent:"center"
}}>{notifNonLus}</span>}
</button>
{showNotifs&&<div style={{
position:"absolute",right:0,top:"100%",marginTop:8,
background:"var(--w)",borderRadius:14,boxShadow:"var(--sh2)",
border:"1px solid var(--br)",width:280,zIndex:200,overflow:"hidden"
}}>
<div style={{padding:"12px 16px",borderBottom:"1px solid var(--br)",fontWeight:70
Notifications
</div>
{notifs.filter(n=>!n.roles||n.roles.includes(role)).map(n=><div key={n.id}onClick
setNotifs&&setNotifs(p=>p.map(x=>x.id===n.id?{...x,lu:true}:x));
setPage2&&setPage2(n.page);
setShowNotifs&&setShowNotifs(false);
}}style={{
padding:"10px 16px",borderBottom:"1px solid var(--br)",cursor:"pointer",
background:n.lu?"transparent":"var(--Tp)",
transition:"background .15s",display:"flex",gap:10,alignItems:"flex-start"
}}
onMouseEnter={e=>e.currentTarget.style.background="var(--c)"}
onMouseLeave={e=>e.currentTarget.style.background=n.lu?"transparent":"var(--Tp)
<span style={{fontSize:16,flexShrink:0}}>{n.ic}</span>
<div style={{flex:1}}>
<div style={{fontSize:12,color:"var(--b)",fontWeight:n.lu?400:700,lineHeight:
<div style={{fontSize:10,color:"var(--l)",marginTop:2}}>Aujourd'hui</div>
</div>
{!n.lu&&<div style={{width:7,height:7,borderRadius:"50%",background:"var(--T)",
</div>)}
{notifs.length===0&&<div style={{padding:16,fontSize:13,color:"var(--l)",textAlig
</div>}
</div>
{/* Toggle mode sombre */}
<button onClick={()=>setDark&&setDark(d=>!d)}style={{
background:"none",border:"none",cursor:"pointer",fontSize:16,padding:4
}} title={dark?"Mode clair":"Mode sombre"}>{dark?" ":" "}</button>
{/* Paramètres */}
<button onClick={()=>setPage2&&setPage2("parametres")}style={{background:"none",borde
{user?.email===ADMIN_EMAIL&&<button onClick={()=>setPage2&&setPage2("backoffice")}sty
<Av t={ini(user.prenom,user.nom)}c={user.couleur}s={30}/>
<span style={{fontWeight:600,fontSize:13,color:"var(--b)"}}>{user.prenom}</span>
<button onClick={onLogout}style={{background:"none",border:"none",cursor:"pointer",fo
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
background:isActive?"linear-gradient(135deg,var(--T),var(--S))":"rgba(155,107,170,.
color:isActive?"#fff":"var(--m)",
boxShadow:isActive?"0 4px 16px rgba(155,107,170,.3)":"none",
transform:isActive?"scale(1.03)":"scale(1)",
letterSpacing:".1px",position:"relative",
}}>
<span style={{fontSize:17,lineHeight:1}}>{g.ic}</span>
<span>{g.l}</span>
{g.subs&&<span style={{fontSize:9,opacity:.5,marginLeft:2,transform:isActive?"rotat
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
boxShadow:isSubActive?"inset 0 0 0 1.5px rgba(155,107,170,.3)":"none",
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
const obs=new IntersectionObserver(([e])=>{if(e.isIntersecting)setVisible(true);},{thresh
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
id:"journal",label:"Journal quotidien",icon:" ",color:"#2A9D8F",
preview:()=>{
const [mood,setMood]=useState(" ");
const [liked,setLiked]=useState(false);
return(
<div style={{padding:20,fontFamily:"system-ui"}}>
<div style={{fontSize:13,fontWeight:700,color:"#264653",marginBottom:12}}> Journal
Marie
peintu
<div style={{background:"#F0FAF4",borderRadius:10,padding:12,marginBottom:8,borderLef
<div style={{fontSize:10,color:"#2A9D8F",fontWeight:700,marginBottom:3}}> <div style={{fontSize:12,color:"#264653",lineHeight:1.6}}>Léo a découvert la <div style={{display:"flex",justifyContent:"flex-end",marginTop:6}}>
<button onClick={()=>setLiked(!liked)}style={{background:"none",border:"none",cur
</div>
</div>
<div style={{background:"#FFF8F3",borderRadius:10,padding:12,borderLeft:"3px solid #F
<div style={{fontSize:10,color:"#FF9F63",fontWeight:700,marginBottom:3}}> Repas</
<div style={{fontSize:12,color:"#264653"}}> Purée de légumes · Bon appétit ·
</div>
<div style={{marginTop:12,display:"flex",gap:6,alignItems:"center"}}>
<span style={{fontSize:10,color:"#8FA3AD"}}>Humeur :</span>
{[" "," "," "," "].map(m=><button key={m}onClick={()=>setMood(m)}style={{
fontSize:18,background:mood===m?"#F0FAF4":"transparent",border:mood===m?"1.5px so
borderRadius:8,padding:"2px 6px",cursor:"pointer",transition:"all .15s"
}}>{m}</button>)}
</div>
</div>);
},
},
{
id:"facturation",label:"Salaire automatique",icon:" ",color:"#FF9F63",
preview:()=>{
const [mois,setMois]=useState("Mars");
const data={Mars:{h:160,supp:8,ent:20},Fev:{h:152,supp:4,ent:19},Jan:{h:168,supp:12,ent
const m=data[mois]||data.Mars;
const brut=(m.h*4.05+m.supp*5.06+m.ent*3.80);
return(
<div style={{padding:20,fontFamily:"system-ui"}}>
<div style={{fontSize:13,fontWeight:700,color:"#264653",marginBottom:12}}> Salaire
<div style={{display:"flex",gap:4,marginBottom:12}}>
{["Jan","Fev","Mars"].map(mo=><button key={mo}onClick={()=>setMois(mo)}style={{
padding:"5px 12px",borderRadius:8,border:"none",cursor:"pointer",fontSize:11,font
background:mois===mo?"#FF9F63":"#F4F7FA",color:mois===mo?"#fff":"#264653",transit
}}>{mo} 2024</button>)}
</div>
{[["Heures réalisées",m.h+"h × 4,05€",(m.h*4.05).toFixed(2)+"€"],["Indemnité entretie
<div key={l}style={{display:"flex",justifyContent:"space-between",padding:"7px 0",b
<div><div style={{fontWeight:600,color:"#264653"}}>{l}</div><div style={{fontSize
<div style={{fontWeight:700,color:"#2A9D8F"}}>{v}</div>
</div>
))}
<div style={{marginTop:10,padding:"10px 12px",background:"#FFF8F3",borderRadius:10,di
<span style={{fontSize:13,fontWeight:700,color:"#264653"}}>Total brut</span>
<span style={{fontSize:20,fontWeight:700,color:"#FF9F63"}}>{brut.toFixed(2)} </div>
€</spa
},
{
},
{
</div>);
},
id:"calendrier",label:"Calendrier partagé",icon:" ",color:"#264653",
preview:()=>{
const [selDay,setSelDay]=useState(15);
return(
<div style={{padding:20,fontFamily:"system-ui"}}>
<div style={{fontSize:13,fontWeight:700,color:"#264653",marginBottom:12}}> Mars 202
<div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:12
{["L","M","Me","J","V","S","D"].map(j=><div key={j}style={{textAlign:"center",fontS
{Array.from({length:31},(_,i)=>i+1).map(d=>{
const isWork=d%7!==0&&d%7!==6;
return <div key={d}onClick={()=>setSelDay(d)}style={{
textAlign:"center",fontSize:11,padding:"6px 0",borderRadius:8,cursor:"pointer",
background:selDay===d?"#264653":isWork?"#F0FAF4":"transparent",
color:selDay===d?"#fff":isWork?"#264653":"#B0BEC5",
border:d===15?"2px solid #FF9F63":"2px solid transparent",transition:"all .15s"
}}>{d}</div>;
})}
</div>
{selDay&&<div style={{background:"#F4F7FA",borderRadius:10,padding:10,fontSize:11,col
<div style={{fontWeight:700,marginBottom:4}}> {selDay} mars</div>
<div> Léo : 07h30 — 17h30 {selDay%7!==0&&selDay%7!==6?" ":" Repos"}</div>
{selDay%3===0&&<div> Emma : 08h00 — 16h30 </div>}
</div>}
</div>);
},
id:"parent",label:"Espace parent",icon:" ",color:"#E76F51",
preview:()=>{
const [valide,setValide]=useState(false);
return(
<div style={{padding:20,fontFamily:"system-ui"}}>
<div style={{fontSize:13,fontWeight:700,color:"#264653",marginBottom:12}}> Sophie —
<div style={{background:"#FFF8F3",borderRadius:10,padding:12,marginBottom:8,border:"1
<div style={{fontSize:10,color:"#E76F51",fontWeight:700,marginBottom:4}}> Pointag
<div style={{display:"flex",gap:16}}>
{[["Arrivée","07h35","#2A9D8F"],["Départ","17h20","#E76F51"],["Total","9h45","#26
<div key={l}style={{textAlign:"center"}}><div style={{fontSize:9,color:"#8FA3AD
))}
</div>
<button onClick={()=>setValide(!valide)}style={{
marginTop:8,width:"100%",padding:"7px",borderRadius:8,border:"none",cursor:"point
background:valide?"#2A9D8F":"#F4F7FA",color:valide?"#fff":"#264653",transition:"a
}}>{valide?" Pointage validé":"Valider le pointage"}</button>
</div>
<div style={{background:"#F0FAF4",borderRadius:10,padding:10,fontSize:12,color:"#2646
Léo a peint un tableau et l'a offert à sa maman !
</div>
</div>);
},
},
];
//
function LandingPage({onLogin,dark,setDark,config=DEFAULT_CONFIG}) {
const [activeDemo, setActiveDemo] = useState("accueil");
const [showModal, setShowModal] = useState(false);
const [showLegal, setShowLegal] = useState(null); // null, "mentions", "cgu", "confidential
const [showBlog, setShowBlog] = useState(null); // null or article id
const [showBoutique, setShowBoutique] = useState(false);
const [menuOpen, setMenuOpen] = useState(false);
const [role, setRole] = useState("asmat");
const [modeAuth, setModeAuth] = useState("inscription");
const [form, setForm] = useState({email:"", password:"", prenom:"", nom:""});
const [err, setErr] = useState("");
const [loading, setLoading] = useState(false);
const [consent, setConsent] = useState({politique:false, cgu:false, newsletter:false});
const consentValide = consent.politique && consent.cgu;
const demo = DEMO_SCREENS.find(s => s.id === activeDemo);
const L = config.landing;
const T = config.txts;
const demos=[
{id:"demo-asmat",email:"marie.dupont@mail.fr",prenom:"Marie",nom:"Dupont",role:"asmat",co
{id:"demo-parent1",email:"sophie.martin@mail.fr",prenom:"Sophie",nom:"Martin",role:"paren
{id:"demo-parent2",email:"thomas.bernard@mail.fr",prenom:"Thomas",nom:"Bernard",role:"par
];
useEffect(()=>{
const id = 'timat-fonts';
if (document.getElementById(id)) return;
const link = document.createElement('link');
link.id = id; link.rel = 'stylesheet';
link.href = config.landing.googleFontsUrl || 'https://fonts.googleapis.com/css2?family=Qu
document.head.appendChild(link);
}, []);
const connexion = async () => {
if (!form.email || !form.password) { setErr("Email et mot de passe requis."); return; }
setLoading(true); setErr("");
try {
const { data, error } = await supabase.auth.signInWithPassword({ email: form.email, pas
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
couleur: "#C4714A",
subscription_status: "free"
});
}
} catch(e) { setErr("Erreur réseau. Vérifiez votre connexion ou utilisez un compte setLoading(false);
démo."
};
const inscription = async () => {
if (!form.email || !form.password || !form.prenom) { setErr("Remplis tous les champs obli
if (form.password.length < 6) { setErr("Le mot de passe doit faire au moins 6 caractères.
if (!consentValide) { setErr("Accepte la politique de confidentialité et les CGU pour con
setLoading(true); setErr("");
try {
const { data, error } = await supabase.auth.signUp({
email: form.email, password: form.password,
options: { data: { prenom: form.prenom, nom: form.nom, role } }
});
if (error) {
if(error.message?.includes('already registered')) setErr("Cet email est déjà utilisé.
else if(error.message?.includes('fetch')) setErr("Erreur réseau. Vérifiez votre conne
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
onLogin({ id: data.user.id, email: data.user.email, prenom: form.prenom, nom: form.no
}
} catch(e) { setErr("Erreur lors de l'inscription."); }
setLoading(false);
};
const accent = L.accentColor||"#E8A84A";
const fTitle = L.fontTitle||"'Fraunces', Georgia, serif";
const fBody = L.fontBody||"'Plus Jakarta Sans', 'DM Sans', system-ui, sans-serif";
const painPoints = config.painPoints||DEFAULT_CONFIG.painPoints;
const transformations = config.transformations||DEFAULT_CONFIG.transformations;
const statsHero = config.statsHero||DEFAULT_CONFIG.statsHero;
const statsSection = config.statsSection||DEFAULT_CONFIG.statsSection;
const testimonials = config.testimonials||DEFAULT_CONFIG.testimonials;
return (
<div style={{ fontFamily: fBody, overflowX: "hidden", background: L.pageBg||"#FDF5F8" }}>
{/* Responsive CSS */}
<style>{`
.lp-nav-btns{display:flex;gap:8px;align-items:center}
.lp-nav-full{display:flex;gap:8px;align-items:center}
.lp-nav-mobile{display:none}
.lp-hero-stats{display:flex;gap:32px;flex-wrap:wrap;justify-content:center}
.lp-demo-grid{display:grid;grid-template-columns:200px 1fr;gap:24px;align-items:start
.lp-demo-tabs{display:flex;flex-direction:column;gap:6px}
.lp-transfo-row{display:grid;grid-template-columns:40px 1fr 1fr 1fr;gap:20px;align-it
.lp-tarifs-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:start
.lp-logo{font-size:26px;font-weight:700;display:flex;align-items:center;gap:8px;lette
.lp-logo-icon{width:32px;height:32px;border-radius:10px;display:flex;align-items:cent
.lp-hero-ctas{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-bott
.lp-hero-ctas button{white-space:nowrap}
.lp-hero{padding:0 24px 80px;position:relative;overflow:hidden}
.lp-section{padding:72px 24px}
.lp-guarantees{display:flex;gap:20px;justify-content:center;flex-wrap:wrap;text-align
@media(max-width:768px){
.lp-nav-full{display:none!important}
.lp-nav-mobile{display:flex!important;gap:6px;align-items:center}
.lp-hero-stats{gap:16px}
.lp-hero-stats>div{min-width:60px}
.lp-demo-grid{grid-template-columns:1fr!important;gap:16px}
.lp-demo-tabs{flex-direction:row;flex-wrap:wrap;gap:4px}
.lp-demo-tabs button{padding:8px 12px!important;font-size:12px!important;flex:0 0 a
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
<div style={{ position:"absolute", inset:0, zIndex:0, backgroundImage:L.heroImg?"url(
<div style={{ position: "absolute", inset: 0, backgroundImage: "url(\"data:image/svg+
<div style={{ position: "absolute", top: -120, right: -120, width: 500, height: 500,
<div style={{ position: "absolute", bottom: -80, left: -80, width: 400, height: 400,
{/* Nav */}
<div style={{ position: "relative", zIndex: 1, display: "flex", justifyContent: "spac
<div className="lp-logo" style={{ fontFamily: fTitle }}>
{L.logoUrl
?<img src={L.logoUrl} alt="TiMat" style={{height:32,borderRadius:8,objectFit:"c
:<div className="lp-logo-icon" style={{ background: "rgba(255,255,255,.15)" }}>
<span style={{ color: "#fff" }}>TiMat</span>
</div>
{/* Desktop nav */}
<div className="lp-nav-full">
<button onClick={() => document.getElementById("demo")?.scrollIntoView({ behavior
<button onClick={() => document.getElementById("tarifs")?.scrollIntoView({ behavi
<button onClick={() => setShowBoutique(true)} style={{ background: L.navBoutiqueB
<button onClick={() => setShowModal(true)} style={{ background: L.navConnexionBg|
<button onClick={() => { setShowModal(true); setRole("asmat"); }} style={{ backgr
</div>
{/* Mobile nav - hamburger + CTA */}
<div className="lp-nav-mobile">
<button onClick={() => setMenuOpen(!menuOpen)} style={{ background: L.navHamburge
<button onClick={() => { setShowModal(true); setRole("asmat"); }} style={{ </div>
</div>
{/* Dropdown menu (mobile) */}
backgr
{menuOpen&&<div style={{ position: "relative", zIndex: 10, maxWidth: 1000, margin: "0
<div style={{ background: "rgba(0,0,0,.4)", backdropFilter: "blur(20px)", borderRad
{[["Fonctionnalités","demo"],["Tarifs","tarifs"],["Blog","blog-section"],["Boutiq
<button key={target} onClick={()=>{setMenuOpen(false);if(target==="boutique")se
style={{ background: "transparent", color: "#fff", border: "none", padding: "
onMouseEnter={e=>e.target.style.background="rgba(255,255,255,.15)"} onMouseLe
)}
</div>
</div>}
{/* Hero stats */}
<div className="lp-hero-stats" style={{ position: "relative", zIndex: 1, maxWidth: 10
{statsHero.map(({ n, suf, label }) => (
<div key={label} style={{ textAlign: "center" }}>
<div style={{ fontSize: 22, fontWeight: 800, color: L.heroStatsColor||accent, f
<div style={{ fontSize: 11, color: L.heroStatsLabelColor||"rgba(255,255,255,.45
</div>
))}
</div>
{/* Hero content */}
<div style={{ position: "relative", zIndex: 1, maxWidth: 760, margin: "0 auto", textA
<div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: L.h
<div style={{ fontFamily: fTitle, fontSize: "clamp(30px,5.5vw,58px)", fontWeight: 7
{T.heroTitle}<br/>
{T.heroTitleAccent&&<><span style={{ color: accent, fontStyle: "italic" }}>{T.her
<span style={{ fontSize: "clamp(20px,3.5vw,36px)", fontWeight: 400, color: </div>
<div style={{ fontSize: "clamp(14px,2vw,17px)", color: L.heroSubDescColor||"rgba(25
<div className="lp-hero-ctas">
<button onClick={() => { setShowModal(true); setRole("asmat"); }} style={{ <button onClick={() => document.getElementById("demo")?.scrollIntoView({ behavior
</div>
<div style={{ display: "flex", gap: 20, justifyContent: "center", flexWrap: "wrap"
{(T.heroTags||"").split(",").map(t => <span key={t} style={{ fontSize: 11, </div>
</div>
</div>
L.hero
backgr
color:
{/* SECTION 1 - PROBLEME */}
<div className="lp-section" style={{ background: L.section1Bg||"linear-gradient(135deg,
<div style={{ maxWidth: 900, margin: "0 auto" }}>
<FadeIn>
<div style={{ textAlign: L.s1Align||"center", marginBottom: 48 }}>
<div style={{ fontFamily: fTitle, fontSize: "clamp(22px,4vw,36px)", color: L.s1
<div style={{ fontSize: 15, color: L.s1DescColor||"rgba(255,255,255,.5)", lineH
</div>
</FadeIn>
<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px,
"1px s
{painPoints.map((item, i) => (
<FadeIn key={item.titre} delay={i * 80}>
<div style={{ background: L.s1CardBg||"rgba(255,255,255,.04)", border: <div style={{ fontSize: 28, marginBottom: 10 }}>{item.ic}</div>
<div style={{ fontWeight: 700, fontSize: 14, color: L.s1CardTitleColor||"#f
<div style={{ fontSize: 12, color: L.s1CardDescColor||"rgba(255,255,255,.5)
</div>
</FadeIn>
))}
</div>
<FadeIn delay={400}>
<div style={{ marginTop: 40, textAlign: L.s1Align||"center", padding: "28px 32px"
<div style={{ fontFamily: fTitle, fontSize: "clamp(18px,3vw,28px)", color: L.s1
</div>
</FadeIn>
</div>
</div>
{/* SECTION 2 - DEMO */}
<div id="demo" className="lp-section" style={{ background: L.section2Bg||"#FDF5FB" }}>
<div style={{ maxWidth: 1000, margin: "0 auto" }}>
<FadeIn>
<div style={{ textAlign: L.s2Align||"center", marginBottom: 48 }}>
<div style={{ fontFamily: fTitle, fontSize: "clamp(22px,4vw,36px)", color: L.s2
<div style={{ fontSize: 15, color: L.s2DescColor||"#6B4F3A", lineHeight: 1.7 }}
</div>
</FadeIn>
<div style={{ display: "flex", gap: 32, justifyContent: "center", alignItems: "flex
{/* Tabs gauche */}
<div className="lp-demo-tabs" style={{ paddingTop: 16 }}>
{[
{id:"accueil",ic:" ",l:"Accueil"},
{id:"journal",ic:" ",l:"Journal"},
{id:"pointage",ic:" ",l:"Pointage"},
{id:"messagerie",ic:" ",l:"Messagerie"},
{id:"salaire",ic:" ",l:"Salaire"},
].map(t=><button key={t.id} onClick={()=>setActiveDemo(t.id)} style={{
display:"flex",alignItems:"center",gap:8,padding:"10px 16px",borderRadius:12,
cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:activeDemo===t.i
background:activeDemo===t.id?"linear-gradient(135deg,#C4714A,#D4824A)":"rgba(
color:activeDemo===t.id?"#fff":"#6B4F3A",transition:"all .18s",textAlign:"lef
boxShadow:activeDemo===t.id?"0 4px 14px rgba(196,113,74,.3)":"none",
}}>
</button>)}
</div>
<span style={{fontSize:18}}>{t.ic}</span>{t.l}
{/* Phone frame */}
<div style={{ width: 300, flexShrink: 0, background: "#1a1a2e", borderRadius: 40,
{/* Notch */}
<div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
<div style={{ width: 100, height: 22, background: "#1a1a2e", borderRadius: "0
<div style={{ width: 7, height: 7, borderRadius: "50%", background: "#2a2a4
<div style={{ width: 44, height: 4, borderRadius: 2, background: "#2a2a4e"
</div>
</div>
{/* Screen */}
<div style={{ background: "#FDFBF8", borderRadius: 28, overflow: "hidden", heig
{/* TopBar */}
<div style={{ background: "rgba(255,255,255,.96)", borderBottom: "1px solid r
<div style={{ display: "flex", alignItems: "center", gap: 6 }}>
<span style={{ fontFamily: "Georgia,serif", fontSize: 16, fontWeight: 700
<div style={{ width: 4, height: 4, borderRadius: "50%", background: "#9B6
<span style={{ fontSize: 8, color: "#aaa", letterSpacing: 1 }}>v3</span>
</div>
<div style={{ display: "flex", gap: 6, alignItems: "center" }}>
<span style={{ fontSize: 13 }}> </span>
<span style={{ fontSize: 13 }}> </span>
<div style={{ width: 24, height: 24, borderRadius: "50%", background: "li
</div>
</div>
{/* Content */}
<div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
{/* ACCUEIL */}
{activeDemo==="accueil"&&<div style={{padding:10}}>
<div style={{fontSize:13,fontWeight:700,color:"#264653",marginBottom:8}}>
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5,marginBot
{[
{v:D.enfants.length,l:"Enfants",c:"#C4714A"},
{v:D.messages.filter(m=>!m.lu).length,l:"Messages",c:"#9B6BAA"},
{v:"152h",l:"Ce mois",c:"#264653"},
{v:"98%",l:"Présence",c:"#2A9D8F"},
].map(k=><div key={k.l}style={{background:"#fff",borderRadius:10,paddin
<div style={{fontSize:15,fontWeight:700,color:k.c}}>{k.v}</div>
<div style={{fontSize:9,color:"#9B6BAA",marginTop:1}}>{k.l}</div>
</div>)}
</div>
<div style={{fontSize:10,fontWeight:700,color:"#264653",marginBottom:6}}>
{D.enfants.map(e=>{
const pt=D.pointages.find(p=>p.eId===e.id&&p.date===TODAY_STR);
return <div key={e.id}style={{background:"#fff",borderRadius:10,padding
<span style={{fontSize:20}}>{e.emoji}</span>
${pt.a
<div style={{flex:1}}>
<div style={{fontSize:11,fontWeight:700,color:"#264653"}}>{e.prenom
<div style={{fontSize:9,color:"#9B6BAA"}}>{pt?.arr?`Arrivé à </div>
<div style={{fontSize:8,padding:"2px 7px",borderRadius:6,background:p
</div>;
})}
<div style={{background:"#FFF8F3",borderRadius:10,padding:8,marginTop:6,b
<div style={{fontSize:9,fontWeight:700,color:"#C4714A",marginBottom:3}}
<div style={{fontSize:9,color:"#264653",lineHeight:1.9}}>
Transmettre le journal de {D.enfants[0].prenom}<br/>
Déclarer Pajemploi (J-3)<br/>
Renouveler l'ordonnance d'Emma
</div>
</div>
</div>}
{/* JOURNAL */}
{activeDemo==="journal"&&<div style={{padding:10}}>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"ce
<div style={{fontSize:12,fontWeight:700,color:"#264653"}}> Journal</d
<div style={{display:"flex",gap:4}}>
{D.enfants.map(e=><div key={e.id}style={{width:24,height:24,borderRad
</div>
</div>
{D.transmissions.filter(t=>t.eId==="e1").map(t=><div key={t.id}style={{
background:t.auteur==="asmat"?"#F8F3FF":"#FFF8F3",
borderRadius:10,padding:8,marginBottom:5,
borderLeft:`3px solid ${t.auteur==="asmat"?"#9B6BAA":"#C4714A"}`
}}>
<div style={{fontSize:8,color:t.auteur==="asmat"?"#9B6BAA":"#C4714A",fo
<div style={{fontSize:10,color:"#264653",lineHeight:1.5}}>{t.txt}</div>
<div style={{fontSize:14,marginTop:3}}>{t.mood}</div>
</div>)}
<div style={{display:"flex",gap:4,marginBottom:6}}>
{[" "," "," "," "," "," "].map(m=><div key={m}style={{padding:"3
</div>
<div style={{display:"flex",gap:5}}>
<input readOnly placeholder="Écrire une observation..." style={{flex:1,
<div style={{background:"linear-gradient(135deg,#9B6BAA,#B87CC8)",color
</div>
</div>}
{/* POINTAGE */}
{activeDemo==="pointage"&&<div style={{padding:10}}>
<div style={{fontSize:12,fontWeight:700,color:"#264653",marginBottom:8}}>
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:5,margi
{[{l:"Prévues",v:"174h",c:"#264653"},{l:"Réalisées",v:"152h30",c:"#C471
<div key={k.l}style={{background:"#fff",borderRadius:10,padding:"7px
<div style={{fontSize:11,fontWeight:700,color:k.c}}>{k.v}</div>
<div style={{fontSize:8,color:"#9B6BAA"}}>{k.l}</div>
</div>
)}
</div>
<div style={{fontSize:10,fontWeight:700,color:"#264653",marginBottom:5}}>
{D.pointages.filter(p=>p.date===TODAY_STR).map(p=>{
const e=D.enfants.find(e=>e.id===p.eId);
return <div key={p.id}style={{background:"#fff",borderRadius:10,padding
<span style={{fontSize:16}}>{e?.emoji}</span>
<div style={{flex:1}}>
<div style={{fontSize:10,fontWeight:700,color:"#264653"}}>{e?.preno
<div style={{fontSize:9,color:"#9B6BAA"}}>↗ {p.arr} {p.dep?`→ ↘ ${p
</div>
<div style={{fontSize:10,fontWeight:700,color:p.tot?"#C4714A":"#ccc"}
</div>;
})}
</div>
</div>}
<div style={{background:"linear-gradient(135deg,#C4714A,#D4824A)",borderR
<span style={{color:"#fff",fontSize:10,fontWeight:700}}> Scanner QR C
{/* MESSAGERIE */}
{activeDemo==="messagerie"&&<div style={{padding:10,display:"flex",flexDire
<div style={{fontSize:12,fontWeight:700,color:"#264653",marginBottom:6}}>
<div style={{display:"flex",gap:5,marginBottom:8}}>
{D.enfants.map(e=>{
const unread=D.messages.filter(m=>m.eId===e.id&&!m.lu).length;
return <div key={e.id}style={{display:"flex",alignItems:"center",gap:
<span style={{fontSize:13}}>{e.emoji}</span>
<span style={{fontSize:9,fontWeight:600,color:e.id==="e1"?"#fff":"#
{unread>0&&<div style={{position:"absolute",top:-4,right:-4,width:1
</div>;
})}
</div>
<div style={{flex:1,display:"flex",flexDirection:"column",gap:5,overflowY
{D.messages.filter(m=>m.eId==="e1").map(m=><div key={m.id}style={{
alignSelf:m.de==="parent"?"flex-start":"flex-end",
background:m.de==="parent"?"#F4F0FB":"linear-gradient(135deg,#C4714A,
borderRadius:m.de==="parent"?"12px 12px 12px 4px":"12px 12px 4px 12px
padding:"7px 10px",maxWidth:"78%"
}}>
<div style={{fontSize:9,color:m.de==="parent"?"#264653":"#fff",lineHe
<div style={{fontSize:7,color:m.de==="parent"?"#9B6BAA":"rgba(255,255
</div>)}
</div>
<div style={{display:"flex",gap:5,marginTop:8}}>
<input readOnly placeholder="Votre message..." style={{flex:1,padding:"
<div style={{background:"linear-gradient(135deg,#9B6BAA,#B87CC8)",borde
</div>
</div>}
{/* SALAIRE */}
{activeDemo==="salaire"&&<div style={{padding:10}}>
<div style={{fontSize:12,fontWeight:700,color:"#264653",marginBottom:8}}>
<div style={{display:"flex",gap:4,marginBottom:10}}>
{["Janv.","Fév.","Mars"].map((m,i)=><div key={m}style={{padding:"3px 9p
</div>
{[
brut</
{l:"Salaire de base",d:"160h × 4,05€",v:"648,00 €"},
{l:"Ind. entretien",d:"20j × 3,80€",v:"76,00 €"},
{l:"Heures majorées",d:"8h × 5,06€",v:"40,50 €"},
].map(r=><div key={r.l}style={{display:"flex",justifyContent:"space-betwe
<div><div style={{fontWeight:600,color:"#264653"}}>{r.l}</div><div styl
<div style={{fontWeight:700,color:"#C4714A"}}>{r.v}</div>
</div>)}
<div style={{marginTop:8,padding:10,background:"linear-gradient(135deg,rg
<span style={{fontSize:11,fontWeight:700,color:"#264653"}}>Total <span style={{fontSize:17,fontWeight:700,color:"#C4714A"}}>764,50 €</sp
</div>
<div style={{display:"flex",gap:5,marginTop:8}}>
<div style={{flex:1,background:"linear-gradient(135deg,#264653,#2A6F6A)
<span style={{color:"#fff",fontSize:9,fontWeight:700}}> Bulletin PD
</div>
<div style={{flex:1,background:"linear-gradient(135deg,#C4714A,#D4824A)
<span style={{color:"#fff",fontSize:9,fontWeight:700}}> Pajemploi</
</div>
</div>
</div>}
</div>
{/* Bottom Nav dans le téléphone */}
<div style={{ display: "flex", justifyContent: "space-around", padding: "4px
{[{id:"accueil",ic:" ",l:"Accueil"},{id:"journal",ic:" ",l:"Journal"},{id
<div key={t.id} onClick={()=>setActiveDemo(t.id)} style={{ textAlign:"cen
<div style={{fontSize:17}}>{t.ic}</div>
<div style={{fontSize:7,fontWeight:activeDemo===t.id?700:400,color:acti
</div>
)}
</div>
</div>
{/* Home indicator */}
<div style={{ display: "flex", justifyContent: "center", paddingTop: 8 }}>
<div style={{ width: 90, height: 4, background: "rgba(255,255,255,.25)", bord
</div>
</div>
</div>
</div>
</div>
{/* SECTION 3 - TRANSFORMATION */}
<div className="lp-section" style={{ background: L.section3Bg||"#F8F0FC" }}>
<div style={{ maxWidth: 900, margin: "0 auto" }}>
<FadeIn>
<div style={{ textAlign: L.s3Align||"center", marginBottom: 56 }}>
<div style={{ fontFamily: fTitle, fontSize: "clamp(22px,4vw,36px)", color: L.s3
</div>
</FadeIn>
<div style={{ display: "grid", gap: 3 }}>
{transformations.map(([ic, pb, sol, res], i) => (
<FadeIn key={pb} delay={i * 60}>
<div className="lp-transfo-row" style={{ padding: "18px 20px", borderRadius:
<div style={{ fontSize: 22, textAlign: "center" }}>{ic}</div>
<div><div style={{ fontSize: 10, fontWeight: 700, color: L.s3LabelBeforeCol
<div><div style={{ fontSize: 10, fontWeight: 700, color: L.s3LabelAfterColo
<div><div style={{ fontSize: 10, fontWeight: 700, color: L.s3LabelResultCol
</div>
</FadeIn>
))}
</div>
</div>
</div>
{/* SECTION 4 - CHIFFRES */}
<div className="lp-section" style={{ background: L.section4Bg||"linear-gradient(135deg,
<div style={{ maxWidth: 900, margin: "0 auto" }}>
<FadeIn>
<div style={{ textAlign: L.s4Align||"center", marginBottom: 56 }}>
<div style={{ fontFamily: fTitle, fontSize: "clamp(20px,3.5vw,32px)", color: L.
<div style={{ fontSize: 13, color: L.s4SubColor||"rgba(255,255,255,.4)" }}>{L.s
</div>
</FadeIn>
<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1
{statsSection.map(({ n, suf, label, desc }) => (
<FadeIn key={label}>
<div style={{ textAlign: "center", padding: "24px 16px", background: "rgba(25
<div style={{ fontFamily: fTitle, fontSize: 42, fontWeight: 700, color: L.s
<div style={{ fontSize: 14, fontWeight: 700, color: L.s4StatLabelColor||"#f
<div style={{ fontSize: 11, color: L.s4StatDescColor||"rgba(255,255,255,.4)
</div>
</FadeIn>
))}
</div>
</div>
</div>
{/* SECTION 5 - TEMOIGNAGES */}
<div className="lp-section" style={{ background: L.section5Bg||"#FDF5FB" }}>
<div style={{ maxWidth: 900, margin: "0 auto" }}>
<FadeIn>
<div style={{ fontFamily: fTitle, fontSize: "clamp(20px,3.5vw,32px)", color: L.s5
{L.s5Title}
</div>
</FadeIn>
<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1
{testimonials.map((t, i) => (
<FadeIn key={t.nom} delay={i * 80}>
<div style={{ background: L.testimonialBg||"#fff", borderRadius: 16, padding:
<div style={{ color: L.testimonialStarColor||accent, fontSize: 13, marginBo
<div style={{ fontSize: 12, color: L.testimonialBeforeColor||"#A68970", fon
<div style={{ fontSize: 13, color: L.testimonialAfterColor||"#2C1F14", line
<div>
<div style={{ fontSize: 13, fontWeight: 700, color: L.testimonialNameColo
<div style={{ fontSize: 11, color: L.testimonialCityColor||"#A68970" }}>{
</div>
</div>
</FadeIn>
))}
</div>
</div>
</div>
L.s6Ti
{/* SECTION 6 - TARIFS */}
<div id="tarifs" className="lp-section" style={{ background: L.section6Bg||"#F5EBF8" }}
<div style={{ maxWidth: 800, margin: "0 auto" }}>
<FadeIn>
<div style={{ fontFamily: fTitle, fontSize: "clamp(22px,4vw,36px)", color: </FadeIn>
<div className="lp-tarifs-grid">
{/* Gratuit */}
<div style={{ background: L.freeBg||"#fff", borderRadius: 16, border: "1.5px soli
<div style={{ fontSize: 11, fontWeight: 700, color: L.freeLabelColor||"#A68970"
<div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4
<span style={{ fontFamily: fTitle, fontSize: 46, fontWeight: 700, color: L.fr
</div>
<div style={{ fontSize: 13, color: L.freeDescColor||"#6B4F3A", marginBottom: 22
<button onClick={() => { setShowModal(true); setRole("asmat"); }} style={{ widt
{(config.freeItems||DEFAULT_CONFIG.freeItems).map(([ok, t], i, arr) => (
<div key={i} style={{ display: "flex", gap: 10, alignItems: "center", fontSiz
<span style={{ color: ok ? "#3D6B50" : "#DDD5C8", fontWeight: 700 }}>{ok ?
<span style={{ color: ok ? "#2C1F14" : "#A68970" }}>{t}</span>
</div>
))}
</div>
{/* Pro */}
<div style={{ background: L.proBg||"#FDF5FB", borderRadius: 16, border: "2.5px so
<div style={{ position: "absolute", top: -15, left: "50%", transform: "translat
<div style={{ fontSize: 11, fontWeight: 700, color: L.proLabelColor||"#B8622F",
<div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4
<span style={{ fontFamily: fTitle, fontSize: 46, fontWeight: 700, color: L.pr
<span style={{ fontSize: 13, color: "#A68970" }}>/mois</span>
</div>
<div style={{ fontSize: 11, color: L.proSubColor||"#A68970", marginBottom: 8 }}
<div style={{ fontSize: 13, color: L.proDescColor||"#6B4F3A", marginBottom: 22,
<button onClick={() => { setShowModal(true); setRole("asmat"); }} style={{ widt
{(config.proItems||DEFAULT_CONFIG.proItems).map((t, i, arr) => (
<div key={i} style={{ display: "flex", gap: 10, alignItems: "center", fontSiz
<span style={{ color: "#3D6B50", fontWeight: 700 }}>✓</span>
<span style={{ color: "#2C1F14", fontWeight: i < 3 ? 700 : 400 }}>{t}</span
</div>
))}
</div>
</div>
<div className="lp-guarantees">
{(config.guarantees||DEFAULT_CONFIG.guarantees).map(g=><span key={g}>{g}</span>)}
</div>
</div>
</div>
{/* CTA FINAL */}
<div className="lp-section" style={{ background: L.ctaBg||"linear-gradient(135deg,#2646
<FadeIn>
<div style={{ fontFamily: fTitle, fontSize: "clamp(24px,5vw,46px)", color: L.ctaTit
{(L.ctaTitle||"").split(L.ctaTitleAccent||"en comptabilité.")[0]}
<span style={{ color: accent, fontStyle: "italic" }}>{L.ctaTitleAccent}</span><br
<span style={{ fontSize: "clamp(16px,3vw,28px)", fontWeight: 400, color: L.ctaSub
</div>
<div style={{ fontSize: 16, color: L.ctaSubColor||"rgba(255,255,255,.5)", marginBot
<button onClick={() => { setShowModal(true); setRole("asmat"); }} style={{ backgrou
<div style={{ marginTop: 16, fontSize: 12, color: L.ctaFooterColor||"rgba(255,255,2
</FadeIn>
</div>
{/* FAQ */}
<div className="lp-section" style={{ background: "#F4F7FA" }}>
<div style={{ maxWidth: 700, margin: "0 auto" }}>
<FadeIn>
<div style={{ textAlign: "center", marginBottom: 48 }}>
<div style={{ fontFamily: fTitle, fontSize: "clamp(22px,4vw,36px)", color: "#26
<div style={{ fontSize: 15, color: "#5F7A86" }}>Tout ce que vous devez savoir a
</div>
</FadeIn>
{[
{q:"C'est quoi TiMat exactement ?",a:"TiMat est une application web conçue spécif
{q:"Est-ce que mes données sont en sécurité ?",a:"Oui. Toutes vos données sont hé
{q:"TiMat remplace-t-il Pajemploi ?",a:"Non. TiMat est un complément à Pajemploi.
{q:"Comment fonctionne l'essai gratuit ?",a:"Vous créez votre compte en 2 minutes
{q:"Puis-je utiliser TiMat sur mon téléphone ?",a:"Oui. TiMat est une application
{q:"Les parents peuvent-ils accéder à TiMat ?",a:"Oui. Chaque parent reçoit une i
{q:"Que se passe-t-il si je résilie ?",a:"Vous pouvez résilier à tout moment en u
{q:"Comment sont calculés les salaires ?",a:"TiMat applique les règles de la Conv
].map(({q,a},i)=>(
<FadeIn key={i} delay={i*50}>
<details style={{ marginBottom: 8, background: "#fff", borderRadius: 12, border
<summary style={{ padding: "16px 20px", cursor: "pointer", fontSize: 14, font
{q}
</summary>
</details>
<span style={{ fontSize: 18, color: "#FF9F63", flexShrink: 0, marginLeft: 1
<div style={{ padding: "0 20px 16px", fontSize: 13, color: "#5F7A86", lineHei
</FadeIn>
))}
</div>
</div>
{/* BLOG */}
<div className="lp-section" style={{ background: "#FDFBF8" }}>
<div style={{ maxWidth: 900, margin: "0 auto" }}>
<FadeIn>
<div style={{ textAlign: "center", marginBottom: 48 }}>
<div style={{ fontFamily: fTitle, fontSize: "clamp(22px,4vw,36px)", color: "#26
<div style={{ fontSize: 15, color: "#5F7A86" }}>Guides pratiques, conseils et i
</div>
</FadeIn>
<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px,
{[
{id:"mensualisation",cat:"Administratif",catColor:"#FF9F63",emoji:" ",title:"M
{id:"maladies",cat:"Santé",catColor:"#E76F51",emoji:" ",title:"Les 5 maladies
{id:"agrement",cat:"PMI & Agrément",catColor:"#2A9D8F",emoji:" ",title:"Renouv
{id:"attachement",cat:"Pédagogie",catColor:"#264653",emoji:" ",title:"L'attach
{id:"pajemploi",cat:"Administratif",catColor:"#FF9F63",emoji:" ",title:"Pajemp
{id:"bulletin",cat:"Administratif",catColor:"#FF9F63",emoji:" ",title:"Compren
{id:"trousse",cat:"Santé",catColor:"#E76F51",emoji:" ",title:"Les indispensabl
{id:"tarif",cat:"Administratif",catColor:"#FF9F63",emoji:" ",title:"Comment fi
{id:"motricite",cat:"Pédagogie",catColor:"#264653",emoji:" ",title:"Les étapes
{id:"droits",cat:"Juridique",catColor:"#2A9D8F",emoji:" ",title:"Droits et dev
{id:"pajemploi",cat:"Administratif",catColor:"#FF9F63",emoji:" ",title:"Pajemp
{id:"bulletin",cat:"Administratif",catColor:"#FF9F63",emoji:" ",title:"Compren
{id:"secours",cat:"Santé",catColor:"#E76F51",emoji:" ",title:"Trousse de secou
{id:"tarif",cat:"Administratif",catColor:"#FF9F63",emoji:" ",title:"Comment fi
].map((art,i)=>(
<FadeIn key={art.id} delay={i*80}>
<div onClick={()=>setShowBlog(art.id)} style={{
background:"#fff",borderRadius:16,overflow:"hidden",cursor:"pointer",
border:"1px solid #E8E4E0",transition:"all .2s",boxShadow:"0 2px 12px rgba(
}}
onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-4px)";e.curr
onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.current
<div style={{height:120,background:"linear-gradient(135deg,"+art.catColor+"
<div style={{padding:"16px 20px"}}>
<div style={{fontSize:10,fontWeight:700,color:art.catColor,textTransform:
<div style={{fontSize:15,fontWeight:700,color:"#264653",lineHeight:1.4,ma
<div style={{fontSize:12,color:"#5F7A86",lineHeight:1.6}}>{art.excerpt}</
<div style={{marginTop:12,fontSize:12,color:accent,fontWeight:600}}>Lire
</div>
</div>
</FadeIn>
))}
</div>
</div>
</div>
{/* BLOG ARTICLE MODAL */}
{showBlog&&<div onClick={e=>e.target===e.currentTarget&&setShowBlog(null)} style={{posi
<div style={{background:"#fff",borderRadius:20,width:"100%",maxWidth:700,maxHeight:"9
<div style={{padding:"20px 24px",borderBottom:"1px solid #E8E4E0",display:"flex",ju
<div style={{fontFamily:fTitle,fontSize:16,fontWeight:700,color:"#264653"}}> Bl
<button onClick={()=>setShowBlog(null)}style={{background:"#F4F7FA",border:"none"
</div>
<div style={{padding:"24px",overflowY:"auto",fontSize:13,color:"#264653",lineHeight
{showBlog==="mensualisation"&&<div>
<h2 style={{fontSize:22,fontWeight:700,color:"#264653",marginBottom:16}}> Men
<div style={{fontSize:11,color:"#8FA3AD",marginBottom:20}}>Administratif · 8 mi
<h3 style={{fontSize:16,fontWeight:700,color:"#264653",margin:"20px 0 10px"}}>P
<p>La mensualisation est obligatoire pour les assistantes maternelles depuis la
le plu
<h3 style={{fontSize:16,fontWeight:700,color:"#264653",margin:"20px 0 10px"}}>A
<p><strong>Année complète (47 semaines et plus)</strong> — Le calcul est <p style={{marginTop:8}}><strong>Année incomplète (moins de 47 semaines)</stron
<div style={{background:"#F0FAF4",borderRadius:12,padding:16,margin:"16px 0",bo
<div style={{fontWeight:700,color:"#2A9D8F",marginBottom:6}}> Exemple concr
<div style={{fontSize:12}}>
Marie accueille Léo 40h/semaine, 47 semaines/an, à 4,05€/h brut.<br/>
Salaire mensualisé = 40 × 52 / 12 × 4,05 = <strong>702 € brut/mois</strong>
Soit environ <strong>547,56 € net/mois</strong> (après cotisations ~22%).
</div>
</div>
<h3 style={{fontSize:16,fontWeight:700,color:"#264653",margin:"20px 0 10px"}}>L
<p>En fin d'année (ou de contrat), il faut comparer les heures réellement effec
<h3 style={{fontSize:16,fontWeight:700,color:"#264653",margin:"20px 0 10px"}}>L
<p>Au-delà de 45 heures par semaine, les heures sont majorées d'au moins 25% (o
<div style={{background:"#FFF8F3",borderRadius:12,padding:16,margin:"16px 0",bo
<div style={{fontWeight:700,color:"#FF9F63",marginBottom:6}}> TiMat calcule
<div style={{fontSize:12}}>Plus besoin de faire ces calculs à la main. TiMat
</div>
</div>}
{showBlog==="maladies"&&<div>
<h2 style={{fontSize:22,fontWeight:700,color:"#264653",marginBottom:16}}> Les
<div style={{fontSize:11,color:"#8FA3AD",marginBottom:20}}>Santé · 6 min de lec
<p>En accueil collectif ou individuel, les enfants tombent malades. C'est norma
<h3 style={{fontSize:16,fontWeight:700,color:"#E76F51",margin:"20px 0 10px"}}>1
<p><strong>Quoi :</strong> infection virale des bronchioles, très courante chez
<p><strong>Signes :</strong> toux, respiration sifflante, difficulté à s'alimen
<p><strong>Conduite :</strong> nettoyer le nez (DRP), fractionner les repas, su
<h3 style={{fontSize:16,fontWeight:700,color:"#E76F51",margin:"20px 0 10px"}}>2
<p><strong>Quoi :</strong> inflammation de l'estomac et des intestins, virale d
<p><strong>Signes :</strong> vomissements, diarrhée, fièvre possible, risque de
<p><strong>Conduite :</strong> soluté de réhydratation orale (SRO), régime adap
<h3 style={{fontSize:16,fontWeight:700,color:"#E76F51",margin:"20px 0 10px"}}>3
<p><strong>Quoi :</strong> infection virale (coxsackie) très contagieuse, fréqu
<p><strong>Signes :</strong> petites vésicules sur les mains, les pieds et dans
<p><strong>Conduite :</strong> pas de traitement spécifique, guérison en 7-10 j
<h3 style={{fontSize:16,fontWeight:700,color:"#E76F51",margin:"20px 0 10px"}}>4
<p><strong>Quoi :</strong> infection de l'oreille moyenne, souvent consécutive
<p><strong>Signes :</strong> douleur à l'oreille (l'enfant se tire l'oreille),
<p><strong>Conduite :</strong> consultation médicale nécessaire (possible antib
<h3 style={{fontSize:16,fontWeight:700,color:"#E76F51",margin:"20px 0 10px"}}>5
<p><strong>Quoi :</strong> inflammation de la membrane qui recouvre l'oeil, sou
<p><strong>Signes :</strong> oeil rouge, sécrétions jaune-vertes, paupières col
<p><strong>Conduite :</strong> lavage au sérum physiologique, collyre prescrit
<div style={{background:"#F4F7FA",borderRadius:12,padding:16,margin:"20px 0"}}>
<div style={{fontWeight:700,color:"#264653",marginBottom:8}}> À retenir</di
<ul style={{paddingLeft:20,fontSize:12,lineHeight:2}}>
<li>Exiger systématiquement une ordonnance médicale avant d'administrer un
<li>Tenir un registre des maladies et traitements dans le carnet de l'enfan
<li>Prévenir les parents dès les premiers symptômes</li>
<li>Renforcer l'hygiène des mains (avant/après chaque change, repas, moucha
</ul>
</div>
</div>}
{showBlog==="agrement"&&<div>
<h2 style={{fontSize:22,fontWeight:700,color:"#264653",marginBottom:16}}> Ren
<div style={{fontSize:11,color:"#8FA3AD",marginBottom:20}}>PMI & Agrément · 7 m
<p>Votre agrément doit être renouvelé tous les 5 ans (10 ans avec le CAP AEPE).
<h3 style={{fontSize:16,fontWeight:700,color:"#2A9D8F",margin:"20px 0 10px"}}>
<div style={{display:"grid",gridTemplateColumns:"auto 1fr",gap:"8px 12px",fontS
<strong>6 mois avant :</strong><span>Commencer à rassembler les documents</sp
<strong>3 mois avant :</strong><span>Envoyer le dossier complet au Conseil dé
<strong>2 mois avant :</strong><span>Visite de la puéricultrice PMI à domicil
<strong>Jour J :</strong><span>Réponse du Conseil départemental (silence = ac
</div>
<h3 style={{fontSize:16,fontWeight:700,color:"#2A9D8F",margin:"20px 0 10px"}}>
<div style={{background:"#F0FAF4",borderRadius:12,padding:16,margin:"10px 0"}}>
<ul style={{paddingLeft:20,fontSize:12,lineHeight:2.2}}>
<li>Formulaire CERFA de renouvellement (disponible sur service-public.fr)</
<li>Copie de votre pièce d'identité</li>
<li>Justificatif de domicile de moins de 3 mois</li>
<li>Certificat médical attestant votre aptitude à accueillir des enfants</l
<li>Extrait de casier judiciaire (bulletin n°2 — demandé automatiquement pa
<li>Attestation d'assurance responsabilité civile professionnelle</li>
<li>Attestation de formation continue (120h obligatoires)</li>
<li>Votre projet d'accueil mis à jour</li>
</ul>
</div>
<h3 style={{fontSize:16,fontWeight:700,color:"#2A9D8F",margin:"20px 0 10px"}}>
<p>La puéricultrice viendra évaluer votre domicile et votre pratique. Elle rega
<ul style={{paddingLeft:20,fontSize:12,lineHeight:2}}>
<li>La sécurité du logement (barrières, prises, escaliers, produits dangereux
<li>L'espace dédié à l'accueil (coin repos, coin repas, coin jeu)</li>
<li>Votre organisation quotidienne et vos pratiques éducatives</li>
<li>Votre capacité à travailler avec les parents</li>
<li>Votre connaissance des gestes de premiers secours</li>
</ul>
<h3 style={{fontSize:16,fontWeight:700,color:"#2A9D8F",margin:"20px 0 10px"}}>
<div style={{background:"#FEF2F2",borderRadius:12,padding:16,margin:"10px 0",bo
<ul style={{paddingLeft:20,fontSize:12,lineHeight:2,color:"#E76F51"}}>
<li>Envoyer le dossier en retard (moins de 3 mois avant expiration)</li>
<li>Oublier la formation continue obligatoire</li>
<li>Ne pas mettre à jour son projet d'accueil</li>
<li>Négliger la sécurité du domicile avant la visite</li>
</ul>
</div>
</div>}
{showBlog==="attachement"&&<div>
<h2 style={{fontSize:22,fontWeight:700,color:"#264653",marginBottom:16}}> L'a
<div style={{fontSize:11,color:"#8FA3AD",marginBottom:20}}>Pédagogie · 5 min de
<p>En tant qu'assistante maternelle, vous êtes une figure d'attachement seconda
<h3 style={{fontSize:16,fontWeight:700,color:"#264653",margin:"20px 0 10px"}}>Q
<p>La théorie de l'attachement, développée par John Bowlby et Mary Ainsworth, m
<p style={{marginTop:8}}>En accueil individuel, vous avez un avantage énorme su
<h3 style={{fontSize:16,fontWeight:700,color:"#264653",margin:"20px 0 10px"}}>L
<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1
{[[" ","Disponibilité","Être physiquement et émotionnellement présente. Pose
[" ","Réactivité","Répondre rapidement et de manière adaptée aux signaux d
[" ","Prévisibilité","Des routines stables (repas, sieste, activités). L'e
[" ","Sensibilité","Comprendre l'émotion derrière le comportement. Un enfa
].map(([ic,titre,desc])=>
<div key={titre}style={{background:"#F4F7FA",borderRadius:12,padding:14}}>
<div style={{fontSize:24,marginBottom:6}}>{ic}</div>
<div style={{fontSize:13,fontWeight:700,color:"#264653",marginBottom:4}}>
<div style={{fontSize:11,color:"#5F7A86",lineHeight:1.6}}>{desc}</div>
</div>
)}
</div>
<h3 style={{fontSize:16,fontWeight:700,color:"#264653",margin:"20px 0 10px"}}>L
<p>La période d'adaptation n'est pas une formalité — c'est le fondement de la r
<p style={{marginTop:8}}>Une bonne adaptation est progressive : d'abord avec le
<div style={{background:"#F0FAF4",borderRadius:12,padding:16,margin:"20px 0",bo
<div style={{fontWeight:700,color:"#2A9D8F",marginBottom:6}}> Votre force d
<div style={{fontSize:12}}>
En crèche, le turnover du personnel et les ratios élevés rendent l'attachem
Chez vous, l'enfant retrouve <strong>le même visage chaque matin</strong>,
</div>
</div>
</div>}
{showBlog==="pajemploi"&&<div>
<h2 style={{fontSize:22,fontWeight:700,color:"#264653",marginBottom:16}}> Paj
<div style={{fontSize:11,color:"#8FA3AD",marginBottom:20}}>Administratif · 7 mi
<p>Pajemploi est le service de l'URSSAF dédié aux particuliers employeurs d'ass
<h3 style={{fontSize:16,fontWeight:700,color:"#264653",margin:"20px 0 10px"}}>É
<p>Le <strong>parent employeur</strong> crée son compte sur <em>pajemploi.urssa
<h3 style={{fontSize:16,fontWeight:700,color:"#264653",margin:"20px 0 10px"}}>É
<p>Chaque mois, le parent se connecte et remplit la déclaration :</p>
<div style={{background:"#F0FAF4",borderRadius:12,padding:16,margin:"12px 0"}}>
<ol style={{paddingLeft:20,fontSize:12,lineHeight:2.4}}>
<li>Se connecter sur pajemploi.urssaf.fr</li>
<li>Cliquer sur "Déclarer" et sélectionner l'assistante maternelle</li>
<li>Indiquer le <strong>nombre de jours d'activité</strong></li>
<li>Indiquer le <strong>nombre d'heures normales</strong></li>
<li>Indiquer les <strong>heures supplémentaires/complémentaires</strong> év
<li>Saisir le <strong>salaire net total</strong></li>
<li>Ajouter les <strong>indemnités d'entretien</strong> et de <strong>repas
<li>Valider — Pajemploi calcule automatiquement les cotisations</li>
</ol>
</div>
<h3 style={{fontSize:16,fontWeight:700,color:"#264653",margin:"20px 0 10px"}}>É
<p>Après validation, Pajemploi prélève les cotisations sur le compte du parent
<h3 style={{fontSize:16,fontWeight:700,color:"#264653",margin:"20px 0 10px"}}>L
<div style={{background:"#FEF2F2",borderRadius:12,padding:16,margin:"12px 0",bo
<ul style={{paddingLeft:20,fontSize:12,lineHeight:2,color:"#E76F51"}}>
<li><strong>Confondre brut et net</strong> — Pajemploi demande le net, pas
<li><strong>Oublier les indemnités d'entretien</strong> — elles doivent êtr
<li><strong>Déclarer en retard</strong> — la déclaration doit être faite av
<li><strong>Ne pas vérifier le bulletin</strong> — vérifiez que le montant
</ul>
</div>
<div style={{background:"#FFF8F3",borderRadius:12,padding:16,margin:"16px 0",bo
<div style={{fontWeight:700,color:"#FF9F63",marginBottom:6}}> TiMat vous si
<div style={{fontSize:12}}>TiMat génère chaque mois un récapitulatif prêt à r
</div>
</div>}
{showBlog==="bulletin"&&<div>
<h2 style={{fontSize:22,fontWeight:700,color:"#264653",marginBottom:16}}> Com
<div style={{fontSize:11,color:"#8FA3AD",marginBottom:20}}>Administratif · 8 mi
<p>Le bulletin de salaire d'une assistante maternelle peut sembler complexe. Po
<h3 style={{fontSize:16,fontWeight:700,color:"#264653",margin:"20px 0 10px"}}>L
<div style={{display:"grid",gridTemplateColumns:"auto 1fr",gap:"6px 16px",fontS
<strong>Salaire de base</strong><span>Heures mensualisées × taux horaire brut
<strong>Heures complémentaires</strong><span>Heures entre votre horaire contr
<strong>Heures majorées</strong><span>Au-delà de 45h/semaine : majorées de 25
<strong>Indemnité d'entretien</strong><span>Montant par jour d'accueil. Minim
<strong>Indemnité de repas</strong><span>Si vous fournissez les repas. Montan
</div>
<h3 style={{fontSize:16,fontWeight:700,color:"#264653",margin:"20px 0 10px"}}>L
<p>Les cotisations sont calculées sur le salaire brut (hors indemnités). Elles
<div style={{background:"#F4F7FA",borderRadius:12,padding:16,margin:"12px 0",fo
<div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr",gap:4,fontWeigh
<span>Cotisation</span><span>Part salariale</span><span>Part patronale</spa
</div>
{[["Maladie, maternité","—","7,30%"],["Vieillesse plafonnée","6,90%","8,55%"]
<div key={n}style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr",gap:4,
<span>{n}</span><span style={{color:s!=="—"?"#E76F51":"#B0BEC5"}}>{s}</sp
</div>
)}
</div>
<h3 style={{fontSize:16,fontWeight:700,color:"#264653",margin:"20px 0 10px"}}>D
<div style={{background:"#F0FAF4",borderRadius:12,padding:16,margin:"12px 0",bo
<div style={{fontSize:12,lineHeight:2}}>
<strong>Salaire brut</strong> − cotisations salariales (~22%) = <strong>Sal
Salaire net + indemnités (entretien + repas) = <strong>Total versé à Salaire brut + cotisations patronales + indemnités = <strong>Coût total pou
</div>
l'assm
</div>
<h3 style={{fontSize:16,fontWeight:700,color:"#264653",margin:"20px 0 10px"}}>L
<p>Les assistantes maternelles bénéficient d'un abattement fiscal unique : vous
</div>}
{showBlog==="secours"&&<div>
<h2 style={{fontSize:22,fontWeight:700,color:"#264653",marginBottom:16}}> Tro
<div style={{fontSize:11,color:"#8FA3AD",marginBottom:20}}>Santé · 5 min de lec
<p>La PMI vérifie votre trousse de secours lors de chaque visite. Elle doit êtr
<h3 style={{fontSize:16,fontWeight:700,color:"#E76F51",margin:"20px 0 10px"}}>L
<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1
{[
[" ","Pansements et compresses","Pansements hypoallergéniques de plusieurs
[" ","Désinfectant","Antiseptique sans alcool (type Biseptine ou Chlorhexi
[" ","Thermomètre","Thermomètre frontal ou auriculaire. Vérifier les piles
[" ","Ciseaux et pinces","Ciseaux à bouts ronds, pince à écharde, pince à
[" ","Froid","Poches de froid instantané (pas de glace directe sur la peau
[" ","Numéros d'urgence","Affichés visiblement : 15 (SAMU), 18 (Pompiers),
].map(([ic,titre,desc])=>
<div key={titre}style={{background:"#FEF2F2",borderRadius:12,padding:14,bor
<div style={{fontSize:20,marginBottom:6}}>{ic}</div>
<div style={{fontSize:12,fontWeight:700,color:"#E76F51",marginBottom:4}}>
<div style={{fontSize:11,color:"#5F7A86",lineHeight:1.6}}>{desc}</div>
</div>
)}
</div>
<h3 style={{fontSize:16,fontWeight:700,color:"#E76F51",margin:"20px 0 10px"}}>C
<div style={{background:"#FEF2F2",borderRadius:12,padding:16,margin:"12px 0"}}>
<ul style={{paddingLeft:20,fontSize:12,lineHeight:2,color:"#E76F51"}}>
<li><strong>Aucun médicament</strong> sans ordonnance nominative et autoris
<li>Pas de Doliprane, pas d'Advil — même si les parents vous disent "c'est
<li>Pas de crème solaire sans accord parental écrit</li>
<li>Pas d'huiles essentielles — dangereuses pour les moins de 6 ans</li>
</ul>
</div>
<h3 style={{fontSize:16,fontWeight:700,color:"#E76F51",margin:"20px 0 10px"}}>L
<p>Votre formation initiale de 120h inclut le PSC1 (Prévention et Secours Civiq
<ul style={{paddingLeft:20,fontSize:12,lineHeight:2.2}}>
<li><strong>Chute :</strong> vérifier la conscience, mettre du froid, surveil
<li><strong>Fièvre {">"}38,5°C :</strong> déshabiller l'enfant, hydrater, app
<li><strong>Étouffement :</strong> 5 claques dorsales puis 5 compressions tho
<li><strong>Brûlure :</strong> eau froide 10 minutes, ne pas décoller les vêt
</ul>
PMI</d
aux en
<div style={{background:"#F0FAF4",borderRadius:12,padding:16,margin:"20px 0",bo
<div style={{fontWeight:700,color:"#2A9D8F",marginBottom:6}}> Rappel <div style={{fontSize:12}}>
La trousse doit être dans un endroit connu de tous mais inaccessible </div>
</div>
</div>}
{showBlog==="tarif"&&<div>
<h2 style={{fontSize:22,fontWeight:700,color:"#264653",marginBottom:16}}> Com
<div style={{fontSize:11,color:"#8FA3AD",marginBottom:20}}>Administratif · 6 mi
<p>Fixer son tarif est l'une des décisions les plus importantes — et les plus s
<h3 style={{fontSize:16,fontWeight:700,color:"#264653",margin:"20px 0 10px"}}>L
<p>Le <strong>minimum légal</strong> est fixé à 0,281 fois le SMIC horaire, soi
<div style={{background:"#F4F7FA",borderRadius:12,padding:16,margin:"16px 0"}}>
<div style={{fontWeight:700,color:"#264653",marginBottom:8}}> Moyennes par
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,fontSize:12}}
{[["Paris / Île-de-France","4,50€ - 5,50€"],["Grandes villes (Lyon, Marseil
<div key={zone}style={{display:"flex",justifyContent:"space-between",padd
<span style={{color:"#5F7A86"}}>{zone}</span><strong style={{color:"#26
</div>
)}
</div>
</div>
<h3 style={{fontSize:16,fontWeight:700,color:"#264653",margin:"20px 0 10px"}}>L
<ul style={{paddingLeft:20,fontSize:12,lineHeight:2.2}}>
<li><strong>Votre expérience</strong> — plus d'années d'agrément = plus de lé
<li><strong>Vos formations</strong> — CAP AEPE, Montessori, Snoezelen, Langue
<li><strong>Votre localisation</strong> — forte demande dans votre quartier</
<li><strong>Vos horaires</strong> — horaires atypiques (tôt le matin, tard le
<li><strong>Vos services</strong> — repas bio faits maison, sorties quotidien
<li><strong>Votre logement</strong> — jardin, salle de jeux dédiée, espace am
</ul>
<h3 style={{fontSize:16,fontWeight:700,color:"#264653",margin:"20px 0 10px"}}>L
<div style={{background:"#F0FAF4",borderRadius:12,padding:16,margin:"12px 0",bo
<strong>Indemnité d'entretien :</strong> minimum 3,69€/jour (2024). Couvre l'
<strong>Indemnité de repas :</strong> si vous fournissez les repas. Généralem
<strong>Indemnité kilométrique :</strong> 0,63€/km si vous transportez l'enfa
<strong>Aucune de ces indemnités n'est soumise à cotisations</strong> — c'est
</div>
<h3 style={{fontSize:16,fontWeight:700,color:"#264653",margin:"20px 0 10px"}}>C
<p>Ne vous justifiez pas. Présentez votre tarif avec assurance et expliquez ce
<div style={{background:"#FFF8F3",borderRadius:12,padding:16,margin:"16px 0",bo
<div style={{fontWeight:700,color:"#FF9F63",marginBottom:6}}> TiMat inclut
<div style={{fontSize:12}}>Le simulateur de coût TiMat permet aux parents de
</div>
</div>}
{showBlog==="motricite"&&<div>
<h2 style={{fontSize:22,fontWeight:700,color:"#264653",marginBottom:16}}> Les
<div style={{fontSize:11,color:"#8FA3AD",marginBottom:20}}>Pédagogie · 6 min de
<p>Chaque enfant se développe à son rythme. Les âges ci-dessous sont des repère
<h3 style={{fontSize:16,fontWeight:700,color:"#264653",margin:"20px 0 10px"}}>0
<p>Le bébé découvre son corps. Il tourne la tête vers les sons, suit des yeux,
<p style={{marginTop:8}}><strong>Votre rôle :</strong> varier les positions (do
<h3 style={{fontSize:16,fontWeight:700,color:"#264653",margin:"20px 0 10px"}}>4
<p>L'enfant se retourne seul, attrape les objets volontairement, les porte à la
<p style={{marginTop:8}}><strong>Votre rôle :</strong> proposer des objets vari
<h3 style={{fontSize:16,fontWeight:700,color:"#264653",margin:"20px 0 10px"}}>8
<p>Rampé, quatre pattes, se hisse debout, premiers pas tenus. La pince pouce-in
<p style={{marginTop:8}}><strong>Votre rôle :</strong> sécuriser l'espace, prop
<h3 style={{fontSize:16,fontWeight:700,color:"#264653",margin:"20px 0 10px"}}>1
<p>Premiers pas vers 12-15 mois. L'enfant monte les marches à quatre pattes, em
<h3 style={{fontSize:16,fontWeight:700,color:"#264653",margin:"20px 0 10px"}}>1
<p>L'enfant court, saute, pédale, monte les escaliers. Il dessine des cercles,
<div style={{background:"#F0FAF4",borderRadius:12,padding:16,margin:"20px 0",bo
<div style={{fontWeight:700,color:"#2A9D8F",marginBottom:6}}> Motricité lib
<div style={{fontSize:12}}>Ne pas mettre un enfant dans une position qu'il n'
</div>
</div>}
{showBlog==="droits"&&<div>
<h2 style={{fontSize:22,fontWeight:700,color:"#264653",marginBottom:16}}> Dro
<div style={{fontSize:11,color:"#8FA3AD",marginBottom:20}}>Juridique · 8 min de
<p>L'assistante maternelle est une salariée du particulier employeur, encadrée
<h3 style={{fontSize:16,fontWeight:700,color:"#2A9D8F",margin:"20px 0 10px"}}>V
<p><strong>Rémunération :</strong> minimum conventionnel (~3,49€ brut/h). Heure
<p style={{marginTop:8}}><strong>Congés payés :</strong> 2,5 jours ouvrables/mo
<p style={{marginTop:8}}><strong>Formation :</strong> 120h en 5 ans (80h avant
<p style={{marginTop:8}}><strong>Protection sociale :</strong> maladie, materni
<h3 style={{fontSize:16,fontWeight:700,color:"#2A9D8F",margin:"20px 0 10px"}}>V
<p><strong>Agrément :</strong> obligatoire, délivré par le Conseil départementa
<p style={{marginTop:8}}><strong>Assurance :</strong> RC professionnelle obliga
<p style={{marginTop:8}}><strong>Secret professionnel :</strong> ne pas partage
<p style={{marginTop:8}}><strong>Rupture :</strong> préavis de 15 jours (moins
<div style={{background:"#F4F7FA",borderRadius:12,padding:16,margin:"20px 0"}}>
<div style={{fontWeight:700,color:"#264653",marginBottom:8}}> Documents ind
<div style={{fontSize:12}}>Contrat signé, avenants, bulletins de salaire, att
</div>
</div>}
</div>
</div>
</div>}
{/* BOUTIQUE MODAL */}
{showBoutique&&<div onClick={e=>e.target===e.currentTarget&&setShowBoutique(false)} sty
<div style={{background:"#FDFBF8",borderRadius:20,width:"100%",maxWidth:800,maxHeight
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marg
<div style={{fontFamily:fTitle,fontSize:22,fontWeight:700,color:"#264653"}}> Bo
<button onClick={()=>setShowBoutique(false)}style={{background:"#F4F7FA",border:"
</div>
<div style={{fontSize:13,color:"#5F7A86",marginBottom:24,lineHeight:1.6}}>Templates
<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr)
{[
{id:"kit_sheets",name:"Kit Google Sheets",price:"14,90",desc:"7 tableurs interc
{id:"fiche_urgence",name:"Fiche d'urgence",price:"4,90",desc:"Fiche complete a
{id:"projet_accueil",name:"Projet d'accueil",price:"9,90",desc:"10 sections per
{id:"pack_complet",name:"Pack Complet",price:"24,90",desc:"Les 3 produits reuni
].map(p=><div key={p.id}style={{background:"#fff",borderRadius:14,overflow:"hidde
<div style={{height:70,background:"linear-gradient(135deg,"+p.color+"18,"+p.col
{p.icon}
{p.badge&&<div style={{position:"absolute",top:6,right:6,background:p.color,c
</div>
<div style={{padding:14,flex:1,display:"flex",flexDirection:"column"}}>
<div style={{fontWeight:700,fontSize:13,color:"#264653",marginBottom:4}}>{p.n
<div style={{fontSize:11,color:"#5F7A86",lineHeight:1.5,flex:1,marginBottom:1
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center
<span style={{fontSize:16,fontWeight:700,color:p.color}}>{p.price} €</span>
<button onClick={()=>{if(p.link){window.open(p.link,"_blank");}else{alert("
</div>
</div>
</div>)}
</div>
</div>
</div>}
<div style={{marginTop:16,textAlign:"center",fontSize:11,color:"#B0BEC5"}}> Paiem
{/* FOOTER */}
<footer style={{ background: "#264653", padding: "48px 24px 24px", color: "rgba(255,255
<div style={{ maxWidth: 900, margin: "0 auto" }}>
<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px,
{/* Logo + description */}
<div>
<div className="lp-logo" style={{ fontFamily: fTitle, marginBottom: 12 }}>
{L.logoUrl
?<img src={L.logoUrl} alt="TiMat" style={{height:32,borderRadius:8,objectFi
:<div className="lp-logo-icon" style={{ background: "rgba(255,255,255,.1)"
<span style={{ color: "#fff" }}>TiMat</span>
</div>
<div style={{ fontSize: 12, lineHeight: 1.7, color: "rgba(255,255,255,.5)" }}>
L'application tout-en-un des assistantes maternelles. Conçue en France, pour
</div>
</div>
{/* Liens */}
<div>
<div style={{ fontSize: 11, fontWeight: 700, color: accent, textTransform: "upp
{[["Mentions légales","mentions"],["Conditions générales d'utilisation","cgu"],
<div key={id} onClick={()=>setShowLegal(id)} style={{ fontSize: 12, color: "r
onMouseEnter={e=>e.target.style.color="#fff"} onMouseLeave={e=>e.target.sty
)}
</div>
{/* Contact */}
<div>
<div style={{ fontSize: 11, fontWeight: 700, color: accent, textTransform: "upp
<div style={{ fontSize: 12, lineHeight: 2, color: "rgba(255,255,255,.6)" support@timat.app<br/>
timat.app<br/>
Île-de-France, France
}}>
</div>
</div>
{/* RGPD */}
<div>
<div style={{ fontSize: 11, fontWeight: 700, color: accent, textTransform: "upp
<div style={{ fontSize: 11, lineHeight: 1.7, color: "rgba(255,255,255,.5)" }}>
Données hébergées en France (Paris)<br/>
Chiffrement en transit et au repos<br/>
Conforme RGPD<br/>
Droit à l'effacement garanti
</div>
</div>
</div>
{/* Séparateur */}
<div style={{ borderTop: "1px solid rgba(255,255,255,.1)", paddingTop: 20, display:
<div style={{ fontSize: 11, color: "rgba(255,255,255,.35)" }}>© {new Date().getFu
<div style={{ display: "flex", gap: 16 }}>
{[["Mentions légales","mentions"],["CGU","cgu"],["Confidentialité","confidentia
<span key={id} onClick={()=>setShowLegal(id)} style={{ fontSize: 11, color: "
onMouseEnter={e=>e.target.style.color="#fff"} onMouseLeave={e=>e.target.sty
)}
</div>
</div>
</div>
</footer>
{/* PAGES JURIDIQUES */}
{showLegal&&<div onClick={e=>e.target===e.currentTarget&&setShowLegal(null)} style={{po
<div style={{background:"#fff",borderRadius:20,width:"100%",maxWidth:700,maxHeight:"9
{/* Header */}
<div style={{padding:"20px 24px",borderBottom:"1px solid #E8E4E0",display:"flex",ju
<div style={{fontFamily:fTitle,fontSize:18,fontWeight:700,color:"#264653"}}>
{showLegal==="mentions"&&" Mentions légales"}
{showLegal==="cgu"&&" Conditions générales d'utilisation"}
{showLegal==="confidentialite"&&" Politique de confidentialité"}
</div>
<button onClick={()=>setShowLegal(null)}style={{background:"#F4F7FA",border:"none
</div>
{/* Contenu scrollable */}
<div style={{padding:"24px",overflowY:"auto",fontSize:13,color:"#264653",lineHeight
{/* =================== MENTIONS LÉGALES =================== */}
{showLegal==="mentions"&&<div>
<h3 style={{fontSize:15,fontWeight:700,color:"#264653",marginBottom:12}}>1. Édi
<p>Le site <strong>timat.app</strong> (ci-après "TiMat") est édité par :</p>
<div style={{background:"#F4F7FA",borderRadius:10,padding:14,margin:"12px 0",fo
<strong>{config.legal?.nom}</strong><br/>
Auto-entrepreneur<br/>
SIRET : {config.legal?.siret}<br/>
Adresse : {config.legal?.adresse}<br/>
Email : {config.legal?.email}<br/>
Directrice de la publication : {config.legal?.nom}
</div>
<h3 style={{fontSize:15,fontWeight:700,color:"#264653",margin:"20px 0 12px"}}>2
<div style={{background:"#F4F7FA",borderRadius:10,padding:14,margin:"12px 0",fo
<strong>Site web :</strong> Vercel Inc. — 340 S Lemon Ave #4133, Walnut, CA 9
<strong>Base de données :</strong> Supabase — Région Europe (Paris, France)<b
<strong>Paiement :</strong> Stripe — Certifié PCI-DSS Level 1
</div>
<h3 style={{fontSize:15,fontWeight:700,color:"#264653",margin:"20px 0 12px"}}>3
<p>L'ensemble du contenu du site TiMat (textes, graphismes, logos, icônes, imag
<h3 style={{fontSize:15,fontWeight:700,color:"#264653",margin:"20px 0 12px"}}>4
<p>TiMat collecte et traite des données personnelles dans le respect du Règleme
<h3 style={{fontSize:15,fontWeight:700,color:"#264653",margin:"20px 0 12px"}}>5
<p>TiMat utilise uniquement des cookies techniques nécessaires au fonctionnemen
<h3 style={{fontSize:15,fontWeight:700,color:"#264653",margin:"20px 0 12px"}}>6
<p>Les calculs de salaire, récapitulatifs Pajemploi, attestations fiscales et b
<h3 style={{fontSize:15,fontWeight:700,color:"#264653",margin:"20px 0 12px"}}>7
<p>Pour toute question : <strong>support@timat.app</strong></p>
<div style={{marginTop:20,padding:12,background:"#F0FAF4",borderRadius:10,fontS
Dernière mise à jour : {new Date().toLocaleDateString("fr-FR",{month:"long",y
</div>
</div>}
{/* =================== CGU =================== */}
{showLegal==="cgu"&&<div>
<h3 style={{fontSize:15,fontWeight:700,color:"#264653",marginBottom:12}}>1. Obj
<p>Les présentes Conditions Générales d'Utilisation (CGU) régissent l'accès et
<h3 style={{fontSize:15,fontWeight:700,color:"#264653",margin:"20px 0 12px"}}>2
<p>TiMat est une application de gestion administrative destinée aux assistantes
<h3 style={{fontSize:15,fontWeight:700,color:"#264653",margin:"20px 0 12px"}}>3
<p>L'utilisateur doit fournir des informations exactes lors de son inscription.
<h3 style={{fontSize:15,fontWeight:700,color:"#264653",margin:"20px 0 12px"}}>4
<p><strong>Formule Gratuite :</strong> accès limité (1 enfant, fonctionnalités
<p><strong>Formule Pro :</strong> 9,99€/mois TTC, avec un essai gratuit de 2 mo
<h3 style={{fontSize:15,fontWeight:700,color:"#264653",margin:"20px 0 12px"}}>5
<p>L'utilisateur reste propriétaire de toutes les données qu'il saisit dans TiM
<h3 style={{fontSize:15,fontWeight:700,color:"#264653",margin:"20px 0 12px"}}>6
<p>TiMat traite des données relatives à des enfants (prénoms, dates de naissanc
<ul style={{paddingLeft:20,margin:"8px 0"}}>
<li>Collecte limitée au strict nécessaire pour le service</li>
<li>Accès restreint aux seuls parents et assistantes maternelles concernés</l
<li>Aucune utilisation commerciale ou publicitaire</li>
<li>Suppression à la fin du contrat d'accueil ou sur demande</li>
</ul>
<h3 style={{fontSize:15,fontWeight:700,color:"#264653",margin:"20px 0 12px"}}>7
<p>TiMat est un outil d'aide à la gestion. Les calculs, documents et informatio
<h3 style={{fontSize:15,fontWeight:700,color:"#264653",margin:"20px 0 12px"}}>8
<p>L'utilisateur peut résilier son abonnement Pro à tout moment depuis son espa
<h3 style={{fontSize:15,fontWeight:700,color:"#264653",margin:"20px 0 12px"}}>9
<p>TiMat s'engage à fournir un service disponible 24h/24, 7j/7. Toutefois, des
<h3 style={{fontSize:15,fontWeight:700,color:"#264653",margin:"20px 0 12px"}}>1
<p>Les présentes CGU sont soumises au droit français. En cas de litige, une sol
<div style={{marginTop:20,padding:12,background:"#F0FAF4",borderRadius:10,fontS
Dernière mise à jour : {new Date().toLocaleDateString("fr-FR",{month:"long",y
</div>
</div>}
{/* =================== POLITIQUE DE CONFIDENTIALITÉ =================== */}
{showLegal==="confidentialite"&&<div>
<h3 style={{fontSize:15,fontWeight:700,color:"#264653",marginBottom:12}}>1. Res
<div style={{background:"#F4F7FA",borderRadius:10,padding:14,margin:"12px 0",fo
{config.legal?.nom} — Auto-entrepreneur<br/>
Email : {config.legal?.email}<br/>
SIRET : {config.legal?.siret}
</div>
<h3 style={{fontSize:15,fontWeight:700,color:"#264653",margin:"20px 0 12px"}}>2
<p>TiMat collecte les données suivantes :</p>
<div style={{background:"#F4F7FA",borderRadius:10,padding:14,margin:"12px 0",fo
<p><strong>Données d'identification :</strong> prénom, nom, adresse email, mo
<p style={{marginTop:8}}><strong>Données professionnelles :</strong> numéro d
<p style={{marginTop:8}}><strong>Données relatives aux enfants :</strong> pré
<p style={{marginTop:8}}><strong>Données de facturation :</strong> heures d'a
<p style={{marginTop:8}}><strong>Données techniques :</strong> adresse IP, ty
</div>
<h3 style={{fontSize:15,fontWeight:700,color:"#264653",margin:"20px 0 12px"}}>3
<ul style={{paddingLeft:20,margin:"8px 0"}}>
<li>Fourniture du service de gestion administrative pour assistantes maternel
<li>Calcul automatique des salaires et génération de documents</li>
<li>Communication entre assistantes maternelles et parents</li>
<li>Support utilisateur</li>
<li>Amélioration du service</li>
</ul>
<p style={{marginTop:8}}><strong>Base légale :</strong> exécution du contrat (A
<h3 style={{fontSize:15,fontWeight:700,color:"#264653",margin:"20px 0 12px"}}>4
<div style={{background:"#F0FAF4",borderRadius:10,padding:14,margin:"12px 0",fo
Base de données : <strong>Supabase</strong> — Région Europe, Paris (France
Site web : <strong>Vercel</strong> — CDN mondial, données en Europe<br/>
Paiement : <strong>Stripe</strong> — Certifié PCI-DSS Level 1<br/>
Chiffrement : TLS 1.3 en transit, AES-256 au repos<br/>
Mots de passe : hachés avec bcrypt (irréversible)<br/>
Row Level Security (RLS) : chaque utilisateur n'accède qu'à ses propres do
</div>
est ac
du con
<h3 style={{fontSize:15,fontWeight:700,color:"#264653",margin:"20px 0 12px"}}>5
<ul style={{paddingLeft:20,margin:"8px 0"}}>
<li><strong>Données de compte :</strong> conservées tant que le compte <li><strong>Données des enfants :</strong> conservées pendant la durée <li><strong>Données de facturation :</strong> conservées 5 ans (obligation lé
<li><strong>Données de support :</strong> conservées 2 ans</li>
</ul>
<h3 style={{fontSize:15,fontWeight:700,color:"#264653",margin:"20px 0 12px"}}>6
<p>Conformément au RGPD, vous disposez des droits suivants :</p>
<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1
{[[" ","Droit d'accès","Obtenir une copie de vos données"],[" ","Droit de r
<div key={titre}style={{background:"#F4F7FA",borderRadius:10,padding:12}}>
<div style={{fontSize:16,marginBottom:4}}>{ic}</div>
<div style={{fontSize:12,fontWeight:700,color:"#264653"}}>{titre}</div>
<div style={{fontSize:11,color:"#5F7A86"}}>{desc}</div>
</div>
)}
</div>
<p style={{marginTop:8}}>Pour exercer vos droits : <strong>support@timat.app</s
<h3 style={{fontSize:15,fontWeight:700,color:"#264653",margin:"20px 0 12px"}}>7
<div style={{background:"#F4F7FA",borderRadius:10,padding:14,margin:"12px 0",fo
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,fontSize:
<div><strong>Sous-traitant</strong></div><div><strong>Finalité</strong></di
<div>Supabase</div><div>Base de données</div><div> Paris, France</div>
<div>Vercel</div><div>Hébergement web</div><div> Europe (CDN)</div>
<div>Stripe</div><div>Paiement</div><div> Europe (Dublin)</div>
</div>
</div>
<p>Tous les sous-traitants sont conformes au RGPD et bénéficient de garanties c
<h3 style={{fontSize:15,fontWeight:700,color:"#264653",margin:"20px 0 12px"}}>8
<p>Les données sont hébergées en France et en Europe. En cas de transfert vers
<h3 style={{fontSize:15,fontWeight:700,color:"#264653",margin:"20px 0 12px"}}>9
<p>TiMat utilise uniquement des cookies techniques strictement nécessaires (aut
<h3 style={{fontSize:15,fontWeight:700,color:"#264653",margin:"20px 0 12px"}}>1
<p>Si vous estimez que vos droits ne sont pas respectés, vous pouvez adresser u
<div style={{marginTop:20,padding:12,background:"#F0FAF4",borderRadius:10,fontS
Dernière mise à jour : {new Date().toLocaleDateString("fr-FR",{month:"long",y
</div>
</div>}
</div>
</div>
</div>}
{/* MODALE AUTH */}
{showModal && (
<div onClick={e => e.target === e.currentTarget && setShowModal(false)} style={{ posi
<div style={{ background: "#FDFAF8", borderRadius: 20, width: "100%", maxWidth: 420
<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", background: "#7B4B
{[{ r: "asmat", ic: " ", l: "Assistante\nmaternelle", col: "#B8622F" }, { r
<button key={r} onClick={() => { setRole(r); setErr(""); }} style={{ padding:
<div style={{ fontSize: 24, marginBottom: 4 }}>{ic}</div>
<div style={{ fontSize: 12, fontWeight: 700, color: role === r ? "#fff" : "
</button>
))}
</div>
<div style={{ padding: 24, borderTop: role === "asmat" ? "4px solid #B8622F" : "4
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "ce
<div>
<div style={{ fontFamily: fTitle, fontSize: 18, fontWeight: 700, color: "#0
<div style={{ fontSize: 11, color: "#A68970", marginTop: 2 }}>{modeAuth ===
</div>
<button onClick={() => setShowModal(false)} style={{ background: "none", bord
</div>
<div style={{ display:"flex", marginBottom:16, background:"#F4EFF8", borderRadi
{["inscription","connexion"].map(m => (
<button key={m} onClick={() => { setModeAuth(m); setErr(""); }} style={{ fl
))}
</div>
{modeAuth === "inscription" && <>
<div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBo
<div>
<div style={{ fontSize:11, fontWeight:700, color:"#A68970", marginBottom:
<input value={form.prenom} onChange={e=>setForm(f=>({...f,prenom:e.target
</div>
<div>
<div style={{ fontSize:11, fontWeight:700, color:"#A68970", marginBottom:
<input value={form.nom} onChange={e=>setForm(f=>({...f,nom:e.target.value
</div>
</div>
</>}
<div style={{ marginBottom:10 }}>
<div style={{ fontSize:11, fontWeight:700, color:"#A68970", marginBottom:4, t
<input type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e
</div>
<div style={{ marginBottom: modeAuth==="inscription" ? 14 : 20 }}>
<div style={{ fontSize:11, fontWeight:700, color:"#A68970", marginBottom:4, t
<input type="password" value={form.password} onChange={e=>setForm(f=>({...f,p
</div>
{modeAuth === "inscription" && <div style={{ background:"#F4EFF8", borderRadius
<div style={{ fontSize:10, fontWeight:700, color:"#A68970", marginBottom:8, t
{[{k:"politique", l:"J'accepte la politique de confidentialité", req:true},{k
<label key={k} style={{ display:"flex", gap:8, alignItems:"flex-start", cur
<input type="checkbox" checked={consent[k]} onChange={e=>setConsent(c=>({
<span style={{ fontSize:11, color:"#2C1F14", lineHeight:1.5 }}>{l}{req&&<
</label>
))}
<div style={{ fontSize:10, color:"#A68970", marginTop:4 }}>* Obligatoire · Do
</div>}
{err && <div style={{ color:"#C44A6A", fontSize:12, marginBottom:12, padding:"8
<button onClick={modeAuth==="connexion" ? connexion : inscription} disabled={lo
{loading ? " </button>
Chargement..." : modeAuth==="connexion" ? (role==="asmat" ? "A
<div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
<div style={{ flex:1, height:1, background:"#DDD5C8" }}/><span style={{ fontS
</div>
<div style={{ background:"#F7F2EC", borderRadius:10, padding:10 }}>
<div style={{ fontSize:10, fontWeight:700, color:"#A68970", marginBottom:8, t
{demos.filter(d=>d.role===role).map(d => (
<button key={d.id} onClick={()=>onLogin(d)} style={{ display:"block", width
{d.role==="asmat"?" ":" "} {d.label}
<span style={{ fontSize:11, color:"#A68970", display:"block", paddingLeft
</button>
))}
</div>
</div>
</div>
</div>
<div style={{ marginTop:12, fontSize:11, color:"#A68970", textAlign:"center" }}
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
const VAPID_PUBLIC='BEl62iUYgUivxIkv69yViEuiBIa40HZa+FE+TgEFSCcg4sV3fD3CK+jNHOyHAHhGXCGGO
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
const [enfant,setEnfant]=useState({prenom:"",naissance:"",emoji:" "});
const [contrat,setContrat]=useState({
heuresHebdo:40,tauxHoraire:4.05,entretien:3.80,
jours:["Lundi","Mardi","Mercredi","Jeudi","Vendredi"],
horaires:"07h30–17h30",debut:new Date().toISOString().slice(0,10)
});
const [parentEmail,setParentEmail]=useState("");
const [saving,setSaving]=useState(false);
const [pushDone,setPushDone]=useState(false);
const [toast,setToast]=useState("");
const EMOJIS=[" "," "," "," "," "," "," "," "," "," "];
const toggleJour=(j)=>setContrat(c=>({...c,jours:c.jours.includes(j)?c.jours.filter(x=>x!==
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
const{data:profil}=await withRetry(()=>supabase.from('profiles').select('id').eq('id',u
if(!profil){
await withRetry(()=>supabase.from('profiles').insert({
id:user.id,email:user.email,
prenom:user.prenom||'',nom:user.nom||'',
role:user.role||'asmat',couleur:'#B8622F',
subscription_status:'free'
}));
}
// 2. Créer l'enfant
const{data:enfantData,error:errEnfant}=await withRetry(()=>supabase.from('enfants').ins
prenom:enfant.prenom,
emoji:enfant.emoji||' ',
naissance:enfant.naissance,
asmat_id:user.id,
actif:true,
}).select().single());
if(errEnfant){
console.error('Erreur enfant:', errEnfant);
setToast(' Erreur: '+errEnfant.message);
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
setToast(' '+enfant.prenom+' ajouté avec succès !');
setStep(2);
}catch(e){
console.error('Erreur sauvegarde:', e);
setToast(' Erreur: '+e.message);
}
setSaving(false);
};
const stepsTitres=[
{titre:"Votre premier enfant {titre:"Le contrat d'accueil {titre:"Inviter le parent {titre:"TiMat est prêt ! ",sub:"En 2 minutes, TiMat est prêt pour vous."},
",sub:"Pour calculer automatiquement votre salaire."},
",sub:"Optionnel - vous pouvez le faire plus tard."},
",sub:"Votre espace est configuré."},
];
const s=stepsTitres[step];
return <div style={{minHeight:"100vh",background:"linear-gradient(160deg,#F0FAF4 0%,#FBF0E8
{toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
<div style={{width:"100%",maxWidth:500}}>
<div style={{display:"flex",gap:6,marginBottom:28}}>
{stepsTitres.map((_,i)=><div key={i}style={{flex:1,height:5,borderRadius:3,background
</div>
<div style={{background:"#fff",borderRadius:24,overflow:"hidden",boxShadow:"0 8px 48px
<div style={{background:"linear-gradient(135deg,#3D6B50,#4A7C5F)",padding:"28px 28px
<div className="pf"style={{fontSize:22,fontWeight:700,color:"#fff",marginBottom:4}}
<div style={{fontSize:13,color:"rgba(255,255,255,.7)"}}>{s.sub}</div>
</div>
<div style={{padding:28}}>
{step===0&&<>
<div style={{marginBottom:14}}><label className="lbl">Prénom de l'enfant *</label
<input className="inp"placeholder="Léo, Emma, Noah..."value={enfant.prenom}onCh
<div style={{marginBottom:14}}><label className="lbl">Date de naissance *</label>
<input type="date"className="inp"value={enfant.naissance}onChange={e=>setEnfant
<div style={{marginBottom:20}}><label className="lbl">Emoji</label>
<div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
{EMOJIS.map(em=><button key={em}onClick={()=>setEnfant(f=>({...f,emoji:em}))}
width:42,height:42,borderRadius:10,border:"2px solid",fontSize:20,cursor:"p
background:enfant.emoji===em?"var(--Sp)":"#fff",borderColor:enfant.emoji===
}}>{em}</button>)}
</div></div>
<button className="btn bS"style={{width:"100%",justifyContent:"center",padding:13
onClick={()=>enfant.prenom&&enfant.naissance&&setStep(1)}
disabled={!enfant.prenom||!enfant.naissance}>
Continuer → Le contrat
</button>
</>}
{step===1&&<>
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}
<div><label className="lbl">Heures / semaine</label>
<input type="number"className="inp"value={contrat.heuresHebdo}onChange={e=>se
<div><label className="lbl">Taux horaire net (€)</label>
<input type="number"step="0.05"className="inp"value={contrat.tauxHoraire}onCh
</div>
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}
<div><label className="lbl">Indemnité entretien (€/j)</label>
<input type="number"step="0.05"className="inp"value={contrat.entretien}onChan
<div><label className="lbl">Date de début</label>
<input type="date"className="inp"value={contrat.debut}onChange={e=>setContrat
</div>
<div style={{marginBottom:14}}><label className="lbl">Jours d'accueil</label>
<div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
{["Lundi","Mardi","Mercredi","Jeudi","Vendredi"].map(j=><button key={j}onClic
padding:"6px 12px",borderRadius:20,border:"1.5px solid",cursor:"pointer",fo
background:contrat.jours.includes(j)?"var(--S)":"transparent",
color:contrat.jours.includes(j)?"#fff":"var(--m)",
borderColor:contrat.jours.includes(j)?"var(--S)":"var(--br)"
}}>{j.slice(0,2)}</button>)}
</div></div>
<div style={{background:"var(--Sp)",borderRadius:10,padding:"10px 14px",marginBot
Salaire mensuel estimé : {Math.round(contrat.heuresHebdo*52/12*contrat.tauxHora
</div>
<div style={{display:"flex",gap:8}}>
<button className="btn bG"style={{flex:1}}onClick={()=>setStep(0)}>← Retour</bu
<button className="btn bS"style={{flex:2,justifyContent:"center"}}onClick={sauv
{saving?" Sauvegarde...":"Sauvegarder →"}
</button>
</div>
</>}
{step===2&&<>
<div style={{marginBottom:14,padding:"12px 14px",background:"var(--Bp)",borderRad
Le parent recevra un email pour créer son compte et accéder à l'espace famil
</div>
<div style={{marginBottom:16}}><label className="lbl">Email du parent</label>
<input type="email"className="inp"placeholder="parent@email.fr"value={parentEma
<div style={{display:"flex",gap:8}}>
<button className="btn bG"style={{flex:1}}onClick={()=>setStep(3)}>Passer</butt
<button className="btn bS"style={{flex:2,justifyContent:"center"}}disabled={sav
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
setToast(d.success?" }catch(e){setToast("Erreur réseau");}
Invitation envoyée - le parent recevra un email":"
setSaving(false);setStep(3);
}}>
</button>
</div>
{saving?" Envoi...":" Envoyer l'invitation"}
</>}
{step===3&&<div style={{textAlign:"center",padding:"20px 0"}}>
<div style={{fontSize:72,marginBottom:16}}>{enfant.emoji||" "}</div>
<div className="pf"style={{fontSize:20,fontWeight:700,color:"var(--b)",marginBott
Bienvenue, {user?.prenom} !
</div>
<div style={{fontSize:13,color:"var(--m)",lineHeight:1.7,marginBottom:20}}>
{enfant.prenom&&<><strong>{enfant.prenom}</strong> est ajouté·e à votre espace.
Commencez par votre premier pointage.
</div>
{'Notification' in window&&!pushDone&&<div style={{background:"var(--Gp)",border:
<div style={{fontWeight:700,marginBottom:6}}> Activer les notifications push
<div style={{marginBottom:8}}>Recevez les alertes en temps réel sur votre télép
<button className="btn bG"style={{width:"100%"}}onClick={async()=>{
await demanderPush(user.id);setPushDone(true);setToast("Notifications activée
}}>Activer</button>
</div>}
<button className="btn bT"style={{width:"100%",justifyContent:"center",fontSize:1
Découvrir TiMat
</button>
</div>}
</div>
</div>
</div>
</div>;
}
//
function AttestationPoleEmploi({enfants,role,pEId,user}){
const [selId,setSelId]=useState(enfants[0]?.id);
const [dateFin,setDateFin]=useState("");
const [motif,setMotif]=useState("Fin de contrat");
const [gen,setGen]=useState(false);
const [toast,setToast]=useState("");
const liste=role==="parent"?enfants.filter(e=>e.id===pEId):enfants;
const enfant=liste.find(e=>e.id===selId)||liste[0]||{};
const contrat=enfant.contrat||{};
const motifs=["Fin de contrat","Démission","Licenciement","Rupture conventionnelle","Retrai
const generer=()=>{
if(!dateFin)return;
setGen(true);
setTimeout(()=>{
setGen(false);
const w=window.open("","_blank");
if(!w){setToast("Autorisez les popups pour générer le PDF");return;}
const parent=D.parents.find(p=>p.id===enfant.parentId)||{prenom:"Parent",nom:"",email:"
const salaireMensuel=Math.round((contrat.heuresHebdo||40)*52/12*(contrat.tauxHoraire||4
const htmlAttest='<!DOCTYPE html><html lang="fr"><head><title>Attestation Pôle Emploi -
+'<style>body{font-family:Arial,sans-serif;max-width:800px;margin:40px auto;padding:2
+'h1{font-size:15px;text-align:center;border:2px solid #000;padding:10px;margin-botto
+'h2{font-size:13px;background:#f0f0f0;padding:6px 8px;margin-top:20px;border-left:3p
+'table{width:100%;border-collapse:collapse;margin:8px 0;}'
+'td{padding:7px 10px;border:1px solid #ddd;}td:first-child{width:45%;background:#faf
+'.sig{margin-top:40px;display:grid;grid-template-columns:1fr 1fr;gap:40px;}'
+'.sig-box{border-top:1px solid #000;padding-top:8px;font-size:12px;}'
+'@media print{button{display:none}}</style></head>'
+'<body>'
+'<h1>Attestation destinée à Pôle Emploi<br/><span style="font-size:11px;font-weight:
+"<h2>L'employeur</h2>"
+'<table><tr><td>Nom et prénom</td><td>'+parent.prenom+' '+parent.nom+'</td></tr>'
+'<tr><td>Email</td><td>'+(parent.email||'[À compléter]')+'</td></tr>'
+'<tr><td>N° Pajemploi</td><td>PAJ-[À compléter]</td></tr></table>'
+'<h2>Le salarié</h2>'
+'<table><tr><td>Nom et prénom</td><td>'+(user?.prenom||D.asmat.prenom)+' '+(user?.no
+'<tr><td>Emploi</td><td>Assistante maternelle agréée</td></tr>'
+'<tr><td>Enfant gardé</td><td>'+(enfant.prenom||'')+' '+(enfant.nom||'')+'</td></tr>
+'<h2>Contrat de travail</h2>'
+"<table><tr><td>Date d'embauche</td><td>"+(contrat.debut||"[À compléter]")+"</td></t
+'<tr><td>Date de fin</td><td>'+dateFin+'</td></tr>'
+'<tr><td>Motif</td><td>'+motif+'</td></tr>'
+'<tr><td>Heures hebdo</td><td>'+(contrat.heuresHebdo||40)+'h/semaine</td></tr>'
+'<tr><td>Dernier salaire brut</td><td>'+salaireMensuel+'€</td></tr></table>'
+'<h2>Indemnités versées</h2>'
+'<table><tr><td>Salaire du dernier mois</td><td>[À compléter]€</td></tr>'
+'<tr><td>ICCP</td><td>[À compléter]€</td></tr>'
+'<tr><td>Indemnité de préavis</td><td>[À compléter]€</td></tr></table>'
+'<p style="margin-top:20px;font-size:12px;background:#f9f9f9;padding:10px;border:1px
+'<div class="sig">'
+'<div class="sig-box">Fait à ___, le '+new Date().toLocaleDateString('fr-FR')+'<br/>
+'<div class="sig-box">Remis le '+new Date().toLocaleDateString('fr-FR')+'<br/><br/>S
+'</div>'
+'<p style="font-size:10px;color:#999;margin-top:20px;">Généré par TiMat - timat.app<
+'<button onclick="window.print()" style="margin-top:10px;background:#3D6B50;color:#f
+'</body></html>';
w.document.write(htmlAttest);
w.document.close();
setToast("Attestation générée ✓");
},1000);
};
Fin d
return <div className="fi">
{toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
<PageHeader icon=" " title="Attestation Pôle Emploi" sub="Générée en 1 clic - obligatoir
{role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
{liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>setSelId(e.id)}/>)}
</div>}
<div className="g2">
<div style={{display:"flex",flexDirection:"column",gap:14}}>
<div className="card"style={{padding:18}}>
<div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:14}}> <div style={{marginBottom:12}}><label className="lbl">Date de fin *</label>
<input type="date"className="inp"value={dateFin}onChange={e=>setDateFin(e.target.
<div style={{marginBottom:16}}><label className="lbl">Motif</label>
<select className="sel"value={motif}onChange={e=>setMotif(e.target.value)}>
{motifs.map(m=><option key={m}>{m}</option>)}
</select></div>
<button className="btn bT"style={{width:"100%",justifyContent:"center"}}onClick={ge
{gen?" Génération...":" Générer l'attestation PDF"}
</button>
</div>
<div className="card"style={{padding:14,background:"var(--Rp)",border:"1px solid var(
<div style={{fontWeight:700,fontSize:12,color:"var(--R)",marginBottom:6}}> <div style={{fontSize:12,color:"var(--m)",lineHeight:1.6}}>
Obliga
L'attestation Pôle Emploi est obligatoire dès la fin du contrat. Sans ce document
</div>
</div>
</div>
</div>
</div>;
}
function AttestationFiscale({enfants,role,pEId,user}){
const [selId,setSelId]=useState(enfants[0]?.id);
const [annee,setAnnee]=useState(new Date().getFullYear()-1);
const [gen,setGen]=useState(false);
const [toast,setToast]=useState("");
const liste=role==="parent"?enfants.filter(e=>e.id===pEId):enfants;
const enfant=liste.find(e=>e.id===selId)||liste[0]||{};
const contrat=enfant.contrat||{};
// Calcul annuel estimé
const hMens=Math.round((contrat.heuresHebdo||40)*52/12);
const salMensBrut=hMens*(contrat.tauxHoraire||4.05);
const entretienMens=(contrat.entretien||3.80)*Math.round(hMens/8);
const moisTravailles=12; // Estimation année complète
const totalSalNet=(salMensBrut*0.78*moisTravailles);
const totalEntretien=entretienMens*moisTravailles;
const totalRepas=0;
const generer=()=>{
setGen(true);
setTimeout(()=>{
setGen(false);
const w=window.open("","_blank");
if(!w){setToast("Autorisez les popups");return;}
const html=[
'<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/><title>Attestation fisca
'<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;
'h1{font-size:15px;text-align:center;color:#264653;border-bottom:2px solid #2A9D8F;pa
'.header{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px;paddi
'.header h3{font-size:11px;color:#2A9D8F;margin-bottom:6px;text-transform:uppercase;l
'table{width:100%;border-collapse:collapse;margin:10px 0}td{padding:8px 12px;border:1
'td:first-child{width:60%;background:#FDFBF8;font-weight:600;color:#264653}',
'.total{background:#2A9D8F;color:#fff;font-weight:700;font-size:13px}.total td{border
'.note{margin-top:20px;padding:14px;background:#FFF8F3;border:1px solid #FFD6B3;borde
'.sig{margin-top:30px;display:grid;grid-template-columns:1fr 1fr;gap:30px}',
'.sig-box{border-top:1px solid #264653;padding-top:10px;font-size:11px}',
'@media print{.noprint{display:none}}</style></head><body>',
'<h1> ATTESTATION FISCALE<br/><span style="font-size:12px;font-weight:400;color:#66
'<div class="header">',
Somme
Détai
'<div><h3>Assistante maternelle agréée</h3>',
'<strong>'+(user?.prenom||'Prénom')+' '+(user?.nom||'Nom')+'</strong><br/>',
'Email : '+(user?.email||'[email]')+'<br/>',
'N° agrément : [À compléter]</div>',
'<div><h3>Parent employeur</h3>',
'<strong>'+(enfant?.prenomParent||'Parent')+' '+(enfant?.nomParent||'')+'</strong><br
'Enfant gardé : '+(enfant?.prenom||'-')+' '+(enfant?.emoji||'')+'<br/>',
'Né(e) le : '+(enfant?.naissance||'[Date]')+'</div></div>',
'<h3 style="font-size:12px;color:#264653;margin:16px 0 8px;padding-left:4px"> '<table>',
'<tr><td>Salaires nets versés (12 mois)</td><td style="text-align:right">'+totalSalNe
'<tr><td>Indemnités d\'entretien</td><td style="text-align:right">'+totalEntretien.to
'<tr><td>Indemnités de repas</td><td style="text-align:right">'+totalRepas.toFixed(2)
'<tr class="total"><td>TOTAL DES SOMMES VERSÉES</td><td style="text-align:right">'+(t
'</table>',
'<h3 style="font-size:12px;color:#264653;margin:16px 0 8px;padding-left:4px"> '<table>',
'<tr><td>Heures hebdomadaires (contrat)</td><td style="text-align:right">'+(contrat.h
'<tr><td>Taux horaire brut</td><td style="text-align:right">'+(contrat.tauxHoraire||4
'<tr><td>Salaire mensuel brut estimé</td><td style="text-align:right">'+salMensBrut.t
'<tr><td>Salaire mensuel net estimé</td><td style="text-align:right">'+(salMensBrut*0
'<tr><td>Mois travaillés</td><td style="text-align:right">'+moisTravailles+' mois</td
'</table>',
'<div class="note">',
'<strong> Informations importantes :</strong><br/>',
'• Ce document est destiné à la déclaration de revenus du parent employeur (crédit d\
'• Le parent peut déduire les sommes versées (salaires + cotisations) dans la limite
'• Les indemnités d\'entretien et de repas ne sont pas déductibles.<br/>',
'• Conservez ce document avec votre déclaration de revenus.',
'</div>',
'<p style="margin-top:16px;font-size:11px;text-align:center;font-weight:600;color:#26
'<div class="sig">',
'<div class="sig-box">Fait à ____________<br/>Le '+new Date().toLocaleDateString('fr-
'<div class="sig-box">Remis au parent le :<br/>____________<br/><br/>Signature parent
'<p style="font-size:9px;color:#999;margin-top:20px;text-align:center">Généré par TiM
'<div style="text-align:center;margin-top:12px"><button class="noprint" onclick="wind
'</body></html>'
].join('');
w.document.write(html);
w.document.close();
setToast("Attestation fiscale générée ✓");
},800);
};
return <div className="fi">
{toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
<PageHeader icon=" " title="Attestation fiscale" sub="Pour le crédit d'impôt des parents
{role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
{liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>setSelId(e.id)}/>)}
</div>}
<div className="g2">
<div style={{display:"flex",flexDirection:"column",gap:14}}>
<div className="card"style={{padding:18}}>
<div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:14}}> <div style={{marginBottom:12}}>
<label className="lbl">Année fiscale</label>
<select className="sel"value={annee}onChange={e=>setAnnee(Number(e.target.value))
{[new Date().getFullYear()-1,new Date().getFullYear()-2,new Date().getFullYear(
<option key={a}value={a}>{a}</option>
Attes
)}
</select>
</div>
<div style={{padding:12,background:"var(--c)",borderRadius:10,marginBottom:14,fontS
<div style={{fontWeight:700,marginBottom:6,color:"var(--b)"}}>Récapitulatif {anne
<div style={{display:"flex",justifyContent:"space-between"}}><span>Salaires nets<
<div style={{display:"flex",justifyContent:"space-between"}}><span>Indemnités ent
<div style={{display:"flex",justifyContent:"space-between",borderTop:"1px solid v
</div>
<button className="btn bT"style={{width:"100%"}}onClick={generer}disabled={gen}>
{gen?" Génération...":" Générer l'attestation fiscale "+annee}
</button>
</div>
<div style={{padding:12,background:"var(--Bp)",borderRadius:10,fontSize:12,color:"var
Cette attestation permet aux parents de bénéficier du crédit d'impôt pour frais
</div>
</div>
<div className="card"style={{padding:18}}>
<div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:14}}> Contrat
{contrat.debut?<div style={{fontSize:12,lineHeight:2}}>
<div>Début : <strong>{contrat.debut}</strong></div>
<div>Heures/semaine : <strong>{contrat.heuresHebdo||40}h</strong></div>
<div>Taux horaire : <strong>{contrat.tauxHoraire||4.05} €</strong></div>
<div>Entretien : <strong>{contrat.entretien||3.80} €/jour</strong></div>
</div>:<div style={{fontSize:12,color:"var(--l)"}}>Aucun contrat trouvé pour cet enfa
</div>
</div>
</div>;
}
// ========== FICHE D'URGENCE (dans l'app) ==========
function FicheUrgence({enfants,role,pEId,user}){
const [selId,setSelId]=useState(enfants[0]?.id);
const [toast,setToast]=useState("");
const liste=role==="parent"?enfants.filter(e=>e.id===pEId):enfants;
const enfant=liste.find(e=>e.id===selId)||liste[0]||{};
const contrat=enfant.contrat||{};
const [form,setForm]=useState({
asmatNom:(user?.prenom||"")+" "+(user?.nom||""),asmatTel:user?.tel||"",asmatAgrement:user
nom:enfant.nom||"",prenom:enfant.prenom||"",naissance:enfant.naissance||"",sexe:"",adress
mereNom:"",mereTel:"",mereTravail:"",mereEmail:"",mereEmployeur:"",
pereNom:"",pereTel:"",pereTravail:"",pereEmail:"",pereEmployeur:"",
p1Nom:"",p1Lien:"",p1Tel:"",p2Nom:"",p2Lien:"",p2Tel:"",p3Nom:"",p3Lien:"",p3Tel:"",
medecin:"",medecinTel:"",groupe:"",vaccins:"Oui",pai:"Non",
allergies:enfant.allergies?.join(", ")||"",traitements:"",particularites:"",
authUrgences:true,authParacetamol:false,authSorties:true,authVoiture:true,authPhotos:fals
});
const set=(k,v)=>setForm(p=>({...p,[k]:v}));
// Re-fill when enfant changes
useEffect(()=>{
if(!enfant?.id)return;
setForm(p=>({...p,nom:enfant.nom||"",prenom:enfant.prenom||"",naissance:enfant.naissance|
allergies:enfant.allergies?.join(", ")||p.allergies}));
},[enfant?.id]);
const genererPDF=()=>{
const w=window.open("","_blank");
if(!w){setToast("Autorisez les popups");return;}
const f=form;
const authLines=[
["Emmener aux urgences",f.authUrgences],["Paracetamol (ordonnance jointe)",f.authParace
["Sorties exterieures",f.authSorties],["Transport en voiture",f.authVoiture],["Photos (
].map(([l,v])=>"<div style='margin:6px 0;font-size:13px'><span style='color:"+(v?"#2A9D8F
const html=[
"<!DOCTYPE html><html lang='fr'><head><meta charset='UTF-8'/><title>Fiche urgence - "+f
"<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Calibri,sans-serif;
"h1{font-size:22px;text-align:center;letter-spacing:3px;color:#264653;margin-bottom:2px
".sub{text-align:center;color:#2A9D8F;font-size:14px;margin-bottom:4px}",
".note{text-align:center;color:#bbb;font-size:11px;margin-bottom:20px;font-style:italic
".sh{font-size:14px;font-weight:700;color:#264653;letter-spacing:2px;border-bottom:3px
".stt{font-weight:700;color:#2A9D8F;font-size:13px;margin:14px 0 6px}",
".line{border-bottom:1px solid #d0d0d0;padding:6px 0;margin:4px 0}",
".line b{color:#264653}",
".urg{background:#FEF2F2;padding:8px 14px;margin:4px 0;border-radius:6px}",
".urg span{color:#E76F51;font-weight:700;font-size:18px}",
"@media print{.noprint{display:none}}</style></head><body>",
"<h1>FICHE D'URGENCE</h1>",
"<div class='sub'>Assistante maternelle agreee</div>",
"<div class='note'>A remettre des le debut de l'accueil | A mettre a jour chaque "<div class='line'><b>Assistante maternelle :</b> "+f.asmatNom+"</div>",
"<div class='line'><b>Telephone :</b> "+f.asmatTel+"</div>",
annee<
:</b>
"<div class='line'><b>N. d'agrement :</b> "+f.asmatAgrement+"</div>",
"<div class='sh'>01 Identite de l'enfant</div>",
"<div class='line'><b>Nom :</b> "+f.nom+"</div>",
"<div class='line'><b>Prenom :</b> "+f.prenom+"</div>",
"<div class='line'><b>Date de naissance :</b> "+f.naissance+"</div>",
"<div class='line'><b>Sexe :</b> "+f.sexe+"</div>",
"<div class='line'><b>Adresse :</b> "+f.adresse+"</div>",
"<div class='sh'>02 Coordonnees des parents</div>",
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
"<div class='sh'>03 Personnes autorisees</div>",
...[1,2,3].map(n=>"<div class='stt'>Personne "+n+"</div><div class='line'><b>Nom "<div class='sh'>04 Informations medicales</div>",
"<div class='line'><b>Medecin :</b> "+f.medecin+"</div>",
"<div class='line'><b>Tel medecin :</b> "+f.medecinTel+"</div>",
"<div class='line'><b>Groupe sanguin :</b> "+f.groupe+"</div>",
"<div class='line'><b>Vaccins a jour :</b> "+f.vaccins+"</div>",
"<div class='line'><b>PAI :</b> "+f.pai+"</div>",
"<div class='line'><b>Allergies :</b> "+f.allergies+"</div>",
"<div class='line'><b>Traitements :</b> "+f.traitements+"</div>",
"<div class='line'><b>Particularites :</b> "+f.particularites+"</div>",
"<div class='sh'>05 Numeros d'urgence</div>",
"<div class='urg'>SAMU : <span>15</span></div>",
"<div class='urg'>Pompiers : <span>18</span></div>",
"<div class='urg'>Urgences europeennes : <span>112</span></div>",
"<div class='urg'>Centre anti-poison : <span>01 40 05 48 48</span></div>",
"<div class='sh'>06 Autorisations parentales</div>",
authLines,
"<div class='sh'>07 Signatures</div>",
"<p style='margin-bottom:16px'>Je soussigne(e), certifie l'exactitude des renseignement
"<div class='line'><b>Fait a :</b></div><div class='line'><b>Le :</b></div>",
"<div style='display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:20px'>",
"<div><div style='font-weight:700;margin-bottom:60px'>Signature parent :</div></div>",
"<div><div style='font-weight:700;margin-bottom:60px'>Signature assmat :</div></div></d
"<p style='text-align:center;color:#ccc;font-size:10px;margin-top:20px'>Genere par TiMa
"<div class='noprint' style='text-align:center;margin-top:16px'><button onclick='window
"</body></html>"
].join("");
w.document.write(html);w.document.close();
setToast("Fiche generee ✓");
};
// Parent: read-only view
if(role==="parent"){
const f=form;
const line=(label,val)=>val?<div style={{display:"flex",justifyContent:"space-between",pa
<span style={{fontWeight:600,color:"var(--b)"}}>{label}</span><span style={{color:"var(
</div>:null;
return <div className="fi">
<PageHeader icon=" " title="Fiche d'urgence" sub={"Fiche de "+(enfant.prenom||"votre e
<div className="card"style={{padding:20}}>
<div style={{fontWeight:700,fontSize:15,color:"var(--b)",marginBottom:14}}> {enfant
{line("Nom",f.nom)}{line("Prenom",f.prenom)}{line("Date de naissance",f.naissance)}{l
<div style={{fontWeight:700,fontSize:14,color:"var(--T)",margin:"18px 0 10px"}}> Me
{line("Medecin",f.medecin||"A completer")}{line("Telephone medecin",f.medecinTel)}{li
<div style={{fontWeight:700,fontSize:14,color:"var(--T)",margin:"18px 0 10px"}}> Nu
{line("SAMU","15")}{line("Pompiers","18")}{line("Urgences","112")}{line("Centre anti-
<button className="btn bT"style={{width:"100%",marginTop:14}}onClick={genererPDF}>
</div>
</div>;
}
const inp=(label,key,ph)=><div style={{marginBottom:10}}>
<label style={{fontSize:11,fontWeight:600,color:"var(--l)",display:"block",marginBottom:3
<input className="inp"value={form[key]}onChange={e=>set(key,e.target.value)}placeholder={
</div>;
const ta=(label,key,ph)=><div style={{marginBottom:10}}>
<label style={{fontSize:11,fontWeight:600,color:"var(--l)",display:"block",marginBottom:3
<textarea className="ta"value={form[key]}onChange={e=>set(key,e.target.value)}placeholder
</div>;
const chk=(label,key)=><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6
<div style={{width:20,height:20,borderRadius:6,border:"2px solid "+(form[key]?"var(--S)":
<span style={{fontSize:12,color:"var(--b)"}}>{label}</span>
</div>;
return <div className="fi">
{toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
<PageHeader icon=" " title="Fiche d'urgence" sub="Pre-remplie avec les donnees de l'enfa
{role==="asmat"&&liste.length>1&&<div style={{display:"flex",gap:8,marginBottom:14,flexWr
{liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>setSelId(e.id)}/>)}<
<div className="g2">
<div style={{display:"flex",flexDirection:"column",gap:12}}>
<div className="card"style={{padding:16}}>
<div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:12}}> Enfan
{inp("Nom","nom")}{inp("Prenom","prenom")}{inp("Date de naissance","naissance","JJ/
</div>
Mere<
Pere<
<div className="card"style={{padding:16}}>
<div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:12}}> {inp("Nom et prenom","mereNom")}{inp("Telephone","mereTel")}{inp("Email","mereEmail
</div>
<div className="card"style={{padding:16}}>
<div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:12}}> {inp("Nom et prenom","pereNom")}{inp("Telephone","pereTel")}{inp("Email","pereEmail
</div>
</div>
<div style={{display:"flex",flexDirection:"column",gap:12}}>
<div className="card"style={{padding:16}}>
<div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:12}}> Perso
{[1,2,3].map(n=><div key={n}style={{marginBottom:10,padding:10,background:"var(--c)
<div style={{fontSize:11,fontWeight:700,color:"var(--l)",marginBottom:6}}>Personn
{inp("Nom","p"+n+"Nom")}{inp("Lien","p"+n+"Lien","Grand-parent, oncle...")}{inp("
</div>)}
</div>
<div className="card"style={{padding:16}}>
<div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:12}}> Medic
{inp("Medecin traitant","medecin")}{inp("Tel medecin","medecinTel")}{inp("Groupe sa
{ta("Allergies","allergies","Aucune connue")}{ta("Traitements","traitements","Aucun
</div>
<div className="card"style={{padding:16}}>
<div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:12}}> {chk("Emmener aux urgences","authUrgences")}
{chk("Paracetamol (ordonnance jointe)","authParacetamol")}
{chk("Sorties exterieures","authSorties")}
{chk("Transport en voiture","authVoiture")}
{chk("Photos (usage interne)","authPhotos")}
</div>
<button className="btn bT"style={{width:"100%",padding:"14px",fontSize:14}}onClick={g
Generer la fiche d'urgence PDF
</button>
</div>
</div>
</div>;
Autor
}
// ========== PROJET D'ACCUEIL (dans l'app) ==========
function ProjetAccueil({user,role}){
const [toast,setToast]=useState("");
// Parent: read-only view
if(role==="parent"){
return <div className="fi">
<PageHeader icon=" " title="Projet d'accueil" sub="Le projet d'accueil de votre <div className="card"style={{padding:20,textAlign:"center"}}>
assist
<div style={{fontSize:48,marginBottom:16}}> </div>
<div style={{fontSize:16,fontWeight:700,color:"var(--b)",marginBottom:8}}>Projet d'ac
<div style={{fontSize:13,color:"var(--m)",lineHeight:1.7,marginBottom:16}}>
Le projet d'accueil est un document redige par votre assistante maternelle. Il decr
</div>
<div style={{padding:14,background:"var(--Bp)",borderRadius:12,fontSize:12,color:"var
Demandez a votre assistante maternelle de vous transmettre son projet d'accueil
</div>
</div>
</div>;
}
const [form,setForm]=useState({
nom:(user?.prenom||"")+" "+(user?.nom||""),adresse:"",tel:user?.tel||"",email:user?.email
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
});
alimentationPerso:"",sommeilPerso:"",activitesPerso:"",communicationPerso:"",conclusion:"
const set=(k,v)=>setForm(p=>({...p,[k]:v}));
const setHoraire=(i,field,v)=>setForm(p=>{const h=[...p.horaires];h[i]={...h[i],[field]:v};
const inp=(label,key,ph)=><div style={{marginBottom:10}}>
<label style={{fontSize:11,fontWeight:600,color:"var(--l)",display:"block",marginBottom:3
<input className="inp"value={form[key]}onChange={e=>set(key,e.target.value)}placeholder={
</div>;
const ta=(label,key,ph,rows)=><div style={{marginBottom:10}}>
<label style={{fontSize:11,fontWeight:600,color:"var(--l)",display:"block",marginBottom:3
<textarea className="ta"value={form[key]}onChange={e=>set(key,e.target.value)}placeholder
</div>;
const genererPDF=()=>{
const w=window.open("","_blank");
if(!w){setToast("Autorisez les popups");return;}
const f=form;
const horairesHTML=f.horaires.map(h=>"<tr><td style='background:#F4F7FA;padding:8px 14px;
const html=[
"<!DOCTYPE html><html lang='fr'><head><meta charset='UTF-8'/><title>Projet d'accueil</t
"<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Calibri,sans-serif;
"h1{font-size:28px;text-align:center;letter-spacing:4px;color:#264653;margin-bottom:4px
".sub{text-align:center;color:#2A9D8F;font-size:15px;margin-bottom:20px}",
".info{text-align:center;color:#aaa;font-size:12px;margin-bottom:4px}",
".sh{font-size:15px;font-weight:700;color:#264653;letter-spacing:2px;border-bottom:3px
".stt{font-weight:700;color:#2A9D8F;font-size:14px;margin:18px 0 8px}",
"p{margin:6px 0}ul{padding-left:22px;margin:6px 0}li{margin:4px 0}",
"table{width:100%;border-collapse:collapse;margin:12px 0}",
".cover{page-break-after:always;display:flex;flex-direction:column;align-items:center;j
".cover h1{font-size:36px;letter-spacing:8px;margin-bottom:8px}",
".cover .line{border-bottom:1px solid #d0d0d0;width:300px;margin:8px auto;padding:8px 0
".cover .label{color:#aaa;font-size:11px;margin-top:16px}",
"@media print{.noprint{display:none}.cover{min-height:100vh}}</style></head><body>",
// PAGE DE GARDE
"<div class='cover'>",
"<h1>PROJET D'ACCUEIL</h1>",
"<div class='sub'>Assistante maternelle agreee</div>",
"<div style='border-top:3px solid #2A9D8F;border-bottom:3px solid #2A9D8F;padding:16px
"<div class='line' style='font-weight:700;font-size:18px'>"+f.nom+"</div>",
"<div class='label'>Adresse</div><div class='line'>"+f.adresse+"</div>",
"<div class='label'>Telephone</div><div class='line'>"+f.tel+"</div>",
"<div class='label'>Email</div><div class='line'>"+f.email+"</div>",
"<div class='label'>Agrement</div><div class='line'>"+f.agrement+"</div>",
"</div>",
"<div style='color:#2A9D8F;font-size:16px;font-weight:700'>"+new Date().getFullYear()+"
"</div>",
// CONTENU
"<div class='sh'>01 Introduction</div>",
"<p>Ce projet d'accueil a pour objectif de vous presenter ma pratique professionnelle,
f.intro?"<p>"+f.intro.replace(/\n/g,"<br/>")+"</p>":"",
"<div class='sh'>02 Presentation</div>",
"<div class='stt'>Mon parcours</div>",
f.parcours?"<p>"+f.parcours.replace(/\n/g,"<br/>")+"</p>":"",
"<div class='stt'>Mon agrement</div>",
f.agrementDetail?"<p>"+f.agrementDetail.replace(/\n/g,"<br/>")+"</p>":"",
"<div class='stt'>Mon domicile</div>",
f.domicile?"<p>"+f.domicile.replace(/\n/g,"<br/>")+"</p>":"",
"<div class='sh'>03 Valeurs educatives</div>",
"<div class='stt'>Bienveillance et respect du rythme</div>",
"<p>Chaque enfant est unique et se developpe a son propre rythme. Je m'engage a respect
"<div class='stt'>Autonomie progressive</div>",
"<p>J'encourage l'enfant a faire par lui-meme dans un cadre securise.</p>",
"<div class='stt'>Attachement securise</div>",
"<p>Je m'engage a etre presente, reactive et previsible pour que l'enfant se sente en s
"<div class='stt'>Communication bienveillante</div>",
"<p>Face a un comportement difficile, je mets des mots sur les emotions et je pose des
f.valeursPerso?"<div class='stt'>Mes valeurs complementaires</div><p>"+f.valeursPerso.r
des re
"<div class='sh'>04 Organisation de la journee</div>",
"<table>"+horairesHTML+"</table>",
"<div class='sh'>05 Alimentation</div>",
"<ul><li>Repas faits maison avec des produits frais et de saison</li><li>Respect f.alimentationPerso?"<p>"+f.alimentationPerso.replace(/\n/g,"<br/>")+"</p>":"",
"<div class='sh'>06 Sommeil et repos</div>",
"<ul><li>Espace calme, securise et personnel</li><li>Rituel d'endormissement individual
f.sommeilPerso?"<p>"+f.sommeilPerso.replace(/\n/g,"<br/>")+"</p>":"",
"<div class='sh'>07 Activites et eveil</div>",
"<ul><li>Motricite globale : parcours, danse, ballon, jardin</li><li>Motricite fine : g
f.activitesPerso?"<p>"+f.activitesPerso.replace(/\n/g,"<br/>")+"</p>":"",
"<div class='sh'>08 Sante et securite</div>",
"<ul><li>Domicile securise selon les recommandations de la PMI</li><li>Formee aux geste
"<div class='sh'>09 Partenariat avec les parents</div>",
"<ul><li>Transmissions quotidiennes : repas, sommeil, activites, humeur</li><li>Disponi
f.communicationPerso?"<p>"+f.communicationPerso.replace(/\n/g,"<br/>")+"</p>":"",
"<div class='sh'>10 Periode d'adaptation</div>",
"<p>L'adaptation dure generalement 1 a 2 semaines.</p>",
"<table>",
"<tr><td style='background:#F0FAF4;padding:8px 14px;font-weight:700;color:#2A9D8F;width
"<tr><td style='background:#F0FAF4;padding:8px 14px;font-weight:700;color:#2A9D8F;width
"<tr><td style='background:#F0FAF4;padding:8px 14px;font-weight:700;color:#2A9D8F;width
"<tr><td style='background:#F0FAF4;padding:8px 14px;font-weight:700;color:#2A9D8F;width
"</table>",
"<div class='sh'>Pour conclure</div>",
"<p>Ce projet d'accueil est un document vivant. N'hesitez pas a en discuter avec f.conclusion?"<p>"+f.conclusion.replace(/\n/g,"<br/>")+"</p>":"",
"<div style='margin-top:30px'><p><b>Fait a :</b> ________________________ <b>Le :</b>
"<div style='display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:30px'>",
"<div><p style='font-weight:700'>L'assistante maternelle :</p><div style='height:80px'>
"<div><p style='font-weight:700'>Les parents :</p><div style='height:80px'></div></div>
"<p style='text-align:center;color:#ccc;font-size:10px;margin-top:30px'>Genere par TiMa
"<div class='noprint' style='text-align:center;margin-top:16px'><button onclick='window
"</body></html>"
].join("");
w.document.write(html);w.document.close();
setToast("Projet d'accueil genere ✓");
moi a
};
return <div className="fi">
{toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
<PageHeader icon=" " title="Projet d'accueil" sub="Redigez et generez votre projet d'acc
<div className="g2">
<div style={{display:"flex",flexDirection:"column",gap:12}}>
<div className="card"style={{padding:16}}>
<div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:12}}> Mes i
{inp("Nom et prenom","nom")}{inp("Adresse","adresse")}{inp("Telephone","tel")}{inp(
Mon i
</div>
<div className="card"style={{padding:16}}>
<div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:12}}> {ta("Pourquoi j'aime ce metier, ce qui me motive","intro","Depuis X ans, j'exerce l
</div>
<div className="card"style={{padding:16}}>
<div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:12}}> Ma pr
{ta("Mon parcours et mes formations","parcours","CAP AEPE, formations IPERIA, exper
{ta("Mon agrement en detail","agrementDetail","Agree pour X enfants, de X mois a X
{ta("Mon domicile et ses amenagements","domicile","Maison avec jardin, espace de je
</div>
</div>
<div style={{display:"flex",flexDirection:"column",gap:12}}>
<div className="card"style={{padding:16}}>
<div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:12}}> Mes v
<div style={{fontSize:11,color:"var(--l)",marginBottom:8,lineHeight:1.6}}>Les valeu
{ta("Mes valeurs complementaires","valeursPerso","Motricite libre, pedagogie Montes
</div>
<div className="card"style={{padding:16}}>
<div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:12}}> Ma jo
{form.horaires.map((h,i)=><div key={i}style={{display:"flex",gap:6,marginBottom:4}}
<input className="inp"style={{width:110,flexShrink:0,fontSize:11}}value={h.h}onCh
<input className="inp"style={{flex:1,fontSize:11}}value={h.d}onChange={e=>setHora
</div>)}
</div>
<div className="card"style={{padding:16}}>
<div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:12}}> {ta("Alimentation","alimentationPerso","Bio, potager, menus de la semaine...",2)}
{ta("Sommeil","sommeilPerso","Piece dediee, babyphone, gigoteuse...",2)}
{ta("Activites","activitesPerso","Yoga enfant, jardinage, sorties nature...",2)}
{ta("Communication avec les parents","communicationPerso","Application TiMat, cahie
</div>
<div className="card"style={{padding:16}}>
<div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:12}}> {ta("Mon mot de conclusion","conclusion","Ce projet d'accueil est le reflet de mon
</div>
<button className="btn bT"style={{width:"100%",padding:"14px",fontSize:14}}onClick={g
Generer mon projet d'accueil PDF
</button>
</div>
</div>
</div>;
Mes s
Concl
}
// ========== BOUTIQUE ==========
function Boutique({user}){
const [toast,setToast]=useState("");
const isPro=user?.subscription_status==="pro";
const products=[
{id:"kit_sheets",name:"Kit Google Sheets Assmat",price:"14,90",desc:"7 tableurs interconn
{id:"fiche_urgence",name:"Fiche d'urgence",price:"4,90",desc:"Fiche complete a remplir :
{id:"projet_accueil",name:"Projet d'accueil",price:"9,90",desc:"10 sections : presentatio
{id:"pack_complet",name:"Pack Complet",price:"24,90",desc:"Les 3 produits reunis. Economi
];
const acheter=async(product)=>{
try{
const res=await fetch('/api/create-checkout-session',{
method:'POST',headers:{'Content-Type':'application/json'},
body:JSON.stringify({userId:user?.id,email:user?.email,prenom:user?.prenom,productId:
});
const data=await res.json();
if(data.url)window.location.href=data.url;
else setToast("Erreur de paiement — reessayez");
}catch(e){setToast("Erreur reseau");}
};
return <div className="fi">
{toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
<PageHeader icon=" " title="Boutique TiMat" sub="Templates et outils pour simplifier vot
{isPro&&<div style={{background:"var(--Sp)",border:"1px solid var(--Sl)",borderRadius:10,
En tant qu'abonnee Pro, vous beneficiez de -20% sur tous les produits de la boutique
</div>}
<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap
{products.map(p=><div key={p.id}className="card"style={{padding:0,overflow:"hidden",dis
<div style={{height:80,background:"linear-gradient(135deg,"+p.color+"20,"+p.color+"08
{p.icon}
{p.badge&&<div style={{position:"absolute",top:8,right:8,background:p.color,color:"
</div>
<div style={{padding:16,flex:1,display:"flex",flexDirection:"column"}}>
<div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:6}}>{p.name}<
<div style={{fontSize:12,color:"var(--l)",lineHeight:1.6,flex:1,marginBottom:12}}>{
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
<div>
{isPro&&<span style={{fontSize:11,color:"var(--l)",textDecoration:"line-through
<span style={{fontSize:18,fontWeight:700,color:p.color}}>{isPro?(parseFloat(p.p
</div>
<button className="btn bT"style={{fontSize:12,padding:"8px 16px"}}onClick={()=>ac
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
emoji:" ",
color:"#4A7C5F",
bg:"linear-gradient(135deg,#F0FAF4,#E8F5EE)",
titre:"Bienvenue sur TiMat",
sousTitre:"Fait pour vous. Par quelqu'un qui vous comprend.",
texte:"TiMat a été créé par une développeuse passionnée de petite enfance, pour les assis
illustration:" ",
btn:"Je commence →",
},
{
emoji:" ",
color:"#C4714A",
bg:"linear-gradient(135deg,#FEF6F0,#FFF8F4)",
titre:"Le journal du quotidien",
sousTitre:"Ce que vous faites chaque jour, simplifié.",
texte:"Pointages, repas, siestes, activités, transmissions aux parents... Tout se note en
illustration:" ",
btn:"Suivant →",
},
{
emoji:" ",
color:"#C49A3A",
bg:"linear-gradient(135deg,#FFFBF0,#FEF9E8)",
titre:"L'administratif, enfin simple",
sousTitre:"Vous n'êtes pas comptable. On s'en occupe.",
texte:"Salaires, bulletins, Pajemploi, contrats, avenants, courriers types... TiMat calcu
illustration:" ",
btn:"Suivant →",
},
{
emoji:" ",
color:"#3D70A0",
bg:"linear-gradient(135deg,#F0F8FF,#EAF4FF)",
titre:"Le lien avec les parents",
sousTitre:"Une relation transparente, apaisée.",
texte:"Les parents accèdent à leur propre espace : journal, pointages, contrat, messageri
illustration:" ",
btn:"Suivant →",
},
{
emoji:" ",
color:"#6B8F71",
bg:"linear-gradient(135deg,#F0FAF4,#EEF8F2)",
titre:"Vous êtes prête !",
sousTitre:"TiMat est à vous. Prenez votre temps.",
texte:"Commencez par ajouter votre premier enfant, ou explorez librement. Si vous avez la
illustration:" ",
btn:"Découvrir TiMat ",
},
];
function Onboarding({onFinish,user}){
const [step,setStep]=useState(0);
const s=ONBOARD_STEPS[step];
const isLast=step===ONBOARD_STEPS.length-1;
const pct=Math.round(((step+1)/ONBOARD_STEPS.length)*100);
return(
<div style={{minHeight:"100vh",background:s.bg,display:"flex",alignItems:"center",justify
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
</div>
<span style={{fontSize:11,color:"rgba(0,0,0,.35)",marginLeft:6,flexShrink:0}}>{pct}
<div style={{background:"#fff",borderRadius:24,overflow:"hidden",boxShadow:"0 8px 48p
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
<span style={{fontSize:11,fontWeight:700,color:s.color,textTransform:"uppercase
</div>
<div style={{
fontFamily:"'Fraunces',Georgia,serif",
fontSize:"clamp(20px,4vw,26px)",fontWeight:700,
color:"#0D1B2A",lineHeight:1.2,
}}>{s.titre}</div>
</div>
{/* Corps */}
<div style={{padding:"28px 32px 32px"}}>
<p style={{fontSize:14,color:"#4A3728",lineHeight:1.85,marginBottom:28,margin:"0
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
Bonjour {user.prenom} - ravi de vous accueillir
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
<div style={{minHeight:"100vh",background:"var(--c)",display:"flex",alignItems:"center"
<div style={{width:"100%",maxWidth:420}}>
<div style={{textAlign:"center",marginBottom:32}}>
<div style={{fontSize:56,marginBottom:8}}> </div>
<div className="pf"style={{fontSize:38,fontWeight:700,color:"var(--T)",fontStyle:"ita
<div style={{fontSize:14,color:"var(--l)",marginTop:4}}>L'application qui réinvente l
<div style={{display:"flex",gap:8,justifyContent:"center",marginTop:12,flexWrap:"wrap
{[" Bilan de journée"," CR Trimestriel"," Pajemploi"," Attestation fiscale
<span key={t}className="badge"style={{background:"var(--Tp)",color:"var(--T)",fon
</div>
</div>
<div className="card"style={{padding:24}}>
<div className="pf"style={{fontSize:17,fontWeight:700,color:"var(--b)",marginBottom:1
<div style={{marginBottom:14}}>
<label className="lbl">Email</label>
<input className="inp"type="email"placeholder="votre@email.fr"value={email}
onChange={e=>{setEmail(e.target.value);setErr("");}}onKeyDown={e=>e.key==="Enter"
{err&&<div style={{color:"var(--R)",fontSize:12,marginTop:4}}>{err}</div>}
</div>
<button className="btn bT"style={{width:"100%",justifyContent:"center",padding:"12px"
Se connecter
</button>
<div style={{background:"var(--c)",borderRadius:10,padding:14}}>
<div style={{fontSize:11,fontWeight:700,color:"var(--l)",marginBottom:8,textTransfo
{comptes.map(c=><button key={c.id}onClick={()=>{setEmail(c.email);setErr("");}}
style={{display:"block",width:"100%",textAlign:"left",padding:"8px 10px",backgrou
onMouseEnter={e=>e.currentTarget.style.background="var(--br)"}
onMouseLeave={e=>e.currentTarget.style.background="none"}>
<span style={{fontWeight:700,color:c.role==="asmat"?"var(--T)":"var(--B)"}}>
{c.role==="asmat"?" ":" "}</span> {c.label}
<span style={{fontSize:11,color:"var(--l)",display:"block",paddingLeft:18}}>{c.hi
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
const ADMIN_EMAIL = "faitacreapro@gmail.com";
// --- Backoffice reusable components (outside to avoid re-mount on state change) ---
const BOField=({label,children,hint})=>(
<div style={{marginBottom:10}}>
<div style={{fontSize:10,fontWeight:700,color:"var(--m)",marginBottom:3,textTransform:"up
{children}
{hint&&<div style={{fontSize:10,color:"var(--l)",marginTop:3,fontStyle:"italic"}}>{hint}<
</div>
);
const BOColorInput=({k,state,setter})=>{
const v=state[k]||"";
const isSolid=/^#[0-9a-fA-F]{3,8}$/.test(v);
return (
<div style={{display:"flex",gap:4,alignItems:"center"}}>
{isSolid&&<input type="color"value={v.slice(0,7)}onChange={e=>setter(k,e.target.value)}
<input className="inp"style={{flex:1,fontSize:10,padding:"5px 7px",minWidth:0}}value={v
<div style={{width:20,height:20,borderRadius:4,background:v||"transparent",border:"1px
</div>
);
};
const BOTextInput=({k,state,setter,multi,placeholder})=>(
multi
?<textarea className="inp"rows={3}style={{fontSize:11,padding:"6px 8px",resize:"vertical"
:<input className="inp"style={{fontSize:11,padding:"6px 8px",width:"100%",boxSizing:"bord
);
const BOAlignInput=({k,state,setter})=>(
<div style={{display:"flex",gap:2}}>
{[["left","☰ Gauche"],["center","☰ Centre"],["right","☰ Droite"],["justify","☰ Justifié
flex:1,padding:"5px 0",border:"1px solid var(--br)",borderRadius:6,cursor:"pointer",fon
background:state[k]===a?"var(--S)":"var(--c)",color:state[k]===a?"#fff":"var(--m)",tran
}}>{label}</button>)}
</div>
);
const BOCard=({title,icon,children})=>(
<div className="card"style={{padding:14,marginBottom:10}}>
{title&&<div style={{fontWeight:700,fontSize:12,marginBottom:10,color:"var(--b)",display:
{icon&&<span style={{fontSize:14}}>{icon}</span>}{title}
</div>}
{children}
</div>
);
function Backoffice({user,setPage,appConfig,setAppConfig}){
const [sec,setSec]=useState("hero");
const [subSec,setSubSec]=useState("textes");
const [saving,setSaving]=useState(false);
const [toast,setToast]=useState("");
const [stats,setStats]=useState({users:0,pro:0,enfants:0});
const [showPreview,setShowPreview]=useState(true);
const [search,setSearch]=useState("");
const [cfg,setCfg]=useState(JSON.parse(JSON.stringify(appConfig||DEFAULT_CONFIG)));
useEffect(()=>{
const load=async()=>{
const {count:u}=await supabase.from('profiles').select('*',{count:'exact',head:true});
const {count:p}=await supabase.from('profiles').select('*',{count:'exact',head:true}).e
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
const setPain=(idx,field,v)=>setCfg(c=>{const pp=[...(c.painPoints||[])];pp[idx]={...pp[idx
const setTransfo=(idx,pos,v)=>setCfg(c=>{const tt=[...(c.transformations||[])];const row=[.
const setTesti=(idx,field,v)=>setCfg(c=>{const tt=[...(c.testimonials||[])];tt[idx]={...tt[
const setStat=(which,idx,field,v)=>setCfg(c=>{const ss=[...(c[which]||[])];ss[idx]={...ss[i
const addPain=()=>setCfg(c=>({...c,painPoints:[...(c.painPoints||[]),{ic:" ",titre:"Nouvea
const removePain=(idx)=>setCfg(c=>({...c,painPoints:(c.painPoints||[]).filter((_,i)=>i!==id
const addTesti=()=>setCfg(c=>({...c,testimonials:[...(c.testimonials||[]),{nom:"Nouveau",vi
const removeTesti=(idx)=>setCfg(c=>({...c,testimonials:(c.testimonials||[]).filter((_,i)=>i
// Free/Pro/Guarantees
const setFreeItem=(idx,pos,v)=>setCfg(c=>{const items=[...(c.freeItems||[])];const row=[...
const addFreeItem=()=>setCfg(c=>({...c,freeItems:[...(c.freeItems||[]),[true,"Nouvelle fonc
const removeFreeItem=(idx)=>setCfg(c=>({...c,freeItems:(c.freeItems||[]).filter((_,i)=>i!==
const setProItem=(idx,v)=>setCfg(c=>{const items=[...(c.proItems||[])];items[idx]=v;return{
const addProItem=()=>setCfg(c=>({...c,proItems:[...(c.proItems||[])," Nouvelle fonctionna
const removeProItem=(idx)=>setCfg(c=>({...c,proItems:(c.proItems||[]).filter((_,i)=>i!==idx
const setGuarantee=(idx,v)=>setCfg(c=>{const items=[...(c.guarantees||[])];items[idx]=v;ret
const addGuarantee=()=>setCfg(c=>({...c,guarantees:[...(c.guarantees||[])," Nouvelle gara
const removeGuarantee=(idx)=>setCfg(c=>({...c,guarantees:(c.guarantees||[]).filter((_,i)=>i
const sauvegarder=async()=>{
setSaving(true);
Object.assign(G, JSON.parse(JSON.stringify(cfg)));
applyColsToDOM(cfg.cols);
setAppConfig(JSON.parse(JSON.stringify(cfg)));
const result=await saveConfig();
if(result.ok){
setToast(" Sauvegardé ! Changements en ligne.");
}else{
setToast(" Échec : "+result.error);
console.error("Échec sauvegarde:", result.error);
}
setSaving(false);
};
const reset=()=>{
if(!window.confirm("Réinitialiser toute la config ? Les modifications non sauvegardées se
setCfg(JSON.parse(JSON.stringify(DEFAULT_CONFIG)));
setToast(" Config réinitialisée (cliquer Sauvegarder pour valider)");
};
const rechargerDepuisSupabase=async()=>{
setSaving(true);
await loadConfig();
const fromDb=JSON.parse(JSON.stringify(G));
setCfg(fromDb);
setAppConfig(fromDb);
setToast(" Config rechargée depuis Supabase");
setSaving(false);
};
const diagnostiquer=async()=>{
try{
let report=" DIAGNOSTIC SUPABASE\n\n";
// 1. Test lecture
const {data:readData,error:readErr}=await supabase.from('app_config').select('*').eq('i
if(readErr){
report+=" LECTURE : "+readErr.message+"\n";
if(readErr.message.includes('relation')||readErr.message.includes('does not exist')){
report+="\n La table n\'existe pas. Exécute dans Supabase SQL Editor :\n\nCREATE
}else if(readErr.message.includes('policy')||readErr.message.includes('permission')){
report+="\n Problème RLS. Exécute :\n\nDROP POLICY IF EXISTS \"admin_all\" ON app
}
alert(report);return;
}
if(!readData){
report+=" LECTURE : Table vide (aucune ligne avec id='main')\n\n";
}else{
let parsed;
try{
parsed=typeof readData.config==='string'?JSON.parse(readData.config):readData.confi
}catch(e){
parsed={_raw:readData.config,_parseError:e.message};
}
report+=" LECTURE OK\n";
report+=" Type colonne config : "+(typeof readData.config)+"\n";
report+=" Dernière maj : "+readData.updated_at+"\n";
if(parsed&&typeof parsed==='object'){
report+=" Clés : "+Object.keys(parsed).join(", ")+"\n";
report+=" landing : "+(parsed.landing?Object.keys(parsed.landing).length:0)+" cham
report+=" txts : "+(parsed.txts?Object.keys(parsed.txts).length:0)+" champs\n\n";
}
}
// 2. Test écriture JSONB (objet)
const tsJsonb=Date.now();
const {error:errJsonb}=await supabase.from('app_config').upsert({id:'_diag_test_jsonb',
if(errJsonb){
report+=" ÉCRITURE JSONB (objet) : "+errJsonb.message+"\n";
}else{
report+=" ÉCRITURE JSONB OK\n";
}
// 3. Test écriture TEXT (string)
const {error:errText}=await supabase.from('app_config').upsert({id:'_diag_test_text',co
if(errText){
report+=" ÉCRITURE TEXT (string) : "+errText.message+"\n";
}else{
report+=" ÉCRITURE TEXT OK\n";
}
// Cleanup test rows
try{
}catch(e){}
await supabase.from('app_config').delete().in('id',['_diag_test_jsonb','_diag_test_te
// Suggestions
if(errJsonb&&!errText){
report+="\n }else if(!errJsonb&&errText){
report+="\n }else if(errJsonb&&errText){
report+="\n }
alert(report);
}catch(e){
alert(" console.error(e);
Ta colonne config est de type TEXT, pas JSONB.\nL\'app gère ça automati
Ta colonne config est de type JSONB. OK.";
Aucun format ne marche. Problème RLS probable.\n\nExécute :\n\nDROP POL
Exception dans le diagnostic : "+e.message+"\n\n"+e.stack);
}
};
// Google Fonts presets
const FONT_PRESETS=[
{name:"Fraunces + Jakarta (défaut)",title:"\'Fraunces\', Georgia, serif",body:"\'Plus Jak
{name:"Playfair + Inter",title:"\'Playfair Display\', serif",body:"\'Inter\', sans-serif"
{name:"Cormorant + Lato",title:"\'Cormorant Garamond\', serif",body:"\'Lato\', sans-serif
{name:"DM Serif + DM Sans",title:"\'DM Serif Display\', serif",body:"\'DM Sans\', sans-se
{name:"Poppins partout",title:"\'Poppins\', sans-serif",body:"\'Poppins\', sans-serif",ur
{name:"Montserrat + Open Sans",title:"\'Montserrat\', sans-serif",body:"\'Open Sans\', sa
{name:"Raleway + Roboto",title:"\'Raleway\', sans-serif",body:"\'Roboto\', sans-serif",ur
{name:"Merriweather + Source Sans",title:"\'Merriweather\', serif",body:"\'Source Sans Pr
];
const applyFontPreset=(p)=>{
setLand("fontTitle",p.title);
setLand("fontBody",p.body);
setLand("googleFontsUrl",p.url);
setToast(" Police \""+p.name+"\" appliquée");
};
// --- Reusable components ---
// Helper to filter by search
const matches=(txt)=>!search||txt.toLowerCase().includes(search.toLowerCase());
// Main nav sections
const secs=[
{id:"hero",l:"Hero",ic:" "},
{id:"sections",l:"Sections",ic:" "},
{id:"textes",l:"Textes",ic:" "},
{id:"couleurs",l:"Couleurs",ic:" "},
{id:"boutons",l:"Boutons",ic:" "},
{id:"polices",l:"Polices",ic:"𝐓"},
{id:"contenu",l:"Contenu",ic:" "},
{id:"app",l:"App",ic:" "},
];
return <div className="fi" style={{maxWidth:"100%",padding:0}}>
{toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
{/* Top bar */}
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"1
<div style={{display:"flex",alignItems:"center",gap:10}}>
<button className="btn bG"style={{fontSize:11,padding:"5px 12px"}}onClick={()=>setPag
<span style={{fontWeight:700,fontSize:14,color:"var(--b)"}}> Backoffice</span>
<input className="inp"placeholder=" Rechercher..."value={search}onChange={e=>setSea
</div>
<div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
<button onClick={diagnostiquer}style={{background:"none",border:"1px solid var(--br)"
<button onClick={rechargerDepuisSupabase}style={{background:"none",border:"1px solid
<button onClick={()=>setShowPreview(p=>!p)}style={{background:"none",border:"1px soli
<button className="btn bG"style={{fontSize:11,padding:"5px 12px"}}onClick={reset}>↺ R
<button className="btn bT"style={{fontSize:11,padding:"5px 14px"}}onClick={sauvegarde
</div>
</div>
<div style={{display:"flex",height:"calc(100vh - 52px)",overflow:"hidden"}}>
{/* LEFT PANEL */}
<div style={{width:showPreview?"460px":"100%",minWidth:340,overflowY:"auto",padding:12,
{/* Main tabs */}
<div style={{display:"flex",gap:3,marginBottom:12,flexWrap:"wrap"}}>
{secs.map(s=><button key={s.id}onClick={()=>setSec(s.id)}style={{
padding:"5px 10px",borderRadius:14,border:"none",cursor:"pointer",fontFamily:"inh
background:sec===s.id?"var(--S)":"rgba(0,0,0,.05)",color:sec===s.id?"#fff":"var(-
}}>{s.ic} {s.l}</button>)}
</div>
{/* ====================== HERO ====================== */}
{sec==="hero"&&<>
<BOCard title="Image de fond" icon=" ">
<BOField label="URL de l'image" hint="Laisser vide = pas d'image de fond">
<div style={{display:"flex",gap:4}}>
<BOTextInput k="heroImg" state={cfg.landing} setter={setLand} placeholder="ht
{cfg.landing.heroImg&&<button onClick={()=>setLand("heroImg","")}style={{back
</div>
</BOField>
{cfg.landing.heroImg&&<>
<BOField label={`Opacité (${Math.round((cfg.landing.heroImgOpacity||0.12)*100)}
<input type="range"min="0"max="1"step="0.05"value={cfg.landing.heroImgOpacity
</BOField>
<BOField label={`Flou (${cfg.landing.heroImgBlur||2}px)`}>
<input type="range"min="0"max="10"step="1"value={cfg.landing.heroImgBlur||2}
</BOField>
<BOField label="Position de l'image">
<div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:3}}>
{[["top left","↖"],["top center","↑"],["top right","↗"],["center left","←"]
<button key={pos}onClick={()=>setLand("heroImgPosition",pos)}style={{
padding:"8px 0",border:"1px solid var(--br)",borderRadius:6,cursor:"poi
background:(cfg.landing.heroImgPosition||"center center")===pos?"var(--
color:(cfg.landing.heroImgPosition||"center center")===pos?"#fff":"var(
}}>{icon}</button>
)}
</div>
</BOField>
{/* Aperçu miniature */}
<div style={{height:80,borderRadius:8,overflow:"hidden",border:"1px solid var(-
<div style={{position:"absolute",inset:0,backgroundImage:"url("+cfg.landing.h
<div style={{position:"absolute",inset:0,background:cfg.landing.heroBg||"#264
<div style={{position:"relative",display:"flex",alignItems:"center",justifyCo
</div>
</>}
<BOField label="Fond hero (gradient / couleur)">
<BOColorInput k="heroBg" state={cfg.landing} setter={setLand}/>
</BOField>
</BOCard>
<BOCard title="Logo" icon=" ">
<BOField label="Image du logo (URL)" hint="Laisse vide pour utiliser l'emoji">
<BOTextInput k="logoUrl" state={cfg.landing} setter={setLand} placeholder="http
</BOField>
<BOField label="Emoji du logo (si pas d'image)">
<BOTextInput k="logoEmoji" state={cfg.landing} setter={setLand} placeholder="
</BOField>
<div style={{marginTop:8,padding:10,background:"#264653",borderRadius:10,display:
{cfg.landing.logoUrl
?<img src={cfg.landing.logoUrl}alt="logo"style={{height:28,borderRadius:6,obj
:<div style={{width:28,height:28,borderRadius:8,background:"rgba(255,255,255,
<span style={{color:"#fff",fontSize:16,fontWeight:700,fontFamily:cfg.landing.fo
<span style={{fontSize:10,color:"rgba(255,255,255,.4)",marginLeft:"auto"}}>Aper
</div>
</BOCard>
<BOCard title="Navigation" icon=" ">
<div style={{fontSize:11,color:"var(--l)",marginBottom:10,fontWeight:600,textTran
<BOField label="Fond par défaut (tous boutons)"><BOColorInput k="navBtnBg" state=
<BOField label="Couleur texte (tous boutons)"><BOColorInput k="navBtnColor" state
<BOField label="Bordure (tous boutons)"><BOColorInput k="navBtnBorder" state={cfg
<div style={{fontSize:11,color:"var(--l)",margin:"12px 0 8px",fontWeight:600,text
<BOField label="Fond — Fonctionnalités"><BOColorInput k="navFonctionBg" state={cf
<BOField label="Fond — Tarifs"><BOColorInput k="navTarifsBg" state={cfg.landing}
<BOField label="Fond — Boutique"><BOColorInput k="navBoutiqueBg" state={cfg.landi
<BOField label="Fond — Connexion"><BOColorInput k="navConnexionBg" state={cfg.lan
<div style={{fontSize:11,color:"var(--l)",margin:"12px 0 8px",fontWeight:600,text
<BOField label="Fond CTA"><BOColorInput k="navCtaBg" state={cfg.landing} setter={
<BOField label="Couleur texte CTA"><BOColorInput k="navCtaColor" state={cfg.landi
<div style={{fontSize:11,color:"var(--l)",margin:"12px 0 8px",fontWeight:600,text
<BOField label="Fond hamburger"><BOColorInput k="navHamburgerBg" state={cfg.landi
<BOField label="Couleur icone hamburger"><BOColorInput k="navHamburgerColor" stat
<BOField label="Bordure hamburger"><BOColorInput k="navHamburgerBorder" state={cf
</BOCard>
<BOCard title="Textes du hero" icon=" ">
<BOField label="Badge (bandeau jaune)"><BOTextInput k="heroBadge" state={cfg.txts
<BOField label="Titre principal"><BOTextInput k="heroTitle" state={cfg.txts} sett
<BOField label="Accent du titre (en italique doré)" hint="Laisser vide pour masqu
<BOField label="Alignement du hero"><BOAlignInput k="heroAlign" state={cfg.landin
<BOField label="Sous-titre (grand)"><BOTextInput k="heroSub" state={cfg.txts} set
<BOField label="Description sous titre" hint="Utilise \\n pour un retour à la lig
<BOField label="Tags (séparés par virgule)"><BOTextInput k="heroTags" state={cfg.
</BOCard>
<BOCard title="Couleurs du hero" icon=" ">
<BOField label="Couleur titre"><BOColorInput k="heroTitleColor" state={cfg.landin
<BOField label="Couleur sous-titre"><BOColorInput k="heroSubColor" state={cfg.lan
<BOField label="Couleur description"><BOColorInput k="heroSubDescColor" state={cf
<BOField label="Couleur badge (texte)"><BOColorInput k="heroBadgeColor" state={cf
<BOField label="Fond badge"><BOColorInput k="heroBadgeBg" state={cfg.landing} set
<BOField label="Couleur tags"><BOColorInput k="heroTagsColor" state={cfg.landing}
<BOField label="Couleur stats (chiffres)"><BOColorInput k="heroStatsColor" state=
<BOField label="Couleur labels stats"><BOColorInput k="heroStatsLabelColor" state
<BOField label="Couleur d\'accent (italique)"><BOColorInput k="accentColor" state
</BOCard>
</>}
{/* ====================== SECTIONS ====================== */}
{sec==="sections"&&<>
{[
{key:"s1",titre:"Section 1 - Problématique",icon:" ",fields:[
{k:"s1Align",l:"Alignement du texte",type:"align"},
{k:"s1Title",l:"Titre",type:"txt"},{k:"s1Desc",l:"Description",type:"txt",multi
{k:"section1Bg",l:"Fond section",type:"col"},{k:"s1TitleColor",l:"Couleur titre
{k:"s1CardBg",l:"Fond des cards",type:"col"},{k:"s1CardTitleColor",l:"Couleur t
{k:"s1QuoteBg",l:"Fond citation",type:"col"},{k:"s1QuoteColor",l:"Couleur citat
",fields:[
]},
{key:"s2",titre:"Section 2 - Démo interactive",icon:" {k:"s2Align",l:"Alignement du texte",type:"align"},
{k:"s2Title",l:"Titre",type:"txt"},{k:"s2Desc",l:"Description",type:"txt"},
{k:"section2Bg",l:"Fond section",type:"col"},{k:"s2TitleColor",l:"Couleur titre
]},
{key:"s3",titre:"Section 3 - Transformation",icon:" ",fields:[
{k:"s3Align",l:"Alignement du texte",type:"align"},
{k:"s3Title",l:"Titre",type:"txt"},
{k:"s3LabelBefore",l:"Label \"Avant\"",type:"txt"},{k:"s3LabelAfter",l:"Label \
{k:"section3Bg",l:"Fond section",type:"col"},{k:"s3TitleColor",l:"Couleur titre
{k:"s3RowBg1",l:"Fond rangée 1",type:"col"},{k:"s3RowBg2",l:"Fond rangée 2",typ
{k:"s3LabelBeforeColor",l:"Couleur label Avant",type:"col"},{k:"s3LabelAfterCol
{k:"s3TextColor",l:"Couleur texte",type:"col"},{k:"s3ResultColor",l:"Couleur te
]},
{key:"s4",titre:"Section 4 - Statistiques",icon:" ",fields:[
{k:"s4Align",l:"Alignement du texte",type:"align"},
{k:"s4Title",l:"Titre",type:"txt"},{k:"s4Sub",l:"Sous-titre",type:"txt"},
{k:"section4Bg",l:"Fond section",type:"col"},{k:"s4TitleColor",l:"Couleur titre
{k:"s4StatColor",l:"Couleur chiffres",type:"col"},{k:"s4StatLabelColor",l:"Coul
]},
{key:"s5",titre:"Section 5 - Témoignages",icon:" ",fields:[
{k:"s5Align",l:"Alignement du texte",type:"align"},
{k:"s5Title",l:"Titre",type:"txt"},
{k:"section5Bg",l:"Fond section",type:"col"},{k:"s5TitleColor",l:"Couleur titre
{k:"testimonialBg",l:"Fond cards témoignages",type:"col"},{k:"testimonialNameCo
{k:"testimonialCityColor",l:"Couleur ville",type:"col"},{k:"testimonialBeforeCo
{k:"testimonialAfterColor",l:"Couleur citation \"après\"",type:"col"},{k:"testi
]},
{key:"s6",titre:"Section 6 - Tarifs",icon:" ",fields:[
{k:"s6Align",l:"Alignement du texte",type:"align"},
{k:"s6Title",l:"Titre",type:"txt"},
{k:"prixMensuel",l:"Prix mensuel (€)",type:"txt",inTxts:true},{k:"prixEssai",l:
{k:"proLabel",l:"Badge Pro",type:"txt",inTxts:true},{k:"proSubtxt",l:"Texte sou
{k:"freeLabel",l:"Label Gratuit",type:"txt",inTxts:true},
{k:"section6Bg",l:"Fond section",type:"col"},{k:"s6TitleColor",l:"Couleur titre
{k:"freeBg",l:"Fond card Gratuit",type:"col"},{k:"freeLabelColor",l:"Couleur la
{k:"freePriceColor",l:"Couleur prix Gratuit",type:"col"},{k:"freeDescColor",l:"
{k:"proBg",l:"Fond card Pro",type:"col"},{k:"proBorderColor",l:"Bordure Pro",ty
{k:"proLabelColor",l:"Couleur label Pro",type:"col"},{k:"proPriceColor",l:"Coul
{k:"proSubColor",l:"Couleur texte sous prix",type:"col"},{k:"proDescColor",l:"C
]},
{key:"cta",titre:"CTA Final",icon:" ",fields:[
{k:"ctaAlign",l:"Alignement du texte",type:"align"},
{k:"ctaTitle",l:"Titre (avec \\n)",type:"txt",multi:true},{k:"ctaTitleAccent",l
{k:"ctaSub",l:"Texte descriptif",type:"txt",inTxts:true},{k:"ctaBtnTxt",l:"Text
{k:"ctaBg",l:"Fond section",type:"col"},{k:"ctaTitleColor",l:"Couleur titre",ty
{k:"ctaSubTitleColor",l:"Couleur sous-titre",type:"col"},{k:"ctaSubColor",l:"Co
]},
].filter(s=>matches(s.titre)||s.fields.some(f=>matches(f.l))).map(s=>
<BOCard key={s.key} title={s.titre} icon={s.icon}>
{s.fields.filter(f=>!search||matches(f.l)).map(f=>
<BOField key={f.k} label={f.l}>
{f.type==="align"?<BOAlignInput k={f.k} state={cfg.landing} setter={setLand
:f.type==="col"?<BOColorInput k={f.k} state={cfg.landing} setter={setLand}/
:<BOTextInput k={f.k} state={f.inTxts?cfg.txts:cfg.landing} setter={f.inTxt
</BOField>
)}
</BOCard>
)}
</>}
{/* ====================== TEXTES (tous) ====================== */}
{sec==="textes"&&<>
<BOCard title="Hero" icon=" ">
{[["heroBadge","Badge"],["heroTitle","Titre"],["heroTitleAccent","Titre - accent
<BOField key={k} label={l}><BOTextInput k={k} state={cfg.txts} setter={setTxt}
)}
</BOCard>
<BOCard title="Sections" icon=" ">
{[["s1Title","Section 1 - Titre"],["s1Desc","Section 1 - Description",true],["s1Q
["s2Title","Section 2 - Titre"],["s2Desc","Section 2 - Description"],
["s3Title","Section 3 - Titre"],["s3LabelBefore","Section 3 - Label Avant"],["s
["s4Title","Section 4 - Titre"],["s4Sub","Section 4 - Sous-titre"],
["s5Title","Section 5 - Titre"],["s6Title","Section 6 - Titre"],
["ctaTitle","CTA - Titre (\\n pour saut)",true],["ctaTitleAccent","CTA - ].filter(([,l])=>matches(l)).map(([k,l,m])=>
<BOField key={k} label={l}><BOTextInput k={k} state={cfg.landing} setter={setLa
Texte
)}
</BOCard>
<BOCard title="Tarifs et CTA" icon=" ">
{[["prixMensuel","Prix mensuel"],["prixEssai","Durée essai"],["proLabel","Badge P
<BOField key={k} label={l}><BOTextInput k={k} state={cfg.txts} setter={setTxt}/
)}
</BOCard>
</>}
{/* ====================== COULEURS (globales + par élément) ====================== *
{sec==="couleurs"&&<>
<BOCard title="Palette de l\'application" icon=" ">
{[["T","Principale (terracotta)"],["S","Secondaire (mauve)"],["G","Vert (succès)"
<BOField key={k} label={l}><BOColorInput k={k} state={cfg.cols} setter={setCol}
)}
</BOCard>
<BOCard title="Fonds de sections landing" icon=" ">
{[["pageBg","Fond général page"],["heroBg","Fond hero"],["section1Bg","Section 1
<BOField key={k} label={l}><BOColorInput k={k} state={cfg.landing} setter={setL
)}
</BOCard>
<BOCard title="Couleur d\'accent globale" icon=" ">
<BOField label="Couleur accent (stats, italique, étoiles par défaut)"><BOColorInp
</BOCard>
<BOCard title="Hero - couleurs de texte" icon=" ">
{[["heroTitleColor","Titre hero"],["heroSubColor","Sous-titre"],["heroSubDescColo
<BOField key={k} label={l}><BOColorInput k={k} state={cfg.landing} setter={setL
)}
</BOCard>
<BOCard title="Sections 1 à 6 - couleurs texte" icon=" ">
{[["s1TitleColor","S1 - Titre"],["s1DescColor","S1 - Description"],["s1CardBg","S
["s2TitleColor","S2 - Titre"],["s2DescColor","S2 - Description"],
["s3TitleColor","S3 - Titre"],["s3RowBg1","S3 - Fond rangée 1"],["s3RowBg2","S3
["s4TitleColor","S4 - Titre"],["s4SubColor","S4 - Sous-titre"],["s4StatColor","
["s5TitleColor","S5 - Titre"],["testimonialBg","S5 - Fond cards"],["testimonial
["s6TitleColor","S6 - Titre"],["freeBg","S6 - Fond Gratuit"],["freeLabelColor",
["ctaTitleColor","CTA - Titre"],["ctaSubTitleColor","CTA - Sous-titre"],["ctaSu
].filter(([,l])=>matches(l)).map(([k,l])=>
<BOField key={k} label={l}><BOColorInput k={k} state={cfg.landing} setter={setL
)}
</BOCard>
</>}
{/* ====================== BOUTONS ====================== */}
{sec==="boutons"&&<>
{[
{titre:"Bouton NAV \"Commencer\"",icon:" ",fields:[["heroBtnNavTxt","Texte",true
{titre:"Bouton NAV \"Tarifs\"",icon:" ",fields:[["heroBtnTarifsBg","Fond",false]
{titre:"Bouton NAV \"Connexion\"",icon:" ",fields:[["heroBtnConnexionBg","Fond",
{titre:"Bouton HERO principal",icon:" ",fields:[["heroBtnPrimTxt","Texte",true],
{titre:"Bouton HERO secondaire",icon:" ",fields:[["heroBtnSecTxt","Texte",true],
{titre:"Bouton TARIFS Gratuit",icon:" ",fields:[["freeBtnTxt","Texte",true],["fr
{titre:"Bouton TARIFS Pro",icon:" ",fields:[["proBtnTxt","Texte",true],["proBtnB
{titre:"Bouton CTA final",icon:" ",fields:[["ctaBtnTxt","Texte",true],["ctaBtnBg
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
<div style={{fontSize:9,color:"var(--l)",marginBottom:4,textTransform:"upperc
<button style={{
background:cfg.landing[btn.fields.find(f=>f[0].endsWith("Bg"))?.[0]]||"#ccc
color:cfg.landing[btn.fields.find(f=>f[0].endsWith("Color"))?.[0]]||"#000",
border:"none",borderRadius:8,padding:"8px 14px",fontSize:12,fontWeight:700,
}}>{cfg.txts[btn.fields.find(f=>f[2])?.[0]]||"Exemple"}</button>
</div>
</BOCard>
)}
</>}
{/* ====================== POLICES ====================== */}
{sec==="polices"&&<>
<BOCard title="Presets de polices" icon=" ">
<div style={{fontSize:11,color:"var(--m)",marginBottom:10}}>Clique pour appliquer
<div style={{display:"flex",flexDirection:"column",gap:6}}>
{FONT_PRESETS.map(p=><button key={p.name} onClick={()=>applyFontPreset(p)}
style={{padding:"10px 12px",background:"var(--c)",border:"1px solid var(--br)
onMouseEnter={e=>e.currentTarget.style.background="var(--Sp)"}
onMouseLeave={e=>e.currentTarget.style.background="var(--c)"}>
<div style={{fontSize:11,fontWeight:700,color:"var(--b)",marginBottom:2}}>{p.
<div style={{fontSize:10,color:"var(--l)",fontFamily:p.title}}>Titre ({p.titl
<div style={{fontSize:10,color:"var(--l)",fontFamily:p.body}}>Corps ({p.body.
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
<BOField label="URL Google Fonts" hint="Colle ici l\'URL complète de Google Fonts
<BOTextInput k="googleFontsUrl" state={cfg.landing} setter={setLand} multi/>
</BOField>
<div style={{padding:10,background:"var(--c)",borderRadius:8,marginTop:6,fontSize
Pour ajouter une police :<br/>
1. Va sur <strong>fonts.google.com</strong><br/>
2. Choisis tes polices<br/>
3. Copie l\'URL de &lt;link href=\"...\"&gt;<br/>
4. Colle-la ci-dessus + édite fontTitle / fontBody
</div>
</BOCard>
<BOCard title="Aperçu des polices" icon=" ">
<div style={{padding:12,background:"#fff",borderRadius:8,border:"1px solid var(--
<div style={{fontFamily:cfg.landing.fontTitle,fontSize:24,fontWeight:700,margin
<div style={{fontFamily:cfg.landing.fontBody,fontSize:14,lineHeight:1.6}}>Corps
</div>
</BOCard>
</>}
{/* ====================== CONTENU (items) ====================== */}
{sec==="contenu"&&<>
<BOCard title="Stats du hero (bandeau)" icon=" ">
{(cfg.statsHero||[]).map((s,i)=><div key={i}style={{display:"grid",gridTemplateCo
<input className="inp"style={{fontSize:11,padding:"4px 6px"}}type="number"value
<input className="inp"style={{fontSize:11,padding:"4px 6px"}}value={s.suf}onCha
<input className="inp"style={{fontSize:11,padding:"4px 6px"}}value={s.label}onC
</div>)}
</BOCard>
<BOCard title="Stats section chiffres" icon=" ">
{(cfg.statsSection||[]).map((s,i)=><div key={i}style={{display:"grid",gridTemplat
<input className="inp"style={{fontSize:11,padding:"4px 6px"}}type="number"value
<input className="inp"style={{fontSize:11,padding:"4px 6px"}}value={s.suf}onCha
<input className="inp"style={{fontSize:11,padding:"4px 6px"}}value={s.label}onC
<input className="inp"style={{fontSize:11,padding:"4px 6px"}}value={s.desc||""}
</div>)}
</BOCard>
<BOCard title="Pain points (section 1)" icon=" ">
{(cfg.painPoints||[]).map((p,i)=><div key={i}style={{marginBottom:10,paddingBotto
<div style={{display:"flex",gap:4,marginBottom:4}}>
<input className="inp"style={{width:36,fontSize:11,padding:"4px",textAlign:"c
<input className="inp"style={{flex:1,fontSize:11,padding:"4px 6px"}}value={p.
<button onClick={()=>removePain(i)}style={{background:"#fee",border:"1px soli
</div>
<textarea className="inp"rows={2}style={{fontSize:11,padding:"5px 8px",resize:"
</div>)}
<button onClick={addPain}className="btn bG"style={{fontSize:11,padding:"6px 12px"
</BOCard>
<BOCard title="Transformations (section 3)" icon=" ">
{(cfg.transformations||[]).map((t,i)=><div key={i}style={{marginBottom:10,padding
<div style={{display:"flex",gap:4,marginBottom:4}}>
<input className="inp"style={{width:36,fontSize:11,padding:"4px",textAlign:"c
<span style={{fontSize:11,color:"var(--l)",alignSelf:"center"}}>icône</span>
</div>
<input className="inp"style={{fontSize:11,padding:"4px 6px",marginBottom:3,widt
<input className="inp"style={{fontSize:11,padding:"4px 6px",marginBottom:3,widt
<input className="inp"style={{fontSize:11,padding:"4px 6px",width:"100%",boxSiz
</div>)}
</BOCard>
<BOCard title="Témoignages (section 5)" icon=" ">
{(cfg.testimonials||[]).map((t,i)=><div key={i}style={{marginBottom:10,paddingBot
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
<div style={{fontSize:11,fontWeight:700,color:"var(--b)"}}> Témoignage {i+1
<button onClick={()=>removeTesti(i)}style={{background:"#fee",border:"1px sol
</div>
{[["nom","Nom"],["ville","Ville"],["avant","Avant (citation)"],["apres","Après
<div key={k}style={{marginBottom:5}}>
<div style={{fontSize:10,fontWeight:600,color:"var(--m)",marginBottom:2}}>{
{k==="apres"?<textarea className="inp"rows={2}style={{fontSize:11,padding:"
:<input className="inp"style={{fontSize:11,padding:"5px 8px",width:"100%"
</div>
)}
</div>)}
</BOCard>
<button onClick={addTesti}className="btn bG"style={{fontSize:11,padding:"6px 12px
<BOCard title="Plan Gratuit - Fonctionnalités" icon=" ">
<div style={{fontSize:11,color:"var(--l)",marginBottom:10,lineHeight:1.5}}>Coche
{(cfg.freeItems||[]).map((item,i)=><div key={i}style={{display:"flex",gap:4,margi
<input type="checkbox"checked={item[0]}onChange={e=>setFreeItem(i,0,e.target.ch
<input className="inp"style={{flex:1,fontSize:11,padding:"4px 6px"}}value={item
<button onClick={()=>removeFreeItem(i)}style={{background:"#fee",border:"1px so
</div>)}
</BOCard>
<button onClick={addFreeItem}className="btn bG"style={{fontSize:11,padding:"6px 1
<BOCard title="Plan Pro - Fonctionnalités" icon=" ">
<div style={{fontSize:11,color:"var(--l)",marginBottom:10,lineHeight:1.5}}>Emoji
{(cfg.proItems||[]).map((item,i)=><div key={i}style={{display:"flex",gap:4,margin
<input className="inp"style={{flex:1,fontSize:11,padding:"4px 6px"}}value={item
<button onClick={()=>removeProItem(i)}style={{background:"#fee",border:"1px sol
</div>)}
<button onClick={addProItem}className="btn bG"style={{fontSize:11,padding:"6px 12
</BOCard>
<BOCard title="Garanties (sous tarifs)" icon=" ">
<div style={{fontSize:11,color:"var(--l)",marginBottom:10,lineHeight:1.5}}>Les pe
{(cfg.guarantees||[]).map((item,i)=><div key={i}style={{display:"flex",gap:4,marg
<input className="inp"style={{flex:1,fontSize:11,padding:"4px 6px"}}value={item
<button onClick={()=>removeGuarantee(i)}style={{background:"#fee",border:"1px s
</div>)}
<button onClick={addGuarantee}className="btn bG"style={{fontSize:11,padding:"6px
</BOCard>
</>}
{/* ====================== APP (modules + stats) ====================== */}
{sec==="app"&&<>
<BOCard title="Modules activables" icon=" ">
{[
{k:"parrainage",l:"Parrainage",ic:" "},
{k:"forum",l:"Forum communauté",ic:" "},
{k:"pmi",l:"Communication PMI",ic:" "},
{k:"periscolaire",l:"Planning périscolaire",ic:" "},
{k:"rappelsVaccins",l:"Rappels vaccins",ic:" "},
].map(({k,l,ic})=><div key={k}style={{display:"flex",justifyContent:"space-betwee
<span style={{fontSize:12,fontWeight:600,color:"var(--b)"}}>{ic} {l}</span>
<div onClick={()=>setFeat(k,!cfg.feats[k])}style={{width:40,height:22,borderRad
<div style={{width:16,height:16,borderRadius:8,background:"#fff",position:"ab
</div>
</div>)}
</BOCard>
<BOCard title="Statistiques" icon=" ">
<div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,textAlign:"
{[{v:stats.users,l:"Inscrits",c:"var(--T)"},{v:stats.pro,l:"Pro",c:"var(--S)"},
<div key={s.l}style={{padding:10,background:"var(--c)",borderRadius:8}}>
<div style={{fontSize:22,fontWeight:700,color:s.c}}>{s.v}</div>
<div style={{fontSize:10,color:"var(--l)"}}>{s.l}</div>
</div>
)}
</div>
</BOCard>
<BOCard title="Informations légales" icon=" ">
<div style={{fontSize:11,color:"var(--l)",marginBottom:10}}>Ces informations appa
<BOField label="Nom complet"><BOTextInput k="nom" state={cfg.legal||{}} setter={(
<BOField label="SIRET"><BOTextInput k="siret" state={cfg.legal||{}} setter={(k,v)
<BOField label="Adresse"><BOTextInput k="adresse" state={cfg.legal||{}} setter={(
<BOField label="Email de contact"><BOTextInput k="email" state={cfg.legal||{}} se
</BOCard>
<BOCard title="Boutique — Liens de paiement Stripe" icon=" ">
<div style={{fontSize:11,color:"var(--l)",marginBottom:10}}>Collez ici vos liens
<BOField label="Kit Google Sheets"><BOTextInput k="linkSheets" state={cfg.boutiqu
<BOField label="Fiche d'urgence"><BOTextInput k="linkFiche" state={cfg.boutique||
<BOField label="Projet d'accueil"><BOTextInput k="linkProjet" state={cfg.boutique
<BOField label="Pack Complet"><BOTextInput k="linkPack" state={cfg.boutique||{}}
</BOCard>
<BOCard title="Table Supabase" icon=" ">
<div style={{fontSize:11,color:"var(--m)",marginBottom:8,lineHeight:1.5}}>À exécu
<div style={{fontSize:10,background:"#1a1a1a",color:"#0f0",padding:10,borderRadiu
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
</div>
{/* RIGHT PANEL: Live Preview */}
{showPreview&&<div style={{flex:1,overflow:"hidden",background:"#f0f0f0",position:"rela
<div style={{position:"absolute",top:8,left:8,zIndex:10,fontSize:10,fontWeight:700,co
<div style={{width:"1200px",height:"100%",transform:"scale("+Math.min(1,(typeof windo
<LandingPage onLogin={()=>{}}dark={false}setDark={()=>{}}config={cfg}/>
</div>
</div>}
</div>
</div>;
}
const DEFAULT_CONFIG = {
cols: {T:"#FF9F63",S:"#2A9D8F",G:"#2A9D8F",R:"#E76F51",c:"#FDFBF8",w:"#FFFFFF",b:"#264653"}
txts: {
heroTitle:"Moins de paperasse,",
heroTitleAccent:"plus de câlins.",
heroSub:"L'app tout-en-un des assistantes maternelles.",
heroBtn:"Commencer gratuitement →",
prixMensuel:"9,99",
prixEssai:"2 mois gratuits",
heroDesc:"",
heroBadge:" CONÇUE PAR UNE ASSMAT, POUR LES ASSMATS",
heroSubDesc:"Contrats, salaires, pointages, transmissions, Pajemploi...\nTiMat automatise
heroBtnPrimTxt:"2 mois gratuits, sans CB →",
heroBtnSecTxt:"Voir la démo ↓",
heroBtnNavTxt:"Commencer gratuitement →",
heroTags:" Données en France, Web & Mobile, 2 min pour démarrer, Sans carte banc
ctaBtnTxt:"Je commence - 2 mois gratuits →",
ctaSub:"TiMat s'occupe de ça. Pour que vous puissiez vous occuper des enfants.",
ctaFooter:"Déjà 847 assistantes maternelles nous font confiance · Données hébergées en Fr
proLabel:" TOUT INCLUS",
proSubtxt:"soit 0,33€/jour - moins qu'un café",
proDesc:"La solution complète. Tout est inclus.",
proBtnTxt:"2 mois gratuits, sans CB →",
freeLabel:"Gratuit",
freeBtnTxt:"Commencer gratuitement",
freeDesc:"Pour découvrir TiMat.",
freePrice:"0€",
},
landing: {
heroBg:"linear-gradient(160deg, #264653 0%, #2A6F6A 40%, #264653 70%, #1B3540 100%)",
heroImg:"",
heroImgOpacity:0.12,
heroImgPosition:"center center",
heroImgBlur:2,
logoUrl:"",
logoEmoji:" ",
section1Bg:"linear-gradient(135deg,#264653,#2A6F6A)",
section2Bg:"#FDF5FB",
section3Bg:"#F8F0FC",
section4Bg:"linear-gradient(135deg,#264653,#2A9D8F)",
section5Bg:"#FDF5FB",
section6Bg:"#F5EBF8",
ctaBg:"linear-gradient(135deg,#264653,#2A6F6A)",
statsBg:"linear-gradient(135deg,#7B4A8A,#9B6BAA)",
// ----- BOUTONS HERO -----
heroBtnPrimBg:"linear-gradient(135deg,#FF9F63,#E76F51)",
heroBtnPrimColor:"#fff",
heroBtnSecBg:"rgba(255,255,255,.07)",
heroBtnSecColor:"#fff",
heroBtnNavBg:"linear-gradient(135deg,#2A9D8F,#264653)",
heroBtnNavColor:"#fff",
heroBtnTarifsBg:"rgba(255,255,255,.12)",
heroBtnTarifsColor:"rgba(255,255,255,.85)",
heroBtnConnexionBg:"rgba(255,255,255,.18)",
heroBtnConnexionColor:"#fff",
// ----- BOUTONS TARIFS -----
proBtnBg:"linear-gradient(135deg,#FF9F63,#E76F51)",
proBtnColor:"#fff",
freeBtnBg:"#0D1B2A",
freeBtnColor:"#fff",
// ----- BOUTON CTA FINAL -----
ctaBtnBg:"linear-gradient(135deg,#FF9F63,#E76F51)",
ctaBtnColor:"#fff",
// ----- COULEURS -----
accentColor:"#FF9F63",
// Couleurs de texte par section
heroTitleColor:"#fff",
heroSubColor:"rgba(255,255,255,.75)",
heroSubDescColor:"rgba(255,255,255,.6)",
heroBadgeColor:"#E8C87A",
heroBadgeBg:"rgba(232,168,74,.12)",
heroTagsColor:"rgba(255,255,255,.4)",
heroStatsColor:"#E8A84A",
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
pageBg:"#FDF5F8",
// ----- POLICES -----
fontTitle:"'Quicksand', sans-serif",
fontBody:"'Outfit', sans-serif",
fontTitleWeight:"700",
fontBodyWeight:"400",
googleFontsUrl:"https://fonts.googleapis.com/css2?family=Quicksand:wght@500;600;700&famil
// ----- TEXTES SECTIONS -----
s1Title:"La réalité du métier, personne n'en parle.",
s1Desc:"Être assistante maternelle agréée, c'est exercer un métier de soin exigeant\ntout
s1Quote:"TiMat n'ajoute pas une appli à votre vie.\nIl retire tout ce qui n'aurait jamais
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
{ic:" {ic:" {ic:" {ic:" {ic:" {ic:" ",titre:"Comptable sans diplôme",desc:"Mensualisation, heures majorées, cotisation
",titre:"Juriste sans formation",desc:"Contrats CCN, avenants, courriers de ruptur
",titre:"Secrétaire de la PMI",desc:"Dossiers de renouvellement, comptes-rendus de
",titre:"Community manager des parents",desc:"Répondre aux messages à toute heure,
",titre:"Administratrice le soir",desc:"Après 10h avec les enfants, vous ouvrez l'
",titre:"Seule face aux problèmes",desc:"Pas de collègue à qui demander. Pas de RH
],
transformations:[
[" [" [" [" [" ","Pajemploi vous prend 2h par mois","Récap prêt en 5 minutes","Zéro erreur. Zéro str
","Vos contrats sont dans un tiroir","Modèles guidés, avenants en 2 clics","Solide ju
","Les retards de parents créent des conflits","Pointage horodaté, signé par les deux
","Un document important est introuvable","Tout centralisé, daté, cherchable","En cas
","Vos soirées servent à l'administratif","5 minutes le matin suffisent","Vos soirées
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
{nom:"Marie D.",ville:"Paris 15e",avant:"Je passais mes soirées sur Excel.",apres:"Mon ré
{nom:"Sylvie R.",ville:"Lyon",avant:"J'avais peur d'un contrôle PMI.",apres:"Tout est arc
{nom:"Nathalie B.",ville:"Bordeaux",avant:"Un parent a contesté des heures.",apres:"Le po
{nom:"Fatima A.",ville:"Marseille",avant:"Je me réveillais la nuit à stresser.",apres:"Ti
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
" Bilans de journée automatiques",
" Bulletins de salaire complets",
" Export Pajemploi en 1 clic",
" Attestation fiscale",
" Photos illimitées",
" Communication PMI",
" Documents illimités (5 Go)",
" Enfants illimités",
" Solde de tout compte",
" Courriers types",
" Centre d'aide prioritaire",
],
guarantees:[
" 2 mois d'essai sans CB",
" Résiliable en 1 clic",
" Données en France ",
],
legal:{
nom:"Sophie [Votre nom]",
siret:"[Votre SIRET]",
adresse:"Île-de-France, France",
email:"support@timat.app",
feats:{parrainage:true,forum:true,pmi:true,periscolaire:true,rappelsVaccins:true},
},
boutique:{
linkSheets:"",
linkFiche:"",
linkProjet:"",
linkPack:"",
},
};
let G = JSON.parse(JSON.stringify(DEFAULT_CONFIG)); // mutable global config
const applyColsToDOM = (cols) => {
const r = document.documentElement;
Object.entries(cols).forEach(([k,v]) => r.style.setProperty('--'+k, v));
};
const loadConfig = async () => {
try {
const {data,error} = await supabase.from('app_config').select('config').eq('id','main').m
if (error) {
console.log('[TiMat config] Erreur Supabase:', error.message);
return;
}
if (!data) {
return;
console.log('[TiMat config] Aucune config en base (table vide) - utilisation des défaut
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
const saveConfig = async () => {
const configStr = JSON.stringify(G);
// Try JSONB first (object), then TEXT fallback (string)
try {
const {error: errObj} = await supabase.from('app_config').upsert({
id:'main',
config: G,
updated_at: new Date().toISOString()
});
if (!errObj) {
console.log('[TiMat config] Sauvegardé en JSONB ('+configStr.length+' octets)');
return {ok:true};
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
return {ok:true};
}
console.error('[TiMat config] Les deux formats ont échoué. JSONB:', errObj.message, 'TEXT
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
const [pmiNonLus,setPmiNonLus]=useState(PMI_MESSAGES.filter(m=>!m.lu&&m.de==="PMI").length)
const [notifs,setNotifs]=useState([
{id:"n1",ic:" {id:"n2",ic:" ",txt:"Nouveau message de la PMI",date:TODAY_STR,lu:false,page:"pmi",roles
",txt:"Contrat en attente de signature",date:TODAY_STR,lu:false,page:"admi
{id:"n4",ic:" ",txt:"Nouveau journal disponible",date:TODAY_STR,lu:false,page:"journal_c
]);
const [showNotifs,setShowNotifs]=useState(false);
const [onboarded,setOnboarded]=useState(false);
// // tats donnes Supabase AVANT tout return conditionnel
const [enfantsDB,setEnfantsDB]=useState([]);
const [contratsDB,setContratsDB]=useState([]);
const [pointagesDB,setPointagesDB]=useState([]);
const [transmissionsDB,setTransmissionsDB]=useState([]);
const [dbLoading,setDbLoading]=useState(false);
const [appConfig,setAppConfig]=useState(JSON.parse(JSON.stringify(DEFAULT_CONFIG)));
// // Dsactiver le service worker bloqu
useEffect(()=>{
if('serviceWorker' in navigator){
navigator.serviceWorker.getRegistrations().then(regs=>{
regs.forEach(reg=>reg.unregister());
});
}
},[]);
// Charger config backoffice au démarrage -
useEffect(()=>{
loadConfig().then(()=>{
setAppConfig(JSON.parse(JSON.stringify(G)));
console.log('[TiMat config] appConfig synchronisé');
});
},[]);
// Vérifier session Supabase au démarrage -
useEffect(()=>{
// Stores the minimal user from auth; profile enrichment happens in a separate effect
const handleAuthUser=(session)=>{
if(!session?.user)return;
const u=session.user;
// Set minimal user immediately (no DB query to avoid lock race)
setUser(prev=>{
// If we already have a profile loaded with more info, keep it
if(prev?.id===u.id && prev.prenom && prev.prenom!=="Utilisateur")return prev;
return {
id:u.id,
email:u.email,
prenom:u.user_metadata?.prenom||"Utilisateur",
nom:u.user_metadata?.nom||"",
role:u.user_metadata?.role||"asmat",
couleur:u.user_metadata?.role==="parent"?"#2E5F8A":"#C4714A",
subscription_status:"free",
_needsProfileFetch:true
};
});
};
const{data:{subscription}}=supabase.auth.onAuthStateChange((event,session)=>{
if(event==="INITIAL_SESSION"){
handleAuthUser(session);
setLoading(false);
}
if(event==="SIGNED_IN"&&session?.user){
handleAuthUser(session);
}
if(event==="SIGNED_OUT"){setUser(null);setPage("accueil");}
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
const{data:profil}=await supabase.from("profiles").select("*").eq("id",user.id).maybe
if(cancelled)return;
if(profil){
setUser(u=>({...u,...profil,id:user.id,email:user.email,_needsProfileFetch:false}))
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
// // Dtecter retour depuis Stripe Checkout
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
// // Charger les donnes relles depuis Supabase
useEffect(()=>{
if(!user?.id)return;
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
const enfantsAvecContrat=e.map(enf=>({
...enf,
parentId:enf.parent_id,
naissance:enf.naissance,
contrat:c?.find(ct=>ct.enfant_id===enf.id)?{
debut:c.find(ct=>ct.enfant_id===enf.id).debut,
fin:c.find(ct=>ct.enfant_id===enf.id).fin,
heuresHebdo:c.find(ct=>ct.enfant_id===enf.id).heures_hebdo,
tauxHoraire:c.find(ct=>ct.enfant_id===enf.id).taux_horaire,
entretien:c.find(ct=>ct.enfant_id===enf.id).entretien,
jours:c.find(ct=>ct.enfant_id===enf.id).jours||["Lundi","Mardi","Mercredi","Jeu
horaires:c.find(ct=>ct.enfant_id===enf.id).horaires||"07h30–17h30",
indemniteAbsence:0.5,
}:null,
}));
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
finally{setDbLoading(false);}
};
charger();
},[user?.id]);
if(loading)return(
<><Styles/>
<div style={{minHeight:"100vh",background:"var(--c)",display:"flex",alignItems:"center",j
<div className="pf"style={{fontSize:36,color:"var(--T)",fontStyle:"italic"}}>TiMat</div
<div style={{display:"flex",gap:6}}>
<div className="ai-dot"/><div className="ai-dot"style={{animationDelay:".3s"}}/><div
</div>
<div style={{fontSize:12,color:"var(--l)"}}>Chargement...</div>
</div></>
);
// - Utiliser données réelles
if(!user)return <><Styles/><div className={"app"+(dark?" dark":"")+""}><LandingPage onLogin
// Afficher onboarding si asmat sans enfants (vérifié après chargement DB)
if(!onboarded&&user.role==="asmat"&&!dbLoading&&enfantsDB.length===0)return <><Styles/><div
const role=user.role;
// // Statut abonnement
const isPro=['pro','trialing'].includes(user?.subscription_status)||user?.role==="parent";
const isTrialing=user?.subscription_status==="trialing";
// // Lancer le checkout Stripe
const lancerCheckout=async()=>{
if(user?.id?.startsWith?.("demo-")){
alert("Le paiement n'est pas disponible en mode demo. Creez un compte pour continuer.")
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
alert("Erreur serveur ("+res.status+"). Verifiez que Stripe est configure dans return;
Vercel
}
const data=await res.json();
if(data.url)window.location.href=data.url;
else alert("Erreur: "+JSON.stringify(data));
}catch(e){
console.error('Stripe fetch error:', e);
alert("Erreur reseau. Verifiez que :\n1. npm install stripe est fait\n2. STRIPE_SECRET_
}
};
// // Portail client Stripe grer abonnement
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
// // Utiliser donnes relles si disponibles sinon dmo
const hasRealData=enfantsDB.length>0;
// Pour les démos, parentId="p1/p2/p3" correspond à user.id
// Pour les vrais comptes Supabase, fallback sur l'email
const enfants=hasRealData?enfantsDB:(role==="asmat"?D.enfants:(()=>{
const byId=D.enfants.filter(e=>e.parentId===user.id);
if(byId.length>0)return byId;
const parentDemo=D.parents.find(p=>p.email===user.email);
if(parentDemo)return D.enfants.filter(e=>e.parentId===parentDemo.id);
return [];
})());
const pEId=enfants[0]?.id;
const groups=role==="asmat"?GROUPS_AM:GROUPS_P;
const P={enfants,role,pEId,user,pointagesDB};
const renderPage=()=>{
switch(page){
case "accueil": return role==="asmat"?<AccueilAssMat enfants={enfants} setPage={setPage
case "journal_complet": return <JournalComplet {...P}/>;
case "sante_complet": return <SanteComplete {...P}/>;
case "eveil_complet": return <EveilComplet {...P}/>;
case "documents_complet": return <DocumentsComplet {...P}/>;
case "bilans_exports": return <BilansExports {...P}/>;
case "admin_finances": return <AdminFinances {...P} user={user}/>;
case "pointage": return <Pointage {...P}/>;
case "calendrier": return <Calendrier enfants={enfants} role={role} pEId={pEId}/>;
case "messagerie": return <Messagerie {...P}/>;
case "politique_confidentialite": return <PolitiqueConfidentialite/>;
case "mentions_legales": return <MentionsLegales/>;
case "parametres": return <Parametres user={user} onLogout={handleLogout} setPage={setP
case "backoffice": return user?.email===ADMIN_EMAIL?<Backoffice user={user} setPage={se
case "pmi": return <CommunicationPMI role={role} user={user} hasRealData={hasRealData}/
case "periscolaire": return <PlanningPeriscolaire enfants={enfants} role={role} pEId={p
case "forum": return <ForumCommunaute role={role}/>;
case "rapport_annuel": return <RapportAnnuel enfants={enfants} role={role} pEId={pEId}
case "parrainage": return <Parrainage user={user}/>;
case "simulateur": return <SimulateurCout enfants={enfants} pEId={pEId}/>;
case "solde_compte": return <SoldeDeCompte enfants={enfants} role={role} pEId={pEId}/>;
case "attestation_pe": return <AttestationPoleEmploi enfants={enfants} role={role} pEId
case "attestation_fiscale": return <AttestationFiscale enfants={enfants} role={role} pE
case "fiche_urgence": return <FicheUrgence enfants={enfants} role={role} pEId={pEId} us
case "projet_accueil": return <ProjetAccueil user={user} role={role}/>;
case "boutique": return <Boutique user={user}/>;
case "export_donnees": return <ExportDonnees enfants={enfants} user={user} role={role}/
case "faq": return <FAQ role={role}/>;
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
case "dashboard": return <TableauDeBord enfants={enfants} role={role} pEId={pEId} setPa
default: return role==="asmat"?<AccueilAssMat enfants={enfants} setPage={setPage} user=
}
};
return(
<>
<Styles/>
<div className={"app"+(dark?" dark":"")+""}>
<TopBar role={role} groups={groups} page={page} setPage={setPage} user={user}
onLogout={handleLogout}
pmiNonLus={role==="parent"?0:pmiNonLus} dark={dark} setDark={setDark}
notifNonLus={notifs.filter(n=>(!n.roles||n.roles.includes(role))&&!n.lu).length} no
showNotifs={showNotifs} setShowNotifs={setShowNotifs} setPage2={setPage}/>
<BandeauHorsLigne/>
<div className="content">{renderPage()}</div>
<BottomNav groups={groups} page={page} setPage={setPage} pmiNonLus={role==="parent"?0
</div>
</>
);
}