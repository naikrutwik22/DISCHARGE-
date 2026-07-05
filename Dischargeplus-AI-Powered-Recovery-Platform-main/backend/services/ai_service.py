"""
Discharge+ — AI Service
Groq API integration for survey scoring, report analysis, and patient feedback.
Uses llama-3.1-8b-instant model (free tier).
"""

import json
from groq import Groq
from config import get_settings

settings = get_settings()

client = Groq(api_key=settings.groq_api_key) if settings.groq_api_key else None

MODEL = "llama-3.1-8b-instant"

# ======================== PROMPT CONSTANTS ===================

SURVEY_SCORING_PROMPT = """You are a clinical risk assessment AI for post-discharge patient monitoring.

Analyze the following patient survey responses and determine the readmission risk level.

Survey Answers:
{answers_json}

Evaluate based on these criteria:
- Fever: > 100.4°F (concerning), >= 103°F or <= 95°F (critical)
- SpO2: < 94% (concerning), <= 90% (critical)
- Systolic BP: > 140 or < 90 (concerning), >= 180 or <= 80 (critical)
- Diastolic BP: > 90 or < 60 (concerning), >= 120 or <= 50 (critical)
- Blood sugar: > 200 or < 70 (concerning), >= 300 or <= 50 (critical)
- Pain level: 4-7/10 (concerning), 8-10/10 (critical)
- Wound: Mild redness/swelling (concerning), Active discharge/infection (critical)

CRITICAL SCORING RULES:
1. If ALL parameters are normal, risk_level MUST be "low" (Score: 0-30).
2. If ANY parameter is slightly out of normal range (concerning), risk_level MUST be at least "medium" (Score: 31-70).
3. If ANY parameter is significantly out of range (critical), OR if MULTIPLE parameters are concerning, risk_level MUST be "high" (Score: 71-100).
4. NEVER return "low" if ANY parameter is concerning or out of range. 

Respond ONLY with valid JSON in this exact format:
{{
    "risk_level": "high" | "medium" | "low",
    "score": <number 0-100>,
    "reasoning": "<2-3 sentence clinical reasoning>",
    "factors": {{
        "fever": "normal|concerning|critical",
        "spo2": "normal|concerning|critical",
        "bp": "normal|concerning|critical",
        "sugar": "normal|concerning|critical",
        "pain": "normal|concerning|critical",
        "overall": "stable|needs_attention|urgent"
    }}
}}"""

REPORT_ANALYSIS_PROMPT = """You are a medical report analyzer. Analyze the following medical report text and extract structured information.

Report text:
{report_text}

Language: {language}

Respond ONLY with valid JSON in this exact format:
{{
    "parameters": [
        {{
            "name": "<parameter name>",
            "value": "<numeric or text value>",
            "unit": "<unit>",
            "status": "normal" | "borderline" | "abnormal",
            "reference_range": "<normal range>"
        }}
    ],
    "summary": "<plain language summary of the report in {language}>",
    "questions": ["<question 1 to ask doctor>", "<question 2>", "<question 3>"]
}}

Extract ALL measurable parameters. For each parameter, determine if the value is normal, borderline, or abnormal based on standard medical reference ranges. Write the summary and questions in {language}."""

PATIENT_FEEDBACK_PROMPT = """You are a friendly health assistant communicating with a patient who was recently discharged from the hospital.

Based on their survey responses below, provide a brief, encouraging, plain-language summary of their health status. Do NOT use medical jargon. Be warm and supportive.

Survey Answers:
{answers_json}

Risk Assessment:
{risk_json}

Write 3-4 sentences in {language}:
1. Acknowledge their effort in completing the survey
2. Summarize their current condition in simple words
3. If any values are concerning, gently suggest contacting their doctor
4. End with an encouraging note about their recovery

Respond with ONLY the plain text message, no JSON."""


# ======================== FUNCTIONS ==========================

def score_survey_response(answers: list) -> dict:
    """Score a patient's survey response using Groq AI."""
    if not client:
        return {
            "risk_level": "low",
            "score": 20,
            "reasoning": "AI service unavailable. Default low risk assigned.",
            "factors": {},
        }

    answers_json = json.dumps(answers, indent=2)
    prompt = SURVEY_SCORING_PROMPT.format(answers_json=answers_json)

    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=500,
            response_format={"type": "json_object"},
        )

        result = json.loads(response.choices[0].message.content)
        # Validate risk_level
        if result.get("risk_level") not in ("high", "medium", "low"):
            result["risk_level"] = "low"
        return result

    except Exception as e:
        print(f"❌ Groq scoring error: {e}")
        return {
            "risk_level": "low",
            "score": 20,
            "reasoning": f"AI scoring failed: {str(e)}",
            "factors": {},
        }


def analyze_report(text: str, language: str = "english") -> dict:
    """Analyze a medical report using Groq AI."""
    if not client:
        return {
            "parameters": [],
            "summary": "AI service unavailable.",
            "questions": [],
        }

    prompt = REPORT_ANALYSIS_PROMPT.format(report_text=text, language=language)

    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=2000,
            response_format={"type": "json_object"},
        )

        return json.loads(response.choices[0].message.content)

    except Exception as e:
        print(f"❌ Groq analysis error: {e}")
        return {
            "parameters": [],
            "summary": f"Analysis failed: {str(e)}",
            "questions": [],
        }


def generate_patient_feedback(answers: list, risk_result: dict, language: str = "english") -> str:
    """Generate plain-language feedback for a patient after survey submission."""
    if not client:
        return "Thank you for completing your health check-in! Your responses have been recorded and shared with your doctor."

    answers_json = json.dumps(answers, indent=2)
    risk_json = json.dumps(risk_result, indent=2)
    prompt = PATIENT_FEEDBACK_PROMPT.format(
        answers_json=answers_json,
        risk_json=risk_json,
        language=language,
    )

    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=300,
        )

        return response.choices[0].message.content.strip()

    except Exception as e:
        print(f"❌ Groq feedback error: {e}")
        return "Thank you for completing your health check-in! Your responses have been recorded and shared with your doctor."
