from fastapi import APIRouter, Depends, HTTPException
from requests import session
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List
from pydantic import BaseModel

from database import get_db
from models import User, InterviewSession, SessionQuestion, Question, QuestionCategory
from auth import get_current_user
from sqlalchemy import func

router = APIRouter(prefix="/api/sessions", tags=["Sessions"])

# Schemas
class SessionStartRequest(BaseModel):
    category_id: int
    difficulty: str
    question_ids: List[int]

class AnswerSubmitRequest(BaseModel):
    question_id: int
    answer_text: str
    time_taken: int  # seconds

@router.post("/start")
async def start_session(
    request: SessionStartRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Start a new interview session"""
    recent_cutoff = datetime.utcnow() - timedelta(seconds=10)
    duplicate = db.query(InterviewSession).filter(
        InterviewSession.user_id == current_user.id,
        InterviewSession.category_id == request.category_id,
        InterviewSession.difficulty == request.difficulty,
        InterviewSession.total_questions == len(request.question_ids),
        InterviewSession.started_at > recent_cutoff,
        InterviewSession.status == 'in_progress'
    ).first()
    
    if duplicate:
        print(f"⚠️ DUPLICATE SESSION DETECTED! Returning existing session {duplicate.id}")
        return {
            "session_id": duplicate.id,
            "message": "Session already exists (duplicate prevented)"
        }
    # Create session
    session = InterviewSession(
        user_id=current_user.id,
        category_id=request.category_id,
        difficulty=request.difficulty,
        total_questions=len(request.question_ids),
        completed_questions=0,
        status='in_progress',
        started_at=datetime.utcnow()
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    
    # Link questions to session
    for index, q_id in enumerate(request.question_ids):
        session_q = SessionQuestion(
            session_id=session.id,
            question_id=q_id,
            question_order=index + 1,
            answered_at=None,      # ⭐ ADD THESE 5 LINES
            answer_text=None,
            time_taken=None,
            score=None,
            feedback=None
        )
        db.add(session_q)
    
    db.commit()
    
    return {
        "session_id": session.id,
        "message": "Session started successfully"
    }

@router.get("/user/history")
async def get_user_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all sessions for current user with category breakdown"""
    
    
    # Get all sessions
    sessions = db.query(InterviewSession).filter(
        InterviewSession.user_id == current_user.id
    ).order_by(InterviewSession.started_at.desc()).all()
    
    # Get category breakdown
    category_stats = db.query(
        QuestionCategory.name,
        func.count(InterviewSession.id).label('count')
    ).join(
        InterviewSession, 
        InterviewSession.category_id == QuestionCategory.id
    ).filter(
        InterviewSession.user_id == current_user.id
    ).group_by(
        QuestionCategory.name
    ).all()
    
    # Format sessions with details
    formatted_sessions = []
    for session in sessions:
        category = db.query(QuestionCategory).filter(
            QuestionCategory.id == session.category_id
        ).first()
        
        formatted_sessions.append({
            "id": session.id,
            "category": category.name if category else "Unknown",
            "difficulty": session.difficulty,
            "total_questions": session.total_questions,
            "completed_questions": session.completed_questions,
            "status": session.status,
            "started_at": session.started_at.isoformat(),
            "completed_at": session.completed_at.isoformat() if session.completed_at else None,
            "duration_minutes": (
                (session.completed_at - session.started_at).total_seconds() / 60
                if session.completed_at else None
            )
        })
    
    return {
        "total_sessions": len(sessions),
        "completed_count": sum(1 for s in sessions if s.status == 'completed'),
        "in_progress_count": sum(1 for s in sessions if s.status == 'in_progress'),
        "category_breakdown": [
            {"category": name, "count": count} 
            for name, count in category_stats
        ],
        "sessions": formatted_sessions
    }


@router.get("/{session_id}")
async def get_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get session details with questions"""
    
    session = db.query(InterviewSession).filter(
        InterviewSession.id == session_id,
        InterviewSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Get category name ⭐ ADDED
    category = db.query(QuestionCategory).filter(
        QuestionCategory.id == session.category_id
    ).first()
    
    # Get session questions
    session_questions = db.query(SessionQuestion).filter(
        SessionQuestion.session_id == session_id
    ).order_by(SessionQuestion.question_order).all()
    
    # Get full question details
    questions_data = []
    for sq in session_questions:
        question = db.query(Question).filter(Question.id == sq.question_id).first()
        questions_data.append({
            "id": sq.id,  # ⭐ Changed from session_question_id
            "question_id": question.id,
            "question_text": question.question_text,
            "question_type": question.question_type,
            "difficulty": question.difficulty,
            "question_order": sq.question_order,
            "answer_text": sq.answer_text,
            "time_taken": sq.time_taken,
            "answered_at": sq.answered_at.isoformat() if sq.answered_at else None,  # ⭐ ADDED
            "score": sq.score,  # ⭐ ADDED (for future evaluation)
            "feedback": sq.feedback,  # ⭐ ADDED (for future evaluation)
            "answered": sq.answer_text is not None and sq.answer_text.strip() != ""
        })
    
    # Calculate duration ⭐ ADDED
    duration_minutes = None
    if session.completed_at and session.started_at:
        duration = session.completed_at - session.started_at
        duration_minutes = max(0, duration.total_seconds() / 60)
    
    actual_completed = sum(1 for q in questions_data if q['answered'])

    return {
        "id": session.id,  # ⭐ ADDED
        "category": category.name if category else "Unknown",  # ⭐ ADDED category name
        "category_id": session.category_id,  # ⭐ ADDED
        "difficulty": session.difficulty,
        "total_questions": session.total_questions,
        "completed_questions": actual_completed,
        "status": session.status,
        "started_at": session.started_at.isoformat(),  # ⭐ ADDED
        "completed_at": session.completed_at.isoformat() if session.completed_at else None,  # ⭐ ADDED
        "duration_minutes": duration_minutes,  # ⭐ ADDED
        "questions": questions_data
    }

@router.post("/{session_id}/answer")
async def submit_answer(
    session_id: int,
    request: AnswerSubmitRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Submit answer for a question"""
    
    # Verify session belongs to user ⭐ ADDED
    session = db.query(InterviewSession).filter(
        InterviewSession.id == session_id,
        InterviewSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Get session question
    session_q = db.query(SessionQuestion).filter(
        SessionQuestion.session_id == session_id,
        SessionQuestion.question_id == request.question_id
    ).first()
    
    if not session_q:
        raise HTTPException(status_code=404, detail="Question not found in session")
    
    # Update answer
    if request.answer_text and request.answer_text.strip():  # Only save non-empty
        session_q.answer_text = request.answer_text.strip()
        session_q.time_taken = request.time_taken
        session_q.answered_at = datetime.utcnow()
    
    # Update session progress
    answered_count = db.query(SessionQuestion).filter(
    SessionQuestion.session_id == session_id,
    SessionQuestion.answer_text.isnot(None),
    SessionQuestion.answer_text != ""  # ⭐ ADD THIS LINE
    ).count()
    
    session.completed_questions = answered_count
    
    db.commit()
    
    return {
        "success": True,
        "answered_count": answered_count,
        "total_questions": session.total_questions,
        "session_question_id": session_q.id # added when speech Transcription feature was added
    }

@router.post("/{session_id}/complete")
async def complete_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark session as completed"""
    
    session = db.query(InterviewSession).filter(
        InterviewSession.id == session_id,
        InterviewSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # ⭐ ADD COUNT UPDATE
    answered_count = db.query(SessionQuestion).filter(
        SessionQuestion.session_id == session_id,
        SessionQuestion.answer_text.isnot(None),
        SessionQuestion.answer_text != ""
    ).count()

    session.completed_questions = answered_count
    session.status = 'completed'
    session.completed_at = datetime.utcnow()

    db.commit()

    return {
        "success": True,
        "message": "Session completed successfully",
        "completed_questions": answered_count,  # ⭐ ADD THIS
        "total_questions": session.total_questions  # ⭐ ADD THIS
    }


