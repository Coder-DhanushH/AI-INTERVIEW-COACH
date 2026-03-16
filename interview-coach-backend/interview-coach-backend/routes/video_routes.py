# video_routes.py - Handles video uploads, frame extraction, and analysis for each particular question the analytics
# are stored in the SessionQuestion table in the video_analysis JSONB column. This allows us to associate video feedback directly with each question and answer.
# The video analysis includes metrics like overall_video_score, eye_contact_score, facial_expression_score, speaking_clarity_score, and more detailed feedback and improvement suggestions. 
# if u dont want it please delete it, but it will be a very useful feature to have for users to get feedback on each answer they record a video for.


from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel

from database import get_db
from models import User, SessionQuestion, InterviewSession, Question  # ⭐ ADDED Question
from auth import get_current_user
from services.video_storage_service import VideoStorageService
from services.frame_extraction_service import FrameExtractionService
from services.video_analysis_service import VideoAnalysisService

router = APIRouter(prefix="/api/video", tags=["Video"])

# Initialize services
storage_service = VideoStorageService()
frame_service = FrameExtractionService()
analysis_service = VideoAnalysisService()


class VideoUploadRequest(BaseModel):
    """Request body for video upload with extracted frames"""
    session_question_id: int
    duration: int
    frames: List[str]  # Base64-encoded frames extracted by frontend


@router.post("/upload/{session_question_id}")
async def upload_video(
    session_question_id: int,
    video_file: UploadFile = File(...),
    duration: Optional[int] = Form(None),
    frames: Optional[str] = Form(None),  # JSON string of base64 frames
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload video recording for a session question
    
    Args:
        session_question_id: ID of the session question
        video_file: Video file (WebM format from browser)
        duration: Video duration in seconds
        frames: JSON string of base64-encoded frames
    """
    
    # ⭐ ADDED: File size validation (50MB max)
    MAX_SIZE = 50 * 1024 * 1024  # 50 MB
    video_content = await video_file.read()
    
    if len(video_content) > MAX_SIZE:
        raise HTTPException(
            status_code=413, 
            detail="Video file too large. Maximum 50MB allowed."
        )
    
    # Get session question
    sq = db.query(SessionQuestion).filter(
        SessionQuestion.id == session_question_id
    ).first()
    
    if not sq:
        raise HTTPException(status_code=404, detail="Session question not found")
    
    # Verify ownership
    session = db.query(InterviewSession).filter(
        InterviewSession.id == sq.session_id,
        InterviewSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        # Save video file
        video_data = storage_service.save_video(
            file_content=video_content,
            user_id=current_user.id,
            session_id=session.id
        )
        
        print(f"📹 Video saved: {video_data['url']}")
        
        # Update session question
        sq.video_url = video_data['url']
        sq.video_duration = duration
        
        # ⭐ FIXED: Initialize variables
        video_metrics = {}
        frames_list = []
        
        # Process frames if provided
        if frames:
            try:
                import json
                frames_list = json.loads(frames)
                
                if len(frames_list) > 0:
                    print(f"📸 Processing {len(frames_list)} frames...")
                    
                    # ⭐ FIXED: Limit frames to 15 max
                    frames_list = frames_list[:15]
                    
                    # Save frames to disk
                    frame_paths = frame_service.save_frames(frames_list, session_question_id)
                    print(f"💾 Saved {len(frame_paths)} frames to disk")
                    
                    # Get question text for context
                    question = db.query(Question).filter(
                        Question.id == sq.question_id
                    ).first()
                    question_text = question.question_text if question else "Interview question"
                    
                    print(f"🔍 Analyzing frames with Gemini Vision...")
                    
                    # Analyze frames with Gemini Vision (FREE)
                    metrics = analysis_service.analyze_frames(frame_paths, question_text)
                    
                    print(f"✅ Frame analysis complete")
                    
                    # Generate feedback
                    feedback_data = analysis_service.generate_video_feedback(metrics)
                    
                    # Combine metrics with feedback
                    video_metrics = {
                        **metrics,
                        "video_feedback": feedback_data['feedback'],
                        "video_improvements": feedback_data['improvements']
                    }
                    
                    print(f"📊 Video metrics generated: {video_metrics.get('overall_video_score', 0)}/100")
                    
                    # Store in database
                    sq.video_analysis = video_metrics
                    
                    # Clean up frames after analysis
                    print(f"🗑️ Cleaning up temporary frames...")
                    frame_service.delete_frames(session_question_id)
                
            except Exception as frame_error:
                print(f"⚠️ Frame processing failed: {frame_error}")
                import traceback
                traceback.print_exc()
                # Don't fail the whole upload if frame analysis fails
        
        # ⭐ ADDED: Commit database changes
        db.commit()
        db.refresh(sq)
        
        print(f"✅ Video upload complete for session_question_id: {session_question_id}")
        
        return {
            "success": True,
            "message": "Video uploaded successfully",
            "video_url": video_data['url'],
            "file_size": video_data['file_size'],
            "frames_analyzed": len(frames_list) if frames_list else 0,
            "video_metrics": video_metrics if video_metrics else None,
            "session_question_id": session_question_id  # ⭐ ADDED for frontend
        }
    
    except Exception as e:
        db.rollback()  # ⭐ ADDED: Rollback on error
        print(f"❌ Error uploading video: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.delete("/{session_question_id}")
async def delete_video(
    session_question_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete video recording"""
    
    sq = db.query(SessionQuestion).filter(
        SessionQuestion.id == session_question_id
    ).first()
    
    if not sq:
        raise HTTPException(status_code=404, detail="Session question not found")
    
    # Verify ownership
    session = db.query(InterviewSession).filter(
        InterviewSession.id == sq.session_id,
        InterviewSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=403, detail="Access denied")
    
    if not sq.video_url:
        raise HTTPException(status_code=404, detail="No video file found")
    
    try:
        # Delete file and frames
        deleted = storage_service.delete_video(sq.video_url)
        frame_service.delete_frames(session_question_id)
        
        if deleted:
            sq.video_url = None
            sq.video_duration = None
            sq.video_analysis = {}
            db.commit()
        
        return {"success": deleted, "message": "Video deleted" if deleted else "Video not found"}
    
    except Exception as e:
        db.rollback()
        print(f"❌ Error deleting video: {e}")
        raise HTTPException(status_code=500, detail=f"Delete failed: {str(e)}")


@router.get("/{session_question_id}/metrics")
async def get_video_metrics(
    session_question_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get video analysis metrics for a question"""
    
    sq = db.query(SessionQuestion).filter(
        SessionQuestion.id == session_question_id
    ).first()
    
    if not sq:
        raise HTTPException(status_code=404, detail="Session question not found")
    
    # Verify ownership
    session = db.query(InterviewSession).filter(
        InterviewSession.id == sq.session_id,
        InterviewSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return {
        "session_question_id": session_question_id,
        "has_video": bool(sq.video_url),
        "video_duration": sq.video_duration,
        "video_analysis": sq.video_analysis or {}
    }