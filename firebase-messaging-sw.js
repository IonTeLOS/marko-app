importScripts('https://www.gstatic.com/firebasejs/8.6.2/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.6.2/firebase-messaging.js');
importScripts('https://cdnjs.cloudflare.com/ajax/libs/localforage/1.9.0/localforage.min.js');

self.addEventListener('fetch', (event) => {
  // The default fetch handling is sufficient for share target
});

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
/*
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: payload.notification.icon,
    data: payload.data 
  };

    // Store a value for the redirect to the Marko link to happen when page is opened or focused  
  if (payload.data && payload.data.goto) {  
    localforage.setItem('new-nav-request', String(payload.data.goto)).then(function() {
      console.log('Navigation request stored successfully in localForage from Service Worker.');
    }).catch(function(err) {
      console.error('Error storing value in Service Worker:', err);
    });
  }

  if (payload.data && payload.data.uuid) {  
    localforage.setItem('newUnopenedReminder', String(payload.data.path)).then(function() {
      console.log('Pending reminder stored successfully in localForage from Service Worker.');
    }).catch(function(err) {
      console.error('Error storing value in Service Worker:', err);
    });
  }

  // Check if it's a mobile device
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    // This is likely a mobile device, don't show the notification but store a value for effective redirect
    return;
  }

  self.registration.showNotification(notificationTitle, notificationOptions);
});
  */

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

    // Check if the message is from a topic
  if (payload.data && payload.data.topic) {
    // Extract necessary fields from the data payload
    const notificationTitle = payload.data.title || payload.data.topic;
    const notificationBody = payload.data.message || 'buzzed..';
    const notificationIcon = payload.data.attachment_url || 'https://raw.githubusercontent.com/IonTeLOS/marko-app/main/triskelion.svg';  // Show attachment as icon if provided
    const clickAction = payload.data.click || 'https://marko-app.netlify.app';  // Default click action if not provided

    // Build notification options
    const notificationOptions = {
      body: notificationBody,
      icon: notificationIcon,  // Use attachment_url for icon if available
      data: {
        url: clickAction  // Store URL for click handling
      }
    };

    // Show the notification
    self.registration.showNotification(notificationTitle, notificationOptions);
  }
  
  const { title, body } = payload.notification;
  const theIcon = payload.data.icon || 'https://raw.githubusercontent.com/IonTeLOS/marko/main/triskelion.svg'; // Default icon if not provided
  const clickAction = payload.data.url || 'https://marko-app.netlify.app'; // Default URL if not provided

  // Use default icon if none is provided
  const notificationOptions = {
    body: body,
    icon: theIcon,
    data: {
      url: clickAction // Include url in data for use in notification click event
    }
  };
  
      // Store a value for the redirect to the Marko link to happen when page is opened or focused  
  if (payload.data && payload.data.url) {  
      localforage.setItem('new-nav-request', String(payload.data.url)).then(function() {
      console.log('Navigation request stored successfully in localForage from Service Worker.');
    }).catch(function(err) {
      console.error('Error storing value in Service Worker:', err);
    });
  }

  if (payload.data && payload.data.uuid) {  
      localforage.setItem('newUnopenedReminder', String(payload.data.path)).then(function() {
      console.log('Pending reminder stored successfully in localForage from Service Worker.');
    }).catch(function(err) {
      console.error('Error storing value in Service Worker:', err);
    });
  }

      // Check if it's a mobile device
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    // This is likely a mobile device, don't show the notification but store a value for effective redirect
    return;
  }

  self.registration.showNotification(title, notificationOptions);
});


self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  let newUrl = 'https://marko-app.netlify.app';

  if (event.notification && event.notification.data.path) {
    const path = event.notification.data.path;
    const goUuid = path;
    newUrl = `https://marko-app.netlify.app?uuid=${goUuid}`;
  } else if (localForage.getItem('new-nav-request')) {
    const navUrl = localForage.getItem('new-nav-request');
    newUrl = `https://marko-app.netlify.app?nav=${navUrl}`;
    //localForage.removeItem('new-nav-request');
  }

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(clientList => {
      if (clientList.length > 0) {
        // Focus on the first client that is already open
        return clientList[0].focus().then(client => {
          client.postMessage({
            action: 'open_url',
            url: newUrl
          });
        });
      } else {
        // If no clients are open, open a new window
        return clients.openWindow(newUrl);
      }
    })
  );
});
