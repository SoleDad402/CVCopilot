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
    date_of_birth: '',
    gender: '',
    race_ethnicity: '',
    disability_status: 'no',
    veteran_status: 'no',
    criminal_conviction: 'no',
    start_availability: 'immediately',
    years_of_experience: '',
    target_job_titles: '',
    seniority_preference: '',
    target_countries: 'US',
    preferred_locations: '',
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
      const u = data.user;
      setJobApplyData({
        address: u.address || '',
        city: u.city || '',
        state: u.state || '',
        zip_code: u.zip_code || '',
        country: u.country || 'United States',
        portfolio_url: u.portfolio_url || '',
        current_title: u.current_title || '',
        work_authorization: u.work_authorization || 'authorized',
        visa_sponsorship_needed: u.visa_sponsorship_needed || false,
        willing_to_relocate: u.willing_to_relocate || false,
        remote_preference: u.remote_preference || 'remote',
        desired_salary_min: u.desired_salary_min || '',
        desired_salary_max: u.desired_salary_max || '',
        preferred_pronouns: u.preferred_pronouns || '',
        date_of_birth: u.date_of_birth || '',
        gender: u.gender || '',
        race_ethnicity: u.race_ethnicity || '',
        disability_status: u.disability_status || 'no',
        veteran_status: u.veteran_status || 'no',
        criminal_conviction: u.criminal_conviction || 'no',
        start_availability: u.start_availability || 'immediately',
        years_of_experience: u.years_of_experience || '',
        target_job_titles: Array.isArray(u.target_job_titles) ? u.target_job_titles.join(', ') : (u.target_job_titles || ''),
        seniority_preference: u.seniority_preference || '',
        target_countries: u.target_countries || 'US',
        preferred_locations: u.preferred_locations || '',
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
        years_of_experience: jobApplyData.years_of_experience ? Number(jobApplyData.years_of_experience) : null,
        target_job_titles: jobApplyData.target_job_titles
          ? jobApplyData.target_job_titles.split(',').map(s => s.trim()).filter(Boolean)
          : [],
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

                  {/* Job Search Preferences */}
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5, mt: 1 }}>Job Search Preferences</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth type="number" label="Years of Experience" name="years_of_experience"
                      value={jobApplyData.years_of_experience} onChange={handleJobApplyChange}
                      placeholder="12"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth select label="Seniority Preference" name="seniority_preference"
                      value={jobApplyData.seniority_preference} onChange={handleJobApplyChange}
                      SelectProps={{ native: true }}
                    >
                      <option value="">Select...</option>
                      <option value="mid_senior">Mid or Senior Level</option>
                      <option value="senior">Senior only</option>
                      <option value="mid">Mid-level only</option>
                      <option value="entry_mid">Entry or Mid-level</option>
                      <option value="any">Any level</option>
                    </TextField>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth label="Target Job Titles" name="target_job_titles"
                      value={jobApplyData.target_job_titles} onChange={handleJobApplyChange}
                      placeholder="Senior Software Engineer, Staff Engineer, Tech Lead"
                      helperText="Comma-separated list of job titles to apply for"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth label="Target Countries (Remote)" name="target_countries"
                      value={jobApplyData.target_countries} onChange={handleJobApplyChange}
                      placeholder="US, Canada"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth label="Preferred Locations (Hybrid/Onsite)" name="preferred_locations"
                      value={jobApplyData.preferred_locations} onChange={handleJobApplyChange}
                      placeholder="Seattle, WA; San Francisco, CA"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth select label="Start Availability" name="start_availability"
                      value={jobApplyData.start_availability} onChange={handleJobApplyChange}
                      SelectProps={{ native: true }}
                    >
                      <option value="immediately">Immediately</option>
                      <option value="2_weeks">2 Weeks Notice</option>
                      <option value="1_month">1 Month</option>
                      <option value="2_months">2 Months</option>
                      <option value="3_months">3+ Months</option>
                    </TextField>
                  </Grid>

                  {/* Personal / EEO Information */}
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5, mt: 1 }}>Personal / EEO Information</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Optional — many US applications ask these for compliance reporting. Your answers don't affect hiring decisions.
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth label="Date of Birth (MM/YY or MM/DD/YYYY)" name="date_of_birth"
                      value={jobApplyData.date_of_birth} onChange={handleJobApplyChange}
                      placeholder="10/17"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth select label="Gender" name="gender"
                      value={jobApplyData.gender} onChange={handleJobApplyChange}
                      SelectProps={{ native: true }}
                    >
                      <option value="">Prefer not to say</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="non_binary">Non-binary</option>
                      <option value="other">Other</option>
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth select label="Race / Ethnicity" name="race_ethnicity"
                      value={jobApplyData.race_ethnicity} onChange={handleJobApplyChange}
                      SelectProps={{ native: true }}
                    >
                      <option value="">Prefer not to say</option>
                      <option value="white">White</option>
                      <option value="black">Black or African American</option>
                      <option value="hispanic">Hispanic or Latino</option>
                      <option value="asian">Asian</option>
                      <option value="native">American Indian or Alaska Native</option>
                      <option value="pacific">Native Hawaiian or Pacific Islander</option>
                      <option value="two_or_more">Two or More Races</option>
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth select label="Disability Status" name="disability_status"
                      value={jobApplyData.disability_status} onChange={handleJobApplyChange}
                      SelectProps={{ native: true }}
                    >
                      <option value="no">No, I do not have a disability</option>
                      <option value="yes">Yes, I have a disability</option>
                      <option value="prefer_not">Prefer not to answer</option>
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth select label="Protected Veteran Status" name="veteran_status"
                      value={jobApplyData.veteran_status} onChange={handleJobApplyChange}
                      SelectProps={{ native: true }}
                    >
                      <option value="no">Not a protected veteran</option>
                      <option value="yes">Protected veteran</option>
                      <option value="prefer_not">Prefer not to answer</option>
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth select label="Criminal Conviction" name="criminal_conviction"
                      value={jobApplyData.criminal_conviction} onChange={handleJobApplyChange}
                      SelectProps={{ native: true }}
                    >
                      <option value="no">No</option>
                      <option value="yes">Yes</option>
                      <option value="prefer_not">Prefer not to answer</option>
                    </TextField>
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
