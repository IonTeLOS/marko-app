export default async (request) => {
  const { url: siteUrl, get: requestedFieldsParam } = new URL(request.url).searchParams;

  if (!siteUrl) {
    return new Response(JSON.stringify({ error: 'No URL parameter provided.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const requestedFields = requestedFieldsParam ? requestedFieldsParam.split(',') : null;

  try {
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(siteUrl)}`;
    const response = await fetch(proxyUrl);

    // Check if the response is HTML
    const contentType = response.headers.get('Content-Type') || '';
    if (contentType.includes('text/html')) {
      const htmlText = await response.text();
      console.error('Received HTML content:', htmlText);
      return new Response(JSON.stringify({ error: 'Received HTML content. There may be an issue with the proxy or URL.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const text = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'text/html');

    const metadata = {};

    metadata.title = doc.querySelector('title')?.innerText || "";
    metadata.shortname = siteUrl.replace(/https?:\/\//, '').split('/')[0] || "";
    metadata.description = doc.querySelector('meta[name="description"]')?.content || "";
    metadata.keywords = doc.querySelector('meta[name="keywords"]')?.content || "";
    metadata.language = doc.documentElement.lang || "";

    const faviconsAndOgImage = getFaviconsAndOgImage(doc, siteUrl);
    metadata.fav = faviconsAndOgImage.fav;
    metadata['fav-'] = faviconsAndOgImage['fav-'];
    metadata['og:image'] = faviconsAndOgImage['og:image'];

    if (metadata.fav) {
      try {
        const colors = await extractColorsFromImage(metadata.fav);
        Object.assign(metadata, colors);
      } catch (error) {
        console.error('Error extracting colors:', error);
        metadata.color = "";
        metadata['c-color'] = "";
      }
    }

    if (requestedFields) {
      const filteredMetadata = {};
      requestedFields.forEach(field => {
        if (metadata[field] !== undefined) {
          filteredMetadata[field] = metadata[field];
        }
      });
      return new Response(JSON.stringify(filteredMetadata), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(metadata), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error fetching site data:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

function resolveRelativeUrl(baseUrl, relativeUrl) {
  const urlObj = new URL(relativeUrl, baseUrl);
  return urlObj.href;
}

function getFaviconsAndOgImage(doc, baseUrl) {
  const faviconTags = [...doc.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]')];
  const ogImageTag = doc.querySelector('meta[property="og:image"]');
  
  if (faviconTags.length === 0) return { fav: '', 'fav-': '', 'og:image': '' };

  const faviconsWithSize = faviconTags.map(tag => {
    const size = tag.getAttribute('sizes');
    const width = size ? parseInt(size.split('x')[0], 10) : null;
    const href = resolveRelativeUrl(baseUrl, tag.getAttribute('href'));
    return { href, size: width || 0 };
  }).sort((a, b) => b.size - a.size);

  const result = {
    fav: faviconsWithSize[0]?.href || '',
    'fav-': faviconsWithSize.length > 1 ? faviconsWithSize[faviconsWithSize.length - 1]?.href : '',
    'og:image': ogImageTag && !ogImageTag.content.includes('$') ? resolveRelativeUrl(baseUrl, ogImageTag.content) : ''
  };

  return result;
}

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
    const colorThief = new ColorThief(); // Ensure ColorThief is included in your Edge Function bundle
    let dominantColor = colorThief.getColor(img);

    let hexColor = `#${((1 << 24) + (dominantColor[0] << 16) + (dominantColor[1] << 8) + dominantColor[2]).toString(16).slice(1).toUpperCase()}`;

    if (hexColor === '#FFFFFF' || hexColor === '#000000') {
      const palette = colorThief.getPalette(img, 5);
      dominantColor = palette.find(
        ([r, g, b]) => r !== 255 && g !== 255 && b !== 255 && r !== 0 && g !== 0 && b !== 0
      ) || dominantColor;
    }

    const finalHex = `#${((1 << 24) + (dominantColor[0] << 16) + (dominantColor[1] << 8) + dominantColor[2]).toString(16).slice(1).toUpperCase()}`;
    const complementaryColor = getComplementaryColor(finalHex);

    return { color: finalHex, 'c-color': complementaryColor };
  };

  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(imgSrc)}`;

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
      return { color: '', 'c-color': '' };
    }
  }
}

    function getComplementaryColor(hex) {
      // Convert hex to RGB
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);

      // Calculate complementary color
      const compR = 255 - r;
      const compG = 255 - g;
      const compB = 255 - b;

      // Convert RGB back to hex
      return `#${((1 << 24) + (compR << 16) + (compG << 8) + compB).toString(16).slice(1).toUpperCase()}`;
    }
