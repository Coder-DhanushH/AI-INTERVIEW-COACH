import os
import uuid
from datetime import datetime
from typing import Optional
import shutil

class AudioStorageService:
    """
    Simple local file storage for audio files.
    For production, replace with S3 or Cloudinary.
    """
    
    def __init__(self):
        self.upload_dir = os.path.join(os.getcwd(), "uploads", "audio")
        os.makedirs(self.upload_dir, exist_ok=True)
    
    def save_audio(self, file_content: bytes, user_id: int, session_id: int) -> dict:
        """
        Save audio file and return metadata
        
        Args:
            file_content: Audio file bytes
            user_id: User ID
            session_id: Session ID
            
        Returns:
            dict with url, filename, file_size
        """
        try:
            # Generate unique filename
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            unique_id = str(uuid.uuid4())[:8]
            filename = f"audio_{user_id}_{session_id}_{timestamp}_{unique_id}.webm"
            
            # Save file
            filepath = os.path.join(self.upload_dir, filename)
            with open(filepath, 'wb') as f:
                f.write(file_content)
            
            # Get file size
            file_size = os.path.getsize(filepath)
            
            return {
                "url": f"/uploads/audio/{filename}",
                "filename": filename,
                "file_size": file_size,
                "filepath": filepath
            }
        
        except Exception as e:
            print(f"Error saving audio: {e}")
            raise
    
    def delete_audio(self, audio_url: str) -> bool:
        """Delete audio file"""
        try:
            # Extract filename from URL
            filename = audio_url.split('/')[-1]
            filepath = os.path.join(self.upload_dir, filename)
            
            if os.path.exists(filepath):
                os.remove(filepath)
                return True
            return False
        
        except Exception as e:
            print(f"Error deleting audio: {e}")
            return False
    
    def get_audio_path(self, audio_url: str) -> Optional[str]:
        """Get full path to audio file"""
        filename = audio_url.split('/')[-1]
        filepath = os.path.join(self.upload_dir, filename)
        
        if os.path.exists(filepath):
            return filepath
        return None