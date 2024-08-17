const admin = require("firebase-admin");

const firebaseConfig = {
  apiKey: "AIzaSyD96IBVqGKVEdmXIVCYL_7kvlBhJNSD1Ww",
  authDomain: "marko-be9a9.firebaseapp.com",
  projectId: "marko-be9a9",
  storageBucket: "marko-be9a9.appspot.com",
  messagingSenderId: "7036670175",
  appId: "1:7036670175:web:99992356716578ea13996a"
};

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp(firebaseConfig);
}

exports.handler = async (event, context) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "OPTIONS, POST",
    "Access-Control-Allow-Headers": "Content-Type"
  };

  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: "CORS preflight" })
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ message: "Method Not Allowed" })
    };
  }

  try {
    const body = JSON.parse(event.body);
    const { action, topic, token, title, body: messageBody, data } = body;

    if (!action || !topic) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: "Action and topic are required" })
      };
    }

    if (action === "subscribe") {
      if (!token) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: "Token is required for subscribe action" })
        };
      }
      await admin.messaging().subscribeToTopic(token, topic);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: `Subscribed to ${topic}` })
      };
    }

    if (action === "send") {
      if (!title || !messageBody) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: "Title and body are required for send action" })
        };
      }
      
      const message = {
        notification: {
          title,
          body: messageBody
        },
        data: data || {},
        topic
      };

      await admin.messaging().send(message);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: `Notification sent to ${topic}` })
      };
    }

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ message: "Invalid action" })
    };
  } catch (error) {
    console.error("Error handling topic:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Error handling topic", details: error.message })
    };
  }
};
