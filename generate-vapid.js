// Generate VAPID keys for Web Push
// Run with: node generate-vapid.js

import crypto from 'crypto';

function base64UrlEncode(buffer) {
  return buffer.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// Generate VAPID key pair
const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
  namedCurve: 'prime256v1',
  publicKeyEncoding: {
    type: 'spki',
    format: 'der'
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'der'
  }
});

const publicKeyBase64 = base64UrlEncode(publicKey);
const privateKeyBase64 = base64UrlEncode(privateKey);

console.log('\n=== VAPID Keys Generated ===\n');
console.log('Public Key (use in browser):');
console.log(publicKeyBase64);
console.log('\nPrivate Key (keep secret):');
console.log(privateKeyBase64);
console.log('\nSave these keys - you\'ll need them for admin registration!\n');
