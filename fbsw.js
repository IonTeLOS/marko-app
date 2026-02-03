// firebase-messaging-sw.js
// This is the service worker for handling Firebase Cloud Messaging (FCM) push notifications on the client side.
// Place this file in the root of your web app (e.g., /firebase-messaging-sw.js) and register it in your main JavaScript.
// Replace the placeholders in firebaseConfig with your actual Firebase project configuration from the Firebase Console.

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDh42r7F7lTAydfxMjQEejvwov9VN6ubVc",
  authDomain: "notis-b1899.firebaseapp.com",
  projectId: "notis-b1899",
  storageBucket: "notis-b1899.firebasestorage.app",
  messagingSenderId: "85368038648",
  appId: "1:85368038648:web:e946fdf8bc61c3e715470d"
});

const messaging = firebase.messaging();

// Handle background messages (when the app is not in focus)
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  // Customize the notification based on the payload
  const notificationTitle = payload.notification?.title || 'Background Message Title';
  const notificationOptions = {
    body: payload.notification?.body || 'Background Message Body',
    icon: payload.notification?.icon || 'https://raw.githubusercontent.com/iontelos/marko-app/main//apple-touch-icon-120x120.png',  // Optional: Replace with your icon URL
    data: payload.data || {}  // Any custom data
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Optional: Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // Handle the click action, e.g., open a URL
  const clickAction = event.notification.data?.click_action || '/';  // Default to root
  event.waitUntil(clients.openWindow(clickAction));
});
