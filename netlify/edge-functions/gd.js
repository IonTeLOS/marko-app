import { json } from '@netlify/functions';

async function fetchHtmlContent(siteUrl) {
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(siteUrl)}`;
  const response = await fetch(proxyUrl);
  return response.text();
}

function resolveRelativeUrl(baseUrl, relativeUrl) {
  const urlObj = new URL(relativeUrl, baseUrl);
  return urlObj.href;
}

function getFaviconsAndOgImage(html, baseUrl) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const faviconTags = [...doc.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]')];
  const ogImageTag = doc.querySelector('meta[property="og:image"]');
  
  if (faviconTags.length === 0) return { fav: "", 'fav-': "", 'og:image': "" };

  const faviconsWithSize = faviconTags.map(tag => {
    const size = tag.getAttribute('sizes');
    const width = size ? parseInt(size.split('x')[0], 10) : null;
    const href = resolveRelativeUrl(baseUrl, tag.getAttribute('href'));
    return { href, size: width || 0 };
  }).sort((a, b) => b.size - a.size);

  return {
    fav: faviconsWithSize[0]?.href || "",
    'fav-': faviconsWithSize.length > 1 ? faviconsWithSize[faviconsWithSize.length - 1]?.href : "",
    'og:image': ogImageTag && !ogImageTag.content.includes('$') ? resolveRelativeUrl(baseUrl, ogImageTag.content) : ""
  };
}

export async function handler(event) {
  const { url: siteUrl, get: requestedFieldsParam } = event.queryStringParameters;
  
  if (!siteUrl) {
    return json({ error: 'No URL parameter provided.' }, { statusCode: 400 });
  }

  const requestedFields = requestedFieldsParam ? requestedFieldsParam.split(',') : null;

  try {
    const htmlContent = await fetchHtmlContent(siteUrl);
    const metadata = {};

    // Extract metadata
    metadata.title = htmlContent.match(/<title>(.*?)<\/title>/)?.[1] || "";
    metadata.shortname = siteUrl.replace(/https?:\/\//, '').split('/')[0] || "";
    metadata.description = htmlContent.match(/<meta name="description" content="(.*?)"/)?.[1] || "";
    metadata.keywords = htmlContent.match(/<meta name="keywords" content="(.*?)"/)?.[1] || "";
    metadata.language = htmlContent.match(/<html lang="(.*?)"/)?.[1] || "";

    const results = getFaviconsAndOgImage(htmlContent, siteUrl);
    metadata.fav = results.fav;
    metadata['fav-'] = results['fav-'];
    metadata['og:image'] = results['og:image'];

    // External color extraction would be added here if available

    if (requestedFields) {
      const filteredMetadata = {};
      requestedFields.forEach(field => {
        if (metadata[field] !== undefined) {
          filteredMetadata[field] = metadata[field];
        }
      });
      return json(filteredMetadata);
    }

    return json(metadata);

  } catch (error) {
    console.error('Error fetching site data:', error);
    return json({ error: error.message }, { statusCode: 500 });
  }
}
