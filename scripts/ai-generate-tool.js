
const fs = require("node:fs");
const path = require("node:path");

const outputDirectory = path.join(
  process.cwd(),
  "specs",
  "generated"
);

const toolIdeas = [
  {
    name: "Invoice Late Fee Calculator",
    slug: "invoice-late-fee-calculator",
    toolType: "invoice-late-fee-calculator",
    description:
      "Calculate an estimated late fee and total amount owed on an overdue invoice.",
    target_user: "Freelancers and small business owners",
    problem_solved:
      "Makes it easier to estimate late payment charges.",
    inputs: [
      {
        id: "amount",
        label: "Original invoice amount",
        type: "number",
        min: 0.01,
        step: 0.01,
        defaultValue: 1000
      },
      {
        id: "annualRate",
        label: "Annual late fee rate (%)",
        type: "number",
        min: 0,
        step: 0.01,
        defaultValue: 8
      },
      {
        id: "daysOverdue",
        label: "Days overdue",
        type: "number",
        min: 0,
        step: 1,
        defaultValue: 30
      }
    ],
    calculation: {
      kind: "simple-interest",
      formula:
        "amount * (annualRate / 100) * (daysOverdue / 365)",
      outputs: [
        {
          id: "fee",
          label: "Estimated late fee"
        },
        {
          id: "total",
          label: "Total estimated amount owed"
        }
      ]
    },
    monetization_idea:
      "Test demand for downloadable invoice payment summaries."
  },
  {
    name: "Meeting Cost Calculator",
    slug: "meeting-cost-calculator",
    toolType: "meeting-cost-calculator",
    description:
      "Estimate the staff cost of a meeting using attendee count, hourly pay and meeting duration.",
    target_user:
      "Small business owners, managers and team leaders",
    problem_solved:
      "Helps teams understand how much paid staff time meetings consume.",
    inputs: [
      {
        id: "attendees",
        label: "Number of attendees",
        type: "number",
        min: 1,
        step: 1,
        defaultValue: 5
      },
      {
        id: "hourlyRate",
        label: "Average hourly cost per attendee",
        type: "number",
        min: 0,
        step: 0.01,
        defaultValue: 20
      },
      {
        id: "durationMinutes",
        label: "Meeting duration (minutes)",
        type: "number",
        min: 1,
        step: 1,
        defaultValue: 60
      }
    ],
    calculation: {
      kind: "meeting-cost",
      formula:
        "attendees * hourlyRate * (durationMinutes / 60)",
      outputs: [
        {
          id: "totalCost",
          label: "Estimated meeting cost"
        }
      ]
    },
    monetization_idea:
      "Test demand for team meeting reports and meeting-efficiency tools."
  },
  {
    name: "Freelance Hourly Rate Calculator",
    slug: "freelance-hourly-rate-calculator",
    toolType: "freelance-hourly-rate-calculator",
    description:
      "Estimate a freelance hourly rate from an income target, expenses, working hours and billable time.",
    target_user:
      "Freelancers, consultants and independent professionals",
    problem_solved:
      "Helps freelancers estimate a rate that accounts for expenses and non-billable working time.",
    inputs: [
      {
        id: "incomeTarget",
        label: "Desired annual income",
        type: "number",
        min: 0,
        step: 100,
        defaultValue: 40000
      },
      {
        id: "annualExpenses",
        label: "Estimated annual business expenses",
        type: "number",
        min: 0,
        step: 100,
        defaultValue: 5000
      },
      {
        id: "workingWeeks",
        label: "Working weeks per year",
        type: "number",
        min: 1,
        max: 52,
        step: 1,
        defaultValue: 46
      },
      {
        id: "hoursPerWeek",
        label: "Working hours per week",
        type: "number",
        min: 1,
        step: 1,
        defaultValue: 40
      },
      {
        id: "billablePercentage",
        label: "Billable working time (%)",
        type: "number",
        min: 1,
        max: 100,
        step: 1,
        defaultValue: 60
      }
    ],
    calculation: {
      kind: "freelance-hourly-rate",
      formula:
        "(incomeTarget + annualExpenses) / (workingWeeks * hoursPerWeek * (billablePercentage / 100))",
      outputs: [
        {
          id: "hourlyRate",
          label: "Estimated minimum hourly rate"
        }
      ]
    },
    monetization_idea:
      "Test demand for downloadable freelance pricing plans and rate-setting worksheets."
  }
];

function main() {
  fs.mkdirSync(outputDirectory, {
    recursive: true
  });

  for (const idea of toolIdeas) {
    const outputPath = path.join(
      outputDirectory,
      `${idea.slug}.json`
    );

    if (fs.existsSync(outputPath)) {
      console.log(
        `Skipping existing specification: ${idea.slug}`
      );
      continue;
    }

    const specification = {
      schemaVersion: 1,
      ...idea
    };

    fs.writeFileSync(
      outputPath,
      `${JSON.stringify(specification, null, 2)}\n`,
      "utf8"
    );

    console.log(
      `Created specification: ${outputPath}`
    );

    return;
  }

  console.log(
    "No new specification created. " +
      "All predefined ideas already have specifications."
  );
}

try {
  main();
} catch (error) {
  console.error(
    "Specification generation failed:",
    error.message
  );
  process.exitCode = 1;
}
