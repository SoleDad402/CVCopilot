import { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Paper,
  Stack,
  Divider,
  Box,
  Button,
  Chip,
  Card,
  CardContent,
  Grid,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Download as DownloadIcon,
  Description as DocIcon,
  PictureAsPdf as PdfIcon,
  Business as BusinessIcon,
  Work as WorkIcon,
  CalendarToday as CalendarIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import { historyService } from '../services/api';

// Helper function to format date
const formatDate = (dateString) => {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
};

// Helper function to get week range
const getWeekRange = (dateString) => {
  const date = new Date(dateString);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  const monday = new Date(date.setDate(diff));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  
  return {
    start: monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    end: sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    key: `${monday.getFullYear()}-W${Math.ceil((monday.getDate() + new Date(monday.getFullYear(), monday.getMonth(), 0).getDate()) / 7)}`
  };
};

// Group by week
const groupByWeek = (groupedByDay) => {
  const weekGroups = {};
  
  Object.entries(groupedByDay).forEach(([date, items]) => {
    const weekRange = getWeekRange(date);
    const weekKey = weekRange.key;
    
    if (!weekGroups[weekKey]) {
      weekGroups[weekKey] = {
        range: weekRange,
        items: [],
        count: 0
      };
    }
    
    weekGroups[weekKey].items.push(...items);
    weekGroups[weekKey].count += items.length;
  });
  
  return weekGroups;
};

export default function History() {
  const [grouped, setGrouped] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState(0); // 0 = Day, 1 = Week
  const [totalResumes, setTotalResumes] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const { data } = await historyService.getHistory();
        const history = data.history || {};
        setGrouped(history);
        
        // Calculate total resumes
        const total = Object.values(history).reduce((sum, items) => sum + items.length, 0);
        setTotalResumes(total);
      } catch (e) {
        setError(e?.response?.data?.error || e.message || 'Failed to load history');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleDownload = (url, filename) => {
    if (url) {
      window.open(url, '_blank');
    }
  };

  const weekGroups = viewMode === 1 ? groupByWeek(grouped) : null;

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, color: '#263238' }}>
          Resume History
        </Typography>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
          <Chip
            icon={<TrendingUpIcon />}
            label={`${totalResumes} Total Resumes`}
            color="primary"
            variant="outlined"
            sx={{ fontWeight: 600 }}
          />
          <Chip
            icon={<CalendarIcon />}
            label={`${Object.keys(grouped).length} Days Active`}
            color="secondary"
            variant="outlined"
            sx={{ fontWeight: 600 }}
          />
        </Stack>

        {/* View Mode Tabs */}
        <Tabs
          value={viewMode}
          onChange={(e, newValue) => setViewMode(newValue)}
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            mb: 3
          }}
        >
          <Tab label="View by Day" />
          <Tab label="View by Week" />
        </Tabs>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {Object.keys(grouped).length === 0 && !loading && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
            No resume history yet
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Start generating resumes to see them here
          </Typography>
        </Paper>
      )}

      {/* Day View */}
      {viewMode === 0 && (
        <Stack spacing={3}>
          {Object.entries(grouped)
            .sort((a, b) => b[0].localeCompare(a[0]))
            .map(([date, items]) => (
              <Card key={date} elevation={2} sx={{ borderRadius: 2, overflow: 'hidden' }}>
                <Box
                  sx={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    p: 2,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                      {formatDate(date)}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      {items.length} {items.length === 1 ? 'resume' : 'resumes'} generated
                    </Typography>
                  </Box>
                  <Chip
                    label={items.length}
                    sx={{
                      bgcolor: 'rgba(255, 255, 255, 0.2)',
                      color: 'white',
                      fontWeight: 600,
                      fontSize: '1rem'
                    }}
                  />
                </Box>
                <CardContent>
                  <Grid container spacing={2}>
                    {items.map((item) => (
                      <Grid item xs={12} sm={6} md={4} key={item.id}>
                        <Paper
                          elevation={0}
                          sx={{
                            p: 2,
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 2,
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            transition: 'all 0.2s',
                            '&:hover': {
                              boxShadow: 3,
                              transform: 'translateY(-2px)'
                            }
                          }}
                        >
                          <Stack spacing={1.5}>
                            <Box>
                              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                                <BusinessIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                                <Typography
                                  variant="subtitle1"
                                  sx={{ fontWeight: 600, color: '#263238' }}
                                  noWrap
                                >
                                  {item.company_name || 'Company'}
                                </Typography>
                              </Stack>
                              {item.role && (
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <WorkIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                  <Typography variant="body2" color="text.secondary" noWrap>
                                    {item.role}
                                  </Typography>
                                </Stack>
                              )}
                            </Box>

                            <Divider />

                            <Stack direction="row" spacing={1} sx={{ mt: 'auto' }}>
                              {item.docx_url && (
                                <Button
                                  variant="outlined"
                                  size="small"
                                  startIcon={<DocIcon />}
                                  onClick={() => handleDownload(item.docx_url, 'resume.docx')}
                                  fullWidth
                                  sx={{
                                    textTransform: 'none',
                                    borderColor: '#1976d2',
                                    color: '#1976d2',
                                    '&:hover': {
                                      borderColor: '#1565c0',
                                      bgcolor: 'rgba(25, 118, 210, 0.04)'
                                    }
                                  }}
                                >
                                  DOCX
                                </Button>
                              )}
                              {item.pdf_url && (
                                <Button
                                  variant="outlined"
                                  size="small"
                                  startIcon={<PdfIcon />}
                                  onClick={() => handleDownload(item.pdf_url, 'resume.pdf')}
                                  fullWidth
                                  sx={{
                                    textTransform: 'none',
                                    borderColor: '#d32f2f',
                                    color: '#d32f2f',
                                    '&:hover': {
                                      borderColor: '#c62828',
                                      bgcolor: 'rgba(211, 47, 47, 0.04)'
                                    }
                                  }}
                                >
                                  PDF
                                </Button>
                              )}
                            </Stack>
                          </Stack>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>
            ))}
        </Stack>
      )}

      {/* Week View */}
      {viewMode === 1 && weekGroups && (
        <Stack spacing={3}>
          {Object.entries(weekGroups)
            .sort((a, b) => b[0].localeCompare(a[0]))
            .map(([weekKey, weekData]) => (
              <Card key={weekKey} elevation={2} sx={{ borderRadius: 2, overflow: 'hidden' }}>
                <Box
                  sx={{
                    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                    color: 'white',
                    p: 2,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                      Week of {weekData.range.start} - {weekData.range.end}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      {weekData.count} {weekData.count === 1 ? 'resume' : 'resumes'} generated
                    </Typography>
                  </Box>
                  <Chip
                    label={weekData.count}
                    sx={{
                      bgcolor: 'rgba(255, 255, 255, 0.2)',
                      color: 'white',
                      fontWeight: 600,
                      fontSize: '1rem'
                    }}
                  />
                </Box>
                <CardContent>
                  <Grid container spacing={2}>
                    {weekData.items.map((item) => (
                      <Grid item xs={12} sm={6} md={4} key={item.id}>
                        <Paper
                          elevation={0}
                          sx={{
                            p: 2,
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 2,
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            transition: 'all 0.2s',
                            '&:hover': {
                              boxShadow: 3,
                              transform: 'translateY(-2px)'
                            }
                          }}
                        >
                          <Stack spacing={1.5}>
                            <Box>
                              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                                <BusinessIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                                <Typography
                                  variant="subtitle1"
                                  sx={{ fontWeight: 600, color: '#263238' }}
                                  noWrap
                                >
                                  {item.company_name || 'Company'}
                                </Typography>
                              </Stack>
                              {item.role && (
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <WorkIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                  <Typography variant="body2" color="text.secondary" noWrap>
                                    {item.role}
                                  </Typography>
                                </Stack>
                              )}
                              {item.created_at && (
                                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                                  {formatDate(item.created_at)}
                                </Typography>
                              )}
                            </Box>

                            <Divider />

                            <Stack direction="row" spacing={1} sx={{ mt: 'auto' }}>
                              {item.docx_url && (
                                <Button
                                  variant="outlined"
                                  size="small"
                                  startIcon={<DocIcon />}
                                  onClick={() => handleDownload(item.docx_url, 'resume.docx')}
                                  fullWidth
                                  sx={{
                                    textTransform: 'none',
                                    borderColor: '#1976d2',
                                    color: '#1976d2',
                                    '&:hover': {
                                      borderColor: '#1565c0',
                                      bgcolor: 'rgba(25, 118, 210, 0.04)'
                                    }
                                  }}
                                >
                                  DOCX
                                </Button>
                              )}
                              {item.pdf_url && (
                                <Button
                                  variant="outlined"
                                  size="small"
                                  startIcon={<PdfIcon />}
                                  onClick={() => handleDownload(item.pdf_url, 'resume.pdf')}
                                  fullWidth
                                  sx={{
                                    textTransform: 'none',
                                    borderColor: '#d32f2f',
                                    color: '#d32f2f',
                                    '&:hover': {
                                      borderColor: '#c62828',
                                      bgcolor: 'rgba(211, 47, 47, 0.04)'
                                    }
                                  }}
                                >
                                  PDF
                                </Button>
                              )}
                            </Stack>
                          </Stack>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>
            ))}
        </Stack>
      )}
    </Container>
  );
}
