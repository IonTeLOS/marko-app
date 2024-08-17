// netlify/edge-functions/hello-world.js
export default () => new Response("Hello WWWorld", {
  headers: { "Content-Type": "text/plain" },
});

export const config = { path: "/hi" };
