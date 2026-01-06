const OpenAI = require('openai');

/**
 * Analyzes a job description and extracts key requirements
 * @param {string} jobDescription - Raw job description text
 * @param {OpenAI} openai - OpenAI client instance
 * @returns {Promise<import('./types').JdAnalysis>}
 */
async function analyzeJd(jobDescription, openai) {
  const prompt = `Analyze this job description and extract key requirements into a structured format.

Job Description:
${jobDescription}

Extract:
1. Role title (e.g., "Senior Software Engineer", "ML Engineer")
2. Seniority level (Junior, Mid, Senior, Lead, or Principal)
3. Must-have skills (required technologies, frameworks, languages)
4. Nice-to-have skills (preferred but not required)
5. Domain keywords (industry-specific terms, domains like "fintech", "healthcare", etc.)
6. Key responsibilities (main duties and expectations)

Guidelines:
- Be concrete and deduplicate (e.g., don't return both "React" and "React.js" unless the JD clearly distinguishes them).
- Prefer the exact surface forms used in the JD (e.g., "Node.js" not "Node").
- Keep arrays short and high-signal: mustHaveSkills 6–12, niceToHaveSkills 4–10, domainKeywords 4–10, responsibilities 6–12.
- Responsibilities should reflect what a hiring manager will evaluate for (ownership, scope, collaboration, reliability, performance, quality).

Return a JSON object with this exact structure:
{
  "roleTitle": "string",
  "seniority": "Junior" | "Mid" | "Senior" | "Lead" | "Principal",
  "mustHaveSkills": ["skill1", "skill2", ...],
  "niceToHaveSkills": ["skill1", "skill2", ...],
  "domainKeywords": ["keyword1", "keyword2", ...],
  "responsibilities": ["responsibility1", "responsibility2", ...]
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5.2",
      messages: [
        {
          role: "system",
          content: "You are an experienced hiring manager specializing in software engineering, AI, and ML roles. Extract high-signal, non-generic requirements from job descriptions into JSON. Always return valid JSON matching the requested schema exactly."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_completion_tokens: 2000,
      response_format: { type: "json_object" }
    });

    const analysis = JSON.parse(completion.choices[0].message.content);
    
    // Validate and normalize
    return {
      roleTitle: analysis.roleTitle || "Software Engineer",
      seniority: analysis.seniority || "Mid",
      mustHaveSkills: Array.isArray(analysis.mustHaveSkills) ? analysis.mustHaveSkills : [],
      niceToHaveSkills: Array.isArray(analysis.niceToHaveSkills) ? analysis.niceToHaveSkills : [],
      domainKeywords: Array.isArray(analysis.domainKeywords) ? analysis.domainKeywords : [],
      responsibilities: Array.isArray(analysis.responsibilities) ? analysis.responsibilities : []
    };
  } catch (error) {
    console.error('Error analyzing JD:', error);
    // Return default structure on error
    return {
      roleTitle: "Software Engineer",
      seniority: "Mid",
      mustHaveSkills: [],
      niceToHaveSkills: [],
      domainKeywords: [],
      responsibilities: []
    };
  }
}

module.exports = { analyzeJd };

