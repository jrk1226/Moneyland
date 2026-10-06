// Research Lab: searches the web for high-value printable products people are buying on Etsy right now.
// Runs 4 times a day from the Vercel cron in vercel.json, or on demand from the website.
const { cfg, codeOk, readBody, db, claudeJSON } = require("./_lib");

// Each run looks at the market from a different angle so the ideas stay fresh.
const FOCUS = [
  "Upcoming holidays, seasons and events in the next 3 to 10 weeks that buyers are already shopping for (for example Thanksgiving, Christmas, New Year, Valentine's Day, Easter, back to school, summer).",
  "Etsy best sellers and top-rated digital downloads in printables: which listings show thousands of sales or reviews, and what exactly they sell and for how much.",
  "Underserved niches with strong demand and fewer sellers: specific buyers such as teachers, homeschool parents, new moms, small business owners, landlords, caregivers, coaches, church groups, scout leaders, seniors.",
  "High-price bundles: what multi-page printable bundles and mega packs sell well at $10 to $25 and what pages they include.",
  "Printable wall art: which digital art prints and sets (abstract, boho, botanical, quote, nursery, mid-century, seasonal) are best sellers right now, what palettes and styles, and at what prices.",
  "Kids activity books and coloring books: which printable activity packs, busy books, coloring books and worksheet bundles have the most sales and reviews, how many pages, and what activities they include.",
  "Clipart bundles and printable sticker sheets: which themes and art styles (watercolor, kawaii, vintage, retro) sell best to crafters, how many images per pack, and prices.",
  "Sublimation and shirt designs: best-selling tumbler wraps, mug wraps and shirt graphics bought by small crafting businesses, which themes and styles, and prices.",
  "Printable product labels and tags for small businesses that sell homemade goods (candles, jars, soap, baked goods, gifts): what sells, label shapes, and prices.",
  "Adult coloring books and wall art that men and gift buyers purchase: themes, styles, page counts and prices.",
  "Wide scan for any digital download that is selling extremely well on Etsy right now, even if it is outside our current product types (for example templates, stickers, clip art, patterns, games, guides). Bring the best ones so the owner can decide.",
];

