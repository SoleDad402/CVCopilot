import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  Checkbox,
  FormControlLabel,
  Grid,
  Stack
} from '@mui/material';

const EducationForm = ({ education, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    school_name: '',
    location: '',
    degree: '',
    field_of_study: '',
    start_date: '',
    end_date: '',
    is_current: false,
    gpa: '',
    description: ''
  });

  useEffect(() => {
    if (education) {
      setFormData({
        school_name: education.school_name || '',
        location: education.location || '',
        degree: education.degree || '',
        field_of_study: education.field_of_study || '',
        start_date: education.start_date || '',
        end_date: education.end_date || '',
        is_current: education.is_current || false,
        gpa: education.gpa || '',
        description: education.description || ''
      });
    }
  }, [education]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <Stack spacing={3}>
        <TextField
          required
          fullWidth
          label="School Name"
          name="school_name"
          value={formData.school_name}
          onChange={handleChange}
          placeholder="Enter school name"
        />

        <TextField
          fullWidth
          label="Location"
          name="location"
          value={formData.location}
          onChange={handleChange}
          placeholder="Enter location"
        />

        <TextField
          required
          fullWidth
          label="Degree"
          name="degree"
          value={formData.degree}
          onChange={handleChange}
          placeholder="Enter degree"
        />

        <TextField
          fullWidth
          label="Field of Study"
          name="field_of_study"
          value={formData.field_of_study}
          onChange={handleChange}
          placeholder="Enter field of study"
        />

        <Grid container spacing={2}>
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
        </Grid>

        <FormControlLabel
          control={
            <Checkbox
              name="is_current"
              checked={formData.is_current}
              onChange={handleChange}
            />
          }
          label="Currently Studying"
        />

        <TextField
          fullWidth
          label="GPA"
          name="gpa"
          value={formData.gpa}
          onChange={handleChange}
          placeholder="Enter GPA"
        />

        <TextField
          fullWidth
          label="Description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Enter description"
          multiline
          rows={3}
        />

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" color="primary">
            {education ? 'Update' : 'Add'} Education
          </Button>
        </Box>
      </Stack>
    </form>
  );
};

export default EducationForm; 