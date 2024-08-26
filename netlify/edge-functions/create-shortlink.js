export default async (request, context) => {
  const { searchParams } = new URL(request.url);

  // Extract the query parameters
  let path = searchParams.get("path");
  const redirectPath = searchParams.get("redirectpath");
  const ownerEmail = searchParams.get("owner");
  let expireTime = searchParams.get("expires");

  if (!redirectPath || !ownerEmail) {
    return new Response("Missing required query parameters.", { status: 400 });
  }

  // Function to generate a random 7-character alphanumeric string
  const generateRandomPath = () => {
    return Math.random().toString(36).substr(2, 7);
  };

  // Set path to random string if not provided
  if (!path) {
    path = generateRandomPath();
  }

  // Set default expiration to 5 years from now if not provided
  if (!expireTime) {
    const currentDate = new Date();
    const expireDate = new Date(currentDate.setFullYear(currentDate.getFullYear() + 5));
    expireTime = expireDate.toISOString();
  }

  const firebaseUrl = `https://marko-be9a9-default-rtdb.firebaseio.com/shortlink/${path}.json`;

  try {
    let checkResponse = await fetch(firebaseUrl);
    let existingData = await checkResponse.json();

    // Keep generating a new path until a unique one is found
    while (existingData) {
      path = generateRandomPath();
      const newFirebaseUrl = `https://marko-be9a9-default-rtdb.firebaseio.com/shortlink/${path}.json`;
      checkResponse = await fetch(newFirebaseUrl);
      existingData = await checkResponse.json();
    }

    // Create the new entry in the database
    const data = {
      redirectPath,
      owner: ownerEmail,
      expires: expireTime,
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
          message: `Successfully created path "${path}" with redirect URL "${redirectPath}". Expiration: ${expireTime}`,
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
