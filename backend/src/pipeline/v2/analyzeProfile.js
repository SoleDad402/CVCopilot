const OpenAI = require('openai');

/**
 * Pass 1 — Career Identity Analysis
 * Analyzes the user's history WITHOUT seeing the JD.
 *
 * @param {Object} params
 * @param {import('../types').EmploymentItem[]} params.employmentHistory
 * @param {Object[]} params.education
 * @param {string} params.userName
 * @param {OpenAI} params.openai
 * @returns {Promise<import('./types').CareerIdentity>}
 */
async function analyzeProfile({ employmentHistory, education, userName, openai }) {
  // Chronological order (oldest first) for career progression visibility
  const chronological = [...employmentHistory].sort((a, b) =>
    (a.startDate || '').localeCompare(b.startDate || '')
  );

  const historyText = chronological.map(job => {
    const notes = (job.notes || []).filter(Boolean);
    return `${job.title || '?'} @ ${job.company || '?'} | ${job.location || ''} | ${job.startDate || '?'}→${job.endDate || 'Present'}${notes.length ? '\n  ' + notes.join('; ') : ''}`;
  }).join('\n');

  const educationText = (education || []).map(edu => {
    const deg = [edu.degree, edu.field_of_study].filter(Boolean).join(' in ');
    return `${deg || '?'} — ${edu.school_name || edu.school || '?'} (${edu.start_date || '?'}→${edu.end_date || '?'})${edu.gpa ? ' GPA:' + edu.gpa : ''}`;
  }).join('\n');

  const prompt = `Analyze this candidate's career identity. No job description — purely about the candidate.

Candidate: ${userName}

History (chronological):
${historyText}
${educationText ? `\nEducation:\n${educationText}` : ''}

Return JSON:
{
  "careerTrajectory": "career path pattern, e.g. 'IC → Senior IC with increasing scope'",
  "primaryDomain": "industry/domain with deepest experience",
  "secondaryDomains": ["other domains touched"],
  "signatureStrengths": ["3-5 recurring themes across 2+ roles, be specific not generic"],
  "technicalIdentity": {
    "core": ["tech used across 2+ roles"],
    "familiar": ["tech used in 1 role only"]
  },
  "senioritySignal": "how experienced they read based on actual history",
  "careerNarrative": "1-2 sentences — how a colleague would describe their career"
}

Rules: Only use evidenced info. Never inflate. Use candidate's domain language, not HR terms. If sparse, say so.`;

  try {
    const _t = Date.now();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'system',
          content: 'Career analyst. Analyze employment to understand professional identity. Valid JSON only. Honest, specific, never inflate.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_completion_tokens: 1200,
      response_format: { type: 'json_object' }
    });

    const r = JSON.parse(completion.choices[0].message.content);

    return {
      careerTrajectory: r.careerTrajectory || 'Unable to determine',
      primaryDomain: r.primaryDomain || 'general software engineering',
      secondaryDomains: Array.isArray(r.secondaryDomains) ? r.secondaryDomains : [],
      signatureStrengths: Array.isArray(r.signatureStrengths) ? r.signatureStrengths.slice(0, 5) : [],
      technicalIdentity: {
        core: Array.isArray(r.technicalIdentity?.core) ? r.technicalIdentity.core : [],
        familiar: Array.isArray(r.technicalIdentity?.familiar) ? r.technicalIdentity.familiar : []
      },
      senioritySignal: r.senioritySignal || 'mid-level',
      careerNarrative: r.careerNarrative || ''
    };
  } catch (error) {
    console.error('V2 Pass 1 (analyzeProfile) failed:', error);
    return {
      careerTrajectory: 'Unknown',
      primaryDomain: 'software engineering',
      secondaryDomains: [],
      signatureStrengths: [],
      technicalIdentity: { core: [], familiar: [] },
      senioritySignal: 'mid-level',
      careerNarrative: ''
    };
  }
}

module.exports = { analyzeProfile };
