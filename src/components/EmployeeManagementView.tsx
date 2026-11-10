import React, { useEffect, useState } from 'react';
import {
  Check,
  Copy,
  KeyRound,
  Plus,
  RefreshCw,
  Shield,
  Smartphone,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  X
} from 'lucide-react';
import { api } from '../lib/api';

interface EmployeeManagementViewProps {
  businessId: string;
  audits: any[];
  notify: (msg: string) => void;
}

export const EmployeeManagementView: React.FC<EmployeeManagementViewProps> = ({
  businessId,
  audits,
  notify
}) => {
  const [selectedAuditId, setSelectedAuditId] = useState<string>(audits[0]?.id || '');
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Invite modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [employeeName, setEmployeeName] = useState('');
  const [customPin, setCustomPin] = useState('');

  // Generated card display
  const [createdCard, setCreatedCard] = useState<{
    employeeName: string;
    pin: string;
    joinCode: string;
  } | null>(null);

  const selectedAudit = audits.find(a => a.id === selectedAuditId) || audits[0];

  const loadAssignments = async () => {
    if (!selectedAuditId) return;
    setLoading(true);
    try {
      const res = await api.getAssignments(selectedAuditId, businessId);
      setAssignments(res.assignments);
    } catch (err: any) {
      notify(err?.message || 'Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (audits.length && !selectedAuditId) {
      setSelectedAuditId(audits[0].id);
    }
  }, [audits]);

  useEffect(() => {
    if (selectedAuditId) {
      loadAssignments();
    }
  }, [selectedAuditId]);

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeName.trim()) return;

    try {
      const res = await api.createAssignment(selectedAuditId, businessId, {
        employeeName: employeeName.trim(),
        pin: customPin.trim() || undefined
      });
      notify(`Invitation generated for ${res.employeeName}`);
      setCreatedCard({
        employeeName: res.employeeName,
        pin: res.pin,
        joinCode: selectedAudit.join_code
      });
      setShowInviteModal(false);
      setEmployeeName('');
      setCustomPin('');
      await loadAssignments();
    } catch (err: any) {
      notify(err?.message || 'Failed to create employee invitation');
    }
  };

  const handleRevoke = async (assignmentId: string, name: string) => {
    if (!window.confirm(`Revoke mobile access for ${name}? They will no longer be able to submit counts for this audit.`)) {
      return;
    }
    try {
      await api.revokeAssignment(selectedAuditId, assignmentId, businessId);
      notify(`Access revoked for ${name}`);
      await loadAssignments();
    } catch (err: any) {
      notify(err?.message || 'Failed to revoke assignment');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Team & Access Control</h1>
          <p className="text-xs text-slate-500 mt-0.5">Generate scoped PIN credentials for staff to count stock on their mobile phones</p>
        </div>

        <div className="flex items-center gap-2">
          {audits.length > 0 && (
            <select
              value={selectedAuditId}
              onChange={e => setSelectedAuditId(e.target.value)}
              className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {audits.map(a => (
                <option key={a.id} value={a.id}>{a.name} ({a.join_code})</option>
              ))}
            </select>
          )}

          {selectedAudit && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all"
            >
              <UserPlus size={16} />
              <span>Invite Staff Member</span>
            </button>
          )}
        </div>
      </div>

      {/* Generated Access Card Banner */}
      {createdCard && (
        <div className="p-5 rounded-3xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-xl space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <KeyRound size={20} />
              <h3 className="font-extrabold text-sm uppercase tracking-wider">Share Credentials with Staff Member</h3>
            </div>
            <button onClick={() => setCreatedCard(null)} className="text-white/80 hover:text-white">
              <X size={18} />
            </button>
          </div>

          <p className="text-xs text-white/90">
            Staff member <strong>{createdCard.employeeName}</strong> can now count stock on their mobile phone at this link:
          </p>

          <div className="grid sm:grid-cols-2 gap-3 max-w-lg">
            <div className="p-3 rounded-xl bg-black/20 backdrop-blur-sm border border-white/10">
              <div className="text-[10px] text-white/70 uppercase font-bold">1. Audit Join Code</div>
              <div className="text-xl font-black font-mono tracking-widest mt-0.5">{createdCard.joinCode}</div>
            </div>
            <div className="p-3 rounded-xl bg-black/20 backdrop-blur-sm border border-white/10">
              <div className="text-[10px] text-white/70 uppercase font-bold">2. Staff 4-Digit PIN</div>
              <div className="text-xl font-black font-mono tracking-widest mt-0.5">{createdCard.pin}</div>
            </div>
          </div>

          <button
            onClick={() => {
              const text = `Countly Stock Audit Access:\nStaff: ${createdCard.employeeName}\nJoin Code: ${createdCard.joinCode}\nPIN: ${createdCard.pin}\nOpen: ${window.location.origin}`;
              navigator.clipboard.writeText(text);
              notify('Credentials copied to clipboard!');
            }}
            className="px-4 py-2 rounded-xl bg-white text-emerald-800 font-extrabold text-xs flex items-center gap-1.5 shadow-sm hover:bg-slate-100 transition-all"
          >
            <Copy size={14} />
            <span>Copy Staff Invitation Message</span>
          </button>
        </div>
      )}

      {/* Staff Assignments List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-emerald-600" />
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
              Assigned Staff for {selectedAudit?.name || 'Selected Audit'}
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-mono">Join Code: <strong>{selectedAudit?.join_code}</strong></span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Staff Member</th>
                <th className="py-3 px-4">Access Status</th>
                <th className="py-3 px-4">Count Entries Submitted</th>
                <th className="py-3 px-4">Invited At</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {assignments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-slate-400 text-xs">
                    No staff members assigned to this audit yet. Click "Invite Staff Member" above.
                  </td>
                </tr>
              ) : (
                assignments.map(a => (
                  <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <Smartphone size={15} className="text-slate-400" />
                        <span>{a.employee_name}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${a.status === 'active' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-500'}`}
                      >
                        {a.status === 'active' ? 'Active PIN' : 'Revoked'}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                      {a.counted_items || 0} items
                    </td>

                    <td className="py-3 px-4 text-[11px] text-slate-400">
                      {new Date(a.created_at).toLocaleString()}
                    </td>

                    <td className="py-3 px-4 text-right">
                      {a.status === 'active' && (
                        <button
                          onClick={() => handleRevoke(a.id, a.employee_name)}
                          className="px-2.5 py-1 rounded-lg border border-rose-300 dark:border-rose-900/50 hover:bg-rose-500/10 text-rose-500 text-[11px] font-bold"
                        >
                          Revoke Access
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <UserPlus size={18} className="text-emerald-600" />
                <span>Invite Counting Staff Member</span>
              </h3>
              <button onClick={() => setShowInviteModal(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Generate an audit-scoped PIN for an employee to count on their Android phone or browser.
            </p>

            <form onSubmit={handleCreateAssignment} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Employee Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={employeeName}
                  onChange={e => setEmployeeName(e.target.value)}
                  placeholder="e.g. Jordan Chen"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Custom 4-Digit PIN (Leave blank to auto-generate)
                </label>
                <input
                  type="password"
                  maxLength={6}
                  value={customPin}
                  onChange={e => setCustomPin(e.target.value)}
                  placeholder="Leave empty for auto PIN"
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20"
                >
                  Generate Invitation Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

