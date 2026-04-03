const { analyzeProfile } = require('./analyzeProfile');
const { analyzeJdDeep } = require('./analyzeJdDeep');
const { buildStrategy } = require('./buildStrategy');
const { generateExperience } = require('./generateExperience');
const { generateSkills } = require('./generateSkills');
const { generateSummary } = require('./generateSummary');
const { generateAchievements } = require('./generateAchievements');


/**
 * V2 Resume Generation Pipeline — Multi-Pass Architecture (Performance-Optimized)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Execution graph (→ = sequential, ║ = parallel):
 *
 *   Pass 1 ║ Pass 2          (parallel — independent)
 *         ↘ ↙
 *        Pass 3              (needs 1+2)
 *         ↓
 *   Pass 4a ║ Pass 4b ║ 4x   (parallel — experience, skills, achievements)
 *         ↘ ↙
 *        Pass 4c              (summary — needs 4a+4b)
 *
 * Total sequential LLM roundtrips: 3
 * Pass 4a internally parallelizes all priority 1-2 roles + batches priority 3
 * Coverage enforced deterministically (no LLM review needed)
 *
 * @param {Object} params
 * @returns {Promise<import('../types').ResumePlan>}
 */
async function createTailoredResumeV2({
  jobDescription,
  employmentHistory,
  voiceSamples,
  options,
  userName,
  userContact,
  education,
  openai,
  bulletCount = 5,
  returnMarkdown = false,
  onProgress
}) {
  const report = (progress, stepLabel) => {
    if (onProgress) onProgress({ progress, stepLabel });
  };
  const t0 = Date.now();
  const elapsed = () => Date.now() - t0;
  const time = (label) => console.log(`[V2] ${label} (+${elapsed()}ms)`);
  const lap = (label, startMs) => {
    const dur = Date.now() - startMs;
    console.log(`[V2]   ⏱ ${label}: ${dur}ms`);
    return dur;
  };

  console.log('\n[V2] ════════════════════════════════════════════════════════════');
  console.log('[V2] Pipeline starting...');

  // ── Pass 1 + 2 (parallel) ─────────────────────────────────────────────────
  report(5, 'Analyzing your profile and the job description…');
  let t1 = Date.now();
  const [careerIdentity, jdAnalysis] = await Promise.all([
    analyzeProfile({ employmentHistory, education, userName, openai }),
    analyzeJdDeep(jobDescription, openai)
  ]);
  lap('Pass 1+2 (profile ║ JD)', t1);
  console.log('[V2]   Pass 1 output:', JSON.stringify({
    domain: careerIdentity.primaryDomain,
    seniority: careerIdentity.senioritySignal,
    coreTech: careerIdentity.technicalIdentity.core,
    strengths: careerIdentity.signatureStrengths
  }));
  console.log('[V2]   Pass 2 output:', JSON.stringify({
    role: jdAnalysis.roleTitle,
    seniority: jdAnalysis.seniority,
    tableStakes: jdAnalysis.tableStakes,
    differentiators: jdAnalysis.differentiators
  }));

  // ── Pass 3: Strategy ──────────────────────────────────────────────────────
  report(20, 'Building your positioning strategy…');
  t1 = Date.now();
  const strategy = await buildStrategy({ careerIdentity, jdAnalysis, employmentHistory, openai, bulletCount });
  lap('Pass 3 (strategy)', t1);
  console.log('[V2]   Pass 3 output:', JSON.stringify({
    angle: strategy.positioningAngle,
    directives: strategy.experienceDirectives.map(d => `${d.company} P${d.priority}×${d.bulletCount}`),
    coveragePlan: (strategy.coveragePlan || []).map(c => `${c.skill}:${c.action}`),
    omit: strategy.keywordPlan.omit,
    gaps: strategy.skillGapBridges.map(b => `${b.jdSkill}→${b.userEquivalent}`)
  }));

  // ── Post-2: Normalize skill names (strip sentence prefixes) ──────────────
  normalizeSkillNames(jdAnalysis);

  // ── Post-3: Deterministic coverage plan validation ───────────────────────
  ensureCoveragePlan(strategy, jdAnalysis, employmentHistory);
  // Normalize coveragePlan skill names too
  for (const entry of strategy.coveragePlan) {
    entry.skill = normalizeSkillName(entry.skill);
  }
  console.log(`[V2]   CoveragePlan final: ${strategy.coveragePlan.length} entries (${strategy.coveragePlan.filter(c => c.action === 'must_include').length} must_include, ${strategy.coveragePlan.filter(c => c.action === 'bridge').length} bridge, ${strategy.coveragePlan.filter(c => c.action === 'omit_rare').length} omit_rare)`);

  // ── Pass 4a + 4b (parallel) ────────────────────────────────────────────────
  report(40, 'Crafting your experience and skills…');
  t1 = Date.now();
  const [generatedExperience, generatedSkills, achievements] = await Promise.all([
    generateExperience({ strategy, careerIdentity, jdAnalysis, employmentHistory, openai }),
    generateSkills({ careerIdentity, jdAnalysis, strategy, openai }),
    generateAchievements({ strategy, careerIdentity, jdAnalysis, employmentHistory, openai })
  ]);
  const totalBullets = generatedExperience.reduce((sum, e) => sum + e.bullets.length, 0);
  lap('Pass 4a+4b+4x (experience ║ skills ║ achievements)', t1);
  console.log(`[V2]   Pass 4x output: ${achievements.length} achievements`);
  console.log('[V2]   Pass 4a output:', JSON.stringify(
    generatedExperience.map(e => ({ role: `${e.title}@${e.company}`, bullets: e.bullets.length, sample: (e.bullets[0] || '').substring(0, 80) }))
  ));
  console.log('[V2]   Pass 4b output:', JSON.stringify(
    generatedSkills.map(s => ({ section: s.section, count: s.list.length, skills: s.list.slice(0, 5) }))
  ));

  // ── Post-4b: Deterministic skills coverage guard ─────────────────────────
  const verifiedSkills = ensureSkillsCoverage(generatedSkills, strategy);
  const totalSkills = verifiedSkills.reduce((sum, s) => sum + s.list.length, 0);
  time(`4a+4b complete — ${generatedExperience.length} roles, ${totalBullets} bullets, ${totalSkills} skills`);

  // ── Pass 4c (summary) ────────────────────────────────────────────────────
  report(75, 'Writing your professional summary…');
  t1 = Date.now();
  const summary = await generateSummary({
    strategy, careerIdentity, jdAnalysis,
    generatedExperience, generatedSkills: verifiedSkills, userName, openai
  });
  lap('Pass 4c (summary)', t1);
  console.log('[V2]   Pass 4c output (summary):', summary.substring(0, 120) + '...');

  // ── Assemble pre-review plan ───────────────────────────────────────────────
  const formattedEducation = (options?.includeEducation !== false && education)
    ? education.map(edu => ({
        school: edu.school_name || edu.school || '',
        location: edu.location || '',
        degree: edu.degree
          ? `${edu.degree}${edu.field_of_study ? ' in ' + edu.field_of_study : ''}`
          : edu.field_of_study || '',
        dateRange: `${edu.start_date || ''} - ${edu.end_date || ''}`
      }))
    : undefined;

  const preReviewPlan = {
    header: {
      name: userName,
      titleLine: `${jdAnalysis.roleTitle}${careerIdentity.signatureStrengths.length > 0
        ? ' | ' + careerIdentity.signatureStrengths.slice(0, 2).join(' & ')
        : ''}`
    },
    summary,
    achievements,
    skills: verifiedSkills,
    experience: generatedExperience,
    education: formattedEducation
  };

  // ── Final: Deterministic coverage enforcement ─────────────────────────────
  const finalPlan = enforcePostReviewCoverage(preReviewPlan, strategy, jdAnalysis);

  // ── Pipeline summary ─────────────────────────────────────────────────────
  const totalTime = elapsed();
  console.log('[V2] ════════════════════════════════════════════════════════════');
  console.log(`[V2] Pipeline complete in ${totalTime}ms (${(totalTime / 1000).toFixed(1)}s)`);
  console.log(`[V2] Final: ${finalPlan.experience?.length || 0} roles, ${(finalPlan.experience || []).reduce((s, e) => s + (e.bullets?.length || 0), 0)} bullets, ${(finalPlan.skills || []).reduce((s, sec) => s + (sec.list?.length || 0), 0)} skills`);
  console.log('[V2] ════════════════════════════════════════════════════════════\n');

  return finalPlan;
}

