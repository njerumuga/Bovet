import React from 'react';
import { X, Printer, Sprout } from 'lucide-react';
import { Invoice } from '../../types';
import { formatKsh } from '../../lib/utils';

interface InvoicePreviewModalProps {
  invoice: Invoice | null;
  onClose: () => void;
}

export const InvoicePreviewModal: React.FC<InvoicePreviewModalProps> = ({ invoice, onClose }) => {
  if (!invoice) return null;

  const handlePrint = () => {
    const previousTitle = document.title;
    document.title = `Bovet Invoice ${invoice?.invoice_no || 'Document'} ${Date.now()}`;
    window.print();
    document.title = previousTitle;
  };

  const isPaid = invoice.status === 'PAID' || Number(invoice.balance) === 0;

  return (
      <div className="print-document fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-2xl overflow-hidden my-8">
          {/* Modal Controls (Hidden in Print) */}
          <div className="sticky top-0 z-10 p-4 bg-slate-900 text-white flex items-center justify-between no-print">
            <div className="text-xs font-bold text-slate-300">
              Invoice Preview & Official Receipt
            </div>
            <div className="flex items-center space-x-2">
              <button
                  onClick={handlePrint}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg transition"
              >
                <Printer className="w-4 h-4" />
                <span>Print Invoice</span>
              </button>
              <button
                  onClick={onClose}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition"
              >
                <X className="w-5 h-5" />
                <span>Back</span>
              </button>
            </div>
          </div>

          {/* Printable Invoice Container */}
          <div className="p-8 space-y-6 text-slate-900">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-200 pb-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white">
                  <Sprout className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-xl font-black tracking-tight text-slate-900 leading-tight">BOVET AGRI VENTURES</h2>
                  <p className="text-xs text-slate-600 font-semibold">Dealers in Animal Feeds, Mineral Salts and Supplements</p>
                  <p className="text-[11px] text-slate-500">P.O. Box 1540-00232, Ruiru | Tel: +254 719 220 452</p>
                  <p className="text-[11px] text-emerald-700 font-bold">Email: bovetagriventures@gmail.com | Paybill: 247247 • Acc: BOVET</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-black text-slate-900">{invoice.invoice_no}</div>
                <div className="text-xs text-slate-500 font-semibold mt-1">Date: {invoice.invoice_date}</div>
                <div className="mt-2">
                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-black ${
                    invoice.status === 'VOID'
                        ? 'bg-rose-100 text-rose-800'
                        : isPaid
                            ? 'badge-paid'
                            : 'badge-arrears'
                }`}>
                  {invoice.status === 'VOID' ? 'VOIDED INVOICE' : isPaid ? 'PAID IN FULL' : 'CREDIT / IN ARREARS'}
                </span>
                </div>
              </div>
            </div>

            {/* Customer Details */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex justify-between text-xs">
              <div>
                <span className="font-bold text-slate-400 uppercase tracking-wider block text-[10px]">Billed To Customer:</span>
                <div className="font-extrabold text-slate-900 text-sm mt-0.5">{invoice.customer_name}</div>
                <div className="text-slate-600 font-medium">{invoice.customer_phone}</div>
              </div>
              <div className="text-right">
                <span className="font-bold text-slate-400 uppercase tracking-wider block text-[10px]">Location / Farm:</span>
                <div className="font-bold text-slate-800 mt-0.5">{invoice.customer_location || 'Meru County'}</div>
                <div className="text-slate-500 font-medium">Terms: {isPaid ? 'Cash Receipt' : 'Net Arrears Due'}</div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 font-bold text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="p-3">Item Description</th>
                  <th className="p-3 text-center">Unit</th>
                  <th className="p-3 text-right">Qty</th>
                  <th className="p-3 text-right">Unit Price</th>
                  <th className="p-3 text-right">Total (KSh)</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                {(invoice.lines || []).map((line, idx) => (
                    <tr key={idx}>
                      <td className="p-3 font-bold text-slate-900">{line.product_name || `Product SKU #${line.product_id}`}</td>
                      <td className="p-3 text-center text-slate-500">{line.sell_unit}</td>
                      <td className="p-3 text-right font-extrabold text-slate-900">{line.qty_entered}</td>
                      <td className="p-3 text-right">{formatKsh(line.unit_price)}</td>
                      <td className="p-3 text-right font-black text-slate-900">{formatKsh(line.line_amount)}</td>
                    </tr>
                ))}
                </tbody>
              </table>
            </div>

            {/* Totals Breakdown */}
            <div className="flex justify-end text-xs">
              <div className="w-64 space-y-2 border-t border-slate-200 pt-3">
                <div className="flex justify-between font-semibold text-slate-600">
                  <span>Subtotal:</span>
                  <span>{formatKsh(invoice.subtotal)}</span>
                </div>
                {Number(invoice.discount) > 0 && (
                    <div className="flex justify-between font-semibold text-slate-600">
                      <span>Discount:</span>
                      <span>{formatKsh(invoice.discount)}</span>
                    </div>
                )}
                <div className="flex justify-between text-sm font-black text-slate-900 border-t border-slate-200 pt-2">
                  <span>Invoice Total:</span>
                  <span>{formatKsh(invoice.total)}</span>
                </div>
                <div className="flex justify-between font-bold text-emerald-600">
                  <span>Amount Paid:</span>
                  <span>{formatKsh(invoice.amount_paid)}</span>
                </div>
                <div className="flex justify-between font-black text-amber-600 border-t border-slate-200 pt-2">
                  <span>Balance Due:</span>
                  <span>{formatKsh(invoice.balance)}</span>
                </div>
              </div>
            </div>

            {/* Signatures & Authorization */}
            <div className="grid grid-cols-2 gap-8 pt-6 border-t border-slate-200 text-xs">
              <div>
                <div className="h-10 border-b border-dashed border-slate-400"></div>
                <div className="mt-1.5 font-bold text-slate-700">Customer / Farmer Signature</div>
                <div className="text-[10px] text-slate-500">Name & Date Received</div>
              </div>
              <div>
                <div className="h-10 border-b border-dashed border-slate-400"></div>
                <div className="mt-1.5 font-bold text-slate-700">Authorized Signature & Stamp</div>
                <div className="text-[10px] text-slate-500">For: Bovet Agri Ventures</div>
              </div>
            </div>

            {/* Footer Receipt Notice */}
            <div className="border-t border-slate-200 pt-6 text-center text-[11px] text-slate-500 space-y-1">
              <p className="font-bold text-slate-800">Thank you for partnering with Bovet Agri Ventures!</p>
              <p>Goods once sold in good condition are not returnable without prior authorization.</p>
              <p className="text-[10px] text-slate-400">System Generated Invoice • Powered by Bovet Agri Cloud Platform</p>
            </div>
          </div>
        </div>
      </div>
  );
};