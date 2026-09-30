// Le parametre ?page= d'une notification push doit decider de l'ecran ouvert,
// et rien d'autre ne doit pouvoir le faire.
import { readFileSync } from 'node:fs';
const src = readFileSync(new URL('../src/App.jsx', import.meta.url),'utf8');
const bloc = src.match(/export const PAGES_NOTIFIABLES = new Set\(\[([\s\S]*?)\]\)/)[1];
const pages = new Set([...bloc.matchAll(/"([a-z_]+)"/g)].map(m=>m[1]));
const routes = new Set([...src.matchAll(/case "([a-z_]+)":/g)].map(m=>m[1]));
let ko=0;
for(const p of pages) if(!routes.has(p)){ console.log('ECHEC: destination sans route ->',p); ko++; }
// Toute page passee a createNotification doit etre notifiable.
import { readdirSync, statSync } from 'node:fs';
const fichiers=[];
const parc=d=>{for(const e of readdirSync(d,{withFileTypes:true})){const c=d+'/'+e.name;if(e.isDirectory()){if(e.name!=='node_modules')parc(c);}else if(/\.(js|jsx|mjs)$/.test(e.name))fichiers.push(c);}};
parc(new URL('../src',import.meta.url).pathname); parc(new URL('../api',import.meta.url).pathname);
for(const f of fichiers){
  const t=readFileSync(f,'utf8');
  for(const m of t.matchAll(/createNotification\(\{[^}]*page:\s*"([a-z_]+)"/g)){
    if(!pages.has(m[1])){ console.log('ECHEC: notification vers une page non notifiable ->',m[1],'dans',f); ko++; }
  }
}
// La lecture de l'URL doit refuser ce qui n'est pas dans la liste.
if(!/PAGES_NOTIFIABLES\.has\(p\)/.test(src)){ console.log('ECHEC: le parametre n est pas filtre'); ko++; }
if(!/pageDepuisURL\(typeof window/.test(src)){ console.log('ECHEC: l etat initial ne lit pas l URL'); ko++; }
console.log(ko?`${ko} echec(s)`:`OK : ${pages.size} destinations, toutes routees et filtrees`);
process.exit(ko?1:0);
