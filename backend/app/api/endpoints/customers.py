from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import List, Optional
from datetime import date
from decimal import Decimal
import re
from difflib import SequenceMatcher
from app.db.session import get_db
from app.db.models.customer import Customer
from app.db.models.invoice import Invoice
from app.db.models.payment import Payment
from app.db.models.audit import AuditLog
from app.db.models.user import User
from app.schemas.customer import CustomerCreate, CustomerUpdate, CustomerResponse
from app.schemas.invoice import PaymentRequest, ReceiptResponse
from app.api.endpoints.invoices import validate_payment_reference, generate_receipt_no
from app.api.deps import get_current_user

router = APIRouter(prefix="/customers", tags=["customers"])

def normalize_phone(phone: str) -> str:
    return re.sub(r"\D", "", phone or "")

def normalize_name(name: str) -> str:
    return re.sub(r"[^a-z0-9]", "", (name or "").lower())

def find_similar_customers(db: Session, name: str, exclude_id: Optional[int] = None) -> List[Customer]:
    normalized = normalize_name(name)
    if len(normalized) < 4:
        return []
    customers = db.query(Customer).filter(Customer.status == "active").all()
    return [
        customer for customer in customers
        if customer.id != exclude_id
           and SequenceMatcher(None, normalized, normalize_name(customer.name)).ratio() >= 0.86
    ]

def enrich_customer(customer: Customer, db: Session) -> CustomerResponse:
    # Compute total purchases (sum of non-void invoice totals)
    total_purchases = db.query(func.coalesce(func.sum(Invoice.total), 0)) \
        .filter(Invoice.customer_id == customer.id, Invoice.status != 'void') \
        .scalar()

    # Compute current arrears balance (sum of non-void invoice balance + opening balance)
    current_arrears = db.query(func.coalesce(func.sum(Invoice.balance), 0)) \
        .filter(Invoice.customer_id == customer.id, Invoice.status != 'void') \
        .scalar()

    opening_balance = Decimal(str(getattr(customer, "opening_balance", 0) or 0))
    total_purchases_dec = Decimal(str(total_purchases))
    current_arrears_dec = Decimal(str(current_arrears)) + opening_balance
    credit_status = "IN ARREARS" if current_arrears_dec > 0 else "CLEAR"

    return CustomerResponse(
        id=customer.id,
        name=customer.name,
        phone=customer.phone,
        location=customer.location,
        email=customer.email,
        notes=customer.notes,
        status=customer.status,
        opening_balance=opening_balance,
        total_purchases=total_purchases_dec,
        current_arrears_balance=current_arrears_dec,
        credit_status=credit_status,
        created_at=customer.created_at,
        updated_at=customer.updated_at
    )

@router.get("", response_model=List[CustomerResponse])
def list_customers(
        search: Optional[str] = Query(None),
        status: Optional[str] = Query(None),
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    query = db.query(Customer)
    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Customer.name.ilike(s),
                Customer.phone.ilike(s),
                Customer.location.ilike(s),
                Customer.email.ilike(s)
            )
        )
    if status:
        query = query.filter(Customer.status == status)

    customers = query.order_by(Customer.name.asc()).all()
    return [enrich_customer(c, db) for c in customers]

