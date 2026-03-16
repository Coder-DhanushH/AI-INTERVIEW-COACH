import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';

const VideoRecorder = forwardRef(({ onRecordingComplete }, ref) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [videoURL, setVideoURL] = useState(null);
  const [hasCamera, setHasCamera] = useState(true);
  const [extractedFrames, setExtractedFrames] = useState([]);
  
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const videoChunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  
  const recordingTimeRef = useRef(0);
  const isRecordingRef = useRef(false);
  const framesRef = useRef([]);

  // Sync refs with state
  useEffect(() => {
    recordingTimeRef.current = recordingTime;
  }, [recordingTime]);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  // ⭐ ADDED: Cleanup on unmount
  useEffect(() => {
    return () => {
      // Stop camera when component unmounts
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      // Clear timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      // Revoke video URL to free memory
      if (videoURL) {
        URL.revokeObjectURL(videoURL);
      }
    };
  }, []);

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    stopRecording,
    get isRecording() {
      return isRecordingRef.current;
    }
  }));

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

  // Extract frame from video every 3 seconds
  useEffect(() => {
    if (isRecording && !isPaused && recordingTime > 0 && recordingTime % 3 === 0) {
      extractFrame();
    }
  }, [recordingTime, isRecording, isPaused]);

  const extractFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    // ⭐ ADDED: Limit to 15 frames max
    if (framesRef.current.length >= 15) {
      console.log('📸 Max frames reached (15)');
      return;
    }
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // ⭐ ADDED: Check if video is ready
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.warn('⚠️ Video not ready for frame extraction');
      return;
    }
    
    const context = canvas.getContext('2d');
    
    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw current video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convert to base64 JPEG (smaller than PNG)
    const frameData = canvas.toDataURL('image/jpeg', 0.7); // ⭐ Reduced quality to 70%
    
    framesRef.current.push(frameData);
    setExtractedFrames(prev => [...prev, frameData]);
    
    console.log(`📸 Extracted frame ${framesRef.current.length} at ${recordingTime}s`);
  };

  const startRecording = async () => {
    try {
      // ⭐ ADDED: Check browser support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Your browser does not support video recording. Please use Chrome, Firefox, or Edge.');
        setHasCamera(false);
        return;
      }

      // Request camera permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: false  // Audio handled separately by AudioRecorder
      });
      
      streamRef.current = stream;
      
      // Show video preview
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // ⭐ ADDED: Check MediaRecorder support
      if (!window.MediaRecorder) {
        alert('Your browser does not support video recording.');
        stream.getTracks().forEach(track => track.stop());
        return;
      }

      // Create MediaRecorder for video
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp8',
        videoBitsPerSecond: 1000000  // 1 Mbps (good quality, reasonable size)
      });

      mediaRecorderRef.current = mediaRecorder;
      videoChunksRef.current = [];
      framesRef.current = [];
      recordingTimeRef.current = 0;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          videoChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const videoBlob = new Blob(videoChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(videoBlob);
        setVideoURL(url);

        console.log('🎥 Recording stopped. Duration:', recordingTimeRef.current, 'Frames:', framesRef.current.length);

        if (onRecordingComplete) {
          onRecordingComplete({
            videoBlob,
            videoURL: url,
            duration: recordingTimeRef.current,
            frames: framesRef.current
          });
        }

        // Stop camera
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingTime(0);
      setVideoURL(null);
      setExtractedFrames([]);

    } catch (error) {
      console.error('Error accessing camera:', error);
      setHasCamera(false);
      
      // ⭐ ADDED: Better error messages
      if (error.name === 'NotAllowedError') {
        alert('Camera access denied. Please allow camera permissions and try again.');
      } else if (error.name === 'NotFoundError') {
        alert('No camera found. Please connect a camera and try again.');
      } else {
        alert('Unable to access camera. Please check permissions and try again.');
      }
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        setIsPaused(false);
      } else {
        mediaRecorderRef.current.pause();
        setIsPaused(true);
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecordingRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
    }
  };

  const resetRecording = () => {
    // ⭐ ADDED: Revoke old URL to free memory
    if (videoURL) {
      URL.revokeObjectURL(videoURL);
    }
    
    setVideoURL(null);
    setRecordingTime(0);
    setExtractedFrames([]);
    videoChunksRef.current = [];
    framesRef.current = [];
    recordingTimeRef.current = 0;
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Video Answer
        </h3>
        <div className={`text-2xl font-mono font-bold ${isRecording ? 'text-red-600' : 'text-gray-600'}`}>
          {formatTime(recordingTime)}
        </div>
      </div>

      {/* Video Preview / Playback */}
      <div className="mb-4 relative bg-gray-900 rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
        {/* ⭐ FIXED: Simplified condition */}
        {isRecording && !videoURL ? (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
        ) : videoURL ? (
          <video
            src={videoURL}
            controls
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <svg className="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <p>Camera preview will appear here</p>
            </div>
          </div>
        )}

        {/* Recording Indicator */}
        {isRecording && (
          <div className="absolute top-4 right-4 flex items-center space-x-2 bg-red-600 px-3 py-1 rounded-full">
            <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
            <span className="text-white text-sm font-semibold">
              {isPaused ? 'PAUSED' : 'REC'}
            </span>
          </div>
        )}

        {/* Frame count indicator */}
        {isRecording && extractedFrames.length > 0 && (
          <div className="absolute bottom-4 left-4 bg-black bg-opacity-60 px-3 py-1 rounded text-white text-sm">
            📸 {extractedFrames.length} / 15 frames
          </div>
        )}
      </div>

      {/* Hidden canvas for frame extraction */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Control Buttons */}
      <div className="flex justify-center space-x-3 mb-4">
        {!isRecording ? (
          <button
            onClick={startRecording}
            disabled={!hasCamera}
            className="px-6 py-3 bg-primary hover:bg-primary-dark text-white rounded-lg font-semibold flex items-center space-x-2 transition disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
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

      {/* Playback Controls */}
      {videoURL && !isRecording && (
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm font-semibold text-gray-700 mb-2">
            ✅ Recording Complete ({extractedFrames.length} frames for analysis)
          </p>
          
          <div className="flex space-x-2">
            <button
              onClick={resetRecording}
              className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition"
            >
              Re-record
            </button>
          </div>
        </div>
      )}

      {/* Camera Access Error */}
      {!hasCamera && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-800">
            ❌ Camera access denied. Please enable camera permissions in your browser settings.
          </p>
        </div>
      )}

      {/* Info Message */}
      <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-sm text-blue-800">
          💡 <strong>Tip:</strong> Ensure good lighting, look at the camera, and maintain a professional posture.
          Frames are automatically captured every 3 seconds for AI analysis (max 15 frames).
        </p>
      </div>
    </div>
  );
});

// ⭐ ADDED: DisplayName for React DevTools
VideoRecorder.displayName = 'VideoRecorder';

export default VideoRecorder;