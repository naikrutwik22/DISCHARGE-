"""
Discharge+ — Survey Router
Create surveys, fetch surveys, submit survey responses with risk scoring.
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import List
from dependencies import get_current_user, get_supabase_admin, CurrentUser, require_role
from models.schemas import CreateSurveyRequest, SurveyResponse, SubmitSurveyResponseRequest, SurveyResponseResult
from services.risk_service import calculate_and_store_risk
from supabase import Client

router = APIRouter()

# Question type to default question text mapping
QUESTION_TYPE_MAP = {
    "fever": "What is your current body temperature (°F)?",
    "spo2": "What is your current SpO2 reading (%)?",
    "bp": "What is your current blood pressure (systolic/diastolic)?",
    "sugar": "What is your current blood sugar level (mg/dL)?",
    "pain": "Rate your current pain level (0-10)",
    "photo": "Please upload a photo of your wound/affected area",
    "voice": "Please record a voice note describing how you feel",
    "custom_text": "Please describe your symptoms or concerns",
}


@router.post("/create", response_model=SurveyResponse)
async def create_survey(
    req: CreateSurveyRequest,
    current_user: CurrentUser = Depends(require_role("doctor")),
    supabase: Client = Depends(get_supabase_admin),
):
    """Doctor creates a survey for a patient with selected question types."""
    doctor = supabase.table("doctors").select("id").eq("user_id", current_user.id).single().execute()
    if not doctor.data:
        raise HTTPException(status_code=404, detail="Doctor profile not found")

    # Verify patient belongs to hospital
    patient = supabase.table("patients").select("id, user_id").eq("id", req.patient_id).eq("hospital_id", current_user.hospital_id).single().execute()
    if not patient.data:
        raise HTTPException(status_code=404, detail="Patient not found in your hospital")

    try:
        # 1. Create survey
        survey_result = supabase.table("surveys").insert({
            "hospital_id": current_user.hospital_id,
            "doctor_id": doctor.data["id"],
            "patient_id": req.patient_id,
            "title": req.title,
            "description": req.description,
            "question_types": req.question_types,
            "schedule_type": req.schedule_type,
            "schedule_interval_days": req.schedule_interval_days,
            "due_date": req.due_date,
        }).execute()

        if not survey_result.data:
            raise HTTPException(status_code=500, detail="Failed to create survey")

        survey = survey_result.data[0]

        # 2. Create survey questions
        for i, qt in enumerate(req.question_types):
            supabase.table("survey_questions").insert({
                "survey_id": survey["id"],
                "hospital_id": current_user.hospital_id,
                "question_type": qt,
                "question_text": QUESTION_TYPE_MAP.get(qt, f"Please provide your {qt} reading"),
                "display_order": i,
                "is_required": qt not in ("photo", "voice", "custom_text"),
            }).execute()

        # 3. Notify patient
        supabase.table("notifications").insert({
            "hospital_id": current_user.hospital_id,
            "user_id": patient.data.get("user_id"),  # Need patient's user_id
            "title": "📋 New Health Survey",
            "message": f"Your doctor has sent you a new survey: {req.title}",
            "type": "info",
            "metadata": {"survey_id": survey["id"]},
        }).execute()

        return SurveyResponse(
            id=survey["id"],
            hospital_id=survey["hospital_id"],
            doctor_id=survey["doctor_id"],
            patient_id=survey["patient_id"],
            title=survey["title"],
            description=survey.get("description"),
            question_types=survey["question_types"],
            schedule_type=survey.get("schedule_type", "one_time"),
            schedule_interval_days=survey.get("schedule_interval_days"),
            due_date=str(survey.get("due_date", "")) if survey.get("due_date") else None,
            is_completed=False,
            created_at=str(survey.get("created_at", "")),
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create survey: {str(e)}")


@router.get("/{patient_id}", response_model=List[SurveyResponse])
async def get_patient_surveys(
    patient_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin),
):
    """Get all surveys for a patient."""
    result = supabase.table("surveys") \
        .select("*") \
        .eq("patient_id", patient_id) \
        .eq("hospital_id", current_user.hospital_id) \
        .order("created_at", desc=True) \
        .execute()

    return [
        SurveyResponse(
            id=s["id"],
            hospital_id=s["hospital_id"],
            doctor_id=s["doctor_id"],
            patient_id=s["patient_id"],
            title=s["title"],
            description=s.get("description"),
            question_types=s["question_types"],
            schedule_type=s.get("schedule_type", "one_time"),
            schedule_interval_days=s.get("schedule_interval_days"),
            due_date=str(s.get("due_date", "")) if s.get("due_date") else None,
            is_completed=s.get("is_completed", False),
            created_at=str(s.get("created_at", "")),
        )
        for s in result.data or []
    ]


@router.post("/{survey_id}/respond", response_model=SurveyResponseResult)
async def submit_survey_response(
    survey_id: str,
    req: SubmitSurveyResponseRequest,
    current_user: CurrentUser = Depends(require_role("patient")),
    supabase: Client = Depends(get_supabase_admin),
):
    """Patient submits survey answers. Triggers synchronous risk scoring."""
    # Get patient record
    patient = supabase.table("patients").select("id").eq("user_id", current_user.id).single().execute()
    if not patient.data:
        raise HTTPException(status_code=404, detail="Patient profile not found")

    patient_id = patient.data["id"]

    # Verify survey exists and belongs to patient
    survey = supabase.table("surveys").select("*").eq("id", survey_id).eq("patient_id", patient_id).single().execute()
    if not survey.data:
        raise HTTPException(status_code=404, detail="Survey not found")

    try:
        # 1. Create survey response
        response_result = supabase.table("survey_responses").insert({
            "survey_id": survey_id,
            "patient_id": patient_id,
            "hospital_id": current_user.hospital_id,
        }).execute()

        if not response_result.data:
            raise HTTPException(status_code=500, detail="Failed to create response")

        response_id = response_result.data[0]["id"]

        # 2. Insert individual answers
        answers_for_ai = []
        for answer in req.answers:
            supabase.table("response_answers").insert({
                "response_id": response_id,
                "hospital_id": current_user.hospital_id,
                "question_type": answer.question_type,
                "answer_value": answer.answer_value,
                "answer_numeric": answer.answer_numeric,
                "file_url": answer.file_url,
            }).execute()

            answers_for_ai.append({
                "question_type": answer.question_type,
                "answer_value": answer.answer_value,
                "answer_numeric": answer.answer_numeric,
            })

        # 3. Mark survey as completed
        supabase.table("surveys").update({"is_completed": True}).eq("id", survey_id).execute()

        # 4. Synchronous risk scoring
        risk_result = calculate_and_store_risk(
            survey_response_id=response_id,
            patient_id=patient_id,
            hospital_id=current_user.hospital_id,
            answers=answers_for_ai,
        )

        return SurveyResponseResult(
            response_id=response_id,
            risk_score={
                "risk_level": risk_result.get("risk_level"),
                "score": risk_result.get("score"),
                "reasoning": risk_result.get("reasoning"),
            },
            ai_feedback=risk_result.get("feedback"),
            message="Survey submitted successfully",
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to submit survey: {str(e)}")
