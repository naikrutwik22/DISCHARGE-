"""
Discharge+ — Dependencies
JWT verification and current user extraction.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from config import get_settings
from supabase import create_client, Client, ClientOptions

settings = get_settings()
security = HTTPBearer()

def get_supabase_admin() -> Client:
    """Returns a fresh Supabase client with service role key (bypasses RLS)."""
    return create_client(
        settings.supabase_url, 
        settings.supabase_service_role_key,
        options=ClientOptions(persist_session=False)
    )

def get_supabase() -> Client:
    """Returns a fresh Supabase client with anon key."""
    return create_client(
        settings.supabase_url, 
        settings.supabase_anon_key,
        options=ClientOptions(persist_session=False)
    )


class CurrentUser:
    """Represents the authenticated user extracted from JWT."""

    def __init__(self, id: str, email: str, role: str, hospital_id: str):
        self.id = id
        self.email = email
        self.role = role
        self.hospital_id = hospital_id

    def __repr__(self):
        return f"<CurrentUser {self.email} role={self.role} hospital={self.hospital_id}>"


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    supabase: Client = Depends(get_supabase_admin),
) -> CurrentUser:
    """
    Verify Supabase JWT and return the current user with role and hospital_id.
    """
    token = credentials.credentials
    try:
        # Ask Supabase to verify the token for us
        auth_res = supabase.auth.get_user(token)
        if not auth_res or not auth_res.user:
            raise Exception("No user found for this token")
        user_id = auth_res.user.id
    except Exception as e:
        print(f"Token verification failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}",
        )

    # Fetch user record from our users table
    result = supabase.table("users").select("*").eq("id", user_id).single().execute()

    if not result.data:
        print(f"User not found in our users table! ID: {user_id}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found in database",
        )

    user_data = result.data
    return CurrentUser(
        id=user_data["id"],
        email=user_data["email"],
        role=user_data["role"],
        hospital_id=user_data["hospital_id"],
    )


def require_role(*roles: str):
    """Dependency factory: ensures current user has one of the given roles."""

    async def role_checker(current_user: CurrentUser = Depends(get_current_user)):
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role: {', '.join(roles)}",
            )
        return current_user

    return role_checker
