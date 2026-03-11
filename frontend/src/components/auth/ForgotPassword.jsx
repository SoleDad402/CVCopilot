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
  CircularProgress
} from '@mui/material';
import {
  AutoAwesome as AutoAwesomeIcon,
  MarkEmailRead as MarkEmailReadIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { NAVBAR_HEIGHT } from '../../theme';
import { Link as RouterLink } from 'react-router-dom';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const { forgotPassword } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const success = await forgotPassword(email);
      if (success) setIsSubmitted(true);
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
            We've got
            <br />
            you covered.
          </Typography>
          <Typography
            variant="body1"
            sx={{ color: 'rgba(255,255,255,0.7)', lineHeight: 1.7, maxWidth: 340 }}
          >
            Reset your password and get back to building winning resumes.
          </Typography>
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
          {isSubmitted ? (
            <Stack spacing={3} alignItems="center" sx={{ textAlign: 'center', py: 4 }}>
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MarkEmailReadIcon sx={{ fontSize: 32, color: '#fff' }} />
              </Box>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                  Check your inbox
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 320 }}>
                  If your email is registered, we've sent a password reset link to{' '}
                  <strong>{email}</strong>.
                </Typography>
              </Box>
              <Link component={RouterLink} to="/login" sx={{ color: 'primary.main', fontWeight: 600, fontSize: '0.875rem' }}>
                Back to sign in
              </Link>
            </Stack>
          ) : (
            <>
              <Box sx={{ mb: 5 }}>
                <Typography
                  variant="h4"
                  sx={{ fontWeight: 800, letterSpacing: '-0.025em', color: 'text.primary', mb: 1 }}
                >
                  Reset password
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Enter your email and we'll send you a reset link.
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
                    autoFocus
                  />

                  <Button
                    type="submit"
                    variant="contained"
                    fullWidth
                    size="large"
                    disabled={isLoading}
                    sx={{ py: 1.5, fontSize: '0.9375rem' }}
                  >
                    {isLoading ? <CircularProgress size={20} color="inherit" /> : 'Send reset link'}
                  </Button>

                  <Typography align="center" variant="body2" sx={{ color: 'text.secondary' }}>
                    Remember your password?{' '}
                    <Link component={RouterLink} to="/login" sx={{ color: 'primary.main', fontWeight: 600 }}>
                      Sign in
                    </Link>
                  </Typography>
                </Stack>
              </form>
            </>
          )}
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

export default ForgotPassword;
