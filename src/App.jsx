import { useState, useRef, useEffect } from "react";
import { supabase, seConnecter, seDeconnecter, getSession, getProfil, inscrireAsmat, inscrireParent } from "../lib/supabase.js";
// ─── IMPORT DES COMPOSANTS RGPD ─────────────────────────────────────────────
import { ConsentementRGPD, SupprimerCompte } from "./composants-rgpd";

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
      --c:#181210;--w:#231A15;--b:#F5EDE3;--m:#D4B090;--l:#9A7860;--br:#4A3828;
      --Tp:#3A2218;--Sp:#1A2E1E;--Gp:#2E2410;--Bp:#182030;--Rp:#301420;--Pp:#22183A;
      --T:#E07848;--S:#5A9A6E;--G:#D4A840;--B:#4A80B8;--R:#D4607A;--P:#8A5AAE;
      --sh:0 1px 3px rgba(0,0,0,.4),0 4px 16px rgba(0,0,0,.5);
      --sh2:0 2px 8px rgba(0,0,0,.5),0 12px 40px rgba(0,0,0,.6);
    }
    .dark .topbar,.dark .nav-main,.dark .navtabs{background:rgba(28,20,16,.96)!important}
    .dark .app::before{opacity:.2}
    .dark .card{border-color:#4A3828}
    .dark .inp,.dark .ta,.dark .sel{background:#2E2420;border-color:#4A3828;color:#F5EDE3}
    .dark .lbl{color:#B89880}

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
          onMouseLeave={ev2=>ev2.currentTarget.style.background="none"}>
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

// ... (Gardons le reste du code identique jusqu'à Paramètres et LandingPage) ...

// ─── PAGE PARAMÈTRES ──────────────────────────────────────────────────────────
function Parametres({user,onLogout,setPage}){
  const [toast,setToast]=useState("");
  return <div className="fi">
    {toast&&<Toast msg={toast}onClose={()=>setToast("")}/>}
    <PageHeader icon="⚙️" title="Paramètres" sub="Votre compte et vos données"/>
    <div style={{maxWidth:600,margin:"0 auto",display:"flex",flexDirection:"column",gap:16}}>

      {/* Profil */}
      <div className="card"style={{padding:20}}>
        <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:14}}>👤 Mon profil</div>
        {[["Prénom",user?.prenom||"—"],["Nom",user?.nom||"—"],["Email",user?.email||"—"],["Rôle",user?.role==="asmat"?"Assistante maternelle":"Parent"]].map(([l,v])=>
          <div key={l}style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid var(--br)",fontSize:13}}>
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
          ✅ Vos données sont hébergées en France · Jamais vendues · Supprimables à tout moment
        </div>
      </div>

      {/* Déconnexion */}
      <div className="card"style={{padding:20}}>
        <div style={{fontWeight:700,fontSize:14,color:"var(--b)",marginBottom:14}}>🚪 Session</div>
        <button className="btn bG"style={{width:"100%",justifyContent:"center"}}onClick={onLogout}>
          Se déconnecter
        </button>
      </div>

      {/* ZONE DE DANGER - SUPPRESSION RGPD */}
      <div className="mt-10 border-t pt-5">
        <h3 className="text-red-600 mb-4 font-bold">Zone de danger (RGPD)</h3>
        <SupprimerCompte onDeleted={onLogout}/>
      </div>
    </div>
  </div>;
}

// ─── LANDING PAGE ─────────────────────────────────────────────────────────────
function LandingPage({onLogin,dark,setDark}){
  const [showLogin,setShowLogin]=useState(false);
  const [mode,setMode]=useState("connexion");
  const [form,setForm]=useState({email:"",password:"",prenom:"",nom:"",role:"asmat"});
  const [err,setErr]=useState("");
  const [loading,setLoading]=useState(false);
  const [consentRGPD,setConsentRGPD]=useState(false); // État pour la case à cocher

  // Comptes démo
  const demos=[
    {...D.asmat,label:"Marie Dupont (AssMat)",hint:"marie.dupont@mail.fr"},
    {...D.parents[0],label:"Sophie Martin — Léo",hint:"sophie.martin@mail.fr"},
    {...D.parents[1],label:"Thomas Bernard — Emma",hint:"thomas.bernard@mail.fr"},
    {...D.parents[2],label:"Camille Petit — Noah",hint:"camille.petit@mail.fr"},
  ];

  const connexion=async()=>{
    if(!form.email||!form.password){setErr("Email et mot de passe requis.");return;}
    setLoading(true);setErr("");
    try{
      const{data,error}=await supabase.auth.signInWithPassword({email:form.email,password:form.password});
      if(error){
        const demo=demos.find(d=>d.email===form.email.trim().toLowerCase());
        if(demo){onLogin(demo);}
        else{setErr("Email ou mot de passe incorrect.");}
      }else if(data?.user){
        const{data:profil}=await supabase.from("profiles").select("*").eq("id",data.user.id).single();
        if(profil)onLogin({...profil,id:data.user.id,email:data.user.email});
      }
    }catch(e){setErr("Erreur de connexion.");}
    setLoading(false);
  };

  const inscription=async()=>{
    if(!form.email||!form.password||!form.prenom){setErr("Remplis tous les champs.");return;}
    if(!consentRGPD){setErr("Veuillez accepter la politique de confidentialité.");return;}
    setLoading(true);setErr("");
    try{
      const{data,error}=await supabase.auth.signUp({
        email:form.email,password:form.password,
        options:{data:{role:form.role,prenom:form.prenom,nom:form.nom}}
      });
      if(error){setErr(error.message);}
      else if(data?.user){
        setMode("connexion");
        setErr("✅ Compte créé ! Connecte-toi.");
      }
    }catch(e){setErr("Erreur lors de l'inscription.");}
    setLoading(false);
  };

  return <div style={{minHeight:"100vh",background:"var(--c)",overflowX:"hidden"}}>
    {/* ... (Reste de la landing page inchangé) ... */}
    
    {/* Modale Auth */}
    {showLogin&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:20}}
      onClick={e=>e.target===e.currentTarget&&setShowLogin(false)}>
      <div className="card"style={{width:"100%",maxWidth:420,padding:28,maxHeight:"90vh",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div className="pf"style={{fontSize:20,fontWeight:600,color:"var(--b)"}}>
            {mode==="connexion"?"Connexion":"Créer un compte"}
          </div>
          <button onClick={()=>setShowLogin(false)}style={{background:"none",border:"none",fontSize:18,cursor:"pointer",color:"var(--l)"}}>✕</button>
        </div>

        <div style={{display:"flex",marginBottom:20,borderBottom:"2px solid var(--br)"}}>
          {["connexion","inscription"].map(m=><button key={m}onClick={()=>{setMode(m);setErr("");}}style={{
            flex:1,padding:"8px",border:"none",background:"none",cursor:"pointer",
            fontFamily:"'DM Sans',sans-serif",fontWeight:600,fontSize:13,
            color:mode===m?"var(--T)":"var(--l)",
            borderBottom:mode===m?"2px solid var(--T)":"2px solid transparent",
            marginBottom:-2,transition:"all .15s"
          }}>{m==="connexion"?"Se connecter":"Créer un compte"}</button>)}
        </div>

        {mode==="inscription"&&<>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            <div><label className="lbl">Prénom *</label><input className="inp"value={form.prenom}onChange={e=>setForm(f=>({...f,prenom:e.target.value}))}/></div>
            <div><label className="lbl">Nom</label><input className="inp"value={form.nom}onChange={e=>setForm(f=>({...f,nom:e.target.value}))}/></div>
          </div>
          <div style={{marginBottom:10}}>
            <label className="lbl">Je suis *</label>
            <select className="sel"value={form.role}onChange={e=>setForm(f=>({...f,role:e.target.value}))}>
              <option value="asmat">👩‍👧 Assistante maternelle</option>
              <option value="parent">👪 Parent</option>
            </select>
          </div>
        </>}

        <div style={{marginBottom:10}}>
          <label className="lbl">Email *</label>
          <input className="inp"type="email"value={form.email}onChange={e=>setForm(f=>({...f,email:e.target.value}))}/>
        </div>
        <div style={{marginBottom:14}}>
          <label className="lbl">Mot de passe *</label>
          <input className="inp"type="password"value={form.password}onChange={e=>setForm(f=>({...f,password:e.target.value}))}/>
        </div>

        {/* AJOUT DE LA CASE RGPD À L'INSCRIPTION */}
        {mode === "inscription" && (
          <div className="mb-4">
            <ConsentementRGPD onChecked={(val) => setConsentRGPD(val)} />
          </div>
        )}

        {err&&<div style={{color:"var(--R)",fontSize:12,marginBottom:12,padding:"8px 12px",background:"var(--Rp)",borderRadius:8}}>{err}</div>}

        <button className="btn bT"style={{width:"100%",justifyContent:"center",marginBottom:16}}
          onClick={mode==="connexion"?connexion:inscription} disabled={loading}>
          {loading?"⏳ Chargement…":mode==="connexion"?"Se connecter →":"Créer mon compte →"}
        </button>

        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
          <div style={{flex:1,height:1,background:"var(--br)"}}/>
          <span style={{fontSize:11,color:"var(--l)"}}>ou accès démo rapide</span>
          <div style={{flex:1,height:1,background:"var(--br)"}}/>
        </div>

        <div style={{background:"var(--c)",borderRadius:10,padding:12}}>
          {demos.map(c=><button key={c.id}onClick={()=>onLogin(c)}
            style={{display:"block",width:"100%",textAlign:"left",padding:"7px 10px",background:"none",border:"none",cursor:"pointer",borderRadius:8}}>
            <span style={{fontWeight:700,color:c.role==="asmat"?"var(--T)":"var(--B)"}}>{c.role==="asmat"?"👩‍👧":"👪"}</span> {c.label}
          </button>)}
        </div>
      </div>
    </div>}
  </div>;
}

// ... (Le reste du code reste identique) ...

export default function App(){
  const [user,setUser]=useState(null);
  const [page,setPage]=useState("accueil");
  const [dark,setDark]=useState(false);
  const [loading,setLoading]=useState(true);
  const [pmiNonLus,setPmiNonLus]=useState(3);
  const [notifs,setNotifs]=useState([
    {id:"n1",ic:"📬",txt:"Nouveau message de la PMI",date:TODAY_STR,lu:false,page:"pmi"},
    {id:"n2",ic:"✍️",txt:"Contrat de Noah en attente de signature",date:TODAY_STR,lu:false,page:"admin_finances"},
  ]);
  const [showNotifs,setShowNotifs]=useState(false);
  const [onboarded,setOnboarded]=useState(false);

  useEffect(()=>{
    const init=async()=>{
      try{
        const{data:{session}}=await supabase.auth.getSession();
        if(session?.user){
          const{data:profil}=await supabase.from("profiles").select("*").eq("id",session.user.id).single();
          if(profil)setUser({...profil,id:session.user.id,email:session.user.email});
        }
      }catch(e){}
      finally{setLoading(false);}
    };
    init();
    const{data:{subscription}}=supabase.auth.onAuthStateChange(async(event,session)=>{
      if(event==="SIGNED_IN"&&session?.user){
        const{data:profil}=await supabase.from("profiles").select("*").eq("id",session.user.id).single();
        if(profil)setUser({...profil,id:session.user.id,email:session.user.email});
      }
      if(event==="SIGNED_OUT"){setUser(null);setPage("accueil");}
    });
    return()=>subscription.unsubscribe();
  },[]);

  const handleLogout=async()=>{
    try{await supabase.auth.signOut();}catch(e){}
    setUser(null);setPage("accueil");setOnboarded(false);
  };

  if(loading)return <div style={{height:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}>Chargement...</div>;

  if(!user)return <><Styles/><div className={`app${dark?" dark":""}`}><LandingPage onLogin={u=>{setUser(u);setPage("accueil");}} dark={dark} setDark={setDark}/></div></>;

  const role=user.role;
  const enfants=role==="asmat"?D.enfants:D.enfants.filter(e=>e.parentId===user.id);
  const pEId=enfants[0]?.id;
  const groups=role==="asmat"?GROUPS_AM:GROUPS_P;
  const P={enfants,role,pEId};

  const renderPage=()=>{
    switch(page){
      case "accueil": return role==="asmat"?<AccueilAssMat enfants={enfants} setPage={setPage}/>:<AccueilParent enfant={enfants[0]} setPage={setPage}/>;
      case "journal_complet": return <JournalComplet {...P}/>;
      case "sante_complet": return <SanteComplete {...P}/>;
      case "eveil_complet": return <EveilComplet {...P}/>;
      case "documents_complet": return <DocumentsComplet {...P}/>;
      case "admin_finances": return <AdminFinances {...P}/>;
      case "pointage": return <Pointage {...P}/>;
      case "calendrier": return <Calendrier enfants={enfants} role={role} pEId={pEId}/>;
      case "messagerie": return <Messagerie {...P}/>;
      case "politique_confidentialite": return <PolitiqueConfidentialite/>;
      case "mentions_legales": return <MentionsLegales/>;
      case "parametres": return <Parametres user={user} onLogout={handleLogout} setPage={setPage}/>;
      case "pmi": return <CommunicationPMI role={role}/>;
      case "liste_attente": return <ListeAttente enfants={enfants} role={role}/>;
      case "kit_cmg": return <KitCMG enfants={enfants} role={role} pEId={pEId}/>;
      case "dashboard": return <TableauDeBord enfants={enfants} role={role} pEId={pEId} setPage={setPage}/>;
      default: return role==="asmat"?<AccueilAssMat enfants={enfants} setPage={setPage}/>:<AccueilParent enfant={enfants[0]} setPage={setPage}/>;
    }
  };

  return(
    <>
      <Styles/>
      <div className={`app${dark?" dark":""}`}>
        <TopBar role={role} groups={groups} page={page} setPage={setPage} user={user}
          onLogout={handleLogout}
          pmiNonLus={pmiNonLus} dark={dark} setDark={setDark}
          notifNonLus={notifs.filter(n=>!n.lu).length} notifs={notifs} setNotifs={setNotifs}
          showNotifs={showNotifs} setShowNotifs={setShowNotifs} setPage2={setPage}/>
        <div className="content">{renderPage()}</div>
      </div>
    </>
  );
}
