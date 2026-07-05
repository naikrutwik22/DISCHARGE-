"""
Discharge+ — Utility Helpers
Credential generation, password helpers, CSV parsing.
"""

import secrets
import string
import csv
import io
from typing import List, Dict


def generate_password(length: int = 12) -> str:
    """Generate a secure random password."""
    chars = string.ascii_letters + string.digits + "!@#$%"
    password = "".join(secrets.choice(chars) for _ in range(length))
    # Ensure at least one of each type
    password = (
        secrets.choice(string.ascii_uppercase)
        + secrets.choice(string.ascii_lowercase)
        + secrets.choice(string.digits)
        + secrets.choice("!@#$%")
        + password[4:]
    )
    return password


def generate_credentials(full_name: str, domain: str = "dischargeplus") -> Dict[str, str]:
    """Generate email-like username and password for a doctor or patient."""
    # Create a username from the full name
    clean_name = full_name.lower().replace(" ", ".").replace("'", "")
    # Add random suffix to avoid collisions
    suffix = secrets.token_hex(2)
    username = f"{clean_name}.{suffix}@{domain}.local"
    password = generate_password()
    return {"username": username, "password": password}


def parse_csv_patients(csv_content: str) -> List[Dict]:
    """Parse CSV content into a list of patient dicts."""
    reader = csv.DictReader(io.StringIO(csv_content))
    patients = []
    for row in reader:
        patient = {
            "full_name": row.get("full_name", "").strip(),
            "email": row.get("email", "").strip(),
            "phone": row.get("phone", "").strip(),
            "date_of_birth": row.get("date_of_birth", "").strip() or None,
            "gender": row.get("gender", "").strip() or None,
            "blood_group": row.get("blood_group", "").strip() or None,
            "diagnosis": row.get("diagnosis", "").strip() or None,
            "discharge_date": row.get("discharge_date", "").strip() or None,
            "discharge_summary": row.get("discharge_summary", "").strip() or None,
            "emergency_contact_name": row.get("emergency_contact_name", "").strip() or None,
            "emergency_contact_phone": row.get("emergency_contact_phone", "").strip() or None,
            "expected_recovery_days": int(row.get("expected_recovery_days", 30) or 30),
        }
        if patient["full_name"] and patient["email"]:
            patients.append(patient)
    return patients


def parse_csv_doctors(csv_content: str) -> List[Dict]:
    """Parse CSV content into a list of doctor dicts."""
    reader = csv.DictReader(io.StringIO(csv_content))
    doctors = []
    for row in reader:
        doctor = {
            "full_name": row.get("full_name", "").strip(),
            "email": row.get("email", "").strip(),
            "phone": row.get("phone", "").strip() or None,
            "specialization": row.get("specialization", "").strip() or None,
            "license_number": row.get("license_number", "").strip() or None,
            "department": row.get("department", "").strip() or None,
            "qualification": row.get("qualification", "").strip() or None,
            "experience_years": int(row.get("experience_years", 0) or 0) or None,
        }
        if doctor["full_name"] and doctor["email"]:
            doctors.append(doctor)
    return doctors
