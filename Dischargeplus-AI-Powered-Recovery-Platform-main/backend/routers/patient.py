"""
Discharge+ — Patient Router
Endpoints for patient self-service: profile, pending surveys, medication logging.
"""

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from typing import List
from dependencies import get_current_user, get_supabase_admin, CurrentUser, require_role
from models.schemas import MedicationResponse, MedicationLogResponse, MessageResponse, CreateComplaintRequest, ComplaintResponse
from supabase import Client
from typing import Optional
import uuid

router = APIRouter()


@router.get("/me")
async def get_patient_profile(
    current_user: CurrentUser = Depends(require_role("patient")),
    supabase: Client = Depends(get_supabase_admin),
):
    """Get current patient's full profile."""
    patient = supabase.table("patients") \
        .select("*, users(email, full_name, phone, avatar_url)") \
        .eq("user_id", current_user.id) \
        .single() \
        .execute()

    if not patient.data:
        raise HTTPException(status_code=404, detail="Patient profile not found")

    p = patient.data
    user = p.get("users", {}) or {}

    # Get latest risk score
    risk = supabase.table("risk_scores") \
        .select("*") \
        .eq("patient_id", p["id"]) \
        .order("created_at", desc=True) \
        .limit(1) \
        .execute()

    # Get assigned doctor(s)
    assignments = supabase.table("assignments") \
        .select("doctors(*, users(full_name, email, avatar_url))") \
        .eq("patient_id", p["id"]) \
        .eq("is_active", True) \
        .execute()

    doctors = []
    for a in assignments.data or []:
        d = a.get("doctors")
        if d and d.get("users"):
            doctors.append({
                "id": d["id"],
                "full_name": d["users"].get("full_name", ""),
                "email": d["users"].get("email", ""),
                "specialization": d.get("specialization"),
                "avatar_url": d["users"].get("avatar_url"),
            })

    return {
        "id": p["id"],
        "user_id": p["user_id"],
        "email": user.get("email", ""),
        "full_name": user.get("full_name", ""),
        "phone": user.get("phone"),
        "date_of_birth": str(p.get("date_of_birth", "")) if p.get("date_of_birth") else None,
        "gender": p.get("gender"),
        "blood_group": p.get("blood_group"),
        "diagnosis": p.get("diagnosis"),
        "discharge_date": str(p.get("discharge_date", "")) if p.get("discharge_date") else None,
        "discharge_summary": p.get("discharge_summary"),
        "comorbidities": p.get("comorbidities", []),
        "expected_recovery_days": p.get("expected_recovery_days", 30),
        "admission_date": str(p.get("admission_date", "")) if p.get("admission_date") else None,
        "is_readmitted": p.get("is_readmitted", False),
        "latest_risk": risk.data[0] if risk.data else None,
        "doctors": doctors,
    }


@router.get("/surveys/pending")
async def get_pending_surveys(
    current_user: CurrentUser = Depends(require_role("patient")),
    supabase: Client = Depends(get_supabase_admin),
):
    """Get pending (incomplete) surveys for the current patient."""
    patient = supabase.table("patients").select("id").eq("user_id", current_user.id).single().execute()
    if not patient.data:
        raise HTTPException(status_code=404, detail="Patient profile not found")

    result = supabase.table("surveys") \
        .select("*, survey_questions(*)") \
        .eq("patient_id", patient.data["id"]) \
        .eq("is_completed", False) \
        .order("created_at", desc=True) \
        .execute()

    return result.data or []


@router.get("/medications", response_model=List[MedicationResponse])
async def get_medications(
    current_user: CurrentUser = Depends(require_role("patient")),
    supabase: Client = Depends(get_supabase_admin),
):
    """Get current patient's active medications."""
    patient = supabase.table("patients").select("id").eq("user_id", current_user.id).single().execute()
    if not patient.data:
        raise HTTPException(status_code=404, detail="Patient profile not found")

    result = supabase.table("medications") \
        .select("*") \
        .eq("patient_id", patient.data["id"]) \
        .eq("is_active", True) \
        .order("created_at", desc=True) \
        .execute()

    return [
        MedicationResponse(
            id=m["id"],
            patient_id=m["patient_id"],
            name=m["name"],
            dosage=m.get("dosage"),
            frequency=m.get("frequency"),
            time_of_day=m.get("time_of_day", []),
            start_date=str(m.get("start_date", "")) if m.get("start_date") else None,
            end_date=str(m.get("end_date", "")) if m.get("end_date") else None,
            instructions=m.get("instructions"),
            is_active=m.get("is_active", True),
        )
        for m in result.data or []
    ]


