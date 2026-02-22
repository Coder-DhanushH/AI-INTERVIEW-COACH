import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { sessionsAPI } from '../services/api';

const InterviewSession = () => {
  const { id: urlSessionId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [sessionId, setSessionId] = useState(urlSessionId || null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timer, setTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(true);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());  // ⭐ ADD THIS
  const [loading, setLoading] = useState(false);
  const [fetchingSession, setFetchingSession] = useState(false);

  useEffect(() => {
    if (urlSessionId) {
      // ⭐ FIX: Load existing session from URL
      fetchExistingSession();
    } else if (location.state?.questions) {
      // ⭐ FIX: Only create new session if we have questions
      startSession();
    } else {
      // ⭐ FIX: No session ID or questions, redirect
      console.error('No session ID or questions provided');
      navigate('/question-setup');
    }
  }, [urlSessionId]);

  useEffect(() => {
    let interval;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const fetchExistingSession = async () => {
    try {
      setFetchingSession(true);
      const response = await sessionsAPI.getSession(urlSessionId);  // ⭐ SHORT NAME
      console.log('Fetched session:', response.data);
      
      const sessionData = response.data;
      
      setSessionId(sessionData.id);
      setQuestions(sessionData.questions);
      
      const firstUnanswered = sessionData.questions.findIndex(
        q => !q.answered || !q.answer_text || q.answer_text.trim() === ''  // 
      );
      setCurrentIndex(firstUnanswered !== -1 ? firstUnanswered : 0);
      
      const existingAnswers = {};
      sessionData.questions.forEach((q, index) => {
        if (q.answer_text && q.answer_text.trim()) {  // ⭐ CHECK FOR NON-EMPTY
          existingAnswers[index] = q.answer_text;
        }
      });
      setAnswers(existingAnswers);
      
    } catch (error) {
      console.error('Failed to fetch session:', error);
      alert('Failed to load session. Redirecting to dashboard...');
      navigate('/dashboard');
    } finally {
      setFetchingSession(false);
    }
  };

  const startSession = async () => {
    try {
      const generatedQuestions = location.state?.questions || [];
      
      if (generatedQuestions.length === 0) {
        console.error('No questions provided for new session');
        navigate('/question-setup');
        return;
      }
      
      // ⭐ FIX: Don't create session if already exists
      if (sessionId) {
        console.log('Session already exists, not creating new one');
        return;
      }
      
      // Validate questions
      const validQuestions = generatedQuestions.filter(q => q.id);
      if (validQuestions.length === 0) {
        throw new Error('Invalid question data');
      }
      
      const response = await sessionsAPI.start({
        category_id: generatedQuestions[0].category_id,
        difficulty: generatedQuestions[0].difficulty,
        question_ids: validQuestions.map(q => q.id)
      });
      
      setSessionId(response.data.session_id);
      setQuestions(generatedQuestions);
      setQuestionStartTime(Date.now());
    } catch (error) {
      console.error('Failed to start session:', error);
      alert('Failed to start session. Please try again.');
      navigate('/question-setup');
    }
  };

  const handleAnswerChange = (text) => {
    setAnswers({
      ...answers,
      [currentIndex]: text
    });
  };

  const handleNext = async () => {
    await saveAnswer();
    
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setTimer(0);
      setQuestionStartTime(Date.now());
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setTimer(0);
      setQuestionStartTime(Date.now());
    }
  };

  const saveAnswer = async () => {
    const currentAnswer = answers[currentIndex];
  
    // ⭐ BETTER VALIDATION
    if (!currentAnswer || !currentAnswer.trim() || !sessionId) {
      console.log('No answer to save or no session ID');
      return;
    }

    try {
      const currentQuestion = questions[currentIndex];
      const questionId = currentQuestion.question_id || currentQuestion.id;  // ⭐ GET ID SAFELY
      
      if (!questionId) {
        console.error('No question ID found');
        return;
      }
      
      await sessionsAPI.submitAnswer(sessionId, {
        question_id: questionId,
        answer_text: currentAnswer.trim(),  // ⭐ TRIM WHITESPACE
        time_taken: timer
      });
      console.log('Answer saved successfully');
    
      // ⭐ ADD THIS BLOCK - Update local state
      const updatedQuestions = [...questions];
      updatedQuestions[currentIndex] = {
        ...updatedQuestions[currentIndex],
        answered: true,
        answer_text: currentAnswer.trim()
      };
      setQuestions(updatedQuestions);
      
      } catch (error) {
        console.error('Failed to save answer:', error);
        alert('Failed to save answer. Please try again.');  // ⭐ SHOW ERROR TO USER
      }
};

  const handleSubmit = async () => {
    setLoading(true);
    
    await saveAnswer();
    
    try {
      await sessionsAPI.complete(sessionId);  // ⭐ SHORT NAME
      navigate(`/session-summary/${sessionId}`);
    } catch (error) {
      console.error('Failed to complete session:', error);
      alert('Failed to complete session. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (fetchingSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading session...</p>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No questions available</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 bg-primary hover:bg-primary-dark text-white rounded-lg"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const answeredCount = Object.keys(answers).filter(
    key => answers[key] && answers[key].trim() !== ''
  ).length;
  const currentQuestion = questions[currentIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Mock Interview Session
              </h2>
              <p className="text-gray-600">
                Question {currentIndex + 1} of {questions.length}
              </p>
              <p className="text-sm text-gray-500">
                Answered: {answeredCount} / {questions.length}
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">Time on Question</div>
              <div className="text-3xl font-bold text-primary">
                {formatTime(timer)}
              </div>
            </div>
          </div>
          
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {currentQuestion && (
          <div className="bg-white rounded-xl shadow-sm border p-8 mb-6">
            <div className="mb-4">
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                currentQuestion.difficulty === 'Easy' ? 'bg-green-100 text-green-700' :
                currentQuestion.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>
                {currentQuestion.difficulty}
              </span>
              <span className="ml-2 px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-700">
                {currentQuestion.question_type}
              </span>
              {currentQuestion.answered && (
                <span className="ml-2 px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-700">
                    ✓ Answered
                  </span>
                )}
            </div>
            
            <h3 className="text-2xl font-bold text-gray-900 mb-6">
              {currentQuestion.question_text}
            </h3>

            <textarea
              value={answers[currentIndex] || ''}
              onChange={(e) => handleAnswerChange(e.target.value)}
              placeholder="Type your answer here..."
              className="w-full h-64 p-4 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
            />
            
            <p className="text-sm text-gray-500 mt-2">
              {(answers[currentIndex] || '').length} characters
            </p>
          </div>
        )}

        <div className="flex justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Previous
          </button>

          {currentIndex < questions.length - 1 ? (
            <button
              onClick={handleNext}
              className="px-6 py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg transition-colors"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Submit Interview'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default InterviewSession;