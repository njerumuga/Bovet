import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Customer } from '../../types';
import { apiFetch } from '../../api/client';

interface EditCustomerModalProps {
  customer: Customer;
  onClose: () => void;
  onCustomerUpdated?: () => void;
}

export const EditCustomerModal: React.FC<EditCustomerModalProps> = ({
  customer,
  onClose,
  onCustomerUpdated,
}) => {
  const [form, setForm] = useState({
    name: customer.name,
    phone: customer.phone,
    location: customer.location,
    email: customer.email || '',
    notes: customer.notes || '',
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await apiFetch(`/customers/${customer.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          location: form.location,
          email: form.email || null,
          notes: form.notes || null,
        }),
      });
      onCustomerUpdated?.();
      onClose();
    } catch (error: any) {
      alert(error.message || 'Failed to update customer');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h3 className="text-lg font-black text-slate-900">Edit customer</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="text-xs font-bold text-slate-600">
              Name
              <input value={form.name} onChange={(e) => handleChange('name', e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </label>
            <label className="text-xs font-bold text-slate-600">
              Phone
              <input value={form.phone} onChange={(e) => handleChange('phone', e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </label>
            <label className="text-xs font-bold text-slate-600 md:col-span-2">
              Location
              <input value={form.location} onChange={(e) => handleChange('location', e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </label>
            <label className="text-xs font-bold text-slate-600 md:col-span-2">
              Email
              <input value={form.email} onChange={(e) => handleChange('email', e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </label>
            <label className="text-xs font-bold text-slate-600 md:col-span-2">
              Notes
              <textarea value={form.notes} onChange={(e) => handleChange('notes', e.target.value)} rows={3} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
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
