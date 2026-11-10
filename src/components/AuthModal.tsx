import React, { useState } from 'react';
import { Boxes, Lock, Mail, Store, User, X, Zap } from 'lucide-react';
import { api, setStoredToken } from '../lib/api';
import type { UserSession } from '../lib/api';

interface AuthModalProps {
  isOpen: boolean;
  initialMode?: 'login' | 'register';
  onClose: () => void;
  onSuccess: (session: UserSession) => void;
  onOpenEmployeeJoin: () => void;
  notify: (msg: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialMode = 'login',
  onClose,
  onSuccess,
  onOpenEmployeeJoin,
  notify
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('General Retail');
  const [branchName, setBranchName] = useState('Main Store');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await api.login({ email, password });
        setStoredToken(res.token);
        onSuccess(res);
        notify(`Welcome back, ${res.user.displayName}`);
        onClose();
      } else {
        const res = await api.register({
          email,
          password,
          displayName,
          businessName,
          businessType,
          branchName
        });
        setStoredToken(res.token);
        onSuccess(res);
        notify(`Account created for ${businessName}!`);
        onClose();
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleFastDemoLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await api.demoLogin('owner');
      setStoredToken(res.token);
      onSuccess(res);
      notify('Logged in as Store Owner in Countly Demo Store');
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Could not log into demo account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
              <Boxes size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">
                {mode === 'login' ? 'Sign in to Countly' : 'Create Store Account'}
              </h3>
              <p className="text-[11px] text-slate-500">Universal Retail Stock Audit Platform</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Mode Toggle */}
        <div className="flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 mb-6">
          <button
            type="button"
            onClick={() => { setMode('login'); setError(''); }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${mode === 'login' ? 'bg-white dark:bg-slate-900 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setError(''); }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${mode === 'register' ? 'bg-white dark:bg-slate-900 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            Register Store
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs mb-4 leading-relaxed font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'register' && (
            <>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Store / Business Name *</label>
                <div className="relative">
                  <Store size={15} className="absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={businessName}
                    onChange={e => setBusinessName(e.target.value)}
                    placeholder="e.g. Apex Apparel Store"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Business Type</label>
                  <select
                    value={businessType}
                    onChange={e => setBusinessType(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option>General Retail</option>
                    <option>Clothing & Apparel</option>
                    <option>Footwear</option>
                    <option>Grocery & Supermarket</option>
                    <option>Electronics</option>
                    <option>Cosmetics</option>
                    <option>Hardware & Tools</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Primary Branch</label>
                  <input
                    type="text"
                    value={branchName}
                    onChange={e => setBranchName(e.target.value)}
                    placeholder="Main Store"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Your Full Name</label>
                <div className="relative">
                  <User size={15} className="absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Work Email Address *</label>
            <div className="relative">
              <Mail size={15} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="owner@store.com"
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Password (8+ chars) *</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2 mt-4"
          >
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In to Workspace' : 'Create Store Account'}
          </button>
        </form>

        {/* 1-Click Demo Login Button */}
        <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800 text-center space-y-3">
          <button
            type="button"
            onClick={handleFastDemoLogin}
            disabled={loading}
            className="w-full py-2 px-3 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-xs flex items-center justify-center gap-2 transition-all"
          >
            <Zap size={14} className="text-amber-500" />
            <span>1-Click Test: Countly Demo Store</span>
          </button>

          <div className="text-[11px] text-slate-500">
            Are you an employee with a join code?{' '}
            <button
              onClick={() => { onClose(); onOpenEmployeeJoin(); }}
              className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
            >
              Join Audit Here
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
