import React from 'react';
import { X, Printer, CheckCircle2, Sprout } from 'lucide-react';
import { Receipt } from '../../types';
import { formatKsh } from '../../lib/utils';

interface ReceiptModalProps {
  receipt: Receipt | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ receipt, onClose }) => {
  if (!receipt) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden my-8">
        {/* Controls (Hidden during print) */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between no-print">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            <span className="text-xs font-bold text-slate-200">Official Payment Receipt</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Receipt</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Container */}
        <div className="p-8 space-y-6 text-slate-900">
          {/* Header */}
          <div className="text-center border-b border-dashed border-slate-300 pb-5">
            <div className="inline-flex w-12 h-12 bg-emerald-600 rounded-2xl items-center justify-center text-white mb-2 shadow-sm">
              <Sprout className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-black tracking-tight text-slate-900">BOVET AGRI VENTURES</h2>
            <p className="text-xs text-slate-600 font-semibold">Dealers in Animal Feeds, Mineral Salts & Supplements</p>
            <p className="text-[11px] text-slate-500">P.O. Box 1540-00232, Ruiru | Tel: +254 719 220 452</p>
            <p className="text-[11px] text-emerald-700 font-bold mt-1">Paybill: 247247 • Account: BOVET</p>
          </div>

          {/* Receipt Info Badge */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 flex justify-between items-center text-xs">
            <div>
              <span className="text-slate-400 font-bold uppercase text-[10px] block">Receipt Number</span>
              <span className="font-black text-slate-900 text-sm">{receipt.receipt_no}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 font-bold uppercase text-[10px] block">Date Paid</span>
              <span className="font-bold text-slate-800">{receipt.payment_date}</span>
            </div>
          </div>

          {/* Customer & Settlement Details */}
          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500 font-semibold">Received From:</span>
              <span className="font-extrabold text-slate-900">{receipt.customer_name}</span>
            </div>

            {receipt.customer_phone && (
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-semibold">Phone:</span>
                <span className="font-medium text-slate-700">{receipt.customer_phone}</span>
              </div>
            )}

            {receipt.customer_location && (
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-semibold">Location / Farm:</span>
                <span className="font-medium text-slate-700">{receipt.customer_location}</span>
              </div>
            )}

            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500 font-semibold">Payment Channel:</span>
              <span className="font-bold text-slate-800">{receipt.payment_method}</span>
            </div>

            {receipt.reference_code && (
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-semibold">Reference / Code:</span>
                <span className="font-black text-emerald-700">{receipt.reference_code}</span>
              </div>
            )}

            {receipt.invoice_no && (
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-semibold">Applied To Invoice:</span>
                <span className="font-bold text-slate-900">{receipt.invoice_no}</span>
              </div>
            )}

            {receipt.notes && (
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-semibold">Notes / Purpose:</span>
                <span className="text-slate-700 italic">{receipt.notes}</span>
              </div>
            )}
          </div>

          {/* Amount Box */}
          <div className="bg-emerald-50/80 border border-emerald-200/80 p-4 rounded-xl text-center space-y-1">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
              Amount Received & Acknowledged
            </span>
            <div className="text-2xl font-black text-emerald-700">{formatKsh(receipt.amount_received)}</div>
          </div>

          {/* Remaining Balance */}
          <div className="flex justify-between items-center text-xs px-2 font-bold">
            <span className="text-slate-600">Remaining Balance on Account:</span>
            <span className={Number(receipt.remaining_balance) > 0 ? 'text-amber-600 font-black' : 'text-emerald-600 font-black'}>
              {formatKsh(receipt.remaining_balance)}
            </span>
          </div>

          {/* Receipt Footer */}
          <div className="border-t border-dashed border-slate-300 pt-4 text-center text-[10px] text-slate-500 space-y-0.5">
            <div className="flex items-center justify-center space-x-1 text-emerald-600 font-bold mb-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Payment Verified & Account Updated</span>
            </div>
            <p>Thank you for doing business with Bovet Agri Ventures, Ruiru.</p>
            <p className="text-slate-400">System Generated Document • No signature required</p>
          </div>
        </div>
      </div>
    </div>
  );
};
