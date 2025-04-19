// Netlify Edge Function — Redirect handler with authenticated Firebase access
// Uses a hidden Firebase Auth user to read & delete shortlink entries securely.
// Also injects an interstitial ad before redirecting to the primary URL, with option to skip.

export default async (request, context) => {
  const { pathname, searchParams } = new URL(request.url);

  // ────────────────────────────────────────────────────────────
  // 0. Environment variables and Firebase Auth helper
  // ────────────────────────────────────────────────────────────
  const API_KEY        = Deno.env.get("FIREBASE_API_KEY");
  const SERVICE_EMAIL  = Deno.env.get("FIREBASE_SERVICE_EMAIL");
  const SERVICE_PASS   = Deno.env.get("FIREBASE_SERVICE_PASSWORD");
  const ADSENSE_CLIENT = Deno.env.get("ADSENSE_CLIENT_ID");
  const ADSENSE_SLOT   = Deno.env.get("ADSENSE_SLOT_ID");

  if (!API_KEY || !SERVICE_EMAIL || !SERVICE_PASS) {
    return new Response("Server mis‑configuration — missing Firebase env vars", { status: 500 });
  }

  async function refreshIdToken() {
    const resp = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: SERVICE_EMAIL, password: SERVICE_PASS, returnSecureToken: true })
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
  // 1. Routing: only handle /o/:code
  // ────────────────────────────────────────────────────────────
  if (!pathname.startsWith("/o/")) {
    return context.next();
  }

  const custom404 = "https://marko-app.netlify.app/404.html";
  const code      = pathname.replace("/o/", "");
  const dbUrl     = `https://marko-be9a9-default-rtdb.firebaseio.com/shortlink/${code}.json`;

  try {
    // Fetch and validate data
    const resp = await fbFetch(dbUrl);
    if (!resp.ok) {
      console.error("Error fetching data from Firebase:", await resp.text());
      return new Response("Internal Server Error", { status: 500 });
    }
    const data = await resp.json();
    if (!data || !data.redirectPath) {
      return Response.redirect(custom404, 302);
    }

    const now = new Date();
    const expiresDate = new Date(data.expires);

    // Expiry, one-time, direct logic
    if (expiresDate < now) {
      await fbFetch(dbUrl, { method: "DELETE" });
      return Response.redirect(custom404, 302);
    }
    if (data.once) {
      await fbFetch(dbUrl, { method: "DELETE" });
      return Response.redirect(data.redirectPath, 301);
    }
    if (data.na) {
      return Response.redirect(data.redirectPath, 301);
    }

    // Password protection
    if (data.password) {
      const provided = searchParams.get("password");
      const t = {
        title: "Password Required",
        label: "Enter password",
        button: "Submit",
        error: "Incorrect password."
      };
      if (!provided || provided !== data.password) {
        const msg = provided && provided !== data.password ? t.error : "";
        const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${t.title}</title>
</head>
<body style="display:flex;align-items:center;justify-content:center;height:100vh;margin:0;font-family:sans-serif;">
  <div>
    <h1>${t.title}</h1>
    ${msg ? `<p style="color:red;">${msg}</p>` : ""}
    <form method="GET">
      <input type="password" name="password" placeholder="${t.label}" required />
      <button type="submit">${t.button}</button>
    </form>
  </div>
</body>
</html>`;
        return new Response(html, { headers: { "Content-Type": "text/html" } });
      }
    }

    // Final: show ad + controls + 30s countdown
    const primaryUrl   = data.redirectPath;
    const secondaryUrl = data.secondUrl || "https://google.com";
    const adHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Redirecting...</title>
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}" crossorigin="anonymous"></script>
  <style>
    body {
      margin: 0;
      padding: 20px;
      font-family: sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
    }
    .ad-container {
      width: 100%;
      max-width: 728px;
      margin-bottom: 20px;
      display: flex;
      justify-content: center;
      align-items: center;
      background: #f5f5f5;
    }
    .ad-container ins {
      display: block;
      width: 100%;
      height: auto;
    }
    .progress {
      width: 100%;
      max-width: 300px;
      height: 6px;
      background: #e0e0e0;
      border-radius: 3px;
      overflow: hidden;
      margin-bottom: 20px;
    }
    .determinate {
      height: 100%;
      background: #26a69a;
      width: 0%;
      transition: width 0.3s linear;
    }
    .countdown {
      text-align: center;
      font-size: 18px;
      margin-bottom: 20px;
    }
    .controls {
      display: flex;
      gap: 10px;
    }
    .controls button {
      padding: 0 12px;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <h2>You will be redirected shortly</h2>
  <div class="ad-container">
    <ins class="adsbygoogle"
         data-ad-client="${ADSENSE_CLIENT}"
         data-ad-slot="${ADSENSE_SLOT}"
         data-ad-format="auto"
         data-full-width-responsive="true"
         data-adtest="on"></ins>
  </div>
  <div class="progress">
    <div class="determinate"></div>
  </div>
  <div class="countdown">
    Redirecting in <span id="count">30</span> seconds...
  </div>
  <div class="controls">
    <button id="pause">Pause</button>
    <button id="skip">Skip</button>
  </div>
  <script>
    (adsbygoogle = window.adsbygoogle || []).push({});
    let paused = false, total = 30, rem = total;
    const countEl = document.getElementById('count');
    const det = document.querySelector('.determinate');
    const interval = setInterval(() => {
      if (!paused) {
        rem--;
        det.style.width = ((total - rem) / total * 100) + '%';
        countEl.textContent = rem;
        if (rem <= 0) {
          clearInterval(interval);
          redirect();
        }
      }
    }, 1000);
    document.getElementById('pause').onclick = () => { paused = !paused; };
    document.getElementById('skip').onclick = (e) => {
      e.preventDefault();
      const popup = window.open(secondaryUrl, '_blank', 'noopener,noreferrer');
      if (popup) popup.blur();
      window.focus();
      clearInterval(interval);
      setTimeout(() => window.location.href = primaryUrl, 100);
    };
    function redirect() {
      try {
        const popup = window.open(secondaryUrl, '_blank', 'noopener,noreferrer');
        if (popup) popup.blur();
        window.focus();
      } catch {}
      window.location.href = primaryUrl;
    }
  </script>
</body>
</html>`;
    return new Response(adHtml, { headers: { "Content-Type": "text/html" } });

  } catch (err) {
    console.error("Redirect handler error:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
};
