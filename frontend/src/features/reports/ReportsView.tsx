import React, { useEffect, useState } from 'react';
import { DollarSign, Printer, FileDown, TrendingUp, CreditCard, Users, ShoppingBag, AlertTriangle, Calendar, Layers } from 'lucide-react';
import { CreditCollections, Customer, Invoice, Product, ProfitReport, ReportSummary } from '../../types';
import { formatKsh } from '../../lib/utils';
import { apiFetch } from '../../api/client';

interface ReportsViewProps {
  summary: ReportSummary;
  invoices: Invoice[];
  customers: Customer[];
  products: Product[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  summary,
  invoices,
  customers,
  products,
}) => {
  const [activeTab, setActiveTab] = useState<'financial' | 'debtors' | 'stock'>('financial');
  const [dateFilter, setDateFilter] = useState<'all' | 'day' | 'week' | 'month' | 'year' | 'custom'>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [creditCollections, setCreditCollections] = useState<CreditCollections | null>(null);
  const [profitPeriod, setProfitPeriod] = useState<ProfitReport['period']>('monthly');
  const [profitReport, setProfitReport] = useState<ProfitReport | null>(null);
  const [profitLoading, setProfitLoading] = useState(false);

  useEffect(() => {
    apiFetch<CreditCollections>('/reports/credit-collections')
      .then(setCreditCollections)
      .catch(() => setCreditCollections(null));
  }, []);

  useEffect(() => {
    let active = true;
    setProfitLoading(true);
    apiFetch<ProfitReport>(`/reports/profit?period=${profitPeriod}`)
      .then((report) => {
        if (active) setProfitReport(report);
      })
      .catch(() => {
        if (active) setProfitReport(null);
      })
      .finally(() => {
        if (active) setProfitLoading(false);
      });
    return () => {
      active = false;
    };
  }, [profitPeriod]);

  const handlePrint = () => {
    const previousTitle = document.title;
    document.title = `Bovet Business Report ${new Date().toISOString().slice(0, 10)} ${Date.now()}`;
    window.print();
    document.title = previousTitle;
  };

  // Filter invoices based on date filter
  const todayStr = new Date().toISOString().split('T')[0];
  const filteredInvoices = invoices.filter((inv) => {
    if (inv.status === 'VOID') return false;
    if (dateFilter === 'all') return true;
    if (dateFilter === 'day') return inv.invoice_date === todayStr;
    if (dateFilter === 'custom') return (!customStart || inv.invoice_date >= customStart) && (!customEnd || inv.invoice_date <= customEnd);
    const days = dateFilter === 'week' ? 7 : dateFilter === 'month' ? 30 : 365;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (days - 1));
    return new Date(`${inv.invoice_date}T23:59:59`).getTime() >= start.getTime();
  });

  const grossSales = filteredInvoices.reduce((acc, i) => acc + Number(i.total || 0), 0);
  const cashCollected = filteredInvoices.reduce((acc, i) => acc + Number(i.amount_paid || 0), 0);
  const uncollectedDebts = filteredInvoices.reduce((acc, i) => acc + Number(i.balance || 0), 0);
  const filteredTopProducts = Object.values(filteredInvoices
    .flatMap((invoice) => invoice.lines || [])
    .reduce<Record<string, { name: string; qty_sold: number; sales_amount: number; price_formatted: string }>>((acc, line) => {
      const key = line.product_name || `Product SKU #${line.product_id}`;
      const current = acc[key] || { name: key, qty_sold: 0, sales_amount: 0, price_formatted: formatKsh(line.unit_price) };
      current.qty_sold += Number(line.qty_entered || 0);
      current.sales_amount += Number(line.line_amount || 0);
      current.price_formatted = formatKsh(line.unit_price);
      acc[key] = current;
      return acc;
    }, {}))
    .sort((a, b) => b.sales_amount - a.sales_amount)
    .slice(0, 10);

  // Debtors list sorted by amount owed (BR-REP-05)
  const debtorsList = [...customers]
    .filter((c) => Number(c.current_arrears_balance) > 0)
    .sort((a, b) => Number(b.current_arrears_balance) - Number(a.current_arrears_balance));

  const totalDebtorsArrears = debtorsList.reduce((acc, c) => acc + Number(c.current_arrears_balance || 0), 0);

  // Stock valuation report (BR-REP-03)
  const totalStockValuation = products.reduce((acc, p) => acc + Number(p.qty_on_hand || 0) * Number(p.price_per_unit || 0), 0);

  const handleExportDebtorsCSV = () => {
    const headers = ["Debtor Name", "Phone", "Location", "Outstanding Arrears (KES)", "Lifetime Purchases (KES)", "Credit Status"];
    const rows = debtorsList.map(d => [
      `"${d.name}"`,
      `"${d.phone}"`,
      `"${d.location}"`,
      d.current_arrears_balance,
      d.total_purchases,
      d.credit_status
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Bovet_Agri_Debtors_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportStockCSV = () => {
    const headers = ["Product SKU", "Category", "Base Unit", "Qty On Hand", "Price/Unit (KES)", "Stock Valuation (KES)", "Low Stock Alert"];
    const rows = products.map(p => [
      `"${p.name}"`,
      `"${p.category}"`,
      p.base_unit,
      p.qty_on_hand,
      p.price_per_unit,
      Number(p.qty_on_hand || 0) * Number(p.price_per_unit || 0),
      Number(p.qty_on_hand) <= Number(p.low_stock_level) ? "YES" : "NO"
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Bovet_Agri_Stock_Valuation_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="print-document space-y-6">
      {/* Top Banner Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight">Executive Business & Financial Audit</h2>
          <p className="text-xs text-slate-500 font-medium">Bovet Agri Ventures • Ruiru Invoicing, Debtors & Stock Ledger</p>
        </div>
        <div className="flex items-center space-x-2">
          <select
            value={dateFilter}
            onChange={(e: any) => setDateFilter(e.target.value)}
            className="px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All Historical Records</option>
            <option value="day">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
            <option value="custom">Custom Range</option>
          </select>
          {dateFilter === 'custom' && <div className="flex gap-2"><input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="rounded-xl border border-slate-200 px-2 py-2 text-xs" /><input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="rounded-xl border border-slate-200 px-2 py-2 text-xs" /></div>}
          <button
            onClick={handlePrint}
            className="flex items-center space-x-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-xl text-xs font-bold w-fit no-print">
        <button
          onClick={() => setActiveTab('financial')}
          className={`px-4 py-2 rounded-lg transition ${activeTab === 'financial' ? 'bg-white text-slate-900 shadow-sm font-black' : 'text-slate-600 hover:text-slate-900'}`}
        >
          Executive Summary
        </button>
        <button
          onClick={() => setActiveTab('debtors')}
          className={`px-4 py-2 rounded-lg transition ${activeTab === 'debtors' ? 'bg-white text-amber-700 shadow-sm font-black' : 'text-slate-600 hover:text-slate-900'}`}
        >
          Debtors / Arrears ({debtorsList.length})
        </button>
        <button
          onClick={() => setActiveTab('stock')}
          className={`px-4 py-2 rounded-lg transition ${activeTab === 'stock' ? 'bg-white text-emerald-700 shadow-sm font-black' : 'text-slate-600 hover:text-slate-900'}`}
        >
          Stock Valuation ({products.length} SKUs)
        </button>
      </div>

      {/* TAB 1: FINANCIAL EXECUTIVE SUMMARY */}
      {activeTab === 'financial' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase mb-3">
                <span>Gross Sales Value</span>
                <DollarSign className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-slate-900">{formatKsh(grossSales)}</div>
              <p className="text-[11px] text-emerald-600 font-bold mt-1.5">{filteredInvoices.length} Invoices Issued</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase mb-3">
                <span>Cash Collected</span>
                <DollarSign className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-emerald-600">{formatKsh(cashCollected)}</div>
              <p className="text-[11px] text-slate-400 font-semibold mt-1.5">Direct Cash & Settlements</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase mb-3">
                <span>Uncollected Debts</span>
                <CreditCard className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-2xl font-black text-amber-600">{formatKsh(uncollectedDebts)}</div>
              <p className="text-[11px] text-amber-600 font-bold mt-1.5">Active Arrears Balance</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase mb-3">
                <span>Customer Accounts</span>
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-2xl font-black text-slate-900">{customers.length}</div>
              <p className="text-[11px] text-blue-600 font-bold mt-1.5">Registered Farmers</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Profit Analytics</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Net Profit = Revenue - Cost of Goods Sold
                  {profitReport && ` • ${profitReport.start_date} to ${profitReport.end_date}`}
                </p>
              </div>
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                {(['daily', 'weekly', 'monthly', 'yearly'] as ProfitReport['period'][]).map((period) => (
                  <button
                    key={period}
                    type="button"
                    onClick={() => setProfitPeriod(period)}
                    className={`px-3 py-2 rounded-lg text-xs font-bold capitalize transition ${
                      profitPeriod === period
                        ? 'bg-white text-emerald-700 shadow-sm'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>
            {profitLoading ? (
              <p className="text-sm text-slate-400">Loading profit analytics...</p>
            ) : profitReport ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase text-slate-500">Revenue</p>
                  <p className="mt-2 text-xl font-black text-slate-900">{formatKsh(profitReport.revenue)}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase text-slate-500">COGS</p>
                  <p className="mt-2 text-xl font-black text-amber-700">{formatKsh(profitReport.cogs)}</p>
                </div>
                <div className="rounded-xl bg-emerald-50 p-4">
                  <p className="text-xs font-bold uppercase text-emerald-700">Net Profit</p>
                  <p className={`mt-2 text-xl font-black ${Number(profitReport.net_profit) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {formatKsh(profitReport.net_profit)}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-rose-600">Profit analytics could not be loaded.</p>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Credit Collections / Debt Recovery Statement</h3>
                <p className="text-xs text-slate-500 mt-1">Arrears repayments are isolated from direct sale cash.</p>
              </div>
              <span className="text-lg font-black text-amber-700">{formatKsh(creditCollections?.total || 0)}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase font-bold"><tr><th className="px-6 py-3">Date</th><th className="px-6 py-3">Receipt</th><th className="px-6 py-3">Customer</th><th className="px-6 py-3">Method</th><th className="px-6 py-3 text-right">Amount</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {(creditCollections?.items || []).map((item) => <tr key={item.receipt_no}><td className="px-6 py-3">{item.payment_date}</td><td className="px-6 py-3 font-bold">{item.receipt_no}</td><td className="px-6 py-3">{item.customer_name}</td><td className="px-6 py-3">{item.payment_method}</td><td className="px-6 py-3 text-right font-black text-amber-700">{formatKsh(item.amount)}</td></tr>)}
                  {!creditCollections?.items.length && <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">No credit recoveries recorded.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top Selling Products */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6">
            <h3 className="text-base font-extrabold text-slate-900 mb-4">Top Fast-Moving Agricultural Feeds & Minerals</h3>
            <div className="divide-y divide-slate-100">
              {(filteredTopProducts.length ? filteredTopProducts : (summary.top_selling_products || [])).map((prod, idx) => (
                <div key={idx} className="py-3 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-3">
                    <span className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-700 font-black flex items-center justify-center text-xs">
                      #{idx + 1}
                    </span>
                    <div>
                      <div className="font-extrabold text-slate-900 text-sm">{prod.name}</div>
                      <div className="text-[11px] text-slate-400">Total Qty Dispatched: {prod.qty_sold}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-slate-900 text-sm">{formatKsh(prod.sales_amount)}</div>
                    <div className="text-[11px] text-slate-500 font-medium">{prod.price_formatted}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DEBTORS / ARREARS REPORT (BR-REP-05) */}
      {activeTab === 'debtors' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Debtors & Arrears Aging Ledger</h3>
              <p className="text-xs text-amber-600 font-semibold mt-0.5">
                Total Outstanding Arrears: {formatKsh(totalDebtorsArrears)} across {debtorsList.length} accounts
              </p>
            </div>
            <button
              onClick={handleExportDebtorsCSV}
              className="flex items-center space-x-1.5 px-3.5 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              <FileDown className="w-4 h-4 text-slate-500" />
              <span>Export Debtors CSV</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Farmer / Business</th>
                  <th className="px-6 py-4">Phone Number</th>
                  <th className="px-6 py-4">Farm Location</th>
                  <th className="px-6 py-4 text-right">Lifetime Purchases</th>
                  <th className="px-6 py-4 text-right">Amount Owed (Arrears)</th>
                  <th className="px-6 py-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {debtorsList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-medium">
                      Great news! There are zero customer accounts in arrears.
                    </td>
                  </tr>
                ) : (
                  debtorsList.map((d, idx) => (
                    <tr key={d.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-6 py-4 font-black text-slate-900 flex items-center space-x-2">
                        <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span>{d.name}</span>
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-medium">{d.phone}</td>
                      <td className="px-6 py-4 text-slate-600 font-medium">{d.location}</td>
                      <td className="px-6 py-4 text-right font-bold text-slate-900">{formatKsh(d.total_purchases)}</td>
                      <td className="px-6 py-4 text-right font-black text-amber-600 text-sm">
                        {formatKsh(d.current_arrears_balance)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-2.5 py-1 rounded-full text-xs badge-arrears font-bold">
                          IN ARREARS
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: STOCK VALUATION REPORT (BR-REP-03) */}
      {activeTab === 'stock' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Live Inventory Asset Valuation</h3>
              <p className="text-xs text-emerald-600 font-semibold mt-0.5">
                Total Inventory Value in Store: {formatKsh(totalStockValuation)}
              </p>
            </div>
            <button
              onClick={handleExportStockCSV}
              className="flex items-center space-x-1.5 px-3.5 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              <FileDown className="w-4 h-4 text-slate-500" />
              <span>Export Stock CSV</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Product Name</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4 text-right">In Stock</th>
                  <th className="px-6 py-4 text-right">Unit Price</th>
                  <th className="px-6 py-4 text-right">Total Asset Value</th>
                  <th className="px-6 py-4 text-center">Stock Alert Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => {
                  const isLow = Number(p.qty_on_hand) <= Number(p.low_stock_level);
                  const val = Number(p.qty_on_hand || 0) * Number(p.price_per_unit || 0);

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-6 py-4 font-black text-slate-900">{p.name}</td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-bold rounded-lg text-[11px]">
                          {p.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-black text-slate-900">
                        {p.qty_on_hand} {p.base_unit}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-600 font-bold">
                        {formatKsh(p.price_per_unit)}
                      </td>
                      <td className="px-6 py-4 text-right font-black text-emerald-700">
                        {formatKsh(val)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-xs ${isLow ? 'badge-low-stock' : 'badge-in-stock'}`}>
                          {isLow ? 'REORDER NEEDED' : 'HEALTHY'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
