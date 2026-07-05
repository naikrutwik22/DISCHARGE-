"""
Discharge+ — Admin Router
CRUD for doctors, patients, assignments; bulk CSV import.
All endpoints scoped to admin's hospital_id.
"""

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from typing import List
from dependencies import get_current_user, get_supabase_admin, CurrentUser, require_role
from models.schemas import (
    CreateDoctorRequest, DoctorResponse, DoctorCredentials,
    CreatePatientRequest, PatientResponse, PatientCredentials,
    CreateAssignmentRequest, AssignmentResponse,
    BulkImportResponse, MessageResponse, ComplaintResponse, ComplaintStatus
)
from services.email_service import send_credential_email
from utils.helpers import generate_password, parse_csv_patients, parse_csv_doctors
from supabase import Client

router = APIRouter()


# ======================== DOCTORS ============================

@router.get("/doctors", response_model=List[DoctorResponse])
async def list_doctors(
    current_user: CurrentUser = Depends(require_role("admin")),
    supabase: Client = Depends(get_supabase_admin),
):
    """List all doctors in the admin's hospital."""
    result = supabase.table("doctors") \
        .select("*, users(email, full_name, phone, avatar_url)") \
        .eq("hospital_id", current_user.hospital_id) \
        .order("created_at", desc=True) \
        .execute()

    doctors = []
    for d in result.data or []:
        user = d.get("users", {}) or {}
        doctors.append(DoctorResponse(
            id=d["id"],
            user_id=d["user_id"],
            email=user.get("email", ""),
            full_name=user.get("full_name", ""),
            hospital_id=d["hospital_id"],
            specialization=d.get("specialization"),
            license_number=d.get("license_number"),
            department=d.get("department"),
            qualification=d.get("qualification"),
            experience_years=d.get("experience_years"),
            bio=d.get("bio"),
            is_available=d.get("is_available", True),
            created_at=str(d.get("created_at", "")),
        ))
    return doctors


