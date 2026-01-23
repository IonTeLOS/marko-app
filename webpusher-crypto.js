// WebPusher E2EE Helper Functions
// Usage: Include this script before using encryption functions

const WebPusherCrypto = {
  // Base64url encode
  base64UrlEncode(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  },

  // Base64url decode
  base64UrlDecode(str) {
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
  },

  // Encrypt message for a recipient
  async encryptMessage(plaintext, recipientPublicKeyJwk) {
    try {
      // Generate ephemeral key pair
      const ephemeralKeyPair = await crypto.subtle.generateKey(
        { name: 'ECDH', namedCurve: 'P-256' },
        true,
        ['deriveKey']
      );

      // Import recipient's public key
      const recipientPublicKey = await crypto.subtle.importKey(
        'jwk',
        recipientPublicKeyJwk,
        { name: 'ECDH', namedCurve: 'P-256' },
        false,
        []
      );

      // Derive shared secret
      const sharedSecret = await crypto.subtle.deriveKey(
        { name: 'ECDH', public: recipientPublicKey },
        ephemeralKeyPair.privateKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt']
      );

      // Generate random IV
      const iv = crypto.getRandomValues(new Uint8Array(12));

      // Encrypt the plaintext
      const encoder = new TextEncoder();
      const plaintextBytes = encoder.encode(plaintext);

      const ciphertext = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        sharedSecret,
        plaintextBytes
      );

      // Export ephemeral public key
      const ephemeralPublicKeyJwk = await crypto.subtle.exportKey(
        'jwk',
        ephemeralKeyPair.publicKey
      );

      // Return encrypted package
      return {
        encrypted: true,
        ephemeralPublicKey: ephemeralPublicKeyJwk,
        iv: this.base64UrlEncode(iv),
        ciphertext: this.base64UrlEncode(ciphertext)
      };
    } catch (error) {
      console.error('Encryption failed:', error);
      throw error;
    }
  },

  // Decrypt message with our private key
  async decryptMessage(encryptedData, privateKeyJwk) {
    try {
      // Import our private key
      const privateKey = await crypto.subtle.importKey(
        'jwk',
        privateKeyJwk,
        { name: 'ECDH', namedCurve: 'P-256' },
        false,
        ['deriveKey']
      );

      // Import ephemeral public key
      const ephemeralPublicKey = await crypto.subtle.importKey(
        'jwk',
        encryptedData.ephemeralPublicKey,
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
      const iv = this.base64UrlDecode(encryptedData.iv);
      const ciphertext = this.base64UrlDecode(encryptedData.ciphertext);

      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        sharedSecret,
        ciphertext
      );

      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw error;
    }
  },

  // Get private key from IndexedDB
  async getPrivateKey() {
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
};
