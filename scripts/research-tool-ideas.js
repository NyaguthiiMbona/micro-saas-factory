
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

const FIRECRAWL_API_URL =
  "https://api.firecrawl.dev/v2/search";

const RESULTS_PER_SEARCH = 5;
const MAX_SEARCHES_PER_CANDIDATE = 3;

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

    return { file, specification };
  });
}

function createSearchQueries(spec) {
  const name = spec.name;
  const problem = spec.problem_solved;
  const targetUser = spec.target_user;

  const queries = [
    `${name} alternatives competitors`,
    problem
      ? `${problem} tools solutions`
      : `${name} user problems reviews`,
    targetUser && problem
      ? `${targetUser} ${problem} software`
      : `${name} pricing reviews`
  ];

  return [...new Set(
    queries
      .filter((query) => typeof query === "string")
      .map((query) => query.trim())
      .filter(Boolean)
  )].slice(0, MAX_SEARCHES_PER_CANDIDATE);
}

async function searchWeb(query) {
  const apiKey = process.env.FIRECRAWL_API_KEY;

  if (!apiKey) {
    const error = new Error(
      "FIRECRAWL_API_KEY is not configured."
    );

    error.stopResearch = true;
    throw error;
  }

  const response = await fetch(FIRECRAWL_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      query,
      limit: RESULTS_PER_SEARCH
    }),
    signal: AbortSignal.timeout(30000)
  });

  if (!response.ok) {
    const error = new Error(
      `Firecrawl returned HTTP ${response.status}.`
    );

    error.stopResearch = [
      401,
      402,
      403,
      429
    ].includes(response.status);

    throw error;
  }

  const payload = await response.json();

  if (payload.success === false) {
    const error = new Error(
      "Firecrawl reported that the search failed."
    );

    error.stopResearch = true;
    throw error;
  }

  const data = payload.data;

  // Firecrawl v2 normally groups results under data.web.
  // Also accept a direct array to handle compatible responses.
  const results = Array.isArray(data)
    ? data
    : Array.isArray(data?.web)
      ? data.web
      : [];

  return {
    results,
    creditsUsed: Number.isFinite(payload.creditsUsed)
      ? payload.creditsUsed
      : null
  };
}

function normaliseResult(result, query, retrievedAt) {
  return {
    type: "WEB_SEARCH_RESULT",
    query,
    title: result.title || null,
    url: result.url || null,
    description: result.description || result.snippet || null,
    retrievedAt,
    evidenceQuality: "LOW",
    limitations:
      "Search-result information only. The underlying page " +
      "has not been independently inspected or verified."
  };
}

function createCandidate(item) {
  const spec = item.specification;

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
        "Search-result snippets do not establish keyword volume or difficulty.",
        "No Google Search Console or Google Trends data has been collected.",
        "Search results do not prove willingness to pay."
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

      initialSearchTerms: createSearchQueries(spec),

      tasks: [
        "Find credible evidence that the problem exists.",
        "Investigate search phrases and search intent.",
        "Compare direct competitors, indirect alternatives, and free substitutes.",
        "Inspect competitor features, pricing, and documented user complaints.",
        "Investigate willingness to pay.",
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
        "Inspect the collected sources and validate demand, competition, " +
        "and willingness to pay before deciding whether to build.",

      buildApprovalGranted: false
    },

    searchExecution: {
      queriesAttempted: 0,
      successfulSearches: 0,
      resultsCollected: 0,
      errors: []
    },

    explanation:
      "Search evidence is collected separately from market validation. " +
      "Scores remain null until sufficient evidence is assessed."
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
}

