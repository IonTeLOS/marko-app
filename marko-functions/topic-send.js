const admin = require("firebase-admin");
const cors = require("cors")({
  origin: "https://marko-app.netlify.app"
});

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

console.log('Subscription request:', { action, token, topic });

exports.handler = async (event, context) => {
  // Wrap the function in a Promise to use async/await with cors
  return new Promise((resolve, reject) => {
    cors(event, context, async () => {
      if (event.httpMethod !== "POST") {
        return resolve({
          statusCode: 405,
          body: "Method Not Allowed"
        });
      }

      try {
        const body = JSON.parse(event.body);
        const { action, token, topic, title, body: messageBody, data } = body;

        if (!action || !topic) {
          return resolve({
            statusCode: 400,
            body: "Action and topic are required"
          });
        }

        if (action === "subscribe") {
          if (!token) {
            return resolve({
              statusCode: 400,
              body: "Token is required for subscription"
            });
          }
          await admin.messaging().subscribeToTopic(token, topic);
          return resolve({
            statusCode: 200,
            body: JSON.stringify({ message: `Subscribed to ${topic}` })
          });
        } else if (action === "send") {
          if (!messageBody) {
            return resolve({
              statusCode: 400,
              body: "Message body is required for sending"
            });
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
          return resolve({
            statusCode: 200,
            body: JSON.stringify({ message: `Message sent to ${topic}` })
          });
        } else {
          return resolve({
            statusCode: 400,
            body: "Invalid action"
          });
        }
      } catch (error) {
        console.error("Error handling topic:", error);
        return resolve({
          statusCode: 500,
          body: JSON.stringify({ error: "Error handling topic" })
        });
      }
    });
  });
};
