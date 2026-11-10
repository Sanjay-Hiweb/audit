import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowDownToLine,
  ArrowUpRight,
  Boxes,
  BriefcaseBusiness,
  Building,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  ClipboardCheck,
  FileSpreadsheet,
  FileText,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Package,
  PackagePlus,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Sun,
  Users,
  X,
  Zap
} from 'lucide-react';
import { api, getStoredTheme, getStoredToken, setStoredTheme, setStoredToken } from './lib/api';
import type { UserSession } from './lib/api';
import { PublicWebsite } from './components/PublicWebsite';
import { AuthModal } from './components/AuthModal';
import { EmployeeWorkspace } from './components/EmployeeWorkspace';
import { AuditDetailView } from './components/AuditDetailView';
import { ProductCatalogueView } from './components/ProductCatalogueView';
import { InventoryView } from './components/InventoryView';
import { EmployeeManagementView } from './components/EmployeeManagementView';
import { ProductRequestsView } from './components/ProductRequestsView';
import { SettingsView } from './components/SettingsView';

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(getStoredTheme);
  const [user, setUser] = useState<UserSession['user'] | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  // App navigation
  const [page, setPage] = useState<string>('Overview');
  const [activeAuditId, setActiveAuditId] = useState<string | null>(null);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [toast, setToast] = useState('');

  // Modals
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [createAuditModalOpen, setCreateAuditModalOpen] = useState(false);

  // Business state
  const [activeBusinessIndex, setActiveBusinessIndex] = useState(0);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [audits, setAudits] = useState<any[]>([]);

  // Create Audit form state
  const [auditName, setAuditName] = useState('November Store Stock Count');
  const [auditDesc, setAuditDesc] = useState('');
  const [creatingAudit, setCreatingAudit] = useState(false);

  const notify = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 3000);
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    setStoredTheme(next);
  };

  // Sync theme class on mount
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // Check existing authenticated user on boot
  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setInitialLoading(false);
      return;
    }

    api.me()
      .then(res => {
        setUser(res.user);
      })
      .catch(() => {
        setStoredToken(null);
        setUser(null);
      })
      .finally(() => {
        setInitialLoading(false);
      });
  }, []);

  const activeBusiness = user?.businesses[activeBusinessIndex] || user?.businesses[0];

  // Load business resources
  const loadBusinessData = async () => {
    if (!activeBusiness) return;
    try {
      const [branchRes, catRes, prodRes, auditRes] = await Promise.all([
        api.getBranches(activeBusiness.id),
        api.getCategories(activeBusiness.id),
        api.getProducts(activeBusiness.id, selectedBranchId || undefined),
        api.getAudits(activeBusiness.id)
      ]);

      setBranches(branchRes.branches);
      if (!selectedBranchId && branchRes.branches.length) {
        setSelectedBranchId(branchRes.branches[0].id);
      }
      setCategories(catRes.categories);
      setProducts(prodRes.products);
      setAudits(auditRes.audits);
    } catch (err: any) {
      console.error('Failed to load business data:', err);
    }
  };

  useEffect(() => {
    if (activeBusiness) {
      loadBusinessData();
    }
  }, [activeBusiness?.id, selectedBranchId]);

  const handleLogout = async () => {
    await api.logout();
    setUser(null);
    setPage('Overview');
    notify('Signed out successfully');
  };

  const handleCreateAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auditName.trim() || !activeBusiness) return;

    setCreatingAudit(true);
    try {
      const res = await api.createAudit({
        businessId: activeBusiness.id,
        branchId: selectedBranchId || branches[0]?.id,
        name: auditName.trim(),
        description: auditDesc.trim() || undefined
      });

      notify(`Audit created! Join Code: ${res.joinCode} (${res.lineCount} items snapshotted)`);
      setCreateAuditModalOpen(false);
      setAuditName('');
      setAuditDesc('');
      await loadBusinessData();
      setActiveAuditId(res.auditId);
      setPage('AuditDetail');
    } catch (err: any) {
      notify(err?.message || 'Failed to create audit');
    } finally {
      setCreatingAudit(false);
    }
  };

  // If in dedicated Employee Workspace mode
  if (page === 'EmployeeWorkspace') {
    return (
      <EmployeeWorkspace
        onBackToHome={() => setPage('Overview')}
        notify={notify}
      />
    );
  }

  // If unauthenticated, show public marketing website
  if (!user && !initialLoading) {
    return (
      <>
        <PublicWebsite
          theme={theme}
          onToggleTheme={toggleTheme}
          onStartAuditing={() => { setAuthMode('register'); setAuthModalOpen(true); }}
          onSignIn={() => { setAuthMode('login'); setAuthModalOpen(true); }}
          onJoinEmployee={() => setPage('EmployeeWorkspace')}
          onTryDemo={async () => {
            try {
              const res = await api.demoLogin('owner');
              setStoredToken(res.token);
              setUser(res.user);
              notify('Welcome to Countly Demo Store!');
            } catch {
              setAuthMode('login');
              setAuthModalOpen(true);
            }
          }}
        />
        <AuthModal
          isOpen={authModalOpen}
          initialMode={authMode}
          onClose={() => setAuthModalOpen(false)}
          onSuccess={sess => setUser(sess.user)}
          onOpenEmployeeJoin={() => { setAuthModalOpen(false); setPage('EmployeeWorkspace'); }}
          notify={notify}
        />
        {toast && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl border border-slate-800 text-xs flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-400" />
            <span>{toast}</span>
          </div>
        )}
      </>
    );
  }

  // Navigation Items
  const navItems = [
    { name: 'Overview', icon: LayoutDashboard },
    { name: 'Products', icon: Package },
    { name: 'Inventory', icon: Boxes },
    { name: 'Audits', icon: ClipboardCheck },
    { name: 'Employees', icon: Users },
    { name: 'Approvals', icon: PackagePlus },
    { name: 'Settings', icon: Settings }
  ];

  const activeAuditsCount = audits.filter(a => a.status === 'active' || a.status === 'review').length;
  const totalStockUnits = products.reduce((sum, p) =>
    sum + p.variants.reduce((s: number, v: any) => s + (v.expected_quantity || 0), 0), 0);

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} flex transition-colors duration-200`}>
      {/* Mobile Drawer Scrim */}
      {mobileMenu && (
        <div
          onClick={() => setMobileMenu(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} border-r flex flex-col p-4 transition-transform duration-200 lg:translate-x-0 ${mobileMenu ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Brand */}
        <div className="flex items-center justify-between px-2 py-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-500/20">
              <Boxes size={20} />
            </div>
            <div>
              <span className="font-black text-lg tracking-tight block">countly</span>
              <span className="text-[9px] font-extrabold tracking-widest text-emerald-600 uppercase block -mt-1">RETAIL AUDIT</span>
            </div>
          </div>
          <button onClick={() => setMobileMenu(false)} className="lg:hidden text-slate-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* Business Selector */}
        <div className={`p-3 rounded-2xl border mb-5 ${theme === 'dark' ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Active Store</div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 font-extrabold text-xs flex items-center justify-center">
              {activeBusiness?.name?.[0] || 'S'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-extrabold text-xs truncate">{activeBusiness?.name || 'My Store'}</div>
              <div className="text-[10px] text-slate-500 capitalize">{activeBusiness?.role || 'Owner'} Workspace</div>
            </div>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="space-y-1 flex-1">
          {navItems.map(item => {
            const isSelected = page === item.name || (item.name === 'Audits' && page === 'AuditDetail');
            return (
              <button
                key={item.name}
                onClick={() => {
                  setPage(item.name);
                  if (item.name === 'Audits') setActiveAuditId(null);
                  setMobileMenu(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${isSelected ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30' : theme === 'dark' ? 'text-slate-400 hover:text-white hover:bg-slate-800/60' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}
              >
                <div className="flex items-center gap-2.5">
                  <item.icon size={17} />
                  <span>{item.name}</span>
                </div>
                {item.name === 'Audits' && activeAuditsCount > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${isSelected ? 'bg-white text-emerald-700' : 'bg-emerald-500/10 text-emerald-600'}`}>
                    {activeAuditsCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Employee Workspace Switcher */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
          <button
            onClick={() => setPage('EmployeeWorkspace')}
            className="w-full py-2.5 px-3 rounded-xl border border-dashed border-emerald-500/40 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center justify-center gap-2 hover:bg-emerald-500/10 transition-colors"
          >
            <Smartphone size={15} />
            <span>Open Mobile Staff Counter</span>
          </button>

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              title="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-slate-400 hover:text-rose-500"
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 lg:ml-64 flex flex-col min-w-0">
        {/* Top Header */}
        <header className={`h-16 border-b ${theme === 'dark' ? 'bg-slate-950/80 border-slate-800' : 'bg-white/80 border-slate-200'} backdrop-blur-md px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30`}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenu(true)}
              className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white"
            >
              <Menu size={20} />
            </button>
            <div className="text-xs text-slate-400 font-medium hidden sm:block">
              {activeBusiness?.name} <span className="px-1 text-slate-300">/</span> <strong className="text-slate-800 dark:text-slate-200">{page}</strong>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setCreateAuditModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm shadow-emerald-600/20 flex items-center gap-1.5 transition-all"
            >
              <Plus size={15} />
              <span>Start Audit</span>
            </button>
          </div>
        </header>

        {/* View Router */}
        <main className="p-4 sm:p-8 max-w-7xl mx-auto w-full">
          {page === 'Overview' && (
            <div className="space-y-6">
              {/* Welcome Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    Store Audit Dashboard
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Live inventory baselines, employee counting progress, and discrepancy reconciliation
                  </p>
                </div>
                <button
                  onClick={() => setCreateAuditModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <Plus size={15} />
                  <span>Dispatch New Audit</span>
                </button>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400 uppercase">Products</span>
                    <Package size={16} className="text-emerald-600" />
                  </div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">{products.length}</div>
                  <span className="text-[10px] text-slate-400">Catalogue items</span>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400 uppercase">Expected Units</span>
                    <Boxes size={16} className="text-blue-600" />
                  </div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">{totalStockUnits}</div>
                  <span className="text-[10px] text-slate-400">Total catalogue units</span>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400 uppercase">Active Audits</span>
                    <Activity size={16} className="text-amber-500" />
                  </div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">{activeAuditsCount}</div>
                  <span className="text-[10px] text-slate-400">In-progress sessions</span>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400 uppercase">Total Audits</span>
                    <ClipboardCheck size={16} className="text-purple-600" />
                  </div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">{audits.length}</div>
                  <span className="text-[10px] text-slate-400">Historical records</span>
                </div>
              </div>

              {/* Active / Recent Audits Section */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Active & Recent Audits</h3>
                    <p className="text-xs text-slate-500">Click any audit to inspect live counts and reconcile discrepancies</p>
                  </div>
                  <button onClick={() => setPage('Audits')} className="text-xs font-bold text-emerald-600 hover:underline">
                    View All Audits →
                  </button>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {audits.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-xs">
                      No audits created yet. Click "Start Audit" above to run your first physical stock count.
                    </div>
                  ) : (
                    audits.slice(0, 5).map(a => (
                      <div
                        key={a.id}
                        onClick={() => { setActiveAuditId(a.id); setPage('AuditDetail'); }}
                        className="py-3.5 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/30 px-2 rounded-xl transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-emerald-600 flex items-center justify-center shrink-0">
                            <ClipboardCheck size={18} />
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">{a.name}</h4>
                            <p className="text-[11px] text-slate-400">
                              Join Code: <strong className="font-mono text-emerald-600">{a.join_code}</strong> · Branch: {a.branch_name}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${a.status === 'approved' ? 'bg-emerald-500/10 text-emerald-600' : a.status === 'review' ? 'bg-amber-500/10 text-amber-600' : 'bg-blue-500/10 text-blue-600'}`}
                          >
                            {a.status}
                          </span>
                          <span className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-white">
                            Inspect →
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {page === 'Audits' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Stock Audits</h1>
                  <p className="text-xs text-slate-500 mt-0.5">Physical stock counting sessions, team join codes, and approval workflows</p>
                </div>
                <button
                  onClick={() => setCreateAuditModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center gap-1.5"
                >
                  <Plus size={15} />
                  <span>Start New Audit</span>
                </button>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {audits.map(a => (
                  <div
                    key={a.id}
                    className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Branch: {a.branch_name}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${a.status === 'approved' ? 'bg-emerald-500/10 text-emerald-600' : a.status === 'review' ? 'bg-amber-500/10 text-amber-600' : 'bg-blue-500/10 text-blue-600'}`}
                        >
                          {a.status}
                        </span>
                      </div>
                      <h3 className="font-extrabold text-base text-slate-900 dark:text-white">{a.name}</h3>
                      <p className="text-xs text-slate-500 mt-1">Created {new Date(a.created_at).toLocaleDateString()}</p>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase font-bold block">Staff Join Code</span>
                        <span className="text-lg font-black font-mono tracking-widest text-emerald-600">{a.join_code}</span>
                      </div>
                      <button
                        onClick={() => { navigator.clipboard.writeText(a.join_code); notify('Join code copied!'); }}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1"
                        title="Copy Code"
                      >
                        <KeyRound size={16} />
                      </button>
                    </div>

                    <button
                      onClick={() => { setActiveAuditId(a.id); setPage('AuditDetail'); }}
                      className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                    >
                      <span>Open Reconciliation Hub</span>
                      <ArrowUpRight size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {page === 'AuditDetail' && activeAuditId && activeBusiness && (
            <AuditDetailView
              auditId={activeAuditId}
              businessId={activeBusiness.id}
              onBack={() => setPage('Audits')}
              notify={notify}
            />
          )}

          {page === 'Products' && activeBusiness && (
            <ProductCatalogueView
              businessId={activeBusiness.id}
              branchId={selectedBranchId}
              products={products}
              categories={categories}
              onRefresh={loadBusinessData}
              notify={notify}
            />
          )}

          {page === 'Inventory' && activeBusiness && (
            <InventoryView
              businessId={activeBusiness.id}
              branches={branches}
              selectedBranchId={selectedBranchId}
              onSelectBranch={setSelectedBranchId}
              notify={notify}
            />
          )}

          {page === 'Employees' && activeBusiness && (
            <EmployeeManagementView
              businessId={activeBusiness.id}
              audits={audits}
              notify={notify}
            />
          )}

          {page === 'Approvals' && activeBusiness && (
            <ProductRequestsView
              businessId={activeBusiness.id}
              notify={notify}
            />
          )}

          {page === 'Settings' && activeBusiness && (
            <SettingsView
              business={activeBusiness}
              branches={branches}
              theme={theme}
              onToggleTheme={toggleTheme}
              onRefresh={loadBusinessData}
              notify={notify}
            />
          )}
        </main>
      </div>

      {/* Create Audit Modal */}
      {createAuditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <ClipboardCheck size={18} className="text-emerald-600" />
                <span>Start Stock Audit</span>
              </h3>
              <button onClick={() => setCreateAuditModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Dispatching an audit creates an <strong>immutable baseline snapshot</strong> of your current catalogue. Changes to current inventory while this audit is active will never alter the frozen audit baseline.
            </p>

            <form onSubmit={handleCreateAudit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Audit Name *
                </label>
                <input
                  type="text"
                  required
                  value={auditName}
                  onChange={e => setAuditName(e.target.value)}
                  placeholder="e.g. Month-End Stock Reconciliation"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Branch Location
                </label>
                <select
                  value={selectedBranchId}
                  onChange={e => setSelectedBranchId(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {branches.map(br => (
                    <option key={br.id} value={br.id}>{br.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Instructions / Notes (Optional)
                </label>
                <input
                  type="text"
                  value={auditDesc}
                  onChange={e => setAuditDesc(e.target.value)}
                  placeholder="e.g. Count front sales floor before storeroom"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateAuditModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingAudit}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20"
                >
                  {creatingAudit ? 'Freezing Snapshot...' : 'Create & Snapshot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl border border-slate-800 text-xs flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}
