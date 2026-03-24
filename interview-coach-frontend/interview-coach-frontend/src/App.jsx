import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Welcome from './pages/Welcome';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ForgotPassword from './pages/ForgotPassword';  // ADD
import ResetPassword from './pages/ResetPassword'; 
import QuestionSetup from './pages/QuestionSetup';
import InterviewSession from './pages/InterviewSession';
import SessionDetails from './pages/SessionDetails';
import SessionSummary from './pages/SessionSummary';
import FeedbackReport from './pages/FeedbackReport';
import ResumeAnalysis from './pages/ResumeAnalysis';



function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/resume-analysis" element={<ProtectedRoute><ResumeAnalysis /></ProtectedRoute>} />
          <Route path="/question-setup" element={<ProtectedRoute><QuestionSetup /></ProtectedRoute>} />
          <Route path="/interview-session" element={<ProtectedRoute><InterviewSession /> </ProtectedRoute>} />
          <Route path="/interview-session/:id" element={<ProtectedRoute><InterviewSession /> </ProtectedRoute>} />
          <Route path="/session-details/:id" element={<ProtectedRoute><SessionDetails /></ProtectedRoute>} />
          <Route path="/session-summary/:id" element={<ProtectedRoute><SessionSummary /></ProtectedRoute>} />
          <Route 
            path="/feedback-report/:id" 
            element={<ProtectedRoute><FeedbackReport /></ProtectedRoute>} 
          />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
