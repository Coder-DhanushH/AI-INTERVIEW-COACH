import os
import json
from typing import Dict, List
from google import genai


class ResumeAnalysisService:
    """AI-powered resume analysis service"""
    
    @staticmethod
    async def analyze_resume(resume_text: str, extracted_skills: dict = None) -> Dict:
        """
        Perform comprehensive AI analysis of resume
        
        Args:
            resume_text: Full text extracted from resume
            extracted_skills: Pre-extracted skills (optional)
        
        Returns:
            Complete analysis dictionary with scores and recommendations
        """
        
        if not resume_text or len(resume_text.strip()) < 100:
            raise ValueError("Resume text is too short for meaningful analysis")
        
        # Build comprehensive analysis prompt
        prompt = f"""You are an expert resume analyst and career coach with 15+ years of experience reviewing resumes for Fortune 500 companies and top tech firms.

Analyze this resume COMPREHENSIVELY and provide detailed, actionable feedback.

RESUME TEXT:
{resume_text[:5000]}

Provide a COMPLETE analysis in the following JSON format:

{{
  "overall_score": 0-100,
  
  "category_scores": {{
    "content": 0-100,
    "formatting": 0-100,
    "ats_compatibility": 0-100,
    "keywords": 0-100,
    "experience": 0-100,
    "education": 0-100,
    "skills": 0-100
  }},
  
  "strengths": [
    {{
      "category": "Content/Format/Experience/Skills/etc",
      "title": "Brief strength title",
      "description": "Detailed explanation of this strength",
      "impact": "Why this is valuable to employers"
    }}
  ],
  
  "weaknesses": [
    {{
      "category": "Content/Format/Experience/Skills/etc",
      "title": "Brief weakness title",
      "description": "What's wrong and why it matters",
      "severity": "Critical/High/Medium/Low"
    }}
  ],
  
  "improvements": [
    {{
      "category": "Content/Format/Experience/Skills/etc",
      "title": "Improvement area",
      "current_issue": "What's wrong now",
      "suggested_fix": "Specific actionable solution",
      "example_before": "Current text (if applicable)",
      "example_after": "Improved version",
      "priority": "High/Medium/Low"
    }}
  ],
  
  "section_analysis": {{
    "contact_info": {{
      "score": 0-100,
      "feedback": "Detailed feedback",
      "missing_elements": ["list of missing items"]
    }},
    "summary": {{
      "score": 0-100,
      "feedback": "Detailed feedback",
      "has_summary": true/false,
      "word_count": number,
      "suggestions": ["specific suggestions"]
    }},
    "experience": {{
      "score": 0-100,
      "feedback": "Detailed feedback",
      "job_count": number,
      "uses_action_verbs": true/false,
      "quantifies_achievements": true/false,
      "suggestions": ["specific suggestions"]
    }},
    "education": {{
      "score": 0-100,
      "feedback": "Detailed feedback",
      "degree_count": number,
      "suggestions": ["specific suggestions"]
    }},
    "skills": {{
      "score": 0-100,
      "feedback": "Detailed feedback",
      "skill_count": number,
      "categorized": true/false,
      "suggestions": ["specific suggestions"]
    }}
  }},
  
  "ats_compatibility": {{
    "score": 0-100,
    "is_ats_friendly": true/false,
    "issues": [
      {{
        "issue": "Specific ATS problem",
        "fix": "How to resolve it"
      }}
    ],
    "format_check": {{
      "uses_tables": true/false,
      "uses_images": true/false,
      "uses_headers_footers": true/false,
      "uses_standard_fonts": true/false,
      "uses_standard_sections": true/false
    }}
  }},
  
  "keyword_analysis": {{
    "score": 0-100,
    "keyword_density": "Low/Medium/High",
    "industry_keywords_found": ["keyword1", "keyword2"],
    "missing_keywords": ["missing1", "missing2"],
    "keyword_suggestions": [
      {{
        "keyword": "specific keyword",
        "reason": "why to add it",
        "where_to_add": "which section"
      }}
    ]
  }},
  
  "action_items": [
    {{
      "priority": 1-10,
      "action": "Specific thing to do",
      "category": "Content/Format/Skills/etc",
      "estimated_time": "5 min/30 min/1 hour/etc",
      "impact": "High/Medium/Low"
    }}
  ],
  
  "best_practices": [
    {{
      "practice": "Best practice title",
      "description": "Why this matters",
      "how_to_implement": "Specific steps"
    }}
  ],
  
  "overall_feedback": "2-3 paragraph comprehensive summary of the resume quality, main strengths, critical weaknesses, and top 3 recommendations for improvement."
}}

IMPORTANT GUIDELINES:
1. Be SPECIFIC and ACTIONABLE - vague advice is useless
2. Provide EXAMPLES wherever possible
3. Score honestly - most resumes are 60-75, excellent ones are 85+
4. Identify at least 5 strengths and 5 weaknesses
5. Give 10+ improvement suggestions with clear before/after examples
6. Check for quantified achievements (numbers, percentages, metrics)
7. Verify use of strong action verbs
8. Assess ATS compatibility strictly
9. Focus on IMPACT and RESULTS, not just responsibilities
10. Consider industry standards and modern resume best practices

Return ONLY the JSON object, no markdown, no explanations."""

        try:
            client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))
            
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt
            )
            
            result_text = response.text.strip()
            
            # Clean markdown
            if result_text.startswith("```json"):
                result_text = result_text.replace("```json", "").replace("```", "").strip()
            elif result_text.startswith("```"):
                result_text = result_text.split("```")[1].strip()
                if result_text.startswith("json"):
                    result_text = result_text[4:].strip()
            
            # Parse JSON
            analysis = json.loads(result_text)
            
            print(f"✅ Resume analysis complete - Overall score: {analysis.get('overall_score', 0)}/100")
            
            return analysis
            
        except json.JSONDecodeError as e:
            print(f"❌ JSON parse error: {e}")
            print(f"Raw response: {result_text[:500]}")
            raise Exception("Failed to parse AI analysis response")
            
        except Exception as e:
            print(f"❌ Resume analysis error: {e}")
            raise Exception(f"Failed to analyze resume: {str(e)}")
    
    
    @staticmethod
    def calculate_overall_score(category_scores: Dict) -> float:
        """
        Calculate weighted overall score from category scores
        
        Weights:
        - Content: 30%
        - Experience: 25%
        - Skills: 15%
        - ATS: 10%
        - Keywords: 10%
        - Formatting: 5%
        - Education: 5%
        """
        weights = {
            'content': 0.30,
            'experience': 0.25,
            'skills': 0.15,
            'ats_compatibility': 0.10,
            'keywords': 0.10,
            'formatting': 0.05,
            'education': 0.05
        }
        
        weighted_sum = sum(
            category_scores.get(key, 0) * weight 
            for key, weight in weights.items()
        )
        
        return round(weighted_sum, 1)