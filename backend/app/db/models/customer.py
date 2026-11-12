from sqlalchemy import Column, Integer, BigInteger, TEXT, DateTime, NUMERIC, ForeignKey, CheckConstraint, Index
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.base import Base

class Customer(Base):
    __tablename__ = "customers"
    __table_args__ = (
        CheckConstraint("status IN ('active', 'inactive')", name="chk_customer_status"),
        Index("ix_customers_phone", "phone"),
    )
    id = Column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    name = Column(TEXT, nullable=False)
    phone = Column(TEXT, nullable=False)
    location = Column(TEXT, nullable=False)
    email = Column(TEXT)
    notes = Column(TEXT)
    opening_balance = Column(NUMERIC(12, 2), nullable=False, default=0, server_default="0")
    status = Column(TEXT, nullable=False, default='active')
    created_by = Column(BigInteger().with_variant(Integer, "sqlite"), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    invoices = relationship("Invoice", back_populates="customer", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="customer")