from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, desc
from typing import List, Optional
from datetime import date, datetime
from decimal import Decimal
import re
from io import BytesIO

try:
    from weasyprint import HTML
except (ImportError, OSError):
    HTML = None

from app.db.session import get_db
from app.db.models.invoice import Invoice
from app.db.models.invoice_line import InvoiceLine
from app.db.models.product import Product
from app.db.models.customer import Customer
from app.db.models.stock_movement import StockMovement
from app.db.models.payment import Payment
from app.db.models.audit import AuditLog
from app.db.models.user import User
from app.schemas.invoice import InvoiceCreate, InvoiceResponse, InvoiceLineResponse, PaymentRequest, ReceiptResponse
from app.api.deps import get_current_user

router = APIRouter(prefix="/invoices", tags=["invoices"])

def normalize_payment_reference(value: Optional[str]) -> str:
    return re.sub(r"[^a-z0-9]", "", (value or "").strip().lower())

def validate_payment_reference(
    payment_method: Optional[str],
    reference_code: Optional[str],
    db: Session,
) -> Optional[str]:
    method = (payment_method or "M-Pesa").strip().lower()
    reference = (reference_code or "").strip()
    if method != "cash" and not reference:
        raise HTTPException(
            status_code=400,
            detail=f"A payment reference code is required for {payment_method or 'this payment method'}.",
        )
    if not reference:
        return None

    normalized_reference = normalize_payment_reference(reference)
    if not normalized_reference:
        raise HTTPException(status_code=400, detail="Payment reference code cannot be empty.")

    existing_payments = db.query(Payment.reference_code).filter(
        Payment.reference_code.isnot(None)
    ).all()
    if any(normalize_payment_reference(row[0]) == normalized_reference for row in existing_payments):
        raise HTTPException(
            status_code=400,
            detail=f"Payment reference code '{reference}' is already used by another payment.",
        )
    return reference

def format_receipt(pmt: Payment) -> ReceiptResponse:
    inv = pmt.invoice
    cust = pmt.customer
    inv_total = inv.total if inv else pmt.amount
    rem_bal = inv.balance if inv else Decimal("0.00")
    
    return ReceiptResponse(
        id=pmt.id,
        receipt_no=pmt.receipt_no,
        invoice_id=pmt.invoice_id,
        invoice_no=inv.invoice_no if inv else None,
        customer_id=pmt.customer_id,
        customer_name=cust.name if cust else "Valued Farmer",
        customer_phone=cust.phone if cust else "",
        customer_location=cust.location if cust else "",
        payment_date=pmt.payment_date,
        amount=pmt.amount,
        payment_method=pmt.payment_method,
        payment_type=pmt.payment_type,
        reference_code=pmt.reference_code,
        invoice_total=inv_total,
        remaining_balance=rem_bal,
        notes=pmt.notes,
        created_at=pmt.created_at
    )

def format_invoice(inv: Invoice, db: Optional[Session] = None) -> InvoiceResponse:
    lines_resp = [
        InvoiceLineResponse(
            id=line.id,
            product_id=line.product_id,
            product_name=line.product.name if line.product else line.description,
            sell_unit=line.sell_unit,
            qty_entered=line.qty_entered,
            base_qty=line.base_qty,
            unit_price=line.unit_price,
            list_price=line.list_price,
            line_amount=line.line_amount
        )
        for line in inv.lines
    ]

    status_str = inv.status.upper()
    if inv.void_reason or status_str in ["VOID", "REVERSED"]:
        status_str = "REVERSED"
    elif status_str in ["UNPAID", "PARTIALLY_PAID", "ARREARS"]:
        status_str = "ARREARS" if inv.balance > 0 else "PAID"

    latest_receipt = None
    direct_amount_paid = Decimal("0.00")
    if db:
        direct_amount_paid = db.query(func.coalesce(func.sum(Payment.amount), 0)).filter(
            Payment.invoice_id == inv.id,
            Payment.payment_type == "direct_sale",
        ).scalar() or Decimal("0.00")
        latest_payment = db.query(Payment).filter(Payment.invoice_id == inv.id).order_by(Payment.id.desc()).first()
        if latest_payment:
            latest_receipt = format_receipt(latest_payment)

    return InvoiceResponse(
        id=inv.id,
        invoice_no=inv.invoice_no,
        kind=inv.kind,
        customer_id=inv.customer_id,
        customer_name=inv.customer.name if inv.customer else "Unknown Customer",
        customer_phone=inv.customer.phone if inv.customer else "",
        customer_location=inv.customer.location if inv.customer else "",
        invoice_date=inv.invoice_date,
        subtotal=inv.subtotal,
        discount=inv.discount,
        total=inv.total,
        amount_paid=inv.amount_paid,
        direct_amount_paid=Decimal(str(direct_amount_paid)),
        balance=inv.balance,
        is_credit=inv.is_credit,
        status=status_str,
        void_reason=inv.void_reason,
        notes=inv.notes,
        created_at=inv.created_at,
        lines=lines_resp,
        latest_receipt=latest_receipt
    )

