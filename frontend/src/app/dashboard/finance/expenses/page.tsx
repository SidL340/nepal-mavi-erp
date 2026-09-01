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
  UserCheck,
  Search,
  Users,
  Eye,
  CheckCircle2,
  Calendar,
  Layers,
  Building2,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function ExpensesPage() {
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedHeadFilter, setSelectedHeadFilter] = useState('');
  const [selectedPartyFilter, setSelectedPartyFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddHeadModalOpen, setIsAddHeadModalOpen] = useState(false);
  const [isAddPartyModalOpen, setIsAddPartyModalOpen] = useState(false);
  const [inspectPartyId, setInspectPartyId] = useState<number | null>(null);

  // Form State
  const [newHeadCode, setNewHeadCode] = useState('');
  const [newHeadName, setNewHeadName] = useState('');
  const [newHeadNameNepali, setNewHeadNameNepali] = useState('');

  const [newPartyName, setNewPartyName] = useState('');
  const [newPartyNameNepali, setNewPartyNameNepali] = useState('');
  const [newPartyType, setNewPartyType] = useState('VENDOR');
  const [customPartyType, setCustomPartyType] = useState('');
  const [newPartyPan, setNewPartyPan] = useState('');
  const [newPartyPhone, setNewPartyPhone] = useState('');

  const [paymentMedium, setPaymentMedium] = useState('CASH');
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [selectedBankAcc, setSelectedBankAcc] = useState('');
  const [approvedByOption, setApprovedByOption] = useState('Principal (प्रधानाध्यापक)');
  const [customApprovedBy, setCustomApprovedBy] = useState('');

  // ── 1. QUERIES ──────────────────────────────────────────────────────────────
  const { data: yearsData } = useQuery({
    queryKey: ['academic-years'],
    queryFn: async () => {
      const res = await api.get('/classes/academic-years/all');
      return res.data?.data || [];
    },
  });
  const activeYear = yearsData?.find((y: any) => y.isActive) || yearsData?.[0];

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

  const { data: partiesData } = useQuery({
    queryKey: ['parties-list'],
    queryFn: async () => {
      const res = await api.get('/parties');
      return res.data?.data || [];
    },
  });

  const { data: bankAccountsData } = useQuery({
    queryKey: ['bank-accounts'],
    queryFn: async () => {
      const res = await api.get('/school/bank-accounts');
      return res.data?.data || [];
    },
  });

  const { data: entriesData, isLoading } = useQuery({
    queryKey: ['expense-entries', selectedCategory, selectedHeadFilter, selectedPartyFilter, searchQuery, activeYear?.id],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategory) params.append('categoryId', selectedCategory);
      if (selectedHeadFilter) params.append('headId', selectedHeadFilter);
      if (selectedPartyFilter) params.append('partyId', selectedPartyFilter);
      if (searchQuery) params.append('q', searchQuery);
      if (activeYear?.id) params.append('academicYearId', activeYear.id.toString());
      const res = await api.get(`/expense/entries?${params.toString()}`);
      return res.data;
    },
  });

  // Party Voucher Details Query
  const { data: partyVouchersData } = useQuery({
    queryKey: ['party-vouchers', inspectPartyId],
    queryFn: async () => {
      if (!inspectPartyId) return null;
      const res = await api.get(`/parties/${inspectPartyId}/vouchers`);
      return res.data?.data;
    },
    enabled: !!inspectPartyId,
  });

  // ── 2. MUTATIONS ────────────────────────────────────────────────────────────
  const createExpenseHeadMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/expense/heads', payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success('New Expense Topic created!');
      queryClient.invalidateQueries({ queryKey: ['expense-heads'] });
      setIsAddHeadModalOpen(false);
      setNewHeadCode('');
      setNewHeadName('');
      setNewHeadNameNepali('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to create expense topic.');
    },
  });

  const createPartyMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/parties', payload);
      return res.data;
    },
    onSuccess: (res: any) => {
      toast.success('New Party/Recipient saved!');
      queryClient.invalidateQueries({ queryKey: ['parties-list'] });
      if (res?.data?.id) setSelectedPartyId(res.data.id.toString());
      setIsAddPartyModalOpen(false);
      setNewPartyName('');
      setNewPartyNameNepali('');
      setNewPartyPan('');
      setNewPartyPhone('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to create party/recipient.');
    },
  });

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

    data.paymentMedium = paymentMedium;
    if (selectedPartyId) {
      data.partyId = parseInt(selectedPartyId);
      const partyObj = partiesData?.find((p: any) => p.id.toString() === selectedPartyId);
      if (partyObj) data.paidTo = partyObj.name;
    }

    if (selectedBankAcc) {
      const bankObj = bankAccountsData?.find((b: any) => b.id.toString() === selectedBankAcc);
      if (bankObj) {
        data.bankAccountId = bankObj.id;
        data.paidFromAccount = `${bankObj.bankName} (${bankObj.accountNo})`;
      }
    }

    const finalApprovedBy = approvedByOption === 'CUSTOM' ? customApprovedBy : approvedByOption;
    if (finalApprovedBy) data.approvedBy = finalApprovedBy;

    addExpenseMutation.mutate(data);
  };

  const entries = entriesData?.data || [];
  const totalAmount = entriesData?.totalAmount || 0;

  return (
    <div className="space-y-6 pb-16">
      {/* ─── 1. PAGE HEADER ───────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-[#1e3a5f]">
            Expense & Voucher Management (खर्च तथा भुक्तानी व्यवस्थापन)
          </h1>
          <p className="text-xs text-gray-500 font-nepali mt-0.5">
            नेपाल सरकार दोहोरो लेखा प्रणाली, खर्च शीर्षक कोड (Accounting Codes), बैंक/चेक भुक्तानी तथा पाउने व्यक्ति/संस्था (Parties) लेजर
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddPartyModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 shadow-2xs transition"
          >
            <Users size={14} className="text-[#1e3a5f]" />
            <span>+ Add Party (पाउने व्यक्ति/संस्था)</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 shadow-2xs transition"
          >
            <Plus size={14} />
            <span>Record Expense (खर्च प्रविष्टि)</span>
          </button>
        </div>
      </div>

      {/* ─── 2. SUMMARY METRIC CARDS ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-2xs">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Total Expenses (Year {activeYear?.year || '2081-82'})</span>
          <p className="text-2xl font-extrabold text-rose-700 mt-2">रू {totalAmount.toLocaleString()}</p>
          <p className="text-[11px] text-gray-400 mt-1">कुल निकासा भएको खर्च रकम</p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-2xs">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Staff Salary & Allowances</span>
          <p className="text-2xl font-extrabold text-[#1e3a5f] mt-2">
            रू {entries
              .filter((e: any) => e.head?.category?.name?.includes('Salary') || e.head?.name?.includes('Salary') || e.head?.code?.startsWith('5'))
              .reduce((s: number, e: any) => s + (e.amount || 0), 0)
              .toLocaleString()}
          </p>
          <p className="text-[11px] text-gray-400 mt-1">शिक्षक/कर्मचारी तलब तथा संचय कोष</p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-2xs">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Operational & Maintenance</span>
          <p className="text-2xl font-extrabold text-amber-600 mt-2">
            रू {entries
              .filter((e: any) => !e.head?.name?.includes('Salary'))
              .reduce((s: number, e: any) => s + (e.amount || 0), 0)
              .toLocaleString()}
          </p>
          <p className="text-[11px] text-gray-400 mt-1">स्टेशनरी, मर्मत, बिजुली, पानी तथा अन्य</p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-2xs">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Registered Parties / Vendors</span>
          <p className="text-2xl font-extrabold text-emerald-700 mt-2">{partiesData?.length || 0}</p>
          <p className="text-[11px] text-gray-400 mt-1">सूचीकृत पाउने व्यक्ति/संस्था</p>
        </div>
      </div>

      {/* ─── 3. FILTERS & SEARCH BAR ───────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto flex-1">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search by party, bill no, voucher, cheque no, description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-slate-50/50 pl-9 pr-3 py-2 text-xs focus:border-[#1e3a5f] focus:outline-hidden font-medium"
            />
          </div>

          {/* Expense Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setSelectedHeadFilter('');
            }}
            className="rounded-xl border border-gray-200 bg-slate-50/50 px-3 py-2 text-xs focus:border-[#1e3a5f] focus:outline-hidden font-medium"
          >
            <option value="">All Categories (सबै समूह)</option>
            {categoriesData?.map((cat: any) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>

          {/* Expense Head with Code Filter */}
          <select
            value={selectedHeadFilter}
            onChange={(e) => setSelectedHeadFilter(e.target.value)}
            className="rounded-xl border border-gray-200 bg-slate-50/50 px-3 py-2 text-xs focus:border-[#1e3a5f] focus:outline-hidden font-medium"
          >
            <option value="">All Expense Topics (सबै खर्च शीर्षक)</option>
            {headsData?.map((h: any) => (
              <option key={h.id} value={h.id}>
                {h.code ? `[Code: ${h.code}] ` : ''}{h.name}
              </option>
            ))}
          </select>

          {/* Party Filter */}
          <select
            value={selectedPartyFilter}
            onChange={(e) => setSelectedPartyFilter(e.target.value)}
            className="rounded-xl border border-gray-200 bg-slate-50/50 px-3 py-2 text-xs focus:border-[#1e3a5f] focus:outline-hidden font-medium"
          >
            <option value="">All Parties/Vendors (सबै पाउने पक्ष)</option>
            {partiesData?.map((p: any) => (
              <option key={p.id} value={p.id}>
                {p.name} {p.panNo ? `(PAN: ${p.panNo})` : ''}
              </option>
            ))}
          </select>
        </div>

        <span className="text-xs font-bold text-gray-500 font-mono">
          Showing <b>{entries.length}</b> expense vouchers
        </span>
      </div>

      {/* ─── 4. EXPENSE ENTRIES TABLE ─────────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-[#1e3a5f] text-white uppercase text-[10.5px] tracking-wider font-extrabold">
              <tr>
                <th className="py-3 px-4">Date (BS)</th>
                <th className="py-3 px-4">Voucher / Bill No</th>
                <th className="py-3 px-4">Expense Topic (शीर्षक & Code)</th>
                <th className="py-3 px-4">Paid To / Recipient (पाउने व्यक्ति/संस्था)</th>
                <th className="py-3 px-4">Payment Method & Account</th>
                <th className="py-3 px-4 text-right">Amount (रकम)</th>
                <th className="py-3 px-4">Approved By</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700 font-medium">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#1e3a5f] border-t-transparent mx-auto mb-2" />
                    Loading expense records...
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400 font-nepali">
                    कुनै खर्च प्रविष्टि भेटिएन। ("Record Expense" बटन थिचेर नयाँ खर्च थप्नुहोस्।)
                  </td>
                </tr>
              ) : (
                entries.map((entry: any) => (
                  <tr key={entry.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono font-bold text-gray-900 whitespace-nowrap">
                      {entry.expenseDateBs}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-[#1e3a5f] block">
                        {entry.voucherNo || `VOUCH-${entry.id}`}
                      </span>
                      {entry.billNo && (
                        <span className="text-[10px] text-gray-400 font-mono">Bill: {entry.billNo}</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        {entry.head?.code && (
                          <span className="rounded-md bg-slate-100 text-[#1e3a5f] px-1.5 py-0.5 text-[10px] font-black font-mono border border-slate-200">
                            {entry.head.code}
                          </span>
                        )}
                        <span className="font-bold text-gray-900">{entry.head?.name}</span>
                      </div>
                      <span className="text-[10px] text-gray-500 font-nepali block mt-0.5">
                        {entry.head?.category?.name || 'General Expense'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {entry.party ? (
                        <button
                          onClick={() => setInspectPartyId(entry.party.id)}
                          className="font-bold text-rose-700 hover:underline inline-flex items-center gap-1"
                        >
                          <Building size={12} />
                          <span>{entry.party.name}</span>
                        </button>
                      ) : (
                        <span className="font-bold text-gray-800">{entry.paidTo || '—'}</span>
                      )}
                      {entry.description && (
                        <span className="text-[10px] text-gray-500 block truncate max-w-xs">{entry.description}</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                          entry.paymentMedium === 'CHEQUE' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                          entry.paymentMedium === 'BANK_TRANSFER' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                          'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}>
                          {entry.paymentMedium || 'CASH'}
                        </span>
                        {entry.chequeNo && (
                          <span className="font-mono text-[10px] font-bold text-purple-900">
                            Chk: {entry.chequeNo}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-500 block truncate max-w-xs mt-0.5">
                        {entry.paidFromAccount || 'School Operational Account'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-black text-rose-700 text-sm whitespace-nowrap">
                      रू {(entry.amount || 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-semibold text-gray-600">
                      {entry.approvedBy || 'Principal'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {entry.partyId && (
                        <button
                          onClick={() => setInspectPartyId(entry.partyId)}
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1 text-[11px] font-bold text-[#1e3a5f] hover:bg-slate-50 shadow-2xs"
                          title="View Party History Vouchers"
                        >
                          <Eye size={12} />
                          <span>Ledger</span>
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

      {/* ─── 5. RECORD EXPENSE MODAL ──────────────────────────────────────────── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h2 className="text-base font-extrabold text-[#1e3a5f] flex items-center gap-2">
                  <TrendingDown size={18} className="text-rose-600" />
                  <span>Record School Expense (खर्च प्रविष्टि)</span>
                </h2>
                <p className="text-[11px] text-gray-500 font-nepali mt-0.5">
                  नेपाल सरकार ढाँचा बमोजिम खर्च शीर्षक कोड, पाउने व्यक्ति/संस्था, बैंक/चेक र स्वीकृत अधिकारी प्रविष्टि
                </p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
              {/* Row 1: Searchable Expense Topic & Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-extrabold text-gray-800">
                      Expense Topic / Head (शीर्षक & Code) *
                    </label>
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
                    <option value="">-- Select Expense Topic (शीर्षक छनौट) --</option>
                    {headsData?.map((h: any) => (
                      <option key={h.id} value={h.id}>
                        {h.code ? `[${h.code}] ` : ''}{h.name} {h.nameNepali ? `(${h.nameNepali})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-extrabold text-gray-800 mb-1">
                    Amount in रू (खर्च रकम) *
                  </label>
                  <input
                    required
                    name="amount"
                    type="number"
                    step="any"
                    placeholder="e.g. 15000"
                    className="erp-input font-bold text-rose-700 font-mono text-sm"
                  />
                </div>
              </div>

              {/* Row 2: Expense Date & Recipient / Party */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-extrabold text-gray-800 mb-1">
                    Expense Date in BS (YYYY-MM-DD) *
                  </label>
                  <input
                    required
                    name="expenseDateBs"
                    type="text"
                    defaultValue={todayBS()}
                    className="erp-input font-mono font-bold"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-extrabold text-gray-800">
                      Paid To / Recipient (पाउने व्यक्ति/संस्था)
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsAddPartyModalOpen(true)}
                      className="text-[10px] font-extrabold text-rose-600 hover:underline flex items-center gap-0.5"
                    >
                      <Plus size={11} />
                      <span>+ Add Party (नयाँ पाउने पक्ष)</span>
                    </button>
                  </div>
                  <select
                    value={selectedPartyId}
                    onChange={(e) => setSelectedPartyId(e.target.value)}
                    className="erp-input font-bold mb-1"
                  >
                    <option value="">-- Select Saved Party / Vendor --</option>
                    {partiesData?.map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.panNo ? `(PAN: ${p.panNo})` : ''}
                      </option>
                    ))}
                  </select>
                  {!selectedPartyId && (
                    <input
                      name="paidTo"
                      type="text"
                      placeholder="Or type Recipient / Vendor name manually..."
                      className="erp-input font-medium"
                    />
                  )}
                </div>
              </div>

              {/* Row 3: Payment Method & Paid From Account */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-extrabold text-gray-800 mb-1">
                    Payment Method (भुक्तानी विधि)
                  </label>
                  <select
                    value={paymentMedium}
                    onChange={(e) => setPaymentMedium(e.target.value)}
                    className="erp-input font-bold"
                  >
                    <option value="CASH">CASH (नगद भुक्तानी)</option>
                    <option value="BANK_TRANSFER">BANK TRANSFER (बैंक ट्रान्सफर)</option>
                    <option value="CHEQUE">CHEQUE (चेक मार्फत)</option>
                    <option value="QR_CODE">QR CODE (क्युआर कोड)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-extrabold text-gray-800 mb-1">
                    Paid From Account (कुन खाताबाट)
                  </label>
                  <select
                    value={selectedBankAcc}
                    onChange={(e) => setSelectedBankAcc(e.target.value)}
                    className="erp-input font-bold mb-1"
                  >
                    <option value="">-- Select School Bank Account --</option>
                    {bankAccountsData?.map((b: any) => (
                      <option key={b.id} value={b.id}>
                        {b.bankName} - {b.accountName} ({b.accountNo})
                      </option>
                    ))}
                  </select>
                  {!selectedBankAcc && (
                    <input
                      name="paidFromAccount"
                      type="text"
                      defaultValue="School Operational Account"
                      className="erp-input"
                    />
                  )}
                </div>
              </div>

              {/* Conditional Cheque Details */}
              {(paymentMedium === 'CHEQUE' || paymentMedium === 'BANK_TRANSFER') && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-purple-50/70 p-3.5 rounded-xl border border-purple-200">
                  <div>
                    <label className="block font-extrabold text-purple-950 mb-1">
                      Cheque / Trans Ref No. (चेक नम्बर) *
                    </label>
                    <input
                      name="chequeNo"
                      type="text"
                      placeholder="e.g. CHQ-98765432"
                      className="erp-input font-mono font-bold border-purple-300"
                    />
                  </div>
                  <div>
                    <label className="block font-extrabold text-purple-950 mb-1">
                      Cheque Date in BS (चेक मिति)
                    </label>
                    <input
                      name="chequeDateBs"
                      type="text"
                      defaultValue={todayBS()}
                      className="erp-input font-mono font-bold border-purple-300"
                    />
                  </div>
                </div>
              )}

              {/* Row 4: Bill No & Approved By */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-extrabold text-gray-800 mb-1">
                    Bill / Voucher Number (बिल/भौचर नं)
                  </label>
                  <input
                    name="billNo"
                    type="text"
                    placeholder="BILL-2083-042"
                    className="erp-input font-mono"
                  />
                </div>

                <div>
                  <label className="block font-extrabold text-gray-800 mb-1">
                    Approved By (स्वीकृत गर्ने अधिकारी)
                  </label>
                  <select
                    value={approvedByOption}
                    onChange={(e) => setApprovedByOption(e.target.value)}
                    className="erp-input font-bold mb-1"
                  >
                    <option value="Principal (प्रधानाध्यापक)">Principal (प्रधानाध्यापक)</option>
                    <option value="SMC Chairperson (विद्यालय व्यवस्थापन समिति अध्यक्ष)">SMC Chairperson (वि.व्य.स. अध्यक्ष)</option>
                    <option value="Accountant (लेखापाल)">Accountant (लेखापाल)</option>
                    <option value="Vice Principal (सहायक प्र.अ.)">Vice Principal (सहायक प्र.अ.)</option>
                    <option value="CUSTOM">Other Authority (अन्य लेख्नुहोस्)...</option>
                  </select>
                  {approvedByOption === 'CUSTOM' && (
                    <input
                      type="text"
                      placeholder="Type Authority Name..."
                      value={customApprovedBy}
                      onChange={(e) => setCustomApprovedBy(e.target.value)}
                      className="erp-input"
                    />
                  )}
                </div>
              </div>

              {/* Particulars & Remarks */}
              <div>
                <label className="block font-extrabold text-gray-800 mb-1">
                  Description / Particulars (खर्चको विवरण)
                </label>
                <input
                  name="description"
                  type="text"
                  placeholder="Details of purchased stationery, repair work, event expenses..."
                  className="erp-input"
                />
              </div>

              <div>
                <label className="block font-extrabold text-gray-800 mb-1">Remarks (कैफियत)</label>
                <textarea name="remarks" rows={2} placeholder="Any extra remarks..." className="erp-input" />
              </div>

              {/* Submit Buttons */}
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
                  className="rounded-xl bg-rose-600 px-6 py-2 font-bold text-white hover:bg-rose-700 disabled:opacity-60 shadow-xs"
                >
                  {addExpenseMutation.isPending ? 'Saving...' : 'Save Expense (खर्च सेभ गर्नुहोस्)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── 6. ADD NEW EXPENSE TOPIC WITH CODE MODAL ───────────────────────── */}
      {isAddHeadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="font-extrabold text-sm text-[#1e3a5f] flex items-center gap-1.5">
                <Layers size={16} />
                <span>Add Expense Topic with Code (नयाँ खर्च शीर्षक)</span>
              </h3>
              <button onClick={() => setIsAddHeadModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createExpenseHeadMutation.mutate({
                  categoryId: categoriesData?.[0]?.id || 1,
                  code: newHeadCode.trim() || undefined,
                  name: newHeadName,
                  nameNepali: newHeadNameNepali,
                });
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-bold text-gray-700 mb-1">Accounting Code (खर्च कोड न.)</label>
                <input
                  type="text"
                  placeholder="e.g. 20101, 20201, 30101"
                  value={newHeadCode}
                  onChange={(e) => setNewHeadCode(e.target.value)}
                  className="erp-input font-mono font-bold"
                />
              </div>

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

      {/* ─── 7. ADD NEW PARTY / RECIPIENT MODAL ──────────────────────────────── */}
      {isAddPartyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="font-extrabold text-sm text-[#1e3a5f] flex items-center gap-1.5">
                <Users size={16} />
                <span>Add Recipient / Party (पाउने व्यक्ति/संस्था)</span>
              </h3>
              <button onClick={() => setIsAddPartyModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const finalPartyType = newPartyType === 'CUSTOM' ? customPartyType : newPartyType;
                createPartyMutation.mutate({
                  name: newPartyName,
                  nameNepali: newPartyNameNepali,
                  partyType: finalPartyType || 'VENDOR',
                  panNo: newPartyPan,
                  phone: newPartyPhone,
                });
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-bold text-gray-700 mb-1">Party / Vendor Name (English) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Quality Stationers / Electrician Ram Kumar / Groceries Shop"
                  value={newPartyName}
                  onChange={(e) => setNewPartyName(e.target.value)}
                  className="erp-input font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Nepali Name (नेपाली नाम)</label>
                <input
                  type="text"
                  placeholder="क्वालिटी स्टेसनरी / राम इलेक्ट्रिसियन"
                  value={newPartyNameNepali}
                  onChange={(e) => setNewPartyNameNepali(e.target.value)}
                  className="erp-input font-nepali font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Party Type (प्रकार)</label>
                  <select
                    value={newPartyType}
                    onChange={(e) => setNewPartyType(e.target.value)}
                    className="erp-input font-bold"
                  >
                    <option value="VENDOR">VENDOR (विक्रेता / पसल)</option>
                    <option value="SUPPLIER">SUPPLIER (सामग्री सप्लायर)</option>
                    <option value="WORKER">WORKER (श्रमिक / कामदार / इलेक्ट्रिसियन / प्लम्बर)</option>
                    <option value="SHOPKEEPER">SHOPKEEPER (पसले / खाद्यान्न / किराना / स्टेसनरी)</option>
                    <option value="SERVICE_PROVIDER">SERVICE PROVIDER (सेवा प्रदायक - बिजुली / इन्टरनेट)</option>
                    <option value="CONTRACTOR">CONTRACTOR (ठेकेदार / निर्माण कार्य)</option>
                    <option value="DONOR">DONOR (चन्दादाता / दानवीर)</option>
                    <option value="GOVT">GOVT (सरकारी निकाय / पालिका)</option>
                    <option value="STAFF">STAFF / TEACHER (शिक्षक तथा कर्मचारी)</option>
                    <option value="CUSTOM">OTHER (अन्य नयाँ प्रकार लेख्नुहोस्)...</option>
                  </select>
                  {newPartyType === 'CUSTOM' && (
                    <input
                      type="text"
                      required
                      placeholder="Type custom party type (e.g. Electrician, Groceries...)"
                      value={customPartyType}
                      onChange={(e) => setCustomPartyType(e.target.value)}
                      className="erp-input mt-1 font-bold border-rose-400"
                    />
                  )}
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">PAN / VAT No.</label>
                  <input
                    type="text"
                    placeholder="601234567"
                    value={newPartyPan}
                    onChange={(e) => setNewPartyPan(e.target.value)}
                    className="erp-input font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Contact Phone</label>
                <input
                  type="text"
                  placeholder="98XXXXXXXX"
                  value={newPartyPhone}
                  onChange={(e) => setNewPartyPhone(e.target.value)}
                  className="erp-input font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button type="button" onClick={() => setIsAddPartyModalOpen(false)} className="px-4 py-2 border rounded-xl font-bold">Cancel</button>
                <button type="submit" disabled={createPartyMutation.isPending} className="px-5 py-2 bg-rose-600 text-white font-bold rounded-xl shadow-xs">
                  {createPartyMutation.isPending ? 'Saving...' : 'Save Party (सेभ गर्नुहोस्)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── 8. PARTY-WISE VOUCHERS INSPECTOR MODAL ──────────────────────────── */}
      {inspectPartyId && partyVouchersData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-[#1e3a5f] flex items-center gap-2">
                  <Building size={18} className="text-rose-600" />
                  <span>Party Ledger: {partyVouchersData.party?.name}</span>
                </h3>
                <p className="text-[11px] text-gray-500 font-nepali mt-0.5">
                  PAN: {partyVouchersData.party?.panNo || 'N/A'} • Phone: {partyVouchersData.party?.phone || 'N/A'} • Type: {partyVouchersData.party?.partyType}
                </p>
              </div>
              <button onClick={() => setInspectPartyId(null)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div>
                <span className="text-[10px] font-bold text-gray-500 uppercase">Total Vouchers Paid</span>
                <p className="text-base font-extrabold text-[#1e3a5f]">{partyVouchersData.totalVoucherCount}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-500 uppercase">Total Expense Amount</span>
                <p className="text-base font-extrabold text-rose-700 font-mono">रू {(partyVouchersData.totalExpenseSum || 0).toLocaleString()}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-500 uppercase">Total Received Amount</span>
                <p className="text-base font-extrabold text-emerald-700 font-mono">रू {(partyVouchersData.totalIncomeSum || 0).toLocaleString()}</p>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-extrabold text-[#1e3a5f] uppercase tracking-wider text-[11px]">Expense Vouchers Issued to this Party</h4>
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-left font-sans">
                  <thead className="bg-[#1e3a5f] text-white text-[10px] uppercase font-bold">
                    <tr>
                      <th className="py-2.5 px-3">Date (BS)</th>
                      <th className="py-2.5 px-3">Voucher No</th>
                      <th className="py-2.5 px-3">Expense Head</th>
                      <th className="py-2.5 px-3">Method & Cheque</th>
                      <th className="py-2.5 px-3 text-right">Amount (रू)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-700">
                    {partyVouchersData.expenses?.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-gray-400">No expense vouchers recorded for this party yet.</td>
                      </tr>
                    ) : (
                      partyVouchersData.expenses?.map((e: any) => (
                        <tr key={e.id} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-mono font-bold">{e.expenseDateBs}</td>
                          <td className="py-2 px-3 font-mono font-bold text-[#1e3a5f]">{e.voucherNo || `VOUCH-${e.id}`}</td>
                          <td className="py-2 px-3 font-bold">{e.head?.name}</td>
                          <td className="py-2 px-3 font-mono">
                            {e.paymentMedium} {e.chequeNo ? `(Chk: ${e.chequeNo})` : ''}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-black text-rose-700">
                            रू ${(e.amount || 0).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-100">
              <button
                onClick={() => setInspectPartyId(null)}
                className="rounded-xl border border-gray-200 px-5 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
