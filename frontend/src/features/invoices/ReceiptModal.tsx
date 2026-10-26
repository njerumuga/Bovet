import React from 'react';
import { Printer, Sprout, X } from 'lucide-react';
import { Receipt } from '../../types';
import { formatKsh } from '../../lib/utils';

interface ReceiptModalProps {
  receipt: Receipt | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ receipt, onClose }) => {
  if (!receipt) return null;

  const handlePrint = () => {
    const previousTitle = document.title;
    document.title = `Bovet Payment Receipt ${receipt.receipt_no} ${Date.now()}`;
    window.print();
    document.title = previousTitle;
  };

  return (
    <div className="print-document receipt-overlay fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4">
      <div className="my-8 w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="no-print sticky top-0 z-10 flex items-center justify-between bg-slate-900 p-4 text-white">
          <span className="text-xs font-bold text-slate-300">Official Payment Receipt</span>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint} className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold">
              <Printer className="h-4 w-4" /> Print Receipt
            </button>
            <button onClick={onClose} className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white"><X className="h-5 w-5" /><span>Back</span></button>
          </div>
        </div>
        <div className="p-8 text-slate-900">
          <div className="flex items-start justify-between border-b border-slate-200 pb-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white"><Sprout className="h-6 w-6" /></div>
              <div><h2 className="font-black">BOVET AGRI VENTURES LTD</h2><p className="text-[11px] text-slate-500">Official payment receipt</p></div>
            </div>
            <div className="text-right text-xs"><div className="font-black">{receipt.receipt_no}</div><div className="text-slate-500">{receipt.payment_date}</div></div>
          </div>
          <div className="grid grid-cols-2 gap-4 border-b border-slate-200 py-5 text-xs">
            <div><p className="text-[10px] font-bold uppercase text-slate-400">Received From</p><p className="mt-1 font-black">{receipt.customer_name}</p><p className="text-slate-500">{receipt.customer_phone}</p></div>
            <div className="text-right"><p className="text-[10px] font-bold uppercase text-slate-400">Invoice</p><p className="mt-1 font-black">{receipt.invoice_no || '-'}</p><p className="text-slate-500">{receipt.payment_method}</p></div>
          </div>
          <div className="space-y-3 py-5 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Amount received</span><strong className="text-xl text-emerald-600">{formatKsh(receipt.amount_received)}</strong></div>
            <div className="flex justify-between text-xs"><span className="text-slate-500">Invoice total</span><span>{formatKsh(receipt.invoice_total || 0)}</span></div>
            <div className="flex justify-between border-t border-slate-200 pt-3 text-xs font-bold"><span>Remaining balance</span><span className="text-amber-600">{formatKsh(receipt.remaining_balance)}</span></div>
            {receipt.reference_code && <div className="flex justify-between text-xs"><span className="text-slate-500">Reference</span><span>{receipt.reference_code}</span></div>}
          </div>
          <div className="border-t border-slate-200 pt-5 text-center text-[11px] text-slate-500"><p className="font-bold text-slate-800">Thank you for partnering with Bovet Agri Ventures!</p><p>System generated receipt. Keep this receipt for your records.</p></div>
        </div>
      </div>
    </div>
  );
};
