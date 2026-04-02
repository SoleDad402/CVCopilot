require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const OpenAI = require('openai');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const auth = require('./middleware/auth');
const adminAuth = require('./middleware/adminAuth');
const sgMail = require('@sendgrid/mail');
const PDFDocument = require('pdfkit');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { TextDecoder } = require('util');
const CloudmersiveConvertApiClient = require("cloudmersive-convert-api-client");
const crypto = require('crypto');

const app = express();
const port = process.env.PORT || 4090;

// Job storage system
const jobs = new Map();
const JOB_EXPIRY_TIME = 30 * 60 * 1000; // 30 minutes

// Job statuses
const JOB_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

// Safely parse JSON from LLM text that may include markdown code fences
const parseJsonFromText = (text) => {
  if (!text || typeof text !== 'string') {
    throw new Error('Empty completion text');
  }
  const trimmed = text.trim();
  // Strip leading/trailing code fences like ```json ... ```
  const withoutFences = trimmed
    .replace(/^```[a-zA-Z]*\s*/m, '')
    .replace(/```\s*$/m, '')
    .trim();
  // Attempt to isolate JSON object
  const startIdx = withoutFences.indexOf('{');
  const endIdx = withoutFences.lastIndexOf('}');
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    const candidate = withoutFences.slice(startIdx, endIdx + 1);
    return JSON.parse(candidate);
  }
  // Fallback: direct parse
  return JSON.parse(withoutFences);
};

// Helper function to generate job ID
const generateJobId = () => {
  return 'job_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
};

// Helper function to clean up expired jobs
const cleanupExpiredJobs = () => {
  const now = Date.now();
  for (const [jobId, job] of jobs.entries()) {
    if (now - job.createdAt > JOB_EXPIRY_TIME) {
      jobs.delete(jobId);
    }
  }
};

// Clean up expired jobs every 5 minutes
setInterval(cleanupExpiredJobs, 5 * 60 * 1000);

