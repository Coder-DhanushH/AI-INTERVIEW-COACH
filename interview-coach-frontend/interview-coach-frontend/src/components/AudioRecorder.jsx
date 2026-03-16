import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';

const AudioRecorder = forwardRef(({ onRecordingComplete, onTranscriptUpdate }, ref) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioURL, setAudioURL] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const recognitionRef = useRef(null);
  const streamRef = useRef(null);

  // ⭐ FIX: Refs to hold latest values, avoiding stale closures in onstop
  const recordingTimeRef = useRef(0);
  const transcriptRef = useRef('');
  const isRecordingRef = useRef(false); // ⭐ ref for isRecording (needed for imperative handle)

  // ⭐ Keep refs in sync with state
  useEffect(() => {
    recordingTimeRef.current = recordingTime;
  }, [recordingTime]);

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  // ⭐ Expose stopRecording and isRecording to parent via ref
  useImperativeHandle(ref, () => ({
    stopRecording,
    get isRecording() {
      return isRecordingRef.current;
    }
  }));

  // Initialize Speech Recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const t = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += t + ' ';
          }
        }

        const fullTranscript = (transcriptRef.current + finalTranscript).trim();
        setTranscript(fullTranscript);
        
        if (onTranscriptUpdate) {
          onTranscriptUpdate(fullTranscript);
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'no-speech') {
          return;
        }
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Timer effect
  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording, isPaused]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // ⭐ Reset refs on new recording start
      recordingTimeRef.current = 0;
      transcriptRef.current = '';

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // ⭐ Read from refs instead of stale state values
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioURL(url);

        console.log('🎤 Recording stopped. Duration:', recordingTimeRef.current, 'Transcript:', transcriptRef.current);

        if (onRecordingComplete) {
          onRecordingComplete({
            audioBlob,
            audioURL: url,
            duration: recordingTimeRef.current,
            transcript: transcriptRef.current
          });
        }

        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingTime(0);
      setTranscript('');
      setAudioURL(null);

      if (recognitionRef.current) {
        setIsTranscribing(true);
        recognitionRef.current.start();
      }

    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Unable to access microphone. Please check permissions.');
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        if (recognitionRef.current) {
          recognitionRef.current.start();
        }
        setIsPaused(false);
      } else {
        mediaRecorderRef.current.pause();
        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }
        setIsPaused(true);
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecordingRef.current) {
      mediaRecorderRef.current.stop();
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
      setIsPaused(false);
      setIsTranscribing(false);
    }
  };

  const resetRecording = () => {
    setAudioURL(null);
    setTranscript('');
    setRecordingTime(0);
    audioChunksRef.current = [];
    recordingTimeRef.current = 0;
    transcriptRef.current = '';
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <svg className="w-5 h-5 mr-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
          Voice Answer
        </h3>
        <div className={`text-2xl font-mono font-bold ${isRecording ? 'text-red-600' : 'text-gray-600'}`}>
          {formatTime(recordingTime)}
        </div>
      </div>

      {/* Recording Indicator */}
      {isRecording && (
        <div className="mb-4 flex items-center space-x-3 bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse mr-2"></div>
            <span className="text-red-700 font-semibold">
              {isPaused ? 'Paused' : 'Recording...'}
            </span>
          </div>
          {isTranscribing && (
            <span className="text-sm text-gray-600">| Transcribing in real-time</span>
          )}
        </div>
      )}

      {/* Control Buttons */}
      <div className="flex justify-center space-x-3 mb-4">
        {!isRecording ? (
          <button
            onClick={startRecording}
            className="px-6 py-3 bg-primary hover:bg-primary-dark text-white rounded-lg font-semibold flex items-center space-x-2 transition"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
            </svg>
            <span>Start Recording</span>
          </button>
        ) : (
          <>
            <button
              onClick={pauseRecording}
              className="px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-semibold flex items-center space-x-2 transition"
            >
              {isPaused ? (
                <>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                  <span>Resume</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span>Pause</span>
                </>
              )}
            </button>
            
            <button
              onClick={stopRecording}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold flex items-center space-x-2 transition"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
              </svg>
              <span>Stop</span>
            </button>
          </>
        )}
      </div>

      {/* Live Transcript */}
      {transcript && (
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-blue-600 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-semibold text-blue-900 mb-1">Live Transcript:</p>
              <p className="text-gray-700 whitespace-pre-wrap">{transcript}</p>
            </div>
          </div>
        </div>
      )}

      {/* Audio Playback */}
      {audioURL && !isRecording && (
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm font-semibold text-gray-700 mb-2">Recording Complete:</p>
          <audio src={audioURL} controls className="w-full mb-3" />
          
          <div className="flex space-x-2">
            <button
              onClick={resetRecording}
              className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition"
            >
              Re-record
            </button>
          </div>
          
          {transcript && (
            <div className="mt-4 p-3 bg-white border border-gray-200 rounded-lg">
              <p className="text-sm font-semibold text-gray-700 mb-2">Final Transcript:</p>
              <p className="text-gray-600 text-sm">{transcript}</p>
              <p className="text-xs text-gray-500 mt-2">
                You can edit this transcript before submitting
              </p>
            </div>
          )}
        </div>
      )}

      {/* Browser Compatibility Warning */}
      {!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) && (
        <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-sm text-yellow-800">
            ⚠️ Live transcription not available in this browser. Audio will still be recorded.
            For best experience, use Chrome or Edge.
          </p>
        </div>
      )}
    </div>
  );
});

export default AudioRecorder;