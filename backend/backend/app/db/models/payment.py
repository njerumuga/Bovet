from sqlalchemy import Column, Integer, BigInteger, TEXT, DATE, DateTime, ForeignKey, NUMERIC, Index
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.base import Base

class Payment(Base):
    __tablename__ = "payments"
    __table_args__ = (
        Index("ix_payments_customer", "customer_id"),
        Index("ix_payments_invoice", "invoice_id"),
        Index("ix_payments_ref", "reference_code"),
    )

    id = Column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    receipt_no = Column(TEXT, nullable=False, unique=True)
    customer_id = Column(BigInteger().with_variant(Integer, "sqlite"), ForeignKey("customers.id"), nullable=False)
    invoice_id = Column(BigInteger().with_variant(Integer, "sqlite"), ForeignKey("invoices.id"), nullable=True)
    payment_date = Column(DATE, nullable=False, default=func.current_date())
    amount = Column(NUMERIC(14, 2), nullable=False)
    payment_method = Column(TEXT, nullable=False, default='M-Pesa')
    reference_code = Column(TEXT, nullable=True)
    notes = Column(TEXT, nullable=True)
    posted_by = Column(BigInteger().with_variant(Integer, "sqlite"), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    customer = relationship("Customer", foreign_keys=[customer_id])
    invoice = relationship("Invoice", foreign_keys=[invoice_id])
