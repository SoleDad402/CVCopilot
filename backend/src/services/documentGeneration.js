/**
 * Shared document generation: DOCX resume, DOCX cover letter, DOCX→PDF.
 *
 * Single source of truth for all document creation — used by both
 * CVCopilot manual generation and BidCopilot auto-bid.
 */
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const CloudmersiveConvertApiClient = require('cloudmersive-convert-api-client');
const fs = require('fs');
const path = require('path');

const {
  clearedText,
  markdownToWordXml,
  markdownToWordXmlWithBullet,
} = require('../utils/textUtils');

const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');

/**
 * Generate a resume DOCX from resume JSON using the template.
 * @param {object} resumeJson - Resume data from pipeline convertPlanToJson
 * @returns {Buffer} DOCX file buffer
 */
function generateResumeDocx(resumeJson) {
  const templatePath = path.join(TEMPLATES_DIR, 'resume-template.docx');
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

/**
 * Generate a cover letter DOCX from content text using the template.
 * @param {string} contentText - Cover letter body paragraphs (no header/greeting)
 * @param {object} metadata - { name, role, address, phone, mail }
 * @returns {Buffer} DOCX file buffer
 */
function generateCoverLetterDocx(contentText, { name, role, address, phone, mail }) {
  const templatePath = path.join(TEMPLATES_DIR, 'cover-letter-template.docx');
  const content = fs.readFileSync(templatePath, 'binary');
  const zip = new PizZip(content);
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  doc.render({
    name: name || '',
    role: role || '',
    address: address || '',
    phone: phone || '',
    mail: mail || '',
    current_date: today,
    content: contentText || '',
  });

  return doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });
}

/**
 * Convert a DOCX buffer to PDF via Cloudmersive API.
 * @param {Buffer} docxBuffer
 * @returns {Promise<Buffer>} PDF buffer
 */
function convertDocxToPdf(docxBuffer) {
  const defaultClient = CloudmersiveConvertApiClient.ApiClient.instance;
  const Apikey = defaultClient.authentications['Apikey'];
  Apikey.apiKey = process.env.CLOUDMERSIVE_API_KEY || '6416621d-ea78-4176-a8cc-26dac58c50c0';

  const convertApi = new CloudmersiveConvertApiClient.ConvertDocumentApi();
  return new Promise((resolve, reject) => {
    convertApi.convertDocumentDocxToPdf(docxBuffer, (err, data) => {
      if (err) reject(new Error(`DOCX→PDF conversion failed: ${err.message || err}`));
      else resolve(data);
    });
  });
}

module.exports = {
  generateResumeDocx,
  generateCoverLetterDocx,
  convertDocxToPdf,
};
