// netlify/edge-functions/shortlink.js

export default async (request, context) => {
  const { pathname } = new URL(request.url);

  // Check if the request path starts with /s/
  if (pathname.startsWith("/o/")) {
    // Extract the 'something' part from the URL
    const shortCode = pathname.replace("/o/", "");

    // Firebase Realtime Database URL (within the 'redirects' path)
    const firebaseUrl = `https://marko-be9a9-default-rtdb.firebaseio.com/shortlink/${shortCode}.json`;

    // Fetch the data from Firebase
    let data;
    try {
      const response = await fetch(firebaseUrl);
      if (response.ok) {
        data = await response.json();
      } else {
        console.error("Error fetching data from Firebase:", response.statusText);
        return new Response("Internal Server Error", { status: 500 });
      }
    } catch (error) {
      console.error("Error fetching data from Firebase:", error);
      return new Response("Internal Server Error", { status: 500 });
    }

    // Check if redirectPath exists in the fetched data
    if (data && data.redirectPath) {
      return Response.redirect(data.redirectPath, 301);
    }

    // If the short code is not found or redirectPath is missing, return a 404 response
    return new Response("Not Found", { status: 404 });
  }

  // If the path doesn't match /sites/{something}, continue with the normal flow
  return context.next();
};
