import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Stack,
  Typography,
  Snackbar,
  Alert,
  Container,
  Grid,
  IconButton,
  FormControlLabel,
  Checkbox,
  Divider,
  Paper
} from '@mui/material';
import { Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import { employmentService } from '../../services/api';

const EmploymentHistory = ({ employmentHistory, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentEntry, setCurrentEntry] = useState(null);
  const [formData, setFormData] = useState({
    company_name: '',
    position: '',
    location: '',
    start_date: '',
    end_date: '',
    is_current: false,
    description: ''
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (currentEntry) {
        await employmentService.updateEmployment(currentEntry.id, formData);
        setSnackbar({
          open: true,
          message: 'Employment history updated successfully',
          severity: 'success'
        });
      } else {
        await employmentService.addEmployment(formData);
        setSnackbar({
          open: true,
          message: 'Employment history added successfully',
          severity: 'success'
        });
      }
      onUpdate();
      resetForm();
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.response?.data?.error || 'Failed to save employment history',
        severity: 'error'
      });
    }
  };

  const handleEdit = (entry) => {
    setCurrentEntry(entry);
    setFormData({
      company_name: entry.company_name,
      position: entry.position,
      location: entry.location,
      start_date: entry.start_date,
      end_date: entry.end_date,
      is_current: Boolean(entry.is_current),
      description: entry.description
    });
    setIsEditing(true);
  };

  const handleDelete = async (id) => {
    try {
      await employmentService.deleteEmployment(id);
      setSnackbar({
        open: true,
        message: 'Employment history deleted successfully',
        severity: 'success'
      });
      onUpdate();
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.response?.data?.error || 'Failed to delete employment history',
        severity: 'error'
      });
    }
  };

  const resetForm = () => {
    setFormData({
      company_name: '',
      position: '',
      location: '',
      start_date: '',
      end_date: '',
      is_current: false,
      description: ''
    });
    setCurrentEntry(null);
    setIsEditing(false);
  };

  return (
    <Container maxWidth="md" sx={{ py: 5 }}>
      <Stack spacing={4}>
        <Box>
          <Typography variant="h4" sx={{ mb: 3 }}>
            Employment History
          </Typography>
          <form onSubmit={handleSubmit}>
            <Stack spacing={3}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    required
                    fullWidth
                    label="Company Name"
                    name="company_name"
                    value={formData.company_name}
                    onChange={handleChange}
                    placeholder="Enter company name"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    required
                    fullWidth
                    label="Position"
                    name="position"
                    value={formData.position}
                    onChange={handleChange}
                    placeholder="Enter your position"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    required
                    fullWidth
                    label="Location"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    placeholder="Enter location"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    required
                    fullWidth
                    label="Start Date"
                    name="start_date"
                    value={formData.start_date}
                    onChange={handleChange}
                    placeholder="YYYY-MM"
                    helperText="Enter date as YYYY-MM (e.g., 2020-09)"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    required
                    fullWidth
                    label="End Date"
                    name="end_date"
                    value={formData.end_date}
                    onChange={handleChange}
                    disabled={formData.is_current}
                    placeholder="YYYY-MM"
                    helperText="Enter date as YYYY-MM (e.g., 2024-05)"
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        name="is_current"
                        checked={formData.is_current}
                        onChange={handleChange}
                      />
                    }
                    label="I currently work here"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Describe your responsibilities and achievements"
                    multiline
                    rows={4}
                  />
                </Grid>
              </Grid>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  fullWidth
                >
                  {isEditing ? 'Update' : 'Add'} Employment
                </Button>
                {isEditing && (
                  <Button
                    onClick={resetForm}
                    variant="outlined"
                    fullWidth
                  >
                    Cancel
                  </Button>
                )}
              </Box>
            </Stack>
          </form>
        </Box>

        <Divider />

        <Stack spacing={2}>
          {employmentHistory.map((entry) => (
            <Paper key={entry.id} sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                <Box>
                  <Typography variant="h6">{entry.position}</Typography>
                  <Typography>{entry.company_name}</Typography>
                  <Typography color="text.secondary">
                    {entry.location} • {entry.start_date} - {Boolean(entry.is_current) ? 'Present' : entry.end_date}
                  </Typography>
                </Box>
                <Box>
                  <IconButton
                    onClick={() => handleEdit(entry)}
                    color="primary"
                    aria-label="Edit entry"
                    size="small"
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    onClick={() => handleDelete(entry.id)}
                    color="error"
                    aria-label="Delete entry"
                    size="small"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </Box>
              {entry.description && (
                <Typography color="text.secondary" sx={{ mt: 1 }}>
                  {entry.description}
                </Typography>
              )}
            </Paper>
          ))}
        </Stack>
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

export default EmploymentHistory; 