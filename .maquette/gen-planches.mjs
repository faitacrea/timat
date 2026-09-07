import { writeFileSync } from "node:fs";
const G = { ground:"#FDFBF8", sheet:"#FFFFFF", ink:"#2E4859", ink2:"#617079", line:"#EDE6E0" };
const head = `<!doctype html>
<html><head><meta charset="utf-8"><script src="./support.js"></script></head><body><x-dc>
<helmet>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif&family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap">
  <style>body{margin:0;font-family:'DM Sans',system-ui,sans-serif}</style>
</helmet>`;
const foot = `</x-dc></body></html>\n`;

/* ---------- planche des jetons ---------- */
const pastille = (hex, nom, ratio, verdict, texteClair) => `
  <div style="display:flex;flex-direction:column;gap:7px;min-width:0">
    <div style="height:74px;border-radius:14px;background:${hex};display:flex;align-items:flex-end;padding:9px 11px">
      <span style="font-family:'DM Mono',monospace;font-size:11.5px;color:${texteClair?"#FFFFFF":G.ink};opacity:.9">${hex}</span>
    </div>
    <div style="display:flex;flex-direction:column;gap:1px">
      <span style="font-size:12.5px;font-weight:700;color:${G.ink}">${nom}</span>
      <span style="font-size:11.5px;color:${G.ink2}">${ratio} · ${verdict}</span>
    </div>
  </div>`;

const rangee = (titre, sous, cols) => `
  <div style="display:flex;flex-direction:column;gap:11px">
    <div style="display:flex;flex-direction:column;gap:2px">
      <span style="font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:${G.ink2}">${titre}</span>
      <span style="font-size:13px;color:${G.ink2};line-height:1.45">${sous}</span>
    </div>
    <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px">${cols}</div>
  </div>`;

const jetons = head + `
<div style="width:860px;background:${G.ground};padding:34px 36px 38px;display:flex;flex-direction:column;gap:30px;color:${G.ink}">

  <div style="display:flex;flex-direction:column;gap:4px">
    <span style="font-family:'Instrument Serif',Georgia,serif;font-size:34px;line-height:1.1">Les couleurs de TiMat, approfondies</span>
    <span style="font-size:14px;color:${G.ink2};line-height:1.5;max-width:640px">Chaque teinte garde le rôle que vous lui aviez donné — un logo, un public. On ne change que la profondeur, pour que la couleur puisse enfin porter du texte et des boutons. Les ratios sont mesurés sur fond blanc ; le minimum réglementaire (RGAA / WCAG AA) est de 4,5:1.</span>
  </div>

${rangee("Assistante maternelle — bleu",
  "La couleur du logo Assmat, et celle de la landing. Elle est déjà conforme : on n'y touche pas. C'est le public principal de TiMat.",
  pastille("#2E5F8A","Bleu — action","6,73:1","conforme · inchangé",true)
+ pastille("#6E9FC4","Bleu clair — marque","2,83:1","fonds et pastilles uniquement",false)
+ pastille("#E4EFF7","Bleu pâle — fond","—","fonds de section, avatars",false)
+ pastille("#F2F8FC","Bleu voile — survol","—","survol sur ordinateur",false))}

${rangee("Parent employeur — corail / terracotta",
  "La couleur du logo parent. Le corail clair reste la marque ; la version foncée prend les boutons et les liens.",
  pastille("#E49178","Corail — marque","2,44:1","fonds, avatars, pastilles uniquement",false)
+ pastille("#B85536","Terracotta — action","4,78:1","conforme · boutons et liens",true)
+ pastille("#FBEAE3","Corail pâle — fond","—","fonds de section",false)
+ pastille("#FDF4F0","Corail voile — survol","—","survol sur ordinateur",false))}

${rangee("MAM / crèche — sauge (pour plus tard)",
  "La sauge actuelle #8F9F92 ne tient que 2,78:1 : elle ne peut porter ni texte ni bouton. Approfondie, elle devient utilisable sans changer de famille.",
  pastille("#4E6B57","Sauge — action","5,89:1","conforme · remplace #8F9F92",true)
+ pastille("#8FAE99","Sauge claire — marque","2,42:1","fonds et pastilles uniquement",false)
+ pastille("#E6EFE9","Sauge pâle — fond","—","fonds de section",false)
+ pastille("#F3F8F5","Sauge voile — survol","—","survol sur ordinateur",false))}

${rangee("Commun aux trois univers",
  "Le texte, les états et les alertes ne changent pas d'un public à l'autre : c'est ce qui fait que l'app reste une seule app.",
  pastille("#2E4859","Encre — texte","9,60:1","conforme · inchangé",true)
+ pastille("#617079","Encre douce — secondaire","5,12:1","conforme · texte secondaire",true)
+ pastille("#2F6B64","Vert — état positif","6,16:1","présent, validé, à jour",true)
+ pastille("#B3261E","Rouge — alerte","6,54:1","reste rouge : il doit alerter",true))}

  <div style="background:${G.sheet};border:1px solid ${G.line};border-radius:16px;padding:18px 20px;display:flex;flex-direction:column;gap:9px">
    <span style="font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:${G.ink2}">Ce qui disparaît</span>
    <div style="display:flex;align-items:center;gap:14px">
      <div style="width:44px;height:44px;border-radius:11px;background:#5DA9A1;flex:none"></div>
      <span style="font-size:13.5px;line-height:1.5;color:${G.ink}"><b>Le turquoise #5DA9A1</b> — 2,74:1. Il porte aujourd'hui du texte blanc dans l'app, ce qui est illisible en plein soleil. Son rôle passe au bleu parent, qui est déjà le vôtre et déjà conforme. C'est une couleur retirée, pas une couleur ajoutée : la palette se simplifie.</span>
    </div>
  </div>

</div>` + foot;
writeFileSync("Jetons.dc.html", jetons);

