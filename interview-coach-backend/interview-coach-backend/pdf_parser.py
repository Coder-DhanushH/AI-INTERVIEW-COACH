import re
from typing import Dict, List
import PyPDF2
from typing import Optional
import os

def parse_pdf(file_path: str) -> Optional[str]:
    """
    Extract text from PDF file
    
    Args:
        file_path: Path to the PDF file
        
    Returns:
        Extracted text or None if extraction fails
    """
    try:
        with open(file_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            text = ""
            
            # Extract text from all pages
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
            
            return text.strip()
    except Exception as e:
        print(f"Error parsing PDF: {str(e)}")
        return None

def validate_pdf(file_path: str) -> bool:
    """
    Validate if the file is a valid PDF
    
    Args:
        file_path: Path to the file
        
    Returns:
        True if valid PDF, False otherwise
    """
    try:
        with open(file_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            # Try to access the first page to validate
            if len(pdf_reader.pages) > 0:
                return True
        return False
    except Exception:
        return False


def extract_skills_from_text(text: str) -> Dict[str, List[str]]:
    """
    Extract skills, technologies, and keywords from resume text
    Uses keyword matching and pattern recognition
    """
    
    # Convert to lowercase for matching
    text_lower = text.lower()
    
    # Skill categories with keywords
    skill_database = {
        "programming_languages": [
            "python", "javascript", "java", "c++", "c#", "ruby", "go", "rust",
            "typescript", "php", "swift", "kotlin", "scala", "r", "matlab"
        ],
        "frameworks_libraries": [
            "react", "angular", "vue", "django", "flask", "fastapi", "spring",
            "node.js", "express", "next.js", "tensorflow", "pytorch", "pandas",
            "numpy", "scikit-learn", "keras", "bootstrap", "tailwind"
        ],
        "databases": [
            "postgresql", "mysql", "mongodb", "redis", "elasticsearch",
            "dynamodb", "cassandra", "oracle", "sql server", "sqlite"
        ],
        "cloud_devops": [
            "aws", "azure", "gcp", "docker", "kubernetes", "jenkins",
            "github actions", "gitlab ci", "terraform", "ansible", "ci/cd"
        ],
        "tools": [
            "git", "jira", "confluence", "postman", "figma", "slack",
            "vs code", "intellij", "jupyter", "tableau", "power bi"
        ],
        "soft_skills": [
            "leadership", "communication", "teamwork", "problem solving",
            "agile", "scrum", "project management", "collaboration",
            "critical thinking", "time management"
        ]
    }
    
    # Extract skills
    extracted_skills = {}
    
    for category, keywords in skill_database.items():
        found_skills = []
        for keyword in keywords:
            # Check if keyword exists in text
            if keyword in text_lower:
                # Capitalize properly
                found_skills.append(keyword.title())
        
        if found_skills:
            extracted_skills[category] = sorted(list(set(found_skills)))
    
    return extracted_skills


def parse_pdf(file_path: str) -> str:
    """Extract text from PDF file"""
    try:
        with open(file_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text()
            return text
    except Exception as e:
        print(f"Error parsing PDF: {e}")
        return ""


def validate_pdf(file_path: str) -> bool:
    """Validate if file is a proper PDF"""
    try:
        with open(file_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            # Check if it has at least one page
            return len(pdf_reader.pages) > 0
    except:
        return False