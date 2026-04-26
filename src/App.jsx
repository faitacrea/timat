import { useState, useRef, useEffect } from "react";
import { supabase } from "../lib/supabase.js";
// DATES
var _D=new Date();
var TODAY_STR=_D.getFullYear()+"-"+String(_D.getMonth()+1).padStart(2,"0")+"-"+String(
var TODAY_H=String(_D.getHours()).padStart(2,"0")+"h"+String(_D.getMinutes()).padStart
var TODAY_MONTH=String(_D.getMonth()+1).padStart(2,"0");
var TODAY_YEAR=String(_D.getFullYear());
function Styles(){return(
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@
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
    .dark .topbar,.dark .nav-main{background:rgba(13,27,30,.97)!important;border-color
    .dark .card{border-color:#1E3A34;background:rgba(19,36,40,.9)}
    .dark .inp,.dark .ta,.dark .sel{background:#0D1B1E;border-color:#2A4A44;color:#F0F
    .dark .lbl{color:#7FA8A0}
    .dark .btn{border-color:#2A4A44}
    .dark .pf{color:#F0F5F3}
    .dark h1,.dark h2,.dark h3,.dark h4{color:#F0F5F3}
_D.getD
(2,"0")
0,300;0
:#1E3A3 5F3}

 .dark .msg-me{background:#1A3A34!important;color:#F0F5F3!important}
.dark .msg-ot{background:#132428!important;color:#E0EBE8!important}
.dark details{background:#132428!important;border-color:#1E3A34!important}
.dark details summary{color:#F0F5F3!important}
.dark select option{background:#0D1B1E;color:#F0F5F3}
.app{min-height:100vh;background:var(--c);display:flex;flex-direction:column;width
.app::before{content:'';position:fixed;inset:0;background-image:url("data:image/sv
.card{background:rgba(255,255,255,.9);backdrop-filter:blur(8px);border-radius:var(
.card-lift{transition:transform .22s cubic-bezier(.34,1.56,.64,1),box-shadow .22s
.card-lift:hover{transform:translateY(-3px);box-shadow:var(--sh2)}
.pf{font-family:'Cormorant Garamond','Georgia',serif}
.topbar{position:sticky;top:0;z-index:100;background:rgba(255,255,255,.92);backdro
.logo{font-family:'Cormorant Garamond',serif;font-size:24px;font-weight:700;color:
.logo-dot{width:5px;height:5px;border-radius:50%;background:var(--S);margin-top:2p
.nav-main{background:rgba(255,255,255,.88);backdrop-filter:blur(16px);border-botto
.inp{width:100%;padding:11px 14px;border-radius:12px;border:1.5px solid var(--br);
.inp:focus{border-color:var(--S);box-shadow:var(--sh3)}
.ta{width:100%;padding:11px 14px;border-radius:12px;border:1.5px solid var(--br);f
.ta:focus{border-color:var(--S);box-shadow:var(--sh3)}
.sel{width:100%;padding:10px 14px;border-radius:12px;border:1.5px solid var(--br);
.lbl{display:block;font-size:11.5px;font-weight:600;color:var(--l);margin-bottom:5
.btn{display:inline-flex;align-items:center;gap:7px;padding:9px 18px;border-radius
.bT{background:linear-gradient(135deg,#C4714A,#D4824A);color:#fff;box-shadow:0 2px
.bT:hover{transform:translateY(-1px);box-shadow:0 4px 18px rgba(196,113,74,.4)}
.bS{background:linear-gradient(135deg,#9B6BAA,#B87CC8);color:#fff;box-shadow:0 2px
.bS:hover{transform:translateY(-1px);box-shadow:0 4px 18px rgba(155,107,170,.4)}
.bG{background:rgba(26,17,24,.06);color:var(--m);border:1px solid var(--br)}
.bG:hover{background:rgba(26,17,24,.1)}
.badge{display:inline-flex;align-items:center;justify-content:center;padding:2px 8
.content{flex:1;overflow-y:auto;overflow-x:hidden}
.fi{padding:20px;max-width:900px;margin:0 auto;width:100%;flex:1}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.g3{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.g4{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
@media(max-width:640px){.g2,.g3,.g4{grid-template-columns:1fr 1fr}}
@media(max-width:400px){.g2,.g3,.g4{grid-template-columns:1fr}}
.bar{height:6px;background:rgba(26,17,24,.08);border-radius:3px;overflow:hidden}
.bar-fill{height:100%;border-radius:3px;background:linear-gradient(90deg,var(--T),
.canv{border-radius:14px;border:2px solid var(--br);cursor:crosshair;touch-action:
.moo{border:2px solid transparent;border-radius:10px;padding:4px 6px;font-size:18p
.moo.on,.moo:hover{border-color:var(--S);background:var(--Sp);transform:scale(1.15
.msc{width:18px;height:18px;border-radius:50%;border:2px solid var(--br);display:i
.msc.ok{background:var(--G);border-color:var(--G);color:#fff}
.mood-bar{display:flex;gap:2px;height:32px;align-items:flex-end;margin-top:4px}
.mood-b{border-radius:3px 3px 0 0;background:linear-gradient(to top,var(--T),var(-
.ai-card{background:linear-gradient(135deg,var(--Sp),var(--Tp))!important;border-c
.ai-dot{width:7px;height:7px;border-radius:50%;background:var(--S);animation:ai-pu
:100%;p
g+xml,%
--r);bo
ease}
p-filte
var(--T
x}
m:1px s
font-si
ont-siz
font-si
px;lett
:12px;b
10px r 10px r
px;bord
var(--S
none;ba
x;curso
)}
nline-f
-S));mi
olor:va
lse 1.2

 @keyframes ai-pulse{0%,100%{transform:scale(1);opacity:.6}50%{transform:scale(1.3)
.cp{padding:7px 12px!important;display:inline-flex!important;align-items:center;ga
.cp.on{border-color:var(--S)!important;background:var(--Sp)!important}
::-webkit-scrollbar{width:4px;height:4px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:var(--br);border-radius:2px}
.div{height:1px;background:linear-gradient(90deg,transparent,var(--br),transparent
.sec-h{display:flex;align-items:center;gap:8px;margin-bottom:14px}
.sec-h-line{flex:1;height:1px;background:linear-gradient(90deg,var(--br),transpare
#bandeau-hl{display:none;background:linear-gradient(90deg,var(--T),var(--S));color
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
.bottom-nav{display:none;position:fixed;bottom:0;left:0;right:0;z-index:200;backgr
.dark .bottom-nav{background:rgba(13,27,30,.97)!important;border-top-color:#1E3A34
.bnav-btn{flex:1;display:flex;flex-direction:column;align-items:center;justify-con
.bnav-btn.active{background:rgba(155,107,170,.12)}
.bnav-btn .bnav-ic{font-size:22px;line-height:1;transition:transform .18s}
.bnav-btn.active .bnav-ic{transform:scale(1.12)}
.bnav-btn .bnav-lbl{font-size:10px;font-weight:600;letter-spacing:.1px;white-space
.bnav-btn.active .bnav-lbl{color:var(--S)}
@media(max-width:768px){.bottom-nav{display:flex}}
@media(hover:none){.card-lift:active{transform:scale(.98)}.btn:active{transform:sc
/* - CALENDRIER - */
.cgrid{display:grid;grid-template-columns:repeat(7,1fr);gap:3px}
.cday{min-height:38px;border-radius:8px;display:flex;flex-direction:column;align-i
.cday:hover{background:var(--Sp)}
.cday.tod{background:linear-gradient(135deg,var(--T),var(--S));color:#fff;font-wei
.cday.abs{background:var(--Rp);color:var(--R)}
.cday.cng{background:var(--Gp);color:var(--G)}
.cday.hol{background:var(--Bp);color:var(--B)}
/* - TOAST - */
.toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:v
@keyframes toast-in{from{opacity:0;transform:translateX(-50%) translateY(10px)}to{
/* - PHOTO GRID - */
.photo-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
@media(max-width:640px){.photo-grid{grid-template-columns:repeat(3,1fr)}}
/* - NAV TABS - */
.ntab{padding:6px 12px;border-radius:8px;border:none;background:transparent;cursor
;opacit
p:6px;c
);margi
nt)} :#fff;f
ound:rg
!import
tent:ce
:nowrap
ale(.96
tems:ce
ght:700
ar(--b)
opacity
:pointe

     .ntab.on{background:var(--Sp);color:var(--S);font-weight:700}
  `}</style>
);}
const D = {
  asmat:{id:"am1",role:"asmat",prenom:"Marie",nom:"Dupont",email:"marie.dupont@mail.fr
  parents:[
    {id:"p1",role:"parent",prenom:"Sophie",nom:"Martin",email:"sophie.martin@mail.fr",
    {id:"p2",role:"parent",prenom:"Thomas",nom:"Bernard",email:"thomas.bernard@mail.fr
    {id:"p3",role:"parent",prenom:"Camille",nom:"Petit",email:"camille.petit@mail.fr",
], enfants:[
    {id:"e1",prenom:"Léo",nom:"Martin",parentId:"p1",naissance:"2022-03-15",couleur:"#
      allergies:["Arachides","Noix de cajou"],groupe_sanguin:"A+",medecin:"Dr. Lefebvr
      vaccins:[{nom:"DTP",date:"2022-09-15",ok:true},{nom:"ROR",date:"2023-03-15",ok:t
      contrat:{debut:"2023-09-04",fin:"2024-08-31",heuresHebdo:40,tauxHoraire:4.05,jou
      signe:false},
    {id:"e2",prenom:"Emma",nom:"Bernard",parentId:"p2",naissance:"2021-11-22",couleur:
      allergies:["Lactose"],groupe_sanguin:"O+",medecin:"Dr. Martin - 01 34 56 78",
      vaccins:[{nom:"DTP",date:"2022-05-22",ok:true},{nom:"ROR",date:"2022-11-22",ok:t
      contrat:{debut:"2023-09-04",fin:"2024-08-31",heuresHebdo:35,tauxHoraire:4.05,jou
      signe:true},
    {id:"e3",prenom:"Noah",nom:"Petit",parentId:"p3",naissance:"2023-01-08",couleur:"#
      allergies:[],groupe_sanguin:"B+",medecin:"Dr. Durand - 01 45 67 89",
      vaccins:[{nom:"DTP",date:"2023-07-08",ok:true},{nom:"ROR",date:"2024-01-08",ok:f
      contrat:{debut:"2024-01-08",fin:"2024-12-31",heuresHebdo:45,tauxHoraire:4.05,jou
      signe:false},
  ],
  transmissions:[
    {id:"t1",eId:"e1",auteur:"asmat",date:TODAY_STR,h:"17h15",txt:"Super journée pour
    {id:"t2",eId:"e1",auteur:"parent",date:TODAY_STR,h:"07h28",txt:"Léo a peu dormi, p
    {id:"t3",eId:"e2",auteur:"asmat",date:TODAY_STR,h:"17h45",txt:"Emma a refusé la si
    {id:"t4",eId:"e3",auteur:"asmat",date:TODAY_STR,h:"17h00",txt:"Noah commence à mar
    {id:"t5",eId:"e3",auteur:"parent",date:TODAY_STR,h:"07h05",txt:"Nuit agitée, pouss
  ],
  messages:[
{id:"m1",eId:"e1",de:"parent",h:"08h02",txt:"Bonjour Marie ! Léo a bien dormi fina {id:"m2",eId:"e1",de:"asmat",h:"08h15",txt:"Bonjour Sophie ! Super, il arrive tout {id:"m3",eId:"e1",de:"parent",h:"16h30",txt:"Il peut rester un peu plus tard ce so {id:"m4",eId:"e3",de:"asmat",h:"10h22",txt:"Noah a fait ses 4 premiers pas ! J'ai {id:"m5",eId:"e3",de:"parent",h:"10h35",txt:"QUOIIIII Merci Marie vous êtes
  ],
  pointages:[
    {id:"pt1",eId:"e1",date:TODAY_STR,arr:"07h35",dep:"17h20",tot:"9h45",valide:true},
    {id:"pt2",eId:"e2",date:TODAY_STR,arr:"08h05",dep:null,tot:null,valide:false},
    {id:"pt3",eId:"e3",date:TODAY_STR,arr:"07h10",dep:"17h05",tot:"9h55",valide:true},
   ",agrem
couleur
",coule
couleur
3A72A8"
e - 01
rue},{n
rs:["Lu
"#4E7A5
rue},{n
rs:["Lu
C44E72"
alse},{
rs:["Lu
Léo ! I
etite f
este ma
cher !
e une d
lement
 souria
ir ? Mo
filmé, la me
i

   {id:"pt4",eId:"e1",date:"2024-03-08",arr:"07h40",dep:"17h25",tot:"9h45",valide:tru
  {id:"pt5",eId:"e2",date:"2024-03-08",arr:"08h00",dep:"18h00",tot:"10h00",valide:tr
  {id:"pt6",eId:"e3",date:"2024-03-08",arr:"07h05",dep:"17h10",tot:"10h05",valide:tr
], repas:[
  {id:"r1",eId:"e1",date:TODAY_STR,dej:"Tout mangé",gou:"Yaourt + compote",bib:null,
  {id:"r2",eId:"e2",date:TODAY_STR,dej:"1⁄2 portion",gou:"Pain + lait végétal",bib:nul
  {id:"r3",eId:"e3",date:TODAY_STR,dej:"Tout mangé",gou:"Compote",bib:"2×180ml",note
], changes:[
  {id:"ch1",eId:"e1",date:TODAY_STR,h:"09h15",type:"Propre",n:""},
  {id:"ch2",eId:"e1",date:TODAY_STR,h:"12h30",type:"Change",n:""},
  {id:"ch3",eId:"e3",date:TODAY_STR,h:"09h00",type:"Change",n:""},
  {id:"ch4",eId:"e3",date:TODAY_STR,h:"14h30",type:"Change",n:"Siège irrité, crème"}
],
heures:{"e1":{prev:160,real:152},"e2":{prev:140,real:138},"e3":{prev:180,real:178}},
absences:[
  {id:"ab1",eId:"e1",date:"2024-03-05",motif:"Maladie",indemnise:true,heures:9},
  {id:"ab2",eId:"e2",date:"2024-03-07",motif:"Décision parent",indemnise:true,heures
  {id:"ab3",eId:"e3",date:"2024-02-28",motif:"Congés parents",indemnise:false,heures
],
evenements:[
  {id:"ev1",date:"2024-03-15",type:"conge",txt:"Congés assmat",},
  {id:"ev2",date:"2024-03-20",type:"rdv",txt:"Réunion parents Emma"},
  {id:"ev3",date:"2024-03-25",type:"hol",txt:"Sortie Printemps"},
  {id:"ev4",date:"2024-04-01",type:"abs",txt:"Absent - Léo"},
],
portfolio:[
{id:"pf1",eId:"e1",date:TODAY_STR,titre:"Peinture cerisier",desc:"Coton-tige et pe {id:"pf2",eId:"e1",date:"2024-03-06",titre:"Plantation radis",desc:"Découverte des {id:"pf3",eId:"e2",date:"2024-03-09",titre:"Puzzle 12 pièces",desc:"Concentration {id:"pf4",eId:"e3",date:TODAY_STR,titre:"Premiers pas ",desc:"4 pas autonomes, s {id:"pf5",eId:"e3",date:"2024-03-04",titre:"Maracas maison",desc:"Riz dans bouteil
],
milestones:{
  "e1":[
    {id:"ms1",cat:"Langage",txt:"Dit des phrases de 3 mots",ok:true,age_attendu:"24-
    {id:"ms2",cat:"Langage",txt:"Nomme des couleurs",ok:true,age_attendu:"24-36 mois
    {id:"ms3",cat:"Social",txt:"Joue avec d'autres enfants",ok:true,age_attendu:"24-
    {id:"ms4",cat:"Motricité",txt:"Monte les escaliers seul",ok:true,age_attendu:"24
    {id:"ms5",cat:"Motricité",txt:"Saute à pieds joints",ok:false,age_attendu:"24-30
    {id:"ms6",cat:"Autonomie",txt:"Mange seul à la cuillère",ok:true,age_attendu:"18
], "e2":[
    {id:"ms7",cat:"Langage",txt:"Vocabulaire 200+ mots",ok:true,age_attendu:"24-30 m
    {id:"ms8",cat:"Langage",txt:"Pose des questions «pourquoi»",ok:true,age_attendu:
    {id:"ms9",cat:"Motricité",txt:"Court, saute, grimpe",ok:true,age_attendu:"24-36
 e}, ue}, ue},
notes:"
l,notes
s:"",q:
,
:8}, :9},
inture
 graine
remarqu
ourire
les, dé
30 mois
"},
36 mois
mois"}
 mois"}
-24 moi
ois"},
"30-36
mois"},

       {id:"ms10",cat:"Autonomie",txt:"S'habille partiellement seul",ok:true,age_attend
      {id:"ms11",cat:"Social",txt:"Partage ses jouets",ok:false,age_attendu:"30-42 moi
    ],
    "e3":[
      {id:"ms12",cat:"Motricité",txt:"Marche seul",ok:true,age_attendu:"9-15 mois"},
      {id:"ms13",cat:"Langage",txt:"Dit «mama» «papa»",ok:true,age_attendu:"10-14 mois
      {id:"ms14",cat:"Langage",txt:"Dit 5-10 mots",ok:false,age_attendu:"12-18 mois"},
      {id:"ms15",cat:"Social",txt:"Joue à «coucou»",ok:true,age_attendu:"9-12 mois"},
      {id:"ms16",cat:"Motricité",txt:"Tient un crayon",ok:false,age_attendu:"12-18 moi
], },
  moodHistory:{"e1":[4,3,4,5,4,4,3,5,4,4,5,4,3,4,5],"e2":[3,4,4,3,5,4,4,4,3,4,4,5,3,4,
};
//
const age=(d)=>{const n=new Date(d),t=new Date(),m=(t.getFullYear()-n.getFullYear())*1 const fmt=(s)=>s?new Date(s).toLocaleDateString("fr-FR"):"-";
const ini=(p,n)=>(p[0]+n[0]).toUpperCase();
const todayStr=()=>new Date().toLocaleDateString("fr-FR",{weekday:"long",day:"numeric" const moodVal={" ":5," ":4," ":3," ":2," ":1," ":1," ":5," ":2};
//
function Av({t,c,s=36}){return <div className="av"style={{width:s,height:s,background:
function CPill({e,sel,onClick}){return <div className={"card cp "+(sel?"on":"")+""}onC
  <span style={{fontSize:20}}>{e.emoji}</span><div><div style={{fontWeight:700,fontSiz
function Toast({msg,onClose}){useEffect(()=>{const t=setTimeout(onClose,3000);return() return<divclassName="toast"><span> </span>{msg}</div>}
function PageHeader({icon,title,sub,action}){return <div style={{marginBottom:14,displ
  <div><div className="pf"style={{fontSize:17,fontWeight:700,color:"var(--b)",marginBo
  {sub&&<div style={{fontSize:12,color:"var(--l)"}}>{sub}</div>}</div>{action}</div>}
//
function AccueilAssMat({enfants,setPage,user}){
  const pt=D.pointages.filter(p=>p.date===TODAY_STR);
  const tx=D.transmissions.filter(t=>t.date===TODAY_STR);
  const nonSigne=enfants.filter(e=>!e.contrat?.signe_asmat);
  const nbEnfants=enfants.length;
  const isDemoUser=enfants.every(e=>["e1","e2","e3"].includes(e.id));
const kpis=[
{icon:" ",val:nbEnfants>0?nbEnfants+"enfant"+(nbEnfants>1?"s":""):"Aucun",lbl:"E {icon:" ",val:"0",lbl:"Messagesnonlus",c:"var(--B)",page:"messagerie",hint:"→M {icon:" ",val:nbEnfants>0?"Actif":"-",lbl:"Journaldujour",c:"var(--S)",page:"jo {icon:" ",val:nbEnfants,lbl:"Contrat"+(nbEnfants>1?"s":"")+"actif"+(nbEnfants>1?
];
             u:"30-3 s"},
"},
s"},
4],"e3"
2+(t.ge
,month:
c+"22",
lick={o
e:13,co
=>clear
ay:"fle
ttom:2}
nfants
essage
urnal_
"s":""
r c )

 return <div className="fi">
  <div style={{marginBottom:18}}>
    <div style={{fontSize:11,color:"var(--l)",marginBottom:4,fontFamily:"'DM Mono',m
      {todayStr().toUpperCase()}
    </div>
    <div className="pf"style={{fontSize:26,fontWeight:600,color:"var(--b)",lineHeigh
    <div style={{fontSize:13,color:"var(--m)",marginTop:4}}>Votre espace professionn
</div>
  {/* Alerte contrats */}
  {nonSigne.length>0&&<div onClick={()=>setPage("admin_finances")}
style={{background:"linear-gradient(135deg,#FFF8E6,#FFF3D6)",border:"1.5px solid onMouseEnter={e=>e.currentTarget.style.transform="translateY(-1px)"} onMouseLeave={e=>e.currentTarget.style.transform="translateY(0)"}> <spanstyle={{fontSize:20}}> </span>
    <div style={{fontSize:13,color:"#7A5500",fontWeight:600,flex:1}}>
      {nonSigne.map(e=>e.prenom).join(", ")} - signature de contrat en attente
</div>
    <span style={{fontSize:12,color:"#B8892A",fontWeight:700}}>Signer →</span>
  </div>}
  {/* KPIs cliquables */}
  <div className="g4"style={{marginBottom:16}}>
    {kpis.map(k=><div key={k.lbl}className="card card-lift"onClick={()=>setPage(k.pa
      style={{padding:16,textAlign:"center",cursor:"pointer"}}>
      <div style={{fontSize:24,marginBottom:6}}>{k.icon}</div>
      <div className="pf"style={{fontSize:26,fontWeight:600,color:k.c,lineHeight:1}}
      <div style={{fontSize:11,color:"var(--l)",marginTop:4,lineHeight:1.3}}>{k.lbl}
      <div style={{fontSize:10,color:k.c,marginTop:6,fontWeight:600,opacity:.7}}>{k.
    </div>)}
  </div>
  {/* Enfants du jour - TOUT cliquable */}
  <div className="card"style={{padding:18,marginBottom:14}}>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",m <div style={{fontWeight:600,fontSize:14,color:"var(--b)"}}> Mes enfants aujo <button className="btn bG"style={{fontSize:11,padding:"5px 10px"}}onClick={()=
           Pointer arrivée
      </button>
    </div>
    <div className="g3">
      {enfants.map(e=>{
        const p=pt.find(x=>x.eId===e.id);
        const t=tx.filter(x=>x.eId===e.id).slice(-1)[0];
        const msg=enfants.every(e=>["e1","e2","e3"].includes(e.id))?D.messages.filte
        const rep=D.repas?.find(r=>r.eId===e.id&&r.date===TODAY_STR)||null;
   onospac
t:1.2}}
el</div
#E8B82
ge)}
>{k.val
</div>
hint}</
arginBo
urd'hu
>setPag
r(m=>m.
i

       const couleur=e.couleur||"#B8622F";
      const allergies=e.allergies||[];
      return <div key={e.id} style={{background:"var(--c)",borderRadius:14,padding
        {/* En-tête enfant cliquable → journal */}
        <div onClick={()=>setPage("journal_complet")}style={{display:"flex",gap:10
<spanstyle={{fontSize:28}}>{e.emoji||" "}</span> <div style={{flex:1}}>
            <div style={{fontWeight:700,fontSize:14,color:"var(--b)"}}>{e.prenom}<
            <div style={{fontSize:11,color:"var(--l)"}}>{e.naissance?age(e.naissan
          </div>
          {msg>0&&<span className="badge"onClick={ev=>{ev.stopPropagation();setPag
            style={{background:"var(--Rp)",color:"var(--R)",cursor:"pointer",fontS
            {msg}
          </span>}
        </div>
        {allergies.length>0&&<div onClick={()=>setPage("sante_complet")}
          style={{fontSize:11,color:"var(--R)",fontWeight:700,marginBottom:8,curso
             {allergies.join(", ")}
        </div>}
{p?<div onClick={()=>setPage("pointage")} style={{fontSize:12,color:"var(--S)",fontWeight:600,cursor:"pointer",mar ↗ {p.arr} {p.dep?"· ↘ "+p.dep:"· en cours "}
        </div>:<div onClick={()=>setPage("pointage")}
          style={{fontSize:12,color:"var(--l)",cursor:"pointer",marginBottom:6}}>
             Pas encore arrivé - pointer →
        </div>}
        {rep&&<div onClick={()=>setPage("journal_complet")}
          style={{fontSize:11,cursor:"pointer",color:"var(--G)",fontWeight:600,mar
{rep.dej}·{rep.q==="bien"?" ":" "} </div>}
        {t&&<div onClick={()=>setPage("journal_complet")}
          style={{fontSize:22,cursor:"pointer",display:"inline-block",transition:"
          onMouseEnter={ev=>ev.currentTarget.style.transform="scale(1.25)"}
          onMouseLeave={ev=>ev.currentTarget.style.transform="scale(1)"}>
          {t.mood}
        </div>}
</div>; })}
  </div>
</div>
{/* Accès rapide - tous cliquables */}
<div className="g2">
        :14,bor
,alignI
/div>
ce):""}
e("mess
ize:12}
r:"poin
ginBott
ginBott
transfo

 <div className="card"style={{padding:16}}>
<div style={{fontWeight:600,fontSize:13,marginBottom:12,color:"var(--b)"}}> {[[" ","Bilandejournée","Générerpourunenfant","recit"],
[" ","Développement","JalonsOMS","developpement"],
[" ","CRTrimestriel","Compte-rendupro","cr"],
[" ","Récapmensuel","Bilanmensuel","admin_finances"], [" ","Calendrier","Voirlesévénements","calendrier"],
        ].map(([ic,ti,su,pg])=><div key={ti}onClick={()=>setPage(pg)}
          style={{display:"flex",gap:10,padding:"8px 6px",borderBottom:"1px solid var(
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
        <div style={{fontWeight:600,fontSize:13,marginBottom:12,color:"var(--b)"}}>
        {isDemoUser&&D.evenements.slice(0,4).map(ev=><div key={ev.id}onClick={()=>setP
          style={{display:"flex",gap:8,padding:"7px 6px",borderBottom:"1px solid var(-
          onMouseEnter={ev2=>ev2.currentTarget.style.background="var(--c)"}
          onMouseLeave={ev2=>ev2.currentTarget.style.background="transparent"}>
          <span className="badge"style={{
            background:ev.type==="abs"?"var(--Rp)":ev.type==="conge"?"var(--Gp)":"var(
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
const [absence,setAbsence]=useState({date:TODAY_STR,motif:"Maladie",heures:"",indemn const [absEnvoyee,setAbsEnvoyee]=useState(false);
const [toast,setToast]=useState("");
      Accès
--br)",
Procha
age("ca
-br)",a
--Bp)",
ise:tru
  r
i

 if(!enfant)return(
  <div className="fi">
<PageHeadericon=" "title="Espacefamille"sub="BienvenuesurTiMat"/> <div className="card" style={{padding:28,textAlign:"center"}}>
<divstyle={{fontSize:48,marginBottom:12}}> </div>
<div style={{fontWeight:700,fontSize:16,color:"var(--b)",marginBottom:8}}>Aucu <div style={{fontSize:13,color:"var(--m)",lineHeight:1.7}}>
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
  D.absences.push({id:"ab"+Date.now(),eId:enfant.id,date:absence.date,motif:absence.
  // Ne pas modifier D.evenements (données démo globales)
  setAbsEnvoyee(true);
  setShowAbsence(false);
  setToast("Absence déclarée - "+(enfant?.prenomAsmat||"l'assmat")+" a été notifiée
};
return <div className="fi">
  {toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
  <div style={{marginBottom:14,display:"flex",justifyContent:"space-between",alignIt
    <div>
      <div className="pf"style={{fontSize:21,fontWeight:700,color:"var(--b)"}}>Bonjo
      <div style={{fontSize:12,color:"var(--l)",marginTop:2}}>{todayStr()}</div>
    </div>
    <button className="btn bR"style={{fontSize:12,padding:"8px 14px"}}onClick={()=>s
         Déclarer une absence
    </button>
</div>
  {/* Modale absence */}
  {showAbsence&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",di
    onClick={e=>e.target===e.currentTarget&&setShowAbsence(false)}>
    <div className="card"style={{width:"100%",maxWidth:420,padding:28}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"
        <div className="pf"style={{fontSize:18,fontWeight:600,color:"var(--b)"}}>
   n enfan
motif,i
✓");
ems:"fl
ur ! La
etShowA
splay:"
,margin
Déclar
 e

       <button onClick={()=>setShowAbsence(false)}style={{background:"none",border:
    </div>
    <div style={{background:"var(--Bp)",borderRadius:10,padding:"10px 14px",margin
         {enfant?.prenomAsmat||"L'assmat"} sera notifiée immédiatement. L'absence
    </div>
    <div style={{display:"grid",gap:12}}>
      <div>
        <label className="lbl">Date d'absence</label>
        <input type="date"className="inp"value={absence.date}onChange={e=>setAbsen
</div> <div>
        <label className="lbl">Motif</label>
        <select className="sel"value={absence.motif}onChange={e=>setAbsence(a=>({.
          <option>Maladie</option>
          <option>Congés parents</option>
          <option>Décision parent</option>
          <option>Rendez-vous médical</option>
          <option>Autre</option>
        </select>
      </div>
      <div>
        <label className="lbl">Heures prévues ce jour</label>
        <input type="number"className="inp"placeholder="ex: 9"value={absence.heure
      </div>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <input type="checkbox"id="indem"checked={absence.indemnise}onChange={e=>se
        <label htmlFor="indem"style={{fontSize:13,color:"var(--b)",cursor:"pointer
          Absence indemnisée (selon contrat)
        </label>
      </div>
    </div>
    <div style={{display:"flex",gap:8,marginTop:20}}>
      <button className="btn bG"style={{flex:1}}onClick={()=>setShowAbsence(false)
      <button className="btn bR"style={{flex:2}}onClick={declarerAbsence}>
           Notifier {enfant?.prenomAsmat||"l'assmat"}
      </button>
    </div>
  </div>
</div>}
{absEnvoyee&&<div style={{background:"var(--Rp)",border:"1.5px solid var(--R)",bor
     Absence déclarée et notée dans le calendrier et le décompte des heures.
</div>}
<div className="g2"style={{marginBottom:12}}>
  {/* Card enfant */}
  <div className="card"style={{padding:18,borderTop:"4px solid "+enfant.couleur}}>
   "none",
Bottom:
sera n
ce(a=>(
..a,mot
s}onCha
tAbsenc "}}>
}>Annul
derRadi
o

     <div style={{display:"flex",gap:14,alignItems:"center",marginBottom:12}}>
      <span style={{fontSize:52}}>{enfant.emoji}</span>
      <div><div className="pf"style={{fontSize:20,fontWeight:600,color:"var(--b)"}
        <div style={{fontSize:13,color:"var(--l)"}}>{age(enfant.naissance)}</div>
        {enfant.allergies.length>0&&<div style={{marginTop:6,cursor:"pointer"}}onC
          {enfant.allergies.map(a=><span key={a}className="badge"style={{backgroun
        </div>}
      </div>
    </div>
    {recentMs&&<div onClick={()=>setPage&&setPage("eveil_complet")}
      style={{background:"var(--Sp)",borderRadius:9,padding:"8px 12px",fontSize:13
         Dernière étape : {recentMs.txt} →
    </div>}
  </div>
  {/* Pointage */}
  <div className="card"onClick={()=>setPage&&setPage("pointage")}style={{padding:1
onMouseEnter={e=>e.currentTarget.style.boxShadow="var(--sh2)"} onMouseLeave={e=>e.currentTarget.style.boxShadow="var(--sh)"}>
<div style={{fontWeight:700,marginBottom:12,color:"var(--b)"}}> Pointage du {pt?<div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
      {[["Arrivée",pt.arr,"var(--S)"],["Départ",pt.dep||"En cours","var(--T)"],["T
        <div key={l}style={{textAlign:"center"}}><div style={{fontSize:11,color:"v
          <div className="pf"style={{fontSize:20,fontWeight:700,color:c}}>{v}</div
    </div>:<div style={{fontSize:13,color:"var(--l)"}}>Pas encore arrivé.</div>}
    <div style={{fontSize:11,color:"var(--l)",marginTop:8}}>Voir le détail →</div>
  </div>
</div>
{/* Transmissions */}
<div className="card"onClick={()=>setPage&&setPage("journal_complet")}
style={{padding:16,marginBottom:12,cursor:"pointer",transition:"box-shadow .18s" onMouseEnter={e=>e.currentTarget.style.boxShadow="var(--sh2)"} onMouseLeave={e=>e.currentTarget.style.boxShadow="var(--sh)"}>
<div style={{fontWeight:700,marginBottom:12,color:"var(--b)"}}> Journal de la {txs.length===0?<div style={{fontSize:13,color:"var(--l)"}}>Aucune transmission
    :txs.map(t=><div key={t.id}style={{display:"flex",gap:10,marginBottom:10}}>
      <div style={{fontSize:22}}>{t.mood}</div>
      <div style={{flex:1,background:t.auteur==="asmat"?"var(--Tp)":"var(--Bp)",bo
        borderLeft:(t.auteur==="asmat"?"3px solid var(--T)":"3px solid var(--B)")}
        <div style={{fontSize:11,fontWeight:700,color:t.auteur==="asmat"?"var(--T)
{t.auteur==="asmat"?" "+(user?.prenom||"Marie"):" Vous"} · {t.h}</ <div style={{fontSize:13,color:"var(--b)",lineHeight:1.5}}>{t.txt}</div>
      </div>
    </div>)}
</div>
{rep&&<div className="card"onClick={()=>setPage&&setPage("journal_complet")}
      }>{enfa
lick={(
d:"#FEE
,color:
8,curso
jour</
otal",p
ar(--l)
></div>
}}
journé
pour le
rderRad
}>
":"var(
div>
d
e

    style={{padding:16,cursor:"pointer",transition:"box-shadow .18s"}} onMouseEnter={e=>e.currentTarget.style.boxShadow="var(--sh2)"} onMouseLeave={e=>e.currentTarget.style.boxShadow="var(--sh)"}>
<div style={{fontWeight:700,marginBottom:10,color:"var(--b)"}}> Repas du jour< <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {rep.dej&&<span className="badge"style={{background:"var(--Sp)",color:"var(--S
        {rep.gou&&<span className="badge"style={{background:"var(--Gp)",color:"var(--G
        {rep.bib&&<span className="badge"style={{background:"var(--Bp)",color:"var(--B
        <span className="badge"style={{background:rep.q==="bien"?"var(--Sp)":"var(--Gp
{rep.q==="bien"?" Bon appétit":rep.q==="peu"?" Peu mangé":" Refus"}</s </div>
      <div style={{fontSize:11,color:"var(--l)",marginTop:8}}>Voir le détail →</div>
    </div>}
</div>; }
//
function Transmissions({enfants,role,pEId,user}){
const [selId,setSelId]=useState(enfants[0]?.id); const [msg,setMsg]=useState(""); const[mood,setMood]=useState(" ");
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
id:t.id,eId:t.enfant_id, auteur:t.auteur_role, date:t.date,h:t.heure||"", txt:t.texte,mood:t.mood||" "
}))); }else{
        setTxs(D.transmissions.filter(t=>t.eId===enfant?.id));
      }
};
    charger();
  },[enfant?.id]);
      /div>
)"}}>
)"}}>
)"}}>
)",colo
 pan>

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
    setTxs(p=>[...p,{id:data.id,eId:enfant.id,auteur:role,date:TODAY_STR,h:TODAY_H,t
  }else{
    // Fallback local si erreur
    setTxs(p=>[...p,{id:"tn"+Date.now(),eId:enfant.id,auteur:role,date:TODAY_STR,h:T
  }
setMsg("");
  setSending(false);
};
return <div className="fi">
<PageHeadericon=" "title="Journal"sub={"Échangesquotidiensavec"+(enfant?.pr {role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"
    {liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>setSelId(e.id
  {/* Documents reçus - parent seulement */}
  {role==="parent"&&bilansRecus.length>0&&<div className="card"style={{padding:16,ma
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
      <div style={{width:28,height:28,borderRadius:"50%",background:"var(--Pp)",disp
      <div style={{fontWeight:700,fontSize:14,color:"var(--P)"}}>Documents reçus de
    </div>
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      {bilansRecus.map(b=><div key={b.id}>
        <div onClick={()=>setDocOuvert(docOuvert===b.id?null:b.id)}
 style={{display:"flex",justifyContent:"space-between",alignItems:"center",
xt:msg,
ODAY_H,
enomAs
}}>
)}/>)}<
rginBot
lay:"fl
{enfant
padding
m

         <div>
          <div style={{fontWeight:700,fontSize:13,color:"var(--P)"}}>
{b.type==="bilan"?" Bilan de journée du "+b.date:" CR Trimestriel </div>
          <div style={{fontSize:11,color:"var(--l)",marginTop:2}}>Par {enfant?.pre
        </div>
        <span style={{fontSize:16,color:"var(--P)"}}>{docOuvert===b.id?"▲":"▼"}</s
      </div>
      {docOuvert===b.id&&<div style={{padding:"14px 16px",background:"var(--w)",bo
        <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:14,lineHeigh
          {b.txt}
        </div>
        <button className="btn bG"style={{marginTop:10,fontSize:11}}onClick={()=>n
             Copier
        </button>
      </div>}
    </div>)}
  </div>
</div>}
<div className="g2">
  <div className="card"style={{padding:16}}>
    <div style={{fontWeight:700,fontSize:14,marginBottom:12,color:"var(--b)"}}>{en
    <div style={{display:"flex",flexDirection:"column",gap:10,maxHeight:380,overfl
      {msgs.length===0&&<div style={{fontSize:13,color:"var(--l)"}}>Aucune transmi
      {msgs.map(t=><div key={t.id}style={{display:"flex",gap:10}}>
        <div style={{textAlign:"center",minWidth:38}}><div style={{fontSize:20}}>{
        <div style={{flex:1,background:t.auteur==="asmat"?"var(--Tp)":"var(--Bp)",
          borderLeft:(t.auteur==="asmat"?"3px solid var(--T)":"3px solid var(--B)"
          <div style={{fontSize:11,fontWeight:700,color:t.auteur==="asmat"?"var(--
{t.auteur==="asmat"?" "+(user?.prenom||"Marie"):" Parent"}</div> <div style={{fontSize:13,color:"var(--b)",lineHeight:1.5}}>{t.txt}</div>
        </div>
      </div>)}
    </div>
  </div>
  <div style={{display:"flex",flexDirection:"column",gap:12}}>
    <div className="card"style={{padding:16}}>
      <div style={{fontWeight:700,fontSize:14,marginBottom:12,color:"var(--b)"}}>
      <div style={{marginBottom:10}}>
        <label className="lbl">Humeur</label>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
{[" "," "," "," "," "," "," "," "].map(h=><button key={h}classN </div>
      </div>
      <div style={{marginBottom:10}}>
              <label className="lbl">Message</label>
- "+b.
nomAsma
pan>
rderRad
t:2,col
avigato
fant?.e
owY:"au
ssion.<
t.mood}
borderR
)}}>
T)":"va
Nouv
ame={"
 t
e

             <textarea className="ta"value={msg}onChange={e=>setMsg(e.target.value)}
              placeholder={role==="asmat"?("Racontez la journée de "+(enfant?.prenom||
</div>
<button className="btn bT"style={{width:"100%"}}onClick={send}>Envoyer </b </div>
        {D.moodHistory[enfant?.id]&&<div className="card"style={{padding:14}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:10,color:"var(--b)"}}>
          <div className="mood-bar">
            {D.moodHistory[enfant.id].map((v,i)=><div key={i}className="mood-b"style={
              height:(v/5*100)+"%",width:"100%",
              background:v>=4?"var(--S)":v>=3?"var(--G)":"var(--R)",opacity:.8}}/>)}
          </div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color
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
    "Ce matin, Léo est arrivé les yeux encore un peu lourds de sommeil, mais le sourir
    "La journée de Léo a débuté sur une note douce et apaisée. Il est entré dans la ma
], "e2":[
    "Emma a débarqué ce matin avec une énergie débordante et un grand sourire - elle a
    "Quelle belle journée avec Emma ! Elle est arrivée guillerette, avec un nouveau mo
  ],
  "e3":[
    "Aujourd'hui a été une journée historique pour Noah - et pour moi ! Il a fait ses
    "Noah a passé une journée douce et studieuse. Malgré sa petite dent qui pousse et
], };
const CRS={
  "e1":[
    "1. Bilan global du trimestre\n\nLéo a traversé ce trimestre avec une belle séréni
  ],
  "e2":[
    "1. Bilan global du trimestre\n\nEmma aborde ce trimestre avec une maturité impres
], "e3":[
    "1. Bilan global du trimestre\n\nNoah a vécu un trimestre extraordinaire, marqué p
  ],
"")+"..
utton>
Hume {
:"var(-
e n'a p ison en
vait vi t à la
quatre
une nui
té et u
sionnan
ar des
  u

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
{toast&&<Toast msg={toast}onClose={()=>setToast("")}/>} <PageHeadericon=" "title="Bilandejournée"
      sub="Journal personnalisé de la journée - rédigé automatiquement"/>
    {role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"
      {liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>{setSelId(e.i
    <div className="g2">
      <div>
        <div className={"card "+(recit?"ai-card":"")+""}style={{padding:18,marginBotto
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
            <div style={{width:32,height:32,borderRadius:"50%",background:"var(--Pp)",
            <div><div className="pf"style={{fontSize:15,fontWeight:700,color:"var(--P)
              <div style={{fontSize:11,color:"var(--l)"}}>Rédigé automatiquement · Exc
</div>
          {loading&&<div style={{display:"flex",alignItems:"center",gap:10,padding:"20
            <div className="ai-dot"/><div className="ai-dot"style={{animationDelay:".3
            <span style={{fontSize:13,color:"var(--m)",fontStyle:"italic"}}>Rédaction
 }}> d);setR
m:12,bo
display
"}}>Bil
lusif T
px 0"}}
s"}}/><
du bila

 </div>}
{!loading&&!recit&&<div style={{textAlign:"center",padding:"20px 0"}}> <divstyle={{fontSize:40,marginBottom:8}}> </div>
<div style={{fontSize:14,color:"var(--m)",lineHeight:1.6,marginBottom:16}}
        Générez un bilan chaleureux et personnalisé<br/>de la journée de <strong
      </div>
      <button className="btn bP"style={{fontSize:14,padding:"11px 22px"}}onClick
           Générer le bilan
      </button>
    </div>}
    {recit&&<div>
      <div style={{fontSize:14,color:"var(--b)",lineHeight:1.9,fontStyle:"italic
        {recit}
      </div>
      <div style={{marginTop:16,display:"flex",gap:8,flexWrap:"wrap",alignItems:
        {role==="asmat"&&!envoye&&<button className="btn bS"onClick={()=>{setEnv
             Envoyer aux parents
        </button>}
{role==="asmat"&&envoye&&<div style={{display:"flex",alignItems:"center" <spanstyle={{fontSize:14}}> </span>
<span style={{fontSize:13,fontWeight:700,color:"var(--S)"}}>Envoyé à {
</div>}
<button className="btn bP"onClick={generer}> Régénérer</button> <button className="btn bG"onClick={()=>navigator.clipboard?.writeText(re
      </div>
    </div>}
  </div>
</div>
<div style={{display:"flex",flexDirection:"column",gap:12}}>
  <div className="card"style={{padding:14}}>
<div style={{fontWeight:700,fontSize:13,marginBottom:10,color:"var(--b)"}}> {[[" Humeurs",tx.map(t=>t.mood).join(" ")||"-"],
["   Repas",rep?rep.dej:"-"],
[" Changes",ch.length+" change(s)"],
[" Activité",pf?.titre||"Jeux libres"],
    ].map(([l,v])=><div key={l}style={{display:"flex",justifyContent:"space-betw
      <span style={{color:"var(--m)"}}>{l}</span><span style={{fontWeight:600,co
    </div>)}
  </div>
  <div className="card"style={{padding:14,background:"var(--Pp)",border:"1px sol
    <div style={{fontWeight:700,fontSize:13,color:"var(--P)",marginBottom:8}}>
    <div style={{fontSize:13,color:"var(--b)",lineHeight:1.6}}>
      Aucun concurrent ne génère un bilan personnalisé de la journée. TiMat tran
    </div>
        > >{enfan
={gener
",white
"center
oye(tru
,gap:6,
parent?
cit)}>
Donn
een",pa
lor:"va
id var( Exclu
sforme
   é
s

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
          tot:p.total_minutes?Math.floor(p.total_minutes/60)+"h"+String(p.total_minute
          valide:true,valide_parent:p.valide_parent
}))); }else{
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
s%60).p

   return s+(h*60+(m||0));
},0);
const heuresPrev=Math.round((enfant?.contrat?.heuresHebdo||40)*52/12);
const soldeMin=heuresMois-heuresPrev*60/60;
const save=async()=>{
  if(!arr||!enfant)return;
  setSaving(true);
  const[h1,m1]=arr.split(":").map(Number);
  const totalMin=dep?(()=>{const[h2,m2]=dep.split(":").map(Number);return(h2*60+m2)-
  const totStr=totalMin?Math.floor(totalMin/60)+"h"+String(totalMin%60).padStart(2,"
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
setArr("");setDep("");setToast("Pointage enregistré ✓"); }else{
    setToast("Erreur - pointage sauvegardé localement");
  }
  setSaving(false);
};
const validerPointage=async(ptId)=>{
await supabase.from("pointages").update({valide_parent:true}).eq("id",ptId); setPts(p=>p.map(x=>x.id===ptId?{...x,valide_parent:true}:x)); setToast("Pointage validé ✓");
};
return <div className="fi">
{toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
<PageHeadericon=" "title="Pointagedesheures"sub="Suiviquotidienetbilanme {role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"
    {liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>setSelId(e.id
  <div className="g2">
 (h1*60+
0"):nul
nsuel"
}}>
)}/>)}<
/

 <div style={{display:"flex",flexDirection:"column",gap:12}}>
  <div className="card"style={{padding:16}}>
    <div style={{fontWeight:700,marginBottom:12,color:"var(--b)"}}>
    <div className="g3"style={{marginBottom:12}}>
Bilan du m
     {[
      ["Prévues",heuresPrev+"h","var(--B)"],
      ["Réalisées",Math.floor(heuresMois/60)+"h"+String(heuresMois%60).padStar
      ["Solde",(soldeMin>=0?"+":"")+Math.floor(soldeMin)+"h",soldeMin<0?"var(-
    ].map(([l,v,c])=>
      <div key={l}style={{background:"var(--c)",borderRadius:10,padding:12,tex
        <div className="pf"style={{fontSize:20,fontWeight:700,color:c}}>{v}</d
        <div style={{fontSize:11,color:"var(--l)",marginTop:2}}>{l}</div>
      </div>)}
  </div>
</div>
<div className="card"style={{padding:16}}>
<div style={{fontWeight:700,marginBottom:12,color:"var(--b)"}}> Aujourd'hu {ptJ?<div style={{background:"var(--Sp)",borderRadius:10,padding:12,border:"
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"cen
      {[["Arrivée",ptJ.arr,"var(--S)"],["→","","var(--l)"],["Départ",ptJ.dep||
        <div key={l}style={{textAlign:"center"}}><div style={{fontSize:11,colo
          <div className="pf"style={{fontSize:18,fontWeight:700,color:c}}>{v}<
    </div>
  </div>:<div style={{fontSize:13,color:"var(--l)",marginBottom:12}}>Pas encor
  {role==="asmat"&&<div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBott
      <div><label className="lbl">Arrivée</label><input type="time"className="
      <div><label className="lbl">Départ</label><input type="time"className="i
    </div>
    <button className="btn bS"style={{width:"100%"}}onClick={save}disabled={sa
{saving?" Sauvegarde...":"Enregistrer le pointage"}
</button>
{/* QR Code pour le parent */}
<details style={{marginTop:12,background:"var(--c)",borderRadius:10,overfl
<summary style={{padding:"10px 14px",cursor:"pointer",fontSize:12,fontWe <span> </span>QRCodepointage—{enfant?.prenom}
      </summary>
      <div style={{padding:"12px 14px",textAlign:"center"}}>
        <div style={{fontSize:11,color:"var(--l)",marginBottom:10,lineHeight:1
          Le parent scanne ce QR code pour valider l'arrivée ou le départ de {
</div> <img
          src={"https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=
            (window.location.origin||"https://timat-rho.vercel.app")+"/api/poi
          )}
          alt="QR Pointage"
          style={{width:180,height:180,borderRadius:12,border:"3px solid var(-
   ois -
t(2,"0"
-R)":"v
tAlign: iv>
i</div
1px sol
ter"}}>
"En cou
r:"var(
/div></
e point
om:8}}>
inp"val
np"valu
ving}>
ow:"hid
ight:60
.6}}>
enfant?
"+encod
ntage-q
-br)",m
{
>

           />
          <div style={{display:"flex",gap:6,marginTop:10,justifyContent:"center"
            <button className="btn bG"style={{fontSize:11}}onClick={()=>{
              navigator.clipboard?.writeText(
                (window.location.origin||"https://timat-rho.vercel.app")+"/api/p
              );
setToast("Lien copié ✓");
}}> Copier le lien</button>
<button className="btn bG"style={{fontSize:11}}onClick={()=>{
window.print();
}}> Imprimer</button>
          </div>
          <div style={{fontSize:10,color:"var(--l)",marginTop:8}}>
               Ce QR est unique à {enfant?.prenom} et valable aujourd'hui unique
          </div>
        </div>
      </details>
    </div>}
  </div>
</div>
<div className="card"style={{padding:16}}>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center" <div style={{fontWeight:700,color:"var(--b)"}}> Historique récent</div> {role==="parent"&&<div style={{fontSize:11,color:"var(--l)"}}>Tapez pour
  </div>
  <div style={{display:"flex",flexDirection:"column",gap:6}}>
    {ptH.slice(0,10).map(p=><div key={p.id}style={{
      display:"flex",justifyContent:"space-between",alignItems:"center",
      padding:"8px 10px",borderRadius:9,
      background:p.valide_parent?"var(--Sp)":role==="parent"?"var(--Gp)":"var(--
      border:role==="parent"&&!p.valide_parent?"1px solid var(--G)":"1px solid t
    }}>
      <div style={{fontSize:12,fontWeight:600,color:"var(--b)"}}>
        {new Date(p.date).toLocaleDateString("fr-FR",{weekday:"short",day:"numer
      </div>
<div style={{display:"flex",gap:10,fontSize:12}}>
<span style={{color:"var(--S)"}}>{p.arr?"↗"+p.arr:""}</span>
<span style={{color:"var(--T)"}}>{p.dep?"↘"+p.dep:""}</span>
<span style={{fontWeight:700,color:"var(--b)"}}>{p.tot||"-"}</span>
      </div>
      {role==="parent"&&!p.valide_parent
        ?<button onClick={()=>validerPointage(p.id)}
          style={{background:"var(--G)",color:"#fff",border:"none",borderRadius:
            padding:"4px 10px",cursor:"pointer",fontSize:11,fontWeight:700}}>Val
        :<span style={{fontSize:13,color:p.valide_parent?"var(--S)":"var(--l)"}}
{p.valide_parent?" ":" "} </span>
       }}>
ointage
ment.
,margin
valide
c)", ranspar
ic",mon
6, ider</b >
r

 } </div>)}
          {ptH.length===0&&<div style={{fontSize:13,color:"var(--l)",textAlign:"center
            Aucun pointage enregistré pour le moment.
          </div>}
        </div>
        {role==="parent"&&ptH.some(p=>!p.valide_parent)&&<div style={{
          marginTop:10,padding:"8px 12px",background:"var(--Gp)",borderRadius:8,
          fontSize:12,color:"var(--G)",fontWeight:600
        }}>
             {ptH.filter(p=>!p.valide_parent).length} pointage(s) en attente de valida
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
  const echs=ch.filter(c=>c.eId===enfant?.id&&c.date===TODAY_STR).sort((a,b)=>a.h>b.h?
  const erp=rp.find(r=>r.eId===enfant?.id&&r.date===TODAY_STR);
const addCh=()=>{if(!nch.h)return; setCh(p=>[...p,{id:"chn"+Date.now(),eId:enfant.id,date:TODAY_STR,h:nch.h.replace(" setNch({h:"",type:"Change",n:""});setToast("Change ajouté ✓");};
  const saveRp=()=>{
    setRp(p=>{const ex=p.find(r=>r.eId===enfant.id&&r.date===TODAY_STR);
      const up={...(ex||{id:"rn"+Date.now(),eId:enfant.id,date:TODAY_STR,notes:""}),
        dej:re.dej??erp?.dej,gou:re.gou??erp?.gou,bib:re.bib??erp?.bib,q:re.q??erp?.q?
return ex?p.map(r=>r===ex?up:r):[...p,up];}); setRe({});setToast("Repas enregistré ✓");};
  const qc={"bien":"var(--S)","peu":"var(--G)","refus":"var(--R)"};
  return <div className="fi">
{toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
<PageHeadericon=" "title="Repas&Changes"sub="Suivialimentaireethygiènedu {role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"
  {liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>setSelId(e.id
",paddi
tion
1:-1);
:","h")
?"bien"
jour" }}>
)}/>)}<
/

 <div className="g2">
  <div className="card"style={{padding:16}}>
    <div style={{fontWeight:700,fontSize:14,marginBottom:12,color:"var(--b)"}}>
    {erp?<div>
{[[" Déjeuner",erp.dej],[" Goûter",erp.gou],[" Biberon",erp.bib]].filt <div key={l}style={{display:"flex",gap:10,marginBottom:8,padding:"9px 12px <span>{l.split(" ")[0]}</span><div><div style={{fontSize:11,color:"var(- <div style={{fontSize:13,fontWeight:600,color:"var(--b)"}}>{v}</div></
      <div style={{display:"flex",alignItems:"center",gap:8,marginTop:6}}>
        <span style={{fontSize:12,color:"var(--l)"}}>Appétit :</span>
        <span className="badge"style={{background:qc[erp.q]+"22",color:qc[erp.q]}}
{erp.q==="bien"?" Bon appétit":erp.q==="peu"?" Peu mangé":" Refus" </div>
      {erp.notes&&<div style={{fontSize:12,color:"var(--m)",marginTop:6,fontStyle:
    </div>:<div style={{fontSize:13,color:"var(--l)"}}>Non renseigné.</div>}
    {role==="asmat"&&<div style={{marginTop:14,paddingTop:14,borderTop:"1px solid
      <div style={{fontWeight:700,fontSize:13,marginBottom:8,color:"var(--b)"}}>Me
      {[["dej","Déjeuner"],["gou","Goûter"],["bib","Biberon"]].map(([f,l])=>
        <div key={f}style={{marginBottom:8}}>
          <label className="lbl">{l}</label>
          <input className="inp"value={re[f]!==undefined?re[f]:erp?.[f]||""}
            onChange={e=>setRe(p=>({...p,[f]:e.target.value}))} placeholder={l+"..
        </div>)}
      <div style={{marginBottom:8}}>
        <label className="lbl">Appétit</label>
        <select className="sel"value={re.q??erp?.q??"bien"}onChange={e=>setRe(p=>(
<option value="bien"> Bon appétit</option><option value="peu"> Peu m </select>
</div>
      <button className="btn bT"style={{width:"100%"}}onClick={saveRp}>Enregistrer
    </div>}
</div>
  <div className="card"style={{padding:16}}>
    <div style={{fontWeight:700,fontSize:14,marginBottom:12,color:"var(--b)"}}>
    <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:12}}>
      {echs.length===0&&<div style={{fontSize:13,color:"var(--l)"}}>Aucun change.<
      {echs.map(c=><div key={c.id}style={{display:"flex",justifyContent:"space-bet
        <span style={{fontWeight:700,fontSize:13,color:"var(--b)"}}>{c.h}</span>
<span className="badge"style={{background:c.type==="Propre"?"var(--Sp)":"v {c.type==="Propre"?" Propre":" Change"}</span>
        {c.n&&<span style={{fontSize:11,color:"var(--m)",maxWidth:100,overflow:"hi
      </div>)}
    </div>
    <div style={{fontSize:12,color:"var(--m)",marginBottom:10,fontWeight:700}}>
      Total : <span style={{color:"var(--T)"}}>{echs.filter(c=>c.type==="Change").
    </div>
          Repas
 er(r=>
",backg
-l)",fo
div></d
> }</spa
"italic
var(--b
ttre à
."}/>
{...p,q
angé</
les re
Change
/div>}
ween",a
ar(--Gp
dden",t
length}
  d r
n
o
s

 {role==="asmat"&&<div style={{paddingTop:12,borderTop:"1px solid var(--br)"}}>
  <div style={{fontWeight:700,fontSize:13,marginBottom:8,color:"var(--b)"}}>+
  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom
    <div><label className="lbl">Heure</label><input type="time"className="inp"
    <div><label className="lbl">Type</label><select className="sel"value={nch.
  </div>
  <input className="inp"style={{marginBottom:8}}placeholder="Note (optionnel)"
  <button className="btn bT"style={{width:"100%"}}onClick={addCh}>+ Ajouter</b
</div>}
      </div>
    </div>
</div>; }
//
//
const FERIES_2024={
  "2024-01-01":"
  "2024-04-01":"
  "2024-05-01":"
  "2024-05-08":"
  "2024-05-09":"
  "2024-05-20":"
  "2024-07-14":"
  "2024-08-15":"
  "2024-11-01":"
  "2024-11-11":"
  "2024-12-25":"
Jour de l'An",
Lundi de Pâques",
Fête du Travail",
Victoire 1945",
Ascension",
Lundi de Pentecôte",
Fête Nationale",
Assomption",
Toussaint",
Armistice",
Noël",
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
  const isDemoUser=enfants.length>0&&enfants.every(e=>["e1","e2","e3"].includes(e.id))
  const [evs,setEvs]=useState([]);
  // Initialiser les événements après le chargement des enfants
Ajouter
:8}}>
value={
type}on
value={
utton>
;

 useEffect(()=>{
  if(enfants.length===0)return;
  setEvs(isDemoUser?D.evenements:[]);
},[isDemoUser,enfants.length]);
const [newEv,setNewEv]=useState({type:"rdv",txt:""});
const [showAbsenceModal,setShowAbsenceModal]=useState(false);
const [absForm,setAbsForm]=useState({eId:pEId||enfants[0]?.id,date:"",motif:"Maladie
const [toast,setToast]=useState("");
const noms=["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septem
const joursSemaine=["Lu","Ma","Me","Je","Ve","Sa","Di"];
const jourMap={Lundi:0,Mardi:1,Mercredi:2,Jeudi:3,Vendredi:4,Samedi:5,Dimanche:6};
const premier=new Date(an,mois,1).getDay();
const offset=(premier+6)%7;
const total=new Date(an,mois+1,0).getDate();
const todayDate=new Date();
const isActualToday=(d)=>d===todayDate.getDate()&&mois===todayDate.getMonth()&&an===
const ds=(d)=>an+"-"+String(mois+1).padStart(2,"0")+"-"+String(d).padStart(2,"0");
const moisStr=an+"-"+String(mois+1).padStart(2,"0");
// Jour de la semaine (0=Lundi...6=Dim) pour un jour du mois
const jourIdx=(d)=>(new Date(an,mois,d).getDay()+6)%7;
// Filtrage selon le rôle
const evsFiltres=role==="parent"
  ? evs.filter(e=>{
      // Parent voit : ses propres absences + congés de l'assmat (cng) + fériés
      if(e.type==="cng")return true; // Mes congés → toujours visible
      if(e.type==="abs"&&enfants.some(en=>e.txt&&e.txt.includes(en.prenom)))return t
      if(e.type==="abs"&&pEId&&e.eId===pEId)return true;
      return false;
})
: evs;
const getUserEv=(d)=>evsFiltres.find(e=>e.date===ds(d));
const getFerie=(d)=>FERIES_2024[ds(d)];
const getBirthday=(d)=>enfants.find(e=>e.naissance&&e.naissance.slice(5)===ds(d).sli
const getVac=(d)=>isVacances(ds(d));
// Quels enfants sont accueillis ce jour ?
const getAccueil=(d)=>enfants.filter(e=>{
  const ji=jourIdx(d);
  const jours=e.contrat?.jours||[];
  return jours.some(j=>jourMap[j]===ji);
});
const addEv=()=>{
  if(!sel||!newEv.txt.trim())return;
",heure
bre","O
todayDa
rue;
ce(5));

   setEvs(p=>[...p,{id:"ev"+Date.now(),date:ds(sel),...newEv}]);
  setNewEv({type:"rdv",txt:""});
};
const declarerAbsence=()=>{
  if(!absForm.heures||!absForm.date)return;
  const enfant=enfants.find(e=>e.id===absForm.eId)||enfants[0];
  setEvs(p=>[...p,{id:"abs"+Date.now(),date:absForm.date,type:"abs",eId:absForm.eId,
  D.absences.push({id:"abn"+Date.now(),eId:absForm.eId,date:absForm.date,motif:absFo
  setShowAbsenceModal(false);
  setToast("Absence déclarée - "+(enfant?.prenomAsmat||"l'assmat")+" a été notifiée
};
// Événements du mois filtrés pour le panneau latéral
const moisEvs=[
  ...evsFiltres.filter(e=>e.date.startsWith(moisStr)).map(e=>({...e,src:"user"})),
  ...Object.entries(FERIES_2024).filter(([d])=>d.startsWith(moisStr)).map(([d,n])=>(
  ...enfants.filter(e=>e.naissance&&(an+"-"+e.naissance.slice(5)).startsWith(moisStr
.map(e=>({id:"bd"+e.id,date:an+"-"+e.naissance.slice(5),txt:" Anniversaire de ].sort((a,b)=>a.date>b.date?1:-1);
// Légende couleurs des enfants (asmat uniquement)
const couleursEnfants=enfants.map(e=>({emoji:e.emoji,prenom:e.prenom,couleur:e.coule
return <div className="fi">
{toast&&<Toast msg={toast}onClose={()=>setToast("")}/>} <PageHeadericon=" "
    title={role==="parent"?"Mon calendrier":"Calendrier"}
    sub={role==="parent"?"Jours d'accueil, congés et jours fériés":"Accueil, congés,
    action={role==="parent"&&<button className="btn bR"style={{fontSize:13,padding:"
      onClick={()=>{setAbsForm(f=>({...f,date:ds(todayDate.getDate())}));setShowAbse
         Déclarer une absence
    </button>}
  />
  {/* Modale absence parent */}
  {showAbsenceModal&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5
    onClick={e=>e.target===e.currentTarget&&setShowAbsenceModal(false)}>
    <div className="card"style={{width:"100%",maxWidth:420,padding:28}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"
        <div className="pf"style={{fontSize:18,fontWeight:600,color:"var(--b)"}}>
        <button onClick={()=>setShowAbsenceModal(false)}style={{background:"none",bo
      </div>
      <div style={{background:"var(--Bp)",borderRadius:10,padding:"10px 14px",margin
           Votre assmat sera notifiée immédiatement. L'absence sera notée dans votre
      </div>
      <div style={{display:"grid",gap:12}}>
    txt:"Ab
rm.moti
✓");
{id:d,d ))
"+e.pr
ur}));
 annive
10px 18
nceModa
)",disp
,margin
Déclar
rder:"n
Bottom:
 calen
 e
e
d

       {enfants.length>1&&<div>
        <label className="lbl">Enfant concerné</label>
        <select className="sel"value={absForm.eId}onChange={e=>setAbsForm(f=>({...
          {enfants.map(e=><option key={e.id}value={e.id}>{e.emoji} {e.prenom}</opt
        </select>
      </div>}
      <div>
        <label className="lbl">Date d'absence *</label>
        <input type="date"className="inp"value={absForm.date}onChange={e=>setAbsFo
      </div>
      <div>
        <label className="lbl">Motif</label>
        <select className="sel"value={absForm.motif}onChange={e=>setAbsForm(f=>({.
          {["Maladie","Congés parents","Décision parent","Rendez-vous médical","Au
        </select>
</div> <div>
        <label className="lbl">Heures prévues ce jour *</label>
        <input type="number"className="inp"placeholder="ex: 9"value={absForm.heure
          onChange={e=>setAbsForm(f=>({...f,heures:e.target.value}))} min="0"max="
      </div>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <input type="checkbox"id="indem2"checked={absForm.indemnise}
          onChange={e=>setAbsForm(f=>({...f,indemnise:e.target.checked}))}style={{
        <label htmlFor="indem2"style={{fontSize:13,color:"var(--b)",cursor:"pointe
      </div>
    </div>
    <div style={{display:"flex",gap:8,marginTop:20}}>
      <button className="btn bG"style={{flex:1}}onClick={()=>setShowAbsenceModal(f
      <button className="btn bR"style={{flex:2}}onClick={declarerAbsence}disabled=
           Notifier l'assmat
      </button>
    </div>
  </div>
</div>}
<div className="g2">
  <div className="card"style={{padding:18}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"
      <button className="btn bG"style={{padding:"6px 12px",fontSize:16}}onClick={(
      <div className="pf"style={{fontWeight:600,fontSize:18,color:"var(--b)"}}>{no
      <button className="btn bG"style={{padding:"6px 12px",fontSize:16}}onClick={(
    </div>
    <div className="cgrid"style={{marginBottom:8}}>
      {joursSemaine.map(j=><div key={j}style={{textAlign:"center",fontSize:10,font
    </div>
    <div className="cgrid">
 f,eId:e
ion>)}
rm(f=>(
..f,mot
tre"].m
s} 12"step
width:1
r"}}>Ab
alse)}>
{!absFo
,margin
)=>{if(
ms[mois
)=>{if(
Weight:

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
    else if(isWeekend){bgStyle={background:"rgba(0,0,0,.04)"};} // Weekend gri
    // Accueil : petits points colorés par enfant
    const accueilDots=accueil.filter(e=>!isWeekend&&!ferie&&!(uev?.type==="cng
    return <div key={d}className={cls}style={{...bgStyle,position:"relative"}}
      onClick={()=>setSel(sel===d?null:d)}
      title={ferie||(accueil.length>0?accueil.map(e=>e.prenom).join(", "):"")}
      <span style={{fontSize:11,fontWeight:isToday?700:400}}>{d}</span>
      {/* Indicateurs en bas du jour */}
      <div style={{position:"absolute",bottom:2,left:0,right:0,display:"flex",
        {ferie&&!isToday&&<div style={{width:4,height:4,borderRadius:"50%",bac
        {uev?.type==="cng"&&!isToday&&<div style={{width:4,height:4,borderRadi
        {bday&&<div style={{width:4,height:4,borderRadius:"50%",background:"va
        {accueilDots.slice(0,3).map(e=><div key={e.id}style={{width:4,height:4
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
sé
"));
>
justify
kground
us:"50%
r(--T)"
,border

         <div style={{width:9,height:9,borderRadius:2,background:bg,border:"1px s
        <span style={{fontSize:10,color:"var(--m)"}}>{l}</span>
      </div>)}
</div>
  {/* Légende enfants (asmat) ou mon enfant (parent) */}
  <div style={{marginTop:10,display:"flex",gap:8,flexWrap:"wrap",alignItems:"cen
    <span style={{fontSize:10,color:"var(--l)",fontWeight:700}}>Jours d'accueil
    {enfants.map(e=><div key={e.id}style={{display:"flex",alignItems:"center",ga
      <div style={{width:8,height:8,borderRadius:"50%",background:e.couleur}}/>
      <span style={{fontSize:10,color:"var(--m)"}}>{e.emoji} {e.prenom}</span>
    </div>)}
</div>
  {/* Anniversaires ce mois */}
  {enfants.some(e=>e.naissance?.slice(5)&&(an+"-"+e.naissance.slice(5)).startsWi
    <div style={{marginTop:12,padding:"8px 12px",background:"var(--Tp)",borderRa
      <div style={{fontSize:11,fontWeight:700,color:"var(--T)",marginBottom:4}}>
      {enfants.filter(e=>(an+"-"+(e.naissance?.slice(5)||"")).startsWith(moisStr
        <div key={e.id}style={{fontSize:13,color:"var(--b)"}}>{e.emoji} {e.preno
    </div>}
</div>
<div style={{display:"flex",flexDirection:"column",gap:12}}>
  {/* Formulaire ajout événement - asmat uniquement */}
  {sel&&role==="asmat"&&<div className="card"style={{padding:14}}>
    <div style={{fontWeight:600,fontSize:13,marginBottom:10,color:"var(--b)"}}>
         {sel} {noms[mois]} {an}
      {getFerie(sel)&&<span style={{fontSize:11,color:"var(--R)",marginLeft:8}}>
      {getBirthday(sel)&&<span style={{fontSize:11,color:"var(--T)",marginLeft:8
    </div>
    <div style={{marginBottom:8}}>
      <label className="lbl">Type</label>
      <select className="sel"value={newEv.type}onChange={e=>setNewEv(p=>({...p,t
      <option
    <option
    <option
    <option
  </select>
</div>
value="rdv">
value="abs">
value="cng">
value="hol">
Rendez-vous</option>
Absence enfant</option>
Congé assmat</option>
Sortie / activité</option>
     <input className="inp"style={{marginBottom:8}}placeholder="Description..."va
  <button className="btn bT"style={{width:"100%"}}onClick={addEv}>Ajouter</but
</div>}
{/* Détail jour sélectionné */}
{sel&&<div className="card"style={{padding:14}}>
<div style={{fontWeight:600,fontSize:13,marginBottom:10,color:"var(--b)"}}>
olid "+
ter"}}>
:</span
p:4}}>
th(mois
dius:10
   Ann
)).map(
m} - {n
Jou }}>
ype:e.t
lue={ne ton>
   i
r A

         {sel} {noms[mois]} {an}
  </div>
  {getFerie(sel)&&<div style={{padding:"6px 10px",background:"var(--Rp)",borde
       Jour férié - {getFerie(sel)}
  </div>}
  {getUserEv(sel)?.type==="cng"&&<div style={{padding:"6px 10px",background:"v
       Congé - {getUserEv(sel).txt}
  </div>}
  {getUserEv(sel)?.type==="abs"&&<div style={{padding:"6px 10px",background:"v
       {getUserEv(sel).txt}
  </div>}
  {getAccueil(sel).length>0&&!([0,6].includes(jourIdx(sel)))&&<div style={{mar
    <div style={{fontSize:11,fontWeight:700,color:"var(--m)",marginBottom:4}}>
    {getAccueil(sel).map(e=><div key={e.id}style={{display:"flex",gap:6,alignI
      <div style={{width:8,height:8,borderRadius:"50%",background:e.couleur}}/
      <span style={{color:"var(--b)"}}>{e.emoji} {e.prenom}</span>
      <span style={{fontSize:11,color:"var(--l)"}}>{e.contrat?.horaires}</span
    </div>)}
  </div>}
  {isVacances(ds(sel))&&<div style={{padding:"6px 10px",background:"var(--Bp)"
       Vacances scolaires {nomVacances(ds(sel))} - Zone C
  </div>}
  {getBirthday(sel)&&<div style={{padding:"6px 10px",background:"var(--Tp)",bo
       Anniversaire de {getBirthday(sel)?.prenom} !
  </div>}
  {!getFerie(sel)&&!getUserEv(sel)&&!getAccueil(sel).length&&!isVacances(ds(se
    <div style={{fontSize:12,color:"var(--l)"}}>Aucun événement ce jour.</div>
</div>}
{/* Liste événements du mois */}
<div className="card"style={{padding:14}}>
  <div style={{fontWeight:600,fontSize:13,marginBottom:10,color:"var(--b)"}}>
  {moisEvs.length===0&&<div style={{fontSize:13,color:"var(--l)"}}>Aucun événe
  {moisEvs.map(ev=><div key={ev.id}style={{display:"flex",gap:8,padding:"7px 0
    <span className="badge"style={{
      background:ev.type==="ferie"?"var(--Rp)":ev.type==="cng"?"var(--Gp)":ev.
      color:ev.type==="ferie"?"var(--R)":ev.type==="cng"?"var(--G)":ev.type===
      whiteSpace:"nowrap",fontSize:10}}>
      {ev.date.slice(8)} {noms[mois].slice(0,3).toLowerCase()}
</span>
    <span style={{fontSize:11,color:"var(--m)",flex:1}}>{ev.txt}</span>
  </div>)}
</div>
{/* Vacances ce mois */}
{VACANCES_2024.filter(v=>v.debut.startsWith(moisStr)||v.fin.startsWith(moisStr
     <div key={v.nom}className="card"style={{padding:12,background:"var(--Bp)",bo
rRadius
ar(--Gp
ar(--Rp
ginBott
Enfants
tems:"c
>
>
,border
rderRad
l))&&!g }
  {nom
ment.</
",borde
type===
"abs"?"
)||(v.d
rder:"1
 s

             <div style={{fontWeight:700,fontSize:12,color:"var(--B)",marginBottom:2}}>
            <div style={{fontSize:11,color:"var(--m)"}}>{fmt(v.debut)} → {fmt(v.fin)}<
          </div>)}
      </div>
    </div>
</div>; }
function Messagerie({enfants,role,pEId,user}){
  const [selId,setSelId]=useState(enfants[0]?.id);
  const isDemoMode=enfants.every(e=>["e1","e2","e3"].includes(e.id));
  const [msgs,setMsgs]=useState(isDemoMode?D.messages:[]);
  const [txt,setTxt]=useState("");
  const [loadingMsgs,setLoadingMsgs]=useState(false);
  const endRef=useRef(null);
  const liste=role==="parent"?enfants.filter(e=>e.id===pEId):enfants;
  const enfant=liste.find(e=>e.id===selId)||liste[0];
  const conv=msgs.filter(m=>(m.eId||m.enfant_id)===enfant?.id).sort((a,b)=>(a.created_
  // Load messages from Supabase
  useEffect(()=>{
    if(isDemoMode||!user?.id)return;
    const load=async()=>{
      setLoadingMsgs(true);
      const enfantIds=liste.map(e=>e.id);
      const{data,error}=await supabase.from('messages').select('*').in('enfant_id',enf
      if(!error&&data){
        setMsgs(data.map(m=>({...m,eId:m.enfant_id,de:m.auteur_role,h:m.heure||new Dat
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
            return[...prev,{...m,eId:m.enfant_id,de:m.auteur_role,h:m.heure||new Date(
          });
          setTimeout(()=>endRef.current?.scrollIntoView({behavior:"smooth"}),100);
Vac /div>
at||a.i
antIds)
e(m.cre
m.creat
 a

 } }
  ).subscribe();
  return()=>{supabase.removeChannel(channel);};
},[user?.id,isDemoMode]);
const send=async()=>{
  if(!txt.trim()||!enfant?.id)return;
  const heure=new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'
  if(isDemoMode){
    setMsgs(p=>[...p,{id:"mn"+Date.now(),eId:enfant.id,de:role==="asmat"?"asmat":"pa
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
    setMsgs(p=>[...p,{id:"mn"+Date.now(),eId:enfant.id,de:role,h:heure,txt,lu:true,e
  }
  setTxt("");
  setTimeout(()=>endRef.current?.scrollIntoView({behavior:"smooth"}),50);
};
return <div className="fi">
<PageHeadericon=" "title="Messagerieinstantanée"sub="Communicationentempsr {role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"
    {liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>setSelId(e.id
  <div className="g2">
    <div className="card"style={{padding:16,display:"flex",flexDirection:"column",ga
      <div style={{display:"flex",alignItems:"center",gap:10,paddingBottom:10,border
        <span style={{fontSize:24}}>{enfant?.emoji}</span>
        <div><div style={{fontWeight:700,fontSize:14,color:"var(--b)"}}>{enfant?.pre
          <div style={{fontSize:11,color:"var(--S)",fontWeight:700}}>● En ligne</div
      </div>
      <div className="msgs">
        {conv.map(m=><div key={m.id}className={(m.de==="asmat"?"msg msg-me":"msg msg
          <div>{m.txt||m.texte}</div>
          <div style={{fontSize:10,opacity:.7,marginTop:3,textAlign:"right"}}>{m.h}<
        </div>)}
        <div ref={endRef}/>
      </div>
      <div style={{display:"flex",gap:8,paddingTop:10,borderTop:"1px solid var(--br)
 }); rent",h
nfant_i
éel"/>
}}>
)}/>)}<
p:12}}>
Bottom:
nom} {e
></div>
-ot")}>
/div>
"}}>

           <input className="inp"value={txt}onChange={e=>setTxt(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Votre message..."style
          <button className="btn bT"onClick={send}>Envoyer</button>
        </div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div className="card"style={{padding:14}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:10,color:"var(--b)"}}>
          {liste.map(e=>{
            const unread=msgs.filter(m=>m.eId===e.id&&!m.lu).length;
            const last=msgs.filter(m=>m.eId===e.id).slice(-1)[0];
            return <div key={e.id}onClick={()=>setSelId(e.id)}
              style={{display:"flex",gap:10,padding:"9px 0",borderBottom:"1px solid va
              <span style={{fontSize:22}}>{e.emoji}</span>
              <div style={{flex:1,overflow:"hidden"}}>
                <div style={{fontWeight:700,fontSize:13,color:"var(--b)"}}>{e.prenom}<
                {last&&<div style={{fontSize:12,color:"var(--l)",overflow:"hidden",tex
              </div>
              {unread>0&&<span className="badge"style={{background:"var(--T)",color:"w
            </div>;})}
        </div>
        <div className="card"style={{padding:14,background:"var(--Sp)",border:"1px sol
          <div style={{fontWeight:700,fontSize:13,color:"var(--S)",marginBottom:6}}>
          <div style={{fontSize:12,color:"var(--b)",lineHeight:1.6}}>
            Les messages sont consultables par les deux parties. En cas d'urgence,
            utilisez directement l'appel téléphonique. La messagerie est archivée 2 an
          </div>
        </div>
      </div>
    </div>
  </div>;
}
//
function Facturation({enfants,role,pEId,user,pointagesDB}){
  const [selId,setSelId]=useState(enfants[0]?.id);
  const [abs,setAbs]=useState(enfants.every(e=>["e1","e2","e3"].includes(e.id))?D.abse
  const [toast,setToast]=useState("");
  const liste=role==="parent"?enfants.filter(e=>e.id===pEId):enfants;
  const enfant=liste.find(e=>e.id===selId)||liste[0];
  const contrat=enfant?.contrat;
  const isDemoFact=enfants.every(e=>["e1","e2","e3"].includes(e.id));
  // Calculate hours from real pointages or fallback to demo
  const calcHeures=()=>{
    if(isDemoFact)return D.heures[enfant?.id]||{real:0,prev:Math.round((contrat?.heure
    if(!pointagesDB||!enfant?.id)return{real:0,prev:Math.round((contrat?.heuresHebdo||
    const moisPointages=pointagesDB.filter(p=>p.enfant_id===enfant.id);
={{flex
Conv
r(--br)
/div>
tOverfl
hite"}}
id var( Bon à
s.
nces:[]
sHebdo|
40)*52/
  e

   const totalMin=moisPointages.reduce((s,p)=>s+(p.total_minutes||0),0);
  return{real:Math.round(totalMin/60),prev:Math.round((contrat?.heuresHebdo||40)*52/
};
const h=calcHeures();
const salBrut=contrat?(h.real*contrat.tauxHoraire+(h.real/5*contrat.entretien)):0;
const absMois=abs.filter(a=>a.eId===enfant?.id);
const indemAbs=absMois.filter(a=>a.indemnise).reduce((s,a)=>s+a.heures*((contrat?.ta
const totalBrut=salBrut+indemAbs;
const exportPajemploi=()=>{
  const w=window.open('','_blank');
  if(!w){setToast('Autorisez les popups');return;}
  const mois=new Date().toLocaleDateString('fr-FR',{month:'long',year:'numeric'});
  const hMens=Math.round((contrat?.heuresHebdo||40)*52/12);
  const salNet=(totalBrut*0.78).toFixed(2);
  const joursTrav=Math.round(h.real/((contrat?.heuresHebdo||40)/5));
  const htmlPaj=[
    '<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/><title>Récap Pajemp
    '<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-s
    'h1{font-size:16px;text-align:center;color:#264653;margin-bottom:4px}',
    '.sub{text-align:center;font-size:11px;color:#888;margin-bottom:20px}',
    '.box{border:1.5px solid #2A9D8F;border-radius:10px;padding:16px;margin-bottom:1
    '.box h2{font-size:13px;color:#2A9D8F;margin-bottom:10px;padding-bottom:6px;bord
    'table{width:100%;border-collapse:collapse}td{padding:6px 10px;border-bottom:1px
    'td:first-child{font-weight:600;color:#264653;width:55%}td:last-child{text-align
    '.hl{background:#FFF8F3;font-weight:700;font-size:13px}.hl td{border-bottom:2px
    '.note{background:#F4F7FA;border-radius:8px;padding:12px;margin-top:16px;font-si
    '.steps{margin-top:20px;padding:16px;border:1px dashed #2A9D8F;border-radius:8px
    '.steps h3{font-size:12px;color:#2A9D8F;margin-bottom:10px}',
'.steps ol{padding-left:20px;font-size:11px;line-height:2}',
'@media print{.noprint{display:none}}</style></head><body>',
'<h1> Récapitulatif Pajemploi</h1>',
'<div class="sub">'+mois+' — À reporter sur pajemploi.urssaf.fr</div>',
'<div class="box"><h2> Assistante maternelle</h2>', '<table><tr><td>Nom</td><td>'+((enfant?.prenomAsmat||"")+" "+(enfant?.nomAsmat|| '<tr><td>Enfant gardé</td><td>'+(enfant?.prenom||'-')+' '+(enfant?.emoji||'')+'< '<tr><td>Période</td><td>'+mois+'</td></tr></table></div>',
'<div class="box"><h2> Heures à déclarer</h2>',
'<table><tr><td>Heures mensualisées (contrat)</td><td>'+hMens+' h</td></tr>', '<tr><td>Heures réellement effectuées</td><td>'+h.real+' h</td></tr>', '<tr><td>Heures complémentaires / supplémentaires</td><td>'+Math.max(0,h.real-hM '<tr><td>Jours d\'activité</td><td>'+joursTrav+' jours</td></tr>', '<tr><td>Jours de congés payés pris</td><td>0 jours</td></tr></table></div>', '<div class="box"><h2> Salaire à déclarer</h2>',
'<table><tr><td>Salaire net horaire</td><td>'+(totalBrut*0.78/h.real).toFixed(4) '<tr><td>Salaire net total</td><td>'+salNet+' €</td></tr>',
'<tr><td>Indemnité d\'entretien</td><td>'+(h.real/5*contrat.entretien).toFixed(2
     12)};
uxHorai
loi - '
erif;ma
6px}',
er-bott
 solid
:right}
solid #
ze:10px
}',
"")).tr
/td></t
ens)+'
+' €/h<
)+' €</

 '<tr><td>Indemnité de repas</td><td>0,00 €</td></tr>',
'<tr class="hl"><td> TOTAL NET À DÉCLARER</td><td>'+salNet+' €</td></tr></tabl '<div class="steps"><h3> Comment déclarer sur Pajemploi :</h3>', '<ol><li>Connectez-vous sur <strong>pajemploi.urssaf.fr</strong></li>', '<li>Cliquez sur <strong>"Déclarer"</strong> > sélectionnez votre assistante mat '<li>Entrez le nombre d\'heures : <strong>'+h.real+'h</strong></li>', '<li>Entrez le nombre de jours d\'activité : <strong>'+joursTrav+'</strong></li> '<li>Entrez le salaire net total : <strong>'+salNet+' €</strong></li>', '<li>Entrez l\'indemnité d\'entretien : <strong>'+(h.real/5*contrat.entretien).t '<li>Validez la déclaration</li></ol></div>',
'<div class="note"> Ce récapitulatif est généré par TiMat à partir des pointag '<div style="text-align:center;margin-top:16px"><button class="noprint" onclick= '</body></html>'
].join(''); w.document.write(htmlPaj); w.document.close();
setToast('Récap Pajemploi ouvert ✓');
};
return <div className="fi">
{toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
<PageHeadericon=" "title="Facturation&Pajemploi"sub="Calculautomatiquedus {role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"
    {liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>setSelId(e.id
  {contrat&&<div className="g2">
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <div className="card"style={{padding:16}}>
        <div style={{fontWeight:700,fontSize:14,marginBottom:14,color:"var(--b)"}}>
        {[["Heures réalisées",h.real+"h × "+contrat.tauxHoraire+"€",(h.real*contrat.
          ["Indemnité entretien",h.real+" jrs × "+contrat.entretien+"€",(h.real/5*co
          ["Absences indemnisées",absMois.filter(a=>a.indemnise).length+" jours","+"
        ].map(([l,d,v])=><div key={l}style={{display:"flex",justifyContent:"space-be
          <div><div style={{fontSize:13,fontWeight:600,color:"var(--b)"}}>{l}</div>
            <div style={{fontSize:11,color:"var(--l)"}}>{d}</div></div>
          <div style={{fontWeight:700,color:"var(--S)"}}>{v}</div>
        </div>)}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"cente
          <span className="pf"style={{fontSize:15,fontWeight:700,color:"var(--b)"}}>
          <span className="pf"style={{fontSize:20,fontWeight:700,color:"var(--T)"}}>
</div>
        <div style={{fontSize:11,color:"var(--l)",marginTop:6}}>* Net ≈ {(totalBrut*
      </div>
      {/* Pajemploi */}
      <div className="card"style={{padding:16,background:"#EBF4FF",border:"1.5px sol
    <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:12}}>
e></di
ernelle
',
oFixed(
es rée
"window
alaire
}}>
)}/>)}<
  Sala
tauxHor
ntrat.e
+indemA
tween",
r",marg
Total b
{totalB
0.78).t
id var(
 v
l
i

             <div style={{width:36,height:36,borderRadius:9,background:"var(--B)",displ
            <div><div style={{fontWeight:700,fontSize:14,color:"var(--B)"}}>Lien Pajem
              <div style={{fontSize:11,color:"var(--l)"}}>Export direct vers l'URSSAF<
          </div>
          <div style={{fontSize:13,color:"var(--b)",marginBottom:12,lineHeight:1.6}}>
            Heures : <strong>{h.real}h</strong> · Salaire net : <strong>{(totalBrut*0.
          </div>
          <button className="btn bT"style={{width:"100%",justifyContent:"center"}}onCl
               Exporter vers Pajemploi
          </button>
        </div>
</div>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div className="card"style={{padding:16}}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:12,color:"var(--b)"}}>
          {absMois.map(a=><div key={a.id}style={{display:"flex",justifyContent:"space-
            <div>
              <div style={{fontSize:13,fontWeight:600,color:"var(--b)"}}>{fmt(a.date)}
              <div style={{fontSize:11,color:"var(--l)"}}>{a.heures}h · {a.indemnise?"
            </div>
            <span className="badge"style={{background:a.indemnise?"var(--Sp)":"var(--R
              {a.indemnise?"+"+((a.heures*(contrat.tauxHoraire*contrat.indemniteAbsenc
          </div>)}
          {role==="asmat"&&<button className="btn bG"style={{width:"100%",marginTop:12
        </div>
        <div className="card"style={{padding:14}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:10,color:"var(--b)"}}>
          {[["Février 2024","Émise","672.40€"],["Janvier 2024","Payée","698.10€"],["Dé
            <div key={m}style={{display:"flex",justifyContent:"space-between",alignIte
              <span style={{fontSize:13,color:"var(--b)",fontWeight:600}}>{m}</span>
              <span className="badge"style={{background:s==="Payée"?"var(--Sp)":"var(-
              <span style={{fontWeight:700,color:"var(--b)"}}>{v}</span>
            </div>)}
        </div>
      </div>
    </div>}
</div>; }
//
function Contrats({enfants,role,pEId}){
  const [selId,setSelId]=useState(enfants[0]?.id);
  const [signes,setSignes]=useState(()=>Object.fromEntries(D.enfants.map(e=>[e.id,e.si
  const [drawing,setDrawing]=useState(false);
  const [hasSig,setHasSig]=useState(false);
  const [mods,setMods]=useState(()=>Object.fromEntries(D.enfants.map(e=>[e.id,[]])));
 ay:"fle
ploi</d
/div></
78).toF
ick={ex
Abse between
 - {a.m
Indemni
p)",col
e)).toF
}}>+ Dé
Hist cembre
ms:"cen
-Gp)",c
gne])))
  n
o

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
  ctx.strokeStyle="#3A2820";ctx.lineWidth=2;ctx.lineCap="round";ctx.lineJoin="round"
  ctx.beginPath();ctx.moveTo(e.clientX-r.left,e.clientY-r.top);};
const draw=(e)=>{if(!drawing)return;
  const c=canvasRef.current;const r=c.getBoundingClientRect();
  const ctx=c.getContext("2d");
  ctx.strokeStyle="#3A2820";ctx.lineWidth=2;ctx.lineCap="round";ctx.lineJoin="round"
  ctx.lineTo(e.clientX-r.left,e.clientY-r.top);ctx.stroke();
  ctx.beginPath();ctx.moveTo(e.clientX-r.left,e.clientY-r.top);
  setHasSig(true);};
const endDraw=()=>setDrawing(false);
const clearSig=()=>{const c=canvasRef.current;c.getContext("2d").clearRect(0,0,c.wid
const signer=()=>{if(!hasSig)return;setSignes(p=>({...p,[enfant.id]:true}));setToast
const addMod=()=>{if(!modDet.detail.trim())return;
  setMods(p=>({...p,[enfant.id]:[{date:TODAY_STR,...modDet,statut:"En attente"},...(
  setModDet({type:"Horaire",detail:""});setShowModale(false);};
return <div className="fi">
{toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
<PageHeadericon=" "title="Contrats&Signatures"sub="Signatureélectroniquelé {role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"
    {liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>setSelId(e.id
  {contrat&&<div className="g2">
    <div>
      <div className="card"style={{padding:16,marginBottom:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"cente
<div style={{fontWeight:700,fontSize:14,color:"var(--b)"}}> Contrat - {e <span className="badge"style={{background:signes[enfant?.id]?"var(--Sp)":"
{signes[enfant?.id]?" Signé":" En attente de signature"}</span> </div>
        {[["Période",fmt(contrat.debut)+" → "+fmt(contrat.fin)],
          ["Jours",contrat.jours.join(", ")],["Horaires",contrat.horaires],
          ["Heures / semaine",contrat.heuresHebdo+"h"],
          ["Taux horaire",contrat.tauxHoraire.toFixed(2)+" €/h"],
          ["Indemnité entretien",contrat.entretien.toFixed(2)+" €/jour"],
    ;
;
th,c.he
("Contr
p[enfan
gale"/
}}>
)}/>)}<
r",marg
nfant?
var(--G
>
.

       ["Salaire mensuel brut","≈ "+(contrat.heuresHebdo*contrat.tauxHoraire*52/1
    ].map(([l,v])=><div key={l}style={{display:"flex",justifyContent:"space-betw
      <span style={{fontSize:12,color:"var(--l)",fontWeight:700}}>{l}</span>
      <span style={{fontSize:13,fontWeight:600,color:"var(--b)",textAlign:"right
    </div>)}
</div>
  {/* Signature électronique */}
  {!signes[enfant?.id]&&<div className="card"style={{padding:16,border:"1.5px so
    <div style={{fontWeight:700,fontSize:14,color:"var(--P)",marginBottom:4}}>
    <div style={{fontSize:12,color:"var(--m)",marginBottom:12}}>Signez dans la z
    <canvas ref={canvasRef}className="sig-c"width={340}height={100}
      style={{width:"100%",maxWidth:340}}
      onMouseDown={startDraw}onMouseMove={draw}onMouseUp={endDraw}onMouseLeave={
    <div style={{display:"flex",gap:8,marginTop:10}}>
      <button className="btn bG"onClick={clearSig}>Effacer</button>
      <button className="btn bP"style={{flex:1,justifyContent:"center"}}onClick=
           Signer le contrat
      </button>
    </div>
    <div style={{fontSize:11,color:"var(--l)",marginTop:8}}>
         Signature horodatée et sécurisée - valeur légale conforme eIDAS
    </div>
  </div>}
  {signes[enfant?.id]&&<div style={{background:"var(--Sp)",border:"1px solid var
<divstyle={{fontSize:24,marginBottom:4}}> </div>
<div style={{fontWeight:700,color:"var(--S)"}}>Contrat signé électroniquemen <div style={{fontSize:12,color:"var(--l)",marginTop:2}}>Le 11/03/2024 · Conf
  </div>}
</div>
<div style={{display:"flex",flexDirection:"column",gap:12}}>
  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"
<div style={{fontWeight:700,fontSize:13,color:"var(--b)"}}> Demandes de mo
    <button className="btn bT"style={{fontSize:12,padding:"6px 12px"}}onClick={(
  </div>
  {(mods[enfant?.id]||[]).length===0&&<div className="card"style={{padding:14}}>
    <div style={{fontSize:13,color:"var(--l)"}}>Aucune modification demandée.</d
  </div>}
  {(mods[enfant?.id]||[]).map((m,i)=><div key={i}className="card"style={{padding
    <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
      <span className="badge"style={{background:"var(--Bp)",color:"var(--B)"}}>{
      <span className="badge"style={{background:m.statut==="Accepté"?"var(--Sp)"
        color:m.statut==="Accepté"?"var(--S)":m.statut==="Refusé"?"var(--R)":"va
    </div>
    <div style={{fontSize:13,color:"var(--m)",lineHeight:1.5,marginBottom:4}}>{m
    <div style={{fontSize:11,color:"var(--l)"}}>{fmt(m.date)}</div>
    2).toFi
een",pa
",maxWi
lid var
 Signa
one ci-
endDraw
{signer
(--Sl)"
t</div>
orme eI
}}> difica
)=>setS
iv>
:12}}>
m.type}
:m.stat
r(--G)"
.detail
 t
t

           {role==="asmat"&&m.statut==="En attente"&&<div style={{display:"flex",gap:6,
            <button className="btn bS"style={{fontSize:11,padding:"5px 10px"}}onClick=
            <button className="btn bG"style={{fontSize:11,padding:"5px 10px",color:"va
          </div>}
        </div>)}
      </div>
    </div>}
    {showModale&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",dis
      <div className="card"style={{padding:24,width:420,maxWidth:"92vw"}}>
        <div className="pf"style={{fontSize:17,fontWeight:700,marginBottom:16,color:"v
        <div style={{marginBottom:12}}><label className="lbl">Type</label>
          <select className="sel"value={modDet.type}onChange={e=>setModDet(p=>({...p,t
            <option>Horaire</option><option>Jours</option><option>Renouvellement</opti
          </select></div>
        <div style={{marginBottom:16}}><label className="lbl">Détail</label>
          <textarea className="ta"value={modDet.detail}onChange={e=>setModDet(p=>({...
        <div style={{display:"flex",gap:8}}>
          <button className="btn bG"style={{flex:1}}onClick={()=>setShowModale(false)}
          <button className="btn bT"style={{flex:1}}onClick={addMod}>Envoyer</button>
        </div>
      </div>
    </div>}
</div>; }
//
function Sante({enfants,role,pEId}){
  const [selId,setSelId]=useState(enfants[0]?.id);
  const liste=role==="parent"?enfants.filter(e=>e.id===pEId):enfants;
  const enfant=liste.find(e=>e.id===selId)||liste[0];
  const isRealChild=!["e1","e2","e3"].includes(enfant?.id);
  const vacs=isRealChild?[]:(enfant?.vaccins||[]);
return <div className="fi">
<PageHeadericon=" "title="Carnetdesanté"sub="Informationsmédicales,vaccins {role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"
      {liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>setSelId(e.id
    {enfant&&<div className="g2">
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {/* Identité médicale */}
        <div className="card"style={{padding:16}}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:12,color:"var(--b)"}}>
          {[["Groupe sanguin",enfant.groupe_sanguin||"-"],["Médecin traitant",enfant.m
            <div key={l}style={{display:"flex",justifyContent:"space-between",padding:
 <span style={{fontSize:12,color:"var(--l)",fontWeight:700}}>{l}</span>
marginT
{()=>se
r(--R)"
play:"f
ar(--b)
ype:e.t
on><opt
p,detai
>Annule
, alle
}}>
)}/>)}<
  Iden
edecin|
"7px 0"
 r
t

         <span style={{fontSize:13,fontWeight:600,color:"var(--b)"}}>{v}</span>
      </div>)}
</div>
  {/* Allergies */}
  <div className="card"style={{padding:16}}>
    <div style={{fontWeight:700,fontSize:14,marginBottom:12,color:"var(--b)"}}>
    {enfant.allergies.length===0
      ?<span className="badge"style={{background:"var(--Sp)",color:"var(--S)"}}>
      :<div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        {enfant.allergies.map(a=><span key={a}className="badge"style={{backgroun
      </div>}
    {role==="parent"&&<div style={{marginTop:12,display:"flex",gap:8}}>
      <input className="inp"placeholder="Ajouter une allergie..."style={{flex:1}
      <button className="btn bT"style={{fontSize:12}}>+</button>
    </div>}
  </div>
  {/* Urgences */}
  <div className="card"style={{padding:16,background:"#FFF5F5",border:"1px solid
    <div style={{fontWeight:700,fontSize:14,marginBottom:10,color:"#DC2626"}}>
    {[["SAMU","15"],["Pompiers","18"],["Médecin traitant",enfant.medecin?.split(
      <div key={l}style={{display:"flex",justifyContent:"space-between",padding:
        <span style={{fontSize:13,color:"#7F1D1D"}}>{l}</span>
        <span style={{fontWeight:700,color:"#DC2626",fontSize:14}}>{v}</span>
      </div>)}
  </div>
</div>
{/* Vaccins */}
<div className="card"style={{padding:16}}>
  <div style={{fontWeight:700,fontSize:14,marginBottom:12,color:"var(--b)"}}>
  {vacs.map((v,i)=><div key={i}style={{display:"flex",justifyContent:"space-betw
    <div>
      <div style={{fontWeight:700,fontSize:13,color:"var(--b)"}}>{v.nom}</div>
      <div style={{fontSize:11,color:"var(--l)"}}>{fmt(v.date)}</div>
    </div>
    <span className="badge"style={{background:v.ok?"var(--Sp)":"var(--Rp)",color
{v.ok?" À jour":" À renouveler"}</span> </div>)}
  <div style={{marginTop:12,padding:"10px 14px",background:"var(--Gp)",borderRad
    <div style={{fontSize:13,color:"#7A5500",lineHeight:1.5}}>
         Prochain rappel : <strong>ROR de {enfant.prenom}</strong> - à prévoir a
    </div>
  </div>
</div>
   </div>}
Alle Auc
d:"#FEE
}/>
 #FCA5A
 En ca
"-")[1]
"6px 0"
Carnet
een",al
:v.ok?"
ius:10,
vant {
    r u
s
a

 </div>; }
//
function Portfolio({enfants,role,pEId}){
const [selId,setSelId]=useState(null);
const [showForm,setShowForm]=useState(false);
const [pfs,setPfs]=useState(D.portfolio); const[nf,setNf]=useState({titre:"",desc:"",emoji:" ",competences:""});
const [toast,setToast]=useState("");
const listeEnfants=role==="parent"?enfants.filter(e=>e.id===pEId):enfants;
const filtres=selId?pfs.filter(p=>p.eId===selId):pfs.filter(p=>listeEnfants.some(e=> const emojis=[" "," "," "," "," "," "," "," "," "," "];
const add=()=>{
const e=listeEnfants[0];if(!e||!nf.titre)return; setPfs(p=>[{id:"pf"+Date.now(),eId:selId||e.id,date:TODAY_STR,...nf,competences:nf setNf({titre:"",desc:"",emoji:" ",competences:""});setShowForm(false);setToast("A
return <div className="fi">
{toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
<PageHeadericon=" "title="Portfoliopédagogique"sub="Activités,projetsetsou
      action={role==="asmat"&&<button className="btn bT"onClick={()=>setShowForm(!show
    {role==="asmat"&&<div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"
      <button className={(!selId?"btn bT":"btn bG")}onClick={()=>setSelId(null)}>Tous<
      {listeEnfants.map(e=><button key={e.id}className={(selId===e.id?"btn bT":"btn bG
</div>}
    {showForm&&<div className="card"style={{padding:16,marginBottom:14,border:"1.5px s
      <div style={{fontWeight:700,fontSize:13,marginBottom:10,color:"var(--b)"}}>Nouve
      <div className="g2"style={{marginBottom:10}}>
        <div><label className="lbl">Titre</label><input className="inp"value={nf.titre
        <div><label className="lbl">Emoji</label><div style={{display:"flex",gap:4,fle
          {emojis.map(em=><button key={em}className={"moo "+(nf.emoji===em?"on":"")}on
      </div>
      <div style={{marginBottom:10}}><label className="lbl">Description</label><textar
      <div style={{marginBottom:10}}><label className="lbl">Compétences (séparées par
      <button className="btn bT"style={{width:"100%"}}onClick={add}>Enregistrer l'acti
</div>}
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr
      {filtres.map(pf=>{
        const e=enfants.find(x=>x.id===pf.eId);
        return <div key={pf.id}className="card"style={{padding:14,display:"flex",flexD
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-
            <div style={{fontSize:36}}>{pf.emoji}</div>
             e.id===
.compet
ctivit
venirs
Form)}>
}}>
/button
")}onCl
olid va
lle act
}onChan
xWrap:"
Click={
ea clas
virgule
vité</b
))",gap
irectio
start"}
é
"

             <div style={{textAlign:"right"}}>
              {e&&<span style={{fontSize:16}}>{e.emoji}</span>}
              <div style={{fontSize:11,color:"var(--l)"}}>{fmt(pf.date)}</div>
            </div>
          </div>
          <div style={{fontWeight:700,fontSize:14,color:"var(--b)"}}>{pf.titre}</div>
          <div style={{fontSize:12,color:"var(--m)",lineHeight:1.5}}>{pf.desc}</div>
          <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
            {pf.competences.map(c=><span key={c}className="badge"style={{background:"v
          </div>
        </div>;})}
    </div>
</div>; }
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
  const toggle=(id)=>setMs(p=>({...p,[enfant.id]:p[enfant.id].map(m=>m.id===id?{...m,o
return <div className="fi">
<PageHeadericon=" "title="Suividudéveloppement"sub="JalonsOMS-étapesclés {role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"
      {liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>setSelId(e.id
    {enfant&&<div className="g2">
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {/* Score global */}
        <div className="card"style={{padding:16}}>
          <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:12}}>
            <span style={{fontSize:36}}>{enfant.emoji}</span>
            <div style={{flex:1}}>
              <div className="pf"style={{fontSize:17,fontWeight:700,color:"var(--b)"}}
              <div style={{fontSize:13,color:"var(--l)"}}>{age(enfant.naissance)}</div
            </div>
            <div style={{textAlign:"center"}}>
              <div className="pf"style={{fontSize:28,fontWeight:700,color:"var(--S)"}}
              <div style={{fontSize:11,color:"var(--l)"}}>acquis</div>
</div>
 ar(--Pp
k:!m.ok
de l' }}>
)}/>)}<
>{enfan >
>{pct}%
e

           </div>
          <div className="bar"style={{height:10,marginBottom:8}}>
            <div className="bar-fill"style={{width:pct+"%",background:"var(--S)"}}/>
          </div>
          <div style={{fontSize:12,color:"var(--m)"}}>{done} / {items.length} étapes a
        </div>
        {/* Par catégorie */}
        {cats.map(cat=>{
          const citems=items.filter(m=>m.cat===cat);
          const cpct=Math.round(citems.filter(m=>m.ok).length/citems.length*100);
          return <div key={cat}className="card"style={{padding:12}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}
              <span style={{fontWeight:700,fontSize:13,color:"var(--b)"}}>{cat}</span>
              <span style={{fontSize:12,color:"var(--S)",fontWeight:700}}>{cpct}%</spa
            </div>
            <div className="bar"style={{marginBottom:2}}>
              <div className="bar-fill"style={{width:cpct+"%",background:"var(--S)"}}/
            </div>
          </div>;})}
      </div>
      <div className="card"style={{padding:16}}>
        <div style={{fontWeight:700,fontSize:14,marginBottom:12,color:"var(--b)"}}>Tou
        {cats.map(cat=><div key={cat}style={{marginBottom:14}}>
          <div style={{fontSize:12,fontWeight:700,color:"var(--m)",textTransform:"uppe
          {items.filter(m=>m.cat===cat).map(m=><div key={m.id}className="ms"onClick={(
<div className={"msc "+(m.ok?"ok":"")+""}>{m.ok?"✓":""}</div> <div style={{flex:1}}>
              <div style={{fontSize:13,color:"var(--b)",fontWeight:m.ok?700:400,textDe
              <div style={{fontSize:11,color:"var(--l)"}}>{m.age_attendu}</div>
            </div>
            {!m.ok&&<span className="badge"style={{background:"var(--Gp)",color:"var(-
          </div>)}
</div>)}
        {role==="asmat"&&<div style={{fontSize:11,color:"var(--l)",marginTop:4}}>Cliqu
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
tteinte
}> n>
>
tes les
rcase",
)=>role
coratio
-G)",fo
ez sur

 const enfant=liste.find(e=>e.id===selId)||liste[0];
const contrat=enfant?.contrat;
const isDemoRecap=enfants.every(e=>["e1","e2","e3"].includes(e.id));
const h=isDemoRecap?(D.heures[enfant?.id]||{real:0,prev:0}):{real:0,prev:Math.round(
const rep=D.repas.filter(r=>r.eId===enfant?.id);
const ms=D.milestones[enfant?.id]||[];
return <div className="fi">
{toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
<PageHeadericon=" "title="RécapitulatifmensuelPDF"sub="Bilancompletautomat
action={<button className="btn bT"onClick={()=>{setShowPrev(true);}}> Aperçu {role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap" {liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>setSelId(e.id
<div className="g2"style={{marginBottom:12}}>
{[[" ","Heuresréalisées",h.real+"h/"+h.prev+"hprévues","var(--B)"],
[" ","Repasenregistrés",rep.length+"joursdesuivi","var(--S)"],
[" ","Étapesatteintes",ms.filter(m=>m.ok).length+"/"+ms.length+"jalons"," [" ","Transmissions",D.transmissions.filter(t=>t.eId===enfant?.id).length+"é
    ].map(([ic,ti,su,c])=><div key={ti}className="card"style={{padding:14,display:"f
      <div style={{fontSize:26}}>{ic}</div>
      <div><div style={{fontWeight:700,fontSize:13,color:"var(--b)"}}>{ti}</div>
        <div className="pf"style={{fontSize:15,color:c,fontWeight:700}}>{su}</div></
    </div>)}
</div>
  {showPrev&&enfant&&<div className="card"style={{padding:16}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",m
      <div style={{fontWeight:700,fontSize:14,color:"var(--b)"}}>Aperçu du récapitul
      <div style={{display:"flex",gap:8}}>
        <button className="btn bP"onClick={()=>setToast("PDF généré et envoyé par em
<button className="btn bS"onClick={()=>setToast("Téléchargement en cours ✓") </div>
    </div>
    <div className="pdf-preview">
<div style={{borderBottom:"2px solid #C4714A",paddingBottom:12,marginBottom:16 <div><h2 style={{color:"#C4714A",fontFamily:"Georgia",fontSize:18}}> TiMat <div style={{fontSize:11,color:"#888"}}>{user?.prenom||"Assmat"} {user?.no
        <div style={{textAlign:"right",fontSize:11,color:"#888"}}>
          <div><strong>Récapitulatif mensuel</strong></div>
          <div>Mars 2024</div>
          <div>Généré le 11/03/2024</div>
        </div>
      </div>
<div style={{background:"#f8f4ef",padding:10,borderRadius:6,marginBottom:12}}> <div style={{fontWeight:700,marginBottom:4}}> {enfant.prenom} {enfant.nom} <div style={{fontSize:11,color:"#666"}}>Période d'accueil : {enfant.contrat?
        (contra
ique - PDF</b
}}> )}/>)}<
var(--
change
lex",ga
div>
arginBo
atif</d
ail ✓") }> T
,displa
</h2>
m||""}
- {ag .horair
 u
P s
é
e

         </div>
        <table>
          <thead><tr><th>Section</th><th>Détail</th><th>Valeur</th></tr></thead>
          <tbody>
            <tr><td>Heures prévues</td><td>Contrat mensuel</td><td><strong>{h.prev}h</
            <tr><td>Heures réalisées</td><td>Pointage validé</td><td><strong>{h.real}h
            <tr><td>Solde</td><td>Différence</td><td style={{color:h.real-h.prev<0?"#D
            <tr><td>Salaire brut</td><td>Taux {contrat?.tauxHoraire}€/h</td><td><stron
            <tr><td>Repas suivis</td><td>Journaux renseignés</td><td><strong>{rep.leng
            <tr><td>Étapes dév.</td><td>Jalons OMS</td><td><strong>{ms.filter(m=>m.ok)
          </tbody>
        </table>
        <div style={{marginTop:14,paddingTop:10,borderTop:"1px solid #ddd",fontSize:11
          Document généré automatiquement par TiMat · Confidentiel
        </div>
      </div>
</div>}
{!showPrev&&<div className="card"style={{padding:16,background:"var(--Pp)",border: <div style={{fontWeight:700,fontSize:14,color:"var(--P)",marginBottom:8}}> Fon <div style={{fontSize:13,color:"var(--b)",lineHeight:1.7}}>
        TiMat génère automatiquement chaque mois un <strong>récapitulatif PDF complet<
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
 strong>
</stron
C2626":
g>{(h.r
th} jou
.length
,color:
"1px so
ctionn
/strong
a

 const generer=()=>{
  setLoading(true);setCr("");setEnvoye(false);
  setTimeout(()=>{
    const crs=CRS[enfant?.id]||CRS["e1"];
    const nextIdx=(idx+1)%crs.length;
    setIdx(nextIdx);
    setCr(crs[nextIdx]);
    setLoading(false);
},2200); };
return <div className="fi">
{toast&&<Toast msg={toast}onClose={()=>setToast("")}/>} <PageHeadericon=" "title="Compte-rendutrimestriel"
    sub="Document professionnel généré automatiquement - exclusivité TiMat"/>
  {role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"
    {liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>{setSelId(e.i
  <div className="g2">
    <div>
      <div className="card"style={{padding:18,marginBottom:12}}>
        <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap",alignItems
          <div style={{flex:1}}>
            <label className="lbl">Trimestre</label>
            <select className="sel"value={trim}onChange={e=>{setTrim(e.target.value)
              {["T1 2024","T2 2024","T3 2024","T4 2023","T3 2023"].map(t=><option ke
            </select>
          </div>
          <button className="btn bP"onClick={generer}disabled={loading}>
{loading?" Rédaction...":" Générer le CR"} </button>
        </div>
        {loading&&<div style={{display:"flex",alignItems:"center",gap:10,padding:"16
          <div className="ai-dot"/><div className="ai-dot"style={{animationDelay:".3
          <span style={{fontSize:13,color:"var(--m)",fontStyle:"italic"}}>Rédaction
        </div>}
{!loading&&!cr&&<div style={{textAlign:"center",padding:"20px 0",color:"var( <divstyle={{fontSize:36,marginBottom:8}}> </div>
<div style={{fontSize:13}}>Sélectionnez un trimestre et cliquez sur Génére
        </div>}
        {cr&&<div>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:14,lineHeight:
          <div style={{display:"flex",gap:8,marginTop:16,flexWrap:"wrap",alignItems:
            {role==="asmat"&&!envoye&&<button className="btn bS"onClick={()=>{setEnv
                 Envoyer aux parents
            </button>}
{role==="asmat"&&envoye&&<div style={{display:"flex",alignItems:"center" <spanstyle={{fontSize:14}}> </span>
      }}> d);setC
:"flex-
;setCr(
y={t}>{
px 0"}}
s"}}/><
du comp
--l)"}}
r.</div
2,color
"center
oye(tru
,gap:6,

                 <span style={{fontSize:13,fontWeight:700,color:"var(--S)"}}>CR envoyé
              </div>}
<button className="btn bP"onClick={generer}> Régénérer</button>
              <button className="btn bG"onClick={()=>navigator.clipboard?.writeText(cr
            </div>
          </div>}
        </div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div className="card"style={{padding:14,background:"var(--Pp)",border:"1px sol
          <div style={{fontWeight:700,fontSize:13,color:"var(--P)",marginBottom:8}}>
          <div style={{fontSize:13,color:"var(--b)",lineHeight:1.6}}>Un compte-rendu t
        </div>
        <div className="card"style={{padding:14}}>
<div style={{fontWeight:700,fontSize:13,marginBottom:10,color:"var(--b)"}}> {[[" Jalons acquis",ms.filter(m=>m.ok).length+"/"+ms.length],
[" Activités",pfs.length+" dans le portfolio"],
[" Transmissions",D.transmissions.filter(t=>t.eId===enfant?.id).length+" ].map(([l,v])=><div key={l}style={{display:"flex",justifyContent:"space-betw <span style={{color:"var(--m)"}}>{l}</span><span style={{fontWeight:600,co
          </div>)}
        </div>
      </div>
    </div>
</div>; }
//
const DOCS_DEMO=[
  // Médicaux
  {id:"d1",eId:"e1",cat:"medical",sous:"Carnet de santé",nom:"Carnet_santé_Léo_2024.pd
  {id:"d2",eId:"e1",cat:"medical",sous:"Ordonnance",nom:"Ordonnance_Léo_Mars2024.pdf",
  {id:"d3",eId:"e2",cat:"medical",sous:"Vaccins",nom:"Carnet_vaccins_Emma.pdf",date:"2
  {id:"d4",eId:"e3",cat:"medical",sous:"Allergie",nom:"Certificat_allergie_Noah.pdf",d
  // Administratifs
  {id:"d5",eId:"e1",cat:"admin",sous:"Contrat",nom:"Contrat_Léo_Sept2023.pdf",date:"20
  {id:"d6",eId:"e1",cat:"admin",sous:"Attestation fiscale",nom:"Attestation_fiscale_20
  {id:"d7",eId:"e2",cat:"admin",sous:"Contrat",nom:"Contrat_Emma_Sept2023.pdf",date:"2
  {id:"d8",eId:"e2",cat:"admin",sous:"Facture",nom:"Facture_Fevrier2024_Emma.pdf",date
  {id:"d9",eId:"e3",cat:"admin",sous:"Contrat",nom:"Contrat_Noah_Janv2024.pdf",date:"2
  // Pédagogiques
  {id:"d10",eId:"e1",cat:"peda",sous:"CR Trimestriel",nom:"CR_T1_2024_Léo.pdf",date:TO
  {id:"d11",eId:"e2",cat:"peda",sous:"CR Trimestriel",nom:"CR_T4_2023_Emma.pdf",date:"
  {id:"d12",eId:"e1",cat:"peda",sous:"Bilan de journée",nom:"Bilan_11Mars2024_Léo.pdf"
  // Agréments assmat
  {id:"d13",eId:null,cat:"agrement",sous:"Agrément PMI",nom:"Agrement_PMI_2024.pdf",da
  {id:"d14",eId:null,cat:"agrement",sous:"Assurance",nom:"Assurance_RC_Pro_2024.pdf",d
    à {pare
)}>
id var(
 Uniqu
rimestr
Donn
 échan
een",pa
lor:"va
f",date
date:"2
023-11-
ate:"20
23-09-0
23_Léo.
023-09-
:"2024-
024-01-
DAY_STR
2023-12
,date:T
te:"202
ate:"20
   C
e
é
g

 ];
const CATS={
medical:{l:"Médical",ic:" ",c:"#B84060",bg:"#FAEEF2"}, admin:{l:"Administratif",ic:" ",c:"#B8892A",bg:"#FBF5E0"}, peda:{l:"Pédagogique",ic:" ",c:"#6A3F88",bg:"#F2EAF8"}, agrement:{l:"Agréments&Pro",ic:" ",c:"#2E5F8A",bg:"#E6F0F8"},
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
  const [newDoc,setNewDoc]=useState({nom:"",cat:"medical",sous:"",eId:enfants[0]?.id||
  const [newFile,setNewFile]=useState(null);
  const uploadRef=useRef(null);
  // Load documents from Supabase on mount
  useEffect(()=>{
    if(isDemoMode||!user?.id)return;
    (async()=>{
      const{data,error}=await supabase.from('documents_meta').select('*').eq('asmat_id
      if(!error&&data)setDocs(data.map(d=>({
id:d.id,eId:d.enfant_id,cat:d.categorie||'admin',sous:d.sous_type||'', nom:d.nom,date:d.created_at?.slice(0,10)||TODAY_STR,annee:(d.created_at||'').s taille:d.taille||'-',icone:CATS[d.categorie]?.ic||' ',partage:d.partage!==fal url:d.storage_url||null,storagePath:d.storage_path||null
}))); })();
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
     ""});
',user.
lice(0, se,

 }).sort((a,b)=>b.date>a.date?1:-1);
const parCat=Object.entries(CATS).map(([k,v])=>({
  ...v, key:k,
  count:filtres.filter(d=>d.cat===k).length
})).filter(c=>c.count>0);
const telechargerDoc=(doc)=>{
  if(doc.url){
    window.open(doc.url,'_blank');
  }else{
setToast("Aperçu de "+doc.nom+" ✓"); }
};
const supprimerDoc=async(doc)=>{
  if(!window.confirm("Supprimer "+doc.nom+" ?"))return;
  if(doc.storagePath&&!isDemoMode){
    await supabase.storage.from('documents').remove([doc.storagePath]);
    await supabase.from('documents_meta').delete().eq('id',doc.id);
  }
  setDocs(p=>p.filter(d=>d.id!==doc.id));
setToast("Document supprimé ✓"); };
const ajouterDoc=async()=>{
  if(!newDoc.nom.trim()){setToast("Donne un nom au document");return;}
  setUploading(true);
  if(isDemoMode||!user?.id||!newFile){
    // Demo mode or no file: just add to local state
    setDocs(p=>[...p,{
id:"dn"+Date.now(),eId:newDoc.eId||null,cat:newDoc.cat, sous:newDoc.sous||CATS[newDoc.cat]?.l, nom:newDoc.nom+(newDoc.nom.endsWith(".pdf")?"":".pdf"), date:TODAY_STR,annee:new Date().getFullYear().toString(), taille:newFile?(newFile.size>1024*1024?(newFile.size/1024/1024).toFixed(1)+" M icone:CATS[newDoc.cat]?.ic||" ",partage:true,url:null
}]);
setToast("Document ajouté ✓"+(newFile?"":" (sans fichier - ajoutez un fichier po }else{
    // Real upload to Supabase Storage
    const ext=newFile.name.split('.').pop()||'pdf';
    const fileName=`${Date.now()}_${newDoc.nom.replace(/[^a-zA-Z0-9]/g,'_')}.${ext}`
    const path=`${user.id}/${newDoc.eId||'general'}/${fileName}`;
 const{error:upErr}=await supabase.storage.from('documents').upload(path,newFile,
o":(new
ur le s
;
{upsert

 if(upErr){
console.error('Upload doc:',upErr.message); setToast(" Erreur upload: "+upErr.message); setUploading(false);return;
}
    const{data:urlData}=supabase.storage.from('documents').getPublicUrl(path);
    const taille=newFile.size>1024*1024?(newFile.size/1024/1024).toFixed(1)+" Mo":(n
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
    const{data:inserted,error:metaErr}=await supabase.from('documents_meta').insert(
    if(metaErr)console.error('Meta insert:',metaErr.message);
setDocs(p=>[{ id:inserted?.id||"dn"+Date.now(),eId:newDoc.eId||null,cat:newDoc.cat, sous:newDoc.sous||CATS[newDoc.cat]?.l, nom:meta.nom,date:TODAY_STR,annee:new Date().getFullYear().toString(), taille,icone:CATS[newDoc.cat]?.ic||" ",partage:true, url:urlData.publicUrl,storagePath:path
},...p]);
setToast(" Document uploadé et sauvegardé"); }
  setNewDoc({nom:"",cat:"medical",sous:"",eId:enfants[0]?.id||""});
  setNewFile(null);
  setShowUpload(false);
  setUploading(false);
};
return <div className="fi">
{toast&&<Toast msg={toast}onClose={()=>setToast("")}/>} <PageHeadericon=" "title="EspaceDocuments"
    sub="Tous les documents classés par année - téléchargeables et imprimables"
    action={role==="asmat"&&<button className="btn bT"onClick={()=>setShowUpload(!sh
    {/* Formulaire ajout */}
ewFile.
meta).s
owUploa

 {showUpload&&<div className="card"style={{padding:18,marginBottom:16,border:"1.5px <div style={{fontWeight:700,fontSize:13,marginBottom:12,color:"var(--b)"}}> Aj <div className="g2"style={{marginBottom:10}}>
    <div>
      <label className="lbl">Nom du fichier</label>
      <input className="inp"value={newDoc.nom}onChange={e=>setNewDoc(p=>({...p,nom
</div> <div>
      <label className="lbl">Catégorie</label>
      <select className="sel"value={newDoc.cat}onChange={e=>setNewDoc(p=>({...p,ca
        {Object.entries(CATS).map(([k,v])=><option key={k}value={k}>{v.ic} {v.l}</
      </select>
</div> <div>
      <label className="lbl">Sous-type</label>
      <input className="inp"value={newDoc.sous}onChange={e=>setNewDoc(p=>({...p,so
    </div>
    <div>
      <label className="lbl">Enfant concerné</label>
      <select className="sel"value={newDoc.eId}onChange={e=>setNewDoc(p=>({...p,eI
        <option value="">- Document général -</option>
        {enfants.map(e=><option key={e.id}value={e.id}>{e.emoji} {e.prenom}</optio
      </select>
    </div>
  </div>
  <div style={{display:"flex",gap:8}}>
    <button className="btn bG"onClick={()=>{setShowUpload(false);setNewFile(null);
    <button className="btn bT"onClick={ajouterDoc}disabled={uploading}>{uploading?
  </div>
  {/* File picker */}
  <div style={{marginTop:10,padding:12,border:"2px dashed var(--br)",borderRadius:
    onClick={()=>uploadRef.current?.click()}>
    <input ref={uploadRef}type="file"accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,
      onChange={e=>{const f=e.target.files?.[0];if(f){setNewFile(f);if(!newDoc.nom
    {newFile
       ?<div style={{fontSize:12,color:"var(--S)"}}>
      :<div style={{fontSize:12,color:"var(--l)"}}>
  </div>
</div>}
{newFile.name} ({(newFile.si
Cliquer pour sélectionner un
 {/* Filtres */}
<div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap",alignItems:"cent
  {/* Années */}
  <div style={{display:"flex",gap:4}}>
    {["tous",...annees].map(a=><button key={a}onClick={()=>setAnnee(a)}style={{
      padding:"5px 12px",borderRadius:20,border:"1.5px solid",cursor:"pointer",fon
      fontFamily:"'DM Mono',monospace",
solid outer
:e.targ
t:e.tar
option>
us:e.ta
d:e.tar n>)}
}}>Annu " Up
10,text
.xlsx"s
.trim()
ze/102 fichi
er"}}>
tSize:1
  u
l
4 e

       background:annee===a?"var(--b)":"var(--w)",
      color:annee===a?"#fff":"var(--m)",
      borderColor:annee===a?"var(--b)":"var(--br)",
    }}>{a==="tous"?"Toutes":a}</button>)}
  </div>
<div style={{width:1,height:20,background:"var(--br)"}}/>
{/* Catégories */}
{[{key:"tous",l:"Tous",ic:" ",c:"var(--m)"},...Object.entries(CATS).map(([k,v])
    <button key={c.key}onClick={()=>setCat(c.key)}style={{
      padding:"5px 11px",borderRadius:20,border:"1.5px solid",cursor:"pointer",fon
      background:cat===c.key?c.c||"var(--b)":"transparent",
      color:cat===c.key?"#fff":c.c||"var(--m)",
      borderColor:cat===c.key?c.c||"var(--b)":c.bg||"var(--br)",
    }}>{c.ic} {c.l}</button>
  ))}
  {/* Enfant filter pour asmat */}
  {role==="asmat"&&<select value={eId}onChange={e=>setEId(e.target.value)}classNam
    <option value="tous">Tous les enfants</option>
    {enfants.map(e=><option key={e.id}value={e.id}>{e.emoji} {e.prenom}</option>)}
    <option value="">Général</option>
  </select>}
</div>
{/* Compteur */}
<div style={{fontSize:12,color:"var(--l)",marginBottom:14,fontFamily:"'DM Mono',mo
  {filtres.length} document{filtres.length>1?"s":""} · {annee==="tous"?"toutes ann
</div>
{/* Documents par catégorie */}
{filtres.length===0&&<div className="card"style={{padding:40,textAlign:"center"}}>
<divstyle={{fontSize:40,marginBottom:8}}> </div>
  <div style={{fontSize:14,color:"var(--l)"}}>Aucun document pour ces filtres.</di
</div>}
{parCat.map(c=>(
  <div key={c.key}style={{marginBottom:20}}>
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
      <div style={{padding:"4px 12px",borderRadius:20,background:c.bg,color:c.c,fo
        {c.ic} {c.l}
      </div>
      <div style={{flex:1,height:1,background:"linear-gradient(90deg,var(--br),tra
      <span style={{fontSize:11,color:"var(--l)",fontFamily:"'DM Mono',monospace"}
    </div>
    <div style={{display:"flex",flexDirection:"column",gap:6}}>
      {filtres.filter(d=>d.cat===c.key).map(doc=>{
        const enfant=doc.eId?enfants.find(e=>e.id===doc.eId):null;
        return <div key={doc.id}className="card"style={{padding:"12px 16px",displa
  =>({ke
tSize:1
e="sel"
nospace
ées":an
v>
ntSize:
nsparen
}>{c.co
y:"flex
y

           onMouseEnter={e=>e.currentTarget.style.boxShadow="var(--sh2)"}
          onMouseLeave={e=>e.currentTarget.style.boxShadow="var(--sh)"}>
          {/* Icone */}
          <div style={{width:40,height:40,borderRadius:10,background:CATS[doc.cat]
            {doc.icone}
          </div>
          {/* Info */}
          <div style={{flex:1,overflow:"hidden"}}>
            <div style={{fontWeight:600,fontSize:13,color:"var(--b)",overflow:"hid
            <div style={{display:"flex",gap:8,marginTop:3,flexWrap:"wrap"}}>
              <span style={{fontSize:11,color:"var(--l)"}}>{doc.sous}</span>
              <span style={{fontSize:11,color:"var(--l)"}}>·</span>
              <span style={{fontSize:11,color:"var(--l)",fontFamily:"'DM Mono',mon
              {doc.taille!=="-"&&<><span style={{fontSize:11,color:"var(--l)"}}>·<
              <span style={{fontSize:11,color:"var(--l)",fontFamily:"'DM Mono',mon
              {enfant&&<span className="badge"style={{background:enfant.couleur+"1
                {enfant.emoji} {enfant.prenom}
              </span>}
              {!doc.partage&&<span className="badge"style={{background:"var(--Bp)"
            </div>
          </div>
          {/* Actions */}
          <div style={{display:"flex",gap:6,flexShrink:0}}>
<button className="btn bG"style={{padding:"6px 10px",fontSize:12}} onClick={()=>setApercu(apercu===doc.id?null:doc.id)} title="Aperçu"> </button>
<button className="btn bG"style={{padding:"6px 10px",fontSize:12}} onClick={()=>telechargerDoc(doc)}
title="Télécharger"> </button>
<button className="btn bG"style={{padding:"6px 10px",fontSize:12}} onClick={()=>{if(doc.url)window.open(doc.url);else setToast("Impress title="Imprimer"> </button>
{role==="asmat"&&<button className="btn bG"style={{padding:"6px 10px", onClick={()=>supprimerDoc(doc)}
title="Supprimer"> </button>}
          </div>
        </div>;
})} </div>
</div> ))}
{/* Aperçu simulé */}
{apercu&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",display
  {(()=>{const doc=docs.find(d=>d.id===apercu);if(!doc)return null;
    return <div style={{background:"var(--w)",borderRadius:16,padding:0,width:"100
      <div style={{background:"linear-gradient(135deg,var(--T),#8A3A20)",padding:"
    ?.bg||"
den",te
ospace"
/span>
ospace"
8",colo
,color:
ion: "+
fontSiz
:"flex"
%",maxW
16px 20

   <div style={{color:"#fff"}}>
    <div style={{fontWeight:700,fontSize:15}}>{doc.icone} {doc.nom}</div>
    <div style={{fontSize:11,opacity:.8,marginTop:2}}>{doc.sous} · {doc.date
</div>
  <button onClick={()=>setApercu(null)}style={{background:"rgba(255,255,255,
</div>
<div style={{padding:24}}>
  <div style={{background:"var(--c)",borderRadius:12,padding:20,minHeight:20
    <div style={{fontSize:52}}>{doc.icone}</div>
    <div className="pf"style={{fontSize:18,fontWeight:600,color:"var(--b)"}}
    <div style={{fontSize:12,color:"var(--l)"}}>Aperçu non disponible en mod
    <div style={{fontSize:11,color:"var(--l)"}}>Dans la version finale, le P
  </div>
  <div style={{display:"flex",gap:8,marginTop:16,justifyContent:"flex-end"}}
    <button className="btn bG"onClick={()=>{if(doc.url)window.open(doc.url);
               <button className="btn bT"onClick={()=>telechargerDoc(doc)}>
            </div>
          </div>
        </div>;
      })()}
    </div>}
</div>; }
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
Télécharg
const h=isDemoBull?(D.heures[enfant?.id]||{real:160,prev:174}):{real:hMens,prev:hMen
.split(
.2)",bo
0,displ
>{doc.n
e démo<
DF s'af
>
else wi
er</bu
s};
t

 const tauxH=contrat.tauxHoraire||4.05;
const heuresNorm=Math.min(h.real,45*4);
const hSupp=Math.max(0,h.real-heuresNorm);
const salBase=heuresNorm*tauxH;
const salSupp=hSupp*tauxH*1.25;
const brut=salBase+salSupp;
const entretien=(contrat.entretien||3.80)*Math.round(h.real/8);
const totalCotSal=Object.values(TAUX_COTISATIONS).reduce((s,t)=>s+(t.sal>0?brut*t.sa
const totalCotPat=Object.values(TAUX_COTISATIONS).reduce((s,t)=>s+(t.pat>0?brut*t.pa
const netImposable=brut-totalCotSal*0.68;
const netPaye=brut-totalCotSal;
const coutEmployeur=brut+totalCotPat;
return <div className="fi">
{toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
<PageHeadericon=" "title="Bulletindesalaire"sub="Bulletinofficielconforme {role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"
    {liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>setSelId(e.id
  </div>}
  <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
    {["Janvier 2024","Février 2024","Mars 2024"].map(m=><button key={m}onClick={()=>
      padding:"6px 14px",borderRadius:8,border:"1.5px solid",cursor:"pointer",fontSi
      background:moisSel===m?"var(--b)":"transparent",color:moisSel===m?"#fff":"var(
      borderColor:moisSel===m?"var(--b)":"var(--br)"}}>{m}</button>)}
  </div>
  <div className="card"style={{padding:24,border:"2px solid var(--br)"}}>
    <div style={{borderBottom:"2px solid var(--b)",paddingBottom:14,marginBottom:14}
      <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap
        <div>
          <div className="pf"style={{fontSize:18,fontWeight:700,color:"var(--b)"}}>B
          <div style={{fontSize:11,color:"var(--l)"}}>Convention collective particul
        </div>
        <div style={{textAlign:"right",fontSize:11}}>
          <div style={{fontWeight:700,color:"var(--b)"}}>Employeur</div>
          <div style={{color:"var(--m)"}}>{enfant?.prenomParent||"Sophie Martin"}</d
          <div style={{color:"var(--l)"}}>N° Pajemploi : PAJ-2024-75015</div>
        </div>
      </div>
      <div style={{marginTop:10,display:"flex",justifyContent:"space-between",flexWr
        <div><div style={{fontWeight:700,color:"var(--b)"}}>Salarié·e</div>
          <div style={{color:"var(--m)"}}>{user?.prenom||D.asmat.prenom} {user?.nom|
        </div>
      </div>
    </div>
 {/* Rémunération */}
l/100:0
t/100:0
à la c
}}>
)}/>)}
setMois
ze:12,f
--m)",
}> :10}}>
ULLETIN
iers em
iv>
ap:"wra
|D.asma
o

 <div style={{marginBottom:14}}>
  <div style={{fontSize:10,fontWeight:700,color:"var(--l)",textTransform:"upperc
  {[["Salaire de base",heuresNorm+"h × "+tauxH+"€/h",salBase.toFixed(2)+"€"],
    ...(hSupp>0?[["Heures majorées 25%",hSupp+"h × "+(tauxH*1.25).toFixed(2)+"€"
    ["Indemnité d'entretien",Math.round(h.real/8)+" j × "+(contrat.entretien||3.
  ].map(([l,d,v])=><div key={l}style={{display:"flex",justifyContent:"space-betw
    <span style={{color:"var(--b)",flex:2}}>{l}</span>
    <span style={{color:"var(--l)",flex:2,textAlign:"center"}}>{d}</span>
    <span style={{fontWeight:600,flex:1,textAlign:"right"}}>{v}</span>
  </div>)}
  <div style={{display:"flex",justifyContent:"space-between",fontWeight:700,marg
    <span>SALAIRE BRUT</span><span style={{color:"var(--b)"}}>{brut.toFixed(2)}
  </div>
</div>
{/* Cotisations */}
<div style={{marginBottom:14}}>
  <div style={{fontSize:10,fontWeight:700,color:"var(--l)",textTransform:"upperc
  <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr",fontSize:10}}>
    {["Libellé","Salarié","Employeur"].map(h2=><div key={h2}style={{fontWeight:7
    {Object.entries(TAUX_COTISATIONS).flatMap(([nom,t])=>[
      <div key={nom+"l"}style={{fontSize:10,color:"var(--m)",padding:"2px 0",bor
      <div key={nom+"s"}style={{fontSize:10,textAlign:"right",color:"var(--R)",p
      <div key={nom+"p"}style={{fontSize:10,textAlign:"right",padding:"2px 0",bo
    ])}
    <div style={{fontWeight:700,fontSize:11,padding:"4px 0",borderTop:"1px solid
    <div style={{fontWeight:700,fontSize:11,textAlign:"right",color:"var(--R)",p
    <div style={{fontWeight:700,fontSize:11,textAlign:"right",padding:"4px 0",bo
  </div>
</div>
{/* Net */}
<div style={{background:"var(--c)",borderRadius:10,padding:14,marginBottom:16}}>
  {[["Salaire brut",brut.toFixed(2)+"€","var(--b)"],
    ["Cotisations salariales","-"+totalCotSal.toFixed(2)+"€","var(--R)"],
    ["NET À PAYER",netPaye.toFixed(2)+"€","var(--S)"],
    ["Net imposable (abattement fiscal assmat)",netImposable.toFixed(2)+"€","var
    ["Coût total pour l'employeur",(coutEmployeur+entretien).toFixed(2)+"€","var
  ].map(([l,v,c])=><div key={l}style={{display:"flex",justifyContent:"space-betw
    borderBottom:"1px solid var(--br)",fontSize:l.includes("NET À")?14:12,fontWe
    <span style={{color:"var(--m)"}}>{l}</span><span style={{fontWeight:700,colo
  </div>)}
</div>
<div style={{fontSize:10,color:"var(--l)",lineHeight:1.6,marginBottom:14}}>
  Bulletin conforme CCN particuliers employeurs. Net imposable calculé avec abat
</div>
ase",le
,salSup
80)+"€"
een",fo
inTop:6
€</span
ase",le
00,colo
derBott
adding:
rderBot
 var(--
adding:
rderTop
(--B)"]
(--m)"]
een",pa
ight:l.
r:c}}>{
tement

 <div style={{display:"flex",gap:8}}>
  <button className="btn bG"style={{flex:1}}onClick={()=>{
  const w=window.open('','_blank');
  if(!w){setToast('Autorisez les popups pour télécharger');return;}
  const prenomEmp=enfant?.prenomParent||(enfant?.parentId?"Parent employeur":"Pa
  const cotisDetails=Object.entries(TAUX_COTISATIONS).map(function(entry){
    var nom=entry[0],t=entry[1];
    return "<tr><td>"+nom+"</td>"
      +"<td class=\"right\">"+(t.sal>0?(brut*t.sal/100).toFixed(2)+"€":"-")+"</t
      +"<td class=\"right\">"+(t.pat>0?(brut*t.pat/100).toFixed(2)+"€":"-")+"</t
  }).join("");
  var hSuppRow=hSupp>0?"<tr><td>Heures compl. (maj. 25%)</td><td class=\"right\"
  var htmlParts=[
    "<!DOCTYPE html><html lang=\"fr\"><head><meta charset=\"UTF-8\"/>",
    "<title>Bulletin de salaire "+moisSel+"</title>",
    "<style>",
    "*{box-sizing:border-box;margin:0;padding:0}",
    "body{font-family:Arial,sans-serif;font-size:11px;color:#222;padding:20px;ma
    "h1{font-size:16px;color:#2C1F14;text-align:center;margin:12px 0}",
    ".hg{display:grid;grid-template-columns:1fr 1fr;gap:12px;background:#F5F0EB;
    ".hg div{font-size:10px;line-height:1.7}",
    ".hg strong{font-size:11px;color:#B8622F}",
    ".st{background:#2C1F14;color:#fff;padding:5px 10px;font-weight:700;font-siz
    "table{width:100%;border-collapse:collapse;font-size:10px}",
    "td,th{padding:5px 8px;border:1px solid #ddd}",
    "th{background:#f5f5f5;font-weight:700;text-align:left}",
    ".right{text-align:right}",
    ".brut{background:#FBF0E8;font-weight:700;font-size:11px}",
    ".net{background:#B8622F;color:#fff;font-weight:700;font-size:13px}",
    ".ni{background:#EAF4EE;font-weight:700;color:#3D6B50}",
    ".ce{background:#F5F0FF;font-weight:700}",
    ".sz{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:20px}",
    ".sb{border:1px solid #ddd;height:60px;border-radius:4px;padding:8px;font-si
    "@media print{.nb{display:none}}",
    "</style></head><body>",
    "<div style=\"text-align:center;margin-bottom:8px\">",
    "<div style=\"font-size:9px;color:#888;text-transform:uppercase;letter-spaci
    "<h1>BULLETIN DE PAIE</h1>",
    "<div style=\"font-size:12px;color:#B8622F;font-weight:700\">"+moisSel+"</di
    "</div>",
    "<div class=\"hg\">",
    "<div><strong>EMPLOYEUR (Particulier)</strong><br/>"+prenomEmp+"<br/>",
    "N° Pajemploi : PAJ-"+new Date().getFullYear()+"-"+Math.floor(Math.random()*
    "Emploi : Assistante maternelle agréée<br/>Code APE : 8891A</div>",
    "<div><strong>SALARIE(E)</strong><br/>"+(user?.prenom||"Prénom")+" "+(user?.
    "Entree le : "+(contrat.debut||"-")+" - CDI</div>",
    "</div>",
rent");
d>" d></tr>
>"+hSup
x-width
padding
e:11px;
ze:9px;
ng:1px\ v>",
99999)+
nom||"N

           "<div class=\"st\">REMUNERATION</div>",
          "<table><tr><th>Libellé</th><th>Heures / Jours</th><th>Taux</th><th class=\"
          "<tr><td>Salaire de base (heures normales)</td><td class=\"right\">"+heuresN
          hSuppRow,
          "<tr><td>Indemnite d entretien</td><td class=\"right\">"+Math.round(h.real/8
          "<tr class=\"brut\"><td colspan=\"3\">SALAIRE BRUT MENSUEL</td><td class=\"r
          "</table>",
          "<div class=\"st\">COTISATIONS SOCIALES</div>",
          "<table><tr><th>Cotisation</th><th class=\"right\">Part salarie</th><th clas
          cotisDetails,
          "<tr style=\"font-weight:700;background:#f5f5f5\"><td>TOTAL</td><td class=\"
          "</table>",
          "<div class=\"st\">RECAPITULATIF NET</div>",
          "<table>",
          "<tr><td>Salaire brut</td><td class=\"right\">"+brut.toFixed(2)+" euros</td>
          "<tr><td>Cotisations salariales</td><td class=\"right\" style=\"color:#c44a6
          "<tr class=\"net\"><td>NET A PAYER</td><td class=\"right\">"+netPaye.toFixed
          "<tr class=\"ni\"><td>Net imposable (abattement fiscal assmat)</td><td class
          "<tr><td>Indemnite entretien (non imposable)</td><td class=\"right\">"+entre
          "<tr class=\"ce\"><td>Cout total employeur (brut + cotis. patronales)</td><t
          "</table>",
          "<div class=\"sz\">",
          "<div><div style=\"font-size:10px;font-weight:700;margin-bottom:6px\">Signat
          "<div><div style=\"font-size:10px;font-weight:700;margin-bottom:6px\">Signat
          "</div>",
          "<p style=\"margin-top:16px;font-size:9px;color:#888;line-height:1.8\">",
          "Bulletin TiMat - "+new Date().toLocaleDateString("fr-FR")+" | CCN Particuli
          "</p>",
          "<div style=\"text-align:center;margin-top:12px\">",
          "<button class=\"nb\" onclick=\"window.print()\" style=\"background:#B8622F;
          "</div>",
          "</body></html>"
        ];
        var htmlBulletin=htmlParts.join("");
                w.document.write(htmlBulletin);
        w.document.close();
setToast('Bulletin ouvert dans un nouvel onglet ✓'); }}> Télécharger PDF</button>
        {role==="asmat"&&<button className="btn bT"style={{flex:1}}onClick={()=>setToa
      </div>
    </div>
  </div>;
}
//
const MODELES_CONTRATS=[
 {id:"ct1",titre:"Contrat standard - Temps plein",desc:"Accueil 5j/semaine, mensualis
right\"
orm+" h
)+" jou
ight\">
s=\"rig
right\"
</tr>",
a\">- "
(2)+" e
=\"righ
tien.to
d class
ure de ure de
ers Emp
color:#
st("Bul
ation 4

    champs:["Enfant","Date de début","Jours","Horaires","Taux horaire (€/h)","Indemnité
  {id:"ct2",titre:"Contrat - Temps partiel",desc:"Accueil moins de 5 jours ou moins de
   champs:["Enfant","Jours","Horaires","Taux horaire (€/h)","Indemnité entretien (€/j)
  {id:"ct3",titre:"Contrat périscolaire",desc:"Accueil matin, soir, mercredis et vacan
   champs:["Enfant","Créneaux matin/soir","Planning vacances","Taux horaire (€/h)"],av
  {id:"ct4",titre:"Avenant - Modification d'horaires",desc:"Modifier les jours ou hora
   champs:["Contrat concerné","Nouveaux horaires","Date d'effet","Motif"],avenant:true
  {id:"ct5",titre:"Avenant - Revalorisation salaire",desc:"Augmenter le taux horaire s
   champs:["Contrat concerné","Nouveau taux horaire","Date d'effet","Motif"],avenant:t
  {id:"ct6",titre:"Rupture amiable",desc:"Fin de contrat d'un commun accord avec solde
   champs:["Contrat concerné","Date de fin","Motif","Congés payés restants"],avenant:t
];
function DemandesAvenants({enfants,role,pEId}){
  const liste=role==="parent"?enfants.filter(e=>e.id===pEId):enfants;
  const enfant=liste[0];
  const [demandes,setDemandes]=useState([]);
  const [form,setForm]=useState({type:"Modification d'horaires",detail:"",dateEffet:""
  const [toast,setToast]=useState("");
  const types=["Modification d'horaires","Revalorisation du salaire","Modification des
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
setForm({type:"Modification d'horaires",detail:"",dateEffet:""}); setToast("Demande d'avenant envoyée ✓ - l'asmat sera notifiée");
};
  const statutColor={
    "En attente":"var(--G)","Acceptée":"var(--S)","Refusée":"var(--R)","Signée":"var(-
};
return <div>
{toast&&<Toast msg={toast}onClose={()=>setToast("")}/>} <PageHeadericon=" "title="Demandesd'avenants"
      sub="Toute modification du contrat doit faire l'objet d'un avenant signé"/>
    <div className="card"style={{padding:20,marginBottom:16}}>
 entret
 30h/se
"],aven
ces sco
enant:f
ires d'
},
uite SM rue},
tout c rue},
});
jours
-T)"

   <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:14}}>
       Nouvelle demande d'avenant
  </div>
  <div style={{display:"grid",gap:12}}>
    <div>
      <label className="lbl">Type de modification</label>
      <select className="sel"value={form.type}onChange={e=>setForm(p=>({...p,type:
        {types.map(t=><option key={t}>{t}</option>)}
      </select>
</div> <div>
      <label className="lbl">Date d'effet souhaitée *</label>
      <input type="date"className="inp"value={form.dateEffet}
        onChange={e=>setForm(p=>({...p,dateEffet:e.target.value}))}/>
    </div>
    <div>
      <label className="lbl">Détail de la demande *</label>
      <textarea className="ta"placeholder="Décrivez précisément la modification so
        value={form.detail}onChange={e=>setForm(p=>({...p,detail:e.target.value}))
        style={{minHeight:80}}/>
    </div>
    <button className="btn bT"style={{justifyContent:"center"}}onClick={soumettre}
      disabled={!form.detail.trim()||!form.dateEffet}>
         Soumettre la demande
    </button>
  </div>
</div>
{demandes.length>0&&<div style={{display:"flex",flexDirection:"column",gap:8}}> <div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:6}}> His {demandes.map(d=><div key={d.id}className="card"style={{padding:14}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-st
      <div>
        <div style={{fontWeight:700,fontSize:13,color:"var(--b)"}}>{d.type}</div>
        <div style={{fontSize:11,color:"var(--l)"}}>Demande du {fmt(d.date)} · Eff
      </div>
      <span className="badge"style={{background:"var(--Gp)",color:statutColor[d.st
        {d.statut}
      </span>
    </div>
    <div style={{fontSize:12,color:"var(--m)",background:"var(--c)",borderRadius:8
      {d.detail}
    </div>
    {role==="asmat"&&d.statut==="En attente"&&<div style={{display:"flex",gap:8,ma
<button className="btn bG"style={{fontSize:11}} onClick={()=>setDemandes(p=>p.map(x=>x.id===d.id?{...x,statut:"Refusée"}:x ✕ Refuser
   e.targe
uhaitée }
toriqu
art",ma
et le {
atut],f
,paddin
rginTop ))}>
e

           </button>
          <button className="btn bT"style={{fontSize:11,flex:1,justifyContent:"center"
            onClick={()=>setDemandes(p=>p.map(x=>x.id===d.id?{...x,statut:"Acceptée"}:
✓ Accepter et créer l'avenant </button>
        </div>}
      </div>)}
</div>}
{demandes.length===0&&<div className="card"style={{padding:24,textAlign:"center"}} <divstyle={{fontSize:36,marginBottom:8}}> </div>
<div style={{fontSize:13,color:"var(--m)"}}>Aucune demande d'avenant en cours</d <div style={{fontSize:11,color:"var(--l)",marginTop:4}}>Les demandes soumises ap
    </div>}
  </div>;
}
function ContratsTypes({enfants}){
  const [selModele,setSelModele]=useState(null);
  const [form,setForm]=useState({});
  const [toast,setToast]=useState("");
  const m=MODELES_CONTRATS.find(x=>x.id===selModele);
return <div className="fi">
{toast&&<Toast msg={toast}onClose={()=>setToast("")}/>} <PageHeadericon=" "title="Modèlescontrats&Avenants"
      sub="Conformes CCN · À jour de la convention collective 2024"/>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(270px,1fr
      {MODELES_CONTRATS.map(mod=><div key={mod.id}className="card card-lift"
        onClick={()=>{setSelModele(mod.id===selModele?null:mod.id);setForm({});}}
        style={{padding:16,cursor:"pointer",
          borderLeft:(mod.avenant?"4px solid var(--G)":"4px solid var(--T)"),
          boxShadow:selModele===mod.id?"var(--sh2)":"var(--sh)"}}>
        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
          <span className="badge"style={{background:mod.avenant?"var(--Gp)":"var(--Tp)
            {mod.avenant?"Avenant":"Contrat"}
          </span>
        </div>
        <div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:4}}>{mod
        <div style={{fontSize:11,color:"var(--m)",lineHeight:1.5}}>{mod.desc}</div>
      </div>)}
</div>
    {m&&<div className="card"style={{padding:20,border:"2px solid var(--T)"}}>
      <div style={{fontWeight:700,fontSize:15,color:"var(--b)",marginBottom:4}}>{m.tit
      <div style={{fontSize:12,color:"var(--l)",marginBottom:16}}>{m.desc}</div>
  }} x))}>
>
iv> paraîtr
))",gap
",color
.titre}
re}</di

       <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16
        {m.champs.map(c=><div key={c}>
          <label className="lbl">{c}</label>
          {c==="Enfant"?<select className="sel"value={form[c]||""}onChange={e=>setForm
            {enfants.map(e=><option key={e.id}value={e.id}>{e.emoji} {e.prenom}</optio
          </select>
          :c.includes("Date")||c.includes("effet")?<input type="date"className="inp"va
          :<input className="inp"placeholder={c+"..."}value={form[c]||""}onChange={e=>
        </div>)}
      </div>
      <div style={{display:"flex",gap:8}}>
        <button className="btn bG"style={{flex:1}}onClick={()=>setSelModele(null)}>Ann
        <button className="btn bT"style={{flex:2}}onClick={()=>setToast((m.avenant?"Av
             Générer le document
        </button>
      </div>
    </div>}
</div>; }
//
const COURRIERS_DATA=[
{id:"r1",cat:"Contrat",ic:" ",titre:"Demandederendez-vousd'embauche", contenu:"Madame, Monsieur,\n\nSuite à notre prise de contact, je vous confirme ma d
{id:"r2",cat:"Contrat",ic:" ",titre:"Lettrederupturedecontrat", contenu:"Madame, Monsieur,\n\nJe vous informe que je mets fin au contrat d'accueil
{id:"r3",cat:"Financier",ic:" ",titre:"Miseendemeuredepaiementdesalaire", contenu:"Madame, Monsieur,\n\nLe salaire de [Mois] d'un montant de [Montant]€ reste
{id:"r4",cat:"PMI",ic:" ",titre:"Compte-rendudevisitePMI",
contenu:"Objet : Compte-rendu de la visite du [Date]\n\nSuite à la visite de [Nom p
{id:"r5",cat:"Congés",ic:" ",titre:"Déclarationdecongésannuels", contenu:"Madame, Monsieur,\n\nJe vous informe que je prendrai mes congés du [Date d
{id:"r6",cat:"Avenant",ic:" ",titre:"Propositiond'avenantauxhoraires", contenu:"Madame, Monsieur,\n\nJe vous propose de modifier le contrat d'accueil de [
{id:"r7",cat:"PMI",ic:" ",titre:"Demandederenouvellementd'agrément", contenu:"Madame, Monsieur le Médecin chef de PMI,\n\nJe sollicite le renouvellement
];
function CourriersTypes({enfants,pEId,user}){
  const [selId,setSelId]=useState(null);
  const [filtreCat,setFiltreCat]=useState("Tous");
  const [toast,setToast]=useState("");
  const cats=["Tous","Contrat","Financier","Congés","Avenant","PMI"];
  const filtres=filtreCat==="Tous"?COURRIERS_DATA:COURRIERS_DATA.filter(c=>c.cat===fil
  const sel=COURRIERS_DATA.find(c=>c.id===selId);
  const enfant=enfants.find(e=>e.id===pEId)||enfants[0];
  const texte=sel?sel.contenu.replace(/\[Prénom\]/g,enfant?.prenom||"[Prénom]").replac
        }}>
(f=>({. n>)}
lue={fo
setForm
uler</b
enant g
isponib
de [Pré
 impayé
uéricul
ébut] a
Prénom]
 de mon
treCat)
e(/\[Vo

  return <div className="fi">
{toast&&<Toast msg={toast}onClose={()=>setToast("")}/>} <PageHeadericon=" "title="Courrierstypes"
      sub="Modèles prêts à personnaliser - conformes à la convention collective"/>
    <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>
      {cats.map(c=><button key={c}onClick={()=>{setFiltreCat(c);setSelId(null);}}style
        padding:"5px 12px",borderRadius:20,border:"1.5px solid",cursor:"pointer",fontS
        background:filtreCat===c?"var(--b)":"transparent",color:filtreCat===c?"#fff":"
        borderColor:filtreCat===c?"var(--b)":"var(--br)"}}>{c}</button>)}
    </div>
    <div className="g2">
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {filtres.map(c=><div key={c.id}className="card card-lift"
          onClick={()=>setSelId(c.id===selId?null:c.id)}
          style={{padding:14,cursor:"pointer",
            borderLeft:(c.cat==="Financier"?"4px solid var(--R)":c.cat==="PMI"?"4px so
            boxShadow:selId===c.id?"var(--sh2)":"var(--sh)"}}>
          <div style={{display:"flex",gap:10,alignItems:"center"}}>
            <span style={{fontSize:18}}>{c.ic}</span>
            <div>
              <div style={{fontWeight:700,fontSize:13,color:"var(--b)"}}>{c.titre}</di
              <span className="badge"style={{background:"var(--c)",color:"var(--l)",fo
            </div>
          </div>
        </div>)}
      </div>
      {sel?<div className="card"style={{padding:18}}>
        <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:12}}>{se
        <textarea className="ta"defaultValue={texte}
          style={{width:"100%",minHeight:260,resize:"vertical",fontSize:13,lineHeight:
        <div style={{display:"flex",gap:8}}>
          <button className="btn bG"style={{flex:1}}onClick={()=>{navigator.clipboard?
          <button className="btn bT"style={{flex:1}}onClick={()=>setToast("PDF généré
        </div>
      </div>
      :<div className="card"style={{padding:28,textAlign:"center",color:"var(--l)"}}>
<divstyle={{fontSize:36,marginBottom:8}}> </div>
        <div style={{fontSize:13}}>Sélectionnez un modèle pour le personnaliser</div>
      </div>}
    </div>
  </div>;
}
//
function ImportContrat({onFinish}){
  const [step,setStep]=useState(1);
={{
ize:12,
var(--m
lid var
v> ntSize:
l.ic} {
1.7,mar
.writeT ✓")}>

 const [data,setData]=useState({
  prenomAsmat:"",emailAsmat:"",prenomEnfant:"",dateNaiss:"",
  prenomParent:"",emailParent:"",debut:"",jours:[],
  heures:"",taux:"",entretien:"3.80",source:"Top-Assmat"
});
const [toast,setToast]=useState("");
const toggle=(j)=>setData(d=>({...d,jours:d.jours.includes(j)?d.jours.filter(x=>x!==
return <div style={{minHeight:"100vh",background:"var(--c)",display:"flex",alignItem
  {toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
  <div style={{width:"100%",maxWidth:520}}>
    <div style={{display:"flex",gap:4,marginBottom:24}}>
      {[1,2,3].map(s=><div key={s}style={{flex:1,height:4,borderRadius:2,
        background:step>=s?"var(--T)":"var(--br)",transition:"background .3s"}}/>)}
    </div>
    <div className="card"style={{padding:28}}>
      {step===1&&<>
        <div className="pf"style={{fontSize:20,fontWeight:700,color:"var(--b)",margi
        <div style={{fontSize:13,color:"var(--l)",marginBottom:20,lineHeight:1.6}}>B
        <div style={{marginBottom:14}}>
          <label className="lbl">Depuis quel outil ?</label>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {["Top-Assmat","Nounou-Top","NannyFit","Pandi-Panda","Envola","Papier"].
              onClick={()=>setData(d=>({...d,source:s}))}style={{
                padding:"6px 12px",borderRadius:20,border:"1.5px solid",cursor:"poin
                background:data.source===s?"var(--T)":"transparent",color:data.sourc
                borderColor:data.source===s?"var(--T)":"var(--br)"}}>{s}</button>)}
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBotto
          <div><label className="lbl">Votre prénom</label><input className="inp"plac
          <div><label className="lbl">Votre email</label><input type="email"classNam
</div>
        <button className="btn bT"style={{width:"100%"}}onClick={()=>setStep(2)}disa
      </>}
      {step===2&&<>
        <div className="pf"style={{fontSize:20,fontWeight:700,color:"var(--b)",margi
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBotto
          <div><label className="lbl">Prénom de l'enfant</label><input className="in
          <div><label className="lbl">Date de naissance</label><input type="date"cla
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBotto
          <div><label className="lbl">Prénom du parent</label><input className="inp"
          <div><label className="lbl">Email du parent</label><input type="email"clas
        </div>
        <div style={{display:"flex",gap:8}}>
<button className="btn bG"style={{flex:1}}onClick={()=>setStep(1)}>← Retou
j):[...
s:"cent
nBottom
asculez
map(s=>
ter",fo
e===s?"
m:10}}>
eholder
e="inp"
bled={!
nBottom
m:10}}>
p"place
ssName=
m:10}}>
placeho
sName="
r</butt

             <button className="btn bT"style={{flex:2}}onClick={()=>setStep(3)}disabled
          </div>
        </>}
        {step===3&&<>
          <div className="pf"style={{fontSize:20,fontWeight:700,color:"var(--b)",margi
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBotto
            <div><label className="lbl">Date de début</label><input type="date"classNa
            <div><label className="lbl">Heures / semaine</label><input type="number"cl
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBotto
            <div><label className="lbl">Taux horaire net (€)</label><input type="numbe
            <div><label className="lbl">Indemnité entretien (€/j)</label><input type="
          </div>
          <div style={{marginBottom:14}}>
            <label className="lbl">Jours d'accueil</label>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {["Lundi","Mardi","Mercredi","Jeudi","Vendredi"].map(j=><button key={j}o
                padding:"6px 12px",borderRadius:20,border:"1.5px solid",cursor:"pointe
                background:data.jours.includes(j)?"var(--S)":"transparent",color:data.
                borderColor:data.jours.includes(j)?"var(--S)":"var(--br)"}}>{j.slice(0
            </div>
          </div>
          <div style={{background:"var(--Sp)",borderRadius:10,padding:"10px 14px",marg
               Ces données seront reprises immédiatement dans TiMat. Modifiables à tou
          </div>
          <div style={{display:"flex",gap:8}}>
            <button className="btn bG"style={{flex:1}}onClick={()=>setStep(2)}>← Retou
            <button className="btn bT"style={{flex:2}}onClick={()=>{setToast("Contrat
          </div>
</>} </div>
    </div>
  </div>;
}
//
function Parrainage({user}){
  const [copied,setCopied]=useState(false);
  const [toast,setToast]=useState("");
  const prefix=(user?.prenom||"MARIE").toUpperCase().slice(0,4);
  const codeNum=Math.abs((user?.email||"test").split("").reduce((a,c)=>a+c.charCodeAt(
  const code="TM-"+prefix+"-"+codeNum;
  const lien="https://timat.app/rejoindre?code="+code;
  const copy=()=>{navigator.clipboard?.writeText(lien).catch(()=>{});setCopied(true);s
  const filleules=[
    {prenom:"Nathalie",ville:"Lyon",date:"Il y a 5 jours",statut:"actif",gain:"1 mois
    {prenom:"Camille",ville:"Bordeaux",date:"Il y a 2 semaines",statut:"essai",gain:"E
 ={!data
nBottom
m:10}}>
me="inp
assName
m:12}}>
r"step=
number"
nClick=
r",font
jours.i
,2)}</b
inBotto
t mome
r</butt
importé
0),1000
etTimeo
offert"
n cours
n

 ];
return <div className="fi">
{toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
<PageHeadericon=" "title="Parrainage"sub="Invitezvoscollègues-gagnezdesm <div style={{background:"linear-gradient(135deg,#1C3028,#3D6B50)",borderRadius:20,
<divstyle={{fontSize:36,marginBottom:10}}> </div>
<div className="pf"style={{fontSize:20,fontWeight:700,color:"#fff",marginBottom: <div style={{fontSize:13,color:"rgba(255,255,255,.75)",lineHeight:1.7,marginBott
      Pour chaque asmat qui s'inscrit et passe Pro avec votre code :<br/>
      <strong style={{color:"#E8B060"}}>Vous gagnez 1 mois gratuit · Elle gagne 1 mo
    </div>
    <div style={{background:"rgba(255,255,255,.1)",borderRadius:10,padding:"12px 16p
      <div style={{fontSize:10,color:"rgba(255,255,255,.5)",textTransform:"uppercase
      <div style={{fontFamily:"'DM Mono',monospace",fontSize:22,fontWeight:700,color
    </div>
    <div style={{display:"flex",gap:8,alignItems:"center",background:"rgba(255,255,2
      <span style={{fontSize:11,color:"rgba(255,255,255,.6)",flex:1,overflow:"hidden
      <button onClick={copy}style={{background:copied?"var(--S)":"rgba(255,255,255,.
{copied?"✓ Copié":"Copier"} </button>
    </div>
    <div style={{display:"flex",gap:8}}>
<button onClick={()=>setToast("Message SMS préparé ✓")}style={{background:"rgb
<button onClick={()=>setToast("Message WhatsApp préparé ✓")}style={{background </div>
  </div>
  <div className="card"style={{padding:18,marginBottom:16}}>
<div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:12}}>Comme {[["1","Partagezvotrelien"," "],["2","Votrecollègues'inscrit"," "],["3","E
      <div key={n}style={{display:"flex",gap:12,alignItems:"center",padding:"8px 0",
        <div style={{width:28,height:28,borderRadius:"50%",background:"var(--Tp)",di
        <span style={{flex:1,fontSize:13,color:"var(--b)"}}>{t}</span>
        <span style={{fontSize:18}}>{ic}</span>
      </div>)}
  </div>
  <div className="card"style={{padding:18}}>
    <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:12}}>
      Mes filleules · <span style={{color:"var(--S)"}}>{filleules.length} inscrites<
      {" · "}<span style={{color:"var(--T)"}}>{filleules.filter(f=>f.statut==="actif
    </div>
    {filleules.map((f,i)=><div key={i}style={{display:"flex",justifyContent:"space-b
      <div>
        <div style={{fontWeight:600,fontSize:13,color:"var(--b)"}}>{f.prenom} - {f.v
        <div style={{fontSize:11,color:"var(--l)"}}>{f.date}</div>
      </div>
      <span className="badge"style={{background:f.statut==="actif"?"var(--Sp)":"var(
    </div>)}
    ois gr
padding
8}}>Inv
om:16}}
is grat
x",marg
",lette
:"#E8B0
55,.08)
",textO
2)",col
a(255,2
:"rgba(
nt ça m
lle pa
borderB
splay:"
/span>
").leng
etween"
ille}</
--Gp)",
a
s

     </div>
  </div>;
}
//
function AdminFinances({enfants,role,pEId,user,pointagesDB}){
  const [section,setSection]=useState(role==="asmat"?"facturation":"contrats");
  const sousOnglets=role==="asmat"
?[
{id:"facturation",l:"Facturation&Pajemploi",ic:" "}, {id:"bulletin",l:"Bulletindesalaire",ic:" "}, {id:"contrats",l:"Contrats&Avenants",ic:" "}, {id:"contrats_types",l:"Modeles&Templates",ic:" "}, {id:"courriers",l:"Courrierstypes",ic:" "}, {id:"solde_contrat",l:"Soldedetoutcompte",ic:" "},
]
:[{id:"signature_parent",l:"Moncontrat&Signature",ic:" "}]; return <div className="fi">
    <div style={{display:"flex",gap:4,marginBottom:16,borderBottom:"2px solid var(--br
      {sousOnglets.map(s=><button key={s.id}onClick={()=>setSection(s.id)}style={{
        padding:"8px 16px",border:"none",background:"none",cursor:"pointer",
        fontFamily:"'DM Sans',sans-serif",fontWeight:600,fontSize:13,flexShrink:0,whit
        color:section===s.id?"var(--T)":"var(--b)",
        borderBottom:section===s.id?"2.5px solid var(--T)":"2.5px solid transparent",
        marginBottom:-2,transition:"all .15s",display:"flex",alignItems:"center",gap:6
      }}><span>{s.ic}</span><span>{s.l}</span></button>)}
    </div>
    {section==="facturation"&&<Facturation enfants={enfants}role={role}pEId={pEId}user
    {section==="bulletin"&&<BulletinSalaire enfants={enfants}role={role}pEId={pEId}use
    {section==="contrats"&&<div>
      <Contrats enfants={enfants}role={role}pEId={pEId}/>
      <div style={{marginTop:24,borderTop:"2px solid var(--br)",paddingTop:20}}>
        <DemandesAvenants enfants={enfants}role={role}pEId={pEId}/>
      </div>
    </div>}
    {section==="contrats_types"&&<ContratsTypes enfants={enfants}role={role}/>}
    {section==="courriers"&&<CourriersTypes enfants={enfants}role={role}pEId={pEId}use
    {section==="signature_parent"&&<SignatureContratParent enfants={enfants}pEId={pEId
    {section==="solde_contrat"&&<SoldeDeCompte enfants={enfants}role={role}pEId={pEId}
</div>; }
//
function Journal({enfants,role,pEId,user}){
  const [selId,setSelId]=useState(enfants[0]?.id);
  const [sousOnglet,setSousOnglet]=useState("journal");
  const liste=role==="parent"?enfants.filter(e=>e.id===pEId):enfants;
       )",over
eSpace:
={user}
r={user
r={user
}/>}
/>}

   const enfant=liste.find(e=>e.id===selId)||liste[0];
  const sousOnglets=role==="asmat"
?[{id:"journal",l:"Journal",ic:" "},{id:"bilan",l:"Bilandujour",ic:" "},{id:"c
:[{id:"journal",l:"Journal",ic:" "}]; return <div className="fi">
    {role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"
      {liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>{setSelId(e.i
    </div>}
    <div style={{display:"flex",gap:4,marginBottom:16,borderBottom:"2px solid var(--br
      {sousOnglets.map(s=><button key={s.id}onClick={()=>setSousOnglet(s.id)}style={{
        padding:"8px 16px",border:"none",background:"none",cursor:"pointer",
        fontFamily:"'DM Sans',sans-serif",fontWeight:600,fontSize:13,
        color:sousOnglet===s.id?"var(--T)":"var(--b)",
        borderBottom:sousOnglet===s.id?"2px solid var(--T)":"2px solid transparent",
        marginBottom:-2,transition:"all .15s",display:"flex",alignItems:"center",gap:6
      }}><span>{s.ic}</span><span>{s.l}</span></button>)}
    </div>
    {sousOnglet==="journal"&&<TransmissionsContent enfant={enfant}role={role}user={use
    {sousOnglet==="bilan"&&<RecitIA enfants={liste}role={role}pEId={pEId}/>}
    {sousOnglet==="cr"&&<CompteRenduTrimestriel enfants={liste}role={role}pEId={pEId}/
</div>; }
function TransmissionsContent({enfant,role,user}){ const [msg,setMsg]=useState(""); const[mood,setMood]=useState(" ");
const [txs,setTxs]=useState(D.transmissions); const [photos,setPhotos]=useState({});
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
        const{data:files,error}=await supabase.storage.from('photos').list(path,{limit
        if(!error&&files?.length>0){
          const urls=files.filter(f=>f.name!=='.emptyFolderPlaceholder').map(f=>{
            const{data}=supabase.storage.from('photos').getPublicUrl(`${path}/${f.name
            return data.publicUrl;
          });
          setPhotos(p=>({...p,[enfant.id]:urls}));
    r",l:"
}}> d);setS
)"}}>
r}/>} >}
:50});
}`);
C

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
  const{error}=await supabase.storage.from('photos').upload(path,file,{upsert:false}
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
  {id:"br2",type:"cr",trim:"T1 "+new Date().getFullYear(),txt:CRS[enfant?.id]?.[0]||
].filter(b=>b.txt):[];
const [docOuvert,setDocOuvert]=useState(null);
const msgs=txs.filter(t=>t.eId===enfant?.id).sort((a,b)=>a.id>b.id?1:-1);
const enfantPhotos=photos[enfant?.id]||[];
const send=()=>{if(!msg.trim())return;
  setTxs(p=>[...p,{id:"tn"+Date.now(),eId:enfant.id,auteur:role,date:TODAY_STR,h:TOD
  setMsg("");};
return <div>
  {/* Photos - galerie cliquable */}
);
""},
AY_H,tx

 {(enfantPhotos.length>0||role==="asmat")&&<div className="card"style={{padding:16, <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",m <div style={{fontWeight:700,fontSize:14,color:"var(--b)"}}> Photos du jour</
    {role==="asmat"&&<>
      <input ref={fileRef}type="file"accept="image/*"style={{display:"none"}}onCha
      <button className="btn bG"style={{fontSize:12,padding:"5px 12px"}}onClick={(
        + Ajouter une photo
      </button>
</>} </div>
  {enfantPhotos.length===0
    ?<div style={{textAlign:"center",padding:"20px 0",color:"var(--l)",fontSize:13
    :<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(90px
      {enfantPhotos.map((src,i)=><div key={i}onClick={()=>setPhotoGrande(src)}styl
        aspectRatio:"1",borderRadius:10,overflow:"hidden",cursor:"pointer",
        background:"var(--c)",transition:"transform .18s,box-shadow .18s"
      }}
        onMouseEnter={e=>{e.currentTarget.style.transform="scale(1.04)";e.currentT
        onMouseLeave={e=>{e.currentTarget.style.transform="scale(1)";e.currentTarg
        <img src={src}alt=""style={{width:"100%",height:"100%",objectFit:"cover"}}
      </div>)}
    </div>}
</div>}
{/* Modale photo grande */}
{photoGrande&&<div onClick={()=>setPhotoGrande(null)}style={{
  position:"fixed",inset:0,background:"rgba(0,0,0,.85)",display:"flex",
  alignItems:"center",justifyContent:"center",zIndex:300,cursor:"zoom-out",padding
}}>
  <img src={photoGrande}alt=""style={{maxWidth:"100%",maxHeight:"90vh",borderRadiu
  <button onClick={()=>setPhotoGrande(null)}style={{
    position:"absolute",top:16,right:16,background:"rgba(255,255,255,.15)",
    border:"none",color:"#fff",borderRadius:"50%",width:36,height:36,
    cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent
}}>✕</button> </div>}
{/* Documents reçus - parent seulement */}
{role==="parent"&&bilansRecus.length>0&&<div className="card"style={{padding:16,ma
  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
    <div style={{width:28,height:28,borderRadius:"50%",background:"var(--Pp)",disp
    <div style={{fontWeight:700,fontSize:13,color:"var(--P)"}}>Documents reçus de
  </div>
  {bilansRecus.map(b=><div key={b.id}style={{marginBottom:8}}>
    <div onClick={()=>setDocOuvert(docOuvert===b.id?null:b.id)}
      style={{display:"flex",justifyContent:"space-between",alignItems:"center",pa
      <div style={{fontWeight:700,fontSize:13,color:"var(--P)"}}>
 marginB
arginBo
div>
nge={aj
)=>file
}}>Aucu
,1fr))"
e={{
arget.s
et.styl
/>
:20 s:12,bo
:"cente
rginBot
lay:"fl
votre a
dding:"

   {b.type==="bilan"?" Bilan du "+b.date:" CR - "+b.trim} </div>
      <span style={{color:"var(--P)"}}>{docOuvert===b.id?"▲":"▼"}</span>
    </div>
    {docOuvert===b.id&&<div style={{padding:16,background:"var(--w)",borderRadius:
      {b.txt}
    </div>}
  </div>)}
</div>}
{/* Messages */}
<div className="g2">
  <div className="card"style={{padding:16}}>
    <div style={{fontWeight:700,fontSize:14,marginBottom:12,color:"var(--b)"}}>{en
    <div style={{display:"flex",flexDirection:"column",gap:10,maxHeight:400,overfl
      {msgs.length===0&&<div style={{fontSize:13,color:"var(--l)",textAlign:"cente
      {msgs.map(t=><div key={t.id}style={{display:"flex",gap:10}}>
        <div style={{textAlign:"center",minWidth:38,flexShrink:0}}><div style={{fo
        <div style={{flex:1,background:t.auteur==="asmat"?"var(--Tp)":"var(--Bp)",
          <div style={{fontSize:11,fontWeight:700,color:t.auteur==="asmat"?"var(--
{t.auteur==="asmat"?" "+(user?.prenom||"Marie"):" "+(D.parents.f <div style={{fontSize:13,color:"var(--b)",lineHeight:1.6}}>{t.txt}</div>
        </div>
      </div>)}
    </div>
  </div>
  <div style={{display:"flex",flexDirection:"column",gap:12}}>
    <div className="card"style={{padding:16}}>
      <div style={{fontWeight:700,fontSize:14,marginBottom:12,color:"var(--b)"}}>
      <div style={{marginBottom:10}}>
        <label className="lbl">Humeur</label>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
{[" "," "," "," "," "," "," "," "].map(h=><button key={h}classN </div>
      </div>
      <textarea className="ta"style={{marginBottom:10}}value={msg}onChange={e=>set
placeholder={role==="asmat"?("Racontez la journée de "+(enfant?.prenom||"" <button className="btn bT"style={{width:"100%"}}onClick={send}>Envoyer </b
    </div>
    {D.moodHistory[enfant?.id]&&<div className="card"style={{padding:14}}>
      <div style={{fontWeight:700,fontSize:13,marginBottom:10,color:"var(--b)"}}>
      <div className="mood-bar">
        {D.moodHistory[enfant.id].map((v,i)=><div key={i}className="mood-b"style={
      </div>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color
        <span>J-14</span><span>Aujourd'hui</span>
</div>
           "0 0 10
fant?.e
owY:"au
r",padd
ntSize:
borderR
T)":"va
 ind(p=
Nouv
ame={"
Msg(e.t
)+"..."
utton>
  Hume
{height
:"var(-
   >
e
u

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
    {role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"
      {liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>setSelId(e.id
    </div>}
    <div style={{display:"flex",gap:4,marginBottom:16,borderBottom:"2px solid var(--br
{[{id:"portfolio",l:"Portfolio",ic:" "},{id:"developpement",l:"Développement",i <button key={s.id}onClick={()=>setSection(s.id)}style={{
          padding:"8px 16px",border:"none",background:"none",cursor:"pointer",
          fontFamily:"'DM Sans',sans-serif",fontWeight:600,fontSize:13,
          color:section===s.id?"var(--S)":"var(--l)",
          borderBottom:section===s.id?"2px solid var(--S)":"2px solid transparent",
          marginBottom:-2,transition:"all .15s",display:"flex",alignItems:"center",gap
        }}><span>{s.ic}</span><span>{s.l}</span></button>
      )}
    </div>
    {section==="portfolio"&&<Portfolio enfants={liste}role={role}pEId={selId}/>}
    {section==="developpement"&&<Developpement enfants={liste}role={role}pEId={selId}/
</div>; }
//
const SOMMEIL_DEMO={
  "e1":[
    {id:"s1",date:TODAY_STR,debut:"13h05",fin:"14h45",duree:"1h40",qualite:"bien"},
    {id:"s2",date:new Date(Date.now()-86400000).toISOString().slice(0,10),debut:"12h55
    {id:"s3",date:new Date(Date.now()-172800000).toISOString().slice(0,10),debut:"13h2
], "e2":[
    {id:"s4",date:TODAY_STR,debut:"13h10",fin:"13h55",duree:"0h45",qualite:"agite"},
    {id:"s5",date:new Date(Date.now()-86400000).toISOString().slice(0,10),debut:"13h00
  ],
  "e3":[
    {id:"s6",date:TODAY_STR,debut:"11h30",fin:"13h30",duree:"2h00",qualite:"bien"},
    {id:"s7",date:new Date(Date.now()-86400000).toISOString().slice(0,10),debut:"11h45
    {id:"s8",date:new Date(Date.now()-172800000).toISOString().slice(0,10),debut:"12h0
],
 }}> )}/>)}
)"}}> c:" "
:6
>}
",fin:"
0",fin:
",fin:"
",fin:"
0",fin:
 }

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
const[h1,m1]=nS.debut.split(":").map(Number); const[h2,m2]=nS.fin.split(":").map(Number);
const d=(h2*60+m2)-(h1*60+m1);
const duree=Math.floor(d/60)+"h"+String(d%60).padStart(2,"0"); setSommeils(p=>({...p,[enfant.id]:[{id:"sn"+Date.now(),date:TODAY_STR,debut:nS.deb setNS({debut:"",fin:"",qualite:"bien"});setToast("Sieste enregistrée ✓");
};
const qColor={bien:"var(--S)",agite:"var(--G)",court:"var(--R)"};
const qLabel={bien:" Bonne sieste",agite:" Agitée",court:" Courte"};
return <div className="fi">
{toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
<PageHeadericon=" "title="Suividusommeil"sub="Siestesetqualitédurepos"/> {role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"
      {liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>setSelId(e.id
    <div className="g2">
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div className="card"style={{padding:16}}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:14,color:"var(--b)"}}>
          {auj?<div style={{background:"var(--Sp)",borderRadius:12,padding:14,border:"
            <div style={{display:"flex",justifyContent:"space-around",marginBottom:10}
              {[["Début",auj.debut,"var(--S)"],["Fin",auj.fin,"var(--T)"],["Durée",auj
                <div key={l}style={{textAlign:"center"}}>
                  <div style={{fontSize:11,color:"var(--l)"}}>{l}</div>
                  <div className="pf"style={{fontSize:20,fontWeight:700,color:c}}>{v}<
                </div>)}
            </div>
            <div style={{textAlign:"center"}}>
              <span className="badge"style={{background:qColor[auj.qualite]+"22",color
            </div>
          </div>:<div style={{color:"var(--l)",fontSize:13,textAlign:"center",padding:
    </div>
ut.repl
}}> )}/>)}<
Sies 1px sol
}> .duree,
/div>
:qColor
"20px 0
 t

 {role==="asmat"&&<div className="card"style={{padding:16}}>
  <div style={{fontWeight:700,fontSize:14,marginBottom:12,color:"var(--b)"}}>+
  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom
    <div><label className="lbl">Début</label><input type="time"className="inp"
    <div><label className="lbl">Fin</label><input type="time"className="inp"va
  </div>
  <div style={{marginBottom:10}}>
    <label className="lbl">Qualité</label>
    <select className="sel"value={nS.qualite}onChange={e=>setNS(p=>({...p,qual
     <option value="bien">
    <option value="agite">
    <option value="court">
  </select>
</div>
Bonne sieste</option>
 Agitée</option>
 Trop courte</option>
            <button className="btn bS"style={{width:"100%"}}onClick={ajout}>Enregistrer<
        </div>}
      </div>
      <div className="card"style={{padding:16}}>
        <div style={{fontWeight:700,fontSize:14,marginBottom:12,color:"var(--b)"}}>
        {hist.length===0&&<div style={{fontSize:13,color:"var(--l)"}}>Aucune donnée</d
        {hist.map(s=><div key={s.id}style={{display:"flex",justifyContent:"space-betwe
          <div>
            <div style={{fontSize:12,fontWeight:600,color:"var(--b)"}}>{new Date(s.dat
            <div style={{fontSize:11,color:"var(--l)"}}>{s.debut} → {s.fin}</div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <div className="pf"style={{fontSize:16,fontWeight:700,color:"var(--T)"}}>{
            <span className="badge"style={{background:qColor[s.qualite]+"22",color:qCo
          </div>
        </div>)}
        {/* Sparkline durées */}
        {hist.length>1&&<div style={{marginTop:14}}>
          <div style={{fontSize:11,color:"var(--l)",marginBottom:6}}>Durées sur 7 jour
          <div style={{display:"flex",gap:4,alignItems:"flex-end",height:40}}>
            {hist.slice(0,7).reverse().map((s,i)=>{
              const[h,m]=s.duree.split("h").map(Number);const mins=h*60+(m||0);
              const pct=Math.min(mins/180*100,100);
              return <div key={i}style={{flex:1,borderRadius:"3px 3px 0 0",height:pct+
})} </div>
        </div>}
      </div>
    </div>
  </div>;
} //
 Enregi
:8}}>
value={
lue={nS
ite:e.t
/button
Histor
iv>}
en",ali
e).toLo
s.duree
lor[s.q
s</div>
"%",bac
 i

 function TableauDeBord({enfants,role,pEId,setPage}){
  const liste=role==="parent"?enfants.filter(e=>e.id===pEId):enfants;
  const [selId,setSelId]=useState(liste[0]?.id);
  const [periode,setPeriode]=useState("7j");
  const enfant=liste.find(e=>e.id===selId)||liste[0];
  const ptAuj=D.pointages.filter(p=>p.date===TODAY_STR);
  const presents=ptAuj.filter(p=>!p.dep).length;
  const isDemoTDB=enfants.every(e=>["e1","e2","e3"].includes(e.id));
  const msgsNonLus=isDemoTDB?D.messages.filter(m=>!m.lu).length:0;
  const totalH=isDemoTDB?enfants.reduce((a,e)=>{const h=D.heures[e.id];return a+(h?h.r
  // Humeurs historique
  const hist=D.moodHistory[enfant?.id]||[];
  const jours=periode==="7j"?7:15;
  const histSlice=hist.slice(-jours);
  const avg=histSlice.length?Math.round(histSlice.reduce((a,v)=>a+v,0)/histSlice.lengt
  const avgColor=avg>=4?"var(--S)":avg>=3?"var(--G)":"var(--R)";
  const svgW=320,svgH=80;
  const moodPts=histSlice.map((v,i)=>({
    x:10+i*(svgW-20)/(Math.max(histSlice.length-1,1)),
    y:svgH-10-(v/5)*(svgH-20)
  }));
  const pathD=moodPts.length>1?moodPts.map((p,i)=>i===0?"M"+p.x+","+p.y:"L"+p.x+","+p.
  const areaD=moodPts.length>1?pathD+" L"+moodPts[moodPts.length-1].x+","+svgH+" L"+mo
  // Heures semaine
  const heuresData=[
    {j:"Lu",h:8.5},{j:"Ma",h:9},{j:"Me",h:7.5},{j:"Je",h:9.5},{j:"Ve",h:8},
    {j:"Sa",h:0},{j:"Di",h:0}
  ];
  const maxH=Math.max(...heuresData.map(d=>d.h),1);
  // Sommeil
  const somData=[{j:"Lu",d:1.5},{j:"Ma",d:1.75},{j:"Me",d:0.75},{j:"Je",d:2},{j:"Ve",d
  const maxS=Math.max(...somData.map(d=>d.d),1);
  return <div className="fi">
    <div style={{marginBottom:16,display:"flex",justifyContent:"space-between",alignIt
      <div>
        <div style={{fontSize:11,color:"var(--l)",marginBottom:3,fontFamily:"'DM Mono'
        <div className="pf"style={{fontSize:22,fontWeight:600,color:"var(--b)"}}>Table
      </div>
      <div style={{display:"flex",gap:4}}>
        {["7j","15j"].map(p=><button key={p}onClick={()=>setPeriode(p)}style={{
          padding:"5px 12px",borderRadius:8,border:"1.5px solid",cursor:"pointer",font
          background:periode===p?"var(--b)":"var(--w)",color:periode===p?"#fff":"var(-
eal:0);
h*10)/1
y).join
odPts[0
:1.67}]
ems:"fl
,monosp
au de b
Size:12
-m)",

       borderColor:periode===p?"var(--b)":"var(--br)"
    }}>{p}</button>)}
  </div>
</div>
{/* Sélecteur enfant */}
{role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"
  {liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>setSelId(e.id
</div>}
{/* KPIs cliquables */}
{role==="asmat"&&<div className="g4"style={{marginBottom:16}}>
{[
{ic:" ",v:presents+"/"+enfants.length,l:"Présentsaujourd'hui",c:"var(--T)",p {ic:" ",v:msgsNonLus,l:"Messagesnonlus",c:"var(--B)",p:"messagerie"},
{ic:" ",v:totalH+"h",l:"Heurescemois",c:"var(--S)",p:"admin_finances"}, {ic:" ",v:avg+"/5",l:"Humeurmoyenne",c:avgColor,p:"journal_complet"},
  ].map(k=><div key={k.l}className="card card-lift"onClick={()=>setPage&&setPage(k
    <div style={{fontSize:22,marginBottom:4}}>{k.ic}</div>
    <div className="pf"style={{fontSize:22,fontWeight:600,color:k.c}}>{k.v}</div>
    <div style={{fontSize:11,color:"var(--l)",marginTop:3,lineHeight:1.3}}>{k.l}</
  </div>)}
</div>}
<div className="g2">
  {/* Courbe humeurs SVG */}
  <div className="card"style={{padding:16}}>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center" <div style={{fontWeight:700,fontSize:13,color:"var(--b)"}}> Humeurs - {enf <span className="pf"style={{fontSize:18,fontWeight:700,color:avgColor}}>{avg
    </div>
    <svg width="100%"viewBox={"0 0 "+svgW+" "+svgH}style={{overflow:"visible"}}>
      {/* Grid lines */}
      {[1,2,3,4,5].map(v=><line key={v}
        x1={10} y1={svgH-10-(v/5)*(svgH-20)}
        x2={svgW-10} y2={svgH-10-(v/5)*(svgH-20)}
        stroke="var(--br)" strokeWidth={.8} strokeDasharray="4,4"/>)}
      {/* Area */}
      {areaD&&<path d={areaD}fill={avg>=4?"rgba(61,107,80,.12)":avg>=3?"rgba(184,1
      {/* Line */}
      {pathD&&<path d={pathD}fill="none"stroke={avg>=4?"var(--S)":avg>=3?"var(--G)
      {/* Points */}
      {moodPts.map((p,i)=><circle key={i}cx={p.x}cy={p.y}r={3.5}fill={avg>=4?"var(
    </svg>
    <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"
      <span>J-{jours-1}</span><span>Aujourd'hui</span>
    </div>
     }}> )}/>)}
:"poin
.p)}sty
div>
,margin
ant?.p
}/5</sp
37,42,.
":"var(
--S)":a
var(--l
t
r

 </div>
{/* Heures semaine - barres */}
<div className="card"style={{padding:16}}>
  <div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:14}}>
  <div style={{display:"flex",gap:4,alignItems:"flex-end",height:72}}>
    {heuresData.map((d,i)=><div key={i}style={{flex:1,display:"flex",flexDirecti
      <div style={{fontSize:9,color:"var(--l)",fontFamily:"'DM Mono',monospace"}
      <div style={{
        width:"100%",borderRadius:"4px 4px 0 0",
        height:((d.h/maxH)*60)+"px",
        background:d.h>0?"linear-gradient(to top,var(--T),var(--Tl))":"var(--br)
        transition:"height .6s ease",minHeight:d.h>0?4:0
      }}/>
    </div>)}
  </div>
  <div style={{display:"flex",gap:4,marginTop:6}}>
    {heuresData.map((d,i)=><div key={i}style={{flex:1,textAlign:"center",fontSiz
  </div>
  <div style={{marginTop:10,padding:"6px 10px",background:"var(--Sp)",borderRadi
    Total semaine : {heuresData.reduce((a,d)=>a+d.h,0)}h
  </div>
</div>
{/* Sommeil - barres horizontales */}
<div className="card"style={{padding:16}}>
  <div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:14}}>
  {somData.map((d,i)=><div key={i}style={{marginBottom:8}}>
    <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
      <span style={{fontSize:11,color:"var(--m)",fontFamily:"'DM Mono',monospace
      <span style={{fontSize:11,color:"var(--B)",fontWeight:600}}>{Math.floor(d.
    </div>
    <div style={{height:8,background:"var(--Bp)",borderRadius:4,overflow:"hidden
      <div style={{height:"100%",width:((d.d/maxS)*100)+"%",background:"linear-g
    </div>
  </div>)}
</div>
{/* Appétit + Activités */}
<div className="card"style={{padding:16}}>
  <div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:14}}>
  <div style={{fontWeight:600,fontSize:11,color:"var(--m)",marginBottom:8,textTr
  {D.repas.filter(r=>r.date===TODAY_STR).map(r=>{
    const e=liste.find(x=>x.id===r.eId);
    const c={"bien":"var(--S)","peu":"var(--G)","refus":"var(--R)"};
    if(!e)return null;
    return <div key={r.id}style={{display:"flex",justifyContent:"space-between",
Heures
on:"col
}>{d.h|
",
e:9,col
us:8,fo
Durée
"}}>{d.
d)}h{Ma
"}}> radient
Appéti
ansform
padding
   s
t

             <div style={{display:"flex",gap:6,alignItems:"center"}}>
              <span>{e.emoji}</span>
              <span style={{fontSize:13,color:"var(--b)"}}>{e.prenom}</span>
            </div>
            <span className="badge"style={{background:(c[r.q]||"var(--l)")+"22",color:
{r.q==="bien"?" Bon appétit":r.q==="peu"?" Peu mangé":" Refus"} </span>
</div>; })}
        {D.repas.filter(r=>r.date===TODAY_STR).length===0&&<div style={{fontSize:12,co
        <div style={{fontWeight:600,fontSize:11,color:"var(--m)",margin:"12px 0 8px",t
        {D.portfolio.slice(0,3).map(p=><div key={p.id}style={{display:"flex",gap:8,pad
          <span style={{fontSize:16}}>{p.emoji}</span>
          <div style={{flex:1}}>
            <div style={{fontSize:12,fontWeight:600,color:"var(--b)"}}>{p.titre}</div>
            <div style={{fontSize:11,color:"var(--l)"}}>{p.competences?.join(" · ")}</
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
], "e2":[
    {date:"2021-11-22",age_mois:0,poids:3.5,taille:50},
    {date:"2022-02-22",age_mois:3,poids:6.0,taille:61},
    {date:"2022-05-22",age_mois:6,poids:7.8,taille:68},
    {date:"2022-08-22",age_mois:9,poids:9.2,taille:73},
    {date:"2022-11-22",age_mois:12,poids:10.4,taille:77},
    {date:"2023-05-22",age_mois:18,poids:11.8,taille:83},
    {date:"2023-11-22",age_mois:24,poids:13.1,taille:88},
], "e3":[
    {date:"2023-01-08",age_mois:0,poids:3.2,taille:49},
    {date:"2023-04-08",age_mois:3,poids:5.5,taille:59},
    {date:"2023-07-08",age_mois:6,poids:7.2,taille:66},
   c[r.q]|
lor:"va
extTran
ding:"5
div>

     {date:"2023-10-08",age_mois:9,poids:8.5,taille:71},
    {date:"2024-01-08",age_mois:12,poids:9.8,taille:75},
  ],
};
// Percentiles OMS simplifié (médiane p50 garçon)
const OMS_POIDS=[3.3,5.1,6.4,7.4,8.2,8.9,9.5,10.0,10.4,10.9,11.3,11.7,12.1];// 0-12 mo
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
const mois=(mDate.getFullYear()-n.getFullYear())*12+(mDate.getMonth()-n.getMonth() setData(p=>({...p,[enfant.id]:[...p[enfant.id]||[],{date:d,age_mois:mois,poids:par setNewM({date:"",poids:"",taille:""});setToast("Mesure ajoutée ✓");
};
  const last=mesures[mesures.length-1];
  const maxVal=vue==="poids"?Math.max(...mesures.map(m=>m.poids||0),15):Math.max(...me
  const W=280,H=150,padL=32,padB=24,padR=12,padT=12;
  const plotW=W-padL-padR,plotH=H-padB-padT;
  const xScale=(v)=>padL+v/Math.max(maxAge,24)*plotW;
  const yScale=(v)=>padT+plotH-(v/maxVal*plotH);
  const pts=mesures.filter(m=>vue==="poids"?m.poids:m.taille).map(m=>({x:xScale(m.age_
return <div className="fi">
{toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
<PageHeadericon=" "title="Courbedecroissance"sub="Poidsettaillejusqu'à3 {role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"
      {liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>setSelId(e.id
    {enfant&&<div className="g2">
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
 {/* Dernière mesure */}
is
); seFloat
sures.m
mois),y
ans ·
}}>
)}/>)}<
R

   {last&&<div className="card"style={{padding:16}}>
    <div style={{fontWeight:700,fontSize:14,marginBottom:12,color:"var(--b)"}}>
    <div style={{display:"flex",gap:16,justifyContent:"center"}}>
{[[" Poids",last.poids+"kg","var(--T)"],[" Taille",last.taille+"cm","v <div key={l}style={{textAlign:"center"}}>
          <div style={{fontSize:11,color:"var(--l)",marginBottom:2}}>{l}</div>
          <div className="pf"style={{fontSize:22,fontWeight:700,color:c}}>{v}</d
        </div>)}
    </div>
  </div>}
  {/* Courbe SVG */}
  <div className="card"style={{padding:16}}>
<div style={{display:"flex",gap:6,marginBottom:10}}> {[["poids"," Poids"],["taille"," Taille"]].map(([k,l])=>
        <button key={k}onClick={()=>setVue(k)}className={"btn "+(vue===k?"bT":"b
    </div>
    {pts.length>0?<svg width="100%"viewBox={"0 0 "+W+" "+H}style={{overflow:"vis
      {/* Grille */}
      {[0,25,50,75,100].map(p=>{
        const y=padT+plotH*(1-p/100);
        return <g key={p}><line x1={padL}y1={y}x2={W-padR}y2={y}stroke="var(--br
          <text x={padL-4}y={y+3}fontSize="7"fill="var(--l)"textAnchor="end">{Ma
      })}
      {/* Axe X */}
      {[0,6,12,18,24,36].filter(v=>v<=Math.max(maxAge+3,24)).map(v=>
        <text key={v}x={xScale(v)}y={H-4}fontSize="7"fill="var(--l)"textAnchor="
      {/* Zone OMS */}
      {vue==="poids"&&<polyline points={OMS_POIDS.slice(0,Math.min(13,mesures.le
        fill="none"stroke="var(--B)"strokeWidth="1"strokeDasharray="3,3"opacity=
      {/* Courbe */}
      {pts.length>1&&<polyline points={pts.map(p=>p.x+","+p.y).join(" ")}fill="n
      {/* Points */}
      {pts.map((p,i)=><circle key={i}cx={p.x}cy={p.y}r="4"fill="var(--T)"stroke=
    </svg>:<div style={{textAlign:"center",padding:"30px 0",color:"var(--l)",fon
    {vue==="poids"&&<div style={{fontSize:10,color:"var(--B)",marginTop:6}}>- -
  </div>
</div>
<div style={{display:"flex",flexDirection:"column",gap:12}}>
  {role==="asmat"&&<div className="card"style={{padding:16}}>
    <div style={{fontWeight:700,fontSize:13,marginBottom:10,color:"var(--b)"}}>+
    <div style={{marginBottom:8}}><label className="lbl">Date</label><input type
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom
      <div><label className="lbl">Poids (kg)</label><input className="inp"type="
      <div><label className="lbl">Taille (cm)</label><input className="inp"type=
    </div>
    Dern ar(--B
iv>
G")}sty
ible"}}
)"strok
th.roun
middle"
ngth+2)
".5"/>}
one"str
"#fff"s
tSize:1
- Média
 Nouvel
="date"
:8}}>
number"
"number
 i )

           <button className="btn bT"style={{width:"100%"}}onClick={ajouter}>Enregistre
        </div>}
        <div className="card"style={{padding:14}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:10,color:"var(--b)"}}>
          {mesures.slice().reverse().slice(0,6).map(m=><div key={m.date}style={{displa
            <span style={{color:"var(--l)"}}>{m.age_mois} mois</span>
            <div style={{display:"flex",gap:12}}>
              {m.poids&&<span style={{color:"var(--T)",fontWeight:600}}>{m.poids}kg</s
              {m.taille&&<span style={{color:"var(--B)",fontWeight:600}}>{m.taille}cm<
            </div>
          </div>)}
        </div>
      </div>
    </div>}
</div>; }
//
const ACTIVITES_PAR_AGE=[
  {age_min:0,age_max:6,cat:"Éveil",titre:"Hochets et mobiles",desc:"Stimulation visuel
  {age_min:3,age_max:12,cat:"Motricité",titre:"Tapis d'éveil",desc:"Découverte du corp
  {age_min:6,age_max:18,cat:"Langage",titre:"Comptines avec gestes",desc:"Apprendre la
  {age_min:12,age_max:24,cat:"Créatif",titre:"Peinture au doigt",desc:"Explorer les te
  {age_min:12,age_max:36,cat:"Langage",titre:"Lecture d'images",desc:"Montrer et nomme
  {age_min:18,age_max:36,cat:"Sciences",titre:"Jardinage en pot",desc:"Planter des gra
  {age_min:18,age_max:36,cat:"Motricité",titre:"Parcours moteur",desc:"Obstacles à enj
  {age_min:24,age_max:36,cat:"Social",titre:"Jeu symbolique",desc:"Jouer à faire sembl
  {age_min:24,age_max:36,cat:"Créatif",titre:"Collage libre",desc:"Découper et coller
  {age_min:0,age_max:36,cat:"Musique",titre:"Maracas maison",desc:"Riz ou pâtes dans u
];
const catColors={Éveil:"var(--P)",Motricité:"var(--S)",Langage:"var(--B)",Créatif:"var
function ActivitesSuggerees({enfants,role,pEId}){
  const [selId,setSelId]=useState(enfants[0]?.id);
  const [catFilt,setCatFilt]=useState("tous");
  const liste=role==="parent"?enfants.filter(e=>e.id===pEId):enfants;
  const enfant=liste.find(e=>e.id===selId)||liste[0];
  const _now=new Date();
  const moisAge=enfant?((_now.getFullYear()-new Date(enfant.naissance).getFullYear())*
  const activites=ACTIVITES_PAR_AGE.filter(a=>moisAge>=a.age_min&&moisAge<=a.age_max&&
  const cats=["tous",...new Set(ACTIVITES_PAR_AGE.map(a=>a.cat))];
return <div className="fi">
<PageHeadericon=" "title="Activitéssuggérées"sub={"Propositionspédagogiques {role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"
 {liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>setSelId(e.id
r</butt
Hist y:"flex
pan>}
/span>}
le et a
s, posi
 langue
xtures
r les o
ines, a
amber,
ant (dî
des for
ne bout
(--T)",
12+(_no
(catFil
adapté
}}>
)}/>)}<
 o
e

     <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>
      {cats.map(c=><button key={c}onClick={()=>setCatFilt(c)}style={{
        padding:"5px 12px",borderRadius:20,border:"1.5px solid",cursor:"pointer",fontS
        background:catFilt===c?(catColors[c]||"var(--b)"):"transparent",
        color:catFilt===c?"#fff":(catColors[c]||"var(--m)"),
        borderColor:catFilt===c?(catColors[c]||"var(--b)"):(catColors[c]+"44"||"var(--
}}>{c==="tous"?" Tout":c}</button>)} </div>
    <div style={{fontSize:12,color:"var(--l)",marginBottom:14,fontFamily:"'DM Mono',mo
      {activites.length} activité{activites.length>1?"s":""} pour {enfant?.prenom} ({a
</div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr
      {activites.map((a,i)=><div key={i}className="card"style={{padding:16,borderTop:"
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-st
          <span className="badge"style={{background:(catColors[a.cat]||"var(--T)")+"22
          <span style={{fontSize:11,color:"var(--l)",fontFamily:"'DM Mono',monospace"}
</div>
<div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:6}}>{a.t <div style={{fontSize:12,color:"var(--m)",lineHeight:1.6,marginBottom:8}}>{a.d <div style={{fontSize:11,color:"var(--l)",marginBottom:6}}> {a.materiel}</di <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
          {a.competences.map(c=><span key={c}className="badge"style={{background:"var(
        </div>
      </div>)}
      {activites.length===0&&<div style={{gridColumn:"1/-1",textAlign:"center",padding
<divstyle={{fontSize:36,marginBottom:8}}> </div>
        <div>Aucune activité pour ce filtre</div>
      </div>}
    </div>
  </div>;
} //
//
const PMI_MESSAGES=[
  {id:"pmi1",de:"PMI",h:"09h15",date:new Date(Date.now()-7*86400000).toISOString().sli
  {id:"pmi2",de:"asmat",h:"10h30",date:new Date(Date.now()-7*86400000).toISOString().s
  {id:"pmi3",de:"PMI",h:"14h20",date:new Date(Date.now()-2*86400000).toISOString().sli
];
const PMI_PAR_DEP={
  "75":  {nom:"PMI Paris 75",email:"pmi75-paris@sante.gouv.fr",tel:"01 42 76 40 40",ad
   ize:12,
br)"),
nospace
ge(enfa
))",gap 3px sol art",ma ",color }> {
itre}</
esc}</d
v> --c)",c
:"30px
ce(0,10
lice(0,
ce(0,10
resse:"
 a

   "92":  {nom:"PMI Hauts-de-Seine 92",email:"pmi@hauts-de-seine.fr",tel:"01 47 29 30 0
  "93":  {nom:"PMI Seine-Saint-Denis 93",email:"pmi@seine-saint-denis.fr",tel:"01 43 9
  "94":  {nom:"PMI Val-de-Marne 94",email:"pmi@valdemarne.fr",tel:"01 43 99 80 00",adr
  "91":  {nom:"PMI Essonne 91",email:"pmi@essonne.fr",tel:"01 69 25 62 62",adresse:"Bo
  "95":  {nom:"PMI Val-d'Oise 95",email:"pmi@valdoise.fr",tel:"01 34 25 30 00",adresse
  "77":  {nom:"PMI Seine-et-Marne 77",email:"pmi@seine-et-marne.fr",tel:"01 64 14 77 0
  "78":  {nom:"PMI Yvelines 78",email:"pmi@yvelines.fr",tel:"01 39 07 78 00",adresse:"
  "69":  {nom:"PMI Métropole de Lyon 69",email:"pmi@grandlyon.com",tel:"04 78 63 40 40
  "13":  {nom:"PMI Bouches-du-Rhône 13",email:"pmi@departement13.fr",tel:"04 13 31 13
  "31":  {nom:"PMI Haute-Garonne 31",email:"pmi@haute-garonne.fr",tel:"05 34 33 30 00"
  "33":  {nom:"PMI Gironde 33",email:"pmi@gironde.fr",tel:"05 56 99 33 33",adresse:"Hô
  "67":  {nom:"PMI Bas-Rhin 67",email:"pmi@bas-rhin.fr",tel:"03 88 76 67 67",adresse:"
  "59":  {nom:"PMI Nord 59",email:"pmi@lenord.fr",tel:"03 59 73 59 00",adresse:"51 rue
  "default":{nom:"PMI de votre département",email:"pmi@votre-departement.fr",tel:"Cont
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
const send=()=>{if(!txt.trim())return; setMsgs(p=>[...p,{id:"pm"+Date.now(),de:"asmat",h:TODAY_H,date:TODAY_STR,txt,lu:tr setTxt("");
setToast("Message envoyé par email à "+pmiEmail+" ✓");
};
return <div className="fi">
{toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
<PageHeadericon=" "title="CommunicationPMI"sub="ProtectionMaternelleetInfa
    {/* Explication du fonctionnement */}
    <div style={{background:"var(--Bp)",border:"1px solid var(--B)",borderRadius:12,pa
 0",adre
3 85 00
esse:"H
ulevard
:"2 av
0",adre
2 pl An
",adres
13",adr
,adress
tel du
Hôtel d
 Gustav
actez l
ue,emai
ntile
dding:"
-

  <strong> Fonctionnement :</strong> vos messages sont envoyés par email à la PM Leurs réponses arrivent automatiquement ici. Vous apparaissez comme expéditeur : <br/><strong> {pmiInfo.nom}</strong> - {pmiInfo.tel} - {pmiInfo.adresse} <br/><span style={{fontSize:11,color:"var(--l)"}}> Pour configurer votre PMI d
</div>
{nonLus>0&&<div style={{background:"#EBF4FF",border:"1.5px solid var(--B)",borderR <spanstyle={{fontSize:18}}> </span>
<span style={{fontSize:13,fontWeight:700,color:"var(--B)"}}>{nonLus} nouveau{non <button className="btn bG"style={{marginLeft:"auto",fontSize:11,padding:"4px 10p
    Tout marquer lu
  </button>
</div>}
<div className="g2">
  <div className="card"style={{padding:16}}>
    <div style={{fontWeight:700,fontSize:14,marginBottom:12,color:"var(--b)"}}>Mes
    <div style={{display:"flex",flexDirection:"column",gap:10,maxHeight:400,overfl
      {msgs.map(m=><div key={m.id}onClick={()=>!m.lu&&m.de==="PMI"&&markRead(m.id)
        style={{cursor:!m.lu&&m.de==="PMI"?"pointer":"default"}}>
        <div style={{flex:1,background:m.de==="PMI"?"var(--Bp)":"var(--Tp)",border
          borderLeft:(m.de==="PMI"?"3px solid var(--B)":"3px solid var(--T)"),
          opacity:m.lu?1:.95,boxShadow:!m.lu&&m.de==="PMI"?"0 0 0 2px var(--B)":"n
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:
<span style={{fontSize:11,fontWeight:700,color:m.de==="PMI"?"var(--B)" {m.de==="PMI"?" PMI":" "+(user?.prenom||"Marie")} {m.email&&<span style={{fontSize:10,color:"var(--l)",marginLeft:6}}>
            </span>
            <div style={{display:"flex",gap:6,alignItems:"center"}}>
              {!m.lu&&m.de==="PMI"&&<div style={{width:8,height:8,borderRadius:"50
              <span style={{fontSize:10,color:"var(--l)",fontFamily:"'DM Mono',mon
            </div>
</div>
          <div style={{fontSize:13,color:"var(--b)",lineHeight:1.5}}>{m.txt}</div>
        </div>
      </div>)}
    </div>
    <div style={{marginTop:12,display:"flex",flexDirection:"column",gap:8,paddingT
      <div style={{fontSize:11,color:"var(--l)"}}>Répondre à la PMI - sera envoyé
      <div style={{display:"flex",gap:8}}>
        <textarea className="ta"value={txt}onChange={e=>setTxt(e.target.value)}
          placeholder="Votre message à la PMI..."style={{flex:1,minHeight:60,resiz
        <button className="btn bT"onClick={send}style={{alignSelf:"flex-end"}}>
      </div>
    </div>
  </div>
      I ({pm {asmat
e sect
adius:1
Lus>1?"
x"}}onC
sages P
owY:"au
}
Radius:
one"}}>
4}}>
:"var(-
via {m.
%",back
ospace"
op:12,b
à {pmiE
e:"none
Envoye
 i
e
r

       <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div className="card"style={{padding:16}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:12,color:"var(--b)"}}>
          {[["N° agrément","AGR-2019-0042"],["Délivré le","15/09/2019"],["Renouvelleme
            <div key={l}style={{display:"flex",justifyContent:"space-between",padding:
              <span style={{color:"var(--l)"}}>{l}</span>
              <span style={{fontWeight:600,color:"var(--b)"}}>{v}</span>
            </div>)}
          <div style={{marginTop:10,padding:"8px 12px",background:"#FFF8E6",borderRadi
               Renouvellement à prévoir dans 2 mois - contacter la PMI
          </div>
        </div>
<div className="card"style={{padding:16}}>
<div style={{fontWeight:700,fontSize:13,marginBottom:10,color:"var(--b)"}}> {[["AgrémentPMI2024"," "],["AssuranceRCPro"," "],["FormationContinue"
            <div key={n}style={{display:"flex",justifyContent:"space-between",padding:
              <span style={{fontSize:13,color:"var(--b)"}}>{n}</span>
              <span>{s}</span>
            </div>)}
        </div>
        <div className="card"style={{padding:14,background:"var(--Bp)",border:"1px sol
          <div style={{fontWeight:700,fontSize:12,color:"var(--B)",marginBottom:6}}>
          <div style={{fontSize:12,color:"var(--b)",lineHeight:1.7}}>
            Email : {pmiEmail}<br/>
            Tél : 01 XX XX XX XX<br/>
            Horaires : Lun–Ven 9h–17h
          </div>
        </div>
      </div>
    </div>
</div>; }
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
    return()=>{window.removeEventListener("online",up);window.removeEventListener("off
  },[]);
  const sync=()=>{setSyncing(true);setTimeout(()=>setSyncing(false),2000);};
  if(online&&!syncing)return null;
     Mon
nt","Ju
"6px 0"
us:9,bo
Docu ," "] "7px 0"
id var( Conta
line",d
    a
m ]
c

   return <div style={{
    background:online?"var(--Sp)":"#FEF9C3",
    borderBottom:"1px solid "+(online?"var(--Sl)":"#FCD34D"),
    padding:"6px 16px",display:"flex",alignItems:"center",gap:8,fontSize:12,fontWeight
    color:online?"var(--S)":"#92400E",flexShrink:0
}}>
<spanstyle={{fontSize:14}}>{online?syncing?" ":" ":" "}</span> {online?syncing?"Synchronisation en cours...":"Données synchronisées"
      :"Hors ligne - les données sont sauvegardées localement"}
    {!online&&<button onClick={sync}style={{marginLeft:"auto",background:"none",border
      Réessayer
    </button>}
</div>; }
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
} };
  if(etape==="idle")return(
    <div style={{background:"var(--Rp)",border:"1px solid var(--R)",borderRadius:12,pa
<div style={{fontWeight:700,fontSize:14,color:"var(--R)",marginBottom:8}}> Zon <div style={{fontSize:13,color:"var(--m)",marginBottom:14,lineHeight:1.6}}>
        La suppression est <strong>définitive et irréversible</strong>. Toutes vos don
      </div>
      <button onClick={()=>setEtape("confirm1")}style={{background:"none",border:"1.5p
        Supprimer mon compte et toutes mes données
    :600,
:"1px s
dding:2 e de d
nées (e
x solid
a

     </button>
  </div>
);
if(etape==="confirm1")return(
  <div style={{background:"var(--Rp)",border:"2px solid var(--R)",borderRadius:12,pa
    <div style={{fontWeight:700,fontSize:15,color:"var(--R)",marginBottom:12}}>Êtes-
    <div style={{fontSize:13,color:"var(--m)",marginBottom:14,lineHeight:1.7}}>
      Seront supprimés : votre profil, toutes les fiches enfants, tous les contrats,
    </div>
    <div style={{display:"flex",gap:10}}>
      <button onClick={()=>setEtape("idle")}className="btn bG"style={{flex:1}}>Annul
      <button onClick={()=>setEtape("confirm2")}className="btn bR"style={{flex:1}}>O
    </div>
  </div>
);
if(etape==="confirm2")return(
  <div style={{background:"var(--Rp)",border:"2px solid var(--R)",borderRadius:12,pa
    <div style={{fontWeight:700,fontSize:14,color:"var(--R)",marginBottom:8}}>Confir
    <div style={{fontSize:13,color:"var(--m)",marginBottom:12}}>
      Tapez <strong style={{fontFamily:"'DM Mono',monospace",color:"var(--R)"}}>SUPP
    </div>
    <input className="inp"value={confirmation}onChange={e=>setConfirmation(e.target.
      placeholder="SUPPRIMER"style={{textAlign:"center",fontFamily:"'DM Mono',monosp
        borderColor:confirmation===MOT?"var(--R)":"var(--br)"}}/>
    <div style={{display:"flex",gap:10}}>
      <button onClick={()=>{setEtape("idle");setConfirmation("");}}className="btn bG
      <button onClick={handleSupprimer}disabled={confirmation!==MOT}
        className="btn bR"style={{flex:1,opacity:confirmation===MOT?1:.5}}>
        Supprimer définitivement
      </button>
    </div>
  </div>
);
if(etape==="deleting")return(
  <div style={{textAlign:"center",padding:24,background:"var(--Rp)",borderRadius:12,
<divstyle={{fontSize:32,marginBottom:8}}> </div>
    <div style={{fontSize:14,color:"var(--R)",fontWeight:600}}>Suppression en cours.
  </div>
);
if(etape==="done")return(
  <div style={{textAlign:"center",padding:24,background:"var(--Sp)",borderRadius:12,
<divstyle={{fontSize:32,marginBottom:8}}> </div>
<div style={{fontSize:14,color:"var(--S)",fontWeight:700}}>Compte supprimé. Au r
  dding:2
vous ab
pointa
er</but
ui, con
dding:2
mation
RIMER</
value.t
ace",ma
"style=
border:
..</div
border:
evoir !

 </div> );
  return(
    <div style={{padding:20,background:"var(--Rp)",borderRadius:12,border:"1px solid v
      <div style={{fontWeight:700,color:"var(--R)",marginBottom:8}}>Erreur</div>
      <div style={{fontSize:13,color:"var(--m)",marginBottom:12}}>{erreur}</div>
      <button onClick={()=>setEtape("idle")}className="btn bG">Réessayer</button>
</div> );
}
//
function Parametres({user,onLogout,setPage,isPro,isTrialing,lancerCheckout,ouvrirPorta
  const [toast,setToast]=useState("");
  return <div className="fi">
{toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
<PageHeadericon=" "title="Paramètres"sub="Votrecompteetvosdonnées"/>
<div style={{maxWidth:600,margin:"0 auto",display:"flex",flexDirection:"column",ga
      {/* Abonnement - uniquement pour les assmats */}
      {user?.role==="asmat"&&<div className="card"style={{padding:20,border:isPro?"2px
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center" <div style={{fontWeight:700,fontSize:14,color:"var(--b)"}}> Mon abonnement <span style={{
            background:isPro?"var(--Sp)":"var(--Tp)",
            color:isPro?"var(--S)":"var(--T)",
            borderRadius:20,padding:"3px 12px",fontSize:11,fontWeight:700
}}>{isTrialing?" Essai gratuit":isPro?" Pro actif":" Gratuit"}</span> </div>
        {isPro?<>
          {isTrialing&&<div style={{background:"var(--Gp)",border:"1px solid var(--G)"
               Vous bénéficiez de 2 mois d'essai gratuit. Aucun prélèvement avant la f
          </div>}
          <div style={{fontSize:13,color:"var(--m)",lineHeight:1.7,marginBottom:14}}>
            {isTrialing
              ? "Votre abonnement Pro démarrera automatiquement à la fin de votre péri
              : "Votre abonnement Pro est actif. Toutes les fonctionnalités sont déblo
          </div>
          <button className="btn bG"style={{width:"100%",justifyContent:"center"}}onCl
               Gérer mon abonnement (facturation, résiliation)
          </button>
          <div style={{fontSize:11,color:"var(--l)",marginTop:6,textAlign:"center"}}>
            Vous serez redirigée vers le portail Stripe sécurisé.
          </div>
       </>:<>
ar(--R)
il}){
p:16}}>
 solid
,margin
</div>
,border in de
ode d'e
quées."
ick={ou
l

     <div style={{marginBottom:14}}>
      {[
" Bilans de journée automatiques",
" Bulletins de salaire complets",
" Export Pajemploi en 1 clic",
" Contrats, avenants, courriers illimités",
" Enfants illimités",
" Support prioritaire",
].map(f=><div key={f}style={{display:"flex",gap:8,padding:"5px 0",fontSize
<span style={{color:"var(--S)"}}>✓</span>
        <span style={{color:"var(--b)"}}>{f}</span>
      </div>)}
    </div>
    <div style={{textAlign:"center",marginBottom:12}}>
      <div style={{fontSize:26,fontWeight:700,color:"var(--T)",fontFamily:"'DM S
      <div style={{fontSize:11,color:"var(--l)"}}>2 mois gratuits · Premier paie
    </div>
    <button className="btn bT"style={{width:"100%",justifyContent:"center",fontS
      onClick={lancerCheckout||undefined}>
         Passer à Pro - Commencer mon essai gratuit
    </button>
</>} </div>}
{/* Profil */}
<div className="card"style={{padding:20}}>
  <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:14}}>
  {[
    ["Prénom",user?.prenom||"-"],
    ["Nom",user?.nom||"-"],
    ["Email",user?.email||"-"],
    ["Rôle",user?.role==="asmat"?"Assistante maternelle":"Parent employeur"],
  ].map(([l,v])=><div key={l}style={{display:"flex",justifyContent:"space-betwee
    <span style={{color:"var(--l)"}}>{l}</span>
    <span style={{fontWeight:600,color:"var(--b)"}}>{v}</span>
  </div>)}
</div>
{/* Pages légales */}
<div className="card"style={{padding:20}}>
  <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:14}}>
  {[
[" ","Politiquedeconfidentialité","politique_confidentialite"],
[" ","Mentionslégales","mentions_legales"], ].map(([ic,l,p])=>
    <div key={p}onClick={()=>setPage(p)}style={{display:"flex",justifyContent:"s
      onMouseEnter={e=>e.currentTarget.style.background="var(--c)"}
         :13,bor
ans',sa
ment à
ize:14,
Mon pr
n",padd
Légal
pace-be
  o
&

             onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
            <span style={{fontSize:13,color:"var(--b)"}}>{ic} {l}</span>
            <span style={{color:"var(--l)",fontSize:12}}>→</span>
          </div>)}
        <div style={{marginTop:12,padding:"10px 12px",background:"var(--Sp)",borderRad
             Données hébergées en France · Jamais vendues · Supprimables à tout moment
        </div>
</div>
      {/* Déconnexion */}
      <div className="card"style={{padding:20}}>
        <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:14}}>
        <button className="btn bG"style={{width:"100%",justifyContent:"center"}}onClic
          Se déconnecter
        </button>
</div>
      <SupprimerCompte onDeleted={onLogout}/>
    </div>
</div>; }
//
function PolitiqueConfidentialite(){
  const sections=[
    {titre:"1. Responsable de traitement",contenu:"TiMat - contact : privacy@timat.app
    {titre:"2. Données collectées",contenu:""},
    {titre:"3. Durées de conservation",contenu:""},
    {titre:"4. Vos droits",contenu:""},
    {titre:"5. Cookies",contenu:"TiMat n'utilise aucun cookie publicitaire ni de track
    {titre:"6. Sécurité",contenu:"Chiffrement en transit (HTTPS/TLS 1.3), chiffrement
];
  const tableaux={
    "2. Données collectées":[
      ["Catégorie","Données","Base légale","Durée"],
      ["Assmats","Nom, email, téléphone, n° agrément","Exécution du contrat","Durée co
      ["Enfants","Prénom, date de naissance, allergies","Exécution du contrat + intérê
      ["Parents","Nom, email, téléphone, profession","Exécution du contrat","Durée com
      ["Financières","Salaires, indemnités, attestations fiscales","Obligation légale"
      ["Photos enfants","Images (journal partagé)","Consentement explicite parents","D
      ["Paiements","Plan, Stripe ID (aucune CB stockée)","Exécution du contrat","10 an
    ],
    "3. Durées de conservation":[
      ["Données","Durée","Justification"],
      ["Compte actif","Durée de l'abonnement","Nécessité du service"],
      ["Après suppression du compte","0 jour (effacement immédiat)","Droit à l'effacem
 ius:8,f
Sessio
k={onLo
\nHéber
ing. Se
au repo
mpte ac
t vital
pte act
,"10 an
urée co
s"],
ent RGP
 n

       ["Données financières / contrats","10 ans","Obligation légale comptable"],
      ["Logs de connexion","12 mois","Sécurité"],
      ["Consentements","5 ans","Preuve de conformité CNIL"],
    ],
    "4. Vos droits":[
      ["Droit","Comment l'exercer"],
      ["Accès à vos données","Administratif → Documents → Export dossier"],
      ["Rectification","Paramètres → Modifier mon profil"],
      ["Effacement (oubli)","Paramètres → Supprimer mon compte (immédiat et définitif)
      ["Portabilité","Export CSV/PDF depuis l'application"],
      ["Opposition","Contactez privacy@timat.app"],
      ["Réclamation CNIL","www.cnil.fr - 3 Place de Fontenoy, 75007 Paris"],
], };
return <div className="fi">
<PageHeadericon=" "title="Politiquedeconfidentialité"sub="Version1.0-Mars <div style={{maxWidth:800,margin:"0 auto"}}>
      {sections.map((s,i)=><div key={i}className="card"style={{padding:24,marginBottom
        <div style={{fontWeight:700,fontSize:16,color:"var(--b)",marginBottom:12}}>{s.
        {tableaux[s.titre]?<div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
            <thead>
              <tr>{tableaux[s.titre][0].map((h,j)=><th key={j}style={{
                textAlign:"left",padding:"8px 12px",background:"var(--c)",
                fontWeight:700,color:"var(--m)",fontSize:11,textTransform:"uppercase",
                borderBottom:"2px solid var(--br)"
              }}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {tableaux[s.titre].slice(1).map((row,j)=><tr key={j}style={{borderBottom
                {row.map((cell,k)=><td key={k}style={{padding:"9px 12px",fontSize:13,c
              </tr>)}
            </tbody>
          </table>
        </div>:<div style={{fontSize:13,color:"var(--m)",lineHeight:1.8,whiteSpace:"pr
      </div>)}
<div className="card"style={{padding:20,background:"var(--Bp)",border:"1px solid <div style={{fontWeight:700,fontSize:13,color:"var(--B)",marginBottom:6}}> C <div style={{fontSize:13,color:"var(--m)"}}>Pour exercer vos droits : <strong>
      </div>
    </div>
</div>; }
//
function MentionsLegales(){
 "],
2026
:16}}>
titre}<
letterS
:"1px s
olor:k=
e-line"
 var(--
ontact
privacy
 -

 const [edit,setEdit]=useState(false);
const [info,setInfo]=useState({
  representant:"[Votre prénom et nom]",
  siret:"[Numéro SIRET]",
  adresse:"[Adresse complète, Code postal, Ville]",
  telephone:"[Téléphone professionnel]",
});
const blocs=[
  {titre:"Éditeur du site",custom:true},
  {titre:"Hébergement",contenu:"Application web : Vercel Inc. (serveurs européens)\n
  {titre:"Propriété intellectuelle",contenu:"L'ensemble du contenu de TiMat (textes,
  {titre:"Limitation de responsabilité",contenu:"Les calculs de salaire, récapitulat
  {titre:"Données personnelles",contenu:"Responsable de traitement : TiMat - privacy
  {titre:"Droit applicable",contenu:"Les présentes mentions légales sont soumises au
];
return <div className="fi">
<PageHeadericon=" "title="Mentionslégales"sub="Conformémentàlaloin°2004-5 <div style={{maxWidth:700,margin:"0 auto"}}>
    {blocs.map((b,i)=><div key={i}className="card"style={{padding:22,marginBottom:14
      <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:10}}>{b.
      {b.custom?<div>
        {/* Bloc éditeur éditable */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"cente
          <div style={{fontSize:12,color:"var(--l)"}}>À compléter avec vos informati
          <button onClick={()=>setEdit(p=>!p)}className="btn bG"style={{fontSize:11,
{edit?"✓ Sauvegarder":" Modifier"} </button>
</div> {[
          ["Raison sociale","TiMat"],
          ["Représentée par","representant"],
          ["Email","contact@timat.app"],
          ["SIRET","siret"],
          ["Adresse","adresse"],
          ["Téléphone","telephone"],
        ].map(([label,key])=><div key={label}style={{display:"flex",gap:12,padding:"
          <span style={{fontSize:12,color:"var(--l)",minWidth:120,flexShrink:0}}>{la
          {edit&&info[key]!==undefined?
            <input className="inp"style={{flex:1,padding:"4px 8px",fontSize:12}}
              value={info[key]}onChange={e=>setInfo(p=>({...p,[key]:e.target.value})
          :<span style={{fontSize:13,color:"var(--b)",fontWeight:500}}>
            {info[key]||key}
          </span>}
        </div>)}
        {info.siret.includes("[")&&<div style={{marginTop:10,padding:"8px 12px",back
  Base de
 interf
ifs Paj
@timat.
droit
75 du
}}> titre}<
r",marg
ons lég
padding
6px 0",
bel}</s
)}/>
ground:
2

                 Ces informations doivent être complétées avant la mise en ligne de l'ap
          </div>}
</div>
        :<div style={{fontSize:13,color:"var(--m)",lineHeight:1.8,whiteSpace:"pre-line
      </div>)}
      <div style={{fontSize:12,color:"var(--l)",textAlign:"center",marginTop:8}}>
        Dernière mise à jour : mars 2026
      </div>
    </div>
</div>; }
//
function JournalAvecBilans({enfant,liste,role,pEId,user}){
  const [sousSec,setSousSec]=useState("messages");
  if(role!=="asmat") return <TransmissionsContent enfant={enfant}role={role}user={user
  return <div>
<div style={{display:"flex",gap:2,marginBottom:14,borderBottom:"1.5px solid var(-- {[{id:"messages",l:"Messages",ic:" "},{id:"bilan",l:"Bilandujour",ic:" "},{i
        <button key={s.id}onClick={()=>setSousSec(s.id)}style={{
          padding:"6px 12px",border:"none",background:"none",cursor:"pointer",
          fontFamily:"'DM Sans',sans-serif",fontWeight:600,fontSize:12,whiteSpace:"now
          color:sousSec===s.id?"var(--P)":"var(--l)",
          borderBottom:sousSec===s.id?"2px solid var(--P)":"2px solid transparent",
          marginBottom:-2,transition:"all .15s",display:"flex",alignItems:"center",gap
        }}><span>{s.ic}</span><span>{s.l}</span></button>
      )}
    </div>
    {sousSec==="messages"&&<TransmissionsContent enfant={enfant}role={role}user={user}
    {sousSec==="bilan"&&<RecitIA enfants={liste}role={role}pEId={enfant?.id}/>}
    {sousSec==="cr"&&<CompteRenduTrimestriel enfants={liste}role={role}pEId={enfant?.i
</div>; }
//
function JournalComplet({enfants,role,pEId,user}){
  const [selId,setSelId]=useState(enfants[0]?.id);
  const [sec,setSec]=useState("journal");
  const liste=role==="parent"?enfants.filter(e=>e.id===pEId):enfants;
  const enfant=liste.find(e=>e.id===selId)||liste[0];
  const secs=role==="asmat"
?[{id:"journal",l:"Journal&Bilans",ic:" "},{id:"repas",l:"Repas&Changes",ic:"
:[{id:"journal",l:"Journal",ic:" "},{id:"repas",l:"Repas",ic:" "},{id:"sommeil", return <div className="fi">
    {role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"
      {liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>{setSelId(e.i
</div>}
     plicat
"}}>{b.
}/>;
br)"}}>
d:"cr"
rap",
:4
/>} d}/>}
"},{ l:"Som
}}> d);setS
 i
,
i m

     <div style={{display:"flex",gap:2,marginBottom:16,borderBottom:"2px solid var(--br
      {secs.map(s=><button key={s.id}onClick={()=>setSec(s.id)}style={{
        padding:"7px 14px",border:"none",background:"none",cursor:"pointer",
        fontFamily:"'DM Sans',sans-serif",fontWeight:600,fontSize:12,whiteSpace:"nowra
        color:sec===s.id?"var(--T)":"var(--b)",
        borderBottom:sec===s.id?"2px solid var(--T)":"2px solid transparent",
        marginBottom:-2,transition:"all .15s",display:"flex",alignItems:"center",gap:5
      }}><span>{s.ic}</span><span>{s.l}</span></button>)}
    </div>
    {sec==="journal"&&<JournalAvecBilans enfant={enfant}liste={liste}role={role}pEId={
    {sec==="repas"&&<RepasChanges enfants={liste}role={role}pEId={selId}/>}
    {sec==="sommeil"&&<Sommeil enfants={liste}role={role}pEId={selId}/>}
    {sec==="activites"&&<ActivitesSuggerees enfants={liste}role={role}pEId={selId}/>}
</div>; }
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
  const ageActuel=enfant?Math.round((new Date()-new Date(enfant.naissance))/2592000000
  const prochainsVaccins=VACCINS_CALENDRIER.filter(v=>!v.fait&&v.age_mois<=ageActuel+3
const secs=[
{id:"sante",l:"Santé",ic:" "},
{id:"vaccins",l:"Vaccins",ic:" ",badge:prochainsVaccins.length}, {id:"croissance",l:"Croissance",ic:" "}
];
  return <div className="fi">
    {role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"
   )",over
p",flex
selId}u
):12; );
}}>

   {liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>setSelId(e.id
</div>}
<div style={{display:"flex",gap:2,marginBottom:16,borderBottom:"2px solid var(--br
  {secs.map(s=><button key={s.id}onClick={()=>setSec(s.id)}style={{
    padding:"7px 16px",border:"none",background:"none",cursor:"pointer",
    fontFamily:"'DM Sans',sans-serif",fontWeight:600,fontSize:12,position:"relativ
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
<PageHeadericon=" "title="Suivivaccinal"sub="Calendriervaccinalofficiel-
{prochainsVaccins.length>0&&<div style={{background:"var(--Rp)",border:"1.5px so <spanstyle={{fontSize:20}}> </span>
<div>
      <div style={{fontWeight:700,fontSize:13,color:"var(--R)",marginBottom:2}}>
        {prochainsVaccins.length} vaccin{prochainsVaccins.length>1?"s":""} à prévo
</div>
      <div style={{fontSize:12,color:"var(--m)"}}>À mentionner au médecin lors du
    </div>
</div>}
  <div style={{display:"flex",flexDirection:"column",gap:8}}>
    {VACCINS_CALENDRIER.map((v,i)=>{
      const enRetard=!v.fait&&v.age_mois<ageActuel;
      const proche=!v.fait&&v.age_mois>=ageActuel&&v.age_mois<=ageActuel+3;
      return <div key={i}style={{
        display:"flex",gap:12,alignItems:"center",padding:"12px 14px",borderRadius
        background:v.fait?"var(--Sp)":enRetard?"var(--Rp)":proche?"var(--Gp)":"var
        border:(v.fait?"1px solid var(--Sl)":enRetard?"1px solid var(--R)":proche?
        cursor:"pointer",transition:"all .2s",
      }}onClick={()=>{
        const updated=[...VACCINS_CALENDRIER];
        updated[i]={...updated[i],fait:!updated[i].fait};
        setVacsState(updated);
}}>
<spanstyle={{fontSize:20,flexShrink:0}}>{v.fait?" ":enRetard?" ":proche <div style={{flex:1}}>
    )}/>)} )"}}>
e",
rappe lid var
ir pour
prochai
:12,
(--c)",
"1px so
?" ":
 l
"

               <div style={{fontWeight:600,fontSize:13,color:"var(--b)"}}>{v.nom}</div>
              <div style={{fontSize:11,color:"var(--l)"}}>À {v.age_mois} mois · {v.fai
            </div>
            <div style={{width:22,height:22,borderRadius:6,border:"2px solid",
              borderColor:v.fait?"var(--G)":"var(--br)",
              background:v.fait?"var(--G)":"transparent",
              display:"flex",alignItems:"center",justifyContent:"center",
              color:"#fff",fontSize:12,flexShrink:0}}>
{v.fait?"✓":""} </div>
</div>; })}
      </div>
    </div>}
</div>; }
//
function EveilComplet({enfants,role,pEId}){
  const [selId,setSelId]=useState(enfants[0]?.id);
  const [sec,setSec]=useState("portfolio");
  const liste=role==="parent"?enfants.filter(e=>e.id===pEId):enfants;
  return <div className="fi">
    {role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"
      {liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>setSelId(e.id
    </div>}
    <div style={{display:"flex",gap:2,marginBottom:16,borderBottom:"2px solid var(--br
{[{id:"portfolio",l:"Portfolio",ic:" "},{id:"developpement",l:"Développement",i <button key={s.id}onClick={()=>setSec(s.id)}style={{
          padding:"7px 16px",border:"none",background:"none",cursor:"pointer",
          fontFamily:"'DM Sans',sans-serif",fontWeight:600,fontSize:12,
          color:sec===s.id?"var(--S)":"var(--b)",
          borderBottom:sec===s.id?"2px solid var(--S)":"2px solid transparent",
          marginBottom:-2,transition:"all .15s",display:"flex",alignItems:"center",gap
        }}><span>{s.ic}</span><span>{s.l}</span></button>
      )}
    </div>
    {sec==="portfolio"&&<Portfolio enfants={liste}role={role}pEId={selId}/>}
    {sec==="developpement"&&<Developpement enfants={liste}role={role}pEId={selId}/>}
</div>; }
//
function DocumentsComplet({enfants,role,pEId,user}){
  const [sec,setSec]=useState("documents");
  return <div className="fi">
  <PageHeadericon=" "title="Documents&Attestations"sub="Tousvosdocumentset
t?"Fait
}}> )}/>)}
)"}}> c:" "
:5
attest
 }
a

 <div style={{display:"flex",gap:2,marginBottom:16,borderBottom:"2px solid var(--br {[{id:"documents",l:"Documents",ic:" "},{id:"attestation_pe",l:"Att.PoleEmplo
        <button key={s.id}onClick={()=>setSec(s.id)}style={{
          padding:"7px 14px",border:"none",background:"none",cursor:"pointer",
          fontFamily:"'DM Sans',sans-serif",fontWeight:600,fontSize:12,
          color:sec===s.id?"var(--T)":"var(--b)",
          borderBottom:sec===s.id?"2px solid var(--G)":"2px solid transparent",
          marginBottom:-2,transition:"all .15s",display:"flex",alignItems:"center",gap
        }}><span>{s.ic}</span><span>{s.l}</span></button>
      )}
    </div>
    {sec==="documents"&&<Documents enfants={enfants}role={role}pEId={pEId}user={user}/
    {sec==="attestation_pe"&&<AttestationPoleEmploi enfants={enfants}role={role}pEId={
    {sec==="attestation_fiscale"&&<AttestationFiscale enfants={enfants}role={role}pEId
    {sec==="export"&&<ExportDonnees enfants={enfants}role={role}pEId={pEId}/>}
</div>; }
//
const DEMANDES_DEMO=[
  {
    id:"d1",statut:"nouveau",date:new Date(Date.now()-2*86400000).toISOString().slice(
    parent:{prenom:"Camille",nom:"Moreau",email:"camille.moreau@gmail.com",tel:"06 12
    enfant:{prenom:"Chloé",naissance:"2023-08-14",allergies:"Aucune connue",dejaCrèche
    contrat:{debut:"2024-09-02",jours:["Lundi","Mardi","Mercredi","Jeudi"],
      heureArrivee:"07h30",heureDepart:"17h30",heuresHebdo:40,
      anneeComplete:true,vacances:"Oui, pendant les vacances scolaires"},
    message:"Bonjour Madame Dupont, nous avons trouvé votre profil sur monenfant.fr. N
}, {
}, {
 },
id:"d2",statut:"en_discussion",date:new Date(Date.now()-5*86400000).toISOString().
parent:{prenom:"Antoine",nom:"Lefebvre",email:"antoine.lefebvre@hotmail.fr",tel:"0
enfant:{prenom:"Mathieu",naissance:"2022-11-03",allergies:"Lactose",dejaCrèche:tru
contrat:{debut:"2024-10-01",jours:["Lundi","Mercredi","Vendredi"],
  heureArrivee:"08h00",heureDepart:"18h00",heuresHebdo:30,
  anneeComplete:false,vacances:"Non, pas pendant les vacances"},
message:"Bonjour, mon fils Mathieu est actuellement à la crèche mais nous souhaito
id:"d3",statut:"accepte",date:new Date(Date.now()-12*86400000).toISOString().slice
parent:{prenom:"Lucie",nom:"Bernard",email:"lucie.b@orange.fr",tel:"06 55 44 33 22
enfant:{prenom:"Tom",naissance:"2021-04-20",allergies:"Aucune",dejaCrèche:false},
contrat:{debut:"2024-09-02",jours:["Lundi","Mardi","Jeudi","Vendredi"],
  heureArrivee:"08h30",heureDepart:"16h30",heuresHebdo:32,
  anneeComplete:true,vacances:"Pendant les petites vacances uniquement"},
message:"Bonjour, je suis enseignante et je cherche une assistante maternelle pour
)",flex
i",ic:
:5
>}
pEId}us
={pEId}
0,10),
34 56 7
:false}
otre fi
slice(0
7 89 01
e},
ns le c
(0,10),
",profe
mon fi
"

   {
    id:"d4",statut:"refuse",date:new Date(Date.now()-20*86400000).toISOString().slice(
    parent:{prenom:"Marc",nom:"Petit",email:"marc.petit@sfr.fr",tel:"06 11 22 33 44",p
    enfant:{prenom:"Emma",naissance:"2024-01-15",allergies:"Aucune",dejaCrèche:false},
    contrat:{debut:"2024-06-01",jours:["Lundi","Mardi","Mercredi","Jeudi","Vendredi"],
      heureArrivee:"07h00",heureDepart:"19h00",heuresHebdo:48,
      anneeComplete:true,vacances:"Oui, toutes les vacances"},
    message:"Bonjour, nous cherchons une solution d'urgence pour notre bébé Emma dès l
}, ];
//
function ListeAttente({role,enfants,user}){
  const isDemoMode=(enfants||[]).every(e=>["e1","e2","e3"].includes(e.id));
  const [demandes,setDemandes]=useState(isDemoMode?DEMANDES_DEMO:[]);
  const [selId,setSelId]=useState(null);
  const [filtre,setFiltre]=useState("tous");
  const [repTxt,setRepTxt]=useState("");
  const [toast,setToast]=useState("");
  const sel=demandes.find(d=>d.id===selId);
const statutLabel={nouveau:" Nouveau",en_discussion:" En discussion",accepte:" const statutColor={nouveau:"var(--B)",en_discussion:"var(--G)",accepte:"var(--S)",re const statutBg={nouveau:"var(--Bp)",en_discussion:"var(--Gp)",accepte:"var(--Sp)",re
  const changerStatut=(id,statut)=>{
    setDemandes(p=>p.map(d=>d.id===id?{...d,statut}:d));
    if(statut==="accepte")setToast("Demande acceptée - un contrat peut maintenant être
    if(statut==="refuse")setToast("Demande refusée - un email sera envoyé aux parents.
};
const envoyerReponse=()=>{
if(!repTxt.trim())return;
setToast("Réponse envoyée à "+sel?.parent.email+" ✓"); setRepTxt("");
changerStatut(selId,"en_discussion");
};
  const demandesFiltrees=filtre==="tous"?demandes:demandes.filter(d=>d.statut===filtre
  const nbNouveaux=demandes.filter(d=>d.statut==="nouveau").length;
  const ageEnfant=(naiss)=>{
    const n=new Date(naiss),now=new Date();
    const mois=(now.getFullYear()-n.getFullYear())*12+(now.getMonth()-n.getMonth());
    return mois<12?mois+" mois":Math.floor(mois/12)+" an"+(mois>=24?"s":"");
};
  0,10),
rofessi
e 1er j
  Accep
fuse:"v
fuse:"v
créé ✓ ");
);
 t

 return <div className="fi">
{toast&&<Toast msg={toast}onClose={()=>setToast("")}/>} <PageHeadericon=" "title="Demandesdecontact"
    sub="Parents qui souhaitent vous confier leur enfant via votre profil TiMat"/>
  {/* Info email public */}
  <div style={{background:"linear-gradient(135deg,var(--Bp),var(--Pp))",border:"1px
<spanstyle={{fontSize:24}}> </span> <div>
      <div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:4}}>Votr
      <div style={{fontFamily:"'DM Mono',monospace",fontSize:13,color:"var(--B)",fon
        {user?.email||"votre-email@timat.app"}
      </div>
      <div style={{fontSize:12,color:"var(--m)",lineHeight:1.6}}>
        Mettez cette adresse sur votre profil <strong>monenfant.fr</strong>.
        Les parents qui vous écrivent arrivent sur votre formulaire TiMat et vous vo
      </div>
    </div>
</div>
{nbNouveaux>0&&<div style={{background:"var(--Bp)",border:"1.5px solid var(--B)",b <spanstyle={{fontSize:18}}> </span>
<span style={{fontWeight:700,fontSize:13,color:"var(--B)"}}>{nbNouveaux} nouvell
</div>}
  {/* Filtres */}
  <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>
    {[["tous","Toutes"],["nouveau","Nouvelles"],["en_discussion","En discussion"],["
      <button key={v}onClick={()=>setFiltre(v)}style={{
        padding:"5px 12px",borderRadius:20,border:"1.5px solid",cursor:"pointer",fon
        background:filtre===v?"var(--b)":"transparent",
        color:filtre===v?"#fff":"var(--m)",
        borderColor:filtre===v?"var(--b)":"var(--br)"
      }}>{l} {v==="tous"?"("+demandes.length+")":v==="nouveau"&&nbNouveaux>0?"("+nbN
  </div>
  <div className="g2">
    {/* Liste des demandes */}
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      {demandesFiltrees.length===0&&<div className="card"style={{padding:20,textAlig
        Aucune demande dans cette catégorie.
      </div>}
      {demandesFiltrees.map(d=><div key={d.id}className="card card-lift"
        onClick={()=>setSelId(selId===d.id?null:d.id)}
        style={{padding:16,cursor:"pointer",borderLeft:"4px solid "+statutColor[d.st
          boxShadow:selId===d.id?"var(--sh2)":"var(--sh)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-
   solid v
e adres
tWeight
yez leu
orderRa
e{nbNou
accepte
tSize:1
ouveaux
n:"cent
atut],
start",

       <div style={{flex:1}}>
        <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:4}}>
          <span style={{fontWeight:700,fontSize:14,color:"var(--b)"}}>{d.parent.
          <span className="badge"style={{background:statutBg[d.statut],color:sta
            {statutLabel[d.statut]}
          </span>
        </div>
        <div style={{fontSize:12,color:"var(--m)"}}>
          Pour <strong>{d.enfant.prenom}</strong> · {ageEnfant(d.enfant.naissanc
        </div>
        <div style={{fontSize:11,color:"var(--l)",marginTop:2}}>
          Souhaite commencer le {fmt(d.contrat.debut)}
        </div>
      </div>
      <div style={{fontSize:11,color:"var(--l)",fontFamily:"'DM Mono',monospace"
    </div>
    {d.statut==="nouveau"&&<div style={{marginTop:8,fontSize:12,color:"var(--m)"
      overflow:"hidden",textOverflow:"ellipsis",display:"-webkit-box",WebkitLine
      "{d.message}"
    </div>}
  </div>)}
</div>
{/* Détail demande sélectionnée */}
{sel?<div style={{display:"flex",flexDirection:"column",gap:12}}>
  {/* Infos famille */}
  <div className="card"style={{padding:18}}>
<div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:14,dis <span> </span>{sel.parent.prenom}{sel.parent.nom}
<span className="badge"style={{background:statutBg[sel.statut],color:statu
        {statutLabel[sel.statut]}
      </span>
</div>
{/* Parent */}
<div style={{fontSize:12,fontWeight:700,color:"var(--l)",textTransform:"uppe {[[" Email",sel.parent.email],[" Téléphone",sel.parent.tel],[" Profess
      <div key={l}style={{display:"flex",justifyContent:"space-between",padding:
        <span style={{color:"var(--l)"}}>{l}</span>
        <span style={{fontWeight:600,color:"var(--b)"}}>{v}</span>
</div>)}
    {/* Enfant */}
    <div style={{fontSize:12,fontWeight:700,color:"var(--l)",textTransform:"uppe
    {[
[" Prénom",sel.enfant.prenom],
[" Naissance",fmt(sel.enfant.naissance)+" ("+ageEnfant(sel.enfant.naissa [" Allergies",sel.enfant.allergies],
       prenom}
tutColo
e)} · {
,flexSh
,fontSt
Clamp:2
play:"f
tColor[
rcase",
 ion",s
"5px 0"
rcase",
nce)+"
e
)

  [" Actuellement",sel.enfant.dejaCrèche?"En crèche":"À domicile"], ].map(([l,v])=>
    <div key={l}style={{display:"flex",justifyContent:"space-between",padding:
      <span style={{color:"var(--l)"}}>{l}</span>
      <span style={{fontWeight:600,color:"var(--b)"}}>{v}</span>
</div>)}
  {/* Contrat souhaité */}
  <div style={{fontSize:12,fontWeight:700,color:"var(--l)",textTransform:"uppe
  {[
["   Début",fmt(sel.contrat.debut)],
[" Jours",sel.contrat.jours.join(", ")],
[" Horaires",sel.contrat.heureArrivee+" → "+sel.contrat.heureDepart],
["   Heures/semaine",sel.contrat.heuresHebdo+"h"],
[" Durée",sel.contrat.anneeComplete?"Année complète":"Partielle"],
["   Vacances",sel.contrat.vacances],
  ].map(([l,v])=>
    <div key={l}style={{display:"flex",justifyContent:"space-between",padding:
      <span style={{color:"var(--l)"}}>{l}</span>
      <span style={{fontWeight:600,color:"var(--b)",textAlign:"right",maxWidth
    </div>)}
  {/* Message */}
  <div style={{marginTop:14,padding:"12px 14px",background:"var(--c)",borderRa
    "{sel.message}"
  </div>
</div>
{/* Actions */}
<div className="card"style={{padding:16}}>
  <div style={{fontWeight:700,fontSize:13,marginBottom:12,color:"var(--b)"}}>
  <textarea className="ta"value={repTxt}onChange={e=>setRepTxt(e.target.value)
    placeholder={"Bonjour "+sel.parent.prenom+",\n\nMerci pour votre message..
    style={{width:"100%",minHeight:90,marginBottom:10,resize:"vertical"}}/>
  <button className="btn bT"style={{width:"100%",marginBottom:10}}onClick={env
    disabled={!repTxt.trim()}>
       Envoyer par email
  </button>
  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
    {sel.statut!=="accepte"&&<button className="btn bS"onClick={()=>changerSta
         Accepter
    </button>}
    {sel.statut!=="refuse"&&<button className="btn bR"onClick={()=>changerStat
         Refuser
    </button>}
    {sel.statut==="accepte"&&<button className="btn bP"onClick={()=>setToast("
         Créer le contrat
       "5px 0"
rcase",
"5px 0"
:"55%"}
dius:10
Répo }
."} oyerRep
tut(sel
ut(sel.
Redirec
 n

             </button>}
          </div>
        </div>
      </div>
:<div className="card"style={{padding:28,textAlign:"center",color:"var(--l)"}}> <divstyle={{fontSize:36,marginBottom:12}}> </div>
<div style={{fontSize:13}}>Sélectionnez une demande pour voir le détail</div>
      </div>}
    </div>
</div>; }
//
function KitCMG({enfants,role,pEId,user}){
  const enfant=enfants.find(e=>e.id===pEId)||enfants[0];
  const asmat={...D.asmat,prenom:user?.prenom||D.asmat.prenom,nom:user?.nom||D.asmat.n
  const contrat=enfant?.contrat||{};
  const [copie,setCopie]=useState({});
  const [toast,setToast]=useState("");
const copy=(key,val)=>{ navigator.clipboard?.writeText(val).catch(()=>{}); setCopie(p=>({...p,[key]:true})); setTimeout(()=>setCopie(p=>({...p,[key]:false})),2000); setToast("Copié ✓");
};
  const InfoRow=({label,value,copyKey})=>(
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
      padding:"10px 0",borderBottom:"1px solid var(--br)"}}>
      <span style={{fontSize:12,color:"var(--l)",maxWidth:"45%"}}>{label}</span>
      <div style={{display:"flex",gap:8,alignItems:"center"}}>
        <span style={{fontSize:13,fontWeight:700,color:"var(--b)",textAlign:"right"}}>
        {copyKey&&<button onClick={()=>copy(copyKey,value)}style={{
          background:copie[copyKey]?"var(--Sp)":"var(--c)",border:"1px solid var(--br)
          borderRadius:6,padding:"3px 8px",fontSize:10,cursor:"pointer",
          color:copie[copyKey]?"var(--S)":"var(--l)",fontWeight:600,flexShrink:0
}}>{copie[copyKey]?"✓ Copié":"Copier"}</button>} </div>
</div> );
  // Calcul salaire net estimé
  const heuresMois=Math.round((contrat.heuresHebdo||40)*52/12);
  const salaireNet=Math.round(heuresMois*(contrat.tauxHoraire||4.05)*1.1*10)/10;
  const entretienMensuel=Math.round((contrat.entretien||3.80)*heuresMois/contrat.heure
 om,emai
{value} ",
sHebdo*

 return <div className="fi">
{toast&&<Toast msg={toast}onClose={()=>setToast("")}/>} <PageHeadericon=" "title="AideCMG-Kitdéclaration"
    sub="Toutes les informations pour déclarer votre mode de garde sur monenfant.fr"
  {/* Explication */}
  <div style={{background:"linear-gradient(135deg,var(--Gp),var(--Bp))",border:"1px
<div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:8}}> Com <div style={{fontSize:13,color:"var(--m)",lineHeight:1.8}}>
      1. Allez sur <strong>monenfant.fr</strong> → "Déclarer votre mode de garde"<br
      2. Utilisez les boutons <strong>"Copier"</strong> ci-dessous pour coller chaqu
      3. Soumettez votre déclaration<br/>
      4. La CAF calcule votre <strong>Complément Mode de Garde (CMG)</strong> automa
    </div>
    <a href="https://www.monenfant.fr" target="_blank" rel="noopener noreferrer"
      style={{display:"inline-block",marginTop:10,background:"var(--B)",color:"#fff"
      borderRadius:8,padding:"7px 14px",fontSize:12,fontWeight:700,textDecoration:"n
      Aller sur monenfant.fr →
</a> </div>
  <div className="g2">
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      {/* Infos assistante maternelle */}
      <div className="card"style={{padding:18}}>
<div style={{fontWeight:700,fontSize:13,color:"var(--T)",marginBottom:14,dis <span>     </span> Votre assistante maternelle
        </div>
        <InfoRow label="Nom complet" value={asmat.prenom+" "+asmat.nom} copyKey="asm
        <InfoRow label="N° agrément" value="AGR-2019-0042" copyKey="agrement"/>
        <InfoRow label="Email professionnel" value={user?.email||"marie.dupont@timat
        <InfoRow label="Code postal" value="75015" copyKey="cp"/>
        <InfoRow label="Commune" value="Paris 15e" copyKey="commune"/>
</div>
      {/* Infos contrat */}
      <div className="card"style={{padding:18}}>
<div style={{fontWeight:700,fontSize:13,color:"var(--S)",marginBottom:14,dis <span> </span>Votrecontrat
        </div>
        <InfoRow label="Date de début du contrat" value={fmt(contrat.debut||"2023-09
        <InfoRow label="Jours d'accueil" value={(contrat.jours||["Lu","Ma","Me","Je"
        <InfoRow label="Heures par semaine" value={(contrat.heuresHebdo||40)+"h"} co
        <InfoRow label="Heures par mois (estimé)" value={heuresMois+"h"} copyKey="he
        <InfoRow label="Horaires journaliers" value={contrat.horaires||"07h30–17h30"
   </div>
/>
solid v ment u
/>
e infor
tiqueme
, one"}}>
play:"f
Nom"/>
.app"}
play:"f
-04")}
,"Ve"])
pyKey="
uresMoi
} copyK
t

 </div>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        {/* Rémunération */}
        <div className="card"style={{padding:18}}>
<div style={{fontWeight:700,fontSize:13,color:"var(--G)",marginBottom:14,dis <span> </span>Rémunérationmensuelle
          </div>
          <InfoRow label="Taux horaire net" value={(contrat.tauxHoraire||4.05).toFixed
          <InfoRow label="Salaire net mensuel (estimé)" value={salaireNet+"€"} copyKey
          <InfoRow label="Indemnité d'entretien/jour" value={(contrat.entretien||3.80)
          <InfoRow label="Indemnité entretien/mois" value={entretienMensuel+"€"} copyK
          <div style={{marginTop:12,padding:"10px 12px",background:"var(--Gp)",borderR
               Le CMG prend en charge une partie du salaire selon vos revenus. Le calc
          </div>
</div>
        {/* Enfant */}
        <div className="card"style={{padding:18}}>
<div style={{fontWeight:700,fontSize:13,color:"var(--P)",marginBottom:14,dis <span>{enfant?.emoji||" "}</span>{enfant?.prenom||"Votreenfant"}
          </div>
          <InfoRow label="Prénom" value={enfant?.prenom||"-"} copyKey="enfPrenom"/>
          <InfoRow label="Date de naissance" value={fmt(enfant?.naissance||"")} copyKe
          <InfoRow label="Lieu de garde" value="Domicile de l'assistante maternelle" c
</div>
        {/* Lien Pajemploi */}
        <div className="card"style={{padding:16,background:"var(--Tp)",border:"1px sol
          <div style={{fontWeight:700,fontSize:13,color:"var(--T)",marginBottom:8}}>
          <div style={{fontSize:12,color:"var(--m)",lineHeight:1.6,marginBottom:10}}>
            Une fois déclaré sur monenfant.fr, vous devrez aussi déclarer les heures m
          </div>
          <a href="https://www.pajemploi.urssaf.fr" target="_blank" rel="noopener nore
            style={{display:"inline-block",background:"var(--T)",color:"#fff",
            borderRadius:8,padding:"7px 14px",fontSize:12,fontWeight:700,textDecoratio
            Aller sur Pajemploi →
</a> </div>
      </div>
    </div>
</div>; }
//
function SignatureContratParent({enfants,pEId}){
   const enfant=enfants.find(e=>e.id===pEId)||enfants[0];
play:"f
(2)+"€/
="salai
.toFixe
ey="ent
adius:1
ul est
play:"f
y="enfN
opyKey=
id var( Pajem
ensuell
ferrer"
n:"none
 p

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
if(signe)return <div style={{textAlign:"center",padding:40}}> <divstyle={{fontSize:60,marginBottom:16}}> </div>
<div className="pf"style={{fontSize:22,fontWeight:600,color:"var(--S)",marginBotto <div style={{fontSize:13,color:"var(--m)",lineHeight:1.7}}>
    Votre signature électronique a été enregistrée.<br/>
    L'assistante maternelle a été notifiée. Le contrat signé est disponible dans Doc
  </div>
 </div>;
m:8}}>C
uments.

 return <div className="fi">
{toast&&<Toast msg={toast}onClose={()=>setToast("")}/>} <PageHeadericon=" "title="Signermoncontrat"
    sub="Signature électronique conforme eIDAS - valeur légale"/>
  {/* Récap contrat */}
  <div className="card"style={{padding:18,marginBottom:16}}>
<div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:12}}> Co {[
      ["Assistante maternelle","Marie Dupont"],
      ["Enfant",(enfant?.prenom||"-")+" "+(enfant?.nom||"")],
      ["Début du contrat",fmt(contrat.debut||"2023-09-04")],
      ["Jours d'accueil",(contrat.jours||[]).join(", ")],
      ["Horaires",contrat.horaires||"07h30–17h30"],
      ["Taux horaire net",(contrat.tauxHoraire||4.05).toFixed(2)+"€/h"],
      ["Indemnité entretien",(contrat.entretien||3.80).toFixed(2)+"€/jour"],
    ].map(([l,v])=><div key={l}style={{display:"flex",justifyContent:"space-between"
      <span style={{color:"var(--l)"}}>{l}</span>
      <span style={{fontWeight:600,color:"var(--b)"}}>{v}</span>
    </div>)}
  </div>
  {/* Case lecture */}
  <label style={{display:"flex",gap:12,alignItems:"flex-start",cursor:"pointer",marg
    background:"var(--Bp)",border:"1px solid var(--B)",borderRadius:12,padding:"14px
    <input type="checkbox"checked={lu}onChange={e=>setLu(e.target.checked)}
      style={{width:18,height:18,marginTop:2,flexShrink:0,cursor:"pointer",accentCol
    <span style={{fontSize:13,color:"var(--B)",lineHeight:1.6}}>
      J'ai lu et j'accepte les conditions du contrat d'accueil pour {enfant?.prenom}
    </span>
</label>
  {/* Zone signature */}
  <div className="card"style={{padding:18,marginBottom:16}}>
<div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:4}}> Vot <div style={{fontSize:12,color:"var(--l)",marginBottom:12}}>Signez ci-dessous av <canvas ref={canvasRef}width={400}height={120}
      style={{width:"100%",height:120,border:"2px dashed var(--br)",borderRadius:10,
        cursor:"crosshair",background:"#FDFAF6",touchAction:"none"}}
      onMouseDown={startDraw}onMouseMove={draw}onMouseUp={()=>setDrawing(false)}
      onTouchStart={startDraw}onTouchMove={draw}onTouchEnd={()=>setDrawing(false)}/>
    <div style={{display:"flex",justifyContent:"space-between",marginTop:8}}>
<div style={{fontSize:11,color:"var(--l)"}}>
{hasSig?" Signature dessinée":"Tracez votre signature ci-dessus"}
      </div>
      {hasSig&&<button onClick={clearSig}style={{background:"none",border:"none",col
   ntrat
,paddin
inBotto
 16px"}
or:"var
. Je ce
re sig ec votr
or:"var
 d
n

       </div>
    </div>
    {/* Bouton valider */}
    <button className="btn bS"style={{width:"100%",justifyContent:"center",fontSize:14
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
{id:"matin",l:"Matin",h:"07h00–08h30",ic:" "}, {id:"midi",l:"Méridien",h:"11h30–13h30",ic:" "}, {id:"soir",l:"Soir",h:"16h30–19h00",ic:" "}, {id:"mercredi",l:"Mercredijournée",h:"08h00–18h00",ic:" "}, {id:"vacances",l:"Vacancesscolaires",h:"Selonplanning",ic:" "},
];
function PlanningPeriscolaire({enfants,role,pEId}){
  const [selId,setSelId]=useState(enfants[0]?.id);
  const [planning,setPlanning]=useState(()=>{
    const p={};
    enfants.forEach(e=>{
      p[e.id]={matin:["Lundi","Mercredi"],midi:[],soir:["Lundi","Mardi","Jeudi","Vendr
    });
return p; });
  const [toast,setToast]=useState("");
  const liste=role==="parent"?enfants.filter(e=>e.id===pEId):enfants;
  const enfant=liste.find(e=>e.id===selId)||liste[0];
  const p=planning[enfant?.id]||{};
  const toggleJour=(periode,jour)=>{
    setPlanning(prev=>({...prev,[enfant.id]:{...p,
      [periode]:Array.isArray(p[periode])
        ?p[periode].includes(jour)?p[periode].filter(j=>j!==jour):[...p[periode],jour]
        :p[periode]
}})); };
       ,paddin
edi"],m

 return <div className="fi">
{toast&&<Toast msg={toast}onClose={()=>setToast("")}/>} <PageHeadericon=" "title="Planningpériscolaire"
    sub="Gestion des accueils matin, midi, soir, mercredis et vacances"/>
  {role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"
    {liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>setSelId(e.id
</div>}
  <div style={{display:"flex",flexDirection:"column",gap:14}}>
    {PERIODES.map(per=><div key={per.id}className="card"style={{padding:18,borderLef
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"
        <div>
          <div style={{fontWeight:700,fontSize:14,color:"var(--b)"}}>{per.ic} {per.l
          <div style={{fontSize:12,color:"var(--l)"}}>{per.h}</div>
        </div>
        {typeof p[per.id]==="boolean"&&<label style={{display:"flex",alignItems:"cen
          <span style={{fontSize:12,color:"var(--m)"}}>Accueil</span>
          <div onClick={()=>{if(role==="asmat")setPlanning(prev=>({...prev,[enfant.i
            style={{width:44,height:24,borderRadius:12,background:p[per.id]?"var(--S
              position:"relative",cursor:role==="asmat"?"pointer":"default",transiti
            <div style={{position:"absolute",top:2,left:p[per.id]?20:2,width:20,heig
              borderRadius:"50%",background:"#fff",transition:"left .2s",boxShadow:"
          </div>
        </label>}
      </div>
      {Array.isArray(p[per.id])&&<div style={{display:"flex",gap:6,flexWrap:"wrap"}}
        {JOURS_SEM.filter(j=>j!=="Mercredi"||per.id!=="mercredi").map(jour=>{
          const actif=p[per.id]?.includes(jour);
          return <button key={jour}onClick={()=>role==="asmat"&&toggleJour(per.id,jo
            padding:"6px 14px",borderRadius:20,border:(actif?"1.5px solid var(--B)":
            background:actif?"var(--Bp)":"transparent",color:actif?"var(--B)":"var(-
            fontWeight:actif?700:400,fontSize:13,cursor:role==="asmat"?"pointer":"de
          }}>{jour.slice(0,2)}</button>;
        })}
      </div>}
    </div>)}
</div>
  {role==="asmat"&&<div style={{marginTop:16,display:"flex",gap:8,justifyContent:"fl
    <button className="btn bG">Imprimer le planning</button>
    <button className="btn bT"onClick={()=>setToast("Planning enregistré et partagé
         Sauvegarder et partager
    </button>
  </div>}
  {/* Vue hebdo synthèse */}
  }}> )}/>)}
t:"4px
,margin
}</div>
ter",ga
d]:{...
)":"var
on:"bac
ht:20,
0 1px 4
>
ur)}sty
"1.5px
-l)",
fault",
ex-end"
avec le

 <div className="card"style={{padding:18,marginTop:16}}>
<div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:12}}> Ré <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:4}}>
        {JOURS_SEM.map(j=><div key={j}style={{textAlign:"center"}}>
          <div style={{fontSize:11,fontWeight:700,color:"var(--l)",marginBottom:6,text
          {PERIODES.filter(per=>per.id!=="vacances"&&per.id!=="mercredi").map(per=>{
            const actif=Array.isArray(p[per.id])?p[per.id].includes(j):false;
            if(!actif)return null;
            return <div key={per.id}style={{
              background:"var(--Bp)",borderRadius:6,padding:"3px 4px",
              fontSize:10,color:"var(--B)",fontWeight:600,marginBottom:3
            }}>{per.ic}</div>;
})}
          {j==="Mercredi"&&p.mercredi&&<div style={{background:"var(--Sp)",borderRadiu
        </div>)}
      </div>
    </div>
</div>; }
//
const FORUM_POSTS=[
  {id:"p1",auteur:"Sylvie M.",ville:"Lyon",date:"Il y a 2h",titre:"Pajemploi - Régular
    contenu:"Bonjour à toutes, je me retrouve avec une régularisation positive de 180€
    reponses:8,tags:["Pajemploi","Salaire"],epingle:true},
  {id:"p2",auteur:"Nathalie B.",ville:"Bordeaux",date:"Il y a 4h",titre:"Activités pou
    contenu:"Ma petite Inès a 18 mois et commence à s'ennuyer des mêmes activités. Est
    reponses:14,tags:["Activités","Éveil"],epingle:false},
  {id:"p3",auteur:"Farida K.",ville:"Paris",date:"Il y a 1j",titre:"Contrat - Clause d
    contenu:"J'ai une famille qui veut enlever la clause de rupture du contrat. Est-ce
    reponses:5,tags:["Contrat","Juridique"],epingle:false},
  {id:"p4",auteur:"Caroline D.",ville:"Nantes",date:"Il y a 2j",titre:"PMI - Renouvell
    contenu:"Mon renouvellement c'est dans 3 mois. Qu'est-ce que vous avez préparé com
    reponses:22,tags:["PMI","Agrément"],epingle:false},
  {id:"p5",auteur:"Isabelle R.",ville:"Toulouse",date:"Il y a 3j",titre:"MAM - Qui est
    contenu:"Je cherche 1 ou 2 collègues pour monter une MAM. J'ai déjà un local en vu
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
capitu
Transfo
s:6,pad
isation
 pour u
r 18 mo -ce que
e ruptu légal
ement a
me doss
intére e. Si v
 l

  const tags=["tous","Pajemploi","Contrat","Activités","Juridique","PMI","MAM","Réseau
const postsFiltres=filtre==="tous"?posts:posts.filter(p=>p.tags.includes(filtre));
const poster=()=>{
  if(!newPost.titre.trim()||!newPost.contenu.trim())return;
  setPosts(p=>[{id:"p"+Date.now(),auteur:"Marie D.",ville:"Paris",date:"À l'instant"
titre:newPost.titre,contenu:newPost.contenu,reponses:0,tags:[newPost.tag],epingl setNewPost({titre:"",contenu:"",tag:"Pajemploi"});
setShowNew(false);
setToast("Votre question a été publiée ✓");
};
return <div className="fi">
{toast&&<Toast msg={toast}onClose={()=>setToast("")}/>} <PageHeadericon=" "title="Communautéassmats"
    sub="Entraidez-vous · Partagez vos expériences · Posez vos questions"/>
  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",mar
    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
      {tags.map(t=><button key={t}onClick={()=>setFiltre(t)}style={{
        padding:"5px 12px",borderRadius:20,border:"1.5px solid",cursor:"pointer",fon
        background:filtre===t?"var(--P)":"transparent",
        color:filtre===t?"#fff":"var(--m)",
        borderColor:filtre===t?"var(--P)":"var(--br)"
      }}>{t}</button>)}
    </div>
<button className="btn bT"onClick={()=>setShowNew(p=>!p)}> {showNew?"✕ Annuler":" Poser une question"}
    </button>
  </div>
{showNew&&<div className="card"style={{padding:18,marginBottom:16,border:"2px soli <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:12}}> No <input className="inp"placeholder="Titre de votre question..."value={newPost.tit
      onChange={e=>setNewPost(p=>({...p,titre:e.target.value}))}style={{marginBottom
    <textarea className="ta"placeholder="Décrivez votre situation..."value={newPost.
      onChange={e=>setNewPost(p=>({...p,contenu:e.target.value}))}
      style={{width:"100%",minHeight:80,resize:"vertical",marginBottom:10}}/>
    <div style={{display:"flex",gap:10,alignItems:"center"}}>
      <select className="sel"style={{flex:1}}value={newPost.tag}onChange={e=>setNewP
        {tags.filter(t=>t!=="tous").map(t=><option key={t}>{t}</option>)}
</select>
      <button className="btn bT"onClick={poster}>Publier →</button>
    </div>
  </div>}
  <div className="g2">
  "];
, e:false
ginBott
tSize:1
d var(-
uvelle
re}
:10}}/>
contenu
ost(p=>

   <div style={{display:"flex",flexDirection:"column",gap:10}}>
    {postsFiltres.map(post=><div key={post.id}className="card card-lift"
      onClick={()=>setSelPost(selPost?.id===post.id?null:post)}
      style={{padding:16,cursor:"pointer",borderLeft:post.epingle?"4px solid var(-
      {post.epingle&&<div style={{fontSize:10,fontWeight:700,color:"var(--G)",marg
      <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:6,line
      <div style={{fontSize:12,color:"var(--m)",lineHeight:1.5,marginBottom:8,
        overflow:"hidden",textOverflow:"ellipsis",display:"-webkit-box",
        WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{post.contenu}</div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"cente
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {post.tags.map(t=><span key={t}className="badge"style={{background:"var(
        </div>
        <div style={{display:"flex",gap:12,fontSize:11,color:"var(--l)"}}>
<span> {post.auteur} · {post.ville}</span>
<span> {post.reponses} réponse{post.reponses>1?"s":""}</span> <span>{post.date}</span>
        </div>
      </div>
    </div>)}
  </div>
  {selPost?<div className="card"style={{padding:18}}>
    <div style={{fontWeight:700,fontSize:15,color:"var(--b)",marginBottom:8}}>{sel
    <div style={{fontSize:13,color:"var(--m)",lineHeight:1.7,marginBottom:12}}>{se
    <div style={{fontSize:11,color:"var(--l)",marginBottom:16,paddingBottom:12,bor
      {selPost.auteur} · {selPost.ville} · {selPost.date}
    </div>
    <div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:10}}>
         {selPost.reponses} réponses
    </div>
    <div style={{background:"var(--c)",borderRadius:10,padding:12,marginBottom:12,
      Les réponses de la communauté s'afficheront ici.
    </div>
    <textarea className="ta"value={reponse}onChange={e=>setReponse(e.target.value)
      placeholder="Votre réponse..."style={{width:"100%",minHeight:70,resize:"vert
<button className="btn bP"style={{width:"100%"}}onClick={()=>{ if(!reponse.trim())return; setPosts(p=>p.map(post=>post.id===selPost.id?{...post,reponses:post.reponses setReponse("");setToast("Réponse publiée ✓");
    }}>Publier ma réponse</button>
  </div>
:<div className="card"style={{padding:28,textAlign:"center",color:"var(--l)"}}> <divstyle={{fontSize:36,marginBottom:8}}> </div>
<div style={{fontSize:13}}>Sélectionnez un sujet pour lire les réponses et par
  </div>}
</div>
    -G)":"4
inBotto
Height:
r"}}>
--Pp)",
Post.ti
lPost.c
derBott
fontSiz
} ical",m
+1}:pos
ticiper

 </div>; }
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
      const htmlRapport='<!DOCTYPE html><html><head><title>Rapport annuel '+annee+' -
        +'<style>body{font-family:Arial,sans-serif;max-width:800px;margin:40px auto;co
        +'h1{color:#B8622F;}table{width:100%;border-collapse:collapse;margin:20px 0;}'
        +'td,th{padding:10px;border:1px solid #ddd;text-align:left;}th{background:#f5f
        +'.total{font-weight:bold;}@media print{button{display:none}}</style></head>'
        +'<body><h1>Rapport annuel '+annee+'</h1>'
+'<p><strong>Assistante maternelle:</strong> Marie Dupont</p>' +'<p><strong>Enfant:</strong> '+(enfant?.prenom||'')+' '+(enfant?.nom||'')+'</ +'<h2>Récapitulatif financier</h2>' +'<table><tr><th>Poste</th><th>Montant</th></tr>'
+'<tr><td>Salaire net annuel estimé</td><td>'+salaireAnnuel+'€</td></tr>' +"<tr><td>Indemnités d'entretien</td><td>"+entretienAnnuel+"€</td></tr>"
+'<tr class="total"><td>Total versé</td><td>'+totalAnnuel+'€</td></tr>' +"<tr><td>Crédit d'impôt estimé (50%)</td><td>"+creditImpot+"€</td></tr>" +'</table>'
+'<p style="font-size:12px;color:#888;">Généré par TiMat - '+new Date().toLoca +'<button onclick="window.print()"> Imprimer / PDF</button>' +'</body></html>';
      w.document.write(htmlRapport);
      w.document.close();
 '+(enfa
lor:#22
5f5;}'
p>'
leDateS

 setToast("Rapport ouvert dans un nouvel onglet ✓"); },1000);
return <div className="fi">
{toast&&<Toast msg={toast}onClose={()=>setToast("")}/>} <PageHeadericon=" "title="Rapportannuelcomplet"
    sub="Récapitulatif fiscal · Attestation · Déclaration d'impôts"/>
  {role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"
    {liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>setSelId(e.id
</div>}
  <div style={{display:"flex",gap:10,marginBottom:20,alignItems:"center"}}>
    <label className="lbl"style={{marginBottom:0}}>Année :</label>
    {[2023,2024,2025].map(y=><button key={y}onClick={()=>setAnnee(y)}style={{
      padding:"6px 14px",borderRadius:8,border:"1.5px solid",cursor:"pointer",fontSi
      background:annee===y?"var(--b)":"transparent",
      color:annee===y?"#fff":"var(--m)",
      borderColor:annee===y?"var(--b)":"var(--br)"
    }}>{y}</button>)}
  </div>
  <div className="g2">
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      {/* Récap financier */}
      <div className="card"style={{padding:18}}>
        <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:14}}>
        {[
          ["Salaire net annuel estimé",salaireAnnuel+"€","var(--S)"],
          ["Indemnités d'entretien",""+entretienAnnuel+"€","var(--G)"],
          ["Total versé par les parents",""+totalAnnuel+"€","var(--b)"],
          ["Crédit d'impôt estimé (50%)",""+creditImpot+"€ remboursé","var(--B)"],
        ].map(([l,v,c])=><div key={l}style={{display:"flex",justifyContent:"space-be
          <span style={{fontSize:13,color:"var(--m)"}}>{l}</span>
          <span style={{fontSize:13,fontWeight:700,color:c}}>{v}</span>
        </div>)}
        <div style={{marginTop:12,padding:"10px 12px",background:"var(--Bp)",borderR
             Ces montants sont estimés. Le rapport PDF contient les chiffres exacts
        </div>
</div>
      {/* Contenu du rapport */}
      <div className="card"style={{padding:18}}>
        <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:12}}>
        {[
};
   [" ","Pagedegarde-identitéasmatetenfant"],
}}> )}/>)}
ze:13,f
Réca
tween",
adius:1
basés
Cont
  p
s
e

   [" ","Récapitulatifmensueldesheures(jan→déc)"], [" ","Totalsalairenetmensueletannuel"],
[" ","Indemnitésd'entretienetderepas"],
[" ","Congéspayésprisetrestants"],
[" ","Absencesetindemnisations"],
[" ","Attestationfiscaleemployeur(créditd'impôt)"], [" ","RécapitulatifPajemploiparmois"],
[" ","Bilanpédagogiqueannueldel'enfant"],
    ].map(([ic,t])=><div key={t}style={{display:"flex",gap:10,padding:"6px 0",bo
      <span style={{color:"var(--S)"}}>{ic}</span>
      <span style={{color:"var(--m)"}}>{t}</span>
    </div>)}
  </div>
</div>
<div style={{display:"flex",flexDirection:"column",gap:14}}>
  {/* Enfant concerné */}
  <div className="card"style={{padding:18,textAlign:"center",borderTop:"4px soli
<divstyle={{fontSize:52,marginBottom:8}}>{enfant?.emoji||" "}</div>
<div className="pf"style={{fontSize:18,fontWeight:600,color:"var(--b)",margi <div style={{fontSize:12,color:"var(--l)"}}>{age(enfant?.naissance||"")}</di <div style={{marginTop:12,padding:"8px 12px",background:"var(--Sp)",borderRa
         Contrat actif depuis {fmt(contrat.debut||"2023-09-04")}
    </div>
</div>
  {/* Bouton génération */}
  <div className="card"style={{padding:20,textAlign:"center"}}>
<divstyle={{fontSize:40,marginBottom:12}}> </div>
<div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:8}}>
      Rapport annuel {annee}
    </div>
    <div style={{fontSize:12,color:"var(--l)",marginBottom:16,lineHeight:1.6}}>
      Pour {enfant?.prenom} {enfant?.nom}<br/>
      Inclut l'attestation fiscale
    </div>
    <button className="btn bT"style={{width:"100%",justifyContent:"center"}}onCl
{gen?" Génération en cours...":" Générer et télécharger le PDF"} </button>
</div>
  {/* Partage parent */}
  {role==="asmat"&&<div className="card"style={{padding:16,background:"var(--Gp)
    <div style={{fontWeight:700,fontSize:13,color:"var(--G)",marginBottom:8}}>
    <div style={{fontSize:12,color:"var(--m)",marginBottom:10,lineHeight:1.6}}>
      L'attestation fiscale peut être envoyée directement aux parents pour leur
</div>
            rderBot
d "+(en
nBottom
v>
dius:8,
ick={ge
",borde
 Envoi
déclara

           <button className="btn bG"style={{width:"100%"}}onClick={()=>setToast("Attes
               Envoyer l'attestation au parent
          </button>
        </div>}
      </div>
    </div>
</div>; }
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
<PageHeadericon=" "title="Simulateurdecoût"sub="Estimezlecoûtréeldelag <div className="g2">
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div className="card"style={{padding:18}}>
          <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:14}}>
          {[
            {l:"Taux horaire net (€/h)",v:taux,set:setTaux,min:3.5,max:8,step:0.05},
            {l:"Heures d'accueil par semaine",v:heures,set:setHeures,min:5,max:60,step
            {l:"Semaines d'accueil par an",v:semaines,set:setSemaines,min:30,max:52,st
            {l:"Indemnité entretien (€/jour)",v:entretien,set:setEntretien,min:2.65,ma
          ].map(({l,v,set,min,max,step})=><div key={l}style={{marginBottom:14}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}
              <label className="lbl"style={{marginBottom:0}}>{l}</label>
              <span style={{fontWeight:700,color:"var(--b)",fontSize:13}}>{v}</span>
  tation
arde a
Les
:1},
ep:1},
x:8,ste
}>
 p
p

       </div>
      <input type="range"min={min}max={max}step={step}value={v}
        onChange={e=>set(parseFloat(e.target.value))}
        style={{width:"100%",accentColor:"var(--T)"}}/>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:10,col
        <span>{min}</span><span>{max}</span>
      </div>
    </div>)}
  </div>
  <div className="card"style={{padding:18}}>
    <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:14}}>
    <div style={{marginBottom:14}}>
      <label className="lbl">Revenus nets annuels du foyer (€)</label>
      <input type="number"className="inp"value={revenus}onChange={e=>setRevenus(
    </div>
    <div>
      <label className="lbl">Nombre d'enfants à charge</label>
      <div style={{display:"flex",gap:8}}>
        {[1,2,3].map(n=><button key={n}onClick={()=>setEnfants2(n)}style={{
          flex:1,padding:"8px",borderRadius:8,border:"1.5px solid",cursor:"point
          background:enfants2===n?"var(--B)":"transparent",color:enfants2===n?"#
          borderColor:enfants2===n?"var(--B)":"var(--br)"}}>{n}</button>)}
      </div>
    </div>
  </div>
</div>
<div style={{display:"flex",flexDirection:"column",gap:14}}>
  <div className="card"style={{padding:18,border:"2px solid var(--T)"}}>
    <div style={{fontWeight:700,fontSize:14,color:"var(--T)",marginBottom:16}}>
    {[
      ["Coût brut de la garde",fmt2(coutTotal),"var(--m)"],
      ["Aide CMG (CAF)","-"+fmt2(cmgMensuel),"var(--S)"],
      ["Crédit d'impôt (50%)","-"+fmt2(creditImpot),"var(--B)"],
    ].map(([l,v,c])=><div key={l}style={{display:"flex",justifyContent:"space-be
      <span style={{fontSize:13,color:"var(--m)"}}>{l}</span>
      <span style={{fontWeight:700,color:c}}>{v}</span>
    </div>)}
    <div style={{marginTop:12,padding:"14px",background:"var(--Tp)",borderRadius
      <div style={{fontSize:12,color:"var(--T)",marginBottom:4}}>Reste à charge
      <div className="pf"style={{fontSize:38,fontWeight:700,color:"var(--T)"}}>{
      <div style={{fontSize:11,color:"var(--l)",marginTop:4}}>par mois</div>
    </div>
  </div>
  <div className="card"style={{padding:16,background:"var(--Gp)",border:"1px sol
    <div style={{fontWeight:700,fontSize:13,color:"var(--G)",marginBottom:8}}>
    {[
or:"var
parseIn
er",fon
fff":"v
Résu
tween",
:12,tex
mensuel
fmt2(re
id var( Sur l
     V
l
'

             ["Coût annuel brut",fmt2(coutTotal*12)],
            ["Aides totales",fmt2((cmgMensuel+creditImpot)*12)],
            ["Votre coût réel annuel",fmt2(resteCharge*12)],
          ].map(([l,v])=><div key={l}style={{display:"flex",justifyContent:"space-betw
            <span style={{color:"var(--m)"}}>{l}</span>
            <span style={{fontWeight:600,color:"var(--b)"}}>{v}</span>
          </div>)}
        </div>
        <div style={{fontSize:11,color:"var(--l)",lineHeight:1.6,padding:"10px 0"}}>
             Simulation indicative. Le CMG exact dépend de vos ressources déclarées à
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
  const motifs=["Démission du parent","Rupture amiable","Retraite asmat","Déménagement
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
<PageHeadericon=" "title="Soldedetoutcompte"sub="Calculautomatiqueàlafi {role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"
  {liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>{setSelId(e.i
een",fo
la CAF
","Fin
n d'un
}}>
d);setC
.

 </div>}
<div className="g2">
  <div style={{display:"flex",flexDirection:"column",gap:14}}>
    <div className="card"style={{padding:18}}>
      <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:14}}>
      <div style={{marginBottom:12}}>
        <label className="lbl">Date de fin du contrat</label>
        <input type="date"className="inp"value={dateFin}onChange={e=>setDateFin(e.
      </div>
      <div style={{marginBottom:12}}>
        <label className="lbl">Motif de rupture</label>
        <select className="sel"value={motif}onChange={e=>setMotif(e.target.value)}
          {motifs.map(m=><option key={m}>{m}</option>)}
        </select>
      </div>
      <div style={{background:"var(--c)",borderRadius:10,padding:12,marginBottom:1
        <div style={{fontSize:12,fontWeight:700,color:"var(--b)",marginBottom:6}}>
        {[
          ["Enfant",(enfant?.prenom||"-")+" "+(enfant?.nom||"")],
          ["Début",fmt(contrat.debut||"2023-09-04")],
          ["Taux horaire",tauxH.toFixed(2)+"€/h"],
          ["Heures/semaine",(contrat.heuresHebdo||40)+"h"],
        ].map(([l,v])=><div key={l}style={{display:"flex",justifyContent:"space-be
          <span style={{color:"var(--l)"}}>{l}</span><span style={{fontWeight:600,
        </div>)}
      </div>
      <button className="btn bT"style={{width:"100%"}}onClick={()=>{if(!dateFin)re
           Calculer le solde de tout compte
      </button>
    </div>
</div>
  {calcule&&<div style={{display:"flex",flexDirection:"column",gap:14}}>
    <div className="card"style={{padding:20,border:"2px solid var(--G)"}}>
      <div style={{fontWeight:700,fontSize:14,color:"var(--G)",marginBottom:16}}>
      {[
        ["Indemnité compensatrice de congés payés",congesRestants+" jours × "+(heu
        ["Indemnité de préavis ("+preavis+"j)",preavis+" jours selon CCN",indemPre
      ].map(([l,d,v,c])=><div key={l}style={{padding:"10px 0",borderBottom:"1px so
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}
          <span style={{fontSize:13,fontWeight:600,color:"var(--b)"}}>{l}</span>
          <span style={{fontWeight:700,color:c,fontSize:13}}>{v}</span>
        </div>
        <div style={{fontSize:11,color:"var(--l)"}}>{d}</div>
      </div>)}
      <div style={{marginTop:14,padding:14,background:"var(--Gp)",borderRadius:12,
        <span className="pf"style={{fontSize:15,fontWeight:700,color:"var(--b)"}}>
 Para
target.
>
4}}> Données
tween",
color:"
turn;se
Sold
resMois
avis.to
lid var
}>
display
TOTAL S
  m
e

             <span className="pf"style={{fontSize:28,fontWeight:700,color:"var(--G)"}}>
          </div>
          <div style={{fontSize:10,color:"var(--l)",marginTop:12,lineHeight:1.6}}>
            Calcul conforme à la CCN des particuliers employeurs. L'ICCP est calculée
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button className="btn bG"style={{flex:1}}onClick={()=>setToast("Document PD
          <button className="btn bT"style={{flex:1}}onClick={()=>setToast("Envoyé au p
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
setToast("Export "+format.toUpperCase()+" généré et prêt à télécharger ✓"); },2000);
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
{total.
sur la
F génér arent ✓

  <PageHeadericon=" "title="Exportdevosdonnées"
sub="Téléchargez l'intégralité de vos données - droit RGPD à la portabilité"/>
<div className="g2">
  <div style={{display:"flex",flexDirection:"column",gap:14}}>
    <div className="card"style={{padding:18}}>
      <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:14}}>
      {modules.map(m=><label key={m.id}style={{display:"flex",gap:10,alignItems:"c
        <input type="checkbox"checked={sel[m.id]}onChange={e=>setSel(p=>({...p,[m.
          style={{width:15,height:15,accentColor:"var(--T)",flexShrink:0}}/>
        <span style={{fontSize:13,color:"var(--b)"}}>{m.l}</span>
      </label>)}
    </div>
  </div>
  <div style={{display:"flex",flexDirection:"column",gap:14}}>
    <div className="card"style={{padding:18}}>
      <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:14}}>
      <div style={{marginBottom:12}}>
        <label className="lbl">Enfant concerné</label>
        <select className="sel"value={selEnfant}onChange={e=>setSelEnfant(e.target
          <option value="tous">Tous les enfants</option>
          {enfants.map(e=><option key={e.id}value={e.id}>{e.emoji} {e.prenom}</opt
        </select>
      </div>
      <div style={{marginBottom:12}}>
        <label className="lbl">Période</label>
        <select className="sel"value={periode}onChange={e=>setPeriode(e.target.val
          <option value="mois">Ce mois</option>
          <option value="trimestre">Ce trimestre</option>
          <option value="annee">Cette année</option>
          <option value="tout">Tout l'historique</option>
        </select>
      </div>
      <div style={{marginBottom:16}}>
        <label className="lbl">Format</label>
        <div style={{display:"flex",gap:8}}>
{[["pdf"," PDF"],["csv"," CSV"],["json"," JSON"]].map(([v,l])=><bu flex:1,padding:"8px",borderRadius:8,border:"1.5px solid",cursor:"point background:format===v?"var(--b)":"transparent",color:format===v?"#fff" borderColor:format===v?"var(--b)":"var(--br)"}}>{l}</button>)}
        </div>
      </div>
      <div style={{background:"var(--Bp)",borderRadius:10,padding:"10px 12px",marg
           Export conforme RGPD (article 20 - droit à la portabilité). Fichier chi
      </div>
      <button className="btn bT"style={{width:"100%",justifyContent:"center"}}onCl
{exporting?" Génération en cours...":" Exporter mes données"} </button>
        Ce q
enter",
id]:e.t
Opti
.value)
ion>)}
ue)}>
 tton k
er",fon
:"var(-
inBotto
ffré,
ick={ex
  u
o
e
t

         </div>
        <div className="card"style={{padding:16,background:"var(--Sp)",border:"1px sol
          <div style={{fontWeight:700,fontSize:13,color:"var(--S)",marginBottom:6}}>
          <div style={{fontSize:12,color:"var(--m)",lineHeight:1.7}}>
            Vous avez le droit d'accéder à toutes vos données, de les télécharger, et
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
<PageHeadericon=" "title="Bilans&Exports"sub="Rapports,recapitulatifsetex <div style={{display:"flex",gap:2,marginBottom:16,borderBottom:"2px solid var(--br {[{id:"rapport",l:"Rapportannuel",ic:" "},{id:"recap",l:"RecapmensuelPDF",ic
        <button key={s.id}onClick={()=>setSec(s.id)}style={{
          padding:"7px 14px",border:"none",background:"none",cursor:"pointer",
          fontFamily:"'DM Sans',sans-serif",fontWeight:600,fontSize:12,
          color:sec===s.id?"var(--T)":"var(--b)",
          borderBottom:sec===s.id?"2px solid var(--G)":"2px solid transparent",
          marginBottom:-2,transition:"all .15s",display:"flex",alignItems:"center",gap
        }}><span>{s.ic}</span><span>{s.l}</span></button>
      )}
    </div>
    {sec==="rapport"&&<RapportAnnuel enfants={enfants}role={role}pEId={pEId}user={user
    {sec==="recap"&&<Recap enfants={enfants}role={role}pEId={pEId}/>}
    {sec==="export"&&<ExportDonnees enfants={enfants}role={role}user={user}/>}
</div>; }
//
const FAQ_DATA=[
  {cat:"Pajemploi",q:"Comment exporter mes données vers Pajemploi ?",
   r:"Dans Facturation & Bilans, cliquez sur 'Exporter vers Pajemploi'. TiMat génère u
  {cat:"Pajemploi",q:"Mon calcul de salaire est-il conforme à la convention collective
   r:"Oui. TiMat applique automatiquement les règles de la CCN des particuliers employ
  {cat:"Contrats",q:"Puis-je modifier un contrat en cours ?",
   r:"Oui, via un avenant. Dans Facturation → Contrats & Avenants, choisissez 'Avenant
  {cat:"Contrats",q:"Que se passe-t-il si un parent ne signe pas le contrat ?",
   r:"Relancez via la messagerie TiMat. Sans signature, le contrat n'a pas de valeur l
  {cat:"PMI",q:"Comment préparer ma visite de renouvellement d'agrément ?",
   r:"Dans Documents, exportez votre 'Dossier PMI complet' : il contient l'historique
  {cat:"Finances",q:"Comment calculer le solde de tout compte ?",
  id var( Vos d
de les
ports
)",flex
:" "}
:5
}/>}
n récap ?",
eurs : - Modi
égale.
des enf
  r
d ,

    r:"Dans Facturation → Solde de tout compte. Saisissez la date de fin et le motif. T
  {cat:"RGPD",q:"Comment supprimer mon compte et toutes mes données ?",
   r:"Dans Paramètres → Supprimer mon compte. La suppression est immédiate et définiti
  {cat:"RGPD",q:"Où sont stockées mes données ?",
   r:"Exclusivement en France, sur des serveurs OVHcloud à Paris via Supabase. Aucun t
  {cat:"Abonnement",q:"Puis-je changer d'offre ou résilier ?",
   r:"Oui, à tout moment depuis Paramètres → Mon abonnement. Pas d'engagement, pas de
  {cat:"Abonnement",q:"Comment fonctionne le parrainage ?",
   r:"Dans Parrainage, copiez votre lien personnel. Quand une collègue s'inscrit et pa
];
function FAQ({role}){
  const [filtre,setFiltre]=useState("Tous");
  const [open,setOpen]=useState(null);
  const [search,setSearch]=useState("");
  const cats=["Tous",...[...new Set(FAQ_DATA.map(f=>f.cat))]];
  const filtrees=FAQ_DATA
    .filter(f=>filtre==="Tous"||f.cat===filtre)
    .filter(f=>!search||f.q.toLowerCase().includes(search.toLowerCase())||f.r.toLowerC
return <div className="fi">
<PageHeadericon=" "title="Centred'aide"sub="Réponsesauxquestionslesplusf <input className="inp"placeholder=" Rechercher dans l'aide..."value={search}
      onChange={e=>setSearch(e.target.value)}style={{marginBottom:14}}/>
    <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>
      {cats.map(c=><button key={c}onClick={()=>setFiltre(c)}style={{
        padding:"5px 12px",borderRadius:20,border:"1.5px solid",cursor:"pointer",fontS
        background:filtre===c?"var(--b)":"transparent",color:filtre===c?"#fff":"var(--
        borderColor:filtre===c?"var(--b)":"var(--br)"}}>{c}</button>)}
    </div>
    <div style={{display:"flex",flexDirection:"column",gap:6}}>
      {filtrees.length===0&&<div className="card"style={{padding:20,textAlign:"center"
        Aucun résultat. <span style={{color:"var(--T)",cursor:"pointer"}}onClick={()=>
      </div>}
      {filtrees.map((f,i)=><div key={i}className="card"style={{padding:0,overflow:"hid
        <button onClick={()=>setOpen(open===i?null:i)}style={{
          width:"100%",padding:"14px 18px",background:"none",border:"none",cursor:"poi
          display:"flex",justifyContent:"space-between",alignItems:"center",textAlign:
          <div style={{flex:1}}>
            <span className="badge"style={{background:"var(--Bp)",color:"var(--B)",fon
            <div style={{fontWeight:600,fontSize:13,color:"var(--b)"}}>{f.q}</div>
          </div>
<span style={{fontSize:18,color:"var(--l)",flexShrink:0,transition:"transfor transform:open===i?"rotate(180deg)":"rotate(0deg)"}}>▾</span>
        </button>
        {open===i&&<div style={{padding:"0 18px 16px",fontSize:13,color:"var(--m)",lin
  {f.r}
iMat ca
ve. Tou
ransfer
frais d
sse au
ase().i
réquen
ize:12, m)",
,color:
setSear
den"}}>
nter",
"left",
tSize:9
m .2s",
eHeight
t

         </div>}
      </div>)}
    </div>
    <div className="card"style={{padding:18,marginTop:20,textAlign:"center",background
      <div style={{fontSize:14,fontWeight:700,color:"var(--b)",marginBottom:6}}>Vous n
      <div style={{fontSize:13,color:"var(--m)",marginBottom:12}}>Notre équipe répond
      <button className="btn bT"onClick={()=>window.dispatchEvent(new CustomEvent("tim
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
  const sujets=["Question générale","Problème technique","Facturation / abonnement","C
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
}) });
      if(res.ok){
        setEnvoye(true);
      }else{
        // Fallback: mailto si l'API n'existe pas encore
        const mailto=`mailto:support@timat.app?subject=${encodeURIComponent((isPro?"[P
        window.open(mailto);
 :"var(-
'avez p
en moin
at:page
alcul d
RO] ":"

       setEnvoye(true);
    }
  }catch(e){
    // Fallback mailto
    const mailto=`mailto:support@timat.app?subject=${encodeURIComponent((isPro?"[PRO
    window.open(mailto);
    setEnvoye(true);
}
  setSending(false);
};
return <div className="fi">
<PageHeadericon=" "title="SupportTiMat"sub={isPro?"Supportprioritaire—répo {isPro&&<div style={{background:"linear-gradient(135deg,#FFF8F3,#FFF0E6)",border:"
       Vous bénéficiez du support prioritaire Pro — traitement en priorité
  </div>}
{envoye?<div style={{textAlign:"center",padding:40}}> <divstyle={{fontSize:60,marginBottom:16}}> </div>
<div className="pf"style={{fontSize:22,fontWeight:600,color:"var(--S)",marginBot <div style={{fontSize:13,color:"var(--m)",lineHeight:1.7}}>Nous vous répondrons <button className="btn bG"style={{marginTop:20}}onClick={()=>{setEnvoye(false);s
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
          placeholder="Décrivez votre problème ou question le plus précisément possi
          style={{width:"100%",minHeight:120,resize:"vertical"}}/>
      </div>
      {erreur&&<div style={{color:"var(--R)",fontSize:12,marginBottom:12,padding:"8p
      <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:16,padding
<spanstyle={{fontSize:18}}> </span>
        <div style={{fontSize:12,color:"var(--B)"}}>Réponse envoyée à <strong>{user?
      </div>
<button className="btn bT"style={{width:"100%"}}onClick={envoyer}disabled={sen {sending?" Envoi en cours...":" Envoyer mon message"}
      </button>
    </div>
<div style={{marginTop:14,display:"flex",gap:10,flexWrap:"wrap",justifyContent:" {[[" ","support@timat.app"],[" ",isPro?"Réponse<12h":"Réponse<24h"],["
        <div key={t}style={{background:"var(--w)",border:"1px solid var(--br)",borde
] ":"")
nse so 1.5px s
tom:8}}
par ema
etMsg("
ble..."
x 12px"
:"10px
.email|
ding}>
center"
 ","Cen
rRadius
 u
t

             <span>{ic}</span><span>{t}</span>
          </div>)}
      </div>
    </div>}
</div>; }
function BottomNav({groups,page,setPage,pmiNonLus}){
  const activeGroup=findGroup(groups,page);
  return <nav className="bottom-nav" role="navigation" aria-label="Navigation principa
    {Object.entries(groups).map(([key,g])=>{
      const isActive=activeGroup===key;
      const hasBadge=key==="admin"&&pmiNonLus>0;
      return <button key={key} className={"bnav-btn"+(isActive?" active":"")} onClick=
        if(g.subs){setPage(g.subs[0].id);}else{setPage(key);}
      }}>
        <span className="bnav-ic" style={{position:"relative",display:"inline-block"}}
          {g.ic}
          {hasBadge&&<span style={{position:"absolute",top:-4,right:-6,background:"var
        </span>
        <span className="bnav-lbl">{g.l}</span>
      </button>;
})} </nav>;
}
const GROUPS_AM={
accueil:{l:"Accueil",ic:" ",color:"var(--T)",subs:null}, enfant:{l:"L'enfant",ic:" ",color:"#B8622F",subs:[
{id:"dashboard",l:"Tableaudebord",ic:" "}, {id:"pointage",l:"Pointage",ic:" "}, {id:"journal_complet",l:"Journal",ic:" "}, {id:"sante_complet",l:"Santé",ic:" "}, {id:"fiche_urgence",l:"Fiched'urgence",ic:" "}, {id:"eveil_complet",l:"Éveil&Progrès",ic:" "},
]},
admin:{l:"Administratif",ic:" ",color:"#B8892A",subs:[
{id:"calendrier",l:"Calendrier",ic:" "}, {id:"messagerie",l:"Messagerie",ic:" "}, {id:"admin_finances",l:"Facturation&Bilans",ic:" "}, {id:"documents_complet",l:"Documents&Attestations",ic:" "}, {id:"bilans_exports",l:"Bilans&Exports",ic:" "},
]},
outils:{l:"OutilsPro",ic:" ",color:"#FF9F63",subs:[
{id:"projet_accueil",l:"Projetd'accueil",ic:" "}, {id:"pmi",l:"PMI",ic:" "},
                 le">
{()=>{
> (--R)",

  {id:"faq",l:"Centred'aide",ic:" "},
{id:"support",l:"Support",ic:" "}, ]},
};
const GROUPS_P={
accueil:{l:"Accueil",ic:" ",color:"var(--T)",subs:null}, enfant:{l:"Monenfant",ic:" ",color:"#B8622F",subs:[
{id:"dashboard",l:"Tableaudebord",ic:" "}, {id:"pointage",l:"Pointage",ic:" "}, {id:"journal_complet",l:"Journal",ic:" "}, {id:"sante_complet",l:"Santé",ic:" "}, {id:"fiche_urgence",l:"Fiched'urgence",ic:" "}, {id:"projet_accueil",l:"Projetd'accueil",ic:" "}, {id:"eveil_complet",l:"Éveil&Progrès",ic:" "},
]},
admin:{l:"Administratif",ic:" ",color:"#B8892A",subs:[
{id:"calendrier",l:"Calendrier",ic:" "}, {id:"messagerie",l:"Messagerie",ic:" "}, {id:"kit_cmg",l:"AideCMG",ic:" "}, {id:"simulateur",l:"Simulateurcoût",ic:" "}, {id:"admin_finances",l:"Facturation&Bilans",ic:" "}, {id:"documents_complet",l:"Documents&Attestations",ic:" "}, {id:"faq",l:"Centred'aide",ic:" "},
]}, };
// Trouver à quel groupe appartient une page
const findGroup=(groups,pageId)=>{
  for(const[gKey,g]of Object.entries(groups)){
    if(gKey===pageId)return gKey;
    if(g.subs&&g.subs.find(s=>s.id===pageId))return gKey;
}
  return "accueil";
};
function TopBar({role,groups,page,setPage,user,onLogout,pmiNonLus,dark,setDark,notifNo
  const activeGroup=findGroup(groups,page);
  const group=groups[activeGroup];
  const subs=group?.subs||null;
  const onGroupClick=(key)=>{
    const g=groups[key];
    if(!g.subs){setPage(key);return;}
    if(activeGroup===key)return;
    setPage(g.subs[0].id);
};
                  nLus,no

 return <>
  <div className="topbar">
    <div style={{display:"flex",alignItems:"center",gap:8}}>
      <div style={{display:"flex",alignItems:"center",gap:6}}>
        <div className="logo">TiMat</div>
        <div className="logo-dot"/>
        <span style={{fontSize:10,color:"var(--l)",fontFamily:"'DM Mono',monospace",
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
          <div style={{padding:"12px 16px",borderBottom:"1px solid var(--br)",fontWe
               Notifications
          </div>
          {notifs.filter(n=>!n.roles||n.roles.includes(role)).map(n=><div key={n.id}
            setNotifs&&setNotifs(p=>p.map(x=>x.id===n.id?{...x,lu:true}:x));
            setPage2&&setPage2(n.page);
            setShowNotifs&&setShowNotifs(false);
          }}style={{
            padding:"10px 16px",borderBottom:"1px solid var(--br)",cursor:"pointer",
            background:n.lu?"transparent":"var(--Tp)",
            transition:"background .15s",display:"flex",gap:10,alignItems:"flex-star
          }}
            onMouseEnter={e=>e.currentTarget.style.background="var(--c)"}
            onMouseLeave={e=>e.currentTarget.style.background=n.lu?"transparent":"va
            <span style={{fontSize:16,flexShrink:0}}>{n.ic}</span>
            <div style={{flex:1}}>
              <div style={{fontSize:12,color:"var(--b)",fontWeight:n.lu?400:700,line
              <div style={{fontSize:10,color:"var(--l)",marginTop:2}}>Aujourd'hui</d
            </div>
            {!n.lu&&<div style={{width:7,height:7,borderRadius:"50%",background:"var
  letterS
ight:70
onClick
t"
r(--Tp)
Height: iv>
(--T)",

 </div>)}
        {notifs.length===0&&<div style={{padding:16,fontSize:13,color:"var(--l)",t
      </div>}
    </div>
    {/* Toggle mode sombre */}
    <button onClick={()=>setDark&&setDark(d=>!d)}style={{
background:"none",border:"none",cursor:"pointer",fontSize:16,padding:4 }}title={dark?"Modeclair":"Modesombre"}>{dark?" ":" "}</button>
{/* Paramètres */}
<button onClick={()=>setPage2&&setPage2("parametres")}style={{background:"none {user?.email===ADMIN_EMAIL&&<button onClick={()=>setPage2&&setPage2("backoffic <Av t={ini(user.prenom,user.nom)}c={user.couleur}s={30}/>
    <span style={{fontWeight:600,fontSize:13,color:"var(--b)"}}>{user.prenom}</spa
    <button onClick={onLogout}style={{background:"none",border:"none",cursor:"poin
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
      background:isActive?"linear-gradient(135deg,var(--T),var(--S))":"rgba(155,10
      color:isActive?"#fff":"var(--m)",
      boxShadow:isActive?"0 4px 16px rgba(155,107,170,.3)":"none",
      transform:isActive?"scale(1.03)":"scale(1)",
      letterSpacing:".1px",position:"relative",
    }}>
      <span style={{fontSize:17,lineHeight:1}}>{g.ic}</span>
      <span>{g.l}</span>
      {g.subs&&<span style={{fontSize:9,opacity:.5,marginLeft:2,transform:isActive
      {hasAdminBadge&&<span style={{
        position:"absolute",top:4,right:4,
        background:"var(--R)",color:"#fff",
        borderRadius:"50%",width:16,height:16,
        fontSize:9,fontWeight:700,
        display:"flex",alignItems:"center",justifyContent:"center",
  extAlig
",borde
e")}sty
n> ter",fo
7,170,.
?"rotat

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
})} </div>}
</>; }
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
    const obs=new IntersectionObserver(([e])=>{if(e.isIntersecting)setVisible(true);},
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
id:"journal",label:"Journalquotidien",icon:" ",color:"#2A9D8F", preview:()=>{
const[mood,setMood]=useState(" ");
const [liked,setLiked]=useState(false);
return(
<div style={{padding:20,fontFamily:"system-ui"}}>
  <div style={{fontSize:13,fontWeight:700,color:"#264653",marginBottom:12}}> J
{thresh
ournal

       <div style={{background:"#F0FAF4",borderRadius:10,padding:12,marginBottom:8,bo
        <div style={{fontSize:10,color:"#2A9D8F",fontWeight:700,marginBottom:3}}>
        <div style={{fontSize:12,color:"#264653",lineHeight:1.6}}>Léo a découvert la
        <div style={{display:"flex",justifyContent:"flex-end",marginTop:6}}>
          <button onClick={()=>setLiked(!liked)}style={{background:"none",border:"no
        </div>
      </div>
      <div style={{background:"#FFF8F3",borderRadius:10,padding:12,borderLeft:"3px s
        <div style={{fontSize:10,color:"#FF9F63",fontWeight:700,marginBottom:3}}>
<div style={{fontSize:12,color:"#264653"}}> Purée de légumes · Bon appé </div>
<div style={{marginTop:12,display:"flex",gap:6,alignItems:"center"}}>
<span style={{fontSize:10,color:"#8FA3AD"}}>Humeur :</span>
{[" "," "," "," "].map(m=><buttonkey={m}onClick={()=>setMood(m)}style=
          fontSize:18,background:mood===m?"#F0FAF4":"transparent",border:mood===m?"1
          borderRadius:8,padding:"2px 6px",cursor:"pointer",transition:"all .15s"
        }}>{m}</button>)}
      </div>
    </div>);
}, },
{
id:"facturation",label:"Salaireautomatique",icon:" ",color:"#FF9F63", preview:()=>{
    const [mois,setMois]=useState("Mars");
    const data={Mars:{h:160,supp:8,ent:20},Fev:{h:152,supp:4,ent:19},Jan:{h:168,supp
    const m=data[mois]||data.Mars;
    const brut=(m.h*4.05+m.supp*5.06+m.ent*3.80);
    return(
    <div style={{padding:20,fontFamily:"system-ui"}}>
<div style={{fontSize:13,fontWeight:700,color:"#264653",marginBottom:12}}> S <div style={{display:"flex",gap:4,marginBottom:12}}>
        {["Jan","Fev","Mars"].map(mo=><button key={mo}onClick={()=>setMois(mo)}style
          padding:"5px 12px",borderRadius:8,border:"none",cursor:"pointer",fontSize:
          background:mois===mo?"#FF9F63":"#F4F7FA",color:mois===mo?"#fff":"#264653",
        }}>{mo} 2024</button>)}
      </div>
      {[["Heures réalisées",m.h+"h × 4,05€",(m.h*4.05).toFixed(2)+"€"],["Indemnité e
        <div key={l}style={{display:"flex",justifyContent:"space-between",padding:"7
          <div><div style={{fontWeight:600,color:"#264653"}}>{l}</div><div style={{f
          <div style={{fontWeight:700,color:"#2A9D8F"}}>{v}</div>
        </div>
      ))}
      <div style={{marginTop:10,padding:"10px 12px",background:"#FFF8F3",borderRadiu
        <span style={{fontSize:13,fontWeight:700,color:"#264653"}}>Total brut</span>
        <span style={{fontSize:20,fontWeight:700,color:"#FF9F63"}}>{brut.toFixed(2)}
      </div>
       rderLef Mari
 peintu
ne",cur
olid #F
Repas<
 tit ·
{{
.5px so
:12,ent
alaire
={{
11,font
transit
ntretie
px 0",b
ontSize
s:10,di
 €</spa
     e
/

 </div>); },
}, {
 id:"calendrier",label:"Calendrierpartagé",icon:" ",color:"#264653", preview:()=>{
  const [selDay,setSelDay]=useState(15);
  return(
  <div style={{padding:20,fontFamily:"system-ui"}}>
<div style={{fontSize:13,fontWeight:700,color:"#264653",marginBottom:12}}> M <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBo {["L","M","Me","J","V","S","D"].map(j=><div key={j}style={{textAlign:"center
      {Array.from({length:31},(_,i)=>i+1).map(d=>{
        const isWork=d%7!==0&&d%7!==6;
        return <div key={d}onClick={()=>setSelDay(d)}style={{
          textAlign:"center",fontSize:11,padding:"6px 0",borderRadius:8,cursor:"po
          background:selDay===d?"#264653":isWork?"#F0FAF4":"transparent",
          color:selDay===d?"#fff":isWork?"#264653":"#B0BEC5",
          border:d===15?"2px solid #FF9F63":"2px solid transparent",transition:"al
        }}>{d}</div>;
      })}
    </div>
    {selDay&&<div style={{background:"#F4F7FA",borderRadius:10,padding:10,fontSize
<div style={{fontWeight:700,marginBottom:4}}> {selDay} mars</div>
   </div>); },
}, {
<div> Léo : 07h30 — 17h30 {selDay%7!==0&&selDay%7!==6?"   ":"
Repos"}</di
    {selDay%3===0&&<div>
</div>}
Emma : 08h00 — 16h30
</div>}
 id:"parent",label:"Espaceparent",icon:" ",color:"#E76F51", preview:()=>{
  const [valide,setValide]=useState(false);
  return(
  <div style={{padding:20,fontFamily:"system-ui"}}>
<div style={{fontSize:13,fontWeight:700,color:"#264653",marginBottom:12}}> S <div style={{background:"#FFF8F3",borderRadius:10,padding:12,marginBottom:8,bo
  <div style={{fontSize:10,color:"#E76F51",fontWeight:700,marginBottom:4}}>
  <div style={{display:"flex",gap:16}}>
    {[["Arrivée","07h35","#2A9D8F"],["Départ","17h20","#E76F51"],["Total","9h4
      <div key={l}style={{textAlign:"center"}}><div style={{fontSize:9,color:"
))} </div>
  <button onClick={()=>setValide(!valide)}style={{
    marginTop:8,width:"100%",padding:"7px",borderRadius:8,border:"none",cursor
    background:valide?"#2A9D8F":"#F4F7FA",color:valide?"#fff":"#264653",transi
ars 20
ttom:12
",fontS
inter",
l .15s"
:11,col v>
ophie
rder:"1
Pointa
5","#26
#8FA3AD
:"point
tion:"a
   2
— g

  }}>{valide?" Pointage validé":"Valider le pointage"}</button> </div>
        <div style={{background:"#F0FAF4",borderRadius:10,padding:10,fontSize:12,color
             Léo a peint un tableau et l'a offert à sa maman !
        </div>
      </div>);
}, },
];
//
function LandingPage({onLogin,dark,setDark,config=DEFAULT_CONFIG}) {
  const [activeDemo, setActiveDemo] = useState("accueil");
  const [showModal, setShowModal] = useState(false);
  const [showLegal, setShowLegal] = useState(null); // null, "mentions", "cgu", "confi
  const [showBlog, setShowBlog] = useState(null); // null or article id
  const [showBoutique, setShowBoutique] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [role, setRole] = useState("asmat");
  const [modeAuth, setModeAuth] = useState("inscription");
  const [form, setForm] = useState({email:"", password:"", prenom:"", nom:""});
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [consent, setConsent] = useState({politique:false, cgu:false, newsletter:false
  const consentValide = consent.politique && consent.cgu;
  const demo = DEMO_SCREENS.find(s => s.id === activeDemo);
  const L = config.landing;
  const T = config.txts;
  const demos=[
    {id:"demo-asmat",email:"marie.dupont@mail.fr",prenom:"Marie",nom:"Dupont",role:"as
    {id:"demo-parent1",email:"sophie.martin@mail.fr",prenom:"Sophie",nom:"Martin",role
    {id:"demo-parent2",email:"thomas.bernard@mail.fr",prenom:"Thomas",nom:"Bernard",ro
];
  useEffect(()=>{
    const id = 'timat-fonts';
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id; link.rel = 'stylesheet';
    link.href = config.landing.googleFontsUrl || 'https://fonts.googleapis.com/css2?fa
    document.head.appendChild(link);
}, []);
  const connexion = async () => {
    if (!form.email || !form.password) { setErr("Email et mot de passe requis."); retu
  :"#2646
dential
});
mat",co
:"paren
le:"par
mily=Qu
rn; }

   setLoading(true); setErr("");
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email: form.ema
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
}); }
  } catch(e) { setErr("Erreur réseau. Vérifiez votre connexion ou utilisez un compte
  setLoading(false);
};
const inscription = async () => {
  if (!form.email || !form.password || !form.prenom) { setErr("Remplis tous les cham
  if (form.password.length < 6) { setErr("Le mot de passe doit faire au moins 6 cara
  if (!consentValide) { setErr("Accepte la politique de confidentialité et les CGU p
  setLoading(true); setErr("");
  try {
    const { data, error } = await supabase.auth.signUp({
      email: form.email, password: form.password,
      options: { data: { prenom: form.prenom, nom: form.nom, role } }
    });
    if (error) {
      if(error.message?.includes('already registered')) setErr("Cet email est déjà u
      else if(error.message?.includes('fetch')) setErr("Erreur réseau. Vérifiez votr
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
il, pas
démo."
ps obli
ctères.
our con
tilisé.
e conne

           },{onConflict:'id'});
        }catch(e){console.log('Profile upsert:', e);}
},500);
      onLogin({ id: data.user.id, email: data.user.email, prenom: form.prenom, nom:
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
  <div style={{ fontFamily: fBody, overflowX: "hidden", background: L.pageBg||"#FDF5
    {/* Responsive CSS */}
    <style>{`
      .lp-nav-btns{display:flex;gap:8px;align-items:center}
      .lp-nav-full{display:flex;gap:8px;align-items:center}
      .lp-nav-mobile{display:none}
      .lp-hero-stats{display:flex;gap:32px;flex-wrap:wrap;justify-content:center}
      .lp-demo-grid{display:grid;grid-template-columns:200px 1fr;gap:24px;align-item
      .lp-demo-tabs{display:flex;flex-direction:column;gap:6px}
      .lp-transfo-row{display:grid;grid-template-columns:40px 1fr 1fr 1fr;gap:20px;a
      .lp-tarifs-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;align-item
      .lp-logo{font-size:26px;font-weight:700;display:flex;align-items:center;gap:8p
      .lp-logo-icon{width:32px;height:32px;border-radius:10px;display:flex;align-ite
      .lp-hero-ctas{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;marg
      .lp-hero-ctas button{white-space:nowrap}
      .lp-hero{padding:0 24px 80px;position:relative;overflow:hidden}
      .lp-section{padding:72px 24px}
      .lp-guarantees{display:flex;gap:20px;justify-content:center;flex-wrap:wrap;tex
      @media(max-width:768px){
        .lp-nav-full{display:none!important}
        .lp-nav-mobile{display:flex!important;gap:6px;align-items:center}
        .lp-hero-stats{gap:16px}
        .lp-hero-stats>div{min-width:60px}
        .lp-demo-grid{grid-template-columns:1fr!important;gap:16px}
        .lp-demo-tabs{flex-direction:row;flex-wrap:wrap;gap:4px}
        .lp-demo-tabs button{padding:8px 12px!important;font-size:12px!important;fle
        .lp-transfo-row{grid-template-columns:1fr!important;gap:8px;padding:14px!imp
        .lp-transfo-row>div:first-child{display:none}
form.no
F8" }}>
s:start
lign-it
s:start
x;lette
ms:cent
in-bott
t-align
x:0 0 a
ortant}

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
  <div style={{ position:"absolute", inset:0, zIndex:0, backgroundImage:L.heroIm
  <div style={{ position: "absolute", inset: 0, backgroundImage: "url(\"data:ima
  <div style={{ position: "absolute", top: -120, right: -120, width: 500, height
  <div style={{ position: "absolute", bottom: -80, left: -80, width: 400, height
  {/* Nav */}
  <div style={{ position: "relative", zIndex: 1, display: "flex", justifyContent
    <div className="lp-logo" style={{ fontFamily: fTitle }}>
      {L.logoUrl
        ?<img src={L.logoUrl} alt="TiMat" style={{height:32,borderRadius:8,objec
        :<div className="lp-logo-icon" style={{ background: "rgba(255,255,255,.1
      <span style={{ color: "#fff" }}>TiMat</span>
    </div>
    {/* Desktop nav */}
    <div className="lp-nav-full">
      <button onClick={() => document.getElementById("demo")?.scrollIntoView({ b
      <button onClick={() => document.getElementById("tarifs")?.scrollIntoView({
      <button onClick={() => setShowBoutique(true)} style={{ background: L.navBo
      <button onClick={() => setShowModal(true)} style={{ background: L.navConne
      <button onClick={() => { setShowModal(true); setRole("asmat"); }} style={{
    </div>
    {/* Mobile nav - hamburger + CTA */}
    <div className="lp-nav-mobile">
      <button onClick={() => setMenuOpen(!menuOpen)} style={{ background: L.navH
      <button onClick={() => { setShowModal(true); setRole("asmat"); }} style={{
    </div>
  </div>
  {/* Dropdown menu (mobile) */}
g?"url(
ge/svg+
: 500,
: 400,
: "spac
tFit:"c
5)" }}>
ehavior
 behavi
utiqueB
xionBg|
 backgr
amburge
 backgr

   {menuOpen&&<div style={{ position: "relative", zIndex: 10, maxWidth: 1000, mar
    <div style={{ background: "rgba(0,0,0,.4)", backdropFilter: "blur(20px)", bo
      {[["Fonctionnalités","demo"],["Tarifs","tarifs"],["Blog","blog-section"],[
        <button key={target} onClick={()=>{setMenuOpen(false);if(target==="bouti
          style={{ background: "transparent", color: "#fff", border: "none", pad
          onMouseEnter={e=>e.target.style.background="rgba(255,255,255,.15)"} on
)} </div>
  </div>}
  {/* Hero stats */}
  <div className="lp-hero-stats" style={{ position: "relative", zIndex: 1, maxWi
    {statsHero.map(({ n, suf, label }) => (
      <div key={label} style={{ textAlign: "center" }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: L.heroStatsColor||ac
        <div style={{ fontSize: 11, color: L.heroStatsLabelColor||"rgba(255,255,
      </div>
))} </div>
  {/* Hero content */}
  <div style={{ position: "relative", zIndex: 1, maxWidth: 760, margin: "0 auto"
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, backgrou
    <div style={{ fontFamily: fTitle, fontSize: "clamp(30px,5.5vw,58px)", fontWe
      {T.heroTitle}<br/>
      {T.heroTitleAccent&&<><span style={{ color: accent, fontStyle: "italic" }}
      <span style={{ fontSize: "clamp(20px,3.5vw,36px)", fontWeight: 400, color:
    </div>
    <div style={{ fontSize: "clamp(14px,2vw,17px)", color: L.heroSubDescColor||"
    <div className="lp-hero-ctas">
      <button onClick={() => { setShowModal(true); setRole("asmat"); }} style={{
      <button onClick={() => document.getElementById("demo")?.scrollIntoView({ b
    </div>
    <div style={{ display: "flex", gap: 20, justifyContent: "center", flexWrap:
      {(T.heroTags||"").split(",").map(t => <span key={t} style={{ fontSize: 11,
    </div>
  </div>
</div>
{/* SECTION 1 - PROBLEME */}
<div className="lp-section" style={{ background: L.section1Bg||"linear-gradient(
  <div style={{ maxWidth: 900, margin: "0 auto" }}>
    <FadeIn>
      <div style={{ textAlign: L.s1Align||"center", marginBottom: 48 }}>
        <div style={{ fontFamily: fTitle, fontSize: "clamp(22px,4vw,36px)", colo
        <div style={{ fontSize: 15, color: L.s1DescColor||"rgba(255,255,255,.5)"
      </div>
    </FadeIn>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax
gin: "0
rderRad
"Boutiq
que")se
ding: "
MouseLe
dth: 10
cent, f
255,.45
, textA
nd: L.h
ight: 7
>{T.her
 L.hero
rgba(25
 backgr
ehavior
"wrap"
 color:
135deg,
r: L.s1
, lineH
(260px,

       {painPoints.map((item, i) => (
        <FadeIn key={item.titre} delay={i * 80}>
          <div style={{ background: L.s1CardBg||"rgba(255,255,255,.04)", border:
            <div style={{ fontSize: 28, marginBottom: 10 }}>{item.ic}</div>
            <div style={{ fontWeight: 700, fontSize: 14, color: L.s1CardTitleCol
            <div style={{ fontSize: 12, color: L.s1CardDescColor||"rgba(255,255,
          </div>
        </FadeIn>
))} </div>
    <FadeIn delay={400}>
      <div style={{ marginTop: 40, textAlign: L.s1Align||"center", padding: "28p
        <div style={{ fontFamily: fTitle, fontSize: "clamp(18px,3vw,28px)", colo
      </div>
    </FadeIn>
  </div>
</div>
{/* SECTION 2 - DEMO */}
<div id="demo" className="lp-section" style={{ background: L.section2Bg||"#FDF5F
  <div style={{ maxWidth: 1000, margin: "0 auto" }}>
    <FadeIn>
      <div style={{ textAlign: L.s2Align||"center", marginBottom: 48 }}>
        <div style={{ fontFamily: fTitle, fontSize: "clamp(22px,4vw,36px)", colo
        <div style={{ fontSize: 15, color: L.s2DescColor||"#6B4F3A", lineHeight:
      </div>
    </FadeIn>
    <div style={{ display: "flex", gap: 32, justifyContent: "center", alignItems
      {/* Tabs gauche */}
      <div className="lp-demo-tabs" style={{ paddingTop: 16 }}>
{[
{id:"accueil",ic:" ",l:"Accueil"}, {id:"journal",ic:" ",l:"Journal"}, {id:"pointage",ic:" ",l:"Pointage"}, {id:"messagerie",ic:" ",l:"Messagerie"}, {id:"salaire",ic:" ",l:"Salaire"},
        ].map(t=><button key={t.id} onClick={()=>setActiveDemo(t.id)} style={{
          display:"flex",alignItems:"center",gap:8,padding:"10px 16px",borderRad
          cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:activeDem
          background:activeDemo===t.id?"linear-gradient(135deg,#C4714A,#D4824A)"
          color:activeDemo===t.id?"#fff":"#6B4F3A",transition:"all .18s",textAli
          boxShadow:activeDemo===t.id?"0 4px 14px rgba(196,113,74,.3)":"none",
        }}>
          <span style={{fontSize:18}}>{t.ic}</span>{t.l}
        </button>)}
      </div>
     "1px s
or||"#f
255,.5)
x 32px"
r: L.s1
B" }}>
r: L.s2 1.7 }}
: "flex
ius:12,
o===t.i
:"rgba(
gn:"lef

 {/* Phone frame */}
<div style={{ width: 300, flexShrink: 0, background: "#1a1a2e", borderRadi
  {/* Notch */}
  <div style={{ display: "flex", justifyContent: "center", marginBottom: 8
    <div style={{ width: 100, height: 22, background: "#1a1a2e", borderRad
      <div style={{ width: 7, height: 7, borderRadius: "50%", background:
      <div style={{ width: 44, height: 4, borderRadius: 2, background: "#2
    </div>
  </div>
  {/* Screen */}
  <div style={{ background: "#FDFBF8", borderRadius: 28, overflow: "hidden
    {/* TopBar */}
    <div style={{ background: "rgba(255,255,255,.96)", borderBottom: "1px
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontFamily: "Georgia,serif", fontSize: 16, fontWeig
        <div style={{ width: 4, height: 4, borderRadius: "50%", background
        <span style={{ fontSize: 8, color: "#aaa", letterSpacing: 1 }}>v3<
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
<spanstyle={{fontSize:13}}> </span> <spanstyle={{fontSize:13}}> </span>
<div style={{ width: 24, height: 24, borderRadius: "50%", backgrou
      </div>
    </div>
    {/* Content */}
    <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
      {/* ACCUEIL */}
      {activeDemo==="accueil"&&<div style={{padding:10}}>
        <div style={{fontSize:13,fontWeight:700,color:"#264653",marginBott
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5,ma
          {[
            {v:D.enfants.length,l:"Enfants",c:"#C4714A"},
            {v:D.messages.filter(m=>!m.lu).length,l:"Messages",c:"#9B6BAA"
            {v:"152h",l:"Ce mois",c:"#264653"},
            {v:"98%",l:"Présence",c:"#2A9D8F"},
          ].map(k=><div key={k.l}style={{background:"#fff",borderRadius:10
            <div style={{fontSize:15,fontWeight:700,color:k.c}}>{k.v}</div
            <div style={{fontSize:9,color:"#9B6BAA",marginTop:1}}>{k.l}</d
          </div>)}
        </div>
        <div style={{fontSize:10,fontWeight:700,color:"#264653",marginBott
        {D.enfants.map(e=>{
          const pt=D.pointages.find(p=>p.eId===e.id&&p.date===TODAY_STR);
          return <div key={e.id}style={{background:"#fff",borderRadius:10,
  <span style={{fontSize:20}}>{e.emoji}</span>
us: 40,
 }}>
ius: "0
"#2a2a4
a2a4e"
", heig
solid r
ht: 700
: "#9B6
/span>
nd: "li
om:8}}>
rginBot
},
,paddin >
iv>
om:6}}>
padding

       <div style={{flex:1}}>
        <div style={{fontSize:11,fontWeight:700,color:"#264653"}}>{e
        <div style={{fontSize:9,color:"#9B6BAA"}}>{pt?.arr?`Arrivé à
</div>
      <div style={{fontSize:8,padding:"2px 7px",borderRadius:6,backg
    </div>;
  })}
  <div style={{background:"#FFF8F3",borderRadius:10,padding:8,margin
    <div style={{fontSize:9,fontWeight:700,color:"#C4714A",marginBot
    <div style={{fontSize:9,color:"#264653",lineHeight:1.9}}>
      Transmettre le journal de {D.enfants[0].prenom}<br/>
      Déclarer Pajemploi (J-3)<br/>
      Renouveler l'ordonnance d'Emma
    </div>
  </div>
</div>}
{/* JOURNAL */}
{activeDemo==="journal"&&<div style={{padding:10}}>
<div style={{display:"flex",justifyContent:"space-between",alignIt <div style={{fontSize:12,fontWeight:700,color:"#264653"}}> Jou <div style={{display:"flex",gap:4}}>
      {D.enfants.map(e=><div key={e.id}style={{width:24,height:24,bo
    </div>
  </div>
  {D.transmissions.filter(t=>t.eId==="e1").map(t=><div key={t.id}sty
    background:t.auteur==="asmat"?"#F8F3FF":"#FFF8F3",
    borderRadius:10,padding:8,marginBottom:5,
    borderLeft:`3px solid ${t.auteur==="asmat"?"#9B6BAA":"#C4714A"}`
  }}>
    <div style={{fontSize:8,color:t.auteur==="asmat"?"#9B6BAA":"#C47
    <div style={{fontSize:10,color:"#264653",lineHeight:1.5}}>{t.txt
    <div style={{fontSize:14,marginTop:3}}>{t.mood}</div>
  </div>)}
  <div style={{display:"flex",gap:4,marginBottom:6}}>
{[" "," "," "," "," "," "].map(m=><div key={m}style={{pad </div>
  <div style={{display:"flex",gap:5}}>
    <input readOnly placeholder="Écrire une observation..." style={{
    <div style={{background:"linear-gradient(135deg,#9B6BAA,#B87CC8)
  </div>
</div>}
{/* POINTAGE */}
{activeDemo==="pointage"&&<div style={{padding:10}}>
  <div style={{fontSize:12,fontWeight:700,color:"#264653",marginBott
  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:
       .prenom
 ${pt.a
round:p
Top:6,b
tom:3}}
ems:"ce
rnal</
rderRad
le={{
14A",fo
}</div>
ding:"
flex:1,
",color
om:8}}>
5,margi
d
3

     {[{l:"Prévues",v:"174h",c:"#264653"},{l:"Réalisées",v:"152h30",c
      <div key={k.l}style={{background:"#fff",borderRadius:10,paddin
        <div style={{fontSize:11,fontWeight:700,color:k.c}}>{k.v}</d
        <div style={{fontSize:8,color:"#9B6BAA"}}>{k.l}</div>
      </div>
)} </div>
  <div style={{fontSize:10,fontWeight:700,color:"#264653",marginBott
  {D.pointages.filter(p=>p.date===TODAY_STR).map(p=>{
    const e=D.enfants.find(e=>e.id===p.eId);
    return <div key={p.id}style={{background:"#fff",borderRadius:10,
      <span style={{fontSize:16}}>{e?.emoji}</span>
      <div style={{flex:1}}>
        <div style={{fontSize:10,fontWeight:700,color:"#264653"}}>{e
<div style={{fontSize:9,color:"#9B6BAA"}}>↗ {p.arr} {p.dep?` </div>
      <div style={{fontSize:10,fontWeight:700,color:p.tot?"#C4714A":
    </div>;
  })}
  <div style={{background:"linear-gradient(135deg,#C4714A,#D4824A)",
<span style={{color:"#fff",fontSize:10,fontWeight:700}}> Scann </div>
</div>}
{/* MESSAGERIE */}
{activeDemo==="messagerie"&&<div style={{padding:10,display:"flex",f
  <div style={{fontSize:12,fontWeight:700,color:"#264653",marginBott
  <div style={{display:"flex",gap:5,marginBottom:8}}>
    {D.enfants.map(e=>{
      const unread=D.messages.filter(m=>m.eId===e.id&&!m.lu).length;
      return <div key={e.id}style={{display:"flex",alignItems:"cente
        <span style={{fontSize:13}}>{e.emoji}</span>
        <span style={{fontSize:9,fontWeight:600,color:e.id==="e1"?"#
        {unread>0&&<div style={{position:"absolute",top:-4,right:-4,
</div>; })}
  </div>
  <div style={{flex:1,display:"flex",flexDirection:"column",gap:5,ov
    {D.messages.filter(m=>m.eId==="e1").map(m=><div key={m.id}style=
      alignSelf:m.de==="parent"?"flex-start":"flex-end",
      background:m.de==="parent"?"#F4F0FB":"linear-gradient(135deg,#
      borderRadius:m.de==="parent"?"12px 12px 12px 4px":"12px 12px 4
      padding:"7px 10px",maxWidth:"78%"
    }}>
      <div style={{fontSize:9,color:m.de==="parent"?"#264653":"#fff"
      <div style={{fontSize:7,color:m.de==="parent"?"#9B6BAA":"rgba(
</div>)}
 :"#C471
g:"7px
iv>
om:5}}>
padding
?.preno → ↘ ${p
"#ccc"}
borderR er QR
lexDire
om:6}}>
r",gap:
fff":"#
width:1
erflowY {{
C4714A,
px 12px
,lineHe
255,255
C

     </div>
    <div style={{display:"flex",gap:5,marginTop:8}}>
      <input readOnly placeholder="Votre message..." style={{flex:1,pa
      <div style={{background:"linear-gradient(135deg,#9B6BAA,#B87CC8)
    </div>
</div>}
  {/* SALAIRE */}
  {activeDemo==="salaire"&&<div style={{padding:10}}>
    <div style={{fontSize:12,fontWeight:700,color:"#264653",marginBott
    <div style={{display:"flex",gap:4,marginBottom:10}}>
      {["Janv.","Fév.","Mars"].map((m,i)=><div key={m}style={{padding:
    </div>
    {[
      {l:"Salaire de base",d:"160h × 4,05€",v:"648,00 €"},
      {l:"Ind. entretien",d:"20j × 3,80€",v:"76,00 €"},
      {l:"Heures majorées",d:"8h × 5,06€",v:"40,50 €"},
    ].map(r=><div key={r.l}style={{display:"flex",justifyContent:"spac
      <div><div style={{fontWeight:600,color:"#264653"}}>{r.l}</div><d
      <div style={{fontWeight:700,color:"#C4714A"}}>{r.v}</div>
    </div>)}
    <div style={{marginTop:8,padding:10,background:"linear-gradient(13
      <span style={{fontSize:11,fontWeight:700,color:"#264653"}}>Total
      <span style={{fontSize:17,fontWeight:700,color:"#C4714A"}}>764,5
    </div>
    <div style={{display:"flex",gap:5,marginTop:8}}>
      <div style={{flex:1,background:"linear-gradient(135deg,#264653,#
<span style={{color:"#fff",fontSize:9,fontWeight:700}}> Bull </div>
<div style={{flex:1,background:"linear-gradient(135deg,#C4714A,# <span style={{color:"#fff",fontSize:9,fontWeight:700}}> Paje
      </div>
    </div>
  </div>}
</div>
{/* Bottom Nav dans le téléphone */}
<div style={{ display: "flex", justifyContent: "space-around", padding
{[{id:"accueil",ic:" ",l:"Accueil"},{id:"journal",ic:" ",l:"Journa <div key={t.id} onClick={()=>setActiveDemo(t.id)} style={{ textAli
      <div style={{fontSize:17}}>{t.ic}</div>
      <div style={{fontSize:7,fontWeight:activeDemo===t.id?700:400,col
    </div>
)} </div>
    </div>
dding:"
",borde
om:8}}>
"3px 9p
e-betwe
iv styl
5deg,rg
 brut</
0 €</sp
2A6F6A)
etin P
D4824A)
mploi<
: "4px l"},{i
gn:"cen
or:acti
D
/
d

         {/* Home indicator */}
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 8 }
          <div style={{ width: 90, height: 4, background: "rgba(255,255,255,.25)
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
        <div style={{ fontFamily: fTitle, fontSize: "clamp(22px,4vw,36px)", colo
      </div>
    </FadeIn>
    <div style={{ display: "grid", gap: 3 }}>
      {transformations.map(([ic, pb, sol, res], i) => (
        <FadeIn key={pb} delay={i * 60}>
          <div className="lp-transfo-row" style={{ padding: "18px 20px", borderR
            <div style={{ fontSize: 22, textAlign: "center" }}>{ic}</div>
            <div><div style={{ fontSize: 10, fontWeight: 700, color: L.s3LabelBe
            <div><div style={{ fontSize: 10, fontWeight: 700, color: L.s3LabelAf
            <div><div style={{ fontSize: 10, fontWeight: 700, color: L.s3LabelRe
          </div>
        </FadeIn>
))} </div>
  </div>
</div>
{/* SECTION 4 - CHIFFRES */}
<div className="lp-section" style={{ background: L.section4Bg||"linear-gradient(
  <div style={{ maxWidth: 900, margin: "0 auto" }}>
    <FadeIn>
      <div style={{ textAlign: L.s4Align||"center", marginBottom: 56 }}>
        <div style={{ fontFamily: fTitle, fontSize: "clamp(20px,3.5vw,32px)", co
        <div style={{ fontSize: 13, color: L.s4SubColor||"rgba(255,255,255,.4)"
      </div>
    </FadeIn>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(
      {statsSection.map(({ n, suf, label, desc }) => (
        <FadeIn key={label}>
          <div style={{ textAlign: "center", padding: "24px 16px", background: "
            <div style={{ fontFamily: fTitle, fontSize: 42, fontWeight: 700, col
            <div style={{ fontSize: 14, fontWeight: 700, color: L.s4StatLabelCol
}>
", bord
r: L.s3
adius:
foreCol
terColo
sultCol
135deg,
lor: L.
}}>{L.s
180px,1
rgba(25
or: L.s
or||"#f

             <div style={{ fontSize: 11, color: L.s4StatDescColor||"rgba(255,255,
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
      <div style={{ fontFamily: fTitle, fontSize: "clamp(20px,3.5vw,32px)", colo
        {L.s5Title}
      </div>
    </FadeIn>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(
      {testimonials.map((t, i) => (
        <FadeIn key={t.nom} delay={i * 80}>
          <div style={{ background: L.testimonialBg||"#fff", borderRadius: 16, p
            <div style={{ color: L.testimonialStarColor||accent, fontSize: 13, m
            <div style={{ fontSize: 12, color: L.testimonialBeforeColor||"#A6897
            <div style={{ fontSize: 13, color: L.testimonialAfterColor||"#2C1F14
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: L.testimonialN
              <div style={{ fontSize: 11, color: L.testimonialCityColor||"#A6897
            </div>
          </div>
        </FadeIn>
))} </div>
  </div>
</div>
{/* SECTION 6 - TARIFS */}
<div id="tarifs" className="lp-section" style={{ background: L.section6Bg||"#F5E
  <div style={{ maxWidth: 800, margin: "0 auto" }}>
    <FadeIn>
      <div style={{ fontFamily: fTitle, fontSize: "clamp(22px,4vw,36px)", color:
    </FadeIn>
    <div className="lp-tarifs-grid">
      {/* Gratuit */}
      <div style={{ background: L.freeBg||"#fff", borderRadius: 16, border: "1.5
        <div style={{ fontSize: 11, fontWeight: 700, color: L.freeLabelColor||"#
        <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBot
          <span style={{ fontFamily: fTitle, fontSize: 46, fontWeight: 700, colo
</div>
255,.4)
r: L.s5
240px,1
adding:
arginBo
0", fon
", line
ameColo
0" }}>{
BF8" }}
L.s6Ti
px soli
A68970"
tom: 4
r: L.fr

         <div style={{ fontSize: 13, color: L.freeDescColor||"#6B4F3A", marginBot
        <button onClick={() => { setShowModal(true); setRole("asmat"); }} style=
        {(config.freeItems||DEFAULT_CONFIG.freeItems).map(([ok, t], i, arr) => (
          <div key={i} style={{ display: "flex", gap: 10, alignItems: "center",
            <span style={{ color: ok ? "#3D6B50" : "#DDD5C8", fontWeight: 700 }}
            <span style={{ color: ok ? "#2C1F14" : "#A68970" }}>{t}</span>
</div> ))}
      </div>
      {/* Pro */}
      <div style={{ background: L.proBg||"#FDF5FB", borderRadius: 16, border: "2
        <div style={{ position: "absolute", top: -15, left: "50%", transform: "t
        <div style={{ fontSize: 11, fontWeight: 700, color: L.proLabelColor||"#B
        <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBot
          <span style={{ fontFamily: fTitle, fontSize: 46, fontWeight: 700, colo
          <span style={{ fontSize: 13, color: "#A68970" }}>/mois</span>
        </div>
        <div style={{ fontSize: 11, color: L.proSubColor||"#A68970", marginBotto
        <div style={{ fontSize: 13, color: L.proDescColor||"#6B4F3A", marginBott
        <button onClick={() => { setShowModal(true); setRole("asmat"); }} style=
        {(config.proItems||DEFAULT_CONFIG.proItems).map((t, i, arr) => (
<div key={i} style={{ display: "flex", gap: 10, alignItems: "center", <span style={{ color: "#3D6B50", fontWeight: 700 }}>✓</span>
<span style={{ color: "#2C1F14", fontWeight: i < 3 ? 700 : 400 }}>{t
</div> ))}
      </div>
    </div>
    <div className="lp-guarantees">
      {(config.guarantees||DEFAULT_CONFIG.guarantees).map(g=><span key={g}>{g}</
    </div>
  </div>
</div>
{/* CTA FINAL */}
<div className="lp-section" style={{ background: L.ctaBg||"linear-gradient(135de
  <FadeIn>
    <div style={{ fontFamily: fTitle, fontSize: "clamp(24px,5vw,46px)", color: L
      {(L.ctaTitle||"").split(L.ctaTitleAccent||"en comptabilité.")[0]}
      <span style={{ color: accent, fontStyle: "italic" }}>{L.ctaTitleAccent}</s
      <span style={{ fontSize: "clamp(16px,3vw,28px)", fontWeight: 400, color: L
    </div>
    <div style={{ fontSize: 16, color: L.ctaSubColor||"rgba(255,255,255,.5)", ma
    <button onClick={() => { setShowModal(true); setRole("asmat"); }} style={{ b
    <div style={{ marginTop: 16, fontSize: 12, color: L.ctaFooterColor||"rgba(25
  </FadeIn>
</div>
tom: 22
{{ widt
fontSiz
>{ok ?
.5px so
ranslat
8622F",
tom: 4
r: L.pr
m: 8 }}
om: 22,
{{ widt
fontSiz
}</span
span>)}
g,#2646
.ctaTit
pan><br
.ctaSub
rginBot
ackgrou
5,255,2

 {/* FAQ */}
<div className="lp-section" style={{ background: "#F4F7FA" }}>
  <div style={{ maxWidth: 700, margin: "0 auto" }}>
    <FadeIn>
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <div style={{ fontFamily: fTitle, fontSize: "clamp(22px,4vw,36px)", colo
        <div style={{ fontSize: 15, color: "#5F7A86" }}>Tout ce que vous devez s
      </div>
    </FadeIn>
    {[
      {q:"C'est quoi TiMat exactement ?",a:"TiMat est une application web conçue
      {q:"Est-ce que mes données sont en sécurité ?",a:"Oui. Toutes vos données
      {q:"TiMat remplace-t-il Pajemploi ?",a:"Non. TiMat est un complément à Paj
      {q:"Comment fonctionne l'essai gratuit ?",a:"Vous créez votre compte en 2
      {q:"Puis-je utiliser TiMat sur mon téléphone ?",a:"Oui. TiMat est une appl
      {q:"Les parents peuvent-ils accéder à TiMat ?",a:"Oui. Chaque parent reçoi
      {q:"Que se passe-t-il si je résilie ?",a:"Vous pouvez résilier à tout mome
      {q:"Comment sont calculés les salaires ?",a:"TiMat applique les règles de
    ].map(({q,a},i)=>(
      <FadeIn key={i} delay={i*50}>
        <details style={{ marginBottom: 8, background: "#fff", borderRadius: 12,
          <summary style={{ padding: "16px 20px", cursor: "pointer", fontSize: 1
{q}
            <span style={{ fontSize: 18, color: "#FF9F63", flexShrink: 0, margin
          </summary>
          <div style={{ padding: "0 20px 16px", fontSize: 13, color: "#5F7A86",
        </details>
      </FadeIn>
))} </div>
</div>
{/* BLOG */}
<div className="lp-section" style={{ background: "#FDFBF8" }}>
  <div style={{ maxWidth: 900, margin: "0 auto" }}>
    <FadeIn>
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <div style={{ fontFamily: fTitle, fontSize: "clamp(22px,4vw,36px)", colo
        <div style={{ fontSize: 15, color: "#5F7A86" }}>Guides pratiques, consei
      </div>
    </FadeIn>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax
{[
{id:"mensualisation",cat:"Administratif",catColor:"#FF9F63",emoji:" ",t {id:"maladies",cat:"Santé",catColor:"#E76F51",emoji:" ",title:"Les5ma {id:"agrement",cat:"PMI&Agrément",catColor:"#2A9D8F",emoji:" ",title:
  r: "#26
avoir a
 spécif
sont hé
emploi.
minutes
ication
t une i
nt en u
la Conv
 border
4, font
Left: 1
lineHei
r: "#26 ls et i
(260px,
itle:"
ladies
"Renou
 M v

  {id:"attachement",cat:"Pédagogie",catColor:"#264653",emoji:" ",title:"L {id:"pajemploi",cat:"Administratif",catColor:"#FF9F63",emoji:" ",title: {id:"bulletin",cat:"Administratif",catColor:"#FF9F63",emoji:" ",title:" {id:"trousse",cat:"Santé",catColor:"#E76F51",emoji:" ",title:"Lesindis {id:"tarif",cat:"Administratif",catColor:"#FF9F63",emoji:" ",title:"Com {id:"motricite",cat:"Pédagogie",catColor:"#264653",emoji:" ",title:"Les {id:"droits",cat:"Juridique",catColor:"#2A9D8F",emoji:" ",title:"Droits {id:"pajemploi",cat:"Administratif",catColor:"#FF9F63",emoji:" ",title: {id:"bulletin",cat:"Administratif",catColor:"#FF9F63",emoji:" ",title:" {id:"secours",cat:"Santé",catColor:"#E76F51",emoji:" ",title:"Troussed {id:"tarif",cat:"Administratif",catColor:"#FF9F63",emoji:" ",title:"Com
      ].map((art,i)=>(
        <FadeIn key={art.id} delay={i*80}>
          <div onClick={()=>setShowBlog(art.id)} style={{
            background:"#fff",borderRadius:16,overflow:"hidden",cursor:"pointer"
            border:"1px solid #E8E4E0",transition:"all .2s",boxShadow:"0 2px 12p
          }}
            onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-4px)"
            onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.
            <div style={{height:120,background:"linear-gradient(135deg,"+art.cat
            <div style={{padding:"16px 20px"}}>
              <div style={{fontSize:10,fontWeight:700,color:art.catColor,textTra
              <div style={{fontSize:15,fontWeight:700,color:"#264653",lineHeight
              <div style={{fontSize:12,color:"#5F7A86",lineHeight:1.6}}>{art.exc
              <div style={{marginTop:12,fontSize:12,color:accent,fontWeight:600}
            </div>
          </div>
        </FadeIn>
      ))}
    </div>
  </div>
</div>
{/* BLOG ARTICLE MODAL */}
{showBlog&&<div onClick={e=>e.target===e.currentTarget&&setShowBlog(null)} style
  <div style={{background:"#fff",borderRadius:20,width:"100%",maxWidth:700,maxHe
    <div style={{padding:"20px 24px",borderBottom:"1px solid #E8E4E0",display:"f
      <div style={{fontFamily:fTitle,fontSize:16,fontWeight:700,color:"#264653"}
      <button onClick={()=>setShowBlog(null)}style={{background:"#F4F7FA",border
    </div>
    <div style={{padding:"24px",overflowY:"auto",fontSize:13,color:"#264653",lin
      {showBlog==="mensualisation"&&<div>
        <h2 style={{fontSize:22,fontWeight:700,color:"#264653",marginBottom:16}}
        <div style={{fontSize:11,color:"#8FA3AD",marginBottom:20}}>Administratif
          <h3 style={{fontSize:16,fontWeight:700,color:"#264653",margin:"20px 0 10
'attac
"Pajem
Compre
pensab
ment f
étape
 et de
"Pajem
Compre
e seco
ment f
,
x rgba(
;e.curr
current
Color+"
nsform:
:1.4,ma
erpt}</
}>Lire
={{posi ight:"9 lex",ju }> B :"none"
eHeight
> Me · 8 mi
px"}}>P
  h p n l i s v p n u i
l
n

 <p>La mensualisation est obligatoire pour les assistantes maternelles de
  <h3 style={{fontSize:16,fontWeight:700,color:"#264653",margin:"20px 0 10
  <p><strong>Année complète (47 semaines et plus)</strong> — Le calcul est
  <p style={{marginTop:8}}><strong>Année incomplète (moins de 47 semaines)
<div style={{background:"#F0FAF4",borderRadius:12,padding:16,margin:"16p <div style={{fontWeight:700,color:"#2A9D8F",marginBottom:6}}> Exempl <div style={{fontSize:12}}>
      Marie accueille Léo 40h/semaine, 47 semaines/an, à 4,05€/h brut.<br/
      Salaire mensualisé = 40 × 52 / 12 × 4,05 = <strong>702 € brut/mois</
      Soit environ <strong>547,56 € net/mois</strong> (après cotisations ~
    </div>
  </div>
  <h3 style={{fontSize:16,fontWeight:700,color:"#264653",margin:"20px 0 10
  <p>En fin d'année (ou de contrat), il faut comparer les heures réellemen
  <h3 style={{fontSize:16,fontWeight:700,color:"#264653",margin:"20px 0 10
  <p>Au-delà de 45 heures par semaine, les heures sont majorées d'au moins
<div style={{background:"#FFF8F3",borderRadius:12,padding:16,margin:"16p <div style={{fontWeight:700,color:"#FF9F63",marginBottom:6}}> TiMat <div style={{fontSize:12}}>Plus besoin de faire ces calculs à la main.
  </div>
</div>}
{showBlog==="maladies"&&<div>
  <h2 style={{fontSize:22,fontWeight:700,color:"#264653",marginBottom:16}}
  <div style={{fontSize:11,color:"#8FA3AD",marginBottom:20}}>Santé · 6 min
  <p>En accueil collectif ou individuel, les enfants tombent malades. C'es
  <h3 style={{fontSize:16,fontWeight:700,color:"#E76F51",margin:"20px 0 10
  <p><strong>Quoi :</strong> infection virale des bronchioles, très couran
  <p><strong>Signes :</strong> toux, respiration sifflante, difficulté à s
  <p><strong>Conduite :</strong> nettoyer le nez (DRP), fractionner les re
  <h3 style={{fontSize:16,fontWeight:700,color:"#E76F51",margin:"20px 0 10
  <p><strong>Quoi :</strong> inflammation de l'estomac et des intestins, v
  <p><strong>Signes :</strong> vomissements, diarrhée, fièvre possible, ri
  <p><strong>Conduite :</strong> soluté de réhydratation orale (SRO), régi
  <h3 style={{fontSize:16,fontWeight:700,color:"#E76F51",margin:"20px 0 10
  <p><strong>Quoi :</strong> infection virale (coxsackie) très contagieuse
  <p><strong>Signes :</strong> petites vésicules sur les mains, les pieds
  <p><strong>Conduite :</strong> pas de traitement spécifique, guérison en
  puis la
px"}}>A
 le plu
</stron
x 0",bo e conc
>
strong>
22%).
px"}}>L
t effec
px"}}>L
 25% (o
x 0",bo
calcul
 TiMat
> Le de lec
t norma
px"}}>1
te chez
'alimen
pas, su
px"}}>2
irale d
sque de
me adap
px"}}>3
, fréqu
et dans
7-10 j
 r
e
s

   <h3 style={{fontSize:16,fontWeight:700,color:"#E76F51",margin:"20px 0 10
  <p><strong>Quoi :</strong> infection de l'oreille moyenne, souvent consé
  <p><strong>Signes :</strong> douleur à l'oreille (l'enfant se tire l'ore
  <p><strong>Conduite :</strong> consultation médicale nécessaire (possibl
  <h3 style={{fontSize:16,fontWeight:700,color:"#E76F51",margin:"20px 0 10
  <p><strong>Quoi :</strong> inflammation de la membrane qui recouvre l'oe
  <p><strong>Signes :</strong> oeil rouge, sécrétions jaune-vertes, paupiè
  <p><strong>Conduite :</strong> lavage au sérum physiologique, collyre pr
<div style={{background:"#F4F7FA",borderRadius:12,padding:16,margin:"20p <div style={{fontWeight:700,color:"#264653",marginBottom:8}}> À rete <ul style={{paddingLeft:20,fontSize:12,lineHeight:2}}>
      <li>Exiger systématiquement une ordonnance médicale avant d'administ
      <li>Tenir un registre des maladies et traitements dans le carnet de
      <li>Prévenir les parents dès les premiers symptômes</li>
      <li>Renforcer l'hygiène des mains (avant/après chaque change, repas,
</ul> </div>
</div>}
{showBlog==="agrement"&&<div>
  <h2 style={{fontSize:22,fontWeight:700,color:"#264653",marginBottom:16}}
  <div style={{fontSize:11,color:"#8FA3AD",marginBottom:20}}>PMI & Agrémen
  <p>Votre agrément doit être renouvelé tous les 5 ans (10 ans avec le CAP
  <h3 style={{fontSize:16,fontWeight:700,color:"#2A9D8F",margin:"20px 0 10
  <div style={{display:"grid",gridTemplateColumns:"auto 1fr",gap:"8px 12px
    <strong>6 mois avant :</strong><span>Commencer à rassembler les docume
    <strong>3 mois avant :</strong><span>Envoyer le dossier complet au Con
    <strong>2 mois avant :</strong><span>Visite de la puéricultrice PMI à
    <strong>Jour J :</strong><span>Réponse du Conseil départemental (silen
  </div>
  <h3 style={{fontSize:16,fontWeight:700,color:"#2A9D8F",margin:"20px 0 10
  <div style={{background:"#F0FAF4",borderRadius:12,padding:16,margin:"10p
    <ul style={{paddingLeft:20,fontSize:12,lineHeight:2.2}}>
      <li>Formulaire CERFA de renouvellement (disponible sur service-publi
      <li>Copie de votre pièce d'identité</li>
      <li>Justificatif de domicile de moins de 3 mois</li>
      <li>Certificat médical attestant votre aptitude à accueillir des enf
      <li>Extrait de casier judiciaire (bulletin n°2 — demandé automatique
      <li>Attestation d'assurance responsabilité civile professionnelle</l
      <li>Attestation de formation continue (120h obligatoires)</li>
      <li>Votre projet d'accueil mis à jour</li>
 px"}}>4
cutive
ille),
e antib
px"}}>5
il, sou
res col
escrit
x 0"}}>
nir</d
rer un
l'enfan
moucha
> Re t·7m
AEPE).
px"}}>
",fontS
nts</sp
seil dé
domicil
ce = ac
px"}}>
x 0"}}>
c.fr)</
ants</l
ment pa
i>
   i
n

 </ul> </div>
  <h3 style={{fontSize:16,fontWeight:700,color:"#2A9D8F",margin:"20px 0 10
  <p>La puéricultrice viendra évaluer votre domicile et votre pratique. El
  <ul style={{paddingLeft:20,fontSize:12,lineHeight:2}}>
    <li>La sécurité du logement (barrières, prises, escaliers, produits da
    <li>L'espace dédié à l'accueil (coin repos, coin repas, coin jeu)</li>
    <li>Votre organisation quotidienne et vos pratiques éducatives</li>
    <li>Votre capacité à travailler avec les parents</li>
    <li>Votre connaissance des gestes de premiers secours</li>
  </ul>
  <h3 style={{fontSize:16,fontWeight:700,color:"#2A9D8F",margin:"20px 0 10
  <div style={{background:"#FEF2F2",borderRadius:12,padding:16,margin:"10p
    <ul style={{paddingLeft:20,fontSize:12,lineHeight:2,color:"#E76F51"}}>
      <li>Envoyer le dossier en retard (moins de 3 mois avant expiration)<
      <li>Oublier la formation continue obligatoire</li>
      <li>Ne pas mettre à jour son projet d'accueil</li>
      <li>Négliger la sécurité du domicile avant la visite</li>
</ul> </div>
</div>}
{showBlog==="attachement"&&<div>
  <h2 style={{fontSize:22,fontWeight:700,color:"#264653",marginBottom:16}}
  <div style={{fontSize:11,color:"#8FA3AD",marginBottom:20}}>Pédagogie · 5
  <p>En tant qu'assistante maternelle, vous êtes une figure d'attachement
  <h3 style={{fontSize:16,fontWeight:700,color:"#264653",margin:"20px 0 10
  <p>La théorie de l'attachement, développée par John Bowlby et Mary Ainsw
  <p style={{marginTop:8}}>En accueil individuel, vous avez un avantage én
<h3 style={{fontSize:16,fontWeight:700,color:"#264653",margin:"20px 0 10 <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax( {[[" ","Disponibilité","Êtrephysiquementetémotionnellementprésent
[" ","Réactivité","Répondrerapidementetdemanièreadaptéeauxsi [" ","Prévisibilité","Desroutinesstables(repas,sieste,activité [" ","Sensibilité","Comprendrel'émotionderrièrelecomportement.
    ].map(([ic,titre,desc])=>
      <div key={titre}style={{background:"#F4F7FA",borderRadius:12,padding
        <div style={{fontSize:24,marginBottom:6}}>{ic}</div>
        <div style={{fontSize:13,fontWeight:700,color:"#264653",marginBott
        <div style={{fontSize:11,color:"#5F7A86",lineHeight:1.6}}>{desc}</
    </div>
px"}}>
le rega
ngereux
px"}}>
x 0",bo
/li>
> L' min de
seconda
px"}}>Q
orth, m
orme su
px"}}>L
200px,1
e. Pos
gnaux
s). L'
Un enf
:14}}>
om:4}}> div>
   a
e d e a

 )} </div>
  <h3 style={{fontSize:16,fontWeight:700,color:"#264653",margin:"20px 0 10
  <p>La période d'adaptation n'est pas une formalité — c'est le fondement
  <p style={{marginTop:8}}>Une bonne adaptation est progressive : d'abord
<div style={{background:"#F0FAF4",borderRadius:12,padding:16,margin:"20p <div style={{fontWeight:700,color:"#2A9D8F",marginBottom:6}}> Votre <div style={{fontSize:12}}>
      En crèche, le turnover du personnel et les ratios élevés rendent l'a
      Chez vous, l'enfant retrouve <strong>le même visage chaque matin</st
    </div>
  </div>
</div>}
{showBlog==="pajemploi"&&<div>
  <h2 style={{fontSize:22,fontWeight:700,color:"#264653",marginBottom:16}}
  <div style={{fontSize:11,color:"#8FA3AD",marginBottom:20}}>Administratif
  <p>Pajemploi est le service de l'URSSAF dédié aux particuliers employeur
  <h3 style={{fontSize:16,fontWeight:700,color:"#264653",margin:"20px 0 10
  <p>Le <strong>parent employeur</strong> crée son compte sur <em>pajemplo
  <h3 style={{fontSize:16,fontWeight:700,color:"#264653",margin:"20px 0 10
  <p>Chaque mois, le parent se connecte et remplit la déclaration :</p>
  <div style={{background:"#F0FAF4",borderRadius:12,padding:16,margin:"12p
    <ol style={{paddingLeft:20,fontSize:12,lineHeight:2.4}}>
      <li>Se connecter sur pajemploi.urssaf.fr</li>
      <li>Cliquer sur "Déclarer" et sélectionner l'assistante maternelle</
      <li>Indiquer le <strong>nombre de jours d'activité</strong></li>
      <li>Indiquer le <strong>nombre d'heures normales</strong></li>
      <li>Indiquer les <strong>heures supplémentaires/complémentaires</str
      <li>Saisir le <strong>salaire net total</strong></li>
      <li>Ajouter les <strong>indemnités d'entretien</strong> et de <stron
      <li>Valider — Pajemploi calcule automatiquement les cotisations</li>
</ol> </div>
  <h3 style={{fontSize:16,fontWeight:700,color:"#264653",margin:"20px 0 10
  <p>Après validation, Pajemploi prélève les cotisations sur le compte du
  <h3 style={{fontSize:16,fontWeight:700,color:"#264653",margin:"20px 0 10
  <div style={{background:"#FEF2F2",borderRadius:12,padding:16,margin:"12p
    <ul style={{paddingLeft:20,fontSize:12,lineHeight:2,color:"#E76F51"}}>
      <li><strong>Confondre brut et net</strong> — Pajemploi demande le ne
 px"}}>L
de la r
avec le
x 0",bo force
ttachem
rong>,
> Pa · 7 mi
s d'ass
px"}}>É
i.urssa
px"}}>É
x 0"}}>
li>
ong> év
g>repas
px"}}>É
parent
px"}}>L
x 0",bo
t, pas
 d
j

       <li><strong>Oublier les indemnités d'entretien</strong> — elles doiv
      <li><strong>Déclarer en retard</strong> — la déclaration doit être f
      <li><strong>Ne pas vérifier le bulletin</strong> — vérifiez que le m
</ul> </div>
<div style={{background:"#FFF8F3",borderRadius:12,padding:16,margin:"16p <div style={{fontWeight:700,color:"#FF9F63",marginBottom:6}}> TiMat <div style={{fontSize:12}}>TiMat génère chaque mois un récapitulatif p
  </div>
</div>}
{showBlog==="bulletin"&&<div>
  <h2 style={{fontSize:22,fontWeight:700,color:"#264653",marginBottom:16}}
  <div style={{fontSize:11,color:"#8FA3AD",marginBottom:20}}>Administratif
  <p>Le bulletin de salaire d'une assistante maternelle peut sembler compl
  <h3 style={{fontSize:16,fontWeight:700,color:"#264653",margin:"20px 0 10
  <div style={{display:"grid",gridTemplateColumns:"auto 1fr",gap:"6px 16px
    <strong>Salaire de base</strong><span>Heures mensualisées × taux horai
    <strong>Heures complémentaires</strong><span>Heures entre votre horair
    <strong>Heures majorées</strong><span>Au-delà de 45h/semaine : majorée
    <strong>Indemnité d'entretien</strong><span>Montant par jour d'accueil
    <strong>Indemnité de repas</strong><span>Si vous fournissez les repas.
</div>
  <h3 style={{fontSize:16,fontWeight:700,color:"#264653",margin:"20px 0 10
  <p>Les cotisations sont calculées sur le salaire brut (hors indemnités).
  <div style={{background:"#F4F7FA",borderRadius:12,padding:16,margin:"12p
    <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr",gap:4,fo
      <span>Cotisation</span><span>Part salariale</span><span>Part patrona
    </div>
    {[["Maladie, maternité","—","7,30%"],["Vieillesse plafonnée","6,90%","
      <div key={n}style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr"
        <span>{n}</span><span style={{color:s!=="—"?"#E76F51":"#B0BEC5"}}>
</div> )}
</div>
  <h3 style={{fontSize:16,fontWeight:700,color:"#264653",margin:"20px 0 10
  <div style={{background:"#F0FAF4",borderRadius:12,padding:16,margin:"12p
    <div style={{fontSize:12,lineHeight:2}}>
      <strong>Salaire brut</strong> − cotisations salariales (~22%) = <str
      Salaire net + indemnités (entretien + repas) = <strong>Total versé à
      Salaire brut + cotisations patronales + indemnités = <strong>Coût to
</div>
 ent êtr
aite av
ontant
x 0",bo
vous s
rêt à r
> Co · 8 mi
exe. Po
px"}}>L
",fontS
re brut
e contr
s de 25
. Minim
Montan
px"}}>L
 Elles
x 0",fo
ntWeigh
le</spa
8,55%"]
,gap:4,
{s}</sp
px"}}>D
x 0",bo
ong>Sal
 l'assm
tal pou
 i
m

 </div>
  <h3 style={{fontSize:16,fontWeight:700,color:"#264653",margin:"20px 0 10
  <p>Les assistantes maternelles bénéficient d'un abattement fiscal unique
</div>}
{showBlog==="secours"&&<div>
  <h2 style={{fontSize:22,fontWeight:700,color:"#264653",marginBottom:16}}
  <div style={{fontSize:11,color:"#8FA3AD",marginBottom:20}}>Santé · 5 min
  <p>La PMI vérifie votre trousse de secours lors de chaque visite. Elle d
  <h3 style={{fontSize:16,fontWeight:700,color:"#E76F51",margin:"20px 0 10
  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(
{[
[" ","Pansementsetcompresses","Pansementshypoallergéniquesdepl [" ","Désinfectant","Antiseptiquesansalcool(typeBiseptineouCh [" ","Thermomètre","Thermomètrefrontalouauriculaire.Vérifierle [" ","Ciseauxetpinces","Ciseauxàboutsronds,pinceàécharde,p [" ","Froid","Pochesdefroidinstantané(pasdeglacedirectesur [" ","Numérosd'urgence","Affichésvisiblement:15(SAMU),18(Pom
    ].map(([ic,titre,desc])=>
      <div key={titre}style={{background:"#FEF2F2",borderRadius:12,padding
        <div style={{fontSize:20,marginBottom:6}}>{ic}</div>
        <div style={{fontSize:12,fontWeight:700,color:"#E76F51",marginBott
        <div style={{fontSize:11,color:"#5F7A86",lineHeight:1.6}}>{desc}</
</div> )}
</div>
  <h3 style={{fontSize:16,fontWeight:700,color:"#E76F51",margin:"20px 0 10
  <div style={{background:"#FEF2F2",borderRadius:12,padding:16,margin:"12p
    <ul style={{paddingLeft:20,fontSize:12,lineHeight:2,color:"#E76F51"}}>
      <li><strong>Aucun médicament</strong> sans ordonnance nominative et
      <li>Pas de Doliprane, pas d'Advil — même si les parents vous disent
      <li>Pas de crème solaire sans accord parental écrit</li>
      <li>Pas d'huiles essentielles — dangereuses pour les moins de 6 ans<
</ul> </div>
  <h3 style={{fontSize:16,fontWeight:700,color:"#E76F51",margin:"20px 0 10
  <p>Votre formation initiale de 120h inclut le PSC1 (Prévention et Secour
  <ul style={{paddingLeft:20,fontSize:12,lineHeight:2.2}}>
    <li><strong>Chute :</strong> vérifier la conscience, mettre du froid,
    <li><strong>Fièvre {">"}38,5°C :</strong> déshabiller l'enfant, hydrat
    <li><strong>Étouffement :</strong> 5 claques dorsales puis 5 compressi
    <li><strong>Brûlure :</strong> eau froide 10 minutes, ne pas décoller
      px"}}>L
 : vous
> Tr de lec
oit êtr
px"}}>L
200px,1
usieur
lorhex
s pile
ince à
la pea
piers)
:14,bor
om:4}}> div>
px"}}>C
x 0"}}>
autoris
"c'est
/li>
px"}}>L
s Civiq
surveil
er, app
ons tho
les vêt
 o
s i s
u ,

 </ul>
<div style={{background:"#F0FAF4",borderRadius:12,padding:16,margin:"20p <div style={{fontWeight:700,color:"#2A9D8F",marginBottom:6}}> Rappel <div style={{fontSize:12}}>
      La trousse doit être dans un endroit connu de tous mais inaccessible
    </div>
  </div>
</div>}
{showBlog==="tarif"&&<div>
  <h2 style={{fontSize:22,fontWeight:700,color:"#264653",marginBottom:16}}
  <div style={{fontSize:11,color:"#8FA3AD",marginBottom:20}}>Administratif
  <p>Fixer son tarif est l'une des décisions les plus importantes — et les
  <h3 style={{fontSize:16,fontWeight:700,color:"#264653",margin:"20px 0 10
  <p>Le <strong>minimum légal</strong> est fixé à 0,281 fois le SMIC horai
<div style={{background:"#F4F7FA",borderRadius:12,padding:16,margin:"16p <div style={{fontWeight:700,color:"#264653",marginBottom:8}}> Moyenn <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,fontSi
      {[["Paris / Île-de-France","4,50€ - 5,50€"],["Grandes villes (Lyon,
        <div key={zone}style={{display:"flex",justifyContent:"space-betwee
          <span style={{color:"#5F7A86"}}>{zone}</span><strong style={{col
</div> )}
    </div>
  </div>
  <h3 style={{fontSize:16,fontWeight:700,color:"#264653",margin:"20px 0 10
  <ul style={{paddingLeft:20,fontSize:12,lineHeight:2.2}}>
    <li><strong>Votre expérience</strong> — plus d'années d'agrément = plu
    <li><strong>Vos formations</strong> — CAP AEPE, Montessori, Snoezelen,
    <li><strong>Votre localisation</strong> — forte demande dans votre qua
    <li><strong>Vos horaires</strong> — horaires atypiques (tôt le matin,
    <li><strong>Vos services</strong> — repas bio faits maison, sorties qu
    <li><strong>Votre logement</strong> — jardin, salle de jeux dédiée, es
</ul>
  <h3 style={{fontSize:16,fontWeight:700,color:"#264653",margin:"20px 0 10
  <div style={{background:"#F0FAF4",borderRadius:12,padding:16,margin:"12p
    <strong>Indemnité d'entretien :</strong> minimum 3,69€/jour (2024). Co
    <strong>Indemnité de repas :</strong> si vous fournissez les repas. Gé
    <strong>Indemnité kilométrique :</strong> 0,63€/km si vous transportez
    <strong>Aucune de ces indemnités n'est soumise à cotisations</strong>
  </div>
  x 0",bo PMI</
aux en
> Co · 6 mi
plus s
px"}}>L
re, soi
x 0"}}>
es par
ze:12}}
Marseil
n",padd
or:"#26
px"}}>L
s de lé
 Langue
rtier</
tard le
otidien
pace am
px"}}>L
x 0",bo
uvre l'
néralem
 l'enfa
— c'est
 d
m

   <h3 style={{fontSize:16,fontWeight:700,color:"#264653",margin:"20px 0 10
  <p>Ne vous justifiez pas. Présentez votre tarif avec assurance et expliq
<div style={{background:"#FFF8F3",borderRadius:12,padding:16,margin:"16p <div style={{fontWeight:700,color:"#FF9F63",marginBottom:6}}> TiMat <div style={{fontSize:12}}>Le simulateur de coût TiMat permet aux pare
  </div>
</div>}
{showBlog==="motricite"&&<div>
  <h2 style={{fontSize:22,fontWeight:700,color:"#264653",marginBottom:16}}
  <div style={{fontSize:11,color:"#8FA3AD",marginBottom:20}}>Pédagogie · 6
  <p>Chaque enfant se développe à son rythme. Les âges ci-dessous sont des
  <h3 style={{fontSize:16,fontWeight:700,color:"#264653",margin:"20px 0 10
  <p>Le bébé découvre son corps. Il tourne la tête vers les sons, suit des
  <p style={{marginTop:8}}><strong>Votre rôle :</strong> varier les positi
  <h3 style={{fontSize:16,fontWeight:700,color:"#264653",margin:"20px 0 10
  <p>L'enfant se retourne seul, attrape les objets volontairement, les por
  <p style={{marginTop:8}}><strong>Votre rôle :</strong> proposer des obje
  <h3 style={{fontSize:16,fontWeight:700,color:"#264653",margin:"20px 0 10
  <p>Rampé, quatre pattes, se hisse debout, premiers pas tenus. La pince p
  <p style={{marginTop:8}}><strong>Votre rôle :</strong> sécuriser l'espac
  <h3 style={{fontSize:16,fontWeight:700,color:"#264653",margin:"20px 0 10
  <p>Premiers pas vers 12-15 mois. L'enfant monte les marches à quatre pat
  <h3 style={{fontSize:16,fontWeight:700,color:"#264653",margin:"20px 0 10
  <p>L'enfant court, saute, pédale, monte les escaliers. Il dessine des ce
  <div style={{background:"#F0FAF4",borderRadius:12,padding:16,margin:"20p
<div style={{fontWeight:700,color:"#2A9D8F",marginBottom:6}}> Motric
    <div style={{fontSize:12}}>Ne pas mettre un enfant dans une position q
  </div>
</div>}
{showBlog==="droits"&&<div>
  <h2 style={{fontSize:22,fontWeight:700,color:"#264653",marginBottom:16}}
  <div style={{fontSize:11,color:"#8FA3AD",marginBottom:20}}>Juridique · 8
  <p>L'assistante maternelle est une salariée du particulier employeur, en
  <h3 style={{fontSize:16,fontWeight:700,color:"#2A9D8F",margin:"20px 0 10
  <p><strong>Rémunération :</strong> minimum conventionnel (~3,49€ brut/h)
  <p style={{marginTop:8}}><strong>Congés payés :</strong> 2,5 jours ouvra
  <p style={{marginTop:8}}><strong>Formation :</strong> 120h en 5 ans (80h
  <p style={{marginTop:8}}><strong>Protection sociale :</strong> maladie,
  <h3 style={{fontSize:16,fontWeight:700,color:"#2A9D8F",margin:"20px 0 10
  <p><strong>Agrément :</strong> obligatoire, délivré par le Conseil dépar
  <p style={{marginTop:8}}><strong>Assurance :</strong> RC professionnelle
  <p style={{marginTop:8}}><strong>Secret professionnel :</strong> ne pas
  <p style={{marginTop:8}}><strong>Rupture :</strong> préavis de 15 jours
  px"}}>C
uez ce
x 0",bo
inclut
nts de
> Le min de repère
px"}}>0
 yeux,
ons (do
px"}}>4
te à la
ts vari
px"}}>8
ouce-in
e, prop
px"}}>1
tes, em
px"}}>1
rcles,
x 0",bo
ité li u'il n'
> Dr min de
cadrée
px"}}>V
. Heure
bles/mo
 avant
materni
px"}}>V
tementa
 obliga
partage
(moins
  s
b
o

 <div style={{background:"#F4F7FA",borderRadius:12,padding:16,margin:"20p <div style={{fontWeight:700,color:"#264653",marginBottom:8}}> Docume <div style={{fontSize:12}}>Contrat signé, avenants, bulletins de salai
        </div>
      </div>}
    </div>
  </div>
</div>}
{/* BOUTIQUE MODAL */}
{showBoutique&&<div onClick={e=>e.target===e.currentTarget&&setShowBoutique(fals
  <div style={{background:"#FDFBF8",borderRadius:20,width:"100%",maxWidth:800,ma
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"cente
      <div style={{fontFamily:fTitle,fontSize:22,fontWeight:700,color:"#264653"}
      <button onClick={()=>setShowBoutique(false)}style={{background:"#F4F7FA",b
    </div>
    <div style={{fontSize:13,color:"#5F7A86",marginBottom:24,lineHeight:1.6}}>Te
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220
      {[
        {id:"kit_sheets",name:"Kit Google Sheets",price:"14,90",desc:"7 tableurs
        {id:"fiche_urgence",name:"Fiche d'urgence",price:"4,90",desc:"Fiche comp
        {id:"projet_accueil",name:"Projet d'accueil",price:"9,90",desc:"10 secti
        {id:"pack_complet",name:"Pack Complet",price:"24,90",desc:"Les 3 produit
      ].map(p=><div key={p.id}style={{background:"#fff",borderRadius:14,overflow
        <div style={{height:70,background:"linear-gradient(135deg,"+p.color+"18,
{p.icon}
          {p.badge&&<div style={{position:"absolute",top:6,right:6,background:p.
        </div>
        <div style={{padding:14,flex:1,display:"flex",flexDirection:"column"}}>
          <div style={{fontWeight:700,fontSize:13,color:"#264653",marginBottom:4
          <div style={{fontSize:11,color:"#5F7A86",lineHeight:1.5,flex:1,marginB
          <div style={{display:"flex",justifyContent:"space-between",alignItems:
            <span style={{fontSize:16,fontWeight:700,color:p.color}}>{p.price} €
            <button onClick={()=>{if(p.link){window.open(p.link,"_blank");}else{
          </div>
        </div>
      </div>)}
</div>
    <div style={{marginTop:16,textAlign:"center",fontSize:11,color:"#B0BEC5"}}>
  </div>
</div>}
{/* FOOTER */}
<footer style={{ background: "#264653", padding: "48px 24px 24px", color: "rgba(
  <div style={{ maxWidth: 900, margin: "0 auto" }}>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax
 x 0"}}>
nts in
re, att
e)} sty xHeight r",marg }> B order:"
mplates
px,1fr)
 interc
lete a
ons per
s reuni
:"hidde
"+p.col
color,c
}}>{p.n
ottom:1
"center
</span>
alert("
Paie
255,255
(200px,
  d
o
m

   {/* Logo + description */}
  <div>
    <div className="lp-logo" style={{ fontFamily: fTitle, marginBottom: 12 }
      {L.logoUrl
        ?<img src={L.logoUrl} alt="TiMat" style={{height:32,borderRadius:8,o
        :<div className="lp-logo-icon" style={{ background: "rgba(255,255,25
      <span style={{ color: "#fff" }}>TiMat</span>
    </div>
    <div style={{ fontSize: 12, lineHeight: 1.7, color: "rgba(255,255,255,.5
      L'application tout-en-un des assistantes maternelles. Conçue en France
    </div>
  </div>
  {/* Liens */}
  <div>
    <div style={{ fontSize: 11, fontWeight: 700, color: accent, textTransfor
    {[["Mentions légales","mentions"],["Conditions générales d'utilisation",
      <div key={id} onClick={()=>setShowLegal(id)} style={{ fontSize: 12, co
        onMouseEnter={e=>e.target.style.color="#fff"} onMouseLeave={e=>e.tar
)} </div>
  {/* Contact */}
  <div>
    <div style={{ fontSize: 11, fontWeight: 700, color: accent, textTransfor
    <div style={{ fontSize: 12, lineHeight: 2, color: "rgba(255,255,255,.6)"
         support@timat.app<br/>
         timat.app<br/>
         Île-de-France, France
    </div>
  </div>
  {/* RGPD */}
  <div>
    <div style={{ fontSize: 11, fontWeight: 700, color: accent, textTransfor
    <div style={{ fontSize: 11, lineHeight: 1.7, color: "rgba(255,255,255,.5
         Données hébergées en France (Paris)<br/>
         Chiffrement en transit et au repos<br/>
         Conforme RGPD<br/>
         Droit à l'effacement garanti
    </div>
  </div>
</div>
{/* Séparateur */}
<div style={{ borderTop: "1px solid rgba(255,255,255,.1)", paddingTop: 20, d
  <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)" }}>© {new Date(
  <div style={{ display: "flex", gap: 16 }}>
    {[["Mentions légales","mentions"],["CGU","cgu"],["Confidentialité","conf
      <span key={id} onClick={()=>setShowLegal(id)} style={{ fontSize: 11, c
        onMouseEnter={e=>e.target.style.color="#fff"} onMouseLeave={e=>e.tar
       }>
bjectFi
5,.1)"
)" }}> , pour
m: "upp
"cgu"],
lor: "r
get.sty
m: "upp }}>
m: "upp )" }}>
isplay:
).getFu
identia
olor: "
get.sty

 )} </div>
    </div>
  </div>
</footer>
{/* PAGES JURIDIQUES */}
{showLegal&&<div onClick={e=>e.target===e.currentTarget&&setShowLegal(null)} sty
  <div style={{background:"#fff",borderRadius:20,width:"100%",maxWidth:700,maxHe
    {/* Header */}
    <div style={{padding:"20px 24px",borderBottom:"1px solid #E8E4E0",display:"f
<div style={{fontFamily:fTitle,fontSize:18,fontWeight:700,color:"#264653"} {showLegal==="mentions"&&" Mentions légales"}
{showLegal==="cgu"&&" Conditions générales d'utilisation"} {showLegal==="confidentialite"&&" Politique de confidentialité"}
</div>
      <button onClick={()=>setShowLegal(null)}style={{background:"#F4F7FA",borde
    </div>
    {/* Contenu scrollable */}
    <div style={{padding:"24px",overflowY:"auto",fontSize:13,color:"#264653",lin
      {/* =================== MENTIONS LÉGALES =================== */}
      {showLegal==="mentions"&&<div>
        <h3 style={{fontSize:15,fontWeight:700,color:"#264653",marginBottom:12}}
        <p>Le site <strong>timat.app</strong> (ci-après "TiMat") est édité par :
        <div style={{background:"#F4F7FA",borderRadius:10,padding:14,margin:"12p
          <strong>{config.legal?.nom}</strong><br/>
          Auto-entrepreneur<br/>
          SIRET : {config.legal?.siret}<br/>
          Adresse : {config.legal?.adresse}<br/>
          Email : {config.legal?.email}<br/>
          Directrice de la publication : {config.legal?.nom}
</div>
        <h3 style={{fontSize:15,fontWeight:700,color:"#264653",margin:"20px 0 12
        <div style={{background:"#F4F7FA",borderRadius:10,padding:14,margin:"12p
          <strong>Site web :</strong> Vercel Inc. — 340 S Lemon Ave #4133, Walnu
          <strong>Base de données :</strong> Supabase — Région Europe (Paris, Fr
          <strong>Paiement :</strong> Stripe — Certifié PCI-DSS Level 1
        </div>
        <h3 style={{fontSize:15,fontWeight:700,color:"#264653",margin:"20px 0 12
        <p>L'ensemble du contenu du site TiMat (textes, graphismes, logos, icône
        <h3 style={{fontSize:15,fontWeight:700,color:"#264653",margin:"20px 0 12
        <p>TiMat collecte et traite des données personnelles dans le respect du
   le={{po
ight:"9
lex",ju }>
r:"none
eHeight
>1. Édi
</p>
x 0",fo
px"}}>2
x 0",fo
t, CA 9
ance)<b
px"}}>3
s, imag
px"}}>4
Règleme

   <h3 style={{fontSize:15,fontWeight:700,color:"#264653",margin:"20px 0 12
  <p>TiMat utilise uniquement des cookies techniques nécessaires au foncti
  <h3 style={{fontSize:15,fontWeight:700,color:"#264653",margin:"20px 0 12
  <p>Les calculs de salaire, récapitulatifs Pajemploi, attestations fiscal
  <h3 style={{fontSize:15,fontWeight:700,color:"#264653",margin:"20px 0 12
  <p>Pour toute question : <strong>support@timat.app</strong></p>
  <div style={{marginTop:20,padding:12,background:"#F0FAF4",borderRadius:1
    Dernière mise à jour : {new Date().toLocaleDateString("fr-FR",{month:"
  </div>
</div>}
{/* =================== CGU =================== */}
{showLegal==="cgu"&&<div>
  <h3 style={{fontSize:15,fontWeight:700,color:"#264653",marginBottom:12}}
  <p>Les présentes Conditions Générales d'Utilisation (CGU) régissent l'ac
  <h3 style={{fontSize:15,fontWeight:700,color:"#264653",margin:"20px 0 12
  <p>TiMat est une application de gestion administrative destinée aux assi
  <h3 style={{fontSize:15,fontWeight:700,color:"#264653",margin:"20px 0 12
  <p>L'utilisateur doit fournir des informations exactes lors de son inscr
  <h3 style={{fontSize:15,fontWeight:700,color:"#264653",margin:"20px 0 12
  <p><strong>Formule Gratuite :</strong> accès limité (1 enfant, fonctionn
  <p><strong>Formule Pro :</strong> 9,99€/mois TTC, avec un essai gratuit
  <h3 style={{fontSize:15,fontWeight:700,color:"#264653",margin:"20px 0 12
  <p>L'utilisateur reste propriétaire de toutes les données qu'il saisit d
  <h3 style={{fontSize:15,fontWeight:700,color:"#264653",margin:"20px 0 12
  <p>TiMat traite des données relatives à des enfants (prénoms, dates de n
  <ul style={{paddingLeft:20,margin:"8px 0"}}>
    <li>Collecte limitée au strict nécessaire pour le service</li>
    <li>Accès restreint aux seuls parents et assistantes maternelles conce
    <li>Aucune utilisation commerciale ou publicitaire</li>
    <li>Suppression à la fin du contrat d'accueil ou sur demande</li>
</ul>
  <h3 style={{fontSize:15,fontWeight:700,color:"#264653",margin:"20px 0 12
  <p>TiMat est un outil d'aide à la gestion. Les calculs, documents et inf
  <h3 style={{fontSize:15,fontWeight:700,color:"#264653",margin:"20px 0 12
  <p>L'utilisateur peut résilier son abonnement Pro à tout moment depuis s
px"}}>5
onnemen
px"}}>6
es et b
px"}}>7
0,fontS
long",y
>1. Obj cès et
px"}}>2
stantes
px"}}>3
iption.
px"}}>4
alités
de 2 mo
px"}}>5
ans TiM
px"}}>6
aissanc
rnés</l
px"}}>7
ormatio
px"}}>8
on espa

   <h3 style={{fontSize:15,fontWeight:700,color:"#264653",margin:"20px 0 12
  <p>TiMat s'engage à fournir un service disponible 24h/24, 7j/7. Toutefoi
  <h3 style={{fontSize:15,fontWeight:700,color:"#264653",margin:"20px 0 12
  <p>Les présentes CGU sont soumises au droit français. En cas de litige,
  <div style={{marginTop:20,padding:12,background:"#F0FAF4",borderRadius:1
    Dernière mise à jour : {new Date().toLocaleDateString("fr-FR",{month:"
  </div>
</div>}
{/* =================== POLITIQUE DE CONFIDENTIALITÉ =================== *
{showLegal==="confidentialite"&&<div>
  <h3 style={{fontSize:15,fontWeight:700,color:"#264653",marginBottom:12}}
  <div style={{background:"#F4F7FA",borderRadius:10,padding:14,margin:"12p
    {config.legal?.nom} — Auto-entrepreneur<br/>
    Email : {config.legal?.email}<br/>
    SIRET : {config.legal?.siret}
</div>
  <h3 style={{fontSize:15,fontWeight:700,color:"#264653",margin:"20px 0 12
  <p>TiMat collecte les données suivantes :</p>
  <div style={{background:"#F4F7FA",borderRadius:10,padding:14,margin:"12p
    <p><strong>Données d'identification :</strong> prénom, nom, adresse em
    <p style={{marginTop:8}}><strong>Données professionnelles :</strong> n
    <p style={{marginTop:8}}><strong>Données relatives aux enfants :</stro
    <p style={{marginTop:8}}><strong>Données de facturation :</strong> heu
    <p style={{marginTop:8}}><strong>Données techniques :</strong> adresse
</div>
  <h3 style={{fontSize:15,fontWeight:700,color:"#264653",margin:"20px 0 12
  <ul style={{paddingLeft:20,margin:"8px 0"}}>
    <li>Fourniture du service de gestion administrative pour assistantes m
    <li>Calcul automatique des salaires et génération de documents</li>
    <li>Communication entre assistantes maternelles et parents</li>
    <li>Support utilisateur</li>
    <li>Amélioration du service</li>
  </ul>
  <p style={{marginTop:8}}><strong>Base légale :</strong> exécution du con
  <h3 style={{fontSize:15,fontWeight:700,color:"#264653",margin:"20px 0 12
  <div style={{background:"#F0FAF4",borderRadius:10,padding:14,margin:"12p
       Base de données : <strong>Supabase</strong> — Région Europe, Paris
       Site web : <strong>Vercel</strong> — CDN mondial, données en Europe
       Paiement : <strong>Stripe</strong> — Certifié PCI-DSS Level 1<br/>
       Chiffrement : TLS 1.3 en transit, AES-256 au repos<br/>
       Mots de passe : hachés avec bcrypt (irréversible)<br/>
     px"}}>9
s, des
px"}}>1
une sol
0,fontS
long",y
/}
>1. Res
x 0",fo
px"}}>2
x 0",fo
ail, mo
uméro d
ng> pré
res d'a
IP, ty
px"}}>3
aternel
trat (A
px"}}>4
x 0",fo
(Franc
<br/>
e

       Row Level Security (RLS) : chaque utilisateur n'accède qu'à ses pro
</div>
<h3 style={{fontSize:15,fontWeight:700,color:"#264653",margin:"20px 0 12
<ul style={{paddingLeft:20,margin:"8px 0"}}>
  <li><strong>Données de compte :</strong> conservées tant que le compte
  <li><strong>Données des enfants :</strong> conservées pendant la durée
  <li><strong>Données de facturation :</strong> conservées 5 ans (obliga
  <li><strong>Données de support :</strong> conservées 2 ans</li>
</ul>
<h3 style={{fontSize:15,fontWeight:700,color:"#264653",margin:"20px 0 12
<p>Conformément au RGPD, vous disposez des droits suivants :</p>
<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(
{[[" ","Droitd'accès","Obtenirunecopiedevosdonnées"],[" ","Dro <div key={titre}style={{background:"#F4F7FA",borderRadius:10,padding
      <div style={{fontSize:16,marginBottom:4}}>{ic}</div>
      <div style={{fontSize:12,fontWeight:700,color:"#264653"}}>{titre}<
      <div style={{fontSize:11,color:"#5F7A86"}}>{desc}</div>
</div> )}
</div>
<p style={{marginTop:8}}>Pour exercer vos droits : <strong>support@timat
<h3 style={{fontSize:15,fontWeight:700,color:"#264653",margin:"20px 0 12
<div style={{background:"#F4F7FA",borderRadius:10,padding:14,margin:"12p
  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,fo
    <div><strong>Sous-traitant</strong></div><div><strong>Finalité</stro
<div>Supabase</div><div>Base de données</div><div> Paris, France</ <div>Vercel</div><div>Hébergement web</div><div> Europe (CDN)</div <div>Stripe</div><div>Paiement</div><div> Europe (Dublin)</div>
  </div>
</div>
<p>Tous les sous-traitants sont conformes au RGPD et bénéficient de gara
<h3 style={{fontSize:15,fontWeight:700,color:"#264653",margin:"20px 0 12
<p>Les données sont hébergées en France et en Europe. En cas de transfer
<h3 style={{fontSize:15,fontWeight:700,color:"#264653",margin:"20px 0 12
<p>TiMat utilise uniquement des cookies techniques strictement nécessair
<h3 style={{fontSize:15,fontWeight:700,color:"#264653",margin:"20px 0 12
<p>Si vous estimez que vos droits ne sont pas respectés, vous pouvez adr
<div style={{marginTop:20,padding:12,background:"#F0FAF4",borderRadius:1
  Dernière mise à jour : {new Date().toLocaleDateString("fr-FR",{month:"
</div>
     pres d
px"}}>5
est ac
du con tion lé
px"}}>6
200px,1 it de
:12}}> /div>
.app</s
px"}}>7
x 0",fo
ntSize:
ng></di
div> >
nties c
px"}}>8
t vers
px"}}>9
es (aut
px"}}>1
esser u
0,fontS
long",y
o
r

 </div>}
    </div>
  </div>
</div>}
{/* MODALE AUTH */}
{showModal && (
  <div onClick={e => e.target === e.currentTarget && setShowModal(false)} style=
    <div style={{ background: "#FDFAF8", borderRadius: 20, width: "100%", maxWid
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", background:
{[{ r: "asmat", ic: "     ", l: "Assistante\nmaternelle", col: "#B8622F" <button key={r} onClick={() => { setRole(r); setErr(""); }} style={{ p
            <div style={{ fontSize: 24, marginBottom: 4 }}>{ic}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: role === r ? "#f
          </button>
))} </div>
      <div style={{ padding: 24, borderTop: role === "asmat" ? "4px solid #B8622
        <div style={{ display: "flex", justifyContent: "space-between", alignIte
          <div>
            <div style={{ fontFamily: fTitle, fontSize: 18, fontWeight: 700, col
            <div style={{ fontSize: 11, color: "#A68970", marginTop: 2 }}>{modeA
</div>
          <button onClick={() => setShowModal(false)} style={{ background: "none
        </div>
        <div style={{ display:"flex", marginBottom:16, background:"#F4EFF8", bor
          {["inscription","connexion"].map(m => (
            <button key={m} onClick={() => { setModeAuth(m); setErr(""); }} styl
          ))}
        </div>
        {modeAuth === "inscription" && <>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, m
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:"#A68970", margin
              <input value={form.prenom} onChange={e=>setForm(f=>({...f,prenom:e
            </div>
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:"#A68970", margin
              <input value={form.nom} onChange={e=>setForm(f=>({...f,nom:e.targe
            </div>
          </div>
        </>}
        <div style={{ marginBottom:10 }}>
          <div style={{ fontSize:11, fontWeight:700, color:"#A68970", marginBott
          <input type="email" value={form.email} onChange={e=>setForm(f=>({...f,
        </div>
{{ posi
th: 420
 "#7B4B
}, { r adding:
ff" : "
F" : "4 ms: "ce
or: "#0
uth ===
", bord
derRadi
e={{ fl
arginBo
Bottom:
.target
Bottom:
t.value
om:4, t
email:e
:

               <div style={{ marginBottom: modeAuth==="inscription" ? 14 : 20 }}>
                <div style={{ fontSize:11, fontWeight:700, color:"#A68970", marginBott
                <input type="password" value={form.password} onChange={e=>setForm(f=>(
              </div>
              {modeAuth === "inscription" && <div style={{ background:"#F4EFF8", borde
                <div style={{ fontSize:10, fontWeight:700, color:"#A68970", marginBott
                {[{k:"politique", l:"J'accepte la politique de confidentialité", req:t
                  <label key={k} style={{ display:"flex", gap:8, alignItems:"flex-star
                    <input type="checkbox" checked={consent[k]} onChange={e=>setConsen
                    <span style={{ fontSize:11, color:"#2C1F14", lineHeight:1.5 }}>{l}
</label> ))}
                <div style={{ fontSize:10, color:"#A68970", marginTop:4 }}>* Obligatoi
              </div>}
{err && <div style={{ color:"#C44A6A", fontSize:12, marginBottom:12, pad <button onClick={modeAuth==="connexion" ? connexion : inscription} disab {loading ? " Chargement..." : modeAuth==="connexion" ? (role==="asma
              </button>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:1
                <div style={{ flex:1, height:1, background:"#DDD5C8" }}/><span style={
              </div>
              <div style={{ background:"#F7F2EC", borderRadius:10, padding:10 }}>
                <div style={{ fontSize:10, fontWeight:700, color:"#A68970", marginBott
                {demos.filter(d=>d.role===role).map(d => (
<button key={d.id} onClick={()=>onLogin(d)} style={{ display:"block" {d.role==="asmat"?"     ":"   "} {d.label}
<span style={{ fontSize:11, color:"#A68970", display:"block", padd
                  </button>
                ))}
</div>
              <div style={{ marginTop:12, fontSize:11, color:"#A68970", textAlign:"cen
            </div>
          </div>
        </div>
)} </div>
); }
//
async function demanderPush(userId){
  if(!('Notification' in window)||!('serviceWorker' in navigator))return null;
  const perm=await Notification.requestPermission();
  if(perm!=='granted')return null;
  try{
 om:4, t
{...f,p
rRadius
om:8, t
rue},{k
t", cur
t(c=>({
{req&&<
re · Do
ding:"8
led={lo
t" ? "
2 }}>
{ fontS
om:8, t
, width
ingLeft
ter" }}
A

     const reg=await navigator.serviceWorker.ready;
    const VAPID_PUBLIC='BEl62iUYgUivxIkv69yViEuiBIa40HZa+FE+TgEFSCcg4sV3fD3CK+jNHOyHAH
    const sub=await reg.pushManager.subscribe({
      userVisibleOnly:true,
      applicationServerKey:VAPID_PUBLIC
    });
    await supabase.from('push_subscriptions').upsert({
      user_id:userId,subscription:JSON.stringify(sub),created_at:new Date().toISOStrin
});
    return sub;
  }catch(e){console.log('Push error:',e);return null;}
}
//
function OnboardingWizard({user,onFinish}){
const [step,setStep]=useState(0); const[enfant,setEnfant]=useState({prenom:"",naissance:"",emoji:" "}); const [contrat,setContrat]=useState({
    heuresHebdo:40,tauxHoraire:4.05,entretien:3.80,
    jours:["Lundi","Mardi","Mercredi","Jeudi","Vendredi"],
    horaires:"07h30–17h30",debut:new Date().toISOString().slice(0,10)
});
const [parentEmail,setParentEmail]=useState("");
const [saving,setSaving]=useState(false);
const [pushDone,setPushDone]=useState(false);
const [toast,setToast]=useState("");
const EMOJIS=[" "," "," "," "," "," "," "," "," "," "];
const toggleJour=(j)=>setContrat(c=>({...c,jours:c.jours.includes(j)?c.jours.filter(
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
throw e; }
           }
hGXCGGO
g()
x=>x!==

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
  const{data:profil}=await withRetry(()=>supabase.from('profiles').select('id').eq
  if(!profil){
    await withRetry(()=>supabase.from('profiles').insert({
      id:user.id,email:user.email,
      prenom:user.prenom||'',nom:user.nom||'',
      role:user.role||'asmat',couleur:'#B8622F',
      subscription_status:'free'
})); }
  // 2. Créer l'enfant
  const{data:enfantData,error:errEnfant}=await withRetry(()=>supabase.from('enfant
prenom:enfant.prenom, emoji:enfant.emoji||' ', naissance:enfant.naissance, asmat_id:user.id, actif:true,
  }).select().single());
if(errEnfant){
console.error('Erreur enfant:', errEnfant); setToast(' Erreur: '+errEnfant.message); setSaving(false);return;
}
  // 3. Créer le contrat lié à l'enfant
  const{error:errContrat}=await withRetry(()=>supabase.from('contrats').insert({
    enfant_id:enfantData.id,
    asmat_id:user.id,
    debut:contrat.debut||new Date().toISOString().slice(0,10),
    heures_hebdo:contrat.heuresHebdo||40,
    taux_horaire:contrat.tauxHoraire||4.05,
    entretien:contrat.entretien||3.80,
  ('id',u
s').ins

       jours:contrat.jours||['Lundi','Mardi','Mercredi','Jeudi','Vendredi'],
      horaires:contrat.horaires||'07h30–17h30',
      actif:true,
    }));
    if(errContrat){console.error('Erreur contrat:', errContrat);}
setToast(' '+enfant.prenom+' ajouté avec succès !');
    setStep(2);
  }catch(e){
    console.error('Erreur sauvegarde:', e);
setToast(' Erreur: '+e.message); }
  setSaving(false);
};
  const stepsTitres=[
{titre:"Votre premier enfant
{titre:"Le contrat d'accueil
{titre:"Inviter le parent
{titre:"TiMat est prêt ! ",sub:"Votre espace est configuré."},
 ",sub:"En 2 minutes, TiMat est prêt pour vous."},
                                  ",sub:"Pour calculer automatiquement votre salaire.
                              ",sub:"Optionnel - vous pouvez le faire plus tard."},
return <div style={{minHeight:"100vh",background:"linear-gradient(160deg,#F0FAF4 0%,
  {toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
  <div style={{width:"100%",maxWidth:500}}>
    <div style={{display:"flex",gap:6,marginBottom:28}}>
      {stepsTitres.map((_,i)=><div key={i}style={{flex:1,height:5,borderRadius:3,bac
    </div>
    <div style={{background:"#fff",borderRadius:24,overflow:"hidden",boxShadow:"0 8p
      <div style={{background:"linear-gradient(135deg,#3D6B50,#4A7C5F)",padding:"28p
        <div className="pf"style={{fontSize:22,fontWeight:700,color:"#fff",marginBot
        <div style={{fontSize:13,color:"rgba(255,255,255,.7)"}}>{s.sub}</div>
      </div>
      <div style={{padding:28}}>
        {step===0&&<>
          <div style={{marginBottom:14}}><label className="lbl">Prénom de l'enfant *
            <input className="inp"placeholder="Léo, Emma, Noah..."value={enfant.pren
          <div style={{marginBottom:14}}><label className="lbl">Date de naissance *<
            <input type="date"className="inp"value={enfant.naissance}onChange={e=>se
          <div style={{marginBottom:20}}><label className="lbl">Emoji</label>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {EMOJIS.map(em=><button key={em}onClick={()=>setEnfant(f=>({...f,emoji
                width:42,height:42,borderRadius:10,border:"2px solid",fontSize:20,cu
                background:enfant.emoji===em?"var(--Sp)":"#fff",borderColor:enfant.e
  ];
const s=stepsTitres[step];
"},
#FBF0E8
kground
x 48px
x 28px
tom:4}}
</label
om}onCh
/label>
tEnfant
:em}))}
rsor:"p
moji===

       }}>{em}</button>)}
    </div></div>
  <button className="btn bS"style={{width:"100%",justifyContent:"center",pad
    onClick={()=>enfant.prenom&&enfant.naissance&&setStep(1)}
    disabled={!enfant.prenom||!enfant.naissance}>
    Continuer → Le contrat
  </button>
</>}
{step===1&&<>
  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBot
    <div><label className="lbl">Heures / semaine</label>
      <input type="number"className="inp"value={contrat.heuresHebdo}onChange
    <div><label className="lbl">Taux horaire net (€)</label>
      <input type="number"step="0.05"className="inp"value={contrat.tauxHorai
  </div>
  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBot
    <div><label className="lbl">Indemnité entretien (€/j)</label>
      <input type="number"step="0.05"className="inp"value={contrat.entretien
    <div><label className="lbl">Date de début</label>
      <input type="date"className="inp"value={contrat.debut}onChange={e=>set
  </div>
  <div style={{marginBottom:14}}><label className="lbl">Jours d'accueil</lab
    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
      {["Lundi","Mardi","Mercredi","Jeudi","Vendredi"].map(j=><button key={j
        padding:"6px 12px",borderRadius:20,border:"1.5px solid",cursor:"poin
        background:contrat.jours.includes(j)?"var(--S)":"transparent",
        color:contrat.jours.includes(j)?"#fff":"var(--m)",
        borderColor:contrat.jours.includes(j)?"var(--S)":"var(--br)"
      }}>{j.slice(0,2)}</button>)}
    </div></div>
  <div style={{background:"var(--Sp)",borderRadius:10,padding:"10px 14px",ma
    Salaire mensuel estimé : {Math.round(contrat.heuresHebdo*52/12*contrat.t
  </div>
  <div style={{display:"flex",gap:8}}>
    <button className="btn bG"style={{flex:1}}onClick={()=>setStep(0)}>← Ret
    <button className="btn bS"style={{flex:2,justifyContent:"center"}}onClic
{saving?" Sauvegarde...":"Sauvegarder →"} </button>
</div> </>}
{step===2&&<>
  <div style={{marginBottom:14,padding:"12px 14px",background:"var(--Bp)",bo
       Le parent recevra un email pour créer son compte et accéder à l'espac
  </div>
  <div style={{marginBottom:16}}><label className="lbl">Email du parent</lab
  ding:13
tom:12}
={e=>se
re}onCh
tom:12}
}onChan
Contrat
el>
}onClic
ter",fo
rginBot
auxHora
our</bu
k={sauv
rderRad
e fami
el>
l

     <input type="email"className="inp"placeholder="parent@email.fr"value={pa
  <div style={{display:"flex",gap:8}}>
    <button className="btn bG"style={{flex:1}}onClick={()=>setStep(3)}>Passe
    <button className="btn bS"style={{flex:2,justifyContent:"center"}}disabl
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
}) });
          const d=await res.json();
setToast(d.success?" Invitation envoyée - le parent recevra un e }catch(e){setToast("Erreur réseau");}
setSaving(false);setStep(3);
}}>
{saving?" Envoi...":" Envoyer l'invitation"} </button>
</div> </>}
{step===3&&<div style={{textAlign:"center",padding:"20px 0"}}> <divstyle={{fontSize:72,marginBottom:16}}>{enfant.emoji||" "}</div> <div className="pf"style={{fontSize:20,fontWeight:700,color:"var(--b)",mar
    Bienvenue, {user?.prenom} !
  </div>
  <div style={{fontSize:13,color:"var(--m)",lineHeight:1.7,marginBottom:20}}
    {enfant.prenom&&<><strong>{enfant.prenom}</strong> est ajouté·e à votre
    Commencez par votre premier pointage.
  </div>
  {'Notification' in window&&!pushDone&&<div style={{background:"var(--Gp)",
<div style={{fontWeight:700,marginBottom:6}}> Activer les notification <div style={{marginBottom:8}}>Recevez les alertes en temps réel sur votr <button className="btn bG"style={{width:"100%"}}onClick={async()=>{
      await demanderPush(user.id);setPushDone(true);setToast("Notifications
    }}>Activer</button>
  </div>}
  <button className="btn bT"style={{width:"100%",justifyContent:"center",fon
    Découvrir TiMat
  </button>
      </div>}
rentEma
r</butt
ed={sav
mail":
ginBott
> espace.
border:
s push
e télép
activée
tSize:1
"

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
  const motifs=["Fin de contrat","Démission","Licenciement","Rupture conventionnelle",
  const generer=()=>{
    if(!dateFin)return;
    setGen(true);
    setTimeout(()=>{
      setGen(false);
      const w=window.open("","_blank");
      if(!w){setToast("Autorisez les popups pour générer le PDF");return;}
      const parent=D.parents.find(p=>p.id===enfant.parentId)||{prenom:"Parent",nom:"",
      const salaireMensuel=Math.round((contrat.heuresHebdo||40)*52/12*(contrat.tauxHor
      const htmlAttest='<!DOCTYPE html><html lang="fr"><head><title>Attestation Pôle E
        +'<style>body{font-family:Arial,sans-serif;max-width:800px;margin:40px auto;pa
        +'h1{font-size:15px;text-align:center;border:2px solid #000;padding:10px;margi
        +'h2{font-size:13px;background:#f0f0f0;padding:6px 8px;margin-top:20px;border-
        +'table{width:100%;border-collapse:collapse;margin:8px 0;}'
        +'td{padding:7px 10px;border:1px solid #ddd;}td:first-child{width:45%;backgrou
        +'.sig{margin-top:40px;display:grid;grid-template-columns:1fr 1fr;gap:40px;}'
        +'.sig-box{border-top:1px solid #000;padding-top:8px;font-size:12px;}'
        +'@media print{button{display:none}}</style></head>'
        +'<body>'
        +'<h1>Attestation destinée à Pôle Emploi<br/><span style="font-size:11px;font-
        +"<h2>L'employeur</h2>"
        +'<table><tr><td>Nom et prénom</td><td>'+parent.prenom+' '+parent.nom+'</td></
        +'<tr><td>Email</td><td>'+(parent.email||'[À compléter]')+'</td></tr>'
        +'<tr><td>N° Pajemploi</td><td>PAJ-[À compléter]</td></tr></table>'
        +'<h2>Le salarié</h2>'
        +'<table><tr><td>Nom et prénom</td><td>'+(user?.prenom||D.asmat.prenom)+' '+(u
        +'<tr><td>Emploi</td><td>Assistante maternelle agréée</td></tr>'
        +'<tr><td>Enfant gardé</td><td>'+(enfant.prenom||'')+' '+(enfant.nom||'')+'</t
"Retrai
email:"
aire||4
mploi -
dding:2
n-botto
left:3p
nd:#faf
weight: tr>'
ser?.no
d></tr>

       +'<h2>Contrat de travail</h2>'
      +"<table><tr><td>Date d'embauche</td><td>"+(contrat.debut||"[À compléter]")+"<
      +'<tr><td>Date de fin</td><td>'+dateFin+'</td></tr>'
      +'<tr><td>Motif</td><td>'+motif+'</td></tr>'
      +'<tr><td>Heures hebdo</td><td>'+(contrat.heuresHebdo||40)+'h/semaine</td></tr
      +'<tr><td>Dernier salaire brut</td><td>'+salaireMensuel+'€</td></tr></table>'
      +'<h2>Indemnités versées</h2>'
      +'<table><tr><td>Salaire du dernier mois</td><td>[À compléter]€</td></tr>'
      +'<tr><td>ICCP</td><td>[À compléter]€</td></tr>'
      +'<tr><td>Indemnité de préavis</td><td>[À compléter]€</td></tr></table>'
      +'<p style="margin-top:20px;font-size:12px;background:#f9f9f9;padding:10px;bor
      +'<div class="sig">'
      +'<div class="sig-box">Fait à ___, le '+new Date().toLocaleDateString('fr-FR')
      +'<div class="sig-box">Remis le '+new Date().toLocaleDateString('fr-FR')+'<br/
      +'</div>'
      +'<p style="font-size:10px;color:#999;margin-top:20px;">Généré par TiMat - tim
      +'<button onclick="window.print()" style="margin-top:10px;background:#3D6B50;c
      +'</body></html>';
w.document.write(htmlAttest); w.document.close(); setToast("Attestation générée ✓");
},1000); };
return <div className="fi">
{toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
<PageHeadericon=" "title="AttestationPôleEmploi"sub="Généréeen1clic-obl {role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"
    {liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>setSelId(e.id
  </div>}
  <div className="g2">
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div className="card"style={{padding:18}}>
        <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:14}}>
        <div style={{marginBottom:12}}><label className="lbl">Date de fin *</label>
          <input type="date"className="inp"value={dateFin}onChange={e=>setDateFin(e.
        <div style={{marginBottom:16}}><label className="lbl">Motif</label>
          <select className="sel"value={motif}onChange={e=>setMotif(e.target.value)}
            {motifs.map(m=><option key={m}>{m}</option>)}
          </select></div>
        <button className="btn bT"style={{width:"100%",justifyContent:"center"}}onCl
{gen?" Génération...":" Générer l'attestation PDF"} </button>
      </div>
      <div className="card"style={{padding:14,background:"var(--Rp)",border:"1px sol
        <div style={{fontWeight:700,fontSize:12,color:"var(--R)",marginBottom:6}}>
        <div style={{fontSize:12,color:"var(--m)",lineHeight:1.6}}>
   /td></t
>'
der:1px
+'<br/>
><br/>S
at.app<
olor:#f
igatoi
}}>
)}/>)}
Fin target.
>
ick={ge
id var( Oblig
  r
d
a

             L'attestation Pôle Emploi est obligatoire dès la fin du contrat. Sans ce d
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
        '<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/><title>Attestatio
        '<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans
        'h1{font-size:15px;text-align:center;color:#264653;border-bottom:2px solid #2A
        '.header{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20p
        '.header h3{font-size:11px;color:#2A9D8F;margin-bottom:6px;text-transform:uppe
        'table{width:100%;border-collapse:collapse;margin:10px 0}td{padding:8px 12px;b
        'td:first-child{width:60%;background:#FDFBF8;font-weight:600;color:#264653}',
        '.total{background:#2A9D8F;color:#fff;font-weight:700;font-size:13px}.total td
        '.note{margin-top:20px;padding:14px;background:#FFF8F3;border:1px solid #FFD6B
        '.sig{margin-top:30px;display:grid;grid-template-columns:1fr 1fr;gap:30px}',
        '.sig-box{border-top:1px solid #264653;padding-top:10px;font-size:11px}',
        '@media print{.noprint{display:none}}</style></head><body>',
'<h1> ATTESTATION FISCALE<br/><span style="font-size:12px;font-weight:400;co '<div class="header">',
 ocument
n fisca
-serif;
9D8F;pa
x;paddi
rcase;l
order:1
{border
3;borde
lor:#6
6

 '<div><h3>Assistante maternelle agréée</h3>', '<strong>'+(user?.prenom||'Prénom')+' '+(user?.nom||'Nom')+'</strong><br/>', 'Email : '+(user?.email||'[email]')+'<br/>',
'N° agrément : [À compléter]</div>',
'<div><h3>Parent employeur</h3>', '<strong>'+(enfant?.prenomParent||'Parent')+' '+(enfant?.nomParent||'')+'</str 'Enfant gardé : '+(enfant?.prenom||'-')+' '+(enfant?.emoji||'')+'<br/>', 'Né(e) le : '+(enfant?.naissance||'[Date]')+'</div></div>',
'<h3 style="font-size:12px;color:#264653;margin:16px 0 8px;padding-left:4px"> '<table>',
'<tr><td>Salaires nets versés (12 mois)</td><td style="text-align:right">'+tot '<tr><td>Indemnités d\'entretien</td><td style="text-align:right">'+totalEntre '<tr><td>Indemnités de repas</td><td style="text-align:right">'+totalRepas.toF '<tr class="total"><td>TOTAL DES SOMMES VERSÉES</td><td style="text-align:righ '</table>',
'<h3 style="font-size:12px;color:#264653;margin:16px 0 8px;padding-left:4px"> '<table>',
'<tr><td>Heures hebdomadaires (contrat)</td><td style="text-align:right">'+(co '<tr><td>Taux horaire brut</td><td style="text-align:right">'+(contrat.tauxHor '<tr><td>Salaire mensuel brut estimé</td><td style="text-align:right">'+salMen '<tr><td>Salaire mensuel net estimé</td><td style="text-align:right">'+(salMen '<tr><td>Mois travaillés</td><td style="text-align:right">'+moisTravailles+' m '</table>',
'<div class="note">',
'<strong> Informations importantes :</strong><br/>',
'• Ce document est destiné à la déclaration de revenus du parent employeur (cr '• Le parent peut déduire les sommes versées (salaires + cotisations) dans la '• Les indemnités d\'entretien et de repas ne sont pas déductibles.<br/>',
'• Conservez ce document avec votre déclaration de revenus.',
'</div>',
'<p style="margin-top:16px;font-size:11px;text-align:center;font-weight:600;co '<div class="sig">',
'<div class="sig-box">Fait à ____________<br/>Le '+new Date().toLocaleDateStri '<div class="sig-box">Remis au parent le :<br/>____________<br/><br/>Signature '<p style="font-size:9px;color:#999;margin-top:20px;text-align:center">Généré '<div style="text-align:center;margin-top:12px"><button class="noprint" onclic '</body></html>'
].join('');
w.document.write(html); w.document.close();
setToast("Attestation fiscale générée ✓");
},800); };
return <div className="fi">
{toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
<PageHeadericon=" "title="Attestationfiscale"sub="Pourlecréditd'impôtdes
  ong><br
Somm
alSalNe
tien.to
ixed(2)
t">'+(t
Déta
ntrat.h
aire||4
sBrut.t
sBrut*0
ois</td
édit d\
limite
lor:#26
ng('fr-
 parent
par TiM
k="wind
parent
  e
i
s

     {role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"
      {liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>setSelId(e.id
    </div>}
    <div className="g2">
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div className="card"style={{padding:18}}>
          <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:14}}>
          <div style={{marginBottom:12}}>
            <label className="lbl">Année fiscale</label>
            <select className="sel"value={annee}onChange={e=>setAnnee(Number(e.target.
              {[new Date().getFullYear()-1,new Date().getFullYear()-2,new Date().getFu
                <option key={a}value={a}>{a}</option>
)} </select>
          </div>
          <div style={{padding:12,background:"var(--c)",borderRadius:10,marginBottom:1
            <div style={{fontWeight:700,marginBottom:6,color:"var(--b)"}}>Récapitulati
            <div style={{display:"flex",justifyContent:"space-between"}}><span>Salaire
            <div style={{display:"flex",justifyContent:"space-between"}}><span>Indemni
            <div style={{display:"flex",justifyContent:"space-between",borderTop:"1px
          </div>
          <button className="btn bT"style={{width:"100%"}}onClick={generer}disabled={g
{gen?" Génération...":" Générer l'attestation fiscale "+annee} </button>
        </div>
        <div style={{padding:12,background:"var(--Bp)",borderRadius:10,fontSize:12,col
             Cette attestation permet aux parents de bénéficier du crédit d'impôt pour
        </div>
      </div>
      <div className="card"style={{padding:18}}>
        <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:14}}>
        {contrat.debut?<div style={{fontSize:12,lineHeight:2}}>
          <div>Début : <strong>{contrat.debut}</strong></div>
          <div>Heures/semaine : <strong>{contrat.heuresHebdo||40}h</strong></div>
          <div>Taux horaire : <strong>{contrat.tauxHoraire||4.05} €</strong></div>
          <div>Entretien : <strong>{contrat.entretien||3.80} €/jour</strong></div>
        </div>:<div style={{fontSize:12,color:"var(--l)"}}>Aucun contrat trouvé pour c
      </div>
    </div>
  </div>;
}
// ========== FICHE D'URGENCE (dans l'app) ==========
function FicheUrgence({enfants,role,pEId,user}){
  const [selId,setSelId]=useState(enfants[0]?.id);
  const [toast,setToast]=useState("");
  const liste=role==="parent"?enfants.filter(e=>e.id===pEId):enfants;
   }}> )}/>)}
Atte
value))
llYear(
4,fontS
f {anne
s nets<
tés ent
solid v
en}>
or:"var
 frais
Contra
et enfa
  s
t

 const enfant=liste.find(e=>e.id===selId)||liste[0]||{};
const contrat=enfant.contrat||{};
const [form,setForm]=useState({
  asmatNom:(user?.prenom||"")+" "+(user?.nom||""),asmatTel:user?.tel||"",asmatAgreme
  nom:enfant.nom||"",prenom:enfant.prenom||"",naissance:enfant.naissance||"",sexe:""
  mereNom:"",mereTel:"",mereTravail:"",mereEmail:"",mereEmployeur:"",
  pereNom:"",pereTel:"",pereTravail:"",pereEmail:"",pereEmployeur:"",
  p1Nom:"",p1Lien:"",p1Tel:"",p2Nom:"",p2Lien:"",p2Tel:"",p3Nom:"",p3Lien:"",p3Tel:"
  medecin:"",medecinTel:"",groupe:"",vaccins:"Oui",pai:"Non",
  allergies:enfant.allergies?.join(", ")||"",traitements:"",particularites:"",
  authUrgences:true,authParacetamol:false,authSorties:true,authVoiture:true,authPhot
});
const set=(k,v)=>setForm(p=>({...p,[k]:v}));
// Re-fill when enfant changes
useEffect(()=>{
  if(!enfant?.id)return;
  setForm(p=>({...p,nom:enfant.nom||"",prenom:enfant.prenom||"",naissance:enfant.nai
    allergies:enfant.allergies?.join(", ")||p.allergies}));
},[enfant?.id]);
const genererPDF=()=>{
  const w=window.open("","_blank");
  if(!w){setToast("Autorisez les popups");return;}
  const f=form;
  const authLines=[
    ["Emmener aux urgences",f.authUrgences],["Paracetamol (ordonnance jointe)",f.aut
    ["Sorties exterieures",f.authSorties],["Transport en voiture",f.authVoiture],["P
  ].map(([l,v])=>"<div style='margin:6px 0;font-size:13px'><span style='color:"+(v?"
  const html=[
    "<!DOCTYPE html><html lang='fr'><head><meta charset='UTF-8'/><title>Fiche urgenc
    "<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Calibri,sans
    "h1{font-size:22px;text-align:center;letter-spacing:3px;color:#264653;margin-bot
    ".sub{text-align:center;color:#2A9D8F;font-size:14px;margin-bottom:4px}",
    ".note{text-align:center;color:#bbb;font-size:11px;margin-bottom:20px;font-style
    ".sh{font-size:14px;font-weight:700;color:#264653;letter-spacing:2px;border-bott
    ".stt{font-weight:700;color:#2A9D8F;font-size:13px;margin:14px 0 6px}",
    ".line{border-bottom:1px solid #d0d0d0;padding:6px 0;margin:4px 0}",
    ".line b{color:#264653}",
    ".urg{background:#FEF2F2;padding:8px 14px;margin:4px 0;border-radius:6px}",
    ".urg span{color:#E76F51;font-weight:700;font-size:18px}",
    "@media print{.noprint{display:none}}</style></head><body>",
    "<h1>FICHE D'URGENCE</h1>",
    "<div class='sub'>Assistante maternelle agreee</div>",
    "<div class='note'>A remettre des le debut de l'accueil | A mettre a jour chaque
    "<div class='line'><b>Assistante maternelle :</b> "+f.asmatNom+"</div>",
    "<div class='line'><b>Telephone :</b> "+f.asmatTel+"</div>",
nt:user
,adress
",
os:fals
ssance|
hParace
hotos (
#2A9D8F
e - "+f
-serif;
tom:2px
:italic
om:3px
annee<

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
  ...[1,2,3].map(n=>"<div class='stt'>Personne "+n+"</div><div class='line'><b>Nom
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
  "<p style='margin-bottom:16px'>Je soussigne(e), certifie l'exactitude des rensei
  "<div class='line'><b>Fait a :</b></div><div class='line'><b>Le :</b></div>",
  "<div style='display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:20px
  "<div><div style='font-weight:700;margin-bottom:60px'>Signature parent :</div></
  "<div><div style='font-weight:700;margin-bottom:60px'>Signature assmat :</div></
  "<p style='text-align:center;color:#ccc;font-size:10px;margin-top:20px'>Genere p
  "<div class='noprint' style='text-align:center;margin-top:16px'><button onclick=
  "</body></html>"
].join("");
w.document.write(html);w.document.close();
:</b>
gnement
'>",
div>",
div></d
ar TiMa
'window

 setToast("Fiche generee ✓"); };
// Parent: read-only view
if(role==="parent"){
  const f=form;
  const line=(label,val)=>val?<div style={{display:"flex",justifyContent:"space-betw
    <span style={{fontWeight:600,color:"var(--b)"}}>{label}</span><span style={{colo
  </div>:null;
  return <div className="fi">
<PageHeadericon=" "title="Fiched'urgence"sub={"Fichede"+(enfant.prenom||" <div className="card"style={{padding:20}}>
      <div style={{fontWeight:700,fontSize:15,color:"var(--b)",marginBottom:14}}>
      {line("Nom",f.nom)}{line("Prenom",f.prenom)}{line("Date de naissance",f.naissa
      <div style={{fontWeight:700,fontSize:14,color:"var(--T)",margin:"18px 0 10px"}
      {line("Medecin",f.medecin||"A completer")}{line("Telephone medecin",f.medecinT
      <div style={{fontWeight:700,fontSize:14,color:"var(--T)",margin:"18px 0 10px"}
      {line("SAMU","15")}{line("Pompiers","18")}{line("Urgences","112")}{line("Centr
      <button className="btn bT"style={{width:"100%",marginTop:14}}onClick={genererP
    </div>
  </div>;
}
const inp=(label,key,ph)=><div style={{marginBottom:10}}>
  <label style={{fontSize:11,fontWeight:600,color:"var(--l)",display:"block",marginB
  <input className="inp"value={form[key]}onChange={e=>set(key,e.target.value)}placeh
</div>;
const ta=(label,key,ph)=><div style={{marginBottom:10}}>
  <label style={{fontSize:11,fontWeight:600,color:"var(--l)",display:"block",marginB
  <textarea className="ta"value={form[key]}onChange={e=>set(key,e.target.value)}plac
</div>;
const chk=(label,key)=><div style={{display:"flex",alignItems:"center",gap:8,marginB
  <div style={{width:20,height:20,borderRadius:6,border:"2px solid "+(form[key]?"var
  <span style={{fontSize:12,color:"var(--b)"}}>{label}</span>
</div>;
return <div className="fi">
{toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
<PageHeadericon=" "title="Fiched'urgence"sub="Pre-remplieaveclesdonneesde {role==="asmat"&&liste.length>1&&<div style={{display:"flex",gap:8,marginBottom:14
    {liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>setSelId(e.id
  <div className="g2">
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <div className="card"style={{padding:16}}>
        <div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:12}}>
        {inp("Nom","nom")}{inp("Prenom","prenom")}{inp("Date de naissance","naissanc
      </div>
  een",pa
r:"var(
votre
{enfan nce)}{l }> M el)}{li }> N e anti- DF}>
ottom:3
older={
ottom:3
eholder
ottom:6
(--S)":
 l'enf
,flexWr
)}/>)}<
Enfa e","JJ/
     e t e u
a
n

         <div className="card"style={{padding:16}}>
          <div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:12}}>
          {inp("Nom et prenom","mereNom")}{inp("Telephone","mereTel")}{inp("Email","me
        </div>
        <div className="card"style={{padding:16}}>
          <div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:12}}>
          {inp("Nom et prenom","pereNom")}{inp("Telephone","pereTel")}{inp("Email","pe
        </div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div className="card"style={{padding:16}}>
          <div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:12}}>
          {[1,2,3].map(n=><div key={n}style={{marginBottom:10,padding:10,background:"v
            <div style={{fontSize:11,fontWeight:700,color:"var(--l)",marginBottom:6}}>
            {inp("Nom","p"+n+"Nom")}{inp("Lien","p"+n+"Lien","Grand-parent, oncle...")
          </div>)}
        </div>
        <div className="card"style={{padding:16}}>
          <div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:12}}>
          {inp("Medecin traitant","medecin")}{inp("Tel medecin","medecinTel")}{inp("Gr
          {ta("Allergies","allergies","Aucune connue")}{ta("Traitements","traitements"
        </div>
        <div className="card"style={{padding:16}}>
          <div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:12}}>
          {chk("Emmener aux urgences","authUrgences")}
          {chk("Paracetamol (ordonnance jointe)","authParacetamol")}
          {chk("Sorties exterieures","authSorties")}
          {chk("Transport en voiture","authVoiture")}
          {chk("Photos (usage interne)","authPhotos")}
        </div>
        <button className="btn bT"style={{width:"100%",padding:"14px",fontSize:14}}onC
             Generer la fiche d'urgence PDF
        </button>
      </div>
    </div>
  </div>;
}
// ========== PROJET D'ACCUEIL (dans l'app) ==========
function ProjetAccueil({user,role}){
  const [toast,setToast]=useState("");
  // Parent: read-only view
  if(role==="parent"){
return <div className="fi">
<PageHeadericon=" "title="Projetd'accueil"sub="Leprojetd'accueildevotre <div className="card"style={{padding:20,textAlign:"center"}}>
  Mere reEmail
Pere reEmail
  Pers
ar(--c)
Personn
}{inp("
  Medi
oupe sa
,"Aucun
Auto
lick={g
assis
     <
<
o
c
r
t

  <divstyle={{fontSize:48,marginBottom:16}}> </div>
<div style={{fontSize:16,fontWeight:700,color:"var(--b)",marginBottom:8}}>Proj <div style={{fontSize:13,color:"var(--m)",lineHeight:1.7,marginBottom:16}}>
        Le projet d'accueil est un document redige par votre assistante maternelle.
      </div>
      <div style={{padding:14,background:"var(--Bp)",borderRadius:12,fontSize:12,col
           Demandez a votre assistante maternelle de vous transmettre son projet d'a
      </div>
    </div>
</div>; }
const [form,setForm]=useState({
  nom:(user?.prenom||"")+" "+(user?.nom||""),adresse:"",tel:user?.tel||"",email:user
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
  alimentationPerso:"",sommeilPerso:"",activitesPerso:"",communicationPerso:"",concl
});
const set=(k,v)=>setForm(p=>({...p,[k]:v}));
const setHoraire=(i,field,v)=>setForm(p=>{const h=[...p.horaires];h[i]={...h[i],[fie
const inp=(label,key,ph)=><div style={{marginBottom:10}}>
  <label style={{fontSize:11,fontWeight:600,color:"var(--l)",display:"block",marginB
  <input className="inp"value={form[key]}onChange={e=>set(key,e.target.value)}placeh
</div>;
const ta=(label,key,ph,rows)=><div style={{marginBottom:10}}>
  <label style={{fontSize:11,fontWeight:600,color:"var(--l)",display:"block",marginB
  <textarea className="ta"value={form[key]}onChange={e=>set(key,e.target.value)}plac
</div>;
const genererPDF=()=>{
  const w=window.open("","_blank");
  if(!w){setToast("Autorisez les popups");return;}
  const f=form;
  const horairesHTML=f.horaires.map(h=>"<tr><td style='background:#F4F7FA;padding:8p
  const html=[
 "<!DOCTYPE html><html lang='fr'><head><meta charset='UTF-8'/><title>Projet d'acc
et d'ac
Il decr
or:"var
ccueil
?.email
usion:"
ld]:v};
ottom:3
older={
ottom:3
eholder
x 14px;
ueil</t

 "<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Calibri,sans
"h1{font-size:28px;text-align:center;letter-spacing:4px;color:#264653;margin-bot
".sub{text-align:center;color:#2A9D8F;font-size:15px;margin-bottom:20px}",
".info{text-align:center;color:#aaa;font-size:12px;margin-bottom:4px}",
".sh{font-size:15px;font-weight:700;color:#264653;letter-spacing:2px;border-bott
".stt{font-weight:700;color:#2A9D8F;font-size:14px;margin:18px 0 8px}",
"p{margin:6px 0}ul{padding-left:22px;margin:6px 0}li{margin:4px 0}",
"table{width:100%;border-collapse:collapse;margin:12px 0}",
".cover{page-break-after:always;display:flex;flex-direction:column;align-items:c
".cover h1{font-size:36px;letter-spacing:8px;margin-bottom:8px}",
".cover .line{border-bottom:1px solid #d0d0d0;width:300px;margin:8px auto;paddin
".cover .label{color:#aaa;font-size:11px;margin-top:16px}",
"@media print{.noprint{display:none}.cover{min-height:100vh}}</style></head><bod
// PAGE DE GARDE
"<div class='cover'>",
"<h1>PROJET D'ACCUEIL</h1>",
"<div class='sub'>Assistante maternelle agreee</div>",
"<div style='border-top:3px solid #2A9D8F;border-bottom:3px solid #2A9D8F;paddin
"<div class='line' style='font-weight:700;font-size:18px'>"+f.nom+"</div>",
"<div class='label'>Adresse</div><div class='line'>"+f.adresse+"</div>",
"<div class='label'>Telephone</div><div class='line'>"+f.tel+"</div>",
"<div class='label'>Email</div><div class='line'>"+f.email+"</div>",
"<div class='label'>Agrement</div><div class='line'>"+f.agrement+"</div>",
"</div>",
"<div style='color:#2A9D8F;font-size:16px;font-weight:700'>"+new Date().getFullY
"</div>",
// CONTENU
"<div class='sh'>01  Introduction</div>",
"<p>Ce projet d'accueil a pour objectif de vous presenter ma pratique profession
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
"<p>Chaque enfant est unique et se developpe a son propre rythme. Je m'engage a
"<div class='stt'>Autonomie progressive</div>",
"<p>J'encourage l'enfant a faire par lui-meme dans un cadre securise.</p>",
"<div class='stt'>Attachement securise</div>",
"<p>Je m'engage a etre presente, reactive et previsible pour que l'enfant se sen
"<div class='stt'>Communication bienveillante</div>",
"<p>Face a un comportement difficile, je mets des mots sur les emotions et je po
f.valeursPerso?"<div class='stt'>Mes valeurs complementaires</div><p>"+f.valeurs
-serif;
tom:4px
om:3px
enter;j
g:8px 0
y>",
g:16px
ear()+"
nelle,
respect
te en s
se des
Perso.r

     "<div class='sh'>04  Organisation de la journee</div>",
    "<table>"+horairesHTML+"</table>",
    "<div class='sh'>05  Alimentation</div>",
    "<ul><li>Repas faits maison avec des produits frais et de saison</li><li>Respect
    f.alimentationPerso?"<p>"+f.alimentationPerso.replace(/\n/g,"<br/>")+"</p>":"",
    "<div class='sh'>06  Sommeil et repos</div>",
    "<ul><li>Espace calme, securise et personnel</li><li>Rituel d'endormissement ind
    f.sommeilPerso?"<p>"+f.sommeilPerso.replace(/\n/g,"<br/>")+"</p>":"",
    "<div class='sh'>07  Activites et eveil</div>",
    "<ul><li>Motricite globale : parcours, danse, ballon, jardin</li><li>Motricite f
    f.activitesPerso?"<p>"+f.activitesPerso.replace(/\n/g,"<br/>")+"</p>":"",
    "<div class='sh'>08  Sante et securite</div>",
    "<ul><li>Domicile securise selon les recommandations de la PMI</li><li>Formee au
    "<div class='sh'>09  Partenariat avec les parents</div>",
    "<ul><li>Transmissions quotidiennes : repas, sommeil, activites, humeur</li><li>
    f.communicationPerso?"<p>"+f.communicationPerso.replace(/\n/g,"<br/>")+"</p>":""
    "<div class='sh'>10  Periode d'adaptation</div>",
    "<p>L'adaptation dure generalement 1 a 2 semaines.</p>",
    "<table>",
    "<tr><td style='background:#F0FAF4;padding:8px 14px;font-weight:700;color:#2A9D8
    "<tr><td style='background:#F0FAF4;padding:8px 14px;font-weight:700;color:#2A9D8
    "<tr><td style='background:#F0FAF4;padding:8px 14px;font-weight:700;color:#2A9D8
    "<tr><td style='background:#F0FAF4;padding:8px 14px;font-weight:700;color:#2A9D8
    "</table>",
    "<div class='sh'>Pour conclure</div>",
    "<p>Ce projet d'accueil est un document vivant. N'hesitez pas a en discuter avec
    f.conclusion?"<p>"+f.conclusion.replace(/\n/g,"<br/>")+"</p>":"",
    "<div style='margin-top:30px'><p><b>Fait a :</b> ________________________   <b>L
    "<div style='display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:30px
    "<div><p style='font-weight:700'>L'assistante maternelle :</p><div style='height
    "<div><p style='font-weight:700'>Les parents :</p><div style='height:80px'></div
    "<p style='text-align:center;color:#ccc;font-size:10px;margin-top:30px'>Genere p
    "<div class='noprint' style='text-align:center;margin-top:16px'><button onclick=
    "</body></html>"
].join(""); w.document.write(html);w.document.close(); setToast("Projet d'accueil genere ✓");
};
return <div className="fi">
{toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
<PageHeadericon=" "title="Projetd'accueil"sub="Redigezetgenerezvotreproje <div className="g2">
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <div className="card"style={{padding:16}}>
        <div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:12}}>
        {inp("Nom et prenom","nom")}{inp("Adresse","adresse")}{inp("Telephone","tel"
 des re
ividual
ine : g
x geste
Disponi ,
F;width
F;width
F;width
F;width
moi a
e :</b>
'>",
:80px'>
></div>
ar TiMa
'window
t d'ac
Mes )}{inp(
 c
i

         </div>
        <div className="card"style={{padding:16}}>
          <div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:12}}>
          {ta("Pourquoi j'aime ce metier, ce qui me motive","intro","Depuis X ans, j'e
        </div>
        <div className="card"style={{padding:16}}>
          <div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:12}}>
          {ta("Mon parcours et mes formations","parcours","CAP AEPE, formations IPERIA
          {ta("Mon agrement en detail","agrementDetail","Agree pour X enfants, de X mo
          {ta("Mon domicile et ses amenagements","domicile","Maison avec jardin, espac
        </div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div className="card"style={{padding:16}}>
          <div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:12}}>
          <div style={{fontSize:11,color:"var(--l)",marginBottom:8,lineHeight:1.6}}>Le
          {ta("Mes valeurs complementaires","valeursPerso","Motricite libre, pedagogie
        </div>
        <div className="card"style={{padding:16}}>
          <div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:12}}>
          {form.horaires.map((h,i)=><div key={i}style={{display:"flex",gap:6,marginBot
            <input className="inp"style={{width:110,flexShrink:0,fontSize:11}}value={h
            <input className="inp"style={{flex:1,fontSize:11}}value={h.d}onChange={e=>
          </div>)}
        </div>
        <div className="card"style={{padding:16}}>
          <div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:12}}>
          {ta("Alimentation","alimentationPerso","Bio, potager, menus de la semaine...
          {ta("Sommeil","sommeilPerso","Piece dediee, babyphone, gigoteuse...",2)}
          {ta("Activites","activitesPerso","Yoga enfant, jardinage, sorties nature..."
          {ta("Communication avec les parents","communicationPerso","Application TiMat
        </div>
        <div className="card"style={{padding:16}}>
          <div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:12}}>
          {ta("Mon mot de conclusion","conclusion","Ce projet d'accueil est le reflet
        </div>
        <button className="btn bT"style={{width:"100%",padding:"14px",fontSize:14}}onC
             Generer mon projet d'accueil PDF
        </button>
      </div>
    </div>
  </div>;
}
// ========== BOUTIQUE ==========
function Boutique({user}){
 const [toast,setToast]=useState("");
Mon xerce l
Ma p , exper
is a X e de je
Mes s valeu
Montes
  Ma j
tom:4}}
.h}onCh
setHora
Mes ",2)}
,2)}
, cahie
Conc de mon
lick={g
      i
r
v
o
s
l

 const isPro=user?.subscription_status==="pro";
const products=[
  {id:"kit_sheets",name:"Kit Google Sheets Assmat",price:"14,90",desc:"7 tableurs in
  {id:"fiche_urgence",name:"Fiche d'urgence",price:"4,90",desc:"Fiche complete a rem
  {id:"projet_accueil",name:"Projet d'accueil",price:"9,90",desc:"10 sections : pres
  {id:"pack_complet",name:"Pack Complet",price:"24,90",desc:"Les 3 produits reunis.
];
const acheter=async(product)=>{
  try{
    const res=await fetch('/api/create-checkout-session',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({userId:user?.id,email:user?.email,prenom:user?.prenom,pro
    });
    const data=await res.json();
    if(data.url)window.location.href=data.url;
    else setToast("Erreur de paiement — reessayez");
  }catch(e){setToast("Erreur reseau");}
};
return <div className="fi">
{toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
<PageHeadericon=" "title="BoutiqueTiMat"sub="Templatesetoutilspoursimplif {isPro&&<div style={{background:"var(--Sp)",border:"1px solid var(--Sl)",borderRad
       En tant qu'abonnee Pro, vous beneficiez de -20% sur tous les produits de la b
  </div>}
  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr
    {products.map(p=><div key={p.id}className="card"style={{padding:0,overflow:"hidd
      <div style={{height:80,background:"linear-gradient(135deg,"+p.color+"20,"+p.co
{p.icon}
        {p.badge&&<div style={{position:"absolute",top:8,right:8,background:p.color,
      </div>
      <div style={{padding:16,flex:1,display:"flex",flexDirection:"column"}}>
        <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:6}}>{p
        <div style={{fontSize:12,color:"var(--l)",lineHeight:1.6,flex:1,marginBottom
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"cente
          <div>
            {isPro&&<span style={{fontSize:11,color:"var(--l)",textDecoration:"line-
            <span style={{fontSize:18,fontWeight:700,color:p.color}}>{isPro?(parseFl
</div>
          <button className="btn bT"style={{fontSize:12,padding:"8px 16px"}}onClick=
        </div>
      </div>
    </div>)}
  </div>
  <div style={{marginTop:20,textAlign:"center",fontSize:12,color:"var(--l)"}}>
  Paiement securise par Stripe. Telechargement immediat apres achat.
terconn
plir :
entatio
Economi
ductId:
ier vo
ius:10,
outiqu
))",gap
en",dis
lor+"08
color:"
.name}<
:12}}>{
r"}}>
through
oat(p.p
{()=>ac
t e

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
texte:"TiMat a été créé par une développeuse passionnée de petite enfance, pour le illustration:" ",
btn:"Je commence →",
}, {
}, {
}, {
}, {
     emoji:" ",
color:"#C4714A",
bg:"linear-gradient(135deg,#FEF6F0,#FFF8F4)",
titre:"Le journal du quotidien",
sousTitre:"Ce que vous faites chaque jour, simplifié.",
texte:"Pointages, repas, siestes, activités, transmissions aux parents... Tout se illustration:" ",
btn:"Suivant →",
  emoji:" ",
color:"#C49A3A",
bg:"linear-gradient(135deg,#FFFBF0,#FEF9E8)",
titre:"L'administratif, enfin simple",
sousTitre:"Vous n'êtes pas comptable. On s'en occupe.",
texte:"Salaires, bulletins, Pajemploi, contrats, avenants, courriers types... TiMa illustration:" ",
btn:"Suivant →",
  emoji:" ",
color:"#3D70A0",
bg:"linear-gradient(135deg,#F0F8FF,#EAF4FF)",
titre:"Le lien avec les parents",
sousTitre:"Une relation transparente, apaisée.",
texte:"Les parents accèdent à leur propre espace : journal, pointages, contrat, me illustration:" ",
btn:"Suivant →",
 s assis
note en
t calcu
ssageri

  emoji:" ",
color:"#6B8F71",
bg:"linear-gradient(135deg,#F0FAF4,#EEF8F2)",
titre:"Vous êtes prête !",
sousTitre:"TiMat est à vous. Prenez votre temps.",
texte:"Commencez par ajouter votre premier enfant, ou explorez librement. Si vous illustration:" ",
btn:"Découvrir TiMat ",
}, ];
function Onboarding({onFinish,user}){
  const [step,setStep]=useState(0);
  const s=ONBOARD_STEPS[step];
  const isLast=step===ONBOARD_STEPS.length-1;
  const pct=Math.round(((step+1)/ONBOARD_STEPS.length)*100);
  return(
    <div style={{minHeight:"100vh",background:s.bg,display:"flex",alignItems:"center",
      <div style={{width:"100%",maxWidth:480}}>
        {/* Barre de progression */}
        <div style={{display:"flex",gap:6,marginBottom:32,alignItems:"center"}}>
          {ONBOARD_STEPS.map((_,i)=>(
            <div key={i}style={{
              flex:1,height:4,borderRadius:2,
              background:i<=step?s.color:"rgba(0,0,0,.1)",
              transition:"background .4s",
}}/> ))}
          <span style={{fontSize:11,color:"rgba(0,0,0,.35)",marginLeft:6,flexShrink:0}
        </div>
        <div style={{background:"#fff",borderRadius:24,overflow:"hidden",boxShadow:"0
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
  avez la
justify
}>{pct}
8px 48p

     padding:"4px 14px",marginBottom:14,
  }}>
    <span style={{fontSize:14}}>{s.emoji}</span>
    <span style={{fontSize:11,fontWeight:700,color:s.color,textTransform:"up
  </div>
  <div style={{
    fontFamily:"'Fraunces',Georgia,serif",
    fontSize:"clamp(20px,4vw,26px)",fontWeight:700,
    color:"#0D1B2A",lineHeight:1.2,
  }}>{s.titre}</div>
</div>
{/* Corps */}
<div style={{padding:"28px 32px 32px"}}>
  <p style={{fontSize:14,color:"#4A3728",lineHeight:1.85,marginBottom:28,mar
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
}} >
      Passer le tutoriel
    </button>
)}
percase
gin:"0

           </div>
        </div>
        {/* Prénom de l'utilisateur */}
        {user?.prenom&&step===0&&(
<div style={{textAlign:"center",marginTop:16,fontSize:13,color:"rgba(0,0,0,. Bonjour {user.prenom} - ravi de vous accueillir
</div> )}
        <div style={{textAlign:"center",marginTop:10,fontSize:11,color:"rgba(0,0,0,.25
          {step+1} sur {ONBOARD_STEPS.length}
        </div>
      </div>
</div> );
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
return( <>
<Styles/>
      <div style={{minHeight:"100vh",background:"var(--c)",display:"flex",alignItems:"
    <div style={{width:"100%",maxWidth:420}}>
<div style={{textAlign:"center",marginBottom:32}}> <divstyle={{fontSize:56,marginBottom:8}}> </div>
<div className="pf"style={{fontSize:38,fontWeight:700,color:"var(--T)",fontSty <div style={{fontSize:14,color:"var(--l)",marginTop:4}}>L'application qui réin <div style={{display:"flex",gap:8,justifyContent:"center",marginTop:12,flexWra
{[" Bilan de journée"," CR Trimestriel"," Pajemploi"," Attestation <span key={t}className="badge"style={{background:"var(--Tp)",color:"var(--
        </div>
      </div>
      <div className="card"style={{padding:24}}>
        <div className="pf"style={{fontSize:17,fontWeight:700,color:"var(--b)",marginB
        <div style={{marginBottom:14}}>
      <label className="lbl">Email</label>
45)"}}>
)"}}>
center"
le:"ita
vente l
p:"wrap
fiscale
T)",fon
ottom:1

           <input className="inp"type="email"placeholder="votre@email.fr"value={email}
            onChange={e=>{setEmail(e.target.value);setErr("");}}onKeyDown={e=>e.key===
          {err&&<div style={{color:"var(--R)",fontSize:12,marginTop:4}}>{err}</div>}
        </div>
        <button className="btn bT"style={{width:"100%",justifyContent:"center",padding
          Se connecter
        </button>
        <div style={{background:"var(--c)",borderRadius:10,padding:14}}>
          <div style={{fontSize:11,fontWeight:700,color:"var(--l)",marginBottom:8,text
          {comptes.map(c=><button key={c.id}onClick={()=>{setEmail(c.email);setErr("")
            style={{display:"block",width:"100%",textAlign:"left",padding:"8px 10px",b
            onMouseEnter={e=>e.currentTarget.style.background="var(--br)"}
            onMouseLeave={e=>e.currentTarget.style.background="none"}>
            <span style={{fontWeight:700,color:c.role==="asmat"?"var(--T)":"var(--B)"}
{c.role==="asmat"?"     ":"   "}</span> {c.label}
<span style={{fontSize:11,color:"var(--l)",display:"block",paddingLeft:18}
          </button>)}
        </div>
      </div>
    </div>
</div> </>
);
}
//
//
// Accessible uniquement à sophie@faitacreas.fr (ou l'email admin configuré)
const ADMIN_EMAIL = "faitacreapro@gmail.com";
// --- Backoffice reusable components (outside to avoid re-mount on state change) ---
const BOField=({label,children,hint})=>(
  <div style={{marginBottom:10}}>
    <div style={{fontSize:10,fontWeight:700,color:"var(--m)",marginBottom:3,textTransf
    {children}
    {hint&&<div style={{fontSize:10,color:"var(--l)",marginTop:3,fontStyle:"italic"}}>
</div> );
const BOColorInput=({k,state,setter})=>{
  const v=state[k]||"";
  const isSolid=/^#[0-9a-fA-F]{3,8}$/.test(v);
  return (
    <div style={{display:"flex",gap:4,alignItems:"center"}}>
      {isSolid&&<input type="color"value={v.slice(0,7)}onChange={e=>setter(k,e.target.
      <input className="inp"style={{flex:1,fontSize:10,padding:"5px 7px",minWidth:0}}v
      <div style={{width:20,height:20,borderRadius:4,background:v||"transparent",borde
"Enter"
:"12px"
Transfo
;}}
ackgrou
}> }>{c.hi
orm:"up
{hint}<
value)}
alue={v
r:"1px

 </div> );
};
const BOTextInput=({k,state,setter,multi,placeholder})=>(
  multi
    ?<textarea className="inp"rows={3}style={{fontSize:11,padding:"6px 8px",resize:"ve
    :<input className="inp"style={{fontSize:11,padding:"6px 8px",width:"100%",boxSizin
);
const BOAlignInput=({k,state,setter})=>(
  <div style={{display:"flex",gap:2}}>
{[["left","☰ Gauche"],["center","☰ Centre"],["right","☰ Droite"],["justify","☰ J flex:1,padding:"5px 0",border:"1px solid var(--br)",borderRadius:6,cursor:"point background:state[k]===a?"var(--S)":"var(--c)",color:state[k]===a?"#fff":"var(--m
    }}>{label}</button>)}
  </div>
);
const BOCard=({title,icon,children})=>(
  <div className="card"style={{padding:14,marginBottom:10}}>
    {title&&<div style={{fontWeight:700,fontSize:12,marginBottom:10,color:"var(--b)",d
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
      const {count:u}=await supabase.from('profiles').select('*',{count:'exact',head:t
      const {count:p}=await supabase.from('profiles').select('*',{count:'exact',head:t
      const {count:e}=await supabase.from('enfants').select('*',{count:'exact',head:tr
      setStats({users:u||0,pro:p||0,enfants:e||0});
}; load();
rtical"
g:"bord
ustifié
er",fon
)",tran
isplay:
rue});
rue}).e
ue});

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
const setPain=(idx,field,v)=>setCfg(c=>{const pp=[...(c.painPoints||[])];pp[idx]={.. const setTransfo=(idx,pos,v)=>setCfg(c=>{const tt=[...(c.transformations||[])];const const setTesti=(idx,field,v)=>setCfg(c=>{const tt=[...(c.testimonials||[])];tt[idx]= const setStat=(which,idx,field,v)=>setCfg(c=>{const ss=[...(c[which]||[])];ss[idx]={ constaddPain=()=>setCfg(c=>({...c,painPoints:[...(c.painPoints||[]),{ic:" ",titre: const removePain=(idx)=>setCfg(c=>({...c,painPoints:(c.painPoints||[]).filter((_,i)= const addTesti=()=>setCfg(c=>({...c,testimonials:[...(c.testimonials||[]),{nom:"Nouv const removeTesti=(idx)=>setCfg(c=>({...c,testimonials:(c.testimonials||[]).filter(( // Free/Pro/Guarantees
const setFreeItem=(idx,pos,v)=>setCfg(c=>{const items=[...(c.freeItems||[])];const r const addFreeItem=()=>setCfg(c=>({...c,freeItems:[...(c.freeItems||[]),[true,"Nouvel const removeFreeItem=(idx)=>setCfg(c=>({...c,freeItems:(c.freeItems||[]).filter((_,i const setProItem=(idx,v)=>setCfg(c=>{const items=[...(c.proItems||[])];items[idx]=v; const addProItem=()=>setCfg(c=>({...c,proItems:[...(c.proItems||[])," Nouvelle fon const removeProItem=(idx)=>setCfg(c=>({...c,proItems:(c.proItems||[]).filter((_,i)=> const setGuarantee=(idx,v)=>setCfg(c=>{const items=[...(c.guarantees||[])];items[idx const addGuarantee=()=>setCfg(c=>({...c,guarantees:[...(c.guarantees||[])," Nouvel const removeGuarantee=(idx)=>setCfg(c=>({...c,guarantees:(c.guarantees||[]).filter((
const sauvegarder=async()=>{
  setSaving(true);
  Object.assign(G, JSON.parse(JSON.stringify(cfg)));
  applyColsToDOM(cfg.cols);
  setAppConfig(JSON.parse(JSON.stringify(cfg)));
  const result=await saveConfig();
  if(result.ok){
setToast(" Sauvegardé ! Changements en ligne."); }else{
setToast(" Échec : "+result.error);
    console.error("Échec sauvegarde:", result.error);
  }
  setSaving(false);
};
     const reset=()=>{
.pp[idx
 row=[.
{...tt[
...ss[i
"Nouve
>i!==id
eau",vi
_,i)=>i
ow=[...
le fonc
)=>i!==
return{
ctionn
i!==idx
]=v;ret
le gar
_,i)=>i
a
a
a

 if(!window.confirm("Réinitialiser toute la config ? Les modifications non sauvegar setCfg(JSON.parse(JSON.stringify(DEFAULT_CONFIG)));
setToast(" Config réinitialisée (cliquer Sauvegarder pour valider)");
};
const rechargerDepuisSupabase=async()=>{
  setSaving(true);
  await loadConfig();
  const fromDb=JSON.parse(JSON.stringify(G));
  setCfg(fromDb);
setAppConfig(fromDb);
setToast(" Config rechargée depuis Supabase"); setSaving(false);
};
const diagnostiquer=async()=>{
  try{
let report=" DIAGNOSTIC SUPABASE\n\n";
    // 1. Test lecture
    const {data:readData,error:readErr}=await supabase.from('app_config').select('*'
    if(readErr){
report+=" LECTURE : "+readErr.message+"\n"; if(readErr.message.includes('relation')||readErr.message.includes('does not ex
report+="\n La table n\'existe pas. Exécute dans Supabase SQL Editor :\n\n }else if(readErr.message.includes('policy')||readErr.message.includes('permiss report+="\n Problème RLS. Exécute :\n\nDROP POLICY IF EXISTS \"admin_all\"
}
      alert(report);return;
    }
      if(!readData){
  report+="
}else{
  let parsed;
  try{
LECTURE : Table vide (aucune ligne avec id='main')\n\n";
   parsed=typeof readData.config==='string'?JSON.parse(readData.config):readDat
}catch(e){
  parsed={_raw:readData.config,_parseError:e.message};
}
report+=" LECTURE OK\n";
report+=" Type colonne config : "+(typeof readData.config)+"\n"; report+=" Dernière maj : "+readData.updated_at+"\n"; if(parsed&&typeof parsed==='object'){
  report+="  Clés : "+Object.keys(parsed).join(", ")+"\n";
  report+="  landing : "+(parsed.landing?Object.keys(parsed.landing).length:0)
  report+="  txts : "+(parsed.txts?Object.keys(parsed.txts).length:0)+" champs
 }
dées se
).eq('i
ist')){
CREATE
ion')){
ON ap
a.confi
+" cham
\n\n";
p

 }
  // 2. Test écriture JSONB (objet)
  const tsJsonb=Date.now();
  const {error:errJsonb}=await supabase.from('app_config').upsert({id:'_diag_test_
  if(errJsonb){
report+=" ÉCRITURE JSONB (objet) : "+errJsonb.message+"\n"; }else{
report+=" ÉCRITURE JSONB OK\n"; }
  // 3. Test écriture TEXT (string)
  const {error:errText}=await supabase.from('app_config').upsert({id:'_diag_test_t
  if(errText){
report+=" ÉCRITURE TEXT (string) : "+errText.message+"\n"; }else{
report+=" ÉCRITURE TEXT OK\n"; }
  // Cleanup test rows
  try{
    await supabase.from('app_config').delete().in('id',['_diag_test_jsonb','_diag_
  }catch(e){}
  // Suggestions
  if(errJsonb&&!errText){
report+="\n Ta colonne config est de type TEXT, pas JSONB.\nL\'app gère ça a }else if(!errJsonb&&errText){
report+="\n Ta colonne config est de type JSONB. OK."; }else if(errJsonb&&errText){
report+="\n Aucun format ne marche. Problème RLS probable.\n\nExécute :\n\nD }
  alert(report);
}catch(e){
alert(" Exception dans le diagnostic : "+e.message+"\n\n"+e.stack);
  console.error(e);
}
        };
// Google Fonts presets
const FONT_PRESETS=[
  {name:"Fraunces + Jakarta (défaut)",title:"\'Fraunces\', Georgia, serif",body:"\'P
  {name:"Playfair + Inter",title:"\'Playfair Display\', serif",body:"\'Inter\', sans
  {name:"Cormorant + Lato",title:"\'Cormorant Garamond\', serif",body:"\'Lato\', san
  {name:"DM Serif + DM Sans",title:"\'DM Serif Display\', serif",body:"\'DM Sans\',
  {name:"Poppins partout",title:"\'Poppins\', sans-serif",body:"\'Poppins\', sans-se
jsonb',
ext',co
test_te
utomat
ROP PO
lus Jak
-serif"
s-serif
sans-se
rif",ur
i
L

   {name:"Montserrat + Open Sans",title:"\'Montserrat\', sans-serif",body:"\'Open San
  {name:"Raleway + Roboto",title:"\'Raleway\', sans-serif",body:"\'Roboto\', sans-se
  {name:"Merriweather + Source Sans",title:"\'Merriweather\', serif",body:"\'Source
];
const applyFontPreset=(p)=>{ setLand("fontTitle",p.title); setLand("fontBody",p.body); setLand("googleFontsUrl",p.url);
setToast(" Police \""+p.name+"\" appliquée");
};
// --- Reusable components ---
// Helper to filter by search
const matches=(txt)=>!search||txt.toLowerCase().includes(search.toLowerCase());
// Main nav sections
const secs=[
{id:"hero",l:"Hero",ic:" "}, {id:"sections",l:"Sections",ic:" "}, {id:"textes",l:"Textes",ic:" "}, {id:"couleurs",l:"Couleurs",ic:" "}, {id:"boutons",l:"Boutons",ic:" "}, {id:"polices",l:"Polices",ic:"𝐓"}, {id:"contenu",l:"Contenu",ic:" "}, {id:"app",l:"App",ic:" "},
];
return <div className="fi" style={{maxWidth:"100%",padding:0}}>
  {toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
  {/* Top bar */}
  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",pad
<div style={{display:"flex",alignItems:"center",gap:10}}>
<button className="btn bG"style={{fontSize:11,padding:"5px 12px"}}onClick={()= <span style={{fontWeight:700,fontSize:14,color:"var(--b)"}}> Backoffice</spa <input className="inp"placeholder=" Rechercher..."value={search}onChange={e=
    </div>
    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
      <button onClick={diagnostiquer}style={{background:"none",border:"1px solid var
      <button onClick={rechargerDepuisSupabase}style={{background:"none",border:"1px
      <button onClick={()=>setShowPreview(p=>!p)}style={{background:"none",border:"1
      <button className="btn bG"style={{fontSize:11,padding:"5px 12px"}}onClick={res
      <button className="btn bT"style={{fontSize:11,padding:"5px 14px"}}onClick={sau
          </div>
s\', sa
rif",ur
Sans Pr
ding:"1
>setPag
n>
>setSe
(--br)" solid px soli et}>↺ R vegarde
a

 </div>
<div style={{display:"flex",height:"calc(100vh - 52px)",overflow:"hidden"}}>
  {/* LEFT PANEL */}
  <div style={{width:showPreview?"460px":"100%",minWidth:340,overflowY:"auto",padd
    {/* Main tabs */}
    <div style={{display:"flex",gap:3,marginBottom:12,flexWrap:"wrap"}}>
      {secs.map(s=><button key={s.id}onClick={()=>setSec(s.id)}style={{
        padding:"5px 10px",borderRadius:14,border:"none",cursor:"pointer",fontFami
        background:sec===s.id?"var(--S)":"rgba(0,0,0,.05)",color:sec===s.id?"#fff"
      }}>{s.ic} {s.l}</button>)}
    </div>
    {/* ====================== HERO ====================== */}
    {sec==="hero"&&<>
<BOCardtitle="Imagedefond"icon=" ">
<BOField label="URL de l'image" hint="Laisser vide = pas d'image de fond">
          <div style={{display:"flex",gap:4}}>
            <BOTextInput k="heroImg" state={cfg.landing} setter={setLand} placehol
            {cfg.landing.heroImg&&<button onClick={()=>setLand("heroImg","")}style
          </div>
        </BOField>
        {cfg.landing.heroImg&&<>
          <BOField label={`Opacité (${Math.round((cfg.landing.heroImgOpacity||0.12
            <input type="range"min="0"max="1"step="0.05"value={cfg.landing.heroImg
          </BOField>
          <BOField label={`Flou (${cfg.landing.heroImgBlur||2}px)`}>
            <input type="range"min="0"max="10"step="1"value={cfg.landing.heroImgBl
          </BOField>
          <BOField label="Position de l'image">
<div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:3} {[["top left","↖"],["top center","↑"],["top right","↗"],["center lef <button key={pos}onClick={()=>setLand("heroImgPosition",pos)}style padding:"8px 0",border:"1px solid var(--br)",borderRadius:6,curs background:(cfg.landing.heroImgPosition||"center center")===pos? color:(cfg.landing.heroImgPosition||"center center")===pos?"#fff
                }}>{icon}</button>
              )}
            </div>
          </BOField>
          {/* Aperçu miniature */}
          <div style={{height:80,borderRadius:8,overflow:"hidden",border:"1px soli
            <div style={{position:"absolute",inset:0,backgroundImage:"url("+cfg.la
            <div style={{position:"absolute",inset:0,background:cfg.landing.heroBg
            <div style={{position:"relative",display:"flex",alignItems:"center",ju
 </div>
ing:12,
ly:"inh
:"var(-
der="ht
={{back
)*100)}
Opacity
ur||2}
}>
t","←"]
={{
or:"poi
"var(--
":"var(
d var(-
nding.h
||"#264
stifyCo

    </>}
  <BOField label="Fond hero (gradient / couleur)">
    <BOColorInput k="heroBg" state={cfg.landing} setter={setLand}/>
  </BOField>
</BOCard>
<BOCardtitle="Logo"icon=" ">
<BOField label="Image du logo (URL)" hint="Laisse vide pour utiliser l'emo
    <BOTextInput k="logoUrl" state={cfg.landing} setter={setLand} placeholde
  </BOField>
  <BOField label="Emoji du logo (si pas d'image)">
    <BOTextInput k="logoEmoji" state={cfg.landing} setter={setLand} placehol
  </BOField>
  <div style={{marginTop:8,padding:10,background:"#264653",borderRadius:10,d
    {cfg.landing.logoUrl
      ?<img src={cfg.landing.logoUrl}alt="logo"style={{height:28,borderRadiu
      :<div style={{width:28,height:28,borderRadius:8,background:"rgba(255,2
    <span style={{color:"#fff",fontSize:16,fontWeight:700,fontFamily:cfg.lan
    <span style={{fontSize:10,color:"rgba(255,255,255,.4)",marginLeft:"auto"
  </div>
</BOCard>
<BOCardtitle="Navigation"icon=" ">
<div style={{fontSize:11,color:"var(--l)",marginBottom:10,fontWeight:600,t <BOField label="Fond par défaut (tous boutons)"><BOColorInput k="navBtnBg" <BOField label="Couleur texte (tous boutons)"><BOColorInput k="navBtnColor <BOField label="Bordure (tous boutons)"><BOColorInput k="navBtnBorder" sta <div style={{fontSize:11,color:"var(--l)",margin:"12px 0 8px",fontWeight:6 <BOField label="Fond — Fonctionnalités"><BOColorInput k="navFonctionBg" st <BOField label="Fond — Tarifs"><BOColorInput k="navTarifsBg" state={cfg.la <BOField label="Fond — Boutique"><BOColorInput k="navBoutiqueBg" state={cf <BOField label="Fond — Connexion"><BOColorInput k="navConnexionBg" state={ <div style={{fontSize:11,color:"var(--l)",margin:"12px 0 8px",fontWeight:6 <BOField label="Fond CTA"><BOColorInput k="navCtaBg" state={cfg.landing} s <BOField label="Couleur texte CTA"><BOColorInput k="navCtaColor" state={cf <div style={{fontSize:11,color:"var(--l)",margin:"12px 0 8px",fontWeight:6 <BOField label="Fond hamburger"><BOColorInput k="navHamburgerBg" state={cf <BOField label="Couleur icone hamburger"><BOColorInput k="navHamburgerColo <BOField label="Bordure hamburger"><BOColorInput k="navHamburgerBorder" st
</BOCard>
<BOCardtitle="Textesduhero"icon=" ">
<BOField label="Badge (bandeau jaune)"><BOTextInput k="heroBadge" state={c <BOField label="Titre principal"><BOTextInput k="heroTitle" state={cfg.txt <BOField label="Accent du titre (en italique doré)" hint="Laisser vide pou <BOField label="Alignement du hero"><BOAlignInput k="heroAlign" state={cfg <BOField label="Sous-titre (grand)"><BOTextInput k="heroSub" state={cfg.tx
   ji"> r="http
der="
isplay:
s:6,obj
55,255,
ding.fo
}}>Aper
extTran
 state=
" state
te={cfg
00,text
ate={cf
nding}
g.landi
cfg.lan
00,text
etter={
g.landi
00,text
g.landi
r" stat
ate={cf
fg.txts
s} sett
r masqu
.landin
ts} set

     <BOField label="Description sous titre" hint="Utilise \\n pour un retour à
    <BOField label="Tags (séparés par virgule)"><BOTextInput k="heroTags" stat
  </BOCard>
<BOCardtitle="Couleursduhero"icon=" ">
<BOField label="Couleur titre"><BOColorInput k="heroTitleColor" state={cfg <BOField label="Couleur sous-titre"><BOColorInput k="heroSubColor" state={ <BOField label="Couleur description"><BOColorInput k="heroSubDescColor" st <BOField label="Couleur badge (texte)"><BOColorInput k="heroBadgeColor" st <BOField label="Fond badge"><BOColorInput k="heroBadgeBg" state={cfg.landi <BOField label="Couleur tags"><BOColorInput k="heroTagsColor" state={cfg.l <BOField label="Couleur stats (chiffres)"><BOColorInput k="heroStatsColor" <BOField label="Couleur labels stats"><BOColorInput k="heroStatsLabelColor <BOField label="Couleur d\'accent (italique)"><BOColorInput k="accentColor
  </BOCard>
</>}
{/* ====================== SECTIONS ====================== */}
{sec==="sections"&&<>
{[
{key:"s1",titre:"Section1-Problématique",icon:" ",fields:[
      {k:"s1Align",l:"Alignement du texte",type:"align"},
      {k:"s1Title",l:"Titre",type:"txt"},{k:"s1Desc",l:"Description",type:"txt
      {k:"section1Bg",l:"Fond section",type:"col"},{k:"s1TitleColor",l:"Couleu
      {k:"s1CardBg",l:"Fond des cards",type:"col"},{k:"s1CardTitleColor",l:"Co
      {k:"s1QuoteBg",l:"Fond citation",type:"col"},{k:"s1QuoteColor",l:"Couleu
]},
{key:"s2",titre:"Section2-Démointeractive",icon:" ",fields:[
      {k:"s2Align",l:"Alignement du texte",type:"align"},
      {k:"s2Title",l:"Titre",type:"txt"},{k:"s2Desc",l:"Description",type:"txt
      {k:"section2Bg",l:"Fond section",type:"col"},{k:"s2TitleColor",l:"Couleu
]},
{key:"s3",titre:"Section3-Transformation",icon:" ",fields:[
      {k:"s3Align",l:"Alignement du texte",type:"align"},
      {k:"s3Title",l:"Titre",type:"txt"},
      {k:"s3LabelBefore",l:"Label \"Avant\"",type:"txt"},{k:"s3LabelAfter",l:"
      {k:"section3Bg",l:"Fond section",type:"col"},{k:"s3TitleColor",l:"Couleu
      {k:"s3RowBg1",l:"Fond rangée 1",type:"col"},{k:"s3RowBg2",l:"Fond rangée
      {k:"s3LabelBeforeColor",l:"Couleur label Avant",type:"col"},{k:"s3LabelA
      {k:"s3TextColor",l:"Couleur texte",type:"col"},{k:"s3ResultColor",l:"Cou
]},
{key:"s4",titre:"Section4-Statistiques",icon:" ",fields:[
      {k:"s4Align",l:"Alignement du texte",type:"align"},
      {k:"s4Title",l:"Titre",type:"txt"},{k:"s4Sub",l:"Sous-titre",type:"txt"}
      {k:"section4Bg",l:"Fond section",type:"col"},{k:"s4TitleColor",l:"Couleu
      {k:"s4StatColor",l:"Couleur chiffres",type:"col"},{k:"s4StatLabelColor",
     ]},
 la lig
e={cfg.
.landin
cfg.lan
ate={cf
ate={cf
ng} set
anding}
 state=
" state
" state
",multi
r titre
uleur t
r citat
"},
r titre
Label \
r titre
 2",typ
fterCol
leur te
,
r titre
l:"Coul

  {key:"s5",titre:"Section5-Témoignages",icon:" ",fields:[ {k:"s5Align",l:"Alignement du texte",type:"align"}, {k:"s5Title",l:"Titre",type:"txt"},
{k:"section5Bg",l:"Fond section",type:"col"},{k:"s5TitleColor",l:"Couleu {k:"testimonialBg",l:"Fond cards témoignages",type:"col"},{k:"testimonia {k:"testimonialCityColor",l:"Couleur ville",type:"col"},{k:"testimonialB {k:"testimonialAfterColor",l:"Couleur citation \"après\"",type:"col"},{k
]},
{key:"s6",titre:"Section6-Tarifs",icon:" ",fields:[
      {k:"s6Align",l:"Alignement du texte",type:"align"},
      {k:"s6Title",l:"Titre",type:"txt"},
      {k:"prixMensuel",l:"Prix mensuel (€)",type:"txt",inTxts:true},{k:"prixEs
      {k:"proLabel",l:"Badge Pro",type:"txt",inTxts:true},{k:"proSubtxt",l:"Te
      {k:"freeLabel",l:"Label Gratuit",type:"txt",inTxts:true},
      {k:"section6Bg",l:"Fond section",type:"col"},{k:"s6TitleColor",l:"Couleu
      {k:"freeBg",l:"Fond card Gratuit",type:"col"},{k:"freeLabelColor",l:"Cou
      {k:"freePriceColor",l:"Couleur prix Gratuit",type:"col"},{k:"freeDescCol
      {k:"proBg",l:"Fond card Pro",type:"col"},{k:"proBorderColor",l:"Bordure
      {k:"proLabelColor",l:"Couleur label Pro",type:"col"},{k:"proPriceColor",
      {k:"proSubColor",l:"Couleur texte sous prix",type:"col"},{k:"proDescColo
]},
{key:"cta",titre:"CTAFinal",icon:" ",fields:[
      {k:"ctaAlign",l:"Alignement du texte",type:"align"},
      {k:"ctaTitle",l:"Titre (avec \\n)",type:"txt",multi:true},{k:"ctaTitleAc
      {k:"ctaSub",l:"Texte descriptif",type:"txt",inTxts:true},{k:"ctaBtnTxt",
      {k:"ctaBg",l:"Fond section",type:"col"},{k:"ctaTitleColor",l:"Couleur ti
      {k:"ctaSubTitleColor",l:"Couleur sous-titre",type:"col"},{k:"ctaSubColor
    ]},
  ].filter(s=>matches(s.titre)||s.fields.some(f=>matches(f.l))).map(s=>
    <BOCard key={s.key} title={s.titre} icon={s.icon}>
      {s.fields.filter(f=>!search||matches(f.l)).map(f=>
        <BOField key={f.k} label={f.l}>
          {f.type==="align"?<BOAlignInput k={f.k} state={cfg.landing} setter={
          :f.type==="col"?<BOColorInput k={f.k} state={cfg.landing} setter={se
          :<BOTextInput k={f.k} state={f.inTxts?cfg.txts:cfg.landing} setter={
        </BOField>
      )}
</BOCard> )}
</>}
{/* ====================== TEXTES (tous) ====================== */}
{sec==="textes"&&<>
<BOCardtitle="Hero"icon=" "> {[["heroBadge","Badge"],["heroTitle","Titre"],["heroTitleAccent","Titre -
      <BOField key={k} label={l}><BOTextInput k={k} state={cfg.txts} setter={s
    )}
   r titre
lNameCo
eforeCo
:"testi
sai",l:
xte sou
r titre
leur la
or",l:"
Pro",ty
l:"Coul
r",l:"C
cent",l
l:"Text
tre",ty
",l:"Co
setLand
tLand}/
f.inTxt
accent
etTxt}

 </BOCard> <BOCardtitle="Sections"icon=" ">
    {[["s1Title","Section 1 - Titre"],["s1Desc","Section 1 - Description",true
      ["s2Title","Section 2 - Titre"],["s2Desc","Section 2 - Description"],
      ["s3Title","Section 3 - Titre"],["s3LabelBefore","Section 3 - Label Avan
      ["s4Title","Section 4 - Titre"],["s4Sub","Section 4 - Sous-titre"],
      ["s5Title","Section 5 - Titre"],["s6Title","Section 6 - Titre"],
      ["ctaTitle","CTA - Titre (\\n pour saut)",true],["ctaTitleAccent","CTA -
    ].filter(([,l])=>matches(l)).map(([k,l,m])=>
      <BOField key={k} label={l}><BOTextInput k={k} state={cfg.landing} setter
)}
</BOCard> <BOCardtitle="TarifsetCTA"icon=" ">
    {[["prixMensuel","Prix mensuel"],["prixEssai","Durée essai"],["proLabel","
      <BOField key={k} label={l}><BOTextInput k={k} state={cfg.txts} setter={s
)} </BOCard>
</>}
{/* ====================== COULEURS (globales + par élément) =================
{sec==="couleurs"&&<>
<BOCardtitle="Palettedel\'application"icon=" ">
{[["T","Principale (terracotta)"],["S","Secondaire (mauve)"],["G","Vert (s
      <BOField key={k} label={l}><BOColorInput k={k} state={cfg.cols} setter={
    )}
</BOCard> <BOCardtitle="Fondsdesectionslanding"icon=" ">
    {[["pageBg","Fond général page"],["heroBg","Fond hero"],["section1Bg","Sec
      <BOField key={k} label={l}><BOColorInput k={k} state={cfg.landing} sette
)}
</BOCard> <BOCardtitle="Couleurd\'accentglobale"icon=" ">
<BOField label="Couleur accent (stats, italique, étoiles par défaut)"><BOC </BOCard>
<BOCardtitle="Hero-couleursdetexte"icon=" ">
    {[["heroTitleColor","Titre hero"],["heroSubColor","Sous-titre"],["heroSubD
      <BOField key={k} label={l}><BOColorInput k={k} state={cfg.landing} sette
)}
</BOCard> <BOCardtitle="Sections1à6-couleurstexte"icon=" ">
    {[["s1TitleColor","S1 - Titre"],["s1DescColor","S1 - Description"],["s1Car
      ["s2TitleColor","S2 - Titre"],["s2DescColor","S2 - Description"],
      ["s3TitleColor","S3 - Titre"],["s3RowBg1","S3 - Fond rangée 1"],["s3RowB
      ["s4TitleColor","S4 - Titre"],["s4SubColor","S4 - Sous-titre"],["s4StatC
      ["s5TitleColor","S5 - Titre"],["testimonialBg","S5 - Fond cards"],["test
      ["s6TitleColor","S6 - Titre"],["freeBg","S6 - Fond Gratuit"],["freeLabel
      ["ctaTitleColor","CTA - Titre"],["ctaSubTitleColor","CTA - Sous-titre"],
       ],["s1Q
t"],["s
 Texte
={setLa
Badge P
etTxt}/
===== *
uccès)"
setCol}
tion 1
r={setL
olorInp
escColo
r={setL
dBg","S
g2","S3
olor","
imonial
Color",
["ctaSu

     ].filter(([,l])=>matches(l)).map(([k,l])=>
      <BOField key={k} label={l}><BOColorInput k={k} state={cfg.landing} sette
)} </BOCard>
</>}
{/* ====================== BOUTONS ====================== */}
{sec==="boutons"&&<>
{[
{titre:"BoutonNAV\"Commencer\"",icon:" ",fields:[["heroBtnNavTxt","Text {titre:"BoutonNAV\"Tarifs\"",icon:" ",fields:[["heroBtnTarifsBg","Fond" {titre:"BoutonNAV\"Connexion\"",icon:" ",fields:[["heroBtnConnexionBg", {titre:"BoutonHEROprincipal",icon:" ",fields:[["heroBtnPrimTxt","Texte" {titre:"BoutonHEROsecondaire",icon:" ",fields:[["heroBtnSecTxt","Texte" {titre:"BoutonTARIFSGratuit",icon:" ",fields:[["freeBtnTxt","Texte",tru {titre:"BoutonTARIFSPro",icon:" ",fields:[["proBtnTxt","Texte",true],[" {titre:"BoutonCTAfinal",icon:" ",fields:[["ctaBtnTxt","Texte",true],["c
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
      <div style={{marginTop:8,padding:8,background:"#f0f0f0",borderRadius:8}}
        <div style={{fontSize:9,color:"var(--l)",marginBottom:4,textTransform:
        <button style={{
          background:cfg.landing[btn.fields.find(f=>f[0].endsWith("Bg"))?.[0]]
          color:cfg.landing[btn.fields.find(f=>f[0].endsWith("Color"))?.[0]]||
          border:"none",borderRadius:8,padding:"8px 14px",fontSize:12,fontWeig
        }}>{cfg.txts[btn.fields.find(f=>f[2])?.[0]]||"Exemple"}</button>
      </div>
</BOCard> )}
</>}
{/* ====================== POLICES ====================== */}
{sec==="polices"&&<>
<BOCardtitle="Presetsdepolices"icon=" ">
<div style={{fontSize:11,color:"var(--m)",marginBottom:10}}>Clique pour ap <div style={{display:"flex",flexDirection:"column",gap:6}}>
      {FONT_PRESETS.map(p=><button key={p.name} onClick={()=>applyFontPreset(p
        style={{padding:"10px 12px",background:"var(--c)",border:"1px solid va
        onMouseEnter={e=>e.currentTarget.style.background="var(--Sp)"}
         r={setL
e",tru
,false
"Fond"
,true]
,true]
e],["f
proBtn
taBtnB
> "upperc
||"#ccc
"#000",
ht:700,
pliquer
)} r(--br)
e ] , , , r B g

         onMouseLeave={e=>e.currentTarget.style.background="var(--c)"}>
        <div style={{fontSize:11,fontWeight:700,color:"var(--b)",marginBottom:
        <div style={{fontSize:10,color:"var(--l)",fontFamily:p.title}}>Titre (
        <div style={{fontSize:10,color:"var(--l)",fontFamily:p.body}}>Corps ({
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
    <BOField label="URL Google Fonts" hint="Colle ici l\'URL complète de Googl
      <BOTextInput k="googleFontsUrl" state={cfg.landing} setter={setLand} mul
    </BOField>
    <div style={{padding:10,background:"var(--c)",borderRadius:8,marginTop:6,f
         Pour ajouter une police :<br/>
      1. Va sur <strong>fonts.google.com</strong><br/>
      2. Choisis tes polices<br/>
      3. Copie l\'URL de &lt;link href=\"...\"&gt;<br/>
      4. Colle-la ci-dessus + édite fontTitle / fontBody
</div>
</BOCard> <BOCardtitle="Aperçudespolices"icon=" ">
    <div style={{padding:12,background:"#fff",borderRadius:8,border:"1px solid
      <div style={{fontFamily:cfg.landing.fontTitle,fontSize:24,fontWeight:700
      <div style={{fontFamily:cfg.landing.fontBody,fontSize:14,lineHeight:1.6}
    </div>
  </BOCard>
</>}
{/* ====================== CONTENU (items) ====================== */}
{sec==="contenu"&&<>
<BOCardtitle="Statsduhero(bandeau)"icon=" "> {(cfg.statsHero||[]).map((s,i)=><div key={i}style={{display:"grid",gridTem
      <input className="inp"style={{fontSize:11,padding:"4px 6px"}}type="numbe
      <input className="inp"style={{fontSize:11,padding:"4px 6px"}}value={s.su
      <input className="inp"style={{fontSize:11,padding:"4px 6px"}}value={s.la
</div>)}
</BOCard> <BOCardtitle="Statssectionchiffres"icon=" ">
    {(cfg.statsSection||[]).map((s,i)=><div key={i}style={{display:"grid",grid
      <input className="inp"style={{fontSize:11,padding:"4px 6px"}}type="numbe
      <input className="inp"style={{fontSize:11,padding:"4px 6px"}}value={s.su
      <input className="inp"style={{fontSize:11,padding:"4px 6px"}}value={s.la
    2}}>{p.
{p.titl
p.body.
e Fonts ti/>
ontSize
 var(--
,margin
}>Corps
plateCo
r"value
f}onCha
bel}onC
Templat
r"value
f}onCha
bel}onC

     <input className="inp"style={{fontSize:11,padding:"4px 6px"}}value={s.de
  </div>)}
</BOCard> <BOCardtitle="Painpoints(section1)"icon=" ">
  {(cfg.painPoints||[]).map((p,i)=><div key={i}style={{marginBottom:10,paddi
    <div style={{display:"flex",gap:4,marginBottom:4}}>
      <input className="inp"style={{width:36,fontSize:11,padding:"4px",textA
      <input className="inp"style={{flex:1,fontSize:11,padding:"4px 6px"}}va
      <button onClick={()=>removePain(i)}style={{background:"#fee",border:"1
</div>
    <textarea className="inp"rows={2}style={{fontSize:11,padding:"5px 8px",r
  </div>)}
<button onClick={addPain}className="btn bG"style={{fontSize:11,padding:"6p </BOCard>
<BOCardtitle="Transformations(section3)"icon=" ">
  {(cfg.transformations||[]).map((t,i)=><div key={i}style={{marginBottom:10,
    <div style={{display:"flex",gap:4,marginBottom:4}}>
      <input className="inp"style={{width:36,fontSize:11,padding:"4px",textA
      <span style={{fontSize:11,color:"var(--l)",alignSelf:"center"}}>icône<
    </div>
    <input className="inp"style={{fontSize:11,padding:"4px 6px",marginBottom
    <input className="inp"style={{fontSize:11,padding:"4px 6px",marginBottom
    <input className="inp"style={{fontSize:11,padding:"4px 6px",width:"100%"
</div>)}
</BOCard> <BOCardtitle="Témoignages(section5)"icon=" ">
{(cfg.testimonials||[]).map((t,i)=><div key={i}style={{marginBottom:10,pad <div style={{display:"flex",justifyContent:"space-between",alignItems:"c <div style={{fontSize:11,fontWeight:700,color:"var(--b)"}}> Témoigna <button onClick={()=>removeTesti(i)}style={{background:"#fee",border:"
    </div>
    {[["nom","Nom"],["ville","Ville"],["avant","Avant (citation)"],["apres",
      <div key={k}style={{marginBottom:5}}>
        <div style={{fontSize:10,fontWeight:600,color:"var(--m)",marginBotto
        {k==="apres"?<textarea className="inp"rows={2}style={{fontSize:11,pa
          :<input className="inp"style={{fontSize:11,padding:"5px 8px",width
      </div>
)} </div>)}
  <button onClick={addTesti}className="btn bG"style={{fontSize:11,padding:"6
</BOCard>
<BOCardtitle="PlanGratuit-Fonctionnalités"icon=" ">
<div style={{fontSize:11,color:"var(--l)",marginBottom:10,lineHeight:1.5}} {(cfg.freeItems||[]).map((item,i)=><div key={i}style={{display:"flex",gap:
    <input type="checkbox"checked={item[0]}onChange={e=>setFreeItem(i,0,e.ta
    <input className="inp"style={{flex:1,fontSize:11,padding:"4px 6px"}}valu
     sc||""}
ngBotto
lign:"c
lue={p.
px soli
esize:"
x 12px"
padding
lign:"c
/span>
:3,widt
:3,widt
,boxSiz
dingBot
enter",
ge {i+
1px sol
"Après
m:2}}>{
dding:"
:"100%"
px 12px
>Coche
4,margi
rget.ch
e={item
1

       <button onClick={()=>removeFreeItem(i)}style={{background:"#fee",border:
    </div>)}
    <button onClick={addFreeItem}className="btn bG"style={{fontSize:11,padding
  </BOCard>
<BOCardtitle="PlanPro-Fonctionnalités"icon=" ">
<div style={{fontSize:11,color:"var(--l)",marginBottom:10,lineHeight:1.5}} {(cfg.proItems||[]).map((item,i)=><div key={i}style={{display:"flex",gap:4
      <input className="inp"style={{flex:1,fontSize:11,padding:"4px 6px"}}valu
      <button onClick={()=>removeProItem(i)}style={{background:"#fee",border:"
    </div>)}
    <button onClick={addProItem}className="btn bG"style={{fontSize:11,padding:
  </BOCard>
<BOCardtitle="Garanties(soustarifs)"icon=" ">
<div style={{fontSize:11,color:"var(--l)",marginBottom:10,lineHeight:1.5}} {(cfg.guarantees||[]).map((item,i)=><div key={i}style={{display:"flex",gap
      <input className="inp"style={{flex:1,fontSize:11,padding:"4px 6px"}}valu
      <button onClick={()=>removeGuarantee(i)}style={{background:"#fee",border
    </div>)}
    <button onClick={addGuarantee}className="btn bG"style={{fontSize:11,paddin
  </BOCard>
</>}
{/* ====================== APP (modules + stats) ====================== */}
{sec==="app"&&<>
<BOCardtitle="Modulesactivables"icon=" "> {[
{k:"parrainage",l:"Parrainage",ic:" "}, {k:"forum",l:"Forumcommunauté",ic:" "}, {k:"pmi",l:"CommunicationPMI",ic:" "}, {k:"periscolaire",l:"Planningpériscolaire",ic:" "}, {k:"rappelsVaccins",l:"Rappelsvaccins",ic:" "},
    ].map(({k,l,ic})=><div key={k}style={{display:"flex",justifyContent:"space
      <span style={{fontSize:12,fontWeight:600,color:"var(--b)"}}>{ic} {l}</sp
      <div onClick={()=>setFeat(k,!cfg.feats[k])}style={{width:40,height:22,bo
        <div style={{width:16,height:16,borderRadius:8,background:"#fff",posit
      </div>
</div>)}
</BOCard> <BOCardtitle="Statistiques"icon=" ">
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,text
      {[{v:stats.users,l:"Inscrits",c:"var(--T)"},{v:stats.pro,l:"Pro",c:"var(
        <div key={s.l}style={{padding:10,background:"var(--c)",borderRadius:8}
          <div style={{fontSize:22,fontWeight:700,color:s.c}}>{s.v}</div>
          <div style={{fontSize:10,color:"var(--l)"}}>{s.l}</div>
        </div>
         "1px so
:"6px 1
>Emoji
,margin
e={item
1px sol
"6px 12
>Les pe
:4,marg
e={item
:"1px s
g:"6px
-betwee
an>
rderRad
ion:"ab
Align:"
--S)"},
}>

 )} </div>
</BOCard> <BOCardtitle="Informationslégales"icon=" ">
            <div style={{fontSize:11,color:"var(--l)",marginBottom:10}}>Ces informatio
            <BOField label="Nom complet"><BOTextInput k="nom" state={cfg.legal||{}} se
            <BOField label="SIRET"><BOTextInput k="siret" state={cfg.legal||{}} setter
            <BOField label="Adresse"><BOTextInput k="adresse" state={cfg.legal||{}} se
            <BOField label="Email de contact"><BOTextInput k="email" state={cfg.legal|
</BOCard> <BOCardtitle="Boutique—LiensdepaiementStripe"icon=" ">
            <div style={{fontSize:11,color:"var(--l)",marginBottom:10}}>Collez ici vos
            <BOField label="Kit Google Sheets"><BOTextInput k="linkSheets" state={cfg.
            <BOField label="Fiche d'urgence"><BOTextInput k="linkFiche" state={cfg.bou
            <BOField label="Projet d'accueil"><BOTextInput k="linkProjet" state={cfg.b
            <BOField label="Pack Complet"><BOTextInput k="linkPack" state={cfg.boutiqu
</BOCard> <BOCardtitle="TableSupabase"icon=" ">
            <div style={{fontSize:11,color:"var(--m)",marginBottom:8,lineHeight:1.5}}>
            <div style={{fontSize:10,background:"#1a1a1a",color:"#0f0",padding:10,bord
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
      {showPreview&&<div style={{flex:1,overflow:"hidden",background:"#f0f0f0",positio
        <div style={{position:"absolute",top:8,left:8,zIndex:10,fontSize:10,fontWeight
        <div style={{width:"1200px",height:"100%",transform:"scale("+Math.min(1,(typeo
          <LandingPage onLogin={()=>{}}dark={false}setDark={()=>{}}config={cfg}/>
        </div>
      </div>}
    </div>
</div>; }
const DEFAULT_CONFIG = {
  cols: {T:"#FF9F63",S:"#2A9D8F",G:"#2A9D8F",R:"#E76F51",c:"#FDFBF8",w:"#FFFFFF",b:"#2
  txts: {
   ns appa
tter={(
={(k,v)
tter={(
|{}} se
 liens
boutiqu
tique||
outique
e||{}}
À exécu
erRadiu
n:"rela
:700,co
f windo
64653"}

 heroTitle:"Moins de paperasse,",
heroTitleAccent:"plus de câlins.",
heroSub:"L'app tout-en-un des assistantes maternelles.",
heroBtn:"Commencer gratuitement →",
prixMensuel:"9,99",
prixEssai:"2 mois gratuits",
heroDesc:"",
heroBadge:" CONÇUE PAR UNE ASSMAT, POUR LES ASSMATS",
heroSubDesc:"Contrats, salaires, pointages, transmissions, Pajemploi...\nTiMat aut heroBtnPrimTxt:"2 mois gratuits, sans CB →",
heroBtnSecTxt:"Voir la démo ↓",
heroBtnNavTxt:"Commencer gratuitement →",
heroTags:" Données en France, Web & Mobile, 2 min pour démarrer, Sans car ctaBtnTxt:"Je commence - 2 mois gratuits →",
ctaSub:"TiMat s'occupe de ça. Pour que vous puissiez vous occuper des enfants.", ctaFooter:"Déjà 847 assistantes maternelles nous font confiance · Données hébergée proLabel:" TOUT INCLUS",
proSubtxt:"soit 0,33€/jour - moins qu'un café",
proDesc:"La solution complète. Tout est inclus.",
proBtnTxt:"2 mois gratuits, sans CB →",
freeLabel:"Gratuit",
freeBtnTxt:"Commencer gratuitement",
freeDesc:"Pour découvrir TiMat.",
freePrice:"0€",
}, landing: {
  heroBg:"linear-gradient(160deg, #264653 0%, #2A6F6A 40%, #264653 70%, #1B3540 100%
  heroImg:"",
  heroImgOpacity:0.12,
  heroImgPosition:"center center",
heroImgBlur:2,
logoUrl:"",
logoEmoji:" ", section1Bg:"linear-gradient(135deg,#264653,#2A6F6A)", section2Bg:"#FDF5FB",
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
       omatise
te banc
s en Fr
)",

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
googleFontsUrl:"https://fonts.googleapis.com/css2?family=Quicksand:wght@500;600;70
// ----- TEXTES SECTIONS -----
s1Title:"La réalité du métier, personne n'en parle.",
s1Desc:"Être assistante maternelle agréée, c'est exercer un métier de soin exigean
s1Quote:"TiMat n'ajoute pas une appli à votre vie.\nIl retire tout ce qui n'aurait
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
0&famil
t\ntout
 jamais

   s1Align:"center",
  s2Align:"center",
  s3Align:"center",
  s4Align:"center",
  s5Align:"center",
  s6Align:"center",
  ctaAlign:"center",
},
painPoints:[
{ic:" ",titre:"Comptablesansdiplôme",desc:"Mensualisation,heuresmajorées,cot {ic:" ",titre:"Juristesansformation",desc:"ContratsCCN,avenants,courriersde {ic:" ",titre:"SecrétairedelaPMI",desc:"Dossiersderenouvellement,comptes-re {ic:" ",titre:"Communitymanagerdesparents",desc:"Répondreauxmessagesàtoute {ic:" ",titre:"Administratricelesoir",desc:"Après10haveclesenfants,vousou {ic:" ",titre:"Seulefaceauxproblèmes",desc:"Pasdecollègueàquidemander.Pa
],
transformations:[
[" ","Pajemploivousprend2hparmois","Récapprêten5minutes","Zéroerreur.Z [" ","Voscontratssontdansuntiroir","Modèlesguidés,avenantsen2clics","So [" ","Lesretardsdeparentscréentdesconflits","Pointagehorodaté,signéparl [" ","Undocumentimportantestintrouvable","Toutcentralisé,daté,cherchable", [" ","Vossoiréesserventàl'administratif","5minuteslematinsuffisent","Vos
],
statsHero:[
{n:847,suf:"+",label:"assmats actives"}, {n:12400,suf:"+",label:"bilans générés"}, {n:4,suf:".7★",label:"note moyenne"}, {n:96,suf:"%",label:"taux de satisfaction"},
],
statsSection:[
  {n:847,suf:"+",label:"assmats actives",desc:"Font confiance à TiMat"},
  {n:94,suf:"%",label:"satisfaites",desc:"Recommandent TiMat à une collègue"},
  {n:4,suf:"h",label:"économisées",desc:"Par mois en admin en moyenne"},
  {n:2,suf:" mois",label:"d'essai gratuit",desc:"Sans carte bancaire"},
],
testimonials:[
  {nom:"Marie D.",ville:"Paris 15e",avant:"Je passais mes soirées sur Excel.",apres:
  {nom:"Sylvie R.",ville:"Lyon",avant:"J'avais peur d'un contrôle PMI.",apres:"Tout
  {nom:"Nathalie B.",ville:"Bordeaux",avant:"Un parent a contesté des heures.",apres
  {nom:"Fatima A.",ville:"Marseille",avant:"Je me réveillais la nuit à stresser.",ap
],
freeItems:[
  [true, "1 enfant accueilli"],
  [true, "Journal quotidien"],
  [true, "Pointage & Repas"],
  [true, "Messagerie parents"],
  [true, "Calendrier"],
           isatio
 ruptu
ndus d
 heure
vrez l
s de R
éro st
lide j
es deu
"En ca
soirée
"Mon ré
est arc
:"Le po
res:"Ti
n r e , ' H
r u x s s

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
}, };
let G = JSON.parse(JSON.stringify(DEFAULT_CONFIG)); // mutable global config
const applyColsToDOM = (cols) => {
  const r = document.documentElement;
  Object.entries(cols).forEach(([k,v]) => r.style.setProperty('--'+k, v));
};
const loadConfig = async () => {
  try {
               const {data,error} = await supabase.from('app_config').select('config').eq('id','m
ain').m

     if (error) {
      console.log('[TiMat config] Erreur Supabase:', error.message);
      return;
}
if (!data) {
      console.log('[TiMat config] Aucune config en base (table vide) - utilisation des
return; }
if (data?.config) {
const saved = typeof data.config === 'string' ? JSON.parse(data.config) : data.c console.log('[TiMat config] Config chargée depuis Supabase:', Object.keys(saved) G={
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
défaut
onfig; );

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
    console.error('[TiMat config] Les deux formats ont échoué. JSONB:', errObj.message
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
  const [pmiNonLus,setPmiNonLus]=useState(PMI_MESSAGES.filter(m=>!m.lu&&m.de==="PMI").
  const [notifs,setNotifs]=useState([
{id:"n1",ic:" ",txt:"NouveaumessagedelaPMI",date:TODAY_STR,lu:false,page:"pmi {id:"n2",ic:" ",txt:"Contratenattentedesignature",date:TODAY_STR,lu:false,pag
{id:"n4",ic:" ",txt:"Nouveaujournaldisponible",date:TODAY_STR,lu:false,page:"jo ]);
  const [showNotifs,setShowNotifs]=useState(false);
  const [onboarded,setOnboarded]=useState(false);
  // //  tats donnes Supabase  AVANT tout return conditionnel
  const [enfantsDB,setEnfantsDB]=useState([]);
  const [contratsDB,setContratsDB]=useState([]);
  const [pointagesDB,setPointagesDB]=useState([]);
  const [transmissionsDB,setTransmissionsDB]=useState([]);
  const [dbLoading,setDbLoading]=useState(false);
   , 'TEXT
length)
",role
e:"adm
urnal_
s i
c

 const [appConfig,setAppConfig]=useState(JSON.parse(JSON.stringify(DEFAULT_CONFIG)));
// //  Dsactiver le service worker bloqu
useEffect(()=>{
  if('serviceWorker' in navigator){
    navigator.serviceWorker.getRegistrations().then(regs=>{
      regs.forEach(reg=>reg.unregister());
    });
} },[]);
// Charger config backoffice au démarrage -
useEffect(()=>{
  loadConfig().then(()=>{
    setAppConfig(JSON.parse(JSON.stringify(G)));
    console.log('[TiMat config] appConfig synchronisé');
}); },[]);
// Vérifier session Supabase au démarrage -
useEffect(()=>{
  // Stores the minimal user from auth; profile enrichment happens in a separate eff
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
}; });
};
  const{data:{subscription}}=supabase.auth.onAuthStateChange((event,session)=>{
    if(event==="INITIAL_SESSION"){
      handleAuthUser(session);
      setLoading(false);
    }
ect

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
      const{data:profil}=await supabase.from("profiles").select("*").eq("id",user.id
      if(cancelled)return;
      if(profil){
        setUser(u=>({...u,...profil,id:user.id,email:user.email,_needsProfileFetch:f
      }else{
        setUser(u=>({...u,_needsProfileFetch:false}));
      }
    }catch(e){
      console.log("Profile fetch error:",e.message);
      if(!cancelled)setUser(u=>({...u,_needsProfileFetch:false}));
} })();
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
).maybe
alse}))

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
            jours:c.find(ct=>ct.enfant_id===enf.id).jours||["Lundi","Mardi","Mercred
            horaires:c.find(ct=>ct.enfant_id===enf.id).horaires||"07h30–17h30",
            indemniteAbsence:0.5,
}:null, }));
        setEnfantsDB(enfantsAvecContrat);
        // Charger pointages du mois
        const debut=new Date();debut.setDate(1);
i","Jeu

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
  <div style={{minHeight:"100vh",background:"var(--c)",display:"flex",alignItems:"ce
    <div className="pf"style={{fontSize:36,color:"var(--T)",fontStyle:"italic"}}>TiM
    <div style={{display:"flex",gap:6}}>
      <div className="ai-dot"/><div className="ai-dot"style={{animationDelay:".3s"}}
    </div>
    <div style={{fontSize:12,color:"var(--l)"}}>Chargement...</div>
  </div></>
);
// - Utiliser données réelles
if(!user)return <><Styles/><div className={"app"+(dark?" dark":"")+""}><LandingPage
// Afficher onboarding si asmat sans enfants (vérifié après chargement DB)
if(!onboarded&&user.role==="asmat"&&!dbLoading&&enfantsDB.length===0)return <><Style
const role=user.role;
// //  Statut abonnement
const isPro=['pro','trialing'].includes(user?.subscription_status)||user?.role==="pa
const isTrialing=user?.subscription_status==="trialing";
// //  Lancer le checkout Stripe
const lancerCheckout=async()=>{
  if(user?.id?.startsWith?.("demo-")){
    alert("Le paiement n'est pas disponible en mode demo. Creez un compte pour conti
    return;
} try{
nter",j
at</div
/><div
onLogin
s/><div
rent";
nuer.")

      const res=await fetch('/api/create-checkout-session',{
       method:'POST',
       headers:{'Content-Type':'application/json'},
       body:JSON.stringify({userId:user.id,email:user.email,prenom:user.prenom}),
     });
     if(!res.ok){
       const txt=await res.text();
       console.error('Stripe error:', res.status, txt);
       alert("Erreur serveur ("+res.status+"). Verifiez que Stripe est configure dans
       return;
     }
     const data=await res.json();
     if(data.url)window.location.href=data.url;
     else alert("Erreur: "+JSON.stringify(data));
   }catch(e){
     console.error('Stripe fetch error:', e);
     alert("Erreur reseau. Verifiez que :\n1. npm install stripe est fait\n2. STRIPE_
} };
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
// //  Utiliser donnes relles si disponibles sinon dmo
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
Vercel
SECRET_

 const groups=role==="asmat"?GROUPS_AM:GROUPS_P;
const P={enfants,role,pEId,user,pointagesDB};
const renderPage=()=>{
  switch(page){
    case "accueil": return role==="asmat"?<AccueilAssMat enfants={enfants} setPage={
    case "journal_complet": return <JournalComplet {...P}/>;
    case "sante_complet": return <SanteComplete {...P}/>;
    case "eveil_complet": return <EveilComplet {...P}/>;
    case "documents_complet": return <DocumentsComplet {...P}/>;
    case "bilans_exports": return <BilansExports {...P}/>;
    case "admin_finances": return <AdminFinances {...P} user={user}/>;
    case "pointage": return <Pointage {...P}/>;
    case "calendrier": return <Calendrier enfants={enfants} role={role} pEId={pEId}/
    case "messagerie": return <Messagerie {...P}/>;
    case "politique_confidentialite": return <PolitiqueConfidentialite/>;
    case "mentions_legales": return <MentionsLegales/>;
    case "parametres": return <Parametres user={user} onLogout={handleLogout} setPag
    case "backoffice": return user?.email===ADMIN_EMAIL?<Backoffice user={user} setP
    case "pmi": return <CommunicationPMI role={role} user={user} hasRealData={hasRea
    case "periscolaire": return <PlanningPeriscolaire enfants={enfants} role={role}
    case "forum": return <ForumCommunaute role={role}/>;
    case "rapport_annuel": return <RapportAnnuel enfants={enfants} role={role} pEId=
    case "parrainage": return <Parrainage user={user}/>;
    case "simulateur": return <SimulateurCout enfants={enfants} pEId={pEId}/>;
    case "solde_compte": return <SoldeDeCompte enfants={enfants} role={role} pEId={p
    case "attestation_pe": return <AttestationPoleEmploi enfants={enfants} role={rol
    case "attestation_fiscale": return <AttestationFiscale enfants={enfants} role={r
    case "fiche_urgence": return <FicheUrgence enfants={enfants} role={role} pEId={p
    case "projet_accueil": return <ProjetAccueil user={user} role={role}/>;
    case "boutique": return <Boutique user={user}/>;
    case "export_donnees": return <ExportDonnees enfants={enfants} user={user} role=
    case "faq": return <FAQ role={role}/>;
    case "support": return <Support role={role} user={user}/>;
    case "liste_attente": return <ListeAttente enfants={enfants} role={role} user={u
    case "kit_cmg": return <KitCMG enfants={enfants} role={role} pEId={pEId} user={u
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
setPage
>;
e={setP
age={se
lData}/
pEId={p
{pEId}
EId}/>;
e} pEId
ole} pE
EId} us
{role}/
ser}/>;
ser}/>;

       case "developpement": return <EveilComplet {...P}/>;
      case "documents": return <DocumentsComplet {...P}/>;
      case "export": return <DocumentsComplet {...P}/>;
      case "facturation": return <AdminFinances {...P} user={user}/>;
      case "contrats": return <AdminFinances {...P} user={user}/>;
      case "recap": return <AdminFinances {...P} user={user}/>;
      case "dashboard": return <TableauDeBord enfants={enfants} role={role} pEId={pEId
      default: return role==="asmat"?<AccueilAssMat enfants={enfants} setPage={setPage
    }
};
return( <>
      <Styles/>
      <div className={"app"+(dark?" dark":"")+""}>
        <TopBar role={role} groups={groups} page={page} setPage={setPage} user={user}
          onLogout={handleLogout}
          pmiNonLus={role==="parent"?0:pmiNonLus} dark={dark} setDark={setDark}
          notifNonLus={notifs.filter(n=>(!n.roles||n.roles.includes(role))&&!n.lu).len
          showNotifs={showNotifs} setShowNotifs={setShowNotifs} setPage2={setPage}/>
        <BandeauHorsLigne/>
        <div className="content">{renderPage()}</div>
        <BottomNav groups={groups} page={page} setPage={setPage} pmiNonLus={role==="pa
</div> </>
); }
} setPa
} user=
gth} no
rent"?0
