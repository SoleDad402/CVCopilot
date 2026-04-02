/**
 * Shared text utility functions.
 */

/** Remove control characters from text. */
function clearedText(text) {
  if (!text) return '';
  return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
}

/** Remove emojis and special characters from job descriptions. */
function cleanJobDescription(text) {
  if (!text) return '';
  return text
    .replace(/[\u{1F600}-\u{1F9FF}]/gu, '')
    .replace(/[\u{2600}-\u{27BF}]/gu, '')
    .replace(/[\u{FE00}-\u{FE0F}]/gu, '')
    .trim();
}

/** Escape XML special characters. */
function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Convert markdown bold to Word XML inline runs. */
function markdownToWordXml(text) {
  if (!text) return '';
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map(part => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const inner = part.slice(2, -2);
      return `<w:r><w:rPr><w:b/><w:sz w:val="22"/></w:rPr><w:t xml:space="preserve">${escapeXml(inner)}</w:t></w:r>`;
    }
    return `<w:r><w:rPr><w:sz w:val="22"/></w:rPr><w:t xml:space="preserve">${escapeXml(part)}</w:t></w:r>`;
  }).join('');
}

/** Wrap markdown text in a Word XML bullet paragraph. */
function markdownToWordXmlWithBullet(text) {
  const xmlContent = markdownToWordXml(text);
  return `<w:p><w:pPr><w:pStyle w:val="ListBullet"/></w:pPr>${xmlContent}</w:p>`;
}

/**
 * Normalize a date string to "Mon YYYY" format.
 * Handles: "2014-11", "11/2014", "Nov 2014", "November 2014", "2014"
 */
function normalizeDate(dateStr) {
  if (!dateStr || dateStr === 'Present') return dateStr;
  const s = dateStr.trim();

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthsFull = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const isoMatch = s.match(/^(\d{4})-(\d{1,2})$/);
  if (isoMatch) return `${months[parseInt(isoMatch[2], 10) - 1]} ${isoMatch[1]}`;

  const slashMatch = s.match(/^(\d{1,2})\/(\d{4})$/);
  if (slashMatch) return `${months[parseInt(slashMatch[1], 10) - 1]} ${slashMatch[2]}`;

  const shortMatch = s.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}$/i);
  if (shortMatch) return s;

  const fullMatch = s.match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (fullMatch) {
    const idx = monthsFull.findIndex(m => m.toLowerCase() === fullMatch[1].toLowerCase());
    if (idx >= 0) return `${months[idx]} ${fullMatch[2]}`;
  }

  if (/^\d{4}$/.test(s)) return s;

  return s;
}

/** Convert resume JSON to plain text. */
function buildPlainText(resumeJson) {
  const lines = [];

  lines.push(resumeJson.name || '');
  const contact = resumeJson.contact || {};
  const contactParts = [contact.email, contact.phonenumber, contact.linkedinURL, contact.location]
    .filter(Boolean);
  if (contactParts.length) lines.push(contactParts.join(' | '));
  lines.push('');

  if (resumeJson.summary) {
    lines.push('PROFESSIONAL SUMMARY');
    lines.push(resumeJson.summary.replace(/\*\*(.+?)\*\*/g, '$1'));
    lines.push('');
  }

  if (resumeJson.experience?.length) {
    lines.push('PROFESSIONAL EXPERIENCE');
    for (const exp of resumeJson.experience) {
      lines.push(`${exp.position || exp.title} | ${exp.company} | ${exp.location || ''} | ${exp.dates || exp.dateRange || ''}`);
      for (const bullet of (exp.bullets || [])) {
        lines.push(`  - ${bullet.replace(/\*\*(.+?)\*\*/g, '$1')}`);
      }
      lines.push('');
    }
  }

  if (resumeJson.skills?.length) {
    lines.push('SKILLS');
    for (const section of resumeJson.skills) {
      lines.push(`${section.section}: ${section.list.join(', ')}`);
    }
    lines.push('');
  }

  if (resumeJson.education?.length) {
    lines.push('EDUCATION');
    for (const edu of resumeJson.education) {
      lines.push(`${edu.school || edu.school_name} | ${edu.program || edu.degree || ''} | ${edu.dates || ''}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

module.exports = {
  clearedText,
  cleanJobDescription,
  escapeXml,
  markdownToWordXml,
  markdownToWordXmlWithBullet,
  normalizeDate,
  buildPlainText,
};
