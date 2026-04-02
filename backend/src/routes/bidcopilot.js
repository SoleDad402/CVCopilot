/**
 * BidCopilot Integration API — /api/v1/generate
 *
 * Synchronous resume generation endpoint for BidCopilot's ResumeClient.
 * No auth required (internal service-to-service call).
 *
 * Request:  ResumeRequest  (see bidcopilot/resume_integration/contracts.py)
 * Response: ResumeResponse (resume_file as base64, resume_text, etc.)
 */
const express = require('express');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const router = express.Router();

/**
 * POST /api/v1/generate
 *
 * Accepts BidCopilot ResumeRequest, runs CVCopilot pipeline, returns ResumeResponse.
 *
 * Request body (JSON):
 *   user_profile: {
 *     full_name, email, phone, linkedin_url, github_url, location,
 *     employment_history: [{ title, company, location, start_date, end_date, is_current, description }],
 *     education: [{ school_name, location, degree, field_of_study, start_date, end_date, gpa, description }],
 *     skills: [{ name, level }]  (optional, for keyword enrichment)
 *   }
 *   job_description: string
 *   job_title: string
 *   company_name: string
 *   target_keywords: string[]  (optional)
 *   format: "pdf" | "docx"     (default "pdf")
 *   style_preset: string       (unused for now)
 *   include_cover_letter: bool  (default true)
 *   bullet_count: number       (default 5, range 1-10)
 *
 * Response body (JSON):
 *   resume_file: string        (base64-encoded file bytes)
 *   resume_text: string        (plain text resume)
 *   cover_letter_file: string|null
 *   cover_letter_text: string|null
 *   filename: string
 *   tailoring_notes: string
 */
router.post('/generate', async (req, res) => {
  const startTime = Date.now();

  try {
    const {
      user_profile,
      job_description,
      job_title,
      company_name,
      target_keywords = [],
      format = 'pdf',
      include_cover_letter = true,
      bullet_count,
    } = req.body;

    // --- Validate required fields ---
    if (!job_description) {
      return res.status(400).json({ error: 'job_description is required' });
    }
    if (!user_profile) {
      return res.status(400).json({ error: 'user_profile is required' });
    }

    const profile = user_profile;
    const userName = profile.full_name || 'Candidate';

    // --- Build employment history in pipeline format ---
    const employmentHistory = (profile.employment_history || []).map(job => ({
      title: job.title || job.position || '',
      company: job.company || job.company_name || '',
      location: job.location || '',
      startDate: job.start_date || '',
      endDate: job.is_current ? 'Present' : (job.end_date || ''),
      notes: [],
    }));

    // --- Build education in pipeline format ---
    const education = (profile.education || []).map(edu => ({
      school_name: edu.school_name || edu.school || '',
      location: edu.location || '',
      degree: edu.degree || '',
      field_of_study: edu.field_of_study || '',
      start_date: edu.start_date || '',
      end_date: edu.end_date || '',
      gpa: edu.gpa || '',
      description: edu.description || '',
    }));

    const userContact = {
      email: profile.email || '',
      phone: profile.phone || '',
      linkedin_url: profile.linkedin_url || '',
      github_url: profile.github_url || '',
      location: profile.location || '',
    };

    // --- Clean job description ---
    const cleanedJd = cleanJobDescription(job_description);

    // --- Get OpenAI client from app context ---
    const openai = req.app.get('openai');
    if (!openai) {
      return res.status(503).json({ error: 'OpenAI client not configured on server' });
    }

    // --- Run pipeline (V2 by default) ---
    const { runPipeline } = require('../pipeline');
    const { convertPlanToJson } = require('../pipeline/convertToJson');

    console.log(`[BidCopilot API] Generating resume for "${userName}" targeting "${job_title || 'N/A'}" at "${company_name || 'N/A'}"`);

    const plan = await runPipeline(2, {
      jobDescription: cleanedJd,
      employmentHistory,
      voiceSamples: [],
      options: { includeEducation: true, includeProjects: false },
      userName,
      userContact,
      education,
      openai,
      bulletCount: Math.min(Math.max(Number(bullet_count) || 5, 1), 10),
      returnMarkdown: false,
    });

    // --- Convert plan to JSON format ---
    const resumeJson = convertPlanToJson(plan, userContact);

    // --- Build plain text resume ---
    const resumeText = buildPlainText(resumeJson);

    // --- Generate file (DOCX or PDF) ---
    let fileBuffer;
    let filename;

    const safeName = userName.replace(/[^a-zA-Z0-9]/g, '_');
    const safeCompany = (company_name || 'resume').replace(/[^a-zA-Z0-9]/g, '_');

    if (format === 'docx') {
      fileBuffer = generateDocx(resumeJson);
      filename = `${safeName}_${safeCompany}.docx`;
    } else {
      fileBuffer = await generatePdf(resumeJson);
      filename = `${safeName}_${safeCompany}.pdf`;
    }

    // --- Generate cover letter if requested ---
    let coverLetterText = null;
    let coverLetterFile = null;

    if (include_cover_letter) {
      try {
        coverLetterText = await generateCoverLetter(openai, {
          jobDescription: cleanedJd,
          jobTitle: job_title,
          companyName: company_name,
          userName,
          resumeSummary: resumeJson.summary,
          experience: resumeJson.experience,
          userContact: { ...userContact, address: profile.address, city: profile.city, state: profile.state, zip_code: profile.zip_code },
        });
        // Encode cover letter as plain text bytes (base64)
        coverLetterFile = Buffer.from(coverLetterText, 'utf-8').toString('base64');
      } catch (err) {
        console.error('[BidCopilot API] Cover letter generation failed:', err.message);
        // Non-fatal — continue without cover letter
      }
    }

    const elapsed = Date.now() - startTime;
    console.log(`[BidCopilot API] Resume generated in ${(elapsed / 1000).toFixed(1)}s`);

    // --- Return ResumeResponse ---
    res.json({
      resume_file: fileBuffer.toString('base64'),
      resume_text: resumeText,
      cover_letter_file: coverLetterFile,
      cover_letter_text: coverLetterText,
      filename,
      tailoring_notes: `Generated via CVCopilot V2 pipeline in ${(elapsed / 1000).toFixed(1)}s. ` +
        `Target: ${job_title || 'N/A'} at ${company_name || 'N/A'}.`,
    });

  } catch (error) {
    console.error('[BidCopilot API] Generation failed:', error);
    res.status(500).json({
      error: 'Resume generation failed',
      detail: error.message,
    });
  }
});

