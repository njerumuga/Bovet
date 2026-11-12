from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from decimal import Decimal
from typing import List
from app.db.session import get_db
from app.db.models.invoice import Invoice
from app.db.models.customer import Customer
from app.db.models.product import Product
from app.db.models.payment import Payment
from app.db.models.user import User
from app.schemas.dashboard import DashboardStatsResponse, ChartDataPoint
from app.schemas.invoice import InvoiceResponse
from app.api.endpoints.invoices import format_invoice
from app.api.deps import get_current_user

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

@router.get("/stats", response_model=DashboardStatsResponse)
def get_dashboard_stats(
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    # Total sales revenue (sum of non-void invoice totals)
    total_sales = db.query(func.coalesce(func.sum(Invoice.total), 0)) \
        .filter(Invoice.status != 'void') \
        .scalar()

    # Total pending arrears (sum of non-void invoice balance + active customer opening balances)
    pending_arrears = db.query(func.coalesce(func.sum(Invoice.balance), 0)) \
        .filter(Invoice.status != 'void') \
        .scalar()
    customer_opening_balances = db.query(func.coalesce(func.sum(Customer.opening_balance), 0)) \
        .filter(Customer.status == 'active') \
        .scalar()
    pending_arrears = Decimal(str(pending_arrears)) + Decimal(str(customer_opening_balances))

    total_cash_received = db.query(func.coalesce(func.sum(Payment.amount), 0)).filter(
        Payment.payment_type == "direct_sale",
        Payment.invoice.has(Invoice.status != "void"),
        ).scalar()
    credit_payments_received = db.query(func.coalesce(func.sum(Payment.amount), 0)).filter(
        Payment.payment_type == "credit_collection",
        Payment.invoice.has(Invoice.status != "void"),
        ).scalar()

    # Low stock alerts count
    low_stock_count = db.query(Product) \
        .filter(Product.status == 'active', Product.qty_on_hand <= Product.low_stock_level) \
        .count()

    # Active customers count
    active_customers = db.query(Customer) \
        .filter(Customer.status == 'active') \
        .count()

    # Weekly chart data points
    chart_data = [
        ChartDataPoint(day="Mon", cash_collected=Decimal("12000.00"), arrears_credit=Decimal("1800.00")),
        ChartDataPoint(day="Tue", cash_collected=Decimal("17000.00"), arrears_credit=Decimal("3500.00")),
        ChartDataPoint(day="Wed", cash_collected=Decimal("14000.00"), arrears_credit=Decimal("1200.00")),
        ChartDataPoint(day="Thu", cash_collected=Decimal("19500.00"), arrears_credit=Decimal("4500.00")),
        ChartDataPoint(day="Fri", cash_collected=Decimal("16000.00"), arrears_credit=Decimal("2400.00")),
        ChartDataPoint(day="Sat", cash_collected=Decimal("24500.00"), arrears_credit=Decimal("1500.00")),
        ChartDataPoint(day="Sun", cash_collected=Decimal("13000.00"), arrears_credit=Decimal("0.00")),
    ]

    return DashboardStatsResponse(
        total_sales_revenue=Decimal(str(total_sales)),
        total_cash_received=Decimal(str(total_cash_received)),
        credit_payments_received=Decimal(str(credit_payments_received)),
        total_sales_growth="+12.4% vs last month",
        total_pending_arrears=Decimal(str(pending_arrears)),
        low_stock_alerts_count=low_stock_count,
        active_customers_count=active_customers,
        currency="KSh",
        weekly_chart=chart_data,
        store_contact="+254 719 220 452",
        store_location="Meru - Maua Highway"
    )

@router.get("/recent-sales", response_model=List[InvoiceResponse])
def get_recent_sales(
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    invoices = db.query(Invoice).order_by(Invoice.invoice_date.desc(), Invoice.id.desc()).limit(10).all()
    return [format_invoice(inv) for inv in invoices]