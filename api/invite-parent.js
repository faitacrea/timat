import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

import { EMAIL_CONTACT, EMAIL_EXPEDITEUR } from "../data/coordonnees.js";
import { poserCors, utilisateurDeLaRequete, esc } from "./_authentifier.js";
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  // « * » laissait n'importe quel site appeler cette porte depuis le navigateur
  // de ses visiteurs. Les origines de TiMat suffisent.
  poserCors(req, res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  // L'IDENTITE VIENT DU JETON, PLUS DU CORPS DE LA REQUETE.
  //
  // « asmatId » arrivait dans le corps, et cette fonction ecrit AVEC LA CLE DE
  // SERVICE : n'importe qui pouvait donc creer une invitation au nom de
  // n'importe quelle assistante maternelle, vers n'importe quelle adresse — et
  // supprimer au passage les invitations en attente de cette personne.
  const appelant = await utilisateurDeLaRequete(req);
  if (!appelant) return res.status(401).json({ error: "Authentification requise" });

  try {
    const { emailParent, prenomEnfant, prenomAsmat, prenomParent, enfantId, inviteToken } = req.body || {};
    if (!emailParent) return res.status(400).json({ error: "Email requis" });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(emailParent)) || String(emailParent).length > 254) {
      return res.status(400).json({ error: "Email invalide" });
    }

    // C'est l'appelante qui invite, et personne d'autre.
    const asmatId = appelant.id;

    // Et l'enfant doit etre le sien. Sans cette verification, on pouvait
    // rattacher une invitation a l'enfant d'une autre.
    if (enfantId) {
      const { data: enf } = await supabase.from("enfants").select("id").eq("id", enfantId).eq("asmat_id", asmatId).maybeSingle();
      if (!enf) return res.status(403).json({ error: "Cet enfant n'est pas rattaché à votre compte" });
    }

    let delQuery = supabase.from("invitations").delete()
      .eq("asmat_id", asmatId)
      .eq("email_parent", emailParent)
      .eq("acceptee", false);
    delQuery = enfantId ? delQuery.eq("enfant_id", enfantId) : delQuery.is("enfant_id", null);
    await delQuery;

    const { error: dbError } = await supabase.from("invitations").insert({
      email_parent: emailParent,
      asmat_id: asmatId,
      enfant_id: enfantId || null,
      acceptee: false,
      created_at: new Date().toISOString()
    });

    if (dbError) {
      console.error("Invitation DB error:", dbError);
      return res.status(500).json({ error: "Enregistrement invitation : " + dbError.message });
    }

    // LE LIEN EST BATI ICI, PAS RECU.
    //
    // « inviteUrl » arrivait entier dans le corps de la requete et partait dans
    // le bouton d'un courriel signe par le domaine : de quoi envoyer les
    // parents de n'importe qui sur le site de n'importe qui.
    //
    // Le rattachement direct par jeton reste possible — c'est une vraie
    // fonction, le parent arrive sur l'espace de son enfant sans rien saisir —
    // mais on ne recoit plus que le JETON, et l'adresse est construite ici. Un
    // jeton ne peut designer que notre propre site.
    const jetonPropre = /^[A-Za-z0-9_-]{8,128}$/.test(String(inviteToken || "")) ? String(inviteToken) : null;
    const lien = jetonPropre
      ? "https://www.timat.app/?invite=" + encodeURIComponent(jetonPropre)
      : "https://www.timat.app?role=parent";
    // ET LES PRENOMS SONT ECHAPPES. Ils etaient colles tels quels dans le HTML :
    // un prenom contenant une balise s'executait chez la destinataire.
    const html = [
      "<h2 style='color:#2E4859'>Bonjour" + (prenomParent ? " " + esc(prenomParent) : "") + " 👋</h2>",
      "<p>" + (prenomAsmat ? esc(prenomAsmat) : "Votre assistante maternelle") + " vous invite à rejoindre TiMat pour suivre le quotidien de " + (prenomEnfant ? esc(prenomEnfant) : "votre enfant") + ".</p>",
      "<p>Dans votre espace parent, vous retrouverez :</p>",
      "<ul style='line-height:1.8;color:#33413F'>",
      "<li>📖 Sa journée en direct : repas, siestes, activités et photos privées</li>",
      "<li>🧮 Le salaire et les indemnités calculés automatiquement</li>",
      "<li>📋 Vos montants Pajemploi prêts à déclarer chaque mois</li>",
      "<li>📄 Contrat, bulletins et documents au même endroit</li>",
      "</ul>",
      "<p><strong>C'est 100 % gratuit pour vous</strong>, sans carte bancaire : votre accès est inclus dans l'abonnement de votre assistante maternelle.</p>",
      "<p>Créez votre compte avec <strong>cette adresse e-mail</strong> pour accéder directement à l'espace de votre enfant :</p>",
      "<p><a href='" + lien + "' style='background:#C4714A;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:700'>Créer mon espace parent</a></p>",
      "<p style='font-size:12px;color:#888;margin-top:22px'>Envie d'en savoir plus avant de créer votre compte ? <a href='https://www.timat.app/brochure-parents.html' style='color:#C4714A'>Découvrez ce que TiMat va changer pour vous</a>.</p>"
    ].join("");

    const { error: emailError } = await resend.emails.send({
      from: `TiMat <${EMAIL_EXPEDITEUR}>`,
      // noreply@ ne reçoit pas : sans replyTo, la réponse du parent part dans le vide.
      replyTo: EMAIL_CONTACT,
      to: emailParent,
      subject: "Votre assistante maternelle vous invite sur TiMat",
      html: html
    });

    if (emailError) {
      console.error("Resend error:", emailError);
      return res.status(200).json({ success: true, warning: "Invitation enregistrée, mais courriel non envoyé : " + emailError.message });
    }

    console.log("[Invite] Email envoye a", emailParent);
    return res.status(200).json({ success: true, message: "Invitation envoyée à " + emailParent });

  } catch (e) {
    console.error("Invite error:", e.message);
    return res.status(500).json({ error: e.message });
  }
}
