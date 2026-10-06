// Etsy Production: turns a Research Lab idea (or "make 3 new") into ready-to-review products.
const { cfg, codeOk, readBody, db, claude, parseJSON } = require("./_lib");
const { TEMPLATES } = require("./_spec");
const TPL = ["chart","reward","math","tracing","table","planner","letter","certificate","bingo","scramble","labels","sign","bundle"];

function valid(p) { return p && TPL.includes(p.template) && p.title && (p.template !== "bundle" || (Array.isArray(p.pages) && p.pages.length)); }

module.exports = async (req, res) => {
  const c = cfg();
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST." });
  if (!c.db || !c.ai) return res.status(503).json({ error: "The database or AI key is not set up yet.", code: "not_configured" });
  const body = readBody(req);
  if (!codeOk(req, body)) return res.status(401).json({ error: "Wrong or missing access code.", code: "needs_code" });
  try {
    const existing = await db("products?select=spec->>title,sales&order=id.desc&limit=200");
    const have = existing.map(r => r.title).filter(Boolean).join("; ") || "none";
    const best = existing.filter(r => r.sales > 0).sort((a, b) => b.sales - a.sales).slice(0, 5).map(r => r.title + " (" + r.sales + " sold)").join("; ") || "no sales yet";
    let idea = null, ask;
    if (body.ideaId) {
      const rows = await db("ideas?id=eq." + parseInt(body.ideaId, 10));
      idea = rows[0]; if (!idea) return res.status(404).json({ error: "Idea not found." });
      await db("ideas?id=eq." + idea.id, { method: "PATCH", body: { status: "building" } });
      ask = "Build ONE product for this researched idea:\nTitle: " + idea.title + "\nCategory: " + idea.category + (idea.buyer ? "\nBuyer: " + idea.buyer : "") + "\nWhy: " + idea.why + "\nEvidence: " + idea.evidence + (idea.price_hint ? "\nSuggested price: $" + idea.price_hint : "") + "\nPrefer a bundle of 3-8 pages if it fits the idea. It must be a printable PDF the buyer downloads instantly; no personalization by the seller.";
    } else {
      const n = Math.min(3, Math.max(1, parseInt(body.count, 10) || 3));
      ask = "Create " + n + " NEW products, ideally one from each category (kids, planner, party). Lean toward what sells.";
    }
    const prompt = ask + "\n\nBest sellers so far: " + best + ".\nDo not repeat these existing products: " + have + ".\n\n" + TEMPLATES + "\n\nReply with only a JSON array of product objects.";
    const { text } = await claude({ tier: "smart", prompt, maxTokens: 8000 });
    let arr = parseJSON(text); if (!Array.isArray(arr)) arr = arr.products || [arr];
    const rows = arr.filter(valid).slice(0, 4).map(p => ({
      status: "review", spec: p, source: idea ? "research" : "core", idea_id: idea ? idea.id : null,
      price: Math.min(15, Math.max(1.5, Number(p.listing && p.listing.price) || 4)),
    }));
    if (!rows.length) throw new Error("The AI did not return a usable product. Try again.");
    const saved = await db("products", { method: "POST", body: rows });
    if (idea) await db("ideas?id=eq." + idea.id, { method: "PATCH", body: { status: "built" } });
    return res.status(200).json({ ok: true, products: saved });
  } catch (e) {
    if (body.ideaId) { try { await db("ideas?id=eq." + parseInt(body.ideaId, 10), { method: "PATCH", body: { status: "new" } }); } catch (x) {} }
    return res.status(500).json({ error: String(e.message || e) });
  }
};
