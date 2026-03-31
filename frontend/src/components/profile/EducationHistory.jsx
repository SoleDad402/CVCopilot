import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Stack,
  Typography,
  IconButton,
  Snackbar,
  Alert,
  Grid,
  FormControlLabel,
  Checkbox,
  Chip,
  Collapse,
  Tooltip
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Close as CloseIcon,
  Save as SaveIcon,
  School as SchoolIcon,
  LocationOn as LocationIcon,
  CalendarToday as CalendarIcon
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import { profileService } from '../../services/api';

const EMPTY_FORM = {
  school_name: '',
  degree: '',
  field_of_study: '',
  location: '',
  start_date: '',
  end_date: '',
  is_current: false,
  gpa: ''
};

const EducationHistory = ({ education, onUpdate }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const openAdd = () => {
    setFormData(EMPTY_FORM);
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (edu) => {
    setFormData({
      school_name: edu.school_name || '',
      degree: edu.degree || '',
      field_of_study: edu.field_of_study || '',
      location: edu.location || '',
      start_date: edu.start_date || '',
      end_date: edu.end_date || '',
      is_current: Boolean(edu.is_current),
      gpa: edu.gpa || ''
    });
    setEditingId(edu.id);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData(EMPTY_FORM);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await profileService.updateEducation(editingId, formData);
        setSnackbar({ open: true, message: 'Education updated', severity: 'success' });
      } else {
        await profileService.addEducation(formData);
        setSnackbar({ open: true, message: 'Education added', severity: 'success' });
      }
      onUpdate();
      closeForm();
    } catch (error) {
      setSnackbar({ open: true, message: error.response?.data?.error || 'Failed to save', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await profileService.deleteEducation(id);
      setSnackbar({ open: true, message: 'Entry deleted', severity: 'success' });
      onUpdate();
      if (editingId === id) closeForm();
    } catch (error) {
      setSnackbar({ open: true, message: error.response?.data?.error || 'Failed to delete', severity: 'error' });
    }
  };

  const formatDate = (d) => {
    if (!d) return '';
    // If already in "MMM YYYY" format, return as-is
    if (!d.includes('-')) return d;
    const [y, m] = d.split('-');
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return m ? `${months[parseInt(m) - 1] || m} ${y}` : y;
  };

  return (
    <Box>
      {/* ── Header row ── */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {education.length === 0
            ? 'No education added yet'
            : `${education.length} entr${education.length === 1 ? 'y' : 'ies'}`}
        </Typography>
        {!showForm && (
          <Button
            size="small"
            variant="contained"
            startIcon={<AddIcon sx={{ fontSize: 15 }} />}
            onClick={openAdd}
            sx={{ px: 2, py: 0.75, fontSize: '0.8125rem' }}
          >
            Add Education
          </Button>
        )}
      </Stack>

      {/* ── Existing entries ── */}
      {education.length > 0 && (
        <Stack spacing={1.25} sx={{ mb: showForm ? 2 : 0 }}>
          {education.map((edu) => (
            <Box
              key={edu.id}
              sx={{
                border: '1px solid',
                borderColor: editingId === edu.id ? 'primary.main' : '#e2e8f0',
                borderRadius: 2,
                px: 2,
                py: 1.5,
                bgcolor: editingId === edu.id ? alpha('#6366f1', 0.03) : '#fff',
                transition: 'border-color 0.15s',
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mb: 0.25 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.875rem' }}>
                      {edu.school_name}
                    </Typography>
                    {Boolean(edu.is_current) && (
                      <Chip label="Current" size="small"
                        sx={{ height: 18, fontSize: '0.6875rem', fontWeight: 600, bgcolor: alpha('#10b981', 0.1), color: '#059669', '& .MuiChip-label': { px: 0.75 } }}
                      />
                    )}
                  </Stack>
                  <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
                    <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 500, fontSize: '0.8125rem' }}>
                      {[edu.degree, edu.field_of_study].filter(Boolean).join(' · ')}
                    </Typography>
                    {edu.location && (
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.25 }}>
                        <LocationIcon sx={{ fontSize: 11 }} />{edu.location}
                      </Typography>
                    )}
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.25 }}>
                      <CalendarIcon sx={{ fontSize: 11 }} />
                      {formatDate(edu.start_date)} – {Boolean(edu.is_current) ? 'Present' : formatDate(edu.end_date)}
                    </Typography>
                    {edu.gpa && (
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        GPA {edu.gpa}
                      </Typography>
                    )}
                  </Stack>
                </Box>

                <Stack direction="row" spacing={0.25} sx={{ flexShrink: 0 }}>
                  <Tooltip title="Edit" arrow>
                    <IconButton size="small" onClick={() => openEdit(edu)}
                      sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main', bgcolor: alpha('#6366f1', 0.08) } }}>
                      <EditIcon sx={{ fontSize: 15 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete" arrow>
                    <IconButton size="small" onClick={() => handleDelete(edu.id)}
                      sx={{ color: 'text.secondary', '&:hover': { color: 'error.main', bgcolor: alpha('#ef4444', 0.08) } }}>
                      <DeleteIcon sx={{ fontSize: 15 }} />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Stack>
            </Box>
          ))}
        </Stack>
      )}

      {/* ── Inline form (collapsible) ── */}
      <Collapse in={showForm} unmountOnExit>
        <Box
          sx={{
            border: '1.5px solid',
            borderColor: 'primary.main',
            borderRadius: 2,
            p: 2,
            bgcolor: alpha('#6366f1', 0.02),
          }}
          className="animate-fade-in"
        >
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'primary.main', fontSize: '0.8125rem' }}>
              {editingId ? 'Edit Education' : 'Add Education'}
            </Typography>
            <IconButton size="small" onClick={closeForm} sx={{ width: 24, height: 24 }}>
              <CloseIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Stack>

          <form onSubmit={handleSubmit}>
            <Grid container spacing={1.25}>
              {/* Row 1: School | Degree | Field */}
              <Grid item xs={12} sm={4}>
                <TextField required fullWidth size="small" label="School" name="school_name"
                  value={formData.school_name} onChange={handleChange} />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField fullWidth size="small" label="Degree" name="degree"
                  value={formData.degree} onChange={handleChange} placeholder="e.g. B.Sc." />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField fullWidth size="small" label="Field of Study" name="field_of_study"
                  value={formData.field_of_study} onChange={handleChange} placeholder="e.g. Computer Science" />
              </Grid>

              {/* Row 2: Location | GPA */}
              <Grid item xs={12} sm={6}>
                <TextField fullWidth size="small" label="Location" name="location"
                  value={formData.location} onChange={handleChange} placeholder="City, Country" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth size="small" label="GPA (optional)" name="gpa"
                  value={formData.gpa} onChange={handleChange} placeholder="e.g. 3.8" />
              </Grid>

              {/* Row 3: Start | End | Current */}
              <Grid item xs={6} sm={3}>
                <TextField required fullWidth size="small" label="Start" name="start_date"
                  value={formData.start_date} onChange={handleChange}
                  placeholder="MMM YYYY" inputProps={{ maxLength: 8 }} />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField fullWidth size="small" label="End" name="end_date"
                  value={formData.end_date} onChange={handleChange}
                  disabled={formData.is_current}
                  placeholder="MMM YYYY" inputProps={{ maxLength: 8 }} />
              </Grid>
              <Grid item xs={12} sm={6} sx={{ display: 'flex', alignItems: 'center' }}>
                <FormControlLabel
                  control={<Checkbox name="is_current" checked={formData.is_current} onChange={handleChange} size="small" />}
                  label={<Typography variant="body2">Currently studying here</Typography>}
                  sx={{ ml: 0 }}
                />
              </Grid>

              {/* Row 4: Actions */}
              <Grid item xs={12}>
                <Stack direction="row" spacing={1}>
                  <Button type="submit" variant="contained" size="small" disabled={saving}
                    startIcon={saving ? null : <SaveIcon sx={{ fontSize: 14 }} />}
                    sx={{ px: 2.5 }}>
                    {saving ? 'Saving…' : editingId ? 'Update' : 'Save'}
                  </Button>
                  <Button variant="outlined" size="small" onClick={closeForm} color="inherit" sx={{ px: 2 }}>
                    Cancel
                  </Button>
                </Stack>
              </Grid>
            </Grid>
          </form>
        </Box>
      </Collapse>

      {/* Empty state */}
      {education.length === 0 && !showForm && (
        <Box
          sx={{
            border: '1.5px dashed #e2e8f0',
            borderRadius: 2,
            py: 4,
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.15s',
            '&:hover': { borderColor: 'primary.main', bgcolor: alpha('#6366f1', 0.03) },
          }}
          onClick={openAdd}
        >
          <SchoolIcon sx={{ fontSize: 28, color: 'text.disabled', mb: 1 }} />
          <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
            Click to add your education
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.disabled' }}>
            Used in your generated resume
          </Typography>
        </Box>
      )}

      <Snackbar open={snackbar.open} autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default EducationHistory;
