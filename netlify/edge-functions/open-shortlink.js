// Netlify Edge Function — Redirect handler with authenticated Firebase access
// Uses a hidden Firebase Auth user to read & delete shortlink entries securely.
// Also injects an interstitial ad before opening a secondary ad URL in a new tab and redirecting to the primary URL.

export default async (request, context) => {
  const { pathname, searchParams } = new URL(request.url);

  // ────────────────────────────────────────────────────────────
  // 0. Env and Firebase Auth helper
  // ────────────────────────────────────────────────────────────
  const API_KEY        = Deno.env.get("FIREBASE_API_KEY");
  const SERVICE_EMAIL  = Deno.env.get("FIREBASE_SERVICE_EMAIL");
  const SERVICE_PASS   = Deno.env.get("FIREBASE_SERVICE_PASSWORD");
  const ADSENSE_CLIENT = Deno.env.get("ADSENSE_CLIENT_ID");    // e.g. "ca-pub-XXXXXXXXXXXXXXXX"
  const ADSENSE_SLOT   = Deno.env.get("ADSENSE_SLOT_ID");      // your ad slot ID
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
    globalThis.__fbToken    = idToken;
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

    const now = new Date();
    const expiresDate = new Date(data.expires);

    // Expired → delete & 404
    if (expiresDate < now) {
      console.log("Link has expired.");
      await fbFetch(dbUrl, { method: "DELETE" });
      return Response.redirect(custom404, 302);
    }

    // One-time use → delete & redirect
    if (data.once === true) {
      console.log("Link is one-time use.");
      await fbFetch(dbUrl, { method: "DELETE" });
      return Response.redirect(data.redirectPath, 301);
    }

    // Direct access flag (`na`) → redirect immediately
    if (data.na === true) {
      console.log("Link is directly accessible.");
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
        de: { title: "Passwort Erforderlich", label: "Passwort eingeben", button: "Einreichen", error: "Falsches Passwort. Bitte versuchen Sie es erneut." },
        hi: { title: "पासवर्ड आवश्यक", label: "पासवर्ड दर्ज करें", button: "जमा करें", error: "गलत पासवर्ड। कृपया पुनः प्रयास करें।" },
        ru: { title: "Требуется пароль", label: "Введите пароль", button: "Отправить", error: "Неверный пароль. Попробуйте еще раз." },
        zh: { title: "需要密码", label: "输入密码", button: "提交", error: "密码错误。请再试一次。" },
        ar: { title: "كلمة المرور مطلوبة", label: "أدخل كلمة المرور", button: "إرسال", error: "كلمة المرور غير صحيحة. حاول مرة اخرى." },
        it: { title: "Password Richiesta", label: "Inserisci la password", button: "Invia", error: "Password errata. Per favore riprova." },
        ja: { title: "パスワードが必要です", label: "パスワードを入力してください", button: "送信", error: "パスワードが間違っています。もう一度やり直してください。" },
        ko: { title: "비밀번호 필요", label: "비밀번호 입력", button: "제출", error: "잘못된 비밀번호입니다. 다시 시도하십시오." },
        pt: { title: "Senha Requerida", label: "Digite a senha", button: "Enviar", error: "Senha incorreta. Por favor, tente novamente." },
        gr: { title: "Απαιτείται Κωδικός", label: "Εισάγετε τον κωδικό πρόσβασης", button: "Υποβολή", error: "Λανθασμένος κωδικός πρόσβασης. Δοκιμάστε ξανά." }
      };
      const t = translations[userLang] || translations.en;

      // Prompt or error
      if (!provided || provided !== data.password) {
        const message = !provided ? '' : t.error;
        const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Redirecting...</title>
  <!-- Google AdSense -->
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adClient}"
     crossorigin="anonymous"></script>
  <style>
    body { margin:0; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; font-family:sans-serif; }
    #ad { width:320px; max-width:100%; margin-bottom:1rem; }
    p  { font-size:1rem; }
  </style>
</head>
<body>
  <div id="ad">
    <ins class="adsbygoogle"
         style="display:block; width:100%;"
         data-ad-client="${adClient}"
         data-ad-slot="${adSlot}"
         data-ad-format="auto"
         data-full-width-responsive="true"
         data-adtest="on"></ins>
    <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
  </div>
  <p>Redirecting in <span id="count">5</span> seconds...</p>
  <script>
    let count = 5;
    const el = document.getElementById('count');
    const timer = setInterval(() => {
      count -= 1;
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

    return new Response(html, { headers: { "Content-Type": "text/html" } });("Internal Server Error", { status: 500 });
  }
};
