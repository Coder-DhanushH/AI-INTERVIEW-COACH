from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from database import get_db
from models import User
from auth import get_current_user

router = APIRouter(prefix="/api/stats", tags=["Statistics"])

@router.get("/dashboard")
async def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get dashboard statistics for current user
    
    Returns:
    - practice_sessions: Number of practice sessions attended
    - interviews_completed: Total interviews completed
    - performance_rating: Average performance rating (0-5)
    - improvement: Percentage improvement
    - progress_this_week: Sessions completed this week
    """
    
    # TODO: Replace with actual data from database when tables are created
    # For now, returning mock data to make frontend work
    
    # In Milestone 2-3, you'll create tables like:
    # - interview_sessions
    # - interview_responses
    # - performance_metrics
    
    # Mock data for now (will be replaced with real queries)
    stats = {
        "practice_sessions": 12,
        "interviews_completed": 8,
        "performance_rating": 4.5,
        "improvement": 15,  # percentage
        "progress_this_week": 3,
        "total_questions_answered": 45,
        "average_score": 85,  # out of 100
        "strongest_area": "Technical Skills",
        "improvement_area": "Communication",
    }
    
    # When you have real data, queries will look like:
    # practice_sessions = db.query(InterviewSession).filter(
    #     InterviewSession.user_id == current_user.id
    # ).count()
    
    # interviews_completed = db.query(InterviewSession).filter(
    #     InterviewSession.user_id == current_user.id,
    #     InterviewSession.status == "completed"
    # ).count()
    
    # Calculate week range
    # week_start = datetime.now() - timedelta(days=datetime.now().weekday())
    # progress_this_week = db.query(InterviewSession).filter(
    #     InterviewSession.user_id == current_user.id,
    #     InterviewSession.created_at >= week_start
    # ).count()
    
    return stats

@router.get("/performance-history")
async def get_performance_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get performance history over time for analytics
    Returns data for charts/graphs
    """
    
    # Mock data - will be replaced with real queries
    history = {
        "labels": ["Week 1", "Week 2", "Week 3", "Week 4"],
        "scores": [70, 75, 82, 85],
        "sessions": [2, 3, 4, 3]
    }
    
    return history

@router.get("/category-breakdown")
async def get_category_breakdown(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get performance breakdown by category
    For radar charts and detailed analytics
    """
    
    # Mock data - will be replaced with real queries
    breakdown = {
        "technical_skills": 85,
        "communication": 75,
        "problem_solving": 90,
        "leadership": 70,
        "behavioral": 80
    }
    
    return breakdown
