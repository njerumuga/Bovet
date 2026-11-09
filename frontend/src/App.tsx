import React, { useState, useEffect } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
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
import { AppNotification, Customer, CustomerPayment, Invoice, Product, DashboardStats, ReportSummary, User, Receipt } from './types';
import { apiFetch } from './api/client';
import { formatKsh } from './lib/utils';

const IDLE_TIMEOUT_MS = 5 * 60 * 60 * 1000;

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authSlow, setAuthSlow] = useState(false);
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Data states
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [historyPayments, setHistoryPayments] = useState<CustomerPayment[]>([]);
  const [recentReceipts, setRecentReceipts] = useState<Receipt[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    total_sales_revenue: 0,
    total_sales_growth: 'No data yet',
    total_pending_arrears: 0,
    low_stock_alerts_count: 0,
    active_customers_count: 0,
    currency: 'KSh',
  });
  const [reportSummary, setReportSummary] = useState<ReportSummary>({
    gross_sales_value: 0,
    cash_received: 0,
    direct_cash_sales: 0,
    credit_collections: 0,
    uncollected_debts: 0,
    total_customer_accounts: 0,
    top_selling_products: [],
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
      const [prods, custs, invs, dStats, rep, receipts] = await Promise.all([
        apiFetch<Product[]>('/products'),
        apiFetch<Customer[]>('/customers'),
        apiFetch<Invoice[]>('/invoices'),
        apiFetch<DashboardStats>('/dashboard/stats'),
        apiFetch<ReportSummary>('/reports/summary'),
        apiFetch<Receipt[]>('/invoices/receipts/all'),
      ]);

      if (prods) setProducts(prods);
      if (custs) setCustomers(custs);
      if (invs) setInvoices(invs);
      if (dStats) setStats(dStats);
      if (rep) setReportSummary(rep);
      setRecentReceipts(receipts);
    } catch (e) {
      console.warn('Error loading data:', e);
    }
  };

  const notifications: AppNotification[] = [
    ...recentReceipts.slice(0, 5).map((receipt) => ({
      id: `payment-${receipt.id}`,
      title: 'Payment recorded',
      message: `${receipt.receipt_no} received ${formatKsh((receipt as Receipt & { amount?: number }).amount ?? receipt.amount_received)} for ${receipt.invoice_no || 'an invoice'}.`,
      tone: 'success' as const,
      createdAt: receipt.payment_date,
    })),
    ...customers.filter((customer) => Number(customer.current_arrears_balance) > 0).slice(0, 5).map((customer) => ({
      id: `arrears-${customer.id}`,
      title: 'Outstanding arrears',
      message: `${customer.name} has ${formatKsh(customer.current_arrears_balance)} outstanding.`,
      tone: 'warning' as const,
    })),
    ...products.filter((product) => product.stock_status === 'low' || Number(product.qty_on_hand) <= Number(product.low_stock_level)).slice(0, 5).map((product) => ({
      id: `stock-${product.id}`,
      title: 'Low stock alert',
      message: `${product.name} has ${product.qty_on_hand} ${product.base_unit} remaining.`,
      tone: 'warning' as const,
    })),
  ];

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
    if (!token) {
      setAuthLoading(false);
      return;
    }

    let cancelled = false;
    const slowNoticeId = window.setTimeout(() => setAuthSlow(true), 8000);
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
      })
      .finally(() => {
        window.clearTimeout(slowNoticeId);
        if (!cancelled) setAuthLoading(false);
      });

    return () => {
      cancelled = true;
      window.clearTimeout(slowNoticeId);
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

  if (authLoading) {
    return (
      <div
        className="fixed inset-0 z-50 bg-[#0B1528] flex items-center justify-center p-4"
        role="status"
        aria-live="polite"
      >
        <div className="flex flex-col items-center text-center">
          <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" aria-hidden="true" />
          <p className="mt-4 text-sm font-bold text-white">
            {authSlow ? 'The service is taking longer than usual...' : 'Refreshing your session...'}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {authSlow ? 'The backend may be waking up. You can retry the connection.' : 'Please wait while we securely restore your session.'}
          </p>
          {authSlow && (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-600"
            >
              Retry connection
            </button>
          )}
        </div>
      </div>
    );
  }

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
          notifications={notifications}
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
              globalSearch={searchTerm}
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
              globalSearch={searchTerm}
            />
          )}

          {currentTab === 'customers' && (
            <CustomersView
              customers={customers}
              onOpenAddCustomer={() => setIsAddCustomerOpen(true)}
              onViewHistory={async (c) => {
                setHistoryCustomer(c);
                try {
                  const receipts = await apiFetch<Receipt[]>('/invoices/receipts/all');
                  setHistoryPayments(
                    receipts
                      .filter((receipt) => receipt.customer_id === c.id)
                      .map((receipt) => ({
                        id: receipt.id || 0,
                        receipt_no: receipt.receipt_no,
                        invoice_id: receipt.invoice_id || 0,
                        invoice_no: receipt.invoice_no,
                        payment_date: receipt.payment_date,
                        amount: Number(
                          (receipt as Receipt & { amount?: number }).amount
                            ?? receipt.amount_received
                            ?? 0
                        ),
                        payment_method: receipt.payment_method,
                        reference_code: receipt.reference_code,
                        notes: receipt.notes,
                      }))
                  );
                } catch {
                  setHistoryPayments([]);
                }
              }}
              onCustomerUpdated={loadData}
              globalSearch={searchTerm}
            />
          )}

          {currentTab === 'inventory' && (
            <InventoryView
              products={products}
              onOpenAddProduct={() => setIsAddProductOpen(true)}
              onOpenRestock={(p) => setRestockProduct(p)}
              onProductUpdated={loadData}
              globalSearch={searchTerm}
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
        payments={historyPayments}
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
