console.log("🔥 FUNCTION START");

export default async function handler(req, res) {
  try {
    console.log("🔥 ENTER HANDLER");
    console.log("METHOD:", req.method);
    console.log("BODY:", req.body);
    console.log("ENV STRIPE:", process.env.STRIPE_SECRET_KEY ? "OK" : "MISSING");

    return res.status(200).json({ ok: true });

  } catch (e) {
    console.error("🔥 CRASH:", e);
    return res.status(500).json({ error: e.message });
  }
}
