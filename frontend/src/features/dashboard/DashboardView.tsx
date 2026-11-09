import React, { useMemo, useState } from 'react';
import { DollarSign, Clock, AlertTriangle, Users, ArrowUpRight, WalletCards } from 'lucide-react';
import { StatCard } from '../../components/StatCard';
import { Customer, Invoice, Product, DashboardStats } from '../../types';
import { formatKsh } from '../../lib/utils';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface DashboardViewProps {
  stats: DashboardStats;
  invoices: Invoice[];
  products: Product[];
  customers: Customer[];
  onPreviewInvoice: (invoice: Invoice) => void;
  onNavigate: (tab: string) => void;
  globalSearch?: string;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  invoices,
  products,
  customers,
  onPreviewInvoice,
  onNavigate,
  globalSearch = '',
}) => {
  const [revenueRange, setRevenueRange] = useState<'day' | 'week' | 'month' | 'year'>('week');
  const [selectedDay, setSelectedDay] = useState(new Date().toISOString().split('T')[0]);
  const rangeStart = useMemo(() => {
    const start = new Date();
    if (revenueRange === 'day') {
      const [year, month, day] = selectedDay.split('-').map(Number);
      return new Date(year, month - 1, day);
    }
    if (revenueRange === 'week') start.setDate(start.getDate() - 6);
    if (revenueRange === 'month') start.setDate(start.getDate() - 29);
    if (revenueRange === 'year') start.setFullYear(start.getFullYear() - 1);
    return start;
  }, [revenueRange, selectedDay]);
  const rangeInvoices = invoices.filter((invoice) => {
    if (invoice.status === 'VOID') return false;
    if (revenueRange === 'day') return invoice.invoice_date === selectedDay;
    return new Date(`${invoice.invoice_date}T23:59:59`).getTime() >= rangeStart.getTime();
  });
  const normalizedSearch = globalSearch.trim().toLowerCase();
  const visibleInvoices = normalizedSearch
    ? invoices.filter((invoice) =>
        invoice.invoice_no.toLowerCase().includes(normalizedSearch) ||
        (invoice.customer_name || '').toLowerCase().includes(normalizedSearch)
      )
    : invoices;
  const filteredRevenue = rangeInvoices.reduce((total, invoice) => total + Number(invoice.total || 0), 0);
  const chartDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    return date;
  });
  const chartData = {
    labels: chartDays.map((date) => date.toLocaleDateString(undefined, { weekday: 'short' })),
    datasets: [
      {
        label: 'Cash Collected (KSh)',
        data: chartDays.map((date) => invoices.filter((invoice) => invoice.status !== 'VOID' && invoice.invoice_date === date.toISOString().split('T')[0]).reduce((sum, invoice) => sum + Number(invoice.amount_paid || 0), 0)),
        backgroundColor: '#10B981',
        borderRadius: 6,
      },
      {
        label: 'Arrears / Credit (KSh)',
        data: chartDays.map((date) => invoices.filter((invoice) => invoice.status !== 'VOID' && invoice.invoice_date === date.toISOString().split('T')[0]).reduce((sum, invoice) => sum + Number(invoice.balance || 0), 0)),
        backgroundColor: '#F59E0B',
        borderRadius: 6,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { boxWidth: 12, font: { family: 'Plus Jakarta Sans', size: 11, weight: 'bold' as const } },
      },
    },
    scales: {
      y: {
        grid: { color: '#F1F5F9' },
        ticks: { font: { family: 'Plus Jakarta Sans', size: 10 } },
      },
      x: {
        grid: { display: false },
        ticks: { font: { family: 'Plus Jakarta Sans', size: 10 } },
      },
    },
  };

  return (
    <div className="space-y-8">
      {/* 4 Key Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <StatCard
          title="Total Sales Revenue"
          value={formatKsh(filteredRevenue)}
          badgeText={`${rangeInvoices.length} invoices`}
          badgeType="success"
          icon={DollarSign}
          iconBgColor="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          title="Pending Arrears"
          value={formatKsh(stats.total_pending_arrears)}
          badgeText="Active Debts"
          badgeType="warning"
          icon={Clock}
          iconBgColor="bg-amber-50 text-amber-600"
          onClick={() => onNavigate('sales')}
        />
        <StatCard
          title="Total Cash Received"
          value={formatKsh(stats.total_cash_received)}
          badgeText="Direct sales statement"
          badgeType="success"
          icon={WalletCards}
          iconBgColor="bg-emerald-50 text-emerald-600"
          onClick={() => onNavigate('sales')}
        />
        <StatCard
          title="Credit Payments Received"
          value={formatKsh(stats.credit_payments_received)}
          badgeText="Debt recovery statement"
          badgeType="info"
          icon={WalletCards}
          iconBgColor="bg-blue-50 text-blue-600"
          onClick={() => onNavigate('sales')}
        />
        <StatCard
          title="Low Stock SKUs"
          value={`${stats.low_stock_alerts_count} Items`}
          badgeText="Action Required"
          badgeType={stats.low_stock_alerts_count > 0 ? "danger" : "success"}
          icon={AlertTriangle}
          iconBgColor="bg-rose-50 text-rose-600"
        />
        <StatCard
          title="Active Farmers"
          value={String(stats.active_customers_count)}
          badgeText="Registered Accounts"
          badgeType="info"
          icon={Users}
          iconBgColor="bg-blue-50 text-blue-600"
        />
      </div>

      {/* Main Grid: Revenue Chart + Fast Stock Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Weekly Cash vs Credit Trends</h3>
              <p className="text-xs text-slate-500 font-medium">Daily comparison of immediate cash versus customer credit</p>
            </div>
            <div className="flex items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 p-1">
              {(['day', 'week', 'month', 'year'] as const).map((range) => (
                <button key={range} onClick={() => setRevenueRange(range)} className={`rounded-lg px-2 py-1 text-[10px] font-bold capitalize ${revenueRange === range ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'}`}>
                  {range}
                </button>
              ))}
            </div>
            {revenueRange === 'day' && (
              <input type="date" value={selectedDay} onChange={(event) => setSelectedDay(event.target.value)} className="rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-700" />
            )}
          </div>
          <div className="h-64">
            <Bar data={chartData} options={chartOptions} />
          </div>
        </div>

        {/* Quick Inventory Stock Levels */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-extrabold text-slate-900">Inventory Status</h3>
              <button
                onClick={() => onNavigate('inventory')}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline flex items-center"
              >
                <span>View All</span>
                <ArrowUpRight className="w-3.5 h-3.5 ml-0.5" />
              </button>
            </div>
            <div className="space-y-3.5">
              {products.slice(0, 5).map((p) => {
                const isLow = Number(p.qty_on_hand) <= Number(p.low_stock_level);
                return (
                  <div key={p.id} className="flex items-center justify-between text-xs py-2 border-b border-slate-100 last:border-0">
                    <div>
                      <div className="font-bold text-slate-800">{p.name}</div>
                      <div className="text-[11px] text-slate-400">{p.category}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-extrabold text-slate-900">{p.qty_on_hand} {p.base_unit}</div>
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${isLow ? 'badge-low-stock' : 'badge-in-stock'}`}>
                        {isLow ? 'LOW STOCK' : 'IN STOCK'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">Recent Sales Transactions</h3>
            <p className="text-xs text-slate-500 font-medium">Latest sales invoices issued across all channels</p>
          </div>
          <button
            onClick={() => onNavigate('sales')}
            className="text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline flex items-center"
          >
            <span>View All Invoices</span>
            <ArrowUpRight className="w-4 h-4 ml-1" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <th className="px-6 py-3.5">Invoice #</th>
                <th className="px-6 py-3.5">Customer</th>
                <th className="px-6 py-3.5">Date</th>
                <th className="px-6 py-3.5">Total Amount</th>
                <th className="px-6 py-3.5">Amount Paid</th>
                <th className="px-6 py-3.5">Balance</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {visibleInvoices.slice(0, 5).map((inv) => {
                const isPaid = inv.status === 'PAID' || Number(inv.balance) === 0;
                return (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-6 py-3.5 font-bold text-slate-900">{inv.invoice_no}</td>
                    <td className="px-6 py-3.5 text-slate-800 font-medium">{inv.customer_name}</td>
                    <td className="px-6 py-3.5 text-slate-500">{inv.invoice_date}</td>
                    <td className="px-6 py-3.5 font-black text-slate-900">{formatKsh(inv.total)}</td>
                    <td className="px-6 py-3.5 font-bold text-emerald-600">{formatKsh(inv.amount_paid)}</td>
                    <td className={`px-6 py-3.5 font-bold ${Number(inv.balance) > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                      {formatKsh(inv.balance)}
                    </td>
                    <td className="px-6 py-3.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs ${isPaid ? 'badge-paid' : 'badge-arrears'}`}>
                        {isPaid ? 'PAID' : 'ARREARS'}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <button
                        onClick={() => onPreviewInvoice(inv)}
                        className="text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline"
                      >
                        Preview
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
