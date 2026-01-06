/**
 * Converts a ResumePlan to the JSON format expected by the system
 * @param {import('./types').ResumePlan} plan
 * @param {Object} userContact
 * @returns {Object}
 */
function convertPlanToJson(plan, userContact) {
  // Parse markdown summary to extract text (removing markdown formatting for JSON)
  const parseMarkdownText = (md) => {
    if (!md) return '';
    // Remove markdown bold but keep the text
    return md.replace(/\*\*(.+?)\*\*/g, '$1');
  };

  // Convert skills array to the expected format
  const formatSkills = (skills) => {
    if (!skills || skills.length === 0) return [];
    
    // If skills are already in section/list format
    if (typeof skills[0] === 'object' && skills[0].section) {
      return skills.map(skill => ({
        section: skill.section,
        list: Array.isArray(skill.list) ? skill.list : [skill.list]
      }));
    }
    
    // If skills are flat, group them into sections
    return [{
      section: 'Technical Skills',
      list: skills
    }];
  };

  return {
    name: plan.header.name,
    contact: {
      email: userContact.email || '',
      phonenumber: userContact.phone || '',
      linkedinURL: userContact.linkedin_url || '',
      location: userContact.location || '',
      github: userContact.github_url || ''
    },
    summary: plan.summary, // Keep markdown for Word XML conversion
    experience: plan.experience.map(exp => ({
      company: exp.company,
      dates: exp.dateRange,
      location: exp.location,
      position: exp.title,
      bullets: exp.bullets || []
    })),
    skills: formatSkills(plan.skills),
    education: plan.education ? plan.education.map(edu => ({
      school: edu.school,
      location: edu.location || '',
      dates: edu.dateRange,
      program: edu.degree || ''
    })) : [],
    certifications: [] // Certifications handled separately if needed
  };
}

module.exports = { convertPlanToJson };

