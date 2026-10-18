import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, KeyRound, Lock } from 'lucide-react';
import { apiFetch } from '../../api/client';
import { User } from '../../types';

interface AccountSettingsViewProps {
  currentUser: User;
}

export const AccountSettingsView: React.FC<AccountSettingsViewProps> = ({ currentUser }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);
    setError(null);

    if (newPassword.length < 12) {
      setError('The new password must be at least 12 characters long.');
      return;
    }
    if (newPassword !== confirmation) {
      setError('The new password and confirmation do not match.');
      return;
    }

    setLoading(true);
    try {
      await apiFetch<{ message: string }>('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmation('');
      setMessage('Password changed successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to change the password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-900">Account Settings</h2>
        <p className="text-sm text-slate-500 mt-1">Manage your account security and password.</p>
      </div>

      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-start space-x-4 pb-6 border-b border-slate-100">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Change password</h3>
            <p className="text-sm text-slate-500 mt-1">
              Signed in as <span className="font-semibold text-slate-700">{currentUser.email}</span>
            </p>
          </div>
        </div>

        {message && (
          <div className="mt-5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center space-x-2 text-emerald-700 text-sm font-semibold">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{message}</span>
          </div>
        )}
        {error && (
          <div className="mt-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center space-x-2 text-rose-700 text-sm font-semibold">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 max-w-xl space-y-5">
          <label className="block">
            <span className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Current password
            </span>
            <span className="relative block">
              <Lock className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-400" />
              <input
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                required
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white"
              />
            </span>
          </label>

          <label className="block">
            <span className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              New password
            </span>
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              minLength={12}
              required
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white"
            />
            <span className="block text-xs text-slate-400 mt-1">Use at least 12 characters.</span>
          </label>

          <label className="block">
            <span className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Confirm new password
            </span>
            <input
              type="password"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              minLength={12}
              required
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center space-x-2 px-5 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white text-sm font-bold rounded-xl shadow-md shadow-emerald-500/25 transition"
          >
            <KeyRound className="w-4 h-4" />
            <span>{loading ? 'Changing password...' : 'Change password'}</span>
          </button>
        </form>
      </section>
    </div>
  );
};