// Initialize OpenAI
// Validate OpenAI API key
const hasOpenAICredentials = process.env.OPENAI_API_KEY;
if (!hasOpenAICredentials) {
  console.warn('⚠️  WARNING: OpenAI API key not found. Resume generation will fail.');
  console.warn('   Please set OPENAI_API_KEY environment variable.');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Share OpenAI client with route handlers
app.set('openai', openai);

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Setup API client
const defaultClient = CloudmersiveConvertApiClient.ApiClient.instance;
const Apikey = defaultClient.authentications["Apikey"];
Apikey.apiKey = process.env.CLOUDMERSIVE_API_KEY || "6416621d-ea78-4176-a8cc-26dac58c50c0"; // Use env var or fallback
const apiInstance = new CloudmersiveConvertApiClient.ConvertDocumentApi();

// Middleware
// Load CORS origins from environment variable (comma-separated) or use defaults
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(s => s.trim())
  : ['http://127.0.0.1:3000'];
app.use(cors({
  origin: corsOrigins.length === 1 ? corsOrigins[0] : corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

// Serve static files from the React build directory
app.use(express.static(path.join(__dirname, '../../frontend/build')));

// Add multer for handling file uploads
const upload = multer({ storage: multer.memoryStorage() });

// ── Mount route modules ──────────────────────────────────────────────────────
const bidcopilotRouter = require('./routes/bidcopilot');
const authRouter = require('./routes/auth');
const profileRouter = require('./routes/profile');
const adminRouter = require('./routes/admin');
const jobApplicationsRouter = require('./routes/jobApplications');

app.use('/api/v1', bidcopilotRouter);
app.use('/api/auth', authRouter);
app.use('/api/profile', profileRouter);
app.use('/api', profileRouter);  // also mount at /api for /api/employment, /api/education, /api/history
app.use('/api/admin', adminRouter);
app.use('/api/job-applications', jobApplicationsRouter);

// Async cover letter generation function
const generateCoverLetterAsync = async (jobId, userId, cleanedJobDescription, companyName, role, resumeData) => {
  try {
    // Update job status to processing
    jobs.set(jobId, {
      ...jobs.get(jobId),
      status: JOB_STATUS.PROCESSING,
      startedAt: Date.now()
    });

    // Get user data
    const userRaw = await User.findByEmail(userId);
    const user = {
      id: userRaw.id,
      email: userRaw.email || '',
      full_name: userRaw.full_name || '',
      phone: userRaw.phone || '',
      personal_email: userRaw.personal_email || '',
      location: userRaw.location || ''
    };

    // Build candidate information from resume data if available
    let candidateInfo = `- Name: ${user.full_name}\n`;
    if (resumeData) {
      if (resumeData.summary) {
        candidateInfo += `- Summary: ${resumeData.summary}\n`;
      }
      if (resumeData.experience && Array.isArray(resumeData.experience) && resumeData.experience.length > 0) {
        const recentRoles = resumeData.experience.slice(0, 2).map(exp => {
          const position = exp.position || exp.title || '';
          const company = exp.company || exp.company_name || '';
          return position && company ? `${position} at ${company}` : '';
        }).filter(Boolean).join(', ');
        if (recentRoles) {
          candidateInfo += `- Recent Roles: ${recentRoles}\n`;
        }
      }
      if (resumeData.skills && Array.isArray(resumeData.skills) && resumeData.skills.length > 0) {
        const skillsList = resumeData.skills.map(s => {
          if (typeof s === 'string') return s;
          if (s.list && Array.isArray(s.list)) return s.list.join(', ');
          return '';
        }).filter(Boolean).join(', ');
        if (skillsList) {
          candidateInfo += `- Key Skills: ${skillsList}\n`;
        }
      }
    }

    // Generate cover letter content using LLM
    const coverLetterPrompt = `You are an expert cover letter writer. Write a compelling, professional cover letter for this job application.

Job Details:
- Company: ${companyName || 'Company'}
- Role: ${role || 'Position'}
- Job Description: ${cleanedJobDescription}

Candidate Information:
${candidateInfo}

Requirements:
1. Write a professional, confident cover letter (3-4 paragraphs)
2. First paragraph: Express interest and mention the specific role and company
3. Middle paragraph(s): Highlight 2-3 most relevant experiences/achievements from the resume that align with the job requirements
4. Final paragraph: Express enthusiasm, mention why you're a good fit, and include a call to action
5. Use a professional but warm tone - not overly formal or generic
6. Avoid clichés like "I am writing to apply", "I am the perfect candidate", "I am very excited"
7. Be specific about achievements and use concrete examples when possible
8. Keep it concise (300-400 words total)
9. Write in first person but avoid overusing "I"
10. Make it sound human and authentic, not AI-generated

Return ONLY the cover letter body text (no headers, no "Dear Hiring Manager", no signatures - just the paragraphs).`;

    const completion = await openai.chat.completions.create({
      model: "gpt-5.2",
      messages: [
        {
          role: "system",
          content: "You are an expert cover letter writer. Write compelling, professional cover letters that are specific, authentic, and tailored to each job application. Avoid generic phrases and clichés."
        },
        { role: "user", content: coverLetterPrompt }
      ],
      temperature: 0.7,
      max_completion_tokens: 2000
    });

    const coverLetterContent = completion.choices[0].message.content.trim();

    // Format current date
    const currentDate = new Date().toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });

    // Generate DOCX content using cover letter template
    const templatePath = path.join(__dirname, 'templates', 'cover-letter-template.docx');
    const content = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    const templateData = {
      name: user.full_name || '',
      role: role || '',
      address: user.location || '',
      phone: user.phone || '',
      mail: user.personal_email || user.email || '',
      current_date: currentDate,
      content: coverLetterContent
    };

    // Render the document
    doc.render(templateData);

    // Generate the output
    const buffer = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE'
    });

    // Convert DOCX to PDF using Cloudmersive
    let pdfContent = null;
    let pdfBuffer = null;
    try {
      const tmpDocxPath = path.join(__dirname, 'tmp_input_cover.docx');
      fs.writeFileSync(tmpDocxPath, buffer);
      const inputFile = fs.createReadStream(tmpDocxPath);
      const convertDocxToPdf = () => new Promise((resolve, reject) => {
        apiInstance.convertDocumentDocxToPdf(inputFile, (error, data, response) => {
          if (error) reject(error);
          else resolve(data);
        });
      });
      const pdfBufferFromApi = await convertDocxToPdf();
      pdfBuffer = Buffer.from(pdfBufferFromApi);
      pdfContent = pdfBuffer.toString('base64');
      fs.unlinkSync(tmpDocxPath);
    } catch (err) {
      console.error('Failed to convert cover letter DOCX to PDF (Cloudmersive):', err);
      pdfContent = null;
      pdfBuffer = null;
    }

    // Upload files and store URLs
    let docxAttachment = null;
    let pdfAttachment = null;
    
    try {
      const createAttachment = async (buffer, filename, contentType) => {
        const timestamp = Date.now();
        const fileId = crypto.randomBytes(8).toString('hex');
        const uploadsDir = path.join(__dirname, '../uploads');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        
        const storedFilename = `${timestamp}_${fileId}_${filename}`;
        const filePath = path.join(uploadsDir, storedFilename);
        fs.writeFileSync(filePath, buffer);
        
        const baseUrl = process.env.BACKEND_URL || `http://localhost:${port}`;
        const fileUrl = `${baseUrl}/api/files/${storedFilename}`;
        
        return [{
          url: fileUrl,
          filename: filename
        }];
      };

      docxAttachment = await createAttachment(buffer, 'cover-letter.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      
      if (pdfBuffer) {
        pdfAttachment = await createAttachment(pdfBuffer, 'cover-letter.pdf', 'application/pdf');
      }

      // Store cover letter in database
      try {
        await User.addCoverLetterRequest(user.id, {
          company_name: companyName || null,
          role: role || null,
          job_description: cleanedJobDescription,
          docx_file: docxAttachment,
          pdf_file: pdfAttachment
        });
        console.log('Cover letter files saved to database successfully');
      } catch (metaErr) {
        console.error('Failed saving cover letter metadata:', metaErr);
      }
    } catch (saveErr) {
      console.error('Failed uploading cover letter files:', saveErr);
    }

    // Update job with completed results
    jobs.set(jobId, {
      ...jobs.get(jobId),
      status: JOB_STATUS.COMPLETED,
      completedAt: Date.now(),
      result: {
        coverLetter: coverLetterContent,
        docxContent: buffer.toString('base64'),
        pdfContent: pdfContent || null
      }
    });

  } catch (error) {
    console.error('Error generating cover letter:', error);
    
    let errorMessage = error.message || 'Failed to generate cover letter';
    
    if (error.status === 401 || error.message?.includes('Invalid API key')) {
      errorMessage = 'OpenAI API key is invalid or missing.';
    } else if (error.status === 429 || error.message?.includes('rate limit')) {
      errorMessage = 'OpenAI API rate limit exceeded. Please try again later.';
    }
    
    jobs.set(jobId, {
      ...jobs.get(jobId),
      status: JOB_STATUS.FAILED,
      completedAt: Date.now(),
      error: errorMessage
    });
  }
};

// Async resume generation function
const generateResumeAsync = async (jobId, userId, cleanedJobDescription, pipelineVersion = 1, userPrefs = {}) => {
  try {
    // Update job status to processing
    jobs.set(jobId, {
      ...jobs.get(jobId),
      status: JOB_STATUS.PROCESSING,
      startedAt: Date.now()
    });

    // Get user data, employment history, and education
    const userRaw = await User.findByEmail(userId);
    const employmentHistory = await User.getEmploymentHistory(userRaw.id);
    const education = await User.getEducation(userRaw.id);

    // Clean user data - handle both database field names
    const user = {
      id: userRaw.id,
      email: userRaw.email || '',
      full_name: userRaw.full_name || '',
      phone: userRaw.phone || '',
      personal_email: userRaw.personal_email || '',
      linkedin_url: userRaw.linkedin_url || '',
      github_url: userRaw.github_url || '',
      location: userRaw.location || ''
    };

    const cleanEmploymentHistory = employmentHistory.map(item => ({
      id: item.id,
      company_name: item.company_name || '',
      location: item.location || '',
      position: item.position || '',
      start_date: item.start_date || '',
      end_date: item.end_date || '',
      is_current: item.is_current || false,
      description: item.description || ''
    }));

    const cleanEducation = education.map(item => ({
      id: item.id,
      school_name: item.school_name || '',
      location: item.location || '',
      degree: item.degree || '',
      field_of_study: item.field_of_study || '',
      start_date: item.start_date || '',
      end_date: item.end_date || '',
      is_current: item.is_current || false,
      gpa: item.gpa || '',
      description: item.description || ''
    }));

    // Convert to pipeline format
    const { runPipeline } = require('./pipeline');
    const { convertPlanToJson } = require('./pipeline/convertToJson');

    // Convert employment history to pipeline format
    const pipelineEmploymentHistory = cleanEmploymentHistory.map(job => ({
      title: job.position,
      company: job.company_name,
      location: job.location,
      startDate: job.start_date,
      endDate: job.is_current ? 'Present' : job.end_date,
      notes: (job.description || '')
        .split(/\r?\n|•|\u2022/)
        .map(s => s.trim())
        .filter(Boolean)
    }));

    // Convert education to pipeline format
    const pipelineEducation = cleanEducation.map(edu => ({
      school_name: edu.school_name,
      location: edu.location,
      degree: edu.degree,
      field_of_study: edu.field_of_study,
      start_date: edu.start_date,
      end_date: edu.end_date,
      gpa: edu.gpa,
      description: edu.description
    }));

    // Use the versioned pipeline
    const plan = await runPipeline(pipelineVersion, {
      jobDescription: cleanedJobDescription,
      employmentHistory: pipelineEmploymentHistory,
      voiceSamples: [], // Can be added later if user provides samples
      options: {
        includeEducation: true,
        includeProjects: false
      },
      userName: user.full_name,
      userContact: {
        email: user.personal_email,
        phone: user.phone,
        linkedin_url: user.linkedin_url,
        github_url: user.github_url,
        location: user.location
      },
      education: pipelineEducation,
      openai: openai,
      bulletCount: userPrefs.bulletCount || 5,
      returnMarkdown: false, // Return plan object for JSON conversion
      onProgress: ({ progress, stepLabel }) => {
        const job = jobs.get(jobId);
        if (job) {
          jobs.set(jobId, { ...job, progress, stepLabel });
        }
      }
    });

    // Convert plan to expected JSON format
    const generatedResume = convertPlanToJson(plan, {
      email: user.personal_email,
      phone: user.phone,
      linkedin_url: user.linkedin_url,
      github_url: user.github_url,
      location: user.location
    });
    
    // Initialize the resume data structure
    const resumeData = {
      name: generatedResume.name,
      contact: generatedResume.contact,
      summary: generatedResume.summary,
      achievements: generatedResume.achievements || [],
      experience: generatedResume.experience,
      skills: generatedResume.skills,
      education: generatedResume.education,
      certifications: generatedResume.certifications || []
    };

    // Update progress for document generation
    const job = jobs.get(jobId);
    if (job) {
      jobs.set(jobId, { ...job, progress: 90, stepLabel: 'Generating your document…' });
    }

    // Generate DOCX content
    const templatePath = path.join(__dirname, 'templates', 'resume-template.docx');
    const content = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    const templateData = {
      name: resumeData.name || '',
      phone: resumeData.contact.phonenumber || '',
      email: resumeData.contact.email || '',
      linkedinURL: resumeData.contact.linkedinURL || '',
      location: resumeData.contact.location || '',
      contact: `${resumeData.contact.location} | ${resumeData.contact.email} | ${resumeData.contact.phonenumber} | ${resumeData.contact.linkedinURL}`,
      summary: markdownToWordXml(resumeData.summary) || '',
      showAchievements: userPrefs.includeAchievements !== false,
      achievements: userPrefs.includeAchievements !== false
        ? resumeData.achievements.map(achievement => {
            const text = typeof achievement === 'object' ? achievement.text : achievement;
            const company = typeof achievement === 'object' ? achievement.company : null;
            const line = company ? `${text} - at **${company}**` : text;
            return { rawXml: markdownToWordXmlWithBullet(line) };
          })
        : [],
      showHobbies: userPrefs.includeHobbies !== false,
      experience: resumeData.experience.map((exp, index) => ({
        company: clearedText(exp.company) || '',
        location: clearedText(exp.location) || '',
        position: clearedText(exp.position) || '',
        dates: clearedText(exp.dates) || '',
        bullets: (exp.bullets || []).map(bullet => {
          return {rawXml: markdownToWordXmlWithBullet(bullet)}
        })
      })),
      skills: resumeData.skills.map(skillSection => {
        if (skillSection && skillSection.section && skillSection.list) {
          return {
            list: markdownToWordXml(`**${skillSection.section}**: ${skillSection.list.join(', ')}`)
          };
        }
        return null;
      }).filter(Boolean),
      education: resumeData.education?.map(edu => ({
        school: clearedText(edu.school) || '',
        location: clearedText(edu.location) || '',
        program: clearedText(edu.program) || '',
        dates: clearedText(edu.dates) || ''
      })),
      certifications: resumeData.certifications?.map(cert => ({
        name: clearedText(cert.name) || '',
        issued: clearedText(cert.issued) || ''
      }))
    };

    // Render the document
    doc.render(templateData);

    // Generate the output
    const buffer = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE'
    });

    // Convert DOCX buffer to PDF using Cloudmersive
    let pdfContent = null;
    let pdfBuffer = null;
    try {
      // Write buffer to a temp file
      const tmpDocxPath = path.join(__dirname, 'tmp_input.docx');
      fs.writeFileSync(tmpDocxPath, buffer);
      const inputFile = fs.createReadStream(tmpDocxPath);
      // Use promise wrapper for the callback API
      const convertDocxToPdf = () => new Promise((resolve, reject) => {
        apiInstance.convertDocumentDocxToPdf(inputFile, (error, data, response) => {
          if (error) reject(error);
          else resolve(data);
        });
      });
      const pdfBufferFromApi = await convertDocxToPdf();
      pdfBuffer = Buffer.from(pdfBufferFromApi);
      pdfContent = pdfBuffer.toString('base64');
      // Clean up temp file
      fs.unlinkSync(tmpDocxPath);
    } catch (err) {
      console.error('Failed to convert DOCX to PDF (Cloudmersive):', err);
      pdfContent = null;
      pdfBuffer = null;
    }

    // Upload files and store URLs
    let docxAttachment = null;
    let pdfAttachment = null;
    
    try {
      // Store file and return URL array (compatible with addResumeRequest)
      const createAttachment = async (buffer, filename, contentType) => {
        const timestamp = Date.now();
        const fileId = crypto.randomBytes(8).toString('hex');
        const uploadsDir = path.join(__dirname, '../uploads');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const storedFilename = `${timestamp}_${fileId}_${filename}`;
        const filePath = path.join(uploadsDir, storedFilename);
        fs.writeFileSync(filePath, buffer);

        const baseUrl = process.env.BACKEND_URL || `http://localhost:${port}`;
        const fileUrl = `${baseUrl}/api/files/${storedFilename}`;
        return [{ url: fileUrl, filename }];
      };

      // Upload DOCX file
      docxAttachment = await createAttachment(buffer, 'resume.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      
      // Upload PDF file if available
      if (pdfBuffer) {
        pdfAttachment = await createAttachment(pdfBuffer, 'resume.pdf', 'application/pdf');
      }

      try {
        const resumeRequestId = await User.addResumeRequest(user.id, {
          company_name: jobs.get(jobId)?.companyName || null,
          role: jobs.get(jobId)?.role || null,
          job_description: cleanedJobDescription,
          docx_file: docxAttachment,
          pdf_file: pdfAttachment
        });
        console.log('Resume files saved to database successfully');

        // Auto-create job application entry
        const companyName = jobs.get(jobId)?.companyName;
        const role = jobs.get(jobId)?.role;
        if (companyName && role) {
          try {
            await JobApplication.create(user.id, {
              company_name: companyName,
              position: role,
              status: 'applied',
              resume_request_id: resumeRequestId,
            });
            console.log('Auto-created job application for', companyName, role);
          } catch (appErr) {
            console.error('Failed auto-creating job application:', appErr);
          }
        }
      } catch (metaErr) {
        console.error('Failed saving resume request metadata:', metaErr);
      }
    } catch (saveErr) {
      console.error('Failed uploading files:', saveErr);
    }

    // Update job with completed results
    jobs.set(jobId, {
      ...jobs.get(jobId),
      status: JOB_STATUS.COMPLETED,
      completedAt: Date.now(),
      result: {
        resume: resumeData,
        generatedResume,
        docxContent: buffer.toString('base64'),
        pdfContent: pdfContent || null
        // Note: Files are stored locally and URLs saved to database
      }
    });

  } catch (error) {
    console.error('Error generating resume:', error);
    
    // Provide more specific error messages for OpenAI API issues
    let errorMessage = error.message || 'Failed to generate resume';
    
    if (error.status === 401 || error.message?.includes('Invalid API key') || error.message?.includes('Incorrect API key')) {
      errorMessage = 'OpenAI API key is invalid or missing. Please check OPENAI_API_KEY environment variable.';
      console.error('OpenAI API Key Error:', errorMessage);
    } else if (error.status === 429 || error.message?.includes('rate limit')) {
      errorMessage = 'OpenAI API rate limit exceeded. Please try again later.';
      console.error('OpenAI Rate Limit Error:', errorMessage);
    } else if (error.status === 500 || error.message?.includes('server error')) {
      errorMessage = 'OpenAI API server error. Please try again later.';
      console.error('OpenAI Server Error:', errorMessage);
    } else if (!hasOpenAICredentials) {
      errorMessage = 'OpenAI API key is not configured. Please set OPENAI_API_KEY environment variable.';
      console.error('Missing OpenAI API Key:', errorMessage);
    }
    
    // Update job with error
    jobs.set(jobId, {
      ...jobs.get(jobId),
      status: JOB_STATUS.FAILED,
      completedAt: Date.now(),
      error: errorMessage
    });
  }
};

