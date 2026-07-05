"""
Discharge+ — Pydantic Request/Response Models
"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime, date
from enum import Enum


# ======================== ENUMS ==============================

class UserRole(str, Enum):
    admin = "admin"
    doctor = "doctor"
    patient = "patient"


class RiskLevel(str, Enum):
    high = "high"
    medium = "medium"
    low = "low"


class CallType(str, Enum):
    audio = "audio"
    video = "video"


class CallStatus(str, Enum):
    initiated = "initiated"
    ongoing = "ongoing"
    completed = "completed"
    missed = "missed"


class ComplaintStatus(str, Enum):
    open = "open"
    in_progress = "in_progress"
    resolved = "resolved"


# ======================== AUTH ===============================

class AdminRegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str
    hospital_name: str
    hospital_address: Optional[str] = None
    hospital_city: Optional[str] = None
    hospital_state: Optional[str] = None
    hospital_phone: Optional[str] = None
    hospital_email: Optional[EmailStr] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    user: dict
    message: str = "Login successful"


# ======================== HOSPITAL ===========================

class HospitalResponse(BaseModel):
    id: str
    name: str
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    logo_url: Optional[str] = None
    subscription_plan: Optional[str] = None
    is_active: bool = True


# ======================== USER ===============================

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    hospital_id: str
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    is_active: bool = True
    created_at: Optional[str] = None


# ======================== DOCTOR =============================

class CreateDoctorRequest(BaseModel):
    email: EmailStr
    full_name: str
    phone: Optional[str] = None
    specialization: Optional[str] = None
    license_number: Optional[str] = None
    department: Optional[str] = None
    qualification: Optional[str] = None
    experience_years: Optional[int] = None
    bio: Optional[str] = None


class DoctorResponse(BaseModel):
    id: str
    user_id: str
    email: str
    full_name: str
    hospital_id: str
    specialization: Optional[str] = None
    license_number: Optional[str] = None
    department: Optional[str] = None
    qualification: Optional[str] = None
    experience_years: Optional[int] = None
    bio: Optional[str] = None
    is_available: bool = True
    created_at: Optional[str] = None


class DoctorCredentials(BaseModel):
    email: str
    password: str
    full_name: str
    message: str = "Credentials generated. Email sent to doctor."


# ======================== PATIENT ============================

class CreatePatientRequest(BaseModel):
    email: EmailStr
    full_name: str
    phone: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    diagnosis: Optional[str] = None
    discharge_date: Optional[str] = None
    discharge_summary: Optional[str] = None
    comorbidities: Optional[List[str]] = []
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    expected_recovery_days: Optional[int] = 30
    admission_date: Optional[str] = None


class PatientResponse(BaseModel):
    id: str
    user_id: str
    email: str
    full_name: str
    hospital_id: str
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    diagnosis: Optional[str] = None
    discharge_date: Optional[str] = None
    discharge_summary: Optional[str] = None
    comorbidities: Optional[List[str]] = []
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    expected_recovery_days: Optional[int] = 30
    is_readmitted: bool = False
    created_at: Optional[str] = None


class PatientCredentials(BaseModel):
    email: str
    password: str
    full_name: str
    message: str = "Credentials generated. Email sent to patient."


# ======================== ASSIGNMENT =========================

class CreateAssignmentRequest(BaseModel):
    doctor_id: str
    patient_id: str
    notes: Optional[str] = None


class AssignmentResponse(BaseModel):
    id: str
    hospital_id: str
    doctor_id: str
    patient_id: str
    doctor_name: Optional[str] = None
    patient_name: Optional[str] = None
    is_active: bool = True
    created_at: Optional[str] = None


# ======================== SURVEY =============================

class CreateSurveyRequest(BaseModel):
    patient_id: str
    title: str
    description: Optional[str] = None
    question_types: List[str]  # ['fever','spo2','bp','sugar','pain','photo','voice','custom_text']
    schedule_type: str = "one_time"
    schedule_interval_days: Optional[int] = None
    due_date: Optional[str] = None


class SurveyResponse(BaseModel):
    id: str
    hospital_id: str
    doctor_id: str
    patient_id: str
    title: str
    description: Optional[str] = None
    question_types: List[str]
    schedule_type: str
    schedule_interval_days: Optional[int] = None
    due_date: Optional[str] = None
    is_completed: bool = False
    created_at: Optional[str] = None


class SurveyAnswerItem(BaseModel):
    question_type: str
    answer_value: Optional[str] = None
    answer_numeric: Optional[float] = None
    file_url: Optional[str] = None


class SubmitSurveyResponseRequest(BaseModel):
    answers: List[SurveyAnswerItem]


class SurveyResponseResult(BaseModel):
    response_id: str
    risk_score: Optional[dict] = None
    ai_feedback: Optional[str] = None
    message: str = "Survey submitted successfully"


# ======================== RISK ===============================

class RiskScoreResponse(BaseModel):
    id: str
    patient_id: str
    risk_level: str
    score: Optional[float] = None
    reasoning: Optional[str] = None
    factors: Optional[dict] = None
    created_at: Optional[str] = None


# ======================== AI / REPORT ========================

class AnalyzeReportRequest(BaseModel):
    text: str
    language: str = "english"


class ReportParameter(BaseModel):
    name: str
    value: str
    unit: Optional[str] = None
    status: str = "normal"  # 'normal' | 'borderline' | 'abnormal'
    reference_range: Optional[str] = None


class ReportAnalysisResponse(BaseModel):
    parameters: List[ReportParameter]
    summary: str
    questions: List[str]
    language: str = "english"


# ======================== CHAT ===============================

class SendMessageRequest(BaseModel):
    message: Optional[str] = None
    file_url: Optional[str] = None
    file_type: Optional[str] = None


class ChatMessageResponse(BaseModel):
    id: str
    sender_id: str
    receiver_id: str
    patient_id: str
    message: Optional[str] = None
    file_url: Optional[str] = None
    file_type: Optional[str] = None
    is_read: bool = False
    created_at: Optional[str] = None
    sender_name: Optional[str] = None


# ======================== CALL ===============================

class CreateCallRoomRequest(BaseModel):
    patient_id: str
    call_type: CallType = CallType.video


class CallRoomResponse(BaseModel):
    room_id: str
    token: str
    call_log_id: str


class JoinCallRequest(BaseModel):
    call_log_id: str


# ======================== MEDICATION =========================

class CreateMedicationRequest(BaseModel):
    patient_id: str
    name: str
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    instructions: Optional[str] = None


class MedicationResponse(BaseModel):
    id: str
    patient_id: str
    name: str
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    time_of_day: Optional[List[str]] = []
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    instructions: Optional[str] = None
    is_active: bool = True


class MedicationLogResponse(BaseModel):
    id: str
    medication_id: str
    status: str
    taken_at: Optional[str] = None
    notes: Optional[str] = None


# ======================== NOTIFICATION =======================

class NotificationResponse(BaseModel):
    id: str
    title: str
    message: Optional[str] = None
    type: str = "info"
    is_read: bool = False
    link: Optional[str] = None
    created_at: Optional[str] = None


# ======================== COMPLAINTS =========================

class CreateComplaintRequest(BaseModel):
    subject: str
    description: str
    image_url: Optional[str] = None


class ComplaintResponse(BaseModel):
    id: str
    hospital_id: str
    patient_id: str
    patient_name: Optional[str] = None
    subject: str
    description: str
    image_url: Optional[str] = None
    status: str
    created_at: Optional[str] = None


# ======================== DOCTOR NOTES =======================

class DoctorNoteRequest(BaseModel):
    patient_id: str
    note: str


# ======================== BULK IMPORT ========================

class BulkImportResponse(BaseModel):
    total: int
    created: int
    errors: List[dict] = []
    message: str


# ======================== GENERIC ============================

class MessageResponse(BaseModel):
    message: str
    data: Optional[dict] = None
