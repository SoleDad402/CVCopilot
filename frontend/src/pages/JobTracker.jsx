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
  Cancel as CancelIcon,
  AccessTime as TimeIcon,
  TrendingUp as TrendingIcon,
  Business as BusinessIcon,
  LocationOn as LocationIcon,
  AttachMoney as MoneyIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { NAVBAR_HEIGHT, colors } from '../theme';
import { jobTrackerService } from '../services/api';

// ── Status definitions ──────────────────────────────────────────────────────
const STATUSES = [
  { key: 'applied',          label: 'Applied',          color: '#3b82f6', icon: '📄' },
  { key: 'screening',        label: 'Screening',        color: '#8b5cf6', icon: '🔍' },
  { key: 'phone_interview',  label: 'Phone Interview',  color: '#6366f1', icon: '📞' },
  { key: 'video_interview',  label: 'Video Interview',  color: '#0ea5e9', icon: '🎥' },
  { key: 'technical',        label: 'Technical',        color: '#f59e0b', icon: '💻' },
  { key: 'onsite',           label: 'Onsite',           color: '#f97316', icon: '🏢' },
  { key: 'offer',            label: 'Offer',            color: '#10b981', icon: '🎉' },
  { key: 'accepted',         label: 'Accepted',         color: '#059669', icon: '✅' },
  { key: 'rejected',         label: 'Rejected',         color: '#ef4444', icon: '❌' },
  { key: 'withdrawn',        label: 'Withdrawn',        color: '#6b7280', icon: '🚫' },
];

const getStatus = (key) => STATUSES.find(s => s.key === key) || STATUSES[0];
const PIPELINE_STATUSES = STATUSES.filter(s => !['rejected', 'withdrawn'].includes(s.key));

