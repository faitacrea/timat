import { writeFileSync } from "node:fs";

// Trois univers, une seule grammaire. La teinte identifie à qui
// appartient l'écran ; tout le reste est rigoureusement commun.
const U = [
  { f:"Main.dc.html",   qui:"Assistante maternelle", act:"#2E5F8A", brand:"#6E9FC4", soft:"#E4EFF7", pale:"#F2F8FC" },
  { f:"Parent.dc.html", qui:"Parent employeur",      act:"#B85536", brand:"#E49178", soft:"#FBEAE3", pale:"#FDF4F0" },
  { f:"Mam.dc.html",    qui:"MAM / crèche",          act:"#4E6B57", brand:"#8FAE99", soft:"#E6EFE9", pale:"#F3F8F5" },
];
const G = { ground:"#FDFBF8", sheet:"#FFFFFF", ink:"#2E4859", ink2:"#617079",
            line:"#EDE6E0", ok:"#2F6B64", okSoft:"#E4F1EF",
            alert:"#B3261E", alertSoft:"#FCEBEA", alertLine:"#F3CFCC" };

const head = (extra="") => `<!doctype html>
<html><head><meta charset="utf-8"><script src="./support.js"></script></head><body><x-dc>
<helmet>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif&family=DM+Sans:wght@400;500;600;700&display=swap">
  <style>body{margin:0;font-family:'DM Sans','Segoe UI',system-ui,sans-serif}${extra}</style>
</helmet>`;
const foot = `</x-dc></body></html>\n`;

const ICO = {
  accueil:'<path d="m3 10 9-7 9 7v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
  enfant:'<circle cx="12" cy="9" r="4"/><path d="M5 21a7 7 0 0 1 14 0"/>',
  admin:'<path d="M3 7h6l2 2h10v10a2 2 0 0 1-2 2H3Z"/>',
  outils:'<path d="m12 3 2.6 5.6 6.1.8-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6L3.3 9.4l6.1-.8Z"/>',
};

// etat: "repos" | "appui" | "actif" | "survol"
const onglet = (u, etat, label, d) => {
  const fond = etat === "actif" ? u.soft : etat === "appui" ? u.soft : etat === "survol" ? u.pale : "transparent";
  const teinte = etat === "repos" ? G.ink2 : u.act;
  const gras = etat === "actif" ? "700" : "500";
  const ech = etat === "appui" ? "transform:scale(.94);" : "";
  return `
    <div style="display:flex;flex-direction:column;align-items:center;gap:5px;padding:8px 2px;border-radius:12px;background:${fond};${ech}">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${teinte}" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round">${d}</svg>
      <span style="font-size:10.5px;font-weight:${gras};color:${teinte}">${label}</span>
    </div>`;
};
const barre = (u, etats) => `
  <div style="border-top:1px solid ${G.line};background:${G.sheet};padding:8px 8px 22px;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:3px">
${onglet(u, etats[0], "Accueil", ICO.accueil)}
${onglet(u, etats[1], "L'enfant", ICO.enfant)}
${onglet(u, etats[2], "Administratif", ICO.admin)}
${onglet(u, etats[3], "Outils Pro", ICO.outils)}
  </div>`;

const ligne = (u, ini, nom, note, h, dernier) => `
        <div style="padding:14px 16px;display:flex;align-items:center;gap:13px;${dernier?"":`border-bottom:1px solid ${G.line}`}">
          <div style="width:40px;height:40px;border-radius:20px;background:${u.soft};flex:none;display:flex;align-items:center;justify-content:center;font-family:'Instrument Serif',Georgia,serif;font-size:19px;color:${u.act}">${ini}</div>
          <div style="display:flex;flex-direction:column;gap:2px;flex-grow:1">
            <span style="font-size:15px;font-weight:600;color:${G.ink}">${nom}</span>
            <span style="font-size:12.5px;color:${G.ink2}">${note}</span>
          </div>
          <span style="font-size:13.5px;font-weight:600;color:${G.ink};font-variant-numeric:tabular-nums">${h}</span>
        </div>`;

