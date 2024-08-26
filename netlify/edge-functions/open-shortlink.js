// netlify/edge-functions/open-shortlink.js

export default async (request, context) => {
  const { pathname } = new URL(request.url);
  if (pathname.startsWith("/o/")) {
    const shortCode = pathname.replace("/o/", "");
    const firebaseUrl = `https://marko-be9a9-default-rtdb.firebaseio.com/shortlink/${shortCode}.json`;
    try {
      // Fetch existing data
      const response = await fetch(firebaseUrl);
      if (response.ok) {
        const data = await response.json();
        if (data && data.redirectPath) {
          // Update only the hits field using PATCH
          const updateResponse = await fetch(firebaseUrl, {
            method: "PATCH",
            body: JSON.stringify({ hits: (data.hits || 0) + 1 }),
            headers: {
              "Content-Type": "application/json",
            },
          });
          if (updateResponse.ok) {
            console.log("Hits updated successfully.");
          } else {
            console.error("Error updating hits in Firebase:", await updateResponse.text());
          }
          // Redirect regardless of hit update success
          return Response.redirect(data.redirectPath, 301);
        } else {
          return new Response("Not Found", { status: 404 });
        }
      } else {
        console.error("Error fetching data from Firebase:", await response.text());
        return new Response("Internal Server Error", { status: 500 });
      }
    } catch (error) {
      console.error("Error in Firebase operation:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  }
  return context.next();
};
