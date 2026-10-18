import smtplib
import ssl
from email.message import EmailMessage

from app.core.config import settings


def send_login_otp(recipient: str, code: str) -> None:
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD or not settings.MAIL_FROM:
        raise RuntimeError(
            "Email delivery is not configured. Set SMTP_USER, SMTP_PASSWORD, and MAIL_FROM in backend/.env."
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
