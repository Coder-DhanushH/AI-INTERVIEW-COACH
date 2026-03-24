import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { userAPI, resumeAPI, statsAPI, sessionsAPI } from '../services/api';

const COLORS = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [activeView, setActiveView] = useState('dashboard'); // Now supports: 'dashboard', 'profile', 'editProfile', 'history'
  const [performanceHistory, setPerformanceHistory] = useState([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState([]);
  const [showGraphs, setShowGraphs] = useState(false);

  // Session history state
  const [sessionHistory, setSessionHistory] = useState({
    total_sessions: 0,
    completed_count: 0,
    in_progress_count: 0,
    category_breakdown: [],
    sessions: []
  });
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(null);
  
  // Stats state
  const [stats, setStats] = useState({
    practiceSessions: 0,
    interviewsCompleted: 0,
    performanceRating: 0,
    improvement: 0,
    progressThisWeek: 0,
  });
  const [statsLoading, setStatsLoading] = useState(false);
  
  // Profile state
  const [profileData, setProfileData] = useState({
    full_name: '',
    phone: '',
    experience_years: '',
    role: '',
    github_link: '',
    linkedin_link: '',
  });
  const [resume, setResume] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);
  const [resumeData, setResumeData] = useState(null);

  useEffect(() => {
    if (user) {
      setProfileData({
        full_name: user.full_name || '',
        phone: user.phone || '',
        experience_years: user.experience_years || '',
        role: user.role || '',
        github_link: user.github_link || '',
        linkedin_link: user.linkedin_link || '',
      });
      if (user.resume) {
        setResume(user.resume);
      }
      
      // Fetch dashboard stats
      fetchDashboardStats();
      // Fetch performance data for graphs
      fetchPerformanceData();
       // Fetch resume data with extracted skills
      fetchResumeData();
    }
  }, [user]);

  const fetchDashboardStats = async () => {
    try {
      setStatsLoading(true);
      const response = await statsAPI.getDashboard();
      const data = response.data;
      
      setStats({
        practiceSessions: data.practice_sessions,
        interviewsCompleted: data.interviews_completed,
        performanceRating: data.performance_rating,
        improvement: data.improvement,
        progressThisWeek: data.progress_this_week,
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      // Keep default stats if API fails
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchPerformanceData = async () => {
    try {
      // Fetch performance history
      const historyResponse = await statsAPI.getPerformanceHistory();
      setPerformanceHistory(historyResponse.data.history);
      
      // Fetch category breakdown
      const categoryResponse = await statsAPI.getCategoryBreakdown();
      setCategoryBreakdown(categoryResponse.data.breakdown);
    } catch (error) {
      console.error('Failed to fetch performance data:', error);
    }
  };

  const fetchSessionHistory = async () => {
    try {
      setHistoryLoading(true);
      setHistoryError(null);
      const response = await sessionsAPI.getUserHistory();
      console.log('Session history response:', response.data);
      setSessionHistory(response.data);
    } catch (error) {
      console.error('Failed to fetch session history:', error);
      setHistoryError(error.response?.data?.detail || error.message || 'Failed to load history. Please try again.');
      // Reset to empty state on error
      setSessionHistory({
        total_sessions: 0,
        completed_count: 0,
        in_progress_count: 0,
        category_breakdown: [],
        sessions: []
      });
    } finally {
      setHistoryLoading(false);
    }
  };

  // Call in useEffect
  useEffect(() => {
    if (user && activeView === 'history') {
      fetchSessionHistory();
    }
  }, [user, activeView]);


  const fetchResumeData = async () => {
    try {
      const response = await resumeAPI.get();
      if (response.data) {
        setResumeData(response.data);
        setResume(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch resume:', error);
      // Resume might not exist yet, that's okay
    }
  };

  const handleProfileChange = (e) => {
    setProfileData({
      ...profileData,
      [e.target.name]: e.target.value,
    });
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      await userAPI.updateProfile(profileData);
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      window.location.reload();
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.detail || 'Failed to update profile' 
      });
    }
    setLoading(false);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        setMessage({ type: 'error', text: 'Please select a PDF file' });
        return;
      }
      if (file.size > 5242880) {
        setMessage({ type: 'error', text: 'File size must be less than 5MB' });
        return;
      }
      setSelectedFile(file);
      setMessage({ type: '', text: '' });
    }
  };

  const handleResumeUpload = async () => {
    if (!selectedFile) {
      setMessage({ type: 'error', text: 'Please select a file first' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await resumeAPI.upload(selectedFile);
      setResume(response.data);
      setSelectedFile(null);
      setMessage({ type: 'success', text: 'Resume uploaded successfully!' });
      document.getElementById('resume-upload').value = '';
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.detail || 'Failed to upload resume' 
      });
    }
    setLoading(false);
  };

  const handleResumeDelete = async () => {
    if (!window.confirm('Are you sure you want to delete your resume?')) {
      return;
    }

    setLoading(true);
    try {
      await resumeAPI.delete();
      setResume(null);
      setMessage({ type: 'success', text: 'Resume deleted successfully!' });
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.detail || 'Failed to delete resume' 
      });
    }
    setLoading(false);
  };

  const renderPieChart = () => {
    return categoryBreakdown.map((entry, index) => ({
      ...entry,
      fill: COLORS[index % COLORS.length]
    }));
  };
  
  const formattedData = renderPieChart();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">AI</span>
              </div>
              <span className="text-xl font-bold text-gray-900">Interview Coach</span>
            </div>

            {/* User Profile */}
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center space-x-3 focus:outline-none"
              >
                <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold">
                    {user?.username?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="text-left hidden md:block">
                  <p className="text-sm font-semibold text-gray-900">{user?.username}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-10">
                  <button
                    onClick={() => {
                      setActiveView('profile');
                      setShowProfileMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span>View Profile</span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveView('dashboard');
                      setShowProfileMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    <span>Dashboard</span>
                  </button>
                  <hr className="my-2" />
                  <button
                    onClick={logout}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeView === 'dashboard' ? (
          <>
            {/* Welcome Section */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome back, {user?.username}!</h1>
              <p className="text-gray-600">Ready to ace your next interview? Let's get started!</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
              {/* Practice Sessions */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-600">Practice Sessions</p>
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <p className="text-3xl font-bold text-gray-900">{stats.practiceSessions}</p>
              </div>

              {/* Interviews Completed */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-600">Interviews Completed</p>
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-3xl font-bold text-gray-900">{stats.interviewsCompleted}</p>
              </div>

              {/* Performance Rating */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-600">Performance Rating</p>
                  <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>
                <p className="text-3xl font-bold text-gray-900">{stats.performanceRating}/5</p>
              </div>

              {/* Improvement */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-600">Improvement</p>
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <p className={`text-3xl font-bold ${stats.improvement >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {stats.improvement >= 0 ? '+' : ''}{stats.improvement}%
                </p>
              </div>

              {/* Progress This Week */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-600">Progress This Week</p>
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <p className="text-3xl font-bold text-gray-900">{stats.progressThisWeek}</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* New Interview */}
                <button 
                  onClick={() => navigate('/question-setup')}                  
                  className="flex items-center space-x-4 p-4 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors">
                  <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="font-semibold">New Interview</p>
                    <p className="text-sm opacity-90">Start a practice session</p>
                  </div>
                </button>

                <button 
                  onClick={() => navigate('/resume-analysis')}
                  className="flex items-center space-x-4 p-4 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors"
                >
                  <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="font-semibold">Resume Analysis</p>
                    <p className="text-sm opacity-90">Get AI-powered feedback</p>
                  </div>
                </button>

                {/* Interview History - NEW ⭐ */}
                <button 
                  onClick={() => setActiveView('history')}
                  className="flex items-center space-x-4 p-4 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg transition-colors"
                >
                  <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="font-semibold">History</p>
                    <p className="text-sm text-gray-600">Past sessions</p>
                  </div>
                </button>

                {/* Complete Profile */}
                <button 
                  onClick={() => setActiveView('editProfile')}
                  className="flex items-center space-x-4 p-4 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg transition-colors"
                >
                  <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="font-semibold">Complete Your Profile</p>
                    <p className="text-sm text-gray-600">Add resume & details</p>
                  </div>
                </button>

                {/* View Analytics */}
                <button 
                  onClick={() => {
                    setShowGraphs(true);
                    // Scroll to graphs
                    setTimeout(() => {
                      document.querySelector('.performance-analytics')?.scrollIntoView({ 
                        behavior: 'smooth' 
                      });
                    }, 100);
                  }}
                  className="flex items-center space-x-4 p-4 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg transition-colors"
                >
                  <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="font-semibold">View Analytics</p>
                    <p className="text-sm text-gray-600">Track your progress</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Performance Graphs Section */}
            {activeView === 'dashboard' && (
              <div className="mt-8">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Performance Analytics</h2>
                  <button
                    onClick={() => setShowGraphs(!showGraphs)}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center space-x-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <span>{showGraphs ? 'Hide' : 'Show'} Graphs</span>
                  </button>
                </div>

                {showGraphs && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    
                    {/* Line Chart - 7 Day Activity */}
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">7-Day Activity</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={performanceHistory}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="day" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="sessions" stroke="#2563EB" name="Sessions Started" strokeWidth={2} />
                          <Line type="monotone" dataKey="completed" stroke="#10B981" name="Sessions Completed" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Bar Chart - Questions Answered */}
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Questions Answered (7 Days)</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={performanceHistory}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="day" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="questions_answered" fill="#2563EB" name="Questions" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Pie Chart - Category Distribution */}
                    {categoryBreakdown.length > 0 && (
                      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Interview Categories</h3>
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie
                              data={formattedData}
                              dataKey="sessions"
                              nameKey="category"
                              cx="50%"
                              cy="50%"
                              outerRadius={100}
                              label={(entry) => `${entry.category}: ${entry.sessions}`}
                            >
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    {/* Performance Summary Card */}
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Summary</h3>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Completion Rate</span>
                          <span className="text-2xl font-bold text-primary">
                            {stats.practiceSessions > 0 
                              ? Math.round((stats.interviewsCompleted / stats.practiceSessions) * 100)
                              : 0}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full"
                            style={{ 
                              width: `${stats.practiceSessions > 0 
                                ? (stats.interviewsCompleted / stats.practiceSessions) * 100 
                                : 0}%` 
                            }}
                          />
                        </div>

                        <div className="pt-4 border-t">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-gray-600">Total Time Practicing</span>
                            <span className="text-xl font-bold text-gray-900">
                              {Math.round(stats.practiceSessions * 15)} min
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">Avg. Session Time</span>
                            <span className="text-xl font-bold text-gray-900">15 min</span>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                )}
              </div>
            )}

          </>
        ) : activeView === 'profile' ? (
          /* View Profile (Read-Only) */
          <div className="max-w-4xl mx-auto">
            <div className="mb-6 flex justify-between items-center">
              <button
                onClick={() => setActiveView('dashboard')}
                className="flex items-center text-primary hover:text-primary-dark"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Dashboard
              </button>
              <button
                onClick={() => setActiveView('editProfile')}
                className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>Edit Profile</span>
              </button>
            </div>

            {/* Profile Information Card */}
            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200 mb-6">
              <div className="flex items-center space-x-6 mb-8">
                <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-4xl">
                    {user?.username?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-gray-900">{user?.full_name || user?.username}</h2>
                  <p className="text-gray-600">{user?.email}</p>
                  {user?.role && <p className="text-primary font-semibold mt-1">{user?.role}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Contact Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Contact Information
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center text-gray-700">
                      <span className="font-medium w-32">Email:</span>
                      <span>{user?.email}</span>
                    </div>
                    <div className="flex items-center text-gray-700">
                      <span className="font-medium w-32">Phone:</span>
                      <span>{user?.phone || 'Not provided'}</span>
                    </div>
                    <div className="flex items-center text-gray-700">
                      <span className="font-medium w-32">Username:</span>
                      <span>{user?.username}</span>
                    </div>
                  </div>
                </div>

                {/* Professional Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Professional Details
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center text-gray-700">
                      <span className="font-medium w-32">Target Role:</span>
                      <span>{user?.role || 'Not specified'}</span>
                    </div>
                    <div className="flex items-center text-gray-700">
                      <span className="font-medium w-32">Experience:</span>
                      <span>{user?.experience_years ? `${user.experience_years} years` : 'Not specified'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Social Links */}
              {(user?.github_link || user?.linkedin_link) && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    Social Links
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {user?.github_link && (
                      <a
                        href={user.github_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                        </svg>
                        <span>GitHub</span>
                      </a>
                    )}
                    {user?.linkedin_link && (
                      <a
                        href={user.linkedin_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                        </svg>
                        <span>LinkedIn</span>
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Resume Section with Skills */}
            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Resume</h2>
              
              {resume ? (
                <>
                  {/* Resume File Info */}
                  <div className="bg-gray-50 rounded-lg p-6 mb-6">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{resume.filename}</p>
                        <p className="text-sm text-gray-500">Uploaded: {new Date(resume.uploaded_at).toLocaleDateString()}</p>
                      </div>
                      <button
                        onClick={() => setActiveView('editProfile')}
                        className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors"
                      >
                        Update Resume
                      </button>
                    </div>
                  </div>

                  {/* Extracted Skills Section - NEW ⭐ */}
                  { resumeData?.extracted_skills && Object.keys( resumeData?.extracted_skills).length > 0 && (
                    <div className="border-t pt-6">
                      <div className="flex items-center mb-4">
                        <svg className="w-6 h-6 text-primary mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        <h3 className="text-xl font-bold text-gray-900">Extracted Skills</h3>
                      </div>

                      <div className="space-y-4">
                        {/* Programming Languages */}
                        { resumeData?.extracted_skills.programming_languages && (
                          <div>
                            <h4 className="text-sm font-semibold text-gray-700 mb-2">
                              Programming Languages
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              { resumeData?.extracted_skills.programming_languages.map((skill, index) => (
                                <span
                                  key={index}
                                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium"
                                >
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Frameworks & Libraries */}
                        { resumeData?.extracted_skills.frameworks_libraries && (
                          <div>
                            <h4 className="text-sm font-semibold text-gray-700 mb-2">
                              Frameworks & Libraries
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              { resumeData?.extracted_skills.frameworks_libraries.map((skill, index) => (
                                <span
                                  key={index}
                                  className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium"
                                >
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Databases */}
                        { resumeData?.extracted_skills.databases && (
                          <div>
                            <h4 className="text-sm font-semibold text-gray-700 mb-2">
                              Databases
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              { resumeData?.extracted_skills.databases.map((skill, index) => (
                                <span
                                  key={index}
                                  className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium"
                                >
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Cloud & DevOps */}
                        { resumeData?.extracted_skills.cloud_devops && (
                          <div>
                            <h4 className="text-sm font-semibold text-gray-700 mb-2">
                              Cloud & DevOps
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              { resumeData?.extracted_skills.cloud_devops.map((skill, index) => (
                                <span
                                  key={index}
                                  className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium"
                                >
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Tools */}
                        { resumeData?.extracted_skills.tools && (
                          <div>
                            <h4 className="text-sm font-semibold text-gray-700 mb-2">
                              Tools & Technologies
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              { resumeData?.extracted_skills.tools.map((skill, index) => (
                                <span
                                  key={index}
                                  className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium"
                                >
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Soft Skills */}
                        { resumeData?.extracted_skills.soft_skills && (
                          <div>
                            <h4 className="text-sm font-semibold text-gray-700 mb-2">
                              Soft Skills
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              { resumeData?.extracted_skills.soft_skills.map((skill, index) => (
                                <span
                                  key={index}
                                  className="px-3 py-1 bg-pink-100 text-pink-700 rounded-full text-sm font-medium"
                                >
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Summary Count */}
                      <div className="mt-6 pt-6 border-t">
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <div className="text-2xl font-bold text-primary">
                              {Object.values( resumeData?.extracted_skills).flat().length}
                            </div>
                            <div className="text-sm text-gray-600">Total Skills</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-primary">
                              {Object.keys( resumeData?.extracted_skills).length}
                            </div>
                            <div className="text-sm text-gray-600">Categories</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-primary">
                              { resumeData?.extracted_skills.programming_languages?.length || 0}
                            </div>
                            <div className="text-sm text-gray-600">Languages</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="mb-4">No resume uploaded yet</p>
                  <button
                    onClick={() => setActiveView('editProfile')}
                    className="px-6 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors"
                  >
                    Upload Resume
                  </button>
                </div>
              )}
            </div>
          </div>
        ): activeView === 'history' ?(
          <div className="max-w-6xl mx-auto">
            <div className="mb-6">
              <button
                onClick={() => setActiveView('dashboard')}
                className="flex items-center text-primary hover:text-primary-dark"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Dashboard
              </button>
            </div>

            <h1 className="text-3xl font-bold text-gray-900 mb-8">Interview History</h1>

            {/* Loading State */}
            {historyLoading && (
              <div className="bg-white rounded-xl p-8 shadow-sm border text-center">
                <div className="flex justify-center mb-4">
                  <div className="animate-spin">
                    <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <p className="text-gray-600">Loading your interview history...</p>
              </div>
            )}

            {/* Error State */}
            {historyError && !historyLoading && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
                <div className="flex items-start">
                  <svg className="w-6 h-6 text-red-600 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4v2m0-12a9 9 0 110 18 9 9 0 010-18z" />
                  </svg>
                  <div className="flex-1">
                    <h3 className="text-red-900 font-semibold mb-1">Failed to Load History</h3>
                    <p className="text-red-800 text-sm mb-4">{historyError}</p>
                    <button
                      onClick={fetchSessionHistory}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Summary Cards */}
            {!historyLoading && !historyError && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-white rounded-xl p-6 shadow-sm border">
                    <div className="text-sm text-gray-600 mb-1">Total Sessions</div>
                    <div className="text-3xl font-bold text-gray-900">
                      {sessionHistory.total_sessions}
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-6 shadow-sm border">
                    <div className="text-sm text-gray-600 mb-1">Completed</div>
                    <div className="text-3xl font-bold text-green-600">
                      {sessionHistory.completed_count}
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-6 shadow-sm border">
                    <div className="text-sm text-gray-600 mb-1">In Progress</div>
                    <div className="text-3xl font-bold text-yellow-600">
                      {sessionHistory.in_progress_count}
                    </div>
                  </div>
                </div>

                {/* Category Breakdown */}
                <div className="bg-white rounded-xl p-6 shadow-sm border mb-8">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Sessions by Category</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {sessionHistory.category_breakdown.map((cat, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-4">
                        <div className="text-2xl font-bold text-primary">{cat.count}</div>
                        <div className="text-sm text-gray-600">{cat.category}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Sessions List */}
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Sessions</h2>
              
              {sessionHistory.sessions.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-lg font-semibold mb-2">No sessions yet</p>
                  <p className="mb-4">Start your first interview to see history here</p>
                  <button
                    onClick={() => navigate('/question-setup')}
                    className="px-6 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg"
                  >
                    Start New Interview
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {sessionHistory.sessions.map((session) => (
                    <div key={session.id} className="border rounded-lg p-4 hover:bg-gray-50 transition">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                              session.status === 'completed' 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {session.status === 'completed' ? '✓ Completed' : '⏸ In Progress'}
                            </span>
                            <span className="text-lg font-semibold text-gray-900">
                              {session.category}
                            </span>
                            <span className={`text-sm px-2 py-1 rounded ${
                              session.difficulty === 'Easy' ? 'bg-green-100 text-green-700' :
                              session.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {session.difficulty}
                            </span>
                          </div>
                          
                          <div className="text-sm text-gray-600 space-y-1">
                            <div>
                              <strong>Questions:</strong> {session.completed_questions}/{session.total_questions} answered
                            </div>
                            <div>
                              <strong>Started:</strong> {new Date(session.started_at).toLocaleString()}
                            </div>
                            {session.completed_at && (
                              <div>
                                <strong>Duration:</strong> {Math.round(session.duration_minutes)} minutes
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex space-x-2">
                          {session.status === 'in_progress' && (
                            <button
                              onClick={() => navigate(`/interview-session/${session.id}`)}
                              className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm"
                            >
                              Resume
                            </button>
                          )}
                          <button
                            onClick={() => navigate(`/session-details/${session.id}`)}
                            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm"
                          >
                            View Details
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Edit Profile View */
          <div className="max-w-4xl mx-auto">
            <div className="mb-6">
              <button
                onClick={() => setActiveView('dashboard')}
                className="flex items-center text-primary hover:text-primary-dark"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Dashboard
              </button>
            </div>

            {message.text && (
              <div className={`mb-6 px-4 py-3 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {message.text}
              </div>
            )}

            {/* Profile Form */}
            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200 mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Complete Your Profile</h2>
              <form onSubmit={handleProfileUpdate} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
                    <input
                      type="text"
                      name="full_name"
                      value={profileData.full_name}
                      onChange={handleProfileChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
                    <input
                      type="tel"
                      name="phone"
                      value={profileData.phone}
                      onChange={handleProfileChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Years of Experience</label>
                    <input
                      type="number"
                      name="experience_years"
                      value={profileData.experience_years}
                      onChange={handleProfileChange}
                      min="0"
                      max="50"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Target Role</label>
                    <select
                      name="role"
                      value={profileData.role}
                      onChange={handleProfileChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    >
                      <option value="">Select a role</option>
                      <option value="Software Developer">Software Developer</option>
                      <option value="Data Scientist">Data Scientist</option>
                      <option value="Product Manager">Product Manager</option>
                      <option value="Marketing Manager">Marketing Manager</option>
                      <option value="Business Analyst">Business Analyst</option>
                      <option value="DevOps Engineer">DevOps Engineer</option>
                      <option value="UI/UX Designer">UI/UX Designer</option>
                      <option value="Sales Executive">Sales Executive</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">GitHub Profile</label>
                  <input
                    type="url"
                    name="github_link"
                    value={profileData.github_link}
                    onChange={handleProfileChange}
                    placeholder="https://github.com/username"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">LinkedIn Profile</label>
                  <input
                    type="url"
                    name="linkedin_link"
                    value={profileData.linkedin_link}
                    onChange={handleProfileChange}
                    placeholder="https://linkedin.com/in/username"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
                >
                  {loading ? 'Updating...' : 'Update Profile'}
                </button>
              </form>
            </div>

            {/* Resume Upload */}
            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Upload Your Resume</h2>
              
              {resume ? (
                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{resume.filename}</p>
                        <p className="text-sm text-gray-500">Uploaded: {new Date(resume.uploaded_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <button
                      onClick={handleResumeDelete}
                      disabled={loading}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <label htmlFor="resume-upload" className="cursor-pointer">
                      <span className="text-primary hover:text-primary-dark font-semibold">Click to upload</span>
                      <span className="text-gray-600"> or drag and drop</span>
                    </label>
                    <p className="text-sm text-gray-500 mt-2">PDF file only (max 5MB)</p>
                    <input
                      type="file"
                      id="resume-upload"
                      accept=".pdf"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>

                  {selectedFile && (
                    <div className="mt-4 flex items-center justify-between bg-gray-50 p-4 rounded-lg">
                      <span className="text-gray-700">{selectedFile.name}</span>
                      <button
                        onClick={handleResumeUpload}
                        disabled={loading}
                        className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors disabled:opacity-50"
                      >
                        {loading ? 'Uploading...' : 'Upload'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
