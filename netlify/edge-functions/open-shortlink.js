// Netlify Edge Function — Redirect handler with authenticated Firebase access
// Uses a hidden Firebase Auth user to read & delete shortlink entries securely.
// Also injects an interstitial ad before opening a secondary ad URL in a new tab and redirecting to the primary URL.

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

  const custom404   = "https://marko-app.netlify.app/404.html";
  const code        = pathname.replace("/o/", "");
  const dbUrl       = `https://marko-be9a9-default-rtdb.firebaseio.com/shortlink/${code}.json`;

  try {
    const resp = await fbFetch(dbUrl);
    if (!resp.ok) {
      console.error("Error fetching data from Firebase:", await resp.text());
      return new Response("Internal Server Error", { status: 500 });
    }
    const data = await resp.json();

    // Not found or missing redirectPath → 404
    if (!data || !data.redirectPath) {
      return Response.redirect(custom404, 302);
    }

    const now         = new Date();
    const expiresDate = new Date(data.expires);

    // Expired → delete & 404
    if (expiresDate < now) {
      await fbFetch(dbUrl, { method: "DELETE" });
      return Response.redirect(custom404, 302);
    }

    // One-time use → delete & redirect
    if (data.once === true) {
      await fbFetch(dbUrl, { method: "DELETE" });
      return Response.redirect(data.redirectPath, 301);
    }

    // Direct access → redirect immediately
    if (data.na === true) {
      return Response.redirect(data.redirectPath, 301);
    }

    // Password protection
    if (data.password) {
      const provided = searchParams.get("password");
      const userLang = (request.headers.get('accept-language') || 'en').split(',')[0].split('-')[0];
      const translations = {
        en: { title: "Password Required", label: "Enter password", button: "Submit", error: "Incorrect password. Please try again." },
        es: { title: "Contraseña Requerida", label: "Ingrese la contraseña", button: "Enviar", error: "Contraseña incorrecta. Inténtelo de nuevo." },
        fr: { title: "Mot de Passe Requis", label: "Entrez le mot de passe", button: "Soumettre", error: "Mot de passe incorrect. Veuillez réessayer." },
        de: { title: "Passwort Erforderlich", label: "Passwort eingeben", button: "Einreichen", error: "Falsches Passwort. Bitte versuchen Sie es erneut." }
        // add other translations as needed
      };
      const t = translations[userLang] || translations.en;

      if (!provided || provided !== data.password) {
        const message = !provided ? '' : t.error;
        const html = `<!DOCTYPE html>
<html lang="${userLang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t.title}</title>
  <link href="https://fonts.googleapis.com/css2?family=Fira+Sans:wght@400;700&display=swap" rel="stylesheet">
  <link href="https://cdnjs.cloudflare.com/ajax/libs/materialize/1.0.0/css/materialize.min.css" rel="stylesheet">
  <style>
    body{display:flex;justify-content:center;align-items:center;height:100vh;background:#f5f5f5;font-family:'Fira Sans',sans-serif;margin:0}
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

    // Interstitial ad & dual redirect
    const primaryUrl   = data.redirectPath;
    const secondaryUrl = data.secondUrl || 'https://google.com';
    const adHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Redirecting...</title>
  <!-- Google AdSense -->
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9467807666922856" crossorigin="anonymous"></script>
  <!-- NETLIFY -->
  <ins class="adsbygoogle"
       style="display:block"
       data-ad-client="ca-pub-9467807666922856"
       data-ad-slot="3780294456"
       data-ad-format="auto"
       data-full-width-responsive="true"
       data-adtest="on"></ins>
  <script>
       (adsbygoogle = window.adsbygoogle || []).push({});
  </script>
  <style>
    body { margin:0; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; }
    p    { font-family:sans-serif; font-size:1rem; }
  </style>
</head>
<body>
  <p>Redirecting in <span id="count">30</span> seconds...</p>
  <script>
    let count = 30;
    const el = document.getElementById('count');
    const timer = setInterval(() => {
      count--;
      el.textContent = count;
      if (count <= 0) {
        clearInterval(timer);
        window.open('${secondaryUrl}', '_blank');
        window.location.href = '${primaryUrl}';
      }
    }, 1000);
  </script>
</body>
</html>`;

    return new Response(adHtml, { headers: { "Content-Type": "text/html" } });

  } catch (err) {
    console.error("Redirect handler error:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
};
