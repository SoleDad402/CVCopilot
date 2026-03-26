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

async function generateCoverLetter(openai, { jobDescription, jobTitle, companyName, userName, resumeSummary, experience }) {
  const topRoles = (experience || []).slice(0, 3).map(e =>
    `${e.position} at ${e.company}`
  ).join(', ');

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.5,
    max_tokens: 1200,
    messages: [
      {
        role: 'system',
        content: `You are a professional cover letter writer. Write a concise, compelling cover letter (3-4 paragraphs) that connects the candidate's background to the specific role. Be genuine, not generic. Do not use clichés like "I am excited to apply" or "I believe I would be a great fit".`,
      },
      {
        role: 'user',
        content: `Write a cover letter for:
Candidate: ${userName}
Role: ${jobTitle || 'the advertised position'}
Company: ${companyName || 'the company'}
Recent experience: ${topRoles}
Professional summary: ${resumeSummary || ''}

Job description:
${jobDescription.substring(0, 3000)}`,
      },
    ],
  });

  return response.choices[0].message.content.trim();
}

module.exports = router;
