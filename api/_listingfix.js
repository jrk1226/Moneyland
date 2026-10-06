// Listing check-up: puts each live Etsy listing in the most specific category, fills in Etsy's
// attributes (age, holiday, occasion, subject...) and files it in a shop section. Runs once per listing.
const { db, claudeJSON } = require("./_lib");

const SECTIONS = { kids: "Kids Activities", planner: "Planners", party: "Party Printables", wallart: "Wall Art", other: "More Printables" };
const KEYS = /planner|calendar|agenda|journal|worksheet|education|learning|school|coloring|colouring|activit|game|puzzle|party|invitation|print|wall|decor|sticker|label|banner|topper|card|bingo|certificate|chart|template|paper|baby|kid|christmas|holiday|halloween|easter|birthday|shower|wedding|stationery|organiz|art/i;

let flatCache = null;
async function flatTaxonomy(etsy) {
  if (flatCache) return flatCache;
  const d = await etsy("/application/seller-taxonomy/nodes", { noAuth: true });
  const flat = [];
  const walk = (n, p) => { const path = p.concat(n.name); flat.push({ id: n.id, path: path.join(" > "), leaf: !(n.children || []).length }); (n.children || []).forEach(c => walk(c, path)); };
  (d.results || []).forEach(n => walk(n, []));
  return (flatCache = flat);
}

async function pickCategory(etsy, spec) {
  const flat = await flatTaxonomy(etsy);
  const cands = flat.filter(t => KEYS.test(t.path) && /^(Paper & Party Supplies|Art & Collectibles|Toys & Games|Home & Living|Books, Movies & Music|Craft Supplies & Tools)/.test(t.path)).slice(0, 400);
  const prompt = "Pick the single most specific Etsy category for this printable digital download, so it shows up for the right buyer searches.\n"
    + "Product: " + spec.title + " - " + (spec.subtitle || "") + " (type: " + (spec.category || "") + ")\n"
    + "Categories (id: path):\n" + cands.map(c => c.id + ": " + c.path).join("\n")
    + "\nPrefer a deep, specific category over a broad one. Reply with only JSON: {\"id\": number, \"why\": \"short\"}";
  const out = (await claudeJSON({ tier: "quick", prompt, maxTokens: 300 })).data;
  const hit = cands.find(c => c.id === Number(out.id));
  return hit || null;
}

async function pickProperties(etsy, taxId, spec) {
  const d = await etsy("/application/seller-taxonomy/nodes/" + taxId + "/properties", { noAuth: true });
  const props = (d.results || []).filter(p => p.supports_attributes !== false && (p.possible_values || []).length);
  if (!props.length) return [];
  const prompt = "Fill in Etsy listing attributes for this printable digital download. Only choose values that are clearly true for the product; skip anything unsure. Attributes help buyers find it with search filters.\n"
    + "Product: " + spec.title + " - " + (spec.subtitle || "") + ". Theme: " + (spec.theme || spec.palette || "") + ". Tags: " + (((spec.listing || {}).tags) || []).join(", ") + "\n"
    + "Attributes (property_id | name | max values | allowed values as value_id=name):\n"
    + props.map(p => p.property_id + " | " + (p.display_name || p.name) + " | " + (p.is_multivalued ? (p.max_values_allowed || 5) : 1) + " | " + p.possible_values.slice(0, 120).map(v => v.value_id + "=" + v.name).join("; ")).join("\n")
    + "\nReply with only JSON: {\"set\": [{\"property_id\": number, \"value_ids\": [numbers]}]}";
  const out = (await claudeJSON({ tier: "quick", prompt, maxTokens: 1500 })).data;
  const res = [];
  (out.set || []).forEach(s => {
    const p = props.find(x => x.property_id === Number(s.property_id)); if (!p) return;
    const max = p.is_multivalued ? (p.max_values_allowed || 5) : 1;
    const vals = (s.value_ids || []).map(Number).map(id => p.possible_values.find(v => v.value_id === id)).filter(Boolean).slice(0, max);
    if (vals.length) res.push({ property_id: p.property_id, name: p.display_name || p.name, value_ids: vals.map(v => v.value_id), values: vals.map(v => v.name), scale_id: vals[0].scale_id || null });
  });
  return res;
}

