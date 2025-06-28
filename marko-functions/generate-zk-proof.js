// File: netlify/functions/generate-zk-proof.js

const FormData = require('form-data');
const fetch = require('node-fetch');
const busboy = require('busboy');

exports.handler = async (event, context) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        console.log('📧 Netlify function: Processing ZK Email proof request');

        // Parse multipart form data
        const { files, fields } = await parseMultipartForm(event);
        
        if (!files.email) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'No email file provided' })
            };
        }

        const blueprintId = fields.blueprintId;
        if (!blueprintId) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Blueprint ID required' })
            };
        }

        // Create FormData for ZK Email API
        const formData = new FormData();
        formData.append('email', files.email.data, {
            filename: files.email.filename || 'email.eml',
            contentType: 'text/plain'
        });
        formData.append('blueprintId', blueprintId);
        formData.append('proving', 'server');

        // Make request to ZK Email API
        const zkEmailResponse = await fetch('https://registry.zk.email/api/generate-proof', {
            method: 'POST',
            body: formData,
            headers: formData.getHeaders()
        });

        if (!zkEmailResponse.ok) {
            const errorText = await zkEmailResponse.text();
            console.error('❌ ZK Email API error:', errorText);
            return {
                statusCode: zkEmailResponse.status,
                body: JSON.stringify({ 
                    error: `ZK Email API error: ${zkEmailResponse.statusText}`,
                    details: errorText
                })
            };
        }

        const result = await zkEmailResponse.json();
        console.log('✅ Proof generated successfully:', result.id);

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(result)
        };

    } catch (error) {
        console.error('❌ Netlify function error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ 
                error: 'Internal server error',
                message: error.message
            })
        };
    }
};

// Helper function to parse multipart form data
async function parseMultipartForm(event) {
    return new Promise((resolve, reject) => {
        const files = {};
        const fields = {};
        
        const bb = busboy({ 
            headers: { 
                'content-type': event.headers['content-type'] || event.headers['Content-Type']
            }
        });

        bb.on('file', (name, file, info) => {
            const chunks = [];
            file.on('data', (chunk) => chunks.push(chunk));
            file.on('end', () => {
                files[name] = {
                    data: Buffer.concat(chunks),
                    filename: info.filename,
                    mimeType: info.mimeType
                };
            });
        });

        bb.on('field', (name, value) => {
            fields[name] = value;
        });

        bb.on('finish', () => resolve({ files, fields }));
        bb.on('error', reject);

        bb.write(event.body, event.isBase64Encoded ? 'base64' : 'binary');
        bb.end();
    });
}
