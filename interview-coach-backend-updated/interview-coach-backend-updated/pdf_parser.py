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
