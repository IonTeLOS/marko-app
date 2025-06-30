// netlify/functions/arload.js - Enhanced version with file upload support
const crypto = require('crypto');
const multipart = require('lambda-multipart-parser');

// Configuration constants
const CONFIG = {
  MAX_SIZE_BYTES: 100 * 1024, // 100KB final upload limit
  MAX_RAW_FOR_ENCRYPTION: 72 * 1024, // 72KB max raw content that will be encrypted
  MAX_ALREADY_ENCRYPTED: 95 * 1024, // 95KB max for already encrypted or unencrypted content
  ENCRYPTION_OVERHEAD_PERCENT: 37, // Real-world encryption overhead: ~37%
  ARWEAVE_HOST: 'arweave.net',
  TURBO_UPLOAD_URL: 'https://upload.ardrive.io/v1/tx'
};

// Core uploader class (same as before)
class MinimalThyraUploader {
  constructor() {
    this.arweave = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    
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
    let shareUrl = `${baseUrl}/s/?url=${btoa(`https://arweave.net/${arweaveId}`)}&key=${encodeURIComponent(keyB64)}`;
    
    if (contentType) {
      shareUrl += `&type=${encodeURIComponent(contentType)}`;
    }
    
    return shareUrl;
  }

  validateSize(content, willEncrypt = true) {
    const baseSize = Buffer.isBuffer(content) ? content.length : Buffer.from(content).length;
    
    if (willEncrypt) {
      if (baseSize > CONFIG.MAX_RAW_FOR_ENCRYPTION) {
        throw new Error(`Content too large for encryption. Max: ${Math.floor(CONFIG.MAX_RAW_FOR_ENCRYPTION / 1024)}KB, Actual: ${Math.floor(baseSize / 1024)}KB. Use encrypt=false for larger content.`);
      }
      
      const estimatedEncryptedSize = Math.ceil(baseSize * (1 + CONFIG.ENCRYPTION_OVERHEAD_PERCENT / 100));
      
      if (estimatedEncryptedSize > CONFIG.MAX_SIZE_BYTES) {
        throw new Error(`Encrypted content would be too large. Estimated: ${Math.floor(estimatedEncryptedSize / 1024)}KB, Max: ${Math.floor(CONFIG.MAX_SIZE_BYTES / 1024)}KB`);
      }
      
      return { baseSize, estimatedFinalSize: estimatedEncryptedSize };
      
    } else {
      if (baseSize > CONFIG.MAX_ALREADY_ENCRYPTED) {
        throw new Error(`Content too large. Max: ${Math.floor(CONFIG.MAX_ALREADY_ENCRYPTED / 1024)}KB, Actual: ${Math.floor(baseSize / 1024)}KB`);
      }
      
      return { baseSize, estimatedFinalSize: baseSize };
    }
  }

  validateEncryptionKey(customKey) {
    if (!customKey) return null;
    
    try {
      const keyBuffer = Buffer.from(customKey, 'base64');
      if (keyBuffer.length !== 32) {
        throw new Error(`Invalid key length: expected 32 bytes, got ${keyBuffer.length} bytes`);
      }
      return keyBuffer;
    } catch (err) {
      if (err.message.includes('Invalid key length')) {
        throw err;
      }
      throw new Error('Invalid base64 key format');
    }
  }

  // NEW: Detect content type from file
  detectContentType(buffer, filename = '', mimeType = '') {
    // Use provided mime type if available
    if (mimeType && mimeType !== 'application/octet-stream') {
      return mimeType;
    }

    // Detect from file extension
    const ext = filename.toLowerCase().split('.').pop();
    const extensionMap = {
      'txt': 'text/plain',
      'html': 'text/html',
      'htm': 'text/html',
      'css': 'text/css',
      'js': 'application/javascript',
      'json': 'application/json',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'zip': 'application/zip'
    };

    if (extensionMap[ext]) {
      return extensionMap[ext];
    }

    // Detect from file signature (magic bytes)
    const bytes = buffer.slice(0, 16);
    
    // Images
    if (bytes[0] === 0xFF && bytes[1] === 0xD8) return 'image/jpeg';
    if (bytes[0] === 0x89 && bytes[1] === 0x50) return 'image/png';
    if (bytes[0] === 0x47 && bytes[1] === 0x49) return 'image/gif';
    
    // Documents
    if (bytes[0] === 0x25 && bytes[1] === 0x50) return 'application/pdf'; // %PDF
    if (bytes[0] === 0x50 && bytes[1] === 0x4B) return 'application/zip'; // PK (zip/docx)
    
    // Try to detect text
    const isText = this.isTextContent(bytes);
    if (isText) {
      const text = buffer.toString('utf8', 0, Math.min(1000, buffer.length));
      if (text.includes('<!DOCTYPE') || text.includes('<html')) {
        return 'text/html';
      }
      return 'text/plain';
    }

    return 'application/octet-stream';
  }

  isTextContent(bytes) {
    for (let i = 0; i < Math.min(100, bytes.length); i++) {
      const byte = bytes[i];
      if (byte === 0 || (byte < 32 && byte !== 9 && byte !== 10 && byte !== 13)) {
        return false;
      }
    }
    return true;
  }
}

