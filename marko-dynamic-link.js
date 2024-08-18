// marko-dynamic-link.js
// a tiny app that adds a dynamic Marko© button on your website
// add the button by adding this script in the <head> section of your website like this: 
// <script src="https://marko-app.netlify.app/marko-dynamic-link.js" defer></script>
// clicking on the button bookmarks your website on user's Marko© application
// your users can hide the button, or keep it as a shortcut to Marko app website
// learn more about Marko© and how it can help you and your users grow at https://github.com/IonTeLOS/marko-app

// Load tinycolor for color manipulation
function loadTinyColor() {
    const tinyColorScript = document.createElement('script');
    tinyColorScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/tinycolor/1.4.2/tinycolor.min.js';
    tinyColorScript.onload = createAndStyleButton;
    document.head.appendChild(tinyColorScript);
}

// Get the primary color from the meta tag
function getPrimaryColor() {
    const metaTag = document.querySelector('meta[name="theme-color"]');
        return metaTag ? metaTag.content : '#0d47a1'; // Default to dark blue if not found
}

// Compute the complementary color
function computeComplementaryColor(hex) {
    const color = tinycolor(hex);
    const compColor = color.complement().toHexString();
    return compColor;
}

function getSvgUrl(backgroundColor) {
    const color = tinycolor(backgroundColor);
    
    // List of potential SVGs and their corresponding colors
    const svgOptions = [
        { color: '#0d47a1', url: 'https://raw.githubusercontent.com/IonTeLOS/marko/main/triskelion.svg' },
        { color: '#000000', url: 'https://raw.githubusercontent.com/IonTeLOS/marko/main/triskelion_black.svg' },
        { color: '#ffffff', url: 'https://raw.githubusercontent.com/IonTeLOS/marko/main/triskelion_white.svg' }
    ];

    // Initialize variables to store the best contrast SVG and its ratio
    let bestContrastSvg = svgOptions[0].url;  // Default to the first SVG
    let highestContrastRatio = 0;

    // Iterate through SVG options to find the one with the best contrast
    svgOptions.forEach(option => {
        const contrastRatio = tinycolor.readability(color, option.color);
        
        if (contrastRatio > highestContrastRatio) {
            highestContrastRatio = contrastRatio;
            bestContrastSvg = option.url;
        }
    });

    // Return the URL of the SVG with the highest contrast
    return bestContrastSvg;
}

