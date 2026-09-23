'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  TrendingUp,
  TrendingDown,
  Plus,
  Trash2,
  PieChart,
  AlertTriangle,
  CheckCircle2,
  Scale,
  Calendar,
  Layers,
  Sparkles,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function BudgetManagementPage() {
  const queryClient = useQueryClient();
  const [selectedYearId, setSelectedYearId] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New Budget Item Form
  const [budgetForm, setBudgetForm] = useState({
    category: '',
    allocatedAmount: '',
    type: 'EXPENSE', // or REVENUE
    remarks: '',
  });

  // Fetch Academic Years
  const { data: yearsData } = useQuery({
    queryKey: ['academic-years'],
    queryFn: async () => {
      const res = await api.get('/classes/academic-years/all');
      return res.data?.data || [];
    },
  });

  // Auto select active year
  const activeYear = yearsData?.find((y: any) => y.isActive) || yearsData?.[0];
  const effectiveYearId = selectedYearId || (activeYear ? activeYear.id.toString() : '');

  // Fetch Budget Comparison
  const { data: budgetData, isLoading } = useQuery({
    queryKey: ['budget-data', effectiveYearId],
    queryFn: async () => {
      if (!effectiveYearId) return null;
      const res = await api.get(`/budget?academicYearId=${effectiveYearId}`);
      return res.data?.data;
    },
    enabled: !!effectiveYearId,
  });

  // Fetch Expense Heads for category dropdown
  const { data: headsData } = useQuery({
    queryKey: ['finance-heads'],
    queryFn: async () => {
      const res = await api.get('/finance/heads');
      return res.data?.data || [];
    },
  });

  // Add Budget Allocation Mutation
  const addBudgetMutation = useMutation({
    mutationFn: async () => {
      if (!budgetForm.category || !budgetForm.allocatedAmount) {
        throw new Error('Please enter category and allocated amount');
      }
      const res = await api.post('/budget', {
        academicYearId: parseInt(effectiveYearId),
        category: budgetForm.category,
        allocatedAmount: parseFloat(budgetForm.allocatedAmount),
        type: budgetForm.type,
        remarks: budgetForm.remarks,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Budget allocation saved!');
      setIsAddModalOpen(false);
      setBudgetForm({ category: '', allocatedAmount: '', type: 'EXPENSE', remarks: '' });
      queryClient.invalidateQueries({ queryKey: ['budget-data'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Failed to save budget');
    },
  });

  // Delete Budget Mutation
  const deleteBudgetMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.delete(`/budget/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Budget item removed');
      queryClient.invalidateQueries({ queryKey: ['budget-data'] });
    },
  });

  const allocations = budgetData?.allocations || [];
  const totals = budgetData?.totals || {
    totalExpenseBudget: 0,
    totalExpenseActual: 0,
    totalRevenueBudget: 0,
    totalRevenueActual: 0,
  };

  const expensePct = totals.totalExpenseBudget > 0
    ? Math.round((totals.totalExpenseActual / totals.totalExpenseBudget) * 100)
    : 0;

  const revenuePct = totals.totalRevenueBudget > 0
    ? Math.round((totals.totalRevenueActual / totals.totalRevenueBudget) * 100)
    : 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-[#1e3a5f] flex items-center gap-2">
            <Layers className="text-[#1e3a5f]" />
            <span>School Budget & Variance Tracking (वार्षिक बजेट तथा खर्च नियन्त्रण)</span>
          </h1>
          <p className="text-xs text-gray-500 font-nepali mt-0.5">
            वार्षिक अनुमानित बजेट विनियोजन, वास्तविक खर्च/आम्दानी तुलना र प्रतिशत विश्लेषण
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Year selector */}
          <div className="flex items-center gap-1.5 bg-white border border-gray-200 px-3 py-1.5 rounded-xl shadow-2xs text-xs font-bold text-[#1e3a5f]">
            <Calendar size={14} className="text-blue-600" />
            <select
              value={effectiveYearId}
              onChange={(e) => setSelectedYearId(e.target.value)}
              className="bg-transparent font-bold focus:outline-hidden cursor-pointer"
            >
              {yearsData?.map((y: any) => (
                <option key={y.id} value={y.id}>
                  Session {y.year} {y.isActive ? '(Current Active)' : ''}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#1e3a5f] px-4 py-2 text-xs font-bold text-white hover:bg-[#2a5280] transition shadow-xs"
          >
            <Plus size={14} />
            <span>Set Budget Allocation (बजेट विनियोजन)</span>
          </button>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Total Expense Budget vs Actual */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingDown size={18} className="text-rose-600" />
              <span className="text-xs font-extrabold text-gray-700 uppercase tracking-wider">
                Total Expense Budget (कुल खर्च बजेट)
              </span>
            </div>
            <span
              className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                expensePct > 100
                  ? 'bg-red-100 text-red-800 animate-pulse'
                  : 'bg-rose-50 text-rose-700'
              }`}
            >
              {expensePct}% Used
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-1">
            <div>
              <p className="text-[10px] text-gray-500 font-bold uppercase">Estimated / Allocated</p>
              <p className="text-xl font-black text-gray-900 font-mono mt-0.5">
                रू {totals.totalExpenseBudget.toLocaleString()}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-rose-600 font-bold uppercase">Actual Spent</p>
              <p className="text-xl font-black text-rose-700 font-mono mt-0.5">
                रू {totals.totalExpenseActual.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              style={{ width: `${Math.min(expensePct, 100)}%` }}
              className={`h-full rounded-full transition-all duration-500 ${
                expensePct > 100
                  ? 'bg-red-600'
                  : expensePct > 80
                  ? 'bg-amber-500'
                  : 'bg-rose-500'
              }`}
            />
          </div>
        </div>

        {/* Total Revenue Budget vs Actual */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp size={18} className="text-emerald-600" />
              <span className="text-xs font-extrabold text-gray-700 uppercase tracking-wider">
                Total Revenue Target (कुल आम्दानी लक्ष्य)
              </span>
            </div>
            <span className="text-xs font-mono font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">
              {revenuePct}% Realized
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-1">
            <div>
              <p className="text-[10px] text-gray-500 font-bold uppercase">Target / Estimate</p>
              <p className="text-xl font-black text-gray-900 font-mono mt-0.5">
                रू {totals.totalRevenueBudget.toLocaleString()}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-emerald-600 font-bold uppercase">Actual Realized</p>
              <p className="text-xl font-black text-emerald-700 font-mono mt-0.5">
                रू {totals.totalRevenueActual.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              style={{ width: `${Math.min(revenuePct, 100)}%` }}
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
            />
          </div>
        </div>
      </div>

      {/* Breakdown Table */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-slate-50 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#1e3a5f]">
            Category-wise Budget Allocations & Realization (शीर्षकगत विनियोजन तथा खर्च)
          </h2>
          <span className="text-xs text-gray-500">
            Total Heads: <strong>{allocations.length}</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-700">
            <thead className="bg-[#1e3a5f] text-white">
              <tr>
                <th className="p-3.5 font-bold uppercase">Category Head (शीर्षक)</th>
                <th className="p-3.5 font-bold uppercase">Type</th>
                <th className="p-3.5 font-bold uppercase text-right">Allocated Budget (विनियोजित)</th>
                <th className="p-3.5 font-bold uppercase text-right">Actual Amount (वास्तविक)</th>
                <th className="p-3.5 font-bold uppercase text-right">Variance / Remaining</th>
                <th className="p-3.5 font-bold uppercase text-center w-36">Utilization %</th>
                <th className="p-3.5 font-bold uppercase text-right w-16">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400">
                    Loading budget records...
                  </td>
                </tr>
              ) : allocations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400">
                    <Layers size={32} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-sm font-semibold text-gray-600">No budget allocations set for this session</p>
                    <p className="text-xs text-gray-400">Click "Set Budget Allocation" to add yearly limits.</p>
                  </td>
                </tr>
              ) : (
                allocations.map((item: any) => {
                  const pct = item.percentUsed || 0;
                  const isOver = item.isOverBudget;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="p-3.5 font-extrabold text-gray-900">{item.category}</td>
                      <td className="p-3.5">
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                            item.type === 'EXPENSE'
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {item.type}
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-gray-900">
                        रू {item.allocatedAmount.toLocaleString()}
                      </td>
                      <td
                        className={`p-3.5 text-right font-mono font-bold ${
                          item.type === 'EXPENSE' ? 'text-rose-700' : 'text-emerald-700'
                        }`}
                      >
                        रू {item.actualAmount.toLocaleString()}
                      </td>
                      <td className="p-3.5 text-right font-mono font-semibold text-gray-700">
                        {item.type === 'EXPENSE'
                          ? `रू ${(item.allocatedAmount - item.actualAmount).toLocaleString()}`
                          : `रू ${(item.actualAmount - item.allocatedAmount).toLocaleString()}`}
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] font-mono font-bold">
                            <span className={isOver ? 'text-red-700' : 'text-gray-600'}>{pct}%</span>
                            {isOver && (
                              <span className="text-[9px] text-red-600 flex items-center gap-0.5">
                                <AlertTriangle size={10} /> Over
                              </span>
                            )}
                          </div>
                          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div
                              style={{ width: `${Math.min(pct, 100)}%` }}
                              className={`h-full rounded-full ${
                                isOver
                                  ? 'bg-red-600'
                                  : pct > 80
                                  ? 'bg-amber-500'
                                  : item.type === 'EXPENSE'
                                  ? 'bg-blue-600'
                                  : 'bg-emerald-600'
                              }`}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => {
                            if (confirm(`Remove budget allocation for ${item.category}?`)) {
                              deleteBudgetMutation.mutate(item.id);
                            }
                          }}
                          className="p-1 rounded-lg text-gray-400 hover:bg-rose-50 hover:text-rose-600 transition"
                          title="Delete"
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

      {/* ─── MODAL: ADD BUDGET ALLOCATION ─────────────────────────────────── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="text-base font-bold text-[#1e3a5f]">Set Budget Allocation (बजेट विनियोजन)</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Budget Type *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBudgetForm({ ...budgetForm, type: 'EXPENSE' })}
                    className={`p-2 rounded-xl border text-center font-bold transition ${
                      budgetForm.type === 'EXPENSE'
                        ? 'bg-rose-50 border-rose-300 text-rose-800 shadow-2xs'
                        : 'border-gray-200 text-gray-600 hover:bg-slate-50'
                    }`}
                  >
                    Expense Budget (खर्च)
                  </button>
                  <button
                    type="button"
                    onClick={() => setBudgetForm({ ...budgetForm, type: 'REVENUE' })}
                    className={`p-2 rounded-xl border text-center font-bold transition ${
                      budgetForm.type === 'REVENUE'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-2xs'
                        : 'border-gray-200 text-gray-600 hover:bg-slate-50'
                    }`}
                  >
                    Revenue Target (आम्दानी)
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Category Head (शीर्षक) *</label>
                <input
                  type="text"
                  placeholder="e.g. Salary, Electricity, Science Lab, Exam Fees"
                  value={budgetForm.category}
                  onChange={(e) => setBudgetForm({ ...budgetForm, category: e.target.value })}
                  className="erp-input font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Allocated Annual Budget (रू) *</label>
                <input
                  type="number"
                  placeholder="e.g. 500000"
                  value={budgetForm.allocatedAmount}
                  onChange={(e) => setBudgetForm({ ...budgetForm, allocatedAmount: e.target.value })}
                  className="erp-input font-mono font-bold text-base"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Remarks / Description</label>
                <input
                  type="text"
                  placeholder="Optional notes..."
                  value={budgetForm.remarks}
                  onChange={(e) => setBudgetForm({ ...budgetForm, remarks: e.target.value })}
                  className="erp-input"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-3">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-xl border border-gray-200 px-4 py-2 font-semibold text-gray-600"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={addBudgetMutation.isPending || !budgetForm.category || !budgetForm.allocatedAmount}
                onClick={() => addBudgetMutation.mutate()}
                className="rounded-xl bg-[#1e3a5f] px-5 py-2 font-bold text-white hover:bg-[#2a5280] disabled:opacity-60"
              >
                {addBudgetMutation.isPending ? 'Saving...' : 'Save Allocation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
