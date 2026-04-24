export default async function handler(req, res) {
  console.log("🔥 REAL REQUEST HIT");
  console.log("METHOD:", req.method);
  console.log("BODY:", req.body);

  return res.status(200).json({
    ok: true,
    method: req.method,
    body: req.body
  });
}