/**
 * GET /api/v1/health
 * Quick health check for BidCopilot connectivity tests.
 */
router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'cvcopilot', version: 'v1' });
});

// ─── Helper functions ──────────────────────────────────────────────────────

function cleanJobDescription(text) {
  if (!text) return '';
  return text
    .replace(/[\u{1F600}-\u{1F9FF}]/gu, '')
    .replace(/[\u{2600}-\u{27BF}]/gu, '')
    .replace(/[\u{FE00}-\u{FE0F}]/gu, '')
    .trim();
}

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
    // Strip markdown bold
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

/**
 * Render markdown bold to Word XML inline runs.
 */
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

function markdownToWordXmlWithBullet(text) {
  const xmlContent = markdownToWordXml(text);
  return `<w:p><w:pPr><w:pStyle w:val="ListBullet"/></w:pPr>${xmlContent}</w:p>`;
}

function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function clearedText(text) {
  if (!text) return '';
  return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
}

function generateDocx(resumeJson) {
  const templatePath = path.join(__dirname, '..', 'templates', 'resume-template.docx');
  const content = fs.readFileSync(templatePath, 'binary');
  const zip = new PizZip(content);
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

  const templateData = {
    name: resumeJson.name || '',
    phone: resumeJson.contact?.phonenumber || '',
    email: resumeJson.contact?.email || '',
    linkedinURL: resumeJson.contact?.linkedinURL || '',
    location: resumeJson.contact?.location || '',
    contact: [
      resumeJson.contact?.location,
      resumeJson.contact?.email,
      resumeJson.contact?.phonenumber,
      resumeJson.contact?.linkedinURL,
    ].filter(Boolean).join(' | '),
    summary: markdownToWordXml(resumeJson.summary) || '',
    achievements: (resumeJson.achievements || []).map(achievement => {
      const text = typeof achievement === 'object' ? achievement.text : achievement;
      const company = typeof achievement === 'object' ? achievement.company : null;
      const line = company ? `${text} - at **${company}**` : text;
      return { rawXml: markdownToWordXmlWithBullet(line) };
    }),
    experience: (resumeJson.experience || []).map(exp => ({
      company: clearedText(exp.company) || '',
      location: clearedText(exp.location) || '',
      position: clearedText(exp.position) || '',
      dates: clearedText(exp.dates) || '',
      bullets: (exp.bullets || []).map(bullet => ({
        rawXml: markdownToWordXmlWithBullet(bullet),
      })),
    })),
    skills: (resumeJson.skills || []).map(section => {
      if (section?.section && section?.list) {
        return { list: markdownToWordXml(`**${section.section}**: ${section.list.join(', ')}`) };
      }
      return null;
    }).filter(Boolean),
    education: (resumeJson.education || []).map(edu => ({
      school: clearedText(edu.school) || '',
      location: clearedText(edu.location) || '',
      program: clearedText(edu.program) || '',
      dates: clearedText(edu.dates) || '',
    })),
    certifications: (resumeJson.certifications || []).map(cert => ({
      name: clearedText(cert.name) || '',
      issued: clearedText(cert.issued) || '',
    })),
  };

  doc.render(templateData);

  return doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });
}

