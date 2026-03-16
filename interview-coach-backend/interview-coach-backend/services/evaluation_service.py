from google import genai
import os
import json
from typing import Dict

class EvaluationService:
    def __init__(self):
        self.client = genai.Client(api_key=os.getenv("GEMINI_API_KEY_EVALUATION"))
    
    def evaluate_answer(
        self, 
        question: str, 
        answer: str, 
        question_type: str,
        difficulty: str
    ) -> Dict:
        """
        Evaluate a candidate's answer using Gemini AI
        Returns scores and feedback
        """
        
        prompt = f"""You are an expert interview coach evaluating a candidate's answer.

Question: {question}
Question Type: {question_type}
Difficulty: {difficulty}
Candidate's Answer: {answer}

Evaluate the answer on these 4 criteria (score 0-100 for each):

1. **Content Quality** - How well does it answer the question? Is the information accurate and relevant?
2. **Clarity** - Is the answer clear, well-structured, and easy to understand?
3. **Technical Accuracy** - Are technical details, terminology, and concepts correct? (if applicable)
4. **Completeness** - Does it cover all aspects of the question? Any missing important points?

Provide:
- A score (0-100) for each of the 4 criteria
- An overall score (weighted average: Content 40%, Clarity 20%, Technical 25%, Completeness 15%)
- Brief feedback (2-3 sentences on what was good)
- Specific improvements needed (2-3 bullet points)

Return response as VALID JSON ONLY (no markdown, no code blocks):
{{
  "scores": {{
    "content": 85,
    "clarity": 90,
    "technical_accuracy": 80,
    "completeness": 85
  }},
  "overall_score": 85,
  "feedback": "Your answer demonstrates a solid understanding of the concept with clear examples. The structure is logical and easy to follow.",
  "improvements": [
    "Add more specific real-world examples to strengthen your points",
    "Clarify the technical implementation details in the second part"
  ]
}}"""

        try:
            response = self.client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt
            )
            text = response.text.strip()
            
            # Remove markdown code blocks if present
            if '```' in text:
                # Extract content between first ``` and last ```
                parts = text.split('```')
                if len(parts) >= 3:
                    text = parts[1]
                    # Remove 'json' if it's the first word
                    if text.strip().startswith('json'):
                        text = text.strip()[4:]
                text = text.strip()
            
            # Parse JSON
            result = json.loads(text)
            
            # Validate structure
            if not all(k in result for k in ['scores', 'overall_score', 'feedback', 'improvements']):
                raise ValueError("Invalid response structure")
            
            return result
            
        except Exception as e:
            print(f"⚠️ Evaluation error: {e}")
            # Return default/fallback scores
            return {
                "scores": {
                    "content": 50,
                    "clarity": 50,
                    "technical_accuracy": 50,
                    "completeness": 50
                },
                "overall_score": 50,
                "feedback": "Unable to evaluate this answer at the moment. Please try again.",
                "improvements": [
                    "Please ensure your answer is clear and detailed",
                    "Try submitting again for evaluation"
                ]
            }
    
    def evaluate_multiple_answers(
        self, 
        questions_and_answers: list
    ) -> list:
        """
        Evaluate multiple answers in batch
        questions_and_answers: List of dicts with keys: question, answer, question_type, difficulty
        """
        results = []
        for qa in questions_and_answers:
            result = self.evaluate_answer(
                question=qa['question'],
                answer=qa['answer'],
                question_type=qa['question_type'],
                difficulty=qa['difficulty']
            )
            results.append(result)
        return results