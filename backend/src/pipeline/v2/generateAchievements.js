const OpenAI = require('openai');

/**
 * Pass 4x — Key Achievements (runs parallel with 4a+4b)
 * Generates 3-5 high-impact achievements that serve as the resume's "mastercard" —
 * the section recruiters and tech leads remember.
 *
 * @param {Object} params
 * @param {import('./types').ResumeStrategy} params.strategy
 * @param {import('./types').CareerIdentity} params.careerIdentity
 * @param {import('./types').JdDeepAnalysis} params.jdAnalysis
 * @param {import('../types').EmploymentItem[]} params.employmentHistory
 * @param {OpenAI} params.openai
 * @returns {Promise<string[]>}
 */
async function generateAchievements({ strategy, careerIdentity, jdAnalysis, employmentHistory, openai }) {
  const mustIncludeSkills = (strategy.coveragePlan || [])
    .filter(c => c.action === 'must_include' || c.action === 'bridge')
    .map(c => c.skill);

  const employmentSummary = employmentHistory.map((job, i) => {
    const notes = (job.notes || []).filter(Boolean);
    return `[${i + 1}] ${job.title} @ ${job.company} (${job.startDate}→${job.endDate})${notes.length ? ': ' + notes.join('; ') : ''}`;
  }).join('\n');

  const prompt = `Generate 3-5 KEY ACHIEVEMENTS for a resume. These are the resume's crown jewels — the lines that make a recruiter or tech lead say "we need to interview this person."

═══ CANDIDATE ═══
Domain: ${careerIdentity.primaryDomain} | Seniority: ${careerIdentity.senioritySignal}
Core tech: ${careerIdentity.technicalIdentity.core.join(', ')}
Trajectory: ${careerIdentity.careerTrajectory}
Strengths: ${careerIdentity.signatureStrengths.join(', ')}

═══ EMPLOYMENT HISTORY ═══
${employmentSummary}

═══ TARGET ROLE ═══
${jdAnalysis.roleTitle} (${jdAnalysis.seniority})
Table stakes: ${jdAnalysis.tableStakes.join(', ')}
Differentiators: ${jdAnalysis.differentiators.join(', ')}
HM mental model: ${jdAnalysis.hiringManagerMentalModel}

═══ MUST-INCLUDE TECH ═══
${mustIncludeSkills.join(', ')}

═══ POSITIONING ═══
${strategy.positioningAngle}
${strategy.narrativeThread}

Return JSON:
{"achievements": [{"text": "achievement text", "company": "Company Name"}, ...]}

Rules:
- Each achievement is ONE powerful line (15-25 words). Not a paragraph.
- "company" MUST be the exact company name from the employment history where this achievement occurred. This grounds the achievement in a real role.
- Format: ACTION + PROJECT/SYSTEM NAME + TECH/METHOD + IMPACT/SCALE. Example: {"text": "Architected **Atlas**, a microservices migration platform using **Kubernetes** and **Go**, reducing deployment time by 70% across 12 services", "company": "Acme Corp"}
- Each achievement MUST reference a specific project, system, or product name to sound concrete and memorable. If user notes mention one, USE IT. Otherwise, invent a plausible internal name that fits the company domain (e.g., "**Nexus**", "**Merchant Portal**", "**DataSync Engine**"). Bold the project name.
- MUST weave in JD-relevant tech stacks naturally. Each achievement should mention 1-3 technologies from the must-include list. This is critical — achievements without tech references are generic.
- Focus on OUTCOMES recruiters care about: scale (users, requests, revenue), speed (reduced X by Y%), reliability (uptime, error reduction), team impact (led N engineers, shipped N features).
- Pull from REAL employment history. Extrapolate reasonable impact from notes, but do NOT fabricate specific numbers if none are provided — use qualitative impact instead ("significantly improved", "across multiple teams").
- If candidate notes mention metrics, USE THEM. If not, frame achievements around scope and technical complexity.
- Each achievement should map to a DIFFERENT strength/role — don't cluster all in one job.
- Bold (**) the key technologies and outcomes.
- These must read as impressive to BOTH a recruiter (impact/scale) AND a technical interviewer (tech depth/architecture decisions).
- ${careerIdentity.primaryDomain} domain voice — not generic corporate speak.
- 3 achievements minimum, 5 maximum. Quality over quantity.`;

  try {
    const _t = Date.now();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'system',
          content: 'Elite resume writer. Generate achievements that make hiring managers stop scrolling. Each line must combine technical depth with business impact. Valid JSON only.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.5,
      max_completion_tokens: 800,
      response_format: { type: 'json_object' }
    });

    const r = JSON.parse(completion.choices[0].message.content);

    if (Array.isArray(r.achievements)) {
      return r.achievements
        .filter(a => a && typeof a === 'object' && a.text && a.company)
        .map(a => ({ text: a.text.trim(), company: a.company.trim() }))
        .slice(0, 5);
    }
    return [];
  } catch (error) {
    console.error('V2 Pass 4x (generateAchievements) failed:', error.message);
    return [];
  }
}

module.exports = { generateAchievements };