async function researchCandidate(candidate, state) {
  const queries = candidate.researchPlan.initialSearchTerms;
  const seenUrls = new Set();

  for (const query of queries) {
    if (state.stopResearch) {
      break;
    }

    candidate.searchExecution.queriesAttempted += 1;

    try {
      const result = await searchWeb(query);
      const retrievedAt = new Date().toISOString();

      state.successfulSearches += 1;

      if (result.creditsUsed !== null) {
        state.reportedCreditsUsed += result.creditsUsed;
      }

      for (const item of result.results) {
        const evidence = normaliseResult(
          item,
          query,
          retrievedAt
        );

        // Keep evidence only when it has a usable source URL.
        if (!evidence.url) {
          continue;
        }

        candidate.evidence.push(evidence);
        candidate.seoFindings.findings.push(evidence);
        seenUrls.add(evidence.url);
      }

      candidate.searchExecution.successfulSearches += 1;

      candidate.searchExecution.resultsCollected =
        candidate.evidence.length;

      console.log(
        `Search completed for "${candidate.name}".`
      );
    } catch (error) {
      const message = error.name === "TimeoutError"
        ? "The search request timed out."
        : error.message;

      candidate.searchExecution.errors.push({
        query,
        message,
        recordedAt: new Date().toISOString()
      });

      state.errors.push({
        candidate: candidate.name,
        query,
        message
      });

      console.error(
        `Search failed for "${candidate.name}": ${message}`
      );

      if (error.stopResearch) {
        state.stopResearch = true;
        state.stopReason = message;
      }
    }
  }

  candidate.searchExecution.resultsCollected =
    candidate.evidence.length;

  candidate.uniqueSourceCount = seenUrls.size;

  if (candidate.evidence.length > 0) {
    candidate.evidenceStatus = "PARTIAL_WEB_SEARCH";
    candidate.confidence = "LOW";
    candidate.seoFindings.limitations.push(
      "Results may be incomplete, duplicated across queries, " +
      "outdated, or commercially biased."
    );

    candidate.explanation =
      "Web search results have been collected. They have not yet " +
      "been fully inspected or independently verified. All market " +
      "scores remain null.";
  } else if (candidate.searchExecution.errors.length > 0) {
    candidate.evidenceStatus = "SEARCH_FAILED";
    candidate.explanation =
      "Search attempts failed or were stopped. No verified market " +
      "conclusions can be drawn.";
  } else {
    candidate.evidenceStatus = "NO_RESULTS";
    candidate.explanation =
      "Search requests completed without usable source URLs. " +
      "This does not prove that demand is absent.";
  }

  // Search results are not automatically classified as competitors.
  candidate.competitorFindings = [];
}

async function main() {
  validateInstructions();

  const specifications = readSpecifications();

  fs.mkdirSync(REPORT_DIRECTORY, {
    recursive: true
  });

  const candidates = specifications.map(createCandidate);

  const state = {
    successfulSearches: 0,
    reportedCreditsUsed: 0,
    errors: [],
    stopResearch: false,
    stopReason: null
  };

  for (const candidate of candidates) {
    await researchCandidate(candidate, state);
  }

  const researchedCandidates = candidates.filter(
    (candidate) => candidate.evidence.length > 0
  ).length;

  const report = {
    reportVersion: 3,
    generatedAt: new Date().toISOString(),

    status: researchedCandidates > 0
      ? "PARTIAL_WEB_RESEARCH"
      : "RESEARCH_REQUIRED",

    instructionsFile:
      "specs/research/research-agent-instructions.md",

    researchExecution: {
      completed: false,
      mode: "FIRECRAWL_WEB_SEARCH",
      webResearchPerformed: state.successfulSearches > 0,

      provider: "Firecrawl",
      endpoint: FIRECRAWL_API_URL,

      successfulSearches: state.successfulSearches,
      resultsCollected: candidates.reduce(
        (total, candidate) =>
          total + candidate.evidence.length,
        0
      ),

      reportedCreditsUsed: state.reportedCreditsUsed,
      reportedCreditsNote:
        "Credit totals are included only when returned by the API. " +
        "A missing total does not mean zero credits were used.",

      stoppedEarly: state.stopResearch,
      stopReason: state.stopReason,
      errors: state.errors,

      explanation:
        "The script collects web-search results and source metadata. " +
        "It does not yet verify full pages, measure actual search volume, " +
        "interview customers, or establish willingness to pay.",

      nextRequirement:
        "Inspect source pages, gather independent evidence, and assess " +
        "each scoring criterion before making build decisions."
    },

    scoringMethod: {
      scale: "0-5, or null when evidence is insufficient",
      criteria: CRITERIA,
      approvalThreshold: 70,
      minimumEvidenceSources: 3,

      weightedScoreFormula:
        "Sum(score / 5 * criterion weight) for scored criteria only. " +
        "A definitive total is permitted only when every criterion " +
        "has sufficient evidence.",

      rules: [
        "Never invent evidence or numerical metrics.",
        "Missing evidence must remain null, not zero.",
        "Search-result snippets alone are insufficient for market approval.",
        "Do not calculate a definitive weighted score when any criterion is unscored.",
        "A high score does not override serious legal, security, or feasibility risks.",
        "A successful API request does not mean market research is complete.",
        "A BUILD decision requires verified evidence and documented validation.",
        "Research failures must never be interpreted as evidence of no demand."
      ]
    },

    summary: {
      specificationsReviewed: candidates.length,
      researched: researchedCandidates,
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
    `Specifications reviewed: ${candidates.length}`
  );

  console.log(
    `Candidates with search evidence: ${researchedCandidates}`
  );

  console.log(
    `Successful Firecrawl searches: ${state.successfulSearches}`
  );

  console.log(
    `Candidates approved for building: 0`
  );

  console.log(
    `Research report saved to: ${REPORT_PATH}`
  );

  if (state.stopResearch) {
    console.warn(
      "Research stopped early. See researchExecution.errors in the report."
    );
  }
}

main().catch((error) => {
  console.error(
    "Research preparation failed:",
    error.message
  );

  process.exitCode = 1;
});
