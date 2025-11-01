// netlify/functions/manifest-upload.js
const crypto = require('crypto');

// Configuration constants
const CONFIG = {
  MAX_MANIFEST_SIZE: 500 * 1024, // 500KB max for manifest
  ARWEAVE_HOST: 'arweave.net',
  TURBO_UPLOAD_URL: 'https://upload.ardrive.io/v1/tx',
  
  // Admin controls
  ADMIN: {
    DOMAIN_RESTRICTION_ENABLED: false,
    LOGGING_ENABLED: true,
    ALLOWED_DOMAINS: [
      'komvos.net',
      'localhost:3000',
      'localhost:8080'
    ]
  }
};

// Manifest uploader class
class ManifestUploader {
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

  validateManifest(manifest) {
    // Check if it's valid JSON
    let manifestObj;
    try {
      manifestObj = typeof manifest === 'string' ? JSON.parse(manifest) : manifest;
    } catch (e) {
      throw new Error('Invalid JSON format');
    }

    // Validate manifest structure
    if (manifestObj.manifest !== 'arweave/paths') {
      throw new Error('Invalid manifest type. Must be "arweave/paths"');
    }

    if (!manifestObj.version) {
      throw new Error('Manifest version is required');
    }

    if (!manifestObj.paths || typeof manifestObj.paths !== 'object') {
      throw new Error('Manifest must have a "paths" object');
    }

    // Validate each path
    for (const [path, config] of Object.entries(manifestObj.paths)) {
      if (!config.id) {
        throw new Error(`Path "${path}" missing Arweave transaction ID`);
      }
      
      // Validate Arweave ID format (43 character base64url)
      if (!/^[a-zA-Z0-9_-]{43}$/.test(config.id)) {
        throw new Error(`Path "${path}" has invalid Arweave ID format`);
      }
    }

    // Validate index if present
    if (manifestObj.index) {
      if (!manifestObj.index.path) {
        throw new Error('Index must specify a path');
      }
      
      if (!manifestObj.paths[manifestObj.index.path]) {
        throw new Error(`Index path "${manifestObj.index.path}" not found in paths`);
      }
    }

    return manifestObj;
  }

