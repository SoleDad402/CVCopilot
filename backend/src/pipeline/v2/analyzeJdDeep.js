const OpenAI = require('openai');

/**
 * Pass 2 — Deep JD Analysis
 * Understands table stakes vs differentiators, implicit needs, hiring psychology.
 *
 * @param {string} jobDescription
 * @param {OpenAI} openai
 * @returns {Promise<import('./types').JdDeepAnalysis>}
 */
async function analyzeJdDeep(jobDescription, openai) {
  const prompt = `Extract skills and analyze this job description.

JD:
${jobDescription}

Return JSON:
{
  "roleTitle": "cleaned role title",
  "seniority": "Junior|Mid|Senior|Lead|Principal",
  "tableStakes": ["SHORT skill/technology names only — e.g. 'Swift', 'SwiftUI', 'CI/CD', 'PostgreSQL'. NOT sentences. NOT experience requirements like '3-5 years'. NOT soft skills like 'communication'. Extract 5-15 SPECIFIC technical skills, tools, frameworks, languages, platforms from required/must-have sections."],
  "differentiators": ["3-8 preferred/bonus skills — same format: short names only"],
  "domainKeywords": ["3-8 industry terms"],
  "responsibilities": ["5-8 key duties as short outcome phrases"],
  "implicitNeeds": ["2-5 pain points this role solves"],
  "hiringManagerMentalModel": "1-2 sentences: what makes the ideal candidate",
  "culturalSignals": ["2-5 values/tone indicators"],
  "seniorityExpectation": "what this level means here"
}

CRITICAL rules for tableStakes and differentiators:
- Extract SPECIFIC TECHNICAL SKILLS: languages, frameworks, tools, platforms, methodologies
- SHORT names: "Swift" not "Experience with Swift". "UIKit" not "Experience using Apple frameworks such as UIKit"
- Break compound skills: "Swift and SwiftUI" → ["Swift", "SwiftUI"]
- Convert requirements to skills: "3-5 years of app development" → "app development". "Proficiency in Python" → "Python"
- EXCLUDE: years of experience, soft skills (communication, collaboration, passion), generic phrases
- If JD says "OOP, functional programming, TDD" → extract each: ["OOP", "functional programming", "TDD"]
- Max 3 words per skill. If longer, you're doing it wrong.`;

  try {
    const _t = Date.now();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'system',
          content: 'Hiring strategy consultant. Read between the lines of JDs to understand what companies actually need. Valid JSON only.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_completion_tokens: 1800,
      response_format: { type: 'json_object' }
    });

    const r = JSON.parse(completion.choices[0].message.content);

    return {
      roleTitle: r.roleTitle || 'Software Engineer',
      seniority: r.seniority || 'Mid',
      tableStakes: Array.isArray(r.tableStakes) ? r.tableStakes : [],
      differentiators: Array.isArray(r.differentiators) ? r.differentiators : [],
      domainKeywords: Array.isArray(r.domainKeywords) ? r.domainKeywords : [],
      responsibilities: Array.isArray(r.responsibilities) ? r.responsibilities : [],
      implicitNeeds: Array.isArray(r.implicitNeeds) ? r.implicitNeeds : [],
      hiringManagerMentalModel: r.hiringManagerMentalModel || '',
      culturalSignals: Array.isArray(r.culturalSignals) ? r.culturalSignals : [],
      seniorityExpectation: r.seniorityExpectation || ''
    };
  } catch (error) {
    console.error('V2 Pass 2 (analyzeJdDeep) failed:', error);
    return {
      roleTitle: 'Software Engineer', seniority: 'Mid',
      tableStakes: [], differentiators: [], domainKeywords: [],
      responsibilities: [], implicitNeeds: [],
      hiringManagerMentalModel: '', culturalSignals: [], seniorityExpectation: ''
    };
  }
}

module.exports = { analyzeJdDeep };
