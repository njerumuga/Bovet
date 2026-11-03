import smtplib
import ssl
import json
import urllib.error
import urllib.request
from email.message import EmailMessage

from app.core.config import settings


def send_login_otp(recipient: str, code: str) -> None:
    if not settings.MAIL_FROM:
        raise RuntimeError(
            "Email delivery is not configured. Set MAIL_FROM in the backend environment."
        )

    if settings.BREVO_API_KEY:
        payload = {
            "sender": {"email": settings.MAIL_FROM, "name": "Bovet Agri Ventures"},
            "to": [{"email": recipient}],
            "subject": "Your Bovet Agri sign-in code",
            "textContent": (
                f"Your Bovet Agri sign-in code is {code}.\n\n"
                f"It expires in {settings.OTP_EXPIRY_MINUTES} minutes and can only be used once. "
                "If you did not request this code, you can ignore this email."
            ),
        }
        request = urllib.request.Request(
            "https://api.brevo.com/v3/smtp/email",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "accept": "application/json",
                "api-key": settings.BREVO_API_KEY,
                "content-type": "application/json",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=15) as response:
                if response.status < 200 or response.status >= 300:
                    raise RuntimeError(f"Brevo returned HTTP {response.status}.")
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError) as exc:
            raise RuntimeError("Brevo email delivery failed.") from exc
        return

    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        raise RuntimeError(
            "Email delivery is not configured. Set BREVO_API_KEY or SMTP credentials."
        )

    message = EmailMessage()
    message["Subject"] = "Your Bovet Agri sign-in code"
    message["From"] = settings.MAIL_FROM
    message["To"] = recipient
    message.set_content(
        f"Your Bovet Agri sign-in code is {code}.\n\n"
        f"It expires in {settings.OTP_EXPIRY_MINUTES} minutes and can only be used once. "
        "If you did not request this code, you can ignore this email."
    )

    context = ssl.create_default_context()
    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as smtp:
        smtp.ehlo()
        smtp.starttls(context=context)
        smtp.ehlo()
        smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        smtp.send_message(message)
