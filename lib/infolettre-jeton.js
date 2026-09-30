// LE JETON DE DESINSCRIPTION.
//
// Il vit dans lib/ plutot que dans l'une des deux routes qui s'en servent : le
// mettre dans l'une d'elles creait un import circulaire — api/infolettre.js
// chargeait lib/infolettre-inscription.js, qui reimportait api/infolettre.js
// pour cette seule fonction. Ca marchait par chance, grace a l'import
// dynamique ; ce n'est pas une garantie sur laquelle on construit.
//
// Le jeton signe l'adresse avec la cle de service : un lien de desinscription
// ne peut donc pas etre forge pour une autre adresse que la sienne.
import { createHmac, timingSafeEqual } from 'node:crypto';

export function jeton(email) {
  return createHmac('sha256', process.env.SUPABASE_SERVICE_KEY || '')
    .update(`desinscription:${email}`)
    .digest('base64url')
    .slice(0, 32);
}

export function jetonValide(email, fourni) {
  if (!fourni) return false;
  const attendu = Buffer.from(jeton(email));
  const recu = Buffer.from(String(fourni));
  // Comparaison a temps constant : une comparaison ordinaire fuit, caractere
  // par caractere, de quoi reconstruire le jeton.
  return attendu.length === recu.length && timingSafeEqual(attendu, recu);
}