// Resume generation endpoint - now returns job ID immediately
app.post('/api/generate-resume', auth, async (req, res) => {
  try {
    const { jobDescription, companyName, role, version, bulletCount, includeAchievements = true, includeHobbies = true } = req.body;

    if (!jobDescription) {
      return res.status(400).json({ error: 'Job description is required' });
    }

    // Validate pipeline version
    const { SUPPORTED_VERSIONS, DEFAULT_VERSION } = require('./pipeline');
    const pipelineVersion = Number(version) || DEFAULT_VERSION;
    if (!SUPPORTED_VERSIONS.includes(pipelineVersion)) {
      return res.status(400).json({
        error: `Unsupported pipeline version ${pipelineVersion}. Supported: ${SUPPORTED_VERSIONS.join(', ')}`
      });
    }

    // Clean the job description to remove emoticons and special characters
    const cleanedJobDescription = cleanJobDescription(jobDescription);

    // Get user data
    const user = await User.findByEmail(req.user.email);

    // Check daily generation limit
    const currentGenerations = await User.getDailyGenerationCount(req.user.id);
    if (currentGenerations >= user.daily_generation_limit) {
      return res.status(403).json({
        error: `Daily resume generation limit (${user.daily_generation_limit}) reached. Please try again tomorrow.`
      });
    }

    // Generate job ID
    const jobId = generateJobId();

    // Create job entry
    jobs.set(jobId, {
      id: jobId,
      userId: req.user.email,
      jobDescription: cleanedJobDescription,
      companyName: companyName || '',
      role: role || '',
      pipelineVersion,
      status: JOB_STATUS.PENDING,
      createdAt: Date.now(),
      progress: 0
    });

    // Start async processing
    generateResumeAsync(jobId, req.user.email, cleanedJobDescription, pipelineVersion, { bulletCount: Number(bulletCount) || 5, includeAchievements: includeAchievements !== false, includeHobbies: includeHobbies !== false });

    // Return job ID immediately
    res.json({ 
      jobId,
      message: 'Resume generation started. Use the job ID to check status and fetch results.'
    });

  } catch (error) {
    console.error('Error starting resume generation:', error);
    res.status(500).json({ error: 'Failed to start resume generation' });
  }
});

