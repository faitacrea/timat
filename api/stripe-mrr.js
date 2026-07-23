// Calcule le MRR (revenu mensuel recurrent estime) et le nombre d'abonnes Pro
// actifs / en essai, directement depuis Stripe (aucune donnee stockee en base).
// GET /api/stripe-mrr
// Reponse : { ok:true, mode:"test"|"live", currency:"eur", mrrCents, mrrFormatted, activeCount, trialingCount }
//
// Necessite la variable Vercel STRIPE_SECRET_KEY (deja utilisee par le checkout existant).

import Stripe from "stripe";
import { requireAdmin } from "./_admin.js";

export default async function handler(req, res) {
  try {
    if (!(await requireAdmin(req, res))) return;

    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      res.status(500).json({ ok: false, error: "STRIPE_SECRET_KEY manquante dans les variables Vercel." });
      return;
    }

    const stripe = new Stripe(secretKey, { apiVersion: "2024-06-20" });
    const mode = secretKey.startsWith("sk_live_") ? "live" : "test";

    let mrrCents = 0;
    let activeCount = 0;
    let trialingCount = 0;
    let currency = "eur";

    let hasMore = true;
    let startingAfter;

    while (hasMore) {
      const page = await stripe.subscriptions.list({
        status: "all",
        limit: 100,
        starting_after: startingAfter,
        expand: ["data.items.data.price"],
      });

      for (const sub of page.data) {
        if (sub.status !== "active" && sub.status !== "trialing") continue;
        if (sub.status === "trialing") trialingCount++;
        if (sub.status === "active") activeCount++;

        for (const item of sub.items.data) {
          const price = item.price;
          if (!price || !price.unit_amount || !price.recurring) continue;
          currency = price.currency || currency;
          const qty = item.quantity || 1;
          let monthly = price.unit_amount * qty;
          const { interval, interval_count } = price.recurring;
          if (interval === "year") monthly = monthly / (12 * interval_count);
          else if (interval === "week") monthly = (monthly * (52 / 12)) / interval_count;
          else if (interval === "day") monthly = (monthly * 30) / interval_count;
          else if (interval === "month") monthly = monthly / interval_count;
          // Le MRR ne compte que les abonnements deja factures (pas les essais gratuits)
          if (sub.status === "active") mrrCents += monthly;
        }
      }

      hasMore = page.has_more;
      startingAfter = page.data.length ? page.data[page.data.length - 1].id : undefined;
    }

    mrrCents = Math.round(mrrCents);

    res.status(200).json({
      ok: true,
      mode,
      currency,
      mrrCents,
      mrrFormatted: (mrrCents / 100).toLocaleString("fr-FR", {
        style: "currency",
        currency: currency.toUpperCase(),
      }),
      activeCount,
      trialingCount,
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || "Erreur Stripe inconnue." });
  }
}
