import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Stack, Card, CardContent, Chip,
  Skeleton, Divider, IconButton, Tooltip, Avatar
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  AutoAwesome as SparkleIcon,
  Work as WorkIcon,
  History as HistoryIcon,
  TrendingUp as TrendingIcon,
  ArrowForward as ArrowIcon,
  Description as DocIcon,
  Add as AddIcon,
  Business as BusinessIcon,
  LocationOn as LocationIcon,
  CheckCircle as CheckIcon,
  AccessTime as TimeIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { NAVBAR_HEIGHT, colors } from '../theme';
import { jobTrackerService, historyService } from '../services/api';

// ── Status config (mirrored from JobTracker) ────────────────────────────────
const STATUS_CONFIG = {
  applied:         { label: 'Applied',         color: '#3b82f6' },
  screening:       { label: 'Screening',       color: '#8b5cf6' },
  phone_interview: { label: 'Phone Interview', color: '#6366f1' },
  video_interview: { label: 'Video Interview', color: '#0ea5e9' },
  technical:       { label: 'Technical',       color: '#f59e0b' },
  onsite:          { label: 'Onsite',          color: '#f97316' },
  offer:           { label: 'Offer',           color: '#10b981' },
  accepted:        { label: 'Accepted',        color: '#059669' },
  rejected:        { label: 'Rejected',        color: '#ef4444' },
  withdrawn:       { label: 'Withdrawn',       color: '#6b7280' },
};

const getStatusInfo = (key) => STATUS_CONFIG[key] || STATUS_CONFIG.applied;

