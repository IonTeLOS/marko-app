export default async (request, context) => {
  const { pathname, searchParams } = new URL(request.url);

  // Define the custom redirect URL for errors or expired links
  const customPageUrl = "https://marko-app.netlify.app/404.html";

  if (pathname.startsWith("/o/")) {
    const shortCode = pathname.replace("/o/", "");
    const firebaseUrl = `https://marko-be9a9-default-rtdb.firebaseio.com/shortlink/${shortCode}.json`;

    try {
      // Fetch existing data
      const response = await fetch(firebaseUrl);
      if (response.ok) {
        const data = await response.json();

        // Check if data exists
        if (data) {
          const currentDate = new Date();
          const expiresDate = new Date(data.expires);

          // Check if the entry has expired
          if (expiresDate < currentDate) {
            console.log("Link has expired.");
            await fetch(firebaseUrl, { method: "DELETE" }); // Delete expired entry
            return Response.redirect(customPageUrl, 302);
          }

          // Handle the `once` key
          if (data.once === true) {
            console.log("Link is one-time use.");
            await fetch(firebaseUrl, { method: "DELETE" }); // Delete entry after use
            return Response.redirect(data.redirectPath, 301);
          }

          // Check if the link is password protected
          if (data.password) {
            const providedPassword = searchParams.get("password");

            if (!providedPassword) {
              // Detect language
              const userLang = (navigator.language || navigator.userLanguage).split('-')[0];

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
                gr: { title: "Απαιτείται Κωδικός", label: "Εισάγετε τον κωδικό πρόσβασης", button: "Υποβολή", error: "Λανθασμένος κωδικός πρόσβασης. Δοκιμάστε ξανά." },
              };

              const translation = translations[userLang] || translations.en;

              // Show the password prompt page
              const html = `
                <!DOCTYPE html>
                <html lang="${userLang}">
                <head>
                  <meta charset="UTF-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <title>${translation.title}</title>
                  <!-- Fira Sans Font -->
                  <link href="https://fonts.googleapis.com/css2?family=Fira+Sans:wght@400;700&display=swap" rel="stylesheet">
                  <!-- Materialize CSS -->
                  <link href="https://cdnjs.cloudflare.com/ajax/libs/materialize/1.0.0/css/materialize.min.css" rel="stylesheet">
                  <style>
                    body {
                      display: flex;
                      justify-content: center;
                      align-items: center;
                      height: 100vh;
                      background-color: #f5f5f5;
                      font-family: 'Fira Sans', Arial, sans-serif;
                      margin: 0;
                    }
                    .password-container {
                      background: white;
                      padding: 2rem;
                      border-radius: 8px;
                      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                      text-align: center;
                      max-width: 400px;
                      width: 100%;
                    }
                    .password-container h1 {
                      font-size: 2rem;
                      margin-bottom: 1.5rem;
                    }
                    .password-container .input-field input {
                      font-size: 1.2rem;
                      padding: 0.75rem;
                    }
                    .password-container button {
                      width: 100%;
                      padding: 0.75rem;
                      font-size: 1.2rem;
                      margin-top: 1rem;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                    }
                    .password-container .btn i {
                      margin-right: 8px;
                    }
                    .password-container p {
                      color: red;
                      font-size: 1rem;
                      margin-top: 1rem;
                    }
                  </style>
                </head>
                <body>
                  <div class="password-container">
                    <h1>${translation.title}</h1>
                    ${searchParams.get("password") === null ? `
                      <form method="GET" action="">
                        <div class="input-field">
                          <input type="password" name="password" id="password" placeholder="${translation.label}" required />
                        </div>
                        <button class="btn waves-effect waves-light" type="submit"><i class="material-icons">lock</i>${translation.button}</button>
                      </form>
                    ` : `<p>${translation.error}</p>`}
                  </div>
                  <!-- Materialize JS -->
                  <script src="https://cdnjs.cloudflare.com/ajax/libs/materialize/1.0.0/js/materialize.min.js"></script>
                  <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
                </body>
                </html>
              `;
              return new Response(html, {
                headers: { "Content-Type": "text/html" },
              });
            } else if (providedPassword !== data.password) {
              // Password incorrect
              const userLang = (navigator.language || navigator.userLanguage).split('-')[0];
              const translations = {
                en: { title: "Password Required", label: "Enter password", button: "Submit", error: "Incorrect password. Please try again." },
                // ... (other translations as before)
              };

              const translation = translations[userLang] || translations.en;

              // Show error page
              const html = `
                <!DOCTYPE html>
                <html lang="${userLang}">
                <head>
                  <meta charset="UTF-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <title>${translation.title}</title>
                  <!-- Fira Sans Font -->
                  <link href="https://fonts.googleapis.com/css2?family=Fira+Sans:wght@400;700&display=swap" rel="stylesheet">
                  <!-- Materialize CSS -->
                  <link href="https://cdnjs.cloudflare.com/ajax/libs/materialize/1.0.0/css/materialize.min.css" rel="stylesheet">
                  <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
                  <style>
                    body {
                      display: flex;
                      justify-content: center;
                      align-items: center;
                      height: 100vh;
                      background-color: #f5f5f5;
                      font-family: 'Fira Sans', Arial, sans-serif;
                      margin: 0;
                    }
                    .password-container {
                      background: white;
                      padding: 2rem;
                      border-radius: 8px;
                      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                      text-align: center;
                      max-width: 400px;
                      width: 100%;
                    }
                    .password-container h1 {
                      font-size: 2rem;
                      margin-bottom: 1.5rem;
                    }
                    .password-container .input-field input {
                      font-size: 1.2rem;
                      padding: 0.75rem;
                    }
                    .password-container button {
                      width: 100%;
                      padding: 0.75rem;
                      font-size: 1.2rem;
                      margin-top: 1rem;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                    }
                    .password-container .btn i {
                      margin-right: 8px;
                    }
                    .password-container p {
                      color: red;
                      font-size: 1rem;
                      margin-top: 1rem;
                    }
                  </style>
                </head>
                <body>
                  <div class="password-container">
                    <h1>${translation.title}</h1>
                    <p>${translation.error}</p>
                    <form method="GET" action="">
                      <div class="input-field">
                        <input type="password" name="password" id="password" placeholder="${translation.label}" required />
                      </div>
                      <button class="btn waves-effect waves-light" type="submit"><i class="material-icons">lock</i>${translation.button}</button>
                    </form>
                  </div>
                  <!-- Materialize JS -->
                  <script src="https://cdnjs.cloudflare.com/ajax/libs/materialize/1.0.0/js/materialize.min.js"></script>
                </body>
                </html>
              `;
              return new Response(html, {
                headers: { "Content-Type": "text/html" },
              });
            }
          }

 // Handle the `na` query parameter
          const naParam = searchParams.get("na");
          if (naParam !== null) {
            const ownerEmail = data.owner; // Assuming owner email is stored in the data object
            const naDatabaseUrl = `https://marko-be9a9-default-rtdb.firebaseio.com/na/${ownerEmail}.json`;

            // Check if the owner is listed in the /na database
            const naResponse = await fetch(naDatabaseUrl);
            if (naResponse.ok) {
              const naData = await naResponse.json();

              if (naData) {
                // Owner is listed in /na database, redirect without loading intermediate page
                return Response.redirect(data.redirectPath, 301);
              }
            }

            // If the owner is not listed or there is an error, continue with normal flow
          }

          // Redirect to the intermediate page with the target URL
          const intermediatePageUrl = `/a/?target=${encodeURIComponent(data.redirectPath)}`;
          return Response.redirect(intermediatePageUrl, 301);
        } else {
          // Path does not exist
          console.log("Path does not exist.");
          return Response.redirect(customPageUrl, 302);
        }
      } else {
        // Error fetching data
        console.error("Error fetching data from Firebase:", await response.text());
        return new Response("Internal Server Error", { status: 500 });
      }
    } catch (error) {
      // Error handling
      console.error("Error in Firebase operation:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  }

  // Continue with the normal flow for other paths
  return context.next();
};
