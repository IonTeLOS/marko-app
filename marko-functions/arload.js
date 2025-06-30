// netlify/functions/upload.js - Netlify-compatible version
const Fastify = require('fastify');
const crypto = require('crypto');

// Configuration constants
const CONFIG = {
  MAX_SIZE_BYTES: 100 * 1024, // 100KB
  ENCRYPTION_OVERHEAD: 64, // Approximate overhead for AES-256-GCM + metadata
  ARWEAVE_HOST: 'arweave.net',
  TURBO_UPLOAD_URL: 'https://upload.ardrive.io/v1/tx'
};

// Core uploader class
class MinimalThyraUploader {
  constructor() {
    this.arweave = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    
    // Dynamic imports inside async function
    const Arweave = (await import('arweave')).default;
    this.arweave = Arweave.init({
      host: CONFIG.ARWEAVE_HOST,
      port: 443,
      protocol: 'https'
    });
    
    this.initialized = true;
  }

  async createEphemeralWallet() {
    await this.initialize();
    return await this.arweave.wallets.generate();
  }

  async generateEncryptionKey() {
    return crypto.randomBytes(32);
  }

  async encryptContent(content, key) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    
    let encrypted = cipher.update(content);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    const authTag = cipher.getAuthTag();

    return {
      encrypted: encrypted.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      algorithm: 'aes-256-gcm'
    };
  }

  async uploadToArweave(content, tags = []) {
    const wallet = await this.createEphemeralWallet();
    
    // Dynamic import
    const { createData, ArweaveSigner } = await import('arbundles');
    const signer = new ArweaveSigner(wallet);

    const dataItem = createData(content, signer, {
      tags: [
        { name: 'Content-Type', value: 'application/octet-stream' },
        { name: 'App-Name', value: 'MinimalThyra' },
        { name: 'Timestamp', value: Date.now().toString() },
        ...tags
      ]
    });

    await dataItem.sign(signer);

    const response = await fetch(CONFIG.TURBO_UPLOAD_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Accept': 'application/json'
      },
      body: dataItem.getRaw()
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Arweave upload failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    return { 
      id: result.id, 
      wallet: wallet
    };
  }

  createShareUrl(arweaveId, encryptionKey, baseUrl, contentType = null) {
    const keyB64 = encryptionKey.toString('base64');
    let shareUrl = `${baseUrl}?url=${btoa(`https://arweave.net/${arweaveId}`)}&key=${encodeURIComponent(keyB64)}`;
    
    if (contentType) {
      shareUrl += `&type=${encodeURIComponent(contentType)}`;
    }
    
    return shareUrl;
  }

  validateSize(content, willEncrypt = true) {
    const baseSize = Buffer.isBuffer(content) ? content.length : Buffer.from(content).length;
    const estimatedFinalSize = willEncrypt ? baseSize + CONFIG.ENCRYPTION_OVERHEAD : baseSize;
    
    if (estimatedFinalSize > CONFIG.MAX_SIZE_BYTES) {
      throw new Error(`Content too large. Max: ${CONFIG.MAX_SIZE_BYTES} bytes, Estimated: ${estimatedFinalSize} bytes`);
    }
    
    return { baseSize, estimatedFinalSize };
  }
}

// Netlify function handler
exports.handler = async (event, context) => {
  const startTime = Date.now();
  
  // CORS handling
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'METHOD_NOT_ALLOWED',
        message: 'Only POST method allowed',
        duration: Date.now() - startTime
      })
    };
  }

  try {
    let requestBody;
    try {
      requestBody = JSON.parse(event.body || '{}');
    } catch (err) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'INVALID_JSON',
          message: 'Invalid JSON in request body',
          duration: Date.now() - startTime
        })
      };
    }

    const { 
      content, 
      encrypt = true, 
      customKey = null, 
      isBase64 = false, 
      note = null,
      id = null,
      includeWallet = false,
      contentType = null
    } = requestBody;

    if (!content) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'MISSING_CONTENT',
          message: 'Content is required',
          duration: Date.now() - startTime
        })
      };
    }

    const uploader = new MinimalThyraUploader();
    const timestamp = Date.now();
    const uploadId = id || crypto.randomUUID();

    // Convert content to buffer
    let contentBuffer;
    try {
      contentBuffer = isBase64 ? Buffer.from(content, 'base64') : Buffer.from(content, 'utf8');
    } catch (err) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'INVALID_CONTENT',
          message: 'Invalid content format',
          duration: Date.now() - startTime
        })
      };
    }

    // Validate size before processing
    const sizeInfo = uploader.validateSize(contentBuffer, encrypt);

    let finalContent, encryptionKey, shareUrl;

    if (encrypt) {
      // Generate or use custom key
      encryptionKey = customKey 
        ? Buffer.from(customKey, 'base64')
        : await uploader.generateEncryptionKey();

      // Encrypt content
      const encryptedData = await uploader.encryptContent(contentBuffer, encryptionKey);
      finalContent = Buffer.from(JSON.stringify(encryptedData));

      // Double-check encrypted size
      if (finalContent.length > CONFIG.MAX_SIZE_BYTES) {
        throw new Error(`Encrypted content too large: ${finalContent.length} bytes`);
      }

    } else {
      // Upload as-is
      finalContent = contentBuffer;
      
      // If user provided custom key but didn't want us to encrypt,
      // they likely want the shareUrl for already encrypted data
      if (customKey) {
        encryptionKey = Buffer.from(customKey, 'base64');
      }
    }

    // Upload to Arweave
    const uploadResult = await uploader.uploadToArweave(finalContent, [
      ...(note ? [{ name: 'Note', value: note }] : []),
      ...(contentType ? [{ name: 'Content-Type-Hint', value: contentType }] : []),
      { name: 'Encrypted', value: encrypt.toString() },
      { name: 'Upload-ID', value: uploadId }
    ]);

    const arweaveId = uploadResult.id;
    const arweaveUrl = `https://arweave.net/${arweaveId}`;

    // Create share URL if we have encryption key
    if (encryptionKey) {
      const protocol = event.headers['x-forwarded-proto'] || 'https';
      const host = event.headers.host;
      const baseUrl = `${protocol}://${host}`;
      shareUrl = uploader.createShareUrl(arweaveId, encryptionKey, baseUrl, contentType);
    }

    const response = {
      success: true,
      id: uploadId,
      arweaveId,
      url: arweaveUrl,
      encrypted: encrypt,
      size: sizeInfo.baseSize,
      timestamp,
      duration: Date.now() - startTime
    };

    // Add conditional fields
    if (shareUrl) response.shareUrl = shareUrl;
    if (note) response.note = note;
    if (includeWallet) response.wallet = uploadResult.wallet;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response)
    };

  } catch (error) {
    console.error('Upload error:', error);

    let errorCode = 'UPLOAD_FAILED';
    let statusCode = 500;

    if (error.message.includes('too large')) {
      errorCode = 'CONTENT_TOO_LARGE';
      statusCode = 413;
    } else if (error.message.includes('Invalid content')) {
      errorCode = 'INVALID_CONTENT';
      statusCode = 400;
    }

    return {
      statusCode,
      headers,
      body: JSON.stringify({
        success: false,
        error: errorCode,
        message: error.message,
        duration: Date.now() - startTime
      })
    };
  }
};
