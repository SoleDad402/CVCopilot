import React, { useState } from 'react';
import {
  Box,
  Button,
  Stack,
  Typography,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  Paper
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import EducationForm from '../EducationForm';
import { profileService } from '../../services/api';

const EducationHistory = ({ education, onUpdate }) => {
  const [editingEducation, setEditingEducation] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const handleAddEducation = async (educationData) => {
    try {
      await profileService.addEducation(educationData);
      onUpdate();
      setIsOpen(false);
      setSnackbar({
        open: true,
        message: 'Education added successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error adding education:', error);
      setSnackbar({
        open: true,
        message: 'Failed to add education',
        severity: 'error'
      });
    }
  };

  const handleUpdateEducation = async (id, educationData) => {
    try {
      await profileService.updateEducation(id, educationData);
      onUpdate();
      setEditingEducation(null);
      setSnackbar({
        open: true,
        message: 'Education updated successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error updating education:', error);
      setSnackbar({
        open: true,
        message: 'Failed to update education',
        severity: 'error'
      });
    }
  };

  const handleDeleteEducation = async (id) => {
    if (!window.confirm('Are you sure you want to delete this education entry?')) {
      return;
    }

    try {
      await profileService.deleteEducation(id);
      onUpdate();
      setSnackbar({
        open: true,
        message: 'Education deleted successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error deleting education:', error);
      setSnackbar({
        open: true,
        message: 'Failed to delete education',
        severity: 'error'
      });
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4">Education</Typography>
        <Button variant="contained" color="primary" onClick={() => setIsOpen(true)}>
          Add Education
        </Button>
      </Box>

      <Stack spacing={3}>
        {education.map((edu) => (
          <Paper key={edu.id} sx={{ p: 3, position: 'relative' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Stack spacing={1}>
                <Typography variant="h6">{edu.school_name}</Typography>
                <Typography color="text.secondary">{edu.location}</Typography>
                <Typography>{edu.degree} in {edu.field_of_study}</Typography>
                <Typography color="text.secondary">
                  {edu.start_date} - {Boolean(edu.is_current) ? 'Present' : edu.end_date}
                </Typography>
                {edu.gpa && <Typography color="text.secondary">GPA: {edu.gpa}</Typography>}
                {edu.description && (
                  <Typography sx={{ mt: 2 }}>{edu.description}</Typography>
                )}
              </Stack>
              <Box>
                <IconButton
                  onClick={() => setEditingEducation(edu)}
                  color="primary"
                  aria-label="Edit education"
                >
                  <EditIcon />
                </IconButton>
                <IconButton
                  onClick={() => handleDeleteEducation(edu.id)}
                  color="error"
                  aria-label="Delete education"
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            </Box>
          </Paper>
        ))}
      </Stack>

      {/* Add Education Dialog */}
      <Dialog open={isOpen} onClose={() => setIsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Add Education</DialogTitle>
        <DialogContent>
          <EducationForm
            onSubmit={handleAddEducation}
            onCancel={() => setIsOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Education Dialog */}
      <Dialog
        open={!!editingEducation}
        onClose={() => setEditingEducation(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Edit Education</DialogTitle>
        <DialogContent>
          {editingEducation && (
            <EducationForm
              education={editingEducation}
              onSubmit={(data) => handleUpdateEducation(editingEducation.id, data)}
              onCancel={() => setEditingEducation(null)}
            />
          )}
        </DialogContent>
      </Dialog>

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
    </Box>
  );
};

export default EducationHistory; 