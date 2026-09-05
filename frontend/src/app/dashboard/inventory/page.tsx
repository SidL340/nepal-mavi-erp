'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { todayBS, formatDateInput } from '@/lib/nepali-date';
import {
  Package,
  Plus,
  Search,
  Filter,
  Layers,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  X,
  Building,
  Edit2,
  Trash2,
  Printer,
  FileText,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function InventoryPage() {
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState('');
  const [search, setSearch] = useState('');
  
  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  // School Profile for Print
  const { data: schoolProfile } = useQuery({
    queryKey: ['school-profile'],
    queryFn: async () => {
      const res = await api.get('/school/profile');
      return res.data?.data;
    },
  });

  // Fetch Categories
  const { data: categoriesData } = useQuery({
    queryKey: ['inventory-categories'],
    queryFn: async () => {
      const res = await api.get('/inventory/categories');
      return res.data?.data || [];
    },
  });

  // Fetch Items
  const { data: itemsData, isLoading } = useQuery({
    queryKey: ['inventory-items', selectedCategory, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategory) params.append('categoryId', selectedCategory);
      if (search) params.append('search', search);
      const res = await api.get(`/inventory?${params.toString()}`);
      return res.data?.data || [];
    },
  });

  // Add Item Mutation
  const addItemMutation = useMutation({
    mutationFn: async (formData: any) => {
      const res = await api.post('/inventory', formData);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Equipment added to Jinsi inventory!');
      setIsAddModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to add item');
    },
  });

  // Update Item Mutation
  const updateItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await api.put(`/inventory/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Inventory item updated successfully!');
      setEditingItem(null);
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update item');
    },
  });

  // Delete Item Mutation (Proxy-Proof POST route)
  const deleteItemMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.post(`/inventory/${id}/delete`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Inventory item deleted successfully.');
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to delete item');
    },
  });

  const handleAddSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data: any = {};
    fd.forEach((value, key) => {
      if (value) data[key] = value;
    });

    const voucherNo = fd.get('voucherNo');
    const chequeNo = fd.get('chequeNo');
    let extraMeta = '';
    if (voucherNo) extraMeta += `[Voucher: ${voucherNo}] `;
    if (chequeNo) extraMeta += `[Cheque: ${chequeNo}] `;

    if (extraMeta) {
      data.remarks = `${extraMeta}${data.remarks || ''}`.trim();
    }

    addItemMutation.mutate(data);
  };

  const handleEditSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingItem) return;

    const fd = new FormData(e.currentTarget);
    const data: any = {};
    fd.forEach((value, key) => {
      if (value) data[key] = value;
    });

    const voucherNo = fd.get('voucherNo');
    const chequeNo = fd.get('chequeNo');
    let extraMeta = '';
    if (voucherNo) extraMeta += `[Voucher: ${voucherNo}] `;
    if (chequeNo) extraMeta += `[Cheque: ${chequeNo}] `;

    let cleanRemarks = (data.remarks || '').replace(/\[Voucher:.*?\]/g, '').replace(/\[Cheque:.*?\]/g, '').trim();
    if (extraMeta) {
      data.remarks = `${extraMeta}${cleanRemarks}`.trim();
    } else {
      data.remarks = cleanRemarks;
    }

    updateItemMutation.mutate({ id: editingItem.id, data });
  };

  const extractMeta = (remarks: string = '') => {
    const vMatch = remarks.match(/\[Voucher:\s*(.*?)\]/i);
    const cMatch = remarks.match(/\[Cheque:\s*(.*?)\]/i);
    return {
      voucherNo: vMatch ? vMatch[1] : '',
      chequeNo: cMatch ? cMatch[1] : '',
      cleanRemarks: remarks.replace(/\[Voucher:.*?\]/g, '').replace(/\[Cheque:.*?\]/g, '').trim(),
    };
  };

  // Print Jinsi Asset Inspection Voucher
  const triggerPrintJinsiVoucher = (item: any) => {
    const printWin = window.open('', '_blank');
    if (!printWin) {
      window.print();
      return;
    }

    const sNameNp = schoolProfile?.schoolNameNepali || schoolProfile?.schoolName || 'श्री नेपाल माध्यमिक विद्यालय';
    const sNameEn = schoolProfile?.schoolName || 'Shree Nepal Secondary School';
    const sAddress = schoolProfile?.address || 'विश्रामपुर, रौतहट';
    const { voucherNo, chequeNo, cleanRemarks } = extractMeta(item.remarks || '');

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Jinsi Asset Voucher - ${item.name}</title>
          <style>
            @page { size: A4 portrait; margin: 10mm; }
            * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 0; background: #fff; color: #111; font-size: 11px; }
            .card { border: 2px solid #1e3a5f; padding: 22px; border-radius: 8px; }
            .header { text-align: center; border-bottom: 2px solid #1e3a5f; padding-bottom: 8px; margin-bottom: 12px; }
            .school-name { font-size: 18px; font-weight: 900; color: #1e3a5f; margin: 2px 0; }
            .badge { font-size: 11px; font-weight: 900; background: #eff6ff; color: #1e3a5f; display: inline-block; padding: 4px 14px; border-radius: 4px; border: 1px solid #bfdbfe; margin-top: 4px; text-transform: uppercase; }
            .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 11px; margin-bottom: 14px; background: #f8fafc; padding: 10px 14px; border-radius: 6px; border: 1px solid #e2e8f0; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 14px; }
            th { background: #1e3a5f; color: #fff; padding: 8px; text-align: left; font-size: 10px; border: 1px solid #1e3a5f; }
            td { padding: 8px; border: 1px solid #cbd5e1; }
            .footer-sig { margin-top: 45px; display: flex; justify-content: space-between; font-size: 10px; font-weight: 700; }
            .sig-box { width: 150px; text-align: center; border-top: 1px solid #333; padding-top: 4px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <div class="school-name">${sNameNp}</div>
              <div style="font-size: 11px; font-weight: bold; color: #4b5563;">${sNameEn}, ${sAddress}</div>
              <div class="badge">OFFICIAL JINSI ASSET & ENTRY VOUCHER (जिन्सी दाखिला तथा निरीक्षण भौचर)</div>
            </div>

            <div class="meta-grid">
              <div>Asset ID: <strong>JINSI-${item.id}</strong></div>
              <div>Purchase Date (BS): <strong>${item.purchaseDateBs || todayBS()}</strong></div>
              <div>Voucher No: <strong style="color: #1e3a5f;">${voucherNo || '—'}</strong></div>
              <div>Cheque No: <strong style="color: #6b21a8;">${chequeNo || '—'}</strong></div>
            </div>

            <table>
              <thead>
                <tr>
                  <th style="width: 30px; text-align: center;">S.N</th>
                  <th>ITEM NAME & SPECIFICATION (सामग्रीको विवरण)</th>
                  <th style="width: 90px;">CATEGORY</th>
                  <th style="width: 70px; text-align: center;">QTY</th>
                  <th style="width: 80px; text-align: center;">CONDITION</th>
                  <th style="width: 100px; text-align: right;">PURCHASE COST</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="text-align: center; font-weight: bold;">1</td>
                  <td>
                    <strong>${item.name}</strong> ${item.nameNepali ? `(${item.nameNepali})` : ''}
                    <div style="font-size: 10px; color: #555; margin-top: 2px;">
                      Location: ${item.location || 'Store'} | Source: ${item.source || 'School Fund'}
                    </div>
                  </td>
                  <td>${item.category?.name || 'General'}</td>
                  <td style="text-align: center; font-weight: bold; font-family: monospace;">${item.quantity} ${item.unit || 'थान'}</td>
                  <td style="text-align: center;">
                    <span style="font-weight: bold; color: ${item.condition === 'GOOD' ? '#15803d' : '#b45309'};">
                      ${item.condition}
                    </span>
                  </td>
                  <td style="text-align: right; font-family: monospace; font-weight: bold; color: #b91c1c;">
                    ${item.purchaseAmount ? `रू ${item.purchaseAmount.toLocaleString()}` : '—'}
                  </td>
                </tr>
              </tbody>
            </table>

            <div style="margin-bottom: 20px; font-size: 11px; background: #f8fafc; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0;">
              <div><strong>Inspection & Remarks:</strong> ${cleanRemarks || 'Asset physically verified, inspected, and entered into the institutional inventory ledger.'}</div>
              <div><strong>Status:</strong> जिन्सी खातामा दाखिला प्रमाणित गरिएको छ।</div>
            </div>

            <div class="footer-sig">
              <div class="sig-box">Storekeeper (जिन्सी प्रमुख)</div>
              <div class="sig-box">Accountant (लेखापाल)</div>
              <div class="sig-box">Principal (प्रधानाध्यापक)</div>
            </div>
          </div>

          <script>
            window.onload = function() { setTimeout(function() { window.print(); }, 400); };
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  const categories = categoriesData || [];
  const items = itemsData || [];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-[#1e3a5f]">
            Inventory & Jinsi Portal (जिन्सी तथा सामग्री व्यवस्थापन)
          </h1>
          <p className="text-xs text-gray-500 font-nepali mt-0.5">
            फर्निचर, कम्प्युटर/आईटी, विज्ञान प्रयोगशालाका उपकरण, खेलकुद तथा कार्यालय सामग्री अभिलेख, भौचर र चेक विवरण
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#1e3a5f] px-4 py-2 text-xs font-bold text-white hover:bg-[#2a5280] shadow-2xs transition"
        >
          <Plus size={14} />
          <span>+ Add Jinsi Item (सामग्री थप्नुहोस्)</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-2xs">
        <div className="relative flex-1 w-full">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search equipment by name, lab room, location, voucher or cheque..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-slate-50/50 pl-10 pr-4 py-2 text-xs focus:border-[#1e3a5f] focus:bg-white focus:outline-hidden font-medium"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter size={15} className="text-gray-400 shrink-0" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-xl border border-gray-200 bg-slate-50/50 px-3 py-2 text-xs focus:border-[#1e3a5f] focus:outline-hidden font-medium"
          >
            <option value="">All Categories (सबै वर्ग)</option>
            {categories.map((cat: any) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Items Table */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-700 font-sans">
            <thead className="bg-[#1e3a5f] text-white uppercase text-[10.5px] font-extrabold tracking-wider">
              <tr>
                <th className="px-4 py-3.5">Item / Hardware Name</th>
                <th className="px-4 py-3.5">Category</th>
                <th className="px-4 py-3.5 text-center">Quantity</th>
                <th className="px-4 py-3.5">Condition (अवस्था)</th>
                <th className="px-4 py-3.5">Location / Room</th>
                <th className="px-4 py-3.5">Voucher / Cheque No</th>
                <th className="px-4 py-3.5 text-right">Cost (रू)</th>
                <th className="px-4 py-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {isLoading ? (
                <tr><td colSpan={8} className="p-8 text-center text-gray-400">Loading inventory items...</td></tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-400">
                    <Package size={28} className="mx-auto text-gray-300 mb-1" />
                    <p className="text-sm font-semibold text-gray-600">No hardware or equipment registered</p>
                    <p className="text-xs text-gray-400 mt-0.5">Click "+ Add Jinsi Item" to record assets.</p>
                  </td>
                </tr>
              ) : (
                items.map((item: any) => {
                  const { voucherNo, chequeNo } = extractMeta(item.remarks || '');
                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3.5">
                        <p className="font-bold text-gray-900">{item.name}</p>
                        {item.nameNepali && <p className="text-[10px] text-gray-500 font-nepali">{item.nameNepali}</p>}
                        {item.purchaseDateBs && (
                          <span className="text-[10px] text-gray-400 font-mono">Date: {item.purchaseDateBs}</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-gray-700">{item.category?.name}</td>
                      <td className="px-4 py-3.5 text-center font-mono font-extrabold text-[#1e3a5f]">
                        {item.quantity} {item.unit || 'pcs'}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                            item.condition === 'GOOD'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : item.condition === 'FAIR'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : item.condition === 'DISPOSED'
                              ? 'bg-gray-100 text-gray-700 border border-gray-300'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {item.condition}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-gray-600">{item.location || 'Main Store'}</td>
                      <td className="px-4 py-3.5">
                        {voucherNo && (
                          <span className="font-mono font-bold text-[#1e3a5f] block text-[11px]">
                            Vouch: {voucherNo}
                          </span>
                        )}
                        {chequeNo && (
                          <span className="font-mono font-bold text-purple-900 block text-[10.5px]">
                            Chk: {chequeNo}
                          </span>
                        )}
                        {!voucherNo && !chequeNo && (
                          <span className="text-gray-400 text-[11px]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-gray-900">
                        {item.purchaseAmount ? `रू ${item.purchaseAmount.toLocaleString()}` : '—'}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => triggerPrintJinsiVoucher(item)}
                            className="inline-flex items-center gap-1 rounded bg-amber-400 hover:bg-amber-300 text-[#1e3a5f] px-2 py-1 text-[11px] font-extrabold shadow-2xs transition"
                            title="Print Jinsi Asset Inspection Voucher"
                          >
                            <Printer size={12} />
                            <span>Voucher</span>
                          </button>

                          <button
                            onClick={() => setEditingItem(item)}
                            className="inline-flex items-center gap-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-2 py-1 text-[11px] font-bold shadow-2xs transition"
                            title="Edit Jinsi Item Details"
                          >
                            <Edit2 size={12} />
                            <span>Edit</span>
                          </button>

                          <button
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to delete ${item.name}?`)) {
                                deleteItemMutation.mutate(item.id);
                              }
                            }}
                            className="inline-flex items-center gap-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-2 py-1 text-[11px] font-bold shadow-2xs transition"
                            title="Delete Item"
                          >
                            <Trash2 size={12} />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── ADD JINSI ITEM MODAL ─────────────────────────────────────────── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h2 className="text-sm font-bold text-[#1e3a5f] flex items-center gap-2">
                <Package size={16} />
                <span>Register Jinsi Item (जिन्सी सामग्री दर्ता)</span>
              </h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Item Name (English) *</label>
                  <input required name="name" type="text" placeholder="e.g. Dell Desktop Core i5" className="erp-input font-bold" />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Item Name (नेपाली)</label>
                  <input name="nameNepali" type="text" placeholder="उदा. कम्प्युटर, बेन्च" className="erp-input font-nepali" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Category *</label>
                  <select required name="categoryId" className="erp-input font-bold">
                    <option value="">Select Category</option>
                    {categories.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Quantity *</label>
                  <input required name="quantity" type="number" defaultValue="1" min="1" className="erp-input font-bold" />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Unit (इकाई)</label>
                  <input name="unit" type="text" placeholder="थान, सेट, pcs" defaultValue="थान" className="erp-input" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Condition (अवस्था) *</label>
                  <select name="condition" className="erp-input font-bold">
                    <option value="GOOD">GOOD (राम्रो)</option>
                    <option value="FAIR">FAIR (चालु)</option>
                    <option value="POOR">POOR (मर्मत योग्य)</option>
                    <option value="DAMAGED">DAMAGED (बिग्रिएको)</option>
                    <option value="DISPOSED">DISPOSED (लिलाम/हटाएको)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Location / Room (स्थान)</label>
                  <input name="location" type="text" placeholder="Computer Lab / Room 10" className="erp-input" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Purchase Date (BS)</label>
                  <input name="purchaseDateBs" type="text" defaultValue={todayBS()} className="erp-input font-mono font-bold" />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Voucher No (भौचर नं.)</label>
                  <input name="voucherNo" type="text" placeholder="e.g. VOUCH-102" className="erp-input font-mono font-bold" />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Cheque No (चेक नं.)</label>
                  <input name="chequeNo" type="text" placeholder="e.g. 981240" className="erp-input font-mono font-bold text-purple-900" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Source of Fund (स्रोत)</label>
                  <input name="source" type="text" placeholder="Govt Grant, School Fund" className="erp-input" />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Purchase Amount in रू</label>
                  <input name="purchaseAmount" type="number" step="any" placeholder="e.g. 45000" className="erp-input font-mono font-bold" />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Remarks / Note (कैफियत)</label>
                <textarea name="remarks" rows={2} placeholder="Specification, supplier name, etc..." className="erp-input" />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-xl border border-gray-200 px-4 py-1.5 text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addItemMutation.isPending}
                  className="rounded-xl bg-[#1e3a5f] px-5 py-1.5 font-bold text-white hover:bg-[#2a5280] shadow-sm"
                >
                  {addItemMutation.isPending ? 'Saving...' : 'Save Jinsi Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── EDIT JINSI ITEM MODAL ────────────────────────────────────────── */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h2 className="text-sm font-bold text-[#1e3a5f] flex items-center gap-2">
                <Edit2 size={16} />
                <span>Edit Jinsi Item (जिन्सी सामग्री सम्पादन)</span>
              </h2>
              <button onClick={() => setEditingItem(null)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>

            {(() => {
              const meta = extractMeta(editingItem.remarks || '');
              return (
                <form onSubmit={handleEditSubmit} className="space-y-3 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Item Name (English) *</label>
                      <input required name="name" type="text" defaultValue={editingItem.name} className="erp-input font-bold" />
                    </div>
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Item Name (नेपाली)</label>
                      <input name="nameNepali" type="text" defaultValue={editingItem.nameNepali || ''} className="erp-input font-nepali" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Category *</label>
                      <select required name="categoryId" defaultValue={editingItem.categoryId} className="erp-input font-bold">
                        {categories.map((c: any) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Quantity *</label>
                      <input required name="quantity" type="number" defaultValue={editingItem.quantity} min="1" className="erp-input font-bold" />
                    </div>
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Unit (इकाई)</label>
                      <input name="unit" type="text" defaultValue={editingItem.unit || 'थान'} className="erp-input" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Condition (अवस्था) *</label>
                      <select name="condition" defaultValue={editingItem.condition} className="erp-input font-bold">
                        <option value="GOOD">GOOD (राम्रो)</option>
                        <option value="FAIR">FAIR (चालु)</option>
                        <option value="POOR">POOR (मर्मत योग्य)</option>
                        <option value="DAMAGED">DAMAGED (बिग्रिएको)</option>
                        <option value="DISPOSED">DISPOSED (लिलाम/हटाएको)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Location / Room (स्थान)</label>
                      <input name="location" type="text" defaultValue={editingItem.location || ''} className="erp-input" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Purchase Date (BS)</label>
                      <input name="purchaseDateBs" type="text" defaultValue={editingItem.purchaseDateBs || todayBS()} className="erp-input font-mono font-bold" />
                    </div>
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Voucher No (भौचर नं.)</label>
                      <input name="voucherNo" type="text" defaultValue={meta.voucherNo} placeholder="e.g. VOUCH-102" className="erp-input font-mono font-bold" />
                    </div>
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Cheque No (चेक नं.)</label>
                      <input name="chequeNo" type="text" defaultValue={meta.chequeNo} placeholder="e.g. 981240" className="erp-input font-mono font-bold text-purple-900" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Source of Fund (स्रोत)</label>
                      <input name="source" type="text" defaultValue={editingItem.source || ''} className="erp-input" />
                    </div>
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Purchase Amount in रू</label>
                      <input name="purchaseAmount" type="number" step="any" defaultValue={editingItem.purchaseAmount || ''} className="erp-input font-mono font-bold" />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Remarks / Note (कैफियत)</label>
                    <textarea name="remarks" rows={2} defaultValue={meta.cleanRemarks} className="erp-input" />
                  </div>

                  <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-3">
                    <button
                      type="button"
                      onClick={() => setEditingItem(null)}
                      className="rounded-xl border border-gray-200 px-4 py-1.5 text-gray-600 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={updateItemMutation.isPending}
                      className="rounded-xl bg-[#1e3a5f] px-5 py-1.5 font-bold text-white hover:bg-[#2a5280] shadow-sm"
                    >
                      {updateItemMutation.isPending ? 'Updating...' : 'Update Jinsi Item'}
                    </button>
                  </div>
                </form>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
