const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

async function notifyGoogleSearchConsole() {
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    scopes: ['https://www.googleapis.com/auth/indexing'],
  });

  const indexing = google.indexing({
    version: 'v3',
    auth: auth,
  });

  // Read latest deployed URLs from build manifest
  const manifestPath = path.join(__dirname, '../public/sitemap.xml');
  console.log(`Reading sitemap from ${manifestPath}...`);

  // Example payload dispatch for instant indexing registration
  const targetUrl = 'https://your-micro-saas-domain.pages.dev/tools/generated-utility';
  
  try {
    const res = await indexing.urlNotifications.publish({
      requestBody: {
        url: targetUrl,
        type: 'URL_UPDATED',
      },
    });
    console.log('SEO Agent Success: Indexing payload dispatched to Google Search Console API.', res.data);
  } catch (error) {
    console.error('Error pinging Google Indexing API:', error.message);
  }
}

notifyGoogleSearchConsole();
