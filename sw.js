// WebPusher Service Worker with E2EE support
// Handles incoming push notifications and decrypts them

self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(self.clients.claim());
});

// Helper: base64url decode
function base64UrlDecode(str) {
  // Add padding
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) {
    str += '=';
  }
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Helper: Get private key from IndexedDB
async function getPrivateKey() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('webpusher-keys', 1);
    
    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['keys'], 'readonly');
      const store = transaction.objectStore('keys');
      const getRequest = store.get('privateKey');
      
      getRequest.onsuccess = () => {
        if (getRequest.result) {
          resolve(getRequest.result.key);
        } else {
          resolve(null);
        }
      };
      
      getRequest.onerror = () => reject(getRequest.error);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('keys')) {
        db.createObjectStore('keys');
      }
    };
  });
}

// Helper: Decrypt message using ECDH
async function decryptMessage(encryptedData, ephemeralPublicKeyJwk) {
  try {
    // Get our private key
    const privateKeyJwk = await getPrivateKey();
    if (!privateKeyJwk) {
      console.log('No private key found, showing encrypted message');
      return null;
    }

    // Import keys
    const privateKey = await crypto.subtle.importKey(
      'jwk',
      privateKeyJwk,
      { name: 'ECDH', namedCurve: 'P-256' },
      false,
      ['deriveKey']
    );

    const ephemeralPublicKey = await crypto.subtle.importKey(
      'jwk',
      ephemeralPublicKeyJwk,
      { name: 'ECDH', namedCurve: 'P-256' },
      false,
      []
    );

    // Derive shared secret
    const sharedSecret = await crypto.subtle.deriveKey(
      { name: 'ECDH', public: ephemeralPublicKey },
      privateKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );

    // Decrypt
    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: encryptedData.iv
      },
      sharedSecret,
      encryptedData.ciphertext
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('Decryption failed:', error);
    return null;
  }
}

self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);
  console.log('Push data available:', !!event.data);
  
  let notificationData = {
    title: 'WebPusher',
    body: 'New message received',
    icon: 'https://cdn-icons-png.flaticon.com/512/733/733585.png',
    badge: 'https://cdn-icons-png.flaticon.com/512/733/733585.png',
    tag: 'webpusher-notification',
    requireInteraction: false
  };

  const showNotification = async () => {
    if (!event.data) {
      console.log('No data in push event');
      await self.registration.showNotification(notificationData.title, notificationData);
      return;
    }

    try {
      // First try to get the text
      const textData = event.data.text();
      console.log('Push data text:', textData);
      
      if (!textData) {
        console.log('Empty push data');
        await self.registration.showNotification(notificationData.title, notificationData);
        return;
      }

      // Try to parse as JSON
      let data;
      try {
        data = JSON.parse(textData);
        console.log('Parsed JSON data:', data);
      } catch (e) {
        // Not JSON, use as plain text
        console.log('Not JSON, using as plain text');
        notificationData.body = textData;
        await self.registration.showNotification(notificationData.title, notificationData);
        return;
      }
      
      // Check if this is an encrypted message
      if (data.encrypted && data.ephemeralPublicKey && data.iv && data.ciphertext) {
        console.log('Received encrypted message, attempting to decrypt...');
        
        const encryptedData = {
          iv: base64UrlDecode(data.iv),
          ciphertext: base64UrlDecode(data.ciphertext)
        };
        
        const decrypted = await decryptMessage(encryptedData, data.ephemeralPublicKey);
        
        if (decrypted) {
          notificationData.body = decrypted;
          notificationData.data = { decrypted: true };
          console.log('Message decrypted successfully:', decrypted);
        } else {
          notificationData.body = '🔒 Encrypted message (unable to decrypt)';
          notificationData.data = { encrypted: true };
          console.log('Failed to decrypt message');
        }
      } else {
        // Plain JSON message
        notificationData.body = data.message || data.body || JSON.stringify(data);
        if (data.title) notificationData.title = data.title;
        console.log('Plain message:', notificationData.body);
      }
    } catch (e) {
      console.error('Error processing push data:', e);
      notificationData.body = 'Error processing message';
    }

    await self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      requireInteraction: notificationData.requireInteraction,
      data: notificationData.data || {}
    });
  };

  event.waitUntil(showNotification());
});

self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  event.notification.close();

  // Open or focus the app when notification is clicked
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // If a window is already open, focus it
        for (let client of clientList) {
          if ('focus' in client) {
            return client.focus();
          }
        }
        // Otherwise open a new window
        if (self.clients.openWindow) {
          return self.clients.openWindow('/');
        }
      })
  );
});
