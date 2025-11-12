import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService, profileService } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [requiresVerification, setRequiresVerification] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchUserProfile();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUserProfile = async () => {
    try {
      const { data } = await profileService.getProfile();
      setUser(data.user);
      setError(null);
    } catch (err) {
      console.error('Error fetching user profile:', err);
      setError('Failed to fetch user profile');
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password, rememberMe = false) => {
    try {
      const { data } = await authService.login({ email, password, rememberMe });
      const { token } = data;
      localStorage.setItem('token', token);
      await fetchUserProfile();
      return true;
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.error || 'Failed to login');
      return false;
    }
  };

  const register = async (userData) => {
    try {
      const { data } = await authService.register(userData);
      const { token, requiresVerification } = data;
      localStorage.setItem('token', token);
      setRequiresVerification(requiresVerification);
      await fetchUserProfile();
      return true;
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.response?.data?.error || 'Failed to register');
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setError(null);
    setRequiresVerification(false);
  };

  const updateProfile = async (profileData) => {
    try {
      await profileService.updateProfile(profileData);
      await fetchUserProfile();
      return true;
    } catch (err) {
      console.error('Profile update error:', err);
      setError(err.response?.data?.error || 'Failed to update profile');
      return false;
    }
  };

  const verifyEmail = async (token) => {
    try {
      await authService.verifyEmail(token);
      setRequiresVerification(false);
      return true;
    } catch (err) {
      console.error('Email verification error:', err);
      setError(err.response?.data?.error || 'Failed to verify email');
      return false;
    }
  };

  const forgotPassword = async (email) => {
    try {
      await authService.forgotPassword(email);
      return true;
    } catch (err) {
      console.error('Forgot password error:', err);
      setError(err.response?.data?.error || 'Failed to process password reset request');
      return false;
    }
  };

  const resetPassword = async (token, newPassword) => {
    try {
      await authService.resetPassword(token, newPassword);
      return true;
    } catch (err) {
      console.error('Password reset error:', err);
      setError(err.response?.data?.error || 'Failed to reset password');
      return false;
    }
  };

  const value = {
    user,
    loading,
    error,
    requiresVerification,
    login,
    register,
    logout,
    updateProfile,
    verifyEmail,
    forgotPassword,
    resetPassword
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 