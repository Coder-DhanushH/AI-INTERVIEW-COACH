import React, { useEffect, useRef, useState } from "react";

const MediaRecorderComponent = ({ onTranscript }) => {
  const videoRef = useRef(null);
  const recognitionRef = useRef(null);

  const [stream, setStream] = useState(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isListening, setIsListening] = useState(false);

  /* CAMERA */
  const enableCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      setStream(mediaStream);
      setIsCameraOn(true);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      alert("Camera/Microphone permission required.");
    }
  };

  const disableCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setIsCameraOn(false);
    }
  };

  /* SPEECH TO TEXT */
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      let transcript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }

      if (onTranscript) {
        onTranscript(transcript);
      }
    };

    recognitionRef.current = recognition;

    return () => recognition.stop();
  }, [onTranscript]);

  const startListening = () => {
    recognitionRef.current?.start();
    setIsListening(true);
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  return (
    <div className="bg-gray-100 p-4 rounded-xl mb-6">
      <video
        ref={videoRef}
        autoPlay
        muted
        className="w-full max-w-sm rounded-lg border mb-4"
      />

      <div className="flex gap-3">
        {!isCameraOn ? (
          <button onClick={enableCamera} className="btn-primary">
            Enable Camera
          </button>
        ) : (
          <button onClick={disableCamera} className="btn-secondary">
            Disable Camera
          </button>
        )}

        {!isListening ? (
          <button onClick={startListening} className="btn-success">
            🎤 Start Voice
          </button>
        ) : (
          <button onClick={stopListening} className="btn-danger">
            🛑 Stop Voice
          </button>
        )}
      </div>
    </div>
  );
};

export default MediaRecorderComponent;