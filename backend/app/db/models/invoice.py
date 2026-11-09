from sqlalchemy import Boolean, Column, Integer, BigInteger, TEXT, DATE, DateTime, ForeignKey, NUMERIC, CheckConstraint, Index
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.base import Base

class Invoice(Base):
    __tablename__ = "invoices"
    __table_args__ = (
        CheckConstraint("kind IN ('sale', 'opening_balance')", name="chk_invoice_kind"),
        Index("ix_inv_customer", "customer_id", "invoice_date"),
        Index("ix_inv_status_date", "status", "invoice_date"),
    )
    id = Column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    invoice_no = Column(TEXT, nullable=False, unique=True)
    kind = Column(TEXT, nullable=False, default='sale')
    customer_id = Column(BigInteger().with_variant(Integer, "sqlite"), ForeignKey("customers.id"), nullable=False)
    invoice_date = Column(DATE, nullable=False)
    subtotal = Column(NUMERIC(14,2), nullable=False)
    discount = Column(NUMERIC(14,2), nullable=False, default=0)
    total = Column(NUMERIC(14,2), nullable=False)
    amount_paid = Column(NUMERIC(14,2), nullable=False, default=0)
    balance = Column(NUMERIC(14,2), nullable=False, default=0)
    is_credit = Column(Boolean, nullable=False, default=False)
    status = Column(TEXT, nullable=False)
    void_reason = Column(TEXT, nullable=True)
    voided_by = Column(BigInteger().with_variant(Integer, "sqlite"), ForeignKey("users.id"), nullable=True)
    voided_at = Column(DateTime(timezone=True), nullable=True)
    notes = Column(TEXT, nullable=True)
    created_by = Column(BigInteger().with_variant(Integer, "sqlite"), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    customer = relationship("Customer", back_populates="invoices")
    lines = relationship("InvoiceLine", back_populates="invoice", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="invoice")
