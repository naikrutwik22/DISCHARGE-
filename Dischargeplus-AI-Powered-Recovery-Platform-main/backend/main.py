"""
Discharge+ — FastAPI Application Entry Point
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import get_settings

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    description="B2B Multi-tenant Hospital Post-Discharge SaaS Platform",
    version="1.0.0",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.frontend_url,
        "http://localhost:5173",
        "http://localhost:3000",
        "https://discharge-plus-ai-powered-recovery.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Router Registration ---
from routers import auth, admin, doctor, patient, survey, ai, chat  # noqa: E402

app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(admin.router, prefix="/admin", tags=["Admin"])
app.include_router(doctor.router, prefix="/doctor", tags=["Doctor"])
app.include_router(patient.router, prefix="/patient", tags=["Patient"])
app.include_router(survey.router, prefix="/surveys", tags=["Surveys"])
app.include_router(ai.router, prefix="/ai", tags=["AI"])
app.include_router(chat.router, prefix="/chat", tags=["Chat"])


@app.on_event("startup")
async def startup_event():
    print(f"🚀 {settings.app_name} backend starting...")
    print(f"📡 Supabase: {settings.supabase_url}")
    print(f"🌐 Frontend: {settings.frontend_url}")


@app.get("/", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "app": settings.app_name,
        "version": "1.0.0",
    }


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "ok"}
