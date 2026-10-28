
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

const INSTRUCTIONS_PATH = path.join(
  REPORT_DIRECTORY,
  "research-agent-instructions.md"
);

const CRITERIA = {
  problemSeverity: {
    weight: 15,
    description:
      "Evidence that the target user experiences a meaningful problem."
  },
  demandEvidence: {
    weight: 20,
    description:
      "Verified evidence of demand for a solution."
  },
  competitionOpportunity: {
    weight: 15,
    description:
      "Evidence of competitor weaknesses or an underserved need."
  },
  organicSearchOpportunity: {
    weight: 15,
    description:
      "Evidence that relevant searches could attract suitable users."
  },
  buildFeasibility: {
    weight: 15,
    description:
      "Practicality of building, testing, and maintaining the tool."
  },
  monetizationPotential: {
    weight: 10,
    description:
      "Evidence supporting a plausible business model."
  },
  operationalSustainability: {
    weight: 10,
    description:
      "Long-term affordability, reliability, privacy, and maintenance."
  }
};

const REQUIRED_EVIDENCE = [
  "Problem evidence from relevant target users",
  "Search demand and keyword evidence",
  "Direct and indirect competitor comparison",
  "Evidence of unmet needs or differentiation",
  "Pricing and monetization evidence",
  "Build complexity and maintenance assessment",
  "Operating cost, privacy, security, and legal risk assessment"
];

function readSpecifications() {
  if (!fs.existsSync(SPEC_DIRECTORY)) {
    throw new Error(
      "Generated specifications directory not found. " +
      "Run the specification generator first."
    );
  }

  const files = fs.readdirSync(SPEC_DIRECTORY)
    .filter((file) => file.endsWith(".json"))
    .sort();

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

    if (
      !specification ||
      typeof specification !== "object" ||
      !specification.name ||
      !specification.slug
    ) {
      throw new Error(
        `${file} must contain a valid name and slug.`
      );
    }

    return {
      file,
      specification
    };
  });
}

function createCandidate(item) {
  const spec = item.specification;

  const searchTerms = [
    spec.name,
    spec.problem_solved,
    spec.target_user
  ].filter(
    (value) => typeof value === "string" && value.trim()
  );

  return {
    name: spec.name,
    slug: spec.slug,
    specificationFile: item.file,

    targetUser: spec.target_user || null,
    problem: spec.problem_solved || null,

    decision: "INVESTIGATE",
    evidenceStatus: "NOT_RESEARCHED",
    confidence: "INSUFFICIENT_EVIDENCE",

    scores: {
      problemSeverity: null,
      demandEvidence: null,
      competitionOpportunity: null,
      organicSearchOpportunity: null,
      buildFeasibility: null,
      monetizationPotential: null,
      operationalSustainability: null
    },

    weightedScore: null,

    evidence: [],

    competitorFindings: [],

    seoFindings: {
      primarySearchPhrase: null,
      supportingSearchPhrases: [],
      searchIntent: null,
      searchVolume: null,
      keywordDifficulty: null,
      geographicCoverage: null,
      findings: [],
      limitations: [
        "No keyword research has been performed by this script."
      ]
    },

    feasibilityAssessment: {
      implementationComplexity: null,
      operatingCosts: [],
      technicalDependencies: [],
      privacyRisks: [],
      securityRisks: [],
      legalConsiderations: [],
      maintenanceRisks: []
    },

    missingEvidence: [...REQUIRED_EVIDENCE],

    researchPlan: {
      problemToInvestigate:
        spec.problem_solved || "Clarify the problem being solved.",

      targetAudience:
        spec.target_user || "Identify a specific target audience.",

      initialSearchTerms: searchTerms,

      tasks: [
        "Find credible evidence that the problem exists.",
        "Investigate relevant search phrases and search intent.",
        "Identify direct competitors, indirect alternatives, and free substitutes.",
        "Record competitor features, pricing, and documented user complaints.",
        "Investigate willingness to pay without assuming that search interest proves it.",
        "Estimate build complexity, maintenance effort, and operating costs.",
        "Identify privacy, security, and legal risks.",
        "Record source URLs, retrieval dates, findings, and evidence quality.",
        "Recommend the cheapest useful validation test."
      ]
    },

    validationPlan: {
      keyAssumptions: [
        "The target audience experiences this problem.",
        "Existing alternatives leave a meaningful unmet need.",
        "The proposed tool can be built and maintained affordably.",
        "There is a plausible route to attracting and retaining users."
      ],
      recommendedNextTest:
        "Collect source-backed market and competitor evidence before deciding whether to build.",
      buildApprovalGranted: false
    },

    explanation:
      "This report defines the research required for this candidate. " +
      "It does not contain completed market research. Scores remain null " +
      "until evidence is collected and assessed."
  };
}

function validateInstructions() {
  if (!fs.existsSync(INSTRUCTIONS_PATH)) {
    throw new Error(
      "Research instructions file not found: " +
      "specs/research/research-agent-instructions.md"
    );
  }

  const instructions = fs.readFileSync(
    INSTRUCTIONS_PATH,
    "utf8"
  ).trim();

  if (instructions.length < 100) {
    throw new Error(
      "The research instructions file is empty or too short."
    );
  }

  return instructions;
}

function main() {
  validateInstructions();

  const specifications = readSpecifications();

  fs.mkdirSync(REPORT_DIRECTORY, {
    recursive: true
  });

  const candidates = specifications.map(createCandidate);

  const report = {
    reportVersion: 2,
    generatedAt: new Date().toISOString(),

    status: "RESEARCH_REQUIRED",

    instructionsFile:
      "specs/research/research-agent-instructions.md",

    researchExecution: {
      completed: false,
      mode: "RESEARCH_PLAN_ONLY",
      webResearchPerformed: false,
      explanation:
        "This script prepares structured research plans. " +
        "It does not independently access search engines, " +
        "Google Trends, Search Console, or competitor websites.",
      nextRequirement:
        "Connect an actual research source or research-capable service " +
        "before recording findings or assigning evidence-based scores."
    },

    scoringMethod: {
      scale: "0-5, or null when evidence is insufficient",
      criteria: CRITERIA,
      approvalThreshold: 70,
      minimumEvidenceSources: 3,
      weightedScoreFormula:
        "Sum(score / 5 * criterion weight) for scored criteria only. " +
        "A definitive total is permitted only when all criteria have " +
        "sufficient evidence.",
      rules: [
        "Never invent evidence or numerical metrics.",
        "Missing evidence must remain null, not zero.",
        "Do not calculate a definitive weighted score when any criterion is unscored.",
        "A high score does not override serious legal, security, or feasibility risks.",
        "A completed script run does not mean market research was completed.",
        "A BUILD decision requires evidence and a documented validation rationale."
      ]
    },

    summary: {
      specificationsReviewed: candidates.length,
      researched: 0,
      approved: 0,
      onHold: candidates.length
    },

    candidates
  };

  fs.writeFileSync(
    REPORT_PATH,
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8"
  );

  console.log(
    `Prepared research plans for ${candidates.length} specification(s).`
  );

  console.log(
    "Market research completed: no."
  );

  console.log(
    "Candidates approved for building: 0."
  );

  console.log(
    `Research report saved to: ${REPORT_PATH}`
  );
}

try {
  main();
} catch (error) {
  console.error(
    "Research preparation failed:",
    error.message
  );

  process.exitCode = 1;
}