module.exports = async (req, res) => {
  const c = cfg();
  if (!c.db || !c.ai) return res.status(503).json({ error: "The database or AI key is not set up yet.", code: "not_configured" });
  const isCron = req.method === "GET" && /vercel-cron/i.test(String(req.headers["user-agent"] || ""))
    && (!process.env.CRON_SECRET || req.headers.authorization === "Bearer " + process.env.CRON_SECRET);
  const body = req.method === "POST" ? readBody(req) : {};
  if (!isCron && !(req.method === "POST" && codeOk(req, body))) return res.status(401).json({ error: "Not allowed.", code: "needs_code" });
  try {
    if (isCron) { const st = (await db("settings?id=eq.1"))[0]; if (st && st.research_on === false) return res.status(200).json({ skipped: "Research Lab is switched off" }); }
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

    const prompt = "Today is " + today + ". You are the research lab for a small Etsy shop. Find products people are actively buying right now that sell well, so the shop can make better ones.\n\n"
      + "WHAT THE SHOP MAKES (instant digital downloads, delivered by Etsy, nothing shipped, nothing personalized per order):\n"
      + "- Kids activity books and worksheets: letter and number tracing, math sheets, counting, I spy, mazes, word searches, word scrambles, matching, dot to dot, shape tracing, coloring pages (cute line-art illustrations of animals, objects and simple scenes), drawing prompts, reward charts, chore charts, countdowns, letters to Santa. Preschool busy books, holiday activity packs and coloring books.\n"
      + "- Planners and trackers: calendars for any year, daily, weekly, habit, meal, budget, bill, savings, goals, cleaning, notes, and any table or checklist layout, in designer themes (sage boho, blush, navy, minimal, terracotta).\n"
      + "- Party printables: signs, food labels, bingo (word or picture), would-you-rather and trivia games, cupcake toppers, banners, invitations to fill in by hand, certificates.\n"
      + "- Printable wall art sets in 5 print ratios: abstract boho arches, sun and hills, mountains, botanical stems, mid-century Bauhaus shapes, waves, terrazzo, line flowers, rainbow stripes, quote typography, nursery animal prints.\n"
      + "- Art packs drawn by AI (ChatGPT) for crafters and small businesses: clipart bundles (transparent PNG), printable sticker sheets, sublimation designs (tumbler wraps, mug wraps, shirt graphics) and editable PDF product labels (candle, jar, soap, bakery labels).\n"
      + "- Adult coloring books: detailed mandalas, animals, florals and cozy scenes.\n"
      + "Aim for a mix of buyers, not only moms: crafters, small business owners who sell homemade goods, sublimation and shirt makers, teachers, adults who color, men and gift buyers.\n"
      + "It cannot make photos of real people, licensed characters, brand logos or editable Canva templates.\n\n"
      + "THIS RUN'S FOCUS: " + focus + "\n\n"
      + "Use web search. Look for hard evidence of buying: Etsy best seller badges, listings with many sales or reviews, Etsy market and search pages, trend reports, seasonal search trends, price ranges of top listings. Prefer proven demand, room to compete, and prices of $5 or more (bundles and sets earn more).\n\n"
      + "Our current products: " + have + ".\nIdeas already suggested before (do not repeat or closely copy): " + seen + ".\nOur sales so far: " + sold + ".\n\n"
      + "Reply with only JSON: {\"summary\": \"3-4 plain sentences on what you found and what to make next\", \"ideas\": [{\"title\": \"product name, max 60 chars\", \"category\": \"kids\"|\"planner\"|\"party\"|\"wallart\"|\"artpack\"|\"coloring\"|\"other\", \"fits\": true if the shop can make it with the list above, false if it needs something else, \"format\": \"what the product physically is, e.g. 40 page PDF activity book, set of 3 art prints, SVG cut files\", \"buyer\": \"who buys it, max 40 chars\", \"why\": \"why it will sell, max 160 chars\", \"evidence\": \"what proves demand, with numbers, max 220 chars\", \"demand\": \"High\"|\"Medium\"|\"Low\", \"competition\": \"High\"|\"Medium\"|\"Low\", \"price_range\": \"what similar listings charge, e.g. $6-$12\", \"price_hint\": number, \"score\": 1-10}]}. "
      + "Give the 4 best ideas, ranked best first. Up to 1 of them may have fits false when it is a great opportunity the owner should hear about. Score 8 or more only when demand is proven. No emojis.";
    // Claude and ChatGPT research at the same time; Claude cross-checks both lists and keeps the strongest ideas.
    const BO = require("./_bestof"), O = require("./_openai");
    const [cl, gp] = await Promise.all([
      claudeJSON({ tier: "smart", prompt, maxTokens: 6000, tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 8 }] }),
      O.configured() ? BO.gptResearch(prompt).catch(() => null) : Promise.resolve(null)]);
    const { blocks } = cl;
    let out = cl.data;
    if (gp && gp.data && (gp.data.ideas || []).length) { try { out = await BO.mergeIdeas(cl.data, gp.data); } catch (e) {} }
    const sources = (gp && gp.sources ? gp.sources.slice(0, 4) : []);
    blocks.forEach(b => { if (b.type === "web_search_tool_result" && Array.isArray(b.content)) b.content.forEach(r => { if (r.url && sources.length < 12 && !sources.some(s => s.url === r.url)) sources.push({ url: r.url, title: r.title || r.url }); }); });
    const run = (await db("research_runs", { method: "POST", body: [{ trigger: isCron ? "auto" : "manual", focus, summary: String(out.summary || "").slice(0, 1200), ok: true }] }))[0];
    const lvl = v => ["High", "Medium", "Low"].includes(v) ? v : null;
    const ideas = (out.ideas || []).slice(0, 5).map(i => ({
      run_id: run.id, title: String(i.title || "").slice(0, 120), category: ["kids", "planner", "party", "wallart", "artpack", "coloring", "other"].includes(i.category) ? i.category : "planner",
      fits: i.fits !== false && i.category !== "other", format: String(i.format || "").slice(0, 120),
      buyer: String(i.buyer || "").slice(0, 80), why: String(i.why || "").slice(0, 400), evidence: String(i.evidence || "").slice(0, 500), sources,
      demand: lvl(i.demand), competition: lvl(i.competition), price_range: String(i.price_range || "").slice(0, 40),
      price_hint: Number(i.price_hint) || null, score: Math.max(1, Math.min(10, parseInt(i.score, 10) || 5)),
      found_by: ["claude", "chatgpt", "both"].includes(i.from) ? i.from : "claude",
    })).filter(i => i.title);
    const saved = ideas.length ? await db("ideas", { method: "POST", body: ideas }) : [];
    return res.status(200).json({ ok: true, run, ideas: saved });
  } catch (e) {
    try { await db("research_runs", { method: "POST", body: [{ trigger: isCron ? "auto" : "manual", summary: "Research failed: " + String(e.message || e).slice(0, 300), ok: false }] }); } catch (x) {}
    return res.status(500).json({ error: String(e.message || e) });
  }
};
