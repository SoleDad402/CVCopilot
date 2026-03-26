import axios from 'axios';

// Create axios instance with default config
const api = axios.create({
  // Prefer env var; fallback to your server. Keep '/api' in calls below.
  baseURL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:4090',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 Unauthorized errors — but not on auth endpoints (login/register)
    const url = error.config?.url || '';
    const isAuthEndpoint = url.includes('/api/auth/');
    if (error.response?.status === 401 && !isAuthEndpoint) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API endpoints
export const resumeService = {
  generateResume: (payload) =>
    // payload: { jobDescription, companyName, role, version }
    api.post('/api/generate-resume', payload),
  
  getJobStatus: (jobId) => 
    api.get(`/api/status/${jobId}`),
  
  getJobResults: (jobId, options = {}) => 
    api.get(`/api/results/${jobId}`, options),
  
  saveResume: (resumeData) => 
    api.post('/api/save-resume', resumeData),
  
  getResume: (id) => 
    api.get(`/api/resume/${id}`),
  
  downloadResume: (id) => 
    api.get(`/api/resume/${id}/download`, { responseType: 'blob' })
};

export const coverLetterService = {
  generateCoverLetter: (payload) =>
    // payload: { jobDescription, companyName, role, resume }
    api.post('/api/generate-cover-letter', payload),
  
  getJobStatus: (jobId) => 
    api.get(`/api/status/${jobId}`),
  
  getJobResults: (jobId, options = {}) => 
    api.get(`/api/results/${jobId}`, options)
};

export const authService = {
  login: (credentials) => 
    api.post('/api/auth/login', credentials),
  
  register: (userData) => 
    api.post('/api/auth/register', userData),
  
  forgotPassword: (email) => 
    api.post('/api/auth/forgot-password', { email }),
  
  resetPassword: (token, newPassword) => 
    api.post('/api/auth/reset-password', { token, newPassword }),
  
  verifyEmail: (token) => 
    api.get(`/api/auth/verify-email?token=${token}`)
};

export const profileService = {
  getProfile: () => 
    api.get('/api/profile'),
  
  updateProfile: (profileData) => 
    api.put('/api/profile', profileData),
  
  getOpenAISettings: () =>
    api.get('/api/settings'),
  
  updateOpenAISettings: (settingsData) =>
    api.put('/api/settings', settingsData),

  getAllUsers: () =>
    api.get('/api/admin/users'),

  getDailyGenerations: () =>
    api.get('/api/admin/daily-generations'),

  getAdminStats: () =>
    api.get('/api/admin/stats'),

  updateUser: (userId, userData) =>
    api.put(`/api/admin/users/${userId}`, userData),

  deleteUser: (userId) =>
    api.delete(`/api/admin/users/${userId}`),

  getAllRequests: () =>
    api.get('/api/admin/requests'),

  getUserActivity: (userId) =>
    api.get(`/api/admin/users/${userId}/activity`),

  getEmploymentHistory: () => 
    api.get('/api/profile/employment'),
  
  getEducation: () => 
    api.get('/api/profile/education'),

  addEducation: (educationData) =>
    api.post('/api/education', educationData),

  updateEducation: (id, educationData) =>
    api.put(`/api/education/${id}`, educationData),

  deleteEducation: (id) =>
    api.delete(`/api/education/${id}`)
};

export const employmentService = {
  addEmployment: (employmentData) => 
    api.post('/api/employment', employmentData),
  
  updateEmployment: (id, employmentData) => 
    api.put(`/api/employment/${id}`, employmentData),
  
  deleteEmployment: (id) => 
    api.delete(`/api/employment/${id}`)
};

export const qaService = {
  askQuestion: (question, jobDescription, resume) =>
    api.post('/api/ask-question', { question, jobDescription, resume })
};

// History
export const historyService = {
  getHistory: () => api.get('/api/history')
};

// Utility function for polling job status
export const pollJobStatus = async (jobId, onProgress, maxAttempts = 80, interval = 2000) => {
  let attempts = 0;

  // Helper to sleep
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  while (attempts < maxAttempts) {
    try {
      const response = await resumeService.getJobStatus(jobId);
      const { status, progress, error, stepLabel } = response.data;

      if (onProgress) {
        onProgress({ status, progress, error, stepLabel });
      }

      if (status === 'completed') {
        console.log('Job completed, fetching results...');
        const results = await resumeService.getJobResults(jobId, { timeout: 120000 }); // allow up to 120s for large payload
        console.log('Results received:', results);
        return results.data;
      }

      if (status === 'failed') {
        throw new Error(error || 'Job failed');
      }

      attempts += 1;
      await sleep(interval);
    } catch (err) {
      if (onProgress) {
        onProgress({ status: 'error', error: err.message });
      }
      throw err;
    }
  }

  throw new Error('Job timeout - maximum polling attempts reached');
};

export default api; 