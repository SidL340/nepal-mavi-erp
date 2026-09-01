'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  Layers,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Check,
  Receipt,
  TrendingUp,
  TrendingDown,
  BookOpen,
  Package,
  Sparkles,
  Save,
  Zap,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function MasterHeadsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'fee' | 'class_matrix' | 'categories' | 'income' | 'expense'>('fee');
  const [search, setSearch] = useState('');

  // Modals
  const [isAddFeeModalOpen, setIsAddFeeModalOpen] = useState(false);
  const [editingFeeHead, setEditingFeeHead] = useState<any>(null);

  const [isAddIncomeHeadOpen, setIsAddIncomeHeadOpen] = useState(false);
  const [editingIncomeHead, setEditingIncomeHead] = useState<any>(null);

  const [isAddExpenseHeadOpen, setIsAddExpenseHeadOpen] = useState(false);
  const [editingExpenseHead, setEditingExpenseHead] = useState<any>(null);

  // Category Modal State
  const [isAddCatModalOpen, setIsAddCatModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<any>(null);
  const [catForm, setCatForm] = useState<{ name: string; nameNepali: string; module: 'INCOME' | 'EXPENSE' }>({
    name: '',
    nameNepali: '',
    module: 'INCOME',
  });

  // Form States
  const [feeForm, setFeeForm] = useState({ name: '', nameNepali: '', amount: '', isOptional: false });
  const [incomeHeadForm, setIncomeHeadForm] = useState({ categoryId: '', name: '', nameNepali: '' });
  const [expenseHeadForm, setExpenseHeadForm] = useState({ categoryId: '', name: '', nameNepali: '' });

  // Fetch Fee Heads
  const { data: feeHeads, isLoading: isFeeLoading } = useQuery({
    queryKey: ['fee-heads-all'],
    queryFn: async () => {
      const res = await api.get('/income/fee-heads');
      return res.data?.data || [];
    },
  });

  // Fetch Income Categories & Heads
  const { data: incomeCategories } = useQuery({
    queryKey: ['income-categories-all'],
    queryFn: async () => {
      const res = await api.get('/income/categories');
      return res.data?.data || [];
    },
  });

  const { data: incomeHeads, isLoading: isIncomeLoading } = useQuery({
    queryKey: ['income-heads-all'],
    queryFn: async () => {
      const res = await api.get('/income/heads');
      return res.data?.data || [];
    },
  });

  // Fetch Expense Categories & Heads
  const { data: expenseCategories } = useQuery({
    queryKey: ['expense-categories-all'],
    queryFn: async () => {
      const res = await api.get('/expense/categories');
      return res.data?.data || [];
    },
  });

  const { data: expenseHeads, isLoading: isExpenseLoading } = useQuery({
    queryKey: ['expense-heads-all'],
    queryFn: async () => {
      const res = await api.get('/expense/heads');
      return res.data?.data || [];
    },
  });

  // ── Class Fee Matrix State & Queries ───────────────────────────────────────
  const [matrixState, setMatrixState] = useState<{ [key: string]: string }>({});

  const { data: matrixData, isLoading: isMatrixLoading } = useQuery({
    queryKey: ['class-fee-matrix-all'],
    queryFn: async () => {
      const res = await api.get('/income/class-fee-structures/matrix/all');
      return res.data?.data;
    },
  });

  useEffect(() => {
    if (matrixData?.structMap) {
      const map: { [key: string]: string } = {};
      Object.keys(matrixData.structMap).forEach((key) => {
        map[key] = matrixData.structMap[key].toString();
      });
      setMatrixState(map);
    }
  }, [matrixData]);

  const saveMatrixMutation = useMutation({
    mutationFn: async (structures: any[]) => {
      const res = await api.post('/income/class-fee-structures', { structures });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Class fee rates saved successfully!');
      queryClient.invalidateQueries({ queryKey: ['class-fee-matrix-all'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to save class fee rates.');
    },
  });

  const handleCellChange = (classId: number, feeHeadId: number, val: string) => {
    setMatrixState((prev) => ({
      ...prev,
      [`${classId}_${feeHeadId}`]: val,
    }));
  };

  const handleSaveAllMatrix = () => {
    const structures: any[] = [];
    if (!matrixData?.classes || !matrixData?.feeHeads) return;

    matrixData.classes.forEach((c: any) => {
      matrixData.feeHeads.forEach((fh: any) => {
        const val = matrixState[`${c.id}_${fh.id}`];
        if (val !== undefined && val !== '') {
          structures.push({
            classId: c.id,
            feeHeadId: fh.id,
            amount: parseFloat(val),
          });
        }
      });
    });

    saveMatrixMutation.mutate(structures);
  };

  // ── 1. FEE HEAD MUTATIONS ──────────────────────────────────────────────────
  const saveFeeHeadMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (editingFeeHead) {
        const res = await api.put(`/income/fee-heads/${editingFeeHead.id}`, payload);
        return res.data;
      } else {
        const res = await api.post('/income/fee-heads', payload);
        return res.data;
      }
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Fee head saved successfully!');
      setIsAddFeeModalOpen(false);
      setEditingFeeHead(null);
      setFeeForm({ name: '', nameNepali: '', amount: '', isOptional: false });
      queryClient.invalidateQueries({ queryKey: ['fee-heads-all'] });
      queryClient.invalidateQueries({ queryKey: ['fee-heads'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to save fee head.');
    },
  });

  const deleteFeeHeadMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.delete(`/income/fee-heads/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Fee head deleted/deactivated.');
      queryClient.invalidateQueries({ queryKey: ['fee-heads-all'] });
      queryClient.invalidateQueries({ queryKey: ['fee-heads'] });
    },
  });

  // ── 2. INCOME HEAD MUTATIONS ───────────────────────────────────────────────
  const saveIncomeHeadMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (editingIncomeHead) {
        const res = await api.put(`/income/heads/${editingIncomeHead.id}`, payload);
        return res.data;
      } else {
        const res = await api.post('/income/heads', payload);
        return res.data;
      }
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Income head saved successfully!');
      setIsAddIncomeHeadOpen(false);
      setEditingIncomeHead(null);
      setIncomeHeadForm({ categoryId: '', name: '', nameNepali: '' });
      queryClient.invalidateQueries({ queryKey: ['income-heads-all'] });
      queryClient.invalidateQueries({ queryKey: ['income-heads'] });
    },
  });

  const deleteIncomeHeadMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.delete(`/income/heads/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Income head deactivated.');
      queryClient.invalidateQueries({ queryKey: ['income-heads-all'] });
      queryClient.invalidateQueries({ queryKey: ['income-heads'] });
    },
  });

  // ── 3. EXPENSE HEAD MUTATIONS ──────────────────────────────────────────────
  const saveExpenseHeadMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (editingExpenseHead) {
        const res = await api.put(`/expense/heads/${editingExpenseHead.id}`, payload);
        return res.data;
      } else {
        const res = await api.post('/expense/heads', payload);
        return res.data;
      }
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Expense head saved successfully!');
      setIsAddExpenseHeadOpen(false);
      setEditingExpenseHead(null);
      setExpenseHeadForm({ categoryId: '', name: '', nameNepali: '' });
      queryClient.invalidateQueries({ queryKey: ['expense-heads-all'] });
      queryClient.invalidateQueries({ queryKey: ['expense-heads'] });
    },
  });

  const deleteExpenseHeadMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.delete(`/expense/heads/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Expense head deactivated.');
      queryClient.invalidateQueries({ queryKey: ['expense-heads-all'] });
      queryClient.invalidateQueries({ queryKey: ['expense-heads'] });
    },
  });

  // ── 4. CATEGORY MUTATIONS ──────────────────────────────────────────────────
  const saveCatMutation = useMutation({
    mutationFn: async (payload: any) => {
      const endpoint = catForm.module === 'INCOME' ? '/income/categories' : '/expense/categories';
      if (editingCat) {
        const res = await api.put(`${endpoint}/${editingCat.id}`, payload);
        return res.data;
      } else {
        const res = await api.post(endpoint, payload);
        return res.data;
      }
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Category saved successfully!');
      setIsAddCatModalOpen(false);
      setEditingCat(null);
      setCatForm({ name: '', nameNepali: '', module: 'INCOME' });
      queryClient.invalidateQueries({ queryKey: ['income-categories-all'] });
      queryClient.invalidateQueries({ queryKey: ['expense-categories-all'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to save category.');
    },
  });

  const deleteCatMutation = useMutation({
    mutationFn: async ({ id, module }: { id: number; module: 'INCOME' | 'EXPENSE' }) => {
      const endpoint = module === 'INCOME' ? `/income/categories/${id}` : `/expense/categories/${id}`;
      const res = await api.delete(endpoint);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Category deactivated.');
      queryClient.invalidateQueries({ queryKey: ['income-categories-all'] });
      queryClient.invalidateQueries({ queryKey: ['expense-categories-all'] });
    },
  });

  // Filter lists
  const allCategories = [
    ...(incomeCategories || []).map((c: any) => ({ ...c, module: 'INCOME' as const })),
    ...(expenseCategories || []).map((c: any) => ({ ...c, module: 'EXPENSE' as const })),
  ];

  const filteredCategories = allCategories.filter((c: any) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return c.name?.toLowerCase().includes(q) || c.nameNepali?.toLowerCase().includes(q);
  });

  const filteredFeeHeads = (feeHeads || []).filter((h: any) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return h.name?.toLowerCase().includes(q) || h.nameNepali?.toLowerCase().includes(q);
  });

  const filteredIncomeHeads = (incomeHeads || []).filter((h: any) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return h.name?.toLowerCase().includes(q) || h.category?.name?.toLowerCase().includes(q);
  });

  const filteredExpenseHeads = (expenseHeads || []).filter((h: any) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return h.name?.toLowerCase().includes(q) || h.category?.name?.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-[#1e3a5f]">
            Universal Masters & Categories (शीर्षक तथा मास्टर व्यवस्थापन)
          </h1>
          <p className="text-xs text-gray-500 font-nepali mt-0.5">
            Add, edit, or delete Fee Heads, Income Categories, Expense Heads & Master Dropdowns across the entire ERP system
          </p>
        </div>

        {/* Primary Action Button based on active tab */}
        {activeTab === 'fee' && (
          <button
            onClick={() => {
              setEditingFeeHead(null);
              setFeeForm({ name: '', nameNepali: '', amount: '', isOptional: false });
              setIsAddFeeModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 shadow-2xs transition"
          >
            <Plus size={15} />
            <span>+ Add Fee Head (नयाँ शुल्क शीर्षक)</span>
          </button>
        )}

        {activeTab === 'categories' && (
          <button
            onClick={() => {
              setEditingCat(null);
              setCatForm({ name: '', nameNepali: '', module: 'INCOME' });
              setIsAddCatModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white hover:bg-purple-700 shadow-2xs transition"
          >
            <Plus size={15} />
            <span>+ Add Category (नयाँ वर्ग/समूह थप्नुहोस्)</span>
          </button>
        )}

        {activeTab === 'income' && (
          <button
            onClick={() => {
              setEditingIncomeHead(null);
              setIncomeHeadForm({ categoryId: incomeCategories?.[0]?.id || '', name: '', nameNepali: '' });
              setIsAddIncomeHeadOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#1e3a5f] px-4 py-2 text-xs font-bold text-white hover:bg-[#2a5280] shadow-2xs transition"
          >
            <Plus size={15} />
            <span>+ Add Income Head (आम्दानी शीर्षक)</span>
          </button>
        )}

        {activeTab === 'expense' && (
          <button
            onClick={() => {
              setEditingExpenseHead(null);
              setExpenseHeadForm({ categoryId: expenseCategories?.[0]?.id || '', name: '', nameNepali: '' });
              setIsAddExpenseHeadOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 shadow-2xs transition"
          >
            <Plus size={15} />
            <span>+ Add Expense Head (खर्च शीर्षक)</span>
          </button>
        )}
        {activeTab === 'class_matrix' && (
          <button
            onClick={handleSaveAllMatrix}
            disabled={saveMatrixMutation.isPending}
            className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white hover:bg-purple-700 shadow-2xs transition disabled:opacity-50"
          >
            <Save size={15} />
            <span>{saveMatrixMutation.isPending ? 'Saving...' : 'Save Class Fee Matrix (दर सेभ गर्नुहोस्)'}</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 text-xs font-bold">
        <button
          onClick={() => setActiveTab('fee')}
          className={`border-b-2 px-4 py-2.5 transition flex items-center gap-2 ${
            activeTab === 'fee' ? 'border-emerald-600 text-emerald-800 font-extrabold' : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Receipt size={14} />
          <span>Student Fee Heads ({feeHeads?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('categories')}
          className={`border-b-2 px-4 py-2.5 transition flex items-center gap-2 ${
            activeTab === 'categories' ? 'border-purple-600 text-purple-900 font-extrabold' : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Layers size={14} />
          <span>Categories & Groups ({allCategories.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('class_matrix')}
          className={`border-b-2 px-4 py-2.5 transition flex items-center gap-2 ${
            activeTab === 'class_matrix' ? 'border-purple-600 text-purple-800 font-extrabold bg-purple-50/50' : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Layers size={14} className="text-purple-600" />
          <span>Class-wise Fee Setup (कक्षागत शुल्क दर निर्धारण)</span>
        </button>

        <button
          onClick={() => setActiveTab('income')}
          className={`border-b-2 px-4 py-2.5 transition flex items-center gap-2 ${
            activeTab === 'income' ? 'border-[#1e3a5f] text-[#1e3a5f] font-extrabold' : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <TrendingUp size={14} />
          <span>Income Heads ({incomeHeads?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('expense')}
          className={`border-b-2 px-4 py-2.5 transition flex items-center gap-2 ${
            activeTab === 'expense' ? 'border-rose-600 text-rose-700 font-extrabold' : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <TrendingDown size={14} />
          <span>Expense Heads ({expenseHeads?.length || 0})</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search size={15} className="absolute left-3 top-2.5 text-gray-400" />
        <input
          type="text"
          placeholder="Search heads by title or Nepali name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="erp-input pl-9 text-xs"
        />
      </div>

      {/* ─── TAB 2: CLASS-WISE FEE MATRIX ───────────────────────────────────── */}
      {activeTab === 'class_matrix' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-purple-50 border border-purple-200 p-4 rounded-xl text-xs">
            <div>
              <h3 className="font-extrabold text-purple-900 flex items-center gap-1.5">
                <Layers size={16} className="text-purple-600" />
                <span>Class-wise Fee Rates Configuration (कक्षा अनुसार मासिक तथा भर्ना शुल्क दर)</span>
              </h3>
              <p className="text-[11px] text-purple-700 font-nepali mt-0.5">
                प्रत्येक कक्षाको फरक-फरक ट्युसन/मासिक शुल्क, भर्ना तथा परीक्षा शुल्क दर तोक्नुहोस्।
              </p>
            </div>
            <button
              onClick={handleSaveAllMatrix}
              disabled={saveMatrixMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 text-xs font-black shadow-xs transition"
            >
              <Save size={15} />
              <span>{saveMatrixMutation.isPending ? 'Saving...' : 'Save All Class Fee Rates (सबै दर सेभ गर्नुहोस्)'}</span>
            </button>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white shadow-2xs overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#1e3a5f] text-white font-bold">
                <tr>
                  <th className="p-3.5 w-40">Class Name (कक्षा)</th>
                  <th className="p-3.5 w-24">Section</th>
                  {matrixData?.feeHeads?.map((fh: any) => (
                    <th key={fh.id} className="p-3.5 text-center min-w-[140px]">
                      <div>{fh.name}</div>
                      {fh.nameNepali && <div className="text-[10px] text-amber-300 font-nepali">{fh.nameNepali}</div>}
                      <div className="text-[10px] text-gray-300 font-mono font-normal">Def: Rs. {fh.amount || 0}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isMatrixLoading ? (
                  <tr><td colSpan={10} className="p-8 text-center text-gray-400">Loading class fee matrix...</td></tr>
                ) : !matrixData?.classes || matrixData.classes.length === 0 ? (
                  <tr><td colSpan={10} className="p-8 text-center text-gray-400">No classes found. Please create classes first.</td></tr>
                ) : (
                  matrixData.classes.map((c: any) => (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="p-3.5 font-extrabold text-gray-900">{c.name}</td>
                      <td className="p-3.5 font-mono text-gray-500">{c.section || 'All'}</td>
                      {matrixData.feeHeads?.map((fh: any) => {
                        const cellKey = `${c.id}_${fh.id}`;
                        const currentVal = matrixState[cellKey] !== undefined ? matrixState[cellKey] : (fh.amount || '');
                        return (
                          <td key={fh.id} className="p-2 text-center">
                            <input
                              type="number"
                              placeholder={`Def: ${fh.amount || 0}`}
                              value={currentVal}
                              onChange={(e) => handleCellChange(c.id, fh.id, e.target.value)}
                              className="w-28 text-center rounded-lg border border-gray-300 px-2 py-1 font-mono font-bold text-[#1e3a5f] focus:ring-2 focus:ring-purple-600 text-xs"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TAB: CATEGORIES & GROUPS ────────────────────────────────────────── */}
      {activeTab === 'categories' && (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-2xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#1e3a5f] text-white font-bold">
              <tr>
                <th className="p-3.5">#</th>
                <th className="p-3.5">Category Title (English)</th>
                <th className="p-3.5">Title (नेपाली वर्ग/समूह)</th>
                <th className="p-3.5 text-center">Module Type</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredCategories.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-gray-400">No categories found. Click "+ Add Category" above.</td></tr>
              ) : (
                filteredCategories.map((cat: any, idx: number) => (
                  <tr key={`${cat.module}-${cat.id}`} className="hover:bg-purple-50/40">
                    <td className="p-3.5 font-mono text-gray-400">{idx + 1}</td>
                    <td className="p-3.5 font-extrabold text-gray-900">{cat.name}</td>
                    <td className="p-3.5 font-nepali font-bold text-gray-800">{cat.nameNepali || '—'}</td>
                    <td className="p-3.5 text-center">
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-black ${
                        cat.module === 'INCOME' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {cat.module === 'INCOME' ? 'INCOME CATEGORY (आम्दानी)' : 'EXPENSE CATEGORY (खर्च)'}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setEditingCat(cat);
                            setCatForm({ name: cat.name, nameNepali: cat.nameNepali || '', module: cat.module });
                            setIsAddCatModalOpen(true);
                          }}
                          className="rounded-lg p-1 text-blue-600 hover:bg-blue-50"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Are you sure you want to deactivate category "${cat.name}"?`)) {
                              deleteCatMutation.mutate({ id: cat.id, module: cat.module });
                            }
                          }}
                          className="rounded-lg p-1 text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── TAB 1: STUDENT FEE HEADS ────────────────────────────────────────── */}
      {activeTab === 'fee' && (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-2xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#1e3a5f] text-white font-bold">
              <tr>
                <th className="p-3.5">#</th>
                <th className="p-3.5">Fee Head Title (English)</th>
                <th className="p-3.5">Title (नेपाली)</th>
                <th className="p-3.5 text-right">Default Amount (रू)</th>
                <th className="p-3.5 text-center">Type</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isFeeLoading ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-400">Loading fee heads...</td></tr>
              ) : filteredFeeHeads.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-400">No fee heads found. Click "+ Add Fee Head" above to create one.</td></tr>
              ) : (
                filteredFeeHeads.map((fh: any, idx: number) => (
                  <tr key={fh.id} className="hover:bg-slate-50">
                    <td className="p-3.5 font-mono text-gray-400">{idx + 1}</td>
                    <td className="p-3.5 font-extrabold text-gray-900">{fh.name}</td>
                    <td className="p-3.5 font-nepali font-bold text-gray-700">{fh.nameNepali || '—'}</td>
                    <td className="p-3.5 text-right font-mono font-bold text-emerald-800">
                      {fh.amount > 0 ? `Rs. ${fh.amount.toLocaleString()}` : 'Variable'}
                    </td>
                    <td className="p-3.5 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${fh.isOptional ? 'bg-blue-50 text-blue-800' : 'bg-slate-100 text-slate-700'}`}>
                        {fh.isOptional ? 'Optional' : 'Compulsory'}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setEditingFeeHead(fh);
                            setFeeForm({
                              name: fh.name,
                              nameNepali: fh.nameNepali || '',
                              amount: fh.amount ? fh.amount.toString() : '',
                              isOptional: Boolean(fh.isOptional),
                            });
                            setIsAddFeeModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100"
                          title="Edit"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete fee head "${fh.name}"?`)) {
                              deleteFeeHeadMutation.mutate(fh.id);
                            }
                          }}
                          className="p-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100"
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── TAB 2: INCOME HEADS ────────────────────────────────────────────── */}
      {activeTab === 'income' && (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-2xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#1e3a5f] text-white font-bold">
              <tr>
                <th className="p-3.5">#</th>
                <th className="p-3.5">Income Head Title</th>
                <th className="p-3.5">Nepali Name</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isIncomeLoading ? (
                <tr><td colSpan={5} className="p-8 text-center text-gray-400">Loading income heads...</td></tr>
              ) : filteredIncomeHeads.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-gray-400">No income heads found.</td></tr>
              ) : (
                filteredIncomeHeads.map((ih: any, idx: number) => (
                  <tr key={ih.id} className="hover:bg-slate-50">
                    <td className="p-3.5 font-mono text-gray-400">{idx + 1}</td>
                    <td className="p-3.5 font-extrabold text-gray-900">{ih.name}</td>
                    <td className="p-3.5 font-nepali font-bold text-gray-700">{ih.nameNepali || '—'}</td>
                    <td className="p-3.5">
                      <span className="bg-blue-50 text-blue-800 px-2 py-0.5 rounded text-[10px] font-bold">
                        {ih.category?.name || 'General Income'}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setEditingIncomeHead(ih);
                            setIncomeHeadForm({
                              categoryId: ih.categoryId?.toString() || '',
                              name: ih.name,
                              nameNepali: ih.nameNepali || '',
                            });
                            setIsAddIncomeHeadOpen(true);
                          }}
                          className="p-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Deactivate income head "${ih.name}"?`)) {
                              deleteIncomeHeadMutation.mutate(ih.id);
                            }
                          }}
                          className="p-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── TAB 3: EXPENSE HEADS ───────────────────────────────────────────── */}
      {activeTab === 'expense' && (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-2xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#1e3a5f] text-white font-bold">
              <tr>
                <th className="p-3.5">#</th>
                <th className="p-3.5">Expense Head Title</th>
                <th className="p-3.5">Nepali Name</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isExpenseLoading ? (
                <tr><td colSpan={5} className="p-8 text-center text-gray-400">Loading expense heads...</td></tr>
              ) : filteredExpenseHeads.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-gray-400">No expense heads found.</td></tr>
              ) : (
                filteredExpenseHeads.map((eh: any, idx: number) => (
                  <tr key={eh.id} className="hover:bg-slate-50">
                    <td className="p-3.5 font-mono text-gray-400">{idx + 1}</td>
                    <td className="p-3.5 font-extrabold text-gray-900">{eh.name}</td>
                    <td className="p-3.5 font-nepali font-bold text-gray-700">{eh.nameNepali || '—'}</td>
                    <td className="p-3.5">
                      <span className="bg-rose-50 text-rose-800 px-2 py-0.5 rounded text-[10px] font-bold">
                        {eh.category?.name || 'Operating Expense'}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setEditingExpenseHead(eh);
                            setExpenseHeadForm({
                              categoryId: eh.categoryId?.toString() || '',
                              name: eh.name,
                              nameNepali: eh.nameNepali || '',
                            });
                            setIsAddExpenseHeadOpen(true);
                          }}
                          className="p-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Deactivate expense head "${eh.name}"?`)) {
                              deleteExpenseHeadMutation.mutate(eh.id);
                            }
                          }}
                          className="p-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── ADD/EDIT FEE HEAD MODAL ────────────────────────────────────────── */}
      {isAddFeeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
              <h3 className="font-extrabold text-sm text-[#1e3a5f]">
                {editingFeeHead ? 'Edit Student Fee Head (शुल्क शीर्षक सम्पादन)' : 'Add New Student Fee Head (नयाँ शुल्क शीर्षक)'}
              </h3>
              <button onClick={() => setIsAddFeeModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveFeeHeadMutation.mutate(feeForm);
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-bold text-gray-700 mb-1">Fee Title (English) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Belt / Tie Fee, Computer Lab Fee, Monthly Tuition"
                  value={feeForm.name}
                  onChange={(e) => setFeeForm({ ...feeForm, name: e.target.value })}
                  className="erp-input font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Fee Title (नेपाली)</label>
                <input
                  type="text"
                  placeholder="e.g. मासिक पढाइ शुल्क, कम्प्युटर ल्याब शुल्क"
                  value={feeForm.nameNepali}
                  onChange={(e) => setFeeForm({ ...feeForm, nameNepali: e.target.value })}
                  className="erp-input font-nepali font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Default Amount (दर रू - optional):</label>
                <input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={feeForm.amount}
                  onChange={(e) => setFeeForm({ ...feeForm, amount: e.target.value })}
                  className="erp-input font-mono font-bold"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={feeForm.isOptional}
                  onChange={(e) => setFeeForm({ ...feeForm, isOptional: e.target.checked })}
                  className="rounded text-[#1e3a5f]"
                />
                <span className="font-semibold text-gray-700">Optional Fee Head (ऐच्छिक शुल्क)</span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAddFeeModalOpen(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2 font-bold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveFeeHeadMutation.isPending}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-2 font-bold text-white shadow-xs"
                >
                  {saveFeeHeadMutation.isPending ? 'Saving...' : 'Save Fee Head (सुरक्षित गर्नुहोस्)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── ADD/EDIT INCOME HEAD MODAL ─────────────────────────────────────── */}
      {isAddIncomeHeadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
              <h3 className="font-extrabold text-sm text-[#1e3a5f]">
                {editingIncomeHead ? 'Edit Income Head' : 'Add New Income Head'}
              </h3>
              <button onClick={() => setIsAddIncomeHeadOpen(false)}><X size={18} /></button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveIncomeHeadMutation.mutate({
                  categoryId: parseInt(incomeHeadForm.categoryId),
                  name: incomeHeadForm.name,
                  nameNepali: incomeHeadForm.nameNepali,
                });
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-bold text-gray-700 mb-1">Income Category *</label>
                <select
                  value={incomeHeadForm.categoryId}
                  onChange={(e) => setIncomeHeadForm({ ...incomeHeadForm, categoryId: e.target.value })}
                  className="erp-input font-bold"
                  required
                >
                  {incomeCategories?.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Income Head Title (English) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pond Lease Income, Shutter Rent"
                  value={incomeHeadForm.name}
                  onChange={(e) => setIncomeHeadForm({ ...incomeHeadForm, name: e.target.value })}
                  className="erp-input font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Title (नेपाली)</label>
                <input
                  type="text"
                  placeholder="पोखरी ठेक्का आम्दानी"
                  value={incomeHeadForm.nameNepali}
                  onChange={(e) => setIncomeHeadForm({ ...incomeHeadForm, nameNepali: e.target.value })}
                  className="erp-input font-nepali"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button type="button" onClick={() => setIsAddIncomeHeadOpen(false)} className="px-4 py-2 border rounded-xl font-bold">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-[#1e3a5f] text-white font-bold rounded-xl shadow-xs">Save Income Head</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── ADD/EDIT EXPENSE HEAD MODAL ────────────────────────────────────── */}
      {isAddExpenseHeadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
              <h3 className="font-extrabold text-sm text-[#1e3a5f]">
                {editingExpenseHead ? 'Edit Expense Head' : 'Add New Expense Head'}
              </h3>
              <button onClick={() => setIsAddExpenseHeadOpen(false)}><X size={18} /></button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveExpenseHeadMutation.mutate({
                  categoryId: parseInt(expenseHeadForm.categoryId),
                  name: expenseHeadForm.name,
                  nameNepali: expenseHeadForm.nameNepali,
                });
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-bold text-gray-700 mb-1">Expense Category *</label>
                <select
                  value={expenseHeadForm.categoryId}
                  onChange={(e) => setExpenseHeadForm({ ...expenseHeadForm, categoryId: e.target.value })}
                  className="erp-input font-bold"
                  required
                >
                  {expenseCategories?.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Expense Head Title (English) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Internet Bill, Guest Refreshment, Printing"
                  value={expenseHeadForm.name}
                  onChange={(e) => setExpenseHeadForm({ ...expenseHeadForm, name: e.target.value })}
                  className="erp-input font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Title (नेपाली)</label>
                <input
                  type="text"
                  placeholder="इन्टरनेट खर्च / खाजा तथा अतिथि सत्कार"
                  value={expenseHeadForm.nameNepali}
                  onChange={(e) => setExpenseHeadForm({ ...expenseHeadForm, nameNepali: e.target.value })}
                  className="erp-input font-nepali"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button type="button" onClick={() => setIsAddExpenseHeadOpen(false)} className="px-4 py-2 border rounded-xl font-bold">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-rose-600 text-white font-bold rounded-xl shadow-xs">Save Expense Head</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── ADD/EDIT CATEGORY MODAL ─────────────────────────────────────────── */}
      {isAddCatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
              <h3 className="font-extrabold text-sm text-[#1e3a5f]">
                {editingCat ? 'Edit Category (वर्ग सम्पादन)' : 'Add New Category (नयाँ वर्ग/समूह)'}
              </h3>
              <button onClick={() => setIsAddCatModalOpen(false)}><X size={18} /></button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveCatMutation.mutate({
                  name: catForm.name,
                  nameNepali: catForm.nameNepali,
                  type: 'OWN_SOURCE',
                });
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-bold text-gray-700 mb-1">Module Type *</label>
                <select
                  value={catForm.module}
                  onChange={(e) => setCatForm({ ...catForm, module: e.target.value as any })}
                  className="erp-input font-bold"
                  disabled={!!editingCat}
                >
                  <option value="INCOME">Income Category (आम्दानी वर्ग)</option>
                  <option value="EXPENSE">Expense Category (खर्च वर्ग)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Category Title (English) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Teacher Salary & Allowances, Infrastructure"
                  value={catForm.name}
                  onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                  className="erp-input font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Title (नेपाली वर्ग/समूह)</label>
                <input
                  type="text"
                  placeholder="शिक्षक तलब तथा भत्ता, भौतिक संरचना"
                  value={catForm.nameNepali}
                  onChange={(e) => setCatForm({ ...catForm, nameNepali: e.target.value })}
                  className="erp-input font-nepali font-bold"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button type="button" onClick={() => setIsAddCatModalOpen(false)} className="px-4 py-2 border rounded-xl font-bold">Cancel</button>
                <button type="submit" disabled={saveCatMutation.isPending} className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-xs">
                  {saveCatMutation.isPending ? 'Saving...' : 'Save Category (वर्ग सेभ गर्नुहोस्)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
