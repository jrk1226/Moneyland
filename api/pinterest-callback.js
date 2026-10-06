// Pinterest sends Josh back here after he approves the connection.
const P = require("./_pinterest");

module.exports = async (req, res) => {
  const back = msg => { res.statusCode = 302; res.setHeader("Location", "/?pinterest=" + encodeURIComponent(msg) + "#marketing"); res.end(); };
  try {
    const q = req.query || {};
    if (q.error) return back("Pinterest said: " + (q.error_description || q.error));
    const l = await P.plink();
    if (!l || !q.state || q.state !== l.state) return back("The Pinterest connection expired. Please tap Connect Pinterest again.");
    const t = await P.token({ grant_type: "authorization_code", code: q.code, redirect_uri: "https://" + req.headers.host + "/api/pinterest-callback" });
    await P.savePlink({ access_token: t.access_token, refresh_token: t.refresh_token, expires_at: new Date(Date.now() + (t.expires_in || 2592000) * 1000).toISOString(), state: null });
    let username = null; try { const me = await P.pin("/user_account"); username = me.username || null; } catch (e) {}
    await P.savePlink({ username });
    return back("connected");
  } catch (e) { return back("Could not connect Pinterest: " + String(e.message || e).slice(0, 160)); }
};
