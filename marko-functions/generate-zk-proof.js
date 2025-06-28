// File: marko-functions/generate-zk-proof.js
// Updated with correct ZK Email SDK implementation

// Note: You'll need to install the ZK Email SDK in your project:
// npm install @zk-email/sdk

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

    try {
        console.log('📧 Netlify function: Processing ZK Email proof request');

        // Parse the request body
        const requestBody = JSON.parse(event.body);
        const { emailContent, blueprintId, fileName } = requestBody;

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

        // Import the ZK Email SDK
        // Note: This import needs to be dynamic for server-side usage
        const zkeSDK = await import('@zk-email/sdk').then(module => module.default);

        // Initialize the SDK
        const sdk = zkeSDK();
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
        const prover = blueprint.createProver({
            // Use server-side proving for faster generation
            mode: 'server' // or 'remote' depending on SDK version
        });
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

        // Handle specific SDK errors
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
                suggestion: 'Check the blueprint ID and email format, or try again later'
            })
        };
    }
};

// Alternative implementation using the older SDK pattern (if the above doesn't work)
exports.handler_legacy = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { emailContent, blueprintId, fileName } = JSON.parse(event.body);
        
        console.log('📧 Processing request for blueprint:', blueprintId);

        // Try the legacy API approach with proper endpoint structure
        const registryBaseUrl = 'https://registry.zkregex.com'; // or 'https://registry-dev.zkregex.com' for dev
        
        // Method 1: Try the /api/generate endpoint
        try {
            console.log('🔄 Attempting proof generation via /api/generate...');
            
            const generateResponse = await fetch(`${registryBaseUrl}/api/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'ZK-Email-Proof-Generator/1.0'
                },
                body: JSON.stringify({
                    slug: blueprintId,
                    email: emailContent,
                    proving: 'server'
                })
            });

            if (generateResponse.ok) {
                const result = await generateResponse.json();
                console.log('✅ Proof generated via /api/generate');
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify(result)
                };
            }
        } catch (error) {
            console.log(`❌ /api/generate failed: ${error.message}`);
        }

        // Method 2: Try the submit + poll pattern
        try {
            console.log('🔄 Attempting async proof generation...');
            
            const submitResponse = await fetch(`${registryBaseUrl}/api/submit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    slug: blueprintId,
                    email: emailContent,
                    proving: 'server'
                })
            });

            if (submitResponse.ok) {
                const submitResult = await submitResponse.json();
                const jobId = submitResult.id || submitResult.job_id;
                
                if (jobId) {
                    console.log(`✅ Job submitted: ${jobId}`);
                    
                    // Poll for completion (simplified version)
                    for (let i = 0; i < 10; i++) {
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        
                        const statusResponse = await fetch(`${registryBaseUrl}/api/status/${jobId}`);
                        if (statusResponse.ok) {
                            const statusResult = await statusResponse.json();
                            
                            if (statusResult.status === 'completed' || statusResult.status === 'success') {
                                console.log('✅ Async proof generation completed');
                                return {
                                    statusCode: 200,
                                    headers,
                                    body: JSON.stringify(statusResult)
                                };
                            } else if (statusResult.status === 'failed') {
                                throw new Error(`Proof generation failed: ${statusResult.error}`);
                            }
                        }
                    }
                    
                    // Return partial result if still processing
                    return {
                        statusCode: 202,
                        headers,
                        body: JSON.stringify({
                            status: 'processing',
                            jobId: jobId,
                            pollUrl: `${registryBaseUrl}/api/status/${jobId}`,
                            message: 'Proof generation in progress'
                        })
                    };
                }
            }
        } catch (error) {
            console.log(`❌ Async generation failed: ${error.message}`);
        }

        // If all methods fail, return helpful guidance
        return {
            statusCode: 202,
            headers,
            body: JSON.stringify({
                status: 'api_unavailable',
                message: 'ZK Email API endpoints may be restricted or changed',
                blueprintId: blueprintId,
                registryUrl: `${registryBaseUrl}/${blueprintId}`,
                fileName: fileName,
                emailPreview: emailContent.substring(0, 200) + '...',
                suggestion: 'Use the ZK Email registry interface directly for proof generation'
            })
        };

    } catch (error) {
        console.error('❌ Legacy handler error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Internal server error',
                message: error.message
            })
        };
    }
};
