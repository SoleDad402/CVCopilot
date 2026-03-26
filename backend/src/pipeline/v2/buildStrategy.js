const OpenAI = require('openai');

/**
 * Pass 3 — Strategic Alignment (the brain of V2)
 * Takes career identity + JD analysis → positioning strategy.
 *
 * @param {Object} params
 * @param {import('./types').CareerIdentity} params.careerIdentity
 * @param {import('./types').JdDeepAnalysis} params.jdAnalysis
 * @param {import('../types').EmploymentItem[]} params.employmentHistory
 * @param {OpenAI} params.openai
 * @param {number} [params.bulletCount=5]
 * @returns {Promise<import('./types').ResumeStrategy>}
 */
async function buildStrategy({ careerIdentity, jdAnalysis, employmentHistory, openai, bulletCount = 5 }) {
  const employmentSummary = employmentHistory.map((job, i) => {
    const notes = (job.notes || []).filter(Boolean);
    return `[${i + 1}] ${job.title} @ ${job.company} (${job.startDate}→${job.endDate}) ${notes.length ? '| ' + notes.slice(0, 4).join('; ') : ''}`;
  }).join('\n');

  const prompt = `Create a resume positioning strategy given candidate identity and target role.

═══ CANDIDATE ═══
Trajectory: ${careerIdentity.careerTrajectory}
Domain: ${careerIdentity.primaryDomain} (secondary: ${careerIdentity.secondaryDomains.join(', ') || 'none'})
Strengths: ${careerIdentity.signatureStrengths.join(', ') || 'none'}
Core tech: ${careerIdentity.technicalIdentity.core.join(', ') || 'N/A'}
Familiar: ${careerIdentity.technicalIdentity.familiar.join(', ') || 'N/A'}
Seniority: ${careerIdentity.senioritySignal}
Narrative: ${careerIdentity.careerNarrative}

═══ TARGET ROLE ═══
${jdAnalysis.roleTitle} (${jdAnalysis.seniority})
Table stakes: ${jdAnalysis.tableStakes.join(', ')}
Differentiators: ${jdAnalysis.differentiators.join(', ')}
Implicit needs: ${jdAnalysis.implicitNeeds.join('; ')}
HM mental model: ${jdAnalysis.hiringManagerMentalModel}
Culture: ${jdAnalysis.culturalSignals.join(', ')}

═══ EMPLOYMENT ═══
${employmentSummary}

Return JSON:
{
  "positioningAngle": "1 sentence framing this candidate for this role. Must be true to who they are. User's INDUSTRY stays; ACHIEVEMENT FRAMING tilts toward JD.",
  "narrativeThread": "2-3 sentences: why this person for this role. The 'why now' argument.",
  "experienceDirectives": [
    {
      "company": "exact name",
      "title": "exact title",
      "emphasis": "what to spotlight — specific achievements/themes to lead with",
      "relevantJdSkills": ["JD skills mapping to this role"],
      "deEmphasis": "what to minimize or omit",
      "bulletCount": ${bulletCount},
      "priority": 1
    }
  ],
  "skillGapBridges": [
    {
      "jdSkill": "skill user lacks",
      "userEquivalent": "closest real equivalent",
      "framingAdvice": "how to present honestly"
    }
  ],
  "coveragePlan": [
    {
      "skill": "SHORT skill name (1-3 words max, e.g. 'React', 'CI/CD', 'Swift')",
      "source": "tableStake or differentiator",
      "action": "must_include | bridge | omit_rare",
      "targetRole": "company name",
      "reason": "3-5 words why"
    }
  ],
  "toneDirective": "specific writing tone combining JD culture + user domain voice",
  "keywordPlan": {
    "useDirectly": ["JD terms user actually has"],
    "translate": [{"jdTerm": "JD name", "userTerm": "user's name for it"}],
    "omit": ["only rare/niche JD terms that would look forced — NOT common table stakes"]
  }
}

Rules:
- experienceDirectives: one per role. The user requested ${bulletCount} bullets per role as the default bulletCount. priority 1=spotlight (${bulletCount}+2 bullets), 2=supporting (${bulletCount} bullets), 3=brief (${Math.max(bulletCount - 2, 1)} bullets).
- skillGapBridges: only REAL gaps with real transferable equivalents. No fabrication.
- coveragePlan: CRITICAL. Go through EVERY table-stake AND EVERY differentiator/preferred skill and classify:
    "must_include" — MUST appear in experience bullets even if user evidence is thin. Assign to the most plausible role. ALL table stakes AND ALL differentiators/preferred skills should be must_include by default.
    "bridge" — user has a transferable equivalent. Mention the equivalent AND the JD term together. Still counts as included.
    "omit_rare" — genuinely niche/rare PROPRIETARY tool that would look forced (e.g., company-internal tool name). Only 0-2 skills total may be omit_rare. NEVER classify a differentiator/preferred skill as omit_rare — preferred skills signal what the hiring manager values most.
  DEFAULT to must_include for BOTH table stakes AND differentiators. The resume MUST contain ALL table-stake skills AND ALL preferred/differentiator skills. Err heavily on the side of inclusion.
- keywordPlan.omit: ONLY skills classified as omit_rare in coveragePlan. Keep this list extremely small (0-2 items). NEVER omit differentiator/preferred skills.
- If candidate is 40% match, still include the table-stake AND differentiator skills — frame them as adjacent/transferable rather than omitting.
- Preferred/differentiator skills are what set candidates apart — including them shows the candidate goes beyond minimum requirements. Always include them.`;

  try {
    const _t = Date.now();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'system',
          content: 'Senior resume strategist. Position candidates honestly. Valid JSON only.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.4,
      max_completion_tokens: 4096,
      response_format: { type: 'json_object' }
    });

    const raw = completion.choices[0].message.content;
    if (!raw) {
      throw new Error(`buildStrategy: empty response from model (finish_reason: ${completion.choices[0].finish_reason})`);
    }
    const r = JSON.parse(raw);

    return {
      positioningAngle: r.positioningAngle || '',
      narrativeThread: r.narrativeThread || '',
      experienceDirectives: Array.isArray(r.experienceDirectives)
        ? r.experienceDirectives.map(d => ({
            company: d.company || '',
            title: d.title || '',
            emphasis: d.emphasis || '',
            relevantJdSkills: Array.isArray(d.relevantJdSkills) ? d.relevantJdSkills : [],
            deEmphasis: d.deEmphasis || '',
            bulletCount: Math.min(Math.max(d.bulletCount || bulletCount, 1), 10),
            priority: Math.min(Math.max(d.priority || 2, 1), 3)
          }))
        : [],
      skillGapBridges: Array.isArray(r.skillGapBridges)
        ? r.skillGapBridges.map(b => ({
            jdSkill: b.jdSkill || '',
            userEquivalent: b.userEquivalent || '',
            framingAdvice: b.framingAdvice || ''
          }))
        : [],
      coveragePlan: Array.isArray(r.coveragePlan)
        ? r.coveragePlan.map(c => ({
            skill: c.skill || '',
            source: c.source || 'tableStake',
            action: ['must_include', 'bridge', 'omit_rare'].includes(c.action) ? c.action : 'must_include',
            targetRole: c.targetRole || '',
            reason: c.reason || ''
          }))
        : [],
      toneDirective: r.toneDirective || '',
      keywordPlan: {
        useDirectly: Array.isArray(r.keywordPlan?.useDirectly) ? r.keywordPlan.useDirectly : [],
        translate: Array.isArray(r.keywordPlan?.translate) ? r.keywordPlan.translate : [],
        omit: Array.isArray(r.keywordPlan?.omit) ? r.keywordPlan.omit : []
      }
    };
  } catch (error) {
    console.error('V2 Pass 3 (buildStrategy) failed:', error);
    throw error;
  }
}

module.exports = { buildStrategy };
