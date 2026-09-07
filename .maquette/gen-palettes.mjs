import { writeFileSync } from "node:fs";

// Un seul écran, quatre palettes. Tout ce qui n'est pas couleur est
// identique d'une variante à l'autre pour que la comparaison ne porte
// que sur la teinte.
const P = [
  { f:"Main.dc.html", nom:"Corail approfondi",
    ground:"#FDFBF8", sheet:"#FFFFFF", ink:"#2E4859", ink2:"#7C8A94",
    act:"#B85536", actInk:"#FFFFFF", brand:"#E49178", soft:"#FBEAE3",
    line:"#EDE6E0", ok:"#2F6B64", okSoft:"#E4F1EF",
    alert:"#B3261E", alertSoft:"#FCEBEA", alertLine:"#F3CFCC" },
  { f:"PaletteB.dc.html", nom:"Terracotta & sauge",
    ground:"#FAF7F2", sheet:"#FFFFFF", ink:"#2C2A26", ink2:"#857F76",
    act:"#A9543A", actInk:"#FFFFFF", brand:"#C97A5C", soft:"#F2E6DE",
    line:"#E7DFD6", ok:"#516E4C", okSoft:"#E6EDE3",
    alert:"#B3261E", alertSoft:"#FBEAE8", alertLine:"#F0CEC9" },
  { f:"PaletteC.dc.html", nom:"Ambre & prune",
    ground:"#FBF8F4", sheet:"#FFFFFF", ink:"#3F2440", ink2:"#8A7C8A",
    act:"#9C5A16", actInk:"#FFFFFF", brand:"#E0A33F", soft:"#FBF0DC",
    line:"#ECE3D9", ok:"#456F55", okSoft:"#E5EFE8",
    alert:"#B3261E", alertSoft:"#FBEBE9", alertLine:"#F1D0CC" },
  { f:"PaletteD.dc.html", nom:"Corail & encre",
    ground:"#FFFFFF", sheet:"#FFFFFF", ink:"#16181D", ink2:"#767C87",
    act:"#1F2933", actInk:"#FFFFFF", brand:"#E49178", soft:"#FCEEE9",
    line:"#E6E8EC", ok:"#0C6C54", okSoft:"#E3F2EC",
    alert:"#B3261E", alertSoft:"#FCECEA", alertLine:"#F2D2CE" },
];

const enfant = (p, ini, nom, note, h, dernier) => `
        <div style="padding:14px 16px;display:flex;align-items:center;gap:13px;${dernier?"":`border-bottom:1px solid ${p.line}`}">
          <div style="width:40px;height:40px;border-radius:20px;background:${p.soft};flex:none;display:flex;align-items:center;justify-content:center;font-family:'Instrument Serif',Georgia,serif;font-size:19px;color:${p.act}">${ini}</div>
          <div style="display:flex;flex-direction:column;gap:2px;flex-grow:1">
            <span style="font-size:15px;font-weight:600;color:${p.ink}">${nom}</span>
            <span style="font-size:12.5px;color:${p.ink2}">${note}</span>
          </div>
          <span style="font-size:13.5px;font-weight:600;color:${p.ink};font-variant-numeric:tabular-nums;letter-spacing:.01em">${h}</span>
        </div>`;

const nav = (p, actif, label, d) => `
    <div style="display:flex;flex-direction:column;align-items:center;gap:5px;padding:8px 2px;border-radius:12px;${actif?`background:${p.soft}`:""}">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${actif?p.act:p.ink2}" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round">${d}</svg>
      <span style="font-size:10.5px;${actif?`font-weight:700;color:${p.act}`:`color:${p.ink2}`}">${label}</span>
    </div>`;

