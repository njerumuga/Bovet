from sqlalchemy import Column, BIGINT, TEXT, DATE, TIMESTAMPTZ, ForeignKey, NUMERIC, CheckConstraint, Index
from sqlalchemy.sql import func
from app.db.base import Base

class Invoice(Base):
    __tablename__ = "invoices"
    __table_args__ = (
        CheckConstraint("kind IN ('sale', 'opening_balance')", name="chk_invoice_kind"),
        CheckConstraint("status IN ('unpaid', 'partially_paid', 'paid', 'void')", name="chk_invoice_status"),
        CheckConstraint("total = subtotal - discount AND balance = total - amount_paid", name="ck_inv_math"),
        CheckConstraint("amount_paid >= 0 AND balance >= 0", name="ck_inv_bounds"),
        Index("ix_inv_customer", "customer_id", "invoice_date"),
        Index("ix_inv_status_date", "status", "invoice_date"),
    )
    id = Column(BIGINT, primary_key=True, autoincrement=True)
    invoice_no = Column(TEXT, nullable=False, unique=True)
    kind = Column(TEXT, nullable=False, default='sale')
    customer_id = Column(BIGINT, ForeignKey("customers.id"), nullable=False)
    invoice_date = Column(DATE, nullable=False)
    subtotal = Column(NUMERIC(14,2), nullable=False)
    discount = Column(NUMERIC(14,2), nullable=False, default=0)
    total = Column(NUMERIC(14,2), nullable=False)
    amount_paid = Column(NUMERIC(14,2), nullable=False, default=0)
    balance = Column(NUMERIC(14,2), nullable=False)
    status = Column(TEXT, nullable=False)
    void_reason = Column(TEXT)
    voided_by = Column(BIGINT, ForeignKey("users.id"))
    voided_at = Column(TIMESTAMPTZ)
    notes = Column(TEXT)
    created_by = Column(BIGINT, ForeignKey("users.id"), nullable=False)
    created_at = Column(TIMESTAMPTZ, nullable=False, server_default=func.now())
