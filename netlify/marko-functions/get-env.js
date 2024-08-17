// netlify/functions/get-env.js
exports.handler = async () => {
  return {
    statusCode: 200,
    body: JSON.stringify({
      API_KEY: process.env.TST_KEY  // Access environment variables
    }),
    headers: {
      'Content-Type': 'application/json'
    }
  };
};
 