const page = (p) => `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif&family=DM+Sans:wght@400;500;600;700&display=swap">
  <style>
    body { margin:0; font-family:'DM Sans','Segoe UI',system-ui,sans-serif; }
    a { color:${p.act}; }
  </style>
</helmet>

<div style="width:390px;height:844px;background:${p.ground};display:flex;flex-direction:column;overflow:hidden;color:${p.ink}">

  <div style="padding:22px 20px 0;display:flex;flex-direction:column;gap:17px;flex-grow:1">

    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px">
      <div style="display:flex;flex-direction:column;gap:1px">
        <span style="font-size:12.5px;color:${p.ink2}">Mardi 8 septembre</span>
        <span style="font-family:'Instrument Serif',Georgia,serif;font-size:30px;line-height:1.12">Bonjour Sophie</span>
      </div>
      <div style="width:42px;height:42px;border-radius:21px;background:${p.soft};display:flex;align-items:center;justify-content:center;flex:none">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${p.act}" stroke-width="1.7" stroke-linecap="round"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>
      </div>
    </div>

    <div style="background:${p.act};border-radius:24px;padding:20px;display:flex;align-items:center;gap:14px">
      <div style="display:flex;flex-direction:column;gap:3px;flex-grow:1">
        <span style="font-size:11px;font-weight:700;letter-spacing:.11em;text-transform:uppercase;color:${p.actInk};opacity:.72">Journée en cours</span>
        <span style="font-size:30px;font-weight:700;letter-spacing:-.02em;color:${p.actInk};font-variant-numeric:tabular-nums;line-height:1.1">7 h 12</span>
        <span style="font-size:12.5px;color:${p.actInk};opacity:.8">3 enfants pointés sur 3</span>
      </div>
      <div style="background:${p.sheet};border-radius:16px;padding:12px 16px;display:flex;align-items:center;gap:8px;flex:none">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="${p.act}" stroke-width="2.1" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
        <span style="font-size:13.5px;font-weight:700;color:${p.act}">Pointer</span>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px">
      <div style="background:${p.sheet};border:1px solid ${p.line};border-radius:18px;padding:15px;display:flex;align-items:center;gap:11px">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${p.act}" stroke-width="1.8" stroke-linecap="round" style="flex:none"><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H19v16H5.5A1.5 1.5 0 0 1 4 18.5Z"/><path d="M8 9h7M8 13h5"/></svg>
        <span style="font-size:13.5px;font-weight:600">Cahier du jour</span>
      </div>
      <div style="background:${p.sheet};border:1px solid ${p.line};border-radius:18px;padding:15px;display:flex;align-items:center;gap:11px">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${p.act}" stroke-width="1.8" stroke-linecap="round" style="flex:none"><path d="M20 12a8 8 0 0 1-11.6 7.1L4 20l.9-4.4A8 8 0 1 1 20 12Z"/></svg>
        <span style="font-size:13.5px;font-weight:600;flex-grow:1">Messages</span>
        <span style="min-width:20px;height:20px;border-radius:10px;background:${p.brand};color:#FFFFFF;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;padding:0 5px;flex:none">2</span>
      </div>
    </div>

    <div style="display:flex;flex-direction:column;gap:9px">
      <div style="display:flex;align-items:baseline;justify-content:space-between">
        <span style="font-size:11px;font-weight:700;letter-spacing:.11em;text-transform:uppercase;color:${p.ink2}">Enfants accueillis</span>
        <span style="font-size:11.5px;font-weight:700;color:${p.ok};background:${p.okSoft};padding:3px 9px;border-radius:9px">3 présents</span>
      </div>
      <div style="background:${p.sheet};border:1px solid ${p.line};border-radius:18px;overflow:hidden;display:flex;flex-direction:column">
${enfant(p,"L","Léa","Sieste en cours","07:35",false)}
${enfant(p,"T","Tom","Repas noté","08:10",false)}
${enfant(p,"J","Jade","Aucune note","07:50",true)}
      </div>
    </div>

    <div style="background:${p.alertSoft};border:1px solid ${p.alertLine};border-radius:16px;padding:14px 15px;display:flex;align-items:center;gap:12px">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${p.alert}" stroke-width="1.9" stroke-linecap="round" style="flex:none"><path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>
      <div style="display:flex;flex-direction:column;gap:1px;flex-grow:1">
        <span style="font-size:13.5px;font-weight:700;color:${p.alert}">Contrat de Tom à signer</span>
        <span style="font-size:12.5px;color:${p.alert};opacity:.82">En attente depuis 4 jours</span>
      </div>
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="${p.alert}" stroke-width="2.1" stroke-linecap="round" style="flex:none"><path d="m9 18 6-6-6-6"/></svg>
    </div>

  </div>

  <div style="border-top:1px solid ${p.line};background:${p.sheet};padding:8px 8px 22px;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:3px">
${nav(p,true,"Accueil",'<path d="m3 10 9-7 9 7v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>')}
${nav(p,false,"L'enfant",'<circle cx="12" cy="9" r="4"/><path d="M5 21a7 7 0 0 1 14 0"/>')}
${nav(p,false,"Administratif",'<path d="M3 7h6l2 2h10v10a2 2 0 0 1-2 2H3Z"/>')}
${nav(p,false,"Outils Pro",'<path d="m12 3 2.6 5.6 6.1.8-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6L3.3 9.4l6.1-.8Z"/>')}
  </div>

</div>
</x-dc>
</body>
</html>
`;

for (const p of P) { writeFileSync(p.f, page(p)); console.log("écrit", p.f, "—", p.nom); }
