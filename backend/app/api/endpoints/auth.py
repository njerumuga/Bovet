from datetime import datetime, timedelta, timezone
import logging
import smtplib

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.otp_store import clear_otp, create_otp, verify_otp as verify_otp_code
from app.core.security import create_access_token, hash_password, verify_password
from app.core.config import settings
from app.core.mail import send_login_otp
from app.db.models.user import User
from app.db.session import get_db
from app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    OTPVerifyRequest,
    PasswordChangeRequest,
    PasswordResetRequest,
)

router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger(__name__)


def _user_payload(user: User) -> dict:
    return {
        "id": user.id,
        "name": user.name or "Eng. Njeru",
        "email": user.email,
        "role": user.role,
        "status": user.status,
        "security_2fa": True,
    }


@router.post("/login", response_model=LoginResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    email = req.email.strip().lower()
    user = db.query(User).filter(User.email.ilike(email)).first()

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    if not user or user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    locked_until = user.locked_until
    if locked_until and locked_until.tzinfo is not None:
        locked_until = locked_until.replace(tzinfo=None)
    if locked_until and locked_until > now:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many sign-in attempts. Try again later.",
        )
    if locked_until and locked_until <= now:
        user.locked_until = None
        user.failed_attempts = 0

    if not verify_password(req.password, user.password_hash):
        user.failed_attempts += 1
        if user.failed_attempts >= 5:
            user.locked_until = now + timedelta(minutes=15)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    user.failed_attempts = 0
    user.locked_until = None

    if not settings.SECRET_KEY or len(settings.SECRET_KEY) < 32:
        raise HTTPException(status_code=503, detail="Authentication secrets are not configured.")

    if req.code:
        if not verify_otp_code(db, user.email, req.code):
            db.commit()
            raise HTTPException(status_code=400, detail="Invalid or expired verification code.")
        user.last_login_at = now
        db.commit()
        token = create_access_token({"sub": str(user.id), "email": user.email, "role": user.role})
        return LoginResponse(access_token=token, token_type="bearer", user=_user_payload(user), requires_otp=False)

    if not settings.OTP_HMAC_KEY or len(settings.OTP_HMAC_KEY) < 32:
        raise HTTPException(status_code=503, detail="OTP signing key is not configured.")
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD or not settings.MAIL_FROM:
        raise HTTPException(status_code=503, detail="Email delivery is not configured on the server.")

    try:
        code = create_otp(db, user.email)
    except ValueError as exc:
        raise HTTPException(status_code=429, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    try:
        send_login_otp(user.email, code)
    except (smtplib.SMTPException, OSError, RuntimeError) as exc:
        logger.exception(
            "OTP email delivery failed for %s using provider=%s smtp_host=%s smtp_port=%s user_configured=%s mail_from_configured=%s brevo_configured=%s",
            user.email,
            "brevo" if settings.BREVO_API_KEY else "smtp",
            settings.SMTP_HOST,
            settings.SMTP_PORT,
            bool(settings.SMTP_USER or settings.BREVO_API_KEY),
            bool(settings.MAIL_FROM),
            bool(settings.BREVO_API_KEY),
        )
        clear_otp(db, user.email)
        raise HTTPException(
            status_code=503,
            detail="Could not send the verification email. Check the mail server configuration and try again.",
        ) from exc

    db.commit()
    return LoginResponse(
        access_token="",
        token_type="bearer",
        user=_user_payload(user),
        requires_otp=True,
    )


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return _user_payload(current_user)


@router.post("/otp/verify")
@router.post("/verify-otp")
@router.post("/security-code")
@router.post("/verify-code")
def verify_otp(req: OTPVerifyRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email.ilike(req.email.strip())).first()
    if not user or user.status != "active":
        raise HTTPException(status_code=400, detail="Invalid or expired verification code.")

    if not verify_otp_code(db, user.email, req.code):
        raise HTTPException(status_code=400, detail="Invalid or expired verification code.")

    if not settings.SECRET_KEY or len(settings.SECRET_KEY) < 32:
        raise HTTPException(status_code=503, detail="Authentication secrets are not configured.")
    user.last_login_at = datetime.now(timezone.utc)
    user.failed_attempts = 0
    user.locked_until = None
    db.commit()
    token = create_access_token({"sub": str(user.id), "email": user.email, "role": user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": _user_payload(user),
    }


@router.post("/refresh")
def refresh_token(current_user: User = Depends(get_current_user)):
    token = create_access_token({"sub": str(current_user.id), "email": current_user.email, "role": current_user.role})
    return {"access_token": token, "token_type": "bearer", "user": _user_payload(current_user)}


@router.post("/logout")
def logout(current_user: User = Depends(get_current_user)):
    return {"message": "Logged out successfully.", "user": current_user.email}


@router.post("/change-password")
def change_password(
    payload: PasswordChangeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")

    current_user.password_hash = hash_password(payload.new_password)
    db.commit()
    return {"message": "Password changed successfully."}


@router.post("/forgot-password")
def forgot_password(email: str, db: Session = Depends(get_db)):
    normalized_email = email.strip().lower()
    user = db.query(User).filter(User.email.ilike(normalized_email)).first()
    if user and user.status == "active":
        try:
            code = create_otp(db, user.email)
            send_login_otp(user.email, code)
        except (ValueError, RuntimeError, smtplib.SMTPException, OSError):
            clear_otp(db, user.email)

    # Do not reveal whether an email is registered.
    return {"message": "If that account exists, a reset code has been sent."}

@router.post("/reset-password")
def reset_password(payload: PasswordResetRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email.ilike(payload.email.strip().lower())).first()
    if not user or user.status != "active" or not verify_otp_code(db, user.email, payload.code):
        raise HTTPException(status_code=400, detail="Invalid or expired password reset code.")

    user.password_hash = hash_password(payload.new_password)
    user.failed_attempts = 0
    user.locked_until = None
    db.commit()
    return {"message": "Password reset successfully."}
