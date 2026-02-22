from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
import os
import shutil
from datetime import datetime

from database import get_db
from models import User, Resume
from schemas import ResumeResponse
from auth import get_current_user
from pdf_parser import parse_pdf, validate_pdf, extract_skills_from_text  # Add import for skill extraction

router = APIRouter(prefix="/api/resume", tags=["Resume"])

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads/resumes")
MAX_FILE_SIZE = int(os.getenv("MAX_FILE_SIZE", 5242880))  # 5MB

# Create upload directory if it doesn't exist
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload", response_model=ResumeResponse, status_code=status.HTTP_201_CREATED)
async def upload_resume(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload and parse user resume (PDF only)"""
    
    # Validate file type
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are allowed"
        )
    
    # Read file content to check size
    file_content = await file.read()
    file_size = len(file_content)
    
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File size exceeds maximum allowed size of {MAX_FILE_SIZE / 1024 / 1024}MB"
        )
    
    # Reset file pointer
    await file.seek(0)
    
    # Generate unique filename
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{current_user.id}_{timestamp}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    
    try:
        # Save file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Validate PDF
        if not validate_pdf(file_path):
            os.remove(file_path)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or corrupted PDF file"
            )
        
        # Parse PDF text
        parsed_text = parse_pdf(file_path)
        
        extracted_skills = extract_skills_from_text(parsed_text)
        
        # Check if user already has a resume
        existing_resume = db.query(Resume).filter(Resume.user_id == current_user.id).first()
        
        if existing_resume:
            # Delete old file
            if os.path.exists(existing_resume.file_path):
                os.remove(existing_resume.file_path)
            
            # Update existing resume
            existing_resume.filename = file.filename
            existing_resume.file_path = file_path
            existing_resume.parsed_text = parsed_text
            existing_resume.extracted_skills = extracted_skills
            existing_resume.uploaded_at = datetime.utcnow()
            db_resume = existing_resume
        else:
            # Create new resume record
            db_resume = Resume(
                user_id=current_user.id,
                filename=file.filename,
                file_path=file_path,
                parsed_text=parsed_text,
                extracted_skills=extracted_skills
            )
            db.add(db_resume)
        
        db.commit()
        db.refresh(db_resume)
        
        return db_resume
        
    except Exception as e:
        # Clean up file if something goes wrong
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload resume: {str(e)}"
        )

@router.get("/", response_model=ResumeResponse)
async def get_resume(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's resume"""
    resume = db.query(Resume).filter(Resume.user_id == current_user.id).first()
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found"
        )
    return resume

@router.delete("/", status_code=status.HTTP_204_NO_CONTENT)
async def delete_resume(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete current user's resume"""
    resume = db.query(Resume).filter(Resume.user_id == current_user.id).first()
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found"
        )
    
    # Delete file from disk
    if os.path.exists(resume.file_path):
        os.remove(resume.file_path)
    
    # Delete from database
    db.delete(resume)
    db.commit()
    
    return None
