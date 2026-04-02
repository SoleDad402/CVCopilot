import React, { useState } from 'react';
import {
  Box, Typography, Button, TextField, Card, CardContent, Stack,
  Chip, Alert, LinearProgress, Divider, Collapse, IconButton,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Tooltip, CircularProgress,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  RocketLaunch as RocketIcon,
  Search as SearchIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  HelpOutline as HelpIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  Description as ResumeIcon,
  Business as CompanyIcon,
  LocationOn as LocationIcon,
  Work as WorkIcon,
  ContentPaste as PasteIcon,
  PlayArrow as RunIcon,
  AutoFixHigh as AutoGenIcon,
  Psychology as LearnedIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { NAVBAR_HEIGHT, colors, gradients } from '../theme';
import { autoBidService, profileService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const SOURCE_COLORS = {
  profile: { bg: '#dcfce7', text: '#166534', label: 'From Profile' },
  auto: { bg: '#dbeafe', text: '#1e40af', label: 'Auto-answered' },
  learned: { bg: '#ede9fe', text: '#5b21b6', label: 'Learned' },
  needs_input: { bg: '#fef3c7', text: '#92400e', label: 'Needs Input' },
  needs_selection: { bg: '#fce7f3', text: '#9d174d', label: 'Needs Selection' },
  optional: { bg: '#f1f5f9', text: '#475569', label: 'Optional' },
};

export default function AutoBidTest() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [jobUrl, setJobUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState(null);
  const [jobData, setJobData] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [showDescription, setShowDescription] = useState(false);
  const [showResume, setShowResume] = useState(false);
  const [showCoverLetter, setShowCoverLetter] = useState(false);
  const [generatingField, setGeneratingField] = useState(null); // fname being generated
  const [generatedAnswers, setGeneratedAnswers] = useState({}); // fname -> answer

  const handleExtract = async () => {
    if (!jobUrl.trim()) return;
    setExtracting(true);
    setError(null);
    setJobData(null);
    setPreviewData(null);
    try {
      const resp = await autoBidService.extract(jobUrl.trim());
      setJobData(resp.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setExtracting(false);
    }
  };

  const handlePreview = async () => {
    if (!jobUrl.trim()) return;
    setLoading(true);
    setError(null);
    setPreviewData(null);
    try {
      // Fetch user profile
      const profileResp = await profileService.getProfile();
      const profileData = profileResp.data;

      // Build user_profile in the format the backend expects
      const u = profileData.user || {};
      const userProfile = {
        full_name: u.full_name || '',
        email: u.email || '',
        phone: u.phone || '',
        location: u.location || '',
        linkedin_url: u.linkedin_url || '',
        github_url: u.github_url || '',
        portfolio_url: u.portfolio_url || '',
        current_title: u.current_title || '',
        address: u.address || '',
        city: u.city || '',
        state: u.state || '',
        zip_code: u.zip_code || '',
        country: u.country || '',
        work_authorization: u.work_authorization || 'authorized',
        visa_sponsorship_needed: u.visa_sponsorship_needed || false,
        willing_to_relocate: u.willing_to_relocate || false,
        remote_preference: u.remote_preference || 'remote',
        desired_salary_min: u.desired_salary_min || null,
        desired_salary_max: u.desired_salary_max || null,
        preferred_pronouns: u.preferred_pronouns || '',
        employment_history: (profileData.employmentHistory || []).map(e => ({
          title: e.position || '',
          company: e.company_name || '',
          location: e.location || '',
          start_date: e.start_date || '',
          end_date: e.end_date || '',
          is_current: Boolean(e.is_current),
        })),
        education: (profileData.education || []).map(e => ({
          school_name: e.school_name || '',
          location: e.location || '',
          degree: e.degree || '',
          field_of_study: e.field_of_study || '',
          start_date: e.start_date || '',
          end_date: e.end_date || '',
          gpa: e.gpa || '',
          description: e.description || '',
        })),
        skills: (profileData.user?.skills || []).map(s =>
          typeof s === 'string' ? { name: s, level: 'intermediate' } : s
        ),
      };

      const resp = await autoBidService.preview(jobUrl.trim(), userProfile, true);
      setPreviewData(resp.data);
      if (!jobData) {
        setJobData(resp.data.job);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAutoGen = async (fname, field) => {
    if (!jobData) return;
    setGeneratingField(fname);
    try {
      const resp = await autoBidService.generateAnswer(
        field.label,
        jobData.company,
        jobData.title,
        jobData.description || '',
        [], // sample_answers — will be populated once patterns exist
      );
      const answer = resp.data.answer;
      setGeneratedAnswers(prev => ({ ...prev, [fname]: answer }));

      // Track as auto-gen choice
      await autoBidService.trackPattern(field.label, jobData.company, 'auto', answer);
    } catch (err) {
      setError(`Failed to generate answer: ${err.response?.data?.error || err.message}`);
    } finally {
      setGeneratingField(null);
    }
  };

  const fieldEntries = previewData?.field_map
    ? Object.entries(previewData.field_map)
    : [];

  return (
    <Box sx={{ pt: `${NAVBAR_HEIGHT + 24}px`, pb: 6, px: { xs: 2, md: 4 }, maxWidth: 1100, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{
        background: gradients.heroHeader,
        borderRadius: 3,
        p: { xs: 3, md: 4 },
        mb: 3,
        color: '#fff',
      }}>
        <Stack direction="row" alignItems="center" spacing={1.5} mb={1}>
          <RocketIcon sx={{ fontSize: 28 }} />
          <Typography variant="h5" fontWeight={700}>Auto-Bid Engine Test</Typography>
          <Chip label="Greenhouse" size="small" sx={{ bgcolor: alpha('#fff', 0.2), color: '#fff', fontWeight: 600 }} />
        </Stack>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="body2" sx={{ opacity: 0.8, flex: 1 }}>
            Paste a Greenhouse job URL to preview how the auto-bid engine extracts the job, maps your profile to form fields, and generates a tailored resume.
          </Typography>
          <Button
            size="small"
            startIcon={<LearnedIcon />}
            onClick={() => navigate('/autobid/learned')}
            sx={{ color: '#fff', borderColor: alpha('#fff', 0.3), ml: 2, whiteSpace: 'nowrap' }}
            variant="outlined"
          >
            Learned Questions
          </Button>
        </Stack>
      </Box>

      {/* URL Input */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="stretch">
            <TextField
              fullWidth
              placeholder="https://boards.greenhouse.io/company/jobs/123456"
              value={jobUrl}
              onChange={(e) => setJobUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleExtract()}
              size="small"
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
            />
            <Button
              variant="outlined"
              onClick={handleExtract}
              disabled={extracting || !jobUrl.trim()}
              startIcon={<SearchIcon />}
              sx={{ minWidth: 120, whiteSpace: 'nowrap' }}
            >
              {extracting ? 'Extracting...' : 'Extract'}
            </Button>
            <Button
              variant="contained"
              onClick={handlePreview}
              disabled={loading || !jobUrl.trim()}
              startIcon={<RunIcon />}
              sx={{ minWidth: 160, whiteSpace: 'nowrap' }}
            >
              {loading ? 'Running...' : 'Full Preview'}
            </Button>
          </Stack>
          {(extracting || loading) && <LinearProgress sx={{ mt: 2, borderRadius: 1 }} />}
          {loading && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Generating tailored resume... this takes 30-90 seconds.
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Job Card */}
      {jobData && (
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
              <Box>
                <Typography variant="h6" fontWeight={700}>{jobData.title}</Typography>
                <Stack direction="row" spacing={2} mt={0.5} flexWrap="wrap">
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <CompanyIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">{jobData.company}</Typography>
                  </Stack>
                  {jobData.location && (
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <LocationIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">{jobData.location}</Typography>
                    </Stack>
                  )}
                  {jobData.department && (
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <WorkIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">{jobData.department}</Typography>
                    </Stack>
                  )}
                </Stack>
              </Box>
              <Chip
                label={`${jobData.questions?.length || 0} questions`}
                size="small"
                color="primary"
                variant="outlined"
              />
            </Stack>

            {/* Collapsible description */}
            <Box sx={{ mt: 2 }}>
              <Button
                size="small"
                onClick={() => setShowDescription(!showDescription)}
                endIcon={showDescription ? <CollapseIcon /> : <ExpandIcon />}
                sx={{ textTransform: 'none', color: 'text.secondary' }}
              >
                {showDescription ? 'Hide' : 'Show'} Job Description
              </Button>
              <Collapse in={showDescription}>
                <Box sx={{
                  mt: 1, p: 2, bgcolor: colors.bgAlt, borderRadius: 2,
                  maxHeight: 300, overflow: 'auto',
                  fontSize: '0.85rem', lineHeight: 1.6, whiteSpace: 'pre-wrap',
                }}>
                  {jobData.description}
                </Box>
              </Collapse>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Preview Results */}
      {previewData && (
        <>
          {/* Summary Stats */}
          <Stack direction="row" spacing={2} mb={3} flexWrap="wrap" useFlexGap>
            <StatPill
              label="Fields Filled"
              value={previewData.summary.fields_filled}
              color={colors.success}
            />
            <StatPill
              label="Auto-answered"
              value={previewData.summary.auto_answered}
              color={colors.info}
            />
            <StatPill
              label="Needs Input"
              value={previewData.summary.needs_input}
              color={colors.warning}
            />
            <StatPill
              label="Needs Selection"
              value={previewData.summary.needs_selection}
              color="#ec4899"
            />
            <StatPill
              label="Total Questions"
              value={previewData.summary.questions_total}
              color={colors.primary}
            />
            <StatPill
              label="Time"
              value={`${(previewData.summary.elapsed_ms / 1000).toFixed(1)}s`}
              color="#64748b"
            />
          </Stack>

          {/* Field Mapping Table */}
          <Card sx={{ mb: 3 }}>
            <CardContent sx={{ p: 0 }}>
              <Box sx={{ p: 2, pb: 1 }}>
                <Typography variant="subtitle1" fontWeight={700}>
                  Form Field Mapping
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  How your profile maps to the application form
                </Typography>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: colors.bgAlt }}>
                      <TableCell sx={{ fontWeight: 600, width: '30%' }}>Question</TableCell>
                      <TableCell sx={{ fontWeight: 600, width: '35%' }}>Value</TableCell>
                      <TableCell sx={{ fontWeight: 600, width: '15%' }}>Source</TableCell>
                      <TableCell sx={{ fontWeight: 600, width: '10%' }}>Required</TableCell>
                      <TableCell sx={{ fontWeight: 600, width: '10%' }}>Field Name</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {fieldEntries.map(([fname, field]) => {
                      const genAnswer = generatedAnswers[fname];
                      const displaySource = genAnswer ? 'learned' : field.source;
                      const sourceInfo = SOURCE_COLORS[displaySource] || SOURCE_COLORS.optional;
                      const isGenerating = generatingField === fname;
                      const canAutoGen = (field.source === 'needs_input' || field.source === 'optional') && !genAnswer;

                      return (
                        <TableRow key={fname} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight={500}>{field.label}</Typography>
                          </TableCell>
                          <TableCell>
                            {genAnswer ? (
                              <Tooltip title={genAnswer}>
                                <Typography variant="body2" sx={{
                                  maxWidth: 300, overflow: 'hidden',
                                  textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                  color: '#5b21b6',
                                }}>
                                  {genAnswer}
                                </Typography>
                              </Tooltip>
                            ) : field.value ? (
                              <Typography variant="body2" sx={{
                                maxWidth: 300, overflow: 'hidden',
                                textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              }}>
                                {field.value}
                              </Typography>
                            ) : field.options ? (
                              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                                {field.options.slice(0, 5).map((opt, i) => (
                                  <Chip key={i} label={opt} size="small" variant="outlined" sx={{ fontSize: '0.75rem' }} />
                                ))}
                                {field.options.length > 5 && (
                                  <Chip label={`+${field.options.length - 5}`} size="small" sx={{ fontSize: '0.75rem' }} />
                                )}
                              </Stack>
                            ) : (
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Typography variant="body2" color="text.secondary" fontStyle="italic">
                                  {field.source === 'needs_input' ? 'Requires answer' : 'Empty'}
                                </Typography>
                                {canAutoGen && (
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={isGenerating ? <CircularProgress size={14} /> : <AutoGenIcon />}
                                    disabled={isGenerating}
                                    onClick={() => handleAutoGen(fname, field)}
                                    sx={{
                                      fontSize: '0.7rem', py: 0.25, px: 1, minWidth: 0,
                                      borderColor: '#8b5cf6', color: '#8b5cf6',
                                      '&:hover': { borderColor: '#7c3aed', bgcolor: alpha('#8b5cf6', 0.05) },
                                    }}
                                  >
                                    {isGenerating ? 'Generating...' : 'Auto-gen'}
                                  </Button>
                                )}
                              </Stack>
                            )}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={sourceInfo.label}
                              size="small"
                              icon={displaySource === 'learned' ? <LearnedIcon sx={{ fontSize: '14px !important' }} /> : undefined}
                              sx={{
                                bgcolor: sourceInfo.bg,
                                color: sourceInfo.text,
                                fontWeight: 600,
                                fontSize: '0.7rem',
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            {field.required ? (
                              <CheckIcon sx={{ fontSize: 18, color: colors.error }} />
                            ) : (
                              <Typography variant="caption" color="text.secondary">No</Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Tooltip title={fname}>
                              <Typography variant="caption" color="text.secondary" sx={{
                                maxWidth: 120, overflow: 'hidden',
                                textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block',
                              }}>
                                {fname}
                              </Typography>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>

          {/* Generated Resume */}
          {previewData.resume && !previewData.resume.error && (
            <Card sx={{ mb: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <ResumeIcon sx={{ color: colors.primary }} />
                    <Typography variant="subtitle1" fontWeight={700}>Generated Resume</Typography>
                  </Stack>
                  <Chip label={previewData.resume.filename} size="small" variant="outlined" />
                </Stack>

                <Button
                  size="small"
                  onClick={() => setShowResume(!showResume)}
                  endIcon={showResume ? <CollapseIcon /> : <ExpandIcon />}
                  sx={{ textTransform: 'none', mb: 1 }}
                >
                  {showResume ? 'Hide' : 'Show'} Resume Text
                </Button>
                <Collapse in={showResume}>
                  <Box sx={{
                    p: 2, bgcolor: colors.bgAlt, borderRadius: 2,
                    maxHeight: 400, overflow: 'auto',
                    fontFamily: 'monospace', fontSize: '0.8rem',
                    lineHeight: 1.6, whiteSpace: 'pre-wrap',
                  }}>
                    {previewData.resume.resume_text}
                  </Box>
                </Collapse>

                {previewData.resume.cover_letter_text && (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <Button
                      size="small"
                      onClick={() => setShowCoverLetter(!showCoverLetter)}
                      endIcon={showCoverLetter ? <CollapseIcon /> : <ExpandIcon />}
                      sx={{ textTransform: 'none', mb: 1 }}
                    >
                      {showCoverLetter ? 'Hide' : 'Show'} Cover Letter
                    </Button>
                    <Collapse in={showCoverLetter}>
                      <Box sx={{
                        p: 2, bgcolor: colors.bgAlt, borderRadius: 2,
                        maxHeight: 300, overflow: 'auto',
                        fontSize: '0.85rem', lineHeight: 1.7, whiteSpace: 'pre-wrap',
                      }}>
                        {previewData.resume.cover_letter_text}
                      </Box>
                    </Collapse>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {previewData.resume?.error && (
            <Alert severity="warning" sx={{ mb: 3 }}>
              Resume generation failed: {previewData.resume.error}
            </Alert>
          )}
        </>
      )}
    </Box>
  );
}

function StatPill({ label, value, color }) {
  return (
    <Box sx={{
      display: 'flex', alignItems: 'center', gap: 1,
      px: 2, py: 1, borderRadius: 2,
      bgcolor: alpha(color, 0.08),
      border: `1px solid ${alpha(color, 0.2)}`,
    }}>
      <Typography variant="h6" fontWeight={700} sx={{ color }}>
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary" fontWeight={500}>
        {label}
      </Typography>
    </Box>
  );
}
