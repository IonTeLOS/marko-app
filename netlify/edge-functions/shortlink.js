// Netlify Edge Function — Firebase short‑link service
// Uses a dedicated hidden Auth user (email+password stored in env vars)
// to sign each REST request with an ID token so that only this function
// can read/write the Realtime DB.

export default async (request, context) => {
  const { searchParams } = new URL(request.url);

  // ────────────────────────────────────────────────────────────
  // 0. Firebase Auth helper (ID‑token cache)
  // ────────────────────────────────────────────────────────────
  const API_KEY         = Deno.env.get("FIREBASE_API_KEY");
  const SERVICE_EMAIL   = Deno.env.get("FIREBASE_SERVICE_EMAIL");
  const SERVICE_PASS    = Deno.env.get("FIREBASE_SERVICE_PASSWORD");

  if (!API_KEY || !SERVICE_EMAIL || !SERVICE_PASS) {
    return new Response("Server mis‑configuration — missing Firebase env vars", { status: 500 });
  }

  async function refreshIdToken() {
    const resp = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: SERVICE_EMAIL,
          password: SERVICE_PASS,
          returnSecureToken: true
        })
      }
    );

    if (!resp.ok) throw new Error("Failed to sign in service user");
    const { idToken, expiresIn } = await resp.json();
    globalThis.__fbToken = idToken;
    globalThis.__fbTokenExp = Date.now() + parseInt(expiresIn, 10) * 1000;
  }

  async function fbFetch(url, options = {}) {
    if (!globalThis.__fbToken || Date.now() >= (globalThis.__fbTokenExp || 0) - 180_000) {
      await refreshIdToken();
    }
    const sep = url.includes("?") ? "&" : "?";
    return fetch(`${url}${sep}auth=${globalThis.__fbToken}`, options);
  }

  // ────────────────────────────────────────────────────────────
  // 1. Parameters
  // ────────────────────────────────────────────────────────────
  let path           = searchParams.get("path");
  const redirectPath = searchParams.get("redirectpath");
  const ownerEmail   = searchParams.get("owner"); // optional now
  let   expireTime   = searchParams.get("expires");
  const once         = searchParams.get("once") === "true";
  const password     = searchParams.get("password");

  const adminPass  = searchParams.get("adminpass");
  const dbBase     = searchParams.get("database");
  const deleteFlag = searchParams.has("delete") || searchParams.get("delete") === "true";

  // ────────────────────────────────────────────────────────────
  // 2. DB helpers
  // ────────────────────────────────────────────────────────────
  const DEFAULT_DB_ROOT = "https://marko-be9a9-default-rtdb.firebaseio.com/shortlink/";
  const dbRoot   = dbBase ? (dbBase.endsWith("/") ? dbBase : dbBase + "/") : DEFAULT_DB_ROOT;
  const buildUrl = (p) => `${dbRoot}${p}.json`;
  const random   = () => Math.random().toString(36).substr(2, 7);

  if (deleteFlag && !path) {
    return new Response(JSON.stringify({ error: "Missing parameter", message: "`path` is required when deleting." }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  if (!deleteFlag && !path) path = random();

  if (!expireTime) {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 5);
    d.setHours(23, 59, 59, 999);
    expireTime = d.toISOString();
  }

  let dbUrl = buildUrl(path);

  try {
    const res      = await fbFetch(dbUrl);
    const existing = await res.json();

    // ───────────────────────── DELETE ─────────────────────────
    if (deleteFlag) {
      if (!existing || !existing.redirectPath) {
        return new Response(JSON.stringify({ error: "Not found", message: "Shortlink does not exist." }), { status: 404, headers: { "Content-Type": "application/json" } });
      }
      if (!adminPass || adminPass !== existing.adminpass) {
        return new Response(JSON.stringify({ error: "Forbidden", message: "Admin password incorrect." }), { status: 403, headers: { "Content-Type": "application/json" } });
      }
      const delResp = await fbFetch(dbUrl, { method: "DELETE" });
      if (!delResp.ok) throw new Error("Failed to delete entry");
      return new Response(JSON.stringify({ path, message: `Deleted shortlink \"${path}\".` }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    // ───────────────────────── UPDATE ─────────────────────────
    if (existing && existing.redirectPath) {
      if (adminPass && adminPass === existing.adminpass) {
        if (!redirectPath) {
          return new Response(JSON.stringify({ error: "Missing parameter", message: "`redirectpath` is required for update." }), { status: 400, headers: { "Content-Type": "application/json" } });
        }
        existing.redirectPath = redirectPath;
        existing.expires      = expireTime;
        existing.updatedAt    = new Date().toISOString();
        const updResp = await fbFetch(dbUrl, { method: "PUT", body: JSON.stringify(existing), headers: { "Content-Type": "application/json" } });
        if (!updResp.ok) throw new Error("Failed to update entry");
        return new Response(JSON.stringify({ path, redirectPath: existing.redirectPath, expires: existing.expires, message: `Updated shortlink \"${path}\".` }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ error: "Path exists or admin password incorrect." }), { status: 409, headers: { "Content-Type": "application/json" } });
    }

    // ───────────────────────── CREATE ─────────────────────────
    if (!redirectPath) {
      return new Response(JSON.stringify({ error: "Missing parameter", message: "`redirectpath` is required when creating.`" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    // ensure unique random path
    let probe = existing;
    while (probe && probe.redirectPath) {
      path  = random();
      dbUrl = buildUrl(path);
      probe = await (await fbFetch(dbUrl)).json();
    }

    const data = {
      redirectPath,
      expires: expireTime,
      ...(ownerEmail ? { owner: ownerEmail } : {}),
      ...(once ? { once: true } : {}),
      ...(password ? { password } : {}),
      ...(adminPass ? { adminpass: adminPass } : {})
    };

    const createResp = await fbFetch(dbUrl, { method: "PUT", body: JSON.stringify(data), headers: { "Content-Type": "application/json" } });
    if (!createResp.ok) throw new Error("Failed to create entry");

    return new Response(JSON.stringify({ path, redirectPath, expires: expireTime, once, password: password || null, adminpass: adminPass || null, message: `Created shortlink \"${path}\" → \"${redirectPath}\".` }), { status: 201, headers: { "Content-Type": "application/json" } });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Internal Server Error", message: err.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
};
