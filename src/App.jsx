import { useState, useRef, useEffect } from "react";

// ─── DATES (déclarées en premier pour éviter TDZ) ─────────────────────────────
var _D=new Date();
var TODAY_STR=_D.getFullYear()+"-"+String(_D.getMonth()+1).padStart(2,"0")+"-"+String(_D.getDate()).padStart(2,"0");
var TODAY_H=String(_D.getHours()).padStart(2,"0")+"h"+String(_D.getMinutes()).padStart(2,"0");
var TODAY_MONTH=String(_D.getMonth()+1).padStart(2,"0");
var TODAY_YEAR=String(_D.getFullYear());


const Styles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,300;1,9..40,400&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&family=DM+Mono:wght@400;500&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    html,body{width:100%;overflow-x:hidden;font-family:'DM Sans',sans-serif}
    :root{
      --c:#F7F2EC;--w:#FDFAF6;--b:#2C1F14;--m:#6B4F3A;--l:#A68970;--br:#DDD5C8;
      --T:#B8622F;--Tp:#FBF0E8;--Tl:#E8B898;
      --S:#3D6B50;--Sp:#EAF4EE;--Sl:#96C8A8;
      --G:#B8892A;--Gp:#FBF5E0;
      --B:#2E5F8A;--Bp:#E6F0F8;
      --R:#B84060;--Rp:#FAEEF2;
      --P:#6A3F88;--Pp:#F2EAF8;
      --sh:0 1px 3px rgba(44,31,20,.06),0 4px 16px rgba(44,31,20,.08);
      --sh2:0 2px 8px rgba(44,31,20,.08),0 12px 40px rgba(44,31,20,.14);
      --sh3:0 0 0 3px rgba(184,98,47,.15);
      --r:16px;--r2:12px;--r3:10px
    }
    /* ── MODE SOMBRE ─────────────────────────────────────────── */
    .dark{
      --c:#1A1410;--w:#221C18;--b:#F0E8E0;--m:#B89880;--l:#7A6050;--br:#3A2E28;
      --Tp:#2C1E18;--Sp:#182418;--Gp:#241E10;--Bp:#141C2C;--Rp:#2C1018;--Pp:#1C1428;
      --sh:0 1px 3px rgba(0,0,0,.3),0 4px 16px rgba(0,0,0,.4);
      --sh2:0 2px 8px rgba(0,0,0,.4),0 12px 40px rgba(0,0,0,.5);
    }
    .dark .topbar,.dark .nav-main,.dark .navtabs{background:rgba(34,28,24,.95)!important}
    .dark .app::before{opacity:.3}

    /* Grain overlay */
    .app{min-height:100vh;background:var(--c);display:flex;flex-direction:column;width:100%;position:relative}
    .app::before{content:'';position:fixed;inset:0;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.035'/%3E%3C/svg%3E");pointer-events:none;z-index:0;opacity:.6}

    /* Cards */
    .card{background:var(--w);border-radius:var(--r);border:1px solid var(--br);box-shadow:var(--sh);position:relative;z-index:1}
    .card-lift{transition:transform .22s cubic-bezier(.34,1.56,.64,1),box-shadow .22s ease}
    .card-lift:hover{transform:translateY(-3px);box-shadow:var(--sh2)}

    /* Typography */
    .pf{font-family:'Cormorant Garamond',serif}
    .mono{font-family:'DM Mono',monospace}

    /* Buttons */
    .btn{border:none;border-radius:var(--r3);padding:10px 18px;font-family:'DM Sans',sans-serif;font-weight:600;font-size:13px;cursor:pointer;transition:all .2s cubic-bezier(.34,1.56,.64,1);white-space:nowrap;display:inline-flex;align-items:center;gap:7px;letter-spacing:.01em}
    .bT{background:linear-gradient(135deg,#C4714A,#A85535);color:#fff;box-shadow:0 2px 8px rgba(184,98,47,.3)}
    .bT:hover{transform:translateY(-2px);box-shadow:0 6px 18px rgba(184,98,47,.4)}
    .bT:active{transform:translateY(0)}
    .bS{background:linear-gradient(135deg,#4E7A5C,#3A6047);color:#fff;box-shadow:0 2px 8px rgba(61,107,80,.25)}
    .bS:hover{transform:translateY(-2px);box-shadow:0 6px 18px rgba(61,107,80,.35)}
    .bG{background:var(--w);color:var(--b);border:1.5px solid var(--br);box-shadow:var(--sh)}
    .bG:hover{background:var(--c);border-color:var(--l);transform:translateY(-1px)}
    .bP{background:linear-gradient(135deg,#7A4E9A,#5E3A78);color:#fff;box-shadow:0 2px 8px rgba(106,63,136,.3)}
    .bP:hover{transform:translateY(-2px);box-shadow:0 6px 18px rgba(106,63,136,.4)}
    .bR{background:linear-gradient(135deg,#C44E72,#A83A5A);color:#fff}
    .bR:hover{transform:translateY(-2px)}

    /* Inputs */
    .inp{width:100%;border:1.5px solid var(--br);border-radius:var(--r3);padding:10px 14px;font-family:'DM Sans',sans-serif;font-size:13px;color:var(--b);background:var(--w);outline:none;transition:all .18s}
    .inp:focus{border-color:var(--T);box-shadow:var(--sh3)}
    .ta{width:100%;border:1.5px solid var(--br);border-radius:var(--r3);padding:10px 14px;font-family:'DM Sans',sans-serif;font-size:13px;color:var(--b);background:var(--w);outline:none;resize:vertical;min-height:75px;transition:all .18s;line-height:1.6}
    .ta:focus{border-color:var(--T);box-shadow:var(--sh3)}
    .sel{width:100%;border:1.5px solid var(--br);border-radius:var(--r3);padding:10px 14px;font-family:'DM Sans',sans-serif;font-size:13px;color:var(--b);background:var(--w);outline:none;cursor:pointer;transition:border-color .18s}
    .sel:focus{border-color:var(--T)}
    .lbl{font-size:10.5px;font-weight:600;color:var(--l);text-transform:uppercase;letter-spacing:.8px;margin-bottom:6px;display:block}
    .badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;letter-spacing:.01em}

    /* Topbar */
    .topbar{position:sticky;top:0;z-index:100;background:rgba(253,250,246,.92);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border-bottom:1px solid rgba(221,213,200,.6);padding:0 20px;display:flex;align-items:center;justify-content:space-between;height:56px;flex-shrink:0}
    .logo{font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:600;color:var(--T);font-style:italic;letter-spacing:.5px}
    .logo-dot{display:inline-block;width:5px;height:5px;border-radius:50%;background:var(--T);margin-left:2px;vertical-align:middle;margin-bottom:3px}

    /* Nav */
    .navtabs{background:rgba(247,242,236,.85);backdrop-filter:blur(12px);border-bottom:1px solid rgba(221,213,200,.5);overflow-x:auto;display:flex;align-items:center;gap:2px;padding:0 12px;height:46px;flex-shrink:0;scrollbar-width:none}
    .navtabs::-webkit-scrollbar{display:none}
    .ntab{display:flex;align-items:center;gap:5px;padding:6px 13px;border-radius:var(--r3);border:none;background:transparent;font-family:'DM Sans',sans-serif;font-weight:500;font-size:12.5px;color:var(--m);cursor:pointer;white-space:nowrap;transition:all .18s;flex-shrink:0;letter-spacing:.01em}
    .ntab:hover{background:rgba(184,98,47,.08);color:var(--T)}
    .ntab.act{background:linear-gradient(135deg,#C4714A,#A85535);color:#fff;box-shadow:0 2px 8px rgba(184,98,47,.3);font-weight:600}

    /* Main */
    .content{flex:1;padding:20px 20px;overflow-x:hidden;width:100%;position:relative;z-index:1}

    /* Grids */
    .g2{display:grid;grid-template-columns:repeat(auto-fit,minmax(290px,1fr));gap:14px}
    .g3{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px}
    .g4{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px}

    /* Animations */
    @keyframes fi{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
    .fi{animation:fi .3s cubic-bezier(.4,0,.2,1) forwards}
    @keyframes fi2{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
    .fi2{animation:fi2 .3s cubic-bezier(.4,0,.2,1) .1s both}
    .fi3{animation:fi2 .3s cubic-bezier(.4,0,.2,1) .2s both}
    @keyframes pop{0%{transform:scale(.9);opacity:0}100%{transform:scale(1);opacity:1}}
    .pop{animation:pop .22s cubic-bezier(.34,1.56,.64,1) forwards}
    @keyframes glow{0%,100%{box-shadow:0 0 0 3px rgba(106,63,136,.15),var(--sh)}50%{box-shadow:0 0 0 4px rgba(106,63,136,.28),var(--sh2)}}

    /* Chat */
    .msgs{display:flex;flex-direction:column;gap:10px;max-height:320px;overflow-y:auto;padding:4px 2px}
    .msgs::-webkit-scrollbar{width:3px}
    .msgs::-webkit-scrollbar-thumb{background:var(--br);border-radius:3px}
    .msg{max-width:78%;padding:10px 14px;border-radius:14px;font-size:13px;line-height:1.55}
    .msg-me{align-self:flex-end;background:linear-gradient(135deg,#C4714A,#A85535);color:#fff;border-bottom-right-radius:4px}
    .msg-ot{align-self:flex-start;background:var(--w);border:1px solid var(--br);color:var(--b);border-bottom-left-radius:4px;box-shadow:var(--sh)}

    /* Calendar */
    .cgrid{display:grid;grid-template-columns:repeat(7,1fr);gap:4px}
    .cday{min-height:36px;border-radius:var(--r3);display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:12px;font-weight:500;cursor:pointer;position:relative;transition:all .15s;color:var(--b)}
    .cday:hover{background:var(--Tp);color:var(--T)}
    .cday.tod{background:linear-gradient(135deg,#C4714A,#A85535);color:#fff;font-weight:700;box-shadow:0 2px 8px rgba(184,98,47,.35)}
    .cday.abs{background:var(--Rp);color:var(--R)}
    .cday.cng{background:var(--Gp);color:var(--G)}
    .cday.hol{background:var(--Bp);color:var(--B)}
    .cday .dot{width:4px;height:4px;border-radius:50%;background:var(--S);position:absolute;bottom:3px}

    /* Milestones */
    .ms{display:flex;align-items:center;gap:12px;padding:9px 12px;border-radius:var(--r3);cursor:pointer;transition:all .15s}
    .ms:hover{background:var(--Tp)}
    .msc{width:24px;height:24px;border-radius:50%;border:2px solid var(--br);display:flex;align-items:center;justify-content:center;font-size:11px;flex-shrink:0;transition:all .22s cubic-bezier(.34,1.56,.64,1)}
    .msc.ok{background:linear-gradient(135deg,#4E7A5C,#3A6047);border-color:transparent;color:#fff;box-shadow:0 2px 6px rgba(61,107,80,.3)}

    /* AI */
    @keyframes ai-pulse{0%,100%{opacity:.5;transform:scale(1)}50%{opacity:1;transform:scale(1.15)}}
    .ai-dot{width:9px;height:9px;border-radius:50%;background:var(--P);animation:ai-pulse 1.4s ease infinite}
    .ai-card{border-color:rgba(106,63,136,.35) !important;animation:glow 2.8s ease infinite}

    /* Mood */
    .moo{padding:8px 11px;border-radius:var(--r3);border:1.5px solid var(--br);background:var(--w);cursor:pointer;font-size:18px;transition:all .18s cubic-bezier(.34,1.56,.64,1)}
    .moo:hover,.moo.on{border-color:var(--T);background:var(--Tp);transform:scale(1.12);box-shadow:0 2px 8px rgba(184,98,47,.2)}

    /* Child pill */
    .cp{cursor:pointer;border:2px solid transparent;transition:all .2s cubic-bezier(.34,1.56,.64,1)}
    .cp:hover{border-color:var(--Tl);transform:translateY(-2px);box-shadow:var(--sh2)}
    .cp.on{border-color:var(--T);background:var(--Tp);box-shadow:0 0 0 4px rgba(184,98,47,.1)}

    /* Avatar */
    .av{border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-family:'Cormorant Garamond',serif;flex-shrink:0}

    /* Signature */
    canvas.sig-c{border:2px dashed rgba(221,213,200,.8);border-radius:var(--r2);cursor:crosshair;background:var(--w);touch-action:none}

    /* Bar chart */
    .bar{background:rgba(221,213,200,.4);border-radius:6px;overflow:hidden;height:7px}
    .bar-fill{height:100%;border-radius:6px;transition:width .8s cubic-bezier(.4,0,.2,1)}

    /* Toast */
    @keyframes tin{from{transform:translateY(80px) scale(.9);opacity:0}to{transform:translateY(0) scale(1);opacity:1}}
    .toast{position:fixed;bottom:24px;right:20px;background:linear-gradient(135deg,#2C1F14,#4A3322);color:#fff;padding:12px 18px;border-radius:14px;font-size:13px;font-weight:600;z-index:999;animation:tin .35s cubic-bezier(.34,1.56,.64,1) forwards;display:flex;align-items:center;gap:10px;box-shadow:0 8px 32px rgba(44,31,20,.3);letter-spacing:.01em}

    /* PDF preview */
    .pdf-preview{background:#fff;border:1px solid var(--br);border-radius:var(--r2);padding:28px;font-size:12px;line-height:1.8;color:#333;max-height:420px;overflow-y:auto}
    .pdf-preview h2{font-family:'Cormorant Garamond',serif;color:var(--T);font-size:18px;margin-bottom:14px}
    .pdf-preview table{width:100%;border-collapse:collapse;margin:12px 0}
    .pdf-preview td,.pdf-preview th{padding:6px 10px;border:1px solid #e8e0d8;font-size:11.5px}
    .pdf-preview th{background:#f7f2ec;font-weight:600}

    /* Mood sparkline */
    .mood-bar{display:flex;gap:3px;align-items:flex-end;height:36px}
    .mood-b{border-radius:3px 3px 0 0;transition:height .5s cubic-bezier(.4,0,.2,1)}

    /* Divider */
    .div{height:1px;background:linear-gradient(90deg,transparent,var(--br),transparent);margin:4px 0}

    /* Section header */
    .sec-h{display:flex;align-items:center;gap:8px;margin-bottom:14px}
    .sec-h-line{flex:1;height:1px;background:linear-gradient(90deg,var(--br),transparent)}

    /* ── MOBILE OPTIMISÉ ───────────────────────────────────────────────── */
    @media(max-width:640px){
      .content{padding:12px 12px}
      .g2{grid-template-columns:1fr;gap:10px}
      .g3{grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px}
      .g4{grid-template-columns:repeat(2,1fr);gap:8px}
      .card{border-radius:12px}
      .topbar{height:50px;padding:0 12px}
      .logo{font-size:19px}
      .btn{padding:8px 14px;font-size:12px}
      .pf{letter-spacing:-.2px}
      /* Nav mobile : boutons plus petits */
      .nav-main button{padding:7px 12px !important;font-size:12px !important}
      .nav-sub button{padding:5px 10px !important;font-size:11.5px !important}
      /* Toast en bas full width */
      .toast{left:12px;right:12px;bottom:16px;justify-content:center}
      /* Formulaires pleine largeur */
      .inp,.ta,.sel{font-size:16px !important} /* Évite le zoom iOS */
      /* Photos grille plus serrée */
      .photo-grid{grid-template-columns:repeat(3,1fr) !important}
    }
    @media(max-width:380px){
      .g4{grid-template-columns:repeat(2,1fr)}
      .nav-main button span:last-child{display:none} /* Icônes seules sur très petit */
    }
    /* Touch feedback */
    @media(hover:none){
      .card-lift:active{transform:scale(.98);box-shadow:var(--sh)}
      .btn:active{transform:scale(.96) !important}
      .ntab:active{background:rgba(184,98,47,.12)}
    }
  `}</style>
);


// ─── DEMO DATA ────────────────────────────────────────────────────────────────
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

// ─── UTILS ────────────────────────────────────────────────────────────────────
const age=(d)=>{const n=new Date(d),t=new Date(),m=(t.getFullYear()-n.getFullYear())*12+(t.getMonth()-n.getMonth());return m>=24?`${Math.floor(m/12)} ans`:`${m} mois`};
const fmt=(s)=>s?new Date(s).toLocaleDateString("fr-FR"):"—";
const ini=(p,n)=>`${p[0]}${n[0]}`.toUpperCase();
const todayStr=()=>new Date().toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
const moodVal={"😄":5,"😊":4,"😐":3,"😴":2,"😢":1,"😠":1,"🥰":5,"😬":2};

// ─── SHARED ───────────────────────────────────────────────────────────────────
function Av({t,c,s=36}){return <div className="av"style={{width:s,height:s,background:c+"22",color:c,fontSize:s*.34,minWidth:s}}>{t}</div>}
function CPill({e,sel,onClick}){return <div className={`card cp ${sel?"on":""}`}onClick={onClick}style={{padding:"9px 13px",display:"flex",alignItems:"center",gap:9}}>
  <span style={{fontSize:20}}>{e.emoji}</span><div><div style={{fontWeight:700,fontSize:13,color:"var(--b)"}}>{e.prenom}</div><div style={{fontSize:11,color:"var(--l)"}}>{age(e.naissance)}</div></div></div>}

function Toast({msg,onClose}){useEffect(()=>{const t=setTimeout(onClose,3000);return()=>clearTimeout(t)},[]);
  return <div className="toast"><span>✅</span>{msg}</div>}

function PageHeader({icon,title,sub,action}){return <div style={{marginBottom:14,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
  <div><div className="pf"style={{fontSize:17,fontWeight:700,color:"var(--b)",marginBottom:2}}>{icon} {title}</div>
  {sub&&<div style={{fontSize:12,color:"var(--l)"}}>{sub}</div>}</div>{action}</div>}

// ─── ACCUEIL ASMAT ────────────────────────────────────────────────────────────
function AccueilAssMat({enfants,setPage}){
  const pt=D.pointages.filter(p=>p.date===TODAY_STR);
  const tx=D.transmissions.filter(t=>t.date===TODAY_STR);
  const msgs=D.messages.filter(m=>!m.lu);
  const nonSigne=enfants.filter(e=>!e.signe);

  const kpis=[
    {icon:"👶",val:pt.filter(p=>!p.dep).length+"/"+enfants.length,lbl:"Présents",c:"var(--T)",page:"pointage",hint:"→ Pointage"},
    {icon:"💬",val:msgs.length,lbl:"Messages non lus",c:"var(--B)",page:"messagerie",hint:"→ Messagerie"},
    {icon:"⏰",val:Object.values(D.heures).reduce((a,h)=>a+h.real,0)+"h",lbl:"Heures ce mois",c:"var(--S)",page:"pointage",hint:"→ Voir bilan"},
    {icon:"🧾",val:"3",lbl:"Factures à émettre",c:"var(--G)",page:"admin_finances",hint:"→ Facturation"},
  ];

  return <div className="fi">
    <div style={{marginBottom:18}}>
      <div style={{fontSize:11,color:"var(--l)",marginBottom:4,fontFamily:"'DM Mono',monospace",letterSpacing:".5px"}}>
        {todayStr().toUpperCase()}
      </div>
      <div className="pf"style={{fontSize:26,fontWeight:600,color:"var(--b)",lineHeight:1.2}}>Bonjour Marie 👋</div>
      <div style={{fontSize:13,color:"var(--m)",marginTop:4}}>Votre espace professionnel</div>
    </div>

    {/* Alerte contrats */}
    {nonSigne.length>0&&<div onClick={()=>setPage("admin_finances")}
      style={{background:"linear-gradient(135deg,#FFF8E6,#FFF3D6)",border:"1.5px solid #E8B820",borderRadius:14,padding:"11px 16px",marginBottom:14,display:"flex",gap:10,alignItems:"center",cursor:"pointer",transition:"transform .15s"}}
      onMouseEnter={e=>e.currentTarget.style.transform="translateY(-1px)"}
      onMouseLeave={e=>e.currentTarget.style.transform="translateY(0)"}>
      <span style={{fontSize:20}}>✍️</span>
      <div style={{fontSize:13,color:"#7A5500",fontWeight:600,flex:1}}>
        {nonSigne.map(e=>e.prenom).join(", ")} — signature de contrat en attente
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

    {/* Enfants du jour — TOUT cliquable */}
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
          const rep=D.repas.find(r=>r.eId===e.id&&r.date===TODAY_STR);
          return <div key={e.id} style={{background:"var(--c)",borderRadius:14,padding:14,border:`2px solid ${e.couleur}20`,transition:"all .2s"}}>
            {/* En-tête enfant cliquable → journal */}
            <div onClick={()=>setPage("journal_complet")}style={{display:"flex",gap:10,alignItems:"center",marginBottom:10,cursor:"pointer"}}>
              <span style={{fontSize:28}}>{e.emoji}</span>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:14,color:"var(--b)"}}>{e.prenom}</div>
                <div style={{fontSize:11,color:"var(--l)"}}>{age(e.naissance)}</div>
              </div>
              {/* Badge messages → messagerie */}
              {msg>0&&<span className="badge"onClick={ev=>{ev.stopPropagation();setPage("messagerie");}}
                style={{background:"var(--Rp)",color:"var(--R)",cursor:"pointer",fontSize:12}}>
                {msg} 💬
              </span>}
            </div>

            {/* Allergie → santé */}
            {e.allergies.length>0&&<div onClick={()=>setPage("sante_complet")}
              style={{fontSize:11,color:"var(--R)",fontWeight:700,marginBottom:8,cursor:"pointer",padding:"3px 6px",background:"#FFF0F4",borderRadius:6,display:"inline-block"}}>
              ⚠️ {e.allergies.join(", ")}
            </div>}

            {/* Pointage → pointage */}
            {p?<div onClick={()=>setPage("pointage")}
              style={{fontSize:12,color:"var(--S)",fontWeight:600,cursor:"pointer",marginBottom:6}}>
              ↗ {p.arr} {p.dep?"· ↘ "+p.dep:"· en cours ⏱"}
            </div>:<div onClick={()=>setPage("pointage")}
              style={{fontSize:12,color:"var(--l)",cursor:"pointer",marginBottom:6}}>
              ⏰ Pas encore arrivé — pointer →
            </div>}

            {/* Repas → repas */}
            {rep&&<div onClick={()=>setPage("journal_complet")}
              style={{fontSize:11,cursor:"pointer",color:"var(--G)",fontWeight:600,marginBottom:6}}>
              🍽 {rep.dej} · {rep.q==="bien"?"✅":"🟡"}
            </div>}

            {/* Humeur → bilan de journée */}
            {t&&<div onClick={()=>setPage("journal_complet")}
              title="Voir le bilan de journée"
              style={{fontSize:22,cursor:"pointer",display:"inline-block",transition:"transform .2s"}}
              onMouseEnter={ev=>ev.currentTarget.style.transform="scale(1.25)"}
              onMouseLeave={ev=>ev.currentTarget.style.transform="scale(1)"}>
              {t.mood}
            </div>}
          </div>;
        })}
      </div>
    </div>

    {/* Accès rapide — tous cliquables */}
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
        {D.evenements.slice(0,4).map(ev=><div key={ev.id}onClick={()=>setPage("calendrier")}
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

// ─── ACCUEIL PARENT ───────────────────────────────────────────────────────────
function AccueilParent({enfant,setPage}){
  if(!enfant)return <div>Chargement...</div>;
  const pt=D.pointages.find(p=>p.eId===enfant.id&&p.date===TODAY_STR);
  const txs=D.transmissions.filter(t=>t.eId===enfant.id&&t.date===TODAY_STR);
  const rep=D.repas.find(r=>r.eId===enfant.id&&r.date===TODAY_STR);
  const mms=D.milestones[enfant.id]||[];
  const recentMs=mms.filter(m=>m.ok).slice(-1)[0];

  return <div className="fi">
    <div style={{marginBottom:14}}>
      <div className="pf"style={{fontSize:21,fontWeight:700,color:"var(--b)"}}>Bonjour ! La journée de {enfant.prenom} ✨</div>
      <div style={{fontSize:12,color:"var(--l)",marginTop:2}}>{todayStr()}</div>
    </div>

    <div className="g2"style={{marginBottom:12}}>
      {/* Card enfant — allergie cliquable → santé */}
      <div className="card"style={{padding:18,borderTop:`4px solid ${enfant.couleur}`}}>
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
      {/* Pointage cliquable */}
      <div className="card"onClick={()=>setPage&&setPage("pointage")}style={{padding:18,cursor:"pointer",transition:"box-shadow .18s"}}
        onMouseEnter={e=>e.currentTarget.style.boxShadow="var(--sh2)"}
        onMouseLeave={e=>e.currentTarget.style.boxShadow="var(--sh)"}>
        <div style={{fontWeight:700,marginBottom:12,color:"var(--b)"}}>⏰ Pointage du jour</div>
        {pt?<div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
          {[["Arrivée",pt.arr,"var(--S)"],["Départ",pt.dep||"En cours","var(--T)"],["Total",pt.tot||"—","var(--b)"]].map(([l,v,c])=>
            <div key={l}style={{textAlign:"center"}}><div style={{fontSize:11,color:"var(--l)"}}>{l}</div>
              <div className="pf"style={{fontSize:20,fontWeight:700,color:c}}>{v}</div></div>)}
        </div>:<div style={{fontSize:13,color:"var(--l)"}}>Pas encore arrivé.</div>}
        <div style={{fontSize:11,color:"var(--l)",marginTop:8}}>Voir le détail →</div>
      </div>
    </div>

    {/* Transmissions — cliquables → journal */}
    <div className="card"onClick={()=>setPage&&setPage("journal_complet")}
      style={{padding:16,marginBottom:12,cursor:"pointer",transition:"box-shadow .18s"}}
      onMouseEnter={e=>e.currentTarget.style.boxShadow="var(--sh2)"}
      onMouseLeave={e=>e.currentTarget.style.boxShadow="var(--sh)"}>
      <div style={{fontWeight:700,marginBottom:12,color:"var(--b)"}}>📋 Journal de la journée</div>
      {txs.length===0?<div style={{fontSize:13,color:"var(--l)"}}>Aucune transmission pour le moment.</div>
        :txs.map(t=><div key={t.id}style={{display:"flex",gap:10,marginBottom:10}}>
          <div style={{fontSize:22}}>{t.mood}</div>
          <div style={{flex:1,background:t.auteur==="asmat"?"var(--Tp)":"var(--Bp)",borderRadius:10,padding:"9px 12px",
            borderLeft:`3px solid ${t.auteur==="asmat"?"var(--T)":"var(--B)"}`}}>
            <div style={{fontSize:11,fontWeight:700,color:t.auteur==="asmat"?"var(--T)":"var(--B)",marginBottom:3}}>
              {t.auteur==="asmat"?"👩‍👧 Marie":"👪 Vous"} · {t.h}</div>
            <div style={{fontSize:13,color:"var(--b)",lineHeight:1.5}}>{t.txt}</div>
          </div>
        </div>)}
    </div>

    {/* Repas — cliquable → repas */}
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

// ─── TRANSMISSIONS ────────────────────────────────────────────────────────────
function Transmissions({enfants,role,pEId}){
  const [selId,setSelId]=useState(enfants[0]?.id);
  const [msg,setMsg]=useState("");
  const [mood,setMood]=useState("😊");
  const [txs,setTxs]=useState(D.transmissions);
  const liste=role==="parent"?enfants.filter(e=>e.id===pEId):enfants;
  const enfant=liste.find(e=>e.id===selId)||liste[0];
  const msgs=txs.filter(t=>t.eId===enfant?.id).sort((a,b)=>a.id>b.id?1:-1);

  // Bilans reçus de Marie (demo data)
  const bilansRecus=role==="parent"?[
    {id:"br1",type:"bilan",date:"11/03/2024",txt:BILANS[enfant?.id]?.[0]||""},
    {id:"br2",type:"cr",trim:"T1 2024",txt:CRS[enfant?.id]?.[0]||""},
  ].filter(b=>b.txt):[];
  const [docOuvert,setDocOuvert]=useState(null);

  const send=()=>{if(!msg.trim())return;
    setTxs(p=>[...p,{id:"tn"+Date.now(),eId:enfant.id,auteur:role,date:TODAY_STR,h:TODAY_H,txt:msg,mood}]);
    setMsg("");};

  return <div className="fi">
    <PageHeader icon="📋" title="Journal" sub="Échanges quotidiens avec Marie"/>
    {role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
      {liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>setSelId(e.id)}/>)}</div>}

    {/* Documents reçus — parent seulement */}
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
                {b.type==="bilan"?"✨ Bilan de journée du "+b.date:"📝 CR Trimestriel — "+b.trim}
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
              borderLeft:`3px solid ${t.auteur==="asmat"?"var(--T)":"var(--B)"}`}}>
              <div style={{fontSize:11,fontWeight:700,color:t.auteur==="asmat"?"var(--T)":"var(--B)",marginBottom:3}}>
                {t.auteur==="asmat"?"👩‍👧 Marie":"👪 Parent"}</div>
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
              {["😄","😊","😐","😴","😢","😠","🥰","😬"].map(h=><button key={h}className={`moo ${mood===h?"on":""}`}onClick={()=>setMood(h)}>{h}</button>)}
            </div>
          </div>
          <div style={{marginBottom:10}}>
            <label className="lbl">Message</label>
            <textarea className="ta"value={msg}onChange={e=>setMsg(e.target.value)}
              placeholder={role==="asmat"?`Racontez la journée de ${enfant?.prenom}…`:"Informations pour la journée…"}/>
          </div>
          <button className="btn bT"style={{width:"100%"}}onClick={send}>Envoyer ✉️</button>
        </div>
        {D.moodHistory[enfant?.id]&&<div className="card"style={{padding:14}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:10,color:"var(--b)"}}>📈 Humeurs — 15 derniers jours</div>
          <div className="mood-bar">
            {D.moodHistory[enfant.id].map((v,i)=><div key={i}className="mood-b"style={{
              height:`${v/5*100}%`,width:"100%",
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

// ─── RÉCIT IA ─────────────────────────────────────────────────────────────────
// ─── BILANS PRÉ-RÉDIGÉS ───────────────────────────────────────────────────────
const BILANS={
  "e1":[
    "Ce matin, Léo est arrivé les yeux encore un peu lourds de sommeil, mais le sourire n'a pas tardé à illuminer son visage. Nous avons commencé la journée en douceur avec quelques livres imagiers, et très vite son entrain habituel est revenu. L'activité peinture de l'après-midi a été un vrai moment de magie — il a trempé ses petits doigts dans le rouge et le jaune avec une concentration et une fierté visibles.\n\nLe repas de midi s'est très bien passé : Léo a tout mangé sans hésitation, ce qui est toujours un plaisir à observer. Sa sieste a duré 1h30, un sommeil profond et réparateur. Au réveil, il était de nouveau rayonnant, prêt à profiter du goûter et des jeux du soir.\n\nEn fin de journée, j'ai remarqué comme Léo cherche de plus en plus à communiquer avec les mots — il pointe, nomme, demande. C'est un plaisir de l'accompagner dans cet éveil du langage. Bonne soirée à vous !",
    "La journée de Léo a débuté sur une note douce et apaisée. Il est entré dans la maison en tenant fermement son doudou, signe qu'une petite période d'adaptation était nécessaire ce matin. Mais en quelques minutes, il s'est élancé vers les jouets avec son enthousiasme caractéristique.\n\nNous avons beaucoup joué dehors avant le déjeuner — Léo adore observer les fourmis et les feuilles qui tombent. Son repas a été excellent, et sa sieste longue et paisible. L'après-midi, nous avons planté des radis ensemble : il a tenu la petite graine avec soin et l'a déposée dans la terre avec une attention touchante.\n\nLéo est un enfant curieux et plein de vie. Chaque journée avec lui est une nouvelle aventure. Je suis fière des progrès qu'il fait semaine après semaine. À demain !",
  ],
  "e2":[
    "Emma a débarqué ce matin avec une énergie débordante et un grand sourire — elle avait visiblement hâte de retrouver ses jouets préférés. Après un câlin rapide, elle s'est installée au coin puzzle avec une belle concentration, finissant un modèle de 12 pièces en moins de dix minutes. Impressionnant !\n\nLe repas a été un peu plus délicat aujourd'hui — Emma avait moins d'appétit que d'habitude, ce qui arrive à tous les enfants. Elle a refusé la sieste mais est restée calme, jouant tranquillement et feuilletant des livres dans son coin doux. Ce moment de repos calme lui a été bénéfique.\n\nEn fin d'après-midi, nous avons fait de la musique avec des instruments de percussion maison. Emma chante de plus en plus juste et son sens du rythme est remarquable pour son âge. C'est un vrai plaisir de l'observer s'épanouir. Belle soirée à vous !",
    "Quelle belle journée avec Emma ! Elle est arrivée guillerette, avec un nouveau mot à la bouche qu'elle a répété toute la matinée avec fierté. Nous avons travaillé sur les couleurs avec de la pâte à modeler — Emma distingue maintenant parfaitement le rouge, le bleu et le jaune.\n\nLe repas du midi était un peu timide côté appétit, mais Emma a bien compensé au goûter. Pas de sieste aujourd'hui, mais un temps calme sur son tapis de jeu qui lui a permis de se ressourcer. Elle est restée de bonne humeur tout l'après-midi.\n\nJe tenais à vous signaler qu'Emma commence à partager spontanément ses jouets avec les autres enfants — un grand pas dans son développement social dont vous pouvez être fiers. À très bientôt !",
  ],
  "e3":[
    "Aujourd'hui a été une journée historique pour Noah — et pour moi ! Il a fait ses quatre premiers pas tout seul, au milieu du salon, avec un sourire immense et des yeux brillants de fierté. J'ai failli pleurer de joie. Ces instants-là sont la raison pour laquelle j'aime ce métier.\n\nNoah a très bien mangé — il découvre de nouvelles saveurs avec curiosité et accepte presque tout ce qu'on lui propose. Sa sieste a duré deux bonnes heures, et il s'est réveillé reposé et de très bonne humeur. Nous avons ensuite joué avec les maracas maison qu'il secoue en rythme avec une concentration attendrissante.\n\nJe suis tellement heureuse d'avoir vécu ce premier pas à ses côtés. Noah est un enfant lumineux, plein de vie et de curiosité. Chaque journée avec lui est un cadeau. Profitez bien de ce soir — il mérite tous vos câlins ! 🥰",
    "Noah a passé une journée douce et studieuse. Malgré sa petite dent qui pousse et une nuit un peu agitée, il a montré une belle résilience ce matin — quelques minutes de câlin et il était déjà reparti à explorer son univers.\n\nLes repas se passent très bien, et Noah commence à tenir sa cuillère de façon de plus en plus assurée. C'est un grand signe d'autonomie ! Sa sieste a été longue et profonde — il en avait besoin. L'après-midi, nous avons fait des jeux d'éveil sensoriels avec différentes textures qu'il a explorées avec ses petits doigts curieux.\n\nNoah est un enfant éveillé et attachant. Son développement moteur progresse à grands pas — littéralement ! Je suis impatiente de voir ce qu'il nous réserve demain. Bonne soirée à vous !",
  ],
};
const CRS={
  "e1":[
    "1. Bilan global du trimestre\n\nLéo a traversé ce trimestre avec une belle sérénité et un épanouissement visible semaine après semaine. Son intégration dans le groupe est complète — il se sent en confiance, sécurisé, et commence chaque journée avec entrain. Ses humeurs sont stables et positives, ce qui témoigne d'un attachement solide et d'un environnement familial épanouissant.\n\n2. Développement et acquisitions\n\nSur le plan du langage, Léo a fait des progrès remarquables : il construit maintenant des phrases de deux à trois mots et nomme un grand nombre d'objets du quotidien. Sa motricité fine s'affine — il tient bien les crayons et les ustensiles. Nous avons travaillé sur les couleurs primaires qu'il reconnaît et nomme avec plaisir.\n\n3. Vie quotidienne\n\nLes repas se déroulent très bien dans l'ensemble — Léo mange seul à la cuillère avec une belle autonomie. Sa sieste est régulière (1h30 à 2h) et réparatrice. Il s'intègre bien aux activités collectives et commence à jouer avec les autres enfants de façon coopérative.\n\n4. Objectifs du prochain trimestre\n\nNous allons continuer à enrichir son vocabulaire à travers des activités de lecture et d'éveil sensoriel. Je souhaite également travailler sur l'autonomie à l'habillage et approfondir les activités créatives qui le passionnent.",
  ],
  "e2":[
    "1. Bilan global du trimestre\n\nEmma aborde ce trimestre avec une maturité impressionnante pour son âge. Elle est autonome, curieuse, et fait preuve d'une belle concentration lors des activités dirigées. Son caractère bien trempé est une vraie force — elle sait ce qu'elle veut et l'exprime clairement, ce qui facilite beaucoup nos échanges au quotidien.\n\n2. Développement et acquisitions\n\nEmma possède un vocabulaire très riche et pose constamment des questions sur le monde qui l'entoure — son « pourquoi ? » est inépuisable et témoigne d'un intellect en plein éveil. Sa motricité globale est excellente : elle court, saute et grimpe avec agilité. Elle s'habille partiellement seule et nous travaillons sur les boutons et les fermetures.\n\n3. Vie quotidienne\n\nLes repas sont parfois sélectifs mais Emma accepte progressivement de nouvelles saveurs. Elle refuse souvent la sieste mais le temps calme qui la remplace lui convient bien. Elle a développé des amitiés fortes dans le groupe et joue de façon imaginative et créative.\n\n4. Objectifs du prochain trimestre\n\nNous allons travailler sur le partage et la gestion des émotions en groupe, ainsi que sur les premières notions de chiffres et de lettres à travers des jeux. Je propose aussi d'enrichir les activités artistiques qui la passionnent.",
  ],
  "e3":[
    "1. Bilan global du trimestre\n\nNoah a vécu un trimestre extraordinaire, marqué par des acquisitions motrices spectaculaires dont ses premiers pas autonomes. Il rayonne de bonheur chaque matin et s'est parfaitement adapté à son environnement d'accueil. Son tempérament solaire et sa curiosité naturelle font de lui un enfant attachant qui illumine les journées.\n\n2. Développement et acquisitions\n\nLa grande acquisition de ce trimestre est bien sûr la marche autonome — Noah fait maintenant plusieurs pas seuls et progresse chaque jour. Sur le plan du langage, il dit clairement « mama » et « papa » et quelques syllabes significatives. Sa compréhension est excellente : il répond aux consignes simples et comprend parfaitement ce qu'on lui dit.\n\n3. Vie quotidienne\n\nNoah mange avec appétit et diversifié — il accepte bien les nouvelles textures. Ses siestes sont longues et réparatrices (2h en moyenne). Il adore les jeux d'éveil musical et sensoriel, et réagit avec joie à la musique et aux comptines.\n\n4. Objectifs du prochain trimestre\n\nNous allons encourager et sécuriser la marche autonome, travailler sur l'enrichissement du vocabulaire avec des imagiers et des comptines, et introduire des activités de motricité fine adaptées à son âge.",
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
      sub="Journal personnalisé de la journée — rédigé automatiquement"/>
    {role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
      {liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>{setSelId(e.id);setRecit("");setIdx(0);}}/>)}</div>}

    <div className="g2">
      <div>
        <div className={`card ${recit?"ai-card":""}`}style={{padding:18,marginBottom:12,border:"1.5px solid var(--P)"}}>
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
          {[["😊 Humeurs",tx.map(t=>t.mood).join(" ")||"—"],
            ["🍽️ Repas",rep?rep.dej:"—"],
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

// ─── POINTAGE ────────────────────────────────────────────────────────────────
function Pointage({enfants,role,pEId}){
  const [selId,setSelId]=useState(enfants[0]?.id);
  const [pts,setPts]=useState(D.pointages);
  const [arr,setArr]=useState("");const [dep,setDep]=useState("");
  const [toast,setToast]=useState("");
  const liste=role==="parent"?enfants.filter(e=>e.id===pEId):enfants;
  const enfant=liste.find(e=>e.id===selId)||liste[0];
  const ptJ=pts.find(p=>p.eId===enfant?.id&&p.date===TODAY_STR);
  const ptH=pts.filter(p=>p.eId===enfant?.id).sort((a,b)=>b.date>a.date?-1:1);
  const h=D.heures[enfant?.id]||{};
  const solde=h.real-h.prev;

  const save=()=>{
    if(!arr)return;
    const tot=()=>{if(!arr||!dep)return null;
      const[h1,m1]=arr.split(":").map(Number);const[h2,m2]=dep.split(":").map(Number);
      const d=(h2*60+m2)-(h1*60+m1);return`${Math.floor(d/60)}h${String(d%60).padStart(2,"0")}`;};
    setPts(p=>[...p.filter(x=>!(x.eId===enfant.id&&x.date===TODAY_STR)),
      {id:"ptn"+Date.now(),eId:enfant.id,date:TODAY_STR,arr:arr.replace(":","h"),dep:dep?dep.replace(":","h"):null,tot:tot(),valide:true}]);
    setArr("");setDep("");setToast("Pointage enregistré ✓");};

  return <div className="fi">
    {toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
    <PageHeader icon="⏰" title="Pointage des heures" sub="Suivi quotidien et bilan mensuel"/>
    {role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
      {liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>setSelId(e.id)}/>)}</div>}
    <div className="g2">
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div className="card"style={{padding:16}}>
          <div style={{fontWeight:700,marginBottom:12,color:"var(--b)"}}>📊 Bilan Mars 2024 — {enfant?.prenom}</div>
          <div className="g3"style={{marginBottom:12}}>
            {[["Prévues",`${h.prev}h`,"var(--B)"],["Réalisées",`${h.real}h`,"var(--S)"],["Solde",`${solde>0?"+":""}${solde}h`,solde<0?"var(--R)":"var(--S)"]].map(([l,v,c])=>
              <div key={l}style={{background:"var(--c)",borderRadius:10,padding:12,textAlign:"center"}}>
                <div className="pf"style={{fontSize:20,fontWeight:700,color:c}}>{v}</div>
                <div style={{fontSize:11,color:"var(--l)",marginTop:2}}>{l}</div>
              </div>)}
          </div>
          <div style={{marginBottom:4}}><div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"var(--m)",marginBottom:4}}>
            <span>Progression</span><span>{h.real}h / {h.prev}h</span></div>
            <div className="bar"><div className="bar-fill"style={{width:`${Math.min(h.real/h.prev*100,100)}%`,background:"var(--S)"}}/></div>
          </div>
        </div>
        <div className="card"style={{padding:16}}>
          <div style={{fontWeight:700,marginBottom:12,color:"var(--b)"}}>📍 Aujourd'hui</div>
          {ptJ?<div style={{background:"var(--Sp)",borderRadius:10,padding:12,border:"1px solid var(--Sl)",marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              {[["Arrivée",ptJ.arr,"var(--S)"],["→","","var(--l)"],["Départ",ptJ.dep||"En cours","var(--T)"],["Total",ptJ.tot||"—","var(--b)"]].map(([l,v,c])=>
                <div key={l}style={{textAlign:"center"}}><div style={{fontSize:11,color:"var(--l)"}}>{l}</div>
                  <div className="pf"style={{fontSize:18,fontWeight:700,color:c}}>{v}</div></div>)}
            </div>
          </div>:<div style={{fontSize:13,color:"var(--l)",marginBottom:12}}>Pas encore pointé.</div>}
          {role==="asmat"&&<div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
              <div><label className="lbl">Arrivée</label><input type="time"className="inp"value={arr}onChange={e=>setArr(e.target.value)}/></div>
              <div><label className="lbl">Départ</label><input type="time"className="inp"value={dep}onChange={e=>setDep(e.target.value)}/></div>
            </div>
            <button className="btn bS"style={{width:"100%"}}onClick={save}>Enregistrer le pointage</button>
          </div>}
        </div>
      </div>
      <div className="card"style={{padding:16}}>
        <div style={{fontWeight:700,marginBottom:12,color:"var(--b)"}}>📅 Historique récent</div>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {ptH.slice(0,8).map(p=><div key={p.id}style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 10px",background:"var(--c)",borderRadius:9}}>
            <div style={{fontSize:12,fontWeight:600,color:"var(--b)"}}>{new Date(p.date).toLocaleDateString("fr-FR",{weekday:"short",day:"numeric",month:"short"})}</div>
            <div style={{display:"flex",gap:10,fontSize:12}}>
              <span style={{color:"var(--S)"}}>↗{p.arr}</span>
              <span style={{color:"var(--T)"}}>↘{p.dep||"—"}</span>
              <span style={{fontWeight:700,color:"var(--b)"}}>{p.tot||"—"}</span>
            </div>
            <span style={{fontSize:13}}>{p.valide?"✅":"⏳"}</span>
          </div>)}
        </div>
      </div>
    </div>
  </div>;
}

// ─── REPAS & CHANGES ──────────────────────────────────────────────────────────
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

// ─── CALENDRIER ───────────────────────────────────────────────────────────────
// ─── JOURS FÉRIÉS & VACANCES ZONE C 2024 ─────────────────────────────────────
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

function Calendrier({enfants,role}){
  const [mois,setMois]=useState(2);const [an,setAn]=useState(2024);
  const [sel,setSel]=useState(null);const [evs,setEvs]=useState(D.evenements);
  const [newEv,setNewEv]=useState({type:"rdv",txt:""});
  const noms=["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
  const jours=["Lu","Ma","Me","Je","Ve","Sa","Di"];
  const premier=new Date(an,mois,1).getDay();const offset=(premier+6)%7;
  const total=new Date(an,mois+1,0).getDate();
  const today=11;

  const ds=(d)=>`${an}-${String(mois+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
  const getUserEv=(d)=>evs.find(e=>e.date===ds(d));
  const getFerie=(d)=>FERIES_2024[ds(d)];
  const getBirthday=(d)=>enfants.find(e=>e.naissance&&e.naissance.slice(5)===ds(d).slice(5));
  const getVac=(d)=>isVacances(ds(d));

  const addEv=()=>{if(!sel||!newEv.txt.trim())return;
    setEvs(p=>[...p,{id:"ev"+Date.now(),date:ds(sel),...newEv}]);
    setNewEv({type:"rdv",txt:""});};

  const moisStr=`${an}-${String(mois+1).padStart(2,"0")}`;
  const moisEvs=[
    ...evs.filter(e=>e.date.startsWith(moisStr)).map(e=>({...e,src:"user"})),
    ...Object.entries(FERIES_2024).filter(([d])=>d.startsWith(moisStr)).map(([d,n])=>({id:d,date:d,txt:n,type:"ferie",src:"ferie"})),
    ...enfants.filter(e=>e.naissance&&`${an}-${e.naissance.slice(5)}`.startsWith(moisStr))
      .map(e=>({id:"bd"+e.id,date:`${an}-${e.naissance.slice(5)}`,txt:"🎂 Anniversaire de "+e.prenom,type:"anniv",src:"birthday"}))
  ].sort((a,b)=>a.date>b.date?1:-1);

  return <div className="fi">
    <PageHeader icon="📅" title="Calendrier partagé" sub="Événements, congés, anniversaires et vacances scolaires Zone C"/>
    <div className="g2">
      <div className="card"style={{padding:18}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <button className="btn bG"style={{padding:"6px 12px",fontSize:16}}onClick={()=>{if(mois===0){setMois(11);setAn(a=>a-1)}else setMois(m=>m-1)}}>‹</button>
          <div className="pf"style={{fontWeight:600,fontSize:18,color:"var(--b)"}}>{noms[mois]} {an}</div>
          <button className="btn bG"style={{padding:"6px 12px",fontSize:16}}onClick={()=>{if(mois===11){setMois(0);setAn(a=>a+1)}else setMois(m=>m+1)}}>›</button>
        </div>
        <div className="cgrid"style={{marginBottom:8}}>
          {jours.map(j=><div key={j}style={{textAlign:"center",fontSize:10,fontWeight:700,color:"var(--l)",padding:"4px 0",letterSpacing:".5px"}}>{j}</div>)}
        </div>
        <div className="cgrid">
          {Array(offset).fill(null).map((_,i)=><div key={"e"+i}/>)}
          {Array(total).fill(null).map((_,i)=>{
            const d=i+1;
            const uev=getUserEv(d);
            const ferie=getFerie(d);
            const bday=getBirthday(d);
            const vac=getVac(d);
            const isToday=mois===2&&d===today;
            const isSel=sel===d;
            let cls="cday";
            if(isToday||isSel)cls+=" tod";
            else if(ferie)cls+=" abs";
            else if(vac)cls+=" hol";
            else if(uev?.type==="abs")cls+=" abs";
            else if(uev?.type==="cng")cls+=" cng";
            else if(uev?.type==="hol")cls+=" hol";

            return <div key={d}className={cls}onClick={()=>setSel(sel===d?null:d)}
              title={ferie||bday?(ferie||"")+(bday?" 🎂 "+bday.prenom:""):""}>
              <span>{d}</span>
              {bday&&<div style={{position:"absolute",top:1,right:2,fontSize:7}}>🎂</div>}
              {ferie&&!isToday&&<div style={{position:"absolute",bottom:2,fontSize:7}}>⭐</div>}
              {uev&&!isToday&&!ferie&&<div className="dot"/>}
            </div>;})}
        </div>

        {/* Légende */}
        <div style={{display:"flex",gap:10,marginTop:14,flexWrap:"wrap"}}>
          {[["var(--Rp)","var(--R)","Absence / Férié"],
            ["var(--Tp)","var(--T)","Aujourd'hui"],
            ["var(--Gp)","var(--G)","Congé"],
            ["var(--Bp)","var(--B)","Vacances / Événement"],
          ].map(([bg,c,l])=>
            <div key={l}style={{display:"flex",alignItems:"center",gap:4}}>
              <div style={{width:10,height:10,borderRadius:3,background:bg,border:`1px solid ${c}`}}/>
              <span style={{fontSize:10,color:"var(--m)"}}>{l}</span>
            </div>)}
        </div>

        {/* Anniversaires ce mois */}
        {enfants.some(e=>e.naissance?.slice(5)&&`${an}-${e.naissance.slice(5)}`.startsWith(moisStr))&&
          <div style={{marginTop:12,padding:"8px 12px",background:"var(--Tp)",borderRadius:10,border:"1px solid var(--Tl)"}}>
            <div style={{fontSize:11,fontWeight:700,color:"var(--T)",marginBottom:4}}>🎂 Anniversaires ce mois</div>
            {enfants.filter(e=>`${an}-${e.naissance?.slice(5)}`.startsWith(moisStr)).map(e=>
              <div key={e.id}style={{fontSize:13,color:"var(--b)"}}>
                {e.emoji} {e.prenom} — {parseInt(e.naissance?.slice(5,7))} 
                {new Date(an,mois,parseInt(`${an}-${e.naissance?.slice(5)}`.slice(8))).toLocaleDateString("fr-FR",{day:"numeric",month:"long"})}
              </div>)}
          </div>}
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {sel&&role==="asmat"&&<div className="card"style={{padding:14}}>
          <div style={{fontWeight:600,fontSize:13,marginBottom:10,color:"var(--b)"}}>
            ➕ {sel} {noms[mois]} {an}
            {getFerie(sel)&&<span style={{fontSize:11,color:"var(--R)",marginLeft:8}}>Jour férié</span>}
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

        <div className="card"style={{padding:14}}>
          <div style={{fontWeight:600,fontSize:13,marginBottom:10,color:"var(--b)"}}>📋 {noms[mois]} {an}</div>
          {moisEvs.length===0&&<div style={{fontSize:13,color:"var(--l)"}}>Aucun événement.</div>}
          {moisEvs.map(ev=><div key={ev.id}style={{display:"flex",gap:8,padding:"7px 0",borderBottom:"1px solid var(--br)",alignItems:"center"}}>
            <span className="badge"style={{
              background:ev.type==="abs"||ev.type==="ferie"?"var(--Rp)":ev.type==="anniv"?"var(--Tp)":ev.type==="cng"?"var(--Gp)":"var(--Bp)",
              color:ev.type==="abs"||ev.type==="ferie"?"var(--R)":ev.type==="anniv"?"var(--T)":ev.type==="cng"?"var(--G)":"var(--B)",
              whiteSpace:"nowrap",fontSize:10}}>
              {ev.date.slice(8)} {noms[mois].slice(0,3).toLowerCase()}
            </span>
            <span style={{fontSize:12,color:"var(--m)",flex:1}}>{ev.txt}</span>
          </div>)}
        </div>

        {/* Vacances ce mois */}
        {VACANCES_2024.filter(v=>v.debut.startsWith(moisStr)||v.fin.startsWith(moisStr)||
          (v.debut<moisStr+"-99"&&v.fin>moisStr)).map(v=>
          <div key={v.nom}className="card"style={{padding:12,background:"var(--Bp)",border:"1px solid rgba(46,95,138,.3)"}}>
            <div style={{fontWeight:700,fontSize:12,color:"var(--B)",marginBottom:2}}>
              🏖️ Vacances {v.nom} — Zone C
            </div>
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
          {conv.map(m=><div key={m.id}className={`msg ${m.de==="asmat"?"msg-me":"msg-ot"}`}>
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

// ─── FACTURATION ─────────────────────────────────────────────────────────────
function Facturation({enfants,role,pEId}){
  const [selId,setSelId]=useState(enfants[0]?.id);
  const [abs,setAbs]=useState(D.absences);
  const [toast,setToast]=useState("");
  const liste=role==="parent"?enfants.filter(e=>e.id===pEId):enfants;
  const enfant=liste.find(e=>e.id===selId)||liste[0];
  const contrat=enfant?.contrat;
  const h=D.heures[enfant?.id]||{};
  const salBrut=contrat?(h.real*contrat.tauxHoraire+(h.real/5*contrat.entretien)):0;
  const absMois=abs.filter(a=>a.eId===enfant?.id);
  const indemAbs=absMois.filter(a=>a.indemnise).reduce((s,a)=>s+a.heures*((contrat?.tauxHoraire||4.05)*contrat?.indemniteAbsence),0);
  const totalBrut=salBrut+indemAbs;

  const exportPajemploi=()=>{setToast("Export Pajemploi préparé — données copiées ✓");};

  return <div className="fi">
    {toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
    <PageHeader icon="🧾" title="Facturation & Pajemploi" sub="Calcul automatique du salaire mensuel"/>
    {role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
      {liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>setSelId(e.id)}/>)}</div>}

    {contrat&&<div className="g2">
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div className="card"style={{padding:16}}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:14,color:"var(--b)"}}>💰 Salaire Mars 2024 — {enfant?.prenom}</div>
          {[["Heures réalisées",`${h.real}h × ${contrat.tauxHoraire}€`,(h.real*contrat.tauxHoraire).toFixed(2)+"€"],
            ["Indemnité entretien",`${h.real} jrs × ${contrat.entretien}€`,(h.real/5*contrat.entretien).toFixed(2)+"€"],
            ["Absences indemnisées",`${absMois.filter(a=>a.indemnise).length} jours`,"+"+indemAbs.toFixed(2)+"€"],
          ].map(([l,d,v])=><div key={l}style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderBottom:"1px solid var(--br)"}}>
            <div><div style={{fontSize:13,fontWeight:600,color:"var(--b)"}}>{l}</div>
              <div style={{fontSize:11,color:"var(--l)"}}>{d}</div></div>
            <div style={{fontWeight:700,color:"var(--S)"}}>{v}</div>
          </div>)}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:10,paddingTop:10,borderTop:"2px solid var(--T)"}}>
            <span className="pf"style={{fontSize:15,fontWeight:700,color:"var(--b)"}}>Total brut mensuel</span>
            <span className="pf"style={{fontSize:20,fontWeight:700,color:"var(--T)"}}>{totalBrut.toFixed(2)} €</span>
          </div>
          <div style={{fontSize:11,color:"var(--l)",marginTop:6}}>* Net ≈ {(totalBrut*0.78).toFixed(2)}€ (estimation — vérifiez via Pajemploi)</div>
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
              <div style={{fontSize:13,fontWeight:600,color:"var(--b)"}}>{fmt(a.date)} — {a.motif}</div>
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

// ─── CONTRATS & SIGNATURE ─────────────────────────────────────────────────────
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
  const signer=()=>{if(!hasSig)return;setSignes(p=>({...p,[enfant.id]:true}));setToast(`Contrat signé électroniquement ✓`);};
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
            <div style={{fontWeight:700,fontSize:14,color:"var(--b)"}}>📋 Contrat — {enfant?.prenom}</div>
            <span className="badge"style={{background:signes[enfant?.id]?"var(--Sp)":"var(--Gp)",color:signes[enfant?.id]?"var(--S)":"var(--G)"}}>
              {signes[enfant?.id]?"✅ Signé":"⏳ En attente de signature"}</span>
          </div>
          {[["Période",`${fmt(contrat.debut)} → ${fmt(contrat.fin)}`],
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
            🔒 Signature horodatée et sécurisée — valeur légale conforme eIDAS
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

// ─── SANTÉ ────────────────────────────────────────────────────────────────────
function Sante({enfants,role,pEId}){
  const [selId,setSelId]=useState(enfants[0]?.id);
  const liste=role==="parent"?enfants.filter(e=>e.id===pEId):enfants;
  const enfant=liste.find(e=>e.id===selId)||liste[0];
  const vacs=enfant?.vaccins||[];

  return <div className="fi">
    <PageHeader icon="🏥" title="Carnet de santé" sub="Informations médicales, vaccins, allergies"/>
    {role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
      {liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>setSelId(e.id)}/>)}</div>}

    {enfant&&<div className="g2">
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {/* Identité médicale */}
        <div className="card"style={{padding:16}}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:12,color:"var(--b)"}}>🪪 Identité médicale</div>
          {[["Groupe sanguin",enfant.groupe_sanguin||"—"],["Médecin traitant",enfant.medecin||"—"]].map(([l,v])=>
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
          {[["SAMU","15"],["Pompiers","18"],["Médecin traitant",enfant.medecin?.split("-")[1]?.trim()||"—"]].map(([l,v])=>
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
            ⏰ Prochain rappel : <strong>ROR de {enfant.prenom}</strong> — à prévoir avant {age(enfant.naissance)}
          </div>
        </div>
      </div>
    </div>}
  </div>;
}

// ─── PORTFOLIO ────────────────────────────────────────────────────────────────
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
      <button className={`btn ${!selId?"bT":"bG"}`}onClick={()=>setSelId(null)}>Tous</button>
      {listeEnfants.map(e=><button key={e.id}className={`btn ${selId===e.id?"bT":"bG"}`}onClick={()=>setSelId(selId===e.id?null:e.id)}>{e.emoji} {e.prenom}</button>)}
    </div>}

    {showForm&&<div className="card"style={{padding:16,marginBottom:14,border:"1.5px solid var(--T)"}}>
      <div style={{fontWeight:700,fontSize:13,marginBottom:10,color:"var(--b)"}}>Nouvelle activité</div>
      <div className="g2"style={{marginBottom:10}}>
        <div><label className="lbl">Titre</label><input className="inp"value={nf.titre}onChange={e=>setNf(p=>({...p,titre:e.target.value}))}placeholder="Nom de l'activité"/></div>
        <div><label className="lbl">Emoji</label><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
          {emojis.map(em=><button key={em}className={`moo ${nf.emoji===em?"on":""}`}onClick={()=>setNf(p=>({...p,emoji:em}))}style={{fontSize:16,padding:"5px 8px"}}>{em}</button>)}</div></div>
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

// ─── DÉVELOPPEMENT ────────────────────────────────────────────────────────────
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
    <PageHeader icon="🌱" title="Suivi du développement" sub="Jalons OMS — étapes clés de l'enfant"/>
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
            <div className="bar-fill"style={{width:`${pct}%`,background:"var(--S)"}}/>
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
              <div className="bar-fill"style={{width:`${cpct}%`,background:"var(--S)"}}/>
            </div>
          </div>;})}
      </div>

      <div className="card"style={{padding:16}}>
        <div style={{fontWeight:700,fontSize:14,marginBottom:12,color:"var(--b)"}}>Toutes les étapes</div>
        {cats.map(cat=><div key={cat}style={{marginBottom:14}}>
          <div style={{fontSize:12,fontWeight:700,color:"var(--m)",textTransform:"uppercase",letterSpacing:".5px",marginBottom:6}}>{cat}</div>
          {items.filter(m=>m.cat===cat).map(m=><div key={m.id}className="ms"onClick={()=>role==="asmat"&&toggle(m.id)}>
            <div className={`msc ${m.ok?"ok":""}`}>{m.ok?"✓":""}</div>
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

// ─── RÉCAP MENSUEL PDF ────────────────────────────────────────────────────────
function Recap({enfants,role,pEId}){
  const [selId,setSelId]=useState(enfants[0]?.id);
  const [showPrev,setShowPrev]=useState(false);
  const [toast,setToast]=useState("");
  const liste=role==="parent"?enfants.filter(e=>e.id===pEId):enfants;
  const enfant=liste.find(e=>e.id===selId)||liste[0];
  const contrat=enfant?.contrat;
  const h=D.heures[enfant?.id]||{};
  const rep=D.repas.filter(r=>r.eId===enfant?.id);
  const ms=D.milestones[enfant?.id]||[];

  return <div className="fi">
    {toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
    <PageHeader icon="📊" title="Récapitulatif mensuel PDF" sub="Bilan complet automatique — exclusivité TiMat"
      action={<button className="btn bT"onClick={()=>{setShowPrev(true);}}> 👁️ Aperçu PDF</button>}/>
    {role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
      {liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>setSelId(e.id)}/>)}</div>}

    <div className="g2"style={{marginBottom:12}}>
      {[["⏰","Heures réalisées",`${h.real}h / ${h.prev}h prévues`,"var(--B)"],
        ["🍽️","Repas enregistrés",`${rep.length} jours de suivi`,"var(--S)"],
        ["🌱","Étapes atteintes",`${ms.filter(m=>m.ok).length} / ${ms.length} jalons`,"var(--P)"],
        ["📋","Transmissions",`${D.transmissions.filter(t=>t.eId===enfant?.id).length} échanges`,"var(--T)"],
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
          <div style={{fontWeight:700,marginBottom:4}}>👶 {enfant.prenom} {enfant.nom} — {age(enfant.naissance)}</div>
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

// ─── TOPBAR ───────────────────────────────────────────────────────────────────
// ─── COMPTE-RENDU TRIMESTRIEL ─────────────────────────────────────────────────
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
      sub="Document professionnel généré automatiquement — exclusivité TiMat"/>
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

// ─── DOCUMENTS ───────────────────────────────────────────────────────────────
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
  const [docs,setDocs]=useState(DOCS_DEMO);
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
      taille:"—",icone:CATS[newDoc.cat]?.ic||"📄",
      partage:true,
    }]);
    setNewDoc({nom:"",cat:"medical",sous:"",eId:enfants[0]?.id||""});
    setShowUpload(false);
    setToast("Document ajouté ✓");
  };

  return <div className="fi">
    {toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
    <PageHeader icon="🗂️" title="Espace Documents"
      sub="Tous les documents classés par année — téléchargeables et imprimables"
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
            <option value="">— Document général —</option>
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
          <div style={{padding:"4px 12px",borderRadius:20,background:c.bg,color:c.c,fontSize:12,fontWeight:700,border:`1px solid ${c.c}33`}}>
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
                  {doc.taille!=="—"&&<><span style={{fontSize:11,color:"var(--l)"}}>·</span>
                  <span style={{fontSize:11,color:"var(--l)",fontFamily:"'DM Mono',monospace"}}>{doc.taille}</span></>}
                  {enfant&&<span className="badge"style={{background:`${enfant.couleur}18`,color:enfant.couleur,fontSize:10,padding:"1px 7px"}}>
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

// ─── CONTRATS & FACTURES (fusionnés) ─────────────────────────────────────────
function AdminFinances({enfants,role,pEId}){
  const [section,setSection]=useState("facturation");
  const sousOnglets=role==="asmat"
    ?[{id:"facturation",l:"Facturation & Pajemploi",ic:"🧾"},{id:"contrats",l:"Contrats & Signatures",ic:"📄"},{id:"recap",l:"Récap mensuel PDF",ic:"📊"}]
    :[{id:"contrats",l:"Mon contrat",ic:"📄"},{id:"recap",l:"Récap mensuel",ic:"📊"}];
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
    {section==="contrats"&&<Contrats enfants={enfants}role={role}pEId={pEId}/>}
    {section==="recap"&&<Recap enfants={enfants}role={role}pEId={pEId}/>}
  </div>;
}

// ─── JOURNAL (Journal + Bilan + CR intégrés) ──────────────────────────────────
function Journal({enfants,role,pEId}){
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
    {sousOnglet==="journal"&&<TransmissionsContent enfant={enfant}role={role}/>}
    {sousOnglet==="bilan"&&<RecitIA enfants={liste}role={role}pEId={pEId}/>}
    {sousOnglet==="cr"&&<CompteRenduTrimestriel enfants={liste}role={role}pEId={pEId}/>}
  </div>;
}

function TransmissionsContent({enfant,role}){
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
    {/* Photos — galerie cliquable */}
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

    {/* Documents reçus — parent seulement */}
    {role==="parent"&&bilansRecus.length>0&&<div className="card"style={{padding:16,marginBottom:14,border:"1.5px solid var(--P)"}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
        <div style={{width:28,height:28,borderRadius:"50%",background:"var(--Pp)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>✨</div>
        <div style={{fontWeight:700,fontSize:13,color:"var(--P)"}}>Documents reçus de Marie</div>
      </div>
      {bilansRecus.map(b=><div key={b.id}style={{marginBottom:8}}>
        <div onClick={()=>setDocOuvert(docOuvert===b.id?null:b.id)}
          style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",background:"var(--Pp)",borderRadius:10,cursor:"pointer",border:"1px solid rgba(106,63,136,.2)"}}>
          <div style={{fontWeight:700,fontSize:13,color:"var(--P)"}}>
            {b.type==="bilan"?"✨ Bilan du "+b.date:"📝 CR — "+b.trim}
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
            <div style={{flex:1,background:t.auteur==="asmat"?"var(--Tp)":"var(--Bp)",borderRadius:12,padding:"10px 14px",borderLeft:`3px solid ${t.auteur==="asmat"?"var(--T)":"var(--B)"}`}}>
              <div style={{fontSize:11,fontWeight:700,color:t.auteur==="asmat"?"var(--T)":"var(--B)",marginBottom:4}}>
                {t.auteur==="asmat"?"👩‍👧 Marie":`👪 ${D.parents.find(p=>p.id===enfant?.parentId)?.prenom||"Parent"}`}</div>
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
              {["😄","😊","😐","😴","😢","😠","🥰","😬"].map(h=><button key={h}className={`moo ${mood===h?"on":""}`}onClick={()=>setMood(h)}>{h}</button>)}
            </div>
          </div>
          <textarea className="ta"style={{marginBottom:10}}value={msg}onChange={e=>setMsg(e.target.value)}
            placeholder={role==="asmat"?`Racontez la journée de ${enfant?.prenom}…`:"Informations pour la journée…"}/>
          <button className="btn bT"style={{width:"100%"}}onClick={send}>Envoyer ✉️</button>
        </div>
        {D.moodHistory[enfant?.id]&&<div className="card"style={{padding:14}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:10,color:"var(--b)"}}>📈 Humeurs — 15 jours</div>
          <div className="mood-bar">
            {D.moodHistory[enfant.id].map((v,i)=><div key={i}className="mood-b"style={{height:`${v/5*100}%`,width:"100%",background:v>=4?"var(--S)":v>=3?"var(--G)":"var(--R)",opacity:.8}}/>)}
          </div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"var(--l)",marginTop:4}}>
            <span>J-14</span><span>Aujourd'hui</span>
          </div>
        </div>}
      </div>
    </div>
  </div>;
}

// ─── ÉVEIL (Portfolio + Développement fusionnés) ──────────────────────────────
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

// ─── SOMMEIL ──────────────────────────────────────────────────────────────────
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
              return <div key={i}style={{flex:1,borderRadius:"3px 3px 0 0",height:`${pct}%`,background:pct>70?"var(--S)":pct>40?"var(--G)":"var(--R)",transition:"height .5s ease"}}title={s.duree}/>;
            })}
          </div>
        </div>}
      </div>
    </div>
  </div>;
}

// ─── TABLEAU DE BORD ──────────────────────────────────────────────────────────
function TableauDeBord({enfants,role,pEId,setPage}){
  const liste=role==="parent"?enfants.filter(e=>e.id===pEId):enfants;
  const [selId,setSelId]=useState(liste[0]?.id);
  const [periode,setPeriode]=useState("7j");
  const enfant=liste.find(e=>e.id===selId)||liste[0];

  const ptAuj=D.pointages.filter(p=>p.date===TODAY_STR);
  const presents=ptAuj.filter(p=>!p.dep).length;
  const msgsNonLus=D.messages.filter(m=>!m.lu).length;
  const totalH=Object.values(D.heures).reduce((a,h)=>a+h.real,0);

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
  const pathD=moodPts.length>1?moodPts.map((p,i)=>i===0?`M${p.x},${p.y}`:`L${p.x},${p.y}`).join(" "):"";
  const areaD=moodPts.length>1?`${pathD} L${moodPts[moodPts.length-1].x},${svgH} L${moodPts[0].x},${svgH} Z`:"";

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
          <div style={{fontWeight:700,fontSize:13,color:"var(--b)"}}>😊 Humeurs — {enfant?.prenom}</div>
          <span className="pf"style={{fontSize:18,fontWeight:700,color:avgColor}}>{avg}/5</span>
        </div>
        <svg width="100%"viewBox={`0 0 ${svgW} ${svgH}`}style={{overflow:"visible"}}>
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

      {/* Heures semaine — barres */}
      <div className="card"style={{padding:16}}>
        <div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:14}}>⏰ Heures / semaine</div>
        <div style={{display:"flex",gap:4,alignItems:"flex-end",height:72}}>
          {heuresData.map((d,i)=><div key={i}style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
            <div style={{fontSize:9,color:"var(--l)",fontFamily:"'DM Mono',monospace"}}>{d.h||""}</div>
            <div style={{
              width:"100%",borderRadius:"4px 4px 0 0",
              height:`${(d.h/maxH)*60}px`,
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

      {/* Sommeil — barres horizontales */}
      <div className="card"style={{padding:16}}>
        <div style={{fontWeight:700,fontSize:13,color:"var(--b)",marginBottom:14}}>😴 Durée sieste — {enfant?.prenom}</div>
        {somData.map((d,i)=><div key={i}style={{marginBottom:8}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
            <span style={{fontSize:11,color:"var(--m)",fontFamily:"'DM Mono',monospace"}}>{d.j}</span>
            <span style={{fontSize:11,color:"var(--B)",fontWeight:600}}>{Math.floor(d.d)}h{Math.round((d.d%1)*60).toString().padStart(2,"0")}</span>
          </div>
          <div style={{height:8,background:"var(--Bp)",borderRadius:4,overflow:"hidden"}}>
            <div style={{height:"100%",width:`${(d.d/maxS)*100}%`,background:"linear-gradient(to right,var(--B),#5B9BD5)",borderRadius:4,transition:"width .6s ease"}}/>
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

// ─── COURBE POIDS / TAILLE ────────────────────────────────────────────────────
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
          <div style={{fontWeight:700,fontSize:14,marginBottom:12,color:"var(--b)"}}>📊 Dernière mesure — {enfant.prenom}</div>
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
          {pts.length>0?<svg width="100%"viewBox={`0 0 ${W} ${H}`}style={{overflow:"visible"}}>
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
            {vue==="poids"&&<polyline points={OMS_POIDS.slice(0,Math.min(13,mesures.length+2)).map((v,i)=>`${xScale(i)},${yScale(v)}`).join(" ")}
              fill="none"stroke="var(--B)"strokeWidth="1"strokeDasharray="3,3"opacity=".5"/>}
            {/* Courbe */}
            {pts.length>1&&<polyline points={pts.map(p=>`${p.x},${p.y}`).join(" ")}fill="none"stroke="var(--T)"strokeWidth="2.5"strokeLinecap="round"strokeLinejoin="round"/>}
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

// ─── ACTIVITÉS SUGGÉRÉES ──────────────────────────────────────────────────────
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
      {activites.map((a,i)=><div key={i}className="card"style={{padding:16,borderTop:`3px solid ${catColors[a.cat]||"var(--T)"}`}}>
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

// ─── EXPORT DONNÉES ───────────────────────────────────────────────────────────
function ExportDonnees({enfants,role,pEId}){
  const [selId,setSelId]=useState(enfants[0]?.id);
  const [format,setFormat]=useState("pdf");
  const [inclure,setInclure]=useState({transmissions:true,pointages:true,repas:true,sante:true,contrat:true,portfolio:true,factures:true});
  const [toast,setToast]=useState("");
  const liste=enfants;
  const enfant=liste.find(e=>e.id===selId)||liste[0];

  const toggle=(k)=>setInclure(p=>({...p,[k]:!p[k]}));
  const nb=Object.values(inclure).filter(Boolean).length;

  const exporter=()=>{
    setToast(`Export de ${enfant.prenom} généré (${nb} sections) — ${format.toUpperCase()} ✓`);
  };

  const sections=[
    {k:"transmissions",l:"Journal & transmissions",ic:"📋",n:D.transmissions.filter(t=>t.eId===enfant?.id).length+" entrées"},
    {k:"pointages",l:"Historique pointages",ic:"⏰",n:D.pointages.filter(p=>p.eId===enfant?.id).length+" jours"},
    {k:"repas",l:"Suivi repas",ic:"🍽️",n:D.repas.filter(r=>r.eId===enfant?.id).length+" jours"},
    {k:"sante",l:"Carnet santé & vaccins",ic:"🏥",n:(enfant?.vaccins?.length||0)+" vaccins"},
    {k:"contrat",l:"Contrat et avenants",ic:"📄",n:"Contrat complet"},
    {k:"portfolio",l:"Portfolio pédagogique",ic:"🎨",n:D.portfolio.filter(p=>p.eId===enfant?.id).length+" activités"},
    {k:"factures",l:"Historique facturation",ic:"🧾",n:"3 factures"},
  ];

  return <div className="fi">
    {toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
    <PageHeader icon="📦" title="Export des données" sub="Dossier complet d'un enfant — départ ou archivage"/>
    {role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
      {liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>setSelId(e.id)}/>)}</div>}

    <div className="g2">
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {/* Sélection des données */}
        <div className="card"style={{padding:16}}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:12,color:"var(--b)"}}>📋 Données à inclure</div>
          {sections.map(s=><div key={s.k}onClick={()=>toggle(s.k)}
            style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid var(--br)",cursor:"pointer"}}>
            <div style={{display:"flex",gap:10,alignItems:"center"}}>
              <div style={{width:20,height:20,borderRadius:5,border:"2px solid",borderColor:inclure[s.k]?"var(--S)":"var(--br)",background:inclure[s.k]?"var(--S)":"transparent",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .15s"}}>
                {inclure[s.k]&&<span style={{color:"#fff",fontSize:12}}>✓</span>}
              </div>
              <span style={{fontSize:16}}>{s.ic}</span>
              <div>
                <div style={{fontSize:13,fontWeight:600,color:"var(--b)"}}>{s.l}</div>
                <div style={{fontSize:11,color:"var(--l)"}}>{s.n}</div>
              </div>
            </div>
          </div>)}
        </div>

        {/* Format */}
        <div className="card"style={{padding:16}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:10,color:"var(--b)"}}>Format d'export</div>
          <div style={{display:"flex",gap:8}}>
            {[["pdf","PDF"],["csv","CSV"],["json","JSON"]].map(([k,l])=>
              <button key={k}onClick={()=>setFormat(k)}className={"btn "+(format===k?"bT":"bG")}style={{flex:1,justifyContent:"center",fontSize:12}}>{l}</button>)}
          </div>
        </div>
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {/* Récapitulatif */}
        <div className="card"style={{padding:18,background:"var(--c)",border:"2px solid var(--br)"}}>
          <div style={{fontSize:40,textAlign:"center",marginBottom:8}}>{enfant?.emoji}</div>
          <div className="pf"style={{textAlign:"center",fontSize:18,fontWeight:600,color:"var(--b)",marginBottom:4}}>{enfant?.prenom} {enfant?.nom}</div>
          <div style={{textAlign:"center",fontSize:12,color:"var(--l)",marginBottom:14}}>{age(enfant?.naissance||"")} · {enfant?.contrat?.debut} → {enfant?.contrat?.fin}</div>
          <div style={{background:"var(--w)",borderRadius:10,padding:12,marginBottom:14}}>
            <div style={{fontSize:12,color:"var(--m)",marginBottom:4,fontWeight:600}}>Contenu de l'export :</div>
            {sections.filter(s=>inclure[s.k]).map(s=><div key={s.k}style={{fontSize:12,color:"var(--b)",padding:"2px 0"}}>✓ {s.l}</div>)}
          </div>
          <button className="btn bT"style={{width:"100%",justifyContent:"center",padding:"12px",fontSize:14}}onClick={exporter}>
            ⬇️ Exporter le dossier {format.toUpperCase()}
          </button>
        </div>

        {/* Info RGPD */}
        <div className="card"style={{padding:14,background:"var(--Bp)",border:"1px solid rgba(46,95,138,.25)"}}>
          <div style={{fontWeight:700,fontSize:12,color:"var(--B)",marginBottom:6}}>🔒 Conformité RGPD</div>
          <div style={{fontSize:12,color:"var(--b)",lineHeight:1.6}}>
            Les données sont exportées de façon sécurisée et chiffrée. Vous êtes responsable de leur conservation après export. À conserver 5 ans minimum conformément au droit du travail.
          </div>
        </div>
      </div>
    </div>
  </div>;
}

// ─── COMMUNICATION PMI ────────────────────────────────────────────────────────
const PMI_MESSAGES=[
  {id:"pmi1",de:"PMI",h:"09h15",date:new Date(Date.now()-7*86400000).toISOString().slice(0,10),txt:"Bonjour Madame Dupont, nous organisons une réunion d'information le 15 avril à 14h à la mairie. Votre présence est souhaitée.",lu:true},
  {id:"pmi2",de:"asmat",h:"10h30",date:new Date(Date.now()-7*86400000).toISOString().slice(0,10),txt:"Bonjour, je confirme ma présence le 15 avril. Merci pour l'invitation.",lu:true},
  {id:"pmi3",de:"PMI",h:"14h20",date:new Date(Date.now()-2*86400000).toISOString().slice(0,10),txt:"Votre agrément arrive à renouvellement en juin 2024. Merci de nous contacter pour planifier la visite de renouvellement.",lu:false},
];

function CommunicationPMI({role}){
  const [msgs,setMsgs]=useState(PMI_MESSAGES);
  const [txt,setTxt]=useState("");
  const [toast,setToast]=useState("");
  const nonLus=msgs.filter(m=>!m.lu&&m.de==="PMI").length;
  const pmiEmail="pmi75-paris@sante.gouv.fr";
  const asmatEmail="marie.dupont@timat.fr";

  const markRead=(id)=>setMsgs(p=>p.map(m=>m.id===id?{...m,lu:true}:m));

  const send=()=>{if(!txt.trim())return;
    setMsgs(p=>[...p,{id:"pm"+Date.now(),de:"asmat",h:TODAY_H,date:TODAY_STR,txt,lu:true,email:asmatEmail}]);
    setTxt("");
    setToast("Message envoyé par email à "+pmiEmail+" ✓");
  };

  return <div className="fi">
    {toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
    <PageHeader icon="🏛️" title="Communication PMI" sub="Protection Maternelle et Infantile — échanges par email"/>

    {/* Explication du fonctionnement */}
    <div style={{background:"var(--Bp)",border:"1px solid var(--B)",borderRadius:12,padding:"12px 16px",marginBottom:16,fontSize:13,color:"var(--B)",lineHeight:1.6}}>
      <strong>📧 Fonctionnement :</strong> vos messages sont envoyés par email à la PMI ({pmiEmail}). 
      Leurs réponses arrivent automatiquement ici. Vous apparaissez comme expéditeur : {asmatEmail}.
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
              borderLeft:`3px solid ${m.de==="PMI"?"var(--B)":"var(--T)"}`,
              opacity:m.lu?1:.95,boxShadow:!m.lu&&m.de==="PMI"?"0 0 0 2px var(--B)":"none"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{fontSize:11,fontWeight:700,color:m.de==="PMI"?"var(--B)":"var(--T)"}}>
                  {m.de==="PMI"?"🏛️ PMI":"👩‍👧 Marie"}
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
          <div style={{fontSize:11,color:"var(--l)"}}>Répondre à la PMI — sera envoyé à {pmiEmail}</div>
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
            ⚠️ Renouvellement à prévoir dans 2 mois — contacter la PMI
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

// ─── MODE HORS-LIGNE ──────────────────────────────────────────────────────────
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
      :"Hors ligne — les données sont sauvegardées localement"}
    {!online&&<button onClick={sync}style={{marginLeft:"auto",background:"none",border:"1px solid #FCD34D",color:"#92400E",borderRadius:6,padding:"3px 8px",cursor:"pointer",fontSize:11}}>
      Réessayer
    </button>}
  </div>;
}

// ─── JOURNAL AVEC BILANS (Journal + Bilan + CR fusionnés) ────────────────────
function JournalAvecBilans({enfant,liste,role,pEId}){
  const [sousSec,setSousSec]=useState("messages");
  if(role!=="asmat") return <TransmissionsContent enfant={enfant}role={role}/>;
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
    {sousSec==="messages"&&<TransmissionsContent enfant={enfant}role={role}/>}
    {sousSec==="bilan"&&<RecitIA enfants={liste}role={role}pEId={enfant?.id}/>}
    {sousSec==="cr"&&<CompteRenduTrimestriel enfants={liste}role={role}pEId={enfant?.id}/>}
  </div>;
}

// ─── JOURNAL COMPLET (Journal + Repas + Sommeil + Activités) ─────────────────
function JournalComplet({enfants,role,pEId}){
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
    {sec==="journal"&&<JournalAvecBilans enfant={enfant}liste={liste}role={role}pEId={selId}/>}
    {sec==="repas"&&<RepasChanges enfants={liste}role={role}pEId={selId}/>}
    {sec==="sommeil"&&<Sommeil enfants={liste}role={role}pEId={selId}/>}
    {sec==="activites"&&<ActivitesSuggerees enfants={liste}role={role}pEId={selId}/>}
  </div>;
}

// ─── SANTÉ COMPLÈTE (Santé + Croissance) ─────────────────────────────────────
function SanteComplete({enfants,role,pEId}){
  const [selId,setSelId]=useState(enfants[0]?.id);
  const [sec,setSec]=useState("sante");
  const liste=role==="parent"?enfants.filter(e=>e.id===pEId):enfants;
  return <div className="fi">
    {role==="asmat"&&<div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
      {liste.map(e=><CPill key={e.id}e={e}sel={selId===e.id}onClick={()=>setSelId(e.id)}/>)}
    </div>}
    <div style={{display:"flex",gap:2,marginBottom:16,borderBottom:"2px solid var(--br)"}}>
      {[{id:"sante",l:"Santé",ic:"🏥"},{id:"croissance",l:"Croissance",ic:"📏"}].map(s=>
        <button key={s.id}onClick={()=>setSec(s.id)}style={{
          padding:"7px 16px",border:"none",background:"none",cursor:"pointer",
          fontFamily:"'DM Sans',sans-serif",fontWeight:600,fontSize:12,
          color:sec===s.id?"var(--R)":"var(--l)",
          borderBottom:sec===s.id?"2px solid var(--R)":"2px solid transparent",
          marginBottom:-2,transition:"all .15s",display:"flex",alignItems:"center",gap:5
        }}><span>{s.ic}</span><span>{s.l}</span></button>
      )}
    </div>
    {sec==="sante"&&<Sante enfants={liste}role={role}pEId={selId}/>}
    {sec==="croissance"&&<CourbeCroissance enfants={liste}role={role}pEId={selId}/>}
  </div>;
}

// ─── ÉVEIL COMPLET (Portfolio + Développement) ────────────────────────────────
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

// ─── DOCUMENTS COMPLET (Documents + Export) ───────────────────────────────────
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

// ─── STRUCTURE DE NAVIGATION 2 NIVEAUX ───────────────────────────────────────
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
    {id:"messagerie",l:"Messagerie",ic:"💬"},
    {id:"pmi",l:"PMI",ic:"🏛️"},
    {id:"admin_finances",l:"Facturation & Bilans",ic:"🧾"},
    {id:"documents_complet",l:"Documents",ic:"🗂️"},
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
    {id:"admin_finances",l:"Facturation & Bilans",ic:"🧾"},
    {id:"documents_complet",l:"Documents",ic:"🗂️"},
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
            {notifs.map(n=><div key={n.id}onClick={()=>{
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
        <Av t={ini(user.prenom,user.nom)}c={user.couleur}s={30}/>
        <span style={{fontWeight:600,fontSize:13,color:"var(--b)"}}>{user.prenom}</span>
        <button onClick={onLogout}style={{background:"none",border:"none",cursor:"pointer",fontSize:16,marginLeft:4}}title="Déconnexion">🚪</button>
      </div>
    </div>

    {/* Barre principale — 3 gros onglets */}
    <div className="nav-main"style={{
      background:"var(--w)",borderBottom:"1px solid var(--br)",
      display:"flex",gap:2,padding:"0 12px",height:50,alignItems:"center",
    }}>
      {Object.entries(groups).map(([key,g])=>{
        const isActive=activeGroup===key;
        const hasAdminBadge=key==="admin"&&pmiNonLus>0;
        return <button key={key}onClick={()=>onGroupClick(key)}style={{
          display:"flex",alignItems:"center",gap:7,
          padding:"8px 18px",borderRadius:10,border:"none",
          fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:14,
          cursor:"pointer",transition:"all .2s",flexShrink:0,whiteSpace:"nowrap",
          background:isActive?g.color:"transparent",
          color:isActive?"#fff":"var(--m)",
          boxShadow:isActive?"0 2px 10px rgba(0,0,0,.18)":"none",
          transform:isActive?"scale(1.02)":"scale(1)",
          position:"relative",
        }}>
          <span style={{fontSize:18}}>{g.ic}</span>
          <span>{g.l}</span>
          {g.subs&&<span style={{fontSize:10,opacity:.7,marginLeft:2}}>{isActive?"▲":"▼"}</span>}
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
      background:"var(--c)",borderBottom:"2px solid var(--br)",
      display:"flex",gap:2,padding:"6px 12px",overflowX:"auto",
      scrollbarWidth:"none",flexShrink:0,alignItems:"center",
    }}>
      {subs.map(s=>{
        const isSubActive=page===s.id;
        const hasPmiBadge=s.id==="pmi"&&pmiNonLus>0;
        return <button key={s.id}onClick={()=>setPage(s.id)}style={{
          display:"flex",alignItems:"center",gap:5,
          padding:"6px 14px",borderRadius:8,border:"none",
          fontFamily:"'DM Sans',sans-serif",fontWeight:isSubActive?700:500,fontSize:12.5,
          cursor:"pointer",transition:"all .15s",flexShrink:0,whiteSpace:"nowrap",
          background:isSubActive?group.color+"18":"transparent",
          color:isSubActive?group.color:"var(--m)",
          borderBottom:isSubActive?`2px solid ${group.color}`:"2px solid transparent",
          marginBottom:-2,position:"relative",
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

// ─── LANDING PAGE ─────────────────────────────────────────────────────────────
function LandingPage({onLogin,dark,setDark}){
  const [showLogin,setShowLogin]=useState(false);
  const [email,setEmail]=useState("");const [err,setErr]=useState("");
  const comptes=[
    {...D.asmat,label:"Marie Dupont (AssMat)",hint:"marie.dupont@mail.fr"},
    {...D.parents[0],label:"Sophie Martin — Léo",hint:"sophie.martin@mail.fr"},
    {...D.parents[1],label:"Thomas Bernard — Emma",hint:"thomas.bernard@mail.fr"},
    {...D.parents[2],label:"Camille Petit — Noah",hint:"camille.petit@mail.fr"},
  ];
  const tenter=()=>{const c=comptes.find(x=>x.email===email.trim().toLowerCase());
    if(c)onLogin(c);else setErr("Email non reconnu.");};

  const feats=[
    {ic:"✨",t:"Bilan de journée automatique",d:"Rédigé en un clic, envoyé aux parents par message"},
    {ic:"📝",t:"CR Trimestriel professionnel",d:"4 parties, prêt à imprimer ou à envoyer par email"},
    {ic:"🏛️",t:"Pajemploi intégré",d:"Export direct des données pour la déclaration URSSAF"},
    {ic:"📑",t:"Attestation fiscale automatique",d:"Crédit d'impôt 50% calculé et généré en un clic"},
    {ic:"📸",t:"Journal photo partagé",d:"Les parents voient les photos du jour en temps réel"},
    {ic:"📊",t:"Tableau de bord analytique",d:"Courbes d'humeurs, sommeil, heures sur le mois"},
    {ic:"✍️",t:"Signature électronique",d:"Contrats signés en ligne, conformes eIDAS"},
    {ic:"🏥",t:"Suivi médical complet",d:"Vaccins, allergies, courbe poids/taille OMS"},
    {ic:"🏛️",t:"Communication PMI par email",d:"Échangez avec votre PMI directement depuis l'app"},
  ];

  return <div style={{minHeight:"100vh",background:"var(--c)",overflowX:"hidden"}}>
    {/* Hero */}
    <div style={{
      background:"linear-gradient(135deg,#2C1F14 0%,#4A2E1A 50%,#B8622F 100%)",
      padding:"0 20px 60px",position:"relative",overflow:"hidden"
    }}>
      {/* Nav */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"20px 0",maxWidth:900,margin:"0 auto"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div className="pf"style={{fontSize:26,fontWeight:600,color:"#fff",fontStyle:"italic"}}>TiMat</div>
          <div style={{width:5,height:5,borderRadius:"50%",background:"#B8622F",marginBottom:2}}/>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <button onClick={()=>setDark&&setDark(d=>!d)}style={{background:"rgba(255,255,255,.1)",border:"none",color:"#fff",padding:"6px 10px",borderRadius:8,cursor:"pointer",fontSize:14}}>
            {dark?"☀️":"🌙"}
          </button>
          <button onClick={()=>setShowLogin(true)}className="btn"style={{background:"rgba(255,255,255,.15)",color:"#fff",border:"1px solid rgba(255,255,255,.3)"}}>
            Connexion
          </button>
          <button onClick={()=>setShowLogin(true)}className="btn bT">Essayer gratuitement →</button>
        </div>
      </div>
      {/* Titre */}
      <div style={{maxWidth:700,margin:"40px auto 0",textAlign:"center"}}>
        <div style={{display:"inline-block",background:"rgba(255,255,255,.1)",borderRadius:20,padding:"5px 16px",fontSize:12,color:"rgba(255,255,255,.8)",marginBottom:16,fontWeight:600,letterSpacing:".5px"}}>
          🇫🇷 CONÇU POUR LES ASSISTANTES MATERNELLES FRANÇAISES
        </div>
        <div className="pf"style={{fontSize:"clamp(32px,6vw,58px)",fontWeight:700,color:"#fff",lineHeight:1.15,marginBottom:16,fontStyle:"italic"}}>
          L'app qui réinvente<br/>votre quotidien
        </div>
        <div style={{fontSize:"clamp(15px,2.5vw,18px)",color:"rgba(255,255,255,.75)",lineHeight:1.7,marginBottom:28,maxWidth:560,margin:"0 auto 28px"}}>
          Bilans de journée automatiques, suivi des enfants, administratif simplifié. 
          Tout ce dont une assistante maternelle a besoin, dans une seule app élégante.
        </div>
        <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
          <button onClick={()=>setShowLogin(true)}className="btn bT"style={{fontSize:15,padding:"13px 28px"}}>
            Essayer la démo →
          </button>
          <button onClick={()=>document.getElementById('features')?.scrollIntoView({behavior:'smooth'})}
            className="btn"style={{background:"rgba(255,255,255,.1)",color:"#fff",border:"1px solid rgba(255,255,255,.3)",fontSize:15,padding:"13px 28px"}}>
            Voir les fonctionnalités
          </button>
        </div>
      </div>
      {/* Badge concurrents */}
      <div style={{display:"flex",gap:10,justifyContent:"center",marginTop:32,flexWrap:"wrap"}}>
        {["✅ Plus complet que Kidizz","✅ Plus intelligent que Noé","✅ Bilans IA exclusifs","✅ Communication PMI intégrée"].map(t=>
          <span key={t}style={{background:"rgba(255,255,255,.1)",borderRadius:20,padding:"5px 14px",fontSize:11,color:"rgba(255,255,255,.85)",fontWeight:600}}>{t}</span>
        )}
      </div>
    </div>

    {/* Features */}
    <div id="features"style={{maxWidth:900,margin:"0 auto",padding:"60px 20px"}}>
      <div style={{textAlign:"center",marginBottom:40}}>
        <div className="pf"style={{fontSize:34,fontWeight:600,color:"var(--b)",marginBottom:8}}>Tout ce que vous attendiez</div>
        <div style={{fontSize:15,color:"var(--l)",maxWidth:500,margin:"0 auto"}}>
          TiMat regroupe tout ce dont vous avez besoin au quotidien. Aucun concurrent ne propose autant.
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:14}}>
        {feats.map((f,i)=><div key={i}className="card"style={{padding:18,borderTop:`3px solid var(--T)`}}>
          <div style={{fontSize:28,marginBottom:10}}>{f.ic}</div>
          <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:6}}>{f.t}</div>
          <div style={{fontSize:12,color:"var(--m)",lineHeight:1.6}}>{f.d}</div>
        </div>)}
      </div>
    </div>

    {/* Social proof */}
    <div style={{background:"var(--Tp)",padding:"40px 20px"}}>
      <div style={{maxWidth:700,margin:"0 auto",textAlign:"center"}}>
        <div className="pf"style={{fontSize:22,fontWeight:600,color:"var(--b)",marginBottom:24,fontStyle:"italic"}}>
          "Enfin une app qui comprend notre métier"
        </div>
        <div style={{display:"flex",gap:16,justifyContent:"center",flexWrap:"wrap"}}>
          {[
            {nom:"Marie D.",ville:"Paris 15e",txt:"Le bilan de journée automatique a changé ma relation avec les parents. Ils adorent !"},
            {nom:"Sylvie R.",ville:"Lyon",txt:"L'export Pajemploi me fait économiser 2h par mois. Je ne peux plus m'en passer."},
            {nom:"Fatima B.",ville:"Bordeaux",txt:"Le suivi de croissance et les jalons OMS me permettent d'être vraiment professionnelle."},
          ].map((t,i)=><div key={i}className="card"style={{padding:16,maxWidth:200,textAlign:"left"}}>
            <div style={{fontSize:12,color:"var(--m)",lineHeight:1.6,marginBottom:10,fontStyle:"italic"}}>"{t.txt}"</div>
            <div style={{fontSize:12,fontWeight:700,color:"var(--b)"}}>{t.nom}</div>
            <div style={{fontSize:11,color:"var(--l)"}}>{t.ville}</div>
          </div>)}
        </div>
      </div>
    </div>

    {/* CTA final */}
    <div style={{textAlign:"center",padding:"50px 20px"}}>
      <div className="pf"style={{fontSize:28,fontWeight:600,color:"var(--b)",marginBottom:12}}>Prêt à essayer ?</div>
      <div style={{fontSize:14,color:"var(--l)",marginBottom:24}}>Démo gratuite, aucune inscription requise</div>
      <button onClick={()=>setShowLogin(true)}className="btn bT"style={{fontSize:15,padding:"13px 28px"}}>
        Accéder à la démo →
      </button>
    </div>

    {/* Modale Login */}
    {showLogin&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:20}}
      onClick={e=>e.target===e.currentTarget&&setShowLogin(false)}>
      <div className="card"style={{width:"100%",maxWidth:400,padding:28}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div className="pf"style={{fontSize:20,fontWeight:600,color:"var(--b)"}}>Connexion démo</div>
          <button onClick={()=>setShowLogin(false)}style={{background:"none",border:"none",fontSize:18,cursor:"pointer",color:"var(--l)"}}>✕</button>
        </div>
        <label className="lbl">Email</label>
        <input className="inp"type="email"placeholder="votre@email.fr"value={email}
          onChange={e=>{setEmail(e.target.value);setErr("");}}
          onKeyDown={e=>e.key==="Enter"&&tenter()}
          style={{marginBottom:err?6:14}}/>
        {err&&<div style={{color:"var(--R)",fontSize:12,marginBottom:10}}>{err}</div>}
        <button className="btn bT"style={{width:"100%",justifyContent:"center",marginBottom:16}}onClick={tenter}>
          Se connecter →
        </button>
        <div style={{background:"var(--c)",borderRadius:10,padding:12}}>
          <div style={{fontSize:11,fontWeight:700,color:"var(--l)",marginBottom:8,textTransform:"uppercase",letterSpacing:".5px"}}>Comptes démo</div>
          {comptes.map(c=><button key={c.id}onClick={()=>{setEmail(c.email);setErr("");}}
            style={{display:"block",width:"100%",textAlign:"left",padding:"7px 10px",background:"none",border:"none",cursor:"pointer",borderRadius:8,transition:"background .15s"}}
            onMouseEnter={e=>e.currentTarget.style.background="var(--br)"}
            onMouseLeave={e=>e.currentTarget.style.background="none"}>
            <span style={{fontWeight:700,color:c.role==="asmat"?"var(--T)":"var(--B)"}}>{c.role==="asmat"?"👩‍👧":"👪"}</span> {c.label}
            <span style={{fontSize:11,color:"var(--l)",display:"block",paddingLeft:18}}>{c.hint}</span>
          </button>)}
        </div>
      </div>
    </div>}
  </div>;
}

// ─── ONBOARDING ───────────────────────────────────────────────────────────────
const ONBOARD_STEPS=[
  {ic:"🌿",t:"Bienvenue sur TiMat !",d:"L'app tout-en-un pour les assistantes maternelles. Voici un tour rapide de 30 secondes pour démarrer.",btn:"C'est parti !"},
  {ic:"👶",t:"Vos enfants au centre",d:"Dans l'onglet L'enfant → Pointage, gérez les arrivées et départs. Dans Journal, rédigez les transmissions et générez les bilans de journée automatiquement.",btn:"Suivant →"},
  {ic:"✨",t:"Bilan IA exclusif",d:"Cliquez sur Journal → Journal & Bilans → Bilan du jour. En un clic, TiMat rédige un bilan chaleureux à envoyer aux parents. Exclusivité absolue.",btn:"Suivant →"},
  {ic:"🧾",t:"Administratif simplifié",d:"Dans Administratif → Facturation & Bilans, calculez votre salaire automatiquement et exportez vers Pajemploi. L'attestation fiscale est générée en un clic.",btn:"Suivant →"},
  {ic:"🏛️",t:"Communication PMI",d:"Dans Administratif → PMI, échangez directement avec votre PMI par email. Vos messages sont envoyés depuis votre adresse professionnelle TiMat.",btn:"Terminer et découvrir TiMat 🎉"},
];

function Onboarding({onFinish,user}){
  const [step,setStep]=useState(0);
  const s=ONBOARD_STEPS[step];
  const isLast=step===ONBOARD_STEPS.length-1;
  return <div style={{minHeight:"100vh",background:"var(--c)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
    <div style={{width:"100%",maxWidth:460}}>
      {/* Progress */}
      <div style={{display:"flex",gap:6,marginBottom:32,justifyContent:"center"}}>
        {ONBOARD_STEPS.map((_,i)=><div key={i}style={{
          height:4,borderRadius:2,flex:1,maxWidth:60,
          background:i<=step?"var(--T)":"var(--br)",
          transition:"background .3s"
        }}/>)}
      </div>
      <div className="card"style={{padding:36,textAlign:"center"}}>
        <div style={{fontSize:56,marginBottom:16}}>{s.ic}</div>
        <div className="pf"style={{fontSize:24,fontWeight:600,color:"var(--b)",marginBottom:12}}>{s.t}</div>
        <div style={{fontSize:14,color:"var(--m)",lineHeight:1.8,marginBottom:28}}>{s.d}</div>
        <button className="btn bT"style={{width:"100%",justifyContent:"center",fontSize:14,padding:"13px"}}
          onClick={()=>isLast?onFinish():setStep(s=>s+1)}>
          {s.btn}
        </button>
        {!isLast&&<button onClick={onFinish}style={{marginTop:12,background:"none",border:"none",fontSize:12,color:"var(--l)",cursor:"pointer"}}>
          Passer le tutoriel
        </button>}
      </div>
      <div style={{textAlign:"center",marginTop:16,fontSize:12,color:"var(--l)"}}>
        {step+1} / {ONBOARD_STEPS.length}
      </div>
    </div>
  </div>;
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function Login({onLogin}){
  const [email,setEmail]=useState("");const [err,setErr]=useState("");
  const comptes=[
    {...D.asmat,label:"Marie Dupont (AssMat)",hint:"marie.dupont@mail.fr"},
    {...D.parents[0],label:"Sophie Martin — Léo",hint:"sophie.martin@mail.fr"},
    {...D.parents[1],label:"Thomas Bernard — Emma",hint:"thomas.bernard@mail.fr"},
    {...D.parents[2],label:"Camille Petit — Noah",hint:"camille.petit@mail.fr"},
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

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App(){
  const [user,setUser]=useState(null);
  const [page,setPage]=useState("accueil");
  const [dark,setDark]=useState(false);
  const [pmiNonLus,setPmiNonLus]=useState(PMI_MESSAGES.filter(m=>!m.lu&&m.de==="PMI").length);
  const [notifs,setNotifs]=useState([
    {id:"n1",ic:"📬",txt:"Nouveau message de la PMI",date:TODAY_STR,lu:false,page:"pmi"},
    {id:"n2",ic:"✍️",txt:"Contrat de Noah en attente de signature",date:TODAY_STR,lu:false,page:"admin_finances"},
    {id:"n3",ic:"🎂",txt:"Anniversaire de Léo dans 3 jours",date:TODAY_STR,lu:true,page:"calendrier"},
  ]);
  const [showNotifs,setShowNotifs]=useState(false);
  const [onboarded,setOnboarded]=useState(false);
  const [onboardStep,setOnboardStep]=useState(0);
  const notifNonLus=notifs.filter(n=>!n.lu).length;

  if(!user)return <><Styles/><div className={`app${dark?" dark":""}`}><LandingPage onLogin={u=>{setUser(u);setPage("accueil");}} dark={dark} setDark={setDark}/></div></>;
  if(!onboarded&&user.role==="asmat")return <><Styles/><div className={`app${dark?" dark":""}`}><Onboarding onFinish={()=>setOnboarded(true)} user={user}/></div></>;

  const role=user.role;
  const enfants=role==="asmat"?D.enfants:D.enfants.filter(e=>e.parentId===user.id);
  const pEId=enfants[0]?.id;
  const groups=role==="asmat"?GROUPS_AM:GROUPS_P;
  const P={enfants,role,pEId};

  const renderPage=()=>{
    switch(page){
      case "accueil": return role==="asmat"?<AccueilAssMat enfants={enfants} setPage={setPage}/>:<AccueilParent enfant={enfants[0]} setPage={setPage}/>;
      // Nouveaux onglets fusionnés
      case "journal_complet": return <JournalComplet {...P}/>;
      case "sante_complet": return <SanteComplete {...P}/>;
      case "eveil_complet": return <EveilComplet {...P}/>;
      case "documents_complet": return <DocumentsComplet {...P}/>;
      case "admin_finances": return <AdminFinances {...P}/>;
      case "pointage": return <Pointage {...P}/>;
      case "calendrier": return <Calendrier enfants={enfants} role={role}/>;
      case "messagerie": return <Messagerie {...P}/>;
      case "pmi": return <CommunicationPMI role={role}/>;
      // Legacy
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
      case "facturation": return <AdminFinances {...P}/>;
      case "contrats": return <AdminFinances {...P}/>;
      case "recap": return <AdminFinances {...P}/>;
      case "dashboard": return <TableauDeBord enfants={enfants} role={role} pEId={pEId} setPage={setPage}/>;      default: return role==="asmat"?<AccueilAssMat enfants={enfants} setPage={setPage}/>:<AccueilParent enfant={enfants[0]} setPage={setPage}/>;
    }
  };

  return(
    <>
      <Styles/>
      <div className={`app${dark?" dark":""}`}>
        <TopBar role={role} groups={groups} page={page} setPage={setPage} user={user}
          onLogout={()=>{setUser(null);setPage("accueil");setOnboarded(false);}}
          pmiNonLus={pmiNonLus} dark={dark} setDark={setDark}
          notifNonLus={notifNonLus} notifs={notifs} setNotifs={setNotifs}
          showNotifs={showNotifs} setShowNotifs={setShowNotifs} setPage2={setPage}/>
        <BandeauHorsLigne/>
        <div className="content">{renderPage()}</div>
      </div>
    </>
  );
}
