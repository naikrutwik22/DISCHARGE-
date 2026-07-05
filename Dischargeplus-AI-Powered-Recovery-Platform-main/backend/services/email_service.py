"""
Discharge+ — Email Service
Sends credential emails and notifications via SMTP with Jinja2 HTML templates.
"""

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from jinja2 import Template
from config import get_settings

settings = get_settings()

# ======================== HTML TEMPLATES =====================

CREDENTIAL_EMAIL_TEMPLATE = Template("""
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Inter', Arial, sans-serif; background: #0A1628; color: #FFFFFF; padding: 40px; }
        .container { max-width: 600px; margin: 0 auto; background: #1A2A44; border-radius: 16px; padding: 40px; }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { font-size: 28px; font-weight: 700; color: #00D4AA; }
        .credentials-box { background: #0A1628; border: 1px solid #00D4AA; border-radius: 12px; padding: 24px; margin: 20px 0; }
        .label { color: #8899AA; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
        .value { color: #FFFFFF; font-size: 18px; font-weight: 600; margin-bottom: 16px; font-family: monospace; }
        .button { display: inline-block; background: #00D4AA; color: #0A1628; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 20px; }
        .footer { text-align: center; margin-top: 30px; color: #8899AA; font-size: 12px; }
        .warning { background: #2A1A00; border: 1px solid #FF9900; border-radius: 8px; padding: 12px; margin-top: 20px; color: #FF9900; font-size: 13px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">Discharge+</div>
            <p style="color: #8899AA;">{{ hospital_name }}</p>
        </div>

        <h2 style="color: #FFFFFF;">Welcome, {{ full_name }}!</h2>
        <p style="color: #B0BEC5;">Your {{ role }} account has been created. Use the credentials below to log in:</p>

        <div class="credentials-box">
            <div class="label">Email</div>
            <div class="value">{{ email }}</div>
            <div class="label">Password</div>
            <div class="value">{{ password }}</div>
        </div>

        <div style="text-align: center;">
            <a href="{{ login_url }}" class="button">Log In Now</a>
        </div>

        <div class="warning">
            ⚠️ Please change your password after your first login for security.
        </div>

        <div class="footer">
            <p>This is an automated email from {{ hospital_name }} via Discharge+</p>
            <p>If you did not expect this email, please contact your hospital administrator.</p>
        </div>
    </div>
</body>
</html>
""")


NOTIFICATION_EMAIL_TEMPLATE = Template("""
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Inter', Arial, sans-serif; background: #0A1628; color: #FFFFFF; padding: 40px; }
        .container { max-width: 600px; margin: 0 auto; background: #1A2A44; border-radius: 16px; padding: 40px; }
        .logo { font-size: 28px; font-weight: 700; color: #00D4AA; text-align: center; margin-bottom: 20px; }
        .content { color: #B0BEC5; line-height: 1.6; }
        .footer { text-align: center; margin-top: 30px; color: #8899AA; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">Discharge+</div>
        <h2 style="color: #FFFFFF;">{{ title }}</h2>
        <div class="content">{{ message }}</div>
        <div class="footer">
            <p>Discharge+ — Post-Discharge Care Platform</p>
        </div>
    </div>
</body>
</html>
""")


def send_email(to_email: str, subject: str, html_body: str) -> bool:
    """Send an email via SMTP."""
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{settings.smtp_from_name} <{settings.smtp_from_email}>"
        msg["To"] = to_email

        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            server.starttls()
            server.login(settings.smtp_user, settings.smtp_password)
            server.send_message(msg)

        return True
    except Exception as e:
        print(f"❌ Email send failed: {e}")
        return False


def send_credential_email(
    to_email: str,
    full_name: str,
    password: str,
    role: str,
    hospital_name: str,
) -> bool:
    """Send auto-generated credentials to a new doctor or patient."""
    login_url = f"{settings.frontend_url}/login"
    html_body = CREDENTIAL_EMAIL_TEMPLATE.render(
        full_name=full_name,
        email=to_email,
        password=password,
        role=role,
        hospital_name=hospital_name,
        login_url=login_url,
    )
    subject = f"Your {settings.app_name} Account — {hospital_name}"
    return send_email(to_email, subject, html_body)


def send_notification_email(to_email: str, title: str, message: str) -> bool:
    """Send a generic notification email."""
    html_body = NOTIFICATION_EMAIL_TEMPLATE.render(title=title, message=message)
    return send_email(to_email, title, html_body)
