import React from 'react';
import { X, User, Printer } from 'lucide-react';
import { Customer, CustomerPayment, Invoice } from '../../types';
import { formatKsh } from '../../lib/utils';

interface CustomerHistoryModalProps {
  customer: Customer | null;
  invoices: Invoice[];
  payments: CustomerPayment[];
  onClose: () => void;
}

export const CustomerHistoryModal: React.FC<CustomerHistoryModalProps> = ({
  customer,
  invoices,
  payments,
  onClose,
}) => {
  if (!customer) return null;

  const customerInvoices = invoices.filter((i) => i.customer_id === customer.id);

  const handlePrint = () => {
    const previousTitle = document.title;
    document.title = `Bovet Customer Statement ${customer.name} ${Date.now()}`;
    window.print();
    document.title = previousTitle;
  };

  return (
    <div className="print-document fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight">{customer.name} - Statement</h3>
              <p className="text-xs text-emerald-400 font-medium">
                Phone: {customer.phone} | Location: {customer.location}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Statement Body */}
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Lifetime Purchases</span>
              <div className="text-xl font-black text-slate-900 mt-1">{formatKsh(customer.total_purchases)}</div>
            </div>
            <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
              <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">Outstanding Arrears Balance</span>
              <div className="text-xl font-black text-amber-700 mt-1">{formatKsh(customer.current_arrears_balance)}</div>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Transaction Ledger & Payments
            </h4>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 font-bold text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="p-3">Type</th>
                    <th className="p-3">Date</th>
                    <th className="p-3 text-right">Total</th>
                    <th className="p-3 text-right">Paid</th>
                    <th className="p-3 text-right">Balance</th>
                    <th className="p-3 text-center">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customerInvoices.length === 0 && payments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-slate-400">
                        No transactions found for this customer.
                      </td>
                    </tr>
                  ) : (
                    <>
                    {customerInvoices.map((inv) => {
                      const isReversed = Boolean(inv.void_reason) || inv.status === 'VOID' || inv.status === 'REVERSED';
                      const isPaid = !isReversed && (inv.status === 'PAID' || Number(inv.balance) === 0);
                      return (
                        <tr key={inv.id}>
                          <td className="p-3 font-bold text-slate-900">Invoice {inv.invoice_no}</td>
                          <td className="p-3 text-slate-500">{inv.invoice_date}</td>
                          <td className="p-3 text-right font-black text-slate-900">{formatKsh(inv.total)}</td>
                          <td className="p-3 text-right text-emerald-600 font-bold">{formatKsh(inv.amount_paid)}</td>
                          <td className={`p-3 text-right font-extrabold ${Number(inv.balance) > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                            {formatKsh(inv.balance)}
                          </td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isReversed ? 'bg-slate-200 text-slate-700' : isPaid ? 'badge-paid' : 'badge-arrears'
                            }`}>
                              {isReversed ? 'REVERSED' : isPaid ? 'PAID' : 'ARREARS'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {payments.map((payment) => (
                      <tr key={`payment-${payment.id}`} className="bg-emerald-50/40">
                        <td className="p-3 font-bold text-emerald-700">Payment {payment.receipt_no}</td>
                        <td className="p-3 text-slate-500">{payment.payment_date}</td>
                        <td className="p-3 text-right text-slate-400">-</td>
                        <td className="p-3 text-right text-emerald-600 font-black">{formatKsh(payment.amount)}</td>
                        <td className="p-3 text-right text-slate-400">-</td>
                        <td className="p-3 text-center text-[10px] font-bold text-slate-600">
                          {payment.payment_method}
                          {payment.reference_code ? ` • ${payment.reference_code}` : ''}
                        </td>
                      </tr>
                    ))}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
            <button
              onClick={handlePrint}
              className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold rounded-xl transition flex items-center space-x-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>Print Statement</span>
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