  async uploadToArweave(manifestObj, tags = []) {
    const wallet = await this.createEphemeralWallet();
    
    const { createData, ArweaveSigner } = await import('arbundles');
    const signer = new ArweaveSigner(wallet);

    // Convert manifest to JSON string
    const manifestJson = JSON.stringify(manifestObj, null, 2);
    const contentBuffer = Buffer.from(manifestJson, 'utf8');

    const dataItem = createData(contentBuffer, signer, {
      tags: [
        { name: 'Content-Type', value: 'application/x.arweave-manifest+json' },
        { name: 'App-Name', value: 'ThyraManifest' },
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
}

// Privacy-aware logging
function safeLog(...args) {
  if (CONFIG.ADMIN.LOGGING_ENABLED) {
    console.log(...args);
  }
}

function safeError(...args) {
  if (CONFIG.ADMIN.LOGGING_ENABLED) {
    console.error(...args);
  }
}

// Domain access check
function checkDomainAccess(headers) {
  if (!CONFIG.ADMIN.DOMAIN_RESTRICTION_ENABLED) {
    return { allowed: true };
  }

  const origin = headers.origin || headers.referer;
  
  if (!origin) {
    return { 
      allowed: false, 
      error: 'MISSING_ORIGIN',
      message: 'Origin header required'
    };
  }

  try {
    const originUrl = new URL(origin);
    const domain = originUrl.hostname + (originUrl.port ? `:${originUrl.port}` : '');
    
    const isAllowed = CONFIG.ADMIN.ALLOWED_DOMAINS.some(allowedDomain => {
      return domain === allowedDomain || domain.endsWith(`.${allowedDomain}`);
    });

    if (!isAllowed) {
      return {
        allowed: false,
        error: 'DOMAIN_NOT_ALLOWED',
        message: `Domain ${domain} is not allowed`
      };
    }

    return { allowed: true, domain };
    
  } catch (error) {
    return {
      allowed: false,
      error: 'INVALID_ORIGIN',
      message: 'Invalid origin header'
    };
  }
}

// Main handler
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

  // Handle GET - API info
  if (event.httpMethod === 'GET') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        name: 'Thyra Manifest Upload API',
        version: '1.0.0',
        description: 'Upload Arweave path manifests',
        endpoints: {
          'POST /': 'Upload manifest',
          'GET /': 'API information'
        },
        limits: {
          maxManifestSize: `${Math.floor(CONFIG.MAX_MANIFEST_SIZE / 1024)}KB`
        },
        manifestFormat: {
          manifest: 'arweave/paths',
          version: '0.1.0 or 0.2.0',
          index: { path: 'index.html' },
          paths: {
            'path/to/file': { id: 'ARWEAVE_TX_ID' }
          }
        },
        example: {
          manifest: 'arweave/paths',
          version: '0.1.0',
          index: { path: 'index.html' },
          paths: {
            'index.html': { id: 'aFh4doIAsDV7l0a3DaRfzPC6s3lql5Ki5O9zxEXDOOQ' },
            'style.css': { id: 'Y8TsdKtr93lUngVbiVTVBAxTGJDjy63c1msemAhm3TI' }
          }
        },
        status: 'operational',
        timestamp: new Date().toISOString()
      })
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'METHOD_NOT_ALLOWED',
        message: 'Only POST and GET methods allowed'
      })
    };
  }

  // Check domain restrictions
  if (CONFIG.ADMIN.DOMAIN_RESTRICTION_ENABLED) {
    const domainCheck = checkDomainAccess(event.headers);
    if (!domainCheck.allowed) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'ACCESS_DENIED',
          message: domainCheck.message,
          duration: Date.now() - startTime
        })
      };
    }
  }

  try {
    const uploader = new ManifestUploader();
    
    // Parse request body
    let requestData;
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

    const { manifest, note, id, includeWallet } = requestData;

    if (!manifest) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'MISSING_MANIFEST',
          message: 'Manifest object is required',
          duration: Date.now() - startTime
        })
      };
    }

    // Validate manifest
    let validatedManifest;
    try {
      validatedManifest = uploader.validateManifest(manifest);
    } catch (validationError) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'INVALID_MANIFEST',
          message: validationError.message,
          duration: Date.now() - startTime
        })
      };
    }

    // Check size
    const manifestJson = JSON.stringify(validatedManifest);
    if (Buffer.byteLength(manifestJson, 'utf8') > CONFIG.MAX_MANIFEST_SIZE) {
      return {
        statusCode: 413,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'MANIFEST_TOO_LARGE',
          message: `Manifest exceeds ${Math.floor(CONFIG.MAX_MANIFEST_SIZE / 1024)}KB limit`,
          duration: Date.now() - startTime
        })
      };
    }

    const uploadId = id || crypto.randomUUID();

    // Upload to Arweave
    const uploadResult = await uploader.uploadToArweave(validatedManifest, [
      ...(note ? [{ name: 'Note', value: note }] : []),
      { name: 'Upload-ID', value: uploadId },
      { name: 'Path-Count', value: Object.keys(validatedManifest.paths).length.toString() }
    ]);

    const arweaveId = uploadResult.id;
    const arweaveUrl = `https://arweave.net/${arweaveId}`;

    safeLog(`Manifest uploaded: ${arweaveId} with ${Object.keys(validatedManifest.paths).length} paths`);

    const response = {
      success: true,
      id: uploadId,
      arweaveId,
      url: arweaveUrl,
      manifestUrl: arweaveUrl, // Direct access to manifest
      pathCount: Object.keys(validatedManifest.paths).length,
      paths: Object.keys(validatedManifest.paths),
      indexPath: validatedManifest.index?.path || null,
      timestamp: Date.now(),
      duration: Date.now() - startTime
    };

    // Add conditional fields
    if (note) response.note = note;
    if (includeWallet) response.wallet = uploadResult.wallet;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response)
    };

  } catch (error) {
    safeError('Manifest upload error:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'UPLOAD_FAILED',
        message: error.message,
        duration: Date.now() - startTime
      })
    };
  }
};
