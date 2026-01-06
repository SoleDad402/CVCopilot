import { useEffect, useState, useMemo } from 'react';
import {
  Container,
  Typography,
  Paper,
  Stack,
  Box,
  Button,
  Chip,
  Card,
  CardContent,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Menu,
  Tooltip,
  CircularProgress,
  Alert,
  Skeleton,
  Divider,
  alpha
} from '@mui/material';
import {
  Download as DownloadIcon,
  Description as DocIcon,
  PictureAsPdf as PdfIcon,
  Business as BusinessIcon,
  Work as WorkIcon,
  CalendarToday as CalendarIcon,
  TrendingUp as TrendingUpIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Sort as SortIcon,
  GridView as GridViewIcon,
  ViewList as ViewListIcon,
  ExpandMore as ExpandMoreIcon,
  MoreVert as MoreVertIcon,
  Add as AddIcon,
  ArrowDownward as ArrowDownwardIcon,
  ArrowUpward as ArrowUpwardIcon
} from '@mui/icons-material';
import { historyService } from '../services/api';
import { useNavigate } from 'react-router-dom';

// Helper function to format date
const formatDate = (dateString) => {
  if (!dateString) return 'Undated';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Undated';
  
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
  if (!dateString) return { start: 'Unknown', end: 'Unknown', key: 'undated' };
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return { start: 'Unknown', end: 'Unknown', key: 'undated' };
  
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
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
  const undated = [];
  
  Object.entries(groupedByDay).forEach(([date, items]) => {
    if (!date || date === 'undefined' || date === 'null') {
      undated.push(...items);
      return;
    }
    
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
  
  if (undated.length > 0) {
    weekGroups['undated'] = {
      range: { start: 'Undated', end: '', key: 'undated' },
      items: undated,
      count: undated.length
    };
  }
  
  return weekGroups;
};

export default function History() {
  const navigate = useNavigate();
  const [grouped, setGrouped] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState(0); // 0 = Day, 1 = Week
  const [viewType, setViewType] = useState('grid'); // 'grid' or 'list'
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date-desc'); // 'date-desc', 'date-asc', 'company-asc', 'company-desc'
  const [filterBy, setFilterBy] = useState('all'); // 'all', 'has-docx', 'has-pdf'
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [openMenuAnchor, setOpenMenuAnchor] = useState(null);
  const [openMenuItem, setOpenMenuItem] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const { data } = await historyService.getHistory();
        const history = data.history || {};
        setGrouped(history);
      } catch (e) {
        setError(e?.response?.data?.error || e.message || 'Failed to load history');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Calculate KPIs
  const kpis = useMemo(() => {
    const allItems = Object.values(grouped).flat();
    const totalResumes = allItems.length;
    const totalDays = Object.keys(grouped).length;
    const withDocx = allItems.filter(item => item.docx_url).length;
    const withPdf = allItems.filter(item => item.pdf_url).length;
    
    return {
      totalResumes,
      totalDays,
      withDocx,
      withPdf
    };
  }, [grouped]);

  // Filter and sort items
  const processedGroups = useMemo(() => {
    let processed = { ...grouped };
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      processed = Object.entries(processed).reduce((acc, [date, items]) => {
        const filtered = items.filter(item => 
          (item.company_name || '').toLowerCase().includes(query) ||
          (item.role || '').toLowerCase().includes(query)
        );
        if (filtered.length > 0) {
          acc[date] = filtered;
        }
        return acc;
      }, {});
    }
    
    // Apply file type filter
    if (filterBy === 'has-docx') {
      processed = Object.entries(processed).reduce((acc, [date, items]) => {
        const filtered = items.filter(item => item.docx_url);
        if (filtered.length > 0) {
          acc[date] = filtered;
        }
        return acc;
      }, {});
    } else if (filterBy === 'has-pdf') {
      processed = Object.entries(processed).reduce((acc, [date, items]) => {
        const filtered = items.filter(item => item.pdf_url);
        if (filtered.length > 0) {
          acc[date] = filtered;
        }
        return acc;
      }, {});
    }
    
    // Sort items within each group
    Object.keys(processed).forEach(date => {
      processed[date] = [...processed[date]].sort((a, b) => {
        if (sortBy === 'date-desc') {
          return new Date(b.created_at || 0) - new Date(a.created_at || 0);
        } else if (sortBy === 'date-asc') {
          return new Date(a.created_at || 0) - new Date(b.created_at || 0);
        } else if (sortBy === 'company-asc') {
          return (a.company_name || '').localeCompare(b.company_name || '');
        } else if (sortBy === 'company-desc') {
          return (b.company_name || '').localeCompare(a.company_name || '');
        }
        return 0;
      });
    });
    
    return processed;
  }, [grouped, searchQuery, filterBy, sortBy]);

  const weekGroups = viewMode === 1 ? groupByWeek(processedGroups) : null;

  const handleKebabClick = (event, item) => {
    setAnchorEl(event.currentTarget);
    setSelectedItem(item);
  };

  const handleKebabClose = () => {
    setAnchorEl(null);
    setSelectedItem(null);
  };

  const handleOpenMenuClick = (event, item) => {
    setOpenMenuAnchor(event.currentTarget);
    setOpenMenuItem(item);
  };

  const handleOpenMenuClose = () => {
    setOpenMenuAnchor(null);
    setOpenMenuItem(null);
  };

  const handleDownload = (url) => {
    if (url) {
      window.open(url, '_blank');
    }
    handleOpenMenuClose();
  };

  const handleGenerateNew = () => {
    navigate('/');
  };

  // Skeleton loader
  const SkeletonCard = () => (
    <Card sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
      <CardContent>
        <Stack spacing={2}>
          <Skeleton variant="text" width="60%" height={24} />
          <Skeleton variant="text" width="40%" height={20} />
          <Divider />
          <Skeleton variant="rectangular" width="100%" height={36} />
        </Stack>
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ bgcolor: 'grey.50', minHeight: '100vh', pb: 4 }}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header with Primary CTA */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5, color: 'grey.900' }}>
              Resume History
            </Typography>
            <Typography variant="body2" color="text.secondary">
              View and manage your generated resumes
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleGenerateNew}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              px: 3,
              py: 1.5
            }}
          >
            Generate New Resume
          </Button>
        </Stack>

        {/* KPI Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, boxShadow: 'none' }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      Total Resumes
                    </Typography>
                    {loading ? (
                      <Skeleton variant="text" width={60} height={32} />
                    ) : (
                      <Typography variant="h5" sx={{ fontWeight: 600, color: 'grey.900' }}>
                        {kpis.totalResumes}
                      </Typography>
                    )}
                  </Box>
                  <Box
                    sx={{
                      bgcolor: alpha('#0ea5e9', 0.1),
                      borderRadius: 2,
                      p: 1.5,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <TrendingUpIcon sx={{ color: 'primary.main', fontSize: 28 }} />
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, boxShadow: 'none' }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      Active Days
                    </Typography>
                    {loading ? (
                      <Skeleton variant="text" width={60} height={32} />
                    ) : (
                      <Typography variant="h5" sx={{ fontWeight: 600, color: 'grey.900' }}>
                        {kpis.totalDays}
                      </Typography>
                    )}
                  </Box>
                  <Box
                    sx={{
                      bgcolor: alpha('#10b981', 0.1),
                      borderRadius: 2,
                      p: 1.5,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <CalendarIcon sx={{ color: '#10b981', fontSize: 28 }} />
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, boxShadow: 'none' }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      With DOCX
                    </Typography>
                    {loading ? (
                      <Skeleton variant="text" width={60} height={32} />
                    ) : (
                      <Typography variant="h5" sx={{ fontWeight: 600, color: 'grey.900' }}>
                        {kpis.withDocx}
                      </Typography>
                    )}
                  </Box>
                  <Box
                    sx={{
                      bgcolor: alpha('#1976d2', 0.1),
                      borderRadius: 2,
                      p: 1.5,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <DocIcon sx={{ color: '#1976d2', fontSize: 28 }} />
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, boxShadow: 'none' }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      With PDF
                    </Typography>
                    {loading ? (
                      <Skeleton variant="text" width={60} height={32} />
                    ) : (
                      <Typography variant="h5" sx={{ fontWeight: 600, color: 'grey.900' }}>
                        {kpis.withPdf}
                      </Typography>
                    )}
                  </Box>
                  <Box
                    sx={{
                      bgcolor: alpha('#d32f2f', 0.1),
                      borderRadius: 2,
                      p: 1.5,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <PdfIcon sx={{ color: '#d32f2f', fontSize: 28 }} />
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Sticky Toolbar */}
        <Paper
          elevation={0}
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            p: 2,
            mb: 3,
            position: 'sticky',
            top: 16,
            zIndex: 10,
            bgcolor: 'background.paper'
          }}
        >
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
            {/* Search */}
            <TextField
              size="small"
              placeholder="Search by company or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" color="action" />
                  </InputAdornment>
                )
              }}
              sx={{ flexGrow: 1, maxWidth: { xs: '100%', md: 400 } }}
            />

            {/* Filter */}
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Filter</InputLabel>
              <Select
                value={filterBy}
                label="Filter"
                onChange={(e) => setFilterBy(e.target.value)}
                startAdornment={<FilterIcon sx={{ mr: 1, fontSize: 18, color: 'text.secondary' }} />}
              >
                <MenuItem value="all">All Resumes</MenuItem>
                <MenuItem value="has-docx">Has DOCX</MenuItem>
                <MenuItem value="has-pdf">Has PDF</MenuItem>
              </Select>
            </FormControl>

            {/* Sort */}
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Sort By</InputLabel>
              <Select
                value={sortBy}
                label="Sort By"
                onChange={(e) => setSortBy(e.target.value)}
                startAdornment={<SortIcon sx={{ mr: 1, fontSize: 18, color: 'text.secondary' }} />}
              >
                <MenuItem value="date-desc">Date (Newest)</MenuItem>
                <MenuItem value="date-asc">Date (Oldest)</MenuItem>
                <MenuItem value="company-asc">Company (A-Z)</MenuItem>
                <MenuItem value="company-desc">Company (Z-A)</MenuItem>
              </Select>
            </FormControl>

            {/* View Toggle */}
            <Stack direction="row" spacing={1}>
              <Button
                variant={viewMode === 0 ? 'contained' : 'outlined'}
                size="small"
                onClick={() => setViewMode(0)}
                sx={{ textTransform: 'none', minWidth: 80 }}
              >
                Day
              </Button>
              <Button
                variant={viewMode === 1 ? 'contained' : 'outlined'}
                size="small"
                onClick={() => setViewMode(1)}
                sx={{ textTransform: 'none', minWidth: 80 }}
              >
                Week
              </Button>
            </Stack>

            {/* Grid/List Toggle */}
            <Stack direction="row" spacing={0.5} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <IconButton
                size="small"
                onClick={() => setViewType('grid')}
                sx={{
                  bgcolor: viewType === 'grid' ? 'action.selected' : 'transparent',
                  borderRadius: 0,
                  borderTopLeftRadius: 4,
                  borderBottomLeftRadius: 4
                }}
              >
                <GridViewIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => setViewType('list')}
                sx={{
                  bgcolor: viewType === 'list' ? 'action.selected' : 'transparent',
                  borderRadius: 0,
                  borderTopRightRadius: 4,
                  borderBottomRightRadius: 4
                }}
              >
                <ViewListIcon fontSize="small" />
              </IconButton>
            </Stack>
          </Stack>
        </Paper>

        {/* Error State */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Loading State */}
        {loading && (
          <Grid container spacing={2}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Grid item xs={12} sm={6} md={4} key={i}>
                <SkeletonCard />
              </Grid>
            ))}
          </Grid>
        )}

        {/* Empty State */}
        {!loading && Object.keys(processedGroups).length === 0 && (
          <Paper sx={{ p: 6, textAlign: 'center', border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
              {searchQuery || filterBy !== 'all' ? 'No resumes found' : 'No resume history yet'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {searchQuery || filterBy !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Start generating resumes to see them here'}
            </Typography>
            {!searchQuery && filterBy === 'all' && (
              <Button variant="contained" startIcon={<AddIcon />} onClick={handleGenerateNew}>
                Generate Your First Resume
              </Button>
            )}
          </Paper>
        )}

        {/* Day View */}
        {!loading && viewMode === 0 && Object.keys(processedGroups).length > 0 && (
          <Stack spacing={2}>
            {Object.entries(processedGroups)
              .sort((a, b) => {
                if (!a[0] || a[0] === 'undefined' || a[0] === 'null') return 1;
                if (!b[0] || b[0] === 'undefined' || b[0] === 'null') return -1;
                return b[0].localeCompare(a[0]);
              })
              .map(([date, items]) => (
                <Accordion
                  key={date}
                  defaultExpanded={true}
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2,
                    boxShadow: 'none',
                    '&:before': { display: 'none' }
                  }}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ width: '100%', pr: 2 }}>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <CalendarIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                          {formatDate(date)}
                        </Typography>
                        <Chip
                          label={items.length}
                          size="small"
                          sx={{ bgcolor: 'grey.100', color: 'text.primary', fontWeight: 600 }}
                        />
                      </Stack>
                    </Stack>
                  </AccordionSummary>
                  <AccordionDetails>
                    {viewType === 'grid' ? (
                      <Grid container spacing={2}>
                        {items.map((item) => (
                          <Grid item xs={12} sm={6} md={4} key={item.id}>
                            <ResumeCard
                              item={item}
                              viewType={viewType}
                              onKebabClick={handleKebabClick}
                              onOpenMenuClick={handleOpenMenuClick}
                            />
                          </Grid>
                        ))}
                      </Grid>
                    ) : (
                      <Stack spacing={1}>
                        {items.map((item) => (
                          <ResumeCard
                            key={item.id}
                            item={item}
                            viewType={viewType}
                            onKebabClick={handleKebabClick}
                            onOpenMenuClick={handleOpenMenuClick}
                          />
                        ))}
                      </Stack>
                    )}
                  </AccordionDetails>
                </Accordion>
              ))}
          </Stack>
        )}

        {/* Week View */}
        {!loading && viewMode === 1 && weekGroups && Object.keys(weekGroups).length > 0 && (
          <Stack spacing={2}>
            {Object.entries(weekGroups)
              .sort((a, b) => {
                if (a[0] === 'undated') return 1;
                if (b[0] === 'undated') return -1;
                return b[0].localeCompare(a[0]);
              })
              .map(([weekKey, weekData]) => (
                <Accordion
                  key={weekKey}
                  defaultExpanded={true}
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2,
                    boxShadow: 'none',
                    '&:before': { display: 'none' }
                  }}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ width: '100%', pr: 2 }}>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <CalendarIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                          {weekData.range.start === 'Undated'
                            ? 'Undated'
                            : `Week of ${weekData.range.start} - ${weekData.range.end}`}
                        </Typography>
                        <Chip
                          label={weekData.count}
                          size="small"
                          sx={{ bgcolor: 'grey.100', color: 'text.primary', fontWeight: 600 }}
                        />
                      </Stack>
                    </Stack>
                  </AccordionSummary>
                  <AccordionDetails>
                    {viewType === 'grid' ? (
                      <Grid container spacing={2}>
                        {weekData.items.map((item) => (
                          <Grid item xs={12} sm={6} md={4} key={item.id}>
                            <ResumeCard
                              item={item}
                              viewType={viewType}
                              onKebabClick={handleKebabClick}
                              onOpenMenuClick={handleOpenMenuClick}
                            />
                          </Grid>
                        ))}
                      </Grid>
                    ) : (
                      <Stack spacing={1}>
                        {weekData.items.map((item) => (
                          <ResumeCard
                            key={item.id}
                            item={item}
                            viewType={viewType}
                            onKebabClick={handleKebabClick}
                            onOpenMenuClick={handleOpenMenuClick}
                          />
                        ))}
                      </Stack>
                    )}
                  </AccordionDetails>
                </Accordion>
              ))}
          </Stack>
        )}

        {/* Kebab Menu */}
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleKebabClose}>
          <MenuItem onClick={handleKebabClose}>
            <DownloadIcon sx={{ mr: 1, fontSize: 18 }} />
            Download All
          </MenuItem>
          <MenuItem onClick={handleKebabClose}>
            <WorkIcon sx={{ mr: 1, fontSize: 18 }} />
            View Details
          </MenuItem>
        </Menu>

        {/* Open Menu (PDF/DOCX Dropdown) */}
        <Menu anchorEl={openMenuAnchor} open={Boolean(openMenuAnchor)} onClose={handleOpenMenuClose}>
          {openMenuItem?.docx_url && (
            <MenuItem onClick={() => handleDownload(openMenuItem.docx_url)}>
              <DocIcon sx={{ mr: 1, fontSize: 18, color: '#1976d2' }} />
              Open DOCX
            </MenuItem>
          )}
          {openMenuItem?.pdf_url && (
            <MenuItem onClick={() => handleDownload(openMenuItem.pdf_url)}>
              <PdfIcon sx={{ mr: 1, fontSize: 18, color: '#d32f2f' }} />
              Open PDF
            </MenuItem>
          )}
          {(!openMenuItem?.docx_url && !openMenuItem?.pdf_url) && (
            <MenuItem disabled>No files available</MenuItem>
          )}
        </Menu>
      </Container>
    </Box>
  );
}

