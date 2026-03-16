import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { sessionsAPI, evaluationAPI } from '../services/api';

const SessionSummary = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [sessionData, setSessionData] = useState(null);
  const [evaluating, setEvaluating] = useState(false);
  const [evaluated, setEvaluated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSessionData();
  }, [id]);

  const fetchSessionData = async () => {
    setLoading(true);
    try {
      const response = await sessionsAPI.getSession(id);
      setSessionData(response.data);
      
      // Check if already evaluated (at least one question has a score)
      const hasScores = response.data.questions.some(q => q.score !== null);
      setEvaluated(hasScores);
      
      setError('');
    } catch (err) {
      console.error('Failed to fetch session:', err);
      setError('Failed to load session data');
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluate = async () => {
    setEvaluating(true);
    setError('');
    
    try {
      console.log('Starting evaluation for session:', id);
      const response = await evaluationAPI.evaluateSession(parseInt(id));
      console.log('Evaluation response:', response.data);
      
      setEvaluated(true);
      
      // Refresh session data to get scores
      await fetchSessionData();
      
      alert(`✅ Successfully evaluated ${response.data.evaluated_count} answers!`);
      
    } catch (err) {
      console.error('Evaluation failed:', err);
      setError(err.response?.data?.detail || 'Failed to evaluate answers. Please try again.');
    } finally {
      setEvaluating(false);
    }
  };

  const formatDuration = (minutes) => {
    if (!minutes || minutes === 0) return '0:00';
    
    const mins = Math.floor(minutes);
    const secs = Math.round((minutes - mins) * 60);
    
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading session...</p>
        </div>
      </div>
    );
  }

  if (!sessionData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Session not found</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-2 bg-primary text-white rounded-lg"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const completionRate = (sessionData.completed_questions / sessionData.total_questions) * 100;
  
  // Calculate average score from questions
  const questionsWithScores = sessionData.questions.filter(q => q.score !== null);
  const avgScore = questionsWithScores.length > 0
    ? questionsWithScores.reduce((acc, q) => acc + q.score, 0) / questionsWithScores.length
    : 0;

  const totalTime = sessionData.duration_minutes || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Interview Complete!
          </h1>
          <p className="text-gray-600">
            Great job completing your {sessionData.category} interview!
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          
          {/* Completion Rate */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="text-4xl font-bold text-primary mb-2">
              {Math.round(completionRate)}%
            </div>
            <div className="text-gray-600 text-sm">Completion Rate</div>
            <div className="text-xs text-gray-500 mt-1">
              {sessionData.completed_questions}/{sessionData.total_questions} answered
            </div>
          </div>
          
          {/* Average Score (only show if evaluated) */}
          {evaluated && (
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className={`text-4xl font-bold mb-2 ${
                avgScore >= 80 ? 'text-green-600' :
                avgScore >= 60 ? 'text-yellow-600' :
                'text-orange-600'
              }`}>
                {Math.round(avgScore)}
              </div>
              <div className="text-gray-600 text-sm">Average Score</div>
              <div className="text-xs text-gray-500 mt-1">
                Out of 100
              </div>
            </div>
          )}
          
          {/* Total Time */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="text-4xl font-bold text-blue-600 mb-2">
              {formatDuration(totalTime)}m
            </div>
            <div className="text-gray-600 text-sm">Total Time</div>
            <div className="text-xs text-gray-500 mt-1">
              Minutes spent
            </div>
          </div>
        </div>

        {/* Performance Breakdown */}
        {evaluated && (
          <div className="bg-white p-6 rounded-lg shadow-sm border mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Performance Breakdown</h2>
            
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Overall Performance</span>
                <span className="font-semibold">{Math.round(avgScore)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${
                    avgScore >= 80 ? 'bg-green-500' :
                    avgScore >= 60 ? 'bg-yellow-500' :
                    'bg-orange-500'
                  }`}
                  style={{ width: `${avgScore}%` }}
                ></div>
              </div>
            </div>

            {/* Motivational Message */}
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-700">
                {avgScore >= 80 && "🌟 Excellent performance! You're well-prepared for your interviews."}
                {avgScore >= 60 && avgScore < 80 && "👍 Good job! With a bit more practice, you'll be even better."}
                {avgScore < 60 && "💪 Keep practicing! Review the feedback to improve your answers."}
              </p>
            </div>
          </div>
        )}

        {/* Questions Summary */}
        <div className="bg-white p-6 rounded-lg shadow-sm border mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Questions Summary</h2>
          
          <div className="space-y-3">
            {sessionData.questions.map((q, index) => (
              <div key={q.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    q.answered ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {q.answered ? 'Answered' : 'Skipped'}
                    </p>
                    {q.time_taken && (
                      <p className="text-xs text-gray-500">{Math.floor(q.time_taken / 60)}:{(q.time_taken % 60).toString().padStart(2, '0')}</p>
                    )}
                  </div>
                </div>
                {evaluated && q.score !== null && (
                  <div className={`px-3 py-1 rounded-full text-sm font-bold ${
                    q.score >= 80 ? 'bg-green-100 text-green-700' :
                    q.score >= 60 ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {q.score}/100
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Evaluation CTA */}
        {!evaluated && sessionData.completed_questions > 0 && (
          <div className="bg-gradient-to-r from-blue-500 to-primary p-8 rounded-lg shadow-sm mb-8 text-center text-white">
            <h3 className="text-2xl font-bold mb-3">
              Ready to Get AI-Powered Feedback?
            </h3>
            <p className="mb-6 opacity-90">
              Our AI will evaluate your answers and provide detailed feedback to help you improve
            </p>
            <button
              onClick={handleEvaluate}
              disabled={evaluating}
              className="px-8 py-4 bg-white text-primary rounded-lg font-semibold hover:bg-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {evaluating ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Evaluating with AI...
                </span>
              ) : (
                '✨ Get AI Feedback Now'
              )}
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold transition"
          >
            ← Back to Dashboard
          </button>
          
          {evaluated && (
            <button
              onClick={() => navigate(`/feedback-report/${id}`)}
              className="flex-1 px-6 py-3 bg-primary hover:bg-primary-dark text-white rounded-lg font-semibold transition"
            >
              View Detailed Feedback →
            </button>
          )}
          
          <button
            onClick={() => navigate('/question-setup')}
            className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition"
          >
            🎯 Start New Interview
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionSummary;