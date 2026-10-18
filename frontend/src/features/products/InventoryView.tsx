import React, { useState } from 'react';
import { Plus, Search, PackagePlus, AlertTriangle, Edit2, FileDown, Trash2, RotateCcw } from 'lucide-react';
import { Product } from '../../types';
import { formatKsh } from '../../lib/utils';
import { EditProductModal } from './EditProductModal';
import { apiFetch } from '../../api/client';
import { PRODUCT_CATEGORIES } from './productOptions';

interface InventoryViewProps {
  products: Product[];
  onOpenAddProduct: () => void;
  onOpenRestock: (product: Product) => void;
  onProductUpdated?: () => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  products,
  onOpenAddProduct,
  onOpenRestock,
  onProductUpdated,
}) => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const categories = [
    'all',
    ...PRODUCT_CATEGORIES,
    ...Array.from(new Set(products.map((p) => p.category))),
  ];

  const filteredProducts = products.filter((p) => {
    const q = search.toLowerCase();
    const matchesSearch =
      p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
    const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const activeProducts = products.filter((p) => p.status === 'active');
  const lowStockCount = activeProducts.filter(
    (p) => Number(p.qty_on_hand) <= Number(p.low_stock_level)
  ).length;

  const totalValuation = activeProducts.reduce(
    (acc, p) => acc + Number(p.qty_on_hand || 0) * Number(p.price_per_unit || 0),
    0
  );

  const handleStatusChange = async (product: Product) => {
    const activating = product.status === 'inactive';
    const action = activating ? 'reactivate' : 'deactivate';
    if (!window.confirm(`Do you want to ${action} ${product.name}? Its stock and transaction history will be retained.`)) return;

    try {
      await apiFetch(`/products/${product.id}`, activating
        ? { method: 'PUT', body: JSON.stringify({ status: 'active' }) }
        : { method: 'DELETE' });
      onProductUpdated?.();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : `Unable to ${action} product.`);
    }
  };

  const handleExportCSV = () => {
    const headers = ["Product SKU", "Category", "Base Unit", "Price/Unit (KES)", "Pack Size", "Pack Price (KES)", "Qty On Hand", "Low Stock Alert Limit", "Status"];
    const rows = filteredProducts.map(p => [
      `"${p.name}"`,
      `"${p.category}"`,
      p.base_unit,
      p.price_per_unit,
      p.pack_size || '',
      p.price_per_pack || '',
      p.qty_on_hand,
      p.low_stock_level,
      p.status
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Bovet_Agri_Stock_Valuation_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Inventory Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase">Total Active SKUs</div>
            <div className="text-xl font-black text-slate-900 mt-1">{activeProducts.length} Products</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
            {activeProducts.length}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-rose-600 uppercase">Low Stock Alerts</div>
            <div className="text-xl font-black text-rose-600 mt-1">{lowStockCount} Items</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-emerald-600 uppercase">Total Store Valuation</div>
            <div className="text-xl font-black text-emerald-600 mt-1">
              {formatKsh(totalValuation)}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            KES
          </div>
        </div>
      </div>

      {/* Main Inventory Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3 flex-1">
            <div className="relative flex-1 max-w-sm">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products by SKU name or category..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
              />
            </div>

            <div className="flex gap-2">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 capitalize focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c === 'all' ? 'All Categories' : c}
                  </option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === 'all' || value === 'active' || value === 'inactive') {
                    setStatusFilter(value);
                  }
                }}
                className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="all">All statuses</option>
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center space-x-1.5 px-3.5 py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              <FileDown className="w-4 h-4 text-slate-500" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={onOpenAddProduct}
              className="flex items-center justify-center space-x-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-500/25 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Product SKU</span>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <th className="px-6 py-4">Product Name</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Base Unit</th>
                <th className="px-6 py-4">Price / Unit</th>
                <th className="px-6 py-4">Pack Size & Price</th>
                <th className="px-6 py-4">Qty On Hand</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400 font-medium">
                    No products found matching filter criteria.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const isLow = Number(p.qty_on_hand) <= Number(p.low_stock_level);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-6 py-4 font-black text-slate-900">{p.name}</td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-bold rounded-lg text-[11px]">
                          {p.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-medium">{p.base_unit}</td>
                      <td className="px-6 py-4 font-black text-slate-900">{formatKsh(p.price_per_unit)}</td>
                      <td className="px-6 py-4 text-slate-600">
                        {p.pack_size ? `${p.pack_size} ${p.base_unit} (${formatKsh(p.price_per_pack)})` : '-'}
                      </td>
                      <td className="px-6 py-4 font-black text-slate-900">
                        {p.qty_on_hand} {p.base_unit}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs ${
                          p.status === 'inactive' ? 'bg-slate-100 text-slate-600' : isLow ? 'badge-low-stock' : 'badge-in-stock'
                        }`}>
                          {p.status === 'inactive' ? 'INACTIVE' : isLow ? 'LOW STOCK' : 'IN STOCK'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-1.5 whitespace-nowrap">
                        {p.status === 'active' && <button
                          onClick={() => onOpenRestock(p)}
                          className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-lg transition inline-flex items-center space-x-1 cursor-pointer"
                        >
                          <PackagePlus className="w-3.5 h-3.5" />
                          <span>Restock</span>
                        </button>}
                        <button
                          onClick={() => setEditingProduct(p)}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:text-blue-700 hover:bg-blue-50 text-xs font-bold transition inline-flex items-center space-x-1 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleStatusChange(p)}
                          className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold transition inline-flex items-center space-x-1 cursor-pointer ${
                            p.status === 'inactive'
                              ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                              : 'border-rose-200 text-rose-700 hover:bg-rose-50'
                          }`}
                          title={p.status === 'inactive' ? 'Reactivate product' : 'Deactivate product'}
                        >
                          {p.status === 'inactive' ? <RotateCcw className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
                          <span>{p.status === 'inactive' ? 'Reactivate' : 'Deactivate'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingProduct && (
        <EditProductModal
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
          onProductUpdated={() => {
            if (onProductUpdated) onProductUpdated();
            setEditingProduct(null);
          }}
        />
      )}
    </div>
  );
};
