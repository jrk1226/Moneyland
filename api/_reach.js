// Reach Doctor (Marketing Room): once a day works out WHY the shop is not reaching buyers.
// It gathers hard facts (views, favorites, listing age, where each listing ranks in Etsy search for its
// main phrase, what the shop page is missing), then Claude and ChatGPT each write a diagnosis and
// Claude keeps the better one. Saved to settings.reach for the website.
const { db, claudeJSON } = require("./_lib");

const HOUR = 3600000;
async function facts() {
  const { etsy, link } = require("./_etsy");
  const l = await link();
  const shop = await etsy("/application/shops/" + l.shop_id);
  const live = await db("products?select=id,spec,price,etsy_listing_id,etsy_views,etsy_favs,published_at,media&etsy_state=eq.active&order=published_at.asc");
  const out = { shop: {
      name: shop.shop_name, active_listings: shop.listing_active_count, sales: shop.transaction_sold_count, reviews: shop.review_count || 0,
      has_icon: !!shop.icon_url_fullxfull, has_announcement: !!(shop.announcement && shop.announcement.trim()), has_title: !!(shop.title && shop.title.trim()),
      has_sale_message: !!(shop.digital_sale_message || shop.sale_message), vacation: !!shop.is_vacation, open_days: shop.create_date ? Math.round((Date.now() / 1000 - shop.create_date) / 86400) : null,
    }, listings: [], outside: {} };
  for (const p of live.slice(0, 12)) {
    const L = (p.spec && p.spec.listing) || {}, title = L.etsyTitle || p.spec.title || "";
    const phrase = (L.tags && L.tags[0]) || title.split(/[,|-]/)[0].trim().split(/\s+/).slice(0, 4).join(" ");
    let rank = null, total = null;
    try {
      const r = await etsy("/application/listings/active?keywords=" + encodeURIComponent(phrase) + "&limit=100&sort_on=score", { noAuth: true });
      total = r.count; const i = (r.results || []).findIndex(x => String(x.listing_id) === String(p.etsy_listing_id)); rank = i >= 0 ? i + 1 : null;
    } catch (e) {}
    out.listings.push({ title: p.spec.title, etsy_title: title, price: Number(p.price), hours_live: Math.round((Date.now() - new Date(p.published_at).getTime()) / HOUR),
      views: p.etsy_views || 0, favorites: p.etsy_favs || 0, search_phrase: phrase, rank_in_top_100: rank, competing_listings: total,
      has_video: !!(p.media && p.media.video_id), lifestyle_photos: ((p.media && p.media.lifestyle) || []).length });
  }
  const P = require("./_pinterest"), pl = P.configured() ? await P.plink().catch(() => null) : null;
  const st = (await db("settings?select=shop_text&id=eq.1"))[0] || {};
  out.outside = { pinterest: !P.configured() ? "not set up" : (pl && pl.refresh_token) ? "connected" : "keys added, not connected",
    pins_posted: (await db("pins?select=id&status=eq.posted")).length, shop_text_saved_on_etsy: !!(st.shop_text && st.shop_text.applied),
    etsy_ads: "unknown (Moneyland cannot see or change Etsy Ads; only the owner can turn them on)", social_media: "none", reviews: out.shop.reviews };
  return out;
}

async function diagnose(f) {
  const prompt = "You are the marketing lead for Bright Page Prints, an Etsy shop of digital downloads run almost entirely by AI. The owner asks: why are we not reaching people? "
    + "Use ONLY the facts below, and what is generally known about how Etsy search and Etsy shops work (new listings and new shops with no sales or reviews rank low at first; Etsy needs time and early clicks; outside traffic and Etsy Ads help new shops; more active listings help; photos, price and title matter). "
    + "Be honest: if the listings have only been live for hours, say that zero views is normal so far and what to expect. Rank the real causes, biggest first. For each give the fix and who does it: \"moneyland\" (the automated system can do it itself) or \"owner\" (needs the owner, e.g. turning on Etsy Ads, connecting Pinterest, approving an Etsy permission). Keep each line short and in plain words.\n"
    + "FACTS:\n" + JSON.stringify(f).slice(0, 12000)
    + "\nReply with only JSON: {\"headline\": \"one or two plain sentences answering the question\", \"causes\": [{\"cause\": \"...\", \"evidence\": \"the fact that shows it\", \"fix\": \"...\", \"who\": \"moneyland\"|\"owner\", \"impact\": \"high\"|\"medium\"|\"low\"}], \"expect\": \"what should happen over the next 1-2 weeks if the fixes are done\"}";
  const claudeAnswer = (await claudeJSON({ tier: "smart", prompt, maxTokens: 2500 })).data;
  const BO = require("./_bestof");
  return (await BO.bestOf({ task: "a diagnosis of why the shop is not reaching buyers", brief: "honest, specific, based on the facts, most important causes first, clear fixes and who does each",
    claudeAnswer, gptPrompt: prompt, valid: x => x.headline && Array.isArray(x.causes) && x.causes.length })).answer;
}

// Runs at most once every 20 hours unless forced.
async function run(force, note) {
  const st = (await db("settings?select=reach&id=eq.1"))[0] || {};
  if (!force && st.reach && Date.now() - new Date(st.reach.at).getTime() < 20 * HOUR) return null;
  const f = await facts();
  const d = await diagnose(f);
  const reach = { at: new Date().toISOString(), headline: String(d.headline || "").slice(0, 600), expect: String(d.expect || "").slice(0, 600),
    causes: (d.causes || []).slice(0, 8).map(c => ({ cause: String(c.cause || "").slice(0, 200), evidence: String(c.evidence || "").slice(0, 300), fix: String(c.fix || "").slice(0, 300), who: c.who === "owner" ? "owner" : "moneyland", impact: ["high", "medium", "low"].includes(c.impact) ? c.impact : "medium" })),
    facts: { listings: f.listings.map(x => ({ title: x.title, views: x.views, favorites: x.favorites, hours_live: x.hours_live, phrase: x.search_phrase, rank: x.rank_in_top_100, competing: x.competing_listings })), shop: f.shop, outside: f.outside } };
  await db("settings?id=eq.1", { method: "PATCH", body: { reach } });
  if (note) await note("Reach report: " + reach.headline);
  return reach;
}
module.exports = { run, facts };