// Enhanced Netlify function handler
exports.handler = async (event, context) => {
  const startTime = Date.now();
  
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
    const uploader = new MinimalThyraUploader();
    const timestamp = Date.now();
    
    let requestData;
    let contentBuffer;
    let originalFilename = 'upload';
    let detectedContentType = 'application/octet-stream';

    // NEW: Check if this is a multipart file upload
    const contentType = event.headers['content-type'] || '';
    
    if (contentType.includes('multipart/form-data')) {
      // Handle file upload
      try {
        const result = await multipart.parse(event);
        
        if (!result.files || result.files.length === 0) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              success: false,
              error: 'NO_FILE_PROVIDED',
              message: 'No file provided in multipart upload',
              duration: Date.now() - startTime
            })
          };
        }

        const file = result.files[0];
        contentBuffer = Buffer.from(file.content);
        originalFilename = file.filename || 'upload';
        detectedContentType = uploader.detectContentType(contentBuffer, originalFilename, file.contentType);

        // Extract form parameters
        requestData = {
          encrypt: result.encrypt === 'true' || result.encrypt === true,
          customKey: result.customKey || null,
          note: result.note || null,
          id: result.id || null,
          includeWallet: result.includeWallet === 'true' || result.includeWallet === true,
          contentType: result.contentType || detectedContentType
        };

      } catch (parseError) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'MULTIPART_PARSE_ERROR',
            message: `Failed to parse multipart data: ${parseError.message}`,
            duration: Date.now() - startTime
          })
        };
      }

    } else {
      // Handle JSON request (existing functionality)
      try {
        requestData = JSON.parse(event.body || '{}');
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

      const { content, isBase64 = false } = requestData;

      if (!content && content !== "") {
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

      // Convert content to buffer
      try {
        contentBuffer = isBase64 ? Buffer.from(content, 'base64') : Buffer.from(content, 'utf8');
        detectedContentType = uploader.detectContentType(contentBuffer);
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
    }

    const {
      encrypt = true,
      customKey = null,
      note = null,
      id = null,
      includeWallet = false,
      contentType = detectedContentType
    } = requestData;

    const uploadId = id || crypto.randomUUID();

    // Validate size with limits
    const sizeInfo = uploader.validateSize(contentBuffer, encrypt);

    let finalContent, encryptionKey, shareUrl;

    if (encrypt) {
      // Validate custom key first, then generate or use it
      try {
        encryptionKey = customKey 
          ? uploader.validateEncryptionKey(customKey)
          : await uploader.generateEncryptionKey();
      } catch (keyError) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'INVALID_KEY_LENGTH',
            message: keyError.message,
            duration: Date.now() - startTime
          })
        };
      }

      // Encrypt content
      const encryptedData = await uploader.encryptContent(contentBuffer, encryptionKey);
      finalContent = Buffer.from(JSON.stringify(encryptedData));

      if (finalContent.length > CONFIG.MAX_SIZE_BYTES) {
        throw new Error(`Encrypted content too large: ${finalContent.length} bytes`);
      }

    } else {
      finalContent = contentBuffer;
      
      if (customKey) {
        try {
          encryptionKey = uploader.validateEncryptionKey(customKey);
        } catch (keyError) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              success: false,
              error: 'INVALID_KEY_LENGTH',
              message: keyError.message,
              duration: Date.now() - startTime
            })
          };
        }
      }
    }

    // Upload to Arweave
    const uploadResult = await uploader.uploadToArweave(finalContent, [
      ...(note ? [{ name: 'Note', value: note }] : []),
      ...(originalFilename !== 'upload' ? [{ name: 'Original-Filename', value: originalFilename }] : []),
      { name: 'Content-Type-Hint', value: contentType },
      { name: 'Encrypted', value: encrypt.toString() },
      { name: 'Upload-ID', value: uploadId }
    ]);

    const arweaveId = uploadResult.id;
    const arweaveUrl = `https://arweave.net/${arweaveId}`;

    // Create share URL
    if (encryptionKey) {
      const protocol = event.headers['x-forwarded-proto'] || 'https';
      const host = event.headers.host;
      const baseUrl = `${protocol}://${host}`;
      shareUrl = uploader.createShareUrl(arweaveId, encryptionKey, baseUrl, contentType);
    } else if (!encrypt) {
      const protocol = event.headers['x-forwarded-proto'] || 'https';
      const host = event.headers.host;
      const baseUrl = `${protocol}://${host}`;
      shareUrl = `${baseUrl}/s/?url=${btoa(arweaveUrl)}${contentType ? `&type=${encodeURIComponent(contentType)}` : ''}`;
    }

    const response = {
      success: true,
      id: uploadId,
      arweaveId,
      url: arweaveUrl,
      encrypted: encrypt,
      size: sizeInfo.baseSize,
      contentType: contentType,
      timestamp,
      duration: Date.now() - startTime
    };

    // Add conditional fields
    if (shareUrl) response.shareUrl = shareUrl;
    if (note) response.note = note;
    if (originalFilename !== 'upload') response.filename = originalFilename;
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

    if (error.message.includes('too large for encryption')) {
      errorCode = 'CONTENT_TOO_LARGE_FOR_ENCRYPTION';
      statusCode = 413;
    } else if (error.message.includes('Encrypted content would be too large')) {
      errorCode = 'ENCRYPTED_SIZE_TOO_LARGE';
      statusCode = 413;
    } else if (error.message.includes('Content too large')) {
      errorCode = 'CONTENT_TOO_LARGE';
      statusCode = 413;
    } else if (error.message.includes('Invalid content')) {
      errorCode = 'INVALID_CONTENT';
      statusCode = 400;
    } else if (error.message.includes('Invalid key length')) {
      errorCode = 'INVALID_KEY_LENGTH';
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
