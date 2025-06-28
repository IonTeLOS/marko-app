// File: marko-functions/generate-zk-proof.js
// CommonJS Netlify Function using @zk-email/sdk v1.x,
// expecting emailContent as Base64.

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

  // Parse incoming JSON
  let { emailContent: rawB64, blueprintId, fileName } = JSON.parse(event.body);

  // Defaults
  blueprintId = blueprintId || 'IonTeLOS/MailAddressProver@v1';
  fileName    = fileName    || 'email.eml';

  if (!rawB64) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'No email content provided' }),
    };
  }

  // Decode Base64 → UTF-8 text (preserves CRLF exactly)
  let emailContent;
  try {
    emailContent = Buffer.from(rawB64, 'base64').toString('utf8');
  } catch (e) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid Base64 in emailContent' }),
    };
  }

  // Debug logs for length & snippet
  console.log('📄 emailContent length:', emailContent.length);
  console.log('📄 emailContent head:', emailContent.slice(0,200).replace(/\r/g,'␍'));

  try {
    console.log('📦 Initializing ZK Email SDK…');
    const sdk = zkeSdk();

    console.log('🔍 Fetching blueprint:', blueprintId);
    const blueprint = await sdk.getBlueprint(blueprintId);

    console.log('🔍 Validating email…');
    const valid = await blueprint.validateEmail(emailContent);
    if (!valid) {
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
    console.error('❌ Proof generation error:', error.message);

    if (error.message.includes('provide the blueprint version')) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Invalid blueprint slug',
          message: `You passed "${blueprintId}". It must include its @version suffix, e.g. "IonTeLOS/MailAddressProver@v1".`
        })
      };
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
