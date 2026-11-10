from sqlalchemy import Column, Integer, BigInteger, TEXT, DateTime, CheckConstraint, Index, NUMERIC
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship, synonym
from app.db.base import Base

class Product(Base):
    __tablename__ = "products"
    __table_args__ = (
        CheckConstraint("status IN ('active', 'inactive')", name="chk_product_status"),
    )
    id = Column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    name = Column(TEXT, nullable=False)
    category = Column(TEXT, nullable=False)
    base_unit = Column(TEXT, nullable=False)
    pack_size = Column(NUMERIC(10,3), nullable=True)
    price_per_unit = Column(NUMERIC(14,2), nullable=False)
    selling_price = synonym("price_per_unit")
    cost_price = Column(NUMERIC(14,2), nullable=False, default=0)
    price_per_pack = Column(NUMERIC(14,2), nullable=True)
    qty_on_hand = Column(NUMERIC(12,3), nullable=False, default=0)
    low_stock_level = Column(NUMERIC(12,3), nullable=False, default=0)
    status = Column(TEXT, nullable=False, default='active')
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    stock_movements = relationship("StockMovement", back_populates="product", cascade="all, delete-orphan")
