importScripts('https://www.gstatic.com/firebasejs/8.6.2/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.6.2/firebase-messaging.js');
importScripts('https://cdnjs.cloudflare.com/ajax/libs/localforage/1.9.0/localforage.min.js');

// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyD96IBVqGKVEdmXIVCYL_7kvlBhJNSD1Ww",
  authDomain: "marko-be9a9.firebaseapp.com",
  databaseURL: "https://marko-be9a9-default-rtdb.firebaseio.com",
  projectId: "marko-be9a9",
  storageBucket: "marko-be9a9.appspot.com",
  messagingSenderId: "7036670175",
  appId: "1:7036670175:web:99992356716578ea13996a"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Handle FCM background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message from FCM:', payload);

  const { title, body } = payload.notification;
  const theIcon = payload.data.icon || 'https://raw.githubusercontent.com/IonTeLOS/marko/main/triskelion.svg'; // Default icon if not provided
  const clickAction = payload.data.url || 'https://marko-app.netlify.app'; // Default URL if not provided

  const notificationOptions = {
    body: body,
    icon: theIcon,
    data: {
      url: clickAction // Include url in data for use in notification click event
    }
  };
  
  // Store navigation request in localForage
  if (payload.data && payload.data.url) {  
    localforage.setItem('new-nav-request', String(payload.data.url))
      .then(() => console.log('Navigation request stored successfully.'))
      .catch(err => console.error('Error storing navigation request:', err));
  }

  if (payload.data && payload.data.uuid) {  
    localforage.setItem('newUnopenedReminder', String(payload.data.path))
      .then(() => console.log('Pending reminder stored successfully.'))
      .catch(err => console.error('Error storing reminder:', err));
  }

  // Show notification
  self.registration.showNotification(title, notificationOptions);
});

// Handle generic push events (e.g., from ntfy)
self.addEventListener('push', (event) => {
  console.log('Received push event:', event);

  if (event.data) {
    const data = event.data.json();
    const title = data.title || 'Default Title';
    const options = {
      body: data.body || 'Default Body',
      icon: data.icon || 'https://raw.githubusercontent.com/IonTeLOS/marko/main/triskelion.svg',
      data: {
        url: data.url || 'https://marko-app.netlify.app' // Default URL if not provided
      }
    };

    // Show notification for ntfy or other services
    event.waitUntil(self.registration.showNotification(title, options));
  }
});

// Handle notification click events
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const notificationData = event.notification.data;
  let newUrl = notificationData.url || 'https://marko-app.netlify.app';

  // Open or focus the existing window
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(clientList => {
      if (clientList.length > 0) {
        return clientList[0].focus().then(client => {
          client.postMessage({
            action: 'open_url',
            url: newUrl
          });
        });
      } else {
        return clients.openWindow(newUrl);
      }
    })
  );
});
