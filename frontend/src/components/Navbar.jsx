import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Toolbar,
  Button,
  Box,
  Typography,
  Stack,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Divider,
  Tooltip,
  Chip,
  Alert,
  Snackbar,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  alpha
} from '@mui/material';
import {
  Description as DocIcon,
  ContentPaste as PasteIcon,
  AccountCircle as AccountIcon,
  History as HistoryIcon,
  AutoAwesome as AutoAwesomeIcon,
  Logout as LogoutIcon,
  Person as PersonIcon,
  KeyboardArrowDown as ArrowDownIcon,
  AdminPanelSettings as AdminIcon,
  Close as CloseIcon,
  Bolt as BoltIcon
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useGeneration } from '../contexts/GenerationContext';
import { resumeService, pollJobStatus } from '../services/api';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { NAVBAR_HEIGHT, colors } from '../theme';

// Step labels for the global progress pill
const GENERATION_STEPS = [
  { min: 0,  max: 20,  label: 'Reading JD…' },
  { min: 20, max: 50,  label: 'Matching…' },
  { min: 50, max: 80,  label: 'Drafting…' },
  { min: 80, max: 95,  label: 'Finalizing…' },
  { min: 95, max: 100, label: 'Almost done…' },
];

function getStepLabel(progress) {
  const step = GENERATION_STEPS.find(s => progress >= s.min && progress < s.max);
  return step ? step.label : 'Generating…';
}

const NavLink = ({ to, icon, children, onClick }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isActive = location.pathname === to;

  return (
    <Button
      onClick={onClick || (() => navigate(to))}
      startIcon={icon}
      sx={{
        color: isActive ? '#fff' : 'rgba(255,255,255,0.65)',
        fontWeight: isActive ? 600 : 500,
        fontSize: '0.875rem',
        px: 1.5,
        py: 0.75,
        borderRadius: 2,
        bgcolor: isActive ? 'rgba(99,102,241,0.25)' : 'transparent',
        border: isActive ? '1px solid rgba(99,102,241,0.4)' : '1px solid transparent',
        transition: 'all 0.15s ease',
        '&:hover': {
          color: '#fff',
          bgcolor: 'rgba(255,255,255,0.08)',
        },
      }}
    >
      {children}
    </Button>
  );
};

