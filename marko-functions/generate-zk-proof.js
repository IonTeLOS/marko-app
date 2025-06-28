// File: netlify/functions/generate-zk-proof.js
// Simple implementation without external dependencies

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

        // Parse the request body (expecting JSON with base64 encoded email)
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

        // Create form data boundary
        const boundary = '----formdata-netlify-' + Math.random().toString(36);
        
        // Build multipart form data manually
        const formData = buildFormData(boundary, {
            email: {
                content: emailContent,
                filename: fileName || 'email.eml',
                contentType: 'text/plain'
            },
            blueprintId: blueprintId,
            proving: 'server'
        });

        // Make request to ZK Email API
        const zkEmailResponse = await fetch('https://registry.zk.email/api/generate-proof', {
            method: 'POST',
            headers: {
                'Content-Type': `multipart/form-data; boundary=${boundary}`
            },
            body: formData
        });

        console.log('ZK Email API response status:', zkEmailResponse.status);

        if (!zkEmailResponse.ok) {
            const errorText = await zkEmailResponse.text();
            console.error('❌ ZK Email API error:', errorText);
            
            return {
                statusCode: zkEmailResponse.status,
                headers,
                body: JSON.stringify({ 
                    error: `ZK Email API error: ${zkEmailResponse.statusText}`,
                    details: errorText,
                    status: zkEmailResponse.status
                })
            };
        }

        const result = await zkEmailResponse.json();
        console.log('✅ Proof generated successfully:', result.id || 'success');

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(result)
        };

    } catch (error) {
        console.error('❌ Netlify function error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Internal server error',
                message: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            })
        };
    }
};

// Helper function to build multipart form data
function buildFormData(boundary, data) {
    let formData = '';
    
    for (const [key, value] of Object.entries(data)) {
        formData += `--${boundary}\r\n`;
        
        if (typeof value === 'object' && value.content) {
            // File field
            formData += `Content-Disposition: form-data; name="${key}"; filename="${value.filename}"\r\n`;
            formData += `Content-Type: ${value.contentType}\r\n\r\n`;
            formData += value.content + '\r\n';
        } else {
            // Regular field
            formData += `Content-Disposition: form-data; name="${key}"\r\n\r\n`;
            formData += value + '\r\n';
        }
    }
    
    formData += `--${boundary}--\r\n`;
    return formData;
}

// Alternative simpler version that just forwards JSON
// If the above doesn't work, try this approach:

/*
exports.handler = async (event, context) => {
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
        const { emailContent, blueprintId } = JSON.parse(event.body);

        // Try JSON API approach
        const response = await fetch('https://registry.zk.email/api/blueprints/' + blueprintId + '/prove', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: emailContent,
                proving: 'server'
            })
        });

        if (!response.ok) {
            const error = await response.text();
            return {
                statusCode: response.status,
                headers,
                body: JSON.stringify({ error, status: response.status })
            };
        }

        const result = await response.json();
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(result)
        };

    } catch (error) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message })
        };
    }
};
*/
