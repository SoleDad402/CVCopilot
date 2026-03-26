import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TablePagination,
  Tabs,
  Tab,
  TextField,
  Stack,
  Chip,
  Avatar,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Switch,
  FormControlLabel,
  Skeleton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  InputAdornment,
  Snackbar,
  Collapse,
  Divider,
  LinearProgress,
  Grid
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  People as PeopleIcon,
  Assessment as AssessmentIcon,
  Description as DocIcon,
  PictureAsPdf as PdfIcon,
  TrendingUp as TrendingUpIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  AdminPanelSettings as AdminIcon,
  Business as BusinessIcon,
  CalendarToday as CalendarIcon,
  KeyboardArrowDown as ChevronDownIcon,
  KeyboardArrowUp as ChevronUpIcon,
  Save as SaveIcon,
  BarChart as BarChartIcon,
  PersonSearch as PersonSearchIcon,
  Insights as InsightsIcon,
  Work as WorkIcon,
  Speed as SpeedIcon,
  EmojiEvents as TrophyIcon,
  Today as TodayIcon,
  DateRange as DateRangeIcon,
  Visibility as ViewIcon,
  ArrowBack as BackIcon,
  ContentCopy as CopyIcon
} from '@mui/icons-material';
import dayjs from 'dayjs';
import { profileService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { NAVBAR_HEIGHT, colors, gradients } from '../theme';

// ── Helpers ─────────────────────────────────────────────────────────────────

const ACCENT_COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#ec4899', '#14b8a6'];
const accentColor = (name = '') => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return ACCENT_COLORS[Math.abs(hash) % ACCENT_COLORS.length];
};

function descendingComparator(a, b, orderBy) {
  const valA = a[orderBy] ?? '';
  const valB = b[orderBy] ?? '';
  if (valB < valA) return -1;
  if (valB > valA) return 1;
  return 0;
}
function getComparator(order, orderBy) {
  return order === 'desc'
    ? (a, b) => descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy);
}
function stableSort(array, comparator) {
  const stabilized = array.map((el, index) => [el, index]);
  stabilized.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) return order;
    return a[1] - b[1];
  });
  return stabilized.map((el) => el[0]);
}

const formatShortDate = (s) => {
  if (!s) return '-';
  const d = new Date(s + 'T00:00:00');
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// ═══════════════════════════════════════════════════════════════════════════
//   REUSABLE UI COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

// ── Stat Card ───────────────────────────────────────────────────────────────
function StatCard({ label, value, sublabel, icon, color, loading, small }) {
  return (
    <Box sx={{
      bgcolor: '#fff', border: '1px solid', borderColor: 'divider', borderRadius: 2,
      p: small ? 1.5 : 2, flex: 1, minWidth: small ? 100 : 140,
    }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {label}
          </Typography>
          {loading ? <Skeleton width={48} height={32} /> : (
            <Typography variant={small ? 'h6' : 'h5'} sx={{ fontWeight: 800, color: colors.dark, mt: 0.25 }}>
              {typeof value === 'number' ? value.toLocaleString() : value}
            </Typography>
          )}
          {sublabel && !loading && (
            <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.625rem' }}>{sublabel}</Typography>
          )}
        </Box>
        <Avatar sx={{ width: small ? 28 : 36, height: small ? 28 : 36, bgcolor: alpha(color, 0.1), color, borderRadius: 1.5 }}>
          {icon}
        </Avatar>
      </Stack>
    </Box>
  );
}

// ── Mini Bar Chart (CSS-only) ───────────────────────────────────────────────
function MiniBarChart({ data, valueKey, labelKey, color, height = 100, showLabels = true }) {
  const maxVal = Math.max(...data.map(d => d[valueKey] || 0), 1);
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height, width: '100%' }}>
      {data.map((d, i) => {
        const val = d[valueKey] || 0;
        const barH = val > 0 ? Math.max((val / maxVal) * 100, 3) : 0;
        return (
          <Tooltip key={i} title={`${d[labelKey] || ''}: ${val}`} arrow placement="top">
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
              <Box sx={{
                width: '100%', maxWidth: 24, borderRadius: '3px 3px 0 0',
                height: `${barH}%`, minHeight: val > 0 ? 2 : 0,
                bgcolor: val > 0 ? color : 'transparent',
                transition: 'height 0.3s ease',
                '&:hover': { bgcolor: alpha(color, 0.7) },
              }} />
              {showLabels && (
                <Typography variant="caption" sx={{ fontSize: '0.5rem', color: 'text.disabled', mt: 0.25, lineHeight: 1 }}>
                  {(d[labelKey] || '').slice(5)}
                </Typography>
              )}
            </Box>
          </Tooltip>
        );
      })}
    </Box>
  );
}

// ── Horizontal Bar List ─────────────────────────────────────────────────────
function HorizontalBarList({ items, maxItems = 10, color }) {
  const maxVal = items.length > 0 ? items[0].count : 1;
  return (
    <Stack spacing={0.75}>
      {items.slice(0, maxItems).map((item, i) => (
        <Stack key={i} direction="row" spacing={1} alignItems="center">
          <Typography variant="caption" sx={{ width: 18, textAlign: 'right', color: 'text.disabled', fontSize: '0.625rem', fontWeight: 700 }}>
            {i + 1}
          </Typography>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.25 }}>
              <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.75rem', color: colors.dark }} noWrap>
                {item.name}
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.6875rem', color, flexShrink: 0, ml: 1 }}>
                {item.count}
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={(item.count / maxVal) * 100}
              sx={{ height: 4, borderRadius: 2, bgcolor: alpha(color, 0.08), '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 2 } }}
            />
          </Box>
        </Stack>
      ))}
      {items.length === 0 && (
        <Typography variant="caption" color="text.disabled" sx={{ textAlign: 'center', py: 2 }}>No data</Typography>
      )}
    </Stack>
  );
}