/**
 * Strips sentence prefixes from skill names that the LLM sometimes generates.
 * "Experience with Swift and SwiftUI" → "Swift and SwiftUI"
 * "3-5 years of app development" → "app development"
 * "Proficiency in Python" → "Python"
 */
function normalizeSkillName(skill) {
  if (!skill || typeof skill !== 'string') return skill;
  let s = skill.trim();

  // Strip common sentence prefixes
  const prefixes = [
    /^(?:extensive\s+)?experience\s+(?:with|using|in|building|developing)\s+/i,
    /^(?:proficiency|proficient)\s+(?:in|with)\s+/i,
    /^\d+[-+]?\s*(?:years?\s+of\s+)?(?:experience\s+(?:in|with)\s+)?/i,
    /^(?:ability|able)\s+to\s+/i,
    /^(?:passion|passionate)\s+(?:for|about)\s+/i,
    /^(?:excellent|strong|good)\s+/i,
    /^(?:knowledge|understanding)\s+(?:of|in)\s+/i,
    /^track\s+record\s+of\s+/i,
    /^familiarity\s+with\s+/i,
  ];
  for (const re of prefixes) {
    s = s.replace(re, '');
  }

  // If still too long (>50 chars), likely a sentence — skip it
  return s.trim();
}

/**
 * Normalizes all skill names in JD analysis arrays.
 * Also filters out entries that are still sentence-length after normalization.
 */
