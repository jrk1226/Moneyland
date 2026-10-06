// Cron: every 15 minutes, count real Etsy sales into Moneyland.
const { cfg } = require("./_lib");
const { etsyConfigured, link } = require("./_etsy");
const { syncSales } = require("./etsy");

module.exports = async (req, res) => {
  if (!/vercel-cron/i.test(String(req.headers["user-agent"] || ""))) return res.status(401).json({ error: "Not allowed." });
  try {
    if (!cfg().db || !etsyConfigured()) return res.status(200).json({ skipped: "not set up" });
    const l = await link(); if (!l || !l.refresh_token) return res.status(200).json({ skipped: "not connected" });
    return res.status(200).json(await syncSales());
  } catch (e) { return res.status(500).json({ error: String(e.message || e) }); }
};
