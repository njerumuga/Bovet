from sqlalchemy import Column, BIGINT, TEXT, TIMESTAMPTZ, ForeignKey, NUMERIC, CheckConstraint, Index
from sqlalchemy.sql import func
from app.db.base import Base

class StockMovement(Base):
    __tablename__ = "stock_movements"
    __table_args__ = (
        CheckConstraint("type IN ('opening', 'stock_in', 'sale', 'adjustment', 'void')", name="chk_stock_movement_type"),
        Index("ix_stock_mov_product", "product_id", "created_at"),
    )
    id = Column(BIGINT, primary_key=True, autoincrement=True)
    product_id = Column(BIGINT, ForeignKey("products.id"), nullable=False)
    type = Column(TEXT, nullable=False)
    qty_change = Column(NUMERIC(12,3), nullable=False)
    qty_after = Column(NUMERIC(12,3), nullable=False)
    reason = Column(TEXT)
    invoice_id = Column(BIGINT, ForeignKey("invoices.id"))
    created_by = Column(BIGINT, ForeignKey("users.id"), nullable=False)
    created_at = Column(TIMESTAMPTZ, nullable=False, server_default=func.now())