function normalizeSkillNames(jdAnalysis) {
  const normalize = (arr) => arr
    .map(normalizeSkillName)
    .filter(s => s && s.length <= 50); // Drop sentence-length entries

  jdAnalysis.tableStakes = normalize(jdAnalysis.tableStakes);
  jdAnalysis.differentiators = normalize(jdAnalysis.differentiators);
}

/**
 * Deterministic guard: ensures every tableStake and differentiator from Pass 2
 * exists in the coveragePlan. Auto-adds missing ones as must_include.
 * Mutates strategy.coveragePlan in place.
 */
function ensureCoveragePlan(strategy, jdAnalysis, employmentHistory) {
  if (!strategy.coveragePlan) strategy.coveragePlan = [];

  const covered = new Set(
    strategy.coveragePlan.map(c => c.skill.toLowerCase().trim())
  );

  // Default target: most recent / first employment entry
  const defaultTarget = employmentHistory[0]?.company || '';

  const allJdSkills = [
    ...jdAnalysis.tableStakes.map(s => ({ skill: s, source: 'tableStake' })),
    ...jdAnalysis.differentiators.map(s => ({ skill: s, source: 'differentiator' }))
  ];

  let added = 0;
  for (const { skill, source } of allJdSkills) {
    const key = skill.toLowerCase().trim();
    if (!key || covered.has(key)) continue;

    // Check if any existing entry is a substring match (e.g. "React" vs "React.js")
    let found = false;
    for (const existing of covered) {
      if (existing.includes(key) || key.includes(existing)) { found = true; break; }
    }
    if (found) continue;

    strategy.coveragePlan.push({
      skill,
      source,
      action: 'must_include',
      targetRole: defaultTarget,
      reason: 'Auto-added: not in LLM-generated coveragePlan'
    });
    covered.add(key);
    added++;
  }

  if (added > 0) {
    console.log(`[V2] Coverage guard: auto-added ${added} missing skills to coveragePlan`);
  }

  // Reclassify any differentiator/preferred skill marked as omit_rare → must_include
  // Preferred skills signal what hiring managers value most — never omit them
  const diffSkills = new Set(jdAnalysis.differentiators.map(s => s.toLowerCase().trim()));
  let reclassified = 0;
  for (const entry of strategy.coveragePlan) {
    if (entry.action === 'omit_rare' && diffSkills.has(entry.skill.toLowerCase().trim())) {
      entry.action = 'must_include';
      entry.reason = (entry.reason || '') + ' (reclassified: preferred skills must be included)';
      reclassified++;
    }
  }
  if (reclassified > 0) {
    console.log(`[V2] Coverage guard: reclassified ${reclassified} preferred skills from omit_rare → must_include`);
  }

  // Also ensure keywordPlan.omit only contains omit_rare skills
  const omitRareSkills = new Set(
    strategy.coveragePlan
      .filter(c => c.action === 'omit_rare')
      .map(c => c.skill.toLowerCase().trim())
  );
  strategy.keywordPlan.omit = strategy.keywordPlan.omit.filter(
    s => omitRareSkills.has(s.toLowerCase().trim())
  );
}

