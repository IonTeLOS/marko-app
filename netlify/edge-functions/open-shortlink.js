// Netlify Edge Function — Redirect handler with authenticated Firebase access
// Uses a hidden Firebase Auth user to read & delete shortlink entries securely.
// Also injects an interstitial ad before redirecting to the primary URL, with skip and pause controls.

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
  // 1. Routing
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
      const userLang = (request.headers.get('accept-language') || 'en').split(',')[0].split('-')[0];
      const translations = {
        en: { title: "Password Required", label: "Enter password", button: "Submit", error: "Incorrect password. Please try again." }
      };
      const t = translations[userLang] || translations.en;
      if (!provided || provided !== data.password) {
        const message = provided && provided !== data.password ? t.error : '';
        const html = `<!DOCTYPE html>
<html lang="${userLang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${t.title}</title>
  <link href="https://fonts.googleapis.com/css2?family=Fira+Sans:wght@400;700&display=swap" rel="stylesheet">
  <link href="https://cdnjs.cloudflare.com/ajax/libs/materialize/1.0.0/css/materialize.min.css" rel="stylesheet">
  <style>
    body{display:flex;justify-content:center;align-items:center;height:100vh;background:#f5f5f5;margin:0;font-family:'Fira Sans',sans-serif}
    .container{background:#fff;padding:2rem;border-radius:8px;box-shadow:0 4px 6px rgba(0,0,0,0.1);text-align:center;max-width:400px;width:100%}
    .container h1{margin-bottom:1.5rem}
    .container p{color:red;margin-bottom:1rem}
    .container input{width:100%;padding:.75rem;margin-bottom:1rem}
    .container button{width:100%;padding:.75rem}
  </style>
</head>
<body>
  <div class="container">
    <h1>${t.title}</h1>
    ${message ? `<p>${message}</p>` : ''}
    <form method="GET">
      <input type="password" name="password" placeholder="${t.label}" required>
      <button class="btn waves-effect waves-light" type="submit">${t.button}</button>
    </form>
  </div>
</body>
</html>`;
        return new Response(html, { headers: { "Content-Type": "text/html" } });
      }
    }

    // Build interstitial ad + control buttons + debug countdown
    const primaryUrl   = data.redirectPath;
    const secondaryUrl = data.secondUrl || 'https://google.com';
    const adHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Redirecting...</title>
  <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
  <link href="https://cdnjs.cloudflare.com/ajax/libs/materialize/1.0.0/css/materialize.min.css" rel="stylesheet">
  <style>
    body { font-family: 'Roboto', Arial, sans-serif; margin: 0; padding: 20px; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; }
    .ad-container { width: 100%; max-width: 728px; margin-bottom: 20px; overflow: hidden; border-radius: 4px; background: #f5f5f5; display: flex; justify-content: center; align-items: center; }
    .ad-container ins { display: block; width: 100%; height: auto; }
    .countdown { font-size: 18px; margin-top: 10px; margin-bottom: 20px; text-align: center; }
    .control-buttons { display: flex; gap: 10px; margin-top: 15px; }
    .btn-floating i { line-height: 40px; }
    .progress { width: 100%; max-width: 300px; margin: 0 auto 20px; position: relative; height: 6px; background: #e0e0e0; border-radius: 3px; overflow: hidden; }
    .determinate { background-color: #26a69a; height: 100%; width: 0%; transition: width 0.3s linear; }
  </style>
  <!-- Google AdSense snippet -->
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}" crossorigin="anonymous"></script>
</head>
<body>
  <h4 class="center-align">You will be redirected shortly</h4>
  <div class="ad-container">
    <ins class="adsbygoogle"
         data-ad-client="${ADSENSE_CLIENT}"
         data-ad-slot="${ADSENSE_SLOT}"
         data-ad-format="auto"
         data-full-width-responsive="true"
         data-adtest="on"></ins>
  </div>
  <div class="progress" id="progress-indicator">
    <div class="determinate"></div>
  </div>
  <div class="countdown">Redirecting in <span id="count">30</span> seconds...</div>
  <div class="control-buttons">
    <button id="pause-btn" class="btn-floating waves-effect waves-light blue"><i class="material-icons">pause</i></button>
    <button id="skip-btn" class="btn-floating waves-effect waves-light green"><i class="material-icons">skip_next</i></button>
  </div>
  <script>
    (adsbygoogle = window.adsbygoogle || []).push({});
    let isPaused = false;
    let totalTime = 30;
    let remainingTime = totalTime;
    const countEl = document.getElementById('count');
    const pauseBtn = document.getElementById('pause-btn');
    const skipBtn = document.getElementById('skip-btn');
    const progressBar = document.querySelector('.determinate');

    const updateTimer = () => {
      if (!isPaused) {
        remainingTime--;
        const percent = ((totalTime - remainingTime) / totalTime) * 100;
        progressBar.style.width = `${percent}%`;
        countEl.textContent = remainingTime;
        if (remainingTime <= 0) {
          clearInterval(interval);
          doRedirect();
        }
      }
    };

    pauseBtn.addEventListener('click', () => {
      isPaused = !isPaused;
      pauseBtn.querySelector('i').textContent = isPaused ? 'play_arrow' : 'pause';
    });

    skipBtn.addEventListener('click', () => {
      clearInterval(interval);
      const popup = window.open(secondaryUrl, '_blank', 'noopener,noreferrer');
      if (popup) popup.blur();
      window.focus();
      window.location.href = primaryUrl;
    });

    function doRedirect() {
      const popup = window.open(secondaryUrl, '_blank', 'noopener,noreferrer');
      if (popup) popup.blur();
      window.focus();
      window.location.href = primaryUrl;
    }

    const interval = setInterval(updateTimer, 1000);
  </script>
</body>
</html>`;

    return new Response(adHtml, { headers: { "Content-Type": "text/html" } });

  } catch (err) {
    console.error("Redirect handler error:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
};
