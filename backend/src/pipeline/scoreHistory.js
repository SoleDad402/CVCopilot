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

  // Score a job against JD requirements
  const scoreJob = (job, jdAnalysis) => {
    const jobSkills = extractSkillsFromNotes(job.notes || []);
    const allRequiredSkills = [...jdAnalysis.mustHaveSkills, ...jdAnalysis.niceToHaveSkills];
    
    // Calculate match score
    let matchedSkills = [];
    let matchCount = 0;
    
    jobSkills.forEach(skill => {
      const normalizedSkill = skill.toLowerCase();
      const matches = allRequiredSkills.filter(reqSkill => 
        reqSkill.toLowerCase().includes(normalizedSkill) || 
        normalizedSkill.includes(reqSkill.toLowerCase())
      );
      if (matches.length > 0) {
        matchedSkills.push(...matches);
        matchCount++;
      }
    });

    // Also check job title and company for domain keywords
    const jobText = `${job.title} ${job.company} ${(job.notes || []).join(' ')}`.toLowerCase();
    jdAnalysis.domainKeywords.forEach(keyword => {
      if (jobText.includes(keyword.toLowerCase())) {
        matchCount += 0.5;
      }
    });

    // Normalize score to 0-1 range
    const maxPossibleScore = Math.max(allRequiredSkills.length, 1);
    const matchScore = Math.min(matchCount / maxPossibleScore, 1);

    return {
      matchScore,
      matchedSkills: [...new Set(matchedSkills)] // Remove duplicates
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

