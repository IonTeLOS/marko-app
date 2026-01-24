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

// Helper: Apply rich notification format
function applyRichFormat(notificationData, messageData) {
  // Handle simple string
  if (typeof messageData === 'string') {
    notificationData.body = messageData;
    return;
  }
  
  // Handle rich object
  if (typeof messageData !== 'object') {
    notificationData.body = String(messageData);
    return;
  }
  
  // Required: message/body
  const body = messageData.message || messageData.body || '';
  
  // Optional: title, icon, badge, image
  if (messageData.title) notificationData.title = messageData.title;
  if (messageData.icon) notificationData.icon = messageData.icon;
  if (messageData.badge) notificationData.badge = messageData.badge;
  if (messageData.image) notificationData.image = messageData.image;
  
  // Optional: tag (replacement behavior)
  if (messageData.tag) notificationData.tag = messageData.tag;
  
  // Optional: behavior
  if (messageData.requireInteraction !== undefined) {
    notificationData.requireInteraction = messageData.requireInteraction;
  }
  if (messageData.silent !== undefined) {
    notificationData.silent = messageData.silent;
  }
  if (messageData.timestamp) {
    notificationData.timestamp = messageData.timestamp;
  }
  
  // Optional: vibrate pattern (mobile)
  if (messageData.vibrate) {
    notificationData.vibrate = messageData.vibrate;
  }
  
  // Optional: actions (interactive buttons)
  if (Array.isArray(messageData.actions) && messageData.actions.length > 0) {
    notificationData.actions = messageData.actions.map(action => ({
      action: action.action,
      title: action.title,
      icon: action.icon
    }));
    console.log('Added actions:', notificationData.actions);
  }
  
  // Store metadata in data field for click handler
  notificationData.data = {
    messageData: messageData, // Full message for reference
    click: messageData.click, // Click URL
    tags: messageData.tags     // Tags for filtering/logic
  };
  
  // Handle markdown stripping if needed
  let displayBody = body;
  if (Array.isArray(messageData.tags)) {
    const hasMarkdown = messageData.tags.some(tag => 
      tag === 'isMarkdown:true' || tag === 'isMarkdown' || tag.toLowerCase() === 'markdown'
    );
    
    if (hasMarkdown) {
      console.log('Markdown detected, stripping for notification');
      notificationData.data.markdownBody = body; // Store original
      displayBody = stripMarkdown(body);         // Strip for display
    }
  }
  
  notificationData.body = displayBody;
  
  console.log('Applied rich format:', {
    title: notificationData.title,
    hasImage: !!notificationData.image,
    hasActions: !!notificationData.actions,
    hasClick: !!messageData.click,
    tags: messageData.tags
  });
}

