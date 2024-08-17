const admin = require('firebase-admin');

// Parse the JSON from environment variable
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://marko-be9a9-default-rtdb.firebaseio.com"
});

exports.handler = async (event, context) => {
  // Handle non-POST requests
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: "Method Not Allowed" })
    };
  }

  try {
    const body = JSON.parse(event.body);
    const { action, topic, token, title, body: messageBody, data } = body;

    if (!action || !topic) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Action and topic are required" })
      };
    }

    if (action === "subscribe") {
      if (!token) {
        return {
          statusCode: 400,
          body: JSON.stringify({ message: "Token is required for subscribe action" })
        };
      }
      await admin.messaging().subscribeToTopic(token, topic);
      return {
        statusCode: 200,
        body: JSON.stringify({ message: `Subscribed to ${topic}` })
      };
    }

    if (action === "send") {
      if (!title || !messageBody) {
        return {
          statusCode: 400,
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
        body: JSON.stringify({ message: `Notification sent to ${topic}` })
      };
    }

    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Invalid action" })
    };
  } catch (error) {
    console.error("Error handling topic:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Error handling topic", details: error.message })
    };
  }
};
