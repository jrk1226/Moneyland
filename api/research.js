// Research Lab: searches the web for high-value printable products people are buying on Etsy right now.
// Runs 4 times a day from the Vercel cron in vercel.json, or on demand from the website.
const { cfg, codeOk, readBody, db, claudeJSON } = require("./_lib");

// Each run looks at the market from a different angle so the ideas stay fresh.
const FOCUS = [
  "Upcoming holidays, seasons and events in the next 3 to 10 weeks that buyers are already shopping for (for example Thanksgiving, Christmas, New Year, Valentine's Day, Easter, back to school, summer).",
  "Etsy best sellers and top-rated digital downloads in printables: which listings show thousands of sales or reviews, and what exactly they sell and for how much.",
  "Underserved niches with strong demand and fewer sellers: specific buyers such as teachers, homeschool parents, new moms, small business owners, landlords, caregivers, coaches, church groups, scout leaders, seniors.",
  "High-price bundles: what multi-page printable bundles and mega packs sell well at $10 to $25 and what pages they include.",
];

module.exports = async (req, res) => {
  const c = cfg();
  if (!c.db || !c.ai) return res.status(503).json({ error: "The database or AI key is not set up yet.", code: "not_configured" });
  const isCron = req.method === "GET" && /vercel-cron/i.test(String(req.headers["user-agent"] || ""))
    && (!process.env.CRON_SECRET || req.headers.authorization === "Bearer " + process.env.CRON_SECRET);
  const body = req.method === "POST" ? readBody(req) : {};
  if (!isCron && !(req.method === "POST" && codeOk(req, body))) return res.status(401).json({ error: "Not allowed.", code: "needs_code" });
  try {
    const runs = await db("research_runs?select=ran_at,focus&order=id.desc&limit=4");
    const last = runs[0];
    const hours = last ? (Date.now() - new Date(last.ran_at).getTime()) / 3600000 : 99;
    if (hours < (isCron ? 0.75 : 0.25)) return res.status(429).json({ error: "Research ran " + Math.round(hours * 60) + " minutes ago. Try again a little later.", code: "rate_limited" });
    const usedFocus = runs.map(r => r.focus);
    const focus = FOCUS.find(f => !usedFocus.includes(f)) || FOCUS[new Date().getUTCHours() % FOCUS.length];

    const [products, oldIdeas] = await Promise.all([
      db("products?select=spec->>title,status,sales,price&order=id.desc&limit=200"),
      db("ideas?select=title&order=id.desc&limit=120"),
    ]);
    const have = products.map(p => p.title).filter(Boolean).join("; ") || "none";
    const seen = oldIdeas.map(i => i.title).join("; ") || "none";
    const sold = products.filter(p => p.sales > 0).map(p => p.title + " (" + p.sales + " sold at $" + p.price + ")").join("; ") || "no sales yet";
    const today = new Date().toLocaleDateString("en-US", { timeZone: "America/New_York", weekday: "long", year: "numeric", month: "long", day: "numeric" });

    const prompt = "Today is " + today + ". You are the research lab for a small Etsy shop. Your job is to find products that people are actively buying right now and that the shop can make and deliver easily.\n\n"
      + "WHAT THE SHOP CAN SELL: printable PDF digital downloads only. The buyer pays and Etsy delivers the file instantly. No physical items, no shipping, no print-on-demand, and nothing that needs custom work per order (no personalized names typed by the seller, no editable Canva or Corjl templates). Blank lines the buyer fills in by hand are fine. Pages are built from simple layouts: grids, checklists, tables and logs, lined boxes, planners, worksheets with generated math problems, tracing pages, bingo cards, word scrambles, signs, labels and tags, certificates. No illustrations, clip art or photos.\n\n"
      + "THIS RUN'S FOCUS: " + focus + "\n\n"
      + "Use web search. Look for hard evidence of buying: Etsy best seller badges, listings with many sales or reviews, Etsy market and search pages, trend reports, seasonal search trends, price ranges of top listings. Prefer ideas with proven demand, room to compete, and a price of $5 or more (bundles usually earn more than single pages).\n\n"
      + "Our current products: " + have + ".\nIdeas already suggested before (do not repeat or closely copy): " + seen + ".\nOur sales so far: " + sold + ".\n\n"
      + "Reply with only JSON: {\"summary\": \"3-4 plain sentences on what you found and what to make next\", \"ideas\": [{\"title\": \"product name, max 60 chars\", \"category\": \"kids\"|\"planner\"|\"party\", \"buyer\": \"who buys it, max 40 chars\", \"why\": \"why it will sell, max 160 chars\", \"evidence\": \"what you found that proves demand, with numbers when you have them, max 220 chars\", \"demand\": \"High\"|\"Medium\"|\"Low\", \"competition\": \"High\"|\"Medium\"|\"Low\", \"price_range\": \"what similar listings charge, e.g. $6-$12\", \"price_hint\": number, \"score\": 1-10}]}. "
      + "Give the 4 best ideas, ranked best first. Score 8 or more only when demand is proven and the product is easy to make with the layouts above. No emojis.";
    const { data: out, blocks } = await claudeJSON({ tier: "smart", prompt, maxTokens: 6000, tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 8 }] });
    const sources = [];
    blocks.forEach(b => { if (b.type === "web_search_tool_result" && Array.isArray(b.content)) b.content.forEach(r => { if (r.url && sources.length < 12 && !sources.some(s => s.url === r.url)) sources.push({ url: r.url, title: r.title || r.url }); }); });
    const run = (await db("research_runs", { method: "POST", body: [{ trigger: isCron ? "auto" : "manual", focus, summary: String(out.summary || "").slice(0, 1200), ok: true }] }))[0];
    const lvl = v => ["High", "Medium", "Low"].includes(v) ? v : null;
    const ideas = (out.ideas || []).slice(0, 5).map(i => ({
      run_id: run.id, title: String(i.title || "").slice(0, 120), category: ["kids", "planner", "party"].includes(i.category) ? i.category : "planner",
      buyer: String(i.buyer || "").slice(0, 80), why: String(i.why || "").slice(0, 400), evidence: String(i.evidence || "").slice(0, 500), sources,
      demand: lvl(i.demand), competition: lvl(i.competition), price_range: String(i.price_range || "").slice(0, 40),
      price_hint: Number(i.price_hint) || null, score: Math.max(1, Math.min(10, parseInt(i.score, 10) || 5)),
    })).filter(i => i.title);
    const saved = ideas.length ? await db("ideas", { method: "POST", body: ideas }) : [];
    return res.status(200).json({ ok: true, run, ideas: saved });
  } catch (e) {
    try { await db("research_runs", { method: "POST", body: [{ trigger: isCron ? "auto" : "manual", summary: "Research failed: " + String(e.message || e).slice(0, 300), ok: false }] }); } catch (x) {}
    return res.status(500).json({ error: String(e.message || e) });
  }
};
