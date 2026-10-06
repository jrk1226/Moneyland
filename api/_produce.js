// Turns a researched idea (or "make N new") into finished products waiting in the queue. Shared by the website and Autopilot.
const { db, claudeJSON } = require("./_lib");
const { TEMPLATES } = require("./_spec");
const B = require("../lib/design/book");
const WA = require("../lib/design/wallart");

const AGK = ["clipart", "stickers", "sublimation", "labels"];
function valid(p) {
  if (!p || !p.title || !p.listing) return false;
  if (p.category === "artpack") return AGK.includes(p.kind) && Array.isArray(p.items) && p.items.length > 0;
  if (p.category === "wallart") return Array.isArray(p.prints) && p.prints.length > 0;
  return Array.isArray(p.pages) && p.pages.some(pg => B.TEMPLATES[pg && pg.template]);
}
function tidy(p) {
  p.v = 2;
  if (p.category === "artpack") {
    const max = { clipart: 30, stickers: 24, sublimation: 4, labels: 3 }[p.kind] || 12;
    p.items = p.items.slice(0, max).map(it => ({ subject: String(it.subject || it.name || "").slice(0, 300), name: String(it.name || it.subject || "").slice(0, 40) })).filter(it => it.subject);
    if (p.kind === "sublimation" && !["tumbler", "shirt", "mug"].includes(p.product)) p.product = "tumbler";
    if (p.kind === "labels" && !["round", "rect"].includes(p.shape)) p.shape = "round";
    p.style = String(p.style || "soft watercolor").slice(0, 80);
  } else if (p.category === "wallart") {
    p.palette = WA.PAL[p.palette] ? p.palette : "boho";
    p.prints = p.prints.slice(0, 6).map((pr, i) => Object.assign({}, pr, { style: WA.STYLES.includes(pr.style) ? pr.style : "arches", seed: String(pr.seed || p.title + i) }));
  } else {
    p.template = "bundle";
    p.pages = p.pages.filter(pg => pg && B.TEMPLATES[pg.template]).slice(0, 40);
    // keep coloring books affordable to draw
    let subjects = 0; const cap = p.category === "coloring" ? 40 : 16;
    p.pages.forEach(pg => { if (pg.template === "coloring") { pg.subjects = (pg.subjects || [pg]).slice(0, Math.max(0, cap - subjects)); subjects += pg.subjects.length; } });
  }
  if (p.category !== "wallart" && p.category !== "artpack") p.coverArt = { subject: String((p.coverArt && p.coverArt.subject) || p.coverSubject || p.title).slice(0, 200) };
  delete p.coverSubject;
  const L = p.listing || {};
  L.tags = (L.tags || []).map(t => String(t).slice(0, 20)).filter(Boolean).slice(0, 13);
  L.etsyTitle = String(L.etsyTitle || p.title).slice(0, 140);
  p.listing = L;
  return p;
}
function pageCount(p) {
  if (p.category === "wallart") return p.prints.length;
  if (p.category === "artpack") return p.items.length;
  try { return B.build(p).pages.length; } catch (e) { return 0; }
}

async function buildProducts({ ideaId, count, deadline }) {
  deadline = deadline || Date.now() + 270000;
  const existing = await db("products?select=spec->>title,sales&order=id.desc&limit=200");
  const have = existing.map(r => r.title).filter(Boolean).join("; ") || "none";
  const best = existing.filter(r => r.sales > 0).sort((a, b) => b.sales - a.sales).slice(0, 5).map(r => r.title + " (" + r.sales + " sold)").join("; ") || "no sales yet";
  let idea = null, ask;
  if (ideaId) {
    idea = (await db("ideas?id=eq." + parseInt(ideaId, 10)))[0];
    if (!idea) { const e = new Error("Idea not found."); e.status = 404; throw e; }
    await db("ideas?id=eq." + idea.id, { method: "PATCH", body: { status: "building" } });
    ask = "Build ONE excellent product for this researched idea:\nTitle: " + idea.title + "\nCategory: " + idea.category + (idea.format ? "\nFormat: " + idea.format : "") + (idea.buyer ? "\nBuyer: " + idea.buyer : "")
      + "\nWhy: " + idea.why + "\nEvidence: " + idea.evidence + (idea.price_hint ? "\nSuggested price: $" + idea.price_hint : "")
      + "\nMake it better and bigger than the top competitors described in the evidence. It must be a digital download the buyer gets instantly; no personalization by the seller.";
  } else {
    const n = Math.min(3, Math.max(1, parseInt(count, 10) || 1));
    ask = "Create " + n + " NEW product" + (n > 1 ? "s" : "") + " that will sell well right now. Lean toward big bundles.";
  }
  try {
    const prompt = ask + "\n\nBest sellers so far: " + best + ".\nDo not repeat these existing products: " + have + ".\n\n" + TEMPLATES
      + "\n\nReply with only a JSON array of product objects. Use plain straight quotes only for JSON syntax; never put double quote characters inside text values.";
    let arr = (await claudeJSON({ tier: "smart", prompt, maxTokens: 30000 })).data; if (!Array.isArray(arr)) arr = arr.products || [arr];
    const specs = arr.filter(valid).slice(0, 3).map(tidy);
    if (!specs.length) throw new Error("The AI did not return a usable product. Try again.");
    // Pictures (coloring pages, art packs) are made afterwards by the Art Studio, a few per run.
    const AGx = require("./_artgoods");
    specs.forEach(s => { s.pageCount = pageCount(s); });
    const rows = specs.filter(s => s.pageCount > 0).map(p => ({ status: AGx.needsArt(p) ? "building" : "review", spec: p, source: idea ? "research" : "core", idea_id: idea ? idea.id : null, design_version: 2,
      price: Math.min(25, Math.max(1.5, Number(p.listing && p.listing.price) || 5)) }));
    if (!rows.length) throw new Error("The product came out empty. Try again.");
    const saved = await db("products", { method: "POST", body: rows });
    if (idea) await db("ideas?id=eq." + idea.id, { method: "PATCH", body: { status: "built" } });
    return saved;
  } catch (e) {
    if (idea) { try { await db("ideas?id=eq." + idea.id, { method: "PATCH", body: { status: "new" } }); } catch (x) {} }
    throw e;
  }
}
module.exports = { buildProducts, tidy, valid };