// Cover letter generation endpoint
app.post('/api/generate-cover-letter', auth, async (req, res) => {
  try {
    const { jobDescription, companyName, role, resume } = req.body;

    if (!jobDescription) {
      return res.status(400).json({ error: 'Job description is required' });
    }

    // Clean the job description
    const cleanedJobDescription = cleanJobDescription(jobDescription);

    // Get user data
    const user = await User.findByEmail(req.user.email);

    // Check daily generation limit
    const currentGenerations = await User.getDailyGenerationCount(req.user.id);
    if (currentGenerations >= user.daily_generation_limit) {
      return res.status(403).json({
        error: `Daily generation limit (${user.daily_generation_limit}) reached. Please try again tomorrow.`
      });
    }

    // Generate job ID
    const jobId = generateJobId();

    // Create job entry
    jobs.set(jobId, {
      id: jobId,
      userId: req.user.email,
      jobDescription: cleanedJobDescription,
      companyName: companyName || '',
      role: role || '',
      type: 'cover-letter',
      status: JOB_STATUS.PENDING,
      createdAt: Date.now(),
      progress: 0
    });

    // Start async processing
    generateCoverLetterAsync(jobId, req.user.email, cleanedJobDescription, companyName || '', role || '', resume || null);

    // Return job ID immediately
    res.json({ 
      jobId,
      message: 'Cover letter generation started. Use the job ID to check status and fetch results.'
    });

  } catch (error) {
    console.error('Error starting cover letter generation:', error);
    res.status(500).json({ error: 'Failed to start cover letter generation' });
  }
});

