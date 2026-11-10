from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from decimal import Decimal

class ProductBase(BaseModel):
    name: str
    category: str
    base_unit: str
    pack_size: Optional[Decimal] = None
    price_per_unit: Optional[Decimal] = None
    selling_price: Optional[Decimal] = None
    cost_price: Decimal = Decimal("0.00")
    price_per_pack: Optional[Decimal] = None
    qty_on_hand: Optional[Decimal] = Decimal("0")
    low_stock_level: Optional[Decimal] = Decimal("5")
    status: Optional[str] = "active"

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    base_unit: Optional[str] = None
    pack_size: Optional[Decimal] = None
    price_per_unit: Optional[Decimal] = None
    selling_price: Optional[Decimal] = None
    cost_price: Optional[Decimal] = None
    price_per_pack: Optional[Decimal] = None
    qty_on_hand: Optional[Decimal] = None
    low_stock_level: Optional[Decimal] = None
    status: Optional[str] = None

class RestockRequest(BaseModel):
    qty: Decimal
    cost_price: Decimal
    reason: Optional[str] = "Restock shipment"

class ProductResponse(ProductBase):
    id: int
    selling_price: Decimal
    stock_status: str = "IN STOCK" # IN STOCK, LOW STOCK, OUT OF STOCK
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
