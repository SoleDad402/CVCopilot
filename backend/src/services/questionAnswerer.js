/**
 * Shared question answering service for job application forms.
 *
 * Generates concise, plain-text answers based on job description + resume.
 * Used by both CVCopilot's /api/ask-question and BidCopilot's auto-bid.
 */
const { cleanJobDescription } = require('../utils/textUtils');

/**
 * Build a text summary of a resume JSON for LLM context.
 */
function buildResumeSummary(resume) {
  if (!resume) return '';

  let summary = '\n\nCandidate Resume:\n';
  summary += `Name: ${resume.name || ''}\n`;
  summary += resume.summary ? `Summary: ${resume.summary}\n` : '';

  if (resume.experience && Array.isArray(resume.experience)) {
    summary += 'Experience:\n';
    resume.experience.forEach(exp => {
      summary += `  - ${exp.position || ''} at ${exp.company || ''}, ${exp.location || ''} (${exp.dates || ''})\n`;
      if (exp.bullets && Array.isArray(exp.bullets)) {
        exp.bullets.slice(0, 2).forEach(bullet => {
          summary += `      • ${bullet}\n`;
        });
      }
    });
  }

  if (resume.skills && Array.isArray(resume.skills)) {
    summary += 'Skills:\n';
    resume.skills.forEach(section => {
      summary += `  - ${section.section}: ${section.list?.join(', ') || ''}\n`;
    });
  }

  if (resume.education && Array.isArray(resume.education)) {
    summary += 'Education:\n';
    resume.education.forEach(edu => {
      summary += `  - ${edu.program || ''} at ${edu.school || ''}, ${edu.location || ''} (${edu.dates || ''})\n`;
    });
  }

  if (resume.certifications && Array.isArray(resume.certifications) && resume.certifications.length > 0) {
    summary += 'Certifications:\n';
    resume.certifications.forEach(cert => {
      summary += `  - ${cert.name || ''} (Issued: ${cert.issued || ''})\n`;
    });
  }

  return summary;
}

/**
 * Generate an answer to a job application form question.
 *
 * @param {object} openai - OpenAI client
 * @param {object} params
 * @param {string} params.question - The form question
 * @param {string} params.jobDescription - Job description text
 * @param {object} [params.resume] - Generated resume JSON (name, summary, experience, skills, education)
 * @param {string} [params.resumeText] - Plain text resume (alternative to resume JSON)
 * @param {number} [params.maxChars] - Max character limit for the answer (default: 200)
 * @param {string[]} [params.options] - Available options for select/dropdown fields
 * @param {object} [params.userProfile] - User profile data (skills, employment, education, etc.)
 * @returns {Promise<string>} Plain text answer
 */