// Job status endpoint
app.get('/api/status/:jobId', auth, async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = jobs.get(jobId);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Check if user owns this job
    if (job.userId !== req.user.email) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const response = {
      jobId: job.id,
      status: job.status,
      createdAt: job.createdAt,
      progress: job.progress || 0,
      stepLabel: job.stepLabel || null
    };

    if (job.startedAt) {
      response.startedAt = job.startedAt;
    }

    if (job.completedAt) {
      response.completedAt = job.completedAt;
    }

    if (job.status === JOB_STATUS.FAILED && job.error) {
      response.error = job.error;
    }

    res.json(response);
  } catch (error) {
    console.error('Error checking job status:', error);
    res.status(500).json({ error: 'Failed to check job status' });
  }
});

// Job results endpoint
app.get('/api/results/:jobId', auth, async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = jobs.get(jobId);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Check if user owns this job
    if (job.userId !== req.user.email) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (job.status !== JOB_STATUS.COMPLETED) {
      return res.status(400).json({ 
        error: 'Job not completed yet',
        status: job.status 
      });
    }

    if (!job.result) {
      return res.status(500).json({ error: 'Job completed but no results found' });
    }

    // Set headers for large response
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Length', JSON.stringify(job.result).length);
    res.setHeader('Cache-Control', 'no-cache');
    
    console.log(`Sending results for job ${jobId}, size: ${JSON.stringify(job.result).length} bytes`);
    res.json(job.result);
  } catch (error) {
    console.error('Error fetching job results:', error);
    res.status(500).json({ error: 'Failed to fetch job results' });
  }
});

