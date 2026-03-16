const OpenAI = require('openai');

/**
 * Pass 4d — Coverage Verification & Patch
 * ─────────────────────────────────────────────────────────────────────────────
 * Scans generated experience bullets for missing must-include skills.
 * If any are missing, makes a targeted LLM call to weave them into the
 * most relevant role's bullets — without rewriting everything.
 *
 * @param {Object} params
 * @param {Object[]} params.generatedExperience - Output from Pass 4a
 * @param {import('./types').ResumeStrategy} params.strategy
 * @param {import('./types').CareerIdentity} params.careerIdentity
 * @param {import('./types').JdDeepAnalysis} [params.jdAnalysis] - Raw JD analysis for fallback
 * @param {OpenAI} params.openai
 * @returns {Promise<Object[]>} Patched experience entries
 */
async function verifyCoverage({ generatedExperience, strategy, careerIdentity, jdAnalysis, openai }) {
  const coveragePlan = strategy.coveragePlan || [];

  // Collect all must_include and bridge skills from coveragePlan
  const requiredSkills = coveragePlan
    .filter(c => c.action === 'must_include' || c.action === 'bridge')
    .map(c => c.skill);

  // Fallback: also check raw tableStakes AND differentiators from JD analysis
  // Catches skills the LLM missed entirely in coveragePlan
  if (jdAnalysis) {
    const alreadyRequired = new Set(requiredSkills.map(s => s.toLowerCase().trim()));
    const omitted = new Set(
      coveragePlan.filter(c => c.action === 'omit_rare').map(c => c.skill.toLowerCase().trim())
    );
    const allJdSkills = [
      ...(jdAnalysis.tableStakes || []),
      ...(jdAnalysis.differentiators || [])
    ];
    for (const skill of allJdSkills) {
      const key = skill.toLowerCase().trim();
      if (!alreadyRequired.has(key) && !omitted.has(key)) {
        requiredSkills.push(skill);
        alreadyRequired.add(key);
      }
    }
  }

  if (requiredSkills.length === 0) return generatedExperience;

  // Build text of all bullets for scanning
  const allBulletsText = generatedExperience
    .flatMap(exp => exp.bullets || [])
    .join(' ')
    .toLowerCase();

  // Find missing skills (case-insensitive boundary match)
  const missing = requiredSkills.filter(skill => {
    if (!skill) return false;
    const needle = skill.toLowerCase().trim();
    // Try exact match first
    const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i');
    if (re.test(allBulletsText)) return false;

    // For multi-word skills, check if individual words appear (e.g., "Spring Boot" → "Spring" and "Boot")
    const words = needle.split(/\s+/);
    if (words.length > 1) {
      const allPresent = words.every(w => {
        const wEsc = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(`(^|[^a-z0-9])${wEsc}([^a-z0-9]|$)`, 'i').test(allBulletsText);
      });
      if (allPresent) return false;
    }

    return true; // Skill is genuinely missing
  });

  if (missing.length === 0) {
    console.log(`[V2] Coverage check: all ${requiredSkills.length} required skills present.`);
    return generatedExperience;
  }

  console.log(`[V2] Coverage check: ${missing.length} skills missing: ${missing.join(', ')}`);

  // Determine which roles to patch (priority 1 first, then 2)
  // Map each missing skill to its target role from coveragePlan, or fallback to first priority-1 role
  const skillTargets = new Map(); // roleIndex → [missing skills to add]
  for (const skill of missing) {
    const plan = coveragePlan.find(c => c.skill === skill);
    const targetCompany = (plan?.targetRole || '').toLowerCase();

    // Find the role index
    let targetIdx = generatedExperience.findIndex(
      exp => (exp.company || '').toLowerCase() === targetCompany
    );
    if (targetIdx === -1) targetIdx = 0; // Fallback to most prominent role

    if (!skillTargets.has(targetIdx)) skillTargets.set(targetIdx, []);
    skillTargets.get(targetIdx).push(skill);
  }

  // Patch each affected role in parallel
  const patchPromises = [];
  const patchedExperience = [...generatedExperience];

  for (const [roleIdx, skillsToAdd] of skillTargets) {
    const exp = generatedExperience[roleIdx];
    if (!exp) continue;

    patchPromises.push(
      patchRole(exp, skillsToAdd, strategy, careerIdentity, openai)
        .then(patched => { patchedExperience[roleIdx] = patched; })
    );
  }

  await Promise.all(patchPromises);

  // Verify improvement
  const patchedText = patchedExperience.flatMap(e => e.bullets || []).join(' ').toLowerCase();
  const stillMissing = missing.filter(skill => {
    const escaped = skill.toLowerCase().trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return !new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i').test(patchedText);
  });

  if (stillMissing.length > 0) {
    console.log(`[V2] Coverage patch: ${stillMissing.length} still missing after patch: ${stillMissing.join(', ')}`);
  } else {
    console.log(`[V2] Coverage patch: all ${missing.length} missing skills successfully added.`);
  }

  return patchedExperience;
}

/**
 * Patches a single role's bullets to include missing skills.
 * Rewrites only the bullets that need changes, keeps the rest.
 */
async function patchRole(experience, skillsToAdd, strategy, careerIdentity, openai) {
  const prompt = `These experience bullets are MISSING required JD skills. Revise MINIMALLY to weave them in.

Role: ${experience.title} @ ${experience.company}
Current bullets:
${experience.bullets.map((b, i) => `  [${i + 1}] ${b}`).join('\n')}

MISSING SKILLS TO ADD (each must appear in at least one bullet):
${skillsToAdd.join(', ')}

Rules:
- Weave each missing skill naturally into an existing bullet's technical context. Don't create new bullets.
- Frame as part of the role's work: "Built APIs using **Node.js** and **PostgreSQL**" — not standalone keyword drops.
- Keep the original achievement/impact of each bullet intact. Only add the technology reference.
- If a skill fits better as a tool/method used in the work, add it there. Example: adding "Docker" → "...deployed via **Docker** containers to production..."
- Preserve all existing **bold** formatting. Bold the newly added skills too.
- Change as FEW bullets as possible. If you can fit 3 missing skills into 2 bullet edits, do that.
- Maintain ${careerIdentity.primaryDomain} domain voice.

Return JSON:
{"bullets": ["all bullets, revised ones + unchanged ones in same order"]}`;

  try {
    const _t = Date.now();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'system',
          content: 'Surgical resume editor. Add missing skills to bullets minimally. Valid JSON only.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_completion_tokens: 1500,
      response_format: { type: 'json_object' }
    });
    console.log(`[V2]     Pass 4d patch "${experience.company}": ${Date.now() - _t}ms | tokens: ${JSON.stringify(completion.usage)}`);

    const r = JSON.parse(completion.choices[0].message.content);
    if (Array.isArray(r.bullets) && r.bullets.length > 0) {
      return {
        ...experience,
        bullets: r.bullets.filter(b => typeof b === 'string' && b.trim())
      };
    }
    return experience;
  } catch (error) {
    console.error(`[V2] Coverage patch failed for ${experience.company}:`, error.message);
    return experience;
  }
}

module.exports = { verifyCoverage };
