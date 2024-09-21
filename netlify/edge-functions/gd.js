// netlify/edge-functions/gd.js

export async function handler(event) {
  const scriptContent = `
    async function extractColorsFromImage(imgSrc) {
      const loadImage = (src) => {
        return new Promise((resolveImg, rejectImg) => {
          const img = new Image();
          img.crossOrigin = 'Anonymous';
          img.onload = () => resolveImg(img);
          img.onerror = (e) => rejectImg(e);
          img.src = src;
        });
      };

      const extractColors = (img) => {
        const colorThief = new ColorThief();
        let dominantColor = colorThief.getColor(img);

        let hexColor = \`#\${((1 << 24) + (dominantColor[0] << 16) + (dominantColor[1] << 8) + dominantColor[2]).toString(16).slice(1).toUpperCase()}\`;

        if (hexColor === '#FFFFFF' || hexColor === '#000000') {
          const palette = colorThief.getPalette(img, 5);
          dominantColor = palette.find(
            ([r, g, b]) => r !== 255 && g !== 255 && b !== 255 && r !== 0 && g !== 0 && b !== 0
          ) || dominantColor;
        }

        const finalHex = \`#\${((1 << 24) + (dominantColor[0] << 16) + (dominantColor[1] << 8) + dominantColor[2]).toString(16).slice(1).toUpperCase()}\`;
        const complementaryColor = getComplementaryColor(finalHex);

        return { color: finalHex, 'c-color': complementaryColor };
      };

      const proxyUrl = \`https://api.allorigins.win/raw?url=\${encodeURIComponent(imgSrc)}\`;

      try {
        const img = await loadImage(proxyUrl);
        return extractColors(img);
      } catch (proxyError) {
        console.warn('Failed to load image through proxy. Attempting direct load...');
        try {
          const img = await loadImage(imgSrc);
          return extractColors(img);
        } catch (directError) {
          console.error('Error loading image:', directError);
          return { color: "", 'c-color': "" };
        }
      }
    }

    function resolveRelativeUrl(baseUrl, relativeUrl) {
      const urlObj = new URL(relativeUrl, baseUrl);
      return urlObj.href;
    }

    function getFaviconsAndOgImage(doc, baseUrl) {
      const faviconTags = [...doc.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]')];
      const ogImageTag = doc.querySelector('meta[property="og:image"]');
      
      if (faviconTags.length === 0) return { fav: "", 'fav-': "", 'og:image': "" };

      const faviconsWithSize = faviconTags.map(tag => {
        const size = tag.getAttribute('sizes');
        const width = size ? parseInt(size.split('x')[0], 10) : null;
        const href = resolveRelativeUrl(baseUrl, tag.getAttribute('href'));
        return { href, size: width || 0 };
      }).sort((a, b) => b.size - a.size);

      const result = {
        fav: faviconsWithSize[0]?.href || "",
        'fav-': faviconsWithSize.length > 1 ? faviconsWithSize[faviconsWithSize.length - 1]?.href : "",
        'og:image': ogImageTag && !ogImageTag.content.includes('$') ? resolveRelativeUrl(baseUrl, ogImageTag.content) : ""
      };

      return result;
    }

    async function fetchSiteData(siteUrl) {
      const response = await fetch(\`https://api.allorigins.win/raw?url=\${encodeURIComponent(siteUrl)}\`);
      const text = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, "text/html");

      const metadata = {};

      metadata.title = doc.querySelector('title')?.innerText || "";
      metadata.shortname = siteUrl.replace(/https?:\\/\\//, '').split('/')[0] || "";
      metadata.description = doc.querySelector('meta[name="description"]')?.content || "";
      metadata.keywords = doc.querySelector('meta[name="keywords"]')?.content || "";
      metadata.language = doc.documentElement.lang || "";

      const results = getFaviconsAndOgImage(doc, siteUrl);
      metadata.fav = results.fav;
      metadata['fav-'] = results['fav-'];
      metadata['og:image'] = results['og:image'];

      if (results.fav) {
        try {
          const colors = await extractColorsFromImage(results.fav);
          Object.assign(metadata, colors);
        } catch (error) {
          console.error('Error extracting colors:', error);
          metadata.color = "";
          metadata['c-color'] = "";
        }
      }

      return metadata;
    }

    async function loadScript() {
      // The base URL is where the Edge Function is hosted
      const baseUrl = window.location.origin;
      const response = await fetch(\`/.netlify/functions/script-provider?url=\${encodeURIComponent(baseUrl)}\`);
      const scriptContent = await response.text();
      eval(scriptContent); // Executes the script content
    }

    // Call loadScript to execute the client-side script
    loadScript();
  `;

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/javascript',
    },
    body: scriptContent,
  };
}