// Token verification endpoint

const clearedText = (text) => {
  if (!text) return '';
  // Remove quotation marks and whitespace characters
  return text.replace(/^["']|["']$/g, '').replace(/[\n\r\t\f\v]/g, '').trim();
}

// Escape special XML characters in text content
const escapeXml = (str) => {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

// Convert markdown bold (**text**) to Word XML format with bold runs
const markdownToWordXml = (text) => {
  if (!text) return '<w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr></w:p>';

  // Remove bullet point marker if present
  let cleanText = text.trim();
  cleanText = cleanText.replace(/^[\-\*]\s+/, '');

  // Split text by markdown bold markers (**)
  const parts = cleanText.split(/(\*\*[^*]+\*\*)/);

  let xmlContent = '';

  parts.forEach((part) => {
    if (!part) return; // Skip empty parts

    if (part.startsWith('**') && part.endsWith('**')) {
      // Bold text - remove ** markers
      const boldText = escapeXml(part.slice(2, -2));
      xmlContent += `
    <w:r>
        <w:rPr><w:b/><w:color w:val="363A45"/></w:rPr>
        <w:t xml:space="preserve">${boldText}</w:t>
    </w:r>`;
    } else {
      // Regular text - preserve spaces with xml:space="preserve"
      xmlContent += `
    <w:r>
        <w:rPr><w:color w:val="363A45"/></w:rPr>
        <w:t xml:space="preserve">${escapeXml(part)}</w:t>
    </w:r>`;
    }
  });
  
  // Return without bullet formatting
  return `<w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr>${xmlContent}</w:p>`;
}

const markdownToWordXmlWithBullet = (text) => {
  // First convert markdown to XML without bullet
  const xmlResult = markdownToWordXml(text);
  
  // Extract the content between <w:p> tags
  const contentMatch = xmlResult.match(/<w:p><w:pPr>.*?<\/w:pPr>(.*)<\/w:p>/s);
  const content = contentMatch ? contentMatch[1] : '';
  // Wrap with bullet formatting
  return `<w:p><w:pPr><w:pStyle w:val="ListParagraph"/><w:ind w:left="240" w:hanging="0"/><w:spacing w:after="0"/></w:pPr>
    <w:r>
        <w:rPr><w:color w:val="363A45"/></w:rPr>
        <w:t xml:space="preserve">•  </w:t>
    </w:r>${content}</w:p>`;
}

const cleanJobDescription = (jobDescription) => {
  if (!jobDescription) return '';
  
  return jobDescription
    // Remove emoticons and emojis
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '') // Emoticons
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, '') // Misc Symbols and Pictographs
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '') // Transport and Map
    .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '') // Regional indicator symbols
    .replace(/[\u{2600}-\u{26FF}]/gu, '')   // Misc symbols
    .replace(/[\u{2700}-\u{27BF}]/gu, '')   // Dingbats
    .replace(/[\u{1F900}-\u{1F9FF}]/gu, '') // Supplemental Symbols and Pictographs
    .replace(/[\u{1FA70}-\u{1FAFF}]/gu, '') // Symbols and Pictographs Extended-A
    // Remove other special characters that might interfere with prompts
    .replace(/[^\x00-\x7F]/g, '') // Remove non-ASCII characters
    .replace(/[^\w\s.,!?;:()\-'"]/g, '') // Keep only alphanumeric, spaces, and basic punctuation
    // Clean up multiple spaces
    .replace(/\s+/g, ' ')
    .trim();
}

// Download endpoints
app.post('/api/download/:format', async (req, res) => {
  try {
    const { format } = req.params;
    const { resume } = req.body;

    if (!resume) {
      return res.status(400).json({ error: 'Resume content is required' });
    }

    // Use the resume data object directly
    const resumeData = resume;

    if (format === 'docx') {
      try {
        // Read the template file
        const templatePath = path.join(__dirname, 'templates', 'resume-template.docx');
        const content = fs.readFileSync(templatePath, 'binary');
        
        // Create a new instance of PizZip
        const zip = new PizZip(content);
        
        // Create a new instance of Docxtemplater
        const doc = new Docxtemplater(zip, {
          paragraphLoop: true,
          linebreaks: true,
        });

        // Prepare the data for the template
        const templateData = {
          name: resumeData.name || '',
          contact: `${resumeData.contact.email} | ${resumeData.contact.phonenumber} | ${resumeData.contact.linkedinURL} | ${resumeData.contact.github}`,
          summary: markdownToWordXml(resumeData.summary) || '',
          achievements: (resumeData.achievements || []).map(achievement => {
            const text = typeof achievement === 'object' ? achievement.text : achievement;
            const company = typeof achievement === 'object' ? achievement.company : null;
            const line = company ? `${text} - at **${company}**` : text;
            return { rawXml: markdownToWordXmlWithBullet(line) };
          }),
          experience: resumeData.experience.map((exp, index) => ({
            company: clearedText(exp.company) || '',
            location: clearedText(exp.location) || '',
            position: clearedText(exp.position) || '',
            dates: clearedText(exp.dates) || '',
            bullets: (exp.bullets || []).map(bullet => {
              return {rawXml: markdownToWordXmlWithBullet(bullet)}
            })
          })),
          skills: resumeData.skills.map(skillSection => {
            if (skillSection && skillSection.section && skillSection.list) {
              return {
                list: markdownToWordXml(`**${skillSection.section}**: ${skillSection.list.join(', ')}`)
              };
            }
            return null; // Filter out if section or list is undefined
          }).filter(Boolean),
          education: resumeData.education?.map(edu => ({
            school: clearedText(edu.school) || '',
            location: clearedText(edu.location) || '',
            program: clearedText(edu.program) || '',
            dates: clearedText(edu.dates) || ''
          })),
          certifications: resumeData.certifications?.map(cert => ({
            name: clearedText(cert.name) || '',
            issued: clearedText(cert.issued) || ''
          }))
        };

        // Render the document
        doc.render(templateData);

        // Generate the output
        const buffer = doc.getZip().generate({
          type: 'nodebuffer',
          compression: 'DEFLATE'
        });
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', 'attachment; filename=resume.docx');
        res.send(buffer);
      } catch (error) {
        console.error('Document generation error:', error);
        res.status(500).json({ error: 'Failed to generate document' });
      }
    } else if (format === 'pdf') {
      // Create PDF
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=resume.pdf');
      doc.pipe(res);

      // Set default font
      doc.font('Helvetica');

      // Name (Header)
      doc.fontSize(24)
         .font('Helvetica-Bold')
         .text(resumeData.name || '', { align: 'center' })
         .moveDown(0.5);

      // Contact information
      const contactInfo = [
        resumeData.contact.email,
        resumeData.contact.phonenumber,
        resumeData.contact.linkedinURL,
        resumeData.contact.github
      ].filter(Boolean).join(' | ');

      doc.fontSize(11)
         .font('Helvetica')
         .text(contactInfo, { align: 'center' })
         .moveDown(1);

      // Professional Summary
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .text('Professional Summary')
         .moveDown(0.5);

      doc.fontSize(11)
         .font('Helvetica')
         .text(resumeData.summary || '')
         .moveDown(1);

      // Professional Experience
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .text('Professional Experience')
         .moveDown(0.5);

      if (resumeData.experience && Array.isArray(resumeData.experience)) {
        resumeData.experience.forEach(exp => {
          // Company and Location
          doc.fontSize(12)
             .font('Helvetica-Bold')
             .text(`${exp.company}, ${exp.location}`)
             .moveDown(0.5);

          // Position and Dates
          doc.fontSize(11)
             .font('Helvetica')
             .text(`${exp.position} (${exp.dates})`)
             .moveDown(0.5);

          // Bullet points
          if (exp.bullets && Array.isArray(exp.bullets)) {
            exp.bullets.forEach(bullet => {
              doc.fontSize(11)
                 .font('Helvetica')
                 .text(`• ${bullet}`, {
                   indent: 20,
                   align: 'left'
                 })
                 .moveDown(0.5);
            });
          }

          doc.moveDown(0.5);
        });
      }

      // Skills
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .text('Skills & Other')
         .moveDown(0.5);

      if (resumeData.skills && Array.isArray(resumeData.skills)) {
        resumeData.skills.forEach(skillSection => {
          doc.fontSize(12)
             .font('Helvetica-Bold')
             .text(skillSection.section)
             .moveDown(0.5);

          doc.fontSize(11)
             .font('Helvetica')
             .text(skillSection.list.join(', '))
             .moveDown(0.5);
        });
      }

      doc.moveDown(1);

      // Education
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .text('Education')
         .moveDown(0.5);

      if (resumeData.education && Array.isArray(resumeData.education)) {
        resumeData.education.forEach(edu => {
          doc.fontSize(12)
             .font('Helvetica-Bold')
             .text(`${edu.school}, ${edu.location}`)
             .moveDown(0.5);

          doc.fontSize(11)
             .font('Helvetica')
             .text(`${edu.program} (${edu.dates})`)
             .moveDown(0.5);
        });
      }

      doc.moveDown(1);

      // Certifications
      if (resumeData.certifications && Array.isArray(resumeData.certifications) && resumeData.certifications.length > 0) {
        doc.fontSize(14)
           .font('Helvetica-Bold')
           .text('Certifications')
           .moveDown(0.5);

        resumeData.certifications.forEach(cert => {
          doc.fontSize(12)
             .font('Helvetica-Bold')
             .text(cert.name)
             .moveDown(0.5);

          doc.fontSize(11)
             .font('Helvetica')
             .text(`Issued ${cert.issued}`)
             .moveDown(0.5);
        });
      }

      doc.end();
    } else {
      res.status(400).json({ error: 'Invalid format' });
    }
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Failed to generate document' });
  }
});

// Add new endpoint for DOCX to PDF conversion
app.post('/api/convert-to-pdf', auth, upload.single('docx'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No DOCX file provided' });
    }

    // Convert DOCX to PDF using Cloudmersive API
    const convertResult = await new Promise((resolve, reject) => {
      apiInstance.convertDocumentDocxToPdf(req.file.buffer, (error, data, response) => {
        if (error) {
          reject(error);
        } else {
          resolve(data);
        }
      });
    });

    const pdfBuffer = Buffer.from(convertResult, 'binary');

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=resume.pdf');

    // Send the PDF
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error converting DOCX to PDF:', error);
    res.status(500).json({ error: 'Failed to convert DOCX to PDF' });
  }
});

