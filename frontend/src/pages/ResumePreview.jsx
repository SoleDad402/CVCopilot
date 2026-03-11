import { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Stack,
  IconButton,
  Paper,
  Snackbar,
  Alert
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { PictureAsPdf as PdfIcon, Description as DocIcon } from '@mui/icons-material';
import { jsPDF } from 'jspdf';
import { renderAsync } from 'docx-preview';
import html2canvas from 'html2canvas';
import SidebarQA from '../components/SidebarQA';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { NAVBAR_HEIGHT } from '../theme';

function ResumePreview() {
  const [resume, setResume] = useState(null);
  const [docxContent, setDocxContent] = useState(null);
  const [pdfContent, setPdfContent] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    const savedResume = localStorage.getItem('generatedResume');
    if (!savedResume) {
      navigate('/');
      return;
    }
    try {
      const parsedResume = JSON.parse(savedResume);
      setResume(parsedResume.resume);
      setDocxContent(parsedResume.docxContent);
      setPdfContent(parsedResume.pdfContent || null);
    } catch (err) {
      setSnackbar({
        open: true,
        message: 'Failed to load resume data. Please try generating a new resume.',
        severity: 'error'
      });
      setTimeout(() => navigate('/'), 3000);
    }
  }, [navigate]);

  useEffect(() => {
    if (docxContent) {
      const container = document.getElementById('docx-container');
      if (container) {
        // Convert base64 to blob
        const byteString = atob(docxContent);
        const mimeString = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        
        const blob = new Blob([ab], { type: mimeString });
        
        // Render the docx
        renderAsync(blob, container, container, {
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
        }).catch(error => {
          console.error('Error rendering docx:', error);
          setSnackbar({
            open: true,
            message: 'Failed to render document preview',
            severity: 'error'
          });
        });
      }
    }
  }, [docxContent]);

  const handleDownloadPDF = async () => {
    if (!pdfContent) {
      setSnackbar({ open: true, message: 'PDF not available. Please regenerate your resume.', severity: 'error' });
      return;
    }
    try {
      // Convert base64 to blob
      const byteString = atob(pdfContent);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      let accountName = resume && resume.name ? resume.name : 'resume';
      a.href = url;
      a.download = `${accountName}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setSnackbar({ open: true, message: 'Resume downloaded as PDF', severity: 'success' });
    } catch (error) {
      console.log(error);
      setSnackbar({ open: true, message: 'Failed to download PDF', severity: 'error' });
    }
  };

  const handleDownloadDOCX = () => {
    if (!docxContent) return;

    try {
      // Convert base64 to blob
      const byteString = atob(docxContent);
      const mimeString = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      
      const blob = new Blob([ab], { type: mimeString });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      let accountName = resume && resume.name ? resume.name : 'resume';
      a.href = url;
      a.download = `${accountName}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSnackbar({
        open: true,
        message: 'Resume downloaded as DOCX',
        severity: 'success'
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Failed to download DOCX',
        severity: 'error'
      });
    }
  };

  // Try to get job description from resume or localStorage
  let jobDescription = '';
  if (resume && resume.jobDescription) {
    jobDescription = resume.jobDescription;
  } else {
    try {
      const savedResume = localStorage.getItem('generatedResume');
      if (savedResume) {
        const parsed = JSON.parse(savedResume);
        jobDescription = parsed.jobDescription || '';
      }
    } catch {}
  }

  if (!resume) {
    return (
      <Container maxWidth="md" sx={{ py: 5 }}>
        <Typography>Loading resume data...</Typography>
      </Container>
    );
  }

  return (
    <>
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: `calc(100vh - ${NAVBAR_HEIGHT}px)`,
        bgcolor: '#F6F7FB',
        overflow: 'hidden'
      }}>
        <Box sx={{ 
          flex: 1, 
          overflow: 'auto', 
          p: 2, 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'flex-start'
        }}>
          <Paper
            elevation={3}
            sx={{
              width: '8.5in',
              maxWidth: '100%',
              bgcolor: 'white',
              p: 3,
              position: 'relative',
              overflow: 'auto'
            }}
          >
            <div id="docx-container" style={{ width: '100%', minHeight: '100%' }} />
          </Paper>
        </Box>
        <Paper
          elevation={0}
          sx={{
            borderTop: '1px solid',
            borderColor: 'divider',
            p: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            flexShrink: 0
          }}
        >
          <Button
            variant="contained"
            color="error"
            size="small"
            startIcon={<PdfIcon />}
            onClick={handleDownloadPDF}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Download PDF
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<DocIcon />}
            onClick={handleDownloadDOCX}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Download DOCX
          </Button>
        </Paper>
      </Box>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
      <SidebarQA jobDescription={jobDescription} resume={resume} />
    </>
  );
}

export default ResumePreview; 