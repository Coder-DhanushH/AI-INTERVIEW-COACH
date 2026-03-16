from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import Optional

from database import get_db
from models import User, SessionQuestion, InterviewSession
from auth import get_current_user
from services.audio_storage_service import AudioStorageService
from services.speech_service import SpeechService
from services.prosody_service import ProsodyAnalysisService
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form  # ⭐ Add Form

router = APIRouter(prefix="/api/audio", tags=["Audio"])

# Initialize services
storage_service = AudioStorageService()
speech_service = SpeechService()
prosody_service = ProsodyAnalysisService()


@router.post("/upload/{session_question_id}")
async def upload_audio(
    session_question_id: int,
    audio_file: UploadFile = File(...),
    transcript: Optional[str] = Form(None),  # Optional: from frontend STT
    duration: Optional[int] = Form(None),  # Audio duration in seconds
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload audio recording for a session question
    
    Args:
        session_question_id: ID of the session question
        audio_file: Audio file (WebM format from browser)
        transcript: Optional transcript from Web Speech API
        duration: Audio duration in seconds
    """
    
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
        # Read audio file
        audio_content = await audio_file.read()
        
        # Save audio file
        audio_data = storage_service.save_audio(
            file_content=audio_content,
            user_id=current_user.id,
            session_id=session.id
        )
        
        # Update session question
        sq.audio_url = audio_data['url']
        sq.audio_duration = duration
        
        # If no transcript provided, try Whisper API (optional)
        if not transcript and speech_service.whisper_enabled:
            print("🎤 Attempting Whisper transcription...")
            transcript = speech_service.transcribe_audio(audio_data['filepath'])
        
        # If we have transcript and duration, analyze prosody
        speech_metrics = {}
        if transcript and duration:
            print(f"📊 Analyzing prosody for {len(transcript)} characters, {duration}s")
            
            # Analyze speech patterns
            metrics = prosody_service.analyze_transcript(transcript, duration)
            
            # Generate feedback
            feedback_data = prosody_service.generate_speech_feedback(metrics)
            
            # Combine metrics with feedback
            speech_metrics = {
                **metrics,
                "speech_feedback": feedback_data['feedback'],
                "speech_improvements": feedback_data['improvements'],
                "overall_speech_score": feedback_data['overall_speech_score']
            }
            
            # Store in database
            sq.speech_metrics = speech_metrics
        
        db.commit()
        
        return {
            "success": True,
            "message": "Audio uploaded successfully",
            "audio_url": audio_data['url'],
            "file_size": audio_data['file_size'],
            "transcript_available": bool(transcript),
            "speech_metrics": speech_metrics if speech_metrics else None
        }
    
    except Exception as e:
        print(f"Error uploading audio: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.delete("/{session_question_id}")
async def delete_audio(
    session_question_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete audio recording"""
    
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
    
    if not sq.audio_url:
        raise HTTPException(status_code=404, detail="No audio file found")
    
    # Delete file
    deleted = storage_service.delete_audio(sq.audio_url)
    
    if deleted:
        sq.audio_url = None
        sq.audio_duration = None
        sq.speech_metrics = {}
        db.commit()
    
    return {"success": deleted, "message": "Audio deleted" if deleted else "Audio not found"}


@router.get("/{session_question_id}/metrics")
async def get_speech_metrics(
    session_question_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get speech analysis metrics for a question"""
    
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
        "has_audio": bool(sq.audio_url),
        "audio_duration": sq.audio_duration,
        "speech_metrics": sq.speech_metrics or {}
    }