// Art Studio cron (every 10 minutes): finishes the pictures for one product that is still "building"
// (art packs and coloring books). ChatGPT draws, Claude checks. POST {action:"run"} runs it now.
const { cfg, codeOk, readBody, db, beat } = require("./_lib");
const AG = require("./_artgoods");
async function note(kind, text) { try { await db("autopilot_log", { method: "POST", prefer: "return=minimal", body: [{ kind, text: String(text).slice(0, 500) }] }); } catch (e) {} }

async function runOnce(started) {
  const prod = (await db("products?select=*&status=eq.building&order=id.asc&limit=1"))[0];
  if (!prod) return { idle: "nothing waiting for pictures" };
  return AG.work(prod, started + 280000, note);
}
module.exports = async (req, res) => {
  const c = cfg(), started = Date.now();
  const isCron = req.method === "GET" && /vercel-cron/i.test(String(req.headers["user-agent"] || ""));
  try {
    if (!isCron) { const body = readBody(req); if (req.method !== "POST" || !codeOk(req, body)) return res.status(401).json({ error: "Wrong or missing access code.", code: "needs_code" }); }
    if (!c.db || !c.ai) return res.status(200).json({ skipped: "not set up" });
    const st = (await db("settings?id=eq.1"))[0] || {};
    if (isCron && st.build_on === false) { await beat("artworks", true, "switched off"); return res.status(200).json({ skipped: "Product Building is switched off" }); }
    try { const out = await runOnce(started); await beat("artworks", true, out.idle || ("product " + out.product + ": " + out.made + " made, " + out.left + " left")); return res.status(200).json(out); }
    catch (e) { await beat("artworks", false, e.message || e); await note("error", "Art Studio problem: " + (e.message || e)); return res.status(200).json({ error: String(e.message || e) }); }
  } catch (e) { return res.status(500).json({ error: String(e.message || e) }); }
};