// Handle button click with interaction
async function handleMarkoButtonClick(event) {
    event.preventDefault();
    const button = event.currentTarget;

    // Click effect: change background and scale
    button.style.transform = 'scale(0.9)';
    button.style.backgroundColor = tinycolor(button.style.backgroundColor).darken(10).toHexString();

    setTimeout(() => {
        button.style.transform = 'scale(1)';
        button.style.backgroundColor = tinycolor(button.style.backgroundColor).lighten(10).toHexString();
    }, 200);
    
    const goToApp = localStorage.getItem('Marko-app-direct');
    if (goToApp === 'true') {
       window.open('https://marko-app.netlify.app', '_blank');
       return;
    }
    
    const hasClickedBefore = localStorage.getItem('Marko-clicked');
    if (hasClickedBefore === 'true') {
        if (confirm(getTranslatedTrueText())) {
            localStorage.setItem('Marko-app-direct', 'true');
            window.open('https://marko-app.netlify.app', '_blank');
        } 
        else {
            localStorage.setItem('Marko-hide', 'true');
            console.log('hiding..');
            // Select all elements with the specified class
            const buttonsToHide = document.querySelectorAll('.markoButton');

            // Iterate over the NodeList and apply styles
            buttonsToHide.forEach(button => {
            button.style.transform = 'scale(0)';
            button.style.opacity = '0';
            button.style.display = 'none';
            });
        } 
        return;
     }
   
    const translatedText = getTranslatedText();
    if (confirm(translatedText)) {
        const url = encodeURIComponent(window.location.href);
        const title = encodeURIComponent(document.title);
        const favicon = encodeURIComponent(await getFavicon());
        const finalColor = getPrimaryColor();
        const encodedColor = encodeURIComponent(finalColor);
	// this is where all the magic happens    
        const finalUrl = `https://marko-app.netlify.app?type=website&link=${url}&title=${title}&icon=${favicon}&color=${encodedColor}&createMarko=true&noConfirm=true`;

        // Log the details to the console
	console.log(`Adding a Marko for the website ${decodeURIComponent(url)} with title ${decodeURIComponent(title)} and color ${decodeURIComponent(encodedColor)}`);
        localStorage.setItem('Marko-clicked', 'true');
        window.open(finalUrl, '_blank');
    } else {
        const hideMarkoText = getHideMarkoText();
        if (confirm(hideMarkoText)) {
            localStorage.setItem('Marko-hide', 'true');
        }
    }
     const userHidden = localStorage.getItem('Marko-hide');
     if (userHidden === 'true') {
         console.log('hiding..');
         // Select all elements with the specified class
         const buttonsToHide = document.querySelectorAll('.markoButton');

        // Iterate over the NodeList and apply styles
        buttonsToHide.forEach(button => {
        button.style.transform = 'scale(0)';
        button.style.opacity = '0';
        button.style.display = 'none'; // Optionally, you can also set display to none
    });
   }
}

	// Function to get translated text
	function getTranslatedText() {
    	const translations = {
        en: 'Add this website to Marko© bookmarking application?',
        es: '¿Agregar este sitio web a la aplicación de marcadores Marko©?',
        zh: '将此网站添加到 Marko© 书签应用程序？',
        hi: 'इस वेबसाइट को Marko© बुकमार्किंग एप्लिकेशन में जोड़ें?',
        ar: 'إضافة هذا الموقع إلى تطبيق علامات Marko©؟',
        ru: 'Добавить этот веб-сайт в приложение закладок Marko©?',
        pt: 'Adicionar este site ao aplicativo de marcadores Marko©?',
        fr: 'Ajouter ce site Web à l\'application de signets Marko©?',
        de: 'Diese Website zur Marko© Lesezeichenanwendung hinzufügen?',
        ja: 'このウェブサイトをMarko©ブックマークアプリに追加しますか？',
        ko: '이 웹사이트를 Marko© 북마킹 애플리케이션에 추가하시겠습니까?',
        it: 'Aggiungi questo sito web all\'app di segnalibri Marko©?',
        pl: 'Czy dodać tę stronę internetową do aplikacji zakładek Marko©?',
        nl: 'Deze website toevoegen aan de Marko© bladwijzerapp?',
        sv: 'Lägg till den här webbplatsen i Marko© bokmärkesapp?',
        tr: 'Bu web sitesini Marko© yer imi uygulamasına ekle?',
        da: 'Tilføj dette websted til Marko© bogmærkeapp?',
        fi: 'Lisää tämä verkkosivusto Marko© kirjanmerkki-sovellukseen?',
        no: 'Legg til dette nettstedet i Marko© bokmerkeapp?',
        cs: 'Přidat tuto webovou stránku do aplikace Marko© záložek?',
        hu: 'Hozzáadja ezt a weboldalt a Marko© könyvjelző alkalmazáshoz?',
        ro: 'Adăugați acest site web la aplicația de marcaje Marko©?',
        sk: 'Pridať túto webovú stránku do aplikácie Marko© záložiek?',
        bg: 'Добавяне на този уебсайт към приложението за отметки Marko©?',
        el: 'Προσθήκη αυτού του ιστότοπου στην εφαρμογή σελιδοδεικτών Marko©;',
        sr: 'Dodaj ovu veb stranicu u Marko© aplikaciju za obeleživače?',
        hr: 'Dodajte ovu web stranicu u Marko© aplikaciju za oznake?',
        lt: 'Pridėti šią svetainę į Marko© žymių programą?',
        lv: 'Pievienot šo tīmekļa vietni Marko© grāmatzīmju lietotnē?',
        et: 'Lisa see veebisait Marko© järjehoidjate rakendusse?',
        sl: 'Dodajte to spletno stran v aplikacijo Marko© za zaznamke?',
        mk: 'Додајте ја оваа веб-страница во Marko© апликацијата за ознаки?',
        sq: 'Shto këtë faqe në aplikacionin e shënimeve Marko©?',
        ka: 'ამ ვებსაიტზე დამატება Marko© წიგმების აპლიკაციაში?',
        am: 'ይህን ድር ጣቢያ እንደ Marko© ቦክማርኪንግ አፕሊኬሽን ያከምድ?',
        my: 'ဤဝဘ်ဆိုက်ကို Marko© ဘွတ်မှတ်များ အက်ပလီကေးရှင်းထဲသို့ ထည့်ပါ?',
        ur: 'اس ویب سائٹ کو Marko© بُک مارکنگ ایپلیکیشن میں شامل کریں؟',
        he: 'להוסיף את האתר הזה לאפליקציית הסימניות של Marko©?',
        vi: 'Thêm trang web này vào ứng dụng đánh dấu Marko©?',
        id: 'Tambahkan situs web ini ke aplikasi penanda Marko©?',
        ms: 'Tambahkan laman web ini ke aplikasi penanda Marko©?',
        tl: 'Idagdag ang website na ito sa Marko© bookmarking application?',
        sw: 'Ongeza tovuti hii kwenye programu ya vitabu vya Marko©?',
        ml: 'ഈ വെബ്സൈറ്റ് Marko© ബുക്ക്മാർക്കിംഗ് ആപ്ലിക്കേഷനിൽ ചേർക്കൂ?',
        bn: 'এই ওয়েবসাইটটি Marko© বুকমার্কিং অ্যাপ্লিকেশনটিতে যুক্ত করুন?',
        pa: 'ਇਸ ਵੈਬਸਾਈਟ ਨੂੰ Marko© ਬੁਕਮਾਰਕਿੰਗ ਐਪ ਵਿੱਚ ਸ਼ਾਮਲ ਕਰੋ?',
        ta: 'இந்த இணையதளத்தை Marko© புத்தகமர்க்கிங் செயலியில் சேர்க்கவா?',
        te: 'ఈ వెబ్‌సైట్‌ను Marko© బుక్‌మార్కింగ్ అప్లికేషన్‌లో చేర్చవా?',
        kn: 'ಈ ವೆಬ್ಸೈಟ್ ಅನ್ನು Marko© ಬುಕ್‌ಮಾರ್ಕಿಂಗ್ ಅಪ್ಲಿಕೇಶನ್‌ಗೆ ಸೇರಿಸುವುದೇ?',
        mr: 'या वेबसाइटला Marko© बुकमार्किंग अॅप्लिकेशनमध्ये जोडावे का?',
        si: 'මෙම වෙබ් අඩවිය Marko© පොතට එක් කරන්න?',
        cy: 'Ychwanegwch y wefan hon i’r cais marcio Marko©?',
        eu: 'Gehitu webgune hau Marko© markagailu aplikazioan?',
        gl: 'Engade esta páxina web á aplicación de marcadores Marko©?',
        oc: 'Apondre aqueste site web a l’aplicacion de marcaires Marko©?',
        wa: 'Ajoute cisse site web a l’application de bookmarks Marko© ?',
        co: 'Aghjustate sta pagina web in l’applicazione di marcare Marko©?',
        als: 'Diese Website zur Marko© Lesezeichen-Anwendung hinzufügen?',
        su: 'Tambahkan situs web ieu ka aplikasi penanda Marko©?',
        uz: 'Ushbu veb-saytni Marko© belgilash ilovasiga qo\'shing?',
        kk: 'Бұл веб-сайтты Marko© бетбелгілеу қолданбасына қосу?',
        mn: 'Энэ вэбсайтыг Marko© номын тэмдэглэл програмд нэмж оруулах уу?',
        az: 'Bu veb saytını Marko© işarələmə tətbiqinə əlavə edin?',
        hy: 'Ավելացնել այս վեբ կայքը Marko© նշիչ հավելվածում:',
        bs: 'Dodajte ovu web stranicu u Marko© aplikaciju za oznake?',
        ne: 'यस वेबसाइटलाई Marko© बुकमार्किंग एप्लिकेसनमा थप्नुहोस्?',
        lo: 'ເພີ່ມເວບໄຊດໍານັ່ນເຂົ້າໃນ Marko© ປ່ອນງານປ່ອນ?',
        km: 'បន្ថែមគេហទំព័រនេះទៅក្នុងកម្មវិធីស្លាកសញ្ញា Marko©?',
        jv: 'Tambah situs web iki menyang aplikasi tandha Marko©?',
        mk: 'Додајте ја оваа веб-страница во Marko© апликацијата за ознаки?',
        ku: 'Ev malpera vebê bi serlêdanê Marko© zêde bikin?',
        ia: 'Adde iste sito web al application de marcos Marko©?',
        lb: 'Dëst Websäit zur Marko© Bookmarking Applikatioun derbäisetzen?',
        sc: 'Aghjunghje questu situ web à l’applicazione di marcature Marko©?',
        sv: 'Lägg till den här webbplatsen i Marko© bokmärkesapp?',
        tt: 'Бу вебсайтны Marko© закладкалар кушымтасына өстәгез?',
        lv: 'Pievienot šo tīmekļa vietni Marko© grāmatzīmju lietotnē?',
        hy: 'Այս կայքը ավելացնել Marko© նշիչ ծրագրին:',
        ro: 'Adăugați acest site web la aplicația de marcaje Marko©?',
        cs: 'Přidat tuto webovou stránku do aplikace Marko© záložek?',
        id: 'Tambahkan situs web ini ke aplikasi penanda Marko©?',
        bg: 'Добавете този уебсайт в приложението за отметки Marko©?',
        uk: 'Додати цей вебсайт до програми закладок Marko©?',
        sr: 'Dodaj ovu veb stranicu u Marko© aplikaciju za obeleživače?',
        ht: 'Ajoute sit wèb sa a nan aplikasyon makè Marko©?',
        ka: 'ამ ვებსაიტზე დამატება Marko© წიგმების აპლიკაციაში?',
        fa: 'این وب‌سایت را به برنامه نشانه‌گذاری Marko© اضافه کنید؟'
    };

    const language = navigator.language.split('-')[0];
    return translations[language] || translations['en'];
}

	// Function to get translated text for the true confirmation
	function getTranslatedTrueText() {
	const translations = {
    en: 'You already have a Marko for this page. Click OK to keep this button as a shortcut to Marko© application, or Cancel to hide the button',
    es: 'Ya tienes un Marko© para esta página. Haz clic en Aceptar para mantener este botón como un acceso directo a la aplicación Marko©, o en Cancelar para ocultar el botón.',
    zh: '您已经为此页面拥有一个Marko。点击“确定”以将此按钮保留为Marko©应用程序的快捷方式，或点击“取消”以隐藏按钮。',
    hi: 'आपके पास इस पृष्ठ के लिए एक Marko पहले से ही है। इस बटन को Marko© एप्लिकेशन के लिए शॉर्टकट के रूप में बनाए रखने के लिए OK पर क्लिक करें, या बटन को छिपाने के लिए Cancel पर क्लिक करें।',
    ar: 'لديك بالفعل Marko لهذه الصفحة. انقر على "موافق" للاحتفاظ بهذا الزر كاختصار لتطبيق Marko©، أو "إلغاء" لإخفاء الزر.',
    ru: 'У вас уже есть Marko для этой страницы. Нажмите OK, чтобы оставить эту кнопку в качестве ярлыка к приложению Marko©, или Cancel, чтобы скрыть кнопку.',
    pt: 'Você já tem um Marko para esta página. Clique em OK para manter este botão como um atalho para o aplicativo Marko©, ou em Cancelar para ocultar o botão.',
    fr: 'Vous avez déjà un Marko pour cette page. Cliquez sur OK pour conserver ce bouton comme raccourci vers l’application Marko©, ou sur Annuler pour masquer le bouton.',
    de: 'Sie haben bereits ein Marko für diese Seite. Klicken Sie auf OK, um diesen Button als Verknüpfung zur Marko©-Anwendung zu behalten, oder auf Abbrechen, um den Button auszublenden.',
    ja: 'このページにはすでにMarko©があります。Markoアプリケーションへのショートカットとしてこのボタンを保持するには「OK」をクリックし、ボタンを隠すには「キャンセル」をクリックしてください。',
    ko: '이 페이지에는 이미 Marko 가 있습니다. 이 버튼을 Marko© 애플리케이션에 대한 바로 가기로 유지하려면 확인을 클릭하고, 버튼을 숨기려면 취소를 클릭하십시오.',
    it: 'Hai già un Marko per questa pagina. Fai clic su OK per mantenere questo pulsante come collegamento all\'applicazione Marko©, oppure su Annulla per nascondere il pulsante.',
    pl: 'Masz już Marko dla tej strony. Kliknij OK, aby zachować ten przycisk jako skrót do aplikacji Marko© lub Anuluj, aby ukryć przycisk.',
    nl: 'Je hebt al een Marko voor deze pagina. Klik op OK om deze knop als snelkoppeling naar de Marko©-applicatie te behouden, of op Annuleren om de knop te verbergen.',
    sv: 'Du har redan ett Marko för den här sidan. Klicka på OK för att behålla den här knappen som en genväg till Marko©-applikationen, eller på Avbryt för att dölja knappen.',
    tr: 'Bu sayfa için zaten bir Marko ya sahipsiniz. Bu düğmeyi Marko© uygulamasına kısayol olarak tutmak için Tamam a tıklayın veya düğmeyi gizlemek için İptal e tıklayın.',
    da: 'Du har allerede en Marko til denne side. Klik på OK for at beholde denne knap som genvej til Marko©-applikationen, eller på Annuller for at skjule knappen.',
    fi: 'Sinulla on jo Marko tälle sivulle. Napsauta OK säilyttääksesi tämän painikkeen pikakuvakkeena Marko©-sovellukseen tai Peruuta piilottaaksesi painikkeen.',
    no: 'Du har allerede en Marko for denne siden. Klikk OK for å beholde denne knappen som en snarvei til Marko©-applikasjonen, eller Avbryt for å skjule knappen.',
    cs: 'Už máte Marko pro tuto stránku. Klikněte na OK, chcete-li zachovat toto tlačítko jako zástupce aplikace Marko©, nebo na Zrušit, chcete-li tlačítko skrýt.',
    hu: 'Már van Marko -ja ehhez az oldalhoz. Kattintson az OK gombra, hogy megtartsa ezt a gombot Marko© alkalmazás gyorsbillentyűjeként, vagy kattintson a Mégsem gombra a gomb elrejtéséhez.',
    ro: 'Aveți deja un Marko pentru această pagină. Faceți clic pe OK pentru a păstra acest buton ca scurtătură către aplicația Marko© sau pe Anulare pentru a ascunde butonul.',
    sk: 'Už máte Marko pre túto stránku. Kliknite na OK, ak chcete tento tlačidlo ponechať ako skratku do aplikácie Marko©, alebo na Zrušiť, ak chcete tlačidlo skryť.',
    bg: 'Вече имате Marko за тази страница. Кликнете върху OK, за да запазите този бутон като пряк път към приложението Marko© или върху Отказ, за да скриете бутона.',
    el: 'Ήδη έχετε ένα Marko για αυτή τη σελίδα. Κάντε κλικ στο OK για να διατηρήσετε αυτό το κουμπί ως συντόμευση για την εφαρμογή Marko©, ή στο Ακύρωση για να κρύψετε το κουμπί.',
    sr: 'Već imate Marko za ovu stranicu. Kliknite na OK da biste zadržali ovaj dugme kao prečicu do Marko© aplikacije, ili na Otkaži da sakrijete dugme.',
    hr: 'Već imate Marko za ovu stranicu. Kliknite OK da biste zadržali ovu tipku kao prečac do Marko© aplikacije, ili Otkaži da biste sakrili tipku.',
    lt: 'Jau turite Marko šiai svetainei. Spustelėkite OK, kad išsaugotumėte šį mygtuką kaip nuorodą į Marko© programą, arba Atšaukti, kad paslėptumėte mygtuką.',
    lv: 'Jums jau ir ir Marko šai lapai. Noklikšķiniet uz Labi, lai saglabātu šo pogu kā saīsni uz Marko© lietojumprogrammu, vai Atcelt, lai slēptu pogu.',
    et: 'Teil on juba Marko selle lehe jaoks. Klõpsake OK, et hoida seda nuppu Marko© rakenduse otsetee kui, või Cancel, et nuppu peita.',
    sl: 'Že imate Marko za to stran. Kliknite OK, da obdržite to tipko kot bližnjico do aplikacije Marko©, ali Prekliči, da skrijete tipko.',
    mk: 'Веќе имате Marko за оваа страница. Кликнете на OK за да ја задржите оваа копче како пречка до апликацијата Marko©, или Откажи за да го скриете копчето.',
    sq: 'Keni tashmë një Marko për këtë faqe. Klikoni OK për të mbajtur këtë buton si një preçak për aplikacionin Marko©, ose Anulo për të fshehur butonin.',
    ka: 'თქვენ უკვე გაქვთ Marko ამ გვერდისთვის. დააჭირეთ OK ამ ღილაკის შენარჩუნებას Marko© აპლიკაციის საგრანტო მალსახმობად, ან გააუქმეთ ღილაკის დამალვა.',
    am: 'እንደ Marko ቦክማርኪንግ አፕሊኬሽን ይህን ድር ጣቢያ ያከምዱ። OK እንዲያደርጉ ትክክለኛ ነው፣ ወይም Cancel ይጠቀሙ።',
    my: 'ဤဝဘ်ဆိုက်ကို Marko ဘွတ်မှတ်များ အက်ပလီကေးရှင်းထဲသို့ ထည့်ပါ။ OK ကို နှိပ်ပါ၊ သို့မဟုတ် Cancel ကို နှိပ်ပါ။',
    ur: 'آپ کے پاس اس صفحے کے لیے پہلے سے ہی ایک Marko موجود ہے۔ اس بٹن کو Marko© ایپلیکیشن کے لیے شارٹ کٹ کے طور پر برقرار رکھنے کے لیے OK پر کلک کریں، یا بٹن کو چھپانے کے لیے Cancel پر کلک کریں۔',
    he: 'כבר יש לך Marko עבור דף זה. לחץ על OK כדי לשמור את כפתור זה כקיצור דרך לאפליקציית Marko©, או על Cancel כדי להסתיר את הכפתור.',
    vi: 'Bạn đã có một Marko cho trang này. Nhấp vào OK để giữ nút này làm phím tắt cho ứng dụng Marko© hoặc Cancel để ẩn nút.',
    id: 'Anda sudah memiliki Marko untuk halaman ini. Klik OK untuk menyimpan tombol ini sebagai pintasan ke aplikasi Marko©, atau Cancel untuk menyembunyikan tombol.',
    ms: 'Anda sudah mempunyai Marko untuk halaman ini. Klik OK untuk mengekalkan butang ini sebagai pintasan ke aplikasi Marko©, atau Cancel untuk menyembunyikan butang.',
    tl: 'May Marko ka na para sa pahinang ito. I-click ang OK para panatilihin ang pindutang ito bilang shortcut sa Marko© application, o Cancel para itago ang pindutan.',
    sw: 'Tayari una Marko kwa ukurasa huu. Bonyeza OK ili kuweka kitufe hiki kama kiungo kwa programu ya Marko©, au Cancel ili kuficha kitufe.',
    ml: 'ഈ പേജിനായി നിങ്ങൾക്ക് ഇതിനകം ഒരു Marko ഉണ്ട്. ഈ ബട്ടൺ Marko© അപ്ലിക്കേഷന്റെ ശോർട്ട്‌കട്ട് ആയി സൂക്ഷിക്കാൻ OK ക്ലിക്ക് ചെയ്യുക, അല്ലെങ്കിൽ ബട്ടൺ ഒളിപ്പിക്കാൻ Cancel ക്ലിക്ക് ചെയ്യുക.',
    bn: 'আপনার এই পৃষ্ঠার জন্য ইতিমধ্যেই একটি Marko আছে। Marko© অ্যাপ্লিকেশনের জন্য এই বোতামটি শর্টকাট হিসাবে রাখার জন্য OK ক্লিক করুন, অথবা বোতামটি লুকানোর জন্য Cancel ক্লিক করুন।',
    pa: 'ਤੁਹਾਡੇ ਕੋਲ ਇਸ ਪੇਜ ਲਈ ਪਹਿਲਾਂ ਹੀ ਇੱਕ Marko ਹੈ। ਇਸ ਬਟਨ ਨੂੰ Marko© ਐਪਲੀਕੇਸ਼ਨ ਦੇ ਸ਼ਾਰਟਕਟ ਵਜੋਂ ਰੱਖਣ ਲਈ OK ਤੇ ਕਲਿਕ ਕਰੋ, ਜਾਂ ਬਟਨ ਨੂੰ ਛੁਪਾਉਣ ਲਈ Cancel ਤੇ ਕਲਿਕ ਕਰੋ।',
    ta: 'இந்த பக்கம் için நீங்கள் ஏற்கனவே ஒரு Marko வைத்திருக்கிறீர்கள். Marko© பயன்பாட்டிற்கு இந்த பொத்தானை குறுஞ்சுட்டியாகக் காப்பாற்ற OK என்பதைக் கிளிக் செய்யவும், அல்லது பொத்தானைப் மறைக்க Cancel என்பதைக் கிளிக் செய்யவும்.',
    te: 'ఈ పేజీకి మీరు ఇప్పటికే ఒక Marko కలిగి ఉన్నారు. ఈ బటన్‌ను Marko© అప్లికేషన్‌కు శార్ట్కట్‌గా ఉంచాలంటే OK నొక్కండి లేదా బటన్‌ను దాచడానికి Cancel నొక్కండి.',
    kn: 'ನೀವು ಈ ಪುಟಕ್ಕೆ ಈಗಾಗಲೇ ಒಂದು Marko ಹೊಂದಿದ್ದೀರಿ. ಈ ಬಟನ್ ಅನ್ನು Marko© ಅಪ್ಲಿಕೇಶನ್‌ಗಾಗಿ ಶಾರ್ಟ್‌ಕಟ್‌గా ಉಳಿಸಲು OK ಕ್ಲಿಕ್ ಮಾಡಿ ಅಥವಾ ಬಟನ್‌ನ್ನು ಮರೆಮಾಚಲು Cancel ಕ್ಲಿಕ್ ಮಾಡಿ.',
    mr: 'तुमच्याकडे या पृष्ठासाठी आधीच एक Marko आहे. या बटणाला Marko© अॅप्लिकेशनसाठी शॉर्टकट म्हणून ठेवण्यासाठी OK वर क्लिक करा, किंवा बटण लपवण्यासाठी Cancel वर क्लिक करा.',
    si: 'ඔබට මෙම පිටුව සඳහා දැනටමත් Marko ඇත. මෙම බොත්තම Marko© යෙදුම සඳහා කෙටි මාර්ගයක් ලෙස තබා ගන්න OK මත ක්ලික් කරන්න, 아니면 බොත්තම හැඩයක් අහෝස කරන Cancel මත ක්ලික් කරන්න.',
    cy: 'Mae gennych eisoes Marko ar gyfer y dudalen hon. Cliciwch OK i gadw’r botwm hwn fel gyswllt i’r cais Marko©, neu Canslo i guddio’r botwm.',
    eu: 'Jada Marko bat duzu orri honentzat. Sakatu OK Marko© aplikaziorako lasterbide gisa botoi hau mantentzeko, edo Ezeztatu botoia ezkutatzeko.',
    gl: 'Xa tes Marko para esta páxina. Preme en OK para manter este botón como unha ruta directa á aplicación Marko©, ou en Cancelar para ocultar o botón.',
    oc: 'Ja avètz un Marko per aquesta pagina. Clicatz sus OK per mantenir aqueste botó coma un raccourci cap a l’aplicacion Marko©, o en Cancelar per amagatzar lo botó.',
    wa: 'Vos avètz dèjà on Marko po cisse page. Clickez OK po garder cisse boutton comè raccourci a l’application Marko©, ou sur Canceler po caché cisse boutton.',
    co: 'Avete digià un Marko per sta pagina. Cliccate OK per mantenere stu buttone cum’è un scorciatoia per l’applicazione Marko©, o Annulla per nascondere stu buttone.',
    als: 'Sie haben bereits ein Marko für diese Seite. Klicken Sie auf OK, um diese Schaltfläche als Verknüpfung zur Marko©-Anwendung zu behalten, oder auf Abbrechen, um die Schaltfläche auszublenden.',
    su: 'Anjeun parantos ngagaduhan Marko pikeun halaman ieu. Klik OK pikeun ngajaga tombol ieu salaku pintasan ka aplikasi Marko©, atanapi Cancel pikeun nyumputkeun tombol.',
    uz: 'Ushbu sahifa uchun allaqachon Marko ga egasiz. Ushbu tugmani Marko© dasturiga yo‘naltirish sifatida saqlab qolish uchun OK-ni bosing yoki tugmani yashirish uchun Cancel-ni bosing.',
    kk: 'Осы бет үшін сізде Marko бар. Бұл түймені Marko© қолданбасына арналған тетігі ретінде сақтау үшін OK түймесін басыңыз немесе түймені жасыру үшін Cancel түймесін басыңыз.',
    mn: 'Энэ хуудсанд зориулсан Marko таныг аль хэдийнээ байгаа. Энэ товчлуурыг Marko© програмд хурдан хандах хэрэгсэл болгохыг хүсвэл OK товчлуурыг дарна уу, эсвэл товчлуурыг нуухын тулд Cancel товчлуурыг дарна уу.',
    az: 'Bu səhifə üçün artıq bir Marko niz var. Bu düyməni Marko© tətbiqinə qısa yol olaraq saxlamaq üçün OK düyməsini basın, və ya düyməni gizlətmək üçün Cancel düyməsini basın.',
    hy: 'Դուք արդեն ունեք Marko այս էջի համար: սեղմեք OK՝ այս կոճակը պահելու համար Marko© ծրագիրի համար կարճուղի, կամ Cancel՝ կոճակը թաքցնելու համար:',
    bs: 'Već imate Marko za ovu stranicu. Kliknite OK da biste zadržali ovaj gumb kao prečicu do aplikacije Marko©, ili Cancel da biste sakrili gumb.',
    ne: 'यस पृष्ठको लागि तपाईंलाई पहिले नै एक Marko छ। यस बटनलाई Marko© अनुप्रयोगको लागि शॉर्टकटको रूपमा राख्न OK क्लिक गर्नुहोस्, वा बटनलाई लुकाउनेको लागि Cancel क्लिक गर्नुहोस्。',
    lo: 'ທ່ານມີ Marko ສໍາລັບເອກະລົກນີ້ແລ້ວ. ກົດ OK ສໍາລັບຮັບປະຕິບັດປຸ່ມນີ້ເປັນສະຕິກໍ່ປະລິມານຂອງ Marko©, ຫຼື Cancel ສໍາລັບເງສອບປຸ່ມ.',
    km: 'អ្នកមាន Marko សម្រាប់ទំព័រនេះរួចហើយ។ ចុច OK ដើម្បីរក្សាប៊ូតុងនេះជាចំណshortcutទៅកម្មវិធី Marko© ឬ Cancel ដើម្បីលាក់ប៊ូតុង។',
    jv: 'Sampeyan wis duwe Marko kanggo kaca iki. Klik OK kanggo njaga tombol iki minangka shortcut kanggo aplikasi Marko©, utawa Cancel kanggo nyumputake tombol.',
    ku: 'Ji bo vê rûpelê we hewceyê Marko heye. Li ser OK bişînin da ku ev bişînin wekî kurtkevirê bo serlêdanê Marko©, an jî Cancel bo veşartina bişîna.',
    ia: 'Tu ja ha un Marko pro iste pagina. Clicca OK pro mantener iste buton como un raccourci al application Marko©, o Cancellar pro celar le buton.',
    tt: 'Бу бит өчен сездә инде Marko бар. Бу төймәне Marko© кушымтасына тиз арада керү өчен саклау өчен OK төймәсенә басыгыз, яки төймәгезне яшерү өчен Cancel төймәсенә басыгыз.',
    yi: 'איר האָבן שוין א Marko פֿאַר דעם בלאַט. קליק OK צו האלטן דעם קנעפּל ווי א שאָרטקאַט צו Marko© אנווענדונג, אָדער Cancel צו פאַרברענען דעם קנעפּל.',
    gl: 'Xa tes Marko para esta páxina. Preme en OK para manter este botón como unha ruta directa á aplicación Marko©, ou en Cancelar para ocultar o botón.',
};

    const language = navigator.language.split('-')[0];
    return translations[language] || translations['en'];
}


	// Function to get translated text for the second confirmation
	function getHideMarkoText() {
    const translations = {
        en: 'Always hide Marko button?',
        es: '¿Ocultar siempre el botón de Marko?',
        zh: '始终隐藏 Marko 按钮？',
        hi: 'Marko बटन को हमेशा छिपाएं?',
        ar: 'إخفاء زر Marko دائمًا؟',
        ru: 'Всегда скрывать кнопку Marko?',
        pt: 'Sempre ocultar o botão Marko?',
        fr: 'Masquer toujours le bouton Marko?',
        de: 'Marko-Schaltfläche immer ausblenden?',
        ja: 'Marko ボタンを常に非表示にしますか？',
        ko: 'Marko 버튼을 항상 숨기시겠습니까?',
        it: 'Nascondere sempre il pulsante Marko?',
        pl: 'Zawsze ukrywać przycisk Marko?',
        nl: 'Marko-knop altijd verbergen?',
        sv: 'Alltid dölja Marko-knappen?',
        tr: 'Marko butonunu her zaman gizle?',
        da: 'Altid skjul Marko-knappen?',
        fi: 'Aina piilota Marko-nappi?',
        no: 'Alltid skjul Marko-knappen?',
        cs: 'Vždy skrýt tlačítko Marko?',
        hu: 'Mindig elrejteni a Marko gombot?',
        ro: 'Întotdeauna ascundeți butonul Marko?',
        sk: 'Vždy skryť tlačidlo Marko?',
        bg: 'Винаги скривай бутона на Marko?',
        el: 'Να κρύβω πάντα το κουμπί του Marko;',
        sr: 'Uvek sakrij Marko dugme?',
        hr: 'Uvijek sakrij Marko gumb?',
        lt: 'Visada slėpti Marko mygtuką?',
        lv: 'Vienmēr slēpt Marko pogu?',
        et: 'Kas alati peita Marko nuppu?',
        sl: 'Vedno skrij Marko gumb?',
        mk: 'Секогаш сокриј го копчето Marko?',
        sq: 'Të fshihni gjithmonë butonin Marko?',
        ka: 'გაუმჯობესოს Marko ღილაკი ყოველთვის ნამკურნალობის?',
        am: 'ሁልጊዜ እባክዎ የ Marko ቁልፍን ይስተዋል?',
        my: 'Marko ခလုတ်ကို အမြဲအနှောင့်အယှက်မရှိစေပါ?',
        ur: 'Marko بٹن کو ہمیشہ چھپائیں؟',
        he: 'להסתיר תמיד את כפתור Marko?',
        vi: 'Luôn ẩn nút Marko?',
        id: 'Selalu sembunyikan tombol Marko?',
        ms: 'Sentiasa sembunyikan butang Marko?',
        tl: 'Laging itago ang pindutan ng Marko?',
        sw: 'Sawa na siri Marko?',
        ml: 'എപ്പോഴും Marko ബട്ടൺ മറയ്ക്കണോ?',
        bn: 'মার্কো বোতামটি সবসময় লুকিয়ে রাখুন?',
        pa: 'Marko ਬਟਨ ਨੂੰ ਹਮੇਸ਼ਾਂ ਲੁਕਾਓ?',
        ta: 'எப்போதும் Marko பொத்தானை மறைக்கவும்?',
        te: 'Marko బటన్‌ను ఎప్పుడూ దాచమా?',
        kn: 'ಎಲ್ಲಾ ಸಮಯದಲ್ಲೂ Marko ಬಟನ್ ಅನ್ನು ಮರೆಮಾಚಿ?',
        mr: 'Marko बटण नेहमीच लपवा का?',
        si: 'Marko බොත්තම නිතරම සඟවාද?',
        cy: 'Cynilo bob amser botwm Marko?',
        eu: 'Betikoa Marko botoia ezkutatu?',
        gl: 'Ocultar sempre o botón Marko?',
        oc: 'Amagar totjorn lo boton Marko?',
        wa: 'Caché todi l’boto Marko?',
        co: 'Masquer toujours le bouton Marko?',
        als: 'Marko-Schaltfläche immer ausblenden?',
        su: 'Salawasna sembunyi tombol Marko?',
        uz: 'Har doim Marko tugmasini yashirish?',
        kk: 'Ә sempre Marko батырмасын жасыру?',
        mn: 'Marko товчийг үргэлж нуу?',
        az: 'Həmişə Marko düyməsini gizlət?',
        hy: 'Դ دائաբար թաքցնել Marko կոճակը:',
        bs: 'Uvijek sakrij Marko dugme?',
        ne: 'सधैं Marko बटन लुकाउनुहोस्?',
        lo: 'ເສີມແຕ່ສະຖາທິຕີ Marko ບົດເຄື່ອງໃຫ່ນທີ່ສຸດ?',
        km: 'លាក់ប៊ូតុង Marko ពីពេលមួយទៅមួយ?',
        jv: 'Sembunyikan tombol Marko saben wektu?',
        mk: 'Секогаш сокриј го копчето Marko?',
        ku: 'Her dem Marko pêşîdina hinere?',
        ia: 'Celar semper le button Marko?',
        lb: 'Immer d’Marko Knäppchen verstoppen?',
        sc: 'Nascondi sempre il pulsante Marko?',
        sv: 'Alltid dölja Marko-knappen?',
        tt: 'Marko төймәсен һәрвакыт яшерергә?',
        lv: 'Vienmēr slēpt Marko pogu?',
        hy: 'Այսկերպ Marko կոճակը միշտ թաքցնել:'
    };
    
    const language = navigator.language.split('-')[0];
    return translations[language] || translations['en'];
}

	// Function to detect if the user is on a mobile device
	function isMobileDevice() {
    	// Define the breakpoint for mobile devices
    	const mobileBreakpoint = 768; 
    
    	// Check the screen width
    	return window.innerWidth <= mobileBreakpoint;
	}

	function createAndStyleButton() {
    // Check if the button already exists
    if (document.getElementById('dynamicMarkoButton')) {
        return; // Exit if button already exists
    }

    if (localStorage.getItem('Marko-hide') === 'true') return;

    // Create the button element
    const button = document.createElement('button');
    button.id = 'dynamicMarkoButton';
    button.className = 'markoButton';

    // Get primary color and compute complementary color
    const primaryColor = getPrimaryColor();
    const compColor = computeComplementaryColor(primaryColor);

    // Create and append the SVG element
    const img = document.createElement('img');
    img.src = getSvgUrl(primaryColor);
    img.alt = 'Marko Icon';
    button.appendChild(img);

    // Set initial styles for the button and SVG
    button.style.backgroundColor = primaryColor;
    button.style.border = `5px solid ${compColor}`;
    button.style.position = 'fixed'; // Use fixed position
    button.style.bottom = '20px';
    button.style.right = '20px';
    button.style.zIndex = '9999';
    button.style.width = '64px';
    button.style.height = '64px';
    button.style.borderRadius = '50%';
    button.style.color = '#0d47a1'; // Default text color
    button.style.fontSize = '16px';
    button.style.fontFamily = 'inherit';
    button.style.display = 'flex';
    button.style.alignItems = 'center';
    button.style.justifyContent = 'center';
    button.style.cursor = 'pointer';
    button.style.transition = 'opacity 0.3s ease, transform 0.3s ease-in-out';
    button.style.overflow = 'hidden';
    button.style.whiteSpace = 'nowrap';
    button.style.opacity = '1'; // Ensure it's visible
    button.style.userSelect = 'none'; // Prevent text selection

    // SVG styling
    img.style.width = '40px';
    img.style.height = '40px';
    img.style.transition = 'fill 0.3s ease';

    // Create and style the tooltip
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.textContent = getTranslatedText(); 
    
    const shortcut = localStorage.getItem('Marko-app-direct');
    if (shortcut !== 'true' && !isMobileDevice()) {
        document.body.appendChild(tooltip);
    }
    
    // Tooltip styles
    tooltip.style.position = 'fixed'; // Fixed position
    tooltip.style.backgroundColor = '#2c2c2c';
    tooltip.style.color = 'white';
    tooltip.style.fontFamily = 'inherit'; // Inherit the font from the parent element
    tooltip.style.borderRadius = '5px';
    tooltip.style.padding = '5px 10px';
    tooltip.style.fontSize = '14px';
    tooltip.style.whiteSpace = 'nowrap';
    tooltip.style.opacity = '0';
    tooltip.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    tooltip.style.pointerEvents = 'none'; // Prevent tooltip from interfering with cursor events

    // Function to update tooltip position
    function updateTooltipPosition() {
        const buttonRect = button.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();

        // Calculate tooltip position
        let tooltipLeft = buttonRect.left + (buttonRect.width / 2) - (tooltipRect.width / 2);
        let tooltipTop = buttonRect.top - tooltipRect.height - 10; // Position above the button

        // Ensure tooltip doesn't go offscreen
        if (tooltipLeft < 0) {
            tooltipLeft = 0;
        }
        if (tooltipLeft + tooltipRect.width > window.innerWidth) {
            tooltipLeft = window.innerWidth - tooltipRect.width;
        }
        if (tooltipTop < 0) {
            tooltipTop = buttonRect.bottom + 10; // Position below the button if not enough space above
        }

        tooltip.style.left = `${tooltipLeft}px`;
        tooltip.style.top = `${tooltipTop}px`;
    }

    // Button hover effect
    button.addEventListener('mouseenter', () => {
        button.style.backgroundColor = tinycolor(primaryColor).lighten(10).toHexString(); // Lighten background color
        button.style.border = `7px solid ${compColor}`; // Increase border width
        button.style.transform = 'scale(1.2)'; // Enlarge button
        img.style.width = '45px'; // Adjust SVG size if needed
        button.style.transition = 'opacity 0.3s ease, transform 0.3s ease-in-out'; // Smooth transition

        // Show tooltip
        updateTooltipPosition(); // Update position
        tooltip.style.opacity = '1';
        tooltip.style.transform = 'translateY(-10px)'; // Move tooltip up slightly
        tooltip.style.transform = 'translateX(-10px)'; // Move tooltip left slightly
    });

    // Button unhover effect
    button.addEventListener('mouseleave', () => {
        button.style.backgroundColor = primaryColor;
        button.style.border = `5px solid ${compColor}`;
        button.style.transform = 'scale(1)';
        img.style.width = '40px'; // Adjust SVG size if needed
        button.style.transition = 'opacity 0.3s ease, transform 0.3s ease-in-out'; // Smooth transition

        // Hide tooltip
        tooltip.style.opacity = '0';
        tooltip.style.transform = 'translateY(0)';
    });

    let lastScrollTop = 0;
    let isScrolling;
    let hideTimeout;
    let isHovering = false; // Track if button is being hovered

    function showButton() {
        button.style.opacity = '1';
        button.style.transform = 'scale(1.1)';
        button.style.transition = 'opacity 0.3s ease, transform 0.3s ease-in-out';
    }

    function hideButton() {
        if (!isHovering) { // Only hide if not hovering
            button.style.opacity = '0';
            button.style.transform = 'scale(1)';
            button.style.transition = 'opacity 0.3s ease, transform 0.3s ease-in-out';
        }
    }
    
    // Prevent context menu from showing
    button.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        window.open('https://marko-app.netlify.app', '_blank');
    });
    