// ── Section Card ────────────────────────────────────────────────────────────
function SectionCard({ title, subtitle, icon, children, action, sx }) {
  return (
    <Box sx={{ bgcolor: '#fff', border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden', ...sx }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 2, pt: 1.5, pb: 1 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          {icon && <Box sx={{ color: 'text.secondary', display: 'flex' }}>{icon}</Box>}
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.8125rem', color: colors.dark }}>{title}</Typography>
            {subtitle && <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.625rem' }}>{subtitle}</Typography>}
          </Box>
        </Stack>
        {action}
      </Stack>
      <Box sx={{ px: 2, pb: 2 }}>{children}</Box>
    </Box>
  );
}

// ── Sortable Table Header ───────────────────────────────────────────────────
function SortableTableHead({ headCells, order, orderBy, onRequestSort }) {
  return (
    <TableHead>
      <TableRow>
        {headCells.map((headCell) => (
          <TableCell
            key={headCell.id}
            align={headCell.numeric ? 'right' : 'left'}
            sortDirection={orderBy === headCell.id ? order : false}
            sx={{ fontWeight: 700, fontSize: '0.6875rem', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap', py: 1 }}
          >
            {headCell.sortable === false ? headCell.label : (
              <TableSortLabel
                active={orderBy === headCell.id}
                direction={orderBy === headCell.id ? order : 'asc'}
                onClick={(e) => onRequestSort(e, headCell.id)}
              >
                {headCell.label}
              </TableSortLabel>
            )}
          </TableCell>
        ))}
      </TableRow>
    </TableHead>
  );
}

// ── Day-of-Week Chart ───────────────────────────────────────────────────────
function DayOfWeekChart({ data }) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const maxVal = Math.max(...days.map(d => data[d] || 0), 1);
  return (
    <Stack direction="row" spacing={0.5} alignItems="flex-end" sx={{ height: 80 }}>
      {days.map(day => {
        const val = data[day] || 0;
        const barH = val > 0 ? Math.max((val / maxVal) * 100, 5) : 0;
        const isWeekend = day === 'Sat' || day === 'Sun';
        return (
          <Tooltip key={day} title={`${day}: ${val} generations`} arrow>
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
              <Box sx={{
                width: '100%', maxWidth: 28, borderRadius: '4px 4px 0 0',
                height: `${barH}%`, minHeight: val > 0 ? 3 : 0,
                bgcolor: isWeekend ? alpha(colors.primary, 0.3) : colors.primary,
                transition: 'height 0.3s ease',
              }} />
              <Typography variant="caption" sx={{ fontSize: '0.5625rem', color: isWeekend ? 'text.disabled' : 'text.secondary', mt: 0.5, fontWeight: 600 }}>
                {day}
              </Typography>
            </Box>
          </Tooltip>
        );
      })}
    </Stack>
  );
}

// ── Model Distribution Pills ────────────────────────────────────────────────
function ModelDistribution({ data }) {
  const total = Object.values(data).reduce((s, v) => s + v, 0) || 1;
  const modelColors = {
    'gpt-4o': '#6366f1', 'gpt-4o-mini': '#0ea5e9', 'gpt-4-turbo': '#10b981',
    'gpt-4': '#f59e0b', 'gpt-3.5-turbo': '#ef4444',
  };
  return (
    <Stack spacing={1}>
      {/* Stacked bar */}
      <Stack direction="row" sx={{ height: 8, borderRadius: 4, overflow: 'hidden', bgcolor: '#f1f5f9' }}>
        {Object.entries(data).map(([model, count]) => (
          <Tooltip key={model} title={`${model}: ${count} users (${Math.round((count / total) * 100)}%)`} arrow>
            <Box sx={{ width: `${(count / total) * 100}%`, bgcolor: modelColors[model] || '#94a3b8', minWidth: count > 0 ? 3 : 0 }} />
          </Tooltip>
        ))}
      </Stack>
      {/* Legend */}
      <Stack direction="row" flexWrap="wrap" gap={0.75}>
        {Object.entries(data).map(([model, count]) => (
          <Chip
            key={model}
            label={`${model} (${count})`}
            size="small"
            sx={{
              height: 20, fontSize: '0.5625rem', fontWeight: 600,
              bgcolor: alpha(modelColors[model] || '#94a3b8', 0.1),
              color: modelColors[model] || '#94a3b8',
            }}
          />
        ))}
      </Stack>
    </Stack>
  );
}

// ── Edit User Dialog ────────────────────────────────────────────────────────
function EditUserDialog({ open, user, onClose, onSave }) {
  const [formData, setFormData] = useState({});
  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || '', email: user.email || '',
        phone: user.phone || '', location: user.location || '',
        openai_model: user.openai_model || 'gpt-4o', max_tokens: user.max_tokens || 30000,
        daily_generation_limit: user.daily_generation_limit || 150, is_admin: user.is_admin || false,
      });
    }
  }, [user]);
  if (!user) return null;
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Edit User</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="Full Name" fullWidth value={formData.full_name} onChange={(e) => setFormData(p => ({ ...p, full_name: e.target.value }))} size="small" />
          <TextField label="Email" fullWidth value={formData.email} onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))} size="small" />
          <Stack direction="row" spacing={2}>
            <TextField label="Phone" fullWidth value={formData.phone} onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))} size="small" />
            <TextField label="Location" fullWidth value={formData.location} onChange={(e) => setFormData(p => ({ ...p, location: e.target.value }))} size="small" />
          </Stack>
          <Stack direction="row" spacing={2}>
            <FormControl fullWidth size="small">
              <InputLabel>OpenAI Model</InputLabel>
              <Select value={formData.openai_model} onChange={(e) => setFormData(p => ({ ...p, openai_model: e.target.value }))} label="OpenAI Model">
                {['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'].map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField label="Max Tokens" fullWidth type="number" value={formData.max_tokens} onChange={(e) => setFormData(p => ({ ...p, max_tokens: e.target.value }))} size="small" />
          </Stack>
          <TextField label="Daily Generation Limit" fullWidth type="number" value={formData.daily_generation_limit} onChange={(e) => setFormData(p => ({ ...p, daily_generation_limit: e.target.value }))} size="small" />
          <FormControlLabel
            control={<Switch checked={formData.is_admin || false} onChange={(e) => setFormData(p => ({ ...p, is_admin: e.target.checked }))} color="primary" />}
            label="Admin Access"
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} variant="outlined" color="inherit">Cancel</Button>
        <Button onClick={() => onSave(user.id, formData)} variant="contained" startIcon={<SaveIcon sx={{ fontSize: 16 }} />}>Save</Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Delete Confirm Dialog ───────────────────────────────────────────────────
function DeleteConfirmDialog({ open, user, onClose, onConfirm }) {
  if (!user) return null;
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 700, color: 'error.main' }}>Delete User</DialogTitle>
      <DialogContent>
        <Typography variant="body2">
          Are you sure you want to delete <strong>{user.full_name || user.email}</strong>? This action cannot be undone.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} variant="outlined" color="inherit">Cancel</Button>
        <Button onClick={() => onConfirm(user.id)} variant="contained" color="error" startIcon={<DeleteIcon sx={{ fontSize: 16 }} />}>Delete</Button>
      </DialogActions>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//   USER ACTIVITY DETAIL PANEL
// ═══════════════════════════════════════════════════════════════════════════

