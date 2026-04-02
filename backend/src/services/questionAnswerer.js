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
 * @returns {Promise<string>} Plain text answer
 */
async function answerQuestion(openai, { question, jobDescription, resume, resumeText, maxChars = 200 }) {
  const cleanedJd = cleanJobDescription(jobDescription || '');

  // Build resume context from JSON or plain text
  let resumeSummary = '';
  if (resume) {
    resumeSummary = buildResumeSummary(resume);
  } else if (resumeText) {
    resumeSummary = `\n\nCandidate Resume:\n${resumeText.substring(0, 2000)}`;
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

module.exports = { answerQuestion, buildResumeSummary };
