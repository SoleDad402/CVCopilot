const OpenAI = require('openai');

/**
 * Pass 4b — Skills Section Generation (NO experience dependency → parallel with 4a)
 * Organizes skills by user's actual domains, not JD categories.
 *
 * @param {Object} params
 * @param {import('./types').CareerIdentity} params.careerIdentity
 * @param {import('./types').JdDeepAnalysis} params.jdAnalysis
 * @param {import('./types').ResumeStrategy} params.strategy
 * @param {OpenAI} params.openai
 * @returns {Promise<Object[]>} Array of { section, list }
 */
async function generateSkills({ careerIdentity, jdAnalysis, strategy, openai }) {
  // Build must-include skill list from coveragePlan
  const mustIncludeSkills = (strategy.coveragePlan || [])
    .filter(c => c.action === 'must_include' || c.action === 'bridge')
    .map(c => c.skill);

  const mustIncludeBlock = mustIncludeSkills.length > 0
    ? `\nMUST-INCLUDE SKILLS (these MUST appear in the skills section — non-negotiable for ATS):
${mustIncludeSkills.join(', ')}
Place each in the most relevant section. These are table-stake skills from the JD — the resume WILL be rejected by ATS if they're missing from the skills section.`
    : '';

  const prompt = `Create a skills section organized by the CANDIDATE's domains, not the JD's.

Candidate core stack: ${careerIdentity.technicalIdentity.core.join(', ') || 'N/A'}
Candidate familiar: ${careerIdentity.technicalIdentity.familiar.join(', ') || 'N/A'}
Candidate domain: ${careerIdentity.primaryDomain}
Candidate strengths: ${careerIdentity.signatureStrengths.join(', ')}

JD table stakes: ${jdAnalysis.tableStakes.join(', ')}
JD differentiators: ${jdAnalysis.differentiators.join(', ')}
${mustIncludeBlock}
Keyword plan:
  Use directly: ${strategy.keywordPlan.useDirectly.join(', ')}
  Translate: ${strategy.keywordPlan.translate.map(t => `"${t.jdTerm}"→"${t.userTerm}"`).join('; ') || 'none'}
  OMIT (must NOT appear): ${strategy.keywordPlan.omit.join(', ') || 'none'}

Return JSON:
{"skills":[{"section":"Domain Name","list":["Skill1","**BoldSkill**","Skill3"]},...]  }

Rules:
- 3-5 sections by candidate's DOMAIN (e.g. "Backend & Infrastructure", "Data & ML"), not JD categories
- MUST-INCLUDE skills take TOP PRIORITY — every single one must appear in at least one section
- Lead each section with JD-relevant skills, but include real skills beyond JD (shows breadth = authenticity)
- Include all skills from candidate's core + familiar tech that are relevant
- OMIT list skills must NOT appear.
- "translate" items: use user's term primary; can add JD term in parens for ATS
- Bold 2-4 skills at intersection of core stack + JD table stakes
- Clean names only: "PostgreSQL" not "PostgreSQL (required)". 15-35 total skills.`;

  try {
    const _t = Date.now();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: 'Organize technical skills authentically. Valid JSON only.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_completion_tokens: 1000,
      response_format: { type: 'json_object' }
    });

    const r = JSON.parse(completion.choices[0].message.content);
    if (Array.isArray(r.skills)) {
      return r.skills
        .map(s => ({
          section: s.section || 'Technical Skills',
          list: Array.isArray(s.list) ? s.list.filter(item => typeof item === 'string' && item.trim()) : []
        }))
        .filter(s => s.list.length > 0);
    }
    return [{ section: 'Technical Skills', list: careerIdentity.technicalIdentity.core }];
  } catch (error) {
    console.error('V2 Pass 4b (generateSkills) failed:', error);
    return [{
      section: 'Technical Skills',
      list: [...careerIdentity.technicalIdentity.core, ...careerIdentity.technicalIdentity.familiar].filter(Boolean)
    }];
  }
}

module.exports = { generateSkills };
