"""
Discharge+ — Auth Router
Admin registration and login endpoints.
"""

from fastapi import APIRouter, HTTPException, status, Depends
from models.schemas import AdminRegisterRequest, LoginRequest, AuthResponse
from dependencies import get_supabase_admin
from supabase import Client

router = APIRouter()


@router.post("/admin-register", response_model=AuthResponse)
async def admin_register(
    req: AdminRegisterRequest,
    supabase: Client = Depends(get_supabase_admin),
):
    """Register a new admin with their hospital."""
    try:
        # 1. Create the hospital
        hospital_result = supabase.table("hospitals").insert({
            "name": req.hospital_name,
            "address": req.hospital_address,
            "city": req.hospital_city,
            "state": req.hospital_state,
            "phone": req.hospital_phone,
            "email": req.hospital_email or req.email,
        }).execute()

        if not hospital_result.data:
            raise HTTPException(status_code=500, detail="Failed to create hospital")

        hospital = hospital_result.data[0]

        # 2. Create auth user in Supabase Auth
        auth_result = supabase.auth.admin.create_user({
            "email": req.email,
            "password": req.password,
            "email_confirm": True,
            "user_metadata": {
                "full_name": req.full_name,
                "role": "admin",
                "hospital_id": hospital["id"],
            },
        })

        if not auth_result.user:
            # Rollback hospital
            supabase.table("hospitals").delete().eq("id", hospital["id"]).execute()
            raise HTTPException(status_code=400, detail="Failed to create auth user")

        user_id = auth_result.user.id

        # 3. Insert into users table
        user_result = supabase.table("users").insert({
            "id": user_id,
            "hospital_id": hospital["id"],
            "email": req.email,
            "full_name": req.full_name,
            "role": "admin",
        }).execute()

        if not user_result.data:
            raise HTTPException(status_code=500, detail="Failed to create user record")

        # 4. Sign in to get tokens
        sign_in = supabase.auth.sign_in_with_password({
            "email": req.email,
            "password": req.password,
        })

        return AuthResponse(
            access_token=sign_in.session.access_token,
            refresh_token=sign_in.session.refresh_token,
            user={
                "id": user_id,
                "email": req.email,
                "full_name": req.full_name,
                "role": "admin",
                "hospital_id": hospital["id"],
                "hospital_name": hospital["name"],
            },
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")


@router.post("/login", response_model=AuthResponse)
async def login(
    req: LoginRequest,
    supabase: Client = Depends(get_supabase_admin),
):
    """Login with email and password. Returns Supabase session."""
    try:
        # Sign in via Supabase Auth
        sign_in = supabase.auth.sign_in_with_password({
            "email": req.email,
            "password": req.password,
        })

        if not sign_in.session:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        user_id = sign_in.user.id

        # Fetch user details from our users table
        user_result = supabase.table("users").select("*, hospitals(name)").eq("id", user_id).single().execute()

        if not user_result.data:
            raise HTTPException(status_code=401, detail="User record not found")

        user_data = user_result.data
        hospital_name = user_data.get("hospitals", {}).get("name", "") if user_data.get("hospitals") else ""

        # Update last login
        supabase.table("users").update({"last_login": "now()"}).eq("id", user_id).execute()

        return AuthResponse(
            access_token=sign_in.session.access_token,
            refresh_token=sign_in.session.refresh_token,
            user={
                "id": user_data["id"],
                "email": user_data["email"],
                "full_name": user_data["full_name"],
                "role": user_data["role"],
                "hospital_id": user_data["hospital_id"],
                "hospital_name": hospital_name,
            },
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Login failed: {str(e)}")
