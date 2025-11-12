import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  TextField,
  Stack,
  Typography,
  Container,
  Grid,
  Divider,
  Snackbar,
  Alert
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import EmploymentHistory from './EmploymentHistory';
import EducationHistory from './EducationHistory';
import { profileService } from '../../services/api';

const Profile = () => {
  const { user, updateProfile } = useAuth();
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    personal_email: '',
    linkedin_url: '',
    github_url: '',
    location: ''
  });
  const [employmentHistory, setEmploymentHistory] = useState([]);
  const [education, setEducation] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
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
    } catch (error) {
      console.error('Error fetching profile:', error);
      setSnackbar({
        open: true,
        message: 'Failed to fetch profile',
        severity: 'error'
      });
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const success = await updateProfile(formData);
      if (success) {
        setSnackbar({
          open: true,
          message: 'Profile updated successfully',
          severity: 'success'
        });
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.message || 'Failed to update profile',
        severity: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 5 }}>
      <Stack spacing={4}>
        <Box>
          <Typography variant="h4" sx={{ mb: 3 }}>
            Profile Information
          </Typography>
          <form onSubmit={handleSubmit}>
            <Stack spacing={3}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    required
                    fullWidth
                    label="Full Name"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    placeholder="Enter your full name"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="Enter your phone number"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="email"
                    label="Personal Email"
                    name="personal_email"
                    value={formData.personal_email}
                    onChange={handleChange}
                    placeholder="Enter your personal email"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="LinkedIn URL"
                    name="linkedin_url"
                    value={formData.linkedin_url}
                    onChange={handleChange}
                    placeholder="Enter your LinkedIn profile URL"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="GitHub URL"
                    name="github_url"
                    value={formData.github_url}
                    onChange={handleChange}
                    placeholder="Enter your GitHub profile URL"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Location"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    placeholder="Enter your location (e.g., City, Country)"
                  />
                </Grid>
              </Grid>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                fullWidth
                disabled={isLoading}
              >
                {isLoading ? 'Updating...' : 'Update Profile'}
              </Button>
            </Stack>
          </form>
        </Box>

        <Divider />

        <EmploymentHistory
          employmentHistory={employmentHistory}
          onUpdate={fetchProfile}
        />

        <Divider />

        <EducationHistory
          education={education}
          onUpdate={fetchProfile}
        />
      </Stack>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Profile; 