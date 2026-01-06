const OpenAI = require('openai');

/**
 * Humanizes markdown resume by removing clichés and tightening language
 * @param {string} markdown - Raw markdown resume
 * @param {string[]} [voiceSamples] - User's writing samples for tone matching
 * @param {OpenAI} openai - OpenAI client instance
 * @returns {Promise<string>}
 */
async function humanizeMarkdown(markdown, voiceSamples, openai) {
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
    'go-getter',
    'self-starter',
    'hard worker',
    'excellent communication skills',
    'strong problem-solving skills',
    'dynamic',
    'fast-paced environment',
    'rockstar',
    'ninja',
    'guru',
    'move the needle'
  ];

  const voiceGuidance = voiceSamples && voiceSamples.length > 0
    ? `\n\nMatch the tone and style of these writing samples:
${voiceSamples.join('\n\n')}`
    : '';

  const prompt = `Edit this resume to make it sound more human, confident, and hiring-manager-ready. Remove generic phrases and clichés. Keep all facts, dates, company names, job titles, and overall structure exactly the same.

Banned phrases to remove or replace:
${bannedPhrases.join(', ')}

Guidelines:
- Remove or replace any banned phrases
- Tighten language: fewer filler words, stronger verbs, less repetition
- Make bullets read like credible interview stories (what/why/how/outcome)
- If a bullet has a metric, keep it; do NOT add new numbers that weren't present
- Maintain markdown formatting (including **bold** for keywords). Don't add new headings.
- Do not add new skills that weren't already implied in the resume
- Avoid sounding like a template; vary sentence openings and rhythm
- Output only the edited markdown, no explanations
${voiceGuidance}

Resume to edit:
${markdown}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5.2",
      messages: [
        {
          role: "system",
          content: "You are an expert resume editor and former hiring manager. Make resumes sound human, confident, and specific (not AI). Keep all facts and structure the same; do not invent. Remove clichés. Output only Markdown."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_completion_tokens: 30000
    });

    return completion.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error humanizing markdown:', error);
    // Return original on error
    return markdown;
  }
}

module.exports = { humanizeMarkdown };

