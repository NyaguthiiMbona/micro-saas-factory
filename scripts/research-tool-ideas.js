
const fs = require("node:fs");
const path = require("node:path");

const ROOT = process.cwd();

const SPEC_DIRECTORY = path.join(ROOT, "specs", "generated");
const REPORT_DIRECTORY = path.join(ROOT, "specs", "research");
const REPORT_PATH = path.join(REPORT_DIRECTORY, "research-report.json");
const INSTRUCTIONS_PATH = path.join(
  REPORT_DIRECTORY,
  "research-agent-instructions.md"
);

const FIRECRAWL_SEARCH_URL = "https://api.firecrawl.dev/v2/search";
const FIRECRAWL_SCRAPE_URL = "https://api.firecrawl.dev/v2/scrape";

const RESULTS_PER_SEARCH = 5;
const MAX_SEARCHES_PER_CANDIDATE = 3;
const MAX_PAGES_TO_INSPECT_PER_CANDIDATE = 2;
const MAX_PAGE_CONTENT_CHARS = 6000;
const REQUEST_TIMEOUT_MS = 30000;

const CRITERIA = {
  problemSeverity: {
    weight: 15,
    description: "Evidence that the target user experiences a meaningful problem."
  },
  demandEvidence: {
    weight: 20,
    description: "Verified evidence of demand for a solution."
  },
  competitionOpportunity: {
    weight: 15,
    description: "Evidence of competitor weaknesses or an underserved need."
  },
  organicSearchOpportunity: {
    weight: 15,
    description: "Evidence that relevant searches could attract suitable users."
  },
  buildFeasibility: {
    weight: 15,
    description: "Practicality of building, testing, and maintaining the tool."
  },
  monetizationPotential: {
    weight: 10,
    description: "Evidence supporting a plausible business model."
  },
  operationalSustainability: {
    weight: 10,
    description: "Long-term affordability, reliability, privacy, and maintenance."
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
    throw new Error("No specification JSON files were found.");
  }

  return files.map((file) => {
    const filePath = path.join(SPEC_DIRECTORY, file);
    let specification;

    try {
      specification = JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch (error) {
      throw new Error(`Cannot read ${file}: ${error.message}`);
    }

    if (
      !specification ||
      typeof specification !== "object" ||
      !specification.name ||
      !specification.slug
    ) {
      throw new Error(`${file} must contain a valid name and slug.`);
    }

    return { file, specification };
  });
}

function validateInstructions() {
  if (!fs.existsSync(INSTRUCTIONS_PATH)) {
    throw new Error(
      "Research instructions file not found: " +
      "specs/research/research-agent-instructions.md"
    );
  }

  const instructions = fs.readFileSync(INSTRUCTIONS_PATH, "utf8").trim();

  if (instructions.length < 100) {
    throw new Error("The research instructions file is empty or too short.");
  }
}

function createSearchQueries(spec) {
  const name = String(spec.name || "").trim();
  const problem = String(spec.problem_solved || "").trim();
  const targetUser = String(spec.target_user || "").trim();

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
    queries.map((query) => query.trim()).filter(Boolean)
  )].slice(0, MAX_SEARCHES_PER_CANDIDATE);
}

function normaliseUrl(rawUrl) {
  if (typeof rawUrl !== "string" || !rawUrl.trim()) {
    return null;
  }

  try {
    const url = new URL(rawUrl);

    if (!["http:", "https:"].includes(url.protocol)) {
      return null;
    }

    if (url.username || url.password) {
      return null;
    }

    const hostname = url.hostname.toLowerCase();

    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname.endsWith(".localhost") ||
      hostname.endsWith(".local") ||
      hostname.startsWith("10.") ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("169.254.")
    ) {
      return null;
    }

    url.hash = "";

    for (const key of [...url.searchParams.keys()]) {
      if (
        key.toLowerCase().startsWith("utm_") ||
        ["fbclid", "gclid", "ref", "source"].includes(key.toLowerCase())
      ) {
        url.searchParams.delete(key);
      }
    }

    if (url.pathname.length > 1) {
      url.pathname = url.pathname.replace(/\/+$/, "");
    }

    return url.toString();
  } catch {
    return null;
  }
}

function getApiKey() {
  const apiKey = process.env.FIRECRAWL_API_KEY;

  if (!apiKey) {
    const error = new Error("FIRECRAWL_API_KEY is not configured.");
    error.stopResearch = true;
    throw error;
  }

  return apiKey;
}

