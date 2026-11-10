from sqlalchemy import Column, Integer, BigInteger, TEXT, ForeignKey, NUMERIC, Index
from sqlalchemy.orm import relationship
from app.db.base import Base

class InvoiceLine(Base):
    __tablename__ = "invoice_lines"
    __table_args__ = (
        Index("ix_lines_invoice", "invoice_id"),
    )
    id = Column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    invoice_id = Column(BigInteger().with_variant(Integer, "sqlite"), ForeignKey("invoices.id"), nullable=False)
    product_id = Column(BigInteger().with_variant(Integer, "sqlite"), ForeignKey("products.id"), nullable=False)
    description = Column(TEXT, nullable=False)
    sell_unit = Column(TEXT, nullable=False, default='base')
    qty_entered = Column(NUMERIC(12,3), nullable=False)
    base_qty = Column(NUMERIC(12,3), nullable=False)
    unit_price = Column(NUMERIC(14,2), nullable=False)
    cost_price = Column(NUMERIC(14,2), nullable=False, default=0)
    list_price = Column(NUMERIC(14,2), nullable=False)
    line_amount = Column(NUMERIC(14,2), nullable=False)

    invoice = relationship("Invoice", back_populates="lines")
    product = relationship("Product")
