import { ApiClient, EmailCampaignsApi, CreateEmailCampaign } from 'https://cdn.skypack.dev/sib-api-v3-sdk';

export default async (request: Request) => {
  const apiKey = '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';  // Replace with your actual API key
  const apiClient = new ApiClient();
  const apiKeyAuth = apiClient.authentications['api-key'];
  apiKeyAuth.apiKey = apiKey;

  const apiInstance = new EmailCampaignsApi(apiClient);
  
  if (request.method === 'POST') {
    try {
      const body = await request.json();
      const emailCampaigns = new CreateEmailCampaign();

      emailCampaigns.name = body.name;
      emailCampaigns.subject = body.subject;
      emailCampaigns.sender = { name: body.senderName, email: body.senderEmail };
      emailCampaigns.type = 'classic';
      emailCampaigns.htmlContent = body.htmlContent;
      emailCampaigns.recipients = { listIds: body.listIds.split(',').map(Number) };
      emailCampaigns.scheduledAt = body.scheduledAt;

      const data = await apiInstance.createEmailCampaign(emailCampaigns);

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
