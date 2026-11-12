from sqlalchemy import Column, BIGINT, TEXT, TIMESTAMPTZ, NUMERIC, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy import CheckConstraint, Index
from app.db.base import Base

class Customer(Base):
    __tablename__ = "customers"
    __table_args__ = (
        CheckConstraint("status IN ('active', 'inactive')", name="chk_customer_status"),
        Index("ix_customers_phone", "phone"),
    )
    id = Column(BIGINT, primary_key=True, autoincrement=True)
    name = Column(TEXT, nullable=False)
    phone = Column(TEXT, nullable=False)
    location = Column(TEXT, nullable=False)
    email = Column(TEXT)
    notes = Column(TEXT)
    opening_balance = Column(NUMERIC(12, 2), nullable=False, default=0, server_default="0")
    status = Column(TEXT, nullable=False, default='active')
    created_by = Column(BIGINT, ForeignKey("users.id"), nullable=False)
    created_at = Column(TIMESTAMPTZ, nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMPTZ, nullable=False, server_default=func.now(), onupdate=func.now())