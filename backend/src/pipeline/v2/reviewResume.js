const OpenAI = require('openai');

/**
 * Pass 5 — Authenticity Review
 * Reviews for over-tailoring, fabrication, monotony, voice inconsistency.
 * Returns a revised ResumePlan.
 *
 * @param {Object} params
 * @param {Object} params.resumePlan
 * @param {import('./types').CareerIdentity} params.careerIdentity
 * @param {import('./types').JdDeepAnalysis} params.jdAnalysis
 * @param {import('./types').ResumeStrategy} params.strategy
 * @param {import('../types').EmploymentItem[]} params.employmentHistory
 * @param {OpenAI} params.openai
 * @returns {Promise<Object>}
 */
async function reviewResume({ resumePlan, careerIdentity, jdAnalysis, strategy, employmentHistory, openai }) {
  const resumeText = formatResume(resumePlan);

  const originalHistory = employmentHistory.map(job => {
    const notes = (job.notes || []).filter(Boolean);
    return `${job.title} @ ${job.company} (${job.startDate}→${job.endDate})${notes.length ? ': ' + notes.join('; ') : ''}`;
  }).join('\n');

  // Build protected skills list — these must survive the review
  const protectedSkills = (strategy.coveragePlan || [])
    .filter(c => c.action === 'must_include' || c.action === 'bridge')
    .map(c => c.skill);

  const protectedBlock = protectedSkills.length > 0
    ? `\n═══ PROTECTED SKILLS (DO NOT REMOVE) ═══
These skills are required by the JD and have been deliberately placed. Do NOT remove, reduce, or flag them as over-tailored or fabricated:
${protectedSkills.join(', ')}
You may REPHRASE how they appear (better wording), but the skill name itself MUST remain in the final output. Removing a protected skill = ATS rejection.`
    : '';

  const prompt = `Review this resume for authenticity and quality, then return a REVISED version with issues fixed.

═══ RESUME ═══
${resumeText}

═══ GROUND TRUTH (candidate's actual history) ═══
${originalHistory}

═══ CONTEXT ═══
Domain: ${careerIdentity.primaryDomain} | Seniority: ${careerIdentity.senioritySignal}
Core tech: ${careerIdentity.technicalIdentity.core.join(', ')}
Target: ${jdAnalysis.roleTitle} | Table stakes: ${jdAnalysis.tableStakes.join(', ')}
Positioning: ${strategy.positioningAngle}
OMIT skills: ${strategy.keywordPlan.omit.join(', ') || 'none'}
${protectedBlock}

═══ CHECKS ═══
1. OVER-TAILORING: >70% table stakes in ONE SINGLE role → redistribute across roles. Same keyword 4+ times → reduce to 2-3. But do NOT remove table-stake skills entirely — redistribute them.
2. FABRICATION: Compare bullets to original notes. Flag INFLATED claims (fake metrics, invented projects). But technology mentions are NOT fabrication — listing a common skill (React, Docker, SQL) is expected even without explicit notes.
3. MONOTONY: >30% bullets start with same verb → vary. Repetitive structure → diversify.
4. VOICE: Domain language should match "${careerIdentity.primaryDomain}", not JD's domain.
5. WEAK BULLETS: Vague or outcome-free → rewrite to be specific. If unsupported, make concise.
6. SKILL PRESERVATION: Every PROTECTED skill must appear in at least one experience bullet AND in the skills section. If you rewrite a bullet, keep the protected skill in it.

Return JSON:
{
  "overallScore": 8,
  "flags": [{"type": "over_tailored|fabricated|monotonous|weak_bullet|inconsistent_voice", "location": "section > item", "issue": "...", "action": "fixed|removed|rewritten"}],
  "revisedResume": {
    "summary": "...",
    "achievements": ["...", "..."],
    "experience": [{"title":"...","company":"...","location":"...","dateRange":"...","bullets":["..."]}],
    "skills": [{"section":"...","list":["..."]}]
  }
}

IMPORTANT: revisedResume must include ALL sections and ALL roles, even unchanged ones. Minimum changes — only fix flagged issues. Preserve **bold** markdown. NEVER drop protected skills. Achievements section must be preserved — only improve wording, never remove entries.`;

  try {
    const _t = Date.now();
    const completion = await openai.chat.completions.create({
      model: 'gpt-5.2',
      messages: [
        { role: 'system', content: 'Resume quality reviewer. Catch inauthenticity and weak writing. Minimal changes. Preserve protected skills. Valid JSON only.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_completion_tokens: 4000,
      response_format: { type: 'json_object' }
    });

    const r = JSON.parse(completion.choices[0].message.content);
    const revised = r.revisedResume;

    if (!revised || !Array.isArray(revised.experience) || revised.experience.length === 0) {
      console.warn('V2 Pass 5: Invalid revised resume, using original');
      return { plan: resumePlan, score: r.overallScore || 0, flags: r.flags || [] };
    }

    return {
      plan: {
        header: resumePlan.header,
        summary: revised.summary || resumePlan.summary,
        achievements: Array.isArray(revised.achievements) && revised.achievements.length > 0
          ? revised.achievements.filter(a => typeof a === 'string' && a.trim())
          : resumePlan.achievements || [],
        skills: Array.isArray(revised.skills) ? revised.skills : resumePlan.skills,
        experience: revised.experience.map(exp => ({
          title: exp.title || '', company: exp.company || '',
          location: exp.location || '', dateRange: exp.dateRange || '',
          bullets: Array.isArray(exp.bullets) ? exp.bullets.filter(b => typeof b === 'string' && b.trim()) : []
        })),
        education: resumePlan.education
      },
      score: r.overallScore || 0,
      flags: Array.isArray(r.flags) ? r.flags : []
    };
  } catch (error) {
    console.error('V2 Pass 5 (reviewResume) failed:', error);
    return { plan: resumePlan, score: 0, flags: [] };
  }
}

function formatResume(plan) {
  const lines = [`SUMMARY:\n${plan.summary}\n`];
  if (plan.achievements?.length) {
    lines.push('KEY ACHIEVEMENTS:');
    for (const a of plan.achievements) lines.push(`  • ${a}`);
    lines.push('');
  }
  lines.push('SKILLS:');
  for (const s of (plan.skills || [])) lines.push(`  ${s.section}: ${(s.list || []).join(', ')}`);
  lines.push('\nEXPERIENCE:');
  for (const exp of (plan.experience || [])) {
    lines.push(`  ${exp.title} @ ${exp.company} | ${exp.location} | ${exp.dateRange}`);
    for (const b of (exp.bullets || [])) lines.push(`    • ${b}`);
    lines.push('');
  }
  if (plan.education?.length) {
    lines.push('EDUCATION:');
    for (const edu of plan.education) lines.push(`  ${edu.degree || ''} — ${edu.school} (${edu.dateRange})`);
  }
  return lines.join('\n');
}

module.exports = { reviewResume };