@router.post("/doctors", response_model=DoctorCredentials)
async def create_doctor(
    req: CreateDoctorRequest,
    current_user: CurrentUser = Depends(require_role("admin")),
    supabase: Client = Depends(get_supabase_admin),
):
    """Create a doctor with auto-generated credentials."""
    password = generate_password()

    try:
        # 1. Create auth user
        auth_result = supabase.auth.admin.create_user({
            "email": req.email,
            "password": password,
            "email_confirm": True,
            "user_metadata": {
                "full_name": req.full_name,
                "role": "doctor",
                "hospital_id": current_user.hospital_id,
            },
        })

        if not auth_result.user:
            raise HTTPException(status_code=400, detail="Failed to create auth user")

        user_id = auth_result.user.id

        # 2. Insert into users table
        supabase.table("users").insert({
            "id": user_id,
            "hospital_id": current_user.hospital_id,
            "email": req.email,
            "full_name": req.full_name,
            "role": "doctor",
            "phone": req.phone,
        }).execute()

        # 3. Insert into doctors table
        supabase.table("doctors").insert({
            "user_id": user_id,
            "hospital_id": current_user.hospital_id,
            "specialization": req.specialization,
            "license_number": req.license_number,
            "department": req.department,
            "qualification": req.qualification,
            "experience_years": req.experience_years,
            "bio": req.bio,
        }).execute()

        # 4. Send credential email (non-blocking)
        hospital = supabase.table("hospitals").select("name").eq("id", current_user.hospital_id).single().execute()
        hospital_name = hospital.data.get("name", "Hospital") if hospital.data else "Hospital"
        send_credential_email(req.email, req.full_name, password, "Doctor", hospital_name)

        return DoctorCredentials(
            email=req.email,
            password=password,
            full_name=req.full_name,
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create doctor: {str(e)}")


@router.delete("/doctors/{doctor_id}", response_model=MessageResponse)
async def delete_doctor(
    doctor_id: str,
    current_user: CurrentUser = Depends(require_role("admin")),
    supabase: Client = Depends(get_supabase_admin),
):
    """Delete a doctor (cascades via FK)."""
    doctor = supabase.table("doctors").select("user_id").eq("id", doctor_id).eq("hospital_id", current_user.hospital_id).single().execute()
    if not doctor.data:
        raise HTTPException(status_code=404, detail="Doctor not found")

    # Delete auth user (cascades to users → doctors)
    supabase.auth.admin.delete_user(doctor.data["user_id"])
    return MessageResponse(message="Doctor deleted successfully")


# ======================== PATIENTS ===========================

@router.get("/patients", response_model=List[PatientResponse])
async def list_patients(
    current_user: CurrentUser = Depends(require_role("admin")),
    supabase: Client = Depends(get_supabase_admin),
):
    """List all patients in the admin's hospital."""
    result = supabase.table("patients") \
        .select("*, users(email, full_name, phone, avatar_url)") \
        .eq("hospital_id", current_user.hospital_id) \
        .order("created_at", desc=True) \
        .execute()

    patients = []
    for p in result.data or []:
        user = p.get("users", {}) or {}
        patients.append(PatientResponse(
            id=p["id"],
            user_id=p["user_id"],
            email=user.get("email", ""),
            full_name=user.get("full_name", ""),
            hospital_id=p["hospital_id"],
            date_of_birth=str(p.get("date_of_birth", "")) if p.get("date_of_birth") else None,
            gender=p.get("gender"),
            blood_group=p.get("blood_group"),
            diagnosis=p.get("diagnosis"),
            discharge_date=str(p.get("discharge_date", "")) if p.get("discharge_date") else None,
            discharge_summary=p.get("discharge_summary"),
            comorbidities=p.get("comorbidities", []),
            emergency_contact_name=p.get("emergency_contact_name"),
            emergency_contact_phone=p.get("emergency_contact_phone"),
            expected_recovery_days=p.get("expected_recovery_days", 30),
            is_readmitted=p.get("is_readmitted", False),
            created_at=str(p.get("created_at", "")),
        ))
    return patients


@router.post("/patients", response_model=PatientCredentials)
async def create_patient(
    req: CreatePatientRequest,
    current_user: CurrentUser = Depends(require_role("admin")),
    supabase: Client = Depends(get_supabase_admin),
):
    """Create a patient with auto-generated credentials."""
    password = generate_password()

    try:
        # 1. Create auth user
        auth_result = supabase.auth.admin.create_user({
            "email": req.email,
            "password": password,
            "email_confirm": True,
            "user_metadata": {
                "full_name": req.full_name,
                "role": "patient",
                "hospital_id": current_user.hospital_id,
            },
        })

        if not auth_result.user:
            raise HTTPException(status_code=400, detail="Failed to create auth user")

        user_id = auth_result.user.id

        # 2. Insert into users table
        supabase.table("users").insert({
            "id": user_id,
            "hospital_id": current_user.hospital_id,
            "email": req.email,
            "full_name": req.full_name,
            "role": "patient",
            "phone": req.phone,
        }).execute()

        # 3. Insert into patients table
        supabase.table("patients").insert({
            "user_id": user_id,
            "hospital_id": current_user.hospital_id,
            "date_of_birth": req.date_of_birth,
            "gender": req.gender,
            "blood_group": req.blood_group,
            "diagnosis": req.diagnosis,
            "discharge_date": req.discharge_date,
            "discharge_summary": req.discharge_summary,
            "comorbidities": req.comorbidities or [],
            "emergency_contact_name": req.emergency_contact_name,
            "emergency_contact_phone": req.emergency_contact_phone,
            "expected_recovery_days": req.expected_recovery_days or 30,
            "admission_date": req.admission_date,
        }).execute()

        # 4. Send credential email
        hospital = supabase.table("hospitals").select("name").eq("id", current_user.hospital_id).single().execute()
        hospital_name = hospital.data.get("name", "Hospital") if hospital.data else "Hospital"
        send_credential_email(req.email, req.full_name, password, "Patient", hospital_name)

        return PatientCredentials(
            email=req.email,
            password=password,
            full_name=req.full_name,
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create patient: {str(e)}")


@router.delete("/patients/{patient_id}", response_model=MessageResponse)
async def delete_patient(
    patient_id: str,
    current_user: CurrentUser = Depends(require_role("admin")),
    supabase: Client = Depends(get_supabase_admin),
):
    """Delete a patient (cascades via FK)."""
    patient = supabase.table("patients").select("user_id").eq("id", patient_id).eq("hospital_id", current_user.hospital_id).single().execute()
    if not patient.data:
        raise HTTPException(status_code=404, detail="Patient not found")

    supabase.auth.admin.delete_user(patient.data["user_id"])
    return MessageResponse(message="Patient deleted successfully")


# ======================== BULK IMPORT ========================

@router.post("/patients/bulk-import", response_model=BulkImportResponse)
async def bulk_import_patients(
    file: UploadFile = File(...),
    current_user: CurrentUser = Depends(require_role("admin")),
    supabase: Client = Depends(get_supabase_admin),
):
    """Bulk import patients from CSV file."""
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted")

    content = await file.read()
    csv_text = content.decode("utf-8")
    patients_data = parse_csv_patients(csv_text)

    hospital = supabase.table("hospitals").select("name").eq("id", current_user.hospital_id).single().execute()
    hospital_name = hospital.data.get("name", "Hospital") if hospital.data else "Hospital"

    created = 0
    errors = []

    for i, p in enumerate(patients_data):
        try:
            password = generate_password()

            auth_result = supabase.auth.admin.create_user({
                "email": p["email"],
                "password": password,
                "email_confirm": True,
                "user_metadata": {
                    "full_name": p["full_name"],
                    "role": "patient",
                    "hospital_id": current_user.hospital_id,
                },
            })

            user_id = auth_result.user.id

            supabase.table("users").insert({
                "id": user_id,
                "hospital_id": current_user.hospital_id,
                "email": p["email"],
                "full_name": p["full_name"],
                "role": "patient",
                "phone": p.get("phone"),
            }).execute()

            supabase.table("patients").insert({
                "user_id": user_id,
                "hospital_id": current_user.hospital_id,
                "date_of_birth": p.get("date_of_birth"),
                "gender": p.get("gender"),
                "blood_group": p.get("blood_group"),
                "diagnosis": p.get("diagnosis"),
                "discharge_date": p.get("discharge_date"),
                "discharge_summary": p.get("discharge_summary"),
                "emergency_contact_name": p.get("emergency_contact_name"),
                "emergency_contact_phone": p.get("emergency_contact_phone"),
                "expected_recovery_days": p.get("expected_recovery_days", 30),
            }).execute()

            send_credential_email(p["email"], p["full_name"], password, "Patient", hospital_name)
            created += 1

        except Exception as e:
            errors.append({"row": i + 1, "email": p.get("email", ""), "error": str(e)})

    return BulkImportResponse(
        total=len(patients_data),
        created=created,
        errors=errors,
        message=f"Imported {created}/{len(patients_data)} patients",
    )


# ======================== ASSIGNMENTS ========================

@router.get("/assignments", response_model=List[AssignmentResponse])
async def list_assignments(
    current_user: CurrentUser = Depends(require_role("admin")),
    supabase: Client = Depends(get_supabase_admin),
):
    """List all assignments in the admin's hospital."""
    result = supabase.table("assignments") \
        .select("*, doctors(user_id, users(full_name)), patients(user_id, users(full_name))") \
        .eq("hospital_id", current_user.hospital_id) \
        .order("created_at", desc=True) \
        .execute()

    assignments = []
    for a in result.data or []:
        doctor_name = ""
        patient_name = ""
        if a.get("doctors") and a["doctors"].get("users"):
            doctor_name = a["doctors"]["users"].get("full_name", "")
        if a.get("patients") and a["patients"].get("users"):
            patient_name = a["patients"]["users"].get("full_name", "")

        assignments.append(AssignmentResponse(
            id=a["id"],
            hospital_id=a["hospital_id"],
            doctor_id=a["doctor_id"],
            patient_id=a["patient_id"],
            doctor_name=doctor_name,
            patient_name=patient_name,
            is_active=a.get("is_active", True),
            created_at=str(a.get("created_at", "")),
        ))
    return assignments


@router.post("/assignments", response_model=AssignmentResponse)
async def create_assignment(
    req: CreateAssignmentRequest,
    current_user: CurrentUser = Depends(require_role("admin")),
    supabase: Client = Depends(get_supabase_admin),
):
    """Assign a patient to a doctor."""
    # Verify doctor belongs to hospital
    doctor = supabase.table("doctors").select("id").eq("id", req.doctor_id).eq("hospital_id", current_user.hospital_id).single().execute()
    if not doctor.data:
        raise HTTPException(status_code=404, detail="Doctor not found in your hospital")

    # Verify patient belongs to hospital
    patient = supabase.table("patients").select("id").eq("id", req.patient_id).eq("hospital_id", current_user.hospital_id).single().execute()
    if not patient.data:
        raise HTTPException(status_code=404, detail="Patient not found in your hospital")

    try:
        result = supabase.table("assignments").insert({
            "hospital_id": current_user.hospital_id,
            "doctor_id": req.doctor_id,
            "patient_id": req.patient_id,
            "assigned_by": current_user.id,
            "notes": req.notes,
        }).execute()

        a = result.data[0]
        return AssignmentResponse(
            id=a["id"],
            hospital_id=a["hospital_id"],
            doctor_id=a["doctor_id"],
            patient_id=a["patient_id"],
            is_active=True,
            created_at=str(a.get("created_at", "")),
        )
    except Exception as e:
        if "duplicate" in str(e).lower() or "unique" in str(e).lower():
            raise HTTPException(status_code=409, detail="This assignment already exists")
        raise HTTPException(status_code=500, detail=f"Failed to create assignment: {str(e)}")


@router.delete("/assignments/{assignment_id}", response_model=MessageResponse)
async def delete_assignment(
    assignment_id: str,
    current_user: CurrentUser = Depends(require_role("admin")),
    supabase: Client = Depends(get_supabase_admin),
):
    """Remove an assignment."""
    supabase.table("assignments").delete().eq("id", assignment_id).eq("hospital_id", current_user.hospital_id).execute()
    return MessageResponse(message="Assignment removed")


# ======================== DASHBOARD STATS ====================

@router.get("/stats")
async def get_dashboard_stats(
    current_user: CurrentUser = Depends(require_role("admin")),
    supabase: Client = Depends(get_supabase_admin),
):
    """Get admin dashboard statistics."""
    hid = current_user.hospital_id

    patients = supabase.table("patients").select("id", count="exact").eq("hospital_id", hid).execute()
    doctors = supabase.table("doctors").select("id", count="exact").eq("hospital_id", hid).execute()
    high_risk = supabase.table("risk_scores").select("id", count="exact").eq("hospital_id", hid).eq("risk_level", "high").execute()
    readmissions = supabase.table("patients").select("id", count="exact").eq("hospital_id", hid).eq("is_readmitted", True).execute()
    surveys = supabase.table("survey_responses").select("id", count="exact").eq("hospital_id", hid).execute()

    return {
        "total_patients": patients.count or 0,
        "total_doctors": doctors.count or 0,
        "high_risk_count": high_risk.count or 0,
        "readmission_count": readmissions.count or 0,
        "total_survey_responses": surveys.count or 0,
    }


# ======================== COMPLAINTS =========================

@router.get("/complaints", response_model=List[ComplaintResponse])
async def list_complaints(
    current_user: CurrentUser = Depends(require_role("admin")),
    supabase: Client = Depends(get_supabase_admin),
):
    """List all complaints in the admin's hospital."""
    result = supabase.table("complaints") \
        .select("*, patients(user_id, users(full_name))") \
        .eq("hospital_id", current_user.hospital_id) \
        .order("created_at", desc=True) \
        .execute()

    complaints = []
    for c in result.data or []:
        patient_name = ""
        if c.get("patients") and c["patients"].get("users"):
            patient_name = c["patients"]["users"].get("full_name", "")

        complaints.append(ComplaintResponse(
            id=c["id"],
            hospital_id=c["hospital_id"],
            patient_id=c["patient_id"],
            patient_name=patient_name,
            subject=c["subject"],
            description=c["description"],
            image_url=c.get("image_url"),
            status=c.get("status", "open"),
            created_at=str(c.get("created_at", "")),
        ))
    return complaints


@router.patch("/complaints/{complaint_id}/status", response_model=MessageResponse)
async def update_complaint_status(
    complaint_id: str,
    status: ComplaintStatus,
    current_user: CurrentUser = Depends(require_role("admin")),
    supabase: Client = Depends(get_supabase_admin),
):
    """Update the status of a complaint."""
    # Verify complaint belongs to this hospital
    complaint = supabase.table("complaints").select("id").eq("id", complaint_id).eq("hospital_id", current_user.hospital_id).single().execute()
    if not complaint.data:
        raise HTTPException(status_code=404, detail="Complaint not found")

    supabase.table("complaints").update({
        "status": status.value
    }).eq("id", complaint_id).execute()

    return MessageResponse(message=f"Complaint status updated to {status.value}")