function UserActivityPanel({ userId, onBack }) {
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const { data } = await profileService.getUserActivity(userId);
        setActivity(data);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load user activity.');
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  if (loading) return (
    <Box sx={{ p: 4, textAlign: 'center' }}>
      <CircularProgress size={28} />
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Loading user activity...</Typography>
    </Box>
  );

  if (error) return <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>;
  if (!activity) return null;

  const { user, totalGenerations, totalRequests, generationHistory, requests, companyBreakdown } = activity;
  const uColor = accentColor(user.email);

  return (
    <Box sx={{ p: 2 }}>
      {/* Back button + user header */}
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
        <IconButton onClick={onBack} size="small"><BackIcon sx={{ fontSize: 18 }} /></IconButton>
        <Avatar sx={{ width: 40, height: 40, fontWeight: 700, bgcolor: alpha(uColor, 0.12), color: uColor, borderRadius: 1.5 }}>
          {(user.full_name || user.email || '?')[0].toUpperCase()}
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>{user.full_name || 'No Name'}</Typography>
          <Typography variant="caption" color="text.secondary">{user.email}</Typography>
        </Box>
        <Stack direction="row" spacing={0.5}>
          {user.is_admin && <Chip label="Admin" size="small" color="primary" sx={{ height: 20, fontSize: '0.5625rem', fontWeight: 700 }} />}
          <Chip label={user.openai_model} size="small" sx={{ height: 20, fontSize: '0.5625rem', fontWeight: 600 }} />
        </Stack>
      </Stack>

      {/* Stats row */}
      <Stack direction="row" spacing={1.5} sx={{ mb: 2 }}>
        <StatCard small label="Total Generations" value={totalGenerations} icon={<AssessmentIcon sx={{ fontSize: 16 }} />} color={colors.primary} />
        <StatCard small label="Resume Requests" value={totalRequests} icon={<DocIcon sx={{ fontSize: 16 }} />} color={colors.info} />
        <StatCard small label="Companies Targeted" value={companyBreakdown.length} icon={<BusinessIcon sx={{ fontSize: 16 }} />} color={colors.success} />
        <StatCard small label="Daily Limit" value={user.daily_generation_limit} icon={<SpeedIcon sx={{ fontSize: 16 }} />} color={colors.warning} />
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        {/* Left: Generation history */}
        <Box sx={{ flex: 1 }}>
          <SectionCard title="Generation History" subtitle={`${generationHistory.length} days recorded`} icon={<BarChartIcon sx={{ fontSize: 16 }} />}>
            {generationHistory.length > 0 ? (
              <MiniBarChart data={generationHistory.slice(0, 30)} valueKey="count" labelKey="date" color={colors.primary} height={80} showLabels={false} />
            ) : (
              <Typography variant="caption" color="text.disabled">No generation history</Typography>
            )}
            {generationHistory.length > 0 && (
              <Box sx={{ mt: 1.5, maxHeight: 200, overflow: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ py: 0.5, fontSize: '0.625rem', fontWeight: 700 }}>Date</TableCell>
                      <TableCell align="right" sx={{ py: 0.5, fontSize: '0.625rem', fontWeight: 700 }}>Count</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {generationHistory.map(g => (
                      <TableRow key={g.date} sx={{ '&:last-child td': { border: 0 } }}>
                        <TableCell sx={{ py: 0.5, fontSize: '0.75rem' }}>{g.date}</TableCell>
                        <TableCell align="right" sx={{ py: 0.5, fontSize: '0.75rem', fontWeight: 700, color: colors.primary }}>{g.count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}
          </SectionCard>
        </Box>

        {/* Right: Companies + Recent requests */}
        <Box sx={{ flex: 1 }}>
          <SectionCard title="Top Companies" icon={<BusinessIcon sx={{ fontSize: 16 }} />} sx={{ mb: 2 }}>
            <HorizontalBarList items={companyBreakdown} maxItems={8} color={uColor} />
          </SectionCard>

          <SectionCard title="Recent Requests" subtitle={`${requests.length} total`} icon={<DocIcon sx={{ fontSize: 16 }} />}>
            {requests.length > 0 ? (
              <Box sx={{ maxHeight: 250, overflow: 'auto' }}>
                <Stack spacing={0.75}>
                  {requests.slice(0, 20).map(r => (
                    <Stack key={r.id} direction="row" spacing={1} alignItems="center" sx={{ py: 0.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                      <Avatar sx={{ width: 20, height: 20, fontSize: '0.5rem', fontWeight: 700, bgcolor: alpha(accentColor(r.company_name), 0.1), color: accentColor(r.company_name), borderRadius: 0.5 }}>
                        {(r.company_name || '?')[0]}
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.6875rem' }} noWrap>{r.company_name || 'Unknown'}</Typography>
                        {r.role && <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.5625rem', ml: 0.5 }}>{r.role}</Typography>}
                      </Box>
                      <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.5625rem', flexShrink: 0 }}>{r.created_at}</Typography>
                      {r.docx_url && <Chip label="DOCX" size="small" sx={{ height: 14, fontSize: '0.5rem', cursor: 'pointer', bgcolor: alpha('#1976d2', 0.08), color: '#1976d2' }} onClick={() => window.open(r.docx_url, '_blank')} />}
                      {r.pdf_url && <Chip label="PDF" size="small" sx={{ height: 14, fontSize: '0.5rem', cursor: 'pointer', bgcolor: alpha('#d32f2f', 0.08), color: '#d32f2f' }} onClick={() => window.open(r.pdf_url, '_blank')} />}
                    </Stack>
                  ))}
                </Stack>
              </Box>
            ) : (
              <Typography variant="caption" color="text.disabled">No requests</Typography>
            )}
          </SectionCard>
        </Box>
      </Stack>

      {/* User details */}
      <Box sx={{ mt: 2 }}>
        <SectionCard title="User Details" icon={<PeopleIcon sx={{ fontSize: 16 }} />}>
          <Stack direction="row" flexWrap="wrap" gap={2}>
            {[
              { label: 'Location', value: user.location },
              { label: 'Model', value: user.openai_model },
              { label: 'Max Tokens', value: user.max_tokens },
              { label: 'Daily Limit', value: user.daily_generation_limit },
              { label: 'Joined', value: user.created_at },
            ].map(item => (
              <Box key={item.label} sx={{ minWidth: 120 }}>
                <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.5625rem', fontWeight: 600, textTransform: 'uppercase' }}>{item.label}</Typography>
                <Typography variant="body2" sx={{ fontSize: '0.8125rem', fontWeight: 600 }}>{item.value || '-'}</Typography>
              </Box>
            ))}
          </Stack>
        </SectionCard>
      </Box>
    </Box>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//   MAIN ADMIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function Admin() {
  const { user: currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedTab, setSelectedTab] = useState(0);

  // Data
  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [allDailyGenerations, setAllDailyGenerations] = useState([]);
  const [allRequests, setAllRequests] = useState([]);

  // Users tab
  const [userSearch, setUserSearch] = useState('');
  const [userOrder, setUserOrder] = useState('desc');
  const [userOrderBy, setUserOrderBy] = useState('total_generations');
  const [userPage, setUserPage] = useState(0);
  const [userRowsPerPage, setUserRowsPerPage] = useState(10);
  const [editUser, setEditUser] = useState(null);
  const [deleteUserTarget, setDeleteUserTarget] = useState(null);

  // Activity tab
  const [selectedUserId, setSelectedUserId] = useState(null);

  // Generations tab
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [genOrder, setGenOrder] = useState('desc');
  const [genOrderBy, setGenOrderBy] = useState('count');
  const [genPage, setGenPage] = useState(0);
  const [genRowsPerPage, setGenRowsPerPage] = useState(10);
  const [genDateRange, setGenDateRange] = useState('today'); // today, week, month, all

  // Requests tab
  const [reqSearch, setReqSearch] = useState('');
  const [reqOrder, setReqOrder] = useState('desc');
  const [reqOrderBy, setReqOrderBy] = useState('created_at');
  const [reqPage, setReqPage] = useState(0);
  const [reqRowsPerPage, setReqRowsPerPage] = useState(10);
  const [expandedJd, setExpandedJd] = useState(null);

  // ── Data fetching ──
  const fetchAllData = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const [statsRes, usersRes, gensRes, reqsRes] = await Promise.all([
        profileService.getAdminStats(),
        profileService.getAllUsers(),
        profileService.getDailyGenerations(),
        profileService.getAllRequests(),
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data);
      setAllDailyGenerations(gensRes.data);
      setAllRequests(reqsRes.data);
    } catch (err) {
      if (err.response?.status === 403) {
        setError('You do not have admin access.');
      } else {
        setError(err.response?.data?.error || 'Failed to fetch admin data.');
      }
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => { fetchAllData(); }, [fetchAllData]);

  // ── Handlers ──
  const handleSaveUser = async (userId, formData) => {
    try {
      await profileService.updateUser(userId, formData);
      setEditUser(null);
      setSuccess('User updated.');
      fetchAllData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update user.');
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      await profileService.deleteUser(userId);
      setDeleteUserTarget(null);
      setSuccess('User deleted.');
      fetchAllData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete user.');
    }
  };

  // ── Computed: Users ──
  const filteredUsers = useMemo(() => {
    if (!userSearch) return users;
    const q = userSearch.toLowerCase();
    return users.filter(u =>
      (u.email || '').toLowerCase().includes(q) ||
      (u.full_name || '').toLowerCase().includes(q) ||
      (u.location || '').toLowerCase().includes(q)
    );
  }, [users, userSearch]);

  const visibleUsers = useMemo(
    () => stableSort(filteredUsers, getComparator(userOrder, userOrderBy))
      .slice(userPage * userRowsPerPage, userPage * userRowsPerPage + userRowsPerPage),
    [filteredUsers, userOrder, userOrderBy, userPage, userRowsPerPage],
  );

  // ── Computed: Generations ──
  const filteredDailyGenerations = useMemo(() => {
    const now = dayjs();
    if (genDateRange === 'today') return allDailyGenerations.filter(g => g.generation_date === now.format('YYYY-MM-DD'));
    if (genDateRange === 'week') {
      const weekAgo = now.subtract(7, 'day').format('YYYY-MM-DD');
      return allDailyGenerations.filter(g => g.generation_date >= weekAgo);
    }
    if (genDateRange === 'month') {
      const monthAgo = now.subtract(30, 'day').format('YYYY-MM-DD');
      return allDailyGenerations.filter(g => g.generation_date >= monthAgo);
    }
    if (genDateRange === 'custom' && selectedDate) {
      return allDailyGenerations.filter(g => g.generation_date === selectedDate);
    }
    return allDailyGenerations;
  }, [allDailyGenerations, genDateRange, selectedDate]);

  const visibleDailyGenerations = useMemo(
    () => stableSort(filteredDailyGenerations, getComparator(genOrder, genOrderBy))
      .slice(genPage * genRowsPerPage, genPage * genRowsPerPage + genRowsPerPage),
    [filteredDailyGenerations, genOrder, genOrderBy, genPage, genRowsPerPage],
  );

  // Aggregated generation stats for the filtered period
  const genPeriodStats = useMemo(() => {
    let total = 0;
    const byUser = {};
    filteredDailyGenerations.forEach(g => {
      total += g.count;
      byUser[g.email] = (byUser[g.email] || 0) + g.count;
    });
    const topUser = Object.entries(byUser).sort((a, b) => b[1] - a[1])[0];
    return { total, uniqueUsers: Object.keys(byUser).length, topUser: topUser ? { email: topUser[0], count: topUser[1] } : null };
  }, [filteredDailyGenerations]);

  // ── Computed: Requests ──
  const filteredRequests = useMemo(() => {
    if (!reqSearch) return allRequests;
    const q = reqSearch.toLowerCase();
    return allRequests.filter(r =>
      (r.email || '').toLowerCase().includes(q) ||
      (r.company_name || '').toLowerCase().includes(q) ||
      (r.role || '').toLowerCase().includes(q)
    );
  }, [allRequests, reqSearch]);

  const visibleRequests = useMemo(
    () => stableSort(filteredRequests, getComparator(reqOrder, reqOrderBy))
      .slice(reqPage * reqRowsPerPage, reqPage * reqRowsPerPage + reqRowsPerPage),
    [filteredRequests, reqOrder, reqOrderBy, reqPage, reqRowsPerPage],
  );

  // ── Head cells ──
  const userHeadCells = [
    { id: 'email', label: 'Email' },
    { id: 'full_name', label: 'Name' },
    { id: 'location', label: 'Location' },
    { id: 'openai_model', label: 'Model' },
    { id: 'daily_generation_limit', numeric: true, label: 'Daily Limit' },
    { id: 'total_generations', numeric: true, label: 'Total Gens' },
    { id: 'is_admin', label: 'Admin' },
    { id: 'actions', label: 'Actions', sortable: false },
  ];

  const genHeadCells = [
    { id: 'email', label: 'User' },
    { id: 'generation_date', label: 'Date' },
    { id: 'count', numeric: true, label: 'Count' },
  ];

  const reqHeadCells = [
    { id: 'email', label: 'User' },
    { id: 'company_name', label: 'Company' },
    { id: 'role', label: 'Role' },
    { id: 'created_at', label: 'Date' },
    { id: 'files', label: 'Files', sortable: false },
  ];

  // ── Render checks ──
  if (!currentUser) return null;

  if (error === 'You do not have admin access.') {
    return (
      <Box sx={{ bgcolor: colors.bg, minHeight: `calc(100vh - ${NAVBAR_HEIGHT}px)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Paper sx={{ p: 4, textAlign: 'center', maxWidth: 400, borderRadius: 3 }}>
          <AdminIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Access Denied</Typography>
          <Typography variant="body2" color="text.secondary">You don't have admin permissions.</Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: colors.bg, minHeight: `calc(100vh - ${NAVBAR_HEIGHT}px)` }}>
      {/* ── Dark header banner ── */}
      <Box sx={{ background: gradients.darkBanner, pt: 3.5, pb: 2.5, px: 3 }}>
        <Container maxWidth="xl" disableGutters>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.25 }}>
                <AdminIcon sx={{ fontSize: 22, color: 'rgba(255,255,255,0.7)' }} />
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
                  Admin Dashboard
                </Typography>
              </Stack>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.8125rem' }}>
                {loading ? '...' : `${stats.totalUsers || 0} users \u00b7 ${stats.totalGenerations || 0} generations \u00b7 ${stats.totalRequests || 0} requests`}
              </Typography>
            </Box>
            <Tooltip title="Refresh all data" arrow>
              <IconButton onClick={fetchAllData} sx={{ color: 'rgba(255,255,255,0.6)', '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.08)' } }}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ pt: 3, pb: 6 }}>
        {error && error !== 'You do not have admin access.' && (
          <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>{error}</Alert>
        )}

        {/* ══════════════════════════════════════════════════════════════
             TABS
           ══════════════════════════════════════════════════════════════ */}
        <Paper sx={{ borderRadius: 3, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: '#fafbfc' }}>
            <Tabs value={selectedTab} onChange={(e, v) => { setSelectedTab(v); setSelectedUserId(null); }} variant="scrollable" scrollButtons="auto" sx={{ px: 1 }}>
              <Tab icon={<InsightsIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Overview" sx={{ minHeight: 48 }} />
              <Tab icon={<PeopleIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Users" sx={{ minHeight: 48 }} />
              <Tab icon={<PersonSearchIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="User Activity" sx={{ minHeight: 48 }} />
              <Tab icon={<AssessmentIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Generations" sx={{ minHeight: 48 }} />
              <Tab icon={<BusinessIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Insights" sx={{ minHeight: 48 }} />
              <Tab icon={<DocIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Requests" sx={{ minHeight: 48 }} />
            </Tabs>
          </Box>

          {/* ═══════════ TAB 0: OVERVIEW ═══════════ */}
          {selectedTab === 0 && (
            <Box sx={{ p: 2 }}>
              {/* Top stat cards */}
              <Stack direction="row" spacing={1.5} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
                <StatCard label="Total Users" value={stats.totalUsers} icon={<PeopleIcon sx={{ fontSize: 18 }} />} color={colors.primary} loading={loading} />
                <StatCard label="Active Users" value={stats.activeUsers} sublabel={`${stats.totalUsers > 0 ? Math.round((stats.activeUsers / stats.totalUsers) * 100) : 0}% of total`} icon={<TrendingUpIcon sx={{ fontSize: 18 }} />} color={colors.success} loading={loading} />
                <StatCard label="Today" value={stats.todayGenerations} icon={<TodayIcon sx={{ fontSize: 18 }} />} color={colors.warning} loading={loading} />
                <StatCard label="This Week" value={stats.weekRequests} icon={<DateRangeIcon sx={{ fontSize: 18 }} />} color="#8b5cf6" loading={loading} />
                <StatCard label="This Month" value={stats.monthRequests} icon={<CalendarIcon sx={{ fontSize: 18 }} />} color={colors.info} loading={loading} />
                <StatCard label="Avg / User" value={stats.avgGenerationsPerUser} icon={<SpeedIcon sx={{ fontSize: 18 }} />} color="#ec4899" loading={loading} />
              </Stack>

              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
                {/* Generation Trend (30 days) */}
                <SectionCard title="Generation Trend" subtitle="Last 30 days" icon={<BarChartIcon sx={{ fontSize: 16 }} />} sx={{ flex: 2 }}>
                  {loading ? <Skeleton height={100} /> : (
                    <MiniBarChart data={stats.generationTrend || []} valueKey="generations" labelKey="date" color={colors.primary} height={100} />
                  )}
                </SectionCard>

                {/* Request Trend (30 days) */}
                <SectionCard title="Request Trend" subtitle="Last 30 days" icon={<DocIcon sx={{ fontSize: 16 }} />} sx={{ flex: 2 }}>
                  {loading ? <Skeleton height={100} /> : (
                    <MiniBarChart data={stats.generationTrend || []} valueKey="requests" labelKey="date" color={colors.info} height={100} />
                  )}
                </SectionCard>

                {/* Day of Week */}
                <SectionCard title="Day of Week" subtitle="All time" icon={<CalendarIcon sx={{ fontSize: 16 }} />} sx={{ flex: 1 }}>
                  {loading ? <Skeleton height={80} /> : (
                    <DayOfWeekChart data={stats.dayOfWeekDist || {}} />
                  )}
                </SectionCard>
              </Stack>

              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
                {/* Top Users */}
                <SectionCard title="Top Users" subtitle="By generations" icon={<TrophyIcon sx={{ fontSize: 16 }} />} sx={{ flex: 1 }}>
                  {loading ? <Skeleton height={160} /> : (
                    <HorizontalBarList
                      items={(stats.topUsersByGenerations || []).map(u => ({ name: u.email, count: u.generations }))}
                      maxItems={8}
                      color={colors.primary}
                    />
                  )}
                </SectionCard>

                {/* Top Companies */}
                <SectionCard title="Top Companies" subtitle="Most targeted" icon={<BusinessIcon sx={{ fontSize: 16 }} />} sx={{ flex: 1 }}>
                  {loading ? <Skeleton height={160} /> : (
                    <HorizontalBarList items={stats.topCompanies || []} maxItems={8} color={colors.success} />
                  )}
                </SectionCard>

                {/* Top Roles */}
                <SectionCard title="Top Roles" subtitle="Most applied" icon={<WorkIcon sx={{ fontSize: 16 }} />} sx={{ flex: 1 }}>
                  {loading ? <Skeleton height={160} /> : (
                    <HorizontalBarList items={stats.topRoles || []} maxItems={8} color="#8b5cf6" />
                  )}
                </SectionCard>
              </Stack>

              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                {/* Model Distribution */}
                <SectionCard title="Model Distribution" subtitle="Across users" icon={<SpeedIcon sx={{ fontSize: 16 }} />} sx={{ flex: 1 }}>
                  {loading ? <Skeleton height={60} /> : (
                    <ModelDistribution data={stats.modelDistribution || {}} />
                  )}
                </SectionCard>

                {/* File Output */}
                <SectionCard title="File Output Rates" subtitle={`${stats.totalRequests || 0} total requests`} icon={<DocIcon sx={{ fontSize: 16 }} />} sx={{ flex: 1 }}>
                  {loading ? <Skeleton height={60} /> : (
                    <Stack spacing={1}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <DocIcon sx={{ fontSize: 14, color: colors.docx }} />
                          <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>DOCX</Typography>
                        </Stack>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: colors.docx }}>{stats.withDocx || 0} ({stats.docxRate || 0}%)</Typography>
                      </Stack>
                      <LinearProgress variant="determinate" value={stats.docxRate || 0} sx={{ height: 6, borderRadius: 3, bgcolor: alpha(colors.docx, 0.08), '& .MuiLinearProgress-bar': { bgcolor: colors.docx } }} />
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1 }}>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <PdfIcon sx={{ fontSize: 14, color: colors.pdf }} />
                          <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>PDF</Typography>
                        </Stack>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: colors.pdf }}>{stats.withPdf || 0} ({stats.pdfRate || 0}%)</Typography>
                      </Stack>
                      <LinearProgress variant="determinate" value={stats.pdfRate || 0} sx={{ height: 6, borderRadius: 3, bgcolor: alpha(colors.pdf, 0.08), '& .MuiLinearProgress-bar': { bgcolor: colors.pdf } }} />
                    </Stack>
                  )}
                </SectionCard>

                {/* User Registration Trend */}
                <SectionCard title="New Registrations" subtitle="Last 30 days" icon={<PeopleIcon sx={{ fontSize: 16 }} />} sx={{ flex: 1 }}>
                  {loading ? <Skeleton height={60} /> : (
                    <MiniBarChart data={stats.registrationTrend || []} valueKey="count" labelKey="date" color={colors.success} height={60} showLabels={false} />
                  )}
                </SectionCard>
              </Stack>
            </Box>
          )}

          {/* ═══════════ TAB 1: USERS ═══════════ */}
          {selectedTab === 1 && (
            <Box sx={{ p: 2 }}>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                <TextField
                  size="small" placeholder="Search users..."
                  value={userSearch} onChange={(e) => { setUserSearch(e.target.value); setUserPage(0); }}
                  InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 16, color: 'text.disabled' }} /></InputAdornment> }}
                  sx={{ width: 300 }}
                />
                <Box sx={{ flex: 1 }} />
                <Typography variant="caption" color="text.secondary">{filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}</Typography>
              </Stack>

              {loading ? (
                <Stack spacing={1}>{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} variant="rectangular" height={44} sx={{ borderRadius: 1 }} />)}</Stack>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <SortableTableHead headCells={userHeadCells} order={userOrder} orderBy={userOrderBy}
                      onRequestSort={(e, prop) => {
                        if (prop === 'actions') return;
                        setUserOrder(userOrderBy === prop && userOrder === 'asc' ? 'desc' : 'asc');
                        setUserOrderBy(prop);
                      }}
                    />
                    <TableBody>
                      {visibleUsers.map((row) => (
                        <TableRow hover key={row.id}>
                          <TableCell>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Avatar sx={{ width: 24, height: 24, fontSize: '0.625rem', fontWeight: 700, bgcolor: alpha(accentColor(row.email), 0.12), color: accentColor(row.email), borderRadius: 0.75 }}>
                                {(row.full_name || row.email || '?')[0].toUpperCase()}
                              </Avatar>
                              <Typography variant="body2" sx={{ fontSize: '0.8125rem' }}>{row.email}</Typography>
                            </Stack>
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.8125rem' }}>{row.full_name || '-'}</TableCell>
                          <TableCell sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>{row.location || '-'}</TableCell>
                          <TableCell><Chip label={row.openai_model || 'gpt-4o'} size="small" sx={{ height: 20, fontSize: '0.5625rem', fontWeight: 600 }} /></TableCell>
                          <TableCell align="right" sx={{ fontSize: '0.8125rem', fontWeight: 600 }}>{row.daily_generation_limit || 150}</TableCell>
                          <TableCell align="right" sx={{ fontSize: '0.8125rem', fontWeight: 700, color: colors.primary }}>{row.total_generations || 0}</TableCell>
                          <TableCell>
                            {(row.is_admin || row['Is Admin']) ? <Chip label="Admin" size="small" color="primary" sx={{ height: 20, fontSize: '0.5rem', fontWeight: 700 }} /> : <Typography variant="caption" color="text.disabled">-</Typography>}
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={0.5}>
                              <Tooltip title="View activity" arrow>
                                <IconButton size="small" onClick={() => { setSelectedUserId(row.id); setSelectedTab(2); }} sx={{ width: 26, height: 26 }}>
                                  <ViewIcon sx={{ fontSize: 14 }} />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Edit" arrow>
                                <IconButton size="small" onClick={() => setEditUser(row)} sx={{ width: 26, height: 26 }}>
                                  <EditIcon sx={{ fontSize: 14 }} />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete" arrow>
                                <IconButton size="small" onClick={() => setDeleteUserTarget(row)} sx={{ width: 26, height: 26, color: 'error.main' }}>
                                  <DeleteIcon sx={{ fontSize: 14 }} />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))}
                      {visibleUsers.length === 0 && (
                        <TableRow><TableCell colSpan={8} sx={{ textAlign: 'center', py: 4 }}><Typography variant="body2" color="text.secondary">No users found.</Typography></TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                  <TablePagination rowsPerPageOptions={[5, 10, 25, 50]} component="div" count={filteredUsers.length} rowsPerPage={userRowsPerPage} page={userPage}
                    onPageChange={(e, p) => setUserPage(p)} onRowsPerPageChange={(e) => { setUserRowsPerPage(parseInt(e.target.value, 10)); setUserPage(0); }} />
                </TableContainer>
              )}
            </Box>
          )}

          {/* ═══════════ TAB 2: USER ACTIVITY ═══════════ */}
          {selectedTab === 2 && (
            selectedUserId ? (
              <UserActivityPanel userId={selectedUserId} onBack={() => setSelectedUserId(null)} />
            ) : (
              <Box sx={{ p: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>Select a user to view detailed activity</Typography>
                <Stack spacing={0.5}>
                  {users.map(u => {
                    const c = accentColor(u.email);
                    return (
                      <Box
                        key={u.id}
                        onClick={() => setSelectedUserId(u.id)}
                        sx={{
                          display: 'flex', alignItems: 'center', gap: 1.5, p: 1.25, borderRadius: 2, cursor: 'pointer',
                          border: '1px solid', borderColor: 'divider',
                          transition: 'all 0.15s', '&:hover': { borderColor: c, bgcolor: alpha(c, 0.02), boxShadow: `0 2px 8px ${alpha(c, 0.08)}` },
                        }}
                      >
                        <Avatar sx={{ width: 32, height: 32, fontSize: '0.75rem', fontWeight: 700, bgcolor: alpha(c, 0.12), color: c, borderRadius: 1 }}>
                          {(u.full_name || u.email || '?')[0].toUpperCase()}
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8125rem' }} noWrap>{u.full_name || u.email}</Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6875rem' }}>{u.email}</Typography>
                        </Box>
                        <Chip label={`${u.total_generations || 0} gens`} size="small" sx={{ height: 20, fontSize: '0.5625rem', fontWeight: 600, bgcolor: alpha(c, 0.08), color: c }} />
                        <Chip label={u.openai_model || 'gpt-4o'} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.5625rem' }} />
                        {(u.is_admin || u['Is Admin']) && <Chip label="Admin" size="small" color="primary" sx={{ height: 20, fontSize: '0.5rem', fontWeight: 700 }} />}
                        <ViewIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                      </Box>
                    );
                  })}
                </Stack>
              </Box>
            )
          )}

          {/* ═══════════ TAB 3: GENERATIONS ═══════════ */}
          {selectedTab === 3 && (
            <Box sx={{ p: 2 }}>
              {/* Period stats */}
              <Stack direction="row" spacing={1.5} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
                <StatCard small label="Period Total" value={genPeriodStats.total} icon={<AssessmentIcon sx={{ fontSize: 16 }} />} color={colors.primary} loading={loading} />
                <StatCard small label="Unique Users" value={genPeriodStats.uniqueUsers} icon={<PeopleIcon sx={{ fontSize: 16 }} />} color={colors.success} loading={loading} />
                {genPeriodStats.topUser && (
                  <StatCard small label="Top User" value={genPeriodStats.topUser.count} sublabel={genPeriodStats.topUser.email} icon={<TrophyIcon sx={{ fontSize: 16 }} />} color={colors.warning} loading={loading} />
                )}
              </Stack>

              {/* Date range filter */}
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                {['today', 'week', 'month', 'all'].map(range => (
                  <Chip
                    key={range}
                    label={range === 'today' ? 'Today' : range === 'week' ? 'Last 7 days' : range === 'month' ? 'Last 30 days' : 'All time'}
                    size="small"
                    onClick={() => { setGenDateRange(range); setGenPage(0); }}
                    sx={{
                      fontWeight: 600, fontSize: '0.6875rem',
                      bgcolor: genDateRange === range ? colors.primary : 'transparent',
                      color: genDateRange === range ? '#fff' : 'text.secondary',
                      border: genDateRange === range ? 'none' : '1px solid',
                      borderColor: 'divider',
                      '&:hover': { bgcolor: genDateRange === range ? colors.primary : alpha(colors.primary, 0.04) },
                    }}
                  />
                ))}
                <Chip
                  label="Custom"
                  size="small"
                  onClick={() => setGenDateRange('custom')}
                  sx={{
                    fontWeight: 600, fontSize: '0.6875rem',
                    bgcolor: genDateRange === 'custom' ? colors.primary : 'transparent',
                    color: genDateRange === 'custom' ? '#fff' : 'text.secondary',
                    border: genDateRange === 'custom' ? 'none' : '1px solid', borderColor: 'divider',
                  }}
                />
                {genDateRange === 'custom' && (
                  <TextField type="date" size="small" value={selectedDate} onChange={(e) => { setSelectedDate(e.target.value); setGenPage(0); }}
                    InputLabelProps={{ shrink: true }} sx={{ width: 170 }} />
                )}
                <Box sx={{ flex: 1 }} />
                <Typography variant="caption" color="text.secondary">{filteredDailyGenerations.length} records</Typography>
              </Stack>

              {loading ? (
                <Stack spacing={1}>{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} variant="rectangular" height={44} sx={{ borderRadius: 1 }} />)}</Stack>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <SortableTableHead headCells={genHeadCells} order={genOrder} orderBy={genOrderBy}
                      onRequestSort={(e, prop) => {
                        setGenOrder(genOrderBy === prop && genOrder === 'asc' ? 'desc' : 'asc');
                        setGenOrderBy(prop);
                      }}
                    />
                    <TableBody>
                      {visibleDailyGenerations.map((row) => (
                        <TableRow hover key={`${row.user_id}-${row.generation_date}`}>
                          <TableCell sx={{ fontSize: '0.8125rem' }}>{row.email}</TableCell>
                          <TableCell>
                            <Chip icon={<CalendarIcon sx={{ fontSize: 10 }} />} label={row.generation_date} size="small" variant="outlined" sx={{ height: 22, fontSize: '0.6875rem' }} />
                          </TableCell>
                          <TableCell align="right">
                            <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', color: colors.primary }}>{row.count}</Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                      {visibleDailyGenerations.length === 0 && (
                        <TableRow><TableCell colSpan={3} sx={{ textAlign: 'center', py: 4 }}><Typography variant="body2" color="text.secondary">No generation data for this period.</Typography></TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                  <TablePagination rowsPerPageOptions={[5, 10, 25, 50]} component="div" count={filteredDailyGenerations.length} rowsPerPage={genRowsPerPage} page={genPage}
                    onPageChange={(e, p) => setGenPage(p)} onRowsPerPageChange={(e) => { setGenRowsPerPage(parseInt(e.target.value, 10)); setGenPage(0); }} />
                </TableContainer>
              )}
            </Box>
          )}

          {/* ═══════════ TAB 4: INSIGHTS (Company & Role) ═══════════ */}
          {selectedTab === 4 && (
            <Box sx={{ p: 2 }}>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
                {/* Top Companies - full */}
                <SectionCard title="Top Companies" subtitle={`${(stats.topCompanies || []).length} unique companies`} icon={<BusinessIcon sx={{ fontSize: 16 }} />} sx={{ flex: 1 }}>
                  {loading ? <Skeleton height={240} /> : (
                    <HorizontalBarList items={stats.topCompanies || []} maxItems={20} color={colors.success} />
                  )}
                </SectionCard>

                {/* Top Roles - full */}
                <SectionCard title="Top Roles" subtitle={`${(stats.topRoles || []).length} unique roles`} icon={<WorkIcon sx={{ fontSize: 16 }} />} sx={{ flex: 1 }}>
                  {loading ? <Skeleton height={240} /> : (
                    <HorizontalBarList items={stats.topRoles || []} maxItems={20} color="#8b5cf6" />
                  )}
                </SectionCard>
              </Stack>

              {/* Top Users detail table */}
              <SectionCard title="Top Users by Generations" subtitle="Cross-referenced with requests" icon={<TrophyIcon sx={{ fontSize: 16 }} />}>
                {loading ? <Skeleton height={200} /> : (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.6875rem', color: 'text.secondary', textTransform: 'uppercase', py: 1 }}>Rank</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.6875rem', color: 'text.secondary', textTransform: 'uppercase', py: 1 }}>User</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.6875rem', color: 'text.secondary', textTransform: 'uppercase', py: 1 }}>Name</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.6875rem', color: 'text.secondary', textTransform: 'uppercase', py: 1 }}>Generations</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.6875rem', color: 'text.secondary', textTransform: 'uppercase', py: 1 }}>Requests</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.6875rem', color: 'text.secondary', textTransform: 'uppercase', py: 1 }}>Activity</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(stats.topUsersByGenerations || []).map((u, i) => {
                          const c = accentColor(u.email);
                          const maxGen = (stats.topUsersByGenerations || [])[0]?.generations || 1;
                          return (
                            <TableRow key={u.userId} hover sx={{ cursor: 'pointer' }} onClick={() => { setSelectedUserId(u.userId); setSelectedTab(2); }}>
                              <TableCell sx={{ py: 0.75 }}>
                                <Avatar sx={{ width: 22, height: 22, fontSize: '0.625rem', fontWeight: 800, bgcolor: i < 3 ? colors.warning : alpha(colors.primary, 0.08), color: i < 3 ? '#fff' : 'text.secondary', borderRadius: 0.75 }}>
                                  {i + 1}
                                </Avatar>
                              </TableCell>
                              <TableCell sx={{ py: 0.75 }}>
                                <Typography variant="body2" sx={{ fontSize: '0.8125rem' }}>{u.email}</Typography>
                              </TableCell>
                              <TableCell sx={{ py: 0.75, fontSize: '0.8125rem', color: 'text.secondary' }}>{u.full_name || '-'}</TableCell>
                              <TableCell align="right" sx={{ py: 0.75 }}>
                                <Typography sx={{ fontWeight: 700, fontSize: '0.8125rem', color: colors.primary }}>{u.generations}</Typography>
                              </TableCell>
                              <TableCell align="right" sx={{ py: 0.75, fontSize: '0.8125rem' }}>{u.requests}</TableCell>
                              <TableCell sx={{ py: 0.75, width: 150 }}>
                                <LinearProgress variant="determinate" value={(u.generations / maxGen) * 100}
                                  sx={{ height: 5, borderRadius: 2.5, bgcolor: alpha(c, 0.08), '& .MuiLinearProgress-bar': { bgcolor: c, borderRadius: 2.5 } }} />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </SectionCard>

              {/* Model + File output side by side */}
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mt: 2 }}>
                <SectionCard title="Model Distribution" icon={<SpeedIcon sx={{ fontSize: 16 }} />} sx={{ flex: 1 }}>
                  {loading ? <Skeleton height={60} /> : <ModelDistribution data={stats.modelDistribution || {}} />}
                </SectionCard>
                <SectionCard title="Day of Week Activity" icon={<CalendarIcon sx={{ fontSize: 16 }} />} sx={{ flex: 1 }}>
                  {loading ? <Skeleton height={80} /> : <DayOfWeekChart data={stats.dayOfWeekDist || {}} />}
                </SectionCard>
                <SectionCard title="File Output" icon={<DocIcon sx={{ fontSize: 16 }} />} sx={{ flex: 1 }}>
                  {loading ? <Skeleton height={60} /> : (
                    <Stack spacing={1.5}>
                      <Stack direction="row" spacing={1.5}>
                        <Chip icon={<DocIcon sx={{ fontSize: 12 }} />} label={`${stats.withDocx || 0} DOCX (${stats.docxRate || 0}%)`} size="small"
                          sx={{ bgcolor: alpha(colors.docx, 0.08), color: colors.docx, fontWeight: 600, fontSize: '0.6875rem' }} />
                        <Chip icon={<PdfIcon sx={{ fontSize: 12 }} />} label={`${stats.withPdf || 0} PDF (${stats.pdfRate || 0}%)`} size="small"
                          sx={{ bgcolor: alpha(colors.pdf, 0.08), color: colors.pdf, fontWeight: 600, fontSize: '0.6875rem' }} />
                      </Stack>
                      <Stack direction="row" sx={{ height: 8, borderRadius: 4, overflow: 'hidden', bgcolor: '#f1f5f9' }}>
                        <Box sx={{ width: `${stats.docxRate || 0}%`, bgcolor: colors.docx }} />
                        <Box sx={{ width: `${stats.pdfRate || 0}%`, bgcolor: colors.pdf }} />
                      </Stack>
                    </Stack>
                  )}
                </SectionCard>
              </Stack>
            </Box>
          )}

          {/* ═══════════ TAB 5: REQUESTS ═══════════ */}
          {selectedTab === 5 && (
            <Box sx={{ p: 2 }}>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                <TextField
                  size="small" placeholder="Search by user, company, or role..."
                  value={reqSearch} onChange={(e) => { setReqSearch(e.target.value); setReqPage(0); }}
                  InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 16, color: 'text.disabled' }} /></InputAdornment> }}
                  sx={{ width: 360 }}
                />
                <Box sx={{ flex: 1 }} />
                <Typography variant="caption" color="text.secondary">{filteredRequests.length} request{filteredRequests.length !== 1 ? 's' : ''}</Typography>
              </Stack>

              {loading ? (
                <Stack spacing={1}>{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} variant="rectangular" height={44} sx={{ borderRadius: 1 }} />)}</Stack>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <SortableTableHead headCells={reqHeadCells} order={reqOrder} orderBy={reqOrderBy}
                      onRequestSort={(e, prop) => {
                        if (prop === 'files') return;
                        setReqOrder(reqOrderBy === prop && reqOrder === 'asc' ? 'desc' : 'asc');
                        setReqOrderBy(prop);
                      }}
                    />
                    <TableBody>
                      {visibleRequests.map((row) => {
                        const c = accentColor(row.company_name);
                        return (
                          <React.Fragment key={row.id}>
                            <TableRow hover sx={{ cursor: row.job_description ? 'pointer' : 'default' }}
                              onClick={() => row.job_description && setExpandedJd(expandedJd === row.id ? null : row.id)}>
                              <TableCell sx={{ fontSize: '0.8125rem' }}>{row.email}</TableCell>
                              <TableCell>
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <Avatar sx={{ width: 22, height: 22, fontSize: '0.5625rem', fontWeight: 700, bgcolor: alpha(c, 0.1), color: c, borderRadius: 0.75 }}>
                                    {(row.company_name || '?')[0].toUpperCase()}
                                  </Avatar>
                                  <Typography variant="body2" sx={{ fontSize: '0.8125rem', fontWeight: 600 }}>{row.company_name || '-'}</Typography>
                                </Stack>
                              </TableCell>
                              <TableCell sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>{row.role || '-'}</TableCell>
                              <TableCell sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{row.created_at || '-'}</TableCell>
                              <TableCell>
                                <Stack direction="row" spacing={0.5} alignItems="center">
                                  {row.docx_url && <Chip icon={<DocIcon sx={{ fontSize: 10 }} />} label="DOCX" size="small"
                                    sx={{ height: 18, fontSize: '0.5rem', fontWeight: 600, bgcolor: alpha('#1976d2', 0.08), color: '#1976d2', cursor: 'pointer', '& .MuiChip-label': { px: 0.5 } }}
                                    onClick={(e) => { e.stopPropagation(); window.open(row.docx_url, '_blank'); }} />}
                                  {row.pdf_url && <Chip icon={<PdfIcon sx={{ fontSize: 10 }} />} label="PDF" size="small"
                                    sx={{ height: 18, fontSize: '0.5rem', fontWeight: 600, bgcolor: alpha('#d32f2f', 0.08), color: '#d32f2f', cursor: 'pointer', '& .MuiChip-label': { px: 0.5 } }}
                                    onClick={(e) => { e.stopPropagation(); window.open(row.pdf_url, '_blank'); }} />}
                                  {row.job_description && (
                                    <IconButton size="small" sx={{ width: 20, height: 20, color: expandedJd === row.id ? c : 'text.disabled' }}
                                      onClick={(e) => { e.stopPropagation(); setExpandedJd(expandedJd === row.id ? null : row.id); }}>
                                      {expandedJd === row.id ? <ChevronUpIcon sx={{ fontSize: 14 }} /> : <ChevronDownIcon sx={{ fontSize: 14 }} />}
                                    </IconButton>
                                  )}
                                </Stack>
                              </TableCell>
                            </TableRow>
                            {expandedJd === row.id && row.job_description && (
                              <TableRow>
                                <TableCell colSpan={5} sx={{ py: 0, border: 0 }}>
                                  <Collapse in>
                                    <Box sx={{ px: 2, py: 1.5, bgcolor: alpha(c, 0.02), borderLeft: `3px solid ${c}`, borderRadius: 1, my: 0.5 }}>
                                      <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.625rem', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', mb: 0.5 }}>
                                        Job Description
                                      </Typography>
                                      <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem', lineHeight: 1.6, whiteSpace: 'pre-wrap', display: 'block', maxHeight: 200, overflow: 'auto' }}>
                                        {row.job_description}
                                      </Typography>
                                    </Box>
                                  </Collapse>
                                </TableCell>
                              </TableRow>
                            )}
                          </React.Fragment>
                        );
                      })}
                      {visibleRequests.length === 0 && (
                        <TableRow><TableCell colSpan={5} sx={{ textAlign: 'center', py: 4 }}><Typography variant="body2" color="text.secondary">No requests found.</Typography></TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                  <TablePagination rowsPerPageOptions={[5, 10, 25, 50]} component="div" count={filteredRequests.length} rowsPerPage={reqRowsPerPage} page={reqPage}
                    onPageChange={(e, p) => setReqPage(p)} onRowsPerPageChange={(e) => { setReqRowsPerPage(parseInt(e.target.value, 10)); setReqPage(0); }} />
                </TableContainer>
              )}
            </Box>
          )}
        </Paper>
      </Container>

      {/* ── Dialogs ── */}
      <EditUserDialog open={Boolean(editUser)} user={editUser} onClose={() => setEditUser(null)} onSave={handleSaveUser} />
      <DeleteConfirmDialog open={Boolean(deleteUserTarget)} user={deleteUserTarget} onClose={() => setDeleteUserTarget(null)} onConfirm={handleDeleteUser} />

      <Snackbar open={!!success} autoHideDuration={4000} onClose={() => setSuccess('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setSuccess('')} severity="success" sx={{ width: '100%' }}>{success}</Alert>
      </Snackbar>
    </Box>
  );
}
