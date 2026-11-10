import React, { useEffect, useState } from 'react';
import {
  ArrowDownToLine,
  ArrowRight,
  Boxes,
  Clock,
  Edit3,
  History,
  Package,
  Plus,
  RefreshCw,
  Search,
  TrendingDown,
  TrendingUp,
  X
} from 'lucide-react';
import { api } from '../lib/api';

interface InventoryViewProps {
  businessId: string;
  branches: any[];
  selectedBranchId: string;
  onSelectBranch: (id: string) => void;
  notify: (msg: string) => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  businessId,
  branches,
  selectedBranchId,
  onSelectBranch,
  notify
}) => {
  const [loading, setLoading] = useState(true);
  const [balances, setBalances] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  // Manual Adjustment Modal
  const [adjustItem, setAdjustItem] = useState<any | null>(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustReason, setAdjustReason] = useState('Manual physical stock count');

  const loadInventory = async () => {
    setLoading(true);
    try {
      const res = await api.getInventory(businessId, selectedBranchId);
      setBalances(res.balances);
    } catch (err: any) {
      notify(err?.message || 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, [businessId, selectedBranchId]);

  const handleConfirmAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustItem) return;
    const qty = Number(adjustQty);
    if (isNaN(qty) || qty < 0) {
      notify('Please enter a valid non-negative quantity');
      return;
    }

    try {
      await api.adjustInventory({
        businessId,
        branchId: selectedBranchId,
        variantId: adjustItem.variant_id,
        quantity: qty,
        reason: adjustReason.trim()
      });
      notify(`Stock updated to ${qty} ${adjustItem.unit}`);
      setAdjustItem(null);
      await loadInventory();
    } catch (err: any) {
      notify(err?.message || 'Failed to adjust stock');
    }
  };

  const filtered = balances.filter(b => {
    const q = search.toLowerCase();
    return (
      !search ||
      b.product_name.toLowerCase().includes(q) ||
      (b.variant_sku && b.variant_sku.toLowerCase().includes(q)) ||
      (b.variant_label && b.variant_label.toLowerCase().includes(q))
    );
  });

  const totalUnits = balances.reduce((sum, b) => sum + (b.quantity || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Current Inventory</h1>
          <p className="text-xs text-slate-500 mt-0.5">Live operational stock balances and movement adjustments</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Branch Selector */}
          {branches.length > 1 && (
            <select
              value={selectedBranchId}
              onChange={e => onSelectBranch(e.target.value)}
              className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {branches.map(br => (
                <option key={br.id} value={br.id}>{br.name}</option>
              ))}
            </select>
          )}

          <button
            onClick={loadInventory}
            className="p-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="text-[11px] font-bold text-slate-500 uppercase">Total Tracked Variants</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{balances.length}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Active SKU lines</div>
        </div>
        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="text-[11px] font-bold text-slate-500 uppercase">Total Stock on Hand</div>
          <div className="text-2xl font-black text-emerald-600 mt-1">{totalUnits}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Operational units</div>
        </div>
        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm col-span-2 sm:col-span-1">
          <div className="text-[11px] font-bold text-slate-500 uppercase">Selected Branch</div>
          <div className="text-base font-bold text-slate-900 dark:text-white mt-2 truncate">
            {branches.find(b => b.id === selectedBranchId)?.name || 'Main Store'}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Isolated location</div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm w-full">
        <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Filter inventory by name, SKU..."
          className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {/* Balances Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4">Variant</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">SKU</th>
                <th className="py-3 px-4">Quantity on Hand</th>
                <th className="py-3 px-4">Last Updated</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400 text-xs">
                    No inventory records found.
                  </td>
                </tr>
              ) : (
                filtered.map(b => (
                  <tr key={b.id || b.variant_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      {b.product_name}
                    </td>
                    <td className="py-3 px-4 text-emerald-600 font-semibold">
                      {b.variant_label}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-bold">
                        {b.category_name || 'General'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">
                      {b.variant_sku || '—'}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-base text-slate-900 dark:text-white">
                      {b.quantity} <small className="text-xs font-normal text-slate-400">{b.unit}</small>
                    </td>
                    <td className="py-3 px-4 text-[11px] text-slate-400">
                      {b.updated_at ? new Date(b.updated_at).toLocaleDateString() : 'Initial'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          setAdjustItem(b);
                          setAdjustQty(String(b.quantity));
                          setAdjustReason('Physical stock count verification');
                        }}
                        className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300"
                      >
                        Adjust
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stock Adjustment Modal */}
      {adjustItem && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Edit3 size={16} className="text-emerald-500" />
                <span>Adjust Stock on Hand</span>
              </h3>
              <button onClick={() => setAdjustItem(null)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs">
              <div className="font-bold text-slate-900 dark:text-white">{adjustItem.product_name}</div>
              <div className="text-slate-500">Variant: {adjustItem.variant_label} · Current: {adjustItem.quantity} {adjustItem.unit}</div>
            </div>

            <form onSubmit={handleConfirmAdjustment} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  New Quantity on Hand *
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={adjustQty}
                  onChange={e => setAdjustQty(e.target.value)}
                  className="w-full px-3 py-2 text-base font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Adjustment Reason *
                </label>
                <input
                  type="text"
                  required
                  value={adjustReason}
                  onChange={e => setAdjustReason(e.target.value)}
                  placeholder="e.g. Received new stock delivery / Damaged units discarded"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustItem(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20"
                >
                  Save Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
