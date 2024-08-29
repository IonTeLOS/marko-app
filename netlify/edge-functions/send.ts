export default async (request: Request) => {
  const apiKey = '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'; 
  const apiUrl = 'https://api.brevo.com/v3/smtp/email';  

  if (request.method === 'POST') {
    try {
      const body = await request.json();
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': apiKey
        },
        body: JSON.stringify({
          name: body.name,
          subject: body.subject,
          sender: { name: body.senderName, email: body.senderEmail },
          type: 'classic',
          htmlContent: body.htmlContent,
          recipients: { listIds: body.listIds.split(',').map(Number) },
          scheduledAt: body.scheduledAt
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create campaign');
      }

      const data = await response.json();

      return new Response(JSON.stringify({ message: 'Campaign created successfully!', data }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Error:', error);
      return new Response(JSON.stringify({ message: 'An error occurred while creating the campaign.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } else {
    return new Response('Method not allowed', { status: 405 });
  }
};
