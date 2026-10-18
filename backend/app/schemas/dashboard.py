from pydantic import BaseModel
from typing import List, Optional
from decimal import Decimal
from datetime import date

class ChartDataPoint(BaseModel):
    day: str # Mon, Tue, etc.
    cash_collected: Decimal
    arrears_credit: Decimal

class DashboardStatsResponse(BaseModel):
    total_sales_revenue: Decimal
    total_sales_growth: str = "+12.4% vs last month"
    total_pending_arrears: Decimal
    low_stock_alerts_count: int
    active_customers_count: int
    currency: str = "KSh"
    weekly_chart: List[ChartDataPoint] = []
    store_contact: str = "+254 719 220 452"
    store_location: str = "Meru - Maua Highway"

class TopProductItem(BaseModel):
    name: str
    price_formatted: str
    sales_amount: Decimal
    qty_sold: Decimal

class ReportsSummaryResponse(BaseModel):
    gross_sales_value: Decimal
    cash_received: Decimal
    uncollected_debts: Decimal
    total_customer_accounts: int
    currency: str = "KSh"
    top_selling_products: List[TopProductItem] = []
