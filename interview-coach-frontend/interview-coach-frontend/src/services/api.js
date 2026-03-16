import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if it exists
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

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      console.log('Unauthorized - Token expired or invalid');
      
      // Clear auth data
      localStorage.removeItem('token');
      localStorage.removeItem('tokenExpiry');
      
      // Use global logout if available (from AuthContext)
      if (window.authLogout) {
        window.authLogout();
      } else {
        // Fallback: redirect to login
        window.location.href = '/login';
      }
    }
    
    // Handle other errors
    if (error.response?.status === 403) {
      console.error('Access forbidden');
    }
    
    if (error.response?.status >= 500) {
      console.error('Server error:', error.response?.data?.detail);
    }
    
    return Promise.reject(error);
  }
);

// Authentication APIs
export const authAPI = {
  register: (data) => api.post('/api/auth/register', data),
  login: (data) => api.post('/api/auth/login', data),
};

// User APIs
export const userAPI = {
  getProfile: () => api.get('/api/users/me'),
  updateProfile: (data) => api.put('/api/users/me', data),
};

// Resume APIs
export const resumeAPI = {
  upload: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/api/resume/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  get: () => api.get('/api/resume/'),
  delete: () => api.delete('/api/resume/'),
};

// API for fetching and generating questions
export const questionsAPI = {
  generate: (data) => api.post('/api/questions/generate', data),
  getCategories: () => api.get('/api/questions/categories'),
  getByCategory: (categoryId, difficulty = null) => {
    let url = `/api/questions/by-category/${categoryId}`;
    if (difficulty) url += `?difficulty=${difficulty}`;
    return api.get(url);
  },
};

// Stats APIs
export const statsAPI = {
  getDashboard: () => api.get('/api/stats/dashboard'),
  getPerformanceHistory: () => api.get('/api/stats/performance-history'),
  getCategoryBreakdown: () => api.get('/api/stats/category-breakdown'),
};

// Session APIs
export const sessionsAPI = {
  start: (data) => api.post('/api/sessions/start', data),
  getSession: (sessionId) => api.get(`/api/sessions/${sessionId}`),
  submitAnswer: (sessionId, data) => api.post(`/api/sessions/${sessionId}/answer`, data),
  complete: (sessionId) => api.post(`/api/sessions/${sessionId}/complete`),
  getUserHistory: () => api.get('/api/sessions/user/history'),
  getSessionDetails: (sessionId) => api.get(`/api/sessions/${sessionId}`),
};

// Evaluation API
export const evaluationAPI = {
  // Evaluate all answers in a session
  evaluateSession: (sessionId) => 
    api.post('/api/evaluation/evaluate-session', { session_id: sessionId }),
  
  // Evaluate a single answer
  evaluateAnswer: (sessionQuestionId) => 
    api.post('/api/evaluation/evaluate-answer', { session_question_id: sessionQuestionId }),
  
  // Get evaluation results
  getResults: (sessionId) => 
    api.get(`/api/evaluation/results/${sessionId}`)
};

export const analyticsAPI = {
  getPerformanceTrends: () => api.get('/api/analytics/performance-trends'),
  getCategoryPerformance: () => api.get('/api/analytics/category-performance'),
  getStrengthsWeaknesses: () => api.get('/api/analytics/strengths-weaknesses'),
  getOverallStats: () => api.get('/api/analytics/overall-stats')
};

// Add audio API
export const audioAPI = {
  // Upload audio recording for a session question
  upload: (sessionQuestionId, formData) => 
    api.post(`/api/audio/upload/${sessionQuestionId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),
  
  // Get audio recording
  get: (sessionQuestionId) => 
    api.get(`/api/audio/${sessionQuestionId}`, {
      responseType: 'blob'
    }),
  
  // Delete audio recording
  delete: (sessionQuestionId) => 
    api.delete(`/api/audio/${sessionQuestionId}`)
};

// Video APIs
export const videoAPI = {
  // ⭐ NEW - Upload session video (full interview)
  uploadSession: (sessionId, formData) => 
    api.post(`/api/sessions/${sessionId}/video`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  
  // ⭐ NEW - Get session video metrics
  getSessionMetrics: (sessionId) => 
    api.get(`/api/sessions/${sessionId}/video/metrics`),
  
  // ⭐ NEW - Delete session video
  deleteSessionVideo: (sessionId) => 
    api.delete(`/api/sessions/${sessionId}/video`),
  
  // Old per-question methods (can keep for backward compatibility)
  upload: (sessionQuestionId, formData) => 
    api.post(`/api/video/upload/${sessionQuestionId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  
  get: (sessionQuestionId) => 
    api.get(`/api/video/${sessionQuestionId}`, {
      responseType: 'blob'
    }),
  
  delete: (sessionQuestionId) => 
    api.delete(`/api/video/${sessionQuestionId}`)
};

export default api;