const ecran = (u) => head(`a{color:${u.act}}`) + `
<div style="width:390px;height:844px;background:${G.ground};display:flex;flex-direction:column;overflow:hidden;color:${G.ink}">
  <div style="padding:22px 20px 0;display:flex;flex-direction:column;gap:17px;flex-grow:1">

    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px">
      <div style="display:flex;flex-direction:column;gap:1px">
        <span style="font-size:11px;font-weight:700;letter-spacing:.11em;text-transform:uppercase;color:${u.act}">${u.qui}</span>
        <span style="font-family:'Instrument Serif',Georgia,serif;font-size:30px;line-height:1.12">Bonjour Sophie</span>
        <span style="font-size:12.5px;color:${G.ink2}">Mardi 8 septembre</span>
      </div>
      <div style="width:42px;height:42px;border-radius:21px;background:${u.soft};display:flex;align-items:center;justify-content:center;flex:none">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${u.act}" stroke-width="1.7" stroke-linecap="round"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>
      </div>
    </div>

    <div style="background:${u.act};border-radius:24px;padding:20px;display:flex;align-items:center;gap:14px">
      <div style="display:flex;flex-direction:column;gap:3px;flex-grow:1">
        <span style="font-size:11px;font-weight:700;letter-spacing:.11em;text-transform:uppercase;color:#FFFFFF;opacity:.72">Journée en cours</span>
        <span style="font-size:30px;font-weight:700;letter-spacing:-.02em;color:#FFFFFF;font-variant-numeric:tabular-nums;line-height:1.1">7 h 12</span>
        <span style="font-size:12.5px;color:#FFFFFF;opacity:.8">3 enfants pointés sur 3</span>
      </div>
      <div style="background:#FFFFFF;border-radius:16px;padding:12px 16px;display:flex;align-items:center;gap:8px;flex:none">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="${u.act}" stroke-width="2.1" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
        <span style="font-size:13.5px;font-weight:700;color:${u.act}">Pointer</span>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px">
      <div style="background:${G.sheet};border:1px solid ${G.line};border-radius:18px;padding:15px;display:flex;align-items:center;gap:11px">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${u.act}" stroke-width="1.8" stroke-linecap="round" style="flex:none"><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H19v16H5.5A1.5 1.5 0 0 1 4 18.5Z"/><path d="M8 9h7M8 13h5"/></svg>
        <span style="font-size:13.5px;font-weight:600">Cahier du jour</span>
      </div>
      <div style="background:${G.sheet};border:1px solid ${G.line};border-radius:18px;padding:15px;display:flex;align-items:center;gap:11px">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${u.act}" stroke-width="1.8" stroke-linecap="round" style="flex:none"><path d="M20 12a8 8 0 0 1-11.6 7.1L4 20l.9-4.4A8 8 0 1 1 20 12Z"/></svg>
        <span style="font-size:13.5px;font-weight:600;flex-grow:1">Messages</span>
        <span style="min-width:20px;height:20px;border-radius:10px;background:${u.brand};color:#FFFFFF;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;padding:0 5px;flex:none">2</span>
      </div>
    </div>

    <div style="display:flex;flex-direction:column;gap:9px">
      <div style="display:flex;align-items:baseline;justify-content:space-between">
        <span style="font-size:11px;font-weight:700;letter-spacing:.11em;text-transform:uppercase;color:${G.ink2}">Enfants accueillis</span>
        <span style="font-size:11.5px;font-weight:700;color:${G.ok};background:${G.okSoft};padding:3px 9px;border-radius:9px">3 présents</span>
      </div>
      <div style="background:${G.sheet};border:1px solid ${G.line};border-radius:18px;overflow:hidden;display:flex;flex-direction:column">
${ligne(u,"L","Léa","Sieste en cours","07:35",false)}
${ligne(u,"T","Tom","Repas noté","08:10",false)}
${ligne(u,"J","Jade","Aucune note","07:50",true)}
      </div>
    </div>

    <div style="background:${G.alertSoft};border:1px solid ${G.alertLine};border-radius:16px;padding:14px 15px;display:flex;align-items:center;gap:12px">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${G.alert}" stroke-width="1.9" stroke-linecap="round" style="flex:none"><path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>
      <div style="display:flex;flex-direction:column;gap:1px;flex-grow:1">
        <span style="font-size:13.5px;font-weight:700;color:${G.alert}">Contrat de Tom à signer</span>
        <span style="font-size:12.5px;color:${G.alert};opacity:.82">En attente depuis 4 jours</span>
      </div>
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="${G.alert}" stroke-width="2.1" stroke-linecap="round" style="flex:none"><path d="m9 18 6-6-6-6"/></svg>
    </div>

  </div>
${barre(u, ["actif","repos","repos","repos"])}
</div>` + foot;

for (const u of U) { writeFileSync(u.f, ecran(u)); console.log("écrit", u.f, "—", u.qui); }
