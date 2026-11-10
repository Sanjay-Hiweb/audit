import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowDownToLine,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  Download,
  FileSpreadsheet,
  FileText,
  KeyRound,
  Lock,
  Package,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Users,
  X
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { api } from '../lib/api';

interface AuditDetailViewProps {
  auditId: string;
  businessId: string;
  onBack: () => void;
  notify: (msg: string) => void;
}

export const AuditDetailView: React.FC<AuditDetailViewProps> = ({
  auditId,
  businessId,
  onBack,
  notify
}) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    audit: any;
    lines: any[];
    totals: any;
    assignments: any[];
  } | null>(null);

  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  // Conflict modal
  const [resolvingLine, setResolvingLine] = useState<any | null>(null);
  const [resolvedQuantity, setResolvedQuantity] = useState<string>('');
  const [resolutionReason, setResolutionReason] = useState<string>('');

  // Recount modal
  const [recountingLine, setRecountingLine] = useState<any | null>(null);
  const [recountReason, setRecountReason] = useState<string>('Quantity discrepancy observed on shelf');

  // Load audit data
  const loadData = async () => {
    try {
      const res = await api.getAuditDetail(auditId, businessId);
      setData(res);
    } catch (err: any) {
      notify(err?.message || 'Failed to load audit details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Poll active audit every 4 seconds for live employee submission updates
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadData();
      }
    }, 4000);
    return () => clearInterval(timer);
  }, [auditId, businessId]);

  if (loading && !data) {
    return (
      <div className="p-12 text-center text-slate-500 flex items-center justify-center gap-2 text-xs">
        <RefreshCw size={16} className="animate-spin text-emerald-500" />
        <span>Loading live audit reconciliation...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-center space-y-4">
        <div className="text-slate-400 text-xs">Audit could not be loaded.</div>
        <button onClick={onBack} className="text-emerald-600 text-xs font-bold">← Back to Audits</button>
      </div>
    );
  }

  const { audit, lines, totals, assignments } = data;
  const isApproved = audit.status === 'approved';

  // Conflict resolution handler
  const handleResolveConflict = async () => {
    if (!resolvingLine) return;
    const qty = Number(resolvedQuantity);
    if (isNaN(qty) || qty < 0) {
      notify('Please enter a valid non-negative resolved quantity.');
      return;
    }
    if (!resolutionReason.trim()) {
      notify('Please state a reason for this resolution.');
      return;
    }

    try {
      await api.resolveDuplicate(audit.id, businessId, {
        variantId: resolvingLine.variantId,
        resolvedQuantity: qty,
        reason: resolutionReason.trim()
      });
      notify('Duplicate conflict resolved.');
      setResolvingLine(null);
      await loadData();
    } catch (err: any) {
      notify(err?.message || 'Failed to resolve conflict.');
    }
  };

  // Recount request handler
  const handleRequestRecount = async () => {
    if (!recountingLine) return;
    try {
      await api.requestRecount(audit.id, businessId, {
        variantId: recountingLine.variantId,
        reason: recountReason.trim()
      });
      notify('Recount requested. Assigned employees will see an alert.');
      setRecountingLine(null);
      await loadData();
    } catch (err: any) {
      notify(err?.message || 'Failed to request recount.');
    }
  };

  // Status transition handler (Approve & Lock)
  const handleUpdateStatus = async (newStatus: string) => {
    try {
      await api.updateAuditStatus(audit.id, businessId, newStatus);
      notify(`Audit status updated: ${newStatus}`);
      await loadData();
    } catch (err: any) {
      notify(err?.message || 'Failed to update audit status.');
    }
  };

  // Inventory reconciliation handler
  const handleReconcileInventory = async () => {
    if (!window.confirm('Apply verified physical stock counts to operational inventory? This will adjust current stock balances and create inventory movement logs.')) {
      return;
    }

    try {
      const res = await api.reconcileAudit(audit.id, businessId);
      notify(`Inventory reconciled: ${res.count} variants updated to physical counts!`);
      await loadData();
    } catch (err: any) {
      notify(err?.message || 'Reconciliation failed.');
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    const rows = lines.map(line => ({
      'SKU': line.sku,
      'Product': line.productName,
      'Variant': line.variantLabel,
      'Category': line.category,
      'Unit': line.unit,
      'Expected': line.expectedQuantity !== null ? line.expectedQuantity : 'Unavailable',
      'Actual Count': line.actualQuantity !== null ? line.actualQuantity : (line.hasConflict ? 'Conflict' : 'Not Counted'),
      'Variance': line.variance !== null ? line.variance : '—',
      'Status': line.status,
      'Notes': line.entries.map((e: any) => `${e.counted_by}: ${e.quantity} (${e.note || 'No note'})`).join('; ')
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Reconciled Audit');
    XLSX.writeFile(wb, `countly-audit-${audit.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.xlsx`);
    notify('Excel report downloaded');
  };

  // Export to PDF
  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Countly — Stock Audit Report: ${audit.name}`, 14, 18);

    doc.setFontSize(9);
    doc.text(`Branch: ${audit.branch_name} | Status: ${audit.status.toUpperCase()} | Created: ${new Date(audit.created_at).toLocaleDateString()}`, 14, 25);
    if (audit.approved_by) {
      doc.text(`Approved By: ${audit.approver_name || 'Owner'} at ${new Date(audit.approved_at).toLocaleString()}`, 14, 30);
    }

    // Totals summary
    doc.text(`Expected Units: ${totals.expectedUnitsTotal} | Counted Units: ${totals.countedUnitsTotal} | Net Variance: ${totals.netVarianceUnits > 0 ? '+' : ''}${totals.netVarianceUnits}`, 14, 36);

    const tableRows = lines.map(line => [
      line.sku,
      line.productName,
      line.variantLabel,
      line.expectedQuantity !== null ? String(line.expectedQuantity) : 'N/A',
      line.actualQuantity !== null ? String(line.actualQuantity) : (line.hasConflict ? 'Conflict' : 'Not Counted'),
      line.variance !== null ? `${line.variance > 0 ? '+' : ''}${line.variance}` : '—',
      line.status
    ]);

    autoTable(doc, {
      startY: 42,
      head: [['SKU', 'Product', 'Variant', 'Expected', 'Counted', 'Variance', 'Status']],
      body: tableRows,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [16, 185, 129] }
    });

    doc.save(`countly-audit-${audit.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.pdf`);
    notify('PDF report generated');
  };

  // Filtered lines
  const filteredLines = lines.filter(line => {
    const matchesSearch =
      !search ||
      line.productName.toLowerCase().includes(search.toLowerCase()) ||
      line.sku.toLowerCase().includes(search.toLowerCase()) ||
      line.variantLabel.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (filter === 'shortage') return line.status === 'Shortage';
    if (filter === 'excess') return line.status === 'Excess';
    if (filter === 'matched') return line.status === 'Matched';
    if (filter === 'unavailable') return line.status === 'Variance Unavailable';
    if (filter === 'not_counted') return line.status === 'Not Counted';
    if (filter === 'conflict') return line.hasConflict;

    return true;
  });

  const conflicts = lines.filter(l => l.hasConflict);

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-emerald-600 transition-colors mb-2"
          >
            <ArrowLeft size={15} />
            <span>All Audits</span>
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{audit.name}</h1>
            <span
              className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider ${audit.status === 'approved' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : audit.status === 'review' ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20' : 'bg-blue-500/10 text-blue-600 border border-blue-500/20'}`}
            >
              {audit.status}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Branch: <strong>{audit.branch_name}</strong> · Created {new Date(audit.created_at).toLocaleDateString()} by {audit.creator_name}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Join Code Display */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-mono font-bold">
            <KeyRound size={15} className="text-emerald-600" />
            <span>Code: {audit.join_code}</span>
            <button
              onClick={() => { navigator.clipboard.writeText(audit.join_code); notify('Audit code copied!'); }}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <Copy size={13} />
            </button>
          </div>

          <button
            onClick={handleExportPDF}
            className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold flex items-center gap-1.5 transition-all"
          >
            <FileText size={15} className="text-rose-500" />
            <span>PDF</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold flex items-center gap-1.5 transition-all"
          >
            <FileSpreadsheet size={15} className="text-emerald-600" />
            <span>Excel</span>
          </button>

          {!isApproved ? (
            <>
              {audit.status === 'active' && (
                <button
                  onClick={() => handleUpdateStatus('review')}
                  className="px-4 py-2 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-bold transition-all"
                >
                  Mark Under Review
                </button>
              )}
              <button
                onClick={() => handleUpdateStatus('approved')}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all"
              >
                <CheckCircle2 size={15} />
                <span>Approve & Lock Audit</span>
              </button>
            </>
          ) : (
            <button
              onClick={handleReconcileInventory}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-600/20 flex items-center gap-1.5 transition-all"
            >
              <Sparkles size={15} />
              <span>Apply to Current Inventory</span>
            </button>
          )}
        </div>
      </div>

      {/* Duplicate Count Conflict Alert Banner */}
      {conflicts.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300">
          <div className="flex items-start gap-3">
            <ShieldAlert size={20} className="text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1 flex-1">
              <h4 className="font-extrabold text-xs tracking-tight">
                {conflicts.length} Unresolved Duplicate Count Conflict{conflicts.length > 1 ? 's' : ''} Detected
              </h4>
              <p className="text-[11px] leading-relaxed opacity-90">
                Multiple employees submitted independent counts for the same product variant. Countly prevents double-counting by isolating these conflicts. <strong>Audit approval is locked until all conflicts are resolved.</strong>
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                {conflicts.map(c => (
                  <button
                    key={c.variantId}
                    onClick={() => {
                      setResolvingLine(c);
                      setResolvedQuantity(String(c.entries[0]?.quantity || ''));
                      setResolutionReason('Owner verified correct count on shelf');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 text-white text-[11px] font-bold hover:bg-amber-600 transition-colors"
                  >
                    Resolve: {c.productName} ({c.variantLabel}) →
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="text-[11px] font-bold text-slate-500 uppercase">Items / Lines</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{totals.totalLines}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Frozen snapshot items</div>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="text-[11px] font-bold text-slate-500 uppercase">Expected Units</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{totals.expectedUnitsTotal}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Catalogue baseline</div>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="text-[11px] font-bold text-slate-500 uppercase">Counted Units</div>
          <div className="text-2xl font-black text-emerald-600 mt-1">{totals.countedUnitsTotal}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Physical count total</div>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="text-[11px] font-bold text-slate-500 uppercase">Net Variance</div>
          <div className={`text-2xl font-black mt-1 ${totals.netVarianceUnits < 0 ? 'text-rose-500' : totals.netVarianceUnits > 0 ? 'text-blue-500' : 'text-emerald-500'}`}>
            {totals.netVarianceUnits > 0 ? `+${totals.netVarianceUnits}` : totals.netVarianceUnits}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Actual vs Expected</div>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="text-[11px] font-bold text-slate-500 uppercase">Shortages</div>
          <div className="text-2xl font-black text-rose-500 mt-1">{totals.shortageLinesCount} lines</div>
          <div className="text-[10px] text-rose-400 mt-0.5">-{totals.totalShortageUnits} units missing</div>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="text-[11px] font-bold text-slate-500 uppercase">Excesses</div>
          <div className="text-2xl font-black text-blue-500 mt-1">{totals.excessLinesCount} lines</div>
          <div className="text-[10px] text-blue-400 mt-0.5">+{totals.totalExcessUnits} extra units</div>
        </div>
      </div>

      {/* Discrepancy & Case Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${filter === 'all' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
          >
            All Lines ({lines.length})
          </button>
          <button
            onClick={() => setFilter('shortage')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${filter === 'shortage' ? 'bg-rose-500 text-white' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}
          >
            Shortages ({totals.shortageLinesCount})
          </button>
          <button
            onClick={() => setFilter('excess')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${filter === 'excess' ? 'bg-blue-600 text-white' : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'}`}
          >
            Excess ({totals.excessLinesCount})
          </button>
          <button
            onClick={() => setFilter('matched')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${filter === 'matched' ? 'bg-emerald-600 text-white' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'}`}
          >
            Matched ({totals.matchedLinesCount})
          </button>
          <button
            onClick={() => setFilter('not_counted')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${filter === 'not_counted' ? 'bg-slate-700 text-white' : 'bg-slate-500/10 text-slate-600 dark:text-slate-400'}`}
          >
            Not Counted ({totals.notCountedLinesCount})
          </button>
          <button
            onClick={() => setFilter('conflict')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${filter === 'conflict' ? 'bg-amber-500 text-white' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'}`}
          >
            Conflicts ({totals.conflictLinesCount})
          </button>
        </div>

        {/* Search */}
        <div className="relative max-w-xs w-full">
          <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search variant, SKU..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Reconciled Audit Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Product & Variant</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Expected Baseline</th>
                <th className="py-3 px-4">Physical Count</th>
                <th className="py-3 px-4">Variance</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {filteredLines.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400 text-xs">
                    No audit line items match your selected filter.
                  </td>
                </tr>
              ) : (
                filteredLines.map(line => (
                  <tr
                    key={line.variantId}
                    className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${line.hasConflict ? 'bg-amber-500/5' : ''}`}
                  >
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">{line.productName}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <span className="text-emerald-600 font-semibold">{line.variantLabel}</span>
                        {line.sku && <span className="font-mono text-[10px] text-slate-400">· {line.sku}</span>}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-500">
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-bold">
                        {line.category}
                      </span>
                    </td>

                    {/* Expected Baseline */}
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                      {line.expectedQuantity !== null ? (
                        <span>{line.expectedQuantity} <small className="font-normal text-slate-400">{line.unit}</small></span>
                      ) : (
                        <span className="text-slate-400 font-normal italic">Unavailable</span>
                      )}
                    </td>

                    {/* Actual Physical Count */}
                    <td className="py-3.5 px-4 font-mono">
                      {line.hasConflict ? (
                        <span className="inline-flex items-center gap-1 text-amber-500 font-bold">
                          <AlertTriangle size={13} />
                          <span>Conflict ({line.entries.length} counts)</span>
                        </span>
                      ) : line.actualQuantity !== null ? (
                        <span className="font-bold text-slate-900 dark:text-white">
                          {line.actualQuantity} <small className="font-normal text-slate-400">{line.unit}</small>
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Not Counted</span>
                      )}
                    </td>

                    {/* Variance */}
                    <td className="py-3.5 px-4 font-mono font-bold">
                      {line.variance !== null ? (
                        <span className={line.variance < 0 ? 'text-rose-500' : line.variance > 0 ? 'text-blue-500' : 'text-emerald-500'}>
                          {line.variance > 0 ? `+${line.variance}` : line.variance} {line.unit}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${line.status === 'Matched' ? 'bg-emerald-500/10 text-emerald-600' : line.status === 'Shortage' ? 'bg-rose-500/10 text-rose-600' : line.status === 'Excess' ? 'bg-blue-500/10 text-blue-600' : line.status === 'Conflict' ? 'bg-amber-500/10 text-amber-600' : 'bg-slate-500/10 text-slate-500'}`}
                      >
                        {line.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right space-x-2">
                      {line.hasConflict ? (
                        <button
                          onClick={() => {
                            setResolvingLine(line);
                            setResolvedQuantity(String(line.entries[0]?.quantity || ''));
                            setResolutionReason('Owner selected authoritative count');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] shadow-sm transition-all"
                        >
                          Resolve
                        </button>
                      ) : (
                        !isApproved && (
                          <button
                            onClick={() => {
                              setRecountingLine(line);
                              setRecountReason('Variance requires physical re-verification');
                            }}
                            className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-[11px] transition-all"
                          >
                            Recount
                          </button>
                        )
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Duplicate Count Conflict Modal */}
      {resolvingLine && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert size={18} className="text-amber-500" />
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  Resolve Duplicate Count Conflict
                </h3>
              </div>
              <button onClick={() => setResolvingLine(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs">
              <div className="font-bold text-slate-900 dark:text-white">{resolvingLine.productName}</div>
              <div className="text-slate-500">Variant: {resolvingLine.variantLabel} · Expected: {resolvingLine.expectedQuantity ?? 'N/A'} {resolvingLine.unit}</div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-2">
                Conflicting Submissions by Staff:
              </label>
              <div className="space-y-2">
                {resolvingLine.entries.map((entry: any, i: number) => (
                  <div
                    key={entry.id || i}
                    onClick={() => setResolvedQuantity(String(entry.quantity))}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${Number(resolvedQuantity) === entry.quantity ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                  >
                    <div>
                      <div className="font-bold text-xs">{entry.counted_by || 'Staff Member'}</div>
                      <div className="text-[10px] text-slate-400">Note: {entry.note || 'No note attached'}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-black font-mono">{entry.quantity} {resolvingLine.unit}</div>
                      <div className="text-[10px] text-emerald-600 font-bold">Click to Select</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Authoritative Reconciled Quantity *
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={resolvedQuantity}
                onChange={e => setResolvedQuantity(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Resolution Reason / Audit Justification *
              </label>
              <input
                type="text"
                value={resolutionReason}
                onChange={e => setResolutionReason(e.target.value)}
                placeholder="e.g. Owner physically recount shelf; backroom count was duplicate"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setResolvingLine(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-400"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResolveConflict}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20"
              >
                Confirm Resolution
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recount Modal */}
      {recountingLine && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <RefreshCw size={16} className="text-amber-500" />
                <span>Request Staff Recount</span>
              </h3>
              <button onClick={() => setRecountingLine(null)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Flag <strong>{recountingLine.productName} ({recountingLine.variantLabel})</strong> for physical recount. The counting employees will see an alert banner on their mobile interface.
            </p>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Reason for Recount *
              </label>
              <input
                type="text"
                value={recountReason}
                onChange={e => setRecountReason(e.target.value)}
                placeholder="e.g. Check secondary drawer or backstock box"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRecountingLine(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-400"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRequestRecount}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-md shadow-amber-500/20"
              >
                Send Recount Alert
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

