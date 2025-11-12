import React, { useState, useEffect, useMemo } from 'react';
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
  TextField
} from '@mui/material';
import dayjs from 'dayjs';
import { profileService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  };
}

function Admin() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [allDailyGenerations, setAllDailyGenerations] = useState([]);
  const [filteredDailyGenerations, setFilteredDailyGenerations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));

  // State for user table sorting and pagination
  const [order, setOrder] = useState('asc');
  const [orderBy, setOrderBy] = useState('id');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  // State for daily generations table sorting and pagination
  const [orderDaily, setOrderDaily] = useState('desc');
  const [orderByDaily, setOrderByDaily] = useState('generation_date');
  const [pageDaily, setPageDaily] = useState(0);
  const [rowsPerPageDaily, setRowsPerPageDaily] = useState(5);

  const userHeadCells = [
    { id: 'id', numeric: true, disablePadding: false, label: 'ID' },
    { id: 'email', numeric: false, disablePadding: false, label: 'Email' },
    { id: 'full_name', numeric: false, disablePadding: false, label: 'Full Name' },
    { id: 'phone', numeric: false, disablePadding: false, label: 'Phone' },
    { id: 'location', numeric: false, disablePadding: false, label: 'Location' },
    { id: 'openai_model', numeric: false, disablePadding: false, label: 'OpenAI Model' },
    { id: 'max_tokens', numeric: true, disablePadding: false, label: 'Max Tokens' },
    { id: 'total_generations', numeric: true, disablePadding: false, label: 'Total Generations' },
  ];

  const dailyGenerationsHeadCells = [
    { id: 'user_id', numeric: true, disablePadding: false, label: 'User ID' },
    { id: 'email', numeric: false, disablePadding: false, label: 'Email' },
    { id: 'generation_date', numeric: false, disablePadding: false, label: 'Date' },
    { id: 'count', numeric: true, disablePadding: false, label: 'Count' },
  ];

  const handleChangeTab = (event, newValue) => {
    setSelectedTab(newValue);
  };

  const handleRequestSort = (event, property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleRequestSortDaily = (event, property) => {
    const isAsc = orderByDaily === property && orderDaily === 'asc';
    setOrderDaily(isAsc ? 'desc' : 'asc');
    setOrderByDaily(property);
  };

  const handleChangePageDaily = (event, newPage) => {
    setPageDaily(newPage);
  };

  const handleChangeRowsPerPageDaily = (event) => {
    setRowsPerPageDaily(parseInt(event.target.value, 10));
    setPageDaily(0);
  };

  const descendingComparator = (a, b, orderBy) => {
    if (b[orderBy] < a[orderBy]) {
      return -1;
    }
    if (b[orderBy] > a[orderBy]) {
      return 1;
    }
    return 0;
  };

  const getComparator = (order, orderBy) => {
    return order === 'desc'
      ? (a, b) => descendingComparator(a, b, orderBy)
      : (a, b) => -descendingComparator(a, b, orderBy);
  };

  const stableSort = (array, comparator) => {
    const stabilizedThis = array.map((el, index) => [el, index]);
    stabilizedThis.sort((a, b) => {
      const order = comparator(a[0], b[0]);
      if (order !== 0) return order;
      return a[1] - b[1];
    });
    return stabilizedThis.map((el) => el[0]);
  };

  const visibleUsers = useMemo(
    () =>
      stableSort(users, getComparator(order, orderBy)).slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage,
      ),
    [order, orderBy, page, rowsPerPage, users],
  );

  const visibleDailyGenerations = useMemo(
    () =>
      stableSort(filteredDailyGenerations, getComparator(orderDaily, orderByDaily)).slice(
        pageDaily * rowsPerPageDaily,
        pageDaily * rowsPerPageDaily + rowsPerPageDaily,
      ),
    [orderDaily, orderByDaily, pageDaily, rowsPerPageDaily, filteredDailyGenerations],
  );

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const usersResponse = await profileService.getAllUsers();
        setUsers(usersResponse.data);

        const dailyGenerationsResponse = await profileService.getDailyGenerations();
        setAllDailyGenerations(dailyGenerationsResponse.data);
        filterGenerationsByDate(dailyGenerationsResponse.data, dayjs().format('YYYY-MM-DD'));

      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.response?.data?.error || 'Failed to fetch data.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  useEffect(() => {
    filterGenerationsByDate(allDailyGenerations, selectedDate);
  }, [selectedDate, allDailyGenerations]);

  const filterGenerationsByDate = (generations, date) => {
    if (!date) {
      setFilteredDailyGenerations(generations);
      return;
    }
    const formattedDate = typeof date === 'string' ? date : date.format('YYYY-MM-DD');
    const filtered = generations.filter(gen => gen.generation_date === formattedDate);
    setFilteredDailyGenerations(filtered);
  };

  const handleDateChange = (event) => {
    setSelectedDate(event.target.value);
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 5, textAlign: 'center' }}>
        <CircularProgress />
        <Typography>Loading data...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 5 }}>
      <Paper elevation={3} sx={{ p: { xs: 2, sm: 4 }, borderRadius: 4, boxShadow: 6, bgcolor: '#fff' }}>
        <Box textAlign="center" mb={4}>
          <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 700, color: 'primary.main' }}>
            Admin Panel
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={selectedTab} onChange={handleChangeTab} aria-label="admin panel tabs">
            <Tab label="All Users" {...a11yProps(0)} />
            <Tab label="Resume Generations" {...a11yProps(1)} />
          </Tabs>
        </Box>

        <TabPanel value={selectedTab} index={0}>
          <Typography variant="h6" gutterBottom>Registered User Information</Typography>
          {users.length === 0 ? (
            <Typography variant="body1" textAlign="center">No users found.</Typography>
          ) : (
            <TableContainer component={Paper} elevation={1}>
              <Table sx={{ minWidth: 650 }} aria-label="user table">
                <TableHead>
                  <TableRow>
                    {userHeadCells.map((headCell) => (
                      <TableCell
                        key={headCell.id}
                        align={headCell.numeric ? 'right' : 'left'}
                        padding={headCell.disablePadding ? 'none' : 'normal'}
                        sortDirection={orderBy === headCell.id ? order : false}
                      >
                        <TableSortLabel
                          active={orderBy === headCell.id}
                          direction={orderBy === headCell.id ? order : 'asc'}
                          onClick={(event) => handleRequestSort(event, headCell.id)}
                        >
                          {headCell.label}
                          {orderBy === headCell.id ? (
                            <Box component="span">
                              {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                            </Box>
                          ) : null}
                        </TableSortLabel>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {visibleUsers.map((row) => {
                    return (
                      <TableRow
                        hover
                        key={row.id}
                        sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                      >
                        <TableCell component="th" scope="row">{row.id}</TableCell>
                        <TableCell>{row.email}</TableCell>
                        <TableCell>{row.full_name}</TableCell>
                        <TableCell>{row.phone}</TableCell>
                        <TableCell>{row.location}</TableCell>
                        <TableCell>{row.openai_model}</TableCell>
                        <TableCell align="right">{row.max_tokens}</TableCell>
                        <TableCell align="right">{row.total_generations || 0}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <TablePagination
                rowsPerPageOptions={[5, 10, 25]}
                component="div"
                count={users.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
              />
            </TableContainer>
          )}
        </TabPanel>

        <TabPanel value={selectedTab} index={1}>
          <Typography variant="h6" gutterBottom>Daily Resume Generations</Typography>
          <Box sx={{ mb: 2 }}>
            <TextField
              label="Select Date"
              type="date"
              value={selectedDate}
              onChange={handleDateChange}
              InputLabelProps={{
                shrink: true,
              }}
              fullWidth
            />
          </Box>
          {filteredDailyGenerations.length === 0 ? (
            <Typography variant="body1" textAlign="center">No daily generation data found for the selected date.</Typography>
          ) : (
            <TableContainer component={Paper} elevation={1}>
              <Table sx={{ minWidth: 650 }} aria-label="daily generations table">
                <TableHead>
                  <TableRow>
                    {dailyGenerationsHeadCells.map((headCell) => (
                      <TableCell
                        key={headCell.id}
                        align={headCell.numeric ? 'right' : 'left'}
                        padding={headCell.disablePadding ? 'none' : 'normal'}
                        sortDirection={orderByDaily === headCell.id ? orderDaily : false}
                      >
                        <TableSortLabel
                          active={orderByDaily === headCell.id}
                          direction={orderByDaily === headCell.id ? orderDaily : 'asc'}
                          onClick={(event) => handleRequestSortDaily(event, headCell.id)}
                        >
                          {headCell.label}
                          {orderByDaily === headCell.id ? (
                            <Box component="span">
                              {orderDaily === 'desc' ? 'sorted descending' : 'sorted ascending'}
                            </Box>
                          ) : null}
                        </TableSortLabel>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {visibleDailyGenerations.map((row) => {
                    return (
                      <TableRow
                        hover
                        key={`${row.user_id}-${row.generation_date}`}
                        sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                      >
                        <TableCell>{row.user_id}</TableCell>
                        <TableCell>{row.email}</TableCell>
                        <TableCell>{row.generation_date}</TableCell>
                        <TableCell align="right">{row.count}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <TablePagination
                rowsPerPageOptions={[5, 10, 25]}
                component="div"
                count={filteredDailyGenerations.length}
                rowsPerPage={rowsPerPageDaily}
                page={pageDaily}
                onPageChange={handleChangePageDaily}
                onRowsPerPageChange={handleChangeRowsPerPageDaily}
              />
            </TableContainer>
          )}
        </TabPanel>
      </Paper>
    </Container>
  );
}

export default Admin; 