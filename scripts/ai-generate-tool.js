
const fs = require('node:fs/promises');
const path = require('node:path');

const API_KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

async function main() {
  if (!API_KEY) {
    throw new Error('Missing OPENAI_API_KEY environment secret.');
  }

  const schema = {
    type: 'object',
    properties: {
      name: { type: 'string' },
      slug: { type: 'string' },
      description: { type: 'string' },
      target_user: { type: 'string' },
      problem_solved: { type: 'string' },
      inputs: {
        type: 'array',
        items: { type: 'string' }
      },
      outputs: {
        type: 'array',
        items: { type: 'string' }
      },
      monetization_idea: { type: 'string' }
    },
    required: [
      'name',
      'slug',
      'description',
      'target_user',
      'problem_solved',
      'inputs',
      'outputs',
      'monetization_idea'
    ],
    additionalProperties: false
  };

  console.log('Asking OpenAI to design one useful micro-tool...');

  const response = await fetch(
    'https://api.openai.com/v1/responses',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: MODEL,
        instructions:
          'Design one practical, small web tool for freelancers or small businesses. ' +
          'Return a realistic tool concept, not a vague AI chatbot. ' +
          'Choose a tool that can eventually run in a browser without a paid external API. ' +
          'Use a short lowercase hyphen-separated slug. ' +
          'Return only data matching the supplied schema.',
        input:
          'Propose one useful micro-SaaS tool idea that is different from a JSON formatter.',
        text: {
          format: {
            type: 'json_schema',
            name: 'micro_tool_specification',
            strict: true,
            schema
          }
        }
      })
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      `OpenAI API error (${response.status}): ` +
      JSON.stringify(data.error || data)
    );
  }

  const textOutput = (data.output || [])
    .flatMap(item => item.content || [])
    .find(item => item.type === 'output_text')?.text;

  if (!textOutput) {
    throw new Error('OpenAI returned no tool specification.');
  }

  const tool = JSON.parse(textOutput);

  if (
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(tool.slug) ||
    tool.name.length < 3 ||
    tool.description.length < 10 ||
    tool.inputs.length === 0 ||
    tool.outputs.length === 0
  ) {
    throw new Error('Generated tool specification failed validation.');
  }

  const outputDirectory = path.join(
    process.cwd(),
    'specs',
    'generated'
  );

  await fs.mkdir(outputDirectory, { recursive: true });

  const outputPath = path.join(
    outputDirectory,
    `${tool.slug}.json`
  );

  await fs.writeFile(
    outputPath,
    JSON.stringify(tool, null, 2) + '\n',
    { flag: 'wx' }
  );

  console.log(`Tool specification saved: ${outputPath}`);
  console.log(`Generated idea: ${tool.name}`);
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
