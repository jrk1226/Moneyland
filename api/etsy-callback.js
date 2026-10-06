// Etsy sends Josh back here after he approves the connection.
const { db } = require("./_lib");
const { keystring, link, saveLink, tokenRequest, etsy } = require("./_etsy");

module.exports = async (req, res) => {
  const back = (msg) => { res.statusCode = 302; res.setHeader("Location", "/?etsy=" + encodeURIComponent(msg) + "#shop"); res.end(); };
  try {
    const q = req.query || {};
    if (q.error) return back("Etsy said: " + (q.error_description || q.error));
    const l = await link();
    if (!l || !q.state || q.state !== l.state) return back("The Etsy connection expired. Please tap Connect Etsy again.");
    const redirect = "https://" + req.headers.host + "/api/etsy-callback";
    const t = await tokenRequest({ grant_type: "authorization_code", client_id: keystring(), redirect_uri: redirect, code: q.code, code_verifier: l.verifier });
    await saveLink({ access_token: t.access_token, refresh_token: t.refresh_token, expires_at: new Date(Date.now() + (t.expires_in || 3600) * 1000).toISOString(), state: null, verifier: null });
    const me = await etsy("/application/users/me");
    let shopName = null;
    if (me.shop_id) { try { const shop = await etsy("/application/shops/" + me.shop_id); shopName = shop.shop_name || null; } catch (e) {} }
    await saveLink({ user_id: me.user_id || null, shop_id: me.shop_id || null, shop_name: shopName });
    return back(me.shop_id ? "connected" : "Connected, but no Etsy shop was found on this account.");
  } catch (e) {
    return back("Could not connect: " + String(e.message || e).slice(0, 160));
  }
};
