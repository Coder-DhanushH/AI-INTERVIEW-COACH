import os
from typing import Dict, Optional
from openai import OpenAI

class SpeechService:
    """
    Speech-to-text service using OpenAI Whisper API
    This is optional - Web Speech API on frontend is primary method
    """
    
    def __init__(self):
        api_key = os.getenv("OPENAI_API_KEY")
        self.client = OpenAI(api_key=api_key) if api_key else None
        self.whisper_enabled = bool(api_key)
    
    def transcribe_audio(self, audio_file_path: str) -> Optional[str]:
        """
        Transcribe audio file using Whisper API
        
        Args:
            audio_file_path: Path to audio file
            
        Returns:
            Transcribed text or None if fails
        """
        if not self.whisper_enabled:
            print("⚠️ Whisper API not configured (OPENAI_API_KEY missing)")
            return None
        
        try:
            with open(audio_file_path, 'rb') as audio_file:
                transcript = self.client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file,
                    language="en"
                )
            
            return transcript.text
        
        except Exception as e:
            print(f"Whisper transcription error: {e}")
            return None