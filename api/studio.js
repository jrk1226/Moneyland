// Photo Studio cron (every 15 minutes): gives one live listing at a time its lifestyle photos and video.
// POST {action: "status"} for the website, POST {action: "run"} to run it now.
const { cfg, codeOk, readBody, db, beat } = require("./_lib");
const S = require("./_studio");

async function note(text) { try { await db("autopilot_log", { method: "POST", prefer: "return=minimal", body: [{ kind: "studio", text: String(text).slice(0, 500) }] }); } catch (e) {} }

async function runOnce(started) {
  const deadline = started + 280000;
  const prod = await S.nextForStudio();
  if (!prod) return { idle: "every live listing already has its photos and video" };
  try { const m = await S.upgradeListing(prod, deadline, note); return { product: prod.id, media: m }; }
  catch (e) {
    const m = Object.assign({}, prod.media || {}); m.failures = (m.failures || 0) + 1; m.failed_at = new Date().toISOString(); m.error = String(e.message || e).slice(0, 200);
    await db("products?id=eq." + prod.id, { method: "PATCH", body: { media: m } }).catch(() => {});
    await note("Studio could not finish \"" + prod.spec.title + "\" (will try again): " + m.error);
    throw e;
  }
}

module.exports = async (req, res) => {
  const c = cfg(), started = Date.now();
  const isCron = req.method === "GET" && /vercel-cron/i.test(String(req.headers["user-agent"] || ""));
  try {
    if (isCron) {
      if (!c.db || !c.ai) return res.status(200).json({ skipped: "not set up" });
      const st = (await db("settings?id=eq.1"))[0] || {};
      if (st.studio_on === false || st.marketing_on === false) { await beat("studio", true, "switched off"); return res.status(200).json({ skipped: "Studio is switched off" }); }
      try { const out = await runOnce(started); await beat("studio", true, out.idle || ("worked on product " + out.product)); return res.status(200).json(out); }
      catch (e) { await beat("studio", false, e.message || e); return res.status(200).json({ error: String(e.message || e) }); }
    }
    const body = readBody(req);
    if (req.method !== "POST" || !codeOk(req, body)) return res.status(401).json({ error: "Wrong or missing access code.", code: "needs_code" });
    if (body.action === "status") {
      const [live, scenes] = await Promise.all([db("products?select=id,spec->>title,media&etsy_state=eq.active&order=id.desc"), db("scenes?select=mood,ok")]);
      return res.status(200).json({ picturesKey: S.imagesConfigured(), live: live.map(p => ({ id: p.id, title: p.title, video: !!(p.media && p.media.video_id), photos: ((p.media && p.media.lifestyle) || []), videoUrl: p.media && p.media.video })),
        scenes: { good: scenes.filter(s => s.ok).length, total: scenes.length } });
    }
    if (body.action === "run") return res.status(200).json(await runOnce(started));
    return res.status(400).json({ error: "Unknown action." });
  } catch (e) { return res.status(500).json({ error: String(e.message || e) }); }
};
