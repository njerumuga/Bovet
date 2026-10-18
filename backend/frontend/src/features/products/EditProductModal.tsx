import React, { useState } from 'react';
import { X, Box, AlertCircle } from 'lucide-react';
import { Product } from '../../types';
import { apiFetch } from '../../api/client';

interface EditProductModalProps {
  product: Product | null;
  onClose: () => void;
  onProductUpdated: () => void;
}

export const EditProductModal: React.FC<EditProductModalProps> = ({
  product,
  onClose,
  onProductUpdated,
}) => {
  if (!product) return null;

  const [name, setName] = useState(product.name);
  const [category, setCategory] = useState(product.category);
  const [baseUnit, setBaseUnit] = useState(product.base_unit);
  const [pricePerUnit, setPricePerUnit] = useState<number>(Number(product.price_per_unit));
  const [packSize, setPackSize] = useState<number | undefined>(
    product.pack_size ? Number(product.pack_size) : undefined
  );
  const [pricePerPack, setPricePerPack] = useState<number | undefined>(
    product.price_per_pack ? Number(product.price_per_pack) : undefined
  );
  const [lowStockLevel, setLowStockLevel] = useState<number>(Number(product.low_stock_level));
  const [status, setStatus] = useState(product.status || 'active');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await apiFetch(`/products/${product.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: name.trim(),
          category: category.trim(),
          base_unit: baseUnit.trim(),
          price_per_unit: pricePerUnit,
          pack_size: packSize || undefined,
          price_per_pack: pricePerPack || undefined,
          low_stock_level: lowStockLevel,
          status,
        }),
      });

      onProductUpdated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update product SKU');
      onProductUpdated();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden my-8">
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center text-white">
              <Box className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight">Edit SKU Details & Pricing</h3>
              <p className="text-xs text-blue-400 font-medium">{product.name}</p>
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

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Product Title / Description
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Animal Feeds">Animal Feeds</option>
                <option value="Mineral Salts">Mineral Salts & Blocks</option>
                <option value="Supplements">Supplements & Premixes</option>
                <option value="Bulk Feeds">Bulk Feeds (per kg)</option>
                <option value="Fertilizers">Fertilizers</option>
                <option value="Agri-Chemicals">Agri-Chemicals</option>
                <option value="Seeds">Seeds</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Base Measurement Unit
              </label>
              <select
                value={baseUnit}
                onChange={(e) => setBaseUnit(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Bags">Bags</option>
                <option value="Kgs">Kilograms (Kgs)</option>
                <option value="Blocks">Mineral Blocks</option>
                <option value="Litres">Litres (L)</option>
                <option value="Packets">Packets (Pkt)</option>
                <option value="Pieces">Pieces</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Price per Unit (KSh)
              </label>
              <input
                type="number"
                value={pricePerUnit}
                onChange={(e) => setPricePerUnit(Number(e.target.value))}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Pack Size (e.g. 50kg)
              </label>
              <input
                type="number"
                value={packSize || ''}
                onChange={(e) => setPackSize(e.target.value ? Number(e.target.value) : undefined)}
                placeholder="e.g. 50"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Price per Pack / Bag (KSh)
              </label>
              <input
                type="number"
                value={pricePerPack || ''}
                onChange={(e) => setPricePerPack(e.target.value ? Number(e.target.value) : undefined)}
                placeholder="e.g. 3100"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Low Stock Alert Limit
              </label>
              <input
                type="number"
                value={lowStockLevel}
                onChange={(e) => setLowStockLevel(Number(e.target.value))}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              SKU Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="active">Active (Available for Sale)</option>
              <option value="inactive">Archived / Inactive</option>
            </select>
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
              disabled={loading}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer"
            >
              {loading ? 'Saving...' : 'Update Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
