// Moneyland data: products (Etsy Production) and ideas (Research Lab).
const { cfg, codeOk, readBody, db } = require("./_lib");

module.exports = async (req, res) => {
  const c = cfg();
  if (!c.db) return res.status(200).json({ configured: c });
  const body = req.method === "POST" ? readBody(req) : {};
  if (!codeOk(req, body)) return res.status(401).json({ error: "Wrong or missing access code.", code: "needs_code", configured: c });
  try {
    if (req.method === "GET") {
      const [products, ideas, runs, settings, plog] = await Promise.all([
        db("products?select=*&order=id.desc&limit=500"),
        db("ideas?select=*&status=neq.passed&order=id.desc&limit=60"),
        db("research_runs?select=*&order=id.desc&limit=1"),
        db("settings?id=eq.1"),
        db("autopilot_log?select=*&order=id.desc&limit=12"),
      ]);
      return res.status(200).json({ configured: c, products, ideas, lastRun: runs[0] || null, settings: settings[0] || null, autolog: plog });
    }
    if (req.method !== "POST") return res.status(405).json({ error: "Use GET or POST." });
    const id = parseInt(body.id, 10);
    if (body.action === "product.update" && id) {
      const f = body.fields || {}, patch = {};
      if (["review", "approved", "listed"].includes(f.status)) patch.status = f.status;
      if (f.price != null && Number(f.price) > 0) patch.price = Math.round(Number(f.price) * 100) / 100;
      if (f.sales != null && Number(f.sales) >= 0) patch.sales = Math.floor(Number(f.sales));
      const rows = await db("products?id=eq." + id, { method: "PATCH", body: patch });
      return res.status(200).json({ ok: true, product: rows[0] });
    }
    if (body.action === "product.delete" && id) {
      await db("products?id=eq." + id, { method: "DELETE", prefer: "return=minimal" });
      return res.status(200).json({ ok: true });
    }
    if (body.action === "seed" && Array.isArray(body.items)) {
      const have = await db("products?select=id&limit=1");
      if (have.length) return res.status(200).json({ ok: true, skipped: true });
      const rows = body.items.slice(0, 20).filter(p => p && p.template && p.title).map(p => ({ spec: p, price: Math.min(15, Math.max(1.5, Number(p.listing && p.listing.price) || 4)), source: "starter" }));
      const saved = rows.length ? await db("products", { method: "POST", body: rows }) : [];
      return res.status(200).json({ ok: true, products: saved });
    }
    if (body.action === "settings.set") {
      const f = body.fields || {}, patch = { updated_at: new Date().toISOString() };
      if (typeof f.autopilot === "boolean") patch.autopilot = f.autopilot;
      if (f.max_listings_per_day != null) patch.max_listings_per_day = Math.max(0, Math.min(20, parseInt(f.max_listings_per_day, 10) || 0));
      const rows = await db("settings?id=eq.1", { method: "PATCH", body: patch });
      return res.status(200).json({ ok: true, settings: rows[0] });
    }
    if (body.action === "idea.pass" && id) {
      await db("ideas?id=eq." + id, { method: "PATCH", body: { status: "passed" } });
      return res.status(200).json({ ok: true });
    }
    return res.status(400).json({ error: "Unknown action." });
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e) });
  }
};