function generatePdf(resumeJson) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];

    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    doc.fontSize(24).font('Helvetica-Bold')
      .text(resumeJson.name || '', { align: 'center' })
      .moveDown(0.5);

    const contactInfo = [
      resumeJson.contact?.email,
      resumeJson.contact?.phonenumber,
      resumeJson.contact?.linkedinURL,
      resumeJson.contact?.location,
    ].filter(Boolean).join(' | ');

    doc.fontSize(11).font('Helvetica')
      .text(contactInfo, { align: 'center' })
      .moveDown(1);

    // Summary
    if (resumeJson.summary) {
      doc.fontSize(14).font('Helvetica-Bold').text('Professional Summary').moveDown(0.5);
      doc.fontSize(11).font('Helvetica')
        .text(resumeJson.summary.replace(/\*\*(.+?)\*\*/g, '$1'))
        .moveDown(1);
    }

    // Experience
    if (resumeJson.experience?.length) {
      doc.fontSize(14).font('Helvetica-Bold').text('Professional Experience').moveDown(0.5);
      for (const exp of resumeJson.experience) {
        doc.fontSize(12).font('Helvetica-Bold')
          .text(`${exp.company}${exp.location ? ', ' + exp.location : ''}`)
          .moveDown(0.3);
        doc.fontSize(11).font('Helvetica')
          .text(`${exp.position} (${exp.dates})`)
          .moveDown(0.3);
        for (const bullet of (exp.bullets || [])) {
          doc.fontSize(11).font('Helvetica')
            .text(`• ${bullet.replace(/\*\*(.+?)\*\*/g, '$1')}`, { indent: 20 })
            .moveDown(0.2);
        }
        doc.moveDown(0.4);
      }
    }

    // Skills
    if (resumeJson.skills?.length) {
      doc.fontSize(14).font('Helvetica-Bold').text('Skills').moveDown(0.5);
      for (const section of resumeJson.skills) {
        doc.fontSize(11).font('Helvetica-Bold').text(section.section, { continued: true });
        doc.font('Helvetica').text(`: ${section.list.join(', ')}`).moveDown(0.3);
      }
      doc.moveDown(0.5);
    }

    // Education
    if (resumeJson.education?.length) {
      doc.fontSize(14).font('Helvetica-Bold').text('Education').moveDown(0.5);
      for (const edu of resumeJson.education) {
        doc.fontSize(12).font('Helvetica-Bold')
          .text(`${edu.school}${edu.location ? ', ' + edu.location : ''}`)
          .moveDown(0.3);
        doc.fontSize(11).font('Helvetica')
          .text(`${edu.program} (${edu.dates})`)
          .moveDown(0.3);
      }
    }

    doc.end();
  });
}

