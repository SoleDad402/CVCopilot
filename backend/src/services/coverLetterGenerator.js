/**
 * Shared cover letter content generation via LLM.
 *
 * Generates ONLY the body paragraphs — no header, greeting, or signature.
 * The DOCX template (in documentGeneration.js) handles formatting.
 *
 * Used by both CVCopilot manual generation and BidCopilot auto-bid.
 */

/**
 * Generate cover letter body text via LLM.
 *
 * @param {object} openai - OpenAI client instance
 * @param {object} params
 * @param {string} params.jobDescription
 * @param {string} params.jobTitle
 * @param {string} params.companyName
 * @param {string} params.userName
 * @param {string} params.resumeSummary - Professional summary from generated resume
 * @param {Array} params.experience - Resume experience entries [{position, company}]
 * @param {string} [params.skills] - Comma-separated skills string
 * @param {string} [params.model] - LLM model to use (default: gpt-4o-mini)
 * @returns {Promise<string>} Cover letter body paragraphs
 */
async function generateCoverLetterContent(openai, {
  jobDescription,
  jobTitle,
  companyName,
  userName,
  resumeSummary,
  experience,
  skills,
  model = 'gpt-4o-mini',
}) {
  const topRoles = (experience || []).slice(0, 3).map(e =>
    `${e.position || e.title || ''} at ${e.company || e.company_name || ''}`
  ).filter(r => r !== ' at ').join(', ');

  const skillsText = skills
    ? `\nKey skills: ${skills}`
    : '';

  const response = await openai.chat.completions.create({
    model,
    temperature: 0.5,
    max_tokens: 1200,
    messages: [
      {
        role: 'system',
        content: `You are a professional cover letter writer. Write ONLY the body paragraphs (3-4 paragraphs) of a cover letter. Do NOT include any header, address, date, greeting ("Dear Hiring Manager"), or closing signature — those are handled by the template. Start directly with the first paragraph of content. Be genuine, not generic. Do not use clichés like "I am excited to apply" or "I believe I would be a great fit". Be specific about achievements and use concrete examples.`,
      },
      {
        role: 'user',
        content: `Write the body paragraphs of a cover letter for:
Candidate: ${userName}
Role: ${jobTitle || 'the advertised position'}
Company: ${companyName || 'the company'}
Recent experience: ${topRoles}
Professional summary: ${resumeSummary || ''}${skillsText}

Job description:
${(jobDescription || '').substring(0, 3000)}

Write ONLY the body paragraphs — no header, no greeting, no signature.`,
      },
    ],
  });

  return response.choices[0].message.content.trim();
}

module.exports = { generateCoverLetterContent };