// File serving endpoint for uploaded attachments
// This serves files from the persistent uploads directory
app.get('/api/files/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '../uploads', filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Determine content type based on file extension
    const ext = path.extname(filename).toLowerCase();
    const contentTypes = {
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.pdf': 'application/pdf'
    };
    const contentType = contentTypes[ext] || 'application/octet-stream';
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename.split('_').slice(2).join('_')}"`); // Remove timestamp and ID from filename
    res.sendFile(filePath);
  } catch (error) {
    console.error('Error serving file:', error);
    res.status(500).json({ error: 'Failed to serve file' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Start HTTP server
app.listen(port, () => {
  console.log(`HTTP server is running on ${port}`);
});

app.post('/api/ask-question', auth, async (req, res) => {
  try {
    const { question, jobDescription, resume } = req.body;
    if (!question || !jobDescription) {
      return res.status(400).json({ error: 'Question and job description are required.' });
    }

    // Clean the job description to remove emoticons and special characters
    const cleanedJobDescription = cleanJobDescription(jobDescription);

    // Use hardcoded GPT-5.2 model for better performance
    const selectedModel = "gpt-5.2";
    const maxCompletionTokens = 150; // Short answers for job application forms (1-2 sentences)

    // If resume is provided, summarize it for the prompt
    let resumeSummary = '';
    if (resume) {
      resumeSummary = `\n\nCandidate Resume:\n`;
      resumeSummary += `Name: ${resume.name || ''}\n`;
      resumeSummary += resume.summary ? `Summary: ${resume.summary}\n` : '';
      if (resume.experience && Array.isArray(resume.experience)) {
        resumeSummary += 'Experience:\n';
        resume.experience.forEach((exp, i) => {
          resumeSummary += `  - ${exp.position || ''} at ${exp.company || ''}, ${exp.location || ''} (${exp.dates || ''})\n`;
          if (exp.bullets && Array.isArray(exp.bullets)) {
            exp.bullets.slice(0, 2).forEach(bullet => {
              resumeSummary += `      • ${bullet}\n`;
            });
          }
        });
      }
      if (resume.skills && Array.isArray(resume.skills)) {
        resumeSummary += 'Skills:\n';
        resume.skills.forEach(section => {
          resumeSummary += `  - ${section.section}: ${section.list?.join(', ') || ''}\n`;
        });
      }
      if (resume.education && Array.isArray(resume.education)) {
        resumeSummary += 'Education:\n';
        resume.education.forEach(edu => {
          resumeSummary += `  - ${edu.program || ''} at ${edu.school || ''}, ${edu.location || ''} (${edu.dates || ''})\n`;
        });
      }
      if (resume.certifications && Array.isArray(resume.certifications) && resume.certifications.length > 0) {
        resumeSummary += 'Certifications:\n';
        resume.certifications.forEach(cert => {
          resumeSummary += `  - ${cert.name || ''} (Issued: ${cert.issued || ''})\n`;
        });
      }
    }

    const prompt = `
You are a helpful assistant who answers questions for job application forms. Your answers must be:
- Simple, clear, and in native American English
- NO markdown formatting (no **bold**, no bullets, no lists, no code blocks)
- 1-2 sentences maximum, unless the question explicitly asks for more detail
- Suitable for pasting directly into job application form fields
- Based on the following job description and resume:

Job Description:
${cleanedJobDescription}

Resume Summary:
${resumeSummary}

Question: ${question}

Answer (plain text, 1-2 sentences, no markdown):
`;

    const openaiResponse = await openai.chat.completions.create({
      model: selectedModel,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant who answers questions for job application forms. Provide concise, plain text answers (1-2 sentences) with no markdown formatting, suitable for pasting directly into form fields.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_completion_tokens: maxCompletionTokens,
      temperature: 0.7
    });
    
    const answer = (openaiResponse.choices[0]?.message?.content || '').trim();
    res.json({ answer });
  } catch (error) {
    console.error('Error answering question:', error);
    res.status(500).json({ error: 'Failed to generate answer.' });
  }
});


// Handle React routing, return all requests to React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/build', 'index.html'));
});
