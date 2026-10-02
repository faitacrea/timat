import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { Analytics } from '@vercel/analytics/react'

// ON VIDE #root NOUS-MEMES, AVANT DE LE CONFIER A REACT.
//
// index.html peint un ecran d'attente DANS #root, pour que la page ne reste pas
// blanche pendant le telechargement du code. React doit ensuite reprendre ce
// conteneur, et il le vide en retirant ses enfants un par un.
//
// Ce vidage n'a REPARE AUCUN DEFAUT CONNU : la page blanche hors ligne venait
// d'ailleurs (un onError qui reecrivait outerHTML, voir LogoTiMat dans
// App.jsx). Il reste parce qu'il supprime une classe entiere de risques :
// React retire ces enfants un par un, et un seul d'entre eux detache par un
// tiers suffit a lever « removeChild » et a faire disparaitre l'application.
// replaceChildren() retire tout d'un coup, sans se soucier de leur etat.
const racine = document.getElementById('root');
if (racine) racine.replaceChildren();

createRoot(racine).render(
  <StrictMode>
    <App />
    <Analytics />
  </StrictMode>,
)
