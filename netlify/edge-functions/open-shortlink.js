// netlify/edge-functions/open-shortlink.js

export default async (request, context) => {
  const { pathname } = new URL(request.url);

  if (pathname.startsWith("/o/")) {
    const shortCode = pathname.replace("/o/", "");
    const firebaseUrl = `https://marko-be9a9-default-rtdb.firebaseio.com/shortlink/${shortCode}.json`;

    try {
      const response = await fetch(firebaseUrl);
      if (response.ok) {
        const data = await response.json();
        if (data && data.redirectPath) {
          const newHits = (data.hits || 0) + 1;
          console.log(`Updating hits to: ${newHits}`);

          const updateResponse = await fetch(firebaseUrl, {
            method: "PATCH",  // Using PATCH to only update the hits field
            body: JSON.stringify({ hits: newHits }),
            headers: {
              "Content-Type": "application/json",
            },
          });

          if (!updateResponse.ok) {
            console.error("Error updating hits in Firebase:", updateResponse.statusText);
          } else {
            console.log("Hits updated successfully.");
          }

          return Response.redirect(data.redirectPath, 301);
        } else {
          return new Response("Not Found", { status: 404 });
        }
      } else {
        console.error("Error fetching data from Firebase:", response.statusText);
        return new Response("Internal Server Error", { status: 500 });
      }
    } catch (error) {
      console.error("Error fetching data from Firebase:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  }

  return context.next();
};