@router.post("/medications/{medication_id}/log", response_model=MessageResponse)
async def log_medication(
    medication_id: str,
    status: str = "taken",  # 'taken' or 'missed'
    notes: str = None,
    current_user: CurrentUser = Depends(require_role("patient")),
    supabase: Client = Depends(get_supabase_admin),
):
    """Log a medication as taken or missed."""
    patient = supabase.table("patients").select("id").eq("user_id", current_user.id).single().execute()
    if not patient.data:
        raise HTTPException(status_code=404, detail="Patient profile not found")

    # Verify medication belongs to patient
    med = supabase.table("medications").select("id").eq("id", medication_id).eq("patient_id", patient.data["id"]).single().execute()
    if not med.data:
        raise HTTPException(status_code=404, detail="Medication not found")

    supabase.table("medication_logs").insert({
        "medication_id": medication_id,
        "patient_id": patient.data["id"],
        "hospital_id": current_user.hospital_id,
        "status": status,
        "notes": notes,
    }).execute()

    return MessageResponse(message=f"Medication logged as {status}")


@router.get("/medications/{medication_id}/logs", response_model=List[MedicationLogResponse])
async def get_medication_logs(
    medication_id: str,
    current_user: CurrentUser = Depends(require_role("patient")),
    supabase: Client = Depends(get_supabase_admin),
):
    """Get logging history for a specific medication."""
    patient = supabase.table("patients").select("id").eq("user_id", current_user.id).single().execute()
    if not patient.data:
        raise HTTPException(status_code=404, detail="Patient profile not found")

    result = supabase.table("medication_logs") \
        .select("*") \
        .eq("medication_id", medication_id) \
        .eq("patient_id", patient.data["id"]) \
        .order("created_at", desc=True) \
        .limit(30) \
        .execute()

    return [
        MedicationLogResponse(
            id=l["id"],
            medication_id=l["medication_id"],
            status=l["status"],
            taken_at=str(l.get("taken_at", "")) if l.get("taken_at") else None,
            notes=l.get("notes"),
        )
        for l in result.data or []
    ]


@router.get("/notifications")
async def get_patient_notifications(
    current_user: CurrentUser = Depends(require_role("patient")),
    supabase: Client = Depends(get_supabase_admin),
):
    """Get patient notifications."""
    result = supabase.table("notifications") \
        .select("*") \
        .eq("user_id", current_user.id) \
        .order("created_at", desc=True) \
        .limit(20) \
        .execute()

    return result.data or []


# ======================== COMPLAINTS =========================

@router.post("/complaints", response_model=ComplaintResponse)
async def create_complaint(
    subject: str = Form(...),
    description: str = Form(...),
    file: Optional[UploadFile] = File(None),
    current_user: CurrentUser = Depends(require_role("patient")),
    supabase: Client = Depends(get_supabase_admin),
):
    """Patient submits a new complaint."""
    patient = supabase.table("patients").select("id").eq("user_id", current_user.id).single().execute()
    if not patient.data:
        raise HTTPException(status_code=404, detail="Patient profile not found")

    image_url = None
    if file:
        try:
            file_bytes = await file.read()
            file_ext = file.filename.split('.')[-1]
            file_name = f"complaints/{current_user.id}_{uuid.uuid4().hex}.{file_ext}"
            
            supabase.storage.from_("hospital-files").upload(
                file_name,
                file_bytes,
                {"content-type": file.content_type}
            )
            image_url = supabase.storage.from_("hospital-files").get_public_url(file_name)
        except Exception as e:
            print(f"Failed to upload file: {e}")

    result = supabase.table("complaints").insert({
        "hospital_id": current_user.hospital_id,
        "patient_id": patient.data["id"],
        "subject": subject,
        "description": description,
        "image_url": image_url,
        "status": "open",
    }).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create complaint")

    c = result.data[0]
    return ComplaintResponse(
        id=c["id"],
        hospital_id=c["hospital_id"],
        patient_id=c["patient_id"],
        subject=c["subject"],
        description=c["description"],
        image_url=c.get("image_url"),
        status=c.get("status", "open"),
        created_at=str(c.get("created_at", "")),
    )


@router.get("/complaints", response_model=List[ComplaintResponse])
async def get_patient_complaints(
    current_user: CurrentUser = Depends(require_role("patient")),
    supabase: Client = Depends(get_supabase_admin),
):
    """Get all complaints submitted by the current patient."""
    patient = supabase.table("patients").select("id").eq("user_id", current_user.id).single().execute()
    if not patient.data:
        raise HTTPException(status_code=404, detail="Patient profile not found")

    result = supabase.table("complaints") \
        .select("*") \
        .eq("patient_id", patient.data["id"]) \
        .order("created_at", desc=True) \
        .execute()

    return [
        ComplaintResponse(
            id=c["id"],
            hospital_id=c["hospital_id"],
            patient_id=c["patient_id"],
            subject=c["subject"],
            description=c["description"],
            image_url=c.get("image_url"),
            status=c.get("status", "open"),
            created_at=str(c.get("created_at", "")),
        )
        for c in result.data or []
    ]
