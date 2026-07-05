"""
Discharge+ — Doctor Router
Endpoints for doctor's patient list, patient detail, notes, and alerts.
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from dependencies import get_current_user, get_supabase_admin, CurrentUser, require_role
from models.schemas import PatientResponse, RiskScoreResponse, DoctorNoteRequest, MessageResponse, NotificationResponse, CreateMedicationRequest, MedicationResponse
from supabase import Client

router = APIRouter()


@router.get("/patients", response_model=List[dict])
async def get_doctor_patients(
    risk_filter: Optional[str] = Query(None, description="Filter by risk level: high, medium, low"),
    search: Optional[str] = Query(None, description="Search by patient name"),
    current_user: CurrentUser = Depends(require_role("doctor")),
    supabase: Client = Depends(get_supabase_admin),
):
    """Get all patients assigned to the current doctor, with optional risk filter."""
    # Get doctor record
    doctor = supabase.table("doctors").select("id").eq("user_id", current_user.id).single().execute()
    if not doctor.data:
        raise HTTPException(status_code=404, detail="Doctor profile not found")

    doctor_id = doctor.data["id"]

    # Get assigned patients
    assignments = supabase.table("assignments") \
        .select("patient_id, patients(*, users(email, full_name, phone, avatar_url))") \
        .eq("doctor_id", doctor_id) \
        .eq("is_active", True) \
        .execute()

    valid_assignments = []
    patient_ids = []

    # Pre-filter search and collect patient IDs
    for a in assignments.data or []:
        p = a.get("patients")
        if not p:
            continue

        user = p.get("users", {}) or {}
        patient_name = user.get("full_name", "")

        # Search filter
        if search and search.lower() not in patient_name.lower():
            continue

        valid_assignments.append(a)
        patient_ids.append(p["id"])

    # Bulk fetch risk scores mapping
    latest_risks = {}
    if patient_ids:
        # Fetch ordered desc, the first we cache per patient is the latest
        risks_res = supabase.table("risk_scores").select("*").in_("patient_id", patient_ids).order("created_at", desc=True).execute()
        for r in risks_res.data or []:
            pid = r["patient_id"]
            if pid not in latest_risks:
                latest_risks[pid] = r

    # Bulk fetch survey mapping
    latest_surveys = {}
    if patient_ids:
        surveys_res = supabase.table("survey_responses").select("patient_id, created_at").in_("patient_id", patient_ids).order("created_at", desc=True).execute()
        for s in surveys_res.data or []:
            pid = s["patient_id"]
            if pid not in latest_surveys:
                latest_surveys[pid] = str(s["created_at"])

    # Build final list
    patients = []
    for a in valid_assignments:
        p = a.get("patients")
        user = p.get("users", {}) or {}
        patient_name = user.get("full_name", "")

        risk_data = latest_risks.get(p["id"])
        risk_level = risk_data["risk_level"] if risk_data else "low"

        # Risk filter
        if risk_filter and risk_level != risk_filter:
            continue

        patients.append({
            "id": p["id"],
            "user_id": p["user_id"],
            "email": user.get("email", ""),
            "full_name": patient_name,
            "diagnosis": p.get("diagnosis"),
            "discharge_date": str(p.get("discharge_date", "")) if p.get("discharge_date") else None,
            "expected_recovery_days": p.get("expected_recovery_days", 30),
            "risk_level": risk_level,
            "risk_score": risk_data.get("score") if risk_data else None,
            "last_survey_date": latest_surveys.get(p["id"]),
            "is_readmitted": p.get("is_readmitted", False),
            "comorbidities": p.get("comorbidities", []),
        })

    return patients


@router.get("/patients/{patient_id}", response_model=dict)
async def get_patient_detail(
    patient_id: str,
    current_user: CurrentUser = Depends(require_role("doctor")),
    supabase: Client = Depends(get_supabase_admin),
):
    """Get detailed patient profile including surveys, risk history, and medications."""
    # Verify assignment
    doctor = supabase.table("doctors").select("id").eq("user_id", current_user.id).single().execute()
    if not doctor.data:
        raise HTTPException(status_code=404, detail="Doctor profile not found")

    assignment = supabase.table("assignments") \
        .select("id") \
        .eq("doctor_id", doctor.data["id"]) \
        .eq("patient_id", patient_id) \
        .eq("is_active", True) \
        .execute()

    if not assignment.data:
        raise HTTPException(status_code=403, detail="You are not assigned to this patient")

    # Patient info
    patient = supabase.table("patients") \
        .select("*, users(email, full_name, phone, avatar_url)") \
        .eq("id", patient_id) \
        .single() \
        .execute()

    if not patient.data:
        raise HTTPException(status_code=404, detail="Patient not found")

    p = patient.data
    user = p.get("users", {}) or {}

    # Risk history
    risk_history = supabase.table("risk_scores") \
        .select("*") \
        .eq("patient_id", patient_id) \
        .order("created_at", desc=True) \
        .limit(20) \
        .execute()

    # Survey responses with answers
    surveys = supabase.table("survey_responses") \
        .select("*, response_answers(*), surveys(title, question_types)") \
        .eq("patient_id", patient_id) \
        .order("created_at", desc=True) \
        .limit(20) \
        .execute()

    # Medications
    meds = supabase.table("medications") \
        .select("*") \
        .eq("patient_id", patient_id) \
        .eq("is_active", True) \
        .execute()

    return {
        "patient": {
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
        },
        "risk_history": risk_history.data or [],
        "survey_responses": surveys.data or [],
        "medications": meds.data or [],
    }


@router.post("/notes", response_model=MessageResponse)
async def save_doctor_note(
    req: DoctorNoteRequest,
    current_user: CurrentUser = Depends(require_role("doctor")),
    supabase: Client = Depends(get_supabase_admin),
):
    """Save a private doctor note for a patient. Stored in the doctor's notes field."""
    doctor = supabase.table("doctors").select("id, notes").eq("user_id", current_user.id).single().execute()
    if not doctor.data:
        raise HTTPException(status_code=404, detail="Doctor profile not found")

    import json
    existing_notes = {}
    if doctor.data.get("notes"):
        try:
            existing_notes = json.loads(doctor.data["notes"])
        except (json.JSONDecodeError, TypeError):
            existing_notes = {}

    if req.patient_id not in existing_notes:
        existing_notes[req.patient_id] = []

    from datetime import datetime
    existing_notes[req.patient_id].append({
        "note": req.note,
        "timestamp": datetime.utcnow().isoformat(),
    })

    supabase.table("doctors").update({
        "notes": json.dumps(existing_notes),
    }).eq("id", doctor.data["id"]).execute()

    return MessageResponse(message="Note saved")


