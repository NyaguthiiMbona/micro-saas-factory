
const fs = require('node:fs/promises');
const path = require('node:path');

const toolIdeas = [
  {
    schemaVersion: 1,
    name: 'Invoice Late Fee Calculator',
    slug: 'invoice-late-fee-calculator',
    toolType: 'invoice-late-fee-calculator',
    description:
      'Calculate an estimated late fee and total amount owed on an overdue invoice.',
    target_user: 'Freelancers and small business owners',
    problem_solved:
      'Makes it easier to estimate late payment charges.',
    inputs: [
      {
        id: 'amount',
        label: 'Original invoice amount',
        type: 'number',
        min: 0.01,
        step: 0.01,
        defaultValue: 1000
      },
      {
        id: 'annualRate',
        label: 'Annual late fee rate (%)',
        type: 'number',
        min: 0,
        step: 0.01,
        defaultValue: 8
      },
      {
        id: 'daysOverdue',
        label: 'Days overdue',
        type: 'number',
        min: 0,
        step: 1,
        defaultValue: 30
      }
    ],
    calculation: {
      kind: 'simple-interest',
      formula: 'amount * (annualRate / 100) * (daysOverdue / 365)',
      outputs: [
        {
          id: 'fee',
          label: 'Estimated late fee'
        },
        {
          id: 'total',
          label: 'Total estimated amount owed'
        }
      ]
    },
    monetization_idea:
      'Test demand for downloadable invoice payment summaries.'
  },
  {
    schemaVersion: 1,
    name: 'Meeting Cost Calculator',
    slug: 'meeting-cost-calculator',
    toolType: 'meeting-cost-calculator',
    description:
      'Estimate the staff cost of a business meeting.',
    target_user: 'Managers and small business owners',
    problem_solved:
      'Shows the estimated employee time cost of a meeting.',
    inputs: [
      {
        id: 'attendees',
        label: 'Number of attendees',
        type: 'number',
        min: 1,
        step: 1,
        defaultValue: 5
      },
      {
        id: 'hourlyPay',
        label: 'Average hourly pay per attendee',
        type: 'number',
        min: 0,
        step: 0.01,
        defaultValue: 20
      },
      {
        id: 'durationMinutes',
        label: 'Meeting duration (minutes)',
        type: 'number',
        min: 1,
        step: 1,
        defaultValue: 60
      }
    ],
    calculation: {
      kind: 'meeting-cost',
      formula:
        'attendees * hourlyPay * (durationMinutes / 60)',
      outputs: [
        {
          id: 'totalCost',
          label: 'Estimated total meeting cost'
        },
        {
          id: 'costPerAttendee',
          label: 'Cost per attendee'
        }
      ]
    },
    monetization_idea:
      'Test demand for downloadable meeting cost reports.'
  },
  {
    schemaVersion: 1,
    name: 'Freelance Hourly Rate Calculator',
    slug: 'freelance-hourly-rate-calculator',
    toolType: 'freelance-hourly-rate-calculator',
    description:
      'Estimate the hourly rate needed to meet an annual income goal.',
    target_user: 'Freelancers and independent consultants',
    problem_solved:
      'Helps freelancers account for expenses and available billable hours.',
    inputs: [
      {
        id: 'desiredIncome',
        label: 'Desired annual income',
        type: 'number',
        min: 0,
        step: 0.01,
        defaultValue: 50000
      },
      {
        id: 'annualExpenses',
        label: 'Annual business expenses',
        type: 'number',
        min: 0,
        step: 0.01,
        defaultValue: 5000
      },
      {
        id: 'billableHoursPerWeek',
        label: 'Billable hours per week',
        type: 'number',
        min: 0.01,
        step: 0.5,
        defaultValue: 25
      },
      {
        id: 'workingWeeksPerYear',
        label: 'Working weeks per year',
        type: 'number',
        min: 1,
        max: 52,
        step: 1,
        defaultValue: 48
      }
    ],
    calculation: {
      kind: 'freelance-hourly-rate',
      formula:
        '(desiredIncome + annualExpenses) / (billableHoursPerWeek * workingWeeksPerYear)',
      outputs: [
        {
          id: 'requiredHourlyRate',
          label: 'Required hourly rate'
        },
        {
          id: 'annualRevenueTarget',
          label: 'Annual income plus expenses'
        },
        {
          id: 'annualBillableHours',
          label: 'Annual billable hours'
        }
      ]
    },
    monetization_idea:
      'Test demand for downloadable freelance pricing plans.'
  }
];

function validateTool(tool) {
  if (
    !tool.name ||
    !tool.description ||
    !tool.slug ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(tool.slug)
  ) {
    throw new Error(`Invalid name, description, or slug: ${tool.slug}`);
  }

  if (
    !tool.toolType ||
    !Array.isArray(tool.inputs) ||
    tool.inputs.length === 0 ||
    !tool.calculation ||
    !tool.calculation.kind ||
    !Array.isArray(tool.calculation.outputs) ||
    tool.calculation.outputs.length === 0
  ) {
    throw new Error(`Incomplete tool specification: ${tool.slug}`);
  }

  const inputIds = new Set();

  for (const input of tool.inputs) {
    if (
      !input.id ||
      !input.label ||
      input.type !== 'number' ||
      !Number.isFinite(input.defaultValue) ||
      !Number.isFinite(input.min) ||
      !Number.isFinite(input.step) ||
      input.step <= 0 ||
      input.defaultValue < input.min
    ) {
      throw new Error(
        `Invalid input definition in ${tool.slug}: ${input.id}`
      );
    }

    if (inputIds.has(input.id)) {
      throw new Error(
        `Duplicate input ID in ${tool.slug}: ${input.id}`
      );
    }

    inputIds.add(input.id);
  }

  for (const output of tool.calculation.outputs) {
    if (!output.id || !output.label) {
      throw new Error(`Invalid output definition in ${tool.slug}`);
    }
  }
}

async function main() {
  const outputDirectory = path.join(
    process.cwd(),
    'specs',
    'generated'
  );

  await fs.mkdir(outputDirectory, { recursive: true });

  for (const tool of toolIdeas) {
    validateTool(tool);

    const outputPath = path.join(
      outputDirectory,
      `${tool.slug}.json`
    );

    try {
      await fs.access(outputPath);

      // Preserve existing files rather than silently overwriting them.
      // Older files will need a deliberate schema update.
      console.log(`Specification already exists; skipping: ${tool.slug}`);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
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
    'All predefined specifications already exist. ' +
    'No new file was created. Add another tool idea or update ' +
    'an existing specification deliberately.'
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
