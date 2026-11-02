import React, { useState } from 'react';
import { UserPlus, Search, FileText, Edit2, FileDown, Trash2, RotateCcw } from 'lucide-react';
import { Customer } from '../../types';
import { formatKsh } from '../../lib/utils';
import { EditCustomerModal } from './EditCustomerModal';
import { apiFetch } from '../../api/client';

interface CustomersViewProps {
  customers: Customer[];
  onOpenAddCustomer: () => void;
  onViewHistory: (customer: Customer) => void;
  onCustomerUpdated?: () => void;
  globalSearch?: string;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  customers,
  onOpenAddCustomer,
  onViewHistory,
  onCustomerUpdated,
  globalSearch = '',
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'arrears'>('all');
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const filteredCustomers = customers.filter((c) => {
    const q = (search || globalSearch).toLowerCase();
    const matchesSearch =
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      c.location.toLowerCase().includes(q);
    
    const isInArrears = c.credit_status === 'IN ARREARS' || Number(c.current_arrears_balance) > 0;

    let matchesStatus = true;
    if (statusFilter === 'active') matchesStatus = c.status === 'active';
    if (statusFilter === 'inactive') matchesStatus = c.status === 'inactive';
    if (statusFilter === 'arrears') matchesStatus = isInArrears;

    return matchesSearch && matchesStatus;
  });

  const handleDeactivate = async (customer: Customer) => {
    const activating = customer.status === 'inactive';
    const action = activating ? 'reactivate' : 'deactivate';
    if (!window.confirm(`Do you want to ${action} ${customer.name}? Their invoices and history will be retained.`)) return;

    try {
      await apiFetch(`/customers/${customer.id}`, activating
        ? { method: 'PUT', body: JSON.stringify({ status: 'active' }) }
        : { method: 'DELETE' });
      onCustomerUpdated?.();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : `Unable to ${action} customer.`);
    }
  };

  const totalInArrears = customers.filter(
    (c) => c.credit_status === 'IN ARREARS' || Number(c.current_arrears_balance) > 0
  ).length;

  const totalArrearsSum = customers.reduce(
    (acc, c) => acc + Number(c.current_arrears_balance || 0),
    0
  );

  const handleExportCSV = () => {
    const headers = ["Customer Name", "Phone", "Location", "Email", "Status", "Total Purchases (KES)", "Current Arrears (KES)", "Credit Status"];
    const rows = filteredCustomers.map(c => [
      `"${c.name}"`,
      `"${c.phone}"`,
      `"${c.location}"`,
      `"${c.email || ''}"`,
      c.status,
      c.total_purchases,
      c.current_arrears_balance,
      c.credit_status
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Bovet_Agri_Customers_Directory_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Customer Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase">Total Farmer Accounts</div>
            <div className="text-xl font-black text-slate-900 mt-1">{customers.length}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            {customers.length}
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-amber-600 uppercase">Accounts in Arrears</div>
            <div className="text-xl font-black text-amber-600 mt-1">{totalInArrears}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            {totalInArrears}
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase">Cumulative Debt Pool</div>
            <div className="text-xl font-black text-slate-900 mt-1">{formatKsh(totalArrearsSum)}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            KES
          </div>
        </div>
      </div>

      {/* Main Customers Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
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
                placeholder="Search by name, phone or farm location..."
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
                onClick={() => setStatusFilter('arrears')}
                className={`px-3 py-1.5 rounded-lg transition ${statusFilter === 'arrears' ? 'bg-white text-amber-700 shadow-sm font-black' : 'hover:text-slate-900'}`}
              >
                In Arrears
              </button>
              <button
                onClick={() => setStatusFilter('active')}
                className={`px-3 py-1.5 rounded-lg transition ${statusFilter === 'active' ? 'bg-white text-emerald-700 shadow-sm font-black' : 'hover:text-slate-900'}`}
              >
                Active
              </button>
              <button
                onClick={() => setStatusFilter('inactive')}
                className={`px-3 py-1.5 rounded-lg transition ${statusFilter === 'inactive' ? 'bg-white text-slate-900 shadow-sm font-black' : 'hover:text-slate-900'}`}
              >
                Inactive
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
              onClick={onOpenAddCustomer}
              className="flex items-center justify-center space-x-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-500/25 transition cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add New Farmer</span>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <th className="px-6 py-4">Farmer / Business</th>
                <th className="px-6 py-4">Phone Number</th>
                <th className="px-6 py-4">Farm Location</th>
                <th className="px-6 py-4">Total Purchases</th>
                <th className="px-6 py-4">Current Arrears</th>
                <th className="px-6 py-4">Credit Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-medium">
                    No customers found matching search query.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c) => {
                  const isInArrears =
                    c.credit_status === 'IN ARREARS' || Number(c.current_arrears_balance) > 0;
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-6 py-4 font-black text-slate-900">{c.name}</td>
                      <td className="px-6 py-4 text-slate-600 font-medium">{c.phone}</td>
                      <td className="px-6 py-4 text-slate-600 font-medium">{c.location}</td>
                      <td className="px-6 py-4 font-black text-slate-900">{formatKsh(c.total_purchases)}</td>
                      <td
                        className={`px-6 py-4 font-extrabold ${
                          isInArrears ? 'text-amber-600' : 'text-slate-400'
                        }`}
                      >
                        {formatKsh(c.current_arrears_balance)}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs ${
                            isInArrears ? 'badge-arrears' : 'badge-paid'
                          }`}
                        >
                          {isInArrears ? 'IN ARREARS' : 'CLEAR'}
                        </span>
                        {c.status === 'inactive' && (
                          <span className="ml-1 px-2.5 py-1 rounded-full text-xs bg-slate-100 text-slate-600">
                            INACTIVE
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => onViewHistory(c)}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 text-xs font-bold transition inline-flex items-center space-x-1 cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Statement</span>
                        </button>
                        <button
                          onClick={() => setEditingCustomer(c)}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:text-blue-700 hover:bg-blue-50 text-xs font-bold transition inline-flex items-center space-x-1 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDeactivate(c)}
                          className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold transition inline-flex items-center space-x-1 cursor-pointer ${
                            c.status === 'inactive'
                              ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                              : 'border-rose-200 text-rose-700 hover:bg-rose-50'
                          }`}
                          title={c.status === 'inactive' ? 'Reactivate customer' : 'Deactivate customer'}
                        >
                          {c.status === 'inactive' ? <RotateCcw className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
                          <span>{c.status === 'inactive' ? 'Reactivate' : 'Deactivate'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingCustomer && (
        <EditCustomerModal
          customer={editingCustomer}
          onClose={() => setEditingCustomer(null)}
          onCustomerUpdated={() => {
            onCustomerUpdated?.();
            setEditingCustomer(null);
          }}
        />
      )}
    </div>
  );
};
