import React, { useState } from 'react';
import { Sprout, Mail, Lock, ShieldCheck, ArrowRight, KeyRound, AlertCircle } from 'lucide-react';
import { apiFetch } from '../../api/client';
import { User } from '../../types';

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [step, setStep] = useState<'credentials' | 'security_code'>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [securityCode, setSecurityCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await apiFetch<{ requires_otp: boolean }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      if (!response.requires_otp) {
        throw new Error('The server did not start two-factor authentication.');
      }
      setSecurityCode('');
      setStep('security_code');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send the sign-in code.');
    } finally {
      setLoading(false);
    }
  };

  const handleSecurityCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await apiFetch<{ access_token: string; user: User }>('/auth/otp/verify', {
        method: 'POST',
        body: JSON.stringify({ email, code: securityCode })
      });

      if (!res.access_token) {
        throw new Error('The server did not return an access token.');
      }
      localStorage.setItem('token', res.access_token);
      localStorage.setItem('user', JSON.stringify(res.user));
      onLoginSuccess(res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed. Check the code and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0B1528] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-emerald-500 rounded-2xl shadow-lg shadow-emerald-500/30 mb-4">
            <Sprout className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Bovet Agri Ventures</h1>
          <p className="text-emerald-400 text-sm mt-1 font-medium">Invoicing, Stock & Customer Management System</p>
        </div>

        {/* Auth Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 border border-slate-100">
          {error && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center space-x-2 text-rose-700 text-sm font-semibold">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {step === 'credentials' ? (
            <form onSubmit={handleCredentialsSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                    <Mail className="w-5 h-5" />
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white transition"
                    placeholder="Enter email address"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Password
                  </label>
                  <a href="#" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700">
                    Forgot password?
                  </a>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                    <Lock className="w-5 h-5" />
                  </span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white transition"
                    placeholder="Enter password"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.99] text-white font-bold rounded-xl shadow-lg shadow-emerald-500/25 flex items-center justify-center space-x-2 transition cursor-pointer"
              >
                <span>{loading ? 'Processing...' : 'Next: Security Code'}</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleSecurityCodeSubmit} className="space-y-5">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex items-start space-x-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-800">
                  <span className="font-bold">Two-Factor Authentication:</span>                   A one-time 6-digit sign-in code was sent to <b>{email}</b>. It expires shortly.
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Enter 6-Digit Security Code
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                    <KeyRound className="w-5 h-5" />
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={securityCode}
                    onChange={(e) => setSecurityCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    required
                    autoFocus
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border-2 border-emerald-500 rounded-xl text-slate-900 text-center tracking-widest text-lg font-bold focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white transition"
                    placeholder="Enter code"
                  />
                </div>
              </div>

              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setStep('credentials')}
                  className="w-1/3 py-3 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-2/3 py-3 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/25 flex items-center justify-center space-x-2 transition"
                >
                  <span>{loading ? 'Verifying...' : 'Verify & Enter'}</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center">
              <ShieldCheck className="w-4 h-4 text-emerald-500 mr-1.5" /> 2FA Enterprise Protection
            </span>
            <span>Meru / Nanyuki Hub</span>
          </div>
        </div>
      </div>
    </div>
  );
};
