from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta

from database import get_db
from models import User, InterviewSession, SessionQuestion
from auth import get_current_user

router = APIRouter(prefix="/api/stats", tags=["Statistics"])

@router.get("/dashboard")
async def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get comprehensive dashboard statistics"""
    
    # Basic counts
    practice_sessions = db.query(InterviewSession).filter(
        InterviewSession.user_id == current_user.id
    ).count()
    
    interviews_completed = db.query(InterviewSession).filter(
        InterviewSession.user_id == current_user.id,
        InterviewSession.status == 'completed'
    ).count()
    
    # Performance rating (based on completion rate for now)
    if practice_sessions > 0:
        completion_rate = (interviews_completed / practice_sessions)
        performance_rating = round(completion_rate * 5, 1)
    else:
        performance_rating = 0.0
    
    # This week vs last week
    week_ago = datetime.utcnow() - timedelta(days=7)
    two_weeks_ago = datetime.utcnow() - timedelta(days=14)
    
    sessions_this_week = db.query(InterviewSession).filter(
        InterviewSession.user_id == current_user.id,
        InterviewSession.started_at >= week_ago
    ).count()
    
    sessions_last_week = db.query(InterviewSession).filter(
        InterviewSession.user_id == current_user.id,
        InterviewSession.started_at >= two_weeks_ago,
        InterviewSession.started_at < week_ago
    ).count()
    
    # Calculate improvement
    if sessions_last_week > 0:
        improvement = round(((sessions_this_week - sessions_last_week) / sessions_last_week) * 100)
    else:
        improvement = 0 if sessions_this_week == 0 else 100
    
    return {
        "practice_sessions": practice_sessions,
        "interviews_completed": interviews_completed,
        "performance_rating": performance_rating,
        "improvement": improvement,
        "progress_this_week": sessions_this_week
    }


@router.get("/performance-history")
async def get_performance_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get performance history for charts
    Returns last 7 days of data
    """
    
    history = []
    
    for i in range(6, -1, -1):  # Last 7 days
        date = datetime.utcnow() - timedelta(days=i)
        start_of_day = date.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_day = start_of_day + timedelta(days=1)
        
        # Count sessions for this day
        sessions_count = db.query(InterviewSession).filter(
            InterviewSession.user_id == current_user.id,
            InterviewSession.started_at >= start_of_day,
            InterviewSession.started_at < end_of_day
        ).count()
        
        completed_count = db.query(InterviewSession).filter(
            InterviewSession.user_id == current_user.id,
            InterviewSession.status == 'completed',
            InterviewSession.started_at >= start_of_day,
            InterviewSession.started_at < end_of_day
        ).count()
        
        # Count questions answered
        questions_answered = db.query(SessionQuestion).join(InterviewSession).filter(
            InterviewSession.user_id == current_user.id,
            SessionQuestion.answer_text.isnot(None),
            InterviewSession.started_at >= start_of_day,
            InterviewSession.started_at < end_of_day
        ).count()
        
        history.append({
            "date": start_of_day.strftime("%Y-%m-%d"),
            "day": start_of_day.strftime("%a"),  # Mon, Tue, etc.
            "sessions": sessions_count,
            "completed": completed_count,
            "questions_answered": questions_answered
        })
    
    return {
        "history": history
    }


@router.get("/category-breakdown")
async def get_category_breakdown(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get performance breakdown by category/role
    For pie/radar charts
    """
    
    from models import QuestionCategory
    
    # Get all categories
    categories = db.query(QuestionCategory).all()
    
    breakdown = []
    
    for category in categories:
        # Count sessions for this category
        count = db.query(InterviewSession).filter(
            InterviewSession.user_id == current_user.id,
            InterviewSession.category_id == category.id
        ).count()
        
        if count > 0:  # Only include categories with sessions
            breakdown.append({
                "category": category.name,
                "sessions": count
            })
    
    return {
        "breakdown": breakdown
    }