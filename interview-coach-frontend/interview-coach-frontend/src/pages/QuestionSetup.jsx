import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { questionsAPI, sessionsAPI, resumeAPI } from '../services/api';

const QuestionSetup = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [difficulty, setDifficulty] = useState('Medium');
  const [questionCount, setQuestionCount] = useState(5);
  const [questionType, setQuestionType] = useState('mixed');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const isGeneratingRef = useRef(false);

  const [interviewMode, setInterviewMode] = useState('standard');
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const videoPreviewRef = useRef(null);
  const streamRef = useRef(null);
  const [useResume, setUseResume] = useState(false);
  const [hasResume, setHasResume] = useState(false);

  // ⭐ Single useEffect — no duplicate
  useEffect(() => {
    fetchCategories();
    checkResume(); 
    return () => {
      stopCameraPreview();
    };
  }, []);

  const checkResume = async () => {
    try {
      const response = await resumeAPI.get();
      if (response.data && response.data.parsed_text) {
        setHasResume(true);
        console.log('✅ Resume available');
      } else {
        setHasResume(false);
      }
    } catch (error) {
      console.log('No resume found');
      setHasResume(false);
    }
  };

  // ⭐ Start/stop camera when mode changes
  useEffect(() => {
    if (interviewMode === 'video') {
      startCameraPreview();
    } else {
      stopCameraPreview();
    }
  }, [interviewMode]);

  const fetchCategories = async () => {
    try {
      const response = await questionsAPI.getCategories();
      setCategories(response.data);
    } catch (err) {
      setError('Failed to load categories');
    }
  };

  const startCameraPreview = async () => {
    try {
      setCameraError('');

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Your browser does not support video recording. Please use Chrome, Firefox, or Edge.');
        return;
      }

      console.log('📹 Requesting camera access...');

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false
      });

      streamRef.current = stream;

      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
      }

      setCameraReady(true);
      console.log('✅ Camera ready');

    } catch (error) {
      console.error('❌ Camera error:', error);

      if (error.name === 'NotAllowedError') {
        setCameraError('Camera access denied. Please allow camera permissions and try again.');
      } else if (error.name === 'NotFoundError') {
        setCameraError('No camera found. Please connect a camera and try again.');
      } else {
        setCameraError('Unable to access camera. Please check permissions.');
      }

      setCameraReady(false);
      setInterviewMode('standard');
    }
  };

  const stopCameraPreview = () => {
    if (streamRef.current) {
      console.log('🛑 QuestionSetup: Stopping camera preview');
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraReady(false);

    if (videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = null;
    }
  };

  const handleGenerate = async () => {
    if (!selectedCategory) {
      setError('Please select a category');
      return;
    }

    if (interviewMode === 'video' && !cameraReady) {
      setError('Please allow camera access for video interview mode');
      return;
    }

    if (isGeneratingRef.current) {
      console.log('⚠️ Already generating, ignoring duplicate call');
      return;
    }

    isGeneratingRef.current = true;
    setLoading(true);
    setError('');

    try {
      console.log('🚀 Starting question generation...');

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
          // ⭐ Stop camera BEFORE navigating
          stopCameraPreview();
          navigate(`/interview-session/${inProgressSession.id}`);
          return;
        }
      }

      console.log('📝 Generating questions with AI...');
      const questionsResponse = await questionsAPI.generate({
        category_id: parseInt(selectedCategory),
        difficulty,
        count: questionCount,
        question_type: questionType,
        use_resume: useResume
      });

      const generatedQuestions = questionsResponse.data.questions;
      console.log(`✅ Generated ${generatedQuestions.length} questions`);

      console.log('🎬 Creating session...');
      const sessionResponse = await sessionsAPI.start({
        category_id: parseInt(selectedCategory),
        difficulty,
        question_ids: generatedQuestions.map(q => q.id)
      });

      console.log(`✅ Session created with ID: ${sessionResponse.data.session_id}`);

      // ⭐ Stop camera BEFORE navigating so InterviewSession starts with no competing stream
      stopCameraPreview();

      navigate('/interview-session', {
        state: {
          sessionId: sessionResponse.data.session_id,
          questions: generatedQuestions,
          videoMode: interviewMode === 'video',
        }
      });

    } catch (err) {
      console.error('❌ Error:', err);
      setError(err.response?.data?.detail || 'Failed to generate questions');
      isGeneratingRef.current = false;
    } finally {
      setLoading(false);
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

        {cameraError && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg mb-6">
            {cameraError}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border p-8 space-y-6">

          {/* Interview Mode Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Interview Mode
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setInterviewMode('standard')}
                disabled={loading}
                className={`p-4 rounded-lg border-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                  interviewMode === 'standard'
                    ? 'border-primary bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span className="font-semibold text-gray-900">Standard</span>
                </div>
                <p className="text-xs text-gray-600 text-center">Answer with text or audio</p>
              </button>

              <button
                onClick={() => setInterviewMode('video')}
                disabled={loading}
                className={`p-4 rounded-lg border-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                  interviewMode === 'video'
                    ? 'border-primary bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span className="font-semibold text-gray-900">Video Interview</span>
                </div>
                <p className="text-xs text-gray-600 text-center">Full session recording + AI analysis</p>
              </button>
            </div>
          </div>

          {/* Video Preview & Tips */}
          {interviewMode === 'video' && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border-2 border-blue-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Video Interview Setup
              </h3>

              <div className="mb-4 relative bg-gray-900 rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
                {/* ⭐ Always rendered so ref is available before cameraReady is set */}
                <video
                  ref={videoPreviewRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                  style={{ display: cameraReady ? 'block' : 'none' }}
                />

                {/* Camera ready indicator */}
                {cameraReady && (
                  <div className="absolute top-3 right-3 bg-green-500 px-3 py-1 rounded-full flex items-center space-x-2">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                    <span className="text-white text-sm font-semibold">Camera Ready</span>
                  </div>
                )}

                {/* Loading / error state */}
                {!cameraReady && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-gray-400">
                      {cameraError ? (
                        <>
                          <svg className="w-16 h-16 mx-auto mb-2 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <p className="text-red-400 font-semibold">Camera Error</p>
                          <p className="text-sm mt-1">{cameraError}</p>
                        </>
                      ) : (
                        <>
                          <svg className="w-16 h-16 mx-auto mb-2 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          <p>Initializing camera...</p>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-lg p-4 space-y-2">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  Important Tips for Video Interview
                </h4>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start">
                    <span className="text-green-600 mr-2">✓</span>
                    <span><strong>Good Lighting:</strong> Face a window or use a lamp to illuminate your face</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 mr-2">✓</span>
                    <span><strong>Eye Contact:</strong> Look at the camera, not the screen</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 mr-2">✓</span>
                    <span><strong>Professional Background:</strong> Clean, uncluttered space behind you</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 mr-2">✓</span>
                    <span><strong>Stable Position:</strong> Sit upright, camera at eye level</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 mr-2">✓</span>
                    <span><strong>Quiet Environment:</strong> Minimize background noise</span>
                  </li>
                </ul>
                <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
                  <p className="text-sm text-blue-800">
                    <strong>📹 Recording Duration:</strong> The video will record continuously throughout the entire interview session for comprehensive analysis of your body language, confidence, and presentation skills.
                  </p>
                </div>
              </div>
            </div>
          )}

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
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* Difficulty Level */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Difficulty Level</label>
            <div className="grid grid-cols-3 gap-4">
              {['Easy', 'Medium', 'Hard'].map(level => (
                <button
                  key={level}
                  onClick={() => setDifficulty(level)}
                  disabled={loading}
                  className={`py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    difficulty === level ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
            <label className="block text-sm font-semibold text-gray-700 mb-2">Question Type</label>
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

          {/* Resume Personalization Toggle */}
          {hasResume && (
            <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="use-resume"
                    type="checkbox"
                    checked={useResume}
                    onChange={(e) => setUseResume(e.target.checked)}
                    className="w-5 h-5 text-primary bg-white border-gray-300 rounded focus:ring-primary focus:ring-2 cursor-pointer"
                  />
                </div>
                <div className="ml-3">
                  <label htmlFor="use-resume" className="font-semibold text-gray-900 cursor-pointer flex items-center">
                    <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Use My Resume for Personalized Questions
                  </label>
                  <p className="text-sm text-gray-600 mt-1">
                    ✨ Generate questions tailored to your experience, skills, and projects
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Show this if NO resume */}
          {!hasResume && (
            <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-yellow-900">
                    Want personalized questions?
                  </p>
                  <p className="text-sm text-yellow-700 mt-1">
                    Upload your resume to get questions tailored to your experience and skills.
                  </p>
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="mt-2 text-sm text-yellow-800 underline hover:text-yellow-900"
                  >
                    Upload Resume →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={loading || (interviewMode === 'video' && !cameraReady)}
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
            ) : interviewMode === 'video' && !cameraReady ? (
              'Allow Camera Access to Continue'
            ) : (
              `Start ${interviewMode === 'video' ? 'Video ' : ''}Interview`
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuestionSetup;