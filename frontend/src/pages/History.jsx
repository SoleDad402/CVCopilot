import { useEffect, useState, useMemo } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Chip,
  Stack,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Tooltip,
  Skeleton,
  Alert,
  Collapse,
  Avatar,
  LinearProgress
} from '@mui/material';
import {
  Description as DocIcon,
  PictureAsPdf as PdfIcon,
  Work as WorkIcon,
  CalendarToday as CalendarIcon,
  Search as SearchIcon,
  Add as AddIcon,
  KeyboardArrowDown as ChevronDownIcon,
  KeyboardArrowUp as ChevronUpIcon,
  Article as ArticleIcon,
  TrendingUp as TrendingUpIcon,
  Business as BusinessIcon
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import { NAVBAR_HEIGHT, colors, gradients } from '../theme';
import { historyService } from '../services/api';
import { useNavigate } from 'react-router-dom';

// ── Helpers ─────────────────────────────────────────────────────────────────

const parseLocalDate = (s) => {
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
};

const formatDate = (s) => {
  if (!s) return 'Undated';
  const date = parseLocalDate(s);
  if (!date) return 'Undated';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const d = new Date(date); d.setHours(0, 0, 0, 0);
  if (d.getTime() === today.getTime()) return 'Today';
  if (d.getTime() === yesterday.getTime()) return 'Yesterday';
  const diffDays = Math.floor((today - d) / 86400000);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatGroupDate = (s) => {
  if (!s) return 'Undated';
  const date = parseLocalDate(s);
  if (!date) return 'Undated';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const d = new Date(date); d.setHours(0, 0, 0, 0);
  if (d.getTime() === today.getTime()) return 'Today';
  if (d.getTime() === yesterday.getTime()) return 'Yesterday';
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
};

const ACCENT_COLORS = ['#6366f1','#0ea5e9','#10b981','#f59e0b','#8b5cf6','#ef4444','#ec4899','#14b8a6'];
const accentColor = (name = '') => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return ACCENT_COLORS[Math.abs(hash) % ACCENT_COLORS.length];
};

// ── Main Component ───────────────────────────────────────────────────────────

export default function History() {
  const navigate = useNavigate();
  const [grouped, setGrouped] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date-desc');

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const { data } = await historyService.getHistory();
        setGrouped(data.history || {});
      } catch (e) {
        setError(e?.response?.data?.error || e.message || 'Failed to load history');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Computed stats ──
  const stats = useMemo(() => {
    const all = Object.values(grouped).flat();
    const companies = new Set(all.map(i => i.company_name).filter(Boolean));

    // Count this week
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);
    const thisWeek = all.filter(i => {
      const d = parseLocalDate(i.created_at);
      return d && d >= weekAgo;
    }).length;

    // Top company
    const companyCount = {};
    all.forEach(i => { if (i.company_name) companyCount[i.company_name] = (companyCount[i.company_name] || 0) + 1; });
    const topCompany = Object.entries(companyCount).sort((a, b) => b[1] - a[1])[0];

    return {
      total: all.length,
      companies: companies.size,
      thisWeek,
      withDocx: all.filter(i => i.docx_url).length,
      withPdf: all.filter(i => i.pdf_url).length,
      topCompany: topCompany ? { name: topCompany[0], count: topCompany[1] } : null,
    };
  }, [grouped]);

  const processedGroups = useMemo(() => {
    let result = { ...grouped };

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = Object.fromEntries(
        Object.entries(result)
          .map(([date, items]) => [
            date,
            items.filter(item =>
              (item.company_name || '').toLowerCase().includes(q) ||
              (item.role || '').toLowerCase().includes(q) ||
              (item.job_description || '').toLowerCase().includes(q)
            )
          ])
          .filter(([, items]) => items.length > 0)
      );
    }

    Object.keys(result).forEach(date => {
      result[date] = [...result[date]].sort((a, b) => {
        if (sortBy === 'date-asc') return (parseLocalDate(a.created_at) || 0) - (parseLocalDate(b.created_at) || 0);
        if (sortBy === 'company-asc') return (a.company_name || '').localeCompare(b.company_name || '');
        if (sortBy === 'company-desc') return (b.company_name || '').localeCompare(a.company_name || '');
        return (parseLocalDate(b.created_at) || 0) - (parseLocalDate(a.created_at) || 0);
      });
    });

    return result;
  }, [grouped, searchQuery, sortBy]);

  const sortedDateKeys = useMemo(
    () => Object.keys(processedGroups).sort((a, b) => b.localeCompare(a)),
    [processedGroups]
  );

  const filteredTotal = useMemo(
    () => Object.values(processedGroups).flat().length,
    [processedGroups]
  );

  return (
    <Box sx={{ bgcolor: colors.bg, minHeight: `calc(100vh - ${NAVBAR_HEIGHT}px)` }}>
      {/* ── Dark header ── */}
      <Box sx={{ background: gradients.darkBanner, pt: 3.5, pb: 2.5, px: 3 }}>
        <Container maxWidth="lg" disableGutters>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', mb: 0.25 }}>
                Resume History
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.8125rem' }}>
                {loading ? '…' : `${stats.total} resume${stats.total !== 1 ? 's' : ''} across ${stats.companies} compan${stats.companies !== 1 ? 'ies' : 'y'}`}
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<AddIcon sx={{ fontSize: 16 }} />}
              onClick={() => navigate('/')}
              sx={{ fontWeight: 600, px: 2.5, py: 1 }}
            >
              New Resume
            </Button>
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ pt: 3, pb: 6 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="flex-start">

          {/* ════════════════════════════════════════════════════════════════════
               LEFT SIDEBAR — sticky summary
             ════════════════════════════════════════════════════════════════════ */}
          <Box
            sx={{
              width: { xs: '100%', md: 220 },
              flexShrink: 0,
              position: { md: 'sticky' },
              top: { md: NAVBAR_HEIGHT + 16 },
            }}
          >
            <Box sx={{ bgcolor: '#fff', border: '1px solid #e2e8f0', borderRadius: 2, p: 2 }}>
              {/* Quick stats */}
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.625rem' }}>
                Overview
              </Typography>

              <Stack spacing={1.5} sx={{ mt: 1.5 }}>
                {/* Total */}
                <Box>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>Total resumes</Typography>
                    {loading
                      ? <Skeleton width={28} height={18} />
                      : <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: '0.875rem', color: colors.dark }}>{stats.total}</Typography>
                    }
                  </Stack>
                </Box>

                {/* This week */}
                <Box>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>This week</Typography>
                    {loading
                      ? <Skeleton width={28} height={18} />
                      : <Chip label={stats.thisWeek} size="small"
                          sx={{ height: 18, fontSize: '0.6875rem', fontWeight: 700, bgcolor: stats.thisWeek > 0 ? alpha('#10b981', 0.1) : '#f1f5f9', color: stats.thisWeek > 0 ? '#059669' : 'text.disabled' }}
                        />
                    }
                  </Stack>
                </Box>

                {/* DOCX / PDF bar */}
                <Box>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>Files</Typography>
                    {!loading && (
                      <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.625rem' }}>
                        {stats.withDocx} docx · {stats.withPdf} pdf
                      </Typography>
                    )}
                  </Stack>
                  {loading ? <Skeleton height={6} /> : (
                    <Stack direction="row" spacing={0.5} sx={{ height: 5, borderRadius: 99, overflow: 'hidden', bgcolor: '#f1f5f9' }}>
                      {stats.total > 0 && (
                        <>
                          <Box sx={{ width: `${(stats.withDocx / stats.total) * 100}%`, bgcolor: '#1976d2', borderRadius: 99, minWidth: stats.withDocx > 0 ? 4 : 0 }} />
                          <Box sx={{ width: `${(stats.withPdf / stats.total) * 100}%`, bgcolor: '#d32f2f', borderRadius: 99, minWidth: stats.withPdf > 0 ? 4 : 0 }} />
                        </>
                      )}
                    </Stack>
                  )}
                </Box>
              </Stack>

              {/* Top company */}
              {!loading && stats.topCompany && (
                <>
                  <Box sx={{ height: 1, bgcolor: '#f1f5f9', my: 1.5 }} />
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.625rem' }}>
                    Top company
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                    <Avatar
                      sx={{
                        width: 24, height: 24, fontSize: '0.625rem', fontWeight: 700, borderRadius: 0.75,
                        bgcolor: alpha(accentColor(stats.topCompany.name), 0.12),
                        color: accentColor(stats.topCompany.name),
                      }}
                    >
                      {stats.topCompany.name[0]}
                    </Avatar>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.75rem', display: 'block', color: colors.dark }} noWrap>
                        {stats.topCompany.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.625rem' }}>
                        {stats.topCompany.count} resume{stats.topCompany.count !== 1 ? 's' : ''}
                      </Typography>
                    </Box>
                  </Stack>
                </>
              )}
            </Box>

            {/* Search & sort — in sidebar on desktop */}
            <Box sx={{ mt: 2 }}>
              <TextField
                size="small"
                fullWidth
                placeholder="Search…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 16, color: 'text.disabled' }} /></InputAdornment>
                }}
                sx={{ mb: 1 }}
              />
              <FormControl size="small" fullWidth>
                <InputLabel>Sort</InputLabel>
                <Select value={sortBy} label="Sort" onChange={e => setSortBy(e.target.value)}>
                  <MenuItem value="date-desc">Newest first</MenuItem>
                  <MenuItem value="date-asc">Oldest first</MenuItem>
                  <MenuItem value="company-asc">Company A → Z</MenuItem>
                  <MenuItem value="company-desc">Company Z → A</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>

          {/* ════════════════════════════════════════════════════════════════════
               RIGHT — card list
             ════════════════════════════════════════════════════════════════════ */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {/* Error */}
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {/* Filtered count hint */}
            {!loading && searchQuery && (
              <Typography variant="caption" sx={{ display: 'block', mb: 1.5, color: 'text.disabled', fontSize: '0.75rem' }}>
                Showing {filteredTotal} result{filteredTotal !== 1 ? 's' : ''} for &ldquo;{searchQuery}&rdquo;
              </Typography>
            )}

            {/* Loading */}
            {loading && (
              <Stack spacing={1.5}>
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} variant="rectangular" height={52} sx={{ borderRadius: 2 }} />
                ))}
              </Stack>
            )}

            {/* Empty */}
            {!loading && sortedDateKeys.length === 0 && (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <Box sx={{
                  width: 48, height: 48, borderRadius: 2.5, mx: 'auto', mb: 2,
                  background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <ArticleIcon sx={{ fontSize: 22, color: '#fff' }} />
                </Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
                  {searchQuery ? 'No results' : 'No resumes yet'}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2.5, fontSize: '0.8125rem' }}>
                  {searchQuery ? 'Try a different search' : 'Generate your first resume to get started'}
                </Typography>
                {!searchQuery && (
                  <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => navigate('/')}>
                    Generate Resume
                  </Button>
                )}
              </Box>
            )}

            {/* Date groups */}
            {!loading && sortedDateKeys.length > 0 && (
              <Stack spacing={3}>
                {sortedDateKeys.map(date => (
                  <Box key={date}>
                    {/* Group header */}
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.625rem' }}>
                        {formatGroupDate(date)}
                      </Typography>
                      <Box sx={{ flex: 1, height: 1, bgcolor: '#e2e8f0' }} />
                      <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.625rem' }}>
                        {processedGroups[date].length}
                      </Typography>
                    </Stack>

                    <Stack spacing={1}>
                      {processedGroups[date].map(item => (
                        <ResumeCard key={item.id} item={item} />
                      ))}
                    </Stack>
                  </Box>
                ))}
              </Stack>
            )}
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}

