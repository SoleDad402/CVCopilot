import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline, Box, CircularProgress } from '@mui/material';
import { createTheme } from '@mui/material/styles';
import Home from './pages/Home';
import Navbar from './components/Navbar';
import LoginPage from './components/auth/Login';
import RegisterPage from './components/auth/Register';
import ForgotPasswordPage from './components/auth/ForgotPassword';
import ResetPasswordPage from './components/auth/ResetPassword';
import ProfilePage from './components/profile/Profile';
import ResumePreview from './pages/ResumePreview';
import ResumeEditor from './components/ResumeEditor';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { GenerationProvider } from './contexts/GenerationContext';
import theme from './theme';
import Admin from './pages/Admin';
import History from './pages/History';
import JobTracker from './pages/JobTracker';
import Dashboard from './pages/Dashboard';
import Landing from './pages/Landing';
import AutoBidTest from './pages/AutoBidTest';

// Protected Route component
const ProtectedRoute = ({ children, component: Component, adminOnly = false }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (adminOnly && !user.is_admin) {
    return <Navigate to="/" />;
  }

  return Component ? <Component /> : children;
};

// Home route — Landing for guests, Dashboard for signed-in users
const HomeRoute = () => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  return user ? <Dashboard /> : <Landing />;
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <GenerationProvider>
        <Router>
          <Navbar />
          <Routes>
            <Route path="/" element={<HomeRoute />} />
            <Route path="/generator" element={<Home />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/preview" element={<ResumePreview />} />
            <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
            <Route path="/tracker" element={<ProtectedRoute><JobTracker /></ProtectedRoute>} />
            <Route
              path="/editor" 
              element={
                <ProtectedRoute>
                  <ResumeEditor />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/profile" 
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              } 
            />
            <Route path="/autobid" element={<ProtectedRoute><AutoBidTest /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute adminOnly component={Admin} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
        </GenerationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App; 