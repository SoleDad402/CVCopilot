import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Checkbox,
  FormControlLabel,
  Link,
  Stack,
  Alert,
  Snackbar,
  InputAdornment,
  IconButton,
  CircularProgress
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

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const success = await login(email, password, rememberMe);
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
          width: '45%',
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
            Your AI-powered
            <br />
            resume writer.
          </Typography>
          <Typography
            variant="body1"
            sx={{ color: 'rgba(255,255,255,0.7)', mb: 5, lineHeight: 1.7, maxWidth: 360 }}
          >
            Paste a job description and get a perfectly tailored resume in under a minute.
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
          alignItems: 'center',
          justifyContent: 'center',
          px: { xs: 3, sm: 6, lg: 8 },
          py: 6,
          bgcolor: '#fff',
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 420 }} className="animate-fade-in-up">
          <Box sx={{ mb: 5 }}>
            <Typography
              variant="h4"
              sx={{ fontWeight: 800, letterSpacing: '-0.025em', color: 'text.primary', mb: 1 }}
            >
              Welcome back
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Don't have an account?{' '}
              <Link component={RouterLink} to="/register" sx={{ color: 'primary.main', fontWeight: 600 }}>
                Sign up for free
              </Link>
            </Typography>
          </Box>

          <form onSubmit={handleSubmit}>
            <Stack spacing={2.5}>
              <TextField
                required
                fullWidth
                label="Email address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
              <TextField
                required
                fullWidth
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        size="small"
                        tabIndex={-1}
                      >
                        {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <FormControlLabel
                  control={<Checkbox checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} size="small" />}
                  label={<Typography variant="body2">Remember me</Typography>}
                />
                <Link component={RouterLink} to="/forgot-password" variant="body2" sx={{ color: 'primary.main', fontWeight: 500 }}>
                  Forgot password?
                </Link>
              </Box>

              <Button
                type="submit"
                variant="contained"
                fullWidth
                size="large"
                disabled={isLoading}
                sx={{ py: 1.5, fontSize: '0.9375rem' }}
              >
                {isLoading ? <CircularProgress size={20} color="inherit" /> : 'Sign in'}
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

export default Login;
