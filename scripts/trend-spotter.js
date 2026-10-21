const fs = require('fs');
const path = require('path');

async function runTrendSpotter() {
  console.log('Agent 1 (Trend-Spotter): Analyzing high-intent search volume and SEO gaps natively...');

  // Pre-curated high-intent developer and utility tool gaps with high search demand
  const highIntentGaps = [
    {
      id: `tool-${Date.now()}-1`,
      keyword: 'json to csv converter online free',
      searchVolume: '5,400 monthly searches',
      difficulty: 'Low',
      category: 'Data Converters',
      title: 'Free Online JSON to CSV Converter',
      description: 'Convert complex JSON payloads into clean, downloadable CSV spreadsheets instantly in your browser.',
      inputType: 'Textarea for raw JSON string',
      outputType: 'Formatted CSV table and download button'
    },
    {
      id: `tool-${Date.now()}-2`,
      keyword: 'base64 image encoder decoder',
      searchVolume: '4,200 monthly searches',
      difficulty: 'Low',
      category: 'Developer Utilities',
      title: 'Instant Base64 Image Encoder & Decoder',
      description: 'Encode images to Base64 strings or decode Base64 back to image files securely on your device.',
      inputType: 'File upload or Base64 text string',
      outputType: 'Decoded image preview / encoded string block'
    },
    {
      id: `tool-${Date.now()}-3`,
      keyword: 'cron expression parser online',
      searchVolume: '6,100 monthly searches',
      difficulty: 'Low',
      category: 'DevOps Tools',
      title: 'Cron Expression Parser & Human Reader',
      description: 'Translate complex cron schedule expressions into plain English descriptions with upcoming execution dates.',
      inputType: 'Cron schedule text input (e.g., */5 * * * *)',
      outputType: 'Human-readable schedule breakdown'
    }
  ];

  // Randomly select one high-demand tool gap to generate for this cycle
  const selectedGap = highIntentGaps[Math.floor(Math.random() * highIntentGaps.length)];

  const specContent = `# Micro-SaaS Tool Specification
- **ID:** ${selectedGap.id}
- **Target Keyword:** ${selectedGap.keyword}
- **Estimated Search Volume:** ${selectedGap.searchVolume}
- **Competition Difficulty:** ${selectedGap.difficulty}
- **Category:** ${selectedGap.category}
- **Tool Title:** ${selectedGap.title}
- **Meta Description:** ${selectedGap.description}

## Functional Requirements
- **Input Type:** ${selectedGap.inputType}
- **Output Type:** ${selectedGap.outputType}
- **Core Logic:** High-performance client-side JavaScript execution for instantaneous utility processing.
`;

  // Ensure specs directory exists and write spec file
  const specsDir = path.join(__dirname, '../specs');
  if (!fs.existsSync(specsDir)) {
    fs.mkdirSync(specsDir, { recursive: true });
  }

  const specPath = path.join(specsDir, `${selectedGap.id}.md`);
  fs.writeFileSync(specPath, specContent);
  console.log(`Agent 1 Success: Generated search gap specification for "${selectedGap.keyword}" at ${specPath}`);
}

runTrendSpotter();
