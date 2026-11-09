import React, { useEffect, useState } from 'react';
import { Plus, Search, DollarSign, Eye, CreditCard, Ban, FileDown, Receipt as ReceiptIcon, X } from 'lucide-react';
import { CashBreakdown, CreditCollections, Invoice, Receipt } from '../../types';
import { formatKsh } from '../../lib/utils';
import { apiFetch } from '../../api/client';

interface SalesViewProps {
  invoices: Invoice[];
  onOpenNewSale: () => void;
  onPreviewInvoice: (invoice: Invoice) => void;
  onOpenPayment: (invoice: Invoice) => void;
  onViewReceipt?: (receipt: Receipt) => void;
  onInvoiceUpdated?: () => void;
  globalSearch?: string;
}

export const SalesView: React.FC<SalesViewProps> = ({
  invoices,
  onOpenNewSale,
  onPreviewInvoice,
  onOpenPayment,
  onViewReceipt,
  onInvoiceUpdated,
  globalSearch = '',
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'arrears' | 'void'>('all');
  const [voidingId, setVoidingId] = useState<number | null>(null);
  const [cashBreakdown, setCashBreakdown] = useState<CashBreakdown | null>(null);
  const [cashPeriod, setCashPeriod] = useState<CashBreakdown['period']>('daily');
  const [cashLoading, setCashLoading] = useState(false);
  const [creditCollections, setCreditCollections] = useState<CreditCollections | null>(null);
  const [creditLoading, setCreditLoading] = useState(false);
  const [arrearsStatementOpen, setArrearsStatementOpen] = useState(false);

  useEffect(() => {
    apiFetch<CreditCollections>('/reports/credit-collections')
      .then(setCreditCollections)
      .catch(() => setCreditCollections(null));
  }, []);

  const openCashBreakdown = async (period = cashPeriod) => {
    setCashLoading(true);
    try {
      const data = await apiFetch<CashBreakdown>(`/reports/cash-breakdown?period=${period}`);
      setCashBreakdown(data);
    } finally {
      setCashLoading(false);
    }
  };

  const openCreditCollections = async () => {
    setCreditLoading(true);
    try {
      setCreditCollections(await apiFetch<CreditCollections>('/reports/credit-collections'));
    } finally {
      setCreditLoading(false);
    }
  };

  const filteredInvoices = invoices.filter((inv) => {
    const q = (search || globalSearch).toLowerCase();
    const matchesSearch =
      inv.invoice_no.toLowerCase().includes(q) ||
      (inv.customer_name && inv.customer_name.toLowerCase().includes(q));
    const isReversed = Boolean(inv.void_reason) || inv.status === 'VOID' || inv.status === 'REVERSED';
    const isPaid = (inv.status === 'PAID' || Number(inv.balance) === 0) && !isReversed;

    let matchesStatus = true;
    if (statusFilter === 'paid') matchesStatus = isPaid;
    if (statusFilter === 'arrears') matchesStatus = !isPaid && !isReversed;
    if (statusFilter === 'void') matchesStatus = isReversed;

    return matchesSearch && matchesStatus;
  });

  const handleVoidInvoice = async (inv: Invoice) => {
    if (!window.confirm(`Do you want to void invoice ${inv.invoice_no}? This will reverse its stock and retain the audit history.`)) return;
    const reason = window.prompt(`Enter reason for cancelling/voiding invoice ${inv.invoice_no}:`, "Customer return / cancellation");
    if (!reason) return;

    try {
      await apiFetch(`/invoices/${inv.id}/void?reason=${encodeURIComponent(reason)}`, {
        method: 'POST'
      });
      onInvoiceUpdated?.();
    } catch (err: any) {
      alert(err.message || 'Failed to void invoice');
      onInvoiceUpdated?.();
    }
  };

  const handleExportCSV = () => {
    const headers = ["Invoice No", "Customer", "Date", "Subtotal", "Discount", "Total Amount (KES)", "Paid (KES)", "Balance (KES)", "Status"];
    const rows = filteredInvoices.map(i => [
      i.invoice_no,
      `"${i.customer_name || ''}"`,
      i.invoice_date,
      i.subtotal,
      i.discount,
      i.total,
      i.amount_paid,
      i.balance,
      i.status
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Bovet_Agri_Sales_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const activeInvoices = invoices.filter(i => i.status !== 'VOID' && i.status !== 'REVERSED');
  const totalSales = activeInvoices.reduce((acc, i) => acc + Number(i.total || 0), 0);
  const totalCollected = activeInvoices.reduce((acc, i) => acc + Number(i.direct_amount_paid ?? (!i.is_credit ? i.amount_paid : 0)), 0);
  const totalArrears = activeInvoices.reduce((acc, i) => acc + Number(i.balance || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Banner Summaries */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase">Total Sales</div>
            <div className="text-xl font-black text-slate-900 mt-1">{formatKsh(totalSales)}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-sm">
            {activeInvoices.length}
          </div>
        </div>
        <button type="button" onClick={() => openCashBreakdown()} className="text-left bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between hover:border-emerald-300 hover:shadow-md transition">
          <div>
            <div className="text-xs font-bold text-emerald-600 uppercase">Total Cash Received</div>
            <div className="text-xl font-black text-emerald-600 mt-1">{formatKsh(totalCollected)}</div>
            <span className="text-[10px] font-bold text-emerald-700">Cash + electronic sales</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold text-sm">
            <DollarSign className="w-5 h-5" />
          </div>
        </button>
        <button type="button" onClick={openCreditCollections} className="text-left bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between hover:border-amber-300 hover:shadow-md transition">
          <div>
            <div className="text-xs font-bold text-amber-600 uppercase">Credit Payments Received</div>
            <div className="text-xl font-black text-amber-600 mt-1">{formatKsh(creditCollections?.total ?? 0)}</div>
            <span className="text-[10px] font-bold text-amber-700">View payer statement</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <CreditCard className="w-5 h-5" />
          </div>
        </button>
        <button type="button" onClick={() => setArrearsStatementOpen(true)} className="text-left bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between hover:border-amber-300 hover:shadow-md transition">
          <div>
            <div className="text-xs font-bold text-amber-600 uppercase">Uncollected Arrears</div>
            <div className="text-xl font-black text-amber-600 mt-1">{formatKsh(totalArrears)}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 font-bold text-sm">
            <CreditCard className="w-5 h-5" />
          </div>
        </button>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {/* Table Filter Controls */}
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3 flex-1">
            <div className="relative flex-1 max-w-sm">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter invoices by number or customer..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
              />
            </div>
            <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition ${statusFilter === 'all' ? 'bg-white text-slate-900 shadow-sm font-black' : 'hover:text-slate-900'}`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter('paid')}
                className={`px-3 py-1.5 rounded-lg transition ${statusFilter === 'paid' ? 'bg-white text-emerald-700 shadow-sm font-black' : 'hover:text-slate-900'}`}
              >
                Paid
              </button>
              <button
                onClick={() => setStatusFilter('arrears')}
                className={`px-3 py-1.5 rounded-lg transition ${statusFilter === 'arrears' ? 'bg-white text-amber-700 shadow-sm font-black' : 'hover:text-slate-900'}`}
              >
                Arrears
              </button>
              <button
                onClick={() => setStatusFilter('void')}
                className={`px-3 py-1.5 rounded-lg transition ${statusFilter === 'void' ? 'bg-white text-rose-700 shadow-sm font-black' : 'hover:text-slate-900'}`}
              >
                Voided
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center space-x-1.5 px-3.5 py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              <FileDown className="w-4 h-4 text-slate-500" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={onOpenNewSale}
              className="flex items-center justify-center space-x-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-500/25 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Sale</span>
            </button>
          </div>
        </div>

        {/* Invoices Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <th className="px-6 py-4">Invoice #</th>
                <th className="px-6 py-4">Customer Name</th>
                <th className="px-6 py-4">Issue Date</th>
                <th className="px-6 py-4">Total Amount</th>
                <th className="px-6 py-4">Paid</th>
                <th className="px-6 py-4">Balance</th>
                <th className="px-6 py-4">Payment Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400 font-medium">
                    No matching sales transactions found.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const isReversed = Boolean(inv.void_reason) || inv.status === 'VOID' || inv.status === 'REVERSED';
                  const isPaid = (inv.status === 'PAID' || Number(inv.balance) === 0) && !isReversed;

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-6 py-4 font-black text-slate-900">{inv.invoice_no}</td>
                      <td className="px-6 py-4 font-bold text-slate-800">{inv.customer_name}</td>
                      <td className="px-6 py-4 text-slate-500">{inv.invoice_date}</td>
                      <td className="px-6 py-4 font-black text-slate-900">{formatKsh(inv.total)}</td>
                      <td className="px-6 py-4 font-bold text-emerald-600">{formatKsh(inv.amount_paid)}</td>
                      <td className={`px-6 py-4 font-extrabold ${Number(inv.balance) > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                        {formatKsh(inv.balance)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs ${
                          isReversed
                            ? 'bg-rose-100 text-rose-800 font-bold'
                            : isPaid
                            ? 'badge-paid'
                            : 'badge-arrears'
                        }`}>
                          {isReversed ? 'REVERSED' : isPaid ? 'PAID' : 'ARREARS'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap space-x-1.5">
                        {Boolean(inv.is_credit) && (
                          <button
                            onClick={() => onPreviewInvoice(inv)}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 text-xs font-bold transition inline-flex items-center space-x-1 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Invoice</span>
                          </button>
                        )}
                        {Number(inv.amount_paid) > 0 && (
                          <button
                            onClick={() => {
                              const rcpt: Receipt = inv.latest_receipt
                                ? {
                                    ...inv.latest_receipt,
                                    amount_received: Number(
                                      (inv.latest_receipt as Receipt & { amount?: number }).amount
                                        ?? inv.latest_receipt.amount_received
                                    ),
                                  }
                                : {
                                receipt_no: `RCT-${inv.id + 600}`,
                                invoice_no: inv.invoice_no,
                                customer_name: inv.customer_name || 'Customer',
                                customer_phone: inv.customer_phone,
                                customer_location: inv.customer_location,
                                payment_date: inv.invoice_date,
                                amount_received: Number(inv.amount_paid),
                                payment_method: 'M-Pesa',
                                reference_code: 'QJD928DKL',
                                invoice_total: Number(inv.total),
                                remaining_balance: Number(inv.balance),
                                };
                              onViewReceipt?.(rcpt);
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 text-xs font-bold transition inline-flex items-center space-x-1 cursor-pointer"
                            title="View Receipt"
                          >
                            <ReceiptIcon className="w-3.5 h-3.5" />
                            <span>Receipt</span>
                          </button>
                        )}
                        {!isPaid && !isReversed && (
                          <button
                            onClick={() => onOpenPayment(inv)}
                            className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold shadow-sm transition inline-flex items-center space-x-1 cursor-pointer"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                            <span>Pay</span>
                          </button>
                        )}
                        {!isReversed && (
                          <button
                            onClick={() => handleVoidInvoice(inv)}
                            className="px-2 py-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-bold transition inline-flex items-center space-x-0.5 cursor-pointer"
                            title="Void / Cancel Invoice (Restores Stock)"
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {cashBreakdown && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-black text-slate-900">Total Cash Received</h2>
                  <p className="text-xs text-slate-500">Immediate sales through Cash, Bank Transfer, and M-Pesa.</p>
                </div>
                <button onClick={() => setCashBreakdown(null)} className="text-slate-400 hover:text-slate-700"><X /></button>
              </div>
              <div className="p-5">
                <div className="flex gap-2 mb-5">
                  {(['daily', 'weekly', 'monthly', 'yearly'] as const).map((period) => (
                    <button key={period} onClick={() => { setCashPeriod(period); openCashBreakdown(period); }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize ${cashPeriod === period ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      {period}
                    </button>
                  ))}
                </div>
                {cashLoading ? <div className="py-8 text-center text-sm text-slate-500">Loading breakdown...</div> : (<>
                  <table className="w-full text-xs">
                    <thead><tr className="text-left text-slate-500 uppercase border-b"><th className="py-3">Date</th><th className="py-3 text-right">Cash</th><th className="py-3 text-right">Bank Transfer</th><th className="py-3 text-right">M-Pesa</th><th className="py-3 text-right">Total</th></tr></thead>
                    <tbody>{cashBreakdown.items.map((item) => <tr key={item.payment_date} className="border-b border-slate-100"><td className="py-3">{item.payment_date}</td><td className="py-3 text-right">{formatKsh(item.cash)}</td><td className="py-3 text-right">{formatKsh(item.bank_transfer)}</td><td className="py-3 text-right">{formatKsh(item.mpesa)}</td><td className="py-3 text-right font-black">{formatKsh(item.total)}</td></tr>)}</tbody>
                    <tfoot><tr><td className="py-3 font-black">Total</td><td colSpan={3}></td><td className="py-3 text-right font-black text-emerald-700">{formatKsh(cashBreakdown.total)}</td></tr></tfoot>
                  </table>
                  <h3 className="mt-7 mb-2 text-xs font-black uppercase text-slate-600">Who paid</h3>
                  <table className="w-full text-xs">
                    <thead><tr className="text-left text-slate-500 uppercase border-b"><th className="py-3">Date</th><th className="py-3">Customer</th><th className="py-3">Receipt</th><th className="py-3">Method</th><th className="py-3 text-right">Amount</th></tr></thead>
                    <tbody>{cashBreakdown.transactions.map((item) => <tr key={item.receipt_no} className="border-b border-slate-100"><td className="py-3">{item.payment_date}</td><td className="py-3 font-bold">{item.customer_name}</td><td className="py-3">{item.receipt_no}</td><td className="py-3">{item.payment_method}</td><td className="py-3 text-right font-black">{formatKsh(item.amount)}</td></tr>)}</tbody>
                  </table>
                </>)}
              </div>
            </div>
          </div>
        )}
        {creditCollections && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div><h2 className="text-base font-black text-slate-900">Credit Payments Received</h2><p className="text-xs text-slate-500">Debt recovery payments, separate from immediate sales.</p></div>
                <button onClick={() => setCreditCollections(null)} className="text-slate-400 hover:text-slate-700"><X /></button>
              </div>
              <div className="p-5">
                {creditLoading ? <div className="py-8 text-center text-sm text-slate-500">Loading statement...</div> : (
                  <table className="w-full text-xs">
                    <thead><tr className="text-left text-slate-500 uppercase border-b"><th className="py-3">Date</th><th className="py-3">Customer</th><th className="py-3">Receipt</th><th className="py-3">Method</th><th className="py-3">Reference</th><th className="py-3 text-right">Amount</th></tr></thead>
                    <tbody>{creditCollections.items.map((item) => <tr key={item.receipt_no} className="border-b border-slate-100"><td className="py-3">{item.payment_date}</td><td className="py-3 font-bold">{item.customer_name}</td><td className="py-3">{item.receipt_no}</td><td className="py-3">{item.payment_method}</td><td className="py-3">{item.reference_code || '-'}</td><td className="py-3 text-right font-black text-amber-700">{formatKsh(item.amount)}</td></tr>)}</tbody>
                    <tfoot><tr><td className="py-4 font-black" colSpan={5}>Total credit payments received</td><td className="py-4 text-right font-black text-amber-700">{formatKsh(creditCollections.total)}</td></tr></tfoot>
                  </table>
                )}
                      </div>
            </div>
          </div>
        )}
        {arrearsStatementOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden">
                      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                        <div>
                          <h2 className="text-base font-black text-slate-900">Uncollected Arrears Statement</h2>
                          <p className="text-xs text-slate-500">Outstanding balances by farmer and invoice.</p>
                        </div>
                        <button onClick={() => setArrearsStatementOpen(false)} className="text-slate-400 hover:text-slate-700"><X /></button>
                      </div>
                      <div className="p-5 overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead><tr className="text-left text-slate-500 uppercase border-b"><th className="py-3">Farmer</th><th className="py-3">Invoice</th><th className="py-3">Date</th><th className="py-3 text-right">Original</th><th className="py-3 text-right">Paid</th><th className="py-3 text-right">Outstanding</th></tr></thead>
                          <tbody>{filteredInvoices.filter((invoice) => Number(invoice.balance) > 0).map((invoice) => <tr key={invoice.id} className="border-b border-slate-100"><td className="py-3 font-bold">{invoice.customer_name}</td><td className="py-3">{invoice.invoice_no}</td><td className="py-3">{invoice.invoice_date}</td><td className="py-3 text-right">{formatKsh(invoice.total)}</td><td className="py-3 text-right text-emerald-700">{formatKsh(invoice.amount_paid)}</td><td className="py-3 text-right font-black text-amber-700">{formatKsh(invoice.balance)}</td></tr>)}</tbody>
                          <tfoot><tr><td className="py-4 font-black" colSpan={5}>Total outstanding</td><td className="py-4 text-right font-black text-amber-700">{formatKsh(filteredInvoices.filter((invoice) => Number(invoice.balance) > 0).reduce((sum, invoice) => sum + Number(invoice.balance), 0))}</td></tr></tfoot>
                        </table>
                      </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
