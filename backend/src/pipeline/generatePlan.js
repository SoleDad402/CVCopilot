const OpenAI = require('openai');

/**
 * Generates a structured resume plan from JD analysis and scored history
 * @param {Object} params
 * @param {import('./types').JdAnalysis} params.jdAnalysis
 * @param {import('./types').ScoredJob[]} params.scoredHistory
 * @param {string[]} [params.voiceSamples]
 * @param {Object} [params.options]
 * @param {string} params.userName
 * @param {Object} params.userContact
 * @param {import('./types').EmploymentItem[]} params.education
 * @param {OpenAI} params.openai
 * @returns {Promise<import('./types').ResumePlan>}
 */
async function generatePlan({ jdAnalysis, scoredHistory, voiceSamples, options, userName, userContact, education, openai }) {
  // Format scored history for prompt
  const historyText = scoredHistory
    .slice(0, 10) // Limit to top 10 matches
    .map(({ job, matchScore, matchedSkills }) => {
      const notes = (job.notes || []).join('\n  - ');
      const matched = (matchedSkills || []).slice(0, 12).join(', ');
      return `- ${job.title} at ${job.company}, ${job.location}
  Dates: ${job.startDate} - ${job.endDate}
  Match Score: ${(matchScore * 100).toFixed(0)}%
  Matched Skills: ${matched || 'N/A'}
  Notes:
  - ${notes || 'No additional notes'}`;
    })
    .join('\n\n');

  // Format education for prompt
  const educationText = (education || [])
    .map(edu => {
      const degree = edu.degree || '';
      const field = edu.field_of_study || '';
      const gpa = edu.gpa ? ` (GPA: ${edu.gpa})` : '';
      return `- ${degree}${field ? ` in ${field}` : ''} from ${edu.school_name || edu.school || ''}, ${edu.location || ''}
  Dates: ${edu.start_date || ''} - ${edu.end_date || edu.is_current ? 'Present' : ''}${gpa}`;
    })
    .join('\n\n');

  const voiceGuidance = voiceSamples && voiceSamples.length > 0
    ? `\n\nUser's writing style samples (match this tone):
${voiceSamples.join('\n\n')}`
    : '';

  const bannedPhrases = [
    'results-driven',
    'passionate about',
    'highly motivated',
    'team player',
    'detail-oriented',
    'think outside the box',
    'synergy',
    'leverage',
    'utilize',
    'proven track record',
    'dynamic',
    'self-starter',
    'go-getter',
    'fast-paced environment',
    'rockstar',
    'ninja',
    'guru',
    'disrupt',
    'move the needle'
  ];

  const prompt = `Create a highly tailored, hiring-manager-ready resume plan based on this job description and candidate history.

Job Requirements:
- Role: ${jdAnalysis.roleTitle} (${jdAnalysis.seniority} level)
- Must-have skills: ${jdAnalysis.mustHaveSkills.join(', ')}
- Nice-to-have skills: ${jdAnalysis.niceToHaveSkills.join(', ')}
- Domain: ${jdAnalysis.domainKeywords.join(', ')}
- Key responsibilities: ${jdAnalysis.responsibilities.slice(0, 5).join('; ')}

Candidate Employment History:
${historyText}

${educationText ? `\nEducation:\n${educationText}` : ''}

Writing standard (make it stand out, but stay credible):
- Write like a strong senior candidate who ships, owns outcomes, and communicates clearly. No hype.
- Every bullet must be specific: what you did + why it mattered + how you did it + outcome.
- Prefer real details from Notes. Do NOT invent employers, titles, dates, locations.
- Metrics:
  - If Notes include numbers, use them.
  - If Notes do NOT include numbers, use conservative phrasing (e.g., "cut latency materially", "improved reliability", "reduced on-call pages") without fake %.
  - Avoid unbelievable claims (e.g., "10x", "99.999%" unless supported).
- Put the strongest, most JD-relevant bullet first for each role.
- Avoid generic phrases like: ${bannedPhrases.join(', ')}
- Avoid empty filler like "responsible for", "worked on", "helped with" unless followed by concrete outcomes.
- Use clear, natural US English with varied sentence lengths. No exclamation points.

Structure requirements:
- Summary: 3–4 sentences. First sentence is a hook tailored to this role. Include 2–4 **bold** keywords naturally.
- Skills: Return as an array of SECTION OBJECTS (not a flat list) using layered classification:
  [{ "section": "Core", "list": [...] }, { "section": "Domain", "list": [...] }, { "section": "Tooling", "list": [...] }, { "section": "Infrastructure", "list": [...] }, { "section": "Collaboration", "list": [...] }]
- Experience: include 3–6 bullets per role (not 7–8). Bullets should read like top-tier interview stories.
- For the first two experience entries, include 1 bullet that reads like a standout project highlight aligned to the JD (still credible).
${voiceGuidance}

Return a JSON object with this exact structure:
{
  "header": {
    "name": "${userName}",
    "titleLine": "Tailored title based on job (e.g., 'Senior Software Engineer | AI/ML Specialist')"
  },
  "summary": "3-4 sentence summary with **bold** keywords",
  "skills": [
    { "section": "Core", "list": ["...", "..."] },
    { "section": "Domain", "list": ["...", "..."] },
    { "section": "Tooling", "list": ["...", "..."] },
    { "section": "Infrastructure", "list": ["...", "..."] },
    { "section": "Collaboration", "list": ["...", "..."] }
  ],
  "experience": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "location": "Location",
      "dateRange": "MM/YYYY - MM/YYYY or Present",
      "bullets": [
        "Bullet with **bold** technical terms",
        ...
      ]
    }
  ],
  ${options?.includeProjects ? `"projects": [
    {
      "name": "Project Name",
      "bullets": ["Bullet 1", ...]
    }
  ],` : ''}
  ${options?.includeEducation !== false ? `"education": [
    {
      "school": "School Name",
      "location": "Location",
      "degree": "Degree",
      "dateRange": "MM/YYYY - MM/YYYY"
    }
  ]` : ''}
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5.2",
      messages: [
        {
          role: "system",
          content: "You are a senior technical resume writer and former hiring manager. Create standout, credible resumes: specific, outcome-focused, and easy to scan. Avoid clichés and buzzword salad. Never invent employers, titles, dates, or locations. Always return valid JSON matching the provided schema exactly."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.5,
      max_completion_tokens: 30000,
      response_format: { type: "json_object" }
    });

    const plan = JSON.parse(completion.choices[0].message.content);
    
    // Validate and normalize
    return {
      header: {
        name: plan.header?.name || userName,
        titleLine: plan.header?.titleLine || jdAnalysis.roleTitle
      },
      summary: plan.summary || '',
      skills: Array.isArray(plan.skills) ? plan.skills : [],
      experience: Array.isArray(plan.experience) ? plan.experience : [],
      projects: options?.includeProjects && Array.isArray(plan.projects) ? plan.projects : undefined,
      education: options?.includeEducation !== false && Array.isArray(plan.education) ? plan.education : undefined
    };
  } catch (error) {
    console.error('Error generating resume plan:', error);
    throw error;
  }
}

module.exports = { generatePlan };

