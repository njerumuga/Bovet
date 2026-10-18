import React from 'react';
import { Search, Bell, Plus, RefreshCw, ShoppingCart } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle: string;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onOpenNewSale?: () => void;
  onRefresh?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  searchTerm,
  onSearchChange,
  onOpenNewSale,
  onRefresh,
}) => {
  return (
    <header className="h-20 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0 no-print">
      <div>
        <h1 className="text-xl font-black text-slate-900 tracking-tight">{title}</h1>
        <p className="text-xs text-slate-500 font-medium">{subtitle}</p>
      </div>

      <div className="flex items-center space-x-4">
        {/* Global Search */}
        <div className="relative w-80">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search invoice, customer, SKU..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
          />
        </div>

        {/* Action Buttons */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            title="Refresh Data"
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}

        <button
          title="Notifications"
          className="relative p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 transition"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500"></span>
        </button>

        {onOpenNewSale && (
          <button
            onClick={onOpenNewSale}
            className="flex items-center space-x-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-500/25 transition transform active:scale-[0.98]"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>New Sale</span>
          </button>
        )}
      </div>
    </header>
  );
};