/**
 * Deterministic guard: ensures all must_include/bridge skills from coveragePlan
 * appear somewhere in the skills section. Injects missing ones into the first section.
 */
function ensureSkillsCoverage(generatedSkills, strategy) {
  const requiredSkills = (strategy.coveragePlan || [])
    .filter(c => c.action === 'must_include' || c.action === 'bridge')
    .map(c => c.skill)
    .filter(s => s && s.length <= 50); // Skip sentence-length entries

  if (requiredSkills.length === 0) return generatedSkills;

  // Collect all skills text for scanning
  const allSkillsText = generatedSkills
    .flatMap(s => s.list)
    .join(' ')
    .toLowerCase();

  const missing = requiredSkills.filter(skill => {
    if (!skill) return false;
    const needle = skill.toLowerCase().trim();
    const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return !new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i').test(allSkillsText);
  });

  if (missing.length === 0) return generatedSkills;

  console.log(`[V2] Skills guard: injecting ${missing.length} missing required skills: ${missing.join(', ')}`);

  // Add missing skills to first section, or create a new section
  const result = [...generatedSkills];
  if (result.length > 0) {
    result[0] = {
      ...result[0],
      list: [...result[0].list, ...missing]
    };
  } else {
    result.push({ section: 'Technical Skills', list: missing });
  }

  return result;
}

/**
 * Final deterministic guard after Pass 5.
 * Re-checks skills section for missing must_include skills stripped by the reviewer.
 * This is the absolute last line of defense — runs on the final output.
 */
function enforcePostReviewCoverage(plan, strategy, jdAnalysis) {
  const requiredSkills = (strategy.coveragePlan || [])
    .filter(c => c.action === 'must_include' || c.action === 'bridge')
    .map(c => c.skill)
    .filter(s => s && s.length <= 50);

  // Also include raw tableStakes as final fallback
  const alreadyRequired = new Set(requiredSkills.map(s => s.toLowerCase().trim()));
  for (const skill of (jdAnalysis.tableStakes || [])) {
    const key = skill.toLowerCase().trim();
    if (!alreadyRequired.has(key)) {
      requiredSkills.push(skill);
      alreadyRequired.add(key);
    }
  }

  if (requiredSkills.length === 0) return plan;

  // Check skills section
  const allSkillsText = (plan.skills || [])
    .flatMap(s => s.list || [])
    .join(' ')
    .toLowerCase();

  const missingFromSkills = requiredSkills.filter(skill => {
    if (!skill) return false;
    const needle = skill.toLowerCase().trim();
    const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return !new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i').test(allSkillsText);
  });

  if (missingFromSkills.length > 0) {
    console.log(`[V2] Final guard: re-injecting ${missingFromSkills.length} skills stripped by reviewer: ${missingFromSkills.join(', ')}`);

    const skills = [...(plan.skills || [])];
    if (skills.length > 0) {
      skills[0] = { ...skills[0], list: [...skills[0].list, ...missingFromSkills] };
    } else {
      skills.push({ section: 'Technical Skills', list: missingFromSkills });
    }

    return { ...plan, skills };
  }

  return plan;
}

module.exports = { createTailoredResumeV2 };