async function postToFirecrawl(endpoint, body) {
  const apiKey = getApiKey();

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  });

  if (!response.ok) {
    const error = new Error(`Firecrawl returned HTTP ${response.status}.`);

    error.stopResearch = [401, 402, 403, 429].includes(response.status);
    throw error;
  }

  const payload = await response.json();

  if (payload.success === false) {
    const error = new Error(
      typeof payload.error === "string"
        ? payload.error
        : "Firecrawl reported that the request failed."
    );

    error.stopResearch = true;
    throw error;
  }

  return payload;
}

async function searchWeb(query) {
  const payload = await postToFirecrawl(FIRECRAWL_SEARCH_URL, {
    query,
    limit: RESULTS_PER_SEARCH
  });

  const data = payload.data;

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

async function scrapePage(url) {
  const payload = await postToFirecrawl(FIRECRAWL_SCRAPE_URL, {
    url,
    formats: ["markdown"],
    onlyMainContent: true,
    timeout: REQUEST_TIMEOUT_MS
  });

  const data = payload.data || payload;
  const metadata = data.metadata || {};

  return {
    markdown: typeof data.markdown === "string" ? data.markdown : "",
    title: metadata.title || null,
    description: metadata.description || null,
    sourceUrl: metadata.sourceURL || metadata.url || url,
    statusCode: Number.isFinite(metadata.statusCode)
      ? metadata.statusCode
      : null,
    creditsUsed: Number.isFinite(metadata.creditsUsed)
      ? metadata.creditsUsed
      : Number.isFinite(payload.creditsUsed)
        ? payload.creditsUsed
        : null,
    warning: data.warning || null
  };
}

function normaliseResult(result, query, retrievedAt) {
  const url = normaliseUrl(result.url);

  if (!url) {
    return null;
  }

  return {
    type: "WEB_SEARCH_RESULT",
    title: result.title || null,
    url,
    description: result.description || result.snippet || null,
    matchedQueries: [query],
    retrievedAt,
    evidenceQuality: "LOW",
    limitations:
      "Search-result information only. The underlying page " +
      "has not yet been independently inspected."
  };
}

function classifySource(title, description, content) {
  const text = `${title || ""} ${description || ""} ${content || ""}`
    .toLowerCase();

  const discussionTerms = [
    "reddit.com",
    "forum",
    "discussion",
    "anyone know",
    "what do you use",
    "user review",
    "customer review"
  ];

  const competitorTerms = [
    "calculator",
    "calculate",
    "pricing",
    "free tool",
    "rate calculator",
    "estimate your",
    "compare rates"
  ];

  const alternativeTerms = [
    "time tracking",
    "invoicing software",
    "project management",
    "accounting software",
    "alternative to",
    "workflow"
  ];

  if (discussionTerms.some((term) => text.includes(term))) {
    return "DISCUSSION_OR_FEEDBACK";
  }

  if (competitorTerms.some((term) => text.includes(term))) {
    return "POTENTIAL_DIRECT_COMPETITOR";
  }

  if (alternativeTerms.some((term) => text.includes(term))) {
    return "RELATED_ALTERNATIVE";
  }

  return "OTHER_OR_UNCLEAR";
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
    sourceInspection: [],

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
        "Inspect collected sources and validate demand, competition, " +
        "and willingness to pay before deciding whether to build.",
      buildApprovalGranted: false
    },

    searchExecution: {
      queriesAttempted: 0,
      successfulSearches: 0,
      rawResultsCollected: 0,
      uniqueSourcesCollected: 0,
      errors: []
    },

    explanation:
      "Search evidence is collected separately from market validation. " +
      "Scores remain null until sufficient evidence is assessed."
  };
}