def generate_invoice_no(db: Session) -> str:
    numbers = [
        int(match.group(1))
        for invoice_no, in db.query(Invoice.invoice_no).all()
        if invoice_no and (match := re.fullmatch(r"INV-(\d+)", invoice_no))
    ]
    next_num = max(numbers, default=606) + 1
    while db.query(Invoice.id).filter(Invoice.invoice_no == f"INV-{next_num}").first():
        next_num += 1
    return f"INV-{next_num}"

def generate_receipt_no(db: Session) -> str:
    numbers = [
        int(match.group(1))
        for receipt_no, in db.query(Payment.receipt_no).all()
        if receipt_no and (match := re.fullmatch(r"RCT-(\d+)", receipt_no))
    ]
    next_num = max(numbers, default=606) + 1
    while db.query(Payment.id).filter(Payment.receipt_no == f"RCT-{next_num}").first():
        next_num += 1
    return f"RCT-{next_num}"


def _require_pdf_renderer():
    if HTML is None:
        raise HTTPException(
            status_code=503,
            detail="PDF generation is unavailable because the system libraries for WeasyPrint are not installed."
        )
    return HTML


def render_invoice_pdf(invoice: Invoice) -> bytes:
    rows_html = "".join(
        f"<tr><td>{line.qty_entered}</td><td>{line.description}</td><td>{line.unit_price}</td><td>{line.line_amount}</td></tr>"
        for line in invoice.lines
    )
    html_content = f"""
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body {{ font-family: Arial, sans-serif; color: #0f172a; margin: 32px; }}
          .title {{ font-size: 28px; font-weight: bold; margin-bottom: 8px; }}
          .meta {{ font-size: 12px; margin-bottom: 16px; }}
          table {{ width: 100%; border-collapse: collapse; margin-top: 20px; }}
          th, td {{ border: 1px solid #cbd5e1; padding: 8px; font-size: 12px; text-align: left; }}
          th {{ background: #e2e8f0; }}
          .totals {{ margin-top: 20px; width: 260px; margin-left: auto; }}
          .totals-row {{ display: flex; justify-content: space-between; padding: 6px 0; font-size: 12px; }}
        </style>
      </head>
      <body>
        <div class="title">Invoice {invoice.invoice_no}</div>
        <div class="meta">Customer: {invoice.customer.name if invoice.customer else 'Unknown'}<br />Date: {invoice.invoice_date}</div>
        <table>
          <thead>
            <tr>
              <th>Qty</th>
              <th>Item</th>
              <th>Unit Price</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>{rows_html}</tbody>
        </table>
        <div class="totals">
          <div class="totals-row"><span>Subtotal</span><span>{invoice.subtotal}</span></div>
          <div class="totals-row"><span>Discount</span><span>{invoice.discount}</span></div>
          <div class="totals-row"><strong>Total</strong><strong>{invoice.total}</strong></div>
          <div class="totals-row"><span>Paid</span><span>{invoice.amount_paid}</span></div>
          <div class="totals-row"><span>Balance</span><span>{invoice.balance}</span></div>
        </div>
      </body>
    </html>
    """
    return _require_pdf_renderer()(string=html_content).write_pdf()


