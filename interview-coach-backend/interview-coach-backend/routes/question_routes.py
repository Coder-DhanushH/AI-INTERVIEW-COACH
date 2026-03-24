from models import Resume
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Query, Session
from typing import List, Optional
from pydantic import BaseModel

from database import get_db
from models import User, QuestionCategory, Question, QuestionGenerateRequest, QuestionResponse
from auth import get_current_user
from services.llm_service import LLMService

router = APIRouter(prefix="/api/questions", tags=["Questions"])

@router.post("/generate")
async def generate_questions(
    request: QuestionGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
    #use_resume: bool = Query(False)
):
    """Generate questions using AI"""
    
    # Get category
    category = db.query(QuestionCategory).filter(
        QuestionCategory.id == request.category_id
    ).first()
    
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    resume_text = None
    resume_available = False
    
    if request.use_resume:
        resume = db.query(Resume).filter(
            Resume.user_id == current_user.id
        ).first()
        
        if resume and resume.parsed_text:
            resume_text = resume.parsed_text
            resume_available = True
            print(f"✅ Using resume for personalization ({len(resume_text)} chars)")
        else:
            print("⚠️ Resume requested but not found or no text")

    # Generate questions using LLM
    generated_questions = LLMService.generate_questions(
        role=category.name,
        difficulty=request.difficulty,
        count=request.count,
        question_type=request.question_type,
        resume_text=resume_text if resume_available else None
    )
    
    # Save to database
    saved_questions = []
    for q in generated_questions:
        db_question = Question(
            category_id=category.id,
            question_text=q["question"],
            difficulty=q["difficulty"],
            question_type=q["type"],
            is_ai_generated=True,
            question_metadata=q  # Store full metadata
        )
        db.add(db_question)
        saved_questions.append(db_question)
    
    db.commit()
    
    # Refresh to get IDs
    for q in saved_questions:
        db.refresh(q)
    
    return {
        "success": True,
        "questions": saved_questions,
        "personalized": resume_available,  
        "resume_used": resume_available,
        "count": len(saved_questions)
    }

@router.get("/categories")
async def get_categories(db: Session = Depends(get_db)):
    """Get all question categories"""
    categories = db.query(QuestionCategory).all()
    return categories

@router.get("/by-category/{category_id}")
async def get_questions_by_category(
    category_id: int,
    difficulty: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get questions by category and optionally filter by difficulty"""
    
    query = db.query(Question).filter(Question.category_id == category_id)
    
    if difficulty:
        query = query.filter(Question.difficulty == difficulty)
    
    questions = query.all()
    return questions