import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { sessionsAPI } from '../services/api';

const SessionSummary = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSessionSummary();
  }, [id]);

  const fetchSessionSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await sessionsAPI.getSession(id);
      console.log('Session summary:', response.data);
      setSession(response.data);
    } catch (error) {
      console.error('Failed to fetch session summary:', error);
      setError(error.response?.data?.detail || 'Failed to load session summary');
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const calculateStats = () => {
    if (!session) return null;

    const answeredQuestions = session.questions.filter(q => q.answer_text).length;
    const completionRate = (answeredQuestions / session.total_questions) * 100;
    
    // Calculate average score (if scores are available)
    const questionsWithScores = session.questions.filter(q => q.score !== null);
    const avgScore = questionsWithScores.length > 0
      ? questionsWithScores.reduce((sum, q) => sum + q.score, 0) / questionsWithScores.length
      : null;

    // Calculate total time
    const totalTime = session.questions.reduce((sum, q) => sum + (q.time_taken || 0), 0);
    const avgTimePerQuestion = totalTime / answeredQuestions;

    return {
      answeredQuestions,
      completionRate,
      avgScore,
      totalTime,
      avgTimePerQuestion
    };
  };

  const stats = calculateStats();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-16 h-16 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading your results...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-8">
        <div className="max-w-md w-full bg-white rounded-xl p-8 shadow-lg text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Unable to Load Results</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 bg-primary hover:bg-primary-dark text-white rounded-lg font-semibold"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        
        {/* Success Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Interview Complete! 🎉</h1>
          <p className="text-lg text-gray-600">Great job completing your {session.category} interview</p>
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          
          {/* Completion Rate */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 text-center">
            <div className="text-sm text-gray-600 mb-2">Completion Rate</div>
            <div className="text-4xl font-bold text-primary mb-2">
              {Math.round(stats.completionRate)}%
            </div>
            <div className="text-sm text-gray-500">
              {stats.answeredQuestions}/{session.total_questions} questions
            </div>
          </div>

          {/* Average Score (if available) */}
          {stats.avgScore !== null && (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 text-center">
              <div className="text-sm text-gray-600 mb-2">Average Score</div>
              <div className={`text-4xl font-bold mb-2 ${
                stats.avgScore >= 80 ? 'text-green-600' :
                stats.avgScore >= 60 ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                {Math.round(stats.avgScore)}%
              </div>
              <div className="text-sm text-gray-500">
                {stats.avgScore >= 80 ? 'Excellent!' :
                 stats.avgScore >= 60 ? 'Good work!' :
                 'Keep practicing!'}
              </div>
            </div>
          )}

          {/* Total Time */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 text-center">
            <div className="text-sm text-gray-600 mb-2">Total Time</div>
            <div className="text-4xl font-bold text-gray-900 mb-2">
              {Math.floor(stats.totalTime / 60)}:{(stats.totalTime % 60).toString().padStart(2, '0')}
            </div>
            <div className="text-sm text-gray-500">
              {Math.round(stats.avgTimePerQuestion)}s per question
            </div>
          </div>
        </div>

        {/* Performance Breakdown */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Performance Breakdown</h2>
          
          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">Questions Completed</span>
              <span className="font-semibold text-gray-900">
                {stats.answeredQuestions}/{session.total_questions}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-green-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${stats.completionRate}%` }}
              />
            </div>
          </div>

          {/* Difficulty & Category */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-600 mb-1">Category</div>
              <div className="text-lg font-semibold text-gray-900">{session.category}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Difficulty</div>
              <span className={`inline-block px-3 py-1 rounded text-sm font-semibold ${
                session.difficulty === 'Easy' ? 'bg-green-100 text-green-700' :
                session.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>
                {session.difficulty}
              </span>
            </div>
          </div>
        </div>

        {/* Questions Summary */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Questions Summary</h2>
          <div className="space-y-3">
            {session.questions.map((q, index) => (
              <div key={q.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-semibold text-gray-700">Q{index + 1}</span>
                  {q.answer_text ? (
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  <span className="text-sm text-gray-600">
                    {q.answer_text ? 'Answered' : 'Skipped'}
                  </span>
                </div>
                <div className="flex items-center space-x-4">
                  {q.time_taken && (
                    <span className="text-sm text-gray-500">
                      {Math.floor(q.time_taken / 60)}:{(q.time_taken % 60).toString().padStart(2, '0')}
                    </span>
                  )}
                  {q.score !== null && (
                    <span className={`text-sm font-semibold ${
                      q.score >= 80 ? 'text-green-600' :
                      q.score >= 60 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {q.score}%
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center justify-center space-x-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg font-semibold transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => navigate(`/session-details/${session.id}`)}
            className="flex items-center justify-center space-x-2 px-6 py-3 bg-white hover:bg-gray-50 text-gray-900 border-2 border-primary rounded-lg font-semibold transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span>View Details</span>
          </button>

          <button
            onClick={() => navigate('/question-setup')}
            className="flex items-center justify-center space-x-2 px-6 py-3 bg-primary hover:bg-primary-dark text-white rounded-lg font-semibold transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>New Interview</span>
          </button>
        </div>

        {/* Motivational Message */}
        <div className="mt-8 text-center">
          <p className="text-gray-600 italic">
            {stats.completionRate === 100 
              ? "Perfect! You answered all questions. Keep up the great work! 💪"
              : stats.completionRate >= 75
              ? "Great effort! Review the questions you skipped to improve further. 📚"
              : "Good start! Practice makes perfect. Try another interview to improve! 🎯"}
          </p>
        </div>
      </div>
    </div>
  );
};

export default SessionSummary;