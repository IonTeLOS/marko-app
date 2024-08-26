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
          // Prepare the update for hits
          const updatedData = {
            ...data,
            hits: (data.hits || 0) + 1
          };

          // Update the hits in Firebase
          const updateResponse = await fetch(firebaseUrl, {
            method: "PUT",  // Use PUT to replace the entire node with updated data
            body: JSON.stringify(updatedData),
            headers: {
              "Content-Type": "application/json",
            },
          });

          if (updateResponse.ok) {
            console.log("Hits updated successfully.");
            return Response.redirect(data.redirectPath, 301);
          } else {
            console.error("Error updating hits in Firebase:", updateResponse.statusText);
            return new Response("Internal Server Error", { status: 500 });
          }
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
