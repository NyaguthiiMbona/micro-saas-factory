
const fs = require('node:fs/promises');
const path = require('node:path');

const toolIdeas = [
  {
    name: 'Invoice Late Fee Calculator',
    slug: 'invoice-late-fee-calculator',
    description: 'Calculate overdue invoice charges and the total amount owed.',
    target_user: 'Freelancers and small business owners',
    problem_solved: 'Makes it easier to calculate late payment charges.',
    inputs: [
      'Original invoice amount',
      'Annual late fee rate',
      'Number of days overdue'
    ],
    outputs: [
      'Late fee amount',
      'Total amount owed'
    ],
    monetization_idea: 'Offer downloadable payment summaries as a premium feature.'
  },
  {
    name: 'Meeting Cost Calculator',
    slug: 'meeting-cost-calculator',
    description: 'Estimate the staff cost of a business meeting.',
    target_user: 'Managers and small business owners',
    problem_solved: 'Shows how much employee time a meeting costs.',
    inputs: [
      'Number of attendees',
      'Average hourly pay',
      'Meeting duration in minutes'
    ],
    outputs: [
      'Estimated total meeting cost',
      'Cost per attendee'
    ],
    monetization_idea: 'Offer meeting cost reports and team comparisons as premium features.'
  },
  {
    name: 'Freelance Hourly Rate Calculator',
    slug: 'freelance-hourly-rate-calculator',
    description: 'Estimate the hourly rate needed to meet an income goal.',
    target_user: 'Freelancers and independent consultants',
    problem_solved: 'Helps freelancers price their work around expenses and available hours.',
    inputs: [
      'Desired annual income',
      'Annual business expenses',
      'Billable hours per week',
      'Working weeks per year'
    ],
    outputs: [
      'Required hourly rate',
      'Estimated annual revenue'
    ],
    monetization_idea: 'Offer downloadable pricing plans as a premium feature.'
  }
];

async function main() {
  const outputDirectory = path.join(
    process.cwd(),
    'specs',
    'generated'
  );

  await fs.mkdir(outputDirectory, { recursive: true });

  for (const tool of toolIdeas) {
    const outputPath = path.join(
      outputDirectory,
      `${tool.slug}.json`
    );

    try {
      await fs.access(outputPath);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }

      if (
        !tool.name ||
        !tool.description ||
        !tool.inputs.length ||
        !tool.outputs.length ||
        !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(tool.slug)
      ) {
        throw new Error(`Invalid tool specification: ${tool.slug}`);
      }

      await fs.writeFile(
        outputPath,
        JSON.stringify(tool, null, 2) + '\n',
        { flag: 'wx' }
      );

      console.log(`Tool specification created: ${tool.name}`);
      console.log(`Saved to: ${outputPath}`);
      return;
    }
  }

  throw new Error(
    'All predefined tool specifications already exist. ' +
    'Add another idea to the toolIdeas list.'
  );
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
