export default async (request, context) => {
  const { searchParams } = new URL(request.url);

  // ────────────────────────────────────────────────────────────
  // 1. Parameters
  // ────────────────────────────────────────────────────────────
  let path = searchParams.get("path"); // Requested short‑path (optional on creation)
  const redirectPath = searchParams.get("redirectpath"); // The target URL (required on creation, optional on update)
  const ownerEmail = searchParams.get("owner"); // E‑mail of creator (required on creation)
  let expireTime = searchParams.get("expires"); // Expiration ISO date‑time (optional)
  const once = searchParams.get("once") === "true"; // One‑time‑use flag (optional)
  const password = searchParams.get("password"); // Visit password (optional)

  // ─────────── New features ───────────
  const adminPass = searchParams.get("adminpass"); // Per‑link admin password (optional)
  const dbBase = searchParams.get("database"); // Override database root (optional)

  // ────────────────────────────────────────────────────────────
  // 2. Database helpers
  // ────────────────────────────────────────────────────────────
  const DEFAULT_DB_ROOT = "https://marko-be9a9-default-rtdb.firebaseio.com/shortlink/";
  const dbRoot = dbBase ? (dbBase.endsWith("/") ? dbBase : dbBase + "/") : DEFAULT_DB_ROOT;
  const buildUrl = (p) => `${dbRoot}${p}.json`;

  // Function to generate a random 7‑character alphanumeric string
  const generateRandomPath = () => Math.random().toString(36).substr(2, 7);

  // Generate a path if none given
  if (!path) path = generateRandomPath();

  // Default expiration → 5 years from now @ 23:59:59.999
  if (!expireTime) {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 5);
    d.setHours(23, 59, 59, 999);
    expireTime = d.toISOString();
  }

  let dbUrl = buildUrl(path);

  try {
    // ──────────────────────────────────────────────────────────
    // 3. Check existing entry
    // ──────────────────────────────────────────────────────────
    let res = await fetch(dbUrl);
    let existing = await res.json();

    // ──────────────────────────────────────────────────────────
    // 3a. UPDATE FLOW (entry exists & correct adminPass supplied)
    // ──────────────────────────────────────────────────────────
    if (existing && existing.redirectPath) {
      // If adminPass matches *and* caller wants to update redirectPath → proceed
      if (adminPass && existing.adminpass && adminPass === existing.adminpass) {
        if (!redirectPath) {
          return new Response(
            JSON.stringify({
              error: "Missing parameter",
              message: "`redirectpath` is required when updating an existing shortlink."
            }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }

        // Update mutable fields
        existing.redirectPath = redirectPath;
        if (expireTime) existing.expires = expireTime;
        existing.updatedAt = new Date().toISOString();

        const updateResp = await fetch(dbUrl, {
          method: "PUT",
          body: JSON.stringify(existing),
          headers: { "Content-Type": "application/json" }
        });

        if (!updateResp.ok)
          throw new Error("Failed to update existing entry in the database.");

        return new Response(
          JSON.stringify({
            path,
            redirectPath: existing.redirectPath,
            expires: existing.expires,
            message: `Successfully updated shortlink \"${path}\".`
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      // Path already taken & caller not authorised
      return new Response(
        JSON.stringify({
          error: "Path already exists",
          message: "Shortlink path is already in use or incorrect admin password."
        }),
        { status: 409, headers: { "Content-Type": "application/json" } }
      );
    }

    // ──────────────────────────────────────────────────────────
    // 3b. CREATE FLOW (entry does not exist)
    // ──────────────────────────────────────────────────────────

    // Validate required params for creation
    if (!redirectPath || !ownerEmail) {
      return new Response(
        JSON.stringify({
          error: "Missing required query parameters.",
          message: "Please provide both `redirectpath` and `owner` when creating a new shortlink."
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Ensure generated `path` is unique
    while (existing && existing.redirectPath) {
      path = generateRandomPath();
      dbUrl = buildUrl(path);
      res = await fetch(dbUrl);
      existing = await res.json();
    }

    // Compose new entry
    const data = {
      redirectPath,
      owner: ownerEmail,
      expires: expireTime,
      hits: 0,
      ...(once ? { once: true } : {}),
      ...(password ? { password } : {}),
      ...(adminPass ? { adminpass: adminPass } : {})
    };

    const createResp = await fetch(dbUrl, {
      method: "PUT",
      body: JSON.stringify(data),
      headers: { "Content-Type": "application/json" }
    });

    if (!createResp.ok)
      throw new Error("Failed to create entry in the database.");

    return new Response(
      JSON.stringify({
        path,
        redirectPath,
        expires: expireTime,
        once,
        password: password || null,
        adminpass: adminPass || null,
        message: `Successfully created shortlink \"${path}\" → \"${redirectPath}\" (expires ${expireTime}).`
      }),
      { status: 201, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: error.message
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