// Helper: Strip markdown for notification display
function stripMarkdown(text) {
  if (!text) return text;
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')  // **bold**
    .replace(/\*([^*]+)\*/g, '$1')      // *italic*
    .replace(/`([^`]+)`/g, '$1')        // `code`
    .replace(/~~([^~]+)~~/g, '$1')      // ~~strikethrough~~
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')  // [link](url)
    .replace(/^#+\s+/gm, '')            // # headers
    .replace(/^>\s+/gm, '')             // > quotes
    .replace(/^[-*]\s+/gm, '• ');       // - lists to bullets
}

self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);
  console.log('Push data available:', !!event.data);
  
  // Default notification options
  let notificationData = {
    title: 'WebPusher',
    body: 'New message received',
    icon: 'https://cdn-icons-png.flaticon.com/512/733/733585.png',
    badge: 'https://cdn-icons-png.flaticon.com/512/733/733585.png',
    tag: 'webpusher-' + Date.now(), // Unique by default
    requireInteraction: false,
    data: {} // Store metadata here
  };

  const showNotification = async () => {
    if (!event.data) {
      console.log('No data in push event');
      await self.registration.showNotification(notificationData.title, notificationData);
      return;
    }

    try {
      // The push service JSON-stringifies Uint8Arrays, so we need to handle that
      // PushForge sends data as a JSON string, not serialized bytes
      let textData;
      
      try {
        // Try to get as text first (works with PushForge)
        textData = event.data.text();
        console.log('Got push data as text:', textData.substring(0, 100) + '...');
      } catch (e) {
        console.log('Text failed, trying JSON...', e);
        try {
          // Fallback: try as JSON (old aesgcm format)
          const parsed = event.data.json();
          
          // Check if this is a JSON-stringified Uint8Array (old format)
          if (typeof parsed === 'object' && '0' in parsed && '1' in parsed) {
            console.log('Detected JSON-stringified Uint8Array, converting back...');
            const length = Object.keys(parsed).length;
            const bytes = new Uint8Array(length);
            for (let i = 0; i < length; i++) {
              bytes[i] = parsed[i];
            }
            const decoder = new TextDecoder();
            textData = decoder.decode(bytes);
            console.log('Decoded from byte array');
          } else {
            textData = JSON.stringify(parsed);
            console.log('Got as JSON object');
          }
        } catch (e2) {
          console.error('Both text() and json() failed:', e2);
          textData = null;
        }
      }
      
      if (!textData) {
        console.log('Empty push data');
        await self.registration.showNotification(notificationData.title, notificationData);
        return;
      }

      // Try to parse as JSON
      let messageData;
      try {
        messageData = JSON.parse(textData);
        console.log('Parsed JSON successfully');
        console.log('messageData.encrypted:', messageData.encrypted);
        console.log('typeof messageData:', typeof messageData);
      } catch (e) {
        // Not JSON, use as plain text
        console.log('Not JSON, using as plain text');
        notificationData.body = textData;
        await self.registration.showNotification(notificationData.title, notificationData);
        return;
      }
      
      // Check if this is an encrypted message
      const isEncrypted = (
        messageData && 
        typeof messageData === 'object' &&
        messageData.encrypted === true &&
        messageData.ephemeralPublicKey &&
        messageData.iv &&
        messageData.ciphertext
      );
      
      console.log('Is encrypted?', isEncrypted);
      
      if (isEncrypted) {
        console.log('✅ Detected as encrypted message, attempting to decrypt...');
        
        const encryptedData = {
          iv: base64UrlDecode(messageData.iv),
          ciphertext: base64UrlDecode(messageData.ciphertext)
        };
        
        const decrypted = await decryptMessage(encryptedData, messageData.ephemeralPublicKey);
        
        if (decrypted) {
          console.log('✅ Message decrypted successfully');
          
          // Try to parse decrypted content as rich JSON
          let decryptedData;
          try {
            decryptedData = JSON.parse(decrypted);
            console.log('Decrypted content is rich JSON:', decryptedData);
          } catch (e) {
            // Decrypted content is plain text
            decryptedData = decrypted;
            console.log('Decrypted content is plain text');
          }
          
          // Apply rich notification format
          applyRichFormat(notificationData, decryptedData);
          
        } else {
          notificationData.body = '🔒 Encrypted message (unable to decrypt)';
          console.log('❌ Failed to decrypt message');
        }
      } else {
        // Plain JSON message (unencrypted)
        console.log('Plain JSON message (unencrypted)');
        applyRichFormat(notificationData, messageData);
      }
    } catch (e) {
      console.error('Error processing push data:', e);
      notificationData.body = 'Error processing message';
    }

    const notificationOptions = {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      image: notificationData.image,
      tag: notificationData.tag,
      requireInteraction: notificationData.requireInteraction,
      silent: notificationData.silent,
      timestamp: notificationData.timestamp,
      vibrate: notificationData.vibrate,
      actions: notificationData.actions,
      data: notificationData.data || {}
    };
    
    console.log('Showing notification with options:', {
      title: notificationData.title,
      hasBody: !!notificationOptions.body,
      hasIcon: !!notificationOptions.icon,
      hasImage: !!notificationOptions.image,
      imageUrl: notificationOptions.image,
      hasActions: !!notificationOptions.actions,
      actionsCount: notificationOptions.actions?.length || 0
    });
    
    await self.registration.showNotification(notificationData.title, notificationOptions);
  };

  event.waitUntil(showNotification());
});

// Handle notification clicks (including action buttons)
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  console.log('Action:', event.action);
  console.log('Notification data:', event.notification.data);
  
  event.notification.close();
  
  const data = event.notification.data || {};
  const messageData = data.messageData || {};
  
  // Determine which URL to open
  let urlToOpen = null;
  
  if (event.action) {
    // Action button clicked - check if action has custom URL
    const actionConfig = messageData.actions?.find(a => a.action === event.action);
    if (actionConfig && actionConfig.url) {
      urlToOpen = actionConfig.url;
    } else {
      // Action has no URL, might trigger custom logic in future
      console.log('Action clicked without URL:', event.action);
      // Custom apps could add logic here based on action type
      // For now, fall back to main click URL
      urlToOpen = data.click;
    }
  } else {
    // Main notification body clicked
    urlToOpen = data.click;
  }
  
  // Open URL if we have one
  if (urlToOpen) {
    console.log('Opening URL:', urlToOpen);
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then(clientList => {
          // Try to find existing window with this URL
          for (let client of clientList) {
            if (client.url === urlToOpen && 'focus' in client) {
              return client.focus();
            }
          }
          // No existing window, open new one
          if (clients.openWindow) {
            return clients.openWindow(urlToOpen);
          }
        })
    );
  } else {
    console.log('No URL to open, focusing existing window');
    // No URL specified, just focus an existing window
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then(clientList => {
          // Focus first window if available
          if (clientList.length > 0) {
            return clientList[0].focus();
          }
        })
    );
  }
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
