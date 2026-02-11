from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone

import secrets
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from dotenv import load_dotenv

from database import get_db
from models import User, PasswordResetToken
from auth import get_password_hash
from schemas import ResetPasswordRequest

load_dotenv()

router = APIRouter(prefix="/api/password", tags=["Password Reset"])

# Email configuration (from .env)
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

def send_reset_email(email: str, token: str):
    """Send password reset email"""
    
    # For development: Just print the link
    reset_link = f"{FRONTEND_URL}/reset-password?token={token}"
    
    # If SMTP is not configured, just print to console
    if not SMTP_USERNAME or not SMTP_PASSWORD:
        print("=" * 60)
        print("PASSWORD RESET EMAIL (Development Mode)")
        print("=" * 60)
        print(f"To: {email}")
        print(f"Reset Link: {reset_link}")
        print("=" * 60)
        print("\nConfigure SMTP in .env to send real emails")
        return True
    
    # Production: Send actual email
    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = "Reset Your Password - AI Interview Coach"
        msg['From'] = SMTP_USERNAME
        msg['To'] = email
        
        # Create HTML email
        html = f"""
        <html>
            <head></head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                        <h1 style="color: white; margin: 0;">AI Interview Coach</h1>
                    </div>
                    <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                        <h2 style="color: #333;">Reset Your Password</h2>
                        <p>You requested to reset your password. Click the button below to set a new password:</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="{reset_link}" 
                               style="background: #2563EB; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                                Reset Password
                            </a>
                        </div>
                        <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
                        <p style="background: white; padding: 10px; border-radius: 5px; word-break: break-all; font-size: 12px;">
                            {reset_link}
                        </p>
                        <p style="color: #666; font-size: 14px; margin-top: 30px;">
                            <strong>This link will expire in 1 hour.</strong>
                        </p>
                        <p style="color: #666; font-size: 14px;">
                            If you didn't request this, please ignore this email. Your password will remain unchanged.
                        </p>
                    </div>
                    <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
                        <p>© 2026 AI Interview Coach. All rights reserved.</p>
                    </div>
                </div>
            </body>
        </html>
        """
        
        part = MIMEText(html, 'html')
        msg.attach(part)
        
        # Send email
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.send_message(msg)
        
        return True
    except Exception as e:
        print(f"Failed to send email: {e}")
        return False


@router.post("/forgot-password")
async def forgot_password(email: str, db: Session = Depends(get_db)):
    """
    Request password reset
    Sends email with reset token
    """
    
    # Find user by email
    user = db.query(User).filter(User.email == email).first()
    
    # Always return success (don't reveal if email exists)
    # This prevents email enumeration attacks
    if not user:
        return {
            "success": True,
            "message": "If the email exists, a password reset link has been sent."
        }
    
    # Generate secure token
    token = secrets.token_urlsafe(32)
    
    # Set expiry (1 hour from now)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
    
    # Delete any existing tokens for this user
    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id
    ).delete()
    
    # Create new reset token
    reset_token = PasswordResetToken(
        user_id=user.id,
        token=token,
        expires_at=expires_at,
        used=0
    )
    db.add(reset_token)
    db.commit()
    
    # Send email
    send_reset_email(user.email, token)
    
    return {
        "success": True,
        "message": "If the email exists, a password reset link has been sent."
    }


@router.post("/reset-password")
async def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    """
    Reset password using token
    """
    
    # Validate password
    if len(payload.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long"
        )
    
    # Find token
    reset_token = db.query(PasswordResetToken).filter(
        PasswordResetToken.token == payload.token
    ).first()
    
    if not reset_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )
    
    # Check if token is expired
    if datetime.now(timezone.utc) > reset_token.expires_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset token has expired. Please request a new one."
        )
    
    # Check if token was already used
    if reset_token.used == 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This reset token has already been used"
        )
    
    # Get user
    user = db.query(User).filter(User.id == reset_token.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Update password
    user.hashed_password = get_password_hash(payload.new_password)
    
    # Mark token as used
    reset_token.used = 1
    
    db.commit()
    
    return {
        "success": True,
        "message": "Password has been reset successfully"
    }


@router.get("/verify-token/{token}")
async def verify_reset_token(token: str, db: Session = Depends(get_db)):
    """
    Verify if a reset token is valid
    Used by frontend to check token before showing reset form
    """
    
    reset_token = db.query(PasswordResetToken).filter(
        PasswordResetToken.token == token,
        PasswordResetToken.used == 0
    ).first()
    
    if not reset_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid reset token"
        )
    
    # Check if expired
    if datetime.now(timezone.utc) > reset_token.expires_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset token has expired"
        )
    
    # Get user email (for display)
    user = db.query(User).filter(User.id == reset_token.user_id).first()
    
    return {
        "valid": True,
        "email": user.email if user else None
    }
