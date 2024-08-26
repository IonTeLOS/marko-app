// netlify/edge-functions/link-map.js

export default async (request, context) => {
  const { pathname } = new URL(request.url);

  // Check if the request path starts with /sites/
  if (pathname.startsWith("/sites/")) {
    // Extract the 'something' part from the URL
    const shortCode = pathname.replace("/sites/", "");

    // Firebase Realtime Database URL (within the 'redirects' path)
    const firebaseUrl = `https://marko-be9a9-default-rtdb.firebaseio.com/redirects/${shortCode}.json`;

    // Fetch the redirect URL from Firebase
    let redirectUrl;
    try {
      const response = await fetch(firebaseUrl);
      if (response.ok) {
        redirectUrl = await response.json();
      } else {
        console.error("Error fetching data from Firebase:", response.statusText);
        return new Response("Internal Server Error", { status: 500 });
      }
    } catch (error) {
      console.error("Error fetching data from Firebase:", error);
      return new Response("Internal Server Error", { status: 500 });
    }

    // If the URL exists, redirect to it
    if (redirectUrl) {
      return Response.redirect(redirectUrl, 301);
    }

    // If the short code is not found, return a 404 response
    return new Response("Not Found", { status: 404 });
  }

  // If the path doesn't match /sites/{something}, continue with the normal flow
  return context.next();
};
