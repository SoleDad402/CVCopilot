/**
 * Normalizes and scores employment history against JD requirements
 * @param {import('./types').EmploymentItem[]} employmentHistory
 * @param {import('./types').JdAnalysis} jdAnalysis
 * @returns {Promise<import('./types').ScoredJob[]>}
 */
async function scoreHistory(employmentHistory, jdAnalysis) {
  // Normalize job titles
  const normalizeTitle = (title) => {
    if (!title) return '';
    return title
      .replace(/^Sr\.?\s+/i, 'Senior ')
      .replace(/^Jr\.?\s+/i, 'Junior ')
      .replace(/\bSWE\b/gi, 'Software Engineer')
      .replace(/\bSDE\b/gi, 'Software Development Engineer')
      .replace(/\bML\s+Eng/gi, 'Machine Learning Engineer')
      .replace(/\bAI\s+Eng/gi, 'Artificial Intelligence Engineer');
  };

  // Extract skills from job notes/description
  const extractSkillsFromNotes = (notes) => {
    if (!notes || !Array.isArray(notes)) return [];
    const skillKeywords = [
      'Python', 'JavaScript', 'TypeScript', 'Java', 'C++', 'Go', 'Rust',
      'React', 'Vue', 'Angular', 'Node.js', 'Express', 'Django', 'Flask',
      'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Terraform',
      'TensorFlow', 'PyTorch', 'scikit-learn', 'pandas', 'numpy',
      'PostgreSQL', 'MongoDB', 'Redis', 'Kafka', 'Elasticsearch',
      'Git', 'CI/CD', 'Jenkins', 'GitHub Actions', 'Agile', 'Scrum'
    ];
    
    const found = [];
    const notesText = notes.join(' ').toLowerCase();
    skillKeywords.forEach(skill => {
      if (notesText.includes(skill.toLowerCase())) {
        found.push(skill);
      }
    });
    return found;
  };

  // Find JD skills explicitly mentioned in job text (notes/title/company)
  const matchJdSkillsInText = (text, skills) => {
    if (!text || !skills || !Array.isArray(skills)) return [];
    const haystack = ` ${text.toLowerCase()} `;
    const matches = [];
    for (const s of skills) {
      if (!s || typeof s !== 'string') continue;
      const needle = s.toLowerCase().trim();
      if (!needle) continue;
      // Simple boundary-ish match to reduce substring false positives
      const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i');
      if (re.test(haystack)) matches.push(s);
    }
    return matches;
  };

  // Score a job against JD requirements
  const scoreJob = (job, jdAnalysis) => {
    const allRequiredSkills = [...jdAnalysis.mustHaveSkills, ...jdAnalysis.niceToHaveSkills].filter(Boolean);
    const jobText = `${job.title || ''} ${job.company || ''} ${(job.notes || []).join(' ')}`;

    // Skills explicitly present in notes/title/company
    const explicitJdMatches = matchJdSkillsInText(jobText, allRequiredSkills);

    // Also capture common tech terms from notes for extra signal
    const keywordSkills = extractSkillsFromNotes(job.notes || []);
    
    // Calculate match score
    const matchedSkills = [...new Set(explicitJdMatches)];
    let matchCount = matchedSkills.length;

    // Small bonus when keywordSkills indicate relevant environment even if JD wording differs
    if (keywordSkills.length > 0 && allRequiredSkills.length > 0) {
      // e.g., if JD says "Node" but notes say "Node.js" or similar – keep lightweight
      const normalizedReq = allRequiredSkills.map(s => s.toLowerCase());
      keywordSkills.forEach(k => {
        const kk = k.toLowerCase();
        if (normalizedReq.some(r => r.includes(kk) || kk.includes(r))) {
          matchCount += 0.25;
        }
      });
    }

    // Also check job title and company for domain keywords
    const jobTextLower = jobText.toLowerCase();
    jdAnalysis.domainKeywords.forEach(keyword => {
      if (keyword && jobTextLower.includes(String(keyword).toLowerCase())) {
        matchCount += 0.5;
      }
    });

    // Normalize score to 0-1 range
    const maxPossibleScore = Math.max(allRequiredSkills.length, 1);
    const matchScore = Math.min(matchCount / maxPossibleScore, 1);

    return {
      matchScore,
      matchedSkills // already deduped
    };
  };

  // Process each job
  return employmentHistory.map(job => {
    const normalizedJob = {
      ...job,
      title: normalizeTitle(job.title)
    };
    
    const { matchScore, matchedSkills } = scoreJob(normalizedJob, jdAnalysis);
    
    return {
      job: normalizedJob,
      matchScore,
      matchedSkills
    };
  }).sort((a, b) => b.matchScore - a.matchScore); // Sort by match score descending
}

module.exports = { scoreHistory };