// Resume Card Component
function ResumeCard({ item, viewType, onKebabClick, onOpenMenuClick }) {
  const hasFiles = item.docx_url || item.pdf_url;
  const fileCount = (item.docx_url ? 1 : 0) + (item.pdf_url ? 1 : 0);

  if (viewType === 'list') {
    return (
      <Card sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, boxShadow: 'none' }}>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
            <Stack direction="row" spacing={2} alignItems="center" sx={{ flexGrow: 1, minWidth: 0 }}>
              <Box
                sx={{
                  bgcolor: 'grey.100',
                  borderRadius: 1.5,
                  p: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <BusinessIcon sx={{ color: 'text.secondary', fontSize: 24 }} />
              </Box>
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }} noWrap>
                  {item.company_name || 'Company'}
                </Typography>
                {item.role && (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <WorkIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {item.role}
                    </Typography>
                  </Stack>
                )}
              </Box>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              {hasFiles && (
                <>
                  <Chip
                    label={`${fileCount} file${fileCount > 1 ? 's' : ''}`}
                    size="small"
                    sx={{ bgcolor: 'grey.100', fontWeight: 500 }}
                  />
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={(e) => onOpenMenuClick(e, item)}
                    sx={{ textTransform: 'none', minWidth: 100 }}
                  >
                    Open
                  </Button>
                </>
              )}
              <IconButton size="small" onClick={(e) => onKebabClick(e, item)}>
                <MoreVertIcon fontSize="small" />
              </IconButton>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  // Grid view
  return (
    <Card
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        boxShadow: 'none',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.2s',
        '&:hover': {
          boxShadow: 2,
          borderColor: 'primary.main'
        }
      }}
    >
      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Stack spacing={2} sx={{ flexGrow: 1 }}>
          {/* Header */}
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Box
              sx={{
                bgcolor: 'grey.100',
                borderRadius: 1.5,
                p: 1.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <BusinessIcon sx={{ color: 'text.secondary', fontSize: 24 }} />
            </Box>
            <Stack direction="row" spacing={0.5}>
              {item.docx_url && (
                <Chip
                  icon={<DocIcon sx={{ fontSize: 14 }} />}
                  label="DOCX"
                  size="small"
                  sx={{ bgcolor: alpha('#1976d2', 0.1), color: '#1976d2', fontWeight: 500, height: 24 }}
                />
              )}
              {item.pdf_url && (
                <Chip
                  icon={<PdfIcon sx={{ fontSize: 14 }} />}
                  label="PDF"
                  size="small"
                  sx={{ bgcolor: alpha('#d32f2f', 0.1), color: '#d32f2f', fontWeight: 500, height: 24 }}
                />
              )}
              <IconButton size="small" onClick={(e) => onKebabClick(e, item)} sx={{ ml: 0.5 }}>
                <MoreVertIcon fontSize="small" />
              </IconButton>
            </Stack>
          </Stack>

          {/* Content */}
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, color: 'grey.900' }}>
              {item.company_name || 'Company'}
            </Typography>
            {item.role && (
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <WorkIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary" noWrap>
                  {item.role}
                </Typography>
              </Stack>
            )}
            {item.created_at && (
              <Typography variant="caption" color="text.secondary">
                {formatDate(item.created_at)}
              </Typography>
            )}
          </Box>

          {/* Actions */}
          <Divider />
          <Button
            variant="outlined"
            fullWidth
            size="small"
            onClick={(e) => onOpenMenuClick(e, item)}
            disabled={!hasFiles}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            {hasFiles ? 'Open' : 'No Files'}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
