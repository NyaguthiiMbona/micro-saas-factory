
const { execFileSync } = require('child_process');
const fs = require('fs');

async function deployToCloudflare() {
  try {
    console.log('Starting Cloudflare Pages deployment...');

    if (!process.env.CLOUDFLARE_API_TOKEN) {
      throw new Error('Missing CLOUDFLARE_API_TOKEN GitHub secret.');
    }

    if (!process.env.CLOUDFLARE_ACCOUNT_ID) {
      throw new Error('Missing CLOUDFLARE_ACCOUNT_ID GitHub secret.');
    }

    if (!fs.existsSync('out/index.html')) {
      throw new Error(
        'out/index.html not found. Run npm run build successfully before deployment.'
      );
    }

    execFileSync(
      'npx',
      [
        '--yes',
        'wrangler',
        'pages',
        'deploy',
        'out',
        '--project-name=micro-saas-factory'
      ],
      {
        stdio: 'inherit',
        env: process.env
      }
    );

    console.log('Cloudflare Pages deployment completed successfully.');
  } catch (error) {
    console.error('Deployment failed:', error.message);
    process.exit(1);
  }
}

deployToCloudflare();
