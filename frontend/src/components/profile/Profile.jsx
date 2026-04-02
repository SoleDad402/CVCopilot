import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  TextField,
  Stack,
  Typography,
  Container,
  Grid,
  Snackbar,
  Alert,
  Avatar,
  Chip,
  CircularProgress,
  Tabs,
  Tab,
  FormControlLabel,
  Switch
} from '@mui/material';
import {
  Person as PersonIcon,
  Work as WorkIcon,
  School as SchoolIcon,
  Save as SaveIcon,
  LinkedIn as LinkedInIcon,
  GitHub as GitHubIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  Email as EmailIcon,
  Tune as TuneIcon,
  RocketLaunch as RocketIcon,
  Home as HomeIcon,
  AttachMoney as MoneyIcon,
  Language as WebIcon,
} from '@mui/icons-material';
import { NAVBAR_HEIGHT, colors, gradients } from '../../theme';
import { useAuth } from '../../contexts/AuthContext';
import EmploymentHistory from './EmploymentHistory';
import EducationHistory from './EducationHistory';
import { profileService } from '../../services/api';

const getInitials = (name) => {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

const Profile = () => {
  const { user, updateProfile } = useAuth();
  const [tab, setTab] = useState(0);

  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    personal_email: '',
    linkedin_url: '',
    github_url: '',
    location: '',
  });

  const [jobApplyData, setJobApplyData] = useState({
    address: '',
    city: '',
    state: '',
    zip_code: '',
    country: 'United States',
    portfolio_url: '',
    current_title: '',
    work_authorization: 'authorized',
    visa_sponsorship_needed: false,
    willing_to_relocate: false,
    remote_preference: 'remote',
    desired_salary_min: '',
    desired_salary_max: '',
    preferred_pronouns: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const [employmentHistory, setEmploymentHistory] = useState([]);
  const [education, setEducation] = useState([]);

  // Preferences state
  const [pipelineVersion, setPipelineVersion] = useState(() => {
    const saved = localStorage.getItem('pipelineVersion');
    return saved ? Number(saved) : 1;
  });
  const [bulletCount, setBulletCount] = useState(() => {
    const saved = localStorage.getItem('bulletCount');
    return saved ? Number(saved) : 5;
  });
  const [includeAchievements, setIncludeAchievements] = useState(() => {
    const saved = localStorage.getItem('includeAchievements');
    return saved !== null ? saved === 'true' : true;
  });
  const [includeHobbies, setIncludeHobbies] = useState(() => {
    const saved = localStorage.getItem('includeHobbies');
    return saved !== null ? saved === 'true' : true;
  });
  const [savingPrefs, setSavingPrefs] = useState(false);

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const fetchProfile = useCallback(async () => {
    try {
      const response = await profileService.getProfile();
      const data = response.data;
      setFormData({
        full_name: data.user.full_name || '',
        phone: data.user.phone || '',
        personal_email: data.user.personal_email || '',
        linkedin_url: data.user.linkedin_url || '',
        github_url: data.user.github_url || '',
        location: data.user.location || '',
      });
      setJobApplyData({
        address: data.user.address || '',
        city: data.user.city || '',
        state: data.user.state || '',
        zip_code: data.user.zip_code || '',
        country: data.user.country || 'United States',
        portfolio_url: data.user.portfolio_url || '',
        current_title: data.user.current_title || '',
        work_authorization: data.user.work_authorization || 'authorized',
        visa_sponsorship_needed: data.user.visa_sponsorship_needed || false,
        willing_to_relocate: data.user.willing_to_relocate || false,
        remote_preference: data.user.remote_preference || 'remote',
        desired_salary_min: data.user.desired_salary_min || '',
        desired_salary_max: data.user.desired_salary_max || '',
        preferred_pronouns: data.user.preferred_pronouns || '',
      });
      setEmploymentHistory(data.employmentHistory || []);
      setEducation(data.education || []);
    } catch {
      setSnackbar({ open: true, message: 'Failed to fetch profile', severity: 'error' });
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSavePreferences = async () => {
    setSavingPrefs(true);
    try {
      localStorage.setItem('pipelineVersion', pipelineVersion);
      localStorage.setItem('bulletCount', bulletCount);
      localStorage.setItem('includeAchievements', includeAchievements);
      localStorage.setItem('includeHobbies', includeHobbies);
      setSnackbar({ open: true, message: 'Preferences saved', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to save preferences', severity: 'error' });
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleJobApplyChange = (e) => {
    const { name, value, type, checked } = e.target;
    setJobApplyData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSaveContact = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const success = await updateProfile(formData);
      if (success) setSnackbar({ open: true, message: 'Profile saved', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: error.message || 'Failed to update profile', severity: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const [savingJobApply, setSavingJobApply] = useState(false);
  const handleSaveJobApply = async (e) => {
    e.preventDefault();
    setSavingJobApply(true);
    try {
      const payload = {
        ...jobApplyData,
        desired_salary_min: jobApplyData.desired_salary_min ? Number(jobApplyData.desired_salary_min) : null,
        desired_salary_max: jobApplyData.desired_salary_max ? Number(jobApplyData.desired_salary_max) : null,
      };
      const success = await updateProfile(payload);
      if (success) setSnackbar({ open: true, message: 'Job apply profile saved', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: error.message || 'Failed to save', severity: 'error' });
    } finally {
      setSavingJobApply(false);
    }
  };

  return (
    <Box sx={{ bgcolor: colors.bg, minHeight: `calc(100vh - ${NAVBAR_HEIGHT}px)`, display: 'flex', flexDirection: 'column' }}>

      {/* ── Compact hero header ── */}
      <Box
        sx={{
          background: gradients.heroHeader,
          px: 3,
          pt: 3,
          pb: 0,
        }}
      >
        <Container maxWidth="md" disableGutters>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
            <Avatar
              sx={{
                width: 56,
                height: 56,
                fontSize: '1.25rem',
                fontWeight: 800,
                background: 'linear-gradient(135deg, #818cf8, #6366f1)',
                border: '2px solid rgba(255,255,255,0.2)',
                flexShrink: 0,
              }}
            >
              {getInitials(formData.full_name || user?.email)}
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#fff', lineHeight: 1.2, letterSpacing: '-0.01em' }}>
                {formData.full_name || 'Your Name'}
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                {user?.email}
              </Typography>
              {(formData.location || formData.linkedin_url) && (
                <Stack direction="row" spacing={0.75} sx={{ mt: 0.5 }}>
                  {formData.location && (
                    <Chip icon={<LocationIcon />} label={formData.location} size="small"
                      sx={{ height: 20, bgcolor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.85)', fontSize: '0.6875rem', border: 'none', '& .MuiChip-icon': { color: 'rgba(255,255,255,0.6)', fontSize: 12 }, '& .MuiChip-label': { px: 0.75 } }}
                    />
                  )}
                  {formData.linkedin_url && (
                    <Chip icon={<LinkedInIcon />} label="LinkedIn" size="small"
                      onClick={() => window.open(formData.linkedin_url, '_blank')}
                      sx={{ height: 20, bgcolor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.85)', fontSize: '0.6875rem', border: 'none', cursor: 'pointer', '& .MuiChip-icon': { color: 'rgba(255,255,255,0.6)', fontSize: 12 }, '& .MuiChip-label': { px: 0.75 } }}
                    />
                  )}
                </Stack>
              )}
            </Box>
          </Stack>

          {/* Tabs */}
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            sx={{
              '& .MuiTab-root': { color: 'rgba(255,255,255,0.55)', minHeight: 40, pb: 0, fontSize: '0.875rem' },
              '& .MuiTab-root.Mui-selected': { color: '#fff', fontWeight: 600 },
              '& .MuiTabs-indicator': { bgcolor: '#fff', height: 2 },
            }}
          >
            <Tab icon={<PersonIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Contact" />
            <Tab
              icon={<WorkIcon sx={{ fontSize: 16 }} />}
              iconPosition="start"
              label={`Experience${employmentHistory.length ? ` (${employmentHistory.length})` : ''}`}
            />
            <Tab
              icon={<SchoolIcon sx={{ fontSize: 16 }} />}
              iconPosition="start"
              label={`Education${education.length ? ` (${education.length})` : ''}`}
            />
            <Tab icon={<RocketIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Job Apply" />
            <Tab icon={<TuneIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Preferences" />
          </Tabs>
        </Container>
      </Box>

      {/* ── Tab content ── */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <Container maxWidth="md" sx={{ py: 3 }}>

          {/* Tab 0: Contact */}
          {tab === 0 && (
            <Box className="animate-fade-in-up">
              <form onSubmit={handleSaveContact}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      required fullWidth label="Full Name" name="full_name"
                      value={formData.full_name} onChange={handleChange}
                      InputProps={{ startAdornment: <PersonIcon sx={{ mr: 1, color: 'text.disabled', fontSize: 18 }} /> }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth label="Phone" name="phone"
                      value={formData.phone} onChange={handleChange}
                      InputProps={{ startAdornment: <PhoneIcon sx={{ mr: 1, color: 'text.disabled', fontSize: 18 }} /> }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth type="email" label="Personal Email" name="personal_email"
                      value={formData.personal_email} onChange={handleChange}
                      InputProps={{ startAdornment: <EmailIcon sx={{ mr: 1, color: 'text.disabled', fontSize: 18 }} /> }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth label="LinkedIn URL" name="linkedin_url"
                      value={formData.linkedin_url} onChange={handleChange}
                      placeholder="linkedin.com/in/yourname"
                      InputProps={{ startAdornment: <LinkedInIcon sx={{ mr: 1, color: 'text.disabled', fontSize: 18 }} /> }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth label="GitHub URL" name="github_url"
                      value={formData.github_url} onChange={handleChange}
                      placeholder="github.com/yourname"
                      InputProps={{ startAdornment: <GitHubIcon sx={{ mr: 1, color: 'text.disabled', fontSize: 18 }} /> }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth label="Location" name="location"
                      value={formData.location} onChange={handleChange}
                      placeholder="City, Country"
                      InputProps={{ startAdornment: <LocationIcon sx={{ mr: 1, color: 'text.disabled', fontSize: 18 }} /> }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      type="submit" variant="contained" size="large" disabled={isLoading}
                      startIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                      sx={{ px: 4 }}
                    >
                      {isLoading ? 'Saving…' : 'Save Profile'}
                    </Button>
                  </Grid>
                </Grid>
              </form>
            </Box>
          )}

          {/* Tab 1: Experience */}
          {tab === 1 && (
            <Box className="animate-fade-in-up">
              <EmploymentHistory employmentHistory={employmentHistory} onUpdate={fetchProfile} />
            </Box>
          )}

          {/* Tab 2: Education */}
          {tab === 2 && (
            <Box className="animate-fade-in-up">
              <EducationHistory education={education} onUpdate={fetchProfile} />
            </Box>
          )}

          {/* Tab 3: Job Apply */}
          {tab === 3 && (
            <Box className="animate-fade-in-up">
              <form onSubmit={handleSaveJobApply}>
                <Grid container spacing={2}>
                  {/* Current Title */}
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>Professional Info</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth label="Current Job Title" name="current_title"
                      value={jobApplyData.current_title} onChange={handleJobApplyChange}
                      placeholder="Senior Software Engineer"
                      InputProps={{ startAdornment: <WorkIcon sx={{ mr: 1, color: 'text.disabled', fontSize: 18 }} /> }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth label="Portfolio / Website URL" name="portfolio_url"
                      value={jobApplyData.portfolio_url} onChange={handleJobApplyChange}
                      placeholder="https://yourportfolio.com"
                      InputProps={{ startAdornment: <WebIcon sx={{ mr: 1, color: 'text.disabled', fontSize: 18 }} /> }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth label="Preferred Pronouns" name="preferred_pronouns"
                      value={jobApplyData.preferred_pronouns} onChange={handleJobApplyChange}
                      placeholder="he/him, she/her, they/them"
                    />
                  </Grid>

                  {/* Address */}
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5, mt: 1 }}>Mailing Address</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Some applications require a full address for cover letters and forms
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth label="Street Address" name="address"
                      value={jobApplyData.address} onChange={handleJobApplyChange}
                      placeholder="123 Main St, Apt 4B"
                      InputProps={{ startAdornment: <HomeIcon sx={{ mr: 1, color: 'text.disabled', fontSize: 18 }} /> }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth label="City" name="city"
                      value={jobApplyData.city} onChange={handleJobApplyChange}
                    />
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <TextField
                      fullWidth label="State" name="state"
                      value={jobApplyData.state} onChange={handleJobApplyChange}
                      placeholder="WA"
                    />
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <TextField
                      fullWidth label="Zip Code" name="zip_code"
                      value={jobApplyData.zip_code} onChange={handleJobApplyChange}
                      placeholder="98101"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth label="Country" name="country"
                      value={jobApplyData.country} onChange={handleJobApplyChange}
                    />
                  </Grid>

                  {/* Work Preferences */}
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5, mt: 1 }}>Work Preferences</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth select label="Remote Preference" name="remote_preference"
                      value={jobApplyData.remote_preference} onChange={handleJobApplyChange}
                      SelectProps={{ native: true }}
                    >
                      <option value="remote">Remote Only</option>
                      <option value="hybrid">Hybrid</option>
                      <option value="onsite">On-site</option>
                      <option value="any">Any / Flexible</option>
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth select label="Work Authorization" name="work_authorization"
                      value={jobApplyData.work_authorization} onChange={handleJobApplyChange}
                      SelectProps={{ native: true }}
                    >
                      <option value="authorized">Authorized to work (no sponsorship needed)</option>
                      <option value="citizen">US Citizen</option>
                      <option value="green_card">Green Card / Permanent Resident</option>
                      <option value="need_sponsorship">Need visa sponsorship</option>
                      <option value="have_visa">Have work visa (H1B, L1, etc.)</option>
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControlLabel
                      control={
                        <Switch checked={jobApplyData.visa_sponsorship_needed} onChange={handleJobApplyChange} name="visa_sponsorship_needed" color="primary" />
                      }
                      label={<Typography variant="body2" sx={{ fontWeight: 500 }}>Need visa sponsorship</Typography>}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControlLabel
                      control={
                        <Switch checked={jobApplyData.willing_to_relocate} onChange={handleJobApplyChange} name="willing_to_relocate" color="primary" />
                      }
                      label={<Typography variant="body2" sx={{ fontWeight: 500 }}>Willing to relocate</Typography>}
                    />
                  </Grid>

                  {/* Salary */}
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5, mt: 1 }}>Salary Expectations</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth type="number" label="Minimum Salary (USD)" name="desired_salary_min"
                      value={jobApplyData.desired_salary_min} onChange={handleJobApplyChange}
                      placeholder="120000"
                      InputProps={{ startAdornment: <MoneyIcon sx={{ mr: 1, color: 'text.disabled', fontSize: 18 }} /> }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth type="number" label="Maximum Salary (USD)" name="desired_salary_max"
                      value={jobApplyData.desired_salary_max} onChange={handleJobApplyChange}
                      placeholder="180000"
                      InputProps={{ startAdornment: <MoneyIcon sx={{ mr: 1, color: 'text.disabled', fontSize: 18 }} /> }}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <Button
                      type="submit" variant="contained" size="large" disabled={savingJobApply}
                      startIcon={savingJobApply ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                      sx={{ px: 4 }}
                    >
                      {savingJobApply ? 'Saving…' : 'Save Job Apply Profile'}
                    </Button>
                  </Grid>
                </Grid>
              </form>
            </Box>
          )}

          {/* Tab 4: Preferences */}
          {tab === 4 && (
            <Box className="animate-fade-in-up">
              <Grid container spacing={3}>
                {/* Pipeline Engine */}
                <Grid item xs={12}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
                    Pipeline Engine
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {[
                      { v: 1, label: 'V1', sub: 'Stable' },
                      { v: 2, label: 'V2', sub: 'Multi-pass' },
                    ].map(({ v, label, sub }) => (
                      <Box
                        key={v}
                        onClick={() => setPipelineVersion(v)}
                        sx={{
                          flex: 1,
                          py: 1.5,
                          px: 2,
                          borderRadius: 2,
                          border: '1px solid',
                          borderColor: pipelineVersion === v ? colors.primary : colors.border,
                          bgcolor: pipelineVersion === v ? `${colors.primary}0A` : '#fff',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                          textAlign: 'center',
                          ...(pipelineVersion !== v && {
                            '&:hover': { borderColor: colors.primaryLight, bgcolor: `${colors.primary}05` },
                          }),
                        }}
                      >
                        <Typography variant="body2" sx={{
                          fontWeight: 700,
                          color: pipelineVersion === v ? colors.primary : 'text.primary',
                        }}>
                          {label}
                        </Typography>
                        <Typography variant="caption" sx={{
                          color: pipelineVersion === v ? colors.primary : 'text.disabled',
                        }}>
                          {sub}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Grid>

                {/* Bullet Count */}
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
                    Bullets per Role
                  </Typography>
                  <TextField
                    type="number"
                    value={bulletCount}
                    onChange={(e) => setBulletCount(Math.min(Math.max(Number(e.target.value) || 1, 1), 10))}
                    fullWidth
                    variant="outlined"
                    size="small"
                    inputProps={{ min: 1, max: 10, step: 1 }}
                    helperText="Number of bullet points per experience role (1–10)"
                  />
                </Grid>

                {/* Resume Sections */}
                <Grid item xs={12}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                    Resume Sections
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
                    Toggle optional sections in the generated resume
                  </Typography>
                  <Stack spacing={0}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={includeAchievements}
                          onChange={(e) => setIncludeAchievements(e.target.checked)}
                          color="primary"
                        />
                      }
                      label={<Typography variant="body2" sx={{ fontWeight: 500 }}>Key Achievements</Typography>}
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={includeHobbies}
                          onChange={(e) => setIncludeHobbies(e.target.checked)}
                          color="primary"
                        />
                      }
                      label={<Typography variant="body2" sx={{ fontWeight: 500 }}>Hobbies & Interests</Typography>}
                    />
                  </Stack>
                </Grid>

                {/* Save button */}
                <Grid item xs={12}>
                  <Button
                    variant="contained"
                    size="large"
                    onClick={handleSavePreferences}
                    disabled={savingPrefs}
                    startIcon={savingPrefs ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                    sx={{ px: 4 }}
                  >
                    {savingPrefs ? 'Saving…' : 'Save Preferences'}
                  </Button>
                </Grid>
              </Grid>
            </Box>
          )}

        </Container>
      </Box>

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
};

export default Profile;
