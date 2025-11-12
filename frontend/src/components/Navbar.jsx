import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Box,
  Typography,
  Stack,
  IconButton,
  Menu,
  MenuItem,
  Alert,
  Snackbar,
  LinearProgress
} from '@mui/material';
import {
  Description as DocIcon,
  Save as SaveIcon,
  Edit as EditIcon,
  ContentPaste as PasteIcon,
  AccountCircle as AccountIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { resumeService, pollJobStatus } from '../services/api';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';

const Navbar = () => {
  const [isPasteDialogOpen, setIsPasteDialogOpen] = useState(false);
  const [jobDescription, setJobDescription] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [jobStatus, setJobStatus] = useState(null);
  const [progress, setProgress] = useState(0);
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handlePasteJobDescription = () => {
    setIsPasteDialogOpen(true);
  };

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
      // Start the job
      const { data: jobData } = await resumeService.generateResume(jobDescription.trim());
      const { jobId } = jobData;
      
      setJobStatus('processing');
      
      // Poll for completion with progress updates
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

      // Save the completed resume
      localStorage.setItem('generatedResume', JSON.stringify({
        resume: result.resume,
        generatedResume: result.generatedResume,
        docxContent: result.docxContent,
        pdfContent: result.pdfContent,
        jobDescription: jobDescription.trim() // Save job description for later use
      }));
      setIsPasteDialogOpen(false);
      navigate('/preview');
    } catch (err) {
      console.log(err);
      setError(err.message || 'Failed to generate resume');
      setJobStatus('error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEditResume = () => {
    navigate('/editor');
  };

  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleProfileClick = () => {
    handleProfileMenuClose();
    navigate('/profile');
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  };

  return (
    <>
      <AppBar position="static" sx={{ background: '#263238', boxShadow: 3 }}>
        <Toolbar>
          {!isMobile && (
            <Typography 
              variant="h5" 
              component="div" 
              sx={{
                flexGrow: 1,
                fontWeight: 600,
                letterSpacing: 0.05,
                color: '#FFFFFF',
                fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif'
              }}
            >
              Resume Generator
            </Typography>
          )}
          
          {user && (
            <Stack direction="row" spacing={1} sx={{ mr: 2 }}>
              <Button
                startIcon={<PasteIcon />}
                onClick={() => navigate('/')}
                variant="outlined"
                color="inherit"
              >
                Paste Job Description
              </Button>
              <Button
                onClick={() => navigate('/history')}
                variant="outlined"
                color="inherit"
              >
                History
              </Button>
              <Button
                startIcon={<DocIcon />}
                onClick={handleEditResume}
                variant="outlined"
                color="inherit"
                disabled={true}
              >
                Edit Resume
              </Button>
            </Stack>
          )}

          {user ? (
            <>
              <IconButton
                size="large"
                edge="end"
                color="inherit"
                onClick={handleProfileMenuOpen}
              >
                <AccountIcon />
              </IconButton>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleProfileMenuClose}
              >
                <MenuItem onClick={handleProfileClick}>Profile</MenuItem>
                <MenuItem onClick={() => { handleProfileMenuClose(); navigate('/settings'); }}>Settings</MenuItem>
                <MenuItem onClick={handleLogout}>Logout</MenuItem>
              </Menu>
            </>
          ) : (
            <Stack direction="row" spacing={1}>
              <Button color="inherit" onClick={() => navigate('/login')}>
                Login
              </Button>
              <Button color="inherit" onClick={() => navigate('/register')}>
                Register
              </Button>
            </Stack>
          )}
        </Toolbar>
      </AppBar>

      <Dialog
        open={isPasteDialogOpen}
        onClose={() => setIsPasteDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            p: 3,
            borderRadius: 3,
            bgcolor: '#f8fafc',
            boxShadow: 6
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: 22, color: 'primary.main' }}>Paste Job Description</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Job Description"
            fullWidth
            multiline
            rows={8}
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            variant="outlined"
            error={!!error}
            helperText={error}
            sx={{ bgcolor: '#fff', borderRadius: 2 }}
          />
          
          {isGenerating && (
            <Box sx={{ width: '100%', mt: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {jobStatus === 'downloading' ? 'Preparing preview…' : 'Generating your resume…'}
              </Typography>
              <LinearProgress />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ pb: 2, pr: 3 }}>
          <Button onClick={() => setIsPasteDialogOpen(false)} variant="outlined" color="secondary">Cancel</Button>
          <Button 
            onClick={handleGenerateResume} 
            variant="contained" 
            color="primary"
            disabled={isGenerating}
            sx={{ fontWeight: 600 }}
          >
            {isGenerating ? (jobStatus === 'downloading' ? 'Preparing preview…' : 'Generating…') : 'Generate Resume'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar 
        open={!!error} 
        autoHideDuration={6000} 
        onClose={() => setError('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setError('')} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </>
  );
};

export default Navbar; 