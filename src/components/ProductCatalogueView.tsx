import React, { useState } from 'react';
import {
  ArrowDownToLine,
  Boxes,
  Edit2,
  FileSpreadsheet,
  Package,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  X
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { api } from '../lib/api';

interface ProductCatalogueViewProps {
  businessId: string;
  branchId?: string;
  products: any[];
  categories: any[];
  onRefresh: () => void;
  notify: (msg: string) => void;
}

export const ProductCatalogueView: React.FC<ProductCatalogueViewProps> = ({
  businessId,
  branchId,
  products,
  categories,
  onRefresh,
  notify
}) => {
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('All');

  // Add/Edit Product Modal
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    sku: '',
    brand: '',
    categoryId: '',
    unit: 'pcs',
    variant: 'Standard',
    expected: '0'
  });

  // Import Modal
  const [showImportModal, setShowImportModal] = useState(false);
  const [importRows, setImportRows] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);

  const filtered = products.filter(p => {
    const matchesCat = selectedCat === 'All' || p.category_name === selectedCat || (!p.category_name && selectedCat === 'General');
    const query = search.toLowerCase();
    const matchesSearch =
      !search ||
      p.name.toLowerCase().includes(query) ||
      (p.sku && p.sku.toLowerCase().includes(query)) ||
      (p.brand && p.brand.toLowerCase().includes(query));
    return matchesCat && matchesSearch;
  });

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      notify('Product name is required');
      return;
    }

    try {
      if (editingId) {
        await api.updateProduct(editingId, {
          businessId,
          ...form
        });
        notify('Product updated');
      } else {
        await api.createProduct({
          businessId,
          branchId,
          ...form,
          variants: [{ label: form.variant || 'Standard', sku: form.sku, expected: Number(form.expected) || 0 }]
        });
        notify('Product added to catalogue');
      }
      setShowModal(false);
      setEditingId(null);
      setForm({ name: '', sku: '', brand: '', categoryId: '', unit: 'pcs', variant: 'Standard', expected: '0' });
      onRefresh();
    } catch (err: any) {
      notify(err?.message || 'Failed to save product');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Archive ${name}? Historical audits containing this product will remain preserved.`)) {
      return;
    }
    try {
      await api.deleteProduct(id, businessId);
      notify('Product archived');
      onRefresh();
    } catch (err: any) {
      notify(err?.message || 'Failed to archive product');
    }
  };

  // Excel / CSV File Parsing for Import
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: 'array' });
        const firstSheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, any>>(firstSheet);
        if (!rows || rows.length === 0) {
          notify('No data found in uploaded file');
          return;
        }

        const normalized = rows.map((r, i) => ({
          name: String(r.Product || r.Name || r.name || r['Product Name'] || '').trim(),
          sku: String(r.SKU || r.sku || r['Product Code'] || `IMP-${i + 1}`).trim(),
          category: String(r.Category || r.category || 'General').trim(),
          brand: String(r.Brand || r.brand || '').trim(),
          variant: String(r.Variant || r.variant || 'Standard').trim(),
          unit: String(r.Unit || r.unit || 'pcs').trim(),
          expected: Number(r.Expected || r.expected || r.Quantity || r.quantity || 0)
        })).filter(r => r.name.length > 0);

        setImportRows(normalized);
        setShowImportModal(true);
      } catch {
        notify('Could not read spreadsheet file. Please check format.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleConfirmImport = async () => {
    if (importRows.length === 0) return;
    setImporting(true);
    try {
      const res = await api.importProducts({
        businessId,
        branchId,
        items: importRows
      });
      notify(`Successfully imported ${res.count} items!`);
      setShowImportModal(false);
      setImportRows([]);
      onRefresh();
    } catch (err: any) {
      notify(err?.message || 'Import failed.');
    } finally {
      setImporting(false);
    }
  };

  // Export Catalogue to Excel
  const handleExport = () => {
    const rows = products.flatMap(p =>
      p.variants.map((v: any) => ({
        'Product': p.name,
        'SKU': v.sku || p.sku,
        'Category': p.category_name || 'General',
        'Brand': p.brand || '',
        'Variant': v.variant_label,
        'Expected Stock': v.expected_quantity ?? 0,
        'Unit': p.unit
      }))
    );

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Products');
    XLSX.writeFile(wb, 'countly-product-catalogue.xlsx');
    notify('Product catalogue exported to Excel');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Product Catalogue</h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage products, variants, and expected baseline quantities</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all">
            <Upload size={15} className="text-emerald-600" />
            <span>Import Excel/CSV</span>
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileChange} className="hidden" />
          </label>

          <button
            onClick={handleExport}
            className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold flex items-center gap-1.5 transition-all"
          >
            <ArrowDownToLine size={15} />
            <span>Export</span>
          </button>

          <button
            onClick={() => {
              setEditingId(null);
              setForm({ name: '', sku: '', brand: '', categoryId: '', unit: 'pcs', variant: 'Standard', expected: '0' });
              setShowModal(true);
            }}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all"
          >
            <Plus size={16} />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Category Pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedCat('All')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${selectedCat === 'All' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
          >
            All Categories ({products.length})
          </button>
          {categories.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedCat(c.name)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${selectedCat === c.name ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative max-w-xs w-full">
          <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, SKU, brand..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">SKU / Code</th>
                <th className="py-3 px-4">Variants</th>
                <th className="py-3 px-4">Expected Stock</th>
                <th className="py-3 px-4">Unit</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400 text-xs">
                    No products found in catalogue.
                  </td>
                </tr>
              ) : (
                filtered.map(p => {
                  const totalExpected = p.variants.reduce((sum: number, v: any) => sum + (v.expected_quantity || 0), 0);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          <Package size={15} className="text-slate-400" />
                          <span>{p.name}</span>
                        </div>
                        {p.brand && <div className="text-[10px] text-slate-400 font-normal pl-6">{p.brand}</div>}
                      </td>

                      <td className="py-3.5 px-4 text-slate-500">
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-bold">
                          {p.category_name || 'General'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-400">
                        {p.sku || '—'}
                      </td>

                      <td className="py-3.5 px-4 text-emerald-600 font-semibold">
                        {p.variants.map((v: any) => v.variant_label).join(', ') || 'Standard'}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                        {totalExpected}
                      </td>

                      <td className="py-3.5 px-4 text-slate-500">
                        {p.unit}
                      </td>

                      <td className="py-3.5 px-4 text-right space-x-1">
                        <button
                          onClick={() => {
                            setEditingId(p.id);
                            setForm({
                              name: p.name,
                              sku: p.sku || '',
                              brand: p.brand || '',
                              categoryId: p.category_id || '',
                              unit: p.unit || 'pcs',
                              variant: p.variants[0]?.variant_label || 'Standard',
                              expected: String(totalExpected)
                            });
                            setShowModal(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id, p.name)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                {editingId ? 'Edit Product' : 'Add New Product to Catalogue'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Premium Cotton Shirt"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">SKU / Code</label>
                  <input
                    type="text"
                    value={form.sku}
                    onChange={e => setForm({ ...form, sku: e.target.value })}
                    placeholder="e.g. SH-001"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Brand</label>
                  <input
                    type="text"
                    value={form.brand}
                    onChange={e => setForm({ ...form, brand: e.target.value })}
                    placeholder="e.g. Northline"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Category</label>
                  <select
                    value={form.categoryId}
                    onChange={e => setForm({ ...form, categoryId: e.target.value })}
                    className="w-full px-2.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Select Category</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Unit of Measure</label>
                  <select
                    value={form.unit}
                    onChange={e => setForm({ ...form, unit: e.target.value })}
                    className="w-full px-2.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option>pcs</option>
                    <option>pairs</option>
                    <option>boxes</option>
                    <option>kg</option>
                    <option>litres</option>
                    <option>units</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Variant Attributes</label>
                  <input
                    type="text"
                    value={form.variant}
                    onChange={e => setForm({ ...form, variant: e.target.value })}
                    placeholder="e.g. Blue / L"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Expected Quantity</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={form.expected}
                    onChange={e => setForm({ ...form, expected: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20"
                >
                  {editingId ? 'Update Product' : 'Save to Catalogue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Preview Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <FileSpreadsheet size={18} className="text-emerald-600" />
                  <span>Confirm Bulk Product Import</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Found {importRows.length} valid product rows in your file.</p>
              </div>
              <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-950/50 sticky top-0 border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-400 uppercase">
                  <tr>
                    <th className="py-2.5 px-3">Product</th>
                    <th className="py-2.5 px-3">SKU</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Variant</th>
                    <th className="py-2.5 px-3">Expected</th>
                    <th className="py-2.5 px-3">Unit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono text-[11px]">
                  {importRows.slice(0, 10).map((r, i) => (
                    <tr key={i}>
                      <td className="py-2 px-3 font-sans font-bold">{r.name}</td>
                      <td className="py-2 px-3 text-slate-500">{r.sku}</td>
                      <td className="py-2 px-3">{r.category}</td>
                      <td className="py-2 px-3 text-emerald-600">{r.variant}</td>
                      <td className="py-2 px-3 font-bold">{r.expected}</td>
                      <td className="py-2 px-3">{r.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {importRows.length > 10 && (
              <p className="text-[11px] text-slate-400 text-center">...and {importRows.length - 10} more rows.</p>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-400"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={importing}
                onClick={handleConfirmImport}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20"
              >
                {importing ? 'Importing items...' : `Import All ${importRows.length} Products`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

