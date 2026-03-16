from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional

from database import get_db
from models import User, SessionQuestion, Question, InterviewSession
from auth import get_current_user
from services.evaluation_service import EvaluationService

router = APIRouter(prefix="/api/evaluation", tags=["Evaluation"])

# Initialize evaluation service
eval_service = EvaluationService()

# Request Models
class EvaluateSessionRequest(BaseModel):
    session_id: int

class EvaluateAnswerRequest(BaseModel):
    session_question_id: int

# Routes

@router.post("/evaluate-session")
async def evaluate_session(
    request: EvaluateSessionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Evaluate all unevaluated answers in a session
    """
    
    # Verify session belongs to user
    session = db.query(InterviewSession).filter(
        InterviewSession.id == request.session_id,
        InterviewSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Get all session questions with answers that haven't been evaluated
    session_questions = db.query(SessionQuestion).filter(
        SessionQuestion.session_id == request.session_id,
        SessionQuestion.answer_text.isnot(None),
        SessionQuestion.answer_text != "",
        SessionQuestion.score.is_(None)  # Only unevaluated
    ).all()
    
    if not session_questions:
        # Check if already evaluated
        already_evaluated = db.query(SessionQuestion).filter(
            SessionQuestion.session_id == request.session_id,
            SessionQuestion.score.isnot(None)
        ).count()
        
        if already_evaluated > 0:
            return {
                "success": True,
                "evaluated_count": 0,
                "message": "All answers already evaluated",
                "already_evaluated": already_evaluated
            }
        else:
            raise HTTPException(status_code=400, detail="No answers to evaluate")
    
    evaluated_count = 0
    errors = []
    
    for sq in session_questions:
        try:
            # Get question details
            question = db.query(Question).filter(
                Question.id == sq.question_id
            ).first()
            
            if not question:
                errors.append(f"Question {sq.question_id} not found")
                continue
            
            # Evaluate the answer
            print(f"Evaluating answer for question {question.id}...")
            result = eval_service.evaluate_answer(
                question=question.question_text,
                answer=sq.answer_text,
                question_type=question.question_type,
                difficulty=question.difficulty
            )
            
            # Store results
            sq.score = result["overall_score"]
            sq.feedback = result["feedback"]
            sq.evaluation_metadata = result  # Store full JSON
            
            evaluated_count += 1
            print(f"✅ Evaluated: Score = {result['overall_score']}")
            
        except Exception as e:
            error_msg = f"Failed to evaluate question {sq.question_id}: {str(e)}"
            print(f"❌ {error_msg}")
            errors.append(error_msg)
    
    # Commit all changes
    db.commit()
    
    return {
        "success": True,
        "evaluated_count": evaluated_count,
        "total_questions": len(session_questions),
        "message": f"Successfully evaluated {evaluated_count} answers",
        "errors": errors if errors else None
    }


@router.post("/evaluate-answer")
async def evaluate_single_answer(
    request: EvaluateAnswerRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Evaluate a single answer
    """
    
    # Get session question
    sq = db.query(SessionQuestion).filter(
        SessionQuestion.id == request.session_question_id
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
    
    if not sq.answer_text or sq.answer_text.strip() == "":
        raise HTTPException(status_code=400, detail="No answer to evaluate")
    
    # Get question
    question = db.query(Question).get(sq.question_id)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    # Evaluate
    result = eval_service.evaluate_answer(
        question=question.question_text,
        answer=sq.answer_text,
        question_type=question.question_type,
        difficulty=question.difficulty
    )
    
    # Store results
    sq.score = result["overall_score"]
    sq.feedback = result["feedback"]
    sq.evaluation_metadata = result
    
    db.commit()
    
    return {
        "success": True,
        "score": result["overall_score"],
        "feedback": result["feedback"],
        "detailed_scores": result["scores"],
        "improvements": result["improvements"]
    }


@router.get("/results/{session_id}")
async def get_evaluation_results(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get detailed evaluation results for a session
    """
    
    # Verify session belongs to user
    session = db.query(InterviewSession).filter(
        InterviewSession.id == session_id,
        InterviewSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Get all session questions with evaluation data
    session_questions = db.query(SessionQuestion).filter(
        SessionQuestion.session_id == session_id
    ).order_by(SessionQuestion.question_order).all()
    
    results = []
    total_score = 0
    evaluated_count = 0
    
    for sq in session_questions:
        question = db.query(Question).get(sq.question_id)
        
        result_data = {
            "session_question_id": sq.id,
            "question_id": sq.question_id,
            "question_text": question.question_text if question else "Unknown",
            "question_type": question.question_type if question else "unknown",
            "difficulty": question.difficulty if question else "unknown",
            "answer_text": sq.answer_text,
            "time_taken": sq.time_taken,
            "score": sq.score,
            "feedback": sq.feedback,
            "evaluation_metadata": sq.evaluation_metadata,
            "speech_metrics": sq.speech_metrics,
            "answered": sq.answer_text is not None and sq.answer_text.strip() != ""
        }
        
        results.append(result_data)
        
        if sq.score is not None:
            total_score += sq.score
            evaluated_count += 1
    
    avg_score = round(total_score / evaluated_count, 1) if evaluated_count > 0 else 0
    
    return {
        "session_id": session_id,
        "results": results,
        "average_score": avg_score,
        "evaluated_count": evaluated_count,
        "total_questions": len(results),
        "session_status": session.status,
        "video_metrics": session.video_analysis if session.video_analysis else None
    }