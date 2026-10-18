import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Product } from '../../types';
import { apiFetch } from '../../api/client';
import { PRODUCT_CATEGORIES, PRODUCT_UNITS } from './productOptions';

interface EditProductModalProps {
  product: Product;
  onClose: () => void;
  onProductUpdated?: () => void;
}

export const EditProductModal: React.FC<EditProductModalProps> = ({
  product,
  onClose,
  onProductUpdated,
}) => {
  const [form, setForm] = useState({
    name: product.name,
    category: product.category,
    base_unit: product.base_unit,
    pack_size: String(product.pack_size ?? ''),
    price_per_unit: String(product.price_per_unit ?? ''),
    price_per_pack: String(product.price_per_pack ?? ''),
    low_stock_level: String(product.low_stock_level ?? ''),
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await apiFetch(`/products/${product.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: form.name,
          category: form.category,
          base_unit: form.base_unit,
          pack_size: form.pack_size ? Number(form.pack_size) : null,
          price_per_unit: Number(form.price_per_unit),
          price_per_pack: form.price_per_pack ? Number(form.price_per_pack) : null,
          low_stock_level: form.low_stock_level ? Number(form.low_stock_level) : 0,
        }),
      });
      onProductUpdated?.();
      onClose();
    } catch (error: any) {
      alert(error.message || 'Failed to update product');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h3 className="text-lg font-black text-slate-900">Edit product</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="text-xs font-bold text-slate-600 md:col-span-2">
              Name
              <input value={form.name} onChange={(e) => handleChange('name', e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </label>
            <label className="text-xs font-bold text-slate-600">
              Category
              <select value={form.category} onChange={(e) => handleChange('category', e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                {!PRODUCT_CATEGORIES.includes(form.category as typeof PRODUCT_CATEGORIES[number]) && (
                  <option value={form.category}>{form.category}</option>
                )}
                {PRODUCT_CATEGORIES.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
            <label className="text-xs font-bold text-slate-600">
              Base unit
              <select value={form.base_unit} onChange={(e) => handleChange('base_unit', e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                {!PRODUCT_UNITS.includes(form.base_unit as typeof PRODUCT_UNITS[number]) && (
                  <option value={form.base_unit}>{form.base_unit}</option>
                )}
                {PRODUCT_UNITS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
            <label className="text-xs font-bold text-slate-600">
              Pack size
              <input value={form.pack_size} onChange={(e) => handleChange('pack_size', e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </label>
            <label className="text-xs font-bold text-slate-600">
              Price / unit
              <input value={form.price_per_unit} onChange={(e) => handleChange('price_per_unit', e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </label>
            <label className="text-xs font-bold text-slate-600">
              Pack price
              <input value={form.price_per_pack} onChange={(e) => handleChange('price_per_pack', e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </label>
            <label className="text-xs font-bold text-slate-600">
              Low stock level
              <input value={form.low_stock_level} onChange={(e) => handleChange('low_stock_level', e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-200 bg-slate-50">
          <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-700 rounded-xl border border-slate-200 bg-white">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm font-bold text-white rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60">
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
};
