import React, { useState } from 'react';
import {
  BriefcaseBusiness,
  Building,
  Check,
  Moon,
  Plus,
  RefreshCw,
  Sun,
  Zap
} from 'lucide-react';
import { api, setStoredTheme } from '../lib/api';

interface SettingsViewProps {
  business: any;
  branches: any[];
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onRefresh: () => void;
  notify: (msg: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  business,
  branches,
  theme,
  onToggleTheme,
  onRefresh,
  notify
}) => {
  const [newBranchName, setNewBranchName] = useState('');
  const [creatingBranch, setCreatingBranch] = useState(false);
  const [resettingDemo, setResettingDemo] = useState(false);

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName.trim()) return;

    setCreatingBranch(true);
    try {
      await api.createBranch({
        businessId: business.id,
        name: newBranchName.trim()
      });
      notify(`Branch "${newBranchName}" created!`);
      setNewBranchName('');
      onRefresh();
    } catch (err: any) {
      notify(err?.message || 'Failed to create branch');
    } finally {
      setCreatingBranch(false);
    }
  };

  const handleResetDemoData = async () => {
    if (!window.confirm('Reset demo store data? This will re-initialize the Countly Demo Store with all 6 calculation cases and duplicate conflict.')) {
      return;
    }
    setResettingDemo(true);
    try {
      await api.demoSeed();
      notify('Demo store data re-initialized!');
      onRefresh();
    } catch (err: any) {
      notify(err?.message || 'Failed to reset demo data');
    } finally {
      setResettingDemo(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Business Settings</h1>
        <p className="text-xs text-slate-500 mt-0.5">Manage business profile, branch locations, and system preferences</p>
      </div>

      {/* Business Profile */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <BriefcaseBusiness size={24} />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white">{business?.name || 'Store'}</h2>
            <p className="text-xs text-slate-500">Business ID: <span className="font-mono">{business?.id}</span></p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 pt-2">
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Access Role</span>
            <span className="text-xs font-bold text-slate-900 dark:text-white capitalize">{business?.role || 'owner'}</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Database Storage</span>
            <span className="text-xs font-bold text-emerald-600">Authoritative Cloudflare D1 / Persistent SQLite</span>
          </div>
        </div>
      </div>

      {/* Branch Management */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Store Branches</h3>
            <p className="text-xs text-slate-500">Independent locations with isolated stock levels and audits</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          {branches.map(br => (
            <div
              key={br.id}
              className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between"
            >
              <div>
                <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Building size={14} className="text-slate-400" />
                  <span>{br.name}</span>
                </div>
                {br.is_default === 1 && (
                  <span className="text-[10px] font-bold text-emerald-600">Default Main Location</span>
                )}
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleCreateBranch} className="flex gap-2 pt-2">
          <input
            type="text"
            required
            value={newBranchName}
            onChange={e => setNewBranchName(e.target.value)}
            placeholder="Add new branch location (e.g. Downtown Outlet)"
            className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            type="submit"
            disabled={creatingBranch}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition-all"
          >
            {creatingBranch ? 'Adding...' : 'Add Branch'}
          </button>
        </form>
      </div>

      {/* Appearance / Theme */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
        <div>
          <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Appearance Theme</h3>
          <p className="text-xs text-slate-500">Choose between clean light mode or high-contrast dark mode</p>
        </div>
        <button
          onClick={onToggleTheme}
          className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold flex items-center gap-2 transition-all"
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          <span>Switch to {theme === 'dark' ? 'Light' : 'Dark'} Mode</span>
        </button>
      </div>

      {/* Demo Reset Card */}
      <div className="p-6 rounded-3xl border border-amber-500/20 bg-amber-500/5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-600 font-extrabold text-sm">
            <Zap size={16} />
            <span>Interactive Demo Store Testing</span>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-lg">
            Re-seed the dedicated Countly Demo Store with fresh realistic test data covering all 6 mandatory calculation cases and duplicate count conflict.
          </p>
        </div>
        <button
          onClick={handleResetDemoData}
          disabled={resettingDemo}
          className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-md shadow-amber-500/20 shrink-0 transition-all flex items-center justify-center gap-2"
        >
          <RefreshCw size={14} className={resettingDemo ? 'animate-spin' : ''} />
          <span>Reset Demo Store Data</span>
        </button>
      </div>
    </div>
  );
};
