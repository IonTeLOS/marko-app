// netlify/edge-functions/open-shortlink.js

export default async (request, context) => {
  const { pathname } = new URL(request.url);

  // Check if the request path starts with /o/
  if (pathname.startsWith("/o/")) {
    // Extract the 'shortCode' part from the URL
    const shortCode = pathname.replace("/o/", "");

    // Firebase Realtime Database URL (within the 'shortlink' path)
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
      // Increment the hit counter
      const newHits = (data.hits || 0) + 1;

      // Update the hits in Firebase
      try {
        const updateResponse = await fetch(firebaseUrl, {
          method: "PATCH", // Use PATCH to update only the 'hits' field
          body: JSON.stringify({ hits: newHits }),
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!updateResponse.ok) {
          console.error("Error updating hits in Firebase:", updateResponse.statusText);
        }
      } catch (error) {
        console.error("Error updating hits in Firebase:", error);
      }

      // Redirect to the redirectPath
      return Response.redirect(data.redirectPath, 301);
    }

    // If the short code is not found or redirectPath is missing, return a 404 response
    return new Response("Not Found", { status: 404 });
  }

  // If the path doesn't match /o/{something}, continue with the normal flow
  return context.next();
};
