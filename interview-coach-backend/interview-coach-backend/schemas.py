from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)
    full_name: Optional[str] = None

class UserCreate(UserBase):
    password: str = Field(..., min_length=6)

class UserLogin(BaseModel):
    username: str
    password: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    experience_years: Optional[int] = Field(None, ge=0, le=50)
    role: Optional[str] = None
    github_link: Optional[str] = None
    linkedin_link: Optional[str] = None

class UserResponse(UserBase):
    id: int
    phone: Optional[str] = None
    experience_years: Optional[int] = None
    role: Optional[str] = None
    github_link: Optional[str] = None
    linkedin_link: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

# Token Schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

# Resume Schemas
class ResumeResponse(BaseModel):
    id: int
    filename: str
    uploaded_at: datetime
    parsed_text: Optional[str] = None
    
    class Config:
        from_attributes = True

class UserWithResume(UserResponse):
    resume: Optional[ResumeResponse] = None
    
    class Config:
        from_attributes = True
