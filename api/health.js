// Health checker (every 15 minutes): checks every part of Moneyland, fixes what it safely can,
// and saves a list of status lights for the website (settings.health). POST {action:"run"} runs it now.
const { cfg, codeOk, readBody, db, claude, beat } = require("./_lib");
const openaiKey = () => process.env.OPENAI_API_KEY || process.env.Open_AI || process.env.OPEN_AI || process.env.OPENAI_KEY || "";

const MIN = 60000, HOUR = 60 * MIN;
const ago = t => t ? Date.now() - new Date(t).getTime() : Infinity;
const mins = ms => ms === Infinity ? "never" : ms < HOUR ? Math.round(ms / MIN) + " min ago" : ms < 48 * HOUR ? Math.round(ms / HOUR) + " hours ago" : Math.round(ms / (24 * HOUR)) + " days ago";
async function note(text) { try { await db("autopilot_log", { method: "POST", prefer: "return=minimal", body: [{ kind: "health", text: String(text).slice(0, 500) }] }); } catch (e) {} }

async function check(prev) {
  const c = cfg(), out = [], fixes = [];
  const add = (key, name, state, text) => out.push({ key, name, state, text });
  const st = (await db("settings?id=eq.1"))[0] || {};
  const memo = Object.assign({}, (prev && prev.memo) || {});
  const beats = {}; (await db("heartbeats?select=*")).forEach(b => { beats[b.job] = b; });

  // 1. Etsy connection (asking for a token also refreshes it when it is about to run out)
  let etsyOk = false, shopId = null;
  try {
    const E = require("./_etsy");
    if (!E.etsyConfigured()) add("etsy", "Etsy connection", "bad", "The Etsy app keys are missing in Vercel.");
    else { const { link } = await E.accessToken(); shopId = link.shop_id; await E.etsy("/application/shops/" + shopId); etsyOk = true;
      add("etsy", "Etsy connection", "ok", "Connected to " + (link.shop_name || "the shop") + "."); }
  } catch (e) { add("etsy", "Etsy connection", "bad", "Etsy is not answering: " + String(e.message).slice(0, 140) + ". If this stays red, tap Reconnect Etsy."); }

  // 2. Claude (the brain) - a tiny test once an hour
  if (!c.ai) add("claude", "Claude AI key", "bad", "The Claude key is missing in Vercel.");
  else if (ago(memo.claude_at) < HOUR && memo.claude_ok) add("claude", "Claude AI key", "ok", "Working (checked " + mins(ago(memo.claude_at)) + ").");
  else {
    try { await claude({ tier: "quick", prompt: "Reply with the word OK.", maxTokens: 5 }); memo.claude_ok = true; add("claude", "Claude AI key", "ok", "Working."); }
    catch (e) { memo.claude_ok = false; add("claude", "Claude AI key", "bad", "Claude is refusing requests: " + String(e.message).slice(0, 140) + ". Check the Anthropic account has credit."); }
    memo.claude_at = new Date().toISOString();
  }

  // 3. Picture AI (OpenAI) - optional
  if (!openaiKey()) add("pictures", "Picture AI key", "off", "Not set up yet. Add OPENAI_API_KEY in Vercel to turn on lifestyle photos.");
  else if (ago(memo.pic_at) < HOUR && memo.pic_ok) add("pictures", "Picture AI key", "ok", "Working (checked " + mins(ago(memo.pic_at)) + ").");
  else {
    try { const r = await fetch("https://api.openai.com/v1/models", { headers: { Authorization: "Bearer " + openaiKey() } });
      memo.pic_ok = r.ok; add("pictures", "Picture AI key", r.ok ? "ok" : "bad", r.ok ? "Working." : "OpenAI says the key is not valid (" + r.status + ")."); }
    catch (e) { memo.pic_ok = false; add("pictures", "Picture AI key", "warn", "Could not reach OpenAI: " + e.message); }
    memo.pic_at = new Date().toISOString();
  }

  // 4. Research Room
  if (st.research_on === false) add("research", "Research Room", "off", "Switched off.");
  else { const runs = await db("research_runs?select=ran_at,ok,summary&order=id.desc&limit=3"), last = runs[0];
    const lastOk = runs.find(r => r.ok);
    if (!last) add("research", "Research Room", "warn", "Has not run yet.");
    else if (ago(lastOk && lastOk.ran_at) > 3 * HOUR) add("research", "Research Room", "bad", "No good research for " + mins(ago(lastOk && lastOk.ran_at)) + ". Last try: " + String(last.summary || "").slice(0, 120));
    else if (!last.ok) add("research", "Research Room", "warn", "Last run failed, the one before worked. It retries every hour.");
    else add("research", "Research Room", "ok", "Last research " + mins(ago(last.ran_at)) + "."); }

  // 5. Autopilot (build + publish)
  const ab = beats.autopilot;
  if (!st.autopilot) add("autopilot", "Autopilot", "off", "Switched off.");
  else if (!ab) add("autopilot", "Autopilot", "warn", "Waiting for its first check-in (runs every 10 minutes).");
  else if (ago(ab.at) > 35 * MIN) add("autopilot", "Autopilot", "bad", "Has not run since " + mins(ago(ab.at)) + ". The Vercel timer may be stuck.");
  else if (!ab.ok) add("autopilot", "Autopilot", "warn", "Last run stopped with a problem: " + String(ab.note).slice(0, 140));
  else add("autopilot", "Autopilot", "ok", "Ran " + mins(ago(ab.at)) + ".");

  // 6. Publishing: products waiting while nothing goes live
  const since36 = new Date(Date.now() - 36 * HOUR).toISOString();
  const [recentPub, waiting, failed] = await Promise.all([
    db("products?select=id&published_at=gte." + since36), db("products?select=id&status=in.(review,approved)&qa_note=is.null"),
    db("products?select=id,spec->>title,qa_note&qa_note=like.Etsy%20upload%20failed*")]);
  // auto-fix: retry failed Etsy uploads (up to 3 times, 6 hours apart)
  memo.retry = memo.retry || {};
  for (const p of failed) { const r = memo.retry[p.id] || { n: 0, at: null };
    if (r.n < 3 && ago(r.at) > 6 * HOUR) { await db("products?id=eq." + p.id, { method: "PATCH", body: { qa_note: null } }); memo.retry[p.id] = { n: r.n + 1, at: new Date().toISOString() }; fixes.push("Put \"" + p.title + "\" back in line to publish (Etsy upload failed before, try " + (r.n + 1) + " of 3)."); } }
  if (st.publish_on === false) add("publish", "Etsy Publishing", "off", "Switched off.");
  else if (!recentPub.length && waiting.length && st.autopilot) add("publish", "Etsy Publishing", "warn", "Nothing published in 36 hours although " + waiting.length + " products are waiting.");
  else add("publish", "Etsy Publishing", failed.length ? "warn" : "ok", recentPub.length + " published in the last 36 hours, " + waiting.length + " waiting." + (failed.length ? " " + failed.length + " had Etsy upload trouble (retrying)." : ""));

  // 7. Live listings really live on Etsy
  if (etsyOk) {
    try {
      const E = require("./_etsy");
      const live = await db("products?select=id,etsy_listing_id,spec->>title&etsy_state=eq.active");
      const onEtsy = new Set(((await E.etsy("/application/shops/" + shopId + "/listings?state=active&limit=100")).results || []).map(x => String(x.listing_id)));
      let off = 0;
      for (const p of live) if (p.etsy_listing_id && !onEtsy.has(String(p.etsy_listing_id))) {
        off++;
        try { const l = await E.etsy("/application/listings/" + p.etsy_listing_id); await db("products?id=eq." + p.id, { method: "PATCH", body: { etsy_state: l.state || "inactive" } }); fixes.push("\"" + p.title + "\" is " + (l.state || "not active") + " on Etsy now, updated Moneyland to match."); }
        catch (e) { if (e.status === 404) { await db("products?id=eq." + p.id, { method: "PATCH", body: { etsy_state: "removed" } }); fixes.push("\"" + p.title + "\" was removed from Etsy, updated Moneyland to match."); } }
      }
      add("listings", "Live listings", off ? "warn" : "ok", (live.length - off) + " listings live on Etsy." + (off ? " " + off + " were not live any more (see log)." : ""));
    } catch (e) { add("listings", "Live listings", "warn", "Could not compare with Etsy: " + String(e.message).slice(0, 120)); }
  }

  // 8. Sales counter
  if (st.sales_on === false) add("sales", "Sales Counter", "off", "Switched off.");
  else { const l = (await db("etsy_link?select=last_sync&id=eq.1"))[0] || {};
    const a = ago(l.last_sync);
    add("sales", "Sales Counter", a > 45 * MIN ? "bad" : "ok", a > 45 * MIN ? "Has not read Etsy orders since " + mins(a) + "." : "Read Etsy orders " + mins(a) + "."); }

  // 9. Marketing Room
  const mb = beats.marketing;
  if (st.marketing_on === false) add("marketing", "Marketing Room", "off", "Switched off.");
  else if (!mb) add("marketing", "Marketing Room", "warn", "Waiting for its first check-in.");
  else add("marketing", "Marketing Room", ago(mb.at) > 35 * MIN ? "bad" : "ok", ago(mb.at) > 35 * MIN ? "Has not run since " + mins(ago(mb.at)) + "." : "Ran " + mins(ago(mb.at)) + ".");

  // 10. Photo Studio (videos + lifestyle photos)
  const sb = beats.studio;
  const media = await db("products?select=media&etsy_state=eq.active");
  const withVid = media.filter(p => p.media && p.media.video_id).length, withPics = media.filter(p => p.media && (p.media.lifestyle || []).length).length;
  const cover = withVid + " of " + media.length + " listings have a video" + (openaiKey() ? ", " + withPics + " have lifestyle photos." : ".");
  if (st.studio_on === false || st.marketing_on === false) add("studio", "Photo Studio", "off", "Switched off. " + cover);
  else if (!sb) add("studio", "Photo Studio", "warn", "Waiting for its first check-in. " + cover);
  else if (ago(sb.at) > 40 * MIN) add("studio", "Photo Studio", "bad", "Has not run since " + mins(ago(sb.at)) + ". " + cover);
  else if (!sb.ok) add("studio", "Photo Studio", "warn", "Last job had a problem: " + String(sb.note).slice(0, 120) + " " + cover);
  else add("studio", "Photo Studio", "ok", cover);

  // 11. Pinterest (optional)
  try { const P = require("./_pinterest"), pl = P.configured() ? await P.plink() : null;
    add("pinterest", "Pinterest", !P.configured() || !(pl && pl.refresh_token) ? "off" : "ok", !P.configured() ? "Not set up yet." : !(pl && pl.refresh_token) ? "App keys added, not connected yet." : "Connected" + (pl.username ? " as " + pl.username : "") + "."); } catch (e) {}

  // 12. Error pile-up
  const errs = await db("autopilot_log?select=at,text&kind=eq.error&at=gte." + new Date(Date.now() - 6 * HOUR).toISOString() + "&order=id.desc&limit=20");
  add("errors", "Problems in the last 6 hours", errs.length >= 5 ? "bad" : errs.length >= 2 ? "warn" : "ok", errs.length ? errs.length + " problems. Latest: " + String(errs[0].text).slice(0, 140) : "None.");

  for (const f of fixes) await note("Health check fixed: " + f);
  const rank = { bad: 3, warn: 2, ok: 1, off: 0 }, worst = out.reduce((m, x) => rank[x.state] > rank[m] ? x.state : m, "ok");
  return { at: new Date().toISOString(), overall: worst, checks: out, fixes, memo };
}

module.exports = async (req, res) => {
  const c = cfg();
  const isCron = req.method === "GET" && /vercel-cron/i.test(String(req.headers["user-agent"] || ""));
  try {
    if (!c.db) return res.status(200).json({ skipped: "not set up" });
    if (!isCron) { const body = readBody(req); if (req.method !== "POST" || !codeOk(req, body)) return res.status(401).json({ error: "Wrong or missing access code.", code: "needs_code" }); }
    const prev = ((await db("settings?select=health&id=eq.1"))[0] || {}).health;
    const h = await check(prev);
    const changed = prev && prev.overall !== h.overall;
    await db("settings?id=eq.1", { method: "PATCH", body: { health: h } });
    if (changed) await note(h.overall === "ok" ? "Health check: everything is working again." : "Health check: " + h.checks.filter(x => x.state === h.overall).map(x => x.name + " - " + x.text).join(" | ").slice(0, 400));
    await beat("health", true, h.overall);
    const safe = Object.assign({}, h); delete safe.memo;
    return res.status(200).json(safe);
  } catch (e) { await beat("health", false, e.message || e); return res.status(500).json({ error: String(e.message || e) }); }
};