@router.get("/receipts/{receipt_id}/pdf")
def get_receipt_pdf(
    receipt_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    receipt = db.query(Payment).filter(Payment.id == receipt_id).first()
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")

    html_content = f"""
    <html>
      <head><meta charset="utf-8" /><style>
        body {{ font-family: Arial, sans-serif; margin: 32px; color: #0f172a; }}
        h1 {{ font-size: 26px; margin-bottom: 12px; }}
        .row {{ font-size: 12px; margin: 6px 0; }}
        .box {{ border: 1px solid #cbd5e1; padding: 12px; margin-top: 18px; }}
      </style></head>
      <body>
        <h1>Receipt {receipt.receipt_no}</h1>
        <div class="box">
          <div class="row">Customer: {receipt.customer.name if receipt.customer else 'Unknown'}</div>
          <div class="row">Date: {receipt.payment_date}</div>
          <div class="row">Amount: {receipt.amount}</div>
          <div class="row">Method: {receipt.payment_method}</div>
          <div class="row">Reference: {receipt.reference_code or 'N/A'}</div>
        </div>
      </body>
    </html>
    """
    pdf = _require_pdf_renderer()(string=html_content).write_pdf()
    return Response(content=pdf, media_type="application/pdf", headers={"Content-Disposition": f'inline; filename="{receipt.receipt_no}.pdf"'})


@router.get("", response_model=List[InvoiceResponse])
def list_invoices(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    customer_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Invoice).join(Customer)
    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Invoice.invoice_no.ilike(s),
                Customer.name.ilike(s),
                Customer.phone.ilike(s)
            )
        )
    if status and status != "All Payment Statuses" and status != "All":
        stat = status.lower()
        if stat == "paid":
            query = query.filter(Invoice.status == "paid")
        elif stat in ["arrears", "unpaid", "in arrears"]:
            query = query.filter(Invoice.balance > 0, Invoice.status != "void")
        elif stat == "void":
            query = query.filter(Invoice.status == "void")
    if customer_id:
        query = query.filter(Invoice.customer_id == customer_id)

    invoices = query.order_by(Invoice.invoice_date.desc(), Invoice.id.desc()).all()
    return [format_invoice(inv, db) for inv in invoices]

@router.post("", response_model=InvoiceResponse)
def create_invoice(
    req: InvoiceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    customer = db.query(Customer).filter(Customer.id == req.customer_id).first()
    if not customer or customer.status != "active":
        raise HTTPException(status_code=404, detail="Customer not found")

    if not req.lines:
        raise HTTPException(status_code=400, detail="Invoice must contain at least one product line.")

    payment_reference = None
    if req.amount_paid and req.amount_paid > 0:
        payment_reference = validate_payment_reference(req.payment_method, req.reference_code, db)

    subtotal = Decimal("0.00")
    line_objects = []

    for item in req.lines:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if not product or product.status != "active":
            raise HTTPException(status_code=404, detail=f"Product ID {item.product_id} not found")

        qty = item.qty_entered
        if qty <= 0:
            raise HTTPException(status_code=400, detail="Line quantity must be greater than zero.")
        if product.qty_on_hand < qty:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock for {product.name}. Available {product.qty_on_hand}, requested {qty}.",
            )

        line_amount = (qty * item.unit_price).quantize(Decimal("0.01"))
        subtotal += line_amount

        line_obj = InvoiceLine(
            product_id=product.id,
            description=item.description or product.name,
            sell_unit=item.sell_unit or product.base_unit,
            qty_entered=qty,
            base_qty=qty,
            unit_price=item.unit_price,
            list_price=product.price_per_unit,
            line_amount=line_amount
        )
        line_objects.append((line_obj, product, qty))

    discount = req.discount or Decimal("0.00")
    total = max(Decimal("0.00"), subtotal - discount)
    amount_paid = req.amount_paid or Decimal("0.00")
    balance = max(Decimal("0.00"), total - amount_paid)

    status_val = "paid" if balance <= 0 else "arrears"

    invoice = Invoice(
        invoice_no=generate_invoice_no(db),
        kind="sale",
        customer_id=customer.id,
        invoice_date=req.invoice_date or date.today(),
        subtotal=subtotal,
        discount=discount,
        total=total,
        amount_paid=amount_paid,
        balance=balance,
        is_credit=balance > 0,
        status=status_val,
        notes=req.notes,
        created_by=current_user.id
    )
    db.add(invoice)
    db.commit()
    db.refresh(invoice)

    # Attach lines and deduct stock
    for line_obj, product, qty in line_objects:
        line_obj.invoice_id = invoice.id
        db.add(line_obj)

        # Update product stock
        product.qty_on_hand -= qty
        mov = StockMovement(
            product_id=product.id,
            type="sale",
            qty_change=-qty,
            qty_after=product.qty_on_hand,
            reason=f"Sale {invoice.invoice_no}",
            invoice_id=invoice.id,
            created_by=current_user.id
        )
        db.add(mov)

    # Record Payment and Receipt if immediate payment was made
    if amount_paid > 0:
        pmt = Payment(
            receipt_no=generate_receipt_no(db),
            customer_id=customer.id,
            invoice_id=invoice.id,
            payment_date=invoice.invoice_date,
            amount=amount_paid,
            payment_method=req.payment_method or "M-Pesa",
            payment_type="direct_sale",
            reference_code=payment_reference,
            notes=f"Immediate settlement for {invoice.invoice_no}",
            posted_by=current_user.id
        )
        db.add(pmt)

    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        action="create_invoice",
        entity="invoice",
        entity_id=str(invoice.id),
        after_data={
            "invoice_no": invoice.invoice_no,
            "customer": customer.name,
            "total": float(invoice.total),
            "amount_paid": float(amount_paid),
            "balance": float(balance)
        }
    )
    db.add(audit)

    db.commit()
    db.refresh(invoice)
    return format_invoice(invoice, db)

