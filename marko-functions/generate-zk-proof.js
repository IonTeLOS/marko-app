// File: marko-functions/generate-zk-proof.js
// CommonJS Netlify Background Function

const zkeSdk = require('@zk-email/sdk').default || require('@zk-email/sdk');

exports.handler = (event, context, callback) => {
  // By default callbackWaitsForEmptyEventLoop = true, so Lambda will
  // wait for all pending work before freezing.
  // (No need to set it explicitly.)

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Preflight
  if (event.httpMethod === 'OPTIONS') {
    return callback(null, { statusCode: 200, headers, body: '' });
  }
  if (event.httpMethod !== 'POST') {
    return callback(null, {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    });
  }

  // Immediately ACK the request
  callback(null, {
    statusCode: 202,
    headers,
    body: JSON.stringify({ status: 'accepted', message: 'Proof job started' }),
  });

  // --- Background work continues below ---

  (async () => {
    try {
      const { emailContent: rawB64, blueprintId: inSlug, fileName: inName } = JSON.parse(event.body);
      const blueprintId = inSlug || 'IonTeLOS/MailAddressProver@v2';
      const fileName    = inName  || 'email.eml';

      // Decode Base64 → UTF-8
      const emailContent = Buffer.from(rawB64, 'base64').toString('utf8');

      console.log('📄 emailContent length:', emailContent.length);
      ['From:', 'To:', 'Subject:', 'Message-ID:', 'DKIM-Signature:']
        .forEach(h => console.log(`📄 Index of "${h}":`, emailContent.indexOf(h)));

      console.log('📦 Initializing ZK Email SDK…');
      const sdk = zkeSdk();

      console.log('🔍 Fetching blueprint:', blueprintId);
      const blueprint = await sdk.getBlueprint(blueprintId);

      // Soft validation
      try {
        const isValid = await blueprint.validateEmail(emailContent);
        console.log('🔍 validateEmail →', isValid);
      } catch (vErr) {
        console.warn('⚠️ validateEmail threw, ignoring:', vErr.message);
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

      console.log('✅ Proof generation completed:', proofData.id);
      // TODO: persist proofData to your DB or fire a webhook here

    } catch (error) {
      console.error('❌ Background proof job failed:', error);
    }
  })();
};
