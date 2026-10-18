from sqlalchemy import Column, Integer, BigInteger, TEXT, String, DateTime, CheckConstraint
from sqlalchemy.sql import func
from app.db.base import Base

class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint("role IN ('admin', 'staff')", name="chk_user_role"),
        CheckConstraint("status IN ('active', 'disabled')", name="chk_user_status"),
    )
    id = Column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    name = Column(TEXT, nullable=False)
    email = Column(String(255), nullable=False, unique=True)
    password_hash = Column(TEXT, nullable=False)
    role = Column(TEXT, nullable=False, default='admin')
    status = Column(TEXT, nullable=False, default='active')
    failed_attempts = Column(Integer, nullable=False, default=0)
    locked_until = Column(DateTime(timezone=True))
    last_login_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
