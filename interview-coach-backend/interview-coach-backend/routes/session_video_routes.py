# File: backend/routes/session_video_routes.py (NEW)

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional
import json

from database import get_db
from models import User, InterviewSession, Question
from auth import get_current_user
from services.video_storage_service import VideoStorageService
from services.frame_extraction_service import FrameExtractionService
from services.video_analysis_service import VideoAnalysisService

router = APIRouter(prefix="/api/sessions", tags=["Session Video"])

# Initialize services
storage_service = VideoStorageService()
frame_service = FrameExtractionService()
analysis_service = VideoAnalysisService()


@router.post("/{session_id}/video")
async def upload_session_video(
    session_id: int,
    video_file: UploadFile = File(...),
    duration: int = Form(...),
    frames: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload video recording for entire interview session
    
    Args:
        session_id: ID of the interview session
        video_file: Video file (WebM format from browser)
        duration: Video duration in seconds
        frames: JSON string of base64-encoded frames
    """
    
    # Validate file size (max 100MB for full session)
    MAX_SIZE = 100 * 1024 * 1024  # 100 MB
    video_content = await video_file.read()
    
    if len(video_content) > MAX_SIZE:
        raise HTTPException(
            status_code=413,
            detail="Video file too large. Maximum 100MB allowed for session recording."
        )
    
    # Get session and verify ownership
    session = db.query(InterviewSession).filter(
        InterviewSession.id == session_id,
        InterviewSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found or access denied")
    
    try:
        print(f"📹 Processing session video for session {session_id}...")
        
        # Save video file
        video_data = storage_service.save_video(
            file_content=video_content,
            user_id=current_user.id,
            session_id=session_id
        )
        
        print(f"✅ Video saved: {video_data['url']}")
        
        # Update session
        session.video_url = video_data['url']
        session.video_duration = duration
        
        # Process frames if provided
        video_metrics = {}
        frames_list = []
        
        if frames:
            try:
                frames_list = json.loads(frames)
                
                if len(frames_list) > 0:
                    print(f"📸 Processing {len(frames_list)} frames...")
                    
                    # Limit to 60 frames max
                    frames_list = frames_list[:60]
                    
                    # Save frames to disk
                    frame_paths = frame_service.save_frames(frames_list, session_id)
                    print(f"💾 Saved {len(frame_paths)} frames to disk")
                    
                    print(f"🔍 Analyzing session video with Gemini Vision...")
                    
                    # Analyze frames with Gemini Vision
                    metrics = analysis_service.analyze_session_video(
                        frame_paths,
                        session_duration=duration
                    )
                    
                    print(f"✅ Video analysis complete")
                    
                    # Generate feedback summary
                    feedback_data = analysis_service.generate_video_feedback(metrics)
                    
                    # Combine metrics with feedback
                    video_metrics = {
                        **metrics,
                        "video_feedback": feedback_data['feedback'],
                        "video_improvements": feedback_data['improvements']
                    }
                    
                    print(f"📊 Overall video score: {video_metrics.get('overall_video_score', 0)}/100")
                    
                    # Store in database
                    session.video_analysis = video_metrics
                    
                    # Clean up frames after analysis
                    print(f"🗑️ Cleaning up temporary frames...")
                    frame_service.delete_frames(session_id)
                
            except Exception as frame_error:
                print(f"⚠️ Frame processing failed: {frame_error}")
                import traceback
                traceback.print_exc()
                # Don't fail the whole upload if frame analysis fails
        
        # Commit database changes
        db.commit()
        db.refresh(session)
        
        print(f"✅ Session video upload complete for session {session_id}")
        
        return {
            "success": True,
            "message": "Session video uploaded successfully",
            "video_url": video_data['url'],
            "file_size": video_data['file_size'],
            "frames_analyzed": len(frames_list) if frames_list else 0,
            "video_metrics": video_metrics if video_metrics else None,
            "session_id": session_id
        }
    
    except Exception as e:
        db.rollback()
        print(f"❌ Error uploading session video: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.get("/{session_id}/video/metrics")
async def get_session_video_metrics(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get video analysis metrics for a session"""
    
    session = db.query(InterviewSession).filter(
        InterviewSession.id == session_id,
        InterviewSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found or access denied")
    
    return {
        "session_id": session_id,
        "has_video": bool(session.video_url),
        "video_duration": session.video_duration,
        "video_analysis": session.video_analysis or {}
    }


@router.delete("/{session_id}/video")
async def delete_session_video(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete session video recording"""
    
    session = db.query(InterviewSession).filter(
        InterviewSession.id == session_id,
        InterviewSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found or access denied")
    
    if not session.video_url:
        raise HTTPException(status_code=404, detail="No video file found for this session")
    
    try:
        # Delete video file
        deleted = storage_service.delete_video(session.video_url)
        
        # Delete frames if any remain
        frame_service.delete_frames(session_id)
        
        if deleted:
            session.video_url = None
            session.video_duration = None
            session.video_analysis = {}
            db.commit()
        
        return {
            "success": deleted,
            "message": "Session video deleted" if deleted else "Video not found"
        }
    
    except Exception as e:
        db.rollback()
        print(f"❌ Error deleting session video: {e}")
        raise HTTPException(status_code=500, detail=f"Delete failed: {str(e)}")