let touchStartTime;
const longPressDelay = 400; // Long press duration in milliseconds
let longPressTriggered = false; // Flag to track if long press was triggered

button.addEventListener('touchstart', (event) => {
    touchStartTime = Date.now();
    longPressTriggered = false; // Reset the flag on touchstart
});

button.addEventListener('touchend', (event) => {
    const touchEndTime = Date.now();
    const touchDuration = touchEndTime - touchStartTime;

    if (touchDuration >= longPressDelay) {
        longPressTriggered = true; // Set the flag to indicate long press
        event.preventDefault(); // Prevent default touch behavior
        event.stopPropagation(); // Prevent the event from bubbling up
        window.open('https://marko-app.netlify.app', '_blank'); // Open the URL in a new tab/window
    }
});

button.addEventListener('touchcancel', (event) => {
    touchStartTime = null;
    longPressTriggered = false; // Reset the flag on touchcancel
});

button.addEventListener('click', (event) => {
    if (longPressTriggered) {
        event.preventDefault(); // Prevent click if it was a long press
    }
});

  
    // Handle hover effects
    button.addEventListener('mouseenter', () => {
        isHovering = true;
        clearTimeout(hideTimeout); // Cancel hide timeout if button is hovered
        showButton(); // Ensure button is visible
    });

    button.addEventListener('mouseleave', () => {
        isHovering = false;
        hideTimeout = setTimeout(hideButton, 4000); // Hide after 4 seconds if not hovered
    });

    // Scrolling effect to hide/show the button with animation
    window.addEventListener('scroll', () => {
        clearTimeout(isScrolling);
        clearTimeout(hideTimeout); // Cancel any hide timeout on scroll

        let scrollTop = window.pageYOffset || document.documentElement.scrollTop;

        if (scrollTop > lastScrollTop) {
            // Scrolling down
            if (!isHovering) {
                hideButton();
            }
        } else if (scrollTop < lastScrollTop) {
            // Scrolling up
            showButton();
        }

        lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;

        // Set a timeout to keep the button visible for a short period after scrolling stops
        isScrolling = setTimeout(() => {
            if (!isHovering) {
                hideTimeout = setTimeout(hideButton, 4000); // Hide button after 4 seconds if not hovered
            }
        }, 1000); // Adjust this duration as needed
    });

    // Click event
    button.addEventListener('click', handleMarkoButtonClick);

    // Append button to the body
    document.body.appendChild(button);
}


