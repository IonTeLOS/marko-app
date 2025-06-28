// File: marko-functions/generate-zk-proof.js
// Fixed version for ES modules with proper error handling

import { createRequire } from 'module';

let zkeSDK = null;

// Dynamic import helper for Netlify environment with fallback
async function loadZKEmailSDK() {
    if (zkeSDK) return zkeSDK;
    
    try {
        console.log('🔄 Attempting to load ZK Email SDK...');
        
        // Method 1: Try ES module import
        try {
            const module = await import('@zk-email/sdk');
            zkeSDK = module.default || module;
            console.log('✅ ZK Email SDK loaded via ES import');
            return zkeSDK;
        } catch (esError) {
            console.log('⚠️ ES import failed, trying CommonJS...');
            
            // Method 2: Try CommonJS require as fallback
            const require = createRequire(import.meta.url);
            const module = require('@zk-email/sdk');
            zkeSDK = module.default || module;
            console.log('✅ ZK Email SDK loaded via CommonJS');
            return zkeSDK;
        }
    } catch (error) {
        console.error('❌ All SDK loading methods failed:', error.message);
        throw new Error(`ZK Email SDK not available: ${error.message}`);
    }
}

export const handler = async (event, context) => {
    // Set CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    let blueprintId = null;
    let fileName = null;

    try {
        console.log('📧 Netlify function: Processing ZK Email proof request');

        // Parse the request body
        const requestBody = JSON.parse(event.body);
        const { emailContent } = requestBody;
        blueprintId = requestBody.blueprintId;
        fileName = requestBody.fileName;

        if (!emailContent) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'No email content provided' })
            };
        }

        if (!blueprintId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Blueprint ID required' })
            };
        }

        console.log(`🔧 Generating proof for blueprint: ${blueprintId}`);

        // Load the ZK Email SDK
        console.log('📦 Loading ZK Email SDK...');
        const SDKConstructor = await loadZKEmailSDK();
        
        // Initialize the SDK
        const sdk = SDKConstructor();
        console.log('✅ ZK Email SDK initialized');

        // Get the blueprint from the registry
        console.log(`🔍 Fetching blueprint: ${blueprintId}`);
        const blueprint = await sdk.getBlueprint(blueprintId);
        console.log('✅ Blueprint fetched successfully');

        // Optional: Validate the email first
        try {
            const isValid = await blueprint.validateEmail(emailContent);
            if (!isValid) {
                console.log('❌ Email validation failed');
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ 
                        error: 'Email validation failed',
                        message: 'The email does not match the blueprint requirements'
                    })
                };
            }
            console.log('✅ Email validation passed');
        } catch (validationError) {
            console.log(`⚠️ Email validation error (continuing anyway): ${validationError.message}`);
        }

        // Create a prover (server-side proving for speed)
        const prover = blueprint.createProver();
        console.log('✅ Prover created');

        // Generate the proof
        console.log('🚀 Starting proof generation...');
        const proof = await prover.generateProof(emailContent);
        console.log('✅ Proof generated successfully');

        // Extract proof data
        const proofData = {
            id: proof.id || `proof_${Date.now()}`,
            proofData: proof.props?.proofData || proof.proofData,
            publicData: proof.props?.publicData || proof.publicData,
            publicOutputs: proof.props?.publicOutputs || proof.publicOutputs,
            status: 'completed',
            blueprintId: blueprintId,
            timestamp: new Date().toISOString(),
            fileName: fileName
        };

        // Optional: Verify the proof to ensure it's valid
        try {
            const isVerified = await blueprint.verifyProof(proof);
            proofData.verified = isVerified;
            console.log(`🔍 Proof verification: ${isVerified ? 'VALID' : 'INVALID'}`);
        } catch (verifyError) {
            console.log(`⚠️ Proof verification error: ${verifyError.message}`);
            proofData.verified = null;
            proofData.verificationError = verifyError.message;
        }

        console.log('✅ Proof generation completed successfully');

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                proof: proofData,
                message: 'Cryptographic proof generated successfully'
            })
        };

    } catch (error) {
        console.error('❌ Netlify function error:', error);

        // Handle SDK-specific errors with proper fallback
        if (error.message.includes('ZK Email SDK not available')) {
            console.log('🔄 SDK unavailable, providing registry redirect...');
            return {
                statusCode: 202,  // Changed from 503 to 202
                headers,
                body: JSON.stringify({
                    status: 'redirect_required',
                    message: 'ZK Email SDK requires direct registry access',
                    action: 'redirect_to_registry',
                    data: {
                        blueprintId: blueprintId || 'e7d84ab3-68f3-46b4-a1af-f6c87611d423',
                        registryUrl: `https://registry.zkregex.com/${blueprintId || 'e7d84ab3-68f3-46b4-a1af-f6c87611d423'}`,
                        fileName: fileName || 'email.eml',
                        instructions: [
                            'Download the prepared email file',
                            'Open the ZK Email registry',
                            'Upload the email file',
                            'Select server-side proving',
                            'Generate the cryptographic proof'
                        ]
                    }
                })
            };
        }

        // Handle other specific SDK errors
        let errorMessage = 'Internal server error';
        let statusCode = 500;

        if (error.message.includes('Blueprint not found')) {
            errorMessage = 'Blueprint not found in registry';
            statusCode = 404;
        } else if (error.message.includes('Invalid email')) {
            errorMessage = 'Invalid email format or content';
            statusCode = 400;
        } else if (error.message.includes('Rate limit')) {
            errorMessage = 'Rate limit exceeded, please try again later';
            statusCode = 429;
        } else if (error.message.includes('Network')) {
            errorMessage = 'Network error connecting to ZK Email registry';
            statusCode = 503;
        }

        return {
            statusCode: statusCode,
            headers,
            body: JSON.stringify({ 
                error: errorMessage,
                details: error.message,
                suggestion: 'Check the blueprint ID and email format, or try the registry directly'
            })
        };
    }
};


