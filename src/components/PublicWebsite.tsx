import React, { useState } from 'react';
import {
  ArrowRight,
  Boxes,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  FileSpreadsheet,
  FileText,
  Lock,
  Moon,
  Package,
  Shield,
  Smartphone,
  Sun,
  Users,
  Zap
} from 'lucide-react';

interface PublicWebsiteProps {
  onStartAuditing: () => void;
  onSignIn: () => void;
  onJoinEmployee: () => void;
  onTryDemo: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const PublicWebsite: React.FC<PublicWebsiteProps> = ({
  onStartAuditing,
  onSignIn,
  onJoinEmployee,
  onTryDemo,
  theme,
  onToggleTheme
}) => {
  const [activeTab, setActiveTab] = useState<'snapshot' | 'mobile' | 'conflict' | 'reconcile'>('snapshot');

  const industries = [
    { title: 'Clothing & Apparel', desc: 'Sizes, colors, fabric types & seasonal variants without rigid schemas.', icon: '👗' },
    { title: 'Footwear & Shoes', desc: 'Size runs, half-sizes, widths and box SKU tracking made effortless.', icon: '👟' },
    { title: 'Grocery & Supermarket', desc: 'Weights in kg, pack sizes, litres and fractional quantities with zero drift.', icon: '🛒' },
    { title: 'Electronics & Mobiles', desc: 'Serial tracking, storage capacities, colour finishes and high-value security.', icon: '📱' },
    { title: 'Cosmetics & Beauty', desc: 'Shades, volume bottles, batch numbers and expiration auditing.', icon: '💄' },
    { title: 'Hardware & Tools', desc: 'Metric units, grades, box counts and loose fastener quantity reconciliation.', icon: '🔨' }
  ];

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} transition-colors duration-200`}>
      {/* Top Navigation */}
      <header className={`sticky top-0 z-50 backdrop-blur-md border-b ${theme === 'dark' ? 'bg-slate-950/80 border-slate-800' : 'bg-white/80 border-slate-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shadow-md shadow-emerald-500/20">
              <Boxes size={22} />
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight">countly</span>
              <span className="text-[10px] font-bold text-emerald-600 block tracking-widest uppercase -mt-1">RETAIL AUDIT</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            <a href="#features" className="hover:text-emerald-600 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-emerald-600 transition-colors">How It Works</a>
            <a href="#industries" className="hover:text-emerald-600 transition-colors">Industries</a>
            <a href="#showcase" className="hover:text-emerald-600 transition-colors">Product Tour</a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={onToggleTheme}
              className={`p-2 rounded-lg border ${theme === 'dark' ? 'border-slate-800 text-slate-400 hover:text-white' : 'border-slate-200 text-slate-600 hover:text-black'} transition-colors`}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              onClick={onJoinEmployee}
              className={`hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border ${theme === 'dark' ? 'border-slate-800 hover:bg-slate-900 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-700'} transition-all`}
            >
              <Smartphone size={15} />
              <span>Employee Join</span>
            </button>
            <button
              onClick={onSignIn}
              className={`px-4 py-2 text-xs font-semibold rounded-lg border ${theme === 'dark' ? 'border-slate-800 hover:bg-slate-900' : 'border-slate-300 hover:bg-slate-100'} transition-all`}
            >
              Sign In
            </button>
            <button
              onClick={onStartAuditing}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-600/30 transition-all flex items-center gap-1.5"
            >
              <span>Start Auditing</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-16 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 mb-6">
          <Zap size={14} className="text-emerald-500" />
          <span>Universal Retail Stock Audit & Inventory Reconciliation Platform</span>
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight max-w-4xl mx-auto leading-[1.1] mb-6">
          Stock Audits, <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">Without the Paperwork.</span>
        </h1>

        <p className={`text-lg sm:text-xl max-w-2xl mx-auto mb-10 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
          Countly helps retail businesses digitize physical stock audits, coordinate employees across mobile phones, detect duplicate count conflicts, and reconcile inventory with verified accuracy.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto mb-12">
          <button
            onClick={onStartAuditing}
            className="w-full sm:w-auto px-7 py-3.5 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all transform active:scale-95"
          >
            <span>Start Auditing Free</span>
            <ArrowRight size={16} />
          </button>
          <button
            onClick={onTryDemo}
            className={`w-full sm:w-auto px-7 py-3.5 rounded-xl font-bold text-sm border ${theme === 'dark' ? 'border-slate-800 bg-slate-900/60 hover:bg-slate-900 text-slate-200' : 'border-slate-300 bg-white hover:bg-slate-100 text-slate-700'} shadow-sm flex items-center justify-center gap-2 transition-all`}
          >
            <span>Explore Demo Store</span>
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Live Metrics Trust Banner */}
        <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto p-4 rounded-2xl border ${theme === 'dark' ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="p-3">
            <div className="text-2xl font-black text-emerald-600">100%</div>
            <div className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Frozen Baseline Snapshots</div>
          </div>
          <div className="p-3">
            <div className="text-2xl font-black text-emerald-600">0%</div>
            <div className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Duplicate Count Conflicts</div>
          </div>
          <div className="p-3">
            <div className="text-2xl font-black text-emerald-600">6 of 6</div>
            <div className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Reconciliation Cases Handled</div>
          </div>
          <div className="p-3">
            <div className="text-2xl font-black text-emerald-600">Universal</div>
            <div className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Any Retail Industry</div>
          </div>
        </div>
      </section>

      {/* Problem vs Solution Comparison */}
      <section className={`py-16 border-y ${theme === 'dark' ? 'bg-slate-900/30 border-slate-800' : 'bg-slate-100/60 border-slate-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">The Problem with Manual Stock Audits</h2>
            <p className={`mt-3 text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
              Paper clipboards and disconnected spreadsheets silently compromise retail profits and lead to inaccurate stock records.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* The Old Way */}
            <div className={`p-8 rounded-2xl border ${theme === 'dark' ? 'bg-slate-900/60 border-rose-900/30' : 'bg-white border-rose-200'} shadow-sm`}>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-500 mb-6">
                ✕ Traditional Manual Auditing
              </div>
              <ul className="space-y-4 text-sm">
                <li className="flex items-start gap-3">
                  <span className="text-rose-500 font-bold">✕</span>
                  <span><strong>Accidental Double Counts:</strong> Two workers count the same shelf and quantities are blindly added together.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-rose-500 font-bold">✕</span>
                  <span><strong>Moving Baselines:</strong> Expected stock changes while the audit is happening, ruining reconciliation.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-rose-500 font-bold">✕</span>
                  <span><strong>Zero vs Not Counted Confusion:</strong> An uncounted item gets recorded as 0, or an actual 0 count is ignored.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-rose-500 font-bold">✕</span>
                  <span><strong>Hours of Excel Hell:</strong> Manual VLOOKUP formulas, copy-pasting, and untraceable employee discrepancies.</span>
                </li>
              </ul>
            </div>

            {/* The Countly Way */}
            <div className={`p-8 rounded-2xl border ${theme === 'dark' ? 'bg-slate-900/60 border-emerald-900/30' : 'bg-white border-emerald-200'} shadow-sm`}>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 mb-6">
                ✓ The Countly Digital Platform
              </div>
              <ul className="space-y-4 text-sm">
                <li className="flex items-start gap-3">
                  <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>Duplicate Conflict Protection:</strong> Multi-worker submissions on the same item trigger an owner review prompt—never added blindly.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>Immutable Snapshots:</strong> Expected stock is frozen at the moment of audit creation, guaranteeing reproducible comparisons.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>Rigorous 6-Case Engine:</strong> Explicitly differentiates Shortages, Excesses, Matches, Unavailable Expected, Not Counted, and Valid Zeroes.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>1-Click Inventory Sync:</strong> Reconcile verified audit counts directly into current operational stock with an immutable audit trail.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Product Showcase */}
      <section id="showcase" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">The Complete Stock Audit Lifecycle</h2>
          <p className={`mt-3 text-sm sm:text-base ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            Built from the ground up for store owners, branch managers, and mobile counting employees.
          </p>

          <div className="flex flex-wrap justify-center gap-2 mt-8">
            <button
              onClick={() => setActiveTab('snapshot')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'snapshot' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20' : theme === 'dark' ? 'bg-slate-900 text-slate-400' : 'bg-slate-200 text-slate-700'}`}
            >
              1. Baseline Snapshot
            </button>
            <button
              onClick={() => setActiveTab('mobile')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'mobile' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20' : theme === 'dark' ? 'bg-slate-900 text-slate-400' : 'bg-slate-200 text-slate-700'}`}
            >
              2. Mobile Count Entry
            </button>
            <button
              onClick={() => setActiveTab('conflict')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'conflict' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20' : theme === 'dark' ? 'bg-slate-900 text-slate-400' : 'bg-slate-200 text-slate-700'}`}
            >
              3. Conflict Resolution
            </button>
            <button
              onClick={() => setActiveTab('reconcile')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'reconcile' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20' : theme === 'dark' ? 'bg-slate-900 text-slate-400' : 'bg-slate-200 text-slate-700'}`}
            >
              4. Sync & Reports
            </button>
          </div>
        </div>

        {/* Showcase Panel */}
        <div className={`p-6 sm:p-10 rounded-3xl border ${theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-xl'} max-w-4xl mx-auto`}>
          {activeTab === 'snapshot' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">
                  <Package size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg">Expected Inventory Baseline Snapshot</h3>
                  <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Every audit freezes expected stock quantities at dispatch time.</p>
                </div>
              </div>
              <div className={`p-4 rounded-xl font-mono text-xs overflow-x-auto ${theme === 'dark' ? 'bg-slate-950 text-slate-300' : 'bg-slate-100 text-slate-800'}`}>
                <div className="text-emerald-500 font-bold mb-2">// Audit Creation Snapshot Query</div>
                <div>INSERT INTO audit_expected_snapshots (audit_id, variant_id, expected_quantity)</div>
                <div>SELECT 'aud_nov26', v.id, ib.quantity FROM product_variants v</div>
                <div>LEFT JOIN inventory_balances ib ON ib.variant_id = v.id;</div>
                <div className="mt-3 text-slate-500">// Historical audit remains 100% reproducible even if future inventory shifts.</div>
              </div>
              <div className="grid sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-lg border border-slate-700/50">✓ Immutable baseline record</div>
                <div className="p-3 rounded-lg border border-slate-700/50">✓ Multi-branch scoped</div>
                <div className="p-3 rounded-lg border border-slate-700/50">✓ Safe against concurrent POS sales</div>
              </div>
            </div>
          )}

          {activeTab === 'mobile' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
                  <Smartphone size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg">Mobile-First Touch Counting Interface</h3>
                  <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Designed for retail floor workers on Android and iOS devices.</p>
                </div>
              </div>
              <div className={`p-5 rounded-xl border ${theme === 'dark' ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'} max-w-sm mx-auto text-center space-y-4`}>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Classic Cotton Shirt · Blue / L</div>
                <div className="flex items-center justify-center gap-3">
                  <button className="w-12 h-12 rounded-xl bg-slate-800 text-white font-black text-xl hover:bg-slate-700">-</button>
                  <div className="text-3xl font-black font-mono w-24 py-2 border rounded-xl border-emerald-500 bg-emerald-500/10 text-emerald-500">44</div>
                  <button className="w-12 h-12 rounded-xl bg-slate-800 text-white font-black text-xl hover:bg-slate-700">+</button>
                </div>
                <div className="text-xs text-slate-500">Expected: 50 pcs · <span className="text-rose-500 font-bold">-6 Shortage</span></div>
                <button className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs">Save & Next Item</button>
              </div>
            </div>
          )}

          {activeTab === 'conflict' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                  <Shield size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg">Automated Duplicate Count Conflict Prevention</h3>
                  <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Never silently sum multiple workers counting the same shelf.</p>
                </div>
              </div>
              <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-amber-950/20 border-amber-900/40 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
                <div className="font-bold text-sm mb-2">⚠️ Duplicate Conflict Detected on USB-C Fast Cable (2M)</div>
                <div className="text-xs space-y-1 mb-4">
                  <div>• Worker Alex Rivera submitted: <strong>10 units</strong> (Shelf front)</div>
                  <div>• Worker Jordan Chen submitted: <strong>12 units</strong> (Overstock box)</div>
                </div>
                <div className="text-xs bg-black/20 p-2.5 rounded-lg font-mono">
                  Audit approval is strictly locked until Store Owner selects the authoritative count or triggers a recount.
                </div>
              </div>
            </div>
          )}

          {activeTab === 'reconcile' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center font-bold">
                  <ClipboardCheck size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg">1-Click Reconciliation & Verified Exports</h3>
                  <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Seamless updates to master stock balances with signed PDF/Excel audit reports.</p>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'} text-xs space-y-2`}>
                  <div className="font-bold flex items-center gap-2"><FileText size={16} className="text-red-500" /> Formal Audit PDF Report</div>
                  <p className="text-slate-500">Audit-scoped summary table including variance percentage, approver signature line, and timestamp.</p>
                </div>
                <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'} text-xs space-y-2`}>
                  <div className="font-bold flex items-center gap-2"><FileSpreadsheet size={16} className="text-emerald-500" /> Reconciled Excel Export</div>
                  <p className="text-slate-500">Color-coded variance worksheets compatible with accounting and ERP import requirements.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Retail Industries Section */}
      <section id="industries" className={`py-20 border-t ${theme === 'dark' ? 'bg-slate-900/30 border-slate-800' : 'bg-slate-100/50 border-slate-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">Built for Every Retail Category</h2>
            <p className={`mt-3 text-sm sm:text-base ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
              Universal attribute configuration allows apparel, grocery, electronics, and hardware stores to audit seamlessly.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {industries.map((ind, i) => (
              <div
                key={i}
                className={`p-6 rounded-2xl border ${theme === 'dark' ? 'bg-slate-900/50 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'} transition-all`}
              >
                <div className="text-3xl mb-3">{ind.icon}</div>
                <h3 className="font-extrabold text-base mb-1">{ind.title}</h3>
                <p className={`text-xs leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{ind.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">How Countly Works</h2>
          <p className={`mt-3 text-sm sm:text-base ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            A structured four-step audit flow that guarantees data integrity from stockroom floor to executive report.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className={`p-6 rounded-2xl border ${theme === 'dark' ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-black text-sm mb-4">1</div>
            <h4 className="font-bold text-sm mb-2">Create Catalogue & Snapshot</h4>
            <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Import products via Excel or add manually. Starting an audit captures an immutable baseline snapshot.</p>
          </div>
          <div className={`p-6 rounded-2xl border ${theme === 'dark' ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-black text-sm mb-4">2</div>
            <h4 className="font-bold text-sm mb-2">Assign Team via Secure PIN</h4>
            <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Generate audit join codes and 4-digit employee PINs. Employees only access their assigned audit.</p>
          </div>
          <div className={`p-6 rounded-2xl border ${theme === 'dark' ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-black text-sm mb-4">3</div>
            <h4 className="font-bold text-sm mb-2">Count on Mobile Phones</h4>
            <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Staff enter physical stock using big touch targets. Save drafts, request missing items, and submit.</p>
          </div>
          <div className={`p-6 rounded-2xl border ${theme === 'dark' ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-black text-sm mb-4">4</div>
            <h4 className="font-bold text-sm mb-2">Reconcile, Approve & Sync</h4>
            <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Review variances, resolve conflicts, trigger recounts, and apply verified physical stock back to inventory.</p>
          </div>
        </div>
      </section>

      {/* CTA Footer Section */}
      <section className={`py-16 border-t ${theme === 'dark' ? 'bg-emerald-950/20 border-slate-800' : 'bg-emerald-50 border-emerald-100'} text-center`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">Ready to Run Flawless Stock Audits?</h2>
          <p className={`text-sm sm:text-base max-w-xl mx-auto mb-8 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            Join retailers who have eliminated paper clipboards and Excel confusion with Countly.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onStartAuditing}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2"
            >
              <span>Create Store Workspace</span>
              <ArrowRight size={16} />
            </button>
            <button
              onClick={onTryDemo}
              className={`w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-sm border ${theme === 'dark' ? 'border-slate-700 bg-slate-900 text-slate-200' : 'border-slate-300 bg-white text-slate-700'} shadow-sm transition-all`}
            >
              <span>Explore Interactive Demo</span>
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={`py-12 border-t text-xs ${theme === 'dark' ? 'bg-slate-950 border-slate-900 text-slate-500' : 'bg-white border-slate-200 text-slate-400'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
              <Boxes size={14} />
            </div>
            <span className="font-bold text-slate-300">countly</span>
            <span>— Universal Retail Stock Audit & Inventory Reconciliation</span>
          </div>

          {/* Subtly placed author credit as specified in prompt Section 20 */}
          <div className="text-slate-400 font-medium">
            Developed by Rakesh, BCS Student.
          </div>
        </div>
      </footer>
    </div>
  );
};
