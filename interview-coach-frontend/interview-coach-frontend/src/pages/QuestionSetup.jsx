import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { questionsAPI, sessionsAPI } from '../services/api';

const QuestionSetup = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [difficulty, setDifficulty] = useState('Medium');
  const [questionCount, setQuestionCount] = useState(5);
  const [questionType, setQuestionType] = useState('mixed');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const isGeneratingRef = useRef(false);  // ⭐ ADD THIS - useRef to prevent double submission

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await questionsAPI.getCategories();
      setCategories(response.data);
    } catch (err) {
      setError('Failed to load categories');
    }
  };

  const handleGenerate = async () => {
    if (!selectedCategory) {
      setError('Please select a category');
      return;
    }

    // ⭐ PREVENT DOUBLE SUBMISSION
    if (isGeneratingRef.current) {
      console.log('⚠️ Already generating, ignoring duplicate call');
      return;
    }

    isGeneratingRef.current = true;  // ⭐ SET LOCK
    setLoading(true);
    setError('');

    try {
      console.log('🚀 Starting question generation...');
      
      // ⭐ Check for existing in-progress sessions
      const historyResponse = await sessionsAPI.getUserHistory();
      const inProgressSession = historyResponse.data.sessions.find(
        s => s.status === 'in_progress' && 
             s.category_id === parseInt(selectedCategory) &&
             s.difficulty === difficulty
      );

      if (inProgressSession) {
        const shouldResume = window.confirm(
          `You have an incomplete ${inProgressSession.category} (${difficulty}) interview with ${inProgressSession.completed_questions}/${inProgressSession.total_questions} questions answered.\n\nDo you want to resume it?\n\n• OK - Resume existing interview\n• Cancel - Start new interview`
        );
        
        if (shouldResume) {
          navigate(`/interview-session/${inProgressSession.id}`);
          return;
        }
      }

      // ⭐ Generate questions
      console.log('📝 Generating questions with AI...');
      const questionsResponse = await questionsAPI.generate({
        category_id: parseInt(selectedCategory),
        difficulty,
        count: questionCount,
        question_type: questionType
      });

      const generatedQuestions = questionsResponse.data.questions;
      console.log(`✅ Generated ${generatedQuestions.length} questions`);
      
      // ⭐ Start session
      console.log('🎬 Creating session...');
      const sessionResponse = await sessionsAPI.start({
        category_id: parseInt(selectedCategory),
        difficulty,
        question_ids: generatedQuestions.map(q => q.id)
      });

      console.log(`✅ Session created with ID: ${sessionResponse.data.session_id}`);
      
      // ⭐ Navigate to interview
      navigate('/interview-session', {
        state: { 
          sessionId: sessionResponse.data.session_id,
          questions: generatedQuestions 
        }
      });
      
    } catch (err) {
      console.error('❌ Error:', err);
      setError(err.response?.data?.detail || 'Failed to generate questions');
      isGeneratingRef.current = false;  // ⭐ RELEASE LOCK ON ERROR
    } finally {
      setLoading(false);
      // Don't release lock here - navigation will unmount component
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Set Up Your Mock Interview
        </h1>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border p-8 space-y-6">
          
          {/* Category Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Select Job Role / Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              disabled={loading}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">Choose a category...</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Difficulty Level */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Difficulty Level
            </label>
            <div className="grid grid-cols-3 gap-4">
              {['Easy', 'Medium', 'Hard'].map(level => (
                <button
                  key={level}
                  onClick={() => setDifficulty(level)}
                  disabled={loading}
                  className={`py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    difficulty === level
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Question Count */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Number of Questions: {questionCount}
            </label>
            <input
              type="range"
              min="3"
              max="10"
              value={questionCount}
              onChange={(e) => setQuestionCount(parseInt(e.target.value))}
              disabled={loading}
              className="w-full disabled:opacity-50"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>3 questions</span>
              <span>10 questions</span>
            </div>
          </div>

          {/* Question Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Question Type
            </label>
            <select
              value={questionType}
              onChange={(e) => setQuestionType(e.target.value)}
              disabled={loading}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="mixed">Mixed (Behavioral + Technical)</option>
              <option value="behavioral">Behavioral Only</option>
              <option value="technical">Technical Only</option>
            </select>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Generating Questions with AI...
              </span>
            ) : (
              'Generate Questions & Start Interview'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuestionSetup;