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
  // Set CORS headers manually
  const headers = {
    "Access-Control-Allow-Origin": "*", // Adjust as necessary
    "Access-Control-Allow-Methods": "OPTIONS, POST",
    "Access-Control-Allow-Headers": "Content-Type"
  };

  // Handle preflight request
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: "CORS preflight" })
    };
  }

  // Handle actual POST request
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ message: "Method Not Allowed" })
    };
  }

  try {
    const body = JSON.parse(event.body);
    const { action, token, topic, title, body: messageBody, data } = body;

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
          body: JSON.stringify({ message: "Token is required for subscription" })
        };
      }
      await admin.messaging().subscribeToTopic(token, topic);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: `Subscribed to ${topic}` })
      };
    } else if (action === "send") {
      if (!messageBody) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: "Message body is required for sending" })
        };
      }

      const message = {
        topic: topic,
        notification: {
          title: title || "Notification",
          body: messageBody,
        },
        webpush: {
          headers: {
            image: data?.icon,
          },
          notification: {
            icon: data?.icon,
            click_action: `https://marko-app.netlify.app?nav=${data?.url || 'https://marko-app.netlify.app/profile2'}`,
          },
          fcmOptions: {
            link: `https://marko-app.netlify.app?nav=${data?.url || 'https://marko-app.netlify.app/profile2'}`,
          },
        },
        data: {
          click_action: "FLUTTER_NOTIFICATION_CLICK",
          url: `https://marko-app.netlify.app?nav=${data?.url || 'https://marko-app.netlify.app/profile2'}`,
        },
      };

      await admin.messaging().send(message);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: `Message sent to ${topic}` })
      };
    } else {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: "Invalid action" })
      };
    }
  } catch (error) {
    console.error("Error handling topic:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Error handling topic" })
    };
  }
};
