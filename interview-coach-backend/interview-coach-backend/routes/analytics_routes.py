from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta

from database import get_db
from models import User, InterviewSession, SessionQuestion, QuestionCategory
from auth import get_current_user

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])

@router.get("/performance-trends")
async def get_performance_trends(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get score trends over time
    Returns list of sessions with average scores
    """
    
    # Get all completed sessions for user
    sessions = db.query(InterviewSession).filter(
        InterviewSession.user_id == current_user.id,
        InterviewSession.status == 'completed'
    ).order_by(InterviewSession.completed_at).all()
    
    trends = []
    
    for session in sessions:
        # Calculate average score for this session
        avg_score = db.query(func.avg(SessionQuestion.score)).filter(
            SessionQuestion.session_id == session.id,
            SessionQuestion.score.isnot(None)
        ).scalar()
        
        if avg_score is None:
            continue  # Skip sessions without scores
        
        # Get category name
        category = db.query(QuestionCategory).get(session.category_id)
        
        trends.append({
            "date": session.completed_at.strftime("%Y-%m-%d"),
            "score": round(avg_score, 1),
            "category": category.name if category else "Unknown",
            "session_id": session.id,
            "difficulty": session.difficulty
        })
    
    return {"trends": trends}


@router.get("/category-performance")
async def get_category_performance(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get average scores by category
    """
    
    # Aggregate scores by category
    results = db.query(
        QuestionCategory.name,
        func.avg(SessionQuestion.score).label('avg_score'),
        func.count(func.distinct(InterviewSession.id)).label('session_count')
    ).join(
        InterviewSession, 
        InterviewSession.category_id == QuestionCategory.id
    ).join(
        SessionQuestion, 
        SessionQuestion.session_id == InterviewSession.id
    ).filter(
        InterviewSession.user_id == current_user.id,
        InterviewSession.status == 'completed',
        SessionQuestion.score.isnot(None)
    ).group_by(
        QuestionCategory.name
    ).all()
    
    return {
        "categories": [
            {
                "category": r.name,
                "average_score": round(r.avg_score, 1),
                "sessions_count": r.session_count
            }
            for r in results
        ]
    }


@router.get("/strengths-weaknesses")
async def get_strengths_weaknesses(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Analyze strengths and weaknesses based on evaluation criteria
    """
    
    # Get all evaluated session questions for user
    session_questions = db.query(SessionQuestion).join(
        InterviewSession
    ).filter(
        InterviewSession.user_id == current_user.id,
        SessionQuestion.evaluation_metadata.isnot(None),
        SessionQuestion.evaluation_metadata != {}
    ).all()
    
    # Aggregate scores by criteria
    criteria_scores = {
        'content': [],
        'clarity': [],
        'technical_accuracy': [],
        'completeness': []
    }
    
    for sq in session_questions:
        metadata = sq.evaluation_metadata
        if metadata and isinstance(metadata, dict) and 'scores' in metadata:
            scores = metadata['scores']
            for key in criteria_scores.keys():
                if key in scores:
                    criteria_scores[key].append(scores[key])
    
    # Calculate averages and categorize
    strengths = []
    weaknesses = []
    neutral = []
    
    for criteria, scores in criteria_scores.items():
        if not scores:
            continue
        
        avg = sum(scores) / len(scores)
        item = {
            "criteria": criteria.replace('_', ' ').title(),
            "average_score": round(avg, 1),
            "count": len(scores)
        }
        
        if avg >= 75:
            strengths.append(item)
        elif avg < 60:
            weaknesses.append(item)
        else:
            neutral.append(item)
    
    # Sort by score
    strengths.sort(key=lambda x: x['average_score'], reverse=True)
    weaknesses.sort(key=lambda x: x['average_score'])
    
    return {
        "strengths": strengths,
        "weaknesses": weaknesses,
        "areas_for_improvement": weaknesses,
        "total_evaluations": sum(len(scores) for scores in criteria_scores.values())
    }


@router.get("/overall-stats")
async def get_overall_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get overall user statistics
    """
    
    # Total sessions
    total_sessions = db.query(func.count(InterviewSession.id)).filter(
        InterviewSession.user_id == current_user.id
    ).scalar()
    
    # Completed sessions
    completed_sessions = db.query(func.count(InterviewSession.id)).filter(
        InterviewSession.user_id == current_user.id,
        InterviewSession.status == 'completed'
    ).scalar()
    
    # Average score across all evaluations
    avg_score = db.query(func.avg(SessionQuestion.score)).join(
        InterviewSession
    ).filter(
        InterviewSession.user_id == current_user.id,
        SessionQuestion.score.isnot(None)
    ).scalar()
    
    # Total questions answered
    total_answered = db.query(func.count(SessionQuestion.id)).join(
        InterviewSession
    ).filter(
        InterviewSession.user_id == current_user.id,
        SessionQuestion.answer_text.isnot(None),
        SessionQuestion.answer_text != ""
    ).scalar()
    
    return {
        "total_sessions": total_sessions or 0,
        "completed_sessions": completed_sessions or 0,
        "average_score": round(avg_score, 1) if avg_score else 0,
        "total_questions_answered": total_answered or 0
    }