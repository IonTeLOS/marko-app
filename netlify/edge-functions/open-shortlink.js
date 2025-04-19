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
        // add other locales as needed
      };
      const t = translations[userLang] || translations.en;

      if (!provided || provided !== data.password) {
        const message = provided && provided !== data.password ? t.error : '';
        const html = `<!DOCTYPE html>
<html lang="${userLang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
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

    // Build interstitial ad + control buttons
    const primaryUrl   = data.redirectPath;
    const secondaryUrl = data.secondUrl || 'https://tovima.gr';
    const adHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Redirecting...</title>
  <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
  <link href="https://cdnjs.cloudflare.com/ajax/libs/materialize/1.0.0/css/materialize.min.css" rel="stylesheet">
  <style>
    body {
      font-family: 'Roboto', Arial, sans-serif;
      margin: 0;
      padding: 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .ad-container {
      width: 100%;
      max-width: 728px;
      margin: 0 auto 20px;
      min-height: 90px;
      background-color: #f5f5f5;
      display: flex;
      justify-content: center;
      align-items: center;
      overflow: hidden;
      border-radius: 4px;
    }
    .countdown {
      text-align: center;
      font-size: 18px;
      margin-top: 10px;
      margin-bottom: 20px;
    }
    .control-buttons {
      display: flex;
      gap: 10px;
      margin-top: 15px;
    }
    .btn-floating i {
      line-height: 40px;
    }
    .progress {
      width: 100%;
      max-width: 300px;
      margin: 0 auto;
      border-radius: 2px;
      overflow: hidden;
      position: relative;
    }
    .progress .determinate {
      position: absolute;
      top: 0;
      left: 0;
      bottom: 0;
      background-color: #26a69a;
      transition: width 0.3s linear;
    }
    #progress-indicator {
      height: 6px;
      margin-bottom: 10px;
    }
    .hidden {
      display: none;
    }
    .btn-tooltip {
      position: relative;
    }
    .tooltip-text {
      visibility: hidden;
      width: 120px;
      background-color: rgba(0,0,0,0.8);
      color: #fff;
      text-align: center;
      border-radius: 6px;
      padding: 5px;
      position: absolute;
      z-index: 1;
      bottom: 125%;
      left: 50%;
      margin-left: -60px;
      opacity: 0;
      transition: opacity 0.3s;
      font-size: 12px;
    }
    .btn-tooltip:hover .tooltip-text {
      visibility: visible;
      opacity: 1;
    }
    .ad-placeholder {
      text-align: center;
      width: 100%;
      padding: 20px;
      display: none;
    }
  </style>
  <!-- Google AdSense snippet -->
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}" crossorigin="anonymous"></script>
</head>
<body>
  <h4 class="center-align">You will be redirected shortly</h4>
  
  <div class="ad-container">
    <!-- AdSense Ad -->
    <ins class="adsbygoogle"
         style="display:block;width:728px;height:90px"
         data-ad-client="${ADSENSE_CLIENT}"
         data-ad-slot="${ADSENSE_SLOT}"
         data-ad-format="horizontal"></ins>
    
    <!-- Fallback content if ad fails to load -->
    <div class="ad-placeholder">
      <p>Advertisement</p>
    </div>
  </div>

  <div class="progress" id="progress-indicator">
    <div class="determinate" style="width: 0%"></div>
  </div>

  <div class="countdown">
    Redirecting in <span id="count">10</span> seconds...
  </div>

  <div class="control-buttons">
    <div class="btn-tooltip">
      <button id="pause-btn" class="btn-floating waves-effect waves-light blue">
        <i class="material-icons">pause</i>
      </button>
      <span class="tooltip-text">Pause/Resume</span>
    </div>
    <div class="btn-tooltip">
      <button id="skip-btn" class="btn-floating waves-effect waves-light green">
        <i class="material-icons">skip_next</i>
      </button>
      <span class="tooltip-text">Skip & Continue</span>
    </div>
  </div>

  <script>
    // Store URLs and setup state
    const primaryUrl = '${primaryUrl}';
    const secondaryUrl = '${secondaryUrl}';
    let isPaused = false;
    let countdownComplete = false;
    let totalTime = 10; // seconds
    let remainingTime = totalTime;
    let adLoaded = false;
    let adFailed = false;
    let currentWindow = window;
    
    // Get DOM elements
    const countEl = document.getElementById('count');
    const pauseBtn = document.getElementById('pause-btn');
    const skipBtn = document.getElementById('skip-btn');
    const progressBar = document.querySelector('.determinate');
    const adElement = document.querySelector('.adsbygoogle');
    const adPlaceholder = document.querySelector('.ad-placeholder');
    
    // Try to load the AdSense ad
    try {
      (adsbygoogle = window.adsbygoogle || []).push({
        onerror: function() {
          handleAdFailure();
        },
        onload: function() {
          adLoaded = true;
        }
      });
      
      // Set a timeout to check if ad loaded
      setTimeout(() => {
        if (!adLoaded && !adFailed) {
          handleAdFailure();
        }
      }, 2000);
    } catch (e) {
      handleAdFailure();
    }
    
    // Handle ad loading failure
    function handleAdFailure() {
      adFailed = true;
      adElement.style.display = 'none';
      adPlaceholder.style.display = 'block';
    }
    
    // Set up the timer
    const updateTimer = () => {
      if (isPaused) return;
      
      remainingTime--;
      countEl.textContent = remainingTime;
      
      // Update progress bar
      const progressPercent = ((totalTime - remainingTime) / totalTime) * 100;
      progressBar.style.width = progressPercent + '%';
      
      if (remainingTime <= 0) {
        clearInterval(timerInterval);
        countdownComplete = true;
        redirectToPrimary();
      }
    };
    
    // Control buttons functionality
    pauseBtn.addEventListener('click', () => {
      isPaused = !isPaused;
      pauseBtn.querySelector('i').textContent = isPaused ? 'play_arrow' : 'pause';
    });
    
    // Modified skip button handler to ensure focus on primary URL
    skipBtn.addEventListener('click', () => {
      clearInterval(timerInterval);
      
      // First open the secondary URL in a new tab
      const secondaryWindow = window.open(secondaryUrl, '_blank');
      
      // Then redirect to primary URL in the current window with a slight delay
      // to ensure this window receives focus after the new tab opens
      setTimeout(() => {
        window.focus(); // Try to focus back to this window
        window.location.href = primaryUrl;
      }, 100);
    });
    
    // Handle redirect to primary URL when timer completes
    function redirectToPrimary() {
      // Add focus to ensure this window has focus
      window.focus();
      window.location.href = primaryUrl;
    }
    
    // Start the countdown
    const timerInterval = setInterval(updateTimer, 1000);
    
    // Update progress bar on load
    progressBar.style.width = '0%';
    
    // Set focus to the current window when page loads
    window.addEventListener('load', () => {
      window.focus();
    });
    
    // Try to keep focus on this window
    window.addEventListener('blur', () => {
      // If countdown isn't complete, try to refocus
      if (!countdownComplete) {
        setTimeout(() => {
          window.focus();
        }, 300);
      }
    });
  </script>
</body>
</html>`;

    return new Response(adHtml, { headers: { "Content-Type": "text/html" } });

  } catch (err) {
    console.error("Redirect handler error:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
};
