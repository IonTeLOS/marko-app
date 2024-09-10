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

async function getKey(topic) {
    const key = await localforage.getItem(topic);
    if (!key) {
        console.error('No key found for topic:', topic);
        return null;
    }
    return new Uint8Array(key);
}

async function decryptMessage(encryptedMessage, key) {
    const keyBuffer = await crypto.subtle.importKey(
        "raw",
        key,
        { name: "AES-GCM" },
        false,
        ["decrypt"]
    );

    const { iv, encryptedData } = JSON.parse(encryptedMessage);
    const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: new Uint8Array(iv) },
        keyBuffer,
        new Uint8Array(encryptedData)
    );

    return new TextDecoder().decode(decrypted);
}

messaging.onBackgroundMessage(async (payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  // Check if the message is from a topic
    if (payload.data && payload.data.topic) {
      try {
      const topic = payload.data.topic;
    const key = await getKey(topic);

    if (!key) {
      throw new Error('No key available for decryption');
    }
    const decryptedMessage = await decryptMessage(payload.data.message, key);
    // Extract necessary fields from the data payload
    const notificationTitle = payload.data.title || payload.data.topic;
    const notificationBody = decryptedMessage || 'buzzed..';
    //const notificationBody = payload.data.message || 'buzzed..';
    const notificationIcon = payload.data.attachment_url || 'https://raw.githubusercontent.com/IonTeLOS/marko-app/main/triskelion.svg'; // Default icon if not provided
    const clickAction = payload.data.click || 'https://marko-app.netlify.app'; // Default click action if not provided

    // Build notification options
    const notificationOptions = {
      body: notificationBody,
      icon: notificationIcon,
      data: {
        url: clickAction // Store URL for click handling
      }
    };

    // Store a value for the redirect to the Marko link to happen when page is opened or focused
    if (payload.data.click) {
      localforage.setItem('new-nav-request', String(payload.data.click))
        .then(() => console.log('Navigation request stored successfully in localForage from Service Worker.'))
        .catch(err => console.error('Error storing value in Service Worker:', err));
    }
    // Show the notification
    self.registration.showNotification(notificationTitle, notificationOptions);
   } catch (error) {
            console.error('Error processing encrypted message:', error);
            // Handle decryption error (e.g., show a generic notification)
     }
    }

  // Handle other cases where notification is provided in payload.notification
  if (payload.notification) {
    const { title, body } = payload.notification;
    const theIcon = payload.data.icon || 'https://raw.githubusercontent.com/IonTeLOS/marko/main/triskelion.svg'; // Default icon if not provided
    const clickAction = payload.data.url || 'https://marko-app.netlify.app'; // Default URL if not provided

    // Build notification options
    const notificationOptions = {
      body: body,
      icon: theIcon,
      data: {
        url: clickAction // Include url in data for use in notification click event
      }
    };

    // Store a value for the redirect to the Marko link to happen when page is opened or focused
    if (payload.data && payload.data.url) {
      localforage.setItem('new-nav-request', String(payload.data.url)).then(() => {
        console.log('Navigation request stored successfully in localForage from Service Worker.');
      }).catch((err) => {
        console.error('Error storing value in Service Worker:', err);
      });
    }

    if (payload.data && payload.data.uuid) {
      localforage.setItem('newUnopenedReminder', String(payload.data.path)).then(() => {
        console.log('Pending reminder stored successfully in localForage from Service Worker.');
      }).catch((err) => {
        console.error('Error storing value in Service Worker:', err);
      });
    }

    // Show the notification
    self.registration.showNotification(title, notificationOptions);
  }
});

                              
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  let newUrl = 'https://marko-app.netlify.app';

  if (event.notification && event.notification.data.path) {
    const path = event.notification.data.path;
    const goUuid = path;
    newUrl = `https://marko-app.netlify.app?uuid=${goUuid}`;
  } else {
    event.waitUntil(
      localforage.getItem('new-nav-request').then((navUrl) => {
        if (navUrl) {
          newUrl = `https://marko-app.netlify.app?nav=${navUrl}`;
          // Optionally remove the item from localForage after using it
          return localforage.removeItem('new-nav-request').then(() => {
            return openOrFocusClient(newUrl);
          });
        } else {
          return openOrFocusClient(newUrl);
        }
      }).catch((err) => {
        console.error('Error retrieving navigation URL from localForage:', err);
        return openOrFocusClient(newUrl);
      })
    );
  }

  function openOrFocusClient(url) {
    return clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(clientList => {
      if (clientList.length > 0) {
        // Focus on the first client that is already open
        return clientList[0].focus().then(client => {
          client.postMessage({
            action: 'open_url',
            url: url
          });
        });
      } else {
        // If no clients are open, open a new window
        return clients.openWindow(url);
      }
    });
  }
});
