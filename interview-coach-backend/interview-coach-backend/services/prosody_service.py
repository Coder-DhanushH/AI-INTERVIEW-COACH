import re
from typing import Dict, List
from collections import Counter

class ProsodyAnalysisService:
    """
    Analyze speech patterns from transcript and audio metadata
    """
    
    # Common filler words to detect
    FILLER_WORDS = [
        'um', 'uh', 'er', 'ah', 'like', 'you know', 'basically',
        'actually', 'literally', 'so', 'well', 'yeah', 'right',
        'okay', 'ok', 'i mean', 'kind of', 'sort of'
    ]
    
    def analyze_transcript(
        self, 
        transcript: str, 
        audio_duration: int  # in seconds
    ) -> Dict:
        """
        Analyze speech patterns from transcript
        
        Args:
            transcript: Text of spoken answer
            audio_duration: Length of audio in seconds
            
        Returns:
            Dictionary with speech metrics
        """
        
        # Clean transcript
        text = transcript.lower().strip()
        
        # 1. Count words
        words = text.split()
        word_count = len(words)
        
        # 2. Calculate speech rate (words per minute)
        duration_minutes = audio_duration / 60
        speech_rate = round(word_count / duration_minutes) if duration_minutes > 0 else 0
        
        # 3. Detect filler words
        filler_words_found = []
        filler_count = 0
        
        for filler in self.FILLER_WORDS:
            # Use word boundaries to avoid false matches
            pattern = r'\b' + re.escape(filler) + r'\b'
            matches = re.findall(pattern, text)
            if matches:
                filler_words_found.extend(matches)
                filler_count += len(matches)
        
        # 4. Estimate pause count (based on punctuation and sentence breaks)
        pause_indicators = text.count('.') + text.count(',') + text.count('?') + text.count('!')
        
        # 5. Calculate fluency score (0-100)
        fluency_score = self._calculate_fluency_score(
            speech_rate, filler_count, word_count
        )
        
        # 6. Calculate clarity score (based on word length and complexity)
        clarity_score = self._calculate_clarity_score(words)
        
        # 7. Calculate confidence score (based on pace and fillers)
        confidence_score = self._calculate_confidence_score(
            speech_rate, filler_count, word_count
        )
        
        # 8. Determine tone variation (simplified)
        tone_variation = self._assess_tone_variation(text)
        
        return {
            "word_count": word_count,
            "speech_rate": speech_rate,  # WPM
            "filler_words_count": filler_count,
            "filler_words": list(set(filler_words_found)),  # unique fillers
            "pause_count": pause_indicators,
            "avg_pause_duration": round(audio_duration / (pause_indicators + 1), 2) if pause_indicators > 0 else 0,
            "fluency_score": fluency_score,
            "clarity_score": clarity_score,
            "confidence_score": confidence_score,
            "tone_variation": tone_variation,
            "duration_seconds": audio_duration
        }
    
    def _calculate_fluency_score(self, speech_rate: int, filler_count: int, word_count: int) -> int:
        """
        Calculate fluency score (0-100)
        
        Ideal speech rate: 120-150 WPM
        Filler words: Should be < 5% of total words
        """
        score = 100
        
        # Penalty for speech rate
        if speech_rate < 100:
            score -= (100 - speech_rate) * 0.5  # Too slow
        elif speech_rate > 180:
            score -= (speech_rate - 180) * 0.3  # Too fast
        
        # Penalty for filler words
        if word_count > 0:
            filler_percentage = (filler_count / word_count) * 100
            if filler_percentage > 5:
                score -= (filler_percentage - 5) * 2
        
        return max(0, min(100, round(score)))
    
    def _calculate_clarity_score(self, words: List[str]) -> int:
        """
        Calculate clarity score based on word complexity
        """
        if not words:
            return 0
        
        # Average word length (shorter = clearer for most interviews)
        avg_word_length = sum(len(word) for word in words) / len(words)
        
        # Score based on average word length (ideal: 4-6 characters)
        if 4 <= avg_word_length <= 6:
            score = 90
        elif 3 <= avg_word_length <= 7:
            score = 80
        else:
            score = 70
        
        # Bonus for varied vocabulary (not repeating same words)
        unique_words = len(set(words))
        repetition_ratio = unique_words / len(words)
        
        if repetition_ratio > 0.7:
            score += 10
        elif repetition_ratio < 0.4:
            score -= 10
        
        return max(0, min(100, round(score)))
    
    def _calculate_confidence_score(self, speech_rate: int, filler_count: int, word_count: int) -> int:
        """
        Calculate confidence score based on speech patterns
        
        Confident speakers:
        - Speak at steady pace (120-160 WPM)
        - Use fewer filler words
        - Don't speak too fast (nervousness) or too slow (uncertainty)
        """
        score = 100
        
        # Ideal confident pace: 130-150 WPM
        if 130 <= speech_rate <= 150:
            score = 95
        elif 120 <= speech_rate < 130 or 150 < speech_rate <= 160:
            score = 85
        elif speech_rate < 100:
            score = 60  # Too slow suggests uncertainty
        elif speech_rate > 180:
            score = 65  # Too fast suggests nervousness
        else:
            score = 75
        
        # Penalty for excessive filler words (indicates nervousness/uncertainty)
        if word_count > 0:
            filler_percentage = (filler_count / word_count) * 100
            if filler_percentage > 8:
                score -= 20
            elif filler_percentage > 5:
                score -= 10
        
        return max(0, min(100, round(score)))
    
    def _assess_tone_variation(self, text: str) -> str:
        """
        Assess tone variation based on sentence structure
        Simple heuristic based on punctuation variety
        """
        has_questions = '?' in text
        has_exclamations = '!' in text
        sentence_count = text.count('.') + text.count('?') + text.count('!')
        
        # Count different types of sentences
        variety_count = sum([has_questions, has_exclamations])
        
        if variety_count >= 2 and sentence_count > 3:
            return "excellent"
        elif variety_count >= 1 or sentence_count > 2:
            return "good"
        elif sentence_count > 1:
            return "moderate"
        else:
            return "monotone"
    
    def generate_speech_feedback(self, metrics: Dict) -> Dict:
        """
        Generate human-readable feedback based on speech metrics
        
        Returns:
            Dict with feedback and improvements
        """
        feedback_parts = []
        improvements = []
        
        # Speech rate feedback
        wpm = metrics['speech_rate']
        if 120 <= wpm <= 150:
            feedback_parts.append(f"Great speaking pace at {wpm} words per minute")
        elif 100 <= wpm < 120:
            feedback_parts.append(f"Slightly slow pace at {wpm} WPM")
            improvements.append("Try to increase your speaking pace to 120-150 WPM for better engagement")
        elif 150 < wpm <= 180:
            feedback_parts.append(f"Fast pace at {wpm} WPM, but still understandable")
            improvements.append("Consider slowing down slightly to ensure clarity")
        elif wpm > 180:
            feedback_parts.append(f"Very fast pace at {wpm} WPM")
            improvements.append("Slow down significantly - aim for 120-150 WPM to improve clarity")
        else:
            feedback_parts.append(f"Slow pace at {wpm} WPM")
            improvements.append("Increase your speaking pace to sound more confident and engaging")
        
        # Filler words feedback
        filler_count = metrics['filler_words_count']
        word_count = metrics['word_count']
        filler_percentage = (filler_count / word_count * 100) if word_count > 0 else 0
        
        if filler_count == 0:
            feedback_parts.append("Excellent - no filler words detected")
        elif filler_count <= 2:
            feedback_parts.append(f"Minimal filler words ({filler_count} instances)")
        elif filler_percentage <= 5:
            feedback_parts.append(f"Good control of filler words ({filler_count} instances)")
        else:
            feedback_parts.append(f"Noticeable filler words ({filler_count} instances)")
            common_fillers = ', '.join(metrics['filler_words'][:3])
            improvements.append(f"Reduce filler words like '{common_fillers}' - pause instead")
        
        # Tone variation feedback
        tone = metrics['tone_variation']
        if tone == "excellent":
            feedback_parts.append("Excellent tone variation keeps listeners engaged")
        elif tone == "good":
            feedback_parts.append("Good tone variation throughout")
        elif tone == "moderate":
            improvements.append("Add more variety to your tone to sound more engaging")
        else:
            improvements.append("Vary your tone more - avoid sounding monotonous")
        
        # Confidence feedback
        confidence = metrics['confidence_score']
        if confidence >= 85:
            feedback_parts.append("You sound confident and well-prepared")
        elif confidence >= 70:
            feedback_parts.append("Generally confident delivery")
        else:
            improvements.append("Work on speaking more confidently - practice will help")
        
        # Combine feedback
        feedback_text = ". ".join(feedback_parts) + "."
        
        # Ensure we have at least one improvement suggestion
        if not improvements:
            improvements.append("Keep practicing to maintain this excellent speaking style")
        
        return {
            "feedback": feedback_text,
            "improvements": improvements[:3],  # Max 3 improvements
            "overall_speech_score": round((
                metrics['fluency_score'] * 0.4 + 
                metrics['clarity_score'] * 0.3 + 
                metrics['confidence_score'] * 0.3
            ))
        }