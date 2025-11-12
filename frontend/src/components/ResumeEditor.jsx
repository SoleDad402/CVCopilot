import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  Typography,
  Container,
  Stack,
  Alert,
  CircularProgress,
  Paper
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { useNavigate } from 'react-router-dom';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { renderAsync } from 'docx-preview';

const ResumeEditor = () => {
  const navigate = useNavigate();
  const [editedResume, setEditedResume] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [docxContent, setDocxContent] = useState(null);
  const containerRef = useRef(null);

  // First useEffect: Load resume data
  useEffect(() => {
    const loadResumeData = async () => {
      try {
        const savedResume = localStorage.getItem('generatedResume');
        console.log('Saved resume from localStorage:', savedResume);

        if (!savedResume) {
          setError('No resume data found. Please generate a resume first.');
          setLoading(false);
          return;
        }

        const parsedResume = JSON.parse(savedResume);
        console.log('Parsed resume:', parsedResume);
        setEditedResume(parsedResume.resume);
        setDocxContent(parsedResume.docxContent);
      } catch (err) {
        console.error('Error loading resume:', err);
        setError('Failed to load resume data. Please try generating a new resume.');
      } finally {
        setLoading(false);
      }
    };

    loadResumeData();
  }, []);

  // Second useEffect: Render DOCX content when data is ready
  useEffect(() => {
    const renderDocx = async () => {
      if (!docxContent || !containerRef.current) {
        console.log('Waiting for content and container...', {
          hasDocxContent: !!docxContent,
          hasContainer: !!containerRef.current
        });
        return;
      }

      try {
        console.log('Starting DOCX rendering...');
        
        // Convert base64 to blob
        const byteString = atob(docxContent);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([ab], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });

        // Clear existing content
        containerRef.current.innerHTML = '';
        
        // Render the docx
        await renderAsync(blob, containerRef.current, containerRef.current, {
          className: 'docx-wrapper',
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          ignoreFonts: false,
          breakPages: true,
          useBase64URL: true,
          useMathMLPolyfill: true,
          renderEndnotes: true,
          renderFootnotes: true,
          renderFooters: true,
          renderHeaders: true,
          title: 'Resume Preview',
        });

        console.log('DOCX rendered successfully');
        
        // Make the content editable
        const editableElements = containerRef.current.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li');
        console.log('Editable elements found:', editableElements.length);
        
        editableElements.forEach(element => {
          element.contentEditable = true;
          element.addEventListener('input', handleContentChange);
        });
      } catch (err) {
        console.error('Error rendering DOCX:', err);
        setError('Failed to render resume content. Please try again.');
      }
    };

    renderDocx();
  }, [docxContent]);

  const handleContentChange = (event) => {
    console.log('Content changed:', event.target.textContent);
  };

  const handleSave = async () => {
    try {
      const container = document.getElementById('docx-container');
      if (container) {
        // Create a new document
        const doc = new Document({
          sections: [{
            properties: {},
            children: [
              // Header
              new Paragraph({
                text: editedResume.name,
                heading: HeadingLevel.HEADING_1,
                alignment: AlignmentType.CENTER
              }),
              new Paragraph({
                text: `${editedResume.contact.email} | ${editedResume.contact.phone}`,
                alignment: AlignmentType.CENTER
              }),
              new Paragraph({
                text: editedResume.contact.location,
                alignment: AlignmentType.CENTER
              }),
              new Paragraph({}),

              // Summary
              new Paragraph({
                text: 'Professional Summary',
                heading: HeadingLevel.HEADING_2
              }),
              new Paragraph({
                text: editedResume.summary
              }),
              new Paragraph({}),

              // Experience
              new Paragraph({
                text: 'Professional Experience',
                heading: HeadingLevel.HEADING_2
              }),
              ...editedResume.experience.flatMap(exp => [
                new Paragraph({
                  text: exp.title,
                  heading: HeadingLevel.HEADING_3
                }),
                new Paragraph({
                  text: `${exp.company} | ${exp.location} | ${exp.startDate} - ${exp.endDate}`,
                  italics: true
                }),
                ...exp.bullets.map(bullet => 
                  new Paragraph({
                    text: bullet,
                    bullet: {
                      level: 0
                    }
                  })
                ),
                new Paragraph({})
              ]),

              // Education
              new Paragraph({
                text: 'Education',
                heading: HeadingLevel.HEADING_2
              }),
              ...editedResume.education.flatMap(edu => [
                new Paragraph({
                  text: edu.degree,
                  heading: HeadingLevel.HEADING_3
                }),
                new Paragraph({
                  text: `${edu.school} | ${edu.location} | ${edu.startDate} - ${edu.endDate}`
                }),
                ...(edu.gpa ? [new Paragraph({ text: `GPA: ${edu.gpa}` })] : []),
                new Paragraph({})
              ]),

              // Skills
              new Paragraph({
                text: 'Skills',
                heading: HeadingLevel.HEADING_2
              }),
              new Paragraph({
                text: editedResume.skills.map(skill => skill.name).join(', ')
              }),
              new Paragraph({}),

              // Certifications
              ...(editedResume.certifications.length > 0 ? [
                new Paragraph({
                  text: 'Certifications',
                  heading: HeadingLevel.HEADING_2
                }),
                ...editedResume.certifications.map(cert =>
                  new Paragraph({
                    text: `${cert.name} - ${cert.issuer} (${cert.date})`
                  })
                )
              ] : [])
            ]
          }]
        });

        // Generate the document
        const buffer = await Packer.toBuffer(doc);
        const base64Content = btoa(String.fromCharCode.apply(null, new Uint8Array(buffer)));
        
        // Save to localStorage
        localStorage.setItem('generatedResume', JSON.stringify({ 
          resume: editedResume,
          docxContent: base64Content 
        }));
        
        navigate('/preview');
      }
    } catch (err) {
      console.error('Error saving resume:', err);
      setError('Failed to save resume changes.');
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 5, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Loading resume data...</Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 5 }}>
        <Alert severity="error">{error}</Alert>
        <Button
          variant="contained"
          onClick={() => navigate('/')}
          sx={{ mt: 2 }}
        >
          Generate New Resume
        </Button>
      </Container>
    );
  }

  if (!editedResume || !docxContent) {
    return (
      <Container maxWidth="lg" sx={{ py: 5 }}>
        <Typography>No resume data found. Please generate a resume first.</Typography>
        <Button
          variant="contained"
          onClick={() => navigate('/')}
          sx={{ mt: 2 }}
        >
          Generate New Resume
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Stack spacing={4}>
        <Box textAlign="center">
          <Typography variant="h3" component="h1" gutterBottom>
            Edit Your Resume
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Edit your resume directly in the editor below
          </Typography>
        </Box>

        <Paper
          elevation={3}
          sx={{
            p: 3,
            height: '800px',
            overflow: 'auto',
            bgcolor: 'background.paper'
          }}
        >
          {loading ? (
            <Box display="flex" justifyContent="center" alignItems="center" height="100%">
              <CircularProgress />
              <Typography sx={{ ml: 2 }}>Loading resume...</Typography>
            </Box>
          ) : error ? (
            <Box display="flex" justifyContent="center" alignItems="center" height="100%">
              <Alert severity="error">{error}</Alert>
            </Box>
          ) : (
            <div 
              ref={containerRef}
              style={{
                width: '100%',
                height: '100%',
                padding: '20mm',
                backgroundColor: 'white',
                boxShadow: '0 0 10px rgba(0,0,0,0.1)'
              }}
            />
          )}
        </Paper>

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={loading}
          >
            Save Changes
          </Button>
          <Button
            variant="outlined"
            onClick={() => navigate('/')}
            disabled={loading}
          >
            Generate Another Resume
          </Button>
        </Box>
      </Stack>
    </Container>
  );
};

export default ResumeEditor; 