// Etsy Production: turns a Research Lab idea (or "make 3 new") into ready-to-review products.
const { cfg, codeOk, readBody } = require("./_lib");
const { buildProducts } = require("./_produce");

module.exports = async (req, res) => {
  const c = cfg();
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST." });
  if (!c.db || !c.ai) return res.status(503).json({ error: "The database or AI key is not set up yet.", code: "not_configured" });
  const body = readBody(req);
  if (!codeOk(req, body)) return res.status(401).json({ error: "Wrong or missing access code.", code: "needs_code" });
  try { return res.status(200).json({ ok: true, products: await buildProducts({ ideaId: body.ideaId, count: body.count }) }); }
  catch (e) { return res.status(e.status || 500).json({ error: String(e.message || e) }); }
};
