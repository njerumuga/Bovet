import React, { useEffect, useState } from 'react';
import { X, Plus, Trash2, Receipt as ReceiptIcon, AlertCircle, AlertTriangle, Banknote, Smartphone, Building2 } from 'lucide-react';
import { Product, InvoiceLine, Receipt } from '../../types';
import { formatKsh } from '../../lib/utils';
import { apiFetch } from '../../api/client';
import { SearchableSelect } from '../../components/SearchableSelect';

interface WalkInSaleModalProps {
    isOpen: boolean;
    onClose: () => void;
    products: Product[];
    onReceiptIssued: (receipt: Receipt) => void;
}

export const WalkInSaleModal: React.FC<WalkInSaleModalProps> = ({
                                                                    isOpen,
                                                                    onClose,
                                                                    products,
                                                                    onReceiptIssued,
                                                                }) => {
    const [buyerName, setBuyerName] = useState<string>('');
    const [saleDate, setSaleDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [lines, setLines] = useState<InvoiceLine[]>([]);
    const [discount, setDiscount] = useState<number>(0);
    const [paymentMethod, setPaymentMethod] = useState<string>('Cash');
    const [referenceCode, setReferenceCode] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const activeProducts = products.filter((p) => p.status === 'active');

    useEffect(() => {
        if (!isOpen) return;
        const first = activeProducts[0];
        setBuyerName('');
        setSaleDate(new Date().toISOString().split('T')[0]);
        setLines(
            first
                ? [
                    {
                        product_id: first.id,
                        product_name: first.name,
                        sell_unit: first.base_unit,
                        qty_entered: 1,
                        unit_price: Number(first.price_per_unit || 0),
                        list_price: Number(first.price_per_unit || 0),
                        line_amount: Number(first.price_per_unit || 0),
                    },
                ]
                : []
        );
        setDiscount(0);
        setPaymentMethod('Cash');
        setReferenceCode('');
        setError(null);
    }, [isOpen, products]);

    if (!isOpen) return null;

    const handleProductChange = (index: number, prodId: number) => {
        const prod = activeProducts.find((p) => p.id === prodId);
        if (!prod) return;
        const updated = [...lines];
        updated[index] = {
            ...updated[index],
            product_id: prod.id,
            product_name: prod.name,
            sell_unit: prod.base_unit,
            unit_price: Number(prod.price_per_unit),
            list_price: Number(prod.price_per_unit),
            line_amount: Number(updated[index].qty_entered) * Number(prod.price_per_unit),
        };
        setLines(updated);
    };

    const handleUnitToggle = (index: number, usePack: boolean) => {
        const line = lines[index];
        const prod = activeProducts.find((p) => p.id === line.product_id);
        if (!prod) return;

        const updated = [...lines];
        if (usePack && prod.pack_size && Number(prod.pack_size) > 1) {
            updated[index].sell_unit = `${prod.pack_size}${prod.base_unit} Pack`;
            updated[index].unit_price = Number(prod.price_per_pack || prod.price_per_unit);
        } else {
            updated[index].sell_unit = prod.base_unit;
            updated[index].unit_price = Number(prod.price_per_unit);
        }
        updated[index].line_amount = Number(updated[index].qty_entered) * updated[index].unit_price;
        setLines(updated);
    };

    const handleQtyChange = (index: number, rawQty: string) => {
        const qty = rawQty === '' ? 0 : Number(rawQty);
        const updated = [...lines];
        updated[index].qty_entered = qty;
        updated[index].line_amount = qty * Number(updated[index].unit_price);
        setLines(updated);
    };

    const handlePriceChange = (index: number, price: number) => {
        const updated = [...lines];
        updated[index].unit_price = price;
        updated[index].line_amount = Number(updated[index].qty_entered) * price;
        setLines(updated);
    };

    const addLine = () => {
        const first = activeProducts[0];
        if (!first) return;
        setLines([
            ...lines,
            {
                product_id: first.id,
                product_name: first.name,
                sell_unit: first.base_unit,
                qty_entered: 1,
                unit_price: Number(first.price_per_unit || 0),
                list_price: Number(first.price_per_unit || 0),
                line_amount: Number(first.price_per_unit || 0),
            },
        ]);
    };

    const removeLine = (index: number) => {
        if (lines.length === 1) return;
        setLines(lines.filter((_, i) => i !== index));
    };

    const subtotal = lines.reduce((acc, l) => acc + l.line_amount, 0);
    const total = Math.max(0, subtotal - discount);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            if (lines.length === 0) {
                throw new Error('Add at least one item to issue a receipt.');
            }
            if (paymentMethod !== 'Cash' && !referenceCode.trim()) {
                throw new Error(`Enter the ${paymentMethod} reference code.`);
            }

            const createdReceipt = await apiFetch<Receipt>('/invoices/walk-in-receipt', {
                method: 'POST',
                body: JSON.stringify({
                    buyer_name: buyerName.trim() || undefined,
                    invoice_date: saleDate,
                    lines: lines.map((l) => ({
                        product_id: l.product_id,
                        sell_unit: l.sell_unit,
                        qty_entered: l.qty_entered,
                        unit_price: l.unit_price,
                    })),
                    discount,
                    payment_method: paymentMethod,
                    reference_code: paymentMethod === 'Cash' ? undefined : referenceCode.trim(),
                }),
            });

            onReceiptIssued(createdReceipt);
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to issue cash receipt');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-3xl overflow-hidden my-8">
                {/* Header */}
                <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-white">
                            <ReceiptIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black tracking-tight">Quick Walk-In Cash Receipt</h3>
                            <p className="text-xs text-amber-300 font-medium">Instant counter sale • Deducts stock & prints receipt (no credit)</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {error && (
                        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center space-x-2 text-rose-700 text-xs font-semibold">
                            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Optional Buyer Name & Date */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                Walk-In Buyer Name (Optional)
                            </label>
                            <input
                                type="text"
                                value={buyerName}
                                onChange={(e) => setBuyerName(e.target.value)}
                                placeholder="Leave blank for Walk-In Customer"
                                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                Receipt Date
                            </label>
                            <input
                                type="date"
                                value={saleDate}
                                onChange={(e) => setSaleDate(e.target.value)}
                                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>
                    </div>

                    {/* Items */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                                Items Purchased
                            </label>
                            <button
                                type="button"
                                onClick={addLine}
                                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center space-x-1 cursor-pointer"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add Item</span>
                            </button>
                        </div>

                        <div className="space-y-3">
                            {lines.map((line, idx) => {
                                const prod = activeProducts.find((p) => p.id === line.product_id);
                                const isOverStock = prod && Number(line.qty_entered) > Number(prod.qty_on_hand);
                                const hasPack = prod?.pack_size && Number(prod.pack_size) > 1;

                                return (
                                    <div key={idx} className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                                        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto_5.5rem_6.5rem_auto_auto] items-start md:items-center gap-2">
                                            <div className="min-w-0 w-full">
                                                <SearchableSelect
                                                    value={line.product_id}
                                                    onChange={(value) => handleProductChange(idx, Number(value))}
                                                    options={activeProducts.map((p) => ({
                                                        value: p.id,
                                                        label: `${p.name} - Stock: ${p.qty_on_hand} ${p.base_unit}`,
                                                    }))}
                                                    compact
                                                    className="w-full"
                                                />
                                            </div>

                                            {hasPack && (
                                                <div className="flex items-center space-x-1 shrink-0">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleUnitToggle(idx, false)}
                                                        className={`px-2 py-1.5 rounded-lg text-[11px] font-bold transition ${
                                                            line.sell_unit === prod?.base_unit
                                                                ? 'bg-emerald-600 text-white shadow-sm'
                                                                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                                                        }`}
                                                    >
                                                        {prod?.base_unit}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleUnitToggle(idx, true)}
                                                        className={`px-2 py-1.5 rounded-lg text-[11px] font-bold transition ${
                                                            line.sell_unit !== prod?.base_unit
                                                                ? 'bg-emerald-600 text-white shadow-sm'
                                                                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                                                        }`}
                                                    >
                                                        {prod?.pack_size}{prod?.base_unit} Bag
                                                    </button>
                                                </div>
                                            )}

                                            <input
                                                type="number"
                                                min="0.1"
                                                step="any"
                                                value={line.qty_entered === 0 ? '' : line.qty_entered}
                                                onChange={(e) => handleQtyChange(idx, e.target.value)}
                                                placeholder="Qty"
                                                className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-center text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                            />

                                            <input
                                                type="number"
                                                value={line.unit_price}
                                                onChange={(e) => handlePriceChange(idx, Number(e.target.value))}
                                                placeholder="Price"
                                                className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-right text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                            />

                                            <div className="w-full text-right font-black text-xs text-slate-900 pr-1">
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
                                                <span>Only {prod?.qty_on_hand} {prod?.base_unit} available in stock.</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Payment Method & Totals */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2">
                                Payment Method (Paid in Full)
                            </label>
                            <div className="grid grid-cols-3 gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => setPaymentMethod('Cash')}
                                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold border transition cursor-pointer ${
                                        paymentMethod === 'Cash'
                                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                                    }`}
                                >
                                    <Banknote className="w-4 h-4" />
                                    <span>Cash</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPaymentMethod('M-Pesa')}
                                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold border transition cursor-pointer ${
                                        paymentMethod === 'M-Pesa'
                                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                                    }`}
                                >
                                    <Smartphone className="w-4 h-4" />
                                    <span>M-Pesa (400200)</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPaymentMethod('Bank Transfer')}
                                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold border transition cursor-pointer ${
                                        paymentMethod === 'Bank Transfer'
                                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                                    }`}
                                >
                                    <Building2 className="w-4 h-4" />
                                    <span>Co-op Bank</span>
                                </button>
                            </div>
                        </div>

                        {paymentMethod !== 'Cash' && (
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                                    {paymentMethod === 'M-Pesa' ? 'M-Pesa Code (Paybill 400200 • Acc 40019435)' : 'Co-op Bank Reference (01192943536900)'}
                                </label>
                                <input
                                    type="text"
                                    value={referenceCode}
                                    maxLength={10}
                                    onChange={(e) => setReferenceCode(e.target.value.replace(/[^A-Z0-9]/gi, '').slice(0, 10).toUpperCase())}
                                    placeholder="e.g. QJD928DKL1"
                                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                        )}

                        <div className="space-y-1.5 border-t border-slate-200 pt-3">
                            <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                                <span>Discount (KSh):</span>
                                <input
                                    type="number"
                                    min="0"
                                    value={discount}
                                    onChange={(e) => setDiscount(Number(e.target.value))}
                                    className="w-28 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-right font-bold text-xs"
                                />
                            </div>
                            <div className="flex justify-between items-center text-base font-black text-slate-900 pt-1">
                                <span>Total Cash Paid:</span>
                                <span className="text-emerald-600 text-lg">{formatKsh(total)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end space-x-3 pt-2 border-t border-slate-100">
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
                            className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black rounded-xl shadow-md shadow-amber-500/25 transition cursor-pointer"
                        >
                            {loading ? 'Issuing Receipt...' : 'Issue Cash Receipt'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};