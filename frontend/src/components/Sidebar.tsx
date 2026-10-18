import React from 'react';
import { Sprout, LayoutGrid, Receipt, Users, Box, BarChart3, LogOut, ShieldCheck, KeyRound } from 'lucide-react';
import { User } from '../types';

interface SidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  currentUser: User | null;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onTabChange, currentUser, onLogout }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
    { id: 'sales', label: 'Sales & Invoices', icon: Receipt },
    { id: 'customers', label: 'Customers & Arrears', icon: Users },
    { id: 'inventory', label: 'Inventory & Stock', icon: Box },
    { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
    { id: 'account', label: 'Account Settings', icon: KeyRound },
  ];

  return (
    <aside className="w-64 bg-darknav text-slate-300 flex flex-col justify-between shrink-0 no-print">
      {/* Brand */}
      <div>
        <div className="p-6 flex items-center space-x-3 border-b border-slate-800/80">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/30">
            <Sprout className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight leading-tight">BOVET AGRI</h2>
            <p className="text-[11px] font-semibold text-emerald-400 tracking-wider">VENTURES LTD</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
                  isActive
                    ? 'sidebar-active shadow-md shadow-emerald-600/30 font-bold'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* User profile & 2FA */}
      <div className="p-4 border-t border-slate-800/80 space-y-4">
        <div className="flex items-center justify-between text-xs px-2">
          <span className="text-slate-400">Security Status</span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse"></span>
            2FA Active
          </span>
        </div>

        <div className="flex items-center justify-between bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-full bg-slate-800 text-white font-bold flex items-center justify-center text-xs border border-slate-700">
              {currentUser?.name ? currentUser.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'AD'}
            </div>
            <div className="overflow-hidden">
              <div className="text-sm font-bold text-white truncate">{currentUser?.name || 'System Admin'}</div>
              <div className="text-[11px] text-slate-400 capitalize">{currentUser?.role || 'Administrator'}</div>
            </div>
          </div>
          <button
            onClick={() => onTabChange('account')}
            title="Change password"
            className="text-slate-400 hover:text-emerald-400 p-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            <KeyRound className="w-4 h-4" />
          </button>
          <button
            onClick={onLogout}
            title="Logout"
            className="text-slate-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
