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

  const paidAmount = Number(
      (receipt as Receipt & { amount?: number }).amount ?? receipt.amount_received ?? 0
  );
  const remainingBalance = Number(receipt.remaining_balance || 0);
  const isWalkIn = receipt.customer_phone === 'Walk-In Counter Sale' || receipt.customer_phone === 'WALK-IN';

  const itemSummary = receipt.notes?.includes('Items: ')
      ? receipt.notes.split('Items: ')[1]
      : null;

  return (
      <div className="print-document receipt-overlay fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4">
        <div className="my-8 w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
          <div className="no-print sticky top-0 z-10 flex items-center justify-between bg-slate-900 p-4 text-white">
          <span className="text-xs font-bold text-slate-300">
            {isWalkIn ? 'Walk-In Cash Receipt' : 'Official Payment Receipt'}
          </span>
            <div className="flex items-center gap-2">
              <button onClick={handlePrint} className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold cursor-pointer">
                <Printer className="h-4 w-4" /> Print Receipt
              </button>
              <button onClick={onClose} className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer">
                <X className="h-5 w-5" /><span>Back</span>
              </button>
            </div>
          </div>
          <div className="p-8 text-slate-900">
            <div className="flex items-start justify-between border-b border-slate-200 pb-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shrink-0">
                  <Sprout className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="font-black">BOVET AGRI VENTURES</h2>
                  <p className="text-[11px] text-slate-500">P.O. Box 1540-00232, Ruiru | Tel: +254 719 220 452</p>
                  <p className="text-[10px] font-bold text-emerald-700">Paybill: 400200 • Acc: 40019435 | Co-op Bank: 01192943536900</p>
                </div>
              </div>
              <div className="text-right text-xs">
                <div className="font-black">{receipt.receipt_no}</div>
                <div className="text-slate-500">{receipt.payment_date}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-b border-slate-200 py-4 text-xs">
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-400">Received From</p>
                <p className="mt-1 font-black">{receipt.customer_name}</p>
                <p className="text-slate-500">{receipt.customer_phone}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase text-slate-400">Payment Channel</p>
                <p className="mt-1 font-black">{receipt.payment_method}</p>
                {!isWalkIn && receipt.invoice_no && (
                    <p className="text-slate-500">Ref Invoice: {receipt.invoice_no}</p>
                )}
              </div>
            </div>

            {itemSummary && (
                <div className="border-b border-slate-200 py-3.5 text-xs">
                  <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Items Purchased</p>
                  <p className="font-bold text-slate-800 leading-relaxed">{itemSummary}</p>
                </div>
            )}

            <div className="space-y-3 py-5 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold">Amount Paid</span>
                <strong className="text-xl text-emerald-600">{formatKsh(paidAmount)}</strong>
              </div>
              {!isWalkIn && (
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Invoice Total</span>
                    <span>{formatKsh(receipt.invoice_total || 0)}</span>
                  </div>
              )}
              <div className="flex justify-between border-t border-slate-200 pt-3 text-xs font-bold">
                <span>Remaining Balance</span>
                <span className={remainingBalance > 0 ? 'text-amber-600' : 'text-emerald-600'}>
                {formatKsh(remainingBalance)}
              </span>
              </div>
              {receipt.reference_code && (
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Transaction Reference</span>
                    <span className="font-bold">{receipt.reference_code}</span>
                  </div>
              )}
            </div>

            <div className="border-t border-slate-200 pt-5 text-center text-[11px] text-slate-500">
              <p className="font-bold text-slate-800">Thank you for partnering with Bovet Agri Ventures!</p>
              <p>System generated receipt. Keep this receipt for your records.</p>
            </div>
          </div>
        </div>
      </div>
  );
};