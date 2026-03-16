# File: backend/services/video_analysis_service.py

import os
from typing import List, Dict
from google import genai
import base64

class VideoAnalysisService:
    """
    Analyze FULL SESSION video using Google Gemini Vision API (FREE).
    Evaluates overall confidence, body language, and presentation.
    """
    
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY_VIDEO_ANALYSIS")
        if not api_key:
            raise ValueError("GEMINI_API_KEY_VIDEO_ANALYSIS not found in environment variables")
        
        self.client = genai.Client(api_key=api_key)
        print("✅ Gemini Vision API initialized (FREE tier)")
    
    def analyze_session_video(self, frame_paths: List[str], session_duration: int) -> Dict:
        """
        Analyze entire interview session for overall performance
        
        Args:
            frame_paths: List of paths to frame images (sampled throughout session)
            session_duration: Total session duration in seconds
            
        Returns:
            Dictionary with analysis results
        """
        try:
            print(f"🔍 Analyzing {len(frame_paths)} frames from {session_duration}s session with Gemini Vision...")
            
            # Load and encode frames as base64 (limit to 30 for API)
            frames_base64 = []
            sample_indices = self._sample_frames(len(frame_paths), max_frames=30)
            
            for idx in sample_indices:
                try:
                    with open(frame_paths[idx], 'rb') as f:
                        image_data = f.read()
                        encoded = base64.b64encode(image_data).decode('utf-8')
                        frames_base64.append(encoded)
                except Exception as e:
                    print(f"⚠️ Error loading frame {frame_paths[idx]}: {e}")
            
            if not frames_base64:
                return self._generate_default_analysis()
            
            # Create analysis prompt
            prompt = self._create_session_analysis_prompt(len(frames_base64), session_duration)
            
            # Build content parts
            content_parts = [{"text": prompt}]
            for frame_b64 in frames_base64:
                content_parts.append({
                    "inline_data": {
                        "mime_type": "image/jpeg",
                        "data": frame_b64
                    }
                })
            
            # Analyze with Gemini Vision
            response = self.client.models.generate_content(
                model="gemini-2.5-flash",
                contents={"parts": content_parts}
            )
            
            analysis_text = response.text
            print(f"📊 Gemini Vision analysis complete: {len(analysis_text)} chars")
            
            # Parse response
            metrics = self._parse_analysis_response(analysis_text)
            metrics["total_frames_analyzed"] = len(frames_base64)
            metrics["session_duration"] = session_duration
            
            return metrics
        
        except Exception as e:
            print(f"❌ Video analysis error: {e}")
            import traceback
            traceback.print_exc()
            return self._generate_default_analysis()
    
    def _sample_frames(self, total_frames: int, max_frames: int = 30) -> List[int]:
        """Sample frames evenly across the video"""
        if total_frames <= max_frames:
            return list(range(total_frames))
        
        step = total_frames / max_frames
        return [int(i * step) for i in range(max_frames)]
    
    def _create_session_analysis_prompt(self, frame_count: int, session_duration: int) -> str:
        """Create prompt for full session analysis"""
        duration_minutes = session_duration / 60
        
        return f"""You are an expert interview coach analyzing a complete {duration_minutes:.1f}-minute interview session.

You are viewing {frame_count} frames sampled evenly throughout the entire interview session.

Analyze the candidate's OVERALL performance across the ENTIRE session and evaluate:

1. **Overall Confidence** (0-100):
   - Consistent confident posture maintained throughout
   - Steady, appropriate eye contact over time
   - Minimal nervous behaviors (fidgeting, excessive movement)
   - Professional demeanor from start to finish
   - Score: 90-100 (Excellent), 70-89 (Good), 50-69 (Fair), <50 (Needs improvement)

2. **Body Language Consistency** (0-100):
   - Maintains professional posture throughout session
   - Appropriate, natural hand gestures
   - Engaged positioning (leaning slightly forward)
   - No signs of fatigue or distraction over time
   - Consistent energy level

3. **Eye Contact & Engagement** (0-100):
   - Looks at camera (representing interviewer) regularly
   - Gaze is steady, not wandering
   - Maintains engagement throughout all questions
   - Shows active listening and focus

4. **Professional Presentation** (0-100):
   - Appropriate professional attire
   - Good lighting throughout (face clearly visible)
   - Clean, non-distracting background
   - Proper framing and camera positioning
   - Professional environment maintained

5. **Consistency Over Time** (0-100):
   - Performance remains steady from start to finish
   - No significant drop in engagement or energy
   - Maintains composure throughout
   - No signs of increasing nervousness

For each criterion, provide:
- A score from 0-100
- A brief 2-3 sentence observation about OVERALL performance
- One specific improvement suggestion if score < 80

Format your response EXACTLY as follows:

OVERALL_CONFIDENCE_SCORE: [0-100]
OVERALL_CONFIDENCE_FEEDBACK: [Your 2-3 sentence observation]
OVERALL_CONFIDENCE_IMPROVEMENT: [One specific tip, or "Excellent performance!"]

BODY_LANGUAGE_SCORE: [0-100]
BODY_LANGUAGE_FEEDBACK: [Your 2-3 sentence observation]
BODY_LANGUAGE_IMPROVEMENT: [One specific tip, or "Keep it up!"]

EYE_CONTACT_SCORE: [0-100]
EYE_CONTACT_FEEDBACK: [Your 2-3 sentence observation]
EYE_CONTACT_IMPROVEMENT: [One specific tip, or "Great eye contact!"]

PRESENTATION_SCORE: [0-100]
PRESENTATION_FEEDBACK: [Your 2-3 sentence observation]
PRESENTATION_IMPROVEMENT: [One specific tip, or "Professional setup!"]

CONSISTENCY_SCORE: [0-100]
CONSISTENCY_FEEDBACK: [Your 2-3 sentence observation]
CONSISTENCY_IMPROVEMENT: [One specific tip, or "Consistent throughout!"]

Be honest but constructive. Focus on the ENTIRE session, not individual moments."""
    
    def _parse_analysis_response(self, response_text: str) -> Dict:
        """Parse Gemini Vision response into structured metrics"""
        
        metrics = {
            "overall_confidence": {"score": 75, "feedback": "", "improvement": ""},
            "body_language": {"score": 75, "feedback": "", "improvement": ""},
            "eye_contact": {"score": 75, "feedback": "", "improvement": ""},
            "presentation": {"score": 75, "feedback": "", "improvement": ""},
            "consistency": {"score": 75, "feedback": "", "improvement": ""},
            "overall_video_score": 75,
            "total_frames_analyzed": 0,
            "session_duration": 0
        }
        
        try:
            lines = response_text.strip().split('\n')
            
            for line in lines:
                line = line.strip()
                
                # Overall Confidence
                if line.startswith("OVERALL_CONFIDENCE_SCORE:"):
                    score = int(line.split(':')[1].strip())
                    metrics["overall_confidence"]["score"] = max(0, min(100, score))
                elif line.startswith("OVERALL_CONFIDENCE_FEEDBACK:"):
                    metrics["overall_confidence"]["feedback"] = line.split(':', 1)[1].strip()
                elif line.startswith("OVERALL_CONFIDENCE_IMPROVEMENT:"):
                    metrics["overall_confidence"]["improvement"] = line.split(':', 1)[1].strip()
                
                # Body Language
                elif line.startswith("BODY_LANGUAGE_SCORE:"):
                    score = int(line.split(':')[1].strip())
                    metrics["body_language"]["score"] = max(0, min(100, score))
                elif line.startswith("BODY_LANGUAGE_FEEDBACK:"):
                    metrics["body_language"]["feedback"] = line.split(':', 1)[1].strip()
                elif line.startswith("BODY_LANGUAGE_IMPROVEMENT:"):
                    metrics["body_language"]["improvement"] = line.split(':', 1)[1].strip()
                
                # Eye Contact
                elif line.startswith("EYE_CONTACT_SCORE:"):
                    score = int(line.split(':')[1].strip())
                    metrics["eye_contact"]["score"] = max(0, min(100, score))
                elif line.startswith("EYE_CONTACT_FEEDBACK:"):
                    metrics["eye_contact"]["feedback"] = line.split(':', 1)[1].strip()
                elif line.startswith("EYE_CONTACT_IMPROVEMENT:"):
                    metrics["eye_contact"]["improvement"] = line.split(':', 1)[1].strip()
                
                # Presentation
                elif line.startswith("PRESENTATION_SCORE:"):
                    score = int(line.split(':')[1].strip())
                    metrics["presentation"]["score"] = max(0, min(100, score))
                elif line.startswith("PRESENTATION_FEEDBACK:"):
                    metrics["presentation"]["feedback"] = line.split(':', 1)[1].strip()
                elif line.startswith("PRESENTATION_IMPROVEMENT:"):
                    metrics["presentation"]["improvement"] = line.split(':', 1)[1].strip()
                
                # Consistency
                elif line.startswith("CONSISTENCY_SCORE:"):
                    score = int(line.split(':')[1].strip())
                    metrics["consistency"]["score"] = max(0, min(100, score))
                elif line.startswith("CONSISTENCY_FEEDBACK:"):
                    metrics["consistency"]["feedback"] = line.split(':', 1)[1].strip()
                elif line.startswith("CONSISTENCY_IMPROVEMENT:"):
                    metrics["consistency"]["improvement"] = line.split(':', 1)[1].strip()
            
            # Calculate overall score (weighted average)
            total = (
                metrics["overall_confidence"]["score"] * 0.30 +  # 30% weight
                metrics["body_language"]["score"] * 0.25 +       # 25% weight
                metrics["eye_contact"]["score"] * 0.25 +         # 25% weight
                metrics["presentation"]["score"] * 0.10 +        # 10% weight
                metrics["consistency"]["score"] * 0.10           # 10% weight
            )
            metrics["overall_video_score"] = round(total)
            
        except Exception as e:
            print(f"⚠️ Error parsing Gemini response: {e}")
            print(f"Response text: {response_text[:500]}")
        
        return metrics
    
    def _generate_default_analysis(self) -> Dict:
        """Generate default analysis when Gemini fails"""
        return {
            "overall_confidence": {
                "score": 75,
                "feedback": "Video analysis unavailable - unable to evaluate confidence",
                "improvement": "Ensure good lighting and stable camera positioning"
            },
            "body_language": {
                "score": 75,
                "feedback": "Video analysis unavailable - unable to evaluate body language",
                "improvement": "Maintain upright posture and natural gestures"
            },
            "eye_contact": {
                "score": 75,
                "feedback": "Video analysis unavailable - unable to evaluate eye contact",
                "improvement": "Look at the camera regularly during responses"
            },
            "presentation": {
                "score": 75,
                "feedback": "Video analysis unavailable - unable to evaluate presentation",
                "improvement": "Check camera, lighting, and background before recording"
            },
            "consistency": {
                "score": 75,
                "feedback": "Video analysis unavailable - unable to evaluate consistency",
                "improvement": "Maintain steady performance throughout the session"
            },
            "overall_video_score": 75,
            "total_frames_analyzed": 0,
            "session_duration": 0
        }
    
    def generate_video_feedback(self, metrics: Dict) -> Dict:
        """Generate human-readable summary feedback"""
        
        feedback_parts = []
        improvements = []
        
        # Overall Confidence
        conf_score = metrics["overall_confidence"]["score"]
        if conf_score >= 85:
            feedback_parts.append("Excellent confidence displayed throughout the session")
        elif conf_score >= 70:
            feedback_parts.append("Good overall confidence shown")
        else:
            improvements.append(metrics["overall_confidence"]["improvement"])
        
        # Body Language
        bl_score = metrics["body_language"]["score"]
        if bl_score >= 85:
            feedback_parts.append("Professional and engaged body language maintained")
        elif bl_score < 70:
            improvements.append(metrics["body_language"]["improvement"])
        
        # Eye Contact
        ec_score = metrics["eye_contact"]["score"]
        if ec_score >= 85:
            feedback_parts.append("Strong eye contact maintained")
        elif ec_score < 70:
            improvements.append(metrics["eye_contact"]["improvement"])
        
        # Presentation
        p_score = metrics["presentation"]["score"]
        if p_score >= 85:
            feedback_parts.append("Professional presentation setup")
        elif p_score < 70:
            improvements.append(metrics["presentation"]["improvement"])
        
        # Consistency
        c_score = metrics["consistency"]["score"]
        if c_score >= 85:
            feedback_parts.append("Consistent performance from start to finish")
        elif c_score < 70:
            improvements.append(metrics["consistency"]["improvement"])
        
        # Combine feedback
        feedback_text = ". ".join(feedback_parts) + "." if feedback_parts else "Video analysis completed."
        
        # Ensure we have improvements
        if not improvements:
            improvements = ["Keep practicing to maintain this excellent interview presence"]
        
        return {
            "feedback": feedback_text,
            "improvements": improvements[:3],
            "overall_score": metrics["overall_video_score"]
        }