export default async (request, context) => {
  const { searchParams } = new URL(request.url);

  // Extract the query parameters
  const path = searchParams.get("path");
  const redirectPath = searchParams.get("redirectpath");
  const ownerEmail = searchParams.get("owner");

  if (!path || !redirectPath || !ownerEmail) {
    return new Response("Missing required query parameters.", { status: 400 });
  }

  // Firebase Realtime Database URL (within the 'redirects' path)
  const firebaseUrl = `https://marko-be9a9-default-rtdb.firebaseio.com/redirects/${path}.json`;

  try {
    // Check if the path already exists in the database
    const checkResponse = await fetch(firebaseUrl);
    const existingData = await checkResponse.json();

    if (existingData) {
      return new Response(
        JSON.stringify({
          error: "Path already exists",
          message: `The path "${path}" is already taken.`,
        }),
        { status: 409, headers: { "Content-Type": "application/json" } }
      );
    }

    // If the path doesn't exist, create it with the provided redirectPath
    const data = {
      redirectPath,
      owner: ownerEmail,
    };

    const createResponse = await fetch(firebaseUrl, {
      method: "PUT",
      body: JSON.stringify(data),
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (createResponse.ok) {
      return new Response(
        JSON.stringify({
          message: `Successfully created path "${path}" with redirect URL "${redirectPath}".`,
        }),
        { status: 201, headers: { "Content-Type": "application/json" } }
      );
    } else {
      throw new Error("Failed to create entry in the database.");
    }
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: error.message,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
