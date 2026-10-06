// Page previews, listing photos and download files for the website, rendered by the design engine.
// GET /api/preview?id=12&kind=info|page|photo|file&i=0&w=600&code=...
const { cfg, codeOk, db } = require("./_lib");
const R = require("./_render");

module.exports = async (req, res) => {
  const c = cfg(), q = req.query || {};
  if (!c.db) return res.status(503).json({ error: "Database not set up." });
  if (!codeOk(req, { code: q.code })) return res.status(401).json({ error: "Wrong or missing access code.", code: "needs_code" });
  try {
    const prod = (await db("products?select=id,spec,price,status&id=eq." + parseInt(q.id, 10)))[0];
    if (!prod) return res.status(404).json({ error: "Product not found." });
    const spec = prod.spec || {};
    await require("./_artgoods").hydrate(spec);
    const kind = q.kind || "info", w = Math.max(120, Math.min(1600, parseInt(q.w, 10) || 600)), i = parseInt(q.i, 10) || 0;
    if (kind === "info") return res.status(200).json({ pages: R.previewList(spec), photos: R.photoCount(spec), wallart: R.isArt(spec), description: R.listingDesc(spec) });
    if (kind === "page" || kind === "photo") {
      const png = kind === "page" ? R.previewPNG(spec, i, w) : R.photoPNG(spec, i, w);
      res.setHeader("Content-Type", "image/png"); res.setHeader("Cache-Control", "private, max-age=600");
      return res.status(200).send(png);
    }
    if (kind === "file") {
      const files = await R.downloadFiles(spec), f = files[Math.min(files.length - 1, i)];
      res.setHeader("Content-Type", f.type); res.setHeader("Content-Disposition", 'attachment; filename="' + f.name + '"');
      return res.status(200).send(f.buf);
    }
    return res.status(400).json({ error: "Unknown kind." });
  } catch (e) { return res.status(500).json({ error: String(e.message || e) }); }
};
