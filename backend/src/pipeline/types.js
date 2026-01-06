/**
 * @typedef {Object} EmploymentItem
 * @property {string} title
 * @property {string} company
 * @property {string} location
 * @property {string} startDate - Format: "2022-01" or "Oct 2022"
 * @property {string} endDate - Format: "2024-03" or "Present"
 * @property {string[]} [notes] - Short bullets or hints
 */

/**
 * @typedef {Object} CreateResumeInput
 * @property {string} jobDescription
 * @property {EmploymentItem[]} employmentHistory
 * @property {string[]} [voiceSamples] - Small snippets user actually wrote
 * @property {Object} [options]
 * @property {number} [options.maxPages] - 1 or 2 pages
 * @property {boolean} [options.includeProjects]
 * @property {boolean} [options.includeEducation]
 */

/**
 * @typedef {Object} JdAnalysis
 * @property {string} roleTitle
 * @property {"Junior"|"Mid"|"Senior"|"Lead"|"Principal"} seniority
 * @property {string[]} mustHaveSkills
 * @property {string[]} niceToHaveSkills
 * @property {string[]} domainKeywords
 * @property {string[]} responsibilities
 */

/**
 * @typedef {Object} ScoredJob
 * @property {EmploymentItem} job
 * @property {number} matchScore - 0-1
 * @property {string[]} matchedSkills
 */

/**
 * @typedef {Object} ResumePlan
 * @property {Object} header
 * @property {string} header.name
 * @property {string} header.titleLine
 * @property {string} summary
 * @property {string[]} skills
 * @property {Object[]} experience
 * @property {string} experience[].title
 * @property {string} experience[].company
 * @property {string} experience[].location
 * @property {string} experience[].dateRange
 * @property {string[]} experience[].bullets
 * @property {Object[]} [projects]
 * @property {string} projects[].name
 * @property {string[]} projects[].bullets
 * @property {Object[]} [education]
 * @property {string} education[].school
 * @property {string} education[].degree
 * @property {string} education[].dateRange
 */

module.exports = {};