// ── Custom stepper connector ────────────────────────────────────────────────
const ColoredConnector = styled(StepConnector)(({ theme }) => ({
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
    active: applications.filter(a => !['rejected', 'withdrawn', 'accepted'].includes(a.status)).length,
    interviews: applications.filter(a => ['phone_interview', 'video_interview', 'technical', 'onsite'].includes(a.status)).length,
    offers: applications.filter(a => ['offer', 'accepted'].includes(a.status)).length,
  };

  // ── Current step index for stepper ────────────────────────────────────
  const getStepIndex = (status) => {
    const idx = PIPELINE_STATUSES.findIndex(s => s.key === status);
    return idx >= 0 ? idx : 0;
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
            { label: 'Interviews', value: stats.interviews, icon: <TimeIcon />, color: colors.warning },
            { label: 'Offers', value: stats.offers, icon: <CheckIcon />, color: colors.success },
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
          <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap' }}>
            <Chip label="All" size="small" variant={filterStatus === 'all' ? 'filled' : 'outlined'}
              color={filterStatus === 'all' ? 'primary' : 'default'}
              onClick={() => setFilterStatus('all')} />
            {STATUSES.map(s => (
              <Chip key={s.key} label={s.label} size="small"
                variant={filterStatus === s.key ? 'filled' : 'outlined'}
                onClick={() => setFilterStatus(s.key)}
                sx={filterStatus === s.key ? { bgcolor: s.color, color: '#fff', '&:hover': { bgcolor: s.color } } : {}}
              />
            ))}
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
              const status = getStatus(app.status);
              const stepIndex = getStepIndex(app.status);
              const isTerminal = ['rejected', 'withdrawn'].includes(app.status);

              return (
                <Card key={app.id} onClick={() => openDetail(app.id)} sx={{
                  cursor: 'pointer', border: '1px solid', borderColor: colors.border,
                  borderLeft: `4px solid ${status.color}`,
                  '&:hover': { borderColor: alpha(status.color, 0.5), boxShadow: 3 },
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
                          <Chip label={status.label} size="small" sx={{
                            bgcolor: alpha(status.color, 0.1), color: status.color,
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

                      {/* Right: Mini Stepper */}
                      <Box sx={{ display: { xs: 'none', md: 'block' }, width: 420, flexShrink: 0 }}
                        onClick={e => e.stopPropagation()}>
                        {!isTerminal ? (
                          <Stepper activeStep={stepIndex} alternativeLabel connector={<ColoredConnector />}
                            sx={{ '& .MuiStepLabel-label': { fontSize: '0.6rem', mt: 0.5 } }}>
                            {PIPELINE_STATUSES.map((s) => (
                              <Step key={s.key} completed={PIPELINE_STATUSES.indexOf(s) <= stepIndex}>
                                <StepLabel
                                  StepIconProps={{
                                    sx: {
                                      fontSize: 18,
                                      color: PIPELINE_STATUSES.indexOf(s) <= stepIndex ? `${status.color} !important` : undefined,
                                      '&.Mui-active': { color: `${status.color} !important` },
                                      '&.Mui-completed': { color: `${status.color} !important` },
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
                            <Chip label={`${status.icon} ${status.label}`} sx={{
                              bgcolor: alpha(status.color, 0.1), color: status.color,
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
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select value={formData.status} label="Status"
                  onChange={e => setFormData(p => ({ ...p, status: e.target.value }))}>
                  {STATUSES.map(s => (
                    <MenuItem key={s.key} value={s.key}>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: s.color }} />
                        <span>{s.label}</span>
                      </Stack>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
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
          const status = getStatus(selectedApp.status);
          const stepIndex = getStepIndex(selectedApp.status);
          const isTerminal = ['rejected', 'withdrawn'].includes(selectedApp.status);

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
                  <Stack direction="row" spacing={1} alignItems="center">
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
                {/* Stepper */}
                <Box sx={{ mb: 3, mt: 1 }}>
                  {!isTerminal ? (
                    <Stepper activeStep={stepIndex} alternativeLabel connector={<ColoredConnector />}>
                      {PIPELINE_STATUSES.map((s) => (
                        <Step key={s.key} completed={PIPELINE_STATUSES.indexOf(s) <= stepIndex}>
                          <StepLabel
                            StepIconProps={{
                              sx: {
                                fontSize: 22,
                                color: PIPELINE_STATUSES.indexOf(s) <= stepIndex ? `${status.color} !important` : undefined,
                                '&.Mui-active': { color: `${status.color} !important` },
                                '&.Mui-completed': { color: `${status.color} !important` },
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
                      <Chip label={`${status.icon} ${status.label}`} sx={{
                        bgcolor: alpha(status.color, 0.1), color: status.color,
                        fontWeight: 600, fontSize: '0.9rem', px: 2, height: 32,
                      }} />
                    </Box>
                  )}
                </Box>

                {/* Quick status update */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Update Status</Typography>
                  <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', gap: 0.75 }}>
                    {STATUSES.map(s => (
                      <Chip key={s.key} label={`${s.icon} ${s.label}`} size="small"
                        variant={selectedApp.status === s.key ? 'filled' : 'outlined'}
                        onClick={() => handleStatusChange(selectedApp.id, s.key)}
                        sx={selectedApp.status === s.key
                          ? { bgcolor: s.color, color: '#fff', fontWeight: 600, '&:hover': { bgcolor: s.color } }
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
                  {events.map((event, idx) => (
                    <Stack key={event.id} direction="row" spacing={1.5} sx={{ pb: 2, position: 'relative' }}>
                      {/* Timeline line */}
                      {idx < events.length - 1 && (
                        <Box sx={{
                          position: 'absolute', left: 14, top: 28, bottom: 0,
                          width: 2, bgcolor: colors.border,
                        }} />
                      )}
                      {/* Dot */}
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
                      {/* Content */}
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
                        {event.event_type === 'status_change' && event.from_status && event.to_status && (
                          <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>
                            <Chip label={getStatus(event.from_status).label} size="small"
                              sx={{ height: 20, fontSize: '0.65rem', bgcolor: alpha(getStatus(event.from_status).color, 0.1), color: getStatus(event.from_status).color }} />
                            <Typography variant="caption" sx={{ color: 'text.disabled', lineHeight: '20px' }}>→</Typography>
                            <Chip label={getStatus(event.to_status).label} size="small"
                              sx={{ height: 20, fontSize: '0.65rem', bgcolor: alpha(getStatus(event.to_status).color, 0.1), color: getStatus(event.to_status).color }} />
                          </Stack>
                        )}
                      </Box>
                    </Stack>
                  ))}

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
