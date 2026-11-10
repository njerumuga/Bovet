from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime
from decimal import Decimal

class InvoiceLineCreate(BaseModel):
    product_id: int
    sell_unit: Optional[str] = "base"
    qty_entered: Decimal
    unit_price: Decimal
    description: Optional[str] = None

class InvoiceLineResponse(BaseModel):
    id: int
    product_id: int
    product_name: Optional[str] = None
    sell_unit: str
    qty_entered: Decimal
    base_qty: Decimal
    unit_price: Decimal
    cost_price: Decimal
    list_price: Decimal
    line_amount: Decimal

    class Config:
        from_attributes = True

class InvoiceCreate(BaseModel):
    customer_id: int
    invoice_date: Optional[date] = None
    lines: List[InvoiceLineCreate]
    discount: Optional[Decimal] = Decimal("0.00")
    amount_paid: Optional[Decimal] = Decimal("0.00")
    payment_method: Optional[str] = "M-Pesa"
    reference_code: Optional[str] = None
    notes: Optional[str] = None

class PaymentRequest(BaseModel):
    amount: Decimal
    payment_method: Optional[str] = "M-Pesa"
    reference_code: Optional[str] = None
    notes: Optional[str] = None

class ReceiptResponse(BaseModel):
    id: int
    receipt_no: str
    invoice_id: Optional[int] = None
    invoice_no: Optional[str] = None
    customer_id: int
    customer_name: str
    customer_phone: Optional[str] = None
    customer_location: Optional[str] = None
    payment_date: date
    amount: Decimal
    payment_method: str
    payment_type: str = "direct_sale"
    reference_code: Optional[str] = None
    invoice_total: Optional[Decimal] = None
    remaining_balance: Decimal
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class InvoiceResponse(BaseModel):
    id: int
    invoice_no: str
    kind: str
    customer_id: int
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_location: Optional[str] = None
    invoice_date: date
    subtotal: Decimal
    discount: Decimal
    total: Decimal
    amount_paid: Decimal
    direct_amount_paid: Decimal = Decimal("0.00")
    balance: Decimal
    is_credit: bool = False
    status: str # PAID, ARREARS, PARTIALLY_PAID, VOID
    void_reason: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    lines: List[InvoiceLineResponse] = []
    latest_receipt: Optional[ReceiptResponse] = None

    class Config:
        from_attributes = True
