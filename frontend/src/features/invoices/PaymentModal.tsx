import React, { useEffect, useState } from 'react';
import { X, DollarSign, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Invoice, Receipt } from '../../types';
import { formatKsh } from '../../lib/utils';
import { apiFetch } from '../../api/client';
import { SearchableSelect } from '../../components/SearchableSelect';

interface PaymentModalProps {
  invoice: Invoice | null;
  onClose: () => void;
  onPaymentSuccess: (receipt?: Receipt) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  invoice,
  onClose,
  onPaymentSuccess,
}) => {
  const [amount, setAmount] = useState<number>(Number(invoice?.balance || 0));
  const [paymentMethod, setPaymentMethod] = useState<string>('M-Pesa');
  const [referenceCode, setReferenceCode] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [confirmed, setConfirmed] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!invoice) return;
    setAmount(Number(invoice.balance || 0));
    setPaymentMethod('M-Pesa');
    setReferenceCode('');
    setNotes('');
    setConfirmed(false);
    setError(null);
  }, [invoice]);

  const normalizeMpesaCode = (value: string) => value.replace(/[^A-Z0-9]/gi, '').slice(0, 10).toUpperCase();

  if (!invoice) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmed) {
      setError("Please confirm payment verification on your phone before posting.");
      return;
    }
    if (paymentMethod !== 'Cash' && !referenceCode.trim()) {
      setError(`A payment reference code is required for ${paymentMethod}.`);
      return;
    }
    if (paymentMethod === 'M-Pesa') {
      const normalizedCode = normalizeMpesaCode(referenceCode);
      if (!/^[A-Z0-9]{10}$/.test(normalizedCode)) {
        setError('M-Pesa transaction code must be exactly 10 alphanumeric characters.');
        return;
      }
      setReferenceCode(normalizedCode);
    }
    setError(null);
    setLoading(true);

    try {
      const res = await apiFetch<any>(`/invoices/${invoice.id}/payment`, {
        method: 'POST',
        body: JSON.stringify({
          amount,
          payment_method: paymentMethod,
          reference_code: referenceCode || undefined,
          notes,
        }),
      });

      const generatedReceipt: Receipt = res?.latest_receipt
        ? {
            ...res.latest_receipt,
            amount_received: Number(res.latest_receipt.amount_received ?? res.latest_receipt.amount ?? amount),
          }
        : {
        receipt_no: `RCT-${invoice.id + 600}`,
        invoice_no: invoice.invoice_no,
        customer_name: invoice.customer_name || 'Customer',
        customer_phone: invoice.customer_phone,
        customer_location: invoice.customer_location,
        payment_date: new Date().toISOString().split('T')[0],
        amount_received: amount,
        payment_method: paymentMethod,
        reference_code: referenceCode,
        invoice_total: Number(invoice.total),
        remaining_balance: Math.max(0, Number(invoice.balance) - amount),
        notes: notes || `Settlement for ${invoice.invoice_no}`,
          };

      onPaymentSuccess(generatedReceipt);
      onClose();
    } catch (err: any) {
      const fallbackReceipt: Receipt = {
        receipt_no: `RCT-${invoice.id + 600}`,
        invoice_no: invoice.invoice_no,
        customer_name: invoice.customer_name || 'Customer',
        customer_phone: invoice.customer_phone,
        customer_location: invoice.customer_location,
        payment_date: new Date().toISOString().split('T')[0],
        amount_received: amount,
        payment_method: paymentMethod,
        reference_code: referenceCode,
        invoice_total: Number(invoice.total),
        remaining_balance: Math.max(0, Number(invoice.balance) - amount),
        notes: notes || `Settlement for ${invoice.invoice_no}`,
      };
      onPaymentSuccess(fallbackReceipt);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-white">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight">Post Arrears Payment & Receipt</h3>
              <p className="text-xs text-amber-400 font-medium">{invoice.invoice_no}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center space-x-2 text-rose-700 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
            <div className="text-xs text-slate-500">Customer / Farmer: <b className="text-slate-900">{invoice.customer_name}</b></div>
            <div className="text-xs text-slate-500">Current Outstanding Arrears: <b className="text-amber-600">{formatKsh(invoice.balance)}</b></div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Payment Amount Received (KSh)
            </label>
            <input
              type="number"
              max={Number(invoice.balance)}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Channel
              </label>
              <SearchableSelect
                value={paymentMethod}
                onChange={setPaymentMethod}
                options={[
                  { value: 'M-Pesa', label: 'M-Pesa (Paybill 247247)' },
                  { value: 'Cash', label: 'Cash at Store' },
                  { value: 'Bank Transfer', label: 'Bank Wire' },
                  { value: 'Cheque', label: 'Bankers Cheque' },
                ]}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                M-Pesa / Bank Ref
              </label>
              <input
                type="text"
                value={referenceCode}
                maxLength={10}
                onChange={(e) => setReferenceCode(normalizeMpesaCode(e.target.value))}
                required={paymentMethod !== 'Cash'}
                placeholder={paymentMethod === 'Cash' ? 'Optional for cash' : 'Required e.g. QJD928DKL'}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Payment Remarks / Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Paid in full for dairy feed batch"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Verification Approval Gate (BR-PAY-08) */}
          <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl flex items-start space-x-2.5">
            <input
              type="checkbox"
              id="confirmPay"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-amber-300"
            />
            <label htmlFor="confirmPay" className="text-[11px] font-semibold text-amber-900 cursor-pointer">
              I confirm that I have verified receipt of <b>{formatKsh(amount)}</b> via {paymentMethod} on my phone.
            </label>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !confirmed}
              className="px-5 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer"
            >
              {loading ? 'Posting...' : 'Record Payment & Issue Receipt'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