async function researchCandidate(candidate, state) {
  const evidenceByUrl = new Map();
  const queries = candidate.researchPlan.initialSearchTerms;

  for (const query of queries) {
    if (state.stopSearch) {
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

      candidate.searchExecution.successfulSearches += 1;
      candidate.searchExecution.rawResultsCollected += result.results.length;

      for (const item of result.results) {
        const evidence = normaliseResult(item, query, retrievedAt);

        if (!evidence) {
          continue;
        }

        const existing = evidenceByUrl.get(evidence.url);

        if (existing) {
          if (!existing.matchedQueries.includes(query)) {
            existing.matchedQueries.push(query);
          }

          if (
            (!existing.description || existing.description.length < 40) &&
            evidence.description
          ) {
            existing.description = evidence.description;
          }

          if (!existing.title && evidence.title) {
            existing.title = evidence.title;
          }
        } else {
          evidenceByUrl.set(evidence.url, evidence);
        }
      }

      console.log(`Search completed for "${candidate.name}".`);
    } catch (error) {
      const message = error.name === "TimeoutError"
        ? "The search request timed out."
        : error.message;

      const errorRecord = {
        stage: "search",
        query,
        message,
        recordedAt: new Date().toISOString()
      };

      candidate.searchExecution.errors.push(errorRecord);
      state.errors.push({
        candidate: candidate.name,
        ...errorRecord
      });

      console.error(`Search failed for "${candidate.name}": ${message}`);

      if (error.stopResearch) {
        state.stopSearch = true;
        state.stopReason = message;
      }
    }
  }

  candidate.evidence = [...evidenceByUrl.values()];
  candidate.searchExecution.uniqueSourcesCollected = candidate.evidence.length;

  // Keep SEO findings separate from evidence instead of copying every
  // source into two arrays. This prevents artificial report inflation.
  candidate.seoFindings.findings = candidate.evidence.map((source) => ({
    url: source.url,
    title: source.title,
    description: source.description,
    matchedQueries: [...source.matchedQueries]
  }));

  const pagesToInspect = candidate.evidence
    .filter((source) => source.url)
    .slice(0, MAX_PAGES_TO_INSPECT_PER_CANDIDATE);

  for (const source of pagesToInspect) {
    if (state.stopInspection) {
      break;
    }

    try {
      const page = await scrapePage(source.url);
      const inspectedAt = new Date().toISOString();

      if (page.creditsUsed !== null) {
        state.reportedCreditsUsed += page.creditsUsed;
      }

      const content = page.markdown.slice(0, MAX_PAGE_CONTENT_CHARS);
      const classification = classifySource(
        page.title || source.title,
        page.description || source.description,
        content
      );

      const inspection = {
        url: source.url,
        status: content
          ? "INSPECTED"
          : "NO_MARKDOWN_RETURNED",
        inspectedAt,
        pageTitle: page.title || source.title,
        pageDescription: page.description || source.description,
        httpStatusCode: page.statusCode,
        classification,
        contentLength: page.markdown.length,
        contentTruncated: page.markdown.length > MAX_PAGE_CONTENT_CHARS,
        contentExcerpt: content || null,
        warning: page.warning,
        limitations: [
          "Classification uses simple keyword rules, not a full semantic assessment.",
          "Page content may be incomplete, outdated, or promotional.",
          "This inspection does not establish search volume or willingness to pay."
        ]
      };

      candidate.sourceInspection.push(inspection);

      source.pageInspection = {
        status: inspection.status,
        inspectedAt,
        pageTitle: inspection.pageTitle,
        httpStatusCode: inspection.httpStatusCode,
        classification,
        contentLength: inspection.contentLength,
        warning: page.warning
      };

      source.evidenceQuality = content ? "PARTIAL_PAGE_INSPECTED" : "LOW";
      source.limitations =
        "Page content was retrieved, but its claims have not been " +
        "independently verified and no market demand metrics were collected.";

      if (
        classification === "POTENTIAL_DIRECT_COMPETITOR" ||
        classification === "RELATED_ALTERNATIVE"
      ) {
        candidate.competitorFindings.push({
          name: inspection.pageTitle,
          url: source.url,
          classification,
          basis: "Preliminary keyword classification of inspected page content.",
          verified: false
        });
      }

      state.pagesInspected += 1;

      console.log(
        `Inspected page for "${candidate.name}": ${source.url}`
      );
    } catch (error) {
      const message = error.name === "TimeoutError"
        ? "The page inspection timed out."
        : error.message;

      const errorRecord = {
        stage: "page_inspection",
        url: source.url,
        message,
        recordedAt: new Date().toISOString()
      };

      candidate.sourceInspection.push({
        url: source.url,
        status: "INSPECTION_FAILED",
        inspectedAt: errorRecord.recordedAt,
        classification: "UNCLASSIFIED",
        error: message,
        limitations: [
          "The page could not be inspected during this run.",
          "Inspection failure does not mean the source is invalid or the market lacks demand."
        ]
      });

      candidate.searchExecution.errors.push(errorRecord);
      state.errors.push({
        candidate: candidate.name,
        ...errorRecord
      });

      console.error(`Page inspection failed: ${source.url}: ${message}`);

      if (error.stopResearch) {
        state.stopInspection = true;
        state.inspectionStopReason = message;
      }
    }
  }

  if (candidate.evidence.length > 0) {
    candidate.evidenceStatus = candidate.sourceInspection.some(
      (item) => item.status === "INSPECTED"
    )
      ? "SEARCH_AND_PARTIAL_PAGE_INSPECTION"
      : "PARTIAL_WEB_SEARCH";

    candidate.confidence = "LOW";

    candidate.seoFindings.limitations.push(
      "Search results may be incomplete, duplicated across queries, " +
      "outdated, or commercially biased.",
      "Only a limited number of pages are inspected per candidate."
    );

    candidate.explanation =
      "Unique search sources were collected and a limited number of pages " +
      "were inspected. Preliminary classifications use keyword rules. " +
      "Market scores remain null pending deeper evidence assessment.";
  } else if (candidate.searchExecution.errors.length > 0) {
    candidate.evidenceStatus = "SEARCH_FAILED";
    candidate.explanation =
      "Search attempts failed or were stopped. No market conclusions can be drawn.";
  } else {
    candidate.evidenceStatus = "NO_RESULTS";
    candidate.explanation =
      "Search requests completed without usable source URLs. " +
      "This does not prove that demand is absent.";
  }

  candidate.uniqueSourceCount = candidate.evidence.length;
}

async function main() {
  validateInstructions();

  const specifications = readSpecifications();

  fs.mkdirSync(REPORT_DIRECTORY, { recursive: true });

  const candidates = specifications.map(createCandidate);

  const state = {
    successfulSearches: 0,
    pagesInspected: 0,
    reportedCreditsUsed: 0,
    errors: [],
    stopSearch: false,
    stopReason: null,
    stopInspection: false,
    inspectionStopReason: null
  };

  for (const candidate of candidates) {
    await researchCandidate(candidate, state);
  }

  const researchedCandidates = candidates.filter(
    (candidate) => candidate.evidence.length > 0
  ).length;

  const totalUniqueSources = candidates.reduce(
    (total, candidate) => total + candidate.evidence.length,
    0
  );

  const report = {
    reportVersion: 4,
    generatedAt: new Date().toISOString(),

    status: researchedCandidates > 0
      ? "PARTIAL_WEB_RESEARCH"
      : "RESEARCH_REQUIRED",

    instructionsFile: "specs/research/research-agent-instructions.md",

    researchExecution: {
      completed: true,
      mode: "FIRECRAWL_SEARCH_AND_LIMITED_SCRAPE",
      webResearchPerformed: state.successfulSearches > 0,

      provider: "Firecrawl",
      searchEndpoint: FIRECRAWL_SEARCH_URL,
      scrapeEndpoint: FIRECRAWL_SCRAPE_URL,

      successfulSearches: state.successfulSearches,
      uniqueSourcesCollected: totalUniqueSources,
      pagesInspected: state.pagesInspected,
      maxPagesToInspectPerCandidate: MAX_PAGES_TO_INSPECT_PER_CANDIDATE,

      reportedCreditsUsed: state.reportedCreditsUsed,
      reportedCreditsNote:
        "Includes credit totals reported by successful API responses. " +
        "Missing credit values are not assumed to be zero.",

      stoppedSearchEarly: state.stopSearch,
      searchStopReason: state.stopReason,
      stoppedInspectionEarly: state.stopInspection,
      inspectionStopReason: state.inspectionStopReason,

      errors: state.errors,

      explanation:
        "The script collects unique web-search sources and inspects a limited " +
        "number of pages. It applies basic keyword-based source classifications. " +
        "It does not verify claims independently, measure actual search volume, " +
        "interview customers, or establish willingness to pay.",

      nextRequirement:
        "Assess source relevance, gather independent demand and pricing evidence, " +
        "and review each scoring criterion before making build decisions."
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
        "Keyword classifications are preliminary and must not be treated as verified conclusions.",
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
      uniqueSourcesCollected: totalUniqueSources,
      pagesInspected: state.pagesInspected,
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

  console.log(`Specifications reviewed: ${candidates.length}`);
  console.log(`Candidates with search evidence: ${researchedCandidates}`);
  console.log(`Successful Firecrawl searches: ${state.successfulSearches}`);
  console.log(`Unique sources collected: ${totalUniqueSources}`);
  console.log(`Pages inspected: ${state.pagesInspected}`);
  console.log(`Candidates approved for building: 0`);
  console.log(`Reported Firecrawl credits used: ${state.reportedCreditsUsed}`);
  console.log(`Research report saved to: ${REPORT_PATH}`);

  if (state.errors.length > 0) {
    console.warn(
      `Research completed with ${state.errors.length} error(s). See the report.`
    );
  }
}

main().catch((error) => {
  console.error("Research preparation failed:", error.message);
  process.exitCode = 1;
});
