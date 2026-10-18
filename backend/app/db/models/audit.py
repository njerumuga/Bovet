from sqlalchemy import Column, Integer, BigInteger, TEXT, JSON, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.db.base import Base

class AuditLog(Base):
    __tablename__ = "audit_log"
    id = Column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    user_id = Column(BigInteger().with_variant(Integer, "sqlite"), ForeignKey("users.id"))
    action = Column(TEXT, nullable=False)
    entity = Column(TEXT, nullable=False)
    entity_id = Column(TEXT)
    before_data = Column(JSON)
    after_data = Column(JSON)
    ip_address = Column(TEXT)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