@router.get("/{id}", response_model=InvoiceResponse)
def get_invoice(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    inv = db.query(Invoice).filter(Invoice.id == id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return format_invoice(inv, db)


@router.get("/{id}/pdf")
def get_invoice_pdf(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    inv = db.query(Invoice).filter(Invoice.id == id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")

    pdf = render_invoice_pdf(inv)
    return Response(content=pdf, media_type="application/pdf", headers={"Content-Disposition": f'inline; filename="{inv.invoice_no}.pdf"'})


@router.post("/{id}/payment", response_model=InvoiceResponse)
def post_payment(
    id: int,
    req: PaymentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    inv = db.query(Invoice).filter(Invoice.id == id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")

    if inv.status == "void":
        raise HTTPException(status_code=400, detail="Cannot post payment to a void invoice.")

    payment_amt = req.amount
    if payment_amt <= 0:
        raise HTTPException(status_code=400, detail="Payment amount must be greater than zero.")
    if payment_amt > inv.balance:
        raise HTTPException(status_code=400, detail="Payment exceeds the remaining invoice balance.")

    payment_reference = validate_payment_reference(req.payment_method, req.reference_code, db)

    inv.amount_paid += payment_amt
    inv.balance = max(Decimal("0.00"), inv.total - inv.amount_paid)

    if inv.balance <= 0:
        inv.status = "paid"
    else:
        inv.status = "arrears"

    # Create Payment & Receipt record
    pmt = Payment(
        receipt_no=generate_receipt_no(db),
        customer_id=inv.customer_id,
        invoice_id=inv.id,
        payment_date=date.today(),
        amount=payment_amt,
        payment_method=req.payment_method or "M-Pesa",
        payment_type="credit_collection",
        reference_code=payment_reference,
        notes=req.notes or f"Settlement for {inv.invoice_no}",
        posted_by=current_user.id
    )
    db.add(pmt)

    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        action="post_payment",
        entity="payment",
        entity_id=str(pmt.id),
        after_data={
            "invoice_no": inv.invoice_no,
            "receipt_no": pmt.receipt_no,
            "amount": float(payment_amt),
            "method": pmt.payment_method,
            "balance_remaining": float(inv.balance)
        }
    )
    db.add(audit)

    db.commit()
    db.refresh(inv)
    return format_invoice(inv, db)

@router.post("/{id}/void", response_model=InvoiceResponse)
def void_invoice(
    id: int,
    reason: Optional[str] = "Customer return / cancelled",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    inv = db.query(Invoice).filter(Invoice.id == id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")

    if inv.status == "void":
        raise HTTPException(status_code=400, detail="Invoice is already void.")

    inv.status = "void"
    inv.void_reason = reason
    inv.voided_by = current_user.id
    inv.voided_at = datetime.utcnow()
    inv.balance = Decimal("0.00")

    # Restore inventory
    for line in inv.lines:
        product = db.query(Product).filter(Product.id == line.product_id).first()
        if product:
            product.qty_on_hand += line.base_qty
            mov = StockMovement(
                product_id=product.id,
                type="void",
                qty_change=line.base_qty,
                qty_after=product.qty_on_hand,
                reason=f"Void invoice {inv.invoice_no}: {reason}",
                invoice_id=inv.id,
                created_by=current_user.id
            )
            db.add(mov)

    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        action="void_invoice",
        entity="invoice",
        entity_id=str(inv.id),
        after_data={
            "invoice_no": inv.invoice_no,
            "reason": reason
        }
    )
    db.add(audit)

    db.commit()
    db.refresh(inv)
    return format_invoice(inv, db)

@router.get("/receipts/all", response_model=List[ReceiptResponse])
def list_receipts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    payments = db.query(Payment).order_by(Payment.id.desc()).all()
    return [format_receipt(p) for p in payments]
