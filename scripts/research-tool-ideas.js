
const fs = require("node:fs");
const path = require("node:path");

const ROOT = process.cwd();

const SPEC_DIRECTORY = path.join(
  ROOT,
  "specs",
  "generated"
);

const REPORT_DIRECTORY = path.join(
  ROOT,
  "specs",
  "research"
);

const REPORT_PATH = path.join(
  REPORT_DIRECTORY,
  "research-report.json"
);

const CRITERIA = {
  demandEvidence: {
    weight: 30,
    description:
      "Evidence that people actively search for or need this solution."
  },
  problemClarity: {
    weight: 20,
    description:
      "How clearly the tool solves a specific user problem."
  },
  competitionGap: {
    weight: 20,
    description:
      "Evidence that existing alternatives leave a meaningful gap."
  },
  monetizationPotential: {
    weight: 15,
    description:
      "Evidence that the solution could support a viable business model."
  },
  buildFeasibility: {
    weight: 15,
    description:
      "How practical it is to build and maintain the tool."
  }
};

function readSpecifications() {
  if (!fs.existsSync(SPEC_DIRECTORY)) {
    throw new Error(
      "No generated specifications directory exists. " +
      "Run the existing specification generator first."
    );
  }

  const files = fs.readdirSync(SPEC_DIRECTORY)
    .filter((file) => file.endsWith(".json"));

  if (files.length === 0) {
    throw new Error(
      "No specification JSON files were found."
    );
  }

  return files.map((file) => {
    const filePath = path.join(SPEC_DIRECTORY, file);

    let specification;

    try {
      specification = JSON.parse(
        fs.readFileSync(filePath, "utf8")
      );
    } catch (error) {
      throw new Error(
        `Cannot read ${file}: ${error.message}`
      );
    }

    if (!specification.name || !specification.slug) {
      throw new Error(
        `${file} is missing a name or slug.`
      );
    }

    return {
      file,
      specification
    };
  });
}

function assessSpecification(item) {
  const spec = item.specification;

  const assessment = {
    name: spec.name,
    slug: spec.slug,
    specificationFile: item.file,
    targetUser: spec.target_user || "Not specified",
    problem: spec.problem_solved || "Not specified",
    scores: {
      demandEvidence: null,
      problemClarity: null,
      competitionGap: null,
      monetizationPotential: null,
      buildFeasibility: null
    },
    weightedScore: null,
    evidenceStatus: "NOT_RESEARCHED",
    decision: "HOLD",
    evidence: [],
    missingEvidence: [
      "Search demand and keyword evidence",
      "Competitor comparison",
      "Evidence of unmet user needs",
      "Evidence supporting monetization",
      "Estimated build and maintenance effort"
    ],
    explanation:
      "A specification exists, but no verified market research " +
      "has been attached. No demand score has been invented."
  };

  return {
    ...assessment,
    criteria: CRITERIA
  };
}

function main() {
  const specifications = readSpecifications();

  fs.mkdirSync(REPORT_DIRECTORY, {
    recursive: true
  });

  const report = {
    reportVersion: 1,
    generatedAt: new Date().toISOString(),
    status: "RESEARCH_REQUIRED",
    scoringMethod: {
      description:
        "Scores must be supported by recorded evidence. " +
        "Missing evidence is not treated as a zero-demand market.",
      criteria: CRITERIA,
      approvalThreshold: 70,
      minimumEvidenceSources: 3
    },
    summary: {
      specificationsReviewed: specifications.length,
      researched: 0,
      approved: 0,
      onHold: specifications.length
    },
    candidates: specifications.map(assessSpecification)
  };

  fs.writeFileSync(
    REPORT_PATH,
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8"
  );

  console.log(
    `Reviewed ${specifications.length} specification(s).`
  );

  console.log(
    "No candidate has been approved because verified " +
    "market evidence has not yet been collected."
  );

  console.log(`Research report saved to: ${REPORT_PATH}`);
}

try {
  main();
} catch (error) {
  console.error("Research scoring failed:", error.message);
  process.exitCode = 1;
}
