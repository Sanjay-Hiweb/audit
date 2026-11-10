import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock,
  PackagePlus,
  RefreshCw,
  X,
  XCircle
} from 'lucide-react';
import { api } from '../lib/api';

interface ProductRequestsViewProps {
  businessId: string;
  notify: (msg: string) => void;
}

export const ProductRequestsView: React.FC<ProductRequestsViewProps> = ({ businessId, notify }) => {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState('');

  const loadRequests = async () => {
    setLoading(true);
    try {
      const res = await api.getProductRequests(businessId);
      setRequests(res.requests);
    } catch (err: any) {
      notify(err?.message || 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [businessId]);

  const handleReview = async (id: string, action: 'approve' | 'reject') => {
    try {
      await api.reviewProductRequest(id, businessId, action, reviewNote);
      notify(action === 'approve' ? 'Product request approved and catalog item created!' : 'Product request rejected.');
      setReviewingId(null);
      setReviewNote('');
      await loadRequests();
    } catch (err: any) {
      notify(err?.message || 'Failed to review request');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Staff Product Requests</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Review items discovered by counting staff on the store floor that were missing from the catalogue
          </p>
        </div>

        <button
          onClick={loadRequests}
          className="p-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Requests Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Proposed Product</th>
                <th className="py-3 px-4">Category & Variant</th>
                <th className="py-3 px-4">Counted Stock</th>
                <th className="py-3 px-4">Requested By</th>
                <th className="py-3 px-4">Audit Reference</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400 text-xs">
                    No pending product requests from staff.
                  </td>
                </tr>
              ) : (
                requests.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">{r.proposed?.name}</div>
                      {r.proposed?.sku && <div className="text-[10px] font-mono text-slate-400">{r.proposed.sku}</div>}
                    </td>

                    <td className="py-3 px-4 text-slate-500">
                      <div>{r.proposed?.category || 'General'}</div>
                      <div className="text-[10px] text-emerald-600 font-bold">{r.proposed?.variant || 'Standard'}</div>
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                      {r.proposed?.countedQuantity ?? 0} pcs
                    </td>

                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                      <div>{r.requested_by}</div>
                      <div className="text-[10px] text-slate-400">{new Date(r.created_at).toLocaleDateString()}</div>
                    </td>

                    <td className="py-3 px-4 text-slate-500">
                      {r.audit_name}
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${r.status === 'approved' ? 'bg-emerald-500/10 text-emerald-600' : r.status === 'rejected' ? 'bg-rose-500/10 text-rose-500' : 'bg-amber-500/10 text-amber-600'}`}
                      >
                        {r.status.toUpperCase()}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right space-x-1">
                      {r.status === 'pending' ? (
                        <>
                          <button
                            onClick={() => handleReview(r.id, 'approve')}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shadow-sm transition-all"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReview(r.id, 'reject')}
                            className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold text-[11px] transition-all"
                          >
                            Reject
                          </button>
                        </>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">Reviewed</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

