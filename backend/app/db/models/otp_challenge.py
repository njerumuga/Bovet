from sqlalchemy import Column, Integer, BigInteger, String, DateTime, Index
from sqlalchemy.sql import func

from app.db.base import Base


class OTPChallenge(Base):
    __tablename__ = "otp_challenges"
    __table_args__ = (Index("ix_otp_challenges_expires_at", "expires_at"),)

    id = Column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    email = Column(String(255), nullable=False, unique=True)
    code_hash = Column(String(64), nullable=False)
    attempts = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=False)
