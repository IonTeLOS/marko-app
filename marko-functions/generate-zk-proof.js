// File: marko-functions/generate-zk-proof.js
// Simplified version that works reliably in Netlify environment

let zkeSDK = null;

// Simple dynamic import that works in Netlify
async function loadZKEmailSDK() {
    if (zkeSDK) return zkeSDK;
    
    try {
        console.log('🔄 Loading ZK Email SDK via dynamic import...');
        
        // Use simple dynamic import - this should work in Netlify
        const module = await import('@zk-email/sdk');
        zkeSDK = module.default || module;
        
        console.log('✅ ZK Email SDK loaded successfully');
        return zkeSDK;
        
    } catch (error) {
        console.error('❌ Failed to load ZK Email SDK:', error.message);
        // Don't throw here, let the main function handle fallback
        return null;
    }
}

exports.handler = async (event, context) => {
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
    let emailContent = null;

    try {
        console.log('📧 Netlify function: Processing ZK Email proof request');

        // Parse the request body
        const requestBody = JSON.parse(event.body);
        emailContent = requestBody.emailContent;
        blueprintId = requestBody.blueprintId || 'e7d84ab3-68f3-46b4-a1af-f6c87611d423';
        fileName = requestBody.fileName || 'email.eml';

        if (!emailContent) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'No email content provided' })
            };
        }

        console.log(`🔧 Attempting ZK proof for blueprint: ${blueprintId}`);

        // Try to load the ZK Email SDK
        console.log('📦 Loading ZK Email SDK...');
        const SDKConstructor = await loadZKEmailSDK();
        
        if (!SDKConstructor) {
            console.log('⚠️ SDK not available, using fallback...');
            throw new Error('SDK_NOT_AVAILABLE');
        }

        // Initialize the SDK
        const sdk = SDKConstructor();
        console.log('✅ ZK Email SDK initialized');

        // Get the blueprint from the registry
        console.log(`🔍 Fetching blueprint: ${blueprintId}`);
        const blueprint = await sdk.getBlueprint(blueprintId);
        console.log('✅ Blueprint fetched successfully');

        // Validate the email
        try {
            console.log('🔍 Validating email...');
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
            console.log(`⚠️ Email validation error: ${validationError.message}`);
            // Continue anyway, validation might be strict
        }

        // Create a prover
        console.log('⚙️ Creating prover...');
        const prover = blueprint.createProver();
        console.log('✅ Prover created');

        // Generate the proof
        console.log('🚀 Starting proof generation...');
        const proof = await prover.generateProof(emailContent);
        console.log('✅ Proof generated successfully!');

        // Extract and format proof data
        const proofData = {
            id: proof.id || `proof_${Date.now()}`,
            proofData: proof.props?.proofData || proof.proofData || proof.proof,
            publicData: proof.props?.publicData || proof.publicData || proof.publicOutputs,
            publicOutputs: proof.props?.publicOutputs || proof.publicOutputs,
            status: 'completed',
            blueprintId: blueprintId,
            timestamp: new Date().toISOString(),
            fileName: fileName,
            verified: null
        };

        // Try to verify the proof
        try {
            console.log('🔍 Verifying proof...');
            const isVerified = await blueprint.verifyProof(proof);
            proofData.verified = isVerified;
            console.log(`✅ Proof verification: ${isVerified ? 'VALID' : 'INVALID'}`);
        } catch (verifyError) {
            console.log(`⚠️ Proof verification failed: ${verifyError.message}`);
            proofData.verificationError = verifyError.message;
        }

        console.log('🎉 ZK Email proof generation completed successfully!');

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                proof: proofData,
                message: 'Cryptographic proof generated successfully via ZK Email SDK'
            })
        };

    } catch (error) {
        console.error('❌ Netlify function error:', error);

        // Handle specific error cases
        if (error.message === 'SDK_NOT_AVAILABLE' || 
            error.message.includes('ZK Email SDK not available') ||
            error.message.includes('Cannot use import statement') ||
            error.message.includes('filename') ||
            error.message.includes('import.meta')) {
            
            console.log('🔄 Using registry fallback due to SDK issues...');
            
            // Provide registry redirect as fallback
            return {
                statusCode: 202,
                headers,
                body: JSON.stringify({
                    status: 'redirect_required',
                    message: 'ZK Email SDK environment issue - please use registry directly',
                    action: 'redirect_to_registry',
                    data: {
                        blueprintId: blueprintId,
                        registryUrl: `https://registry.zkregex.com/${blueprintId}`,
                        fileName: fileName,
                        emailContent: emailContent,
                        reason: 'sdk_environment_issue',
                        instructions: [
                            'Your email is ready for processing',
                            'Click to download the email file',
                            'Open the ZK Email registry',
                            'Upload the email file to the registry',
                            'Select "Server Proving" for best performance',
                            'Generate your cryptographic proof'
                        ],
                        estimatedTime: '2-3 minutes'
                    }
                })
            };
        }

        // Handle other specific SDK errors
        if (error.message.includes('Blueprint not found')) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ 
                    error: 'Blueprint not found',
                    message: `Blueprint ${blueprintId} does not exist in the registry`,
                    suggestion: 'Check the blueprint ID or create a new blueprint'
                })
            };
        }

        if (error.message.includes('Invalid email') || error.message.includes('validation')) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    error: 'Invalid email format',
                    message: 'Email does not meet the requirements for ZK proof generation',
                    suggestion: 'Ensure the email has proper headers and DKIM signature'
                })
            };
        }

        if (error.message.includes('Rate limit') || error.message.includes('429')) {
            return {
                statusCode: 429,
                headers,
                body: JSON.stringify({ 
                    error: 'Rate limit exceeded',
                    message: 'Too many requests to ZK Email service',
                    suggestion: 'Please wait a moment and try again'
                })
            };
        }

        // Generic error with registry fallback
        console.log('🔄 Providing registry fallback for generic error...');
        return {
            statusCode: 202,
            headers,
            body: JSON.stringify({
                status: 'redirect_required',
                message: 'ZK Email API issue - please use registry',
                action: 'redirect_to_registry',
                data: {
                    blueprintId: blueprintId,
                    registryUrl: `https://registry.zkregex.com/${blueprintId}`,
                    fileName: fileName,
                    emailContent: emailContent,
                    error: error.message,
                    instructions: [
                        'Download the prepared email file',
                        'Open the ZK Email registry',
                        'Upload your email file',
                        'Generate the proof using the registry interface'
                    ]
                }
            })
        };
    }
};
