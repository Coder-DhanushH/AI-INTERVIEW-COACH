import os
from typing import List, Dict
import json
from google import genai

class LLMService:
    
    @staticmethod
    def generate_questions(
        role: str, 
        difficulty: str, 
        count: int = 5,
        question_type: str = "mixed"
    ) -> List[Dict]:
        """
        Generate interview questions using LLM
        
        Args:
            role: Job role (e.g., "Software Developer")
            difficulty: "Easy", "Medium", or "Hard"
            count: Number of questions to generate
            question_type: "behavioral", "technical", or "mixed"
        
        Returns:
            List of question dictionaries
        """
        
        prompt = f"""Generate {count} {difficulty.lower()} interview questions for a {role} position.

Question types: {question_type}

Requirements:
- Questions should be realistic and commonly asked
- Include a mix of behavioral and technical questions if type is "mixed"
- Questions should be appropriate for {difficulty} difficulty level
- Return ONLY a JSON array with this exact structure:

[
  {{
    "question": "Question text here",
    "type": "behavioral" or "technical" or "situational",
    "difficulty": "{difficulty}",
    "expected_skills": ["skill1", "skill2"],
    "time_limit_seconds": 180
  }}
]

Do not include any explanation, just the JSON array."""

        try:
            client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))
            
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt
            )
            questions_json = response.text.strip()
            
            # Clean up markdown if present
            if questions_json.startswith("```json"):
                questions_json = questions_json.replace("```json", "").replace("```", "").strip()
            
            # Parse JSON
            questions = json.loads(questions_json)
            return questions
                
        except Exception as e:
            print(f"Error generating questions: {e}")
            return LLMService.get_fallback_questions(role, difficulty, count)
        
    @staticmethod
    def get_fallback_questions(role: str, difficulty: str, count: int) -> List[Dict]:
        """Predefined questions if AI generation fails"""
        
        fallback_db = {
            "Software Developer": [
                {
                    "question": "Explain the difference between stack and heap memory.",
                    "type": "technical",
                    "difficulty": "Medium",
                    "expected_skills": ["memory management", "computer science fundamentals"],
                    "time_limit_seconds": 180
                },
                {
                    "question": "Tell me about a time you debugged a complex issue.",
                    "type": "behavioral",
                    "difficulty": "Medium",
                    "expected_skills": ["problem-solving", "debugging"],
                    "time_limit_seconds": 180
                },
                {
                    "question": "What is the difference between REST and GraphQL?",
                    "type": "technical",
                    "difficulty": "Medium",
                    "expected_skills": ["API design", "web development"],
                    "time_limit_seconds": 180
                },
                {
                    "question": "Describe your experience with version control systems.",
                    "type": "behavioral",
                    "difficulty": "Easy",
                    "expected_skills": ["Git", "collaboration"],
                    "time_limit_seconds": 120
                },
                {
                    "question": "How do you handle code reviews and feedback?",
                    "type": "behavioral",
                    "difficulty": "Easy",
                    "expected_skills": ["communication", "teamwork"],
                    "time_limit_seconds": 120
                }
            ],
            "Data Science": [
                {
                    "question": "Explain the bias-variance tradeoff in machine learning.",
                    "type": "technical",
                    "difficulty": "Medium",
                    "expected_skills": ["machine learning", "model evaluation"],
                    "time_limit_seconds": 180
                },
                {
                    "question": "How would you handle missing data in a dataset?",
                    "type": "technical",
                    "difficulty": "Medium",
                    "expected_skills": ["data preprocessing", "statistics"],
                    "time_limit_seconds": 180
                },
                {
                    "question": "Tell me about a data analysis project you're proud of.",
                    "type": "behavioral",
                    "difficulty": "Easy",
                    "expected_skills": ["project experience", "communication"],
                    "time_limit_seconds": 180
                }
            ],
            "Product Manager": [
                {
                    "question": "How do you prioritize features in a product roadmap?",
                    "type": "technical",
                    "difficulty": "Medium",
                    "expected_skills": ["product strategy", "prioritization"],
                    "time_limit_seconds": 180
                },
                {
                    "question": "Describe a time when you had to say no to a stakeholder.",
                    "type": "behavioral",
                    "difficulty": "Medium",
                    "expected_skills": ["stakeholder management", "communication"],
                    "time_limit_seconds": 180
                }
            ]
            # Add more roles as needed
        }
        
        return fallback_db.get(role, fallback_db["Software Developer"])[:count]