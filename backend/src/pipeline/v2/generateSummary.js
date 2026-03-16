const OpenAI = require('openai');

/**
 * Pass 4c — Summary Generation (written LAST, after experience + skills)
 *
 * @param {Object} params
 * @param {import('./types').ResumeStrategy} params.strategy
 * @param {import('./types').CareerIdentity} params.careerIdentity
 * @param {import('./types').JdDeepAnalysis} params.jdAnalysis
 * @param {Object[]} params.generatedExperience
 * @param {Object[]} params.generatedSkills
 * @param {string} params.userName
 * @param {OpenAI} params.openai
 * @returns {Promise<string>}
 */
async function generateSummary({ strategy, careerIdentity, jdAnalysis, generatedExperience, generatedSkills, userName, openai }) {
  // Top bullets from priority-1 roles for grounding
  const topBullets = generatedExperience
    .slice(0, 2)
    .flatMap(exp => (exp.bullets || []).slice(0, 3))
    .join('\n• ');

  const skillList = generatedSkills.map(s => `${s.section}: ${s.list.slice(0, 4).join(', ')}`).join(' | ');

  const prompt = `Write a 3-4 sentence resume summary for ${userName}.

Positioning: ${strategy.positioningAngle}
Narrative: ${strategy.narrativeThread}
Identity: ${careerIdentity.senioritySignal} in ${careerIdentity.primaryDomain}. Strengths: ${careerIdentity.signatureStrengths.join(', ')}
Target: ${jdAnalysis.roleTitle} (${jdAnalysis.seniority})
HM wants: ${jdAnalysis.hiringManagerMentalModel}
Tone: ${strategy.toneDirective}

Top bullets already written (ground claims in these):
• ${topBullets}

Skills: ${skillList}

Rules:
- Sentence 1: Hook — who they are in their own domain terms, angled toward this role
- Sentence 2: Proof — most impressive scope/impact from experience section, be specific
- Sentence 3: Bridge — connect background to this role's needs
- Optional sentence 4: Differentiator — memorable beyond skills
- 2-4 **bold** keywords. Don't start with name or third person.
- No clichés: results-driven, passionate, proven track record, detail-oriented, team player
- Every claim must be supported by experience bullets or skills above.

Return: {"summary": "3-4 sentences with **bold** markdown"}`;

  try {
    const _t = Date.now();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: 'Write summaries that make hiring managers stop skimming. Confident, specific, grounded. Valid JSON only.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.6,
      max_completion_tokens: 500,
      response_format: { type: 'json_object' }
    });

    const r = JSON.parse(completion.choices[0].message.content);
    return r.summary || '';
  } catch (error) {
    console.error('V2 Pass 4c (generateSummary) failed:', error);
    return careerIdentity.careerNarrative || '';
  }
}

module.exports = { generateSummary };
