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
const jobManager = require('./services/jobManager');
const { JOB_STATUS } = jobManager;

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

// Job cleanup handled by jobManager service

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

// Share instances with route handlers
app.set('openai', openai);
app.set('apiInstance', apiInstance);
app.set('port', port);

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
const generationRouter = require('./routes/generation');

app.use('/api/v1', bidcopilotRouter);
app.use('/api/auth', authRouter);
app.use('/api/profile', profileRouter);
app.use('/api', generationRouter);
app.use('/api', profileRouter);  // also mount at /api for /api/employment, /api/education, /api/history
app.use('/api/admin', adminRouter);
app.use('/api/job-applications', jobApplicationsRouter);

// Text utils used by remaining routes (download endpoint)
// cleanJobDescription now in services/questionAnswerer.js

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

    const { answerQuestion } = require('./services/questionAnswerer');
    const answer = await answerQuestion(openai, { question, jobDescription, resume });
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
