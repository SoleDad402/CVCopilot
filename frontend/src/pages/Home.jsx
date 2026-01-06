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
  Switch,
  FormControlLabel,
  Slider,
  RadioGroup,
  Radio,
  Divider,
  Collapse,
  Tooltip,
  Avatar,
  Menu,
  Breadcrumbs,
  Link,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  alpha,
  Snackbar
} from '@mui/material';
import {
  Description as DocIcon,
  PictureAsPdf as PdfIcon,
  History as HistoryIcon,
  Add as AddIcon,
  AccountCircle as AccountIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Download as DownloadIcon,
  ContentCopy as CopyIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  ChevronRight as ChevronRightIcon,
  Close as CloseIcon,
  Save as SaveIcon,
  Edit as EditIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { resumeService, pollJobStatus, historyService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { renderAsync } from 'docx-preview';

function Home() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'));
  
  // Core state
  const [companyName, setCompanyName] = useState('');
  const [role, setRole] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [baselineResume, setBaselineResume] = useState('');
  const [lockBaseline, setLockBaseline] = useState(false);
  
  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [jobStatus, setJobStatus] = useState(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [lastGenerated, setLastGenerated] = useState(null);
  
  // Generated resume state
  const [generatedResume, setGeneratedResume] = useState(null);
  const [resumeData, setResumeData] = useState(null);
  const [docxContent, setDocxContent] = useState(null);
  const [pdfContent, setPdfContent] = useState(null);
  
  // UI state
  const [activeSection, setActiveSection] = useState('jd');
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [revisionDrawerOpen, setRevisionDrawerOpen] = useState(false);
  const [evidenceMode, setEvidenceMode] = useState(false);
  const [atsView, setAtsView] = useState(false);
  const [highlightChanges, setHighlightChanges] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [template, setTemplate] = useState('modern');
  const [fontSize, setFontSize] = useState('medium');
  const [pageWidth, setPageWidth] = useState('letter');
  
  // Targeting controls
  const [seniority, setSeniority] = useState('senior');
  const [roleFocus, setRoleFocus] = useState('backend');
  const [emphasis, setEmphasis] = useState({
    reliability: 2,
    scalability: 2,
    domain: 1,
    leadership: 1,
    delivery: 2
  });
  const [constraints, setConstraints] = useState({
    noMetricsUnlessInNotes: true,
    onlyEvidencedSkills: true,
    avoidBannedPhrases: true
  });
  
  // Revision state
  const [revisionRequest, setRevisionRequest] = useState('');
  const [revisionScope, setRevisionScope] = useState('full');
  
  // History state
  const [historyItems, setHistoryItems] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  
  // Menu state
  const [anchorEl, setAnchorEl] = useState(null);
  
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
    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
    }
    
    if (companyName || role || jobDescription) {
      setSaveStatus('saving');
      autoSaveTimer.current = setTimeout(() => {
        const data = { companyName, role, jobDescription, baselineResume };
        localStorage.setItem('resumeWorkspace', JSON.stringify(data));
        setSaveStatus('saved');
      }, 1000);
    }
    
    return () => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }
    };
  }, [companyName, role, jobDescription, baselineResume]);

  // Load saved workspace
  useEffect(() => {
    const saved = localStorage.getItem('resumeWorkspace');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.companyName) setCompanyName(data.companyName);
        if (data.role) setRole(data.role);
        if (data.jobDescription) setJobDescription(data.jobDescription);
        if (data.baselineResume) setBaselineResume(data.baselineResume);
      } catch (e) {
        console.error('Failed to load saved workspace:', e);
      }
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
      } catch (e) {
        console.error('Failed to load saved resume:', e);
      }
    }
  }, []);

  // Render DOCX preview
  useEffect(() => {
    if (docxContent && previewContainerRef.current && !atsView) {
      const container = previewContainerRef.current;
      container.innerHTML = ''; // Clear previous content
      
      try {
        const byteString = atob(docxContent);
        const mimeString = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        
        const blob = new Blob([ab], { type: mimeString });
        
        renderAsync(blob, container, container, {
          className: 'docx-wrapper',
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          ignoreFonts: false,
          breakPages: true,
          useBase64URL: true,
        }).catch(error => {
          console.error('Error rendering docx:', error);
        });
      } catch (error) {
        console.error('Error processing docx:', error);
      }
    }
  }, [docxContent, atsView]);

  const handleGenerateResume = async () => {
    if (!jobDescription.trim()) {
      setError('Please enter a job description');
      return;
    }

    setIsGenerating(true);
    setError('');
    setJobStatus('starting');
    setProgress(0);

    try {
      const { data: jobData } = await resumeService.generateResume({ 
        jobDescription, 
        companyName, 
        role 
      });
      const { jobId } = jobData;
      
      setJobStatus('processing');
      
      const result = await pollJobStatus(
        jobId,
        (progressData) => {
          setJobStatus(progressData.status);
          setProgress(progressData.progress || 0);
          if (progressData.error) {
            setError(progressData.error);
          }
        }
      );

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

  const handleLoadHistory = async () => {
    setHistoryLoading(true);
    try {
      const { data } = await historyService.getHistory();
      const allItems = Object.values(data.history || {}).flat();
      setHistoryItems(allItems);
    } catch (e) {
      console.error('Failed to load history:', e);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleLoadFromHistory = (item) => {
    setCompanyName(item.company_name || '');
    setRole(item.role || '');
    // Load the resume data if available
    setHistoryDrawerOpen(false);
  };

  const handleDownload = async (format) => {
    if (format === 'pdf' && pdfContent) {
      const link = document.createElement('a');
      link.href = `data:application/pdf;base64,${pdfContent}`;
      link.download = `resume-${companyName || 'resume'}.pdf`;
      link.click();
    } else if (format === 'docx' && docxContent) {
      const link = document.createElement('a');
      link.href = `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${docxContent}`;
      link.download = `resume-${companyName || 'resume'}.docx`;
      link.click();
    }
  };

  const handleCopyText = async () => {
    if (generatedResume) {
      try {
        await navigator.clipboard.writeText(generatedResume);
        setSnackbar({ open: true, message: 'Resume text copied to clipboard', severity: 'success' });
      } catch (e) {
        setSnackbar({ open: true, message: 'Failed to copy text', severity: 'error' });
      }
    }
  };

  const formatTimeAgo = (date) => {
    if (!date) return '';
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: '#F6F7FB' }}>
      {/* Top Nav */}
      <Paper 
        elevation={0} 
        sx={{ 
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          zIndex: 1100
        }}
      >
        <Box sx={{ px: 3, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Left: Breadcrumb */}
          <Breadcrumbs separator={<ChevronRightIcon fontSize="small" />} sx={{ flex: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
              Resume Generator
            </Typography>
            {companyName && (
              <Typography variant="body2" color="text.secondary">
                {companyName}
              </Typography>
            )}
            {role && (
              <Typography variant="body2" color="text.secondary">
                {role}
              </Typography>
            )}
          </Breadcrumbs>

          {/* Center: Status */}
          <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1 }}>
            {isGenerating ? (
              <Chip 
                icon={<CircularProgress size={16} />} 
                label={jobStatus === 'processing' ? 'Generating...' : 'Starting...'} 
                size="small"
                sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1) }}
              />
            ) : saveStatus === 'saved' ? (
              <Chip 
                icon={<CheckCircleIcon fontSize="small" />} 
                label={lastGenerated ? `Last updated ${formatTimeAgo(lastGenerated)}` : 'Saved'} 
                size="small"
                color="success"
                variant="outlined"
              />
            ) : (
              <Chip 
                label="Saving..." 
                size="small"
                sx={{ bgcolor: alpha(theme.palette.warning.main, 0.1) }}
              />
            )}
          </Box>

          {/* Right: Actions */}
          <Stack direction="row" spacing={1} alignItems="center">
            <Button
              variant="outlined"
              size="small"
              startIcon={<HistoryIcon />}
              onClick={() => {
                handleLoadHistory();
                setHistoryDrawerOpen(true);
              }}
              sx={{ textTransform: 'none' }}
            >
              History
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => {
                setCompanyName('');
                setRole('');
                setJobDescription('');
                setGeneratedResume(null);
                setResumeData(null);
              }}
              sx={{ textTransform: 'none' }}
            >
              New
            </Button>
            <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                {user?.email?.[0]?.toUpperCase() || 'U'}
              </Avatar>
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={() => setAnchorEl(null)}
            >
              <MenuItem onClick={() => { setAnchorEl(null); navigate('/profile'); }}>
                <AccountIcon sx={{ mr: 1 }} /> Profile
              </MenuItem>
              <MenuItem onClick={() => { setAnchorEl(null); navigate('/history'); }}>
                <HistoryIcon sx={{ mr: 1 }} /> History
              </MenuItem>
              <Divider />
              <MenuItem onClick={() => { setAnchorEl(null); logout(); navigate('/login'); }}>
                Logout
              </MenuItem>
            </Menu>
          </Stack>
        </Box>
      </Paper>

      {/* Main Body: 2-column layout */}
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left Panel: Inputs (380-440px) */}
        <Paper
          elevation={0}
          sx={{
            width: { xs: '100%', lg: 420 },
            borderRight: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          <Box sx={{ p: 3, overflowY: 'auto', flex: 1 }}>
            <Stack spacing={3}>
              {/* Section A: Baseline Resume */}
              <Accordion defaultExpanded={false} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, textTransform: 'uppercase', fontSize: 12, letterSpacing: 0.5 }}>
                    A. Baseline Resume
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Stack spacing={2}>
                    <TextField
                      value={baselineResume}
                      onChange={(e) => setBaselineResume(e.target.value)}
                      placeholder="Paste your current resume text here..."
                      multiline
                      rows={6}
                      fullWidth
                      size="small"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={lockBaseline}
                          onChange={(e) => setLockBaseline(e.target.checked)}
                          size="small"
                        />
                      }
                      label="Lock facts to baseline (prevents invented employers/dates/tools)"
                    />
                  </Stack>
                </AccordionDetails>
              </Accordion>

              {/* Section B: Job Description */}
              <Accordion defaultExpanded={true} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, textTransform: 'uppercase', fontSize: 12, letterSpacing: 0.5 }}>
                    B. Job Description
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Stack spacing={2}>
                    <Tabs value={0} size="small">
                      <Tab label="Paste" />
                      <Tab label="URL" disabled />
                      <Tab label="Upload PDF" disabled />
                    </Tabs>
                    <TextField
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                      placeholder="Paste the job description here..."
                      multiline
                      rows={10}
                      fullWidth
                      size="small"
                      helperText={`${jobDescription.length} characters`}
                    />
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => {
                        // Auto-clean JD
                        const cleaned = jobDescription
                          .replace(/\[.*?\]/g, '')
                          .replace(/\{.*?\}/g, '')
                          .replace(/\n{3,}/g, '\n\n');
                        setJobDescription(cleaned);
                      }}
                    >
                      Auto-clean
                    </Button>
                    <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                      {companyName && (
                        <Chip label={`Company: ${companyName}`} size="small" onDelete={() => setCompanyName('')} />
                      )}
                      {role && (
                        <Chip label={`Role: ${role}`} size="small" onDelete={() => setRole('')} />
                      )}
                      <Chip label={`Seniority: ${seniority}`} size="small" />
                    </Stack>
                    <TextField
                      label="Company Name"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      fullWidth
                      size="small"
                    />
                    <TextField
                      label="Role"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      fullWidth
                      size="small"
                    />
                  </Stack>
                </AccordionDetails>
              </Accordion>

              {/* Section C: Targeting Controls */}
              <Accordion defaultExpanded={false} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, textTransform: 'uppercase', fontSize: 12, letterSpacing: 0.5 }}>
                    C. Targeting Controls
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Stack spacing={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Seniority</InputLabel>
                      <Select value={seniority} onChange={(e) => setSeniority(e.target.value)} label="Seniority">
                        <MenuItem value="mid">Mid</MenuItem>
                        <MenuItem value="senior">Senior</MenuItem>
                        <MenuItem value="staff">Staff</MenuItem>
                      </Select>
                    </FormControl>

                    <FormControl>
                      <Typography variant="caption" sx={{ mb: 1, fontWeight: 600 }}>Role Focus</Typography>
                      <RadioGroup value={roleFocus} onChange={(e) => setRoleFocus(e.target.value)}>
                        <FormControlLabel value="backend" control={<Radio size="small" />} label="Backend" />
                        <FormControlLabel value="fullstack" control={<Radio size="small" />} label="Full Stack" />
                        <FormControlLabel value="platform" control={<Radio size="small" />} label="Platform" />
                      </RadioGroup>
                    </FormControl>

                    <Box>
                      <Typography variant="caption" sx={{ mb: 1, fontWeight: 600, display: 'block' }}>Emphasis (0-3)</Typography>
                      {Object.keys(emphasis).map((key) => (
                        <Box key={key} sx={{ mb: 2 }}>
                          <Typography variant="caption" sx={{ textTransform: 'capitalize' }}>{key}</Typography>
                          <Slider
                            value={emphasis[key]}
                            onChange={(e, val) => setEmphasis({ ...emphasis, [key]: val })}
                            min={0}
                            max={3}
                            step={1}
                            marks
                            size="small"
                          />
                        </Box>
                      ))}
                    </Box>

                    <Box>
                      <Typography variant="caption" sx={{ mb: 1, fontWeight: 600, display: 'block' }}>Constraints</Typography>
                      <Stack spacing={1}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={constraints.noMetricsUnlessInNotes}
                              onChange={(e) => setConstraints({ ...constraints, noMetricsUnlessInNotes: e.target.checked })}
                              size="small"
                            />
                          }
                          label="No metrics unless in notes"
                        />
                        <FormControlLabel
                          control={
                            <Switch
                              checked={constraints.onlyEvidencedSkills}
                              onChange={(e) => setConstraints({ ...constraints, onlyEvidencedSkills: e.target.checked })}
                              size="small"
                            />
                          }
                          label="Only include skills evidenced in experience"
                        />
                        <FormControlLabel
                          control={
                            <Switch
                              checked={constraints.avoidBannedPhrases}
                              onChange={(e) => setConstraints({ ...constraints, avoidBannedPhrases: e.target.checked })}
                              size="small"
                            />
                          }
                          label="Avoid banned phrases"
                        />
                      </Stack>
                    </Box>
                  </Stack>
                </AccordionDetails>
              </Accordion>

              {/* Section D: Generate */}
              <Box>
                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  onClick={handleGenerateResume}
                  disabled={isGenerating || !jobDescription.trim()}
                  startIcon={isGenerating ? <CircularProgress size={20} color="inherit" /> : <RefreshIcon />}
                  sx={{ py: 1.5, fontWeight: 600 }}
                >
                  {isGenerating ? 'Generating...' : 'Generate Resume'}
                </Button>
                {isGenerating && (
                  <Box sx={{ mt: 2 }}>
                    <LinearProgress variant="determinate" value={progress} />
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                      {jobStatus === 'processing' ? 'Analyzing JD → Drafting → Validating → Rendering' : 'Starting...'}
                    </Typography>
                  </Box>
                )}
                {error && (
                  <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError('')}>
                    {error}
                  </Alert>
                )}
              </Box>
            </Stack>
          </Box>
        </Paper>

        {/* Right Panel: Preview (flex) */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', bgcolor: '#F6F7FB' }}>
          {generatedResume ? (
            <>
              {/* Preview Toolbar */}
              <Paper
                elevation={0}
                sx={{
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  p: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 2
                }}
              >
                <Stack direction="row" spacing={1} alignItems="center">
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <Select value={template} onChange={(e) => setTemplate(e.target.value)} size="small">
                      <MenuItem value="modern">Modern</MenuItem>
                      <MenuItem value="classic">Classic</MenuItem>
                      <MenuItem value="ats">ATS Minimal</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={{ minWidth: 100 }}>
                    <Select value={fontSize} onChange={(e) => setFontSize(e.target.value)} size="small">
                      <MenuItem value="small">Small</MenuItem>
                      <MenuItem value="medium">Medium</MenuItem>
                      <MenuItem value="large">Large</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={{ minWidth: 100 }}>
                    <Select value={pageWidth} onChange={(e) => setPageWidth(e.target.value)} size="small">
                      <MenuItem value="letter">Letter</MenuItem>
                      <MenuItem value="a4">A4</MenuItem>
                    </Select>
                  </FormControl>
                  <Divider orientation="vertical" flexItem />
                  <Tooltip title="Highlight changes">
                    <IconButton size="small" onClick={() => setHighlightChanges(!highlightChanges)}>
                      {highlightChanges ? <VisibilityIcon /> : <VisibilityOffIcon />}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="ATS view">
                    <IconButton size="small" onClick={() => setAtsView(!atsView)}>
                      {atsView ? <VisibilityIcon /> : <VisibilityOffIcon />}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Evidence mode">
                    <IconButton size="small" onClick={() => setEvidenceMode(!evidenceMode)} color={evidenceMode ? 'primary' : 'default'}>
                      <InfoIcon />
                    </IconButton>
                  </Tooltip>
                  <Divider orientation="vertical" flexItem />
                  <IconButton size="small" onClick={() => setZoom(Math.max(50, zoom - 10))}>
                    <ZoomOutIcon />
                  </IconButton>
                  <Typography variant="body2" sx={{ minWidth: 50, textAlign: 'center' }}>{zoom}%</Typography>
                  <IconButton size="small" onClick={() => setZoom(Math.min(200, zoom + 10))}>
                    <ZoomInIcon />
                  </IconButton>
                </Stack>
                <IconButton size="small" onClick={() => setRevisionDrawerOpen(true)}>
                  <EditIcon />
                </IconButton>
              </Paper>

              {/* Preview Body */}
              <Box sx={{ flex: 1, overflow: 'auto', p: 3, display: 'flex', justifyContent: 'center' }}>
                <Paper
                  elevation={3}
                  sx={{
                    width: pageWidth === 'letter' ? '8.5in' : '210mm',
                    minHeight: '11in',
                    bgcolor: 'white',
                    p: 4,
                    transform: `scale(${zoom / 100})`,
                    transformOrigin: 'top center',
                    transition: 'transform 0.2s',
                    position: 'relative'
                  }}
                >
                  {atsView ? (
                    <pre style={{ 
                      fontFamily: 'monospace', 
                      whiteSpace: 'pre-wrap',
                      fontSize: fontSize === 'small' ? '12px' : fontSize === 'large' ? '16px' : '14px',
                      margin: 0
                    }}>
                      {generatedResume.replace(/\*\*/g, '')}
                    </pre>
                  ) : docxContent ? (
                    <Box ref={previewContainerRef} sx={{ width: '100%', minHeight: '100%' }} />
                  ) : (
                    <pre style={{ 
                      fontFamily: 'inherit', 
                      whiteSpace: 'pre-wrap',
                      fontSize: fontSize === 'small' ? '12px' : fontSize === 'large' ? '16px' : '14px',
                      margin: 0
                    }}>
                      {generatedResume}
                    </pre>
                  )}
                  
                  {/* Evidence Mode Overlay */}
                  {evidenceMode && resumeData && (
                    <Box sx={{ 
                      position: 'absolute', 
                      top: 8, 
                      right: 8,
                      bgcolor: 'background.paper',
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      p: 1
                    }}>
                      <Stack spacing={0.5}>
                        <Chip 
                          icon={<CheckCircleIcon sx={{ color: 'success.main' }} />} 
                          label="Supported" 
                          size="small" 
                          sx={{ fontSize: 10 }}
                        />
                        <Chip 
                          icon={<WarningIcon sx={{ color: 'warning.main' }} />} 
                          label="Inferred" 
                          size="small" 
                          sx={{ fontSize: 10 }}
                        />
                        <Chip 
                          icon={<ErrorIcon sx={{ color: 'error.main' }} />} 
                          label="Needs Review" 
                          size="small" 
                          sx={{ fontSize: 10 }}
                        />
                      </Stack>
                    </Box>
                  )}
                </Paper>
              </Box>

              {/* Bottom Action Bar */}
              <Paper
                elevation={0}
                sx={{
                  borderTop: '1px solid',
                  borderColor: 'divider',
                  p: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  {lastGenerated ? `Last generated: ${lastGenerated.toLocaleString()}` : 'Ready to download'}
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<CopyIcon />}
                    onClick={handleCopyText}
                    sx={{ textTransform: 'none' }}
                  >
                    Copy Text
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<DocIcon />}
                    onClick={() => handleDownload('docx')}
                    sx={{ textTransform: 'none' }}
                  >
                    DOCX
                  </Button>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<PdfIcon />}
                    onClick={() => handleDownload('pdf')}
                    sx={{ textTransform: 'none' }}
                  >
                    PDF
                  </Button>
                </Stack>
              </Paper>
            </>
          ) : (
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 4 }}>
              <Stack spacing={2} alignItems="center" sx={{ maxWidth: 400, textAlign: 'center' }}>
                <Typography variant="h6" color="text.secondary">
                  No resume generated yet
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Fill in the job description and click "Generate Resume" to see a preview here
                </Typography>
              </Stack>
            </Box>
          )}
        </Box>
      </Box>

      {/* History Drawer */}
      <Drawer
        anchor="right"
        open={historyDrawerOpen}
        onClose={() => setHistoryDrawerOpen(false)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 480 } } }}
      >
        <Box sx={{ p: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
            <Typography variant="h6">Resume History</Typography>
            <IconButton onClick={() => setHistoryDrawerOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Stack>
          {historyLoading ? (
            <CircularProgress />
          ) : (
            <Stack spacing={1}>
              {historyItems.map((item) => (
                <Paper
                  key={item.id}
                  sx={{
                    p: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' }
                  }}
                  onClick={() => handleLoadFromHistory(item)}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    {item.company_name || 'Company'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {item.role || 'Role'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {item.created_at ? new Date(item.created_at).toLocaleDateString() : ''}
                  </Typography>
                </Paper>
              ))}
            </Stack>
          )}
        </Box>
      </Drawer>

      {/* Revision Drawer */}
      <Drawer
        anchor="right"
        open={revisionDrawerOpen}
        onClose={() => setRevisionDrawerOpen(false)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 400 } } }}
      >
        <Box sx={{ p: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
            <Typography variant="h6">Quick Revisions</Typography>
            <IconButton onClick={() => setRevisionDrawerOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Stack>
          <Stack spacing={2}>
            <Typography variant="caption" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>Quick Tweaks</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
              <Chip label="More backend-heavy" size="small" onClick={() => setRevisionRequest('Make it more backend-heavy')} />
              <Chip label="Tighten bullets" size="small" onClick={() => setRevisionRequest('Tighten the bullet points')} />
              <Chip label="Add ops language" size="small" onClick={() => setRevisionRequest('Add more operations language')} />
              <Chip label="Reduce buzzwords" size="small" onClick={() => setRevisionRequest('Reduce buzzwords')} />
            </Stack>
            <TextField
              label="Change request"
              value={revisionRequest}
              onChange={(e) => setRevisionRequest(e.target.value)}
              multiline
              rows={4}
              fullWidth
              placeholder="Describe what you'd like to change..."
            />
            <FormControl fullWidth>
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
              onClick={() => {
                // Handle regeneration with revision
                setRevisionDrawerOpen(false);
              }}
            >
              Regenerate
            </Button>
          </Stack>
        </Box>
      </Drawer>

      {/* Evidence Mode Panel */}
      {evidenceMode && resumeData && (
        <Paper
          elevation={0}
          sx={{
            position: 'absolute',
            bottom: 80,
            right: 24,
            width: 320,
            maxHeight: 400,
            overflow: 'auto',
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            p: 2
          }}
        >
          <Stack spacing={2}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Evidence Mode</Typography>
              <IconButton size="small" onClick={() => setEvidenceMode(false)}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Stack>
            <Divider />
            <Typography variant="caption" color="text.secondary">
              Each bullet is color-coded based on traceability to your baseline resume:
            </Typography>
            <Stack spacing={1}>
              <Stack direction="row" spacing={1} alignItems="center">
                <CheckCircleIcon sx={{ color: 'success.main', fontSize: 16 }} />
                <Typography variant="caption">Supported by baseline notes</Typography>
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center">
                <WarningIcon sx={{ color: 'warning.main', fontSize: 16 }} />
                <Typography variant="caption">Inferred phrasing (still safe)</Typography>
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center">
                <ErrorIcon sx={{ color: 'error.main', fontSize: 16 }} />
                <Typography variant="caption">Needs review (tool claimed but not in experience)</Typography>
              </Stack>
            </Stack>
            <Button
              variant="outlined"
              size="small"
              fullWidth
              onClick={() => {
                // Open checklist for fixing flagged claims
                setSnackbar({ open: true, message: 'Evidence review feature coming soon', severity: 'info' });
              }}
            >
              Fix Flagged Claims
            </Button>
          </Stack>
        </Paper>
      )}

      {/* Snackbar */}
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
    </Box>
  );
}

export default Home;
