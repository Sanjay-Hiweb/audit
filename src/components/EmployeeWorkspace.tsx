import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Boxes,
  Check,
  CheckCircle2,
  ChevronDown,
  CornerDownLeft,
  KeyRound,
  LogOut,
  Package,
  Plus,
  RefreshCw,
  Search,
  Send,
  Smartphone,
  Tag,
  X
} from 'lucide-react';
import { api, getStoredEmpToken, setStoredEmpToken } from '../lib/api';
import type { EmployeeSessionData } from '../lib/api';

interface EmployeeWorkspaceProps {
  onBackToHome: () => void;
  notify: (msg: string) => void;
}

export const EmployeeWorkspace: React.FC<EmployeeWorkspaceProps> = ({ onBackToHome, notify }) => {
  const [session, setSession] = useState<EmployeeSessionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Join form state
  const [code, setCode] = useState('');
  const [pin, setPin] = useState('');
  const [employeeName, setEmployeeName] = useState('');

  // Workspace state
  const [auditData, setAuditData] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [savingVariantId, setSavingVariantId] = useState<string | null>(null);

  // Missing product modal
  const [showProductModal, setShowProductModal] = useState(false);
  const [missingForm, setMissingForm] = useState({
    name: '',
    sku: '',
    barcode: '',
    category: 'General',
    variant: 'Standard',
    quantity: '0',
    note: ''
  });

  // Check existing session
  useEffect(() => {
    const existing = getStoredEmpToken();
    if (existing) {
      loadEmployeeAudit();
    }
  }, []);

  const handleJoin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.employeeJoin({
        code: code.trim().toUpperCase(),
        pin: pin.trim(),
        employeeName: employeeName.trim()
      });
      setStoredEmpToken(res.employeeToken);
      setSession(res);
      notify(`Joined audit: ${res.assignment.auditName}`);
      await loadEmployeeAudit();
    } catch (err: any) {
      setError(err?.message || 'Invalid audit code or PIN. Please verify with your store manager.');
    } finally {
      setLoading(false);
    }
  };

  const loadEmployeeAudit = async () => {
    setLoading(true);
    try {
      const res = await api.getEmployeeAudit();
      setAuditData(res.audit);
      setItems(res.items);
    } catch (err: any) {
      setStoredEmpToken(null);
      setSession(null);
      setError('Session expired or audit no longer active.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCount = async (variantId: string, quantity: number, note?: string) => {
    if (isNaN(quantity) || quantity < 0) {
      notify('Enter a valid non-negative quantity. Zero (0) is valid.');
      return;
    }

    setSavingVariantId(variantId);
    try {
      await api.employeeSaveCount({ variantId, quantity, note });
      // Update local item
      setItems(prev =>
        prev.map(item =>
          item.variant_id === variantId
            ? { ...item, my_count: quantity, my_note: note, entry_status: 'submitted' }
            : item
        )
      );
      notify(`Count saved: ${quantity}`);
    } catch (err: any) {
      notify(err?.message || 'Failed to save count. Please retry.');
    } finally {
      setSavingVariantId(null);
    }
  };

  const handleSubmitAssignment = async () => {
    if (!window.confirm('Are you ready to submit your count entries to the store manager? You can still update them if needed.')) {
      return;
    }

    setLoading(true);
    try {
      await api.employeeSubmit();
      notify('All counts successfully submitted to store manager!');
      await loadEmployeeAudit();
    } catch (err: any) {
      notify(err?.message || 'Failed to submit assignment.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProductRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!missingForm.name.trim()) return;

    setLoading(true);
    try {
      await api.employeeRequestProduct({
        ...missingForm,
        quantity: Number(missingForm.quantity) || 0
      });
      notify('Missing product request sent to manager for approval.');
      setShowProductModal(false);
      setMissingForm({ name: '', sku: '', barcode: '', category: 'General', variant: 'Standard', quantity: '0', note: '' });
    } catch (err: any) {
      notify(err?.message || 'Failed to submit product request.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoJoin = () => {
    setCode('DEMO26');
    setPin('1234');
    setEmployeeName('Alex Rivera');
  };

  const categories = ['All', ...Array.from(new Set(items.map(i => i.category_name || 'General')))];

  const filteredItems = items.filter(item => {
    const matchesCat = selectedCategory === 'All' || (item.category_name || 'General') === selectedCategory;
    const query = search.toLowerCase();
    const matchesQuery =
      !search ||
      item.product_name.toLowerCase().includes(query) ||
      (item.variant_sku && item.variant_sku.toLowerCase().includes(query)) ||
      (item.variant_label && item.variant_label.toLowerCase().includes(query));
    return matchesCat && matchesQuery;
  });

  const countedCount = items.filter(i => i.my_count !== null && i.my_count !== undefined).length;
  const progressPercent = items.length ? Math.round((countedCount / items.length) * 100) : 0;

  // View 1: Join Page
  if (!auditData) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center px-4 py-8">
        <div className="max-w-md w-full mx-auto space-y-6">
          <button
            onClick={onBackToHome}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={16} />
            <span>Back to Countly Home</span>
          </button>

          <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-lg shadow-emerald-500/20">
                <Smartphone size={24} />
              </div>
              <div>
                <h1 className="text-xl font-black text-white">Employee Stock Counter</h1>
                <p className="text-xs text-slate-400">Join your assigned store audit</p>
              </div>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">6-Digit Audit Join Code *</label>
                <div className="relative">
                  <KeyRound size={16} className="absolute left-3.5 top-3.5 text-slate-500" />
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={code}
                    onChange={e => setCode(e.target.value.toUpperCase())}
                    placeholder="e.g. DEMO26"
                    className="w-full pl-10 pr-3 py-3 text-sm font-mono font-bold uppercase rounded-xl border border-slate-800 bg-slate-900 text-white tracking-widest focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Your 4-Digit Employee PIN *</label>
                <input
                  type="password"
                  inputMode="numeric"
                  required
                  maxLength={6}
                  value={pin}
                  onChange={e => setPin(e.target.value)}
                  placeholder="••••"
                  className="w-full px-4 py-3 text-lg font-mono font-bold tracking-widest rounded-xl border border-slate-800 bg-slate-900 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-center"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Your Name (Optional)</label>
                <input
                  type="text"
                  value={employeeName}
                  onChange={e => setEmployeeName(e.target.value)}
                  placeholder="e.g. Alex Rivera"
                  className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-800 bg-slate-900 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
              >
                {loading ? 'Verifying access...' : 'Open Counting Workspace'}
              </button>
            </form>

            <div className="pt-4 border-t border-slate-800 text-center">
              <button
                type="button"
                onClick={handleDemoJoin}
                className="text-xs text-amber-400 hover:underline font-bold"
              >
                Auto-fill Demo Credentials (DEMO26 / 1234)
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // View 2: Mobile Counting Workspace
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-28">
      {/* Sticky Header */}
      <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <h1 className="font-extrabold text-sm text-white truncate max-w-[200px] sm:max-w-xs">{auditData.name}</h1>
            </div>
            <p className="text-[11px] text-slate-400">Auditor: <strong className="text-emerald-400">{auditData.employeeName}</strong></p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => { setStoredEmpToken(null); setAuditData(null); onBackToHome(); }}
              className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 transition-colors"
              title="Exit Counting Session"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="max-w-2xl mx-auto mt-2.5">
          <div className="flex justify-between text-[10px] text-slate-400 font-bold mb-1">
            <span>{countedCount} of {items.length} items counted</span>
            <span className="text-emerald-400 font-mono">{progressPercent}%</span>
          </div>
          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>
      </header>

      {/* Main Workspace Controls */}
      <main className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-3 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by product name, SKU, variant..."
            className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-slate-800 bg-slate-900 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Category Pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${selectedCategory === cat ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'}`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Product Cards List (Mobile-Optimized Touch Targets >= 44px) */}
        <div className="space-y-3">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              No products found matching your search.
            </div>
          ) : (
            filteredItems.map(item => (
              <ItemCountCard
                key={item.variant_id}
                item={item}
                isSaving={savingVariantId === item.variant_id}
                onSave={handleSaveCount}
              />
            ))
          )}
        </div>
      </main>

      {/* Floating Bottom Bar */}
      <div className="fixed bottom-0 inset-x-0 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 p-3 z-30">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button
            onClick={() => setShowProductModal(true)}
            className="flex-1 py-3 px-3 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
          >
            <Plus size={16} className="text-emerald-400" />
            <span>Missing Item?</span>
          </button>
          <button
            onClick={handleSubmitAssignment}
            className="flex-1 py-3 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/30 transition-all"
          >
            <Send size={15} />
            <span>Submit Count</span>
          </button>
        </div>
      </div>

      {/* Missing Product Request Modal */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                <Plus size={16} className="text-emerald-400" />
                <span>Request Missing Product</span>
              </h3>
              <button onClick={() => setShowProductModal(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Found physical stock that isn't in this audit? Report it to your store manager for verification.
            </p>
            <form onSubmit={handleCreateProductRequest} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  value={missingForm.name}
                  onChange={e => setMissingForm({ ...missingForm, name: e.target.value })}
                  placeholder="e.g. Vintage Denim Jacket"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-800 bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">SKU / Code</label>
                  <input
                    type="text"
                    value={missingForm.sku}
                    onChange={e => setMissingForm({ ...missingForm, sku: e.target.value })}
                    placeholder="Optional"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-800 bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Variant (Size/Color)</label>
                  <input
                    type="text"
                    value={missingForm.variant}
                    onChange={e => setMissingForm({ ...missingForm, variant: e.target.value })}
                    placeholder="e.g. M / Blue"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-800 bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Physical Quantity Counted *</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={missingForm.quantity}
                  onChange={e => setMissingForm({ ...missingForm, quantity: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-800 bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Notes / Location</label>
                <input
                  type="text"
                  value={missingForm.note}
                  onChange={e => setMissingForm({ ...missingForm, note: e.target.value })}
                  placeholder="e.g. Found on clearance rack"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-800 bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-800 text-xs font-bold text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

interface ItemCountCardProps {
  item: any;
  isSaving: boolean;
  onSave: (variantId: string, quantity: number, note?: string) => void;
}

const ItemCountCard: React.FC<ItemCountCardProps> = ({ item, isSaving, onSave }) => {
  const [val, setVal] = useState<string>(
    item.my_count !== null && item.my_count !== undefined ? String(item.my_count) : ''
  );
  const [note, setNote] = useState<string>(item.my_note || '');
  const [showNoteInput, setShowNoteInput] = useState(false);

  const isCounted = item.my_count !== null && item.my_count !== undefined;
  const isRecountRequested = item.entry_status === 'recount_requested';

  const handleStep = (delta: number) => {
    const cur = Number(val) || 0;
    const next = Math.max(0, cur + delta);
    setVal(String(next));
  };

  const handleCommit = () => {
    if (val === '') return;
    onSave(item.variant_id, Number(val), note);
  };

  return (
    <div
      className={`p-4 rounded-2xl border transition-all ${isRecountRequested ? 'border-amber-500/60 bg-amber-950/20' : isCounted ? 'border-emerald-900/40 bg-slate-900/80' : 'border-slate-800/80 bg-slate-900/40'}`}
    >
      {/* Recount banner if requested */}
      {isRecountRequested && (
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-400 mb-2">
          <AlertTriangle size={14} />
          <span>Recount requested by manager: {item.my_note || 'Please re-verify shelf quantity'}</span>
        </div>
      )}

      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-400">
              {item.category_name || 'General'}
            </span>
            {item.variant_sku && (
              <span className="text-[10px] font-mono text-slate-500">{item.variant_sku}</span>
            )}
          </div>
          <h3 className="font-extrabold text-sm text-white mt-1 truncate">{item.product_name}</h3>
          <p className="text-xs text-emerald-400 font-medium">Variant: {item.variant_label || 'Standard'}</p>
        </div>

        {/* Count Status Badge */}
        {isCounted ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Check size={12} />
            <span>Saved {item.my_count} {item.unit || 'pcs'}</span>
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400">
            Pending
          </span>
        )}
      </div>

      {/* Large Touch Target Quantity Stepper & Input */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => handleStep(-1)}
          className="w-12 h-12 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-black text-xl flex items-center justify-center shrink-0 transition-transform"
        >
          -
        </button>

        <div className="relative flex-1">
          <input
            type="number"
            min="0"
            step="any"
            inputMode="decimal"
            placeholder="Qty"
            value={val}
            onChange={e => setVal(e.target.value)}
            className="w-full h-12 text-center text-lg font-black font-mono rounded-xl border border-slate-700 bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <span className="absolute right-3 top-3.5 text-xs text-slate-500 pointer-events-none font-bold">
            {item.unit || 'pcs'}
          </span>
        </div>

        <button
          type="button"
          onClick={() => handleStep(1)}
          className="w-12 h-12 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-black text-xl flex items-center justify-center shrink-0 transition-transform"
        >
          +
        </button>

        <button
          type="button"
          disabled={isSaving || val === ''}
          onClick={handleCommit}
          className={`h-12 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shrink-0 transition-all ${isSaving ? 'bg-slate-800 text-slate-500' : 'bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white shadow-md shadow-emerald-600/20'}`}
        >
          {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
          <span>{isCounted ? 'Update' : 'Save'}</span>
        </button>
      </div>

      {/* Note Trigger & Input */}
      <div className="mt-2.5">
        {!showNoteInput && !note ? (
          <button
            type="button"
            onClick={() => setShowNoteInput(true)}
            className="text-[11px] text-slate-500 hover:text-slate-300"
          >
            + Add optional note (e.g. damaged box, shelf location)
          </button>
        ) : (
          <div className="relative mt-1">
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Shelf location, damaged box..."
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-800 bg-slate-950 text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        )}
      </div>
    </div>
  );
};
