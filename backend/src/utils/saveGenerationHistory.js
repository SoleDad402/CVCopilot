/**
 * Shared utility: save a generated resume to history + create job application.
 *
 * Used by both:
 * - CVCopilot manual generation (index.js)
 * - BidCopilot auto-bid generation (routes/bidcopilot.js)
 */
const User = require('../models/User');
const JobApplication = require('../models/JobApplication');

/**
 * Save a resume generation to history and optionally create a job application.
 *
 * @param {object} params
 * @param {string} params.email - User's email to look up
 * @param {string} params.userId - User ID (optional, looked up from email if not provided)
 * @param {string} params.companyName - Company name
 * @param {string} params.jobTitle - Job title / role
 * @param {string} params.jobDescription - Job description text
 * @param {string} params.jobUrl - Job posting URL (optional)
 * @param {string} params.source - "manual" | "autobid" (for notes)
 * @param {string} params.filename - Generated resume filename
 * @returns {{ resumeRequestId: string|null, jobApplicationId: string|null }}
 */
async function saveGenerationHistory({
  email,
  userId,
  companyName,
  jobTitle,
  jobDescription,
  jobUrl,
  source = 'autobid',
  filename,
}) {
  const result = { resumeRequestId: null, jobApplicationId: null };

  try {
    // Look up user if no userId provided
    if (!userId && email) {
      const user = await User.findByEmail(email);
      if (user) userId = user.id;
    }
    if (!userId) {
      console.warn('[saveGenerationHistory] No user found for', email);
      return result;
    }

    // Save resume request
    result.resumeRequestId = await User.addResumeRequest(userId, {
      company_name: companyName || '',
      role: jobTitle || '',
      job_description: (jobDescription || '').substring(0, 5000),
    });

    // Create job application entry
    if (companyName || jobTitle) {
      const app = await JobApplication.create(userId, {
        company_name: companyName || '',
        position: jobTitle || '',
        job_url: jobUrl || '',
        status: 'applied',
        notes: source === 'autobid'
          ? `Auto-bid via BidCopilot. Resume: ${filename || 'N/A'}`
          : `Generated via CVCopilot. Resume: ${filename || 'N/A'}`,
        resume_request_id: result.resumeRequestId,
      });
      result.jobApplicationId = app?.id || null;
    }

    console.log(`[saveGenerationHistory] Saved: ${source} | ${companyName} | ${jobTitle} | user=${userId}`);
  } catch (err) {
    console.warn('[saveGenerationHistory] Failed (non-fatal):', err.message);
  }

  return result;
}

module.exports = saveGenerationHistory;
