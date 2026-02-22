from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255))
    phone = Column(String(20))
    experience_years = Column(Integer)
    role = Column(String(100))  # e.g., "Software Developer", "Marketing Manager"
    github_link = Column(String(255))
    linkedin_link = Column(String(255))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    resume = relationship("Resume", back_populates="user", uselist=False)

class Resume(Base):
    __tablename__ = "resumes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    parsed_text = Column(Text)  # Store extracted text from PDF
    
    # Store extracted skills as JSONB (PostgreSQL specific)
    extracted_skills = Column(JSONB, nullable=True, default=lambda: {})  # ← Fixed default
    uploaded_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    # Relationship (make sure User model has this too)
    user = relationship("User", back_populates="resume")

class PasswordResetToken(Base):
    """Password reset token model"""
    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token = Column(String(255), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used = Column(Integer, default=0)  # 0 = not used, 1 = used
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class QuestionCategory(Base):
    """Question categories (Software Dev, Data Science, etc.)"""
    __tablename__ = "question_categories"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Question(Base):
    """Interview questions (AI-generated or predefined)"""
    __tablename__ = "questions"
    
    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("question_categories.id"), nullable=False)
    question_text = Column(Text, nullable=False)
    difficulty = Column(String(20), nullable=False)  # Easy, Medium, Hard
    question_type = Column(String(50))  # behavioral, technical, situational
    is_ai_generated = Column(Boolean, default=False)
    question_metadata = Column(JSONB, nullable=True, default=lambda: {})  # Store additional info
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class InterviewSession(Base):
    """Interview sessions (practice interviews)"""
    __tablename__ = "interview_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    category_id = Column(Integer, ForeignKey("question_categories.id"))
    difficulty = Column(String(20))
    total_questions = Column(Integer)
    completed_questions = Column(Integer, default=0)
    status = Column(String(20), default='in_progress')  # in_progress, completed, abandoned
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True))


class SessionQuestion(Base):
    """Questions in a specific session with user answers"""
    __tablename__ = "session_questions"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("interview_sessions.id", ondelete="CASCADE"), nullable=False)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    question_order = Column(Integer)
    answer_text = Column(Text)
    time_taken = Column(Integer)  # seconds
    answered_at = Column(DateTime(timezone=True))
    score = Column(Integer)  # 0-100 (for future evaluation)
    feedback = Column(Text)  # for future evaluation