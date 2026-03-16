# File: backend/services/frame_extraction_service.py

import os
import base64
from typing import List
from PIL import Image
import io
from pathlib import Path

class FrameExtractionService:
    """
    Save and manage extracted video frames.
    Frames received from frontend (extracted using Canvas API).
    """
    
    def __init__(self):
        self.frames_dir = Path("uploads/frames")
        self.frames_dir.mkdir(parents=True, exist_ok=True)
    
    def save_frames(self, frames_base64: List[str], session_id: int) -> List[str]:
        """
        Save extracted frames to disk
        
        Args:
            frames_base64: List of base64-encoded frame images
            session_id: Session ID
            
        Returns:
            List of file paths to saved frames
        """
        saved_paths = []
        
        try:
            for idx, frame_data in enumerate(frames_base64):
                # Remove data URL prefix if present
                if ',' in frame_data:
                    frame_data = frame_data.split(',')[1]
                
                # Decode base64
                image_bytes = base64.b64decode(frame_data)
                
                # Save as JPEG
                filename = f"session_{session_id}_frame_{idx:03d}.jpg"
                filepath = self.frames_dir / filename
                
                # Open and compress image
                image = Image.open(io.BytesIO(image_bytes))
                image = image.convert('RGB')
                image.save(filepath, 'JPEG', quality=85, optimize=True)
                
                saved_paths.append(str(filepath))
            
            print(f"💾 Saved {len(saved_paths)} frames for session {session_id}")
            return saved_paths
        
        except Exception as e:
            print(f"❌ Error saving frames: {e}")
            raise
    
    def delete_frames(self, session_id: int) -> bool:
        """Delete all frames for a session"""
        try:
            pattern = f"session_{session_id}_frame_*.jpg"
            deleted_count = 0
            
            for filepath in self.frames_dir.glob(pattern):
                filepath.unlink()
                deleted_count += 1
            
            if deleted_count > 0:
                print(f"🗑️ Deleted {deleted_count} frames for session {session_id}")
            
            return True
        
        except Exception as e:
            print(f"❌ Error deleting frames: {e}")
            return False