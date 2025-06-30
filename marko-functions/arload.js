// minimal-thyra-api.js - Stateless API for sub-100KB uploads
import Fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { createData, ArweaveSigner } from 'arbundles';
import Arweave from 'arweave';
import crypto from 'crypto';

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV === 'development' ? {
      target: 'pino-pretty'
    } : undefined
  }
});

// Register plugins
await fastify.register(cors);
await fastify.register(swagger, {
  openapi: {
    openapi: '3.0.0',
    info: {
      title: 'Minimal Thyra API',
      description: 'Stateless API for sub-100KB encrypted uploads to Arweave',
      version: '1.0.0'
    }
  }
});

// Constants
const CONFIG = {
  MAX_SIZE_BYTES: 100 * 1024, // 100KB
  ENCRYPTION_OVERHEAD: 64, // Approximate overhead for AES-256-GCM + metadata
  ARWEAVE_HOST: 'arweave.net',
  TURBO_UPLOAD_URL: 'https://upload.ardrive.io/v1/tx'
};

// Core uploader class
class MinimalThyraUploader {
  constructor() {
    this.arweave = Arweave.init({
      host: CONFIG.ARWEAVE_HOST,
      port: 443,
      protocol: 'https'
    });
  }

  async createEphemeralWallet() {
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
      wallet: wallet  // Return wallet for +wallet feature
    };
  }

  createShareUrl(arweaveId, encryptionKey, baseUrl, contentType = null) {
    const keyB64 = encryptionKey.toString('base64');
    let shareUrl = `${baseUrl}?url=${btoa(`https://arweave.net/${arweaveId}`)}&key=${encodeURIComponent(keyB64)}`;
    
    // Add content type hint to share URL for webapp processing
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

// Upload endpoint
fastify.post('/api/upload', {
  schema: {
    description: 'Upload content to Arweave with optional encryption',
    body: {
      type: 'object',
      properties: {
        content: { 
          type: 'string', 
          description: 'Content to upload (base64 for binary data)' 
        },
        encrypt: { 
          type: 'boolean', 
          default: true,
          description: 'Whether to encrypt the content' 
        },
        customKey: { 
          type: 'string', 
          description: 'Custom encryption key (base64). If provided with already encrypted data, set encrypt=false' 
        },
        isBase64: { 
          type: 'boolean', 
          default: false,
          description: 'Whether content is base64 encoded binary data' 
        },
        note: { 
          type: 'string', 
          maxLength: 250,
          description: 'Optional note for the upload' 
        },
        id: {
          type: 'string',
          description: 'Custom ID for the upload'
        },
        includeWallet: {
          type: 'boolean',
          default: false,
          description: 'Include wallet JSON in response (courtesy feature for ArDrive ecosystem)'
        },
        contentType: {
          type: 'string',
          description: 'Content type hint for webapp processing (e.g., "text", "image", "audio")'
        }
      },
      required: ['content']
    },
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          id: { type: 'string' },
          arweaveId: { type: 'string' },
          url: { type: 'string' },
          shareUrl: { type: 'string' },
          encrypted: { type: 'boolean' },
          size: { type: 'number' },
          timestamp: { type: 'number' },
          note: { type: 'string' },
          wallet: { type: 'object' }
        }
      }
    }
  }
}, async (request, reply) => {
  const startTime = Date.now(); // Track execution time
  
  try {
    const { 
      content, 
      encrypt = true, 
      customKey = null, 
      isBase64 = false, 
      note = null,
      id = null,
      includeWallet = false,
      contentType = null
    } = request.body;

    if (!content) {
      return reply.code(400).send({
        success: false,
        error: 'MISSING_CONTENT',
        message: 'Content is required'
      });
    }

    const uploader = new MinimalThyraUploader();
    const timestamp = Date.now();
    const uploadId = id || crypto.randomUUID();

    // Convert content to buffer
    let contentBuffer;
    try {
      contentBuffer = isBase64 ? Buffer.from(content, 'base64') : Buffer.from(content, 'utf8');
    } catch (err) {
      return reply.code(400).send({
        success: false,
        error: 'INVALID_CONTENT',
        message: 'Invalid content format'
      });
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
      // Upload as-is (user provided already encrypted data or wants unencrypted)
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
      const baseUrl = `${request.protocol}://${request.headers.host}`;
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
      duration: Date.now() - startTime // Add execution duration
    };

    // Add conditional fields
    if (shareUrl) response.shareUrl = shareUrl;
    if (note) response.note = note;
    if (includeWallet) response.wallet = uploadResult.wallet;

    reply.send(response);

  } catch (error) {
    fastify.log.error(error);

    let errorCode = 'UPLOAD_FAILED';
    let statusCode = 500;

    if (error.message.includes('too large')) {
      errorCode = 'CONTENT_TOO_LARGE';
      statusCode = 413;
    } else if (error.message.includes('Invalid content')) {
      errorCode = 'INVALID_CONTENT';
      statusCode = 400;
    }

    reply.code(statusCode).send({
      success: false,
      error: errorCode,
      message: error.message,
      duration: Date.now() - startTime // Include duration even in errors
    });
  }
});

// Health check
fastify.get('/api/health', {
  schema: {
    description: 'Health check endpoint',
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          status: { type: 'string' },
          maxSizeKB: { type: 'number' },
          timestamp: { type: 'number' },
          duration: { type: 'number' }
        }
      }
    }
  }
}, async (request, reply) => {
  const startTime = Date.now();
  
  reply.send({
    success: true,
    status: 'healthy',
    maxSizeKB: Math.floor(CONFIG.MAX_SIZE_BYTES / 1024),
    timestamp: Date.now(),
    duration: Date.now() - startTime
  });
});

// Info endpoint
fastify.get('/api/info', {
  schema: {
    description: 'API information and usage',
    response: {
      200: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          version: { type: 'string' },
          maxSizeBytes: { type: 'number' },
          maxSizeKB: { type: 'number' },
          features: { type: 'array', items: { type: 'string' } },
          endpoints: { type: 'array', items: { type: 'string' } }
        }
      }
    }
  }
}, async (request, reply) => {
  reply.send({
    name: 'Minimal Thyra API',
    version: '1.0.0',
    maxSizeBytes: CONFIG.MAX_SIZE_BYTES,
    maxSizeKB: Math.floor(CONFIG.MAX_SIZE_BYTES / 1024),
    features: [
      'Stateless operation',
      'Ephemeral wallets',
      'AES-256-GCM encryption',
      'Custom encryption keys',
      'Share URLs',
      'Free sub-100KB uploads'
    ],
    endpoints: [
      'POST /api/upload',
      'GET /api/health',
      'GET /api/info',
      'GET /docs'
    ]
  });
});

// Register swagger UI
await fastify.register(swaggerUi, {
  routePrefix: '/docs',
  uiConfig: {
    docExpansion: 'full',
    deepLinking: false
  }
});

// Startup
const start = async () => {
  try {
    const port = process.env.PORT || 3000;
    const host = process.env.HOST || '0.0.0.0';

    await fastify.listen({ port, host });

    console.log(`🚀 Minimal Thyra API running on port ${port}`);
    console.log(`📚 API docs: http://localhost:${port}/docs`);
    console.log(`💾 Max upload size: ${Math.floor(CONFIG.MAX_SIZE_BYTES / 1024)}KB`);

  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

// Export for serverless deployment
export { fastify };

// Start if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  start();
}