async function answerQuestion(openai, { question, jobDescription, resume, resumeText, maxChars = 200, options, userProfile }) {
  const cleanedJd = cleanJobDescription(jobDescription || '');

  // Build resume context from JSON or plain text
  let resumeSummary = '';
  if (resume) {
    resumeSummary = buildResumeSummary(resume);
  } else if (resumeText) {
    resumeSummary = `\n\nCandidate Resume:\n${resumeText.substring(0, 2000)}`;
  }

  // Build user profile context if available
  let profileContext = '';
  if (userProfile) {
    const parts = [];
    if (userProfile.current_title) parts.push(`Current Title: ${userProfile.current_title}`);
    if (userProfile.location) parts.push(`Location: ${userProfile.location}`);
    if (userProfile.preferred_pronouns) parts.push(`Pronouns: ${userProfile.preferred_pronouns}`);
    if (userProfile.skills?.length) {
      const skillNames = userProfile.skills.map(s => typeof s === 'string' ? s : s.name).filter(Boolean);
      if (skillNames.length) parts.push(`Skills: ${skillNames.join(', ')}`);
    }
    if (userProfile.employment_history?.length) {
      const jobs = userProfile.employment_history.slice(0, 3).map(j =>
        `${j.title || j.position || ''} at ${j.company || j.company_name || ''}`
      ).filter(s => s !== ' at ');
      if (jobs.length) parts.push(`Recent roles: ${jobs.join('; ')}`);
    }
    if (userProfile.education?.length) {
      const edu = userProfile.education.slice(0, 2).map(e =>
        `${e.degree || ''} in ${e.field_of_study || ''} from ${e.school_name || ''}`
      ).filter(Boolean);
      if (edu.length) parts.push(`Education: ${edu.join('; ')}`);
    }
    if (parts.length) profileContext = `\n\nCandidate Profile:\n${parts.join('\n')}`;
  }

  // Select-from-options mode: ask LLM to pick from available choices
  if (options && options.length > 0) {
    return await answerSelectQuestion(openai, { question, options, jobDescription: cleanedJd, resumeSummary, profileContext });
  }

  const prompt = `
You are a helpful assistant who answers questions for job application forms. Your answers must be:
- Simple, clear, and in native American English
- NO markdown formatting (no **bold**, no bullets, no lists, no code blocks)
- 1-2 sentences maximum, under ${maxChars} characters
- Suitable for pasting directly into job application form fields
- Based on the following job description and resume:

Job Description:
${cleanedJd.substring(0, 3000)}

Resume Summary:
${resumeSummary}
${profileContext}

Question: ${question}

Answer (plain text, 1-2 sentences, no markdown, under ${maxChars} characters):
`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are a helpful assistant who answers questions for job application forms. Provide concise, plain text answers (1-2 sentences, under ${maxChars} characters) with no markdown formatting, suitable for pasting directly into form fields.`,
      },
      { role: 'user', content: prompt },
    ],
    max_tokens: 150,
    temperature: 0.7,
  });

  let answer = (response.choices[0]?.message?.content || '').trim();

  // Hard cap at maxChars
  if (answer.length > maxChars) {
    const truncated = answer.substring(0, maxChars);
    const lastPeriod = truncated.lastIndexOf('.');
    answer = lastPeriod > maxChars * 0.5 ? truncated.substring(0, lastPeriod + 1) : truncated;
  }

  return answer;
}

/**
 * Pick the best option(s) from a select/dropdown field.
 *
 * Returns one or more option labels (comma-separated for multi-select).
 */
async function answerSelectQuestion(openai, { question, options, jobDescription, resumeSummary, profileContext }) {
  const numberedOptions = options.map((opt, i) => `${i + 1}. ${opt}`).join('\n');

  const prompt = `You are filling out a job application form. A dropdown/select question is shown below with its available options.

Pick the BEST option(s) that match the candidate's profile. Return ONLY the exact option text — nothing else.
If multiple options apply (multi-select), return them separated by " | " (pipe with spaces).
If none clearly match, pick the most reasonable default.

Question: ${question}

Available options:
${numberedOptions}
${profileContext}
${resumeSummary ? `\nResume context:\n${resumeSummary.substring(0, 1500)}` : ''}
${jobDescription ? `\nJob context:\n${jobDescription.substring(0, 1000)}` : ''}

Answer (exact option text only):`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You select the best matching option(s) from a dropdown for a job application. Return ONLY the exact option label text. For multi-select, separate with " | ". Never add explanations.',
      },
      { role: 'user', content: prompt },
    ],
    max_tokens: 100,
    temperature: 0.3,
  });

  let answer = (response.choices[0]?.message?.content || '').trim();

  // Validate: ensure each picked option actually exists in the options list
  const picked = answer.split('|').map(s => s.trim()).filter(Boolean);
  const validated = picked.filter(p =>
    options.some(opt => opt.toLowerCase() === p.toLowerCase())
  );

  // If validation removed everything, fuzzy-match the first pick
  if (validated.length === 0 && picked.length > 0) {
    const firstPick = picked[0].toLowerCase();
    const fuzzy = options.find(opt => opt.toLowerCase().includes(firstPick) || firstPick.includes(opt.toLowerCase()));
    if (fuzzy) validated.push(fuzzy);
  }

  return validated.length > 0 ? validated.join(' | ') : options[0] || answer;
}

module.exports = { answerQuestion, buildResumeSummary };
