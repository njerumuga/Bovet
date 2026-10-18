import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models.otp_challenge import OTPChallenge

_MAX_ATTEMPTS = 5
_RESEND_COOLDOWN = timedelta(seconds=60)


def _normalize_email(email: str) -> str:
    return (email or "").strip().lower()


def _hash_code(code: str) -> str:
    if not settings.OTP_HMAC_KEY or len(settings.OTP_HMAC_KEY) < 32:
        raise RuntimeError("OTP_HMAC_KEY must be configured with at least 32 characters.")
    return hmac.new(settings.OTP_HMAC_KEY.encode("utf-8"), code.encode("utf-8"), hashlib.sha256).hexdigest()


def _utc_aware(value: datetime) -> datetime:
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value


def create_otp(db: Session, email: str) -> str:
    normalized = _normalize_email(email)
    code = str(secrets.randbelow(900_000) + 100_000)
    now = datetime.now(timezone.utc)
    code_hash = _hash_code(code)
    challenge = (
        db.query(OTPChallenge)
        .filter(OTPChallenge.email == normalized)
        .with_for_update()
        .first()
    )
    if challenge and now - _utc_aware(challenge.created_at) < _RESEND_COOLDOWN:
        raise ValueError("A verification code was sent recently. Wait before requesting another.")
    if challenge is None:
        challenge = OTPChallenge(email=normalized)
    challenge.code_hash = code_hash
    challenge.attempts = 0
    challenge.created_at = now
    challenge.expires_at = now + timedelta(minutes=settings.OTP_EXPIRY_MINUTES)
    db.add(challenge)
    db.commit()
    return code


def verify_otp(db: Session, email: str, code: str) -> bool:
    normalized = _normalize_email(email)
    try:
        submitted_hash = _hash_code(str(code))
    except RuntimeError:
        return False
    challenge = (
        db.query(OTPChallenge)
        .filter(OTPChallenge.email == normalized)
        .with_for_update()
        .first()
    )
    if not challenge:
        return False
    if datetime.now(timezone.utc) > _utc_aware(challenge.expires_at):
        db.delete(challenge)
        db.commit()
        return False

    challenge.attempts += 1
    valid = hmac.compare_digest(challenge.code_hash, submitted_hash)
    if valid or challenge.attempts >= _MAX_ATTEMPTS:
        db.delete(challenge)
    db.commit()
    return valid


def clear_otp(db: Session, email: str) -> None:
    challenge = db.query(OTPChallenge).filter(
        OTPChallenge.email == _normalize_email(email)
    ).first()
    if challenge:
        db.delete(challenge)
        db.commit()