/* ---------- planche des onglets ---------- */
const ICO = {
  accueil:'<path d="m3 10 9-7 9 7v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
  enfant:'<circle cx="12" cy="9" r="4"/><path d="M5 21a7 7 0 0 1 14 0"/>',
  admin:'<path d="M3 7h6l2 2h10v10a2 2 0 0 1-2 2H3Z"/>',
  outils:'<path d="m12 3 2.6 5.6 6.1.8-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6L3.3 9.4l6.1-.8Z"/>',
};
const ACT="#2E5F8A", SOFT="#E4EFF7", PALE="#F2F8FC";
const ong = (etat, label, d) => {
  const fond = etat==="actif"||etat==="appui" ? SOFT : etat==="survol" ? PALE : "transparent";
  const teinte = etat==="repos" ? G.ink2 : ACT;
  const gras = etat==="actif" ? "700" : "500";
  const ech = etat==="appui" ? "transform:scale(.93);" : "";
  return `<div style="display:flex;flex-direction:column;align-items:center;gap:5px;padding:8px 2px;border-radius:12px;background:${fond};${ech}">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${teinte}" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round">${d}</svg>
      <span style="font-size:10.5px;font-weight:${gras};color:${teinte}">${label}</span>
    </div>`;
};
const barre = (e) => `<div style="width:390px;border:1px solid ${G.line};border-radius:14px;background:${G.sheet};padding:8px;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:3px">
  ${ong(e[0],"Accueil",ICO.accueil)}${ong(e[1],"L'enfant",ICO.enfant)}${ong(e[2],"Administratif",ICO.admin)}${ong(e[3],"Outils Pro",ICO.outils)}
</div>`;
const cas = (titre, desc, e) => `
  <div style="display:flex;flex-direction:column;gap:9px">
    <div style="display:flex;flex-direction:column;gap:2px">
      <span style="font-size:13.5px;font-weight:700;color:${G.ink}">${titre}</span>
      <span style="font-size:12.5px;color:${G.ink2};line-height:1.45;max-width:390px">${desc}</span>
    </div>
    ${barre(e)}
  </div>`;

const onglets = head + `
<div style="width:860px;background:${G.ground};padding:34px 36px 38px;display:flex;flex-direction:column;gap:26px;color:${G.ink}">
  <div style="display:flex;flex-direction:column;gap:4px">
    <span style="font-family:'Instrument Serif',Georgia,serif;font-size:34px;line-height:1.1">Les onglets, état par état</span>
    <span style="font-size:14px;color:${G.ink2};line-height:1.5;max-width:640px">Quatre états, une seule règle : la couleur ne sert qu'à dire où l'on est et où l'on vient d'appuyer. Ici en bleu assmat — la même mécanique vaut en corail parent et en sauge.</span>
  </div>
  <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:26px 30px">
${cas("Au repos","Gris, aucune pastille. Trois onglets sur quatre sont dans cet état en permanence.",["actif","repos","repos","repos"])}
${cas("À l'appui — environ 150 ms","Le fond s'allume et l'onglet se rétracte très légèrement sous le doigt, puis revient. C'est le seul retour tactile possible sans vibration : sans lui, on ne sait pas si l'appui a été pris.",["actif","appui","repos","repos"])}
${cas("Actif","Pastille colorée en permanence, libellé en gras, icône teintée. Trois signaux plutôt qu'un seul, pour rester lisible même en noir et blanc ou en cas de daltonisme.",["repos","repos","actif","repos"])}
${cas("Au survol — ordinateur uniquement","Un voile très pâle, plus léger que l'appui. Sur téléphone cet état n'existe pas : il n'y a pas de survol, seulement l'appui. Il s'ajoute gratuitement sur ordinateur et sur la version web.",["actif","repos","repos","survol"])}
  </div>
</div>` + foot;
writeFileSync("Onglets.dc.html", onglets);
console.log("écrit Jetons.dc.html et Onglets.dc.html");
