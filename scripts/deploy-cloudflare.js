
const { execFileSync } = require('child_process');
const fs = require('fs');

const PROJECT_NAME = 'micro-saas-factory';
const API_BASE = 'https://api.cloudflare.com/client/v4';

async function deployToCloudflare() {
  try {
    const token = process.env.CLOUDFLARE_API_TOKEN;
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;

    if (!token || !accountId) {
      throw new Error(
        'Missing CLOUDFLARE_API_TOKEN or CLOUDFLARE_ACCOUNT_ID GitHub secret.'
      );
    }

    if (!fs.existsSync('out/index.html')) {
      throw new Error(
        'out/index.html is missing. The website must build successfully first.'
      );
    }

    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    console.log('Checking Cloudflare Pages projects...');

    const listResponse = await fetch(
      `${API_BASE}/accounts/${accountId}/pages/projects`,
      { headers }
    );

    const listData = await listResponse.json();

    if (!listResponse.ok || !listData.success) {
      throw new Error(
        `Could not list Cloudflare Pages projects: ${
          listData.errors?.map(e => e.message).join('; ') || listResponse.status
        }`
      );
    }

    const exists = listData.result.some(
      project => project.name === PROJECT_NAME
    );

    if (!exists) {
      console.log(`Creating Cloudflare Pages project: ${PROJECT_NAME}`);

      const createResponse = await fetch(
        `${API_BASE}/accounts/${accountId}/pages/projects`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            name: PROJECT_NAME,
            production_branch: 'main'
          })
        }
      );

      const createData = await createResponse.json();

      if (!createResponse.ok || !createData.success) {
        throw new Error(
          `Could not create Pages project: ${
            createData.errors?.map(e => e.message).join('; ') ||
            createResponse.status
          }`
        );
      }

      console.log('Cloudflare Pages project created.');
    } else {
      console.log('Cloudflare Pages project already exists.');
    }

    console.log('Deploying the built website...');

    execFileSync(
      'npx',
      [
        '--yes',
        'wrangler',
        'pages',
        'deploy',
        'out',
        `--project-name=${PROJECT_NAME}`,
        '--branch=main'
      ],
      {
        stdio: 'inherit',
        env: process.env
      }
    );

    console.log('Deployment completed successfully.');
  } catch (error) {
    console.error('Deployment failed:', error.message);
    process.exit(1);
  }
}

deployToCloudflare();
