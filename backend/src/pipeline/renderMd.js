/**
 * Renders a ResumePlan into Markdown format
 * @param {import('./types').ResumePlan} plan
 * @returns {string}
 */
function renderMarkdown(plan) {
  const lines = [];

  // Header
  lines.push(`# ${plan.header.name}`);
  if (plan.header.titleLine) {
    lines.push(`**${plan.header.titleLine}**`);
  }
  lines.push('');

  // Summary
  if (plan.summary) {
    lines.push('## Summary');
    lines.push(plan.summary.trim());
    lines.push('');
  }

  // Skills
  if (plan.skills && plan.skills.length > 0) {
    lines.push('## Skills');
    // Group skills if they're objects with sections, otherwise treat as flat list
    if (typeof plan.skills[0] === 'object' && plan.skills[0].section) {
      plan.skills.forEach(skillGroup => {
        if (skillGroup.section && skillGroup.list) {
          lines.push(`### ${skillGroup.section}`);
          if (Array.isArray(skillGroup.list)) {
            lines.push(skillGroup.list.join(', '));
          } else {
            lines.push(skillGroup.list);
          }
          lines.push('');
        }
      });
    } else {
      lines.push(plan.skills.map(s => `- ${s}`).join('\n'));
      lines.push('');
    }
  }

  // Experience
  if (plan.experience && plan.experience.length > 0) {
    lines.push('## Experience');
    plan.experience.forEach(exp => {
      lines.push(`### ${exp.title} — ${exp.company}`);
      if (exp.location || exp.dateRange) {
        const locationDate = [exp.location, exp.dateRange].filter(Boolean).join(' | ');
        lines.push(locationDate);
      }
      if (exp.bullets && exp.bullets.length > 0) {
        exp.bullets.forEach(bullet => {
          lines.push(`- ${bullet}`);
        });
      }
      lines.push('');
    });
  }

  // Projects
  if (plan.projects && plan.projects.length > 0) {
    lines.push('## Projects');
    plan.projects.forEach(project => {
      lines.push(`### ${project.name}`);
      if (project.bullets && project.bullets.length > 0) {
        project.bullets.forEach(bullet => {
          lines.push(`- ${bullet}`);
        });
      }
      lines.push('');
    });
  }

  // Education
  if (plan.education && plan.education.length > 0) {
    lines.push('## Education');
    plan.education.forEach(edu => {
      const parts = [edu.school];
      if (edu.degree) {
        parts.push(edu.degree);
      }
      if (edu.dateRange) {
        parts.push(`(${edu.dateRange})`);
      }
      lines.push(parts.join(' — '));
    });
    lines.push('');
  }

  return lines.join('\n');
}

module.exports = { renderMarkdown };