@router.get("/notes/{patient_id}")
async def get_doctor_notes(
    patient_id: str,
    current_user: CurrentUser = Depends(require_role("doctor")),
    supabase: Client = Depends(get_supabase_admin),
):
    """Get doctor's private notes for a patient."""
    doctor = supabase.table("doctors").select("notes").eq("user_id", current_user.id).single().execute()
    if not doctor.data:
        raise HTTPException(status_code=404, detail="Doctor profile not found")

    import json
    notes = {}
    if doctor.data.get("notes"):
        try:
            notes = json.loads(doctor.data["notes"])
        except (json.JSONDecodeError, TypeError):
            notes = {}

    return {"notes": notes.get(patient_id, [])}


@router.post("/medications", response_model=MedicationResponse)
async def prescribe_medication(
    req: CreateMedicationRequest,
    current_user: CurrentUser = Depends(require_role("doctor")),
    supabase: Client = Depends(get_supabase_admin),
):
    """Prescribe a new medication for a patient."""
    doctor = supabase.table("doctors").select("id").eq("user_id", current_user.id).single().execute()
    if not doctor.data:
        raise HTTPException(status_code=404, detail="Doctor profile not found")

    assignment = supabase.table("assignments") \
        .select("id") \
        .eq("doctor_id", doctor.data["id"]) \
        .eq("patient_id", req.patient_id) \
        .eq("is_active", True) \
        .execute()

    if not assignment.data:
        raise HTTPException(status_code=403, detail="You are not assigned to this patient")

    result = supabase.table("medications").insert({
        "hospital_id": current_user.hospital_id,
        "patient_id": req.patient_id,
        "name": req.name,
        "dosage": req.dosage,
        "frequency": req.frequency,
        "instructions": req.instructions,
    }).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to prescribe medication")

    return MedicationResponse(**result.data[0])


@router.get("/alerts", response_model=List[NotificationResponse])
async def get_doctor_alerts(
    current_user: CurrentUser = Depends(require_role("doctor")),
    supabase: Client = Depends(get_supabase_admin),
):
    """Get unread alerts/notifications for the current doctor."""
    result = supabase.table("notifications") \
        .select("*") \
        .eq("user_id", current_user.id) \
        .eq("is_read", False) \
        .order("created_at", desc=True) \
        .limit(50) \
        .execute()

    return [
        NotificationResponse(
            id=n["id"],
            title=n["title"],
            message=n.get("message"),
            type=n.get("type", "info"),
            is_read=n.get("is_read", False),
            link=n.get("link"),
            created_at=str(n.get("created_at", "")),
        )
        for n in result.data or []
    ]
