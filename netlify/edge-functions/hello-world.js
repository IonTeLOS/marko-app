// netlify/edge-functions/hello-world.js
export default async (request, context) => {
  return new Response("Hello, WWWorld!", {
    headers: { "content-type": "text/plain" },
  });
};
 
