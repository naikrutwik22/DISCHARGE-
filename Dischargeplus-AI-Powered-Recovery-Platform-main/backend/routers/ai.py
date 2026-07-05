"""
Discharge+ — AI Router
Report analysis and risk score endpoints.
"""

from fastapi import APIRouter, HTTPException, Depends
from dependencies import get_current_user, get_supabase_admin, CurrentUser
from models.schemas import AnalyzeReportRequest, ReportAnalysisResponse, ReportParameter, RiskScoreResponse
from services.ai_service import analyze_report
from supabase import Client

router = APIRouter()


@router.post("/analyze-report", response_model=ReportAnalysisResponse)
async def analyze_medical_report(
    req: AnalyzeReportRequest,
    current_user: CurrentUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin),
):
    """Analyze extracted text from a medical report using Groq AI."""
    result = analyze_report(req.text, req.language)

    # Parse parameters
    parameters = []
    for p in result.get("parameters", []):
        parameters.append(ReportParameter(
            name=p.get("name", ""),
            value=str(p.get("value", "")),
            unit=p.get("unit"),
            status=p.get("status", "normal"),
            reference_range=p.get("reference_range"),
        ))

    # Store analysis if patient
    if current_user.role == "patient":
        try:
            patient = supabase.table("patients").select("id").eq("user_id", current_user.id).single().execute()
            if patient.data:
                # Store report
                report = supabase.table("medical_reports").insert({
                    "patient_id": patient.data["id"],
                    "hospital_id": current_user.hospital_id,
                    "uploaded_by": current_user.id,
                    "file_url": "",
                    "ocr_text": req.text[:5000],
                    "language": req.language,
                }).execute()

                if report.data:
                    supabase.table("report_analysis").insert({
                        "report_id": report.data[0]["id"],
                        "hospital_id": current_user.hospital_id,
                        "parameters": result.get("parameters", []),
                        "summary": result.get("summary", ""),
                        "questions": result.get("questions", []),
                        "language": req.language,
                        "raw_response": result,
                    }).execute()
        except Exception as e:
            print(f"⚠️ Failed to store report analysis: {e}")

    return ReportAnalysisResponse(
        parameters=parameters,
        summary=result.get("summary", ""),
        questions=result.get("questions", []),
        language=req.language,
    )


@router.get("/risk/{patient_id}", response_model=RiskScoreResponse)
async def get_latest_risk_score(
    patient_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin),
):
    """Get the latest risk score for a patient."""
    result = supabase.table("risk_scores") \
        .select("*") \
        .eq("patient_id", patient_id) \
        .eq("hospital_id", current_user.hospital_id) \
        .order("created_at", desc=True) \
        .limit(1) \
        .execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="No risk score found for this patient")

    r = result.data[0]
    return RiskScoreResponse(
        id=r["id"],
        patient_id=r["patient_id"],
        risk_level=r["risk_level"],
        score=r.get("score"),
        reasoning=r.get("reasoning"),
        factors=r.get("factors"),
        created_at=str(r.get("created_at", "")),
    )
