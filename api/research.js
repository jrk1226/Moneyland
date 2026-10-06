// Research Lab: searches the web for what is selling on Etsy and saves product ideas.
// Runs every morning from the Vercel cron in vercel.json, or on demand from the website.
const { cfg, codeOk, readBody, db, claude, parseJSON } = require("./_lib");

module.exports = async (req, res) => {
  const c = cfg();
  if (!c.db || !c.ai) return res.status(503).json({ error: "The database or AI key is not set up yet.", code: "not_configured" });
  const isCron = req.method === "GET" && /vercel-cron/i.test(String(req.headers["user-agent"] || ""))
    && (!process.env.CRON_SECRET || req.headers.authorization === "Bearer " + process.env.CRON_SECRET);
  const body = req.method === "POST" ? readBody(req) : {};
  if (!isCron && !(req.method === "POST" && codeOk(req, body))) return res.status(401).json({ error: "Not allowed.", code: "needs_code" });
  try {
    const last = (await db("research_runs?select=ran_at&order=id.desc&limit=1"))[0];
    const hours = last ? (Date.now() - new Date(last.ran_at).getTime()) / 3600000 : 99;
    if (hours < (isCron ? 6 : 0.5)) return res.status(429).json({ error: "Research already ran " + Math.round(hours * 60) + " minutes ago. Try again later.", code: "rate_limited" });

    const products = await db("products?select=spec->>title,status,sales&order=id.desc&limit=200");
    const have = products.map(p => p.title).filter(Boolean).join("; ") || "none";
    const sold = products.filter(p => p.sales > 0).map(p => p.title + " (" + p.sales + ")").join("; ") || "no sales yet";
    const today = new Date().toLocaleDateString("en-US", { timeZone: "America/New_York", weekday: "long", year: "numeric", month: "long", day: "numeric" });
    const prompt = "Today is " + today + ". You are the research lab for a small Etsy shop that sells printable PDF digital downloads in three categories: kids (charts, worksheets, activity packs), planners and trackers, and party and event printables. Everything is made from simple layouts (grids, checklists, tables, lined boxes, worksheets, bingo cards, word scrambles, signs, labels, certificates); no illustrations or photos.\n\n"
      + "Use web search to find what is selling and trending on Etsy right now for printables like these, and which holidays, seasons and events in the next 4 to 10 weeks buyers will shop for. Look for real signals: Etsy best seller lists, Etsy market pages, trend reports, search trend articles.\n\n"
      + "Our shop already has: " + have + ". Our sales so far: " + sold + ".\n\n"
      + "Then reply with only JSON in this shape: {\"summary\": \"3-4 plain sentences on what you found and what to focus on this week\", \"ideas\": [{\"title\": \"product name, max 60 chars\", \"category\": \"kids\"|\"planner\"|\"party\", \"why\": \"why it should sell, max 160 chars\", \"evidence\": \"what you saw in the research, max 200 chars\", \"price_hint\": number, \"score\": 1-10}]}. Give 5 ideas that we do not already have, ranked best first. No emojis.";
    const { text, blocks } = await claude({ tier: "smart", prompt, maxTokens: 6000, tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 8 }] });
    const out = parseJSON(text);
    const sources = [];
    blocks.forEach(b => { if (b.type === "web_search_tool_result" && Array.isArray(b.content)) b.content.forEach(r => { if (r.url && sources.length < 12 && !sources.some(s => s.url === r.url)) sources.push({ url: r.url, title: r.title || r.url }); }); });
    const run = (await db("research_runs", { method: "POST", body: [{ trigger: isCron ? "daily" : "manual", summary: String(out.summary || "").slice(0, 1200), ok: true }] }))[0];
    const ideas = (out.ideas || []).slice(0, 6).map(i => ({
      run_id: run.id, title: String(i.title || "").slice(0, 120), category: ["kids", "planner", "party"].includes(i.category) ? i.category : "planner",
      why: String(i.why || "").slice(0, 400), evidence: String(i.evidence || "").slice(0, 500), sources,
      price_hint: Number(i.price_hint) || null, score: Math.max(1, Math.min(10, parseInt(i.score, 10) || 5)),
    })).filter(i => i.title);
    const saved = ideas.length ? await db("ideas", { method: "POST", body: ideas }) : [];
    return res.status(200).json({ ok: true, run, ideas: saved });
  } catch (e) {
    try { await db("research_runs", { method: "POST", body: [{ trigger: isCron ? "daily" : "manual", summary: "Research failed: " + String(e.message || e).slice(0, 300), ok: false }] }); } catch (x) {}
    return res.status(500).json({ error: String(e.message || e) });
  }
};
