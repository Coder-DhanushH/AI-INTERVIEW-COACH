import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { sessionsAPI, audioAPI, videoAPI } from '../services/api';
import AudioRecorder from '../components/AudioRecorder';

const InterviewSession = () => {
  const { id: urlSessionId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [sessionId, setSessionId] = useState(urlSessionId || null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timer, setTimer] = useState(0);
  const [sessionTimer, setSessionTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(true);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [sessionStartTime, setSessionStartTime] = useState(Date.now());
  const [loading, setLoading] = useState(false);
  const [fetchingSession, setFetchingSession] = useState(false);

  const [answerMode, setAnswerMode] = useState('text');
  const [audioData, setAudioData] = useState(null);
  const [audioTranscript, setAudioTranscript] = useState('');

  const [videoMode, setVideoMode] = useState(false);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [videoRecordingStatus, setVideoRecordingStatus] = useState('idle');

  // ⭐ Audio refs
  const audioRecorderRef = useRef(null);
  const audioDataRef = useRef(null);
  const answerModeRef = useRef('text');
  const audioTranscriptRef = useRef('');

  // ⭐ Video refs
  const videoPreviewRef = useRef(null);
  const canvasRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const videoChunksRef = useRef([]);
  const framesRef = useRef([]);
  const streamRef = useRef(null);
  const frameExtractionIntervalRef = useRef(null);
  const videoRecordingStatusRef = useRef('idle');
  const sessionTimerRef = useRef(0);
  const cameraInitializedRef = useRef(false);

  // ⭐ Question timer
  useEffect(() => {
    let interval;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  // ⭐ Session timer
  useEffect(() => {
    const interval = setInterval(() => {
      setSessionTimer(prev => {
        const next = prev + 1;
        sessionTimerRef.current = next;
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // ⭐ Sync audio transcript to answers
  useEffect(() => {
    if (answerMode === 'audio' && audioTranscript) {
      handleAnswerChange(audioTranscript);
    }
  }, [audioTranscript, answerMode]);

  const fetchExistingSession = async () => {
    try {
      setFetchingSession(true);
      const response = await sessionsAPI.getSession(urlSessionId);
      console.log('Fetched session:', response.data);
      const sessionData = response.data;
      setSessionId(sessionData.id);
      setQuestions(sessionData.questions);
      const firstUnanswered = sessionData.questions.findIndex(
        q => !q.answered || !q.answer_text || q.answer_text.trim() === ''
      );
      setCurrentIndex(firstUnanswered !== -1 ? firstUnanswered : 0);
      const existingAnswers = {};
      sessionData.questions.forEach((q, index) => {
        if (q.answer_text && q.answer_text.trim()) {
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

  useEffect(() => {
    if (urlSessionId) {
      fetchExistingSession();
    } else if (location.state?.sessionId && location.state?.questions) {
      setSessionId(location.state.sessionId);
      setQuestions(location.state.questions);
      setQuestionStartTime(Date.now());
      setSessionStartTime(Date.now());
      const isVideoMode = location.state?.videoMode || false;
      setVideoMode(isVideoMode);
      if (isVideoMode) {
        requestCameraAndStartRecording();
      }
    } else {
      navigate('/question-setup');
    }

    return () => {
      console.log('🧹 Cleanup: Stopping all recording...');

      if (frameExtractionIntervalRef.current) {
        clearInterval(frameExtractionIntervalRef.current);
        frameExtractionIntervalRef.current = null;
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        console.log('🛑 Cleanup: Stopping MediaRecorder');
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        console.log('🛑 Cleanup: Stopping camera stream');
        streamRef.current.getTracks().forEach(track => {
          console.log(`  Stopping track: ${track.kind}`);
          track.stop();
        });
        streamRef.current = null;
        // ⭐ Only reset guard when we actually stopped a stream
        cameraInitializedRef.current = false;
      }
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = null;
      }
      console.log('✅ Cleanup complete');
    };
  }, [urlSessionId]);

  const requestCameraAndStartRecording = async () => {
    if (cameraInitializedRef.current) {
      console.log('⚠️ Camera already initialized, skipping duplicate call');
      return;
    }
    cameraInitializedRef.current = true;

    try {
      console.log('📹 Requesting camera access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false
      });
      console.log('✅ Camera access granted');
      await startSessionRecording(stream);
    } catch (error) {
      cameraInitializedRef.current = false;
      console.error('❌ Camera access denied:', error);
      if (error.name === 'NotAllowedError') {
        alert('Camera access denied. Video recording disabled. You can still continue with text/audio answers.');
      } else if (error.name === 'NotFoundError') {
        alert('No camera found. Video recording disabled.');
      } else {
        alert('Unable to access camera. Video recording disabled.');
      }
      setVideoMode(false);
    }
  };

  const startSessionRecording = async (stream) => {
    try {
      console.log('📹 Starting session video recording...');
      streamRef.current = stream;

      // ⭐ videoPreviewRef is always mounted now, so this will always work
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
      }

      if (!window.MediaRecorder) {
        console.error('MediaRecorder not supported');
        alert('Your browser does not support video recording.');
        setVideoMode(false);
        return;
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp8',
        videoBitsPerSecond: 1000000
      });

      mediaRecorderRef.current = mediaRecorder;
      videoChunksRef.current = [];
      framesRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          videoChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(100);
      setIsRecordingVideo(true);
      setVideoRecordingStatus('recording');
      videoRecordingStatusRef.current = 'recording';

      console.log('✅ Session recording started');

      // ⭐ Delay frame extraction to let video element load
      setTimeout(() => {
        frameExtractionIntervalRef.current = setInterval(() => {
          extractFrame();
        }, 5000);
      }, 2000);

    } catch (error) {
      console.error('❌ Failed to start session recording:', error);
      setVideoMode(false);
    }
  };

  const extractFrame = () => {
    if (!videoPreviewRef.current || !canvasRef.current) return;
    if (framesRef.current.length >= 60) {
      console.log('📸 Max frames reached (60)');
      return;
    }
    const video = videoPreviewRef.current;
    const canvas = canvasRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.warn('⚠️ Video not ready for frame extraction');
      return;
    }
    const context = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const frameData = canvas.toDataURL('image/jpeg', 0.7);
    framesRef.current.push(frameData);
    console.log(`📸 Extracted frame ${framesRef.current.length} at ${sessionTimerRef.current}s`);
  };

  const stopSessionRecording = () => {
    return new Promise((resolve) => {
      console.log('⏸️ Stopping session video recording...');

      if (frameExtractionIntervalRef.current) {
        clearInterval(frameExtractionIntervalRef.current);
        frameExtractionIntervalRef.current = null;
      }

      const hasActiveRecorder = mediaRecorderRef.current &&
                                mediaRecorderRef.current.state !== 'inactive';

      if (hasActiveRecorder) {
        console.log('📹 MediaRecorder is active, stopping...');

        mediaRecorderRef.current.onstop = () => {
          const videoBlob = new Blob(videoChunksRef.current, { type: 'video/webm' });
          console.log(`✅ Recording stopped. Blob size: ${(videoBlob.size / 1024 / 1024).toFixed(2)}MB`);
          console.log(`   Duration: ${sessionTimerRef.current}s, Frames: ${framesRef.current.length}`);

          setIsRecordingVideo(false);
          setVideoRecordingStatus('stopped');
          videoRecordingStatusRef.current = 'stopped';

          resolve({
            videoBlob,
            frames: framesRef.current,
            duration: sessionTimerRef.current
          });
        };

        mediaRecorderRef.current.stop();

      } else {
        console.log('⚠️ MediaRecorder not active or missing');

        setIsRecordingVideo(false);
        setVideoRecordingStatus('stopped');
        videoRecordingStatusRef.current = 'stopped';

        resolve(null);
      }
    });
  };

  const forceStopCamera = () => {
    console.log('🛑 FORCE STOPPING CAMERA...');

    cameraInitializedRef.current = false;

    if (frameExtractionIntervalRef.current) {
      clearInterval(frameExtractionIntervalRef.current);
      frameExtractionIntervalRef.current = null;
    }
    if (mediaRecorderRef.current) {
      try {
        if (mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
      } catch (e) {
        console.warn('MediaRecorder stop failed:', e);
      }
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        if (track.readyState === 'live') {
          console.log(`  🛑 Stopping ${track.kind}: ${track.label}`);
          track.stop();
        }
      });
      streamRef.current = null;
    }
    if (videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = null;
    }

    setIsRecordingVideo(false);
    setVideoRecordingStatus('stopped');
    videoRecordingStatusRef.current = 'stopped';

    console.log('✅ Camera force stopped');
  };

  const handleAnswerChange = (text) => {
    setAnswers(prev => ({ ...prev, [currentIndex]: text }));
  };

  const handleAudioRecording = (data) => {
    console.log('🎤 Audio recording complete:', data);
    setAudioData(data);
    audioDataRef.current = data;
    const transcript = data.transcript || '';
    setAudioTranscript(transcript);
    audioTranscriptRef.current = transcript;
    if (transcript) {
      handleAnswerChange(transcript);
    }
  };

  const handleTranscriptUpdate = (transcript) => {
    console.log('📝 Transcript update:', transcript);
    setAudioTranscript(transcript);
    audioTranscriptRef.current = transcript;
    handleAnswerChange(transcript);
  };

  const handleModeSwitch = (mode) => {
    console.log('🔄 Switching to mode:', mode);
    setAnswerMode(mode);
    answerModeRef.current = mode;
    if (mode === 'text') {
      setAudioData(null);
      audioDataRef.current = null;
      setAudioTranscript('');
      audioTranscriptRef.current = '';
    }
  };

  const saveAnswer = async (answersSnapshot, currentIndexSnapshot) => {
    const idx = currentIndexSnapshot ?? currentIndex;
    const currentAnswer = answersSnapshot?.[idx] ?? answers[idx];

    if (!currentAnswer || !currentAnswer.trim() || !sessionId) {
      console.log('⚠️ No answer to save or no session ID');
      return;
    }

    try {
      const currentQuestion = questions[idx];
      const questionId = currentQuestion.question_id || currentQuestion.id;
      if (!questionId) {
        console.error('❌ No question ID found');
        return;
      }

      console.log('💾 Saving answer for question:', questionId);

      const response = await sessionsAPI.submitAnswer(sessionId, {
        question_id: questionId,
        answer_text: currentAnswer.trim(),
        time_taken: timer
      });

      console.log('✅ Text answer saved:', response.data);

      const sessionQuestionId = response.data?.session_question_id || currentQuestion.id;
      console.log('🆔 Using session_question_id:', sessionQuestionId);

      const currentAudioData = audioDataRef.current;
      const currentAudioTranscript = audioTranscriptRef.current;
      const currentAnswerMode = answerModeRef.current;

      console.log('📊 Current mode:', currentAnswerMode);
      console.log('🎤 Has audio data:', !!currentAudioData?.audioBlob);

      if (currentAnswerMode === 'audio' && currentAudioData?.audioBlob) {
        try {
          console.log('🎵 Uploading audio for session_question_id:', sessionQuestionId);
          const formData = new FormData();
          formData.append('audio_file', currentAudioData.audioBlob, 'recording.webm');
          formData.append('transcript', currentAudioTranscript || currentAnswer.trim());
          formData.append('duration', Math.floor(currentAudioData.duration || timer));
          const audioResponse = await audioAPI.upload(sessionQuestionId, formData);
          console.log('✅ Audio uploaded successfully:', audioResponse.data);
          if (audioResponse.data?.speech_metrics) {
            console.log('📊 Speech analysis:', audioResponse.data.speech_metrics);
          }
        } catch (audioError) {
          console.error('❌ Audio upload failed:', audioError);
          console.error('Error details:', audioError.response?.data);
          alert('Answer saved, but audio upload failed. You can continue.');
        }
      }

      setQuestions(prev => {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], answered: true, answer_text: currentAnswer.trim() };
        return updated;
      });

    } catch (error) {
      console.error('❌ Failed to save answer:', error);
      console.error('Error details:', error.response?.data);
      alert('Failed to save answer. Please try again.');
    }
  };

  const stopAndWaitForAudioRecording = async () => {
    if (answerModeRef.current === 'audio' && audioRecorderRef.current?.isRecording) {
      console.log('⏸️ Stopping audio recording...');
      audioRecorderRef.current.stopRecording();

      await new Promise(resolve => {
        const maxWait = 3000;
        const interval = 100;
        let elapsed = 0;
        const check = setInterval(() => {
          elapsed += interval;
          if (audioDataRef.current?.audioBlob || elapsed >= maxWait) {
            clearInterval(check);
            resolve();
          }
        }, interval);
      });
    }
  };

  const handleNext = async () => {
    setLoading(true);

    const answersSnapshot = { ...answers };
    const indexSnapshot = currentIndex;

    await stopAndWaitForAudioRecording();
    await saveAnswer(answersSnapshot, indexSnapshot);

    setLoading(false);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setTimer(0);
      setQuestionStartTime(Date.now());
      setAudioData(null);
      audioDataRef.current = null;
      setAudioTranscript('');
      audioTranscriptRef.current = '';
      setAnswerMode('text');
      answerModeRef.current = 'text';
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setTimer(0);
      setQuestionStartTime(Date.now());
      setAudioData(null);
      audioDataRef.current = null;
      setAudioTranscript('');
      audioTranscriptRef.current = '';
      setAnswerMode('text');
      answerModeRef.current = 'text';
    }
  };

  const uploadSessionVideo = async (sessionId, videoData) => {
    try {
      console.log('🎥 Uploading session video...');
      const formData = new FormData();
      formData.append('video_file', videoData.videoBlob, 'session_recording.webm');
      formData.append('duration', videoData.duration);
      formData.append('frames', JSON.stringify(videoData.frames));
      const response = await videoAPI.uploadSession(sessionId, formData);
      console.log('✅ Session video uploaded successfully:', response.data);
      if (response.data?.video_metrics) {
        console.log('📊 Video analysis:', response.data.video_metrics);
      }
      return response.data;
    } catch (error) {
      console.error('❌ Session video upload failed:', error);
      console.error('Error details:', error.response?.data);
      throw error;
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      console.log('🎬 SUBMIT STARTED');
      console.log('  Video mode:', videoMode);
      console.log('  Is recording:', isRecordingVideo);
      console.log('  Stream exists:', !!streamRef.current);

      const answersSnapshot = { ...answers };
      const indexSnapshot = currentIndex;

      await stopAndWaitForAudioRecording();
      await saveAnswer(answersSnapshot, indexSnapshot);
      await sessionsAPI.complete(sessionId);
      console.log('✅ Session completed');

      if (videoMode) {
        console.log('🎥 Processing video recording...');

        const videoData = await stopSessionRecording();
        forceStopCamera();

        if (videoData) {
          try {
            console.log('📤 Uploading video...');
            await uploadSessionVideo(sessionId, videoData);
            console.log('✅ Video uploaded successfully');
          } catch (videoError) {
            console.error('⚠️ Video upload failed');
            alert('Session completed, but video upload failed. Your answers are saved.');
          }
        }
      }

      await new Promise(resolve => setTimeout(resolve, 200));

      console.log('🎯 Navigating to summary...');
      navigate(`/session-summary/${sessionId}`);

    } catch (error) {
      console.error('❌ Failed to submit interview:', error);
      alert('Failed to submit interview. Please try again.');
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
          <button onClick={() => navigate('/dashboard')} className="px-6 py-3 bg-primary hover:bg-primary-dark text-white rounded-lg">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const answeredCount = Object.keys(answers).filter(key => answers[key] && answers[key].trim() !== '').length;
  const currentQuestion = questions[currentIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-8">
      <div className="max-w-4xl mx-auto px-4">

        {/* Session Header */}
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Mock Interview Session
                {videoMode && isRecordingVideo && (
                  <span className="ml-3 text-sm font-normal text-red-600">🔴 Recording</span>
                )}
              </h2>
              <p className="text-gray-600">Question {currentIndex + 1} of {questions.length}</p>
              <p className="text-sm text-gray-500">Answered: {answeredCount} / {questions.length}</p>
              {videoMode && (
                <p className="text-xs text-gray-500 mt-1">Session Duration: {formatTime(sessionTimer)}</p>
              )}
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">Time on Question</div>
              <div className="text-3xl font-bold text-primary">{formatTime(timer)}</div>
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

        {/* Question Card */}
        {currentQuestion && (
          <div className="bg-white rounded-xl shadow-sm border p-8 mb-6">
            <div className="mb-6">
              <div className="flex items-center space-x-2 mb-4">
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  currentQuestion.difficulty === 'Easy' ? 'bg-green-100 text-green-700' :
                  currentQuestion.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {currentQuestion.difficulty}
                </span>
                <span className="px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-700">
                  {currentQuestion.question_type}
                </span>
                {currentQuestion.answered && (
                  <span className="px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-700">
                    ✓ Answered
                  </span>
                )}
              </div>
              <h3 className="text-2xl font-bold text-gray-900">{currentQuestion.question_text}</h3>
            </div>

            {/* Answer Mode Toggle - shown in ALL modes including video */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">Choose Answer Method:</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleModeSwitch('text')}
                  className={`px-4 py-3 rounded-lg font-medium transition ${
                    answerMode === 'text' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span>Type Answer</span>
                  </div>
                </button>
                <button
                  onClick={() => handleModeSwitch('audio')}
                  className={`px-4 py-3 rounded-lg font-medium transition ${
                    answerMode === 'audio' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                    <span>Voice Answer</span>
                  </div>
                </button>
              </div>
            </div>
            

            {/* Text Input */}
            {answerMode === 'text' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Your Answer:</label>
                <textarea
                  value={answers[currentIndex] || ''}
                  onChange={(e) => handleAnswerChange(e.target.value)}
                  placeholder="Type your answer here..."
                  rows={10}
                  className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none outline-none"
                />
                <p className="text-sm text-gray-500 mt-2">{(answers[currentIndex] || '').length} characters</p>
              </div>
            )}

            {/* Audio Input */}
            {answerMode === 'audio' && (
              <div>
                <AudioRecorder
                  ref={audioRecorderRef}
                  onRecordingComplete={handleAudioRecording}
                  onTranscriptUpdate={handleTranscriptUpdate}
                />
                {(audioTranscript || answers[currentIndex]) && (
                  <div className="mt-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Edit Transcript (Optional):</label>
                    <textarea
                      value={answers[currentIndex] || audioTranscript}
                      onChange={(e) => handleAnswerChange(e.target.value)}
                      placeholder="Your transcript will appear here..."
                      rows={6}
                      className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none outline-none"
                    />
                    <p className="text-xs text-gray-500 mt-1">ℹ️ You can edit the transcript before submitting</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
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
              disabled={loading}
              className="px-6 py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Next →'}
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? (videoMode ? 'Completing & Uploading Video...' : 'Submitting...') : 'Submit Interview'}
            </button>
          )}
        </div>
      </div>

      {/* ⭐ Canvas always rendered so ref is always available */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* ⭐ PiP moved to top-right to avoid overlapping navigation buttons */}
      {videoMode && (
        <div
          className="fixed top-6 right-6 w-56 h-40 bg-black rounded-xl shadow-2xl border-4 border-red-500 overflow-hidden z-50"
          style={{ display: isRecordingVideo ? 'block' : 'none' }}
        >
          <video ref={videoPreviewRef} autoPlay muted playsInline className="w-full h-full object-cover" />
          <div className="absolute top-3 right-3 flex items-center space-x-2 bg-red-600 px-2 py-1 rounded-full">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <span className="text-white text-xs font-bold">REC</span>
          </div>
          <div className="absolute bottom-3 left-3 bg-black bg-opacity-70 px-2 py-1 rounded">
            <span className="text-white text-xs font-mono">{formatTime(sessionTimer)}</span>
          </div>
          <div className="absolute bottom-3 right-3 bg-black bg-opacity-70 px-2 py-1 rounded">
            <span className="text-white text-xs">📸 {framesRef.current.length}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default InterviewSession;