const { analyzeJd } = require('./analyzeJd');
const { scoreHistory } = require('./scoreHistory');
const { generatePlan } = require('./generatePlan');
const { renderMarkdown } = require('./renderMd');
const { humanizeMarkdown } = require('./humanize');

/**
 * Local cleanup and quality checks
 * @param {string} markdown
 * @returns {string}
 */
function runLocalCleanup(markdown) {
  let cleaned = markdown;

  // Hard cap on summary length (first section after header)
  const summaryMatch = cleaned.match(/## Summary\n([\s\S]*?)(?=\n##|\n*$)/);
  if (summaryMatch) {
    const summaryLines = summaryMatch[1].trim().split('\n');
    if (summaryLines.length > 4) {
      const truncated = summaryLines.slice(0, 4).join('\n');
      cleaned = cleaned.replace(summaryMatch[0], `## Summary\n${truncated}`);
    }
  }

  // Limit bullets per job (3-6 max)
  const experienceMatch = cleaned.match(/## Experience\n([\s\S]*?)(?=\n##|\n*$)/);
  if (experienceMatch) {
    let experience = experienceMatch[1];
    const jobSections = experience.split(/\n### /);
    const cleanedJobs = jobSections.map((section, idx) => {
      if (idx === 0) return section; // First section might not start with ###
      const bullets = section.match(/^- .+$/gm) || [];
      if (bullets.length > 6) {
        const keepBullets = bullets.slice(0, 6);
        const rest = section.split(/^- .+$/gm).slice(1);
        return `### ${section.split('\n')[0]}\n${keepBullets.join('\n')}${rest.join('')}`;
      }
      return `### ${section}`;
    });
    experience = cleanedJobs.join('\n### ');
    cleaned = cleaned.replace(experienceMatch[0], `## Experience\n${experience}`);
  }

  // Remove common banned phrases with regex
  const bannedRegex = [
    /\bresults-driven\b/gi,
    /\bpassionate about\b/gi,
    /\bhighly motivated\b/gi,
    /\bteam player\b/gi,
    /\bdetail-oriented\b/gi,
    /\bthink outside the box\b/gi,
    /\bsynergy\b/gi,
    /\bleverage\b/gi,
    /\butilize\b/gi,
    /\bproven track record\b/gi
  ];

  bannedRegex.forEach(regex => {
    cleaned = cleaned.replace(regex, '');
  });

  // Clean up extra whitespace
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  cleaned = cleaned.trim();

  return cleaned;
}

/**
 * Main pipeline function to create a tailored resume
 * @param {Object} params
 * @param {string} params.jobDescription
 * @param {import('./types').EmploymentItem[]} params.employmentHistory
 * @param {string[]} [params.voiceSamples]
 * @param {Object} [params.options]
 * @param {string} params.userName
 * @param {Object} params.userContact
 * @param {import('./types').EmploymentItem[]} params.education
 * @param {OpenAI} params.openai
 * @param {boolean} [params.returnMarkdown=false] - If true, returns markdown string; if false, returns ResumePlan object
 * @returns {Promise<string|import('./types').ResumePlan>}
 */
async function createTailoredResume({
  jobDescription,
  employmentHistory,
  voiceSamples,
  options,
  userName,
  userContact,
  education,
  openai,
  returnMarkdown = false
}) {
  // Step 1: Analyze JD
  const jdAnalysis = await analyzeJd(jobDescription, openai);

  // Step 2: Score history
  const scoredHistory = await scoreHistory(employmentHistory, jdAnalysis);

  // Step 3: Generate structured plan
  const plan = await generatePlan({
    jdAnalysis,
    scoredHistory,
    voiceSamples,
    options,
    userName,
    userContact,
    education,
    openai
  });

  if (!returnMarkdown) {
    // Return the plan object for JSON conversion
    return plan;
  }

  // Step 4: Render to markdown
  let md = renderMarkdown(plan);

  // Step 5: Humanize
  md = await humanizeMarkdown(md, voiceSamples, openai);

  // Step 6: Local cleanup
  md = runLocalCleanup(md);

  return md;
}

// ── Version registry ────────────────────────────────────────────────────────
const PIPELINE_VERSIONS = {
  1: createTailoredResume,
  // V2 is lazy-loaded to avoid pulling in deps until actually needed
  2: (params) => require('./v2').createTailoredResumeV2(params),
};

const SUPPORTED_VERSIONS = Object.keys(PIPELINE_VERSIONS).map(Number);
const DEFAULT_VERSION = 1;

/**
 * Version-aware entry point.
 * @param {number} version - Pipeline version (1, 2, …)
 * @param {Object} params  - Same params as createTailoredResume
 */
async function runPipeline(version, params) {
  const v = Number(version) || DEFAULT_VERSION;
  const fn = PIPELINE_VERSIONS[v];
  if (!fn) {
    throw new Error(`Unknown pipeline version ${v}. Supported: ${SUPPORTED_VERSIONS.join(', ')}`);
  }
  return fn(params);
}

module.exports = {
  createTailoredResume,   // backwards-compat (v1 direct)
  runPipeline,
  SUPPORTED_VERSIONS,
  DEFAULT_VERSION,
};

