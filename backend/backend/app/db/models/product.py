from sqlalchemy import Column, BIGINT, TEXT, TIMESTAMPTZ, CheckConstraint, Index, NUMERIC
from sqlalchemy.sql import func
from app.db.base import Base

class Product(Base):
    __tablename__ = "products"
    __table_args__ = (
        CheckConstraint("category IN ('feeds', 'mineral_salts', 'supplements', 'other')", name="chk_product_category"),
        CheckConstraint("base_unit IN ('kg', 'bag', 'piece', 'litre')", name="chk_product_base_unit"),
        CheckConstraint("price_per_unit >= 0", name="chk_product_price_per_unit"),
        CheckConstraint("price_per_pack >= 0", name="chk_product_price_per_pack"),
        CheckConstraint("status IN ('active', 'inactive')", name="chk_product_status"),
    )
    id = Column(BIGINT, primary_key=True, autoincrement=True)
    name = Column(TEXT, nullable=False)
    category = Column(TEXT, nullable=False)
    base_unit = Column(TEXT, nullable=False)
    pack_size = Column(NUMERIC(10,3))
    price_per_unit = Column(NUMERIC(14,2), nullable=False)
    price_per_pack = Column(NUMERIC(14,2))
    qty_on_hand = Column(NUMERIC(12,3), nullable=False, default=0)
    low_stock_level = Column(NUMERIC(12,3), nullable=False, default=0)
    status = Column(TEXT, nullable=False, default='active')
    created_at = Column(TIMESTAMPTZ, nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMPTZ, nullable=False, server_default=func.now(), onupdate=func.now())
