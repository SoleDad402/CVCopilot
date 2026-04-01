import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, Stack, TextField, Chip, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Stepper, Step, StepLabel, StepConnector,
  Card, CardContent, MenuItem, Select, FormControl, InputLabel,
  Snackbar, Alert, Tooltip, Divider, Skeleton,
  Menu, InputAdornment
} from '@mui/material';
import { alpha, styled } from '@mui/material/styles';
import {
  Add as AddIcon,
  Work as WorkIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  OpenInNew as LinkIcon,
  Comment as CommentIcon,
  Send as SendIcon,
  MoreVert as MoreIcon,
  Search as SearchIcon,
  CheckCircle as CheckIcon,
  AccessTime as TimeIcon,
  TrendingUp as TrendingIcon,
  Business as BusinessIcon,
  LocationOn as LocationIcon,
  AttachMoney as MoneyIcon,
  Close as CloseIcon,
  DragIndicator as DragIcon,
  ArrowUpward as UpIcon,
  ArrowDownward as DownIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { NAVBAR_HEIGHT, colors } from '../theme';
import { jobTrackerService } from '../services/api';

// ── Default pipeline steps ──────────────────────────────────────────────────
const DEFAULT_STEPS = [
  { key: 'applied',          label: 'Applied' },
  { key: 'screening',        label: 'Screening' },
  { key: 'phone_interview',  label: 'Phone Interview' },
  { key: 'technical',        label: 'Technical' },
  { key: 'offer',            label: 'Offer' },
  { key: 'accepted',         label: 'Accepted' },
];

// Terminal statuses (always available, never in the stepper)
const TERMINAL_STATUSES = [
  { key: 'rejected', label: 'Rejected', color: '#ef4444', icon: '❌' },
  { key: 'withdrawn', label: 'Withdrawn', color: '#6b7280', icon: '🚫' },
];

// Color palette for steps (cycles through for custom steps)
const STEP_COLORS = ['#3b82f6', '#8b5cf6', '#6366f1', '#0ea5e9', '#f59e0b', '#f97316', '#10b981', '#059669', '#ec4899', '#14b8a6'];
const getStepColor = (idx, total) => {
  if (idx === total - 1) return '#059669'; // last step always green (accepted/offer)
  return STEP_COLORS[idx % STEP_COLORS.length];
};

// Get the pipeline steps for an app (use custom or default)
const getAppSteps = (app) => {
  if (app.pipeline_steps && Array.isArray(app.pipeline_steps) && app.pipeline_steps.length > 0) {
    return app.pipeline_steps;
  }
  return DEFAULT_STEPS;
};

// Get status info (label + color) for any status key, given an app's pipeline
const getStatusInfo = (statusKey, app) => {
  const terminal = TERMINAL_STATUSES.find(t => t.key === statusKey);
  if (terminal) return terminal;
  const steps = getAppSteps(app);
  const idx = steps.findIndex(s => s.key === statusKey);
  if (idx >= 0) return { ...steps[idx], color: getStepColor(idx, steps.length) };
  return { key: statusKey, label: statusKey, color: '#6b7280' };
};

// ── Custom stepper connector ────────────────────────────────────────────────
const ColoredConnector = styled(StepConnector)(() => ({
  '& .MuiStepConnector-line': {
    borderColor: '#e2e8f0',
    borderTopWidth: 2,
  },
  '&.Mui-active .MuiStepConnector-line, &.Mui-completed .MuiStepConnector-line': {
    borderColor: colors.primary,
  },
}));

// ── Helpers ─────────────────────────────────────────────────────────────────
const formatDate = (d) => {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const timeAgo = (d) => {
  if (!d) return '';
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(d);
};

const EMPTY_FORM = {
  company_name: '', position: '', location: '', job_url: '',
  salary_range: '', status: 'applied', applied_date: new Date().toISOString().slice(0, 10),
};

// ── Main Component ──────────────────────────────────────────────────────────
export default function JobTracker() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Form
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  // Detail view
  const [selectedApp, setSelectedApp] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [events, setEvents] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [addingComment, setAddingComment] = useState(false);

  // Pipeline editor
  const [stepsEditorOpen, setStepsEditorOpen] = useState(false);
  const [editingSteps, setEditingSteps] = useState([]);
  const [newStepLabel, setNewStepLabel] = useState('');

  // Menu
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuApp, setMenuApp] = useState(null);

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // ── Data fetching ───────────────────────────────────────────────────────
  const fetchApplications = useCallback(async () => {
    try {
      const { data } = await jobTrackerService.getAll();
      setApplications(data);
    } catch (err) {
      console.error('Failed to fetch applications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchApplications(); }, [fetchApplications]);

  // ── CRUD handlers ─────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!formData.company_name.trim() || !formData.position.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        await jobTrackerService.update(editingId, formData);
        setSnackbar({ open: true, message: 'Application updated', severity: 'success' });
      } else {
        await jobTrackerService.create(formData);
        setSnackbar({ open: true, message: 'Application added', severity: 'success' });
      }
      setDialogOpen(false);
      setFormData(EMPTY_FORM);
      setEditingId(null);
      fetchApplications();
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to save', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await jobTrackerService.delete(id);
      setSnackbar({ open: true, message: 'Application deleted', severity: 'success' });
      fetchApplications();
      if (selectedApp?.id === id) setDetailOpen(false);
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to delete', severity: 'error' });
    }
    setMenuAnchor(null);
  };

  const handleStatusChange = async (appId, newStatus) => {
    try {
      await jobTrackerService.updateStatus(appId, newStatus);
      fetchApplications();
      if (selectedApp?.id === appId) openDetail(appId);
      setSnackbar({ open: true, message: 'Status updated', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to update status', severity: 'error' });
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedApp) return;
    setAddingComment(true);
    try {
      await jobTrackerService.addComment(selectedApp.id, newComment.trim());
      setNewComment('');
      openDetail(selectedApp.id);
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to add comment', severity: 'error' });
    } finally {
      setAddingComment(false);
    }
  };

  // ── Pipeline steps editor ─────────────────────────────────────────────
  const openStepsEditor = () => {
    if (!selectedApp) return;
    setEditingSteps([...getAppSteps(selectedApp)]);
    setNewStepLabel('');
    setStepsEditorOpen(true);
  };

  const addStep = () => {
    const label = newStepLabel.trim();
    if (!label) return;
    const key = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    if (editingSteps.some(s => s.key === key)) {
      setSnackbar({ open: true, message: 'Step already exists', severity: 'warning' });
      return;
    }
    setEditingSteps(prev => [...prev, { key, label }]);
    setNewStepLabel('');
  };

  const removeStep = (idx) => {
    setEditingSteps(prev => prev.filter((_, i) => i !== idx));
  };

  const moveStep = (idx, dir) => {
    setEditingSteps(prev => {
      const arr = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= arr.length) return arr;
      [arr[idx], arr[target]] = [arr[target], arr[idx]];
      return arr;
    });
  };

  const saveSteps = async () => {
    if (!selectedApp || editingSteps.length < 2) {
      setSnackbar({ open: true, message: 'Need at least 2 steps', severity: 'warning' });
      return;
    }
    try {
      await jobTrackerService.update(selectedApp.id, { pipeline_steps: editingSteps });
      // If current status isn't in the new steps, reset to first step
      const validKeys = [...editingSteps.map(s => s.key), ...TERMINAL_STATUSES.map(t => t.key)];
      if (!validKeys.includes(selectedApp.status)) {
        await jobTrackerService.updateStatus(selectedApp.id, editingSteps[0].key, 'Pipeline steps updated, status reset');
      }
      setStepsEditorOpen(false);
      fetchApplications();
      openDetail(selectedApp.id);
      setSnackbar({ open: true, message: 'Pipeline updated', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to save pipeline', severity: 'error' });
    }
  };

  // ── Detail panel ──────────────────────────────────────────────────────
  const openDetail = async (id) => {
    try {
      const { data } = await jobTrackerService.getById(id);
      setSelectedApp(data);
      setEvents(data.events || []);
      setDetailOpen(true);
    } catch (err) {
      console.error('Failed to fetch detail:', err);
    }
  };

  const openEdit = (app) => {
    setFormData({
      company_name: app.company_name,
      position: app.position,
      location: app.location || '',
      job_url: app.job_url || '',
      salary_range: app.salary_range || '',
      status: app.status,
      applied_date: app.applied_date || '',
    });
    setEditingId(app.id);
    setDialogOpen(true);
    setMenuAnchor(null);
  };

  // ── Filtering ─────────────────────────────────────────────────────────
  // Collect all unique status keys across all apps for the filter bar
  const allStatusKeys = new Set();
  applications.forEach(a => {
    allStatusKeys.add(a.status);
    getAppSteps(a).forEach(s => allStatusKeys.add(s.key));
  });
  TERMINAL_STATUSES.forEach(t => allStatusKeys.add(t.key));

  const filtered = applications.filter(a => {
    const matchSearch = !search ||
      a.company_name.toLowerCase().includes(search.toLowerCase()) ||
      a.position.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || a.status === filterStatus;
    return matchSearch && matchStatus;
  });

  // ── Stats ─────────────────────────────────────────────────────────────
  const stats = {
    total: applications.length,
    active: applications.filter(a => !['rejected', 'withdrawn'].includes(a.status)).length,
    interviews: applications.filter(a => {
      const steps = getAppSteps(a);
      const idx = steps.findIndex(s => s.key === a.status);
      return idx > 0 && idx < steps.length - 1 && !['rejected', 'withdrawn'].includes(a.status);
    }).length,
    offers: applications.filter(a => {
      const steps = getAppSteps(a);
      const idx = steps.findIndex(s => s.key === a.status);
      return idx === steps.length - 1 || idx === steps.length - 2;
    }).length,
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: colors.bg, pt: `${NAVBAR_HEIGHT + 24}px`, pb: 4, px: { xs: 2, md: 4 } }}>
      <Box sx={{ maxWidth: 1200, mx: 'auto' }}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2} sx={{ mb: 3 }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: colors.dark }}>
              Job Tracker
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
              Track your applications from applied to offer
            </Typography>
          </Box>
          <Button
            variant="contained" startIcon={<AddIcon />}
            onClick={() => { setFormData(EMPTY_FORM); setEditingId(null); setDialogOpen(true); }}
          >
            Add Application
          </Button>
        </Stack>

        {/* ── Stats Cards ────────────────────────────────────────────────── */}
        <Stack direction="row" spacing={2} sx={{ mb: 3, overflowX: 'auto', pb: 0.5 }}>
          {[
            { label: 'Total', value: stats.total, icon: <WorkIcon />, color: colors.primary },
            { label: 'Active', value: stats.active, icon: <TrendingIcon />, color: colors.info },
            { label: 'In Progress', value: stats.interviews, icon: <TimeIcon />, color: colors.warning },
            { label: 'Final Stage', value: stats.offers, icon: <CheckIcon />, color: colors.success },
          ].map(s => (
            <Card key={s.label} sx={{ minWidth: 140, flex: 1, border: '1px solid', borderColor: colors.border, '&:hover': { transform: 'none' } }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.08em' }}>
                      {s.label}
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700, mt: 0.25 }}>{s.value}</Typography>
                  </Box>
                  <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: alpha(s.color, 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>
                    {React.cloneElement(s.icon, { sx: { fontSize: 18 } })}
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>

        {/* ── Search & Filter ────────────────────────────────────────────── */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 3 }}>
          <TextField
            size="small" placeholder="Search company or role..."
            value={search} onChange={e => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} /></InputAdornment> }}
            sx={{ flex: 1, maxWidth: 360 }}
          />
          <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
            <Chip label="All" size="small" variant={filterStatus === 'all' ? 'filled' : 'outlined'}
              color={filterStatus === 'all' ? 'primary' : 'default'}
              onClick={() => setFilterStatus('all')} />
            {[...allStatusKeys].map(key => {
              // Use first app that has this status to get color
              const refApp = applications.find(a => a.status === key) || applications[0] || {};
              const info = getStatusInfo(key, refApp);
              return (
                <Chip key={key} label={info.label} size="small"
                  variant={filterStatus === key ? 'filled' : 'outlined'}
                  onClick={() => setFilterStatus(key)}
                  sx={filterStatus === key ? { bgcolor: info.color, color: '#fff', '&:hover': { bgcolor: info.color } } : {}}
                />
              );
            })}
          </Stack>
        </Stack>

        {/* ── Application Cards ──────────────────────────────────────────── */}
        {loading ? (
          <Stack spacing={2}>
            {[1, 2, 3].map(i => <Skeleton key={i} variant="rounded" height={120} />)}
          </Stack>
        ) : filtered.length === 0 ? (
          <Card sx={{ textAlign: 'center', py: 6, border: '1px solid', borderColor: colors.border, '&:hover': { transform: 'none' } }}>
            <WorkIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography variant="h6" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              {applications.length === 0 ? 'No applications yet' : 'No matching applications'}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.disabled', mt: 0.5, mb: 2 }}>
              {applications.length === 0 ? 'Start tracking your job applications' : 'Try a different search or filter'}
            </Typography>
            {applications.length === 0 && (
              <Button variant="contained" startIcon={<AddIcon />}
                onClick={() => { setFormData(EMPTY_FORM); setEditingId(null); setDialogOpen(true); }}>
                Add Your First Application
              </Button>
            )}
          </Card>
        ) : (
          <Stack spacing={1.5}>
            {filtered.map(app => {
              const steps = getAppSteps(app);
              const statusInfo = getStatusInfo(app.status, app);
              const stepIndex = steps.findIndex(s => s.key === app.status);
              const isTerminal = TERMINAL_STATUSES.some(t => t.key === app.status);

              return (
                <Card key={app.id} onClick={() => openDetail(app.id)} sx={{
                  cursor: 'pointer', border: '1px solid', borderColor: colors.border,
                  borderLeft: `4px solid ${statusInfo.color}`,
                  '&:hover': { borderColor: alpha(statusInfo.color, 0.5), boxShadow: 3 },
                  transition: 'all 0.15s ease',
                }}>
                  <CardContent sx={{ p: { xs: 2, md: 2.5 }, '&:last-child': { pb: { xs: 2, md: 2.5 } } }}>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                      {/* Left: Info */}
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.75 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {app.position}
                          </Typography>
                          <Chip label={statusInfo.label} size="small" sx={{
                            bgcolor: alpha(statusInfo.color, 0.1), color: statusInfo.color,
                            fontWeight: 600, fontSize: '0.7rem', height: 22,
                          }} />
                        </Stack>
                        <Stack direction="row" spacing={2} sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
                          <Stack direction="row" alignItems="center" spacing={0.5}>
                            <BusinessIcon sx={{ fontSize: 14 }} />
                            <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>{app.company_name}</Typography>
                          </Stack>
                          {app.location && (
                            <Stack direction="row" alignItems="center" spacing={0.5}>
                              <LocationIcon sx={{ fontSize: 14 }} />
                              <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>{app.location}</Typography>
                            </Stack>
                          )}
                          {app.salary_range && (
                            <Stack direction="row" alignItems="center" spacing={0.5}>
                              <MoneyIcon sx={{ fontSize: 14 }} />
                              <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>{app.salary_range}</Typography>
                            </Stack>
                          )}
                          <Typography variant="body2" sx={{ fontSize: '0.8rem', color: 'text.disabled' }}>
                            Applied {formatDate(app.applied_date)}
                          </Typography>
                        </Stack>
                      </Box>

                      {/* Right: Mini Stepper (dynamic) */}
                      <Box sx={{ display: { xs: 'none', md: 'block' }, width: Math.min(steps.length * 70, 500), flexShrink: 0 }}
                        onClick={e => e.stopPropagation()}>
                        {!isTerminal ? (
                          <Stepper activeStep={stepIndex} alternativeLabel connector={<ColoredConnector />}
                            sx={{ '& .MuiStepLabel-label': { fontSize: '0.6rem', mt: 0.5 } }}>
                            {steps.map((s, i) => (
                              <Step key={s.key} completed={i <= stepIndex}>
                                <StepLabel
                                  StepIconProps={{
                                    sx: {
                                      fontSize: 18,
                                      color: i <= stepIndex ? `${getStepColor(stepIndex, steps.length)} !important` : undefined,
                                      '&.Mui-active': { color: `${getStepColor(stepIndex, steps.length)} !important` },
                                      '&.Mui-completed': { color: `${getStepColor(stepIndex, steps.length)} !important` },
                                    }
                                  }}
                                  sx={{ cursor: 'pointer', '&:hover': { opacity: 0.7 } }}
                                  onClick={() => handleStatusChange(app.id, s.key)}
                                >
                                  {s.label}
                                </StepLabel>
                              </Step>
                            ))}
                          </Stepper>
                        ) : (
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                            <Chip label={`${statusInfo.icon || ''} ${statusInfo.label}`} sx={{
                              bgcolor: alpha(statusInfo.color, 0.1), color: statusInfo.color,
                              fontWeight: 600, fontSize: '0.85rem',
                            }} />
                          </Box>
                        )}
                      </Box>

                      {/* Actions */}
                      <Box sx={{ display: 'flex', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                        <IconButton size="small" onClick={(e) => { setMenuAnchor(e.currentTarget); setMenuApp(app); }}>
                          <MoreIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              );
            })}
          </Stack>
        )}
      </Box>

      {/* ── Card Action Menu ───────────────────────────────────────────────── */}
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        <MenuItem onClick={() => { openEdit(menuApp); }}>
          <EditIcon sx={{ fontSize: 16, mr: 1 }} /> Edit
        </MenuItem>
        {menuApp?.job_url && (
          <MenuItem onClick={() => { window.open(menuApp.job_url, '_blank'); setMenuAnchor(null); }}>
            <LinkIcon sx={{ fontSize: 16, mr: 1 }} /> Open Job URL
          </MenuItem>
        )}
        <Divider />
        <MenuItem onClick={() => handleDelete(menuApp?.id)} sx={{ color: 'error.main' }}>
          <DeleteIcon sx={{ fontSize: 16, mr: 1 }} /> Delete
        </MenuItem>
      </Menu>

      {/* ── Add/Edit Dialog ──────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editingId ? 'Edit Application' : 'Add Application'}
        </DialogTitle>
        <DialogContent sx={{ pt: '8px !important' }}>
          <Stack spacing={2}>
            <Stack direction="row" spacing={2}>
              <TextField fullWidth required size="small" label="Company" name="company_name"
                value={formData.company_name}
                onChange={e => setFormData(p => ({ ...p, company_name: e.target.value }))} />
              <TextField fullWidth required size="small" label="Position" name="position"
                value={formData.position}
                onChange={e => setFormData(p => ({ ...p, position: e.target.value }))} />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField fullWidth size="small" label="Location"
                value={formData.location}
                onChange={e => setFormData(p => ({ ...p, location: e.target.value }))} />
              <TextField fullWidth size="small" label="Salary Range"
                value={formData.salary_range}
                onChange={e => setFormData(p => ({ ...p, salary_range: e.target.value }))}
                placeholder="e.g. $120k-$150k" />
            </Stack>
            <TextField fullWidth size="small" label="Job URL"
              value={formData.job_url}
              onChange={e => setFormData(p => ({ ...p, job_url: e.target.value }))}
              placeholder="https://..." />
            <Stack direction="row" spacing={2}>
              <TextField fullWidth size="small" label="Applied Date" type="date"
                value={formData.applied_date}
                onChange={e => setFormData(p => ({ ...p, applied_date: e.target.value }))}
                InputLabelProps={{ shrink: true }} />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setDialogOpen(false)} color="inherit">Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving || !formData.company_name.trim() || !formData.position.trim()}>
            {saving ? 'Saving...' : editingId ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Detail Dialog ────────────────────────────────────────────────── */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="md" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        {selectedApp && (() => {
          const steps = getAppSteps(selectedApp);
          const statusInfo = getStatusInfo(selectedApp.status, selectedApp);
          const stepIndex = steps.findIndex(s => s.key === selectedApp.status);
          const isTerminal = TERMINAL_STATUSES.some(t => t.key === selectedApp.status);

          return (
            <>
              <DialogTitle sx={{ pb: 1 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>{selectedApp.position}</Typography>
                    <Stack direction="row" spacing={2} sx={{ mt: 0.5 }}>
                      <Stack direction="row" alignItems="center" spacing={0.5} sx={{ color: 'text.secondary' }}>
                        <BusinessIcon sx={{ fontSize: 15 }} />
                        <Typography variant="body2">{selectedApp.company_name}</Typography>
                      </Stack>
                      {selectedApp.location && (
                        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ color: 'text.secondary' }}>
                          <LocationIcon sx={{ fontSize: 15 }} />
                          <Typography variant="body2">{selectedApp.location}</Typography>
                        </Stack>
                      )}
                      {selectedApp.salary_range && (
                        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ color: 'text.secondary' }}>
                          <MoneyIcon sx={{ fontSize: 15 }} />
                          <Typography variant="body2">{selectedApp.salary_range}</Typography>
                        </Stack>
                      )}
                    </Stack>
                  </Box>
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    {selectedApp.job_url && (
                      <Tooltip title="Open job posting">
                        <IconButton size="small" onClick={() => window.open(selectedApp.job_url, '_blank')}>
                          <LinkIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                    )}
                    <IconButton size="small" onClick={() => setDetailOpen(false)}>
                      <CloseIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Stack>
                </Stack>
              </DialogTitle>

              <DialogContent>
                {/* Stepper with edit button */}
                <Box sx={{ mb: 3, mt: 1 }}>
                  <Stack direction="row" justifyContent="flex-end" sx={{ mb: 1 }}>
                    <Button size="small" startIcon={<SettingsIcon sx={{ fontSize: 14 }} />}
                      onClick={openStepsEditor}
                      sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
                      Customize Steps
                    </Button>
                  </Stack>
                  {!isTerminal ? (
                    <Stepper activeStep={stepIndex} alternativeLabel connector={<ColoredConnector />}>
                      {steps.map((s, i) => (
                        <Step key={s.key} completed={i <= stepIndex}>
                          <StepLabel
                            StepIconProps={{
                              sx: {
                                fontSize: 22,
                                color: i <= stepIndex ? `${getStepColor(stepIndex, steps.length)} !important` : undefined,
                                '&.Mui-active': { color: `${getStepColor(stepIndex, steps.length)} !important` },
                                '&.Mui-completed': { color: `${getStepColor(stepIndex, steps.length)} !important` },
                              }
                            }}
                            sx={{ cursor: 'pointer', '&:hover': { opacity: 0.7 } }}
                            onClick={() => handleStatusChange(selectedApp.id, s.key)}
                          >
                            {s.label}
                          </StepLabel>
                        </Step>
                      ))}
                    </Stepper>
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 2 }}>
                      <Chip label={`${statusInfo.icon || ''} ${statusInfo.label}`} sx={{
                        bgcolor: alpha(statusInfo.color, 0.1), color: statusInfo.color,
                        fontWeight: 600, fontSize: '0.9rem', px: 2, height: 32,
                      }} />
                    </Box>
                  )}
                </Box>

                {/* Quick status: pipeline steps + terminal */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Update Status</Typography>
                  <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', gap: 0.75 }}>
                    {steps.map((s, i) => (
                      <Chip key={s.key} label={s.label} size="small"
                        variant={selectedApp.status === s.key ? 'filled' : 'outlined'}
                        onClick={() => handleStatusChange(selectedApp.id, s.key)}
                        sx={selectedApp.status === s.key
                          ? { bgcolor: getStepColor(i, steps.length), color: '#fff', fontWeight: 600, '&:hover': { bgcolor: getStepColor(i, steps.length) } }
                          : { cursor: 'pointer' }
                        }
                      />
                    ))}
                    <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
                    {TERMINAL_STATUSES.map(t => (
                      <Chip key={t.key} label={`${t.icon} ${t.label}`} size="small"
                        variant={selectedApp.status === t.key ? 'filled' : 'outlined'}
                        onClick={() => handleStatusChange(selectedApp.id, t.key)}
                        sx={selectedApp.status === t.key
                          ? { bgcolor: t.color, color: '#fff', fontWeight: 600, '&:hover': { bgcolor: t.color } }
                          : { cursor: 'pointer' }
                        }
                      />
                    ))}
                  </Stack>
                </Box>

                <Divider sx={{ mb: 3 }} />

                {/* Activity Timeline */}
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>
                  Activity & Comments
                </Typography>

                <Stack spacing={0}>
                  {events.map((event, idx) => {
                    const fromInfo = event.from_status ? getStatusInfo(event.from_status, selectedApp) : null;
                    const toInfo = event.to_status ? getStatusInfo(event.to_status, selectedApp) : null;

                    return (
                      <Stack key={event.id} direction="row" spacing={1.5} sx={{ pb: 2, position: 'relative' }}>
                        {idx < events.length - 1 && (
                          <Box sx={{
                            position: 'absolute', left: 14, top: 28, bottom: 0,
                            width: 2, bgcolor: colors.border,
                          }} />
                        )}
                        <Box sx={{
                          width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                          bgcolor: event.event_type === 'status_change' ? alpha(colors.primary, 0.1) : alpha(colors.info, 0.1),
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          zIndex: 1,
                        }}>
                          {event.event_type === 'status_change'
                            ? <TrendingIcon sx={{ fontSize: 14, color: colors.primary }} />
                            : <CommentIcon sx={{ fontSize: 14, color: colors.info }} />
                          }
                        </Box>
                        <Box sx={{ flex: 1, pt: 0.25 }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="body2" sx={{
                              fontWeight: event.event_type === 'status_change' ? 600 : 400,
                              color: event.event_type === 'status_change' ? 'text.primary' : 'text.secondary',
                            }}>
                              {event.comment || `${event.from_status || '—'} → ${event.to_status || '—'}`}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.disabled', whiteSpace: 'nowrap', ml: 1 }}>
                              {timeAgo(event.created_at)}
                            </Typography>
                          </Stack>
                          {event.event_type === 'status_change' && fromInfo && toInfo && (
                            <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>
                              <Chip label={fromInfo.label} size="small"
                                sx={{ height: 20, fontSize: '0.65rem', bgcolor: alpha(fromInfo.color, 0.1), color: fromInfo.color }} />
                              <Typography variant="caption" sx={{ color: 'text.disabled', lineHeight: '20px' }}>→</Typography>
                              <Chip label={toInfo.label} size="small"
                                sx={{ height: 20, fontSize: '0.65rem', bgcolor: alpha(toInfo.color, 0.1), color: toInfo.color }} />
                            </Stack>
                          )}
                        </Box>
                      </Stack>
                    );
                  })}

                  {events.length === 0 && (
                    <Typography variant="body2" sx={{ color: 'text.disabled', fontStyle: 'italic', py: 2, textAlign: 'center' }}>
                      No activity yet
                    </Typography>
                  )}
                </Stack>

                {/* Comment Input */}
                <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                  <TextField fullWidth size="small" placeholder="Add a comment..."
                    value={newComment} onChange={e => setNewComment(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }}
                    multiline maxRows={3}
                  />
                  <IconButton color="primary" onClick={handleAddComment}
                    disabled={!newComment.trim() || addingComment}
                    sx={{ bgcolor: alpha(colors.primary, 0.1), '&:hover': { bgcolor: alpha(colors.primary, 0.2) } }}>
                    <SendIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Stack>
              </DialogContent>
            </>
          );
        })()}
      </Dialog>

      {/* ── Pipeline Steps Editor ────────────────────────────────────────── */}
      <Dialog open={stepsEditorOpen} onClose={() => setStepsEditorOpen(false)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>
          Customize Pipeline
          <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 400, mt: 0.25 }}>
            Add, remove, or reorder interview steps
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={0.5} sx={{ mb: 2 }}>
            {editingSteps.map((step, idx) => (
              <Stack key={step.key} direction="row" alignItems="center" spacing={1}
                sx={{
                  py: 0.75, px: 1.5, borderRadius: 2,
                  bgcolor: alpha(getStepColor(idx, editingSteps.length), 0.04),
                  border: '1px solid', borderColor: alpha(getStepColor(idx, editingSteps.length), 0.15),
                }}>
                <Box sx={{
                  width: 8, height: 8, borderRadius: '50%',
                  bgcolor: getStepColor(idx, editingSteps.length), flexShrink: 0,
                }} />
                <Typography variant="body2" sx={{ flex: 1, fontWeight: 500 }}>{step.label}</Typography>
                <IconButton size="small" disabled={idx === 0}
                  onClick={() => moveStep(idx, -1)} sx={{ p: 0.25 }}>
                  <UpIcon sx={{ fontSize: 16 }} />
                </IconButton>
                <IconButton size="small" disabled={idx === editingSteps.length - 1}
                  onClick={() => moveStep(idx, 1)} sx={{ p: 0.25 }}>
                  <DownIcon sx={{ fontSize: 16 }} />
                </IconButton>
                <IconButton size="small" onClick={() => removeStep(idx)}
                  sx={{ p: 0.25, color: 'text.disabled', '&:hover': { color: colors.error } }}
                  disabled={editingSteps.length <= 2}>
                  <CloseIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Stack>
            ))}
          </Stack>

          {/* Add new step */}
          <Stack direction="row" spacing={1}>
            <TextField fullWidth size="small" placeholder="e.g. Culture Fit, Panel Interview..."
              value={newStepLabel} onChange={e => setNewStepLabel(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addStep(); } }}
            />
            <Button variant="outlined" size="small" onClick={addStep} disabled={!newStepLabel.trim()}
              sx={{ minWidth: 'auto', px: 1.5 }}>
              <AddIcon sx={{ fontSize: 18 }} />
            </Button>
          </Stack>

          <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mt: 1.5 }}>
            Rejected and Withdrawn are always available as terminal statuses.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setStepsEditorOpen(false)} color="inherit">Cancel</Button>
          <Button variant="contained" onClick={saveSteps} disabled={editingSteps.length < 2}>
            Save Pipeline
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Snackbar ─────────────────────────────────────────────────────── */}
      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snackbar.severity} variant="filled" onClose={() => setSnackbar(s => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
