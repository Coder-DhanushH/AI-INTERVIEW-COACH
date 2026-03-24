from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import User, Resume, ResumeAnalysis
from auth import get_current_user
from services.resume_analysis_service import ResumeAnalysisService

router = APIRouter(prefix="/api/resume/analysis", tags=["Resume Analysis"])


@router.post("/analyze")
async def analyze_resume(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Analyze user's resume with AI
    Creates comprehensive analysis with scores and recommendations
    """
    
    # Get user's resume
    resume = db.query(Resume).filter(
        Resume.user_id == current_user.id
    ).first()
    
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No resume found. Please upload a resume first."
        )
    
    if not resume.parsed_text or len(resume.parsed_text.strip()) < 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Resume text is too short or missing. Please re-upload your resume."
        )
    
    try:
        print(f"🔍 Analyzing resume for user {current_user.id}...")
        
        # Perform AI analysis
        analysis_result = await ResumeAnalysisService.analyze_resume(
            resume_text=resume.parsed_text,
            extracted_skills=resume.extracted_skills
        )
        
        # Calculate overall score
        overall_score = ResumeAnalysisService.calculate_overall_score(
            analysis_result.get('category_scores', {})
        )
        
        # Check if analysis already exists
        existing_analysis = db.query(ResumeAnalysis).filter(
            ResumeAnalysis.resume_id == resume.id
        ).first()
        
        if existing_analysis:
            # Update existing analysis
            existing_analysis.overall_score = overall_score
            existing_analysis.content_score = analysis_result['category_scores'].get('content', 0)
            existing_analysis.formatting_score = analysis_result['category_scores'].get('formatting', 0)
            existing_analysis.ats_score = analysis_result['category_scores'].get('ats_compatibility', 0)
            existing_analysis.keywords_score = analysis_result['category_scores'].get('keywords', 0)
            existing_analysis.experience_score = analysis_result['category_scores'].get('experience', 0)
            existing_analysis.education_score = analysis_result['category_scores'].get('education', 0)
            existing_analysis.skills_score = analysis_result['category_scores'].get('skills', 0)
            
            existing_analysis.strengths = analysis_result.get('strengths', [])
            existing_analysis.weaknesses = analysis_result.get('weaknesses', [])
            existing_analysis.improvements = analysis_result.get('improvements', [])
            existing_analysis.section_analysis = analysis_result.get('section_analysis', {})
            existing_analysis.keyword_analysis = analysis_result.get('keyword_analysis', {})
            existing_analysis.ats_compatibility = analysis_result.get('ats_compatibility', {})
            existing_analysis.action_items = analysis_result.get('action_items', [])
            existing_analysis.best_practices = analysis_result.get('best_practices', [])
            
            db_analysis = existing_analysis
        else:
            # Create new analysis
            db_analysis = ResumeAnalysis(
                resume_id=resume.id,
                user_id=current_user.id,
                overall_score=overall_score,
                content_score=analysis_result['category_scores'].get('content', 0),
                formatting_score=analysis_result['category_scores'].get('formatting', 0),
                ats_score=analysis_result['category_scores'].get('ats_compatibility', 0),
                keywords_score=analysis_result['category_scores'].get('keywords', 0),
                experience_score=analysis_result['category_scores'].get('experience', 0),
                education_score=analysis_result['category_scores'].get('education', 0),
                skills_score=analysis_result['category_scores'].get('skills', 0),
                strengths=analysis_result.get('strengths', []),
                weaknesses=analysis_result.get('weaknesses', []),
                improvements=analysis_result.get('improvements', []),
                section_analysis=analysis_result.get('section_analysis', {}),
                keyword_analysis=analysis_result.get('keyword_analysis', {}),
                ats_compatibility=analysis_result.get('ats_compatibility', {}),
                action_items=analysis_result.get('action_items', []),
                best_practices=analysis_result.get('best_practices', [])
            )
            db.add(db_analysis)
        
        db.commit()
        db.refresh(db_analysis)
        
        print(f"✅ Analysis saved - Overall score: {overall_score}/100")
        
        return {
            "message": "Resume analysis completed successfully",
            "analysis_id": db_analysis.id,
            "overall_score": overall_score,
            "analyzed_at": db_analysis.analyzed_at.isoformat()
        }
        
    except Exception as e:
        print(f"❌ Analysis error: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to analyze resume: {str(e)}"
        )


@router.get("/")
async def get_resume_analysis(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get the most recent resume analysis for current user
    """
    
    resume = db.query(Resume).filter(
        Resume.user_id == current_user.id
    ).first()
    
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No resume found"
        )
    
    analysis = db.query(ResumeAnalysis).filter(
        ResumeAnalysis.resume_id == resume.id
    ).order_by(ResumeAnalysis.analyzed_at.desc()).first()
    
    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No analysis found. Please analyze your resume first."
        )
    
    return {
        "id": analysis.id,
        "overall_score": analysis.overall_score,
        "category_scores": {
            "content": analysis.content_score,
            "formatting": analysis.formatting_score,
            "ats_compatibility": analysis.ats_score,
            "keywords": analysis.keywords_score,
            "experience": analysis.experience_score,
            "education": analysis.education_score,
            "skills": analysis.skills_score
        },
        "strengths": analysis.strengths,
        "weaknesses": analysis.weaknesses,
        "improvements": analysis.improvements,
        "section_analysis": analysis.section_analysis,
        "keyword_analysis": analysis.keyword_analysis,
        "ats_compatibility": analysis.ats_compatibility,
        "action_items": analysis.action_items,
        "best_practices": analysis.best_practices,
        "analyzed_at": analysis.analyzed_at.isoformat(),
        "resume_filename": resume.filename
    }


@router.delete("/")
async def delete_resume_analysis(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete resume analysis"""
    
    resume = db.query(Resume).filter(
        Resume.user_id == current_user.id
    ).first()
    
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No resume found"
        )
    
    analysis = db.query(ResumeAnalysis).filter(
        ResumeAnalysis.resume_id == resume.id
    ).first()
    
    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No analysis found"
        )
    
    db.delete(analysis)
    db.commit()
    
    return {"message": "Resume analysis deleted successfully"}