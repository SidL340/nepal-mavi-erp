'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { todayBS } from '@/lib/nepali-date';
import {
  TrendingDown,
  Plus,
  Filter,
  Receipt,
  FileText,
  X,
  CreditCard,
  Building,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function ExpensesPage() {
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Fetch Academic Years
  // Inline Expense Head Modal State
  const [isAddHeadModalOpen, setIsAddHeadModalOpen] = useState(false);
  const [newHeadName, setNewHeadName] = useState('');
  const [newHeadNameNepali, setNewHeadNameNepali] = useState('');

  const createExpenseHeadMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/expense/heads', payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success('New Expense Topic created!');
      queryClient.invalidateQueries({ queryKey: ['expense-heads'] });
      setIsAddHeadModalOpen(false);
      setNewHeadName('');
      setNewHeadNameNepali('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to create expense topic.');
    },
  });

  const { data: yearsData } = useQuery({
    queryKey: ['academic-years'],
    queryFn: async () => {
      const res = await api.get('/classes/academic-years/all');
      return res.data?.data || [];
    },
  });
  const activeYear = yearsData?.find((y: any) => y.isActive) || yearsData?.[0];

  // Fetch categories & heads
  const { data: categoriesData } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: async () => {
      const res = await api.get('/expense/categories');
      return res.data?.data || [];
    },
  });

  const { data: headsData } = useQuery({
    queryKey: ['expense-heads'],
    queryFn: async () => {
      const res = await api.get('/expense/heads');
      return res.data?.data || [];
    },
  });

  // Fetch expense entries
  const { data: entriesData, isLoading } = useQuery({
    queryKey: ['expense-entries', selectedCategory, activeYear?.id],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategory) params.append('categoryId', selectedCategory);
      if (activeYear?.id) params.append('academicYearId', activeYear.id.toString());
      const res = await api.get(`/expense/entries?${params.toString()}`);
      return res.data;
    },
  });

  // Add Expense Mutation
  const addExpenseMutation = useMutation({
    mutationFn: async (formData: any) => {
      const res = await api.post('/expense/entries', {
        ...formData,
        academicYearId: activeYear?.id || 1,
        expenseDateAd: new Date().toISOString().slice(0, 10),
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Expense recorded successfully!');
      setIsAddModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['expense-entries'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to record expense');
    },
  });

  const handleAddSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data: any = {};
    fd.forEach((value, key) => {
      if (value) data[key] = value;
    });
    addExpenseMutation.mutate(data);
  };

  const entries = entriesData?.data || [];
  const totalAmount = entriesData?.totalAmount || 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-[#1e3a5f]">
            Expense Management (खर्च व्यवस्थापन)
          </h1>
          <p className="text-xs text-gray-500 font-nepali mt-0.5">
            तलब, छात्रवृत्ति, स्टेशनरी, मर्मत, बिजुली, पानी, भ्रमण, कार्यक्रम तथा अतिथि सत्कार खर्च
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 shadow-2xs transition"
        >
          <Plus size={14} />
          <span>Record Expense (खर्च प्रविष्टि)</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-2xs">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Total Expenses (Year {activeYear?.year || '2081-82'})</span>
          <p className="text-2xl font-extrabold text-rose-700 mt-2">रू {totalAmount.toLocaleString()}</p>
          <p className="text-[11px] text-gray-400 mt-1">कुल निकासा भएको खर्च</p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-2xs">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Staff Salary & SSK</span>
          <p className="text-2xl font-extrabold text-[#1e3a5f] mt-2">
            रू {entries
              .filter((e: any) => e.head?.category?.name?.includes('Salary') || e.head?.category?.name?.includes('SSK'))
              .reduce((s: number, e: any) => s + (e.amount || 0), 0)
              .toLocaleString()}
          </p>
          <p className="text-[11px] text-gray-400 mt-1">शिक्षक/कर्मचारी तलब तथा संचय कोष</p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-2xs">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500">School Operations & Maintenance</span>
          <p className="text-2xl font-extrabold text-amber-600 mt-2">
            रू {entries
              .filter((e: any) => !e.head?.category?.name?.includes('Salary'))
              .reduce((s: number, e: any) => s + (e.amount || 0), 0)
              .toLocaleString()}
          </p>
          <p className="text-[11px] text-gray-400 mt-1">स्टेशनरी, मर्मत, कार्यक्रम तथा अन्य</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-2xs">
        <Filter size={15} className="text-gray-400 shrink-0" />
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="rounded-xl border border-gray-200 bg-slate-50/50 px-3 py-2 text-xs focus:border-[#1e3a5f] focus:outline-hidden"
        >
          <option value="">All Expense Categories (सबै शीर्षकहरू)</option>
          {categoriesData?.map((cat: any) => (
            <option key={cat.id} value={cat.id}>
              {cat.name} {cat.nameNepali ? `(${cat.nameNepali})` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Expense Table */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-700">
            <thead className="bg-[#1e3a5f] text-white">
              <tr>
                <th className="px-4 py-3.5 font-bold uppercase tracking-wider">Date (BS)</th>
                <th className="px-4 py-3.5 font-bold uppercase tracking-wider">Expense Topic / Head</th>
                <th className="px-4 py-3.5 font-bold uppercase tracking-wider">Paid To & Approved By</th>
                <th className="px-4 py-3.5 font-bold uppercase tracking-wider">Bill / Voucher</th>
                <th className="px-4 py-3.5 font-bold uppercase tracking-wider">Account</th>
                <th className="px-4 py-3.5 font-bold uppercase tracking-wider text-right">Amount (रकम)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#1e3a5f] border-t-transparent" />
                    <p className="mt-2 text-xs">Loading expense records...</p>
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">
                    <Receipt size={28} className="mx-auto text-gray-300 mb-1" />
                    <p className="text-sm font-semibold text-gray-600">No expense records found</p>
                  </td>
                </tr>
              ) : (
                entries.map((entry: any) => (
                  <tr key={entry.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-4 py-3.5 font-mono font-bold text-gray-800">{entry.expenseDateBs}</td>
                    <td className="px-4 py-3.5">
                      <p className="font-bold text-gray-900">{entry.head?.name}</p>
                      <span className="text-[10px] text-gray-400">{entry.head?.category?.name}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-gray-800">{entry.paidTo || '—'}</p>
                      {entry.approvedBy && <span className="text-[10px] text-gray-400">Approved: {entry.approvedBy}</span>}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-gray-500">
                      {entry.billNo ? `Bill: ${entry.billNo}` : entry.voucherNo || '—'}
                    </td>
                    <td className="px-4 py-3.5 text-gray-600">{entry.paidFromAccount || 'School Account'}</td>
                    <td className="px-4 py-3.5 text-right font-mono font-extrabold text-rose-700 text-sm">
                      रू {entry.amount.toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── ADD EXPENSE MODAL ──────────────────────────────────────────────── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <div>
                <h2 className="text-base font-bold text-[#1e3a5f]">Record School Expense (खर्च प्रविष्टि)</h2>
                <p className="text-[11px] text-gray-500">Salary, stationeries, repairs, events, electricity, tour, etc.</p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-gray-700">Expense Topic / Head (शीर्षक) *</label>
                    <button
                      type="button"
                      onClick={() => setIsAddHeadModalOpen(true)}
                      className="text-[10px] font-extrabold text-rose-600 hover:underline flex items-center gap-0.5"
                    >
                      <Plus size={11} />
                      <span>+ Add Topic (नयाँ शीर्षक)</span>
                    </button>
                  </div>
                  <select name="headId" required className="erp-input font-bold">
                    <option value="">-- Select Expense Topic --</option>
                    {headsData?.map((h: any) => (
                      <option key={h.id} value={h.id}>
                        {h.name} {h.nameNepali ? `(${h.nameNepali})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Amount in रू (खर्च रकम) *</label>
                  <input required name="amount" type="number" step="any" placeholder="e.g. 15000" className="erp-input font-bold" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Expense Date in BS (YYYY-MM-DD) *</label>
                  <input required name="expenseDateBs" type="text" defaultValue={todayBS()} className="erp-input font-mono font-bold" />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Paid To / Recipient (पाउने व्यक्ति/संस्था)</label>
                  <input name="paidTo" type="text" placeholder="Vendor / Teacher / Person name" className="erp-input" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Paid From Account</label>
                  <input name="paidFromAccount" type="text" defaultValue="School Operational Account" className="erp-input" />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Bill / Voucher Number</label>
                  <input name="billNo" type="text" placeholder="BILL-2081-042" className="erp-input font-mono" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Approved By (स्वीकृत गर्ने)</label>
                  <input name="approvedBy" type="text" placeholder="Principal / SMC Chairperson" className="erp-input" />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Description / Particulars</label>
                  <input name="description" type="text" placeholder="Details of purchased item or service" className="erp-input" />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Remarks</label>
                <textarea name="remarks" rows={2} placeholder="Any extra remarks..." className="erp-input" />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2 font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addExpenseMutation.isPending}
                  className="rounded-xl bg-rose-600 px-5 py-2 font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
                >
                  {addExpenseMutation.isPending ? 'Saving...' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inline Add Expense Topic Modal */}
      {isAddHeadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="font-extrabold text-sm text-[#1e3a5f]">Add New Expense Topic (नयाँ खर्च शीर्षक)</h3>
              <button onClick={() => setIsAddHeadModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createExpenseHeadMutation.mutate({
                  categoryId: categoriesData?.[0]?.id || 1,
                  name: newHeadName,
                  nameNepali: newHeadNameNepali,
                });
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-bold text-gray-700 mb-1">Expense Topic Title (English) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tour / Excursion, Stationery, Internet"
                  value={newHeadName}
                  onChange={(e) => setNewHeadName(e.target.value)}
                  className="erp-input font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Nepali Title (नेपाली शीर्षक)</label>
                <input
                  type="text"
                  placeholder="भ्रमण, स्टेसनरी, इन्टरनेट"
                  value={newHeadNameNepali}
                  onChange={(e) => setNewHeadNameNepali(e.target.value)}
                  className="erp-input font-nepali font-bold"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button type="button" onClick={() => setIsAddHeadModalOpen(false)} className="px-4 py-2 border rounded-xl font-bold">Cancel</button>
                <button type="submit" disabled={createExpenseHeadMutation.isPending} className="px-5 py-2 bg-rose-600 text-white font-bold rounded-xl shadow-xs">
                  {createExpenseHeadMutation.isPending ? 'Saving...' : 'Save Expense Topic (सेभ गर्नुहोस्)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