// Function to get favicon
async function getFavicon() {
    let faviconElement = document.querySelector('link[rel="icon"], link[rel="shortcut icon"]');
    if (faviconElement) {
        return faviconElement.href;
    }

    const baseUrl = window.location.origin;
    try {
        const response = await fetch(`${baseUrl}/favicon.ico`);
        if (response.ok) {
            return `${baseUrl}/favicon.ico`;
        }
    } catch (e) {
        console.log("Error fetching favicon from home page:", e);
    }

    const manifestLink = document.querySelector('link[rel="manifest"]');
    if (manifestLink) {
        try {
            const manifestUrl = manifestLink.href;
            const response = await fetch(manifestUrl);
            const manifest = await response.json();
            if (manifest.icons && manifest.icons.length > 0) {
                return new URL(manifest.icons[0].src, baseUrl).href;
            }
        } catch (e) {
            console.log("Error fetching icon from manifest:", e);
        }
    }

    const ogImageElement = document.querySelector('meta[property="og:image"]');
    if (ogImageElement) {
        return ogImageElement.content;
    }

    return `https://www.google.com/s2/favicons?domain=${baseUrl}&sz=64`;
}

	// Load tinycolor for color manipulation
	function loadTinyColor() {
    	const tinyColorScript = document.createElement('script');
    	tinyColorScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/tinycolor/1.4.2/tinycolor.min.js';
    	tinyColorScript.onload = createAndStyleButton;
    	document.head.appendChild(tinyColorScript);
	}

	// Load the tinycolor library and create the button
	document.addEventListener('DOMContentLoaded', loadTinyColor);
