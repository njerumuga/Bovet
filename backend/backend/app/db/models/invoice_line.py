from sqlalchemy import Column, BIGINT, TEXT, ForeignKey, NUMERIC, CheckConstraint, Index
from app.db.base import Base

class InvoiceLine(Base):
    __tablename__ = "invoice_lines"
    __table_args__ = (
        CheckConstraint("sell_unit IN ('base', 'pack')", name="chk_invoice_line_sell_unit"),
        CheckConstraint("qty_entered > 0", name="chk_invoice_line_qty_entered"),
        CheckConstraint("base_qty > 0", name="chk_invoice_line_base_qty"),
        CheckConstraint("unit_price >= 0", name="chk_invoice_line_unit_price"),
        Index("ix_lines_invoice", "invoice_id"),
    )
    id = Column(BIGINT, primary_key=True, autoincrement=True)
    invoice_id = Column(BIGINT, ForeignKey("invoices.id"), nullable=False)
    product_id = Column(BIGINT, ForeignKey("products.id"), nullable=False)
    description = Column(TEXT, nullable=False)
    sell_unit = Column(TEXT, nullable=False)
    qty_entered = Column(NUMERIC(12,3), nullable=False)
    base_qty = Column(NUMERIC(12,3), nullable=False)
    unit_price = Column(NUMERIC(14,2), nullable=False)
    list_price = Column(NUMERIC(14,2), nullable=False)
    line_amount = Column(NUMERIC(14,2), nullable=False)
