import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Stack,
  CircularProgress,
  Alert,
  Paper,
  LinearProgress,
  Drawer,
  IconButton,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Tabs,
  Tab,
  alpha,
  Snackbar,
  Tooltip
} from '@mui/material';
import {
  Description as DocIcon,
  PictureAsPdf as PdfIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Download as DownloadIcon,
  ContentCopy as CopyIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon,
  Edit as EditIcon,
  QuestionAnswer as QuestionAnswerIcon,
  Clear as ClearIcon,
  AutoFixHigh as AutoFixIcon,
  Bolt as BoltIcon,
  Article as ArticleIcon
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { resumeService, coverLetterService, pollJobStatus } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { NAVBAR_HEIGHT, colors } from '../theme';
import { renderAsync } from 'docx-preview';
import SidebarQA from '../components/SidebarQA';

// Step labels for the generation progress
const GENERATION_STEPS = [
  { min: 0,  max: 20,  label: 'Reading job description…' },
  { min: 20, max: 50,  label: 'Matching your experience…' },
  { min: 50, max: 80,  label: 'Drafting & optimizing…' },
  { min: 80, max: 95,  label: 'Finalizing document…' },
  { min: 95, max: 100, label: 'Almost done…' },
];

function getStepLabel(progress) {
  const step = GENERATION_STEPS.find(s => progress >= s.min && progress < s.max);
  return step ? step.label : 'Generating…';
}

function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'));

  // Core state
  const [companyName, setCompanyName] = useState('');
  const [role, setRole] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [pipelineVersion, setPipelineVersion] = useState(() => {
    const saved = localStorage.getItem('pipelineVersion');
    return saved ? Number(saved) : 1;
  });

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [jobStatus, setJobStatus] = useState(null);
  const [progress, setProgress] = useState(0);
  const [stepLabel, setStepLabel] = useState(null);
  const [error, setError] = useState('');
  const [lastGenerated, setLastGenerated] = useState(null);

  // Generated resume state
  const [generatedResume, setGeneratedResume] = useState(null);
  const [resumeData, setResumeData] = useState(null);
  const [docxContent, setDocxContent] = useState(null);
  const [pdfContent, setPdfContent] = useState(null);

  // Generated cover letter state
  const [generatedCoverLetter, setGeneratedCoverLetter] = useState(null);
  const [coverLetterDocxContent, setCoverLetterDocxContent] = useState(null);
  const [coverLetterPdfContent, setCoverLetterPdfContent] = useState(null);
  const [documentType, setDocumentType] = useState('resume');

  // UI state
  const [revisionDrawerOpen, setRevisionDrawerOpen] = useState(false);
  const [qaDrawerOpen, setQaDrawerOpen] = useState(false);
  const [atsView, setAtsView] = useState(false);

  // Revision state
  const [revisionRequest, setRevisionRequest] = useState('');
  const [revisionScope, setRevisionScope] = useState('full');

  // Auto-save state
  const [saveStatus, setSaveStatus] = useState('saved');
  const autoSaveTimer = useRef(null);

  // Snackbar state
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Preview container ref
  const previewContainerRef = useRef(null);

  // Load job description from URL params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const jobDescriptionParam = params.get('jobDescription');
    if (jobDescriptionParam) {
      setJobDescription(decodeURIComponent(jobDescriptionParam));
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [location]);

  // Auto-save functionality
  useEffect(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    if (companyName || role || jobDescription) {
      setSaveStatus('saving');
      autoSaveTimer.current = setTimeout(() => {
        localStorage.setItem('resumeWorkspace', JSON.stringify({ companyName, role, jobDescription }));
        setSaveStatus('saved');
      }, 1000);
    }
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [companyName, role, jobDescription]);

  // Load saved workspace
  useEffect(() => {
    const saved = localStorage.getItem('resumeWorkspace');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.companyName) setCompanyName(data.companyName);
        if (data.role) setRole(data.role);
        if (data.jobDescription) setJobDescription(data.jobDescription);
      } catch (e) {}
    }
  }, []);

  // Load generated resume from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('generatedResume');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setResumeData(data.resume);
        setGeneratedResume(data.generatedResume);
        setDocxContent(data.docxContent);
        setPdfContent(data.pdfContent);
        if (data.companyName) setCompanyName(data.companyName);
        if (data.role) setRole(data.role);
        if (data.jobDescription) setJobDescription(data.jobDescription);
      } catch (e) {}
    }
  }, []);

  // Render DOCX preview
  useEffect(() => {
    const contentToRender = documentType === 'cover-letter' ? coverLetterDocxContent : docxContent;
    if (contentToRender && previewContainerRef.current && !atsView) {
      const container = previewContainerRef.current;
      container.innerHTML = '';
      try {
        const byteString = atob(contentToRender);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
        const blob = new Blob([ab], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
        renderAsync(blob, container, container, {
          className: 'docx-wrapper',
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          ignoreFonts: false,
          breakPages: true,
          useBase64URL: true,
        }).catch(console.error);
      } catch (e) { console.error(e); }
    }
  }, [docxContent, coverLetterDocxContent, atsView, documentType]);

  const handleGenerateResume = async () => {
    if (!jobDescription.trim()) {
      setError('Please paste a job description first');
      return;
    }
    setIsGenerating(true);
    setError('');
    setJobStatus('starting');
    setProgress(0);
    setStepLabel(null);
    setDocumentType('resume');
    try {
      const { data: jobData } = await resumeService.generateResume({ jobDescription, companyName, role, version: pipelineVersion });
      const { jobId } = jobData;
      setJobStatus('processing');
      const result = await pollJobStatus(jobId, (progressData) => {
        setJobStatus(progressData.status);
        setProgress(progressData.progress || 0);
        if (progressData.stepLabel) setStepLabel(progressData.stepLabel);
        if (progressData.error) setError(progressData.error);
      });
      if (result) {
        setResumeData(result.resume);
        setGeneratedResume(result.generatedResume);
        setDocxContent(result.docxContent);
        setPdfContent(result.pdfContent);
        setLastGenerated(new Date());
        localStorage.setItem('generatedResume', JSON.stringify({
          resume: result.resume,
          generatedResume: result.generatedResume,
          docxContent: result.docxContent,
          pdfContent: result.pdfContent,
          companyName,
          role,
          jobDescription
        }));
      }
    } catch (error) {
      setError(error.message || 'Failed to generate resume. Please try again.');
      setJobStatus('error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateCoverLetter = async () => {
    if (!jobDescription.trim()) {
      setError('Please paste a job description first');
      return;
    }
    setIsGenerating(true);
    setError('');
    setJobStatus('starting');
    setProgress(0);
    setStepLabel(null);
    setDocumentType('cover-letter');
    try {
      const { data: jobData } = await coverLetterService.generateCoverLetter({ jobDescription, companyName, role, resume: resumeData });
      const { jobId } = jobData;
      setJobStatus('processing');
      const result = await pollJobStatus(jobId, (progressData) => {
        setJobStatus(progressData.status);
        setProgress(progressData.progress || 0);
        if (progressData.stepLabel) setStepLabel(progressData.stepLabel);
        if (progressData.error) setError(progressData.error);
      });
      if (result) {
        setGeneratedCoverLetter(result.coverLetter);
        setCoverLetterDocxContent(result.docxContent);
        setCoverLetterPdfContent(result.pdfContent);
        setLastGenerated(new Date());
        localStorage.setItem('generatedCoverLetter', JSON.stringify({
          coverLetter: result.coverLetter,
          docxContent: result.docxContent,
          pdfContent: result.pdfContent,
          companyName,
          role,
          jobDescription
        }));
      }
    } catch (error) {
      setError(error.message || 'Failed to generate cover letter. Please try again.');
      setJobStatus('error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = (format) => {
    if (documentType === 'cover-letter') {
      const content = format === 'pdf' ? coverLetterPdfContent : coverLetterDocxContent;
      if (!content) return;
      const link = document.createElement('a');
      link.href = format === 'pdf'
        ? `data:application/pdf;base64,${content}`
        : `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${content}`;
      link.download = `cover-letter-${companyName || 'cover-letter'}.${format}`;
      link.click();
    } else {
      const content = format === 'pdf' ? pdfContent : docxContent;
      if (!content) return;
      const link = document.createElement('a');
      link.href = format === 'pdf'
        ? `data:application/pdf;base64,${content}`
        : `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${content}`;
      link.download = `resume-${companyName || 'resume'}.${format}`;
      link.click();
    }
  };

  const handleCopyText = async () => {
    try {
      const text = documentType === 'cover-letter' ? generatedCoverLetter : generatedResume;
      if (text) {
        await navigator.clipboard.writeText(text);
        setSnackbar({ open: true, message: 'Copied to clipboard', severity: 'success' });
      }
    } catch {
      setSnackbar({ open: true, message: 'Failed to copy', severity: 'error' });
    }
  };

  const handleAutoclean = () => {
    const cleaned = jobDescription
      .replace(/\[.*?\]/g, '')
      .replace(/\{.*?\}/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    setJobDescription(cleaned);
  };

  const hasContent = generatedResume || generatedCoverLetter;

  // Cmd/Ctrl+Enter shortcut on the JD textarea
  const handleJdKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      if (!isGenerating && jobDescription.trim()) handleGenerateResume();
    }
  };

  return (
    <Box sx={{ display: 'flex', height: `calc(100vh - ${NAVBAR_HEIGHT}px)`, bgcolor: colors.bg, overflow: 'hidden' }}>

      {/* ── Left Panel ── */}
      <Box
        sx={{
          width: { xs: '100%', lg: 400 },
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          bgcolor: '#ffffff',
          borderRight: '1px solid #f1f5f9',
          overflow: 'hidden',
        }}
      >
        {/* Panel body — no header, no scroll needed */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', px: 2.5, pt: 2.5, pb: 2, gap: 1.5, overflow: 'hidden' }}>

          {/* ① JD — hero input, fills remaining vertical space */}
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.75 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.6875rem', letterSpacing: '0.06em' }}>
                Job Description
              </Typography>
              <Stack direction="row" spacing={0.25} alignItems="center">
                {jobDescription && (
                  <Typography variant="caption" sx={{ color: 'text.disabled', mr: 0.5 }}>
                    {jobDescription.length.toLocaleString()} chars
                  </Typography>
                )}
                <Tooltip title="Auto-clean formatting" arrow>
                  <span>
                    <IconButton size="small" onClick={handleAutoclean} disabled={!jobDescription.trim()} sx={{ width: 22, height: 22 }}>
                      <AutoFixIcon sx={{ fontSize: 13 }} />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Clear all" arrow>
                  <span>
                    <IconButton
                      size="small"
                      onClick={() => { setJobDescription(''); setCompanyName(''); setRole(''); }}
                      disabled={!jobDescription.trim() && !companyName.trim() && !role.trim()}
                      sx={{ width: 22, height: 22, color: 'error.main', '&:hover': { bgcolor: alpha('#ef4444', 0.08) } }}
                    >
                      <ClearIcon sx={{ fontSize: 13 }} />
                    </IconButton>
                  </span>
                </Tooltip>
              </Stack>
            </Stack>
            <TextField
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              onKeyDown={handleJdKeyDown}
              placeholder="Paste the full job description here…"
              multiline
              autoFocus
              fullWidth
              size="small"
              sx={{
                flex: 1,
                '& .MuiOutlinedInput-root': {
                  fontSize: '0.8125rem',
                  lineHeight: 1.65,
                  height: '100%',
                  alignItems: 'flex-start',
                  '& textarea': { height: '100% !important', overflow: 'auto !important' },
                },
              }}
            />
          </Box>

          {/* ② Company + Role — compact 2-column row */}
          <Stack direction="row" spacing={1.25}>
            <TextField
              label="Company"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              size="small"
              placeholder="e.g. Stripe"
              sx={{ flex: 1 }}
            />
            <TextField
              label="Role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              size="small"
              placeholder="e.g. Backend Engineer"
              sx={{ flex: 1.4 }}
            />
          </Stack>

          {/* ③ Pipeline version toggle */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500, whiteSpace: 'nowrap' }}>
              Engine
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5, flex: 1 }}>
              {[
                { v: 1, label: 'V1', sub: 'Stable' },
                { v: 2, label: 'V2', sub: 'Multi-pass' },
              ].map(({ v, label, sub, disabled }) => (
                <Box
                  key={v}
                  onClick={() => { if (!disabled) { setPipelineVersion(v); localStorage.setItem('pipelineVersion', v); } }}
                  sx={{
                    flex: 1,
                    py: 0.75,
                    px: 1.5,
                    borderRadius: 1.5,
                    border: '1px solid',
                    borderColor: pipelineVersion === v ? colors.primary : colors.border,
                    bgcolor: pipelineVersion === v ? `${colors.primary}0A` : 'transparent',
                    cursor: disabled ? 'default' : 'pointer',
                    opacity: disabled ? 0.5 : 1,
                    transition: 'all 0.15s',
                    textAlign: 'center',
                    ...(!disabled && pipelineVersion !== v && {
                      '&:hover': { borderColor: colors.primaryLight, bgcolor: `${colors.primary}05` },
                    }),
                  }}
                >
                  <Typography variant="caption" sx={{
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    color: pipelineVersion === v ? colors.primary : 'text.primary',
                    display: 'block',
                    lineHeight: 1.2,
                  }}>
                    {label}
                  </Typography>
                  <Typography variant="caption" sx={{
                    fontSize: '0.625rem',
                    color: pipelineVersion === v ? colors.primary : 'text.disabled',
                    lineHeight: 1,
                  }}>
                    {sub}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>

          {/* ④ Generate button — always visible, no scrolling */}
          <Box>
            <Button
              variant="contained"
              fullWidth
              size="large"
              onClick={handleGenerateResume}
              disabled={isGenerating || !jobDescription.trim()}
              startIcon={isGenerating && documentType === 'resume'
                ? <CircularProgress size={16} color="inherit" />
                : <BoltIcon />
              }
              sx={{ py: 1.5, fontSize: '0.9375rem', letterSpacing: '-0.01em' }}
            >
              {isGenerating && documentType === 'resume' ? 'Generating…' : 'Generate Resume'}
            </Button>
            {!isGenerating && !jobDescription.trim() && (
              <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', textAlign: 'center', mt: 0.75 }}>
                Paste a job description above to start
              </Typography>
            )}
            {!isGenerating && jobDescription.trim() && (
              <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', textAlign: 'center', mt: 0.75 }}>
                or press{' '}
                <Box component="kbd" sx={{ bgcolor: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '4px', px: 0.5, py: 0.1, fontFamily: 'monospace', fontSize: '0.6875rem' }}>
                  ⌘ Enter
                </Box>
              </Typography>
            )}
          </Box>

          {/* ⑤ Progress — inline, no extra scroll */}
          {isGenerating && (
            <Box
              sx={{
                bgcolor: alpha('#6366f1', 0.05),
                border: '1px solid',
                borderColor: alpha('#6366f1', 0.15),
                borderRadius: 2,
                px: 2,
                py: 1.5,
              }}
              className="animate-fade-in"
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.75 }}>
                <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 600 }}>
                  {stepLabel || getStepLabel(progress)}
                </Typography>
                <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 700 }}>
                  {Math.round(progress)}%
                </Typography>
              </Stack>
              <LinearProgress variant="determinate" value={progress} />
            </Box>
          )}

          {/* ⑤ Error */}
          {error && (
            <Alert severity="error" onClose={() => setError('')} sx={{ fontSize: '0.8125rem' }}>
              {error}
            </Alert>
          )}
        </Box>
      </Box>

      {/* ── Right Panel: Preview ── */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', bgcolor: '#f1f5f9' }}>
        {hasContent ? (
          <>
            {/* Document type switcher + toolbar */}
            <Box
              sx={{
                px: 2.5,
                py: 1.25,
                bgcolor: '#fff',
                borderBottom: '1px solid #f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 2,
                flexShrink: 0,
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center">
                {generatedResume && (
                  <Chip
                    label="Resume"
                    size="small"
                    onClick={() => setDocumentType('resume')}
                    sx={{
                      fontWeight: 600,
                      fontSize: '0.8125rem',
                      bgcolor: documentType === 'resume' ? alpha('#6366f1', 0.1) : 'transparent',
                      color: documentType === 'resume' ? 'primary.main' : 'text.secondary',
                      border: '1px solid',
                      borderColor: documentType === 'resume' ? alpha('#6366f1', 0.3) : 'divider',
                      cursor: 'pointer',
                    }}
                  />
                )}
                {generatedCoverLetter && (
                  <Chip
                    label="Cover Letter"
                    size="small"
                    onClick={() => setDocumentType('cover-letter')}
                    sx={{
                      fontWeight: 600,
                      fontSize: '0.8125rem',
                      bgcolor: documentType === 'cover-letter' ? alpha('#6366f1', 0.1) : 'transparent',
                      color: documentType === 'cover-letter' ? 'primary.main' : 'text.secondary',
                      border: '1px solid',
                      borderColor: documentType === 'cover-letter' ? alpha('#6366f1', 0.3) : 'divider',
                      cursor: 'pointer',
                    }}
                  />
                )}
                {lastGenerated && (
                  <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                    Generated {lastGenerated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Typography>
                )}
              </Stack>

              <Stack direction="row" spacing={0.5} alignItems="center">
                <Tooltip title="Copy text" arrow>
                  <IconButton size="small" onClick={handleCopyText} sx={{ border: '1px solid #e2e8f0' }}>
                    <CopyIcon sx={{ fontSize: 15 }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Download DOCX" arrow>
                  <IconButton size="small" onClick={() => handleDownload('docx')} sx={{ border: '1px solid #e2e8f0' }}>
                    <DocIcon sx={{ fontSize: 15 }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Download PDF" arrow>
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<PdfIcon sx={{ fontSize: 14 }} />}
                    onClick={() => handleDownload('pdf')}
                    sx={{ height: 32, px: 1.5, fontSize: '0.8125rem' }}
                  >
                    PDF
                  </Button>
                </Tooltip>
                <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
                <Tooltip title="Revision requests" arrow>
                  <IconButton size="small" onClick={() => setRevisionDrawerOpen(true)} sx={{ border: '1px solid #e2e8f0' }}>
                    <EditIcon sx={{ fontSize: 15 }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Ask about the job" arrow>
                  <IconButton size="small" onClick={() => setQaDrawerOpen(true)} sx={{ border: '1px solid #e2e8f0' }}>
                    <QuestionAnswerIcon sx={{ fontSize: 15 }} />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Box>

            {/* Preview area */}
            <Box
              sx={{
                flex: 1,
                overflow: 'auto',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'flex-start',
                p: 3,
              }}
            >
              <Paper
                elevation={3}
                sx={{
                  width: '8.5in',
                  maxWidth: '100%',
                  bgcolor: 'white',
                  minHeight: '11in',
                  overflow: 'hidden',
                  borderRadius: 2,
                }}
                className="animate-scale-in"
              >
                {atsView ? (
                  <Box sx={{ p: 4 }}>
                    <pre style={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', fontSize: '13px', margin: 0, lineHeight: 1.6 }}>
                      {documentType === 'cover-letter'
                        ? generatedCoverLetter
                        : (generatedResume?.replace(/\*\*/g, '') || '')}
                    </pre>
                  </Box>
                ) : (
                  <Box ref={previewContainerRef} sx={{ width: '100%', minHeight: '100%' }} />
                )}
              </Paper>
            </Box>
          </>
        ) : (
          /* Empty state */
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              p: 4,
            }}
          >
            <Box
              sx={{
                width: 72,
                height: 72,
                borderRadius: 3,
                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 3,
                boxShadow: '0 8px 24px rgba(99,102,241,0.3)',
              }}
            >
              <BoltIcon sx={{ fontSize: 36, color: '#fff' }} />
            </Box>
            <Typography
              variant="h5"
              sx={{ fontWeight: 700, letterSpacing: '-0.02em', color: 'text.primary', mb: 1, textAlign: 'center' }}
            >
              Your resume will appear here
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: 'text.secondary', maxWidth: 320, textAlign: 'center', lineHeight: 1.7 }}
            >
              Paste a job description on the left and click{' '}
              <Box component="span" sx={{ color: 'primary.main', fontWeight: 600 }}>Generate Resume</Box>{' '}
              to get a perfectly tailored document in seconds.
            </Typography>

            <Stack direction="row" spacing={1.5} sx={{ mt: 4 }}>
              {[
                { label: 'ATS-optimized', color: '#6366f1' },
                { label: 'AI-tailored', color: '#ec4899' },
                { label: 'Instant DOCX & PDF', color: '#10b981' },
              ].map(({ label, color }) => (
                <Chip
                  key={label}
                  label={label}
                  size="small"
                  sx={{
                    bgcolor: alpha(color, 0.08),
                    color: color,
                    border: `1px solid ${alpha(color, 0.2)}`,
                    fontWeight: 600,
                    fontSize: '0.75rem',
                  }}
                />
              ))}
            </Stack>
          </Box>
        )}
      </Box>

      {/* ── Revision Drawer ── */}
      <Drawer
        anchor="right"
        open={revisionDrawerOpen}
        onClose={() => setRevisionDrawerOpen(false)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 400 }, bgcolor: '#fff' } }}
      >
        <Box sx={{ p: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Quick Revisions</Typography>
            <IconButton onClick={() => setRevisionDrawerOpen(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Stack>

          <Stack spacing={2}>
            <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'text.secondary' }}>
              Quick tweaks
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
              {['More backend-heavy', 'Tighten bullets', 'Add ops language', 'Reduce buzzwords'].map(label => (
                <Chip
                  key={label}
                  label={label}
                  size="small"
                  variant="outlined"
                  onClick={() => setRevisionRequest(label)}
                  sx={{ cursor: 'pointer', '&:hover': { bgcolor: alpha('#6366f1', 0.06) } }}
                />
              ))}
            </Stack>

            <TextField
              label="Change request"
              value={revisionRequest}
              onChange={(e) => setRevisionRequest(e.target.value)}
              multiline
              rows={4}
              fullWidth
              placeholder="Describe what you'd like to change…"
            />

            <FormControl fullWidth size="small">
              <InputLabel>Apply to</InputLabel>
              <Select value={revisionScope} onChange={(e) => setRevisionScope(e.target.value)} label="Apply to">
                <MenuItem value="full">Full Resume</MenuItem>
                <MenuItem value="summary">Summary Only</MenuItem>
                <MenuItem value="skills">Skills Only</MenuItem>
              </Select>
            </FormControl>

            <Button
              variant="contained"
              fullWidth
              size="large"
              onClick={() => setRevisionDrawerOpen(false)}
            >
              Regenerate
            </Button>
          </Stack>
        </Box>
      </Drawer>

      {/* ── Snackbar ── */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* ── Q&A Sidebar ── */}
      <SidebarQA
        jobDescription={jobDescription}
        resume={resumeData}
        open={qaDrawerOpen}
        onClose={() => setQaDrawerOpen(false)}
      />
    </Box>
  );
}

export default Home;
