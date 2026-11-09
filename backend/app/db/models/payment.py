from sqlalchemy import Column, Integer, BigInteger, TEXT, DATE, DateTime, ForeignKey, NUMERIC
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.base import Base


class Payment(Base):
    __tablename__ = "payments"

    id = Column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    customer_id = Column(BigInteger().with_variant(Integer, "sqlite"), ForeignKey("customers.id"), nullable=False)
    invoice_id = Column(BigInteger().with_variant(Integer, "sqlite"), ForeignKey("invoices.id"), nullable=False)
    payment_date = Column(DATE, nullable=False)
    amount = Column(NUMERIC(14, 2), nullable=False)
    payment_method = Column(TEXT, nullable=False, default="M-Pesa")
    payment_type = Column(TEXT, nullable=False, default="direct_sale")
    reference_code = Column(TEXT, nullable=True)
    notes = Column(TEXT, nullable=True)
    receipt_no = Column(TEXT, nullable=False, unique=True)
    posted_by = Column(BigInteger().with_variant(Integer, "sqlite"), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    customer = relationship("Customer", back_populates="payments")
    invoice = relationship("Invoice", back_populates="payments")
