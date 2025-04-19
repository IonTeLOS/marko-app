// Netlify Edge Function — Redirect handler with authenticated Firebase access
// Uses a hidden Firebase Auth user to read & delete shortlink entries securely.

export default async (request, context) => {
  const { pathname, searchParams } = new URL(request.url);

  // ────────────────────────────────────────────────────────────
  // 0. Firebase Auth helper (ID‑token cache)
  // ────────────────────────────────────────────────────────────
  const API_KEY       = Deno.env.get("FIREBASE_API_KEY");
  const SERVICE_EMAIL = Deno.env.get("FIREBASE_SERVICE_EMAIL");
  const SERVICE_PASS  = Deno.env.get("FIREBASE_SERVICE_PASSWORD");
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
  const customPageUrl = "https://marko-app.netlify.app/404.html";
  if (!pathname.startsWith("/o/")) {
    return context.next();
  }

  // Extract short code and build DB URL
  const shortCode = pathname.replace("/o/", "");
  const DEFAULT_DB_ROOT = "https://marko-be9a9-default-rtdb.firebaseio.com/shortlink/";
  const dbUrl = `${DEFAULT_DB_ROOT}${shortCode}.json`;

  try {
    // Read entry
    const response = await fbFetch(dbUrl);
    if (!response.ok) {
      console.error("Error fetching data from Firebase:", await response.text());
      return new Response("Internal Server Error", { status: 500 });
    }
    const data = await response.json();

    // Not found or missing redirectPath → 404
    if (!data || !data.redirectPath) {
      return Response.redirect(customPageUrl, 302);
    }

    const currentDate = new Date();
    const expiresDate = new Date(data.expires);

    // Expired → delete & 404
    if (expiresDate < currentDate) {
      console.log("Link has expired.");
      await fbFetch(dbUrl, { method: "DELETE" });
      return Response.redirect(customPageUrl, 302);
    }

    // One‑time use → delete & redirect
    if (data.once === true) {
      console.log("Link is one-time use.");
      await fbFetch(dbUrl, { method: "DELETE" });
      return Response.redirect(data.redirectPath, 301);
    }

    // Direct access flag
    if (data.na === true) {
      console.log("Link is directly accessible.");
      return Response.redirect(data.redirectPath, 301);
    }

    // Password protection
    if (data.password) {
      const providedPassword = searchParams.get("password");
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

      // Initial prompt or error
      if (!providedPassword) {
        const html = `<!DOCTYPE html><html lang="${userLang}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${t.title}</title><link href="https://fonts.googleapis.com/css2?family=Fira+Sans:wght@400;700&display=swap" rel="stylesheet"><link href="https://cdnjs.cloudflare.com/ajax/libs/materialize/1.0.0/css/materialize.min.css" rel="stylesheet"><style>body{display:flex;justify-content:center;align-items:center;height:100vh;background:#f5f5f5;font-family:'Fira Sans',sans-serif;margin:0}.container{background:#fff;padding:2rem;border-radius:8px;box-shadow:0 4px 6px rgba(0,0,0,0.1);text-align:center;max-width:400px;width:100%}.container h1{margin-bottom:1.5rem}.container input{width:100%;padding:.75rem;margin-bottom:1rem}.container button{width:100%;padding:.75rem}</style></head><body><div class="container"><h1>${t.title}</h1><form method="GET" action=""><input type="password" name="password" placeholder="${t.label}" required><button class="btn waves-effect waves-light" type="submit">${t.button}</button></form></div></body></html>`;
        return new Response(html, { headers: { "Content-Type": "text/html" } });
      }
      if (providedPassword !== data.password) {
        const html = `<!DOCTYPE html><html lang="${userLang}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${t.title}</title><link href="https://fonts.googleapis.com/css2?family=Fira+Sans:wght@400;700&display=swap" rel="stylesheet"><link href="https://cdnjs.cloudflare.com/ajax/libs/materialize/1.0.0/css/materialize.min.css" rel="stylesheet"><style>body{display:flex;justify-content:center;align-items:center;height:100vh;background:#f5f5f5;font-family:'Fira Sans',sans-serif;margin:0}.container{background:#fff;padding:2rem;border-radius:8px;box-shadow:0 4px 6px rgba(0,0,0,0.1);text-align:center;max-width:400px;width:100%}.container h1{margin-bottom:1.5rem}.container p{color:red;margin-bottom:1rem}.container input{width:100%;padding:.75rem;margin-bottom:1rem}.container button{width:100%;padding:.75rem}</style></head><body><div class="container"><h1>${t.title}</h1><p>${t.error}</p><form method="GET" action=""><input type="password" name="password" placeholder="${t.label}" required><button class="btn waves-effect waves-light" type="submit">${t.button}</button></form></div></body></html>`;
        return new Response(html, { headers: { "Content-Type": "text/html" } });
      }
    }

    // Intermediate redirect
    const intermediatePageUrl = `/a/?target=${encodeURIComponent(data.redirectPath)}`;
    return Response.redirect(intermediatePageUrl, 301);

  } catch (error) {
    console.error("Error in Firebase redirect handler:", error);
    return new Response("Internal Server Error", { status: 500 });
  }

  // Continue with the normal flow for other paths
  return context.next();
};
