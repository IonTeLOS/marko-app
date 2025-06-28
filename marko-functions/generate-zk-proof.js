// File: marko-functions/generate-zk-proof.js
// CommonJS Netlify Function using @zk-email/sdk

const zkeSdk = require('@zk-email/sdk').default || require('@zk-email/sdk');

exports.handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  // Parse and decode (if you chose Base64 in the front-end)
  let { emailContent: raw, blueprintId = 'e7d84ab3-68f3-46b4-a1af-f6c87611d423', fileName = 'email.eml' } = JSON.parse(event.body);
  if (!raw) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'No email content provided' }) };
  }
  const emailContent = /^[A-Za-z0-9+/=]+$/.test(raw)
    ? Buffer.from(raw, 'base64').toString('utf8')
    : raw;

  try {
    console.log('📦 Initializing ZK Email SDK…');
    const sdk = zkeSdk();
    console.log('🔍 Fetching blueprint:', blueprintId);
    const blueprint = await sdk.getBlueprint(blueprintId);

    console.log('🔍 Validating email…');
    const isValid = await blueprint.validateEmail(emailContent);
    if (!isValid) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Email validation failed',
          message: 'The email does not match the blueprint requirements',
        }),
      };
    }

    console.log('⚙️ Creating prover…');
    const prover = blueprint.createProver();

    console.log('🚀 Generating proof…');
    const proof = await prover.generateProof(emailContent);

    const proofData = {
      id: proof.id || `proof_${Date.now()}`,
      proofData: proof.props?.proofData || proof.proofData || proof.proof,
      publicData: proof.props?.publicData || proof.publicData || proof.publicOutputs,
      publicOutputs: proof.props?.publicOutputs || proof.publicOutputs,
      status: 'completed',
      blueprintId,
      timestamp: new Date().toISOString(),
      fileName,
      verified: null,
    };

    console.log('🔍 Verifying proof…');
    proofData.verified = await blueprint.verifyProof(proof);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, proof: proofData }),
    };
  } catch (error) {
    console.error('❌ Proof generation error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
