// File: marko-functions/generate-zk-proof.js
// Updated with correct ZK Email API endpoints

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

        // Try multiple ZK Email API endpoints
        const endpoints = [
            // Endpoint 1: Try blueprint-specific proving
            {
                url: `https://registry.zk.email/api/blueprints/${blueprintId}/prove`,
                method: 'json'
            },
            // Endpoint 2: Try submit and poll approach
            {
                url: `https://registry.zk.email/api/blueprints/${blueprintId}/submit`,
                method: 'json'
            },
            // Endpoint 3: Try alternative API structure
            {
                url: `https://registry.zk.email/api/v1/blueprints/${blueprintId}/prove`,
                method: 'json'
            }
        ];

        for (const endpoint of endpoints) {
            try {
                console.log(`🔄 Trying ${endpoint.url}...`);

                const response = await fetch(endpoint.url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': 'ZK-Email-Proxy/1.0'
                    },
                    body: JSON.stringify({
                        email: emailContent,
                        proving: 'server',
                        blueprintId: blueprintId
                    })
                });

                console.log(`Response status: ${response.status}`);

                if (response.ok) {
                    const result = await response.json();
                    console.log('✅ Proof generation successful');
                    
                    return {
                        statusCode: 200,
                        headers,
                        body: JSON.stringify(result)
                    };
                } else {
                    const errorText = await response.text();
                    console.log(`❌ ${endpoint.url} failed with ${response.status}: ${errorText.substring(0, 200)}...`);
                    continue;
                }

            } catch (error) {
                console.log(`❌ ${endpoint.url} error: ${error.message}`);
                continue;
            }
        }

        // If all endpoints fail, try a different approach - check ZK Email docs
        console.log('🔄 All direct API calls failed, trying documentation approach...');
        
        // Return instructions for manual proof generation
        return {
            statusCode: 202, // Accepted but not processed
            headers,
            body: JSON.stringify({
                status: 'api_unavailable',
                message: 'ZK Email API endpoints are not publicly accessible',
                instructions: 'Please use the ZK Email registry interface',
                blueprintId: blueprintId,
                registryUrl: `https://registry.zk.email/${blueprintId}`,
                fileName: fileName,
                emailPreview: emailContent.substring(0, 200) + '...',
                suggestion: 'Download the email file and upload it manually to the ZK Email registry'
            })
        };

    } catch (error) {
        console.error('❌ Netlify function error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Internal server error',
                message: error.message,
                suggestion: 'Try using the ZK Email registry directly'
            })
        };
    }
};

// Alternative simple version that focuses on the redirect approach
// Since the ZK Email APIs might not be publicly accessible

exports.handler_simple = async (event, context) => {
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

        // Since ZK Email APIs are not publicly accessible,
        // return a structured response for the frontend to handle
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                status: 'redirect_required',
                message: 'ZK Email API requires direct registry access',
                action: 'redirect_to_registry',
                data: {
                    blueprintId: blueprintId,
                    registryUrl: `https://registry.zk.email/${blueprintId}`,
                    fileName: fileName,
                    emailContent: emailContent,
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

    } catch (error) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message })
        };
    }
};
