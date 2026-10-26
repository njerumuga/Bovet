import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { LoginView } from './features/auth/LoginView';
import { DashboardView } from './features/dashboard/DashboardView';
import { SalesView } from './features/invoices/SalesView';
import { CustomersView } from './features/customers/CustomersView';
import { InventoryView } from './features/products/InventoryView';
import { ReportsView } from './features/reports/ReportsView';
import { AccountSettingsView } from './features/auth/AccountSettingsView';
import { NewSaleModal } from './features/invoices/NewSaleModal';
import { InvoicePreviewModal } from './features/invoices/InvoicePreviewModal';
import { PaymentModal } from './features/invoices/PaymentModal';
import { AddCustomerModal } from './features/customers/AddCustomerModal';
import { CustomerHistoryModal } from './features/customers/CustomerHistoryModal';
import { AddProductModal } from './features/products/AddProductModal';
import { RestockModal } from './features/products/RestockModal';
import { ReceiptModal } from './features/invoices/ReceiptModal';
import { Customer, Invoice, Product, DashboardStats, ReportSummary, User, Receipt } from './types';
import { apiFetch } from './api/client';

const IDLE_TIMEOUT_MS = 5 * 60 * 60 * 1000;

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Data states
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    total_sales_revenue: 148500,
    total_sales_growth: '+12.4% vs last month',
    total_pending_arrears: 42500,
    low_stock_alerts_count: 2,
    active_customers_count: 4,
    currency: 'KSh',
  });
  const [reportSummary, setReportSummary] = useState<ReportSummary>({
    gross_sales_value: 148500,
    cash_received: 106000,
    uncollected_debts: 42500,
    total_customer_accounts: 4,
    top_selling_products: [
      { name: 'CAN 26% Nitrogen Fertilizer (50kg)', price_formatted: 'KSh 4,500.00', sales_amount: 54000, qty_sold: 12 },
      { name: 'DAP Planting Fertilizer (50kg)', price_formatted: 'KSh 6,200.00', sales_amount: 49600, qty_sold: 8 },
      { name: 'Thunder Insecticide (1 Litre)', price_formatted: 'KSh 3,200.00', sales_amount: 19200, qty_sold: 6 },
    ],
  });

  // Modals state
  const [isNewSaleOpen, setIsNewSaleOpen] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [restockProduct, setRestockProduct] = useState<Product | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  const loadData = async () => {
    try {
      const [prods, custs, invs, dStats, rep] = await Promise.all([
        apiFetch<Product[]>('/products').catch(() => [
          { id: 1, name: 'CAN 26% Nitrogen Fertilizer', category: 'Fertilizers', base_unit: 'kg', pack_size: 50, price_per_unit: 90, price_per_pack: 4500, qty_on_hand: 85, low_stock_level: 10, status: 'active' },
          { id: 2, name: 'DAP Planting Fertilizer', category: 'Fertilizers', base_unit: 'kg', pack_size: 50, price_per_unit: 124, price_per_pack: 6200, qty_on_hand: 40, low_stock_level: 15, status: 'active' },
          { id: 3, name: 'Thunder Insecticide (1L)', category: 'Insecticides', base_unit: 'L', pack_size: 1, price_per_unit: 3200, price_per_pack: 3200, qty_on_hand: 4, low_stock_level: 8, status: 'active' },
          { id: 4, name: 'Belt Expert 480 SC (500ml)', category: 'Insecticides', base_unit: 'bottle', pack_size: 0.5, price_per_unit: 2850, price_per_pack: 2850, qty_on_hand: 12, low_stock_level: 5, status: 'active' },
          { id: 5, name: 'Panar 691 Hybrid Seed Maize (2kg)', category: 'Seeds', base_unit: 'packet', pack_size: 2, price_per_unit: 620, price_per_pack: 620, qty_on_hand: 3, low_stock_level: 10, status: 'active' },
        ]),
        apiFetch<Customer[]>('/customers').catch(() => [
          { id: 1, name: 'Samuel Mutuma', phone: '+254 712 345 678', location: 'Maua, Meru', total_purchases: 68500, current_arrears_balance: 14500, credit_status: 'IN ARREARS', status: 'active' },
          { id: 2, name: 'Christine Kaari', phone: '+254 722 987 654', location: 'Timau Farm', total_purchases: 45000, current_arrears_balance: 0, credit_status: 'CLEAR', status: 'active' },
          { id: 3, name: 'David Muchena', phone: '+254 733 112 233', location: 'Nkubu', total_purchases: 92000, current_arrears_balance: 28000, credit_status: 'IN ARREARS', status: 'active' },
          { id: 4, name: 'Francis Kobia', phone: '+254 701 554 433', location: 'Kianjai', total_purchases: 32000, current_arrears_balance: 0, credit_status: 'CLEAR', status: 'active' },
        ]),
        apiFetch<Invoice[]>('/invoices').catch(() => [
          { id: 1, invoice_no: 'INV-2026-001', customer_id: 1, customer_name: 'Samuel Mutuma', customer_phone: '+254 712 345 678', customer_location: 'Maua, Meru', invoice_date: '2026-10-04', subtotal: 45000, discount: 0, total: 45000, amount_paid: 30500, balance: 14500, status: 'ARREARS', lines: [{ product_id: 1, product_name: 'CAN 26% Nitrogen Fertilizer (50kg)', sell_unit: 'bag', qty_entered: 10, unit_price: 4500, line_amount: 45000 }] },
          { id: 2, invoice_no: 'INV-2026-002', customer_id: 2, customer_name: 'Christine Kaari', customer_phone: '+254 722 987 654', customer_location: 'Timau Farm', invoice_date: '2026-10-04', subtotal: 31000, discount: 0, total: 31000, amount_paid: 31000, balance: 0, status: 'PAID', lines: [{ product_id: 2, product_name: 'DAP Planting Fertilizer (50kg)', sell_unit: 'bag', qty_entered: 5, unit_price: 6200, line_amount: 31000 }] },
          { id: 3, invoice_no: 'INV-2026-003', customer_id: 3, customer_name: 'David Muchena', customer_phone: '+254 733 112 233', customer_location: 'Nkubu', invoice_date: '2026-10-05', subtotal: 56000, discount: 0, total: 56000, amount_paid: 28000, balance: 28000, status: 'ARREARS', lines: [{ product_id: 1, product_name: 'CAN 26% Nitrogen Fertilizer (50kg)', sell_unit: 'bag', qty_entered: 8, unit_price: 4500, line_amount: 36000 }] },
          { id: 4, invoice_no: 'INV-2026-004', customer_id: 4, customer_name: 'Francis Kobia', customer_phone: '+254 701 554 433', customer_location: 'Kianjai', invoice_date: '2026-10-05', subtotal: 16500, discount: 0, total: 16500, amount_paid: 16500, balance: 0, status: 'PAID', lines: [{ product_id: 3, product_name: 'Thunder Insecticide (1L)', sell_unit: 'can', qty_entered: 5, unit_price: 3300, line_amount: 16500 }] },
        ]),
        apiFetch<DashboardStats>('/dashboard/stats').catch(() => null),
        apiFetch<ReportSummary>('/reports/summary').catch(() => null),
      ]);

      if (prods) setProducts(prods);
      if (custs) setCustomers(custs);
      if (invs) setInvoices(invs);
      if (dStats) setStats(dStats);
      if (rep) setReportSummary(rep);
    } catch (e) {
      console.warn('Error loading data:', e);
    }
  };

  useEffect(() => {
    const handleAuthExpired = () => setCurrentUser(null);
    window.addEventListener('bovet:auth-expired', handleAuthExpired);
    return () => window.removeEventListener('bovet:auth-expired', handleAuthExpired);
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    let timeoutId: number;
    const expireSession = () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setCurrentUser(null);
    };
    const resetIdleTimer = () => {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(expireSession, IDLE_TIMEOUT_MS);
    };
    const activityEvents: (keyof WindowEventMap)[] = [
      'mousedown',
      'mousemove',
      'keydown',
      'scroll',
      'touchstart',
      'click',
    ];

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, resetIdleTimer);
    });
    resetIdleTimer();

    return () => {
      window.clearTimeout(timeoutId);
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, resetIdleTimer);
      });
    };
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;

    const refreshToken = async () => {
      try {
        const response = await apiFetch<{ access_token: string }>('/auth/refresh', { method: 'POST' });
        localStorage.setItem('token', response.access_token);
      } catch {
        // The normal API 401 handler remains responsible for ending an invalid session.
      }
    };

    const refreshId = window.setInterval(refreshToken, 4 * 60 * 60 * 1000);
    return () => window.clearInterval(refreshId);
  }, [currentUser]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    let cancelled = false;
    apiFetch<User>('/auth/me')
      .then((user) => {
        if (cancelled) return;
        setCurrentUser(user);
        localStorage.setItem('user', JSON.stringify(user));
        loadData();
      })
      .catch(() => {
        if (cancelled) return;
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setCurrentUser(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    loadData();
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setCurrentUser(null);
  };

  if (!currentUser) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  const getHeaderMeta = () => {
    switch (currentTab) {
      case 'dashboard':
        return { title: 'Executive Overview Dashboard', subtitle: 'Live sales metrics, customer debts & inventory status' };
      case 'sales':
        return { title: 'Sales Ledger & Official Invoices', subtitle: 'Track issued farmer receipts, settlements and payments' };
      case 'customers':
        return { title: 'Customer Directory & Credit Arrears', subtitle: 'Farmer profiles, outstanding credit & purchase accounts' };
      case 'inventory':
        return { title: 'Store Inventory & Stock Levels', subtitle: 'SKU catalogue, reorder warnings and supplier restocks' };
      case 'reports':
        return { title: 'Audited Financial Reports', subtitle: 'Periodic sales performance, debt aging and product ranking' };
      case 'account':
        return { title: 'Account Settings', subtitle: 'Manage your profile and password security' };
      default:
        return { title: 'Bovet Agri Ventures', subtitle: 'Enterprise Agricultural System' };
    }
  };

  const headerMeta = getHeaderMeta();

  return (
    <div className="h-screen flex overflow-hidden bg-[#F1F5F9]">
      {/* Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      <ReceiptModal receipt={receipt} onClose={() => setReceipt(null)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          title={headerMeta.title}
          subtitle={headerMeta.subtitle}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onOpenNewSale={() => setIsNewSaleOpen(true)}
          onRefresh={loadData}
        />

        <main className="flex-1 overflow-y-auto p-8">
          {currentTab !== 'dashboard' && (
            <button
              type="button"
              onClick={() => setCurrentTab('dashboard')}
              className="no-print mb-5 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </button>
          )}
          {currentTab === 'dashboard' && (
            <DashboardView
              stats={stats}
              invoices={invoices}
              products={products}
              customers={customers}
              onPreviewInvoice={(inv) => setPreviewInvoice(inv)}
              onNavigate={setCurrentTab}
            />
          )}

          {currentTab === 'sales' && (
            <SalesView
              invoices={invoices}
              onOpenNewSale={() => setIsNewSaleOpen(true)}
              onPreviewInvoice={(inv) => setPreviewInvoice(inv)}
              onOpenPayment={(inv) => setPaymentInvoice(inv)}
              onViewReceipt={setReceipt}
              onInvoiceUpdated={loadData}
            />
          )}

          {currentTab === 'customers' && (
            <CustomersView
              customers={customers}
              onOpenAddCustomer={() => setIsAddCustomerOpen(true)}
              onViewHistory={(c) => setHistoryCustomer(c)}
              onCustomerUpdated={loadData}
            />
          )}

          {currentTab === 'inventory' && (
            <InventoryView
              products={products}
              onOpenAddProduct={() => setIsAddProductOpen(true)}
              onOpenRestock={(p) => setRestockProduct(p)}
              onProductUpdated={loadData}
            />
          )}

          {currentTab === 'reports' && (
            <ReportsView
              summary={reportSummary}
              invoices={invoices}
              customers={customers}
              products={products}
            />
          )}

          {currentTab === 'account' && (
            <AccountSettingsView currentUser={currentUser} />
          )}
        </main>
      </div>

      {/* Modals */}
      <NewSaleModal
        isOpen={isNewSaleOpen}
        onClose={() => setIsNewSaleOpen(false)}
        customers={customers}
        products={products}
        onSaleCreated={loadData}
      />

      <InvoicePreviewModal
        invoice={previewInvoice}
        onClose={() => setPreviewInvoice(null)}
      />

      <PaymentModal
        invoice={paymentInvoice}
        onClose={() => setPaymentInvoice(null)}
        onPaymentSuccess={(generatedReceipt) => {
          loadData();
          if (generatedReceipt) setReceipt(generatedReceipt);
        }}
      />

      <AddCustomerModal
        isOpen={isAddCustomerOpen}
        onClose={() => setIsAddCustomerOpen(false)}
        onCustomerAdded={loadData}
        existingCustomers={customers}
      />

      <CustomerHistoryModal
        customer={historyCustomer}
        invoices={invoices}
        onClose={() => setHistoryCustomer(null)}
      />

      <AddProductModal
        isOpen={isAddProductOpen}
        onClose={() => setIsAddProductOpen(false)}
        onProductAdded={loadData}
      />

      <RestockModal
        product={restockProduct}
        onClose={() => setRestockProduct(null)}
        onRestocked={loadData}
      />
    </div>
  );
};