async function generateCoverLetter(openai, { jobDescription, jobTitle, companyName, userName, resumeSummary, experience, userContact }) {
  const topRoles = (experience || []).slice(0, 3).map(e =>
    `${e.position} at ${e.company}`
  ).join(', ');

  const contact = userContact || {};
  const addressParts = [contact.address, contact.city, contact.state, contact.zip_code].filter(Boolean);
  const addressBlock = addressParts.length > 0
    ? `\n\nCandidate contact info (use in the letter header):\n${userName}\n${addressParts.join(', ')}\n${contact.email || ''}\n${contact.phone || ''}`
    : `\n\nCandidate contact info:\n${userName}\n${contact.email || ''}\n${contact.phone || ''}\n${contact.location || ''}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.5,
    max_tokens: 1200,
    messages: [
      {
        role: 'system',
        content: `You are a professional cover letter writer. Write a concise, compelling cover letter (3-4 paragraphs) that connects the candidate's background to the specific role. Be genuine, not generic. Do not use clichés like "I am excited to apply" or "I believe I would be a great fit". Use the candidate's real contact information in the header — never use placeholder text like "[Your Address]" or "[City, State, Zip]".`,
      },
      {
        role: 'user',
        content: `Write a cover letter for:
Candidate: ${userName}
Role: ${jobTitle || 'the advertised position'}
Company: ${companyName || 'the company'}
Recent experience: ${topRoles}
Professional summary: ${resumeSummary || ''}${addressBlock}

Job description:
${jobDescription.substring(0, 3000)}`,
      },
    ],
  });

  return response.choices[0].message.content.trim();
}

// ─── Auto-Bid Test Endpoints ──────────────────────────────────────────────

/**
 * POST /api/v1/autobid/extract
 *
 * Extract job metadata from a Greenhouse URL via their public boards API.
 * Returns structured job data (title, company, description, questions).
 *
 * Request body: { job_url: string }
 * Response: { job_id, title, company, location, department, description, questions, url }
 */
router.post('/autobid/extract', async (req, res) => {
  try {
    const { job_url } = req.body;
    if (!job_url) {
      return res.status(400).json({ error: 'job_url is required' });
    }

    // Parse Greenhouse URL to get board_token and job_id
    const ghMatch = job_url.match(
      /(?:boards|job-boards)\.greenhouse\.io\/(?:[^/]+\/)?([^/]+)\/jobs\/(\d+)/i
    ) || job_url.match(
      /([a-z0-9_-]+)\.greenhouse\.io\/jobs\/(\d+)/i
    );

    if (!ghMatch) {
      return res.status(400).json({ error: 'Not a recognized Greenhouse URL' });
    }

    const boardToken = ghMatch[1];
    const jobId = ghMatch[2];

    // Fetch from Greenhouse public API
    const apiUrl = `https://boards-api.greenhouse.io/v1/boards/${boardToken}/jobs/${jobId}?questions=true`;
    const response = await fetch(apiUrl);

    if (!response.ok) {
      return res.status(response.status).json({
        error: `Greenhouse API returned ${response.status}`,
      });
    }

    const data = await response.json();

    // Strip HTML from description
    const descHtml = data.content || '';
    const descText = descHtml
      .replace(/<[^>]+>/g, '\n')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    const departments = data.departments || [];
    const questions = (data.questions || []).map(q => ({
      label: q.label,
      required: q.required,
      fields: (q.fields || []).map(f => ({
        name: f.name,
        type: f.type,
        values: f.values || [],
      })),
    }));

    res.json({
      job_id: String(data.id),
      title: data.title || '',
      company: boardToken,
      location: data.location?.name || '',
      department: departments[0]?.name || '',
      description: descText,
      description_html: descHtml,
      questions,
      url: data.absolute_url || job_url,
    });
  } catch (error) {
    console.error('[AutoBid] Extract failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/v1/autobid/preview
 *
 * Dry-run of the auto-bid: extracts the job, maps profile fields to form
 * questions, and generates a tailored resume — but does NOT submit anything.
 *
 * Request body: {
 *   job_url: string,
 *   user_profile: { full_name, email, phone, linkedin_url, ... },
 *   generate_resume: boolean (default true)
 * }
 *
 * Response: {
 *   job: { title, company, location, ... },
 *   field_map: { field_name: value, ... },
 *   resume: { filename, resume_text, cover_letter_text } | null,
 *   summary: { fields_filled, questions_total, questions_answered }
 * }
 */
router.post('/autobid/preview', async (req, res) => {
  const startTime = Date.now();

  try {
    const { job_url, user_profile, generate_resume = true } = req.body;

    if (!job_url || !user_profile) {
      return res.status(400).json({ error: 'job_url and user_profile are required' });
    }

    // Step 1: Extract job metadata (reuse extract logic)
    const ghMatch = job_url.match(
      /(?:boards|job-boards)\.greenhouse\.io\/(?:[^/]+\/)?([^/]+)\/jobs\/(\d+)/i
    ) || job_url.match(
      /([a-z0-9_-]+)\.greenhouse\.io\/jobs\/(\d+)/i
    );

    if (!ghMatch) {
      return res.status(400).json({ error: 'Not a recognized Greenhouse URL' });
    }

    const boardToken = ghMatch[1];
    const jobId = ghMatch[2];
    const apiUrl = `https://boards-api.greenhouse.io/v1/boards/${boardToken}/jobs/${jobId}?questions=true`;
    const ghResp = await fetch(apiUrl);

    if (!ghResp.ok) {
      return res.status(ghResp.status).json({ error: `Greenhouse API returned ${ghResp.status}` });
    }

    const jobData = await ghResp.json();
    const descText = (jobData.content || '')
      .replace(/<[^>]+>/g, '\n').replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/\n{3,}/g, '\n\n').trim();

    const job = {
      job_id: String(jobData.id),
      title: jobData.title || '',
      company: boardToken,
      location: jobData.location?.name || '',
      department: (jobData.departments || [])[0]?.name || '',
      description: descText,
      url: jobData.absolute_url || job_url,
    };

    // Step 2: Map profile to form fields
    const questions = jobData.questions || [];
    const fieldMap = {};
    let questionsAnswered = 0;

    const profile = user_profile;
    const nameParts = (profile.full_name || '').split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';

    // Find current company from employment history
    const currentJob = (profile.employment_history || []).find(e => e.is_current);
    const currentCompany = currentJob?.company || (profile.employment_history || [])[0]?.company || '';

    // Build full location string from structured address fields
    const fullLocation = [profile.city, profile.state, profile.country].filter(Boolean).join(', ') || profile.location || '';
    const fullAddress = [profile.address, profile.city, profile.state, profile.zip_code].filter(Boolean).join(', ');

    const labelMap = {
      'first name': firstName,
      'last name': lastName,
      'email': profile.email || '',
      'phone': profile.phone || '',
      'phone number': profile.phone || '',
      'linkedin url': profile.linkedin_url || '',
      'linkedin profile': profile.linkedin_url || '',
      'linkedin profile url': profile.linkedin_url || '',
      'github url': profile.github_url || '',
      'github profile url': profile.github_url || '',
      'website': profile.portfolio_url || '',
      'website url': profile.portfolio_url || '',
      'portfolio': profile.portfolio_url || '',
      'portfolio url': profile.portfolio_url || '',
      'location': fullLocation,
      'city': profile.city || profile.location || '',
      'current location': fullLocation,
      'current company': currentCompany,
      'current title': profile.current_title || '',
      'address': fullAddress,
      'street address': profile.address || '',
      'state': profile.state || '',
      'zip': profile.zip_code || '',
      'zip code': profile.zip_code || '',
      'postal code': profile.zip_code || '',
      'country': profile.country || '',
      'pronouns': profile.preferred_pronouns || '',
      'preferred pronouns': profile.preferred_pronouns || '',
      'preferred first name': firstName,
      'date of birth': profile.date_of_birth || '',
      'birthday': profile.date_of_birth || '',
    };

    // EEO helper — maps question keywords to profile values for dropdown matching
    const eeoMap = {
      gender: profile.gender || '',
      race: profile.race_ethnicity || '',
      ethnicity: profile.race_ethnicity || '',
      disability: profile.disability_status || '',
      veteran: profile.veteran_status || '',
      'convicted': profile.criminal_conviction || '',
      'felony': profile.criminal_conviction || '',
    };

    for (const question of questions) {
      const label = (question.label || '').trim();
      const ll = label.toLowerCase();
      const required = question.required;
      const fields = question.fields || [];

      for (const field of fields) {
        const fname = field.name || '';
        const ftype = field.type || '';
        const values = field.values || [];

        // Skip file uploads
        if (ftype === 'input_file') continue;

        // Standard field mapping
        const mapped = labelMap[label.toLowerCase()];
        if (mapped !== undefined && mapped !== '') {
          fieldMap[fname] = { value: mapped, source: 'profile', label, required };
          continue;
        }

        // Yes/No dropdowns
        if (values.length === 2) {
          const labels = values.map(v => (v.label || '').toLowerCase());
          if (labels.includes('yes') && labels.includes('no')) {
            let answer = 'yes';
            if (ll.includes('sponsor') || ll.includes('visa') || ll.includes('immigration')) {
              answer = profile.visa_sponsorship_needed ? 'yes' : 'no';
            } else if (ll.includes('authorized') || ll.includes('eligible') || ll.includes('legally')) {
              answer = profile.visa_sponsorship_needed ? 'no' : 'yes';
            } else if (ll.includes('relocat')) {
              answer = profile.willing_to_relocate ? 'yes' : 'no';
            }
            const picked = values.find(v => (v.label || '').toLowerCase() === answer);
            if (picked) {
              fieldMap[fname] = {
                value: String(picked.value ?? picked.label),
                source: 'auto',
                label,
                required,
              };
              questionsAnswered++;
              continue;
            }
          }
        }

        // Pronouns dropdown — match from profile
        if (values.length > 0 && ftype.includes('select') && ll.includes('pronoun')) {
          if (profile.preferred_pronouns) {
            const pronounLower = profile.preferred_pronouns.toLowerCase();
            const match = values.find(v => (v.label || '').toLowerCase().includes(pronounLower));
            if (match) {
              fieldMap[fname] = { value: String(match.value ?? match.label), source: 'auto', label, required };
              questionsAnswered++;
              continue;
            }
          }
        }

        // EEO dropdowns (gender, race, disability, veteran)
        if (values.length > 0 && ftype.includes('select')) {
          const eeoKey = Object.keys(eeoMap).find(k => ll.includes(k));
          if (eeoKey && eeoMap[eeoKey]) {
            const profileVal = eeoMap[eeoKey].toLowerCase();
            const match = values.find(v => (v.label || '').toLowerCase().includes(profileVal));
            if (match) {
              fieldMap[fname] = { value: String(match.value ?? match.label), source: 'auto', label, required };
              questionsAnswered++;
              continue;
            }
          }
        }

        // Other dropdowns
        if (values.length > 0 && ftype.includes('select')) {
          fieldMap[fname] = {
            value: null,
            source: 'needs_selection',
            label,
            required,
            options: values.map(v => v.label),
          };
          continue;
        }

        // "When can you start" questions
        if ((ftype === 'input_text' || ftype === 'textarea') && (ll.includes('when can you start') || ll.includes('start date') || ll.includes('availability'))) {
          const availMap = { immediately: 'Immediately', '2_weeks': '2 weeks', '1_month': '1 month', '2_months': '2 months', '3_months': '3+ months' };
          const val = availMap[profile.start_availability] || 'Immediately';
          fieldMap[fname] = { value: val, source: 'auto', label, required };
          questionsAnswered++;
          continue;
        }

        // "From where do you intend to work" or similar location questions
        if ((ftype === 'input_text' || ftype === 'textarea') && (ll.includes('where') || ll.includes('intend to work') || ll.includes('work from'))) {
          const workLocation = fullLocation || profile.location || '';
          if (workLocation) {
            fieldMap[fname] = { value: workLocation, source: 'auto', label, required };
            questionsAnswered++;
            continue;
          }
        }

        // Custom text/textarea
        if (ftype === 'input_text' || ftype === 'textarea') {
          fieldMap[fname] = {
            value: null,
            source: required ? 'needs_input' : 'optional',
            label,
            required,
          };
          continue;
        }

        if (required) {
          fieldMap[fname] = { value: null, source: 'needs_input', label, required };
        }
      }
    }

    // Step 3: Generate resume (optional)
    let resumeResult = null;
    if (generate_resume) {
      try {
        const openai = req.app.get('openai');
        if (!openai) {
          resumeResult = { error: 'OpenAI client not configured' };
        } else {
          const { runPipeline } = require('../pipeline');
          const { convertPlanToJson } = require('../pipeline/convertToJson');

          const employmentHistory = (profile.employment_history || []).map(j => ({
            title: j.title || j.position || '',
            company: j.company || j.company_name || '',
            location: j.location || '',
            startDate: j.start_date || '',
            endDate: j.is_current ? 'Present' : (j.end_date || ''),
            notes: [],
          }));

          const education = (profile.education || []).map(e => ({
            school_name: e.school_name || '', location: e.location || '',
            degree: e.degree || '', field_of_study: e.field_of_study || '',
            start_date: e.start_date || '', end_date: e.end_date || '',
            gpa: e.gpa || '', description: e.description || '',
          }));

          const userContact = {
            email: profile.email || '', phone: profile.phone || '',
            linkedin_url: profile.linkedin_url || '', github_url: profile.github_url || '',
            location: profile.location || '',
          };

          console.log(`[AutoBid] Generating tailored resume for "${job.title}" at "${job.company}"`);

          const plan = await runPipeline(2, {
            jobDescription: cleanJobDescription(descText),
            employmentHistory,
            voiceSamples: [],
            options: { includeEducation: true, includeProjects: false },
            userName: profile.full_name || 'Candidate',
            userContact,
            education,
            openai,
            bulletCount: 5,
            returnMarkdown: false,
          });

          const resumeJson = convertPlanToJson(plan, userContact);
          const resumeText = buildPlainText(resumeJson);

          const safeName = (profile.full_name || 'Candidate').replace(/[^a-zA-Z0-9]/g, '_');
          const safeCompany = boardToken.replace(/[^a-zA-Z0-9]/g, '_');
          const filename = `${safeName}_${safeCompany}.pdf`;

          // Generate cover letter
          let coverLetterText = null;
          try {
            coverLetterText = await generateCoverLetter(openai, {
              jobDescription: descText.substring(0, 3000),
              jobTitle: job.title,
              companyName: job.company,
              userName: profile.full_name,
              resumeSummary: resumeJson.summary,
              experience: resumeJson.experience,
              userContact: {
                email: profile.email, phone: profile.phone, location: profile.location,
                address: profile.address, city: profile.city, state: profile.state, zip_code: profile.zip_code,
              },
            });
          } catch (e) {
            console.error('[AutoBid] Cover letter failed:', e.message);
          }

          resumeResult = {
            filename,
            resume_text: resumeText,
            cover_letter_text: coverLetterText,
            resume_json: resumeJson,
          };
        }
      } catch (err) {
        console.error('[AutoBid] Resume generation failed:', err.message);
        resumeResult = { error: err.message };
      }
    }

    const elapsed = Date.now() - startTime;
    const filled = Object.values(fieldMap).filter(f => f.value && f.source === 'profile').length;
    const autoAnswered = Object.values(fieldMap).filter(f => f.source === 'auto').length;

    res.json({
      job,
      field_map: fieldMap,
      resume: resumeResult,
      summary: {
        fields_filled: filled,
        auto_answered: autoAnswered,
        needs_input: Object.values(fieldMap).filter(f => f.source === 'needs_input').length,
        needs_selection: Object.values(fieldMap).filter(f => f.source === 'needs_selection').length,
        questions_total: questions.length,
        elapsed_ms: elapsed,
      },
    });

  } catch (error) {
    console.error('[AutoBid] Preview failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── Question Pattern Learning ────────────────────────────────────────────

const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/** Inline auth helper — extracts user from JWT. */
function getUserFromToken(req) {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

/**
 * Normalize a question into a reusable pattern.
 * "Why do you want to join Figma?" → "Why do you want to join {company}?"
 */
function normalizePattern(question, company) {
  let pattern = question.trim();
  if (company) {
    // Replace company name with placeholder (case-insensitive)
    const escaped = company.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    pattern = pattern.replace(new RegExp(escaped, 'gi'), '{company}');
  }
  return pattern;
}

/**
 * Categorize a question by its content.
 */
function categorizeQuestion(question) {
  const q = question.toLowerCase();
  if (q.includes('why') && (q.includes('join') || q.includes('interest') || q.includes('apply') || q.includes('want'))) return 'motivation';
  if (q.includes('looking for') || q.includes('next role') || q.includes('ideal role')) return 'role_fit';
  if (q.includes('describe') || q.includes('tell us about') || q.includes('example of')) return 'experience';
  if (q.includes('salary') || q.includes('compensation') || q.includes('pay')) return 'salary';
  if (q.includes('start') || q.includes('available') || q.includes('when can')) return 'availability';
  if (q.includes('hear about') || q.includes('how did you') || q.includes('source')) return 'source';
  return 'custom';
}

/**
 * POST /api/v1/autobid/patterns/track
 *
 * Track a user's choice (auto-gen or manual) for a question.
 * If auto_gen_count reaches the threshold, mark as learned.
 *
 * Body: { question, company, choice: "auto"|"manual", answer }
 */
router.post('/autobid/patterns/track', async (req, res) => {
  const user = getUserFromToken(req);
  if (!user) return res.status(401).json({ error: 'Auth required' });

  try {
    const { question, company, choice, answer } = req.body;
    if (!question || !choice) {
      return res.status(400).json({ error: 'question and choice required' });
    }

    const pattern = normalizePattern(question, company);
    const category = categorizeQuestion(question);
    const supabase = getSupabase();

    // Find existing user by email to get ID
    const { data: userData } = await supabase.from('users').select('id').eq('email', user.email).single();
    if (!userData) return res.status(404).json({ error: 'User not found' });
    const userId = userData.id;

    // Upsert the pattern
    const { data: existing } = await supabase
      .from('question_patterns')
      .select('*')
      .eq('user_id', userId)
      .eq('pattern', pattern)
      .maybeSingle();

    if (existing) {
      const updates = { updated_at: new Date().toISOString() };
      if (choice === 'auto') {
        updates.auto_gen_count = existing.auto_gen_count + 1;
        if (updates.auto_gen_count >= existing.threshold) {
          updates.is_learned = true;
        }
      } else {
        updates.manual_count = existing.manual_count + 1;
      }

      if (answer) {
        updates.last_answer = answer;
        // Append to sample_answers (keep last 5)
        const samples = Array.isArray(existing.sample_answers) ? existing.sample_answers : [];
        samples.push({ answer, company: company || '', timestamp: new Date().toISOString() });
        updates.sample_answers = samples.slice(-5);
      }

      await supabase.from('question_patterns').update(updates).eq('id', existing.id);
      res.json({ pattern, is_learned: updates.is_learned ?? existing.is_learned, auto_gen_count: updates.auto_gen_count ?? existing.auto_gen_count });
    } else {
      const newRow = {
        user_id: userId,
        pattern,
        category,
        auto_gen_count: choice === 'auto' ? 1 : 0,
        manual_count: choice === 'manual' ? 1 : 0,
        is_learned: false,
        threshold: 3,
        sample_answers: answer ? [{ answer, company: company || '', timestamp: new Date().toISOString() }] : [],
        last_answer: answer || '',
      };

      await supabase.from('question_patterns').insert(newRow);
      res.json({ pattern, is_learned: false, auto_gen_count: newRow.auto_gen_count });
    }
  } catch (error) {
    console.error('[Patterns] Track error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/v1/autobid/patterns/check
 *
 * Check if questions match learned patterns. Returns which questions
 * can be auto-filled and what the suggested answers are.
 *
 * Body: { questions: [{ label, company }], job_description }
 */
router.post('/autobid/patterns/check', async (req, res) => {
  const user = getUserFromToken(req);
  if (!user) return res.status(401).json({ error: 'Auth required' });

  try {
    const { questions, job_description } = req.body;
    if (!questions) return res.status(400).json({ error: 'questions required' });

    const supabase = getSupabase();
    const { data: userData } = await supabase.from('users').select('id').eq('email', user.email).single();
    if (!userData) return res.status(404).json({ error: 'User not found' });

    const { data: patterns } = await supabase
      .from('question_patterns')
      .select('*')
      .eq('user_id', userData.id);

    const results = {};
    for (const q of questions) {
      const normalized = normalizePattern(q.label, q.company);
      const match = (patterns || []).find(p => p.pattern === normalized);
      if (match) {
        results[q.label] = {
          pattern: match.pattern,
          is_learned: match.is_learned,
          auto_gen_count: match.auto_gen_count,
          category: match.category,
          last_answer: match.last_answer,
          sample_answers: match.sample_answers,
        };
      }
    }

    res.json({ matches: results });
  } catch (error) {
    console.error('[Patterns] Check error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/v1/autobid/patterns
 *
 * List all learned patterns for the current user (for settings page).
 */
router.get('/autobid/patterns', async (req, res) => {
  const user = getUserFromToken(req);
  if (!user) return res.status(401).json({ error: 'Auth required' });

  try {
    const supabase = getSupabase();
    const { data: userData } = await supabase.from('users').select('id').eq('email', user.email).single();
    if (!userData) return res.status(404).json({ error: 'User not found' });

    const { data, error } = await supabase
      .from('question_patterns')
      .select('*')
      .eq('user_id', userData.id)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    res.json({ patterns: data || [] });
  } catch (error) {
    console.error('[Patterns] List error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/v1/autobid/patterns/:id
 *
 * Update a pattern (toggle is_learned, change threshold, edit answer).
 */
router.put('/autobid/patterns/:id', async (req, res) => {
  const user = getUserFromToken(req);
  if (!user) return res.status(401).json({ error: 'Auth required' });

  try {
    const { id } = req.params;
    const { is_learned, threshold, last_answer } = req.body;
    const supabase = getSupabase();

    const updates = { updated_at: new Date().toISOString() };
    if (is_learned !== undefined) updates.is_learned = is_learned;
    if (threshold !== undefined) updates.threshold = threshold;
    if (last_answer !== undefined) updates.last_answer = last_answer;

    const { error } = await supabase.from('question_patterns').update(updates).eq('id', id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/v1/autobid/patterns/:id
 */
router.delete('/autobid/patterns/:id', async (req, res) => {
  const user = getUserFromToken(req);
  if (!user) return res.status(401).json({ error: 'Auth required' });

  try {
    const supabase = getSupabase();
    const { error } = await supabase.from('question_patterns').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/v1/autobid/generate-answer
 *
 * Use LLM to generate an answer for a custom question.
 * Uses sample answers from learned patterns as few-shot examples.
 */
router.post('/autobid/generate-answer', async (req, res) => {
  const user = getUserFromToken(req);
  if (!user) return res.status(401).json({ error: 'Auth required' });

  try {
    const { question, company, job_title, job_description, sample_answers } = req.body;
    if (!question) return res.status(400).json({ error: 'question required' });

    const openai = req.app.get('openai');
    if (!openai) return res.status(503).json({ error: 'OpenAI not configured' });

    // Fetch user profile for context
    const supabase = getSupabase();
    const { data: userData } = await supabase.from('users').select('*').eq('email', user.email).single();

    const profileContext = userData
      ? `Candidate: ${userData.full_name || ''}, ${userData.current_title || ''} with ${userData.years_of_experience || '?'} years of experience. Location: ${userData.location || userData.city || ''}. Skills/specializations: ${(userData.target_job_titles || []).join(', ')}.`
      : '';

    const samplesText = (sample_answers || []).length > 0
      ? '\n\nHere are some previously approved answers for similar questions:\n' +
        sample_answers.map((s, i) => `Example ${i + 1} (for ${s.company || 'a company'}): ${s.answer}`).join('\n')
      : '';

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.7,
      max_tokens: 500,
      messages: [
        {
          role: 'system',
          content: `You are filling out a job application. Write a concise, genuine 2-4 sentence answer. Be specific — reference the company and role by name. Don't use cliches like "I am excited to apply" or "I believe I would be a great fit". Draw from the candidate's real background.`,
        },
        {
          role: 'user',
          content: `Question: ${question}\n\nJob: ${job_title || 'N/A'} at ${company || 'N/A'}\nJob description excerpt: ${(job_description || '').substring(0, 1500)}\n\n${profileContext}${samplesText}\n\nWrite the answer:`,
        },
      ],
    });

    const answer = response.choices[0].message.content.trim();
    res.json({ answer });
  } catch (error) {
    console.error('[Patterns] Generate answer error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
