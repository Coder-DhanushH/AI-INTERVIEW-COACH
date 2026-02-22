import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { sessionsAPI } from '../services/api';

const SessionDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSessionDetails();
  }, [id]);

  const fetchSessionDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await sessionsAPI.getSessionDetails(id);
      console.log('Session details:', response.data);
      setSession(response.data);
    } catch (error) {
      console.error('Failed to fetch session details:', error);
      setError(error.response?.data?.detail || 'Failed to load session details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading session details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-8">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center text-primary hover:text-primary-dark mb-6"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </button>
          
          <div className="bg-red-50 border border-red-200 rounded-xl p-6">
            <h3 className="text-red-900 font-semibold mb-2">Error Loading Session</h3>
            <p className="text-red-800 mb-4">{error}</p>
            <button
              onClick={fetchSessionDetails}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-8">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-gray-600">Session not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex justify-between items-center">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center text-primary hover:text-primary-dark"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </button>
          
          {session.status === 'in_progress' && (
            <button
              onClick={() => navigate(`/interview-session/${session.id}`)}
              className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg"
            >
              Resume Interview
            </button>
          )}
        </div>

        {/* Session Header Card */}
        <div className="bg-white rounded-xl p-6 shadow-sm border mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{session.category} Interview</h1>
              <div className="flex items-center space-x-3">
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  session.status === 'completed' 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {session.status === 'completed' ? '✓ Completed' : '⏸ In Progress'}
                </span>
                <span className={`px-3 py-1 rounded text-sm ${
                  session.difficulty === 'Easy' ? 'bg-green-100 text-green-700' :
                  session.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {session.difficulty}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-gray-600">Total Questions</div>
              <div className="text-2xl font-bold text-gray-900">{session.total_questions}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Answered</div>
              <div className="text-2xl font-bold text-primary">{session.completed_questions}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Started</div>
              <div className="text-sm font-semibold text-gray-900">
                {new Date(session.started_at).toLocaleString()}
              </div>
            </div>
            {session.completed_at && (
              <div>
                <div className="text-sm text-gray-600">Duration</div>
                <div className="text-lg font-bold text-gray-900">
                  {Math.round(session.duration_minutes)} min
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Questions & Answers */}
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Questions & Answers</h2>
          
          {session.questions && session.questions.length > 0 ? (
            <div className="space-y-4">
              {session.questions.map((q, index) => (
                <div key={q.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Question {index + 1}
                    </h3>
                    {q.time_taken && (
                      <span className="text-sm text-gray-600">
                        ⏱️ {Math.floor(q.time_taken / 60)}:{(q.time_taken % 60).toString().padStart(2, '0')}
                      </span>
                    )}
                  </div>
                  
                  <p className="text-gray-700 mb-3">{q.question_text}</p>
                  
                  {q.answer_text ? (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm font-semibold text-gray-700 mb-1">Your Answer:</div>
                      <p className="text-gray-800">{q.answer_text}</p>
                      
                      {q.score !== null && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-gray-700">Score:</span>
                            <span className={`text-lg font-bold ${
                              q.score >= 80 ? 'text-green-600' :
                              q.score >= 60 ? 'text-yellow-600' :
                              'text-red-600'
                            }`}>
                              {q.score}/100
                            </span>
                          </div>
                        </div>
                      )}
                      
                      {q.feedback && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="text-sm font-semibold text-gray-700 mb-1">Feedback:</div>
                          <p className="text-sm text-gray-600">{q.feedback}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <p className="text-sm text-yellow-800">Not answered yet</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600 text-center py-8">No questions available for this session</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SessionDetails;