from sqlalchemy import Column, Integer, BigInteger, TEXT, DateTime, ForeignKey, NUMERIC, CheckConstraint, Index
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.base import Base

class StockMovement(Base):
    __tablename__ = "stock_movements"
    __table_args__ = (
        CheckConstraint("type IN ('opening', 'stock_in', 'sale', 'adjustment', 'void')", name="chk_stock_movement_type"),
        Index("ix_stock_mov_product", "product_id", "created_at"),
    )
    id = Column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    product_id = Column(BigInteger().with_variant(Integer, "sqlite"), ForeignKey("products.id"), nullable=False)
    type = Column(TEXT, nullable=False)
    qty_change = Column(NUMERIC(12,3), nullable=False)
    qty_after = Column(NUMERIC(12,3), nullable=False)
    reason = Column(TEXT, nullable=True)
    invoice_id = Column(BigInteger().with_variant(Integer, "sqlite"), ForeignKey("invoices.id"), nullable=True)
    created_by = Column(BigInteger().with_variant(Integer, "sqlite"), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    product = relationship("Product", back_populates="stock_movements")
