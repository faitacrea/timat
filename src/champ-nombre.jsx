// UN CHAMP CHIFFRÉ QUI SE LAISSE REMPLIR.
//
// Les vingt-trois champs chiffrés de l'application étaient des
// <input type="number"> pilotés par « parseFloat(e.target.value) || défaut ».
// Trois défauts tenaient dans cette ligne, tous trois reproduits dans un vrai
// navigateur par scripts/verif-nombres.mjs :
//
//   1. LA VIRGULE EST AVALÉE. On tape « 4,20 » comme taux horaire, et le champ
//      retient 420. Ce n'est pas le code : un input type=number refuse la
//      virgule, en français comme ailleurs ; le navigateur la jette, sans rien
//      dire. 420 €/h passait ensuite dans le contrat et dans le bulletin de
//      salaire. Deux champs portaient même « 0,00 » en texte d'invite : on
//      montrait la virgule et on la refusait.
//      → d'où le type="text" ici : c'est la seule façon de recevoir la
//        virgule. inputMode="decimal" garde le pavé numérique sur téléphone.
//
//   2. ON NE PEUT PAS EFFACER. Le « || » ne distingue pas « vide » de « zéro » :
//      vider le champ le faisait sauter sur sa valeur par défaut. Celle qui
//      effaçait pour retaper obtenait « 4.05 » puis sa frappe par-dessus, soit
//      4,0542 €/h. Un chiffre que personne n'a choisi, dans un contrat.
//      → d'où la mémoire du texte brut : vide reste vide pendant la frappe, et
//        la valeur par défaut ne revient qu'en quittant le champ.
//
//   3. ZÉRO EST IMPOSSIBLE. « parseFloat("0") || 3.80 » vaut 3,80. Une
//      indemnité d'entretien de 0 € — les parents fournissent tout — ne pouvait
//      pas être saisie.
//      → d'où la comparaison explicite à null plutôt qu'au « falsy ».
//
// Les bornes ne s'appliquent QU'EN SORTANT du champ : borner pendant la frappe
// interdit de taper « 35 » quand le minimum est 1, parce que le « 3 » passe
// seul une fraction de seconde.
import { useState, useRef, useEffect } from "react";

// « 4,20 » et « 4.20 » valent la même chose. Un champ vide vaut null, jamais 0 :
// c'est toute la différence que le « || » ne faisait pas.
export const versNombre = (texte) => {
  const t = String(texte ?? "").trim().replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

// Ce qu'on affiche : le point devient une virgule, parce que c'est ce qu'une
// utilisatrice française lit.
const versTexte = (v) => (v === null || v === undefined || v === "" ? "" : String(v).replace(".", ","));

export function ChampNombre({
  value,            // nombre, ou null/"" quand le champ est vide
  onChange,         // reçoit un nombre, ou null si le champ est vide
  min, max,
  defaut = null,    // ce que vaut un champ laissé vide, APRÈS l'avoir quitté
  decimales,        // nombre de décimales autorisées ; absent = autant qu'on veut
  className = "inp",
  ...reste
}) {
  const [brut, setBrut] = useState(versTexte(value));
  const focus = useRef(false);
  // Pendant la frappe, c'est le texte tapé qui fait foi. En dehors, c'est la
  // valeur du parent : sinon un champ recalculé ailleurs n'apparaîtrait jamais.
  useEffect(() => { if (!focus.current) setBrut(versTexte(value)); }, [value]);

  // On laisse passer les chiffres, un séparateur, et le signe moins si le
  // minimum l'autorise. Le reste est refusé à la frappe, ce qui vaut mieux
  // qu'un champ qui accepte puis efface.
  const filtre = (t) => {
    let s = t.replace(/[^0-9.,-]/g, "").replace(/(?!^)-/g, "");
    if (!(min === undefined || min === null) && Number(min) >= 0) s = s.replace(/-/g, "");
    const i = s.search(/[.,]/);
    if (i !== -1) s = s.slice(0, i + 1) + s.slice(i + 1).replace(/[.,]/g, "");
    if (decimales !== undefined && i !== -1) s = s.slice(0, i + 1 + decimales);
    return s;
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      className={className}
      value={brut}
      onFocus={() => { focus.current = true; }}
      onChange={(e) => {
        const s = filtre(e.target.value);
        setBrut(s);
        // On ne borne pas ici : « 35 » commence par « 3 ».
        onChange(versNombre(s));
      }}
      onBlur={() => {
        focus.current = false;
        let n = versNombre(brut);
        if (n === null) n = defaut;                       // vide → la valeur par défaut, et seulement maintenant
        if (n !== null) {
          if (min !== undefined && min !== null) n = Math.max(Number(min), n);
          if (max !== undefined && max !== null) n = Math.min(Number(max), n);
        }
        setBrut(versTexte(n));
        onChange(n);
      }}
      {...reste}
    />
  );
}

export default ChampNombre;
