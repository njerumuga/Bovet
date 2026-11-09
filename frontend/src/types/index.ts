export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  security_2fa?: boolean;
}

export interface Customer {
  id: number;
  name: string;
  phone: string;
  location: string;
  email?: string;
  notes?: string;
  status: string;
  total_purchases: number | string;
  current_arrears_balance: number | string;
  credit_status: string;
  created_at?: string;
  updated_at?: string;
}

export interface CustomerPayment {
  id: number;
  receipt_no: string;
  invoice_id: number;
  invoice_no?: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  reference_code?: string;
  notes?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  tone: 'info' | 'warning' | 'success';
  createdAt?: string;
}

export interface Product {
  id: number;
  name: string;
  category: string;
  base_unit: string;
  pack_size?: number | string | null;
  price_per_unit: number | string;
  price_per_pack?: number | string | null;
  qty_on_hand: number | string;
  low_stock_level: number | string;
  status: string;
  stock_status?: string;
}

export interface InvoiceLine {
  id?: number;
  product_id: number;
  product_name?: string;
  sell_unit: string;
  qty_entered: number;
  base_qty?: number;
  unit_price: number;
  list_price?: number;
  line_amount: number;
}

export interface Receipt {
  id?: number;
  receipt_no: string;
  invoice_id?: number;
  invoice_no?: string;
  customer_id?: number;
  customer_name: string;
  customer_phone?: string;
  customer_location?: string;
  payment_date: string;
  amount_received: number;
  payment_method: string;
  reference_code?: string;
  invoice_total?: number;
  remaining_balance: number;
  notes?: string;
  created_at?: string;
}

export interface Invoice {
  id: number;
  invoice_no: string;
  kind?: string;
  customer_id: number;
  customer_name?: string;
  customer_phone?: string;
  customer_location?: string;
  invoice_date: string;
  subtotal: number | string;
  discount: number | string;
  total: number | string;
  amount_paid: number | string;
  direct_amount_paid?: number | string;
  balance: number | string;
  is_credit?: boolean;
  status: string;
  void_reason?: string;
  notes?: string;
  lines?: InvoiceLine[];
  latest_receipt?: Receipt;
  created_at?: string;
}

export interface DashboardStats {
  total_sales_revenue: number | string;
  total_sales_growth: string;
  total_pending_arrears: number | string;
  low_stock_alerts_count: number;
  active_customers_count: number;
  currency: string;
}

export interface ReportSummary {
  gross_sales_value: number | string;
  cash_received: number | string;
  direct_cash_sales: number | string;
  credit_collections: number | string;
  uncollected_debts: number | string;
  total_customer_accounts: number;
  top_selling_products?: {
    name: string;
    price_formatted: string;
    sales_amount: number | string;
    qty_sold: number | string;
  }[];
}

export interface CashBreakdownItem {
  payment_date: string;
  cash: number | string;
  bank_transfer: number | string;
  mpesa: number | string;
  total: number | string;
}

export interface CashBreakdown {
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  start_date: string;
  end_date: string;
  items: CashBreakdownItem[];
  transactions: {
    payment_date: string;
    receipt_no: string;
    customer_name: string;
    amount: number | string;
    payment_method: string;
    reference_code?: string;
  }[];
  total: number | string;
}

export interface CreditCollections {
  start_date: string;
  end_date: string;
  total: number | string;
  items: {
    payment_date: string;
    receipt_no: string;
    customer_name: string;
    amount: number | string;
    payment_method: string;
    reference_code?: string;
  }[];
}
