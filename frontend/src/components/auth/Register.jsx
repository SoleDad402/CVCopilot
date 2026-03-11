import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Link,
  Stack,
  Alert,
  Snackbar,
  Grid,
  InputAdornment,
  IconButton,
  CircularProgress,
  LinearProgress
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  AutoAwesome as AutoAwesomeIcon,
  CheckCircleOutline as CheckIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { NAVBAR_HEIGHT } from '../../theme';
import { Link as RouterLink, useNavigate } from 'react-router-dom';

const FEATURES = [
  'AI-tailored resumes for every application',
  'ATS-optimized formatting & keywords',
  'Cover letters generated in seconds',
  'Full history of every document',
];

const Register = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    phone: '',
    personal_email: '',
    linkedin_url: '',
    github_url: '',
    location: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setSnackbar({ open: true, message: 'Passwords do not match', severity: 'error' });
      return;
    }
    setIsLoading(true);
    try {
      const { confirmPassword, ...registrationData } = formData;
      const success = await register(registrationData);
      if (success) navigate('/');
    } catch (error) {
      setSnackbar({ open: true, message: error.message, severity: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', minHeight: `calc(100vh - ${NAVBAR_HEIGHT}px)` }}>
      {/* Left: Branding Panel */}
      <Box
        className="auth-gradient-panel"
        sx={{
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'center',
          px: 6,
          py: 8,
          width: '40%',
          flexShrink: 0,
          color: '#fff',
        }}
      >
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 6 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                background: 'rgba(255,255,255,0.18)',
                backdropFilter: 'blur(10px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(255,255,255,0.28)',
              }}
            >
              <AutoAwesomeIcon sx={{ fontSize: 22, color: '#fff' }} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '-0.02em', color: '#fff' }}>
              CV Copilot
            </Typography>
          </Box>

          <Typography
            variant="h3"
            sx={{ fontWeight: 800, letterSpacing: '-0.03em', mb: 2, lineHeight: 1.15, color: '#fff' }}
          >
            Land your
            <br />
            next role.
          </Typography>
          <Typography
            variant="body1"
            sx={{ color: 'rgba(255,255,255,0.7)', mb: 5, lineHeight: 1.7, maxWidth: 320 }}
          >
            Create a free account and let AI write tailored resumes for every job you apply to.
          </Typography>

          <Stack spacing={2.5}>
            {FEATURES.map((feat) => (
              <Box key={feat} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <CheckIcon sx={{ color: 'rgba(255,255,255,0.9)', fontSize: 20, flexShrink: 0 }} />
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
                  {feat}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Box>
      </Box>

      {/* Right: Form Panel */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          px: { xs: 3, sm: 5, lg: 7 },
          py: 5,
          bgcolor: '#fff',
          overflowY: 'auto',
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 520 }} className="animate-fade-in-up">
          <Box sx={{ mb: 4, pt: 1 }}>
            <Typography
              variant="h4"
              sx={{ fontWeight: 800, letterSpacing: '-0.025em', color: 'text.primary', mb: 1 }}
            >
              Create your account
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Already have an account?{' '}
              <Link component={RouterLink} to="/login" sx={{ color: 'primary.main', fontWeight: 600 }}>
                Sign in
              </Link>
            </Typography>
          </Box>

          <form onSubmit={handleSubmit}>
            <Stack spacing={0}>
              {/* Section: Account */}
              <Typography
                variant="overline"
                sx={{ fontSize: '0.6875rem', color: 'text.secondary', letterSpacing: '0.08em', mb: 1.5 }}
              >
                Account
              </Typography>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12}>
                  <TextField
                    required
                    fullWidth
                    label="Full Name"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    required
                    fullWidth
                    label="Email address"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    autoComplete="email"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    required
                    fullWidth
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small" tabIndex={-1}>
                            {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    required
                    fullWidth
                    label="Confirm Password"
                    type={showConfirm ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    error={formData.confirmPassword && formData.password !== formData.confirmPassword}
                    helperText={formData.confirmPassword && formData.password !== formData.confirmPassword ? "Passwords don't match" : ''}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setShowConfirm(!showConfirm)} edge="end" size="small" tabIndex={-1}>
                            {showConfirm ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
              </Grid>

              {/* Section: Profile (optional) */}
              <Typography
                variant="overline"
                sx={{ fontSize: '0.6875rem', color: 'text.secondary', letterSpacing: '0.08em', mb: 1.5 }}
              >
                Profile <Box component="span" sx={{ color: 'text.disabled', textTransform: 'none', fontSize: '0.75rem' }}>(optional — used in your resume)</Box>
              </Typography>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Location"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    placeholder="City, Country"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="LinkedIn URL"
                    name="linkedin_url"
                    value={formData.linkedin_url}
                    onChange={handleChange}
                    placeholder="linkedin.com/in/..."
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="GitHub URL"
                    name="github_url"
                    value={formData.github_url}
                    onChange={handleChange}
                    placeholder="github.com/..."
                  />
                </Grid>
              </Grid>

              <Button
                type="submit"
                variant="contained"
                fullWidth
                size="large"
                disabled={isLoading}
                sx={{ py: 1.5, fontSize: '0.9375rem' }}
              >
                {isLoading ? <CircularProgress size={20} color="inherit" /> : 'Create account'}
              </Button>
            </Stack>
          </form>
        </Box>
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Register;
