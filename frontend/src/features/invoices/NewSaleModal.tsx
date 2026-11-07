import React, { useEffect, useState } from 'react';
import { X, Plus, Trash2, ShoppingCart, AlertCircle, AlertTriangle, CheckCircle, CreditCard } from 'lucide-react';
import { Customer, Product, InvoiceLine } from '../../types';
import { formatKsh } from '../../lib/utils';
import { apiFetch } from '../../api/client';
import { SearchableSelect } from '../../components/SearchableSelect';

interface NewSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  products: Product[];
  onSaleCreated: () => void;
}

export const NewSaleModal: React.FC<NewSaleModalProps> = ({
  isOpen,
  onClose,
  customers,
  products,
  onSaleCreated,
}) => {
  const [customerId, setCustomerId] = useState<number>(customers[0]?.id || 1);
  const [invoiceDate, setInvoiceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [lines, setLines] = useState<InvoiceLine[]>([
    {
      product_id: products[0]?.id || 1,
      sell_unit: products[0]?.base_unit || 'Bags',
      qty_entered: 1,
      unit_price: Number(products[0]?.price_per_unit || 0),
      list_price: Number(products[0]?.price_per_unit || 0),
      line_amount: Number(products[0]?.price_per_unit || 0),
    },
  ]);
  const [discount, setDiscount] = useState<number>(0);
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [referenceCode, setReferenceCode] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setCustomerId(customers[0]?.id || 1);
    setInvoiceDate(new Date().toISOString().split('T')[0]);
    setLines([{
      product_id: products[0]?.id || 1,
      sell_unit: products[0]?.base_unit || 'Bags',
      qty_entered: 1,
      unit_price: Number(products[0]?.price_per_unit || 0),
      list_price: Number(products[0]?.price_per_unit || 0),
      line_amount: Number(products[0]?.price_per_unit || 0),
    }]);
    setDiscount(0);
    setAmountPaid(0);
    setPaymentMethod('');
    setReferenceCode('');
    setNotes('');
    setError(null);
  }, [isOpen, customers, products]);

  if (!isOpen) return null;

  const handleProductChange = (index: number, prodId: number) => {
    const prod = products.find((p) => p.id === prodId);
    if (!prod) return;
    const newLines = [...lines];
    newLines[index].product_id = prodId;
    newLines[index].product_name = prod.name;
    newLines[index].sell_unit = prod.base_unit;
    newLines[index].unit_price = Number(prod.price_per_unit);
    newLines[index].list_price = Number(prod.price_per_unit);
    newLines[index].line_amount = Number(newLines[index].qty_entered) * Number(prod.price_per_unit);
    setLines(newLines);
  };

  const handleUnitToggle = (index: number, usePack: boolean) => {
    const line = lines[index];
    const prod = products.find((p) => p.id === line.product_id);
    if (!prod) return;

    const newLines = [...lines];
    if (usePack && prod.pack_size && Number(prod.pack_size) > 1) {
      newLines[index].sell_unit = `${prod.pack_size}${prod.base_unit} Pack`;
      newLines[index].unit_price = Number(prod.price_per_pack || prod.price_per_unit);
    } else {
      newLines[index].sell_unit = prod.base_unit;
      newLines[index].unit_price = Number(prod.price_per_unit);
    }
    newLines[index].line_amount = Number(newLines[index].qty_entered) * newLines[index].unit_price;
    setLines(newLines);
  };

  const handleQtyChange = (index: number, rawQty: string) => {
    const qty = rawQty === '' ? 0 : Number(rawQty);
    const newLines = [...lines];
    newLines[index].qty_entered = qty;
    newLines[index].line_amount = qty * Number(newLines[index].unit_price);
    setLines(newLines);
  };

  const handlePriceChange = (index: number, price: number) => {
    const newLines = [...lines];
    newLines[index].unit_price = price;
    newLines[index].line_amount = Number(newLines[index].qty_entered) * price;
    setLines(newLines);
  };

  const addLine = () => {
    const firstProd = products[0];
    setLines([
      ...lines,
      {
        product_id: firstProd?.id || 1,
        sell_unit: firstProd?.base_unit || 'Bags',
        qty_entered: 1,
        unit_price: Number(firstProd?.price_per_unit || 0),
        list_price: Number(firstProd?.price_per_unit || 0),
        line_amount: Number(firstProd?.price_per_unit || 0),
      },
    ]);
  };

  const removeLine = (index: number) => {
    if (lines.length === 1) return;
    setLines(lines.filter((_, i) => i !== index));
  };

  const subtotal = lines.reduce((acc, l) => acc + l.line_amount, 0);
  const total = Math.max(0, subtotal - discount);
  const balance = Math.max(0, total - amountPaid);

  const handlePayInFull = () => {
    setAmountPaid(total);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (amountPaid > 0 && paymentMethod !== 'Cash' && !referenceCode.trim()) {
        throw new Error(`A payment reference code is required for ${paymentMethod}.`);
      }
      await apiFetch('/invoices', {
        method: 'POST',
        body: JSON.stringify({
          customer_id: customerId,
          invoice_date: invoiceDate,
          lines: lines.map((l) => ({
            product_id: l.product_id,
            sell_unit: l.sell_unit,
            qty_entered: l.qty_entered,
            unit_price: l.unit_price,
          })),
          discount,
          amount_paid: amountPaid,
          payment_method: paymentMethod,
          reference_code: referenceCode || undefined,
          notes,
        }),
      });

      onSaleCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create sales invoice');
      onSaleCreated();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-3xl overflow-hidden my-8">
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight">Record New Sale Invoice</h3>
              <p className="text-xs text-emerald-400 font-medium">Bovet Agri Ventures • Ruiru Invoicing & Stock Dispatch</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center space-x-2 text-rose-700 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Customer & Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Select Customer / Farmer
              </label>
              <SearchableSelect
                value={customerId}
                onChange={(value) => setCustomerId(Number(value))}
                options={customers.filter((c) => c.status === 'active').map((c) => ({
                  value: c.id,
                  label: `${c.name} (${c.phone}) - ${c.location}${Number(c.current_arrears_balance) > 0 ? ` [Arrears: ${formatKsh(c.current_arrears_balance)}]` : ''}`,
                }))}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Invoice Date
              </label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Sale Items & Pricing (Per Kg or Bag / Pack)
              </label>
              <button
                type="button"
                onClick={addLine}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center space-x-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Another Item</span>
              </button>
            </div>

            <div className="space-y-3">
              {lines.map((line, idx) => {
                const prod = products.find((p) => p.id === line.product_id);
                const isOverStock = prod && Number(line.qty_entered) > Number(prod.qty_on_hand);
                const hasPack = prod?.pack_size && Number(prod.pack_size) > 1;

                return (
                  <div key={idx} className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto_6rem_7rem_auto_auto] items-start md:items-center gap-2">
                      <div className="min-w-0 w-full">
                        <SearchableSelect
                          value={line.product_id}
                          onChange={(value) => handleProductChange(idx, Number(value))}
                          options={products.filter((p) => p.status === 'active').map((p) => ({
                            value: p.id,
                            label: `${p.name} (${p.category}) - Stock: ${p.qty_on_hand} ${p.base_unit}`,
                          }))}
                          className="w-full"
                        />
                      </div>

                      {hasPack && (
                        <div className="flex items-center space-x-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleUnitToggle(idx, false)}
                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition ${
                              line.sell_unit === prod?.base_unit
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            Per {prod?.base_unit}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUnitToggle(idx, true)}
                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition ${
                              line.sell_unit !== prod?.base_unit
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            {prod?.pack_size}{prod?.base_unit} Bag
                          </button>
                        </div>
                      )}

                      <div className="w-full min-w-0">
                        <input
                          type="number"
                          min="0.1"
                          step="any"
                          value={line.qty_entered === 0 ? '' : line.qty_entered}
                          onChange={(e) => handleQtyChange(idx, e.target.value)}
                          placeholder="Qty"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-center text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>

                      <div className="w-full min-w-0">
                        <input
                          type="number"
                          value={line.unit_price}
                          onChange={(e) => handlePriceChange(idx, Number(e.target.value))}
                          placeholder="Unit Price"
                          title="Negotiated Unit Price"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-right text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>

                      <div className="w-full text-right font-black text-xs text-slate-900 pr-2">
                        {formatKsh(line.line_amount)}
                      </div>

                      <button
                        type="button"
                        onClick={() => removeLine(idx)}
                        disabled={lines.length === 1}
                        className="p-2 text-slate-400 hover:text-rose-600 disabled:opacity-30 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {isOverStock && (
                      <div className="flex items-center space-x-1.5 text-[11px] font-semibold text-amber-700 bg-amber-50 p-1.5 rounded-lg border border-amber-200">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Warning: Quantity ({line.qty_entered}) exceeds current store stock ({prod?.qty_on_hand} {prod?.base_unit}).</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pricing Calculation Summary */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
            <div className="flex justify-between text-xs font-semibold text-slate-600">
              <span>Subtotal:</span>
              <span>{formatKsh(subtotal)}</span>
            </div>

            <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
              <span>Discount Allowed (KSh):</span>
              <input
                type="number"
                min="0"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value))}
                className="w-28 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-right font-bold text-xs"
              />
            </div>

            <div className="flex justify-between text-sm font-black text-slate-900 border-t border-slate-200 pt-2">
              <span>Net Invoice Total:</span>
              <span className="text-emerald-700">{formatKsh(total)}</span>
            </div>

            {/* Immediate Payment Posting Section */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 space-y-3 mt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  <span>Immediate Payment / Pay Now (Issue Receipt)</span>
                </span>
                <button
                  type="button"
                  onClick={handlePayInFull}
                  className="text-[11px] font-bold text-emerald-600 hover:underline cursor-pointer"
                >
                  Pay In Full ({formatKsh(total)})
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Amount Paid (KSh)</label>
                  <input
                    type="number"
                    min="0"
                    max={total}
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-emerald-700"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Payment Channel</label>
                  <SearchableSelect
                    value={paymentMethod}
                    placeholder="Select channel"
                    onChange={setPaymentMethod}
                    options={[
                      { value: 'M-Pesa', label: 'M-Pesa (Paybill 247247)' },
                      { value: 'Cash', label: 'Cash at Counter' },
                      { value: 'Bank Transfer', label: 'Bank Deposit' },
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">M-Pesa / Bank Code</label>
                  <input
                    type="text"
                    value={referenceCode}
                    onChange={(e) => setReferenceCode(e.target.value)}
                    placeholder={amountPaid > 0 && paymentMethod !== 'Cash' ? 'Required e.g. QJD928DKL' : 'Optional'}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-between text-xs font-black text-amber-600 border-t border-slate-200 pt-2">
              <span>Remaining Arrears (Credit to Follow Up):</span>
              <span>{formatKsh(balance)}</span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Invoice Remarks / Farm Delivery Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Delivered to farm gate in Ruiru"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-500/25 transition cursor-pointer"
            >
              {loading ? 'Posting...' : 'Save & Issue Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