const formatDate = (d) => {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [recentHistory, setRecentHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [appsRes, histRes] = await Promise.all([
          jobTrackerService.getAll().catch(() => ({ data: [] })),
          historyService.getHistory().catch(() => ({ data: { history: {} } })),
        ]);
        setApplications(appsRes.data || []);

        // Flatten history groups into a flat list, take most recent 5
        const hist = histRes.data?.history || {};
        const flat = Object.values(hist).flat().slice(0, 5);
        setRecentHistory(flat);
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // ── Stats ─────────────────────────────────────────────────────────────
  const stats = {
    totalApps: applications.length,
    active: applications.filter(a => !['rejected', 'withdrawn', 'accepted'].includes(a.status)).length,
    interviews: applications.filter(a => ['phone_interview', 'video_interview', 'technical', 'onsite'].includes(a.status)).length,
    offers: applications.filter(a => ['offer', 'accepted'].includes(a.status)).length,
    resumes: recentHistory.length,
  };

  // Pipeline counts for the board view
  const pipelineCounts = {};
  applications.forEach(a => {
    pipelineCounts[a.status] = (pipelineCounts[a.status] || 0) + 1;
  });

  // Recent applications (sorted by updated_at desc, top 5)
  const recentApps = [...applications]
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
    .slice(0, 5);

  const firstName = user?.full_name?.split(' ')[0] || 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: colors.bg, pt: `${NAVBAR_HEIGHT}px` }}>

      {/* ── Hero Banner ───────────────────────────────────────────────────── */}
      <Box sx={{
        background: `linear-gradient(145deg, ${colors.dark} 0%, ${colors.darkAlt} 50%, #4338ca 100%)`,
        color: '#fff', py: { xs: 4, md: 5 }, px: { xs: 2, md: 4 },
      }}>
        <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
            {greeting}, {firstName}
          </Typography>
          <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.6)', mb: 3 }}>
            Here's what's happening with your job search
          </Typography>

          {/* Stat Pills */}
          <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', gap: 1.5 }}>
            {[
              { label: 'Applications', value: stats.totalApps, icon: <WorkIcon />, color: '#818cf8' },
              { label: 'Active', value: stats.active, icon: <TrendingIcon />, color: '#60a5fa' },
              { label: 'Interviews', value: stats.interviews, icon: <TimeIcon />, color: '#fbbf24' },
              { label: 'Offers', value: stats.offers, icon: <CheckIcon />, color: '#34d399' },
            ].map(s => (
              <Box key={s.label} sx={{
                display: 'flex', alignItems: 'center', gap: 1.5,
                bgcolor: 'rgba(255,255,255,0.08)', borderRadius: 2.5,
                px: 2.5, py: 1.5, backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.08)',
                minWidth: 150,
              }}>
                <Box sx={{
                  width: 36, height: 36, borderRadius: 2,
                  bgcolor: alpha(s.color, 0.15), display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  {React.cloneElement(s.icon, { sx: { fontSize: 18, color: s.color } })}
                </Box>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.1 }}>{s.value}</Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontWeight: 500, fontSize: '0.7rem' }}>
                    {s.label}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Stack>
        </Box>
      </Box>

      {/* ── Main Content ─────────────────────────────────────────────────── */}
      <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 2, md: 4 }, py: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>

          {/* ── Left Column ────────────────────────────────────────────── */}
          <Box sx={{ flex: 2 }}>

            {/* Quick Actions */}
            <Stack direction="row" spacing={1.5} sx={{ mb: 3 }}>
              <Button variant="contained" startIcon={<SparkleIcon />}
                onClick={() => navigate('/generator')}
                sx={{ flex: 1, py: 1.5 }}>
                Generate Resume
              </Button>
              <Button variant="outlined" startIcon={<AddIcon />}
                onClick={() => navigate('/tracker')}
                sx={{ flex: 1, py: 1.5 }}>
                Add Application
              </Button>
            </Stack>

            {/* Pipeline Board */}
            <Card sx={{ mb: 3, border: '1px solid', borderColor: colors.border, '&:hover': { transform: 'none' } }}>
              <CardContent sx={{ p: 2.5 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Pipeline</Typography>
                  <Button size="small" endIcon={<ArrowIcon sx={{ fontSize: 14 }} />}
                    onClick={() => navigate('/tracker')} sx={{ fontSize: '0.75rem' }}>
                    View All
                  </Button>
                </Stack>

                {loading ? (
                  <Stack direction="row" spacing={1}>
                    {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} variant="rounded" width="20%" height={60} />)}
                  </Stack>
                ) : applications.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 3 }}>
                    <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                      No applications yet. Start tracking your job search!
                    </Typography>
                  </Box>
                ) : (
                  <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 0.5 }}>
                    {Object.entries(STATUS_CONFIG)
                      .filter(([key]) => pipelineCounts[key] > 0)
                      .map(([key, config]) => (
                        <Box key={key} sx={{
                          flex: '0 0 auto', minWidth: 100, textAlign: 'center',
                          borderRadius: 2, py: 1.5, px: 2,
                          bgcolor: alpha(config.color, 0.06),
                          border: `1px solid ${alpha(config.color, 0.15)}`,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          '&:hover': { bgcolor: alpha(config.color, 0.12) },
                        }}
                          onClick={() => navigate('/tracker')}
                        >
                          <Typography variant="h5" sx={{ fontWeight: 700, color: config.color }}>
                            {pipelineCounts[key]}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.65rem' }}>
                            {config.label}
                          </Typography>
                        </Box>
                      ))
                    }
                  </Stack>
                )}
              </CardContent>
            </Card>

            {/* Recent Applications */}
            <Card sx={{ border: '1px solid', borderColor: colors.border, '&:hover': { transform: 'none' } }}>
              <CardContent sx={{ p: 2.5 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Recent Applications</Typography>
                  <Button size="small" endIcon={<ArrowIcon sx={{ fontSize: 14 }} />}
                    onClick={() => navigate('/tracker')} sx={{ fontSize: '0.75rem' }}>
                    View All
                  </Button>
                </Stack>

                {loading ? (
                  <Stack spacing={1.5}>
                    {[1, 2, 3].map(i => <Skeleton key={i} variant="rounded" height={56} />)}
                  </Stack>
                ) : recentApps.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 3 }}>
                    <Typography variant="body2" sx={{ color: 'text.disabled' }}>No applications yet</Typography>
                  </Box>
                ) : (
                  <Stack spacing={0} divider={<Divider />}>
                    {recentApps.map(app => {
                      const si = getStatusInfo(app.status);
                      return (
                        <Stack key={app.id} direction="row" alignItems="center" spacing={1.5} sx={{
                          py: 1.5, cursor: 'pointer', borderRadius: 1.5, px: 1, mx: -1,
                          transition: 'background 0.1s',
                          '&:hover': { bgcolor: alpha(colors.primary, 0.04) },
                        }}
                          onClick={() => navigate('/tracker')}
                        >
                          <Avatar sx={{
                            width: 36, height: 36, bgcolor: alpha(si.color, 0.1),
                            color: si.color, fontSize: '0.75rem', fontWeight: 700,
                          }}>
                            {app.company_name?.slice(0, 2).toUpperCase()}
                          </Avatar>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {app.position}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                              {app.company_name}
                              {app.location && ` \u00B7 ${app.location}`}
                            </Typography>
                          </Box>
                          <Chip label={si.label} size="small" sx={{
                            bgcolor: alpha(si.color, 0.1), color: si.color,
                            fontWeight: 600, fontSize: '0.65rem', height: 22,
                          }} />
                        </Stack>
                      );
                    })}
                  </Stack>
                )}
              </CardContent>
            </Card>
          </Box>

          {/* ── Right Column ───────────────────────────────────────────── */}
          <Box sx={{ flex: 1, minWidth: 280 }}>

            {/* Recent Resumes */}
            <Card sx={{ mb: 3, border: '1px solid', borderColor: colors.border, '&:hover': { transform: 'none' } }}>
              <CardContent sx={{ p: 2.5 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Recent Resumes</Typography>
                  <Button size="small" endIcon={<ArrowIcon sx={{ fontSize: 14 }} />}
                    onClick={() => navigate('/history')} sx={{ fontSize: '0.75rem' }}>
                    History
                  </Button>
                </Stack>

                {loading ? (
                  <Stack spacing={1.5}>
                    {[1, 2, 3].map(i => <Skeleton key={i} variant="rounded" height={44} />)}
                  </Stack>
                ) : recentHistory.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 3 }}>
                    <DocIcon sx={{ fontSize: 36, color: 'text.disabled', mb: 0.5 }} />
                    <Typography variant="body2" sx={{ color: 'text.disabled' }}>No resumes generated yet</Typography>
                    <Button size="small" sx={{ mt: 1 }} onClick={() => navigate('/generator')}>
                      Generate One
                    </Button>
                  </Box>
                ) : (
                  <Stack spacing={0} divider={<Divider />}>
                    {recentHistory.map((item, idx) => (
                      <Stack key={item.id || idx} direction="row" alignItems="center" spacing={1.5} sx={{
                        py: 1.25, cursor: 'pointer', borderRadius: 1.5, px: 1, mx: -1,
                        '&:hover': { bgcolor: alpha(colors.primary, 0.04) },
                      }}
                        onClick={() => navigate('/history')}
                      >
                        <Box sx={{
                          width: 32, height: 32, borderRadius: 1.5,
                          bgcolor: alpha(colors.primary, 0.08),
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <DocIcon sx={{ fontSize: 16, color: colors.primary }} />
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.role || item.company_name || 'Resume'}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.65rem' }}>
                            {item.company_name && item.role ? item.company_name : ''}
                            {item.created_at && ` \u00B7 ${formatDate(item.created_at)}`}
                          </Typography>
                        </Box>
                      </Stack>
                    ))}
                  </Stack>
                )}
              </CardContent>
            </Card>

            {/* Quick Links */}
            <Card sx={{ border: '1px solid', borderColor: colors.border, '&:hover': { transform: 'none' } }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>Quick Links</Typography>
                <Stack spacing={0.5}>
                  {[
                    { label: 'Generate Resume', icon: <SparkleIcon />, path: '/generator', color: colors.primary },
                    { label: 'Job Tracker', icon: <WorkIcon />, path: '/tracker', color: colors.info },
                    { label: 'History', icon: <HistoryIcon />, path: '/history', color: colors.warning },
                    { label: 'Profile', icon: <PersonIcon />, path: '/profile', color: colors.success },
                  ].map(link => (
                    <Stack key={link.path} direction="row" alignItems="center" spacing={1.5}
                      onClick={() => navigate(link.path)}
                      sx={{
                        py: 1, px: 1.5, borderRadius: 2, cursor: 'pointer',
                        transition: 'all 0.1s',
                        '&:hover': { bgcolor: alpha(link.color, 0.06) },
                      }}
                    >
                      <Box sx={{
                        width: 30, height: 30, borderRadius: 1.5,
                        bgcolor: alpha(link.color, 0.1),
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {React.cloneElement(link.icon, { sx: { fontSize: 15, color: link.color } })}
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>{link.label}</Typography>
                      <ArrowIcon sx={{ fontSize: 14, color: 'text.disabled', ml: 'auto' }} />
                    </Stack>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Box>
        </Stack>
      </Box>
    </Box>
  );
}
