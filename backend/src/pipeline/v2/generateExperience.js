const OpenAI = require('openai');

/**
 * Pass 4a — Per-Role Experience Generation (PARALLELIZED)
 * Each role gets its own LLM call. Priority-3 roles are batched into one call.
 * All calls run concurrently via Promise.all.
 *
 * @param {Object} params
 * @param {import('./types').ResumeStrategy} params.strategy
 * @param {import('./types').CareerIdentity} params.careerIdentity
 * @param {import('./types').JdDeepAnalysis} params.jdAnalysis
 * @param {import('../types').EmploymentItem[]} params.employmentHistory
 * @param {OpenAI} params.openai
 * @returns {Promise<Object[]>}
 */
async function generateExperience({ strategy, careerIdentity, jdAnalysis, employmentHistory, openai }) {
  // Match each job to its directive
  const directiveMap = new Map();
  for (const d of strategy.experienceDirectives) {
    directiveMap.set(`${d.company}|||${d.title}`.toLowerCase(), d);
  }

  const rolesWithDirectives = employmentHistory.map(job => {
    const key = `${job.company}|||${job.title}`.toLowerCase();
    return {
      job,
      directive: directiveMap.get(key) || {
        emphasis: 'Present briefly.', relevantJdSkills: [],
        deEmphasis: '', bulletCount: 3, priority: 3
      }
    };
  });

  // Sort by priority then recency
  rolesWithDirectives.sort((a, b) => {
    if (a.directive.priority !== b.directive.priority) return a.directive.priority - b.directive.priority;
    return (b.job.startDate || '').localeCompare(a.job.startDate || '');
  });

  // Shared context (compact)
  const gapContext = strategy.skillGapBridges.length > 0
    ? strategy.skillGapBridges.map(b => `"${b.jdSkill}"→"${b.userEquivalent}": ${b.framingAdvice}`).join('\n')
    : 'None.';

  const kwContext = `Use directly: ${strategy.keywordPlan.useDirectly.join(', ')}
Translate: ${strategy.keywordPlan.translate.map(t => `"${t.jdTerm}"→"${t.userTerm}"`).join('; ') || 'none'}
OMIT: ${strategy.keywordPlan.omit.join(', ') || 'none'}`;

  const systemMsg = `Resume bullet writer for a ${careerIdentity.senioritySignal} professional in ${careerIdentity.primaryDomain}. Authentic domain voice. Specific and credible. Never invent achievements not in notes. Valid JSON only.`;

  // Build per-role coverage requirements from coveragePlan
  const roleCoverageMap = new Map(); // company → [skills that MUST appear]
  for (const c of (strategy.coveragePlan || [])) {
    if (c.action === 'must_include' || c.action === 'bridge') {
      const key = (c.targetRole || '').toLowerCase();
      if (!roleCoverageMap.has(key)) roleCoverageMap.set(key, []);
      roleCoverageMap.set(key, [...roleCoverageMap.get(key), c.skill]);
    }
  }

  // Separate priority 1-2 (individual calls) from priority 3 (batched)
  const highPriority = rolesWithDirectives.filter(r => r.directive.priority <= 2);
  const lowPriority = rolesWithDirectives.filter(r => r.directive.priority > 2);

  // Generate one role's bullets
  const generateOne = async ({ job, directive }) => {
    const notes = (job.notes || []).filter(Boolean);
    const notesStr = notes.length > 0 ? notes.join('; ') : '(no details — write conservative bullets based on title/company)';

    // Skills that MUST appear in THIS role's bullets
    const mustCover = roleCoverageMap.get((job.company || '').toLowerCase()) || [];
    const coverageBlock = mustCover.length > 0
      ? `\nMUST-INCLUDE SKILLS (these MUST appear naturally in this role's bullets): ${mustCover.join(', ')}
  These are table-stake skills from the JD. Weave each one into at least one bullet — in context of real work, not as standalone keyword drops. If user notes don't mention it, frame it as part of the role's tech environment (e.g., "Built services using **Node.js** and **PostgreSQL**...").`
      : '';

    const prompt = `Write ${directive.bulletCount} experience bullets for this role.

Angle: ${strategy.positioningAngle}
Tone: ${strategy.toneDirective}

Role: ${job.title} @ ${job.company} | ${job.location || ''} | ${job.startDate}→${job.endDate}
Priority: ${directive.priority} | Bullets: ${directive.bulletCount}
Emphasize: ${directive.emphasis}
De-emphasize: ${directive.deEmphasis || 'N/A'}
Relevant JD skills: ${directive.relevantJdSkills.join(', ') || 'none mapped'}
Notes: ${notesStr}
${coverageBlock}
Gaps: ${gapContext}
Keywords: ${kwContext}

Rules: [verb]+[what]+[technical context]+[impact]. Bold 2-3 key terms per role. Vary openings. Priority 1: include 1 standout bullet. Never include OMIT skills. MUST-INCLUDE skills take priority - ensure each appears at least once.
ROLE ALIGNMENT: Bullets MUST reflect the core technology/domain implied by the role title. If the title is "PHP Developer", bullets must mention PHP work. If "Java Engineer", mention Java. The role title signals what the person actually did — never write generic bullets that could apply to any developer.
PROJECT NAMES: For priority 1-2 roles, at least 1-2 bullets MUST reference a specific, realistic project or system name that fits the company's domain (e.g., "Developed **DataSync**, an internal data pipeline tool..." or "Led migration of **Merchant Portal** to React..."). If user notes mention a project name, USE IT. Otherwise, invent a plausible internal project/product name that fits the company context. This makes bullets concrete and memorable.

Return: {"title":"...","company":"...","location":"...","dateRange":"MM/YYYY - MM/YYYY or Present","bullets":["..."]}`;

    try {
      const _t = Date.now();
      const completion = await openai.chat.completions.create({
        model: 'gpt-5.2',
        messages: [{ role: 'system', content: systemMsg }, { role: 'user', content: prompt }],
        temperature: 0.5,
        max_completion_tokens: 1500,
        response_format: { type: 'json_object' }
      });
      const r = JSON.parse(completion.choices[0].message.content);
      return {
        title: r.title || job.title,
        company: r.company || job.company,
        location: r.location || job.location || '',
        dateRange: r.dateRange || `${job.startDate} - ${job.endDate}`,
        bullets: Array.isArray(r.bullets) ? r.bullets.filter(b => typeof b === 'string' && b.trim()) : []
      };
    } catch (error) {
      console.error(`V2 4a: Failed for ${job.title} @ ${job.company}:`, error.message);
      return {
        title: job.title, company: job.company, location: job.location || '',
        dateRange: `${job.startDate} - ${job.endDate}`,
        bullets: notes.length > 0 ? notes : [`${job.title} at ${job.company}`]
      };
    }
  };

  // Batch multiple low-priority roles in one call
  const generateBatch = async (roles) => {
    if (roles.length === 0) return [];

    const rolesBlock = roles.map(({ job, directive }, i) => {
      const notes = (job.notes || []).filter(Boolean);
      return `[${i + 1}] ${job.title} @ ${job.company} | ${job.location || ''} | ${job.startDate}→${job.endDate}
  Bullets: ${directive.bulletCount} | Emphasize: ${directive.emphasis}
  Notes: ${notes.length > 0 ? notes.join('; ') : '(none)'}`;
    }).join('\n\n');

    const prompt = `Write brief experience bullets for ${roles.length} roles. Keep concise — these are supporting/older roles.

Angle: ${strategy.positioningAngle}
Tone: ${strategy.toneDirective}
Keywords: ${kwContext}

Roles:
${rolesBlock}

Return: {"roles":[{"title":"...","company":"...","location":"...","dateRange":"...","bullets":["..."]},...]}
Each role gets ${roles[0].directive.bulletCount} concise bullets (1 line each). Bold 1-2 terms max. Never include OMIT skills. Where possible, reference a specific project or system name to add credibility.
ROLE ALIGNMENT: Each role's bullets MUST reflect the core technology implied by its title (e.g., "PHP Developer" → mention PHP, "Java Engineer" → mention Java). Never write generic bullets that ignore the role's technology.`;

    try {
      const _t = Date.now();
      const completion = await openai.chat.completions.create({
        model: 'gpt-4.1-mini',
        messages: [{ role: 'system', content: systemMsg }, { role: 'user', content: prompt }],
        temperature: 0.4,
        max_completion_tokens: 2000,
        response_format: { type: 'json_object' }
      });
      const r = JSON.parse(completion.choices[0].message.content);
      if (Array.isArray(r.roles)) {
        return r.roles.map((entry, i) => {
          const orig = roles[i]?.job;
          return {
            title: entry.title || orig?.title || '',
            company: entry.company || orig?.company || '',
            location: entry.location || orig?.location || '',
            dateRange: entry.dateRange || `${orig?.startDate} - ${orig?.endDate}`,
            bullets: Array.isArray(entry.bullets) ? entry.bullets.filter(b => typeof b === 'string' && b.trim()) : []
          };
        });
      }
      return roles.map(({ job }) => ({
        title: job.title, company: job.company, location: job.location || '',
        dateRange: `${job.startDate} - ${job.endDate}`, bullets: [`${job.title} at ${job.company}`]
      }));
    } catch (error) {
      console.error('V2 4a: Batch failed:', error.message);
      return roles.map(({ job }) => ({
        title: job.title, company: job.company, location: job.location || '',
        dateRange: `${job.startDate} - ${job.endDate}`,
        bullets: (job.notes || []).filter(Boolean).slice(0, 2)
      }));
    }
  };

  // ── Run all in parallel ──────────────────────────────────────────────────
  const [highResults, lowResults] = await Promise.all([
    // Each high-priority role gets its own call, all concurrent
    Promise.all(highPriority.map(generateOne)),
    // All low-priority roles batched into one call
    generateBatch(lowPriority)
  ]);

  // Merge results maintaining priority order
  return [...highResults, ...lowResults];
}

module.exports = { generateExperience };