@router.post("", response_model=CustomerResponse)
def create_customer(
        req: CustomerCreate,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    normalized_phone = normalize_phone(req.phone)
    if len(normalized_phone) < 9:
        raise HTTPException(status_code=422, detail="Enter a valid phone number.")
    existing = next(
        (customer for customer in db.query(Customer).all()
         if normalize_phone(customer.phone) == normalized_phone),
        None,
    )
    if existing:
        raise HTTPException(status_code=400, detail="Customer with this phone number already exists.")

    customer = Customer(
        name=req.name.strip(),
        phone=req.phone.strip(),
        location=req.location.strip(),
        email=req.email.strip() if req.email else None,
        notes=req.notes,
        status=req.status or "active",
        opening_balance=req.opening_balance or Decimal("0.00"),
        created_by=current_user.id
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return enrich_customer(customer, db)

@router.post("/{id}/payment", response_model=ReceiptResponse)
def post_customer_payment(
        id: int,
        req: PaymentRequest,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    customer = db.query(Customer).filter(Customer.id == id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    payment_amt = req.amount
    if payment_amt <= 0:
        raise HTTPException(status_code=400, detail="Payment amount must be greater than zero.")

    opening_bal = Decimal(str(getattr(customer, "opening_balance", 0) or 0))
    unpaid_invoices = db.query(Invoice).filter(
        Invoice.customer_id == id,
        Invoice.status != "void",
        Invoice.balance > 0
    ).order_by(Invoice.invoice_date.asc(), Invoice.id.asc()).all()

    total_arrears = opening_bal + sum((Decimal(str(inv.balance)) for inv in unpaid_invoices), Decimal("0.00"))
    if total_arrears <= 0:
        raise HTTPException(status_code=400, detail="Customer has no outstanding arrears.")
    if payment_amt > total_arrears:
        raise HTTPException(status_code=400, detail="Payment exceeds the customer's total arrears balance.")

    payment_reference = validate_payment_reference(req.payment_method, req.reference_code, db)

    remaining_to_apply = payment_amt
    primary_payment: Optional[Payment] = None
    settled_ref_label = "Opening Book Arrears"

    # 1. Deduct from opening book arrears first
    if opening_bal > 0 and remaining_to_apply > 0:
        opening_applied = min(remaining_to_apply, opening_bal)
        customer.opening_balance = max(Decimal("0.00"), opening_bal - opening_applied)
        remaining_to_apply -= opening_applied

        pmt = Payment(
            receipt_no=generate_receipt_no(db),
            customer_id=customer.id,
            invoice_id=None,
            payment_date=date.today(),
            amount=opening_applied,
            payment_method=req.payment_method or "M-Pesa",
            payment_type="credit_collection",
            reference_code=payment_reference,
            notes=req.notes or "Opening book arrears settlement",
            posted_by=current_user.id
        )
        db.add(pmt)
        db.flush()
        primary_payment = pmt

    # 2. Apply any remaining payment amount to oldest unpaid invoices
    for inv in unpaid_invoices:
        if remaining_to_apply <= 0:
            break
        inv_applied = min(remaining_to_apply, Decimal(str(inv.balance)))
        inv.amount_paid += inv_applied
        inv.balance = max(Decimal("0.00"), Decimal(str(inv.total)) - Decimal(str(inv.amount_paid)))
        inv.status = "paid" if inv.balance <= 0 else "arrears"
        remaining_to_apply -= inv_applied

        pmt = Payment(
            receipt_no=generate_receipt_no(db),
            customer_id=customer.id,
            invoice_id=inv.id,
            payment_date=date.today(),
            amount=inv_applied,
            payment_method=req.payment_method or "M-Pesa",
            payment_type="credit_collection",
            reference_code=payment_reference,
            notes=req.notes or f"Settlement for {inv.invoice_no}",
            posted_by=current_user.id
        )
        db.add(pmt)
        db.flush()
        if primary_payment is None:
            primary_payment = pmt
            settled_ref_label = inv.invoice_no

    new_total_arrears = max(Decimal("0.00"), total_arrears - payment_amt)

    db.add(AuditLog(
        user_id=current_user.id,
        action="post_customer_payment",
        entity="payment",
        entity_id=str(primary_payment.id),
        after_data={
            "customer": customer.name,
            "receipt_no": primary_payment.receipt_no,
            "amount": float(payment_amt),
            "method": primary_payment.payment_method,
            "balance_remaining": float(new_total_arrears)
        }
    ))

    db.commit()
    db.refresh(primary_payment)

    return ReceiptResponse(
        id=primary_payment.id,
        receipt_no=primary_payment.receipt_no,
        invoice_id=primary_payment.invoice_id,
        invoice_no=settled_ref_label,
        customer_id=customer.id,
        customer_name=customer.name,
        customer_phone=customer.phone,
        customer_location=customer.location,
        payment_date=primary_payment.payment_date,
        amount=payment_amt,
        payment_method=primary_payment.payment_method,
        payment_type="credit_collection",
        reference_code=primary_payment.reference_code,
        invoice_total=total_arrears,
        remaining_balance=new_total_arrears,
        notes=primary_payment.notes,
        created_at=primary_payment.created_at
    )

@router.get("/{id}")
def get_customer(
        id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    customer = db.query(Customer).filter(Customer.id == id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    c_resp = enrich_customer(customer, db)
    invoices = db.query(Invoice).filter(Invoice.customer_id == id).order_by(Invoice.invoice_date.desc()).all()
    payments = db.query(Payment).filter(Payment.customer_id == id).order_by(Payment.payment_date.desc(), Payment.id.desc()).all()

    return {
        "customer": c_resp,
        "invoices": [
            {
                "id": inv.id,
                "invoice_no": inv.invoice_no,
                "invoice_date": inv.invoice_date,
                "total": float(inv.total),
                "amount_paid": float(inv.amount_paid),
                "balance": float(inv.balance),
                "is_credit": inv.is_credit,
                "status": inv.status.upper() if inv.status != 'arrears' else 'ARREARS'
            }
            for inv in invoices
        ],
        "payments": [
            {
                "id": payment.id,
                "receipt_no": payment.receipt_no,
                "invoice_id": payment.invoice_id,
                "invoice_no": payment.invoice.invoice_no if payment.invoice else None,
                "payment_date": payment.payment_date,
                "amount": float(payment.amount),
                "payment_method": payment.payment_method,
                "payment_type": payment.payment_type,
                "reference_code": payment.reference_code,
                "notes": payment.notes,
            }
            for payment in payments
        ],
    }

@router.put("/{id}", response_model=CustomerResponse)
def update_customer(
        id: int,
        req: CustomerUpdate,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    customer = db.query(Customer).filter(Customer.id == id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    previous_status = customer.status
    if req.name is not None:
        customer.name = req.name.strip()
    if req.phone is not None:
        normalized_phone = normalize_phone(req.phone)
        if len(normalized_phone) < 9:
            raise HTTPException(status_code=422, detail="Enter a valid phone number.")
        duplicate = next(
            (other for other in db.query(Customer).all()
             if other.id != customer.id and normalize_phone(other.phone) == normalized_phone),
            None,
        )
        if duplicate:
            raise HTTPException(status_code=400, detail="Customer with this phone number already exists.")
        customer.phone = req.phone.strip()
    if req.location is not None:
        customer.location = req.location.strip()
    if req.email is not None:
        customer.email = req.email.strip() if req.email else None
    if req.notes is not None:
        customer.notes = req.notes
    if req.status is not None:
        customer.status = req.status
    if req.opening_balance is not None:
        customer.opening_balance = req.opening_balance

    if customer.status != previous_status:
        db.add(AuditLog(
            user_id=current_user.id,
            action="change_customer_status",
            entity="customer",
            entity_id=str(customer.id),
            before_data={"status": previous_status},
            after_data={"status": customer.status},
        ))
    db.commit()
    db.refresh(customer)
    return enrich_customer(customer, db)

@router.delete("/{id}")
def delete_customer(
        id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    customer = db.query(Customer).filter(Customer.id == id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    if customer.status == "inactive":
        return {"message": "Customer is already inactive", "status": customer.status}

    previous_status = customer.status
    customer.status = "inactive"
    db.add(AuditLog(
        user_id=current_user.id,
        action="deactivate_customer",
        entity="customer",
        entity_id=str(customer.id),
        before_data={"status": previous_status},
        after_data={"status": customer.status},
    ))
    db.commit()
    return {"message": "Customer marked as inactive", "status": customer.status}