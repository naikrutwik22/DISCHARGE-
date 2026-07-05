"""
Discharge+ — Chat Router
Chat history, messaging, file attachments, 100ms video call management.
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional
from dependencies import get_current_user, get_supabase_admin, CurrentUser
from models.schemas import SendMessageRequest, ChatMessageResponse, CreateCallRoomRequest, CallRoomResponse, JoinCallRequest, MessageResponse
from config import get_settings
from supabase import Client
import httpx
import jwt as pyjwt
import uuid
import time

settings = get_settings()
router = APIRouter()


# ======================== CHAT ===============================

@router.get("/{patient_id}/history")
async def get_chat_history(
    patient_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    current_user: CurrentUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin),
):
    """Get paginated chat history for a patient conversation."""
    offset = (page - 1) * limit

    result = supabase.table("chat_messages") \
        .select("*, sender:users!chat_messages_sender_id_fkey(full_name, avatar_url), receiver:users!chat_messages_receiver_id_fkey(full_name)") \
        .eq("patient_id", patient_id) \
        .eq("hospital_id", current_user.hospital_id) \
        .order("created_at", desc=True) \
        .range(offset, offset + limit - 1) \
        .execute()

    messages = []
    for m in result.data or []:
        sender = m.get("sender", {}) or {}
        messages.append({
            "id": m["id"],
            "sender_id": m["sender_id"],
            "receiver_id": m["receiver_id"],
            "patient_id": m["patient_id"],
            "message": m.get("message"),
            "file_url": m.get("file_url"),
            "file_type": m.get("file_type"),
            "is_read": m.get("is_read", False),
            "created_at": str(m.get("created_at", "")),
            "sender_name": sender.get("full_name", ""),
            "sender_avatar": sender.get("avatar_url"),
        })

    return {"messages": list(reversed(messages)), "page": page, "limit": limit}


@router.post("/{patient_id}/message")
async def send_message(
    patient_id: str,
    req: SendMessageRequest,
    current_user: CurrentUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin),
):
    """Send a chat message. Triggers Supabase Realtime event."""
    if not req.message and not req.file_url:
        raise HTTPException(status_code=400, detail="Message or file is required")

    # Determine receiver
    patient = supabase.table("patients").select("user_id").eq("id", patient_id).single().execute()
    if not patient.data:
        raise HTTPException(status_code=404, detail="Patient not found")

    if current_user.role == "patient":
        # Patient sending to doctor — find assigned doctor
        assignment = supabase.table("assignments") \
            .select("doctors(user_id)") \
            .eq("patient_id", patient_id) \
            .eq("is_active", True) \
            .limit(1) \
            .execute()

        if not assignment.data or not assignment.data[0].get("doctors"):
            raise HTTPException(status_code=404, detail="No doctor assigned")

        receiver_id = assignment.data[0]["doctors"]["user_id"]
    else:
        # Doctor sending to patient
        receiver_id = patient.data["user_id"]

    result = supabase.table("chat_messages").insert({
        "hospital_id": current_user.hospital_id,
        "sender_id": current_user.id,
        "receiver_id": receiver_id,
        "patient_id": patient_id,
        "message": req.message,
        "file_url": req.file_url,
        "file_type": req.file_type,
    }).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to send message")

    return result.data[0]


@router.post("/{patient_id}/mark-read")
async def mark_messages_read(
    patient_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin),
):
    """Mark all messages in a conversation as read for the current user."""
    supabase.table("chat_messages") \
        .update({"is_read": True}) \
        .eq("patient_id", patient_id) \
        .eq("receiver_id", current_user.id) \
        .eq("is_read", False) \
        .execute()

    return {"message": "Messages marked as read"}


# ======================== VIDEO CALLS ========================

@router.post("/calls/create-room", response_model=CallRoomResponse)
async def create_call_room(
    req: CreateCallRoomRequest,
    current_user: CurrentUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin),
):
    """Doctor creates a 100ms room and gets a join token."""
    if not settings.hms_access_key or not settings.hms_secret:
        raise HTTPException(status_code=503, detail="Video calling not configured")

    # Get doctor
    doctor = supabase.table("doctors").select("id").eq("user_id", current_user.id).single().execute()
    if not doctor.data:
        raise HTTPException(status_code=404, detail="Doctor profile not found")

    # Generate 100ms management token
    mgmt_token = _generate_hms_management_token()

    # Create room via 100ms API
    room_id = None
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://api.100ms.live/v2/rooms",
            headers={"Authorization": f"Bearer {mgmt_token}"},
            json={
                "name": f"discharge-{uuid.uuid4().hex[:8]}",
                "description": f"Call with patient {req.patient_id}",
                "template_id": settings.hms_template_id,
            },
        )
        if resp.status_code == 200:
            room_data = resp.json()
            room_id = room_data.get("id")
        else:
            raise HTTPException(status_code=500, detail=f"Failed to create room: {resp.text}")

    # Generate join token for doctor
    doctor_token = _generate_hms_app_token(room_id, current_user.id, "host")

    # Log call
    call_log = supabase.table("call_logs").insert({
        "hospital_id": current_user.hospital_id,
        "doctor_id": doctor.data["id"],
        "patient_id": req.patient_id,
        "room_id": room_id,
        "call_type": req.call_type.value,
        "call_status": "initiated",
    }).execute()

    # Notify patient
    patient = supabase.table("patients").select("user_id").eq("id", req.patient_id).single().execute()
    if patient.data:
        supabase.table("notifications").insert({
            "hospital_id": current_user.hospital_id,
            "user_id": patient.data["user_id"],
            "title": "📞 Incoming Call",
            "message": "Your doctor is calling. Click to join.",
            "type": "alert",
            "metadata": {"call_log_id": call_log.data[0]["id"] if call_log.data else "", "room_id": room_id},
        }).execute()

    return CallRoomResponse(
        room_id=room_id,
        token=doctor_token,
        call_log_id=call_log.data[0]["id"] if call_log.data else "",
    )


@router.post("/calls/join-token", response_model=CallRoomResponse)
async def get_join_token(
    req: JoinCallRequest,
    current_user: CurrentUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin),
):
    """Patient gets a join token for an existing call."""
    call = supabase.table("call_logs") \
        .select("*") \
        .eq("id", req.call_log_id) \
        .eq("hospital_id", current_user.hospital_id) \
        .single() \
        .execute()

    if not call.data:
        raise HTTPException(status_code=404, detail="Call not found")

    room_id = call.data["room_id"]
    token = _generate_hms_app_token(room_id, current_user.id, "guest")

    # Update call status
    supabase.table("call_logs").update({"call_status": "ongoing"}).eq("id", req.call_log_id).execute()

    return CallRoomResponse(
        room_id=room_id,
        token=token,
        call_log_id=req.call_log_id,
    )


@router.post("/calls/{call_log_id}/end")
async def end_call(
    call_log_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin),
):
    """End a call and update the log."""
    from datetime import datetime

    call = supabase.table("call_logs").select("*").eq("id", call_log_id).single().execute()
    if not call.data:
        raise HTTPException(status_code=404, detail="Call not found")

    started = call.data.get("started_at") or call.data.get("created_at")
    duration = 0
    if started:
        try:
            start_time = datetime.fromisoformat(started.replace("Z", "+00:00"))
            duration = int((datetime.now(start_time.tzinfo) - start_time).total_seconds())
        except Exception:
            pass

    supabase.table("call_logs").update({
        "call_status": "completed",
        "ended_at": datetime.utcnow().isoformat(),
        "duration_seconds": duration,
    }).eq("id", call_log_id).execute()

    return {"message": "Call ended", "duration_seconds": duration}


# ======================== HELPERS ============================

def _generate_hms_management_token() -> str:
    """Generate a 100ms management token."""
    now = int(time.time())
    payload = {
        "access_key": settings.hms_access_key,
        "type": "management",
        "version": 2,
        "iat": now,
        "nbf": now,
        "exp": now + 86400,
        "jti": str(uuid.uuid4()),
    }
    return pyjwt.encode(payload, settings.hms_secret, algorithm="HS256")


def _generate_hms_app_token(room_id: str, user_id: str, role: str) -> str:
    """Generate a 100ms app token for joining a room."""
    now = int(time.time())
    payload = {
        "access_key": settings.hms_access_key,
        "room_id": room_id,
        "user_id": user_id,
        "role": role,
        "type": "app",
        "version": 2,
        "iat": now,
        "nbf": now,
        "exp": now + 86400,
        "jti": str(uuid.uuid4()),
    }
    return pyjwt.encode(payload, settings.hms_secret, algorithm="HS256")
