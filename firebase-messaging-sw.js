// firebase-messaging-sw.js

// Import Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// ====================== Firebase Configuration ======================
const firebaseConfig = {
    apiKey: "AIzaSyD96IBVqGKVEdmXIVCYL_7kvlBhJNSD1Ww",
    authDomain: "marko-be9a9.firebaseapp.com",
    databaseURL: "https://marko-be9a9-default-rtdb.firebaseio.com",
    projectId: "marko-be9a9",
    storageBucket: "marko-be9a9.appspot.com",
    messagingSenderId: "7036670175",
    appId: "1:7036670175:web:99992356716578ea13996a"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Unified notification handler for both Firebase and WebPush
const handleNotification = async (payload, isWebPush = false) => {
    console.log(`Received ${isWebPush ? 'WebPush' : 'Firebase'} notification:`, payload);

    let notificationData;
    try {
        // Parse the payload if it's a string
        if (typeof payload === 'string') {
            notificationData = JSON.parse(payload);
        } else if (payload instanceof PushMessageData) {
            notificationData = payload.json();
        } else {
            notificationData = payload;
        }

        console.log('Parsed notification data:', notificationData);

        // Extract notification details
        const notification = notificationData.notification || {};
        const data = notification.data || {};

        const notificationOptions = {
            title: notification.title || 'New Message',
            body: notification.body || 'You have a new message',
            icon: notification.icon || 'https://raw.githubusercontent.com/IonTeLOS/marko-app/refs/heads/main/appLogo_192.png',
            data: {
                url: data.url || '/',
                buttonUrl: data.buttonUrl || '/'
            },
            requireInteraction: true,
            actions: notification.actions || [
                {
                    action: 'open',
                    title: 'Open'
                }
            ]
        };

        console.log('Showing notification with options:', notificationOptions);
        return self.registration.showNotification(notificationOptions.title, notificationOptions);

    } catch (error) {
        console.error('Error processing notification:', error);
        // Show a fallback notification
        return self.registration.showNotification('New Message', {
            body: 'You have a new message',
            icon: 'https://raw.githubusercontent.com/IonTeLOS/marko-app/refs/heads/main/appLogo_192.png'
        });
    }
};
messaging.onBackgroundMessage(payload => {
  console.log('[firebase-messaging-sw.js] Background message received:', payload);
});

// Handle Firebase background messages
// messaging.onBackgroundMessage(payload => handleNotification(payload, false));

// Handle WebPush messages
self.addEventListener('push', event => {
    console.log('Push event received:', event);
    if (event.data) {
        event.waitUntil(handleNotification(event.data, true));
    }
});

// Notification click handler
self.addEventListener('notificationclick', event => {
    console.log('Notification clicked:', event);
    event.notification.close();

    const notificationData = event.notification.data || {};
    let urlToOpen;

    if (event.action === 'open') {
        urlToOpen = notificationData.buttonUrl || '/';
    } else {
        urlToOpen = notificationData.url || '/';
    }

    console.log('Opening URL:', urlToOpen);

    event.waitUntil(
        clients.matchAll({
            type: 'window',
            includeUncontrolled: true
        }).then(windowClients => {
            for (let client of windowClients) {
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});



/*
// firebase-messaging-sw.js

// Import Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// ====================== Firebase Configuration ======================
const firebaseConfig = {
    apiKey: "AIzaSyD96IBVqGKVEdmXIVCYL_7kvlBhJNSD1Ww",
    authDomain: "marko-be9a9.firebaseapp.com",
    databaseURL: "https://marko-be9a9-default-rtdb.firebaseio.com",
    projectId: "marko-be9a9",
    storageBucket: "marko-be9a9.appspot.com",
    messagingSenderId: "7036670175",
    appId: "1:7036670175:web:99992356716578ea13996a"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase Messaging
const messaging = firebase.messaging();

// Background message handler
messaging.onBackgroundMessage(function(payload) {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    // Customize notification here
    const notificationTitle = payload.notification && payload.notification.title ? payload.notification.title : 'Background Message Title';
    const notificationOptions = {
        body: payload.notification && payload.notification.body ? payload.notification.body : 'Background Message body.',
        icon: payload.icon || '/default-icon.png', // Use the 'icon' field or default
        data: {
            url: payload.url || '/', // Pass the 'url' field to notification data
        },
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', function(event) {
    console.log('[firebase-messaging-sw.js] Notification click Received.');

    event.notification.close();

    // Extract the URL from the notification data
    const url = event.notification.data && event.notification.data.url ? event.notification.data.url : '/';

    event.waitUntil(
        clients.openWindow(url)
    );
});

/*

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

// Ensure localForage is configured properly
localforage.config({
    driver: localforage.INDEXEDDB, // Use IndexedDB as the driver
    name: 'Marko' // Name for the database
});

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

async function getKey(topic) {
    const topicKey = `topic-${topic}`; 
    const key = await localforage.getItem(topicKey);
    if (!key) {
        console.error('No key found for topic:', topic);
        return null;
    }
    if (key.byteLength !== 32) {
        console.error('Invalid key length:', key.byteLength);
        return null;
    }
    return new Uint8Array(key);
}

function extractEncryptedData(fakeUrl) {
    const regex = /iv\/([^/]+)\/encryptedData\/(.+)/;
    const match = fakeUrl.match(regex);

    if (!match || match.length < 3) {
        throw new Error('Invalid fake URL format');
    }

    const iv = match[1];
    const encryptedData = match[2];

    return { iv, encryptedData };
}




function base64ToUint8Array(base64String) {
    // Ensure the base64 string has the correct padding
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')  // Replace URL-safe base64 '-' with '+'
        .replace(/_/g, '/'); // Replace URL-safe base64 '_' with '/'

    try {
        // Decode the base64 string
        const rawData = atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        // Convert raw string data to a Uint8Array
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }

        return outputArray;
    } catch (e) {
        console.error('Base64 decoding failed:', e);
        throw new Error('Failed to decode base64 string');
    }
}


async function decryptMessage(encryptedMessage, key) {
    const keyBuffer = await crypto.subtle.importKey(
        "raw",
        key,
        { name: "AES-GCM" },
        false,
        ["decrypt"]
    );

    let parsedMessage;
    try {
        // Check if encryptedMessage is an object or a string
        if (typeof encryptedMessage === 'string') {
            parsedMessage = JSON.parse(encryptedMessage);
        } else if (typeof encryptedMessage === 'object') {
            parsedMessage = encryptedMessage;
        } else {
            throw new Error('Invalid encrypted message format');
        }
    } catch (error) {
        console.error('Error parsing encrypted message:', error);
        throw error;
    }

    const { iv, encryptedData } = parsedMessage;

    // Decode base64-encoded iv and encryptedData
    const ivBuffer = base64ToUint8Array(iv);
    const encryptedDataBuffer = base64ToUint8Array(encryptedData);

    // Ensure IV is 12 bytes (96 bits) long
    if (ivBuffer.length !== 12) {
        throw new Error(`Invalid IV length: ${ivBuffer.length} bytes. Expected 12 bytes.`);
    }

    const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: ivBuffer },
        keyBuffer,
        encryptedDataBuffer
    );

    return new TextDecoder().decode(decrypted);
}


messaging.onBackgroundMessage((payload) => {
  (async () => {
console.log('[firebase-messaging-sw.js] Received background message ', payload);
  // Check if the message is from a topic
if (payload.data && payload.data.topic) {
// Check if the message is encrypted (i.e., does not have a 'sys' tag)
  const isEncrypted = !payload.data.tags || payload.data.tags !== 'sys';

  if (isEncrypted && payload.data && payload.data.topic) {
    try {
      const topic = payload.data.topic;
      const key = await getKey(topic);

      if (!key) {
        throw new Error('No key available for decryption');
      }

      // Decrypt the message itself
      const decryptedMessage = await decryptMessage(payload.data.message, key);

// Decrypt attachment URL if it exists
let decryptedAttachmentUrl = payload.data.attachment_url;

if (decryptedAttachmentUrl) {
  try {
    // Extract iv and encryptedData from the attachment URL
    const encryptedAttachData = extractEncryptedData(payload.data.attachment_url);

    // Decrypt the extracted data
    decryptedAttachmentUrl = await decryptMessage(JSON.stringify(encryptedAttachData), key);
  } catch (error) {
    console.error('Error decrypting attachment URL:', error);
    // If decryption fails, fall back to an empty string
    decryptedAttachmentUrl = '';
  }
}


      // Decrypt click URL if it exists
      let decryptedClickUrl = payload.data.click;
      if (decryptedClickUrl) {
        decryptedClickUrl = await decryptMessage(decryptedClickUrl, key);
      }

      // Show the notification with decrypted data
      const notificationTitle = payload.data.title || payload.data.topic;
      const notificationBody = decryptedMessage || 'buzzed..';
      const notificationIcon = decryptedAttachmentUrl || 'https://raw.githubusercontent.com/IonTeLOS/marko-app/main/triskelion.svg'; // Fallback icon
      const clickAction = decryptedClickUrl || 'https://marko-app.netlify.app'; // Fallback URL

      const notificationOptions = {
        body: notificationBody,
        icon: notificationIcon,
        data: {
          url: clickAction
        }
      };

      // Store any navigation request for later use
      if (decryptedClickUrl) {
        await localforage.setItem('new-nav-request', decryptedClickUrl);
        console.log('Decrypted navigation request stored successfully.');
      }

      self.registration.showNotification(notificationTitle, notificationOptions);
    } catch (error) {
      console.error('Error processing encrypted message:', error);
      // TODO: Handle decryption error (e.g., show a generic notification)
    }
  } else if (payload.data.tags === 'sys') {
    // Handle unencrypted system message
    const notificationTitle = payload.data.title || 'System Message';
    const notificationBody = payload.data.message || 'BUZZZZ..!';
    const notificationIcon = payload.data.attachment_url || 'https://raw.githubusercontent.com/IonTeLOS/marko-app/main/triskelion.svg';
    const clickAction = payload.data.click || 'https://marko-app.netlify.app';

    const notificationOptions = {
      body: notificationBody,
      icon: notificationIcon,
      data: {
        url: clickAction
      }
    };

    // Store any navigation request
    if (payload.data.click) {
      await localforage.setItem('new-nav-request', payload.data.click);
      console.log('Navigation request stored for system message.');
    }

    self.registration.showNotification(notificationTitle, notificationOptions);
  }
}
  // Handle other cases where notification is provided in payload.notification
else if (payload.notification) {
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
})(); // IIFE wrapper
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
*/
