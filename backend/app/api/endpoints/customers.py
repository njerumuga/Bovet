from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import List, Optional
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
    total_purchases = db.query(func.coalesce(func.sum(Invoice.total), 0))\
        .filter(Invoice.customer_id == customer.id, Invoice.status != 'void')\
        .scalar()
    
    # Compute current arrears balance (sum of non-void invoice balance)
    current_arrears = db.query(func.coalesce(func.sum(Invoice.balance), 0))\
        .filter(Invoice.customer_id == customer.id, Invoice.status != 'void')\
        .scalar()
    
    total_purchases_dec = Decimal(str(total_purchases))
    current_arrears_dec = Decimal(str(current_arrears))
    credit_status = "IN ARREARS" if current_arrears_dec > 0 else "CLEAR"

    return CustomerResponse(
        id=customer.id,
        name=customer.name,
        phone=customer.phone,
        location=customer.location,
        email=customer.email,
        notes=customer.notes,
        status=customer.status,
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
        created_by=current_user.id
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return enrich_customer(customer, db)

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
