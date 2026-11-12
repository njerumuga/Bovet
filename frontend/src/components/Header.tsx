import React, { useState } from 'react';
import { Search, Bell, RefreshCw, ShoppingCart, Receipt } from 'lucide-react';
import { AppNotification } from '../types';

interface HeaderProps {
  title: string;
  subtitle: string;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onOpenNewSale?: () => void;
  onOpenWalkInSale?: () => void;
  onRefresh?: () => Promise<void>;
  notifications?: AppNotification[];
}

export const Header: React.FC<HeaderProps> = ({
                                                title,
                                                subtitle,
                                                searchTerm,
                                                onSearchChange,
                                                onOpenNewSale,
                                                onOpenWalkInSale,
                                                onRefresh,
                                                notifications = [],
                                              }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (!onRefresh || refreshing) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  return (
      <header className="h-20 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0 no-print">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">{title}</h1>
          <p className="text-xs text-slate-500 font-medium">{subtitle}</p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Global Search */}
          <div className="relative w-72">
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

          {/* Refresh */}
          {onRefresh && (
              <button
                  onClick={handleRefresh}
                  title="Refresh Data"
                  className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 transition cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
          )}

          {/* Notifications */}
          <div className="relative">
            <button
                title="Notifications"
                onClick={() => setShowNotifications((open) => !open)}
                className="relative p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 transition cursor-pointer"
            >
              <Bell className="w-4 h-4" />
              {notifications.length > 0 && <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500"></span>}
            </button>
            {showNotifications && (
                <div className="absolute right-0 top-12 z-50 w-80 rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900">Notifications</span>
                    <span className="text-[10px] font-bold text-slate-400">{notifications.length} active</span>
                  </div>
                  {notifications.length === 0 ? (
                      <p className="p-3 text-xs text-slate-500">No new notifications.</p>
                  ) : (
                      <div className="max-h-72 space-y-2 overflow-y-auto">
                        {notifications.map((notification) => (
                            <div key={notification.id} className="rounded-lg bg-slate-50 p-2.5">
                              <p className={`text-xs font-bold ${notification.tone === 'warning' ? 'text-amber-700' : notification.tone === 'success' ? 'text-emerald-700' : 'text-slate-800'}`}>
                                {notification.title}
                              </p>
                              <p className="mt-0.5 text-[11px] text-slate-500">{notification.message}</p>
                            </div>
                        ))}
                      </div>
                  )}
                </div>
            )}
          </div>

          {/* Quick Walk-In Cash Receipt */}
          {onOpenWalkInSale && (
              <button
                  onClick={onOpenWalkInSale}
                  className="flex items-center space-x-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-md shadow-amber-500/25 transition transform active:scale-[0.98] cursor-pointer"
              >
                <Receipt className="w-4 h-4" />
                <span>Cash Receipt</span>
              </button>
          )}

          {/* Regular Customer Invoice Sale */}
          {onOpenNewSale && (
              <button
                  onClick={onOpenNewSale}
                  className="flex items-center space-x-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-500/25 transition transform active:scale-[0.98] cursor-pointer"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>New Sale</span>
              </button>
          )}
        </div>
      </header>
  );
};