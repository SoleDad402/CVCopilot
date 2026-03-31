import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Stack,
  Typography,
  Snackbar,
  Alert,
  Grid,
  IconButton,
  FormControlLabel,
  Checkbox,
  Chip,
  Collapse,
  Tooltip
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Add as AddIcon,
  Close as CloseIcon,
  Save as SaveIcon,
  Work as WorkIcon,
  LocationOn as LocationIcon
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import { employmentService } from '../../services/api';

const JOB_COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];

const EMPTY_FORM = {
  company_name: '',
  position: '',
  location: '',
  start_date: '',
  end_date: '',
  is_current: false
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const getYear = (d) => {
  if (!d) return null;
  // Handle both "YYYY-MM" and "MMM YYYY" formats
  if (d.includes('-')) {
    const y = parseInt(d.split('-')[0], 10);
    return isNaN(y) ? null : y;
  }
  const parts = d.trim().split(/\s+/);
  const y = parseInt(parts[parts.length - 1], 10);
  return isNaN(y) ? null : y;
};

const formatDate = (d) => {
  if (!d) return '';
  // If already in "MMM YYYY" format, return as-is
  if (!d.includes('-')) return d;
  const [y, m] = d.split('-');
  if (!m) return y;
  return `${MONTHS[parseInt(m, 10) - 1] || m} ${y}`;
};

// Build list of display items (year labels + gap placeholders) from employment entries
const buildDisplayItems = (entries) => {
  const now = new Date().getFullYear();
  const imp = new Set();

  entries.forEach(e => {
    const s = getYear(e.start_date);
    const en = Boolean(e.is_current) ? now : getYear(e.end_date);
    if (s != null) { imp.add(s); imp.add(s + 1); }
    if (en != null) { imp.add(en); imp.add(en - 1); }
  });

  const years = [...imp]
    .filter(y => y >= 1950 && y <= now + 1)
    .sort((a, b) => a - b);

  const items = [];
  for (let i = 0; i < years.length; i++) {
    items.push({ type: 'year', value: years[i] });
    if (i < years.length - 1 && years[i + 1] - years[i] > 1) {
      items.push({ type: 'gap' });
    }
  }
  return items;
};

// Returns CSS grid column start/end (1-indexed) for a given entry
const getSpan = (entry, items) => {
  const now = new Date().getFullYear();
  const startYear = getYear(entry.start_date);
  const endYear = Boolean(entry.is_current) ? now : getYear(entry.end_date);

  let si = items.findIndex(x => x.type === 'year' && x.value === startYear);
  let ei = items.findIndex(x => x.type === 'year' && x.value === endYear);

  // Fallbacks: find nearest year
  if (si === -1) si = items.findIndex(x => x.type === 'year' && x.value >= (startYear || 0));
  if (si === -1) si = 0;
  if (ei === -1) {
    for (let i = items.length - 1; i >= 0; i--) {
      if (items[i].type === 'year' && items[i].value <= (endYear || now)) { ei = i; break; }
    }
  }
  if (ei === -1) ei = items.length - 1;

  // Ensure start <= end
  if (si > ei) [si, ei] = [ei, si];

  return { colStart: si + 1, colEnd: ei + 2 }; // +2: end is exclusive in CSS grid
};

const EmploymentHistory = ({ employmentHistory, onUpdate }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const openAdd = () => { setFormData(EMPTY_FORM); setEditingId(null); setShowForm(true); };

  const openEdit = (entry) => {
    setFormData({
      company_name: entry.company_name || '',
      position: entry.position || '',
      location: entry.location || '',
      start_date: entry.start_date || '',
      end_date: entry.end_date || '',
      is_current: Boolean(entry.is_current)
    });
    setEditingId(entry.id);
    setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); setEditingId(null); setFormData(EMPTY_FORM); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await employmentService.updateEmployment(editingId, formData);
        setSnackbar({ open: true, message: 'Experience updated', severity: 'success' });
      } else {
        await employmentService.addEmployment(formData);
        setSnackbar({ open: true, message: 'Experience added', severity: 'success' });
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
      await employmentService.deleteEmployment(id);
      setSnackbar({ open: true, message: 'Entry deleted', severity: 'success' });
      onUpdate();
      if (editingId === id) closeForm();
    } catch (error) {
      setSnackbar({ open: true, message: error.response?.data?.error || 'Failed to delete', severity: 'error' });
    }
  };

  const displayItems = buildDisplayItems(employmentHistory);

  // CSS grid template: year cols = 52px, gap cols = 28px
  const gridTemplateColumns = displayItems
    .map(item => item.type === 'year' ? '52px' : '28px')
    .join(' ');

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {employmentHistory.length === 0
            ? 'No experience added yet'
            : `${employmentHistory.length} entr${employmentHistory.length === 1 ? 'y' : 'ies'}`}
        </Typography>
        {!showForm && (
          <Button
            size="small"
            variant="contained"
            startIcon={<AddIcon sx={{ fontSize: 15 }} />}
            onClick={openAdd}
            sx={{ px: 2, py: 0.75, fontSize: '0.8125rem' }}
          >
            Add Experience
          </Button>
        )}
      </Stack>

      {/* ── Gantt-style year timeline ── */}
      {employmentHistory.length > 0 && (
        <Box
          sx={{
            border: '1px solid #e2e8f0',
            borderRadius: 2,
            p: 2,
            mb: 2,
            bgcolor: '#fafafa',
            overflowX: 'auto',
          }}
        >
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns,
              rowGap: '6px',
              minWidth: 'fit-content',
              alignItems: 'center',
            }}
          >
            {/* Row 1: Year labels */}
            {displayItems.map((item, i) => (
              <Box key={`lbl-${i}`} sx={{ gridRow: 1, textAlign: 'center', userSelect: 'none' }}>
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: '0.6875rem',
                    fontWeight: item.type === 'year' ? 600 : 400,
                    color: item.type === 'year' ? 'text.secondary' : 'text.disabled',
                    lineHeight: 1,
                  }}
                >
                  {item.type === 'year' ? item.value : '···'}
                </Typography>
              </Box>
            ))}

            {/* Row 2: baseline */}
            <Box
              sx={{
                gridRow: 2,
                gridColumn: `1 / ${displayItems.length + 1}`,
                height: 1,
                bgcolor: '#e2e8f0',
                borderRadius: 1,
              }}
            />

            {/* Rows 3+: Job bars */}
            {employmentHistory.map((entry, idx) => {
              const span = getSpan(entry, displayItems);
              const color = JOB_COLORS[idx % JOB_COLORS.length];
              const isCurrent = Boolean(entry.is_current);

              return (
                <Tooltip
                  key={entry.id}
                  title={`${entry.position} · ${entry.company_name} (${formatDate(entry.start_date)} – ${isCurrent ? 'Present' : formatDate(entry.end_date)})`}
                  arrow
                  placement="top"
                >
                  <Box
                    sx={{
                      gridRow: idx + 3,
                      gridColumn: `${span.colStart} / ${span.colEnd}`,
                      height: 22,
                      bgcolor: alpha(color, 0.12),
                      border: `1.5px solid ${alpha(color, 0.35)}`,
                      borderRadius: 99,
                      cursor: 'default',
                      position: 'relative',
                      transition: 'all 0.15s',
                      '&:hover': {
                        bgcolor: alpha(color, 0.2),
                        borderColor: alpha(color, 0.6),
                      },
                    }}
                  >
                    {/* Start dot */}
                    <Box
                      sx={{
                        position: 'absolute', left: 4, top: '50%',
                        transform: 'translateY(-50%)',
                        width: 7, height: 7, borderRadius: '50%',
                        bgcolor: color,
                      }}
                    />
                    {/* End dot */}
                    <Box
                      sx={{
                        position: 'absolute', right: 4, top: '50%',
                        transform: 'translateY(-50%)',
                        width: isCurrent ? 0 : 7,
                        height: isCurrent ? 0 : 7,
                        borderRadius: '50%',
                        bgcolor: color,
                      }}
                    />
                    {/* "Present" arrow cap */}
                    {isCurrent && (
                      <Box
                        sx={{
                          position: 'absolute', right: -1, top: '50%',
                          transform: 'translateY(-50%)',
                          width: 0, height: 0,
                          borderTop: '5px solid transparent',
                          borderBottom: '5px solid transparent',
                          borderLeft: `6px solid ${alpha(color, 0.6)}`,
                        }}
                      />
                    )}
                  </Box>
                </Tooltip>
              );
            })}
          </Box>

          {/* Color legend below bars */}
          <Stack direction="row" spacing={1.5} flexWrap="wrap" sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid #e2e8f0' }}>
            {employmentHistory.map((entry, idx) => {
              const color = JOB_COLORS[idx % JOB_COLORS.length];
              return (
                <Stack key={entry.id} direction="row" spacing={0.75} alignItems="center">
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: color, flexShrink: 0 }} />
                  <Typography variant="caption" sx={{ fontSize: '0.6875rem', color: 'text.secondary', whiteSpace: 'nowrap' }}>
                    {entry.position}
                  </Typography>
                </Stack>
              );
            })}
          </Stack>
        </Box>
      )}

      {/* ── Compact entry list ── */}
      {employmentHistory.length > 0 && (
        <Stack spacing={1} sx={{ mb: showForm ? 2 : 0 }}>
          {employmentHistory.map((entry, idx) => {
            const color = JOB_COLORS[idx % JOB_COLORS.length];
            const isCurrent = Boolean(entry.is_current);
            return (
              <Box
                key={entry.id}
                sx={{
                  border: '1px solid',
                  borderColor: editingId === entry.id ? 'primary.main' : '#e2e8f0',
                  borderRadius: 2,
                  px: 2,
                  py: 1.25,
                  bgcolor: editingId === entry.id ? alpha('#6366f1', 0.03) : '#fff',
                  transition: 'border-color 0.15s',
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                  <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0, flex: 1 }}>
                    {/* Color dot */}
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: color, flexShrink: 0 }} />
                    <Box sx={{ minWidth: 0 }}>
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.875rem' }}>
                          {entry.position}
                        </Typography>
                        {isCurrent && (
                          <Chip
                            label="Current"
                            size="small"
                            sx={{
                              height: 18, fontSize: '0.6875rem', fontWeight: 600,
                              bgcolor: alpha('#10b981', 0.1), color: '#059669',
                              '& .MuiChip-label': { px: 0.75 }
                            }}
                          />
                        )}
                      </Stack>
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                          {entry.company_name}
                        </Typography>
                        {entry.location && (
                          <Typography variant="caption" sx={{ color: 'text.disabled', display: 'flex', alignItems: 'center', gap: 0.25 }}>
                            <LocationIcon sx={{ fontSize: 10 }} />{entry.location}
                          </Typography>
                        )}
                        <Box
                          sx={{
                            display: 'inline-flex', alignItems: 'center', gap: 0.5,
                            bgcolor: '#f1f5f9', borderRadius: 99, px: 0.75, py: 0.2,
                          }}
                        >
                          <Typography variant="caption" sx={{ fontSize: '0.6875rem', color: 'text.secondary', fontWeight: 500, lineHeight: 1 }}>
                            {formatDate(entry.start_date)}
                          </Typography>
                          <Box sx={{ width: 8, height: 1, bgcolor: '#94a3b8', borderRadius: 1 }} />
                          <Typography variant="caption" sx={{ fontSize: '0.6875rem', color: isCurrent ? '#059669' : 'text.secondary', fontWeight: isCurrent ? 600 : 500, lineHeight: 1 }}>
                            {isCurrent ? 'Present' : formatDate(entry.end_date)}
                          </Typography>
                        </Box>
                      </Stack>
                    </Box>
                  </Stack>

                  <Stack direction="row" spacing={0.25} sx={{ flexShrink: 0 }}>
                    <Tooltip title="Edit" arrow>
                      <IconButton size="small" onClick={() => openEdit(entry)}
                        sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main', bgcolor: alpha('#6366f1', 0.08) } }}>
                        <EditIcon sx={{ fontSize: 15 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete" arrow>
                      <IconButton size="small" onClick={() => handleDelete(entry.id)}
                        sx={{ color: 'text.secondary', '&:hover': { color: 'error.main', bgcolor: alpha('#ef4444', 0.08) } }}>
                        <DeleteIcon sx={{ fontSize: 15 }} />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Stack>
              </Box>
            );
          })}
        </Stack>
      )}

      {/* ── Inline form ── */}
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
              {editingId ? 'Edit Experience' : 'Add Experience'}
            </Typography>
            <IconButton size="small" onClick={closeForm} sx={{ width: 24, height: 24 }}>
              <CloseIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Stack>

          <form onSubmit={handleSubmit}>
            <Grid container spacing={1.25}>
              <Grid item xs={12} sm={4}>
                <TextField required fullWidth size="small" label="Company" name="company_name"
                  value={formData.company_name} onChange={handleChange} />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField required fullWidth size="small" label="Position" name="position"
                  value={formData.position} onChange={handleChange} />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField fullWidth size="small" label="Location" name="location"
                  value={formData.location} onChange={handleChange} placeholder="City, Country" />
              </Grid>
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
                  label={<Typography variant="body2">Currently working here</Typography>}
                  sx={{ ml: 0 }}
                />
              </Grid>
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
      {employmentHistory.length === 0 && !showForm && (
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
          <WorkIcon sx={{ fontSize: 28, color: 'text.disabled', mb: 1 }} />
          <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
            Click to add your work experience
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

export default EmploymentHistory;
