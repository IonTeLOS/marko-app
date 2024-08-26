export default async (request, context) => {
  const { pathname } = new URL(request.url);

  // Define the custom redirect URL for errors or expired links
  const customPageUrl = "https://example.com";

  if (pathname.startsWith("/o/")) {
    const shortCode = pathname.replace("/o/", "");
    const firebaseUrl = `https://marko-be9a9-default-rtdb.firebaseio.com/shortlink/${shortCode}.json`;

    try {
      // Fetch existing data
      const response = await fetch(firebaseUrl);
      if (response.ok) {
        const data = await response.json();

        // Check if data exists
        if (data) {
          const currentDate = new Date();
          const expiresDate = new Date(data.expires);

          // Check if the entry has expired
          if (expiresDate < currentDate) {
            console.log("Link has expired.");
            await fetch(firebaseUrl, { method: "DELETE" }); // Delete expired entry
            return Response.redirect(customPageUrl, 302);
          }

          // Handle the `once` key
          if (data.once === true) {
            console.log("Link is one-time use.");
            await fetch(firebaseUrl, { method: "DELETE" }); // Delete entry after use
            return Response.redirect(data.redirectPath, 301);
          }

          // Update only the hits field if `hits` key exists
          if ('hits' in data) {
            const updateResponse = await fetch(firebaseUrl, {
              method: "PATCH",
              body: JSON.stringify({ hits: (data.hits || 0) + 1 }),
              headers: { "Content-Type": "application/json" }
            });

            if (updateResponse.ok) {
              console.log("Hits updated successfully.");
            } else {
              console.error("Error updating hits in Firebase:", await updateResponse.text());
            }
          }

          // Redirect to the intended URL
          return Response.redirect(data.redirectPath, 301);
        } else {
          // Path does not exist
          console.log("Path does not exist.");
          return Response.redirect(customPageUrl, 302);
        }
      } else {
        // Error fetching data
        console.error("Error fetching data from Firebase:", await response.text());
        return new Response("Internal Server Error", { status: 500 });
      }
    } catch (error) {
      // Error handling
      console.error("Error in Firebase operation:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  }

  // Continue with the normal flow for other paths
  return context.next();
};