async function setProperty(etsy, base, pr) {
  const path = base + "/properties/" + pr.property_id;
  try { return await etsy(path, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ value_ids: pr.value_ids, values: pr.values, ...(pr.scale_id ? { scale_id: pr.scale_id } : {}) }) }); }
  catch (e) {
    const f = new URLSearchParams(); pr.value_ids.forEach(v => f.append("value_ids[]", String(v))); pr.values.forEach(v => f.append("values[]", v)); if (pr.scale_id) f.append("scale_id", String(pr.scale_id));
    return etsy(path, { method: "PUT", headers: { "content-type": "application/x-www-form-urlencoded" }, body: f.toString() });
  }
}

async function sectionId(etsy, shopId, category) {
  const title = SECTIONS[category] || SECTIONS.other;
  const st = (await db("settings?id=eq.1&select=shop_sections"))[0] || {};
  const map = st.shop_sections || {};
  if (map[title]) return map[title];
  const list = await etsy("/application/shops/" + shopId + "/sections");
  let s = (list.results || []).find(x => String(x.title).toLowerCase() === title.toLowerCase());
  if (!s) s = await etsy("/application/shops/" + shopId + "/sections", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ title }).toString() });
  map[title] = s.shop_section_id;
  await db("settings?id=eq.1", { method: "PATCH", body: { shop_sections: map } });
  return s.shop_section_id;
}

// Returns a short text of what changed, or throws.
async function checkup(p, note) {
  const { etsy, link } = require("./_etsy"); const l = await link();
  const spec = p.spec || {}, L = spec.listing || {}, fix = Object.assign({}, L.checkup || {});
  const base = "/application/shops/" + l.shop_id + "/listings/" + p.etsy_listing_id;
  const done = [];
  if (!fix.category) {
    const cat = await pickCategory(etsy, spec);
    if (cat) { await etsy(base, { method: "PATCH", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ taxonomy_id: String(cat.id) }).toString() });
      fix.category = { id: cat.id, path: cat.path }; done.push("category: " + cat.path); }
  }
  if (fix.category && !fix.attributes) {
    const prs = await pickProperties(etsy, fix.category.id, spec), ok = [];
    for (const pr of prs) { try { await setProperty(etsy, base, pr); ok.push(pr.name + ": " + pr.values.join(", ")); } catch (e) {} }
    fix.attributes = ok; if (ok.length) done.push(ok.length + " attributes (" + ok.join("; ").slice(0, 200) + ")");
  }
  if (!fix.section) {
    try { const sid = await sectionId(etsy, l.shop_id, spec.category);
      await etsy(base, { method: "PATCH", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ shop_section_id: String(sid) }).toString() });
      fix.section = SECTIONS[spec.category] || SECTIONS.other; done.push("shop section: " + fix.section); }
    catch (e) { if (e.status !== 403) throw e; } // needs the shops_w permission; tried again after Josh reconnects Etsy
  }
  fix.at = new Date().toISOString();
  const newSpec = Object.assign({}, spec, { listing: Object.assign({}, L, { checkup: fix }) });
  await db("products?id=eq." + p.id, { method: "PATCH", body: { spec: newSpec } });
  return done;
}

async function runCheckups(max, note) {
  const live = await db("products?select=id,spec,etsy_listing_id&etsy_state=eq.active&order=id.asc");
  const todo = live.filter(p => { const c = ((p.spec || {}).listing || {}).checkup || {};
    if (c.failedAt && Date.now() - new Date(c.failedAt).getTime() < 86400000) return false;
    return !c.category || !c.attributes || !c.section; }).slice(0, max);
  let n = 0;
  for (const p of todo) {
    const c = ((p.spec || {}).listing || {}).checkup || {}; const first = !c.at;
    try { const done = await checkup(p, note); if (done.length) { n++; await note("Listing check-up for \"" + p.spec.title + "\": " + done.join(" | ")); } }
    catch (e) {
      if (first) await note("Listing check-up for \"" + p.spec.title + "\" did not finish (will try again tomorrow): " + String(e.message).slice(0, 200));
      const spec = p.spec, L = spec.listing || {};
      await db("products?id=eq." + p.id, { method: "PATCH", body: { spec: Object.assign({}, spec, { listing: Object.assign({}, L, { checkup: Object.assign({}, L.checkup || {}, { failedAt: new Date().toISOString(), at: new Date().toISOString() }) }) }) } }).catch(() => {});
    }
  }
  return n;
}
module.exports = { runCheckups, SECTIONS };
