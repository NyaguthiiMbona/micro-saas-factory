
const fs = require('fs');
const path = require('path');

const specsDir = path.join(__dirname, '../specs');
const outputDir = path.join(__dirname, '../app/tools');

function generateTool() {
  console.log('Starting tool generation...');

  if (!fs.existsSync(specsDir)) {
    console.error('The specs folder does not exist.');
    process.exit(1);
  }

  const specFiles = fs
    .readdirSync(specsDir)
    .filter((file) => file.endsWith('.md'))
    .sort()
    .reverse();

  if (specFiles.length === 0) {
    console.log('No tool specifications found. Nothing to generate.');
    return;
  }

  const latestSpec = specFiles[0];
  const specPath = path.join(specsDir, latestSpec);
  const specContent = fs.readFileSync(specPath, 'utf8');

  fs.mkdirSync(outputDir, { recursive: true });

  const outputPath = path.join(outputDir, 'latest-spec.md');
  fs.writeFileSync(outputPath, specContent, 'utf8');

  console.log(`Read specification: ${latestSpec}`);
  console.log(`Saved a copy to: ${outputPath}`);
  console.log('Starter generator completed successfully.');
}

try {
  generateTool();
} catch (error) {
  console.error('Tool generation failed:', error.message);
  process.exit(1);
}