const Navbar = () => {
  const [isPasteDialogOpen, setIsPasteDialogOpen] = useState(false);
  const [jobDescription, setJobDescription] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Generation context — for global progress pill
  const {
    isGenerating,
    progress,
    stepLabel,
    documentType,
    cancelGeneration,
  } = useGeneration();

  // Close the user menu whenever the route changes (prevents auto-open after login)
  useEffect(() => {
    setAnchorEl(null);
  }, [location.pathname]);

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  };

  // Show the global progress pill when generating AND not on the home page
  const showGlobalProgress = isGenerating && location.pathname !== '/';

  return (
    <>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          background: colors.dark,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          zIndex: (theme) => theme.zIndex.appBar,
        }}
      >
        <Toolbar sx={{ minHeight: `${NAVBAR_HEIGHT}px !important`, px: { xs: 2, md: 3 }, gap: 1 }}>
          {/* Logo */}
          <Box
            onClick={() => navigate('/')}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              cursor: 'pointer',
              mr: 2,
              flexShrink: 0,
            }}
          >
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: 1.5,
                background: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <AutoAwesomeIcon sx={{ fontSize: 16, color: '#fff' }} />
            </Box>
            {!isMobile && (
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 700,
                  fontSize: '1rem',
                  color: '#fff',
                  letterSpacing: '-0.01em',
                }}
              >
                CV Copilot
              </Typography>
            )}
          </Box>

          {/* Nav Links */}
          {user && (
            <Stack direction="row" spacing={0.5} sx={{ flex: 1 }}>
              <NavLink to="/" icon={<PasteIcon sx={{ fontSize: 16 }} />}>
                {isMobile ? '' : 'Generator'}
              </NavLink>
              <NavLink to="/history" icon={<HistoryIcon sx={{ fontSize: 16 }} />}>
                {isMobile ? '' : 'History'}
              </NavLink>
              {user.is_admin && (
                <NavLink to="/admin" icon={<AdminIcon sx={{ fontSize: 16 }} />}>
                  {isMobile ? '' : 'Admin'}
                </NavLink>
              )}
            </Stack>
          )}

          <Box sx={{ flex: user ? 0 : 1 }} />

          {/* Global generation progress pill — shown when navigated away from home */}
          {showGlobalProgress && (
            <Box
              onClick={() => navigate('/')}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                bgcolor: alpha('#6366f1', 0.2),
                border: '1px solid',
                borderColor: alpha('#6366f1', 0.4),
                borderRadius: 2,
                px: 1.5,
                py: 0.5,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                '&:hover': { bgcolor: alpha('#6366f1', 0.3) },
                mr: 1,
              }}
            >
              <BoltIcon sx={{ fontSize: 14, color: '#818cf8', animation: 'pulse 1.5s ease-in-out infinite' }} />
              <Typography variant="caption" sx={{ color: '#c7d2fe', fontWeight: 600, fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                {stepLabel || getStepLabel(progress)}
              </Typography>
              <Typography variant="caption" sx={{ color: '#fff', fontWeight: 700, fontSize: '0.75rem', minWidth: 28, textAlign: 'right' }}>
                {Math.round(progress)}%
              </Typography>
              <Box sx={{ width: 48, height: 4, bgcolor: 'rgba(255,255,255,0.15)', borderRadius: 2, overflow: 'hidden' }}>
                <Box sx={{
                  width: `${progress}%`,
                  height: '100%',
                  bgcolor: '#818cf8',
                  borderRadius: 2,
                  transition: 'width 0.3s ease',
                }} />
              </Box>
              <Tooltip title="Cancel generation" arrow>
                <IconButton
                  size="small"
                  onClick={(e) => { e.stopPropagation(); cancelGeneration(); }}
                  sx={{
                    width: 18,
                    height: 18,
                    color: 'rgba(255,255,255,0.5)',
                    '&:hover': { color: '#f87171', bgcolor: 'rgba(255,255,255,0.1)' },
                  }}
                >
                  <CloseIcon sx={{ fontSize: 12 }} />
                </IconButton>
              </Tooltip>
            </Box>
          )}

          {/* Auth Actions */}
          {user ? (
            <>
              <Tooltip title={user.email || ''} arrow>
                <Box
                  onClick={(e) => setAnchorEl(e.currentTarget)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    cursor: 'pointer',
                    borderRadius: 2,
                    px: 1,
                    py: 0.5,
                    transition: 'all 0.15s ease',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.07)' },
                  }}
                >
                  <Avatar
                    sx={{
                      width: 28,
                      height: 28,
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                    }}
                  >
                    {getInitials(user.full_name || user.email)}
                  </Avatar>
                  {!isMobile && (
                    <Typography sx={{ fontSize: '0.8125rem', fontWeight: 500, color: 'rgba(255,255,255,0.85)' }}>
                      {user.full_name?.split(' ')[0] || user.email?.split('@')[0]}
                    </Typography>
                  )}
                  <ArrowDownIcon sx={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }} />
                </Box>
              </Tooltip>

              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() => setAnchorEl(null)}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                PaperProps={{
                  sx: {
                    mt: 1,
                    minWidth: 200,
                    '& .MuiMenuItem-root': { gap: 1.5 },
                  },
                }}
              >
                <Box sx={{ px: 2, pt: 1.5, pb: 1 }}>
                  <Typography variant="subtitle2" sx={{ color: 'text.primary' }}>
                    {user.full_name || 'User'}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {user.email}
                  </Typography>
                </Box>
                <Divider sx={{ my: 0.5 }} />
                <MenuItem onClick={() => { setAnchorEl(null); navigate('/profile'); }}>
                  <PersonIcon sx={{ fontSize: 17, color: 'text.secondary' }} />
                  Profile
                </MenuItem>
                <Divider sx={{ my: 0.5 }} />
                <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
                  <LogoutIcon sx={{ fontSize: 17 }} />
                  Log out
                </MenuItem>
              </Menu>
            </>
          ) : (
            <Stack direction="row" spacing={1}>
              <Button
                variant="text"
                onClick={() => navigate('/login')}
                sx={{ color: 'rgba(255,255,255,0.75)', fontWeight: 500, '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.08)' } }}
              >
                Log in
              </Button>
              <Button
                variant="contained"
                onClick={() => navigate('/register')}
                size="small"
                sx={{ fontWeight: 600 }}
              >
                Sign up
              </Button>
            </Stack>
          )}
        </Toolbar>
      </AppBar>
      {/* Spacer so content isn't hidden behind the fixed AppBar */}
      <Toolbar sx={{ minHeight: `${NAVBAR_HEIGHT}px !important` }} />

      {/* Pulse animation for the progress pill icon */}
      {showGlobalProgress && (
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
          }
        `}</style>
      )}
    </>
  );
};

export default Navbar;
