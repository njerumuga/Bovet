from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from decimal import Decimal

class CustomerBase(BaseModel):
    name: str
    phone: str
    location: str
    email: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = "active"
    opening_balance: Optional[Decimal] = Decimal("0.00")

class CustomerCreate(CustomerBase):
    pass

class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    email: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None
    opening_balance: Optional[Decimal] = None

class CustomerResponse(CustomerBase):
    id: int
    total_purchases: Decimal = Decimal("0.00")
    current_arrears_balance: Decimal = Decimal("0.00")
    credit_status: str = "CLEAR"  # CLEAR, IN ARREARS
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True