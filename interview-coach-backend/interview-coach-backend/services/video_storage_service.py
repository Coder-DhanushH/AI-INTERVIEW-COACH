# File: backend/services/video_storage_service.py

import os
import uuid
from datetime import datetime
from typing import Optional
from pathlib import Path

class VideoStorageService:
    """
    Local file storage for session video recordings.
    Videos stored as WebM files.
    """
    
    def __init__(self):
        self.upload_dir = Path("uploads/video")
        self.upload_dir.mkdir(parents=True, exist_ok=True)
    
    def save_video(self, file_content: bytes, user_id: int, session_id: int) -> dict:
        """
        Save session video file
        
        Args:
            file_content: Video file bytes
            user_id: User ID
            session_id: Session ID
            
        Returns:
            dict with url, filename, file_size, filepath
        """
        try:
            # Generate unique filename
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            unique_id = str(uuid.uuid4())[:8]
            filename = f"session_{session_id}_user_{user_id}_{timestamp}_{unique_id}.webm"
            
            # Save file
            filepath = self.upload_dir / filename
            filepath.write_bytes(file_content)
            
            # Get file size
            file_size = filepath.stat().st_size
            file_size_mb = file_size / (1024 * 1024)
            
            print(f"📹 Session video saved: {filename} ({file_size_mb:.2f} MB)")
            
            return {
                "url": f"/uploads/video/{filename}",
                "filename": filename,
                "file_size": file_size,
                "filepath": str(filepath)
            }
        
        except Exception as e:
            print(f"❌ Error saving video: {e}")
            raise
    
    def delete_video(self, video_url: str) -> bool:
        """Delete video file"""
        try:
            filename = video_url.split('/')[-1]
            filepath = self.upload_dir / filename
            
            if filepath.exists():
                filepath.unlink()
                print(f"🗑️ Video deleted: {filename}")
                return True
            return False
        
        except Exception as e:
            print(f"❌ Error deleting video: {e}")
            return False
    
    def get_video_path(self, video_url: str) -> Optional[str]:
        """Get full path to video file"""
        filename = video_url.split('/')[-1]
        filepath = self.upload_dir / filename
        
        if filepath.exists():
            return str(filepath)
        return None