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
  Tab
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
  Tune as TuneIcon
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
    location: ''
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
        location: data.user.location || ''
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
      setSnackbar({ open: true, message: 'Preferences saved', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to save preferences', severity: 'error' });
    } finally {
      setSavingPrefs(false);
    }
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

          {/* Tab 3: Preferences */}
          {tab === 3 && (
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