// ── ResumeCard ───────────────────────────────────────────────────────────────

function ResumeCard({ item }) {
  const [jdExpanded, setJdExpanded] = useState(false);
  const color = accentColor(item.company_name);
  const hasDocx = Boolean(item.docx_url);
  const hasPdf = Boolean(item.pdf_url);
  const jd = item.job_description || '';

  const initials = (item.company_name || '?')
    .split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();

  return (
    <Box
      sx={{
        bgcolor: '#fff',
        border: '1px solid #e2e8f0',
        borderLeft: `3px solid ${color}`,
        borderRadius: 2,
        overflow: 'hidden',
        transition: 'box-shadow 0.15s',
        '&:hover': { boxShadow: `0 2px 12px ${alpha(color, 0.08)}` },
      }}
    >
      {/* ── Compact row ── */}
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ px: 1.75, py: 1 }}>
        <Avatar sx={{ width: 28, height: 28, fontSize: '0.6875rem', fontWeight: 700, bgcolor: alpha(color, 0.1), color, flexShrink: 0, borderRadius: 0.75 }}>
          {initials}
        </Avatar>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={0.75} alignItems="baseline">
            <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.8125rem', color: colors.dark }} noWrap>
              {item.company_name || 'Unknown'}
            </Typography>
            {item.role && (
              <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.6875rem' }} noWrap>
                {item.role}
              </Typography>
            )}
          </Stack>
        </Box>

        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0 }}>
          <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.625rem', whiteSpace: 'nowrap' }}>
            {formatDate(item.created_at)}
          </Typography>
          {hasDocx && (
            <Chip icon={<DocIcon sx={{ fontSize: 10 }} />} label="DOCX" size="small"
              sx={{ height: 18, fontSize: '0.5625rem', fontWeight: 600, bgcolor: alpha('#1976d2', 0.08), color: '#1976d2', '& .MuiChip-label': { px: 0.5 }, cursor: 'pointer' }}
              onClick={() => window.open(item.docx_url, '_blank')}
            />
          )}
          {hasPdf && (
            <Chip icon={<PdfIcon sx={{ fontSize: 10 }} />} label="PDF" size="small"
              sx={{ height: 18, fontSize: '0.5625rem', fontWeight: 600, bgcolor: alpha('#d32f2f', 0.08), color: '#d32f2f', '& .MuiChip-label': { px: 0.5 }, cursor: 'pointer' }}
              onClick={() => window.open(item.pdf_url, '_blank')}
            />
          )}
          {jd && (
            <Tooltip title={jdExpanded ? 'Hide JD' : 'View JD'} arrow>
              <IconButton size="small" onClick={() => setJdExpanded(e => !e)}
                sx={{ color: jdExpanded ? color : 'text.disabled', bgcolor: jdExpanded ? alpha(color, 0.08) : 'transparent', width: 22, height: 22 }}>
                {jdExpanded ? <ChevronUpIcon sx={{ fontSize: 14 }} /> : <ChevronDownIcon sx={{ fontSize: 14 }} />}
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      </Stack>

      {/* ── Expandable JD ── */}
      <Collapse in={jdExpanded} unmountOnExit>
        <Box sx={{ px: 1.75, pb: 1.25, pt: 0.5, borderTop: `1px solid ${alpha(color, 0.1)}`, bgcolor: alpha(color, 0.02) }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem', lineHeight: 1.6, whiteSpace: 'pre-wrap', display: 'block' }}>
            {jd}
          </Typography>
        </Box>
      </Collapse>
    </Box>
  );
}
