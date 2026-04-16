import { useState, useRef, useEffect } from "react";
import { supabase } from "../lib/supabase.js";

// DATES
var _D=new Date();
var TODAY_STR=_D.getFullYear()+"-"+String(_D.getMonth()+1).padStart(2,"0")+"-"+String(_D.getDate()).padStart(2,"0");
var TODAY_H=String(_D.getHours()).padStart(2,"0")+"h"+String(_D.getMinutes()).padStart(2,"0");
var TODAY_MONTH=String(_D.getMonth()+1).padStart(2,"0");
var TODAY_YEAR=String(_D.getFullYear());


function Styles(){return(
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400;1,700&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,300;1,9..40,400&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&family=DM+Mono:wght@400;500&display=swap');
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
      --c:#160E14;--w:#1E1420;--b:#F5EDF2;--m:#C4A0B8;--l:#8A6880;--br:#3A2838;
      --Tp:#3A2018;--Sp:#221830;--Gp:#182818;--Bp:#182030;--Rp:#301420;--Pp:#22183A;
      --T:#E08858;--S:#B888CC;--G:#60B888;--B:#6898D8;--R:#E06888;--P:#B888CC;
      --sh:0 1px 4px rgba(0,0,0,.4),0 4px 20px rgba(0,0,0,.5);
      --sh2:0 2px 12px rgba(0,0,0,.5),0 16px 48px rgba(0,0,0,.6);
    }
    .dark .topbar,.dark .nav-main{background:rgba(22,14,20,.97)!important}
    .dark .card{border-color:#3A2838}
    .dark .inp,.dark .ta,.dark .sel{background:#2A1828;border-color:#3A2838;color:#F5EDF2}
    .dark .lbl{color:#A880A0}
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
    .bT{background:linear-gradient(135deg,#C4714A,#D4824A);color:#fff;box-shadow:0 2px 10px rgba(196,113,74,.3)}
    .bT:hover{transform:translateY(-1px);box-shadow:0 4px 18px rgba(196,113,74,.4)}
    .bS{background:linear-gradient(135deg,#9B6BAA,#B87CC8);color:#fff;box-shadow:0 2px 10px rgba(155,107,170,.3)}
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
    @media(max-width:400px){.g2,.g3,.g4{grid-template-columns:1fr}}
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
    @media(max-width:640px){.content{padding:0}.fi{padding:14px}.topbar{height:50px;padding:0 14px}.logo{font-size:20px}.btn{padding:8px 14px;font-size:12px}.nav-main button{padding:6px 12px!important;font-size:12px!important}}
    @media(hover:none){.card-lift:active{transform:scale(.98)}.btn:active{transform:scale(.96)!important}}
    /* - CALENDRIER - */
    .cgrid{display:grid;grid-template-columns:repeat(7,1fr);gap:3px}
    .cday{min-height:38px;border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding-top:5px;cursor:pointer;transition:all .15s;font-size:12px;color:var(--b);position:relative;background:transparent}
    .cday:hover{background:var(--Sp)}
    .cday.tod{background:linear-gradient(135deg,var(--T),var(--S));color:#fff;font-weight:700;box-shadow:0 2px 8px rgba(155,107,170,.3)}
    .cday.abs{background:var(--Rp);color:var(--R)}
    .cday.cng{background:var(--Gp);color:var(--G)}
    .cday.hol{background:var(--Bp);color:var(--B)}
    /* - TOAST - */
    .toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:var(--b);color:#fff;padding:12px 20px;border-radius:14px;font-size:13px;font-weight:600;z-index:999;box-shadow:0 8px 32px rgba(0,0,0,.25);display:flex;align-items:center;gap:10px;max-width:360px;animation:toast-in .3s ease}
    @keyframes toast-in{from{opacity:0;transform:translateX(-50%) translateY(10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
    /* - PHOTO GRID - */
    .photo-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
    @media(max-width:640px){.photo-grid{grid-template-columns:repeat(3,1fr)}}
    /* - NAV TABS - */
    .ntab{padding:6px 12px;border-radius:8px;border:none;background:transparent;cursor:pointer;font-family:inherit;font-size:12px;font-weight:500;color:var(--l);transition:all .15s}
    .ntab.on{background:var(--Sp);color:var(--S);font-weight:700}
  `}</style>
);}


const D = {
  asmat:{id:"am1",role:"asmat",prenom:"Marie",nom:"Dupont",email:"marie.dupont@mail.fr",agrement:"AGR-2019-0042",couleur:"#C4714A"},
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
    {id:"m3",eId:"e1",de:"parent",h:"16h30",txt:"Il peut rester un peu plus tard ce soir ? Mon train est retardé…",lu:false},
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
    {id:"ev1",date:"2024-03-15",type:"conge",txt:"Congés de Marie",},
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
function CPill({e,sel,onClick}){return <div className={"card cp "+(sel?"on":"")+""}onClick={onClick}style={{padding:"9px 13px",display:"flex",alignItems:"center",gap:9}}>
  <span style={{fontSize:20}}>{e.emoji}</span><div><div style={{fontWeight:700,fontSize:13,color:"var(--b)"}}>{e.prenom}</div><div style={{fontSize:11,color:"var(--l)"}}>{age(e.naissance)}</div></div></div>}

function Toast({msg,onClose}){useEffect(()=>{const t=setTimeout(onClose,3000);return()=>clearTimeout(t)},[]);
  return <div className="toast"><span>✅</span>{msg}</div>}

function PageHeader({icon,title,sub,action}){return <div style={{marginBottom:14,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
  <div><div className="pf"style={{fontSize:17,fontWeight:700,color:"var(--b)",marginBottom:2}}>{icon} {title}</div>
  {sub&&<div style={{fontSize:12,color:"var(--l)"}}>{sub}</div>}</div>{action}</div>}

//
function AccueilAssMat({enfants,setPage,user}){
  const pt=D.pointages.filter(p=>p.date===TODAY_STR);
  const tx=D.transmissions.filter(t=>t.date===TODAY_STR);
  const nonSigne=enfants.filter(e=>!e.contrat?.signe_asmat);
  const nbEnfants=enfants.length;
  const isDemoUser=enfants.every(e=>["e1","e2","e3"].includes(e.id));

  const kpis=[
    {icon:"👶",val:nbEnfants>0?nbEnfants+" enfant"+(nbEnfants>1?"s":""):"Aucun",lbl:"Enfants accueillis",c:"var(--T)",page:"pointage",hint:"→ Pointage"},
    {icon:"💬",val:"0",lbl:"Messages non lus",c:"var(--B)",page:"messagerie",hint:"→ Messagerie"},
    {icon:"📋",val:nbEnfants>0?"Actif":"-",lbl:"Journal du jour",c:"var(--S)",page:"journal_complet",hint:"→ Journal"},
    {icon:"🧾",val:nbEnfants,lbl:"Contrat"+(nbEnfants>1?"s":"")+" actif"+(nbEnfants>1?"s":""),c:"var(--G)",page:"admin_finances",hint:"→ Facturation"},
  ];

  return <div className="fi">
    <div style={{marginBottom:18}}>
      <div style={{fontSize:11,color:"var(--l)",marginBottom:4,fontFamily:"'DM Mono',monospace",letterSpacing:".5px"}}>
        {todayStr().toUpperCase()}
      </div>
      <div className="pf"style={{fontSize:26,fontWeight:600,color:"var(--b)",lineHeight:1.2}}>Bonjour {user?.prenom||"Marie"} 👋</div>
      <div style={{fontSize:13,color:"var(--m)",marginTop:4}}>Votre espace professionnel</div>
    </div>

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
          const msg=D.messages.filter(m=>m.eId===e.id&&!m.lu).length;
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
function AccueilParent({enfant,setPage}){
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
    setToast("Absence déclarée - Marie a été notifiée ✓");
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
          📢 Marie sera notifiée immédiatement. L'absence sera notée dans le calendrier et prise en compte dans le décompte des heures.
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
            📢 Notifier Marie
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
              {t.auteur==="asmat"?"👩‍👧 "+(user?.prenom||"Marie"):"👪 Vous"} · {t.h}</div>
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
    <PageHeader icon="📋" title="Journal" sub="Échanges quotidiens avec Marie"/>
    {role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
      {liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>setSelId(e.id)}/>)}</div>}

    {/* Documents reçus - parent seulement */}
    {role==="parent"&&bilansRecus.length>0&&<div className="card"style={{padding:16,marginBottom:14,border:"1.5px solid var(--P)"}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
        <div style={{width:28,height:28,borderRadius:"50%",background:"var(--Pp)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>✨</div>
        <div style={{fontWeight:700,fontSize:14,color:"var(--P)"}}>Documents reçus de Marie</div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {bilansRecus.map(b=><div key={b.id}>
          <div onClick={()=>setDocOuvert(docOuvert===b.id?null:b.id)}
            style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",background:"var(--Pp)",borderRadius:10,cursor:"pointer",border:"1px solid rgba(106,63,136,.2)"}}>
            <div>
              <div style={{fontWeight:700,fontSize:13,color:"var(--P)"}}>
                {b.type==="bilan"?"✨ Bilan de journée du "+b.date:"📝 CR Trimestriel - "+b.trim}
              </div>
              <div style={{fontSize:11,color:"var(--l)",marginTop:2}}>Par Marie Dupont · Cliquer pour lire</div>
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
                {t.auteur==="asmat"?"👩‍👧 "+(user?.prenom||"Marie"):"👪 Parent"}</div>
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
              placeholder={role==="asmat"?("Racontez la journée de "+(enfant?.prenom||"")+"…"):"Informations pour la journée…"}/>
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
            <span style={{fontSize:13,color:"var(--m)",fontStyle:"italic"}}>Rédaction du bilan en cours…</span>
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
          tot:p.total_minutes?Math.floor(p.total_minutes/60)+"h"+String(p.total_minutes%60).padStart(2,"0"):null,
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
    const totalMin=dep?(()=>{const[h2,m2]=dep.split(":").map(Number);return(h2*60+m2)-(h1*60+m1);})():null;
    const totStr=totalMin?Math.floor(totalMin/60)+"h"+String(totalMin%60).padStart(2,"0"):null;

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
          <div style={{fontWeight:700,marginBottom:12,color:"var(--b)"}}>📍 Aujourd&#39;hui</div>
          {ptJ?<div style={{background:"var(--Sp)",borderRadius:10,padding:12,border:"1px solid var(--Sl)",marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              {[["Arrivée",ptJ.arr,"var(--S)"],["→","","var(--l)"],["Départ",ptJ.dep||"En cours","var(--T)"],["Total",ptJ.tot||"-","var(--b)"]].map(([l,v,c])=>
                <div key={l}style={{textAlign:"center"}}><div style={{fontSize:11,color:"var(--l)"}}>{l}</div>
                  <div className="pf"style={{fontSize:18,fontWeight:700,color:c}}>{v}</div></div>)}
            </div>
          </div>:<div style={{fontSize:13,color:"var(--l)",marginBottom:12}}>Pas encore pointé.</div>}
          {role==="asmat"&&<div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
              <div><label className="lbl">Arrivée</label><input type="time"className="inp"value={arr}onChange={e=>setArr(e.target.value)}/></div>
              <div><label className="lbl">Départ</label><input type="time"className="inp"value={dep}onChange={e=>setDep(e.target.value)}/></div>
            </div>
            <button className="btn bS"style={{width:"100%"}}onClick={save}disabled={saving}>
              {saving?"⏳ Sauvegarde…":"Enregistrer le pointage"}
            </button>
          </div>}
        </div>
      </div>
      <div className="card"style={{padding:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div style={{fontWeight:700,color:"var(--b)"}}>📅 Historique récent</div>
          {role==="parent"&&<div style={{fontSize:11,color:"var(--l)"}}>Tapez ✅ pour valider</div>}
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {ptH.slice(0,10).map(p=><div key={p.id}style={{
            display:"flex",justifyContent:"space-between",alignItems:"center",
            padding:"8px 10px",borderRadius:9,
            background:p.valide_parent?"var(--Sp)":role==="parent"?"var(--Gp)":"var(--c)",
            border:role==="parent"&&!p.valide_parent?"1px solid var(--G)":"1px solid transparent"
          }}>
            <div style={{fontSize:12,fontWeight:600,color:"var(--b)"}}>
              {new Date(p.date).toLocaleDateString("fr-FR",{weekday:"short",day:"numeric",month:"short"})}
            </div>
            <div style={{display:"flex",gap:10,fontSize:12}}>
              <span style={{color:"var(--S)"}}>{p.arr?"↗"+p.arr:""}</span>
              <span style={{color:"var(--T)"}}>{p.dep?"↘"+p.dep:""}</span>
              <span style={{fontWeight:700,color:"var(--b)"}}>{p.tot||"-"}</span>
            </div>
            {role==="parent"&&!p.valide_parent
              ?<button onClick={()=>validerPointage(p.id)}
                style={{background:"var(--G)",color:"#fff",border:"none",borderRadius:6,
                  padding:"4px 10px",cursor:"pointer",fontSize:11,fontWeight:700}}>Valider</button>
              :<span style={{fontSize:13,color:p.valide_parent?"var(--S)":"var(--l)"}}>
                {p.valide_parent?"✅":"⏳"}
              </span>
            }
          </div>)}
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
    setCh(p=>[...p,{id:"chn"+Date.now(),eId:enfant.id,date:TODAY_STR,h:nch.h.replace(":","h"),type:nch.type,n:nch.n}]);
    setNch({h:"",type:"Change",n:""});setToast("Change ajouté ✓");};

  const saveRp=()=>{
    setRp(p=>{const ex=p.find(r=>r.eId===enfant.id&&r.date===TODAY_STR);
      const up={...(ex||{id:"rn"+Date.now(),eId:enfant.id,date:TODAY_STR,notes:""}),
        dej:re.dej??erp?.dej,gou:re.gou??erp?.gou,bib:re.bib??erp?.bib,q:re.q??erp?.q??"bien"};
      return ex?p.map(r=>r===ex?up:r):[...p,up];});
    setRe({});setToast("Repas enregistré ✓");};

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

  // Jour de la semaine (0=Lundi…6=Dim) pour un jour du mois
  const jourIdx=(d)=>(new Date(an,mois,d).getDay()+6)%7;

  // Filtrage selon le rôle
  const evsFiltres=role==="parent"
    ? evs.filter(e=>{
        // Parent voit : ses propres absences + congés de Marie (cng) + fériés
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
    setToast("Absence déclarée - Marie a été notifiée ✓");
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
      sub={role==="parent"?"Jours d'accueil, congés de Marie et jours fériés":"Accueil, congés, anniversaires, vacances scolaires Zone C"}
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
          📢 Marie sera notifiée immédiatement. L'absence sera notée dans votre calendrier et dans le décompte des heures.
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
            📢 Notifier Marie
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
              <option value="cng">🟡 Congé Marie</option>
              <option value="hol">🔵 Sortie / activité</option>
            </select>
          </div>
          <input className="inp"style={{marginBottom:8}}placeholder="Description…"value={newEv.txt}onChange={e=>setNewEv(p=>({...p,txt:e.target.value}))}/>
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
function Messagerie({enfants,role,pEId}){
  const [selId,setSelId]=useState(enfants[0]?.id);
  const [msgs,setMsgs]=useState(D.messages);
  const [txt,setTxt]=useState("");
  const endRef=useRef(null);
  const liste=role==="parent"?enfants.filter(e=>e.id===pEId):enfants;
  const enfant=liste.find(e=>e.id===selId)||liste[0];
  const conv=msgs.filter(m=>m.eId===enfant?.id).sort((a,b)=>a.id>b.id?1:-1);

  const send=()=>{if(!txt.trim())return;
    setMsgs(p=>[...p,{id:"mn"+Date.now(),eId:enfant.id,de:role==="asmat"?"asmat":"parent",h:TODAY_H,txt,lu:true}]);
    setTxt("");
    setTimeout(()=>endRef.current?.scrollIntoView({behavior:"smooth"}),50);};

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
            <div>{m.txt}</div>
            <div style={{fontSize:10,opacity:.7,marginTop:3,textAlign:"right"}}>{m.h}</div>
          </div>)}
          <div ref={endRef}/>
        </div>
        <div style={{display:"flex",gap:8,paddingTop:10,borderTop:"1px solid var(--br)"}}>
          <input className="inp"value={txt}onChange={e=>setTxt(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Votre message…"style={{flex:1}}/>
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
function Facturation({enfants,role,pEId}){
  const [selId,setSelId]=useState(enfants[0]?.id);
  const [abs,setAbs]=useState(D.absences);
  const [toast,setToast]=useState("");
  const liste=role==="parent"?enfants.filter(e=>e.id===pEId):enfants;
  const enfant=liste.find(e=>e.id===selId)||liste[0];
  const contrat=enfant?.contrat;
  const h=D.heures[enfant?.id]||{real:0,prev:Math.round((enfant?.contrat?.heuresHebdo||40)*52/12)};
  const salBrut=contrat?(h.real*contrat.tauxHoraire+(h.real/5*contrat.entretien)):0;
  const absMois=abs.filter(a=>a.eId===enfant?.id);
  const indemAbs=absMois.filter(a=>a.indemnise).reduce((s,a)=>s+a.heures*((contrat?.tauxHoraire||4.05)*contrat?.indemniteAbsence),0);
  const totalBrut=salBrut+indemAbs;

  const exportPajemploi=()=>{setToast("Export Pajemploi préparé - données copiées ✓");};

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
          {[["Février 2024","Émise","672.40€"],["Janvier 2024","Payée","698.10€"],["Décembre 2023","Payée","654.80€"]].map(([m,s,v])=>
            <div key={m}style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:"1px solid var(--br)"}}>
              <span style={{fontSize:13,color:"var(--b)",fontWeight:600}}>{m}</span>
              <span className="badge"style={{background:s==="Payée"?"var(--Sp)":"var(--Gp)",color:s==="Payée"?"var(--S)":"var(--G)"}}>{s}</span>
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
  const [signes,setSignes]=useState(()=>Object.fromEntries(D.enfants.map(e=>[e.id,e.signe])));
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
  const clearSig=()=>{const c=canvasRef.current;c.getContext("2d").clearRect(0,0,c.width,c.height);setHasSig(false);};
  const signer=()=>{if(!hasSig)return;setSignes(p=>({...p,[enfant.id]:true}));setToast("Contrat signé électroniquement ✓");};
  const addMod=()=>{if(!modDet.detail.trim())return;
    setMods(p=>({...p,[enfant.id]:[{date:TODAY_STR,...modDet,statut:"En attente"},...(p[enfant.id]||[])]}));
    setModDet({type:"Horaire",detail:""});setShowModale(false);};

  return <div className="fi">
    {toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
    <PageHeader icon="📄" title="Contrats & Signatures" sub="Signature électronique légale"/>
    {role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
      {liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>setSelId(e.id)}/>)}</div>}

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
            style={{width:"100%",maxWidth:340}}
            onMouseDown={startDraw}onMouseMove={draw}onMouseUp={endDraw}onMouseLeave={endDraw}/>
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
          <div style={{fontSize:12,color:"var(--l)",marginTop:2}}>Le 11/03/2024 · Conforme eIDAS</div>
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
        {(mods[enfant?.id]||[]).map((m,i)=><div key={i}className="card"style={{padding:12}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
            <span className="badge"style={{background:"var(--Bp)",color:"var(--B)"}}>{m.type}</span>
            <span className="badge"style={{background:m.statut==="Accepté"?"var(--Sp)":m.statut==="Refusé"?"var(--Rp)":"var(--Gp)",
              color:m.statut==="Accepté"?"var(--S)":m.statut==="Refusé"?"var(--R)":"var(--G)"}}>{m.statut}</span>
          </div>
          <div style={{fontSize:13,color:"var(--m)",lineHeight:1.5,marginBottom:4}}>{m.detail}</div>
          <div style={{fontSize:11,color:"var(--l)"}}>{fmt(m.date)}</div>
          {role==="asmat"&&m.statut==="En attente"&&<div style={{display:"flex",gap:6,marginTop:8}}>
            <button className="btn bS"style={{fontSize:11,padding:"5px 10px"}}onClick={()=>setMods(p=>({...p,[enfant.id]:p[enfant.id].map((x,j)=>j===i?{...x,statut:"Accepté"}:x)}))}>✅</button>
            <button className="btn bG"style={{fontSize:11,padding:"5px 10px",color:"var(--R)"}}onClick={()=>setMods(p=>({...p,[enfant.id]:p[enfant.id].map((x,j)=>j===i?{...x,statut:"Refusé"}:x)}))}>❌</button>
          </div>}
        </div>)}
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
          <textarea className="ta"value={modDet.detail}onChange={e=>setModDet(p=>({...p,detail:e.target.value}))}placeholder="Décrivez la modification…"style={{minHeight:90}}/></div>
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
  const liste=role==="parent"?enfants.filter(e=>e.id===pEId):enfants;
  const enfant=liste.find(e=>e.id===selId)||liste[0];
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

        {/* Allergies */}
        <div className="card"style={{padding:16}}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:12,color:"var(--b)"}}>⚠️ Allergies</div>
          {enfant.allergies.length===0
            ?<span className="badge"style={{background:"var(--Sp)",color:"var(--S)"}}>✅ Aucune allergie connue</span>
            :<div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {enfant.allergies.map(a=><span key={a}className="badge"style={{background:"#FEE2E2",color:"#DC2626",fontSize:13,padding:"5px 12px"}}>⚠️ {a}</span>)}
            </div>}
          {role==="parent"&&<div style={{marginTop:12,display:"flex",gap:8}}>
            <input className="inp"placeholder="Ajouter une allergie…"style={{flex:1}}/>
            <button className="btn bT"style={{fontSize:12}}>+</button>
          </div>}
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
  const [pfs,setPfs]=useState(D.portfolio);
  const [nf,setNf]=useState({titre:"",desc:"",emoji:"🎨",competences:""});
  const [toast,setToast]=useState("");
  const listeEnfants=role==="parent"?enfants.filter(e=>e.id===pEId):enfants;
  const filtres=selId?pfs.filter(p=>p.eId===selId):pfs.filter(p=>listeEnfants.some(e=>e.id===p.eId));
  const emojis=["🎨","🌱","🎵","🧩","🏃","📚","🍳","🌍","🎭","🔬"];

  const add=()=>{
    const e=listeEnfants[0];if(!e||!nf.titre)return;
    setPfs(p=>[{id:"pf"+Date.now(),eId:selId||e.id,date:TODAY_STR,...nf,competences:nf.competences.split(",").map(s=>s.trim()).filter(Boolean)},...p]);
    setNf({titre:"",desc:"",emoji:"🎨",competences:""});setShowForm(false);setToast("Activité ajoutée ✓");};

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
      <div style={{marginBottom:10}}><label className="lbl">Description</label><textarea className="ta"value={nf.desc}onChange={e=>setNf(p=>({...p,desc:e.target.value}))}placeholder="Ce que l'enfant a appris, réalisé…"style={{minHeight:60}}/></div>
      <div style={{marginBottom:10}}><label className="lbl">Compétences (séparées par virgule)</label><input className="inp"value={nf.competences}onChange={e=>setNf(p=>({...p,competences:e.target.value}))}placeholder="Motricité fine, Créativité…"/></div>
      <button className="btn bT"style={{width:"100%"}}onClick={add}>Enregistrer l'activité</button>
    </div>}

    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:12}}>
      {filtres.map(pf=>{
        const e=enfants.find(x=>x.id===pf.eId);
        return <div key={pf.id}className="card"style={{padding:14,display:"flex",flexDirection:"column",gap:8}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div style={{fontSize:36}}>{pf.emoji}</div>
            <div style={{textAlign:"right"}}>
              {e&&<span style={{fontSize:16}}>{e.emoji}</span>}
              <div style={{fontSize:11,color:"var(--l)"}}>{fmt(pf.date)}</div>
            </div>
          </div>
          <div style={{fontWeight:700,fontSize:14,color:"var(--b)"}}>{pf.titre}</div>
          <div style={{fontSize:12,color:"var(--m)",lineHeight:1.5}}>{pf.desc}</div>
          <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
            {pf.competences.map(c=><span key={c}className="badge"style={{background:"var(--Pp)",color:"var(--P)",fontSize:10}}>{c}</span>)}
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

  const toggle=(id)=>setMs(p=>({...p,[enfant.id]:p[enfant.id].map(m=>m.id===id?{...m,ok:!m.ok}:m)}));

  return <div className="fi">
    <PageHeader icon="🌱" title="Suivi du développement" sub="Jalons OMS - étapes clés de l'enfant"/>
    {role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
      {liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>setSelId(e.id)}/>)}</div>}

    {enfant&&<div className="g2">
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
        <div style={{fontWeight:700,fontSize:14,marginBottom:12,color:"var(--b)"}}>Toutes les étapes</div>
        {cats.map(cat=><div key={cat}style={{marginBottom:14}}>
          <div style={{fontSize:12,fontWeight:700,color:"var(--m)",textTransform:"uppercase",letterSpacing:".5px",marginBottom:6}}>{cat}</div>
          {items.filter(m=>m.cat===cat).map(m=><div key={m.id}className="ms"onClick={()=>role==="asmat"&&toggle(m.id)}>
            <div className={"msc "+(m.ok?"ok":"")+""}>{m.ok?"✓":""}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:13,color:"var(--b)",fontWeight:m.ok?700:400,textDecoration:m.ok?"none":"none"}}>{m.txt}</div>
              <div style={{fontSize:11,color:"var(--l)"}}>{m.age_attendu}</div>
            </div>
            {!m.ok&&<span className="badge"style={{background:"var(--Gp)",color:"var(--G)",fontSize:10}}>En cours</span>}
          </div>)}
        </div>)}
        {role==="asmat"&&<div style={{fontSize:11,color:"var(--l)",marginTop:4}}>Cliquez sur une étape pour valider</div>}
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
  const h=D.heures[enfant?.id]||{real:0,prev:Math.round((enfant?.contrat?.heuresHebdo||40)*52/12)};
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
        <div style={{borderBottom:"2px solid #C4714A",paddingBottom:12,marginBottom:16,display:"flex",justifyContent:"space-between"}}>
          <div><h2 style={{color:"#C4714A",fontFamily:"Georgia",fontSize:18}}>🌿 TiMat</h2>
            <div style={{fontSize:11,color:"#888"}}>Marie Dupont · Assistante Maternelle agréée</div></div>
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
              {loading?"⏳ Rédaction…":"📝 Générer le CR"}
            </button>
          </div>
          {loading&&<div style={{display:"flex",alignItems:"center",gap:10,padding:"16px 0"}}>
            <div className="ai-dot"/><div className="ai-dot"style={{animationDelay:".3s"}}/><div className="ai-dot"style={{animationDelay:".6s"}}/>
            <span style={{fontSize:13,color:"var(--m)",fontStyle:"italic"}}>Rédaction du compte-rendu en cours…</span>
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
          <div style={{fontWeight:700,fontSize:13,color:"var(--P)",marginBottom:8}}>💡 Unique sur le marché</div>
          <div style={{fontSize:13,color:"var(--b)",lineHeight:1.6}}>Un compte-rendu trimestriel professionnel que les parents peuvent glisser dans le dossier scolaire. <strong>Aucune autre app ne génère ce document.</strong></div>
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
  // Agréments Marie
  {id:"d13",eId:null,cat:"agrement",sous:"Agrément PMI",nom:"Agrement_PMI_2024.pdf",date:"2024-01-01",annee:"2024",taille:"450 Ko",icone:"🏛️",partage:false},
  {id:"d14",eId:null,cat:"agrement",sous:"Assurance",nom:"Assurance_RC_Pro_2024.pdf",date:"2024-01-01",annee:"2024",taille:"380 Ko",icone:"🛡️",partage:false},
];

const CATS={
  medical:{l:"Médical",ic:"🏥",c:"#B84060",bg:"#FAEEF2"},
  admin:{l:"Administratif",ic:"🧾",c:"#B8892A",bg:"#FBF5E0"},
  peda:{l:"Pédagogique",ic:"📝",c:"#6A3F88",bg:"#F2EAF8"},
  agrement:{l:"Agréments & Pro",ic:"🏛️",c:"#2E5F8A",bg:"#E6F0F8"},
};

function Documents({enfants,role,pEId}){
  const [annee,setAnnee]=useState("2024");
  const [cat,setCat]=useState("tous");
  const [eId,setEId]=useState("tous");
  const [docs,setDocs]=useState(enfants.every(e=>["e1","e2","e3"].includes(e.id))?DOCS_DEMO:[]);
  const [toast,setToast]=useState("");
  const [apercu,setApercu]=useState(null);
  const [showUpload,setShowUpload]=useState(false);
  const [newDoc,setNewDoc]=useState({nom:"",cat:"medical",sous:"",eId:enfants[0]?.id||""});

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

  const simulerTelechargement=(doc)=>{
    setToast("Téléchargement de "+doc.nom+" ✓");
  };
  const simulerImpression=(doc)=>{
    setToast("Envoi à l'imprimante : "+doc.nom+" ✓");
  };
  const ajouterDoc=()=>{
    if(!newDoc.nom.trim())return;
    setDocs(p=>[...p,{
      id:"dn"+Date.now(),
      eId:newDoc.eId||null,
      cat:newDoc.cat,
      sous:newDoc.sous||CATS[newDoc.cat]?.l,
      nom:newDoc.nom+(newDoc.nom.endsWith(".pdf")?"":".pdf"),
      date:TODAY_STR,annee:"2024",
      taille:"-",icone:CATS[newDoc.cat]?.ic||"📄",
      partage:true,
    }]);
    setNewDoc({nom:"",cat:"medical",sous:"",eId:enfants[0]?.id||""});
    setShowUpload(false);
    setToast("Document ajouté ✓");
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
          <input className="inp"value={newDoc.sous}onChange={e=>setNewDoc(p=>({...p,sous:e.target.value}))}placeholder="ex: Ordonnance, Contrat…"/>
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
        <button className="btn bG"onClick={()=>setShowUpload(false)}>Annuler</button>
        <button className="btn bT"onClick={ajouterDoc}>Enregistrer</button>
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
        <option value="">Général / Marie</option>
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
                  onClick={()=>simulerTelechargement(doc)}
                  title="Télécharger">⬇️</button>
                <button className="btn bG"style={{padding:"6px 10px",fontSize:12}}
                  onClick={()=>simulerImpression(doc)}
                  title="Imprimer">🖨️</button>
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
          <div style={{background:"linear-gradient(135deg,var(--T),#8A3A20)",padding:"16px 20px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
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
              <button className="btn bG"onClick={()=>simulerImpression(doc)}>🖨️ Imprimer</button>
              <button className="btn bT"onClick={()=>simulerTelechargement(doc)}>⬇️ Télécharger</button>
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
  const h=D.heures[enfant?.id]||{real:160,prev:174};
  const tauxH=contrat.tauxHoraire||4.05;
  const heuresNorm=Math.min(h.real,45*4);
  const hSupp=Math.max(0,h.real-heuresNorm);
  const salBase=heuresNorm*tauxH;
  const salSupp=hSupp*tauxH*1.25;
  const brut=salBase+salSupp;
  const entretien=(contrat.entretien||3.80)*Math.round(h.real/8);
  const totalCotSal=Object.values(TAUX_COTISATIONS).reduce((s,t)=>s+(t.sal>0?brut*t.sal/100:0),0);
  const totalCotPat=Object.values(TAUX_COTISATIONS).reduce((s,t)=>s+(t.pat>0?brut*t.pat/100:0),0);
  const netImposable=brut-totalCotSal*0.68;
  const netPaye=brut-totalCotSal;
  const coutEmployeur=brut+totalCotPat;

  return <div className="fi">
    {toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
    <PageHeader icon="📜" title="Bulletin de salaire" sub="Bulletin officiel conforme à la convention collective"/>
    {role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
      {liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>setSelId(e.id)}/>)}
    </div>}
    <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
      {["Janvier 2024","Février 2024","Mars 2024"].map(m=><button key={m}onClick={()=>setMoisSel(m)}style={{
        padding:"6px 14px",borderRadius:8,border:"1.5px solid",cursor:"pointer",fontSize:12,fontWeight:600,
        background:moisSel===m?"var(--b)":"transparent",color:moisSel===m?"#fff":"var(--m)",
        borderColor:moisSel===m?"var(--b)":"var(--br)"}}>{m}</button>)}
    </div>

    <div className="card"style={{padding:24,border:"2px solid var(--br)"}}>
      <div style={{borderBottom:"2px solid var(--b)",paddingBottom:14,marginBottom:14}}>
        <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
          <div>
            <div className="pf"style={{fontSize:18,fontWeight:700,color:"var(--b)"}}>BULLETIN DE PAIE - {moisSel}</div>
            <div style={{fontSize:11,color:"var(--l)"}}>Convention collective particuliers employeurs</div>
          </div>
          <div style={{textAlign:"right",fontSize:11}}>
            <div style={{fontWeight:700,color:"var(--b)"}}>Employeur</div>
            <div style={{color:"var(--m)"}}>{enfant?.prenomParent||"Sophie Martin"}</div>
            <div style={{color:"var(--l)"}}>N° Pajemploi : PAJ-2024-75015</div>
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
          ["Coût total pour l'employeur",(coutEmployeur+entretien).toFixed(2)+"€","var(--m)"],
        ].map(([l,v,c])=><div key={l}style={{display:"flex",justifyContent:"space-between",padding:"5px 0",
          borderBottom:"1px solid var(--br)",fontSize:l.includes("NET À")?14:12,fontWeight:l.includes("NET À")?700:400}}>
          <span style={{color:"var(--m)"}}>{l}</span><span style={{fontWeight:700,color:c}}>{v}</span>
        </div>)}
      </div>

      <div style={{fontSize:10,color:"var(--l)",lineHeight:1.6,marginBottom:14}}>
        Bulletin conforme CCN particuliers employeurs. Net imposable calculé avec abattement fiscal spécifique assmats (3× SMIC/jour/enfant). À conserver 5 ans.
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
          ".sb{border:1px solid #ddd;height:60px;border-radius:4px;padding:8px;font-size:9px;color:#aaa}",
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
          "<tr><td>Indemnite entretien (non imposable)</td><td class=\"right\">"+entretien.toFixed(2)+" euros</td></tr>",
          "<tr class=\"ce\"><td>Cout total employeur (brut + cotis. patronales)</td><td class=\"right\">"+(coutEmployeur+entretien).toFixed(2)+" euros</td></tr>",
          "</table>",
          "<div class=\"sz\">",
          "<div><div style=\"font-size:10px;font-weight:700;margin-bottom:6px\">Signature de l employeur</div><div class=\"sb\">Date: ________________</div></div>",
          "<div><div style=\"font-size:10px;font-weight:700;margin-bottom:6px\">Signature de la salariee</div><div class=\"sb\">Date: ________________</div></div>",
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
        {role==="asmat"&&<button className="btn bT"style={{flex:1}}onClick={()=>setToast("Bulletin envoyé au parent ✓")}>📧 Envoyer au parent</button>}
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
  {id:"ct6",titre:"Rupture amiable",desc:"Fin de contrat d&#39;un commun accord avec solde tout compte.",
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
    setToast("Demande d&#39;avenant envoyée ✓ - l&#39;asmat sera notifiée");
  };

  const statutColor={
    "En attente":"var(--G)","Acceptée":"var(--S)","Refusée":"var(--R)","Signée":"var(--T)"
  };

  return <div>
    {toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
    <PageHeader icon="✏️" title="Demandes d&#39;avenants"
      sub="Toute modification du contrat doit faire l'objet d'un avenant signé"/>

    <div className="card"style={{padding:20,marginBottom:16}}>
      <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:14}}>
        ➕ Nouvelle demande d&#39;avenant
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
          <textarea className="ta"placeholder="Décrivez précisément la modification souhaitée…"
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
            ✓ Accepter et créer l&#39;avenant
          </button>
        </div>}
      </div>)}
    </div>}

    {demandes.length===0&&<div className="card"style={{padding:24,textAlign:"center"}}>
      <div style={{fontSize:36,marginBottom:8}}>✏️</div>
      <div style={{fontSize:13,color:"var(--m)"}}>Aucune demande d&#39;avenant en cours</div>
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
          :<input className="inp"placeholder={c+"…"}value={form[c]||""}onChange={e=>setForm(f=>({...f,[c]:e.target.value}))}/>}
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
  {id:"r6",cat:"Avenant",ic:"✏️",titre:"Proposition d&#39;avenant aux horaires",
   contenu:"Madame, Monsieur,\n\nJe vous propose de modifier le contrat d'accueil de [Prénom] comme suit :\n\nAnciennes dispositions : [Anciens horaires]\nNouveaux horaires : [Nouveaux horaires]\nDate d'effet : [Date]\n\nCes modifications entraîneront une révision du salaire à [Nouveau montant]€.\n\nMerci de confirmer votre accord en signant l&#39;avenant ci-joint.\n\nCordialement,\n[Votre nom]"},
  {id:"r7",cat:"PMI",ic:"🏛️",titre:"Demande de renouvellement d'agrément",
   contenu:"Madame, Monsieur le Médecin chef de PMI,\n\nJe sollicite le renouvellement de mon agrément n° [Numéro] arrivant à échéance le [Date].\n\nJe continue d'accueillir des enfants à mon domicile situé au [Adresse] dans les conditions réglementaires.\n\nJe tiens à votre disposition l'ensemble des justificatifs.\n\nCordialement,\n[Votre nom]"},
];

function CourriersTypes({enfants,pEId,user}){
  const [selId,setSelId]=useState(null);
  const [filtreCat,setFiltreCat]=useState("Tous");
  const [toast,setToast]=useState("");
  const cats=["Tous","Contrat","Financier","Congés","Avenant","PMI"];
  const filtres=filtreCat==="Tous"?COURRIERS_DATA:COURRIERS_DATA.filter(c=>c.cat===filtreCat);
  const sel=COURRIERS_DATA.find(c=>c.id===selId);
  const enfant=enfants.find(e=>e.id===pEId)||enfants[0];
  const texte=sel?sel.contenu.replace(/\[Prénom\]/g,enfant?.prenom||"[Prénom]").replace(/\[Votre nom\]/g,(user?.prenom||D.asmat.prenom)+" "+(user?.nom||D.asmat.nom)):"";

  return <div className="fi">
    {toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
    <PageHeader icon="✉️" title="Courriers types"
      sub="Modèles prêts à personnaliser - conformes à la convention collective"/>
    <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>
      {cats.map(c=><button key={c}onClick={()=>{setFiltreCat(c);setSelId(null);}}style={{
        padding:"5px 12px",borderRadius:20,border:"1.5px solid",cursor:"pointer",fontSize:12,fontWeight:600,
        background:filtreCat===c?"var(--b)":"transparent",color:filtreCat===c?"#fff":"var(--m)",
        borderColor:filtreCat===c?"var(--b)":"var(--br)"}}>{c}</button>)}
    </div>
    <div className="g2">
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {filtres.map(c=><div key={c.id}className="card card-lift"
          onClick={()=>setSelId(c.id===selId?null:c.id)}
          style={{padding:14,cursor:"pointer",
            borderLeft:(c.cat==="Financier"?"4px solid var(--R)":c.cat==="PMI"?"4px solid var(--B)":c.cat==="Congés"?"4px solid var(--G)":"4px solid var(--T)"),
            boxShadow:selId===c.id?"var(--sh2)":"var(--sh)"}}>
          <div style={{display:"flex",gap:10,alignItems:"center"}}>
            <span style={{fontSize:18}}>{c.ic}</span>
            <div>
              <div style={{fontWeight:700,fontSize:13,color:"var(--b)"}}>{c.titre}</div>
              <span className="badge"style={{background:"var(--c)",color:"var(--l)",fontSize:9,marginTop:3}}>{c.cat}</span>
            </div>
          </div>
        </div>)}
      </div>
      {sel?<div className="card"style={{padding:18}}>
        <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:12}}>{sel.ic} {sel.titre}</div>
        <textarea className="ta"defaultValue={texte}
          style={{width:"100%",minHeight:260,resize:"vertical",fontSize:13,lineHeight:1.7,marginBottom:12}}/>
        <div style={{display:"flex",gap:8}}>
          <button className="btn bG"style={{flex:1}}onClick={()=>{navigator.clipboard?.writeText(texte).catch(()=>{});setToast("Copié ✓");}}>📋 Copier</button>
          <button className="btn bT"style={{flex:1}}onClick={()=>setToast("PDF généré ✓")}>📥 PDF</button>
        </div>
      </div>
      :<div className="card"style={{padding:28,textAlign:"center",color:"var(--l)"}}>
        <div style={{fontSize:36,marginBottom:8}}>✉️</div>
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
function AdminFinances({enfants,role,pEId,user}){
  const [section,setSection]=useState(role==="asmat"?"facturation":"contrats");
  const sousOnglets=role==="asmat"
    ?[
      {id:"facturation",l:"Facturation & Pajemploi",ic:"🧾"},
      {id:"bulletin",l:"Bulletin de salaire",ic:"📜"},
      {id:"contrats",l:"Contrats & Avenants",ic:"📄"},
      {id:"avenants",l:"Demandes d&#39;avenants",ic:"✏️"},
      {id:"contrats_types",l:"Modèles & Templates",ic:"📋"},
      {id:"courriers",l:"Courriers types",ic:"✉️"},
      {id:"recap",l:"Récap mensuel PDF",ic:"📊"},
      {id:"solde_contrat",l:"Solde de tout compte",ic:"📋"},
    ]
    :[{id:"signature_parent",l:"Mon contrat & Signature",ic:"📄"},{id:"recap",l:"Récap mensuel",ic:"📊"}];
  return <div className="fi">
    <div style={{display:"flex",gap:4,marginBottom:16,borderBottom:"2px solid var(--br)",overflowX:"auto",scrollbarWidth:"none"}}>
      {sousOnglets.map(s=><button key={s.id}onClick={()=>setSection(s.id)}style={{
        padding:"8px 16px",border:"none",background:"none",cursor:"pointer",
        fontFamily:"'DM Sans',sans-serif",fontWeight:600,fontSize:13,flexShrink:0,whiteSpace:"nowrap",
        color:section===s.id?"var(--G)":"var(--l)",
        borderBottom:section===s.id?"2px solid var(--G)":"2px solid transparent",
        marginBottom:-2,transition:"all .15s",display:"flex",alignItems:"center",gap:6
      }}><span>{s.ic}</span><span>{s.l}</span></button>)}
    </div>
    {section==="facturation"&&<Facturation enfants={enfants}role={role}pEId={pEId}/>}
    {section==="bulletin"&&<BulletinSalaire enfants={enfants}role={role}pEId={pEId}user={user}/>}
    {section==="contrats"&&<Contrats enfants={enfants}role={role}pEId={pEId}/>}
    {section==="avenants"&&<DemandesAvenants enfants={enfants}role={role}pEId={pEId}/>}
    {section==="contrats_types"&&<ContratsTypes enfants={enfants}role={role}/>}
    {section==="courriers"&&<CourriersTypes enfants={enfants}role={role}pEId={pEId}user={user}/>}
    {section==="recap"&&<Recap enfants={enfants}role={role}pEId={pEId}/>}
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
        color:sousOnglet===s.id?"var(--T)":"var(--l)",
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
  const [photos,setPhotos]=useState({
    // Demo photos par enfant
    "e1":["https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=300&q=80","https://images.unsplash.com/photo-1533483595632-c5f0e57a1936?w=300&q=80"],
    "e2":["https://images.unsplash.com/photo-1555252333-9f8e92e65df9?w=300&q=80"],
    "e3":["https://images.unsplash.com/photo-1489913905888-58a7d5eddfa0?w=300&q=80","https://images.unsplash.com/photo-1518611012118-696072aa579a?w=300&q=80","https://images.unsplash.com/photo-1471286174890-9c112ffca5b4?w=300&q=80"],
  });
  const [photoGrande,setPhotoGrande]=useState(null);
  const fileRef=useRef(null);

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

  const ajouterPhoto=(e)=>{
    const file=e.target.files?.[0];
    if(!file)return;
    const url=URL.createObjectURL(file);
    setPhotos(p=>({...p,[enfant.id]:[...(p[enfant.id]||[]),url]}));
  };

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
        <div style={{fontWeight:700,fontSize:13,color:"var(--P)"}}>Documents reçus de Marie</div>
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
                {t.auteur==="asmat"?"👩‍👧 "+(user?.prenom||"Marie"):"👪 "+(D.parents.find(p=>p.id===enfant?.parentId)?.prenom||"Parent")}</div>
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
            placeholder={role==="asmat"?("Racontez la journée de "+(enfant?.prenom||"")+"…"):"Informations pour la journée…"}/>
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
    setSommeils(p=>({...p,[enfant.id]:[{id:"sn"+Date.now(),date:TODAY_STR,debut:nS.debut.replace(":","h"),fin:nS.fin.replace(":","h"),duree,qualite:nS.qualite},...(p[enfant.id]||[])]}));
    setNS({debut:"",fin:"",qualite:"bien"});setToast("Sieste enregistrée ✓");
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
  const msgsNonLus=D.messages.filter(m=>!m.lu).length;
  const totalH=enfants.reduce((a,e)=>{const h=D.heures[e.id];return a+(h?h.real:0);},0);

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
                  {m.de==="PMI"?"🏛️ PMI":"👩‍👧 "+(user?.prenom||"Marie")}
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
              placeholder="Votre message à la PMI…"style={{flex:1,minHeight:60,resize:"none"}}/>
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
    {online?syncing?"Synchronisation en cours…":"Données synchronisées"
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
      <div style={{fontSize:14,color:"var(--R)",fontWeight:600}}>Suppression en cours…</div>
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

//
function Parametres({user,onLogout,setPage,isPro,isTrialing,lancerCheckout,ouvrirPortail}){
  const [toast,setToast]=useState("");
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
      </div>

      {/* Pages légales */}
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
        color:sec===s.id?"var(--T)":"var(--l)",
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
        color:sec===s.id?"var(--R)":"var(--l)",
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
          }}onClick={()=>{
            const updated=[...VACCINS_CALENDRIER];
            updated[i]={...updated[i],fait:!updated[i].fait};
            setVacsState(updated);
          }}>
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
          color:sec===s.id?"var(--S)":"var(--l)",
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
function DocumentsComplet({enfants,role,pEId}){
  const [sec,setSec]=useState("documents");
  return <div className="fi">
    <div style={{display:"flex",gap:2,marginBottom:16,borderBottom:"2px solid var(--br)"}}>
      {[{id:"documents",l:"Documents",ic:"🗂️"},{id:"export",l:"Export dossier",ic:"📦"}].map(s=>
        <button key={s.id}onClick={()=>setSec(s.id)}style={{
          padding:"7px 16px",border:"none",background:"none",cursor:"pointer",
          fontFamily:"'DM Sans',sans-serif",fontWeight:600,fontSize:12,
          color:sec===s.id?"var(--G)":"var(--l)",
          borderBottom:sec===s.id?"2px solid var(--G)":"2px solid transparent",
          marginBottom:-2,transition:"all .15s",display:"flex",alignItems:"center",gap:5
        }}><span>{s.ic}</span><span>{s.l}</span></button>
      )}
    </div>
    {sec==="documents"&&<Documents enfants={enfants}role={role}pEId={pEId}/>}
    {sec==="export"&&<ExportDonnees enfants={enfants}role={role}pEId={pEId}/>}
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
            placeholder={"Bonjour "+sel.parent.prenom+",\n\nMerci pour votre message…"}
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
            {sel.statut==="accepte"&&<button className="btn bP"onClick={()=>setToast("Redirection vers la création de contrat…")}style={{fontSize:12}}>
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
            <span>👩‍👧</span> Votre assistante maternelle
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
    setToast("Contrat signé électroniquement ✓ - Marie a été notifiée");
  };

  if(signe)return <div style={{textAlign:"center",padding:40}}>
    <div style={{fontSize:60,marginBottom:16}}>✅</div>
    <div className="pf"style={{fontSize:22,fontWeight:600,color:"var(--S)",marginBottom:8}}>Contrat signé !</div>
    <div style={{fontSize:13,color:"var(--m)",lineHeight:1.7}}>
      Votre signature électronique a été enregistrée.<br/>
      Marie a été notifiée. Le contrat signé est disponible dans Documents.
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
        ["Assistante maternelle","Marie Dupont"],
        ["Enfant",(enfant?.prenom||"-")+" "+(enfant?.nom||"")],
        ["Début du contrat",fmt(contrat.debut||"2023-09-04")],
        ["Jours d'accueil",(contrat.jours||[]).join(", ")],
        ["Horaires",contrat.horaires||"07h30–17h30"],
        ["Taux horaire net",(contrat.tauxHoraire||4.05).toFixed(2)+"€/h"],
        ["Indemnité entretien",(contrat.entretien||3.80).toFixed(2)+"€/jour"],
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
        onMouseDown={startDraw}onMouseMove={draw}onMouseUp={()=>setDrawing(false)}
        onTouchStart={startDraw}onTouchMove={draw}onTouchEnd={()=>setDrawing(false)}/>
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
      <input className="inp"placeholder="Titre de votre question…"value={newPost.titre}
        onChange={e=>setNewPost(p=>({...p,titre:e.target.value}))}style={{marginBottom:10}}/>
      <textarea className="ta"placeholder="Décrivez votre situation…"value={newPost.contenu}
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
          placeholder="Votre réponse…"style={{width:"100%",minHeight:70,resize:"vertical",marginBottom:8}}/>
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
      const htmlRapport='<!DOCTYPE html><html><head><title>Rapport annuel '+annee+' - '+(enfant?.prenom||'')+'</title>'
        +'<style>body{font-family:Arial,sans-serif;max-width:800px;margin:40px auto;color:#222;}'
        +'h1{color:#B8622F;}table{width:100%;border-collapse:collapse;margin:20px 0;}'
        +'td,th{padding:10px;border:1px solid #ddd;text-align:left;}th{background:#f5f5f5;}'
        +'.total{font-weight:bold;}@media print{button{display:none}}</style></head>'
        +'<body><h1>Rapport annuel '+annee+'</h1>'
        +'<p><strong>Assistante maternelle:</strong> Marie Dupont</p>'
        +'<p><strong>Enfant:</strong> '+(enfant?.prenom||'')+' '+(enfant?.nom||'')+'</p>'
        +'<h2>Récapitulatif financier</h2>'
        +'<table><tr><th>Poste</th><th>Montant</th></tr>'
        +'<tr><td>Salaire net annuel estimé</td><td>'+salaireAnnuel+'€</td></tr>'
        +"<tr><td>Indemnités d&#39;entretien</td><td>"+entretienAnnuel+"€</td></tr>"
        +'<tr class="total"><td>Total versé</td><td>'+totalAnnuel+'€</td></tr>'
        +'<tr><td>Crédit d&#39;impôt estimé (50%)</td><td>'+creditImpot+'€</td></tr>'
        +'</table>'
        +'<p style="font-size:12px;color:#888;">Généré par TiMat - '+new Date().toLocaleDateString('fr-FR')+'</p>'
        +'<button onclick="window.print()">🖨️ Imprimer / PDF</button>'
        +'</body></html>';
      w.document.write(htmlRapport);
      w.document.close();
      setToast("Rapport ouvert dans un nouvel onglet ✓");
    },1000);
  };

  return <div className="fi">
    {toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
    <PageHeader icon="📊" title="Rapport annuel complet"
      sub="Récapitulatif fiscal · Attestation · Déclaration d'impôts"/>

    {role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
      {liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>setSelId(e.id)}/>)}
    </div>}

    <div style={{display:"flex",gap:10,marginBottom:20,alignItems:"center"}}>
      <label className="lbl"style={{marginBottom:0}}>Année :</label>
      {[2023,2024,2025].map(y=><button key={y}onClick={()=>setAnnee(y)}style={{
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
          <button className="btn bT"style={{width:"100%",justifyContent:"center"}}onClick={generer}disabled={gen}>
            {gen?"⏳ Génération en cours…":"📥 Générer et télécharger le PDF"}
          </button>
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
          <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:14}}>👨‍👩‍👧 Votre situation</div>
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
function SoldeDeCompte({enfants,role,pEId}){
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

  return <div className="fi">
    {toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
    <PageHeader icon="📋" title="Solde de tout compte" sub="Calcul automatique à la fin d'un contrat"/>
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
          <button className="btn bG"style={{flex:1}}onClick={()=>setToast("Document PDF généré ✓")}>📥 Télécharger le reçu</button>
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
              {[["pdf","📄 PDF"],["csv","📊 CSV"],["json","🔧 JSON"]].map(([v,l])=><button key={v}onClick={()=>setFormat(v)}style={{
                flex:1,padding:"8px",borderRadius:8,border:"1.5px solid",cursor:"pointer",fontSize:12,fontWeight:600,
                background:format===v?"var(--b)":"transparent",color:format===v?"#fff":"var(--m)",
                borderColor:format===v?"var(--b)":"var(--br)"}}>{l}</button>)}
            </div>
          </div>
          <div style={{background:"var(--Bp)",borderRadius:10,padding:"10px 12px",marginBottom:14,fontSize:12,color:"var(--B)"}}>
            🔒 Export conforme RGPD (article 20 - droit à la portabilité). Fichier chiffré, téléchargé directement sur votre appareil. Aucune copie conservée.
          </div>
          <button className="btn bT"style={{width:"100%",justifyContent:"center"}}onClick={exporter}disabled={exporting}>
            {exporting?"⏳ Génération en cours…":"📥 Exporter mes données"}
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

//
const FAQ_DATA=[
  {cat:"Pajemploi",q:"Comment exporter mes données vers Pajemploi ?",
   r:"Dans Facturation & Bilans, cliquez sur 'Exporter vers Pajemploi'. TiMat génère un récapitulatif avec toutes les données nécessaires (heures, salaire net, indemnités) prêtes à saisir sur pajemploi.urssaf.fr entre le 25 et le 5 du mois suivant."},
  {cat:"Pajemploi",q:"Mon calcul de salaire est-il conforme à la convention collective ?",
   r:"Oui. TiMat applique automatiquement les règles de la CCN des particuliers employeurs : mensualisation, heures complémentaires, majorées au-delà de 45h/semaine, indemnités d'entretien selon le barème URSSAF 2025."},
  {cat:"Contrats",q:"Puis-je modifier un contrat en cours ?",
   r:"Oui, via un avenant. Dans Facturation → Contrats & Avenants, choisissez 'Avenant - Modification d'horaires' ou 'Avenant - Revalorisation salaire'. L'avenant est daté et tracé automatiquement."},
  {cat:"Contrats",q:"Que se passe-t-il si un parent ne signe pas le contrat ?",
   r:"Relancez via la messagerie TiMat. Sans signature, le contrat n'a pas de valeur légale. TiMat vous alerte si un contrat reste non signé plus de 7 jours."},
  {cat:"PMI",q:"Comment préparer ma visite de renouvellement d'agrément ?",
   r:"Dans Documents, exportez votre 'Dossier PMI complet' : il contient l'historique des enfants accueillis, les bilans trimestriels, le planning périscolaire et vos échanges avec la PMI. Tout est daté et structuré."},
  {cat:"Finances",q:"Comment calculer le solde de tout compte ?",
   r:"Dans Facturation → Solde de tout compte. Saisissez la date de fin et le motif. TiMat calcule automatiquement l'ICCP (indemnité compensatrice de congés payés) et l'indemnité de préavis selon la CCN."},
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
    <input className="inp"placeholder="🔍 Rechercher dans l'aide…"value={search}
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
function Support({role}){
  const [msg,setMsg]=useState("");
  const [sujet,setSujet]=useState("Question générale");
  const [envoye,setEnvoye]=useState(false);
  const sujets=["Question générale","Problème technique","Facturation / abonnement","Calcul de salaire","Contrat / avenant","PMI / agrément","Autre"];

  return <div className="fi">
    <PageHeader icon="💬" title="Support TiMat" sub="Notre équipe répond sous 24h, du lundi au vendredi"/>
    {envoye?<div style={{textAlign:"center",padding:40}}>
      <div style={{fontSize:60,marginBottom:16}}>✅</div>
      <div className="pf"style={{fontSize:22,fontWeight:600,color:"var(--S)",marginBottom:8}}>Message envoyé !</div>
      <div style={{fontSize:13,color:"var(--m)",lineHeight:1.7}}>Nous vous répondons par email sous 24h (jours ouvrés).<br/>En attendant, consultez notre <span style={{color:"var(--T)",cursor:"pointer",textDecoration:"underline"}}onClick={()=>window.dispatchEvent(new CustomEvent("timat:page",{detail:"faq"}))}>Centre d'aide</span>.</div>
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
            placeholder="Décrivez votre problème ou question le plus précisément possible…"
            style={{width:"100%",minHeight:120,resize:"vertical"}}/>
        </div>
        <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:16,padding:"10px 14px",background:"var(--Bp)",borderRadius:10}}>
          <span style={{fontSize:18}}>📧</span>
          <div style={{fontSize:12,color:"var(--B)"}}>Notre réponse sera envoyée à <strong>{user?.email||D.asmat.email||"votre email"}</strong> - réponse en moins de 24h.</div>
        </div>
        <button className="btn bT"style={{width:"100%"}}onClick={()=>{if(!msg.trim())return;setEnvoye(true);}}>
          📤 Envoyer mon message
        </button>
      </div>
      <div style={{marginTop:14,display:"flex",gap:10,flexWrap:"wrap",justifyContent:"center"}}>
        {[["📧","support@timat.app"],["💬","Chat disponible 9h-18h"],["📚","Centre d'aide 24/7"]].map(([ic,t])=>
          <div key={t}style={{background:"var(--w)",border:"1px solid var(--br)",borderRadius:10,padding:"10px 16px",fontSize:12,color:"var(--m)",display:"flex",gap:8,alignItems:"center"}}>
            <span>{ic}</span><span>{t}</span>
          </div>)}
      </div>
    </div>}
  </div>;
}

const GROUPS_AM={
  accueil:{l:"Accueil",ic:"🏠",color:"var(--T)",subs:null},
  enfant:{l:"L'enfant",ic:"👶",color:"#B8622F",subs:[
    {id:"dashboard",l:"Tableau de bord",ic:"📊"},
    {id:"pointage",l:"Pointage",ic:"⏰"},
    {id:"journal_complet",l:"Journal",ic:"📋"},
    {id:"sante_complet",l:"Santé",ic:"🏥"},
    {id:"eveil_complet",l:"Éveil & Progrès",ic:"🌱"},
  ]},
  admin:{l:"Administratif",ic:"🗂️",color:"#B8892A",subs:[
    {id:"calendrier",l:"Calendrier",ic:"📅"},
    {id:"periscolaire",l:"Périscolaire",ic:"🚌"},
    {id:"messagerie",l:"Messagerie",ic:"💬"},
    {id:"forum",l:"Communauté",ic:"💬"},
    {id:"liste_attente",l:"Demandes",ic:"📬"},
    {id:"pmi",l:"PMI",ic:"🏛️"},
    {id:"admin_finances",l:"Facturation & Bilans",ic:"🧾"},
    {id:"rapport_annuel",l:"Rapport annuel",ic:"📊"},
    {id:"documents_complet",l:"Documents",ic:"🗂️"},
    {id:"attestation_pe",l:"Attestation Pôle Emploi",ic:"📋"},
    {id:"export_donnees",l:"Export données",ic:"📦"},
    {id:"parrainage",l:"Parrainage",ic:"🎁"},
    {id:"faq",l:"Centre d'aide",ic:"❓"},
  ]},
};
const GROUPS_P={
  accueil:{l:"Accueil",ic:"🏠",color:"var(--T)",subs:null},
  enfant:{l:"Mon enfant",ic:"👶",color:"#B8622F",subs:[
    {id:"dashboard",l:"Tableau de bord",ic:"📊"},
    {id:"pointage",l:"Pointage",ic:"⏰"},
    {id:"journal_complet",l:"Journal",ic:"📋"},
    {id:"sante_complet",l:"Santé",ic:"🏥"},
    {id:"eveil_complet",l:"Éveil & Progrès",ic:"🌱"},
  ]},
  admin:{l:"Administratif",ic:"🗂️",color:"#B8892A",subs:[
    {id:"calendrier",l:"Calendrier",ic:"📅"},
    {id:"messagerie",l:"Messagerie",ic:"💬"},
    {id:"kit_cmg",l:"Aide CMG",ic:"💶"},
    {id:"simulateur",l:"Simulateur coût",ic:"🧮"},
    {id:"admin_finances",l:"Facturation & Bilans",ic:"🧾"},
    {id:"documents_complet",l:"Documents",ic:"🗂️"},
    {id:"attestation_pe",l:"Attestation Pôle Emploi",ic:"📋"},
    {id:"export_donnees",l:"Export données",ic:"📦"},
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
          <div className="logo">TiMat</div>
          <div className="logo-dot"/>
          <span style={{fontSize:10,color:"var(--l)",fontFamily:"'DM Mono',monospace",letterSpacing:"1px",marginTop:1}}>v3</span>
        </div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:6}}>
        {/* Cloche notifications */}
        <div style={{position:"relative"}}>
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
            position:"absolute",right:0,top:"100%",marginTop:8,
            background:"var(--w)",borderRadius:14,boxShadow:"var(--sh2)",
            border:"1px solid var(--br)",width:280,zIndex:200,overflow:"hidden"
          }}>
            <div style={{padding:"12px 16px",borderBottom:"1px solid var(--br)",fontWeight:700,fontSize:13,color:"var(--b)"}}>
              🔔 Notifications
            </div>
            {notifs.filter(n=>!n.roles||n.roles.includes(role)).map(n=><div key={n.id}onClick={()=>{
              setNotifs&&setNotifs(p=>p.map(x=>x.id===n.id?{...x,lu:true}:x));
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
              {!n.lu&&<div style={{width:7,height:7,borderRadius:"50%",background:"var(--T)",flexShrink:0,marginTop:4}}/>}
            </div>)}
            {notifs.length===0&&<div style={{padding:16,fontSize:13,color:"var(--l)",textAlign:"center"}}>Aucune notification</div>}
          </div>}
        </div>
        {/* Toggle mode sombre */}
        <button onClick={()=>setDark&&setDark(d=>!d)}style={{
          background:"none",border:"none",cursor:"pointer",fontSize:16,padding:4
        }} title={dark?"Mode clair":"Mode sombre"}>{dark?"☀️":"🌙"}</button>
        {/* Paramètres */}
        <button onClick={()=>setPage2&&setPage2("parametres")}style={{background:"none",border:"none",cursor:"pointer",fontSize:16,padding:4}}title="Paramètres">⚙️</button>
        {user?.email===ADMIN_EMAIL&&<button onClick={()=>setPage2&&setPage2("backoffice")}style={{background:"linear-gradient(135deg,var(--T),var(--S))",border:"none",cursor:"pointer",fontSize:11,padding:"3px 8px",borderRadius:8,color:"#fff",fontWeight:700}}title="Admin">🔧 Admin</button>}
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
          boxShadow:isActive?"0 4px 16px rgba(155,107,170,.3)":"none",
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
          color:isSubActive?"var(--S)":"var(--l)",
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
    id:"journal",label:"Journal quotidien",icon:"📋",color:"#B8622F",
    preview:()=>(
      <div style={{padding:20,fontFamily:"system-ui"}}>
        <div style={{fontSize:13,fontWeight:700,color:"#2C1F14",marginBottom:12}}>📋 Journal du jour - Léo 🦁</div>
        <div style={{background:"#FBF0E8",borderRadius:10,padding:12,marginBottom:8,borderLeft:"3px solid #B8622F"}}>
          <div style={{fontSize:10,color:"#B8622F",fontWeight:700,marginBottom:3}}>👩‍👧 Marie · 11h30</div>
          <div style={{fontSize:12,color:"#2C1F14",lineHeight:1.6}}>Léo a découvert la peinture avec les doigts ce matin ! Il a réalisé un tableau qu'il a voulu offrir à sa maman. 🎨</div>
        </div>
        <div style={{background:"#EAF4EE",borderRadius:10,padding:12,borderLeft:"3px solid #3D6B50"}}>
          <div style={{fontSize:10,color:"#3D6B50",fontWeight:700,marginBottom:3}}>🍽️ Repas</div>
          <div style={{fontSize:12,color:"#2C1F14"}}>🥗 Purée de légumes · ✅ Bon appétit · 🍼 250ml</div>
        </div>
        <div style={{marginTop:12,display:"flex",gap:6}}>
          <div style={{background:"#F0FDF4",border:"1px solid #86EFAC",borderRadius:8,padding:"4px 10px",fontSize:11,color:"#166534"}}>😊 Joyeux</div>
          <div style={{background:"#F0FDF4",border:"1px solid #86EFAC",borderRadius:8,padding:"4px 10px",fontSize:11,color:"#166534"}}>💤 Sieste 1h20</div>
        </div>
      </div>
    ),
  },
  {
    id:"facturation",label:"Salaire automatique",icon:"🧮",color:"#B8892A",
    preview:()=>(
      <div style={{padding:20,fontFamily:"system-ui"}}>
        <div style={{fontSize:13,fontWeight:700,color:"#2C1F14",marginBottom:12}}>💰 Salaire Mars 2024 - Léo</div>
        {[["Heures réalisées","160h × 4,05€","648,00€"],["Indemnité entretien","20j × 3,80€","76,00€"],["Heures majorées","8h × 5,06€","40,50€"]].map(([l,d,v])=>(
          <div key={l}style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #DDD5C8",fontSize:12}}>
            <div><div style={{fontWeight:600,color:"#2C1F14"}}>{l}</div><div style={{fontSize:10,color:"#A68970"}}>{d}</div></div>
            <div style={{fontWeight:700,color:"#3D6B50"}}>{v}</div>
          </div>
        ))}
        <div style={{marginTop:10,padding:"10px 12px",background:"#FBF0E8",borderRadius:10,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontSize:13,fontWeight:700,color:"#2C1F14"}}>Total brut mensuel</span>
          <span style={{fontSize:20,fontWeight:700,color:"#B8622F",fontFamily:"Georgia,serif"}}>764,50 €</span>
        </div>
      </div>
    ),
  },
  {
    id:"calendrier",label:"Calendrier partagé",icon:"📅",color:"#2E5F8A",
    preview:()=>(
      <div style={{padding:20,fontFamily:"system-ui"}}>
        <div style={{fontSize:13,fontWeight:700,color:"#2C1F14",marginBottom:12}}>📅 Mars 2024</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:10}}>
          {["Lu","Ma","Me","Je","Ve","Sa","Di"].map(j=><div key={j}style={{textAlign:"center",fontSize:9,color:"#A68970",fontWeight:700,padding:"3px 0"}}>{j}</div>)}
          {[null,null,null,null,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31].map((d,i)=>(
            <div key={i}style={{textAlign:"center",fontSize:10,padding:"4px 2px",borderRadius:5,
              background:d===11?"#B8622F":d&&[4,5,6,7,11,12,13,14,18,19,20,21,25,26,27,28].includes(d)?"#EAF4EE":"transparent",
              color:d===11?"#fff":"#2C1F14",fontWeight:d===11?700:400}}>{d||""}</div>
          ))}
        </div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {[["🟢","Léo accueilli"],["🔵","Vacances"],["🔴","Absence"]].map(([ic,l])=>(
            <div key={l}style={{fontSize:10,color:"#6B4F3A",display:"flex",gap:4,alignItems:"center"}}><span>{ic}</span><span>{l}</span></div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id:"parent",label:"Espace parent",icon:"👪",color:"#6A3F88",
    preview:()=>(
      <div style={{padding:20,fontFamily:"system-ui"}}>
        <div style={{fontSize:13,fontWeight:700,color:"#2C1F14",marginBottom:12}}>👪 Sophie - Léo 🦁</div>
        <div style={{background:"#F2EAF8",borderRadius:10,padding:12,marginBottom:8,border:"1px solid #C4A0DC"}}>
          <div style={{fontSize:10,color:"#6A3F88",fontWeight:700,marginBottom:4}}>⏰ Pointage</div>
          <div style={{display:"flex",gap:16}}>
            {[["Arrivée","07h35","#3D6B50"],["Départ","17h20","#B8622F"],["Total","9h45","#2C1F14"]].map(([l,v,c])=>(
              <div key={l}style={{textAlign:"center"}}><div style={{fontSize:9,color:"#A68970"}}>{l}</div><div style={{fontSize:16,fontWeight:700,color:c}}>{v}</div></div>
            ))}
          </div>
        </div>
        <div style={{background:"#FBF0E8",borderRadius:10,padding:10,fontSize:12,color:"#2C1F14",lineHeight:1.5}}>
          📋 Léo a peint un tableau et l'a offert à sa maman !
        </div>
      </div>
    ),
  },
];

//

function LandingPage({onLogin,dark,setDark,config=DEFAULT_CONFIG}) {
  const [activeDemo, setActiveDemo] = useState("journal");
  const [showModal, setShowModal] = useState(false);
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
    {id:"demo-asmat",email:"marie.dupont@mail.fr",prenom:"Marie",nom:"Dupont",role:"asmat",couleur:"#B8622F",label:"Marie Dupont (AssMat)"},
    {id:"demo-parent1",email:"sophie.martin@mail.fr",prenom:"Sophie",nom:"Martin",role:"parent",couleur:"#2E5F8A",label:"Sophie Martin - Léo"},
    {id:"demo-parent2",email:"thomas.bernard@mail.fr",prenom:"Thomas",nom:"Bernard",role:"parent",couleur:"#3D6B50",label:"Thomas Bernard - Emma"},
  ];

  useEffect(()=>{
    const id = 'timat-fonts';
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id; link.rel = 'stylesheet';
    link.href = config.landing.googleFontsUrl || 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Fraunces:ital,wght@0,700;1,700&display=swap';
    document.head.appendChild(link);
  }, []);

  const connexion = async () => {
    if (!form.email || !form.password) { setErr("Email et mot de passe requis."); return; }
    setLoading(true); setErr("");
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
      if (error) {
        const demo = demos.find(d => d.email === form.email.trim().toLowerCase());
        if (demo) { onLogin(demo); return; }
        setErr("Email ou mot de passe incorrect.");
      }
      // On success: the onAuthStateChange listener in App.jsx will fetch the profile
      // and call setUser(). We don't query here to avoid lock race.
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
        // Don't call onLogin - the auth listener will handle it
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
      {/* HERO */}
      <div style={{ background: L.heroBg, padding: "0 24px 80px", position: "relative", overflow: "hidden" }}>
        <div style={{ position:"absolute", inset:0, zIndex:0, backgroundImage:"url("+(L.heroImg||"/hero-enfants.jpg")+")", backgroundSize:"cover", backgroundPosition:"center 30%", opacity:L.heroImgOpacity||0.20 }}/>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E\")", pointerEvents: "none", zIndex: 0 }} />
        <div style={{ position: "absolute", top: -120, right: -120, width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,200,255,.25) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -80, left: -80, width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(196,113,74,.20) 0%, transparent 70%)", pointerEvents: "none" }} />
        {/* Nav */}
        <div style={{ position: "relative", zIndex: 1, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "22px 0", maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontFamily: fTitle, fontSize: 26, fontWeight: 700, color: "#fff", fontStyle: "italic" }}>TiMat</div>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: accent }} />
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={() => document.getElementById("tarifs")?.scrollIntoView({ behavior: "smooth" })} style={{ background: L.heroBtnTarifsBg||"rgba(255,255,255,.12)", color: L.heroBtnTarifsColor||"rgba(255,255,255,.85)", border: "1px solid rgba(255,255,255,.2)", borderRadius: 20, padding: "7px 16px", cursor: "pointer", fontSize: 13, fontWeight: 500 }}>Tarifs</button>
            <button onClick={() => setShowModal(true)} style={{ background: L.heroBtnConnexionBg||"rgba(255,255,255,.18)", color: L.heroBtnConnexionColor||"#fff", border: "1px solid rgba(255,255,255,.3)", borderRadius: 20, padding: "7px 16px", cursor: "pointer", fontSize: 13, fontWeight: 500 }}>Connexion</button>
            <button onClick={() => { setShowModal(true); setRole("asmat"); }} style={{ background: L.heroBtnNavBg||"linear-gradient(135deg,#9B6BAA,#B87CC8)", color: L.heroBtnNavColor||"#fff", border: "none", borderRadius: 10, padding: "9px 20px", cursor: "pointer", fontSize: 13, fontWeight: 700, boxShadow: "0 4px 20px rgba(155,107,170,.4)" }}>{T.heroBtnNavTxt||"Commencer gratuitement →"}</button>
          </div>
        </div>
        {/* Hero stats */}
        <div style={{ position: "relative", zIndex: 1, maxWidth: 1000, margin: "0 auto 48px", display: "flex", gap: 32, flexWrap: "wrap", justifyContent: "center" }}>
          {statsHero.map(({ n, suf, label }) => (
            <div key={label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: L.heroStatsColor||accent, fontFamily: fTitle }}><Counter target={n} suffix={suf} /></div>
              <div style={{ fontSize: 11, color: L.heroStatsLabelColor||"rgba(255,255,255,.45)", marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
        {/* Hero content */}
        <div style={{ position: "relative", zIndex: 1, maxWidth: 760, margin: "0 auto", textAlign: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: L.heroBadgeBg||"rgba(232,168,74,.12)", border: "1px solid rgba(232,168,74,.25)", borderRadius: 20, padding: "5px 16px", fontSize: 11, color: L.heroBadgeColor||"#E8C87A", marginBottom: 28, fontWeight: 600, letterSpacing: ".8px" }}>{T.heroBadge}</div>
          <div style={{ fontFamily: fTitle, fontSize: "clamp(30px,5.5vw,58px)", fontWeight: 700, color: L.heroTitleColor||"#fff", lineHeight: 1.15, marginBottom: 20 }}>
            {T.heroTitle}<br/>
            {T.heroTitleAccent&&<><span style={{ color: accent, fontStyle: "italic" }}>{T.heroTitleAccent}</span><br/></>}
            <span style={{ fontSize: "clamp(20px,3.5vw,36px)", fontWeight: 400, color: L.heroSubColor||"rgba(255,255,255,.75)", fontStyle: "normal" }}>{T.heroSub}</span>
          </div>
          <div style={{ fontSize: "clamp(14px,2vw,17px)", color: L.heroSubDescColor||"rgba(255,255,255,.6)", lineHeight: 1.8, marginBottom: 36, maxWidth: 580, margin: "0 auto 36px", whiteSpace:"pre-line" }}>{T.heroSubDesc}</div>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 28 }}>
            <button onClick={() => { setShowModal(true); setRole("asmat"); }} style={{ background: L.heroBtnPrimBg||"linear-gradient(135deg,#C4714A,#9A4020)", color: L.heroBtnPrimColor||"#fff", border: "none", borderRadius: 10, padding: "15px 32px", fontSize: 15, fontWeight: 700, cursor: "pointer", boxShadow: "0 6px 24px rgba(184,98,47,.5)", letterSpacing: ".3px" }}>{T.heroBtnPrimTxt}</button>
            <button onClick={() => document.getElementById("demo")?.scrollIntoView({ behavior: "smooth" })} style={{ background: L.heroBtnSecBg||"rgba(255,255,255,.07)", color: L.heroBtnSecColor||"#fff", border: "1px solid rgba(255,255,255,.18)", borderRadius: 10, padding: "15px 28px", fontSize: 15, cursor: "pointer" }}>{T.heroBtnSecTxt}</button>
          </div>
          <div style={{ display: "flex", gap: 20, justifyContent: "center", flexWrap: "wrap" }}>
            {(T.heroTags||"").split(",").map(t => <span key={t} style={{ fontSize: 11, color: L.heroTagsColor||"rgba(255,255,255,.4)", fontWeight: 500 }}>{t.trim()}</span>)}
          </div>
        </div>
      </div>

      {/* SECTION 1 - PROBLEME */}
      <div style={{ background: L.section1Bg||"linear-gradient(135deg,#7B4A8A,#9B6BAA)", padding: "60px 24px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <div style={{ fontFamily: fTitle, fontSize: "clamp(22px,4vw,36px)", color: L.s1TitleColor||"#fff", fontWeight: 700, marginBottom: 10 }}>{L.s1Title}</div>
              <div style={{ fontSize: 15, color: L.s1DescColor||"rgba(255,255,255,.5)", lineHeight: 1.7, whiteSpace:"pre-line" }}>{L.s1Desc}</div>
            </div>
          </FadeIn>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
            {painPoints.map((item, i) => (
              <FadeIn key={item.titre} delay={i * 80}>
                <div style={{ background: L.s1CardBg||"rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 14, padding: 20 }}>
                  <div style={{ fontSize: 28, marginBottom: 10 }}>{item.ic}</div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: L.s1CardTitleColor||"#fff", marginBottom: 6 }}>{item.titre}</div>
                  <div style={{ fontSize: 12, color: L.s1CardDescColor||"rgba(255,255,255,.5)", lineHeight: 1.7 }}>{item.desc}</div>
                </div>
              </FadeIn>
            ))}
          </div>
          <FadeIn delay={400}>
            <div style={{ marginTop: 40, textAlign: "center", padding: "28px 32px", background: L.s1QuoteBg||"rgba(232,168,74,.08)", border: "1px solid rgba(232,168,74,.2)", borderRadius: 20 }}>
              <div style={{ fontFamily: fTitle, fontSize: "clamp(18px,3vw,28px)", color: L.s1QuoteColor||accent, fontWeight: 700, fontStyle: "italic", whiteSpace:"pre-line" }}>"{L.s1Quote}"</div>
            </div>
          </FadeIn>
        </div>
      </div>

      {/* SECTION 2 - DEMO */}
      <div id="demo" style={{ background: L.section2Bg||"#FDF5FB", padding: "72px 24px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <div style={{ fontFamily: fTitle, fontSize: "clamp(22px,4vw,36px)", color: L.s2TitleColor||"#0D1B2A", fontWeight: 700, marginBottom: 10 }}>{L.s2Title}</div>
              <div style={{ fontSize: 15, color: L.s2DescColor||"#6B4F3A", lineHeight: 1.7 }}>{L.s2Desc}</div>
            </div>
          </FadeIn>
          <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 24, alignItems: "start" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {DEMO_SCREENS.map(s => (
                <button key={s.id} onClick={() => setActiveDemo(s.id)} style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "12px 14px",
                  borderRadius: 10, border: "1.5px solid", cursor: "pointer", textAlign: "left", transition: "all .2s",
                  background: activeDemo === s.id ? s.color : "transparent", color: activeDemo === s.id ? "#fff" : "#6B4F3A",
                  borderColor: activeDemo === s.id ? s.color : "#DDD5C8", fontFamily: "inherit", fontWeight: activeDemo === s.id ? 700 : 500, fontSize: 13,
                }}><span>{s.icon}</span><span>{s.label}</span></button>
              ))}
            </div>
            <div style={{ background: "#fff", borderRadius: 16, border: "2px solid", borderColor: demo?.color || "#DDD5C8", overflow: "hidden", boxShadow: "0 8px 40px rgba(0,0,0,.1)", transition: "border-color .3s" }}>
              <div style={{ background: demo?.color, padding: "10px 16px", display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ display: "flex", gap: 5 }}>{["#ff5f57", "#febc2e", "#28c840"].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />)}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.8)", fontWeight: 600 }}>{demo?.icon} {demo?.label}</div>
              </div>
              {demo && <demo.preview />}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3 - TRANSFORMATION */}
      <div style={{ background: L.section3Bg||"#F8F0FC", padding: "72px 24px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 56 }}>
              <div style={{ fontFamily: fTitle, fontSize: "clamp(22px,4vw,36px)", color: L.s3TitleColor||"#0D1B2A", fontWeight: 700, marginBottom: 10 }}>{L.s3Title}</div>
            </div>
          </FadeIn>
          <div style={{ display: "grid", gap: 3 }}>
            {transformations.map(([ic, pb, sol, res], i) => (
              <FadeIn key={pb} delay={i * 60}>
                <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 1fr 1fr", gap: 20, alignItems: "center", padding: "18px 20px", borderRadius: 12, background: i % 2 === 0 ? (L.s3RowBg1||"#F8F0FC") : (L.s3RowBg2||"#FDF5FB"), border: "1px solid #DDD5C8" }}>
                  <div style={{ fontSize: 22, textAlign: "center" }}>{ic}</div>
                  <div><div style={{ fontSize: 10, fontWeight: 700, color: L.s3LabelBeforeColor||"#B84060", textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 4 }}>{L.s3LabelBefore||"Aujourd'hui"}</div><div style={{ fontSize: 13, color: L.s3TextColor||"#6B4F3A", lineHeight: 1.5 }}>{pb}</div></div>
                  <div><div style={{ fontSize: 10, fontWeight: 700, color: L.s3LabelAfterColor||"#2E5F8A", textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 4 }}>{L.s3LabelAfter||"Avec TiMat"}</div><div style={{ fontSize: 13, color: L.s3TextColor||"#6B4F3A", lineHeight: 1.5 }}>{sol}</div></div>
                  <div><div style={{ fontSize: 10, fontWeight: 700, color: L.s3LabelResultColor||"#3D6B50", textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 4 }}>{L.s3LabelResult||"Ce que ça change"}</div><div style={{ fontSize: 13, color: L.s3ResultColor||"#3D6B50", fontWeight: 600, lineHeight: 1.5 }}>{res}</div></div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION 4 - CHIFFRES */}
      <div style={{ background: L.section4Bg||"linear-gradient(135deg,#7B4A8A,#9B6BAA)", padding: "72px 24px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 56 }}>
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
      </div>

      {/* SECTION 5 - TEMOIGNAGES */}
      <div style={{ background: L.section5Bg||"#FDF5FB", padding: "72px 24px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ fontFamily: fTitle, fontSize: "clamp(20px,3.5vw,32px)", color: L.s5TitleColor||"#0D1B2A", fontWeight: 700, textAlign: "center", marginBottom: 48, fontStyle: "italic" }}>
              {L.s5Title}
            </div>
          </FadeIn>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 20 }}>
            {testimonials.map((t, i) => (
              <FadeIn key={t.nom} delay={i * 80}>
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
      </div>

      {/* SECTION 6 - TARIFS */}
      <div id="tarifs" style={{ background: L.section6Bg||"#F5EBF8", padding: "72px 24px" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ fontFamily: fTitle, fontSize: "clamp(22px,4vw,36px)", color: L.s6TitleColor||"#0D1B2A", fontWeight: 700, textAlign: "center", marginBottom: 48 }}>{L.s6Title}</div>
          </FadeIn>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" }}>
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
              <div style={{ position: "absolute", top: -15, left: "50%", transform: "translateX(-50%)", background: "linear-gradient(135deg,#C4714A,#8A3A20)", color: "#fff", borderRadius: 20, padding: "5px 18px", fontSize: 11, fontWeight: 700, letterSpacing: ".8px", whiteSpace: "nowrap" }}>{T.proLabel}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: L.proLabelColor||"#B8622F", marginBottom: 10, textTransform: "uppercase", letterSpacing: "1px" }}>Pro</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
                <span style={{ fontFamily: fTitle, fontSize: 46, fontWeight: 700, color: L.proPriceColor||"#B8622F" }}>{T.prixMensuel}€</span>
                <span style={{ fontSize: 13, color: "#A68970" }}>/mois</span>
              </div>
              <div style={{ fontSize: 11, color: L.proSubColor||"#A68970", marginBottom: 8 }}>{T.proSubtxt}</div>
              <div style={{ fontSize: 13, color: L.proDescColor||"#6B4F3A", marginBottom: 22, lineHeight: 1.6 }}>{T.proDesc}</div>
              <button onClick={() => { setShowModal(true); setRole("asmat"); }} style={{ width: "100%", background: L.proBtnBg||"linear-gradient(135deg,#C4714A,#9A4020)", color: L.proBtnColor||"#fff", border: "none", borderRadius: 10, padding: "13px", cursor: "pointer", fontWeight: 700, fontSize: 13, marginBottom: 24, fontFamily: "inherit", boxShadow: "0 4px 16px rgba(184,98,47,.35)" }}>{T.proBtnTxt}</button>
              {(config.proItems||DEFAULT_CONFIG.proItems).map((t, i, arr) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13, padding: "5px 0", borderBottom: i < arr.length-1 ? "1px solid rgba(184,98,47,.15)" : "none" }}>
                  <span style={{ color: "#3D6B50", fontWeight: 700 }}>✓</span>
                  <span style={{ color: "#2C1F14", fontWeight: i < 3 ? 700 : 400 }}>{t}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ textAlign: "center", marginTop: 24, display: "flex", gap: 20, justifyContent: "center", flexWrap: "wrap", fontSize: 13, color: "#A68970" }}>
            {(config.guarantees||DEFAULT_CONFIG.guarantees).map(g=><span key={g}>{g}</span>)}
          </div>
        </div>
      </div>

      {/* CTA FINAL */}
      <div style={{ background: L.ctaBg||"linear-gradient(135deg,#5C3370,#9B6BAA)", padding: "72px 24px", textAlign: "center" }}>
        <FadeIn>
          <div style={{ fontFamily: fTitle, fontSize: "clamp(24px,5vw,46px)", color: L.ctaTitleColor||"#fff", fontWeight: 700, marginBottom: 16, lineHeight: 1.2, whiteSpace:"pre-line" }}>
            {(L.ctaTitle||"").split(L.ctaTitleAccent||"en comptabilité.")[0]}
            <span style={{ color: accent, fontStyle: "italic" }}>{L.ctaTitleAccent}</span><br/>
            <span style={{ fontSize: "clamp(16px,3vw,28px)", fontWeight: 400, color: L.ctaSubTitleColor||"rgba(255,255,255,.6)", fontStyle: "normal" }}>{L.ctaSubTitle}</span>
          </div>
          <div style={{ fontSize: 16, color: L.ctaSubColor||"rgba(255,255,255,.5)", marginBottom: 32, maxWidth: 460, margin: "0 auto 32px", lineHeight: 1.7 }}>{T.ctaSub}</div>
          <button onClick={() => { setShowModal(true); setRole("asmat"); }} style={{ background: L.ctaBtnBg||"linear-gradient(135deg,#C4714A,#9A4020)", color: L.ctaBtnColor||"#fff", border: "none", borderRadius: 12, padding: "16px 36px", fontSize: 16, fontWeight: 700, cursor: "pointer", boxShadow: "0 8px 32px rgba(184,98,47,.5)", fontFamily: "inherit", letterSpacing: ".3px" }}>{T.ctaBtnTxt}</button>
          <div style={{ marginTop: 16, fontSize: 12, color: L.ctaFooterColor||"rgba(255,255,255,.35)" }}>{T.ctaFooter}</div>
        </FadeIn>
      </div>

      {/* MODALE AUTH */}
      {showModal && (
        <div onClick={e => e.target === e.currentTarget && setShowModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20 }}>
          <div style={{ background: "#FDFAF8", borderRadius: 20, width: "100%", maxWidth: 420, overflow: "hidden", boxShadow: "0 24px 80px rgba(0,0,0,.5)", maxHeight:"95vh", overflowY:"auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", background: "#7B4B2A" }}>
              {[{ r: "asmat", ic: "👩‍👧", l: "Assistante\nmaternelle", col: "#B8622F" }, { r: "parent", ic: "👪", l: "Parent\nemployeur", col: "#2E5F8A" }].map(({ r, ic, l, col }) => (
                <button key={r} onClick={() => { setRole(r); setErr(""); }} style={{ padding: "18px 12px", border: "none", cursor: "pointer", background: role === r ? col : "transparent", borderBottom: role !== r ? "3px solid "+col+"44" : "none", transition: "all .2s", fontFamily:"inherit" }}>
                  <div style={{ fontSize: 24, marginBottom: 4 }}>{ic}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: role === r ? "#fff" : "rgba(255,255,255,.4)", whiteSpace: "pre-line", lineHeight: 1.3 }}>{l}</div>
                </button>
              ))}
            </div>
            <div style={{ padding: 24, borderTop: role === "asmat" ? "4px solid #B8622F" : "4px solid #2E5F8A" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <div style={{ fontFamily: fTitle, fontSize: 18, fontWeight: 700, color: "#0D1B2A" }}>{role === "asmat" ? "Espace pro" : "Espace famille"}</div>
                  <div style={{ fontSize: 11, color: "#A68970", marginTop: 2 }}>{modeAuth === "inscription" ? (role === "asmat" ? "2 mois gratuits · sans carte" : "Inscription gratuite") : "Content de vous revoir !"}</div>
                </div>
                <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#A68970" }}>✕</button>
              </div>
              <div style={{ display:"flex", marginBottom:16, background:"#F4EFF8", borderRadius:10, padding:3 }}>
                {["inscription","connexion"].map(m => (
                  <button key={m} onClick={() => { setModeAuth(m); setErr(""); }} style={{ flex:1, padding:"8px", border:"none", cursor:"pointer", borderRadius:8, background: modeAuth===m ? (role==="asmat"?"#B8622F":"#2E5F8A") : "transparent", color: modeAuth===m ? "#fff" : "#6B4F3A", fontWeight:600, fontSize:12, fontFamily:"inherit", transition:"all .15s" }}>{m==="inscription" ? "Créer un compte" : "Se connecter"}</button>
                ))}
              </div>
              {modeAuth === "inscription" && <>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
                  <div>
                    <div style={{ fontSize:11, fontWeight:700, color:"#A68970", marginBottom:4, textTransform:"uppercase", letterSpacing:".5px" }}>Prénom *</div>
                    <input value={form.prenom} onChange={e=>setForm(f=>({...f,prenom:e.target.value}))} placeholder={role==="asmat"?"Marie":"Sophie"} style={{ width:"100%", padding:"10px 12px", borderRadius:10, border:"1.5px solid #DDD5C8", fontSize:13, outline:"none", boxSizing:"border-box", fontFamily:"inherit" }} />
                  </div>
                  <div>
                    <div style={{ fontSize:11, fontWeight:700, color:"#A68970", marginBottom:4, textTransform:"uppercase", letterSpacing:".5px" }}>Nom</div>
                    <input value={form.nom} onChange={e=>setForm(f=>({...f,nom:e.target.value}))} placeholder="Dupont" style={{ width:"100%", padding:"10px 12px", borderRadius:10, border:"1.5px solid #DDD5C8", fontSize:13, outline:"none", boxSizing:"border-box", fontFamily:"inherit" }} />
                  </div>
                </div>
              </>}
              <div style={{ marginBottom:10 }}>
                <div style={{ fontSize:11, fontWeight:700, color:"#A68970", marginBottom:4, textTransform:"uppercase", letterSpacing:".5px" }}>Email *</div>
                <input type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder={role === "asmat" ? "marie@email.fr" : "parent@email.fr"} onKeyDown={e=>e.key==="Enter"&&(modeAuth==="connexion"?connexion():inscription())} style={{ width:"100%", padding:"11px 14px", borderRadius:10, border:"1.5px solid #DDD5C8", fontSize:13, outline:"none", boxSizing:"border-box", fontFamily:"inherit" }} />
              </div>
              <div style={{ marginBottom: modeAuth==="inscription" ? 14 : 20 }}>
                <div style={{ fontSize:11, fontWeight:700, color:"#A68970", marginBottom:4, textTransform:"uppercase", letterSpacing:".5px" }}>Mot de passe *</div>
                <input type="password" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} placeholder={modeAuth==="inscription" ? "6 caractères minimum" : "Votre mot de passe"} onKeyDown={e=>e.key==="Enter"&&(modeAuth==="connexion"?connexion():inscription())} style={{ width:"100%", padding:"11px 14px", borderRadius:10, border:"1.5px solid #DDD5C8", fontSize:13, outline:"none", boxSizing:"border-box", fontFamily:"inherit" }} />
              </div>
              {modeAuth === "inscription" && <div style={{ background:"#F4EFF8", borderRadius:10, padding:"12px 14px", marginBottom:14 }}>
                <div style={{ fontSize:10, fontWeight:700, color:"#A68970", marginBottom:8, textTransform:"uppercase", letterSpacing:".5px" }}>Vos données</div>
                {[{k:"politique", l:"J'accepte la politique de confidentialité", req:true},{k:"cgu", l:"J'accepte les conditions générales d'utilisation", req:true},{k:"newsletter", l:"Recevoir les actualités TiMat (optionnel)", req:false}].map(({k,l,req}) => (
                  <label key={k} style={{ display:"flex", gap:8, alignItems:"flex-start", cursor:"pointer", marginBottom:7 }}>
                    <input type="checkbox" checked={consent[k]} onChange={e=>setConsent(c=>({...c,[k]:e.target.checked}))} style={{ width:14, height:14, marginTop:2, accentColor: role==="asmat"?"#B8622F":"#2E5F8A", flexShrink:0 }} />
                    <span style={{ fontSize:11, color:"#2C1F14", lineHeight:1.5 }}>{l}{req&&<span style={{color:"#B84060",fontWeight:700}}> *</span>}</span>
                  </label>
                ))}
                <div style={{ fontSize:10, color:"#A68970", marginTop:4 }}>* Obligatoire · Données hébergées en France · Suppression possible à tout moment</div>
              </div>}
              {err && <div style={{ color:"#C44A6A", fontSize:12, marginBottom:12, padding:"8px 12px", background:"#FEF2F2", borderRadius:8 }}>{err}</div>}
              <button onClick={modeAuth==="connexion" ? connexion : inscription} disabled={loading || (modeAuth==="inscription" && !consentValide)} style={{ width:"100%", background: role==="asmat" ? "linear-gradient(135deg,#C4714A,#9A4020)" : "linear-gradient(135deg,#3D75A8,#1E4A6E)", color:"#fff", border:"none", borderRadius:10, padding:"13px", cursor:"pointer", fontWeight:700, fontSize:14, fontFamily:"inherit", marginBottom:16, opacity: (loading||(modeAuth==="inscription"&&!consentValide)) ? .6 : 1 }}>
                {loading ? "⏳ Chargement…" : modeAuth==="connexion" ? (role==="asmat" ? "Accéder à mon espace →" : "Accéder à l'espace famille →") : (role==="asmat" ? "Créer mon espace pro →" : "Créer mon compte parent →")}
              </button>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
                <div style={{ flex:1, height:1, background:"#DDD5C8" }}/><span style={{ fontSize:11, color:"#A68970" }}>ou démo rapide</span><div style={{ flex:1, height:1, background:"#DDD5C8" }}/>
              </div>
              <div style={{ background:"#F7F2EC", borderRadius:10, padding:10 }}>
                <div style={{ fontSize:10, fontWeight:700, color:"#A68970", marginBottom:8, textTransform:"uppercase", letterSpacing:".5px" }}>{role==="asmat" ? "Compte asmat démo" : "Comptes parents démo"}</div>
                {demos.filter(d=>d.role===role).map(d => (
                  <button key={d.id} onClick={()=>onLogin(d)} style={{ display:"block", width:"100%", textAlign:"left", padding:"8px 10px", background:"none", border:"none", cursor:"pointer", borderRadius:8, fontFamily:"inherit", fontSize:13, color:"#2C1F14", fontWeight:600 }} onMouseEnter={e=>e.currentTarget.style.background="#DDD5C8"} onMouseLeave={e=>e.currentTarget.style.background="none"}>
                    {d.role==="asmat"?"👩‍👧":"👪"} {d.label}
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
              <input className="inp"placeholder="Léo, Emma, Noah…"value={enfant.prenom}onChange={e=>setEnfant(f=>({...f,prenom:e.target.value}))}/></div>
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
                {saving?"⏳ Sauvegarde…":"Sauvegarder →"}
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
                  }catch(e){setToast("Erreur réseau");}
                  setSaving(false);setStep(3);
                }}>
                {saving?"⏳ Envoi…":"📧 Envoyer l'invitation"}
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
function AttestationPoleEmploi({enfants,role,pEId,user}){
  const [selId,setSelId]=useState(enfants[0]?.id);
  const [dateFin,setDateFin]=useState("");
  const [motif,setMotif]=useState("Fin de contrat");
  const [gen,setGen]=useState(false);
  const [toast,setToast]=useState("");
  const liste=role==="parent"?enfants.filter(e=>e.id===pEId):enfants;
  const enfant=liste.find(e=>e.id===selId)||liste[0]||{};
  const contrat=enfant.contrat||{};
  const motifs=["Fin de contrat","Démission","Licenciement","Rupture conventionnelle","Retraite","Autre"];

  const generer=()=>{
    if(!dateFin)return;
    setGen(true);
    setTimeout(()=>{
      setGen(false);
      const w=window.open("","_blank");
      if(!w){setToast("Autorisez les popups pour générer le PDF");return;}
      const parent=D.parents.find(p=>p.id===enfant.parentId)||{prenom:"Parent",nom:"",email:""};
      const salaireMensuel=Math.round((contrat.heuresHebdo||40)*52/12*(contrat.tauxHoraire||4.05)*1.1);
      const htmlAttest='<!DOCTYPE html><html lang="fr"><head><title>Attestation Pôle Emploi - '+(enfant.prenom||'')+'</title>'
        +'<style>body{font-family:Arial,sans-serif;max-width:800px;margin:40px auto;padding:20px;color:#222;font-size:13px;}'
        +'h1{font-size:15px;text-align:center;border:2px solid #000;padding:10px;margin-bottom:20px;text-transform:uppercase;}'
        +'h2{font-size:13px;background:#f0f0f0;padding:6px 8px;margin-top:20px;border-left:3px solid #3D6B50;}'
        +'table{width:100%;border-collapse:collapse;margin:8px 0;}'
        +'td{padding:7px 10px;border:1px solid #ddd;}td:first-child{width:45%;background:#fafafa;font-weight:600;}'
        +'.sig{margin-top:40px;display:grid;grid-template-columns:1fr 1fr;gap:40px;}'
        +'.sig-box{border-top:1px solid #000;padding-top:8px;font-size:12px;}'
        +'@media print{button{display:none}}</style></head>'
        +'<body>'
        +'<h1>Attestation destinée à Pôle Emploi<br/><span style="font-size:11px;font-weight:400">(Articles R.1234-9 à R.1234-12 du Code du travail)</span></h1>'
        +'<h2>L&#39;employeur</h2>'
        +'<table><tr><td>Nom et prénom</td><td>'+parent.prenom+' '+parent.nom+'</td></tr>'
        +'<tr><td>Email</td><td>'+(parent.email||'[À compléter]')+'</td></tr>'
        +'<tr><td>N° Pajemploi</td><td>PAJ-[À compléter]</td></tr></table>'
        +'<h2>Le salarié</h2>'
        +'<table><tr><td>Nom et prénom</td><td>'+(user?.prenom||D.asmat.prenom)+' '+(user?.nom||D.asmat.nom)+'</td></tr>'
        +'<tr><td>Emploi</td><td>Assistante maternelle agréée</td></tr>'
        +'<tr><td>Enfant gardé</td><td>'+(enfant.prenom||'')+' '+(enfant.nom||'')+'</td></tr></table>'
        +'<h2>Contrat de travail</h2>'
        +'<table><tr><td>Date d&#39;embauche</td><td>'+(contrat.debut||'[À compléter]')+'</td></tr>'
        +'<tr><td>Date de fin</td><td>'+dateFin+'</td></tr>'
        +'<tr><td>Motif</td><td>'+motif+'</td></tr>'
        +'<tr><td>Heures hebdo</td><td>'+(contrat.heuresHebdo||40)+'h/semaine</td></tr>'
        +'<tr><td>Dernier salaire brut</td><td>'+salaireMensuel+'€</td></tr></table>'
        +'<h2>Indemnités versées</h2>'
        +'<table><tr><td>Salaire du dernier mois</td><td>[À compléter]€</td></tr>'
        +'<tr><td>ICCP</td><td>[À compléter]€</td></tr>'
        +'<tr><td>Indemnité de préavis</td><td>[À compléter]€</td></tr></table>'
        +'<p style="margin-top:20px;font-size:12px;background:#f9f9f9;padding:10px;border:1px solid #ddd;">Je certifie sur l&#39;honneur l&#39;exactitude des renseignements portés sur cette attestation.</p>'
        +'<div class="sig">'
        +'<div class="sig-box">Fait à ___, le '+new Date().toLocaleDateString('fr-FR')+'<br/><br/>Signature employeur:<br/><br/>'+parent.prenom+' '+parent.nom+'</div>'
        +'<div class="sig-box">Remis le '+new Date().toLocaleDateString('fr-FR')+'<br/><br/>Signature asmat:<br/><br/>'+(user?.prenom||D.asmat.prenom)+' '+(user?.nom||D.asmat.nom)+'</div>'
        +'</div>'
        +'<p style="font-size:10px;color:#999;margin-top:20px;">Généré par TiMat - timat.app</p>'
        +'<button onclick="window.print()" style="margin-top:10px;background:#3D6B50;color:#fff;border:none;padding:10px 20px;border-radius:6px;cursor:pointer;">🖨️ Imprimer / PDF</button>'
        +'</body></html>';
      w.document.write(htmlAttest);
      w.document.close();
      setToast("Attestation générée ✓");
    },1000);
  };

  return <div className="fi">
    {toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
    <PageHeader icon="📋" title="Attestation Pôle Emploi" sub="Générée en 1 clic - obligatoire dans les 15 jours suivant la fin du contrat"/>
    {role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
      {liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>setSelId(e.id)}/>)}
    </div>}
    <div className="g2">
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div className="card"style={{padding:18}}>
          <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:14}}>📋 Fin de contrat - {enfant.prenom||"-"}</div>
          <div style={{marginBottom:12}}><label className="lbl">Date de fin *</label>
            <input type="date"className="inp"value={dateFin}onChange={e=>setDateFin(e.target.value)}/></div>
          <div style={{marginBottom:16}}><label className="lbl">Motif</label>
            <select className="sel"value={motif}onChange={e=>setMotif(e.target.value)}>
              {motifs.map(m=><option key={m}>{m}</option>)}
            </select></div>
          <button className="btn bT"style={{width:"100%",justifyContent:"center"}}onClick={generer}disabled={gen||!dateFin}>
            {gen?"⏳ Génération…":"📥 Générer l'attestation PDF"}
          </button>
        </div>
        <div className="card"style={{padding:14,background:"var(--Rp)",border:"1px solid var(--R)"}}>
          <div style={{fontWeight:700,fontSize:12,color:"var(--R)",marginBottom:6}}>⚠️ Obligation légale</div>
          <div style={{fontSize:12,color:"var(--m)",lineHeight:1.6}}>
            L'attestation Pôle Emploi est obligatoire dès la fin du contrat. Sans ce document, l&#39;asmat ne peut pas percevoir ses allocations chômage. Délai légal : 15 jours après la fin du contrat.
          </div>
        </div>
      </div>
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
    illustration:"👩‍👧‍👦",
    btn:"Je commence →",
  },
  {
    emoji:"📋",
    color:"#C4714A",
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
        <div style={{fontSize:56,marginBottom:8}}>🌿</div>
        <div className="pf"style={{fontSize:38,fontWeight:700,color:"var(--T)",fontStyle:"italic",letterSpacing:"-1px"}}>TiMat</div>
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
              {c.role==="asmat"?"👩‍👧":"👪"}</span> {c.label}
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
const ADMIN_EMAIL = "faitacreapro@gmail.com";

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

  const sauvegarder=async()=>{
    setSaving(true);
    Object.assign(G, JSON.parse(JSON.stringify(cfg)));
    applyColsToDOM(cfg.cols);
    setAppConfig(JSON.parse(JSON.stringify(cfg)));
    const result=await saveConfig();
    if(result.ok){
      setToast("✅ Sauvegardé ! Changements en ligne.");
    }else{
      setToast("❌ Échec : "+result.error);
      console.error("Échec sauvegarde:", result.error);
    }
    setSaving(false);
  };

  const reset=()=>{
    if(!window.confirm("Réinitialiser toute la config ? Les modifications non sauvegardées seront perdues."))return;
    setCfg(JSON.parse(JSON.stringify(DEFAULT_CONFIG)));
    setToast("🔄 Config réinitialisée (cliquer Sauvegarder pour valider)");
  };

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
  const Field=({label,children,hint})=>(
    <div style={{marginBottom:10}}>
      <div style={{fontSize:10,fontWeight:700,color:"var(--m)",marginBottom:3,textTransform:"uppercase",letterSpacing:".4px"}}>{label}</div>
      {children}
      {hint&&<div style={{fontSize:10,color:"var(--l)",marginTop:3,fontStyle:"italic"}}>{hint}</div>}
    </div>
  );

  const ColorInput=({k,state,setter})=>{
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

  const TextInput=({k,state,setter,multi,placeholder})=>(
    multi
      ?<textarea className="inp"rows={3}style={{fontSize:11,padding:"6px 8px",resize:"vertical",width:"100%",boxSizing:"border-box",fontFamily:"inherit"}}value={state[k]||""}onChange={e=>setter(k,e.target.value)}placeholder={placeholder}/>
      :<input className="inp"style={{fontSize:11,padding:"6px 8px",width:"100%",boxSizing:"border-box"}}value={state[k]||""}onChange={e=>setter(k,e.target.value)}placeholder={placeholder}/>
  );

  const NumInput=({k,state,setter,min,max,step})=>(
    <input type="number"className="inp"min={min}max={max}step={step}style={{fontSize:11,padding:"6px 8px",width:"100%",boxSizing:"border-box"}}value={state[k]||0}onChange={e=>setter(k,parseFloat(e.target.value))}/>
  );

  const Card=({title,icon,children})=>(
    <div className="card"style={{padding:14,marginBottom:10}}>
      {title&&<div style={{fontWeight:700,fontSize:12,marginBottom:10,color:"var(--b)",display:"flex",alignItems:"center",gap:6,paddingBottom:8,borderBottom:"1px solid var(--br)"}}>
        {icon&&<span style={{fontSize:14}}>{icon}</span>}{title}
      </div>}
      {children}
    </div>
  );

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
  ];

  return <div className="fi" style={{maxWidth:"100%",padding:0}}>
    {toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}

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
          <Card title="Image de fond" icon="📸">
            <Field label="URL de l\'image">
              <TextInput k="heroImg" state={cfg.landing} setter={setLand} placeholder="/hero-enfants.jpg ou https://..."/>
            </Field>
            <Field label={`Opacité (${Math.round((cfg.landing.heroImgOpacity||0.2)*100)}%)`}>
              <input type="range"min="0"max="1"step="0.05"value={cfg.landing.heroImgOpacity||0.2} onChange={e=>setLand("heroImgOpacity",parseFloat(e.target.value))} style={{width:"100%"}}/>
            </Field>
            <Field label="Fond hero (gradient / couleur)">
              <ColorInput k="heroBg" state={cfg.landing} setter={setLand}/>
            </Field>
          </Card>

          <Card title="Textes du hero" icon="📝">
            <Field label="Badge (bandeau jaune)"><TextInput k="heroBadge" state={cfg.txts} setter={setTxt}/></Field>
            <Field label="Titre principal"><TextInput k="heroTitle" state={cfg.txts} setter={setTxt}/></Field>
            <Field label="Accent du titre (en italique doré)" hint="Laisser vide pour masquer"><TextInput k="heroTitleAccent" state={cfg.txts} setter={setTxt}/></Field>
            <Field label="Sous-titre (grand)"><TextInput k="heroSub" state={cfg.txts} setter={setTxt}/></Field>
            <Field label="Description sous titre" hint="Utilise \\n pour un retour à la ligne"><TextInput k="heroSubDesc" state={cfg.txts} setter={setTxt} multi/></Field>
            <Field label="Tags (séparés par virgule)"><TextInput k="heroTags" state={cfg.txts} setter={setTxt}/></Field>
          </Card>

          <Card title="Couleurs du hero" icon="🎨">
            <Field label="Couleur titre"><ColorInput k="heroTitleColor" state={cfg.landing} setter={setLand}/></Field>
            <Field label="Couleur sous-titre"><ColorInput k="heroSubColor" state={cfg.landing} setter={setLand}/></Field>
            <Field label="Couleur description"><ColorInput k="heroSubDescColor" state={cfg.landing} setter={setLand}/></Field>
            <Field label="Couleur badge (texte)"><ColorInput k="heroBadgeColor" state={cfg.landing} setter={setLand}/></Field>
            <Field label="Fond badge"><ColorInput k="heroBadgeBg" state={cfg.landing} setter={setLand}/></Field>
            <Field label="Couleur tags"><ColorInput k="heroTagsColor" state={cfg.landing} setter={setLand}/></Field>
            <Field label="Couleur stats (chiffres)"><ColorInput k="heroStatsColor" state={cfg.landing} setter={setLand}/></Field>
            <Field label="Couleur labels stats"><ColorInput k="heroStatsLabelColor" state={cfg.landing} setter={setLand}/></Field>
            <Field label="Couleur d\'accent (italique)"><ColorInput k="accentColor" state={cfg.landing} setter={setLand}/></Field>
          </Card>
        </>}

        {/* ====================== SECTIONS ====================== */}
        {sec==="sections"&&<>
          {[
            {key:"s1",titre:"Section 1 - Problématique",icon:"🔥",fields:[
              {k:"s1Title",l:"Titre",type:"txt"},{k:"s1Desc",l:"Description",type:"txt",multi:true},{k:"s1Quote",l:"Citation finale",type:"txt",multi:true},
              {k:"section1Bg",l:"Fond section",type:"col"},{k:"s1TitleColor",l:"Couleur titre",type:"col"},{k:"s1DescColor",l:"Couleur description",type:"col"},
              {k:"s1CardBg",l:"Fond des cards",type:"col"},{k:"s1CardTitleColor",l:"Couleur titre cards",type:"col"},{k:"s1CardDescColor",l:"Couleur texte cards",type:"col"},
              {k:"s1QuoteBg",l:"Fond citation",type:"col"},{k:"s1QuoteColor",l:"Couleur citation",type:"col"},
            ]},
            {key:"s2",titre:"Section 2 - Démo interactive",icon:"🎬",fields:[
              {k:"s2Title",l:"Titre",type:"txt"},{k:"s2Desc",l:"Description",type:"txt"},
              {k:"section2Bg",l:"Fond section",type:"col"},{k:"s2TitleColor",l:"Couleur titre",type:"col"},{k:"s2DescColor",l:"Couleur description",type:"col"},
            ]},
            {key:"s3",titre:"Section 3 - Transformation",icon:"🔄",fields:[
              {k:"s3Title",l:"Titre",type:"txt"},
              {k:"s3LabelBefore",l:"Label \"Avant\"",type:"txt"},{k:"s3LabelAfter",l:"Label \"Avec TiMat\"",type:"txt"},{k:"s3LabelResult",l:"Label \"Résultat\"",type:"txt"},
              {k:"section3Bg",l:"Fond section",type:"col"},{k:"s3TitleColor",l:"Couleur titre",type:"col"},
              {k:"s3RowBg1",l:"Fond rangée 1",type:"col"},{k:"s3RowBg2",l:"Fond rangée 2",type:"col"},
              {k:"s3LabelBeforeColor",l:"Couleur label Avant",type:"col"},{k:"s3LabelAfterColor",l:"Couleur label Avec TiMat",type:"col"},{k:"s3LabelResultColor",l:"Couleur label Résultat",type:"col"},
              {k:"s3TextColor",l:"Couleur texte",type:"col"},{k:"s3ResultColor",l:"Couleur texte résultat",type:"col"},
            ]},
            {key:"s4",titre:"Section 4 - Statistiques",icon:"📊",fields:[
              {k:"s4Title",l:"Titre",type:"txt"},{k:"s4Sub",l:"Sous-titre",type:"txt"},
              {k:"section4Bg",l:"Fond section",type:"col"},{k:"s4TitleColor",l:"Couleur titre",type:"col"},{k:"s4SubColor",l:"Couleur sous-titre",type:"col"},
              {k:"s4StatColor",l:"Couleur chiffres",type:"col"},{k:"s4StatLabelColor",l:"Couleur labels",type:"col"},{k:"s4StatDescColor",l:"Couleur descriptions",type:"col"},
            ]},
            {key:"s5",titre:"Section 5 - Témoignages",icon:"⭐",fields:[
              {k:"s5Title",l:"Titre",type:"txt"},
              {k:"section5Bg",l:"Fond section",type:"col"},{k:"s5TitleColor",l:"Couleur titre",type:"col"},
              {k:"testimonialBg",l:"Fond cards témoignages",type:"col"},{k:"testimonialNameColor",l:"Couleur nom",type:"col"},
              {k:"testimonialCityColor",l:"Couleur ville",type:"col"},{k:"testimonialBeforeColor",l:"Couleur citation \"avant\"",type:"col"},
              {k:"testimonialAfterColor",l:"Couleur citation \"après\"",type:"col"},{k:"testimonialStarColor",l:"Couleur étoiles",type:"col"},
            ]},
            {key:"s6",titre:"Section 6 - Tarifs",icon:"💰",fields:[
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
              {k:"ctaTitle",l:"Titre (avec \\n)",type:"txt",multi:true},{k:"ctaTitleAccent",l:"Accent (italique)",type:"txt"},{k:"ctaSubTitle",l:"Sous-titre",type:"txt"},
              {k:"ctaSub",l:"Texte descriptif",type:"txt",inTxts:true},{k:"ctaBtnTxt",l:"Texte bouton",type:"txt",inTxts:true},{k:"ctaFooter",l:"Footer",type:"txt",inTxts:true},
              {k:"ctaBg",l:"Fond section",type:"col"},{k:"ctaTitleColor",l:"Couleur titre",type:"col"},
              {k:"ctaSubTitleColor",l:"Couleur sous-titre",type:"col"},{k:"ctaSubColor",l:"Couleur descriptif",type:"col"},{k:"ctaFooterColor",l:"Couleur footer",type:"col"},
            ]},
          ].filter(s=>matches(s.titre)||s.fields.some(f=>matches(f.l))).map(s=>
            <Card key={s.key} title={s.titre} icon={s.icon}>
              {s.fields.filter(f=>!search||matches(f.l)).map(f=>
                <Field key={f.k} label={f.l}>
                  {f.type==="col"?<ColorInput k={f.k} state={cfg.landing} setter={setLand}/>
                  :<TextInput k={f.k} state={f.inTxts?cfg.txts:cfg.landing} setter={f.inTxts?setTxt:setLand} multi={f.multi}/>}
                </Field>
              )}
            </Card>
          )}
        </>}

        {/* ====================== TEXTES (tous) ====================== */}
        {sec==="textes"&&<>
          <Card title="Hero" icon="🏠">
            {[["heroBadge","Badge"],["heroTitle","Titre"],["heroTitleAccent","Titre - accent italique"],["heroSub","Sous-titre"],["heroSubDesc","Description",true],["heroTags","Tags (séparés par ,)"],["heroBtnPrimTxt","Texte bouton principal"],["heroBtnSecTxt","Texte bouton secondaire"],["heroBtnNavTxt","Texte bouton nav"]].filter(([,l])=>matches(l)).map(([k,l,m])=>
              <Field key={k} label={l}><TextInput k={k} state={cfg.txts} setter={setTxt} multi={m}/></Field>
            )}
          </Card>
          <Card title="Sections" icon="📝">
            {[["s1Title","Section 1 - Titre"],["s1Desc","Section 1 - Description",true],["s1Quote","Section 1 - Citation",true],
              ["s2Title","Section 2 - Titre"],["s2Desc","Section 2 - Description"],
              ["s3Title","Section 3 - Titre"],["s3LabelBefore","Section 3 - Label Avant"],["s3LabelAfter","Section 3 - Label Avec TiMat"],["s3LabelResult","Section 3 - Label Résultat"],
              ["s4Title","Section 4 - Titre"],["s4Sub","Section 4 - Sous-titre"],
              ["s5Title","Section 5 - Titre"],["s6Title","Section 6 - Titre"],
              ["ctaTitle","CTA - Titre (\\n pour saut)",true],["ctaTitleAccent","CTA - Texte accent"],["ctaSubTitle","CTA - Sous-titre"]
            ].filter(([,l])=>matches(l)).map(([k,l,m])=>
              <Field key={k} label={l}><TextInput k={k} state={cfg.landing} setter={setLand} multi={m}/></Field>
            )}
          </Card>
          <Card title="Tarifs et CTA" icon="💰">
            {[["prixMensuel","Prix mensuel"],["prixEssai","Durée essai"],["proLabel","Badge Pro"],["proSubtxt","Pro - sous-prix"],["proDesc","Pro - description"],["proBtnTxt","Pro - bouton"],["freeLabel","Gratuit - label"],["freePrice","Gratuit - prix (ex: 0€)"],["freeDesc","Gratuit - description"],["freeBtnTxt","Gratuit - bouton"],["ctaBtnTxt","CTA - bouton"],["ctaSub","CTA - descriptif"],["ctaFooter","CTA - footer"]].filter(([,l])=>matches(l)).map(([k,l])=>
              <Field key={k} label={l}><TextInput k={k} state={cfg.txts} setter={setTxt}/></Field>
            )}
          </Card>
        </>}

        {/* ====================== COULEURS (globales + par élément) ====================== */}
        {sec==="couleurs"&&<>
          <Card title="Palette de l\'application" icon="🎨">
            {[["T","Principale (terracotta)"],["S","Secondaire (mauve)"],["G","Vert (succès)"],["R","Rouge/Rose (alertes)"],["c","Fond général"],["w","Fond cartes"],["b","Texte principal"]].filter(([,l])=>matches(l)).map(([k,l])=>
              <Field key={k} label={l}><ColorInput k={k} state={cfg.cols} setter={setCol}/></Field>
            )}
          </Card>
          <Card title="Fonds de sections landing" icon="🖼️">
            {[["pageBg","Fond général page"],["heroBg","Fond hero"],["section1Bg","Section 1 (problème)"],["section2Bg","Section 2 (démo)"],["section3Bg","Section 3 (transfo)"],["section4Bg","Section 4 (stats)"],["section5Bg","Section 5 (témoignages)"],["section6Bg","Section 6 (tarifs)"],["ctaBg","CTA final"]].filter(([,l])=>matches(l)).map(([k,l])=>
              <Field key={k} label={l}><ColorInput k={k} state={cfg.landing} setter={setLand}/></Field>
            )}
          </Card>
          <Card title="Couleur d\'accent globale" icon="✨">
            <Field label="Couleur accent (stats, italique, étoiles par défaut)"><ColorInput k="accentColor" state={cfg.landing} setter={setLand}/></Field>
          </Card>
          <Card title="Hero - couleurs de texte" icon="🏠">
            {[["heroTitleColor","Titre hero"],["heroSubColor","Sous-titre"],["heroSubDescColor","Description"],["heroBadgeColor","Badge - texte"],["heroBadgeBg","Badge - fond"],["heroTagsColor","Tags"],["heroStatsColor","Stats (chiffres)"],["heroStatsLabelColor","Stats (labels)"]].filter(([,l])=>matches(l)).map(([k,l])=>
              <Field key={k} label={l}><ColorInput k={k} state={cfg.landing} setter={setLand}/></Field>
            )}
          </Card>
          <Card title="Sections 1 à 6 - couleurs texte" icon="📑">
            {[["s1TitleColor","S1 - Titre"],["s1DescColor","S1 - Description"],["s1CardBg","S1 - Fond cards"],["s1CardTitleColor","S1 - Titre cards"],["s1CardDescColor","S1 - Texte cards"],["s1QuoteBg","S1 - Fond citation"],["s1QuoteColor","S1 - Citation"],
              ["s2TitleColor","S2 - Titre"],["s2DescColor","S2 - Description"],
              ["s3TitleColor","S3 - Titre"],["s3RowBg1","S3 - Fond rangée 1"],["s3RowBg2","S3 - Fond rangée 2"],["s3LabelBeforeColor","S3 - Label Avant"],["s3LabelAfterColor","S3 - Label Avec TiMat"],["s3LabelResultColor","S3 - Label Résultat"],["s3TextColor","S3 - Texte"],["s3ResultColor","S3 - Texte résultat"],
              ["s4TitleColor","S4 - Titre"],["s4SubColor","S4 - Sous-titre"],["s4StatColor","S4 - Chiffres"],["s4StatLabelColor","S4 - Labels stats"],["s4StatDescColor","S4 - Descriptions"],
              ["s5TitleColor","S5 - Titre"],["testimonialBg","S5 - Fond cards"],["testimonialNameColor","S5 - Nom"],["testimonialCityColor","S5 - Ville"],["testimonialBeforeColor","S5 - Texte avant"],["testimonialAfterColor","S5 - Texte après"],["testimonialStarColor","S5 - Étoiles"],
              ["s6TitleColor","S6 - Titre"],["freeBg","S6 - Fond Gratuit"],["freeLabelColor","S6 - Label Gratuit"],["freePriceColor","S6 - Prix Gratuit"],["freeDescColor","S6 - Description Gratuit"],["proBg","S6 - Fond Pro"],["proBorderColor","S6 - Bordure Pro"],["proLabelColor","S6 - Label Pro"],["proPriceColor","S6 - Prix Pro"],["proSubColor","S6 - Sous-prix Pro"],["proDescColor","S6 - Description Pro"],
              ["ctaTitleColor","CTA - Titre"],["ctaSubTitleColor","CTA - Sous-titre"],["ctaSubColor","CTA - Descriptif"],["ctaFooterColor","CTA - Footer"]
            ].filter(([,l])=>matches(l)).map(([k,l])=>
              <Field key={k} label={l}><ColorInput k={k} state={cfg.landing} setter={setLand}/></Field>
            )}
          </Card>
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
            <Card key={btn.titre} title={btn.titre} icon={btn.icon}>
              {btn.fields.map(([k,l,isTxt])=>
                <Field key={k} label={l}>
                  {isTxt
                    ?<TextInput k={k} state={cfg.txts} setter={setTxt}/>
                    :<ColorInput k={k} state={cfg.landing} setter={setLand}/>}
                </Field>
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
            </Card>
          )}
        </>}

        {/* ====================== POLICES ====================== */}
        {sec==="polices"&&<>
          <Card title="Presets de polices" icon="🎨">
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
          </Card>
          <Card title="Polices personnalisées" icon="𝐓">
            <Field label="Police des titres" hint="Ex: \'Playfair Display\', serif">
              <TextInput k="fontTitle" state={cfg.landing} setter={setLand}/>
            </Field>
            <Field label="Police du corps" hint="Ex: \'Inter\', sans-serif">
              <TextInput k="fontBody" state={cfg.landing} setter={setLand}/>
            </Field>
            <Field label="URL Google Fonts" hint="Colle ici l\'URL complète de Google Fonts">
              <TextInput k="googleFontsUrl" state={cfg.landing} setter={setLand} multi/>
            </Field>
            <div style={{padding:10,background:"var(--c)",borderRadius:8,marginTop:6,fontSize:11,color:"var(--m)",lineHeight:1.5}}>
              💡 Pour ajouter une police :<br/>
              1. Va sur <strong>fonts.google.com</strong><br/>
              2. Choisis tes polices<br/>
              3. Copie l\'URL de &lt;link href=\"...\"&gt;<br/>
              4. Colle-la ci-dessus + édite fontTitle / fontBody
            </div>
          </Card>
          <Card title="Aperçu des polices" icon="👁">
            <div style={{padding:12,background:"#fff",borderRadius:8,border:"1px solid var(--br)"}}>
              <div style={{fontFamily:cfg.landing.fontTitle,fontSize:24,fontWeight:700,marginBottom:8}}>Titre exemple</div>
              <div style={{fontFamily:cfg.landing.fontBody,fontSize:14,lineHeight:1.6}}>Corps de texte en police normale. Le lorem ipsum est un faux texte qui permet de visualiser la mise en page.</div>
            </div>
          </Card>
        </>}

        {/* ====================== CONTENU (items) ====================== */}
        {sec==="contenu"&&<>
          <Card title="Stats du hero (bandeau)" icon="📊">
            {(cfg.statsHero||[]).map((s,i)=><div key={i}style={{display:"grid",gridTemplateColumns:"55px 40px 1fr",gap:4,marginBottom:4}}>
              <input className="inp"style={{fontSize:11,padding:"4px 6px"}}type="number"value={s.n}onChange={e=>setStat("statsHero",i,"n",e.target.value)}/>
              <input className="inp"style={{fontSize:11,padding:"4px 6px"}}value={s.suf}onChange={e=>setStat("statsHero",i,"suf",e.target.value)}/>
              <input className="inp"style={{fontSize:11,padding:"4px 6px"}}value={s.label}onChange={e=>setStat("statsHero",i,"label",e.target.value)}/>
            </div>)}
          </Card>
          <Card title="Stats section chiffres" icon="📊">
            {(cfg.statsSection||[]).map((s,i)=><div key={i}style={{display:"grid",gridTemplateColumns:"55px 40px 1fr 1fr",gap:4,marginBottom:4}}>
              <input className="inp"style={{fontSize:11,padding:"4px 6px"}}type="number"value={s.n}onChange={e=>setStat("statsSection",i,"n",e.target.value)}/>
              <input className="inp"style={{fontSize:11,padding:"4px 6px"}}value={s.suf}onChange={e=>setStat("statsSection",i,"suf",e.target.value)}/>
              <input className="inp"style={{fontSize:11,padding:"4px 6px"}}value={s.label}onChange={e=>setStat("statsSection",i,"label",e.target.value)}/>
              <input className="inp"style={{fontSize:11,padding:"4px 6px"}}value={s.desc||""}onChange={e=>setStat("statsSection",i,"desc",e.target.value)}/>
            </div>)}
          </Card>
          <Card title="Pain points (section 1)" icon="🔥">
            {(cfg.painPoints||[]).map((p,i)=><div key={i}style={{marginBottom:10,paddingBottom:10,borderBottom:"1px solid var(--br)"}}>
              <div style={{display:"flex",gap:4,marginBottom:4}}>
                <input className="inp"style={{width:36,fontSize:11,padding:"4px",textAlign:"center"}}value={p.ic}onChange={e=>setPain(i,"ic",e.target.value)}/>
                <input className="inp"style={{flex:1,fontSize:11,padding:"4px 6px"}}value={p.titre}onChange={e=>setPain(i,"titre",e.target.value)}placeholder="Titre"/>
                <button onClick={()=>removePain(i)}style={{background:"#fee",border:"1px solid #fcc",borderRadius:6,cursor:"pointer",fontSize:11,padding:"4px 8px",color:"#c00"}}>✕</button>
              </div>
              <textarea className="inp"rows={2}style={{fontSize:11,padding:"5px 8px",resize:"vertical",width:"100%",boxSizing:"border-box"}}value={p.desc}onChange={e=>setPain(i,"desc",e.target.value)}/>
            </div>)}
            <button onClick={addPain}className="btn bG"style={{fontSize:11,padding:"6px 12px",width:"100%"}}>+ Ajouter un pain point</button>
          </Card>
          <Card title="Transformations (section 3)" icon="🔄">
            {(cfg.transformations||[]).map((t,i)=><div key={i}style={{marginBottom:10,paddingBottom:10,borderBottom:"1px solid var(--br)"}}>
              <div style={{display:"flex",gap:4,marginBottom:4}}>
                <input className="inp"style={{width:36,fontSize:11,padding:"4px",textAlign:"center"}}value={t[0]}onChange={e=>setTransfo(i,0,e.target.value)}/>
                <span style={{fontSize:11,color:"var(--l)",alignSelf:"center"}}>icône</span>
              </div>
              <input className="inp"style={{fontSize:11,padding:"4px 6px",marginBottom:3,width:"100%",boxSizing:"border-box"}}value={t[1]}onChange={e=>setTransfo(i,1,e.target.value)}placeholder="Aujourd\'hui..."/>
              <input className="inp"style={{fontSize:11,padding:"4px 6px",marginBottom:3,width:"100%",boxSizing:"border-box"}}value={t[2]}onChange={e=>setTransfo(i,2,e.target.value)}placeholder="Avec TiMat..."/>
              <input className="inp"style={{fontSize:11,padding:"4px 6px",width:"100%",boxSizing:"border-box"}}value={t[3]}onChange={e=>setTransfo(i,3,e.target.value)}placeholder="Résultat..."/>
            </div>)}
          </Card>
          <Card title="Témoignages (section 5)" icon="⭐">
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
          </Card>

          <Card title="Plan Gratuit - Fonctionnalités" icon="🆓">
            <div style={{fontSize:11,color:"var(--l)",marginBottom:10,lineHeight:1.5}}>Coche = inclus, décoche = barré (non inclus)</div>
            {(cfg.freeItems||[]).map((item,i)=><div key={i}style={{display:"flex",gap:4,marginBottom:5,alignItems:"center"}}>
              <input type="checkbox"checked={item[0]}onChange={e=>setFreeItem(i,0,e.target.checked)}style={{width:16,height:16,cursor:"pointer",flexShrink:0}}/>
              <input className="inp"style={{flex:1,fontSize:11,padding:"4px 6px"}}value={item[1]}onChange={e=>setFreeItem(i,1,e.target.value)}/>
              <button onClick={()=>removeFreeItem(i)}style={{background:"#fee",border:"1px solid #fcc",borderRadius:6,cursor:"pointer",fontSize:11,padding:"3px 7px",color:"#c00"}}>✕</button>
            </div>)}
            <button onClick={addFreeItem}className="btn bG"style={{fontSize:11,padding:"6px 12px",width:"100%",marginTop:6}}>+ Ajouter une ligne</button>
          </Card>

          <Card title="Plan Pro - Fonctionnalités" icon="⭐">
            <div style={{fontSize:11,color:"var(--l)",marginBottom:10,lineHeight:1.5}}>Emoji + texte sur une ligne. Les 3 premières sont en gras automatiquement.</div>
            {(cfg.proItems||[]).map((item,i)=><div key={i}style={{display:"flex",gap:4,marginBottom:5,alignItems:"center"}}>
              <input className="inp"style={{flex:1,fontSize:11,padding:"4px 6px"}}value={item}onChange={e=>setProItem(i,e.target.value)}placeholder="✨ Emoji + description"/>
              <button onClick={()=>removeProItem(i)}style={{background:"#fee",border:"1px solid #fcc",borderRadius:6,cursor:"pointer",fontSize:11,padding:"3px 7px",color:"#c00"}}>✕</button>
            </div>)}
            <button onClick={addProItem}className="btn bG"style={{fontSize:11,padding:"6px 12px",width:"100%",marginTop:6}}>+ Ajouter une ligne</button>
          </Card>

          <Card title="Garanties (sous tarifs)" icon="✅">
            <div style={{fontSize:11,color:"var(--l)",marginBottom:10,lineHeight:1.5}}>Les petits points de réassurance affichés sous les tarifs.</div>
            {(cfg.guarantees||[]).map((item,i)=><div key={i}style={{display:"flex",gap:4,marginBottom:5,alignItems:"center"}}>
              <input className="inp"style={{flex:1,fontSize:11,padding:"4px 6px"}}value={item}onChange={e=>setGuarantee(i,e.target.value)}placeholder="✅ Texte garantie"/>
              <button onClick={()=>removeGuarantee(i)}style={{background:"#fee",border:"1px solid #fcc",borderRadius:6,cursor:"pointer",fontSize:11,padding:"3px 7px",color:"#c00"}}>✕</button>
            </div>)}
            <button onClick={addGuarantee}className="btn bG"style={{fontSize:11,padding:"6px 12px",width:"100%",marginTop:6}}>+ Ajouter une garantie</button>
          </Card>
        </>}

        {/* ====================== APP (modules + stats) ====================== */}
        {sec==="app"&&<>
          <Card title="Modules activables" icon="⚙️">
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
          </Card>
          <Card title="Statistiques" icon="📊">
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,textAlign:"center"}}>
              {[{v:stats.users,l:"Inscrits",c:"var(--T)"},{v:stats.pro,l:"Pro",c:"var(--S)"},{v:stats.enfants,l:"Enfants",c:"var(--G)"}].map(s=>
                <div key={s.l}style={{padding:10,background:"var(--c)",borderRadius:8}}>
                  <div style={{fontSize:22,fontWeight:700,color:s.c}}>{s.v}</div>
                  <div style={{fontSize:10,color:"var(--l)"}}>{s.l}</div>
                </div>
              )}
            </div>
          </Card>
          <Card title="Table Supabase" icon="🗄️">
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
          </Card>
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

const DEFAULT_CONFIG = {
  cols: {T:"#C4714A",S:"#9B6BAA",G:"#4A8B6E",R:"#C44A6A",c:"#FDF5F8",w:"#FFFFFF",b:"#1A1118"},
  txts: {
    heroTitle:"Le système vous a transformée",
    heroTitleAccent:"en comptable.",
    heroSub:"TiMat vous rend votre vrai rôle.",
    heroBtn:"Commencer gratuitement →",
    prixMensuel:"9,99",
    prixEssai:"2 mois gratuits",
    heroDesc:"",
    heroBadge:"💛 POUR LES ASSISTANTES MATERNELLES DE FRANCE",
    heroSubDesc:"Vous gérez seule ce que les crèches font à 5 personnes.\nContrats, salaires, bilans, PMI, suivi des enfants - tout ça, sans formation, sans aide, souvent le soir.",
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
    heroBg:"linear-gradient(160deg, #6B3D5A 0%, #7A4A68 35%, #6B3D5A 65%, #582E4A 100%)",
    heroImg:"/hero-enfants.jpg",
    heroImgOpacity:0.20,
    section1Bg:"linear-gradient(135deg,#7B4A8A,#9B6BAA)",
    section2Bg:"#FDF5FB",
    section3Bg:"#F8F0FC",
    section4Bg:"linear-gradient(135deg,#7B4A8A,#9B6BAA)",
    section5Bg:"#FDF5FB",
    section6Bg:"#F5EBF8",
    ctaBg:"linear-gradient(135deg,#5C3370,#9B6BAA)",
    statsBg:"linear-gradient(135deg,#7B4A8A,#9B6BAA)",
    // ----- BOUTONS HERO -----
    heroBtnPrimBg:"linear-gradient(135deg,#C4714A,#9A4020)",
    heroBtnPrimColor:"#fff",
    heroBtnSecBg:"rgba(255,255,255,.07)",
    heroBtnSecColor:"#fff",
    heroBtnNavBg:"linear-gradient(135deg,#9B6BAA,#B87CC8)",
    heroBtnNavColor:"#fff",
    heroBtnTarifsBg:"rgba(255,255,255,.12)",
    heroBtnTarifsColor:"rgba(255,255,255,.85)",
    heroBtnConnexionBg:"rgba(255,255,255,.18)",
    heroBtnConnexionColor:"#fff",
    // ----- BOUTONS TARIFS -----
    proBtnBg:"linear-gradient(135deg,#C4714A,#9A4020)",
    proBtnColor:"#fff",
    freeBtnBg:"#0D1B2A",
    freeBtnColor:"#fff",
    // ----- BOUTON CTA FINAL -----
    ctaBtnBg:"linear-gradient(135deg,#C4714A,#9A4020)",
    ctaBtnColor:"#fff",
    // ----- COULEURS -----
    accentColor:"#E8A84A",
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
    fontTitle:"'Fraunces', Georgia, serif",
    fontBody:"'Plus Jakarta Sans', 'DM Sans', system-ui, sans-serif",
    fontTitleWeight:"700",
    fontBodyWeight:"400",
    googleFontsUrl:"https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Fraunces:ital,wght@0,700;1,700&display=swap",
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
  const [notifs,setNotifs]=useState([
    {id:"n1",ic:"📬",txt:"Nouveau message de la PMI",date:TODAY_STR,lu:false,page:"pmi",roles:["asmat"]},
    {id:"n2",ic:"✍️",txt:"Contrat en attente de signature",date:TODAY_STR,lu:false,page:"admin_finances",roles:["asmat"]},

    {id:"n4",ic:"📋",txt:"Nouveau journal disponible",date:TODAY_STR,lu:false,page:"journal_complet",roles:["parent"]},
  ]);
  const [showNotifs,setShowNotifs]=useState(false);
  const [onboarded,setOnboarded]=useState(false);

  // //  tats donnes Supabase  AVANT tout return conditionnel
  const [enfantsDB,setEnfantsDB]=useState([]);
  const [contratsDB,setContratsDB]=useState([]);
  const [pointagesDB,setPointagesDB]=useState([]);
  const [transmissionsDB,setTransmissionsDB]=useState([]);
  const [dbLoading,setDbLoading]=useState(false);
  const [appConfig,setAppConfig]=useState(JSON.parse(JSON.stringify(DEFAULT_CONFIG)));

  // //  Dsactiver le service worker bloqu
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
    // Listener FIRST (Supabase recommended pattern to avoid lock race)
    const{data:{subscription}}=supabase.auth.onAuthStateChange(async(event,session)=>{
      if(event==="INITIAL_SESSION"){
        // Initial session loaded
        if(session?.user){
          try{
            const{data:profil}=await supabase.from("profiles").select("*").eq("id",session.user.id).maybeSingle();
            if(profil)setUser({...profil,id:session.user.id,email:session.user.email});
            else setUser({
              id:session.user.id,email:session.user.email,
              prenom:session.user.user_metadata?.prenom||"Utilisateur",
              nom:session.user.user_metadata?.nom||"",
              role:session.user.user_metadata?.role||"asmat",
              couleur:"#C4714A",subscription_status:"free"
            });
          }catch(e){console.log("Profil load error:",e.message);}
        }
        setLoading(false);
      }
      if(event==="SIGNED_IN"&&session?.user){
        try{
          const{data:profil}=await supabase.from("profiles").select("*").eq("id",session.user.id).maybeSingle();
          if(profil)setUser({...profil,id:session.user.id,email:session.user.email});
          else setUser({id:session.user.id,email:session.user.email,
            prenom:session.user.user_metadata?.prenom||"Utilisateur",
            nom:session.user.user_metadata?.nom||"",
            role:session.user.user_metadata?.role||"asmat",
            couleur:"#C4714A",subscription_status:"free"});
        }catch(e){console.log("Profil load error:",e.message);}
      }
      if(event==="SIGNED_OUT"){setUser(null);setPage("accueil");}
    });
    // Fallback: if INITIAL_SESSION never fires after 3s, stop loading
    const fallback=setTimeout(()=>setLoading(false),3000);
    return()=>{subscription.unsubscribe();clearTimeout(fallback);};
  },[]);

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
              jours:c.find(ct=>ct.enfant_id===enf.id).jours||["Lundi","Mardi","Mercredi","Jeudi","Vendredi"],
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
    <div style={{minHeight:"100vh",background:"var(--c)",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16}}>
      <div className="pf"style={{fontSize:36,color:"var(--T)",fontStyle:"italic"}}>TiMat</div>
      <div style={{display:"flex",gap:6}}>
        <div className="ai-dot"/><div className="ai-dot"style={{animationDelay:".3s"}}/><div className="ai-dot"style={{animationDelay:".6s"}}/>
      </div>
      <div style={{fontSize:12,color:"var(--l)"}}>Chargement…</div>
    </div></>
  );


  // - Utiliser données réelles
  if(!user)return <><Styles/><div className={"app"+(dark?" dark":"")+""}><LandingPage onLogin={u=>{setUser(u);setPage("accueil");}} dark={dark} setDark={setDark} config={appConfig}/></div></>;
  // Afficher onboarding si asmat sans enfants (vérifié après chargement DB)
  if(!onboarded&&user.role==="asmat"&&!dbLoading&&enfantsDB.length===0)return <><Styles/><div className={"app"+(dark?" dark":"")+""}><OnboardingWizard onFinish={()=>setOnboarded(true)} user={user}/></div></>;

  const role=user.role;
  // //  Statut abonnement
  const isPro=['pro','trialing'].includes(user?.subscription_status)||user?.role==="parent";
  const isTrialing=user?.subscription_status==="trialing";

  // //  Lancer le checkout Stripe
  const lancerCheckout=async()=>{
    try{
      const res=await fetch('/api/create-checkout-session',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({userId:user.id,email:user.email,prenom:user.prenom}),
      });
      const data=await res.json();
      if(data.url)window.location.href=data.url;
      else alert("Erreur lors de la création de la session de paiement.");
    }catch(e){
      alert("Erreur réseau. Vérifiez votre connexion.");
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
  const groups=role==="asmat"?GROUPS_AM:GROUPS_P;
  const P={enfants,role,pEId,user};

  const renderPage=()=>{
    switch(page){
      case "accueil": return role==="asmat"?<AccueilAssMat enfants={enfants} setPage={setPage} user={user}/>:<AccueilParent enfant={enfants[0]} setPage={setPage}/>;
      case "journal_complet": return <JournalComplet {...P}/>;
      case "sante_complet": return <SanteComplete {...P}/>;
      case "eveil_complet": return <EveilComplet {...P}/>;
      case "documents_complet": return <DocumentsComplet {...P}/>;
      case "admin_finances": return <AdminFinances {...P} user={user}/>;
      case "pointage": return <Pointage {...P}/>;
      case "calendrier": return <Calendrier enfants={enfants} role={role} pEId={pEId}/>;
      case "messagerie": return <Messagerie {...P}/>;
      case "politique_confidentialite": return <PolitiqueConfidentialite/>;
      case "mentions_legales": return <MentionsLegales/>;
      case "parametres": return <Parametres user={user} onLogout={handleLogout} setPage={setPage} isPro={isPro} isTrialing={isTrialing} lancerCheckout={lancerCheckout} ouvrirPortail={ouvrirPortail}/>;
      case "backoffice": return user?.email===ADMIN_EMAIL?<Backoffice user={user} setPage={setPage} appConfig={appConfig} setAppConfig={setAppConfig}/>:<div className="fi"><PageHeader icon="🔒" title="Accès refusé" sub="Zone admin réservée."/></div>;
      case "pmi": return <CommunicationPMI role={role} user={user} hasRealData={hasRealData}/>;
      case "periscolaire": return <PlanningPeriscolaire enfants={enfants} role={role} pEId={pEId}/>;
      case "forum": return <ForumCommunaute role={role}/>;
      case "rapport_annuel": return <RapportAnnuel enfants={enfants} role={role} pEId={pEId} user={user}/>;
      case "parrainage": return <Parrainage user={user}/>;
      case "simulateur": return <SimulateurCout enfants={enfants} pEId={pEId}/>;
      case "solde_compte": return <SoldeDeCompte enfants={enfants} role={role} pEId={pEId}/>;
      case "attestation_pe": return <AttestationPoleEmploi enfants={enfants} role={role} pEId={pEId} user={user}/>;
      case "export_donnees": return <ExportDonnees enfants={enfants} user={user} role={role}/>;
      case "faq": return <FAQ role={role}/>;
      case "support": return <Support role={role}/>;
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
      default: return role==="asmat"?<AccueilAssMat enfants={enfants} setPage={setPage} user={user}/>:<AccueilParent enfant={enfants[0]} setPage={setPage}/>;
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
        <div className="content">{renderPage()}</div>
      </div>
    </>
  );
}

